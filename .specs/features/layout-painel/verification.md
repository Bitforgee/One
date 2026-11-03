# Layout de painel verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: dac2832..a3bd34d
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 38 checks have a green proof at `a3bd34d` with a located assertion, and all 5 faults were killed. The feature still fails on step 1 and the `Test policy` row for arrangement. `## Screens` decides several elements and arrangements that no check covers. One of them, Trocar senha capped at 384 px, is built differently: the code uses 420 px and an existing e2e asserts 420. Coverage also has one member with no proof: the "Consultar" Spinner of C20.

## Binding sources

Opened: the plan's `## Screens` table, which is binding and was read in full. The shadcn dashboard example was read as files: the local copies of `site-header.tsx`, `app-sidebar.tsx`, `nav-user.tsx`, `nav-main.tsx` and `data-table.tsx`, and `page.tsx` and `section-cards.tsx` downloaded with curl from `raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/app/(app)/examples/dashboard/`. Upstream `site-header.tsx` and `app-sidebar.tsx` are byte-identical to the local copies. The template uses `collapsible="none"` and has no `SidebarTrigger`. The plan deliberately took `collapsible="icon"` and the trigger from the user's answers, and `## Screens` records that, so this is not a contradiction.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `## Screens` row "área principal": exception "Trocar senha até 384 px" | yes | code `web/src/acesso/Acesso.tsx:185` is `max-w-[420px]`; e2e `web/e2e/arranjo.spec.ts:374` asserts `<= 420`. No check names it | Trocar senha column width (384 px): no check, and the build differs |
| `## Screens` row "Cadastros": wide layout, `TabsList` on the left and "Novo" on the right in the same row | yes | none | "Novo" on the tabs row at `@4xl/main`: no check, no test. C26 only checks that the tabs and the select are visible |
| `## Screens` rows "casca, barra aberta" and "menu do usuário": user button composition and user menu order and placement | yes | none | initials in a 32 px square, name and role on 2 truncated lines, `ChevronsUpDown`; menu with name and role, then a separator, then "Sair"; opens to the right (open sidebar) or above (mobile). C10 checks only the contents |
| `## Screens` row "casca, barra aberta": brand and institution "numa linha que pode quebrar em 2", sidebar background `--sidebar`, right border | yes | none | the old e2e assertions (2 lines with no ellipsis, `--sidebar` background, 1 px right border) were deleted in `arranjo.spec.ts` and not replaced |
| `## Screens` row "casca, janela < 768 px": "fundo escurecido atrás" of the `Sheet` | yes | none | overlay: no check |
| `## Screens` row "Indicadores, vazio / erro / carregando": the `Alert` spans the content width, below the toolbar | yes | none | Alert placement: no check |
| `## Screens` values with no enumerated exemption: header icon buttons 36 px and header padding 16/24 px (lg); highlight value 30 px when the card is >= 250 px; footer 14 px muted on one line; compact label 14 px; table header text 14 px weight 500, 8 px corners, row hover; empty row 96 px; access card padding 40 px from 768 px | yes | none | `checks.md` has no exemption list naming these per screen, so they are uncovered rather than exempted |
| shadcn `site-header.tsx` / `page.tsx` (header `h-(--header-height)` = 49 px, `text-base font-medium` h1, `@container/main`, `px-4 lg:px-6`, `py-4 md:py-6`) | yes | none | - (C8, C14, C15) |
| shadcn `section-cards.tsx` (`@xl/main:grid-cols-2 @5xl/main:grid-cols-4`, `text-2xl tabular-nums`, `shadow-xs`) | yes | none | - (C16, C17; `shadow-xs` also in e2e "cartões sem sombra") |
| shadcn `nav-user.tsx` (DropdownMenu, LogOut item) | yes | none | composition, see the user-button row above |
| shadcn `data-table.tsx` (bordered box, `bg-muted` sticky header, empty row `h-24 text-center`) | yes | none | the 96 px and centring of the empty row: C24 checks only `colSpan` and text |

Covered by a test that no check names (it ran green under C33's full suite): the Indicadores period toolbar in "arranjo Indicadores" (`arranjo.spec.ts:259-261, 301`, inside C17's proof); the Artigos and Documentos toolbars in "arranjo Artigos e Documentos" (`arranjo.spec.ts:411-419`); "Novo" on the right in Usuários (`arranjo.spec.ts:449`); the Matrículas result `Alert` below "Importar" (`arranjo.spec.ts:605`); "Estado" as a `Badge` (`arranjo.spec.ts:319, 960`). The check text is silent on these, so they are noted here and not counted as findings.

