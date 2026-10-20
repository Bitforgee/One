# Relatório de Responsividade — One (Atendimento Acadêmico)

Protótipo: `c:\Users\joaoh\OneDrive\Área de Trabalho\ProjetoIntegrador\One (1)\One\prototipo-visual`

Escopo: correção de responsividade da camada de apresentação (layout fluido, estilo
GLPI), preservando comportamento e regras de negócio. Este relatório é construído
estritamente sobre os artefatos reais produzidos nas etapas anteriores da tarefa
`responsividade-fluida` (baseline, plano, revisão, medições e regressão). Nenhum número
foi inventado: todos os valores vêm das medições e contagens registradas nesses arquivos.

Fontes (lidas para este relatório):
- Baseline: `.agents/tasks/responsividade-fluida/baseline.md`
- Plano: `.agents/tasks/responsividade-fluida/plan.md`
- Revisão: `.agents/tasks/responsividade-fluida/review.md` (+ `review.json`, veredito `APPROVED`)
- Medições (CDP): `.agents/tasks/responsividade-fluida/measurements.md`
- Regressão: `.agents/tasks/responsividade-fluida/regression.md`

Convenção de evidência usada em todo o relatório (cada afirmação é classificada como):
- **Testado automaticamente** — verificado por uma das cinco suites do projeto.
- **Testado manualmente (CDP, com `scrollWidth` medido vs viewport)** — medição real de
  viewport e `document.documentElement.scrollWidth` via Chrome DevTools Protocol.
- **Verificado por inspeção** — confirmado por leitura de código/arquivos.
- **Não verificado** — não comprovado por nenhum dos meios acima.

Observação de método: uma captura de tela, isoladamente, **não** é considerada validação
suficiente de overflow. A ausência de overflow horizontal foi comprovada por medição CDP
de `scrollWidth` vs viewport (seção 4), não por imagem.

---

## 1. Causas identificadas

A causa-raiz foi confirmada por leitura dos arquivos (não por suposição).

- **Regra exata:** `.one-content__inner` em `css/layout.css` impunha
  `max-width: var(--one-content-max); margin-inline: auto; width: 100%;`.
- **Token exato:** `--one-content-max: 1360px`, definido em `css/variables.css`.

Como todas as páginas do shell são montadas dentro de `#main-region` — que é exatamente o
`div.one-content__inner` criado uma única vez em `js/components/shell.js` (`buildShell()`)
— essa única regra **limitava e centralizava o conteúdo de TODAS as páginas**. Isso
explica diretamente os sintomas relatados: conteúdo concentrado no centro, espaço
horizontal desperdiçado à direita da sidebar, margens excessivas e a tabela de chamados do
admin entrando em rolagem interna cedo.

O que **não** era a causa (e por isso foi preservado): o shell em grid está correto —
`.one-app { display: grid; grid-template-columns: var(--one-sidebar-width) 1fr; }`, a
variante recolhida `.one-app[data-sidebar-collapsed="1"] { grid-template-columns: var(--one-sidebar-collapsed) 1fr; }`
e `.one-app__main { min-width: 0; }` (que já evita overflow do grid). As tabelas já vinham
envolvidas em `.table-responsive` (`js/components/table.js`), contendo a rolagem horizontal
no próprio contêiner.

Classificação da evidência: **Verificado por inspeção** (regra, token e topologia do shell
lidos em `baseline.md` e `plan.md`).

---

## 2. Arquivos modificados

Quatro arquivos, todos na camada de apresentação, todos dentro da pasta do protótipo:

| Arquivo | Mudança |
|---|---|
| `css/variables.css` | Adicionado token `--one-content-readable: 820px` (aditivo). `--one-content-max` mantido definido, apenas não mais aplicado globalmente. |
| `css/layout.css` | `.one-content__inner` deixou de impor `max-width`/`margin-inline:auto`; passou a fluido (`width:100%; margin-inline:0; padding-inline: clamp(var(--one-space-2), 2vw, var(--one-space-5))`). Adicionado modificador opt-in `.one-content__inner--readable`. Regras de `.one-app`, grid colapsável da sidebar, `.one-app__main`, `.one-sidebar` e `.one-header` preservadas intactas. |
| `js/pages/tickets-student.js` | `renderNewTicket`: `div` raiz passou a receber `class: "one-content__inner--readable"` (apenas acréscimo de classe). |
| `js/pages/assistant.js` | `renderAssistant`: `div` raiz passou a receber `class: "one-content__inner--readable"` (apenas acréscimo de classe). |

