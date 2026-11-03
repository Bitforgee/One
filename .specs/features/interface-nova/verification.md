# Interface nova verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 9eea6e0..95b2383 (fix: 43f55fb web, b508690 + 95b2383 docs); round 1 covered b2e7e79..1d0753f
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier); proofs run in a detached worktree at 95b2383, e2e against a container built from it (`one-ui-verify2`, port 8083); e2e faults run against a Vite dev server of the same worktree (port 5199; the arranjo spec was green there first, 28/28)

## Ranked gaps

1. **The bar link counts the user ruled (5 from 1280 px, 7 from 1536 px) have no assertion, and a mutant that breaks them survives.** The plan note on `## Screens` row 0 and the C19 ruling both fix "3 links desde 1024 px, 5 desde 1280 px, 7 desde 1536 px". `e2e/arranjo.spec.ts:157` only asserts `naBarra.length >= 3`, and the C19 test (`:85`) only checks the 3 links at 1024 px. Fault F11 (`NaBarra` capped at 3 entries, everything else always in "Mais") leaves C19 and all 4 `barra a ... px` tests green, even though the live bar shows 3 links at 1280 and at 1920 px. No test runs at 1536 px. Minor in effect, because every link stays reachable with no overlap. But a surviving mutant on a fact a binding source decides is a FAIL. Fix: assert `naBarra.length` equals 3, 5 and 7 at 1024, 1280 and 1920 (or 1536) px for the 9-link user.
2. **C7 (mutator, AC 8, door 4) is not proven.** It is suspended by user decision (AD-025), not passed, and it was not run.

Every round 1 gap except C7 is closed (see the tables below): the header overlap, the hidden labels, the arrangement facts with no check, the 8 icons, the F5 survivor (C90) and the F7a survivor (C48). The stale path list in C6 is substantively covered: `dryer` over all 19 root files finds no candidate. C6/C7's frozen text is unchanged, as `checks.md` Handoff records.

## Binding sources

Step 1 was redone only for the screens the fix touched: row 0, plus the screens whose arrangement got new tests. Verified at 95b2383.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `## Screens` row 0 cabeçalho + note of 02/11/2026 (plan.md:144) and the C19 ruling (checks.md Handoff) | yes - live UI with the 3-role fixture at 360/768/1024/1280/1536/1920 px, plus 1-role and 2-role sets at 1024/1280/1536 | none | bar counts 5 at 1280 px and 7 at 1536 px (gap 1, F11 survived) |
| `## Screens` rows 1, 2, 6, 9, 10, 11, 13, 14, 15 (new arrangement tests) | yes - new tests read against the rows; spot-checked by fault F8-F10 | none | - |
| `## Visual` icons (plan.md:100-133) | yes - 8 previously unasserted icons now in `*/icones.test.tsx` | none | - |
| other rows, tokens, AD-020 | carried from 1d0753f (round 1), not touched by the fix | none | - |

Live header with the 3-role fixture user (ALUNO+ATENDENTE+ADMINISTRADOR, 9 links), container `one-ui-verify2`:

| Width | Bar (height 56 px every width) | In "Mais" | Overlap | Institution width | No horizontal scroll |
| --- | --- | --- | --- | --- | --- |
| 360 | One, institution, Tema, Menu; drawer has 9 links + Sair | - | none | 189 px | yes |
| 768 | same, drawer 10 items | - | none | 597 px | yes |
| 1024 | Assistente, Minhas solicitações, Fila (labels 69/130/24 px), Mais, Tema, Sair | 6 | none | 416 px | yes |
| 1280 | + Artigos, Documentos (5 links) | 4 | none | 329 px | yes |
| 1536 | + Indicadores, Usuários (7 links) | Matrículas, Cadastros | none | 109 px (truncated) | yes |
| 1920 | same as 1536 (container capped at `max-w-6xl`) | Matrículas, Cadastros | none | 109 px | yes |

