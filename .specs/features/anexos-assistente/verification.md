# anexos-assistente verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 5e2034f..df196af (`main`)
**Round**: 2 - full (every check re-proven at `df196af`; nothing carried forward except the round-1 history below)
**Verifier**: fresh sub-agent with no inherited context, dispatched by the orchestrator; did not write the code (author != verifier)

All 40 checks are proven at `df196af` with located evidence. Coverage has no unproven member. All 5 injected faults were killed.

### Round 1 (`08c3fda`, FAIL), in short

Round 1 ran at `740abec` and failed on three items:

- C40: `anexos.spec.ts` hit the `auth` limit of 5 per minute (429) against an image with default limits.
- C1: `IndexacaoTests.Lotes_de_100_gravam_vetores` was red, and it was already red at the base. Structural assertions were also edited outside the closed list.
- Coverage: no test proved `POST /api/conversas` → 503.

Round 1 also logged two precision notes, both closed in this round: C10's attachment did not contain T, and C28 only placed the button somewhere in the form.

The fixes are in `8ff5772` and `7a62c28`. The checks were amended with user approval in `ad29b57`: C1, C10, C16 and C28, plus closed-list items 5 and 6. This round re-runs everything at `df196af`. Every item above is resolved, as the rows below show.

## Binding sources

This step belongs to the `ui` profile, so it did not run here. The plan's binding `## Sources` are the user's request, the OpenAI pricing and deprecation pages, and `STATE.md` AD-012/015/021. None of them is a design that a selector could reach. C20's live call confirms the model `gpt-6-luna` (AD-015).

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| n/a - profile standard, no design source | n/a | - | - |

## Checks

How the proofs ran (verified at `df196af`):

