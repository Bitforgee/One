# Instituições pela tela verification

**Verdict**: PASS
**Profile**: ui
**Diff range**: 8044ebd..d113ea6. `0e59804` amends `checks.md` (delegated user decision of 04/11) and stores the round 1 report. `493600a` (API) and `d113ea6` (web) are the fixes. Proofs ran at HEAD `d113ea6`.
**Round**: 2 - scoped (round 1 full, FAIL at `8044ebd`)
**Verifier**: fresh sub-agent with no inherited context (author != verifier), dispatched by the orchestrator

Scope: the fix diff (`api/Instituicoes/Criacao.cs`, `api/Instituicoes/CriarInstituicao.cs`, `api.Tests/Infra/OneFactory.cs`, `api.Tests/OperadorComandoTests.cs`, `api.Tests/PlataformaTests.cs`, `web/src/administracao/Instituicoes.tsx`, `web/e2e/instituicoes.spec.ts`) plus every round 1 non-PASS item: C10, AC 22 first access, the AD-033 CLI change, the duplicated title, the two unchecked `## Screens` arrangements and the C31 precision gap. All proofs re-ran in full at `d113ea6`. Any judgement that was not re-done says `carried from 8044ebd`.

Why PASS:
1. Every round 1 finding is closed, and the fault that survived round 1 is now killed. Moving the `EmailSaida` save after the commit fails `Falha_ao_gravar_o_email_nao_cria_a_instituicao`.
2. All 38 checks have green proofs at `d113ea6`. All 7 faults injected on surfaces the fix touched or created were killed.
3. The new findings below are precision notes. None of them leaves a claim without a working proof.

## Binding sources

Verified at `d113ea6`: the rows the fix touched (AD-033, the three `## Screens` rows for Instituições and Nova instituição, and door 3). The other rows are carried from `8044ebd`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/STATE.md` AD-033 + `plan.md` Flow 2 + AC 13 (verified at d113ea6) | yes - `.specs/STATE.md:39`, `plan.md:32`, `plan.md:130` | none. The all-equal rejection moved out of the shared `Criacao.Validar` (`api/Instituicoes/Criacao.cs:25` now only tests `n.Cpf is null`) into the route handler (`api/Instituicoes/CriarInstituicao.cs:24-26`). `instituicao criar --admin-cpf 111.111.111-11` exits 0 again, as at base, and the route still answers 400. Fault (b) killed. Proven by C11's second proof. | - |
| `plan.md` `## Screens`, Instituições ≥ 768 px + shell single `h1` (verified at d113ea6) | yes - `plan.md:83`, `web/src/Autenticado.tsx:227` | none. The `h2` is gone (`web/src/administracao/Instituicoes.tsx:236` is a bare `Cabecalho`), and only the shell `h1` "Instituições" remains. C15 was amended by the delegated decision to "one title; button at the top right of the content area". | - |
| `plan.md` `## Screens`, Instituições < 768 px card (verified at d113ea6) | yes - `plan.md:87-88` | none (proven by C37; fault (d) killed) | - |
| `plan.md` `## Screens`, Nova instituição `Dialog` (verified at d113ea6) | yes - `plan.md:89-95` | none (proven by C38; fault (e) killed) | - |
| `plan.md` `## Screens`, Importar carga `Dialog` and Desativar `Confirmar` (carried from 8044ebd; the fix did not touch them) | yes - `plan.md:96-99` | none | - |
| `.specs/STATE.md` AD-008 + `plan.md` Landing door 3, row 5 (verified at d113ea6) | yes - `.specs/STATE.md:14`, `plan.md:75`, `:77` | none. The C31 exemption now names 6 files instead of the whole `Instituicoes/` folder (`api.Tests/PlataformaTests.cs:490`). Fault (g), a tenant switch in `DesativarInstituicao.cs`, is now caught. | - |
| `.specs/STATE.md` AD-032 (carried from 8044ebd) | yes - `.specs/STATE.md:38` | none | - |

## How the proofs ran

