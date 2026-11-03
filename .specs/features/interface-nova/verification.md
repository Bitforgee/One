# Interface nova verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 95b2383..bd7d7ce (fix: bd7d7ce, `web/e2e/arranjo.spec.ts` only); round 2 covered 9eea6e0..95b2383, round 1 b2e7e79..1d0753f
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier); proofs run in a detached worktree at bd7d7ce, e2e against a container built from it (`one-ui-verify3`, port 8083, on `one-system_default` with the `api` service env); e2e faults run against a Vite dev server of the same worktree (port 5199; the arranjo spec was green there first, 29/29)

## Ranked gaps

1. **C7 (mutator, AC 8, door 4) is not proven.** It is suspended by user decision (AD-025), and it was not run. The procedure has no PASS for a check that was not proven: a `Result` that is not PASS makes the verdict FAIL. That holds even when the user suspended the check. Only the user can accept the feature with C7 open, or lift the suspension so the mutator can run.

Round 2 gap 1 is closed. The bar counts the user ruled (3/5/7 at 1024/1280/1536 px) are now asserted exactly, and the test runs at 1536 px. F11 is killed (see Faults). After that, C7 is the only check that is not PASS.

## Binding sources

Step 1 was redone only for row 0 (the header), which is the one surface the fix touched. Verified at bd7d7ce.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `## Screens` row 0 cabeçalho + note of 02/11/2026 (plan.md:144) and the C19 ruling (checks.md Handoff) | yes - the ruling's 3/5/7 counts read against `web/e2e/arranjo.spec.ts:111` (`{ 1024: 3, 1280: 5, 1536: 7, 1920: 7 }`) and `:114` (widths 768/1024/1280/1536/1920); the live counts measured in round 2 (3/5/7/7) match, and the container at bd7d7ce passes the exact assertions | none | - |
| all other rows, `## Visual`, tokens, AD-020 | carried from 95b2383 (round 2) and 1d0753f (round 1), not touched by the fix | none | - |

## Checks

Proofs re-run in full at bd7d7ce: Vitest 168/168 and e2e 45/45 (44 plus the new 1536 px test), plus every script and barrier. The table lists the checks the fix touched and the checks that were not PASS in round 2, all verified at bd7d7ce. Every other check is **carried from 95b2383**: C8-C16, C17, C20-C26, C27-C37, C38, C39-C43, C44-C47, C48-C65, C66-C79, C80-C88, C89, C90-C94. The fix touched no file those checks cite except `arranjo.spec.ts`, and there every line after 107 moved by +3. The refreshed citations are C18 `:66`, `:532-537`, `:542`; C48 `:321`; C66 `:550`, `:568`; C38 `:577`, `:587`, `:594`; C44 `:605`, `:616`; C80 `:632-633`, `:645`; C89 `:656`, `:673`, `:685`, `:698`. All of their proofs are green in the two full runs.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | whole Vitest and e2e suites green, no `.skip`/`.only` | `npx vitest run` 29 files, 168/168; `E2E_URL=http://localhost:8083 npx playwright test` 45/45 | `.specs/features/interface-nova/seletores_conferem.py:90` (autotest kills an added `.only(`) | PASS |
| C2 | `seletores_conferem.py b2e7e79` exit 0 | autotest exit 0; `b2e7e79` exit 0, "0 problema(s)" | `.specs/features/interface-nova/seletores_conferem.py:116` | PASS |
| C3 | role queries preserved | autotest exit 0; `b2e7e79` exit 0, 389 queries, 0 problems | `.specs/features/interface-nova/consultas_preservadas.py:78` | PASS |
| C4 | same calls base vs HEAD | autotest exit 0; `b2e7e79` exit 0, 99 tests, 90 distinct recordings, 0 problems (`bootstrap@5.3.8`, `bootstrap-icons@1.13.2`, `react-bootstrap@2.10.10` `--no-save`; `npm prune` removed 32 packages, 0 left) | `.specs/features/interface-nova/chamadas_iguais.py:136` | PASS |
| C5 | crapper <= 9.99 over `src` | `npm run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` exit 0 | `web/src/Periodo.tsx:1` worst CRAP 8.1 (unchanged file) | PASS |
| C6 | dryer finds no candidate | door-4 command prints "No duplicate candidates found" | `web/src/Autenticado.tsx:1` (no source changed by the fix) | PASS |
| C7 | mutator over the slices | not run - AD-025 | `.specs/features/interface-nova/mutator_web.sh:13` | suspended by user decision (AD-025) - not proven |
| C19 | read by the 02/11 ruling: drawer below 1024 px; from 1024 px, 3/5/7 named links at 1024/1280/1536 px, the rest in "Mais" | `--list -g "barra a\|cabeçalho a 1024"` selects 6 tests; all passed in the full run against :8083 | `web/e2e/arranjo.spec.ts:92` Menu hidden at 1024 · `:104` no link at 1023 · `:111` ruled counts · `:114` widths incl. 1536 · `:138` no pairwise overlap · `:151` label width > 10 · `:158` the rest in "Mais" · `:160` `expect(naBarra.length, ...).toBe(linksNaBarra[largura])` | PASS |

