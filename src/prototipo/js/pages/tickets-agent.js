/* ==========================================================================
   One — pages/tickets-agent.js
   Fase 5 — Atendimento humano:
   - Fila do setor + visões por estado (Em atendimento, Aguardando aluno,
     Resolvidos) — BR-A5 (atendente só vê chamados do seu setor).
   - Detalhe com ações: assumir, responder (público), nota interna,
     encaminhar, resolver — BR-F/G/H.
   ========================================================================== */

import { el, clear } from "../dom.js";
import { showToast } from "../components/toast.js";
import { buildTable } from "../components/table.js";
import { pageHead } from "../components/page-head.js";
import { SITUACOES, getSetores } from "../mock-data.js";
import * as tickets from "../services/ticket-service.js";
import { badgeSituacao, pedirMotivo, cardHistorico, cardDados, cardTranscricao } from "./tickets-student.js";

/** Setor do atendente demonstrativo (a partir da sessão). */
function setorDo(user) { return user.sector || "Secretaria Acadêmica"; }

/* --- Fila / visões -------------------------------------------------------- */

/**
 * Lista de chamados do setor do atendente, com filtro de estado opcional.
 * @param {string} filtroEstado  "" | "IN_PROGRESS" | "WAITING_STUDENT" | "RESOLVED"
 */
export async function renderAgentQueue(host, user, filtroEstado = "", titulo = "Chamados") {
  const setor = setorDo(user);
  const estadoLocal = { query: "", situacao: filtroEstado };
  const box = el("div", { id: "one-queue" });

  async function atualizar() {
    let lista = await tickets.listarDoSetor(setor);
    if (estadoLocal.situacao) lista = lista.filter((t) => t.situacao === estadoLocal.situacao);
    if (estadoLocal.query) {
      const q = estadoLocal.query.toLowerCase();
      lista = lista.filter((t) => (t.protocolo + " " + t.assunto + " " + t.aluno + " " + t.categoria).toLowerCase().includes(q));
    }
    clear(box);
    box.append(buildTable({
      caption: "Fila de chamados",
      columns: [
        { key: "protocolo", label: "Protocolo", render: (r) => el("span", { class: "fw-semibold", text: r.protocolo }) },
        { key: "assunto", label: "Assunto" },
        { key: "aluno", label: "Aluno" },
        { key: "categoria", label: "Categoria", className: "text-muted-one" },
        { key: "setor", label: "Setor", className: "text-muted-one", render: (r) => el("span", { text: r.setor }) },
        { key: "situacao", label: "Situação", render: (r) => badgeSituacao(r.situacao) },
        { key: "acoes", label: "Ações", render: (r) => el("a", { class: "btn btn-sm btn-outline-primary", href: `#/atendente/chamado/${r.protocolo}`, "aria-label": `Abrir ${r.protocolo}` }, [el("i", { class: "bi bi-box-arrow-in-right", "aria-hidden": "true" })]) },
      ],
      rows: lista,
      emptyText: "Nenhum chamado nesta visão.",
    }));
  }

  // Campos de filtro mantidos como referências para o botão "Limpar filtros".
  const inputBusca = el("input", { class: "form-control", type: "search", placeholder: "Buscar por protocolo, assunto ou aluno…", "aria-label": "Buscar", on: { input: (e) => { estadoLocal.query = e.target.value; atualizar(); } } });
  const selectSituacao = filtroEstado ? null : el("select", { class: "form-select w-auto", "aria-label": "Filtrar por situação", on: { change: (e) => { estadoLocal.situacao = e.target.value; atualizar(); } } }, [
    el("option", { value: "", text: "Todas as situações" }),
    ...Object.entries(SITUACOES).map(([k, v]) => el("option", { value: k, text: v.label })),
  ]);

  // "Pesquisar": reaplica o filtro e devolve o foco à busca (útil no teclado/mobile).
  const btnPesquisar = el("button", { class: "btn btn-primary", type: "button", "aria-label": "Pesquisar", on: { click: () => { atualizar(); inputBusca.focus(); } } }, [el("i", { class: "bi bi-search me-1", "aria-hidden": "true" }), "Pesquisar"]);
  // "Limpar filtros": zera o estado local e re-renderiza.
  const btnLimpar = el("button", { class: "btn btn-outline-secondary", type: "button", "aria-label": "Limpar filtros", on: { click: () => { estadoLocal.query = ""; if (!filtroEstado) estadoLocal.situacao = ""; inputBusca.value = ""; if (selectSituacao) selectSituacao.value = ""; atualizar(); } } }, [el("i", { class: "bi bi-x-circle me-1", "aria-hidden": "true" }), "Limpar filtros"]);

  const filtros = el("div", { class: "one-filterbar" }, [
    el("div", { class: "input-group w-auto flex-grow-1" }, [
      el("span", { class: "input-group-text" }, [el("i", { class: "bi bi-search", "aria-hidden": "true" })]),
      inputBusca,
    ]),
    selectSituacao,
    btnPesquisar,
    btnLimpar,
  ]);

  host.replaceChildren(
    el("div", {}, [
      pageHead(titulo, { subtitle: `Setor: ${setor}. O atendente vê apenas chamados do seu setor.` }),
      filtros,
      el("div", { class: "card" }, [el("div", { class: "card-body p-0" }, [box])]),
    ])
  );
  await atualizar();
}

