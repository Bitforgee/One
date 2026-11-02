# Refatoração SOLID e Clean Code verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: c267db8..97645e3 (code ends at 1fd766b; b7ca20d and 97645e3 are docs only)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

One finding fails the feature: a mutant survived on the cited-source surface C28 claims (`api/Conhecimento/Fontes.cs:89`, the
"atualizado" flag of a cited DOCUMENTO). All 267 API tests stay green with it. Everything else is proven.

## Binding sources

None. The plan marks no source as binding, so step 1 does not apply at `standard`. `Sources` lists the user's requests, `ub-mode` and the CA1502 doc.

## Checks

The API proofs ran as one invocation, `dotnet test api.Tests` at HEAD: 267 passed, 0 failed (TRX). Each named filter was matched against the TRX names, and every filter matched at least one test (counts below), so no filter is a zero-match green (L-002). Web: `npm --prefix web run test -- --reporter=verbose` gave 99 passed. e2e: `npm --prefix web run e2e` against a container rebuilt at HEAD gave 11 passed.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | suites green at every commit | HEAD: API 267, web 99, e2e 11. Per commit, in a worktree: API at d208f4b 237, e61ee07 237, d6dcd45 252, 2484e18 260 (e510bed api = HEAD api). Web at 69fd9ab 35, 6912b5f 36, 2146880 37, cad54c7 99. e2e 11/11 at d208f4b, e61ee07, d6dcd45, 2484e18, e510bed, 6912b5f, 2146880, cad54c7 (image built per commit) | suite-level claim; C2 below guards assertion loss | PASS |
| C2 | no assertion removed or skipped | `asserts_preservados.py c267db8` printed "0 problema(s)", exit 0; `--autoteste` ok | `.specs/features/refatoracao-solid/asserts_preservados.py:41` - `if adicionadas[texto] < n` | PASS |
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
| C28 | Chamados does not query versions; detail shows source and "atualizado" | Chamados_nao_consulta 1/1, VersaoCitadaTests 1/1 passed | `api.Tests/ArquiteturaTests.cs:271`; `api.Tests/VersaoCitadaTests.cs:52` (ARTIGO `atualizado` true); DOCUMENTO title/version in `api.Tests/DocumentoTests.cs:297` and the PDF at `:305-307`. Nothing asserts DOCUMENTO `atualizado`: mutant F-C28doc survived the whole suite | FAIL |
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

Precision gaps (findings about the checks; the claims are still proven):
- C21 says "11 ações × 2 papéis × 5 estados, 110 células". The table (`api/Chamados/PermissoesChamado.cs:15-28`, the same as `c267db8:api/Rotas/ChamadoRotas.cs:25-38`) has 10 distinct actions in 11 action/papel pairs, so the full grid is 100 cells. The test asserts all 100 plus the owner case. The number in the check is wrong; the coverage it asks for is complete.
- C32 names `POST /api/admin/matriculas/importar`. That route does not exist and never did. The real route, unchanged since base, is `/matriculas/importacao` (`api/Administracao/ImportacaoRotas.cs:9`), and the test uses it. AC 29 is proven.
- C17's filter `EmailAnexoTests` matched no class at base. The builder added a real class for it (`api.Tests/EmailAnexoTests.cs:197-215`) that asserts 413 and 415 with their details and accepts exactly 10 MB. The fault on the helper's bound was killed by it.
- C35 "cada teste na fatia da tela que testa" is proven only as "the test lives in a slice and opens at least one screen of that slice" (`estrutura.test.ts:37`). A test that also opened another slice's screen would pass.
- The text rules strip `//` comments with `(?<![:"/])//.*$` (`ArquiteturaTests.cs:133`). That also cuts the rest of a line after a string like `"a//b"`, so a deliberate evasion is possible. Not a plausible regression; recorded only.

