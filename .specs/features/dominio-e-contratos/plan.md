# Domínio rico e contratos por caso de uso (AD-024)

## Problem

Depois da vertical slice, cada caso de uso mora no seu arquivo, mas o que ele promete e o que ele
decide ainda não são dele:

- **as respostas são objetos anônimos**: 41 `new { ... }` viram corpo de resposta HTTP (Acesso 7,
  Administracao 8, Assistente 9, Chamados 12, Conhecimento 5), montados em 16 arquivos, e 14
  assinaturas devolvem `object`/`Task<object>`/`List<object>`. Nada no tipo diz qual JSON a rota
  devolve; renomear um membro anônimo muda o contrato sem nenhum erro de compilação;
- **os corpos de entrada não moram no caso de uso**: os 21 records `*In` ficam em 7 arquivos
  auxiliares (`AuthRotas` 4, `CadastroRotas` 4, `RegraRotas` 1, `UsuarioRotas` 1, `ConversaRotas` 4,
  `AcoesChamado` 6, `ArtigoRotas` 1);
- **a regra do chamado não mora no chamado**: `Chamado` é um saco de 24 propriedades públicas; as
  transições estão em 8 auxiliares estáticos de `AcoesChamado` (`Evento`, `Mudar`, `Fechar`,
  `Atribuir`, `Mensagem`, `Anexar`, `RespostaDaEquipe`, `RejeitarResolucao`) e em atribuições
  diretas em 5 handlers (`ResolverChamado` grava `ResolvidoEm` à parte do `Mudar`, `EncaminharChamado`,
  `ReclassificarChamado`, `MarcarDuplicado`, `DesativarUsuario`). Um handler novo pode pôr
  `Estado = RESOLVIDO` sem `ResolvidoEm`, ou fechar sem `MotivoFechamento`, e nada o impede.
  `Artigo` e `Documento` mudam de estado em `ArtigoRotas.Mudar` e `ArquivarDocumento`;
- **as 24 entidades estão num arquivo só**, `api/Dados/Entidades.cs` (366 linhas, 24 classes de
  entidade, 8 classes estáticas de valores gravados e a interface `IDaInstituicao`).

Quem paga: o grupo, nas próximas features (MinIO, SignalR, Web Push), que vão copiar a forma que
existir; e a banca de 03–05/11, que avalia a arquitetura. O usuário decidiu em 02/11 (AD-024): "não
estão seguindo os princípios solid e de arquitetura limpa do vertical slice". Não há falha em
produção: não há produção.

**O que muda quando isto estiver pronto:**
- cada caso de uso declara o seu corpo de entrada e a sua resposta como records nomeados no próprio
  arquivo; uma resposta usada por 3 ou mais casos da mesma família mora uma vez na pasta `Shared`
  da fatia;
- `Chamado`, `Artigo` e `Documento` só mudam por métodos próprios; o handler lê e grava, chama
  e-mail e IA e monta a resposta;
- uma entidade por arquivo, por agregado, sob `api/Dados/`; o domínio não enxerga ASP.NET Core,
  `Mediator` nem as fatias, e um teste de arquitetura prende isso;
- para o aluno, o atendente e o administrador nada muda: rotas, status, corpos JSON, Problem
  Details, tabelas, migrações e chaves de configuração ficam iguais, e os retratos provam.

## Flow

Reusa a rede da `vertical-slice-completa` (`RetratoTests` com `rotas.txt` e `erros.txt`,
`retratos_antes.py`, `OrdemDasRecusasTests`, `AcoesDoChamadoTests`, `MediatorTests`, as regras do
`ArquiteturaTests`, `asserts_preservados.py`), o pipeline `AgirNoChamado` e a tabela
`PermissoesChamado` como estão, o `Problemas` como única fonte de `IResult` de erro, o change tracker
do EF Core como unidade de trabalho e o `Fontes.Ultima` como dono único de "última versão".

Exemplo de ponta a ponta, `POST /api/chamados/{numero}/resolver`:

