# anexos-assistente verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 5e2034f..740abec (`main`)
**Round**: 1 - full
**Verifier**: fresh sub-agent with no inherited context, dispatched by the orchestrator (author != verifier)

Failing items, ranked:

1. **C40 FAIL.** The full e2e suite against an image of HEAD with default config gives 93 passed and 1 failed. The failure is `anexos.spec.ts:124` (the new C39 test), which gets 429 at `web/e2e/anexos.spec.ts:49` (`expect(r.status()).toBe(200)` in `entrar`). The `auth` limiter allows 5 requests per minute per IP (`api/Program.cs:126-127`, `api/appsettings.json:19`). The two tests in `anexos.spec.ts` now share that minute and together go over it. The failure is deterministic: it reproduced 3 times on a freshly restarted container (full suite, the file on its own, and C39 on a fresh institution). With `Limites__AuthPorMinuto=100` the same image gives 94/94, so the product works and the problem is the proof as written. `checks.md` `## Handoff` reports "e2e 94 verdes" without saying the limit was raised.
2. **C1 FAIL**, for two reasons:
   - The API suite at HEAD has 473 passed and 1 failed: `IndexacaoTests.Lotes_de_100_gravam_vetores` (`api.Tests/BuscaTests.cs:83`, `Assert.Equal([100, 100, 50], lotes)`, actual `[]`). It fails the same way at `5e2034f`: I ran it in a `git worktree` at the base and got 1 failed, `Expected [100,100,50] Actual []`. The feature does not touch that file. The failure is still red at HEAD.
   - The diff edits existing assertions outside the closed list at the top of `checks.md` (see "Edits to existing assertions" below). Every one of those edits only adds or increases.
3. **Coverage gap: `POST /api/conversas` → `503` is unproven.** The checks' Coverage row cites C16 for it. C16's test (`api.Tests/AnexoConversaTests.cs:220-233`) calls only `Seguinte(...)`, which is `POST /api/conversas/{id}/mensagens`. No test in `api.Tests` sends `POST /api/conversas` under `f.MinioFora()`: I searched `rg "MinioFora\(\)" -A2 api.Tests` and the only other hit is the download route, `:348`.

## Binding sources

Profile `standard`: step 1 (checking the checks against their binding sources) is a `ui` step and did not run. The plan's binding `## Sources` are three: the user's request, OpenAI pricing and deprecations, and `.specs/STATE.md` AD-012/015/021. None of them is a design that a selector could reach. The model `gpt-6-luna` (AD-015) is confirmed by C20's live call.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| n/a - profile standard, no design source | n/a | - | - |

## Checks

