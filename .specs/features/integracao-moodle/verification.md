# Entrar no One pelo Moodle da Univag (LTI 1.3) verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 68a03bc..12f8408
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Resumo: 38 dos 39 checks provados com `arquivo:linha` em HEAD 12f8408. C38 segue sem PASS: o `dryer` voltou a falhar com o mesmo `DynamicLoadError` (Smart App Control). Os gaps da rodada 1 em C14, C11, C39 e na Coverage (400 do `lancamento`, papéis) estão fechados; as 5 faltas re-injetadas ou novas morreram. A rodada 1 estava em 812cf39; o fix (12f8408) mudou só testes (`git diff 812cf39..12f8408`: `MoodleFalso.cs`, `MoodleInicioTests.cs`, `MoodleLancamentoTests.cs`, `MoodleLimiteTests.cs`, `MoodleLimpezaTests.cs`; nenhum arquivo de produção). Seções sem marca foram `verified at 12f8408`.

## Binding sources

carried from 812cf39 - perfil `standard`, o plano não marca fonte vinculante; o fix não tocou interface nem `checks.md`/`plan.md`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| nenhuma (perfil standard) | n/a | none | - |

## Checks

Provas rodadas em HEAD 12f8408 (verified at 12f8408), em lotes:
- API inteira: `dotnet build One.slnx` (0 erros, 6 avisos) e `dotnet test One.Api.Tests --no-build` - `Aprovado! Com falha: 0, Aprovado: 772, Total: 772` (era 763; +9 casos novos do fix).
- Lote Moodle/Arquitetura/Retrato/Sessão: `dotnet test One.Api.Tests --no-build --filter "FullyQualifiedName~Moodle|FullyQualifiedName~ArquiteturaTests|FullyQualifiedName~RetratoTests|FullyQualifiedName~SessaoTests" --logger "trx;LogFileName=r2.trx"` - 140 passed, 0 failed; lido o `.trx`: cada teste nomeado abaixo aparece individualmente como `Passed` (incluindo cada linha das teorias: `Token_invalido_400` x11, `Equipe_nao_entra_pelo_moodle` x6, `Lancamento_sem_plataforma_ativa_400` x2, `Login_recusa_com_400` x5; as 4 de `ArquiteturaTests` do C33/C34 e as 63 da classe).
- Web: `npm --prefix web test -- --run` - 637 passed (637); `... src/acesso/moodle.test.tsx src/administracao/moodle.test.tsx --reporter=verbose` - 8 passed com cada nome listado; `npm --prefix web run build` exit 0.

