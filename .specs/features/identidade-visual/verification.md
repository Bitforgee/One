# Identidade visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 6d83112..6d907af (HEAD)
**Round**: 1 - full
**Verifier**: fresh sub-agent with no inherited context (author != verifier); it wrote none of this code, fixed nothing and committed nothing

The feature does what it set out to do, and no check's proof is red. It fails on five things the suite cannot see:
1. **Focus regression.** The question rows of the Assistente lost the focus ring. The only indicator left is a background at 1.12 to 1.32:1, and `revisao-ux/pesquisa.md` §15 asks for 3:1.
2. **Contrast regression.** The new tinted reply form drops the field border to 2.92 to 2.96:1 in the light theme. AC 22 keeps contrast and `revisao-ux` asks for 3:1.
3. **Three surviving mutants.** One of them is the guard the orchestrator asked about: the variation hidden while the number is provisional. The code is right at HEAD (my probe), but no test holds it.
4. **Arrangement.** The variation is not "ao lado" at 360 px, nor at 390 px with "= sem variação". C27 sampled only the widest passing case.
5. **C40's second clause.** Three groups of edits sit outside the closed list. All are declared, and none weakens.

Proofs run at HEAD by me, one invocation per target:
- `cd web && npx vitest run`: 517 passed, 0 failed, 54 files.
- `npm --prefix web run build`: exit 0.
- `npm --prefix web run coverage`, then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. `dryer` with the C41 list: "No duplicate candidates found."
- Layout suite (the 8 specs of C42) against `npx vite preview --port 5199`: 185 passed, 1 failed. The failure is `plataforma.spec.ts:4` `manifesto e service worker`: expected 401, received 502, because that test needs an API on :5226. It passes on the real image, so I judge it an environment limit and not a defect.
- `git diff --quiet 6d83112 HEAD -- api api.Tests`: exit 0. Only `web/` and `.specs/` change.
- Real e2e: my own image `one-verif-identidade:6d907af` (`git archive HEAD | docker build`) on :8089, database `one_identidade_verif`, bucket `one-identidade-verif`, institution `e2e`: **194 passed, 0 failed, 0 flaky** on the first run in 6.7 min, including `identidade-real.spec.ts` (2) and `plataforma.spec.ts` `manifesto e service worker`.
- All 66 `Proof:` lines of `checks.md` resolved by script to a test that exists and passed in those JSON outputs: 0 missing.

`checks.md` has no `Test policy` section, so there are no rows to judge.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/identidade-visual/pesquisa.md` | yes, whole | none (see the divergences below) | - |
| `.specs/features/revisao-ux/pesquisa.md` | yes, whole | none | §15 "Bordas de campos, ícones e foco: 3:1": focus of the question row at 1.12-1.32:1 (`web/src/assistente/Assistente.tsx:194`); border of the reply field at 2.92-2.96:1 in light (`web/src/chamados/ChamadoDetalhe.tsx:113`). No check measures either |

Divergences from `pesquisa.md` that the plan decided on purpose, so they are not contradictions:
- The login items stay (Option A dropped them): `plan.md:52` keeps the Aparência fields.
- The photo sits beside the form instead of behind it: door 3.
- The title is "Atendimento ao estudante · …" instead of "Secretaria Acadêmica…": P10.
- There are no sparklines, clickable strip or question categories: `plan.md:173-174`.
- Conta keeps its border, against §2.1: P8.
- Status badges stay as pills and Fila rows stay at 0 px, against §2.2: P3, P4.

Per-screen enumeration against `plan.md` `## Screens`, copy and arrangement:

