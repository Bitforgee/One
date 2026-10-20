/* ==========================================================================
   One — pages/tickets-student.js
   Fase 4 — Solicitações do aluno:
   - "Novo atendimento": criação de solicitação com confirmação (BR-D1).
   - "Minhas solicitações": listagem com filtros e busca (BR-A4).
   - Detalhe: dados, situação, histórico (timeline), ações do aluno
     (responder, confirmar/rejeitar resolução, cancelar) — BR-F/G/H.
   ========================================================================== */

import { el, clear } from "../dom.js";
import { navigate } from "../router.js";
import { showToast } from "../components/toast.js";
import { buildTable, situacaoBadge } from "../components/table.js";
import { pageHead } from "../components/page-head.js";
import { SITUACOES, getCategorias } from "../mock-data.js";
import * as tickets from "../services/ticket-service.js";
import { resolverSetor } from "../services/routing-service.js";

/* --- Novo atendimento (criação) ------------------------------------------ */

export async function renderNewTicket(host, user) {
  const categorias = await getCategorias();
  const campoAssunto = el("input", { class: "form-control", type: "text", id: "nt-assunto", maxlength: "120", placeholder: "Resuma sua necessidade" });
  const campoCategoria = el("select", { class: "form-select", id: "nt-categoria" }, [
    el("option", { value: "", text: "Não classificado" }),
    ...categorias.map((c) => el("option", { value: c.nome, text: c.nome })),
  ]);
  const campoDescricao = el("textarea", { class: "form-control", id: "nt-descricao", rows: "4", placeholder: "Descreva com mais detalhes (opcional)" });

  const previaSetor = el("span", { class: "fw-semibold", text: "—" });
  async function atualizarPrevia() {
    const setor = await resolverSetor({ categoria: campoCategoria.value, curso: user.course });
    previaSetor.textContent = setor;
  }
  campoCategoria.addEventListener("change", atualizarPrevia);

  async function enviar(e) {
    e.preventDefault();
    const assunto = campoAssunto.value.trim();
    if (!assunto) { showToast("Informe o assunto da solicitação.", { variant: "warning" }); campoAssunto.focus(); return; }

    // BR-D1: confirmação explícita antes de criar.
    abrirConfirmacao({
      assunto, categoria: campoCategoria.value || "Não classificado", setor: previaSetor.textContent,
      onConfirm: async () => {
        const art = campoCategoria.value ? { categoria: campoCategoria.value } : null;
        const ticket = await tickets.criarDeConversa({
          aluno: user, perguntaInicial: assunto, descricao: campoDescricao.value.trim(), artigoSnapshot: art,
        });
        showToast(`Solicitação criada: ${ticket.protocolo}`, { variant: "success", title: "Protocolo gerado" });
        navigate(`#/aluno/solicitacoes/${ticket.protocolo}`);
      },
    });
  }

  host.replaceChildren(
    el("div", { class: "one-content__inner--readable" }, [
      pageHead("Novo atendimento", { subtitle: "Abra uma solicitação. Antes de criar, você poderá revisar e confirmar os dados." }),
      el("div", { class: "card" }, [
        el("div", { class: "card-body" }, [
          el("form", { on: { submit: enviar } }, [
            el("div", { class: "mb-3" }, [
              el("label", { class: "form-label", for: "nt-assunto", text: "Assunto" }),
              campoAssunto,
            ]),
            el("div", { class: "row g-3" }, [
              el("div", { class: "col-md-6" }, [
                el("label", { class: "form-label", for: "nt-categoria", text: "Categoria" }),
                campoCategoria,
              ]),
              el("div", { class: "col-md-6" }, [
                el("label", { class: "form-label", text: "Setor de destino (automático)" }),
                el("div", { class: "form-control bg-transparent d-flex align-items-center gap-2" }, [
                  el("i", { class: "bi bi-signpost-split text-muted-one", "aria-hidden": "true" }), previaSetor,
                ]),
              ]),
            ]),
            el("div", { class: "mt-3 mb-3" }, [
              el("label", { class: "form-label", for: "nt-descricao", text: "Descrição complementar (opcional)" }),
              campoDescricao,
            ]),
            el("div", { class: "d-flex gap-2" }, [
              el("button", { class: "btn btn-primary", type: "submit" }, [el("i", { class: "bi bi-send me-2", "aria-hidden": "true" }), "Revisar e criar"]),
              el("a", { class: "btn btn-outline-secondary", href: "#/aluno/solicitacoes", text: "Cancelar" }),
            ]),
          ]),
        ]),
      ]),
    ])
  );
  await atualizarPrevia();
}

