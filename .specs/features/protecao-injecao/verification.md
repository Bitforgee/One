# Proteção contra prompt injection verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 5dc1977..2d984d7 (code in `301eb16` and `7590bc1`; tests also in `2d984d7`; proofs run at HEAD `2d984d7`)
**Round**: 3 - scoped (fix diff `795b859..2d984d7` for this feature: the C4 and Coverage-row amendment in `dc3fb9c`, and the 3 new `Numeros_conferem` cases plus the C4 text in `2d984d7`; `api/` unchanged. Plus the round-2 verdict that was not PASS, C4. All proofs re-ran in full at HEAD)
**Verifier**: fresh sub-agent with no inherited context (author != verifier), dispatched by the orchestrator

Why PASS: every member C4 names now changes a test's outcome. Removing `,` from the number regex fails the new `R$ 1.250,50` case. Removing `/` fails the new `10/30` case. Narrowing the non-ASCII guard to `\p{No}` fails the new `dia ３０` case. All 539 API tests pass at HEAD.

Earlier rounds:
- Round 1 (`e2e3bcb`/`beb4de3`, FAIL): numbers checked against every retrieved source instead of only the cited ones survived (C5).
- Round 2 (`7590bc1`, FAIL on C4 only): the `,` and `/` joiners and full-width digits named by C4 had no test; dropping either joiner, or narrowing the guard to `\p{No}`, left all 10 cases unchanged.

## Binding sources

None (carried from round 1, `beb4de3`). The plan is omitted by design, and `checks.md` marks no binding source, so step 1 does not run under `standard`.

## How the proofs ran

Verified at `2d984d7`. The Release `One.Api.Tests.exe` (xUnit v3, built at HEAD after the last commit; `dotnet build api.Tests -c Release` `0 Erro(s)`) ran as one process over the whole assembly with `-xml`, excluding `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo` with `-method-`: 538 passed, 0 failed. That one test then ran alone and passed (3 s). It is outside this diff. Each test named below appears individually in the XML with result `Pass`. That includes all 13 `Numeros_conferem` InlineData rows, among them the new `R$ 1.250,50`, `10/30` and `dia ３０`.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | rule 9 verbatim in the first `system` message, after rule 8, before `Devolva apenas um objeto JSON` | `LlmRequisicaoTests.Regra_9_contra_instrucoes_do_aluno` Pass | `api.Tests/LlmRequisicaoTests.cs:224` `linhas.IndexOf(regra9)` (literal at :223); `:225` `Assert.True(i > linhas.FindIndex(l => l.StartsWith("8. Anexos")))`; `:226` `Assert.StartsWith("Devolva apenas um objeto JSON", linhas[i + 1])` (file untouched by the fix; lines verified at 7590bc1) | PASS |
| C2 | via the API: 700 -> `resposta` with the text; 701 -> `sem_base`, `Textos.SemBase`, `texto_longo` | `InjecaoTests.Texto_acima_de_700_vira_sem_base` Pass | `api.Tests/InjecaoTests.cs:29-30` `Assert.Equal("resposta", ...)`, `Assert.Equal(Texto(700), ...)`; `:34-36` `Assert.Equal("sem_base", ...)`, `Assert.Equal(Textos.SemBase, ...)`, `Assert.Equal("texto_longo", motivo)` | PASS |
| C3 | pure cap 0 < len <= 700 after trimming | `ConferenciaTests.Teto_do_texto_700` Pass | `api.Tests/ConferenciaTests.cs:42` 700 true; `:43` 701 false; `:44-45` 700 + 3 spaces true; `:46` blank false | PASS |
| C4 | whole numbers with internal `.`/`,`/`/`, leading zeros trimmed per group; any Unicode numeric outside 0-9 (superscript, circled, full-width) -> false; 13 cases | `ConferenciaTests.Numeros_conferem` x13 Pass | `api.Tests/ConferenciaTests.cs:65` `Assert.Equal(esperado, Conferencia.NumerosConferem(texto, [fonte]))` over `:51-63`; `:58` `("R$ 10.250,00", "dia 10 e R$ 1.250,00", false)`; `:59` `("dia ³⁰", ...)`; `:60` `("passo ①", ...)`; `:61` `("R$ 1.250,50", "R$ 1.250 e 50 centavos", false)`; `:62` `("10/30", "dia 10 e 30 dias", false)`; `:63` `("dia ３０", "dia 30", false)`. Code: `api/Assistente/Conferencia.cs:29,37,39` (verified at 2d984d7) | PASS - each named joiner and each named digit kind is now distinguished by a case (faults P6-P8 killed) |
| C5 | via the API: "dia 10" -> `resposta`, "dia 30" -> `sem_base` + `numero_sem_fonte`; a retrieved but uncited source holding 45 -> "45 dias" refused | `InjecaoTests.Numero_fora_da_fonte_citada_vira_sem_base` Pass | `InjecaoTests.cs:44` `f.Artigo(..., "A matrícula tem prazo de 45 dias.")`; `:46` `Assert.Equal("resposta", ...)`; `:49-51` `"sem_base"`, `Textos.SemBase`, `"numero_sem_fonte"`; `:54-55` `Assert.Equal("sem_base", n...)`, `Assert.Equal("numero_sem_fonte", motivo45)`. Fault P1 (cited -> retrieved) fails `:54`, so the 45 source really is retrieved | PASS |
| C6 | a number the student wrote is not permitted: "dia 30" asked for, and "turma 3", both -> `sem_base` + `numero_sem_fonte` | `InjecaoTests.Numero_da_mensagem_do_aluno_nao_e_permitido` Pass | `InjecaoTests.cs:63-64` `Assert.Equal("sem_base", d...)`, `Assert.Equal("numero_sem_fonte", motivoD)`; `:67-68` the same for "turma 3" | PASS |
| C7 | a `pergunta` with an http/https link -> `sem_base` + `pergunta_invalida` | `PerguntaTests.Pergunta_com_link_e_recusada`, `InjecaoTests.Pergunta_com_link_vira_sem_base` Pass | `api.Tests/PerguntaTests.cs:29-30` `Assert.False(Pergunta.Aceita("Acesse http://golpe.com ...", []))`, `... "https://univag.edu.br?" ...`; `InjecaoTests.cs:78-80` `"sem_base"`, `Textos.SemBase`, `"pergunta_invalida"` (carried from round 1; files unchanged at those lines) | PASS |
| C8 | order fonte, vazio, longo, trecho, link, número; 701 chars + number -> `texto_longo` | `InjecaoTests.Ordem_dos_motivos` Pass | `InjecaoTests.cs:89` `Assert.Equal(701, longaComNumero.Length)`; `:90` `Assert.Equal("texto_longo", ...)`; `:93` `texto_longo` with a bad excerpt; `:96` `trecho_invalido`; `:98` `link_invalido`. Code: `api/Assistente/Assistente.cs:209-216`. The round-1 precision gap (702 chars) is closed | PASS |
| C9 | whole API suite green, no existing assertion edited; `dotnet build api` passes with CA1502 | whole assembly 538 + 1 Pass, 0 failed at `2d984d7`; `dotnet build api`: `0 Erro(s)` | `2d984d7` only adds 3 `InlineData` lines to `ConferenciaTests.cs` (`git diff 7590bc1..2d984d7 -- api.Tests`: +3, -0). The round-2 analysis of `5dc1977..7590bc1` stands (carried from 7590bc1; see "Removed assertions") | PASS |