| Screen | Decided, reachable by a selector | Checks | Uncovered |
| --- | --- | --- | --- |
| Login without photo | column up to 400, logo up to 48 or initials, serif name 28, title and phrase secondary, helper above CPF, form, items with marker, tinted background, no panel | C9, C10, C11, C15 | - |
| Primeiro acesso, Criar senha | same column, no helper, screen title before the first field | C9, C12 | - |
| Login with photo | form left, photo full right column, no gradient, no text over it; 160 px strip below 1024 | C13, C14, C15 | - |
| Assistente without conversation | serif title 24 left, phrase below, photo 32 beside name, request line before questions with border in action colour, 48 px rows with divider and icons | C17 to C22 | order of the name line against the phrase and the request line: fault L13 survives |
| Indicadores | label, serif number 40, variation "ao lado" with "vs. período anterior", 3 highlights, 9 rows, 2 charts, order, no boxes | C23 to C30 | variation "ao lado" at 360 px with all 3 strings, and at 390 px with "= sem variação": it wraps below the number |
| Detalhe, Aparência, Conta | blocks without box at 32 px, section titles, tint only on summary and reply, Conta as it was | C5, C32, C33, C34 | - |
| Empty states | icon 28, title, phrase, button, centred | C35, C36 | - |
| Matrículas | `Planilha` in step 2, 7 columns in one row | C37, C38 | - |
| Raiz | "One" in serif, phrase, how to enter, no illustration | C16 | - |
| Prévia | login and welcome in the new arrangement | C39 | - |

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | only the 2 font packages, no Inter | vitest, passed | `web/src/identidade.test.tsx:14` `filter(startsWith('@fontsource'))` toEqual the 2 packages; `:18-19` not.toContain('inter') | PASS |
| C2 | both faces loaded, app origin only | layout, passed | `web/e2e/identidade.spec.ts:44-46` FontFace `loaded`, no Inter; `:52-55` woff2 URLs, no `inter-`, single origin | PASS |
| C3 | 7 sans roles at 390 and 1440 | layout, passed | `web/e2e/identidade.spec.ts:94` `expect(r.fora).toEqual([])`; `:116` at least 1 per type | PASS |
| C4 | serif only on allowed elements, 20 px or more | layout, passed | `web/e2e/identidade.spec.ts:141-144`; `:153` at least 1 on 5 screens | PASS |
| C5 | 23 radius measures | layout, passed | `web/e2e/identidade.spec.ts:171` `toEqual([e,e,e,e])`; `:177` pill; `:251` `medidas.length` 23 | PASS |
| C6 | pills only in the allowed set | layout, passed | `web/e2e/identidade.spec.ts:288-289`; `:297-298` | PASS |
| C7 | radius scale, no `--radius` | vitest, passed | `web/src/identidade.test.tsx:27` toEqual `[4, 6, 12, 16]` | PASS |
| C8 | latin fonts in precache, up to 90 KB, no Inter | layout, passed | `web/e2e/identidade.spec.ts:318-323` `toBeLessThanOrEqual(90 * 1024)`; measured 77 768 B. Precision gap: finding 8 | PASS |
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
| C23 | previous period, 3 cases, exactly 2 reads | vitest, passed | `web/src/indicadores/identidade.test.tsx:47`, `:51` exact URLs | PASS |
| C24 | up, down, equal | vitest, passed | `web/src/indicadores/identidade.test.tsx:64` `findByText(texto)` with `▲ 4,2 pts`, `▼ 1,0 pt`, `= sem variação` | PASS |
| C25 | no variation on failure or no data | vitest, passed | `web/src/indicadores/identidade.test.tsx:83-84` absent and no alert; `:90` control. The `semDados` case uses a null number: fault F4e survives | PASS |
| C26 | rounding and plural | vitest, passed | `web/src/indicadores/identidade.test.tsx:99` with `= sem variação`, `▲ 1,9 pt`, `▲ 2,0 pts` | PASS |
| C27 | serif 40, variation beside, at 390 and 1440 | layout, passed | `web/e2e/identidade.spec.ts:762-770`, `:774-775`. True as written, but narrower than `## Screens`: finding 5 | PASS |
| C28 | strip by `main` width, 4 cases | layout, passed | `web/e2e/identidade.spec.ts:785`, `:788`, `:794`, `:800` | PASS |
| C29 | 9 rows, 2 or 1 columns | layout, passed | `web/e2e/identidade.spec.ts:831`, `:834-837`, `:843-844`, `:847` | PASS |
| C30 | charts without card, with title | layout, passed | `web/e2e/identidade.spec.ts:862`, `:865`, `:868` | PASS |
| C31 | only `Planilha` | vitest, passed | `web/src/identidade.test.tsx:41`, `:43`; `web/src/ilustracoes/ilustracoes.test.tsx:18` | PASS |
| C32 | Aparência without box, 32 px | layout, passed | `web/e2e/identidade.spec.ts:892-893`, `:895`, `:898` | PASS |
| C33 | Dados do aluno, Histórico | layout, passed | `web/e2e/identidade.spec.ts:923`, `:926`, `:930-931`, `:936` | PASS |
| C34 | no box, tint only on action, 32 px | layout, passed | `web/e2e/identidade.spec.ts:950-951`, `:958-959`, `:966` | PASS |
| C35 | empty states, 8 cases | vitest, passed | `web/src/tabela.test.tsx:52-56`; `web/src/indicadores/identidade.test.tsx:110` | PASS |
| C36 | icon 28 centred, 16 measures | layout, passed | `web/e2e/identidade.spec.ts:1009-1012`, `:1014-1016`, `:1018`, `:1030` | PASS |
| C37 | `Planilha` in step 2 | vitest, passed | `web/src/administracao/identidade.test.tsx:40` text toEqual the CSV header | PASS |
| C38 | 7 columns in a row | layout, passed | `web/e2e/identidade.spec.ts:1041`, `:1044`, `:1050-1051` | PASS |
| C39 | preview | vitest and layout, passed | `web/src/administracao/identidade.test.tsx:60`, `:65`; `web/e2e/identidade.spec.ts:1064`, `:1070`, `:1072` | PASS |
| C40 | suite and build pass; edits only from the closed list | vitest 517, build 0 | `.specs/features/identidade-visual/checks.md:32` against `:743`. The second clause is false as written: 3 groups outside the list (see Edits below) | FAIL |
| C41 | crapper and dryer | exit 0; "No duplicate candidates found." | `.specs/features/identidade-visual/checks.md:591-592` run as written | PASS |
| C42 | layout suite whole | 185 of 186 on preview; the other passes on the image | `web/e2e/plataforma.spec.ts:4` needs an API on :5226; passed on :8089 | PASS |
| C43 | no change in `api/` | exit 0 | `.specs/features/identidade-visual/checks.md:601` run as written | PASS |
| C44 | real fonts, request line, 2 reads | real e2e, passed | `web/e2e/identidade-real.spec.ts:115`, `:124-125`, `:150-151` | PASS |
| C45 | whole suite on the image, no other real spec edited | 194 passed | `.specs/features/identidade-visual/checks.md:619`; the diff touches no real spec but `identidade-real.spec.ts` | PASS |
| C46 | 11 named tests pass without edit | layout and vitest, passed | `web/e2e/ux.spec.ts:109`, `:156`, `:230`, `:589`, `:379`, `:386`, `:1349`, `:565`; `web/src/ux.test.tsx:139`. Bodies compared with `6d83112`: unchanged. These tests do not reach finding 1 or 2 | PASS |

