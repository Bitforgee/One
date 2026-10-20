/* ==========================================================================
   One — pages/landing.js
   Página inicial pública do One. Apresenta o produto, os benefícios e o fluxo
   de atendimento, com acesso ao login demonstrativo. Sem afirmar
   funcionalidades que ainda não existem — o texto descreve a proposta.
   Renderiza em tela cheia (fora do app shell).
   ========================================================================== */

import { el } from "../dom.js";
import { navigate } from "../router.js";

/** Barra de navegação superior da landing. */
function navbar() {
  return el("nav", { class: "navbar navbar-expand-md one-landing__nav" }, [
    el("div", { class: "container" }, [
      el("a", { class: "navbar-brand one-logo", href: "#/" }, [
        el("span", { class: "one-logo__mark", text: "O", "aria-hidden": "true" }),
        el("span", { text: "One" }),
      ]),
      el("button", {
        class: "navbar-toggler", type: "button",
        dataset: { bsToggle: "collapse", bsTarget: "#one-landing-menu" },
        "aria-controls": "one-landing-menu", "aria-expanded": "false",
        "aria-label": "Alternar navegação",
      }, [el("span", { class: "navbar-toggler-icon" })]),
      el("div", { class: "collapse navbar-collapse", id: "one-landing-menu" }, [
        el("ul", { class: "navbar-nav ms-auto mb-2 mb-md-0 align-items-md-center gap-md-1" }, [
          navItem("#benefits", "Benefícios"),
          navItem("#flow", "Como funciona"),
          navItem("#about", "Sobre"),
          el("li", { class: "nav-item ms-md-2" }, [
            el("button", {
              class: "btn btn-primary",
              type: "button",
              on: { click: () => navigate("#/login") },
            }, [el("i", { class: "bi bi-box-arrow-in-right me-2", "aria-hidden": "true" }), "Acessar"]),
          ]),
          el("li", { class: "nav-item ms-md-1" }, [themeToggle()]),
        ]),
      ]),
    ]),
  ]);
}

function navItem(href, label) {
  return el("li", { class: "nav-item" }, [
    el("a", { class: "nav-link", href, text: label }),
  ]);
}

function themeToggle() {
  return el("button", {
    class: "btn btn-outline-secondary one-theme-toggle",
    type: "button",
    "aria-label": "Alternar tema claro/escuro",
    title: "Alternar tema",
    dataset: { oneThemeToggle: "1" },
  }, [el("i", { class: "bi bi-moon-stars-fill", "aria-hidden": "true" })]);
}

/** Seção hero. */
function hero() {
  return el("header", { class: "one-landing__hero" }, [
    el("div", { class: "container" }, [
      el("div", { class: "row align-items-center g-5" }, [
        el("div", { class: "col-lg-6" }, [
          el("span", { class: "one-demo-badge mb-3 d-inline-block", text: "Protótipo visual" }),
          el("h1", { class: "one-landing__title", text: "O aluno não precisa saber quem resolve. O One precisa." }),
          el("p", { class: "one-landing__lead" }, [
            "O One é uma central inteligente de atendimento universitário. ",
            "O aluno explica o que precisa; o sistema busca a resposta na base de ",
            "conhecimento e, quando não resolve, transforma a conversa em uma ",
            "solicitação rastreável, encaminhada ao setor certo.",
          ]),
          el("div", { class: "d-flex flex-wrap gap-2 mt-4" }, [
            el("button", {
              class: "btn btn-primary btn-lg", type: "button",
              on: { click: () => navigate("#/login") },
            }, [el("i", { class: "bi bi-box-arrow-in-right me-2", "aria-hidden": "true" }), "Entrar no One"]),
            el("a", {
              class: "btn btn-outline-primary btn-lg", href: "#flow",
            }, [el("i", { class: "bi bi-arrow-down-circle me-2", "aria-hidden": "true" }), "Ver como funciona"]),
          ]),
        ]),
        el("div", { class: "col-lg-6" }, [heroCard()]),
      ]),
    ]),
  ]);
}

/** Cartão ilustrativo do hero (simulação visual de uma conversa). */
function heroCard() {
  const bubble = (who, text, cls) =>
    el("div", { class: `one-chat-bubble one-chat-bubble--${cls}` }, [
      el("span", { class: "one-chat-bubble__who", text: who }),
      el("p", { class: "mb-0", text }),
    ]);

  return el("div", { class: "card one-landing__preview" }, [
    el("div", { class: "card-body" }, [
      el("div", { class: "d-flex align-items-center gap-2 mb-3" }, [
        el("span", { class: "one-logo__mark", text: "O", "aria-hidden": "true" }),
        el("strong", { text: "Assistente One" }),
        el("span", { class: "one-demo-badge ms-auto", text: "Exemplo" }),
      ]),
      bubble("Aluno", "Preciso emitir meu boleto.", "user"),
      bubble("One", "Acesse o Portal do Aluno › Financeiro › Boletos. Isso resolveu sua dúvida?", "system"),
      el("div", { class: "d-flex gap-2 mt-2" }, [
        el("span", { class: "btn btn-sm btn-outline-success disabled", text: "Sim" }),
        el("span", { class: "btn btn-sm btn-outline-secondary disabled", text: "Não" }),
      ]),
      el("p", { class: "one-stat__hint mt-3 mb-0", text: "Ilustração do fluxo. O assistente funcional chega nas próximas fases." }),
    ]),
  ]);
}