Builder claims checked:
- `Program` as a class (`api/Program.cs:16-20`, `namespace One.Api; public class Program { Main }`): all 267 API tests boot through `WebApplicationFactory<Program>`, and the HEAD container serves the e2e (11/11). Behaviour is unaffected.
- `?? 'sem responsável'` is now `nome === null ? ...` (`web/src/chamados/Chamados.tsx:50`). This is equivalent because the API emits explicit nulls (`api/Chamados/DetalheChamado.cs:41`, with no `JsonIgnoreCondition` anywhere in `api/`).
- The admin editors now start from `""`. The API refuses `""` and null with the same message (`api/Administracao/UsuarioRotas.cs:43-45`; `CadastroRotas.cs:66,75,83,91-92`).
- `src/Opcoes.tsx` is imported by 3 slices (administracao, chamados, conhecimento) and `src/chamado.ts` by 2 (assistente, chamados). `Autenticado` is named explicitly in C35 and in door 3. Consistent with AD-017.
- Counts confirmed: web 99, crapper worst 9.0, dryer clean, mutator 282/0.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| suites (3) | repo test projects | API 267, web 99, e2e 11 at HEAD and each commit (C1) | - |
| doors (3) | plan Landing | door 1 `web/package.json:11,29,34`; door 2 C5, C6 (fault killed); door 3 C29, C30, C31, C35 (faults killed) | - |
| deadlines (5) | `api/Prazos.cs:6-19` | abandono `PrazosTests.cs:80`; confirmação `:81`, C8; rejeição `:82`, C9; lembrete `:83`, C10; resolver aguardando `:84` | - |
| deadline texts (4) | grep of `dias` texts in `api/` | `Agendador.cs:152` C8; `Agendador.cs:168` C10; `Avisos.cs:26` C8; `AcoesChamado.cs:250` C9 (each one faulted and killed) | - |
| deadline borders (6) | checks C8-C10 | 9 d 23 h / 10 d; 10 d / 10 d 1 min; 3 d 23 h / 4 d | - |
| persisted literals (15) | `api/Dados/Entidades.cs:254-273` by reflection | C12 and C20, each over all 15 | - |
| config reads (3) | grep of `api/` | C15 | - |
| startup config, 2 assemblies | `api/Program.cs:80-81`; `api.Tests/Infra/OneFactory.cs:41-42,63` (swaps only the handler) | C15, C16 | - |
| provider URLs (2) | `LlmRequisicaoTests.cs:76,105` | C16 | - |
| upload refusals (4) | `Arquivos.cs:26-35`, callers | anexo 413/415 C17; documento 413/415 and versão 413/415 C17 | - |
| password bounds (4) | `api/Acesso/Senha.cs:6-7` | 7/8/128/129 C18 | - |
| permission cells (100 + owner) | `c267db8:api/Rotas/ChamadoRotas.cs:25-38` = `PermissoesChamado.cs:15-28` | C21 | - |
| indicators (14) | route JSON in `IndicadoresTests.cs:105-119` | C23, 14 equal literals | - |
| carga reasons (16) | `c267db8:api/Comando/InstituicaoComando.cs:101-139` | C24, 16 cases with exact text | - |
| CSV reasons (10 + header) | `c267db8:api/Rotas/AdminRotas.cs` lines 290-300 of the import | C25, 10 cases; header in `CsvMatriculasTests.cs:58-59` | - |
| question rule (5) | `api/Assistente/Pergunta.cs:6-13` | C26 | - |
| pure test classes (5) | C27 list | C27 (fault killed) | - |
| api folders (8) and root files (8) | filesystem | C29 | - |
| cross-slice pairs (10) | independent grep: 9 by `using`, plus Chamados->Assistente via `Assistente.Assistente.Autor` (`Chamados/Transferencia.cs:31`) | C31 (both directions faulted and killed) | - |
| web slices (6) and root modules | `web/src` tree | C35 | - |
| user saves (2) | `UsuarioRotas.cs:69-82` | C33 | - |
| ChamadoDetalhe states (4) | `ChamadoDetalhe.tsx:303-304`, `Conversa.tsx:114` | loading, error, empty C39; no permission `VisibilidadeTests.cs:370` | - |
| cited-source fields shown to staff (ARTIGO, DOCUMENTO) x (title/number, link, atualizado) | `api/Conhecimento/Fontes.cs:89,94` and `web/src/chamados/Conversa.tsx:60` | ARTIGO title and atualizado `VersaoCitadaTests.cs:52`; DOCUMENTO title and version `DocumentoTests.cs:297`, PDF `:305-307` | DOCUMENTO `atualizado` (`Fontes.cs:89`, `documentos[d].Atual != d`): no assertion; mutant survived |
| ub-mode tools (3) | plan | crapper C36, dryer C37, mutator C38 | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached by HTTP | `PermissoesChamado.cs`, `CalculoIndicadores.cs`, `CargaValidacao.cs`, `CsvMatriculas.cs`, `Pergunta.cs` | boundary C1 and own layer C21-C26 | yes - one case per table row, and a fault on each was killed |
| Decides, not HTTP: deadlines | `Prazos.cs`, `Agendador.cs`, `Avisos.cs`, `AcoesChamado.cs` | scheduler and route with fake clock | yes - both borders of each, faults killed |
| Code structure | `ArquiteturaTests.cs` rules | one text rule per member | yes - 16 text faults killed, comment control passed |
| Instrumentation, moves | `Conhecimento/Fontes.cs` (cited sources moved from `ChamadoRotas` and rewritten on `VersoesDocumentoAtuais`) | covered by the existing suite | no - the DOCUMENTO `atualizado` branch is not covered (surviving mutant) |

