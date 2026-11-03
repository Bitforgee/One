# Arquivos no MinIO (AD-021) verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 8e73913..e84ca8d (round 3 fix range `21fc923..e84ca8d`: `e84ca8d` adds one test to `api.Tests/ArmazenamentoTests.cs`, +17 lines at 209; the later `a1977a5` touches only `ROADMAP.md`)
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier). Round 1 report: commit `ec56387`; round 2 report: commit `21fc923`

Scope: the fix diff (only `api.Tests/ArmazenamentoTests.cs`, test `Rejeitar_resolucao_no_prazo_com_anexo_grava_o_objeto`) and the one non-PASS verdict from round 2 (the `POST .../mensagens` coverage row and the surviving N4). Every proof re-ran at `e84ca8d` in a detached worktree. Everything else is carried from `f97c539` (round 2) or `2ef52ab` (round 1) and says so. The e2e suite (46/46) is carried from `f97c539`, because the fix touched no code under `api/` or `web/`. Mutation stays suspended (AD-025), so faults were injected by hand. The real tree's `git status --porcelain` matched the baseline at the end.

## Binding sources

Carried from `2ef52ab` via `f97c539`. Profile `standard`: step 1 does not run, and the round 3 fix touched no interface. AD-021 is `active` in `.specs/STATE.md:27`.

## Checks

