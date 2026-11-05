# Identidade visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 6d83112..08c9657 (HEAD); fix range a04ca17..08c9657
**Round**: 5 - scoped
**Verifier**: fresh sub-agent with no inherited context (author != verifier); round 5; it wrote none of this code, fixed nothing and committed nothing

**What fails, exactly.** One thing: a fault of my own, F29, survives every suite I ran it against. It is F18's defect from the other side: a selector broken across two lines, with the extra selector on the line above the existing one.

```css
.dark form.bg-muted,
.form-resposta:not(.dark *) {
```

`form-resposta` still occurs once, so the new line (`web/src/test/interface.test.ts:193`) passes. The regex at `:194` is anchored to line starts, so it captures only the second line, and `:195` compares that against the expected selector. C55 says the rule's selector is `.form-resposta:not(.dark *)`, and with F29 it is not. HEAD has no such rule, and I found no user-visible defect.

F18 itself, the fault round 4 failed on, is now killed. The new line does what it was added to do and does not close the whole class. A one-line change to `:194`, tried in the worktree and discarded, kills F29 and passes at HEAD (finding 1). This is the fifth round, past the bound of three, so whether to change the line or accept the gap is the user's decision.

Proofs run at HEAD by me:
- `cd web && npx vitest run`: 521 passed, 0 failed, 54 files. The count equals round 4's: the commit added an assertion, not a test.
- `npm --prefix web run build`: exit 0; precache 12 entries.
- `cd web && npx vitest run src/test/interface.test.ts -t "regra da borda do form da resposta"`: 1 passed.

**Not rerun, on purpose.** No product code changed since round 4's runs, so these are carried from a04ca17: the layout suite (192 of 193, the other being `web/e2e/plataforma.spec.ts:4`, which needs an API on :5226 and passed on the image), the real e2e (201 of 201 on image `one-verif-r4:a04ca17`), `coverage` with `crapper`, `dryer`, and the `git diff --quiet` on `api`. My only layout run this round was against F29, so it is a fault run. Round 4's script resolving each `Proof:` line to a passed test is carried too; this round I did not repeat it by name.

`checks.md` has no `Test policy` section, so there are no rows to judge.

Each section says where it came from: what the commit touched is **verified at 08c9657**; the rest is **carried from a04ca17** (round 4), which in turn carries from 4e5dabc, 4c83930 and 6d907af where it says so.

## The fix range

Verified at 08c9657. One commit, `08c9657`.

- `git diff --stat a04ca17 HEAD` lists `.specs/LESSONS.md`, `.specs/STATE.md`, `.specs/lessons.json`, `.specs/features/identidade-visual/checks.md`, `.specs/features/identidade-visual/verification.md` and `web/src/test/interface.test.ts`. No product code and no other test.
- In the test file the diff is one added line, `web/src/test/interface.test.ts:193`. No existing assertion changes; the ones after it move down by one.

## Round 4's findings 2 and 3

Verified at 08c9657, in `.specs/features/identidade-visual/checks.md:156`, `:835` and `.specs/STATE.md:41`.

| Round 4 asked | Now | Closed |
| --- | --- | --- |
| Handoff placeholder "preenchido no commit dos testes" | `checks.md:835` names `a04ca17`, the count line's commit by description, and round 4's results. That commit is 08c9657; a commit cannot name its own SHA | yes |
| a trail beyond one table row | `STATE.md:41` AD-035 makes both items mandatory in the next round's plan, and `checks.md:156` points to it | yes |
| the cause of 1.21:1 against 1.30:1 | `checks.md:156` says AC 17's `bg-muted` worsened it, AD-035 says "before this feature's `bg-muted`"; the tint is at `web/src/chamados/ChamadoDetalhe.tsx:113`. Both say the ring predates the feature | yes |
| the user's approval of the move | `checks.md:156` "o usuário aprovou em 05/11"; AD-035 "User decision on 05/11". The repo records it and my brief says it was given in chat; I did not see that chat | yes, as recorded |

AD-035's figure for the ring, 1.52 to 2.77:1, is the range in round 3's table (`git show 4e5dabc:.specs/features/identidade-visual/verification.md`, line 205). It also records round 4's findings 4 and 5 as having no destination, which is accurate.