1. requisição -> `Program` e `Sessao.Validar` (exists) - cookie, usuário, instituição, filtro do `OneDb`
2. `ResolverChamado.Mapear` (exists) - liga o corpo JSON em `ResolverChamado.Entrada` (door 1) e chama `IMediator.Send`
3. `AgirNoChamado` (exists, sem mudança de forma, door 4) - 404, 403, `Validar` (400), 409 pela `PermissoesChamado`; preenche `AcessoChamado` (exists)
4. `ResolverChamadoHandler` (exists) - lê no banco o que o domínio precisa (nomes do responsável) e chama `Chamado.Resolver(...)` (door 3), que acrescenta a mensagem e os eventos às coleções do chamado e muda estado e datas; enfileira o e-mail em `Avisos` (exists)
5. `AgirNoChamado` (exists) - um `SaveChangesAsync`; o EF insere as mensagens e os eventos novos pelas navegações `Chamado.Mensagens`/`Chamado.Eventos` (door 3) nas tabelas append-only de hoje
6. out: `DetalheChamado.Montar` em `Chamados/Shared` (door 2) devolve o record `DetalheChamado`; o JSON sai com os mesmos bytes de hoje, 200

Os outros 57 casos seguem os passos 1, 2, 4 e 6 sem o pipeline. `Transferencia.Criar` usa
`Chamado.Abrir` (door 3) e `DesativarUsuario` usa `Chamado.DevolverAFila`; o `Agendador` (exists) não
muda e segue com os 3 `UPDATE ... WHERE` condicionais.

## Impact

| Front | What changes |
| --- | --- |
| domain | termo novo: `Recusa` - motivo de um 409 que a própria entidade decide (`Assumir` por quem já é responsável, rejeitar fora do prazo, artigo já ativo/arquivado, documento arquivado); vive em `api/Dados/Recusa.cs` (door 4) |
| domain | termo novo: transição do `Chamado` - um dos 12 métodos que mudam um chamado existente (`Assumir`, `ResponderComoAluno`, `ResponderComoEquipe`, `Anotar`, `Resolver`, `Confirmar`, `Rejeitar`, `Cancelar`, `Encaminhar`, `Reclassificar`, `MarcarDuplicado`, `DevolverAFila`) mais a fábrica `Abrir`; no `Artigo`, `Criar` + `NovaVersao`, `Ativar`, `Arquivar`; no `Documento`, `Criar` + `NovaVersao`, `Arquivar`. Total: 17 transições e 3 fábricas |
| domain | termo novo: `Entrada` e `Resposta` - records aninhados na mensagem do caso de uso; `Shared` - pasta da fatia com as respostas que 3 ou mais casos da família usam |
| domain | anêmico de propósito: `Instituicao`, `Usuario`/`UsuarioPapel`/`Matricula`/`TokenAcesso`/`AtendenteSetor`, os 5 cadastros (`Setor`, `Curso`, `Categoria`, `RegraRoteamento`, `RespostaPronta`), `Conversa`/`MensagemConversa`/`CitacaoArtigo`, `TrechoFonte` e `EmailSaida`. Os cadastros só têm invariantes entre linhas (nome único, uma triagem por instituição), que a entidade sozinha não enxerga: ficam no índice único e na consulta do handler; os demais ficam fora do escopo de AD-024 |
| código | `Entidades.cs` perde as 24 classes e fica só com `IDaInstituicao` e as 8 classes de valores gravados, porque `ArquiteturaTests.Literais_gravados_so_nas_constantes` prende literalmente o caminho `Dados/Entidades.cs`. Quem lê as entidades: 81 arquivos do `api/` e 35 do `api.Tests` com `using One.Api.Dados;`; nenhum muda por isso (door 5) |
| código | `AcoesChamado` perde as 8 transições estáticas e fica com o `Mapear` das 9 ações, `Texto` (validação de 3 ações) e o carregamento de nomes que o domínio recebe pronto. `ArtigoRotas.Mudar` some; `ArtigoRotas`/`DocumentoRotas`/`UsuarioRotas`/`RegraRotas` e os `Criar*` dos cadastros perdem o `Saida` para a pasta `Shared` |
| código | `AgirNoChamado`, `AcessoChamado` e `PermissoesChamado` mantêm a forma; só o tipo devolvido por `DetalheChamado.Montar` passa de `object` para o record `DetalheChamado` (door 2 e door 4) |
| código | o `Entrada` de topo do login (door 6 da `vertical-slice-completa`, `record Entrada(ClaimsPrincipal? Principal, IResult Resposta)`) muda de nome para `ResultadoLogin`, para não sombrear o `Login.Entrada` do corpo; a forma fica a mesma |
| código | 7 projeções anônimas internas de arquivos de caso de uso ou de `Shared` (`BaixarAnexo`, `BaixarVersaoDocumento`, `ListarChamados` 1, `ImportarMatriculas` 1, `DetalheChamado` 2, `DocumentoRotas` 1) viram records privados; ficam anônimas só as 16 de `Agendador.cs` (1), `Assistente/Assistente.cs` (8, corpo enviado ao provedor de IA), `Assistente/Embeddings.cs` (1), `Conhecimento/Fontes.cs` (4) e `Indicadores/ConsultarIndicadores.cs` (2, consultas intermediárias do EF) e as 11 chaves de índice do `OneDb` |
| código | `ConsultarIndicadores` já devolve o record nomeado `Resultado` de `CalculoIndicadores.cs`; fica onde está, porque mover tocaria o teste puro `IndicadoresCalculoTests` sem ganho no contrato |
| contrato HTTP | nada: 59 rotas, status, nomes, ordem e tipos dos campos JSON, `null` versus ausente, Location dos 201 e Problem Details iguais aos da base. Os riscos de byte são conhecidos: ordem de declaração dos parâmetros do record, camelCase do serializador web (os nomes anônimos de hoje já são camelCase), o item da transcrição do detalhe que para a equipe tem `fontes` e para o aluno não tem a chave |
| stored data | nada a migrar: nenhuma tabela, coluna, índice, FK, trigger ou valor gravado muda. As navegações novas `Chamado.Mensagens` e `Chamado.Eventos` usam as FKs `chamado_id` que já existem; trocar o namespace das entidades não muda nome de tabela (o `OneDb` usa `ClrType.Name`) |
| testes | nenhuma asserção muda. Mudam fixtures que escrevem estado direto numa entidade agora encapsulada: `IndicadoresTests` (monta `Chamado` com histórico), `VisibilidadeTests` (teste de concorrência da door 14 do `mvp-one`), `Infra/Semente.Artigo`, `AvaliarBuscaTests` (monta `Documento`); passam a usar as fábricas e, para histórico fabricado, `db.Entry(x).Property(...).CurrentValue`. Entram o retrato de corpos de sucesso, os testes de domínio sem banco e 5 regras novas no `ArquiteturaTests` |
| decisões | ao fechar, AD-024 passa de `planned` a `active` |

