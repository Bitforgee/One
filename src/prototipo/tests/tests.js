/* ==========================================================================
   One — tests.js
   Testes da Fase 1: utilitários de storage, helpers de DOM e configuração de
   navegação. Focado na lógica, não na aparência (a aparência é verificada
   visualmente no navegador).
   ========================================================================== */

import { describe, it, expect, run } from "./test-harness.js";
import { read, write, remove, clearAll, isAvailable } from "../js/storage.js";
import { el, escapeHtml, clear } from "../js/dom.js";
import { NAV_BY_ROLE, ROLES, HOME_ROUTE_BY_ROLE } from "../js/nav-config.js";
import { login, logout, isAuthenticated, getRole, getSession, DEMO_USERS } from "../js/state.js";
import * as router from "../js/router.js";
import { getPublishedArticles, searchPublished, matchArticle, normalize } from "../js/services/knowledge-service.js";
import * as conv from "../js/services/conversation-service.js";
import * as ticketSvc from "../js/services/ticket-service.js";
import { resolverSetor } from "../js/services/routing-service.js";
import * as kbSvc from "../js/services/knowledge-service.js";
// Importa o teste de integração para registrar seus describe/it.
import "./integration.js";

describe("storage", () => {
  it("grava e lê um valor JSON", () => {
    write("t_num", 42);
    expect(read("t_num")).toBe(42);
  });

  it("grava e lê objetos", () => {
    write("t_obj", { a: 1, b: [2, 3] });
    expect(read("t_obj")).toEqual({ a: 1, b: [2, 3] });
  });

  it("retorna o fallback quando a chave não existe", () => {
    remove("t_inexistente");
    expect(read("t_inexistente", "padrao")).toBe("padrao");
  });

  it("remove uma chave", () => {
    write("t_rm", "x");
    remove("t_rm");
    expect(read("t_rm", null)).toBe(null);
  });

  it("clearAll limpa apenas o namespace do protótipo", () => {
    localStorage.setItem("fora.do.namespace", "intacto");
    write("t_dentro", "sera-removido");
    clearAll();
    expect(read("t_dentro", null)).toBe(null);
    expect(localStorage.getItem("fora.do.namespace")).toBe("intacto");
    localStorage.removeItem("fora.do.namespace");
  });

  it("reporta disponibilidade do localStorage", () => {
    expect(isAvailable()).toBeTruthy();
  });
});

describe("dom", () => {
  it("cria elemento com classe e texto", () => {
    const node = el("div", { class: "x", text: "oi" });
    expect(node.className).toBe("x");
    expect(node.textContent).toBe("oi");
  });

  it("define dataset e atributos", () => {
    const node = el("button", { dataset: { navId: "a1" }, type: "button" });
    expect(node.dataset.navId).toBe("a1");
    expect(node.getAttribute("type")).toBe("button");
  });

  it("anexa filhos (nós e texto)", () => {
    const node = el("ul", {}, [el("li", { text: "um" }), "dois"]);
    expect(node.children.length).toBe(1);
    expect(node.textContent).toContain("dois");
  });

  it("escapeHtml neutraliza marcação", () => {
    const out = escapeHtml('<img src=x onerror="alert(1)">');
    expect(out).toContain("&lt;img");
    expect(out).toBeTruthy();
  });

  it("clear remove todos os filhos", () => {
    const node = el("div", {}, [el("span"), el("span")]);
    clear(node);
    expect(node.children.length).toBe(0);
  });
});

