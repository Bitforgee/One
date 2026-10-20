/* ==========================================================================
   One — pages/design-system.js
   Página de demonstração do Design System (entregável visível da Fase 1).
   Mostra tokens, tipografia, cores, componentes do Bootstrap personalizados
   e os componentes próprios do One, validando ambos os temas.
   ========================================================================== */

import { el } from "../dom.js";
import { showToast } from "../components/toast.js";

/** Cabeçalho de seção da página. */
function sectionHead(title, desc) {
  return el("div", { class: "mb-3" }, [
    el("h2", { class: "h5 mb-1", text: title }),
    desc ? el("p", { class: "text-muted-one mb-0", style: "font-size:.9rem", text: desc }) : null,
  ]);
}

/** Bloco de cores da marca. */
function colorScale() {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  return el("div", { class: "row g-2" },
    steps.map((s) =>
      el("div", { class: "col-6 col-sm-4 col-md-2" }, [
        el("div", {
          class: "one-swatch",
          style: `background: var(--one-brand-${s}); color:${s >= 400 ? "#fff" : "#15335f"}`,
          text: String(s),
        }),
      ])
    )
  );
}

/** Estados semânticos. */
function semanticColors() {
  const items = [
    ["Sucesso", "var(--one-success)"],
    ["Atenção", "var(--one-warning)"],
    ["Erro", "var(--one-danger)"],
    ["Informação", "var(--one-info)"],
    ["Acento", "var(--one-accent-500)"],
  ];
  return el("div", { class: "row g-2" },
    items.map(([label, color]) =>
      el("div", { class: "col-6 col-md" }, [
        el("div", { class: "one-swatch", style: `background:${color}`, text: label }),
      ])
    )
  );
}

/** Tipografia. */
function typography() {
  return el("div", { class: "d-flex flex-column gap-2" }, [
    el("div", { class: "h1 mb-0", text: "Título H1 — One" }),
    el("div", { class: "h2 mb-0", text: "Título H2 — Atendimento acadêmico" }),
    el("div", { class: "h3 mb-0", text: "Título H3 — Base de conhecimento" }),
    el("p", { class: "mb-0", text: "Parágrafo base: o aluno explica o problema e o One tenta resolver." }),
    el("p", { class: "text-muted-one mb-0", style: "font-size:.875rem", text: "Texto secundário em 14px para apoios e legendas." }),
    el("p", { class: "text-subtle-one mb-0", style: "font-size:.75rem", text: "Texto sutil em 12px para metadados." }),
  ]);
}

/** Botões. */
function buttons() {
  return el("div", { class: "d-flex flex-wrap gap-2 align-items-center" }, [
    el("button", { class: "btn btn-primary", type: "button", text: "Primário" }),
    el("button", { class: "btn btn-outline-primary", type: "button", text: "Secundário" }),
    el("button", { class: "btn btn-outline-secondary", type: "button", text: "Neutro" }),
    el("button", { class: "btn btn-success", type: "button", text: "Resolver" }),
    el("button", { class: "btn btn-danger", type: "button", text: "Cancelar" }),
    el("button", { class: "btn btn-primary", type: "button", disabled: true, text: "Desabilitado" }),
    el("button", {
      class: "btn btn-primary",
      type: "button",
      on: { click: () => showToast("Exemplo de notificação do One.", { variant: "success", title: "Tudo certo" }) },
    }, [el("i", { class: "bi bi-bell me-2", "aria-hidden": "true" }), "Testar toast"]),
  ]);
}

/** Badges de estado do chamado. */
function statusBadges() {
  const states = [
    ["open", "Aberto"],
    ["in_progress", "Em atendimento"],
    ["waiting_student", "Aguardando aluno"],
    ["resolved", "Resolvido"],
    ["closed", "Fechado"],
  ];
  return el("div", { class: "d-flex flex-wrap gap-2" },
    states.map(([k, label]) =>
      el("span", { class: `one-status one-status--${k}`, text: label })
    )
  );
}

/** Chips de perfil. */
function roleChips() {
  return el("div", { class: "d-flex flex-wrap gap-2" }, [
    el("span", { class: "one-role-chip one-role-chip--aluno" }, [el("i", { class: "bi bi-mortarboard", "aria-hidden": "true" }), el("span", { text: "Aluno" })]),
    el("span", { class: "one-role-chip one-role-chip--atendente" }, [el("i", { class: "bi bi-headset", "aria-hidden": "true" }), el("span", { text: "Atendente" })]),
    el("span", { class: "one-role-chip one-role-chip--admin" }, [el("i", { class: "bi bi-shield-lock", "aria-hidden": "true" }), el("span", { text: "Administrador" })]),
  ]);
}

