# Vertical slice completa: um arquivo por caso de uso, despachado pelo `Mediator`

## Problem

Hoje o `api/` está em 7 fatias por assunto (AD-017), mas dentro de cada fatia os casos de uso
ainda moram juntos: 50 chamadas `Map*` em 12 arquivos `*Rotas.cs`/`AcoesChamado.cs` publicam 59
rotas (o `CadastroRotas` mapeia 3 rotas genéricas para 4 cadastros, 12 rotas). `AcoesChamado.cs`
tem 9 ações em 258 linhas, `AuthRotas.cs` 6 rotas, `ConversaRotas.cs` 7, `ArtigoRotas.cs` 6 em
lambdas inline. Para ler ou mudar um caso de uso (por exemplo "rejeitar a resolução") é preciso
achar o lambda certo num arquivo que junta outros oito, e a decisão de permissão das ações do
chamado (`Agir`: 404 -> 403 -> 400 -> 409) é uma função que cada ação precisa lembrar de chamar.

Quem paga: o grupo, a cada caso de uso novo das próximas features da Etapa 4c (MinIO, SignalR,
Web Push), que vai copiar a forma que existir; e a banca de 20/11, que avalia a arquitetura. O
usuário decidiu em 02/11 levar o `api/` à vertical slice completa antes da banca (AD-019),
com o `Mediator` (martinothamar) no lugar do MediatR, que ficou comercial em 2025. Não há falha
em produção: não há produção.

**O que muda quando isto estiver pronto:**
- cada caso de uso HTTP mora num arquivo só, `api/<Fatia>/<Caso>.cs`, com a mensagem, o handler,
  a validação que só ele usa e o mapeamento da rota;
- a permissão das 9 ações do chamado é decidida num pipeline behavior único, que nenhuma ação
  pode pular;
- um request sem handler não compila;
- para o aluno, o atendente e o administrador nada muda: nenhuma rota, status, corpo JSON,
  Problem Details, tabela ou chave de configuração.

## Flow

Reusa o que já existe: o `Sessao.Validar` que põe `Usuario`/`Instituicao` em `HttpContext.Items` e
liga o filtro da instituição no `OneDb` da requisição (door 16 do `mvp-one`), o `Problemas` como
única fonte de `IResult` de erro, a tabela `PermissoesChamado`, o `DetalheChamado.Montar`, o
`Mapear` de cada fatia chamado por `Program.Rotas`, o filtro de administrador do grupo `/admin` em
`AdminRotas`, as regras de texto do `ArquiteturaTests` e o `asserts_preservados.py` do
`refatoracao-solid`.

1. requisição HTTP -> `Program` (exists) - cookie, `Sessao.Validar` (exists) carrega usuário e
   instituição e fixa `OneDb.InstituicaoAtual` no `OneDb` do escopo da requisição; rate limiter e
   filtro `/admin` de `AdminRotas` (exists) seguem nos mesmos grupos e rotas
2. `Mapear` do arquivo do caso de uso (door 3) - o lambda liga os mesmos parâmetros de hoje (rota,
   query, corpo JSON `*In`, `HttpRequest` para formulário), monta a mensagem com
   `ctx.Usuario()`/`ctx.Instituicao()` (door 6) e chama `IMediator.Send`
3. `Mediator` gerado (door 1, escopo da door 2) - resolve behaviors e handler no escopo da
   requisição, com o mesmo `OneDb` que o `Sessao.Validar` filtrou
4. `AgirNoChamado<,>` (door 5), só para mensagens `IAcaoChamado` - 404 visibilidade, 403 papel,
   `Validar` da mensagem (400), 409 estado, preenche `AcessoChamado`, chama o handler, grava num
   `SaveChangesAsync` e devolve o detalhe com 200 ou 201
5. handler do caso de uso (door 3) - valida na mesma ordem de hoje (door 4), usa `OneDb`,
   `TimeProvider`, `Prazos`, `Email`, `Assistente` por injeção no construtor e devolve o `IResult`
   montado por `Problemas` ou `Results.*`
6. out: o mesmo `IResult` de hoje; no login, o lambda emite o cookie `one.auth` quando o handler
   devolve o principal (door 6)

Fora do mediator, sem mudança: `POST /api/auth/logout`, os dois fallbacks de `Program.Rotas`,
`InstituicaoComando` (CLI), `Agendador` (hosted service), `Sessao` (middleware) e `Avisos`/`Email`
(gravam em `email_saida` dentro da transação de quem chama).

## Impact