No link is missing from both the bar and "Mais" at any width. Other role sets: ALUNO alone and ATENDENTE alone show 2 links with no "Mais". ADMINISTRADOR alone shows 3, 5 and 6 links at 1024, 1280 and 1536 px, with the rest in "Mais", which is hidden at 1536. ATENDENTE+ADMINISTRADOR shows 3, 5 and 7, with "Mais" hidden at 1536. The 1280 px screenshot matches the ruling: names always visible, "Mais" opens a popover with icon+label rows, and Tema and Sair sit on the right.

## Checks

Proofs re-run in full at 95b2383: Vitest 168/168, e2e 44/44, plus every script and barrier. The rows below are the checks the fix touched or that were not PASS in round 1, and they are verified at 95b2383. Every other check (C8-C16, C20-C26, C28-C37, C39-C43, C45-C47, C49-C65, C67-C79, C81-C88, C91-C94) is **carried from 1d0753f**. Their evidence lines did not change: the fix touched no file they cite except `arranjo.spec.ts`, where the line numbers before line 81 are unchanged. Their proofs are green in the two full runs above.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | whole Vitest and e2e suites green, no `.skip`/`.only` | `npx vitest run` 168/168 (JSON: 0 failed, 0 pending); `npx playwright test` 44/44 at :8083 | `.specs/features/interface-nova/seletores_conferem.py:90` (autotest kills an added `.only(`) | PASS |
| C2 | `seletores_conferem.py b2e7e79` exit 0 | autotest ok; `b2e7e79` exit 0, 0 problems | `.specs/features/interface-nova/seletores_conferem.py:116` | PASS |
| C3 | role queries preserved | autotest ok; `b2e7e79` exit 0, 389 queries, 0 problems | `.specs/features/interface-nova/consultas_preservadas.py:78` | PASS |
| C4 | same calls base vs HEAD | autotest ok; `b2e7e79` exit 0, 99 tests, 90 distinct recordings, 0 problems (3 Bootstrap packages `--no-save`, `npm prune` after, 0 left) | `.specs/features/interface-nova/chamadas_iguais.py:136` | PASS |
| C5 | crapper <= 9.99 over `src` | `npm run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` exit 0 | `web/src/Periodo.tsx:1` worst CRAP 8.1 | PASS |
| C6 | dryer finds no candidate | door-4 command: "No duplicate candidates found"; rerun with all 19 root `*.ts(x)`: same | `web/src/Autenticado.tsx:1` (changed file is in the door-4 list) | PASS |
| C7 | mutator over the slices | not run - AD-025 | `.specs/features/interface-nova/mutator_web.sh:13` | suspended by user decision (AD-025) - not proven |
| C17 | header icons + Visual icons | `src/*/icones.test.tsx` 6 files, 7 tests passed | `web/src/acesso/icones.test.tsx:15` `lucide-sun`, `:17` `lucide-moon` · `web/src/assistente/icones.test.tsx:13-15` send/hand/shield-alert · `web/src/chamados/icones.test.tsx:14` paperclip · `web/src/conhecimento/icones.test.tsx:16,19` plus/calendar-days · `web/src/administracao/icones.test.tsx:14,19` plus · `web/src/indicadores/icones.test.tsx:14` calendar-days | PASS |
| C18 | 360 px bar, 56 px, drawer | `arranjo.spec.ts` C18 tests + `cabeçalho a 360 px: marca e instituição...` passed | `web/e2e/arranjo.spec.ts:63` 56 px · `:529-534` One < institution < Tema < Menu, Tema and Menu right of centre · `:539` drawer anchored at the bottom | PASS |
| C19 | read by the 02/11 ruling: drawer below 1024, bar from 1024, rest in "Mais" | frozen `-g "cabeçalho a 640 px..."` selects 0 tests (renamed by the ruling); ruled proofs `cabeçalho a 1024 px mostra os links na barra` + 4 `barra a ... px` passed (5/5) | `web/e2e/arranjo.spec.ts:92` Menu hidden at 1024 · `:100` Sair right of links · `:104` no link at 1023 · `:135` no pairwise overlap · `:148` label width > 10 · `:155` every other link in "Mais" | PASS (by the ruling; counts 5/7 unasserted - gap 1) |
| C27 | header texts incl. "Mais" | `src/acesso/textos.test.tsx` passed | `web/src/acesso/textos.test.tsx:8` literal list now has `'Mais'` | PASS |
| C38 | Assistente arrangement | `Assistente: data pequena à direita...` passed | `web/e2e/arranjo.spec.ts:574` rows 2 · `:584` `textAlign` `end` · `:591` error Alert below Enviar | PASS |
| C44 | Detalhe arrangement | `Detalhe: cartão da equipe...` passed; `Histórico é uma lista ordenada` passed | `web/e2e/arranjo.spec.ts:602` team card above the conversation · `:613` actions wrap to >1 row · `web/src/chamados/icones.test.tsx:27` `OL` | PASS |
| C48 | 13 cards in 2/4 equal columns | `indicadores em 2 e 4 colunas` passed | `web/e2e/arranjo.spec.ts:318` widths within 1 px | PASS |
| C66 | screens 1-5 arrangement | `raiz com a marca...`, `Login: campos empilhados...` passed | `web/e2e/arranjo.spec.ts:547` centred · `:565` error Alert below Entrar | PASS |
| C80 | Artigos/Documentos arrangement, dialogs | `botões pequenos em linha...`, `diálogos a 360 px com margem de 16 px` passed | `web/e2e/arranjo.spec.ts:629-630` same row, <= 36 px · `:642` x = 16 | PASS |
| C89 | Usuários/Matrículas/Cadastros arrangement | `Matrículas: cabeçalho mono...`, `Cadastros: detalhe pequeno...` passed | `web/e2e/arranjo.spec.ts:653` mono · `:670` result Alert below Importar · `:682` reason wraps · `:695` detail smaller than name | PASS |
| C90 | no file imports Bootstrap packages | `dependências do kit de interface` passed; `interface.test.ts` passed | `web/src/acesso/acesso.test.tsx:126` - `expect(...filter(... importa.test(texto))...).toEqual([])` | PASS |

