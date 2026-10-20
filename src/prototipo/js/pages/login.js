/* ==========================================================================
   One — pages/login.js
   Login demonstrativo: seleção de perfil (Aluno, Atendente, Administrador).
   NÃO há autenticação real, senha ou credencial. Ao escolher um perfil, a
   sessão demonstrativa é criada e o usuário vai ao painel correspondente.
   Renderiza em tela cheia (fora do app shell).
   ========================================================================== */

import { el } from "../dom.js";
import { login, DEMO_USERS } from "../state.js";
import { navigate } from "../router.js";
import { HOME_ROUTE_BY_ROLE } from "../nav-config.js";
import { showToast } from "../components/toast.js";

const PROFILES = [
  {
    role: "aluno",
    icon: "bi-mortarboard",
    title: "Aluno",
    desc: "Conversa com o assistente, consulta a base e acompanha solicitações.",
  },
  {
    role: "atendente",
    icon: "bi-headset",
    title: "Atendente",
    desc: "Atende a fila do setor, responde, encaminha e resolve chamados.",
  },
  {
    role: "admin",
    icon: "bi-shield-lock",
    title: "Administrador",
    desc: "Acompanha indicadores e gerencia a configuração do sistema.",
  },
];

/** Cartão de seleção de um perfil. */
function profileCard(p) {
  const user = DEMO_USERS[p.role];
  const enter = () => {
    login(p.role);
    showToast(`Acesso demonstrativo como ${user.name} (${p.title}).`, { variant: "success" });
    navigate(HOME_ROUTE_BY_ROLE[p.role] || "#/");
  };

  const card = el("button", {
    class: `card one-login__card one-login__card--${p.role} h-100 text-start`,
    type: "button",
    "aria-label": `Entrar como ${p.title}`,
    on: { click: enter },
  }, [
    el("div", { class: "card-body d-flex flex-column" }, [
      el("div", { class: "one-login__icon" }, [el("i", { class: `bi ${p.icon}`, "aria-hidden": "true" })]),
      el("h2", { class: "h5 mt-3 mb-1", text: p.title }),
      el("p", { class: "text-muted-one", style: "font-size:.9rem", text: p.desc }),
      el("div", { class: "mt-auto pt-2 d-flex align-items-center gap-2" }, [
        el("span", { class: "one-avatar one-avatar--sm", text: initials(user.name), "aria-hidden": "true" }),
        el("span", { class: "text-muted-one", style: "font-size:.85rem", text: user.name }),
        el("i", { class: "bi bi-arrow-right ms-auto", "aria-hidden": "true" }),
      ]),
    ]),
  ]);
  return card;
}

function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("");
}

/**
 * Renderiza a tela de login em um host de tela cheia.
 * @param {HTMLElement} host
 */
export function renderLogin(host) {
  host.replaceChildren(
    el("main", { class: "one-login" }, [
      el("div", { class: "one-login__panel" }, [
        el("div", { class: "d-flex justify-content-between align-items-center mb-4" }, [
          el("a", { class: "one-logo", href: "#/" }, [
            el("span", { class: "one-logo__mark", text: "O", "aria-hidden": "true" }),
            el("span", { text: "One" }),
          ]),
          el("button", {
            class: "btn btn-outline-secondary one-theme-toggle",
            type: "button",
            "aria-label": "Alternar tema claro/escuro",
            title: "Alternar tema",
            dataset: { oneThemeToggle: "1" },
          }, [el("i", { class: "bi bi-moon-stars-fill", "aria-hidden": "true" })]),
        ]),

        el("span", { class: "one-demo-badge mb-2 d-inline-block", text: "Login demonstrativo" }),
        el("h1", { class: "h3 mb-1", text: "Escolha um perfil para entrar" }),
        el("p", { class: "text-muted-one", text: "Nenhuma senha é necessária. A seleção apenas simula o acesso de cada perfil no protótipo." }),

        el("div", { class: "row g-3 mt-1" },
          PROFILES.map((p) => el("div", { class: "col-md-4" }, [profileCard(p)]))
        ),

        el("div", { class: "one-login__notice mt-4" }, [
          el("i", { class: "bi bi-info-circle me-2", "aria-hidden": "true" }),
          "Protótipo visual: as permissões por perfil são simuladas no navegador e não constituem segurança real.",
        ]),

        el("div", { class: "mt-3" }, [
          el("a", { class: "text-decoration-none", href: "#/" }, [
            el("i", { class: "bi bi-arrow-left me-1", "aria-hidden": "true" }), "Voltar à página inicial",
          ]),
        ]),
      ]),
    ])
  );
}