## Relations

None - no stored-data shape change: as navegações `Chamado.Mensagens` e `Chamado.Eventos` mapeiam
as relações `mensagem_chamado.chamado_id` e `evento_chamado.chamado_id` que já existem, sem tocar no
esquema (door 6 prova).

## Surface

None - nothing consumed outside changes: nenhuma rota nova nem assinatura alterada; o retrato da
tabela de rotas e o retrato dos corpos de sucesso (AC 2 e AC 3) prendem isso.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. contrato do caso de uso (precedente para toda feature seguinte) | no arquivo do caso, aninhados na mensagem: `public sealed record ResolverChamado(string Numero, ResolverChamado.Entrada Corpo, Usuario Usuario, Instituicao Instituicao) : IAcaoChamado { public sealed record Entrada(string? Texto); ... }` e `public sealed record EncerrarConversa(long Id, Usuario Usuario) : IRequest<IResult> { public sealed record Resposta(string? Desfecho); ... }` com `return Results.Ok(new EncerrarConversa.Resposta(conversa.Desfecho));`. Um `Entrada` por caso, também nos 8 pares que hoje dividem um `*In` (Criar/Alterar de setor, categoria, curso, resposta pronta, usuário e artigo, `SalvarRegra`/`AlterarRegra`, `NovaConversa`/`NovaMensagem`): cada caso declara o seu, e o validador compartilhado do par recebe os campos, `CriarSetor.Validar(OneDb db, string? nome, bool? triagem, Setor? atual)`, nunca um record comum. Itens de lista e sub-objetos também aninhados na mensagem; nome aninhado nunca igual a um parâmetro do record (CS0102). Onde o JSON tem duas formas na mesma posição (item da transcrição: equipe com `fontes`, aluno sem a chave), dois records nomeados numa propriedade `IReadOnlyList<object>`, serializada pelo tipo de execução como o `(object)new {...}` de hoje | record irmão de topo (`EncerrarConversaResposta`): ~60 nomes novos no namespace da fatia e uma convenção de sufixo a policiar, quando o aninhado já fica escopado pelo caso. Ligar o JSON direto na mensagem (sem `Entrada`): o cliente poderia mandar `usuario`/`instituicao`, que o servidor preenche (overposting). Um `Entrada` só por par, ligado pelos dois casos: o caso deixaria de ser dono do próprio request, e 2 usos não chegam à regra de três (decisão do usuário em 02/11). Record base com derivado `[JsonDerivedType]` para as duas formas: o System.Text.Json escreve as propriedades do derivado antes das da base (exemplo `City` antes de `Date` na documentação), o que muda a ordem das chaves |
| 2. resposta da família | resposta usada por 3 ou mais casos da mesma fatia: um record por arquivo em `api/<Fatia>/Shared/<Nome>.cs`, namespace `One.Api.<Fatia>.Shared`, com a projeção junto: `public sealed record ArtigoResposta(long Id, string Estado, string? Indexacao, long CategoriaId, string Categoria, DateOnly? VisivelDe, DateOnly? VisivelAte, ArtigoResposta.DadosDaVersao Versao) { public static ArtigoResposta De(Artigo a, string categoria, string? indexacao) => ...; }`. São 9: `DetalheChamado` (10 casos), `ArtigoResposta` (5), `DocumentoResposta` (4), `UsuarioResposta` (4), `RegraResposta`, `SetorResposta`, `CategoriaResposta`, `CursoResposta`, `RespostaProntaResposta` (3 cada). Abaixo de 3 usos cada caso tem a sua cópia. Nenhuma resposta é usada por outra fatia | um record por caso mesmo quando idêntico: 10 cópias do detalhe do chamado com 21 campos, que o dryer acusaria e que divergiriam na primeira mudança (AD-024 fixa a regra de três). Deixar nos auxiliares `*Rotas`: o nome diz rota, e o usuário pediu a pasta `Shared` da família. Pasta `Common`/`Utils` no `api/`: proibida por AD-024 |
| 3. forma da entidade rica e o mapeamento EF | `public class Chamado : IDaInstituicao { readonly List<MensagemChamado> _mensagens = []; readonly List<EventoChamado> _eventos = []; Chamado() { } public long InstituicaoId { get; set; } public string Estado { get; private set; } = EstadosChamado.Aberto; public IReadOnlyCollection<EventoChamado> Eventos => _eventos; public static Chamado Abrir(...); public Recusa? Assumir(long atorId, string? nomeAnterior, string nomeNovo, DateTime agora) ... }`; no `OneDb`, `e.HasMany(c => c.Eventos).WithOne().HasForeignKey(x => x.ChamadoId);` e o mesmo para `Mensagens`, no lugar de `HasOne<Chamado>().WithMany()`. Construtor privado sem parâmetros para o EF, setters privados, campo de apoio achado pela convenção `_<nome>`; `InstituicaoId` segue com `set` público porque `OneDb.CarimbarInstituicao` (door 16) o escreve. Os filhos append-only dos 3 agregados ricos (`MensagemChamado`, `Anexo`, `EventoChamado`, `VersaoArtigo`, `VersaoDocumento`) passam a `{ get; init; }`, exceto `InstituicaoId`. O domínio nunca consulta o banco: nomes, "responsável ainda ativo", número da próxima versão (de `Fontes.Ultima`) e prazo chegam como valores | lista de pendências não mapeada que o `AgirNoChamado` despeja no `db`: uma segunda unidade de trabalho ao lado do change tracker, e quem esquece de despejar perde o evento em silêncio (`Transferencia` e `DesativarUsuario` nem passam pelo behavior). Construtor com todas as colunas: 24 parâmetros, e o EF não liga navegações pelo construtor. Eventos de domínio por `INotification`: rejeitados na `vertical-slice-completa` (o e-mail é gravado na mesma transação). Repositório sobre o EF: proibido por AD-024 |
| 4. quem decide o quê numa ação do chamado | `AgirNoChamado`, `AcessoChamado` e `PermissoesChamado` sem mudança de forma: a tabela segue dona de "quem pode e em que estado" (403, 409 genérico e a lista `acoes` do detalhe) e `Estados` segue chamado só no behavior. O `Chamado` guarda o ciclo de vida: transição inexistente lança `InvalidOperationException` (inalcançável por HTTP, porque o behavior recusa antes), e a recusa de negócio sai como `public sealed record Recusa(string Motivo);`, tratada no handler com `if (a.Chamado.Assumir(...) is { } r) return Problemas.Erro(409, r.Motivo);`. Um teste puro prova que todo trio (ação, papel, estado) que a tabela permite é aceito pela entidade | a entidade decidir 403/409: espalharia a ordem 404 -> 403 -> 400 -> 409 (o 400 do `Validar` vem antes do 409, AC 21 da `vertical-slice-completa`) e quebraria a regra "`PermissoesChamado.Estados` só no `AgirNoChamado`". Exceção de domínio mapeada para 409: segundo caminho de erro, e o `AddExceptionHandler` de hoje só conhece concorrência, com detail fixo `AlteradoPorOutro`. `IResult` no domínio: quebra a regra de dependência |
| 5. pastas e namespaces do domínio | `api/Dados/Entidades.cs` (`IDaInstituicao` + 8 classes de valores gravados), `api/Dados/Instituicao.cs`, `api/Dados/Recusa.cs` (namespace `One.Api.Dados`); `api/Dados/Chamados/` `Chamado`, `MensagemChamado`, `Anexo`, `EventoChamado`; `api/Dados/Conversas/` `Conversa`, `MensagemConversa`, `CitacaoArtigo`; `api/Dados/Artigos/` `Artigo`, `VersaoArtigo`; `api/Dados/Documentos/` `Documento`, `VersaoDocumento`; `api/Dados/Trechos/` `TrechoFonte`; `api/Dados/Usuarios/` `Usuario`, `UsuarioPapel`, `Matricula`, `TokenAcesso`, `AtendenteSetor`; `api/Dados/Cadastros/` `Setor`, `Curso`, `Categoria`, `RegraRoteamento`, `RespostaPronta`; `api/Dados/Emails/` `EmailSaida`; namespace `One.Api.Dados.<Pasta>`. Em `api/One.Api.csproj` e `api.Tests/One.Api.Tests.csproj`: `<ItemGroup><Using Include="One.Api.Dados.Chamados" /> ... </ItemGroup>`, uma linha por pasta (o `api.Tests` já usa `<Using Include="Xunit" />`) | `api/Dados/` plano: contradiz "agrupadas por agregado" de AD-024. Subpasta mantendo `One.Api.Dados`: quebra `Namespace_igual_a_pasta`. Pasta no singular (`Dados/Chamado/`): o namespace `One.Api.Dados.Chamado` sombreia a classe `Chamado` dentro de `One.Api.Dados` (erro CS0118 no `OneDb`). `using` explícito: 116 arquivos tocados só por isso. `Dados/Chamados` ao lado da fatia `Chamados` não conta como par entre fatias: a regra do `Referencias_entre_fatias` exige `One.Api.Chamados` ou `Chamados.` sem ponto antes |
| 6. esquema provado igual, sem migração | nenhuma migração nova; `Assert.False(db.Database.HasPendingModelChanges())` num teste novo do `ArquiteturaTests`; só se o EF acusar diferença apenas de nome de tipo, uma migração `DominioRico` cujo `Up` e `Down` não tenham nenhuma operação, provado lendo o arquivo | migração gerada "por garantia": um arquivo a mais no histórico sem nada no banco; não checar: o EF 9+ lança `PendingModelChangesWarning` no `Migrate()` de partida se o modelo divergir |
| 7. regra de dependência do domínio | regra nova no `ArquiteturaTests`: nenhum arquivo de `api/Dados/**` (fora `Migracoes`) casa `using\s+(static\s+)?(Microsoft\.AspNetCore|Mediator)\b`, `\b(IResult|Results|HttpContext|HttpRequest|IFormFile|IFormCollection|IMediator|IRequest|Problemas)\b` nem `(?<![\w.])(One\.Api\.)?(Acesso|Assistente|Chamados|Conhecimento|Indicadores|Administracao|Instituicoes)\.[A-Z]`; e, por reflexão, nenhum campo, propriedade, parâmetro, retorno, base ou interface de tipo em `One.Api.Dados*` vem de assembly `Microsoft.AspNetCore*` ou `Mediator*` ou de namespace de fatia. As duas partes porque o SDK Web traz `using` implícitos de ASP.NET Core | projeto Domain separado: rejeitado pelo usuário (AD-024 item 7). Pacote NetArchTest: dependência nova para uma regra que duas consultas já cobrem |

