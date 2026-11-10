# Entrar no One pelo Moodle da Univag (LTI 1.3) - checks

Profile: standard
Plan: `.specs/features/integracao-moodle/plan.md`

29 critérios em 3 slices · 5 portas de mão única · 2 perguntas abertas, 1 que bloqueia a entrada em produção (LTI liberado no Moodle da Univag)

**Como as provas rodam.** Na raiz `D:\one-system`. A API usa Postgres, MinIO e Mailpit reais do compose (`docker compose up -d postgres mailpit minio`); o Moodle é um falso em memória (`Infra/MoodleFalso.cs`) que serve o JWKS e assina `id_token` com uma chave RSA de teste. Um filtro que não seleciona teste nenhum sai com 0 (L-002): o construtor confere no relatório quantos testes rodaram.

| Camada | Ferramenta | Comando base |
| --- | --- | --- |
| API | xUnit v3 + `WebApplicationFactory<Program>` (`OneFactory`, `f.Moodle`, `f.Relogio`) | `dotnet test One.Api.Tests --filter "FullyQualifiedName~<Classe>.<Método>"` |
| web | Vitest + Testing Library | `npm --prefix web test -- --run <arquivo> -t "<nome>"` |
| barreiras | `dotnet build One.slnx` (CA1502); `ArquiteturaTests` | ver C34 a C37 |

## Checks

### S1 - O aluno entra no One pelo Moodle (P1) · API · ~16 arquivos · ~90k

**C1** - [x] `GET` e `POST /api/moodle/{slug}/login` com `iss`, `client_id`, `login_hint`, `lti_message_hint` e `target_link_uri` da plataforma ativa respondem `302` ao `authUrl` com `scope=openid`, `response_type=id_token`, `response_mode=form_post`, `prompt=none`, `client_id`, `login_hint`, `lti_message_hint`, `redirect_uri` igual a `{App:UrlBase}/api/moodle/{slug}/lancamento`, `state` e `nonce` de pelo menos 22 caracteres cada, e gravam um `lti_lancamento` com esse `state` e `expira_em` = agora + 10 min (AC 1)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleInicioTests.Login_redireciona_ao_auth_url_e_grava_o_estado"`

**C2** - [x] `login` responde `400` e não grava `lti_lancamento` quando `iss` difere, quando `client_id` difere, quando a plataforma está com `ativa=false` e quando a instituição não tem plataforma (AC 2)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleInicioTests.Login_recusa_com_400"`

**C3** - [x] `login`, `lancamento` e `jwks` respondem `404` para um `slug` que não existe e para uma instituição com `ativa=false` (AC 3)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleInicioTests.Slug_inexistente_ou_inativo_404"`

**C4** - [x] `POST /api/moodle/{slug}/lancamento` com `id_token` válido e `state` vigente de um aluno já vinculado responde `302` com `Location: /{slug}`, `Set-Cookie: one.auth=`, e o mesmo cliente chama `GET /api/auth/me` e recebe `200` com o aluno; o `lti_lancamento` fica com `usado_em` preenchido (AC 4)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.Token_valido_de_aluno_vinculado_abre_a_sessao"`

