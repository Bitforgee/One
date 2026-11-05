# Identidade visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 6d83112..ea6b6a8 (HEAD); fix range 08c9657..ea6b6a8
**Round**: 6 - scoped
**Verifier**: fresh sub-agent with no inherited context (author != verifier); round 6; it wrote none of this code, fixed nothing and committed nothing

**What fails, exactly.** The class P18 asked this round to confirm closed, "the form's `--input` rule also reaches dark or black, however it is written", is not closed. Two faults of mine survive every suite I ran them against: a Tailwind utility on the field itself.

```tsx
<Textarea id="resposta" className="dark:[--input:var(--foreground)]" rows={3} ... />        // F42
<NativeSelect aria-label="Resposta pronta" className="dark:[--input:var(--foreground)]" ... /> // F43
```

C57 builds its reference by copying the field's own `className` (`web/e2e/identidade.spec.ts:1245`), so the clone carries the fault and the two colours stay equal. In the browser, with F42, the Responder's dark border reads `oklch(0.95 0 0)` while `var(--input)` reads `oklch(0.5735 0.0075 262)`. C55 cannot see it because it reads `index.css` only. With F42 and F43 applied together: C55 green, C57 green, Vitest 521 of 521, layout 193 of 194 with only the environment failure.

The brief said a rule that changes both equally is out of the class and asked me to say if I think otherwise. For these two I do. They change both only because the test's clone copies the class. In the product there is no clone, and only that field changes against every other field in the app. This is also the route this feature already used: round 1's fix put `border-foreground/60 dark:border-input` on this `Textarea`.

HEAD has no such class and I found no user-visible defect. What C57 does close is large: F18, F29 and 12 more spellings on the form or by selector are killed on its own assertion, all 12 of them invisible to C55, and so are both reverse faults in light. The gap is one line of the test (finding 1). By P18 this is the last round, so whether to change that line or accept the gap is the user's decision.

Proofs run at HEAD by me:
- `cd web && npx vitest run`: 521 passed, 0 failed, 54 files.
- `npm --prefix web run build`: exit 0.
- `npm --prefix web run coverage`, then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. `dryer` with the list in C41: exit 0, "No duplicate candidates found".
- Layout, the whole C42 suite against `npx vite preview --port 5199 --strictPort`: 193 of 194. The other is `web/e2e/plataforma.spec.ts:4` `manifesto e service worker`, expected 401, received 502 through the proxy to :5226, where no API listens. It passed on the image.
- `git diff --quiet 6d83112 HEAD -- api api.Tests`: exit 0.
- Real e2e, `E2E_URL=http://localhost:8089 npx playwright test` on my own image `one-verif-r6:ea6b6a8`, database `one_verif_r6`, bucket `one-verif-r6`, institution `e2e`, `E2E_CONTAINER=one-verif-r6`: **202 of 202**, first run, 7.4 min. That is round 4's 201 plus C57. `Llm__ChaveApi` and `Push__*` empty; settings from `docker-compose.yml`.
- A script resolved all 72 `-t` and `-g` names on the `Proof:` lines of `checks.md` against those logs: 0 unresolved, each as an individually passed test.

`checks.md` has no `Test policy` section, so there are no rows to judge.

Each section says where it came from: proofs and what the commit touched are **verified at ea6b6a8**; judgments about screens, binding sources and untouched coverage rows are **carried** as marked.

## The fix range

Verified at ea6b6a8. One commit, `ea6b6a8`.

- `git diff --stat 08c9657 HEAD` lists `.specs/features/identidade-visual/checks.md`, `.specs/features/identidade-visual/verification.md`, `web/e2e/identidade.spec.ts` and `web/src/test/interface.test.ts`. No product code.
- `web/src/test/interface.test.ts`: one line, `:194`. It now strips comments and captures the selector across lines. No other assertion changes. I reran the carried C55 faults against it (below), and all are still killed. One behaviour got more tolerant and is harmless: `{` on its own line with the correct value now passes, since it is the same rule.
- `web/e2e/identidade.spec.ts`: 27 added lines, the C57 test at `:1231-1255`. No existing assertion edited; C51 to C53 move down by 27.

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