/* --- Detalhe / atendimento ----------------------------------------------- */

export async function renderAgentTicket(host, user, protocolo) {
  const setor = setorDo(user);
  const t = await tickets.obter(protocolo);
  if (!t) { host.replaceChildren(semAcesso("Chamado não encontrado.", "#/atendente/chamados")); return; }
  // BR-A5: atendente só acessa chamados atualmente no seu setor.
  if (t.setor !== setor) { host.replaceChildren(semAcesso("Este chamado não está no seu setor.", "#/atendente/chamados")); return; }

  function recarregar() { renderAgentTicket(host, user, protocolo); }
  const nome = user.name;

  const acoes = el("div", { class: "d-flex gap-2 flex-wrap" });
  if (t.situacao === "OPEN") {
    acoes.append(el("button", { class: "btn btn-primary btn-sm", type: "button", on: { click: async () => { await tickets.assumir(protocolo, nome); showToast("Chamado assumido.", { variant: "success" }); recarregar(); } } }, [el("i", { class: "bi bi-hand-index me-1", "aria-hidden": "true" }), "Assumir"]));
  }
  if (["OPEN", "IN_PROGRESS", "WAITING_STUDENT"].includes(t.situacao)) {
    acoes.append(
      el("button", { class: "btn btn-outline-primary btn-sm", type: "button", on: { click: () => pedirMotivo("Encaminhar — informe o motivo", async (m) => abrirEncaminhar(protocolo, nome, t.setor, m, recarregar), {}) } }, [el("i", { class: "bi bi-signpost-split me-1", "aria-hidden": "true" }), "Encaminhar"]),
      el("button", { class: "btn btn-success btn-sm", type: "button", on: { click: () => pedirMotivo("Texto da resolução (visível ao aluno)", async (m) => { await tickets.resolver(protocolo, nome, m); showToast("Chamado resolvido.", { variant: "success" }); recarregar(); }) } }, [el("i", { class: "bi bi-check2-circle me-1", "aria-hidden": "true" }), "Resolver"]),
    );
  }

  // Área de resposta/nota (quando não fechado).
  const pode = t.situacao !== "CLOSED";
  const campo = el("textarea", { class: "form-control", rows: "3", placeholder: "Escreva uma resposta pública ou uma nota interna…", "aria-label": "Mensagem" });
  const chkAguarda = el("input", { class: "form-check-input", type: "checkbox", id: "ag-aguarda" });
  const chkInterna = el("input", { class: "form-check-input", type: "checkbox", id: "ag-interna" });
  chkInterna.addEventListener("change", () => { chkAguarda.disabled = chkInterna.checked; if (chkInterna.checked) chkAguarda.checked = false; });

  async function enviarMsg() {
    const v = campo.value.trim();
    if (!v) return;
    if (chkInterna.checked) {
      await tickets.adicionarNota(protocolo, nome, v);
      showToast("Nota interna adicionada (não visível ao aluno).", { variant: "info" });
    } else {
      await tickets.responder(protocolo, nome, v, { aguardaAluno: chkAguarda.checked });
      showToast("Resposta enviada ao aluno.", { variant: "success" });
    }
    recarregar();
  }

  host.replaceChildren(
    el("div", {}, [
      el("nav", { class: "mb-2", "aria-label": "trilha" }, [el("a", { href: "#/atendente/chamados", class: "text-decoration-none" }, [el("i", { class: "bi bi-arrow-left me-1", "aria-hidden": "true" }), "Fila de chamados"])]),
      el("div", { class: "one-surface p-4 mb-3 d-flex align-items-start gap-3 flex-wrap" }, [
        el("div", { class: "flex-grow-1" }, [
          el("div", { class: "d-flex align-items-center gap-2 mb-1 flex-wrap" }, [el("span", { class: "h5 mb-0", text: t.protocolo }), badgeSituacao(t.situacao)]),
          el("h2", { class: "h4 mb-0", text: t.assunto }),
        ]),
        acoes,
      ]),
      el("div", { class: "row g-3 one-detail" }, [
        el("div", { class: "col-lg-8" }, [
          cardHistorico(t, "atendente"),
          pode ? el("div", { class: "card mt-3" }, [el("div", { class: "card-body" }, [
            el("label", { class: "form-label", text: "Nova mensagem" }), campo,
            el("div", { class: "d-flex align-items-center gap-3 mt-2 flex-wrap" }, [
              el("div", { class: "form-check" }, [chkInterna, el("label", { class: "form-check-label", for: "ag-interna", text: "Nota interna (não visível ao aluno)" })]),
              el("div", { class: "form-check" }, [chkAguarda, el("label", { class: "form-check-label", for: "ag-aguarda", text: "Aguardar resposta do aluno" })]),
              el("button", { class: "btn btn-primary btn-sm ms-auto", type: "button", on: { click: enviarMsg } }, [el("i", { class: "bi bi-send me-1", "aria-hidden": "true" }), "Enviar"]),
            ]),
          ])]) : el("div", { class: "alert alert-secondary mt-3", role: "status", text: "Chamado fechado: não aceita novas mensagens (BR-F2)." }),
        ]),
        el("div", { class: "col-lg-4" }, [cardDados(t), t.transcricao && t.transcricao.length ? cardTranscricao(t) : null]),
      ]),
    ])
  );
}