All API proofs ran in one invocation, `dotnet test api.Tests --logger trx` (474 tests). I parsed the TRX: each named method below appears exactly once with outcome `Passed`, except the one failure named in C1. All Vitest proofs ran in one invocation, `npx vitest run --reporter=verbose` (294 passed), and each named `-t` title appears in the output with ✓.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | full API suite green; only closed-list edits to existing assertions | `dotnet test api.Tests`: 473 passed, 1 failed | `api.Tests/BuscaTests.cs:83` - `Assert.Equal([100, 100, 50], lotes)` fails (actual `[]`), also at `5e2034f`. Edits outside the closed list: `api.Tests/ArquiteturaTests.cs:19`, `:371-372`, `:395`, `:415`, `:445`, `:528`, `:546`, `:740`, `:774`, `:964`; `api.Tests/MediatorTests.cs:29`, `:45`; `api.Tests/SessaoTests.cs:34`; `web/src/assistente/textos.test.tsx:35` | FAIL |
| C2 | multipart first message → 201, 1 row with nome/tipo/tamanho/hash, key prefix, same bytes | TRX `Primeira_mensagem_com_anexo_grava_objeto_e_linha` Passed | `api.Tests/AnexoConversaTests.cs:54` - `Assert.Equal(HttpStatusCode.Created, r.StatusCode)`; `:56` - `Assert.Equal(["conversaId", "resposta"], ...)`; `:65` - `Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(bytes)), anexo.Hash)`; `:66` - `Assert.StartsWith($"{c.Instituicao.Id}/anexos-conversa/", anexo.Chave)`; `:67` - `Assert.Equal(bytes, await f.Objeto(anexo.Chave))` | PASS |
| C3 | 3 files on /mensagens → 200 with only `resposta`, 3 rows with the 3 types | TRX `Mensagem_com_tres_anexos_grava_os_tres` Passed | `api.Tests/AnexoConversaTests.cs:78` - `Assert.Equal(HttpStatusCode.OK, ...)`; `:79` - `Assert.Equal(["resposta"], ...)`; `:81` - `Assert.Equal(["image/jpeg", "image/png", "application/pdf"], anexos.Select(a => a.Tipo))` | PASS |
| C4 | exactly 4 parts in order, data URLs, `anexo-3.pdf`, no `detail` | TRX `LlmRequisicaoTests.Anexos_vao_como_partes_da_mensagem` Passed | `api.Tests/LlmRequisicaoTests.cs:136` - `Assert.Equal(4, partes.Count)`; `:138-140` - full `GetRawText()` equality per part, including `"filename":"anexo-3.pdf"`; `:141` - `Assert.DoesNotContain("detail", ...)` | PASS |
| C5 | attachment re-sent while inside the last 10; absent once outside | TRX `Anexo_reenviado_enquanto_esta_nas_10_ultimas`, `Anexo_fora_das_10_ultimas_nao_vai` Passed | `api.Tests/LlmRequisicaoTests.cs:157` - `Assert.Equal("data:image/png;base64," + ..., partes[1]...url)`; `:172-174` - `Assert.False(TemAnexo(...))`, `DoesNotContain("image_url")`, `DoesNotContain("\"file\"")` | PASS |
| C6 | original name and CPF never reach the provider; text masked | TRX `Nome_original_do_anexo_nao_vai_ao_provedor` Passed | `api.Tests/LlmRequisicaoTests.cs:185` - `Assert.DoesNotContain(proibido, corpo)` over the 3 strings; `:187` - `Assert.Equal("meu cpf [número removido]", ...)` | PASS |
| C7 | no attachment → `content` is a string; existing assertions unedited | TRX `Sem_anexo_content_continua_texto` + all 11 `LlmRequisicaoTests` Passed | `api.Tests/LlmRequisicaoTests.cs:201` - `Assert.All(usuario, m => Assert.Equal(JsonValueKind.String, ...ValueKind))`. `git diff 5e2034f..HEAD -- api.Tests/LlmRequisicaoTests.cs` has 0 removed lines | PASS |
| C8 | JSON body still works; `ConversaTests` unedited; POST success snapshots unchanged | TRX `ConversaTests` (all) + `RetratoTests.Corpos_de_sucesso_iguais_aos_da_base` Passed | `git diff 5e2034f..HEAD -- api.Tests/ConversaTests.cs` is empty. A word-diff of `api.Tests/Retratos/sucessos.txt:1` onward shows exactly 16 tokens added, every one `"anexos":[]`, and none on a `POST /api/conversas*` line | PASS |
| C9 | first system message carries rule 8 literally | TRX `Regra_8_dos_anexos_no_prompt` Passed | `api.Tests/LlmRequisicaoTests.cs:212` - `Assert.Contains("8. Anexos do aluno servem só ... aparecem neles.", regras.Split((char)10)...)` on `Mensagens(...)[0]` | PASS |
| C10 | trecho not in the cited source → `sem_base` + `trecho_invalido` | TRX `Trecho_copiado_do_anexo_vira_sem_base` Passed | `api.Tests/AnexoConversaTests.cs:95-96` - `Assert.Equal("sem_base", ...)`, `Assert.Equal(SemBase, ...)`; `:98` - `Assert.Contains(f.Logs.Entradas, ... "Motivo" == "trecho_invalido")` (precision note P1) | PASS |
| C11 | 10 MiB+1 → 413 on both routes, nothing written, provider not called; exactly 10 MiB accepted | TRX `Arquivo_acima_de_10_MB_413_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:114-115` - `RequestEntityTooLarge` + `"O arquivo grande.png passa de 10 MB."` for `nova` and `seguinte`; `:117` - `Assert.Equal(antes, await Estado(c))` (messages, attachments, keys, provider calls); `:120` - 10 MiB → `OK` | PASS |
| C12 | GIF and text-as-`foto.png` → 415 on both routes, nothing written | TRX `Tipo_recusado_415_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:139-140` - `UnsupportedMediaType` + `$"O arquivo {arquivo.nome} não é PDF, JPG nem PNG."`; `:142` - `Assert.Equal(antes, await Estado(c))` | PASS |
| C13 | 4 on first / 2+2 → 400 `errors.anexos`; 2+1 → 200; nothing written | TRX `Quarto_anexo_400_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:156`, `:166` - `Assert.Equal("A conversa aceita até 3 anexos.", ...errors.anexos[0])`; `:157`, `:167` - `Assert.Equal(antes, await Estado(c))`; `:169` - 2+1 → `OK` | PASS |
| C14 | empty / 1001 chars with an attachment → 400 `errors.mensagem`, no new object | TRX `Texto_invalido_com_anexo_400_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:183` - `Assert.Equal("A mensagem deve ter de 1 a 1000 caracteres.", ...errors.mensagem[0])`; `:184` - `Assert.Equal(antes.chaves, ...f.Chaves())` | PASS |
| C15 | closed 409, another student's 404, full 409, with an attachment, no new object | TRX `Recusas_de_hoje_com_anexo_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:210-215` - status + exact `detail` for the 3 cases; `:216` - `Assert.Equal(antes, await Estado(c))` | PASS |
| C16 | MinIO down on write (/mensagens) → 503, message count unchanged, provider not called | TRX `Minio_fora_ao_gravar_503_sem_mensagem` Passed | `api.Tests/AnexoConversaTests.cs:229-232` - `ServiceUnavailable`, `"Armazenamento de arquivos indisponível."`, `antes.mensagens`, `antes.chamadasAoProvedor` | PASS |
| C17 | MinIO down on read → 200 `sem_base`, log `anexo_indisponivel` with institution and conversation, provider not called | TRX `Minio_fora_ao_ler_anexo_sem_base_sem_chamar_provedor` Passed | `api.Tests/AnexoConversaTests.cs:248-249` - `sem_base` / `SemBase`; `:250-251` - log with `Motivo`, `InstituicaoId`, `ConversaId`; `:252` - `Assert.Equal(antes, f.Llm.Corpos.Count)` | PASS |
| C18 | log field `Anexos` = 3 and 0 | TRX `Log_traz_a_quantidade_de_anexos` Passed | `api.Tests/LlmRequisicaoTests.cs:225-226` - `Assert.Equal(3, Anexos(com))`, `Assert.Equal(0, Anexos(sem))` | PASS |
| C19 | 3 × 10 MiB → 201, not the server's 413 | TRX `Tres_arquivos_de_10_MB_aceitos` Passed; e2e `anexos.spec.ts:124` passed in isolation | `api.Tests/AnexoConversaTests.cs:262` - `Assert.Equal(HttpStatusCode.Created, r.StatusCode)`; Kestrel half: `web/e2e/anexos.spec.ts:193` - `expect(tres.status(), ...).toBe(201)` (level note P2) | PASS |
| C20 | real OpenAI accepts the door-3 shape with `gpt-6-luna`; exit 0, exit 1 without key | `python .specs/features/anexos-assistente/provedor_aceita_anexos.py` → `HTTP 200, modelo gpt-6-luna, conteudo: '{"resumo":"Os anexos incluem uma imagem vermelha e um documento ...'`. A copy run from a tree with no `.env` → `LLM_CHAVE_API ausente no .env`, exit 1 | `.specs/features/anexos-assistente/provedor_aceita_anexos.py:87` - `return 0 if status == 200 and conteudo else 1`. Prints are only at `:56`, `:80`, `:83` and `:86`; none prints `segredo` | PASS |
| C21 | `dotnet build api` passes CA1502; no pending migration | `dotnet build api` → 0 warnings, 0 errors; `dotnet ef migrations has-pending-model-changes --project api` → "No changes have been made" (exit 0) | `api/One.Api.csproj:9` - `<WarningsAsErrors>$(WarningsAsErrors);CA1502;MSG0005</WarningsAsErrors>`; `api/CodeMetricsConfig.txt:1` - `CA1502(Method): 10` | PASS |
| C22 | GET conversa lists `anexos` {id,nome,tipo,tamanho} in order; `[]` otherwise; no `chave`/`hash` | TRX `Ver_conversa_lista_anexos_sem_chave_nem_hash` Passed | `api.Tests/AnexoConversaTests.cs:276-277` - `DoesNotContain("chave")`, `DoesNotContain("hash")`; `:282` - `Assert.Equal(["id", "nome", "tipo", "tamanho"], ...)`; `:283` - ids in saved order; `:287` - `Assert.Equal(0, mensagens[1]...GetArrayLength())` | PASS |
| C23 | owner downloads: 200, same bytes, Content-Type, Disposition with name, Length | TRX `Download_pelo_aluno_dono` Passed | `api.Tests/AnexoConversaTests.cs:300-304` - `OK`, `Assert.Equal(bytes, ...)`, `"image/png"`, `Assert.Contains("meu boleto.png", ...ContentDisposition)`, `Assert.Equal(bytes.Length, ...ContentLength)` | PASS |
| C24 | 5 denied cases → 404 "Anexo não encontrado.", no object read | TRX `Download_negado_404_sem_abrir_objeto` Passed | `api.Tests/AnexoConversaTests.cs:322-328` - 5 requests (other student, staff with no ticket, staff of another sector, other institution, unknown id); `:333-334` - `NotFound` + `"Anexo não encontrado."`; `:336` - `Assert.Equal(antes, f.LeiturasDeObjeto)` | PASS |
| C25 | MinIO down on download → 503 | TRX `Download_com_minio_fora_503` Passed | `api.Tests/AnexoConversaTests.cs:350` - `Assert.Equal(HttpStatusCode.ServiceUnavailable, r.StatusCode)` | PASS |
| C26 | rotas.txt gains exactly the one line; each count +1 | TRX `RetratoTests.Tabela_de_rotas_igual_a_da_base` Passed | `api.Tests/Retratos/rotas.txt:11` - `GET /api/conversas/anexos/{id:long} anonimo=False autorizacao=True limite=-` (diff: +1, -0); `api.Tests/RetratoTests.cs:39`, `:43`, `:46` - `Assert.Equal(67, ...)`, `(64, ...)`, `(65, ...)`, up from 66/63/64 at `<base>` | PASS |
| C27 | `anexo_conversa`: tenant filter, snake_case, FK not null to `mensagem_conversa` | TRX `ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro`, `ArquiteturaTests.Tabelas_snake_case_e_datas_timestamptz`, `Tabela_anexo_conversa_com_fk_nao_nula` Passed | `api.Tests/ArquiteturaTests.cs:50` - `Assert.Equal(TabelasDaInstituicao.Order(), ...)` (list includes `anexo_conversa` at `:19`); `:57` - `Assert.NotEmpty(e.GetDeclaredQueryFilters())`; `:123` - `Assert.Matches(snake, ...)`; `api.Tests/AnexoConversaTests.cs:367` - `Assert.Equal(["NO"], ...is_nullable...mensagem_conversa_id)`; `:369` - FK target `["mensagem_conversa"]` | PASS |
| C28 | "Anexar arquivo" button in the form opens file input with accept + multiple | vitest ✓ `botão Anexar arquivo abre o seletor de PDF, JPG e PNG` | `web/src/assistente/anexos.test.tsx:37-38` - `toHaveAttribute('accept', '.pdf,.jpg,.jpeg,.png')`, `toHaveAttribute('multiple')`; `:43` - `expect(abriu).toHaveBeenCalledTimes(1)`; `:44` - `closest('form')` not null | PASS |
| C29 | 2 chips in order with Remover buttons; removing leaves one | vitest ✓ `selos dos arquivos escolhidos e remover` | `web/src/assistente/anexos.test.tsx:52` - `expect(selos()).toEqual(['boleto.png', 'comprovante.pdf'])`; `:53-54` - both Remover buttons; `:58` - `toEqual(['comprovante.pdf'])` | PASS |
| C30 | disabled at 3 chosen and at 2 sent + 1 chosen; enabled at 2 chosen | vitest ✓ `Anexar arquivo desabilitado com 3 anexos na conversa` | `web/src/assistente/anexos.test.tsx:69`, `:73`, `:78` - `toBeEnabled()`; `:71`, `:80` - `toBeDisabled()` | PASS |
| C31 | FormData with `mensagem` + 2 `anexos`; chips cleared; 2 links with returned ids | vitest ✓ `envio com anexos vai em FormData e o balão mostra os links` | `web/src/assistente/anexos.test.tsx:101-104` - links `[['boleto.png','/api/conversas/anexos/41'],['extrato.pdf','/api/conversas/anexos/42']]`; `:106-108` - `toBeInstanceOf(FormData)`, `get('mensagem')`, `getAll('anexos')` names; `:109` - chip list gone | PASS |
| C32 | no attachment → JSON body; `conversa.test.tsx` unedited | vitest ✓ `sem anexo o envio continua em JSON` + all of `src/assistente/conversa.test.tsx` ✓ | `web/src/assistente/anexos.test.tsx:120` - `toEqual([['/api/conversas', { mensagem: 'preciso do boleto' }]])`. `git diff 5e2034f..HEAD -- web/src/assistente/conversa.test.tsx` is empty | PASS |
| C33 | 400/413/415/503 → API `detail` in the alert, text and chips kept | vitest ✓ `erro da API mantém texto e selos` | `web/src/assistente/anexos.test.tsx:136` - `toHaveTextContent(detail)`; `:137` - `toHaveValue('esse boleto está certo?')`; `:138` - `toEqual(['boleto.png'])`, looped over the 4 statuses at `:126-131` | PASS |
| C34 | literal help text below the field | vitest ✓ `texto de ajuda dos anexos` | `web/src/assistente/anexos.test.tsx:150` - `toBeVisible()`; `:152` - `compareDocumentPosition(...) & DOCUMENT_POSITION_FOLLOWING`; literal at `web/src/assistente/Anexos.tsx:7` | PASS |
| C35 | Vitest suite, build, crapper ≤ 9.99, dryer no candidate ≥ 0.8 | `npx vitest run` 294 passed; `npm --prefix web run build` exit 0; `npm --prefix web run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` exit 0; `dryer ... \| grep -q "No duplicate candidates found"` exit 0 | `web/.metrics/crap.edn:1` (written by crapper) and `web/.metrics/dry.edn:1` (written by dryer); the gate is the exit code of each command | PASS |
| C36 | team GET chamado: `anexos` exact keys on the student line that attached, `[]` on the other | TRX `Transcricao_do_chamado_traz_anexos_do_aluno` Passed | `api.Tests/AnexoConversaTests.cs:400` - `Assert.Equal(["id", "nome", "tipo", "tamanho"], ...)`; `:401-404` - id/nome/tipo/tamanho; `:405` - `Assert.Equal(0, doAluno[1]...GetArrayLength())` | PASS |
| C37 | staff who open the ticket download → 200 same bytes | TRX `Download_pelo_atendente_do_chamado` Passed | `api.Tests/AnexoConversaTests.cs:415-416` - `OK`, `Assert.Equal(bytes, ...)` | PASS |
| C38 | ticket transcript shows each student attachment as a link | vitest ✓ `transcrição mostra os anexos do aluno como links` | `web/src/chamados/chamado.test.tsx:119` - `expect(within(balao).getAllByRole('link').map(...)).toEqual([['boleto.png', '/api/conversas/anexos/41'], ['extrato.pdf', '/api/conversas/anexos/42']])` | PASS |
| C39 | e2e: student attaches PNG, link, same SHA-256 + `image/png`; admin opens the ticket and downloads the same bytes | `npx playwright test e2e/anexos.spec.ts -g "aluno anexa foto..." --list` → 1 test; run alone against HEAD image :8084 (institution with admin already initialised) → 1 passed. On a fresh institution → 429 (see C40) | `web/e2e/anexos.spec.ts:163` - `toMatch(/^\/api\/conversas\/anexos\/\d+$/)`; `:167` - `content-type` `image/png`; `:168` - `sha(...)` equal; `:183` - same href in the ticket; `:186` - same SHA for the team | PASS |
| C40 | full e2e suite green against the HEAD image | `E2E_URL=http://localhost:8084 npx playwright test` → 93 passed, 1 failed (default `Limites:AuthPorMinuto` 5); 94 passed only with `Limites__AuthPorMinuto=100` | `web/e2e/anexos.spec.ts:49` - `expect(r.status()).toBe(200)` receives 429, called from `:151` | FAIL |