- **API.** All proofs ran in one invocation, `dotnet test api.Tests --logger trx`: 475 passed, 0 failed. I parsed the TRX, and each named method below appears exactly once with `outcome="Passed"`. There were 8 `*ConversaTests` methods outside `AnexoConversaTests` and 11 `LlmRequisicaoTests` methods, all passed.
- **Vitest.** All proofs ran in one invocation, `npx vitest run --reporter=verbose`: 35 files, 294 passed. Each named `-t` title appears with ✓.
- **E2E.** The proofs ran once against an image built from a clean `df196af` worktree, on port 8084, with no `Limites__*` or `Llm__*` override (product defaults, provider without a key). It used a fresh institution `e2v` (created with `instituicao criar`), the temp DB `one_anexos_verif2`, the bucket `one-anexos-verif2`, and the compose Postgres, MinIO and Mailpit.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | full API suite green; edits to existing assertions only those in closed-list items 1-6 | `dotnet test api.Tests`: 475 passed, 0 failed (includes `IndexacaoTests.Lotes_de_100_gravam_vetores`) | `api.Tests/BuscaTests.cs:74`: only the seed changed (`ProximaTentativa = f.Relogio.GetUtcNow().UtcDateTime.AddDays(-1)`, item 6), and `Assert.Equal([100, 100, 50], lotes)` is untouched. All edits to existing assertions fall inside items 1, 2, 5 and 6 (table below) | PASS |
| C2 | multipart first message → 201 with only `conversaId`/`resposta`, 1 row with nome/tipo/tamanho/hash, key prefix, same bytes | TRX `Primeira_mensagem_com_anexo_grava_objeto_e_linha` Passed | `api.Tests/AnexoConversaTests.cs:54` - `Assert.Equal(HttpStatusCode.Created, r.StatusCode)`; `:56` - `Assert.Equal(["conversaId", "resposta"], ...)`; `:62-65` - nome `"boleto.png"`, tipo `"image/png"`, `bytes.Length`, `Convert.ToHexStringLower(SHA256.HashData(bytes))`; `:66` - `Assert.StartsWith($"{c.Instituicao.Id}/anexos-conversa/", anexo.Chave)`; `:67` - `Assert.Equal(bytes, await f.Objeto(anexo.Chave))` | PASS |
| C3 | 3 files on /mensagens → 200 with only `resposta`, 3 rows with the 3 types | TRX `Mensagem_com_tres_anexos_grava_os_tres` Passed | `api.Tests/AnexoConversaTests.cs:78` - `Assert.Equal(HttpStatusCode.OK, r.StatusCode)`; `:79` - `Assert.Equal(["resposta"], ...)`; `:81` - `Assert.Equal(["image/jpeg", "image/png", "application/pdf"], anexos.Select(a => a.Tipo))` | PASS |
| C4 | exactly 4 parts in order, data URLs, `anexo-3.pdf`, no `detail` | TRX `LlmRequisicaoTests.Anexos_vao_como_partes_da_mensagem` Passed | `api.Tests/LlmRequisicaoTests.cs:136` - `Assert.Equal(4, partes.Count)`; `:137` - `Assert.Equal("""{"type":"text","text":"esse boleto está certo?"}""", partes[0].GetRawText())` (the no-op `Replace` is gone); `:138-140` - full raw-JSON equality for the jpeg/png `image_url` parts and `"filename":"anexo-3.pdf"`; `:141` - `Assert.DoesNotContain("detail", ...)` | PASS |
| C5 | attachment re-sent while it is in the last 10; absent once outside | TRX `Anexo_reenviado_enquanto_esta_nas_10_ultimas`, `Anexo_fora_das_10_ultimas_nao_vai` Passed | `api.Tests/LlmRequisicaoTests.cs:157` - `Assert.Equal("data:image/png;base64," + Convert.ToBase64String(png), partes[1]...url)`; `:172-174` - `Assert.False(TemAnexo(...))`, `DoesNotContain("image_url")`, `DoesNotContain("\"file\"")` | PASS |
| C6 | original name and CPF never reach the provider; text part masked | TRX `Nome_original_do_anexo_nao_vai_ao_provedor` Passed | `api.Tests/LlmRequisicaoTests.cs:185` - `Assert.DoesNotContain(proibido, corpo)` over `"boleto-maria-silva"`, `"12345678909"`, `"123.456.789-09"`; `:187` - `Assert.Equal("meu cpf [número removido]", partes[0]...text)` | PASS |
| C7 | no attachment → `content` is a string; existing assertions unedited | TRX `Sem_anexo_content_continua_texto` + all 11 `LlmRequisicaoTests` Passed | `api.Tests/LlmRequisicaoTests.cs:201` - `Assert.All(usuario, m => Assert.Equal(JsonValueKind.String, m.GetProperty("content").ValueKind))`. `git diff 5e2034f..HEAD -- api.Tests/LlmRequisicaoTests.cs` has 0 removed lines (the `:137` edit after round 1 is on a line this feature added) | PASS |
| C8 | JSON body still works; `ConversaTests` unedited; POST success snapshots unchanged | TRX `ConversaTests` (all) + `RetratoTests.Corpos_de_sucesso_iguais_aos_da_base` Passed | `api.Tests/ConversaTests.cs:109` - `Assert.All(respostas, r => Assert.Equal(HttpStatusCode.NotFound, r.StatusCode))` (file unchanged since base, empty diff). Word-diff of `api.Tests/Retratos/sucessos.txt:1` onward: every added token is `"anexos":[]`, and none is on a `POST /api/conversas*` line | PASS |
| C9 | first system message carries rule 8 literally | TRX `Regra_8_dos_anexos_no_prompt` Passed | `api.Tests/LlmRequisicaoTests.cs:212` - `Assert.Contains("8. Anexos do aluno servem só para entender o caso; não são fontes. Não copie trechos de anexos nem repita dados pessoais que aparecem neles.", regras.Split((char)10).Select(l => l.Trim()))` | PASS |
| C10 | PDF whose text contains T; provider returns T not in the cited source → `sem_base` + `trecho_invalido` | TRX `Trecho_copiado_do_anexo_vira_sem_base` Passed | `api.Tests/AnexoConversaTests.cs:90,93` - `const string t = "Vencimento em 15/11 para Maria Silva"`, sent as `("boleto.pdf", Pdfs.Criar(t))` (the PDF now contains T, so round-1 precision note P1 is closed); `:96-97` - `Assert.Equal("sem_base", ...)`, `Assert.Equal(SemBase, ...)`; `:99` - `Assert.Contains(f.Logs.Entradas, l => ... "Motivo" == "trecho_invalido")` | PASS |
| C11 | 10 MiB+1 → 413 on both routes, nothing written, provider not called; exactly 10 MiB accepted | TRX `Arquivo_acima_de_10_MB_413_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:115-116` - `RequestEntityTooLarge` + `"O arquivo grande.png passa de 10 MB."`; `:118` - `Assert.Equal(antes, await Estado(c))`; `:121` - 10 MiB → `HttpStatusCode.OK` | PASS |
| C12 | GIF and text-as-`foto.png` → 415 on both routes, nothing written | TRX `Tipo_recusado_415_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:140-141` - `UnsupportedMediaType` + `$"O arquivo {arquivo.nome} não é PDF, JPG nem PNG."`; `:143` - `Assert.Equal(antes, await Estado(c))` | PASS |
| C13 | 4 on the first message / 2+2 → 400 `errors.anexos`; 2+1 → 200; nothing written on the 400s | TRX `Quarto_anexo_400_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:157`, `:167` - `Assert.Equal("A conversa aceita até 3 anexos.", ...errors.anexos[0])`; `:158`, `:168` - `Assert.Equal(antes, await Estado(c))`; `:170` - 2+1 → `OK` | PASS |
| C14 | empty / 1001 chars with an attachment → 400 `errors.mensagem`, no new object | TRX `Texto_invalido_com_anexo_400_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:184` - `Assert.Equal("A mensagem deve ter de 1 a 1000 caracteres.", ...errors.mensagem[0])`; `:185` - `Assert.Equal(antes.chaves, string.Join(...pipe..., await f.Chaves()))` (keys joined, compared before and after) | PASS |
| C15 | closed 409, another student's 404, full 409, with an attachment, nothing written | TRX `Recusas_de_hoje_com_anexo_sem_gravar` Passed | `api.Tests/AnexoConversaTests.cs:211-216` - status + exact `detail` for the 3 cases; `:217` - `Assert.Equal(antes, await Estado(c))` | PASS |
| C16 | MinIO down on write, both routes → 503; no new `Conversa`; message count unchanged; provider not called | TRX `Minio_fora_ao_gravar_503_sem_mensagem` and `Minio_fora_na_primeira_mensagem_503_sem_conversa` Passed | first route: `api.Tests/AnexoConversaTests.cs:230-231` - `ServiceUnavailable`, `"Armazenamento de arquivos indisponível."`; `:232` - `Assert.Equal(antes, await f.Db(..., db => db.Conversas.CountAsync()))`; `:233` - `Assert.Equal(chamadas, f.Llm.Corpos.Count)`. /mensagens: `:246-249` - same status/detail, `antes.mensagens`, `antes.chamadasAoProvedor` | PASS |
| C17 | MinIO down on read → 200 `sem_base`, log `anexo_indisponivel` with institution and conversation, provider not called | TRX `Minio_fora_ao_ler_anexo_sem_base_sem_chamar_provedor` Passed | `api.Tests/AnexoConversaTests.cs:265-266` - `sem_base` / `SemBase`; `:267-268` - log with `Motivo` `"anexo_indisponivel"`, `InstituicaoId`, `ConversaId`; `:269` - `Assert.Equal(antes, f.Llm.Corpos.Count)` | PASS |
| C18 | log field `Anexos` = 3 and 0 | TRX `Log_traz_a_quantidade_de_anexos` Passed | `api.Tests/LlmRequisicaoTests.cs:225-226` - `Assert.Equal(3, Anexos(com))`, `Assert.Equal(0, Anexos(sem))` | PASS |
| C19 | 3 × 10 MiB → 201, not the server's 413 | TRX `Tres_arquivos_de_10_MB_aceitos` Passed; e2e C39 passed on real Kestrel | `api.Tests/AnexoConversaTests.cs:279` - `Assert.Equal(HttpStatusCode.Created, r.StatusCode)`. Kestrel half: `web/e2e/anexos.spec.ts:208` - `expect(tres.status(), ...).toBe(201)`, now green in the default-limits run | PASS |
| C20 | real OpenAI accepts the door-3 shape with `gpt-6-luna`; exit 0; exit 1 without a key; never prints the key or the error body | `python .specs/features/anexos-assistente/provedor_aceita_anexos.py` → `HTTP 200, modelo gpt-6-luna, conteudo: '{"resumo":"O anexo contém uma página ...'`, exit 0. Copy in a tree with no `.env` → `LLM_CHAVE_API ausente no .env`, exit 1. Copy with a bogus key → `HTTP 401 type=invalid_request_error code=invalid_api_key`, exit 1, no key fragment. The real run's output does not contain the `.env` key or its first 12 characters | `.specs/features/anexos-assistente/provedor_aceita_anexos.py:92` - `return 0 if status == 200 and conteudo else 1`; `:85` - prints only `e.code`, `error.type`, `error.code`. No print references `segredo` | PASS |
| C21 | `dotnet build api` passes CA1502; no pending migration | `dotnet build api` → 0 warnings, 0 errors; `dotnet ef migrations has-pending-model-changes --project api` → "No changes have been made", exit 0 | `api/One.Api.csproj:9` - `<WarningsAsErrors>$(WarningsAsErrors);CA1502;MSG0005</WarningsAsErrors>`; `api/CodeMetricsConfig.txt:1` - `CA1502(Method): 10` | PASS |
| C22 | GET conversa lists `anexos` {id,nome,tipo,tamanho} in order; `[]` otherwise; no `chave`/`hash` | TRX `Ver_conversa_lista_anexos_sem_chave_nem_hash` Passed | `api.Tests/AnexoConversaTests.cs:293-294` - `DoesNotContain("chave")`, `DoesNotContain("hash")`; `:299` - `Assert.Equal(["id", "nome", "tipo", "tamanho"], ...)`; `:300` - ids in saved order; `:304` - `Assert.Equal(0, mensagens[1]...GetArrayLength())` | PASS |
| C23 | owner downloads: 200, same bytes, Content-Type, Disposition with the name, Length | TRX `Download_pelo_aluno_dono` Passed | `api.Tests/AnexoConversaTests.cs:317-321` - `OK`, `Assert.Equal(bytes, ...)`, `"image/png"`, `Assert.Contains("meu boleto.png", ...ContentDisposition...)`, `Assert.Equal(bytes.Length, ...ContentLength)` | PASS |
| C24 | 5 denied cases → 404 "Anexo não encontrado.", no object read | TRX `Download_negado_404_sem_abrir_objeto` Passed | `api.Tests/AnexoConversaTests.cs:341-345` - 5 requests: other student, staff with no ticket, staff of another sector, other institution, unknown id; `:350-351` - `NotFound` + `"Anexo não encontrado."`; `:353` - `Assert.Equal(antes, f.LeiturasDeObjeto)` | PASS |
| C25 | MinIO down on download → 503 | TRX `Download_com_minio_fora_503` Passed | `api.Tests/AnexoConversaTests.cs:367` - `Assert.Equal(HttpStatusCode.ServiceUnavailable, r.StatusCode)` | PASS |
| C26 | `rotas.txt` gains exactly the one line; each count +1 | TRX `RetratoTests.Tabela_de_rotas_igual_a_da_base` Passed | `api.Tests/Retratos/rotas.txt:11` - `GET /api/conversas/anexos/{id:long} anonimo=False autorizacao=True limite=-` (diff +1/-0); `api.Tests/RetratoTests.cs:39`, `:43`, `:46` - `Assert.Equal(67, ...)`, `(64, ...)`, `(65, ...)`, up from 66/63/64 at base | PASS |
| C27 | `anexo_conversa`: tenant filter, snake_case, FK not null to `mensagem_conversa` | TRX `ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro`, `ArquiteturaTests.Tabelas_snake_case_e_datas_timestamptz`, `Tabela_anexo_conversa_com_fk_nao_nula` Passed | `api.Tests/ArquiteturaTests.cs:19` - `anexo_conversa` in `TabelasDaInstituicao`; `:57` - `Assert.NotEmpty(e.GetDeclaredQueryFilters())`; `:107`, `:111` - `Assert.Matches(snake, e.GetTableName()!)`, `Assert.Matches(snake, p.GetColumnName(tabela)!)`; `api.Tests/AnexoConversaTests.cs:384` - `Assert.Equal(["NO"], ...is_nullable... mensagem_conversa_id)`; `:386` - FK target `["mensagem_conversa"]` | PASS |
| C28 | "Anexar arquivo" button in the same row-flex container as the "Mensagem" field; opens a file input with accept + multiple | vitest ✓ `botão Anexar arquivo abre o seletor de PDF, JPG e PNG` | `web/src/assistente/anexos.test.tsx:37-38` - `toHaveAttribute('accept', '.pdf,.jpg,.jpeg,.png')`, `toHaveAttribute('multiple')`; `:43` - `expect(abriu).toHaveBeenCalledTimes(1)`; `:47-49` - `expect(linha).toContainElement(screen.getByLabelText('Mensagem'))`, `toHaveClass('flex')`, `not.toHaveClass('flex-col')`. Code: `web/src/assistente/Assistente.tsx:259-260` (`<div className="flex items-end gap-1.5">` holding `BotaoAnexar` + `Textarea`) | PASS |
| C29 | 2 chips in order with Remover buttons; removing one leaves the other | vitest ✓ `selos dos arquivos escolhidos e remover` | `web/src/assistente/anexos.test.tsx:57` - `expect(selos()).toEqual(['boleto.png', 'comprovante.pdf'])`; `:58-59` - both Remover buttons; `:63` - `toEqual(['comprovante.pdf'])` | PASS |
| C30 | disabled at 3 chosen and at 2 sent + 1 chosen; enabled at 2 chosen | vitest ✓ `Anexar arquivo desabilitado com 3 anexos na conversa` | `web/src/assistente/anexos.test.tsx:74` - `toBeEnabled()` at 2 chosen; `:76` - `toBeDisabled()` at 3 chosen; `:85` - `toBeDisabled()` at 2 sent + 1 chosen | PASS |
| C31 | FormData with `mensagem` + 2 `anexos`; chips cleared; 2 links with the returned ids | vitest ✓ `envio com anexos vai em FormData e o balão mostra os links` | `web/src/assistente/anexos.test.tsx:106` - links `toEqual([...'/api/conversas/anexos/41'..., ...'/api/conversas/anexos/42'...])`; `:111-113` - `toBeInstanceOf(FormData)`, `get('mensagem')`, `getAll('anexos')` names; `:114` - chip list gone | PASS |
| C32 | no attachment → JSON body; `conversa.test.tsx` unedited | vitest ✓ `sem anexo o envio continua em JSON` + all 23 of `src/assistente/conversa.test.tsx` ✓ | `web/src/assistente/anexos.test.tsx:125` - `toEqual([['/api/conversas', { mensagem: 'preciso do boleto' }]])`. `git diff 5e2034f..HEAD -- web/src/assistente/conversa.test.tsx` is empty | PASS |
| C33 | 400/413/415/503 → API `detail` in the alert; text and chips kept | vitest ✓ `erro da API mantém texto e selos` | loop over the 4 statuses at `web/src/assistente/anexos.test.tsx:131-136`; `:141` - `toHaveTextContent(detail)`; `:142` - `toHaveValue('esse boleto está certo?')`; `:143` - `toEqual(['boleto.png'])` | PASS |
| C34 | literal help text below the field | vitest ✓ `texto de ajuda dos anexos` | `web/src/assistente/anexos.test.tsx:155` - `toBeVisible()`; `:157` - `campo.compareDocumentPosition(ajuda) & Node.DOCUMENT_POSITION_FOLLOWING`; literal at `web/src/assistente/Anexos.tsx:7` | PASS |
| C35 | Vitest suite, build, crapper ≤ 9.99, dryer no candidate ≥ 0.8 | `npx vitest run` 294 passed; `npm --prefix web run build` exit 0; `npm --prefix web run coverage` exit 0 (294 passed); `crapper --use-existing-coverage -s src --threshold 9.99` exit 0; dryer piped into `grep -q "No duplicate candidates found"` exit 0 | each command's exit code is the gate; outputs written to `web/.metrics/crap.edn:1` and `web/.metrics/dry.edn:1` | PASS |
| C36 | team GET chamado: `anexos` with exact keys on the student line that attached; `[]` on the other student line | TRX `Transcricao_do_chamado_traz_anexos_do_aluno` Passed | `api.Tests/AnexoConversaTests.cs:417` - `Assert.Equal(["id", "nome", "tipo", "tamanho"], ...)`; `:418-421` - id/nome/tipo/tamanho; `:422` - `Assert.Equal(0, doAluno[1].GetProperty("anexos").GetArrayLength())` | PASS |
| C37 | staff who open the ticket download → 200, same bytes | TRX `Download_pelo_atendente_do_chamado` Passed | `api.Tests/AnexoConversaTests.cs:432-433` - `OK`, `Assert.Equal(bytes, await r.Content.ReadAsByteArrayAsync())` | PASS |
| C38 | ticket transcript shows each student attachment as a link | vitest ✓ `transcrição mostra os anexos do aluno como links` | `web/src/chamados/chamado.test.tsx:119` - `expect(within(balao).getAllByRole('link').map(...)).toEqual([['boleto.png', '/api/conversas/anexos/41'], ['extrato.pdf', '/api/conversas/anexos/42']])` | PASS |
| C39 | e2e: student attaches a PNG and sees the link; download gives the same SHA-256 and `image/png`; admin opens the ticket and downloads the same bytes | `-g "aluno anexa foto na conversa e a equipe baixa no chamado" --list` → `anexos.spec.ts:140:1`, 1 test. In the full run: `✓ anexos.spec.ts:140:1 › aluno anexa foto na conversa e a equipe baixa no chamado (1.0m)` | `web/e2e/anexos.spec.ts:179` - `toMatch(/^\/api\/conversas\/anexos\/\d+$/)`; `:183` - `content-type` `'image/png'`; `:184` - `sha(...)` equal; `:198` - same href in the ticket; `:200-201` - `200` and the same SHA for the team | PASS |
| C40 | full e2e suite green against the HEAD image | `E2E_URL=http://localhost:8084 npx playwright test` (fresh institution, default limits) → 94 passed, 0 failed, exit 0 | `web/e2e/anexos.spec.ts:51` - `expect(r.status()).toBe(200)` in `entrar`, now preceded by `vaga()` at `:49` (defined at `:57-65`, waits out the 5-per-minute window) | PASS |

