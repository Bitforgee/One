# Layout de painel verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: dac2832..ef737f1
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Scope: the fix range `a3bd34d..ef737f1` (91116cc, 484942c, c95d470, 6fb790d, ef737f1) and every round-1 verdict that was not PASS. All 48 proofs re-ran at `ef737f1`. Sections or rows not touched by the fix say `carried from a3bd34d`.

The fix closes round-1 gaps 1, 2, 4 and 5, and the breakpoint half of gap 3. Every proof is green: Vitest 273/273, Playwright 72/72, and each named test ran. The feature still fails on two points:

1. **C47 is proven on one screen of three.** Removing `pendente` from the `MenuAcoes` of Usuários and Documentos leaves the whole suite green (fault F2 survived).
2. **The new `## Exempted` list is partial.** Several values that `## Screens` decides have neither a check nor an exemption. Some were already named in round-1 gap 3; others were found this round on the screens the fix touched.

## Binding sources

Verified at ef737f1 for the screens whose interface the fix touched: Trocar senha (`Acesso.tsx`) and the row action menu (`Tabela.tsx` `MenuAcoes`, used by Artigos, Documentos and Usuários). This section also re-judges every round-1 `Uncovered` cell. The other rows are carried from a3bd34d.

Opened this round: the plan's `## Screens` table (binding, read in full), and the local template copies `data-table.tsx` (trigger at `:307-315`: `variant="ghost" size="icon"`, `size-8 text-muted-foreground`) and `nav-user.tsx` (`side={isMobile ? "bottom" : "right"}`, `h-8 w-8` avatar, `truncate` name and email, `DropdownMenuSeparator`).

The template opens the user menu at `bottom` on mobile, while `## Screens` says "acima no celular". C41 and the code follow `## Screens`. The Sheet's user button sits at the bottom of the screen, so even `bottom` would flip upward on collision. This is not a contradiction.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `## Screens` "área principal": "Trocar senha até 384 px" (round-1 gap 1) | yes | none - `web/src/acesso/Acesso.tsx:185` is now `max-w-sm` (384 px); `web/e2e/arranjo.spec.ts:374` asserts `<= 384`; C39 `:881` at 360 and 1280 | Trocar senha is listed among the "Exceções centralizadas", but its horizontal centring in the `main` has no check (code `mx-auto`, `Acesso.tsx:185`) |
| `## Screens` "casca, barra aberta" + "menu do usuário" (round-1 gap 2) | yes | none | - closed by C40 (`:894-902`) and C41 (`:915-921`) |
| `## Screens` "casca": `--sidebar` background, right border, institution on up to 2 lines (round-1 gap 2) | yes | none | - closed by C42 (`:948-954`) |
| `## Screens` "casca, janela < 768 px": dark overlay (round-1 gap 2) | yes | none | - closed by C43 (`:836-839`) |
| `## Screens` "Cadastros": `TabsList` left and "Novo" right on one row (round-1 gap 2) | yes | none | - closed by C44 (`:1129-1130`) |
| `## Screens` "Indicadores, vazio / erro / carregando": `Alert` placement and width (round-1 gap 2) | yes | none | - closed by C45 (`:997-998`) |
| `## Screens` values that round 1 listed with no exemption (round-1 gap 3), against the new `## Exempted` | yes | none | still open, neither checked nor named in `## Exempted`: header icon buttons 36 px ("Avisos", "Tema"); highlight footer 14 px `muted` on one line; compact label 14 px; table header text 14 px weight 500; empty row text centred (also AC 24 "centred", code `h-24 text-center` at `web/src/Tabela.tsx:33`, never asserted). Closed: header padding 16/24 (C46); highlight value 30 px (C46); access padding 24/40 (C46); 8 px corners and row hover (exempted as "raio da caixa", "cor do hover"); empty row 96 px (exempted as "altura das linhas") |
| `## Screens` rows covered by the new checks, re-enumerated this round (missed in round 1) | yes | none | neither checked nor exempted: header "borda inferior"; `h1` "numa linha truncada"; table "caixa com borda" and "borda entre" rows; highlight and compact value "peso 600" (`## Exempted` names only "peso do rótulo"); compact value `tabular-nums`; sidebar "os grupos rolam no meio"; collapsed bar "o quadrado das iniciais" |
| shadcn `data-table.tsx` row action trigger | yes | none - `MenuAcoes` keeps ghost/icon/`size-8`/muted; the Spinner while pending is the project's own AC 27 feedback | - |
| shadcn `site-header.tsx`, `page.tsx`, `section-cards.tsx`, `app-sidebar.tsx` | carried from a3bd34d | none | carried; see the rows above |

