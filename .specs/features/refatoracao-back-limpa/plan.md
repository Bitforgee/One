# Refatoração do back: Vertical Slice real, Código Limpo e Regra de Dependência

**Aprovado por humano em 2026-11-12.** O dono aprovou o plano e delegou as quatro perguntas abertas ("faça o que for recomendado"): cada uma foi resolvida com a recomendação do plano e está nas Assumptions com `Confirmed? y` (rationale "user delegated"). Daqui em diante as portas aprovadas (`## Landing`) não são reescritas; só recebem linhas novas.

## Problem

O `One.Api` já está em fatias verticais (AD-017, AD-019) e tem domínio parcialmente rico (AD-024), mas o que
a arquitetura promete e o que o código faz divergem em pontos medidos hoje (base `97524d1`):

- **Regra de negócio fora do domínio.** `Agendador.cs` (280 linhas, 7 tarefas e a indexação) decide
  quando uma conversa é abandonada e quando um chamado fecha, lembra ou é resolvido sem resposta, com
  `ExecuteUpdateAsync` e `new EventoChamado`/`new MensagemChamado` direto (linhas 169-229), contornando os
  métodos de `Chamado`. O teste `Chamado_muda_so_pelos_metodos` (`ArquiteturaTests.cs:501`) isenta o
  `Agendador.cs` pelo nome, e `IgnoreQueryFilters_so_no_agendador_e_no_comando` (L74) também.
- **Entidades anêmicas.** 16 arquivos de `One.Api/Dados/` têm duas ou mais propriedades `{ get; set; }`
  (128 setters públicos pelo regex): `Usuario`, `Conversa`, `MensagemConversa`, `Instituicao`,
  `ImagemInstituicao`, `Setor`, `TokenAcesso`, `EmailSaida`, `TrechoFonte`, `Matricula`, `Categoria`,
  `Curso`, `RespostaPronta`, `CitacaoArtigo`, `AtendenteSetor`, `UsuarioPapel`. A regra mora no handler
  (`DefinirSenha.cs:28-29`, `TrocarSenha.cs:25-26`, `DesativarUsuario.cs:24`, `EncerrarConversa.cs:22`,
  `AvaliarConversa.cs:27`, `Transferencia.cs:48`, retentativa do e-mail em `Agendador.cs:238-243`).
  `PushSaida`, `TokenMcp` e `Chamado` mostram a forma certa e ninguém é obrigado a segui-la.
- **Domínio que conhece EF.** `Dados/Fluxos/ResolverFluxo.cs` (98 linhas) mistura regra pura (`Escolher`,
  `Etapa`, `Proximo`) com consultas EF, e `Dados/EquipeDeSetor.cs` usa `OneDb`. A regra de dependência
  (o centro não conhece o detalhe) está quebrada para esses dois arquivos.
- **Arquivos e métodos que fazem muita coisa.** Seis arquivos passam de 150 linhas: `OneDb.cs` 290,
  `Agendador.cs` 280, `Assistente/Assistente.cs` 273 (prompt, busca, anexos, HTTP, validação de citação
  e log), `Dados/Chamados/Chamado.cs` 234, `Program.cs` 168 (infraestrutura, S3, ProblemDetails,
  registro de fatias, cookie, limite de taxa, auth do MCP e comandos de linha de comando) e
  `Instituicoes/InstituicaoComando.cs` 151 (quatro comandos numa classe estática com `GetRequiredService`).
  `Chamado.Abrir` recebe 13 parâmetros; `Rejeitar`, `Subir` e `Encaminhar` de 7 a 9.
  `Chamados/Shared/DetalheChamado.cs` faz 9 a 10 consultas num método e importa `Assistente` e `Conhecimento`.
- **Fatias que se enrolam.** `Assistente` usa `Chamados` e `Chamados` usa `Assistente` (um ciclo);
  `Indicadores` usa `Assistente` só para `Tipos.SemBase`. `ResponderChamado.cs:11` e `ConversaRotas.cs:13`
  declaram cada um a sua `MaxAnexo`.
- **Detalhe de plataforma na raiz.** `Armazenamento.cs:53` lê `TimeProvider.System` (AGENTS.md manda
  `TimeProvider` injetado) e `Armazenamento.ComTamanho` devolve `IResult`; `Email.cs`, `Tokens.cs` e
  `Sessao.cs` na raiz conhecem `OneDb` e entidades.
- **Baldes horizontais e chamadas ao interior da vizinha** (segunda auditoria, contra o critério de Vertical Slice
  estrito: tudo do caso de uso numa unidade, compartilhar só no terceiro uso, sem `Shared`/`Common`/`Utils`; medida
  em 194 arquivos e 7.673 linhas de `One.Api/` sem `Migracoes/`):
  3 pastas `Shared` com 9 arquivos (`Administracao` 6, `Conhecimento` 2, `Chamados` 1) que o teste
  `ArquiteturaTests.cs:811-820` exige, com 32 `using One.Api.<Fatia>.Shared;`;
  16 classes `*Rotas` entre 107 métodos `Mapear`, das quais 6 só encadeiam `Mapear` (`InstituicaoRotas`,
  `ImportacaoRotas`, `IndicadorRotas`, `FluxoRotas`, `PushRotas`, `AparenciaRotas`) e outras carregam helper sem
  rota (`AdminRotas.NaoEncontrado/Repetido/Nome` com 8, 10 e 6 usos, `UsuarioRotas.Validar/Gravar` com 2 chamadores
  cada, `ArtigoRotas.Validar/Versao` com 2 e `ArtigoRotas.Ler` com 4, `ChamadoRotas.Carregar` com 4, `AcoesChamado.Texto/
  NomeDoResponsavel/RejeitarResolucao`);
  5 chamadas estáticas de um caso de uso ao interior de outro (`AlterarCategoria.cs:20`, `AlterarCurso.cs:20`,
  `AlterarRespostaPronta.cs:20`, `AlterarSetor.cs:20` para `CriarX.Validar`; `Assistente/ConversaRotas.cs:57`
  para `ResponderChamado.LerAnexo`) e `Assistente/BaixarAnexoConversa.cs:32-33` que usa `ChamadoRotas.Carregar` e
  `PermissoesChamado` de `Chamados`;
  `AcessoChamado` com 7 propriedades e 25 referências em 14 arquivos, que leva `IConfiguration` e `Prazos` para 4
  leituras (`AcoesChamado.cs:32`, `ResolverChamado.cs:25`, `MarcarDuplicado.cs:27`, `ResponderChamado.cs:69`)
  embora `Usuario` e `Instituicao` já estejam na mensagem (`IAcaoChamado`);
  `Instituicoes/AparenciaDados.cs:19` é herdado por `Acesso/VerInstituicao.cs:11`, um record de resposta usado por
  duas fatias, que o AD-024 proíbe ("no DTO shared across slices");
  `Instituicoes/InstituicaoComando.cs:140,145` usa `Embeddings` e `Assistente.Buscar`, ou seja, o comando
  `avaliar` mora na fatia que não é dona da busca; `Conhecimento/Arquivos.cs` é lido por 4 fatias
  (`Conhecimento` 2, `Assistente` 3, `Chamados` 3, `Instituicoes` 1 ponto);
  e duas movimentações que este plano previa na S7 aumentariam o acoplamento em vez de reduzi-lo: `Sessao.cs`
  para `Acesso` (os acessores `HttpContext.Usuario()` e `Instituicao()` têm 34 chamadas em 7 fatias) e `Tokens.cs`
  dividido (`Hash`, `UrlBase` e `Link` são usados por 5 fatias). Corrigidas no AC 52.

Quem paga: as duas pessoas do grupo, nas próximas features (cada uma copia a forma que existir; um
chamado novo ainda pode ser alterado por um `ExecuteUpdateAsync` esquecido), e a banca de 20/11, que avalia
a arquitetura. O pedido do dono: refatorar o back para Vertical Slice de verdade, Código Limpo
(Robert C. Martin) e Regra de Dependência da Arquitetura Limpa **sem mudar nada que se observa de fora**.

**Evidência externa:** nenhuma. Não há número de falha em produção (não há produção), contagem de
incidentes nem métrica de manutenção. Os números acima são contagens do repositório, medidas nesta
sessão. O ganho é de estrutura, e quem discordar deve discordar do critério (`## Criteria`), não de uma
estatística.

**O que muda quando isto estiver pronto:** para o aluno, o atendente e o administrador, nada: rotas,
status, corpos JSON, ProblemDetails, tabelas, migrations e saída dos comandos ficam iguais, e a suíte atual
e os retratos provam. Para quem programa: cada regra mora na entidade ou na fatia dona; o `Agendador`
só repete e despacha; o domínio não importa EF; as exceções às regras de arquitetura vivem em listas
que só encolhem.

## Flow

Reusa a rede que já existe: `RetratoTests` com `Retratos/{rotas,erros,sucessos,gravacoes,importacao}.txt`,
os 61 testes (`[Fact]` e `[Theory]`) do `ArquiteturaTests`, o pipeline `AgirNoChamado`, o `Recusa` de `Dados/Recusa.cs`
e as listas por igualdade exata (`ReferenciasEntreFatias`) como modelo do ratchet; nada disso é reescrito.

Caminho de um pedido HTTP depois da refatoração (a forma de hoje, com as mudanças marcadas):

1. requisição -> `Program` (exists) - só monta o host; chama `AddX`/`MapX` de cada fatia (door 2)
2. `Map<Fatia>` (door 2) - chama o `Mapear` de cada caso de uso (exists), que liga o corpo em `Entrada` e envia a mensagem
3. `IMediator.Send` -> handler do caso de uso (exists) - só orquestra: lê, chama o domínio, grava, monta a resposta
4. handler -> método ou fábrica da entidade em `One.Api/Dados` (exists) - decide a regra; devolve `Invalido`/`Recusa` (door 6), nunca `IResult`
5. handler -> `OneDb` (exists) - `SaveChangesAsync`; o mapeamento EF mora em `Dados/Mapeamento` (door 8), que só ele e o `OneDb` importam EF
6. out: `IResult` com o record nomeado de hoje (exists) - mesmo status, mesmo JSON

Entre fatias (acrescentado na revisão da auditoria, antes da aprovação): uma fatia chama outra só por
`IMediator.Send` de um record público (como `AbrirChamado`), por tipo de `Dados` ou da raiz, ou por um par da lista
fechada `ReferenciasEntreFatias`; nunca por método estático do interior de um caso de uso de outro (door 9).

Caminho do `Agendador` depois da refatoração:

