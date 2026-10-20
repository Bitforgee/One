/* ==========================================================================
   One — app.js (Fase 2)
   Orquestra a aplicação navegável: roteador por hash, sessão demonstrativa,
   troca de layout (tela cheia x app shell), guarda de acesso por perfil,
   atualização de sidebar/header e páginas.
   ========================================================================== */

import { initTheme } from "./components/theme-switcher.js";
import { renderDesktopSidebar, renderMobileSidebar } from "./components/sidebar.js";
import { renderHeader } from "./components/header.js";
import { buildShell, buildFullscreen } from "./components/shell.js";
import { showToast } from "./components/toast.js";
import * as router from "./router.js";
import { getSession, isAuthenticated, getRole, logout } from "./state.js";
import { HOME_ROUTE_BY_ROLE, ROLES } from "./nav-config.js";

// A landing (js/pages/landing.js) foi removida da navegação pública, mas o
// arquivo é mantido para manutenção. A rota "#/" apenas redireciona agora.
import { renderLogin } from "./pages/login.js";
// A página do Design System (js/pages/design-system.js) permanece em disco para
// manutenção interna; a rota "#/design-system" apenas redireciona agora.
import { renderStudentHome, renderAgentHome, renderAdminHome } from "./pages/dashboards.js";
import { renderNotFound, renderForbidden } from "./pages/errors.js";
import { renderKnowledge } from "./pages/knowledge.js";
import { renderAssistant } from "./pages/assistant.js";
import { renderNewTicket, renderMyTickets, renderTicketDetail } from "./pages/tickets-student.js";
import { renderAgentQueue, renderAgentTicket } from "./pages/tickets-agent.js";
import { renderIndicators, renderUsers, renderCourses, renderSectors, renderCategories, renderRoutingRules, renderAllTicketsAdmin } from "./pages/admin.js";
import { renderAdminArticles } from "./pages/admin-articles.js";
import * as ticketService from "./services/ticket-service.js";
import { resetarArtigos } from "./services/knowledge-service.js";

const root = () => document.getElementById("one-root");

/** Qual layout está montado agora ("shell" | "fullscreen" | null). */
let layoutMode = null;
let shellRefs = null;

/* ---------------------------------------------------------------------------
   Layouts
   ------------------------------------------------------------------------- */

/** Garante o layout de tela cheia e devolve o host de conteúdo. */
function ensureFullscreen() {
  if (layoutMode !== "fullscreen") {
    shellRefs = null;
    layoutMode = "fullscreen";
    return buildFullscreen(root());
  }
  // Reaproveita o host existente, limpando estados anteriores (ex.: erro).
  const host = document.getElementById("main-region");
  host.classList.remove("one-error-fullscreen");
  return host;
}

/** Garante o app shell montado e devolve as referências. */
function ensureShell() {
  if (layoutMode !== "shell") {
    layoutMode = "shell";
    shellRefs = buildShell(root());
  }
  return shellRefs;
}

/** Atualiza sidebar + header do shell para a rota/sessão atuais. */
function paintShellChrome({ title, breadcrumb, activeId }) {
  const session = getSession();
  const refs = shellRefs;
  const opts = {
    role: session.role,
    user: session,
    activeId,
    onNavigate: handleSidebarNavigate,
  };
  renderDesktopSidebar(refs.sidebarDesktop, opts);
  renderMobileSidebar(refs.offcanvasBody, opts);
  renderHeader(refs.header, {
    title,
    breadcrumb: breadcrumb || [],
    user: session,
    offcanvasId: refs.offcanvasId,
  });
}

/** Rola o conteúdo ao topo e foca a região principal (acessibilidade). */
function focusMainRegion() {
  const region = document.getElementById("main-region");
  if (shellRefs && shellRefs.contentScroll) shellRefs.contentScroll.scrollTop = 0;
  if (region) region.focus({ preventScroll: true });
}

/* ---------------------------------------------------------------------------
   Páginas com shell (autenticadas)
   ------------------------------------------------------------------------- */

/** Helper: monta o shell, pinta o chrome e renderiza a página no conteúdo.
   renderFn pode ser síncrono ou assíncrono (páginas que carregam dados). */
function shellPage({ title, breadcrumb, activeId }, renderFn) {
  const refs = ensureShell();
  paintShellChrome({ title, breadcrumb, activeId });
  Promise.resolve(renderFn(refs.content, getSession())).catch((err) => {
    console.error("[one/app] falha ao renderizar a página:", err);
    showToast("Não foi possível carregar esta página.", { variant: "danger" });
  });
  focusMainRegion();
  closeMobileSidebar();
}

