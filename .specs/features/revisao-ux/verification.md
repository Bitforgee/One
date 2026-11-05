# Revisão de UI e UX verification

**Verdict**: PASS
**Profile**: ui
**Diff range**: 887e336..2aa433f (base of the feature `56cf9d3`)
**Round**: 3 - scoped
**Verifier**: fresh sub-agent with no inherited context (author != verifier); it wrote none of this code, fixed nothing and committed nothing

Scope: the diff `887e336..2aa433f` (`7c8f720`, `2aa433f`) and every verdict that was not PASS in round 2 (C48, C59, C71, and the OPERADOR coverage gap, finding 4). The diff is test and docs only:
- `web/e2e/ux.spec.ts`: +44 lines, two new tests;
- `web/src/acesso/navegacao.test.tsx`: the C70 table grows from 3 to 11 routes;
- `checks.md`: one closed-list extension, two new proof lines (C48, C71), the amended C70 and one Coverage row;
- the round-2 report and the lessons files.

No product file under `web/src`, `web/public` or `api/` changed (`git diff --stat 887e336..2aa433f`). Everything else is carried from `887e336` and says so.

Every proof was re-run by the Verifier at `2aa433f`, one invocation per target:
- `cd web && npx vitest run` (verbose): 481 passed in 48 files, exit 0. `operador sem outro papel vai para Instituições` ran 11 times (one per route). `prévia muda antes de salvar`, `texto de ajuda dos anexos`, `texto reserva fala em solicitação` and `Matrículas em 3 passos com modelo e erros por linha` appear as run and passed.
- `npm --prefix web run build`: exit 0.
- `npm --prefix web run coverage`, then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. `dryer` with the C60 list: "No duplicate candidates found" (grep exit 0).
- Layout Playwright (`arranjo`, `celular`, `aparencia`, `instituicoes`, `push`, `ux`) against `npx vite preview --port 5199` of that build: 152 passed in 1.8 min (the 150 of round 2 plus the 2 new tests). It includes `números dos passos de Matrículas visíveis nos 3 temas` (`ux.spec.ts:1222`) and `prévia clara pinta a cor digitada` (`:1326`).
- `git diff --quiet 56cf9d3 HEAD -- api api.Tests`: exit 0.
- Real e2e (C63 to C65): **carried from 887e336** (173 passed, 0 failed, on the round-2 Verifier's :8087 image of `887e336`). The diff since is test-only, and the two new tests live in `ux.spec.ts`, which runs against the simulated API. Nothing the real specs exercise changed.

The verdict is PASS. All three round-2 failures are closed, and every fault injected this round was killed:
1. **C71.** The new Playwright proof compares the painted `background-color` of the light preview's Entrar with a `#224fa7` reference, with `#8a1538` saved. Fault F7 (`@theme inline` -> `@theme`) failed it this time: received `rgb(138, 21, 56)` against the expected `rgb(34, 79, 167)`. In round 2 the same fault went undetected.
2. **C48.** The new Playwright proof measures the box height (> 0) and the contrast (>= 4.5) of "1", "2" and "3" in the light, dark and black themes. A same-colour number in dark (F8) fails it at contrast 1, and a zero-height number (F9) fails it at height 0.
3. **C59.** The closed list now names `interface.test.ts` (`--chart-1`/`--chart-2` rows) and `sw.test.ts` (fallback text) (`checks.md:130`). The two files this round edits, `ux.spec.ts` and `navegacao.test.tsx`, were created by this feature (absent at `56cf9d3`), so their edits are not edits to existing assertions.
4. **OPERADOR coverage.** C70 is table-driven over the 11 out-of-role routes. Opening `documentos` (F10) or `conta` (F11) to OPERADOR fails exactly that route's case.

## Binding sources

Step 1 was not re-run: the fix touched no interface (no product file changed in `887e336..2aa433f`). Every row is carried from `887e336`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `pesquisa.md` (binding) | carried from 887e336 | none | - |
| `auditoria.md` (binding) | carried from 887e336 | none | - |
| `plan.md` `## Screens`, Matrículas: "3 passos numerados" (AC 35) | carried from 887e336 (`Matriculas.tsx:42-55`, unchanged) | none | - |
| `plan.md` Landing door 3 / AC 43 / P6: "o gráfico ... não a usa" | carried from 887e336 (`index.css:37-38,77-78`, unchanged) | none | - |
| `plan.md` `## Screens`, Fila (P2, C33 amended) | carried from 887e336 (`Chamados.tsx:45,57-60`, unchanged) | none | - |
| `plan.md` `## Screens`, all other screens | carried from 887e336 | none | - |

The round-2 note on the Matrículas row (the painting of the step number had no proof) is closed by the new C48 proof.

## Checks

C48, C59 to C62, C70 and C71 were verified at 2aa433f. C63 to C65 are carried from 887e336 (real e2e, see above). The others are carried from 887e336, and their proofs were re-run at 2aa433f (in the counts above). Citations were refreshed for the two files the fix touched. In `ux.spec.ts`, lines 1221 to 1299 of `887e336` move by +24 and lines from 1300 move by +44. In `navegacao.test.tsx` one line changed and no line moved.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 6 types at 44 px or more at 390 px | PW passed at 2aa433f | `e2e/ux.spec.ts:150-151` (carried from 887e336) | PASS |
| C2 | 44 px with a coarse pointer at 1024 | PW passed at 2aa433f | `e2e/ux.spec.ts:177,188` (carried from 887e336) | PASS |
| C3 | fields at 16 px | PW passed at 2aa433f | `e2e/ux.spec.ts:207-208` (carried from 887e336) | PASS |
| C4 | X named "Fechar", 44 x 44 | PW + VT passed at 2aa433f | `e2e/ux.spec.ts:218-219`; `src/ux.test.tsx:44-45` (carried from 887e336) | PASS |
| C5 | field border at 3:1 | PW passed at 2aa433f | `e2e/ux.spec.ts:282` (carried from 887e336) | PASS |
| C6 | skeleton at 1.3:1 | PW passed at 2aa433f | `e2e/ux.spec.ts:302,306` (carried from 887e336) | PASS |
| C7 | badges at 4.5:1 | PW passed at 2aa433f | `e2e/ux.spec.ts:339,342` (carried from 887e336) | PASS |
| C8 | no green button | PW + VT passed at 2aa433f | `e2e/ux.spec.ts:355-356`; `src/ux.test.tsx:65` (carried from 887e336) | PASS |
| C9 | skip link | VT passed at 2aa433f | `src/ux.test.tsx:78,82` (carried from 887e336) | PASS |
| C10 | 24 out-of-role redirects | VT (25) passed at 2aa433f | `src/ux.test.tsx:101-102,108` (carried from 887e336) | PASS |
| C11 | theme button | VT passed at 2aa433f | `src/ux.test.tsx:131,134` (carried from 887e336) | PASS |
| C12 | 3 tabs, active `aria-current` | VT passed at 2aa433f | `src/acesso/navegacao.test.tsx:43,48` (refreshed, carried from 887e336) | PASS |
| C13 | fixed bar, 3 x 130 px | PW passed at 2aa433f | `e2e/ux.spec.ts:400-403` (carried from 887e336) | PASS |
| C14 | active tab in the action colour, weight 600 | PW passed at 2aa433f | `e2e/ux.spec.ts:438` (carried from 887e336) | PASS |
| C15 | safe area; nothing under the bar | PW passed at 2aa433f | `e2e/ux.spec.ts:468,473` (carried from 887e336) | PASS |
| C16 | no menu button for the student | PW passed at 2aa433f | `e2e/ux.spec.ts:495-496` (carried from 887e336) | PASS |
| C17 | Conta rows in order | VT passed at 2aa433f | `src/acesso/navegacao.test.tsx:56,64-65` (refreshed, carried from 887e336) | PASS |
| C18 | each Conta row acts | VT passed at 2aa433f | `src/acesso/navegacao.test.tsx:83,91,101,109,120` (refreshed, carried from 887e336) | PASS |
| C19 | 52 px rows, Sair last | PW passed at 2aa433f | `e2e/ux.spec.ts:540-541,546` (carried from 887e336) | PASS |
| C20 | no tab bar at 768 or for staff | PW passed at 2aa433f | `e2e/ux.spec.ts:514-515` (carried from 887e336) | PASS |
| C21 | "Isso resolveu?" after the answer | VT passed at 2aa433f | `src/assistente/revisao.test.tsx:37,41-42` (carried from 887e336) | PASS |
| C22 | in the flow, within 24 px | PW passed at 2aa433f | `e2e/ux.spec.ts:696-697` (carried from 887e336) | PASS |
| C23 | transfer block; invitation at 0 | VT passed at 2aa433f | `src/assistente/revisao.test.tsx:64` (carried from 887e336) | PASS |
| C24 | single bordered block | PW passed at 2aa433f | `e2e/ux.spec.ts:734-736` (carried from 887e336) | PASS |
| C25 | 68ch | PW passed at 2aa433f | `e2e/ux.spec.ts:762,770` (carried from 887e336) | PASS |
| C26 | 44 px composer | PW + VT passed at 2aa433f | `e2e/ux.spec.ts:782`; `src/assistente/revisao.test.tsx:79,83` (carried from 887e336) | PASS |
| C27 | attachment help, 4 cases | VT passed at 2aa433f | `src/assistente/revisao.test.tsx:91,95,97,100` (carried from 887e336) | PASS |
| C28 | send error with Reenviar | VT + PW passed at 2aa433f | `src/assistente/revisao.test.tsx:129,145`; `e2e/ux.spec.ts:807-808` (carried from 887e336) | PASS |
| C29 | rows with a divider | PW passed at 2aa433f | `e2e/ux.spec.ts:853,855-856` (carried from 887e336) | PASS |
| C30 | relative date by calendar day | VT passed at 2aa433f | `src/chamados/revisao.test.tsx:41-42`. `:42` is now `getByText(texto, { exact: false })`; see "exact: false" below (carried from 887e336) | PASS |
| C31 | row in 3 lines | PW passed at 2aa433f | `e2e/ux.spec.ts:885,891-892,899-900` (carried from 887e336) | PASS |
| C32 | next step per state | VT passed at 2aa433f | `src/chamados/revisao.test.tsx:63` (carried from 887e336) | PASS |
| C33 | category, responsável and date in the Fila, no student or sector; category wraps at 390 (no ellipsis, `scrollWidth <= clientWidth`); "Mais antigos primeiro" first | VT `Fila com categoria, data e Mais antigos primeiro` + PW `Mais antigos primeiro acima da Fila` passed at 2aa433f | `src/chamados/revisao.test.tsx:79-81` (category, date, `'sem responsável'`), `:83` no student or sector; `e2e/ux.spec.ts:914`, `:918` `expect(m.corte).not.toBe('ellipsis')`, `:919` `expect(m.sobra).toBeLessThanOrEqual(0)`; `e2e/arranjo.spec.ts:1096` `toContainText('Carla Regina de Souza')` (carried from 887e336) | PASS |
| C34 | bar per state | PW passed at 2aa433f | `e2e/ux.spec.ts:977,985,968` (refreshed, carried from 887e336) | PASS |
| C35 | Responder scrolls and focuses | PW passed at 2aa433f | `e2e/ux.spec.ts:996,999` (refreshed, carried from 887e336) | PASS |
| C36 | no bar for the student | PW + VT passed at 2aa433f | `e2e/ux.spec.ts:1033,1041`; `src/chamados/revisao.test.tsx:99-100` (refreshed, carried from 887e336) | PASS |
| C37 | Enviar above the bar | PW passed at 2aa433f | `e2e/ux.spec.ts:1011` (refreshed, carried from 887e336) | PASS |
| C38 | no form in RESOLVIDO and FECHADO | VT passed at 2aa433f | `src/chamados/revisao.test.tsx:117-118` (refreshed, carried from 887e336) | PASS |
| C39 | full-screen dialogs | PW passed at 2aa433f | `e2e/ux.spec.ts:1098,1106,1110,1112` (refreshed, carried from 887e336) | PASS |
| C40 | field error below the field | VT + PW passed at 2aa433f | `src/administracao/revisao.test.tsx:65-66`; `e2e/ux.spec.ts:1146` (refreshed, carried from 887e336) | PASS |
| C41 | load error with Tentar de novo | VT passed at 2aa433f | `src/ux.test.tsx:199-200,216-217` (carried from 887e336) | PASS |
| C42 | one period control | VT passed at 2aa433f | `src/indicadores/revisao.test.tsx:29-30,39,53-54` (carried from 887e336) | PASS |
| C43 | 2 columns at 390 | PW passed at 2aa433f | `e2e/ux.spec.ts:1165-1169` (refreshed, carried from 887e336) | PASS |
| C44 | one badge, indexing as an icon | VT passed at 2aa433f | `src/conhecimento/revisao.test.tsx:32,39,42,51,60` (carried from 887e336) | PASS |
| C45 | icon beside the title | PW passed at 2aa433f | `e2e/ux.spec.ts:1192-1194` (refreshed, carried from 887e336) | PASS |
| C46 | "Novo" hidden on an empty list | VT passed at 2aa433f | `src/conhecimento/revisao.test.tsx:66-78` (carried from 887e336) | PASS |
| C47 | formatted CPF and search | VT + PW passed at 2aa433f | `src/administracao/revisao.test.tsx:94-95,110`; `e2e/ux.spec.ts:1205` (refreshed, carried from 887e336) | PASS |
| C48 | `ol` with 3 steps; each step shows its number as visible text with a box height > 0 and a contrast of 4.5:1 or more; the title is an `h2`/`h3`; the accessible name starts with the number; template download; errors per line | VT `Matrículas em 3 passos …` + PW `Baixar modelo baixa o CSV com o cabeçalho` + PW `números dos passos de Matrículas visíveis nos 3 temas` passed at 2aa433f | `src/administracao/revisao.test.tsx:132-135` (digit text, heading, accessible name), `:168`; `e2e/ux.spec.ts:1218` (CSV); new `:1226` loop over `Temas` (`light`, `dark`, `black`, `:246`), `:1230` theme class checked, `:1234` `toHaveCount(1)` per digit, `:1235` `caixa(numero).height` `toBeGreaterThan(0)`, `:1236-1239` text colour painted over the element's own background stack, `:1240` `contraste(texto, fundo)` `toBeGreaterThanOrEqual(4.5)`. Faults F8 (contrast 1 in dark) and F9 (height 0) killed it; F3 (round 2) killed the VT half | PASS |
| C49 | whole row is the target, 48 px | PW passed at 2aa433f | `e2e/ux.spec.ts:1274,1276` (refreshed, carried from 887e336) | PASS |
| C50 | form first; Ver prévia | PW passed at 2aa433f | `e2e/ux.spec.ts:1291-1292,1296-1297,1302` (refreshed, carried from 887e336) | PASS |
| C51 | dark preview the same as the app | PW passed at 2aa433f | `e2e/ux.spec.ts:1320-1322` (refreshed, carried from 887e336) | PASS |
| C52 | tinted neutrals | VT + PW passed at 2aa433f | `src/ux.test.tsx:149-150`; `e2e/ux.spec.ts:617,620` (carried from 887e336) | PASS |
| C53 | 27 contrasts at 4.5:1 | PW passed at 2aa433f | `e2e/ux.spec.ts:641,644` (carried from 887e336) | PASS |
| C54 | opsz 32; no new font | PW + VT passed at 2aa433f | `e2e/ux.spec.ts:653`; `src/ux.test.tsx:160-161` (carried from 887e336) | PASS |
| C55 | 4 text sizes per screen | PW passed at 2aa433f | `e2e/ux.spec.ts:1387-1388,1392` (refreshed, carried from 887e336) | PASS |
| C56 | no Sparkles, emoji or gradient | VT `sem Sparkles no código` + PW `sem emoji nem gradiente` passed at 2aa433f | `src/ux.test.tsx:227`; `e2e/ux.spec.ts:1409-1410` (refreshed, carried from 887e336) | PASS |
| C57 | action colour only in the primary button, active item, link and focus; never in the chart, measured after the bars are drawn | PW (2) passed at 2aa433f | `e2e/ux.spec.ts:1425` bars drawn, `:1444` chart finding, `:1449` `expect(indevidos, …).toEqual([])`, focus `:1465` (refreshed, carried from 887e336; F1 killed it in round 2) | PASS |
| C58 | the student never reads "chamado" | VT passed at 2aa433f | `src/ux.test.tsx:231,266` (carried from 887e336) | PASS |
| C59 | Vitest and build pass; edits to existing assertions only from the closed list | `vitest run` 481 passed; build exit 0 at 2aa433f | `checks.md:130` now extends the closed list to `src/test/interface.test.ts` (`--chart-1`/`--chart-2` rows, C73) and `src/sw.test.ts` (fallback text, C69), the two round-2 outliers. The base-existing test files edited in `0487fab..HEAD` are the same six as in round 2 (`sw.test.ts`, `test/interface.test.ts`, `administracao/textos.test.tsx`, `administracao/aparencia.test.tsx`, `assistente/anexos.test.tsx`, `e2e/arranjo.spec.ts`), and all six are now on the list. The files edited in `887e336..2aa433f` (`e2e/ux.spec.ts`, `src/acesso/navegacao.test.tsx`) do not exist at `56cf9d3` (`git cat-file -e`), and both edits only add or widen cases | PASS |
| C60 | crapper 9.99; dryer below 0.8 | crapper exit 0; dryer "No duplicate candidates found" at 2aa433f | `web/.metrics/crap.edn`, `dry.edn` written at 2aa433f (`checks.md:653-654`) | PASS |
| C61 | layout suite | PW 6 files: 152 passed at 2aa433f | `e2e/ux.spec.ts:1222,1326,1525,1559` among them | PASS |
| C62 | no `api/` change | `git diff --quiet 56cf9d3 HEAD -- api api.Tests` exit 0 at 2aa433f | `checks.md:662` | PASS |
| C63 | real e2e, student tabs and Sair | `ux-real.spec.ts:81` passed on the :8087 image of 887e336 (carried from 887e336; test-only diff since) | `e2e/ux-real.spec.ts:111,118,124,136` | PASS |
| C64 | 6 clicks, 1 Sheet | `ux-real.spec.ts:143` passed on the :8087 image of 887e336 (carried from 887e336) | `e2e/ux-real.spec.ts:212,214` | PASS |
| C65 | whole e2e suite against :8087 | `npx playwright test`: 173 passed, 0 failed at 887e336 (carried from 887e336) | `e2e/anexos.spec.ts:140` passed | PASS |
| C66 | the action sheet keeps what was typed | PW passed at 2aa433f | `e2e/ux.spec.ts:1486,1488` (refreshed, carried from 887e336) | PASS |
| C67 | "Aberto" column on one line | PW passed at 2aa433f | `e2e/ux.spec.ts:1508-1509,1513,1516` (refreshed, carried from 887e336) | PASS |
| C68 | links as buttons in the staff conversation | VT passed at 2aa433f | `src/chamados/revisao.test.tsx:188-189` (carried from 887e336) | PASS |
| C69 | the SW fallback says "Sua solicitação foi atualizada." with no "chamado" | VT `texto reserva fala em solicitação` passed at 2aa433f | `src/sw.test.ts:35-36`; `src/sw.ts:21` (carried from 887e336; F5 killed it in round 2) | PASS |
| C70 | OPERADOR-only at any of the 11 out-of-role routes (`fila`, `assistente`, `solicitacoes`, `indicadores`, `artigos`, `documentos`, `usuarios`, `matriculas`, `cadastros`, `aparencia`, `conta`) goes to `/univag/instituicoes` | VT (11) passed at 2aa433f | `src/acesso/navegacao.test.tsx:127` `it.each` over the 11 routes, `:136` `toHaveTextContent('/univag/instituicoes')`, rendered through the real `App` and `MemoryRouter`. The 11 equal `Autenticado.tsx:20-31,305` (the menu routes plus `conta`) minus `instituicoes`. Faults F10 (`documentos`) and F11 (`conta`) each failed exactly their own case; F6 (round 2) killed the start-screen half | PASS |
| C71 | the light preview is proven by the button's painted colour; the attachment help by `toBeVisible()` | VT `prévia muda antes de salvar` + `texto de ajuda dos anexos` + PW `prévia clara pinta a cor digitada` passed at 2aa433f | new `e2e/ux.spec.ts:1328` light theme set before load, `:1330` `#8a1538` saved (`comAparencia`), `:1332` types `#224fa7`, `:1334-1341` a reference `div` painted with `#224fa7` in the same page, `:1342` `toHaveCSS('background-color', esperada)` on the preview's Entrar. `src/assistente/anexos.test.tsx:156` `toBeVisible()`. Fault F7 killed it (received `rgb(138, 21, 56)`, the saved colour) | PASS |
| C72 | 390 px Fila detail is running text "aberto há 2 dias · categoria · responsável", no split word, no column under 120 px | PW `detalhe da Fila em texto corrido no celular` passed at 2aa433f | `e2e/ux.spec.ts:1534-1535`, `:1536` width `>= 120`, `:1552-1554` (refreshed, carried from 887e336; F4 killed it in round 2) | PASS |
| C73 | both charts the same calm colour, not `--primary`, 3:1 or more on the card, chroma > 0.02, 3 themes x with and without `#8a1538` | PW `gráficos com a mesma cor calma` passed at 2aa433f | `e2e/ux.spec.ts:1572-1573,1575,1580` (refreshed, carried from 887e336; F1 and F2 killed it in round 2) | PASS |

### Builder's notes, judged

- **C71 moved to the browser.** Done as the round-2 note asked. The jsdom test `prévia muda antes de salvar` still writes its own `.previa-marca .bg-primary` rule (`aparencia.test.tsx:74`). On its own it proves only the inline variable and the class name. The painted colour is now carried by the PW proof, and F7 shows that proof reaches it. The C71 claim at `checks.md:715` still reads "igual ao de uma referência com `#8a1538`", while the new proof's reference is the typed `#224fa7` and `#8a1538` is the saved colour. The proof line (`checks.md:718`) states the setup correctly, so this is wording only (finding 1).
- **C48 at 1280 px only.** The claim names no viewport, and the round-2 Verifier measured the same 24 px circle at 390 px, so this is not a gap.
- **`exact: false` in `chamados/revisao.test.tsx`.** Carried from 887e336: forced by the single text run and pinned in the browser by C72's anchored regex.

## Coverage

Rows the fix touched were recomputed at 2aa433f. The others are carried from 887e336.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| roles x out-of-role guarded routes (35 = 9 + 10 + 5 + 11) | `Autenticado.tsx:20-31,305-309,324-331`, `sessao.ts:9-16` (verified at 2aa433f) | ALUNO 9, ATENDENTE 10, ADMINISTRADOR 5: C10 (`ux.test.tsx:101`); OPERADOR 11: C70 (`navegacao.test.tsx:127,136`). `checks.md:738` now has the row "rotas fora do papel do `OPERADOR` (11)" | - |
| `## Screens` arrangement items (design authority) | `plan.md:82-135` (carried from 887e336) | 46 items: C13 to C51. Matrículas numbering: C48 VT (text, heading, name) and C48 PW (box and contrast in 3 themes) | - |
| step-number painting: themes (3) x digits (3) | C48 claim (verified at 2aa433f) | light, dark, black x "1", "2", "3": C48 loop `ux.spec.ts:1226-1241` | - |
| preview painting: light with a typed colour, dark | C50, C51, C71 claims (verified at 2aa433f) | light, typed: C71 `ux.spec.ts:1342`; dark: C51 `:1320-1322` | - |
| action-colour surfaces (button, active item, link, focus, Sigla; never chart or badge) | `plan.md:236`, `checks.md:113` (carried from 887e336) | C57 and C73, lines refreshed above | - |
| chart colour: themes (3) x brand (2) | C73 claim (carried from 887e336) | C73 loop `ux.spec.ts:1562-1580` | - |
| Fila 390 px row fields (category, responsável, date) | P2 + amended C33/C72 (carried from 887e336) | C33, C72 | - |
| student texts without "chamado" (4 screens + SW fallback) | carried from 887e336 | screens C58; SW fallback C69 | - |
| base-existing test files edited (6) | `git diff 0487fab..HEAD` against `git cat-file -e 56cf9d3:<file>` (verified at 2aa433f) | all 6 on the closed list and its 3 extensions (`checks.md:37-42,126-130`) | - |
| detail bar per state (5) | carried from 887e336 | C34 | - |
| load-error surfaces (11) | carried from 887e336 | C41 | - |
| tinted tokens (14) | carried from 887e336 | C52 | - |
| next step per state (5) | carried from 887e336 | C32 | - |
| relative date (4 x 2) | carried from 887e336 | C30 | - |
| form dialogs (6) | carried from 887e336 | C39, C40 | - |
| Cadastros lists (5) | carried from 887e336 | C49 | - |
| screens for C55 to C57 (16 + Conta + Instituições) | carried from 887e336 | C55, C56, C57 | - |

## Faults injected

All faults were injected by hand (the mutator is suspended, AD-025) in a `git worktree` scratch copy of `2aa433f` inside the repo (`.wt-verif3`, with a `node_modules` junction). The real tree's `git status --porcelain` was recorded first and matched the baseline afterwards. Each Playwright fault had its own `vite build`, served by `vite preview` on :5198, and the server was restarted between faults. F10 and F11 ran in Vitest. F1 to F6 are carried from 887e336 because their surfaces did not change. F7 was re-injected because round 2 did not catch it.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: `--chart-1` and `--chart-2` back to `var(--primary)` | `web/src/index.css:37-38,77-78` | yes - C57 and C73 (carried from 887e336) |
| F2: `--chart-2` different again | `web/src/index.css:38,78` | yes - C73 (carried from 887e336) |
| F3: Matrículas back to `list-decimal`, no visible digit | `web/src/administracao/Matriculas.tsx:42-55` | yes - C48 VT (carried from 887e336) |
| F4: Fila 390 px detail as flex columns again | `web/src/chamados/Chamados.tsx:59` | yes - C72 and C33 (carried from 887e336) |
| F5: SW fallback back to "Seu chamado foi atualizado." | `web/src/sw.ts:21` | yes - C69 (carried from 887e336) |
| F6: `telaInicial` sends OPERADOR-only to `fila` | `web/src/sessao.ts:14` | yes - C70 (carried from 887e336) |
| F7: `@theme inline {` -> `@theme {` (re-injected) | `web/src/index.css:110` | yes - C71 `ux.spec.ts:1342` "prévia clara pinta a cor digitada": expected `rgb(34, 79, 167)`, received `rgb(138, 21, 56)` |
| F8: step number painted in its background colour in dark (`dark:text-muted` on the number) | `web/src/administracao/Matriculas.tsx:46` | yes - C48 `ux.spec.ts:1240` "dark 1: contraste", received 1; light passed first, so the failure is in the theme the fault hits |
| F9: step number with height 0 (`size-6` -> `h-0 w-6`) | `web/src/administracao/Matriculas.tsx:46` | yes - C48 `ux.spec.ts:1235` "light 1: altura", received 0 |
| F10: `rotaPermitida` lets OPERADOR into `documentos` | `web/src/Autenticado.tsx:306-309` | yes - C70 `(/documentos)` failed, the other 10 passed |
| F11: `conta` dropped from `Rotas` (no longer guarded) | `web/src/Autenticado.tsx:305` | yes - C70 `(/conta)` failed, the other 10 passed |

11 listed: 5 injected this round and 5 killed; 6 carried, all killed. F8 and F9 are the faults the caller named for the new C48 surface, and F10 is the named guard fault. F11 was added because `conta` reaches the guard through a different line from the 10 menu routes (the entry appended to `Rotas`).

## Findings, ranked

1. **(C71, low, wording) The claim text names the wrong reference colour.** `checks.md:715` says the painted colour equals "uma referência com `#8a1538`". The PW proof compares with the typed `#224fa7`, which is right, and `#8a1538` is the saved colour that F7 paints. The proof line at `checks.md:718` states it correctly. Nothing that is proven changes.
2. **(C71, note) The jsdom half still checks its own CSS.** `aparencia.test.tsx:74` injects the rule it then reads back. It does no harm now that the PW proof carries the paint, but a reader could take it for the proof. Lesson L-079 already records this.

Round-2 findings now closed:
- C71 painted colour (PW proof added; F7 killed);
- C48 box and contrast (PW proof added; F8 and F9 killed);
- C59 closed list (extended at `checks.md:130`);
- OPERADOR coverage (11 of 11; F10 and F11 killed; `checks.md` Coverage row added).

## Gate

`cd web && npx vitest run`: 481 passed, 0 failed. Build exit 0. Layout PW: 152 passed. Real e2e carried from 887e336 (173 passed). crapper exit 0; dryer no candidates; C62 exit 0. `validate_verification.py revisao-ux` was run after writing this report.

Cleanup:
- removed: the scratch worktree `.wt-verif3` (junction removed first with `cmd /c rmdir`, then `git worktree remove` and `prune`), the preview servers on :5199 and :5198 (stopped by PID);
- left alone: the compose `api` on :8080, Postgres, MinIO and Mailpit;
- the real tree's porcelain equals the baseline (`.idea/`, `.playwright-mcp/`, `web/apresentacao/`, all untracked before this round).