1. `Agendador` (exists) - a cada 60 s chama `Ler` de cada `ITarefaAgendada` (door 1), na ordem de registro
2. `Agendador` (exists) - para cada item abre um escopo, fixa `InstituicaoAtual` e chama `Executar` da tarefa (door 1)
3. tarefa da fatia dona (door 1) - para `Chamado`: carrega, chama o método de domínio, `SaveChangesAsync` com `xmin`; para `Conversa`, `EmailSaida`, `TrechoFonte`: ver door 7
4. out: o mesmo evento, a mesma mensagem, o mesmo aviso e o mesmo log de hoje

## Impact

| Front | What changes |
| --- | --- |
| domain | termo novo: `ITarefaAgendada` e `ItemAgendado` - contrato de uma tarefa do `Agendador`, uma classe por tarefa na fatia dona; vive em `Agendador.cs`; quem ramifica hoje: o `switch` de `Agendador.Despachar` e os testes que leem `Item.Tipo` (`"push"`, `"conversa"`, `"chamado"`, `"aguardando"`, `"lembrete"`, `"subir"`, `"email"`, `"trecho"`) em `AgendadorTests`, `PushAgendadorTests` e outros; os tipos ficam iguais |
| domain | termo novo: `AbrirChamado` - caso de uso da fatia `Chamados` que hoje é `Transferencia.Criar` (transação, número `ONE-n` por `UPDATE instituicao ... RETURNING`, escolha de categoria, roteamento); chamado hoje por `Assistente/TransferirConversa.cs` e `Assistente/AtendimentoDireto.cs` |
| domain | termo novo: `RoteamentoDeFluxo` - regra pura de `ResolverFluxo` (`Escolher`, `Etapa`, `Situacao`, `Proximo`) em `Dados/Fluxos`; as consultas (`CarregarContexto`, `Candidatos`, `Rotear`, `Seguinte`) e `EquipeDeSetor` passam para a fatia `Chamados`; quem chama hoje: `Chamados/Transferencia.cs:47`, `Chamados/SubirChamado.cs:28`, `Assistente/VerDestino.cs:27`, `Administracao/SimularFluxo.cs` (4 usos), `Administracao/CriarSetor.cs:26`, `Agendador.cs:222`; o teste `Setor_so_pelo_ResolverFluxo` lê esses nomes |
| domain | termo novo: `Invalido` - motivo de um 400 que a própria entidade decide, par do `Recusa` (409); vive em `Dados/Invalido.cs` (door 6) |
| domain | termo novo: `Cpf` deixa de ser classe estática de ajuda e vira o tipo da propriedade `Usuario.Cpf`; quem lê hoje: 12 pontos em `Acesso`, `Administracao`, `Instituicoes` (`Cpf.Normalizar`, `Cpf.Mascarar`) e 25 arquivos de teste que montam ou leem CPF (door 4) |
| domain | termo movido: `EstadosChamado`, `TiposEvento`, `Desfechos` e as demais classes de valores gravados saem de `Dados/Entidades.cs` para a pasta da entidade dona; `Entidades.cs` fica com `IDaInstituicao`; o teste `Literais_gravados_so_nas_constantes` fixa o caminho `Dados/Entidades.cs` |
| domain | termo novo: parameter objects (`NovoChamado` e irmãos) no arquivo da entidade; `Chamado.Abrir` de 13 parâmetros, `Rejeitar`, `Subir` e `Encaminhar` passam a ter no máximo 5 (`Reclassificar` já tem 5 na base) |
| domain | termo novo: `Add<Fatia>` e `Map<Fatia>` - extensões por fatia que substituem as 12 chamadas `*Rotas.Mapear` e os registros soltos de `Program.cs` (door 2) |
| domain | termo removido: `Agendador.Despachar` com strings mágicas, `Agendador.Ler/Processar` internos de cada tarefa; a superfície pública `Agendador.Executar()`, `Ler()` e `Processar(lidos)` fica, porque 50 pontos de teste a chamam |
| code | `Program.cs` perde `Servicos`, `Seguranca`, `Llm`, `Limite` e `Rotas`; `Armazenamento.AddArmazenamento` recebe o cliente S3; `Persistencia.cs`, `Seguranca.cs` e `TratamentoDeErros.cs` entram na raiz; `Sessao.cs` se divide: `Validar`, `Principal` e `ExigirTrocaDeSenha` vão para `Acesso` e os acessores `Usuario()` e
`Instituicao()` ficam na raiz; `Tokens.cs` perde `Novo` (vira `TokenAcesso.Criar`) e `NovoMcp`/`SlugDoMcp` (vão para
`Dados/Mcp/TokenMcp.cs`) e fica com `Hash`, `UrlBase` e `Link` (AC 52); `Email.cs` divide em `EnviadorSmtp` e `LayoutEmail`; `Cpf.cs` vai para `Dados/Usuarios` |
| code | `ArquiteturaTests` ganha 11 regras de ratchet (S1; eram 9 antes da auditoria) e perde as isenções do `Agendador`; ficam mais de 10 testes cujo arquivo inspecionado muda e cuja regra não muda (lista e salvaguarda na Assumption "Testes de arquitetura que mudam de alvo"), mais os que leem `Shared` (`ArquiteturaTests.cs:446, 763-820, 852, 906`) |
| code | `AGENTS.md` cita `Instituicoes/InstituicaoComando.cs` como exceção do `IgnoreQueryFilters`, mas o arquivo não usa (verificado: zero ocorrências, só `Agendador.cs` com 15); a frase e a lista do teste são corrigidas na S6 |
| code | (S9) as 3 pastas `Shared` (9 arquivos) e as 16 classes `*Rotas` deixam de existir: os 9 records de resposta vão para a raiz da fatia dona (namespace `One.Api.<Fatia>`; 32 `using ...Shared;` e 4 pontos de teste mudam), os `Mapear` passam para `Map<Fatia>`, e cada helper vai para o caso de uso que o usa (até 2 usos: `UsuarioRotas.Validar/Gravar`, `ArtigoRotas.Validar/Versao`) ou para um arquivo com o nome do que faz (3 ou mais: `AdminRotas.NaoEncontrado/Repetido/Nome`, `ChamadoRotas.Carregar`, `ArtigoRotas.Ler`); quem ramifica hoje no nome `*Rotas`: `Map_so_nos_casos_de_uso` (L407-420, que acha o `logout` por conteúdo) e `Fora_do_mediator` |
| code | (S9) `AcessoChamado` fica com `Chamado`, `Papel` e `Agora`; `AgirNoChamado` deixa de receber `Prazos` e `IConfiguration`; `AcoesChamado`, `ResolverChamado`, `MarcarDuplicado` e `ResponderChamado` pegam `Prazos` e `IConfiguration` pelo construtor e `Usuario` e `Instituicao` da mensagem |
| code | (S9) `Conhecimento/Arquivos.cs` vai para a raiz (`Arquivos.cs`, 4 fatias o usam) e `Fontes.DoArtigo`, `TextoDoArtigo` e `Ultima()` viram métodos de `TrechoFonte`, `VersaoArtigo`, `Artigo` e `Documento`; o comando `avaliar` (`InstituicaoComando.cs:100-151`) vai para `Assistente`, dona de `Embeddings` e `Buscar`; `Acesso/VerInstituicao.Resposta` passa a declarar os próprios campos em vez de herdar `AparenciaDados`; `ReferenciasEntreFatias` sai de 16 pares para 10 (as rotas `/admin` de `Conhecimento` e `Instituicoes` passam para a fatia dona) e a lista de arquivos da raiz de `Fatias_do_api` ganha `Arquivos` |
| contract HTTP | nada: as 93 linhas de `Retratos/rotas.txt` (rotas), status, nomes, ordem e tipos dos campos, `null` versus ausente, Location dos 201 e ProblemDetails iguais aos da base; os retratos provam |
| stored data | nada a migrar: nenhuma tabela, coluna, índice, FK ou valor gravado muda; nenhum arquivo novo em `Dados/Migracoes/`; `Cpf` e `EmailSaida` usam conversão de valor sobre a coluna que já existe |
| tests | nenhuma asserção de comportamento muda; mudam fixtures que montam entidades agora encapsuladas (`new Usuario { ... }` e atribuições) e os caminhos que 11 testes de arquitetura leem (Assumption aprovada) e `RetratoTests.cs:49`, que passa a comparar as linhas de `rotas.txt` como conjunto ordenado |
| decisions | AD-054 proposto (texto abaixo); AD-017 (lista fechada de pares entre fatias) e AD-024 (sem projetos separados, sem repositório) continuam ativos e são cumpridos, não substituídos |

### AD-054 (gravado em `STATE.md` em 2026-11-12, status active)

> `refatoracao-back-limpa` plan approved (2026-11-12): `One.Api` is refactored with no change to routes, statuses, JSON,
> migrations or schema, in 9 slices ordered by risk. Doors that outlive the feature: (1) the scheduler runs
> `ITarefaAgendada` classes owned by their slices and `Agendador` keeps only the loop and the dispatch;
> (2) each slice exposes `Add<Fatia>(IServiceCollection)` and `Map<Fatia>(RouteGroupBuilder)`, and the `/admin` routes of
> `Conhecimento` and `Instituicoes` are mapped by their own slice; (3) architecture
> exceptions live in lists inside `ArquiteturaTests` that must equal the offenders in both directions and may
> only shrink, and a public setter on a domain type is forbidden except `InstituicaoId`; (4) `Cpf` is a value
> object converted by `HasConversion` on the existing `char(11)` column; (5) a business rule returns `Invalido`
> (400) or `Recusa` (409) from the domain, never `IResult`; (6) EF mapping lives in `Dados/Mapeamento` as one
> `IEntityTypeConfiguration<T>` per entity, applied one by one in a fixed order (`ApplyConfigurationsFromAssembly` only if
> the S8 spike shows the same model under `pt-BR` and `Invariant`); (7) a scheduler rule on an
> aggregate with a row version (`Chamado.Xmin`) goes through a domain method and `SaveChangesAsync`, and on an
> aggregate without one it stays a conditional `ExecuteUpdateAsync` inside the task of the owning slice, with
> the condition exposed by the domain; (8) a slice calls another only by `IMediator.Send` of a public record, by a
> type of `Dados` or of the root, or by a pair of the closed list in `ArquiteturaTests`, and no folder is named
> `Shared`, `Common`, `Utils` or `Helpers`. Projects stay two (`Dois_projetos_sem_repositorio`); no Domain,
> Application or Infrastructure project is created. The generic `CadastroRotas` is removed; the architecture tests that
> inspect a moved file change only the path, name or list, one test per commit, checked by the Verifier. Amends AD-017
> (the closed pair list loses the cycle and two `Administracao` pairs) and is bounded by AD-024; it reverses the
> `dominio-e-contratos` plan note of 2026-11-02 ("`Cpf` does not become a type now"), which was never an AD. Source: user
> request of this session; Jovanovic, "Vertical Slice Architecture in .NET".

## Relations

