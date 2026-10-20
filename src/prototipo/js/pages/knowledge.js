/* ==========================================================================
   One — pages/knowledge.js
   Base de conhecimento. Dois modos conforme o perfil:
   - aluno/atendente: consulta pública (somente artigos PUBLISHED — BR-C2).
   - admin: lista todos os estados (DRAFT/PUBLISHED/ARCHIVED), apenas leitura
     nesta fase; a edição/publicação de artigos chega na Fase 6.
   Busca por palavra-chave + filtro por categoria. Visualização em modal.
   Construção segura via DOM (sem innerHTML de dados).
   ========================================================================== */

import { el, clear } from "../dom.js";
import { pageHead } from "../components/page-head.js";
import { STATUS_ARTIGO } from "../mock-data.js";
import { searchPublished, listCategories, carregarArtigos } from "../services/knowledge-service.js";

/** Badge de estado do artigo. */
function statusBadge(status) {
  const s = STATUS_ARTIGO[status] || { label: status, cls: "closed" };
  return el("span", { class: `one-status one-status--${s.cls}`, text: s.label });
}

/** Cartão de artigo (grade de consulta). */
function articleCard(artigo, onOpen, { showStatus = false } = {}) {
  return el("div", { class: "col-md-6 col-xl-4" }, [
    el("div", { class: "card h-100 one-kb-card" }, [
      el("div", { class: "card-body d-flex flex-column" }, [
        el("div", { class: "d-flex align-items-start gap-2 mb-2" }, [
          el("span", { class: "badge text-bg-light border", text: artigo.categoria }),
          showStatus ? statusBadge(artigo.status) : null,
        ]),
        el("h3", { class: "h6 mb-2", text: artigo.titulo }),
        el("p", { class: "text-muted-one mb-3", style: "font-size:.9rem", text: resumo(artigo.conteudo) }),
        el("div", { class: "mt-auto d-flex align-items-center justify-content-between" }, [
          el("small", { class: "text-subtle-one" }, [
            el("i", { class: "bi bi-clock-history me-1", "aria-hidden": "true" }),
            `Atualizado em ${artigo.atualizadoEm}`,
          ]),
          el("button", {
            class: "btn btn-sm btn-outline-primary", type: "button",
            on: { click: () => onOpen(artigo) },
          }, [el("i", { class: "bi bi-eye me-1", "aria-hidden": "true" }), "Ver"]),
        ]),
      ]),
    ]),
  ]);
}

/** Primeiras ~140 letras do conteúdo como resumo. */
function resumo(txt) {
  const linha = (txt || "").replace(/\n/g, " ");
  return linha.length > 140 ? linha.slice(0, 140) + "…" : linha;
}

/** Abre o artigo em um modal do Bootstrap. */
function abrirArtigo(artigo) {
  const existente = document.getElementById("one-kb-modal");
  if (existente) existente.remove();

  const corpo = el("div", {}, [
    el("div", { class: "d-flex align-items-center gap-2 mb-3 flex-wrap" }, [
      el("span", { class: "badge text-bg-light border", text: artigo.categoria }),
      statusBadge(artigo.status),
      el("small", { class: "text-subtle-one ms-auto", text: `Versão ${artigo.versao} · ${artigo.atualizadoEm}` }),
    ]),
    // Conteúdo com quebras de linha preservadas (texto seguro via textContent).
    el("div", { class: "one-kb-content" },
      (artigo.conteudo || "").split("\n").map((linha) => el("p", { class: "mb-2", text: linha }))
    ),
    (artigo.links && artigo.links.length)
      ? el("div", { class: "mt-3" }, [
          el("h4", { class: "h6 text-muted-one", text: "Links úteis" }),
          el("ul", { class: "mb-0" },
            artigo.links.map((l) => el("li", {}, [el("a", { href: l.url || "#", text: l.rotulo })]))
          ),
        ])
      : null,
  ]);

  const modal = el("div", {
    class: "modal fade", id: "one-kb-modal", tabindex: "-1",
    "aria-labelledby": "one-kb-modal-title", "aria-hidden": "true",
  }, [
    el("div", { class: "modal-dialog modal-dialog-centered modal-lg" }, [
      el("div", { class: "modal-content" }, [
        el("div", { class: "modal-header" }, [
          el("h2", { class: "modal-title h5", id: "one-kb-modal-title", text: artigo.titulo }),
          el("button", { type: "button", class: "btn-close", dataset: { bsDismiss: "modal" }, "aria-label": "Fechar" }),
        ]),
        el("div", { class: "modal-body" }, [corpo]),
        el("div", { class: "modal-footer" }, [
          el("button", { type: "button", class: "btn btn-outline-secondary", dataset: { bsDismiss: "modal" }, text: "Fechar" }),
        ]),
      ]),
    ]),
  ]);

  document.body.append(modal);
  if (window.bootstrap && window.bootstrap.Modal) {
    const inst = new window.bootstrap.Modal(modal);
    modal.addEventListener("hidden.bs.modal", () => modal.remove());
    inst.show();
  }
}