API: `dotnet test api.Tests -c Release` with a TRX logger, from `D:\one-system` at `d113ea6`. I stopped my first full run after about 5 minutes because I misread a hang: I sampled `testhost`, but xUnit v3 runs the tests in its own exe, so the flat CPU proved nothing. That run left `one_teste_4e107a54fc07` and bucket `one-teste-5a4568b2d276`, which I removed.

I re-ran the suite `--no-build`, excluding `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo`, the test that hung in round 1, as the checks table allows. Result: **567 passed, 0 failed**. The excluded test then ran alone: **1 passed**. The total of 568 matches the round 1 fixes handoff. Every named API proof is `Passed` in `r2full.trx`, including the new ones (`Falha_ao_gravar_o_email_nao_cria_a_instituicao`, `Cli_aceita_cpf_de_digitos_iguais_como_na_base`, `Desativar_bloqueia_primeiro_acesso`), `Criar_invalido_400` x7 and `InstituicaoComandoTests` x15.

Web: everything ran in a clean worktree of `d113ea6`, with a `node_modules` junction. The main tree has an untracked `web/apresentacao/gravar.spec.ts` that Vitest's default include would pick up, so I avoided it.
- `npx vitest run`: **340 passed / 41 files**. `npm run build` exited 0.
- Layout, against `vite preview --port 5199`: `arranjo`, `celular`, `aparencia` and `instituicoes` gave **93 passed**.
- Each `-g` filter selects tests: `arranjo Instituições` 4, C37 1, C38 1.

Real e2e (C36): **re-run, not carried**. The diff changes two things C36 executes: the create handler that the screen's `POST` reaches (`CriarInstituicao.cs:24-26`) and the page it opens (`Instituicoes.tsx:236`). I built my own image `one-verif-plataforma:d113ea6` from the clean worktree. It ran as `one-plataforma` on `:8086`, with a fresh database `one_e2e_verif2_plataforma` and bucket `one-e2e-verif2-plataforma`, and `demo` seeded by the CLI with `123.456.789-09` / `admin@demo.one`. `E2E_URL=http://localhost:8086 npx playwright test` gave **119 passed** (117 in round 1, plus 2 new layout tests), including `instituicoes-real.spec.ts:51 operador cria e desativa uma instituição` (32.8 s).

Gates:
- `dotnet build api`: 0 errors (CA1502).
- `npm run coverage` and `crapper --use-existing-coverage -s src --threshold 9.99` exited 0. `Instituicoes` is 8.0, unchanged.
- The C34 `dryer` command found "No duplicate candidates found".

## Checks