| Front | What changes |
| --- | --- |
| domain | novo termo: caso de uso - uma mensagem `IRequest<...>` com um handler e um `Mapear`, num arquivo com o nome da mensagem, dentro da fatia |
| domain | novo termo: `IAcaoChamado` - a mensagem de uma das 9 ações do chamado; carrega `Numero`, `Acao`, `Usuario`, `Instituicao` e o próprio `Validar` |
| domain | termo existente: o `record Acesso` privado de `AcoesChamado` vira `AcessoChamado` (scoped), preenchido só pelo `AgirNoChamado`; quem lê hoje: os 9 lambdas de ação, que viram 9 handlers |
| código | os 12 arquivos de rotas encolhem: `AuthRotas`, `ConversaRotas`, `ChamadoRotas`, `ArtigoRotas`, `DocumentoRotas`, `UsuarioRotas`, `RegraRotas`, `CadastroRotas`, `IndicadorRotas`, `InstituicaoRotas`, `ImportacaoRotas` ficam só com a lista de `Mapear` da fatia e os auxiliares que 2 ou mais casos usam (ou somem); `AcoesChamado` fica com as transições compartilhadas (`Mudar`, `Fechar`, `Atribuir`...). `Program.Rotas` não muda |
| código | `DetalheChamado.Montar` deixa de receber `HttpContext` e recebe o id do usuário (só lia `ctx.Usuario().Id`) |
| código | contagem de partida: 50 `Map*` em 12 arquivos, 59 rotas (6 auth, 1 instituição, 7 conversa, 4 consulta de chamado, 9 ações, 6 artigo, 5 documento, 1 indicadores, 4 usuários, 1 importação, 3 regras, 12 cadastros); 58 casos de uso passam pelo mediator, `/auth/logout` fica fora |
| contrato HTTP | nada: rotas, métodos, `AllowAnonymous`, políticas de rate limit, status, nomes de campo JSON e corpos de Problem Details ficam iguais; os records `*In` ligados ao corpo continuam os mesmos |
| stored data | nada a migrar: nenhuma tabela, coluna ou valor gravado muda |
| testes | os existentes não mudam de asserção; entram o retrato da tabela de rotas, o retrato dos corpos de erro e as regras novas do `ArquiteturaTests`. As listas fixas do `ArquiteturaTests` (arquivos da raiz, pares entre fatias, `IgnoreQueryFilters` só no comando e no agendador) continuam valendo sem edição |
| decisões | ao fechar, AD-019 passa de `planned` a `active` e a parte "no per-use-case handler, no MediatR" de AD-017 fica superada por ela |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside changes: nenhuma rota nova nem assinatura alterada; o retrato da
tabela de rotas (AC 2) prende isso.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. dependência nova no `api/` | `<PackageReference Include="Mediator.Abstractions" Version="3.0.2" />` e `<PackageReference Include="Mediator.SourceGenerator" Version="3.0.2" PrivateAssets="all" />` em `api/One.Api.csproj`; `<WarningsAsErrors>$(WarningsAsErrors);CA1502;MSG0005</WarningsAsErrors>` | MediatR: licença comercial desde 2025. `Balta.Mediator`: 1 commit, resolve handler por reflexão, sem pipeline behaviors (AD-019, decisão do usuário) |
| 2. registro e tempo de vida | em `Program.Servicos`: `s.AddMediator(o => { o.ServiceLifetime = ServiceLifetime.Scoped; o.PipelineBehaviors = [typeof(AgirNoChamado<,>)]; });` e `s.AddScoped<AcessoChamado>();` | `Singleton` (o padrão, recomendado pelo README por desempenho): o handler depende do `OneDb` do escopo, onde `Sessao.Validar` fixou `InstituicaoAtual`; num singleton ele capturaria outro `OneDb` e o filtro da instituição (door 16) deixaria de ser o da requisição |
| 3. forma do caso de uso (precedente para toda feature seguinte) | arquivo `api/<Fatia>/<Caso>.cs`, plano dentro da fatia (namespace `One.Api.<Fatia>`), com `public sealed record <Caso>(...) : IRequest<IResult>` contendo `public static void Mapear(RouteGroupBuilder g) => g.MapPost("/rota", (<params de hoje>, HttpContext ctx, IMediator m) => m.Send(new <Caso>(..., ctx.Usuario())));` e `public sealed class <Caso>Handler(OneDb db, ...) : IRequestHandler<<Caso>, IResult>` com `public async ValueTask<IResult> Handle(<Caso> m, CancellationToken ct)`. O `Mapear` da fatia chama os `<Caso>.Mapear` na ordem de hoje. Nome do caso nunca igual ao de uma fatia | `IEndpoint` com varredura de assembly: reflexão na partida, ordem das rotas implícita e um segundo mecanismo de registro paralelo a `Program.Rotas`. Handler devolvendo tipo de domínio ou exceção traduzida para HTTP: um segundo caminho de erro que teria de reproduzir `Problemas` byte a byte. Subpasta por caso: namespace diferente da fatia quebra a regra de pares do `ArquiteturaTests` |
| 4. onde mora a validação | dentro do handler (ou no `Validar` da mensagem, para `IAcaoChamado`), na mesma posição de hoje em relação a 404, 403 e 409; validação que 2 ou mais casos usam fica num auxiliar da fatia, uma vez | pipeline behavior de validação (`where TMessage : IValidate`, como no README, ou FluentValidation): roda antes do handler para toda mensagem, então `POST /api/conversas/{id}/mensagens` com texto vazio na conversa de outro aluno passaria de 404 a 400 (revela que a conversa existe) e `POST /api/conversas` de quem não é aluno passaria de 403 a 400 |
| 5. pipeline `Agir` como behavior | `public interface IAcaoChamado : IRequest<IResult> { string Numero { get; } string Acao { get; } Usuario Usuario { get; } Instituicao Instituicao { get; } bool Criado => false; ValueTask<IResult?> Validar(AcessoChamado a, OneDb db); }` e `public sealed class AgirNoChamado<TMessage, TResponse>(OneDb db, AcessoChamado acesso, TimeProvider relogio, Prazos prazos, IConfiguration cfg) : IPipelineBehavior<TMessage, TResponse> where TMessage : IAcaoChamado`; o handler da ação devolve `Results.Empty` quando aplicou ou a recusa de `Problemas`; o behavior troca `Results.Empty` por `SaveChangesAsync` + `DetalheChamado.Montar` com 200 (201 se `Criado`) | `Agir` estático chamado por cada handler, como hoje: nada impede uma ação nova de não chamar. Um behavior por etapa (visibilidade, papel, validação, estado): espalha a ordem 404 -> 403 -> 400 -> 409 por 4 tipos. Propriedade mutável na mensagem para levar o chamado carregado: a mensagem deixa de ser um record imutável montado pelo endpoint |
| 6. o que vem do HTTP | a mensagem carrega o que o lambda já liga hoje mais `ctx.Usuario()`/`ctx.Instituicao()`; formulário lido no lambda como hoje, `req.HasFormContentType ? await req.ReadFormAsync() : FormCollection.Empty`, e passado como `IFormCollection`; o login devolve `public sealed record Entrada(ClaimsPrincipal? Principal, IResult Resposta)` e o lambda faz `ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, p)` antes de devolver `Resposta` | `IHttpContextAccessor` nos handlers: estado ambiente que esconde de qual sessão o caso depende e deixa qualquer handler ler cookie e cabeçalho. Parâmetro `IFormCollection`/`IFormFile` ligado pela minimal API: desde o ASP.NET Core 8 exige o middleware de antiforgery, que o `api/` não tem, e a exceção sai na chamada da rota |

