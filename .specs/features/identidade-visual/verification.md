# Identidade visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 6d83112..a04ca17 (HEAD); fix range 4e5dabc..a04ca17
**Round**: 4 - scoped
**Verifier**: fresh sub-agent with no inherited context (author != verifier); round 4; it wrote none of this code, fixed nothing and committed nothing

**What fails, exactly.** One thing: a fault of my own, F18, survives every suite. An extra rule `.dark .form-resposta,` with `.nada-r4 {` on the next line changes the border of the form's fields in dark, and C55, C48, C54, C56, all of Vitest and the layout suite stay green. C55's claim says "a única regra que menciona `form-resposta`", and its regex (`web/src/test/interface.test.ts:193`) cannot cross a line break before the `{`. HEAD has no such rule, and I found no user-visible defect. All 56 checks' proofs are green, and round 3's survivors F2, F11 and F12 are all killed now.

The fix would be one line, which I tried in the worktree and discarded: `expect(css.match(/form-resposta/g)).toHaveLength(1)` beside the regex fails under F18 ("to have a length of 1 but got 2") and passes at HEAD. It would not touch product code. This is the fourth round, past the bound of three, so whether to add the line or accept the gap is the user's decision.

**P17: recording the two items this way is honest, and AC 22 obliges neither.** So they carry no `Unproven` or `Uncovered` cell here. Three things about the record still need attention (finding 2). The defects themselves remain in the product: a PASS on this feature would not mean 3:1 everywhere.

Proofs run at HEAD by me, one invocation per target:
- `cd web && npx vitest run`: 521 passed, 0 failed, 54 files.
- `npm --prefix web run build`: exit 0; precache 12 entries.
- `npm --prefix web run coverage`, then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. `dryer` with the C41 list piped to `grep -q "No duplicate candidates found"`: exit 0.
- Layout suite (the 8 specs of C42) against `npx vite preview --port 5199 --strictPort`: 192 passed, 1 failed. The failure is `web/e2e/plataforma.spec.ts:4` `manifesto e service worker`, which needs an API on :5226. It passed on my image, so I judge it an environment limit.
- `git diff --quiet 6d83112 HEAD -- api api.Tests`: exit 0.
- Real e2e: my own image `one-verif-r4:a04ca17` (`git archive HEAD | docker build`) on :8089, database `one_verif_r4`, bucket `one-verif-r4`, institution `e2e`: **201 passed, 0 failed, 0 flaky** on the first run, 7.8 min.
- All 78 `Proof:` lines of `checks.md`: 71 name a test, and each resolved by script to a test that exists and passed in those JSON outputs (0 missing). The other 7 are whole-suite or command proofs, run as above.

`checks.md` has no `Test policy` section, so there are no rows to judge.

Each section says where it came from: what the fix touched is **verified at a04ca17**; the rest is **carried from 4e5dabc** (round 3), 4c83930 (round 2) or 6d907af (round 1). All green proofs are from a04ca17. Round 3's measurements on the real API and round 1's visual sweep were not repeated: they are carried from 4e5dabc and 6d907af, and no product file changed since.

## The fix range

Verified at a04ca17. One commit, `a04ca17`.

- **No product code changed.** `git diff --stat 4e5dabc HEAD` lists `.specs/LESSONS.md`, `.specs/lessons.json`, `checks.md`, `verification.md`, `web/e2e/identidade.spec.ts` and `web/src/test/interface.test.ts`. Nothing else.
- **C54 only moved to two helpers, as the Handoff says.** The diff replaces the 7-line `em(...)` call with `abrirFormComProntas(page, largura, marca)` and the inline `destrutivo` evaluation with `corDestrutiva(page)`. Both helpers carry the same bodies, and no `expect` line of C54 appears in the diff. The file's other existing assertions moved only in line number.

## P17: what moves out of this feature

Verified at a04ca17, from the sources that hold authority over the obligation.

