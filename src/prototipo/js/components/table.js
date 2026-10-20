/* ==========================================================================
   One — components/table.js
   Tabela reutilizável sobre o Bootstrap (table + table-responsive), inspirada
   nas listas de chamados do GLPI. Construção segura via DOM (sem innerHTML de
   dados). Cada coluna define como extrair/renderizar sua célula.
   ========================================================================== */

import { el } from "../dom.js";

/**
 * @typedef {Object} Column
 * @property {string} key              chave do campo na linha
 * @property {string} label            cabeçalho da coluna
 * @property {(row:object)=>(Node|string)} [render] renderização customizada
 * @property {string} [className]      classes extras da célula
 */

/**
 * Cria uma tabela responsiva.
 * @param {object} opts
 * @param {Column[]} opts.columns
 * @param {object[]} opts.rows
 * @param {string}   [opts.emptyText="Nenhum registro."]
 * @param {boolean}  [opts.hover=true]
 * @param {boolean}  [opts.striped=true] linhas zebradas (table-striped), padrão das listas
 * @param {string}   [opts.caption]    legenda acessível (visualmente oculta)
 * @returns {HTMLElement} wrapper .table-responsive
 */
export function buildTable({ columns, rows, emptyText = "Nenhum registro.", hover = true, striped = true, caption }) {
  const thead = el("thead", {}, [
    el("tr", {}, columns.map((c) => el("th", { scope: "col", text: c.label }))),
  ]);

  let tbody;
  if (!rows || rows.length === 0) {
    tbody = el("tbody", {}, [
      el("tr", {}, [
        el("td", { colspan: String(columns.length), class: "text-center text-muted-one py-4", text: emptyText }),
      ]),
    ]);
  } else {
    tbody = el("tbody", {}, rows.map((row) =>
      el("tr", {}, columns.map((c) => {
        const content = typeof c.render === "function"
          ? c.render(row)
          : document.createTextNode(row[c.key] == null ? "" : String(row[c.key]));
        return el("td", { class: c.className || null }, [content]);
      }))
    ));
  }

  const table = el("table", {
    class: "table align-middle mb-0" + (hover ? " table-hover" : "") + (striped ? " table-striped" : ""),
  }, [
    caption ? el("caption", { class: "visually-hidden", text: caption }) : null,
    thead,
    tbody,
  ]);

  return el("div", { class: "table-responsive" }, [table]);
}

/** Badge de situação do chamado (reaproveita as classes one-status--*). */
export function situacaoBadge(cls, label) {
  return el("span", { class: `one-status one-status--${cls}`, text: label });
}