Every proof below ran at ea6b6a8: Vitest for the unit rows; the layout suite for the layout rows; the image for the real rows. Citations are carried from round 5 except C51 to C53, C55 and C57, which I re-read; the files' other lines did not move. The assertion judgments on untouched tests are carried from a04ca17.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | only the 2 font packages, no Inter | vitest passed at ea6b6a8 | `web/src/identidade.test.tsx:14` `filter(startsWith('@fontsource'))` toEqual the 2 packages; `:18-19` not.toContain('inter') | PASS |
| C2 | both faces loaded, app origin only | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:44-46` FontFace `loaded`, no Inter; `:52-55` woff2 URLs, no `inter-`, single origin | PASS |
| C3 | 7 sans roles at 390 and 1440 | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:94` `expect(r.fora).toEqual([])`; `:116` at least 1 per type | PASS |
| C4 | serif only on allowed elements, 20 px or more | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:141-144`; `:153` at least 1 on 5 screens | PASS |
| C5 | 23 radius measures | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:171` `toEqual([e,e,e,e])`; `:177` pill; `:251` `medidas.length` 23 | PASS |
| C6 | pills only in the allowed set | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:288-289`; `:297-298` | PASS |
| C7 | radius scale, no `--radius` | vitest passed at ea6b6a8 | `web/src/identidade.test.tsx:27` toEqual `[4, 6, 12, 16]` | PASS |
| C8 | latin fonts in precache, up to 90 KB, no Inter | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:318-323` `toBeLessThanOrEqual(90 * 1024)` | PASS |
| C9 | single column, 24 cases | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:350-351`, `:365`, `:371`, `:374` `casos` 24 | PASS |
| C10 | order on Login, 2 cases | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:400` helper right before "CPF"; `:417` top against previous bottom | PASS |
| C11 | serif 28, muted texts, marker, background | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:440-441`, `:443-444`, `:449-450`, `:469-470` | PASS |
| C12 | Primeiro acesso, Criar senha | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:503`; `:507` helper count 0 | PASS |
| C13 | photo in the right column | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:524-532`, `:543-546` | PASS |
| C14 | 160 px strip below 1024 | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:566` height 160; `:569-570` above logo and field; `:581` no text over it | PASS |
| C15 | texts and logo, 4 cases | vitest passed at ea6b6a8 | `web/src/acesso/identidade.test.tsx:27` logo `src`; `:28`, `:38` helper once | PASS |
| C16 | root | vitest and layout passed at ea6b6a8 | `web/src/acesso/identidade.test.tsx:50` 0 `svg`; `web/e2e/identidade.spec.ts:594`, `:603` | PASS |
| C17 | title and phrase, 4 cases | vitest passed at ea6b6a8 | `web/src/assistente/identidade.test.tsx:24`; `:26-27` no "Olá! Eu sou" | PASS |
| C18 | serif 24 left | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:631-633`, `:636`, `:639-640` | PASS |
| C19 | assistant with and without photo | vitest and layout passed at ea6b6a8 | `web/src/assistente/identidade.test.tsx:44-45`; `web/e2e/identidade.spec.ts:653-658` | PASS |
| C20 | open request, 8 cases | vitest passed at ea6b6a8 | `web/src/assistente/identidade.test.tsx:70-76` link and order; `:80-81` none and no alert | PASS |
| C21 | border in action colour, before questions | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:670-674` `referencia('--primary')` | PASS |
| C22 | 48 px rows, divider, icons, tap sends | vitest and layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:691`, `:698`, `:701-702`, `:707`; `web/src/assistente/identidade.test.tsx:96`; `web/src/assistente/boasvindas.test.tsx:60` | PASS |
| C23 | previous period, 3 cases, exactly 2 reads | vitest passed at ea6b6a8 | `web/src/indicadores/identidade.test.tsx:48`, `:52` exact URLs | PASS |
| C24 | up, down, equal | vitest passed at ea6b6a8 | `web/src/indicadores/identidade.test.tsx:65` `findByText(texto)` with `▲ 4,2 pts`, `▼ 1,0 pt`, `= sem variação` | PASS |
| C25 | no variation on failure or no data | vitest passed at ea6b6a8 | `web/src/indicadores/identidade.test.tsx:84-85` absent and no alert; `:91` control | PASS |
| C26 | rounding and plural | vitest passed at ea6b6a8 | `web/src/indicadores/identidade.test.tsx:100` with `= sem variação`, `▲ 1,9 pt`, `▲ 2,0 pts` | PASS |
| C27 | serif 40, variation beside, at 390 and 1440 | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:762-770`, `:774-775` | PASS |
| C28 | strip by `main` width, 4 cases | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:785`, `:788`, `:794`, `:800` | PASS |
| C29 | 9 rows, 2 or 1 columns | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:831`, `:834-837`, `:843-844`, `:847` | PASS |
| C30 | charts without card, with title | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:862`, `:865`, `:868` | PASS |
| C31 | only `Planilha` | vitest passed at ea6b6a8 | `web/src/identidade.test.tsx:41`, `:43`; `web/src/ilustracoes/ilustracoes.test.tsx:18` | PASS |
| C32 | Aparência without box, 32 px | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:892-893`, `:895`, `:898` | PASS |
| C33 | Dados do aluno, Histórico | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:923`, `:926`, `:930-931`, `:936` | PASS |
| C34 | no box, tint only on action, 32 px | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:950-951`, `:958-959`, `:966`. The form keeps `bg-muted` (`web/src/chamados/ChamadoDetalhe.tsx:113`) | PASS |
| C35 | empty states, 8 cases | vitest passed at ea6b6a8 | `web/src/tabela.test.tsx:52-56`; `web/src/indicadores/identidade.test.tsx:171` | PASS |
| C36 | icon 28 centred, 16 measures | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:1009-1012`, `:1014-1016`, `:1018`, `:1030` | PASS |
| C37 | `Planilha` in step 2 | vitest passed at ea6b6a8 | `web/src/administracao/identidade.test.tsx:40` text toEqual the CSV header | PASS |
| C38 | 7 columns in a row | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:1041`, `:1044`, `:1050-1051` | PASS |
| C39 | preview | vitest and layout passed at ea6b6a8 | `web/src/administracao/identidade.test.tsx:60`, `:65`; `web/e2e/identidade.spec.ts:1064`, `:1070`, `:1072` | PASS |
| C40 | suite and build pass; edits only from the closed list | vitest 521, build 0, at ea6b6a8 | `.specs/features/identidade-visual/checks.md:596-597`; list at `:32`. See `## The fix range` | PASS |
| C41 | crapper and dryer | both exit 0 at ea6b6a8 | `.specs/features/identidade-visual/checks.md:604-605` run as written | PASS |
| C42 | layout suite whole | 193 of 194 on preview, the other passes on the image, at ea6b6a8 | `web/e2e/plataforma.spec.ts:4` needs an API on :5226, 502 on preview; passed on :8089 | PASS |
| C43 | no change in `api/` | exit 0 at ea6b6a8 | `.specs/features/identidade-visual/checks.md:614` run as written | PASS |
| C44 | real fonts, request line, 2 reads | real e2e passed at ea6b6a8 | `web/e2e/identidade-real.spec.ts:115`, `:124-125`, `:150-151` | PASS |
| C45 | whole suite on the image, no other real spec edited | 202 of 202 at ea6b6a8 | `.specs/features/identidade-visual/checks.md:632`; `git diff --quiet 6d83112 HEAD` on `ux-real`, `aparencia-real`, `instituicoes-real` and `anexos` specs exit 0 | PASS |
| C46 | 11 named tests pass without edit | vitest and layout passed at ea6b6a8 | `web/e2e/ux.spec.ts:109`, `:156`, `:230`, `:589`, `:379`, `:386`, `:1349`, `:565`; `web/src/ux.test.tsx:139`. The fix range edits none | PASS |
| C47 | row focus 3:1, 2 px or more, 12 cases | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:1118` espessura `toBeGreaterThanOrEqual(2)`; `:1119` contraste `toBeGreaterThanOrEqual(3)`; `:1112` control `toEqual([])`; `:1122` `medidas` 12 | PASS |
| C48 | "Responder" border 3:1, for student and staff, both brands, 3 themes, 390 and 1280 | layout and real passed at ea6b6a8 | `web/e2e/identidade.spec.ts:1143` `expect(contraste(borda, fundo)).toBeGreaterThanOrEqual(3)`; `:1146` `expect(medidas).toBe(24)`; `:1137` `eventos: null`; `:1141` "Nota interna" `toHaveCount(aluno ? 0 : 1)` | PASS |
| C49 | no variation while a response is pending | vitest passed at ea6b6a8 | `web/src/indicadores/identidade.test.tsx:113` not in document for the 4 texts; `:132` `▲ 10,0 pts`; `:125` control | PASS |
| C50 | `semDados` with a number hides it | vitest passed at ea6b6a8 | `web/src/indicadores/identidade.test.tsx:143-144` absent and no alert; `:148` control `▲ 4,2 pts` | PASS |
| C51 | name between phrase and request | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:1265-1267` the 3 `toBeGreaterThanOrEqual` | PASS |
| C52 | variation below the number at 360 | layout passed at ea6b6a8 | `web/e2e/identidade.spec.ts:1283` below; `:1284` `perto(v.x, n.x)`; `:1285` no horizontal overflow | PASS |
| C53 | empty date and precache | vitest and layout passed at ea6b6a8 | `web/src/indicadores/identidade.test.tsx:153-154` `toBeNull`; `:161-162` no `NaN`, 3 reads; `web/e2e/identidade.spec.ts:1304` other alphabets `toEqual([])`; `:1305-1306` 2 latin files | PASS |
| C54 | select at 3:1; focus equal to a common field and different from rest; error equal to `--destructive`; student's screen; 3 themes, 2 brands, 390 and 1280 | layout and real passed at ea6b6a8 | `web/e2e/identidade.spec.ts:1174` select `toBeGreaterThanOrEqual(3)`; `:1183` `toBe(comumFoco)`; `:1184` `.not.toBe(repouso)`; `:1188-1189` `toBe(destrutivo)`; `:1193` `expect(medidas).toBe(12)` | PASS |
| C55 | the only rule naming `form-resposta` has the selector `.form-resposta:not(.dark *)` and declares only `--input`, the token with 0.63 for 0.66 | vitest passed at ea6b6a8 | `web/src/test/interface.test.ts:193` `expect(css.match(/form-resposta/g)).toHaveLength(1)`; `:195` `expect(regras.map((r) => r[1].trim())).toEqual(['.form-resposta:not(.dark *)'])`; `:197` `toContain('0.66 0 none')`; `:198` `expect(regras[0][2].trim()).toBe(...)`. F29 now killed on `:195`. Round 5's FAIL on this row is closed: everything this claim names is proven | PASS |
| C56 | select focus equal to a common select and different from rest; select error equal to `--destructive`; with "Nota interna" the select leaves and "Responder" stays at 3:1; 3 themes, 2 brands, 390 and 1280 | layout and real passed at ea6b6a8 | `web/e2e/identidade.spec.ts:1216` `toBe(comumFoco)`; `:1217` `.not.toBe(repouso)`; `:1220` `toBe(await corDestrutiva(page))`; `:1222` `expect(select).toHaveCount(0)`; `:1224` `toBeGreaterThanOrEqual(3)`; `:1227` `expect(medidas).toBe(12)` | PASS |
| C57 | staff's screen, 390 and 1280, 2 brands, rest border of Responder and select against an equal element with the same classes outside the `form`: equal in dark and black, different in light | layout and real passed at ea6b6a8 | `web/e2e/identidade.spec.ts:1248` `expect(d, ...).not.toBe(f)` for light; `:1249` `expect(d, ...).toBe(f)` otherwise; `:1254` `expect(medidas).toBe(24)`; clone at `:1245` | PASS |

