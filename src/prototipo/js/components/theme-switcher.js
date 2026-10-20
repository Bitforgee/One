/* ==========================================================================
   One — theme-switcher.js
   Alterna entre tema claro e escuro usando o atributo nativo do Bootstrap
   (data-bs-theme) no elemento <html>. A preferência é persistida e, na
   primeira visita, segue a preferência do sistema (prefers-color-scheme).
   ========================================================================== */

import { read, write } from "../storage.js";

const STORAGE_KEY = "theme";
const THEMES = ["light", "dark"];

/** Lê a preferência salva ou, na ausência, a do sistema operacional. */
function resolveInitialTheme() {
  // Override opcional por query (?theme=dark) — útil para demonstração e capturas.
  try {
    const q = new URLSearchParams(window.location.search).get("theme");
    if (THEMES.includes(q)) return q;
  } catch { /* ignora */ }

  const saved = read(STORAGE_KEY);
  if (THEMES.includes(saved)) return saved;
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

/** Aplica o tema ao documento. */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
  document.documentElement.dataset.oneTheme = theme;
}

/** Retorna o tema atualmente aplicado. */
export function getTheme() {
  return document.documentElement.getAttribute("data-bs-theme") || "light";
}

/** Define o tema explicitamente e persiste. */
export function setTheme(theme) {
  const next = THEMES.includes(theme) ? theme : "light";
  applyTheme(next);
  write(STORAGE_KEY, next);
  updateToggleButtons(next);
  window.dispatchEvent(new CustomEvent("one:theme-change", { detail: { theme: next } }));
}

/** Alterna entre claro e escuro. */
export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

/** Atualiza a aparência (ícone + rótulo acessível) de todos os botões de tema. */
function updateToggleButtons(theme) {
  const isDark = theme === "dark";
  document.querySelectorAll("[data-one-theme-toggle]").forEach((btn) => {
    const icon = btn.querySelector(".bi");
    if (icon) {
      icon.classList.remove("bi-sun-fill", "bi-moon-stars-fill");
      icon.classList.add(isDark ? "bi-sun-fill" : "bi-moon-stars-fill");
    }
    const label = isDark ? "Ativar tema claro" : "Ativar tema escuro";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
    btn.setAttribute("aria-pressed", String(isDark));
  });
}

/**
 * Inicializa o tema o quanto antes (chamado no <head> para evitar "flash")
 * e liga os cliques dos botões marcados com [data-one-theme-toggle].
 */
export function initTheme() {
  applyTheme(resolveInitialTheme());

  // Delegação de evento no documento: funciona para botões de tema criados
  // dinamicamente (header, landing, login) em qualquer momento, sem precisar
  // religar a cada re-render. Usa document.documentElement como marcador para
  // ser seguro mesmo se initTheme() rodar no <head> (quando body ainda é null).
  if (!document.documentElement.dataset.oneThemeDelegated) {
    document.documentElement.dataset.oneThemeDelegated = "1";
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-one-theme-toggle]");
      if (btn) { ev.preventDefault(); toggleTheme(); }
    });
  }

  const sync = () => updateToggleButtons(getTheme());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync);
  else sync();
}

/** Aplicação imediata do tema salvo, sem esperar o DOM (anti-flash). */
export function applySavedThemeEarly() {
  applyTheme(resolveInitialTheme());
}
