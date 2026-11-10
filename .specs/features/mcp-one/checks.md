# MCP do One checks

Profile: ui
Plan: `.specs/features/mcp-one/plan.md`

37 checks em 4 fatias · 6 portas de mão única · 1 pergunta aberta, que bloqueia só o go-live

Comandos: `dotnet test One.Api.Tests --filter "FullyQualifiedName~<Classe>.<Método>"` (Postgres, MinIO e Mailpit do compose no ar; confirmado em 10/11 com um teste existente) e `npm --prefix web test -- --run <arquivo> -t "<nome>"`. Os testes da API usam `FakeTimeProvider`, `LlmFalso` e o `OneFactory`; o token do cliente MCP é criado pela própria rota `POST /api/admin/mcp/tokens`.

## Checks

### S1 - o administrador gera, vê e revoga tokens · API · ~8 arquivos · ~60 KB · ~15k

**C1** - `POST /api/admin/mcp/tokens` com `nome` `"Cursor"` e `dias` 90 responde `201` com exatamente as chaves `id`, `nome`, `token`, `final`, `criadoEm`, `expiraEm`; `token` casa `^onemcp_<slug>\.[A-Za-z0-9_-]{43}$`, `final` são os 4 últimos caracteres do token, `expiraEm - criadoEm` = 90 dias; a linha em `token_mcp` tem `hash` = SHA-256 hex do token e nenhuma coluna contém o token em claro (AC 1, doors 1 e 2)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAdminTests.Criar_devolve_o_token_uma_vez_e_grava_so_o_hash"`

**C2** - `POST /api/admin/mcp/tokens` responde `400` com `errors.nome` para `nome` vazio e para `nome` de 61 caracteres, e `errors.dias` para `dias` 29, 366 e ausente; com `nome` de 60 caracteres e `dias` 30, 90 e 365 responde `201`; em nenhum `400` a tabela ganha linha (AC 2)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAdminTests.Criar_valida_nome_e_dias"`

**C3** - O sexto token do mesmo usuário responde `409` com `Você já tem 5 tokens ativos. Revogue um para criar outro.`; um token revogado e um vencido não contam (com 5 ativos mais 1 revogado e 1 vencido, a criação ainda responde `409`; revogando um ativo, responde `201`); o limite é por usuário (outro administrador cria o primeiro) (AC 3)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAdminTests.Criar_limita_a_5_ativos_por_usuario"`

**C4** - `GET /api/admin/mcp` responde `200` com `url` = `http://localhost:8080/api/mcp/<slug>` e `tokens` do mais novo para o mais antigo, cada um só com `id`, `nome`, `usuario`, `final`, `criadoEm`, `expiraEm`, `ultimoUsoEm`, `estado`; com um token ativo, um vencido e um revogado os `estado` são `ATIVO`, `EXPIRADO` e `REVOGADO`; o corpo não contém o token nem o hash; tokens de outra instituição não aparecem (AC 4)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAdminTests.Listar_mostra_url_estados_e_nao_vaza_segredo"`

**C5** - `DELETE /api/admin/mcp/tokens/{id}` responde `204` e grava `revogado_em` = agora; repetido responde `204` e `revogado_em` continua o da primeira vez; um administrador revoga o token de outro administrador da mesma instituição (AC 5)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAdminTests.Revogar_e_idempotente"`

