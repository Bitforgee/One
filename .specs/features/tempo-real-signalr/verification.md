# Tempo real com SignalR verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: c1a2a56..dfa2573 (feature commits `d67ad50`, `d34d84b`, `1baf8ff`, `dfa2573`; `f62903b` and the later `8720d15` touch only `checks.md` and `ROADMAP.md`). Diff proofs compare with `c1a2a56` (coordinator note: the checks base `f996d30` predates the `arquivos-minio` build). C2, C3 and C46 also pass against `f996d30`.
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All proofs were re-run at `dfa2573` in a detached worktree. API tests ran against the running compose postgres and minio, one suite at a time. The e2e image was `one-signalr-verify`, run on :8085 on `one-system_default` with the compose `api` environment, a throwaway database `one_sr_verify`, the bucket `one-sr-verify` and the institution `srverif`, which was created with `instituicao criar`. Mutation stays suspended (AD-025), so faults were injected by hand. The real tree's `git status --porcelain` matched the baseline at the end. The container, image, temporary database, bucket and worktree were all removed.

The verdict is FAIL for three reasons, ranked at the end of this report:
1. A wrong hub path in the web client survives every suite (F9).
2. C23's own proof survives a notice sent before the commit (F4).
3. C22 asserts `FilaMudou` only once across its 3 scheduler tasks.

## Binding sources