describe("nav-config", () => {
  it("define os três perfis", () => {
    expect(Object.keys(ROLES).length).toBe(3);
    expect(ROLES.aluno.label).toBe("Aluno");
  });

  it("cada perfil tem ao menos um grupo de navegação", () => {
    ["aluno", "atendente", "admin"].forEach((r) => {
      expect(NAV_BY_ROLE[r].length).toBeTruthy();
    });
  });

  it("todo item de navegação tem id, label, ícone e rota", () => {
    let total = 0;
    Object.values(NAV_BY_ROLE).forEach((groups) => {
      groups.forEach((g) => {
        g.items.forEach((item) => {
          total += 1;
          expect(item.id).toBeTruthy();
          expect(item.label).toBeTruthy();
          expect(item.icon).toContain("bi-");
          expect(item.route).toContain("#/");
        });
      });
    });
    expect(total > 0).toBeTruthy();
  });

  it("define a rota inicial de cada perfil", () => {
    expect(HOME_ROUTE_BY_ROLE.aluno).toBe("#/aluno");
    expect(HOME_ROUTE_BY_ROLE.atendente).toBe("#/atendente");
    expect(HOME_ROUTE_BY_ROLE.admin).toBe("#/admin");
  });
});

describe("state (sessão demonstrativa)", () => {
  it("começa sem autenticação após logout", () => {
    logout();
    expect(isAuthenticated()).toBeFalsy();
    expect(getRole()).toBe(null);
  });

  it("login cria sessão com o perfil escolhido", () => {
    const s = login("atendente");
    expect(s.role).toBe("atendente");
    expect(isAuthenticated()).toBeTruthy();
    expect(getRole()).toBe("atendente");
    expect(getSession().name).toBe(DEMO_USERS.atendente.name);
  });

  it("login com perfil inválido não autentica", () => {
    logout();
    const s = login("inexistente");
    expect(s).toBe(null);
    expect(isAuthenticated()).toBeFalsy();
  });

  it("logout limpa a sessão", () => {
    login("admin");
    logout();
    expect(isAuthenticated()).toBeFalsy();
  });
});

describe("router (guarda de acesso)", () => {
  // Testa a lógica da guarda isoladamente, espelhando accessGuard do app.
  function guard(route) {
    const roles = route.roles;
    if (!roles || roles.length === 0) return true;
    if (!isAuthenticated()) return "redirect:#/login";
    if (!roles.includes(getRole())) return "forbidden";
    return true;
  }

  it("rota pública é sempre permitida", () => {
    logout();
    expect(guard({ roles: [] })).toBe(true);
  });

  it("rota protegida sem sessão redireciona ao login", () => {
    logout();
    expect(guard({ roles: ["aluno"] })).toBe("redirect:#/login");
  });

  it("perfil não autorizado recebe forbidden", () => {
    login("aluno");
    expect(guard({ roles: ["admin"] })).toBe("forbidden");
    logout();
  });

  it("perfil autorizado é permitido", () => {
    login("admin");
    expect(guard({ roles: ["admin"] })).toBe(true);
    logout();
  });

  it("resolve rota registrada e extrai parâmetro", async () => {
    let captured = null;
    router.register("#/teste/:id", {
      roles: [],
      render: ({ params }) => { captured = params.id; },
    });
    router.setGuard(() => true);
    router.start(); // liga o listener de hashchange e processa a rota atual
    router.navigate("#/teste/ONE-42");
    // hashchange é assíncrono; aguarda um tick.
    await new Promise((r) => setTimeout(r, 30));
    expect(captured).toBe("ONE-42");
    window.location.hash = "#/";
  });
});

