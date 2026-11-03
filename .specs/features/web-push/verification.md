# Web Push verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: c9535d2..be21741. Round 2 scope: the fix diff `6f68cf3..be21741` (`4f89704` code and tests, `be21741` Handoff) and every round 1 verdict that was not PASS (C45, C46, C48, the button error state in Coverage, the C44 proof-line gap).
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Proofs re-ran in full at `be21741` in a detached worktree, against the running compose postgres and minio, one suite at a time:
- `dotnet test api.Tests`: 449/449. The fix does not touch `api/` or `api.Tests/`.
- `npx vitest run`: 213/213 in 34 files (209 + 4 new).
- `npm --prefix web run build`: exit 0.
- `precache_completo.py`: `--autoteste ok`; `api/wwwroot` 17 URLs, 0 problems.
- `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. Highest new: `AvisosPush` 9.0, `Autenticado` 8.0, `ativar` 5.0, `Mais` 4.0, `Avisos` 2.0, `alternar` (push) 2.0.
- `dryer` (C39 path list): "No duplicate candidates found."
- interface-nova gates against `b2e7e79`: `seletores_conferem` 0 problems, `consultas_preservadas` 389 queries 0 problems, `chamadas_iguais` 0 problems (run with `npm i --no-save react-bootstrap bootstrap bootstrap-icons`, then `npm prune`).
- Playwright: 51/51 (`--list` 51 in 4 files) on the image `one-push-verify2` on :8083, with `Push__*` test keys from its own `push chaves` (never written to the repo), database `one_pushverify2`, bucket `one-pushverify2`, institution `pv21103` from `instituicao criar`. Two earlier runs failed only `anexos.spec.ts:54`. The first run lacked the `E2E_INSTITUICAO`/`E2E_ADMIN_*` variables, so it fell back to `demo`. The second got 429 from the `primeiro-acesso` rate limit my own repeated runs had used up. After a container restart, one clean run passed 51/51.

**Cleanup**: the container, the image tag, the temp database, the bucket (all object versions, then the bucket itself) and the worktree were removed. The keys file was deleted. The real tree's `git status --porcelain` matches the baseline. A bucket `one-teste-1b1634a432f1` (an `OneFactory` name) was already in minio before my API run, and I left it alone.

## Binding sources

Carried from `84ae70b`. The profile is `standard`, so step 1 does not run. New input read: the user rulings of 03/11/2026 after round 1 (`checks.md` `## Handoff`, "Decisões do usuário depois da verificação rodada 1"). They amend C45, C46 and C48 and define the button error state.

## Checks