**C57 stays PASS as written, and the class still fails.** C57's text says "com as mesmas classes", and the test does exactly that, so F42 makes no clause of it false. The hole is that the check's own wording fixes the reference to a copy of the thing measured: a precision gap in the check, which shows up as the `no` rows below rather than as this row. The verdict comes from those rows and the override row in `## Coverage`.

## Coverage

The override rule's rows are verified at ea6b6a8, because the commit touched their proofs. The rest are carried from a04ca17.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| the override rule: what it must keep (3) | `web/src/index.css:101-103`, `.specs/features/revisao-ux/plan.md:53`, C55's text | brand hue C55 · grey C55 · light only C55, C57 | - |
| the form's `--input` measured in the browser (3) | C57's text, P18, the faults below | dark C57 · black C57 · light, different C57; for rules and inline styles on the form | a `--input` set in the dark on the field's own class: F42, F43. Also a rule gated on what C57 does not sample: F49 (Nota interna on), F48 (other width), F50 (OS dark) |
| field kinds in the reply block that AC 4 names (2) | `.specs/features/revisao-ux/plan.md:148`, the form at `web/src/chamados/ChamadoDetalhe.tsx:113-118` | `NativeSelect` C54, C56, C57 · `Textarea` C48, C54, C56, C57 | - |
| select border: states (3) | `web/src/ui/native-select.tsx:20-21`, carried | rest C54 · focus C56 · error C56 | - |
| Nota interna on (1) | `web/src/chamados/ChamadoDetalhe.tsx:55`, `:117`, carried | C56, with the select gone and "Responder" at 3:1 | - |
| "Responder" border: views (2) | `web/src/chamados/ChamadoDetalhe.tsx:420`, carried | staff C48, C54 · student C48 with control | - |
| "Responder" border: themes (3), brands (2), widths (2) | C48, C54, carried | all 12, faults killed for theme, floor and view | - |
| "Responder" border: states (3) | `web/src/ui/textarea.tsx:9`, carried | rest C48 · focus C54 · error C54 | - |
| question row focus (12) | C47, carried from 4c83930 | all, with control | - |
| Assistente items in order (5) | Screens, carried from 4c83930 | C18, C51 | - |
| variation results (6), in time (2), widths and strings | AC 12, AC 13, carried from 4c83930 | C24, C25, C26, C50, C49, C27, C52 | - |
| precache by alphabet, empty date (2) | `web/vite.config.ts:35`, `web/src/indicadores/Indicadores.tsx:204`, carried from 4c83930 | C53, C8 | - |
| AC 22 invariants (6) | `.specs/features/identidade-visual/plan.md:168`, carried | 44 px, 16 px, tab bar, action colour, tints C46 · contrast on the tinted surface C48, C54 | - |
| sans roles (7) · serif roles (5) · font files (3) · radius roles (9) | carried from 6d907af | C2, C3 · C4, C27, C11, C18, C16 · C8, C1, C2, C44 · C5, C6, C7, C22 | - |
| access screens x photo x widths · Assistente states (15) · request states (5) | carried from 6d907af | C9 to C15 · C17, C19, C20 · C20, C44 | - |
| previous period (3) · empty states (8) · illustrations (6), columns (7) · static blocks (3), titles (3), tinted (2) | carried from 6d907af | C23, C44 · C35, C36 · C31, C37, C38 · C32, C33, C34 | - |

