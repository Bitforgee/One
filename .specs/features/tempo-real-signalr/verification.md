# Tempo real com SignalR verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: c1a2a56..8793668 (feature `c1a2a56..dfa2573`; round 1 fix `e9e55a0..8793668`, which is `6a96420`, `df58b4a` and `8793668`). The diff proofs still compare with `c1a2a56`, as in round 1.
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

This round covers the fix diff (`git diff e9e55a0..8793668`) and the three non-PASS items from round 1: C22, C23 and the client hub path.

**Proofs re-run in full at `8793668`** in a detached worktree, against the running compose postgres and minio, one API run at a time:
- `dotnet test api.Tests`: 405/405.
- `npx vitest run`: 186/186.
- The git-diff proofs for C2, C3, C4 and C17.
- `dotnet build api -warnaserror:CA1502`.
- The C46 to C50 gate scripts, crapper and dryer.

**Carried from `dfa2573`** (round 1), with the reason for each:
- Playwright e2e 46/46 (the third suite in C1, and C51). The fix changed no production file in `api/` or `web/src`; `setup.ts` and the tests are Vitest-only, so the image and the e2e outcome cannot change.
- Round 1 faults F1, F2a, F2b, F2c, F3, F4 (C24/C25), F5, F6, F7 and F8. Their code and their killing assertions are outside the fix diff.
- The Chromium observation of the real negotiate and WebSocket.

**Cleanup**: the worktree was removed and `git worktree prune` was run. The real tree's `git status --porcelain` matches the baseline. Containers were not touched.

## Binding sources

The profile is `standard`, so step 1 does not run and no design is binding. The verdicts on AD-022 and AD-012 are carried from `dfa2573`, because the fix does not touch them.

## Checks