AC 22 (`.specs/features/identidade-visual/plan.md:168`) obliges keeping what `revisao-ux` and `aparencia-instituicao` guarantee. So the question is whether either feature guarantees these two.

| Item | What the sources guarantee | At base | At HEAD | Obliged by AC 22 |
| --- | --- | --- | --- | --- |
| attachments' dashed area, `web/src/CampoArquivo.tsx:11` | `.specs/features/revisao-ux/plan.md:148` AC 4 names `Input`, `Textarea` and `NativeSelect`. `web/e2e/ux.spec.ts:218-222` measures those 3. `CampoArquivo`, the dropzone and `border-dashed` appear in neither plan | 1.30:1 | 1.21:1 | none: never guaranteed |
| `--ring` under 3:1, light without a colour | `.specs/features/aparencia-instituicao/plan.md:226` AC 31: without a colour the tokens "SHALL ficar com os valores de hoje". AC 4's proof blurs first because focus swaps the border for `--ring` (`web/e2e/ux.spec.ts:223`), so focus was never part of it | about 2.5:1 on the page background, computed from the tokens, not measured | 2.33:1 on the form, carried from 4e5dabc | none: AC 31 fixes the value, so AC 22 would guard today's number, and raising it is a change of its own |

The one binding sentence near them is `.specs/features/revisao-ux/pesquisa.md:87`, "Bordas de campos, ícones e foco: 3:1 contra a cor vizinha". It is a research note citing WCAG, and this feature's plan marks that file binding for "princípios de hierarquia e o que dá cara de IA" (`.specs/features/identidade-visual/plan.md:206`). It decides nothing about these two elements, and `revisao-ux` turned it into AC 4 with a named list.

**So my report can say this without an `Unproven` cell.** Neither was a member of this feature's obligation set. Round 3 put the dashed area in a `fields in the tinted reply block` set; its authority is AC 4, and the dashed area is not in it, so I recomputed that row from AC 4. This is a judgment about scope and says nothing good about the product: `--ring` at 2.33:1 and the dashed area at 1.21:1 are both still there. On the dashed area, the label and the clip icon identify the control, so the boundary may not be required by 1.4.11 at all; that is for the next plan to settle.

## Binding sources