### Edits to existing assertions, against the closed list

I diffed every test body between `6d83112` and HEAD by script, in 14 existing test files. Most of the "changed" hits outside the list are artefacts of a neighbouring removal (comments and moved helpers): `ícones centralizados na barra recolhida`, `texto com 4,5:1…`, `erro do CPF abaixo do campo a 360`, `prévia clara pinta a cor digitada`, `login mostra o nome da instituição`, `neutros tingidos pela marca nos três temas`. Their assertions did not change.

Outside the closed list, or wider than its wording:

| Edit | Listed | Judgment |
| --- | --- | --- |
| `arranjo.spec` `quebras medidas dos dois lados` | no, declared in the Handoff (a) | only follows the arrangement: same limits (150 and 250 px, value 24 px), now on the strip item. At 360 px the 150 limit is now easy, since the item spans one column |
| `indicadores.test` `ranking…` (3 tests) and `revisao.test` `Ver tabela de %s` | no, declared (b) | only follows: `closest('[data-slot=card]')` to `closest('section')`, same assertions |
| `indicadores.test` `cartões formatam…`: count of reads from 1 to 2 | the list says "só os localizadores"; declared | follows AC 12; stricter, not weaker |
| `ux.spec` `detalhe da Fila em texto corrido no celular` | no, declared (c) | only the fixture: dates from the test's clock, assertion intact. It was a time bomb that failed at `6d83112` |
| `celular.spec` `Indicadores sem texto cortado`: scope `[class*="container/main"] *` | the list says `main *`; declared | does not weaken against `6d83112` (a superset of the old cards); it leaves out the top bar, whose title truncates by design |
| `ux.spec` `no máximo 4 tamanhos…`: 28 px also on Primeiro acesso, Criar senha and Raiz; 40 px on any element of Indicadores | the list says Login, and the main number; declared in lot 1 | Primeiro acesso and Criar senha are forced by C12; Raiz is the builder's choice. The 40 px exception is wider than the list says. Slight widening, harmless |
| `arranjo.spec` `bloco do formulário por largura`: loses the vertical centre | named test, part not named; declared | a real loss of one assertion. C9 says the plan does not fix the vertical, so acceptable. The code still centres (`web/src/acesso/Acesso.tsx:105`) |

