# Arquivos no MinIO (AD-021) verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 8e73913..2ef52ab
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Out of scope in the range: `f30a358`, `f996d30`, `f2ad44f` (docs of web-push, tempo-real-signalr, roadmap). Every proof and fault ran in a detached worktree of `2ef52ab`. The real tree's `git status --porcelain` matched the baseline at the end.

## Binding sources

Profile `standard`: step 1 does not run. The plan has no design source marked binding. The ADs it cites (AD-008, AD-021, AD-024, AD-025) were read. No check contradicts them. AD-021 is still `planned` in `.specs/STATE.md:27`, although the plan's Impact row says it moves to `active`. No check covers that change, so it is a note and not a row.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | key `{inst}/anexos/{32hex}`, SHA-256, size 5000, object bytes | full suite at HEAD, TRX Passed | `api.Tests/ArmazenamentoTests.cs:55` `Assert.Matches($"^{b.Instituicao.Id}/anexos/[0-9a-f]{{32}}$", anexo.Chave)`; `:57` `Assert.Equal(Sha256(png), anexo.Hash)`; `:59` `Assert.Equal(png, await f.Objeto(anexo.Chave))` | PASS |
| C2 | no `byte[]`/`bytea`; Chave unique, Hash char(64), Tamanho | TRX Passed | `api.Tests/ArquiteturaTests.cs:921` `DoesNotContain(tipo.GetProperties(), p => p.PropertyType == typeof(byte[]))`; `:930` `Assert.Equal("char(64)", hash.GetColumnType())` | PASS |
| C3 | anexo members exactly id,nome,tipo,tamanho | TRX Passed | `api.Tests/ArmazenamentoTests.cs:71` `Assert.Equal(["id", "nome", "tipo", "tamanho"], ...)`; `:76-77` no `chave`/`hash` | PASS |
| C4 | 400/415/413/409 and no object or row | TRX Passed | `api.Tests/ArmazenamentoTests.cs:100` `Assert.True(r.StatusCode == esperado, ...)` over `:92-95`; `:102` `Assert.Equal(antes, await Estado())` | PASS |
| C5 | `.exe` on a closed ticket gets **400** | TRX Passed | `api.Tests/OrdemDasRecusasTests.cs:437` `Assert.Equal(HttpStatusCode.UnsupportedMediaType, r415.StatusCode)`. The test asserts 415 (the base behaviour). The check text says 400, so the claim as written is false. The coordinator's note in `checks.md` records a text error, but the check line was never changed | FAIL - precision gap (check text) |
| C6 | S3 client config and the four keys | TRX Passed | `api.Tests/ArquiteturaTests.cs:947` `Assert.Equal("http://localhost:9000", s3.Config.ServiceURL.TrimEnd('/'))` and the next lines; `api/Program.cs` reads all four `Armazenamento:*` keys | PASS |
| C7 | 200, bytes, type, disposition, **Content-Length** equal to base and to `Tamanho` | TRX Passed | `api.Tests/ArmazenamentoTests.cs:119` `Assert.Equal(5000, d.Content.Headers.ContentLength)`. Fault F5 (no Content-Length sent) **survived**. A probe with `ResponseHeadersRead` reads `ContentLength=null` under F5 and `5000` at HEAD. `GetAsync` buffers the body, so `ContentLength` is computed from the buffer and does not reflect the header | FAIL - surviving mutant |
| C8 | 404 "Anexo não encontrado." and **zero object reads** | TRX Passed | `api.Tests/ArmazenamentoTests.cs:141-142` asserts the 404. `:144` `Assert.Equal(leiturasAntes, f.LeiturasDeObjeto)` cannot fail: the counter (`OneFactory` `BeforeRequestEvent` on `GetObjectRequest`) never sees `Baixar`, which uses a presigned URL with `HttpClient` (Landing row 6). A probe shows the counter stays `0->0` across a successful 200 download. Fault F8 (open the object before the access check) **survived** | FAIL - surviving mutant |
| C9 | download uses only the row's key | TRX Passed | `api.Tests/ArmazenamentoTests.cs:160` `Assert.Equal(png, ...)` with `?chave=`/`X-Chave` pointing at another institution's object; `api.Tests/ArquiteturaTests.cs:963` only the two handlers call `.Baixar(` | PASS |
| C10 | PDF 200, application/pdf, name, **Content-Length** equal to base; student 404 | TRX Passed | `api.Tests/ArmazenamentoTests.cs:177` `Assert.Equal(pdf.Length, d.Content.Headers.ContentLength)` is the same buffered assertion, and F5 **survived**; `:181-182` 404 holds | FAIL - surviving mutant |
| C11 | 10 MiB download allocates < 5 MiB; Stream, no byte[] | TRX Passed | `api.Tests/ArmazenamentoTests.cs:210` `Assert.True(alocado < 5 * 1024 * 1024, ...)` (F7 killed: allocated 21 350 336 bytes); `api.Tests/ArquiteturaTests.cs:979-981` | PASS |
| C12 | PDF and new version: `{inst}/documentos/{32hex}`, hash, size, text fields | TRX Passed | `api.Tests/ArmazenamentoTests.cs:230` key regex; `:231` `Assert.Equal(Sha256(bytes), versao.Hash)`; `:232` size; `:236` object bytes (F4 killed) | PASS |
| C13 | 8 PDF refusals, no object or row | TRX Passed | `api.Tests/ArmazenamentoTests.cs:267` status over `:255-262`; `:269` `Assert.Equal(antes, await Estado())` | PASS |
| C14 | v1 object intact after v2, each version downloads its own PDF | TRX Passed | `api.Tests/ArmazenamentoTests.cs:287` `Assert.Equal(Sha256(v1), Sha256(await f.Objeto(versoes[0].Chave)))`; `:290` | PASS |
| C15 | 3 upload routes 503 problem+json, no rows | TRX Passed | `api.Tests/ArmazenamentoTests.cs:297-299` (503, `application/problem+json`, detail); `:324` counts unchanged (F2 killed). The proof uses `OneFactory.MinioFora()` (the live client's `ServiceURL` is switched to port 1 after startup) instead of the `PortaMinio`-derived factory the text names. The observable (the endpoint the API uses is a closed port) is the same, so it is accepted with a precision note | PASS |
| C16 | 2 downloads 503 on closed port and on missing object | TRX Passed | `api.Tests/ArmazenamentoTests.cs:337-338` and `:349-350` via `Indisponivel` (F2 killed) | PASS |
| C17 | DB conflict after write: 409 AlteradoPorOutro, 1 orphan object | TRX Passed | `api.Tests/ArmazenamentoTests.cs:377-381` | PASS |
| C18 | `Preparar` on a closed port names endpoint and bucket; startup fails | TRX Passed | `api.Tests/ArmazenamentoTests.cs:389-396` (`OneFactoryMinioFechado`) | PASS |
| C19 | bucket created, versioning Enabled, idempotent | TRX Passed | `api.Tests/ArmazenamentoTests.cs:412` `Assert.Equal(VersionStatus.Enabled, ...)` for both calls | PASS |
| C20 | no DeleteObject* in `api/`; rule catches each of 4 names | TRX Passed (1 + 4 cases) | `api.Tests/ArquiteturaTests.cs:990` `Assert.Empty(...ChamaDelete...)` (F3 killed); `:998` | PASS |
| C21 | same bytes give two keys and two objects | TRX Passed | `api.Tests/ArmazenamentoTests.cs:429-434` | PASS |
| C22 | migration applies on an empty DB | TRX Passed | `api.Tests/MigracaoArquivosMinioTests.cs:73-79` (`chave.NO`, `hash.NO`, no `conteudo`, unique `(chave)` at `:77`) | PASS |
| C23 | migration aborts with a row (2 cases) | TRX Passed (2 cases) | `api.Tests/MigracaoArquivosMinioTests.cs:90` `Assert.Contains("docker compose down -v", ...)`; `:95` history (F6 killed in both cases) | PASS |
| C24 | no pending model changes | TRX Passed; `dotnet ef migrations has-pending-model-changes --project api` exit 0 | `api.Tests/ArquiteturaTests.cs:631` `Assert.False(... HasPendingModelChanges())` | PASS |
| C25 | 4 snapshot files byte for byte | `git diff --exit-code 8e73913 HEAD -- ...` exit 0; 4 RetratoTests Passed | `api.Tests/RetratoTests.cs:309` `Assert.Equal(gravados.Select(Normalizar), vivos)`; routes `:39` `Assert.Equal(61, viva.Count)` | PASS |
| C26 | erros.txt gains only the 503 line; 9 lines compared | `asserts_minio.py 8e73913 --erros` 0 problems; TRX Passed | `api.Tests/RetratoTests.cs:124` `Assert.Equal(9, gravados.Length)`; `:125` `Assert.Equal(gravados.Select(SemTraceId), vivos)` (F2 killed it: 503 vs 500) | PASS |
| C27 | only the 3 allow-listed assertion changes, no Skip, no mixed commit | `asserts_minio.py 8e73913` 0 problems; `--autoteste` ok | `.specs/features/arquivos-minio/asserts_minio.py:25-29`. Independent `git diff -U0 8e73913 HEAD -- api.Tests` finds exactly 3 removed `Assert` lines (the 3 allow-listed ones), 0 added `Skip =`, and no `web/` change in the range | PASS |
| C28 | arch rules, 9th root file, glossary, CA1502, MSG0005 | TRX Passed (4); `ca1502_barra.sh` ok; `msg0005_barra.sh` ok | `api.Tests/ArquiteturaTests.cs:284` list with `"Armazenamento"`; `:1005` glossary meaning >= 10; `:586` domain without AspNetCore/Mediator; `:371` | PASS |
| C29 | compose shape **and the e2e suite passes sending and downloading an attachment** | `Compose_com_minio_por_digest` Passed; e2e 45/45 on :8082 | `api.Tests/ArquiteturaTests.cs:1014`, `:1021`, `:1023` prove the compose shape. The e2e suite never sends or downloads an attachment (`rg setInputFiles web/e2e` finds only the mocked matrículas CSV at `web/e2e/arranjo.spec.ts:664`, and `/api/anexos` appears nowhere), so the named proof does not reach that half of the claim. A manual smoke against the :8082 container (PDF upload, then download: 200, `Content-Length: 621`, same SHA-256, object `1/documentos/<32hex>` in a versioned bucket) shows the behaviour works but is not the check's proof | FAIL - claim not reached by its proof |
| C30 | whole API suite green **at each commit**; `Layout_e_compose` | see Gate | `api.Tests/ArquiteturaTests.cs:92` (`Layout_e_compose`) Passed | PASS - the suite is green at every code commit when run sequentially (Gate). The builder ran it only at HEAD; this run supplies the per-commit proof |

## Coverage

Recomputed from the code (handlers, `Armazenamento.cs`, `Program.cs`) and from the plan's Surface, Landing and Criteria.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Surface routes (5) | plan Surface, `MapGet`/`MapPost` | each route has 2xx + 503 proofs (C1, C12, C7, C10, C15, C16) | - |
| `POST .../mensagens` refusals relative to `Gravar` (6) | `AgirNoChamado`, `ResponderChamado.cs:42-56`, `AcoesChamado.cs:31-32` | 400 nota, 415, 413, state 409 before the write C4 · conflict 409 C17 · 503 C15 | 409 from `Chamado.Rejeitar` (student rejects a resolved ticket with an attachment after the rejection window): `Gravar` runs at `ResponderChamado.cs:47` before `RejeitarResolucao` returns 409 at `AcoesChamado.cs:32`, so an orphan object is written and no check covers it |
| `POST .../documentos/{id}/versoes` statuses (7) | `NovaVersaoDocumento.cs:20-30` | 201 C12 · 400/413/415 C13 · 503 C15 · 404 before the write (status unchanged, existing) | 409 "O documento está arquivado." comes after `Versao(...)` has already called `Gravar` (`NovaVersaoDocumento.cs:25-26`): an orphan object, and the coverage row lists 5 statuses where the code has 7 |
| `POST /api/admin/documentos` statuses (5) | `CriarDocumento.cs` | 201 C12 · 400/413/415 C13 · 503 C15 | - |
| GET downloads statuses (3 + 3) | handlers | 200 C7/C10 · 404 C8/C10 · 503 C16 | 404 "without opening the object" (C8) is unproven: the counter is blind (F8 survived) |
| download headers vs base (3 per route) | `Armazenamento.ComTamanho`, `Results.Stream` | Content-Type C7/C10 · Content-Disposition C7/C10 | Content-Length on the wire, both routes (F5 survived) |
| storage failure causes mapped to 503 (AC 13: unreachable, bucket error; AC 14: unreachable, missing object) | `Armazenamento.cs:35` (`AmazonClientException or HttpRequestException`), `:53-56` | unreachable (`HttpRequestException`) C15/C16 · missing object C16 · `Preparar` C18 | AC 13 "erro do bucket" (`AmazonClientException`/`AmazonS3Exception` from an S3 error response): fault F9 removed it from the catch and C15 still passed |
| one-way doors (7, incl. Landing rows 6 and 7) | plan Landing | 1 C2 C22 C23 · 2 C6 · 3 C1 C12 C21 · 4 C19 C20 · 5 C29 (compose shape) · 6 C11 · 7 C15 C16 | - |
| new columns (6) | `Anexo.cs`, `VersaoDocumento.cs`, `OneDb.cs` | C2, C22, C1, C12 | - |
| forbidden delete names (4) | C20 rule | Theory, 4 cases | - |
| changed assertions (3) | `git diff -U0 8e73913 HEAD -- api.Tests` | exactly the 3 allow-listed lines | - |
| snapshot files (5) | `api.Tests/Retratos` | C25, C26 | - |
| startup config `Armazenamento:*` (3 places) | `api/Program.cs`, `OneFactory.cs`, `docker-compose.yml` | C6 (Program, OneFactory) · C29 (`api.Tests/ArquiteturaTests.cs:1023`) | - |

## Test policy rows

`checks.md` omits the section, so the repo's conventions decide: `ArquiteturaTests` covers code rules, `RetratoTests` covers the contract, and HTTP tests through `OneFactory` cover use cases. Every claim about a status code or response shape has an HTTP proof, so there is no level gap. The gaps are the vacuous assertions in C7, C8 and C10 described above, not levels.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| repo convention (no Test policy rows) | handlers, `Armazenamento.cs` | HTTP through `OneFactory` | yes for level; vacuity findings are under Checks |

## Swept existing

- authorization: `ChamadoRotas.Carregar` is still called in `api/Chamados/BaixarAnexo.cs` before `Baixar`. The role check is still in `BaixarVersaoDocumento.cs`. The `/admin` group is unchanged. Confirmed.
- state transitions: `api/Dados/Chamados/Chamado.cs` and `Documento.cs` have no diff in the range. Confirmed.

## Faults injected

All faults ran in a scratch worktree, by hand (AD-025: mutation tool suspended). No fault added a CA1502 risk (the build stayed green). Round A was F1, F2, F3, F6 and F7 in one build, with disjoint target proofs. Round B was F4, F5 and F8. F9 ran alone. Each failure message was checked against its fault. The coordinator's priority list asked for more than the procedure's cap of five.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 tenant prefix `a.Instituicao.Id` -> `+ 1` | `api/Chamados/ResponderChamado.cs:47` | yes - C1 (`Assert.Matches` pattern not found) |
| F2 503 -> 500 in `StatusCodeSelector` | `api/Program.cs` `AddExceptionHandler` | yes - C15, C16, `Corpos_de_erro` (503 vs 500) |
| F3 add `Apagar` calling `s3.DeleteObjectAsync` | `api/Armazenamento.cs` | yes - C20 `Codigo_do_api_nao_apaga_objeto` |
| F4 hash over `bytes[..^1]` | `api/Armazenamento.cs:36` | yes - C12, C14 |
| F5 drop `ctx.Response.ContentLength = tamanho` | `api/Armazenamento.cs:66` | no - survived C7, C10 and `AnexoTests.Download_devolve_os_mesmos_bytes` (header absent on the wire, confirmed by probe) |
| F6 migration guard `RAISE EXCEPTION` -> `RAISE NOTICE` | `api/Dados/Migracoes/20261103023003_ArquivosMinio.cs` | yes - C23, both cases |
| F7 `Baixar` buffers the whole object into a `MemoryStream` | `api/Armazenamento.cs:54` | yes - C11 (21 350 336 bytes) |
| F8 open the object before the access check | `api/Chamados/BaixarAnexo.cs:22` | no - survived C8 (object-read counter cannot see `HttpClient` reads) |
| F9 Gravar catches only `HttpRequestException` | `api/Armazenamento.cs:35` | no - survived C15 (S3 error-response branch untested) |

## Gate

- `dotnet test api.Tests` at HEAD `2ef52ab`: 361 passed, 0 failed (TRX; every named proof appears individually, Theories counted: C20 4 cases, C23 2 cases).
- Per commit (full suite, sequential, first try each): `9ca2325` 329/329 · `432dff2` 345/345 · `6f94d1a` 351/351 · `ffbb944` 354/354 · `8bab948` 361/361 · `f9fc2f8` 361/361. `2ef52ab` (docs only) has the same code as `f9fc2f8`. An earlier parallel attempt failed with Postgres `53300 too many clients` and a mixed checkout, both caused by my own concurrent runners and not by the code, so it was discarded and the commits were rerun one at a time
- `asserts_minio.py 8e73913`, `--erros`, `--autoteste`: 0 problems, 0 problems, ok.
- `git diff --exit-code` on the 4 snapshot files: exit 0. `has-pending-model-changes`: clean. `ca1502_barra.sh`, `msg0005_barra.sh`: ok.
- e2e: `E2E_URL=http://localhost:8082 npx playwright test` against image `one-minio-verify` (own DB `one_minio_verify`, bucket `one-verify`, compose network, `Armazenamento__*` set): 45 passed, 0 failed. The bucket was created with versioning enabled.

## Ranked gaps

1. C7, C10: the Content-Length assertions are vacuous because `GetAsync` buffers the body. F5 survived. Assert with `HttpCompletionOption.ResponseHeadersRead`. `api.Tests/ArmazenamentoTests.cs:119`, `:177`.
2. C8: the "zero object reads" assertion is vacuous because `LeiturasDeObjeto` counts SDK `GetObjectRequest`s while `Baixar` uses `HttpClient` on a presigned URL (Landing row 6). F8 survived. `api.Tests/Infra/OneFactory.cs` (`BeforeRequestEvent`), `api.Tests/ArmazenamentoTests.cs:144`.
3. Coverage: two domain 409s run after `Gravar` and leave orphan objects with no check: `Rejeitar` with an attachment and a new version of an archived document. `api/Chamados/ResponderChamado.cs:47`, `api/Conhecimento/NovaVersaoDocumento.cs:25-26`.
4. Coverage: AC 13 "erro do bucket" (the `AmazonClientException` branch) has no proof. F9 survived. `api/Armazenamento.cs:35`.
5. C29: the e2e suite does not send or download an attachment. The check text promises it. `web/e2e/arranjo.spec.ts:664` is the only file input.
6. C5: the check text says 400. The proven and correct behaviour is 415. The check line needs a user-approved correction.