describe("knowledge-service (base de conhecimento)", () => {
  it("normalize remove acentos e pontuação", () => {
    expect(normalize("Matrícula, Notas!")).toBe("matricula notas");
  });

  it("getPublishedArticles retorna somente PUBLISHED (BR-C2)", async () => {
    const pub = await getPublishedArticles();
    expect(pub.length > 0).toBeTruthy();
    expect(pub.every((a) => a.status === "PUBLISHED")).toBeTruthy();
  });

  it("searchPublished não retorna DRAFT nem ARCHIVED", async () => {
    const todos = await searchPublished({ query: "" });
    expect(todos.some((a) => a.status !== "PUBLISHED")).toBeFalsy();
  });

  it("searchPublished filtra por palavra-chave", async () => {
    const r = await searchPublished({ query: "boleto" });
    expect(r.length > 0).toBeTruthy();
    expect(r.every((a) => (a.titulo + a.conteudo + a.perguntasRelacionadas.join(" ")).toLowerCase().includes("boleto"))).toBeTruthy();
  });

  it("searchPublished filtra por categoria", async () => {
    const r = await searchPublished({ categoria: "Acadêmico › Documentos" });
    expect(r.every((a) => a.categoria === "Acadêmico › Documentos")).toBeTruthy();
  });

  it("matchArticle encontra artigo publicado para pergunta conhecida (BR-B2)", async () => {
    const m = await matchArticle("Como emitir meu boleto?");
    expect(m).toBeTruthy();
    expect(m.artigo.id).toBe("KB-001");
    expect(m.artigo.status).toBe("PUBLISHED");
  });

  it("matchArticle não corresponde a assunto sem artigo publicado (BR-B4)", async () => {
    // "notas" só tem artigo em DRAFT (KB-005), que não pode responder.
    const m = await matchArticle("quando sai minha nota de arquitetura");
    expect(m).toBe(null);
  });

  it("matchArticle retorna null para pergunta vazia", async () => {
    expect(await matchArticle("")).toBe(null);
  });

  it("matchArticle nunca aponta para artigo não publicado", async () => {
    const perguntas = ["boleto presencial no guichê", "política antiga de boleto"];
    for (const p of perguntas) {
      const m = await matchArticle(p);
      if (m) expect(m.artigo.status).toBe("PUBLISHED");
    }
  });
});

describe("conversation-service (fluxo do assistente)", () => {
  it("novaConversa cria conversa vazia para o aluno (BR-B1)", () => {
    const c = conv.novaConversa({ name: "Teste", course: "ADS" });
    expect(c.aluno).toBe("Teste");
    expect(c.mensagens.length).toBe(0);
    expect(c.desfecho).toBe(null);
  });

  it("registrarResposta guarda snapshot do artigo (BR-B8)", () => {
    const c = conv.novaConversa({ name: "Teste" });
    conv.registrarResposta(c, { id: "KB-001", versao: 2, titulo: "T", categoria: "C", conteudo: "texto-v2" });
    expect(c.ultimoArtigo.id).toBe("KB-001");
    expect(c.ultimoArtigo.versao).toBe(2);
    expect(c.ultimoArtigo.texto).toBe("texto-v2");
    // Editar o artigo original depois NÃO muda o snapshot.
    expect(c.mensagens[0].artigo.texto).toBe("texto-v2");
  });

  it("definirDesfecho encerra com SELF_RESOLVED (BR-B5)", () => {
    const c = conv.novaConversa({ name: "Teste" });
    conv.definirDesfecho(c, conv.DESFECHOS.SELF_RESOLVED);
    expect(c.desfecho).toBe("SELF_RESOLVED");
    expect(c.encerradaEm).toBeTruthy();
  });

  it("desfechos cobrem os quatro casos (BR-B7)", () => {
    expect(conv.DESFECHOS.SELF_RESOLVED).toBe("SELF_RESOLVED");
    expect(conv.DESFECHOS.ESCALATED).toBe("ESCALATED");
    expect(conv.DESFECHOS.DECLINED).toBe("DECLINED");
    expect(conv.DESFECHOS.ABANDONED).toBe("ABANDONED");
  });
});

describe("routing-service (BR-E)", () => {
  it("categoria com setor fixo roteia ao setor", async () => {
    const s = await resolverSetor({ categoria: "Financeiro › Boleto", curso: "Análise e Desenvolvimento de Sistemas" });
    expect(s).toBe("Financeiro");
  });
  it("categoria de notas roteia à coordenação do curso (BR-E2b)", async () => {
    const s = await resolverSetor({ categoria: "Acadêmico › Notas", curso: "Análise e Desenvolvimento de Sistemas" });
    expect(s).toBe("Coordenação ADS");
  });
  it("categoria sem regra vai à triagem (BR-E3)", async () => {
    const s = await resolverSetor({ categoria: "Não classificado", curso: "Análise e Desenvolvimento de Sistemas" });
    expect(s).toBe("Secretaria Acadêmica");
  });
  it("curso sem coordenação configurada vai à triagem (BR-E3)", async () => {
    const s = await resolverSetor({ categoria: "Acadêmico › Notas", curso: "Curso Inexistente" });
    expect(s).toBe("Secretaria Acadêmica");
  });
});