None - no stored-data shape change. Nenhuma migration é gerada: o teste `Modelo_sem_mudanca_pendente`
(`HasPendingModelChanges()` falso) e a ausência de arquivo novo em `One.Api/Dados/Migracoes/` provam;
`Cpf` usa `HasConversion` sobre a coluna `char(11)` e o índice único que já existem.

## Surface

None - nothing consumed outside. Nenhuma rota é criada nem muda de assinatura. Que os status e os corpos
das rotas de `Retratos/rotas.txt` ficam idênticos é critério (AC 1 e AC 2), não superfície nova.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. contrato de uma tarefa do `Agendador` (padrão que o código não tem; a próxima tarefa copia) | em `Agendador.cs`: `public sealed record ItemAgendado(string Tipo, long Id, long InstituicaoId);` e `public interface ITarefaAgendada { string Tipo { get; } int Lote => 1; Task<List<ItemAgendado>> Ler(OneDb db, DateTime agora); Task Executar(OneDb db, IReadOnlyList<ItemAgendado> itens, DateTime agora, CancellationToken parar); Task Limpar(OneDb db, DateTime agora, CancellationToken parar) => Task.CompletedTask; }`; uma classe `sealed` por tarefa na fatia dona, registrada em `Add<Fatia>` com `s.AddSingleton<ITarefaAgendada, FecharResolvidos>();`; o `Agendador` recebe `IEnumerable<ITarefaAgendada>` e executa na ordem de registro (`conversa`, `chamado`, `aguardando`, `lembrete`, `subir`, `email`, `trecho`, `push`, como hoje); `Lote` é o `Embeddings.Lote` da tarefa `trecho`; `Limpar` roda depois de `Processar`, só em `ApagarLancamentos` (hoje `ApagarLancamentosVencidos`) | uma mensagem `Mediator` por tarefa: `Um_arquivo_por_caso_de_uso` exige `public static void Mapear(RouteGroupBuilder` em toda mensagem, e tarefa não tem rota. Um `IHostedService` por tarefa: sete relógios, perde o ciclo único que os 50 pontos de teste chamam em `Agendador.Executar()` e a ordem trechos antes dos demais. Manter o `switch`: a regra continua na raiz e a string mágica continua |
| 2. extensões por fatia (padrão novo; toda feature seguinte copia) | `One.Api/Chamados/ChamadosExtensoes.cs`, namespace `One.Api.Chamados`: `public static class ChamadosExtensoes { public static IServiceCollection AddChamados(this IServiceCollection s) { ...; return s; } public static void MapChamados(this RouteGroupBuilder api) { ChamadoRotas.Mapear(api); ... } }`; `Program` fica `builder.Services.AddPersistencia().AddArmazenamento().AddSeguranca().AddTratamentoDeErros().AddChamados()...` e `api.MapChamados(); ...`; as classes `*Rotas` que só encadeiam `Mapear` deixam de existir (door 9); as infraestruturas transversais são `Persistencia.cs`, `Seguranca.cs`, `TratamentoDeErros.cs` e `AddArmazenamento` em `Armazenamento.cs`, todos na raiz | uma classe `ModuleBase` com interface `IModulo` descoberta por reflexão: interface com uma única forma de uso, e a reflexão esconde do compilador o que `Program` registra (o repositório jeangatto faz o mesmo com `IFeatureMarker` e `AddMediatR`/`AddValidatorsFromAssembly`/`AddAutoMapper` por varredura de assembly). Manter `Servicos(...)` único: é a causa atual das cinco responsabilidades. Pasta `Infra/` na raiz: `Fatias_do_api` fixa as pastas do `One.Api` em `Dados` mais as fatias |
| 3. regra do ratchet (precedente para todas as regras novas) | cada regra nova é um `[Fact]` com `static readonly string[] Excecoes = [ ... ];` e `Assert.Equal(Excecoes.Order(), Ofensores().Order())`: a lista tem de ser igual aos ofensores nos dois sentidos, então quem corrige um ofensor e esquece de tirá-lo da lista falha, e quem cria um ofensor novo falha. Regra do setter: por reflexão, todo tipo em `One.Api.Dados*` cujo `SetMethod` é público e não `init`, exceto a propriedade `InstituicaoId` (door 3 de `dominio-e-contratos`), com o `Init(PropertyInfo)` que o `ArquiteturaTests` já tem. A lista nasce no commit da S1 e depois só perde linhas (`git diff` sem linha adicionada nas listas) | teto numérico (`Assert.True(ofensores.Count <= 36)`): não obriga a lista a encolher e deixa trocar um ofensor por outro. Analisador Roslyn próprio: pacote e projeto novos para uma regra que a reflexão já cobre. Bloquear o setter público de uma vez: 16 entidades, centenas de linhas e fixtures num commit só, sem ponto de parada |
| 4. `Cpf` como objeto de valor | `public sealed record Cpf { Cpf(string valor) => Valor = valor; public string Valor { get; } public static Cpf? Tentar(string? texto); public static Cpf Ler(string gravado); public string Mascarado { get; } public override string ToString() => Valor; }` em `One.Api/Dados/Usuarios/Cpf.cs`; `Tentar("111.444.777-35")` devolve `Valor == "11144477735"`, dígito errado devolve `null`; no `OneDb`: `e.Property(x => x.Cpf).HasConversion(c => c.Valor, v => Cpf.Ler(v)).HasColumnType("char(11)");` e o índice único `(instituicao_id, cpf)` fica como está | conversão implícita de `string` para `Cpf`: esconderia entrada inválida atrás de exceção. `ComplexProperty`/`[Owned]`: o EF nomeia a coluna `cpf_valor`, o que é migration. Manter o helper estático sobre `string` (decisão de 02/11 em `dominio-e-contratos`, tomada por causa do prazo da banca): continua válido, mas nada impede `Usuario.Cpf = "abc"` |
| 5. cadastros genéricos (`CadastroRotas`); decidido: opção B (Assumptions) | opção B: remover `CadastroRotas.Listar/Criar/Alterar<T, TOut>`; cada um dos 4 cadastros (setor, categoria, curso, resposta pronta) tem handlers próprios de uns 12 linhas: `var setor = Setor.Criar(m.Corpo.Nome!, m.Corpo.Triagem ?? false); db.Setores.Add(setor); await db.SaveChangesAsync(ct); return Results.Created($"/api/admin/setores/{setor.Id}", SetorResposta.De(setor));` | opção A, manter o genérico trocando `Action<T> aplicar` por `Func<T> criar`: continua `db.Set<T>()` e `EF.Property<long>(e, "Id")` por string (um repositório genérico com outro nome, contra o espírito de AD-024; rejeitada), e `where T : new()` exige construtor público e setters públicos, que o ratchet da door 3 proíbe |
| 6. erro de domínio em vez de `IResult` | `public sealed record Invalido(string Motivo);` em `Dados/Invalido.cs` ao lado de `Recusa`; a entidade expõe `public static Invalido? Validar(...)` para entrada e `Recusa?` para estado, e a fábrica lança `InvalidOperationException` se chamada sem validar (inalcançável por HTTP); o handler: `if (Fluxo.Validar(dados) is { } erro) return Problemas.Invalido(erro.Motivo, "etapas");` | `Result<T>` ou `OneOf` (jeangatto usa `Ardalis.Result`): dependência ou tipo novo que toda assinatura passaria a carregar. Exceção capturada no handler e devolvida como 400 (Telerik: `Cancel()` lança `InvalidOperationException`) ou mapeada para 400: segundo caminho de erro, e o `AddExceptionHandler` só conhece `ArmazenamentoIndisponivel` e conflito de concorrência. `IResult` no domínio: quebra a door 7 de `dominio-e-contratos` (domínio sem ASP.NET Core) |
| 7. regra do `Agendador` sobre agregado | com `xmin` (só `Chamado`: `OneDb.cs:208`, `Chamado.cs:42`): a tarefa carrega o chamado, chama o método (`FecharPorInatividade`, `LembrarAluno`, `ResolverPorFaltaDeResposta`), que confere a condição de hoje e devolve `Recusa?`, e faz `SaveChangesAsync` com `catch (DbUpdateConcurrencyException) { return; }`, como `SubirPorPrazo` já faz. Sem `xmin` (`Conversa`, `TrechoFonte`): a tarefa da fatia mantém um `ExecuteUpdateAsync` condicional, e a condição vem do domínio como `Expression<Func<Conversa, bool>>` (`Conversa.Abandonavel(limite)`), que a leitura e a gravação usam. `EmailSaida` e `PushSaida` já são leitura e gravação sem condição: `RegistrarFalha(agora)` na entidade | `xmin` também em `Conversa`: mexe no modelo EF, e `Modelo_sem_mudanca_pendente` e a regra de zero migration proíbem. Carregar e gravar a `Conversa` sem token de versão: troca o "pula se mudou" atômico do `UPDATE ... WHERE` por last-writer-wins, regressão de concorrência. Deixar tudo em `ExecuteUpdateAsync`: mantém a regra fora do domínio, que é o problema |
| 8. mapeamento EF fora do domínio (padrão novo) | `One.Api/Dados/Mapeamento/ChamadoMapeamento.cs`: `sealed class ChamadoMapeamento : IEntityTypeConfiguration<Chamado> { public void Configure(EntityTypeBuilder<Chamado> e) { ... } }`, uma classe por tipo de entidade; `OneDb.OnModelCreating` aplica uma a uma, `mb.ApplyConfiguration(new ChamadoMapeamento());`, em ordem fixa, e só depois roda o laço que renomeia tabelas, chaves e FKs ordenado por `ClrType.Name` (door 8 de `dominio-e-contratos`); só `Dados/Mapeamento/`, `OneDb.cs` e `Migracoes/` importam EF dentro de `Dados` | `ApplyConfigurationsFromAssembly` como padrão (é o que jeangatto usa em `BlogDbContext`); só entra se o spike da S8 mostrar modelo idêntico em `pt-BR` e `Invariant`, e então com uma linha nova neste Landing antes do código (Assumptions). Revisado antes da aprovação, porque o texto anterior dizia só "ordem indefinida": a documentação do EF diz que a ordem é indefinida, mas o código (`ModelBuilder.ApplyConfigurationsFromAssembly`, ramo `main`) percorre `assembly.GetConstructibleTypes().OrderBy(t => t.FullName)`, ou seja, ordena por `FullName` com o comparador de texto padrão, que depende da cultura e não é contrato publicado. O que ainda decide: o nome das FKs depende da ordem dos tipos (achado da door 8), e uma ordem que não é contrato pode gerar migration numa atualização do EF ou numa cultura diferente. Custo de adotar: 1 linha em `OnModelCreating` no lugar de uma por entidade, sem pacote novo, e o teste `Modelo_sem_mudanca_pendente` pega a deriva. Configuração dentro da entidade (`EntityTypeConfigurationAttribute` ou classe aninhada): o domínio volta a importar EF |
| 9. fronteira entre fatias e baldes horizontais (regra nova; a próxima feature copia) | duas regras de ratchet em `ArquiteturaTests`, com lista igual aos ofensores nos dois sentidos: `Caso_de_uso_sem_chamada_estatica_de_outro` (nenhum arquivo referencia `Outro.Membro` de um record de caso de uso de outro arquivo; ofensores do base: `AlterarCategoria.cs:20`, `AlterarCurso.cs:20`, `AlterarRespostaPronta.cs:20`, `AlterarSetor.cs:20`, `Assistente/ConversaRotas.cs:57`) e `Sem_balde_horizontal` (nenhuma pasta `Shared`, `Common`, `Utils` ou `Helpers` e nenhuma classe `*Rotas` em `One.Api/`; ofensores do base: 3 pastas, 16 classes). Uma fatia chama outra por `IMediator.Send(new RecordPublico(...))`, por tipo de `Dados` ou da raiz, ou por um par de `ReferenciasEntreFatias`; o que 3 ou mais fatias usam vai para a raiz ou para `Dados` | interface por fatia (`IChamadosApi`): AD-017 rejeitou interface sem segundo uso, e cada fatia ganharia um arquivo para o que um record já faz. `Publish` de notificações do `Mediator`: tipo de mensagem sem consumidor hoje. Deixar só como convenção escrita: foi assim que as quatro chamadas `CriarX.Validar` e as pastas `Shared` nasceram |

