# Revisão de UI e UX verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 0487fab..887e336 (base of the feature `56cf9d3`)
**Round**: 2 - scoped
**Verifier**: fresh sub-agent with no inherited context (author != verifier); it wrote none of this code, fixed nothing and committed nothing

Scope: the diff `0487fab..887e336` (`b92466d`, `6ddc2cd`, `17df8a8`, `ba491bf`, `887e336`) and every verdict that was not PASS in round 1 (C48, C56, C57, C59 and findings 5, 6 and 7). Everything else is carried from `0487fab` and says so.

Every proof was re-run by the Verifier at `887e336`, one invocation per target:
- `cd web && npx vitest run` (verbose): 473 passed in 48 files, exit 0. Every named proof of C69, C70 and C71 appears as run and passed (`texto reserva fala em solicitação`; `operador sem outro papel vai para Instituições` x3 for `/fila`, `/assistente`, `/artigos`; `prévia muda antes de salvar`; `texto de ajuda dos anexos`), and so do `Matrículas em 3 passos com modelo e erros por linha: os 3 passos numerados` and `Fila com categoria, data e Mais antigos primeiro`.
- `npm --prefix web run build`: exit 0. It was run after the last test-only edit, so the builder's note about the order is closed.
- `npm --prefix web run coverage`, then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. `dryer` with the C60 list: "No duplicate candidates found".
- Layout Playwright (`arranjo`, `celular`, `aparencia`, `instituicoes`, `push`, `ux`) against `npx vite preview --port 5199` of that build: 150 passed in 1.8 min. It includes `detalhe da Fila em texto corrido no celular` (`ux.spec.ts:1481`), `gráficos com a mesma cor calma` (`:1515`), `sem emoji nem gradiente` (`:1352`), the C57 sweep (`:1373`), `Mais antigos primeiro acima da Fila` (`:906`) and `colunas largas somem no estreito` (`arranjo.spec.ts:1078`).
- `git diff --quiet 56cf9d3 HEAD -- api api.Tests`: exit 0. Nothing outside `web/` and `.specs/` changed in `0487fab..HEAD`.
- Real e2e: **re-run, not carried**. The diff touches what the real specs exercise: the Fila row (C64 taps "a linha da Fila" at 390 px), the chart colour, `sw.ts` and Matrículas. The Verifier ran it on its own image of `887e336`, built from `git archive` with no worktree, on :8087 (database `one_revisao_verif2`, bucket `one-revisao-ux-verif2`, institution `e2e` created by the CLI, `E2E_CONTAINER=one-revisao-ux-verif2`). `npx playwright test` gave 173 passed, 0 failed in 6.0 min. `ux-real.spec.ts:81` (C63) and `:143` (C64) passed. No `429` happened.

The verdict is FAIL for 3 reasons. Each of the 3 is narrower than in round 1, and all four round-1 product defects are fixed.
1. **C71.** The new proof of the light preview's painted colour does not reach the painted colour. The test writes the CSS rule that paints the button itself. A real regression that breaks the light preview in the browser survives every proof (fault F7).
2. **C48.** The amended claim requires the step number to have a box with height > 0 and a contrast of 4.5:1 or more. No proof measures either one. The product does meet it, by the Verifier's own measurement.
3. **C59.** Two existing assertions were edited outside the closed list (`interface.test.ts` `--chart-1`/`--chart-2` rows; `sw.test.ts` "push sem JSON legível"). Both are forced by C73 and C69 and recorded in the Handoff, and neither weakens anything.

The OPERADOR coverage is still partial: 8 of its 11 out-of-role routes have no case.

## Binding sources