- Nothing else in this change is hard to reverse: nenhuma rota, campo JSON, tabela, coluna ou
  chave de configuração muda; mover código entre arquivos se desfaz com outro refactor.

## Criteria

### S1: Rede de segurança antes de mexer (P1)

O comportamento atual fica preso pela suíte existente e por dois retratos tirados na base, antes
do primeiro commit estrutural.

**Acceptance Criteria**

1. The system SHALL pass every API and e2e test that exists at the feature base at every commit of this feature, with no existing assertion removed, skipped or loosened.
2. The API SHALL expose exactly the 59 route endpoints of the feature base plus the 2 fallbacks, each with the same HTTP method, route pattern, anonymous access and rate-limiting policy name recorded at the base.
3. WHEN a caller who is not an administrator calls any of the 29 `/api/admin/*` routes THEN the API SHALL return 403 with detail "Só administradores podem usar esta área.".
4. WHEN each of 8 recorded refusals (one per status 400, 401, 403, 404, 409, 413, 415 and 429) is triggered THEN the API SHALL return a body byte-identical to the one recorded at the feature base, ignoring only `traceId`.

**Independent test:** os dois retratos verdes na base e no fim; `asserts_preservados.py <base>` sem
problema.

### S2: `Mediator` no lugar (P1)

O pacote entra, o build barra mensagem sem handler, e o handler roda no escopo da requisição.

**Acceptance Criteria**