describe("ticket-service (BR-D/E/F/G/H)", () => {
  it("cria chamado a partir de conversa com protocolo ONE-<n> (BR-D5)", async () => {
    ticketSvc.resetar();
    const t = await ticketSvc.criarDeConversa({
      aluno: { name: "Aluno Teste", course: "Análise e Desenvolvimento de Sistemas" },
      perguntaInicial: "Preciso emitir meu boleto",
      artigoSnapshot: { categoria: "Financeiro › Boleto", id: "KB-001", versao: 2, titulo: "T", texto: "x" },
    });
    expect(t.protocolo).toContain("ONE-");
    expect(t.situacao).toBe("OPEN");
    expect(t.responsavel).toBe(null);     // F1: sem responsável
    expect(t.setor).toBe("Financeiro");   // BR-E
    expect(t.categoria).toBe("Financeiro › Boleto"); // BR-D4
  });

  it("protocolos são sequenciais e únicos (BR-D5)", async () => {
    const a = await ticketSvc.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p1" });
    const b = await ticketSvc.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p2" });
    const na = parseInt(a.protocolo.replace("ONE-", ""), 10);
    const nb = parseInt(b.protocolo.replace("ONE-", ""), 10);
    expect(nb).toBe(na + 1);
  });

  it("transição inválida é rejeitada (BR-F1)", () => {
    expect(ticketSvc.transicaoPermitida("OPEN", "RESOLVED")).toBeFalsy();
    expect(ticketSvc.transicaoPermitida("CLOSED", "OPEN")).toBeFalsy();
    expect(ticketSvc.transicaoPermitida("OPEN", "IN_PROGRESS")).toBeTruthy();
    expect(ticketSvc.transicaoPermitida("IN_PROGRESS", "RESOLVED")).toBeTruthy();
  });

  it("responder assume o chamado e move OPEN→IN_PROGRESS (F2)", async () => {
    const t = await ticketSvc.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p" });
    const r = await ticketSvc.responder(t.protocolo, "Carlos Lima", "Olá, vamos ajudar.");
    expect(r.situacao).toBe("IN_PROGRESS");
    expect(r.responsavel).toBe("Carlos Lima");
  });

  it("resolver exige texto e leva a RESOLVED (F5)", async () => {
    const t = await ticketSvc.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p" });
    await ticketSvc.assumir(t.protocolo, "Carlos Lima");
    let erro = false;
    try { await ticketSvc.resolver(t.protocolo, "Carlos Lima", ""); } catch { erro = true; }
    expect(erro).toBeTruthy();
    const r = await ticketSvc.resolver(t.protocolo, "Carlos Lima", "Resolvido assim.");
    expect(r.situacao).toBe("RESOLVED");
  });

  it("encaminhar exige setor diferente e motivo (BR-G4)", async () => {
    const t = await ticketSvc.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p", artigoSnapshot: { categoria: "Financeiro › Boleto" } });
    let semMotivo = false, mesmoSetor = false;
    try { await ticketSvc.encaminhar(t.protocolo, "Beatriz Rocha", "Secretaria Acadêmica", ""); } catch { semMotivo = true; }
    try { await ticketSvc.encaminhar(t.protocolo, "Beatriz Rocha", "Financeiro", "motivo"); } catch { mesmoSetor = true; }
    expect(semMotivo).toBeTruthy();
    expect(mesmoSetor).toBeTruthy();
    const r = await ticketSvc.encaminhar(t.protocolo, "Beatriz Rocha", "Secretaria Acadêmica", "Assunto é da secretaria");
    expect(r.setor).toBe("Secretaria Acadêmica");
    expect(r.situacao).toBe("OPEN");       // F9: volta a OPEN
    expect(r.responsavel).toBe(null);      // assignee limpo
    expect(r.encaminhamentos).toBe(1);
  });

  it("nota interna não é visível ao aluno (BR-G2)", async () => {
    const t = await ticketSvc.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p" });
    await ticketSvc.adicionarNota(t.protocolo, "Carlos Lima", "Observação interna");
    const atualizado = await ticketSvc.obter(t.protocolo);
    const visiveisAluno = ticketSvc.mensagensVisiveis(atualizado, "aluno");
    const visiveisAtendente = ticketSvc.mensagensVisiveis(atualizado, "atendente");
    expect(visiveisAluno.some((m) => m.tipo === "interna")).toBeFalsy();
    expect(visiveisAtendente.some((m) => m.tipo === "interna")).toBeTruthy();
  });

  it("aluno confirma resolução → CLOSED (F7)", async () => {
    const t = await ticketSvc.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p" });
    await ticketSvc.resolver(t.protocolo, "Carlos Lima", "Pronto.");
    const r = await ticketSvc.confirmarResolucao(t.protocolo, "A");
    expect(r.situacao).toBe("CLOSED");
    expect(r.motivoFechamento).toBe("CONFIRMED");
  });

  it("aluno rejeita resolução → IN_PROGRESS e reabertura+1 (F6)", async () => {
    const t = await ticketSvc.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p" });
    await ticketSvc.resolver(t.protocolo, "Carlos Lima", "Pronto.");
    const r = await ticketSvc.rejeitarResolucao(t.protocolo, "A", "Não resolveu de fato");
    expect(r.situacao).toBe("IN_PROGRESS");
    expect(r.reaberturas).toBe(1);
  });

  it("chamado fechado não aceita mensagens (BR-F2)", async () => {
    const t = await ticketSvc.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p" });
    await ticketSvc.cancelar(t.protocolo, "A", "desisti");
    let erro = false;
    try { await ticketSvc.responder(t.protocolo, "Carlos Lima", "oi"); } catch { erro = true; }
    expect(erro).toBeTruthy();
  });
});

