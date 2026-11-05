# Aviso no celular com a marca da instituição verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 7f46cfc..4f7b0ee (round 1 covered d13fcec..7f46cfc)
**Round**: 2 - scoped (fix diff `7f46cfc..4f7b0ee` + every round-1 non-PASS verdict: C6, C8, the isolation gap, C9; new C10)
**Verifier**: independent sub-agent (author != verifier)

The three round-1 gaps are closed at `4f7b0ee`, and every fault I re-injected on the surfaces the fix touched was killed. Nothing blocks. Findings, ranked:

1. **The C10 proof command skips one of its own four sites.** `checks.md` C10 names `EmailAnexoTests.cs:39`, but that assertion lives in class `EmailTests` (`api.Tests/EmailAnexoTests.cs:13`). The filter `FullyQualifiedName~EmailAnexoTests|…ExtrasTests|…PrazosTests`, run exactly as written, executes 4 tests: `Resposta_do_aluno_antes…`, `Resolve_no_7o_dia…`, and the two `PrazosTests`. It does not run `EmailTests.Resolucao_gera_email`, so the manual-resolve path (the main user path) is proven only by the full suite (C8). The claim still holds, because that test passed in the 577 run and fails when the subject is reverted. Fix: add `FullyQualifiedName~EmailTests.Resolucao_gera_email` to the C10 proof.
2. **The absence assertion at `api.Tests/ExtrasTests.cs:67` still proves something, but only for a different fault.** If the subject goes back to "foi resolvido", 3 of the 4 sites fail and `:67` passes. That is by construction: an absence check keyed on a literal cannot see a change of text. To see whether it guards anything, I injected a fault that queues the resolved e-mail after the student has already replied (no transition, no event). Then `:67` alone fails (line 67). The guard at `:64` (`DoesNotContain … Para == Resolvido`) does not see this fault. So at HEAD the assertion holds weight. Its weakness: if the subject text changes again and `:67` is not updated, it goes quiet without failing. Keying it on the chamado (no e-mail at all mentioning `{resolver}` other than the lembrete) would remove that weakness.
3. **An older frozen spec now contradicts the code.** `.specs/features/mvp-one/plan.md:483` (AC 123) and `.specs/features/mvp-one/checks.md:538` (C161) still state the subject as "foi resolvido". C10 changes it at the user's request (05/11), but mvp-one does not record that it was superseded.
4. **Go-live note from C9.** The first push in the manual check came with Chrome's default icon, because the old service worker was still active. Only after a tab reload did the institution icon appear (`checks.md` Handoff). Users with a cached old SW will see the default icon until their SW updates. This is a deploy expectation, not a defect.

## Binding sources