### Edits to existing assertions (C1 second half)

The closed list allows: (1) `sucessos.txt` gaining `"anexos":[]`, (2) `rotas.txt` and the `RetratoTests` route counts, (3) `GLOSSARIO.md`, (4) no edits to `LlmRequisicaoTests`. Items (1), (2) and (4) were checked and match: the word-diff of `sucessos.txt` contains only `"anexos":[]` (16×); `rotas.txt` is +1/-0; the `RetratoTests` counts are 66/63/64 → 67/64/65; `LlmRequisicaoTests` has no removed line. These edits fall outside the list. `checks.md` `## Handoff` "Settled mid-build (2)" discloses them, but they were never added to the closed list:

| File:line | Edit | Direction |
| --- | --- | --- |
| `api.Tests/ArquiteturaTests.cs:19` | `anexo_conversa` added to `TabelasDaInstituicao` | adds (stricter: the new table must have the tenant filter) |
| `api.Tests/ArquiteturaTests.cs:371-372` | 61→62 messages; `Assistente` 7→8 | increases |
| `api.Tests/ArquiteturaTests.cs:395`, `:445`, `:774` | 61→62 handlers/messages | increases |
| `api.Tests/ArquiteturaTests.cs:415` | 64→65 `Map*` | increases |
| `api.Tests/ArquiteturaTests.cs:528` | `AnexoConversa` added to `EntidadesPorPasta` | adds |
| `api.Tests/ArquiteturaTests.cs:546` | 26→27 entities | increases |
| `api.Tests/ArquiteturaTests.cs:740` | `BaixarAnexoConversa` added to `SemCorpoJson` | adds an exemption for the new message only (rule at `:775` no longer requires it to have a JSON body); no existing member is loosened |
| `api.Tests/ArquiteturaTests.cs:964` | `Assistente/Assistente.cs` and `Assistente/BaixarAnexoConversa.cs` added to the allowed callers of `.Baixar(` | widens an allowlist to admit 2 new callers; no existing member is loosened |
| `api.Tests/MediatorTests.cs:29` | 61→62 | increases |
| `api.Tests/MediatorTests.cs:45` | `(9, 52)` → `(9, 53)` | increases |
| `api.Tests/SessaoTests.cs:34` | 59→60 private routes | increases |
| `web/src/assistente/textos.test.tsx:35` | new help literal added to the visible-texts list | adds |