Facing the other way, the code renders nothing the design does not draw. The `GraduationCap` brand icon stands in for the template's logo icon, and the "Ações" card only appears when the row has some action. Neither is a new visible text.

## Checks

Vitest ran once over the whole suite: `cd web && npx vitest run --reporter=verbose`, exit 0, 271 passed, and every named test appears individually as passed. Playwright ran once over the whole suite against the `api` container rebuilt from HEAD (`docker compose up -d --build api`): `cd web && npx playwright test --reporter=list`, exit 0, 66 passed, every named test individually present, no flakiness seen.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | open sidebar 256 px at x=0, full height; brand/institution above groups; user button at the bottom; main at 256 | e2e "painel barra aberta" passed | `web/e2e/arranjo.spec.ts:766` `expect(Math.abs(b.width - 256)).toBeLessThanOrEqual(1)`; `:771-772` brand and institution above the 1st group; `:774` user button <= 16 px from the end; `:776` main x 256 | PASS |
| C2 | toggle 48/256, main 48/256, one-barra recolhida/aberta | e2e "painel recolher e expandir" + vitest "alternar barra grava one-barra" passed | `web/e2e/arranjo.spec.ts:787-789` `expect.poll(() => largura(page)).toBe(48)`, `localStorage... toBe('recolhida')`; `:791-793`; `web/src/acesso/acesso.test.tsx:469-473` | PASS |
| C3 | initial state from one-barra, 4 cases | vitest "estado inicial da barra por one-barra" (recolhida/aberta/null/xyz) passed | `web/src/acesso/acesso.test.tsx:477-487` `expect(estado()).toBe(esperado)` | PASS |
| C4 | collapsed: names kept, labels/groups/institution invisible, tooltip on hover and focus | e2e "painel barra recolhida" passed | `web/e2e/arranjo.spec.ts:807` label width `<= 1`; `:809-811`; `:813` `toHaveText('Usuários')` (hover); `:815` (focus) | PASS |
| C5 | < 768: no fixed sidebar; sheet at x=0, min(288, w), 3 groups, 9 links, user button | e2e "painel no celular" passed | `web/e2e/arranjo.spec.ts:824` `toBeHidden()`; `:828-829` x and `Math.min(288, w)`; `:831` `toHaveCount(3)`; `:832-833` | PASS |
| C6 | picking "Fila" closes the sheet, h1 Fila | e2e "painel no celular" passed | `web/e2e/arranjo.spec.ts:837` `expect(page.getByRole('dialog')).toHaveCount(0)`; `:838` `toHaveText('Fila')` | PASS |
| C7 | Ctrl+B and Meta+B toggle | vitest "Ctrl+B alterna a barra" passed | `web/src/acesso/acesso.test.tsx:495-499` `expect(estado()).toBe('collapsed')` / `'expanded'` | PASS |
| C8 | header 49 px, sticky, order button, separator, h1 16/500, Tema on the right; Avisos left of Tema | e2e "painel cabeçalho" + "avisos no cabeçalho" passed | `web/e2e/arranjo.spec.ts:849` height 49; `:853` y 0 after scrolling; `:860-863` order; `:864` `toEqual(['16px', '500'])`; `web/e2e/push.spec.ts:80-81` | PASS |
| C9 | h1 per route, 11 routes, exactly 1 h1 | vitest "título do cabeçalho por rota" (11 cases) passed | `web/src/acesso/acesso.test.tsx:530` `findByRole('heading', { level: 1, name: titulo })`; `:532` `toHaveLength(1)` | PASS |
| C10 | menu: name, role by precedence (3 cases), "Sair" logs out | vitest "papel do usuário por precedência" (3) + "menu do usuário" passed | `web/src/acesso/acesso.test.tsx:545-546` `getByText(papel)`; `:556-557` login screen + 1 `POST /api/auth/logout` | PASS |
| C11 | reduced motion: no transition | e2e "movimento reduzido na barra lateral" passed | `web/e2e/arranjo.spec.ts:873` `transitionDuration` `toBe('0s')`; `:877` `toBe(48)` | PASS |
| C12 | no `sidebar_state` cookie, no `document.cookie` in src | vitest "sem cookie sidebar_state" passed | `web/src/acesso/acesso.test.tsx:509` `not.toContain('sidebar_state')`; `:511` `toEqual([])` | PASS |
| C13 | no horizontal scroll: 15 screens x 6 widths x open/collapsed, long texts | e2e "sem rolagem horizontal" passed | `web/e2e/arranjo.spec.ts:894` `expect(rolagem).toBeLessThanOrEqual(janela)`, looping over `Telas` (15 rows, `web/e2e/simulada.ts`) with `simularApi(page, undefined, true)` | PASS |
| C14 | main is container `main`; at 900 px, Fila has 3 columns open and 6 collapsed | e2e "colunas pela largura do main" passed | `web/e2e/arranjo.spec.ts:905` `toEqual(['inline-size', 'main'])`; `:907`; `:911` | PASS |
| C15 | padding 16/16 at 360, 16/24 at 768 collapsed, 24/24 at 1280 | e2e "recuos do conteúdo" passed | `web/e2e/arranjo.spec.ts:1006-1007` | PASS |
| C16 | 4 highlights in order, values and exact footers | vitest "destaques de Indicadores" passed | `web/src/indicadores/indicadores.test.tsx:87-92` `toEqual([['Indicador principal','12,3%','Resolvidas sem reabertura, ...'], ...])`; `:94` previous sibling is the FORM | PASS |
| C17 | value >= 24 px, tabular-nums, label 14 px; 1/2/4 columns at 360/1280/1440 | e2e "arranjo Indicadores" passed | `web/e2e/arranjo.spec.ts:270` highlight columns; `:282-284` | PASS |
| C18 | 9 compacts in today's order, 20 px, 2/3 columns | vitest "indicadores compactos na ordem" + e2e "arranjo Indicadores" passed | `web/src/indicadores/indicadores.test.tsx:99-109`; `web/e2e/arranjo.spec.ts:271`, `:287` `<= 0.5` | PASS |
| C19 | ranking card: chart above table; side by side at 1440, stacked at 360 | vitest "ranking com gráfico acima da tabela" + e2e passed | `web/src/indicadores/indicadores.test.tsx:152` `DOCUMENT_POSITION_FOLLOWING`; `web/e2e/arranjo.spec.ts:272`, `:275`, `:295` | PASS |
| C20 | period form, "Sem dados", error and Spinner as today | the 3 named vitest tests passed | `web/src/indicadores/indicadores.test.tsx:29` `findByText('Sem dados no período')`; `:190-196` (form); `:45-57` (values unchanged). The error is proven outside C20's proofs, at `web/src/indicadores/textos.test.tsx:64` `findByRole('alert')).toHaveTextContent('Falha ao calcular.')`. Spinner: no assertion anywhere, at base or HEAD (see Coverage). The assertion at `indicadores.test.tsx:65` changed from `md:grid-cols-2` to `@4xl/main:grid-cols-2`: it is not a weakening (same strength, required by AC 19 and AC 14), but it makes C20's wording "sem mudança de asserção" literally false - precision gap in the check | PASS |
| C21 | columns per table, 7 lists | the 3 vitest tests passed | `web/src/chamados/listas.test.tsx:47,53` `expect(cabecalhos()).toEqual([...])`; `web/src/administracao/admin.test.tsx:38,44,53`; `web/src/conhecimento/artigos.test.tsx:57,63` | PASS |
| C22 | "largo" columns hidden at 360 with a 12 px " · " line, shown at 1280; header `--muted` | e2e "colunas largas somem no estreito" passed | `web/e2e/arranjo.spec.ts:930` `toHaveCount(0)`; `:932-933` text + `toBe('12px')`; `:943` muted; `:947-948` | PASS |
| C23 | clicking "Estado" opens the ticket; number is an `<a>` reachable by Tab | e2e "linha da lista abre o chamado" passed | `web/e2e/arranjo.spec.ts:961` `toHaveURL(/\/univag\/chamados\/ONE-123$/)`; `:970` | PASS |
| C24 | empty: 1 row, colSpan = columns, 6 screens | the 3 vitest "lista vazia numa linha" tests passed | `web/src/test/util.tsx:102-106` `toHaveLength(1)`, `toHaveAttribute('colspan', ...)`; called at `web/src/chamados/listas.test.tsx:61,67`, `web/src/administracao/admin.test.tsx:69,74`, `web/src/conhecimento/artigos.test.tsx:71,77` | PASS |
| C25 | "Ações de" menu, 7 cases, menuitem + destructive | the 3 vitest tests passed | `web/src/administracao/usuarios.test.tsx:43-44`; `web/src/conhecimento/artigos.test.tsx:85-87` `toEqual(['Editar', 'Ativar', 'Arquivar!'])`; `web/src/conhecimento/documentos.test.tsx:84-85`; `web/src/test/util.tsx:91` (`menuitem`, `data-variant`) | PASS |
| C26 | Cadastros: select "Cadastro" with 5 options at 360, tabs at 1440 | e2e "Cadastros com select no estreito" passed | `web/e2e/arranjo.spec.ts:983-984`; `:986`; `:990-991` | PASS |
| C27 | Novo, dialogs, editors as today | the 5 named vitest tests passed | `web/src/administracao/usuarios.test.tsx:93` `getByText('Desativar Carla?')`, `:99`; `:58`; `web/src/administracao/cadastros.test.tsx:66`; `web/src/conhecimento/documentos.test.tsx:51`; `web/src/conhecimento/artigos.test.tsx:30` | PASS |
| C28 | detail at 1440: right column 320 px, Ações above history, Assumir inside | e2e "detalhe em duas colunas" passed | `web/e2e/arranjo.spec.ts:184-188` | PASS |
| C29 | one column at 360 and 1280 open, in order | e2e "detalhe em uma coluna a 360 px" and "a 1280 px" passed | `web/e2e/arranjo.spec.ts:204` `expect(ys[i]).toBeGreaterThan(ys[i - 1])` | PASS |
| C30 | title in h2, number in the h1 | vitest "título do chamado em h2" passed | `web/src/chamados/chamado.test.tsx:50-52` | PASS |
| C31 | Assistente column <= 768 px, centred; composer <= 16 px from the bottom | e2e "arranjo Assistente" + "compositor visível..." passed | `web/e2e/arranjo.spec.ts:162,164`; `:86` | PASS |
| C32 | 4 access screens: card <= 384, centred horizontally and vertically, at 360/1280 | 4 e2e "telas de acesso centralizadas ..." passed | `web/e2e/arranjo.spec.ts:388-390` | PASS |
| C33 | same API calls; whole suites green | `python .specs/features/layout-painel/chamadas_iguais.py dac2832` exit 0 ("238 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD"; `vaul@1.1.2 --no-save` before, `npm install` after); `--autoteste` exit 0; vitest 271/271; playwright 66/66 | `.specs/features/layout-painel/chamadas_iguais.py:17-31` `REESCRITOS` (9 entries) match the "Settled mid-build (1)" line in `## Handoff` one to one. On weakening, see the note under Test policy | PASS |
| C34 | only the *(novo)* texts | the 6 textos files passed (16 tests) | `web/src/acesso/textos.test.tsx:8` (roles); `web/src/indicadores/textos.test.tsx:16` (footers); `web/src/chamados/textos.test.tsx:22` ("Ações"); `web/src/conhecimento/textos.test.tsx:11`; `web/src/administracao/textos.test.tsx:23,150` | PASS |
| C35 | tokens unchanged; sidebar contrast >= 4.5 in 3 themes | vitest "tokens de Visual" + "contraste dos tokens da barra" passed | `web/src/test/interface.test.ts:181` `toBe(esperado)`; `:192` `toBeGreaterThanOrEqual(4.5)` | PASS |
| C36 | crapper 0 at 9.99, dryer with no candidate; mutator suspended | `npm --prefix web run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` exit 0 (worst `Sidebar` 9.8, `SidebarProvider` 9.5, `chamados.ChamadoDetalhe/Detalhe` 9.0); the dryer command from C36 with `grep -q` exit 0. `mutator`: not run, suspended by user decision (AD-025) | `web/src/ui/sidebar.tsx` (`Sidebar` CRAP 9.8 < 9.99, in `web/.metrics/crap.edn`) | PASS |
| C37 | build + structure test | `npm --prefix web run build` exit 0; vitest "estrutura em fatias" passed | `web/src/test/estrutura.test.ts:28` | PASS |
| C38 | no `ui/drawer`, no `vaul` | vitest "sem gaveta Vaul" passed | `web/src/test/interface.test.ts:197-199` `expect(todas).not.toHaveProperty(['vaul'])` | PASS |

