# Refatoração SOLID e Clean Code verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: c267db8..f18ad08 (round 2 scope: the fix 52ff4b8..f18ad08, test only, `api.Tests/DocumentoTests.cs` +16 lines)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier), not the round 1 verifier and not the fix's author

Round 1 (report at 52ff4b8) failed on one surviving mutant: the cited DOCUMENTO's `atualizado` flag (`api/Conhecimento/Fontes.cs:89`) forced to `false` left all 267 API tests green. The fix f18ad08 adds `DocumentoTests.Documento_citado_com_versao_nova_avisa_a_equipe`. That mutant and two more faults on the same document surface are now killed by the new test, and the coverage member it left unproven is proven. All three suites re-ran green at f18ad08. Production code is unchanged since round 1 (`git diff 52ff4b8..f18ad08 --stat` lists only the test file), so everything outside the fix and the non-PASS verdicts is carried from 52ff4b8 and marked as such below.

## Binding sources

Carried from 52ff4b8, and the fix touches no interface. None. The plan marks no source as binding, so step 1 does not apply at `standard`.

## Checks

Proofs re-ran in full at f18ad08:
- `timeout 900 dotnet test api.Tests` (TRX): 268 passed, 0 failed. That is 267 from round 1 plus the new test. The TRX lists `DocumentoTests.Documento_citado_com_versao_nova_avisa_a_equipe`, `DocumentoTests.Fonte_documento_no_detalhe`, `VersaoCitadaTests.Edicao_nao_muda_o_exibido_e_avisa_a_equipe` and `ArquiteturaTests.Chamados_nao_consulta_versoes` individually, each with outcome Passed. After the fault runs, the full suite re-ran on a clean build: 268 passed.
- `npm --prefix web run test`: 16 files, 99 passed.
- `docker compose up -d --build api` at f18ad08, then `npm --prefix web run e2e`: 11 passed.
- `python .specs/features/refatoracao-solid/asserts_preservados.py c267db8` printed "0 problema(s) entre c267db8 e HEAD", exit 0.

