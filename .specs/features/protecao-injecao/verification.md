# Proteção contra prompt injection verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 5dc1977..7590bc1 (code in `301eb16` and `7590bc1`; proofs run at HEAD `7590bc1`)
**Round**: 2 - scoped (fix diff `beb4de3..7590bc1` for this feature: the C4/C5/C6/C8 amendments in `224d84b` and the code and tests in `7590bc1`; plus the round-1 verdict that was not PASS, C5. All proofs re-ran in full at HEAD)
**Verifier**: fresh sub-agent with no inherited context (author != verifier), dispatched by the orchestrator

Round 1 (`e2e3bcb`/`beb4de3`, FAIL) found that a fault checking numbers against every retrieved source instead of only the cited ones survived (C5). That gap is now closed: the same fault fails `Numero_fora_da_fonte_citada_vira_sem_base`. The other four requested faults are killed too.

Why it still FAILS: the amended C4 names members that no case proves. Its whole-number rule names three joiners (`.`, `,`, `/`), and only `.` changes any test's outcome: drop `,` or `/` from the regex and all 10 `Numeros_conferem` cases give the same result. Its Unicode rule names three kinds of digit (superscript, circled, full-width), and no test contains a full-width digit. A guard narrowed to `\p{No}` lets "dia ３０" through and still passes every test. These members are proven by no test, and the checks' own Coverage table leaves them out.

## Binding sources

None (carried from round 1). The plan is omitted by design, and `checks.md` marks no binding source, so step 1 does not run under `standard`.

## How the proofs ran