The attachments' dashed area and the app-wide `--ring` are in no row: `.specs/STATE.md` AD-035 sends them to the next round's plan, carried from a04ca17. `Swept` rows that say "existing": carried.

## Faults injected

Run in a `git worktree` of HEAD at `.wt-r6`, with `node_modules` as a junction and its own `vite preview` on :5197, rebuilt with `npx vite build` before each fault. C55 and C57 went green on the unmodified worktree first. Each failure below is the test's own assertion, and the colours in the messages show each fault reached the browser. `$X` is the override's own value, `color-mix(... 6%, oklch(0.63 0 none))`. Restored with `git checkout -- web/src` between faults. `mutator` suspended (AD-025). This goes past verify.md's cap of five because the brief asks for the class to be swept.

**Inside the class: selectors, inline style, and the reverse.** Every row was run against both C55 and C57.

| Mutation | Location | Killed |
| --- | --- | --- |
| none, baseline | ea6b6a8 | baseline: C55 1 passed, C57 1 passed |
| F18 `.dark .form-resposta,` with `.nada-r4 {` on the next line | end of `web/src/index.css` | yes - C55 `:193`, length 2; C57 `:1249` dark, received `oklch(0.6192 0.009 262)` against `oklch(0.5735 0.0075 262)` |
| F29 `.dark form.bg-muted,` on the line above the existing selector, round 5's survivor | `web/src/index.css:101` | yes - C55 `:195`; C57 `:1249` dark, same pair |
| F31 `.dark form:has(#resposta) { --input: $X }` | end of `web/src/index.css` | yes - C57 `:1249` dark. C55 green |
| F32 `@media screen { .dark form:has(select, textarea) { ... } }` | end of `web/src/index.css` | yes - C57 `:1249` dark. C55 green |
| F33 `:is(.dark, .black) :is(form, fieldset):has(> #resposta) { ... }` | end of `web/src/index.css` | yes - C57 `:1249` dark. C55 green |
| F34 `.black form:has(#resposta) { ... }`, black only | end of `web/src/index.css` | yes - C57 `:1249` "black sem cor a 390". C55 green |
| F35 inline `style={{ '--input': 'oklch(0.63 0 none)' }}` on the form | `web/src/chamados/ChamadoDetalhe.tsx:113` | yes - C57 `:1249` dark, received `oklch(0.63 0 none)`. C55 green |
| F36 `.dark form select { --input: $X }`, select only | end of `web/src/index.css` | yes - C57 `:1249` "select[aria-label=...]". C55 green |
| F37 `.dark #resposta { --input: $X }`, Responder only | end of `web/src/index.css` | yes - C57 `:1249` "#resposta". C55 green |
| F38 `@media (min-width: 1024px) { .dark form:has(#resposta) { ... } }`, sampled width only | end of `web/src/index.css` | yes - C57 `:1249` "dark sem cor a 1280". C55 green |
| F39 `.black #resposta { border-color: oklch(0.63 0 none) }`, black and Responder only, no `--input` | end of `web/src/index.css` | yes - C57 `:1249` black. C55 green |
| F40 `html[class~="dark"] form[class*="bg-muted"] { ... }` | end of `web/src/index.css` | yes - C57 `:1249` dark. C55 green |
| F41 `dark:[--input:var(--foreground)]` on the form's classes | `web/src/chamados/ChamadoDetalhe.tsx:113` | yes - C57 `:1249`, received `oklch(0.95 0 0)`. C55 green |
| F44 `.dark #resposta[rows] { border-color: var(--foreground) }` | end of `web/src/index.css` | yes - C57 `:1249` dark. C55 green |
| R1 the override deleted, reverse in light | `web/src/index.css:101-103` | yes - C55 `:193`; C57 `:1248` "light sem cor a 390: no claro o form escurece" |
| R2 `form-resposta` removed from the form, reverse in light | `web/src/chamados/ChamadoDetalhe.tsx:113` | yes - C57 `:1248`. C55 green |

