/* ==========================================================================
   One — toast.js
   Feedback efêmero usando o componente Toast do Bootstrap. Cria um container
   fixo (uma única vez) e empilha notificações acessíveis (aria-live).
   ========================================================================== */

import { el } from "../dom.js";

const CONTAINER_ID = "one-toast-container";

const VARIANTS = {
  success: { icon: "bi-check-circle-fill", color: "var(--one-success)" },
  danger: { icon: "bi-exclamation-octagon-fill", color: "var(--one-danger)" },
  warning: { icon: "bi-exclamation-triangle-fill", color: "var(--one-warning)" },
  info: { icon: "bi-info-circle-fill", color: "var(--one-info)" },
};

function ensureContainer() {
  let c = document.getElementById(CONTAINER_ID);
  if (!c) {
    c = el("div", {
      id: CONTAINER_ID,
      class: "toast-container position-fixed bottom-0 end-0 p-3",
      style: "z-index:1090",
    });
    document.body.append(c);
  }
  return c;
}

/**
 * Exibe um toast.
 * @param {string} message
 * @param {object} [opts]
 * @param {"success"|"danger"|"warning"|"info"} [opts.variant="info"]
 * @param {string} [opts.title]
 * @param {number} [opts.delay=4000]
 */
export function showToast(message, { variant = "info", title, delay = 4000 } = {}) {
  const container = ensureContainer();
  const v = VARIANTS[variant] || VARIANTS.info;
  const isError = variant === "danger" || variant === "warning";

  const toast = el("div", {
    class: "toast",
    role: isError ? "alert" : "status",
    "aria-live": isError ? "assertive" : "polite",
    "aria-atomic": "true",
  }, [
    el("div", { class: "toast-body d-flex align-items-start gap-2" }, [
      el("i", { class: `bi ${v.icon}`, "aria-hidden": "true", style: `color:${v.color};font-size:1.1rem` }),
      el("div", { class: "flex-grow-1" }, [
        title ? el("div", { class: "fw-semibold", text: title }) : null,
        el("div", { text: message }),
      ]),
      el("button", {
        class: "btn-close ms-2",
        type: "button",
        "aria-label": "Fechar",
        dataset: { bsDismiss: "toast" },
      }),
    ]),
  ]);

  container.append(toast);

  // bootstrap é global (carregado via bundle). Fallback: remove manualmente.
  if (window.bootstrap && window.bootstrap.Toast) {
    const inst = new window.bootstrap.Toast(toast, { delay });
    toast.addEventListener("hidden.bs.toast", () => toast.remove());
    inst.show();
  } else {
    setTimeout(() => toast.remove(), delay);
    toast.classList.add("show");
  }
}