Linhas com `carried from 812cf39` são de arquivos que o fix não tocou (o diff acima só tocou 5 arquivos de teste da API); o teste correspondente rodou de novo e passou em 12f8408.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | login 302 ao `authUrl` com os 9 parâmetros, `state`/`nonce` >= 22, grava `lti_lancamento` +10 min | `...MoodleInicioTests.Login_redireciona_ao_auth_url_e_grava_o_estado` (2 casos) passed | `One.Api.Tests/MoodleInicioTests.cs:32` `Assert.Equal(HttpStatusCode.Redirect, r.StatusCode)`; `:36-43` os parâmetros; `:44-45` `Assert.True(q["state"]!.Length >= 22)`; `:51` `Assert.Equal(f.Relogio.GetUtcNow().UtcDateTime.AddMinutes(10), l.ExpiraEm)` (linhas não mudaram) | PASS |
| C2 | login 400 e nenhum `lti_lancamento` (iss, client, inativa, sem plataforma; agora também sem `login_hint`) | `...MoodleInicioTests.Login_recusa_com_400` (5 casos) passed | `MoodleInicioTests.cs:75` `Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode)`; `:76` `Assert.Empty(await f.Db(i.Id, db => db.LtiLancamentos.ToListAsync()))`; caso novo `:60` `[InlineData("sem-login-hint")]` e `:69` `"sem-login-hint" => Consulta().Replace("&login_hint=hint-1", "")`. Falta F7 morta | PASS |
| C3 | 404 em login, lancamento e jwks para slug inexistente e instituição inativa | `...MoodleInicioTests.Slug_inexistente_ou_inativo_404` passed | `MoodleInicioTests.cs:89-91` `Assert.Equal(HttpStatusCode.NotFound, ...)` x3 rotas, dentro do `foreach` dos 2 slugs (`:87`) | PASS |
| C4 | lancamento válido de aluno vinculado: 302 `/{slug}`, cookie, `/api/auth/me` 200, `usado_em` preenchido | `...MoodleLancamentoTests.Token_valido_de_aluno_vinculado_abre_a_sessao` passed | `MoodleLancamentoTests.cs:46-48` `Redirect`, `Assert.Equal($"/{i.Slug}", r.Destino())`, `Assert.StartsWith("one.auth=", r.Sessao())`; `:50-51` `OK` e `u.Id`; `:53` `Assert.NotNull(l.UsadoEm)` | PASS |
| C5 | `id_token` recusado 400 sem cookie nos 8 itens (e agora `sub` vazio e `alg` HS256); 61 s recusa, 59 s vale | `...MoodleLancamentoTests.Token_invalido_400` (11 casos) e `...Token_vencido_ha_59s_ainda_vale` passed | `MoodleLancamentoTests.cs:92` `Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode)`; `:93` `SemSessao(r)` (`:34` `Assert.Equal("", r.Sessao())`); casos `:59-67` e o ajuste `:88` `case "sub-vazio": d["sub"] = ""`, `:90` `outraChave: caso == "assinatura", simetrica: caso == "alg-hs256"` (`:30` `AssinarHs256`, `Infra/MoodleFalso.cs:49`); fronteira 59 s `:124-125` `Redirect` + `one.auth=` | PASS |
| C6 | state inexistente, expirado (10 min 1 s) e usado: 400 sem sessão; 9 min 59 s entra | `...State_invalido_400` (3 casos) e `...State_a_9min59s_ainda_entra` passed | `MoodleLancamentoTests.cs:146` `Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode)`; `:147` `SemSessao(r)`; fronteira `:161-162` `Redirect` + `one.auth=` | PASS |
| C7 | vínculo existente ignora CPF/e-mail/nome do token | `...Vinculo_existente_ignora_cpf_e_email_do_token` passed | `MoodleLancamentoTests.cs:180` `Assert.Equal($"/{i.Slug}", r.Destino())`; `:181` `Assert.Equal(dono.Id, ...GetProperty("id").GetInt64())`; `:182` `Assert.Single(await f.Vinculos(i))` | PASS |
| C8 | sem vínculo, `username`=CPF de ALUNO cria 1 vínculo; segundo clique reutiliza | `...Primeiro_clique_vincula_pelo_cpf` passed | `MoodleLancamentoTests.cs:196-197` `Assert.Single(await f.Vinculos(i))` e `Assert.Equal((u.Id, MoodleFalso.Emissor, "77"), (v.UsuarioId, v.Emissor, v.Sub))`; `:200-202` segundo clique `Destino`, cookie e `Assert.Single(await f.Vinculos(i))` | PASS |
| C9 | sem cadastro: 302 `?moodle=sem-cadastro`, sem cookie, 0 vínculos (3 casos) | `...Sem_cadastro_redireciona_com_motivo` (3 casos) passed | `MoodleLancamentoTests.cs:216` `Assert.Equal($"/{i.Slug}?moodle=sem-cadastro", r.Destino())`; `:217` `SemSessao(r)`; `:218` `Assert.Empty(await f.Vinculos(i))` | PASS |
| C10 | inativo: 302 `?moodle=inativo`, sem cookie, nenhum vínculo novo | `...Usuario_inativo_redireciona_com_motivo` (2 casos) passed | `MoodleLancamentoTests.cs:234` `Assert.Equal($"/{i.Slug}?moodle=inativo", r.Destino())`; `:235` `SemSessao(r)`; `:236` `Assert.Equal(antes, (await f.Vinculos(i)).Count)` | PASS |
| C11 | equipe: 302 `?moodle=use-senha` para ATENDENTE só e ALUNO+ATENDENTE (texto do check); ALUNO só abre | `...Equipe_nao_entra_pelo_moodle` (6 casos) passed | `MoodleLancamentoTests.cs:254` `Assert.Equal($"/{i.Slug}?moodle=use-senha", r.Destino())`; `:255` `SemSessao(r)`; `:256` `Assert.Empty(await f.Vinculos(i))`; os 6 casos em `:239-244` `PapeisDeEquipe()` (ATENDENTE, ALUNO+ATENDENTE, ADMINISTRADOR, ALUNO+ADMINISTRADOR, OPERADOR, ALUNO+OPERADOR) via `:246` `[MemberData]`; ALUNO só abre `:46-48` e `:194-195`. Falta F3 morta (precisão: o texto do check não lista ADMINISTRADOR/OPERADOR, o teste é mais estrito) | PASS |
| C12 | reenvio do par 400; 2 simultâneos: um 302 com cookie e um 400 | `...Reenvio_do_mesmo_par_400` e `...Dois_envios_simultaneos_um_so_entra` passed | `MoodleLancamentoTests.cs:271-272` `Redirect`/`BadRequest`; `:287` `Assert.Equal([HttpStatusCode.Redirect, HttpStatusCode.BadRequest], respostas.Select(r => r.StatusCode).OrderBy(s => (int)s))`; `:288` `Assert.Equal(1, respostas.Count(r => r.Sessao().StartsWith("one.auth=")))` | PASS |
| C13 | jwks 200, 1 chave `kty/alg/use/kid/n/e`, sem `d` | `...MoodleChavesTests.Jwks_publica_so_a_chave_publica` passed | carried from 812cf39: `MoodleChavesTests.cs:17` `OK`; `:19` `Assert.Equal(["kty", "alg", "use", "kid", "n", "e"], ...)`; `:27-28` `n` e `e` do PEM | PASS |
| C14 | agendador apaga `lti_lancamento` vencido há mais de 1 dia (2 instituições); mantém o que venceu há 23 h 59 min e o vigente | `...MoodleLimpezaTests.Agendador_apaga_o_que_venceu_ha_mais_de_um_dia` passed | `One.Api.Tests/MoodleLimpezaTests.cs:18` apagar: `agora - LtiLancamento.Validade - TimeSpan.FromDays(1) - TimeSpan.FromMinutes(1)`; `:19` manter: `... - TimeSpan.FromHours(23) - TimeSpan.FromMinutes(59)`; `:26` `Assert.Equal(manter.Order(), restantes.Order())`; `:27` `Assert.Empty(restantes.Intersect(apagar))`; `:29` `Assert.Contains(f.Relogio.GetUtcNow().UtcDateTime - TimeSpan.FromHours(23) - TimeSpan.FromMinutes(59), vencimentos)` (o `expira_em` gravado é exatamente agora - 23 h 59 min). Falta F1 (limite 23,7 h) morta | PASS |
| C15 | PUT grava e responde 200 com os campos na ordem e as 3 URLs | `...MoodleAdminTests.Put_grava_e_devolve_as_tres_urls` passed | carried from 812cf39: `MoodleAdminTests.cs:42` `OK`; `:44` lista de 10 campos em ordem; `:51-53` as 3 URLs | PASS |
| C16 | PUT 400 sem https; `http://localhost` só em Development | `...Url_sem_https_400` (2 casos) passed | carried from 812cf39: `MoodleAdminTests.cs:67`, `:70`, `:72-77` | PASS |
| C17 | PUT 400 apontando o campo (10 casos); 500 aceita | `...Campo_vazio_ou_longo_400` (10 casos) passed | carried from 812cf39: `MoodleAdminTests.cs:99-100`, `:103-104` | PASS |
| C18 | dois PUT deixam 1 linha com valores do segundo | `...Segundo_put_atualiza_a_mesma_linha` passed | carried from 812cf39: `MoodleAdminTests.cs:117-118` | PASS |
| C19 | GET sem plataforma traz `configurada=false` e as 3 URLs | `...Get_sem_plataforma_traz_as_urls` passed | carried from 812cf39: `MoodleAdminTests.cs:128-133`, `:139` | PASS |
| C20 | GET e PUT: 403 ATENDENTE e ALUNO, 401 anônimo | `...Sem_papel_de_admin_403_e_sem_sessao_401` passed | carried from 812cf39: `MoodleAdminTests.cs:155-156` | PASS |
| C21 | admin de B não vê nem altera a de A | `...Admin_de_outra_instituicao_nao_enxerga_nem_altera` passed | carried from 812cf39: `MoodleAdminTests.cs:166`, `:169-170` | PASS |
| C22 | 2 PUT simultâneos: um 200, um 409, 1 linha | `...Dois_puts_simultaneos_um_200_e_um_409` passed | carried from 812cf39: `MoodleAdminTests.cs:182-183` | PASS |
| C23 | `?moodle=sem-cadastro` mostra o alerta acima do formulário | `npm --prefix web test -- --run src/acesso/moodle.test.tsx` (verbose: item `sem-cadastro`) passed | carried from 812cf39: `web/src/acesso/moodle.test.tsx:26`, `:27-28` | PASS |
| C24 | `?moodle=inativo` mostra o texto | idem, item `inativo` | carried from 812cf39: `moodle.test.tsx:26` com `:7` | PASS |
| C25 | `?moodle=use-senha` mostra o texto | idem, item `use-senha` | carried from 812cf39: `moodle.test.tsx:26` com `:8` | PASS |
| C26 | valor desconhecido e ausência: nenhum alerta | idem, 2 itens `sem alerta ...` | carried from 812cf39: `moodle.test.tsx:18-19` | PASS |
| C27 | tela `/univag/moodle`: esqueleto, erro com `Tentar de novo`, formulário vazio + 3 URLs + 3 `Copiar` | `src/administracao/moodle.test.tsx` item `estados da tela` passed | carried from 812cf39: `web/src/administracao/moodle.test.tsx:27`, `:31-33`, `:40-42` | PASS |
| C28 | salvar envia PUT com 6 campos e mostra `Moodle salvo.`; 400 marca o campo | item `salva e mostra o erro do campo` passed | carried from 812cf39: `moodle.test.tsx:67-70`, `:76` | PASS |
| C29 | item `Moodle` só para ADMINISTRADOR; ATENDENTE volta à tela inicial | item `item no menu` passed | carried from 812cf39: `moodle.test.tsx:88`, `:90`, `:96-97` | PASS |
| C30 | `plataforma_moodle` com índice único só sobre `instituicao_id` | `...MoodleDadosTests.Plataforma_unica_por_instituicao` passed | carried from 812cf39: `MoodleDadosTests.cs:27` | PASS |
| C31 | `vinculo_moodle` único em (`instituicao_id`,`emissor`,`sub`) | `...Vinculo_unico_por_emissor_e_sub` passed | carried from 812cf39: `MoodleDadosTests.cs:32`, `:43` | PASS |
| C32 | `lti_lancamento` com índice único em `state` | `...State_unico` passed | carried from 812cf39: `MoodleDadosTests.cs:48` | PASS |
| C33 | pacote JWT com versão exata | `...ArquiteturaTests.Pacote_jwt_fixado` passed | carried from 812cf39: `ArquiteturaTests.cs:392` `Assert.Matches(@"^\d+\.\d+\.\d+$", ...)` | PASS |
| C34 | 3 tabelas novas: `instituicao_id`, FK, filtro, snake_case, timestamptz, sem mudança pendente | `...Toda_entidade_tem_instituicao_e_filtro`, `...Tabelas_snake_case_e_datas_timestamptz`, `...Modelo_sem_mudanca_pendente` passed | carried from 812cf39: `ArquiteturaTests.cs:50-62`, `:112`, `:611` | PASS |
| C35 | `ArquiteturaTests` inteira passa (84 mensagens, 87 `Map*`, 33 entidades) | 63 testes da classe passed no lote | carried from 812cf39: `ArquiteturaTests.cs:353`, `:403`, `:528`; o diff do fix não toca `ArquiteturaTests.cs` | PASS |
| C36 | `dotnet build One.slnx` e `dotnet test One.Api.Tests` passam | `dotnet build One.slnx` exit 0 (0 erros, 6 avisos); `dotnet test One.Api.Tests --no-build` exit 0 | runner: `Com falha: 0, Aprovado: 772, Total: 772`. Sem asserção única (check de suíte inteira) | PASS |
| C37 | suíte web e build web passam | `npm --prefix web test -- --run` exit 0; `npm --prefix web run build` exit 0 | runner: `Tests 637 passed (637)`; build `files generated`, exit 0. Edições em asserções: carried from 812cf39 (o fix não toca `web/`) | PASS |
| C38 | `dryer` do `web/` sem candidato a 0.8; `crapper` fica "não rodado" | `cd web && dryer` (uma tentativa, exit 1) | saída literal (últimas linhas): `tree_sitter_language_pack.DynamicLoadError: Dynamic library load error: Failed to load library C:\Users\Alfredo Neto\AppData\Local\tree-sitter-language-pack\v1.23.1\libs\tree_sitter_typescript.dll: LoadLibraryExW failed` (em `dryer\treesitter.py` linha 11, `parser_for`). Não rodou; sem PASS | FAIL |
| C39 | com limites reais, a 6ª chamada a `login` e a 6ª a `lancamento` do mesmo IP dão 429 | `...MoodleLimiteTests.Sexta_chamada_429` passed | `One.Api.Tests/MoodleLimiteTests.cs:21` 5 x `Redirect`; `:23` `Assert.Equal(HttpStatusCode.TooManyRequests, (await c.GetAsync(login)).StatusCode)`; `:25-29` segunda fábrica com balde próprio; `:30` 5 x `Assert.Equal(HttpStatusCode.BadRequest, (await c2.Lancar(j.Slug, "x.y.z", "estado")).StatusCode)`; `:31` `Assert.Equal(HttpStatusCode.TooManyRequests, (await c2.Lancar(...)).StatusCode)` - a 6ª de `lancamento` agora é isolada | PASS |