Arquivos protegidos **não** tocados (confirmado por inspeção e por timestamps de edição):
`js/services/*`, `js/router.js`, `js/state.js`, `js/storage.js`, `js/nav-config.js`,
`js/components/charts.js`, `js/components/theme-switcher.js`, `data/*`, `tests/*`.

Classificação da evidência: **Verificado por inspeção** (mapa de arquivos em `review.md` e
seção de verificação de `plan.md`).

---

## 3. Correções aplicadas (o que mudou e por quê)

A decisão de projeto foi **inverter o padrão de largura** em vez de aumentar apenas o
dashboard: largura total passa a ser o default de toda página do shell; a largura de
leitura confortável vira opt-in por página onde faz sentido. Isso mantém
`.one-content__inner` como o único ponto de montagem compartilhado (preservando o id
`#main-region` e o anchor `.one-content__inner` que os testes e o skip-link usam).

1. **Token de leitura (aditivo):** `--one-content-readable: 820px` em `css/variables.css`.
   Por quê: ancorar o modificador de legibilidade sem remover o token existente.
2. **Default fluido:** `.one-content__inner` passou de capped/centralizado para
   `width:100%; margin-inline:0` + `padding-inline: clamp(var(--one-space-2), 2vw, var(--one-space-5))`.
   Por quê: remover a causa-raiz (cap global de 1360px) e dar margens laterais moderadas e
   responsivas sem `max-width` artificial nem `margin:auto` centralizando tudo.
3. **Modificador opt-in `--readable`:** aplicado **apenas** a duas páginas de leitura —
   `renderNewTicket` (formulário "Novo atendimento") e `renderAssistant` (chat do
   assistente). Por quê: formulário e chat se beneficiam de uma medida de linha mais
   estreita; dashboards, listas, tabelas, indicadores e KB permanecem em largura total.
4. **Tabelas:** nenhuma mudança de código foi necessária. `.table-responsive` já contém a
   rolagem horizontal e `.one-app__main { min-width:0 }` já evita overflow da página. O
   passo condicional do plano (adicionar `min-width:0` ao card da tabela em
   `css/components.css`) foi corretamente **não** aplicado, pois a estrutura não exigiu.

Páginas fullscreen (landing, login, erros) são montadas por `buildFullscreen()`, não
passam por `.one-content__inner` e mantêm seus próprios limites de painel — por isso não
foram alteradas.

Classificação da evidência: **Verificado por inspeção** (`plan.md`, `review.md`).

---

## 4. Resultados por breakpoint (medição real CDP: `scrollWidth` vs viewport)

Método (de `measurements.md`): servidor estático local em `http://localhost:4178`; Chrome
headless via Chrome DevTools Protocol estendendo a mesma abordagem WebSocket de
`tests/e2e.mjs` / `tests/shots.mjs` (script descartável, já removido); viewport **real**
definido por `Emulation.setDeviceMetricsOverride`; após `Page.reload`, mediu-se
`window.innerWidth` (vp) e `document.documentElement.scrollWidth` (scrollW), com
`delta = scrollW − vp`. **Condição de PASS:** `delta ≤ 2px` (tolerância de arredondamento)
em todas as páginas, ambos os temas e ambos os estados de sidebar.

Cobertura: 10 breakpoints × 5 páginas representativas (`#/admin`, `#/atendente/chamados`,
`#/atendente/chamado/ONE-1050`, `#/aluno/novo`, `#/aluno/assistente`) × 2 temas
(claro/escuro) × 2 estados de sidebar (expandida/recolhida) = **200 medições**.

Resultado consolidado por breakpoint (agregado sobre as 20 medições de cada um). Abaixo de
992px a sidebar desktop fica `display:none` (largura 0 → Offcanvas, sem largura
permanente):

| Viewport | maxScrollW | maxΔ (overflow) | sidebar expandida | sidebar recolhida | Falhas | Status |
|---------:|-----------:|----------------:|------------------:|------------------:|-------:|:------:|
| 320px    | 320        | 0px             | — (Offcanvas)     | — (Offcanvas)     | 0/20   | PASS   |
| 375px    | 375        | 0px             | — (Offcanvas)     | — (Offcanvas)     | 0/20   | PASS   |
| 390px    | 390        | 0px             | — (Offcanvas)     | — (Offcanvas)     | 0/20   | PASS   |
| 576px    | 576        | 0px             | — (Offcanvas)     | — (Offcanvas)     | 0/20   | PASS   |
| 768px    | 768        | 0px             | — (Offcanvas)     | — (Offcanvas)     | 0/20   | PASS   |
| 992px    | 992        | 0px             | 248px             | 60px              | 0/20   | PASS   |
| 1024px   | 1024       | 0px             | 248px             | 60px              | 0/20   | PASS   |
| 1280px   | 1280       | 0px             | 248px             | 60px              | 0/20   | PASS   |
| 1440px   | 1440       | 0px             | 248px             | 60px              | 0/20   | PASS   |
| 1920px   | 1920       | 0px             | 248px             | 60px              | 0/20   | PASS   |

