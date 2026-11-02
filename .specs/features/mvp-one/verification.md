# MVP do One - relatório de verificação

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 8c0cb43..af72e56 (af72e56 = a1314d6 + `ROADMAP.md` only; code identical to a1314d6)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Step 1 (binding sources) not run: `ui`-only, and this feature is `standard`. Step 5 (walk the flow with the user) skipped: sub-agent run, no user in the loop.

Proofs ran at HEAD af72e56, each target once:
- API: `dotnet test api.Tests --logger "trx;LogFileName=api.trx"`. 190 results, all `Passed`. Every one of the 184 `--filter` proofs in checks.md was matched by name against the TRX; 183 match at least one passed test, 1 matches nothing (C164).
- Web unit: `npx --prefix web vitest run --reporter=verbose`. 32 passed. Each of the 24 `-t` proofs matches exactly one passed test.
- e2e C180: `playwright test -g "manifesto e service worker"` against the container on :8080. 1 passed. The container serves the same bundle as a fresh HEAD build (`assets/index-z6iyT6lY.js`, `assets/index-oBUqoemV.css` on both).
- e2e C181: `npm --prefix web run build`, then `vite preview --port 4173` and `E2E_URL=http://localhost:4173 playwright test -g "sem rolagem horizontal"`. 10 passed. The preview server was stopped afterwards.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `criar` válido: instituição ativa, Triagem, "Não classificado", admin sem senha, link 60 min, saída 0 | `InstituicaoComandoTests.Criar_valido_sai_0` Passed | `api.Tests/InstituicaoComandoTests.cs:41` `Assert.Equal(0, codigo)`; `:53` `Assert.True(setor.Triagem)`; `:57` `Assert.Null(admin.SenhaHash)`; `:63` `ExpiraEm == now+60min` | PASS |
| C2 | `criar` inválido (5 casos): motivo no stderr, nada gravado, saída 1 | `InstituicaoComandoTests.Criar_invalido_sai_1` (5 theory rows) Passed | `api.Tests/InstituicaoComandoTests.cs:96` `Assert.Equal(1, codigo)`; `:99` `Assert.Equal(antes, await Contagens())` | PASS |
| C3 | `carga` válida cria tudo ATIVO, imprime quantidades, saída 0 | `InstituicaoComandoTests.Carga_valida_sai_0` Passed | `api.Tests/InstituicaoComandoTests.cs:131` `Assert.Equal(0, codigo)`; `:134` `Assert.Contains(linha, saida)`; `:148` `Assert.Equal(EstadosArtigo.Ativo, a.Estado)` | PASS |
| C4 | `carga` com `artigos[2].categoria` inválida não grava nada, saída 1 | `InstituicaoComandoTests.Carga_invalida_nao_grava_nada` Passed | `api.Tests/InstituicaoComandoTests.cs:165` `Assert.StartsWith("artigos[2].categoria", linha)`; `:168` `Assert.Equal(antes, await Contagens())` | PASS |
| C5 | `GET /api/instituicoes/univag` 200 "Univag"; login mostra o nome | `InstituicaoRotaTests.Slug_ativo_200` Passed; vitest "login mostra o nome da instituição" passed | `api.Tests/InstituicaoRotaTests.cs:17` `Assert.Equal("Univag", ...nome)`; `web/src/acesso.test.tsx:20` `findByText(/Univag/)` | PASS |
| C6 | slug inexistente ou inativo 404; SPA "Instituição não encontrada." | `InstituicaoRotaTests.Slug_inexistente_ou_inativo_404` Passed; vitest passed | `api.Tests/InstituicaoRotaTests.cs:29` `Assert.Equal(HttpStatusCode.NotFound, r.StatusCode)`; `web/src/acesso.test.tsx:27` | PASS |
| C7 | 404 nas 27 rotas com `{id}`/`{numero}` de outra instituição | `IsolamentoTests.Recurso_de_outra_instituicao_404` Passed | `api.Tests/IsolamentoTests.cs:58` and `:65` `Assert.True(r.StatusCode == HttpStatusCode.NotFound, ...)` (18 rows + 9 chamado routes = 27 recomputed) | PASS |
| C8 | ids de outra instituição no corpo dão 400 | `IsolamentoTests.Id_de_outra_instituicao_no_corpo_400` Passed | `api.Tests/IsolamentoTests.cs:109` `Assert.All(respostas, r => Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode))` | PASS |
| C9 | mesmo CPF, e-mail e matrícula em duas instituições | `IsolamentoTests.Mesmo_cpf_email_matricula_em_duas_instituicoes` Passed | `api.Tests/IsolamentoTests.cs:125` `Assert.NotEqual(a.Id, b.Id)`; `:128` `Assert.NotEqual(mUnivag.Id, mDemo.Id)` | PASS |
| C10 | CPF ou e-mail repetido na instituição 409, sem criar conta | `UsuarioAdminTests.Cpf_ou_email_repetido_409` Passed | `api.Tests/AdminTests.cs:208` and `:209` `Assert.Equal(HttpStatusCode.Conflict, ...)`; `:210` count unchanged | PASS |
| C11 | 02:30Z mostrado como 01/11/2026 22:30 em Cuiabá | vitest "formata data no fuso da instituição" passed | `web/src/acesso.test.tsx:32` `expect(formatarData(...)).toBe('01/11/2026 22:30')` | PASS |
| C12 | chamado de 02:30Z conta no dia 01/11 | `IndicadoresTests.Dia_do_periodo_no_fuso` Passed | `api.Tests/IndicadoresTests.cs:239` `Assert.Equal([("Financeiro", 1)], Ranking(... de=2026-11-01 ...))`; `:240` empty on 02/11 | PASS |
| C13 | cada e-mail do agendador sai com nome da sua instituição no assunto e remetente | `AgendadorTests.Item_usa_fuso_nome_e_remetente_da_sua_instituicao` Passed | `api.Tests/AgendadorTests.cs:131` `Assert.Equal(i.Nome, msg...From.Name)`. Note: the subject assertion at `:132` reads back what the test itself seeded at `:120` | PASS |
| C14 | instituição inativa: próxima requisição 401 | `IsolamentoTests.Instituicao_inativa_401` Passed | `api.Tests/IsolamentoTests.cs:143` `Assert.Equal(HttpStatusCode.Unauthorized, ...)` | PASS |
| C15 | SaveChanges recusa outra instituição e preenche a vazia | `IsolamentoTests.SaveChanges_recusa_outra_instituicao` Passed | `api.Tests/IsolamentoTests.cs:152` `Assert.ThrowsAsync<InvalidOperationException>`; `:158` nothing saved; `:167` `Assert.Equal(univag.Id, nova.InstituicaoId)` | PASS |
| C16 | 20 entidades com `instituicao_id` não nulo, FK e filtro | `ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro` Passed | `api.Tests/ArquiteturaTests.cs:46` set equals 20 tables; `:52` FK; `:53` `Assert.NotEmpty(e.GetDeclaredQueryFilters())` | PASS |
| C17 | `IgnoreQueryFilters` só no agendador e no comando | `ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando` Passed | `api.Tests/ArquiteturaTests.cs:76` `Assert.All(usos, p => Assert.Contains(p, permitidos))` | PASS |
| C18 | slug imutável | `InstituicaoComandoTests.Slug_nao_muda` Passed | `api.Tests/InstituicaoComandoTests.cs:178` `Assert.ThrowsAnyAsync<Exception>`; `:185` slug unchanged | PASS |
| C19 | compose com postgres:18 e mailpit; projetos api, api.Tests, web | `ArquiteturaTests.Layout_e_compose` Passed | `api.Tests/ArquiteturaTests.cs:84` `Assert.Matches(...postgres:18...)`; `:85` mailpit; `:88-90` solution entries | PASS |
| C20 | snake_case e `timestamptz` | `ArquiteturaTests.Tabelas_snake_case_e_datas_timestamptz` Passed | `api.Tests/ArquiteturaTests.cs:109` `Assert.Equal("timestamp with time zone", p.GetColumnType())`; `:114` snake columns | PASS |
| C21 | login 200 com campos e cookie HttpOnly, Secure, SameSite=Strict | `LoginTests.Login_valido_200_com_cookie` Passed | `api.Tests/LoginTests.cs:20` OK; `:26` slug; `:30-32` `Assert.Contains("samesite=strict", cookie...)` | PASS |
| C22 | cookie deslizante 8 h: 7h59 passa, 8h01 401 | `LoginTests.Cookie_expira_8h_deslizante` Passed | `api.Tests/LoginTests.cs:52` OK after 7h59; `:56` `Assert.Equal(HttpStatusCode.Unauthorized, ...)` after 8h01 | PASS |
| C23 | hash PBKDF2 V3 (`0x01`), sem a senha em texto | `SenhaTests.Hash_e_pbkdf2_v3` Passed | `api.Tests/SenhaTests.cs:24` `Assert.Equal(0x01, Convert.FromBase64String(hash)[0])`; `:25` `Assert.DoesNotContain(senha, hash)` | PASS |
| C24 | CPF 10, 12 dígitos ou DV errado: 400 "CPF inválido." sem verificar senha | `LoginTests.Cpf_invalido_400_sem_consultar_senha` Passed | `api.Tests/LoginTests.cs:72` `Assert.Equal("CPF inválido.", ...)`; `:73` `Assert.Equal(antes, f.Hasher.Verificacoes)` | PASS |
| C25 | três falhas, mesmo 401 | `LoginTests.Tres_falhas_mesmo_401` Passed | `api.Tests/LoginTests.cs:92-93` `Assert.Equal("CPF ou senha inválidos.", ...)` | PASS |
| C26 | conta desativada ou sem senha: 401 sem Set-Cookie | `LoginTests.Conta_desativada_ou_sem_senha_401_sem_cookie` Passed | `api.Tests/LoginTests.cs:110` `Assert.False(r.Headers.Contains("Set-Cookie"))` | PASS |
| C27 | 3 logins + 2 primeiros acessos passam; o 6º é 429 | `RateLimitTests.Login_e_primeiro_acesso_somam_5_por_minuto` Passed | `api.Tests/RateLimitTests.cs:27-28` `Assert.Equal(HttpStatusCode.TooManyRequests, ...)` | PASS |
| C28 | primeiro acesso 202 com texto fixo, com ou sem CPF | `PrimeiroAcessoTests.Resposta_202_igual_com_ou_sem_cpf` Passed | `api.Tests/PrimeiroAcessoTests.cs:39-40` Accepted + `Assert.Equal(Mensagem, ...)` | PASS |
| C29 | primeiro acesso com DV errado 400 | `PrimeiroAcessoTests.Cpf_invalido_400` Passed | `api.Tests/PrimeiroAcessoTests.cs:53-54` BadRequest + "CPF inválido." | PASS |
| C30 | e-mail "[Univag] Crie sua senha" com link; só SHA-256; vence em 60 min | `PrimeiroAcessoTests.Envia_link_e_guarda_so_o_hash` Passed | `api.Tests/PrimeiroAcessoTests.cs:69` subject; `:76` `Assert.Equal(Tokens.Hash(token), registro.Hash)`; `:78` `+60` | PASS |
| C31 | primeiro acesso não usa `email_saida` | `PrimeiroAcessoTests.Nao_usa_email_saida` Passed | `api.Tests/PrimeiroAcessoTests.cs:92` `Assert.Equal(0, ...EmailsSaida...CountAsync())` | PASS |
| C32 | SMTP fora: 202 e log com instituição | `PrimeiroAcessoTests.Smtp_fora_202_e_log` Passed | `api.Tests/PrimeiroAcessoTests.cs:105` Accepted; `:107` `Assert.Contains(... LogLevel.Error && InstituicaoId == i.Id)` | PASS |
| C33 | token válido, senha de 8 e de 128: 204, hash, token usado | `DefinirSenhaTests.Token_valido_204` Passed | `api.Tests/DefinirSenhaTests.cs:34` `VerifyHashedPassword == Success`; `:35` `Assert.NotNull(...UsadoEm)` | PASS |
| C34 | senha de 7 ou 129: 400, token sem uso | `DefinirSenhaTests.Senha_fora_de_8_a_128_400` Passed | `api.Tests/DefinirSenhaTests.cs:48-49` BadRequest + `Assert.Null(...UsadoEm)` | PASS |
| C35 | token usado, 61 min ou inexistente: 400 "Link inválido ou vencido." | `DefinirSenhaTests.Link_usado_vencido_ou_inexistente_400` Passed | `api.Tests/DefinirSenhaTests.cs:66` `Assert.Equal("Link inválido ou vencido.", ...)` | PASS |
| C36 | sem cookie, 401 nas 49 rotas privadas | `SessaoTests.Sem_cookie_401_em_toda_rota_privada` Passed | `api.Tests/SessaoTests.cs:34` `Assert.Equal(49, privadas.Count)`; `:39` Unauthorized per route | PASS |
| C37 | logout 204 e cookie vencido, com ou sem sessão | `SessaoTests.Logout_204_expira_cookie` Passed | `api.Tests/SessaoTests.cs:50` NoContent; `:53` `Assert.True(expira < DateTimeOffset.UtcNow)` | PASS |
| C38 | `me` 200 com cpfMascarado, papéis, instituição, matrículas | `SessaoTests.Me_200_com_matriculas` Passed | `api.Tests/SessaoTests.cs:74` `Assert.Equal("***.456.789-**", ...)`; `:80` matrículas | PASS |
| C39 | deveTrocarSenha: 403 fora de 4 rotas; SPA abre "Trocar senha" | `SessaoTests.Deve_trocar_senha_403_fora_de_4_rotas` Passed; vitest passed | `api.Tests/SessaoTests.cs:95` Forbidden per route; `web/src/acesso.test.tsx:38` heading "Trocar senha" | PASS |
| C40 | troca válida 204; sessão seguinte sem deveTrocarSenha | `SenhaTests.Troca_valida_204` Passed | `api.Tests/SenhaTests.cs:37` NoContent; `:40` `Assert.False(...deveTrocarSenha...)` | PASS |
| C41 | senha atual errada ou nova curta 400; senha antiga vale | `SenhaTests.Atual_errada_ou_nova_curta_400` Passed | `api.Tests/SenhaTests.cs:53-55` | PASS |
| C42 | tela inicial por papel; menu com os dois papéis | vitest "tela inicial por papel" passed | `web/src/acesso.test.tsx:55` heading per role; `:62-63` menu links Fila and Artigos | PASS |
| C43 | conta desativada: próxima requisição 401 | `SessaoTests.Conta_desativada_401_na_proxima_requisicao` Passed | `api.Tests/SessaoTests.cs:110` Unauthorized. Deactivation is a direct DB update at `:108`; that the admin route sets `Ativo=false` is shown at `api.Tests/AdminTests.cs:240` | PASS |
| C44 | nenhum CPF de 11 dígitos fora do admin; `me` mascarado | `CpfTests.Respostas_fora_do_admin_mascaram_cpf` Passed | `api.Tests/CpfTests.cs:40` `Assert.DoesNotMatch(new Regex(@"(?<!\d)\d{11}(?!\d)"), x)`; `:39` masked present | PASS |
| C45 | aviso de IA externa sem e com conversa | vitest passed | `web/src/assistente.test.tsx:30` and `:33` `getByText(AvisoExterno)` | PASS |
| C46 | "Falar com atendente" antes e durante a conversa | vitest passed | `web/src/assistente.test.tsx:39` and `:42` `expect(falar()).toBeVisible()` | PASS |
| C47 | primeira mensagem de 1 e 1000: 201, conversa gravada | `AssistenteTests.Primeira_mensagem_201` Passed | `api.Tests/AssistenteTests.cs:28` Created; `:35` `Assert.Equal(mensagem, ...First().Texto)` | PASS |
| C48 | mensagem seguinte 200, gravada | `AssistenteTests.Mensagem_seguinte_200` Passed | `api.Tests/AssistenteTests.cs:48` OK; `:54` `Assert.Equal("segunda mensagem", textos[2])` | PASS |
| C49 | vazia, espaços ou 1001: 400 nas duas rotas, nada gravado | `AssistenteTests.Mensagem_vazia_espacos_ou_1001_400` Passed | `api.Tests/AssistenteTests.cs:68-69` BadRequest; `:71-72` counts unchanged | PASS |
| C50 | sem papel aluno ou só matrícula INATIVA: 403 | `AssistenteTests.Sem_papel_aluno_ou_matricula_ativa_403` Passed | `api.Tests/AssistenteTests.cs:83` `Assert.Equal(HttpStatusCode.Forbidden, ...)` | PASS |
| C51 | máscara de 4 números e e-mail; 7 dígitos ficam | `LlmRequisicaoTests.Mascara_numeros_e_emails` Passed | `api.Tests/LlmRequisicaoTests.cs:23` exact masked string incl. `turma 1234567` | PASS |
| C52 | corpo sem dados do aluno, só ATIVO e categorias ativas, últimas 10 de 12 | `LlmRequisicaoTests.Corpo_so_traz_o_permitido` Passed | `api.Tests/LlmRequisicaoTests.cs:55` `Assert.DoesNotContain(proibido, corpo)`; `:60` messages 03..12 | PASS |
| C53 | URL, modelo, json_object, temperature 0, 800, sem thinking, ordem | `LlmRequisicaoTests.Parametros_e_ordem_do_prompt` Passed | `api.Tests/LlmRequisicaoTests.cs:72-78`; `:84-87` order Artigos, Categorias, conversa | PASS |
| C54 | resposta conferida: tipo e texto; SPA mostra aviso e "Isso resolveu?" | `AssistenteTests.Resposta_conferida_devolve_tipo_e_texto` Passed; vitest passed | `api.Tests/AssistenteTests.cs:95-96`; `web/src/assistente.test.tsx:49-52` | PASS |
| C55 | maiúsculas e espaços ignorados | `ConferenciaTests.Normaliza_maiusculas_e_espacos` Passed | `api.Tests/ConferenciaTests.cs:10` `Assert.True(Conferencia.TrechoConfere("PRAZO   de  pagamento", ...))` | PASS |
| C56 | acento e pontuação contam | `ConferenciaTests.Acento_e_pontuacao_contam` Passed | `api.Tests/ConferenciaTests.cs:18` and `:22` `Assert.False(Conferencia.TrechoConfere(...))` | PASS |
| C57 | 20 e 400 conferem; 19 e 401 não | `ConferenciaTests.Trecho_de_20_a_400` Passed | `api.Tests/ConferenciaTests.cs:33-36` | PASS |
| C58 | trecho ausente ou artigo sem trecho: sem_base e log `trecho_invalido` | `AssistenteTests.Trecho_invalido_vira_sem_base_e_log` Passed | `api.Tests/AssistenteTests.cs:112` sem_base; `:114` `Assert.True(Logou(id, "trecho_invalido"))` | PASS |
| C59 | ids vazios, inexistente, de outra instituição, RASCUNHO, ARQUIVADO: sem_base | `AssistenteTests.Artigo_invalido_vira_sem_base` Passed | `api.Tests/AssistenteTests.cs:131-132` (5 cases at `:127`) | PASS |
| C60 | link alheio: sem_base + `link_invalido`; http e https dos artigos passam | `AssistenteTests.Link_fora_dos_artigos_vira_sem_base_e_log` Passed | `api.Tests/AssistenteTests.cs:143-144`; `:150` `Assert.Equal("resposta", ...)` | PASS |
| C61 | toda resposta gravada tem trecho por artigo citado | `AssistenteTests.Nenhuma_resposta_exibida_sem_trecho_por_artigo` Passed | `api.Tests/AssistenteTests.cs:178` 3 respostas; `:182-183` every excerpt `TrechoConfere` | PASS |
| C62 | aluno não recebe dado de artigo em 5 respostas | `SigiloTests.Aluno_nao_recebe_dado_de_artigo` Passed | `api.Tests/SigiloTests.cs:36` `Assert.DoesNotContain(proibido, corpo, ...)` | PASS |
| C63 | aluno pede versão de artigo: 404 | `SigiloTests.Aluno_pede_versao_de_artigo_404` Passed | `api.Tests/SigiloTests.cs:48` NotFound | PASS |
| C64 | pergunta de 200 com "?": tipo pergunta; SPA sem "Isso resolveu?" | `AssistenteTests.Pergunta_devolve_tipo_pergunta` Passed; vitest passed | `api.Tests/AssistenteTests.cs:197`; `web/src/assistente.test.tsx:59` | PASS |
| C65 | 3ª pergunta, 201 caracteres, sem "?": sem_base | `AssistenteTests.Pergunta_fora_da_regra_vira_sem_base` Passed | `api.Tests/AssistenteTests.cs:211` and `:217` `Assert.Equal("sem_base", ...)` | PASS |
| C66 | sem_base: texto fixo; botão em destaque | `AssistenteTests.Sem_base_texto_fixo` Passed; vitest passed | `api.Tests/AssistenteTests.cs:231` `Assert.Equal(SemBase, ...)`; `web/src/assistente.test.tsx:69` `toHaveClass('btn-primary')` | PASS |
| C67 | transferir: texto fixo, sem chamado; SPA pede confirmação | `AssistenteTests.Transferir_nao_cria_chamado` Passed; vitest passed | `api.Tests/AssistenteTests.cs:243-244`; `web/src/assistente.test.tsx:78-79` | PASS |
| C68 | 5 falhas do provedor: sem_base + motivo no log | `AssistenteTests.Falha_do_provedor_vira_sem_base_e_log` Passed | `api.Tests/AssistenteTests.cs:268-270` `Assert.True(Logou(id, motivo), motivo)` | PASS |
| C69 | grava texto, tipos, trechos, versões, modelo, data | `AssistenteTests.Grava_o_que_foi_exibido` Passed | `api.Tests/AssistenteTests.cs:303-310`; `:319` update throws | PASS |
| C70 | log da chamada com métricas e sem o texto | `AssistenteTests.Log_da_chamada_sem_texto` Passed | `api.Tests/AssistenteTests.cs:333-340`; `:341` `Assert.DoesNotContain(... segredo ...)` | PASS |
| C71 | Sim: 200 RESOLVIDA_AUTOATENDIMENTO, sem chamado | `ConversaTests.Sim_resolve_sem_chamado` Passed | `api.Tests/ConversaTests.cs:29-31` | PASS |
| C72 | Não: 200, sem desfecho; SPA "Quer explicar melhor..." | `ConversaTests.Nao_mantem_aberta` Passed; vitest passed | `api.Tests/ConversaTests.cs:42` `Assert.Null(...Desfecho)`; `web/src/assistente.test.tsx:89-90` | PASS |
| C73 | encerrar 200 ENCERRADA_PELO_ALUNO | `ConversaTests.Encerrar_200` Passed | `api.Tests/ConversaTests.cs:54-55` | PASS |
| C74 | 11ª mensagem 409; SPA só dois botões | `ConversaTests.Decima_primeira_mensagem_409` Passed; vitest passed | `api.Tests/ConversaTests.cs:67` Conflict; `web/src/assistente.test.tsx:110` `toEqual(['Falar com atendente', 'Encerrar'])` | PASS |
| C75 | 4 ações em conversa com desfecho: 409, conversa igual | `ConversaTests.Conversa_com_desfecho_409` Passed | `api.Tests/ConversaTests.cs:86` Conflict for all; `:89-91` unchanged | PASS |
| C76 | 5 rotas de conversa de outro aluno: 404 | `ConversaTests.Conversa_de_outro_aluno_404` Passed | `api.Tests/ConversaTests.cs:109` `Assert.All(respostas, r => Assert.Equal(HttpStatusCode.NotFound, ...))` | PASS |
| C77 | GET conversa: ordem, textos, desfecho, chamadoNumero | `ConversaTests.Get_conversa_200_com_mensagens_e_chamado` Passed | `api.Tests/ConversaTests.cs:129-132`; `:138` `Assert.Equal("ONE-1", ...chamadoNumero)` | PASS |
| C78 | avaliação sem `resolveu` 400 | `ConversaTests.Avaliacao_sem_resolveu_400` Passed | `api.Tests/ConversaTests.cs:151` BadRequest | PASS |
| C79 | edição não muda o exibido; versão citada e `versaoAtivaAtualId`; aviso na tela | `VersaoCitadaTests.Edicao_nao_muda_o_exibido_e_avisa_a_equipe` Passed; vitest passed | `api.Tests/VersaoCitadaTests.cs:31`; `:40` `Assert.Equal(v2.Id, ...versaoAtivaAtualId)`; `web/src/chamado.test.tsx:178` | PASS |
| C80 | 11ª mensagem em 60 s: 429 | `RateLimitTests.Onze_mensagens_em_60s_429` Passed | `api.Tests/RateLimitTests.cs:44` TooManyRequests on `POST /api/conversas` | PASS |
| C81 | transferir 201 ABERTO sem responsável; conversa TRANSFERIDA | `TransferenciaTests.Transferir_201_aberto_sem_responsavel` Passed | `api.Tests/TransferenciaTests.cs:20-28` | PASS |
| C82 | atendimento direto 1 e 2000: 201, "Não classificado", 0 chamadas à IA | `TransferenciaTests.Atendimento_direto_sem_chamar_ia` Passed | `api.Tests/TransferenciaTests.cs:47`; `:52` `Assert.Equal(chamadasAntes, f.Llm.Corpos.Count)` | PASS |
| C83 | descrição vazia ou 2001: 400 sem gravar | `TransferenciaTests.Atendimento_direto_descricao_invalida_400` Passed | `api.Tests/TransferenciaTests.cs:61`; `:63-64` | PASS |
| C84 | atendimento direto sem papel aluno: 403 | `TransferenciaTests.Atendimento_direto_sem_papel_aluno_403` Passed | `api.Tests/TransferenciaTests.cs:75` | PASS |
| C85 | atendimento direto conta no limite do aluno | `RateLimitTests.Atendimento_direto_conta_no_limite_do_aluno` Passed | `api.Tests/RateLimitTests.cs:56-57` TooManyRequests | PASS |
| C86 | ONE-1, ONE-2 na univag; ONE-1 na demo | `NumeracaoTests.Numero_por_instituicao` Passed | `api.Tests/TransferenciaTests.cs:158-160` | PASS |
| C87 | 20 paralelas: ONE-1 a ONE-20 | `NumeracaoTests.Vinte_transferencias_paralelas_numeros_distintos` Passed | `api.Tests/TransferenciaTests.cs:170` | PASS |
| C88 | chamado guarda contexto incl. o **último** resumo não vazio cortado em 500 | `TransferenciaTests.Chamado_guarda_contexto` Passed | `api.Tests/TransferenciaTests.cs:100` `Assert.Equal(new string('r', 500), chamado.Resumo)`; but only the first assistant message has a non-empty resumo (`:84`, `:86`), so first == last and fault F5 (first instead of last) survives | FAIL - surviving mutant F5 |
| C89 | categoria da **última** sugestão válida (IA), do **último** artigo (ARTIGO), senão PADRAO | `CategoriaOrigemTests.Origem_da_categoria` Passed | `api.Tests/TransferenciaTests.cs:203-205`; each case has a single assistant message, so "última" is never discriminated and fault F5 survives the whole suite | FAIL - surviving mutant F5 |
| C90 | setor fixo, coordenação, triagem (3 motivos) | `RoteamentoTests.Setor_do_chamado` Passed | `api.Tests/TransferenciaTests.cs:233-237` | PASS |
| C91 | duas matrículas sem escolha, inativa ou alheia: 400; SPA pede matrícula | `TransferenciaTests.Duas_matriculas_sem_escolha_400` Passed; vitest passed | `api.Tests/TransferenciaTests.cs:123` BadRequest; `web/src/chamado.test.tsx:84` options | PASS |
| C92 | dupla transferência: um 201 e um 409, um chamado | `TransferenciaTests.Transferencia_dupla_um_chamado_e_409` Passed | `api.Tests/TransferenciaTests.cs:142-143` | PASS |
| C93 | "Transferido para Financeiro. Protocolo ONE-1." e respostas públicas | vitest passed | `web/src/chamado.test.tsx:112-114` | PASS |
| C94 | GET do chamado aos 15 s e 30 s, não aos 14,9 s | vitest passed | `web/src/chamado.test.tsx:131`, `:133`, `:135` | PASS |
| C95 | fila: não fechados do setor, mais antigo primeiro, campos | `FilaTests.Fila_do_setor_mais_antigo_primeiro` Passed | `api.Tests/ChamadoFluxoTests.cs:255-259` | PASS |
| C96 | minhas: só do aluno, mais recente primeiro | `FilaTests.Minhas_solicitacoes_so_do_aluno_mais_recente_primeiro` Passed | `api.Tests/ChamadoFluxoTests.cs:276-278` | PASS |
| C97 | atendente de outro setor: 404 no GET e nas 9 ações | `VisibilidadeTests.Atendente_de_outro_setor_404` Passed | `api.Tests/VisibilidadeTests.cs:40` NotFound per route; `:43-44` unchanged. `duplicado` is not in the list (`:14-26`); see Coverage | PASS |
| C98 | detalhe do atendente com contexto e fontes; SPA "Resumo gerado por IA" | `VisibilidadeTests.Detalhe_do_atendente_traz_contexto_e_fontes` Passed; vitest passed | `api.Tests/VisibilidadeTests.cs:71-83`; `web/src/chamado.test.tsx:142` | PASS |
| C99 | detalhe do aluno sem resumo | `VisibilidadeTests.Detalhe_do_aluno_sem_resumo` Passed | `api.Tests/VisibilidadeTests.cs:99` `Assert.Equal(JsonValueKind.Null, ...resumo)` | PASS |
| C100 | aluno nunca recebe nota, resumo ou fontes | `VisibilidadeTests.Aluno_nao_recebe_nota_resumo_nem_fontes` Passed | `api.Tests/VisibilidadeTests.cs:120` `Assert.DoesNotContain(proibido, corpo)` | PASS |
| C101 | assumir ABERTO: EM_ATENDIMENTO, responsável | `ChamadoFluxoTests.Assumir_aberto` Passed | `api.Tests/ChamadoFluxoTests.cs:21-22` | PASS |
| C102 | primeira resposta pública assume | `ChamadoFluxoTests.Primeira_resposta_publica_assume` Passed | `api.Tests/ChamadoFluxoTests.cs:33-36` | PASS |
| C103 | assumir de outro troca e grava evento | `ChamadoFluxoTests.Assumir_de_outro_troca_e_registra` Passed | `api.Tests/ChamadoFluxoTests.cs:50` `(evento.De, evento.Para, evento.AtorId)` | PASS |
| C104 | `aguardaAluno` leva a AGUARDANDO_ALUNO | `ChamadoFluxoTests.Aguardando_aluno` Passed | `api.Tests/ChamadoFluxoTests.cs:62` | PASS |
| C105 | resposta do aluno volta a EM_ATENDIMENTO | `ChamadoFluxoTests.Resposta_do_aluno_volta_em_atendimento` Passed | `api.Tests/ChamadoFluxoTests.cs:74` | PASS |
| C106 | resolver com 1 e 4000: RESOLVIDO, texto público | `ChamadoFluxoTests.Resolver_com_texto` Passed | `api.Tests/ChamadoFluxoTests.cs:88` and `:90` | PASS |
| C107 | resolver sem texto ou 4001: 400 | `ChamadoFluxoTests.Resolver_sem_texto_ou_4001_400` Passed | `api.Tests/ChamadoFluxoTests.cs:101`; `:103` estado igual | PASS |
| C108 | confirmar: FECHADO CONFIRMADO | `ChamadoFluxoTests.Confirmar_fecha` Passed | `api.Tests/ChamadoFluxoTests.cs:116` | PASS |
| C109 | rejeitar a 7 dias exatos: EM_ATENDIMENTO, +1 reabertura | `ChamadoFluxoTests.Rejeitar_ate_7_dias` Passed | `api.Tests/ChamadoFluxoTests.cs:130` | PASS |
| C110 | rejeitar sem motivo 400 | `ChamadoFluxoTests.Rejeitar_sem_motivo_400` Passed | `api.Tests/ChamadoFluxoTests.cs:140`; `:142` | PASS |
| C111 | rejeitar a 7 dias e 1 min: 409 | `ChamadoFluxoTests.Rejeitar_depois_de_7_dias_409` Passed | `api.Tests/ChamadoFluxoTests.cs:154`; `:156` | PASS |
| C112 | mensagem do aluno em RESOLVIDO rejeita; depois de 7 dias 409 | `ChamadoFluxoTests.Mensagem_do_aluno_em_resolvido_rejeita` Passed | `api.Tests/ChamadoFluxoTests.cs:169`, `:171`, `:175` | PASS |
| C113 | rejeição sem responsável ativo: ABERTO sem responsável | `ChamadoFluxoTests.Rejeicao_sem_responsavel_ativo_volta_aberto` Passed | `api.Tests/ChamadoFluxoTests.cs:190` | PASS |
| C114 | cancelar nos 3 estados: CANCELADO com justificativa | `ChamadoFluxoTests.Cancelar_nos_3_estados` Passed | `api.Tests/ChamadoFluxoTests.cs:205-206` | PASS |
| C115 | 9 ações x 5 estados: 2xx ou 409 sem mudança | `TransicoesTests.Matriz_acao_estado` Passed | `api.Tests/VisibilidadeTests.cs:179` 2xx; `:182-183` 409 + `Assert.Equal(antes, await Fotografia(b, numero))` | PASS |
| C116 | papel errado: 403 sem mudança | `TransicoesTests.Matriz_acao_papel` Passed | `api.Tests/VisibilidadeTests.cs:204-205` | PASS |
| C117 | mensagem ou nota em FECHADO: 409 | `ChamadoFluxoTests.Mensagem_em_fechado_409` Passed | `api.Tests/ChamadoFluxoTests.cs:219-221` | PASS |
| C118 | mensagem sem texto 400 | `ChamadoFluxoTests.Mensagem_sem_texto_400` Passed | `api.Tests/ChamadoFluxoTests.cs:230-232` | PASS |
| C119 | concorrência: primeira grava, segunda 409 | `ConcorrenciaTests.Segunda_alteracao_simultanea_409` Passed | `api.Tests/VisibilidadeTests.cs:227` `ThrowsAsync<DbUpdateConcurrencyException>`; `:237` OK + Conflict | PASS |
| C120 | 8 tipos de evento com ator, UTC; ordem e fuso na tela | `EventosTests.Cada_acao_grava_evento` Passed; vitest passed | `api.Tests/VisibilidadeTests.cs:261`, `:269-272`, `:274`, `:278`; `web/src/chamado.test.tsx:202` | PASS |
| C121 | nenhuma rota PUT/PATCH/DELETE sobre histórico | `ImutabilidadeTests.Sem_rota_de_edicao` Passed | `api.Tests/VisibilidadeTests.cs:292` `Assert.DoesNotContain(rotas, ...)` | PASS |
| C122 | trigger recusa UPDATE e DELETE nas 5 tabelas | `ImutabilidadeTests.Trigger_recusa_update_e_delete` Passed | `api.Tests/VisibilidadeTests.cs:320` `ThrowsAsync<PostgresException>`; `:321` count equal | PASS |
| C123 | encaminhar: nota, ABERTO no destino, +1 | `EncaminharTests.Encaminhar_abre_no_destino` Passed | `api.Tests/VisibilidadeTests.cs:338` and `:340` | PASS |
| C124 | mesmo setor ou sem motivo: 400 | `EncaminharTests.Mesmo_setor_ou_sem_motivo_400` Passed | `api.Tests/VisibilidadeTests.cs:350-354` | PASS |
| C125 | setor anterior perde acesso: 404 | `EncaminharTests.Setor_anterior_perde_acesso_404` Passed | `api.Tests/VisibilidadeTests.cs:365` | PASS |
| C126 | reclassificar mantém original, origem e setor | `EncaminharTests.Reclassificar_mantem_original` Passed | `api.Tests/VisibilidadeTests.cs:382` | PASS |
| C127 | categoria inativa ou inexistente: 400 | `EncaminharTests.Categoria_inativa_ou_inexistente_400` Passed | `api.Tests/VisibilidadeTests.cs:393` | PASS |
| C128 | criar artigo: 201 RASCUNHO versão 1 | `ArtigoAdminTests.Criar_rascunho_versao_1` Passed | `api.Tests/ArtigoAdminTests.cs:32-35` | PASS |
| C129 | campo obrigatório faltando: 400 | `ArtigoAdminTests.Campo_obrigatorio_faltando_400` Passed | `api.Tests/ArtigoAdminTests.cs:52`; `:54` | PASS |
| C130 | link `ftp://x` ou `www.x.com`: 400 | `ArtigoAdminTests.Link_sem_http_400` Passed | `api.Tests/ArtigoAdminTests.cs:63` | PASS |
| C131 | PUT: versão 2, versão 1 legível | `ArtigoAdminTests.Editar_cria_versao_seguinte` Passed | `api.Tests/ArtigoAdminTests.cs:76`, `:78`, `:80` | PASS |
| C132 | número de versão único no banco | `ArtigoAdminTests.Numero_de_versao_unico` Passed | `api.Tests/ArtigoAdminTests.cs:89` `Assert.ThrowsAsync<DbUpdateException>` | PASS |
| C133 | ativar entra na próxima chamada | `ArtigoAdminTests.Ativar_entra_na_proxima_mensagem` Passed | `api.Tests/ArtigoAdminTests.cs:105`, `:107`, `:110` | PASS |
| C134 | arquivar sai da base e mantém conversas | `ArtigoAdminTests.Arquivar_sai_da_base_e_mantem_conversas` Passed | `api.Tests/ArtigoAdminTests.cs:127`; `:129` | PASS |
| C135 | ativar ATIVO ou arquivar ARQUIVADO: 409 | `ArtigoAdminTests.Ativar_ativo_ou_arquivar_arquivado_409` Passed | `api.Tests/ArtigoAdminTests.cs:139`, `:141` | PASS |
| C136 | artigo inexistente: 404 | `ArtigoAdminTests.Artigo_inexistente_404` Passed | `api.Tests/ArtigoAdminTests.cs:149-151` | PASS |
| C137 | sem papel admin: 403 nas 25 rotas | `AdminTests.Sem_papel_admin_403` Passed | `api.Tests/AdminTests.cs:42` `Assert.Equal(25, rotas.Count)`; `:49` Forbidden | PASS |
| C138 | listar artigos 200 com estado e versão | `ArtigoAdminTests.Listar_200` Passed | `api.Tests/ArtigoAdminTests.cs:164`, `:166` | PASS |
| C139 | CSV válido cria e atualiza | `ImportacaoTests.Csv_valido_cria_e_atualiza` Passed | `api.Tests/AdminTests.cs:79`, `:83`, `:86`, `:88` | PASS |
| C140 | 6 motivos de recusa, nada entra | `ImportacaoTests.Linha_invalida_nada_entra` Passed | `api.Tests/AdminTests.cs:116-119`; `:121-123` | PASS |
| C141 | matrícula INATIVA fora das novas transferências | `ImportacaoTests.Matricula_inativa_sai_das_novas_transferencias` Passed | `api.Tests/AdminTests.cs:145-146` | PASS |
| C142 | criar usuário com e sem senha temporária | `UsuarioAdminTests.Criar_com_e_sem_senha_temporaria` Passed | `api.Tests/AdminTests.cs:174-175`; `:178` | PASS |
| C143 | sem papel ou atendente sem setor: 400 | `UsuarioAdminTests.Sem_papel_ou_setor_400` Passed | `api.Tests/AdminTests.cs:193-195` | PASS |
| C144 | PUT com senha temporária: deveTrocarSenha | `UsuarioAdminTests.Senha_temporaria_obriga_troca` Passed | `api.Tests/AdminTests.cs:223-224` | PASS |
| C145 | desativar mantém histórico | `UsuarioAdminTests.Desativar_mantem_historico` Passed | `api.Tests/AdminTests.cs:239-242` | PASS |
| C146 | desativar atendente devolve chamados com evento do admin | `UsuarioAdminTests.Desativar_atendente_devolve_chamados` Passed | `api.Tests/AdminTests.cs:262-263` | PASS |
| C147 | PUT e desativar inexistente: 404 | `UsuarioAdminTests.Usuario_inexistente_404` Passed | `api.Tests/AdminTests.cs:274-275` | PASS |
| C148 | zero ou duas triagens: 400 sem gravar | `CadastroTests.Triagem_zero_ou_duas_400` Passed | `api.Tests/AdminTests.cs:288-292` | PASS |
| C149 | índice `ux_setor_triagem` | `CadastroTests.Indice_recusa_segundo_setor_de_triagem` Passed | `api.Tests/AdminTests.cs:305` `Assert.Equal("ux_setor_triagem", e.ConstraintName)` | PASS |
| C150 | regra única por categoria | `CadastroTests.Regra_unica_por_categoria` Passed | `api.Tests/AdminTests.cs:321` | PASS |
| C151 | setor fixo sem setor: 400 | `CadastroTests.Regra_setor_fixo_sem_setor_400` Passed | `api.Tests/AdminTests.cs:332-333` | PASS |
| C152 | curso associado à coordenação roteia | `CadastroTests.Curso_com_coordenacao_roteia` Passed | `api.Tests/AdminTests.cs:352` | PASS |
| C153 | renomear "Não classificado": 400 | `CadastroTests.Renomear_nao_classificado_400` Passed | `api.Tests/AdminTests.cs:363-364` | PASS |
| C154 | CRUD dos 5 cadastros: 201, 200, 200, 404 | `CadastroTests.Crud_dos_cadastros` Passed | `api.Tests/AdminTests.cs:384`, `:388`, `:392`, `:395` | PASS |
| C155 | nome repetido: 409 | `CadastroTests.Nome_repetido_409` Passed | `api.Tests/AdminTests.cs:413` | PASS |
| C156 | conversa 30 min abandona; 29 não | `AgendadorTests.Conversa_parada_30_min_abandona` Passed | `api.Tests/AgendadorTests.cs:33-34` | PASS |
| C157 | RESOLVIDO há 7 dias fecha automaticamente, ator vazio | `AgendadorTests.Resolvido_7_dias_fecha_automaticamente` Passed | `api.Tests/AgendadorTests.cs:49`, `:51`, `:52` | PASS |
| C158 | ação do aluno entre leitura e gravação preserva o item | `AgendadorTests.Acao_do_aluno_antes_preserva_item` Passed | `api.Tests/AgendadorTests.cs:74`, `:76` | PASS |
| C159 | falha num item: log com instituição, segue os outros | `AgendadorTests.Falha_num_item_segue_os_outros` Passed | `api.Tests/AgendadorTests.cs:101-103` | PASS |
| C160 | resposta pública gera e-mail com link | `EmailTests.Resposta_publica_gera_email` Passed | `api.Tests/EmailAnexoTests.cs:26-27` | PASS |
| C161 | resolução gera e-mail | `EmailTests.Resolucao_gera_email` Passed | `api.Tests/EmailAnexoTests.cs:39-42` | PASS |
| C162 | nota interna: 0 e-mails | `EmailTests.Nota_interna_nao_gera_email` Passed | `api.Tests/EmailAnexoTests.cs:53` `Assert.Empty(await Emails(b))` | PASS |
| C163 | e-mail na transação da ação; agendador envia | `EmailTests.Email_na_transacao_da_acao` Passed | `api.Tests/EmailAnexoTests.cs:73`, `:77`, `:79` | PASS |
| C164 | 5 tentativas 2^n e desistência | named proof `FullyQualifiedName~EmailTests.Retry_2_a_n_e_desiste_em_5` re-run alone: "Nenhum teste corresponde ao filtro", exit 0 (zero tests ran) | The test lives in class `EmailFalhaTests` (`api.Tests/EmailAnexoTests.cs:85`). Its assertions at `:105`, `:109` and `:113` passed in the full run, but the check's own proof runs nothing and is green | FAIL - proof matches 0 tests |
| C165 | PDF, JPG, PNG (10 MB): 201, listados | `AnexoTests.Pdf_jpg_png_ate_10mb` Passed | `api.Tests/EmailAnexoTests.cs:131`, `:133` | PASS |
| C166 | download com os mesmos bytes e Content-Type | `AnexoTests.Download_devolve_os_mesmos_bytes` Passed | `api.Tests/EmailAnexoTests.cs:150-151`, `:154` | PASS |
| C167 | `.exe` renomeado: 415, nada gravado | `AnexoTests.Tipo_desconhecido_415` Passed | `api.Tests/EmailAnexoTests.cs:170` via `:162-164` | PASS |
| C168 | 10 MB + 1: 413 | `AnexoTests.Acima_de_10mb_413` Passed | `api.Tests/EmailAnexoTests.cs:174` via `:162-164` | PASS |
| C169 | anexo em nota: 400 | `AnexoTests.Anexo_em_nota_interna_400` Passed | `api.Tests/EmailAnexoTests.cs:178` via `:162-164` | PASS |
| C170 | anexo sem acesso: 404 | `AnexoTests.Sem_acesso_404` Passed | `api.Tests/EmailAnexoTests.cs:189-190` | PASS |
| C171 | 14 indicadores batem com a conta | `IndicadoresTests.Quatorze_indicadores_batem_com_a_conta` Passed | `api.Tests/IndicadoresTests.cs:105-119` | PASS |
| C172 | ABANDONADA não é autoatendimento | `IndicadoresTests.Abandonada_nao_e_autoatendimento` Passed | `api.Tests/IndicadoresTests.cs:131` | PASS |
| C173 | sem_base conta 1 vez | `IndicadoresTests.Sem_base_conta_pergunta_sem_artigo` Passed | `api.Tests/IndicadoresTests.cs:144` | PASS |
| C174 | desconta AGUARDANDO_ALUNO (10 h - 4 h = 6 h) | `IndicadoresTests.Desconta_aguardando_aluno` Passed | `api.Tests/IndicadoresTests.cs:156` `Assert.Equal(6, Num(..., "tempoResolucaoHoras"))` | PASS |
| C175 | atendente vê só seus setores; setorId alheio 403 | `IndicadoresTests.Atendente_ve_so_seus_setores` Passed | `api.Tests/IndicadoresTests.cs:179-182` | PASS |
| C176 | aluno: 403 | `IndicadoresTests.Aluno_403` Passed | `api.Tests/IndicadoresTests.cs:191` | PASS |
| C177 | período vazio; SPA "Sem dados no período" | `IndicadoresTests.Periodo_vazio_sem_dados` Passed; vitest passed | `api.Tests/IndicadoresTests.cs:201-205`; `web/src/equipe.test.tsx:24` | PASS |
| C178 | de > ate: 400 | `IndicadoresTests.De_depois_de_ate_400` Passed | `api.Tests/IndicadoresTests.cs:212` | PASS |
| C179 | sem dado pessoal | `IndicadoresTests.Sem_dado_pessoal` Passed | `api.Tests/IndicadoresTests.cs:227` | PASS |
| C180 | manifesto "One", ícones 192/512, SW sem `/api/` no cache | playwright "manifesto e service worker" passed against :8080 | `web/e2e/plataforma.spec.ts:5` `expect(manifesto.name).toBe('One')`; `:7`; `:28` `expect(urls.filter(...'/api/'...)).toEqual([])` | PASS |
| C181 | sem rolagem horizontal a 360 px nas 7 telas | playwright 10 tests passed against preview :4173 | `web/e2e/plataforma.spec.ts:117` `expect(largura).toBeLessThanOrEqual(360)` | PASS |
| C182 | versões do kit de interface | vitest passed | `web/src/acesso.test.tsx:92-96` | PASS |
| C183 | 8 status com title e detail em português | `ProblemDetailsTests.Detail_em_portugues` Passed | `api.Tests/ProblemDetailsTests.cs:54`, `:58`, `:62-65` | PASS |
| C184 | 4xx/5xx em problem+json com campos e `errors`; SPA Alert | `ProblemDetailsTests.Erros_sao_problem_json` Passed; vitest passed | `api.Tests/ProblemDetailsTests.cs:74`, `:77`, `:82`; `web/src/acesso.test.tsx:71-72` | PASS |
| C185 | Spinner e botão desabilitado enquanto pendente | vitest passed | `web/src/acesso.test.tsx:79-80`. Shown on the login button only; every screen uses the same `BotaoAcao` (`web/src/acao.tsx:27-33`) | PASS |
| C186 | cabeçalho mostra a instituição | vitest passed | `web/src/acesso.test.tsx:87` | PASS |
| C187 | SPA em `/univag/assistente`; `/api/inexistente` 404 problem+json | `SpaTests.Spa_em_slug_e_api_404_em_problem_json` Passed | `api.Tests/SpaTests.cs:19-24` | PASS |
| C188 | lembrete no 3º dia, uma vez, ator vazio | `ExtrasTests.Lembrete_no_3o_dia_uma_vez` Passed | `api.Tests/ExtrasTests.cs:32`, `:35`, `:36` | PASS |
| C189 | resolve no 7º dia aguardando; rejeição 200 | `ExtrasTests.Resolve_no_7o_dia_aguardando` Passed | `api.Tests/ExtrasTests.cs:52`, `:54`, `:57` | PASS |
| C190 | resposta pronta 200; chamado guarda o texto editado | `ExtrasTests.Resposta_pronta_guarda_texto_enviado` Passed | `api.Tests/ExtrasTests.cs:69`, `:74` | PASS |
| C191 | respostas prontas de outro setor: 404 | `ExtrasTests.Respostas_prontas_de_outro_setor_404` Passed | `api.Tests/ExtrasTests.cs:82` | PASS |
| C192 | duplicado fecha, guarda original, resposta pública, sai dos indicadores | `ExtrasTests.Duplicado_fecha_e_sai_dos_indicadores` Passed | `api.Tests/ExtrasTests.cs:102`, `:104`, `:105`. The exclusion is in the base query (`api/Rotas/IndicadorRotas.cs:47`), so one indicator stands for all | PASS |
| C193 | original inválido: 400, nada muda | `ExtrasTests.Original_invalido_400` Passed | `api.Tests/ExtrasTests.cs:117`, `:120` | PASS |
| C194 | duplicado por aluno 403; RESOLVIDO/FECHADO 409 | `ExtrasTests.Duplicado_por_aluno_403_e_em_fechado_409` Passed | `api.Tests/ExtrasTests.cs:130`, `:134-135` | PASS |
| C195 | validade do artigo; `visivelDe` > `visivelAte` 400 | `ExtrasTests.Validade_do_artigo` Passed | `api.Tests/ExtrasTests.cs:157-158`, `:160` | PASS |