P17's judgment from round 4 stands, carried from a04ca17: AC 22 obliges neither item, so they carry no `Unproven` or `Uncovered` cell. Both defects remain in the product, and a PASS here would not have meant 3:1 everywhere.

## Binding sources

The commit touched no interface, so Step 1 is carried from a04ca17 in full.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/identidade-visual/pesquisa.md` | carried from 6d907af | none | - |
| `.specs/features/revisao-ux/pesquisa.md:87` §15 | carried from a04ca17 | none | - |
| `.specs/features/revisao-ux/plan.md:148` AC 4 and `:53` door 2 | carried from a04ca17 | none | - |
| `.specs/features/aparencia-instituicao/plan.md:226` AC 31 | carried from a04ca17 | none | - |
| `.specs/features/revisao-ux/checks.md:635` C57 | carried from 4e5dabc | none | - |

## Checks

Vitest proofs and the build verified at 08c9657; every layout and real proof carried from a04ca17, as each row says. Citations are round 4's except C55, the only check on the touched file. `checks.md`'s line numbers did not move.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | only the 2 font packages, no Inter | vitest passed at 08c9657 | `web/src/identidade.test.tsx:14` `filter(startsWith('@fontsource'))` toEqual the 2 packages; `:18-19` not.toContain('inter') | PASS |
| C2 | both faces loaded, app origin only | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:44-46` FontFace `loaded`, no Inter; `:52-55` woff2 URLs, no `inter-`, single origin | PASS |
| C3 | 7 sans roles at 390 and 1440 | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:94` `expect(r.fora).toEqual([])`; `:116` at least 1 per type | PASS |
| C4 | serif only on allowed elements, 20 px or more | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:141-144`; `:153` at least 1 on 5 screens | PASS |
| C5 | 23 radius measures | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:171` `toEqual([e,e,e,e])`; `:177` pill; `:251` `medidas.length` 23 | PASS |
| C6 | pills only in the allowed set | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:288-289`; `:297-298` | PASS |
| C7 | radius scale, no `--radius` | vitest passed at 08c9657 | `web/src/identidade.test.tsx:27` toEqual `[4, 6, 12, 16]` | PASS |
| C8 | latin fonts in precache, up to 90 KB, no Inter | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:318-323` `toBeLessThanOrEqual(90 * 1024)` | PASS |
| C9 | single column, 24 cases | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:350-351`, `:365`, `:371`, `:374` `casos` 24 | PASS |
| C10 | order on Login, 2 cases | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:400` helper right before "CPF"; `:417` top against previous bottom | PASS |
| C11 | serif 28, muted texts, marker, background | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:440-441`, `:443-444`, `:449-450`, `:469-470` | PASS |
| C12 | Primeiro acesso, Criar senha | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:503`; `:507` helper count 0 | PASS |
| C13 | photo in the right column | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:524-532`, `:543-546` | PASS |
| C14 | 160 px strip below 1024 | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:566` height 160; `:569-570` above logo and field; `:581` no text over it | PASS |
| C15 | texts and logo, 4 cases | vitest passed at 08c9657 | `web/src/acesso/identidade.test.tsx:27` logo `src`; `:28`, `:38` helper once | PASS |
| C16 | root | vitest passed at 08c9657; layout carried from a04ca17 | `web/src/acesso/identidade.test.tsx:50` 0 `svg`; `web/e2e/identidade.spec.ts:594`, `:603` | PASS |
| C17 | title and phrase, 4 cases | vitest passed at 08c9657 | `web/src/assistente/identidade.test.tsx:24`; `:26-27` no "Olá! Eu sou" | PASS |
| C18 | serif 24 left | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:631-633`, `:636`, `:639-640` | PASS |
| C19 | assistant with and without photo | vitest passed at 08c9657; layout carried from a04ca17 | `web/src/assistente/identidade.test.tsx:44-45`; `web/e2e/identidade.spec.ts:653-658` | PASS |
| C20 | open request, 8 cases | vitest passed at 08c9657 | `web/src/assistente/identidade.test.tsx:70-76` link and order; `:80-81` none and no alert | PASS |
| C21 | border in action colour, before questions | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:670-674` `referencia('--primary')` | PASS |
| C22 | 48 px rows, divider, icons, tap sends | vitest passed at 08c9657; layout carried from a04ca17 | `web/e2e/identidade.spec.ts:691`, `:698`, `:701-702`, `:707`; `web/src/assistente/identidade.test.tsx:96`; `web/src/assistente/boasvindas.test.tsx:60` | PASS |
| C23 | previous period, 3 cases, exactly 2 reads | vitest passed at 08c9657 | `web/src/indicadores/identidade.test.tsx:48`, `:52` exact URLs | PASS |
| C24 | up, down, equal | vitest passed at 08c9657 | `web/src/indicadores/identidade.test.tsx:65` `findByText(texto)` with `▲ 4,2 pts`, `▼ 1,0 pt`, `= sem variação` | PASS |
| C25 | no variation on failure or no data | vitest passed at 08c9657 | `web/src/indicadores/identidade.test.tsx:84-85` absent and no alert; `:91` control | PASS |
| C26 | rounding and plural | vitest passed at 08c9657 | `web/src/indicadores/identidade.test.tsx:100` with `= sem variação`, `▲ 1,9 pt`, `▲ 2,0 pts` | PASS |
| C27 | serif 40, variation beside, at 390 and 1440 | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:762-770`, `:774-775` | PASS |
| C28 | strip by `main` width, 4 cases | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:785`, `:788`, `:794`, `:800` | PASS |
| C29 | 9 rows, 2 or 1 columns | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:831`, `:834-837`, `:843-844`, `:847` | PASS |
| C30 | charts without card, with title | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:862`, `:865`, `:868` | PASS |
| C31 | only `Planilha` | vitest passed at 08c9657 | `web/src/identidade.test.tsx:41`, `:43`; `web/src/ilustracoes/ilustracoes.test.tsx:18` | PASS |
| C32 | Aparência without box, 32 px | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:892-893`, `:895`, `:898` | PASS |
| C33 | Dados do aluno, Histórico | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:923`, `:926`, `:930-931`, `:936` | PASS |
| C34 | no box, tint only on action, 32 px | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:950-951`, `:958-959`, `:966`. The form keeps `bg-muted` (`web/src/chamados/ChamadoDetalhe.tsx:113`) | PASS |
| C35 | empty states, 8 cases | vitest passed at 08c9657 | `web/src/tabela.test.tsx:52-56`; `web/src/indicadores/identidade.test.tsx:171` | PASS |
| C36 | icon 28 centred, 16 measures | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:1009-1012`, `:1014-1016`, `:1018`, `:1030` | PASS |
| C37 | `Planilha` in step 2 | vitest passed at 08c9657 | `web/src/administracao/identidade.test.tsx:40` text toEqual the CSV header | PASS |
| C38 | 7 columns in a row | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:1041`, `:1044`, `:1050-1051` | PASS |
| C39 | preview | vitest passed at 08c9657; layout carried from a04ca17 | `web/src/administracao/identidade.test.tsx:60`, `:65`; `web/e2e/identidade.spec.ts:1064`, `:1070`, `:1072` | PASS |
| C40 | suite and build pass; edits only from the closed list | vitest 521, build 0, at 08c9657 | `.specs/features/identidade-visual/checks.md:596-597`; list at `:32` with item 9 at `:123`. See Edits below | PASS |
| C41 | crapper and dryer | both exit 0, carried from a04ca17 | `.specs/features/identidade-visual/checks.md:603-604` run as written | PASS |
| C42 | layout suite whole | 192 of 193 on preview, the other passes on the image, carried from a04ca17 | `web/e2e/plataforma.spec.ts:4` needs an API on :5226; passed on :8089 | PASS |
| C43 | no change in `api/` | exit 0, carried from a04ca17 | `.specs/features/identidade-visual/checks.md:613` run as written | PASS |
| C44 | real fonts, request line, 2 reads | real e2e passed, carried from a04ca17 | `web/e2e/identidade-real.spec.ts:115`, `:124-125`, `:150-151` | PASS |
| C45 | whole suite on the image, no other real spec edited | 201 passed, carried from a04ca17 | `.specs/features/identidade-visual/checks.md:631`; the feature's diff touches no real spec but `web/e2e/identidade-real.spec.ts` | PASS |
| C46 | 11 named tests pass without edit | vitest passed at 08c9657; layout carried from a04ca17 | `web/e2e/ux.spec.ts:109`, `:156`, `:230`, `:589`, `:379`, `:386`, `:1349`, `:565`; `web/src/ux.test.tsx:139`. The fix range edits none | PASS |
| C47 | row focus 3:1, 2 px or more, 12 cases | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:1118` espessura `toBeGreaterThanOrEqual(2)`; `:1119` contraste `toBeGreaterThanOrEqual(3)`; `:1112` control `toEqual([])`; `:1122` `medidas` 12 | PASS |
| C48 | "Responder" border 3:1, for student and staff, both brands, 3 themes, 390 and 1280 | layout and real passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:1143` `expect(contraste(borda, fundo)).toBeGreaterThanOrEqual(3)`; `:1146` `expect(medidas).toBe(24)`; `:1137` `eventos: null`; `:1141` "Nota interna" `toHaveCount(aluno ? 0 : 1)`. F6, F8 and F9 killed in round 3, carried; lines unchanged | PASS |
| C49 | no variation while a response is pending | vitest passed at 08c9657 | `web/src/indicadores/identidade.test.tsx:113` not in document for the 4 texts; `:132` `▲ 10,0 pts`; `:125` control | PASS |
| C50 | `semDados` with a number hides it | vitest passed at 08c9657 | `web/src/indicadores/identidade.test.tsx:143-144` absent and no alert; `:148` control `▲ 4,2 pts` | PASS |
| C51 | name between phrase and request | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:1238-1240` the 3 `toBeGreaterThanOrEqual` | PASS |
| C52 | variation below the number at 360 | layout passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:1256` below; `:1257` `perto(v.x, n.x)`; `:1258` no horizontal overflow | PASS |
| C53 | empty date and precache | vitest passed at 08c9657; layout carried from a04ca17 | `web/src/indicadores/identidade.test.tsx:153-154` `toBeNull`; `:161-162` no `NaN`, 3 reads; `web/e2e/identidade.spec.ts:1277` other alphabets `toEqual([])`; `:1278-1279` 2 latin files | PASS |
| C54 | select at 3:1; focus equal to a common field and different from rest; error equal to `--destructive`; student's screen; 3 themes, 2 brands, 390 and 1280 | layout and real passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:1174` select `toBeGreaterThanOrEqual(3)`; `:1183` `toBe(comumFoco)`; `:1184` `.not.toBe(repouso)`; `:1188-1189` `toBe(destrutivo)`; `:1193` `expect(medidas).toBe(12)`; student bullet at `:1141`. F3, F4, F5, F10 killed in round 3, carried; assertions unchanged, see `## The fix range` | PASS |
| C55 | the only rule naming `form-resposta` has the selector `.form-resposta:not(.dark *)` and declares only `--input`, the token with 0.63 for 0.66 | vitest passed at 08c9657; proof also green with F29 applied | `web/src/test/interface.test.ts:193` `expect(css.match(/form-resposta/g)).toHaveLength(1)`; `:195` `expect(regras.map((r) => r[1].trim())).toEqual(['.form-resposta:not(.dark *)'])`; `:197` `toContain('0.66 0 none')`; `:198` `expect(regras[0][2].trim()).toBe(...)`. The regex at `:194` captures only the selector's last line, so a rule with another selector on the line above passes: F29 | FAIL |
| C56 | select focus equal to a common select and different from rest; select error equal to `--destructive`; with "Nota interna" the select leaves and "Responder" stays at 3:1; 3 themes, 2 brands, 390 and 1280 | layout and real passed, carried from a04ca17 | `web/e2e/identidade.spec.ts:1216` `toBe(comumFoco)`; `:1217` `.not.toBe(repouso)`; `:1220` `toBe(await corDestrutiva(page))`; `:1222` `expect(select).toHaveCount(0)`; `:1224` `toBeGreaterThanOrEqual(3)`; `:1227` `expect(medidas).toBe(12)`. F20 to F26 killed | PASS |