### Edits to existing assertions (C1, `git diff 5e2034f..HEAD -- api.Tests web/src web/e2e`)

Every edit is inside the closed list. None weakens an assertion.

| File:line | Edit | Closed-list item | Direction |
| --- | --- | --- | --- |
| `api.Tests/Retratos/sucessos.txt:1` onward | only `"anexos":[]` tokens added (word-diff), on GET conversa messages and on team transcript student lines | 1 | adds |
| `api.Tests/Retratos/rotas.txt:11`; `api.Tests/RetratoTests.cs:39`, `:43`, `:46` | +1 route line; 66/63/64 → 67/64/65 | 2 | adds / increases |
| `api.Tests/ArquiteturaTests.cs:19`, `:371-372`, `:395`, `:415`, `:445`, `:528`, `:546`, `:740`, `:774`, `:964` | `anexo_conversa` table; 61→62 messages/handlers; `Assistente` 7→8; 64→65 `Map*`; `AnexoConversa` entity; 26→27; `BaixarAnexoConversa` in `SemCorpoJson`; `Assistente.cs` and `BaixarAnexoConversa.cs` added to the `.Baixar(` callers | 5 | each gains this feature's item or increases; no member lost |
| `api.Tests/MediatorTests.cs:29`, `:45` | 61→62; (9,52)→(9,53) | 5 | increases |
| `api.Tests/SessaoTests.cs:34` | 59→60 | 5 | increases |
| `web/src/assistente/textos.test.tsx:35` | the help literal added to the visible texts | 5 | adds |
| `api.Tests/BuscaTests.cs:74` | seed `ProximaTentativa` from `f.Relogio`; assertion `:83` untouched | 6 | neither (fixture only) |
| `api.Tests/LlmRequisicaoTests.cs` | 0 removed lines; existing `GetString()` assertions untouched | 4 | none |
| `web/e2e/anexos.spec.ts:1`, `:42`, `:49`, `:131` | in the pre-existing arquivos-minio test's helpers: an added `PlaywrightWorkerArgs` type import and `await vaga()` before the auth calls. No `expect` was removed or changed | not an assertion edit | neither (pacing only) |

