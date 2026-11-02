# Vertical slice completa - checks

Profile: standard
Plan: `.specs/features/vertical-slice-completa/plan.md`

31 checks em 4 slices · 6 one-way doors · 0 perguntas abertas

**Como as provas rodam.** As mesmas ferramentas do `refatoracao-solid`:

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `WebApplicationFactory<Program>` (`OneFactory`) | `docker compose up -d postgres mailpit` |
| `web/` e2e | Playwright (`npm --prefix web run e2e`) | os pré-requisitos do `mvp-one`, com a imagem do `api` reconstruída |
| build do `api/` | `dotnet build api` com `CA1502` e `MSG0005` em `WarningsAsErrors` (door 1) | nenhum |
| scripts da feature | `python` e `bash` (Git Bash) na raiz | nenhum |

Todos os comandos rodam na raiz `D:\one-system`. `<base>` é o commit que congela `plan.md` e este
`checks.md`, gravado no `## Handoff`. Cada prova nomeia um teste ou um comando, e o nome é o contrato
com o construtor: uma classe ou um método citado aqui que não existe em `<base>` é criado com
exatamente esse nome (`RetratoTests`, `MediatorTests`, `OrdemDasRecusasTests`, `AcoesDoChamadoTests`,
os 8 métodos novos de `ArquiteturaTests`, `PrimeiroAcessoTests.Smtp_fora_loga_na_categoria_Email`), e
um filtro que não seleciona nenhum teste é prova falha, não prova verde (L-002): o construtor confere
que cada `--filter` desta lista executa pelo menos 1 teste. Os 3 scripts novos ficam em
`.specs/features/vertical-slice-completa/`.

## Checks

### S1 - Rede de segurança antes de mexer (P1) · ~10 files · ~45 KB · ~11k

**C1** - A suíte da API e a suíte e2e que existem em `<base>` passam em cada commit desta feature (AC 1)
Proof: `dotnet test api.Tests`
Proof: `npm --prefix web run e2e`

**C2** - Nenhuma asserção existente em `<base>` foi removida, alterada ou pulada: toda linha removida com `Assert`, `expect(` ou `toBe`/`toHave` em `api.Tests/**/*.cs`, `web/src/**/*.test.tsx` e `web/e2e/**` reaparece idêntica (espaços normalizados) como linha adicionada, e nenhuma linha adicionada traz `Skip =`, `.skip(` nem `.only(` (AC 1)
Proof: `python .specs/features/refatoracao-solid/asserts_preservados.py <base>`