Facing the other way: the fix renders nothing that `## Screens` does not draw. The pending Spinner replaces the "⋮" only while a save is running.

## Checks

Verified at ef737f1. `cd web && npx vitest run --reporter=verbose` exit 0, 273 passed (34 files). Every named test below appears with `✓`: "estado inicial da barra por one-barra" ×4, "título do cabeçalho por rota" ×11, "papel do usuário por precedência" ×3, "lista vazia numa linha" ×3, and textos 16/16.

`docker compose up -d --build api`, then `cd web && npx playwright test --reporter=list` exit 0, 72 passed. Each named test appears with `✓`. No failure, so no rerun was needed and no flakiness was seen.

Citations in the 5 test files the fix touched (`arranjo.spec.ts`, `indicadores.test.tsx`, `listas.test.tsx`, `usuarios.test.tsx`, `artigos.test.tsx`) are refreshed. Every other citation is carried from a3bd34d.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | open bar 256 at x=0, full height; brand/institution above groups; user button at bottom; main at 256 | e2e "painel barra aberta" ✓ | `web/e2e/arranjo.spec.ts:766` `expect(Math.abs(b.width - 256)).toBeLessThanOrEqual(1)`; `:771-772`; `:774`; `:776` (unchanged lines) | PASS |
| C2 | toggle 48/256, `one-barra` | e2e "painel recolher e expandir" ✓ + vitest "alternar barra grava one-barra" ✓ | `web/e2e/arranjo.spec.ts:787-789` `expect.poll(() => largura(page)).toBe(48)`, `toBe('recolhida')`; `:791-793`; `web/src/acesso/acesso.test.tsx:469-473` (carried from a3bd34d) | PASS |
| C3 | initial state, 4 cases | vitest ×4 ✓ | `web/src/acesso/acesso.test.tsx:477-487` `expect(estado()).toBe(esperado)` (carried from a3bd34d) | PASS |
| C4 | collapsed: names kept, labels hidden, tooltip | e2e "painel barra recolhida" ✓ | `web/e2e/arranjo.spec.ts:807` `toBeLessThanOrEqual(1)`; `:809-811`; `:813` `toHaveText('Usuários')`; `:815` `toHaveText('Artigos')` | PASS |
| C5 | < 768: sheet x=0, min(288,w), 3 groups, 9 links, user button | e2e "painel no celular" ✓ | `web/e2e/arranjo.spec.ts:824` `toBeHidden()`; `:828-829`; `:831` `toHaveCount(3)`; `:832-833` | PASS |
| C6 | "Fila" closes the sheet, h1 Fila | e2e "painel no celular" ✓ | `web/e2e/arranjo.spec.ts:843` `expect(page.getByRole('dialog')).toHaveCount(0)`; `:844` `toHaveText('Fila')` | PASS |
| C7 | Ctrl+B / Meta+B | vitest "Ctrl+B alterna a barra" ✓ | `web/src/acesso/acesso.test.tsx:495-499` (carried from a3bd34d) | PASS |
| C8 | header 49, sticky, order, h1 16/500; Avisos left of Tema | e2e "painel cabeçalho" ✓ + "avisos no cabeçalho" ✓ | `web/e2e/arranjo.spec.ts:855` height 49; `:859` `Math.abs(c.y) <= 1`; `:866-869` order; `:870` `toEqual(['16px', '500'])`; `web/e2e/push.spec.ts:80-81` (carried) | PASS |
| C9 | h1 per route, 11 | vitest ×11 ✓ | `web/src/acesso/acesso.test.tsx:530`, `:532` `toHaveLength(1)` (carried from a3bd34d) | PASS |
| C10 | menu name, role ×3, Sair logs out | vitest "menu do usuário" ✓ + "papel..." ×3 ✓ | `web/src/acesso/acesso.test.tsx:545-546`, `:556-557` (carried from a3bd34d) | PASS |
| C11 | reduced motion | e2e "movimento reduzido na barra lateral" ✓ | `web/e2e/arranjo.spec.ts:1007` `transitionDuration` `toBe('0s')`; `:1011` `toBe(48)` | PASS |
| C12 | no `sidebar_state` cookie | vitest "sem cookie sidebar_state" ✓ | `web/src/acesso/acesso.test.tsx:509`, `:511` (carried from a3bd34d) | PASS |
| C13 | no horizontal scroll, 15 screens × 6 widths × 2 states | e2e "sem rolagem horizontal" ✓ (17.4 s) | `web/e2e/arranjo.spec.ts:1028` `expect(rolagem).toBeLessThanOrEqual(janela)` | PASS |
| C14 | container `main`; Fila 3/6 columns at 900 | e2e "colunas pela largura do main" ✓ | `web/e2e/arranjo.spec.ts:1039` `toEqual(['inline-size', 'main'])`; `:1041`; `:1045` | PASS |
| C15 | content padding 16/16, 16/24, 24/24 | e2e "recuos do conteúdo" ✓ | `web/e2e/arranjo.spec.ts:1145-1146` | PASS |
| C16 | 4 highlights, order, values, footers | vitest "destaques de Indicadores" ✓ | `web/src/indicadores/indicadores.test.tsx:116` `expect(cartoesDe(destaques)).toEqual([...])`; `:123` `toBe('FORM')` | PASS |
| C17 | value >= 24, tabular-nums, label 14; 1/2/4 columns | e2e "arranjo Indicadores" ✓ | `web/e2e/arranjo.spec.ts:270` destaques columns; `:282-284` (unchanged lines) | PASS |
| C18 | 9 compacts, 20 px, 2/3 columns | vitest ✓ + e2e ✓ | `web/src/indicadores/indicadores.test.tsx:128` `toEqual([...])`; `web/e2e/arranjo.spec.ts:271`, `:287` | PASS |
| C19 | ranking card, chart above table; side by side/stacked | vitest ✓ + e2e ✓ | `web/src/indicadores/indicadores.test.tsx:181` `DOCUMENT_POSITION_FOLLOWING`; `web/e2e/arranjo.spec.ts:272`, `:275` | PASS |
| C20 | period form, "Sem dados", error, Spinner as today; only the rankings class changes (amended ef737f1) | the 3 named vitest ✓ | `web/src/indicadores/indicadores.test.tsx:29` `findByText('Sem dados no período')`; `:219-225` (form); `:74-86` values; `:94` `toHaveClass('grid-cols-1', '@4xl/main:grid-cols-2')` - the only changed assertion, now named in the claim. Error: `web/src/indicadores/textos.test.tsx:64` (runs in C34's proof) and C45's e2e. Spinner: C45's vitest `indicadores.test.tsx:55-56`. The round-1 wording precision gap is closed by the user-approved amendment | PASS |
| C21 | column headers, 7 lists | 3 vitest ✓ | `web/src/chamados/listas.test.tsx:47`, `:56` `expect(cabecalhos()).toEqual([...])`; `web/src/administracao/admin.test.tsx:38,44,53` (carried); `web/src/conhecimento/artigos.test.tsx:57,63` | PASS |
| C22 | "largo" hidden at 360, 12 px detail line, header `--muted` | e2e "colunas largas somem no estreito" ✓ | `web/e2e/arranjo.spec.ts:1064` `toHaveCount(0)`; `:1066-1067` `toBe('12px')`; `:1077` muted; `:1081-1082` | PASS |
| C23 | Estado click opens ticket; number link focusable | e2e "linha da lista abre o chamado" ✓ | `web/e2e/arranjo.spec.ts:1095` `toHaveURL(/\/univag\/chamados\/ONE-123$/)`; `:1104` | PASS |
| C24 | empty: 1 row, colSpan, 6 screens | 3 vitest ✓ | `web/src/test/util.tsx:102-106` (carried); called at `web/src/chamados/listas.test.tsx:66,72`, `web/src/administracao/admin.test.tsx:69,74` (carried), `web/src/conhecimento/artigos.test.tsx:71,77` | PASS |
| C25 | "Ações de" menu, 7 cases | 3 vitest ✓ | `web/src/administracao/usuarios.test.tsx:44-45` `toEqual(['Editar', 'Desativar!'])`; `web/src/conhecimento/artigos.test.tsx:85-87`; `web/src/conhecimento/documentos.test.tsx:84-85` (carried); `web/src/test/util.tsx:91` (carried) | PASS |
| C26 | Cadastros select at 360, tabs at 1440 | e2e "Cadastros com select no estreito" ✓ | `web/e2e/arranjo.spec.ts:1117-1118`; `:1120`; `:1124-1125` | PASS |
| C27 | Novo, dialogs, editors as today | 5 vitest ✓ | `web/src/administracao/usuarios.test.tsx:94` `getByText('Desativar Carla?')`, `:100`; `:59`; `web/src/administracao/cadastros.test.tsx:66` (carried); `web/src/conhecimento/documentos.test.tsx:51` (carried); `web/src/conhecimento/artigos.test.tsx:30` | PASS |
| C28 | detail 2 columns at 1440 | e2e "detalhe em duas colunas" ✓ | `web/e2e/arranjo.spec.ts:184-188` (unchanged lines) | PASS |
| C29 | one column at 360 and 1280 | e2e ×2 ✓ | `web/e2e/arranjo.spec.ts:204` (unchanged line) | PASS |
| C30 | title h2, number h1 | vitest ✓ | `web/src/chamados/chamado.test.tsx:50-52` (carried from a3bd34d) | PASS |
| C31 | Assistente <= 768 centred; composer <= 16 px | e2e ×2 ✓ | `web/e2e/arranjo.spec.ts:162,164`; `:86` (unchanged lines) | PASS |
| C32 | 4 access screens centred, <= 384 | e2e ×4 ✓ | `web/e2e/arranjo.spec.ts:388-390` (unchanged lines) | PASS |
| C33 | same API calls; suites green | `chamadas_iguais.py dac2832` exit 0 ("238 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD"); `--autoteste` ok; vitest 273/273; playwright 72/72 | `.specs/features/layout-painel/chamadas_iguais.py:17-31` `REESCRITOS` - untouched by the fix (no rename in a3bd34d..ef737f1) | PASS |
| C34 | only *(novo)* texts | 6 textos files ✓ (16 tests) | `web/src/acesso/textos.test.tsx:8` etc. (carried from a3bd34d; the fix adds no visible text: the Spinner is `role="status"` with an accessible name only) | PASS |
| C35 | tokens unchanged; sidebar contrast >= 4.5 | vitest ×2 ✓ | `web/src/test/interface.test.ts:181`, `:192` (carried from a3bd34d) | PASS |
| C36 | crapper 0 at 9.99, dryer clean; mutator suspended | `npm --prefix web run coverage` exit 0; `crapper ... --threshold 9.99` exit 0 (worst `Sidebar` 9.8, `SidebarProvider` 9.5; `MenuAcoes` 2.0); dryer `grep -q` exit 0. `mutator` not run, suspended (AD-025) | `web/src/ui/sidebar.tsx` `Sidebar` CRAP 9.8 (`web/.metrics/crap.edn`) | PASS |
| C37 | build + structure | `npm --prefix web run build` exit 0; vitest "estrutura em fatias" ✓ | `web/src/test/estrutura.test.ts:28` (carried) | PASS |
| C38 | no drawer, no vaul | vitest "sem gaveta Vaul" ✓ | `web/src/test/interface.test.ts:197-199` (carried) | PASS |
| C39 | Trocar senha <= 384 at 360 and 1280 | e2e "Trocar senha até 384 px" ✓ | `web/e2e/arranjo.spec.ts:881` `expect(width).toBeLessThanOrEqual(384)` in a loop over `[360, 1280]`; also `:374` | PASS |
| C40 | initials 32×32; name and role on 2 ellipsis lines; chevron on the right | e2e "botão do usuário" ✓ | `web/e2e/arranjo.spec.ts:894` `toEqual([32, 32])`; `:898-899`; `:900` `textOverflow` `toBe('ellipsis')`; `:901` `svg.lucide-chevrons-up-down` right of texts | PASS |
| C41 | menu: name/role, separator, Sair+LogOut; right at 1280 open, above at 360 | e2e "menu do usuário abre ao lado" ✓ | `web/e2e/arranjo.spec.ts:918` `toEqual([[null, 'AnaAdministrador'], ['separator', ''], ['menuitem', 'Sair']])`; `:915` `m.x >= b.x + b.width - 1`; `:916` `m.y + m.height <= b.y + 1`; `:920`; `:921` `svg.lucide-log-out`. Builder deviation (button box read before opening): accepted. Opening a modal dropdown hides the rest of the tree from accessibility but does not move the trigger, and fault F4 shows the side assertion bites | PASS |
| C42 | `--sidebar` background, 1 px right border, institution in up to 2 lines | e2e "barra com fundo, borda e instituição" ✓ | `web/e2e/arranjo.spec.ts:948` `toBe(token)`; `:949` `toBe('1px')`; `:952-954` | PASS |
| C43 | overlay behind the sheet at 360, alpha > 0 | e2e "painel no celular" ✓ (looped at 360/390/767) | `web/e2e/arranjo.spec.ts:836` `toBeVisible()`; `:838` `toEqual([0, 0, w, 740])`; `:839` alpha `toBeGreaterThan(0)` | PASS |
| C44 | Cadastros 1440: tabs left, Novo right, same row | e2e "Cadastros com select no estreito" ✓ | `web/e2e/arranjo.spec.ts:1129` centres within 4 px; `:1130` `novo.x >= a.x + a.width - 1` | PASS |
| C45 | empty and error `Alert` below the toolbar at block width, at 360/1280; Consultar Spinner + disabled | e2e "alertas de Indicadores" ✓ + vitest "Consultar mostra o Spinner enquanto busca" ✓ | `web/e2e/arranjo.spec.ts:997` `a.y >= f.y + f.height - 1`; `:998` `Math.abs(a.width - bloco.width) <= 1` (loop over `[200 semDados, 500] × [360, 1280]`; `bloco` = `main > div > div`, the screen's `flex-col` wrapper, `Indicadores.tsx:182`); `web/src/indicadores/indicadores.test.tsx:55` `expect(consultar).toBeDisabled()`; `:56` `within(consultar).getByRole('status')`; `:58-59` back to enabled, no status | PASS |
| C46 | header padding 16@768 / 24@1024; access padding 24@360 / 40@768; highlight value 24@1328 / 30@1440 | e2e "quebras medidas dos dois lados" ✓ | `web/e2e/arranjo.spec.ts:964` `toBe(esperado)` header; `:971` access; `:980` card width `< 250` / `>= 250`; `:981` `fontSize` `toBe(fonte)` | PASS |
| C47 | while a row action saves (Ativar, Arquivar, Desativar, Nova versão), the "Ações de" trigger shows the Spinner and is disabled, "como os botões soltos de hoje" | vitest "ações de linha mostram o Spinner enquanto gravam" ✓ | `web/src/conhecimento/artigos.test.tsx:104` `expect(gatilho).toBeDisabled()`; `:105` `within(gatilho).getByRole('status')`; `:107-108`. Only Artigos/Ativar is exercised. Desativar (Usuários, `web/src/administracao/Usuarios.tsx:53`) and Nova versão/Arquivar (Documentos, `web/src/conhecimento/Documentos.tsx:64`) have no proof: fault F2 removed both wirings and all 273 Vitest tests stayed green. Precision gap: "como os botões soltos de hoje" is false for 3 of the 4. At `dac2832` only "Ativar" showed a Spinner (`web/src/conhecimento/Artigos.tsx:77` `BotaoAcao`); Arquivar, Nova versão and the Documentos buttons were only `disabled`; the Usuários row buttons had no pending state | FAIL |
| C48 | exact assertions restored: `/^Aluno$/` on the cell; `$` anchors on number and title cells | 2 vitest ✓ | `web/src/administracao/usuarios.test.tsx:35` `getAllByRole('cell')[3]).toHaveTextContent(/^Aluno$/)`; `web/src/chamados/listas.test.tsx:49` `/^ONE-1$/`, `:50` `/^boleto.*1 dia$/`, `:57` `/^ONE-3$/`, `:58` `/^histórico$/`. Builder deviation (`.*` between the title and "1 dia"): accepted. In jsdom the title cell also holds the narrow detail line. The anchors still forbid trailing text, which was the round-1 point, and the middle is pinned by the substring at `listas.test.tsx:25` | PASS |

## Coverage

Verified at ef737f1 for the rows whose authority the fix touched and for the sets that C39-C48 introduce. The other rows are carried from a3bd34d with the same members and proofs; their tests re-ran green above.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| access width caps (4 screens + Trocar senha) | `## Screens` "Login, Primeiro acesso, Definir senha", "raiz", "área principal" exception | Login, Primeiro acesso, Definir senha, raiz -> C32 · Trocar senha 384 -> C39 (`arranjo.spec.ts:881`) | - |
| Indicadores states under AC 20 (4) | AC 20 / C20 claim | period form `indicadores.test.tsx:219-225` · empty `:29` · error `textos.test.tsx:64` and C45 e2e `:986-998` (500) · Spinner `indicadores.test.tsx:55-56` | - |
| user button parts (3) | `## Screens` "casca, barra aberta" | initials square C40 `:894` · name/role 2 truncated lines `:899-900` · `ChevronsUpDown` `:901` | - |
| user menu items in order (3) and side (2) | `## Screens` "menu do usuário" | name+role, separator, Sair -> C41 `:918` · right (open bar) `:915` · above (mobile) `:916` | - |
| sidebar surface facts (3) | `## Screens` "casca, barra aberta" | background C42 `:948` · right border `:949` · institution wrap `:952-954` | - |
| Indicadores alerts (2 kinds × 2 widths) | `## Screens` "vazio / erro / carregando" | C45, loop over `[semDados 200, erro 500] × [360, 1280]` `:997-998` | - |
| breakpoint sides newly measured (3 breakpoints × 2 sides) | `## Screens` header, access, highlight rows | header 768/1024 C46 `:964` · access 360/768 `:971` · card <250/>=250 `:980-981` | - |
| row-action pending feedback (3 screens: Artigos {Ativar, Arquivar}, Documentos {Nova versão, Arquivar}, Usuários {Desativar}) | the code: `MenuAcoes` `pendente` in `Tabela.tsx:52-57`, passed at `Artigos.tsx:73`, `Documentos.tsx:64`, `Usuarios.tsx:53` | Artigos (shared `pendente` prop, both items) -> C47 `artigos.test.tsx:104-108` | Usuários (Desativar) and Documentos (Nova versão, Arquivar): no proof; F2 survived |
| restored exact assertions (2 files) | round-1 gap 5 | `usuarios.test.tsx:35` · `listas.test.tsx:49-50,57-58` | - |
| sidebar states (3), one-barra values (4), h1 per route (11), role precedence (3), action menu by row state (7), no-scroll widths (6) × screens (15), highlights (4) and compacts (9), Indicadores grid breakpoints, lists as tables (7), "largo" screens (5), empty (6), detail states (2), sidebar-token themes (3) | carried from a3bd34d | carried from a3bd34d; every proof re-ran green at ef737f1 | - |

## Test policy rows

Verified at ef737f1 for the unmet row and for the rows classifying touched files (`Acesso.tsx`, `Tabela.tsx`, `Usuarios.tsx`, `Artigos.tsx`, `Documentos.tsx`). The other rows are carried from a3bd34d.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| route -> title map, role precedence, initial bar state (decide) | `web/src/Autenticado.tsx` | Vitest, one case per row: C9 (11), C10 (3), C3 (4) | yes (carried from a3bd34d; re-ran green) |
| action-menu conditions (decide) | `Usuarios.tsx`, `Artigos.tsx`, `Documentos.tsx` | Vitest, one case per row state: C25 (7) | yes - `pendente` adds no new condition on which actions appear; C25's 7 cases re-ran green |
| arrangement and container queries | `Autenticado.tsx`, `Tabela.tsx`, `Cabecalho.tsx`, `Indicadores.tsx`, `ChamadoDetalhe.tsx`, `Cadastros.tsx`, `Acesso.tsx`, `Assistente.tsx` | Playwright on each side of every breakpoint in `## Screens` | yes - the three round-1 misses are now measured on both sides (C46 `:964`, `:971`, `:980-981`), and Trocar senha is measured against 384 (C39). Every other breakpoint keeps its measurement on both sides from round 1. The values with no breakpoint that stay uncovered are a step-1 finding (Binding sources), not this row's |
| components copied into `web/src/ui/` | `sidebar.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `separator.tsx`, `skeleton.tsx`, `use-mobile.ts` | none of their own | yes (carried; crapper 0, worst `Sidebar` 9.8) |

Swept `existing` rows: carried from a3bd34d. The fix touched none of `ErroDe`/`Situacao`, the `Menu` role filter or `radix-ui`.

## Faults injected

Verified at ef737f1. Isolation: `git worktree add <scratchpad>/wt2 HEAD` with `web/node_modules` as a junction, removed with `rmdir` before `git worktree remove --force`. The leftover `vite preview` process was stopped and the directory deleted. `git worktree list` shows only `D:/one-system`. Real-tree porcelain before and after: `?? .idea/`, `?? .playwright-mcp/`, identical.

E2e faults ran against `npx vite build` + `npx vite preview --port 4179` from the worktree with `E2E_URL=http://localhost:4179`. Each was confirmed in the served bundle. The control "painel recolher e expandir" passed in every run, and each later run showed the earlier fault reverted: after F3 the `420px` count went back to 0, and C41 passed again under F5.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 `MenuAcoes` never shows the Spinner while pending (`{pendente ? <Spinner /> : <EllipsisVertical/>}` -> always the ellipsis) | `web/src/Tabela.tsx:57` | yes - C47 "ações de linha mostram o Spinner enquanto gravam" failed |
| F2 Usuários and Documentos stop passing `pendente` to `MenuAcoes` | `web/src/administracao/Usuarios.tsx:53`, `web/src/conhecimento/Documentos.tsx:64` | no - full `npx vitest run` 273/273 green; no e2e reaches a pending save |
| F3 Trocar senha back to `max-w-[420px]` | `web/src/acesso/Acesso.tsx:185` | yes - C39 "Trocar senha até 384 px" and "arranjo telas de acesso" failed (`Expected: <= 384, Received: 420`) |
| F4 user menu side swapped (`isMobile ? 'right' : 'top'`) | `web/src/Autenticado.tsx:148` | yes - C41 "menu do usuário abre ao lado" failed at `:915` "à direita do botão" |
| F5 header loses `lg:px-6` | `web/src/Autenticado.tsx:194` | yes - C46 "quebras medidas dos dois lados" failed: "cabeçalho a 1024 px", expected `24px`, received `16px` |

## Gate

Verified at ef737f1.

- `cd web && npx vitest run --reporter=verbose`: 273 passed, 0 failed
- `docker compose up -d --build api`, then `cd web && npx playwright test --reporter=list`: 72 passed, 0 failed, no retries
- `npm --prefix web install vaul@1.1.2 --no-save`, then `python .specs/features/layout-painel/chamadas_iguais.py dac2832`: exit 0, 238 base tests, 0 problems. `--autoteste` ok. `npm --prefix web install` restored `node_modules` (`vaul` gone); nothing committed; porcelain unchanged
- `npm --prefix web run coverage`, then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. Worst: `Sidebar` 9.8
- dryer (the C36 command) with `grep -q "No duplicate candidates found"`: exit 0
- `npm --prefix web run build`: exit 0
- `mutator`: not run, suspended by user decision (AD-025)

Ranked gaps:

1. **C47 proven on one screen of three; mutant F2 survived.** Removing `pendente` from `MenuAcoes` in Usuários (`web/src/administracao/Usuarios.tsx:53`) and Documentos (`web/src/conhecimento/Documentos.tsx:64`) leaves every test green. Desativar, Nova versão and the Documentos Arquivar have no proof. The claim's "como os botões soltos de hoje" is also false for those three: at `dac2832` only "Ativar" had a Spinner. This is a precision gap in C47.
2. **`## Exempted` is partial; `## Screens` values are neither checked nor exempted.**
   - Still open from round 1: header icon buttons 36 px; highlight footer 14 px `muted` on one line; compact label 14 px; table header text 14 px weight 500; empty-row text centred (AC 24 "centred").
   - Found this round: Trocar senha horizontal centring in the `main`; header bottom border; `h1` single truncated line; table box border and row borders; value weight 600 in highlights and compacts; compact `tabular-nums`; sidebar group region scrolling; the initials square on the collapsed bar.