Rows marked *verified at be21741* were re-judged this round. All others are *carried from 84ae70b*: their files are outside the fix diff, and their proofs re-ran green at `be21741` inside the suite totals above.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | API suite green; existing assertions changed only by moved numbers | *verified at be21741*: `dotnet test api.Tests` 449/449 | The fix diff has no `api.Tests` file. The round 1 diff review is carried | PASS |
| C2 | GET chave 200, one key | *carried from 84ae70b* Passed | `api.Tests/PushRotasTests.cs:31` OK; `:33` the only key is `chavePublica`; `:34` it equals the configured key | PASS |
| C3 | 404 in 3 key states x 2 routes; DELETE 204 without keys | *carried from 84ae70b* Passed (2 filters) | `api.Tests/PushRotasTests.cs:41` 3 states; `:45`, `:46` NotFound; `:66` NoContent | PASS |
| C4 | POST 204, empty body, row with cookie user and institution | *carried from 84ae70b* Passed | `api.Tests/PushRotasTests.cs:75`, `:76` `""`; `:78` `(UsuarioId, InstituicaoId, P256dh, Auth)` | PASS |
| C5 | 6 invalid entries -> 400 ProblemDetails, nothing stored; 2048 accepted | *carried from 84ae70b* Passed (2) | `api.Tests/PushRotasTests.cs:19-23` (status, title "Requisição inválida", detail); `:87-92` the 6 entries; `:95` Empty; `:103-104` 2048 -> NoContent | PASS |
| C6 | existing endpoint moves, 3 cases | *carried from 84ae70b* Passed | `api.Tests/PushRotasTests.cs:119`, `:123`, `:127` single row with the new owner, institution and keys | PASS |
| C7 | 11th removes the oldest by `registrada_em`; 10 kept; other user intact | *carried from 84ae70b* Passed | `api.Tests/PushRotasTests.cs:142`, `:150-153`, `:154` | PASS |
| C8 | DELETE 204 x4, deletes only own row | *carried from 84ae70b* Passed; F1 killed | `api.Tests/PushRotasTests.cs:168`, `:170-172` | PASS |
| C9 | DELETE 400 when the endpoint is missing or empty | *carried from 84ae70b* Passed | `api.Tests/PushRotasTests.cs:180-182` | PASS |
| C10 | 401 on all 3 routes | *carried from 84ae70b* Passed | `api.Tests/PushRotasTests.cs:189-191` | PASS |
| C11 | rotas.txt +3 lines, 0 removed; counts +3 | *carried from 84ae70b* both diff proofs exit 0 vs `c9535d2`; test Passed | `api.Tests/Retratos/rotas.txt:62-64` right before the fallbacks; `api.Tests/RetratoTests.cs:39` 66, `:43` 63, `:46` 64 | PASS |
| C12 | both tables have `instituicao_id`, FK, filter | *carried from 84ae70b* Passed | `api.Tests/ArquiteturaTests.cs:20` (+2 tables); `:50-57`, `:61` | PASS |
| C13 | 26 entity types, one per file under `Dados/Push` | *carried from 84ae70b* Passed | `api.Tests/ArquiteturaTests.cs:546-555`; `api/One.Api.csproj:40` and `api.Tests/One.Api.Tests.csproj:36` add the `Using` | PASS |
| C14 | global unique index, cascade, 7+7 columns | *carried from 84ae70b* Passed (3) | `api.Tests/PushBancoTests.cs:31` UniqueViolation; `:56` only the other subscription's row remains; `:62-63` | PASS |
| C15 | entity methods, 2^n, no public setter | *carried from 84ae70b* Passed (4) | `api.Tests/PushDominioTests.cs:13`, `:16`, `:29`, `:39`, `:50`; F7 killed | PASS |
| C16 | `push chaves`: 2 lines, 65/32 bytes, different pairs, usage + exit 1 | *carried from 84ae70b* Passed (3); also `docker run one-push-verify push chaves` printed both lines | `api.Tests/PushComandoTests.cs:19`, `:21`, `:25-27`, `:31`, `:39`; call site `api/Program.cs:24` | PASS |
| C17 | each `Push:*` key read once | *carried from 84ae70b* Passed | `api.Tests/ArquiteturaTests.cs:1091-1092`; `api/Chamados/ConfigPush.cs:8` | PASS |
| C18 | compose passes the 3 variables; no private key in appsettings; `.env` ignored | *carried from 84ae70b* Passed | `api.Tests/ArquiteturaTests.cs:1102`, `:1107`, `:1109`; `docker-compose.yml:61-63` | PASS |
| C19 | glossary has both terms | *carried from 84ae70b* Passed | `api.Tests/ArquiteturaTests.cs:1118`; `.specs/GLOSSARIO.md:63-64` | PASS |
| C20 | 5 origins, 1 PushSaida per device, same clock | *carried from 84ae70b* Passed | `api.Tests/PushAvisosTests.cs:28-30`, called at `:40`, `:42`, `:45`, `:53`, `:62` | PASS |
| C21 | no subscription, or no private key: e-mail only | *carried from 84ae70b* Passed; F10 killed | `api.Tests/PushAvisosTests.cs:78-79`, `:89-90` | PASS |
| C22 | transaction failure leaves no e-mail, push or message | *carried from 84ae70b* Passed; F5 killed | `api.Tests/PushAvisosTests.cs:120`, `:122-124` | PASS |
| C23 | only the requester is notified | *carried from 84ae70b* Passed; F3 killed | `api.Tests/PushAvisosTests.cs:143-145` | PASS |
| C24 | push package pinned, no other push library | *carried from 84ae70b* Passed | `api.Tests/ArquiteturaTests.cs:1126-1127` asserts `Lib.Net.Http.WebPush` 3.3.1. The check text still says `WebPush` 1.0.13. The user's ruling of 03/11 replaced that library, and the test edit (`59e3005`) changes only the name and version | PASS (against the ruling) |
| C25 | Ler reads 2 rows and skips 3 | *carried from 84ae70b* Passed; F8 killed | `api.Tests/PushAgendadorTests.cs:57-58` | PASS |
| C26 | 1 call with endpoint, keys and payload; EnviadoEm set; no resend | *carried from 84ae70b* Passed | `api.Tests/PushAgendadorTests.cs:70`, `:71`, `:75` | PASS |
| C27 | exact payload, 3 keys, no personal data | *carried from 84ae70b* Passed; F4 killed | `api.Tests/PushAgendadorTests.cs:89`, `:90`, `:92-93` | PASS |
| C28 | 404/410 delete the subscription and all its rows | *carried from 84ae70b* Passed x2; F6 killed (410 case) | `api.Tests/PushAgendadorTests.cs:114`, `:115`, `:119` | PASS |
| C29 | other failures: 2..32 min, 4 Warnings, 1 Error, stops | *carried from 84ae70b* Passed; F7 killed | `api.Tests/PushAgendadorTests.cs:140`, `:145-147`, `:149-151` | PASS |
| C30 | sent between Ler and Processar: not resent | *carried from 84ae70b* Passed | `api.Tests/PushAgendadorTests.cs:166-167` | PASS |
| C31 | a failing or hanging push does not block the cycle (30 s) | *carried from 84ae70b* Passed | `api.Tests/PushAgendadorTests.cs:189-192`, `:200`, `:204-205` | PASS |
| C32 | each row uses its own institution; a moved subscription gets nothing | *carried from 84ae70b* Passed (2); F2 killed | `api.Tests/PushAgendadorTests.cs:218-219`, `:236-237` | PASS |
| C33 | real sender: aes128gcm, `vapid t=,k=`, encrypted body; 404/410 exposed | *carried from 84ae70b* Passed (2 filters, 3 tests); F11 killed | `api.Tests/PushEnviadorTests.cs:59`, `:60-62`, `:63`, `:74`. The 404/410 test edit changes only the exception type | PASS |
| C34 | production resolves the real sender | *carried from 84ae70b* Passed | `api.Tests/PushEnviadorTests.cs:79`; `api/Program.cs:63`. The text names `WebPushClient`, which the ruling replaced with `PushServiceClient` (`api/Chamados/PushEnviador.cs:18`) | PASS (against the ruling) |
| C35 | build 0 with CA1502 <= 10 | *carried from 84ae70b*; `api/` untouched by the fix, and it compiled in the API test run at HEAD | `api.Tests/ArquiteturaTests.cs:260`, `:263` | PASS |
| C36 | Vitest whole + build; nothing loosened | *verified at be21741*: 213/213; build exit 0 | The fix diff adds tests only. In `web/src/assistente/avisos.test.tsx` the only non-additive change is the fake `unsubscribe` at `:20`, which now clears the subscription. No assertion was removed or weakened (`:109-111` kept, `:112` added) | PASS |
| C37 | structure test; only `Raiz` edited | *verified at be21741*: passed in the 213 | `web/src/test/estrutura.test.ts:10`; no new file in the fix diff | PASS |
| C38 | crapper 9.99 | *verified at be21741*: exit 0 | `AvisosPush` 9.0 (`web/src/AvisosPush.tsx:11`); `alternar` moved to `web/src/push.ts:31`; `Avisos` at `web/src/Autenticado.tsx:88` | PASS |
| C39 | dryer, new files listed | *verified at be21741*: grep hit | "No duplicate candidates found." over the C39 path list (`web/src/push.ts:1`, `web/src/AvisosPush.tsx:1`, `web/src/Autenticado.tsx:1`) | PASS |
| C40 | injectManifest config, `sw.js` at root, precache complete, autotest | *verified at be21741*: 3 commands exit 0 | `web/vite.config.ts:13-16`; 17 URLs, 0 problems | PASS |
| C41 | existing SW e2e green | *verified at be21741*: in the 51 | `web/e2e/plataforma.spec.ts:21`, `:29` | PASS |
| C42 | push handler: title, body, tag; 4 fallback loads | *verified at be21741*: passed | `web/src/sw.test.ts:17`, `:20-21`, `:30` (the fix touches this file only after `:76`) | PASS |
| C43 | notificationclick, 3 cases | *verified at be21741*: passed | `web/src/sw.test.ts:50-53`, `:59-60`, `:66` | PASS |
| C44 | sw.ts registers the fallback with a denylist | *verified at be21741*: `-t "fallback de navegação nega a API"` runs 2 tests, both pass. G5 killed | `web/src/sw.test.ts:77-88` imports `sw.ts` with Workbox mocked. It asserts `registerRoute` called once (`:87`) and `NavigationRoute('h', { denylist: Negados })` (`:88`) against `web/src/sw.ts:64`. With the route commented out, the C44 proof itself goes red (1 failed, 1 passed). The round 1 gap is closed | PASS |
| C45 | hidden in 4 cases; appears in the 5th, with visible text in the drawer and "Mais" per the 03/11 ruling | *verified at be21741*: passed (5 + 2) and e2e passed. G1, G2, G7 killed | Hidden/shown: `web/src/assistente/avisos.test.tsx:53`, `:59`. Visible text: `:125-138` opens the drawer (`ALUNO`) and "Mais" (`ALUNO`+`ATENDENTE`). It finds the button whose `textContent` equals "Ativar avisos neste aparelho" (`:134`) and taps it. e2e at 360 px: `web/e2e/push.spec.ts:67-72`, text visible inside the drawer dialog. Code: `web/src/AvisosPush.tsx:32-38`; `web/src/Autenticado.tsx:115`, `:176`; bell in the bar `:162`, `web/src/AvisosPush.tsx:40`. Precision gap: C45's Proof line still names only the round 1 test, while the ruling's visible-text tests sit at `:125` | PASS (proof-line gap) |
| C46 | permission only on tap; order; disabled; text becomes "Desativar avisos" (visible in drawer/Mais per the ruling) | *verified at be21741*: passed (3 + 2) | `web/src/assistente/avisos.test.tsx:66`, `:68`, `:78`, `:80-82`, `:91`, `:93`. Visible "Desativar avisos" after tapping the item: `:137` (`textContent === 'Desativar avisos'`) | PASS (proof-line gap, as C45) |
| C47 | denied: message, 0 subscribe, 0 API | *verified at be21741*: passed | `web/src/assistente/avisos.test.tsx:100-102` | PASS |
| C48 | Desativar: `unsubscribe`, DELETE `?endpoint=` (ruling 03/11), back to "Ativar avisos neste aparelho" | *verified at be21741*: passed. G3 killed at `:112` | `web/src/assistente/avisos.test.tsx:110` `unsubscribe` once, `:111` `DELETE /api/push/subscricao?endpoint=<encoded>`, `:112` `expect(await botao(Ativar))`. The fake now clears the subscription (`:20`). With the post-deactivate refetch skipped (`web/src/AvisosPush.tsx:22`), the test fails at `:112` through `botao` (`:36`). The fixer never saw this go red; this round did | PASS |
| C49 | button only for ALUNO, 4 role sets | *verified at be21741*: passed (4) | `web/src/assistente/avisos.test.tsx:140-150`. The role check is now `Avisos` (`web/src/Autenticado.tsx:88-90`), fed by `aluno` (`:141`) in the bar, the drawer and "Mais" | PASS |
| C50 | `/sw.js` 200, JS, push + notificationclick; registered `/sw.js` | *verified at be21741*: in the 51 | `web/e2e/push.spec.ts:16-20`, `:24` | PASS |
| C51 | button visible; permission still `default` after load; 404 -> no button | *verified at be21741*: passed (2) | `web/e2e/push.spec.ts:37-39`, `:47`. Precision gap carried: headless Chromium reports `denied`, and `permissions.query` = `prompt` stands in for `default` | PASS (precision gap) |
| C52 | no overflow or overlap at 4 widths | *verified at be21741*: passed | `web/e2e/push.spec.ts:50-65`, unchanged by the fix. The header arrangement tests `web/e2e/arranjo.spec.ts:57`, `:85`, `:113-160` (3/5/7 links, no overlap, 360 px drawer) are unchanged since `c9535d2` (`git diff --stat` empty) and passed | PASS |
| C53 | whole e2e green, N + 5 | *verified at be21741*: 51/51; `--list` 51 in 4 files | 46 + 5 = 51 with the new drawer test (`web/e2e/push.spec.ts:67`). The round 1 arithmetic gap is gone | PASS |