`ConversaTests.cs`, `conversa.test.tsx` and the other e2e specs are unchanged since base. `web/src/chamados/chamado.test.tsx` has additions only.

## Coverage

Verified at `df196af`. I recomputed every row from its authority: `plan.md` `## Surface`, `Landing` and the ACs, the handlers, and the web components. I did not read the rows back from the checks' table.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST /api/conversas` statuses (7) | plan Surface; `NovaConversa.cs`, `ConversaRotas.cs` | 201 `AnexoConversaTests.cs:54`, `:279` · 400 `:157`, `:184` · 403 `AssistenteTests.cs:83` · 413 `:115` (`nova`) · 415 `:140` · 429 `RateLimitTests.cs:44` · 503 `AnexoConversaTests.cs:230` (new since round 1) | - |
| `POST /api/conversas/{id}/mensagens` statuses (8) | plan Surface; `NovaMensagem.cs` | 200 `:78` · 400 `:167` · 404 `:213` · 409 `:211`, `:215` · 413 `:115` (`seguinte`) · 415 `:140` · 429 `RateLimitTests.cs:45` · 503 `AnexoConversaTests.cs:246` | - |
| `GET /api/conversas/{id}` statuses (2) | plan Surface | 200 `AnexoConversaTests.cs:299` · 404 `ConversaTests.cs:109` | - |
| `GET /api/chamados/{numero}` statuses (2) | plan Surface | 200 `AnexoConversaTests.cs:417` · 404 `VisibilidadeTests.cs:370` | - |
| `GET /api/conversas/anexos/{id}` statuses (3) | `BaixarAnexoConversa.cs:23-24` + `ArmazenamentoIndisponivel` → 503 | 200 `:317`, `:432` · 404 `:350` · 503 `:367` | - |
| accepted types (3) | signature check in `Arquivos.Ler` | JPEG/PNG/PDF `AnexoConversaTests.cs:81`, `LlmRequisicaoTests.cs:138-140` | - |
| refused types (2) | AC 9 | GIF, text-as-png → `AnexoConversaTests.cs:140` | - |
| size boundary (2) | AC 8 | 10 MiB+1 `:115` · exactly 10 MiB `:121` | - |
| per-conversation limit (3) | `ConversaRotas.cs:55` | 4 `:157` · 2+2 `:167` · 2+1 `:170` | - |
| provider parts (3) | `Assistente.cs` `Conteudo` | text/image_url/file `LlmRequisicaoTests.cs:137-140` | - |
| history window (2) | `Assistente.cs` (last 10) | inside `LlmRequisicaoTests.cs:157` · outside `:172` | - |
| current refusals with an attachment (5) | AC 11, 12 | empty/1001 `AnexoConversaTests.cs:184` · closed/other/full `:211-216` | - |
| MinIO failures (3, write counted on both routes) | AC 13, 14, 20 | write `:230` (first message), `:246` (/mensagens) · read `:265-269` · download `:367` | - |
| who downloads (7) | `BaixarAnexoConversa.PodeVer` (`:28-33`) | owner `:317` · ticket staff `:432` · 5 denied `:341-353` | - |
| Assistente screen states (5) | plan Observable | empty `anexos.test.tsx:37`, `:155` · chosen `:57` · limit `:76` · sent `:106` · error `:141` | - |
| errors shown (4) | AC 25 | 400/413/415/503 `anexos.test.tsx:131-143` | - |
| send body (2) | `Assistente.tsx` `enviarMensagem` | FormData `anexos.test.tsx:111` · JSON `:125` | - |
| one-way doors (5: 4 planned + Landing row 5) | plan Landing | 1 `AnexoConversaTests.cs:65-67`, `:384-386` · 2 `:78`, `ConversaTests` unchanged, `anexos.test.tsx:125` · 3 `LlmRequisicaoTests.cs:137-140` + C20 live 200 · 4 `AnexoConversaTests.cs:317`, `:350`, `:432` · 5 `:417` + `sucessos.txt` word-diff (student-side lines unchanged) | - |
| startup config: body limit (2 places) | `ConversaRotas.cs:16` `LimiteDoCorpo`, attached per route | TestServer `AnexoConversaTests.cs:279` (cannot fail on the Kestrel limit) · real Kestrel in the HEAD image `web/e2e/anexos.spec.ts:208`, green in this round | - |