Verified at `7590bc1`. The fresh Release `One.Api.Tests.exe` (xUnit v3, built at HEAD after the last commit) ran as one process over the whole assembly with `-xml`, excluding `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo` with `-method-`: 535 passed, 0 failed. That one test then ran alone and passed (3 s). It is outside this diff and hangs only under full parallelism. Each test named below appears individually in the XML with result `Pass`. That includes all 10 `Numeros_conferem` InlineData rows, among them `R$ 10.250,00`, `dia ³⁰` and `passo ①`.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | rule 9 verbatim in the first `system` message, after rule 8, before `Devolva apenas um objeto JSON` | `LlmRequisicaoTests.Regra_9_contra_instrucoes_do_aluno` Pass | `api.Tests/LlmRequisicaoTests.cs:224` `linhas.IndexOf(regra9)` (literal at :223); `:225` `Assert.True(i > linhas.FindIndex(l => l.StartsWith("8. Anexos")))`; `:226` `Assert.StartsWith("Devolva apenas um objeto JSON", linhas[i + 1])` (file untouched by the fix; lines verified at 7590bc1) | PASS |
| C2 | via the API: 700 -> `resposta` with the text; 701 -> `sem_base`, `Textos.SemBase`, `texto_longo` | `InjecaoTests.Texto_acima_de_700_vira_sem_base` Pass | `api.Tests/InjecaoTests.cs:29-30` `Assert.Equal("resposta", ...)`, `Assert.Equal(Texto(700), ...)`; `:34-36` `Assert.Equal("sem_base", ...)`, `Assert.Equal(Textos.SemBase, ...)`, `Assert.Equal("texto_longo", motivo)` | PASS |
| C3 | pure cap 0 < len <= 700 after trimming | `ConferenciaTests.Teto_do_texto_700` Pass | `api.Tests/ConferenciaTests.cs:42` 700 true; `:43` 701 false; `:44-45` 700 + 3 spaces true; `:46` blank false | PASS |
| C4 | whole numbers with internal `.`/`,`/`/`, leading zeros trimmed per group; any Unicode numeric outside 0-9 (superscript, circled, full-width) -> false; 10 cases | `ConferenciaTests.Numeros_conferem` x10 Pass | `ConferenciaTests.cs:62` `Assert.Equal(esperado, Conferencia.NumerosConferem(texto, [fonte]))` over `:51-60`; `:58` `("R$ 10.250,00", "dia 10 e R$ 1.250,00", false)`; `:59` `("dia ³⁰", "dia 30", false)`; `:60` `("passo ①", "passo 1", false)`. Code: `api/Assistente/Conferencia.cs:30,38-40` | FAIL - the 10 listed cases pass, but two of the rule's named members have no proof: full-width digits (no test anywhere contains one; a `\p{No}` guard passes all 10) and the `,` and `/` joiners (removing either from `Conferencia.cs:38` leaves all 10 outcomes unchanged; only `.` is distinguished, by `:58`) |
| C5 | via the API: "dia 10" -> `resposta`, "dia 30" -> `sem_base` + `numero_sem_fonte`; a retrieved but uncited source holding 45 -> "45 dias" refused | `InjecaoTests.Numero_fora_da_fonte_citada_vira_sem_base` Pass | `InjecaoTests.cs:44` `f.Artigo(..., "A matrícula tem prazo de 45 dias.")`; `:46` `Assert.Equal("resposta", ...)`; `:49-51` `"sem_base"`, `Textos.SemBase`, `"numero_sem_fonte"`; `:54-55` `Assert.Equal("sem_base", n...)`, `Assert.Equal("numero_sem_fonte", motivo45)`. Fault P1 (cited -> retrieved) fails `:54`, so the 45 source really is retrieved | PASS |
| C6 | a number the student wrote is not permitted: "dia 30" asked for, and "turma 3", both -> `sem_base` + `numero_sem_fonte` | `InjecaoTests.Numero_da_mensagem_do_aluno_nao_e_permitido` Pass | `InjecaoTests.cs:63-64` `Assert.Equal("sem_base", d...)`, `Assert.Equal("numero_sem_fonte", motivoD)`; `:67-68` the same for "turma 3" | PASS |
| C7 | a `pergunta` with an http/https link -> `sem_base` + `pergunta_invalida` | `PerguntaTests.Pergunta_com_link_e_recusada`, `InjecaoTests.Pergunta_com_link_vira_sem_base` Pass | `api.Tests/PerguntaTests.cs:29-30` `Assert.False(Pergunta.Aceita("Acesse http://golpe.com ...", []))`, `... "https://univag.edu.br?" ...`; `InjecaoTests.cs:78-80` `"sem_base"`, `Textos.SemBase`, `"pergunta_invalida"` (carried from round 1; files unchanged at those lines) | PASS |
| C8 | order fonte, vazio, longo, trecho, link, número; 701 chars + number -> `texto_longo` | `InjecaoTests.Ordem_dos_motivos` Pass | `InjecaoTests.cs:89` `Assert.Equal(701, longaComNumero.Length)`; `:90` `Assert.Equal("texto_longo", ...)`; `:93` `texto_longo` with a bad excerpt; `:96` `trecho_invalido`; `:98` `link_invalido`. Code: `api/Assistente/Assistente.cs:209-216`. The round-1 precision gap (702 chars) is closed | PASS |
| C9 | whole API suite green, no existing assertion edited; `dotnet build api` passes with CA1502 | whole assembly 535 + 1 Pass, 0 failed; `dotnet build api`: `0 Erro(s)` | `git diff 5dc1977..7590bc1 -- api.Tests` removes no line from a file that existed at `5dc1977` (`InjecaoTests.cs` is new, and the other three files only gain lines). The two tests removed in `7590bc1`, `Numeros_conferem_com_mensagem_do_aluno` and `Numero_da_mensagem_do_aluno_e_permitido`, were both created in `301eb16` by this feature (`git log -S`). See "Removed assertions" | PASS |

### Removed assertions (`7590bc1`)

