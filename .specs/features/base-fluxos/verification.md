# base-fluxos verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 702765c..cdc634d
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Proofs were run in a clean worktree at `cdc634d` (removed afterwards; real tree `git status --porcelain` before and after: ` M .specs/features/fluxos-atendimento/verification.md` and `?? .specs/prompt-evolucao-one.md`, unchanged). S1, S2 and S3 (C1-C18, C22-C24) are judged on their own rows; the feature verdict is FAIL because of S4 (C20, C21) and of dead `Proof:` names (C22, C24) and one unmet `Test policy` row. The behaviour the code delivers for S1-S3 held up: 5 injected faults, 5 killed.

## Binding sources

Profile is `standard`, so the `ui` step 1 is not owed; the sources the plan names were still opened for the contradiction hunt.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/STATE.md` AD-008, AD-012, AD-041, AD-042, AD-043 | yes - `STATE.md` read in worktree and real tree | none: AD-008 is honoured (C17), AD-012 is the least-access rule the S1 guard implements, AD-043 is why `cdc634d` sits on `main` | - |
| `.specs/prompt-evolucao-one.md` F1, F2, F7, F9, E0 | not re-read for the narrow comparison (file is untracked in the real tree, not in the worktree) | none found against plan `Surface` (statuses 200/404, 200/404, 200/400/403, 200/400/404/409, 200/400/403/404/409) | - |

## Checks

All proof commands run at `cdc634d` in `D:\verif-wt3`. For S1-S3 one `dotnet test One.Api.Tests --no-build --logger trx` invocation ran the whole suite (704 passed, 0 failed, 0 skipped); each named test was then read out of the TRX individually (`Passed | <class>.<method>` below). Web: `npm --prefix web test -- --run src/indicadores/lideranca.test.tsx src/administracao/setorEmFluxo.test.tsx --reporter=verbose`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | só líder: 404 "Versão de artigo não encontrada." | `LiderSemVazamentoTests.Lider_nao_le_versao_de_artigo` ran, Passed | `One.Api.Tests/LiderSemVazamentoTests.cs:44-45` - `Assert.Equal(HttpStatusCode.NotFound, r.StatusCode)`; `Assert.Equal("Versão de artigo não encontrada.", await Detalhe(r))` | PASS |
| C2 | só líder: 404 "Documento não encontrado." | `LiderSemVazamentoTests.Lider_nao_baixa_versao_de_documento` ran, Passed | `LiderSemVazamentoTests.cs:56-57` - `NotFound`; `"Documento não encontrado."` | PASS |
| C3 | só líder: 403 com o texto fixo em indicadores | `LiderSemVazamentoTests.Lider_nao_consulta_indicadores` ran, Passed | `LiderSemVazamentoTests.cs:68-69` - `Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode)`; `"Os indicadores não estão disponíveis para a liderança de turma."` | PASS |
| C4 | 4 perfis seguem 200 nas 3 rotas | `LiderSemVazamentoTests.Quem_nao_e_so_lider_segue_como_hoje` ran, Passed | `LiderSemVazamentoTests.cs:82-83` (artigo `OK`, `titulo` "Estágio obrigatório"), `:86-87` (documento `OK`, `application/pdf`), `:90-91` (indicadores `OK`, `chamadosAbertos`) inside a loop over `perfis` (administrador, setor comum, liderança e setor comum, sem setor) | PASS |
| C5 | líder entra no grupo da fila do próprio setor | `LiderSemVazamentoTests.Lider_entra_na_fila_do_proprio_setor` ran, Passed (existing hub code `TempoRealHub.cs:28-30` unchanged) | `LiderSemVazamentoTests.cs:108` - `Assert.Equal([$"Sonda:{daLideranca}"], (await c.Quieto()).ToList())` (the ordinary-sector probe must not arrive) | PASS |
| C6 | líder vê a fila da turma (200, 1 item) | `LiderSemVazamentoTests.Lider_segue_vendo_a_fila_da_turma` ran, Passed | `LiderSemVazamentoTests.cs:120,122` - `Assert.Equal(HttpStatusCode.OK, r.StatusCode)`; `Assert.Equal([numero], itens)` | PASS |
| C7 | tela Indicadores mostra o 403 no alerta | `lideranca.test.tsx > indicadores para a liderança > 403 da liderança aparece no alerta` ran, passed (verbose output) | `web/src/indicadores/lideranca.test.tsx:24-25` - `expect(await screen.findByText(detail)).toBeInTheDocument()`; `expect(screen.getByLabelText('De')).toBeInTheDocument()` (page not blank) | PASS |
| C8 | reclassificar no fluxo: categoria nova, `etapa_ordem`/`etapa_desde` nulos, setor/estado/versão mantidos, 1 evento | `ReclassificarSaiDoFluxoTests.Reclassificar_no_fluxo_sai_da_etapa_e_fica_no_setor` ran, Passed | `ReclassificarSaiDoFluxoTests.cs:30` - `Assert.Equal((nova.Id, (int?)null, (DateTime?)null), (depois.CategoriaId, depois.EtapaOrdem, depois.EtapaDesde))`; `:31` setor/estado/versão/encaminhamentos; `:33-34` `Assert.Single(eventos)` e `("Dúvida","Matrícula")`. Status is only `IsSuccessStatusCode` (`:28`): see precision gap G6 | PASS |
| C9 | fora de fluxo só troca categoria + evento | `ReclassificarSaiDoFluxoTests.Reclassificar_fora_de_fluxo_so_troca_a_categoria` ran, Passed | `ReclassificarSaiDoFluxoTests.cs:53` - `Assert.Equal((nova.Id, antes.SetorId, (long?)null, (int?)null, (DateTime?)null), (...))`; `:54` `Assert.Single(... "RECLASSIFICACAO")` | PASS |
| C10 | detalhe `fluxo` nulo, `acoes` sem `subir`, `POST /subir` 409 | `ReclassificarSaiDoFluxoTests.Reclassificado_nao_tem_subir_nem_fluxo` ran, Passed | `ReclassificarSaiDoFluxoTests.cs:71-73` - `JsonValueKind.Null` do `fluxo`; `Assert.DoesNotContain("subir", ...)`; `Assert.Equal(HttpStatusCode.Conflict, (await c.Subir(...)).StatusCode)`; `:65-66` precondition the control had `subir` and an object `fluxo` | PASS |
| C11 | Agendador não sobe o reclassificado; o não reclassificado sobe | `ReclassificarSaiDoFluxoTests.Agendador_nao_sobe_o_reclassificado` ran, Passed | `ReclassificarSaiDoFluxoTests.cs:90` - `Assert.Equal((c.Lideres.Id, (int?)null), (parado.SetorId, parado.EtapaOrdem))`; `:92` `Assert.Equal((c.Coordenacao.Id, 2), (subiu.SetorId, subiu.EtapaOrdem))` | PASS |
| C12 | categoria inativa/inexistente: 400 `categoriaId`, fluxo intacto | `ReclassificarSaiDoFluxoTests.Categoria_invalida_400_e_fluxo_intacto` ran, Passed | `ReclassificarSaiDoFluxoTests.cs:108-109` - `BadRequest`; `GetProperty("errors").TryGetProperty("categoriaId", ...)`; `:112` unchanged `(CategoriaId, EtapaOrdem, EtapaDesde, VersaoFluxoId)` | PASS |
| C13 | domínio: `Chamado.Reclassificar` em etapa 2 | `ChamadoDominioTests.Reclassificar_em_fluxo_sai_da_etapa` ran, Passed | `One.Api.Tests/ChamadoDominioTests.cs:278-281` - `Assert.Equal((11L, (int?)null, (DateTime?)null), (c.CategoriaId, c.EtapaOrdem, c.EtapaDesde))`; `(setor, (long?)5)`; `[("RECLASSIFICACAO","Boleto","Matrícula")]` | PASS |
| C14 | setor em 2 fluxos vigentes: 409 com texto literal, setor segue ativo | `SetorEmFluxoTests.Setor_em_fluxo_publicado_nao_desativa` ran, Passed | `One.Api.Tests/SetorEmFluxoTests.cs:37-39` - `Conflict`; `Assert.Equal("O setor é usado em fluxo publicado (categoria: Boletos; Estágio). Publique o fluxo sem ele antes de desativar.", ...detail)`; `Assert.True(await Ativo(...))` | PASS |
| C15 | só rascunho / versão antiga: 200 e desativa | `SetorEmFluxoTests.Setor_so_em_rascunho_ou_versao_antiga_desativa` ran, Passed | `SetorEmFluxoTests.cs:58-61` - `OK` para os dois, `Assert.False(await Ativo(...))` x2 | PASS |
| C16 | renomear e reativar seguem 200 | `SetorEmFluxoTests.Renomear_e_reativar_seguem_como_hoje` ran, Passed | `SetorEmFluxoTests.cs:73-74,77` - `OK` x2; `Assert.Equal(("Financeiro 2", true), (setor.Nome, setor.Ativo))` | PASS |
| C17 | fluxo de outra instituição não bloqueia | `SetorEmFluxoTests.Fluxo_de_outra_instituicao_nao_bloqueia` ran, Passed | `SetorEmFluxoTests.cs:89-91` - `OK`; `Assert.False(Ativo(m...))`; `Assert.True(Ativo(alheia...))` | PASS |
| C18 | tela Cadastros mostra o 409 no editor e o mantém aberto | `setorEmFluxo.test.tsx > setor em fluxo publicado > 409 do setor aparece no editor` ran, passed | `web/src/administracao/setorEmFluxo.test.tsx:26-27` - `expect(await within(screen.getByRole('dialog')).findByText(detail)).toBeInTheDocument()`; `expect(screen.getByRole('dialog')).toBeInTheDocument()` | PASS |
| C19 | build, test, web test, web build saem 0 | `dotnet build One.slnx` exit 0 (0 erros, 7 avisos); `dotnet test One.Api.Tests` exit 0 - `Aprovado!  – Com falha: 0, Aprovado: 704, Ignorado: 0, Total: 704`; `npm --prefix web test -- --run` exit 0 - `Test Files 60 passed (60)`, `Tests 560 passed (560)`; `npm --prefix web run build` exit 0 | gate lines above; not a per-test claim | PASS |
| C20 | comando do C106 só com specs simulados e sai 0; reais saem 0 em :8089 | (a) `node -e ...` exit 0. (b) C106 simulated command with `E2E_URL=http://localhost:5199`, preview of the `cdc634d` build: **exit 1, 4 failed, 212 passed** (`arranjo.spec.ts:491`, `:1378`, `:1423`, `ux.spec.ts:1171`). (c) the literal `npm --prefix web run e2e` against :5199: exit 1, 15 failed, 3 did not run, 227 passed (the 8 `*-real`/`anexos`/`plataforma` failures need the API; 3 `arranjo` + 2 `ux` simulated failures again, so the simulated set is unstable: another earlier run had 45 and one had 3+1). (d) the two real specs against the image on :8089: **not run** - no image/DB/bucket was built for this report | Only (a) is green: `.specs/features/fluxos-atendimento/checks.md` C106 `Proof:` line no longer names `anexos.spec`/`plataforma.spec`. The simulated command and the :8089 leg have no passing evidence | FAIL |
| C21 | `validate_verification.py fluxos-atendimento` sai 0, ou AD de risco aceito do C104 | exact command, exit **1**: `ERROR fluxos-atendimento: verdict is FAIL - route the ranked gaps back as fixes, then re-verify`. Same at the `cdc634d` worktree (committed report is round 1, `e1320eb..a57fac8`, FAIL); in the real tree the round 2 report (`e1320eb..cdc634d`, `Round: 2 - scoped`) is uncommitted (` M`) and also FAIL | `STATE.md` has AD-001..AD-043; none accepts the C104 risk (grep `C104\|crapper\|risco aceito` hits only AD-018/023/025 and the Handoff lines 52/54). Handoff line 52 still lists the C104/C106 as open | FAIL |
| C22 | PUT setor: 400 triagem, 404 inexistente/alheio | `SetorEmFluxoTests.Setor_inexistente_ou_alheio_404` ran, Passed. `--filter "FullyQualifiedName~AdminTests.Triagem_zero_ou_duas_400"` run literally: **`Nenhum teste corresponde ao filtro`, exit 0** (the test is `CadastroTests.Triagem_zero_ou_duas_400`, `AdminTests.cs:380,383`; it passed in the full run) | `SetorEmFluxoTests.cs:104` - `Assert.Equal((HttpStatusCode.NotFound, HttpStatusCode.NotFound), (inexistente.StatusCode, deOutra.StatusCode))`; the 400 lives at `AdminTests.cs:388-390` (`Assert.Equal(HttpStatusCode.BadRequest, ...)` x3) but the `Proof:` line in checks.md selects nothing | FAIL |
| C23 | indicadores 400 / 403 aluno / 200 só setores do atendente | `IndicadoresTests.De_depois_de_ate_400`, `.Aluno_403`, `.Atendente_ve_so_seus_setores` each ran, Passed | `IndicadoresTests.cs:212` - `Assert.Equal(HttpStatusCode.BadRequest, (await m.Admin.GetAsync("/api/indicadores?de=2026-11-10&ate=2026-11-09")).StatusCode)`; `:191` `Forbidden`; `:179` `Assert.Equal(2, j.GetProperty("chamadosAbertos").GetInt32())` | PASS |
| C24 | reclassificar: 403 papel, 404 outro setor, 409 estado | `VisibilidadeTests.Atendente_de_outro_setor_404` ran, Passed. `--filter "FullyQualifiedName~VisibilidadeTests.Matriz_acao_papel"` and `...Matriz_acao_estado` run literally: **`Nenhum teste corresponde ao filtro`, exit 0** both (they are `TransicoesTests.*`, `VisibilidadeTests.cs:126,167,190`; both passed in the full run) | `VisibilidadeTests.cs:41` - `Assert.True(r.StatusCode == HttpStatusCode.NotFound, ...)` (loop includes `/reclassificar`, `:25`); `:205` `Forbidden`; `:183` `Conflict` (matrix row `("reclassificar", false, ...)` `:141`) - but two of the three `Proof:` lines select nothing | FAIL |