/** Modal de encaminhamento: escolhe o setor de destino (≠ atual) + motivo. */
async function abrirEncaminhar(protocolo, autor, setorAtual, motivo, recarregar) {
  const setores = (await getSetores()).filter((s) => s.nome !== setorAtual);
  const antigo = document.getElementById("one-encaminhar-modal");
  if (antigo) antigo.remove();
  const select = el("select", { class: "form-select", "aria-label": "Setor de destino" }, setores.map((s) => el("option", { value: s.nome, text: s.nome })));
  const modal = el("div", { class: "modal fade", id: "one-encaminhar-modal", tabindex: "-1", "aria-hidden": "true" }, [
    el("div", { class: "modal-dialog modal-dialog-centered" }, [el("div", { class: "modal-content" }, [
      el("div", { class: "modal-header" }, [el("h2", { class: "modal-title h5", text: "Encaminhar chamado" }), el("button", { type: "button", class: "btn-close", dataset: { bsDismiss: "modal" }, "aria-label": "Fechar" })]),
      el("div", { class: "modal-body" }, [
        el("p", { class: "text-muted-one small", text: `Motivo: ${motivo}` }),
        el("label", { class: "form-label", text: "Setor de destino (diferente do atual)" }), select,
      ]),
      el("div", { class: "modal-footer" }, [
        el("button", { type: "button", class: "btn btn-outline-secondary", dataset: { bsDismiss: "modal" }, text: "Voltar" }),
        el("button", { type: "button", class: "btn btn-primary", id: "one-enc-ok", text: "Encaminhar" }),
      ]),
    ])]),
  ]);
  document.body.append(modal);
  const inst = window.bootstrap ? new window.bootstrap.Modal(modal) : null;
  modal.querySelector("#one-enc-ok").addEventListener("click", async () => {
    try {
      await tickets.encaminhar(protocolo, autor, select.value, motivo);
      if (inst) inst.hide();
      showToast(`Chamado encaminhado para ${select.value}.`, { variant: "success" });
      recarregar();
    } catch (err) { showToast(err.message, { variant: "danger" }); }
  });
  modal.addEventListener("hidden.bs.modal", () => modal.remove());
  if (inst) inst.show();
}

function semAcesso(msg, voltar) {
  return el("div", { class: "one-empty one-surface p-5" }, [
    el("i", { class: "bi bi-shield-lock", "aria-hidden": "true" }),
    el("p", { text: msg }),
    el("a", { class: "btn btn-outline-primary btn-sm", href: voltar, text: "Voltar à fila" }),
  ]);
}