carried from 7f46cfc. Profile `standard`: this step does not run. The feature has no `plan.md`, and `checks.md` marks no source as binding.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | nomeCurto + icon v2 + EM_ATENDIMENTO -> exact JSON | full run, `Aprovado PushAgendadorTests.Payload_com_marca_da_instituicao` | carried from 7f46cfc (test unchanged by the fix): `api.Tests/PushAgendadorTests.cs:116` exact-JSON `Assert.Equal` | PASS |
| C2 | body by state, 5 cases | full run, 5 rows `Aprovado Corpo_pelo_estado_do_chamado(estado: …)` | carried from 7f46cfc: `api.Tests/PushAgendadorTests.cs:135` | PASS |
| C3 | no nomeCurto -> nome; no/removed icon -> default | full run, `Aprovado Payload_padrao_sem_aparencia(iconeRemovido: False/True)` | carried from 7f46cfc: `api.Tests/PushAgendadorTests.cs:155`. The helper `Payload` (`:44`) gained an optional `icone` that defaults to the old value, so its expected value is unchanged | PASS |
| C4 | no "chamado"/"One" title, no personal data | full run, `Aprovado Payload_exato_sem_dado_pessoal` | carried from 7f46cfc: `api.Tests/PushAgendadorTests.cs:94-97` | PASS |
| C5 | SW passes institution icon to showNotification | vitest `✓ sw.test.ts > aviso com o ícone da instituição` | `/api/instituicoes/univag/imagens/icone?v=2` matches the new regex at `web/src/sw.ts:25`; carried assertion `web/src/sw.test.ts:37` | PASS |
| C6 | icon only if it matches one of the two One formats; 9 listed inputs + unreadable payload -> default | vitest, 10 rows `✓ ícone só do próprio app (URL de fora / esquema javascript / sem barra inicial / barra dupla / barra invertida / tab / quebra de linha / codificado / número / ausente)` + `carga ilegível` | verified at 4f7b0ee: `web/src/sw.ts:25` tests `i` against the claim's two patterns, character for character: `^\/api\/instituicoes\/[a-z0-9-]{3,30}\/imagens\/icone\?v=[0-9]+$` or `^\/icons\/icon-[0-9]+\.png$`. Both alternatives are anchored, and JS `$` without `m` does not match before a trailing `\n`. Rows at `web/src/sw.test.ts:41-50`, assertion `:53` `toBe('/icons/icon-192.png')` | PASS |
| C7 | public icon route 200 without cookie, version = `imagens.icone`; two institutions in one cycle, each gets its own icon or the default | full run, `Aprovado Icone_do_payload_e_o_da_rota_publica` and `Aprovado Cada_item_usa_a_instituicao_da_linha`; the second also failed alone under fault (see Faults) | verified at 4f7b0ee: `api.Tests/PushAgendadorTests.cs:295` gives only institution 1 an icon (v=2). `:303` expects `…/imagens/icone?v=2` for c1, and `:304` expects the default `Payload(c2…)` | PASS |
| C8 | suites green; only closed-list edits; build, crapper, dryer; encryption proof searches the whole plaintext | `dotnet test api.Tests` 577/577 exit 0; vitest 504/504 in 49 files; `dotnet build api` 0 warnings, 0 errors; web build exit 0; crapper exit 0; dryer clean | verified at 4f7b0ee: `api.Tests/PushEnviadorTests.cs:64` is `Assert.True(pedido.Corpo.AsSpan().IndexOf(System.Text.Encoding.UTF8.GetBytes(payload)) < 0, …)`, which fails under a plaintext POST. Every test edit in `7f46cfc..4f7b0ee` is on the extended closed list: items 4 and 5, plus the C10 extension (`checks.md:53-57`). None weakens a test (see below) | PASS |
| C9 | end to end in the user's Chrome | manual, carried from 32f62bd | `.specs/features/push-com-marca/checks.md:131`: `push_saida` 3 (04:00:54) arrived with title "Univag", the institution icon and "Sua solicitação ONE-4 tem uma resposta nova.", confirmed by the user | PASS (manual-confirmed) |
| C10 | resolved e-mail subject "[nome] {n} foi resolvida"; other subjects unchanged; 4 sites updated | C10 filter as written: 4 `Aprovado` (it does not include `EmailTests.Resolucao_gera_email`, finding 1); that test passed in the full run | verified at 4f7b0ee: `api/Chamados/Avisos.cs:25` `$"[{i.Nome}] {c.Numero} foi resolvida"`; the diff touches only that line, so the nova-resposta and aguardando subjects are unchanged. Sites: `api.Tests/EmailAnexoTests.cs:39`, `api.Tests/ExtrasTests.cs:67` and `:89`, `api.Tests/PrazosTests.cs:16` (a helper used by 2 tests) | PASS |

Named tests confirmed in the single full `dotnet test api.Tests` run (`--logger "console;verbosity=normal"`, 577 `Aprovado`, exit 0, 2.7 min, no hang). Each of these appears once: `Payload_com_marca_da_instituicao`, the 5 `Corpo_pelo_estado_do_chamado` rows, both `Payload_padrao_sem_aparencia` rows, `Payload_exato_sem_dado_pessoal`, `Icone_do_payload_e_o_da_rota_publica`, `Cada_item_usa_a_instituicao_da_linha`, `Real_envia_post_cifrado_com_vapid`, `Subscricao_movida_de_instituicao_nao_recebe_item_antigo`, `EmailTests.Resolucao_gera_email`, `ExtrasTests.Resposta_do_aluno_antes_preserva_prazos_aguardando`, `ExtrasTests.Resolve_no_7o_dia_aguardando`, `PrazosTests.Padroes_sem_configuracao`, `PrazosTests.Confirmacao_de_10_dias_fecha_no_10o_e_textos_dizem_10`.

### Test edits in the fix range