The fix touched no interface, so Step 1 is carried from 6d907af and 4e5dabc, except for the P17 question the brief asked.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/identidade-visual/pesquisa.md` | carried from 6d907af, the fix touched nothing it decides | none | - |
| `.specs/features/revisao-ux/pesquisa.md:87` §15 | yes, verified at a04ca17 | none | - |
| `.specs/features/revisao-ux/plan.md:148` AC 4 and `:53` door 2 | yes, verified at a04ca17 | none, HEAD follows them; hue measured in round 3, the override's copy of the formula now pinned by C55 | - |
| `.specs/features/aparencia-instituicao/plan.md:226` AC 31 | yes, verified at a04ca17 | none, `--ring` is not in the feature's diff | - |
| `.specs/features/revisao-ux/checks.md:635` C57 | carried from 4e5dabc | none | - |

**Per-screen enumeration.**

| Screen | Decided, reachable by a selector | Checks | Uncovered |
| --- | --- | --- | --- |
| Detail, reply block | tint; select and "Responder" at 3:1; focus and error on both; "Nota interna" on; student without "Nota interna" | C34, C48, C54, C56 | - |

## Checks

Proofs verified at a04ca17. Citations refreshed for `web/e2e/identidade.spec.ts` (unchanged up to `:1146`, moved after) and `checks.md`. Assertion text carried from 4e5dabc where the file did not change.

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
| C40 | suite and build pass; edits only from the closed list | vitest 521, build 0 | `.specs/features/identidade-visual/checks.md:596-597`; list at `:32` with item 9 at `:123`. See Edits below | PASS |
| C41 | crapper and dryer | both exit 0 | `.specs/features/identidade-visual/checks.md:603-604` run as written | PASS |
| C42 | layout suite whole | 192 of 193 on preview; the other passes on the image | `web/e2e/plataforma.spec.ts:4` needs an API on :5226; passed on :8089 | PASS |
| C43 | no change in `api/` | exit 0 | `.specs/features/identidade-visual/checks.md:613` run as written | PASS |
| C44 | real fonts, request line, 2 reads | real e2e, passed | `web/e2e/identidade-real.spec.ts:115`, `:124-125`, `:150-151` | PASS |
| C45 | whole suite on the image, no other real spec edited | 201 passed | `.specs/features/identidade-visual/checks.md:631`; the feature's diff touches no real spec but `web/e2e/identidade-real.spec.ts` | PASS |
| C46 | 11 named tests pass without edit | layout and vitest, passed | `web/e2e/ux.spec.ts:109`, `:156`, `:230`, `:589`, `:379`, `:386`, `:1349`, `:565`; `web/src/ux.test.tsx:139`. The fix range edits none | PASS |
| C47 | row focus 3:1, 2 px or more, 12 cases | layout, passed | `web/e2e/identidade.spec.ts:1118` espessura `toBeGreaterThanOrEqual(2)`; `:1119` contraste `toBeGreaterThanOrEqual(3)`; `:1112` control `toEqual([])`; `:1122` `medidas` 12 | PASS |
| C48 | "Responder" border 3:1, for student and staff, both brands, 3 themes, 390 and 1280 | layout and real, passed | `web/e2e/identidade.spec.ts:1143` `expect(contraste(borda, fundo)).toBeGreaterThanOrEqual(3)`; `:1146` `expect(medidas).toBe(24)`; `:1137` `eventos: null`; `:1141` "Nota interna" `toHaveCount(aluno ? 0 : 1)`. F6, F8 and F9 killed in round 3, carried; lines unchanged | PASS |
| C49 | no variation while a response is pending | vitest, passed | `web/src/indicadores/identidade.test.tsx:113` not in document for the 4 texts; `:132` `▲ 10,0 pts`; `:125` control | PASS |
| C50 | `semDados` with a number hides it | vitest, passed | `web/src/indicadores/identidade.test.tsx:143-144` absent and no alert; `:148` control `▲ 4,2 pts` | PASS |
| C51 | name between phrase and request | layout, passed | `web/e2e/identidade.spec.ts:1238-1240` the 3 `toBeGreaterThanOrEqual` | PASS |
| C52 | variation below the number at 360 | layout, passed | `web/e2e/identidade.spec.ts:1256` below; `:1257` `perto(v.x, n.x)`; `:1258` no horizontal overflow | PASS |
| C53 | empty date and precache | vitest and layout, passed | `web/src/indicadores/identidade.test.tsx:153-154` `toBeNull`; `:161-162` no `NaN`, 3 reads; `web/e2e/identidade.spec.ts:1277` other alphabets `toEqual([])`; `:1278-1279` 2 latin files | PASS |
| C54 | select at 3:1; focus equal to a common field and different from rest; error equal to `--destructive`; student's screen; 3 themes, 2 brands, 390 and 1280 | layout and real, passed | `web/e2e/identidade.spec.ts:1174` select `toBeGreaterThanOrEqual(3)`; `:1183` `toBe(comumFoco)`; `:1184` `.not.toBe(repouso)`; `:1188-1189` `toBe(destrutivo)`; `:1193` `expect(medidas).toBe(12)`; student bullet at `:1141`. F3, F4, F5, F10 killed in round 3, carried; assertions unchanged, see `## The fix range` | PASS |
| C55 | the only rule naming `form-resposta` has the selector `.form-resposta:not(.dark *)` and declares only `--input`, the token with 0.63 for 0.66 | vitest, passed | `web/src/test/interface.test.ts:194` `expect(regras.map((r) => r[1].trim())).toEqual(['.form-resposta:not(.dark *)'])`; `:196` `toContain('0.66 0 none')`; `:197` `expect(regras[0][2].trim()).toBe(...)`. The test passes, and "the only rule" is not fully proven: F18 | PASS |
| C56 | select focus equal to a common select and different from rest; select error equal to `--destructive`; with "Nota interna" the select leaves and "Responder" stays at 3:1; 3 themes, 2 brands, 390 and 1280 | layout and real, passed | `web/e2e/identidade.spec.ts:1216` `toBe(comumFoco)`; `:1217` `.not.toBe(repouso)`; `:1220` `toBe(await corDestrutiva(page))`; `:1222` `expect(select).toHaveCount(0)`; `:1224` `toBeGreaterThanOrEqual(3)`; `:1227` `expect(medidas).toBe(12)`. F20 to F26 killed | PASS |