- Nothing else in this change is hard to reverse: mover código entre arquivos, dividir classes e trocar
  parâmetros por records se desfaz com outro refactor; nenhuma rota, campo JSON, tabela, coluna ou chave
  de configuração muda. As portas 1, 2, 3, 6, 7, 8 e 9 passam da feature e vão para o AD-054 acima. Revisão da auditoria, antes da aprovação: a rejeição da linha da door 8 foi reescrita (o motivo anterior era mais forte do que o código do EF) e a door 9 é nova; nenhuma outra linha aprovada foi alterada.

### Portas acrescentadas no build (só linhas novas; nenhuma linha aprovada acima foi alterada)

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| B1. onde mora `SoLideranca` (Lote B, S3; `EquipeDeSetor` sai de `Dados`, AC 19) | `One.Api/EquipeDeSetor.cs`, namespace `One.Api`: `public static class EquipeDeSetor { public static async Task<bool> SoLideranca(this OneDb db, Usuario u) }`, mesmo corpo; a raiz entra na lista de arquivos de `Fatias_do_api` (lista de dados, decisão 2). `Conhecimento` (2 arquivos), `Indicadores` e `Mcp` a chamam: 3 fatias, então a regra do terceiro uso e a door 9 mandam para a raiz | pôr em `Chamados` (texto literal do AC 19): criaria os pares `Conhecimento>Chamados` e `Indicadores>Chamados`, e o AC 21 e o C45 permitem só `Administracao>Chamados` como par novo na S3 |
| B2. onde moram as consultas de fluxo (Lote B, S3) | `One.Api/Chamados/ConsultasDeFluxo.cs`, namespace `One.Api.Chamados`, `public static class ConsultasDeFluxo` com `Lideranca`, `CarregarContexto`, `CategoriasQueUsamOSetor`, `Candidatos`, `Rotear`, `Seguinte` e `TemEtapaSeguinte` (os dois últimos e `Lideranca` e `CategoriasQueUsamOSetor` também usam `OneDb`, por isso saem de `Dados` junto com os quatro nomeados no AC 19); `Dados/Fluxos/RoteamentoDeFluxo.cs` fica com as 4 constantes de motivo, os records `Contexto`, `Resolucao`, `Passo`, `Rota` e as regras puras `Escolher`, `Etapa`, `Situacao` e `Proximo` | dividir em duas classes de consulta (`Lideranca`/`Contexto` e `Rotear`/`Seguinte`): sem segundo uso, e a lista do plano é de uma classe só |
| B3. a comparação de destino de `CategoriasQueUsamOSetor` (Lote B, S3) | `RoteamentoDeFluxo.UsaOSetor(Fluxo fluxo, long setorId)`, regra pura em `Dados/Fluxos/RoteamentoDeFluxo.cs` (fora do grupo de 4 do C39), que a consulta `ConsultasDeFluxo.CategoriasQueUsamOSetor` chama; assim `Setor_so_pelo_ResolverFluxo` continua afirmando que `.Destino ==` só aparece em `SalvarRascunho` e na regra de roteamento, com a mesma lista de dois arquivos | deixar `e.Destino == DestinosEtapa.Setor` dentro de `ConsultasDeFluxo.cs` e acrescentar esse arquivo à lista esperada do teste: afrouxaria o predicado (um terceiro arquivo passaria a comparar destino) |
| B4. forma de `AbrirChamado` (Lote B, S4, AC 24) | `One.Api/Chamados/AbrirChamado.cs`: `public sealed record AbrirChamado(Conversa Conversa, Matricula Matricula, bool ComLideranca = true)` com `public async Task<Chamado> Executar(OneDb db, Instituicao instituicao, DateTime agora)` (transação, numerador `UPDATE instituicao ... RETURNING`, roteamento e `Chamado.Abrir`, o corpo de `Transferencia.Criar`); `Assistente` o chama por `new AbrirChamado(...).Executar(...)` (par `Assistente>Chamados` já listado); `Transferencia` fica com `Matricula`, `MatriculaInvalida`, `EscolherCategoria` e as origens, que `VerDestino` também usa, e perde só `Criar`. **Não é `IRequest<>`** | mensagem `Mediator` (`IMediator.Send(new AbrirChamado(...))`, o texto de Flow e da door 9): `Um_arquivo_por_caso_de_uso` fixa 87 mensagens e 17 em `Chamados` e exige `public static void Mapear(RouteGroupBuilder` em toda mensagem, `Um_handler_por_mensagem_no_mesmo_arquivo` fixa 87 e `Resposta_por_caso_de_uso` fixa 87 e 74; uma mensagem sem rota muda esses números e a regra do `Mapear`, o que a decisão 2 (só caminho, nome ou lista) não cobre. Fica para o dono aprovar essa troca; converter depois é trocar `Executar` por um handler e ajustar esses três testes |
| B5. de onde vem o campo do 400 de `SalvarRascunho` (Lote C, S5, AC 33) | `Invalido` fica `Invalido(string Motivo)` (o C38 o fixa por grep); o domínio expõe 5 constantes de motivo em `Fluxo` (`MotivoDestino`, `MotivoLideranca`, `MotivoSetorAtivo`, `MotivoSetorSoDeSetor`, `MotivoPrazo`) e a fatia traduz cada uma para o campo do ProblemDetails (`destino`, `setorId`, `prazoHoras`; qualquer outro motivo, `etapas`), porque `FluxoAdminTests` e `erros.txt` afirmam o campo | acrescentar `Campo` a `Invalido`: o C38 afirma o texto `Invalido(string Motivo)`, e o campo é nome de formulário HTTP, que o domínio não deve conhecer. Mapear o campo pelo texto do motivo no handler: texto duplicado entre domínio e fatia, que quebra no primeiro ajuste de redação |
| B6. como as classes de comando recebem dependências (Lote C, S5, AC 36) | `InstituicaoComando.Executar(IServiceProvider, args, saida, erro)` mantém a assinatura (o `Program` o chama) e abre o escopo; cada subcomando é uma classe `sealed` (`ComandoCriar`, `ComandoCarga`, `ComandoOperador`, `ComandoAvaliarBusca`) criada por `ActivatorUtilities.CreateInstance<T>(escopo)`, com as dependências no construtor (`OneDb`, `TimeProvider`, `IConfiguration`, `Embeddings`, `Assistente`); nenhuma é registrada no contêiner (o golden `servicos.txt` não muda) e nenhum arquivo de `Instituicoes/` usa `GetRequiredService` | registrar as 4 classes com `AddTransient` em `Program`: muda o golden de serviços (C20/C81) e a lista fica para a S7. Passar `OneDb` e os outros por parâmetro de `Executar`: muda a assinatura que `Program` e `InstituicaoComandoTests` chamam |

## Criteria

Fatias verticais por resultado demonstrável, ordenadas por risco (menor primeiro) e por dependência.
Cada fatia termina com `dotnet build One.slnx` sem aviso de erro e `dotnet test One.Api.Tests` verdes e
um commit coerente. Numeração corre pelo plano inteiro.

### S1: Rede de segurança e régua antes de mexer (P1)

O comportamento atual fica preso por testes que faltam (concorrência do `Agendador`, corpos enviados ao
provedor de IA) e por onze regras de arquitetura em modo ratchet, tudo num commit sem mudança em `One.Api/`.

**Acceptance Criteria**

1. The system SHALL pass every API test that exists at base `97524d1` at every commit of this feature, with no existing assertion removed, skipped or loosened (`dotnet test One.Api.Tests` exits 0).
2. The API SHALL keep `One.Api.Tests/Retratos/rotas.txt`, `erros.txt`, `sucessos.txt`, `gravacoes.txt` and `importacao.txt` byte-identical to base, with every `RetratoTests` comparison passing; JSON bodies, statuses and ProblemDetails of the routes listed in `rotas.txt` (93 lines) are therefore unchanged.
3. The system SHALL add no file under `One.Api/Dados/Migracoes/`, leave `OneDbModelSnapshot.cs` untouched, and pass `Modelo_sem_mudanca_pendente` at every commit.
4. WHEN `dotnet build One.slnx` runs at any commit THEN it SHALL finish with 0 errors and no CA1502 (cyclomatic complexity above 10).
5. WHEN the assistant answers a question without attachment, answers with an attachment, and generates an embedding THEN the JSON text sent to the provider SHALL equal the golden text recorded at base for each of the three requests (a new test with a fake HTTP handler).
6. WHEN the state of a conversa, of a chamado resolvido, of a chamado aguardando (lembrete) or of a chamado aguardando (resolver sem resposta) changes between `Agendador.Ler()` and `Agendador.Processar(lidos)` THEN the cycle SHALL write no `EventoChamado`, no `MensagemChamado`, no aviso and leave the row unchanged, one new test per task.
7. WHEN two `Agendador.Executar()` run at the same time over the same overdue item of each of those four tasks and of `subir` THEN exactly one `EventoChamado` (and one `MensagemChamado` where the task writes one) SHALL exist afterwards, one new test per task.
8. The system SHALL add eleven ratchet rules to `ArquiteturaTests`, each with an exception list equal to the offenders at base in both directions: `Dados_sem_EfCore`, `Relogio_so_pelo_TimeProvider`, `Entidade_sem_setter_publico`, `Raiz_sem_fatias`, `Handler_sem_new_de_entidade`, `Arquivo_ate_150_linhas`, `Dados_ate_5_parametros`, `Mensagem_sem_entidade`, `Service_locator_so_na_composicao`, `Caso_de_uso_sem_chamada_estatica_de_outro` and `Sem_balde_horizontal` (the last two are door 9).
9. IF an offender of any ratchet rule appears or disappears without the same commit editing its list THEN that test SHALL fail.
10. The system SHALL add the S1 tests in a commit after which `git diff 97524d1 <that commit> -- One.Api` is empty, and no later commit SHALL add a line to any ratchet list.

