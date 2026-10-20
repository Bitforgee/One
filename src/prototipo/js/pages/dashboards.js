/* ==========================================================================
   One — pages/dashboards.js (Fase 2, layout inspirado no GLPI)
   Painéis iniciais de cada perfil. Estrutura recorrente inspirada no GLPI:
   KPIs no topo → prévia da lista de chamados (tabela) → atalhos.
   Todos os números e chamados são DEMONSTRATIVOS. Nenhuma ação altera dados
   nesta fase (os botões informam que a função chega em fase posterior).
   ========================================================================== */

import { el } from "../dom.js";
import { showToast } from "../components/toast.js";
import { buildTable, situacaoBadge } from "../components/table.js";
import { pageHead } from "../components/page-head.js";
import { SITUACOES } from "../mock-data.js";
import { listar as listarTickets, listarDoAluno, listarDoSetor } from "../services/ticket-service.js";

/* --- Blocos reutilizáveis ------------------------------------------------- */

/** Cartão de KPI. */
function kpi(label, value, icon) {
  return el("div", { class: "card one-stat h-100" }, [
    el("p", { class: "one-stat__label" }, [el("i", { class: `bi ${icon}`, "aria-hidden": "true" }), el("span", { text: label })]),
    el("p", { class: "one-stat__value", text: value }),
    el("p", { class: "one-stat__hint", text: "Dado demonstrativo" }),
  ]);
}

/** Linha de KPIs a partir de pares [label, valor, ícone]. */
function kpiRow(items) {
  return el("div", { class: "row g-3" },
    items.map(([l, v, i]) => el("div", { class: "col-6 col-xl-3" }, [kpi(l, v, i)]))
  );
}

/** Prévia de chamados em tabela (colunas inspiradas no GLPI). */
function ticketPreviewTable(chamados, { showAluno = true, detailBase = null } = {}) {
  const columns = [
    { key: "protocolo", label: "Protocolo", render: (r) => el("span", { class: "fw-semibold", text: r.protocolo }) },
    { key: "assunto", label: "Assunto" },
    showAluno ? { key: "aluno", label: "Aluno" } : null,
    { key: "categoria", label: "Categoria", className: "text-muted-one" },
    { key: "setor", label: "Setor", className: "text-muted-one" },
    {
      key: "situacao", label: "Situação",
      render: (r) => { const s = SITUACOES[r.situacao] || { label: r.situacao, cls: "closed" }; return situacaoBadge(s.cls, s.label); },
    },
    { key: "abertura", label: "Abertura", className: "text-muted-one" },
    {
      key: "acoes", label: "Ações",
      render: (r) => detailBase
        ? el("a", { class: "btn btn-sm btn-outline-secondary", href: detailBase + r.protocolo, title: "Visualizar", "aria-label": `Visualizar ${r.protocolo}` }, [el("i", { class: "bi bi-eye", "aria-hidden": "true" })])
        : el("button", {
            class: "btn btn-sm btn-outline-secondary", type: "button",
            title: "Visualizar", "aria-label": "Visualizar chamado",
            on: { click: () => showToast("Abra pela lista correspondente.", { variant: "info" }) },
          }, [el("i", { class: "bi bi-eye", "aria-hidden": "true" })]),
    },
  ].filter(Boolean);

  return buildTable({ columns, rows: chamados, caption: "Prévia de chamados demonstrativos" });
}

/* --- Painel do Aluno ------------------------------------------------------ */
export async function renderStudentHome(host, user) {
  // Solicitações do próprio aluno (BR-A4).
  const meus = (await listarDoAluno(user.name)).slice(0, 5);

  const btnNovo = el("a", { class: "btn btn-primary", href: "#/aluno/novo" }, [el("i", { class: "bi bi-plus-circle me-2", "aria-hidden": "true" }), "Novo atendimento"]);
  const btnConsultar = el("a", { class: "btn btn-outline-secondary", href: "#/aluno/solicitacoes" }, [el("i", { class: "bi bi-list-check me-2", "aria-hidden": "true" }), "Consultar solicitações"]);

  host.replaceChildren(
    el("div", {}, [
      pageHead("Central de Atendimento Acadêmico", {
        subtitle: `Olá, ${user.name.split(" ")[0]}. Comece pelo assistente ou abra um novo atendimento.`,
        actions: [btnNovo, btnConsultar],
      }),
      kpiRow([
        ["Em aberto", String(meus.filter((t) => t.situacao === "OPEN").length), "bi-folder2-open"],
        ["Em atendimento", String(meus.filter((t) => t.situacao === "IN_PROGRESS").length), "bi-hourglass-split"],
        ["Resolvidas", String(meus.filter((t) => t.situacao === "RESOLVED" || t.situacao === "CLOSED").length), "bi-check2-circle"],
        ["Total", String(meus.length), "bi-collection"],
      ]),
      el("div", { class: "mt-4" }, [
        el("h2", { class: "h6 mb-3 text-uppercase text-muted-one", style: "letter-spacing:.04em", text: "Minhas solicitações recentes" }),
        el("div", { class: "card" }, [el("div", { class: "card-body p-0" }, [ticketPreviewTable(meus, { showAluno: false, detailBase: "#/aluno/solicitacoes/" })])]),
      ]),
    ])
  );
}