**C55 passes as a test and does not fully prove its claim.** I kept its row at PASS because its assertions target the values the check defines, and F2, F11, F12, F13, F15, F16, F17 and F19 all fail on them. The hole is in how the test finds the rules. That is recorded in `## Coverage` and `## Faults injected`, where it carries the FAIL.

**C56 against its own text.** Each bullet runs in all 12 combinations, counted at `:1227`. The "select comum" clones the select's own `className`, so a class fault reaches the control too. That does not hide it: F25 fails on the light override's different grey, and F26, in dark, on `:1217`. The test focuses with `.focus()`, as C54 does; `:1217` passing at HEAD shows `:focus-visible` matched.

### Edits to existing assertions, against the closed list

Verified at a04ca17. **Confirmed: the Handoff's "nenhuma" is right.** In the fix range no existing `expect` changes; see `## The fix range`. Whole-feature edits are carried from 4c83930.

## Coverage

Rows the fix touched are verified at a04ca17; the rest are carried, as marked.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| field kinds in the reply block that AC 4 names (2) | `.specs/features/revisao-ux/plan.md:148`, the form at `web/src/chamados/ChamadoDetalhe.tsx:113-118` | `NativeSelect` C54, C56 · `Textarea` C48, C54, C56 | - |
| select border: states (3) | `web/src/ui/native-select.tsx:20-21` | rest C54 · focus C56 · error C56 | - |
| the override rule: what it must keep (3) | `web/src/index.css:101-103`, `.specs/features/revisao-ux/plan.md:53`, C55's text | brand hue C55 · grey C55 · light only C55, for a rule on one line (F2, F13) | light only: an extra rule whose selector breaks across lines passes every suite (F18) |
| Nota interna on (1) | `web/src/chamados/ChamadoDetalhe.tsx:55`, `:117` | C56, with the select gone and "Responder" at 3:1 | - |
| "Responder" border: views (2) | `web/src/chamados/ChamadoDetalhe.tsx:420` | staff C48, C54 · student C48 with control | - |
| "Responder" border: themes (3), brands (2), widths (2) | C48, C54 | all 12, faults killed for theme, floor and view | - |
| "Responder" border: states (3) | `web/src/ui/textarea.tsx:9` | rest C48 · focus C54 · error C54 | - |
| question row focus (12) | C47, carried from 4c83930 | all, with control | - |
| Assistente items in order (5) | Screens, carried from 4c83930 | C18, C51 | - |
| variation results (6), in time (2), widths and strings | AC 12, AC 13, carried from 4c83930 | C24, C25, C26, C50, C49, C27, C52 | - |
| precache by alphabet, empty date (2) | `web/vite.config.ts:35`, `web/src/indicadores/Indicadores.tsx:204`, carried from 4c83930 | C53, C8 | - |
| AC 22 invariants (6) | `.specs/features/identidade-visual/plan.md:168` | 44 px, 16 px, tab bar, action colour, tints C46 · contrast on the tinted surface C48, C54 | - |
| sans roles (7) · serif roles (5) · font files (3) · radius roles (9) | carried from 6d907af | C2, C3 · C4, C27, C11, C18, C16 · C8, C1, C2, C44 · C5, C6, C7, C22 | - |
| access screens x photo x widths · Assistente states (15) · request states (5) | carried from 6d907af | C9 to C15 · C17, C19, C20 · C20, C44 | - |
| previous period (3) · empty states (8) · illustrations (6), columns (7) · static blocks (3), titles (3), tinted (2) | carried from 6d907af | C23, C44 · C35, C36 · C31, C37, C38 · C32, C33, C34 | - |