**Inside the class: the survivors.** Each was measured against `var(--input)` painted on `body`, and each also ran the whole `web/e2e/identidade.spec.ts` (35 tests, C48, C54, C56 and C57 among them).

| Mutation | Location | Killed |
| --- | --- | --- |
| F42 `dark:[--input:var(--foreground)]` on the `Textarea`, Responder only | `web/src/chamados/ChamadoDetalhe.tsx:116` | no - C55 green, C57 green, identidade 35 of 35. In the browser, Responder `oklch(0.95 0 0)`, token `oklch(0.5735 0.0075 262)` |
| F43 the same on `NativeSelect`, select only | `web/src/chamados/ChamadoDetalhe.tsx:55` | no - C55 green, C57 green, identidade 35 of 35. Select `oklch(0.95 0 0)` |
| F42 and F43 together, on everything except the image | as above | no - Vitest 521 of 521, layout 193 of 194, only `plataforma.spec.ts:4`; build exit 0. Not run on an image |
| F45 `dark:border-foreground/60` on the `Textarea`, the shape round 1 used | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C54 `:1184` "dark sem cor a 390: foco difere do repouso", because it cancels the focus colour. C57 alone stays green, measuring `oklab(0.95 0 0 / 0.6)` on the field |
| F49 `.dark form:has(#resposta):not(:has(select)) { --input: $X }`, Nota interna on and any form without the select | end of `web/src/index.css` | no - C55 green, C57 green, identidade 35 of 35. With Nota interna on, Responder `oklch(0.6192 0.009 262)`, token `oklch(0.5735 0.0075 262)`. C57 measures only with the select present |
| F48 `@media (min-width: 1400px) { .dark form:has(#resposta) { ... } }`, a width C57 does not sample | end of `web/src/index.css` | no - C55 green, C57 green, identidade 35 of 35. At 1440 both fields `oklch(0.6192 0.009 262)` |
| F50 `@media (prefers-color-scheme: dark) { .dark form:has(#resposta) { ... } }`, OS in dark | end of `web/src/index.css` | no - C55 green, C57 green, identidade 35 of 35. With the OS emulated dark, both fields `oklch(0.6192 0.009 262)`. Playwright runs in light |

