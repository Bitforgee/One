# Identidade visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 6d83112..4c83930 (HEAD); fix range 9e92f79..4c83930
**Round**: 2 - scoped
**Verifier**: fresh sub-agent with no inherited context (author != verifier); round 2; it wrote none of this code, fixed nothing and committed nothing

Most of round 1 is closed: focus on the question rows, the three surviving mutants, the arrangement, C40, precache and the empty date. It fails on three things, all about the reply form in the ticket detail:

1. **Round 1 finding 2 is half closed.** The fix covered the `Textarea`. The "Resposta pronta" `NativeSelect` sits in the same tinted block and still measures 2.92 to 2.96:1 in light (3.14 to 3.18:1 at `6d83112`). Staff with ready answers see it. No fixture renders it, so no test or sweep ever saw it, round 1 included. Measured on the real image: 2.96:1 at 390 and 1440.
2. **The fix created a regression.** `dark:border-input` beats `focus-visible:border-ring` and `aria-invalid:border-destructive`, because Tailwind sorts `dark:` later. In dark and black the field's border no longer changes on focus or on error: 3.82:1 at rest and on focus, where it was 5.67:1 on focus with `#8a1538` before the fix.
3. **C48's student case is not the student's view.** The fixture always has `eventos`, and `equipe = c.eventos !== null`, so the `ALUNO` loop renders the staff screen. A fault that applies the border only to staff passes C48. The code itself is right: I measured the real student at 5.1:1.

Proofs run at HEAD by me, one invocation per target:
- `cd web && npx vitest run`: 520 passed, 0 failed, 54 files.
- `npm --prefix web run build`: exit 0; precache 12 entries.
- `npm --prefix web run coverage`, then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. `dryer` with the C41 list: "No duplicate candidates found."
- Layout suite (the 8 specs of C42) against `npx vite preview --port 5199`: 190 passed, 1 failed. The failure is `web/e2e/plataforma.spec.ts:4` `manifesto e service worker`, which needs an API on :5226. It passed on the real image, so I judge it an environment limit.
- `git diff --quiet 6d83112 HEAD -- api api.Tests`: exit 0. Only `web/` and `.specs/` change.
- Real e2e: my own image `one-verif-r2:4c83930` (`git archive HEAD | docker build`) on :8089, database `one_verif_r2`, bucket `one-verif-r2`, institution `e2e`: **199 passed, 0 failed, 0 flaky** on the first run in 7.5 min.
- All 74 `Proof:` lines of `checks.md`: 67 name a test, and each resolved by script to a test that exists and passed in those JSON outputs (0 missing). The other 7 are whole-suite or command proofs, run as above.

`checks.md` has no `Test policy` section, so there are no rows to judge.

Each section says where it came from: what the fix touched is **verified at 4c83930**; what it could not touch is **carried from 6d907af**. Green proofs are all from 4c83930.

## Round 1 findings

| # | Round 1 finding | State at 4c83930 | Why |
| --- | --- | --- | --- |
| 1 | question rows without focus | closed | ring 2 px at 16.28 to 19.12:1, in 3 themes and 2 brands, at 390 and 1440; 4 faults killed; the real image reads `oklch(0.145 0 0) 0px 0px 0px 2px inset` |
| 2 | reply field lost its 3:1 border | **half closed** | `Textarea` 5.07 to 5.1:1 in light; the `NativeSelect` beside it 2.92 to 2.96:1. Findings 1 and 2 below |
| 3 | F4d, `!provisorio` | closed | C49 kills it, and a second variant (`keepPreviousData` on the previous query) too |
| 4 | L13, name line | closed | C51 kills 4 orderings |
| 5 | variation not beside on narrow phones | closed | P15 and `plan.md:107` say "ao lado quando couber"; C52 measures it at 360 and kills 2 faults |
| 6 | F4e, `semDados` | closed | C50 kills it |
| 7 | C40 second clause | closed | item 9 at `.specs/features/identidade-visual/checks.md:123` names all 7 round 1 groups. See Edits below |
| 8 | 9 fonts in precache | closed | the real image's manifest has 12 entries and 2 fonts; C53 kills 3 faults |
| 9 | empty date sends `NaN` | closed | real image: only `GET /api/indicadores?de=&ate=2026-11-05`, `400`, alert "Os dados enviados são inválidos."; no `NaN` |
| 10 | helper text "abaixo do nome" | mostly closed | `plan.md:71` and P1 fixed. One remains at `.specs/features/identidade-visual/checks.md:70`, finding 6 below |
| 11, 12 | small; pre-existing chart label | unchanged | carried from 6d907af, the fix did not touch them |

