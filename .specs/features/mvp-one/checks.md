# MVP do One - checks

Profile: standard
Plan: `.specs/features/mvp-one/plan.md`

195 checks em 13 slices · 19 one-way doors · 7 perguntas abertas, nenhuma bloqueia o build (as 6 `blocks go-live` bloqueiam só o uso real)

**Como as provas rodam.** O repositório ainda não existe. Os comandos abaixo usam o layout da door 1 e
as ferramentas escolhidas aqui, todas reversíveis:

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `xunit.runner.visualstudio` (modo VSTest do `dotnet test`), `WebApplicationFactory<Program>`, provedor de IA falso por `HttpMessageHandler`, relógio por `TimeProvider` | `docker compose up -d postgres mailpit`; cada classe de teste cria o próprio banco no PostgreSQL 18 do compose, porque triggers, `xmin`, índice parcial e `RETURNING` não existem em banco em memória |
| `web/` unidade | Vitest + Testing Library (`npm --prefix web run test` = `vitest run`) | `npm --prefix web ci` |
| `web/` ponta a ponta | Playwright (`npm --prefix web run e2e`), contra `docker compose up` | `npx --prefix web playwright install chromium` |

Todos os comandos rodam na raiz `D:\one-system`. Cada prova nomeia um teste; o nome é o contrato
com o builder.

## Checks

### S1 - Instituições separadas no mesmo sistema (P1) · ~14 files · ~60 KB · ~15k

