# Instituições pela tela verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 5b53ce7..8044ebd (feature code in `f1f7d40` API, `5ca4505` web, `8044ebd` real e2e + handoff; the other commits in the range belong to `aparencia-instituicao`, `protecao-injecao` and `revisao-ux` and were not judged here). Proofs run at HEAD `8044ebd`.
**Round**: 1 - full
**Verifier**: fresh sub-agent with no inherited context (author != verifier), dispatched by the orchestrator

Why FAIL:
1. A fault survived. Moving the first-access e-mail after the commit still passes C10's proof.
2. One effect named in AC 22 has no proof: the first-access request ("o primeiro acesso") of a deactivated institution.
3. The code changes the `instituicao criar` CLI. AD-033 and AC 13 say its output stays the same.
4. Instituições shows two titles. C15 forced an `h2` "Instituições" on top of the shell's single `h1`.
5. Two arrangements in `## Screens` have no check: the < 768 px card, and the order, "Cancelar" button and `/` prefix of the "Nova instituição" dialog.

All 36 proofs ran green. The code is correct on every point in this list: the e-mail is in the transaction, the card and the dialog match the design, and `PrimeiroAcesso` already filters `Ativa`. Each finding is about a check, a proof or a decision, not broken behaviour.

## Binding sources

The plan marks no source as "binding" by name. Step 1 used the user-approved decisions it rests on: AD-033, AD-008, AD-032, `plan.md` `## Screens`, which is the design for this feature since there is no mock, and `## Landing`, doors 1-5.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/STATE.md` AD-033 ("The CLI `criar` and `carga` keep their output") + `plan.md` Flow 2 ("sem mudar o comando") + AC 13 | yes - `.specs/STATE.md:39`, `plan.md:32`, `plan.md:130` | C11 asks for `400` on `111.111.111-11`, a CPF that the base validator `Cpf.Normalizar` accepts (`api/Cpf.cs:10`). The builder rejected it in the shared `Criacao.Validar` (`api/Instituicoes/Criacao.cs:25`, `:32`), so `dotnet api.dll instituicao criar --admin-cpf 111.111.111-11` now exits 1 with `--admin-cpf: CPF inválido`, where it exited 0 at `5b53ce7`. The handoff lists this as a builder decision (Settled mid-build (2)); it was not settled with the user. A route-only check would have met C11 without touching the CLI. | the CLI behaviour for all-equal CPFs: no check. C13 only re-runs the base cases. |
| `plan.md` `## Screens`, Instituições ≥ 768 px ("cabeçalho com o título 'Instituições' e o botão 'Nova instituição' à direita") + the shell's single `h1` (`web/src/Autenticado.tsx:227` "o único h1 da tela") | yes - `plan.md:83` | C15 measures the button against a title on the same line. The shell `h1` sits on another line, so the build added a second heading, `<h2>Instituições</h2>` (`web/src/administracao/Instituicoes.tsx:237`). The `h1` "Instituições" (`Autenticado.tsx:235`) and the `h2` "Instituições" now render together. The design draws one title, and no other `Cabecalho` screen repeats it (`Usuarios.tsx:127`). This is a composition finding: C15 encodes an arrangement the shell cannot meet without duplicating the title. | - |
| `plan.md` `## Screens`, Instituições < 768 px ("cartões da `Tabela`, com o nome e o selo na primeira linha e o endereço embaixo") | yes - `plan.md:87-88` | none | name and badge on the first line, address below: no check. C15 asserts only `listitem` count, no `table` and `scrollWidth` (`web/e2e/instituicoes.spec.ts:29-35`). Measured informally at 390 px: name `y=174`, badge `y=174` at `x=262` (right of the name, which ends at 254), `/univag` at `y=214`. The code conforms; the check is missing. |
| `plan.md` `## Screens`, "Nova instituição" `Dialog` (fields Nome, Endereço, Fuso horário, then "Primeiro administrador" with Nome, CPF, E-mail; "Cancelar" and "Criar"; Endereço with the fixed `/` prefix) | yes - `plan.md:89-95` | none | field order, the "Cancelar" button and the `/` prefix: no check. C16-C18 reach the fields by label and the group by name (`instituicoes.test.tsx:93`, `:164-169`), but never their order, "Cancelar" or `/`. Measured informally: labels in DOM order `Nome, Endereço, Fuso horário, Primeiro administrador, Nome, CPF, E-mail`, buttons `Cancelar, Criar`, prefix `/`. The code conforms. |
| `plan.md` `## Screens`, Importar carga `Dialog` and Desativar `Confirmar` | yes - `plan.md:96-99` | none | - (C21 and C28 cover file field, `.json`, "Importar", summary, errors one per row, confirmation text) |
| `.specs/STATE.md` AD-008 (tenancy by global filter) + `plan.md` Landing door 3 and row 5 | yes - `.specs/STATE.md:14`, `plan.md:75`, `:77` | none in the code: see the door 3 judgement under Findings | C31's proof exempts the whole `api/Instituicoes/` folder (`api.Tests/PlataformaTests.cs:460`), which also holds public anonymous routes that set `InstituicaoAtual` (`api/Instituicoes/ManifestoInstituicao.cs:47`, `BaixarImagemInstituicao.cs:35`). Door 3 limits the switch to the `/api/plataforma` use cases. A new non-platform file in that folder would pass. This is a precision gap; the code is fine today. |
| `.specs/STATE.md` AD-032 (cards of the shared `Tabela`) | yes - `.specs/STATE.md:38` | none | - (the extra `Detalhe` line on the card, "N administradores · criada em", is the house `Tabela` pattern for `largo` columns, `web/src/Tabela.tsx:11`, `:79`; noted, not counted) |

