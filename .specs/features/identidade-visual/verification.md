# Identidade visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 6d83112..4e5dabc (HEAD); fix range a5b75e3..4e5dabc
**Round**: 3 - scoped
**Verifier**: fresh sub-agent with no inherited context (author != verifier); round 3; it wrote none of this code, fixed nothing and committed nothing

**What fails, exactly.** No check fails and I found no user-visible defect in the fix: all 54 checks PASS, and round 2's findings 1, 2 and 3 are closed, measured on the real API. The FAIL comes from one rule of the procedure: three mutants survive on the surface this fix created, the `.form-resposta:not(.dark *)` rule (`web/src/index.css:101-103`). C48 and C54 only set a floor of 3:1, and the `Tokens` pin (`web/src/test/interface.test.ts:79`) reads `:root`, `.dark` and `.black`. So nothing notices the override leaking into dark (F2), going much darker (F11) or dropping the institution's hue (F12). F12 goes against `.specs/features/revisao-ux/plan.md:53`, where `--input` carries the brand hue. HEAD does none of the three.

Whether that is a defect to fix or a gap to accept is the user's decision. The fix would be small: one literal assertion on the rule (finding 1). It has not been built or run.

Proofs run at HEAD by me, one invocation per target:
- `cd web && npx vitest run`: 520 passed, 0 failed, 54 files.
- `npm --prefix web run build`: exit 0; precache 12 entries.
- `npm --prefix web run coverage`, then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. `dryer` with the C41 list piped to `grep -q "No duplicate candidates found"`: exit 0.
- Layout suite (the 8 specs of C42) against `npx vite preview --port 5199`: 191 passed, 1 failed. The failure is `web/e2e/plataforma.spec.ts:4` `manifesto e service worker`, which needs an API on :5226. It passed on my image, so I judge it an environment limit.
- `git diff --quiet 6d83112 HEAD -- api api.Tests`: exit 0.
- Real e2e: my own image `one-verif-r3:4e5dabc` (`git archive HEAD | docker build`) on :8089, database `one_verif_r3`, bucket `one-verif-r3`, institution `e2e`: **200 passed, 0 failed, 0 flaky** on the first run, 7.6 min.
- All 76 `Proof:` lines of `checks.md`: 69 name a test, and each resolved by script to a test that exists and passed in those JSON outputs (0 missing). The other 7 are whole-suite or command proofs, run as above.

`checks.md` has no `Test policy` section (`grep -c` gives 0), so there are no rows to judge.

Each section says where it came from: what the fix touched is **verified at 4e5dabc**; the rest is **carried from 4c83930** (round 2) or from 6d907af (round 1). Green proofs are all from 4e5dabc.

## Round 2 findings

Verified at 4e5dabc.

| # | Round 2 finding | State | Why |
| --- | --- | --- | --- |
| 1 | "Resposta pronta" select under 3:1 | **closed** | real API, 3 brands: 3.26 to 3.31:1 in light. C54 proves 2 brands; F5 and F1 killed |
| 2 | `dark:border-input` cancels focus and error | **closed** | the class is gone (`web/src/chamados/ChamadoDetalhe.tsx:116`). Focus and error change in all 9 combinations, table below. F3, F4, F10 killed |
| 3 | C48's student case draws staff | **closed** | `web/e2e/identidade.spec.ts:1137` returns `eventos: null`; `:1141` asserts "Nota interna" 0 for the student and 1 for staff. F6 and F8 killed; F8 is round 2's surviving fault |
| 4 | "Responder" focus at 2.33:1, light, no colour | unchanged, recorded | still 2.33. `--ring` is not in the diff, and the override does not touch it. Finding 3 |
| 5 | app-wide focus ring under 3:1 | unchanged, recorded | `--ring` and `web/src/ui/button.tsx` not in the diff. Finding 3 |
| 6 | docs residue in `checks.md` | closed | the "logo abaixo do nome" text is gone (`.specs/features/identidade-visual/checks.md:70` now reads "logo acima do rótulo CPF"); `:6` says 54 checks and P1 a P16 |
| 7 | offline reads as "Instituição não encontrada." | unchanged, recorded | `web/src/acesso/Acesso.tsx` not in the fix diff. Finding 4 |
| 8 | forced colours; C47 wording | unchanged, recorded | no `outline` change in the diff; not re-measured. Finding 5 |
| 9 | carried small items | unchanged | carried from 6d907af |