Carried from `f97c539` (C5, C7, C8, C10, C29) and `2ef52ab` (the rest), because the round 3 fix changes no claim. Every one of their proofs re-ran at `e84ca8d` and passed (Gate). The new test sits at `ArmazenamentoTests.cs:209-224`, so citations after line 208 moved by +17 and are refreshed below. C30 is verified at `e84ca8d` (367 tests).

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
| C9 | download uses only the row's key | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:253`; `api.Tests/ArquiteturaTests.cs:963` | PASS |
| C10 | PDF 200, application/pdf, Content-Length on the wire; student 404 | TRX Passed; F5 killed | `api.Tests/ArmazenamentoTests.cs:159` `Assert.Equal(pdf.Length, d.Content.Headers.ContentLength)` with `ResponseHeadersRead`; 404 at `:274` | PASS |
| C11 | 10 MiB download allocates < 5 MiB | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:303` | PASS |
| C12 | PDF and new version: key, hash, size, object | TRX Passed (carried); N6 killed | `api.Tests/ArmazenamentoTests.cs:323`, `:324`, `:325`, `:329` | PASS |
| C13 | 8 PDF refusals, no object or row | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:360`, `:362` | PASS |
| C14 | v1 object intact after v2 | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:380`, `:383` | PASS |
| C15 | 3 upload routes 503, no rows | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:390`, `:417` | PASS |
| C16 | 2 downloads 503 | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:430`, `:442` | PASS |
| C17 | DB conflict after write: 409, 1 orphan | TRX Passed (carried); N7 killed | `api.Tests/ArmazenamentoTests.cs:470` | PASS |
| C18 | `Preparar` on a closed port fails startup | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:482` | PASS |
| C19 | bucket versioning Enabled, idempotent | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:505` | PASS |
| C20 | no DeleteObject* in `api/` | TRX Passed (carried) | `api.Tests/ArquiteturaTests.cs:990`, `:998` | PASS |
| C21 | same bytes, two keys and two objects | TRX Passed (carried) | `api.Tests/ArmazenamentoTests.cs:522` | PASS |
| C22 | migration on an empty DB | TRX Passed (carried) | `api.Tests/MigracaoArquivosMinioTests.cs:77` | PASS |
| C23 | migration aborts with a row | TRX Passed (carried) | `api.Tests/MigracaoArquivosMinioTests.cs:90` | PASS |
| C24 | no pending model changes | `has-pending-model-changes` exit 0 at HEAD | `api.Tests/ArquiteturaTests.cs:631` | PASS |
| C25 | 4 snapshot files byte for byte | `git diff --exit-code ec56387 HEAD -- api.Tests/Retratos` exit 0 | `api.Tests/RetratoTests.cs:309` | PASS |
| C26 | erros.txt gains only the 503 line | `asserts_minio.py 8e73913 --erros` 0 problems | `api.Tests/RetratoTests.cs:124`, `:125` | PASS |
| C27 | only the 3 allow-listed assertion changes | `asserts_minio.py 8e73913` 0 problems; `--autoteste` ok | `.specs/features/arquivos-minio/asserts_minio.py:25-29`. Independent `git diff -U0 8e73913 HEAD -- api.Tests`: exactly the 3 allow-listed removed `Assert` lines, 0 `Skip =`. `ec56387..HEAD` removes only `OneFactory.cs` `LeiturasDeObjeto` (the same line plus a comment). `OrdemDasRecusasTests.cs` (incl. the 5 `Cadeia_*`) has no diff | PASS |
| C28 | arch rules, CA1502, MSG0005 | TRX Passed; `ca1502_barra.sh` ok; `msg0005_barra.sh` ok at HEAD | `api.Tests/ArquiteturaTests.cs:284`, `:1005` | PASS |
| C29 | compose shape and the e2e suite sends and downloads an attachment | e2e 46/46 on :8082 (carried from `f97c539`); `Compose_com_minio_por_digest` Passed | `web/e2e/anexos.spec.ts:99` `expect(baixado.headers()['content-type']).toBe('application/pdf')`, `:100` Content-Length, `:101` SHA-256 of the body. Object `1/anexos/<32hex>` confirmed in the versioned bucket `one-verify2`. Fault E1 killed it. Ruling of 02/11/2026 satisfied | PASS |
| C30 | whole API suite green; `Layout_e_compose` | 367/367 at HEAD `e84ca8d` | `api.Tests/ArquiteturaTests.cs:92` | PASS |

## Coverage

Verified at `e84ca8d`: the `POST .../mensagens` row (the only non-PASS row) was recomputed. `ResponderChamado.cs` has no diff since `f97c539`. The other rows are carried from `f97c539`, with moved citations refreshed. The rest are carried from `2ef52ab` (Surface routes, `CriarDocumento` statuses, one-way doors, new columns, delete names, changed assertions, snapshot files and startup config: all `-`).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST .../mensagens` write order vs domain (8) | `api/Chamados/ResponderChamado.cs:44-71`, `AcoesChamado.cs:27-33` | 400/415/413/state 409 before the write C4 · 409 `Rejeitar` writes nothing `ArmazenamentoTests.cs:206` (N2 killed) · accepted rejection with an attachment writes one object under the row's key with the uploaded bytes `ArmazenamentoTests.cs:222-223` (N4, B4, K4 killed) · student reply writes C17 (N7 killed) · team reply writes C1 (N5 killed) · DB conflict orphan C17 · 503 C15 + bucket error `:190` | - |
| `POST .../documentos/{id}/versoes` statuses (7) | `api/Conhecimento/NovaVersaoDocumento.cs:20-30` | 201 C12 · 400/413/415 C13 · 503 C15 · 404 before the write · 409 archived, no object `ArmazenamentoTests.cs:237` (N3 killed) | - |
| `POST /api/admin/documentos` write (1 new branch) | `api/Conhecimento/CriarDocumento.cs:29-31` | write after `Versao` C12 (N6 killed) | - |
| GET downloads statuses (3 + 3) | handlers | 200 C7/C10 · 404 without opening the object C8 (F8 killed) · 503 C16 | - |
| download headers vs base (3 per route) | `Armazenamento.ComTamanho` (`api/Armazenamento.cs:76`) | Content-Type, Disposition C7/C10 · Content-Length on the wire `:153`, `:159` (F5 killed) · e2e `anexos.spec.ts:99-100` | - |
| storage failure causes mapped to 503 (AC 13, AC 14) | `api/Armazenamento.cs:46`, `:62-66` | unreachable C15/C16 · bucket service error `ArmazenamentoTests.cs:190` (F9, N1 killed) · missing object C16 · `Preparar` C18 | - |

## Test policy rows

Verified at `e84ca8d` for the touched file. The new test works at the same level as its neighbours: HTTP through `OneFactory`, with the bucket read directly. Everything else is carried from `f97c539`.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| repo convention (no Test policy rows) | handlers, `Armazenamento.cs` | HTTP through `OneFactory` | yes |

## Faults injected

