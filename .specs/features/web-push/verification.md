# Web Push verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: c9535d2..84ae70b. The checks base is `f30a358`, but the diff proofs compare with `c9535d2` because `f30a358` predates the `arquivos-minio` and `tempo-real-signalr` builds. Feature commits: 9db8dcd, 1bcbfa3, 5e5be5d, eab5a64, d793ca1, 59e3005, a831fb3, ebce678, 6dd3fe9, 84ae70b. ed1d57a is roadmap docs.
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All proofs ran at `84ae70b` in a detached worktree, against the running compose postgres and minio, one suite at a time:
- `dotnet test api.Tests`: 449/449 (TRX). All 45 named filters matched at least one test and passed.
- `npx vitest run`: 209/209 in 34 files.
- `npm --prefix web run build`: exit 0.
- `precache_completo.py`: `--autoteste ok` and 17 URLs, 0 problems.
- `dotnet build api`: 0 warnings.
- `crapper` exit 0. The highest new value is `AvisosPush` at 9.2.
- `dryer`: "No duplicate candidates found."
- interface-nova gates against `b2e7e79`: `seletores_conferem`, `consultas_preservadas` and `chamadas_iguais` all 0 problems.
- Playwright: 50/50 on the image `one-push-verify` on :8083. The image ran with `Push__*` test keys made by its own `push chaves`, a throwaway database `one_pushverify` and bucket `one-pushverify`, and institution `pv1103` created by `instituicao criar`.

**Cleanup**: the container, the image tag, the temp database and the bucket were removed. The worktree was removed. The real tree's `git status --porcelain` matches the baseline.

## Binding sources