## How the proofs ran

API: `dotnet test api.Tests -c Release` with a TRX logger. The first full run hung on `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo`: CPU flat and no Postgres activity for more than 10 minutes. I stopped it and re-ran with `--filter "FullyQualifiedName!~PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo"`: **564 passed, 0 failed**. The excluded test then ran alone: **1 passed**. Total 565, which matches the handoff. Every named API proof below appears in `full2.trx` with outcome `Passed` (`Criar_invalido_400` x7, `InstituicaoComandoTests` x15).

Web: `npx vitest run --reporter=verbose` gave **340 passed / 41 files**; each named `-t` test is listed individually as passed. `npm --prefix web run build` exited 0.

Layout, against `vite preview --port 5199`: `npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/aparencia.spec.ts e2e/instituicoes.spec.ts` gave **91 passed**.

Real e2e: I built my own image of HEAD (`one-verif-plataforma:8044ebd`) and ran it as container `one-plataforma` on `:8086` against a fresh database `one_e2e_verif_plataforma` and bucket `one-e2e-verif-plataforma`. `demo` was seeded by the CLI for the older real specs. `E2E_URL=http://localhost:8086 npx playwright test` gave **117 passed**, including `instituicoes-real.spec.ts:51 operador cria e desativa uma instituição` (45.2 s).