/* ---------------------------------------------------------------------------
   Navegação da sidebar
   ------------------------------------------------------------------------- */

function handleSidebarNavigate(ev, item) {
  // Item indisponível (fase posterior): não navega, avisa.
  if (item.phase2) {
    ev.preventDefault();
    showToast(`"${item.label}" será implementado em fase posterior.`, {
      variant: "info", title: "Em breve",
    });
    closeMobileSidebar();
    return;
  }
  // Itens funcionais usam o href (#/rota); apenas fechamos o offcanvas.
  closeMobileSidebar();
}

function closeMobileSidebar() {
  const oc = document.getElementById("oneSidebarOffcanvas");
  if (oc && window.bootstrap && window.bootstrap.Offcanvas) {
    const inst = window.bootstrap.Offcanvas.getInstance(oc);
    if (inst) inst.hide();
  }
}

/* ---------------------------------------------------------------------------
   Ações globais (sair / restaurar) — delegação de eventos
   ------------------------------------------------------------------------- */

function wireGlobalActions() {
  document.body.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-one-logout]")) {
      logout();
      showToast("Sessão demonstrativa encerrada.", { variant: "info" });
      router.navigate("#/login");
      return;
    }
    if (ev.target.closest("[data-one-reset-demo]")) {
      ticketService.resetar();
      resetarArtigos();
      showToast("Dados demonstrativos restaurados.", { variant: "success" });
      router.navigate(HOME_ROUTE_BY_ROLE[getRole()] || "#/login");
    }
  });
}

/* ---------------------------------------------------------------------------
   Guarda de acesso
   ------------------------------------------------------------------------- */

function accessGuard(route) {
  const roles = route.roles;
  // Rota pública (sem roles): sempre permitida.
  if (!roles || roles.length === 0) return true;
  // Rota protegida sem sessão: manda ao login.
  if (!isAuthenticated()) return "redirect:#/login";
  // Sessão com perfil não autorizado: 403.
  if (!roles.includes(getRole())) return "forbidden";
  return true;
}

/* ---------------------------------------------------------------------------
   Registro de rotas
   ------------------------------------------------------------------------- */