/** Modal de confirmação (BR-D1). */
function abrirConfirmacao({ assunto, categoria, setor, onConfirm }) {
  const antigo = document.getElementById("one-confirm-modal");
  if (antigo) antigo.remove();

  const modal = el("div", { class: "modal fade", id: "one-confirm-modal", tabindex: "-1", "aria-hidden": "true" }, [
    el("div", { class: "modal-dialog modal-dialog-centered" }, [
      el("div", { class: "modal-content" }, [
        el("div", { class: "modal-header" }, [
          el("h2", { class: "modal-title h5", text: "Confirmar criação da solicitação" }),
          el("button", { type: "button", class: "btn-close", dataset: { bsDismiss: "modal" }, "aria-label": "Fechar" }),
        ]),
        el("div", { class: "modal-body" }, [
          el("dl", { class: "row mb-0" }, [
            el("dt", { class: "col-4 text-muted-one", text: "Assunto" }), el("dd", { class: "col-8", text: assunto }),
            el("dt", { class: "col-4 text-muted-one", text: "Categoria" }), el("dd", { class: "col-8", text: categoria }),
            el("dt", { class: "col-4 text-muted-one", text: "Setor" }), el("dd", { class: "col-8", text: setor }),
          ]),
        ]),
        el("div", { class: "modal-footer" }, [
          el("button", { type: "button", class: "btn btn-outline-secondary", dataset: { bsDismiss: "modal" }, text: "Voltar" }),
          el("button", { type: "button", class: "btn btn-primary", id: "one-confirm-ok" }, [el("i", { class: "bi bi-check2 me-2", "aria-hidden": "true" }), "Confirmar e criar"]),
        ]),
      ]),
    ]),
  ]);
  document.body.append(modal);
  const inst = window.bootstrap ? new window.bootstrap.Modal(modal) : null;
  modal.querySelector("#one-confirm-ok").addEventListener("click", async () => {
    if (inst) inst.hide();
    await onConfirm();
  });
  modal.addEventListener("hidden.bs.modal", () => modal.remove());
  if (inst) inst.show();
}

/* --- Minhas solicitações (listagem) -------------------------------------- */

export async function renderMyTickets(host, user) {
  const filtro = { query: "", situacao: "" };
  const tabelaBox = el("div", { id: "one-mytickets" });

  async function atualizar() {
    let lista = await tickets.listarDoAluno(user.name);
    if (filtro.situacao) lista = lista.filter((t) => t.situacao === filtro.situacao);
    if (filtro.query) {
      const q = filtro.query.toLowerCase();
      lista = lista.filter((t) => (t.protocolo + " " + t.assunto + " " + t.categoria).toLowerCase().includes(q));
    }
    clear(tabelaBox);
    tabelaBox.append(buildTable({
      caption: "Minhas solicitações",
      columns: [
        { key: "protocolo", label: "Protocolo", render: (r) => el("span", { class: "fw-semibold", text: r.protocolo }) },
        { key: "assunto", label: "Assunto" },
        { key: "categoria", label: "Categoria", className: "text-muted-one" },
        { key: "setor", label: "Setor", className: "text-muted-one" },
        { key: "situacao", label: "Situação", render: (r) => badge(r.situacao) },
        { key: "atualizacao", label: "Atualização", className: "text-muted-one" },
        { key: "acoes", label: "Ações", render: (r) => el("a", { class: "btn btn-sm btn-outline-secondary", href: `#/aluno/solicitacoes/${r.protocolo}`, "aria-label": `Abrir ${r.protocolo}` }, [el("i", { class: "bi bi-eye", "aria-hidden": "true" })]) },
      ],
      rows: lista,
      emptyText: "Você ainda não tem solicitações.",
    }));
  }

  const btnNovo = el("a", { class: "btn btn-primary", href: "#/aluno/novo" }, [el("i", { class: "bi bi-plus-circle me-2", "aria-hidden": "true" }), "Novo atendimento"]);

  const filtros = el("div", { class: "one-filterbar" }, [
    el("div", { class: "input-group w-auto flex-grow-1" }, [
      el("span", { class: "input-group-text" }, [el("i", { class: "bi bi-search", "aria-hidden": "true" })]),
      el("input", { class: "form-control", type: "search", placeholder: "Buscar por protocolo ou assunto…", "aria-label": "Buscar", on: { input: (e) => { filtro.query = e.target.value; atualizar(); } } }),
    ]),
    filtroSituacao((v) => { filtro.situacao = v; atualizar(); }),
  ]);

  host.replaceChildren(
    el("div", {}, [
      pageHead("Minhas solicitações", { subtitle: "Acompanhe o andamento dos seus chamados.", actions: [btnNovo] }),
      filtros,
      el("div", { class: "card" }, [el("div", { class: "card-body p-0" }, [tabelaBox])]),
    ])
  );
  await atualizar();
}

