/* ==========================================================================
   One — components/page-head.js
   Cabeçalho de página padrão (padrão GLPI): título + ações numa faixa, com
   subtítulo opcional. Usado pelas páginas do shell (as="h2", pois o <h1> já
   vive no header global) e pelos hosts de tela cheia (as="h1").
   Markup aditivo via el(); nenhum dado dinâmico vai para innerHTML.
   ========================================================================== */

import { el } from "../dom.js";

/**
 * Monta o cabeçalho de página padrão.
 * @param {string} title                 título da página
 * @param {object} [opts]
 * @param {string} [opts.subtitle]       linha secundária opcional
 * @param {Node[]} [opts.actions]        botões/links de ação (à direita)
 * @param {"h1"|"h2"} [opts.as="h2"]     nível de heading do título
 * @returns {HTMLElement}
 */
export function pageHead(title, { subtitle, actions = [], as = "h2" } = {}) {
  return el("header", { class: "one-page-head" }, [
    el("div", { class: "one-page-head__text" }, [
      el(as, { class: "one-page-head__title h4 mb-0", text: title }),
      subtitle ? el("p", { class: "one-page-head__subtitle", text: subtitle }) : null,
    ]),
    actions.length ? el("div", { class: "one-page-head__actions d-flex gap-2 flex-wrap" }, actions) : null,
  ]);
}
