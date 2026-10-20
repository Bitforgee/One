/* ==========================================================================
   One — pages/assistant.js
   Assistente acadêmico (chat demonstrativo). Implementa o fluxo BR-B:
   1. aluno digita a pergunta;
   2. o sistema procura um artigo PUBLICADO correspondente (regras locais);
   3. se houver correspondência, mostra a resposta + referência e pergunta
      "Isso resolveu sua dúvida?" com EXATAMENTE Sim/Não (BR-B3);
   4. "Sim" → desfecho SELF_RESOLVED (BR-B5);
   5. "Não" → informa que será possível abrir solicitação na Fase 4 (BR-B6);
   6. sem correspondência → informa que não há resposta e oferece encaminhamento
      (BR-B4). A criação efetiva do chamado é da Fase 4.
   A conversa é persistida com snapshot do artigo (BR-B8).

   NÃO há IA real: a correspondência é determinística (knowledge-service).
   ========================================================================== */

import { el, clear } from "../dom.js";
import { showToast } from "../components/toast.js";
import { pageHead } from "../components/page-head.js";
import { matchArticle } from "../services/knowledge-service.js";
import * as conv from "../services/conversation-service.js";
import * as tickets from "../services/ticket-service.js";
import { navigate } from "../router.js";

let usuarioAtual = null;      // sessão do aluno (para criar o chamado)

let conversa = null;
let janela = null;   // área de mensagens (scroll)
let input = null;    // campo de texto
let aguardandoFeedback = false; // trava o input enquanto espera Sim/Não

/** Cria uma bolha de mensagem. */
function bolha({ autor, texto, artigo }) {
  const ehAluno = autor === "aluno";
  const ehSistema = autor === "sistema";
  const wrap = el("div", {
    class: "one-msg " + (ehAluno ? "one-msg--aluno" : ehSistema ? "one-msg--sistema" : "one-msg--assistente"),
  });

  const corpo = el("div", { class: "one-msg__bubble" });
  if (!ehAluno) {
    corpo.append(el("span", { class: "one-msg__who", text: ehSistema ? "Sistema" : "Assistente One" }));
  }
  // Texto com quebras de linha preservadas (seguro via textContent).
  (texto || "").split("\n").forEach((linha, i) => {
    corpo.append(i === 0 ? document.createTextNode(linha) : el("div", { text: linha }));
  });

  // Referência ao artigo (BR-B: indicação do artigo utilizado).
  if (artigo) {
    corpo.append(el("div", { class: "one-msg__ref mt-2" }, [
      el("i", { class: "bi bi-journal-text me-1", "aria-hidden": "true" }),
      el("span", { text: `Artigo: ${artigo.titulo} (${artigo.id}, v${artigo.versao})` }),
    ]));
  }

  wrap.append(corpo);
  return wrap;
}

/** Acrescenta uma bolha e rola para o fim. */
function empurrar(msg) {
  janela.append(bolha(msg));
  janela.scrollTop = janela.scrollHeight;
}

/** Mostra as duas opções Sim/Não (BR-B3). */
function mostrarSimNao() {
  aguardandoFeedback = true;
  const opcoes = el("div", { class: "one-msg one-msg--assistente", id: "one-feedback" }, [
    el("div", { class: "one-msg__actions d-flex gap-2" }, [
      el("button", {
        class: "btn btn-sm btn-success", type: "button",
        on: { click: () => responderFeedback(true) },
      }, [el("i", { class: "bi bi-hand-thumbs-up me-1", "aria-hidden": "true" }), "Sim"]),
      el("button", {
        class: "btn btn-sm btn-outline-secondary", type: "button",
        on: { click: () => responderFeedback(false) },
      }, [el("i", { class: "bi bi-hand-thumbs-down me-1", "aria-hidden": "true" }), "Não"]),
    ]),
  ]);
  janela.append(opcoes);
  janela.scrollTop = janela.scrollHeight;
}

/** Remove o bloco de opções Sim/Não. */
function removerSimNao() {
  const f = document.getElementById("one-feedback");
  if (f) f.remove();
  aguardandoFeedback = false;
}