/* --- Detalhe da solicitação (aluno) -------------------------------------- */

export async function renderTicketDetail(host, user, protocolo) {
  const t = await tickets.obter(protocolo);
  if (!t) { renderNaoEncontrado(host, "#/aluno/solicitacoes"); return; }
  // BR-A4: aluno só vê o próprio chamado.
  if (t.aluno !== user.name) { renderSemAcesso(host, "#/aluno/solicitacoes"); return; }

  function recarregar() { renderTicketDetail(host, user, protocolo); }

  const acoes = el("div", { class: "d-flex gap-2 flex-wrap" });
  // Ações conforme o estado (BR-F).
  if (t.situacao === "RESOLVED") {
    acoes.append(
      el("button", { class: "btn btn-success btn-sm", type: "button", on: { click: async () => { await tickets.confirmarResolucao(protocolo, user.name); showToast("Resolução confirmada. Chamado fechado.", { variant: "success" }); recarregar(); } } }, [el("i", { class: "bi bi-check2-circle me-1", "aria-hidden": "true" }), "Confirmar resolução"]),
      el("button", { class: "btn btn-outline-danger btn-sm", type: "button", on: { click: () => pedirMotivo("Por que a resolução não atendeu?", async (m) => { await tickets.rejeitarResolucao(protocolo, user.name, m); showToast("Chamado reaberto.", { variant: "info" }); recarregar(); }) } }, [el("i", { class: "bi bi-arrow-counterclockwise me-1", "aria-hidden": "true" }), "Reabrir"]),
    );
  }
  if (["OPEN", "IN_PROGRESS", "WAITING_STUDENT"].includes(t.situacao)) {
    acoes.append(el("button", { class: "btn btn-outline-danger btn-sm", type: "button", on: { click: () => pedirMotivo("Deseja cancelar? (motivo opcional)", async (m) => { await tickets.cancelar(protocolo, user.name, m); showToast("Solicitação cancelada.", { variant: "info" }); recarregar(); }, { opcional: true }) } }, [el("i", { class: "bi bi-x-circle me-1", "aria-hidden": "true" }), "Cancelar"]));
  }

  // Campo de resposta do aluno (quando aplicável).
  const podeResponder = ["OPEN", "IN_PROGRESS", "WAITING_STUDENT"].includes(t.situacao);
  const campoResp = el("textarea", { class: "form-control", rows: "2", placeholder: "Escreva uma resposta…", "aria-label": "Resposta ao chamado" });

  host.replaceChildren(
    el("div", {}, [
      el("nav", { "aria-label": "trilha", class: "mb-2" }, [
        el("a", { href: "#/aluno/solicitacoes", class: "text-decoration-none" }, [el("i", { class: "bi bi-arrow-left me-1", "aria-hidden": "true" }), "Minhas solicitações"]),
      ]),
      cabecalhoChamado(t, acoes),
      el("div", { class: "row g-3 one-detail" }, [
        el("div", { class: "col-lg-8" }, [
          cardHistorico(t, "aluno"),
          podeResponder ? el("div", { class: "card mt-3" }, [el("div", { class: "card-body" }, [
            el("label", { class: "form-label", text: "Responder" }), campoResp,
            el("div", { class: "mt-2 text-end" }, [
              el("button", { class: "btn btn-primary btn-sm", type: "button", on: { click: async () => { const v = campoResp.value.trim(); if (!v) return; await tickets.responderAluno(protocolo, user.name, v); showToast("Resposta enviada.", { variant: "success" }); recarregar(); } } }, [el("i", { class: "bi bi-send me-1", "aria-hidden": "true" }), "Enviar"]),
            ]),
          ])]) : null,
        ]),
        el("div", { class: "col-lg-4" }, [cardDados(t), t.transcricao && t.transcricao.length ? cardTranscricao(t) : null]),
      ]),
    ])
  );
}