| Edit | Weakens a test? |
| --- | --- |
| `PushEnviadorTests.cs:55,64`: payload in a local; the encryption check searches the full UTF-8 payload | No. It strengthens the check, and it fails under a plaintext POST at line 64 |
| `PushAgendadorTests.cs:44` helper gains an optional `icone` (same default); `:290-303` adds an icon to institution 1 and expects it | No. Every existing call still gets the old expected JSON |
| `sw.test.ts:44-48` the `barra dupla` input changes host; 4 rows added | No. Same assertion, more inputs |
| `EmailAnexoTests.cs:39`, `ExtrasTests.cs:89`, `PrazosTests.cs:16` expect "foi resolvida" | No. They follow the code, and each fails when the subject is reverted |
| `ExtrasTests.cs:67` absence expects "foi resolvida" | No. With the old text it would be vacuous; with the new text it kills the queue-after-reply fault (finding 2) |

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| chamado state at send time (5) | carried from 7f46cfc (`api/Dados/Entidades.cs:39-43` untouched) | ABERTO, EM_ATENDIMENTO, AGUARDANDO_ALUNO, RESOLVIDO, FECHADO -> C2 rows; EM_ATENDIMENTO also C1 | - |
| title source (2) | carried from 7f46cfc (`api/Agendador.cs:220` untouched) | nomeCurto C1 · nome C3 | - |
| icon source (3) | carried from 7f46cfc (`api/Agendador.cs:221` untouched) | uploaded C1, C7 · none C3 · removed C3 | - |
| icon belongs to the sending institution (2 institutions in one cycle: with icon, without) | verified at 4f7b0ee: query filter `api/Agendador.cs:221`, test `api.Tests/PushAgendadorTests.cs:295-304` | own icon C7 (`Cada_item…` c1) · default for the other C7 (c2); killed alone under `.IgnoreQueryFilters()` | - |
| SW `icon` inputs (12: 2 accepted formats + 10 rejected classes) | verified at 4f7b0ee: regex `web/src/sw.ts:25` + WHATWG URL parsing | `/api/instituicoes/{slug}/imagens/icone?v=n` C5 · `/icons/icon-n.png`: no input-side test, but the only value the server sends is `/icons/icon-192.png` (`PayloadPush.IconePadrao`), and the fallback gives the same result, so dropping that branch is an equivalent mutant for real inputs · `https://` · `//` · `/\` · tab · newline · `javascript:` · `%2F%2F` · no leading slash · number · absent -> C6 rows | - |
| payload keys (4) | carried from 7f46cfc (`api/Chamados/PushEnviador.cs:30` untouched) | titulo C1 · corpo C1, C2 · url C1 · icone C1, C5 | - |
| paths that queue the resolved e-mail (3) | verified at 4f7b0ee: callers of `Avisos.Resolvido` (manual resolve endpoint; `api/Agendador.cs:187` auto-resolve; the race guard `:183`) | manual resolve `EmailAnexoTests.cs:39` · auto-resolve `ExtrasTests.cs:89`, `PrazosTests.cs:16` · race (student replied) -> none sent `ExtrasTests.cs:67` | - |
| e-mail subjects (3) | verified at 4f7b0ee: `api/Chamados/Avisos.cs` | resolvida C10 · nova resposta / aguarda sua resposta: unchanged lines, carried | - |

## Test policy rows

carried from 7f46cfc. `checks.md` has no `Test policy` section, and the fix touched no file that a policy row classifies. The repo convention still applies: agendador/HTTP-level tests for the API, unit tests for the SW.

## Swept existing

carried from 7f46cfc (failure modes, idempotency by `tag`, observability). The fix does not touch those paths.

## Faults injected

Applied in `git worktree` `.wt-verify` at `4f7b0ee`, with a `web/node_modules` junction. Each fault was reverted before the next. The junction was removed with `cmd /c rmdir` and the worktree was removed and pruned. The real tree's porcelain matches the baseline (`.idea/`, `.playwright-mcp/`, `web/apresentacao/` only).

| Mutation | Location | Killed |
| --- | --- | --- |
| old prefix-only guard (`startsWith('/') && !startsWith('//')`) | `web/src/sw.ts:25` | yes - `ícone só do próprio app` (barra invertida), (tab) and (quebra de linha) fail, 3 of 23 |
| guard also accepts any string starting with `/\` (`/\evil.com/x.png`) | `web/src/sw.ts:25` | yes - `ícone só do próprio app (barra invertida)` fails |
| icon of another institution (`.IgnoreQueryFilters()` on the icon query) | `api/Agendador.cs:221` | yes - `Cada_item_usa_a_instituicao_da_linha` fails when run alone in its own process (1/1), so the kill no longer depends on fixture leftovers |
| plaintext POST of the payload (plain `HttpRequestMessage`, `Content-Encoding: aes128gcm` and the vapid header kept) | `api/Chamados/PushEnviador.cs:25` | yes - `Real_envia_post_cifrado_com_vapid` fails at `PushEnviadorTests.cs:64` "o corpo deve ir cifrado"; the method/URI/encoding/vapid assertions before it pass |
| subject back to "foi resolvido" | `api/Chamados/Avisos.cs:25` | yes - `EmailTests.Resolucao_gera_email`, `ExtrasTests.Resolve_no_7o_dia_aguardando`, `PrazosTests.Padroes_sem_configuracao` and `PrazosTests.Confirmacao_de_10_dias…` fail. The absence site `ExtrasTests.cs:67` passes, as it must by construction (finding 2) |
| resolved e-mail queued even when the student replied first (`n == 0` branch queues `Avisos.Resolvido`, no transition) | `api/Agendador.cs:183` | yes - `Resposta_do_aluno_antes_preserva_prazos_aguardando` fails at `ExtrasTests.cs:67`, the absence assertion alone |

## Gate

All verified at 4f7b0ee:

- `docker compose up -d postgres mailpit minio`: already running. The `api` container on :8080 and `.env` were left untouched.
- `dotnet test api.Tests`: 577 passed, 0 failed, exit 0. One process (Debug ran; Smart App Control did not block it).
- `cd web && npx vitest run`: 504 passed, 0 failed (49 files).
- `dotnet build api`: 0 warnings, 0 errors.
- `npm --prefix web run build`: exit 0.
- `npm --prefix web run coverage && crapper --use-existing-coverage -s src --threshold 9.99`: exit 0.
- `dryer` (C61 list + `src/LinksDaResposta.tsx` `src/Balao.tsx`, `--threshold 0.8`): "No duplicate candidates found."
- C10 proof as written: 4 passed (see finding 1).