**maxΔ global sobre as 200 medições = 0px.** Nenhum breakpoint apresentou overflow
horizontal de página. Resultado da tabela: **0 falhas / 200 medições (PASS)**.

Aproveitamento de largura (≥1280px, tema claro, sidebar expandida, dashboard admin) —
confirma que o conteúdo preenche o espaço à direita da sidebar, sem margem morta:

| Viewport | sidebar | main (`.one-app__main`) | conteúdo (`.one-content__inner`) | preenchimento main/(vp−sb) |
|---------:|--------:|------------------------:|---------------------------------:|---------------------------:|
| 1280px   | 248px   | 1032px                  | 984px                            | 100%                       |
| 1440px   | 248px   | 1192px                  | 1144px                           | 100%                       |
| 1920px   | 248px   | 1672px                  | 1624px                           | 100%                       |

A diferença de 48px entre `main` e `.one-content__inner` é o padding lateral responsivo
(`padding-inline: clamp(...)`), não margem morta nem `max-width` artificial.

Sidebar expandida vs recolhida (1920px, tema claro, admin) — o conteúdo acompanha:

| Estado    | sidebar | main   | conteúdo | scrollW | Δ   |
|:----------|--------:|-------:|---------:|--------:|----:|
| Expandida | 248px   | 1672px | 1624px   | 1920    | 0px |
| Recolhida | 60px    | 1860px | 1812px   | 1920    | 0px |

Ao recolher a sidebar (248px → 60px), o conteúdo expande automaticamente (+188px ≈ redução
da sidebar), sem overflow, governado pelo grid.

Classificação da evidência: **Testado manualmente (CDP, com `scrollWidth` medido vs
viewport)**.

---

## 5. Testes executados (comandos + contagens antes/depois)

Pré-requisito: static-server ativo em `http://localhost:4178`
(`node tests/static-server.mjs 4178`), executado da pasta do protótipo —
`GET http://localhost:4178/index.html` → HTTP 200.

| # | Suite | Comando | ANTES (baseline.md) | DEPOIS (regression.md) |
|---|-------|---------|---------------------|------------------------|
| 1 | Headless | `node tests/run-headless.mjs` | 67 ok, 0 falhas (67/0) | 67 ok, 0 falhas (exit 0) |
| 2 | Smoke | `node tests/smoke-app.mjs` | 20/20 cenários ok | 20/20 cenários ok (exit 0) |
| 3 | Console | `node tests/console-check.mjs` | 0 erros de JavaScript | 0 erros de JavaScript (exit 0) |
| 4 | A11y (estrutural) | `node tests/a11y-check.mjs` | 0 avisos | 0 avisos (exit 0) |
| 5 | E2E | `node tests/e2e.mjs` | 20/20 verificações reais ok | 20/20 verificações reais ok (exit 0) |

As cinco suites permaneceram verdes nos mesmos valores do baseline — nenhuma regressão.
Nenhum teste em `tests/*` foi alterado para fazer as suites passarem.

Classificação da evidência: **Testado automaticamente** (contagens registradas em
`baseline.md` e `regression.md`).

---

## 6. Capturas antes/depois (caminhos)

As capturas do estado reformulado/corrigido do dashboard admin, nos dois temas, estão em
disco (confirmadas por `Test-Path`). As capturas de estado "antes" preservadas do fluxo de
homologação anterior servem de referência comparativa.

Depois (estado fluido corrigido — admin, sidebar expandida):
- `tests\screenshots\resp-admin-expandida-claro.png`
- `tests\screenshots\resp-admin-expandida-escuro.png`

Referência do dashboard admin (capturas pré-existentes do pipeline anterior):
- `tests\screenshots\admin-claro.png`
- `tests\screenshots\admin-escuro.png`

Nota: a comprovação de ausência de overflow vem da medição CDP da seção 4, não destas
imagens. As capturas ilustram o resultado visual; não substituem a medição.

Classificação da evidência: **Verificado por inspeção** (existência dos arquivos em disco).

---

## 7. Capturas sidebar expandida/recolhida (caminhos)

Desktop 1440×1000, ambos os temas (confirmadas em disco):