- Nothing else in this change is hard to reverse: nenhuma rota, campo JSON, tabela, coluna,
  migração ou chave de configuração muda; mover código entre arquivos se desfaz com outro refactor.

## Criteria

### S1: Rede de segurança antes de mexer (P1)

O comportamento atual fica preso pela suíte e por um retrato novo dos corpos de sucesso, tirado na
base antes do primeiro commit estrutural.

**Acceptance Criteria**

1. The system SHALL pass every API and e2e test that exists at the feature base at every commit of this feature, with no existing assertion removed, skipped or loosened.
2. The API SHALL keep `api.Tests/Retratos/rotas.txt` and `api.Tests/Retratos/erros.txt` byte-identical to the feature base, with both `RetratoTests` comparisons passing.
3. WHEN each of the 54 routes that answer with a JSON body is called with its recorded request, once per body shape (detail and action results as student and as attendant, transcript with and without sources, queue of an attendant and of a non-attendant) THEN the API SHALL return the status and body recorded at the feature base byte for byte, after replacing only database-generated ids, ticket numbers and timestamps with placeholders of the same JSON type.
4. WHEN `POST /api/admin/matriculas/importacao` refuses a CSV with line errors THEN the API SHALL return the 400 body with the `erros` list recorded at the feature base, byte for byte except `traceId`.
5. The success-body retrato SHALL be added in a commit after which `git diff <base> <that commit> -- api` is empty, and SHALL not change afterwards.

