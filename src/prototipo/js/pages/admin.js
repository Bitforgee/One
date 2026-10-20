/* ==========================================================================
   One — pages/admin.js
   Fase 6 — Administração (gestão prevista no MVP) e indicadores.
   - Indicadores: KPIs + gráficos SVG (top categorias, por setor, situações).
   - Gestão (leitura demonstrativa): usuários, cursos, setores, categorias,
     regras de encaminhamento. CRUD completo fora do escopo do MVP; os dados
     refletem o piloto demonstrativo e os relacionamentos documentados.
   ========================================================================== */

import { el } from "../dom.js";
import { buildTable } from "../components/table.js";
import { pageHead } from "../components/page-head.js";
import { barChart, donutChart } from "../components/charts.js";
import { situacaoBadge } from "../components/table.js";
import { SITUACOES, getUsuarios, getCursos, getSetores, getCategorias, getRegrasRoteamento } from "../mock-data.js";
import * as metrics from "../services/metrics-service.js";
import { listar as listarTickets } from "../services/ticket-service.js";

function kpi(label, value, icon, hint = "Dado demonstrativo") {
  return el("div", { class: "card one-stat h-100" }, [
    el("p", { class: "one-stat__label" }, [el("i", { class: `bi ${icon}`, "aria-hidden": "true" }), el("span", { text: label })]),
    el("p", { class: "one-stat__value", text: String(value) }),
    el("p", { class: "one-stat__hint", text: hint }),
  ]);
}

function head(titulo, sub, demo = true) {
  return pageHead(titulo, {
    subtitle: sub,
    actions: demo ? [el("span", { class: "one-demo-badge align-self-center", text: "Dados demonstrativos" })] : [],
  });
}

/* --- Indicadores (seção I) ----------------------------------------------- */
export async function renderIndicators(host) {
  const r = await metrics.resumo();
  const top = await metrics.topCategorias(5);
  const setores = await metrics.porSetor();

  const cores = ["#2f6fcf", "#159a89", "#c8880a", "#8a5cc4", "#1f9d57"];
  const donutData = Object.entries(r.porSituacao)
    .filter(([, v]) => v > 0)
    .map(([k, v], i) => ({ label: (SITUACOES[k] || {}).label || k, value: v, color: cores[i % cores.length] }));

  host.replaceChildren(
    el("div", {}, [
      head("Indicadores", "Visão consolidada do atendimento (seção I das regras de negócio)."),
      el("div", { class: "row g-3" }, [
        el("div", { class: "col-6 col-xl-3" }, [kpi("Chamados (total)", r.total, "bi-collection")]),
        el("div", { class: "col-6 col-xl-3" }, [kpi("Abertos", r.abertos, "bi-folder2-open")]),
        el("div", { class: "col-6 col-xl-3" }, [kpi("Roteamento correto", r.taxaRoteamentoCorreto + "%", "bi-signpost")]),
        el("div", { class: "col-6 col-xl-3" }, [kpi("Reabertura", r.taxaReabertura + "%", "bi-arrow-counterclockwise")]),
      ]),
      el("div", { class: "row g-3 mt-1" }, [
        el("div", { class: "col-lg-7" }, [
          el("div", { class: "card h-100" }, [el("div", { class: "card-body" }, [
            el("h3", { class: "h6 text-muted-one text-uppercase mb-3", style: "letter-spacing:.04em", text: "Principais categorias" }),
            barChart(top.map((t) => ({ label: t.categoria, value: t.total })), { ariaLabel: "Chamados por categoria" }),
          ])]),
        ]),
        el("div", { class: "col-lg-5" }, [
          el("div", { class: "card h-100" }, [el("div", { class: "card-body" }, [
            el("h3", { class: "h6 text-muted-one text-uppercase mb-3", style: "letter-spacing:.04em", text: "Situações" }),
            el("div", { class: "d-flex align-items-center gap-3 flex-wrap" }, [
              donutChart(donutData, { ariaLabel: "Chamados por situação", centerText: String(r.total) }),
              el("ul", { class: "list-unstyled mb-0 small" }, donutData.map((d) =>
                el("li", { class: "d-flex align-items-center gap-2 mb-1" }, [
                  el("span", { style: `display:inline-block;width:10px;height:10px;border-radius:2px;background:${d.color}` }),
                  el("span", { text: `${d.label}: ${d.value}` }),
                ])
              )),
            ]),
          ])]),
        ]),
      ]),
      el("div", { class: "card mt-3" }, [el("div", { class: "card-body" }, [
        el("h3", { class: "h6 text-muted-one text-uppercase mb-3", style: "letter-spacing:.04em", text: "Chamados por setor" }),
        barChart(setores.map((s) => ({ label: s.setor, value: s.total })), { ariaLabel: "Chamados por setor" }),
      ])]),
    ])
  );
}