Rows C1, C2 and C28 were verified at f18ad08. Every other row is carried from 52ff4b8 with its evidence: the fix changed no production file and no other test file, so those citations have not moved. Their proofs are among the 268/99/11 above, all of which passed at f18ad08.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | suites green at every commit | verified at f18ad08: API 268, web 99, e2e 11 (container rebuilt at f18ad08). Per-commit runs for d208f4b..cad54c7 carried from 52ff4b8. f18ad08 changes only a test file | suite-level claim; C2 below guards assertion loss | PASS |
| C2 | no assertion removed or skipped | verified at f18ad08: `asserts_preservados.py c267db8` "0 problema(s)", exit 0 | `.specs/features/refatoracao-solid/asserts_preservados.py:41` - `if adicionadas[texto] < n` | PASS |
| C3 | coverage writes lcov with v8 5.0.5 | `npm --prefix web run coverage` exit 0, lcov 26109 bytes | `web/package.json:29` `"@vitest/coverage-v8": "5.0.5"` and `web/package.json:34` `"vitest": "5.0.5"` | PASS |
| C4 | crapper sees ChamadoDetalhe > 0% | the proof's grep matched | crapper output: `ChamadoDetalhe chamados.ChamadoDetalhe 4 100.0% 4.0` | PASS |
| C5 | CC 11 breaks with CA1502, CC 10 builds | `ca1502_barra.sh` printed "ok: 11 quebra ... 10 compila", exit 0 | `.specs/features/refatoracao-solid/ca1502_barra.sh:27` - `grep -q "error CA1502: 'MetodoPlantado'"` | PASS |
| C6 | door 2 configured | 1/1 test passed | `api.Tests/ArquiteturaTests.cs:257-261` - `Assert.Contains("CA1502(Method): 10", ...)`, WarningsAsErrors, editorconfig | PASS |
| C7 | baseline before the first code commit | `baseline_antes.py c267db8` printed "ok"; baseline at 69fd9ab, first api commit d208f4b | `.specs/features/refatoracao-solid/baseline_antes.py:31` | PASS |
| C8 | 10-day close and texts | 1/1 passed | `api.Tests/PrazosTests.cs:37` - `Assert.Equal("Fechado automaticamente: 10 dias sem confirmação", ...)`; `:38` still RESOLVIDO at 9 d 23 h; `:39` `"(até 10 dias)"` | PASS |
| C9 | rejection follows ConfirmacaoDias | 1/1 passed | `api.Tests/PrazosTests.cs:52` 200 at 10 d; `:54-55` 409 with `"O prazo de 10 dias para rejeitar a resolução terminou."` | PASS |
| C10 | 4-day reminder | 1/1 passed | `api.Tests/PrazosTests.cs:70` none at 3 d 23 h; `:72` `"Lembrete ao aluno: 4 dias aguardando resposta"` | PASS |
| C11 | defaults and texts | AgendadorTests 5/5 and Padroes 1/1 passed | `api.Tests/PrazosTests.cs:80-84` (30 min, 7, 7, 3, 7) and `:96,100-102` ("7 dias", "3 dias") | PASS |
| C12 | 15 literals only in the constants | 1/1 passed | `api.Tests/ArquiteturaTests.cs:153` set equality per group; `:156` `Assert.Equal(["Dados/Entidades.cs"], ...)` | PASS |
| C13 | "última versão" in 1 file, in Conhecimento | 1/1 passed | `api.Tests/ArquiteturaTests.cs:164-165` | PASS |
| C14 | "artigo ou documento" in 1 file | 1/1 passed | `api.Tests/ArquiteturaTests.cs:175-176` | PASS |
| C15 | config keys read once | 1/1 passed | `api.Tests/ArquiteturaTests.cs:185,191-192`; startup read directly at `api/Program.cs:80-81` | PASS |
| C16 | chat and embeddings URLs, Bearer, 20 s | 3 filters, 3 tests passed | `api.Tests/LlmRequisicaoTests.cs:76,105-108`; `api.Tests/ProvedorTests.cs:49,59` | PASS |
| C17 | 1 signature file; 413 and 415 for anexo and documento | Assinatura 1/1, EmailAnexoTests 1/1, DocumentoTests 10/10 passed | `api.Tests/ArquiteturaTests.cs:198`; `api.Tests/EmailAnexoTests.cs:208,212`; `api.Tests/DocumentoTests.cs:178-179,185-186` | PASS |
| C18 | 8 and 128 declared once; 7/129 refused, 8/128 accepted | 2 tests passed | `api.Tests/ArquiteturaTests.cs:205-208`; `api.Tests/SenhaTests.cs:70-73,83,86-87` | PASS |
| C19 | no DateTime.Now/UtcNow | 1/1 passed | `api.Tests/ArquiteturaTests.cs:228` | PASS |
| C20 | glossary lists 15 literals and 5 deadlines | 1/1 passed | `api.Tests/ArquiteturaTests.cs:244,250` | PASS |
| C21 | permission table cell by cell | 1/1 passed | `api.Tests/PermissoesChamadoTests.cs:41` per cell; `:45` `Assert.Equal(100, celulas)`; `:49` owner case | PASS (precision gap, see below) |
| C22 | 10 h minus 4 h waiting = 6 h | 1/1 passed | `api.Tests/IndicadoresCalculoTests.cs:32` - `Assert.Equal(6, r.TempoResolucaoHoras)` | PASS |
| C23 | pure function = route on the same data | 1/1 and IndicadoresTests 10/10 passed | `api.Tests/IndicadoresCalculoTests.cs:62-76`, same 14 literals as `api.Tests/IndicadoresTests.cs:105-119` | PASS |
| C24 | 16 carga reasons; command writes nothing on error | 1/1 and InstituicaoComandoTests 15/15 passed | `api.Tests/CargaValidacaoTests.cs:52,54`; `api.Tests/InstituicaoComandoTests.cs:116,220` `Assert.Equal(antes, await Contagens())` | PASS |
| C25 | 10 CSV reasons plus "; " join | 1/1 and AdminTests 20/20 passed | `api.Tests/CsvMatriculasTests.cs:43,46` | PASS |
| C26 | 200/201, "?", 2nd/3rd | 1/1 passed | `api.Tests/PerguntaTests.cs:13-15,21,23` - `Assert.True(Pergunta.Aceita(DeTamanho(200), []))` ... `Assert.False(... [Tipos.Pergunta, Tipos.Pergunta])` | PASS |
| C27 | rule tests without OneFactory/OneDb/HttpClient | 1/1 passed | `api.Tests/ArquiteturaTests.cs:219-221` | PASS |
| C28 | Chamados does not query versions; detail shows the source and "atualizado" for artigo or documento | verified at f18ad08: Chamados_nao_consulta_versoes, VersaoCitadaTests, DocumentoTests.Documento_citado_com_versao_nova_avisa_a_equipe and Fonte_documento_no_detalhe all passed (TRX) | `api.Tests/ArquiteturaTests.cs:271`; ARTIGO `api.Tests/VersaoCitadaTests.cs:52`; DOCUMENTO `atualizado`: `api.Tests/DocumentoTests.cs:319` `Assert.False(await Atualizado())` on the cited version, then `:322` a new version is published (`Created`), then `:324` `Assert.True(await Atualizado())`, read as the atendente through `GET /api/chamados/{numero}` (`:317-318`, the source with `tipo == "DOCUMENTO"`); DOCUMENTO title/version `:297`, PDF `:305-307` | PASS (precision gap, see below) |
| C29 | 8 folders, 8 root files | 1/1 passed | `api.Tests/ArquiteturaTests.cs:278-282` | PASS |
| C30 | namespace = folder | 1/1 passed | `api.Tests/ArquiteturaTests.cs:294` | PASS |
| C31 | closed list of cross-slice pairs, no leftovers | 1/1 passed | `api.Tests/ArquiteturaTests.cs:320` - `Assert.Equal(ReferenciasEntreFatias.Order(), usadas.Order())` | PASS |
| C32 | import route alone in its file | 1/1 passed | `api.Tests/ArquiteturaTests.cs:327-328` | PASS (precision gap, see below) |
| C33 | 1 SaveChanges on create and edit | 1/1 passed | `api.Tests/AdminTests.cs:71,80` - `Assert.Equal(1, f.Gravacoes.Total)` | PASS |
| C34 | build with 0 CA1502 | `dotnet build api -warnaserror:CA1502 --no-incremental`: 0 warnings, 0 errors | `api/CodeMetricsConfig.txt:1` `CA1502(Method): 10` with `api/One.Api.csproj:9` WarningsAsErrors | PASS |
| C35 | web slices | `-t "estrutura em fatias"` ran 1 passed, 98 skipped | `web/src/test/estrutura.test.ts:27-28,35,37,49` | PASS |
| C36 | crapper exits 0 at 9.99 | exit 0; worst `Documentos` 9.0 | `web/src/conhecimento/Documentos.tsx:88` `Documentos` is the worst function (CC 9, 100% coverage, CRAP 9.0) | PASS |
| C37 | dryer finds no candidate at 0.8 | output "No duplicate candidates found.", grep exit 0 | `.specs/features/refatoracao-solid/checks.md:155` proof grep matched dryer's "No duplicate candidates found." | PASS |
| C38 | mutator kills every mutant | `mutator_windows/mutator_web.sh` exit 0: 282 killed, 0 survived, 0 uncovered | `.specs/features/refatoracao-solid/mutator_windows/mutator_web.sh:12` | PASS |
| C39 | ChamadoDetalhe loading, error, empty | `-t "detalhe do chamado carregando, erro e sem respostas"` ran 1 passed | `web/src/chamados/chamado.test.tsx:27` spinner; `:33-34` alert-danger with detail; `:40` "Nenhuma resposta ainda." | PASS |