Every proof re-ran at `d113ea6`. "Evidence" cites `d113ea6`. In `PlataformaTests.cs`, lines after 222 moved +13 and lines after 349 moved +30, and those citations are refreshed. Rows the fix did not touch keep their round 1 judgement (carried from 8044ebd), with green proofs at HEAD.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `operador` exit 0, exact text, 1 row; again, still 1 | `OperadorComandoTests.Adicionar_operador_sai_0` Passed | `api.Tests/OperadorComandoTests.cs:42` exit 0, `:44` exact text, `:45`, `:49` one row (lines +11 from the new test above) | PASS (judgement carried from 8044ebd) |
| C2 | `--remover` exit 0, text, keeps other roles | `OperadorComandoTests.Remover_operador_sai_0` Passed | `api.Tests/OperadorComandoTests.cs:62-64` | PASS (carried from 8044ebd) |
| C3 | 3 invalid cases exit 1, error, nothing written | `OperadorComandoTests.Operador_invalido_sai_1` Passed | `api.Tests/OperadorComandoTests.cs:90`, `:92`, `:94` | PASS (carried from 8044ebd) |
| C4 | 403 x18 + detail, 401 x6 | `PlataformaTests.Rotas_403_sem_operador_e_401_sem_sessao` Passed | `api.Tests/PlataformaTests.cs:84-96` (unmoved) | PASS (carried from 8044ebd) |
| C5 | "Plataforma" menu only for OPERADOR | vitest `grupo Plataforma só para operador` passed | `web/src/administracao/instituicoes.test.tsx:37-57` (file untouched) | PASS (carried from 8044ebd) |
| C6 | Users PUT keeps OPERADOR | `PlataformaTests.Editar_usuario_preserva_operador` Passed | `api.Tests/PlataformaTests.cs:111-116` | PASS (carried from 8044ebd) |
| C7 | OPERADOR in `papeis` -> 400, nothing written | `PlataformaTests.Tela_usuarios_nao_da_operador` Passed | `api.Tests/PlataformaTests.cs:134-139` | PASS (carried from 8044ebd) |
| C8 | list, 6 fields, order, active admins only | `PlataformaTests.Listar_todas_ativas_primeiro` Passed | `api.Tests/PlataformaTests.cs:164-167` | PASS (carried from 8044ebd) |
| C9 | 201, Location, body; setor, categoria, admin, token | `PlataformaTests.Criar_instituicao_201` Passed | `api.Tests/PlataformaTests.cs:182-196` | PASS (carried from 8044ebd) |
| C10 | `EmailSaida` fields + same transaction; failing commit leaves nothing; **failing e-mail save leaves no institution and no admin** (amended) | `PlataformaTests.Criar_grava_o_email_na_mesma_transacao` Passed; `PlataformaTests.Falha_ao_gravar_o_email_nao_cria_a_instituicao` Passed | `api.Tests/PlataformaTests.cs:210-222` (unchanged); new: `api.Tests/Infra/OneFactory.cs:199` throws on a `SaveChanges` that adds an `EmailSaida`; `api.Tests/PlataformaTests.cs:229` arms it; `:234` institution absent; `:235` admin absent. Code: `api/Instituicoes/Criacao.cs:47-49` add, save, then commit. **Fault (a), the round 1 survivor, is killed.** | PASS (verified at d113ea6) |
| C11 | 7 invalid fields -> 400 on the field; **CLI still accepts all-equal CPF** (amended) | `PlataformaTests.Criar_invalido_400` x7 Passed; `OperadorComandoTests.Cli_aceita_cpf_de_digitos_iguais_como_na_base` Passed | `api.Tests/PlataformaTests.cs:243` `("admin.cpf", "111.111.111-11")`, `:257` 400, `:258` field key, `:259` count unchanged; `api.Tests/OperadorComandoTests.cs:29` exit 0, `:30` empty `erro`, `:31` institution created. Code: `api/Instituicoes/CriarInstituicao.cs:26`. Fault (b) killed. | PASS (verified at d113ea6) |
| C12 | duplicate slug -> 409 + detail, nothing written | `PlataformaTests.Slug_repetido_409` Passed | `api.Tests/PlataformaTests.cs:274`, `:275`, `:277` | PASS (carried from 8044ebd) |
| C13 | `InstituicaoComandoTests` green, no assertion edit | x15 Passed | `git diff 5b53ce7 d113ea6 -- api.Tests/InstituicaoComandoTests.cs` is empty; e.g. `api.Tests/InstituicaoComandoTests.cs:48` | PASS (verified at d113ea6) |
| C14 | row content, badge, admins, date, menu, button | vitest `lista com selo, administradores e ações` passed | `web/src/administracao/instituicoes.test.tsx:66-80` | PASS (carried from 8044ebd) |
| C15 | 1440: **a single "Instituições" title (shell `h1`)**, button at the top right of the content area; 390: cards, no table, `scrollWidth` ≤ 390 (amended) | playwright `arranjo Instituições` (4 selected) passed | `web/e2e/instituicoes.spec.ts:16` heading count 1; `:17` level-1 count 1; `:22` button right within 1 px of the table right; `:23` button top ≤ area top + 25; 390 px test unchanged. Fault (c) killed (`Received: 2`). Precision note: see Findings 2. | PASS (verified at d113ea6) |
| C16 | address follows name; fuso list | vitest `endereço segue o nome até ser editado` passed | `web/src/administracao/instituicoes.test.tsx:103-118` | PASS (carried from 8044ebd) |
| C17 | POST body, dialog closes, alert, list re-read | vitest `criar fecha, avisa e recarrega a lista` passed | `web/src/administracao/instituicoes.test.tsx:139-146` | PASS (carried from 8044ebd) |
| C18 | 400/409 under the field, values kept | vitest `erro da API no campo sem perder o formulário` passed | `web/src/administracao/instituicoes.test.tsx:164-180` | PASS (carried from 8044ebd) |
| C19 | carga 200, counts equal the CLI's, slug's institution | `PlataformaTests.Carga_pela_rota_grava_na_instituicao_do_slug` Passed | `api.Tests/PlataformaTests.cs:298`, `:299`, `:303-304`, `:308-309` | PASS (carried from 8044ebd) |
| C20 | 400 / 413 / 404, nothing written | `PlataformaTests.Carga_invalida_400_413_404` Passed | `api.Tests/PlataformaTests.cs:325`, `:328`, `:332`, `:335-336`, `:337` | PASS (carried from 8044ebd) |
| C21 | import dialog, multipart, summary, errors per row | vitest `importar carga mostra o resumo ou os erros` passed | `web/src/administracao/instituicoes.test.tsx:205-217` | PASS (carried from 8044ebd) |
| C22 | deactivate 200; public 404; login as unknown; session 401; **first access writes no token nor `EmailSaida`** (amended) | `PlataformaTests.Desativar_bloqueia_login_e_sessao` Passed; `PlataformaTests.Desativar_bloqueia_primeiro_acesso` Passed | `api.Tests/PlataformaTests.cs:354`, `:356-357`, `:359-361`; new: `:374` positive control (active institution: 1 token), `:379` `(tokens, emails) == (1, 0)` after deactivating. Code: `api/Acesso/PrimeiroAcesso.cs:27` `&& x.Ativa`. Fault (f) killed (`Actual (2, 0)`). The `EmailSaida` half is vacuous: see Findings 1. | PASS (verified at d113ea6) |
| C23 | own institution -> 409, stays active | `PlataformaTests.Nao_desativa_a_propria` Passed | `api.Tests/PlataformaTests.cs:389-391` | PASS (carried from 8044ebd) |
| C24 | reativar 200, login back | `PlataformaTests.Reativar_volta_o_login` Passed | `api.Tests/PlataformaTests.cs:405`, `:407`, `:408` | PASS (carried from 8044ebd) |
| C25 | 202 `{enviados:2}`, tokens and e-mails for active admins only | `PlataformaTests.Reenviar_acesso_para_admins_ativos` Passed | `api.Tests/PlataformaTests.cs:426`, `:427`, `:430`, `:432`, `:437` | PASS (carried from 8044ebd) |
| C26 | 409 without an active admin / deactivated | `PlataformaTests.Reenviar_sem_admin_ou_desativada_409` Passed | `api.Tests/PlataformaTests.cs:455-456`, `:459-461` | PASS (carried from 8044ebd) |
| C27 | 4 routes with `nao-existe` -> 404 + detail | `PlataformaTests.Slug_inexistente_404` Passed | `api.Tests/PlataformaTests.cs:474-475` | PASS (carried from 8044ebd) |
| C28 | desativar confirms; reativar and reenviar act directly | vitest `desativar confirma, reativar e reenviar agem direto` passed | `web/src/administracao/instituicoes.test.tsx:241-258` | PASS (carried from 8044ebd) |
| C29 | whole API suite green; assertion edits only items 1-3, 5 | 567 + 1 Passed | `git diff 8044ebd d113ea6 -- api.Tests` edits only this feature's own files (`OperadorComandoTests.cs`, `PlataformaTests.cs`) and adds an opt-in flag to the `ContadorDeGravacoes` test interceptor (`api.Tests/Infra/OneFactory.cs:188`, `:199`). No base assertion was edited. | PASS (verified at d113ea6) |
| C30 | `rotas.txt` +6 lines exactly | `RetratoTests.Tabela_de_rotas_igual_a_da_base` Passed | `api.Tests/RetratoTests.cs:39`, `:51` (untouched) | PASS (carried from 8044ebd) |
| C31 | `InstituicaoAtual` only where it was plus the **named** platform files; `IgnoreQueryFilters` unchanged (amended) | `ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando` + `PlataformaTests.InstituicaoAtual_so_onde_ja_era_e_na_plataforma` Passed | `api.Tests/PlataformaTests.cs:490` the 6 named files; `:492` `["Chamados/TempoRealHub.cs"]`. Fault (g) killed. | PASS (verified at d113ea6) |
| C32 | `dotnet build api` CA1502 | exit 0, `0 Erro(s)` | `api/Instituicoes/CriarInstituicao.cs:26` adds one conditional; the gate holds | PASS (verified at d113ea6) |
| C33 | Vitest + build green; web edits item 4 only | 340/340; build exit 0 | `git diff 8044ebd d113ea6 -- web/src` touches only `web/src/administracao/Instituicoes.tsx:236`; no test assertion in `web/src` changed | PASS (verified at d113ea6) |
| C34 | crapper 0 at 9.99; dryer no candidate | both exit 0 | `web/.metrics/crap.edn` `Instituicoes` 8.0 (worktree run) | PASS (verified at d113ea6) |
| C35 | layout suites green | 93 passed | `web/e2e/instituicoes.spec.ts:16-23`, `:58-61`, `:75-83` among them | PASS (verified at d113ea6) |
| C36 | real e2e: operator, creates demo, Mailpit link, deactivates; whole suite | 119 passed against the `d113ea6` image, incl. `operador cria e desativa uma instituição` | `web/e2e/instituicoes-real.spec.ts:56`, `:77`, `:82`, `:86`, `:93`, `:95` | PASS (verified at d113ea6; re-run because the diff touches the handler and the page it drives) |
| C37 | 390 px card: name and badge on the 1st line, badge to the right, address below (new) | playwright `cartão com nome e selo na 1ª linha e endereço abaixo` passed | `web/e2e/instituicoes.spec.ts:58` same top within 1 px; `:59` badge right of the name; `:60-61` address below both. Fault (d) killed (`Received: 55`). | PASS (verified at d113ea6) |
| C38 | dialog fields in order, "Cancelar" left of "Criar", `/` prefix (new) | playwright `diálogo Nova instituição com campos em ordem, Cancelar e prefixo` passed | `web/e2e/instituicoes.spec.ts:75` y ascending, `:76` y distinct, `:80` Cancelar before Criar, `:82-83` prefix left of and centred on Endereço. Fault (e) killed. | PASS (verified at d113ea6) |