Gates: `dotnet build api` reported 0 errors (CA1502). `npm --prefix web run coverage` and `crapper --use-existing-coverage -s src --threshold 9.99` exited 0; the highest new CRAP is `Instituicoes` at 8.0. The `dryer` command from C34 found "No duplicate candidates found".

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `operador` exit 0, exact text, 1 row; again, still 1 | `OperadorComandoTests.Adicionar_operador_sai_0` Passed | `api.Tests/OperadorComandoTests.cs:31` `Assert.Equal(0, codigo)`; `:33` `Assert.Equal($"Operador {u.Nome} adicionado.{NewLine}", saida)`; `:34`, `:38` `Assert.Equal(1, await LinhasOperador(u.Id))` | PASS |
| C2 | `--remover` exit 0, text, keeps other roles | `OperadorComandoTests.Remover_operador_sai_0` Passed | `api.Tests/OperadorComandoTests.cs:51` `"Operador {u.Nome} removido."`; `:52` `Assert.Equal(0, LinhasOperador)`; `:53` `Assert.Equal([Papeis.Administrador], ...)` | PASS |
| C3 | 3 invalid cases exit 1, error on `erro`, nothing written | `OperadorComandoTests.Operador_invalido_sai_1` Passed | `api.Tests/OperadorComandoTests.cs:79` `Assert.Equal(1, codigo)`; `:81` `Assert.NotEqual("", erro.Trim())`; `:83` `Assert.Equal(antes, await TotalDePapeis())` | PASS |
| C4 | 6 routes: 403 + detail for 3 roles (18), 401 without session (6) | `PlataformaTests.Rotas_403_sem_operador_e_401_sem_sessao` Passed | `api.Tests/PlataformaTests.cs:84` `r.StatusCode == Forbidden`; `:85` `Assert.Equal(SoOperador, detail)`; `:88` `Assert.Equal(18, feitos)`; `:93` `Unauthorized`; `:96` `Assert.Equal(24, feitos)` | PASS |
| C5 | "Plataforma" group last, link "Instituições" + `Building2` to `/{slug}/instituicoes`, sidebar and drawer, only for OPERADOR | vitest `grupo Plataforma só para operador` passed | `web/src/administracao/instituicoes.test.tsx:37` `expect(todos.at(-1)).toEqual(['Plataforma', ['Instituições']])`; `:40` `href '/univag/instituicoes'`; `:41` `toHaveClass('lucide-building-2')`; `:48` drawer; `:56-57` absent for ADMINISTRADOR/ATENDENTE/ALUNO | PASS |
| C6 | PUT from Users keeps OPERADOR (`["ADMINISTRADOR"]`, `["ATENDENTE"]`) | `PlataformaTests.Editar_usuario_preserva_operador` Passed | `api.Tests/PlataformaTests.cs:111` `OK`; `:112` `Assert.Equal(["ADMINISTRADOR", "OPERADOR"], ...)`; `:116` `Assert.Equal(["ATENDENTE", "OPERADOR"], ...)` | PASS |
| C7 | create/edit with OPERADOR -> 400 `errors.papeis`, nothing written | `PlataformaTests.Tela_usuarios_nao_da_operador` Passed | `api.Tests/PlataformaTests.cs:134` `BadRequest`; `:135` `"Escolha ao menos um papel."` on `errors.papeis[0]`; `:137` user not created; `:139` role count unchanged | PASS |
| C8 | 200, exact 6 fields, active by name then inactive, active admins only | `PlataformaTests.Listar_todas_ativas_primeiro` Passed | `api.Tests/PlataformaTests.cs:164` order `[a, b, op, c]`; `:165` exact field names; `:166` `[true, true, true, false]`; `:167` `Assert.Equal([2, 0, 1, 0], administradores)` | PASS |
| C9 | 201, Location, body; Triagem, Não classificado, admin, token | `PlataformaTests.Criar_instituicao_201` Passed | `api.Tests/PlataformaTests.cs:182` `Created`; `:183` Location `/api/plataforma/instituicoes/demo`; `:185` `("demo", ..., true, 1)`; `:190`, `:192`, `:194-196` | PASS |
| C10 | `EmailSaida` with recipient, subject, valid link, **in the same transaction** | `PlataformaTests.Criar_grava_o_email_na_mesma_transacao` Passed | `api.Tests/PlataformaTests.cs:210` `(Destinatario, Assunto)`; `:213-214` token valid; `:221-222` nothing left when the commit fails. **Fault F2 survived**: with the e-mail added and saved after `tx.CommitAsync()` the proof stays green, because the failing commit throws before the e-mail is reached either way. The code is in the transaction today (`api/Instituicoes/Criacao.cs:37`, `:50`, `:52`), but the proof cannot tell. | FAIL |
| C11 | 7 invalid cases -> 400 on the field, nothing written | `PlataformaTests.Criar_invalido_400` x7 Passed | `api.Tests/PlataformaTests.cs:226-232` the 7 `InlineData`; `:244` `BadRequest`; `:245` `Assert.Equal([campo], errors.keys)`; `:246` institution count unchanged | PASS |
| C12 | existing slug (active or inactive) -> 409 + detail, nothing written | `PlataformaTests.Slug_repetido_409` Passed | `api.Tests/PlataformaTests.cs:261` `Conflict`; `:262` `"Esse endereço já está em uso."`; `:264` count unchanged | PASS |
| C13 | `InstituicaoComandoTests` green with no assertion edit | `InstituicaoComandoTests` x15 Passed | `git diff 5b53ce7 8044ebd -- api.Tests/InstituicaoComandoTests.cs` is empty; e.g. `api.Tests/InstituicaoComandoTests.cs:48` `Assert.Equal(0, codigo)`. (The check holds; the CLI change for all-equal CPFs sits outside it: see Binding sources.) | PASS |
| C14 | row content, badge, admins, date, menu per state, button | vitest `lista com selo, administradores e ações` passed | `web/src/administracao/instituicoes.test.tsx:66` headers `['Nome','Situação','Administradores','Criada em','']`; `:69` `/demo` `text-xs`; `:70` `/^Ativa$/`; `:74` `/^Desativada$/`; `:78-79` exact action lists; `:80` button | PASS |
| C15 | 1440: button right of title, same top; 390: cards, no table, `scrollWidth` ≤ 390 | playwright `arranjo Instituições` x2 passed | `web/e2e/instituicoes.spec.ts:18` `botao.x >= titulo.x + titulo.width - 1`; `:19` `abs(botao.y - titulo.y) <= 1`; `:29` `listitem` count 2; `:30` table count 0; `:31` `scrollWidth <= 390` (green; the duplicated title it forces is under Binding sources) | PASS |
| C16 | address follows name until edited; fuso starts at Sao_Paulo; only Brazilian `America/*` | vitest `endereço segue o nome até ser editado` passed | `web/src/administracao/instituicoes.test.tsx:103` `'centro-universitario-sao-jose-cia'`; `:109` stays `'csj'`; `:112` `America/Sao_Paulo`; `:116-118` exact sorted list of 16 | PASS |
| C17 | POST body; dialog closes; alert text + link; list re-read | vitest `criar fecha, avisa e recarrega a lista` passed | `web/src/administracao/instituicoes.test.tsx:139` dialog gone; `:140-142` exact POST body; `:143` alert text; `:144` link `/faculdade-demo`; `:146` `lidas === 2` | PASS |
| C18 | 400 `admin.email` under E-mail; 409 under Endereço; 6 fields kept | vitest `erro da API no campo sem perder o formulário` passed | `web/src/administracao/instituicoes.test.tsx:174` `toHaveAccessibleDescription('E-mail inválido.')`; `:178` Endereço `'Esse endereço já está em uso.'`; `:164-169`, `:175`, `:180` the 6 values | PASS |
| C19 | 200, exact 5 keys equal to the CLI's counts, written in the slug's institution, not the operator's | `PlataformaTests.Carga_pela_rota_grava_na_instituicao_do_slug` Passed | `api.Tests/PlataformaTests.cs:285` exact keys; `:286` `Assert.Equal(doComando, ...)`; `:290-291` target has the sectors and 3 articles; `:295-296` operator's institution unchanged | PASS |
| C20 | 400 for `{` and bad rule, 413 at 2 MiB+1, 404 unknown slug, nothing written | `PlataformaTests.Carga_invalida_400_413_404` Passed | `api.Tests/PlataformaTests.cs:312` `BadRequest`; `:315` `regras[0].categoria`; `:319` `RequestEntityTooLarge`; `:322-323` 404 + detail; `:324` counts unchanged | PASS |
| C21 | file field `.json`, multipart `arquivo`, summary text, errors one per row | vitest `importar carga mostra o resumo ou os erros` passed | `web/src/administracao/instituicoes.test.tsx:205` `accept` contains `.json`; `:211` summary text; `:212` `{ arquivo }`; `:217` different `tr` per error | PASS |
| C22 | desativar 200; public page 404; login as non-existent; open session 401 | `PlataformaTests.Desativar_bloqueia_login_e_sessao` Passed | `api.Tests/PlataformaTests.cs:341`, `:343` `(slug, false)`; `:344` 404; `:346-347` same status and detail as base unknown login; `:348` `/api/auth/me` 401 | PASS |
| C23 | own institution -> 409 + detail, stays active | `PlataformaTests.Nao_desativa_a_propria` Passed | `api.Tests/PlataformaTests.cs:359` `Conflict`; `:360` detail; `:361` `Assert.True(Ativa)` | PASS |
| C24 | reativar 200, login back to 200 | `PlataformaTests.Reativar_volta_o_login` Passed | `api.Tests/PlataformaTests.cs:375`, `:377` `(slug, true)`; `:378` login `OK` | PASS |
| C25 | 202 `{enviados:2}`, 2 tokens, 2 e-mails, none for the inactive admin | `PlataformaTests.Reenviar_acesso_para_admins_ativos` Passed | `api.Tests/PlataformaTests.cs:396` `Accepted`; `:397` `enviados == 2`; `:400` tokens +2; `:402` recipients are exactly the two active admins; `:407` token matches | PASS |
| C26 | 409 without an active admin / deactivated, nothing written | `PlataformaTests.Reenviar_sem_admin_ou_desativada_409` Passed | `api.Tests/PlataformaTests.cs:425-426`; `:429-430`; `:431` counts unchanged | PASS |
| C27 | 4 routes with `nao-existe` -> 404 + detail | `PlataformaTests.Slug_inexistente_404` Passed | `api.Tests/PlataformaTests.cs:444` `NotFound`; `:445` `"Instituição não encontrada."` | PASS |
| C28 | Desativar confirms with text then badge; Reativar and Reenviar act directly with their messages | vitest `desativar confirma, reativar e reenviar agem direto` passed | `web/src/administracao/instituicoes.test.tsx:241` confirmation text; `:249` `/^Desativada$/`; `:253` `'Instituição reativada.'`; `:257` `'Enviamos o link para 2 administrador(es).'`; `:258` URL sequence | PASS |
| C29 | whole API suite green; existing assertion edits only items 1-3, 5 | `dotnet test api.Tests` 564 + 1 passed | `git show f1f7d40` touches only `ArquiteturaTests.cs`, `MediatorTests.cs`, `SessaoTests.cs`, `RetratoTests.cs` and `rotas.txt` counts (68->74, 71->77, 31->32, 59->65, 64->70, 73->79), all items 1-2; `.specs/GLOSSARIO.md` item 5; e.g. `api.Tests/SessaoTests.cs:34` `Assert.Equal(70, privadas.Count)` | PASS |
| C30 | `rotas.txt` gains exactly the 6 lines, none removed | `RetratoTests.Tabela_de_rotas_igual_a_da_base` Passed | `api.Tests/RetratoTests.cs:39` `Assert.Equal(79, viva.Count)`; `:51` `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva)`; `rotas.txt` diff is +6 lines, all `anonimo=False autorizacao=True limite=-` | PASS |
| C31 | `InstituicaoAtual` assigned only where it was plus the platform; `IgnoreQueryFilters` unchanged | `ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando` + `PlataformaTests.InstituicaoAtual_so_onde_ja_era_e_na_plataforma` Passed | `api.Tests/ArquiteturaTests.cs:80` `Assert.All(usos, p => Assert.Contains(p, permitidos))`; `api.Tests/PlataformaTests.cs:462` `Assert.Equal(["Chamados/TempoRealHub.cs"], fora)` (precision gap: `:460` exempts all of `Instituicoes/`, see Binding sources) | PASS |
| C32 | `dotnet build api` passes CA1502 | `dotnet build api` exit 0, `0 Erro(s)` | `api/CodeMetricsConfig.txt` gate; new handlers stay below 10 (e.g. `api/Instituicoes/Criacao.cs:18` `Validar`) | PASS |
| C33 | Vitest whole suite + build green; web edits only item 4 | `npx vitest run` 340/340; `npm --prefix web run build` exit 0 | `git show 5ca4505 -- web/src/administracao/usuarios.test.tsx` is additions only (`usuarios.test.tsx` new `it` `usuário com OPERADOR edita sem enviar o papel`); no existing web assertion edited | PASS |
| C34 | crapper 0 at 9.99; dryer no candidate ≥ 0.8 | `crapper` exit 0; `dryer ... grep -q` exit 0 | `web/.metrics/crap.edn` `Instituicoes administracao.Instituicoes 8 100.0% 8.0` (max new) | PASS |
| C35 | layout suites green with the simulated API | playwright 4 files: 91 passed | `web/e2e/instituicoes.spec.ts:18-19`, `:29-31` among the 91 | PASS |
| C36 | real e2e: operator via CLI, creates demo, Mailpit link to the create-password screen, deactivate -> "Instituição não encontrada"; whole suite green | `E2E_URL=http://localhost:8086 npx playwright test`: 117 passed, incl. `operador cria e desativa uma instituição` | `web/e2e/instituicoes-real.spec.ts:56` `'Operador Ana Operadora adicionado.'`; `:77` alert; `:82` link path `/${daDemo}/definir-senha`; `:86` `Nova senha` visible; `:93` `Desativada`; `:95` `'Instituição não encontrada.'` | PASS |