The only assertion lines the fix changed or removed (`git diff 9eea6e0..95b2383` on test files) are these:

- The C19 test, renamed and re-measured by the user's ruling.
- The "Menu" `toBeHidden` line, moved earlier in the same test.
- The C27 `Cabecalho` literal list, which gained `'Mais'`.
- The `simulada.ts` fixture, which gained the `assumir`, `confirmar` and `cancelar` actions.

Every other change adds lines, and C2, C3 and C4 run clean against b2e7e79.

## Coverage

Recomputed only for the rows the fix touched; the rest is carried from 1d0753f.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Screens arrangement facts (16 screens) | plan.md `## Screens` Arranjo column + the row 0 note, enumerated | round 1 gap-3 facts now: row 0 C18 `:521`; row 1/2 C66; row 6 C38; row 9 C44; rows 10/11/13 C80/C89; row 14/15 C89; dialogs C80 | row 0 note: 5 links from 1280 px, 7 from 1536 px (gap 1) |
| header widths (ruling) | the row 0 note and C19 ruling: 1023/1024 edge, 768/1024/1280/1920 | C19 `:85`; `barra a ... px` x4 | 1536 px not run by any test (live: 7 links, no overlap) |
| Lucide icons (18 Visual + CalendarDays) | plan.md `## Visual`, rows 10, 12 | 11 header C17 (acesso.test.tsx); Send, Hand, ShieldAlert, Paperclip, Plus, Sun, Moon, CalendarDays in `*/icones.test.tsx`; FileText, BookText C40 | - |
| new texts (18 with "Mais") | `## Screens` *(novo)* marks + the row 0 note | "Mais" C27 and the e2e `barra` tests | - |
| plan criteria (61) | carried from 1d0753f | AC 4 for row 0 now holds at every width (labels never hidden) | AC 8 (C7 suspended, AD-025) |
| AD-018 barriers (3) | door 4 | crapper C5, dryer C6 (also over all 19 root files) | mutator C7 (suspended by user decision) |
| all other sets | carried from 1d0753f | unchanged | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Arranjo e medidas da tela | all 15 screens + header | Playwright, every arrangement fact measured | not met - the bar counts 5/7 from the ruling are not measured (F11 survived); every round 1 gap-3 fact is now measured |
| Regra sobre código-fonte | `test/interface.test.ts`, `acesso.test.tsx` | one case per member | yes - C90's import half now sits in its named proof (`acesso.test.tsx:126`, F1 killed) |
| Tela que decide; Saída do build; Código copiado para `ui/` | carried from 1d0753f | as round 1 | yes - re-run green: `ui_isolada.sh` 0, `precache_completo` 17 URLs 0 problems, `recharts_separado` 0 problems, both autotests ok, crapper 0 |

