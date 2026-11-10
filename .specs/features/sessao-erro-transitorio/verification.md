# Sessão com erro transitório verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: e17dc66..554c340
**Round**: 2 - full (round 1 was `51cd8e5..2df768a`, FAIL on C8; the feature was rebased since then)
**Verifier**: independent sub-agent (author != verifier)

No `plan.md` (checks-only feature, `## Intent` in `checks.md`). Commits in range: `d6bf95c docs(specs): approve transient session error checks`, `554c340 fix(web): keep the session screen when /api/auth/me fails with anything but 401`. `git diff --stat e17dc66..HEAD`: 6 files, 149 insertions, 7 deletions (`.specs/STATE.md`, `.specs/features/interface-nova/checks.md`, `.specs/features/sessao-erro-transitorio/checks.md`, `web/src/Autenticado.tsx`, `web/src/acesso/acesso.test.tsx`, `web/src/chamados/sessao.test.tsx`), which matches the Intent's file list. The only product file is `web/src/Autenticado.tsx`: `semSessao` is now `erro instanceof ErroApi && erro.status === 401`, and a new `ErroDaSessao` shows the fixed texts for 403, 429 and >= 500, and falls back to `ErroDe` for everything else. `rtk`, `dryer` and `crapper` are installed on this computer now; every proof ran with `rtk bypass`.