The profile is `standard`, so step 1 does not run. No design is binding. The plan, `STATE.md` (AD-008, AD-022, AD-024, AD-025) and the user ruling on C33 of 03/11/2026 were read as inputs.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | API suite green; existing assertions changed only by moved numbers | `dotnet test api.Tests` 449/449 at HEAD | Diff vs `c9535d2`: only counts and lists change (`ArquiteturaTests.cs` 58->61, 61->64, 29->30, 54->55, lists +`AtivarPush`/`DesativarPush`/`VerChavePush`; `MediatorTests.cs:29`, `:45`; `SessaoTests.cs:34`; `RetratoTests.cs:39`, `:43`, `:46`). Nothing loosened. Intermediate commits were not re-run | PASS |
| C2 | GET chave 200, one key | Passed | `api.Tests/PushRotasTests.cs:31` OK; `:33` the only key is `chavePublica`; `:34` it equals the configured key | PASS |
| C3 | 404 in 3 key states x 2 routes; DELETE 204 without keys | Passed (2 filters) | `api.Tests/PushRotasTests.cs:41` 3 states; `:45`, `:46` NotFound; `:66` NoContent | PASS |
| C4 | POST 204, empty body, row with cookie user and institution | Passed | `api.Tests/PushRotasTests.cs:75`, `:76` `""`; `:78` `(UsuarioId, InstituicaoId, P256dh, Auth)` | PASS |
| C5 | 6 invalid entries -> 400 ProblemDetails, nothing stored; 2048 accepted | Passed (2) | `api.Tests/PushRotasTests.cs:19-23` (status, title "Requisição inválida", detail); `:87-92` the 6 entries; `:95` Empty; `:103-104` 2048 -> NoContent | PASS |
| C6 | existing endpoint moves, 3 cases | Passed | `api.Tests/PushRotasTests.cs:119`, `:123`, `:127` single row with the new owner, institution and keys | PASS |
| C7 | 11th removes the oldest by `registrada_em`; 10 kept; other user intact | Passed | `api.Tests/PushRotasTests.cs:142`, `:150-153`, `:154` | PASS |
| C8 | DELETE 204 x4, deletes only own row | Passed; F1 killed | `api.Tests/PushRotasTests.cs:168`, `:170-172` | PASS |
| C9 | DELETE 400 when the endpoint is missing or empty | Passed | `api.Tests/PushRotasTests.cs:180-182` | PASS |
| C10 | 401 on all 3 routes | Passed | `api.Tests/PushRotasTests.cs:189-191` | PASS |
| C11 | rotas.txt +3 lines, 0 removed; counts +3 | both diff proofs exit 0 vs `c9535d2`; test Passed | `api.Tests/Retratos/rotas.txt:62-64` right before the fallbacks; `api.Tests/RetratoTests.cs:39` 66, `:43` 63, `:46` 64 | PASS |
| C12 | both tables have `instituicao_id`, FK, filter | Passed | `api.Tests/ArquiteturaTests.cs:20` (+2 tables); `:50-57`, `:61` | PASS |
| C13 | 26 entity types, one per file under `Dados/Push` | Passed | `api.Tests/ArquiteturaTests.cs:546-555`; `api/One.Api.csproj:40` and `api.Tests/One.Api.Tests.csproj:36` add the `Using` | PASS |
| C14 | global unique index, cascade, 7+7 columns | Passed (3) | `api.Tests/PushBancoTests.cs:31` UniqueViolation; `:56` only the other subscription's row remains; `:62-63` | PASS |
| C15 | entity methods, 2^n, no public setter | Passed (4) | `api.Tests/PushDominioTests.cs:13`, `:16`, `:29`, `:39`, `:50`; F7 killed | PASS |
| C16 | `push chaves`: 2 lines, 65/32 bytes, different pairs, usage + exit 1 | Passed (3); also `docker run one-push-verify push chaves` printed both lines | `api.Tests/PushComandoTests.cs:19`, `:21`, `:25-27`, `:31`, `:39`; call site `api/Program.cs:24` | PASS |
| C17 | each `Push:*` key read once | Passed | `api.Tests/ArquiteturaTests.cs:1091-1092`; `api/Chamados/ConfigPush.cs:8` | PASS |
| C18 | compose passes the 3 variables; no private key in appsettings; `.env` ignored | Passed | `api.Tests/ArquiteturaTests.cs:1102`, `:1107`, `:1109`; `docker-compose.yml:61-63` | PASS |
| C19 | glossary has both terms | Passed | `api.Tests/ArquiteturaTests.cs:1118`; `.specs/GLOSSARIO.md:63-64` | PASS |
| C20 | 5 origins, 1 PushSaida per device, same clock | Passed | `api.Tests/PushAvisosTests.cs:28-30`, called at `:40`, `:42`, `:45`, `:53`, `:62` | PASS |
| C21 | no subscription, or no private key: e-mail only | Passed; F10 killed | `api.Tests/PushAvisosTests.cs:78-79`, `:89-90` | PASS |
| C22 | transaction failure leaves no e-mail, push or message | Passed; F5 killed | `api.Tests/PushAvisosTests.cs:120`, `:122-124` | PASS |
| C23 | only the requester is notified | Passed; F3 killed | `api.Tests/PushAvisosTests.cs:143-145` | PASS |
| C24 | push package pinned, no other push library | Passed | `api.Tests/ArquiteturaTests.cs:1126-1127` asserts `Lib.Net.Http.WebPush` 3.3.1. The check text still says `WebPush` 1.0.13. The user's ruling of 03/11 replaced that library, and the test edit (`59e3005`) changes only the name and version | PASS (against the ruling) |
| C25 | Ler reads 2 rows and skips 3 | Passed; F8 killed | `api.Tests/PushAgendadorTests.cs:57-58` | PASS |
| C26 | 1 call with endpoint, keys and payload; EnviadoEm set; no resend | Passed | `api.Tests/PushAgendadorTests.cs:70`, `:71`, `:75` | PASS |
| C27 | exact payload, 3 keys, no personal data | Passed; F4 killed | `api.Tests/PushAgendadorTests.cs:89`, `:90`, `:92-93` | PASS |
| C28 | 404/410 delete the subscription and all its rows | Passed x2; F6 killed (410 case) | `api.Tests/PushAgendadorTests.cs:114`, `:115`, `:119` | PASS |
| C29 | other failures: 2..32 min, 4 Warnings, 1 Error, stops | Passed; F7 killed | `api.Tests/PushAgendadorTests.cs:140`, `:145-147`, `:149-151` | PASS |
| C30 | sent between Ler and Processar: not resent | Passed | `api.Tests/PushAgendadorTests.cs:166-167` | PASS |
| C31 | a failing or hanging push does not block the cycle (30 s) | Passed | `api.Tests/PushAgendadorTests.cs:189-192`, `:200`, `:204-205` | PASS |
| C32 | each row uses its own institution; a moved subscription gets nothing | Passed (2); F2 killed | `api.Tests/PushAgendadorTests.cs:218-219`, `:236-237` | PASS |
| C33 | real sender: aes128gcm, `vapid t=,k=`, encrypted body; 404/410 exposed | Passed (2 filters, 3 tests); F11 killed | `api.Tests/PushEnviadorTests.cs:59`, `:60-62`, `:63`, `:74`. The 404/410 test edit changes only the exception type | PASS |
| C34 | production resolves the real sender | Passed | `api.Tests/PushEnviadorTests.cs:79`; `api/Program.cs:63`. The text names `WebPushClient`, which the ruling replaced with `PushServiceClient` (`api/Chamados/PushEnviador.cs:18`) | PASS (against the ruling) |
| C35 | build 0 with CA1502 <= 10 | `dotnet build api` exit 0, 0 warnings; test Passed | `api.Tests/ArquiteturaTests.cs:260`, `:263`; the switch moved to `api/Agendador.cs:94-105` | PASS |
| C36 | Vitest whole + build; nothing loosened | 209/209; build exit 0 | `web/src/test/interface.test.ts:89-90` replace the `vite.config.ts` denylist assertion with the same list read from `sw.ts`. Same claim at the same textual strength, because `navigateFallbackDenylist` no longer exists under `injectManifest` | PASS |
| C37 | structure test; only `Raiz` edited | Passed | `web/src/test/estrutura.test.ts:10` (the only changed line); `web/src/assistente/avisos.test.tsx:50` | PASS |
| C38 | crapper 9.99 | exit 0 | `AvisosPush` 9.2 (`web/src/AvisosPush.tsx:10`), `lerCarga` 6.1 | PASS |
| C39 | dryer, new files listed | grep hit | `web/src/sw.ts:1`, `web/src/push.ts:1`, `web/src/AvisosPush.tsx:1` are in the path list; "No duplicate candidates found." | PASS |
| C40 | injectManifest config, `sw.js` at root, precache complete, autotest | 3 commands exit 0 | `web/vite.config.ts:13-16`, `:33`; `.specs/features/interface-nova/precache_completo.py:35-36` (2 new cases; the 5 old ones unchanged, `:30-34`) | PASS |
| C41 | existing SW e2e green | Passed on :8083 | `web/e2e/plataforma.spec.ts:21`, `:29` | PASS |
| C42 | push handler: title, body, tag; 4 fallback loads | Passed (5 tests); W2 killed | `web/src/sw.test.ts:17`, `:20-21`, `:30` | PASS |
| C43 | notificationclick, 3 cases | Passed (3); W3 killed | `web/src/sw.test.ts:50-53`, `:59-60`, `:66` | PASS |
| C44 | sw.ts registers the fallback with a denylist | Passed | List: `web/src/sw.test.ts:72-74`. Registration: only the text `denylist: Negados` at `web/src/test/interface.test.ts:89` (`web/src/sw.ts:64`). W4 (route removed) passes C44's own proof and is caught only by `interface.test.ts`, which is outside C44's Proof line | PASS (proof-line gap, see Faults) |
| C45 | hidden in 4 cases; appears in the 5th "with the text 'Ativar avisos neste aparelho'" | Passed (5) | `web/src/assistente/avisos.test.tsx:53`, `:59` match the accessible name. The button shows only an icon, with that string in `aria-label`/`title` (`web/src/AvisosPush.tsx:30-35`). There is no visible text, so the claim's "texto" is not met. The builder chose this to fit 360 px, with no user ruling (L-027) | DEVIATION (needs a ruling) |
| C46 | permission only on tap; order; disabled; "the text becomes 'Desativar avisos'" | Passed (3); W1 killed | `web/src/assistente/avisos.test.tsx:66`, `:68`, `:78`, `:80-82`, `:91`, `:93`. Behaviour is proven. The label change is again accessible name only, with no visible text (same deviation as C45) | DEVIATION (needs a ruling) |
| C47 | denied: message, 0 subscribe, 0 API | Passed | `web/src/assistente/avisos.test.tsx:100-102` | PASS |
| C48 | Desativar: `unsubscribe`, DELETE with body `{ endpoint }`, back to "Ativar avisos neste aparelho" | Passed | `web/src/assistente/avisos.test.tsx:109-110` assert `unsubscribe` and `DELETE ...?endpoint=` (a query string, not a body: a builder decision in batch 1, with no ruling). Nothing asserts the return to "Ativar avisos neste aparelho". The fake's `unsubscribe` (`:11`) does not clear the subscription that `getSubscription` returns (`:19-22`), so the test could not observe the return | FAIL |
| C49 | button only for ALUNO, 4 role sets | Passed (4) | `web/src/assistente/avisos.test.tsx:113-127`; `web/src/Autenticado.tsx:155` | PASS |
| C50 | `/sw.js` 200, JS, push + notificationclick; registered `/sw.js` | Passed on :8083 | `web/e2e/push.spec.ts:16-20`, `:24` | PASS |
| C51 | button visible; permission still `default` after load; 404 -> no button | Passed (2) | `web/e2e/push.spec.ts:37`, `:38` `permissions.query` = `prompt`, `:39` 0 `requestPermission` calls, `:47`. I confirmed that headless Chromium reports `Notification.permission` = `denied` while `permissions.query` = `prompt` on a fresh context. The check fixed a value that headless Chromium cannot show, so this is a precision gap; the substitute proves the claim | PASS (precision gap) |
| C52 | no overflow or overlap at 4 widths | Passed | `web/e2e/push.spec.ts:52`, `:56`, `:63` | PASS |
| C53 | whole e2e green, N + 5 | 50/50 on :8083; `--list` 50 in 4 files | The new tests are 4 (C50 1 + C51 2 + C52 1), so 46 + 4 = 50. The check's "N + 5" is an arithmetic error in the check (L-021), and its own named proofs add up to 4 | PASS (precision gap) |