Does the new test assert what C28 says? C28 asks that the detail keep showing the team the updated-version notice for a cited artigo or documento. The test reads the detail as the atendente (team), picks the DOCUMENTO source in the transcript and asserts both directions: `atualizado` is false while the cited version is still current, and true once a newer version is published. That matches the claim. It does not just mirror the code: the inverted mutant (F3) fails on the `false` side, and the two mutants that pin the flag (F1, F2) fail on the `true` side. The article side stays proven by `VersaoCitadaTests.cs:52` (F4 killed).

Precision gaps (findings about the checks; the claims are still proven):
- New, C28: its `Proof:` lines (`checks.md:125-126`) run `ArquiteturaTests.Chamados_nao_consulta_versoes` and `VersaoCitadaTests` only. The test that now proves the documento half lives in `DocumentoTests`, so it runs only under C1's whole-suite proof. A run of C28's own filters would not exercise the documento side. Suggested fix: add `Proof: dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Documento_citado_com_versao_nova_avisa_a_equipe"` to C28. This is not blocking because the test exists, runs and kills the faults.
- Carried from 52ff4b8 and still open, since checks.md is unchanged: C21's count should be 100 cells, not 110; C32's route should be `/matriculas/importacao`, not `/importar`; C17's `EmailAnexoTests` filter matched no class at base; C35 is proven only as "the test lives in a slice and opens at least one screen of that slice"; the `//` comment stripping at `ArquiteturaTests.cs:133` is evadable. None of these blocks the feature.