**C55 is FAIL here; round 4 kept it at PASS.** Round 4 reasoned that its assertions target the check's values and the hole is in how the test finds the rules. I differ: C55's text names the selector, and F29 makes that clause false with the proof green, so the claim is not proven. The verdict does not depend on this, since F29's row fails it anyway.

### Edits to existing assertions, against the closed list

Verified at 08c9657: none; the commit adds one line. Whole-feature edits carried from a04ca17.

## Coverage

The override rule's row is verified at 08c9657, because the commit touched its proof. The rest are carried from a04ca17.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| the override rule: what it must keep (3) | `web/src/index.css:101-103`, `.specs/features/revisao-ux/plan.md:53`, C55's text | brand hue C55 · grey C55 · light only C55, including an extra rule naming the class across lines (F18, F27) | light only: an extra selector on the line above the existing one passes every suite (F29) |
| field kinds in the reply block that AC 4 names (2) | `.specs/features/revisao-ux/plan.md:148`, the form at `web/src/chamados/ChamadoDetalhe.tsx:113-118` | `NativeSelect` C54, C56 · `Textarea` C48, C54, C56 | - |
| select border: states (3) | `web/src/ui/native-select.tsx:20-21` | rest C54 · focus C56 · error C56 | - |
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

The attachments' dashed area and the app-wide `--ring` are in no row: see `## Round 4's findings 2 and 3`. `Swept` rows that say "existing": carried.

## Faults injected

Run in a `git worktree` of HEAD at `.wt-r5`, with `node_modules` as a junction and its own preview on :5197. The proof went green on the unmodified worktree first. Each failure below is the test's own assertion. Restored with `git checkout` between faults. `mutator` suspended (AD-025).

| Mutation | Location | Killed |
| --- | --- | --- |
| none, baseline | 08c9657 | baseline: C55 green, 1 passed |
| F18 `.dark .form-resposta,` with `.nada-r4 {` on the next line, the literal from the brief | end of `web/src/index.css` | yes - C55 `web/src/test/interface.test.ts:193`, "to have a length of 1 but got 2" |
| F27 `@media` wrapping `:is(`, `.form-resposta`, `)` on three lines | end of `web/src/index.css` | yes - C55 `:193`, length 2 |
| F28 a comment naming `form-resposta`, changing no behaviour | end of `web/src/index.css` | yes - C55 `:193`, length 2. A false alarm, see below |
| F29 `.dark form.bg-muted,` on the line above the existing selector | `web/src/index.css:101` | no - C55 green; whole Vitest 521 passed; layout 192 of 193, only the environment failure; build exit 0 |
| F30 the existing selector ends in a comma, `.dark form {` on the next line | `web/src/index.css:101` | yes - C55 `:195`, received an empty list |
| F2 override applied in dark too (carried from a04ca17) | `web/src/index.css:101` | yes - C55 `:194`, received `.form-resposta` |
| F11 override grey 0.30 (carried from a04ca17) | `web/src/index.css:102` | yes - C55 `:197`, received `oklch(0.30 0 none)` |
| F12 override ignores the brand (carried from a04ca17) | `web/src/index.css:102` | yes - C55 `:197`, received the mix without `var(--marca` |
| F13 extra `.dark .form-resposta` rule, on one line (carried from a04ca17) | `web/src/index.css:103` | yes - C55 `:194`, received 2 selectors |
| F14 `:root --input` 6% to 7%, CSS only, override left behind (carried from a04ca17) | `web/src/index.css:34` | yes - `tokens de Visual` and `tokens da paleta`, 7% against 6%. C55 stays green here by design: it reads the `Tokens` row |
| F15 the same, with the `Tokens` row edited to match (carried from a04ca17) | `web/src/index.css:34`, `web/src/test/interface.test.ts:79` | yes - C55 `:197`, expected 7%, received 6%. Round 3's silent drift, now caught |
| F16 token grey 0.66 to 0.64, CSS and row (carried from a04ca17) | `web/src/index.css:34`, `web/src/test/interface.test.ts:79` | yes - C55 `:196`, `toContain('0.66 0 none')` |
| F17 extra declaration `--ring: red` in the rule (carried from a04ca17) | `web/src/index.css:102` | yes - C55 `:197` |
| F19 override with `{` on its own line, grey 0.30 (carried from a04ca17) | `web/src/index.css:101` | yes - C55 `:194`, received an empty list |
| F20 select focus cancelled, `focus-visible:border-input` on the select (carried from a04ca17) | `web/src/chamados/ChamadoDetalhe.tsx:55` | yes - C56 `:1216`, "light sem cor a 390: foco do select igual ao comum" |
| F21 select `aria-invalid` cancelled (carried from a04ca17) | `web/src/chamados/ChamadoDetalhe.tsx:55` | yes - C56 `:1220`, received the `--input` colour |
| F22 "Responder" weak border only with "Nota interna" on (carried from a04ca17) | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C56 `:1224`, 1.21 |
| F23 form loses the override only with "Nota interna" on (carried from a04ca17) | `web/src/chamados/ChamadoDetalhe.tsx:113` | yes - C56 `:1224`, 2.96 |
| F24 the note click leaves the select on screen (carried from a04ca17) | `web/src/chamados/ChamadoDetalhe.tsx:53` | yes - C56 `:1222`, expected 0, received 1 |
| F25 focus removed in the shared `NativeSelect`, which the control clones (carried from a04ca17) | `web/src/ui/native-select.tsx:20` | yes - C56 `:1216` |
| F26 select focus cancelled in dark only (carried from a04ca17) | `web/src/chamados/ChamadoDetalhe.tsx:55` | yes - C56 `:1217`, "dark sem cor a 390: foco difere do repouso" |

**F29 really reaches the browser.** The rule is in the built CSS. With `dark` on the root, a field in the reply form's classes reads `oklch(0.6192 0.009 262)` and one outside reads `oklch(0.5735 0.0075 262)`, the same pair round 4 measured for F18. Round 4 also cites this selector style in this file: `h1,` and `h2 {` on separate lines at `6d83112`.

**The false alarm on F28 is acceptable.** A comment naming the class fails the test loudly with a count, rewording the comment fixes it, and nothing ships wrong. The comment at `web/src/index.css:100` today does not name it.

Carried rows' C55 line numbers are as observed at a04ca17; each is one higher at HEAD, and F13 and F19 may now stop at the new line first. The assertions that killed them are all still there. Round 3's other faults (F1, F3 to F10) carried from 4e5dabc.

Real tree porcelain before and after: identical (`?? .idea/`, `?? .playwright-mcp/`, `?? web/apresentacao/`), before this report was written.

## Findings

Ranked. Only 1 carries the FAIL.

1. **C55 cannot see a selector on the line above the existing one: F29 survives.** `web/src/test/interface.test.ts:194`. HEAD has no such rule. This change to that line, keeping `:193`, went green at HEAD and failed under F29 on `:195` ("expected [ Array(1) ] to deeply equal"), tried in the worktree and discarded: `const regras = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*form-resposta[^{}]*)\{([^}]*)\}/g)]`. I ran only those two cases on it, not the other faults. A rule reaching the form without naming the class, such as `.dark form.bg-muted {`, stays out of reach of any literal pin and outside C55's text; not run.
2. **Lesson L-094 is incomplete.** `.specs/LESSONS.md:573` says a test pinning the only rule naming a selector must count mentions in the whole file. F29 shows the count misses this case: the capture must also span the selector's lines. I did not edit it.
3. **Recorded, with no destination: offline reads as "Instituição não encontrada."** `web/src/acesso/Acesso.tsx:164`. Carried from a04ca17; AD-035 now names it.
4. **Recorded, with no destination: forced colours.** The question row has no focus indicator. Carried from 4c83930; AD-035 now names it.
5. **Carried from 6d907af, unchanged:** `Planilha` labels about 9.6 px at 390; "Atendimento ao estudante · / Univag" with a hanging separator at 390; `Math.round` asymmetry at ±1.95; the clipped chart label in `web/src/indicadores/Grafico.tsx:24`.

Round 4's findings 2 and 3 are closed, see above.

## Screens

I opened no screens this round: no product code changed. Carried from 4e5dabc and 6d907af.

## Gate

`python "C:/Users/Alfredo Neto/.claude/skills/tlc-spec-lean/scripts/validate_verification.py" identidade-visual`: exit 1, "verdict is FAIL". That is correct for this report.

Vitest 521 passed, 0 failed at 08c9657. Layout 192 passed, 1 environment failure, and real e2e 201 passed, both carried from a04ca17.

Cleaned up: preview on :5197, none listening after; worktree `.wt-r5` with its junction, removed with `cmd /c rmdir` first, `web/node_modules` intact. Docker `api` on :8080 and `.env` untouched. `npm run build` rewrote the ignored `api/wwwroot` in the real tree. Nothing committed.