Rows marked `verified at 8793668` were re-judged in this round. Every other row's proof re-ran green at `8793668` (in the full suites or the gates), and its evidence is carried from `dfa2573`. Citations in `api.Tests/TempoRealAvisosTests.cs` past line 118 are shifted +7 by the fix and are refreshed below.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 3 suites green, no test removed | verified at 8793668: `dotnet test api.Tests` 405/405 (TRX `total=405 passed=405 failed=0`); `npx vitest run` 186/186 (185 + the 1 new test). e2e 46/46 carried from dfa2573 | TRX; Vitest `Tests 186 passed (186)` | PASS |
| C2 | no test file deleted, no skip/only | verified at 8793668: both proofs vs `c1a2a56` exit as required | `--diff-filter=D` empty; no added `Skip =`/`.skip(`/`.only(` | PASS |
| C3 | rotas.txt: 0 removed, +2 hub lines, totals | verified at 8793668: 4 diff proofs ok; `Tabela_de_rotas_igual_a_da_base` Passed | `api.Tests/Retratos/rotas.txt:31`, `:32`; `api.Tests/RetratoTests.cs:39`, `:43`, `:46` | PASS |
| C4 | 4 other snapshots byte-identical | verified at 8793668: `git diff --exit-code` 0 | `api.Tests/RetratoTests.cs` 4 Retrato tests Passed | PASS |
| C5 | negotiate 401 x3, WS 401 | Passed at 8793668; carried | `api.Tests/TempoRealEntradaTests.cs:52`, `:62` | PASS |
| C6 | 403 + "Troque a senha para continuar." | Passed; carried | `api.Tests/TempoRealEntradaTests.cs:78-79`, `:86`, `:89-90` | PASS |
| C7 | negotiate 200 + connectionId; WS 101 | Passed; carried | `api.Tests/TempoRealEntradaTests.cs:98-99`, `:111` | PASS |
| C8 | exact group join; double join once | Passed; carried | `api.Tests/TempoRealEntradaTests.cs:126-127`, `:142` | PASS |
| C9 | 6 refusals, no group | Passed; carried (F2a, F2b) | `api.Tests/TempoRealEntradaTests.cs:165`, `:168`, `:173` | PASS |
| C10 | attendant of 2 sectors joins those 2 | Passed; carried (F2c) | `api.Tests/TempoRealEntradaTests.cs:190` | PASS |
| C11 | ALUNO/ADMINISTRADOR refused | Passed; carried | `api.Tests/TempoRealEntradaTests.cs:201`, `:203` | PASS |
| C12 | "Sessão inválida." 6 + 2 | Passed; carried | `api.Tests/TempoRealEntradaTests.cs:223`, `:230`, `:231` | PASS |
| C13 | role and sector re-read per call | Passed; carried | `api.Tests/TempoRealEntradaTests.cs:244`, `:245` | PASS |
| C14 | leave stops; no echo | Passed; carried | `api.Tests/TempoRealEntradaTests.cs:261`, `:273` | PASS |
| C15 | hub contract, all `Task`, `/api/tempo-real` | Passed; carried | `api.Tests/ArquiteturaTests.cs:1035`, `:1037`, `:1041` | PASS |
| C16 | group names in one file | Passed; carried | `api.Tests/ArquiteturaTests.cs:1049` | PASS |
| C17 | SignalR.Client exact; no new api package | verified at 8793668: shell proofs ok | `api.Tests/One.Api.Tests.csproj:15` `Version="10.0.14"` | PASS |
| C18 | 4 entity cases send the pair | Passed; carried | `api.Tests/AvisarMudancaTests.cs:102`, `:110`, `:119`, `:126` | PASS |
| C19 | Usuario/Artigo/Conversa send nothing | Passed; carried | `api.Tests/AvisarMudancaTests.cs:140`, `:143`, `:150` | PASS |
| C20 | one pair per ticket | Passed; carried | `api.Tests/AvisarMudancaTests.cs:168`, `:176` | PASS |
| C21 | 12 paths + 2 creations | Passed; carried | `api.Tests/TempoRealAvisosTests.cs:60`, `:70`, `:71`, `:80`, `:87` | PASS |
| C22 | each of 3 scheduler tasks sends ChamadoMudou **and** FilaMudou | verified at 8793668: `Agendador_avisa_fechamento_lembrete_e_volta_para_resolvido` Passed 3 of 3 runs; dropping the lembrete task's FilaMudou is killed 2/2 | `api.Tests/TempoRealAvisosTests.cs:117` ChamadoMudou per task; `:122` `Assert.Equal(3, fila.Recebidos.Count(e => e == "FilaMudou"))` after a 5 s wait plus 300 ms settle (`:119-121`), so the assertion catches both fewer and more than 3 | PASS |
| C23 | Transferencia sends nothing before CommitAsync; the queue GET already shows the ticket | verified at 8793668: Passed 3 of 3 runs; F4 is killed 3/3 (`Assert.Contains() Failure: Sub-string not found`) | `api.Tests/TempoRealAvisosTests.cs:136` `f.Commit.Atraso = TimeSpan.FromMilliseconds(800)` holds the commit; `:132` the queue GET runs on receipt; `:143` `Assert.Contains(numero, fila.Leituras.First())`. A notice sent before the commit reads the queue while the commit is held, so the GET does not contain the ticket | PASS |
| C24 | sent after commit; GET sees reply | Passed; carried (F4) | `api.Tests/AvisarMudancaTests.cs:191`, `:194`; `api.Tests/TempoRealAvisosTests.cs:160` | PASS |
| C25 | failed save and rollback send nothing | Passed; carried (F4) | `api.Tests/AvisarMudancaTests.cs:214-215`, `:232` | PASS |
| C26 | hub failure keeps response; 1 warning | Passed; carried | `api.Tests/TempoRealAvisosTests.cs:168-172`; `api.Tests/AvisarMudancaTests.cs:256-259` | PASS |
| C27 | tenant isolation of `ONE-1` | Passed; carried (F1) | `api.Tests/TempoRealAvisosTests.cs:209-212` | PASS |
| C28 | sector change: old and new queue | Passed; carried; user ruling 03/11/2026 | `api.Tests/TempoRealAvisosTests.cs:238`, `:255`; `api.Tests/AvisarMudancaTests.cs:275` | PASS - by user ruling |
| C29 | conversation routes send no event | Passed; carried (F5) | `api.Tests/TempoRealAvisosTests.cs:273`, `:282-283`; `api.Tests/AssistenteTests.cs:96`, `:113` | PASS |
| C30 | event arguments | Passed; carried (F3) | `api.Tests/AvisarMudancaTests.cs:291-293` | PASS |
| C31 | only the interceptor uses IHubContext | Passed; carried (F5) | `api.Tests/ArquiteturaTests.cs:1062`, `:1064` | PASS |
| C32 | AddSignalR/MapHub/interceptor only in Program | Passed; carried | `api.Tests/ArquiteturaTests.cs:1074-1075`, `:1079` | PASS |
| C33 | internal note notifies; re-read identical | Passed; carried | `api.Tests/TempoRealAvisosTests.cs:297`, `:299-300` | PASS |
| C34 | build with CA1502 as error | verified at 8793668: exit 0, 0 errors, 2 warnings (the same pre-existing `CS8604`) | `dotnet build api -warnaserror:CA1502 --no-incremental` | PASS |
| C35 | ChamadoMudou re-reads the open ticket | Passed at 8793668; carried | `web/src/chamados/tempoReal.test.tsx:40-41`, `:54-55` | PASS |
| C36 | FilaMudou re-reads the queue | Passed; carried | `web/src/chamados/tempoReal.test.tsx:68-69`, `:86` | PASS |
| C37 | enter/leave/queue; late connection joins | Passed; carried | `web/src/chamados/tempoReal.test.tsx:102`, `:106`, `:125`, `:134`, `:142` | PASS |
| C38 | 60 000 / 15 000 ms by state | Passed; carried (F7) | `web/src/chamados/tempoReal.test.tsx:165`, `:171`, `:173` | PASS |
| C39 | 3 base 15 s tests green | Passed; carried | `web/src/chamados/chamado.test.tsx:132-136`; `web/src/assistente/transferencia.test.tsx:90-92`; `web/src/test/interface.test.ts:247-248` | PASS |
| C40 | reconnect re-joins and re-reads | Passed; carried (F8) | `web/src/chamados/tempoReal.test.tsx:192-193`, `:204-205`, `:227-228` | PASS |
| C41 | back-off cap; visible tab; no user | verified at 8793668: `tempo-real.test.ts` 4/4, including the new `conecta em /api/tempo-real com reconexão automática` | `web/src/tempo-real.test.ts:16` `expect(ultima().url).toBe('/api/tempo-real')`, `:17` `expect(ultima().reconexaoAutomatica).toBe(true)`; the original cases are carried, shifted +11 | PASS |
| C42 | logout stops, login starts | Passed; carried | `web/src/acesso/tempoReal.test.tsx:102`, `:107-108` | PASS |
| C43 | refused connection keeps polling | Passed; carried | `web/src/chamados/tempoReal.test.tsx:241-247` | PASS |
| C44 | `@microsoft/signalr` exact | Passed; carried | `web/src/test/interface.test.ts:80-81`, `:74` | PASS |
| C45 | `ws: true`; SW denies `/api/*` | Passed; carried | `web/src/test/interface.test.ts:86`, `:87` | PASS |
| C46 | no base test line swapped | verified at 8793668: `--autoteste` 0; `conferir(diff,'')` vs `c1a2a56` exit 0; full `seletores_conferem.py b2e7e79` "0 problema(s) entre b2e7e79 e HEAD" exit 0 | `.specs/features/interface-nova/seletores_conferem.py` | PASS |
| C47 | base queries preserved | verified at 8793668: autoteste 0; "785 consulta(s) em c1a2a56, 0 problema(s) em HEAD" | `.specs/features/interface-nova/consultas_preservadas.py` exit 0 | PASS |
| C48 | same API calls per base test | verified at 8793668 (after `npm i --no-save react-bootstrap bootstrap bootstrap-icons`, then `npm prune`): autoteste ok; "168 teste(s) da base, 136 gravação(ões) distintas; 0 problema(s) em HEAD" | `.specs/features/interface-nova/chamadas_iguais.py` exit 0 | PASS |
| C49 | slices; crapper < 9.99; dryer clean | verified at 8793668: `estrutura em fatias` Passed; crapper exit 0; dryer "No duplicate candidates found" | `web/src/test/estrutura.test.ts:10`. The C49 precision note from round 1 is carried | PASS |
| C50 | web build and complete precache | verified at 8793668: build exit 0; "17 URL(s) no precache, 0 problema(s)" | `.specs/features/interface-nova/precache_completo.py` exit 0 | PASS |
| C51 | e2e green with failing negotiate | carried from dfa2573: 46/46 on :8085. Web production is unchanged by the fix | Playwright `46 passed` | PASS |