Builder claims checked: carried from 52ff4b8. The fix touches none of them.

## Coverage

Sets carried from 52ff4b8 unless marked. The fix changes no production code, so no set gained a member. Only the cited-source row had an unproven member, and it was recomputed at f18ad08.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| cited-source fields shown to staff (ARTIGO, DOCUMENTO) x (title/number, link, atualizado) - recomputed at f18ad08 | `api/Conhecimento/Fontes.cs:89` (DOCUMENTO), `:94` (ARTIGO), `:118` (document `Atual` lookup) | ARTIGO title and atualizado `VersaoCitadaTests.cs:52` (F4 killed); DOCUMENTO title and version `DocumentoTests.cs:297`, PDF `:305-307`; DOCUMENTO atualizado false `DocumentoTests.cs:319` and true `:324` (F1, F2, F3 killed) | - |
| suites (3) - verified at f18ad08 | repo test projects | API 268, web 99, e2e 11 at f18ad08; earlier commits carried | - |
| doors (3) - carried from 52ff4b8 | plan Landing | door 1 `web/package.json:11,29,34`; door 2 C5, C6; door 3 C29, C30, C31, C35 | - |
| deadlines (5) - carried | `api/Prazos.cs:6-19` | `PrazosTests.cs:80-84`, C8, C9, C10 | - |
| deadline texts (4) - carried | grep of `dias` texts in `api/` | `Agendador.cs:152`, `Agendador.cs:168`, `Avisos.cs:26`, `AcoesChamado.cs:250` | - |
| deadline borders (6) - carried | checks C8-C10 | 9 d 23 h / 10 d; 10 d / 10 d 1 min; 3 d 23 h / 4 d | - |
| persisted literals (15) - carried | `api/Dados/Entidades.cs:254-273` | C12, C20 | - |
| config reads (3) - carried | grep of `api/` | C15 | - |
| startup config, 2 assemblies - carried | `api/Program.cs:80-81`; `api.Tests/Infra/OneFactory.cs:41-42,63` | C15, C16 | - |
| provider URLs (2) - carried | `LlmRequisicaoTests.cs:76,105` | C16 | - |
| upload refusals (4) - carried | `Arquivos.cs:26-35`, callers | C17 | - |
| password bounds (4) - carried | `api/Acesso/Senha.cs:6-7` | C18 | - |
| permission cells (100 + owner) - carried | `PermissoesChamado.cs:15-28` | C21 | - |
| indicators (14) - carried | `IndicadoresTests.cs:105-119` | C23 | - |
| carga reasons (16) - carried | `c267db8:api/Comando/InstituicaoComando.cs:101-139` | C24 | - |
| CSV reasons (10 + header) - carried | `c267db8:api/Rotas/AdminRotas.cs` | C25; header `CsvMatriculasTests.cs:58-59` | - |
| question rule (5) - carried | `api/Assistente/Pergunta.cs:6-13` | C26 | - |
| pure test classes (5) - carried | C27 list | C27 | - |
| api folders (8) and root files (8) - carried | filesystem | C29 | - |
| cross-slice pairs (10) - carried | independent grep | C31 | - |
| web slices (6) and root modules - carried | `web/src` tree | C35 | - |
| user saves (2) - carried | `UsuarioRotas.cs:69-82` | C33 | - |
| ChamadoDetalhe states (4) - carried | `ChamadoDetalhe.tsx:303-304`, `Conversa.tsx:114` | C39; no permission `VisibilidadeTests.cs:370` | - |
| ub-mode tools (3) - carried | plan | C36, C37, C38 | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached by HTTP (carried from 52ff4b8) | `PermissoesChamado.cs`, `CalculoIndicadores.cs`, `CargaValidacao.cs`, `CsvMatriculas.cs`, `Pergunta.cs` | boundary C1 and own layer C21-C26 | yes |
| Decides, not HTTP: deadlines (carried) | `Prazos.cs`, `Agendador.cs`, `Avisos.cs`, `AcoesChamado.cs` | scheduler and route with fake clock | yes |
| Code structure (carried) | `ArquiteturaTests.cs` rules | one text rule per member | yes |
| Instrumentation, moves (re-judged at f18ad08) | `Conhecimento/Fontes.cs` (cited sources moved from `ChamadoRotas`, rewritten on `VersoesDocumentoAtuais`) | covered by the existing suite (C1, C2) | yes - both branches of `Citadas` now carry an `atualizado` assertion in both directions for the document; F1-F4 killed |