/* --- Tabelas de gestão (leitura) ----------------------------------------- */

async function tabelaGestao(host, { titulo, sub, colunas, linhas }) {
  host.replaceChildren(
    el("div", {}, [
      head(titulo, sub),
      el("div", { class: "card" }, [el("div", { class: "card-body p-0" }, [buildTable({ columns: colunas, rows: linhas, caption: titulo })])]),
    ])
  );
}

export async function renderUsers(host) {
  const linhas = await getUsuarios();
  await tabelaGestao(host, {
    titulo: "Usuários", sub: "Contas demonstrativas do piloto. A criação/edição completa fica fora do MVP.",
    colunas: [
      { key: "nome", label: "Nome" },
      { key: "perfil", label: "Perfil", render: (r) => el("span", { class: "badge text-bg-light border", text: r.perfil }) },
      { key: "vinculo", label: "Vínculo", className: "text-muted-one" },
      { key: "ativo", label: "Situação", render: (r) => el("span", { class: `one-status one-status--${r.ativo ? "resolved" : "closed"}`, text: r.ativo ? "Ativo" : "Inativo" }) },
    ],
    linhas,
  });
}

export async function renderCourses(host) {
  const linhas = await getCursos();
  await tabelaGestao(host, {
    titulo: "Cursos", sub: "Cursos do piloto e suas coordenações (usadas no roteamento por coordenação).",
    colunas: [{ key: "nome", label: "Curso" }, { key: "coordenacao", label: "Coordenação", className: "text-muted-one" }],
    linhas,
  });
}

export async function renderSectors(host) {
  const linhas = await getSetores();
  await tabelaGestao(host, {
    titulo: "Setores", sub: "Filas de atendimento. Exatamente um setor é a triagem (BR-E4).",
    colunas: [
      { key: "nome", label: "Setor" },
      { key: "triagem", label: "Triagem", render: (r) => r.triagem ? el("span", { class: "badge text-bg-primary", text: "Triagem" }) : el("span", { class: "text-subtle-one", text: "—" }) },
    ],
    linhas,
  });
}

export async function renderCategories(host) {
  const linhas = await getCategorias();
  await tabelaGestao(host, {
    titulo: "Categorias", sub: "Categorias de atendimento do piloto.",
    colunas: [{ key: "nome", label: "Categoria" }],
    linhas,
  });
}

export async function renderRoutingRules(host) {
  const linhas = await getRegrasRoteamento();
  await tabelaGestao(host, {
    titulo: "Regras de encaminhamento", sub: "Cada categoria é roteada para um setor fixo ou para a coordenação do curso do aluno (BR-E2).",
    colunas: [
      { key: "categoria", label: "Categoria" },
      { key: "destino", label: "Destino", render: (r) => el("span", { text: r.destino === "coordenacao-do-curso" ? "Coordenação do curso do aluno" : r.destino }) },
    ],
    linhas,
  });
}

/** Todos os chamados (BR-A6: o admin vê tudo). Somente leitura. */
export async function renderAllTicketsAdmin(host) {
  const linhas = await listarTickets();
  host.replaceChildren(
    el("div", {}, [
      head("Chamados", "Todos os chamados do sistema (visão administrativa, somente leitura)."),
      el("div", { class: "card" }, [el("div", { class: "card-body p-0" }, [buildTable({
        caption: "Todos os chamados",
        columns: [
          { key: "protocolo", label: "Protocolo", render: (r) => el("span", { class: "fw-semibold", text: r.protocolo }) },
          { key: "assunto", label: "Assunto" },
          { key: "aluno", label: "Aluno" },
          { key: "categoria", label: "Categoria", className: "text-muted-one" },
          { key: "setor", label: "Setor", className: "text-muted-one" },
          { key: "situacao", label: "Situação", render: (r) => { const s = SITUACOES[r.situacao] || { label: r.situacao, cls: "closed" }; return situacaoBadge(s.cls, s.label); } },
          { key: "atualizacao", label: "Atualização", className: "text-muted-one" },
        ],
        rows: linhas,
        emptyText: "Nenhum chamado.",
      })])]),
    ])
  );
}