## Test policy rows

`checks.md` has no `Test policy` section, so the repo's conventions decide the level. Every claim that names a status, route or response shape has a proof that crosses HTTP (`WebApplicationFactory` or the e2e image).

## Faults injected

Verified at `df196af`.

- I injected each fault into a scratch `git worktree` at HEAD (`D:/one-faults2`), one at a time, and reverted it with `git checkout` before the next.
- The real tree's `git status --porcelain` was recorded before and after: `?? .idea/`, `?? .playwright-mcp/`, `?? web/apresentacao/`, identical both times. The worktree was removed afterwards.
- `mutator` did not run (AD-025).
- Faults 1 and 2 hit surfaces created or changed after round 1 (`git diff 08c3fda..HEAD`).

| Mutation | Location | Killed |
| --- | --- | --- |
| C28 layout fix reverted (`Assistente.tsx` restored from `08c3fda`: button back in the actions row, outside the field's row) | `web/src/assistente/Assistente.tsx:259-271` | yes - vitest `botão Anexar arquivo abre o seletor...` × at `anexos.test.tsx:47` (`toContainElement`) |
| `Conversa` saved before the objects are written (`await db.SaveChangesAsync()` right after `db.Conversas.Add`) | `api/Assistente/NovaConversa.cs:37` | yes - `AnexoConversaTests.Minio_fora_na_primeira_mensagem_503_sem_conversa` [FAIL] `Expected: 0 Actual: 1` (conversation count) |
| MinIO read failure swallowed (`catch (ArmazenamentoIndisponivel) { return new(); }` instead of `null`) | `api/Assistente/Assistente.cs:138` | yes - `AnexoConversaTests.Minio_fora_ao_ler_anexo_sem_base_sem_chamar_provedor` [FAIL] (no `anexo_indisponivel` log) |
| text part of an attachment message left unmasked (`new ParteTexto("text", m.Texto)`) | `api/Assistente/Assistente.cs:147` | yes - `LlmRequisicaoTests.Nome_original_do_anexo_nao_vai_ao_provedor` [FAIL] (`DoesNotContain` sub-string found) |
| text cleared before the request, so a failed send loses it (`efeitos.limparTexto()` before `perguntar`) | `web/src/assistente/Assistente.tsx:71` | yes - vitest `erro da API mantém texto e selos` × |

Round 1's five faults (PDF position, the limit bound, message-before-object on /mensagens, the authorization shortcut, the web limit bound) were not re-run. The code under them did not change after round 1.

## Findings about the checks and tests

- **Round-1 items, all resolved.** C40: 94/94 on default limits with a fresh institution. C1: 475/475, and every edit is in the closed list. Coverage: the 503 on the first route is now proven. P1 (C10): the PDF now carries T. P4 (C28): the same row container is now asserted. P5: the no-op `Replace` is gone. P7: the checks' Coverage table now cites `AssistenteTests` and `VisibilidadeTests`.
- **O1 (C28, precision, minor).** AC 21 also names a paperclip icon ("ícone de clipe"), and no check asserts it. The code renders `Paperclip` (`web/src/assistente/Anexos.tsx:40`). The `ui` step that would turn this into a finding does not run under `standard`, so this is not a FAIL. Also, `not.toHaveClass('flex-col')` would not catch a responsive variant such as `sm:flex-col`.
- **O2 (C39/C40, test cost).** `anexos.spec.ts` now waits out the 5-per-minute `auth` window instead of raising the limit. C39 took 1.0 min, and the file has a 150 s timeout. This is correct against the product defaults. The window counter is per worker process, though, so a second Playwright worker or another client logging in from the same IP during the run could still get a 429.
- **O3 (Vitest under load).** My first Vitest run overlapped with the API suite and timed out (5 s) in 2 tests outside this feature's new files: `assistente.test.tsx:114` and `conversa.test.tsx:171`. Run alone, all 294 passed. Both cover the Assistente screen this feature changed, so they may be close to the default timeout under CPU contention. This is a flakiness risk, not a failure of the proof.
- **Swept `existing` rows re-read.** `pendente={envio.isPending}` exists (`web/src/assistente/Assistente.tsx`). `PodeUsarAssistente` exists (`api/Assistente/ConversaRotas.cs:46`). Bucket versioning exists and `Armazenamento` has no delete. `ProvedorTests.Falhas_do_chat_viram_sem_base` exists and passed in the TRX.
- **Build warnings.** `dotnet build api` gives 0 warnings. Building `api.Tests` emits `CS8604` at `api.Tests/PermissoesChamadoTests.cs:54` and `xUnit2013` at `api.Tests/ArquiteturaTests.cs:1092`. Both lines predate `5e2034f` (git blame), so they do not come from this feature.

## Gate

- `dotnet test api.Tests` - 475 passed, 0 failed
- `npx vitest run` - 294 passed, 0 failed (35 files); `npm --prefix web run build` ok; `npm --prefix web run coverage` ok; crapper exit 0; dryer finds no candidate
- `dotnet build api` - 0 warnings, 0 errors; `has-pending-model-changes` - no changes
- `python .specs/features/anexos-assistente/provedor_aceita_anexos.py` - HTTP 200, exit 0 (1 paid call); exit 1 without a key; no key or error body printed
- e2e against an image of `df196af` on :8084, default limits, fresh institution `e2v` - 94 passed, 0 failed. Container, image, DB `one_anexos_verif2`, bucket `one-anexos-verif2` and worktree `D:/one-faults2` were all removed. The Mailpit messages from the run remain in the dev mailbox.