**Independent test:** os retratos verdes na base e no fim; `asserts_preservados.py <base>` sem problema.

### S2: Contratos nomeados (P1)

Nenhum corpo de resposta é anônimo, e cada corpo de entrada mora no caso de uso.

**Acceptance Criteria**

6. The API source SHALL contain anonymous object creations only in `Agendador.cs`, `Assistente/Assistente.cs`, `Assistente/Embeddings.cs`, `Conhecimento/Fontes.cs`, `Indicadores/ConsultarIndicadores.cs` and `Dados/OneDb.cs`, and none of those SHALL reach an HTTP response body.
7. The API SHALL declare no top-level type whose name ends in `In`, and SHALL bind every JSON request body to a record named `Entrada` nested in the message type of its own use case, 29 in all (the 21 `*In` records today, with the 8 shared by two use cases split into one per use case).
8. The API SHALL build the JSON body of every use case that answers with one from a record named `Resposta` nested in its own message type or from one of the 9 records in `api/<Fatia>/Shared/`, one record per file.
9. The API SHALL use each record of an `api/<Fatia>/Shared/` folder in at least 3 use cases, all in that slice.
10. The API SHALL declare no method, property or parameter typed `object`, `Task<object>`, `List<object>` or `Func<T, object>` that carries a response body, except the `IReadOnlyList<object>` property of the transcript item in `DetalheChamado`.