## Coverage

Recomputed from the code (route statuses, command branches) and from `plan.md` (AC prose, Landing), not read from the author's table.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/plataforma/instituicoes` statuses (3) | `ListarInstituicoes.cs`, `PlataformaRotas.cs:13-14`, auth group | 200 C8 · 401 C4 · 403 C4 | - |
| `POST /api/plataforma/instituicoes` statuses (5) | `CriarInstituicao.cs:26-32` | 201 C9 · 400 C11 · 401 C4 · 403 C4 · 409 C12 (pre-check path; the unique-index race path at `:31` is the Swept `n/a` concurrency row) | - |
| `.../{slug}/carga` statuses (6) | `ImportarCargaInstituicao.cs:27-46` | 200 C19 · 400 C20 · 401 C4 · 403 C4 · 404 C20, C27 · 413 C20 (400 causes "no file field" `:28` and JSON `null` `:38` have no proof; status member covered) | - |
| `.../{slug}/desativar` statuses (5) | `DesativarInstituicao.cs` | 200 C22 · 401 C4 · 403 C4 · 404 C27 · 409 C23 | - |
| `.../{slug}/reativar` statuses (4) | `ReativarInstituicao.cs` | 200 C24 · 401 C4 · 403 C4 · 404 C27 | - |
| `.../{slug}/reenviar-acesso` statuses (5) | `ReenviarAcesso.cs:19-34` | 202 C25 · 401 C4 · 403 C4 · 404 C27 · 409 C26 (both causes) | - |
| roles without access (4) | AC 4, AC 5 | ADMINISTRADOR, ATENDENTE, ALUNO: C4, C5 · no session: C4 | - |
| invalid creation fields (7) | AC 11, `Criacao.cs:21-27` | slug short, slug uppercase, nome, fuso, CPF, admin nome, e-mail: C11 x7 | - |
| `operador` command cases (6) | `InstituicaoComando.cs` `Operador` | add C1 · repeat C1 · remove C2 · unknown slug, CPF not in institution, inactive user C3 | - |
| deactivation effects (**4**, not 3) | AC 22 prose (`plan.md:157`): login, **primeiro acesso**, `GET /api/instituicoes/{slug}`, open sessions | public page C22 · login C22 · open session C22 · first access: **no proof**. C22 and the author's row leave it out. `PrimeiroAcesso.cs:26` filters `x.Ativa`, but no test anywhere (`PrimeiroAcessoTests` has no inactive case; `DefinirSenhaTests` covers only `definir-senha`). | primeiro acesso of a deactivated institution |
| resend recipients (2) | AC 25 | active admin C25 · inactive admin excluded C25 | - |
| Landing one-way doors (**5**; the author's row still says 4) | `plan.md:71-77` | 1 C1, C6, C7 · 2 C4 · 3 C19, C31 · 4 C5 · 5 C8 (`[2,0,1,0]` with an inactive admin; F5 killed) | - |
| `## Screens` elements and arrangement | `plan.md:83-99` | see Binding sources | (counted under Binding sources) |

## Test policy rows

No `Test policy` section in `checks.md`; nothing to judge.

## Faults injected

Isolated in `git worktree add D:/one-verif-wt HEAD`. Baseline `git status --porcelain` was recorded before the run and matched after `git worktree remove`. API faults F1, F2, F3 and F5 are disjoint surfaces and ran in one `dotnet test` over their four proofs. F4 ran in Vitest.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (S1, door 1): the Users screen stops preserving OPERADOR, `RemoveAll(p => !papeis.Contains(p.Papel))` | `api/Administracao/UsuarioRotas.cs:55` | yes - `Editar_usuario_preserva_operador` failed: expected `["ADMINISTRADOR","OPERADOR"]`, actual `["ADMINISTRADOR"]` |
| F2 (S2, C10): the first-access e-mail is added and saved after `tx.CommitAsync()`, outside the transaction | `api/Instituicoes/Criacao.cs:50-52` | no - survived: `Criar_grava_o_email_na_mesma_transacao` passed |
| F3 (S3, door 3): carga no longer switches `db.InstituicaoAtual` to the slug's institution, so it writes into the operator's | `api/Instituicoes/ImportarCargaInstituicao.cs:40` | yes - `Carga_pela_rota_grava_na_instituicao_do_slug` failed: expected `"Coordenação ADS"`, actual `"Triagem"` |
| F4 (S4, web): "Desativar" acts directly, skipping `Confirmar` | `web/src/administracao/Instituicoes.tsx:244` | yes - vitest `desativar confirma, reativar e reenviar agem direto` failed |
| F5 (door 3 row 5): the direct SQL count drops `u.ativo`, so inactive admins count | `api/Instituicoes/ListarInstituicoes.cs:23` | yes - `Listar_todas_ativas_primeiro` failed: expected `[2,0,1,0]`, actual `[3,0,1,0]` |

## Findings

Ranked:
1. **F2 survived (C10).** "Gravada na mesma transação" is proven only by a commit that throws, and the after-commit mutant passes that too. The gap that matters is a commit that succeeds followed by a failed e-mail save, which leaves an institution whose admin never gets the link. A proof needs the e-mail save itself to fail, for example a `SaveChangesInterceptor` that throws on `EmailSaida`, and must then assert that the institution is gone. The code is right today (`Criacao.cs:37-52`).
2. **Unproven member: AC 22 "o primeiro acesso" of a deactivated institution.** The AC names it, but C22 and the Coverage row omit it, and no test anywhere proves it.
3. **CLI behaviour change against AD-033 / AC 13.** `instituicao criar` with an all-equal CPF now exits 1 (`Criacao.cs:25`, `:32`). The user approved "CLI keeps its output". Either the user accepts the change (it is arguably a fix), or the all-equal check moves to the route only. Rejection is also inconsistent: `Cpf.Normalizar` still accepts all-equal CPFs on login and on the Users screen.
4. **Duplicated title on Instituições.** C15 forced an `h2` "Instituições" next to the button, and the shell `h1` "Instituições" is on screen at the same time (`Instituicoes.tsx:237`, `Autenticado.tsx:235`). C15 should anchor the button to the content header the way the other `Cabecalho` screens do, not to a second title.
5. **Arrangement and elements with no check.** The < 768 px card (name and badge on the first line, address below), the dialog field order, the "Cancelar" button and the `/` prefix. All conform when measured; none has a check.
6. **Precision gap (C31 / door 3).** The `InstituicaoAtual` rule exempts all of `api/Instituicoes/` (`PlataformaTests.cs:460`), which is wider than door 3.
7. Stale author table: the Landing doors are now 5, not 4. Row 5 is proven by C8.

Judgements the orchestrator asked for:
- **Door 3 / row 5.** Holds in the code.
  - The only new `InstituicaoAtual` assignments are in the three platform use cases: `ReenviarAcesso.cs:22`, `ImportarCargaInstituicao.cs:40` and `Criacao.cs:41` (via `CriarInstituicao.cs:30`). All are behind the OPERADOR filter (`PlataformaRotas.cs:13-14`).
  - That filter reads the user loaded from the database on every request (`Sessao.cs:24`, `:32`), so removing the role through the CLI takes effect on the next request.
  - Every other assignment existed at base (grep of `InstituicaoAtual\s*=`).
  - The SQL count (`ListarInstituicoes.cs:21-25`) is an interpolated `FormattableString` passed to `Database.SqlQuery`. Its only hole is the constant `Papeis.Administrador`, sent as a parameter, and the route takes no input, so nothing can be injected.
  - It counts `u.ativo` users that have an `ADMINISTRADOR` row, grouped by `instituicao_id`. F5 proves the `ativo` filter is asserted.
- **CPF.** C11 and C13 both hold and no closed-list assertion was edited. The CLI change is a deviation from AD-033 outside every check (finding 3).
- **`Usuarios.tsx`.**
  - `daTela` (`Usuarios.tsx:29-30`, `:41`) only hides OPERADOR in the form and the Papéis column.
  - The API preserves it on PUT (`UsuarioRotas.cs:55`, F1 killed) and refuses it in `papeis` (`UsuarioRotas.cs:10`, `:33`, C7).
  - The only code that writes or deletes the OPERADOR row is the CLI (`InstituicaoComando.cs:94-95`). `ImportarMatriculas.cs:60` adds only ALUNO.
  - No HTTP path grants or strips the role.
- **First-access e-mail.**
  - It is written in the creation transaction (`Criacao.cs:37`, `:50`, `:52`), but the proof cannot tell (finding 1).
  - The link never reaches the screen: `CriarInstituicao.Resposta` (`CriarInstituicao.cs:11`) and `ReenviarAcesso.Resposta(int Enviados)` (`ReenviarAcesso.cs:9`) carry no token, and the alert shows only the e-mail and `/{slug}` (`Instituicoes.tsx:214`).
  - The CLI path passes `cfg: null` and keeps printing the link, as before.

## Cleanup

Removed:
- the container `one-plataforma` and the image `one-verif-plataforma:8044ebd`;
- the database `one_e2e_verif_plataforma` and the bucket `one-e2e-verif-plataforma`;
- the database `one_teste_ada0ada5fc37` and the bucket `one-teste-f956886aadcf`, left by the hung run I stopped;
- the worktree `D:/one-verif-wt`, together with its `node_modules` junction;
- the preview server on 5199.

Older `one_teste_*` databases and buckets from before this session were left untouched. Nothing was committed.

## Gate

`dotnet test api.Tests` - 565 passed, 0 failed (564 in the batch + 1 run alone); Vitest 340 passed; Playwright layout 91 passed; Playwright real e2e 117 passed; `dotnet build api` 0 errors; crapper and dryer 0. Verdict FAIL on findings 1-5.
