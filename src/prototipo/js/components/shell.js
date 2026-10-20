/* ==========================================================================
   One — components/shell.js
   Constrói o app shell (sidebar desktop + offcanvas mobile + header + faixa de
   contexto + área de conteúdo) dentro da raiz da aplicação. Mantém referências
   aos pontos de montagem para que o app atualize apenas o necessário.
   ========================================================================== */

import { el } from "../dom.js";

const OFFCANVAS_ID = "oneSidebarOffcanvas";

/** Cria a estrutura do shell e devolve as referências de montagem. */
export function buildShell(root) {
  const sidebarDesktop = el("aside", {
    class: "one-sidebar one-sidebar--desktop",
    id: "one-sidebar-desktop",
    "aria-label": "Navegação principal",
  });

  const header = el("header", { class: "one-header", id: "one-header" });

  const content = el("main", {
    class: "one-content", id: "one-content", tabindex: "-1",
  }, [
    el("div", { class: "one-content__inner", id: "main-region" }),
  ]);

  const main = el("div", { class: "one-app__main" }, [header, content]);
  const app = el("div", { class: "one-app" }, [sidebarDesktop, main]);

  // Offcanvas (sidebar mobile).
  const offcanvasBody = el("div", {
    class: "offcanvas-body p-0 d-flex flex-column",
    id: "one-sidebar-mobile-body",
  });
  const offcanvas = el("div", {
    class: "offcanvas offcanvas-start one-sidebar",
    tabindex: "-1", id: OFFCANVAS_ID,
    "aria-label": "Navegação principal (móvel)",
  }, [
    el("div", { class: "offcanvas-header" }, [
      el("span", { class: "one-logo" }, [
        el("span", { class: "one-logo__mark", text: "O", "aria-hidden": "true" }),
        el("span", { text: "One" }),
      ]),
      el("button", {
        type: "button", class: "btn-close",
        dataset: { bsDismiss: "offcanvas" }, "aria-label": "Fechar menu",
      }),
    ]),
    offcanvasBody,
  ]);

  root.replaceChildren(app, offcanvas);

  return {
    offcanvasId: OFFCANVAS_ID,
    sidebarDesktop,
    offcanvasBody,
    header,
    content: content.querySelector("#main-region"),
    contentScroll: content,
  };
}

/** Monta um host de tela cheia (landing, login, erros sem sessão). */
export function buildFullscreen(root) {
  const host = el("div", { id: "main-region", tabindex: "-1" });
  root.replaceChildren(host);
  return host;
}