**Independent test:** as regras novas do `ArquiteturaTests` e o retrato de corpos verdes.

### S3: O chamado decide as próprias transições (P1)

As 12 transições e a criação do chamado moram em `Chamado`; o pipeline de permissão fica igual.

**Acceptance Criteria**

11. The `Chamado` entity SHALL expose no public property setter other than `InstituicaoId`, and SHALL expose its messages and events only as `IReadOnlyCollection<T>`.
12. WHEN a ticket is created by transfer or direct service, changed by one of the 9 action routes, or returned to the queue by deactivating its attendant THEN the API SHALL change it only through a `Chamado` method and SHALL write the same columns, messages and events (type, de, para, detalhe, order) as at the feature base.
13. IF a `Chamado` method is called in a state where its transition does not exist (any change to a `FECHADO` ticket; `Confirmar` or `Rejeitar` outside `RESOLVIDO`) THEN it SHALL throw `InvalidOperationException` and leave state, messages and events unchanged.
14. WHEN `PermissoesChamado` allows an (action, role, state) triple THEN the matching `Chamado` method SHALL accept that state without throwing.
15. IF the current responsible attendant calls `POST /api/chamados/{numero}/assumir` THEN the API SHALL return 409 with detail "Você já é o responsável por este chamado.", produced from the `Recusa` returned by `Chamado.Assumir`.
16. IF the student rejects a resolution, or replies to a `RESOLVIDO` ticket, after the rejection window THEN the API SHALL return 409 with detail "O prazo de {n} dias para rejeitar a resolução terminou.", produced from the `Recusa` returned by `Chamado.Rejeitar`.
17. The API SHALL keep the public signatures of `AgirNoChamado`, `AcessoChamado` and `PermissoesChamado` except the record type returned by `DetalheChamado.Montar`, and SHALL call `PermissoesChamado.Estados` only in the file declaring `AgirNoChamado`.
18. The file `api/Agendador.cs` SHALL be unchanged from the feature base.

**Independent test:** os testes de domínio do `Chamado` sem banco; a tabela de ordem das recusas e o
retrato do detalhe com `eventos` verdes.

### S4: Artigo e documento decidem as próprias versões e estados (P2)