**Independent test:** `dotnet test One.Api.Tests` verde; o Verificador remove uma linha de uma lista e injeta um ofensor, e o teste da regra acusa.

### S2: Domínio rico I - e-mail, usuário, conversa, token e instituição (P1)

As cinco entidades mais mexidas por handler deixam de aceitar escrita de fora e a regra passa a morar nelas.

**Acceptance Criteria**

11. WHEN an e-mail send fails THEN `EmailSaida.RegistrarFalha(agora)` SHALL increase `Tentativas` by 1 and set `ProximaTentativa` to `agora` plus 2 to the power of `Tentativas` minutes, the values `Agendador.Enviar` writes at base, proven by a domain test without database.
12. The system SHALL leave `Usuario`, `Conversa`, `MensagemConversa`, `TokenAcesso`, `Instituicao`, `ImagemInstituicao` and `EmailSaida` with no public setter except `InstituicaoId`, and `Entidade_sem_setter_publico` SHALL list none of them.
13. The system SHALL create `Usuario`, `Conversa`, `TokenAcesso`, `Instituicao` and `EmailSaida` outside `One.Api/Dados/` only through their static factories, with no `new X { ... }` of those types in `One.Api/` (`Handler_sem_new_de_entidade`).
14. WHEN `DefinirSenha`, `TrocarSenha`, `DesativarUsuario`, `EncerrarConversa` or `AvaliarConversa` runs THEN the decision now at `DefinirSenha.cs:28-29`, `TrocarSenha.cs:25-26`, `DesativarUsuario.cs:24`, `EncerrarConversa.cs:22` and `AvaliarConversa.cs:27` SHALL be taken by a method of `Usuario` or `Conversa`, with a domain test without database, and the handler SHALL return the status and body it returns at base.
15. The system SHALL leave `Dados/Entidades.cs` with only `IDaInstituicao`, each former vocabulary class (`EstadosChamado`, `TiposEvento`, `Desfechos` and the rest) in the file of its owning entity, and `Literais_gravados_so_nas_constantes` passing against the new paths.
16. WHEN `Cpf.Tentar` receives `"111.444.777-35"` THEN it SHALL return a `Cpf` whose `Valor` is `"11144477735"` and whose `Mascarado` is `"***.444.777-**"`; IF a check digit is wrong THEN it SHALL return `null`.
17. The system SHALL persist `Usuario.Cpf` through `HasConversion` on the `char(11)` column and keep the unique index on instituicao and cpf, with zero new migration (AC 3).

**Independent test:** os testes de domínio novos rodam sem banco; `Login`, `PrimeiroAcesso` e a importação de matrículas passam inalterados; o commit do `Cpf` é o último da S2 e pode ser revertido sozinho.

### S3: Dados sem EF - o roteamento de fluxo (P1)

A regra de escolher fluxo e etapa fica pura em `Dados`; as consultas passam para a fatia que as usa.

**Acceptance Criteria**

18. The system SHALL keep `Escolher`, `Etapa`, `Situacao` and `Proximo` in `RoteamentoDeFluxo` as pure static methods with no `OneDb` and no `Microsoft.EntityFrameworkCore` import, covered by tests that need no database (`Testes_de_regra_sem_banco`).
19. The system SHALL move `CarregarContexto`, `Candidatos`, `Rotear`, `Seguinte` and `EquipeDeSetor` to the `Chamados` slice, and `Dados_sem_EfCore` SHALL no longer list `Dados/Fluxos/ResolverFluxo.cs` or `Dados/EquipeDeSetor.cs`.
20. The system SHALL keep the four motives `"Curso sem coordenação"`, `"Sem liderança disponível"`, `"Setor inativo"` and `"Atendimento direto não passa pela liderança"` literally as constants, and `Setor_so_pelo_ResolverFluxo` SHALL keep its two predicates (destination switch only in `SalvarRascunho`-side rule and in the routing rule; callers use the routing methods) against the new names.
21. The system SHALL change `ReferenciasEntreFatias` by at most one entry, `("Administracao", "Chamados")`, because `SimularFluxo` and `CriarSetor` call the moved queries.

**Independent test:** `SimularFluxo`, `VerDestino`, `SubirChamado` e a transferência passam sem mudar asserção.

### S4: Assistente, Chamados e Indicadores sem ciclo (P2)

Os arquivos maiores do atendimento ficam com uma responsabilidade cada e `Chamados` deixa de depender de `Assistente`.

**Acceptance Criteria**

22. The system SHALL split `Assistente/Assistente.cs` into `MontarPrompt`, `ChamarProvedor`, `ConferirResposta` and `LerAnexosDaJanela`, none above 150 lines, with `ConferirResposta` (`Classificar` and `Conferir` of citations) covered by tests that need neither database nor HTTP.
23. The system SHALL send the provider bodies as named records with `JsonPropertyName`, with no `Task<object>` and no anonymous object in `Assistente/` and `Embeddings.cs`, and the three golden texts of AC 5 SHALL still match.
24. The system SHALL open a ticket from a conversation only through `AbrirChamado` of the `Chamados` slice, called by `TransferirConversa` and `AtendimentoDireto`, and `Transferencia.Criar` SHALL no longer exist.
25. WHEN two tickets are opened at the same time in one institution THEN the system SHALL give them distinct consecutive `ONE-n` numbers taken by one `UPDATE instituicao ... RETURNING` inside the transaction, as `TransferenciaTests` already proves.
26. The system SHALL split `Chamados/Shared/DetalheChamado.cs` so that no file that holds the detail passes 150 lines (the `Shared` folder itself dissolves in AC 60), `DetalheChamado.Montar` runs no more than 4 queries, and the JSON of the detail stays equal to `Retratos/sucessos.txt`.
27. The system SHALL remove `("Chamados", "Assistente")` and `("Indicadores", "Assistente")` from `ReferenciasEntreFatias`, so that no pair has its inverse in the list.
28. The system SHALL replace the parameters of `Chamado.Abrir`, `Rejeitar`, `Subir` and `Encaminhar` by parameter records declared in the entity file, and `Dados_ate_5_parametros` SHALL no longer list them and SHALL keep as permanent exceptions only `ResponderComoEquipe`, `TokenMcp.Criar`, `PlataformaMoodle.Configurar` and `SubscricaoPush.Registrar` (fixed list of 4, exact equality).
29. The system SHALL declare `MaxAnexo` once in `One.Api/` and read attachments from a form in one type used by `ResponderChamado` and `ConversaRotas`.
30. The system SHALL remove the `(IResult)(object)` cast from `AgirNoChamado`, split `AvisarMudanca` into one type per responsibility (interceptor, change collection, hub notification), and pass `AvisarMudancaTests`, `Hub_so_envia_ChamadoMudou_e_FilaMudou` and `Pipeline_do_chamado_com_a_forma_da_base` without assertion change.
31. The system SHALL keep `Indicadores/ConsultarIndicadores.cs` with no `using One.Api.Assistente`, with `Tipos.SemBase` in `Dados`, and with the two anonymous objects of `Objetos_anonimos_so_fora_das_respostas` replaced by private named records.

**Independent test:** `AssistenteTests`, `TransferenciaTests`, `IndicadoresTests` e os retratos verdes; `Referencias_entre_fatias` com a lista menor.

### S5: Administração, Instituições e Conhecimento sem regra no handler (P2)

As regras de cadastro, fluxo, aparência e conhecimento vão para a entidade; o que sobra é o domínio rico completo.

**Acceptance Criteria**

32. The system SHALL change `UsuarioPapel` and `AtendenteSetor` only through `Usuario.DefinirPapeis`, `Usuario.DefinirSenhaTemporaria` and `Usuario.VincularSetores`, receive the user data as one record `DadosUsuario`, and use no `db.Entry(` in `Administracao/UsuarioRotas.cs`.
33. IF the rascunho of a fluxo has 0 or more than 5 etapas, an etapa of leadership that is not the first, or `PrazoHoras` outside 1 to 720 THEN `Fluxo.Validar` SHALL return an `Invalido` and `SalvarRascunho` SHALL answer 400 with the detail it answers at base.
34. WHEN a setor is created or changed with the triage or leadership rule of `CriarSetor` and `AlterarSetor` THEN `Setor.Criar` and `Setor.Alterar` (and `Validar`) SHALL decide it, and the response SHALL equal `Retratos/gravacoes.txt` and `erros.txt`.
35. WHEN `Instituicao.AlterarAparencia` receives the 14 appearance fields THEN it SHALL write them, and `AlterarAparencia.Aplicar` SHALL no longer assign fields of `Instituicao` from outside.
36. The system SHALL run the four institution commands (`criar`, `operador`, `carga` and the fourth of `InstituicaoComando`) as one class each with constructor-injected dependencies, with no `GetRequiredService` in them, with the same output text and exit codes, and `InstituicaoComando.cs` SHALL leave the `IgnoreQueryFilters` permitted list.
37. The system SHALL not contain `CadastroRotas.Listar`, `Criar` or `Alterar` (option B, approved), and the four cadastros (setor, categoria, curso, resposta pronta) SHALL answer as `Retratos/gravacoes.txt` and `erros.txt` record.
38. The system SHALL read each line of the registration CSV as one typed record in `CsvMatriculas` (no `Campo(l, 0..3)` index) and upsert `Usuario` and `Matricula` through their methods, with the 400 `erros` body of `Retratos/importacao.txt` unchanged.
39. The system SHALL split text into `DivisorDeTexto` (pure), read PDF in `LeitorDePdf`, build versions with `VersaoArtigo.Criar`, write the title limit of 200 characters in one place only, and split `Fontes.cs` into `BuscarFontes` and `CitacoesDeFontes`, none above 150 lines.
40. The system SHALL leave `Entidade_sem_setter_publico` with an empty list at the end of S5 (the property `InstituicaoId` is excluded by the rule); IF a type cannot leave, THEN its name SHALL stay in the list with the reason written in `verification.md`.

**Independent test:** a suíte de `Administracao`, `Instituicoes` e `Conhecimento` e os retratos de gravações verdes.

### S6: O `Agendador` só repete e despacha (P2)

