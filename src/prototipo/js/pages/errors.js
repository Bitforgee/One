/* ==========================================================================
   One — pages/errors.js
   Páginas de erro de navegação: 404 (rota inexistente) e 403 (acesso não
   autorizado para o perfil atual). Renderizam dentro do app shell quando há
   sessão, ou em tela cheia quando não há.
   ========================================================================== */

import { el } from "../dom.js";
import { navigate } from "../router.js";

function errorBlock({ icon, code, title, message, primary }) {
  return el("div", { class: "one-error" }, [
    el("div", { class: "one-error__icon" }, [el("i", { class: `bi ${icon}`, "aria-hidden": "true" })]),
    el("p", { class: "one-error__code", text: code }),
    el("h1", { class: "one-error__title", text: title }),
    el("p", { class: "one-error__message", text: message }),
    el("div", { class: "d-flex gap-2 justify-content-center flex-wrap mt-3" }, [
      el("button", {
        class: "btn btn-primary", type: "button",
        on: { click: primary.onClick },
      }, [el("i", { class: `bi ${primary.icon} me-2`, "aria-hidden": "true" }), primary.label]),
    ]),
  ]);
}

/** Página 404 — rota inexistente. */
export function renderNotFound(host, { home = "#/" } = {}) {
  host.replaceChildren(
    errorBlock({
      icon: "bi-compass",
      code: "404",
      title: "Página não encontrada",
      message: "O endereço acessado não existe neste protótipo.",
      primary: { icon: "bi-house-door", label: "Voltar ao início", onClick: () => navigate(home) },
    })
  );
}

/** Página 403 — acesso não autorizado para o perfil atual. */
export function renderForbidden(host, { home = "#/", roleLabel } = {}) {
  const msg = roleLabel
    ? `O perfil "${roleLabel}" não tem acesso a esta página no protótipo.`
    : "Seu perfil não tem acesso a esta página no protótipo.";
  host.replaceChildren(
    errorBlock({
      icon: "bi-shield-lock",
      code: "403",
      title: "Acesso não autorizado",
      message: msg,
      primary: { icon: "bi-house-door", label: "Ir para o meu painel", onClick: () => navigate(home) },
    })
  );
}