## Coverage

Recomputed from the authority over each set: `## Screens` and the plan's `Landing` for design sets, the code for implementation sets.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| sidebar states (3) | plan door 1 | open C1 · collapsed C2, C4 · mobile C5, C6 | - |
| one-barra values (4) | plan door 2 | recolhida, aberta, null, xyz -> C3 (`acesso.test.tsx:477-487`) | - |
| h1 per route (11) | `Menu` in `web/src/Autenticado.tsx:18-28` (9) + `chamados/:numero` + `trocar-senha` | C9, 11 cases | - |
| role precedence (3) | `Papeis` in `Autenticado.tsx` | C10, 3 cases | - |
| action menu by row state (7) | conditions in `Usuarios.tsx:52`, `Artigos.tsx:75,80`, Documentos | C25, 7 cases | - |
| no-scroll widths (6) x screens (15) | AC 13 / `Telas` in `web/e2e/simulada.ts` | C13 | - |
| highlights (4) and compacts (9) | `## Screens` | C16, C18 | - |
| Indicadores grid breakpoints: highlights 576/1024, compacts 768, rankings 896, toolbar 768 | `## Screens` | C17 (360/1280/1440), C18, C19; toolbar in "arranjo Indicadores" (360/1280) | - |
| lists as tables (7) | AC 21 | C21 | - |
| "largo" screens (5) | `## Screens` | C22, all 5 | - |
| empty (6) | AC 24 | C24 | - |
| detail states (2) | AC 28/29 | C28 · C29 | - |
| access screens (4 + Trocar senha exception) | `## Screens` ("Login, Primeiro acesso, Definir senha", "raiz", and "Trocar senha até 384 px" in "área principal") | Login, Primeiro acesso, Definir senha, root -> C32 | Trocar senha 384 px: no check; code is 420 px (`Acesso.tsx:185`) |
| Indicadores states under AC 20 (4) | AC 20 / C20 claim | period form `indicadores.test.tsx:190-196` · empty `:29` · error `textos.test.tsx:64` | "Spinner" in "Consultar": named in C20, no assertion anywhere |
| themes for sidebar tokens (3) | `index.css` | C35, 3 themes | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| route -> title map, role precedence, initial sidebar state (decide) | `web/src/Autenticado.tsx` | Vitest, one case per row: C9 (11), C10 (3), C3 (4) | yes |
| action-menu conditions (decide) | `Usuarios.tsx`, `Artigos.tsx`, `Documentos.tsx` | Vitest, one case per row state: C25 (7) | yes |
| arrangement and container queries | `Autenticado.tsx`, `Tabela.tsx`, `Cabecalho.tsx`, `Indicadores.tsx`, `ChamadoDetalhe.tsx`, `Cadastros.tsx`, `Acesso.tsx`, `Assistente.tsx` | Playwright on each side of every breakpoint in `## Screens` | gap: no measurement for header padding 16 -> 24 px at 1024 px; access-card padding 24 -> 40 px at 768 px (only 360 px is measured); highlight value 24 -> 30 px at a 250 px card (`@[250px]/card`). Trocar senha is measured against 420, not 384. Every other breakpoint is measured on both sides |
| components copied into `web/src/ui/` | `sidebar.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `separator.tsx`, `skeleton.tsx`, `use-mobile.ts` | none of their own; covered by the screens | yes (crapper 0; worst `Sidebar` 9.8) |

Swept, the `existing` rows re-read against the code: `ErroDe`/`Situacao` above the table (`Usuarios.tsx:127-129`, `Artigos.tsx:143-144`); `Menu` filtered by role (`Autenticado.tsx:238`); `radix-ui` installed (`web/package.json:29`). All hold.

Points the builders flagged:

- **C20, `@3xl/main` -> `@4xl/main`.** The net diff from base is `md:grid-cols-2` -> `@4xl/main:grid-cols-2` at `indicadores.test.tsx:65`. The changed assertion is about the rankings' arrangement, which AC 19 (896 px) and door 5 change. The value assertions (`:45-61`) are untouched. Not a weakening, but C20's text needs to name the exception (precision gap).
- **e2e rewrites.** The 8 batch-2 rewrites, the new numbers in "arranjo telas de acesso" (card x 24, <= 384) and "arranjo Assistente" at 1440 match `## Screens`. Shell assertions were deleted and not replaced: `--sidebar` background, right border, institution on <= 2 lines with no ellipsis, group titles 12 px with 24 px between groups (the old "barra lateral a N px" and "grupos na barra lateral" tests). Those facts are still in `## Screens` (see Binding sources). The line `arranjo.spec.ts:374` kept `<= 420` for Trocar senha, which contradicts the 384 in `## Screens`.
- **Unchanged-behaviour Vitest assertions, slightly weakened.** `web/src/administracao/usuarios.test.tsx:34` went from `querySelectorAll('.text-sm')[1]).toHaveTextContent(/^Aluno$/)` (a user with no sectors shows exactly "Aluno") to a substring, so trailing sectors would pass. `web/src/chamados/listas.test.tsx` lost the `$` anchor of `/Boleto · sem responsável · 1 dia$/`. Both were adapted to the table, and Impact does not list them. They are minor and do not affect any API call (C33 stays green), but they are weakenings.
- **"Ativar" without the Spinner.** No check and no test, at base or HEAD, asserts pending feedback on "Ativar". The base tests never looked for a Spinner in `conhecimento/`. The item is `disabled={pendente}` (`Artigos.tsx:76`), and C25 and C27 only fix which actions appear and the flows. It contradicts no check or test, but it is a small visible deviation from AC 27 ("as today"), recorded in Handoff as Abandoned.
- **`REESCRITOS` vs `## Handoff`.** All 9 entries match "Settled mid-build (1)". Batches 2 and 3 added none, as declared.