**C6** - `DELETE /api/admin/mcp/tokens/{id}` responde `404` para um `id` que não existe e para o `id` de um token de outra instituição, e o token da outra instituição continua sem `revogado_em` (AC 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAdminTests.Revogar_inexistente_ou_de_outra_instituicao_da_404"`

**C7** - As 3 rotas de `/api/admin/mcp` respondem `403` para `ATENDENTE`, `ALUNO` e `OPERADOR` e `401` sem sessão (12 combinações) (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAdminTests.Rotas_exigem_administrador"`

**C38** - `TokenMcp` decide o estado pelo relógio: `ATIVO` antes de `expira_em`, `EXPIRADO` em `expira_em` exatamente e depois, `REVOGADO` quando há `revogado_em` mesmo antes do vencimento e mesmo depois dele; `Revogar` duas vezes mantém a primeira data; `RegistrarUso` só grava quando passou 1 minuto do `ultimo_uso_em` (AC 4, 5, 13)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~TokenMcpDominioTests"`

**C39** - A tabela `token_mcp` recusa dois tokens com o mesmo `hash` (`DbUpdateException` na segunda gravação, mesmo em instituições diferentes), e `Modelo_sem_mudanca_pendente` passa com a migration nova (door 1)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAdminTests.Hash_e_unico_no_banco"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Modelo_sem_mudanca_pendente"`

### S2 - o cliente MCP entra com o token · API · ~4 arquivos · ~40 KB · ~10k

**C8** - `POST /api/mcp/<slug>` com `Authorization: Bearer <token ativo>` e `initialize` seguido de `tools/list` responde `200` e a lista tem exatamente, nesta ordem de nome ordenado, `buscar_conhecimento`, `listar_chamados`, `ver_chamado`, `ver_indicadores`; a resposta não traz o cabeçalho `Mcp-Session-Id` (door 3, door 4: modo sem sessão) (AC 8)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAcessoTests.Lista_as_quatro_ferramentas_sem_sessao"`

**C9** - `POST /api/mcp/<slug>` responde `401` com cabeçalho `WWW-Authenticate: Bearer` e nenhuma ferramenta executa, para: sem `Authorization`; `Bearer lixo`; `Bearer onemcp_<slug>.` com a parte secreta vazia; `Bearer onemcp_<slug>.<43 caracteres válidos que não existem>`; esquema `Basic` (AC 9)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAcessoTests.Recusa_token_ausente_malformado_ou_desconhecido"`

**C10** - Um token revogado responde `401` na próxima requisição (a que vem logo depois do `DELETE`), e um token vencido responde `401` quando o relógio passa de `expira_em` (um segundo antes ainda responde `200`) (AC 10)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAcessoTests.Recusa_token_revogado_e_vencido"`

**C11** - O token de `<slug A>` usado em `/api/mcp/<slug B>` responde `401`, e em `/api/mcp/<slug A>` responde `200` (AC 11)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAcessoTests.Recusa_slug_diferente_do_token"`

**C12** - Um token ativo responde `401` quando a instituição está inativa, quando o usuário está inativo, quando `DeveTrocarSenha` é verdadeiro, e quando o usuário perdeu os papéis `ATENDENTE` e `ADMINISTRADOR` (fica só `ALUNO`) (AC 12)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAcessoTests.Recusa_quando_instituicao_ou_usuario_nao_valem_mais"`

**C13** - Três requisições com o mesmo token em 30 segundos gravam `ultimo_uso_em` uma vez (o instante da primeira); uma quarta, 61 segundos depois da primeira, grava de novo (AC 13)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAcessoTests.Grava_ultimo_uso_no_maximo_uma_vez_por_minuto"`

**C14** - Com `Limites:McpPorMinuto` = 3, a quarta requisição do mesmo token em 60 segundos responde `429` e outro token na mesma janela ainda responde `200` (AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAcessoTests.Limita_requisicoes_por_token"`

**C15** - O cookie `one.auth` de um administrador em `POST /api/mcp/<slug>` responde `401`; o token MCP em `GET /api/auth/me`, `GET /api/chamados` e `GET /api/admin/mcp` responde `401` (AC 15, door 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAcessoTests.Cookie_e_token_nao_se_misturam"`

### S3 - as quatro ferramentas · API · ~5 arquivos · ~55 KB · ~14k

**C16** - `listar_chamados` sem argumentos (`escopo` = `fila`) devolve, para um `ATENDENTE` do setor, os mesmos `numero` dos de `GET /api/chamados?escopo=fila`, na mesma ordem, com `categoria`, `responsavel` e `dias`; com `escopo` = `meus` devolve os de `GET /api/chamados`; com 52 chamados na fila devolve `itens` de tamanho 50 e `total` 52 (AC 16)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Listar_chamados_igual_a_rota_e_corta_em_50"`

**C17** - `listar_chamados` com `escopo` = `todos` e com `estado` = `INEXISTENTE` responde erro de ferramenta (`isError` = true) cujo texto lista `fila`, `meus` e os estados de chamado aceitos (AC 17)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Listar_chamados_recusa_argumento_invalido"`

**C18** - `ver_chamado` de um chamado do setor do `ATENDENTE` devolve exatamente as chaves `numero`, `titulo`, `estado`, `categoria`, `setor`, `responsavel`, `solicitante`, `curso`, `semestre`, `criadoEm`, `resolvidoEm`, `resumo`, `mensagens`, `eventos`; `mensagens` e `eventos` têm os mesmos textos e tipos que `GET /api/chamados/{numero}` dá a ele, inclusive nota interna; o texto serializado não contém o número da matrícula nem o nome de um anexo existente no chamado; para o papel `LIDER` não há matrícula e os dois casos seguem a rota (AC 18)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Ver_chamado_igual_a_rota_sem_anexo_nem_matricula"`

**C19** - `ver_chamado` responde erro de ferramenta com o texto exato `Chamado não encontrado.` para um número que não existe, para o de outra instituição e para um chamado de setor que o dono do token não atende (AC 19)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Ver_chamado_nao_vaza_existencia"`

**C20** - `buscar_conhecimento` com `consulta` e `limite` 2 devolve 2 fontes em ordem de distância ao vetor da consulta, cada uma com `tipo`, `titulo`, `texto`, `links`; com um artigo `ATIVO`, um `ARQUIVADO`, um documento `ATIVO` e um artigo `ATIVO` de outra instituição semeados, só o ativo da instituição e o documento ativo aparecem; sem `limite` devolve no máximo 5 (AC 20)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Buscar_conhecimento_so_ativos_da_instituicao"`

**C21** - `buscar_conhecimento` responde erro de ferramenta `Seu papel não tem acesso à base de conhecimento.` quando o dono do token só atende setor de liderança de curso (AC 21)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Buscar_conhecimento_recusa_so_lideranca"`

**C22** - `buscar_conhecimento` responde erro de ferramenta `A busca está indisponível agora. Tente de novo em instantes.` quando o serviço de embeddings do `LlmFalso` responde `500`, e o texto do erro não contém a mensagem da exceção (AC 22)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Buscar_conhecimento_quando_embedding_falha"`

**C23** - `buscar_conhecimento` responde erro de ferramenta citando o limite para `consulta` vazia, `consulta` de 501 caracteres, `limite` 0 e `limite` 11; aceita `consulta` de 1 e de 500 caracteres e `limite` 1 e 10 (AC 23)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Buscar_conhecimento_valida_os_limites"`

**C24** - `ver_indicadores` com `de` e `ate` devolve um `Resultado` com os mesmos valores de `GET /api/indicadores?de=&ate=` para o mesmo usuário, com e sem `setorId` (AC 24)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Ver_indicadores_igual_a_rota"`

**C25** - `ver_indicadores` responde erro de ferramenta com o texto que a rota daria quando: `de` > `ate`; `de` ausente; `setorId` de setor que o `ATENDENTE` não tem (`Este setor não é seu.`); dono só de liderança (AC 25)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Ver_indicadores_repete_os_erros_da_rota"`

**C26** - Executar as 4 ferramentas (cada uma com sucesso e com erro) não muda nenhuma linha de nenhuma tabela, exceto `token_mcp.ultimo_uso_em`: a contagem e o hash do conteúdo de cada tabela antes e depois são iguais (AC 26)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Ferramentas_nao_gravam_nada"`

**C27** - Cada execução de ferramenta gera uma linha de log `Information` com o nome da ferramenta, o id do usuário, o id da instituição e `ok` ou `erro`; o log não contém o argumento enviado (uma `consulta` com marcador único) nem o texto do resultado (AC 27)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Registra_ferramenta_usuario_e_resultado_sem_conteudo"`

### S4 - a aba MCP · web · ~4 arquivos · ~30 KB · ~8k

**C28** - `/univag/integracoes?aba=mcp` como administrador mostra a aba `MCP` selecionada e sem o texto `Em breve`, a URL do servidor com `Copiar`, e uma tabela com os cabeçalhos `Nome`, `Dono`, `Final`, `Criado`, `Vence`, `Último uso`, `Estado`, uma linha por token na ordem da resposta (AC 28)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "aba MCP lista os tokens"`

**C29** - Preencher `Nome` = `Cursor`, deixar a validade em `90 dias` (as opções são `30 dias`, `90 dias` e `365 dias`) e enviar chama `POST /api/admin/mcp/tokens` com o corpo `{nome:'Cursor',dias:90}`, mostra o token inteiro com `Copiar`, o texto `Copie agora: o token não será mostrado de novo.` e o comando `claude mcp add --transport http one <url> --header "Authorization: Bearer <token>"` com o token real, e a tabela ganha a linha (AC 29)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "cria o token e mostra uma vez"`

**C30** - Fechar o painel do token recém-criado remove da página o token inteiro e o comando com ele; a linha mostra só o `Final` (AC 30)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "fecha o painel e esconde o token"`

**C31** - `Revogar` numa linha `ATIVO` abre a confirmação `Revogar o token «Cursor»?`; `Cancelar` não chama `DELETE`; `Revogar` chama `DELETE /api/admin/mcp/tokens/<id>`, a linha passa a `REVOGADO` e aparece o aviso `Token revogado.`; linhas `REVOGADO` e `EXPIRADO` não têm o botão (AC 31)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "revoga com confirmação"`

**C32** - Sem tokens a aba mostra `Nenhum token ainda.` e o formulário de criação (AC 32)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "estado vazio"`

**C33** - Durante o `GET /api/admin/mcp` a aba mostra esqueletos; com `500` mostra o erro com `Tentar de novo`, e clicar nele chama o `GET` de novo (AC 33)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "carregando e erro"`

**C34** - Um `400` com `errors.nome` mostra a mensagem sob o campo `Nome` com `aria-invalid`; um `409` mostra a mensagem do servidor acima do botão; nos dois casos o formulário continua preenchido e nenhum token é mostrado (AC 34)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "erros da criação"`

**C35** - A aba mostra o bloco `Como conectar` com o comando do Claude Code com `<seu-token>`, o JSON `{"mcpServers":{"one":{"url":"<url>","headers":{"Authorization":"Bearer <seu-token>"}}}}` com a URL real, e a frase `Claude.ai e ChatGPT na web ainda não conectam: pedem OAuth.` (AC 35)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "como conectar"`

**C36** - `integracoes.test.tsx` deixa de afirmar o selo `Em breve` e o aviso `A integração com o MCP do One chega em uma próxima versão.`: o teste `abas` espera as abas `Moodle` e `MCP` (sem selo) e o teste `aba MCP em breve` sai; nenhuma outra asserção existente muda. A suíte web e o build passam
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx`
Proof: `npm --prefix web test -- --run`
Proof: `npm --prefix web run build`

### Transversais

**C37** - `ArquiteturaTests` descreve a nova arquitetura e passa: pasta `Mcp` na lista de fatias, os 4 pares `Mcp -> Chamados, Conhecimento, Indicadores, Assistente`, `token_mcp` em `TabelasDaInstituicao`, `TokenMcp` na pasta `Dados/Mcp` do dicionário de entidades (34 entidades) com o `Using` nos dois `.csproj`, as contagens de mensagens, handlers e `Map*` com os 3 casos de uso novos de `Administracao`, e um teste `Pacote_mcp_fixado` que exige `ModelContextProtocol.AspNetCore` na versão exata `2.4.0` (door 4, door 5). `dotnet build One.slnx` passa com CA1502 como erro
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests"`
Proof: `dotnet build One.slnx`

**C40** - O `.specs/STATE.md` tem a linha `AD-049` ativa e `.specs/features/mcp-one/` tem `plan.md`, `checks.md` e, no fim, `verification.md`
Proof: `Select-String -Path .specs/STATE.md -Pattern '^\| AD-049 \|.*\| active \|'`

**C41** - Os gates do `web/` do AD-018 para o código novo: `dryer` sem candidato a 0.8 e `crapper` abaixo de CRAP 10; se o Smart App Control seguir bloqueando as duas ferramentas neste computador, ficam "não rodados", sem PASS (AD-044, AD-048); `mutator` segue suspenso (AD-025)
Proof: `cd web; dryer`
Proof: `cd web; crapper`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/admin/mcp` statuses (3) | 200 C4 · 401 C7 · 403 C7 | - |
| `POST /api/admin/mcp/tokens` statuses (5) | 201 C1 · 400 C2 · 401 C7 · 403 C7 · 409 C3 | - |
| `DELETE /api/admin/mcp/tokens/{id}` statuses (4) | 204 C5 · 401 C7 · 403 C7 · 404 C6 | - |
| `POST /api/mcp/{slug}` statuses (3) | 200 C8 · 401 C9 · 429 C14 | - |
| papéis que chamam `/api/admin/mcp*` (4) | ADMINISTRADOR C1 · ATENDENTE C7 · ALUNO C7 · OPERADOR C7 | - |
| motivos de `401` em `/api/mcp/{slug}` (13) | sem cabeçalho C9 · `Bearer lixo` C9 · segredo vazio C9 · hash desconhecido C9 · esquema `Basic` C9 · revogado C10 · vencido C10 · slug diferente C11 · instituição inativa C12 · usuário inativo C12 · troca de senha C12 · sem papel da equipe C12 · cookie C15 | - |
| outras rotas que recusam o token (3) | `/api/auth/me` C15 · `/api/chamados` C15 · `/api/admin/mcp` C15 | - |
| `estado` do token (3) | ATIVO C4 C38 · EXPIRADO C4 C38 · REVOGADO C4 C38 | - |
| fronteiras do estado do token (3) | antes de `expira_em` C38 · em `expira_em` C38 · revogado antes e depois do vencimento C38 | - |
| ferramentas (4) | `listar_chamados` C16 C17 · `ver_chamado` C18 C19 · `buscar_conhecimento` C20 C21 C22 C23 · `ver_indicadores` C24 C25 | - |
| `escopo` de `listar_chamados` (3) | `fila` C16 · `meus` C16 · inválido C17 | - |
| bordas de `consulta` e `limite` (8) | consulta 0 C23 · 1 C23 · 500 C23 · 501 C23 · limite 0 C23 · 1 C23 · 10 C23 · 11 C23 | - |
| bordas de `nome` e `dias` (8) | nome vazio C2 · nome 60 C2 · nome 61 C2 · dias 29 C2 · dias 30 C2 · dias 365 C2 · dias 366 C2 · dias ausente C2 | - |
| erros de `ver_indicadores` (4) | `de` > `ate` C25 · `de` ausente C25 · setor alheio C25 · só liderança C25 | - |
| `ver_chamado` não encontrado (3) | inexistente C19 · outra instituição C19 · setor que não atende C19 | - |
| estados da aba (6) | lista C28 · vazio C32 · carregando C33 · erro C33 · erro de campo C34 · conflito C34 | - |
| ações da aba (4) | criar C29 · fechar painel C30 · revogar C31 · cancelar revogação C31 | - |
| portas (6) | 1 `token_mcp` hash único C1 C39 · 2 formato do token C1 C9 · 3 caminho e nomes das ferramentas C8 · 4 pacote 2.4.0 e modo sem sessão C37 C8 · 5 fatia `Mcp` C37 · 6 esquema `mcp` separado do cookie C15 | - |
| startup config: registro do servidor MCP e do esquema `mcp` (1 assembly) | `Program.cs`, o mesmo que o `OneFactory` monta (`WebApplicationFactory<Program>`): C8 | - |

- Claims que nomeiam status, rota ou forma de resposta: C1, C2, C3, C4, C5, C6, C7, C8, C9, C14, C15 - cada uma tem prova que cruza a fronteira HTTP
- C16, C18, C24 afirmam igualdade com a rota equivalente; só valem se a rota equivalente devolve valores não vazios no cenário semeado (o teste afirma o tamanho da lista antes de comparar)
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide e é alcançado por uma fronteira HTTP (`AutenticacaoMcp`, `CriarTokenMcp`, `RevogarTokenMcp`, `VerMcp`, `FerramentasMcp`) | uma na fronteira e, para a regra de estado, uma na própria entidade | o contrato HTTP; um caso asserido por motivo de recusa (13 motivos de `401`) |
| Decide e não cruza fronteira (`TokenMcp`) | uma na entidade, sem banco | um caso asserido por fronteira de estado (3) |
| Instrumentação (registro `AddMcpServer`/`MapMcp`, records de resposta) | nenhuma própria | coberta por C8 e pelos checks das ferramentas |

Evidência: `TokenMcp` decide `ATIVO`/`EXPIRADO`/`REVOGADO` e a janela de 1 minuto (4 pontos de decisão); `AutenticacaoMcp` decide 13 recusas; o análogo é `MoodleLancamentoTests`/`MoodleAdminTests` (rota + `FakeTimeProvider`) e `ChamadoDominioTests` (domínio sem banco). O repositório já responde às duas perguntas com esses precedentes: nenhuma linha nova vai para o `AGENTS.md`.

## Swept

- validation: C2 (nome e dias), C23 (consulta e limite), C17 (escopo e estado)
- failure modes: C22 (embedding), C33 (lista falha), C34 (criação recusada)
- idempotency: C5 (revogar duas vezes), C13 (último uso)
- authorization: C7, C9 a C12, C15, C19, C21, C25
- concurrency: n/a - o limite de 5 é uma guarda de conveniência, não de segurança (duas criações simultâneas podem chegar a 6); `ultimo_uso_em` é "última escrita vence" e inofensivo
- data lifecycle: n/a - tokens vencidos e revogados ficam como histórico (no máximo 5 ativos por usuário); a limpeza fica para quando houver volume
- dependency failure: C22 (embeddings), C12 (instituição e usuário mudam depois da criação do token)
- state transitions: C38 (`ATIVO` -> `EXPIRADO` / `REVOGADO`), C5, C10
- observability: C27 (log por chamada), C13 (último uso visível na aba, C28)

## Handoff

- API: `Program.cs` 8 KB · `Sessao.cs` 3 KB · `Tokens.cs` 2 KB · `AdminRotas.cs` 2 KB · `OneDb.cs` ~14 KB · `One.Api.csproj` 3 KB · novos `Mcp/*` 3 arquivos ~10 KB · 3 casos de uso novos ~8 KB · entidade ~2 KB · migration ~6 KB = ~58 KB
- Testes da API: `ArquiteturaTests.cs` ~60 KB (lido e editado) · 4 classes novas ~40 KB = ~100 KB
- Web: `Integracoes.tsx` 1 KB · `Moodle.tsx` 6 KB · nova `Mcp.tsx` ~8 KB · `integracoes.test.tsx` 5 KB · novo `mcp.test.tsx` ~12 KB = ~32 KB
- Total ~190 KB ≈ 48k tokens, abaixo dos 150k - um construtor
- Mecanismo: one builder (cabe no orçamento)

## Out of scope

Vem do `plan.md`.
