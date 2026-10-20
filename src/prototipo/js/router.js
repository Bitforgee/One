/* ==========================================================================
   One — router.js
   Roteador por hash (#/rota) em JavaScript Vanilla. Suporta:
   - registro de rotas com guardas de acesso (por perfil);
   - parâmetros simples de rota (ex.: #/aluno/solicitacoes/:id);
   - rota 404 (inexistente) e redirecionamento para 403 (não autorizado);
   - navegação programática e eventos de mudança de rota.
   Não depende de backend nem de History API (funciona em file:// e estático).
   ========================================================================== */

const routes = [];
let notFoundHandler = null;
let guard = null; // função (route) => true | "forbidden" | "redirect:#/..."
let currentRoute = null;

/**
 * Registra uma rota.
 * @param {string} pattern  ex.: "#/aluno" ou "#/aluno/solicitacoes/:id"
 * @param {object} config
 * @param {function} config.render  (ctx) => void   — desenha a página
 * @param {string}   [config.title] título da página
 * @param {string[]} [config.roles] perfis autorizados (vazio/omitido = público)
 * @param {object}   [config.meta]  dados livres (breadcrumb, navId, etc.)
 */
export function register(pattern, config) {
  routes.push({ pattern, ...config, matcher: toMatcher(pattern) });
}

/** Define o handler da rota inexistente (404). */
export function setNotFound(fn) { notFoundHandler = fn; }

/**
 * Define o guarda global de acesso.
 * Deve retornar:
 *  - true           → acesso permitido
 *  - "forbidden"    → acesso negado (403)
 *  - "redirect:HASH"→ redireciona para HASH
 */
export function setGuard(fn) { guard = fn; }

/** Converte um padrão de rota em regex + nomes de parâmetros. */
function toMatcher(pattern) {
  const clean = pattern.replace(/^#/, "");
  const names = [];
  const re = clean
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":")) { names.push(seg.slice(1)); return "([^/]+)"; }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${re}/?$`), names };
}

/** Lê o hash atual normalizado (sempre começa com #/). */
function readHash() {
  let h = window.location.hash || "#/";
  if (!h.startsWith("#/")) h = "#/" + h.replace(/^#/, "");
  return h;
}

/** Encontra a rota correspondente e extrai parâmetros. */
function resolve(hash) {
  const path = hash.replace(/^#/, "").split("?")[0];
  for (const route of routes) {
    const m = route.matcher.regex.exec(path);
    if (m) {
      const params = {};
      route.matcher.names.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

/** Navega para uma rota (programaticamente). */
export function navigate(hash) {
  const target = hash.startsWith("#") ? hash : "#" + hash;
  if (readHash() === target) {
    handleChange(); // força re-render se a rota é a mesma
  } else {
    window.location.hash = target;
  }
}

/** Retorna a rota atualmente ativa. */
export function getCurrent() { return currentRoute; }

/** Processa a mudança de rota. */
function handleChange() {
  const hash = readHash();
  const match = resolve(hash);

  if (!match) {
    currentRoute = { pattern: null, hash, params: {}, meta: {} };
    if (notFoundHandler) notFoundHandler({ hash });
    emit();
    return;
  }

  const { route, params } = match;

  // Guarda de acesso.
  if (guard) {
    const verdict = guard(route);
    if (verdict !== true) {
      if (typeof verdict === "string" && verdict.startsWith("redirect:")) {
        navigate(verdict.slice("redirect:".length));
        return;
      }
      // "forbidden" → página 403 via meta especial
      currentRoute = { pattern: route.pattern, hash, params, meta: route.meta || {}, forbidden: true };
      if (route.onForbidden) route.onForbidden({ params });
      else if (typeof guard.onForbidden === "function") guard.onForbidden({ route, params });
      emit();
      return;
    }
  }

  currentRoute = { pattern: route.pattern, hash, params, meta: route.meta || {}, config: route };
  route.render({ params, route, hash });
  emit();
}

/** Dispara evento de mudança de rota. */
function emit() {
  window.dispatchEvent(new CustomEvent("one:route-change", { detail: currentRoute }));
}

/** Inicia o roteador (liga ao hashchange e processa a rota inicial). */
export function start() {
  window.addEventListener("hashchange", handleChange);
  handleChange();
}