**Acceptance Criteria**

19. The `Artigo` and `Documento` entities SHALL expose no public property setter other than `InstituicaoId`, and SHALL expose their versions only as `IReadOnlyCollection<T>`.
20. IF an article is activated while `ATIVO` or archived while `ARQUIVADO` THEN the API SHALL return 409 with detail "O artigo já está ativo." or "O artigo já está arquivado.", produced from the `Recusa` of the entity.
21. IF a new version is sent to, or an archive is requested for, an `ARQUIVADO` document THEN the API SHALL return 409 with detail "O documento está arquivado." or "O documento já está arquivado.", after the 404 and the PDF checks as at the feature base.
22. IF a version is added to an `Artigo` or `Documento` with a number not greater than every version it holds THEN the entity SHALL throw `InvalidOperationException` and keep its versions unchanged.

**Independent test:** os testes de domínio de `Artigo` e `Documento` sem banco; `ArtigoAdminTests` e
`DocumentoTests` verdes.

### S5: Estrutura e regra de dependência (P1)

**Acceptance Criteria**

23. The API SHALL declare the 24 entities in 24 files, each declaring exactly one class named after the file, in the folders of door 5, and `api/Dados/Entidades.cs` SHALL declare only `IDaInstituicao` and the 8 static classes of stored values.
24. The API SHALL have no file under `api/Dados` outside `Migracoes` that matches the dependency patterns of door 7, and no type in a `One.Api.Dados` namespace with a member signature using a type from an assembly whose name starts with `Microsoft.AspNetCore` or `Mediator`, or from a slice namespace.
25. The domain unit tests SHALL use neither `OneFactory`, `OneDb` nor `HttpClient`, and SHALL exercise each of the 17 transitions and 3 factories.
26. The API model SHALL report `HasPendingModelChanges()` as false at HEAD, and IF a migration is added by this feature THEN its `Up` and `Down` SHALL contain no operation.
27. The solution SHALL keep exactly the 2 .NET projects `One.Api` and `One.Api.Tests`, and the API SHALL declare no type whose name contains `Repositor`.
28. The API SHALL build with zero `CA1502` at threshold 10 and `MSG0005` as error, keeping the existing `Namespace_igual_a_pasta`, `Fatias_do_api` and `Referencias_entre_fatias` rules unchanged.

**Independent test:** `ArquiteturaTests` verde com as 5 regras novas; build sem aviso promovido.

## Out of scope

| Excluded | Why |
| --- | --- |
| Domínio rico de `Conversa` (desfecho), `Usuario` e cadastros | AD-024 nomeia `Chamado`, `Artigo` e `Documento`; o desfecho da conversa é gravado também pelo `Agendador` em `UPDATE` condicional |
| Transições do `Agendador` pela entidade | os 3 `UPDATE ... WHERE` reconferem a condição no banco (AC 119 e 120 do `mvp-one`, L-006); carregar, mudar e gravar trocaria "pula se mudou" por exceção de concorrência |
| Objetos de valor (`Cpf`, número do chamado, estado como enum) | nenhum remove hoje um estado inválido alcançável (ver Assumptions) |
| Renomear os auxiliares `*Rotas` ou mover validações para `Shared` | não é contrato nem regra de domínio; refactor reversível depois |
| Corpos enviados ao provedor de IA (`Assistente.cs`, `Embeddings.cs`) | contrato externo do provedor, não resposta da API |
| Qualquer mudança no `web/` | o contrato HTTP não muda; o `interface-nova` segue em paralelo |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Princípios, momento e limites | os 7 itens de AD-024; logo depois de a `vertical-slice-completa` passar na verificação e antes do MinIO | decisão do usuário em 02/11 | y |
| Perfil do `tlc-spec-lean` | `standard`, budget 150k | pedido do usuário; o mesmo das features anteriores do `api/` | y |
| Corpo de Criar/Alterar do mesmo recurso (8 pares: setor, categoria, curso, resposta pronta, regra, usuário, artigo e a mensagem de `NovaConversa`/`NovaMensagem`) | um `Entrada` em cada caso (16 records nos 8 pares, 29 no total); o validador compartilhado do par recebe os campos, não um record comum | cada caso de uso é dono do seu request, e só se compartilha a partir do terceiro uso (aqui são 2); usuário escolheu (b) em 02/11 | y |
| Objetos de valor | nenhum nesta feature. `Cpf` segue como helper estático sobre `string`: os 3 escritores (`UsuarioRotas.Gravar`, importação, `InstituicaoComando`) já passam por `Cpf.Normalizar`, e um conversor de valor numa coluna com índice único mexeria no login, na importação CSV e no comando logo antes da banca. O número do chamado tem um escritor só (`Transferencia`). Estado como enum mudaria a serialização e as comparações do `Agendador` e dos indicadores, e o setter privado já fecha a escrita | só onde remove um estado inválido alcançável (AD-024); usuário escolheu (a) para o `Cpf` em 02/11 | y |
| `DevolverAFila` | grava exatamente o que `DesativarUsuario` grava hoje (evento ATRIBUICAO "Responsável desativado", TRANSICAO para ABERTO, `AguardandoDesde` nulo), sem limpar `LembreteEm` como o `Mudar` limpa | "nada muda" vale também para o valor gravado | n |
| Ordem de inserção dos eventos | os eventos de uma ação entram na ordem das chamadas, pela coleção `_eventos` | o detalhe ordena por `CriadoEm` e depois `Id`, e numa ação todos têm o mesmo `CriadoEm`; o retrato do detalhe da equipe (AC 3) prova | n |
| Normalização do retrato de sucesso | só ids, números `ONE-n` e instantes gerados pelo banco ou pelo relógio viram marcadores do mesmo tipo JSON | o banco de teste é compartilhado entre testes e os ids variam; o resto do corpo é comparado byte a byte | n |