Step 1 was re-run only for the screens the fix touched: Matrículas, Fila at 390 px and Indicadores. The rest is carried from `0487fab`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `pesquisa.md` (binding) | carried from 0487fab | none | - |
| `auditoria.md` (binding) | carried from 0487fab | none | - |
| `plan.md` `## Screens`, Matrículas: "3 passos numerados" (AC 35) | yes, verified at 887e336: `Matriculas.tsx:42-55`, rendered at 390 px in 3 themes | none. Each step is an `li` labelled by an `h2` that carries a visible number in a 24 px circle | - (the visible number is now covered by C48. Its painting is not measured by a proof; see C48) |
| `plan.md` Landing door 3 / AC 43 / P6: "o gráfico ... não a usa" | yes, verified at 887e336: `index.css:37-38,77-78` | none. `--chart-1` and `--chart-2` are `color-mix(in oklch, var(--marca, …) 45%, oklch(0.6 / 0.8 0 none))`, and the C57 sweep now waits for a drawn bar (`ux.spec.ts:1381`) | - |
| `plan.md` `## Screens`, Fila (P2, C33 amended) | yes, verified at 887e336: `Chamados.tsx:45,57-60` | none. The 390 px row shows "aberto … · categoria · responsável" as one run of text | - |
| `plan.md` `## Screens`, all other screens | carried from 0487fab | none | - |

## Checks