**Outside the class as the brief defines it.**

| Mutation | Location | Killed |
| --- | --- | --- |
| F51 `.dark main:has(#resposta) { --input: $X }`, reaches the clone too, because it is appended to `main` | end of `web/src/index.css` | no - C55 green, C57 green, identidade 35 of 35. Both fields `oklch(0.6192 0.009 262)`, token `oklch(0.5735 0.0075 262)`. I agree this one is out: the rule is the screen's, not the form's. Recorded as a candidate, finding 3 |

**C55's carried faults, rerun against the new regex.** C55 only, reading CSS text, so no rebuild.

| Mutation | Location | Killed |
| --- | --- | --- |
| F2 selector `.form-resposta`, applied in dark too | `web/src/index.css:101` | yes - C55 `:195`, received `.form-resposta` |
| F11 override grey 0.30 | `web/src/index.css:102` | yes - C55 `:198` |
| F12 override ignores the brand | `web/src/index.css:102` | yes - C55 `:198` |
| F13 extra `.dark .form-resposta` rule on one line | `web/src/index.css:103` | yes - C55 `:193`, length 2 |
| F16 token grey 0.66 to 0.64, CSS and row | `web/src/index.css:34`, `web/src/test/interface.test.ts:79` | yes - C55 `:197` |
| F17 extra declaration `--ring: red` | `web/src/index.css:102` | yes - C55 `:198` |
| F19 `{` on its own line, grey 0.30 | `web/src/index.css:101` | yes - C55 `:198`. Before the new regex it stopped at the selector line |
| F27 `@media` wrapping `:is(`, `.form-resposta`, `)` on three lines | end of `web/src/index.css` | yes - C55 `:193`, length 2 |
| F28 a comment naming `form-resposta`, changing no behaviour | `web/src/index.css:101` | yes - C55 `:193`, length 2. The acceptable false alarm from round 5; `:193` counts over the raw file, comments included |
| F30 the existing selector ends in a comma, `.dark form {` on the next line | `web/src/index.css:101` | yes - C55 `:195` |