## Coverage

Recomputed only for the rows whose code the fix touched (`AvisosPush.tsx`, `push.ts`, `Autenticado.tsx`, the `sw.ts` registration). The other rows are *carried from 84ae70b*, unchanged.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| button conditions (5), roles (4), widths (4), permission states (3) | *verified at be21741*: `web/src/push.ts:3`, `web/src/AvisosPush.tsx:12-15`, `web/src/Autenticado.tsx:88-90` | C45, C49, C52, C46/C47/C51 | - |
| button placements (3: bar bell, drawer item, "Mais" item) from the 03/11 ruling | *verified at be21741*: `web/src/Autenticado.tsx:115`, `:162`, `:176`; `web/src/AvisosPush.tsx:32-40` | bar `web/src/assistente/avisos.test.tsx:59` (accessible name, per the ruling) · drawer `:125-138` + `web/e2e/push.spec.ts:67-72` · "Mais" `avisos.test.tsx:125-138`. G1, G2, G7 killed | - |
| button states from the plan's `Observable` (5: unsupported, loading, error, denied, unauthorised) | *verified at be21741*: plan `Observable` + 03/11 ruling (error = POST fails after `subscribe`) | unsupported C45 · loading C46 · denied C47 · unauthorised C49 · error `web/src/assistente/avisos.test.tsx:115-122`: message shown (`:119`), `subscribe` once, rollback `unsubscribe` once (`:121`), button back to an enabled "Ativar" (`:122`). Code: `web/src/push.ts:16-21`, `web/src/AvisosPush.tsx:24`. G4, G6, G8 killed | - |
| Desativar outcomes (3: unsubscribe, DELETE `?endpoint=`, label back) | *verified at be21741*: `web/src/push.ts:25-28`, `web/src/AvisosPush.tsx:18-22` | C48 `avisos.test.tsx:110-112`, G3 killed | - |
| worker routes (fallback registration with denylist) | *verified at be21741*: `web/src/sw.ts:64` | C44 `web/src/sw.test.ts:87-88`, G5 killed | - |
| GET/POST/DELETE statuses (3/4/3) | *carried from 84ae70b*: `VerChavePush.cs:16`, `AtivarPush.cs:23-27`, `DesativarPush.cs:18`, auth policy | all members proven: `PushRotasTests.cs:31`, `:45-46`, `:75`, `:19`, `:66`, `:168`, `:180`, `:189-191` | - |
| config state (5: both set, both empty, public only, private only, `Assunto` empty from coordinator note 3) | *carried from 84ae70b*: `ConfigPush.cs:6` | first 4 C2/C3; `Assunto` empty -> `api.Tests/PushRotasTests.cs:57` (GET only; that test is in no Proof line). F9 killed | - |
| POST refusals (6 + borders 2) | *carried from 84ae70b*: `AtivarPush.cs:25-27` | C5, `PushRotasTests.cs:87-92`, `:103`. The empty string, non-URI and whitespace-key sub-conditions share the same refusal and are not separate cases | - |
| existing endpoint (3), limit (3), DELETE by endpoint (4), DELETE without endpoint (2) | *carried from 84ae70b*: `AtivarPush.cs:32-40`, `DesativarPush.cs:19` | C6, C7, C8, C9 as cited | - |
| routes (3), tables (2), columns (7+7), entity methods (4), command args (3) | *carried from 84ae70b*: `rotas.txt`, `OneDb.cs`, migration, `Dados/Push/*`, `PushComando.cs:9` | C11, C12-C14, C15, C16 | - |
| `Avisos` origins (5), events (3), no-push conditions (2), recipients (3) | *carried from 84ae70b*: `Avisos.cs:11-33` and callers | C20, C21, C23 | - |
| `push_saida` read conditions (6: due, 4 attempts, future, sent, 5 attempts, subscription institution) | *carried from 84ae70b*: `Agendador.cs:64-65` | C25 (5), C32 (6th) | - |
| sender failures (6), attempts (5), cycle continuity (4) | *carried from 84ae70b*: `Agendador.cs:220-233`, `:83-91` | C28, C29, C31 | - |
| payload keys (3), excluded data (5) | *carried from 84ae70b*: `PushEnviador.cs:29-33` | C27 | - |
| worker loads (5), notificationclick (3) | *carried from 84ae70b*: `sw.ts:24-50` | C42, C43 | - |
| one-way doors (6) | *carried from 84ae70b*: plan `Landing` + dated notes | C24/C33 (door 1 as ruled), C6/C7/C14, C14/C20/C25, C27/C42, C40/C41/C50, C16-C18 | - |
| startup config (3 places) | *carried from 84ae70b*: read directly: `api/Program.cs:62-63`, `api.Tests/Infra/OneFactory.cs` (`Push` fake unless `EnviadorPushReal`), `docker-compose.yml:61-63` | C34, C2/C26, C18 | - |
| build config (2 places) | *carried from 84ae70b*: `web/vite.config.ts:13-16`, `web/src/main.tsx:9` | C40, C50 (`/sw.js` compiled from `sw.ts`, with handlers and `scriptURL`) | - |