Rows N4, B4 and K4 were verified at `e84ca8d` by hand (AD-025). Each was one fault per build on `api/Chamados/ResponderChamado.cs:61`, reverted with `git checkout -- api` and run on the `ArmazenamentoTests` filter (23 tests). In each case the new test was the only failure. The other rows are carried from `f97c539`.

The new test asserts the claim, not the implementation. `:222` checks that the new bucket keys are exactly `[anexo.Chave]`: one object was written, under the row's key. `:223` checks that this object holds the uploaded PNG bytes. It checks the reopened state only through a 2xx, which belongs to the domain tests and is outside this claim.

| Mutation | Location | Killed |
| --- | --- | --- |
| F5 (re-inject) drop `ctx.Response.ContentLength = tamanho` | `api/Armazenamento.cs:76` | yes - `Content_length_do_anexo_e_da_versao_vai_no_cabecalho` (5000 vs null) |
| F8 (re-inject) open the object before the access check | `api/Chamados/BaixarAnexo.cs:22` | yes - `Download_negado_e_404_sem_abrir_objeto`, `Contador_de_leituras_...` |
| F9 (re-inject) `Gravar` catches only `HttpRequestException` | `api/Armazenamento.cs:46` | yes - `Erro_do_bucket_responde_503_e_nada_fica` |
| N1 drop `AmazonServiceException` from the catch | `api/Armazenamento.cs:46` | yes - `Erro_do_bucket_...` ("erro de serviço do bucket: 500") |
| N2 write before `RejeitarResolucao` decides | `api/Chamados/ResponderChamado.cs:60-61` | yes - `Rejeitar_resolucao_vencida_com_anexo_nao_deixa_objeto` |
| N3 write before `d.NovaVersao` decides | `api/Conhecimento/NovaVersaoDocumento.cs:26-27` | yes - `Nova_versao_de_documento_arquivado_nao_deixa_objeto` |
| N4 (re-inject) `if (...) await Guardar();` becomes `{ }`: no write on an accepted rejection | `api/Chamados/ResponderChamado.cs:61` | yes - `Rejeitar_resolucao_no_prazo_com_anexo_grava_o_objeto` (expected one key `11/anexos/87f6...`, got `[]`) |
| B4 the same write stores `lidos[i].Bytes[..^1]` (wrong bytes) | `api/Chamados/ResponderChamado.cs:61` | yes - same test, `:223` (the stored object is missing its last byte) |
| K4 the same write uses a fresh `Armazenamento.NovaChave(...)` instead of the row's key | `api/Chamados/ResponderChamado.cs:61` | yes - same test, `:222` (expected the row's key, got another one) |
| N5 drop the write on a team reply | `api/Chamados/ResponderChamado.cs:69` | yes - 8 `ArmazenamentoTests` (C1, C7, C9, C11, ...) |
| N6 drop the write in `CriarDocumento` | `api/Conhecimento/CriarDocumento.cs:30` | yes - C10, C12, C14, C15 tests |
| N7 drop the write on a student reply | `api/Chamados/ResponderChamado.cs:65` | yes - only `Conflito_no_banco_apos_gravar_deixa_objeto_orfao` (C17) |
| E1 attachment download sends `application/octet-stream` (mutant image) | `api/Chamados/BaixarAnexo.cs:23` | yes - e2e `anexos.spec.ts:99` (expected `application/pdf`) |

## Gate

Verified at `e84ca8d`, in a detached worktree under the scratchpad (`minio-verify3`), against the running compose postgres and minio. Suites ran one after another.

- `dotnet test api.Tests`: 367 passed, 0 failed (TRX). The new test passed.
- `asserts_minio.py 8e73913` and `asserts_minio.py 8e73913 --erros`: 0 problems each, exit 0. `asserts_minio.py --autoteste`: "autoteste ok", exit 0.
- `dotnet ef migrations has-pending-model-changes --project api`: exit 0, no changes. `ca1502_barra.sh`: ok, exit 0. `msg0005_barra.sh`: ok, exit 0.
- e2e 46/46: carried from `f97c539`. No file under `api/` or `web/` changed since then.
- Cleanup: the worktree was removed and pruned. The compose services were not touched, and the real tree matched its baseline `git status`.

## Ranked gaps

None. Round 2's only gap, the surviving N4, is closed: N4 and two more faults on the same write (B4 wrong bytes, K4 wrong key) each fail the new test.