/** Formulário de exemplo. */
function formSample() {
  return el("form", { class: "row g-3", on: { submit: (e) => { e.preventDefault(); showToast("Formulário de exemplo validado.", { variant: "info" }); } } }, [
    el("div", { class: "col-md-6" }, [
      el("label", { class: "form-label", for: "ds-nome", text: "Nome" }),
      el("input", { class: "form-control", id: "ds-nome", type: "text", placeholder: "Ex.: Maria Souza" }),
    ]),
    el("div", { class: "col-md-6" }, [
      el("label", { class: "form-label", for: "ds-curso", text: "Curso" }),
      el("select", { class: "form-select", id: "ds-curso" }, [
        el("option", { text: "Análise e Desenvolvimento de Sistemas" }),
        el("option", { text: "Engenharia de Software" }),
      ]),
    ]),
    el("div", { class: "col-12" }, [
      el("label", { class: "form-label", for: "ds-msg", text: "Mensagem" }),
      el("textarea", { class: "form-control", id: "ds-msg", rows: 2, placeholder: "Descreva sua necessidade..." }),
    ]),
    el("div", { class: "col-12 d-flex gap-2" }, [
      el("button", { class: "btn btn-primary", type: "submit", text: "Enviar" }),
      el("div", { class: "form-check form-switch d-flex align-items-center gap-2 ms-2" }, [
        el("input", { class: "form-check-input", type: "checkbox", id: "ds-switch", role: "switch" }),
        el("label", { class: "form-check-label", for: "ds-switch", text: "Opção demonstrativa" }),
      ]),
    ]),
  ]);
}

/** Cartões de métrica. */
function statCards() {
  const stats = [
    ["Chamados abertos", "42", "bi-folder2-open", "Dado demonstrativo"],
    ["Resolvidos", "128", "bi-check2-circle", "Dado demonstrativo"],
    ["1ª resposta (média)", "34 min", "bi-stopwatch", "Dado demonstrativo"],
    ["Resolvido pelo assistente", "61%", "bi-robot", "Dado demonstrativo"],
  ];
  return el("div", { class: "row g-3" },
    stats.map(([label, value, icon, hint]) =>
      el("div", { class: "col-sm-6 col-xl-3" }, [
        el("div", { class: "card one-stat h-100" }, [
          el("p", { class: "one-stat__label" }, [el("i", { class: `bi ${icon}`, "aria-hidden": "true" }), el("span", { text: label })]),
          el("p", { class: "one-stat__value", text: value }),
          el("p", { class: "one-stat__hint", text: hint }),
        ]),
      ])
    )
  );
}

/** Monta a página completa dentro do container. */
export function renderDesignSystemPage(container) {
  const section = (title, desc, body) =>
    el("section", { class: "card mb-4" }, [
      el("div", { class: "card-body" }, [sectionHead(title, desc), body]),
    ]);

  container.replaceChildren(
    el("div", { class: "d-flex align-items-center gap-2 mb-4 flex-wrap" }, [
      el("span", { class: "one-demo-badge", text: "Protótipo visual" }),
      el("span", { class: "text-muted-one", style: "font-size:.9rem", text: "Fase 1 — Fundação. Alterne o tema no cabeçalho para validar claro/escuro." }),
    ]),
    section("Cores da marca", "Escala do azul institucional do One (tokens --one-brand-*).", colorScale()),
    section("Estados semânticos", "Cores de sucesso, atenção, erro, informação e acento.", semanticColors()),
    section("Tipografia", "Escala tipográfica base 16px.", typography()),
    section("Botões", "Botões do Bootstrap alinhados aos tokens do One.", buttons()),
    section("Cartões de métrica", "Base para os dashboards (Fases 3 e 6).", statCards()),
    section("Estados do chamado", "Badges para os estados do ciclo de vida (seção F das regras).", statusBadges()),
    section("Perfis", "Chips de identificação de perfil.", roleChips()),
    section("Formulários", "Campos, selects, textarea e switch do Bootstrap personalizados.", formSample()),
  );
}