## Test policy rows

Carried from `84ae70b`: `checks.md` has no `Test policy` section, so the repo convention applies. The fix's new browser claim (visible text in the drawer) is proven in Vitest and by Playwright against the real image (`web/e2e/push.spec.ts:67`). No level gap.

## Swept existing

Carried from `84ae70b`.

## Faults injected

Round 2 faults (*verified at be21741*). Each ran in the scratch worktree against its targeted Vitest file and was reverted with `git checkout`. The worktree porcelain was clean after the batch. Mutation tooling stays suspended by AD-025.

| Mutation | Location | Killed |
| --- | --- | --- |
| G1 drawer avisos item removed | `web/src/Autenticado.tsx:176` | yes - "no(a) gaveta o item de avisos mostra o texto visível" |
| G2 "Mais" avisos item removed | `web/src/Autenticado.tsx:115` | yes - "no(a) Mais o item de avisos mostra o texto visível" |
| G3 C48: button stays "Desativar" after unsubscribe (refetch only when activating) | `web/src/AvisosPush.tsx:22` | yes - "desativar cancela e apaga a subscrição", at the new `:112` |
| G4 rollback `unsubscribe` on POST failure removed | `web/src/push.ts:19` | yes - "POST que falha depois do subscribe desfaz a inscrição..." |
| G5 fallback `registerRoute` commented out | `web/src/sw.ts:64` | yes - "fallback de navegação nega a API (rota registrada no worker)", inside C44's own `-t` |
| G6 error toast removed | `web/src/AvisosPush.tsx:24` | yes - "POST que falha ..." (`:119`) |
| G7 item variant without the visible label | `web/src/AvisosPush.tsx:36` | yes - both visible-text tests |
| G8 POST failure swallowed after the rollback (`return true`) | `web/src/push.ts:20` | yes - "POST que falha ..." |