## Coverage

Recomputed from the code (routes, handlers, `Agendador`, `sw.ts`, `AvisosPush.tsx`) and from the plan's `Surface`, `Landing` and `Observable`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| GET/POST/DELETE statuses (3/4/3) | `VerChavePush.cs:16`, `AtivarPush.cs:23-27`, `DesativarPush.cs:18`, auth policy | all members proven: `PushRotasTests.cs:31`, `:45-46`, `:75`, `:19`, `:66`, `:168`, `:180`, `:189-191` | - |
| config state (5: both set, both empty, public only, private only, `Assunto` empty from coordinator note 3) | `ConfigPush.cs:6` | first 4 C2/C3; `Assunto` empty -> `api.Tests/PushRotasTests.cs:57` (GET only; that test is in no Proof line). F9 killed | - |
| POST refusals (6 + borders 2) | `AtivarPush.cs:25-27` | C5, `PushRotasTests.cs:87-92`, `:103`. The empty string, non-URI and whitespace-key sub-conditions share the same refusal and are not separate cases | - |
| existing endpoint (3), limit (3), DELETE by endpoint (4), DELETE without endpoint (2) | `AtivarPush.cs:32-40`, `DesativarPush.cs:19` | C6, C7, C8, C9 as cited | - |
| routes (3), tables (2), columns (7+7), entity methods (4), command args (3) | `rotas.txt`, `OneDb.cs`, migration, `Dados/Push/*`, `PushComando.cs:9` | C11, C12-C14, C15, C16 | - |
| `Avisos` origins (5), events (3), no-push conditions (2), recipients (3) | `Avisos.cs:11-33` and callers | C20, C21, C23 | - |
| `push_saida` read conditions (6: due, 4 attempts, future, sent, 5 attempts, subscription institution) | `Agendador.cs:64-65` | C25 (5), C32 (6th) | - |
| sender failures (6), attempts (5), cycle continuity (4) | `Agendador.cs:220-233`, `:83-91` | C28, C29, C31 | - |
| payload keys (3), excluded data (5) | `PushEnviador.cs:29-33` | C27 | - |
| worker loads (5), notificationclick (3) | `sw.ts:24-50` | C42, C43 | - |
| button conditions (5), roles (4), widths (4), permission states (3) | `web/src/push.ts:3`, `web/src/AvisosPush.tsx:11-14`, `web/src/Autenticado.tsx:155` | C45, C49, C52, C46/C47/C51 | - |
| button states from the plan's `Observable` (5: unsupported, loading, error, denied, unauthorised) | plan `Observable` rows "button Ativar avisos" | unsupported C45 · loading (disabled) C46 · denied C47 · unauthorised C49 · error: the plan maps "error and denied state" to AC 26, which covers only denial | error state: the POST or DELETE failing. `web/src/AvisosPush.tsx:23-24` toasts the message and is untested (it is the uncovered branch in crapper's 85.7%). After a POST failure the browser keeps its `PushSubscription` and the server has no row. On the next load the button reads "Desativar avisos" while nothing will ever be sent. That contradicts S1 ("vira uma subscrição guardada no servidor"), and no check covers it |
| one-way doors (6) | plan `Landing` + dated notes | C24/C33 (door 1 as ruled), C6/C7/C14, C14/C20/C25, C27/C42, C40/C41/C50, C16-C18 | - |
| startup config (3 places) | read directly: `api/Program.cs:62-63`, `api.Tests/Infra/OneFactory.cs` (`Push` fake unless `EnviadorPushReal`), `docker-compose.yml:61-63` | C34, C2/C26, C18 | - |
| build config (2 places) | `web/vite.config.ts:13-16`, `web/src/main.tsx:9` | C40, C50 (`/sw.js` compiled from `sw.ts`, with handlers and `scriptURL`) | - |