/** Trata a resposta Sim/Não (BR-B5/B6). */
function responderFeedback(resolveu) {
  removerSimNao();
  if (resolveu) {
    conv.adicionarMensagem(conversa, "aluno", "Sim, resolveu.");
    empurrar({ autor: "aluno", texto: "Sim, resolveu." });
    conv.definirDesfecho(conversa, conv.DESFECHOS.SELF_RESOLVED);
    empurrar({ autor: "sistema", texto: "Atendimento finalizado. Que bom que ajudou! 🎉" });
    showToast("Conversa resolvida pelo assistente (demonstrativo).", { variant: "success" });
    mostrarReiniciar();
  } else {
    conv.adicionarMensagem(conversa, "aluno", "Não resolveu.");
    empurrar({ autor: "aluno", texto: "Não resolveu." });
    // BR-B6: oferece abrir solicitação. Criação efetiva é da Fase 4.
    empurrar({
      autor: "assistente",
      texto: "Entendi. Posso registrar uma solicitação para a equipe responsável dar continuidade ao seu atendimento.",
    });
    const bloco = el("div", { class: "one-msg one-msg--assistente", id: "one-escalar" }, [
      el("div", { class: "one-msg__actions d-flex gap-2 flex-wrap" }, [
        el("button", {
          class: "btn btn-sm btn-primary", type: "button",
          on: { click: escalar },
        }, [el("i", { class: "bi bi-ticket-detailed me-1", "aria-hidden": "true" }), "Abrir solicitação"]),
        el("button", {
          class: "btn btn-sm btn-outline-secondary", type: "button",
          on: { click: recusar },
        }, [el("span", { text: "Agora não" })]),
      ]),
    ]);
    janela.append(bloco);
    janela.scrollTop = janela.scrollHeight;
  }
}

/** Aluno aceita abrir solicitação: cria o chamado reaproveitando o contexto
    da conversa (BR-D1/D2/D4) e navega para o detalhe. */
async function escalar() {
  const b = document.getElementById("one-escalar");
  if (b) b.remove();
  conv.definirDesfecho(conversa, conv.DESFECHOS.ESCALATED);

  // Primeira pergunta do aluno = título (BR-D3).
  const primeira = (conversa.mensagens.find((m) => m.autor === "aluno") || {}).texto || "Solicitação";
  // Transcrição somente leitura (BR-D2).
  const transcricao = conversa.mensagens
    .filter((m) => m.autor === "aluno" || m.autor === "assistente")
    .map((m) => ({ autor: m.autor, texto: m.texto }));

  try {
    const ticket = await tickets.criarDeConversa({
      aluno: usuarioAtual,
      perguntaInicial: primeira,
      transcricao,
      artigoSnapshot: conversa.ultimoArtigo, // BR-D4: categoria do último artigo
    });
    empurrar({ autor: "sistema", texto: `Solicitação criada: ${ticket.protocolo}. Encaminhada para "${ticket.setor}".` });
    showToast(`Solicitação ${ticket.protocolo} criada.`, { variant: "success", title: "Protocolo gerado" });
    const bloco = el("div", { class: "one-msg one-msg--assistente" }, [
      el("div", { class: "one-msg__actions" }, [
        el("button", { class: "btn btn-sm btn-primary", type: "button", on: { click: () => navigate(`#/aluno/solicitacoes/${ticket.protocolo}`) } }, [el("i", { class: "bi bi-box-arrow-up-right me-1", "aria-hidden": "true" }), "Ver solicitação"]),
      ]),
    ]);
    janela.append(bloco);
    janela.scrollTop = janela.scrollHeight;
  } catch (err) {
    showToast("Não foi possível criar a solicitação: " + err.message, { variant: "danger" });
  }
  mostrarReiniciar();
}

/** Aluno recusa abrir solicitação (BR-B7: DECLINED). */
function recusar() {
  const b = document.getElementById("one-escalar");
  if (b) b.remove();
  conv.adicionarMensagem(conversa, "aluno", "Agora não.");
  empurrar({ autor: "aluno", texto: "Agora não." });
  conv.definirDesfecho(conversa, conv.DESFECHOS.DECLINED);
  empurrar({ autor: "sistema", texto: "Tudo bem. Você pode voltar quando quiser." });
  mostrarReiniciar();
}

/** Botão para iniciar nova conversa (BR-B9). */
function mostrarReiniciar() {
  const bloco = el("div", { class: "one-msg one-msg--assistente", id: "one-reiniciar" }, [
    el("div", { class: "one-msg__actions" }, [
      el("button", {
        class: "btn btn-sm btn-outline-primary", type: "button",
        on: { click: () => { novaConversaUI(); } },
      }, [el("i", { class: "bi bi-arrow-repeat me-1", "aria-hidden": "true" }), "Nova pergunta"]),
    ]),
  ]);
  janela.append(bloco);
  janela.scrollTop = janela.scrollHeight;
  if (input) input.disabled = true;
}

