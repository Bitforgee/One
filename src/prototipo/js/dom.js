/* ==========================================================================
   One — dom.js
   Pequenas ajudas para criar elementos com segurança (sem innerHTML de
   conteúdo dinâmico) e escapar texto. Reduz risco de injeção de HTML quando
   dados demonstrativos ou entradas do usuário são renderizados.
   ========================================================================== */

/**
 * Cria um elemento DOM.
 * @param {string} tag             nome da tag (ex.: "div", "button")
 * @param {object} [attrs]         atributos. Chaves especiais:
 *                                 - class: string de classes
 *                                 - dataset: objeto de data-*
 *                                 - on: { evento: handler }
 *                                 - text: textContent seguro
 *                                 - html: innerHTML (use SOMENTE com conteúdo
 *                                   estático e confiável; nunca com entradas
 *                                   do usuário)
 * @param {(Node|string)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === "class") {
      node.className = value;
    } else if (key === "text") {
      node.textContent = value;
    } else if (key === "html") {
      node.innerHTML = value; // apenas conteúdo estático e confiável
    } else if (key === "dataset") {
      Object.entries(value).forEach(([k, v]) => { node.dataset[k] = v; });
    } else if (key === "on") {
      Object.entries(value).forEach(([evt, fn]) => node.addEventListener(evt, fn));
    } else if (key in node && typeof value !== "object") {
      // Propriedades diretas (value, checked, disabled, etc.)
      try { node[key] = value; } catch { node.setAttribute(key, value); }
    } else {
      node.setAttribute(key, value);
    }
  }

  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Escapa texto para uso seguro em contextos de HTML (quando inevitável). */
export function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

/** Remove todos os filhos de um elemento. */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Atalho de querySelector no documento ou em um escopo. */
export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

/** Atalho de querySelectorAll que retorna um array. */
export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}