/* --- Blocos compartilhados ----------------------------------------------- */

function badge(situacao) { const s = SITUACOES[situacao] || { label: situacao, cls: "closed" }; return situacaoBadge(s.cls, s.label); }

function cabecalhoChamado(t, acoes) {
  return el("div", { class: "one-surface p-4 mb-3 d-flex align-items-start gap-3 flex-wrap" }, [
    el("div", { class: "flex-grow-1" }, [
      el("div", { class: "d-flex align-items-center gap-2 mb-1 flex-wrap" }, [
        el("span", { class: "h5 mb-0", text: t.protocolo }), badge(t.situacao),
      ]),
      el("h2", { class: "h4 mb-0", text: t.assunto }),
    ]),
    acoes,
  ]);
}

function cardDados(t) {
  return el("div", { class: "card mb-3" }, [el("div", { class: "card-body" }, [
    el("h3", { class: "h6 text-muted-one text-uppercase", style: "letter-spacing:.04em", text: "Dados" }),
    el("dl", { class: "row mb-0 small" }, [
      el("dt", { class: "col-5 text-muted-one", text: "Aluno" }), el("dd", { class: "col-7", text: t.aluno }),
      el("dt", { class: "col-5 text-muted-one", text: "Curso" }), el("dd", { class: "col-7", text: t.curso }),
      el("dt", { class: "col-5 text-muted-one", text: "Categoria" }), el("dd", { class: "col-7", text: t.categoria }),
      el("dt", { class: "col-5 text-muted-one", text: "Setor" }), el("dd", { class: "col-7", text: t.setor }),
      el("dt", { class: "col-5 text-muted-one", text: "Responsável" }), el("dd", { class: "col-7", text: t.responsavel || "—" }),
      el("dt", { class: "col-5 text-muted-one", text: "Origem" }), el("dd", { class: "col-7", text: t.origem }),
      el("dt", { class: "col-5 text-muted-one", text: "Abertura" }), el("dd", { class: "col-7", text: t.abertura }),
    ]),
  ])]);
}

function cardTranscricao(t) {
  return el("div", { class: "card" }, [el("div", { class: "card-body" }, [
    el("h3", { class: "h6 text-muted-one text-uppercase", style: "letter-spacing:.04em", text: "Conversa do assistente" }),
    el("div", { class: "small" }, t.transcricao.map((m) => el("div", { class: "mb-2" }, [
      el("span", { class: "fw-semibold", text: (m.autor === "aluno" ? "Aluno: " : "One: ") }),
      el("span", { text: m.texto }),
    ]))),
  ])]);
}

/**
 * Ícone cosmético do evento da timeline. NÃO altera m.tipo, ordem nem BR-G2;
 * só escolhe um ícone pelo radical do texto, com fallback genérico.
 */
function iconeEvento(texto) {
  const t = (texto || "").toLowerCase();
  if (t.includes("encaminh")) return "bi-signpost-split"; // encaminhamento
  if (t.includes("resolv")) return "bi-check2-circle";    // resolução
  return "bi-clock-history";                               // genérico (fallback)
}