Profile `standard`: step 1 does not run. The plan marks no design as binding. AD-022 and AD-012 (`.specs/STATE.md`) were read as decisions. No check contradicts them: C15 and C29 hold the "whole answer, never streamed" rule, and the F5 fault was killed by both.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 3 suites green, no test removed | `dotnet test api.Tests` 405/405; `npx vitest run` 185/185; `E2E_URL=http://localhost:8085 npm run e2e` 46/46 | TRX `full.trx` 405 Passed; Vitest summary `Tests 185 passed`; Playwright `46 passed` | PASS |
| C2 | no test file deleted, no skip/only | both `git diff` proofs exit as required vs `c1a2a56` (and `f996d30`) | `git diff --diff-filter=D` empty; no `^\+.*(Skip *=\|\.skip\(\|\.only\()` | PASS |
| C3 | rotas.txt: 0 removed, +2 hub lines, totals | 4 diff proofs ok; `RetratoTests.Tabela_de_rotas_igual_a_da_base` Passed | `api.Tests/Retratos/rotas.txt:31` `POST /api/tempo-real/negotiate ...`, `:32` `* /api/tempo-real ...`; `api.Tests/RetratoTests.cs:39` `Assert.Equal(63, viva.Count)`, `:43` 60, `:46` 61; no other number changed in the diff | PASS |
| C4 | 4 other snapshots byte-identical | `git diff --exit-code` exit 0; 4 Retrato tests Passed | `api.Tests/RetratoTests.cs` (`Corpos_de_erro...`, `Corpos_de_sucesso...`, `Erros_da_importacao...`, `Gravacoes_do_chamado...` Passed in TRX) | PASS |
| C5 | negotiate 401 x3, WS 401 | 2 tests Passed | `api.Tests/TempoRealEntradaTests.cs:52` `Assert.Equal(HttpStatusCode.Unauthorized, (await Negociar(cookie)).StatusCode)` over `{null, inactive user, inactive institution}`; `:62` `Assert.Contains("401", await StatusDoWebSocket(null))` | PASS |
| C6 | 403 + "Troque a senha para continuar." on negotiate and WS | 2 tests Passed | `api.Tests/TempoRealEntradaTests.cs:78-79`; `:86`, `:89-90` | PASS |
| C7 | negotiate 200 + connectionId; WS 101 | 2 tests Passed | `api.Tests/TempoRealEntradaTests.cs:98-99`; `:111` `Assert.Equal(WebSocketState.Open, socket.State)` | PASS |
| C8 | requester and sector attendant join the exact group; double join delivers once | 2 tests Passed | `api.Tests/TempoRealEntradaTests.cs:126-127` `Assert.Equal([$"Sonda:{grupo}"], ...)`; `:142` | PASS |
| C9 | 6 refusals "Chamado não encontrado.", no group | Passed; F2a, F2b killed | `api.Tests/TempoRealEntradaTests.cs:165` `Assert.Equal(NaoEncontrado, await c.Recusa(...))`, `:168` `Assert.Empty(await c.Quieto())`, `:173` same `detail` as the GET. Precision note: the "ONE-1 de outra instituição" case (`:156`) asks for a number that does not exist in the caller's own institution. Cross-tenant group isolation is proven by C27 (F1 killed) | PASS |
| C10 | attendant of 2 sectors joins exactly those 2 queues | Passed; F2c killed | `api.Tests/TempoRealEntradaTests.cs:190` `Assert.Equal([$"Sonda:{g1}", $"Sonda:{g2}"], ...)` | PASS |
| C11 | ALUNO and ADMINISTRADOR refused, no group | Passed | `api.Tests/TempoRealEntradaTests.cs:201`, `:203` | PASS |
| C12 | "Sessão inválida." 6 + 2 cases | Passed | `api.Tests/TempoRealEntradaTests.cs:223` (3 methods x 2), `:230`, `:231` | PASS |
| C13 | role and sector re-read per call | Passed | `api.Tests/TempoRealEntradaTests.cs:244`, `:245` | PASS |
| C14 | leave stops the probe; no echo to caller | 2 tests Passed | `api.Tests/TempoRealEntradaTests.cs:261`; `:273` `Assert.Empty(await atendente.Quieto())` | PASS |
| C15 | hub contract, all `Task`, mapped at `/api/tempo-real` | Passed | `api.Tests/ArquiteturaTests.cs:1035`, `:1037` `Assert.All(metodos, m => Assert.Equal(typeof(Task), m.ReturnType))`, `:1041` | PASS |
| C16 | group names in one file, institution from re-read user | Passed | `api.Tests/ArquiteturaTests.cs:1049` `Assert.Equal(["TempoRealGrupos.cs"], comNome)`, and `u.InstituicaoId` asserted for every use | PASS |
| C17 | SignalR.Client exact in api.Tests; no new package in api | both shell proofs ok | `api.Tests/One.Api.Tests.csproj:15` `Version="10.0.14"`; `git diff c1a2a56 -- api/One.Api.csproj` has no `+PackageReference` | PASS |
| C18 | 4 entity cases send the exact pair | Passed | `api.Tests/AvisarMudancaTests.cs:102`, `:110`, `:119`, `:126` `Igual(Par(...), f.Hub.Tirar())` | PASS |
| C19 | Usuario, Artigo and Conversa send nothing | Passed | `api.Tests/AvisarMudancaTests.cs:140`, `:143`, `:150` | PASS |
| C20 | one pair per ticket, 2 tickets give 2 pairs | Passed | `api.Tests/AvisarMudancaTests.cs:168`, `:176` | PASS |
| C21 | 12 paths ChamadoMudou+FilaMudou; transferir and atendimento-direto FilaMudou | Passed | `api.Tests/TempoRealAvisosTests.cs:60` (12 members), `:70`, `:71` per path after `Limpar()`; `:80`, `:87` | PASS |
| C22 | each of 3 scheduler tasks sends ChamadoMudou **and** FilaMudou | Passed; F6 killed | `api.Tests/TempoRealAvisosTests.cs:117` ChamadoMudou asserted per task. FilaMudou is asserted once for all 3 tasks (`:118` `Assert.True(await fila.Receber("FilaMudou"))`), so 2 of the 3 per-task FilaMudou members have no assertion. See Coverage | FAIL - coverage gap |
| C23 | Transferencia sends nothing before CommitAsync; the queue GET already shows the ticket | Passed at HEAD, **and Passed 3/3 under F4** (every notice sent at SaveChanges, before the commit) | `api.Tests/TempoRealAvisosTests.cs:135-137` asserts only that the GET made after the notice contains the number. The commit lands microseconds after SaveChanges, so the GET always sees it. The "nothing before CommitAsync" half is asserted only by C24's layer test `AvisarMudancaTests.cs:191`, which is not in C23's Proof lines (L-029) | FAIL - proof survives F4 |
| C24 | nothing after SaveChanges in a transaction, sent after commit; GET sees the reply | 2 tests Passed; F4 killed | `api.Tests/AvisarMudancaTests.cs:191` `Assert.Empty(f.Hub.Tirar())` before commit, `:194` after; `api.Tests/TempoRealAvisosTests.cs:153` | PASS |
| C25 | failed save and rollback send nothing | 2 tests Passed; F4 killed | `api.Tests/AvisarMudancaTests.cs:214-215`; `:232` | PASS |
| C26 | hub failure keeps status and body; 1 log warning with ids, no text | 2 tests Passed | `api.Tests/TempoRealAvisosTests.cs:161-165`; `api.Tests/AvisarMudancaTests.cs:256-259` | PASS |
| C27 | same `ONE-1` in A and B: B gets nothing, A gets both | Passed; F1 killed | `api.Tests/TempoRealAvisosTests.cs:202-203` (positive control), `:204` `Assert.Empty(await cb.Aluno.Quieto())`, `:205` | PASS |
| C28 | sector change notifies old and new queue | 3 named proofs Passed (`Reclassificar_avisa_a_fila_antiga_e_a_nova` absent by design) | `api.Tests/TempoRealAvisosTests.cs:231` `Assert.Equal(["outro:FilaMudou", "triagem:FilaMudou"], ...)`, `:248`; `api.Tests/AvisarMudancaTests.cs:275`. User ruling of 03/11/2026: C28 holds without the impossible "reclassify moves queues" case (mvp-one AC 97) | PASS - by user ruling |
| C29 | 4 conversation routes send no event; answer whole in the body | 3 tests Passed; F5 killed | `api.Tests/TempoRealAvisosTests.cs:266`, `:275-276`; `api.Tests/AssistenteTests.cs:96`, `:113` | PASS |
| C30 | ChamadoMudou 1 string arg, FilaMudou 0 | Passed; F3 killed | `api.Tests/AvisarMudancaTests.cs:291` `Assert.Equal([numero], ...Argumentos)`, `:292`, `:293` | PASS |
| C31 | only the interceptor uses IHubContext; only the 2 names | Passed; F5 killed | `api.Tests/ArquiteturaTests.cs:1062`, `:1064` | PASS |
| C32 | AddSignalR, MapHub and the interceptor only in Program | Passed | `api.Tests/ArquiteturaTests.cs:1074-1075`, `:1079`. Assemblies read directly: `api/Program.cs:55-57` (Servicos) runs before `:36` (`instituicao` command); `:143` MapHub; `OneFactory : WebApplicationFactory<Program>` (`api.Tests/Infra/OneFactory.cs:23`) plus subclasses | PASS |
| C33 | internal note notifies the student; re-read identical | Passed | `api.Tests/TempoRealAvisosTests.cs:290`, `:292-293` | PASS |
| C34 | build with CA1502 as error | `dotnet build api -warnaserror:CA1502 --no-incremental` exit 0, 0 errors | 0 CA1502. Precision note: the claim says "0 aviso", but the build has 2 `CS8604` warnings, both in files outside the diff (`api/Assistente/NovaConversa.cs:33`, `NovaMensagem.cs:35`) | PASS |
| C35 | ChamadoMudou re-reads the open ticket; another number does not | 2 Vitest Passed | `web/src/chamados/tempoReal.test.tsx:40-41`; `:54-55` | PASS |
| C36 | FilaMudou re-reads the queue, not "Minhas solicitações" | 2 Passed | `web/src/chamados/tempoReal.test.tsx:68-69`; `:86` | PASS |
| C37 | enter/leave/queue calls; a late connection joins open screens | 3 Passed | `web/src/chamados/tempoReal.test.tsx:102`, `:106`; `:125`; `:134`, `:142` | PASS |
| C38 | 60 000 ms Connected, 15 000 ms in the other 4 states | Passed; F7 killed | `web/src/chamados/tempoReal.test.tsx:165` (state), `:171` (`espera - 1` gives 1 read), `:173` (`espera` gives 2) | PASS |
| C39 | 3 base 15 s tests unchanged and green | 3 Passed; F7 killed 2 of them (the third is a text rule) | `web/src/chamados/chamado.test.tsx:132-136`; `web/src/assistente/transferencia.test.tsx:90-92`; `web/src/test/interface.test.ts:247-248` | PASS |
| C40 | reconnect re-joins open screens and re-reads; a closed screen is not re-joined | 2 Passed; F8 killed | `web/src/chamados/tempoReal.test.tsx:192-193`, `:204-205`; `:227-228` | PASS |
| C41 | back-off capped at 30 s; visible tab retries now; no user, no connection | 3 Passed | `web/src/tempo-real.test.ts:28-36`; `:54`; `:63`, `:67` | PASS |
| C42 | logout stops, login starts a new connection | Passed | `web/src/acesso/tempoReal.test.tsx:102` `expect(primeira.stops).toBe(1)`, `:107-108` | PASS |
| C43 | refused connection keeps 15 s polling, no new text | Passed | `web/src/chamados/tempoReal.test.tsx:241-247` (2 cases) | PASS |
| C44 | `@microsoft/signalr` exact in dependencies | 2 Passed | `web/src/test/interface.test.ts:80-81`, `:74` | PASS |
| C45 | `ws: true`; the service worker still denies `/api/*` | Passed | `web/src/test/interface.test.ts:86` (asserts `web/vite.config.ts:38`) and `:87` (asserts `web/vite.config.ts:32`) | PASS |
| C46 | no base test line swapped | `--autoteste` 0; `conferir(diff,'')` exit 0 vs `c1a2a56` | `.specs/features/interface-nova/seletores_conferem.py` exit 0 | PASS |
| C47 | base queries preserved | autoteste 0; `consultas_preservadas.py c1a2a56`: "785 consulta(s) em c1a2a56, 0 problema(s) em HEAD" | `.specs/features/interface-nova/consultas_preservadas.py` exit 0 | PASS |
| C48 | same API calls per base test | autoteste ok; `chamadas_iguais.py c1a2a56`: "168 teste(s) da base ... 0 problema(s) em HEAD" | `.specs/features/interface-nova/chamadas_iguais.py` exit 0 | PASS |
| C49 | slices kept; crapper < 9.99; dryer no candidate | `estrutura em fatias` Passed; crapper exit 0 (highest new score: `useChamadoAberto` 7.8); dryer "No duplicate candidates found." | `web/src/test/estrutura.test.ts:10`. Precision gap: the claim says `Raiz` "só ganha 'tempo-real.ts'", but it also gained `'tempo-real.test.ts'`. C41 requires that file at `src/` root, so the checks contradict each other. No `expect` in the file changed, and the extra entry only exempts that test file from the "2+ slices import it" rule (`:44`). Builder flag accepted | PASS |
| C50 | web build and complete precache | build exit 0; "17 URL(s) no precache, 0 problema(s)" | `.specs/features/interface-nova/precache_completo.py` exit 0 | PASS |
| C51 | e2e green with the failing negotiate | 46/46 on :8085 | Playwright summary `46 passed (11.9s)` | PASS |