## Coverage

Recomputed from the code and from the plan `Surface` / `Landing` / `Relations`, not read back from checks.md.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| routes the diff changes (5) | `VerVersaoArtigo.cs:20`, `BaixarVersaoDocumento.cs:20`, `ConsultarIndicadores.cs:22`, `CriarSetor.cs:20` (via `AlterarSetor.cs:21`), `Chamado.cs:163-164` (via `ReclassificarChamado.cs:27`) | artigo C1,C4 · documento C2,C4 · indicadores C3,C4 · PUT setor C14-C17 · reclassificar C8,C9,C12 | - |
| `GET artigos/versoes/{id}` statuses (2) | plan Surface | 200 C4 (`:82`) · 404 C1 (`:44`) | - |
| `GET documentos/versoes/{id}` statuses (2) | plan Surface | 200 C4 (`:86`) · 404 C2 (`:56`) | - |
| `GET indicadores` statuses (3) | plan Surface | 200 C4 (`:90`) · 400 C23 (`IndicadoresTests.cs:212`) · 403 C3 (`:68`) | - |
| `PUT admin/setores/{id}` statuses (4) | plan Surface | 200 C15 (`SetorEmFluxoTests.cs:58`) · 404 C22 (`:104`) · 409 C14 (`:37`) · 400 `AdminTests.cs:388` exists and passes but its checks.md proof matches 0 tests | proof name dead (C22) |
| `POST chamados/{n}/reclassificar` statuses (5) | plan Surface; code `Results.Empty` at `ReclassificarChamado.cs:27` = 200 | 200 C8 (only `IsSuccessStatusCode`, `:28`) · 400 C12 (`:108`) · 404 C24 (`VisibilidadeTests.cs:41`) · 403 and 409 exist (`:205`, `:183`) but their checks.md proofs match 0 tests | proof names dead (C24); 200 is loose (G6) |
| profiles on the 3 S1 routes (4) | plan AC4/AC5 | administrador, setor comum, liderança+comum, sem setor: C4 loop (`LiderSemVazamentoTests.cs:78-91`) | - |
| "só liderança" cases (3) | plan AC5 / `EquipeDeSetor.cs:11-13` | todas lideranças C1-C3 · liderança+comum C4 · nenhum setor C4 - all through HTTP only; nothing calls `SoLideranca` directly (grep `SoLideranca\|EquipeDeSetor` in `One.Api.Tests`: 0 hits) | no own-layer proof (Test policy row 2) |
| states of the ticket on reclassify (2) | plan AC7/AC8 | em etapa C8, C13 · fora de fluxo C9 and entity table row `ChamadoDominioTests.cs:72` (`15 Reclassificar RESOLVIDO`, changes only `CategoriaId`) | - |
| effects of leaving the flow (4) | plan AC9 | `acoes` C10 `:72` · `fluxo` nulo C10 `:71` · `POST /subir` 409 C10 `:73` · Agendador C11 `:90,:92` | - |
| where a sector can sit when deactivated (4) | `ResolverFluxo.cs:70-75` (`f.Vigente`) | vigente C14 · só rascunho C15 · versão antiga C15 · outra instituição C17 | - |
| write paths that set `Setor.Ativo` (3) | grep `Ativo =` in `One.Api` | `CriarSetor.Aplicar` `CriarSetor.cs:14` (PUT, guarded at `:20`) · POST with `ativo=false` (new row, `atual` null, nothing can use it yet) · `CargaInicial.cs:19` (only `AddRange` of new sectors) | - (no other path found) |
| startup config (0 assemblies) | checks.md says no new key | `OneFactory` only; nothing new in `Program.cs` in the diff | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide, atravessa a rota HTTP | `VerVersaoArtigo.cs`, `BaixarVersaoDocumento.cs`, `ConsultarIndicadores.cs`, `AlterarSetor.cs`/`CriarSetor.cs`, `ReclassificarChamado.cs` | one route proof + one `Chamado` proof for the transition; each Surface status, each profile, each place | yes in substance - route proofs at C1-C4, C8-C12, C14-C17, `Chamado` proof at C13 (`ChamadoDominioTests.cs:278`); the 403/409 reclassify proofs and the 400 PUT proof exist and pass, but their `Proof:` lines in checks.md are dead (C22, C24), so that part is recorded as FAIL on the checks, not here |
| Decide, sem atravessar a rota | `Chamado.Reclassificar` (`Chamado.cs:157-165`), the "só liderança" rule (`EquipeDeSetor.cs:9-14`) | one proof in the own layer; one row per table line (em etapa, fora de fluxo; the 3 "só liderança" cases) | **no** - `Chamado.Reclassificar` is met (C13 + table row `:72`), but `SoLideranca` has no own-layer test at all (0 grep hits), and its "liderança inativa / setor comum inativo" behaviour is unspecified in any test |
| Tela que só mostra o `detail` | `Indicadores.tsx`, editor de `Cadastros.tsx` | one per screen, body shown in the alert | yes - C7 (`lideranca.test.tsx:24`), C18 (`setorEmFluxo.test.tsx:26`); `ErroDe` is wired at `Indicadores.tsx:246` and `Cadastros.tsx:353` |
| Instrumentation | none | none | yes - none in the diff |