- `tests\screenshots\resp-admin-expandida-claro.png`
- `tests\screenshots\resp-admin-recolhida-claro.png`
- `tests\screenshots\resp-admin-expandida-escuro.png`
- `tests\screenshots\resp-admin-recolhida-escuro.png`

Leitura das imagens (de `regression.md`): expandida vs recolhida são distintas — a recolhida
mostra o rail só com ícones e o conteúdo/tabela ocupando a largura liberada, sem rolagem
horizontal da página; `data-sidebar-collapsed="1"` confirmado em runtime.

Classificação da evidência: **Testado manualmente (CDP, com `scrollWidth` medido vs
viewport)** para o comportamento geométrico (seção 4); **Verificado por inspeção** para a
existência das imagens.

---

## 8. Capturas mobile (caminhos)

Mobile 390×850, offcanvas aberto e conteúdo após fechar, ambos os temas (confirmadas em
disco):

- `tests\screenshots\resp-mobile-offcanvas-aberto-claro.png`
- `tests\screenshots\resp-mobile-conteudo-pos-fechar-claro.png`
- `tests\screenshots\resp-mobile-offcanvas-aberto-escuro.png`
- `tests\screenshots\resp-mobile-conteudo-pos-fechar-escuro.png`

Medição dedicada (viewport real 390×850, `mobile: true`, fila do atendente, tema claro),
de `measurements.md`:

| Momento                 | viewport | scrollWidth | Δ   | Offcanvas visível | main   |
|:------------------------|---------:|------------:|----:|:-----------------:|-------:|
| Antes de abrir o menu   | 390px    | 390px       | 0px | não               | 390px  |
| Menu (Offcanvas) aberto | 390px    | 390px       | 0px | sim               | —      |
| Depois de fechar o menu | 390px    | 390px       | 0px | não               | 390px  |

A sidebar desktop fica `display:none` abaixo de 992px e o Offcanvas **não consome largura
permanente**: `scrollWidth` permanece igual à viewport com o menu aberto e, após fechar, o
conteúdo volta a 100% (main = 390px). Nenhum overflow de página nos três momentos.

Classificação da evidência: **Testado manualmente (CDP, com `scrollWidth` medido vs
viewport)** para a geometria; **Verificado por inspeção** para a existência das imagens.

---

## 9. Resultados temas claro/escuro

Ambos os temas foram incluídos em todas as 200 medições (100 claro + 100 escuro). Nenhuma
diferença de overflow entre temas: `maxΔ = 0px` em ambos. O tema altera apenas tokens de
cor/superfície, não a geometria do layout — o que a medição confirma. As cinco suites
automatizadas também passaram independentemente de tema (o tema não afeta as asserções de
DOM).

| Tema   | Medições | maxΔ (overflow) | Status |
|:-------|---------:|----------------:|:------:|
| Claro  | 100      | 0px             | PASS   |
| Escuro | 100      | 0px             | PASS   |

Classificação da evidência: **Testado manualmente (CDP, com `scrollWidth` medido vs
viewport)**.

---

## 10. Problemas remanescentes

Nenhum problema bloqueante. O veredito da revisão foi **APPROVED** sem findings
(`review.json`: `findings: []`). Os itens em aberto são ajustes de tolerância **visual**,
explicitamente diferidos pelo plano como "a validar no navegador" — não são regressões de
correção e não gatilham nenhum critério:

1. Valor de `--one-content-readable` (820px): conferir se formulário e chat ficam
   confortáveis em 1440/1920px (faixa sugerida ~720–900px). — **Não verificado** (tolerância
   visual).
2. Padding lateral `clamp(space-2, 2vw, space-5)` do `.one-content__inner`: conferir se não
   há margem dupla com o `padding` do `.one-content` em 1920px. — **Não verificado**
   (tolerância visual).
3. KPIs em notebook (~992–1200px): 4 colunas podem ficar apertadas; avaliar `col-6 col-md-3`
   só se a leitura prejudicar. — **Não verificado** (tolerância visual).

Observação: a ausência de overflow de página nesses mesmos tamanhos **já foi medida** (0px
em 992/1024/1280/1440/1920 e em 320–768); os itens acima são de conforto visual, não de
overflow.

---

## 11. Recursos ECC utilizados

Registro honesto do que foi efetivamente usado nesta tarefa, com base nos artefatos:

- **Nenhuma skill de marketplace ECC** (frontend/accessibility/browser-QA) está registrada
  como ativada nos artefatos desta tarefa. Não há evidência de uso de uma skill nomeada, e
  por isso não é reivindicada aqui.
