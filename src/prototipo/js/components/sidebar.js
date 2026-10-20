/* ==========================================================================
   One — sidebar.js
   Monta a navegação lateral por perfil. No desktop é fixa; no mobile o mesmo
   conteúdo é reaproveitado dentro de um Offcanvas do Bootstrap.
   Fase 1: estrutura, marca, itens, estado ativo e identificação do usuário.
   Padrão GLPI: grupos com divisores, item ativo com barra à esquerda e um
   botão de recolher/expandir (desktop) com preferência persistida.
   ========================================================================== */

import { el } from "../dom.js";
import { read, write } from "../storage.js";
import { NAV_BY_ROLE, SYSTEM_ITEMS, ROLES } from "../nav-config.js";

/* Chave de preferência do recolhimento (storage.js já prefixa "one.proto."). */
const COLLAPSE_KEY = "sidebar-collapsed";

/** Lê a preferência de recolhimento. Só "1" conta como recolhido. */
function isCollapsedPref() {
  return read(COLLAPSE_KEY, "0") === "1";
}

/** Marca do One (logotipo textual com símbolo). */
function brand() {
  return el("div", { class: "one-sidebar__brand" }, [
    el("span", { class: "one-logo__mark", text: "O", "aria-hidden": "true" }),
    el("span", { class: "one-logo" }, [
      el("span", { text: "One" }),
    ]),
  ]);
}

/** Um link de navegação. */
function navLink(item, activeId, onNavigate) {
  const isActive = item.id === activeId;
  const link = el("a", {
    class: "one-sidebar__link" + (isActive ? " is-active" : ""),
    // Itens indisponíveis não navegam de fato: href="#" + tratamento no clique.
    href: item.phase2 ? "#" : item.route,
    dataset: { navId: item.id, phase2: item.phase2 ? "1" : "0" },
    "aria-current": isActive ? "page" : null,
    "aria-disabled": item.phase2 ? "true" : null,
  }, [
    el("i", { class: `bi ${item.icon}`, "aria-hidden": "true" }),
    el("span", { class: "one-sidebar__link-label", text: item.label }),
    item.phase2 ? el("i", {
      class: "bi bi-lock-fill ms-auto",
      "aria-hidden": "true",
      title: "Disponível em fase posterior",
      style: "font-size:.75rem;opacity:.5",
    }) : null,
  ]);

  link.addEventListener("click", (ev) => {
    if (typeof onNavigate === "function") onNavigate(ev, item);
  });
  return link;
}

/** Uma seção de navegação (título + itens). Divisor acima quando não for a 1ª. */
function navGroup(group, activeId, onNavigate, withDivider) {
  return el("div", {}, [
    withDivider ? el("hr", { class: "one-sidebar__divider" }) : null,
    el("div", { class: "one-sidebar__section", text: group.title }),
    el("ul", { class: "one-sidebar__nav" },
      group.items.map((item) =>
        el("li", {}, [navLink(item, activeId, onNavigate)])
      )
    ),
  ]);
}