/* --- Painel do Atendente -------------------------------------------------- */
export async function renderAgentHome(host, user) {
  // BR-A5: a fila do atendente é escopada ao seu setor (quando houver).
  const chamados = user.sector ? await listarDoSetor(user.sector) : await listarTickets();
  const contagem = chamados.reduce((acc, c) => {
    acc[c.situacao] = (acc[c.situacao] || 0) + 1;
    return acc;
  }, {});
  const fila = chamados.filter((c) => c.situacao !== "CLOSED").slice(0, 5);

  const demoBadge = el("span", { class: "one-demo-badge align-self-center", text: "Dados demonstrativos" });

  host.replaceChildren(
    el("div", {}, [
      pageHead("Dashboard do atendente", { subtitle: `${user.name} — ${user.sector || "Setor demonstrativo"}`, actions: [demoBadge] }),
      kpiRow([
        ["Na fila (abertos)", String(contagem.OPEN || 0), "bi-inbox"],
        ["Em atendimento", String(contagem.IN_PROGRESS || 0), "bi-hourglass-split"],
        ["Aguardando aluno", String(contagem.WAITING_STUDENT || 0), "bi-person-dash"],
        ["Resolvidos", String(contagem.RESOLVED || 0), "bi-check2-circle"],
      ]),
      el("div", { class: "mt-4" }, [
        el("h2", { class: "h6 mb-3 text-uppercase text-muted-one", style: "letter-spacing:.04em", text: "Prévia de chamados" }),
        el("div", { class: "card" }, [el("div", { class: "card-body p-0" }, [ticketPreviewTable(fila, { detailBase: "#/atendente/chamado/" })])]),
      ]),
    ])
  );
}

/* --- Painel do Administrador ---------------------------------------------- */
export async function renderAdminHome(host) {
  const chamados = await listarTickets();
  const recentes = chamados.slice(0, 6);
  const abertos = chamados.filter((c) => c.situacao !== "CLOSED").length;
  const resolvidos = chamados.filter((c) => c.situacao === "RESOLVED" || c.situacao === "CLOSED").length;

  const atalho = (route, label) => el("a", { class: "btn btn-sm btn-outline-secondary", href: route, text: label });

  host.replaceChildren(
    el("div", {}, [
      pageHead("Dashboard administrativo", { subtitle: "Visão geral do atendimento acadêmico." }),
      kpiRow([
        ["Chamados (total)", String(chamados.length), "bi-collection"],
        ["Abertos", String(abertos), "bi-folder2-open"],
        ["Resolvidos", String(resolvidos), "bi-check2-circle"],
        ["Setores", "4", "bi-diagram-3"],
      ]),
      el("div", { class: "mt-4" }, [
        el("h2", { class: "h6 mb-3 text-uppercase text-muted-one", style: "letter-spacing:.04em", text: "Visão geral das solicitações" }),
        el("div", { class: "card" }, [el("div", { class: "card-body p-0" }, [ticketPreviewTable(recentes)])]),
      ]),
      el("div", { class: "mt-4 d-flex flex-wrap gap-2" }, [
        atalho("#/admin/usuarios", "Usuários"),
        atalho("#/admin/setores", "Setores"),
        atalho("#/admin/categorias", "Categorias"),
        atalho("#/admin/regras", "Regras de encaminhamento"),
        atalho("#/admin/artigos", "Base de conhecimento"),
        atalho("#/admin/indicadores", "Indicadores"),
      ]),
    ])
  );
}