## Coverage

The coverage rows that the fix touched were recomputed at `8793668`. The other rows are carried from `dfa2573`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| scheduler tasks x events (3 x 2) | `api/Agendador.cs:138-177` (FecharResolvido, Lembrar, the third task each commit their own transaction) | ChamadoMudou x3 `TempoRealAvisosTests.cs:117` · FilaMudou x3 `:122` (exact count 3) | - |
| interceptor outcomes (5) | `AvisarMudanca.cs:51-52`, `:56-60`, `:89-101` | no tx C18 · commit C24 + C23 (`:136`, `:143`, F4 killed) · rollback C25 · failed save C25 · Transferencia commit C21/F6 | - |
| hub path, both ends (2) | `Program.cs:143`, `web/src/tempo-real.ts:74` | server C15 `ArquiteturaTests.cs:1041` (and C7 negotiates at that path) · client `web/src/tempo-real.test.ts:16` (F9 killed) | - |
| startup config: web connection (4 places + builder options) | `Autenticado.tsx:121`, `vite.config.ts:38`, `vite.config.ts:32`, `setup.ts`, `tempo-real.ts:74` | C42, C45, C48 · `withUrl` `tempo-real.test.ts:16` · `withAutomaticReconnect` `:17` (removal killed). `configureLogging(LogLevel.None)` only silences console output and decides nothing | - |
| all other sets (negotiate/WS statuses, 401 reasons, hub method outcomes, refusals, entity kinds, setor change, 14 write paths, send failure, conversation routes, event args, `HubConnectionState` intervals, web decisions, hub + interceptor startup) | carried from dfa2573; their sources and tests are outside the fix diff | as in round 1 | - |