/** Bloco de identificação do usuário + saída demonstrativa. */
function userBlock(user) {
  const role = ROLES[user.role] || ROLES.aluno;
  const initials = (user.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return el("div", { class: "one-sidebar__user" }, [
    el("span", { class: "one-avatar", text: initials, "aria-hidden": "true" }),
    el("div", { class: "flex-grow-1", style: "min-width:0" }, [
      el("div", {
        class: "one-sidebar__user-name text-truncate",
        text: user.name,
      }),
      el("div", {
        class: "one-sidebar__user-role text-truncate",
        text: role.label,
      }),
    ]),
    el("button", {
      class: "btn btn-sm btn-link text-decoration-none p-1",
      style: "color:var(--one-sidebar-text)",
      type: "button",
      title: "Sair (demonstrativo)",
      "aria-label": "Sair (demonstrativo)",
      dataset: { oneLogout: "1" },
    }, [el("i", { class: "bi bi-box-arrow-right", "aria-hidden": "true" })]),
  ]);
}

/** Botão de recolher/expandir (desktop). Oculto no offcanvas via CSS. */
function collapseButton() {
  const collapsed = isCollapsedPref();
  const btn = el("button", {
    class: "one-sidebar__collapse btn btn-sm btn-link text-decoration-none",
    type: "button",
    "aria-expanded": collapsed ? "false" : "true",
    "aria-label": collapsed ? "Expandir menu" : "Recolher menu",
    title: collapsed ? "Expandir menu" : "Recolher menu",
  }, [
    el("i", {
      class: "bi " + (collapsed ? "bi-chevron-double-right" : "bi-chevron-double-left"),
      "aria-hidden": "true",
    }),
  ]);

  btn.addEventListener("click", () => {
    const next = !isCollapsedPref();
    write(COLLAPSE_KEY, next ? "1" : "0");
    applyCollapsed(next);
  });
  return btn;
}

/**
 * Aplica/remove o estado recolhido no desktop:
 * - alterna is-collapsed na aside e data-sidebar-collapsed="1" na .one-app;
 * - atualiza o botão de recolher (aria/título/ícone);
 * - quando recolhido, cada link ganha title/aria-label e o rótulo vira aria-hidden.
 * Seguro no offcanvas: se não houver .one-app ancestral, só atualiza os links.
 * @param {boolean} collapsed
 */
export function applyCollapsed(collapsed) {
  const app = document.querySelector(".one-app");
  if (app) {
    if (collapsed) app.setAttribute("data-sidebar-collapsed", "1");
    else app.removeAttribute("data-sidebar-collapsed");
  }

  const aside = document.querySelector(".one-sidebar--desktop");
  if (aside) aside.classList.toggle("is-collapsed", collapsed);

  const btn = document.querySelector(".one-sidebar--desktop .one-sidebar__collapse");
  if (btn) {
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    btn.setAttribute("aria-label", collapsed ? "Expandir menu" : "Recolher menu");
    btn.setAttribute("title", collapsed ? "Expandir menu" : "Recolher menu");
    const icon = btn.querySelector("i");
    if (icon) {
      icon.className = "bi " + (collapsed ? "bi-chevron-double-right" : "bi-chevron-double-left");
    }
  }

  // Nome acessível + tooltip nos links quando recolhido (só na sidebar desktop).
  if (aside) {
    aside.querySelectorAll(".one-sidebar__link").forEach((link) => {
      const label = link.querySelector(".one-sidebar__link-label");
      const texto = label ? label.textContent : "";
      if (collapsed) {
        link.setAttribute("title", texto);
        link.setAttribute("aria-label", texto);
        if (label) label.setAttribute("aria-hidden", "true");
      } else {
        link.removeAttribute("title");
        link.removeAttribute("aria-label");
        if (label) label.removeAttribute("aria-hidden");
      }
    });
  }
}

/**
 * Constrói o conteúdo interno da sidebar (reutilizado no desktop e no offcanvas).
 * @param {object} opts
 * @param {string} opts.role       perfil atual
 * @param {object} opts.user       { name, role }
 * @param {string} [opts.activeId] id do item ativo
 * @param {function} [opts.onNavigate]
 * @returns {DocumentFragment}
 */
export function buildSidebarContent({ role, user, activeId, onNavigate }) {
  const frag = document.createDocumentFragment();
  frag.append(brand());

  const groups = NAV_BY_ROLE[role] || [];
  groups.forEach((g, i) => frag.append(navGroup(g, activeId, onNavigate, i > 0)));

  frag.append(el("div", { class: "one-sidebar__spacer" }));

  // Grupo "Sistema" (itens globais do rodapé). Só é renderizado quando há itens;
  // vazio, não deixa divisor/título/lista órfãos na sidebar.
  if (SYSTEM_ITEMS.length) {
    frag.append(navGroup({ title: "Sistema", items: SYSTEM_ITEMS }, activeId, onNavigate, true));
  }

  frag.append(userBlock(user));
  frag.append(collapseButton());
  return frag;
}

/**
 * Renderiza a sidebar fixa do desktop dentro de um container.
 * Relê a preferência de recolhimento a cada render (persiste entre páginas).
 * @param {HTMLElement} container
 * @param {object} opts  (ver buildSidebarContent)
 */
export function renderDesktopSidebar(container, opts) {
  container.replaceChildren(buildSidebarContent(opts));
  applyCollapsed(isCollapsedPref());
}

/**
 * Renderiza o conteúdo da sidebar dentro do corpo de um Offcanvas (mobile).
 * @param {HTMLElement} offcanvasBody
 * @param {object} opts
 */
export function renderMobileSidebar(offcanvasBody, opts) {
  offcanvasBody.replaceChildren(buildSidebarContent(opts));
}