## Faults injected

Each in the scratch worktree, reverted with `git checkout -- <file>` (no `git stash`), narrowest covering proof run.

| Mutation | Location | Killed |
| --- | --- | --- |
| `SoLideranca` also denies a leader who has an ordinary sector: `return await meus.AnyAsync();` | `One.Api/Dados/EquipeDeSetor.cs:12-13` | yes - `LiderSemVazamentoTests.Quem_nao_e_so_lider_segue_como_hoje` failed (only that test of the 6) |
| `Chamado.Reclassificar` no longer clears `EtapaOrdem`/`EtapaDesde` | `One.Api/Dados/Chamados/Chamado.cs:163-164` | yes - 4 failed of 6: `ChamadoDominioTests.Reclassificar_em_fluxo_sai_da_etapa`, `ReclassificarSaiDoFluxoTests.Reclassificar_no_fluxo_sai_da_etapa_e_fica_no_setor`, `.Reclassificado_nao_tem_subir_nem_fluxo`, `.Agendador_nao_sobe_o_reclassificado` |
| F7 guard reads the first published version instead of `Vigente` (`f.Versoes.OrderBy(Numero).FirstOrDefault(PublicadaEm != null)`) | `One.Api/Dados/Fluxos/ResolverFluxo.cs:73` | yes - `SetorEmFluxoTests.Setor_so_em_rascunho_ou_versao_antiga_desativa` failed (C14 alone passes under this mutant: it has only v1) |
| artigo and documento guards removed (`\|\| await db.SoLideranca(u)` deleted) | `One.Api/Conhecimento/VerVersaoArtigo.cs:20`, `BaixarVersaoDocumento.cs:20` | yes - `Lider_nao_le_versao_de_artigo` and `Lider_nao_baixa_versao_de_documento` both failed |
| indicadores guard disabled (`if (false) return ...`) | `One.Api/Indicadores/ConsultarIndicadores.cs:22` | yes - `Lider_nao_consulta_indicadores` failed |