## Coverage

Recomputed for the rows whose authority the fix touched (AC 22 prose, Landing, AC 11 plus AD-033, `## Screens`). The others are carried from 8044ebd and have green proofs at HEAD.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/plataforma/instituicoes` statuses (3) | carried from 8044ebd | 200 C8 · 401 C4 · 403 C4 | - |
| `POST /api/plataforma/instituicoes` statuses (5) | `api/Instituicoes/CriarInstituicao.cs:24-32` (re-read: the CPF change adds no status) | 201 C9 · 400 C11 · 401 C4 · 403 C4 · 409 C12 | - |
| `.../{slug}/carga` statuses (6) | carried from 8044ebd | 200 C19 · 400 C20 · 401 C4 · 403 C4 · 404 C20, C27 · 413 C20 | - |
| `.../{slug}/desativar` statuses (5) | carried from 8044ebd | 200 C22 · 401 C4 · 403 C4 · 404 C27 · 409 C23 | - |
| `.../{slug}/reativar` statuses (4) | carried from 8044ebd | 200 C24 · 401 C4 · 403 C4 · 404 C27 | - |
| `.../{slug}/reenviar-acesso` statuses (5) | carried from 8044ebd | 202 C25 · 401 C4 · 403 C4 · 404 C27 · 409 C26 | - |
| roles without access (4) | carried from 8044ebd | ADMINISTRADOR, ATENDENTE, ALUNO: C4, C5 · no session: C4 | - |
| invalid creation fields (7) | AC 11, `CriarInstituicao.cs:26` + `Criacao.cs:21-27` | slug short, slug uppercase, nome, fuso, CPF, admin nome, e-mail: C11 x7 | - |
| all-equal CPF by entry point (2) | AD-033 + AC 11 amendment | route 400: C11 · CLI exit 0: C11 (`Cli_aceita_...`) | - |
| `operador` command cases (6) | carried from 8044ebd | add C1 · repeat C1 · remove C2 · 3 invalid C3 | - |
| deactivation effects (4) | AC 22 prose (`plan.md:157`) | public page C22 · login C22 · open session C22 · first access C22 (`Desativar_bloqueia_primeiro_acesso`, fault (f) killed) | - |
| resend recipients (2) | carried from 8044ebd | active C25 · inactive excluded C25 | - |
| Landing one-way doors (5) | `plan.md:71-77`; the author's table now says 5 | 1 C1, C6, C7 · 2 C4 · 3 C19, C31 · 4 C5 · 5 C8 | - |
| `## Screens` arrangements for this feature (5) | `plan.md:83-99` | ≥ 768 header C15 · < 768 card C15, C37 · Nova instituição dialog C38 (+ C16-C18) · Importar carga C21 · Desativar `Confirmar` C28 | - |