The working tree has an uncommitted change to `checks.md`: only the `<base>` paragraph (it names `e17dc66` as the integration base after the rebase and `51cd8e5` as the round 1 base). No check row changed.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 401 shows "CPF" and `/me` is called exactly once | `rtk bypass npx vitest run src/chamados/sessao.test.tsx -t "401 vai para o login"` in `web/` | exit 0, `Tests 1 passed \| 11 skipped (12)`. Assertions: `findByLabelText('CPF')` and `expect(leituras(chamadas)).toBe(1)` | PASS |
| C2 | 6 rows (403, 429, 500 ProblemDetails; 502, 503, 504 with an empty body): fixed text, "Tentar de novo" only when not 403, no "CPF", no "Entrar" | `rtk bypass npx vitest run src/chamados/sessao.test.tsx -t "status do /me"` | exit 0, `Tests 6 passed \| 6 skipped (12)`. `it.each` has exactly the 6 rows; `sessao.test.tsx:33` `findByText(texto)`, `:34` `queryByRole('button', { name: 'Tentar de novo' }) !== null` toBe(tentar), `:35` no `CPF`, `:36` no `Entrar` | PASS |
| C3 | 1 call to `/me`, still 1 after `focus`/`visibilitychange`; only `/api/auth/me` and `/api/instituicoes/univag`; no "Alternar barra lateral"; 503 then 200: after 1500 ms and refocus, count 1, text stays, no "Minhas solicitações" | `-t "status do /me"` + `rtk bypass npx vitest run src/chamados/sessao.test.tsx -t "falha transitória sem nova tentativa"` | both exit 0 (`6 passed`; `1 passed \| 11 skipped`). `:37`/`:40` `leituras(chamadas)` toBe(1) before and after `refocar()`, `:41` URL set equals the 2 URLs, `:42` no "Alternar barra lateral"; transient test waits `setTimeout(r, 1500)`, then `:57` `leituras` toBe(1), `getByText(indisponivel)`, no heading "Minhas solicitações" | PASS |
| C4 | 429/503 then 200: count 1 before the click; after "Tentar de novo" heading "Minhas solicitações", error text gone, no "CPF", count 2; network case unchanged | `rtk bypass npx vitest run src/chamados/sessao.test.tsx -t "recupera a sessão"` + `-t "tentar de novo repete a leitura da sessão"` | exit 0 (`2 passed \| 10 skipped`); exit 0 (`1 passed \| 11 skipped`) | PASS |
| C5 | The 3 existing tests keep their names and pass; no base `expect(` line removed or rewritten | the 3 `-t` runs + `comm -23 <(git show e17dc66:web/src/chamados/sessao.test.tsx \| grep -E '^\s*expect\(' \| sort) <(grep -E '^\s*expect\(' web/src/chamados/sessao.test.tsx \| sort)` in Git Bash at the repo root | `sem rede mostra a conexão e não vai para o login` exit 0, `401 vai para o login` exit 0, `tentar de novo repete a leitura da sessão` exit 0 (each `1 passed`). `comm` printed nothing. The only removed line in the diff is `api({...})` becoming `const chamadas = api({...})` in the 401 test | PASS |
| C6 | C20 amended: the only base `expect(` line that leaves `acesso.test.tsx` is `findByLabelText('CPF')` in that test; replaced by unavailable text, "Tentar de novo", no "CPF"; the rest unchanged | `rtk bypass npx vitest run src/acesso/acesso.test.tsx -t "QueryClient por montagem sem nova tentativa nem releitura no foco"`; `comm -23` as written with `e17dc66`; `git diff e17dc66..HEAD -- web/src/acesso/acesso.test.tsx` | vitest exit 0, `Tests 1 passed \| 57 skipped (58)`. `comm` printed exactly one line, once: `    expect(await screen.findByLabelText('CPF')).toBeInTheDocument()`. Single hunk `@@ -289,7 +289,9 @@`, inside that test (it starts at line 286): 1 removed, 3 added; `expect(leiturasDoMe(falha)).toBe(1)` and the rest unchanged | PASS |
| C7 | Only the 7 listed paths change; the API does not | `git diff --name-only e17dc66..HEAD`; `git diff --quiet e17dc66 HEAD -- One.Api One.Api.Tests` | 6 paths, all in the allowed list (`verification.md` is this file, not committed). `git diff --quiet` exit 0 | PASS |
| C8 | Every gate exits 0: focused proofs, build, full suite with 0 failures, `dryer` without candidate at 0.8, `crapper --use-existing-coverage -s src --threshold 9.99` over `npm --prefix web run coverage` | all with `rtk bypass` | **Focused C1-C6**: all exit 0. **`npm --prefix web run build`**: exit 0 (`files generated ../One.Api/wwwroot/sw.js`; `git status` unchanged). **`npm --prefix web test -- --run`**: exit 1, `Test Files 2 failed \| 66 passed (68)`, `Tests 2 failed \| 646 passed (648)` (`compositor.test.tsx > limite de 10 mensagens`, `artigos.test.tsx > novo artigo envia perguntas e links como listas`, both `Test timed out in 5000ms`). **`npm --prefix web run coverage`**: run 1 exit 1, `11 failed`; run 2 exit 1, `Tests 9 failed \| 639 passed (648)` (7 timeouts, plus `assistente.test.tsx:136` `Enter envia e Shift+Enter quebra a linha` length 1 instead of 0, and `edicao.test.tsx > colar formatado`); no `web/coverage/` was written. **`dryer`**: the project convention (the command recorded in closed features, without the copied shadcn `src/ui/` and `src/test/`) `dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao -s src/ilustracoes --threshold 0.8 src/*.ts src/*.tsx` exit 0, `No duplicate candidates found.` (a plain `dryer -s src --threshold 0.8` lists candidates only inside `src/ui/`, for example `spinner.tsx`/`table.tsx` 0.85). **`crapper`**: NOT RUN in a valid way: without coverage it reports 0.0% everywhere and exits 2 (`Corpo` CRAP 380, `ErroDaSessao` CC 6), which says nothing about the real CRAP. **`mutator`**: suspended by user decision (AD-025), not run | FAIL |

### Failures outside the diff

All the failing tests are in files this feature does not touch (`assistente/`, `conhecimento/`, `administracao/aparencia.test.tsx`, `administracao/textos.test.tsx`). `npx vitest run src/assistente src/conhecimento src/administracao/aparencia.test.tsx` on a worktree at the base `e17dc66`: run 1 exit 0 (`137 passed`), run 2 exit 1 (`3 failed \| 134 passed`, timeouts and `conversa.test.tsx > a conversa fica num log`). The same set at HEAD: 3 failed and then 5 failed. The set of failing tests changes from run to run, at base and at HEAD, so this looks like flakiness under load on this computer, not a regression from this feature. It is still a gate that did not exit 0.

## Faults injected

Done in `git worktree add <scratchpad>\verify-wt HEAD` outside the repo (L-014), `node_modules` linked by a junction. Every mutation was reverted with `git checkout -- .` before the next one. The main tree was never changed.

