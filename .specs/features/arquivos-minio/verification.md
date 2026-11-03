# Arquivos no MinIO (AD-021) verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 8e73913..f97c539 (fix range `ec56387..f97c539`: `c404377` code and API tests, `f97c539` e2e, `STATE.md` and Handoff)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier). Round 1 report: commit `ec56387`

Scope: the fix diff (`api/Armazenamento.cs`, `api/Chamados/ResponderChamado.cs`, `api/Conhecimento/{CriarDocumento,DocumentoRotas,NovaVersaoDocumento}.cs`, `api.Tests/ArmazenamentoTests.cs`, `api.Tests/Infra/OneFactory.cs`, `web/e2e/anexos.spec.ts`) and every non-PASS verdict from round 1 (C5, C7, C8, C10, C29, 4 coverage rows, F5, F8, F9). Every proof re-ran at `f97c539` in a detached worktree. Anything else is carried from `2ef52ab` and says so. The real tree's `git status --porcelain` matched the baseline at the end.

## Binding sources

Carried from `2ef52ab`. Profile `standard`: step 1 does not run, and the fix touched no interface. Round 1's note is resolved: AD-021 is now `active` in `.specs/STATE.md:27`.

## Checks

Verified at `f97c539`: the rows the fix or the user rulings touched (C5, C7, C8, C10, C29). The other rows are carried from `2ef52ab`. Their proofs re-ran at HEAD and passed (Gate), and their `ArmazenamentoTests.cs` citations after line 146 moved by +76, as refreshed below.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | key, SHA-256, size 5000, object bytes | TRX Passed at HEAD (carried) | `api.Tests/ArmazenamentoTests.cs:55`, `:57`, `:59` | PASS |
| C2 | no `byte[]`/`bytea`; Chave unique, Hash char(64) | TRX Passed (carried) | `api.Tests/ArquiteturaTests.cs:921`, `:930` | PASS |
| C3 | anexo members exactly id,nome,tipo,tamanho | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:71` | PASS |
| C4 | 400/415/413/409 and no object or row | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:100`, `:102` | PASS |
| C5 | `.exe` on a closed ticket: base order 400/415/409 | TRX Passed; `OrdemDasRecusasTests.cs` has no diff in `ec56387..f97c539` | `api.Tests/OrdemDasRecusasTests.cs:437` `Assert.Equal(HttpStatusCode.UnsupportedMediaType, r415.StatusCode)`. User ruling of 02/11/2026 in `checks.md` `## Handoff`: C5 holds by the base order 400 (note with attachment), 415 (`.exe`), 409 (valid PNG) | PASS - by user ruling |
| C6 | S3 client config and the four keys | TRX Passed (carried) | `api.Tests/ArquiteturaTests.cs:947` | PASS |
| C7 | 200, bytes, type, disposition, Content-Length on the wire | TRX Passed; F5 re-injected and killed | `api.Tests/ArmazenamentoTests.cs:153` `Assert.Equal(5000, anexo.Content.Headers.ContentLength)` read with `HttpCompletionOption.ResponseHeadersRead` (`:152`). Under F5 it fails with `Expected: 5000 Actual: null` | PASS |
| C8 | 404 "Anexo não encontrado." and zero object reads | TRX Passed; F8 re-injected and killed | `api.Tests/ArmazenamentoTests.cs:144` `Assert.Equal(leiturasAntes, f.LeiturasDeObjeto)`. The counter now sees presigned reads: `api.Tests/Infra/OneFactory.cs` `ContaLeituras` handler, and `:169` `Assert.Equal(antes + 1, f.LeiturasDeObjeto)` proves that a 200 increments it | PASS |
| C9 | download uses only the row's key | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:236`; `api.Tests/ArquiteturaTests.cs:963` | PASS |
| C10 | PDF 200, application/pdf, Content-Length on the wire; student 404 | TRX Passed; F5 killed | `api.Tests/ArmazenamentoTests.cs:159` `Assert.Equal(pdf.Length, d.Content.Headers.ContentLength)` with `ResponseHeadersRead`; 404 at `:257` | PASS |
| C11 | 10 MiB download allocates < 5 MiB | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:286` | PASS |
| C12 | PDF and new version: key, hash, size, object | TRX Passed (carried); N6 killed | `api.Tests/ArmazenamentoTests.cs:306`, `:307`, `:308`, `:312` | PASS |
| C13 | 8 PDF refusals, no object or row | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:343`, `:345` | PASS |
| C14 | v1 object intact after v2 | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:363`, `:366` | PASS |
| C15 | 3 upload routes 503, no rows | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:373`, `:400` | PASS |
| C16 | 2 downloads 503 | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:413`, `:425` | PASS |
| C17 | DB conflict after write: 409, 1 orphan | TRX Passed (carried); N7 killed | `api.Tests/ArmazenamentoTests.cs:453` | PASS |
| C18 | `Preparar` on a closed port fails startup | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:465` | PASS |
| C19 | bucket versioning Enabled, idempotent | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:488` | PASS |
| C20 | no DeleteObject* in `api/` | TRX Passed (carried) | `api.Tests/ArquiteturaTests.cs:990`, `:998` | PASS |
| C21 | same bytes, two keys and two objects | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:505` | PASS |
| C22 | migration on an empty DB | TRX Passed (carried) | `api.Tests/MigracaoArquivosMinioTests.cs:77` | PASS |
| C23 | migration aborts with a row | TRX Passed (carried) | `api.Tests/MigracaoArquivosMinioTests.cs:90` | PASS |
| C24 | no pending model changes | `has-pending-model-changes` exit 0 at HEAD | `api.Tests/ArquiteturaTests.cs:631` | PASS |
| C25 | 4 snapshot files byte for byte | `git diff --exit-code ec56387 HEAD -- api.Tests/Retratos` exit 0 | `api.Tests/RetratoTests.cs:309` | PASS |
| C26 | erros.txt gains only the 503 line | `asserts_minio.py 8e73913 --erros` 0 problems | `api.Tests/RetratoTests.cs:124`, `:125` | PASS |
| C27 | only the 3 allow-listed assertion changes | `asserts_minio.py 8e73913` 0 problems; `--autoteste` ok | `.specs/features/arquivos-minio/asserts_minio.py:25-29`. Independent `git diff -U0 8e73913 HEAD -- api.Tests`: exactly the 3 allow-listed removed `Assert` lines, 0 `Skip =`. `ec56387..HEAD` removes only `OneFactory.cs` `LeiturasDeObjeto` (the same line plus a comment). `OrdemDasRecusasTests.cs` (incl. the 5 `Cadeia_*`) has no diff | PASS |
| C28 | arch rules, CA1502, MSG0005 | TRX Passed; `ca1502_barra.sh` ok; `msg0005_barra.sh` ok at HEAD | `api.Tests/ArquiteturaTests.cs:284`, `:1005` | PASS |
| C29 | compose shape and the e2e suite sends and downloads an attachment | e2e 46/46 on :8082; `Compose_com_minio_por_digest` Passed | `web/e2e/anexos.spec.ts:99` `expect(baixado.headers()['content-type']).toBe('application/pdf')`, `:100` Content-Length, `:101` SHA-256 of the body. Object `1/anexos/<32hex>` confirmed in the versioned bucket `one-verify2`. Fault E1 killed it. Ruling of 02/11/2026 satisfied | PASS |
| C30 | whole API suite green; `Layout_e_compose` | 366/366 at HEAD | `api.Tests/ArquiteturaTests.cs:92` | PASS |