5. The API project SHALL reference `Mediator.Abstractions` 3.0.2 and `Mediator.SourceGenerator` 3.0.2, and SHALL reference no package whose id starts with `MediatR`.
6. IF a message type in `api/` has no handler THEN `dotnet build` SHALL fail with `MSG0005`.
7. The API SHALL register the mediator with `ServiceLifetime.Scoped`, and `IMediator` resolved from two different scopes SHALL be two different instances.
8. WHEN a user of institution A calls any use-case route with an id or número that exists only in institution B THEN the API SHALL return the same 404 it returns at the feature base.

**Independent test:** apagar um handler num worktree e ver o build falhar com `MSG0005`; os testes
de isolamento entre instituições verdes.

### S3: Um arquivo por caso de uso (P1)

Cada uma das 58 rotas que passam pelo mediator mora no seu arquivo, com a validação na ordem de hoje.

**Acceptance Criteria**

9. The API SHALL declare 58 message types, each in its own file `api/<Fatia>/<Nome>.cs` named after it, in one of the 7 slices, and each file SHALL declare exactly one message type.
10. The API SHALL contain exactly one handler type for each message type, declared in the same file as the message.
11. The API SHALL keep exactly one `Map*` call in each use-case file, and outside the use-case files the API source SHALL contain only the `/auth/logout` mapping and the 2 fallbacks of `Program.Rotas`.
12. The files `Agendador.cs`, `Sessao.cs` and `Instituicoes/InstituicaoComando.cs` and the `/auth/logout` mapping SHALL not reference `IMediator`.
13. IF `POST /api/conversas/{id}/mensagens` carries an empty message for a conversation of another student THEN the API SHALL return 404, not 400.
14. IF `POST /api/conversas` carries an empty message from a user who is not a student with an active enrolment THEN the API SHALL return 403, not 400.
15. The API SHALL keep the cross-slice pair list of `ArquiteturaTests` equal to the feature base's list or a subset of it, and SHALL keep the root file list and the namespace = folder rule unchanged.
16. The API SHALL build with zero `CA1502` at the threshold 10 of AD-018.

**Independent test:** `ArquiteturaTests` verde com as regras novas; a suíte da API verde.

### S4: Permissão das ações do chamado em um lugar (P1)

O `Agir` vira o pipeline behavior `AgirNoChamado`, e as 9 ações passam por ele sem poder pular.

**Acceptance Criteria**

17. The API source SHALL call `PermissoesChamado.Estados` in exactly one file, the one declaring `AgirNoChamado`.
18. The API SHALL have exactly the 9 action message types implementing `IAcaoChamado`, and the set of `Acao` values they produce SHALL equal the 10 action names of `PermissoesChamado` (`responder`, `nota`, `assumir`, `resolver`, `confirmar`, `rejeitar`, `cancelar`, `encaminhar`, `reclassificar`, `duplicado`).
19. WHEN any of the 9 action routes is called on a ticket the caller cannot see THEN the API SHALL return 404 even with an invalid body.
20. IF the caller's role may never perform the action THEN the API SHALL return 403 even with an invalid body.
21. IF the body is invalid and the ticket is in a state where the action is not allowed THEN the API SHALL return 400, not 409.
22. WHEN an action is applied THEN the API SHALL save it in one `SaveChangesAsync` call and return the ticket detail with 201 for `/mensagens` and 200 for the other 8 routes.
23. WHEN a request that does not implement `IAcaoChamado` is sent THEN `AgirNoChamado` SHALL not run.

**Independent test:** a tabela de ordem 404 -> 403 -> 400 -> 409 sobre as 9 rotas; a regra de texto
do `PermissoesChamado.Estados`.

## Out of scope