Carried from `84ae70b`, outside the fix diff: F1-F11 (API) and W1-W3, all killed. Round 1's W4 is superseded by G5, which C44's own proof now kills.

## Gate

*verified at be21741*
- `dotnet test api.Tests`: 449 passed, 0 failed.
- `npx vitest run`: 213 passed, 0 failed.
- Playwright on :8083: 51 passed, 0 failed.
- `npm run build`, `precache_completo.py`, `crapper`, `dryer`, `seletores_conferem`, `consultas_preservadas` and `chamadas_iguais`: all exit 0.

## Ranked gaps

None blocking. Precision notes:
1. The Proof lines for C45 and C46 still name only the round 1 tests. The ruling's visible-text tests (`web/src/assistente/avisos.test.tsx:125`, `web/e2e/push.spec.ts:67`) and the error-state test (`:115`) are in no Proof line, so `checks.md` should name them.
2. A failing DELETE is not covered by the ruling, which defined the error state for POST only. In that case the browser is already unsubscribed (`web/src/push.ts:26` runs before the DELETE). The toast shows, but the label stays "Desativar avisos" until reload, because the refetch at `web/src/AvisosPush.tsx:22` is skipped. A second tap retries the DELETE, so no data is lost. No test covers it.
3. Carried from round 1: C24/C34 still name `WebPush` 1.0.13 and `WebPushClient`. C51 still fixes `default`, which headless Chromium reports as `denied`.