**Open questions:** none - all resolved or logged above. As 2 perguntas do planejador foram respondidas pelo usuário em 02/11: (1) um `Entrada` por caso também nos 8 pares Criar/Alterar; (2) `Cpf` não vira tipo agora.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| API: as 54 rotas com corpo JSON | forma da resposta | AC 3, AC 8, AC 9 |
| API: as 59 rotas | status, método, acesso anônimo, limite de taxa | n/a - não mudam; AC 1 e AC 2 prendem |
| API: as 59 rotas | forma do erro e códigos | existente (`Problemas`, Problem Details); AC 2, AC 4, AC 15, AC 16, AC 20, AC 21 |
| API: as 59 rotas | versionamento | n/a - sem versionamento hoje, e nenhum campo muda |
| API: 5 rotas sem corpo JSON (logout, definir senha, trocar senha, 2 downloads) | corpo | n/a - 204 e arquivo binário não mudam; AC 1 |
| comando `dotnet build` | saída quando `CA1502` ou `MSG0005` falham | existente; AC 28 |
| comando `dotnet ef migrations has-pending-model-changes` | código de saída | AC 26 (o teste usa `HasPendingModelChanges()`, o comando é a conferência manual) |
| comando `dotnet run -- instituicao ...` | saída, flags, códigos de saída | n/a - a carga de artigos passa a usar `Artigo.Criar`, sem mudar o que o comando imprime; AC 1 |

## Sources

- AD-024 em `.specs/STATE.md` e ROADMAP, "Domínio rico e contratos por caso de uso (AD-024)": as 7
  decisões do usuário.
- Jimmy Bogard, Vertical Slice Architecture (https://jimmybogard.com/vertical-slice-architecture/):
  "Minimize coupling between slices, and maximize coupling in a slice"; "push complex logic into the
  domain". Milan Jovanović, onde mora a lógica compartilhada
  (https://milanjovanovic.tech/blog/vertical-slice-architecture-where-does-the-shared-logic-live):
  "Don't abstract until you hit three", "domain rules get pushed down into entities and value
  objects", "logic used by two related slices stays in a `Shared` folder inside that feature", "A
  `Common` project inevitably becomes a junk drawer"; e
  (https://milanjovanovic.tech/blog/vertical-slice-vs-clean-architecture) "Simple CRUD features stay
  simple, and complex features can use rich domain models". Os slides do dotNET 2022 são imagens
  sem texto e não foram conferidos.
- EF Core, Microsoft Learn: "Backing Fields" e "Relationship navigations" (coleção exposta como
  `IEnumerable`/`IReadOnlyCollection` sobre campo privado; o EF acessa a coleção pelo campo de
  apoio), "Entity types with constructors" (construtor de qualquer acessibilidade; setter privado é
  mapeado; navegação não liga pelo construtor), "Managing Migrations" (`has-pending-model-changes`,
  `HasPendingModelChanges()`, EF 9+ lança no `Migrate()` com mudança pendente); System.Text.Json,
  "How to serialize properties of derived classes" (o derivado sai antes da base).