## Measured on the real API

Verified at 4e5dabc, on my image with its own institution `verif` (so the e2e's first access stayed unused): an administrator who also attends Triagem, a ready answer in that sector, and a real student's ticket `ONE-3`. Contrast by my own 1x1 canvas and WCAG code, not `window.__ux`. Border against the `form`'s background; `aria-invalid` set by hand.

**The select and "Responder" measure the same in every cell, and 390 equals 1280.**

| Theme, colour | rest | focus | `aria-invalid` |
| --- | --- | --- | --- |
| light, no colour | 3.29 | **2.33** | 4.29 |
| light, `#8a1538` | 3.31 | 8.36 | 4.26 |
| light, `#0b6e4f` | 3.26 | 5.65 | 4.31 |
| dark, no colour | 3.82 | 3.56 | 5.84 |
| dark, `#8a1538` | 3.82 | 5.67 | 5.89 |
| dark, `#0b6e4f` | 3.85 | 6.77 | 5.80 |
| black, no colour | 4.10 | 3.82 | 6.26 |
| black, `#8a1538` | 4.08 | 6.05 | 6.28 |
| black, `#0b6e4f` | 4.14 | 7.28 | 6.24 |

- Every focus state matched `:focus-visible`. Every error border equals resolved `--destructive`.
- **"Nota interna" on:** "Responder" gives the same three numbers in every row; the select and the attachments leave the form (select count 0).
- **The real student's screen:** "Nota interna" count 0, and the same numbers for "Responder" in all 18 combinations.
- **`#0b6e4f`, which no test covers:** agrees with the builder's hand measure (3.26, 3.85, 4.14).
- **Any brand the API accepts:** I swept 1476 hex colours with at least 4.5:1 against white (`MinimoDeContraste`, `web/src/aparencia.tsx:102`), one per 17 steps of each channel, computing the two tokens' formulas. Field against form: 3.22 (`#bb5500`) to 3.47 (`#000000`), 0 under 3:1. Without the override the minimum is 2.88. So the margin holds, and the override really is needed.

The 2.33 in the table is on the select too, not only on "Responder". Same token, same tint.

## The mechanism

Verified at 4e5dabc.

**Runtime appearance: it neither ignores nor fights it.** `web/src/aparencia.tsx:62` sets only `--marca`, inline on `<html>`, and never `--input`. The rule reads `var(--marca, ...)` on the form, so it re-resolves with the same input as the token.
- `--marca` set with the form on screen: 3.29 to 3.31, hue 262 to 10.48. `--input` reads `color-mix(in oklch, #8a1538 6%, oklch(63% 0 none))` on the form and the same at 66% on `<html>`.
- The real flow: type the colour in Aparência, "Salvar", follow the SPA to the ticket with no reload: 3.31, equal to a reload.
- Theme classes changed under a mounted form, light, dark, black, light: 3.31, 3.82, 4.08, 3.31.

**Black.** `web/src/ui/theme-provider.tsx:49` puts `dark` and `black` on the root, so `:not(.dark *)` excludes it. Values match round 2's for dark and black.

**Aparência preview.** It has no `.form-resposta`; `.previa-marca` (`web/src/index.css:106-108`) touches only `--primary`. Measured with a typed colour in light, and in black: `--input` in the preview equals the root's.

**Reach.** `form-resposta` appears once, at `web/src/chamados/ChamadoDetalhe.tsx:113`. `border-input` exists in `web/src/ui/input.tsx`, `native-select.tsx`, `textarea.tsx`, `tabs.tsx`, `calendar.tsx` and `web/src/conhecimento/Resposta.tsx`, so in this form it reaches the select and "Responder", nothing else.

**Drift: yes, it can drift, and no test would catch it short of the floor.** The rule repeats the token's formula by hand. Three ways it can go:
- Change the override: F2, F11, F12 survive; only a grey above about 0.65 fails (F7, 2.96:1).
- Change the token at `web/src/index.css:34`: `web/src/test/interface.test.ts:79` fails, the row gets edited, and the override stays behind in silence. I reasoned this one from the code and did not run it.
- `web/e2e/ux.spec.ts:559` reads `--input` at the root, so it does not see the override either.

**Out of line? No.** Round 2's "one dark box" is gone.
- Light, same screen at 1280: the form's fields against "Resolução", "Categoria" and "Original" outside it: 3.29 / 3.28 no colour, 3.31 / 3.30 with `#8a1538`, 3.26 / 3.23 with `#0b6e4f`.
- Raw colour with `#8a1538`: `139,131,132` in the form, `147,140,140` on other screens (3.18:1 on Usuários, Indicadores, Aparência). The lightness step is 0.03.
- Opened by eye in light and dark: `.playwright-mcp/identidade/verificador-r3/form-light-marca.png` and `form-dark-marca.png`. Select and field read as one family.

## Binding sources

Step 1 re-run only for the reply form, the one screen the fix touched. Everything else, including the divergences the plan decided on purpose, is carried from 6d907af.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/identidade-visual/pesquisa.md` | carried from 6d907af, the fix touched nothing it decides | none | - |
| `.specs/features/revisao-ux/pesquisa.md` §15, "Bordas de campos, ícones e foco: 3:1" | yes, verified at 4e5dabc | none | recorded, do not carry this FAIL, not worsened by the fix: focus 2.33:1 in light without colour on both fields; attachments' dashed area 1.21:1 (1.30:1 at `6d83112`) |
| `.specs/features/revisao-ux/plan.md:53` door 2, `--input` with the hue of `--marca` | yes, verified at 4e5dabc | none, HEAD follows it (hue 10.48 with `#8a1538`) | no proof for the override's copy of the formula: F12 |
| `.specs/features/revisao-ux/checks.md:635` C57, "a borda dele passa a ter a cor de foco" | yes, verified at 4e5dabc | none, now true on "Responder" and the select in all themes | - |

**Per-screen enumeration.**

| Screen | Decided, reachable by a selector | Checks | Uncovered |
| --- | --- | --- | --- |
| Detail, reply block | tint; select and "Responder" at 3:1; focus and error on "Responder"; student without "Nota interna" | C34, C48, C54 | select's focus and error (right by measure, no check names them); attachments' dashed area |

## Checks

Proofs verified at 4e5dabc. Citations refreshed for the files the fix touched: `web/e2e/identidade.spec.ts` keeps its lines up to `:1134` and moves after; `checks.md` moved by 1 after `:155`. Assertion text carried from 4c83930 where that part of the file did not change.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | only the 2 font packages, no Inter | vitest, passed | `web/src/identidade.test.tsx:14` `filter(startsWith('@fontsource'))` toEqual the 2 packages; `:18-19` not.toContain('inter') | PASS |
| C2 | both faces loaded, app origin only | layout, passed | `web/e2e/identidade.spec.ts:44-46` FontFace `loaded`, no Inter; `:52-55` woff2 URLs, no `inter-`, single origin | PASS |
| C3 | 7 sans roles at 390 and 1440 | layout, passed | `web/e2e/identidade.spec.ts:94` `expect(r.fora).toEqual([])`; `:116` at least 1 per type | PASS |
| C4 | serif only on allowed elements, 20 px or more | layout, passed | `web/e2e/identidade.spec.ts:141-144`; `:153` at least 1 on 5 screens | PASS |
| C5 | 23 radius measures | layout, passed | `web/e2e/identidade.spec.ts:171` `toEqual([e,e,e,e])`; `:177` pill; `:251` `medidas.length` 23 | PASS |
| C6 | pills only in the allowed set | layout, passed | `web/e2e/identidade.spec.ts:288-289`; `:297-298` | PASS |
| C7 | radius scale, no `--radius` | vitest, passed | `web/src/identidade.test.tsx:27` toEqual `[4, 6, 12, 16]` | PASS |
| C8 | latin fonts in precache, up to 90 KB, no Inter | layout, passed | `web/e2e/identidade.spec.ts:318-323` `toBeLessThanOrEqual(90 * 1024)` | PASS |
| C9 | single column, 24 cases | layout, passed | `web/e2e/identidade.spec.ts:350-351`, `:365`, `:371`, `:374` `casos` 24 | PASS |
| C10 | order on Login, 2 cases | layout, passed | `web/e2e/identidade.spec.ts:400` helper right before "CPF"; `:417` top against previous bottom | PASS |
| C11 | serif 28, muted texts, marker, background | layout, passed | `web/e2e/identidade.spec.ts:440-441`, `:443-444`, `:449-450`, `:469-470` | PASS |
| C12 | Primeiro acesso, Criar senha | layout, passed | `web/e2e/identidade.spec.ts:503`; `:507` helper count 0 | PASS |
| C13 | photo in the right column | layout, passed | `web/e2e/identidade.spec.ts:524-532`, `:543-546` | PASS |
| C14 | 160 px strip below 1024 | layout, passed | `web/e2e/identidade.spec.ts:566` height 160; `:569-570` above logo and field; `:581` no text over it | PASS |
| C15 | texts and logo, 4 cases | vitest, passed | `web/src/acesso/identidade.test.tsx:27` logo `src`; `:28`, `:38` helper once | PASS |
| C16 | root | vitest and layout, passed | `web/src/acesso/identidade.test.tsx:50` 0 `svg`; `web/e2e/identidade.spec.ts:594`, `:603` | PASS |
| C17 | title and phrase, 4 cases | vitest, passed | `web/src/assistente/identidade.test.tsx:24`; `:26-27` no "Olá! Eu sou" | PASS |
| C18 | serif 24 left | layout, passed | `web/e2e/identidade.spec.ts:631-633`, `:636`, `:639-640` | PASS |
| C19 | assistant with and without photo | vitest and layout, passed | `web/src/assistente/identidade.test.tsx:44-45`; `web/e2e/identidade.spec.ts:653-658` | PASS |
| C20 | open request, 8 cases | vitest, passed | `web/src/assistente/identidade.test.tsx:70-76` link and order; `:80-81` none and no alert | PASS |
| C21 | border in action colour, before questions | layout, passed | `web/e2e/identidade.spec.ts:670-674` `referencia('--primary')` | PASS |
| C22 | 48 px rows, divider, icons, tap sends | layout and vitest, passed | `web/e2e/identidade.spec.ts:691`, `:698`, `:701-702`, `:707`; `web/src/assistente/identidade.test.tsx:96`; `web/src/assistente/boasvindas.test.tsx:60` | PASS |
| C23 | previous period, 3 cases, exactly 2 reads | vitest, passed | `web/src/indicadores/identidade.test.tsx:48`, `:52` exact URLs | PASS |
| C24 | up, down, equal | vitest, passed | `web/src/indicadores/identidade.test.tsx:65` `findByText(texto)` with `▲ 4,2 pts`, `▼ 1,0 pt`, `= sem variação` | PASS |
| C25 | no variation on failure or no data | vitest, passed | `web/src/indicadores/identidade.test.tsx:84-85` absent and no alert; `:91` control | PASS |
| C26 | rounding and plural | vitest, passed | `web/src/indicadores/identidade.test.tsx:100` with `= sem variação`, `▲ 1,9 pt`, `▲ 2,0 pts` | PASS |
| C27 | serif 40, variation beside, at 390 and 1440 | layout, passed | `web/e2e/identidade.spec.ts:762-770`, `:774-775` | PASS |
| C28 | strip by `main` width, 4 cases | layout, passed | `web/e2e/identidade.spec.ts:785`, `:788`, `:794`, `:800` | PASS |
| C29 | 9 rows, 2 or 1 columns | layout, passed | `web/e2e/identidade.spec.ts:831`, `:834-837`, `:843-844`, `:847` | PASS |
| C30 | charts without card, with title | layout, passed | `web/e2e/identidade.spec.ts:862`, `:865`, `:868` | PASS |
| C31 | only `Planilha` | vitest, passed | `web/src/identidade.test.tsx:41`, `:43`; `web/src/ilustracoes/ilustracoes.test.tsx:18` | PASS |
| C32 | Aparência without box, 32 px | layout, passed | `web/e2e/identidade.spec.ts:892-893`, `:895`, `:898` | PASS |
| C33 | Dados do aluno, Histórico | layout, passed | `web/e2e/identidade.spec.ts:923`, `:926`, `:930-931`, `:936` | PASS |
| C34 | no box, tint only on action, 32 px | layout, passed | `web/e2e/identidade.spec.ts:950-951`, `:958-959`, `:966`. The form keeps `bg-muted` (`web/src/chamados/ChamadoDetalhe.tsx:113`) | PASS |
| C35 | empty states, 8 cases | vitest, passed | `web/src/tabela.test.tsx:52-56`; `web/src/indicadores/identidade.test.tsx:171` | PASS |
| C36 | icon 28 centred, 16 measures | layout, passed | `web/e2e/identidade.spec.ts:1009-1012`, `:1014-1016`, `:1018`, `:1030` | PASS |
| C37 | `Planilha` in step 2 | vitest, passed | `web/src/administracao/identidade.test.tsx:40` text toEqual the CSV header | PASS |
| C38 | 7 columns in a row | layout, passed | `web/e2e/identidade.spec.ts:1041`, `:1044`, `:1050-1051` | PASS |
| C39 | preview | vitest and layout, passed | `web/src/administracao/identidade.test.tsx:60`, `:65`; `web/e2e/identidade.spec.ts:1064`, `:1070`, `:1072` | PASS |
| C40 | suite and build pass; edits only from the closed list | vitest 520, build 0 | `.specs/features/identidade-visual/checks.md:595-596`; list at `:32` with item 9 at `:123`. See Edits below | PASS |
| C41 | crapper and dryer | both exit 0 | `.specs/features/identidade-visual/checks.md:602-603` run as written | PASS |
| C42 | layout suite whole | 191 of 192 on preview; the other passes on the image | `web/e2e/plataforma.spec.ts:4` needs an API on :5226; passed on :8089 | PASS |
| C43 | no change in `api/` | exit 0 | `.specs/features/identidade-visual/checks.md:612` run as written | PASS |
| C44 | real fonts, request line, 2 reads | real e2e, passed | `web/e2e/identidade-real.spec.ts:115`, `:124-125`, `:150-151` | PASS |
| C45 | whole suite on the image, no other real spec edited | 200 passed | `.specs/features/identidade-visual/checks.md:630`; the feature's diff touches no real spec but `web/e2e/identidade-real.spec.ts` | PASS |
| C46 | 11 named tests pass without edit | layout and vitest, passed | `web/e2e/ux.spec.ts:109`, `:156`, `:230`, `:589`, `:379`, `:386`, `:1349`, `:565`; `web/src/ux.test.tsx:139`. The fix range edits none | PASS |
| C47 | row focus 3:1, 2 px or more, 12 cases | layout, passed | `web/e2e/identidade.spec.ts:1118` espessura `toBeGreaterThanOrEqual(2)`; `:1119` contraste `toBeGreaterThanOrEqual(3)`; `:1112` control `toEqual([])`; `:1122` `medidas` 12 | PASS |
| C48 | "Responder" border 3:1, for student and staff, both brands, 3 themes, 390 and 1280 | layout and real, passed | `web/e2e/identidade.spec.ts:1143` `expect(contraste(borda, fundo)).toBeGreaterThanOrEqual(3)`; `:1146` `expect(medidas).toBe(24)`; `:1137` `eventos: null`; `:1141` "Nota interna" `toHaveCount(aluno ? 0 : 1)`. F6, F8 and F9 killed | PASS |
| C49 | no variation while a response is pending | vitest, passed | `web/src/indicadores/identidade.test.tsx:113` not in document for the 4 texts; `:132` `▲ 10,0 pts`; `:125` control | PASS |
| C50 | `semDados` with a number hides it | vitest, passed | `web/src/indicadores/identidade.test.tsx:143-144` absent and no alert; `:148` control `▲ 4,2 pts` | PASS |
| C51 | name between phrase and request | layout, passed | `web/e2e/identidade.spec.ts:1199-1201` the 3 `toBeGreaterThanOrEqual` | PASS |
| C52 | variation below the number at 360 | layout, passed | `web/e2e/identidade.spec.ts:1217` below; `:1218` `perto(v.x, n.x)`; `:1219` no horizontal overflow | PASS |
| C53 | empty date and precache | vitest and layout, passed | `web/src/indicadores/identidade.test.tsx:153-154` `toBeNull`; `:161-162` no `NaN`, 3 reads; `web/e2e/identidade.spec.ts:1238` other alphabets `toEqual([])`; `:1239-1240` 2 latin files | PASS |
| C54 | select at 3:1; focus equal to a common field and different from rest; error equal to `--destructive`; student's screen; 3 themes, 2 brands, 390 and 1280 | layout and real, passed | `web/e2e/identidade.spec.ts:1169` select `toBeGreaterThanOrEqual(3)`; `:1178` `toBe(comumFoco)`; `:1179` `.not.toBe(repouso)`; `:1183-1184` `toBe(destrutivo)`; `:1188` `expect(medidas).toBe(12)`; student bullet at `:1141`. F3, F4, F5, F10 killed | PASS |

**C54 against its own text, each bullet in all combinations.** The loop at `web/e2e/identidade.spec.ts:1155-1157` runs all three bullets 12 times, and `:1188` counts them. Two notes that do not change the result: the test focuses with `.focus()` where the claim says "por teclado" (I measured `:focus-visible` true on both fields, and a `textarea` always matches); and the "campo comum" clones the Responder's own `className` (`:1171`), so a class fault reaches the control too. F4's failure was on the control's line. The absolute comparisons (`:1179`, `:1183-1184`) are what hold it up, and they did.

### Edits to existing assertions, against the closed list

Verified at 4e5dabc. **Confirmed: `## Handoff` is right.** In `a5b75e3..HEAD` the only test file is `web/e2e/identidade.spec.ts`, +48 -2. The 2 removed lines are the `import` at `:3` and the `await em(...)` of C48, which gains `rotas`; neither is an assertion. C48's `:1143` limit and `:1146` count are as they were. No test file under `web/src` changes. Whole-feature edits are carried from 4c83930.

## Coverage

Rows the fix touched are verified at 4e5dabc; the rest are carried, as marked.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| fields in the tinted reply block (3) | the form in `web/src/chamados/ChamadoDetalhe.tsx:113-118`, real API at `api/Chamados/Shared/DetalheChamado.cs:53` | select C54 · `Textarea` C48, C54 | attachments' dashed area: no check, 1.21:1, under 3:1 before this feature (1.30:1 at base); recorded, does not carry this FAIL |
| "Responder" border: views (2) | `web/src/chamados/ChamadoDetalhe.tsx:420` | staff C48, C54 · student C48 with control | - |
| "Responder" border: themes (3), brands (2), widths (2) | C48, C54 | all 12, faults killed for theme, floor and view | - |
| "Responder" border: states (3) | `web/src/ui/textarea.tsx:9` | rest C48 · focus C54 · error C54 | - |
| select border: states (3) | `web/src/ui/native-select.tsx:20-21` | rest C54 | focus and error: right by my measure, no proof, C54 names only "Responder" |
| the override rule: what it must keep (3) | `web/src/index.css:101-103`, `.specs/features/revisao-ux/plan.md:53`, Handoff "no claro só" | floor in light C48, C54 | light only: F2 · brand hue: F12 · not darker than the token's family: F11 |
| Nota interna on (1) | `web/src/chamados/ChamadoDetalhe.tsx:55`, `:117` | measured, same numbers | no proof; nothing in C48 or C54 ticks it |
| question row focus (12) | C47, carried from 4c83930 | all, with control | - |
| Assistente items in order (5) | Screens, carried from 4c83930 | C18, C51 | - |
| variation results (6), in time (2), widths and strings | AC 12, AC 13, carried from 4c83930 | C24, C25, C26, C50, C49, C27, C52 | - |
| precache by alphabet, empty date (2) | `web/vite.config.ts:35`, `web/src/indicadores/Indicadores.tsx:204`, carried from 4c83930 | C53, C8 | - |
| AC 22 invariants (6) | `.specs/features/identidade-visual/plan.md:168` | 44 px, 16 px, tab bar, action colour, tints C46 · contrast on the tinted surface C48, C54 | - |
| sans roles (7) · serif roles (5) · font files (3) · radius roles (9) | carried from 6d907af | C2, C3 · C4, C27, C11, C18, C16 · C8, C1, C2, C44 · C5, C6, C7, C22 | - |
| access screens x photo x widths · Assistente states (15) · request states (5) | carried from 6d907af | C9 to C15 · C17, C19, C20 · C20, C44 | - |
| previous period (3) · empty states (8) · illustrations (6), columns (7) · static blocks (3), titles (3), tinted (2) | carried from 6d907af | C23, C44 · C35, C36 · C31, C37, C38 · C32, C33, C34 | - |

`Swept` rows that say "existing": carried from 6d907af and 4c83930.

## Faults injected

Run in a `git worktree` of HEAD inside the repo, with `node_modules` as a junction and its own preview on :5198. Each fault: replace one literal (the driver stops if it does not occur exactly once), confirm `git diff --stat` shows it, rebuild, run both proofs, restore with `git checkout`, rebuild.

**Each fault really ran.** The two proofs went green on the unmodified worktree first (row 1). Every failure below is the test's own assertion with a measured value, not a setup error. The 7 faults the brief names are F1 to F7; F8 to F12 are mine. The cap of five is exceeded on purpose, since the brief lists these. `mutator` suspended (AD-025).

| Mutation | Location | Killed |
| --- | --- | --- |
| none, baseline | HEAD | baseline: C48 and C54 both green |
| F1 override removed | `web/src/index.css:102` | yes - C48 "ALUNO a 390" 2.96, C54 "borda do select" 2.96 |
| F2 override applied in dark too | `web/src/index.css:101` | no - C48, C54, `web/src/test/interface.test.ts` and `web/src/identidade.test.tsx` all green. Harmless to the floor (dark goes up), but dark stops being what the Handoff says it is |
| F3 `dark:border-input` back on the `Textarea` | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C54 "dark sem cor: foco difere do repouso" |
| F4 `aria-invalid` variant cancelled | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C54 "campo comum em erro", received the `--input` colour |
| F5 select with its own weak border | `web/src/chamados/ChamadoDetalhe.tsx:55` | yes - C54 "borda do select" 1.21 |
| F6 student case drawing staff | `web/e2e/identidade.spec.ts:1137` | yes - C48 "ALUNO a 390: Nota interna", expected 0 |
| F7 grey raised to 0.66 | `web/src/index.css:102` | yes - C48 and C54, 2.96 |
| F8 override for staff only | `web/src/chamados/ChamadoDetalhe.tsx:113` | yes - C48 "ALUNO a 390" 2.96. Round 2's survivor, now caught |
| F9 override for the student only | `web/src/chamados/ChamadoDetalhe.tsx:113` | yes - C48 "ATENDENTE a 390" 2.96, C54 select 2.96 |
| F10 focus variant cancelled | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C54 "foco igual ao campo comum" |
| F11 override grey 0.30, a much darker box | `web/src/index.css:102` | no - C48, C54 and the two Vitest files all green. No ceiling exists |
| F12 override ignores the brand, hue fixed at 262 | `web/src/index.css:102` | no - C48, C54 and the two Vitest files all green. `.specs/features/revisao-ux/plan.md:53` wants the hue |

**No other test sees them either.** A single build combining F2, F11 and F12 ran the whole layout suite: 189 passed, and only C48, C54 and the environment failure `web/e2e/plataforma.spec.ts:4` failed. C48 and C54 fell because 0.30 in dark is under the floor, a product of combining them; each fault alone passes both. `web/src/test/interface.test.ts` and `web/src/ux.test.tsx` stayed green, 88 tests. So those three survive everything that reaches the rule.

Real tree porcelain before and after: identical (`?? .idea/`, `?? .playwright-mcp/`, `?? web/apresentacao/`).

## Findings

Ranked. Only 1 carries the FAIL.

1. **The override rule has a floor and nothing else: F2, F11 and F12 survive.** `web/src/index.css:101-103`. HEAD behaves correctly on all three, as measured above. The risk is a later edit: someone changes the rule or the token, and the two copies part in silence. A literal assertion on this rule beside `web/src/test/interface.test.ts:79` would kill all three, and deriving it from the `Tokens` row would also catch a token change. Not built, not run.
2. **Small gaps on the same form, no defect.** The select's focus and error, and "Nota interna" on, are right by measure with no test. C54 names only "Responder" for focus and error, so this is a precision gap and C54 is not wrong.
3. **Recorded, not worsened: focus under 3:1.** "Responder" and the select focus at 2.33:1 in light without a colour; the app-wide `--ring` table is in round 2's report, carried from 4c83930. The override changes neither. The step from rest to focus is smaller than in round 2, 3.29 to 2.33 against 5.10 to 2.33, but focus still lowers the border's contrast there. Needs its own decision.
4. **Recorded, not worsened: offline reads as "Instituição não encontrada."** `web/src/acesso/Acesso.tsx:164`. Pre-existing, not in the fix diff.
5. **Recorded, not worsened: forced colours.** The question row has no focus indicator (round 2, measured). The fix touches no `outline`. Not re-measured.
6. **Recorded: attachments' dashed area under 3:1.** `web/src/CampoArquivo.tsx:11`. 1.21:1 in light, 1.16 in dark, 1.19 to 1.20 in black; 1.30:1 at `6d83112`. It uses the default `--border`, so the override does not reach it. The tint predates this fix.
7. **Carried from 6d907af, unchanged:** `Planilha` labels about 9.6 px at 390; "Atendimento ao estudante · / Univag" with a hanging separator at 390; `Math.round` asymmetry at ±1.95; the clipped chart label in `web/src/indicadores/Grafico.tsx:24`.

## Screens

Opened by eye at HEAD: the reply form in light and dark with `#8a1538`. Six form captures (light, dark, black, with and without colour), `medidas.json` and `faltas.json` are in `D:\one-system\.playwright-mcp\identidade\verificador-r3\`. Round 1's 480-load sweep was not repeated, and its visual judgment is carried from 6d907af.

## Gate

`python "C:/Users/Alfredo Neto/.claude/skills/tlc-spec-lean/scripts/validate_verification.py" identidade-visual`: exit 1 with one error, "verdict is FAIL". That is correct for this report.

Vitest 520 passed, 0 failed. Layout 191 passed, 1 environment failure that passes on the image. Real e2e 200 passed, 0 failed.

Cleaned up: previews on 5199 and 5198 by PID; container `one-verif-r3`, image `one-verif-r3:4e5dabc`, database `one_verif_r3`, bucket `one-verif-r3`; worktree `.wt-r3` with its junction (removed with `cmd /c rmdir` first; `web/node_modules` intact). Docker `api` on :8080 and `.env` untouched. Nothing committed.