No edit weakens a guarantee of `revisao-ux` or `aparencia-instituicao` that the plan keeps. Nothing undeclared turned up.

## Coverage

Recomputed from the authority of each set, not from the `Coverage` table of `checks.md`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| sans roles (7) | door 1 | body C2, C3; button, field, cell, badge, menu, top bar C3 | - |
| serif roles (5) | door 1, AC 2 | C4, C27, C11, C18, C16; my sweep found serif only on these and on the preview copies | - |
| font files (3) | `web/package.json`, `api/wwwroot/assets` | Public Sans and Source Serif latin C8; no Inter C1, C2, C8, C44 | - |
| radius roles (9) | door 2 | C5, C6, C7, C22 | - |
| access screens × photo × widths | Screens | C9 to C15 | - |
| Assistente states (15) | AC 8 to AC 11 | C17, C19, C20 table-driven | - |
| Assistente items in order (5) | Screens: title, phrase, name, request, questions | title then phrase C18; request then questions C20, C21 | position of the name line (L13 survives) |
| request states (5) | `web/src/chamado.ts:38-42` | ABERTO, EM_ATENDIMENTO, AGUARDANDO_ALUNO, RESOLVIDO, FECHADO C20; most recent C20; failure C20; real C44 | - |
| variation results (6) | AC 12, AC 13 | up, down, equal C24, C26; failure and null C25 | `semDados` with a number present (F4e survives) |
| variation in time (2) | Swept "concurrency", orchestrator item 3 | none | the number still provisional (F4d survives). Correct at HEAD by my probe, no test |
| previous period (3) | AC 12 | C23, C44 | - |
| Indicadores widths and strings | Screens: "ao lado" | 390 and 1440 with "▲ 4,2 pts" C27 | 360 with all strings, 390 with "= sem variação": measured not beside |
| empty states (8) | AC 18 | C35, C36 | - |
| removed illustrations (6) and columns (7) | AC 19 | C31, C37, C38 | - |
| static blocks (3), titles (3), tinted (2) | AC 17 | C32, C33, C34 | - |
| AC 22 invariants (6) | `plan.md:167` | 44 px, 16 px, tab bar, action colour, tints C46 | contrast on the new tinted surface: C46 measures field borders only inside a `Dialog` (`web/e2e/ux.spec.ts:208`) |

`Swept` rows that say "existing", read against the code:
- `web/src/indicadores/Indicadores.tsx` reaches `api/Indicadores/ConsultarIndicadores.cs:21` (`403` out of role).
- `api/Chamados/ListarChamados.cs` filters `c.SolicitanteId == u.Id`, so `escopo=meus` returns only the session's requests.

Both constraints are there.

## Faults injected