Checks C33, C48, C56, C57, C59 to C65 and C69 to C73 were verified at 887e336. The others are carried from 0487fab: their proofs were re-run at 887e336 (in the counts above), and their citations were refreshed where the fix moved lines. In `ux.spec.ts`, lines from 915 move by +5 and lines from 1375 by +7. In `navegacao.test.tsx` every line moves by +2. In `chamados/revisao.test.tsx` lines from 81 move by +1, and in `administracao/revisao.test.tsx` lines from 132 move by +5.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 6 types at 44 px or more at 390 px | PW passed at 887e336 | `e2e/ux.spec.ts:150-151` (carried from 0487fab) | PASS |
| C2 | 44 px with a coarse pointer at 1024 | PW passed at 887e336 | `e2e/ux.spec.ts:177,188` (carried from 0487fab) | PASS |
| C3 | fields at 16 px | PW passed at 887e336 | `e2e/ux.spec.ts:207-208` (carried from 0487fab) | PASS |
| C4 | X named "Fechar", 44 x 44 | PW + VT passed at 887e336 | `e2e/ux.spec.ts:218-219`; `src/ux.test.tsx:44-45` (carried from 0487fab) | PASS |
| C5 | field border at 3:1 | PW passed at 887e336 | `e2e/ux.spec.ts:282` (carried from 0487fab) | PASS |
| C6 | skeleton at 1.3:1 | PW passed at 887e336 | `e2e/ux.spec.ts:302,306` (carried from 0487fab) | PASS |
| C7 | badges at 4.5:1 | PW passed at 887e336 | `e2e/ux.spec.ts:339,342` (carried from 0487fab) | PASS |
| C8 | no green button | PW + VT passed at 887e336 | `e2e/ux.spec.ts:355-356`; `src/ux.test.tsx:65` (carried from 0487fab) | PASS |
| C9 | skip link | VT passed at 887e336 | `src/ux.test.tsx:78,82` (carried from 0487fab) | PASS |
| C10 | 24 out-of-role redirects | VT (25) passed at 887e336 | `src/ux.test.tsx:101-102,108` (carried from 0487fab) | PASS |
| C11 | theme button | VT passed at 887e336 | `src/ux.test.tsx:131,134` (carried from 0487fab) | PASS |
| C12 | 3 tabs, active `aria-current` | VT passed at 887e336 | `src/acesso/navegacao.test.tsx:43,48` (refreshed, carried from 0487fab) | PASS |
| C13 | fixed bar, 3 x 130 px | PW passed at 887e336 | `e2e/ux.spec.ts:400-403` (carried from 0487fab) | PASS |
| C14 | active tab in the action colour, weight 600 | PW passed at 887e336 | `e2e/ux.spec.ts:438` (carried from 0487fab) | PASS |
| C15 | safe area; nothing under the bar | PW passed at 887e336 | `e2e/ux.spec.ts:468,473` (carried from 0487fab) | PASS |
| C16 | no menu button for the student | PW passed at 887e336 | `e2e/ux.spec.ts:495-496` (carried from 0487fab) | PASS |
| C17 | Conta rows in order | VT passed at 887e336 | `src/acesso/navegacao.test.tsx:56,64-65` (refreshed, carried from 0487fab) | PASS |
| C18 | each Conta row acts | VT passed at 887e336 | `src/acesso/navegacao.test.tsx:83,91,101,109,120` (refreshed, carried from 0487fab) | PASS |
| C19 | 52 px rows, Sair last | PW passed at 887e336 | `e2e/ux.spec.ts:540-541,546` (carried from 0487fab) | PASS |
| C20 | no tab bar at 768 or for staff | PW passed at 887e336 | `e2e/ux.spec.ts:514-515` (carried from 0487fab) | PASS |
| C21 | "Isso resolveu?" after the answer | VT passed at 887e336 | `src/assistente/revisao.test.tsx:37,41-42` (carried from 0487fab) | PASS |
| C22 | in the flow, within 24 px | PW passed at 887e336 | `e2e/ux.spec.ts:696-697` (carried from 0487fab) | PASS |
| C23 | transfer block; invitation at 0 | VT passed at 887e336 | `src/assistente/revisao.test.tsx:64` (carried from 0487fab) | PASS |
| C24 | single bordered block | PW passed at 887e336 | `e2e/ux.spec.ts:734-736` (carried from 0487fab) | PASS |
| C25 | 68ch | PW passed at 887e336 | `e2e/ux.spec.ts:762,770` (carried from 0487fab) | PASS |
| C26 | 44 px composer | PW + VT passed at 887e336 | `e2e/ux.spec.ts:782`; `src/assistente/revisao.test.tsx:79,83` (carried from 0487fab) | PASS |
| C27 | attachment help, 4 cases | VT passed at 887e336 | `src/assistente/revisao.test.tsx:91,95,97,100` (carried from 0487fab) | PASS |
| C28 | send error with Reenviar | VT + PW passed at 887e336 | `src/assistente/revisao.test.tsx:129,145`; `e2e/ux.spec.ts:807-808` (carried from 0487fab) | PASS |
| C29 | rows with a divider | PW passed at 887e336 | `e2e/ux.spec.ts:853,855-856` (carried from 0487fab) | PASS |
| C30 | relative date by calendar day | VT passed at 887e336 | `src/chamados/revisao.test.tsx:41-42`. `:42` is now `getByText(texto, { exact: false })`; see "exact: false" below | PASS |
| C31 | row in 3 lines | PW passed at 887e336 | `e2e/ux.spec.ts:885,891-892,899-900` (carried from 0487fab) | PASS |
| C32 | next step per state | VT passed at 887e336 | `src/chamados/revisao.test.tsx:63` (carried from 0487fab) | PASS |
| C33 | category, responsável and date in the Fila, no student or sector; category wraps at 390 (no ellipsis, `scrollWidth <= clientWidth`); "Mais antigos primeiro" first | VT `Fila com categoria, data e Mais antigos primeiro` + PW `Mais antigos primeiro acima da Fila` passed at 887e336 | `src/chamados/revisao.test.tsx:79-81` (category, date, `'sem responsável'`), `:83` no student or sector; `e2e/ux.spec.ts:914`, `:918` `expect(m.corte).not.toBe('ellipsis')`, `:919` `expect(m.sobra).toBeLessThanOrEqual(0)`; `e2e/arranjo.spec.ts:1096` `toContainText('Carla Regina de Souza')` | PASS |
| C34 | bar per state | PW passed at 887e336 | `e2e/ux.spec.ts:977,985,968` (refreshed, carried from 0487fab) | PASS |
| C35 | Responder scrolls and focuses | PW passed at 887e336 | `e2e/ux.spec.ts:996,999` (refreshed, carried from 0487fab) | PASS |
| C36 | no bar for the student | PW + VT passed at 887e336 | `e2e/ux.spec.ts:1033,1041`; `src/chamados/revisao.test.tsx:99-100` (refreshed, carried from 0487fab) | PASS |
| C37 | Enviar above the bar | PW passed at 887e336 | `e2e/ux.spec.ts:1011` (refreshed, carried from 0487fab) | PASS |
| C38 | no form in RESOLVIDO and FECHADO | VT passed at 887e336 | `src/chamados/revisao.test.tsx:117-118` (refreshed, carried from 0487fab) | PASS |
| C39 | full-screen dialogs | PW passed at 887e336 | `e2e/ux.spec.ts:1098,1106,1110,1112` (refreshed, carried from 0487fab) | PASS |
| C40 | field error below the field | VT + PW passed at 887e336 | `src/administracao/revisao.test.tsx:65-66`; `e2e/ux.spec.ts:1146` (refreshed, carried from 0487fab) | PASS |
| C41 | load error with Tentar de novo | VT passed at 887e336 | `src/ux.test.tsx:199-200,216-217` (carried from 0487fab) | PASS |
| C42 | one period control | VT passed at 887e336 | `src/indicadores/revisao.test.tsx:29-30,39,53-54` (carried from 0487fab) | PASS |
| C43 | 2 columns at 390 | PW passed at 887e336 | `e2e/ux.spec.ts:1165-1169` (refreshed, carried from 0487fab) | PASS |
| C44 | one badge, indexing as an icon | VT passed at 887e336 | `src/conhecimento/revisao.test.tsx:32,39,42,51,60` (carried from 0487fab) | PASS |
| C45 | icon beside the title | PW passed at 887e336 | `e2e/ux.spec.ts:1192-1194` (refreshed, carried from 0487fab) | PASS |
| C46 | "Novo" hidden on an empty list | VT passed at 887e336 | `src/conhecimento/revisao.test.tsx:66-78` (carried from 0487fab) | PASS |
| C47 | formatted CPF and search | VT + PW passed at 887e336 | `src/administracao/revisao.test.tsx:94-95,110`; `e2e/ux.spec.ts:1205` (refreshed, carried from 0487fab) | PASS |
| C48 | `ol` with 3 steps; each step shows its number as visible text **with a box height > 0 and a contrast of 4.5:1 or more**; the title is an `h2`/`h3`; the accessible name starts with the number; template download; errors per line | VT `Matrículas em 3 passos …` (3) + PW `Baixar modelo baixa o CSV com o cabeçalho` passed at 887e336 | `src/administracao/revisao.test.tsx:132` `toHaveTextContent(new RegExp(`^${n} ${titulo}`))`, `:133` `getByText(n)).toBeVisible()` (jsdom, no layout), `:134` `getByRole('heading', { name: `${n} ${titulo}` })`, `:135` `toHaveAccessibleName(new RegExp(`^${n} `))`, `:168`; `e2e/ux.spec.ts:1218`. Searched `ux.spec.ts`, `arranjo.spec.ts` and the VT files for a box or contrast measure of the step number (`rg "Matr\|passo"`): none | FAIL - level gap. The "caixa com altura > 0 e contraste ≥ 4,5:1" clause has no assertion. jsdom's `toBeVisible` does no layout and reads no colour. The product meets the clause: the Verifier measured h = 24 px in all three themes, with contrasts of 17.70 (light), 14.66 (dark) and 14.28 (black), at 390 px with `#8a1538` |
| C49 | whole row is the target, 48 px | PW passed at 887e336 | `e2e/ux.spec.ts:1250,1252` (refreshed, carried from 0487fab) | PASS |
| C50 | form first; Ver prévia | PW passed at 887e336 | `e2e/ux.spec.ts:1267-1268,1272-1273,1278` (refreshed, carried from 0487fab) | PASS |
| C51 | dark preview the same as the app | PW passed at 887e336 | `e2e/ux.spec.ts:1296-1298` (refreshed, carried from 0487fab) | PASS |
| C52 | tinted neutrals | VT + PW passed at 887e336 | `src/ux.test.tsx:149-150`; `e2e/ux.spec.ts:617,620` (carried from 0487fab) | PASS |
| C53 | 27 contrasts at 4.5:1 | PW passed at 887e336 | `e2e/ux.spec.ts:641,644` (carried from 0487fab) | PASS |
| C54 | opsz 32; no new font | PW + VT passed at 887e336 | `e2e/ux.spec.ts:653`; `src/ux.test.tsx:160-161` (carried from 0487fab) | PASS |
| C55 | 4 text sizes per screen | PW passed at 887e336 | `e2e/ux.spec.ts:1343-1344,1348` (refreshed, carried from 0487fab) | PASS |
| C56 | no Sparkles, emoji or gradient | VT `sem Sparkles no código` + PW `-g "sem emoji nem gradiente"` (the proof name now matches) passed at 887e336 | `src/ux.test.tsx:227`; `e2e/ux.spec.ts:1365` `expect(achados.emoji…).toEqual([])`, `:1366` `expect(achados.gradiente…).toEqual([])` | PASS |
| C57 | action colour only in the primary button, active item, link and focus; never in the chart, measured after the bars are drawn | PW (2) passed at 887e336 | `e2e/ux.spec.ts:1381` `waitForFunction(… .recharts-bar-rectangle … height > 0)`; `:1400` `achados.push(`gráfico …`)` when `fill`/`stroke` equals `--primary`; `:1405` `expect(indevidos, …).toEqual([])`; focus `:1421`. Fault F1 killed it | PASS |
| C58 | the student never reads "chamado" | VT passed at 887e336 | `src/ux.test.tsx:231,266` (carried from 0487fab); the SW fallback is now C69 | PASS |
| C59 | Vitest and build pass; edits to existing assertions only from the closed list | `vitest run` 473 passed; build exit 0 at 887e336 | base-existing test files edited in `0487fab..HEAD`: `sw.test.ts`, `test/interface.test.ts`, `administracao/textos.test.tsx`, `administracao/aparencia.test.tsx`, `assistente/anexos.test.tsx`, `e2e/arranjo.spec.ts`. Outside the closed list (`checks.md:37-42,126-128`): `src/test/interface.test.ts:80-81` (the `--chart-1`/`--chart-2` rows of `Tokens`; item 2 names only `--background`, `--muted`, `--border`, `--input` and `--accent`) and `src/sw.test.ts:30` (the body of `push sem JSON legível mostra o texto padrão`) | FAIL - the claim as written is not met. Both edits are forced by C73 and C69, are recorded in the Handoff "Settled mid-build" (2) and in the C72/C73 boundary, and neither weakens anything. The fix is one more line in the closed-list extension |
| C60 | crapper 9.99; dryer below 0.8 | crapper exit 0; dryer "No duplicate candidates found" at 887e336 | `web/.metrics/crap.edn`, `dry.edn` written at 887e336 (`checks.md:650-651`) | PASS |
| C61 | layout suite | PW 6 files: 150 passed at 887e336 | `e2e/ux.spec.ts:1481,1515` among them | PASS |
| C62 | no `api/` change | `git diff --quiet 56cf9d3 HEAD -- api api.Tests` exit 0 | `checks.md:659` | PASS |
| C63 | real e2e, student tabs and Sair | `ux-real.spec.ts:81` passed on the :8087 image of 887e336 (1.0 min) | `e2e/ux-real.spec.ts:111,118,124,136` | PASS |
| C64 | 6 clicks, 1 Sheet | `ux-real.spec.ts:143` passed on the :8087 image of 887e336 (1.1 min), through the new Fila row | `e2e/ux-real.spec.ts:212,214` | PASS |
| C65 | whole e2e suite against :8087 | `npx playwright test`: 173 passed, 0 failed at 887e336 | `e2e/anexos.spec.ts:140` passed | PASS |
| C66 | the action sheet keeps what was typed | PW passed at 887e336 | `e2e/ux.spec.ts:1442,1444` (refreshed, carried from 0487fab) | PASS |
| C67 | "Aberto" column on one line | PW passed at 887e336 | `e2e/ux.spec.ts:1464-1465,1469,1472` (refreshed, carried from 0487fab) | PASS |
| C68 | links as buttons in the staff conversation | VT passed at 887e336 | `src/chamados/revisao.test.tsx:188-189` (refreshed, carried from 0487fab) | PASS |
| C69 | the SW fallback says "Sua solicitação foi atualizada." with no "chamado" | VT `texto reserva fala em solicitação` passed at 887e336 | `src/sw.test.ts:35` `expect(opcoes.body).toBe('Sua solicitação foi atualizada.')`, `:36` `.not.toMatch(/chamado/i)`; `src/sw.ts:21`. Fault F5 killed it | PASS |
| C70 | OPERADOR-only at `/fila`, `/assistente`, `/artigos` goes to `/univag/instituicoes` | VT (3) passed at 887e336 | `src/acesso/navegacao.test.tsx:136` `toHaveTextContent('/univag/instituicoes')`, rendered through the real `App` and `MemoryRouter`. Fault F6 killed all 3 | PASS |
| C71 | the light preview is proven by the button's **painted** colour (`getComputedStyle(...).backgroundColor` equal to a `#8a1538` reference); the attachment help by `toBeVisible()` | VT `prévia muda antes de salvar` + `texto de ajuda dos anexos` passed at 887e336 | `src/administracao/aparencia.test.tsx:71` regex over `index.css` text; `:74` the **test injects** `.previa-marca .bg-primary { background-color: ${marca} }`; `:75` `toHaveClass('bg-primary')`; `:78` `getComputedStyle(entrar).backgroundColor` equal to the reference. `src/assistente/anexos.test.tsx:156` `expect(ajuda).toBeVisible()` | FAIL - the preview half is not a proof of the painted colour. `:78` compares a colour the test wrote at `:74` with the input the test typed, so it is the `--marca-previa` value (`:67`) asserted a second time. Fault F7 (`@theme inline` -> `@theme`) makes the real browser paint the saved `#8a1538` instead of the typed `#224fa7` in the light preview. The test still passes, and so does every PW proof (C50, C51). The anexos half is PASS |
| C72 | 390 px Fila detail is running text "aberto há 2 dias · categoria · responsável", no split word, no column under 120 px | PW `detalhe da Fila em texto corrido no celular` passed at 887e336 | `e2e/ux.spec.ts:1490-1491` anchored `getByText(/^aberto há 2 dias · Financeiro > Boletos e mensalidades · sem responsável$/)` `toHaveCount(1)`; `:1492` width `>= 120`; `:1508-1509` `overflowWrap`/`wordBreak`; `:1510` `expect(m.partidas…).toEqual([])`. Fault F4 killed it | PASS |
| C73 | both charts the same calm colour, not `--primary`, 3:1 or more on the card, chroma > 0.02, 3 themes x with and without `#8a1538` | PW `gráficos com a mesma cor calma` passed at 887e336 | `e2e/ux.spec.ts:1528` `expect(a…).toEqual(b)`; `:1529` `.not.toEqual(await referencia(page, '--primary'))`; `:1531` `contraste(a, fundo)` `>= 3`; `:1536` `croma > 0.02`. Faults F1 and F2 killed it | PASS |