## Test policy rows

`checks.md` has no `Test policy` section, so the repo convention decides the level. Every claim that names a status, route or response shape (C2-C11) is proven over HTTP through `OneFactory`. Every browser claim (C41, C50-C53) is proven by Playwright against the real image. No level gap.

## Swept existing

- observability "existing": the `Enviar` e-mail pattern is real at `api/Agendador.cs:204-205`, and push mirrors it at `:231-232`.
- concurrency: AD-022 does fix one API instance.

## Faults injected

Each fault ran in the scratch worktree. Each was reverted with `git checkout` in the worktree, and the worktree porcelain was clean after each batch. Mutation tooling stays suspended by AD-025. All 11 API mutants compiled and failed their test.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 DELETE drops the `UsuarioId` filter (tenancy) | `api/Chamados/DesativarPush.cs:19` | yes - `Delete_204_nos_quatro_casos` |
| F2 `Ler` drops `s.InstituicaoId == p.InstituicaoId` (moved subscription) | `api/Agendador.cs:65` | yes - `Subscricao_movida_de_instituicao_nao_recebe_item_antigo` |
| F3 push queued to every subscription in the institution, not the requester's | `api/Chamados/Avisos.cs:16` | yes - `So_o_solicitante_recebe` |
| F4 payload number carries the ticket title (personal data) | `api/Agendador.cs:215` | yes - `Payload_exato_sem_dado_pessoal` |
| F5 `SaveChangesAsync` after the e-mail, before the push (separate transaction) | `api/Chamados/Avisos.cs:14` | yes - `Falha_na_transacao_nao_deixa_email_nem_push` |
| F6 only 404 deletes, 410 retries | `api/Agendador.cs:224` | yes - `Status_404_e_410_apagam_a_subscricao(Gone)` |
| F7 backoff `2^(n-1)` | `api/Dados/Push/PushSaida.cs:21` | yes - `Outras_falhas_repetem_e_desistem_na_quinta` |
| F8 `Ler` reads `Tentativas <= 5` (retry cap off by one) | `api/Agendador.cs:64` | yes - `Le_so_pendente_vencida_com_menos_de_5_tentativas` |
| F9 `Ligado` ignores an empty `Push:Assunto` | `api/Chamados/ConfigPush.cs:6` | yes - `Sem_assunto_o_push_fica_desligado` |
| F10 `Avisos` enqueues push with push disabled | `api/Chamados/Avisos.cs:15` | yes - `Sem_subscricao_ou_sem_chaves_so_email` |
| F11 sender scheme `WebPush` instead of `Vapid` | `api/Chamados/PushEnviador.cs:24` | yes - `Real_envia_post_cifrado_com_vapid` |
| W1 permission requested on render once the key arrives | `web/src/AvisosPush.tsx:13` | yes - "permissão só no toque" |
| W2 `tag` = whole url | `web/src/sw.ts:37` | yes - "push mostra a notificação com a tag do chamado" |
| W3 notificationclick does not close | `web/src/sw.ts:41` | yes - "toque na notificação" (2 failed) |
| W4 navigation fallback route removed | `web/src/sw.ts:64` | yes - by `web/src/test/interface.test.ts:89` in the C36 suite; C44's own proof "fallback de navegação nega a API" still passed (L-029) |