Run in a `git worktree` of HEAD inside the repo, with `node_modules` as a junction, baseline green (33 tests). My first Vitest round was invalid (the junction failed, so everything "failed") and my first layout batch was contaminated by a half-applied fault. Both were discarded and rerun clean; only clean runs are below. The cap of five is exceeded on purpose, since the brief asks for one per slice and these reach distinct assertions.

| Slice | Mutation | Location | Killed |
| --- | --- | --- | --- |
| S1 | `--radius-md` 12 to 10 | `web/src/index.css` | yes - C7 |
| S1 | `opsz.css` of the serif | `web/src/main.tsx:6` | yes - C1 |
| S1 | serif on `Button` | `web/src/ui/button.tsx:7` | yes - C3, "Login a 390" |
| S2 | login title ignores Aparência | `web/src/acesso/Acesso.tsx` `Textos` | yes - C15 |
| S2 | photo strip 160 to 128 | `web/src/acesso/Acesso.tsx` `Entrada` | yes - C14 |
| S2 | column 400 to 440 | `web/src/acesso/Acesso.tsx` `Entrada` | yes - C9 |
| S2 | list without marker | `web/src/acesso/Acesso.tsx` `ListaDeItens` | yes - C11 |
| S3 | `EmAberto` without `AGUARDANDO_ALUNO` | `web/src/assistente/Assistente.tsx:172` | yes - C20 |
| S3 | `EmAberto` with `RESOLVIDO` | `web/src/assistente/Assistente.tsx:172` | yes - C20 |
| S3 | oldest instead of most recent | `web/src/assistente/Assistente.tsx:178` | yes - C20 |
| S3 | `boasVindas` ignored | `web/src/assistente/Assistente.tsx` `BoasVindas` | yes - C17 |
| S3 | request border without action colour | `web/src/assistente/Assistente.tsx` `SolicitacaoEmAberto` | yes - C21 |
| S3 | question row 48 to 40 | `web/src/assistente/Assistente.tsx:194` | yes - C22 |
| S3 | L13: name line moved below the questions | `web/src/assistente/Assistente.tsx` `BoasVindas` | no - 79 Vitest and 12 layout tests pass |
| S4 | previous period ends on `de` | `web/src/indicadores/Indicadores.tsx:207` | yes - C23 |
| S4 | `<= 2` for pt/pts | `web/src/indicadores/Indicadores.tsx:138` | yes - C26 |
| S4 | up and down arrows swapped | `web/src/indicadores/Indicadores.tsx:138` | yes - C24 |
| S4 | failure of the previous query throws | `web/src/indicadores/Indicadores.tsx:213` | yes - C25 |
| S4 | F4d: `!provisorio` removed | `web/src/indicadores/Indicadores.tsx:219` | no - all 22 tests of `src/indicadores` pass |
| S4 | F4e: `semDados` guard removed | `web/src/indicadores/Indicadores.tsx:218` | no - C25 passes |
| S4 | strip by window instead of `main` | `web/src/indicadores/Indicadores.tsx:172` | yes - C28, "janela de 1071" |
| S4 | main number 40 to 36 | `web/src/indicadores/Indicadores.tsx:147` | yes - C27 |
| S4 | list row with 4 borders | `web/src/indicadores/Indicadores.tsx:185` | yes - C29 |
| S5 | `Planilha` loses `semestre` | `web/src/ilustracoes/index.tsx:3` | yes - C37 |
| S5 | empty icon 28 to 24 | `web/src/Tabela.tsx:23` | yes - C36 |
| S5 | detail gap 32 to 24 | `web/src/chamados/ChamadoDetalhe.tsx` | yes - C34 |
| S5 | Histórico gets a background | `web/src/chamados/Conversa.tsx` | yes - C33 |

Real tree porcelain before and after: identical (`?? .idea/`, `?? .playwright-mcp/`, `?? web/apresentacao/`). `mutator` suspended (AD-025).

## Findings

Ranked. 1 to 7 carry the FAIL.