## Binding sources

Step 1 re-run only for the screens the fix touched: the Assistente's question rows and the detail's reply form. Everything else is carried from 6d907af, including the divergences the plan decided on purpose (login items, photo beside the form, title, no sparklines, Conta's border, pills, Fila rows at 0 px), which are unchanged.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/identidade-visual/pesquisa.md` | carried from 6d907af, the fix touched nothing it decides | none | - |
| `.specs/features/revisao-ux/pesquisa.md` §15 and the "Como aplicar" that follows it | yes, verified at 4c83930 | none | "Bordas de campos, ícones e foco: 3:1": the "Resposta pronta" select at 2.92-2.96:1 in light (`web/src/chamados/ChamadoDetalhe.tsx:55`, inside the `bg-muted` of `:113`), and focus of "Responder" at 2.33:1 in light without a colour (`:116`). No check measures either |
| `.specs/features/revisao-ux/checks.md` C57 (not binding by name, opened because the brief asks) | yes, verified at 4c83930 | none for C47; see Uncovered | `.specs/features/revisao-ux/checks.md:635` "a borda dele passa a ter a cor de foco": false for "Responder" in dark and black (finding 2). Its test measures another field in light, so it stays green |

**C47 against those sources, measured.** `ring-foreground` does not conflict. C57 and AC 43 limit where the action colour may go, and they do not require it on focus: `foreground` is not the action colour, and C57's focus clause is about fields, which a row is not. `pesquisa.md` line 91 ("a cor da instituição entra só em ação principal, item ativo e foco") is the same kind of ceiling. The `--ring` token is untouched, so `aparencia-instituicao` AC 31 holds. The cost is cosmetic: with an institution colour, rows focus in near-black while the other controls focus in the brand. By eye the ring is clear, with nothing clipped at 390 or 1440 in the captures I opened.

**Per-screen enumeration for the two screens.**

| Screen | Decided, reachable by a selector | Checks | Uncovered |
| --- | --- | --- | --- |
| Assistente without conversation | order: title, phrase, name, request, questions; row focus | C18, C20, C21, C47, C51 | - |
| Detail, reply block | tint, field borders at 3:1 for every field in it: select, `Textarea`, attachments | C34, C48 | select (finding 1); student view (finding 3). The attachments' dashed area is 1.21:1 at HEAD and 1.30:1 at base, under 3:1 before this feature |
| Indicadores | variation beside when it fits, below at 360 | C27, C52 | - |

## Checks

Proofs verified at 4c83930. Citations refreshed for the files the fix touched (`web/src/indicadores/identidade.test.tsx` moved by 1 line and more; `web/e2e/identidade.spec.ts` only grew at the end, so old lines hold; `checks.md` moved).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | only the 2 font packages, no Inter | vitest, passed | `web/src/identidade.test.tsx:14` `filter(startsWith('@fontsource'))` toEqual the 2 packages; `:18-19` not.toContain('inter') | PASS |
| C2 | both faces loaded, app origin only | layout, passed | `web/e2e/identidade.spec.ts:44-46` FontFace `loaded`, no Inter; `:52-55` woff2 URLs, no `inter-`, single origin | PASS |
| C3 | 7 sans roles at 390 and 1440 | layout, passed | `web/e2e/identidade.spec.ts:94` `expect(r.fora).toEqual([])`; `:116` at least 1 per type | PASS |
| C4 | serif only on allowed elements, 20 px or more | layout, passed | `web/e2e/identidade.spec.ts:141-144`; `:153` at least 1 on 5 screens | PASS |
| C5 | 23 radius measures | layout, passed | `web/e2e/identidade.spec.ts:171` `toEqual([e,e,e,e])`; `:177` pill; `:251` `medidas.length` 23 | PASS |
| C6 | pills only in the allowed set | layout, passed | `web/e2e/identidade.spec.ts:288-289`; `:297-298` | PASS |
| C7 | radius scale, no `--radius` | vitest, passed | `web/src/identidade.test.tsx:27` toEqual `[4, 6, 12, 16]` | PASS |
| C8 | latin fonts in precache, up to 90 KB, no Inter | layout, passed | `web/e2e/identidade.spec.ts:318-323` `toBeLessThanOrEqual(90 * 1024)`; measured 26 832 + 50 936 = 77 768 B, now also the whole font share of the precache | PASS |
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
| C27 | serif 40, variation beside, at 390 and 1440 | layout, passed | `web/e2e/identidade.spec.ts:762-770`, `:774-775`. The sentence in `plan.md:107` now agrees | PASS |
| C28 | strip by `main` width, 4 cases | layout, passed | `web/e2e/identidade.spec.ts:785`, `:788`, `:794`, `:800` | PASS |
| C29 | 9 rows, 2 or 1 columns | layout, passed | `web/e2e/identidade.spec.ts:831`, `:834-837`, `:843-844`, `:847` | PASS |
| C30 | charts without card, with title | layout, passed | `web/e2e/identidade.spec.ts:862`, `:865`, `:868` | PASS |
| C31 | only `Planilha` | vitest, passed | `web/src/identidade.test.tsx:41`, `:43`; `web/src/ilustracoes/ilustracoes.test.tsx:18` | PASS |
| C32 | Aparência without box, 32 px | layout, passed | `web/e2e/identidade.spec.ts:892-893`, `:895`, `:898` | PASS |
| C33 | Dados do aluno, Histórico | layout, passed | `web/e2e/identidade.spec.ts:923`, `:926`, `:930-931`, `:936` | PASS |
| C34 | no box, tint only on action, 32 px | layout, passed | `web/e2e/identidade.spec.ts:950-951`, `:958-959`, `:966` | PASS |
| C35 | empty states, 8 cases | vitest, passed | `web/src/tabela.test.tsx:52-56`; `web/src/indicadores/identidade.test.tsx:171` | PASS |
| C36 | icon 28 centred, 16 measures | layout, passed | `web/e2e/identidade.spec.ts:1009-1012`, `:1014-1016`, `:1018`, `:1030` | PASS |
| C37 | `Planilha` in step 2 | vitest, passed | `web/src/administracao/identidade.test.tsx:40` text toEqual the CSV header | PASS |
| C38 | 7 columns in a row | layout, passed | `web/e2e/identidade.spec.ts:1041`, `:1044`, `:1050-1051` | PASS |
| C39 | preview | vitest and layout, passed | `web/src/administracao/identidade.test.tsx:60`, `:65`; `web/e2e/identidade.spec.ts:1064`, `:1070`, `:1072` | PASS |
| C40 | suite and build pass; edits only from the closed list | vitest 520, build 0 | `.specs/features/identidade-visual/checks.md:594-595`; list at `:32` with item 9 at `:123`; test-file numstat in the fix range is `123 0` and `61 0`. See Edits below | PASS |
| C41 | crapper and dryer | exit 0; "No duplicate candidates found." | `.specs/features/identidade-visual/checks.md:601-602` run as written | PASS |
| C42 | layout suite whole | 190 of 191 on preview; the other passes on the image | `web/e2e/plataforma.spec.ts:4` needs an API on :5226; passed on :8089 | PASS |
| C43 | no change in `api/` | exit 0 | `.specs/features/identidade-visual/checks.md:611` run as written | PASS |
| C44 | real fonts, request line, 2 reads | real e2e, passed | `web/e2e/identidade-real.spec.ts:115`, `:124-125`, `:150-151` | PASS |
| C45 | whole suite on the image, no other real spec edited | 199 passed | `.specs/features/identidade-visual/checks.md:629`; the feature's diff touches no real spec but `identidade-real.spec.ts` | PASS |
| C46 | 11 named tests pass without edit | layout and vitest, passed | `web/e2e/ux.spec.ts:109`, `:156`, `:230`, `:589`, `:379`, `:386`, `:1349`, `:565`; `web/src/ux.test.tsx:139`. The fix range edits none. These tests do not reach finding 1 | PASS |
| C47 | row focus 3:1, 2 px or more, 12 cases | layout, passed | `web/e2e/identidade.spec.ts:1118` espessura `toBeGreaterThanOrEqual(2)`; `:1119` contraste `toBeGreaterThanOrEqual(3)`; `:1112` control `toEqual([])`; `:1122` `medidas` 12. Measured by me 16.28 to 19.12:1. Precision note: finding 8 | PASS |
| C48 | "Responder" border 3:1, for student and staff, both brands, 3 themes, 390 and 1280 | layout, passed | `web/e2e/identidade.spec.ts:1139` `toBeGreaterThanOrEqual(3)`; `:1142` `medidas` 24. True of the code at rest, but the student member is not proven: `:1135` passes `papeis` only, and `web/e2e/simulada.ts:21` always sends `eventos`, so `web/src/chamados/ChamadoDetalhe.tsx:420` renders staff. Fault "border for staff only" survives | FAIL |
| C49 | no variation while a response is pending | vitest, passed | `web/src/indicadores/identidade.test.tsx:113` not in document for the 4 texts; `:132` `▲ 10,0 pts`; `:125` control | PASS |
| C50 | `semDados` with a number hides it | vitest, passed | `web/src/indicadores/identidade.test.tsx:143-144` absent and no alert; `:148` control `▲ 4,2 pts` | PASS |
| C51 | name between phrase and request | layout, passed | `web/e2e/identidade.spec.ts:1153-1155` the 3 `toBeGreaterThanOrEqual` | PASS |
| C52 | variation below the number at 360 | layout, passed | `web/e2e/identidade.spec.ts:1171` below; `:1172` `perto(v.x, n.x)`; `:1173` no horizontal overflow | PASS |
| C53 | empty date and precache | vitest and layout, passed | `web/src/indicadores/identidade.test.tsx:153-154` `toBeNull`; `:161-162` no `NaN`, 3 reads; `web/e2e/identidade.spec.ts:1192` other alphabets `toEqual([])`; `:1193-1194` 2 latin files | PASS |

### Edits to existing assertions, against the closed list

Verified at 4c83930.
- **Fix range:** no assertion edited. The only test files in `9e92f79..HEAD` are `web/e2e/identidade.spec.ts` (+123, -0) and `web/src/indicadores/identidade.test.tsx` (+61, -0).
- **Whole feature:** I diffed test bodies by script between `6d83112` and HEAD, then compared each changed name with the list. All 7 groups that were outside it in round 1 are now in item 9. The other changed names are in items 2 to 8, or are the artefacts round 1 identified (neighbouring comments or a moved helper).
- **One wording difference.** Item 8 says the column has no focusable element outside the form, while `painel de entrada sem foco e sem ícones` allows the screen's own link and asserts exactly which one. It is declared in the lot 1 Handoff, it is strict, and the literal wording could not hold because the link exists. Not a weakening.

## Coverage

Rows the fix touched are verified at 4c83930; the rest are carried from 6d907af, with round 1's three unproven members now proven.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| fields in the tinted reply block (3) | the form in `web/src/chamados/ChamadoDetalhe.tsx:113-118`, real API at `api/Chamados/Shared/DetalheChamado.cs:53` | `Textarea` C48 | "Resposta pronta" select: no proof, and no fixture renders it; attachments' dashed area, under 3:1 before this feature |
| "Responder" border: views (2) | `web/src/chamados/ChamadoDetalhe.tsx:420` | staff C48 | student: C48's `ALUNO` case renders staff. Measured on the real image at 5.1:1, no test |
| "Responder" border: themes (3), brands (2), widths (2) | C48 | all 12, faults killed for theme and width; brand by my measure (`102,103,105` against `104,102,102`) | - |
| "Responder" border: states (3) | `web/src/ui/textarea.tsx:9` | rest C48 | focus and error: no proof, and both wrong (finding 2) |
| question row focus: themes, brands, widths (12) | C47 | all, with control | - |
| Assistente items in order (5) | Screens | title then phrase C18; phrase, name, request, questions C51 | - |
| variation results (6) | AC 12, AC 13 | up, down, equal C24, C26; failure and null C25; `semDados` with a number C50 | - |
| variation in time (2) | Swept "concurrency" | new period pending, previous pending C49 | - |
| Indicadores widths and strings | P15 | beside at 390 and 1440 C27; below at 360 with both strings C52 | - |
| precache by alphabet | `web/vite.config.ts:35`, `api/wwwroot/assets` (9 woff2 files) | 7 excluded and 2 kept, C53, C8 | - |
| empty date (2) | `web/src/indicadores/Indicadores.tsx:204` | `de` and `ate` C53 | - |
| AC 22 invariants (6) | `plan.md:168` | 44 px, 16 px, tab bar, action colour, tints C46 | contrast on the tinted surface: the select (finding 1) |
| sans roles (7) | door 1, carried from 6d907af | C2, C3 | - |
| serif roles (5) | door 1, AC 2, carried from 6d907af | C4, C27, C11, C18, C16 | - |
| font files (3) | `web/package.json`, carried from 6d907af | C8, C1, C2, C44 | - |
| radius roles (9) | door 2, carried from 6d907af | C5, C6, C7, C22 | - |
| access screens x photo x widths | Screens, carried from 6d907af | C9 to C15 | - |
| Assistente states (15) | AC 8 to AC 11, carried from 6d907af | C17, C19, C20 | - |
| request states (5) | `web/src/chamado.ts:38-42`, carried from 6d907af | C20, C44 | - |
| previous period (3) | AC 12, carried from 6d907af | C23, C44 | - |
| empty states (8) | AC 18, carried from 6d907af | C35, C36 | - |
| removed illustrations (6), columns (7) | AC 19, carried from 6d907af | C31, C37, C38 | - |
| static blocks (3), titles (3), tinted (2) | AC 17, carried from 6d907af | C32, C33, C34 | - |

`Swept` rows that say "existing": carried from 6d907af (`web/src/indicadores/Indicadores.tsx` reaches `api/Indicadores/ConsultarIndicadores.cs:21`; `api/Chamados/ListarChamados.cs` filters `c.SolicitanteId == u.Id`). The concurrency row now cites C49 at `.specs/features/identidade-visual/checks.md:734`, and C49 does cover it.

## Faults injected

Run in a `git worktree` of HEAD inside the repo, with `node_modules` as a junction. Each fault: replace one literal (the driver stops if it does not occur exactly once), confirm `git diff --stat` shows it, rebuild if the proof is a layout one, run the one named test, restore with `git checkout`, record the error message.

**Each fault really ran.** The 8 proofs went green on the unmodified worktree first, and every failure below is that test's own assertion with a measured value, not a setup error. My first driver run stopped at a multi-line fault because the sources use CRLF; it stopped before applying anything, and I fixed it and ran those faults. The cap of five is exceeded on purpose, since the brief lists these. `mutator` suspended (AD-025).

| Mutation | Location | Killed |
| --- | --- | --- |
| ring removed | `web/src/assistente/Assistente.tsx:194` | yes - C47, "indicador de foco visível", 0 |
| app's ring, `ring-[3px] ring-ring/50` | `web/src/assistente/Assistente.tsx:194` | yes - C47, contrast 1.52 |
| ring of 1 px | `web/src/assistente/Assistente.tsx:194` | yes - C47, thickness 1 |
| ring always on, without focus | `web/src/assistente/Assistente.tsx:194` | yes - C47, "controle sem foco" |
| border class removed | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C48, 2.96 |
| border lost below `md` | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C48, 2.96 at 390 |
| border lost from `md` up | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C48, 2.96 at 1280 |
| weak border in dark only (`dark:border-border`) | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C48, 1.16 in dark |
| border only when `!equipe` | `web/src/chamados/ChamadoDetalhe.tsx:116` | yes - C48, but only because the `ALUNO` case renders staff, so this shows finding 3 too |
| border only when `equipe`, so the student loses it | `web/src/chamados/ChamadoDetalhe.tsx:116` | **no - C48 passes.** Recorded as finding 3 |
| `!provisorio` removed | `web/src/indicadores/Indicadores.tsx:220` | yes - C49, "período novo atrasado" |
| previous query with `keepPreviousData` | `web/src/indicadores/Indicadores.tsx:217` | yes - C49, "período anterior atrasado" |
| `semDados` guard removed | `web/src/indicadores/Indicadores.tsx:219` | yes - C50 |
| name line after the questions | `web/src/assistente/Assistente.tsx:212` | yes - C51 |
| name line before the phrase | `web/src/assistente/Assistente.tsx:212` | yes - C51 |
| name line after the request | `web/src/assistente/Assistente.tsx:212` | yes - C51 |
| request after the questions | `web/src/assistente/Assistente.tsx:216` | yes - C51 |
| `flex-wrap` removed from the variation | `web/src/indicadores/Indicadores.tsx:146` | yes - C52 |
| variation right-aligned when wrapped | `web/src/indicadores/Indicadores.tsx:146` | yes - C52, 103 px off |
| empty-date `return null` removed | `web/src/indicadores/Indicadores.tsx:204` | yes - C53, `NaN-NaN-NaN` |
| `\|\|` to `&&` in the guard | `web/src/indicadores/Indicadores.tsx:204` | yes - C53 |
| `globIgnores` removed | `web/vite.config.ts:35` | yes - C53, 9 extra URLs in the diff |
| `globIgnores` without `latin-ext` | `web/vite.config.ts:35` | yes - C53 |
| `globIgnores` that drops latin | `web/vite.config.ts:35` | yes - C53 |
| `globIgnores` without `cyrillic-ext` | `web/vite.config.ts:35` | equivalent, not a survivor: `*-cyrillic-*` also matches `-cyrillic-ext-`, so the manifest is identical and C53 is right to pass |

Real tree porcelain before and after: identical (`?? .idea/`, `?? .playwright-mcp/`, `?? web/apresentacao/`).

## Measured, for the questions in the brief

**`--ring` on the other controls (brief item 2). Pre-existing, not new.** I measured HEAD and a build of `6d83112`, with Tab, on the same controls. The base build had its Inter import stripped from `main.tsx` because that package is no longer in `node_modules`; that changes no colour. HEAD and base match to 2 decimals on the login controls and on `Consultar` and `De`; the ghost and icon buttons differ by at most 0.05, so the `Button` row holds within that.

| Control | Indicator | light, no colour | light, `#8a1538` | dark, no colour | dark, `#8a1538` | black, no colour | black, `#8a1538` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Button` (default, ghost, icon) | ring only, `ring-ring/50` | 1.52 | 2.77 | 1.88 | 2.46 | 1.85 | 2.40 |
| `Input` (CPF, De) | border | 2.50 | 9.02 | 3.98 | 6.31 | 4.43 | 7.00 |
| side menu | `ring-sidebar-ring`, 2 px | 2.48 | 2.48 | 4.15 | 4.15 | 4.43 | 4.43 |
| question row, base | as `Input` | 2.50 | 9.02 | 3.98 | 6.31 | 4.43 | 7.00 |
| question row, HEAD | `ring-foreground`, 2 px | 19.12 | 19.09 | 16.28 | 16.32 | 16.52 | 16.52 |

So every plain `Button` focus is under the 3:1 of §15 in all 6 combinations, and the builder's "2.5:1" is the border of a field; a borderless button is worse. It predates this feature, the feature did not change it, and only the question rows improved. It does not carry this FAIL, but §15 is unmet across the app and someone should decide on it.

**"Responder" border by state, HEAD against the same build without the class (brief item 3).** At `6d83112` the block had no tint and no class.

| Theme and colour | rest: before / HEAD | focus: before / HEAD | `aria-invalid`: before / HEAD |
| --- | --- | --- | --- |
| light, no colour | 2.96 / 5.10 | 2.33 / 2.33 | 4.29 / 4.29 |
| light, `#8a1538` | 2.95 / 5.10 | 8.36 / 8.36 | 4.26 / 4.26 |
| dark, no colour | 3.82 / 3.82 | 3.56 / 3.82, unchanged from rest | 5.84 / 3.82, not red |
| dark, `#8a1538` | 3.82 / 3.82 | 5.67 / 3.82, unchanged from rest | 5.89 / 3.82, not red |
| black, `#8a1538` | 4.08 / 4.08 | 6.05 / 4.08, unchanged from rest | 6.28 / 4.08, not red |

The 3 px ring on top stays at 1.48 to 2.71:1. `aria-invalid` is a latent case: nothing in `web/src/chamados` sets it today, I set it by hand.

**Does it look out of line?** Yes, moderately. In light, "Responder" at 5.1:1 sits under the select at 2.96:1, and the "Resolução" field further down keeps `--input` (that token gave 3.17:1 on the untinted background at base; I did not measure "Resolução" itself). In the captures it is the one dark box on the page. Fixing finding 1 will force a look at this anyway, since one treatment for both fields would line them up.

**`globIgnores` on the real image (brief item 5). Works.**
- The manifest has 12 entries, 2 of them fonts (`public-sans-latin`, `source-serif-4-latin`). Every entry is in the cache, with none missing. The cache holds 10 distinct paths.
- Online, a latin-ext name requests `public-sans-latin-ext-wght-normal-*.woff2` from the network, `200`.
- Offline, with latin-ext never requested before, in a fresh context with the real service worker: the document comes from the precache, the latin-ext face goes to `error`, the latin face stays `loaded`, the text renders with a fallback for those glyphs (width 182.6 against 181.3 px), and there are 0 page errors. Only an explicit `document.fonts.load()` rejects, and the app never calls it.
- With the latin-ext file blocked and the institution named "Uniwersytet Łódź Őrs", the login renders whole; "Ł" and "Ő" look slightly different from their neighbours.
- Separately, offline the login shows "Instituição não encontrada." with no form, for any failure of the institution read (`web/src/acesso/Acesso.tsx:164`). The same line exists at `6d83112`. Finding 7.

## Findings

Ranked. 1 to 3 carry the FAIL.

1. **"Resposta pronta" select under 3:1 on the tinted block.** `web/src/chamados/ChamadoDetalhe.tsx:55`, inside `:113`. Light: 2.96:1 (no colour), 2.95:1 (`#8a1538`), 2.92:1 (`#0b6e4f`). At `6d83112`: 3.17, 3.18, 3.14. AC 22 and §15. The fixture has no `setorId` (`web/e2e/simulada.ts:10`), so `useProntas` never runs in any layout test; the real API returns it (`api/Chamados/Shared/DetalheChamado.cs:53`), and I measured 2.96:1 on my image, as an administrator with a ready answer in the sector, at 390 and 1440. Same regression as round 1 finding 2, on the sibling field. No check.
2. **`dark:border-input` cancels focus and error in dark and black.** `web/src/chamados/ChamadoDetalhe.tsx:116`. New in `73b854e`. See the table above: with an institution colour, the focus border goes from 5.67 to 3.82:1 in dark and from 6.05 to 4.08:1 in black, equal to rest, so the only change on focus is a ring at 2.41 to 2.44:1. `.specs/features/revisao-ux/checks.md:635` says the border takes the focus colour; its test does not reach here. No check.
3. **C48 does not measure the student.** See C48 and the surviving fault. `web/e2e/identidade.spec.ts:1135` needs a chamado with `eventos: null` for `ALUNO`, and an assertion that only that view passes (no "Nota interna", say). The student's real value is fine: 5.1:1 at 390 and 1440 on my image.
4. **"Responder" focus at 2.33:1 in light without a colour.** Rest is 5.1:1, so taking focus lightens the field. `--ring` does this on every field (2.5:1 elsewhere), and the tint takes it to 2.33. C48 names no state, so this is a precision gap.
5. **Pre-existing: focus ring under 3:1 across the app.** See the table. Not this feature, no FAIL here, needs its own decision. One token (`--ring`) and the `/50` alpha in `web/src/ui/button.tsx:7` drive most of it.
6. **Docs residue.** `.specs/features/identidade-visual/checks.md:70` still says "logo abaixo do nome (P1)"; `:6` still says "46 checks" and "P1 a P14". Harmless.
7. **Pre-existing: offline reads as "Instituição não encontrada."** `web/src/acesso/Acesso.tsx:164`. The new precache does not change it. A student on a dead connection is told the institution does not exist.
8. **Small.**
   - C47 says "a mesma linha sem foco", and the control measures another row (`web/e2e/identidade.spec.ts:1112`). The rows share one class and the always-on fault is caught, so this is wording only.
   - With forced colours active, the row has `outline-style: none` and `box-shadow: none`, so no focus indicator (measured on the real image at 390 and 1440). `web/src/ui/button.tsx:7` carries the same `outline-none`, so the old pill very likely behaved the same; I did not measure the button. `outline-hidden` would fix it.
9. **Carried from 6d907af, unchanged:** `Planilha` labels scale to about 9.6 px at 390; "Atendimento ao estudante · / Univag" breaks with a hanging separator at 390 (seen again in my capture); `Math.round` asymmetry at ±1.95; the clipped chart label in `web/src/indicadores/Grafico.tsx:24`.

## Screens

Opened by eye at HEAD: question row focused (light with colour at 1440, dark at 390, real image at 1440), reply block in light, reply form at rest and focused, the real detail at 390, the real Indicadores at 390, the login with the latin-ext name. Captures in `D:\one-system\.playwright-mcp\identidade\verificador-r2\`. Round 1's 480-load sweep was not repeated, as briefed, and its visual judgment is carried from 6d907af.

## Gate

`python "C:/Users/Alfredo Neto/.claude/skills/tlc-spec-lean/scripts/validate_verification.py" identidade-visual`: exit 1 with one error, "verdict is FAIL". That is correct for this report.

Vitest 520 passed, 0 failed. Layout 190 passed, 1 environment failure that passes on the image. Real e2e 199 passed, 0 failed.

Cleaned up: preview servers on 5199, 5198 and 5197 by PID; container `one-verif-r2`, image `one-verif-r2:4c83930`, database `one_verif_r2`, bucket `one-verif-r2`; worktrees `.wt-r2` and `.wt-base` with their junctions (removed with `cmd /c rmdir` first; `web/node_modules` intact). Docker `api` on :8080 and `.env` untouched. Nothing committed. Lessons L-090 to L-092 added by `lessons.py`. Left on purpose: my captures under the untracked `.playwright-mcp/identidade/verificador-r2/`.