## Coverage

Recomputado em 12f8408 das linhas de código (produção igual a 812cf39): `IniciarLoginMoodle.cs`, `LancamentoMoodle.cs`, `ValidadorLti.cs`, `Agendador.cs`, `Entidades.cs`. Só as linhas dos sets que o fix tocou foram recomputadas; as demais estão `carried from 812cf39`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET`/`POST /moodle/{slug}/login` statuses (4) + causas do 400 (iss, client, inativa, sem plataforma, sem `login_hint`: 5) | `IniciarLoginMoodle.cs:26-27` (verified at 12f8408) | 302 `MoodleInicioTests.cs:32`; 400 `:75` (5 casos, `sem-login-hint` `:60`); 404 `:89`; 429 `MoodleLimiteTests.cs:23` | - |
| `POST /moodle/{slug}/lancamento` statuses (4) | `LancamentoMoodle.cs:30-36,56-59` (verified at 12f8408) | 302 `MoodleLancamentoTests.cs:46`; 400 `:92,:146,:272`; 404 `MoodleInicioTests.cs:90`; 429 `MoodleLimiteTests.cs:31` | - |
| causas do 400 em `lancamento` (7: plataforma ausente, plataforma inativa, state, assinatura/claims, JWKS fora, reuso, `sub` vazio/algoritmo não RS256 dentro do token) | `LancamentoMoodle.cs:31-32,44`; `ValidadorLti.cs:29,50` (verified at 12f8408) | plataforma ausente e inativa `MoodleLancamentoTests.cs:110` (`Lancamento_sem_plataforma_ativa_400`, 2 casos); state `:146`; token `:92`; JWKS fora caso `chaves-fora` `:66`; reuso `:272`; `sub` vazio `:66,:88`; `alg-hs256` `:67,:90` | - |
| `GET /moodle/{slug}/jwks` statuses (2) | `ChavesMoodle.cs:20-22` (carried from 812cf39) | 200 `MoodleChavesTests.cs:17`; 404 `MoodleInicioTests.cs:91` | - |
| `GET /api/admin/moodle` statuses (3) | carried from 812cf39 | 200 `MoodleAdminTests.cs:137`; 401/403 `:155` | - |
| `PUT /api/admin/moodle` statuses (5) | carried from 812cf39 | 200 `:42`; 400 `:31,:99`; 401/403 `:155`; 409 `:182` | - |
| `id_token` conditions (8, AC 5) | `ValidadorLti.cs:26-32,49-54` (verified at 12f8408) | assinatura/iss/aud/exp/nonce/deployment_id/message_type/version: `MoodleLancamentoTests.cs:59-67` + `:92`; exp 59 s `:124-125` | - |
| `state` states (3) | carried from 812cf39 | `MoodleLancamentoTests.cs:132-147`; fronteira `:161-162` | - |
| `?moodle=` motivos redirecionados (3) | `LancamentoMoodle.cs:55-57` | sem-cadastro `:216`; inativo `:234`; use-senha `:254` | - |
| `?moodle=` valores na tela (5) | carried from 812cf39 | `web/src/acesso/moodle.test.tsx:26` x3; `:18-19` x2 | - |
| campos do PUT com limite (5) | carried from 812cf39 | `MoodleAdminTests.cs:80-84`, `:99` | - |
| papéis do usuário ao `lancamento` (4 papéis em `Entidades.cs:8-14`: ALUNO, ATENDENTE, ADMINISTRADOR, OPERADOR; "líder" do AC 12 é `LiderancaSemestre` de destino de fluxo, `Entidades.cs:64`, não é papel de `Papeis`) | `Entidades.cs:8-14`; `LancamentoMoodle.cs:57` (verified at 12f8408) | ALUNO só `MoodleLancamentoTests.cs:46`; ATENDENTE, ADMINISTRADOR, OPERADOR sozinhos e cada um com ALUNO: `:239-244` e `:254` (6 casos no trx) | - |
| doors (5) | carried from 812cf39 | 1 `MoodleDadosTests.cs:27`; 2 `:32` e `MoodleLancamentoTests.cs:181`; 3 `MoodleDadosTests.cs:48` e `MoodleLancamentoTests.cs:287`; 4 `ArquiteturaTests.cs:392`; 5 `MoodleInicioTests.cs:43`, `MoodleChavesTests.cs:15`, `MoodleAdminTests.cs:51-53` | - |
| entidades de Relations (3) | carried from 812cf39 | `MoodleDadosTests.cs:27,32,48`; `ArquiteturaTests.cs:50-62` | - |
| startup config `Moodle:ChavePrivada` (1 assembly) | carried from 812cf39 (`ChaveLti.cs:15`, `Program.cs:64`) | `MoodleChavesTests.cs:27-28` | - |
| startup config cliente HTTP `moodle` (1 assembly) | carried from 812cf39 (`Program.cs:63`, `ValidadorLti.cs:39`) | `MoodleLancamentoTests.cs:46-48` | - |
| limpeza do agendador: limite de 1 dia (fronteira) | `Agendador.cs:43` (verified at 12f8408) | `MoodleLimpezaTests.cs:18` (1 d 1 min apaga) e `:19`, `:29` (23 h 59 min mantém) | - |

Observação (não é membro de set do plano, mas é lacuna de precisão de `checks.md`, não de código): `IniciarLoginMoodle.cs:27` devolve 400 sem `login_hint` e `ValidadorLti.cs:29,50` recusa `sub` vazio e algoritmo não RS256; agora há teste de cada um, mas nenhum desses três tem item em `checks.md` nem critério em `plan.md`. O texto de C11 também não lista ADMINISTRADOR/OPERADOR. Isso é registro, não FAIL: a prova existe e mata a falta.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Valida o `id_token` (8 condições) e o `state` (3 estados) | `ValidadorLti.cs`, `LancamentoMoodle.cs` (`Consumir`) | um na fronteira HTTP; um caso por linha (C5, C6) | yes - `MoodleLancamentoTests.cs:59-93` (8 itens + `chaves-fora` + `sub-vazio` + `alg-hs256`) e `:132-147` (3 estados), todos por `POST` HTTP (re-julgada: toca `ValidadorLti.cs`) |
| Classifica o usuário achado (sem cadastro, inativo, equipe, aluno) | `LancamentoMoodle.cs` (`Entrar`, `Achar`) | um na fronteira HTTP; um caso por linha (C8 a C11) | yes - era "yes na letra" na rodada 1 com a classe equipe só em ATENDENTE; agora `:239-244` cobre os 3 papéis de equipe, sozinhos e com ALUNO, e `:209`, `:224` os outros |
| Monta as 3 URLs e valida `https` | `MoodleDados.cs`, `AlterarMoodle.cs` | um na fronteira HTTP; C15 a C17 | yes - carried from 812cf39 |
| Instrumentação: `ChavesMoodle` e `VerMoodle` | `ChavesMoodle.cs`, `VerMoodle.cs` | nenhuma própria; cobertas por C13 e C19 | yes - carried from 812cf39 |

## Faults injected

Worktree `D:\one-system-falta` (`git worktree add D:\one-system-falta HEAD`, HEAD 12f8408), removido ao fim com `git worktree remove --force` e `git worktree prune`. `git status --porcelain` do tree real salvo antes e comparado depois: idêntico (0 diferenças; o tree real já tinha mudanças alheias em `web/apresentacao/*` e arquivos `demo-live-*.png`, que não são da feature e ficaram intocados). Sem `git stash`. As 5 faltas foram aplicadas juntas em uma execução, cada uma esperada num teste diferente; `dotnet test One.Api.Tests --filter "FullyQualifiedName~Moodle"` no worktree: 6 failed, 60 passed, 66 total. Cada falta foi morta por teste próprio (nomes do runner abaixo). O `One.Api.Tests.dll` do worktree não foi bloqueado pelo Smart App Control.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (rodada 1, re-injetada): limite `TimeSpan.FromDays(1)` -> `TimeSpan.FromHours(23.7)` | `One.Api/Agendador.cs:43` | yes - `MoodleLimpezaTests.Agendador_apaga_o_que_venceu_ha_mais_de_um_dia` falhou (era a que sobrevivia na rodada 1) |
| F2 (rodada 1, re-injetada): `FirstOrDefaultAsync(x => x.Ativa, ct)` -> `FirstOrDefaultAsync(ct)` | `One.Api/Acesso/LancamentoMoodle.cs:31` | yes - `MoodleLancamentoTests.Lancamento_sem_plataforma_ativa_400(caso: "inativa")` falhou (o caso `sem-plataforma` passa, como esperado: sem linha nada se acha) |
| F3 (rodada 1, re-injetada): `u.Papeis.Count != 1 \|\| !u.Tem(Papeis.Aluno)` -> `!u.Tem(Papeis.Aluno) \|\| u.Tem(Papeis.Atendente)` | `One.Api/Acesso/LancamentoMoodle.cs:57` | yes - `Equipe_nao_entra_pelo_moodle(papeis: "ALUNO,ADMINISTRADOR")` e `(papeis: "ALUNO,OPERADOR")` falharam |
| F6 (nova, superfície do fix): aceitar `sub` vazio, `t.Subject is { Length: > 0 }` -> `t.Subject is not null` | `One.Api/Acesso/ValidadorLti.cs:50` | yes - `MoodleLancamentoTests.Token_invalido_400(caso: "sub-vazio")` falhou |
| F7 (nova, superfície do fix): não exigir `login_hint`, removido `\|\| string.IsNullOrEmpty(Valor("login_hint"))` | `One.Api/Acesso/IniciarLoginMoodle.cs:27` | yes - `MoodleInicioTests.Login_recusa_com_400(caso: "sem-login-hint")` falhou |

Não injetadas (teto de 5 por rodada): o algoritmo RS256 (`ValidadorLti.cs:29`, com `alg-hs256` em `MoodleLancamentoTests.cs:67,90`) e a política de limite do `lancamento` (`MoodleLimiteTests.cs:30-31`). Têm prova, mas nunca foram mutadas. F4 (tolerância de 62 s) e F5 (menu com ATENDENTE) da rodada 1 morreram e o fix não tocou essas superfícies: `carried from 812cf39`.

## Gate

`dotnet build One.slnx` - 0 erros, 6 avisos; `dotnet test One.Api.Tests --no-build` - 772 passed, 0 failed; `npm --prefix web test -- --run` - 637 passed, 0 failed; `npm --prefix web run build` - exit 0; `cd web && dryer` - não rodou, exit 1 (`DynamicLoadError`, `tree_sitter_typescript.dll`, `LoadLibraryExW failed`); `crapper` não rodado (AD-044) e `mutator` suspenso (AD-025).

## Ranked gaps

1. C38 - `dryer` não rodou neste computador (`DynamicLoadError` em `tree_sitter_typescript.dll`, mesma saída da rodada 1); precisa rodar em outro computador ou de um AD de risco aceito no `STATE.md` (AGENTS.md: fechar com risco aceito exige AD). Sem PASS. Lembrar que a feature tocou `web/src/acesso/Acesso.tsx`, `web/src/administracao/Moodle.tsx` e `web/src/Autenticado.tsx`, que são o alvo do `dryer`.
2. Precisão de `checks.md` (sem prova faltando, só texto): C11 não lista ADMINISTRADOR/OPERADOR (`One.Api.Tests/MoodleLancamentoTests.cs:239-244`), e `login` sem `login_hint` (`One.Api/Acesso/IniciarLoginMoodle.cs:27`), `sub` vazio e algoritmo não RS256 (`One.Api/Acesso/ValidadorLti.cs:29,50`) não têm check nem critério. Checks aprovados não mudam (AGENTS.md); registrar em `LESSONS` ou no plano da próxima feature.