### Builder's notes, judged

- **The Aparência C71 assertion in jsdom.** It is not a proof of the painted colour. jsdom resolves neither `var()` nor Tailwind. The test therefore writes `.previa-marca .bg-primary { background-color: <the inline --marca-previa> }` (`aparencia.test.tsx:74`) and then reads that colour back (`:78`). What it actually proves:
  - the inline variable (already proven at `:67`);
  - the class name `bg-primary`;
  - that `index.css` contains the text of one rule.

  It does not prove that the rule wins the cascade, or that `bg-primary` reads `--primary` where it is used. F7 shows that the second link can break while every proof stays green. **The proof should move to Playwright**: type a colour other than the saved one in the light theme, then compare the Entrar preview button's painted `backgroundColor` with the typed colour. That is C51's pattern with the light theme and a typed colour. The Verifier's probe does exactly this and passes at HEAD: `#224fa7` is painted `rgb(34, 79, 167)`.
- **`revisao.test.tsx` `exact: false`.** Forced and in effect equivalent, though slightly weaker in isolation. Category, date and responsável now live in one joined `span` (`Chamados.tsx:59`), so an exact match on any of the three cannot match. Substring matching is also case-insensitive and would accept the text inside a larger node within the row. The whole string is pinned at the browser level by C72's anchored regex (`ux.spec.ts:1490`), and F4 was killed there and also by C33's `scrollWidth` assertion. `chamados/revisao.test.tsx` was created by this feature, so these edits are not edits to existing assertions.
- **Build order.** Closed. The build was run at `887e336` after all edits, exit 0.