1. **Question rows have no visible keyboard focus.** `web/src/assistente/Assistente.tsx:194` has `focus-visible:outline-none focus-visible:bg-accent`. Measured `--accent` against `--background`: 1.12 and 1.13:1 in light, 1.21 and 1.23:1 in dark, 1.31 and 1.32:1 in black. The old pill was a `Button` with a 3 px ring, so this is a regression on the student's main control. Binding: `revisao-ux/pesquisa.md` §15. No check. Capture: `D:\one-system\.playwright-mcp\identidade\verificador\foco-pergunta-1440.png`.
2. **The reply field lost its 3:1 border.** `web/src/chamados/ChamadoDetalhe.tsx:113` adds `bg-muted`. The "Responder" `Textarea` border measures 2.96:1 (no colour), 2.95:1 (`#8a1538`), 2.92:1 (`#0b6e4f`) in light, at all 5 widths, for student and staff. Dark and black pass. AC 22 is violated, and `ux.spec.ts:208` is green because it measures only inside a `Dialog`.
3. **F4d survives: nothing proves the variation stays hidden while a number is provisional.** The code is right. Delaying each response 1.5 s after "Consultar", the screen goes `71,2%` without variation, then `50%` with `▲ 10,0 pts`; with the previous period slow it goes `71,2%`, `50%` without variation, then the same result. It never shows a wrong number. But removing `!provisorio` passes every test, and `checks.md` `Swept` claims C25 covers this, when C25 covers only a missing response.
4. **L13 survives: the assistant's name line can sit anywhere.** `## Screens` orders it between the phrase and the request.
5. **The variation is not "ao lado" on narrow phones.** `web/src/indicadores/Indicadores.tsx:146` has `flex-wrap`. Number 116 px, "▲ 4,2 pts vs. período anterior" 219 px, "= sem variação vs. período anterior" 257 px: it wraps below at 320 and 360 px with all strings, and at 390 px with "= sem variação". It reads fine. Either the arrangement or the sentence in `## Screens` has to change; the second is the cheap one.
6. **F4e survives.** C25's `semDados` case has a null number, so the guard at `Indicadores.tsx:218` is unproven. `semDados` means no conversations in `api/Indicadores/CalculoIndicadores.cs:44`, so it is probably redundant with the real API (I did not trace the number's formula). Add a case or delete the guard.
7. **C40's second clause is false as written.** See Edits above. None weakens; the orchestrator should extend the closed list.
8. **Precache holds 9 font files, not 2.** `web/vite.config.ts:33` globs every `woff2`: 234 480 B (229 KB), against 77 768 B (75.9 KB) for the 2 latin files that AC 4 and C8 measure. The student's PWA downloads Cyrillic, Greek, Vietnamese and latin-ext that it never uses. No Inter anywhere. AC 4 is met as worded; this is a precision gap and an easy `globIgnores`.
9. **Empty date sends garbage.** With "De" cleared, the browser asks `?de=NaN-NaN-NaN&ate=NaN-NaN-NaN`: `Indicadores.tsx:207` tests `dias < 1`, which is false for `NaN`. Nothing crashes and the user sees no extra effect, but it is a new malformed request.
10. **Plan and checks disagree with themselves on the helper text.** `plan.md:71` and `:138` and `checks.md:132`, `:653` and `:670` still say "logo abaixo do nome", while `## Screens` item 4 and C10 say above CPF, as the orchestrator changed it. The code follows the latter.
11. **Small.**
    - `Planilha` labels compute 14 px, but the viewBox scales them to about 9.6 px at 390 (`web/src/ilustracoes/index.tsx:9`, `:16`), and the suite reads 14. They are decorative and repeated in the text above.
    - At 390 the title breaks as "Atendimento ao estudante · / Univag", with the separator left hanging.
    - `Math.round` makes ±1.95 points read "▲ 2,0 pts" and "▼ 1,9 pt".
12. **Pre-existing, not this feature.** A chart label is clipped ("ecretaria > Declarações") at 360 and 1024 px. `web/src/indicadores/Grafico.tsx:24` is not in the diff, and `celular.spec` skips SVG.

### The orchestrator's questions