## Faults injected

Isolation: `git worktree add <scratchpad>/wt HEAD` with `node_modules` as a junction (removed with `rmdir` before `git worktree remove --force`). The real tree's `git status --porcelain` was the same before and after (`?? .idea/`, `?? .playwright-mcp/`). For the e2e faults, the worktree was built with `vite build` and served with `vite preview --port 4179`, with `E2E_URL=http://localhost:4179`. A control test ("painel recolher e expandir") passed in each run, and the fault was confirmed in the served bundle.

| Mutation | Location | Killed |
| --- | --- | --- |
| route -> title: `if (numero) return numero` disabled (detail h1 is empty) | `web/src/Autenticado.tsx:80` | yes - C9 "título do cabeçalho por rota (chamados/ONE-7)" failed |
| initial state: `!== 'recolhida'` -> `=== 'aberta'` (absent or unknown starts collapsed) | `web/src/Autenticado.tsx` `useBarra` | yes - C3 "(null)" and "(xyz)" failed |
| menu condition: "Ativar" only for `RASCUNHO` (ARQUIVADO loses it) | `web/src/conhecimento/Artigos.tsx:75` | yes - C25 "ações de artigo no menu" failed |
| "largo" columns from `@xl/main` (576) instead of `@2xl/main` (672) | `web/src/Tabela.tsx:8` | yes - C14 "colunas pela largura do main" failed (at 900 open: 6 columns). C22 alone survives it: it only measures 360 and 1280 |
| detail two columns from `@4xl/main` (896) instead of `@5xl/main` | `web/src/chamados/ChamadoDetalhe.tsx:269` | yes - C29 "detalhe em uma coluna a 1280 px" failed |