| Excluded | Why |
| --- | --- |
| Notificações do `Mediator` (`INotification`) para e-mail e avisos | `Avisos` grava em `email_saida` na mesma transação da ação; publicar à parte mudaria quando o e-mail é gravado |
| `Agendador`, `InstituicaoComando`, `Sessao` e `/auth/logout` pelo mediator | não são casos de uso HTTP com regra (pergunta aberta 2); o `IgnoreQueryFilters` só no comando e no agendador é regra fixa do `ArquiteturaTests` |
| Behaviors de log, métrica ou transação genéricos | ninguém pediu; o log de hoje fica onde está |
| FluentValidation ou outra biblioteca de validação | door 4: a validação fica no handler, na ordem de hoje |
| Reorganizar `api.Tests` por caso de uso | os testes são por comportamento HTTP e cruzam fatias, como decidido no `refatoracao-solid` |
| Qualquer mudança no `web/` | o contrato HTTP não muda; a interface nova é outra feature (AD-020) |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Arquitetura e mediator | vertical slice completa com `Mediator` 3.0.2, `MSG0005` como erro, `Agir` como pipeline behavior | AD-019, decisão do usuário em 02/11 | y |
| Quando | 03–05/11, antes da banca, depois de o `refatoracao-solid` passar na verificação | ROADMAP Etapa 4c; uma feature por vez no `api/` | y |
| Perfil do `tlc-spec-lean` | `standard`, budget 150k | o mesmo do `mvp-one`, `rag` e `refatoracao-solid`; um refactor só é seguro se a injeção de falhas prova que os testes que o prendem falham | y |
| Cadastros genéricos (12 rotas) | 12 arquivos de caso de uso; a validação e a projeção de cada entidade ficam no arquivo do `Criar` dela, e `Listar`/`Alterar` as chamam; o laço genérico de hoje fica num auxiliar da fatia | o `Mediator` não aceita mensagem genérica; usuário escolheu (a) em 02/11 | y |
| O que fica fora do mediator | `/auth/logout`, fallbacks, `InstituicaoComando`, `Agendador`, `Sessao` | usuário escolheu (a) em 02/11 | y |
| Retorno do lambda | a minimal API aceita `ValueTask<IResult>` de `IMediator.Send` sem mudar o status nem o corpo | o AC 2 e o AC 4 provam no primeiro commit estrutural | n |
| Exceções no handler | `DbUpdateConcurrencyException` e chave única violada atravessam o mediator sem embrulho e continuam virando 409 (door 14 do `mvp-one`) | nenhum `MessageExceptionHandler` é registrado; conferido em 02/11 num console .NET 10 com `Mediator` 3.0.2 (a `InvalidOperationException` do handler chegou sem embrulho); os testes de concorrência existentes (AC 1) provam no projeto | y |
| Behavior restrito por interface | `where TMessage : IAcaoChamado` faz o `AgirNoChamado` rodar só para as 9 ações | conferido em 02/11 num console .NET 10 com `Mediator` 3.0.2: com `where TMsg : IMessage, IAcaoChamado` o behavior rodou só na mensagem que implementa a interface; `ISender` também existe (resolvido do DI); o AC 23 prova no projeto | y |
| Categoria dos logs | o `ILogger<Email>` do primeiro acesso mantém a categoria de hoje | não mudar o que aparece no log | n |

**Open questions:** none - all resolved or logged above. As 2 perguntas do planejador foram respondidas pelo usuário em 02/11: (1) cadastros genéricos viram 12 arquivos de caso de uso; (2) `/auth/logout`, fallbacks, `InstituicaoComando`, `Agendador` e `Sessao` ficam fora do mediator.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| API: as 59 rotas | forma da resposta, status, quem pode chamar | n/a - nenhuma muda; AC 1 e AC 2 prendem, AC 3 o filtro de administrador |
| API: as 59 rotas | forma do erro e códigos | existente (`Problemas`, Problem Details); AC 4 prende os corpos byte a byte, AC 13, 14, 19 a 21 a ordem dos status |
| API: as 59 rotas | versionamento, limite de taxa | n/a - sem versionamento hoje; as políticas `auth` e `mensagens` ficam nas mesmas rotas, AC 2 |
| comando `dotnet build` com `MSG0005` | saída e código de saída quando falha | erro `MSG0005` do gerador, build com código diferente de 0; AC 6 |
| comando `dotnet build` com `CA1502` | saída quando falha | existente desde o `refatoracao-solid`; AC 16 |
| comando `dotnet run -- instituicao ...` | saída, flags, códigos de saída | n/a - não muda nesta feature (pergunta aberta 2, opção a) |

## Sources

- AD-019 em `.specs/STATE.md` e ROADMAP, Etapa 4c, "Vertical slice completa com `Mediator`":
  decisão de arquitetura, pacote, `MSG0005` e o `Agir` como pipeline behavior.
- README do `Mediator` (https://github.com/martinothamar/Mediator): `AddMediator` com
  `ServiceLifetime` e `PipelineBehaviors`, `IRequest<T>`/`IRequestHandler<,>` com `ValueTask<T>`,
  `IPipelineBehavior<TMessage, TResponse>` restrito por interface, mensagens genéricas não aceitas.
- ASP.NET Core 8, mudança incompatível "IFormFile parameters require anti-forgery checks"
  (https://learn.microsoft.com/aspnet/core/breaking-changes/8/antiforgery-checks): por que o
  formulário continua lido pelo `HttpRequest`.