Each removed assertion was this feature's own and is superseded by an approved amendment:
- `ConferenciaTests.Numeros_conferem_com_mensagem_do_aluno` asserted `NumerosConferem("turma 3", [..., "sou da turma 3"])` is true. That was the old C4 case 8 ("número do aluno"), which the 04/11 amendment replaced with three new cases. The pure function's behaviour for that input is unchanged; what changed is that `Conferir` no longer passes the student's messages. The new C6 proves that at the API.
- `InjecaoTests.Numero_da_mensagem_do_aluno_e_permitido` asserted "turma 3" -> `resposta` (directly contradicted by the amended C6) and a masked 8-digit number -> `sem_base`. The masked case is a subset of "no student number is permitted", which `:63-68` now proves. The mask is no longer on this path (`Assistente.cs:216` passes only `citadas`), so no behaviour is left unproven.
- `Ordem_dos_motivos`: `Texto(695)` -> `Texto(694)`, plus a new length assertion. Same test, and it now matches C8's "701".

No pre-existing (`5dc1977`) assertion was touched.

## Coverage

Recomputed at `7590bc1` for the rows the fix touched. Members are taken from the claim text, which is the authority here, and checked against `Conferencia.cs:28-40` and `Assistente.cs:205-216`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| reasons, new or reused (3) | `Assistente.cs:209-216`, `Pergunta.cs:11` | `texto_longo` `InjecaoTests.cs:36,90,93` · `numero_sem_fonte` `:51,55,64,68` · `pergunta_invalida` `:80` | - |
| cap boundary (3) | `Conferencia.cs:20-22` | 700 accepted `ConferenciaTests.cs:42`, `InjecaoTests.cs:29` · 701 refused `ConferenciaTests.cs:43`, `InjecaoTests.cs:34`, `:89-90` · trimmed `ConferenciaTests.cs:44-45` | - |
| C4's listed cases (10) | C4 text | `ConferenciaTests.cs:51-60`, each a Pass row | - |
| joiners named in C4 (3: `.`, `,`, `/`) | C4 "separadores internos `.`, `,` ou `/`" | `.` by `ConferenciaTests.cs:58` (fault P3 killed). `,` and `/` appear only in cases whose outcome does not depend on them being joiners (`:53-55`). Simulated over the 10 inputs with the regex without `,` and without `/`: outcome string `1010111000` both times, identical to HEAD | `,` joiner · `/` joiner |
| non-0-9 numerics named in C4 (3: superscript, circled, full-width) | C4 "(sobrescrito, circulado, de largura total)" | superscript `:59` · circled `:60` (fault P4 killed both) | full-width: `rg "[０-９٠-٩۰-۹]" api.Tests` finds nothing. `(?![0-9])\p{N}` does match "dia ３０" at HEAD, but a guard narrowed to `\p{No}` lets it through and passes all 10 cases (simulated) |
| permitted origins (1) and denied origins (3) | amended C5/C6, `Assistente.cs:216` | cited source `InjecaoTests.cs:46` · retrieved-only source `:54-55` (P1 killed) · student's message `:67-68` (P2 killed) · student asking for a number `:63-64` (P2 killed) | - |
| questions with a link (2) | `Conferencia.Url` | carried from round 1: `PerguntaTests.cs:29-30`, `InjecaoTests.cs:78-80` | - |
| new positions in the check order (4) | `Assistente.cs:209-216` | long before trecho `:93` · long before number `:90` (P5 killed) · trecho before number `:96` · link before number `:98` | - |

The joiner and full-width rows are the author's own prose with no proof. The checks' Coverage row `formas de número (10)` lists the 10 cases and leaves out both.

## Swept existing

Carried from round 1 (`beb4de3`); the fix touched no route, no dependency path and no log template:
- authorization: no new route;
- dependency failure: `api.Tests/ProvedorTests.cs:40` passed at HEAD;
- observability: the `Motivo` field is read by the proofs (`InjecaoTests.cs:13-15`).

## Test policy rows

`checks.md` carries no `Test policy` section (re-checked at `7590bc1`). The repo convention decides the level, and it is met: pure rules are tested without a database (`ConferenciaTests`), and the behaviour the student sees is tested through the API (`InjecaoTests`).

## Faults injected

Verified at `7590bc1`. Each fault was made by hand in a scratch `git worktree add --detach <scratchpad>/wt HEAD` and reverted with `git checkout` before the next one. Each was built with `dotnet build api.Tests -c Release` (`0 Erro(s)` every time) and run with `One.Api.Tests.exe -method <the narrowest proof>`. Afterwards the worktree was removed, and the real tree's porcelain was the same before and after (3 untracked dirs only).