**C3** - [x] O retrato `api.Tests/Retratos/rotas.txt` tem 61 linhas, uma por endpoint do `EndpointDataSource` na ordem de registro, cada uma com o método HTTP, o `RoutePattern.RawText`, a presença de `IAllowAnonymous`, a presença de `IAuthorizeData` e o nome da política de `EnableRateLimitingAttribute`: 59 rotas com exatamente 1 método, mais os 2 fallbacks de `Program.Rotas` (`/api/{**resto}` e o do `MapFallbackToFile`); 5 com `IAllowAnonymous` (`/api/auth/login`, `/api/auth/primeiro-acesso`, `/api/auth/definir-senha`, `/api/auth/logout`, `/api/instituicoes/{slug}`); 59 com `IAuthorizeData`; política `auth` em 2 (`/api/auth/login`, `/api/auth/primeiro-acesso`) e `mensagens` em 3 (`/api/conversas`, `/api/conversas/{id:long}/mensagens`, `/api/atendimento-direto`). A tabela viva do app é igual ao retrato linha a linha, na mesma sequência (AC 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_igual_a_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SpaTests.Spa_em_slug_e_api_404_em_problem_json"`

**C4** - [x] Os retratos `api.Tests/Retratos/rotas.txt` e `api.Tests/Retratos/erros.txt` foram gravados com o código da base: cada um foi adicionado num único commit depois de `<base>`, `git diff <base> <esse commit> -- api` é vazio (nenhum arquivo de `api/` mudou até ali), e nenhum dos dois mudou desde que foi adicionado (AC 2, AC 4)
Proof: `python .specs/features/vertical-slice-completa/retratos_antes.py <base>`

**C5** - [x] Para um aluno e para um atendente sem o papel `ADMINISTRADOR`, cada uma das 29 rotas `/api/admin/*` lidas do `EndpointDataSource` responde 403 com `detail` igual a "Só administradores podem usar esta área." (AC 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Admin_403_com_detail_nas_29_rotas"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AdminTests.Sem_papel_admin_403"`

**C6** - [x] O retrato `api.Tests/Retratos/erros.txt` guarda 8 corpos, e cada pedido abaixo devolve hoje o corpo gravado byte a byte, depois de tirar dos dois lados só o membro `"traceId":"..."`: 400 `POST /api/conversas` com `{"mensagem":""}` por aluno com matrícula ativa; 401 `POST /api/auth/login` com senha errada; 403 `POST /api/conversas` com `{"mensagem":"oi"}` por atendente; 404 `GET /api/instituicoes/nao-existe`; 409 `POST /api/conversas/{id}/encerrar` numa conversa já encerrada; 413 `POST /api/chamados/{numero}/mensagens` com o PDF `a.pdf` de 10 MB + 1 byte; 415 o mesmo pedido com o conteúdo `Balcao.Exe` em `a.pdf`; 429 o 6º `POST /api/auth/login` em 60 s no `OneFactoryComLimites` (AC 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_erro_iguais_aos_da_base"`

### S2 - `Mediator` no lugar (P1) · ~6 files · ~32 KB · ~8k

**C7** - [x] `api/One.Api.csproj` tem `PackageReference` de `Mediator.Abstractions` versão `3.0.2` e de `Mediator.SourceGenerator` versão `3.0.2` com `PrivateAssets` igual a `all`, nenhum `PackageReference` cujo `Include` começa com `MediatR` (comparação sem diferenciar maiúsculas), e o `WarningsAsErrors` contém `CA1502` e `MSG0005` (AC 5, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Mediator_referenciado"`

**C8** - [x] Um arquivo plantado em `api/` com `public sealed record MensagemPlantada : Mediator.IRequest<IResult>` e sem handler faz `dotnet build api --no-incremental` sair com código diferente de 0 e a saída conter `error MSG0005`; o mesmo arquivo com um `MensagemPlantadaHandler : IRequestHandler<MensagemPlantada, IResult>` compila com código 0 e sem `MSG0005`; o arquivo plantado sai no fim (AC 6, door 1)
Proof: `bash .specs/features/vertical-slice-completa/msg0005_barra.sh`

**C9** - Com o app do teste: `IMediator` resolvido 2 vezes no mesmo escopo de `f.Services` é a mesma instância, e resolvido em 2 escopos diferentes são 2 instâncias diferentes; `AcessoChamado` segue a mesma regra (AC 7, door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~MediatorTests.Um_mediator_por_escopo"`

**C10** - Um aluno e uma equipe da instituição Demo recebem 404 em cada uma das 30 rotas com `{id}` ou `{numero}` quando o id ou número existe só na Univag, e nada da Univag muda; `numeroOriginal`, `categoriaId`, `setorId` e `matriculaId` (transferir e atendimento direto) de outra instituição no corpo continuam 400 (AC 8)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IsolamentoTests.Recurso_de_outra_instituicao_404"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Documento_de_outra_instituicao_404"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IsolamentoTests.Id_de_outra_instituicao_no_corpo_400"`

### S3 - Um arquivo por caso de uso (P1) · ~70 files · ~213 KB · ~53k

**C11** - Os tipos concretos do assembly `One.Api` que implementam `Mediator.IRequest<T>` (qualquer `T`, direto ou por `IAcaoChamado`) são exatamente 58: `Acesso` 6, `Assistente` 7, `Chamados` 13, `Conhecimento` 11, `Indicadores` 1, `Administracao` 20, `Instituicoes` 0. Cada tipo `X` tem namespace `One.Api.<Fatia>` e o arquivo `api/<Fatia>/X.cs` existe, declara exatamente 1 tipo com `IRequest<` ou `IAcaoChamado` na lista de bases e declara `public static void Mapear(RouteGroupBuilder`; nenhum `X` tem o nome de uma das 7 fatias (AC 9, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Um_arquivo_por_caso_de_uso"`

**C12** - Os tipos concretos de `One.Api` que implementam `Mediator.IRequestHandler<TMsg, T>` são exatamente 58, um para cada tipo de C11, cada um chamado `<X>Handler` e declarado no mesmo arquivo `api/<Fatia>/X.cs` da sua mensagem (AC 10, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Um_handler_por_mensagem_no_mesmo_arquivo"`

**C13** - O código de `api/` (sem `bin`, `obj`, `Dados/Migracoes`) tem exatamente 61 chamadas `.MapGet(`, `.MapPost(`, `.MapPut(`, `.MapDelete(`, `.MapPatch(`, `.MapMethods(` ou `.MapFallback*(` (`MapGroup` não conta): 1 em cada um dos 58 arquivos de C11, 1 (a de `"/auth/logout"`) no arquivo que mapeia o logout e 2 em `Program.cs` (`MapFallback` e `MapFallbackToFile`); nenhum outro arquivo tem uma delas (AC 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Map_so_nos_casos_de_uso"`

**C14** - `api/Agendador.cs`, `api/Sessao.cs`, `api/Instituicoes/InstituicaoComando.cs` e o arquivo de `api/` que contém `"/auth/logout"` não contêm `IMediator`, `ISender` nem `using Mediator`; `POST /api/auth/logout` continua 204 e expira o cookie (AC 12)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Fora_do_mediator"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SessaoTests.Logout_204_expira_cookie"`

**C15** - Na conversa de outro aluno: `POST /api/conversas/{id}/mensagens` com `{"mensagem":""}` e `POST /api/conversas/{id}/avaliacao` com `{}` respondem 404 com `detail` "Conversa não encontrada.", e a conversa não muda (AC 13, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Conversa_alheia_404_mesmo_com_corpo_invalido"`

**C16** - `POST /api/conversas` com `{"mensagem":""}` responde 403 com `detail` "O assistente é só para alunos com matrícula ativa." para um atendente e para um aluno cuja única matrícula não está `ATIVA`; `POST /api/atendimento-direto` com `{"descricao":""}` por um atendente responde 403 com `detail` "O atendimento é só para alunos com matrícula ativa."; nenhuma conversa é criada (AC 14, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Sem_matricula_ativa_403_mesmo_com_corpo_invalido"`

**C17** - Numa conversa do próprio aluno já encerrada: `POST /api/conversas/{id}/mensagens` com `{"mensagem":""}` responde 400 (`errors.mensagem`) e `POST /api/conversas/{id}/avaliacao` com `{}` responde 400 (`errors.resolveu`), não 409 (door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Conversa_encerrada_400_antes_de_409"`

**C18** - Com id 999999 (inexistente) e corpo inválido, um administrador recebe 404 em 8 rotas: `PUT /api/admin/setores/{id}`, `PUT /api/admin/categorias/{id}`, `PUT /api/admin/cursos/{id}`, `PUT /api/admin/respostas-prontas/{id}`, `PUT /api/admin/regras/{id}` e `PUT /api/admin/usuarios/{id}` com `{}` e `detail` "Item não encontrado."; `PUT /api/admin/artigos/{id}` com `{}` e `detail` "Artigo não encontrado."; `POST /api/admin/documentos/{id}/versoes` com um arquivo que não é PDF e `detail` "Documento não encontrado." (door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Id_inexistente_404_mesmo_com_corpo_invalido"`

**C19** - Nenhum dos 58 tipos de mensagem de C11 tem propriedade do tipo `HttpContext`, `HttpRequest` ou `IHttpContextAccessor`; nenhum dos 58 handlers de C12 nem `AgirNoChamado<,>` tem parâmetro de construtor desses tipos; `DetalheChamado.Montar` não tem parâmetro `HttpContext`; o texto `IHttpContextAccessor` não aparece em `api/`. O login válido continua 200 com o cookie `one.auth`, o anexo PDF enviado em `multipart/form-data` continua aceito e o upload de documento continua 201 (door 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Handler_sem_HttpContext"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LoginTests.Login_valido_200_com_cookie"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoTests.Pdf_jpg_png_ate_10mb"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Subir_pdf_201"`

**C20** - Em `api.Tests/ArquiteturaTests.cs`, os pares de `ReferenciasEntreFatias` em `HEAD` são um subconjunto dos pares de `<base>`, e o array `Fatias` e os corpos de `Fatias_do_api`, `Namespace_igual_a_pasta` e `IgnoreQueryFilters_so_no_agendador_e_no_comando` são iguais aos de `<base>`; os 3 testes passam (AC 15)
Proof: `python .specs/features/vertical-slice-completa/listas_fixas.py <base>`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Referencias_entre_fatias"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Fatias_do_api"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Namespace_igual_a_pasta"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando"`

**C21** - `dotnet build api` termina com 0 `CA1502` no limite 10, e a barreira continua ativa: complexidade 11 plantada quebra o build e 10 compila (AC 16)
Proof: `dotnet build api -warnaserror:CA1502`
Proof: `bash .specs/features/refatoracao-solid/ca1502_barra.sh`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Barreira_de_complexidade_configurada"`

**C22** - Com o SMTP fora, `POST /api/auth/primeiro-acesso` de um aluno sem senha responde 202 e grava 1 log de nível `Error` com a categoria `One.Api.Email` e o campo `InstituicaoId` da instituição (Assumption "Categoria dos logs")
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrimeiroAcessoTests.Smtp_fora_loga_na_categoria_Email"`

### S4 - Permissão das ações do chamado em um lugar (P1) · ~20 files · ~97 KB · ~24k

**C23** - A chamada `Estados(` de `PermissoesChamado` (escrita `PermissoesChamado.Estados(` ou `Estados(` com `using static One.Api.Chamados.PermissoesChamado`) aparece em exatamente 1 arquivo de `api/` fora de `api/Chamados/PermissoesChamado.cs`, e esse arquivo declara `class AgirNoChamado<` (AC 17, door 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Permissao_so_no_AgirNoChamado"`

**C24** - Exatamente 9 tipos concretos de `One.Api` implementam `IAcaoChamado`, todos em `api/Chamados`; construindo cada um (o de `/mensagens` uma vez com tipo `PUBLICA` e uma com tipo `NOTA`), o conjunto dos valores de `Acao` é exatamente `responder`, `nota`, `assumir`, `resolver`, `confirmar`, `rejeitar`, `cancelar`, `encaminhar`, `reclassificar`, `duplicado`; as matrizes ação × estado e ação × papel continuam respondendo como em `<base>` (AC 18)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Nove_acoes_do_chamado"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransicoesTests.Matriz_acao_estado"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransicoesTests.Matriz_acao_papel"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ExtrasTests.Duplicado_por_aluno_403_e_em_fechado_409"`

**C25** - Num chamado que o chamador não vê, cada uma das 9 rotas de ação com corpo inválido (`/mensagens` com `texto` vazio, uma vez `PUBLICA` e uma `NOTA`; `/resolver` com `{}`; `/rejeitar` com `{}`; `/cancelar` com `motivo` de 4001 caracteres; `/encaminhar` com `{}`; `/reclassificar` com `categoriaId` 999999; `/duplicado` com `{}`; `/assumir` e `/confirmar` sem corpo) responde 404 com `detail` "Chamado não encontrado.", para um atendente de outro setor e para outro aluno, e o chamado não muda (AC 19, door 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Acao_invisivel_404_mesmo_com_corpo_invalido"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~VisibilidadeTests.Atendente_de_outro_setor_404"`

**C26** - Num chamado `FECHADO` visível ao chamador, o papel que nunca pode a ação recebe 403 com `detail` "Seu papel neste chamado não permite esta ação." mesmo com o corpo inválido de C25, em 9 pares: `nota`/`ALUNO` (`/mensagens` com tipo `NOTA`), `assumir`/`ALUNO`, `resolver`/`ALUNO`, `confirmar`/`ATENDENTE`, `rejeitar`/`ATENDENTE`, `cancelar`/`ATENDENTE`, `encaminhar`/`ALUNO`, `reclassificar`/`ALUNO`, `duplicado`/`ALUNO`; o chamado não muda (AC 20, door 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Acao_por_papel_errado_403_mesmo_com_corpo_invalido"`

**C27** - Com o papel que pode a ação, o corpo inválido de C25 num estado em que a ação não vale responde 400, não 409, em 9 casos: `responder`/`ALUNO` em `FECHADO`, `responder`/`ATENDENTE` em `FECHADO`, `nota`/`ATENDENTE` em `FECHADO`, `resolver` em `RESOLVIDO`, `rejeitar` em `ABERTO`, `cancelar` em `FECHADO`, `encaminhar` em `RESOLVIDO`, `reclassificar` em `FECHADO`, `duplicado` em `RESOLVIDO`; o chamado não muda (AC 21, door 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Acao_com_corpo_invalido_em_estado_errado_400"`

**C28** - Cada ação aplicada com corpo válido num estado em que vale faz exatamente 1 `SaveChanges` contado por `f.Gravacoes` e devolve o detalhe do chamado (`numero` igual ao da rota): 201 para `responder`/`ALUNO`, `responder`/`ATENDENTE` e `nota`/`ATENDENTE` em `/mensagens`, e 200 para `assumir`, `resolver`, `confirmar`, `rejeitar`, `cancelar`, `encaminhar`, `reclassificar` e `duplicado` (AC 22, door 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AcoesDoChamadoTests.Uma_gravacao_e_status_por_acao"`

**C29** - Resolvendo `IEnumerable<IPipelineBehavior<X, T>>` de um escopo de `f.Services` com o `T` de cada mensagem: para cada um dos 9 tipos de C24 há exatamente 1 `AgirNoChamado<X, T>`, e para cada um dos outros 49 tipos de C11 não há nenhum (AC 23, door 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~MediatorTests.AgirNoChamado_so_nas_9_acoes"`

**C30** - Uma `DbUpdateConcurrencyException` e uma chave única violada lançadas dentro de um handler atravessam o mediator sem embrulho e continuam virando 409: dois `POST /api/chamados/{numero}/resolver` simultâneos dão 200 e 409, e dois `POST /api/conversas/{id}/transferir` simultâneos dão 201 e 409 com 1 chamado (Assumption "Exceções no handler")
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConcorrenciaTests.Segunda_alteracao_simultanea_409"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransferenciaTests.Transferencia_dupla_um_chamado_e_409"`

**C31** - Em `.specs/STATE.md`, a linha de AD-019 tem status `active` e a linha de AD-017 cita AD-019 como a decisão que supera a parte "No per-use-case handler, no MediatR" (Impact, decisões)
Proof: `grep -E "^\| AD-019 \|.*\| active \|" .specs/STATE.md && grep -E "^\| AD-017 \|.*superseded.*AD-019" .specs/STATE.md`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| suítes que prendem o comportamento (2) | API C1, C2 · e2e C1, C2 | - |
| doors do `Landing` (6) | door 1 C7, C8 · door 2 C9 · door 3 C11, C12, C13 · door 4 C15, C16, C17, C18, C27 · door 5 C23, C24, C25, C26, C27, C28, C29 · door 6 C19 | - |
| rotas da base por grupo de `Map` (13 grupos) | auth 6 C3 · instituição 1 C3 · conversa 7 C3 · consulta de chamado 4 C3 · ações do chamado 9 C3 · artigo 6 C3 · documento 5 C3 · indicadores 1 C3 · usuários 4 C3 · importação 1 C3 · regras 3 C3 · cadastros 12 C3 · fallbacks 2 C3 | - |
| rotas anônimas (5) | `/api/auth/login` C3 · `/api/auth/primeiro-acesso` C3 · `/api/auth/definir-senha` C3 · `/api/auth/logout` C3, C14 · `/api/instituicoes/{slug}` C3 | - |
| rotas com política de limite (5) | `auth` em `/api/auth/login` C3 · `auth` em `/api/auth/primeiro-acesso` C3 · `mensagens` em `/api/conversas` C3 · `mensagens` em `/api/conversas/{id:long}/mensagens` C3 · `mensagens` em `/api/atendimento-direto` C3 | - |
| rotas `/api/admin/*` (29) | C5, table-driven over all 29, lidas do `EndpointDataSource` | - |
| quem recebe o 403 do `/admin` (2) | aluno C5 · atendente C5 | - |
| corpos de erro gravados (8) | 400 C6 · 401 C6 · 403 C6 · 404 C6 · 409 C6 · 413 C6 · 415 C6 · 429 C6 | - |
| retratos gravados na base (2) | `rotas.txt` C3, C4 · `erros.txt` C4, C6 | - |
| rotas com `{id}` ou `{numero}` de outra instituição (10 grupos) | 30 rotas: conversa 5 C10 · chamado 10 C10 · `/api/anexos/{id}` 1 C10 · `/api/artigos/versoes/{id}` 1 C10 · `/api/documentos/versoes/{id}` 1 C10 · usuários 2 C10 · cadastros 4 C10 · regras 1 C10 · artigos admin 3 C10 · documentos admin 2 C10 | - |
| ids de outra instituição no corpo (5) | `numeroOriginal` C10 · `categoriaId` C10 · `setorId` C10 · `matriculaId` ao transferir C10 · `matriculaId` no atendimento direto C10 | - |
| startup config: `AddMediator` Scoped com `AgirNoChamado` e `AcessoChamado` (2 lugares) | `Program.Servicos` C9, C29 · `OneFactory`, que herda `Program.Servicos` e não troca o mediator C9, C29 | - |
| barreiras do build (2) | `MSG0005` C8 · `CA1502` C21 | - |
| pacotes (3) | `Mediator.Abstractions` 3.0.2 C7 · `Mediator.SourceGenerator` 3.0.2 C7 · nenhum `MediatR*` C7 | - |
| mensagens por fatia (7 fatias) | 58 mensagens: `Acesso` 6 C11 · `Assistente` 7 C11 · `Chamados` 13 C11 · `Conhecimento` 11 C11 · `Indicadores` 1 C11 · `Administracao` 20 C11 · `Instituicoes` 0 C11 | - |
| peças de cada caso de uso (4) | mensagem C11 · `Mapear` C11, C13 · handler C12 · arquivo próprio C11, C12 | - |
| fora do mediator (6) | `/auth/logout` C13, C14 · fallback `/api/{**resto}` C13 · fallback do SPA C13 · `InstituicaoComando` C14 · `Agendador` C14 · `Sessao` C14 | - |
| ordem das recusas da conversa (7 casos) | mensagem vazia em conversa alheia 404 C15 · avaliação sem `resolveu` em conversa alheia 404 C15 · conversa vazia por atendente 403 C16 · conversa vazia por aluno sem matrícula ativa 403 C16 · atendimento direto vazio por atendente 403 C16 · mensagem vazia em conversa encerrada 400 C17 · avaliação sem `resolveu` em conversa encerrada 400 C17 | - |
| 404 antes da validação no admin (8 rotas) | setores C18 · categorias C18 · cursos C18 · respostas prontas C18 · regras C18 · usuários C18 · artigos C18 · versão de documento C18 | - |
| o que vem do HTTP (4) | usuário e instituição na mensagem C19 · formulário lido no lambda C19 · login com `Entrada` e cookie C19 · nenhum `IHttpContextAccessor` C19 | - |
| listas fixas do `ArquiteturaTests` (4) | pares entre fatias C20 · arquivos da raiz C20 · namespace = pasta C20 · `IgnoreQueryFilters` só no comando e no agendador C20 | - |
| mensagens `IAcaoChamado` (9) | mensagens C24 · assumir C24 · resolver C24 · confirmar C24 · rejeitar C24 · cancelar C24 · encaminhar C24 · reclassificar C24 · duplicado C24 | - |
| nomes de ação de `PermissoesChamado` (10) | `responder` C24 · `nota` C24 · `assumir` C24 · `resolver` C24 · `confirmar` C24 · `rejeitar` C24 · `cancelar` C24 · `encaminhar` C24 · `reclassificar` C24 · `duplicado` C24 | - |
| 404 de visibilidade com corpo inválido (10 casos) | atendente de outro setor e outro aluno em cada: `/mensagens` PUBLICA C25 · `/mensagens` NOTA C25 · `/assumir` C25 · `/resolver` C25 · `/confirmar` C25 · `/rejeitar` C25 · `/cancelar` C25 · `/encaminhar` C25 · `/reclassificar` C25 · `/duplicado` C25 | - |
| 403 do papel que nunca pode (9 pares) | `nota`/`ALUNO` C26 · `assumir`/`ALUNO` C26 · `resolver`/`ALUNO` C26 · `confirmar`/`ATENDENTE` C26 · `rejeitar`/`ATENDENTE` C26 · `cancelar`/`ATENDENTE` C26 · `encaminhar`/`ALUNO` C26 · `reclassificar`/`ALUNO` C26 · `duplicado`/`ALUNO` C26 | - |
| 400 antes de 409 nas ações que validam corpo (9 casos) | `responder`/`ALUNO` C27 · `responder`/`ATENDENTE` C27 · `nota`/`ATENDENTE` C27 · `resolver` C27 · `rejeitar` C27 · `cancelar` C27 · `encaminhar` C27 · `reclassificar` C27 · `duplicado` C27 | - |
| ação aplicada: 1 gravação e o status (11 pares) | `responder`/`ALUNO` 201 C28 · `responder`/`ATENDENTE` 201 C28 · `nota` 201 C28 · `assumir` 200 C28 · `resolver` 200 C28 · `confirmar` 200 C28 · `rejeitar` 200 C28 · `cancelar` 200 C28 · `encaminhar` 200 C28 · `reclassificar` 200 C28 · `duplicado` 200 C28 | - |
| pipeline por tipo de mensagem (2 grupos) | 9 ações com 1 `AgirNoChamado` C29 · 49 demais sem nenhum C29 | - |
| exceções que viram 409 (2) | concorrência (`xmin`) C30 · chave única C30 | - |
| decisões no `STATE.md` (2) | AD-019 `active` C31 · AD-017 superada em parte C31 | - |

- Claims naming a status code, route or response body: C3, C5, C6, C10, C14 a C19, C22, C25 a C28, C30 - each has a proof that crosses the HTTP boundary
- `/assumir` e `/confirmar` não validam corpo (`Nada` em `AcoesChamado.cs`); por isso ficam fora do conjunto de C27 e entram em C25 e C26 sem corpo
- C1 is the only check that runs whole suites; that is its claim (nada que existia quebrou), and C2 is what stops the suite from going green by losing asserts
- No other check claims more than the cases its proof asserts

## Test policy

O repositório não tem guia de testes; valem as linhas do `refatoracao-solid`, mais as que esta
feature pede: a ordem das recusas, que hoje é um efeito da ordem das linhas de cada lambda e passa a
ser decidida por um pipeline behavior e por 58 handlers, e a estrutura do mediator, que nenhum teste
HTTP enxerga.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide e é alcançado por HTTP: a ordem 404 -> 403 -> 400 -> 409 do `AgirNoChamado` e a ordem de cada handler que recusa | uma na fronteira HTTP por linha da tabela de ordem; a tabela de permissões já é provada na própria camada (`PermissoesChamadoTests`) | um caso por rota × posição, com o corpo inválido para que trocar duas posições mude o status (C15 a C18, C25 a C27) |
| Contrato HTTP que não pode mudar: tabela de rotas e corpos de erro | um retrato gravado com o código da base e comparado por teste | as 61 linhas e os 8 corpos (C3, C4, C6) |
| Estrutura: um arquivo por caso, um handler, um `Map`, o pipeline só nas ações, nada de `HttpContext` | regra de texto ou reflexão no `ArquiteturaTests` e no `MediatorTests` | um caso por membro do conjunto (C11 a C14, C19, C23, C24, C29) |
| Instrumentação: o lambda de cada `Mapear` que liga os parâmetros, monta a mensagem e chama `Send` | nenhuma própria | coberta por C1, C3 e C10 |

Evidence:

- `api/Chamados/AcoesChamado.cs:39-52` (`Agir`): 4 recusas em ordem fixa mais a recusa de `aplicar`, 7 pontos de decisão, sobre 9 rotas -> decide, alcançado por HTTP
- `api/Assistente/ConversaRotas.cs:62-121`: `NovaConversa` 403 antes de 400, `NovaMensagem` 404 -> 400 -> 409 -> 409, `Avaliar` 404 -> 400 -> 409 -> decide, alcançado por HTTP
- `api/Administracao/CadastroRotas.cs:53-61`: 404 antes de `validar` para os 4 cadastros, que viram 12 arquivos -> decide, alcançado por HTTP
- análogo no repositório: `TransicoesTests.Matriz_acao_estado` e `VisibilidadeTests.Atendente_de_outro_setor_404`, tabelas de ordem já provadas na fronteira HTTP

Cost: 4 classes de teste novas (`RetratoTests` 3 testes, `MediatorTests` 2, `OrdemDasRecusasTests` 7,
`AcoesDoChamadoTests` 1), 8 regras novas no `ArquiteturaTests`, 1 teste novo em `PrimeiroAcessoTests`
e 3 scripts. Sem essas linhas, a ordem das recusas fica provada só pelos casos de corpo válido de
hoje, que passam com a validação em qualquer posição.

## Swept

- validation: C15, C16, C17, C18, C25, C26, C27 (cada validação continua na posição de hoje em relação a 404, 403 e 409); as recusas de cada campo seguem nos testes existentes (C1)
- failure modes: C2 (asserção perdida falha a prova), C8 (mensagem sem handler quebra o build), C21 (complexidade acima de 10 quebra o build), C30 (exceção do handler continua 409)
- idempotency: n/a - nenhuma gravação nova; a transferência dupla continua com 1 chamado e 409 (C30), e as gravações condicionais do agendador não passam pelo mediator (C14)
- authorization: C5 (filtro do `/admin`), C25 (visibilidade), C26 (papel), C10 (instituição), C3 (rotas anônimas e políticas de limite)
- concurrency: C9 (handler no escopo da requisição, com o `OneDb` que `Sessao.Validar` filtrou), C30 (409 de concorrência e de chave única)
- data lifecycle: n/a - nenhuma tabela, coluna ou valor gravado muda (`Relations`: None)
- dependency failure: C22 (SMTP fora continua 202 e loga na categoria de hoje); as falhas do provedor de IA não mudam e seguem em C1
- state transitions: C24 (matrizes ação × estado e ação × papel), C27 (400 antes de 409), C28 (a ação aplicada grava uma vez)
- observability: C22 (categoria `One.Api.Email` do log do primeiro acesso); nenhum log novo

## Handoff

Tamanho estimado pelo código que cada slice lê e escreve (`wc -c` / 4). Contexto fixo: `plan.md`
(20.738 B), este `checks.md` (~30 KB), `references/build.md` (11.542 B) e `LESSONS.md` (9.227 B),
cerca de 72 KB = ~18k.

- S1 lê `OneFactory`, `ProblemDetailsTests`, `Balcao`, `Cenario`, `Program`, `AdminRotas` (30.045 B)
  e escreve `RetratoTests`, os 2 retratos e `retratos_antes.py` (~15 KB): 45 KB = ~11k
- S2 lê `One.Api.csproj`, `Program`, `ArquiteturaTests`, `ca1502_barra.sh` (24.389 B) e escreve
  `MediatorTests`, `msg0005_barra.sh` e a regra do `.csproj` (~8 KB): 32 KB = ~8k, acumulado 19k
- S3 lê os 11 arquivos de rotas, `AdminRotas`, `DetalheChamado`, `Transferencia`, `Sessao`,
  `Problemas`, `ArquiteturaTests`, `PrimeiroAcessoTests`, `ConversaTests` (103.212 B) e escreve os 49
  arquivos de caso de uso fora das ações (~95 KB: ~60 KB de código movido mais ~700 B de mensagem e
  handler por arquivo), 6 regras do `ArquiteturaTests`, 4 testes de `OrdemDasRecusasTests` e
  `listas_fixas.py` (~16 KB): 213 KB = ~53k, acumulado 72k
- S4 lê `AcoesChamado`, `PermissoesChamado`, `DetalheChamado`, `ChamadoRotas`, `Avisos`,
  `VisibilidadeTests`, `Balcao`, `Program` (62.397 B) e escreve as 9 ações, `IAcaoChamado`,
  `AgirNoChamado`, `AcessoChamado`, 3 testes de `OrdemDasRecusasTests`, `AcoesDoChamadoTests`, o 2º
  teste de `MediatorTests` e 2 regras do `ArquiteturaTests` (~35 KB): 97 KB = ~24k, acumulado 96k
- Com o contexto fixo: 96k + 18k = 114k, abaixo do budget de 150k; sobram ~36k para a saída de
  build e de testes. Corte não necessário: um builder para S1 a S4
- Mechanism: um builder, num subagente (a estimativa cabe no budget; o pedido do usuário de 02/11/2026
  "use subagentes" fica atendido pelo builder e pelo Verifier, cada um num subagente próprio)
- Feature base (`<base>`): `65adab5` (docs: checks congelados sobre o plano aprovado), no `main`; o commit que congela `plan.md` e `checks.md`
