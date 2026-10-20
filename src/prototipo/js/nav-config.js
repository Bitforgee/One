/* ==========================================================================
   One — nav-config.js
   Estrutura de navegação por perfil (aluno, atendente, administrador).
   Fase 1 define a estrutura e os ícones; o roteamento efetivo das páginas
   chega na Fase 2. Cada item aponta para uma rota por hash (#/...).
   ========================================================================== */

/**
 * @typedef {Object} NavItem
 * @property {string} id      identificador estável
 * @property {string} label   rótulo exibido (PT-BR)
 * @property {string} icon    classe do Bootstrap Icons (ex.: "bi-house")
 * @property {string} route   rota por hash (ex.: "#/aluno")
 * @property {boolean} [phase2] marca itens que só funcionam a partir da Fase 2
 *
 * @typedef {Object} NavGroup
 * @property {string} title   título da seção da sidebar
 * @property {NavItem[]} items
 */

/** Perfis demonstrativos do protótipo. */
export const ROLES = {
  aluno: { id: "aluno", label: "Aluno", chipClass: "one-role-chip--aluno" },
  atendente: { id: "atendente", label: "Atendente", chipClass: "one-role-chip--atendente" },
  admin: { id: "admin", label: "Administrador", chipClass: "one-role-chip--admin" },
};

/* Menus inspirados na organização do GLPI (sidebar à esquerda, agrupada).
   `phase2: true` marca itens ainda indisponíveis (exibem cadeado e aviso).
   Na Fase 2 só os painéis iniciais navegam; as telas internas (chamados,
   assistente, gestão) chegam nas Fases 3 a 6. */

/** @type {Record<string, NavGroup[]>} */
export const NAV_BY_ROLE = {
  // Aluno: interface simplificada (inspirada no self-service do GLPI).
  aluno: [
    {
      title: "Atendimento",
      items: [
        { id: "aluno-home", label: "Início", icon: "bi-house-door", route: "#/aluno", phase2: false },
        { id: "aluno-novo", label: "Novo atendimento", icon: "bi-plus-circle", route: "#/aluno/novo", phase2: false },
        { id: "aluno-assistente", label: "Assistente", icon: "bi-chat-dots", route: "#/aluno/assistente", phase2: false },
      ],
    },
    {
      title: "Acompanhamento",
      items: [
        { id: "aluno-solicitacoes", label: "Minhas solicitações", icon: "bi-ticket-detailed", route: "#/aluno/solicitacoes", phase2: false },
        { id: "aluno-base", label: "Base de conhecimento", icon: "bi-journal-text", route: "#/aluno/base", phase2: false },
      ],
    },
  ],
  // Atendente: gestão de chamados (inspirada no backoffice do GLPI).
  atendente: [
    {
      title: "Atendimento",
      items: [
        { id: "atendente-home", label: "Dashboard", icon: "bi-speedometer2", route: "#/atendente", phase2: false },
        { id: "atendente-chamados", label: "Chamados", icon: "bi-ticket-detailed", route: "#/atendente/chamados", phase2: false },
      ],
    },
    {
      title: "Minhas visões",
      items: [
        { id: "atendente-andamento", label: "Em atendimento", icon: "bi-hourglass-split", route: "#/atendente/em-atendimento", phase2: false },
        { id: "atendente-aguardando", label: "Aguardando aluno", icon: "bi-person-dash", route: "#/atendente/aguardando-aluno", phase2: false },
        { id: "atendente-resolvidos", label: "Resolvidos", icon: "bi-check2-circle", route: "#/atendente/resolvidos", phase2: false },
      ],
    },
    {
      title: "Conhecimento",
      items: [
        { id: "atendente-base", label: "Base de conhecimento", icon: "bi-journal-text", route: "#/atendente/base", phase2: false },
      ],
    },
  ],
  // Administrador: visão geral + gestão (inspirada na administração do GLPI).
  admin: [
    {
      title: "Visão geral",
      items: [
        { id: "admin-home", label: "Dashboard", icon: "bi-speedometer2", route: "#/admin", phase2: false },
        { id: "admin-chamados", label: "Chamados", icon: "bi-ticket-detailed", route: "#/admin/chamados", phase2: false },
        { id: "admin-indicadores", label: "Indicadores", icon: "bi-graph-up", route: "#/admin/indicadores", phase2: false },
      ],
    },
    {
      title: "Gestão",
      items: [
        { id: "admin-usuarios", label: "Usuários", icon: "bi-people", route: "#/admin/usuarios", phase2: false },
        { id: "admin-cursos", label: "Cursos", icon: "bi-mortarboard", route: "#/admin/cursos", phase2: false },
        { id: "admin-setores", label: "Setores", icon: "bi-diagram-3", route: "#/admin/setores", phase2: false },
        { id: "admin-categorias", label: "Categorias", icon: "bi-tags", route: "#/admin/categorias", phase2: false },
        { id: "admin-regras", label: "Regras de encaminhamento", icon: "bi-signpost-split", route: "#/admin/regras", phase2: false },
        { id: "admin-artigos", label: "Base de conhecimento", icon: "bi-journal-richtext", route: "#/admin/artigos", phase2: false },
      ],
    },
  ],
};

/** Rota do painel inicial de cada perfil (destino após o login). */
export const HOME_ROUTE_BY_ROLE = {
  aluno: "#/aluno",
  atendente: "#/atendente",
  admin: "#/admin",
};

/**
 * Itens fixos do rodapé da sidebar (grupo "Sistema"), exibidos em todos os
 * perfis. O "Design System" foi removido da navegação pública; a página e os
 * tokens/componentes do design system continuam existindo para manutenção
 * interna. Como a lista está vazia, a sidebar não renderiza o grupo "Sistema".
 * @type {import("./nav-config.js").NavItem[]}
 */
export const SYSTEM_ITEMS = [];