- O trabalho de **QA de navegador** foi feito com a abordagem CDP própria do protótipo
  (Chrome headless + WebSocket global do Node + `Page.reload`/`Emulation.setDeviceMetricsOverride`/
  `Page.captureScreenshot`), estendendo as técnicas já presentes em `tests/e2e.mjs` e
  `tests/shots.mjs`. Scripts de medição descartáveis foram usados e removidos; o driver de
  capturas da regressão vive em `.agents/tasks/responsividade-fluida/shots-regression.mjs`.
- A verificação de **acessibilidade** usada foi a suite estrutural própria do projeto
  (`node tests/a11y-check.mjs` → 0 avisos), não uma auditoria axe-core externa. Isso é uma
  verificação estrutural, não uma validação WCAG completa (que exigiria teste manual com
  tecnologias assistivas e revisão especializada).
- O layout **frontend** foi implementado com Bootstrap 5.3+ já presente no protótipo
  (`vendor/bootstrap`), grid nativo e tokens CSS do projeto.

Classificação da evidência: **Verificado por inspeção** dos artefatos e da árvore de
arquivos.

---

## 12. Avaliação final — 16 critérios de aceitação

Legenda de evidência: **Auto** = testado automaticamente; **CDP** = testado manualmente
(CDP, `scrollWidth` medido vs viewport); **Insp** = verificado por inspeção; **NV** = não
verificado.

| # | Critério | Status | Evidência | Base |
|---|----------|:------:|-----------|------|
| 1 | Largura fluida utilizada | ATENDIDO | CDP + Insp | `.one-content__inner` fluido; preenchimento 100% em ≥1280px (seção 4) |
| 2 | Sem espaço desperdiçado à direita | ATENDIDO | CDP | main/(vp−sb) = 100% em 1280/1440/1920 (seção 4) |
| 3 | Sidebar expandida funciona | ATENDIDO | CDP | 248px medida em ≥992px (seção 4) |
| 4 | Sidebar recolhida funciona | ATENDIDO | CDP | 60px medida; conteúdo expande +188px (seção 4) |
| 5 | Layout acompanha a sidebar | ATENDIDO | CDP + Insp | grid troca 1ª coluna; conteúdo acompanha sem overflow (seção 4) |
| 6 | Header alinhado | ATENDIDO | Insp + Auto | `renderHeader` dentro de `.one-app__main` preservado; a11y/smoke verdes |
| 7 | Indicadores responsivos | ATENDIDO | Insp + Auto | `row g-3` + `col-6 col-xl-3` (2 mobile / 4 desktop); suites verdes |
| 8 | Tabela usa a largura disponível | ATENDIDO | CDP + Insp | cap global removido; tabela ocupa o contêiner (seções 3–4) |
| 9 | Sem rolagem vertical interna desnecessária | ATENDIDO | Insp | sem `max-height`/`overflow-y` em tabelas; página usa rolagem normal |
| 10 | Sem overflow horizontal global | ATENDIDO | CDP | maxΔ = 0px em 200 medições (seção 4) |
| 11 | Offcanvas mobile correto | ATENDIDO | CDP | Δ=0px antes/durante/após; sem largura permanente (seção 8) |
| 12 | Formulários responsivos | ATENDIDO | Insp + Auto | `--readable` no "Novo atendimento"; e2e cobre criação; suites verdes |
| 13 | Tema claro | ATENDIDO | CDP | 100 medições claro, maxΔ 0px (seção 9) |
| 14 | Tema escuro | ATENDIDO | CDP | 100 medições escuro, maxΔ 0px (seção 9) |
| 15 | Outras páginas funcionais | ATENDIDO | Auto + CDP | 5 suites verdes; 5 páginas representativas medidas sem overflow |
| 16 | Todas as suites de regressão passam + BR-G2 preservado | ATENDIDO | Auto | 5 suites nas contagens de baseline; BR-G2 verde em e2e/tests/integration (seção 5 e regression.md) |

**Resumo:** 16/16 critérios atendidos. Os únicos itens em aberto (seção 10) são tolerâncias
visuais diferidas, classificadas **Não verificado**, que não contradizem nenhum critério —
a ausência de overflow nos mesmos tamanhos já está medida.

Sobre BR-G2 (nota interna nunca aparece ao aluno): preservado — a mudança foi só de
apresentação e não tocou `js/services/ticket-service.js` (`mensagensVisiveis`). Confirmado
verde em `tests/e2e.mjs`, `tests/tests.js` e `tests/integration.js` (de `regression.md`).

Restrições respeitadas: edições apenas na camada de apresentação dentro da pasta do
protótipo; arquivos protegidos e `tests/*` intactos; **nenhum commit git criado**.