## Faults injected

Every fault ran in the scratch worktree, one at a time, and was reverted with `git checkout -- <file>`. `git status --porcelain` in the worktree was empty after each fault, and the real tree's porcelain matches its baseline. The Vitest faults ran under `npx vitest run <file> -t`, and each filter selects 1 passing test at baseline. The e2e faults ran under `playwright test -g` against the dev server. The mutator is suspended (AD-025) and was not run.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (round 1 F5 re-injected) `import 'bootstrap-icons/font/bootstrap-icons.css'` | `web/src/main.tsx:5` | yes - C90 `dependências do kit de interface`: "expected ['/src/main.tsx'] to deeply equal []" |
| F2 (round 1 F7a re-injected) `grid-cols-2` -> `grid-cols-1` | `web/src/indicadores/Indicadores.tsx:122` | yes - C48 "360 px: larguras 151,169,..." |
| F3 header overlap: all 9 links in the bar from 1024 px | `web/src/Autenticado.tsx:66` (`NaBarra`) | yes - `barra a 1024 px` (Cadastros out of the nav) |
| F4 label hidden from 1280 px (`xl:sr-only` on the span) | `web/src/Autenticado.tsx:79` | yes - `barra a 1280 px` "rótulo de Assistente" |
| F5 Indicadores neither in the bar nor in "Mais" at 1280 px | `web/src/Autenticado.tsx:67` (`NoMais[5]`) | yes - `barra a 1280 px` `toBeVisible` in "Mais" failed |
| F6 "Menu" kept up to 1279 px (`lg:hidden` -> `xl:hidden`) | `web/src/Autenticado.tsx:155` | yes - C19 `cabeçalho a 1024 px` `toBeHidden` failed |
| F7 icon `Send` -> `SendHorizontal` | `web/src/assistente/Assistente.tsx:151` | yes - `Assistente traz Send, Hand e ShieldAlert` (`lucide-send`) |
| F8 Login error Alert moved above the form | `web/src/acesso/Acesso.tsx:64` | yes - `Login: campos empilhados e o erro abaixo do formulário` |
| F9 message date `text-end` -> `text-start` | `web/src/Balao.tsx:33` | yes - `Assistente: data pequena à direita...` |
| F10 Cadastros detail loses `text-sm` | `web/src/administracao/Cadastros.tsx:68` | yes - `Cadastros: detalhe pequeno embaixo do nome` |
| F11 bar never grows past 3 links (`NaBarra` = 3 entries, `NoMais` empty, "Mais" always shown) | `web/src/Autenticado.tsx:66-67,92` | no - C19 and the 4 `barra a ... px` tests stay green (9/9 on `-g "cabeçalho\|barra a"`); live bar has 3 links at 1280 and 1920 px |

## Gate

- Vitest: `cd web && npx vitest run`, 168 passed, 0 failed, 0 skipped (verified at 95b2383).
- e2e: `E2E_URL=http://localhost:8083 npx playwright test`, 44 passed, 0 failed.
- Scripts against b2e7e79: `seletores_conferem` exit 0, `consultas_preservadas` exit 0 (389), `chamadas_iguais` exit 0 (99); all autotests ok.
- Build: `npm run build` exit 0; `precache_completo` 17 URLs 0 problems; `recharts_separado` 0 problems; `ui_isolada.sh` exit 0.
- Barriers: `crapper` exit 0 (worst 8.1); `dryer` finds no candidate (door-4 list and all 19 root files).
- `mutator`: suspended by user decision (AD-025), not run.