Cada tarefa mora na fatia dona e a regra de negócio das tarefas sobre `Chamado` passa pelos métodos de domínio. Depende de S1 (testes de concorrência), S2 (`EmailSaida`), S3 e S4.

**Acceptance Criteria**

41. The system SHALL implement `ITarefaAgendada` for the tasks `conversa`, `chamado`, `aguardando`, `lembrete`, `subir`, `email`, `trecho`, `push` and for the expired-launch cleanup, each in one class of the owning slice, registered in that order by `Add<Fatia>`.
42. WHEN `Agendador.Executar()`, `Ler()` or `Processar(lidos)` is called THEN each item SHALL carry the `Tipo` string of base and `Ler()` SHALL return the same items in the same order as at base.
43. The system SHALL keep `Agendador.cs` at or below 150 lines, with no `Estado`, `Desfecho`, `ExecuteUpdateAsync`, `new EventoChamado` or `new MensagemChamado` in it, and `IgnoreQueryFilters` only in files that implement `ITarefaAgendada`.
44. The system SHALL change a `Chamado` in the tasks `chamado`, `aguardando` and `lembrete` only through its domain methods, and `Chamado_muda_so_pelos_metodos` SHALL pass with no exemption for `Agendador.cs`.
45. IF a `DbUpdateConcurrencyException` or a `Recusa` ends the save of a `Chamado` task THEN the task SHALL leave the row, the events, the messages and the avisos unchanged and log nothing as an error.
46. WHEN a `Conversa` is abandoned or a `TrechoFonte` is indexed THEN the task SHALL change the row with one conditional `ExecuteUpdateAsync` whose condition is the domain expression, and a row that changed since the read SHALL stay unchanged.
47. The system SHALL keep every log message template of the scheduler byte-identical to base (the `LogInformation`, `LogWarning` and `LogError` calls of `Agendador.cs`), moved with the task.
48. The system SHALL pass AC 6 and AC 7 unchanged after the move, and `AgendadorTests`, `FluxoPrazoTests` and `PushAgendadorTests` SHALL pass with no assertion change.

**Independent test:** `Agendador.Executar()` duplo (S1) verde; o Verificador troca uma condição de `FecharPorInatividade` e um teste acusa.

### S7: `Program.cs` e a raiz sem responsabilidade extra (P3)

`Program` só monta e roda; a raiz deixa de conhecer entidades e fatias.

**Acceptance Criteria**

49. The system SHALL keep `Program.cs` at or below 60 lines, calling only `Add<Fatia>`, `Map<Fatia>`, `UseAcesso` (password-change middleware) and the four infrastructure extensions, and moving the S3 client, `Llm`, ProblemDetails, rate limits and MCP authentication to `Armazenamento.cs`, `Persistencia.cs`, `Seguranca.cs` and `TratamentoDeErros.cs`, and the cookie options with their `Validar` callback to `AddAcesso`.
50. The system SHALL keep the registration order, lifetimes, cookie options, the three rate-limit policies and their defaults (`Limites:AuthPorMinuto` 5, `Limites:McpPorMinuto` 60, `Limites:MensagensPorMinuto` 10) as at base.
51. The system SHALL read `TimeProvider.System` only in the `TimeProvider` registration, so `Armazenamento` receives a `TimeProvider` by injection and `Relogio_so_pelo_TimeProvider` lists no offender.
52. The system SHALL move `Validar`, `Principal` and `ExigirTrocaDeSenha` of `Sessao.cs` to `Acesso` and keep the `HttpContext` accessors `Usuario()` and `Instituicao()` in the root (34 calls in 7 slices, so the third-use rule puts them there), create `TokenAcesso` only through `TokenAcesso.Criar`, move `NovoMcp` and `SlugDoMcp` to `Dados/Mcp/TokenMcp.cs`, keep `Hash`, `UrlBase` and `Link` in the root `Tokens.cs` (5 slices use them), leave `Prazos` in the root, split `Email.cs` into `EnviadorSmtp` and `LayoutEmail` with no `IEnviadorEmail`, and move `Armazenamento.ComTamanho` to the `IResult` side of the slices that download; no new pair SHALL appear in `ReferenciasEntreFatias` because of these moves.
53. The system SHALL leave `Raiz_sem_fatias` with an empty list: no root file except `Program.cs` references a slice namespace, and from `Dados` only `OneDb`.
54. WHEN a CLI command (`push`, `instituicao`, and `avaliar` in `Assistente` per AC 66) runs THEN `Main` SHALL dispatch it to the owning slice and produce the same output and exit code as base, with the body of the commands outside `Main`.

**Independent test:** `dotnet run --project One.Api` sobe e aplica as migrations; `Configuracao_lida_em_um_lugar`, `Cliente_S3_configurado_como_a_door_2` e `Aviso_registrado_so_no_Program` verdes contra os arquivos novos.

### S8: MCP e mapeamento EF (P3)

As duas peças de maior risco de byte e de modelo ficam por último.

**Acceptance Criteria**

55. The system SHALL have `Mcp/FerramentasMcp.cs` call the use cases of other slices and read their typed results, with no `GetProperty("` by string and no `OneDb` read at the entry (L142-144 at base), and the four tools SHALL return the JSON text recorded at base.
56. The system SHALL split `OneDb.OnModelCreating` into one `IEntityTypeConfiguration<T>` per entity in `Dados/Mapeamento/`, applied before the renaming loop one by one by `ApplyConfiguration` in a fixed order; IF the S8 spike shows an identical model (tables, columns, indexes, FK names) under `pt-BR` and `Invariant` THEN one `ApplyConfigurationsFromAssembly` call MAY replace them (Landing row appended before that code), else the explicit form stays; `OneDb.cs` SHALL stay at or below 150 lines.
57. The system SHALL leave `Dados_sem_EfCore` listing nothing but `OneDb.cs`, `Dados/Mapeamento/` and `Migracoes/` as allowed importers (the list of exceptions is empty).
58. The system SHALL leave every table, column, index and constraint name unchanged: `Modelo_sem_mudanca_pendente`, `Tabelas_snake_case_e_datas_timestamptz` and `Toda_entidade_tem_instituicao_e_filtro` pass, and AC 3 holds.
59. The system SHALL end with every ratchet list at or below its S1 size, `Arquivo_ate_150_linhas` listing only `Dados/Chamados/Chamado.cs`, and `dotnet build One.slnx` plus `dotnet test One.Api.Tests` green on the last commit.

**Independent test:** `McpFerramentasTests`, `Modelo_sem_mudanca_pendente` e a suíte inteira verdes no último commit.

### S9: Fatias sem balde horizontal e sem chamada ao interior da vizinha (P3)

Nenhuma pasta `Shared`, nenhuma classe `*Rotas`, nenhum caso de uso chamando o interior de outro e menos pares entre fatias (door 9). Depende de S4 e S5 (os arquivos já divididos) e de S7 (`Map<Fatia>`); roda antes da S8, que segue como a última por risco de byte. Acrescentada pela segunda auditoria; a numeração dos critérios não renumera os anteriores.

**Acceptance Criteria**

60. The system SHALL leave no folder named `Shared`, `Common`, `Utils` or `Helpers` under `One.Api/`: the 6 response records of `Administracao/Shared`, the 2 of `Conhecimento/Shared` and `DetalheChamado` (after AC 26) move to the root of their slice under namespace `One.Api.<Fatia>`, `Sem_balde_horizontal` lists no folder, and the JSON of each response stays equal to `Retratos/sucessos.txt`, `gravacoes.txt` and `erros.txt` (AC 2).
61. The system SHALL leave no class named `*Rotas` in `One.Api/`: the `Mapear` calls live in `Map<Fatia>` (door 2); `AdminRotas.NaoEncontrado/Repetido/Nome`, `ChamadoRotas.Carregar` and `ArtigoRotas.Ler` (3 or more users) move to files named for what they do; helpers with up to 2 users move into the file of the use case that owns them; `Sem_balde_horizontal` lists no class; and the route `POST /api/auth/logout` stays mapped from one file that `Fora_do_mediator` still finds.
62. IF a use case needs a rule that another use case also needs THEN `Caso_de_uso_sem_chamada_estatica_de_outro` SHALL list no offender: `AlterarSetor`, `AlterarCurso`, `AlterarCategoria` and `AlterarRespostaPronta` no longer call `CriarX.Validar` (the pure part of the rule is a method of the entity, as AC 34 does for `Setor`, and each handler runs its own uniqueness query), and `Assistente/ConversaRotas.cs:57` no longer calls `ResponderChamado.LerAnexo` (AC 29).
63. The system SHALL leave `AcessoChamado` with `Chamado`, `Papel` and `Agora`, `AgirNoChamado` without `Prazos` and `IConfiguration` in its constructor, and the handlers that read them (`AcoesChamado.cs:32`, `ResolverChamado.cs:25`, `MarcarDuplicado.cs:27`, `ResponderChamado.cs:69`) taking them by constructor, with `AvisarMudancaTests`, `Pipeline_do_chamado_com_a_forma_da_base` and the ten action tests passing without assertion change.
64. The system SHALL have `Acesso/VerInstituicao.Resposta` declare its own fields, in the same names, types and order as `AparenciaDados`, instead of inheriting it, so that no response record is used by two slices, and `GET /api/instituicoes/{slug}` SHALL answer the JSON recorded at base.
65. The system SHALL move `Conhecimento/Arquivos.cs` to the root, turn `Fontes.DoArtigo`, `TextoDoArtigo` and the two `Ultima()` extensions into methods of `TrechoFonte`, `VersaoArtigo`, `Artigo` and `Documento`, and `Fatias_do_api` SHALL list `Arquivos` among the root files (list edit approved in the Assumption "Testes de arquitetura que mudam de alvo").
66. WHEN `dotnet One.Api.dll instituicao avaliar` runs THEN it SHALL print the same lines and exit with the same code as base, with its class in the `Assistente` slice, which owns `Embeddings` and `Buscar`, and `Instituicoes/InstituicaoComando.cs` SHALL have no `using One.Api.Assistente`.
67. The system SHALL map the `/admin` routes of `Conhecimento` (artigos, documentos) and `Instituicoes` (aparência) in the `Map<Fatia>` of each owning slice behind one shared administrator filter, with `AdminRotas` (then dissolved by AC 61) referencing neither `Conhecimento` nor `Instituicoes`, and `RetratoTests` comparing the 93 lines of `rotas.txt` as a sorted set (the file stays byte-identical).
68. The system SHALL end with `ReferenciasEntreFatias` at 10 entries or fewer, without any pair whose inverse is listed, and IF a pair cannot leave THEN its name SHALL stay with the reason written in `verification.md`.

**Independent test:** `Referencias_entre_fatias` com a lista menor, `Sem_balde_horizontal` e `Caso_de_uso_sem_chamada_estatica_de_outro` com lista vazia, e os retratos de rotas e de sucessos verdes.