The attachments' dashed area and the app-wide `--ring` are in no row: see `## P17`. `Swept` rows that say "existing": carried from 6d907af and 4c83930.

## Faults injected

Run in a `git worktree` of HEAD inside the repo, with `node_modules` as a junction and its own preview on :5198. Each fault: replace one literal (the driver stops if it does not occur exactly once), confirm `git diff --stat` shows it, rebuild where the proof is in the browser, run the proof, restore with `git checkout`.

**Each fault really ran.** The proofs went green on the unmodified worktree first. Every failure below is the test's own assertion with a measured value, not a setup error. The cap of five is exceeded on purpose, since the brief lists these. F13 to F26 are new in this round, and F2, F11 and F12 are round 3's survivors. `mutator` suspended (AD-025).

| Mutation | Location | Killed |
| --- | --- | --- |
| none, baseline | HEAD | baseline: C55 green; C48, C54 and C56 green |
| F2 override applied in dark too | `web/src/index.css:101` | yes - C55 `:194`, received `.form-resposta` |
| F11 override grey 0.30 | `web/src/index.css:102` | yes - C55 `:197`, received `oklch(0.30 0 none)` |
| F12 override ignores the brand | `web/src/index.css:102` | yes - C55 `:197`, received the mix without `var(--marca` |
| F13 extra `.dark .form-resposta` rule, on one line | `web/src/index.css:103` | yes - C55 `:194`, received 2 selectors |
| F14 `:root --input` 6% to 7%, CSS only, override left behind | `web/src/index.css:34` | yes - `tokens de Visual` and `tokens da paleta`, 7% against 6%. C55 stays green here by design: it reads the `Tokens` row |
| F15 the same, with the `Tokens` row edited to match | `web/src/index.css:34`, `web/src/test/interface.test.ts:79` | yes - C55 `:197`, expected 7%, received 6%. Round 3's silent drift, now caught |
| F16 token grey 0.66 to 0.64, CSS and row | `web/src/index.css:34`, `web/src/test/interface.test.ts:79` | yes - C55 `:196`, `toContain('0.66 0 none')` |
| F17 extra declaration `--ring: red` in the rule | `web/src/index.css:102` | yes - C55 `:197` |
| F18 extra `.dark .form-resposta,` with `.nada-r4 {` on the next line | `web/src/index.css:103` | no - C55, C48, C54 and C56 green; whole Vitest 521 passed; layout 192 of 193, only the environment failure |
| F19 override with `{` on its own line, grey 0.30 | `web/src/index.css:101` | yes - C55 `:194`, received an empty list |
| F20 select focus cancelled, `focus-visible:border-input` on the select | `web/src/chamados/ChamadoDetalhe.tsx:55` | yes - C56 `:1216`, "light sem cor a 390: foco do select igual ao comum" |
| F21 select `aria-invalid` cancelled | `web/src/chamados/ChamadoDetalhe.tsx:55` | yes - C56 `:1220`, received the `--input` colour |
| F22 "Responder" weak border only with "Nota interna" on | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C56 `:1224`, 1.21 |
| F23 form loses the override only with "Nota interna" on | `web/src/chamados/ChamadoDetalhe.tsx:113` | yes - C56 `:1224`, 2.96 |
| F24 the note click leaves the select on screen | `web/src/chamados/ChamadoDetalhe.tsx:53` | yes - C56 `:1222`, expected 0, received 1 |
| F25 focus removed in the shared `NativeSelect`, which the control clones | `web/src/ui/native-select.tsx:20` | yes - C56 `:1216` |
| F26 select focus cancelled in dark only | `web/src/chamados/ChamadoDetalhe.tsx:55` | yes - C56 `:1217`, "dark sem cor a 390: foco difere do repouso" |