## Test policy rows

`checks.md` has no `Test policy` section, so there is nothing to judge.

## Faults injected

Isolated in `git worktree add D:/one-verif-wt2 HEAD`. The main tree's `git status --porcelain` was the same before and after. The API faults (a), (b), (f) and (g) sit on disjoint surfaces. They ran in one `dotnet test -c Release` over 12 selected tests: 4 failed (the targets) and the other 8 stayed green (`Criar_grava_o_email_na_mesma_transacao` and `Criar_invalido_400` x7). Each web fault was built and run against its own `vite preview`, then reverted.

| Mutation | Location | Killed |
| --- | --- | --- |
| (a) round 1 survivor: the `EmailSaida` is added and saved after `tx.CommitAsync()` | `api/Instituicoes/Criacao.cs:47-49` | yes - `Falha_ao_gravar_o_email_nao_cria_a_instituicao` failed at `:234` (institution exists: Expected False, Actual True) |
| (b) the all-equal CPF rejection goes back into the shared `Criacao.Validar` (`n.Cpf is null \|\| n.Cpf.Distinct().Count() <= 1`) | `api/Instituicoes/Criacao.cs:25` | yes - `Cli_aceita_cpf_de_digitos_iguais_como_na_base` failed: exit expected 0, actual 1 |
| (c) a second heading `<h2>Instituições</h2>` is re-added inside `Cabecalho` | `web/src/administracao/Instituicoes.tsx:236` | yes - `1440 px: um só título...` failed at `web/e2e/instituicoes.spec.ts:16` (Expected 1, Received 2) |
| (d) the badge leaves the card's first line (`data-celula="selo"` removed, so the cell takes a full row below the name) | `web/src/administracao/Instituicoes.tsx:170` | yes - `cartão com nome e selo na 1ª linha...` failed at `:58` (vertical offset 55 px) |
| (e) the CPF and E-mail fields of the dialog swap places | `web/src/administracao/Instituicoes.tsx:99-100` | yes - `diálogo Nova instituição...` failed at `:75` (y order) |
| (f) extra, a surface the fix created: first access ignores deactivation (`&& x.Ativa` removed) | `api/Acesso/PrimeiroAcesso.cs:27` | yes - `Desativar_bloqueia_primeiro_acesso` failed at `api.Tests/PlataformaTests.cs:379` (Expected (1, 0), Actual (2, 0)) |
| (g) extra, the C31 exemption the fix narrowed: an unlisted `Instituicoes/` file assigns `db.InstituicaoAtual` | `api/Instituicoes/DesativarInstituicao.cs:21` | yes - `InstituicaoAtual_so_onde_ja_era_e_na_plataforma` failed: actual list gained `Instituicoes/DesativarInstituicao.cs` |
| F1, F3, F4, F5 from round 1 (carried from 8044ebd: their surfaces `UsuarioRotas.cs`, `ImportarCargaInstituicao.cs`, `Instituicoes.tsx` Desativar and `ListarInstituicoes.cs` are untouched by the fix, apart from the 2-line `h2` removal above the Desativar handler) | see the round 1 report in `0e59804` | yes - carried from 8044ebd |