## Coverage

Rows the fix touched were recomputed at 887e336. The others are carried from 0487fab.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| roles x out-of-role guarded routes (35 = 9 + 10 + 5 + 11) | `Autenticado.tsx:20-31,324-331`, `sessao.ts:9-16` (verified at 887e336) | ALUNO 9, ATENDENTE 10, ADMINISTRADOR 5: C10 (`ux.test.tsx:101`); OPERADOR `/fila`, `/assistente`, `/artigos`: C70 (`navegacao.test.tsx:136`) | gap: OPERADOR at the other 8 out-of-role routes (`solicitacoes`, `indicadores`, `documentos`, `usuarios`, `matriculas`, `cadastros`, `aparencia`, `conta`). The guard is generic (`desvio`), so the risk is low, but no case opens them as OPERADOR only, and `checks.md` Coverage still reads "papéis e rotas da guarda (24)" without the OPERADOR row |
| `## Screens` arrangement items (design authority) | `plan.md:82-135` (Matrículas, Fila and Indicadores re-read at 887e336; the rest carried) | 46 items: C13 to C51. Matrículas numbering: C48 VT (digit text, heading, accessible name). Fila responsável: C33 | - (the painting of the step number is a C48 clause gap, recorded there) |
| action-colour surfaces (button, active item, link, focus, Sigla; never chart or badge) | `plan.md:236`, `checks.md:113` (verified at 887e336) | button, active item, link, Sigla, badges: C57 `ux.spec.ts:1395-1399`; chart: C57 `:1381,1400` and C73 `:1529`; focus: `:1421` | - |
| chart colour: themes (3) x brand (2) | C73 claim (verified at 887e336) | light, dark, black x none, `#8a1538`: C73 loop `ux.spec.ts:1518-1536` | - |
| Fila 390 px row fields (category, responsável, date) | P2 + amended C33/C72 (verified at 887e336) | category C33, C72; responsável C33 (`sem responsável` VT, named holder `arranjo.spec.ts:1096`), C72; date C33, C72 | - |
| student texts without "chamado" (4 screens + SW fallback) | Impact: textos; `sw.ts` (verified at 887e336) | screens C58; SW fallback C69 | - (the API's push text `PushEnviador.cs:32` is out of scope because there is no API change) |
| base-existing test files edited (6) | `git diff 0487fab..HEAD` against `git cat-file -e 56cf9d3:<file>` (verified at 887e336) | `textos.test.tsx`, `aparencia.test.tsx`, `anexos.test.tsx`, `arranjo.spec.ts`: closed list and its 2 extensions | gap: `interface.test.ts` chart rows and `sw.test.ts:30` are outside the closed list (C59) |
| detail bar per state (5) | carried from 0487fab | C34 | - |
| load-error surfaces (11) | carried from 0487fab | C41 | - |
| tinted tokens (14) | carried from 0487fab | C52 | - |
| next step per state (5) | carried from 0487fab | C32 | - |
| relative date (4 x 2) | carried from 0487fab | C30 | - |
| form dialogs (6) | carried from 0487fab | C39, C40 | - |
| Cadastros lists (5) | carried from 0487fab | C49 | - |
| screens for C55 to C57 (16 + Conta + Instituições) | carried from 0487fab | C55, C56, C57 | - |

## Faults injected

All faults were injected in a `git worktree` scratch copy at `887e336`, with a `node_modules` junction. The real tree's `git status --porcelain` was recorded first and matched the baseline afterwards. The mutator is suspended (AD-025), so every fault was applied by hand. For the PW faults, the scratch copy was built with `vite build` and served by `vite preview` on :5198. F2 and F4 shared one build because they hit disjoint proofs (chart colour against Fila text).

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: `--chart-1` and `--chart-2` back to `var(--primary)` (light and dark) | `web/src/index.css:37-38,77-78` | yes - C57 `ux.spec.ts:1405` "Indicadores: cor de ação fora de …" and C73 `:1529` "light sem cor: não é --primary" |
| F2: `--chart-2` different again (`oklch(0.60 0.10 200)` / `oklch(0.75 0.10 200)`) | `web/src/index.css:38,78` | yes - C73 `ux.spec.ts:1528` "light sem cor: mesma cor nos dois" |
| F3: Matrículas back to `list-decimal` on a `flex` `li`, no visible digit (`Matriculas.tsx` of `0487fab`) | `web/src/administracao/Matriculas.tsx:42-55` | yes - C48 VT "os 3 passos numerados" failed |
| F4: Fila 390 px detail as flex columns again (separate `span`s for date, category and responsável) | `web/src/chamados/Chamados.tsx:59` | yes - C72 `ux.spec.ts:1491` count 0, and C33 `:919` `sobra` 18 |
| F5: SW fallback back to "Seu chamado foi atualizado." | `web/src/sw.ts:21` | yes - C69 and the 4 `push sem JSON legível` cases failed |
| F6: `telaInicial` sends OPERADOR-only to `fila` | `web/src/sessao.ts:14` | yes - C70, 3 of 3 failed |
| F7: `@theme inline` -> `@theme` (Tailwind resolves `--color-primary` at `:root`, so `.previa-marca`'s `--primary` no longer reaches `bg-primary`) | `web/src/index.css` (`@theme inline {`) | no - C71 `aparencia.test.tsx` passed (9/9). PW C50 and C51 also passed. The Verifier's probe shows the regression is real: light preview, typed `#224fa7`, painted `rgb(138, 21, 56)` (the saved colour) instead of `rgb(34, 79, 167)` at HEAD |

7 injected, 6 killed, 1 survived. F7 was added to the six faults the caller listed because C71's assertion is a surface this fix created and the builder's note asked whether it proves the paint.

## Findings, ranked

1. **(C71, major, proof) The light preview colour is still not proven by its paint.**
   - What the test does: it injects the rule that paints the button (`aparencia.test.tsx:74`), then compares the result with the typed input (`:78`).
   - Why that falls short: F7, a realistic Tailwind regression, breaks the light preview in the browser and nothing fails.
   - Fix: move the proof to Playwright. Light theme, type a colour other than the saved one, compare the painted `backgroundColor` of the preview's Entrar with the typed colour.
2. **(C48, medium, level gap) The amended clause "caixa com altura > 0 e contraste ≥ 4,5:1" has no assertion.**
   - What is proven: the VT proves the digit text, the heading and the accessible name. Its `toBeVisible` in jsdom is not a box or a colour.
   - The product is right: the Verifier measured 24 px boxes with contrasts of 17.70, 14.66 and 14.28.
   - Fix: a PW assertion would close it, and it is the same measurement the Verifier's probe made.
3. **(C59, low, process) Two existing assertions were edited outside the closed list.**
   - The edits: `interface.test.ts:80-81` (`--chart-1`/`--chart-2` rows) and `sw.test.ts:30` (the fallback body).
   - Both are forced by C73 and C69 and both are recorded in the Handoff. Neither weakens anything.
   - Fix: extend the closed list.
4. **(Coverage, low) OPERADOR-only is proven at 3 of its 11 out-of-role routes.**
   - The `checks.md` Coverage row "papéis e rotas da guarda (24)" was not updated for OPERADOR.
5. **(Note) `exact: false` in `chamados/revisao.test.tsx` is forced by the single text run.** C72's anchored regex makes it equivalent in effect.

Round-1 findings now closed:
- chart colour (C57, F1 killed);
- Matrículas visible numbering (product fixed; C48 text proven, F3 killed);
- C56 proof name;
- Fila mobile responsável (C33, C72);
- ellipsis on categories (C33 `:918-919`; F4 also killed there);
- `sw.ts` fallback (C69);
- OPERADOR guard test (C70; partial, finding 4);
- `toBeVisible` in anexos (C71, `anexos.test.tsx:156`).

## Gate

`cd web && npx vitest run`: 473 passed, 0 failed. Build exit 0. Layout PW: 150 passed. Real e2e on :8087 against the image of `887e336`: 173 passed, 0 failed. crapper exit 0; dryer no candidates; C62 exit 0. `validate_verification.py revisao-ux` was run after writing this report.

Cleanup:
- removed: container `one-revisao-ux-verif2`, image `one-revisao-ux-verif2:887e336`, database `one_revisao_verif2`, MinIO bucket `one-revisao-ux-verif2`, the scratch worktree (junction removed first with `cmd /c rmdir`), the preview servers on :5199 and :5198;
- left alone: the compose `api` on :8080, Postgres, MinIO and Mailpit;
- the real tree's porcelain equals the baseline.
