/* ==========================================================================
   One — state.js
   Estado de sessão demonstrativo: perfil "logado", persistência e eventos.
   NÃO é autenticação real — apenas simula o acesso por perfil no protótipo.
   ========================================================================== */

import { read, write, remove } from "./storage.js";

const SESSION_KEY = "session";

/** Usuários demonstrativos por perfil (exibição apenas). */
export const DEMO_USERS = {
  aluno: { name: "Maria Souza", role: "aluno", course: "Análise e Desenvolvimento de Sistemas" },
  atendente: { name: "Carlos Lima", role: "atendente", sector: "Secretaria Acadêmica" },
  admin: { name: "Ana Diretora", role: "admin" },
};

/** Estado em memória da sessão (sincronizado com o localStorage). */
let session = read(SESSION_KEY, null);

/* Bootstrap opcional de sessão por query (?demo-role=aluno|atendente|admin).
   Serve apenas para demonstração, capturas de tela e testes automatizados;
   não substitui o login nem representa autenticação real. */
try {
  const q = new URLSearchParams(window.location.search).get("demo-role");
  if (q && DEMO_USERS[q]) {
    session = { ...DEMO_USERS[q], startedAt: new Date().toISOString(), viaQuery: true };
    write(SESSION_KEY, session);
  }
} catch { /* ignora ambientes sem window.location */ }

/** Retorna a sessão atual ({ role, name, ... }) ou null se "deslogado". */
export function getSession() {
  return session;
}

/** Indica se há um perfil autenticado (demonstrativo). */
export function isAuthenticated() {
  return !!(session && session.role);
}

/** Retorna o perfil atual ou null. */
export function getRole() {
  return session ? session.role : null;
}

/**
 * "Entra" com um perfil demonstrativo e persiste.
 * @param {"aluno"|"atendente"|"admin"} role
 * @returns {object|null} a sessão criada
 */
export function login(role) {
  const user = DEMO_USERS[role];
  if (!user) return null;
  session = { ...user, startedAt: new Date().toISOString() };
  write(SESSION_KEY, session);
  emit();
  return session;
}

/** Encerra a sessão demonstrativa. */
export function logout() {
  session = null;
  remove(SESSION_KEY);
  emit();
}

/** Dispara evento de mudança de sessão (para a UI reagir). */
function emit() {
  window.dispatchEvent(new CustomEvent("one:session-change", { detail: session }));
}