The e2e `negotiate` assertion was not added, and no check needs it. Each end of the hub path is now pinned to the Surface literal `/api/tempo-real`: the server by C15 and C7, the client by `tempo-real.test.ts:16`. The Vite WebSocket proxy is pinned by C45. C51 by its own wording accepts a failed negotiate. Round 1 also observed a real browser negotiate and WebSocket on the built image.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached only through the connection | `TempoRealHub.cs` | .NET client against the real hub, per member of C5-C14 | yes - carried from dfa2573 |
| Decides, reached by the write | `AvisarMudanca.cs` | own layer with recording `IHubContext`, and API with the .NET client | yes - verified at 8793668: on the API side, F4 is now killed by C23 (`TempoRealAvisosTests.cs:143`) and the per-task FilaMudou is counted (`:122`) |
| Decides, in `web/` | `tempo-real.ts`, `useChamado` | own layer with the fake connection | yes - verified at 8793668: the builder URL and reconnect are now asserted (`tempo-real.test.ts:16-17`) |
| Structure | `ArquiteturaTests` rules | text or reflection rule | yes - carried |
| Instrumentation | `AddSignalR`, `MapHub`, `ws: true`, `setup.ts` fake | covered by C3, C7, C45, C48 | yes - verified at 8793668: the `setup.ts` change only adds a recorded field (`reconexaoAutomatica`, set in `build()`) and keeps `url`, `on`, `start` and `stop` unchanged. Every other test passes unchanged (186/186), and C48 still reports 0 problems |