**C1** - [x] `instituicao criar --slug univag --nome Univag --fuso America/Cuiaba` com CPF, nome e e-mail válidos cria a instituição ativa, um setor "Triagem" com `triagem` verdadeiro, a categoria "Não classificado" e um administrador sem senha, imprime um link `/univag/definir-senha?token=` que vence em 60 minutos e sai com código 0 (AC 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests.Criar_valido_sai_0"`

**C2** - [x] `instituicao criar` com slug `Uni` (fora de `^[a-z0-9-]{3,30}$`), slug já existente, fuso `Cuiaba`, CPF com dígito errado ou e-mail sem `@` imprime o motivo na saída de erro, deixa o banco sem nenhuma linha nova e sai com código 1 (AC 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests.Criar_invalido_sai_1"`

**C3** - [x] `instituicao carga` com um arquivo válido cria setores, cursos, categorias, regras e artigos `ATIVO`, imprime a quantidade de cada tipo e sai com código 0 (AC 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests.Carga_valida_sai_0"`

**C4** - [x] `instituicao carga` com um arquivo em que só `artigos[2]` aponta uma categoria inexistente grava 0 itens de qualquer tipo, imprime `artigos[2].categoria` com o motivo e sai com código 1 (AC 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests.Carga_invalida_nao_grava_nada"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests.Carga_cada_recusa_sai_1"`

**C5** - [x] `GET /api/instituicoes/univag` responde 200 com `nome` "Univag", e a tela de login em `/univag` mostra "Univag" (AC 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoRotaTests.Slug_ativo_200"`
Proof: `npm --prefix web run test -- -t "login mostra o nome da instituição"`

**C6** - [x] `GET /api/instituicoes/{slug}` responde 404 para slug inexistente e para instituição inativa, e a SPA mostra "Instituição não encontrada." (AC 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoRotaTests.Slug_inexistente_ou_inativo_404"`
Proof: `npm --prefix web run test -- -t "slug desconhecido mostra Instituição não encontrada"`

**C7** - [x] Um usuário da `demo`, com o papel exigido pela rota, recebe 404 ao usar o id ou número de um recurso que só existe na `univag`, nas 27 rotas da `Surface` com `{id}` ou `{numero}` (AC 7)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IsolamentoTests.Recurso_de_outra_instituicao_404"`

**C8** - [x] `categoriaId`, `setorId`, `matriculaId` ou `numeroOriginal` de outra instituição no corpo da requisição recebem 400, o mesmo de um id inexistente (AC 7)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IsolamentoTests.Id_de_outra_instituicao_no_corpo_400"`

**C9** - [x] O mesmo CPF, o mesmo e-mail e o mesmo número de matrícula são gravados na `univag` e na `demo` sem erro, como contas e matrículas distintas (AC 8)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IsolamentoTests.Mesmo_cpf_email_matricula_em_duas_instituicoes"`

**C10** - [x] `POST /api/admin/usuarios` com CPF ou e-mail que já existe na mesma instituição responde 409 e não cria conta (AC 8, AC 109)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Cpf_ou_email_repetido_409"`

**C11** - [x] A SPA mostra o instante `2026-11-02T02:30:00Z` como `01/11/2026 22:30` numa instituição com fuso `America/Cuiaba` (AC 9)
Proof: `npm --prefix web run test -- -t "formata data no fuso da instituição"`

**C12** - [x] Um chamado criado em `2026-11-02T02:30:00Z` conta no dia 01/11/2026 dos indicadores da `univag` (`America/Cuiaba`) (AC 9)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.Dia_do_periodo_no_fuso"`

**C13** - [x] Numa execução do agendador com e-mails pendentes da `univag` e da `demo`, cada e-mail sai com o nome da sua instituição no assunto e no nome do remetente (AC 10)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AgendadorTests.Item_usa_fuso_nome_e_remetente_da_sua_instituicao"`

**C14** - [x] Depois de a instituição ser marcada inativa, a requisição seguinte com um cookie dela responde 401 (AC 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IsolamentoTests.Instituicao_inativa_401"`

**C15** - [x] `SaveChanges` lança exceção e não grava nada quando uma entidade nova traz `InstituicaoId` diferente da instituição da sessão, e preenche `InstituicaoId` quando ele vem vazio (door 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IsolamentoTests.SaveChanges_recusa_outra_instituicao"`

**C16** - [x] As 20 entidades do modelo além de `Instituicao` têm `instituicao_id` não nulo com chave estrangeira e filtro global por instituição (door 16, Relations)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro"`

**C17** - [x] `IgnoreQueryFilters` aparece no código de `api/` só no agendador e no comando `instituicao` (door 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando"`

**C18** - [x] Alterar o `slug` de uma instituição existente lança exceção, e o banco mantém o valor original (door 17)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests.Slug_nao_muda"`

**C19** - [x] `docker-compose.yml` declara os serviços com as imagens `postgres:18` e `axllent/mailpit`, e a solução tem os projetos `api/`, `api.Tests/` e `web/` (door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Layout_e_compose"`

**C20** - [x] Toda tabela e coluna do modelo EF está em `snake_case`, e toda coluna de data é `timestamptz` (door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Tabelas_snake_case_e_datas_timestamptz"`

### S2 - Entrar com o CPF na instituição (P1) · ~12 files · ~55 KB · ~14k

**C21** - [x] `POST /api/auth/login` com instituição, CPF `123.456.789-09` (com máscara) e senha corretos responde 200 com `id`, `nome`, `papeis`, `deveTrocarSenha` e `instituicao{slug, nome}`, e emite `one.auth` com `HttpOnly`, `Secure` e `SameSite=Strict` (AC 12, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LoginTests.Login_valido_200_com_cookie"`

**C22** - [x] O cookie `one.auth` vence 8 horas depois da última requisição autenticada: uma requisição 7 h 59 min depois da anterior passa, e uma 8 h 01 min depois responde 401 (door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LoginTests.Cookie_expira_8h_deslizante"`

**C23** - [x] `usuario.senha_hash` é o formato V3 do `PasswordHasher` (PBKDF2, primeiro byte `0x01`) e nunca contém a senha em texto (door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SenhaTests.Hash_e_pbkdf2_v3"`

**C24** - [x] CPF com 10 dígitos, com 12 dígitos ou com dígito verificador errado responde 400 com `detail` "CPF inválido." e não chama o verificador de senha (AC 13)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LoginTests.Cpf_invalido_400_sem_consultar_senha"`

**C25** - [x] Instituição inexistente, CPF não cadastrado e senha errada respondem 401 com o mesmo `detail` "CPF ou senha inválidos." (AC 14)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LoginTests.Tres_falhas_mesmo_401"`

**C26** - [x] Conta desativada e conta sem senha respondem 401 com "CPF ou senha inválidos." e sem `Set-Cookie` (AC 15)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LoginTests.Conta_desativada_ou_sem_senha_401_sem_cookie"`

**C27** - [x] Do mesmo IP, 3 logins e 2 primeiros acessos em 60 s passam, e o 6º pedido de qualquer dos dois responde 429 (AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RateLimitTests.Login_e_primeiro_acesso_somam_5_por_minuto"`

**C28** - [x] `POST /api/auth/primeiro-acesso` com CPF válido responde 202 com "Se o CPF estiver cadastrado, enviamos um link para o e-mail registrado na instituição." para CPF cadastrado e para CPF não cadastrado (AC 17)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrimeiroAcessoTests.Resposta_202_igual_com_ou_sem_cpf"`

**C29** - [x] `POST /api/auth/primeiro-acesso` com CPF de dígito verificador errado responde 400 com "CPF inválido." (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrimeiroAcessoTests.Cpf_invalido_400"`

**C30** - [x] Para CPF de conta ativa, o e-mail cadastrado recebe o assunto "[Univag] Crie sua senha" com o link `/univag/definir-senha?token=`; `token_acesso` guarda o SHA-256 do token e vence 60 minutos depois (AC 18, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrimeiroAcessoTests.Envia_link_e_guarda_so_o_hash"`

**C31** - [x] O primeiro acesso envia o e-mail sem gravar nenhuma linha em `email_saida` (door 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrimeiroAcessoTests.Nao_usa_email_saida"`

**C32** - [x] Com o SMTP fora do ar, o primeiro acesso ainda responde 202 e registra a falha de envio no log com a instituição (dependency failure)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrimeiroAcessoTests.Smtp_fora_202_e_log"`

**C33** - [x] `POST /api/auth/definir-senha` com token válido e senha de 8 ou de 128 caracteres responde 204, grava o hash e marca o token como usado (AC 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DefinirSenhaTests.Token_valido_204"`

**C34** - [x] Senha nova de 7 ou de 129 caracteres em `definir-senha` responde 400 e deixa o token sem uso (AC 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DefinirSenhaTests.Senha_fora_de_8_a_128_400"`

**C35** - [x] Token já usado, token emitido há 61 minutos e token inexistente respondem 400 com "Link inválido ou vencido." (AC 20)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DefinirSenhaTests.Link_usado_vencido_ou_inexistente_400"`

**C36** - [x] Sem cookie, as 49 rotas `/api/*` registradas fora de instituição, login, primeiro acesso, definir senha e logout respondem 401 (AC 21)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SessaoTests.Sem_cookie_401_em_toda_rota_privada"`

**C37** - [x] `POST /api/auth/logout` responde 204 e devolve `one.auth` vencido, com ou sem sessão (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SessaoTests.Logout_204_expira_cookie"`

**C38** - [x] `GET /api/auth/me` responde 200 com `cpfMascarado`, `papeis`, `deveTrocarSenha`, `instituicao` e as matrículas do usuário (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SessaoTests.Me_200_com_matriculas"`

**C39** - [x] Com `deveTrocarSenha` verdadeiro, toda rota fora de login, logout, `me` e `senha` responde 403, e a SPA abre a tela "Trocar senha" (AC 22)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SessaoTests.Deve_trocar_senha_403_fora_de_4_rotas"`
Proof: `npm --prefix web run test -- -t "deveTrocarSenha abre Trocar senha"`

**C40** - [x] `POST /api/auth/senha` com a senha atual correta e uma nova de 8 caracteres responde 204, e a sessão seguinte tem `deveTrocarSenha` falso (AC 23)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SenhaTests.Troca_valida_204"`

**C41** - [x] Senha atual errada e senha nova de 7 caracteres respondem 400, e o login com a senha anterior continua passando (AC 24)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SenhaTests.Atual_errada_ou_nova_curta_400"`

**C42** - [x] Depois do login a SPA abre Assistente para aluno, Fila para atendente e Artigos para administrador, e um usuário atendente e administrador vê no menu os itens dos dois papéis (AC 25)
Proof: `npm --prefix web run test -- -t "tela inicial por papel"`

**C43** - [x] Depois de o administrador desativar uma conta com sessão aberta, a requisição seguinte dessa sessão responde 401 (AC 26)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SessaoTests.Conta_desativada_401_na_proxima_requisicao"`

**C44** - [x] Nenhuma resposta fora de `/api/admin/*` traz um CPF de 11 dígitos; `me` traz `***.456.789-**` (AC 27)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CpfTests.Respostas_fora_do_admin_mascaram_cpf"`

### S3 - O assistente conversa e resolve com a base interna (P1) · ~14 files · ~80 KB · ~20k

**C45** - [x] A tela Assistente mostra o aviso "Suas mensagens são analisadas por um serviço externo de inteligência artificial, com servidores fora do Brasil. Não escreva CPF, matrícula, telefone ou dados de saúde." sem conversa e com conversa aberta (AC 28)
Proof: `npm --prefix web run test -- -t "Assistente mostra o aviso de IA externa"`

**C46** - [x] O botão "Falar com atendente" aparece na tela Assistente antes da primeira mensagem e em conversa sem desfecho (AC 29)
Proof: `npm --prefix web run test -- -t "Falar com atendente visível sem conversa e em conversa aberta"`

**C47** - [x] Aluno com matrícula ativa envia primeira mensagem de 1 e de 1000 caracteres: `POST /api/conversas` responde 201 com `conversaId` e `resposta{tipo, texto}`, e a conversa fica gravada com a mensagem (AC 30)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Primeira_mensagem_201"`

**C48** - [x] Outra mensagem numa conversa própria sem desfecho responde 200 com `resposta{tipo, texto}` e fica gravada (AC 31)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Mensagem_seguinte_200"`

**C49** - [x] Mensagem vazia, só com espaços ou com 1001 caracteres responde 400 nas duas rotas de mensagem e não grava nada (AC 32)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Mensagem_vazia_espacos_ou_1001_400"`

**C50** - [x] Usuário sem o papel aluno e aluno só com matrículas `INATIVA` recebem 403 em `POST /api/conversas` (AC 33)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Sem_papel_aluno_ou_matricula_ativa_403"`

**C51** - [x] No corpo enviado ao provedor, `2000567890`, `123.456.789-09`, `2000 5678 90` e `65 99999-8888` viram `[número removido]`, `aluno@x.com` vira `[e-mail removido]` e `1234567` (7 dígitos) fica igual (AC 34)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Mascara_numeros_e_emails"`

**C52** - [x] O corpo enviado ao provedor não contém nome, CPF, matrícula nem curso do aluno, traz só artigos `ATIVO` e categorias ativas da instituição da sessão e só as 10 últimas mensagens de uma conversa com 12 (AC 34)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Corpo_so_traz_o_permitido"`

**C53** - [x] A requisição vai para `POST {Llm:BaseUrl}/chat/completions` com `model` `deepseek-flash`, `response_format` `{"type":"json_object"}`, `temperature` 0, `max_tokens` 800, sem `thinking`, e as mensagens na ordem regras fixas, artigos, categorias, conversa (door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Parametros_e_ordem_do_prompt"`

**C54** - [x] Para uma `resposta` com trecho que confere, a API devolve `tipo` `resposta` e o texto do modelo, e a SPA mostra o texto, "Resposta gerada por IA com base nas orientações da instituição." e "Isso resolveu?" com Sim e Não (AC 35)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Resposta_conferida_devolve_tipo_e_texto"`
Proof: `npm --prefix web run test -- -t "resposta mostra aviso de IA e Isso resolveu"`

**C55** - [x] O trecho "PRAZO   de  pagamento" confere com o artigo que contém "prazo de pagamento" (maiúsculas e espaços repetidos ignorados) (door 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConferenciaTests.Normaliza_maiusculas_e_espacos"`

**C56** - [x] O trecho "faltas nao sao abonadas" não confere com o artigo que contém "faltas não são abonadas", e "faltas, não" não confere com "faltas não" (door 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConferenciaTests.Acento_e_pontuacao_contam"`

**C57** - [x] Trechos de 20 e de 400 caracteres presentes no artigo conferem; de 19 e de 401 caracteres presentes no artigo falham (door 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConferenciaTests.Trecho_de_20_a_400"`

**C58** - [x] Uma `resposta` com um trecho ausente do artigo citado, ou com um artigo citado sem trecho, chega ao aluno como `sem_base` e grava `trecho_invalido` no log (AC 36)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Trecho_invalido_vira_sem_base_e_log"`

**C59** - [x] Uma `resposta` com `artigoIds` vazio, com id inexistente, com id de artigo da outra instituição ou com id de artigo `RASCUNHO` ou `ARQUIVADO` chega ao aluno como `sem_base` (AC 37)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Artigo_invalido_vira_sem_base"`

**C60** - [x] Uma `resposta` cujo texto tem `https://falso.exemplo` fora dos links dos artigos citados chega como `sem_base` e grava `link_invalido` no log; com um link `http://` ou `https://` que está nos links do artigo ela chega como `resposta` (AC 38)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Link_fora_dos_artigos_vira_sem_base_e_log"`

**C61** - [x] Depois de rodar os cenários de C54 e C58 a C60, toda `mensagem_conversa` com tipo final `resposta` tem ao menos um trecho confirmado para cada artigo citado (AC 39)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Nenhuma_resposta_exibida_sem_trecho_por_artigo"`

**C62** - [x] Nas respostas de `POST /api/conversas`, mensagens, `GET /api/conversas/{id}`, `GET /api/chamados` e `GET /api/chamados/{numero}` para o aluno não aparecem título, resposta, links nem trechos dos artigos usados, nem as chaves `artigoId`, `versaoArtigoId`, `trechos` ou `fontes` (AC 40)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SigiloTests.Aluno_nao_recebe_dado_de_artigo"`

**C63** - [x] `GET /api/artigos/versoes/{id}` pedido por aluno responde 404 (AC 40)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SigiloTests.Aluno_pede_versao_de_artigo_404"`

**C64** - [x] Uma `pergunta` de 200 caracteres terminada em "?" chega como `tipo` `pergunta`, e a SPA mostra a pergunta sem "Isso resolveu?" (AC 41)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Pergunta_devolve_tipo_pergunta"`
Proof: `npm --prefix web run test -- -t "pergunta sem Isso resolveu"`

**C65** - [x] A terceira `pergunta` seguida, uma `pergunta` de 201 caracteres e uma `pergunta` sem "?" no fim chegam como `sem_base` (AC 42)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Pergunta_fora_da_regra_vira_sem_base"`

**C66** - [x] `sem_base` devolve o texto "Não encontrei isso nas orientações da instituição. Posso transferir você para um atendente." sem o texto do modelo, e a SPA mostra "Falar com atendente" com a variante de destaque (AC 43)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Sem_base_texto_fixo"`
Proof: `npm --prefix web run test -- -t "sem_base destaca Falar com atendente"`

**C67** - [x] `transferir` devolve "Vou transferir você para um atendente." e não cria chamado, e a SPA mostra o botão de confirmação (AC 44)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Transferir_nao_cria_chamado"`
Proof: `npm --prefix web run test -- -t "transferir pede confirmação"`

**C68** - [x] Provedor respondendo 500, sem resposta em 20 s, com `content` vazio, com JSON inválido ou com `tipo` `outro` faz a API devolver o texto de `sem_base` e gravar o motivo no log (AC 45)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Falha_do_provedor_vira_sem_base_e_log"`

**C69** - [x] Cada mensagem exibida do assistente grava o texto exato exibido, o tipo devolvido, o tipo final, os trechos confirmados, as versões de artigo citadas, o modelo e a data e hora (AC 46)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Grava_o_que_foi_exibido"`

**C70** - [x] Cada chamada ao provedor grava um log com instituição, modelo, duração, tokens de entrada com e sem cache, tokens de saída, tipo devolvido, tipo final e artigos citados, e o log não contém o texto da mensagem do aluno (AC 47)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Log_da_chamada_sem_texto"`

**C71** - [x] `POST /api/conversas/{id}/avaliacao` com `resolveu` verdadeiro responde 200 com desfecho `RESOLVIDA_AUTOATENDIMENTO` e não cria chamado (AC 48)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConversaTests.Sim_resolve_sem_chamado"`

**C72** - [x] `resolveu` falso responde 200, a conversa fica sem desfecho, e a SPA mostra "Quer explicar melhor ou falar com um atendente?" com o botão em destaque (AC 49)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConversaTests.Nao_mantem_aberta"`
Proof: `npm --prefix web run test -- -t "Não mostra Quer explicar melhor"`

**C73** - [x] `POST /api/conversas/{id}/encerrar` responde 200 com desfecho `ENCERRADA_PELO_ALUNO` (AC 50)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConversaTests.Encerrar_200"`

**C74** - [x] A 11ª mensagem do aluno numa conversa responde 409, e a SPA passa a mostrar só "Falar com atendente" e "Encerrar" (AC 51)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConversaTests.Decima_primeira_mensagem_409"`
Proof: `npm --prefix web run test -- -t "limite oferece só dois botões"`

**C75** - [x] Mensagem, avaliação, encerramento e transferência numa conversa com desfecho respondem 409, e a conversa fica igual (AC 52)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConversaTests.Conversa_com_desfecho_409"`

**C76** - [x] As 5 rotas de `/api/conversas/{id}` usadas por outro aluno da mesma instituição respondem 404 (AC 53)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConversaTests.Conversa_de_outro_aluno_404"`

**C77** - [x] `GET /api/conversas/{id}` responde 200 com as mensagens em ordem cronológica, o texto exibido de cada resposta, o desfecho e, depois da transferência, `chamadoNumero` (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConversaTests.Get_conversa_200_com_mensagens_e_chamado"`

**C78** - [x] `POST /api/conversas/{id}/avaliacao` sem `resolveu` responde 400 (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConversaTests.Avaliacao_sem_resolveu_400"`

**C79** - [x] Depois de editar o artigo citado, o aluno continua vendo o mesmo texto exibido; `GET /api/artigos/versoes/{id}` responde 200 ao atendente com a versão citada e `versaoAtivaAtualId` da nova, e o detalhe do atendente mostra "Este artigo foi atualizado depois desta resposta." (AC 54)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~VersaoCitadaTests.Edicao_nao_muda_o_exibido_e_avisa_a_equipe"`
Proof: `npm --prefix web run test -- -t "aviso de artigo atualizado"`

**C80** - [x] A 11ª mensagem de um mesmo aluno em 60 s, em qualquer conversa, responde 429 (AC 55)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RateLimitTests.Onze_mensagens_em_60s_429"`

### S4 - Transferência para um atendente (P1) · ~8 files · ~45 KB · ~11k

**C81** - [x] `POST /api/conversas/{id}/transferir` numa conversa sem desfecho responde 201 com `numero`, `estado` `ABERTO` e `setor`; o chamado fica sem responsável e a conversa com desfecho `TRANSFERIDA` (AC 56)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransferenciaTests.Transferir_201_aberto_sem_responsavel"`

**C82** - [x] `POST /api/atendimento-direto` com descrição de 1 e de 2000 caracteres responde 201, cria conversa e chamado com categoria "Não classificado" e faz 0 chamadas ao provedor de IA (AC 57)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransferenciaTests.Atendimento_direto_sem_chamar_ia"`

**C83** - [x] `POST /api/atendimento-direto` com descrição vazia ou de 2001 caracteres responde 400 sem gravar (Surface, AC 57)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransferenciaTests.Atendimento_direto_descricao_invalida_400"`

**C84** - [x] `POST /api/atendimento-direto` por usuário sem o papel aluno responde 403 (Surface, AC 33)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransferenciaTests.Atendimento_direto_sem_papel_aluno_403"`

**C85** - [x] O atendimento direto conta no limite de 10 mensagens por aluno em 60 s, e o pedido que passa do limite responde 429 (Surface, Observable)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RateLimitTests.Atendimento_direto_conta_no_limite_do_aluno"`

**C86** - [x] Duas transferências na `univag` geram `ONE-1` e `ONE-2`, e a primeira da `demo` gera `ONE-1` (AC 58)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~NumeracaoTests.Numero_por_instituicao"`

**C87** - [x] 20 transferências paralelas de conversas diferentes na mesma instituição geram 20 números distintos de `ONE-1` a `ONE-20` (door 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~NumeracaoTests.Vinte_transferencias_paralelas_numeros_distintos"`

**C88** - [x] O chamado guarda solicitante, matrícula, o semestre da matrícula na transferência (mesmo depois de uma importação mudar o semestre), título com os 120 primeiros caracteres de uma primeira mensagem de 121, a conversa e o último `resumo` não vazio cortado em 500 caracteres (AC 59)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransferenciaTests.Chamado_guarda_contexto"`

**C89** - [x] A categoria do chamado é a última sugestão válida da IA com origem `IA`; com sugestão de categoria inativa e artigo citado, a categoria do último artigo com origem `ARTIGO`; sem sugestão nem artigo, "Não classificado" com origem `PADRAO` (AC 60, AC 61, AC 62)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CategoriaOrigemTests.Origem_da_categoria"`

**C90** - [x] O chamado vai para o setor fixo da regra; para a coordenação do curso da matrícula quando a regra aponta coordenação; e para a triagem quando a categoria não tem regra, é "Não classificado" ou o curso não tem coordenação (AC 63, AC 64, AC 65)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RoteamentoTests.Setor_do_chamado"`

**C91** - [x] Aluno com duas matrículas ativas que transfere sem `matriculaId`, ou com uma matrícula inativa ou de outro aluno, recebe 400, e a SPA pede a escolha mostrando número e curso das duas (AC 66)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransferenciaTests.Duas_matriculas_sem_escolha_400"`
Proof: `npm --prefix web run test -- -t "pede escolha da matrícula"`

**C92** - [x] Dois pedidos simultâneos de transferência da mesma conversa criam um chamado; um responde 201 e o outro 409 (AC 67, Relations)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransferenciaTests.Transferencia_dupla_um_chamado_e_409"`

**C93** - [x] Depois da transferência a tela Assistente mostra "Transferido para Financeiro. Protocolo ONE-1." e, abaixo, as respostas públicas do chamado (AC 68)
Proof: `npm --prefix web run test -- -t "transferido mostra protocolo e respostas"`

**C94** - [x] Com a conversa transferida aberta, a SPA não pede `GET /api/chamados/{numero}` aos 14,9 s e pede aos 15 s e aos 30 s (AC 69, door 18)
Proof: `npm --prefix web run test -- -t "atualiza chamado a cada 15 s"`

### S5 - Atender e acompanhar até fechar (P1) · ~14 files · ~90 KB · ~23k

**C95** - [x] `GET /api/chamados?escopo=fila` responde 200 com os chamados não fechados dos setores do atendente, do mais antigo ao mais novo, com número, título, categoria, estado, responsável e dias desde a criação (AC 70)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~FilaTests.Fila_do_setor_mais_antigo_primeiro"`

**C96** - [x] `GET /api/chamados?escopo=meus` para aluno lista só os chamados dele, do mais recente ao mais antigo, com número, título e estado (AC 71)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~FilaTests.Minhas_solicitacoes_so_do_aluno_mais_recente_primeiro"`

**C97** - [x] Atendente de outro setor recebe 404 no `GET /api/chamados/{numero}` e nas 9 ações `POST /api/chamados/{numero}/*` (AC 72)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~VisibilidadeTests.Atendente_de_outro_setor_404"`

**C98** - [x] `GET /api/chamados/{numero}` responde 200 ao atendente com matrícula, curso, semestre, resumo, transcrição, artigos e trechos de cada resposta do assistente, respostas públicas, notas internas, eventos e `acoes` do estado; a SPA mostra o resumo com o rótulo "Resumo gerado por IA" (AC 73)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~VisibilidadeTests.Detalhe_do_atendente_traz_contexto_e_fontes"`
Proof: `npm --prefix web run test -- -t "detalhe rotula Resumo gerado por IA"`

**C99** - [x] O aluno recebe no detalhe estado, transcrição, respostas públicas e `acoes` do estado, sem `resumo` (AC 74)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~VisibilidadeTests.Detalhe_do_aluno_sem_resumo"`

**C100** - [x] Nenhuma resposta da API ao aluno traz o texto de nota interna, evento de nota interna, o resumo ou as fontes do assistente (AC 75)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~VisibilidadeTests.Aluno_nao_recebe_nota_resumo_nem_fontes"`

**C101** - [x] Atendente do setor assume um chamado `ABERTO`: 200, estado `EM_ATENDIMENTO` e ele como responsável (AC 76)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Assumir_aberto"`

**C102** - [x] A primeira resposta pública de um atendente do setor num chamado `ABERTO` responde 201, muda o estado para `EM_ATENDIMENTO` e o torna responsável (AC 77)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Primeira_resposta_publica_assume"`

**C103** - [x] Assumir um chamado de outro atendente do mesmo setor troca o responsável e grava um evento com o anterior e o novo (AC 78)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Assumir_de_outro_troca_e_registra"`

**C104** - [x] Resposta pública do responsável com `aguardaAluno` verdadeiro em `EM_ATENDIMENTO` muda o estado para `AGUARDANDO_ALUNO` (AC 79)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Aguardando_aluno"`

**C105** - [x] Resposta do aluno em `AGUARDANDO_ALUNO` muda o estado para `EM_ATENDIMENTO` (AC 80)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Resposta_do_aluno_volta_em_atendimento"`

**C106** - [x] Resolver com texto de 1 e de 4000 caracteres responde 200, muda o estado para `RESOLVIDO` e o texto aparece ao aluno como resposta pública (AC 81)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Resolver_com_texto"`

**C107** - [x] Resolver sem texto ou com 4001 caracteres responde 400 e o estado não muda (AC 82)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Resolver_sem_texto_ou_4001_400"`

**C108** - [x] O aluno confirma um chamado `RESOLVIDO`: 200, estado `FECHADO` com motivo `CONFIRMADO` (AC 83)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Confirmar_fecha"`

**C109** - [x] Rejeitar com motivo 7 dias exatos depois da resolução responde 200, volta para `EM_ATENDIMENTO` e soma 1 às reaberturas (AC 84)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Rejeitar_ate_7_dias"`

**C110** - [x] Rejeitar sem motivo responde 400 e o estado continua `RESOLVIDO` (AC 85)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Rejeitar_sem_motivo_400"`

**C111** - [x] Rejeitar 7 dias e 1 minuto depois da resolução responde 409 (AC 85)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Rejeitar_depois_de_7_dias_409"`

**C112** - [x] Resposta pública do aluno num chamado `RESOLVIDO` volta o chamado para `EM_ATENDIMENTO`, soma 1 às reaberturas e grava o texto como motivo; depois de 7 dias responde 409 (AC 86)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Mensagem_do_aluno_em_resolvido_rejeita"`

**C113** - [x] Rejeição de um chamado cujo responsável foi desativado deixa o chamado `ABERTO` no setor atual, sem responsável (AC 87)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Rejeicao_sem_responsavel_ativo_volta_aberto"`

**C114** - [x] O aluno cancela chamados `ABERTO`, `EM_ATENDIMENTO` e `AGUARDANDO_ALUNO`: 200, estado `FECHADO` com motivo `CANCELADO` e a justificativa guardada (AC 88)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Cancelar_nos_3_estados"`

**C115** - [x] Para as 9 ações (resposta pública, nota interna, assumir, resolver, confirmar, rejeitar, cancelar, encaminhar, reclassificar) nos 5 estados, cada par permitido responde 2xx e cada par não permitido responde 409 sem mudar o chamado (AC 89)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransicoesTests.Matriz_acao_estado"`

**C116** - [x] Para as 9 ações e os 2 papéis do chamado (aluno dono e atendente do setor), cada par não permitido, como aluno assumindo ou atendente confirmando, responde 403 sem mudar o chamado (AC 89)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransicoesTests.Matriz_acao_papel"`

**C117** - [x] Mensagem pública ou nota num chamado `FECHADO` responde 409 (AC 90)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Mensagem_em_fechado_409"`

**C118** - [x] `POST /api/chamados/{numero}/mensagens` com texto vazio responde 400 sem gravar (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Mensagem_sem_texto_400"`

**C119** - [x] Dois atendentes alteram o mesmo chamado lido na mesma versão: a primeira alteração grava e a segunda responde 409 (AC 91, door 14)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConcorrenciaTests.Segunda_alteracao_simultanea_409"`

**C120** - [x] Criação, transição, atribuição, encaminhamento, reclassificação, resposta, nota e anexo gravam cada um um evento com tipo, ator (vazio para o Sistema) e data em UTC; o detalhe os lista em ordem cronológica no fuso da instituição (AC 92)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EventosTests.Cada_acao_grava_evento"`
Proof: `npm --prefix web run test -- -t "eventos em ordem no fuso"`

**C121** - [x] Nenhuma rota registrada usa `PUT`, `PATCH` ou `DELETE` sobre mensagens, eventos, versões de artigo ou anexos (AC 93)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ImutabilidadeTests.Sem_rota_de_edicao"`

**C122** - [x] `UPDATE` e `DELETE` em `mensagem_conversa`, `mensagem_chamado`, `evento_chamado`, `versao_artigo` e `anexo` lançam exceção do trigger, e a linha fica igual (AC 93, AC 46, door 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ImutabilidadeTests.Trigger_recusa_update_e_delete"`

### S6 - Encaminhar e reclassificar (P2) · ~3 files · ~12 KB · ~3k

**C123** - [x] Encaminhar para outro setor com motivo responde 200, grava o motivo como nota interna, deixa o chamado `ABERTO` no destino sem responsável e soma 1 aos encaminhamentos (AC 94)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EncaminharTests.Encaminhar_abre_no_destino"`

**C124** - [x] Encaminhar para o setor atual ou sem motivo responde 400 e o chamado fica igual (AC 95)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EncaminharTests.Mesmo_setor_ou_sem_motivo_400"`

**C125** - [x] Depois do encaminhamento, o atendente que pertence só ao setor anterior recebe 404 no chamado (AC 96)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EncaminharTests.Setor_anterior_perde_acesso_404"`

**C126** - [x] Reclassificar responde 200, muda a categoria atual e mantém a categoria original, a origem e o setor (AC 97)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EncaminharTests.Reclassificar_mantem_original"`

**C127** - [x] Reclassificar para categoria inativa ou inexistente responde 400 (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EncaminharTests.Categoria_inativa_ou_inexistente_400"`

### S7 - Base de conhecimento (P2) · ~6 files · ~35 KB · ~9k

**C128** - [x] `POST /api/admin/artigos` com título, uma pergunta, categoria e resposta responde 201 com o artigo `RASCUNHO` na versão 1 (AC 98)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Criar_rascunho_versao_1"`

**C129** - [x] Faltando título, perguntas, categoria ou resposta, `POST /api/admin/artigos` responde 400 (AC 99)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Campo_obrigatorio_faltando_400"`

**C130** - [x] Um link `ftp://x` ou `www.x.com` responde 400 (AC 100)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Link_sem_http_400"`

**C131** - [x] `PUT /api/admin/artigos/{id}` responde 200 com a versão 2, e a versão 1 continua legível (AC 101)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Editar_cria_versao_seguinte"`

**C132** - [x] Gravar duas versões com o mesmo número para o mesmo artigo viola a restrição única no banco (Relations)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Numero_de_versao_unico"`

**C133** - [x] Depois de `POST /api/admin/artigos/{id}/ativar` (200), a próxima chamada ao provedor daquela instituição traz o artigo (AC 102)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Ativar_entra_na_proxima_mensagem"`

**C134** - [x] Depois de arquivar, a próxima chamada ao provedor não traz o artigo e as conversas que o citaram continuam com o texto exibido (AC 103)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Arquivar_sai_da_base_e_mantem_conversas"`

**C135** - [x] Ativar um artigo `ATIVO` e arquivar um artigo `ARQUIVADO` respondem 409 (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Ativar_ativo_ou_arquivar_arquivado_409"`

**C136** - [x] `PUT`, `ativar` e `arquivar` com id inexistente respondem 404 (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Artigo_inexistente_404"`

**C137** - [x] Aluno e atendente sem o papel administrador recebem 403 nas 25 rotas `/api/admin/*` (AC 104)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AdminTests.Sem_papel_admin_403"`

**C138** - [x] `GET /api/admin/artigos` responde 200 com cada artigo, o estado e a versão atual (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Listar_200"`

### S8 - Alunos e administração (P1 importação, P2 resto) · ~10 files · ~60 KB · ~15k

**C139** - [x] `POST /api/admin/matriculas/importacao` com 3 linhas válidas, um CPF já existente e uma matrícula já existente responde 200 com `criados` e `atualizados` corretos; o aluno novo fica sem senha, o existente tem nome e e-mail atualizados e a matrícula existente tem curso, semestre e situação atualizados (AC 105, door 15)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ImportacaoTests.Csv_valido_cria_e_atualiza"`

**C140** - [x] Um CSV com uma linha de CPF inválido, e-mail inválido, curso inexistente, semestre 0 ou 13, situação `TRANCADA` ou matrícula já ligada a outro CPF responde 400 com a linha e o motivo, e nenhuma linha do arquivo é gravada (AC 106)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ImportacaoTests.Linha_invalida_nada_entra"`

**C141** - [x] Uma matrícula que passa a `INATIVA` deixa de ser aceita como `matriculaId` numa transferência nova, e o chamado antigo que a usa continua com ela (AC 107)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ImportacaoTests.Matricula_inativa_sai_das_novas_transferencias"`

**C142** - [x] `POST /api/admin/usuarios` responde 201 com conta ativa; com `senhaTemporaria` de 8 caracteres a conta tem `deveTrocarSenha` verdadeiro, e sem ela a conta fica sem senha (AC 108)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Criar_com_e_sem_senha_temporaria"`

**C143** - [x] Criar usuário sem papel, ou atendente sem setor, responde 400 (AC 109)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Sem_papel_ou_setor_400"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Campos_invalidos_400"`

**C144** - [x] `PUT /api/admin/usuarios/{id}` com `senhaTemporaria` responde 200 e deixa `deveTrocarSenha` verdadeiro (AC 110)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Senha_temporaria_obriga_troca"`

**C145** - [x] `POST /api/admin/usuarios/{id}/desativar` responde 200 e mantém as conversas, chamados, mensagens e eventos do usuário (AC 111)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Desativar_mantem_historico"`

**C146** - [x] Desativar um atendente tira o responsável dos chamados não fechados dele, volta para `ABERTO` os `EM_ATENDIMENTO` e `AGUARDANDO_ALUNO` e grava em cada um evento com o administrador como ator (AC 112)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Desativar_atendente_devolve_chamados"`

**C147** - [x] `PUT` e `desativar` em usuário inexistente respondem 404 (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Usuario_inexistente_404"`

**C148** - [x] Desmarcar o único setor de triagem ou marcar um segundo responde 400 sem gravar (AC 113)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CadastroTests.Triagem_zero_ou_duas_400"`

**C149** - [x] Inserir por SQL um segundo setor com `triagem` verdadeiro na mesma instituição viola `ux_setor_triagem` (door 7)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CadastroTests.Indice_recusa_segundo_setor_de_triagem"`

**C150** - [x] Salvar duas vezes a regra de uma categoria deixa uma única regra, com o destino da segunda (AC 114, Relations)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CadastroTests.Regra_unica_por_categoria"`

**C151** - [x] Regra de setor fixo sem setor responde 400 (AC 115)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CadastroTests.Regra_setor_fixo_sem_setor_400"`

**C152** - [x] Depois de associar o curso ADS ao setor "Coordenação ADS", um chamado novo de categoria com regra de coordenação vai para esse setor (AC 116)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CadastroTests.Curso_com_coordenacao_roteia"`

**C153** - [x] Renomear a categoria "Não classificado" responde 400 (AC 117)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CadastroTests.Renomear_nao_classificado_400"`

**C154** - [x] Em setores, categorias, cursos, regras e respostas prontas: `POST` responde 201, `GET` 200, `PUT` 200 e `PUT` com id inexistente 404 (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CadastroTests.Crud_dos_cadastros"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CadastroTests.Recusas_dos_cadastros_400"`

**C155** - [x] Nome repetido na instituição para setor, categoria e curso, e título repetido no mesmo setor para resposta pronta, respondem 409 (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CadastroTests.Nome_repetido_409"`

### S9 - Prazos automáticos (P2) · ~3 files · ~15 KB · ~4k

**C156** - [x] Com o relógio injetado, uma conversa sem desfecho com a última mensagem há 30 minutos fica `ABANDONADA` na execução seguinte, e uma de 29 minutos continua aberta (AC 118)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AgendadorTests.Conversa_parada_30_min_abandona"`

**C157** - [x] Um chamado `RESOLVIDO` há 7 dias sem confirmação nem rejeição fica `FECHADO` com motivo `FECHADO_AUTOMATICAMENTE` e evento de ator vazio (AC 119)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AgendadorTests.Resolvido_7_dias_fecha_automaticamente"`

**C158** - [x] Uma conversa que recebe mensagem e um chamado rejeitado depois da leitura do agendador e antes da gravação ficam como o aluno deixou (AC 120)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AgendadorTests.Acao_do_aluno_antes_preserva_item"`

**C159** - [x] Quando um item lança exceção, o agendador grava o erro no log com a instituição e processa os outros itens da mesma execução (AC 121)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AgendadorTests.Falha_num_item_segue_os_outros"`

### S10 - E-mail e anexos (P3) · ~7 files · ~40 KB · ~10k

**C160** - [x] Uma resposta pública do atendente gera para o aluno o e-mail "[Univag] ONE-1: nova resposta" com o link `/univag/chamados/ONE-1` (AC 122)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EmailTests.Resposta_publica_gera_email"`

**C161** - [x] Resolver gera o e-mail "[Univag] ONE-1 foi resolvido" com o texto da resolução e o link para confirmar ou rejeitar (AC 123)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EmailTests.Resolucao_gera_email"`

**C162** - [x] Uma nota interna gera 0 linhas em `email_saida` (AC 124)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EmailTests.Nota_interna_nao_gera_email"`

**C163** - [x] A linha de `email_saida` existe depois da ação e não existe quando a transação da ação falha; a execução seguinte do agendador a envia e grava `enviado_em` (AC 125, door 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EmailTests.Email_na_transacao_da_acao"`

**C164** - [x] Com o SMTP falhando, cada uma das 5 tentativas soma 1 a `tentativas`, marca a próxima para 2^`tentativas` minutos e grava a falha no log; depois da 5ª o agendador para, grava a desistência no log, e a ação continua gravada (AC 126)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EmailFalhaTests.Retry_2_a_n_e_desiste_em_5"`

**C165** - [x] Uma resposta pública com um PDF, um JPG e um PNG, o maior com exatamente 10 MB, responde 201 e lista os três anexos na mensagem (AC 127)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoTests.Pdf_jpg_png_ate_10mb"`

**C166** - [x] `GET /api/anexos/{id}` responde 200 com os mesmos bytes enviados e o `Content-Type` original, lidos da coluna `bytea` (door 13)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoTests.Download_devolve_os_mesmos_bytes"`

**C167** - [x] Um `.exe` renomeado para `.pdf` responde 415 e a mensagem não é gravada (AC 128)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoTests.Tipo_desconhecido_415"`

**C168** - [x] Um PDF de 10 MB + 1 byte responde 413 e a mensagem não é gravada (AC 128)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoTests.Acima_de_10mb_413"`

**C169** - [x] Um anexo numa nota interna responde 400 e a nota não é gravada (AC 128)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoTests.Anexo_em_nota_interna_400"`

**C170** - [x] Um anexo pedido por outro aluno ou por atendente de outro setor responde 404 (AC 129)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoTests.Sem_acesso_404"`

### S11 - Indicadores (P2) · ~5 files · ~40 KB · ~10k

**C171** - [x] Sobre uma carga de desfechos conhecidos, `GET /api/indicadores` responde 200 e cada um dos 14 indicadores do Quadro 12 bate com o valor calculado à mão (AC 130)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.Quatorze_indicadores_batem_com_a_conta"`

**C172** - [x] Uma conversa `ABANDONADA` não entra na contagem de autoatendimento (AC 131)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.Abandonada_nao_e_autoatendimento"`

**C173** - [x] Uma conversa com um `sem_base` seguido de uma `resposta` conta 1 vez como pergunta sem artigo (AC 132)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.Sem_base_conta_pergunta_sem_artigo"`

**C174** - [x] Um chamado de 10 horas entre criação e resolução, com 4 horas em `AGUARDANDO_ALUNO`, tem tempo de resolução de 6 horas (AC 133)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.Desconta_aguardando_aluno"`

**C175** - [x] Para atendente, os indicadores contam só chamados que estão ou estiveram nos setores dele, e um `setorId` alheio responde 403 (AC 134)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.Atendente_ve_so_seus_setores"`

**C176** - [x] Aluno pedindo indicadores recebe 403 (AC 135)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.Aluno_403"`

**C177** - [x] Um período sem conversas nem chamados devolve contagens 0, taxas `null` e `semDados` verdadeiro, e a SPA mostra "Sem dados no período" (AC 136)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.Periodo_vazio_sem_dados"`
Proof: `npm --prefix web run test -- -t "Sem dados no período"`

**C178** - [x] `de` posterior a `ate` responde 400 (AC 137)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.De_depois_de_ate_400"`

**C179** - [x] A resposta de indicadores não contém nome, CPF, matrícula nem texto de mensagem presentes na carga (AC 138)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests.Sem_dado_pessoal"`

### S12 - Plataforma e interface (P1) · ~10 files · ~40 KB · ~10k

**C180** - [x] No app rodando pelo `docker compose`, o manifesto tem `name` "One" e ícones de 192 e 512 px, o service worker registra, e depois de uma chamada a `/api/auth/me` o cache do service worker não tem nenhuma entrada `/api/` (AC 139)
Proof: `npm --prefix web run e2e -- -g "manifesto e service worker"`

**C181** - [x] A 360 px de largura, as telas Login, Assistente, Minhas solicitações, Fila, Detalhe do chamado, Artigos e Indicadores têm `scrollWidth` menor ou igual a 360 (AC 140)
Proof: `npm --prefix web run e2e -- -g "sem rolagem horizontal a 360 px"`

**C182** - [x] `web/package.json` fixa `bootstrap` 5.3.8, `react-bootstrap` 2.10.10, `bootstrap-icons` 1.13.2, `react-router` 8 e `vite-plugin-pwa` 2.0.0 (door 9)
Proof: `npm --prefix web run test -- -t "dependências do kit de interface"`

**C183** - [x] As respostas 400, 401, 403, 404, 409, 413, 415 e 429 trazem `title` e `detail` em português e nenhuma traz "One or more validation errors occurred." (AC 141)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ProblemDetailsTests.Detail_em_portugues"`

**C184** - [x] Toda resposta 4xx e 5xx da API tem `Content-Type` `application/problem+json` com `type`, `title`, `status` e `detail`, e `errors` por campo no 400; a SPA mostra o `detail` num `Alert` (AC 142, door 8)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ProblemDetailsTests.Erros_sao_problem_json"`
Proof: `npm --prefix web run test -- -t "erro mostra detail num Alert"`

**C185** - [x] Enquanto uma requisição está pendente, a SPA mostra um `Spinner` e o botão que a disparou fica `disabled` (AC 143)
Proof: `npm --prefix web run test -- -t "requisição pendente mostra Spinner e desabilita o botão"`

**C186** - [x] O cabeçalho das telas autenticadas mostra o nome da instituição da sessão (AC 144)
Proof: `npm --prefix web run test -- -t "cabeçalho mostra a instituição"`

**C187** - [x] `GET /univag/assistente` responde 200 com o `index.html` da SPA servido de `wwwroot`, e `GET /api/inexistente` responde 404 em `application/problem+json`, não o `index.html` (door 10)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SpaTests.Spa_em_slug_e_api_404_em_problem_json"`

### S13 - Extras inspirados no GLPI (P3) · ~6 files · ~30 KB · ~8k

**C188** - [x] Com o relógio injetado, um chamado há 3 dias em `AGUARDANDO_ALUNO` gera uma única vez o e-mail "[Univag] ONE-1 aguarda sua resposta" e um evento de ator vazio; a execução seguinte não gera outro (AC 145)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ExtrasTests.Lembrete_no_3o_dia_uma_vez"`

**C189** - [x] Um chamado há 7 dias em `AGUARDANDO_ALUNO` fica `RESOLVIDO` com o texto "Encerrado por falta de resposta. Se ainda precisar, rejeite esta resolução." e ator vazio, e a rejeição do aluno depois disso responde 200 (AC 146)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ExtrasTests.Resolve_no_7o_dia_aguardando"`

**C190** - [x] `GET /api/respostas-prontas?setorId=` responde 200 ao atendente do setor com a resposta pronta cadastrada, e o chamado guarda só o texto editado que foi enviado (AC 147)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ExtrasTests.Resposta_pronta_guarda_texto_enviado"`

**C191** - [x] `GET /api/respostas-prontas` com `setorId` de um setor que não é do atendente responde 404 (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ExtrasTests.Respostas_prontas_de_outro_setor_404"`

**C192** - [x] Marcar como duplicado de outro chamado do mesmo aluno responde 200, fecha com motivo `DUPLICADO`, guarda o número original, envia "Este pedido continua em ONE-1." como resposta pública e tira o chamado das contagens de indicadores (AC 148)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ExtrasTests.Duplicado_fecha_e_sai_dos_indicadores"`

**C193** - [x] `numeroOriginal` igual ao próprio chamado, de outro aluno ou inexistente responde 400 e nada muda (AC 149)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ExtrasTests.Original_invalido_400"`

**C194** - [x] O aluno marcando duplicado recebe 403, e marcar um chamado `RESOLVIDO` ou `FECHADO` responde 409 (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ExtrasTests.Duplicado_por_aluno_403_e_em_fechado_409"`

**C195** - [x] Um artigo `ATIVO` com `visivelAte` ontem não vai ao provedor, com `visivelDe` hoje vai, e `visivelDe` posterior a `visivelAte` responde 400 (AC 150)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ExtrasTests.Validade_do_artigo"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/instituicoes/{slug}` statuses (2) | 200 C5 · 404 C6 | - |
| `POST /api/auth/login` statuses (4) | 200 C21 · 400 C24 · 401 C25 · 429 C27 | - |
| `POST /api/auth/primeiro-acesso` statuses (3) | 202 C28 · 400 C29 · 429 C27 | - |
| `POST /api/auth/definir-senha` statuses (2) | 204 C33 · 400 C35 | - |
| `POST /api/auth/logout` statuses (1) | 204 C37 | - |
| `GET /api/auth/me` statuses (2) | 200 C38 · 401 C36 | - |
| `POST /api/auth/senha` statuses (3) | 204 C40 · 400 C41 · 401 C36 | - |
| `POST /api/conversas` statuses (5) | 201 C47 · 400 C49 · 401 C36 · 403 C50 · 429 C80 | - |
| `POST /api/conversas/{id}/mensagens` statuses (5) | 200 C48 · 400 C49 · 404 C76 · 409 C74 · 429 C80 | - |
| `GET /api/conversas/{id}` statuses (3) | 200 C77 · 401 C36 · 404 C76 | - |
| `POST /api/conversas/{id}/avaliacao` statuses (4) | 200 C71 · 400 C78 · 404 C76 · 409 C75 | - |
| `POST /api/conversas/{id}/encerrar` statuses (3) | 200 C73 · 404 C76 · 409 C75 | - |
| `POST /api/conversas/{id}/transferir` statuses (4) | 201 C81 · 400 C91 · 404 C76 · 409 C92 | - |
| `POST /api/atendimento-direto` statuses (4) | 201 C82 · 400 C83 · 403 C84 · 429 C85 | - |
| `GET /api/chamados` statuses (2) | 200 C95 · 401 C36 | - |
| `GET /api/chamados/{numero}` statuses (3) | 200 C98 · 401 C36 · 404 C97 | - |
| `POST /api/chamados/{numero}/mensagens` statuses (7) | 201 C102 · 400 C118 · 403 C116 · 404 C97 · 409 C117 · 413 C168 · 415 C167 | - |
| `POST /api/chamados/{numero}/assumir` statuses (4) | 200 C101 · 403 C116 · 404 C97 · 409 C115 | - |
| `POST /api/chamados/{numero}/resolver` statuses (5) | 200 C106 · 400 C107 · 403 C116 · 404 C97 · 409 C115 | - |
| `POST /api/chamados/{numero}/confirmar` statuses (4) | 200 C108 · 403 C116 · 404 C97 · 409 C115 | - |
| `POST /api/chamados/{numero}/rejeitar` statuses (5) | 200 C109 · 400 C110 · 403 C116 · 404 C97 · 409 C111 | - |
| `POST /api/chamados/{numero}/cancelar` statuses (4) | 200 C114 · 403 C116 · 404 C97 · 409 C115 | - |
| `POST /api/chamados/{numero}/encaminhar` statuses (5) | 200 C123 · 400 C124 · 403 C116 · 404 C97 · 409 C115 | - |
| `POST /api/chamados/{numero}/reclassificar` statuses (5) | 200 C126 · 400 C127 · 403 C116 · 404 C97 · 409 C115 | - |
| `POST /api/chamados/{numero}/duplicado` statuses (5) | 200 C192 · 400 C193 · 403 C194 · 404 C97 · 409 C194 | - |
| `GET /api/respostas-prontas` statuses (3) | 200 C190 · 401 C36 · 404 C191 | - |
| `GET /api/anexos/{id}` statuses (3) | 200 C166 · 401 C36 · 404 C170 | - |
| `GET /api/artigos/versoes/{id}` statuses (3) | 200 C79 · 401 C36 · 404 C63 | - |
| `/api/admin/artigos` GET, POST, PUT statuses (5) | 200 C138 · 201 C128 · 400 C129 · 403 C137 · 404 C136 | - |
| `/api/admin/artigos/{id}/ativar` e `/arquivar` statuses (4) | 200 C133 · 403 C137 · 404 C136 · 409 C135 | - |
| `/api/admin/usuarios` GET, POST, PUT statuses (6) | 200 C144 · 201 C142 · 400 C143 · 403 C137 · 404 C147 · 409 C10 | - |
| `/api/admin/usuarios/{id}/desativar` statuses (3) | 200 C145 · 403 C137 · 404 C147 | - |
| `/api/admin/matriculas/importacao` statuses (3) | 200 C139 · 400 C140 · 403 C137 | - |
| `/api/admin/setores`, `/api/admin/categorias`, `/api/admin/cursos`, `/api/admin/regras`, `/api/admin/respostas-prontas` statuses (6) | 200 C154 · 201 C154 · 400 C148 · 403 C137 · 404 C154 · 409 C155 | - |
| `GET /api/indicadores` statuses (3) | 200 C171 · 400 C178 · 403 C176 | - |
| comando `instituicao criar` saídas (2) | 0 C1 · 1 C2 | - |
| comando `instituicao carga` saídas (2) | 0 C3 · 1 C4 | - |
| rotas privadas sem cookie (49) | C36, table-driven over all 49 | - |
| rotas com `{id}` ou `{numero}` de outra instituição (27) | C7, table-driven over all 27 | - |
| ids de outra instituição no corpo (4) | `categoriaId` C8 · `setorId` C8 · `matriculaId` C8 · `numeroOriginal` C8 | - |
| rotas `/api/admin/*` sem papel administrador (25) | C137, table-driven over all 25 | - |
| rotas de chamado vistas por atendente de outro setor (10) | C97, table-driven over all 10 | - |
| matriz ação x estado do chamado (45) | C115, table-driven over all 45 | - |
| matriz ação x papel do chamado (18) | C116, table-driven over all 18 | - |
| transições de estado do chamado (14) | ABERTO→EM_ATENDIMENTO por assumir C101 · por resposta C102 · EM_ATENDIMENTO→AGUARDANDO_ALUNO C104 · AGUARDANDO_ALUNO→EM_ATENDIMENTO C105 · →RESOLVIDO C106 · RESOLVIDO→FECHADO `CONFIRMADO` C108 · RESOLVIDO→EM_ATENDIMENTO C109 · RESOLVIDO→ABERTO C113 · →FECHADO `CANCELADO` C114 · RESOLVIDO→FECHADO `FECHADO_AUTOMATICAMENTE` C157 · →ABERTO por encaminhamento C123 · →ABERTO por desativação C146 · AGUARDANDO_ALUNO→RESOLVIDO C189 · →FECHADO `DUPLICADO` C192 | - |
| desfechos da conversa (4) | `RESOLVIDA_AUTOATENDIMENTO` C71 · `TRANSFERIDA` C81 · `ENCERRADA_PELO_ALUNO` C73 · `ABANDONADA` C156 | - |
| `tipo` devolvido pelo modelo (5) | `resposta` C54 · `pergunta` C64 · `sem_base` C66 · `transferir` C67 · desconhecido C68 | - |
| falhas do provedor (5) | C68, table-driven over all 5 | - |
| rebaixamentos para `sem_base` (9) | trecho ausente C58 · artigo sem trecho C58 · artigo inválido C59 · link alheio C60 · terceira pergunta C65 · pergunta com 201 caracteres C65 · pergunta sem "?" C65 · falha do provedor C68 · trecho fora de 20 a 400 C57 | - |
| conferência do trecho (door 19) (4) | maiúsculas e espaços C55 · acento C56 · pontuação C56 · limites 19/20/400/401 C57 | - |
| máscara antes do provedor (6) | C51, table-driven over all 6 | - |
| origem da categoria (3) | `IA` C89 · `ARTIGO` C89 · `PADRAO` C89 | - |
| destino do roteamento (5) | setor fixo C90 · coordenação do curso C90 · sem regra C90 · "Não classificado" C90 · curso sem coordenação C90 | - |
| motivos de recusa do CSV (6) | C140, table-driven over all 6 | - |
| tipos de anexo (4) | PDF C165 · JPG C165 · PNG C165 · outro C167 | - |
| tipos de evento (8) | C120, table-driven over all 8 | - |
| tabelas append-only x UPDATE e DELETE (10) | C122, table-driven over all 10 | - |
| tentativas de e-mail (5) | C164, table-driven over all 5 | - |
| indicadores do Quadro 12 (14) | C171, table-driven over all 14 | - |
| status de erro em português (8) | C183, table-driven over all 8 | - |
| telas a 360 px (7) | C181, table-driven over all 7 | - |
| papéis e tela inicial (3) | aluno C42 · atendente C42 · administrador C42 | - |
| entidades de Relations com instituição e filtro (20) | C16, table-driven over all 20 | - |
| restrições de Relations (11) | slug único C2 · slug imutável C18 · CPF e e-mail únicos na instituição C10 · matrícula única na instituição C140 · número do chamado C86 · um chamado por conversa C92 · um setor de triagem C149 · uma regra por categoria C150 · número de versão único C132 · token só em hash e de uso único C35 · append-only C122 | - |
| one-way doors (19) | 1 C19 · 2 C20 · 3 C22 · 4 C53 · 5 C87 · 6 C122 · 7 C149 · 8 C184 · 9 C182 · 10 C187 · 11 C31 · 12 C13 · 13 C166 · 14 C119 · 15 C139 · 16 C15 · 17 C18 · 18 C94 · 19 C55 | - |
| startup config: `DbContext` com filtro de instituição (3 places) | requisição HTTP C7 · agendador C13 · comando `instituicao` C1 | - |
| startup config: cookie, limitador, `ProblemDetails`, `HttpClient` do provedor (2 assemblies) | app no contêiner C180 · host de teste `WebApplicationFactory<Program>` C21 | - |

- Claims naming a status code, route or response shape: todas as provas `api.Tests` atravessam o
  HTTP pelo `WebApplicationFactory<Program>`, menos C15 a C20, C55 a C57, C122, C132 e C149, que
  afirmam regras do modelo, do banco ou do conferidor e as testam na camada delas
- As duas configurações de inicialização compartilham o mesmo `Program.cs`; C180 é a única prova
  contra o contêiner real
- Nenhuma outra check afirma mais do que o caso que a prova exercita

## Test policy

O repositório ainda não tem código nem guia de testes, então estas linhas são a regra deste build.
Elas não vão para um arquivo de diretrizes; ficam aqui.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide e é alcançado por HTTP: máquina de estados do chamado, roteamento, origem da categoria, rebaixamento para `sem_base`, importação do CSV | uma prova na fronteira, tabelada | um caso afirmado por linha da tabela de decisão, na fronteira; a tabela vive no teste |
| Decide e não depende de HTTP: conferência do trecho, máscara de números e e-mails, agendador | uma na própria camada | um caso por linha, com os limites (19, 20, 400, 401; 29 e 30 minutos; 7 dias e 7 dias e 1 minuto) |
| Entrada que não decide | uma na fronteira | entrada aceita, cada recusa, cada erro |
| Instrumentação, repasses | nenhuma própria | coberta pela prova de quem a usa |

Evidence (do plano, porque o código não existe; não há análogo no repositório para citar):

- máquina de estados do chamado: 9 ações x 5 estados = 45 células (C115) e 9 ações x 2 papéis = 18 (C116) -> decide, na fronteira
- roteamento: 5 destinos (C90); origem da categoria: 3 origens mais a sugestão inválida (C89) -> decide, na fronteira
- rebaixamento para `sem_base`: 9 caminhos (C57 a C60, C65, C68) -> decide, na fronteira, com a conferência na própria camada (C55 a C57)
- importação: 6 motivos de recusa (C140) -> decide, na fronteira
- máscara: 6 formatos (C51) -> decide, própria camada pelo corpo enviado ao provedor falso

Cost: 0 provas além das 195 já escritas; as tabelas de decisão já estão nas provas tabeladas.
Sem estas linhas, a matriz do chamado poderia ser provada só pelo caminho feliz do S5.

## Swept

- validation: C2, C4, C24, C34, C49, C83, C107, C129, C130, C140, C155, C167, C168, C178, C193
- failure modes: C4, C58, C68, C140, C159, C163
- idempotency: C35, C75, C92, C158
- authorization: C7, C36, C39, C50, C62, C97, C100, C116, C137, C175
- concurrency: C87, C92, C119, C158
- data lifecycle: C121, C122, C134, C141, C145
- dependency failure: C32, C68, C164
- state transitions: C75, C115, C116
- observability: C58, C60, C70, C159, C164

## Handoff

O repositório não existe, então o tamanho é estimado pelo código que cada slice vai criar (bytes
estimados / 4), mais o contexto fixo que todo builder lê: `plan.md` 76 KB e este `checks.md`
64 KB, cerca de 35k. Cada lote depois do primeiro lê também o código já existente que vai tocar,
estimado em 30k.

- Um builder para tudo: 152k de código (soma dos slices) + 35k = 187k, acima do budget de 150k
- Corte proposto, nas mudanças de superfície e nas datas do roadmap:
  - Lote 1, fundação e assistente (S1, S2, S12, S3), para o AVA em 13/11: 15k + 14k + 10k + 20k = 59k + 35k = 94k
  - Lote 2, transferência, atendimento e importação (S4, S5, S8), para a banca em 20/11: 11k + 23k + 15k = 49k + 35k + 30k = 114k
  - Lote 3, P2 (S6, S7, S9, S11): 3k + 9k + 4k + 10k = 26k + 35k + 30k = 91k
  - Lote 4, P3 (S10, S13): 10k + 8k = 18k + 35k + 30k = 83k
- Mechanism: handoff, 4 lotes sequenciais, cada um só começa com as provas do anterior verdes (escolha do usuário em 01/11/2026)
- Lote 1 (S1, S2, S12, S3) fechado em verde: 74 checks marcados `[x]`. Ficam abertos 14 checks do lote 1 cuja prova depende de rotas ou telas dos lotes seguintes; o teste de cada um já existe e cobre o que o lote 1 entrega, e quem criar a parte que falta estende a mesma tabela do teste (comentário no teste indica onde): C7 (`IsolamentoTests`, faltam as rotas de chamado, anexo e administração até 27), C8 (teste não escrito: os ids no corpo chegam com S4, S6 e S13), C10 (S8, `UsuarioAdminTests`), C12 (S11), C13 (agendador e `email_saida`, S10; o agendador deve ficar em `api/Agendador.cs`, o único arquivo além do comando que C17 aceita com `IgnoreQueryFilters`), C36 (`SessaoTests` lê as rotas do próprio app; falta conferir que são 49), C44 (`CpfTests`, faltam as respostas de chamado, fila e indicadores), C62 (`SigiloTests`, faltam `GET /api/chamados` e `GET /api/chamados/{numero}`), C75 e C76 (`ConversaTests`, falta a transferência), C79 (API pronta em `VersaoCitadaTests`; falta o aviso no detalhe do atendente, S5, e o teste Vitest "aviso de artigo atualizado"), C181 (faltam 5 das 7 telas na lista do e2e), C183 e C184 (`ProblemDetailsTests.Erros()`, faltam 413 e 415 do S10). As tabelas `chamado`, `mensagem_chamado`, `anexo`, `evento_chamado`, `resposta_pronta`, `atendente_setor` e `email_saida` já existem com chave e `instituicao_id` (C16); os lotes seguintes acrescentam colunas por migração nova
- Decidido no meio do build, sem o usuário: chave do provedor em `Llm:ChaveApi` como diz a door 4 (o pedido ao builder dizia `Llm:ApiKey`); o token de primeiro acesso é `<slug>.<32 bytes base64url>` para achar a instituição sem sair do filtro global, e o SHA-256 guardado é o do token inteiro; o tamanho de 20 a 400 do trecho vale para o texto como o modelo devolveu (C55 só passa assim) e a busca vale para os textos normalizados; os limites de taxa leem `Limites:AuthPorMinuto` e `Limites:MensagensPorMinuto` (padrão 5 e 10) para os testes subirem o teto; formato do arquivo de carga na nova linha 20 de `Landing`, registrada no commit do código e não antes dele
- Lote 2 (S4, S5, S8) fechado em verde: 68 checks marcados `[x]` (142 no total), com `dotnet test api.Tests` 146 verdes, `npm --prefix web run test` 25 verdes e o e2e "sem rolagem horizontal a 360 px" 5 verdes contra `vite preview`. Também fechados do lote 1: C10, C62, C75, C76, C79. As rotas do S6 (encaminhar, reclassificar) foram feitas neste lote porque a matriz do S5 (C115, C116) as exercita; C123 a C127 provados. Continuam abertos: C7 (faltam anexo, artigos do admin e duplicado para as 27), C8 (`numeroOriginal`, S13), C12, C13, C36 (contar as 49 quando todas existirem), C44 (indicadores), C120 (evento `ANEXO`, S10), C137 (artigos do admin, S7; o teste já lê as rotas `/api/admin/*` do app), C181 (Artigos e Indicadores), C183, C184
- Decidido no meio do lote 2, sem o usuário:
  - estados x ações além do que o plano fixa: nota e reclassificar valem também em `RESOLVIDO`; resolver vale em `ABERTO` e torna responsável quem resolve; resposta pública do atendente em `RESOLVIDO` é 409; qualquer atendente do setor age no chamado, não só o responsável; assumir sendo já o responsável é 409
  - toda ação de chamado, inclusive `POST mensagens` (201), devolve o detalhe do chamado e não só a mensagem; `POST mensagens` lê formulário (urlencoded ou multipart) com `tipo` `PUBLICA` ou `NOTA`
  - o aluno não recebe `eventos` nem a chave `fontes` no detalhe; o evento de criação tem ator vazio (Sistema)
  - importação: `criados` e `atualizados` contam matrículas (uma por linha); motivo a mais "e-mail já usado por outro CPF"
  - xmin divergente e chave única violada viram 409 em todo o app (`StatusCodeSelector` do `ExceptionHandler`)
  - regra para "Não classificado" é recusada com 400; desativar atendente tira o responsável também dos `RESOLVIDO`, sem mudar o estado
  - índices únicos novos (migração `Lote2`): nome de setor, categoria e curso por instituição; título de resposta pronta por setor
  - POST sem corpo numa rota com corpo JSON cai no fallback 404 de `/api` (política de `Accepts` do roteamento); a SPA sempre envia `{}`
- Não construído no lote 2: telas de administração (usuários, importação de matrículas e cadastros só pela API) e os botões de encaminhar e reclassificar no detalhe do chamado
- Lote 3 (S6 na tela, S7, S9, S11) fechado em verde: 28 checks marcados (170 no total), com `dotnet test api.Tests` 171 verdes, `npm --prefix web run test` 28 verdes e o e2e "sem rolagem horizontal a 360 px" 7 verdes contra `vite preview`. Fechados também do lote 1: C12, C13, C44, C181. Continuam abertos: C7 (faltam anexo e duplicado), C8 (`numeroOriginal`), C36 (hoje 46 rotas privadas; as 49 fecham com `GET /api/anexos/{id}`, `GET /api/respostas-prontas` e `POST duplicado`), C120 (evento `ANEXO`), C183, C184 e os 25 checks do lote 4 (S10, S13)
- Decidido no meio do lote 3, sem o usuário:
  - indicadores com escopo de setor (atendente, ou administrador com `setorId`) devolvem `null` nos indicadores de conversa (alunos ativos, conversas, as 4 taxas de conversa, ranking por conversas e indicador principal), porque conversa não pertence a setor
  - período por data de criação para conversas e chamados, como diz a seção I; "chamados resolvidos" e as taxas de roteamento e reabertura usam os chamados com transição para `RESOLVIDO` dentro do período; "chamados abertos" é o retrato do momento da consulta; tempos em horas, médias; taxas de 0 a 1 com 4 casas
  - "estiveram nos setores dele" é lido pelo nome do setor de origem nos eventos `ENCAMINHAMENTO` (o evento guarda nomes); renomear um setor apaga esse histórico para o atendente
  - o agendador separa `Ler()` de `Processar()` e cada gravação reconfere a condição (`UPDATE ... WHERE`), o que prova o AC 120 sem gancho de teste; o laço fica desligado nos testes (`Agendador:Ativo=false`), que chamam `Executar()` com o relógio falso
  - o agendador já envia a fila `email_saida` com a regra de 5 tentativas e 2^n minutos (necessário para o C13); a gravação dos e-mails pelas ações e as provas C160 a C164 ficam para o lote 4
  - o detalhe do chamado traz para a equipe `setores` e `categorias` ativos, destinos de encaminhar e reclassificar
  - artigo: resposta até 8000 caracteres e título até 200; categoria precisa existir (pode estar inativa); `api()` da SPA aceita `PUT`
- Não construído ainda: telas de administração de usuários, importação de matrículas e cadastros (só pela API); seletor de setor na tela de Indicadores para o administrador
- Lote 4 (S10, S13) fechado em verde: os 195 checks marcados, com `dotnet test api.Tests` 190 verdes, `npm --prefix web run test` 32 verdes, o e2e "sem rolagem horizontal a 360 px" com 10 telas verdes contra `vite preview` e o e2e "manifesto e service worker" verde contra o contêiner reconstruído (`docker compose up -d --build`, migração `Lote4` aplicada na subida). Fechados também: C7 (27 rotas), C8 (com `numeroOriginal`), C36 (49 rotas privadas), C120 (evento `ANEXO`), C183 e C184 (413 e 415)
- Decidido no meio do lote 4, sem o usuário:
  - e-mail também na resolução automática por falta de resposta (AC 146 resolve, e AC 123 diz que toda resolução avisa) e na marcação de duplicado (é resposta pública de atendente, AC 122)
  - o aluno pode anexar arquivos na própria resposta e na rejeição por mensagem; anexo só é recusado em nota interna
  - o tipo do anexo guardado e devolvido é o da assinatura do arquivo, não o `Content-Type` enviado
  - novas colunas em `chamado`: `aguardando_desde` e `lembrete_em` (prazos do S13) e `numero_original`; em `artigo`: `visivel_de` e `visivel_ate` (`date`); em `anexo`: nome, tipo, tamanho e conteúdo `bytea`
  - o lembrete grava um evento `LEMBRETE`, tipo a mais além dos 8 do AC 92
  - o detalhe do chamado traz `setorId` (para as respostas prontas) e `numeroOriginal`; cada mensagem traz a lista de anexos
- Telas de administração feitas depois do lote 4, sem check próprio no plano: Usuários, Matrículas (importação com confirmação e tabela de erros por linha) e Cadastros (setores, categorias, cursos, regras e respostas prontas, em abas); testes Vitest para a importação, o atendente novo e a regra por coordenação, e as três telas entraram no e2e de 360 px
- Verificação, rodada 1 (FAIL, `verification.md`), corrigida na rodada 2 com autorização do usuário em 02/11/2026:
  - mutante F5 sobrevivente (`Transferencia.cs:30`, primeiro em vez do último): `Chamado_guarda_contexto` (C88) passou a ter três resumos e `Origem_da_categoria` (C89), conversas com várias sugestões e vários artigos citados; o mutante agora derruba os dois testes
  - C164: o filtro da prova apontava `EmailTests`, que não tem esse teste; corrigido para `EmailFalhaTests.Retry_2_a_n_e_desiste_em_5` (correção de seletor autorizada pelo usuário; a afirmação não mudou)
  - Test policy, linha "entrada que não decide": provas novas `UsuarioAdminTests.Campos_invalidos_400` (em C143) e `CadastroTests.Recusas_dos_cadastros_400` (em C154), uma recusa por campo
  - 429 em `POST /api/conversas/{id}/mensagens`: asserção a mais em `RateLimitTests.Onze_mensagens_em_60s_429` (C80)
  - `duplicado` por atendente de outro setor: rota a mais em `VisibilidadeTests.RotasDoChamado` (C97, e por tabela C7)
  - AC 10, fuso no agendador: o lembrete do 3º dia passa a trazer "desde dd/mm/aaaa hh:mm (horário da instituição)" no fuso da instituição do item, e `AgendadorTests.Item_usa_fuso_nome_e_remetente_da_sua_instituicao` (C13) confere isso em Cuiabá (UTC-4) e São Paulo (UTC-3)
- Verificação, rodada 2 (FAIL só na linha "entrada que não decide" da Test policy), corrigida na rodada 3: `CadastroTests.Recusas_dos_cadastros_400` (C154) passou a cobrir nome vazio e longo demais em setores (101), categorias (101) e cursos (201) e título de resposta pronta com 201, conferindo que nada foi gravado; `UsuarioAdminTests.Campos_invalidos_400` (C143), nome com 201; `ChamadoFluxoTests.Mensagem_sem_texto_400` (C118), mensagem de 4001 recusada e de 4000 aceita
- Verificação, rodada 3 (FAIL: 4 recusas de entrada sem teste); o usuário autorizou em 02/11/2026 uma 4ª rodada, além do limite de 3. Correção, só testes: senha vazia no login (C24, `LoginTests.Cpf_invalido_400_sem_consultar_senha`); justificativa de cancelamento 4001 recusada e 4000 aceita (C114); `setorId` inexistente nos indicadores do administrador (C178); importação sem arquivo (C140); e os limites anotados como imprecisão: título 201 e resposta 8001 de artigo, com 200 e 8000 aceitos (C129), motivo de encaminhamento 4001 (C124). Na varredura de todas as recusas das rotas antes de entregar (lição L-003), mais dois limites sem teste: nova senha com 129 na troca de senha (C41) e motivo de rejeição com 4001 (C110)
- Verificação, rodada 4 (FAIL: 5 motivos da importação de CSV fora do AC 106, que respondem por `ErrosCsv` e não por `Problemas.Invalido`). Correção, só testes e o texto de um motivo: `ImportacaoTests.Linha_invalida_nada_entra` (C140) ganhou e-mail de outro CPF, nome vazio e com 201, matrícula vazia e com 21, linha sem 7 campos, e cabeçalho errado e arquivo vazio (linha 1); o motivo do nome passou de "nome vazio" para "nome vazio ou com mais de 200 caracteres". Na mesma varredura, o comando `instituicao carga` tinha 16 validações e 1 testada: prova nova `InstituicaoComandoTests.Carga_cada_recusa_sai_1` (em C4), uma por validação, mais slug inexistente, arquivo inexistente e JSON inválido. A Coverage "motivos de recusa do CSV" continua com os 6 do AC 106; os outros 7 estão nesta prova
- Abandonado: nada