## Coverage

Verified at `f97c539`: the rows the fix touched were recomputed from the code at HEAD. The rest are carried from `2ef52ab` (Surface routes, `CriarDocumento` statuses, one-way doors, new columns, delete names, changed assertions, snapshot files and startup config: all `-`).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST .../mensagens` write order vs domain (8) | `api/Chamados/ResponderChamado.cs:44-71`, `AcoesChamado.cs:27-33` | 400/415/413/state 409 before the write C4 · 409 `Rejeitar` writes nothing `ArmazenamentoTests.cs:206` (N2 killed) · student reply writes C17 (N7 killed) · team reply writes C1 (N5 killed) · DB conflict orphan C17 · 503 C15 + bucket error `:190` | accepted rejection with an attachment (`Resolvido` within the window) must write the object (`ResponderChamado.cs:61`): N4 removed that write and the full suite stayed 366/366. The row stores a key that has no object, so the download returns 503 |
| `POST .../documentos/{id}/versoes` statuses (7) | `api/Conhecimento/NovaVersaoDocumento.cs:20-30` | 201 C12 · 400/413/415 C13 · 503 C15 · 404 before the write · 409 archived, no object `ArmazenamentoTests.cs:220` (N3 killed) | - |
| `POST /api/admin/documentos` write (1 new branch) | `api/Conhecimento/CriarDocumento.cs:29-31` | write after `Versao` C12 (N6 killed) | - |
| GET downloads statuses (3 + 3) | handlers | 200 C7/C10 · 404 without opening the object C8 (F8 killed) · 503 C16 | - |
| download headers vs base (3 per route) | `Armazenamento.ComTamanho` (`api/Armazenamento.cs:76`) | Content-Type, Disposition C7/C10 · Content-Length on the wire `:153`, `:159` (F5 killed) · e2e `anexos.spec.ts:99-100` | - |
| storage failure causes mapped to 503 (AC 13, AC 14) | `api/Armazenamento.cs:46`, `:62-66` | unreachable C15/C16 · bucket service error `ArmazenamentoTests.cs:190` (F9, N1 killed) · missing object C16 · `Preparar` C18 | - |

## Test policy rows

Carried from `2ef52ab`. The fix kept the levels: HTTP tests through `OneFactory` for the handlers it touched and a real e2e for C29. The gap is the surviving N4 under Faults, not a level.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| repo convention (no Test policy rows) | handlers, `Armazenamento.cs` | HTTP through `OneFactory` | yes |

## Faults injected

Verified at `f97c539`, by hand (AD-025). One fault per build, reverted with `git checkout -- api` after each run. Kill claims ran on the `ArmazenamentoTests` filter. The survival claim ran on the full suite.

| Mutation | Location | Killed |
| --- | --- | --- |
| F5 (re-inject) drop `ctx.Response.ContentLength = tamanho` | `api/Armazenamento.cs:76` | yes - `Content_length_do_anexo_e_da_versao_vai_no_cabecalho` (5000 vs null) |
| F8 (re-inject) open the object before the access check | `api/Chamados/BaixarAnexo.cs:22` | yes - `Download_negado_e_404_sem_abrir_objeto`, `Contador_de_leituras_...` |
| F9 (re-inject) `Gravar` catches only `HttpRequestException` | `api/Armazenamento.cs:46` | yes - `Erro_do_bucket_responde_503_e_nada_fica` |
| N1 drop `AmazonServiceException` from the catch | `api/Armazenamento.cs:46` | yes - `Erro_do_bucket_...` ("erro de serviço do bucket: 500") |
| N2 write before `RejeitarResolucao` decides | `api/Chamados/ResponderChamado.cs:60-61` | yes - `Rejeitar_resolucao_vencida_com_anexo_nao_deixa_objeto` |
| N3 write before `d.NovaVersao` decides | `api/Conhecimento/NovaVersaoDocumento.cs:26-27` | yes - `Nova_versao_de_documento_arquivado_nao_deixa_objeto` |
| N4 drop the write on an accepted rejection with an attachment | `api/Chamados/ResponderChamado.cs:61` | no - survived the full suite (366/366) |
| N5 drop the write on a team reply | `api/Chamados/ResponderChamado.cs:69` | yes - 8 `ArmazenamentoTests` (C1, C7, C9, C11, ...) |
| N6 drop the write in `CriarDocumento` | `api/Conhecimento/CriarDocumento.cs:30` | yes - C10, C12, C14, C15 tests |
| N7 drop the write on a student reply | `api/Chamados/ResponderChamado.cs:65` | yes - only `Conflito_no_banco_apos_gravar_deixa_objeto_orfao` (C17) |
| E1 attachment download sends `application/octet-stream` (mutant image) | `api/Chamados/BaixarAnexo.cs:23` | yes - e2e `anexos.spec.ts:99` (expected `application/pdf`) |

## Gate

Verified at `f97c539`:

- `dotnet test api.Tests`: 366 passed, 0 failed (TRX).
- `asserts_minio.py 8e73913`, `--erros`, `--autoteste`: 0 problems, 0 problems, ok.
- `has-pending-model-changes`: clean. `ca1502_barra.sh`, `msg0005_barra.sh`: ok. Snapshots: no diff since `ec56387`.
- e2e: image `one-minio-verify2` from the clean worktree on :8082, compose network, own DB `one_minio_verify2`, bucket `one-verify2`, SMTP to mailpit, throwaway institution `e2e-v2` created with `instituicao criar` (`E2E_INSTITUICAO=e2e-v2`, `E2E_ADMIN_EMAIL=admin@e2e-v2.one`, `E2E_ADMIN_CPF=529.982.247-25`): 46 passed, 0 failed.
- Cleanup: both containers, both images (`one-minio-verify2`, `-mut`), the DB `one_minio_verify2`, the bucket `one-verify2` and the worktree were removed. The compose services were not touched.

## Ranked gaps

1. N4 survived: no test proves that an accepted rejection with an attachment writes the object. The fix added a conditional write at `api/Chamados/ResponderChamado.cs:61`, and removing it leaves the suite green. The code at HEAD is correct. A test needs to reject a resolved ticket within the window with an attachment, then assert that the object exists (`f.Objeto(anexo.Chave)`) or that the download returns the same bytes.