| Fault | Mutation | Proof run | Killed |
| --- | --- | --- | --- |
| F1 | `semSessao = (erro) => erro instanceof ErroApi` | `-t "status do /me"`; C6 test | yes: exit 1, `6 failed` at `sessao.test.tsx:33`; C6 exit 1, `1 failed` at `acesso.test.tsx:292` |
| F2 | `semSessao` true for `status === 401 \|\| status === 403` | `-t "status do /me"` | yes: exit 1, `1 failed \| 5 passed`, only `status do /me 403` (`:33`) |
| F3 | 429 returns `'O serviço está indisponível no momento.'` | `-t "status do /me"` | yes: exit 1, only `status do /me 429` (`:33`) |
| F4a | `retry: true` in the `QueryClient` of `web/src/App.tsx` | `-t "falha transitória sem nova tentativa"` | yes: exit 1, `1 failed` at `:53` (the retries hold the error past the `findByText` timeout) |
| F4b | `refetchInterval: 1000` on the `['me']` query | `-t "falha transitória sem nova tentativa"` | yes: exit 1, `1 failed` at `:57` (count after 1500 ms) |
| F4c | `refetchOnWindowFocus: true` on the `['me']` query | `-t "status do /me"`; `-t "falha transitória sem nova tentativa"` | yes: exit 1, `6 failed` at `:40`; exit 1, `1 failed` at `:57` |
| F5a | error branch also renders `<Button aria-label="Alternar barra lateral" />` and `<Outlet />` | `-t "status do /me"` | yes: exit 1, `6 failed` |
| F5b | error branch also renders only `<Button aria-label="Alternar barra lateral" />` | `-t "status do /me"` | yes: exit 1, `6 failed` |
| F5c | `Autenticado` also fires `useQuery(... api('/api/chamados'))` without waiting for `/me` | `-t "status do /me"` | yes: exit 1, `6 failed` |
| F6 | `tentar={() => {}}` (no `refetch`) | `-t "recupera a sessão"`; `-t "tentar de novo repete a leitura da sessão"` | yes: exit 1, `2 failed` at `:77`; exit 1, `1 failed` at `:113` |

10 of 10 faults killed. Both worktrees (`verify-wt` and `verify-base`) were removed after their junctions; `git worktree list` shows only `C:/Users/joaoh/One 554c340 [main]` and `web/node_modules` is intact.

## Gaps (ranked)

1. **C8, `crapper` NOT RUN**: `npm --prefix web run coverage` exits 1 because of the timeouts, so no `lcov` exists and `crapper --use-existing-coverage` has nothing to read (exit 2, 0.0% everywhere). Needs a coverage run that exits 0, or an AD with accepted risk from the project owner.
2. **C8, full suite and coverage exit 1**: 2 failures in `npm --prefix web test`, 9 to 11 in `coverage`, all in files outside the diff, and the base `e17dc66` also fails the same set from time to time. Looks like environmental flakiness, not a regression, but the gate did not exit 0. Suggested lesson for whoever has `lessons.py`: on this computer the full Vitest suite times out at 5 s under parallel load (`assistente`, `conhecimento`, `administracao`), and that blocks `coverage` and `crapper`; the gate needs a calmer machine, fewer workers or a decision on the timeout.
3. Minor: C8 says "`dryer` without candidate at 0.8" with no command. Taken literally on `src/` there are candidates, all in the copied shadcn `src/ui/`; with the project convention (without `ui/`) there are none. Counted as passed on the convention.
4. Minor: uncommitted `checks.md` change (only the `<base>` paragraph); it should be committed with this report.
5. Known out of scope (Intent): a 5xx with a proxy HTML body breaks `JSON.parse` in `web/src/api.ts:20` and still shows the network block. No check covers it, by design.

## Gate

Focused C1-C6: all exit 0. `npm --prefix web run build`: exit 0. `npm --prefix web test -- --run`: exit 1 (2 failed of 648). `npm --prefix web run coverage`: exit 1 twice (11 and 9 failed), no coverage written. `dryer` (convention, without `src/ui/`): exit 0, no candidates. `crapper`: NOT RUN (no coverage). `mutator`: suspended by user decision (AD-025).