Extra evidence, not a check (builder flag "WebSocket through Kestrel in Docker not proven in a real browser"): headless Chromium logged into `srverif` on :8085. It recorded `POST 200 /api/tempo-real/negotiate`, a WebSocket to `ws://localhost:8085/api/tempo-real?id=...`, and the handshake frame `{}` received. Unauthenticated `POST /api/tempo-real/negotiate` returned 401 from the container.

## Coverage

Recomputed from `api/Chamados/TempoRealHub.cs`, `api/Chamados/AvisarMudanca.cs`, `api/Agendador.cs`, `api/Program.cs`, `web/src/tempo-real.ts`, `web/src/chamado.ts` and the plan's Surface, Flow and Landing.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| negotiate statuses (3) | Surface; `Program.cs:116` (`Sessao.Validar`), `:44` (`ExigirTrocaDeSenha`) | 200 C7 `:98` · 401 C5 `:52` · 403 C6 `:78` | - |
| WS statuses (3) | Surface | 101 C7 `:111` · 401 C5 `:62` · 403 C6 `:86` | - |
| 401 reasons (3) | `Sessao.Validar` | no cookie, inactive user, inactive institution, all at `TempoRealEntradaTests.cs:51-52` | - |
| `EntrarNoChamado` outcomes (3) | `TempoRealHub.cs:121-127` | ok C8 · not found C9 · invalid session C12 | - |
| `SairDoChamado` outcomes (2) | `TempoRealHub.cs:129-133` | ok C14 · invalid session C12 | - |
| `EntrarNaFila` outcomes (3) | `TempoRealHub.cs:135-142` | ok C10 · not attendant C11 · invalid session C12 | - |
| `EntrarNoChamado` refusals (6) | `TempoRealHub.cs:124` (blank) + `ChamadoRotas.Carregar` | 6 rows at `TempoRealEntradaTests.cs:155-160` | - |
| `Reler` refusals (2 conditions x 3 methods + 2 order cases) | `TempoRealHub.cs:152` | C12 `:216-231` | - |
| entity kinds that notify (4) / do not (3) | `AvisarMudanca.cs:33-40` | C18 4 · C19 3 | - |
| interceptor outcomes (5) | `AvisarMudanca.cs:51-52`, `:56-60`, `:89-101` | no tx C18 · commit C24 · rollback C25 · failed save C25 · Transferencia commit C21/F6 | - |
| setor change (2) | `AvisarMudanca.cs:36`, `:79` | changed: both queues C28 (`AvisarMudancaTests.cs:275`, `TempoRealAvisosTests.cs:231`) · unchanged: one queue `:248` | - |
| API paths that write a ticket (14) | handlers | C21, 12 paths + 2 creations, asserted per path | - |
| scheduler tasks x events (3 x 2) | `Agendador.cs:141-177` | ChamadoMudou x3 `TempoRealAvisosTests.cs:117` · FilaMudou x1 `:118` | FilaMudou for 2 of the 3 tasks (one aggregate assertion covers all three) |
| send failure (2 routes + log) | `AvisarMudanca.cs:82-85` | C26 | - |
| conversation routes without a ticket (4) | `ConversaRotas` | C29 `TempoRealAvisosTests.cs:262-276` | - |
| event args (2) | `AvisarMudanca.cs:78`, `:80` | C30 | - |
| `HubConnectionState` -> interval (5) | `chamado.ts` `refetchInterval` | C38, all 5 | - |
| web decisions (C35-C43 members) | `tempo-real.ts:18-146` | as in the checks table | - |
| hub path, both ends (2), from Flow step 1, door 1 and Surface `WS /api/tempo-real`; the checks give this set no row | `Program.cs:143`, `tempo-real.ts:74` | server `/api/tempo-real` C15 `ArquiteturaTests.cs:1041` · client `withUrl('/api/tempo-real')` | client path: F9 (`/api/tempo-reall`) survives 185 Vitest tests; no e2e spec references `/api/tempo-real`, and C51 accepts a failed negotiate as success |
| startup config: hub + interceptor (4 places) | `Program.cs:27`, `:36`, `:143`; `OneFactory.cs:23` | C32 | - |
| startup config: web connection (4 places) | `Autenticado.tsx:121`, `vite.config.ts:38`, `vite.config.ts:32`, `setup.ts` | C42 (lifecycle only), C45, C48 | the app's `HubConnectionBuilder` configuration (`withUrl`, `withAutomaticReconnect`): the fake in `setup.ts` ignores both (same surface as F9; `withAutomaticReconnect` was not injected separately) |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached only through the connection | `TempoRealHub.cs` | .NET client against the real hub, one case per member of C5-C14 | yes - every member has a case; F2a/F2b/F2c killed |
| Decides, reached by the write | `AvisarMudanca.cs` | own layer with the recording `IHubContext` and API with the .NET client | no - layer met (C18-C20, C24-C26). On the API side, the C23 proof does not detect a notice sent before commit (F4 survived C23's named proof), and the scheduler's FilaMudou is asserted once for 3 paths |
| Decides, in `web/` | `tempo-real.ts`, `useChamado` | own layer with the fake connection, one case per member of C35-C43 | yes - 8 decision points covered; F7, F8 killed |
| Structure | `ArquiteturaTests` rules | text or reflection rule | yes - C15, C16, C31, C32; F5 killed C31 |
| Instrumentation | `AddSignalR`, `MapHub`, `ws: true`, `setup.ts` fake | none of its own; covered by C3, C7, C45, C48 | yes for the items listed. The client `HubConnectionBuilder` configuration is not listed in any row and is not covered (see Coverage) |

## Swept existing

- authorization, "existing - `ChamadoRotas.Carregar` e `Sessao.Validar`/`ExigirTrocaDeSenha` seguem como a regra única": present. The hub calls `ChamadoRotas.Carregar` (`api/Chamados/TempoRealHub.cs:124`). The cookie uses `OnValidatePrincipal = Sessao.Validar` (`api/Program.cs:116`) and `app.Use(Sessao.ExigirTrocaDeSenha)` (`api/Program.cs:44`), both of which apply to `/api/tempo-real` (C5 and C6 green).
- data lifecycle `n/a`: policy, nothing to check.

## Builder flags judged

- **Interceptor only on async `SaveChangesAsync`**: acceptable. `api/` has no synchronous `SaveChanges(` caller; the only match is the `OneDb.SaveChanges(bool)` override at `api/Dados/OneDb.cs:169`. The limit is recorded as a `shortcut:` at `api/Chamados/AvisarMudanca.cs:13`.
- **The 400 ms waits for "no event arrives"** (`api.Tests/Infra/TempoRealCliente.cs:116-120`, `Quieto`): acceptable. Such a wait can only produce a false pass, never a false fail, and in practice it was long enough: F1 and F2b were both killed through `Quieto()`.
- **`Raiz` gained `tempo-real.ts` and `tempo-real.test.ts`**: accepted, with the C49 precision gap noted above.
- **Route totals 63/60/61 with only `negotiate` declared POST**: confirmed. 63 lines in `rotas.txt`. The WebSocket endpoint has no method metadata, so the single-method count rises by 1 and the authorized count by 2. `SessaoTests` 54->56 is covered by the user's ruling of 03/11/2026.
- **WebSocket through Kestrel in Docker in a real browser**: now observed in Chromium (see the note under Checks). This is evidence only, not a check.

## Faults injected

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 ticket group name drops the institution (`chamado:{numero}`) | `api/Chamados/TempoRealGrupos.cs:6` | yes - C27 `TempoRealAvisosTests.cs:204` got `["ChamadoMudou:ONE-1"]` |
| F2a `EntrarNoChamado` joins `numero` without `ChamadoRotas.Carregar` | `api/Chamados/TempoRealHub.cs:124-126` | yes - C9 `:165` (no HubException) |
| F2b join the group before the visibility check (exception still thrown) | `api/Chamados/TempoRealHub.cs:123` | yes - C9 `:168` got `["Sonda:chamado:2:ONE-1"]` |
| F2c `EntrarNaFila` joins every sector of the institution | `api/Chamados/TempoRealHub.cs:139` | yes - C10 `:190` got a third queue |
| F3 `ChamadoMudou` also carries `SetorId` | `api/Chamados/AvisarMudanca.cs:78` | yes - C30 `AvisarMudancaTests.cs:291` |
| F4 notices sent at SaveChanges even inside a transaction | `api/Chamados/AvisarMudanca.cs:51-52` | yes - C24 `AvisarMudancaTests.cs:191`, C25 `:232` |
| F4 against C23's named proof `Transferir_avisa_so_depois_do_commit_e_a_fila_ja_traz_o_chamado` | same | no - survived, Passed 3 of 3 runs |
| F5 the conversation handler sends the assistant text to `Clients.All` | `api/Assistente/NovaConversa.cs:32` | yes - C31 `ArquiteturaTests.cs:1062`; C29 `TempoRealAvisosTests.cs:275` received the text |
| F6 commit hook drops the pending notices (scheduler, `Transferencia`) | `api/Chamados/AvisarMudanca.cs:94` | yes - C22 `:117`, C23 `:135` |
| F7 `refetchInterval` condition inverted | `web/src/chamado.ts:58` | yes - C38 plus 2 of the 3 C39 base tests |
| F8 `onreconnected` no longer calls `entrarNosGrupos()` | `web/src/tempo-real.ts:82` | yes - C40 `tempoReal.test.tsx:192` |
| F9 web client connects to `/api/tempo-reall` | `web/src/tempo-real.ts:74` | no - survived; full Vitest 185/185 green, and no e2e spec names the hub |

## Gate

- `dotnet test api.Tests`: 405 passed, 0 failed (TRX; `TempoRealEntradaTests` 15, `AvisarMudancaTests` 9, `TempoRealAvisosTests` 10, `ArquiteturaTests` +4, each named test Passed individually)
- `npx vitest run`: 185 passed, 0 failed; the 23 named S3 proofs listed individually with `--reporter=verbose`
- `E2E_URL=http://localhost:8085 npm --prefix web run e2e` (with `E2E_INSTITUICAO=srverif`): 46 passed, 0 failed
- `dotnet build api -warnaserror:CA1502`: 0 errors; diff proofs C2/C3/C4/C17; gate scripts C46-C50: all exit 0

## Ranked gaps

1. **The web client's hub path is unproven** (F9 survived). Coverage row "hub path, both ends". Location: `web/src/tempo-real.ts:74`. If `withUrl` is wrong, real-time stops in production and falls back to polling, and every suite stays green. Fix: assert the URL, and the `withAutomaticReconnect` call, that the fake in `web/src/test/setup.ts` records; or add one e2e step against the real API that sees the `negotiate` succeed.
2. **C23's proof does not prove "nothing before CommitAsync"** (F4 survived C23's named proof 3 of 3 times). Location: `api.Tests/TempoRealAvisosTests.cs:135-137`. Fix: add `AvisarMudancaTests.Aviso_espera_o_commit_da_transacao` to C23's Proof lines (L-029), or assert the order directly, for example by holding the commit while the notice is checked.
3. **C22: per-task `FilaMudou` is asserted once for 3 tasks.** Location: `api.Tests/TempoRealAvisosTests.cs:118`. Fix: assert the count of `FilaMudou` (3), or assert per task.

Precision notes, not failing on their own: C49 (`Raiz` also gained `tempo-real.test.ts`, which C41 forces); C34 ("0 aviso" vs 2 pre-existing `CS8604` outside the diff); C9 (the "other institution" case uses a number absent from the caller's own institution).