/** Seção de benefícios. */
function benefits() {
  const items = [
    ["bi-chat-dots", "Entrada por linguagem natural", "O aluno descreve a necessidade com as próprias palavras, sem formulários rígidos."],
    ["bi-journal-text", "Conhecimento antes do chamado", "O sistema tenta resolver com artigos publicados antes de abrir uma solicitação."],
    ["bi-arrow-repeat", "Sem recomeçar do zero", "Quando vira chamado, a conversa é preservada como contexto para o atendente."],
    ["bi-signpost-split", "Encaminhamento ao setor certo", "A solicitação chega ao setor responsável conforme a categoria."],
    ["bi-clock-history", "Histórico rastreável", "Cada etapa do atendimento fica registrada do início ao fim."],
    ["bi-graph-up", "Indicadores institucionais", "A instituição mede volume, tempo e resolução para melhorar o atendimento."],
  ];
  return el("section", { class: "one-landing__section", id: "benefits" }, [
    el("div", { class: "container" }, [
      sectionTitle("Benefícios", "O que o One propõe para o atendimento acadêmico."),
      el("div", { class: "row g-4" },
        items.map(([icon, title, desc]) =>
          el("div", { class: "col-md-6 col-lg-4" }, [
            el("div", { class: "card h-100" }, [
              el("div", { class: "card-body" }, [
                el("div", { class: "one-landing__benefit-icon" }, [el("i", { class: `bi ${icon}`, "aria-hidden": "true" })]),
                el("h3", { class: "h5 mt-3", text: title }),
                el("p", { class: "text-muted-one mb-0", text: desc }),
              ]),
            ]),
          ])
        )
      ),
    ]),
  ]);
}

/** Seção "como funciona" (fluxo em etapas). */
function flow() {
  const steps = [
    ["1", "Pergunta", "O aluno explica o que precisa."],
    ["2", "Base de conhecimento", "O One procura uma resposta publicada."],
    ["3", "Resolveu?", "Em caso afirmativo, o atendimento se encerra."],
    ["4", "Vira solicitação", "Se não resolveu, a conversa se torna um chamado."],
    ["5", "Encaminhamento", "O chamado segue ao setor responsável."],
    ["6", "Atendimento", "Um atendente dá continuidade e resolve."],
  ];
  return el("section", { class: "one-landing__section one-landing__section--muted", id: "flow" }, [
    el("div", { class: "container" }, [
      sectionTitle("Como funciona", "Do autoatendimento ao atendimento humano, sem perder o contexto."),
      el("div", { class: "row g-3" },
        steps.map(([n, title, desc]) =>
          el("div", { class: "col-sm-6 col-lg-4" }, [
            el("div", { class: "one-landing__step" }, [
              el("span", { class: "one-landing__step-num", text: n }),
              el("div", {}, [
                el("h3", { class: "h6 mb-1", text: title }),
                el("p", { class: "text-muted-one mb-0", style: "font-size:.9rem", text: desc }),
              ]),
            ]),
          ])
        )
      ),
    ]),
  ]);
}

/** Seção sobre + chamada para ação. */
function about() {
  return el("section", { class: "one-landing__section", id: "about" }, [
    el("div", { class: "container" }, [
      el("div", { class: "card one-landing__cta" }, [
        el("div", { class: "card-body text-center p-5" }, [
          sectionTitle("Sobre o One", null, true),
          el("p", { class: "mx-auto", style: "max-width:620px" }, [
            "Projeto do Projeto Extensionista Integrador IV (ADS/UNIVAG). ",
            "Esta é uma demonstração visual do produto; os dados são fictícios e ",
            "os fluxos são simulados no navegador.",
          ]),
          el("button", {
            class: "btn btn-primary btn-lg mt-2", type: "button",
            on: { click: () => navigate("#/login") },
          }, [el("i", { class: "bi bi-box-arrow-in-right me-2", "aria-hidden": "true" }), "Acessar o protótipo"]),
        ]),
      ]),
    ]),
  ]);
}

function sectionTitle(title, desc, centered = false) {
  return el("div", { class: "mb-4" + (centered ? " text-center" : "") }, [
    el("h2", { class: "one-landing__section-title", text: title }),
    desc ? el("p", { class: "text-muted-one", text: desc }) : null,
  ]);
}

/** Rodapé. */
function footer() {
  return el("footer", { class: "one-landing__footer" }, [
    el("div", { class: "container d-flex flex-wrap justify-content-between align-items-center gap-2" }, [
      el("span", { class: "one-logo" }, [
        el("span", { class: "one-logo__mark", text: "O", "aria-hidden": "true" }),
        el("span", { text: "One" }),
      ]),
      el("span", { class: "text-muted-one", style: "font-size:.85rem", text: "Protótipo visual — dados demonstrativos. ADS/UNIVAG." }),
    ]),
  ]);
}

/**
 * Renderiza a landing page completa em um host de tela cheia.
 * @param {HTMLElement} host
 */
export function renderLanding(host) {
  host.replaceChildren(
    el("div", { class: "one-landing" }, [
      navbar(),
      el("main", { id: "one-landing-main" }, [hero(), benefits(), flow(), about()]),
      footer(),
    ])
  );
}