## Out of scope

| Excluded | Why |
| --- | --- |
| Rota nova, campo JSON novo, renomear rota ou campo, mudar status | refatoração: a API não muda (AC 1 e AC 2) |
| Mudança de schema, migration, `xmin` em outra entidade | o dono pediu comportamento e schema idênticos; a door 7 existe por causa disso |
| Projetos .NET novos (Domain, Application, Infrastructure) e repositório sobre EF | AD-024 e `Dois_projetos_sem_repositorio` |
| Trocar o `Mediator`, mexer no pipeline `AgirNoChamado` além de tirar o cast | AD-019 |
| `MediatR`, `FluentValidation`, `AutoMapper` e `Ardalis.Result` (4 pacotes novos, como no exemplo jeangatto) | rejeitados por contradizerem AD-019 (`Mediator` 3.x fixado; MediatR virou comercial) e AD-024 (record de resposta nomeado em vez de mapeador; `Recusa`/`Invalido` em vez de um tipo de resultado novo); a revisão por mérito manteve a rejeição |
| Controllers com atributos | rejeitados por contradizerem AGENTS.md (minimal APIs) e AD-019 (cada caso de uso tem o próprio `Mapear`, provado por `Map_so_nos_casos_de_uso`) |
| Registro de casos de uso por varredura de assembly (`IFeatureMarker` ou `IEndpoint` por reflexão) | rejeitado pelo door 2 (registro explícito, visível ao compilador); nenhum AD ativo o proíbe literalmente, então a rejeição é do plano, e `Map_so_nos_casos_de_uso` já pega o `Mapear` esquecido |
| Regra de negócio que lança exceção capturada no handler para devolver 400 (Telerik) | rejeitada por contradizer AGENTS.md (erros como ProblemDetails) e o door 6 (`Invalido` 400 e `Recusa` 409, sem segundo caminho de erro) |
| Entidade como corpo da resposta | rejeitada por contradizer AD-024 (record de resposta nomeado por caso de uso, JSON provado pelos retratos) |
| Validator por caso de uso em arquivo próprio (como Telerik e jeangatto) | rejeitado por contradizer AD-019 (request, handler e validação no mesmo arquivo) e o critério de Vertical Slice estrito (tudo do caso de uso numa unidade); a validação de forma mora na `Entrada` do arquivo e a de regra na entidade (`Invalido`, door 6) |
| `ApplyConfigurationsFromAssembly` | não contradiz AD ativo; só o door 8 deste plano, e o motivo foi corrigido (ver Landing 8); decidido (Assumptions): explícito por padrão, `ApplyConfigurationsFromAssembly` só se o spike da S8 passar |
| Qualquer mudança em `web/`, `docker-compose.yml`, `Dockerfile` | o contrato HTTP não muda |
| `Transcricao` do detalhe (`IReadOnlyList<object>` com dois records) | door 1 de `dominio-e-contratos` fixou a forma pela ordem das chaves do JSON; `Nenhum_corpo_tipado_object` a trata |
| `Acesso/LancamentoMoodle.cs`, `AlterarMoodle.Limpo` (2 usos) | coesos ou abaixo do terceiro uso; só entram se o CA1502 acusar |
| Novas métricas, gate `crapper`/`dryer` para o .NET | AD-018: o gate do .NET é o CA1502; `crapper` e `dryer` são do `web/`; `mutator` segue suspenso (AD-025) |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Perfil e orçamento | `standard`, budget 150k por execução de builder, fatia por fatia | configuração escrita em `AGENTS.md` | y |
| Ordem das fatias | S1, S2, S3, S4, S5, S6, S7, S9, S8, por risco crescente; S6 depois de S2 a S4; S9 depois de S4, S5 e S7 | S6 precisa de `EmailSaida` rico, de `RoteamentoDeFluxo` e dos testes da S1; S8 é o mais arriscado em byte | n |
| `Cpf` como objeto de valor entra na S2, no último commit, e não na S7 | S2, separável | `Usuario` se fecha uma vez só; retipar `Usuario.Cpf` na S7 reabriria a entidade. Reverte o "Cpf não vira tipo agora" de 02/11, que era sobre prazo da banca | n |
| `Prazos.cs` fica na raiz | não vai para `Chamados` | `Prazos` serve a `Conversa` (abandono) e a `Chamado` (confirmação, lembrete, resolução); mover para `Chamados` criaria `Assistente` -> `Chamados` por causa de uma constante de configuração | n |
| Exceção permanente de `Dados_ate_5_parametros` (emenda E6, 2026-11-13) | `Dados.Chamados.Chamado.ResponderComoEquipe`, `Dados.Mcp.TokenMcp.Criar`, `Dados.Moodle.PlataformaMoodle.Configurar` e `Dados.Push.SubscricaoPush.Registrar` ficam na lista como lista fixa de 4 itens (igualdade exata); `Chamado.Abrir`, `Rejeitar`, `Subir` e `Encaminhar` saem na S4 | cadastro de uso único, record não paga; `Chamado.Reclassificar` já tem 5 parâmetros na base e não é ofensor | y |
| Sem `IEnviadorEmail` | `EnviadorSmtp` e `LayoutEmail` como classes | AD-017 rejeitou "interface sem segundo uso"; os testes usam o Mailpit real, não um falso | n |
| Conversa, TrechoFonte e e-mail não ganham `xmin` | `UPDATE` condicional na tarefa (door 7) | só `Chamado` tem token de versão (verificado: `OneDb.cs:208`, `Chamado.cs:42`); `xmin` novo é mudança de modelo | n |
| Equivalência da tarefa de `Chamado` | "carregar, método, `SaveChanges` com `xmin`" tem o mesmo efeito final que o `UPDATE ... WHERE` de hoje; a diferença é que um conflito de `xmin` por escrita não relacionada adia o item para o próximo ciclo de 60 s | o `UPDATE` ignorava escrita concorrente que não invalidava a condição; o efeito é atraso de um ciclo, nunca duplicidade (AC 7) | n |
| Consultas de fluxo vão para `Chamados` | par novo `("Administracao", "Chamados")` | `SimularFluxo` e `CriarSetor` as chamam; alternativa seria `Chamados` depender de `Administracao`, pior | n |
| Pasta `Dados/Mapeamento/` | nova subpasta, uma classe por tipo de entidade | `Uma_entidade_por_arquivo_por_agregado` pode enumerar as pastas de `Dados`; o builder confere e, se a regra falhar por pasta nova, a lista de pastas do teste ganha `Mapeamento` (mesma regra, dado novo) | n |
| Arquivos novos na raiz | `Persistencia.cs`, `Seguranca.cs`, `TratamentoDeErros.cs` | `Fatias_do_api` fixa nove arquivos na raiz; a lista do teste muda (Assumption "Testes de arquitetura que mudam de alvo") | y - user delegated |
| `Chamado.cs` (234 linhas) fica como única exceção do teto de 150 | lista de `Arquivo_ate_150_linhas` termina com ele | é coeso (AD-024) e dividir a entidade espalharia o ciclo de vida | n |
| Diferenças do diagnóstico recebido | 16 entidades com dois ou mais setters públicos (o diagnóstico dizia 19), `new Usuario` em 4 arquivos de produção (dizia 8 ou mais), `MaxAnexo` em `ResponderChamado.cs:11` e `ConversaRotas.cs:13` (dizia 10 e 12) | medido por regex e `grep` nesta sessão; a lista final de entidades sai do ratchet da S1, não destes números | n |
| Estimativa de orçamento por fatia (arquivos tocados em tokens, bytes/4) | S1 46k (testes), S2 13k + fixtures até 86k, S3 6k, S4 30k, S5 35k, S6 13k, S7 5k, S8 7k | só leitura de arquivos; não conta saída de build, ida e volta de teste nem os arquivos de teste que cada fatia ajusta | n |
| Fontes | lidos: Jovanovic, Telerik (Assis Zang) e o repositório jeangatto (README, árvore e 9 arquivos), na sessão que escreveu o plano e não relidos na revisão da auditoria, cuja lista de práticas rejeitadas vem do resumo do dono; não lidos: Bailador (Medium, HTTP 403) e iMasters (HTTP 429, desafio anti-robô da Vercel); os livros não foram reabertos | não se cita o que não se leu; as três fontes novas confirmam portas existentes (2, 6, 8) e não mudam critério nem escopo; a auditoria acrescentou como fonte o código do EF Core (`ModelBuilder.cs`, ramo `main`), lido nesta revisão | n |
| Fronteira entre fatias (door 9) | chamada por `IMediator.Send`, por tipo de `Dados`/raiz ou por par fechado; as consultas estáticas que sobram (`Fontes.Buscar` para `Assistente` e `Mcp`, `Fontes.Citadas`/`FonteCitada` para `Chamados`, o que `Indicadores` lê de `Conhecimento`) continuam como pares listados | virar mensagem `Mediator` cada uma é arquivo novo em 3 fatias sem ganho observável; o par fica fechado e testado, e a regra de ratchet só pega chamada estática a caso de uso | n |
| Pasta `Shared` dissolvida (AC 60) | os records ficam na raiz da fatia, com o mesmo nome | todos têm 3 ou mais usos na fatia (`DetalheChamado` 11, `ArtigoResposta` 5, `UsuarioResposta`, `FluxoResposta` e `DocumentoResposta` 4, `SetorResposta`, `CategoriaResposta`, `CursoResposta` e `RespostaProntaResposta` 3), então compartilhar dentro da fatia cumpre a regra do terceiro uso; mudar o lugar custa 32 `using` e 4 pontos de teste e só cumpre "sem `Shared`" | n |
| `AparenciaDados` duplicado em `Acesso` (AC 64) | `VerInstituicao.Resposta` declara os 4 records e o `De` próprios, cerca de 25 linhas duplicadas | AD-024 proíbe record de resposta usado por duas fatias; 2 usos ficam abaixo do terceiro; se nenhum retrato cobrir `GET /api/instituicoes/{slug}`, o builder escreve o teste antes de mexer | n |
| `Arquivos` na raiz (AC 65) | `One.Api/Arquivos.cs` | 4 fatias o usam, acima do terceiro uso; a raiz já guarda `Problemas`, `Prazos` e `Armazenamento`; a lista de arquivos da raiz de `Fatias_do_api` muda (Assumption "Testes de arquitetura que mudam de alvo") | y - user delegated |
| Rotas `/admin` de `Conhecimento` e `Instituicoes` | passam a ser registradas pela fatia dona, atrás de um filtro de administrador compartilhado (AC 67); `RetratoTests.cs:49` compara as linhas ordenadas | `rotas.txt` guarda a ordem de registro e `RetratoTests.cs:49` compara linha a linha; trocar o registrador muda a ordem, não o conjunto. `Administracao` deixa de importar as duas fatias (2 pares a menos) e uma rota admin nova não toca outra fatia. Recomendação do plano adotada: user delegated | y - user delegated |
| Estimativa da S9 | cerca de 60 arquivos de produção por movimentação mecânica (9 records, 16 `*Rotas`, 32 `using`, 6 handlers do `AcessoChamado`) e 5 pontos de teste; sem número de tokens | só contagem de arquivos; o orçamento de 150k por builder vale para a fatia | n |
| `CadastroRotas` genérico (decisão 1) | removido (opção B): handlers próprios nos 4 cadastros (setor, categoria, curso, resposta pronta), uns 12 linhas por handler, 8 handlers | o genérico usa `new T()` e `Action<T>` com setters públicos, que o ratchet da door 3 proíbe, e `EF.Property` por string é um repositório genérico com outro nome (AD-024); sem a remoção `Setor`, `Categoria`, `Curso` e `RespostaPronta` não fecham o AC 40. Recomendação adotada: user delegated | y - user delegated |
| Testes de arquitetura que mudam de alvo (decisão 2) | aprovado alterar o arquivo, o nome ou a lista de dados inspecionado, mantendo a regra e o valor esperado, **um teste por commit**, e o Verificador confere o diff de cada um. Lista: `IgnoreQueryFilters_so_no_agendador_e_no_comando` (L74), `Configuracao_lida_em_um_lugar` (L183), `Fatias_do_api` (L272, arquivos da raiz), `Pacote_mcp_fixado` (L394), `Map_so_nos_casos_de_uso` (L417-418), `Fora_do_mediator` (L427), `Chamado_muda_so_pelos_metodos` (L501), `Setor_so_pelo_ResolverFluxo` (L674), `Objetos_anonimos_so_fora_das_respostas` (L693), `Cliente_S3_configurado_como_a_door_2` (L955), `Aviso_registrado_so_no_Program` (L1065), mais `Literais_gravados_so_nas_constantes` (caminho de `Entidades.cs`), a lista `ReferenciasEntreFatias`, os testes que leem `Shared` (`ArquiteturaTests.cs:446, 763-820, 852, 906`, S9) e `RetratoTests.cs:49` | checks aprovados não mudam, então o plano aprova de antemão a troca de string de caminho, de nome ou de número; mudar a regra ou o valor esperado continua renegociação. O commit que altera o teste mexe só nisso. Recomendação adotada: user delegated | y - user delegated |
| Rotas `/admin` de `Conhecimento` e `Instituicoes` (decisão 3) | sim, vão para a fatia dona (ver a linha própria acima) | user delegated | y - user delegated |
| Registro do mapeamento EF (decisão 4) | `ApplyConfiguration` explícito em ordem fixa (opção A, padrão). `ApplyConfigurationsFromAssembly` (B) só se um spike na S8 mostrar modelo idêntico (tabelas, colunas, índices, nomes de FK) em cultura `pt-BR` e `Invariant`; se mostrar, o builder acrescenta a linha ao Landing antes do código e a troca é um commit | B tira a edição obrigatória de um arquivo comum a cada entidade nova, mas a ordem não é contrato do EF (o código ordena por `FullName` com o comparador padrão, que depende da cultura); `Modelo_sem_mudanca_pendente` pega a deriva. Recomendação adotada: user delegated | y - user delegated |