## Test seam judged (new in the fix)

`AtrasoDoCommit` (`api.Tests/Infra/OneFactory.cs:195-203`) lives in the test project only. `git diff e9e55a0..8793668 -- api` is empty, so no production file changed.

The seam is zero by default. `Atraso` is a `TimeSpan` defaulting to `Zero`, and `TransactionCommittingAsync` returns the same `result` without delay unless `Atraso > Zero`. Its only setter is `TempoRealAvisosTests.cs:136`, which resets it to zero in a `finally` (`:139`). Within that class the commit hold applies only to the transfer request. Other classes get their own `OneFactory` through `IClassFixture`, so the hold does not leak to them.

The seam is registered next to the existing `ContadorDeGravacoes` (`OneFactory.cs:85`) in the same `AddInterceptors` call, and the full suite passed 405/405 with it.

## Faults injected

This round injected 4 faults on the surfaces the fix touched. The round 1 faults F1, F2a-c, F3, F4 (via C24/C25), F5, F6, F7 and F8 are carried from `dfa2573` (all killed).

| Mutation | Location | Killed |
| --- | --- | --- |
| F4 notices sent at SaveChanges even inside a transaction, run against C23's named proof `Transferir_avisa_so_depois_do_commit_e_a_fila_ja_traz_o_chamado` | `api/Chamados/AvisarMudanca.cs:51-52` | yes - 3 of 3 runs, `TempoRealAvisosTests.cs:143` `Assert.Contains() Failure: Sub-string not found` |
| Lembrete task's FilaMudou dropped (an `AsyncLocal` flag set in `Agendador.Lembrar`, checked before the FilaMudou loop in `Enviar`); its ChamadoMudou is kept | `api/Agendador.cs:160`, `api/Chamados/AvisarMudanca.cs:79` | yes - 2 of 2 runs, `TempoRealAvisosTests.cs:122` Expected 3, Actual 2 |
| F9 web client connects to `/api/tempo-reall` | `web/src/tempo-real.ts:74` | yes - `tempo-real.test.ts:16` `expected '/api/tempo-reall' to be '/api/tempo-real'`; 1 failed, 185 passed |
| `.withAutomaticReconnect()` removed from the builder | `web/src/tempo-real.ts:74` | yes - `tempo-real.test.ts:17` `expected false to be true`; 1 failed, 185 passed |

One earlier attempt at the scheduler fault is not counted, because it changed no behavior. It looked for `Lembrar` on the stack inside `Enviar`, but `TransactionCommittedAsync` runs after the database commit's async await, so the scheduler frame is never on that stack. The test passed 2/2 and still received 3 FilaMudou. The `AsyncLocal` version above replaced it.

## Gate

- `dotnet test api.Tests` at 8793668: 405 passed, 0 failed (TRX `full.trx`)
- `npx vitest run` at 8793668: 186 passed, 0 failed
- e2e: 46 passed, 0 failed (carried from dfa2573)
- `dotnet build api -warnaserror:CA1502`: 0 errors. Git diff proofs C2, C3, C4 and C17, and gate scripts C46-C50 (including the full `seletores_conferem.py b2e7e79`), crapper and dryer: all exit 0

Precision notes carried from round 1, none failing on its own:
- C49: `Raiz` also gained `tempo-real.test.ts`.
- C34: "0 aviso" in the claim, against 2 pre-existing `CS8604` warnings.
- C9: the "other institution" case uses a number that is absent from the caller's own institution.