**Carried, not rerun:** F14, F15 and F20 to F26 from a04ca17; F1 and F3 to F10 from 4e5dabc. The commit edits none of their assertions.

**The survivors' numbers are real runs.** The probe was an extra test added to the worktree's copy of the spec and read the computed border at 390, 1440, with Nota interna on, and with the OS in dark. At unmodified HEAD, in dark, every field present in all four cases read `oklch(0.5735 0.0075 262)`, equal to the token. An F45 attempt failed at the `sed` step and ran with no fault; I noticed, discarded it, and the row above is from the corrected run.

Real tree porcelain, before and after, on what I touched: identical (`?? .idea/`, `?? .playwright-mcp/`, `?? web/apresentacao/`), before this report was written. `.specs/LESSONS.md` and `.specs/lessons.json` turned up modified during my run. I did not edit them; the brief says the orchestrator corrects L-094.

## Findings

Ranked. Finding 1 carries the FAIL.

1. **The class is not closed: a `--input` on the field's own class escapes C57, because the reference copies the field's classes.** `web/e2e/identidade.spec.ts:1245`. F42 and F43 survive everything run against them. Tried in the worktree and discarded: comparing each field to `var(--input)` painted on an element appended to `body`, the same pattern as `corDestrutiva` at `:1158`, instead of the clone. It stayed green at HEAD (all 12 combinations, both fields) and killed F42, F43, F45 and F51. I ran only those cases on it, and not the rest of the faults. C57's text says "com as mesmas classes", so it would need changing too. This is the sixth round, so it is the user's decision whether to take that change or accept the gap.
2. **Rules gated on what C57 does not sample also survive: F49, F48, F50.** They do reach dark, so read literally they are in the class, and I marked them `no`. My judgment on each, none needed for the verdict: F49 is the one I would treat as real, since Nota interna on is a finite state of this same screen, and the same selector matches the student's form, which has no select (inferred from the form's markup, not measured on the student's screen). F48 and F50 are limits of any sampled measurement, and the candidate in finding 1 would not close them. All three need someone to write a deliberate condition on another dimension, so they are accepted-risk candidates if the user wants that.