**192/195 proven.** C88 and C89 fail on a surviving mutant. C164 fails because its proof runs zero tests.

## Coverage

Members come from the authority over each set: the plan `Surface` for routes and statuses, the plan criteria for enumerations inside ACs, the app's own `EndpointDataSource` for registered routes, `conteudo.md:256` (RF-31) for the 14 indicators, and the `Relations` diagram for entities. Each member below was matched to an assertion in the Checks table, not to the author's Coverage table.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Surface route statuses (34 rows) | plan Surface rows 201-235 | All members proven as the author mapped them, with the corrections in the next rows | - |
| `POST /api/conversas/{id}/mensagens` statuses (5) | plan Surface:209; limiter attached at `api/Rotas/ConversaRotas.cs:76` | 200 C48 · 400 C49 · 404 C76 · 409 C74 · 429: C80 asserts 429 only on `POST /api/conversas` (`api.Tests/RateLimitTests.cs:44`) and C85 only on `/atendimento-direto`. No test gets a 429 from `/mensagens` | 429 on `/mensagens` |
| `POST /api/chamados/{numero}/duplicado` statuses (5) | plan Surface:225 | 200 C192 · 400 C193 · 403 C194 · 404 C7 (`api.Tests/IsolamentoTests.cs:43`, not C97 as checks.md says) · 409 C194 | - |
| admin registries x statuses (5 resources) | plan Surface:234 crossed with what each handler emits (`api/Rotas/AdminRotas.cs`) | 201/200/404 all 5 via C154 · 403 all via C137 · 409 setores, categorias, cursos, respostas-prontas via C155 · 400 setores C148, categorias C153, regras C151 · 400 cursos (`AdminRotas.cs:59-60`): none · 400 respostas-prontas (`AdminRotas.cs:69-71`, the AC 147 1–4000 bound): none | 400 cursos; 400 respostas-prontas |
| private routes without cookie (49) | `EndpointDataSource` (`api.Tests/SessaoTests.cs:18-22`) and Surface count: 2 auth + 6 conversa + 1 direto + 11 chamado + 3 leitura + 25 admin + 1 indicadores = 49 | C36 asserts count 49 and 401 on each | - |
| `{id}`/`{numero}` routes from another tenant (27) | plan Surface: 5 conversa + 10 chamado + anexo + versão + 3 artigo admin + 2 usuário admin + 5 cadastro PUT = 27 | C7: 18 listed (`api.Tests/IsolamentoTests.cs:36-53`) + 9 distinct chamado routes (`api.Tests/VisibilidadeTests.cs:14-26`) = 27 | - |
| ids from another tenant in the body (4) | plan AC 7 + C8 | categoriaId, setorId, matriculaId (2 routes), numeroOriginal: `api.Tests/IsolamentoTests.cs:102-109` | - |
| `/api/admin/*` without admin role (25) | `EndpointDataSource` and Surface 5+4+1+15 | C137 count 25, both roles | - |
| ticket routes seen by another-sector attendant (10) | plan Surface: GET, mensagens, assumir, resolver, confirmar, rejeitar, cancelar, encaminhar, reclassificar, duplicado | C97 covers 9 (`api.Tests/VisibilidadeTests.cs:14-26` has no `duplicado`). It runs the same `Carregar` path (`api/Rotas/ChamadoRotas.cs:182`), but no assertion shows it | `duplicado` |
| action x state (45) | 9 actions x 5 states | C115, table at `api.Tests/VisibilidadeTests.cs:130-141` | - |
| action x role (18) | 9 actions x 2 roles | 9 wrong-role cells C116 + 9 right-role cells C115 | - |
| ticket state transitions (14) | plan S5, S6, S8, S9, S13 | all 14 asserted (C101, C102, C104, C105, C106, C108, C109, C113, C114, C157, C123, C146, C189, C192) | - |
| conversation outcomes (4) | plan Impact | C71, C81, C73, C156 | - |
| model `tipo` (5) and provider failures (5) | door 4, AC 45 | C54, C64, C66, C67, C68 (5 rows at `api.Tests/AssistenteTests.cs:251-263`) | - |
| demotions to `sem_base` (9) | AC 36, 37, 38, 42, 45 + door 19 | C58 (2), C59, C60, C65 (3), C68, C57 (length bound, own layer) | - |
| excerpt check (4) and mask (6) | door 19, AC 34 | C55, C56 (2), C57; C51 exact string with 6 formats | - |
| category origin (3) + "last" rule | AC 60, 61, 62 ("**última** sugestão", "**último** artigo") | IA, ARTIGO, PADRAO each asserted (C89). The "last of several" rule has no case: F5 survives the full suite | "last" suggestion / "last" cited article (AC 60, 61); "last" non-empty resumo (AC 59) |
| routing destination (5) | AC 63-65 | C90 five asserts | - |
| CSV refusal reasons (6) | AC 106 | C140, 7 rows (semester 0 and 13) | - |
| attachment types (4), event types (8), append-only cells (10) | door 13, AC 92, door 6 | C165 + C167; C120 + `:274` TRANSICAO; C122 5x2 | - |
| e-mail retries (5) | AC 126 | asserted by `EmailFalhaTests.Retry_2_a_n_e_desiste_em_5` (`api.Tests/EmailAnexoTests.cs:105`, passed in the full run). Only C164's proof command is broken (see Checks) | - |
| Quadro 12 indicators (14) | `D:\One\One\docs\requisitos\conteudo.md:256` (RF-31 list) | C171 asserts all 14 (`api.Tests/IndicadoresTests.cs:105-119`) | - |
| error statuses in Portuguese (8) | C183 claim | 400, 401, 403, 404, 409, 413, 415, 429 (+500) at `api.Tests/ProblemDetailsTests.cs:24-45` | - |
| screens at 360 px (7) | AC 140 / C181 | 10 screens at `web/e2e/plataforma.spec.ts:90-109` | - |
| entities with tenant + filter (20) | Relations erDiagram (19 entities + the `citacao_artigo` link table) | C16 asserts exact set | - |
| Relations constraints (11) | plan Relations:182-190 | all mapped as in checks.md and asserted | - |
| scheduler uses the item's institution: fuso, nome, remetente (3) | plan AC 10 | nome and remetente: C13 (`api.Tests/AgendadorTests.cs:131`). fuso: no assertion, and `api/Agendador.cs` never references a time zone | fuso (AC 10) |
| one-way doors (19) | plan Landing | each mapped check asserted | - |
| startup config: `DbContext` with tenant filter (3 places) | one registration at `api/Program.cs:16`; the command gets the same `app.Services` at `api/Program.cs:67`; the scheduler is a singleton from the same container (`api/Program.cs:21-22`) | HTTP C7 · scheduler C13 · command C1 (C1 calls `InstituicaoComando.Executar` with the test host's services; the `args is ["instituicao", ..]` dispatch at `api/Program.cs:12` is read, not run) | - |
| startup config: cookie, limiter, ProblemDetails, LLM `HttpClient` (2 assemblies) | `api/Program.cs:23-57`, one `Program` for both | container C180 (bundle hash equal to HEAD build) · test host C21 | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached by HTTP: state machine, routing, category origin, sem_base demotion, CSV import | `api/Rotas/ChamadoRotas.cs`, `api/Chamados/Transferencia.cs`, `api/Assistente/Assistente.cs`, `api/Rotas/AdminRotas.cs` (import) | boundary, table-driven, one case per decision row | no - state machine (C115, C116), routing (C90), demotion (C58-C68) and CSV (C140) are fully tabled at the boundary. Category origin is tabled per origin but not for the "last of several" rule of AC 60/61, and F5 survives |
| Decides, not HTTP-bound: excerpt check, mask, scheduler | `api/Assistente/Conferencia.cs`, `api/Agendador.cs` | own layer, with limits 19/20/400/401, 29/30 min, 7 d / 7 d+1 min | yes - C57 (19/20/400/401), C51, C156 (29/30), C157 (7 d vs 7 d−1 min), C109/C111 (7 d vs 7 d+1 min) |
| Input that does not decide | admin cadastros and usuários (`api/Rotas/AdminRotas.cs`), ticket message form | one boundary proof: accepted input, each refusal, each error | no - refusals with no proof: usuários invalid CPF (`AdminRotas.cs:171`), invalid e-mail (`:173`), missing sector (`:177`), temp password outside 8–128 (`:178`, named in AC 108); cursos name/sector (`:59-60`); respostas-prontas sector/title/text 1–4000 (`:69-71`, named in AC 147); regras invalid destination or default category (`:115-116`) |
| Instrumentation, pass-through | logging, `Problemas.cs`, `Email.cs` | none of its own | yes - covered through C32, C58, C60, C70, C159, C164 (assertion exists), C183, C184 |

## Swept

The `Swept` rows in checks.md list check ids per sweep dimension and cite no existing-code constraints, so there is nothing of the "existing" kind to re-read against the code. Every cited id was verified above. Of those, only C164 (failure modes: dependency failure, observability) does not hold, because its proof runs nothing.

## Faults injected

Isolated in `git worktree add --detach <scratchpad>/wt HEAD`. One mutation at a time, narrowest proof run in the worktree, file restored after each run, worktree removed with `git worktree remove --force`. Real-tree `git status --porcelain` before and after: `?? .idea/` both times (identical).

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 excerpt upper bound `<= 400` -> `<= 401` | `api/Assistente/Conferencia.cs:13` | yes - `ConferenciaTests.Trecho_de_20_a_400` failed (1/1) |
| F2 SaveChanges silently re-stamps a foreign `InstituicaoId` instead of throwing | `api/Dados/OneDb.cs:160` | yes - `IsolamentoTests.SaveChanges_recusa_outra_instituicao` failed (1/1) |
| F3 `confirmar` allowed in all non-closed states (`[Resolvido]` -> `NaoFechados`) | `api/Rotas/ChamadoRotas.cs:32` | yes - `TransicoesTests.Matriz_acao_estado` failed (1/1) |
| F4 waiting-time discount removed (`aguardando += TimeSpan.Zero`) | `api/Rotas/IndicadorRotas.cs:75` | yes - `IndicadoresTests.Desconta_aguardando_aluno` failed (1/1) |
| F5 "last" assistant message -> "first" (`OrderByDescending(m => m.Id)` -> `OrderBy`), used for the AI suggestion, the cited article and the summary | `api/Chamados/Transferencia.cs:30` | no - survived `CategoriaOrigemTests.Origem_da_categoria` and `TransferenciaTests.Chamado_guarda_contexto` (2/2 passed), and the full suite (190/190 passed) |

## Gate

`dotnet test api.Tests` (TRX) - 190 passed, 0 failed · `vitest run` - 32 passed, 0 failed · `playwright -g "manifesto e service worker"` (:8080) - 1 passed · `playwright -g "sem rolagem horizontal"` (preview :4173) - 10 passed

## Notes (not failing on their own)

- C13: the subject assertion (`api.Tests/AgendadorTests.cs:132`) reads back the subject the test seeded at `:120`. Only the sender name at `:131` is computed by the code under test.
- C43 deactivates through a direct DB update. The admin route's effect (`Ativo=false`) is shown separately by C145 (`api.Tests/AdminTests.cs:240`).
- C97 meets its own claim (GET + 9 actions). The checks.md Coverage row "duplicado 404 C97" is wrong; that status is proven by C7.
- C180: the container image (built 14:14Z) predates the last code commit (14:24Z). The served web bundle is byte-identical by hash to a fresh HEAD build. The API binary inside the image was not independently compared.
- Plan `Observable` decisions with no check, outside the 195: the Assistente "digitando" indicator (`web/src/telas/Assistente.tsx:124`), and the confirmation modals for desativar usuário and arquivar artigo.