**F18 really reaches the browser.** The rule is in the built CSS, and with `dark` on the root a field inside `.form-resposta` reads `oklch(0.6192 0.009 262)` against `oklch(0.5735 0.0075 262)` outside it. At HEAD both read `oklch(0.5735 0.0075 262)`. The repo has used this selector style in this file: `h1,` and `h2 {` on separate lines at `6d83112`.

Round 3's other faults (F1, F3 to F10) carried from 4e5dabc: the product code is unchanged, and C48's and C54's assertions too.

Real tree porcelain before and after: identical (`?? .idea/`, `?? .playwright-mcp/`, `?? web/apresentacao/`), before this report was written.

## Findings

Ranked. Only 1 carries the FAIL.

1. **C55 cannot see an extra rule whose selector breaks across lines: F18 survives.** `web/src/test/interface.test.ts:193`. HEAD has no such rule. The one-line assertion above kills it and passes at HEAD; tried and discarded. Even with it, a literal pin cannot see a rule that reaches the form without naming the class, such as `.dark form:has(#resposta)`. I did not run that one, and it is outside C55's text.
2. **P17 is honest but thin, in three ways.** `.specs/features/identidade-visual/checks.md:156`.
   - It sends the items to "o plano da rodada da estrutura", and no such plan exists: `grep` finds that phrase only there, `.specs/features/` has no folder for it, and `.specs/STATE.md` does not mention the items. Once this feature closes, one table row is the only trail.
   - It gives "1,21:1; 1,30:1 na base" without saying why. The drop comes from this feature: the form at base had no background, and AC 17's `bg-muted` tint (`web/src/chamados/ChamadoDetalhe.tsx:113`) caused it. Round 3's "the tint predates this fix" is true and easy to misread.
   - It quotes the user only on "um teste e rodada curta". The move of the two items reads as the orchestrator's, and "que o usuário aprova" leaves approval for later. I cannot confirm the user's approval of the move from the repo.
3. **Handoff residue.** `.specs/features/identidade-visual/checks.md:835` reads "preenchido no commit dos testes" and holds no commit or results, unlike the rounds before it.
4. **Recorded, not moved by P17, with no destination: offline reads as "Instituição não encontrada."** `web/src/acesso/Acesso.tsx:164`. Pre-existing, not in the fix diff.
5. **Recorded, not moved by P17, with no destination: forced colours.** The question row has no focus indicator (round 2, measured). Carried from 4c83930; not re-measured.
6. **Carried from 6d907af, unchanged:** `Planilha` labels about 9.6 px at 390; "Atendimento ao estudante · / Univag" with a hanging separator at 390; `Math.round` asymmetry at ±1.95; the clipped chart label in `web/src/indicadores/Grafico.tsx:24`.

## Screens

I opened no screens this round: no product code changed. Round 3's reply form captures are carried from 4e5dabc, and round 1's visual judgment and its AI/template rating are carried from 6d907af.

## Gate

`python "C:/Users/Alfredo Neto/.claude/skills/tlc-spec-lean/scripts/validate_verification.py" identidade-visual`: exit 1 with one error, "verdict is FAIL". That is correct for this report.

Vitest 521 passed, 0 failed. Layout 192 passed, 1 environment failure that passes on the image. Real e2e 201 passed, 0 failed.

Cleaned up: previews on 5199 and 5198 by PID; container `one-verif-r4`, image `one-verif-r4:a04ca17`, database `one_verif_r4`, bucket `one-verif-r4`; worktree `.wt-r4` with its junction (removed with `cmd /c rmdir` first; `web/node_modules` intact). Docker `api` on :8080 and `.env` untouched. Nothing committed.
