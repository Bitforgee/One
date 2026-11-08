# base-fluxos verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 702765c..a4821c7
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 2 re-judges the round 1 findings (C20, C21, C22, C24, Test policy row 2, the leader-with-inactive-sector edge, the loose 200 asserts) against the fix diff `cdc634d..a4821c7` (`One.Api/Dados/EquipeDeSetor.cs`, `One.Api.Tests/LiderSemVazamentoTests.cs`, `One.Api.Tests/ReclassificarSaiDoFluxoTests.cs`, `checks.md`, `plan.md`). Every proof was run again at `a4821c7` in a clean worktree `D:\verif-wt6` (removed afterwards; `node_modules` was a junction, removed with `rmdir`, target intact). Real tree `git status --porcelain` before: empty; after: empty. No `git stash`. Rows marked `carried from cdc634d` were not re-judged (the fix diff does not touch their code); their proofs did run again at `a4821c7` and passed.

Result: 25 of 25 checks PASS. 3 injected faults, 3 killed. C21 is PASS only as written in `checks.md` (see its row): the validator for `fluxos-atendimento` still exits 1, and the only non-PASS row of that report is C104, accepted by AD-044.

## Binding sources

carried from cdc634d: `.specs/STATE.md` AD-008, AD-012, AD-041, AD-042, AD-043 (no contradiction found). Re-read this round: AD-044 (`.specs/STATE.md:50`, accepts the C104 `crapper` risk for `fluxos-atendimento` and `base-fluxos`). `plan.md` changed in the fix (AC 5 and the "só liderança" term now say "nenhum setor comum ativo"); the code matches that text (`EquipeDeSetor.cs:12-13`).

## Checks