1. Assertions: see Edits above.
2. Invariants: my own sweep covered 480 page loads: 14 screens × 360, 390, 768, 1024, 1440 × light, dark, black × without and with appearance, plus a second institution (`#0b6e4f`) at 390 and 1440 in light and dark, and the login with photo.
   - Horizontal overflow: 0. Gradients: 0. Fields under 16 px below 768: 0.
   - Text under 4.5:1: 0. Field borders under 3:1: only finding 2.
   - Tab bar, action colour and tints: C46 green, and the second institution's colour reaches the send button and the request border in the capture I opened (`assistente-1440-dark-outra.png`); `neutros mudam com a cor da instituição` covers the neutrals.
   - Under 44 px: only the 16×16 "Nota interna" and "Aguardando aluno" checkboxes, which this diff does not touch.
   - Aparência fields applied: C15, C17, C19, C22, C39, and `aparencia-real.spec` on the image.
3. Variation: correct. March 2026 gives 29/01 to 28/02, one day gives the day before, and 0,0 gives "= sem variação"; -0 compares equal to 0. A failing previous query, `semDados` and a null number all hide it without an alert. Empty and inverted cases: inverted sends only the current query; empty is finding 9. See finding 3 for loading.
4. Open request: correct by C20 and on the real image, and by reading `Assistente.tsx:172-178`. The query does not retry (`web/src/App.tsx:27`), and a failure renders nothing.
5. Fonts: no Inter in `web/package.json`, `main.tsx`, `index.css`, `sw.js` or the assets. Latin pair 75.9 KB. See finding 8. Serif in my sweep: only `h1` 28, `h2` 24, the number at 40 and the preview's 2 `p` at 20; 0 inside a button, link, field, cell, badge, menu item, top bar or nav.

### Screens, before and after

Compared `lote1` and `lote2`; my captures are in `D:\one-system\.playwright-mcp\identidade\verificador\` (426 PNG; logo and photos are the app icon, as the fixture has no photos). I opened 13 of them by eye and 12 of the builder's; the other captures were judged only by the sweep's metrics.

- **Clearly better.** Indicadores has a real hierarchy now. The Assistente opens like an institution's service desk, and on the phone the request line and the 4 rows fill the screen well. The detail page reads as one document with 2 tinted blocks. The login lost the `login-02` silhouette.
- **No worse, but weak.** The login stacks 3 lines of secondary text before the first field (title, phrase, "Entre com seu CPF e sua senha."). The bulleted items below read as unstyled HTML, especially with short items like "Boletos / Matrícula / Documentos". Without a photo, at 1440 it is a small column on a blank page: honest but bare. "Indicador principal" says nothing until the small print below it.
- **Worse.** Only findings 1 and 2.

**How much it still looks AI or template-made: 4 of 10** (0 = no trace, 10 = stock template). The screens this feature touched no longer read as a template: the serif, the absence of a card grid and pills, and the real request line did that. What still gives it away is the shell, which appears on every authenticated screen:
- the stock shadcn sidebar (groups, icon plus label, collapse toggle, user card with chevrons, sun icon in the top bar);
- the chat composer with its big rounded box and round send button;
- tables in a rounded box;
- default Recharts bars;
- ghost "Ver tabela" buttons;
- the long single-column Aparência form.

Someone who knows shadcn recognises it within seconds of logging in. A student on the phone mostly would not. A sidebar and top bar pass would do more than any other single change.

## Gate

`python "C:/Users/Alfredo Neto/.claude/skills/tlc-spec-lean/scripts/validate_verification.py" identidade-visual`: exit 1 with one error, "verdict is FAIL". That is correct for this report.

Vitest 517 passed, 0 failed. Layout 185 passed, 1 environment failure that passes on the image. Real e2e 194 passed, 0 failed.

Cleaned up: preview servers on 5199 and 5198, container `one-identidade-verif`, image `one-verif-identidade:6d907af`, database `one_identidade_verif`, bucket `one-identidade-verif`, the worktree and its junction (removed with `cmd /c rmdir` first; `web/node_modules` intact). Docker `api` on :8080 and `.env` untouched. Nothing committed. Left on purpose: my captures under the untracked `.playwright-mcp/identidade/verificador/`.