describe("knowledge-service CRUD (BR-C3/C5)", () => {
  it("criar artigo começa como DRAFT v1", async () => {
    kbSvc.resetarArtigos();
    const a = await kbSvc.criarArtigo({ titulo: "Novo", categoria: "Financeiro › Boleto", conteudo: "x" }, "Admin");
    expect(a.status).toBe("DRAFT");
    expect(a.versao).toBe(1);
  });
  it("editar artigo publicado incrementa a versão (BR-C5)", async () => {
    kbSvc.resetarArtigos();
    const a = await kbSvc.criarArtigo({ titulo: "A", categoria: "Financeiro › Boleto", conteudo: "x" }, "Admin");
    await kbSvc.definirStatusArtigo(a.id, "PUBLISHED", "Admin");
    const e = await kbSvc.editarArtigo(a.id, { conteudo: "y" }, "Admin");
    expect(e.versao).toBe(2);
  });
  it("publicar torna o artigo elegível ao assistente (BR-C2)", async () => {
    kbSvc.resetarArtigos();
    const a = await kbSvc.criarArtigo({ titulo: "Horário da biblioteca", categoria: "Tecnologia › Portal do Aluno", conteudo: "x", perguntasRelacionadas: ["horario da biblioteca"] }, "Admin");
    let antes = await kbSvc.getPublishedArticles();
    expect(antes.some((x) => x.id === a.id)).toBeFalsy();
    await kbSvc.definirStatusArtigo(a.id, "PUBLISHED", "Admin");
    let depois = await kbSvc.getPublishedArticles();
    expect(depois.some((x) => x.id === a.id)).toBeTruthy();
    kbSvc.resetarArtigos();
  });
});

// Expõe o run para a página do runner.
export { run };