None of these weakens an assertion on existing code. Two of them (`:740`, `:964`) widen an allowlist so that the new code can pass. They are still outside the approved closed list, so C1's second clause is not met as written.

## Coverage

I recomputed each route's statuses from `plan.md` `## Surface` and the handlers, and the other sets from `plan.md` `Landing`/AC and the code, not from the checks' table.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST /api/conversas` statuses (7) | plan Surface; `NovaConversa.cs`, `ConversaRotas.cs` | 201 `AnexoConversaTests.cs:54`, `:262` · 400 `:156`, `:183` · 403 `AssistenteTests.cs:83` (the checks' row cites `ConversaTests`, but the 403 lives in `AssistenteTests`) · 413 `:114` (`nova`) · 415 `:139` (`Nova`) · 429 `RateLimitTests.cs:44` · 503: no test sends `POST /api/conversas` with `MinioFora()` | 503 (C16 covers only `/mensagens`) |
| `POST /api/conversas/{id}/mensagens` statuses (8) | plan Surface; `NovaMensagem.cs` | 200 `:78` · 400 `:166` · 404 `:212` · 409 `:210`, `:214` · 413 `:114` (`seguinte`) · 415 `:139` (`Seguinte`) · 429 `RateLimitTests.cs:45` · 503 `:229` | - |
| `GET /api/conversas/{id}` statuses (2) | plan Surface | 200 `AnexoConversaTests.cs:282` · 404 `ConversaTests.cs:109` | - |
| `GET /api/chamados/{numero}` statuses (2) | plan Surface | 200 `AnexoConversaTests.cs:400` · 404 `VisibilidadeTests.cs:370` | - |
| `GET /api/conversas/anexos/{id}` statuses (3) | `BaixarAnexoConversa.cs:23-24` + `ArmazenamentoIndisponivel` → 503 | 200 `:300`, `:415` · 404 `:333` · 503 `:350` | - |
| accepted types (3) | `Arquivos.Ler` signature check | JPEG/PNG/PDF `AnexoConversaTests.cs:81`, `LlmRequisicaoTests.cs:138-140` | - |
| refused types (2) | AC 9 | GIF, text-as-png `AnexoConversaTests.cs:131-132` → `:139` | - |
| size boundary (2) | AC 8 | 10 MiB+1 `:114` · 10 MiB `:120` | - |
| per-conversation limit (3) | `ConversaRotas.cs:55` | 4 `:156` · 2+2 `:166` · 2+1 `:169` | - |
| provider parts (3) | `Assistente.cs` `Conteudo` | text/image_url/file `LlmRequisicaoTests.cs:137-140` | - |
| history window (2) | `Assistente.cs` `Janela` (`TakeLast(10)`) | inside `LlmRequisicaoTests.cs:157`, `:168` · outside `:172` | - |
| current refusals with attachment (5) | AC 11, 12 | empty/1001 `AnexoConversaTests.cs:183` · closed/other/full `:210-215` | - |
| MinIO failures (3) | AC 13, 14, 20 | write `:229` (on `/mensagens` only, see first row) · read `:248` · download `:350` | - |
| who downloads (7) | `BaixarAnexoConversa.PodeVer` (`:28-33`) | owner `:300` · ticket staff `:415` · 5 denied `:322-334` | - |
| Assistente screen states (5) | plan Observable | empty `anexos.test.tsx:37`, `:150` · chosen `:52` · limit `:71` · sent `:101` · error `:136` | - |
| errors shown (4) | AC 25 | 400/413/415/503 `anexos.test.tsx:126-138` | - |
| send body (2) | `Assistente.tsx:45-50` | FormData `anexos.test.tsx:106` · JSON `:120` | - |
| one-way doors (5: 4 planned + Landing row 5 added during build) | plan Landing | 1 `AnexoConversaTests.cs:65-67`, `:367` · 2 `:78`, `ConversaTests` unchanged, `anexos.test.tsx:120` · 3 `LlmRequisicaoTests.cs:138-140` + C20 live · 4 `AnexoConversaTests.cs:300`, `:333`, `:415` · 5 (`TranscricaoDaEquipe` only) `:400` + `sucessos.txt` diff (student-side `transcricao` lines unchanged) | - |
| startup config: body limit (2 places) | `NovaConversa.cs:22` and `NovaMensagem.cs:22` `.WithMetadata(LimiteDoCorpo)`; `ConversaRotas.cs:16` | TestServer `AnexoConversaTests.cs:262` (cannot fail on the Kestrel limit) · real Kestrel in the HEAD image `web/e2e/anexos.spec.ts:193` | - |

## Test policy rows

`checks.md` has no `Test policy` section. The repo's conventions decide the level, and every claim that names a status, route or response shape has a proof that crosses HTTP (`WebApplicationFactory`).

## Faults injected

Each fault went into a scratch `git worktree` at HEAD (`D:/one-faults`), one at a time, and was restored before the next. I recorded the real tree's `git status --porcelain` before and after; it is unchanged (`?? .idea/`, `?? .playwright-mcp/`, `?? web/apresentacao/`). The worktree was then removed. Mutation tooling (`mutator`) is suspended by user decision (AD-025) and did not run.

| Mutation | Location | Killed |
| --- | --- | --- |
| PDF filename position off by one (`anexo-{posicoes[a.Id] - 1}.pdf`) | `api/Assistente/Assistente.cs` `Conteudo` | yes - `LlmRequisicaoTests.Anexos_vao_como_partes_da_mensagem` [FAIL] |
| limit bound `>` → `>=` | `api/Assistente/ConversaRotas.cs:55` | yes - `AnexoConversaTests.Quarto_anexo_400_sem_gravar` [FAIL] (2+1 refused) |
| message saved before the objects are written (ordering side effect) | `api/Assistente/ConversaRotas.cs:70` | yes - `AnexoConversaTests.Minio_fora_ao_gravar_503_sem_mensagem` [FAIL] |
| authorization: any ticket existing grants download (`return numero is not null;`) | `api/Assistente/BaixarAnexoConversa.cs:32` | yes - `AnexoConversaTests.Download_negado_404_sem_abrir_objeto` [FAIL] |
| web limit `>=` → `>` on the attach button | `web/src/assistente/Anexos.tsx:37` | yes - vitest `Anexar arquivo desabilitado com 3 anexos na conversa` × |

## Findings about the checks and tests

- **P1 (C10, precision).** The test makes the provider return a trecho ("Vencimento em 15/11 para Maria Silva") that is absent from the cited source. The attachment is a synthetic PNG from `Png()` that does not contain that text either (`api.Tests/AnexoConversaTests.cs:90-92`). So the proof exercises "trecho not in the cited source → `trecho_invalido`", which is existing behaviour, with an attachment present. It does not exercise "trecho that only exists in the attachment". The behaviour is the same because the check is anexo-agnostic, but the claim's precondition is not what the test sets up.
- **P2 (C19, level).** The `OneFactory` TestServer does not enforce Kestrel's 30 MB body limit, and the `## Handoff` says so. `AnexoConversaTests.cs:262` therefore cannot fail on the "not the server's 413" half of C19. That half is proven only by `web/e2e/anexos.spec.ts:193` inside C39, and that test is caught in the C40 rate-limit failure.
- **P3 (C39/C40, test design).** `anexos.spec.ts` makes more than 5 `auth`-policy requests per minute from one IP, counting both tests and the first-access path. Against an image with default `Limites:AuthPorMinuto`, C39 passes only alone and only once the admin's password is already set. The `## Handoff` e2e recipe does not say the limit was raised.
- **P4 (C28, precision).** AC 21 says the button sits "ao lado do campo de mensagem". C28, and its assertion `closest('form')` (`anexos.test.tsx:44`), only places it in the form.
- **P5 (test smell).** `api.Tests/LlmRequisicaoTests.cs:137` - `.Replace("á", "á").Replace("á", "á")` is a no-op on both calls. It is harmless, but it reads like a hidden normalisation.
- **P6 (process).** `plan.md` changed after the freeze commit `5e2034f`: Landing row 5 was added "(achada no build)" and the Impact row was edited. The check texts changed only by `[x]` marks; C35 carries a duplicate `[x] [x]`.
- **P7 (coverage table accuracy).** The checks' Coverage row for `POST /api/conversas` cites C16 for 503 (unproven, see above) and `ConversaTests` for 403 (the evidence is `AssistenteTests.cs:83`). For `GET /api/chamados/{numero}` 404 it cites `PermissoesChamadoTests` (I found the evidence in `VisibilidadeTests.cs:370` and `DocumentoTests.cs:422`).
- **Swept `existing` rows re-read.** `pendente={envio.isPending}` exists (`web/src/assistente/Assistente.tsx:437`), and `vazio = pendente || ...` disables Enviar. `PodeUsarAssistente` exists (`api/Assistente/ConversaRotas.cs:46`). Bucket versioning exists (`api/Armazenamento.cs:22`), and `Armazenamento.cs` has no delete. `ProvedorTests.Falhas_do_chat_viram_sem_base` exists (`api.Tests/ProvedorTests.cs:40`) and passed.

## Gate

- `dotnet test api.Tests` - 473 passed, 1 failed (`IndexacaoTests.Lotes_de_100_gravam_vetores`; also fails at `5e2034f`)
- `npx vitest run` - 294 passed, 0 failed; `npm --prefix web run build` ok; crapper exit 0; dryer no candidate
- `dotnet build api` ok; `has-pending-model-changes` clean
- `python .specs/features/anexos-assistente/provedor_aceita_anexos.py` - HTTP 200, exit 0 (1 paid call)
- e2e against an image of HEAD on :8084 (temp DB `one_anexos_verif`, bucket `one-anexos-verif`): 93 passed, 1 failed with default config; 94 passed with `Limites__AuthPorMinuto=100`. Container, image, DB, bucket and worktrees removed afterwards.