**Outside the class, recorded per P18 as accepted-risk candidates. None of these starts a round.**

3. **F51: a rule on `main` escapes, because the clone sits inside `main`.** Out of the class as the brief defines it, and I agree. The candidate in finding 1 would also close it.
4. **The comment at `web/src/test/interface.test.ts:193` is out of date.** It says a selector broken across 2 lines would escape the regex below; since this commit the regex spans lines. The count still matters, as it catches a second rule. Harmless.
5. **Carried from a04ca17, AD-035 names them:** offline reads as "Instituição não encontrada." (`web/src/acesso/Acesso.tsx:164`); in forced colours the question row has no focus indicator; the dashed attachments area and the app-wide `--ring` below 3:1 stay in the product.
6. **Carried from 6d907af, unchanged:** `Planilha` labels about 9.6 px at 390; "Atendimento ao estudante · / Univag" with a hanging separator at 390; `Math.round` asymmetry at ±1.95; the clipped chart label in `web/src/indicadores/Grafico.tsx:24`.

Round 5's finding 1, F29, is closed. Round 5's finding 2, L-094, is the orchestrator's by the brief; not judged here.

## Screens

I opened no screens this round: no product code changed. The screen and measurement judgments are carried from 4e5dabc and 6d907af.

## Gate

`python "C:/Users/Alfredo Neto/.claude/skills/tlc-spec-lean/scripts/validate_verification.py" identidade-visual`: exit 1, 1 error, 0 warnings, "verdict is FAIL". That is correct for this report.

Vitest 521 passed, 0 failed. Layout 193 passed, 1 environment failure. Real e2e 202 passed, 0 failed. All at ea6b6a8.

Cleaned up: previews on :5197 and :5199 by PID, none listening after; container `one-verif-r6`, image `one-verif-r6:ea6b6a8`; database `one_verif_r6` dropped and bucket `one-verif-r6` removed, each from a throwaway client container on the compose network; worktree `.wt-r6` with its junction, removed with `cmd /c rmdir` first, `web/node_modules` intact. Docker `api` on :8080 and `.env` untouched. `npm run build` rewrote the ignored `api/wwwroot`, and coverage and `crapper` rewrote ignored output in the real tree. One slip: a command of mine included `docker exec one-system-postgres-1 true`, against the brief; the permission system denied it and it did not run. Nothing committed.