Gate and proofs at `a4821c7`, worktree `D:\verif-wt6`. `dotnet test One.Api.Tests --no-build --logger trx` ran the whole suite once (705 passed, 0 failed, 0 skipped); each named test was then read out of the TRX individually and each matched exactly 1 test (`Passed`, n=1), including the corrected selectors `CadastroTests.Triagem_zero_ou_duas_400`, `TransicoesTests.Matriz_acao_papel`, `TransicoesTests.Matriz_acao_estado` and the new `LiderSemVazamentoTests.So_lideranca_por_caso`. Web: `npm --prefix web test -- --run src/indicadores/lideranca.test.tsx src/administracao/setorEmFluxo.test.tsx --reporter=verbose`, then the full `npm --prefix web test -- --run`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | só líder: 404 "Versão de artigo não encontrada." | `LiderSemVazamentoTests.Lider_nao_le_versao_de_artigo` Passed (n=1) | carried from cdc634d: `LiderSemVazamentoTests.cs:44-45` | PASS |
| C2 | só líder: 404 "Documento não encontrado." | `LiderSemVazamentoTests.Lider_nao_baixa_versao_de_documento` Passed (n=1) | carried from cdc634d: `LiderSemVazamentoTests.cs:56-57` | PASS |
| C3 | só líder: 403 com o texto fixo em indicadores | `LiderSemVazamentoTests.Lider_nao_consulta_indicadores` Passed (n=1) | carried from cdc634d: `LiderSemVazamentoTests.cs:68-69` | PASS |
| C4 | 4 perfis seguem 200 nas 3 rotas | `LiderSemVazamentoTests.Quem_nao_e_so_lider_segue_como_hoje` Passed (n=1) | carried from cdc634d: `LiderSemVazamentoTests.cs:82-91`. Still passes with the new `SoLideranca` (the liderança+comum-ativo profile stays staff) | PASS |
| C5 | líder entra no grupo da fila do próprio setor | `LiderSemVazamentoTests.Lider_entra_na_fila_do_proprio_setor` Passed (n=1) | carried from cdc634d: `LiderSemVazamentoTests.cs:108` | PASS |
| C6 | líder vê a fila da turma | `LiderSemVazamentoTests.Lider_segue_vendo_a_fila_da_turma` Passed (n=1) | carried from cdc634d: `LiderSemVazamentoTests.cs:120,122` | PASS |
| C7 | tela Indicadores mostra o 403 no alerta | `lideranca.test.tsx > indicadores para a liderança > 403 da liderança aparece no alerta` ✓ (verbose) | carried from cdc634d: `web/src/indicadores/lideranca.test.tsx:24-25` | PASS |
| C25 | "só liderança" por caso, no próprio nível da regra | `LiderSemVazamentoTests.So_lideranca_por_caso` Passed (n=1) | verified at a4821c7: `LiderSemVazamentoTests.cs:113` onward. A table of 7 cases calls `db.SoLideranca(usuario)` directly and asserts `esperado == resultado` with the case name as the message: só liderança → true; liderança + comum ativo → false; liderança + comum desativado (`ExecuteUpdateAsync` sets `Ativo=false`) → true; só comum → false; sem setor → false; administrador sem setor → false; administrador numa liderança → false. Matches the check text one by one. Killed by fault F1 below | PASS |
| C8 | reclassificar no fluxo: categoria nova, etapa nula, setor/estado/versão mantidos, 1 evento | `ReclassificarSaiDoFluxoTests.Reclassificar_no_fluxo_sai_da_etapa_e_fica_no_setor` Passed (n=1) | carried from cdc634d: `ReclassificarSaiDoFluxoTests.cs:30-34`. Status asserted as `IsSuccessStatusCode` (`:28`): see gap 3 | PASS |
| C9 | fora de fluxo só troca categoria + evento | `ReclassificarSaiDoFluxoTests.Reclassificar_fora_de_fluxo_so_troca_a_categoria` Passed (n=1) | verified at a4821c7: `:53` the 5-tuple, `:54` now `Assert.Single(await c.Eventos(numero), e => e.Tipo == "RECLASSIFICACAO")` (the xUnit warning fix; same assertion, still exactly 1 event) | PASS |
| C10 | `fluxo` nulo, `acoes` sem `subir`, `POST /subir` 409 | `ReclassificarSaiDoFluxoTests.Reclassificado_nao_tem_subir_nem_fluxo` Passed (n=1) | carried from cdc634d: `:71-73` | PASS |
| C11 | Agendador não sobe o reclassificado; o outro sobe | `ReclassificarSaiDoFluxoTests.Agendador_nao_sobe_o_reclassificado` Passed (n=1) | carried from cdc634d: `:90,:92` | PASS |
| C12 | categoria inativa/inexistente: 400 `categoriaId`, fluxo intacto | `ReclassificarSaiDoFluxoTests.Categoria_invalida_400_e_fluxo_intacto` Passed (n=1) | carried from cdc634d: `:108-112` | PASS |
| C13 | domínio: `Chamado.Reclassificar` em etapa 2 | `ChamadoDominioTests.Reclassificar_em_fluxo_sai_da_etapa` Passed (n=1) | carried from cdc634d: `ChamadoDominioTests.cs:278-281`; code `Chamado.cs` `Reclassificar` clears `EtapaOrdem` and `EtapaDesde`. Killed by fault F2 | PASS |
| C14 | setor em 2 fluxos vigentes: 409 com texto literal | `SetorEmFluxoTests.Setor_em_fluxo_publicado_nao_desativa` Passed (n=1) | carried from cdc634d: `SetorEmFluxoTests.cs:37-39` | PASS |
| C15 | só rascunho / versão antiga: 200 e desativa | `SetorEmFluxoTests.Setor_so_em_rascunho_ou_versao_antiga_desativa` Passed (n=1) | carried from cdc634d: `:58-61`. Killed by fault F3 | PASS |
| C16 | renomear e reativar seguem 200 | `SetorEmFluxoTests.Renomear_e_reativar_seguem_como_hoje` Passed (n=1) | carried from cdc634d: `:73-77` | PASS |
| C17 | fluxo de outra instituição não bloqueia | `SetorEmFluxoTests.Fluxo_de_outra_instituicao_nao_bloqueia` Passed (n=1) | carried from cdc634d: `:89-91` | PASS |
| C18 | tela Cadastros mostra o 409 no editor e o mantém aberto | `setorEmFluxo.test.tsx > setor em fluxo publicado > 409 do setor aparece no editor` ✓ (verbose) | carried from cdc634d: `web/src/administracao/setorEmFluxo.test.tsx:26-27` | PASS |
| C19 | build, test, web test, web build saem 0 | `dotnet build One.slnx` exit 0 (0 errors, 6 warnings); `dotnet test One.Api.Tests` exit 0 - `Aprovado! Com falha: 0, Aprovado: 705, Ignorado: 0, Total: 705`; `npm --prefix web test -- --run` exit 0; `npm --prefix web run build` exit 0 | verified at a4821c7. Warnings went 7 → 6: the xUnit2013 in `ReclassificarSaiDoFluxoTests` is gone (the remaining `xUnit2013` is `ArquiteturaTests.cs:1129`, not this feature) | PASS |
| C20 | o comando do C106 só lista specs simulados e sai 0; os reais saem 0 em :8089 | (a) the `node -e` guard exit 0 (the C106 `Proof:` line in `fluxos-atendimento/checks.md` names neither `anexos.spec` nor `plataforma.spec`). (b) the C106 simulated command (`aparencia, arranjo, casca, celular, identidade, instituicoes, push, ux, fluxos` specs) against `vite preview --port 5199 --strictPort` of the `a4821c7` build, started from a `.ps1` file: **220 passed, 0 failed, exit 0**. (c) real, image `one-verif-fluxos:a4821c7` on :8089: `fluxos-real.spec.ts` **3 passed**, `anexos.spec.ts plataforma.spec.ts` (`E2E_INSTITUICAO=e2g`) **19 passed** | verified at a4821c7. Round 1 failed here with 4 simulated failures (`arranjo.spec.ts:491,1378,1423`, `ux.spec.ts:1171`); this run had 0, one run, so the instability seen in round 1 did not reproduce but was not explained either (not a claim about flakiness, see gap 5). The `Proof:` lines are now the amended C106 command, not `npm run e2e` | PASS |
| C21 | relatório de `fluxos-atendimento` cobre cada check com PASS/FAIL e evidência, e o validador sai 0 **ou** um AD no `STATE.md` registra o risco aceito do C104 | `python ...\validate_verification.py fluxos-atendimento --root D:\one-system` exit **1** (`verdict is FAIL`), which the check allows only through the AD branch. `.specs/features/fluxos-atendimento/verification.md` (round 4 at `e4cd3e9`, addendum round 5 at `a4821c7`): the non-PASS rows are exactly one, **C104** (`crapper.exe` blocked by Windows Application Control), with acceptance `AD-044` (`.specs/STATE.md:50`: "close with the `crapper` gate (C104) not run, not with PASS"). The other FAIL row of round 4, C105 (`fluxos-real.spec.ts:183` literal `` `n ``), is PASS at `a4821c7` (3 passed; Task B). The AD exists, names C104 and both features, and was recorded by the user | verified at a4821c7. Judged as written: PASS because the only non-PASS row is C104 and AD-044 accepts it. It is **not** a green validator and the C104 gate itself did not run (see gap 1) | PASS |
| C22 | PUT setor: 400 triagem, 404 inexistente/alheio | `CadastroTests.Triagem_zero_ou_duas_400` Passed (n=1); `SetorEmFluxoTests.Setor_inexistente_ou_alheio_404` Passed (n=1) | verified at a4821c7: the `Proof:` line now selects `CadastroTests.Triagem_zero_ou_duas_400` (round 1: `AdminTests.` matched 0 tests). `AdminTests.cs:388-390` (3× `BadRequest`) and `SetorEmFluxoTests.cs:104` (404 × 2) | PASS |
| C23 | indicadores 400 / 403 aluno / 200 só setores do atendente | `IndicadoresTests.De_depois_de_ate_400`, `.Aluno_403`, `.Atendente_ve_so_seus_setores` each Passed (n=1) | carried from cdc634d: `IndicadoresTests.cs:212,191,179` | PASS |
| C24 | reclassificar: 403 papel, 404 outro setor, 409 estado | `TransicoesTests.Matriz_acao_papel` Passed (n=1); `VisibilidadeTests.Atendente_de_outro_setor_404` Passed (n=1); `TransicoesTests.Matriz_acao_estado` Passed (n=1) | verified at a4821c7: all three selectors now hit a test (round 1: two of them matched 0). `VisibilidadeTests.cs:41` (404, loop includes `/reclassificar`), `:205` (403), `:183` (409) | PASS |

## Coverage

carried from cdc634d, recomputed from code and plan at `a4821c7` only where the fix touched it.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| routes the diff changes (5) | `VerVersaoArtigo.cs:20`, `BaixarVersaoDocumento.cs:20`, `ConsultarIndicadores.cs:22`, `CriarSetor.cs:20`, `Chamado.cs` `Reclassificar` | artigo C1,C4 · documento C2,C4 · indicadores C3,C4 · PUT setor C14-C17 · reclassificar C8,C9,C12 | - |
| statuses of the 5 routes (2,2,3,4,5) | plan Surface | all members mapped as in round 1; the dead `Proof:` names of PUT 400 (C22) and reclassify 403/409 (C24) are fixed and run | - |
| "só liderança" cases (7 now; the check lists 7) | `EquipeDeSetor.cs:9-14` | só liderança C1-C3, C25 · liderança+comum ativo C4, C25 · liderança+comum **desativado** C25 · só comum C25 · sem setor C4, C25 · administrador sem setor C25 · administrador numa liderança C25 | - |
| states of the ticket on reclassify (2) | plan AC7/AC8 | em etapa C8, C13 · fora de fluxo C9 | - |
| effects of leaving the flow (4) | plan AC9 | `acoes` C10 · `fluxo` nulo C10 · `POST /subir` 409 C10 · Agendador C11 | - |
| where a sector can sit when deactivated (4) | `ResolverFluxo.cs:73` | vigente C14 · rascunho C15 · versão antiga C15 · outra instituição C17 | - |
| write paths of `Setor.Ativo` (3) | grep in round 1 | unchanged by the fix diff | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide, atravessa a rota HTTP | `VerVersaoArtigo.cs`, `BaixarVersaoDocumento.cs`, `ConsultarIndicadores.cs`, `AlterarSetor.cs`/`CriarSetor.cs`, `ReclassificarChamado.cs` | one route proof + one `Chamado` proof | yes - carried from cdc634d; the C22 and C24 `Proof:` lines now run (verified at a4821c7) |
| Decide, sem atravessar a rota | `Chamado.Reclassificar`, the "só liderança" rule `EquipeDeSetor.SoLideranca` (`EquipeDeSetor.cs:9-14`) | one proof in the own layer; one row per table line | yes - `Chamado.Reclassificar`: C13 + `ChamadoDominioTests.cs:72`. `SoLideranca`: C25 `So_lideranca_por_caso` calls it directly with 7 cases, and fault F1 (the `Ativo` filter removed) is killed by that test alone |
| Tela que só mostra o `detail` | `Indicadores.tsx`, editor de `Cadastros.tsx` | one per screen | yes - carried from cdc634d (C7, C18, both ✓ at a4821c7) |
| Instrumentation | none | none | yes - none in the diff |

## Faults injected

Product code only, in `D:\verif-wt6`, each reverted with `git checkout -- <file>` (no `git stash`); narrowest covering proof.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: `SoLideranca` stops ignoring inactive ordinary sectors (`s.CursoId == null && s.Ativo` → `s.CursoId == null`) | `One.Api/Dados/EquipeDeSetor.cs:13` | yes - `LiderSemVazamentoTests` (7 tests): 1 failed, 6 passed; the failed one is `So_lideranca_por_caso` (the C25 case "liderança e setor comum desativado"). The HTTP tests alone did not catch it, which is why C25 is the right proof |
| F2: `Chamado.Reclassificar` stops clearing `EtapaOrdem` and `EtapaDesde` | `One.Api/Dados/Chamados/Chamado.cs` (`Reclassificar`) | yes - 4 failed of 6: `ChamadoDominioTests.Reclassificar_em_fluxo_sai_da_etapa`, `ReclassificarSaiDoFluxoTests.Reclassificar_no_fluxo_sai_da_etapa_e_fica_no_setor`, `.Reclassificado_nao_tem_subir_nem_fluxo`, `.Agendador_nao_sobe_o_reclassificado` |
| F3: the F7 guard reads the first published version instead of `Vigente` (`f.Versoes.OrderBy(Numero).FirstOrDefault(PublicadaEm != null)`) | `One.Api/Dados/Fluxos/ResolverFluxo.cs:73` | yes - `SetorEmFluxoTests`: 1 failed of 5, `Setor_so_em_rascunho_ou_versao_antiga_desativa` |

`mutator` is suspended (AD-025) and was not run. The first F2 attempt matched no text (CRLF in the replaced block) and changed nothing; it was redone with a segment replace and then reverted.

## Gate

`dotnet build One.slnx` - 0 errors, 6 warnings; `dotnet test One.Api.Tests` - 705 passed, 0 failed (2 m 26 s); `npm --prefix web test -- --run` - exit 0; `npm --prefix web run build` - exit 0; C106 simulated e2e at :5199 - 220 passed, exit 0; real e2e at :8089 - `fluxos-real` 3 passed, `anexos`+`plataforma` 19 passed.

`validate_verification.py fluxos-atendimento --root D:\one-system` - exit 1 (verdict FAIL, the only non-PASS row is C104, AD-044). `validate_verification.py base-fluxos --root D:\one-system` - exit 0 on the final file.

`crapper` (C104 of `fluxos-atendimento`, `base-fluxos` shares it through AD-044) did not run: `crapper.exe` is blocked by Windows Application Control.

## Ranked gaps

1. **Accepted risk, not a PASS** - `crapper` (CRAP < 10) has never run for this work: `crapper.exe` is blocked on this computer. AD-044 (`.specs/STATE.md:50`) accepts it and says the gate must run on another computer before the 20/11 banca. C21 is PASS as written only because of that AD; the validator for `fluxos-atendimento` still exits 1.
2. **Open edge in the rule** - `EquipeDeSetor.cs:13`: a leader whose only leadership sector is itself inactive still counts as "só líder" (`setores.AnyAsync(s => s.CursoId != null)` has no `Ativo` filter). The fix ignores inactive **ordinary** sectors only, which is what the plan and C25 say; the inactive-leadership case is unspecified and untested. Low.
3. **Loose 200** - `One.Api.Tests/ReclassificarSaiDoFluxoTests.cs:28,51,67,85` assert `IsSuccessStatusCode`, while plan and checks say 200. The route returns `Results.Empty` (`One.Api/Chamados/ReclassificarChamado.cs:27`), which is 200, so the claim is true, but the test would still pass on 201 or 204. Judged **acceptable, not blocking**: C8 and C9 pin the state and events, and the status is not the contract being protected; if the status matters, change the assertion to `Assert.Equal(HttpStatusCode.OK, r.StatusCode)`. The checks were not changed.
4. **Checks edited after approval** - `checks.md` and `plan.md` changed between `cdc634d` and `a4821c7` (C20 and C22/C24 `Proof:` lines, new C25, AC 5 wording). The files do not record who approved the amendments; AGENTS.md says approved checks do not change. The edits fix the round 1 findings and I judged them against their new text, but the approval is not in the repo.
5. **C20 round 1 instability not explained** - the 4 simulated failures of round 1 (`arranjo.spec.ts:491,1378,1423`, `ux.spec.ts:1171`) did not recur in this run (220/220). One green run is evidence for the amended command, not for stability.
6. **Menu decision unchanged (carried from cdc634d)** - `web/src/Autenticado.tsx:23` still shows Indicadores to `ATENDENTE`, so a leader lands on the 403 alert (accepted by the plan; C7 proves the alert).

Cleanup: container `one-verif-fluxos5`, image `one-verif-fluxos:a4821c7`, database `one_verif_fluxos5` (institutions `e2e`, `e2g`), bucket `one-verif-fluxos5`, the `vite preview` on :5199 and the worktree `D:\verif-wt6` were removed. The MinIO `mc` alias created inside the minio container was removed. `D:\verif-out-r1-binding.txt` is a scratch file of mine, removed.