## Findings

Ranked. None of them blocks the PASS.

1. **C22: the `EmailSaida` half of the first-access claim is vacuous.** `PrimeiroAcesso` never writes an `EmailSaida`. It saves the token (`api/Acesso/PrimeiroAcesso.cs:35-36`) and then sends over SMTP directly (`:39`, `api/Email.cs:29-30`). So `Emails() == 0` holds under every implementation. Fault (f) proves this: with deactivation ignored, the result was `(2, 0)`, so the token count failed and the e-mail count did not.
   - **A Mailpit proof is not needed.** The send happens only inside the same `if (u is not null)` branch, right after the token is saved (`:31-40`), and there is no path that sends without a new token. "No new token" therefore implies "no e-mail" for this code, and the token half kills the relevant mutant.
   - A stronger proof would only matter if someone moved the send ahead of the token or out of the `Ativa` lookup.
   - Recommended wording: "não grava token (e, por isso, não envia o e-mail)". Alternatively, drop `Emails()` from `api.Tests/PlataformaTests.cs:379` so the test does not suggest a check it cannot make.
2. **C15's right-edge assertion uses a 1 px proxy, and the proxy uses up the whole tolerance.** The claim measures against the content area's right edge. The test measures against the table's (`web/e2e/instituicoes.spec.ts:22`). Measured informally at 1440 px in the `d113ea6` build: the area's content edge (container 1440 minus 24 px padding) is 1416, the button's right edge is 1416 and the table's is 1415. So the claim holds exactly, but the proof passes at exactly 1 px. A button 2 px short of the area's edge (1414) would still pass, and a 1 px change to the table border would fail a correct page. Measuring `area.x + area.width - 24`, as the comment on `:18` already describes, would match the claim.
3. **C10's new test has no positive control.** `Falha_ao_gravar_o_email_nao_cria_a_instituicao` swallows any exception (`api.Tests/PlataformaTests.cs:230-231`) and asserts only absence. A request that failed for another reason, such as a 400, would also pass. Fault (a) shows the test works against the mutant that matters, and C9 covers the same body succeeding, so this is a robustness note only.
4. **Stale header in `checks.md`.** It still says "38 checks em 5 slices · 4 one-way doors". There are 6 slices (S0-S5) and the Landing now has 5 doors, which the Coverage row already says.