function registerRoutes() {
  router.setGuard(accessGuard);

  // Raiz: a landing foi removida da navegação pública (mantida em disco para
  // manutenção). A rota permanece registrada, mas apenas redireciona: usuários
  // autenticados vão ao painel do seu perfil; os demais, para o login.
  // router.navigate re-renderiza (sem novo hash) quando o destino é o atual,
  // então não há risco de loop ao chegar em #/login.
  router.register("#/", {
    title: "One",
    roles: [],
    render: () => {
      if (isAuthenticated()) {
        router.navigate(HOME_ROUTE_BY_ROLE[getRole()] || "#/login");
      } else {
        router.navigate("#/login");
      }
    },
  });

  // Público: login. Se já autenticado, vai direto ao painel.
  router.register("#/login", {
    title: "Entrar",
    roles: [],
    render: () => {
      if (isAuthenticated()) {
        router.navigate(HOME_ROUTE_BY_ROLE[getRole()] || "#/");
        return;
      }
      const host = ensureFullscreen();
      renderLogin(host);
      focusMainRegion();
    },
  });

  // Design System: removido da navegação pública (a página segue em
  // js/pages/design-system.js para manutenção interna). A rota continua
  // registrada para não gerar 404 em links antigos, mas apenas redireciona:
  // autenticados vão ao painel do perfil; os demais, para o login.
  router.register("#/design-system", {
    title: "One",
    roles: [],
    render: () => {
      if (isAuthenticated()) {
        router.navigate(HOME_ROUTE_BY_ROLE[getRole()] || "#/login");
      } else {
        router.navigate("#/login");
      }
    },
  });

  // Painel do Aluno.
  router.register("#/aluno", {
    roles: ["aluno"],
    render: () => shellPage(
      { title: "Início", breadcrumb: [{ label: "Aluno" }, { label: "Início" }], activeId: "aluno-home" },
      (host, user) => renderStudentHome(host, user)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  // Painel do Atendente.
  router.register("#/atendente", {
    roles: ["atendente"],
    render: () => shellPage(
      { title: "Painel", breadcrumb: [{ label: "Atendente" }, { label: "Painel" }], activeId: "atendente-home" },
      (host, user) => renderAgentHome(host, user)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  // Painel do Administrador.
  router.register("#/admin", {
    roles: ["admin"],
    render: () => shellPage(
      { title: "Dashboard", breadcrumb: [{ label: "Administrador" }, { label: "Dashboard" }], activeId: "admin-home" },
      (host, user) => renderAdminHome(host, user)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  /* --- Fase 3: Assistente e Base de conhecimento ------------------------ */

  // Assistente acadêmico (aluno).
  router.register("#/aluno/assistente", {
    roles: ["aluno"],
    render: () => shellPage(
      { title: "Assistente", breadcrumb: [{ label: "Aluno" }, { label: "Assistente" }], activeId: "aluno-assistente" },
      (host, user) => renderAssistant(host, user)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  // Base de conhecimento — consulta do aluno.
  router.register("#/aluno/base", {
    roles: ["aluno"],
    render: () => shellPage(
      { title: "Base de conhecimento", breadcrumb: [{ label: "Aluno" }, { label: "Base de conhecimento" }], activeId: "aluno-base" },
      (host, user) => renderKnowledge(host, user)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  // Base de conhecimento — consulta do atendente.
  router.register("#/atendente/base", {
    roles: ["atendente"],
    render: () => shellPage(
      { title: "Base de conhecimento", breadcrumb: [{ label: "Atendente" }, { label: "Base de conhecimento" }], activeId: "atendente-base" },
      (host, user) => renderKnowledge(host, user)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  // Base de conhecimento — gestão administrativa (CRUD de artigos).
  router.register("#/admin/artigos", {
    roles: ["admin"],
    render: () => shellPage(
      { title: "Base de conhecimento", breadcrumb: [{ label: "Administrador" }, { label: "Base de conhecimento" }], activeId: "admin-artigos" },
      (host, user) => renderAdminArticles(host, user)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  /* --- Fase 4: Solicitações do aluno ------------------------------------ */

  router.register("#/aluno/novo", {
    roles: ["aluno"],
    render: () => shellPage(
      { title: "Novo atendimento", breadcrumb: [{ label: "Aluno" }, { label: "Novo atendimento" }], activeId: "aluno-novo" },
      (host, user) => renderNewTicket(host, user)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  router.register("#/aluno/solicitacoes", {
    roles: ["aluno"],
    render: () => shellPage(
      { title: "Minhas solicitações", breadcrumb: [{ label: "Aluno" }, { label: "Minhas solicitações" }], activeId: "aluno-solicitacoes" },
      (host, user) => renderMyTickets(host, user)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  router.register("#/aluno/solicitacoes/:protocolo", {
    roles: ["aluno"],
    render: ({ params }) => shellPage(
      { title: "Solicitação " + params.protocolo, breadcrumb: [{ label: "Aluno" }, { label: "Minhas solicitações", route: "#/aluno/solicitacoes" }, { label: params.protocolo }], activeId: "aluno-solicitacoes" },
      (host, user) => renderTicketDetail(host, user, params.protocolo)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  /* --- Fase 5: Atendimento humano --------------------------------------- */

  router.register("#/atendente/chamados", {
    roles: ["atendente"],
    render: () => shellPage(
      { title: "Chamados", breadcrumb: [{ label: "Atendente" }, { label: "Chamados" }], activeId: "atendente-chamados" },
      (host, user) => renderAgentQueue(host, user, "", "Chamados do setor")
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  router.register("#/atendente/em-atendimento", {
    roles: ["atendente"],
    render: () => shellPage(
      { title: "Em atendimento", breadcrumb: [{ label: "Atendente" }, { label: "Em atendimento" }], activeId: "atendente-andamento" },
      (host, user) => renderAgentQueue(host, user, "IN_PROGRESS", "Em atendimento")
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  router.register("#/atendente/aguardando-aluno", {
    roles: ["atendente"],
    render: () => shellPage(
      { title: "Aguardando aluno", breadcrumb: [{ label: "Atendente" }, { label: "Aguardando aluno" }], activeId: "atendente-aguardando" },
      (host, user) => renderAgentQueue(host, user, "WAITING_STUDENT", "Aguardando aluno")
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  router.register("#/atendente/resolvidos", {
    roles: ["atendente"],
    render: () => shellPage(
      { title: "Resolvidos", breadcrumb: [{ label: "Atendente" }, { label: "Resolvidos" }], activeId: "atendente-resolvidos" },
      (host, user) => renderAgentQueue(host, user, "RESOLVED", "Resolvidos")
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  router.register("#/atendente/chamado/:protocolo", {
    roles: ["atendente"],
    render: ({ params }) => shellPage(
      { title: "Chamado " + params.protocolo, breadcrumb: [{ label: "Atendente" }, { label: "Chamados", route: "#/atendente/chamados" }, { label: params.protocolo }], activeId: "atendente-chamados" },
      (host, user) => renderAgentTicket(host, user, params.protocolo)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  /* --- Fase 6: Administração -------------------------------------------- */

  router.register("#/admin/indicadores", {
    roles: ["admin"],
    render: () => shellPage(
      { title: "Indicadores", breadcrumb: [{ label: "Administrador" }, { label: "Indicadores" }], activeId: "admin-indicadores" },
      (host) => renderIndicators(host)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  router.register("#/admin/chamados", {
    roles: ["admin"],
    render: () => shellPage(
      { title: "Chamados", breadcrumb: [{ label: "Administrador" }, { label: "Chamados" }], activeId: "admin-chamados" },
      (host) => renderAllTicketsAdmin(host)
    ),
    onForbidden: () => renderForbiddenInShell(),
  });

  router.register("#/admin/usuarios", {
    roles: ["admin"],
    render: () => shellPage({ title: "Usuários", breadcrumb: [{ label: "Administrador" }, { label: "Usuários" }], activeId: "admin-usuarios" }, (host) => renderUsers(host)),
    onForbidden: () => renderForbiddenInShell(),
  });
  router.register("#/admin/cursos", {
    roles: ["admin"],
    render: () => shellPage({ title: "Cursos", breadcrumb: [{ label: "Administrador" }, { label: "Cursos" }], activeId: "admin-cursos" }, (host) => renderCourses(host)),
    onForbidden: () => renderForbiddenInShell(),
  });
  router.register("#/admin/setores", {
    roles: ["admin"],
    render: () => shellPage({ title: "Setores", breadcrumb: [{ label: "Administrador" }, { label: "Setores" }], activeId: "admin-setores" }, (host) => renderSectors(host)),
    onForbidden: () => renderForbiddenInShell(),
  });
  router.register("#/admin/categorias", {
    roles: ["admin"],
    render: () => shellPage({ title: "Categorias", breadcrumb: [{ label: "Administrador" }, { label: "Categorias" }], activeId: "admin-categorias" }, (host) => renderCategories(host)),
    onForbidden: () => renderForbiddenInShell(),
  });
  router.register("#/admin/regras", {
    roles: ["admin"],
    render: () => shellPage({ title: "Regras de encaminhamento", breadcrumb: [{ label: "Administrador" }, { label: "Regras" }], activeId: "admin-regras" }, (host) => renderRoutingRules(host)),
    onForbidden: () => renderForbiddenInShell(),
  });

  // 404.
  router.setNotFound(() => {
    if (isAuthenticated()) {
      const refs = ensureShell();
      paintShellChrome({ title: "Não encontrado", breadcrumb: [{ label: "Erro" }], activeId: null });
      renderNotFound(refs.content, { home: HOME_ROUTE_BY_ROLE[getRole()] || "#/login" });
      focusMainRegion();
    } else {
      const host = ensureFullscreen();
      host.classList.add("one-error-fullscreen");
      renderNotFound(host, { home: "#/login" });
      focusMainRegion();
    }
  });
}

/** Renderiza o 403 dentro do shell quando a guarda bloqueia uma rota. */
function renderForbiddenInShell() {
  if (!isAuthenticated()) {
    const host = ensureFullscreen();
    host.classList.add("one-error-fullscreen");
    renderForbidden(host, { home: "#/login" });
    focusMainRegion();
    return;
  }
  const refs = ensureShell();
  const roleLabel = (ROLES[getRole()] || {}).label;
  paintShellChrome({ title: "Acesso negado", breadcrumb: [{ label: "Erro" }], activeId: null });
  renderForbidden(refs.content, { home: HOME_ROUTE_BY_ROLE[getRole()] || "#/login", roleLabel });
  focusMainRegion();
}

/* ---------------------------------------------------------------------------
   Inicialização
   ------------------------------------------------------------------------- */

function init() {
  initTheme();
  wireGlobalActions();
  registerRoutes();

  // Reage a mudanças de sessão disparadas por outras abas/ações.
  window.addEventListener("one:session-change", () => {
    // Nada a fazer aqui além de permitir que a navegação cuide do re-render.
  });

  router.start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
