/* ==========================================================================
   One — tests/integration.js
   Teste de integração da jornada principal, exercitando os serviços reais na
   mesma ordem em que a interface os aciona:

   Aluno → Assistente → Solicitação → Protocolo → Atendente → Resposta →
   Resolução → Aluno → Histórico → Administrador → Indicadores.

   Também cobre cenários negativos e as regras de visibilidade/estado.
   É executado pelo runner junto da suíte unitária.
   ========================================================================== */

import { describe, it, expect } from "./test-harness.js";
import { matchArticle } from "../js/services/knowledge-service.js";
import * as conv from "../js/services/conversation-service.js";
import * as tk from "../js/services/ticket-service.js";
import * as metrics from "../js/services/metrics-service.js";
import { resetarArtigos } from "../js/services/knowledge-service.js";

describe("INTEGRAÇÃO — jornada principal (BR-A..I)", () => {
  const aluno = { name: "Aluno Jornada", role: "aluno", course: "Análise e Desenvolvimento de Sistemas" };
  const atendente = "Beatriz Rocha"; // setor Financeiro
  let protocolo = null;

  it("1) aluno pergunta e o assistente encontra artigo publicado (BR-B2)", async () => {
    resetarArtigos();
    const m = await matchArticle("Como emitir meu boleto?");
    expect(m).toBeTruthy();
    expect(m.artigo.status).toBe("PUBLISHED");
  });

  it("2) aluno responde 'Não' e a conversa é escalada (BR-B6/B7)", () => {
    const c = conv.novaConversa(aluno);
    conv.adicionarMensagem(c, "aluno", "Como emitir meu boleto?");
    conv.registrarResposta(c, { id: "KB-001", versao: 2, titulo: "Boleto", categoria: "Financeiro › Boleto", conteudo: "passos" });
    conv.adicionarMensagem(c, "aluno", "Não resolveu.");
    conv.definirDesfecho(c, conv.DESFECHOS.ESCALATED);
    expect(c.desfecho).toBe("ESCALATED");
    expect(c.ultimoArtigo.categoria).toBe("Financeiro › Boleto");
  });

  it("3) a conversa vira solicitação com protocolo e roteamento (BR-D/E)", async () => {
    tk.resetar();
    const c = conv.obterAtual();
    const t = await tk.criarDeConversa({
      aluno,
      perguntaInicial: "Como emitir meu boleto?",
      transcricao: c.mensagens.map((m) => ({ autor: m.autor, texto: m.texto })),
      artigoSnapshot: c.ultimoArtigo,
    });
    protocolo = t.protocolo;
    expect(t.protocolo).toContain("ONE-");
    expect(t.setor).toBe("Financeiro");            // BR-E (boleto → Financeiro)
    expect(t.situacao).toBe("OPEN");               // F1
    expect(t.transcricao.length > 0).toBeTruthy(); // BR-D2 contexto anexado
  });

  it("4) atendente do setor assume o chamado (F2)", async () => {
    const t = await tk.assumir(protocolo, atendente);
    expect(t.situacao).toBe("IN_PROGRESS");
    expect(t.responsavel).toBe(atendente);
  });

  it("5) atendente adiciona nota interna (invisível ao aluno) e responde", async () => {
    await tk.adicionarNota(protocolo, atendente, "Conferir no sistema financeiro.");
    await tk.responder(protocolo, atendente, "Olá! Veja os passos para emitir o boleto.", { aguardaAluno: true });
    const t = await tk.obter(protocolo);
    expect(t.situacao).toBe("WAITING_STUDENT");    // F3
    const aluFmt = tk.mensagensVisiveis(t, "aluno");
    expect(aluFmt.some((m) => m.tipo === "interna")).toBeFalsy(); // BR-G2
  });

  it("6) aluno responde e o chamado volta a IN_PROGRESS (F4)", async () => {
    const t = await tk.responderAluno(protocolo, aluno.name, "Consegui acessar, obrigado.");
    expect(t.situacao).toBe("IN_PROGRESS");
  });

  it("7) atendente resolve o chamado (F5)", async () => {
    const t = await tk.resolver(protocolo, atendente, "Boleto emitido com sucesso pelo portal.");
    expect(t.situacao).toBe("RESOLVED");
  });

  it("8) aluno confirma a resolução e o chamado fecha (F7)", async () => {
    const t = await tk.confirmarResolucao(protocolo, aluno.name);
    expect(t.situacao).toBe("CLOSED");
    expect(t.motivoFechamento).toBe("CONFIRMED");
  });

  it("9) histórico é append-only e registra os eventos (BR-H)", async () => {
    const t = await tk.obter(protocolo);
    const tipos = t.mensagens.map((m) => m.tipo);
    expect(tipos).toContain("evento");
    expect(tipos).toContain("publica");
    expect(tipos).toContain("interna");
    // Todas as mensagens têm autor e timestamp.
    expect(t.mensagens.every((m) => m.autor && m.em)).toBeTruthy();
  });

  it("10) indicadores refletem o chamado fechado (seção I)", async () => {
    const r = await metrics.resumo();
    expect(r.total > 0).toBeTruthy();
    const top = await metrics.topCategorias(5);
    expect(top.length > 0).toBeTruthy();
  });
});

describe("INTEGRAÇÃO — cenários negativos e permissões", () => {
  it("aluno não vê chamado de outro aluno (BR-A4)", async () => {
    tk.resetar();
    const t = await tk.criarDeConversa({ aluno: { name: "Outro Aluno", course: "x" }, perguntaInicial: "p" });
    const meus = await tk.listarDoAluno("Aluno Jornada");
    expect(meus.some((x) => x.protocolo === t.protocolo)).toBeFalsy();
  });

  it("atendente só vê chamados do seu setor (BR-A5)", async () => {
    tk.resetar();
    const t = await tk.criarDeConversa({ aluno: { name: "A", course: "Análise e Desenvolvimento de Sistemas" }, perguntaInicial: "p", artigoSnapshot: { categoria: "Financeiro › Boleto" } });
    const naSecretaria = await tk.listarDoSetor("Secretaria Acadêmica");
    const noFinanceiro = await tk.listarDoSetor("Financeiro");
    expect(noFinanceiro.some((x) => x.protocolo === t.protocolo)).toBeTruthy();
    expect(naSecretaria.some((x) => x.protocolo === t.protocolo)).toBeFalsy();
  });

  it("não é possível resolver sem texto (F5) nem transição inválida (BR-F1)", async () => {
    const t = await tk.criarDeConversa({ aluno: { name: "A", course: "x" }, perguntaInicial: "p" });
    let e1 = false;
    try { await tk.resolver(t.protocolo, "Carlos Lima", ""); } catch { e1 = true; }
    expect(e1).toBeTruthy();
    expect(tk.transicaoPermitida("OPEN", "RESOLVED")).toBeFalsy();
  });
});