**Open questions:** none - all resolved above (decisões 1 a 4 e a linha das rotas `/admin`, todas `Confirmed? y`, user delegated em 2026-11-12).

## Observable

Worksheet, não a revisão. Refatoração sem tela e sem rota nova; as superfícies que existem (a API, os comandos
e o agendador) mantêm o comportamento de hoje.

| Surface | Decision | Landing |
| --- | --- | --- |
| API: as rotas de `rotas.txt` | forma da resposta, status e forma do erro com seus códigos | AC 2 (retratos byte a byte) |
| API: as rotas de `rotas.txt` | quem pode chamar, limite de taxa, versionamento | AC 50 para os limites; autorização e versionamento n/a - nada muda, e AC 1 prende |
| API: `POST /api/mcp/{slug}` | resposta das 4 ferramentas | AC 55 |
| comando `dotnet One.Api.dll instituicao` (quatro subcomandos) | saída, flags, códigos de saída | AC 36 e AC 54 |
| comando `dotnet One.Api.dll push` | saída e códigos de saída | AC 54 |
| tarefa agendada (`Agendador`) | saída (log), o que imprime quando falha pela metade, ordem | AC 42, AC 45, AC 47 |
| screen (todas as telas) | empty, loading, error, unauthorised; mobile: celular 360x780, celular deitado 844x390, teclado aberto, toque | n/a - não há tela nesta feature, o `web/` não muda e o contrato HTTP é o mesmo |

## Sources

- Milan Jovanovic, "Vertical Slice Architecture in .NET: The Complete Guide"
  (https://milanjovanovic.tech/blog/vertical-slice-architecture-dotnet), lido na sessão que escreveu o plano. O que decide:
  "Vertical slices organize behavior, while Clean Architecture controls dependency direction. Keep domain rules
  independent of infrastructure where that matters, but avoid forcing every simple slice through identical
  layers and abstractions" (justifica regra de dependência por teste e nenhum projeto novo); "Put policy that
  applies across slices in pipeline behaviors, decorators, endpoint filters, or middleware" (o `AgirNoChamado`
  fica); "Test a slice through its public feature boundary, usually HTTP, against the real database"
  (a suíte de integração continua sendo a prova). A página é um índice: os artigos citados nela
  (shared logic, structuring slices, architecture tests) estão referenciados em AD-024.
- Adrián Bailador, "Vertical Slice Architecture in .NET" (https://medium.com/@adrianbailador/vertical-slice-architecture-in-net-be1365d7f0a6):
  indicado no pedido, **não lido** (HTTP 403 ao buscar); nada deste plano se apoia nele.
- iMasters, "Design: Ports & Adapters + Vertical Slices" (https://imasters.com.br/codigo/design-ports-adapters-vertical-slices):
  indicado no pedido, **não lido** (HTTP 429 do `web_fetch` e de `Invoke-WebRequest`, em cinco tentativas
  com espera; a resposta traz `X-Vercel-Mitigated: challenge`, um desafio anti-robô que não se contorna);
  nada deste plano se apoia nele. A regra de dependência já é coberta por Jovanovic e pelo teste
  `Dados_sem_EfCore`; a decisão de ports/adapters (interface por dependência externa) fica como está: AD-017
  rejeitou "interface sem segundo uso" e AD-024 proíbe repositório sobre o EF Core. Reabrir se alguém ler a página.
- jeangatto, "ASP.NET-Core-Vertical-Slice-Architecture" (https://github.com/jeangatto/ASP.NET-Core-Vertical-Slice-Architecture),
  lido na sessão que escreveu o plano: README, árvore de `src/Blog.PublicAPI` e `Features/Posts/*` (handler, validator, controller,
  mapper), `Domain/PostAggregate/Post.cs`, `Data/Configurations/PostConfiguration.cs`, `BlogDbContext.cs` e
  `ServiceCollectionExtensions.cs`. Confirma: uma pasta por assunto com request, handler, validator e response
  lado a lado; o handler usa o `DbContext` direto, sem repositório (AD-024); a entidade tem `private init` e
  comportamento; uma `IEntityTypeConfiguration<T>` por entidade em `Data/Configurations` (door 8); testes
  separados em unitários e de integração pela API (AC 11 e 14 contra a suíte atual). Rejeita, pelo AGENTS.md e
  pelos ADs: `ApplyConfigurationsFromAssembly` (door 8 e decisão 4: a ordem não é contrato, mas o código a fixa por `FullName`), `IFeatureMarker` mais varredura de
  assembly para registrar `MediatR`, `FluentValidation` e `AutoMapper` (reflexão escondida, door 2; os três
  são pacotes novos, e o `Mediator` 3.x de AD-019 fica), `Result<T>` do Ardalis (door 6), `IHttpContextAccessor`
  dentro do handler e controllers com atributos (o handler daqui recebe `Entrada`, não o contexto HTTP).
- Assis Zang, "Practicing Vertical Slice Architecture in ASP.NET Core", Telerik
  (https://www.telerik.com/blogs/practicing-vertical-slice-architecture-aspnet-core), lido na sessão que escreveu o plano. Confirma:
  a unidade de organização é o caso de uso (endpoint, handler, request, validator numa pasta) e o `Program`
  só chama o `Map` de cada caso (door 2); a transição de estado é um método da entidade com setter privado
  (`Subscription.Cancel()`), e o handler só carrega, chama e grava (AC 14). Rejeita: a regra de estado que lança
  `InvalidOperationException` e o handler que a captura para devolver 400 (door 6 usa `Recusa`/`Invalido`, sem
  exceção para fluxo normal); devolver a entidade como corpo da resposta (AD-024: record nomeado por caso de uso);
  `new Subscription(...)` com construtor público sem validar (a fábrica deste plano devolve `Invalido`/`Recusa`
  antes). Não decide nada novo para este repositório além do que o plano já tem.
- Robert C. Martin, *Código Limpo*, caps. 2 (nomes), 3 (funções: poucos parâmetros, uma coisa só), 6 (objetos e
  estruturas de dados: entidade esconde dados e expõe comportamento) e 10 (classes pequenas, responsabilidade única);
  *Arquitetura Limpa*, Regra de Dependência e Princípio da Responsabilidade Única. Citados do livro como critério
  geral; não foram reabertos nesta sessão e nenhum número do plano vem deles (o limite de 5 parâmetros e de
  150 linhas é escolha deste plano, em Assumptions e nas regras de ratchet).
- Microsoft Learn, "Creating and Configuring a Model" e `ModelBuilder.ApplyConfigurationsFromAssembly`
  (EF Core 10): "The order in which the configurations will be applied is undefined"; fundamenta a door 8.
- dotnet/efcore, `src/EFCore/ModelBuilder.cs` (ramo `main`, lido nesta revisão):
  `ApplyConfigurationsFromAssembly` itera `assembly.GetConstructibleTypes(logger).OrderBy(t => t.FullName)`; corrige
  o motivo da rejeição na door 8 e fundamenta a decisão 4. Não verifiquei a versão exata do EF Core 10 do projeto.
- Auditoria de Vertical Slice estrito desta revisão: contagens de `grep`/`Select-String` sobre `One.Api/` e
  `One.Api.Tests/ArquiteturaTests.cs` no estado atual da árvore (`git diff 97524d1 HEAD -- One.Api One.Api.Tests` vazio, sem mudança não commitada nessas pastas).
- AD-017, AD-018, AD-019, AD-024, AD-043 em `.specs/STATE.md`; `One.Api.Tests/ArquiteturaTests.cs` (regras atuais).