**C5** - [x] O `id_token` é recusado com `400`, sem `Set-Cookie`, em cada um dos 8 itens: assinatura de outra chave, `iss` diferente, `aud` sem o `client_id`, `exp` no passado (a 61 s; a 59 s ainda vale), `nonce` diferente do `state`, `deployment_id` diferente, `message_type` diferente de `LtiResourceLinkRequest`, `version` diferente de `1.3.0` (AC 5, AC 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.Token_invalido_400"` (teoria com os 8 itens e a fronteira de 59/61 s)

**C6** - [x] O `lancamento` responde `400` e não abre sessão quando o `state` não existe, quando `expira_em` passou (a 10 min e 1 s) e quando `usado_em` já está preenchido (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.State_invalido_400"`

**C7** - [x] Para um aluno que já tem `vinculo_moodle` para (`emissor`, `sub`), o `lancamento` abre a sessão desse aluno mesmo que o `username` do token seja o CPF de outro aluno e o e-mail e o nome do token sejam outros (AC 8)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.Vinculo_existente_ignora_cpf_e_email_do_token"`

**C8** - [x] Sem vínculo, um `username` igual ao CPF de um `ALUNO` ativo da instituição cria exatamente 1 `vinculo_moodle` (`emissor`, `sub`, usuário) e abre a sessão; o segundo clique reutiliza o vínculo e não cria outro (AC 9)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.Primeiro_clique_vincula_pelo_cpf"`

**C9** - [x] Sem vínculo, o `lancamento` responde `302` a `/{slug}?moodle=sem-cadastro`, sem `Set-Cookie` e com 0 vínculos criados, quando o `username` é um CPF que nenhum usuário tem, quando não é um CPF válido (`abc`) e quando o claim `custom.username` não vem (AC 10)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.Sem_cadastro_redireciona_com_motivo"`

**C10** - [x] O `lancamento` responde `302` a `/{slug}?moodle=inativo`, sem `Set-Cookie`, quando o usuário vinculado está com `ativo=false` e quando o usuário achado pelo CPF está com `ativo=false`; nos dois casos nenhum `vinculo_moodle` novo é criado (AC 11)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.Usuario_inativo_redireciona_com_motivo"`

**C11** - [x] O `lancamento` responde `302` a `/{slug}?moodle=use-senha`, sem `Set-Cookie` e sem vínculo novo, quando o usuário achado tem o papel `ATENDENTE` só e quando tem `ALUNO` e `ATENDENTE` juntos; com o papel `ALUNO` só, abre a sessão (AC 12)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.Equipe_nao_entra_pelo_moodle"`

**C12** - [x] Reenviar o mesmo par `id_token` e `state` já aceito responde `400`; dois envios simultâneos do mesmo par resultam em um `302` com cookie e um `400` (AC 13; concorrência)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.Reenvio_do_mesmo_par_400"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLancamentoTests.Dois_envios_simultaneos_um_so_entra"`

**C13** - [x] `GET /api/moodle/{slug}/jwks` sem sessão responde `200` com `keys` de 1 item `kty=RSA`, `alg=RS256`, `use=sig`, `kid`, `n` e `e`, e sem o campo `d` nem outro campo privado (AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleChavesTests.Jwks_publica_so_a_chave_publica"`

**C14** - [x] Rodar o agendador apaga os `lti_lancamento` com `expira_em` mais de 1 dia no passado, em duas instituições, e mantém o que venceu há 23 h 59 min e o ainda vigente (AC 15)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLimpezaTests.Agendador_apaga_o_que_venceu_ha_mais_de_um_dia"`

### S2 - O admin cadastra o Moodle da instituição (P1) · API · ~4 arquivos · ~25k

**C15** - [x] `PUT /api/admin/moodle` de um `ADMINISTRADOR` com os 5 campos válidos grava a plataforma da instituição dele e responde `200` com `ativa`, `emissor`, `clientId`, `deploymentId`, `authUrl`, `jwksUrl`, `urlLogin`, `urlLancamento`, `urlJwks`, nessa ordem, as 3 URLs sendo `{App:UrlBase}/api/moodle/{slug}/login`, `/lancamento` e `/jwks` (AC 16; porta 5)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleAdminTests.Put_grava_e_devolve_as_tres_urls"`

**C16** - [x] O `PUT` responde `400` apontando `authUrl` ou `jwksUrl` para `http://moodle.teste/x`; aceita `http://localhost:8081/x` em Development e recusa o mesmo valor em Production (AC 17)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleAdminTests.Url_sem_https_400"`

**C17** - [x] O `PUT` responde `400` apontando o campo quando `emissor`, `clientId`, `deploymentId`, `authUrl` ou `jwksUrl` vem vazio ou com 501 caracteres (10 casos); com 500 caracteres aceita (AC 18)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleAdminTests.Campo_vazio_ou_longo_400"`

**C18** - [x] Dois `PUT` seguidos deixam 1 linha em `plataforma_moodle` para a instituição, com os valores do segundo (AC 19)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleAdminTests.Segundo_put_atualiza_a_mesma_linha"`

**C19** - [x] `GET /api/admin/moodle` sem plataforma cadastrada responde `200` com `configurada=false`, `ativa=false`, os 5 campos vazios e as 3 URLs montadas; com plataforma, `configurada=true` (AC 20)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleAdminTests.Get_sem_plataforma_traz_as_urls"`

**C20** - [x] `GET` e `PUT /api/admin/moodle` respondem `403` para `ATENDENTE` e para `ALUNO`, e `401` sem sessão (AC 21)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleAdminTests.Sem_papel_de_admin_403_e_sem_sessao_401"`

**C21** - [x] O `PUT` do admin da instituição B não altera a plataforma da instituição A, e o `GET` de B não mostra a de A (AC 22)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleAdminTests.Admin_de_outra_instituicao_nao_enxerga_nem_altera"`

**C22** - [x] Dois `PUT` simultâneos numa instituição sem plataforma, com o commit atrasado, resultam em um `200`, um `409` e 1 linha (AC 23)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleAdminTests.Dois_puts_simultaneos_um_200_e_um_409"`

### S3 - A tela diz o que houve (P2) · web · ~5 arquivos · ~30k

**C23** - [x] `/univag?moodle=sem-cadastro` mostra o alerta `Não encontramos seu cadastro no One. Fale com a secretaria.` acima do formulário do Login (AC 24)
Proof: `npm --prefix web test -- --run src/acesso/moodle.test.tsx -t "sem-cadastro"`

**C24** - [x] `/univag?moodle=inativo` mostra `Seu acesso ao One está desativado. Fale com a secretaria.` (AC 25)
Proof: `npm --prefix web test -- --run src/acesso/moodle.test.tsx -t "inativo"`

**C25** - [x] `/univag?moodle=use-senha` mostra `Equipe entra com CPF e senha.` (AC 26)
Proof: `npm --prefix web test -- --run src/acesso/moodle.test.tsx -t "use-senha"`

**C26** - [x] `/univag?moodle=qualquer-coisa` e `/univag` sem o parâmetro não mostram nenhum alerta (AC 27)
Proof: `npm --prefix web test -- --run src/acesso/moodle.test.tsx -t "sem alerta"`

**C27** - [x] A tela `/univag/moodle` mostra o esqueleto enquanto o `GET /api/admin/moodle` carrega; mostra o erro com o botão `Tentar de novo` quando ele falha com 500; com `configurada=false` mostra o formulário vazio, as 3 URLs e um botão `Copiar` por URL (AC 28)
Proof: `npm --prefix web test -- --run src/administracao/moodle.test.tsx -t "estados da tela"`

**C28** - [x] Salvar na tela envia `PUT /api/admin/moodle` com os 6 campos e mostra o aviso `Moodle salvo.`; uma resposta 400 com `errors.authUrl` mostra a mensagem no campo (AC 16, AC 17, lado da tela)
Proof: `npm --prefix web test -- --run src/administracao/moodle.test.tsx -t "salva e mostra o erro do campo"`

**C29** - [x] Para `ADMINISTRADOR` o item `Moodle` aparece no grupo `Administração`, depois de `Aparência`; para `ATENDENTE`, `ALUNO` e `OPERADOR` não aparece, e abrir `/univag/moodle` como `ATENDENTE` volta à tela inicial (AC 29)
Proof: `npm --prefix web test -- --run src/administracao/moodle.test.tsx -t "item no menu"`

### S4 - Portas, estrutura e barreiras (P1) · ~8 arquivos · ~35k

**C30** - [x] `plataforma_moodle` tem um índice único sobre `instituicao_id` só (porta 1)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleDadosTests.Plataforma_unica_por_instituicao"`

**C31** - [x] `vinculo_moodle` tem um índice único sobre (`instituicao_id`, `emissor`, `sub`), e gravar um segundo vínculo igual falha com a violação de unicidade (porta 2)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleDadosTests.Vinculo_unico_por_emissor_e_sub"`

**C32** - [x] `lti_lancamento` tem um índice único sobre `state` (porta 3); o uso único do `state` é provado em C12
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleDadosTests.State_unico"`

**C33** - [x] O pacote `Microsoft.IdentityModel.JsonWebTokens` está no `One.Api.csproj` com uma versão exata (sem `*` nem intervalo) (porta 4)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Pacote_jwt_fixado"`

**C34** - [x] As 3 tabelas novas têm `instituicao_id` `bigint` não nulo, FK para `instituicao`, filtro global, nomes em `snake_case` e datas `timestamptz`; o modelo não tem mudança pendente (Relations)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Tabelas_snake_case_e_datas_timestamptz"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Modelo_sem_mudanca_pendente"`

**C35** - [x] A suíte `ArquiteturaTests` inteira passa, com as contagens atualizadas para os 5 casos de uso (84 mensagens, 87 chamadas `Map*`) e as 3 entidades (33); as únicas edições em asserções existentes somam itens novos a listas e números (Flow)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests"`

**C36** - [x] A suíte inteira da API e `dotnet build One.slnx` passam (CA1502)
Proof: `dotnet build One.slnx`
Proof: `dotnet test One.Api.Tests`

**C37** - [x] A suíte inteira do web e o build do web passam; as únicas edições em asserções existentes somam o item `Moodle` a listas de menu, rotas e telas
Proof: `npm --prefix web test -- --run`
Proof: `npm --prefix web run build`

**C38** - O `dryer` do `web/` não aponta candidato a 0.8 (AD-018). O `crapper` continua bloqueado neste computador (AD-044) e fica "não rodado", sem PASS
Proof: `cd web && dryer`

**C39** - [x] Com os limites reais (política `auth`, 5 por minuto por IP), a 6ª chamada a `login` e a 6ª a `lancamento` do mesmo IP respondem `429` (AC 1, AC 4; tabela de Assumptions)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MoodleLimiteTests.Sexta_chamada_429"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET`/`POST /api/moodle/{slug}/login` statuses (4) | 302 C1 · 400 C2 · 404 C3 · 429 C39 | - |
| `POST /api/moodle/{slug}/lancamento` statuses (4) | 302 C4 · 400 C5 · 404 C3 · 429 C39 | - |
| `GET /api/moodle/{slug}/jwks` statuses (2) | 200 C13 · 404 C3 | - |
| `GET /api/admin/moodle` statuses (3) | 200 C19 · 401 C20 · 403 C20 | - |
| `PUT /api/admin/moodle` statuses (5) | 200 C15 · 400 C16 C17 · 401 C20 · 403 C20 · 409 C22 | - |
| `id_token` conditions (8) | assinatura C5 · iss C5 · aud C5 · exp C5 · nonce C5 · deployment_id C5 · message_type C5 · version C5 (uma teoria com os 8) | - |
| `state` states (3) | inexistente C6 · expirado C6 · usado C6 (uma teoria com os 3) | - |
| `?moodle=` motivos redirecionados (3) | sem-cadastro C9 · inativo C10 · use-senha C11 | - |
| `?moodle=` valores na tela (5) | sem-cadastro C23 · inativo C24 · use-senha C25 · desconhecido C26 · ausente C26 | - |
| campos do `PUT` com limite (5) | emissor C17 · clientId C17 · deploymentId C17 · authUrl C17 · jwksUrl C17 (uma teoria, 5 campos × vazio/501) | - |
| papéis ao `lancamento` (3) | ALUNO só C11 · ATENDENTE só C11 · ALUNO+ATENDENTE C11 | - |
| doors (5) | 1 C30 · 2 C31 · 3 C32 e C12 · 4 C33 · 5 C1 C4 C13 C15 (os 3 caminhos literais) | - |
| entidades de Relations (3) | `plataforma_moodle` C30 C34 · `vinculo_moodle` C31 C34 · `lti_lancamento` C32 C34 | - |
| startup config: `Moodle:ChavePrivada` (1 assembly) | `OneFactory` do teste e `Program` usam a mesma classe `ChaveLti` -> C13 | - |
| startup config: cliente HTTP nomeado `moodle` (1 assembly) | registrado em `Program.Servicos`, trocado pelo falso em `OneFactory` -> C4 | - |

- Claims que nomeiam status, rota ou forma de resposta: C1 a C5, C13, C15 a C22 - cada uma tem prova que cruza a fronteira HTTP.
- C38 não conta como PASS do `crapper` (AD-044).


## Test policy

Evidência (o repo já responde "que nível prova isto" para as rotas e para as entidades, então só as regras novas entram):

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Valida o `id_token` (8 condições) e o `state` (3 estados) | um na fronteira HTTP | um caso afirmado por linha da tabela (C5, C6) |
| Classifica o usuário achado (sem cadastro, inativo, equipe, aluno) | um na fronteira HTTP | um caso por linha (C8 a C11) |
| Monta as 3 URLs e valida `https` | um na fronteira HTTP | C15 a C17 |
| Instrumentação: `ChavesMoodle` e `VerMoodle` | nenhuma própria | cobertas por C13 e C19 |

- `LancamentoMoodle` decide em 8 condições do token, 3 do `state` e 4 classes de usuário: cada uma é um membro da tabela de `Coverage`.
- Análogo: `LoginTests` prova a decisão de `Login` na fronteira HTTP com um caso por recusa.

Custo: 0 provas além das HTTP, porque a decisão fica toda atrás da rota, como em `Login`.

## Swept

- validation: C5, C6, C16, C17
- failure modes: C5 (falha ao obter as chaves do Moodle cai em `400`, sem sessão), C6
- idempotency: C8 (o segundo clique reutiliza o vínculo), C12
- authorization: C11, C20, C21
- concurrency: C12, C22
- data lifecycle: C14
- dependency failure: C5 (JWKS inalcançável → `400`; o falso devolve erro de rede num caso da teoria)
- state transitions: C6, C12 (`state`: vigente → usado; vigente → expirado)
- observability: n/a - o plano não pede métrica nem log novo; o `400` leva o motivo no `detail` do ProblemDetails e o servidor registra a causa no log existente de exceções

## Out of scope

Ver `plan.md`: sincronização de matrículas, criação de usuário, "Preciso de ajuda" com contexto, equipe pelo Moodle, iframe, serviços LTI, logout único, vários Moodles por instituição, botão no Portal.

## Handoff

Contas feitas com `wc -c` ÷ 4 dos arquivos existentes que a feature edita, mais uma estimativa dos arquivos novos:

- Existentes editados: `OneDb.cs` 13,7 KB · `Program.cs` 7,3 KB · `Agendador.cs` 16,6 KB · `OneFactory.cs` 15 KB · `ArquiteturaTests.cs` 65,7 KB · `Autenticado.tsx` 16,6 KB · `App.tsx` 3,3 KB · `Acesso.tsx` 11,4 KB · `AdminRotas.cs` 1 KB · listas de menu em `acesso.test.tsx` 28,6 KB, `ux.test.tsx` 14,6 KB, `navegacao.test.tsx` 7,2 KB e `aparencia.test.tsx` 13,9 KB = 257 KB ≈ 64k
- Novos: 5 casos de uso, validador e chave (~14 KB), 3 entidades (~3 KB), `MoodleFalso` e 7 classes de teste de API (~45 KB), tela `Moodle.tsx` e 2 testes web (~14 KB), migration gerada (~10 KB) = ~86 KB ≈ 22k
- Total ≈ 86k, abaixo dos 150k de orçamento - um construtor, sem pergunta

- Mecanismo: one builder (cabe no orçamento)

- **Boundary:** C1-C37 e C39 fechados em `3acf466` (API) e no commit do web que segue; C38 aberto
- **Settled mid-build:** nenhuma pergunta nova ao dono. Decisões reversíveis tomadas no diff: o `state` é consumido por `UPDATE` condicional, para que dois envios simultâneos não entrem os dois (C12); a validação do `id_token` vive em `Acesso/ValidadorLti.cs` e as chaves do Moodle vêm do cliente HTTP nomeado `moodle` (10 s); a chave da ferramenta vem de `Moodle:ChavePrivada` (PEM) e, sem ela, é gerada na subida, então o `kid` muda a cada reinício até alguém configurar a chave; `IniciarLoginMoodle` e `LancamentoMoodle` entraram em `SemCorpoJson` do `ArquiteturaTests`, porque respondem com redirecionamento, como `DefinirSenha` e os downloads; o teste do 409 (C22) atrasa o `SaveChanges` por `ContadorDeGravacoes.Atraso`, porque um `INSERT` único não abre transação e o `AtrasoDoCommit` não atua
- **Abandoned:** `RSA` estático compartilhado entre a fábrica de teste e o teste do JWKS (o `RSA` descartado pela fábrica mudava a chave lida); ficou o PEM em `OneFactory.PemDaFerramenta`
- **C38 (`dryer`) não rodou:** o Smart App Control do Windows bloqueia `tree_sitter_typescript.dll` desde 10/11 10:03 (evento 3077 de Code Integrity), a mesma política do AD-044 para o `crapper`. Precisa rodar noutro computador ou de um AD de risco aceito. O mesmo bloqueio barrou uma vez o `One.Api.Tests.dll` recém-compilado; recompilar resolveu