Judgements the orchestrator asked for:
- **C22 / `EmailSaida`:** vacuous, as finding 1 explains. A Mailpit assertion is not required, because the e-mail is sent strictly downstream of the token in a single branch, and fault (f) is killed by the token half.
- **C36:** re-run, not carried. The fix changes the create handler (`CriarInstituicao.cs:24-26`) that the e2e's `POST` executes, and the page (`Instituicoes.tsx:236`) it drives. "Semantically the same for a valid CPF" is the builder's reasoning and not something I could carry on trust. Result: 119 passed.

## Cleanup

Removed:
- the container `one-plataforma` and the image `one-verif-plataforma:d113ea6`;
- the database `one_e2e_verif2_plataforma` and the bucket `one-e2e-verif2-plataforma`;
- the database `one_teste_4e107a54fc07` and the bucket `one-teste-5a4568b2d276`, left by the full run I stopped;
- the worktree `D:/one-verif-wt2`, with its `node_modules` junction;
- the preview servers on 5199.

Nothing is listening on 5199 or 8086 anymore. The Docker `api` container on `:8080` was not touched. Older `one_teste_*` databases and buckets from before this session were left alone, and Mailpit messages were not cleared. Nothing was committed.

## Gate

- `dotnet test api.Tests`: 568 passed, 0 failed (567 in the batch + 1 run alone).
- Vitest: 340 passed. `npm run build`: ok.
- Playwright layout: 93 passed. Playwright real e2e: 119 passed.
- `dotnet build api`: 0 errors. crapper and dryer: 0.
- Faults: 7/7 killed.

Verdict PASS.