## Faults injected

Real tree. Each fault was restored right after with `git checkout -- <file>` (or the new file deleted), and porcelain was compared with the baseline after every one. Text rules ran with `--no-build`; behaviour faults were rebuilt. Web components were also covered by the mutator's 282 mutants.

| Mutation | Location | Killed |
| --- | --- | --- |
| threshold `CA1502(Method): 10` -> 25 | `api/CodeMetricsConfig.txt:1` | yes - Barreira_de_complexidade_configurada |
| `TiposEvento.Lembrete` -> `"LEMBRETE"` | `api/Agendador.cs:168` | yes - Literais_gravados_so_nas_constantes |
| second `OrderByDescending(v => v.Numero)` | `api/Chamados/AcoesChamado.cs` | yes - Ultima_versao_em_um_arquivo |
| second `VersaoDocumentoId is null` | `api/Chamados/AcoesChamado.cs` | yes - Artigo_ou_documento_em_um_arquivo |
| second `"App:UrlBase"` read | `api/Acesso/Senha.cs` | yes - Configuracao_lida_em_um_lugar |
| second PDF signature | `api/Conhecimento/DocumentoRotas.cs` | yes - Assinatura_de_arquivo_em_um_lugar |
| inline `Length: >= 8` | `api/Chamados/AcoesChamado.cs` | yes - Limites_de_senha_em_um_lugar |
| `DateTime.UtcNow` in code (control: only inside a comment, passed) | `api/Agendador.cs` | yes - Sem_DateTime_Now |
| glossary loses the `LEMBRETE` row | `.specs/GLOSSARIO.md` | yes - Glossario_lista_os_termos |
| `PerguntaTests : IClassFixture<OneFactory>` | `api.Tests/PerguntaTests.cs:6` | yes - Testes_de_regra_sem_banco |
| `db.VersoesDocumento` in Chamados | `api/Chamados/AcoesChamado.cs` | yes - Chamados_nao_consulta_versoes |
| extra root file `api/Extra.cs` | `api/` | yes - Fatias_do_api |
| namespace `One.Api.Chamados` -> `One.Api.Chamado` | `api/Chamados/PermissoesChamado.cs:3` | yes - Namespace_igual_a_pasta |
| unlisted pair Acesso->Indicadores | `api/Acesso/Senha.cs` | yes - Referencias_entre_fatias |
| listed pair left unused (`// using One.Api.Acesso;`) | `api/Administracao/UsuarioRotas.cs:3` | yes - Referencias_entre_fatias (no-leftover side) |
| second `.Map(` in the import file | `api/Administracao/ImportacaoRotas.cs:9` | yes - Importacao_em_arquivo_proprio |
| e-mail text `(até 7 dias)` fixed | `api/Chamados/Avisos.cs:26` | yes - PrazosTests C8 |
| `Rejeicao => TimeSpan.FromDays(7)` | `api/Prazos.cs:19` | yes - PrazosTests C9 |
| reminder text `3 dias` fixed | `api/Agendador.cs:168` | yes - PrazosTests C10 |
| default lembrete 3 -> 4 | `api/Prazos.cs:9` | yes - Padroes_sem_configuracao, AgendadorTests (2 failed) |
| `Bearer` -> `Basic` | `api/Program.cs:81` | yes - LlmRequisicaoTests |
| upload bound `> maximo + 1` | `api/Conhecimento/Arquivos.cs:26` | yes - EmailAnexoTests |
| `Senha.Minimo` 8 -> 7 | `api/Acesso/Senha.cs:6` | yes - SenhaTests.Limites_7_8_128_129 |
| `assumir` filter removed | `api/Chamados/PermissoesChamado.cs:37` | yes - PermissoesChamadoTests |
| `cancelar/ALUNO` = NaoFechados | `api/Chamados/PermissoesChamado.cs:24` | yes - PermissoesChamadoTests |
| resolution time no longer subtracts waiting | `api/Indicadores/CalculoIndicadores.cs:88` | yes - IndicadoresCalculoTests (2) |
| categoria "repetida" -> "repetido" | `api/Instituicoes/CargaValidacao.cs:28` | yes - CargaValidacaoTests |
| semestre bound 12 -> 13 | `api/Administracao/CsvMatriculas.cs:53` | yes - CsvMatriculasTests |
| `Pergunta.Maximo` 200 -> 201 | `api/Assistente/Pergunta.cs:6` | yes - PerguntaTests |
| extra `SaveChangesAsync` before sectors | `api/Administracao/UsuarioRotas.cs:81` | yes - AdminTests.Usuario_grava_uma_vez |
| DOCUMENTO `atualizado` -> `false` | `api/Conhecimento/Fontes.cs:89` | no - survived VersaoCitada, Documento and Visibilidade tests, then the full suite (267/267 green) |
| "Nenhuma resposta ainda." text changed | `web/src/chamados/Conversa.tsx:114` | yes - C39 test |
| error `Alert` danger -> warning | `web/src/chamados/ChamadoDetalhe.tsx:303` | yes - C39 test |
| root module `src/Extra.ts` imported by no slice | `web/src/` | yes - estrutura em fatias |
| `src/telas/` recreated | `web/src/` | yes - estrutura em fatias |
| mutator, 282 mutants over the 6 slices | `web/src/*` | yes - 282 killed, 0 survived |

## Gate

- `dotnet test api.Tests`: 267 passed, 0 failed. Re-run clean after the faults: 267 passed.
- `npm --prefix web run test`: 99 passed, 0 failed.
- `npm --prefix web run e2e`: 11 passed, 0 failed.
- Final `git status --porcelain`: only `?? .idea/` (pre-existing) and this report.

**Ranked gaps**
1. Surviving mutant: the cited DOCUMENTO's `atualizado` flag (`api/Conhecimento/Fontes.cs:89`, code this feature rewrote) has no assertion anywhere. C28 claims the detail "continua mostrando ... o aviso de versão atualizada" for "artigo ou documento". Fix: in `DocumentoTests.Fonte_documento_no_detalhe`, or a sibling test, publish a second version of the cited document and assert `atualizado` true. Also assert `atualizado` false before that, so neither direction survives. - C28 - `api/Conhecimento/Fontes.cs:89`
2. Precision gaps in the check text, not blocking: C21's 110 cells should read 100, and C32's route should read `/importacao`.