The fix diff (`git show bd7d7ce`) changes three things in `web/e2e/arranjo.spec.ts`:

- It adds 1536 to the width list.
- It adds the `linksNaBarra` map.
- It replaces `toBeGreaterThanOrEqual(3)` with an exact `toBe(linksNaBarra[largura])`.

No other assertion was removed or weakened. The 768 px branch still returns at the drawer before the count line. C2 and C3 stay clean against b2e7e79.

## Coverage

Recomputed only for the rows the fix touched. The rest is carried from 95b2383.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| row 0 note: named links per width (3) | the row 0 note and the C19 ruling | 3 at 1024 `:160` (and C19 `:85`); 5 at 1280 `:160`; 7 at 1536 `:160` (also 7 at 1920) | - |
| header widths (ruling) | the row 0 note and C19 ruling: 1023/1024 edge, 768/1024/1280/1536/1920 | C19 `:85`; `barra a ... px` x5 (`:114`) | - |
| plan criteria (61) | carried from 95b2383 | as round 2 | AC 8 (C7 suspended, AD-025) |
| AD-018 barriers (3) | door 4 | crapper C5, dryer C6 | mutator C7 (suspended by user decision) |
| all other sets | carried from 95b2383 | unchanged | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Arranjo e medidas da tela | all 15 screens + header (`arranjo.spec.ts` touched) | Playwright, every arrangement fact measured | yes - the ruled 3/5/7 counts are measured exactly at every width, including 1536 px, and F11 and F12 are killed |
| Regra sobre código-fonte; Tela que decide; Saída do build; Código copiado para `ui/` | carried from 95b2383 | as round 2 | yes - re-run green at bd7d7ce: `ui_isolada.sh` exit 0, `precache_completo` 17 URLs 0 problems, `recharts_separado` 3 chunks 0 problems, crapper exit 0 |

## Faults injected

Every fault ran in the scratch worktree, one at a time, under `E2E_URL=http://localhost:5199 npx playwright test e2e/arranjo.spec.ts -g "cabeçalho a 1024|barra a"`. That filter selects 6 tests, all green at baseline. Each fault was reverted with `git checkout -- src/Autenticado.tsx`, and no tracked file stayed modified afterwards. The real tree was never edited. The mutator is suspended (AD-025) and was not run. The round 2 faults F1-F10 hit files the fix did not touch, so they are carried from 95b2383 (all killed).

| Mutation | Location | Killed |
| --- | --- | --- |
| F11 (round 2 survivor re-injected) bar stuck at 3 links: `NaBarra` = `['lg:flex','lg:flex','lg:flex','','','','']`, `NoMais` all `''` | `web/src/Autenticado.tsx:66-67` | yes - `barra a 1280/1536/1920 px` fail at `arranjo.spec.ts:160`: expected 5/7/7, received 3 |
| F12 6 links at 1536 px: 7th entry of `NaBarra` and `NoMais` -> `''` (Usuários stays in "Mais", reachable, no overlap) | `web/src/Autenticado.tsx:66-67` | yes - `barra a 1536 px` and `barra a 1920 px` fail at `:160`: expected 7, received 6 (2 failed, 4 passed) |

## Gate

- Vitest: `cd web && npx vitest run`, 168 passed, 0 failed (verified at bd7d7ce).
- e2e: `E2E_URL=http://localhost:8083 npx playwright test`, 45 passed, 0 failed.
- Scripts against b2e7e79: `seletores_conferem` exit 0, `consultas_preservadas` exit 0 (389), `chamadas_iguais` exit 0 (99); all three autotests exit 0.
- Build: `npm run build` exit 0; `precache_completo` exit 0 (17 URLs); `recharts_separado` exit 0; `ui_isolada.sh` exit 0.
- Barriers: `crapper` exit 0; `dryer` finds no candidate.
- `mutator`: suspended by user decision (AD-025), not run.