/** Timeline do histórico (BR-H). perfil "aluno" oculta notas internas. */
export function cardHistorico(t, perfil) {
  const msgs = tickets.mensagensVisiveis(t, perfil);
  return el("div", { class: "card" }, [el("div", { class: "card-body" }, [
    el("h3", { class: "h6 text-muted-one text-uppercase mb-3", style: "letter-spacing:.04em", text: "Histórico" }),
    el("ul", { class: "one-timeline" }, msgs.map((m) => el("li", { class: `one-timeline__item one-timeline__item--${m.tipo}` }, [
      el("div", { class: "one-timeline__head d-flex align-items-center gap-2 flex-wrap" }, [
        el("span", { class: "fw-semibold", text: m.autor }),
        m.tipo === "interna" ? el("span", { class: "badge text-bg-warning", text: "Nota interna" }) : null,
        m.tipo === "evento" ? el("span", { class: "badge text-bg-light border" }, [el("i", { class: `bi ${iconeEvento(m.texto)} me-1`, "aria-hidden": "true" }), "Evento"]) : null,
        el("small", { class: "text-subtle-one ms-auto", text: formatarData(m.em) }),
      ]),
      el("div", { class: "one-timeline__body" }, (m.texto || "").split("\n").map((l) => el("div", { text: l }))),
    ]))),
  ])]);
}

function filtroSituacao(onChange) {
  return el("select", { class: "form-select w-auto", "aria-label": "Filtrar por situação", on: { change: (e) => onChange(e.target.value) } }, [
    el("option", { value: "", text: "Todas as situações" }),
    ...Object.entries(SITUACOES).map(([k, v]) => el("option", { value: k, text: v.label })),
  ]);
}

function pedirMotivo(titulo, onOk, { opcional = false } = {}) {
  const antigo = document.getElementById("one-motivo-modal");
  if (antigo) antigo.remove();
  const ta = el("textarea", { class: "form-control", rows: "3", "aria-label": "Motivo" });
  const modal = el("div", { class: "modal fade", id: "one-motivo-modal", tabindex: "-1", "aria-hidden": "true" }, [
    el("div", { class: "modal-dialog modal-dialog-centered" }, [el("div", { class: "modal-content" }, [
      el("div", { class: "modal-header" }, [el("h2", { class: "modal-title h5", text: titulo }), el("button", { type: "button", class: "btn-close", dataset: { bsDismiss: "modal" }, "aria-label": "Fechar" })]),
      el("div", { class: "modal-body" }, [ta]),
      el("div", { class: "modal-footer" }, [
        el("button", { type: "button", class: "btn btn-outline-secondary", dataset: { bsDismiss: "modal" }, text: "Voltar" }),
        el("button", { type: "button", class: "btn btn-primary", id: "one-motivo-ok", text: "Confirmar" }),
      ]),
    ])]),
  ]);
  document.body.append(modal);
  const inst = window.bootstrap ? new window.bootstrap.Modal(modal) : null;
  modal.querySelector("#one-motivo-ok").addEventListener("click", async () => {
    const v = ta.value.trim();
    if (!opcional && !v) { ta.classList.add("is-invalid"); return; }
    if (inst) inst.hide();
    await onOk(v);
  });
  modal.addEventListener("hidden.bs.modal", () => modal.remove());
  if (inst) inst.show();
}

function renderNaoEncontrado(host, voltar) {
  host.replaceChildren(el("div", { class: "one-empty one-surface p-5" }, [
    el("i", { class: "bi bi-exclamation-circle", "aria-hidden": "true" }),
    el("p", { text: "Solicitação não encontrada." }),
    el("a", { class: "btn btn-outline-primary btn-sm", href: voltar, text: "Voltar" }),
  ]));
}
function renderSemAcesso(host, voltar) {
  host.replaceChildren(el("div", { class: "one-empty one-surface p-5" }, [
    el("i", { class: "bi bi-shield-lock", "aria-hidden": "true" }),
    el("p", { text: "Você não tem acesso a esta solicitação." }),
    el("a", { class: "btn btn-outline-primary btn-sm", href: voltar, text: "Voltar" }),
  ]));
}

function formatarData(iso) {
  try { const d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

export { badge as badgeSituacao, pedirMotivo, formatarData, renderNaoEncontrado, renderSemAcesso, cabecalhoChamado, cardDados, cardTranscricao };