Precache completeness (C40) was proven directly instead of by a mutant: `precache_completo.py` checks every built `.js/.css/.html/.png/.svg/.woff2` against the injected manifest and found 17 URLs, 0 problems. Its autotest has a failing case for each omission class (`precache_completo.py:31-33`).

## Gate

- `dotnet test api.Tests`: 449 passed, 0 failed.
- `npx vitest run`: 209 passed, 0 failed.
- Playwright on :8083: 50 passed, 0 failed.
- `dotnet build api`, `npm run build`, `precache_completo.py`, `crapper`, `dryer`, `seletores_conferem`, `consultas_preservadas` and `chamadas_iguais`: all exit 0.

## Ranked gaps

1. **C48 is not proven.** No assertion shows the label returning to "Ativar avisos neste aparelho". The fake cannot show it, because `unsubscribe` leaves `getSubscription` returning the same subscription (`web/src/assistente/avisos.test.tsx:11`, `:19-22`, `:105-111`). DELETE also sends `?endpoint=` instead of the body `{ endpoint }`, a builder decision with no user ruling.
2. **The button's error state is not covered** (plan `Observable`, "error and denied state"). A POST failing after `subscribe` leaves the browser subscribed with no server row, and later loads show "Desativar avisos" (`web/src/AvisosPush.tsx:17-27`, `web/src/push.ts:12-16`). No AC or check covers it. It needs a ruling plus either a rollback (`unsubscribe` on POST failure) or a re-POST on load, with a test.
3. **C45/C46: the button has no visible text.** It is an icon with `aria-label`/`title`, where the checks say "texto". The reason (360 px) is sound, but it needs a user ruling to amend C45, C46 and C48, or the visible text comes back.
4. Precision gaps (non-failing):
   - C24/C34 still name `WebPush` 1.0.13 and `WebPushClient` after the ruling.
   - C51 fixes `Notification.permission = default`, which headless Chromium cannot show.
   - C53 says N + 5 where its own proofs add 4.
   - C44's Proof line omits `interface.test.ts`, the only test that asserts the route registration.
