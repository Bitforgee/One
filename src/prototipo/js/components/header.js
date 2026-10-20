/* ==========================================================================
   One — header.js
   Cabeçalho da aplicação: botão de menu (mobile), título da página,
   breadcrumb opcional, chip de perfil, alternância de tema e menu de usuário.
   Fase 1: estrutura e controles; conteúdo contextual chega com as páginas.
   ========================================================================== */

import { el } from "../dom.js";
import { ROLES } from "../nav-config.js";

/**
 * Monta o header dentro de um container.
 * @param {HTMLElement} container
 * @param {object} opts
 * @param {string} opts.title          título da página
 * @param {{label:string, route?:string}[]} [opts.breadcrumb]
 * @param {object} opts.user           { name, role }
 * @param {string} opts.offcanvasId    id do offcanvas da sidebar (mobile)
 */
export function renderHeader(container, { title, breadcrumb = [], user, offcanvasId }) {
  const role = ROLES[user.role] || ROLES.aluno;

  // Botão de abrir a sidebar no mobile (dispara o Offcanvas do Bootstrap).
  const toggle = el("button", {
    class: "btn btn-sm btn-outline-secondary one-header__toggle",
    type: "button",
    "aria-label": "Abrir menu de navegação",
    dataset: { bsToggle: "offcanvas", bsTarget: "#" + offcanvasId },
    "aria-controls": offcanvasId,
  }, [el("i", { class: "bi bi-list", "aria-hidden": "true" })]);

  // Título + breadcrumb.
  const titleBlock = el("div", { class: "flex-grow-1", style: "min-width:0" }, [
    breadcrumb.length
      ? buildBreadcrumb(breadcrumb)
      : null,
    el("h1", {
      class: "one-header__page-title h4 mb-0 text-truncate",
      text: title,
    }),
  ]);

  // Alternância de tema.
  const themeBtn = el("button", {
    class: "btn btn-sm btn-outline-secondary one-theme-toggle",
    type: "button",
    "aria-label": "Alternar tema claro/escuro",
    title: "Alternar tema",
    dataset: { oneThemeToggle: "1" },
  }, [el("i", { class: "bi bi-moon-stars-fill", "aria-hidden": "true" })]);

  // Chip de perfil.
  const chip = el("span", { class: `one-role-chip ${role.chipClass} d-none d-sm-inline-flex` }, [
    el("i", { class: "bi bi-person-badge", "aria-hidden": "true" }),
    el("span", { text: role.label }),
  ]);

  // Menu de usuário.
  const userMenu = buildUserMenu(user);

  const actions = el("div", {
    class: "one-header__actions d-flex align-items-center gap-1",
  }, [chip, themeBtn, userMenu]);

  container.replaceChildren(toggle, titleBlock, actions);
}

/** Breadcrumb acessível com <nav aria-label>. */
function buildBreadcrumb(items) {
  const ol = el("ol", { class: "breadcrumb" },
    items.map((item, idx) => {
      const isLast = idx === items.length - 1;
      return el("li", {
        class: "breadcrumb-item" + (isLast ? " active" : ""),
        "aria-current": isLast ? "page" : null,
      }, [
        isLast || !item.route
          ? el("span", { text: item.label })
          : el("a", { href: item.route, text: item.label }),
      ]);
    })
  );
  return el("nav", { "aria-label": "Trilha de navegação" }, [ol]);
}

/** Menu suspenso do usuário (dropdown do Bootstrap). */
function buildUserMenu(user) {
  const initials = (user.name || "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("");

  const trigger = el("button", {
    class: "btn btn-sm btn-outline-secondary d-flex align-items-center gap-2",
    type: "button",
    dataset: { bsToggle: "dropdown" },
    "aria-expanded": "false",
    "aria-label": `Menu do usuário ${user.name}`,
  }, [
    el("span", { class: "one-avatar one-avatar--sm", text: initials, "aria-hidden": "true" }),
    el("i", { class: "bi bi-chevron-down d-none d-md-inline", "aria-hidden": "true", style: "font-size:.7rem" }),
  ]);

  const menu = el("ul", { class: "dropdown-menu dropdown-menu-end" }, [
    el("li", {}, [el("h6", { class: "dropdown-header", text: user.name })]),
    el("li", {}, [el("hr", { class: "dropdown-divider" })]),
    el("li", {}, [
      el("button", {
        class: "dropdown-item",
        type: "button",
        dataset: { oneResetDemo: "1" },
      }, [
        el("i", { class: "bi bi-arrow-counterclockwise me-2", "aria-hidden": "true" }),
        "Restaurar dados demonstrativos",
      ]),
    ]),
    el("li", {}, [
      el("button", {
        class: "dropdown-item",
        type: "button",
        dataset: { oneLogout: "1" },
      }, [
        el("i", { class: "bi bi-box-arrow-right me-2", "aria-hidden": "true" }),
        "Sair (demonstrativo)",
      ]),
    ]),
  ]);

  return el("div", { class: "dropdown" }, [trigger, menu]);
}