| Mutation | Location | Killed |
| --- | --- | --- |
| P1: numbers checked against `buscadas` instead of `citadas` (the round-1 survivor) | `api/Assistente/Assistente.cs:216` | yes - `Numero_fora_da_fonte_citada_vira_sem_base` `InjecaoTests.cs:54` "Expected sem_base, Actual resposta" |
| P2: student messages allowed again (`conversa` passed back in; masked messages concatenated to the permitted texts) | `api/Assistente/Assistente.cs:185,205,216` | yes - `Numero_da_mensagem_do_aluno_nao_e_permitido` `InjecaoTests.cs:63` "Expected sem_base, Actual resposta" |
| P3: separator-split tokens, `Digitos` -> `[0-9]+` | `api/Assistente/Conferencia.cs:38` | yes - `Numeros_conferem("R$ 10.250,00", ...)` `ConferenciaTests.cs:62` "Expected False, Actual True" |
| P4: Unicode-numeric guard removed | `api/Assistente/Conferencia.cs:30` | yes - `Numeros_conferem("dia ³⁰")` and `("passo ①")` "Expected False, Actual True" |
| P5: cap 700 -> 701 (the 701 boundary of C8) | `api/Assistente/Conferencia.cs:20` | yes - `Ordem_dos_motivos` `InjecaoTests.cs:90` "Expected texto_longo, Actual numero_sem_fonte" |

The five-fault cap was reached. The joiner and full-width gaps are therefore shown by search and by simulating the rule over the test inputs (Coverage), not by more injected faults. Round-1 faults on surfaces the fix did not touch carry from round 1, all killed: F1 cap, F4 question link, F5 order, F8 rule 9.

## Findings

1. **C4 has named members without proof (FAIL).**
   - `,` and `/` as joiners: no case refuses a token joined by them whose parts are permitted.
   - Full-width digits: no case uses one.

   The fix is three InlineData rows, for example:
   - `("R$ 1.250,50", "R$ 1.250 e 50 centavos", false)` for `,`;
   - `("10/30", "dia 10 e 30 dias", false)` for `/`;
   - `("dia ３０", "dia 30", false)` for full-width.
2. **Round-1 C5 gap closed.** P1 is killed. The 45 source is seeded inside the test (`InjecaoTests.cs:44`), not in `Cenario`, so the other tests are unchanged.
3. **Round-1 findings now settled by the user.**
   - Student-whitelisted numbers: closed by the amended C6.
   - Numbers in words and digits inside links: listed as accepted risks under Excluded in `checks.md`.
   - Superscript and circled digits: refused (P4).
   - The bag-of-groups bypass ("R$ 10.250,00"): closed (P3).
   - The lone-`0` bypass: narrowed, since a lone `0` now matches only a standalone all-zero token in a cited source (no longer the `,00` of a price).
4. **New false-positive risk (not a check failure).** Whole-token matching refuses a correct answer that reformats a number: "R$ 1250,00" against a source with "R$ 1.250,00", or "1.250" against "1.250,00". It is the same kind of risk as the link case the user already accepted. Worth knowing before Etapa 5 measures it.
5. **Regression: none.** All 536 API tests pass. `Mascara` is still used elsewhere in `Assistente.cs` (`:50`, `:146`), so removing the mask from the number path leaves no dead code.
6. **Environment.** `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo` was run alone, as the brief asks, and passed. It is outside this diff.

## Gate

- `One.Api.Tests.exe -method- "One.Api.Tests.PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo" -xml ...` (Release, HEAD `7590bc1`): 535 passed, 0 failed.
- `-method` on that test alone: 1 passed, 0 failed.
- `dotnet build api`: `0 Erro(s)`; the only warnings are CS8604, in files this diff does not touch.
- Cleanup: the scratch worktree was removed (`git worktree list` shows only `D:/one-system`), and the real-tree porcelain is unchanged except for this report.
