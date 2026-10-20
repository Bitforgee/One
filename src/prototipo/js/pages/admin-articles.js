/* ==========================================================================
   One — pages/admin-articles.js
   Fase 6 — Gestão da base de conhecimento (apenas Admin — BR-C3).
   Operações: criar, editar, publicar e arquivar artigos. Editar um artigo
   publicado cria uma nova versão (BR-C5). Somente PUBLISHED alimenta o
   assistente e a consulta pública (BR-C2).
   ========================================================================== */

import { el, clear } from "../dom.js";
import { showToast } from "../components/toast.js";
import { buildTable } from "../components/table.js";
import { pageHead } from "../components/page-head.js";
import { STATUS_ARTIGO, getCategorias } from "../mock-data.js";
import * as kb from "../services/knowledge-service.js";

function badge(status) { const s = STATUS_ARTIGO[status] || { label: status, cls: "closed" }; return el("span", { class: `one-status one-status--${s.cls}`, text: s.label }); }

export async function renderAdminArticles(host, user) {
  const categorias = await getCategorias();
  const tabelaBox = el("div", { id: "one-admin-artigos" });

  async function atualizar() {
    const arts = await kb.carregarArtigos();
    clear(tabelaBox);
    tabelaBox.append(buildTable({
      caption: "Artigos da base de conhecimento",
      columns: [
        { key: "id", label: "ID", render: (r) => el("span", { class: "fw-semibold", text: `${r.id} v${r.versao}` }) },
        { key: "titulo", label: "Título" },
        { key: "categoria", label: "Categoria", className: "text-muted-one" },
        { key: "status", label: "Status", render: (r) => badge(r.status) },
        { key: "atualizadoEm", label: "Atualização", className: "text-muted-one" },
        { key: "acoes", label: "Ações", render: (r) => acoes(r) },
      ],
      rows: arts,
      emptyText: "Nenhum artigo cadastrado.",
    }));
  }

  function acoes(a) {
    const grupo = el("div", { class: "btn-group", role: "group", "aria-label": `Ações do artigo ${a.id}` });
    grupo.append(el("button", { class: "btn btn-sm btn-outline-secondary", type: "button", title: "Editar", "aria-label": "Editar", on: { click: () => abrirForm(a) } }, [el("i", { class: "bi bi-pencil", "aria-hidden": "true" })]));
    if (a.status !== "PUBLISHED") {
      grupo.append(el("button", { class: "btn btn-sm btn-outline-success", type: "button", title: "Publicar", "aria-label": "Publicar", on: { click: async () => { await kb.definirStatusArtigo(a.id, "PUBLISHED", user.name); showToast(`"${a.titulo}" publicado.`, { variant: "success" }); atualizar(); } } }, [el("i", { class: "bi bi-check2-circle", "aria-hidden": "true" })]));
    }
    if (a.status !== "ARCHIVED") {
      grupo.append(el("button", { class: "btn btn-sm btn-outline-warning", type: "button", title: "Arquivar", "aria-label": "Arquivar", on: { click: async () => { await kb.definirStatusArtigo(a.id, "ARCHIVED", user.name); showToast(`"${a.titulo}" arquivado.`, { variant: "info" }); atualizar(); } } }, [el("i", { class: "bi bi-archive", "aria-hidden": "true" })]));
    }
    if (a.status === "ARCHIVED") {
      grupo.append(el("button", { class: "btn btn-sm btn-outline-secondary", type: "button", title: "Voltar a rascunho", "aria-label": "Voltar a rascunho", on: { click: async () => { await kb.definirStatusArtigo(a.id, "DRAFT", user.name); showToast("Artigo voltou a rascunho.", { variant: "info" }); atualizar(); } } }, [el("i", { class: "bi bi-arrow-counterclockwise", "aria-hidden": "true" })]));
    }
    return grupo;
  }

  /** Formulário de criação/edição em modal. */
  function abrirForm(artigo) {
    const editando = !!artigo;
    const antigo = document.getElementById("one-art-modal");
    if (antigo) antigo.remove();

    const fTitulo = el("input", { class: "form-control", type: "text", value: editando ? artigo.titulo : "", maxlength: "120" });
    const fCategoria = el("select", { class: "form-select" }, categorias.map((c) => el("option", { value: c.nome, text: c.nome, selected: editando && artigo.categoria === c.nome })));
    const fPerguntas = el("textarea", { class: "form-control", rows: "2", value: editando ? (artigo.perguntasRelacionadas || []).join("\n") : "", placeholder: "Uma pergunta por linha" });
    const fConteudo = el("textarea", { class: "form-control", rows: "5", value: editando ? artigo.conteudo : "" });

    const modal = el("div", { class: "modal fade", id: "one-art-modal", tabindex: "-1", "aria-hidden": "true" }, [
      el("div", { class: "modal-dialog modal-dialog-centered modal-lg" }, [el("div", { class: "modal-content" }, [
        el("div", { class: "modal-header" }, [
          el("h2", { class: "modal-title h5", text: editando ? `Editar ${artigo.id}` : "Novo artigo" }),
          el("button", { type: "button", class: "btn-close", dataset: { bsDismiss: "modal" }, "aria-label": "Fechar" }),
        ]),
        el("div", { class: "modal-body" }, [
          editando && artigo.status === "PUBLISHED" ? el("div", { class: "alert alert-info py-2", role: "status", text: "Editar um artigo publicado cria uma nova versão (BR-C5)." }) : null,
          el("div", { class: "mb-3" }, [el("label", { class: "form-label", text: "Título" }), fTitulo]),
          el("div", { class: "mb-3" }, [el("label", { class: "form-label", text: "Categoria" }), fCategoria]),
          el("div", { class: "mb-3" }, [el("label", { class: "form-label", text: "Perguntas relacionadas" }), fPerguntas]),
          el("div", { class: "mb-1" }, [el("label", { class: "form-label", text: "Conteúdo" }), fConteudo]),
        ]),
        el("div", { class: "modal-footer" }, [
          el("button", { type: "button", class: "btn btn-outline-secondary", dataset: { bsDismiss: "modal" }, text: "Cancelar" }),
          el("button", { type: "button", class: "btn btn-primary", id: "one-art-ok", text: editando ? "Salvar" : "Criar rascunho" }),
        ]),
      ])]),
    ]);
    document.body.append(modal);
    const inst = window.bootstrap ? new window.bootstrap.Modal(modal) : null;
    modal.querySelector("#one-art-ok").addEventListener("click", async () => {
      const titulo = fTitulo.value.trim();
      if (!titulo) { fTitulo.classList.add("is-invalid"); return; }
      const perguntas = fPerguntas.value.split("\n").map((s) => s.trim()).filter(Boolean);
      const campos = { titulo, categoria: fCategoria.value, conteudo: fConteudo.value, perguntasRelacionadas: perguntas };
      if (editando) { await kb.editarArtigo(artigo.id, campos, user.name); showToast("Artigo atualizado.", { variant: "success" }); }
      else { await kb.criarArtigo(campos, user.name); showToast("Rascunho criado.", { variant: "success" }); }
      if (inst) inst.hide();
      atualizar();
    });
    modal.addEventListener("hidden.bs.modal", () => modal.remove());
    if (inst) inst.show();
  }

  const btnNovo = el("button", { class: "btn btn-primary", type: "button", on: { click: () => abrirForm(null) } }, [el("i", { class: "bi bi-plus-circle me-2", "aria-hidden": "true" }), "Novo artigo"]);

  host.replaceChildren(
    el("div", {}, [
      pageHead("Base de conhecimento — gestão", {
        subtitle: "Crie, edite, publique e arquive artigos. Apenas artigos publicados alimentam o assistente.",
        actions: [btnNovo],
      }),
      el("div", { class: "card" }, [el("div", { class: "card-body p-0" }, [tabelaBox])]),
    ])
  );
  await atualizar();
}