## Faults injected

Round 2 was verified at f18ad08. Faults went into the real tree, as in round 1. Baseline porcelain was `?? .idea/` and `?? .specs/features/vertical-slice-completa/`. Each fault was applied with `sed`, confirmed applied (grep count 1), rebuilt and run with `dotnet test api.Tests --filter "...DocumentoTests.Documento_citado_com_versao_nova|...VersaoCitadaTests|...DocumentoTests.Fonte_documento_no_detalhe"`, then restored with `git checkout -- api/Conhecimento/Fontes.cs`. Porcelain matched the baseline afterwards, and a clean full-suite run gave 268/268.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (round 1 survivor F-C28doc): DOCUMENTO `atualizado` `documentos[d].Atual != d` -> `false` | `api/Conhecimento/Fontes.cs:89` | yes - Documento_citado_com_versao_nova_avisa_a_equipe, `Assert.True() Failure` at `:324` |
| F2: document `Atual` lookup -> `Atual = v.Id` (never sees the newer version) | `api/Conhecimento/Fontes.cs:118` | yes - same test, `Assert.True() Failure` |
| F3: DOCUMENTO `atualizado` inverted (`Atual == d`) | `api/Conhecimento/Fontes.cs:89` | yes - same test, `Assert.False() Failure` at `:319` |
| F4: ARTIGO `atualizado` `artigos[v].Atual != v` -> `false` | `api/Conhecimento/Fontes.cs:94` | yes - VersaoCitadaTests.Edicao_nao_muda_o_exibido_e_avisa_a_equipe |

Carried from 52ff4b8: the 35 other round 1 faults, all killed (`api/CodeMetricsConfig.txt:1` threshold through `web/src/` root module and `src/telas/`). They are listed in the round 1 report at 52ff4b8. The fix touches none of their surfaces. The mutator (C38: 282 killed, 0 survived over `web/src/*`) was not re-run, because the fix touches no web code. Its result is carried from 52ff4b8. The round 1 row "DOCUMENTO `atualizado` -> `false`" is superseded by F1 above.

## Gate

- `dotnet test api.Tests` at f18ad08: 268 passed, 0 failed. Re-run clean after the faults: 268 passed.
- `npm --prefix web run test`: 99 passed, 0 failed.
- `npm --prefix web run e2e` against a container rebuilt at f18ad08: 11 passed, 0 failed.
- Final `git status --porcelain`: only pre-existing untracked `.idea/` and `.specs/features/vertical-slice-completa/`, plus this report and the lessons files.

**Ranked gaps** (non-blocking)
1. C28's `Proof:` lines do not name the new DocumentoTests test (precision gap). Add the filter to `checks.md` C28. - C28 - `.specs/features/refatoracao-solid/checks.md:125-126`
2. Carried precision gaps: C21 "110" should read 100; C32's route should read `/importacao`.