## Gate

- `cd web && npx vitest run --reporter=verbose` - 271 passed, 0 failed
- `cd web && npx playwright test --reporter=list` (container `api` rebuilt from a3bd34d) - 66 passed, 0 failed
- `python .specs/features/layout-painel/chamadas_iguais.py dac2832` - exit 0, 238 base tests, 0 problems; `--autoteste` ok
- `crapper --use-existing-coverage -s src --threshold 9.99` - exit 0; `dryer ... --threshold 0.8` - "No duplicate candidates found"; `npm --prefix web run build` - exit 0
- `mutator` - not run, suspended (AD-025)

Ranked gaps:

1. **Trocar senha width differs from `## Screens`, with no check.** `## Screens` says "Trocar senha até 384 px"; the code is `max-w-[420px]` (`web/src/acesso/Acesso.tsx:185`), the e2e asserts `<= 420` (`web/e2e/arranjo.spec.ts:374`), and no check covers it.
2. **Composition uncovered.** User button and user menu (initials square, 2 lines, chevron; name/role, separator, Sair; side right or top); "Novo" on the Cadastros tabs row; Indicadores `Alert` below the toolbar; sheet overlay; the institution wrap, `--sidebar` background and border, whose asserts were deleted and not replaced.
3. **`Test policy` arrangement row unmet.** No measurement on the far side of: header padding at 1024 px, access-card padding at 768 px, highlight value at `@[250px]/card`. More generally, no exemption list names the spacing and type values of `## Screens` per screen.
4. **C20 Spinner unproven, and C20's wording.** The Spinner has no assertion; "sem mudança de asserção" is false by one justified class change.
5. **Two unchanged-behaviour Vitest assertions slightly weakened.** `usuarios.test.tsx:34` and the `$` dropped in `listas.test.tsx`.