/**
 * Renderiza a base de conhecimento.
 * @param {HTMLElement} host
 * @param {object} user  sessão (define o modo: admin vê todos os estados)
 */
export async function renderKnowledge(host, user) {
  const isAdmin = user && user.role === "admin";
  const categorias = await listCategories();

  // Estado local da tela.
  const filtro = { query: "", categoria: "" };

  // Monta a estrutura fixa (cabeçalho + filtros + grade).
  const grade = el("div", { class: "row g-3", id: "one-kb-grid" });
  const contador = el("p", { class: "text-muted-one mb-3", id: "one-kb-count" });

  const inputBusca = el("input", {
    class: "form-control", type: "search", placeholder: "Buscar por palavra-chave…",
    "aria-label": "Buscar artigos",
    on: { input: (e) => { filtro.query = e.target.value; atualizar(); } },
  });

  const selectCategoria = el("select", {
    class: "form-select w-auto", "aria-label": "Filtrar por categoria",
    on: { change: (e) => { filtro.categoria = e.target.value; atualizar(); } },
  }, [
    el("option", { value: "", text: "Todas as categorias" }),
    ...categorias.map((c) => el("option", { value: c.nome, text: c.nome })),
  ]);

  async function atualizar() {
    let artigos;
    if (isAdmin) {
      // Admin: todos os estados; aplica busca/categoria manualmente.
      artigos = await carregarArtigos();
      if (filtro.categoria) artigos = artigos.filter((a) => a.categoria === filtro.categoria);
      if (filtro.query) {
        const q = filtro.query.toLowerCase();
        artigos = artigos.filter((a) =>
          (a.titulo + " " + a.conteudo + " " + (a.perguntasRelacionadas || []).join(" "))
            .toLowerCase().includes(q)
        );
      }
    } else {
      // Aluno/atendente: somente publicados (BR-C2).
      artigos = await searchPublished(filtro);
    }

    clear(grade);
    if (artigos.length === 0) {
      grade.append(el("div", { class: "col-12" }, [
        el("div", { class: "one-empty one-surface p-5" }, [
          el("i", { class: "bi bi-search", "aria-hidden": "true" }),
          el("p", { class: "mb-0", text: "Nenhum artigo encontrado para esta busca." }),
        ]),
      ]));
    } else {
      artigos.forEach((a) => grade.append(articleCard(a, abrirArtigo, { showStatus: isAdmin })));
    }

    const total = artigos.length;
    contador.textContent =
      `${total} artigo${total === 1 ? "" : "s"} ${isAdmin ? "(todos os estados)" : "publicado" + (total === 1 ? "" : "s")}`;
  }

  host.replaceChildren(
    el("div", {}, [
      pageHead("Base de conhecimento", {
        subtitle: isAdmin
          ? "Visualização de todos os artigos (rascunho, publicado e arquivado). A edição chega na Fase 6."
          : "Consulte os artigos publicados. Use a busca e os filtros para encontrar respostas.",
        actions: isAdmin ? [el("span", { class: "one-demo-badge align-self-center", text: "Visão administrativa" })] : [],
      }),
      el("div", { class: "one-filterbar" }, [
        el("div", { class: "input-group w-auto flex-grow-1" }, [
          el("span", { class: "input-group-text" }, [el("i", { class: "bi bi-search", "aria-hidden": "true" })]),
          inputBusca,
        ]),
        selectCategoria,
      ]),
      contador,
      grade,
    ])
  );

  await atualizar();
}