Surfaces not mutated (cap of 5): the `EmFluxoPublicado` condition `atual is not { Ativo: true } || e.Ativo != false` (`CriarSetor.cs:26`), the 409 text, and the web alert wiring (C7, C18).

## Gate

`dotnet build One.slnx` - 0 errors, 7 warnings; `dotnet test One.Api.Tests` - 704 passed, 0 failed; `npm --prefix web test -- --run` - 560 passed (60 files), 0 failed; `npm --prefix web run build` - exit 0.

`validate_verification.py fluxos-atendimento --root D:\one-system` - exit 1 (feature gate fails on its own FAIL verdict).

## Ranked gaps

1. **C21** - `fluxos-atendimento` does not close: `validate_verification.py fluxos-atendimento` exits 1, the committed report is round 1 (`.specs/features/fluxos-atendimento/verification.md`, `e1320eb..a57fac8`), the round 2 report is uncommitted in the real tree and still FAIL, and `STATE.md` (AD-001..AD-043) has no AD accepting the C104 risk (`crapper` blocked). Plan AC 16 is not met.
2. **C20** - the C106 simulated command exits 1 at `cdc634d`: 4 failed / 212 passed (`web/e2e/arranjo.spec.ts:491,1378,1423`, `web/e2e/ux.spec.ts:1171`), unstable between runs (up to 5 simulated failures), unrelated to this feature (Login and tab-bar layout from `7d4f5d4`). The `:8089` real-image leg was not run. Also, the C20 `Proof:` line `npm --prefix web run e2e` runs every spec, including the API-backed ones, so as written it can never exit 0 against the preview on :5199; the checks should have used the amended C106 command.
3. **C22, C24** - three `Proof:` lines in `checks.md` select no test and exit 0: `AdminTests.Triagem_zero_ou_duas_400` (real class `CadastroTests`, `One.Api.Tests/AdminTests.cs:380,383`) and `VisibilidadeTests.Matriz_acao_papel` / `VisibilidadeTests.Matriz_acao_estado` (real class `TransicoesTests`, `One.Api.Tests/VisibilidadeTests.cs:126,167,190`). The tests exist and passed in the full run, but the check text the L-002/L-022 rule makes the contract is wrong. The amendment needs the human's approval (checks are frozen).
4. **Test policy row 2 unmet** - `SoLideranca` (`One.Api/Dados/EquipeDeSetor.cs:9-14`) has no own-layer test; its three "só liderança" cases are only reached through three HTTP routes. A direct test could also pin the open cases below.
5. **Edge in the rule (not covered, not specified)** - `SoLideranca` does not filter on `Setor.Ativo` (`EquipeDeSetor.cs:12-13`): a leader who also keeps a deactivated ordinary sector counts as staff and reads artigo, documento and indicadores again; a leader whose only leadership sector is inactive stays "só líder" (consistent with the plan). AC 5 says only `curso_id`, so this is a plan gap, not a code deviation.
6. **C8 / Surface precision** - the `200` of `POST /reclassificar` is `Results.Empty` (`One.Api/Chamados/ReclassificarChamado.cs:27`), so 200 is true as the corrected plan says (confirmed against the code, not 204), but the proofs assert only `IsSuccessStatusCode` (`ReclassificarSaiDoFluxoTests.cs:28,51,67,85`). The Coverage row "200 C8" is therefore a loose assertion.
7. **Menu / S1 decision** - the plan's Observable row says the menu hides groups without permission. For Indicadores it does not: `web/src/Autenticado.tsx:23` shows it to `ATENDENTE`, so a leader sees the link and lands on the 403 alert (the plan accepts it; C7 proves the alert only). Artigos and Documentos are `ADMINISTRADOR`-only (`Autenticado.tsx:24-25`).
8. **Hub and fila left alone: the decision holds.** `TempoRealHub.cs:28-30` joins only the user's own sectors; `ListarChamados.cs:24` lists the fila of the user's own sectors; `RespostasProntasDoSetor.cs:20` answers only for the user's own sector; the leader's ticket detail carries an empty transcript (`DetalheChamado.cs:54`), so the artigo/PDF source link of `Conversa.tsx:56` never reaches a leader. No other `Papeis.Atendente` gate in `One.Api` exposes artigo, documento or indicador data (grep shows all 11 gates).
9. **F7 write paths: no gap found.** `Setor.Ativo` is written only by `CriarSetor.Aplicar` (`CriarSetor.cs:14`) for PUT and POST; `CargaInicial.cs:19` only adds new sectors; a POST with `ativo=false` creates a new sector no flow can use yet. The guard runs before the Triagem rule (`CriarSetor.cs:20`), so deactivating the Triagem sector in a flow gives 409, not 400 (harmless).

Swept rows that say "existing", judged against the code: `RetratoTests.Admin_403_com_detail_em_toda_rota_admin` exists (`RetratoTests.cs:56`); `LiderancaSetorTests.Uma_lideranca_ativa_por_turma_409` exists (`LiderancaSetorTests.cs:80`); `EtapaOrdem` null already means "fora do fluxo" in `Agendador.cs:65`, `ResolverFluxo.cs:94,102` and `DetalheChamado.cs:93`; `ErroDe` is used by the Cadastros editor (`Cadastros.tsx:353`) and by Indicadores (`Indicadores.tsx:246`); the "menu esconde grupos sem permissão" claim is true only for Artigos and Documentos (gap 7).