### Removed assertions (`7590bc1`, carried from round 2; `2d984d7` removes nothing)

Each removed assertion was this feature's own and is superseded by an approved amendment:
- `ConferenciaTests.Numeros_conferem_com_mensagem_do_aluno` asserted `NumerosConferem("turma 3", [..., "sou da turma 3"])` is true. That was the old C4 case 8 ("número do aluno"), which the 04/11 amendment replaced with three new cases. The pure function's behaviour for that input is unchanged; what changed is that `Conferir` no longer passes the student's messages. The new C6 proves that at the API.
- `InjecaoTests.Numero_da_mensagem_do_aluno_e_permitido` asserted "turma 3" -> `resposta` (directly contradicted by the amended C6) and a masked 8-digit number -> `sem_base`. The masked case is a subset of "no student number is permitted", which `:63-68` now proves. The mask is no longer on this path (`Assistente.cs:216` passes only `citadas`), so no behaviour is left unproven.
- `Ordem_dos_motivos`: `Texto(695)` -> `Texto(694)`, plus a new length assertion. Same test, and it now matches C8's "701".

No pre-existing (`5dc1977`) assertion was touched.

## Coverage

Recomputed at `2d984d7` for the rows the fix touched (C4's cases, joiners, non-0-9 numerics). The other rows carry from `7590bc1`. Members are taken from the claim text, which is the authority here, and checked against `Conferencia.cs:27-39`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| reasons, new or reused (3) | `Assistente.cs:209-216`, `Pergunta.cs:11` | `texto_longo` `InjecaoTests.cs:36,90,93` · `numero_sem_fonte` `:51,55,64,68` · `pergunta_invalida` `:80` | - |
| cap boundary (3) | `Conferencia.cs:20-22` | 700 accepted `ConferenciaTests.cs:42`, `InjecaoTests.cs:29` · 701 refused `ConferenciaTests.cs:43`, `InjecaoTests.cs:34`, `:89-90` · trimmed `ConferenciaTests.cs:44-45` | - |
| C4's listed cases (13) | C4 text at `2d984d7` | `ConferenciaTests.cs:51-63`, each a Pass row in the XML | - |
| joiners named in C4 (3: `.`, `,`, `/`) | C4 "separadores internos `.`, `,` ou `/`" | `.` by `ConferenciaTests.cs:58` (fault P3 killed, round 2) · `,` by `:61` (fault P6 killed) · `/` by `:62` (fault P7 killed) | - |
| non-0-9 numerics named in C4 (3: superscript, circled, full-width) | C4 "(sobrescrito, circulado, de largura total)" | superscript `:59` · circled `:60` (fault P4 killed both, round 2) · full-width `:63` (fault P8 killed) | - |
| permitted origins (1) and denied origins (3) | amended C5/C6, `Assistente.cs:216` | cited source `InjecaoTests.cs:46` · retrieved-only source `:54-55` (P1 killed) · student's message `:67-68` (P2 killed) · student asking for a number `:63-64` (P2 killed) | - |
| questions with a link (2) | `Conferencia.Url` | carried from round 1: `PerguntaTests.cs:29-30`, `InjecaoTests.cs:78-80` | - |
| new positions in the check order (4) | `Assistente.cs:209-216` | long before trecho `:93` · long before number `:90` (P5 killed) · trecho before number `:96` · link before number `:98` | - |

The checks' own Coverage row is now `formas de número (13)` and lists `,` as part of the number, `/` as part of the number, and full-width (`checks.md:118`), matching the members above.

## Swept existing

Carried from round 1 (`beb4de3`); no fix since touched a route, a dependency path or a log template, and `2d984d7` touched no file under `api/`:
- authorization: no new route;
- dependency failure: `api.Tests/ProvedorTests.cs:40` passed at `2d984d7`;
- observability: the `Motivo` field is read by the proofs (`InjecaoTests.cs:13-15`).

## Test policy rows

`checks.md` carries no `Test policy` section (re-checked at `2d984d7`). The repo convention decides the level, and it is met: pure rules are tested without a database (`ConferenciaTests`), and the behaviour the student sees is tested through the API (`InjecaoTests`). The touched file, `ConferenciaTests.cs`, stays a pure-rule test.

## Faults injected

Verified at `2d984d7`, on the surface the fix created (the 3 new cases) and the code they guard (`api/Assistente/Conferencia.cs`). Each fault was one edit in a scratch `git worktree add --detach <scratchpad>/wt HEAD`, built with `dotnet build api.Tests -c Release` (`0 Erro(s)` every time), run with `One.Api.Tests.exe -method "One.Api.Tests.ConferenciaTests.Numeros_conferem"` (13 rows), and reverted with `git checkout` before the next one. Afterwards the worktree was removed, and the real tree's porcelain was the same before and after, apart from an untracked `.specs/features/revisao-ux/` that another agent created meanwhile.

| Mutation | Location | Killed |
| --- | --- | --- |
| P6: `,` removed from the joiners, `[.,/]` -> `[./]` | `api/Assistente/Conferencia.cs:37` | yes - `Numeros_conferem("R$ 1.250,50", "R$ 1.250 e 50 centavos", False)` `ConferenciaTests.cs:65` "Expected False, Actual True"; 1 of 13 failed |
| P7: `/` removed from the joiners, `[.,/]` -> `[.,]` | `api/Assistente/Conferencia.cs:37` | yes - `Numeros_conferem("10/30", "dia 10 e 30 dias", False)` "Expected False, Actual True"; 1 of 13 failed |
| P8: non-ASCII guard narrowed, `(?![0-9])\p{N}` -> `\p{No}` | `api/Assistente/Conferencia.cs:39` | yes - `Numeros_conferem("dia ３０", "dia 30", False)` "Expected False, Actual True"; 1 of 13 failed |

Faults on surfaces this fix did not touch carry from earlier rounds, all killed:
- from round 2 (`7590bc1`): P1 cited -> retrieved, P2 student messages allowed, P3 separator-split tokens, P4 guard removed, P5 cap 700 -> 701;
- from round 1 (`beb4de3`): F1 cap, F4 question link, F5 order, F8 rule 9.

## Findings

1. **Round-2 C4 gap closed.** Each of the three requested faults now fails exactly the case written for it, and passes reverted (all 13 rows pass at HEAD).
2. **The checks' Coverage row now lists the members** (`formas de número (13)`, `checks.md:118`), so the row and the claim agree.
3. Carried from round 2, still true and not a check failure: whole-token matching refuses a correct answer that reformats a number ("R$ 1250,00" against a source with "R$ 1.250,00"). Worth knowing before Etapa 5 measures false refusals.
4. **Environment.** `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo` was run alone, as the brief asks, and passed. It is outside this diff.

## Gate

- `One.Api.Tests.exe -method- "One.Api.Tests.PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo" -xml ...` (Release, built at HEAD `2d984d7`): 538 passed, 0 failed.
- `-method` on that test alone: 1 passed, 0 failed.
- `dotnet build api`: `0 Erro(s)` at `2d984d7`.
- Cleanup: the scratch worktree was removed (`git worktree list` shows only `D:/one-system`), and the real-tree porcelain is unchanged except for this report, the `aparencia-instituicao` report and the other agent's `.specs/features/revisao-ux/`.