/** Processa o envio de uma pergunta (BR-B2/B3/B4). */
async function enviar(perguntaRaw) {
  const pergunta = (perguntaRaw || "").trim();
  if (!pergunta || aguardandoFeedback) return;

  conv.adicionarMensagem(conversa, "aluno", pergunta);
  empurrar({ autor: "aluno", texto: pergunta });
  input.value = "";

  // Indicador de "processando" (apenas visual; não é IA).
  const processando = el("div", { class: "one-msg one-msg--assistente", id: "one-processando" }, [
    el("div", { class: "one-msg__bubble" }, [
      el("span", { class: "one-msg__who", text: "Assistente One" }),
      el("span", { class: "one-typing" }, [el("span"), el("span"), el("span")]),
    ]),
  ]);
  janela.append(processando);
  janela.scrollTop = janela.scrollHeight;

  const resultado = await matchArticle(pergunta);
  await new Promise((r) => setTimeout(r, 250)); // pequena pausa demonstrativa
  processando.remove();

  if (resultado && resultado.artigo) {
    conv.registrarResposta(conversa, resultado.artigo);
    empurrar({ autor: "assistente", texto: resultado.artigo.conteudo, artigo: resultado.artigo });
    empurrar({ autor: "assistente", texto: "Isso resolveu sua dúvida?" });
    mostrarSimNao();
  } else {
    // BR-B4: sem correspondência, não mostra artigo algum.
    empurrar({
      autor: "assistente",
      texto: "Não encontrei um artigo publicado que responda a essa dúvida. Posso registrar uma solicitação para a equipe responsável.",
    });
    const bloco = el("div", { class: "one-msg one-msg--assistente", id: "one-escalar" }, [
      el("div", { class: "one-msg__actions d-flex gap-2 flex-wrap" }, [
        el("button", {
          class: "btn btn-sm btn-primary", type: "button",
          on: { click: escalar },
        }, [el("i", { class: "bi bi-ticket-detailed me-1", "aria-hidden": "true" }), "Abrir solicitação"]),
        el("button", {
          class: "btn btn-sm btn-outline-secondary", type: "button",
          on: { click: recusar },
        }, [el("span", { text: "Agora não" })]),
      ]),
    ]);
    janela.append(bloco);
    janela.scrollTop = janela.scrollHeight;
  }
}

/** Inicia uma nova conversa na interface. */
function novaConversaUI(user) {
  conversa = conv.reiniciar(user || { name: conversa ? conversa.aluno : "Aluno" });
  aguardandoFeedback = false;
  clear(janela);
  if (input) { input.disabled = false; input.focus(); }
  empurrar({
    autor: "assistente",
    texto: "Olá! Explique a sua dúvida em poucas palavras e eu procuro uma resposta na base de conhecimento.",
  });
  // Sugestões de exemplo.
  const exemplos = ["Como emitir meu boleto?", "Como solicitar atestado?", "Não consigo acessar o portal."];
  const chips = el("div", { class: "one-msg one-msg--assistente" }, [
    el("div", { class: "d-flex flex-wrap gap-2" },
      exemplos.map((ex) => el("button", {
        class: "btn btn-sm btn-outline-secondary", type: "button",
        on: { click: () => enviar(ex) },
      }, [el("span", { text: ex })]))
    ),
  ]);
  janela.append(chips);
}

/**
 * Renderiza a tela do assistente.
 * @param {HTMLElement} host
 * @param {object} user  sessão (aluno)
 */
export function renderAssistant(host, user) {
  usuarioAtual = user;
  conversa = conv.obterOuCriar(user);

  janela = el("div", { class: "one-chat__window", id: "one-chat-window", "aria-live": "polite", "aria-label": "Conversa com o assistente" });

  input = el("input", {
    class: "form-control", type: "text", placeholder: "Digite sua dúvida…",
    "aria-label": "Digite sua dúvida",
    on: { keydown: (e) => { if (e.key === "Enter") { e.preventDefault(); enviar(input.value); } } },
  });

  const form = el("form", {
    class: "one-chat__input", on: { submit: (e) => { e.preventDefault(); enviar(input.value); } },
  }, [
    el("div", { class: "input-group" }, [
      input,
      el("button", { class: "btn btn-primary", type: "submit", "aria-label": "Enviar pergunta" }, [
        el("i", { class: "bi bi-send", "aria-hidden": "true" }),
      ]),
    ]),
  ]);

  const btnNova = el("button", {
    class: "btn btn-outline-secondary btn-sm", type: "button",
    on: { click: () => novaConversaUI(user) },
  }, [el("i", { class: "bi bi-arrow-repeat me-1", "aria-hidden": "true" }), "Nova conversa"]);

  host.replaceChildren(
    el("div", { class: "one-content__inner--readable" }, [
      pageHead("Assistente acadêmico", {
        subtitle: "Respostas baseadas apenas em artigos publicados. Simulação local, sem inteligência artificial.",
        actions: [btnNova],
      }),
      el("div", { class: "card one-chat" }, [
        el("div", { class: "card-body p-0 d-flex flex-column" }, [janela, form]),
      ]),
    ])
  );

  // Inicia sempre com uma conversa limpa na abertura da tela (demonstração).
  novaConversaUI(user);

  // Atalho opcional de demonstração/captura: ?demo-ask=<pergunta> envia
  // automaticamente a pergunta ao abrir. Não afeta o uso normal.
  try {
    const ask = new URLSearchParams(window.location.search).get("demo-ask");
    if (ask) enviar(ask);
  } catch { /* ignora */ }
}
