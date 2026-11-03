# Domínio rico e contratos por caso de uso - checks

Profile: standard
Plan: `.specs/features/dominio-e-contratos/plan.md`

41 checks em 5 slices · 7 one-way doors · 0 perguntas abertas

**Como as provas rodam.** As mesmas ferramentas da `vertical-slice-completa`:

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `WebApplicationFactory<Program>` (`OneFactory`); testes de domínio sem `OneFactory` | `docker compose up -d postgres mailpit` |
| `web/` e2e | Playwright (`npm --prefix web run e2e`) com `E2E_URL` | imagem própria desta feature na porta 8082 (ver `## Handoff`) |
| build do `api/` | `dotnet build api` com `CA1502` e `MSG0005` em `WarningsAsErrors` | nenhum |
| scripts | `python` e `bash` (Git Bash) na raiz | nenhum |

Todos os comandos rodam na raiz `D:\one-system`. `<base>` é o commit que congela `plan.md` e este
`checks.md`, gravado no `## Handoff`. Cada prova nomeia um teste ou um comando, e o nome é o contrato
com o construtor: classe ou método citado aqui que não existe em `<base>` é criado com exatamente esse
nome. Classes novas: `ChamadoDominioTests`, `ArtigoDominioTests`, `DocumentoDominioTests` (sem banco) e
`RecusasDoDominioTests` (HTTP). Métodos novos em classes existentes: `RetratoTests` 3, `OrdemDasRecusasTests`
5, `ArquiteturaTests` 14. Scripts novos em `.specs/features/dominio-e-contratos/`: `asserts_api.py`,
`retratos_antes.py`, `migracao_vazia.py`, `arquitetura_intacta.py`. Um filtro que não seleciona nenhum
teste sai com código 0 e é prova falha, não verde (L-002): o construtor confere no TRX que cada
`--filter` desta lista executa pelo menos 1 teste. Todo teste novo é citado na linha `Proof:` do seu
check (L-022). O `Impact` do plan fala em "5 regras novas no `ArquiteturaTests`"; as provas abaixo pedem
14 métodos novos, e o construtor corrige esse número no `Impact` (seção mantida verdadeira).

O `web/` é de outra feature (`interface-nova`), que commita no mesmo `main` durante este build: os
commits dela entram em `<base>..HEAD` e não são escopo destes checks; nenhum commit desta feature toca
`web/` (C2).

## Checks

### S1 - Rede de segurança antes de mexer (P1) · ~38 files · ~239 KB · ~60k

**C1** - [ ] A suíte da API e a suíte e2e passam em cada commit desta feature, sem asserção removida, pulada nem afrouxada (AC 1)
Proof: `dotnet test api.Tests`
Proof: `E2E_URL=http://localhost:8082 npm --prefix web run e2e`

**C2** - [ ] Toda linha removida com `Assert` em `api.Tests/**/*.cs` entre `<base>` e `HEAD` reaparece idêntica (espaços normalizados) como linha adicionada, nenhuma linha adicionada em `api.Tests/` traz `Skip =`, e nenhum commit de `<base>..HEAD` que toca `api/` ou `api.Tests/` toca um arquivo de `web/`; o script aplica a função `conferir` de `.specs/features/refatoracao-solid/asserts_preservados.py` ao `git diff --no-renames <base> HEAD -- api.Tests` (AC 1)
Proof: `python .specs/features/dominio-e-contratos/asserts_api.py <base>`

**C3** - [x] `api.Tests/Retratos/rotas.txt` e `api.Tests/Retratos/erros.txt` são byte a byte os de `<base>`, e as duas comparações do `RetratoTests` passam (AC 2)
Proof: `git diff --exit-code <base> HEAD -- api.Tests/Retratos/rotas.txt api.Tests/Retratos/erros.txt`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_igual_a_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_erro_iguais_aos_da_base"`

**C4** - [x] O retrato `api.Tests/Retratos/sucessos.txt` tem 59 linhas, uma por chamada da lista abaixo, cada uma com método, rota, ator, status e corpo JSON; numa instituição criada pelo próprio teste, cada chamada devolve hoje o status e o corpo gravados byte a byte, depois de trocar dos dois lados só os ids gerados pelo banco (membros `id` e `*Id` numéricos), os números `ONE-n` e os instantes gerados pelo banco ou pelo relógio por marcadores do mesmo tipo JSON (AC 3, door 1, door 2)
- Acesso (4): `POST /api/auth/login` · `POST /api/auth/primeiro-acesso` (aluno sem senha, 202) · `GET /api/auth/me` (aluno com matrícula) · `GET /api/instituicoes/{slug}`
- Assistente (7): `POST /api/conversas` · `POST /api/conversas/{id}/mensagens` · `GET /api/conversas/{id}` · `POST /api/conversas/{id}/avaliacao` · `POST /api/conversas/{id}/transferir` · `POST /api/atendimento-direto` · `POST /api/conversas/{id}/encerrar`
- Chamados (17 chamadas em 12 rotas): `GET /api/chamados` por aluno · `GET /api/chamados?escopo=fila` por atendente · `GET /api/chamados?escopo=fila` por aluno (lista vazia) · `GET /api/chamados/{numero}` por aluno · `GET /api/chamados/{numero}` por atendente, com uma mensagem do assistente que cita fonte e uma que não cita na transcrição · `/mensagens` aluno `PUBLICA` · `/mensagens` atendente `PUBLICA` · `/mensagens` atendente `NOTA` · `/assumir` · `/resolver` · `/confirmar` (aluno) · `/rejeitar` (aluno) · `/cancelar` (aluno) · `/encaminhar` · `/reclassificar` · `/duplicado` · `GET /api/respostas-prontas`
- Conhecimento e indicadores (2): `GET /api/artigos/versoes/{id}` (atendente) · `GET /api/indicadores` com `de` e `ate`
- Administração (29): `GET`, `POST`, `PUT` e `/desativar` de `/api/admin/usuarios` · `POST /api/admin/matriculas/importacao` válido (200) · `GET`, `POST` e `PUT` de setores, categorias, cursos, respostas prontas e regras · `GET`, `POST`, `PUT`, `/ativar` e `/arquivar` de `/api/admin/artigos` · `GET`, `POST`, `/versoes` e `/arquivar` de `/api/admin/documentos`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_sucesso_iguais_aos_da_base"`

**C5** - [x] O retrato `api.Tests/Retratos/importacao.txt` guarda o corpo 400 de `POST /api/admin/matriculas/importacao` com um CSV de pelo menos 2 linhas inválidas por motivos diferentes, e o pedido devolve hoje esse corpo byte a byte depois de tirar dos dois lados só o membro `"traceId":"..."`, com a lista `erros` (`linha`, `motivo`) na mesma ordem (AC 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Erros_da_importacao_iguais_aos_da_base"`

**C6** - [x] O retrato `api.Tests/Retratos/gravacoes.txt` tem 24 linhas, uma por chamado afetado em cada caso abaixo, cada uma com as colunas `Estado`, `ResponsavelId`, `SetorId`, `CategoriaId`, `CategoriaOriginalId` (os três por nome), `OrigemCategoria`, `Titulo`, `Resumo`, `Semestre`, `MotivoFechamento`, `Reaberturas`, `Encaminhamentos`, `NumeroOriginal` (normalizado), `CriadoEm`, `ResolvidoEm`, `FechadoEm`, `AguardandoDesde` e `LembreteEm` (cada data `null` ou em minutos relativos ao relógio do teste), e as mensagens (`Tipo`, autor por nome ou `Sistema`, `Texto`, anexos com nome, tipo e tamanho) e os eventos (`Tipo`, ator por nome ou `Sistema`, `De`, `Para`, `Detalhe`, `CriadoEm` relativo) que o caso gravou, em ordem de `Id`; o estado de partida é montado só por rotas, pelo `Agendador`, por `ExecuteUpdate` como `Balcao.Recuar` e por entidades anêmicas, nunca atribuindo propriedade de `Chamado`, `Artigo` ou `Documento` num objeto carregado; cada caso grava hoje a mesma linha (AC 12)
- G1 `POST /api/conversas/{id}/transferir` · G2 `POST /api/atendimento-direto`
- G3 `/mensagens` aluno em `ABERTO` · G4 `/mensagens` aluno em `AGUARDANDO_ALUNO` com 1 PDF · G5 `/mensagens` aluno em `RESOLVIDO` dentro do prazo, responsável ativo
- G6 `/mensagens` atendente `PUBLICA` em `ABERTO` sem responsável, `aguardaAluno=true`, com 1 PDF · G7 `/mensagens` atendente `PUBLICA` em `AGUARDANDO_ALUNO` sendo o responsável, `aguardaAluno=true`, com `LembreteEm` já gravado pelo `Agendador` · G8 `/mensagens` atendente `NOTA` em `EM_ATENDIMENTO`
- G9 `/assumir` em `ABERTO` sem responsável · G10 `/assumir` em `AGUARDANDO_ALUNO` com outro responsável · G11 `/resolver` em `ABERTO` sem responsável · G12 `/confirmar`
- G13 `/rejeitar` com responsável ativo · G14 `/rejeitar` com responsável inativo (`Usuario.Ativo` falso gravado no banco) · G15 `/cancelar` com `motivo` em `AGUARDANDO_ALUNO` · G16 `/cancelar` sem corpo em `ABERTO`
- G17 `/encaminhar` em `AGUARDANDO_ALUNO` com responsável · G18 `/encaminhar` em `ABERTO` sem responsável · G19 `/reclassificar` em `RESOLVIDO` · G20 `/duplicado` em `EM_ATENDIMENTO`
- G21 `POST /api/admin/usuarios/{id}/desativar` do responsável por 4 chamados: `EM_ATENDIMENTO`, `AGUARDANDO_ALUNO` com `LembreteEm` gravado, `RESOLVIDO` e `FECHADO` (4 linhas)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Gravacoes_do_chamado_iguais_as_da_base"`

**C7** - [x] Cada retrato `api.Tests/Retratos/sucessos.txt`, `importacao.txt` e `gravacoes.txt` foi adicionado num único commit depois de `<base>`, `git diff <base> <esse commit> -- api` é vazio e o retrato não mudou desde então; `api.Tests/RetratoTests.cs`, `api.Tests/OrdemDasRecusasTests.cs` e `api.Tests/RecusasDoDominioTests.cs` não mudam em nenhum commit posterior ao último desses commits de adição (os testes de S1 ficaram verdes com o código da base) (AC 5)
Proof: `python .specs/features/dominio-e-contratos/retratos_antes.py <base>`

**C8** - [x] A ordem de recusa da base vale no acesso e na conversa, cada linha com as duas condições ao mesmo tempo: `POST /api/auth/login` com CPF `123` e senha vazia responde 400 com `errors.cpf`; com CPF válido desconhecido e senha vazia, 400 com `errors.senha` (não 401); `POST /api/auth/definir-senha` com token inválido e `novaSenha` de 3 caracteres, 400 com o `detail` do link inválido (sem `errors.novaSenha`); `POST /api/auth/senha` com senha atual errada e `novaSenha` de 3 caracteres, 400 com `errors.senhaAtual`; `POST /api/conversas/{id}/mensagens` com `{"mensagem":""}` numa conversa aberta com 10 mensagens do aluno, 400 com `errors.mensagem`; com mensagem válida numa conversa encerrada com 10 mensagens do aluno, 409 com `detail` "Esta conversa já foi encerrada."; `POST /api/atendimento-direto` com `{"descricao":""}` por aluno com 2 matrículas ativas e sem `matriculaId`, 400 com `errors.descricao` (L-023)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Cadeia_do_acesso_e_da_conversa"`

**C9** - [x] A ordem de recusa da base vale nos cadastros e nas regras, cada linha com as duas condições ao mesmo tempo e conferida no `POST` e no `PUT` da rota: setor com `nome` vazio e `triagem` que deixaria a instituição sem exatamente 1 setor de triagem (`true` no `POST`, `false` no `PUT` do setor de triagem), 400 `errors.nome`; curso com `nome` vazio e `setorCoordenacaoId` 999999, 400 `errors.nome`; resposta pronta com `setorId` 999999 e `titulo` vazio, 400 `errors.setorId`; resposta pronta com `titulo` e `texto` vazios, 400 `errors.titulo`; `PUT` da categoria padrão com `nome` vazio, 400 `errors.nome` com a mensagem "Informe o nome da categoria."; `POST /api/admin/regras` com a categoria padrão e `destino` "X", 400 `errors.categoriaId`; `PUT /api/admin/regras/{id}` com a categoria padrão e `destino` "X", 400 `errors.categoriaId`; `PUT /api/admin/regras/{id}` com `destino` "X" e a categoria de outra regra, 400 `errors.destino` (não 409) (L-023)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Cadeia_dos_cadastros"`

**C10** - [x] A ordem de recusa da base vale no usuário, em `POST /api/admin/usuarios` e em `PUT /api/admin/usuarios/{id}`, cada linha com as duas condições ao mesmo tempo: CPF inválido e `nome` vazio, 400 `errors.cpf`; `nome` vazio e e-mail inválido, 400 `errors.nome`; e-mail inválido e `papeis` vazio, 400 `errors.email`; `papeis` com `ATENDENTE` e um valor inválido e sem setor, 400 `errors.papeis`; atendente sem setor e `senhaTemporaria` de 3 caracteres, 400 `errors.setores` ("Escolha ao menos um setor para o atendente."); setor 999999 e `senhaTemporaria` de 3 caracteres, 400 `errors.setores` ("Setor inexistente."); `senhaTemporaria` de 3 caracteres e CPF de outro usuário, 400 `errors.senhaTemporaria` (não 409); CPF e e-mail de outros usuários, 409 com `detail` "Já existe um usuário com este CPF na instituição." (L-023)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Cadeia_do_usuario"`

**C11** - [x] A ordem de recusa da base vale no conhecimento, cada linha com as duas condições ao mesmo tempo: em `POST /api/admin/artigos` e em `PUT /api/admin/artigos/{id}`, `titulo` vazio e `perguntas` vazia dão 400 `errors.titulo`, `perguntas` vazia e `categoriaId` 999999 dão `errors.perguntas`, `categoriaId` 999999 e `resposta` vazia dão `errors.categoriaId`, `resposta` vazia e link `ftp://x` dão `errors.resposta`, link `ftp://x` e `visivelDe` depois de `visivelAte` dão `errors.links`; `POST /api/admin/documentos` com `titulo` vazio e `categoriaId` 999999 dá 400 `errors.titulo`, com `categoriaId` 999999 e arquivo que não é PDF dá 400 `errors.categoriaId` (não 415); `POST /api/admin/documentos/{id}/versoes` num documento `ARQUIVADO` dá 400 `errors.arquivo` sem arquivo, 415 com arquivo que não é PDF e 413 com PDF de 20 MB + 1 byte, nunca 409 (L-023, AC 21)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Cadeia_do_conhecimento"`

**C12** - [x] A ordem de recusa da base vale nas ações do chamado onde a recusa sai do handler, cada linha com as duas condições ao mesmo tempo: `/rejeitar` com `{}` 7 dias + 1 minuto depois da resolução dá 400 `errors.motivo` (não 409); `/mensagens` do aluno com `texto` vazio no mesmo chamado `RESOLVIDO` vencido dá 400 `errors.texto`; `/assumir` pelo próprio responsável num chamado `FECHADO` dá 409 com `detail` "A ação não é permitida no estado atual do chamado."; `/mensagens` `NOTA` com `texto` vazio e um anexo dá 400 `errors.texto`; `/mensagens` `NOTA` com um anexo que não é PDF, JPG nem PNG dá 400 `errors.anexos` (não 415); `/encaminhar` com `motivo` vazio e `setorId` igual ao atual dá 400 `errors.motivo`; o chamado não muda em nenhuma linha (L-023, AC 15, AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Cadeia_das_acoes_do_chamado"`

### S2 - Contratos nomeados (P1) · ~70 files · ~185 KB · ~46k

**C13** - [x] Os arquivos `.cs` de `api/` (sem `bin`, `obj`, `Dados/Migracoes`) com `\bnew\s*\{` (criação de objeto anônimo, também em mais de uma linha) são exatamente 6, com estas contagens: `Agendador.cs` 1, `Assistente/Assistente.cs` 8, `Assistente/Embeddings.cs` 1, `Conhecimento/Fontes.cs` 4, `Indicadores/ConsultarIndicadores.cs` 2, `Dados/OneDb.cs` 11 (27 de 75 na base); nenhum dos 6 contém `Results.` ou `TypedResults.`, exceto `ConsultarIndicadores.cs`, cujo único `Results.Ok` recebe `CalculoIndicadores.Calcular(...)`, que devolve o record `Resultado` (AC 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Objetos_anonimos_so_fora_das_respostas"`

**C14** - [x] Nenhum tipo de topo do assembly `One.Api` tem nome que termina em `In` (comparação ordinal) nem se chama `Entrada`; o resultado do login é o record de topo `ResultadoLogin(ClaimsPrincipal? Principal, IResult Resposta)`; existem exatamente 29 tipos aninhados chamados `Entrada`, um em cada uma destas mensagens: `Login`, `PrimeiroAcesso`, `DefinirSenha`, `TrocarSenha`, `CriarSetor`, `AlterarSetor`, `CriarCategoria`, `AlterarCategoria`, `CriarCurso`, `AlterarCurso`, `CriarRespostaPronta`, `AlterarRespostaPronta`, `SalvarRegra`, `AlterarRegra`, `CriarUsuario`, `AlterarUsuario`, `NovaConversa`, `NovaMensagem`, `AvaliarConversa`, `TransferirConversa`, `AtendimentoDireto`, `ResolverChamado`, `RejeitarChamado`, `CancelarChamado`, `EncaminharChamado`, `ReclassificarChamado`, `MarcarDuplicado`, `CriarArtigo`, `AlterarArtigo`; no `EndpointDataSource`, exatamente 29 rotas têm `IAcceptsMetadata` com `application/json`, e o `RequestType` de cada uma é o `Entrada` da mensagem cujo `Mapear` registra a rota, sem dois iguais (AC 7, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Entrada_por_caso_de_uso"`

**C15** - [x] Das 58 mensagens, as 54 cujas rotas respondem com corpo JSON (todas menos `DefinirSenha`, `TrocarSenha`, `BaixarAnexo`, `BaixarVersaoDocumento`) se dividem assim: 15 declaram um tipo aninhado `Resposta` (`Login`, `PrimeiroAcesso`, `Eu`, `VerInstituicao`, `NovaConversa`, `NovaMensagem`, `VerConversa`, `AvaliarConversa`, `TransferirConversa`, `AtendimentoDireto`, `EncerrarConversa`, `ListarChamados`, `RespostasProntasDoSetor`, `VerVersaoArtigo`, `ImportarMatriculas`); 38 usam o record `Shared` da sua família (os 10, 5, 4, 4 e 5 × 3 casos de C16), citado no próprio `api/<Fatia>/X.cs` ou, nas 9 ações, no arquivo do `AgirNoChamado` que as embrulha, e não declaram `Resposta`; e `ConsultarIndicadores` devolve o record `Resultado` de `Indicadores/CalculoIndicadores.cs` (Impact, código); `api/` tem exatamente 9 arquivos em pastas `Shared`, cada um declarando 1 record de topo com o nome do arquivo e namespace `One.Api.<Fatia>.Shared` (AC 8, door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Resposta_por_caso_de_uso"`

**C16** - [x] Cada um dos 9 records de `Shared` é usado por pelo menos 3 casos de uso da sua fatia (contados como em C15: citação no arquivo do caso ou, para as ações, no `AgirNoChamado`) e o nome dele não aparece em nenhum arquivo de outra fatia: `Chamados/Shared/DetalheChamado` em `VerChamado` e nas 9 ações (`ResponderChamado`, `AssumirChamado`, `ResolverChamado`, `ConfirmarChamado`, `RejeitarChamado`, `CancelarChamado`, `EncaminharChamado`, `ReclassificarChamado`, `MarcarDuplicado`, pelo `AgirNoChamado`) = 10; `Conhecimento/Shared/ArtigoResposta` em `ListarArtigos`, `CriarArtigo`, `AlterarArtigo`, `AtivarArtigo`, `ArquivarArtigo` = 5; `Conhecimento/Shared/DocumentoResposta` em `ListarDocumentos`, `CriarDocumento`, `NovaVersaoDocumento`, `ArquivarDocumento` = 4; `Administracao/Shared/UsuarioResposta` em `ListarUsuarios`, `CriarUsuario`, `AlterarUsuario`, `DesativarUsuario` = 4; `RegraResposta` em `ListarRegras`, `SalvarRegra`, `AlterarRegra`; `SetorResposta`, `CategoriaResposta`, `CursoResposta` e `RespostaProntaResposta` cada um no `Listar*`, `Criar*` e `Alterar*` da sua entidade = 3 cada (AC 9, door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Shared_com_tres_usos_na_fatia"`

**C17** - [x] Nos tipos dos namespaces `One.Api*` (fora `One.Api.Dados.Migracoes` e fora `One.Api.Assistente.Assistente`, cujo corpo vai ao provedor de IA), nenhum campo, propriedade, parâmetro ou retorno declarado tem tipo `object` ou um tipo genérico com `object` como argumento em qualquer nível (`Task<object>`, `List<object>`, `Func<T, object>`, `IEnumerable<object>`), exceto a propriedade `IReadOnlyList<object>` da transcrição no record `DetalheChamado`, onde o item da equipe e o do aluno são 2 records nomeados (o da equipe com `fontes`, o do aluno sem a chave); os 14 de hoje somem (`CadastroRotas.Listar`, `Criar`, `Alterar`; os 4 `Saida` dos cadastros; `RegraRotas.Saida`; `UsuarioRotas.Saida`; `ConversaRotas.Responder`; `DetalheChamado.Montar` e `Mensagens`; `ListarChamados.Meus` e `Fila`; `ArtigoRotas.Saida`; `DocumentoRotas.Saida`) (AC 10, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Nenhum_corpo_tipado_object"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_sucesso_iguais_aos_da_base"`

**C18** - [x] Em `.specs/STATE.md`, a linha de AD-024 tem status `active` (Impact, decisões)
Proof: `grep -E "^\| AD-024 \|.*\| active \|" .specs/STATE.md`

### S3 - O chamado decide as próprias transições (P1) · ~24 files · ~120 KB · ~30k

**C19** - [ ] `Chamado` não tem construtor público nem setter público além de `InstituicaoId` (também `Xmin` fica sem setter público); expõe as mensagens e os eventos só pelas propriedades `Mensagens` (`IReadOnlyCollection<MensagemChamado>`) e `Eventos` (`IReadOnlyCollection<EventoChamado>`); `MensagemChamado`, `Anexo` e `EventoChamado` têm todo setter público como `init`, exceto `InstituicaoId`; `api/Dados/Chamados/Chamado.cs` não contém `OneDb`, `DbSet`, `IQueryable` nem `Microsoft.EntityFrameworkCore` (AC 11, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Chamado_fechado"`

**C20** - [ ] Fora de `api/Dados/**` e de `api/Agendador.cs`, nenhum arquivo de `api/` contém `new EventoChamado`, `new MensagemChamado`, `EventosChamado.Add` nem `MensagensChamado.Add`; e cada caso G1 a G21 de C6 grava hoje as mesmas 24 linhas gravadas na base (AC 12)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Chamado_muda_so_pelos_metodos"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Gravacoes_do_chamado_iguais_as_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EventosTests.Cada_acao_grava_evento"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Desativar_atendente_devolve_chamados"`

**C21** - [ ] Sem banco, cada linha da tabela abaixo leva um `Chamado` do estado de partida ao estado final, acrescenta as mensagens e os eventos listados nessa ordem (ator = quem age, exceto `Abrir`, sem ator; `CriadoEm` = o instante passado) e muda só as colunas citadas; `LembreteEm`, que só o `Agendador` grava, fica provado pelas gravações G7 e G21 de C6 e C20 (AC 12, AC 25)
| # | Método | Partida | Final e colunas | Mensagem | Eventos novos, em ordem |
| --- | --- | --- | --- | --- | --- |
| 1 | `Abrir` | - | `ABERTO`, sem responsável | - | `CRIACAO` (para `ABERTO`) |
| 2 | `Assumir` | `ABERTO` sem responsável | `EM_ATENDIMENTO`, responsável = ator | - | `ATRIBUICAO` (de nulo, para o ator), `TRANSICAO` |
| 3 | `Assumir` | `AGUARDANDO_ALUNO` com outro responsável | `AGUARDANDO_ALUNO`, `AguardandoDesde` mantido | - | `ATRIBUICAO` (de outro, para o ator) |
| 4 | `ResponderComoAluno` | `AGUARDANDO_ALUNO`, 1 anexo | `EM_ATENDIMENTO`, `AguardandoDesde` nulo | `PUBLICA` com o anexo | `RESPOSTA`, `ANEXO` (detalhe = nome), `TRANSICAO` |
| 5 | `ResponderComoAluno` | `ABERTO` | `ABERTO` | `PUBLICA` | `RESPOSTA` |
| 6 | `ResponderComoEquipe` | `ABERTO` sem responsável, aguarda o aluno | `AGUARDANDO_ALUNO`, `AguardandoDesde` = agora | `PUBLICA` | `RESPOSTA`, `ATRIBUICAO`, `TRANSICAO` |
| 7 | `ResponderComoEquipe` | `AGUARDANDO_ALUNO`, ator é o responsável, aguarda o aluno | igual, `AguardandoDesde` mantido | `PUBLICA` | `RESPOSTA` |
| 8 | `Anotar` | `EM_ATENDIMENTO` | igual | `NOTA` | `NOTA` |
| 9 | `Resolver` | `ABERTO` sem responsável | `RESOLVIDO`, `ResolvidoEm` = agora | `PUBLICA` | `RESPOSTA`, `ATRIBUICAO`, `TRANSICAO` |
| 10 | `Confirmar` | `RESOLVIDO` | `FECHADO`, `CONFIRMADO`, `FechadoEm` = agora | - | `TRANSICAO` (detalhe nulo) |
| 11 | `Rejeitar` | `RESOLVIDO`, responsável ativo, no prazo | `EM_ATENDIMENTO`, `Reaberturas` + 1 | `PUBLICA` | `RESPOSTA`, `TRANSICAO` |
| 12 | `Rejeitar` | `RESOLVIDO`, responsável inativo, no prazo | `ABERTO`, sem responsável, `Reaberturas` + 1 | `PUBLICA` | `RESPOSTA`, `ATRIBUICAO` (para nulo), `TRANSICAO` |
| 13 | `Cancelar` | `AGUARDANDO_ALUNO`, justificativa | `FECHADO`, `CANCELADO`, `AguardandoDesde` nulo | - | `TRANSICAO` (detalhe = justificativa; nulo se em branco) |
| 14 | `Encaminhar` | `AGUARDANDO_ALUNO` com responsável | `ABERTO`, setor novo, sem responsável, `Encaminhamentos` + 1 | `NOTA` com o motivo | `NOTA`, `ENCAMINHAMENTO` (nomes dos setores), `ATRIBUICAO`, `TRANSICAO` |
| 15 | `Reclassificar` | `RESOLVIDO` | igual, categoria nova, `CategoriaOriginalId` mantida | - | `RECLASSIFICACAO` (nomes das categorias) |
| 16 | `MarcarDuplicado` | `EM_ATENDIMENTO` | `FECHADO`, `DUPLICADO`, `NumeroOriginal` | `PUBLICA` "Este pedido continua em {original}." | `RESPOSTA`, `TRANSICAO` |
| 17 | `DevolverAFila` | `AGUARDANDO_ALUNO` | `ABERTO`, sem responsável, `AguardandoDesde` nulo | - | `ATRIBUICAO` (para nulo, detalhe "Responsável desativado"), `TRANSICAO` |
| 18 | `DevolverAFila` | `RESOLVIDO` | `RESOLVIDO`, sem responsável | - | `ATRIBUICAO` (detalhe "Responsável desativado") |
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoDominioTests.Cada_transicao_como_a_base"`

**C22** - [ ] Sem banco, em 18 casos um método do `Chamado` chamado onde a transição não existe lança `InvalidOperationException` e deixa `Estado`, `Mensagens` e `Eventos` como estavam: os 12 (`Assumir`, `ResponderComoAluno`, `ResponderComoEquipe`, `Anotar`, `Resolver`, `Confirmar`, `Rejeitar`, `Cancelar`, `Encaminhar`, `Reclassificar`, `MarcarDuplicado`, `DevolverAFila`) num chamado `FECHADO`, mais `Confirmar` e `Rejeitar` em `ABERTO`, em `EM_ATENDIMENTO` e em `AGUARDANDO_ALUNO` (AC 13)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoDominioTests.Transicao_inexistente_lanca_e_nao_muda"`

**C23** - [ ] Sem banco, para cada um dos 32 trios (ação, papel, estado) que `PermissoesChamado.Estados` permite, lidos da própria tabela para as 10 ações e os 2 papéis, o método correspondente aceita o estado sem lançar (`responder`/`ALUNO` -> `ResponderComoAluno`, ou `Rejeitar` em `RESOLVIDO`; `responder`/`ATENDENTE` -> `ResponderComoEquipe`; `nota` -> `Anotar`; `assumir` -> `Assumir` por quem não é o responsável; `resolver` -> `Resolver`; `confirmar` -> `Confirmar`; `rejeitar` -> `Rejeitar` no prazo; `cancelar` -> `Cancelar`; `encaminhar` -> `Encaminhar`; `reclassificar` -> `Reclassificar`; `duplicado` -> `MarcarDuplicado`), e o teste confere que contou 32 (AC 14, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoDominioTests.Todo_trio_permitido_e_aceito"`

**C24** - [ ] `POST /api/chamados/{numero}/assumir` pelo atendente que já é o responsável responde 409 com `detail` "Você já é o responsável por este chamado." e não grava evento; sem banco, `Chamado.Assumir` pelo responsável devolve `Recusa` com esse `Motivo` e não muda o chamado (AC 15, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RecusasDoDominioTests.Assumir_sendo_o_responsavel_409"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoDominioTests.Assumir_pelo_responsavel_recusa"`

**C25** - [ ] Num chamado `RESOLVIDO` há 7 dias + 1 minuto, `POST /api/chamados/{numero}/rejeitar` com motivo e `/mensagens` do aluno com texto respondem 409 com `detail` "O prazo de 7 dias para rejeitar a resolução terminou." e o chamado não muda; com `Prazos:ConfirmacaoDias` 10 o `detail` diz 10; sem banco, `Chamado.Rejeitar` aceita exatamente no limite (`ResolvidoEm` + prazo) e, 1 tick depois, devolve `Recusa` com esse `Motivo` sem mudar o chamado (AC 16, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RecusasDoDominioTests.Rejeitar_ou_responder_fora_do_prazo_409"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrazosTests.Rejeicao_segue_prazo_de_confirmacao"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoDominioTests.Rejeitar_no_limite_aceita_e_depois_recusa"`

**C26** - [x] Por reflexão, os membros públicos declarados são exatamente os da base: `PermissoesChamado` com `Aluno`, `Atendente`, `string[]? Estados(string, string)` e `IEnumerable<string> Acoes(string, string, long?, long)`; `AcessoChamado` com `Chamado`, `Papel`, `Usuario`, `Instituicao`, `Agora`, `Cfg`, `Prazos` (setter não público) e `void Preencher(Chamado, string, Usuario, Instituicao, DateTime, IConfiguration, Prazos)`; `IAcaoChamado` com `Numero`, `Acao`, `Usuario`, `Instituicao`, `Criado` e `ValueTask<IResult?> Validar(AcessoChamado, OneDb)`; `AgirNoChamado<,>` com o construtor `(OneDb, AcessoChamado, TimeProvider, Prazos, IConfiguration)` e `ValueTask<TResponse> Handle(TMessage, MessageHandlerDelegate<TMessage, TResponse>, CancellationToken)`; `DetalheChamado.Montar` devolve `Task<DetalheChamado>`; `api/Dados/Recusa.cs` declara `public sealed record Recusa(string Motivo);` no namespace `One.Api.Dados`, devolvido como `Recusa?` por `Chamado.Assumir`, `Chamado.Rejeitar`, `Artigo.Ativar`, `Artigo.Arquivar`, `Documento.NovaVersao` e `Documento.Arquivar`; e `Estados(` aparece só no arquivo de `AgirNoChamado` (AC 17, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Pipeline_do_chamado_com_a_forma_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Permissao_so_no_AgirNoChamado"`

**C27** - [ ] `api/Agendador.cs` é byte a byte o de `<base>` (AC 18)
Proof: `git diff --exit-code <base> HEAD -- api/Agendador.cs`

**C28** - [ ] Com as navegações novas `Chamado.Mensagens` e `Chamado.Eventos`, a concorrência e o append-only seguem: dois `/resolver` simultâneos dão 200 e 409, duas transferências da mesma conversa dão 201 e 409 com 1 chamado, 20 transferências paralelas dão 20 números distintos, e o trigger recusa `UPDATE` e `DELETE` em `evento_chamado` e `mensagem_chamado` (door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConcorrenciaTests.Segunda_alteracao_simultanea_409"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TransferenciaTests.Transferencia_dupla_um_chamado_e_409"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~NumeracaoTests.Vinte_transferencias_paralelas_numeros_distintos"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ImutabilidadeTests.Trigger_recusa_update_e_delete"`

### S4 - Artigo e documento decidem as próprias versões e estados (P2) · ~18 files · ~80 KB · ~20k

**C29** - [ ] `Artigo` e `Documento` não têm construtor público nem setter público além de `InstituicaoId`; expõem as versões só por `Versoes` (`IReadOnlyCollection<VersaoArtigo>` e `IReadOnlyCollection<VersaoDocumento>`); `VersaoArtigo` e `VersaoDocumento` têm todo setter público como `init`, exceto `InstituicaoId`; `Artigo.cs` e `Documento.cs` não contêm `OneDb`, `DbSet`, `IQueryable` nem `Microsoft.EntityFrameworkCore` (AC 19, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Artigo_e_documento_fechados"`

**C30** - [ ] Sem banco: `Artigo.Criar` dá `RASCUNHO` com 1 versão número 1; `NovaVersao` com o número seguinte acrescenta a versão e troca categoria e validade; `Ativar` leva `RASCUNHO` e `ARQUIVADO` a `ATIVO`; `Arquivar` leva `RASCUNHO` e `ATIVO` a `ARQUIVADO`; `Documento.Criar` dá `ATIVO` com 1 versão número 1; `NovaVersao` com o número seguinte num documento `ATIVO` acrescenta a versão; `Arquivar` leva `ATIVO` a `ARQUIVADO` (AC 25)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoDominioTests.Cada_transicao_como_a_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoDominioTests.Cada_transicao_como_a_base"`

**C31** - [ ] `POST /api/admin/artigos/{id}/ativar` num artigo `ATIVO` responde 409 com `detail` "O artigo já está ativo." e `/arquivar` num `ARQUIVADO`, 409 com "O artigo já está arquivado."; sem banco, `Artigo.Ativar` e `Artigo.Arquivar` devolvem `Recusa` com esses textos e não mudam o artigo (AC 20)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RecusasDoDominioTests.Artigo_ja_ativo_ou_ja_arquivado_409"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoAdminTests.Ativar_ativo_ou_arquivar_arquivado_409"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoDominioTests.Ativar_ativo_e_arquivar_arquivado_recusam"`

**C32** - [ ] Num documento `ARQUIVADO`, `POST /api/admin/documentos/{id}/versoes` com PDF válido responde 409 com `detail` "O documento está arquivado." e `/arquivar` responde 409 com "O documento já está arquivado." (depois do 404 e das recusas do PDF, C11); sem banco, `Documento.NovaVersao` e `Documento.Arquivar` num `ARQUIVADO` devolvem `Recusa` com esses textos e não mudam o documento (AC 21)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Erros_em_problem_json"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoDominioTests.Arquivado_recusa_versao_e_arquivar"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Cadeia_do_conhecimento"`

**C33** - [ ] Sem banco, num `Artigo` e num `Documento` com versões 1 e 2, `NovaVersao` com número 2 e com número 1 lança `InvalidOperationException` e deixa as 2 versões, e com número 3 aceita; "última versão" segue calculada num arquivo só, em `Conhecimento/` (AC 22)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArtigoDominioTests.Versao_sem_numero_maior_lanca"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoDominioTests.Versao_sem_numero_maior_lanca"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Ultima_versao_em_um_arquivo"`

### S5 - Estrutura e regra de dependência (P1) · ~38 files · ~98 KB · ~25k

**C34** - [ ] Os 24 tipos de entidade do modelo do `OneDb` moram cada um em `api/Dados/<pasta>/<Nome>.cs`, que declara exatamente 1 tipo (com o nome do arquivo): `Dados/` `Instituicao`; `Dados/Chamados/` `Chamado`, `MensagemChamado`, `Anexo`, `EventoChamado`; `Dados/Conversas/` `Conversa`, `MensagemConversa`, `CitacaoArtigo`; `Dados/Artigos/` `Artigo`, `VersaoArtigo`; `Dados/Documentos/` `Documento`, `VersaoDocumento`; `Dados/Trechos/` `TrechoFonte`; `Dados/Usuarios/` `Usuario`, `UsuarioPapel`, `Matricula`, `TokenAcesso`, `AtendenteSetor`; `Dados/Cadastros/` `Setor`, `Curso`, `Categoria`, `RegraRoteamento`, `RespostaPronta`; `Dados/Emails/` `EmailSaida`; `api/Dados/Entidades.cs` declara só `IDaInstituicao` e as 8 classes estáticas `Papeis`, `EstadosArtigo`, `Desfechos`, `EstadosDocumento`, `EstadosChamado`, `TiposEvento`, `TiposMensagem`, `MotivosFechamento`; `api/One.Api.csproj` e `api.Tests/One.Api.Tests.csproj` têm cada um `<Using Include="One.Api.Dados.X" />` para as 8 pastas (AC 23, door 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Uma_entidade_por_arquivo_por_agregado"`

**C35** - [ ] Nenhum arquivo `.cs` de `api/Dados/**` fora de `Migracoes` casa `using\s+(static\s+)?(Microsoft\.AspNetCore|Mediator)\b`, `\b(IResult|Results|HttpContext|HttpRequest|IFormFile|IFormCollection|IMediator|IRequest|Problemas)\b` nem `(?<![\w.])(One\.Api\.)?(Acesso|Assistente|Chamados|Conhecimento|Indicadores|Administracao|Instituicoes)\.[A-Z]` (comentários fora); e, por reflexão, nenhum campo, propriedade, parâmetro, retorno, base ou interface de tipo em namespace `One.Api.Dados*` vem de assembly cujo nome começa com `Microsoft.AspNetCore` ou `Mediator`, nem de namespace `One.Api.<Fatia>` das 7 fatias (AC 24, door 7)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dominio_sem_AspNetCore_Mediator_nem_fatias"`

**C36** - [ ] `api.Tests/ChamadoDominioTests.cs`, `api.Tests/ArtigoDominioTests.cs` e `api.Tests/DocumentoDominioTests.cs` declaram `public class` com o nome do arquivo e não contêm `OneFactory`, `OneDb` nem `HttpClient`; os métodos públicos declarados (sem acessores) de `Chamado`, `Artigo` e `Documento` são exatamente os 20 (`Chamado`: `Abrir` e os 12 de C22; `Artigo`: `Criar`, `NovaVersao`, `Ativar`, `Arquivar`; `Documento`: `Criar`, `NovaVersao`, `Arquivar`), e cada um aparece chamado (`.<Nome>(`) no arquivo de teste da sua entidade (AC 25)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Testes_de_dominio_sem_banco"`

**C37** - [ ] `db.Database.HasPendingModelChanges()` é falso com o modelo de `HEAD`; nenhum arquivo foi adicionado em `api/Dados/Migracoes` desde `<base>`, ou, se uma migração `DominioRico` entrou, os métodos `Up` e `Down` dela não têm nenhuma chamada `migrationBuilder.` (AC 26, door 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Modelo_sem_mudanca_pendente"`
Proof: `python .specs/features/dominio-e-contratos/migracao_vazia.py <base>`

**C38** - [ ] `One.slnx` lista exatamente 2 projetos, `api/One.Api.csproj` e `api.Tests/One.Api.Tests.csproj`, o repositório não tem outro `*.csproj` fora de `bin`/`obj`, e nenhum tipo do assembly `One.Api` tem nome que contém `Repositor` (AC 27)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dois_projetos_sem_repositorio"`

**C39** - [ ] `dotnet build api` termina com 0 `CA1502` no limite 10, a barreira continua ativa (complexidade 11 plantada quebra, 10 compila) e uma mensagem sem handler continua dando `error MSG0005` (AC 28)
Proof: `dotnet build api -warnaserror:CA1502`
Proof: `bash .specs/features/refatoracao-solid/ca1502_barra.sh`
Proof: `bash .specs/features/vertical-slice-completa/msg0005_barra.sh`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Mediator_referenciado"`

**C40** - [ ] Todo membro de `api.Tests/ArquiteturaTests.cs` que existe em `<base>` (métodos de teste, auxiliares e os campos `Fatias`, `ReferenciasEntreFatias`, `LiteraisGravados`, `TabelasDaInstituicao`) tem em `HEAD` o mesmo texto (espaços normalizados), e `Namespace_igual_a_pasta`, `Fatias_do_api` e `Referencias_entre_fatias` passam (AC 28)
Proof: `python .specs/features/dominio-e-contratos/arquitetura_intacta.py <base>`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Namespace_igual_a_pasta"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Fatias_do_api"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Referencias_entre_fatias"`

**C41** - [ ] As regras de `<base>` que a mudança de pasta e de forma das entidades poderia quebrar continuam verdes sem editar o teste: literais gravados só em `Dados/Entidades.cs`, toda entidade com `instituicao_id` e filtro, tabelas em snake_case com datas `timestamptz`, um arquivo por caso de uso, um handler por mensagem no mesmo arquivo, `Map*` só nos casos de uso, nenhum `HttpContext` em mensagem ou handler (door 5, AC 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Literais_gravados_so_nas_constantes"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Tabelas_snake_case_e_datas_timestamptz"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Um_arquivo_por_caso_de_uso"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Um_handler_por_mensagem_no_mesmo_arquivo"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Map_so_nos_casos_de_uso"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Handler_sem_HttpContext"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| suítes que prendem o comportamento (2) | API C1, C2 · e2e C1 | - |
| doors do `Landing` (7) | door 1 C14, C15, C17, C4 · door 2 C15, C16 · door 3 C19, C28, C29 · door 4 C23, C24, C25, C26 · door 5 C34, C41 · door 6 C37 · door 7 C35 | - |
| rotas com corpo JSON (54) | C4, table-driven over all 54: Acesso 4 C4 · Assistente 7 C4 · Chamados 12 C4 · versão de artigo 1 C4 · indicadores 1 C4 · admin 29 C4 | - |
| formas de corpo além de uma por rota (5) | fila do atendente C4 · fila de quem não é atendente C4 · detalhe do aluno e do atendente C4 · `/mensagens` atendente `PUBLICA` C4 · `/mensagens` `NOTA` C4 | - |
| item da transcrição do detalhe (2 formas) | equipe com `fontes` C4, C17 · aluno sem a chave C4, C17 | - |
| retratos (5) | `rotas.txt` C3 · `erros.txt` C3 · `sucessos.txt` C4, C7 · `importacao.txt` C5, C7 · `gravacoes.txt` C6, C7, C20 | - |
| criações anônimas da base (75) | C13, table-driven over all 75: 41 corpos de resposta (Acesso 7, Administracao 8, Assistente 9, Chamados 12, Conhecimento 5) C13 · 7 projeções internas (`BaixarAnexo`, `BaixarVersaoDocumento`, `ListarChamados` 1, `ImportarMatriculas` 1, `DetalheChamado` 2, `DocumentoRotas` 1) C13 · 27 que ficam (`Agendador` 1, `Assistente` 8, `Embeddings` 1, `Fontes` 4, `ConsultarIndicadores` 2, `OneDb` 11) C13 | - |
| records `*In` da base (21) | C14, table-driven over all 21: `AuthRotas` 4 C14 · `CadastroRotas` 4 C14 · `RegraRotas` 1 C14 · `UsuarioRotas` 1 C14 · `ConversaRotas` 4 C14 · `AcoesChamado` 6 C14 · `ArtigoRotas` 1 C14 | - |
| `Entrada` por caso de uso (29) | C14, table-driven over all 29: Acesso 4 C14 · Administracao 12 C14 · Assistente 5 C14 · Chamados 6 C14 · Conhecimento 2 C14 | - |
| pares que dividiam um `*In` (8) | setor C14 · categoria C14 · curso C14 · resposta pronta C14 · regra C14 · usuário C14 · artigo C14 · mensagem da conversa C14 | - |
| origem do corpo das 54 mensagens (3) | `Resposta` aninhada 15 C15 · record de `Shared` 38 C15, C16 · `Resultado` de `ConsultarIndicadores` 1 C15 | - |
| records de `Shared` (9) | `DetalheChamado` 10 C16 · `ArtigoResposta` 5 C16 · `DocumentoResposta` 4 C16 · `UsuarioResposta` 4 C16 · `RegraResposta` 3 C16 · `SetorResposta` 3 C16 · `CategoriaResposta` 3 C16 · `CursoResposta` 3 C16 · `RespostaProntaResposta` 3 C16 | - |
| assinaturas `object` da base (14) | C17, table-driven over all 14: `CadastroRotas` 3 C17 · `Saida` dos cadastros 4 C17 · `RegraRotas.Saida` C17 · `UsuarioRotas.Saida` C17 · `ConversaRotas.Responder` C17 · `DetalheChamado` 2 C17 · `ListarChamados` 2 C17 · `ArtigoRotas.Saida` e `DocumentoRotas.Saida` C17 | - |
| transições e fábricas (20) | `Chamado.Abrir` C21, C36 · `Assumir` C21, C24 · `ResponderComoAluno` C21 · `ResponderComoEquipe` C21 · `Anotar` C21 · `Resolver` C21 · `Confirmar` C21 · `Rejeitar` C21, C25 · `Cancelar` C21 · `Encaminhar` C21 · `Reclassificar` C21 · `MarcarDuplicado` C21 · `DevolverAFila` C21 · `Artigo.Criar` C30 · `Artigo.NovaVersao` C30, C33 · `Artigo.Ativar` C30, C31 · `Artigo.Arquivar` C30, C31 · `Documento.Criar` C30 · `Documento.NovaVersao` C30, C32, C33 · `Documento.Arquivar` C30, C32 | - |
| quem chama cada método do `Chamado` (13 casos de uso) | `TransferirConversa` C6, C20 · `AtendimentoDireto` C6, C20 · `ResponderChamado` C6, C20 · `AssumirChamado` C6, C20 · `ResolverChamado` C6, C20 · `ConfirmarChamado` C6, C20 · `RejeitarChamado` C6, C20 · `CancelarChamado` C6, C20 · `EncaminharChamado` C6, C20 · `ReclassificarChamado` C6, C20 · `MarcarDuplicado` C6, C20 · `DesativarUsuario` C6, C20 · `Agendador` fora, intocado C27 | - |
| ramos das transições na base (18 linhas) | C21, table-driven over all 18 | - |
| transição inexistente (18 casos) | C22, table-driven over all 18: 12 métodos em `FECHADO` C22 · `Confirmar` em 3 estados C22 · `Rejeitar` em 3 estados C22 | - |
| trios permitidos por `PermissoesChamado` (32) | C23, table-driven over all 32 | - |
| recusas que a entidade decide (6) | `Assumir` pelo responsável C24 · `Rejeitar` fora do prazo (rejeitar e responder) C25 · artigo já ativo C31 · artigo já arquivado C31 · nova versão em documento arquivado C32 · documento já arquivado C32 | - |
| limite do prazo de rejeição (2 lados) | exatamente no limite aceita C25 · 1 tick depois recusa C25 | - |
| número da nova versão (3 valores) | igual à maior lança C33 · menor lança C33 · maior + 1 aceita C33 | - |
| cadeias de recusa da base nos handlers reescritos, L-023 (56 linhas) | table-driven over all 56 em C8 a C12: Login 2 C8 · `DefinirSenha` 1 C8 · `TrocarSenha` 1 C8 · `NovaMensagem` 2 C8 · `AtendimentoDireto` 1 C8 · setor 2 C9 · curso 2 C9 · resposta pronta 4 C9 · categoria 1 C9 · regra 3 C9 · usuário 16 C10 · artigo 10 C11 · `CriarDocumento` 2 C11 · `NovaVersaoDocumento` 3 C11 · `RejeitarChamado` 1 C12 · `/mensagens` do aluno em `RESOLVIDO` 1 C12 · `AssumirChamado` 1 C12 · `/mensagens` `NOTA` 2 C12 · `EncaminharChamado` 1 C12 | - |
| agregados ricos fechados (3) | `Chamado` C19 · `Artigo` C29 · `Documento` C29 | - |
| filhos append-only com `init` (5) | `MensagemChamado` C19 · `Anexo` C19 · `EventoChamado` C19 · `VersaoArtigo` C29 · `VersaoDocumento` C29 | - |
| forma do pipeline do chamado (4 tipos) | `PermissoesChamado` C26 · `AcessoChamado` C26 · `IAcaoChamado` C26 · `AgirNoChamado<,>` C26 | - |
| entidades por pasta, em 9 pastas (24) | C34, table-driven over all 24: `Dados` 1 C34 · `Chamados` 4 C34 · `Conversas` 3 C34 · `Artigos` 2 C34 · `Documentos` 2 C34 · `Trechos` 1 C34 · `Usuarios` 5 C34 · `Cadastros` 5 C34 · `Emails` 1 C34 | - |
| startup config: `using` global das 8 pastas (2 projetos) | `api/One.Api.csproj` C34 · `api.Tests/One.Api.Tests.csproj` C34 | - |
| startup config: mapeamento EF das navegações novas (1 lugar) | `OneDb.OnModelCreating`, usado pelo `Program` e pelo `OneFactory` C37, C20, C28 | - |
| regra de dependência do domínio (4 partes) | `using` de ASP.NET Core ou Mediator C35 · tipos HTTP e `Problemas` C35 · nome de fatia C35 · assinaturas por reflexão C35 | - |
| barreiras do build (2) | `CA1502` C39 · `MSG0005` C39 | - |
| regras existentes do `ArquiteturaTests` nomeadas no AC 28 (3) | `Namespace_igual_a_pasta` C40 · `Fatias_do_api` C40 · `Referencias_entre_fatias` C40 | - |
| decisões no `STATE.md` (1) | AD-024 `active` C18 | - |

- Claims naming a status code, route or response body: C3 a C12, C24, C25, C28, C31, C32 - each has a proof that crosses the HTTP boundary; C21 a C25, C30 a C33 also prove the same rule at the entity, without the database
- Cadeias da base sem par alcançável, fora do conjunto acima: `PrimeiroAcesso` (só a recusa de CPF), `EncerrarConversa`, `TransferirConversa` e `AvaliarConversa` com 404 (conversa alheia some antes do 409), `AtivarArtigo`, `ArquivarArtigo` e `ArquivarDocumento` (o 409 precisa da entidade que o 404 não achou), `ImportarMatriculas` (sem arquivo não há cabeçalho), `ConsultarIndicadores`, `VerVersaoArtigo`, `BaixarAnexo` e `BaixarVersaoDocumento` (não são reescritos ou só têm 404); as ordens já presas pela `vertical-slice-completa` (`OrdemDasRecusasTests` de C15 a C18 e C25 a C27 de lá, e `Cadastro_400_antes_de_409`, `Transferir_conversa_encerrada_409_antes_de_400`) seguem verdes por C1
- C1 is the only check that runs whole suites; that is its claim, and C2 is what stops the suite from going green by losing asserts
- No other check claims more than the cases its proof asserts

## Test policy

O repositório não tem guia de testes; valem as linhas da `vertical-slice-completa`, mais as que esta
feature pede: as transições, que hoje são decididas por 8 auxiliares estáticos e 5 handlers e passam a
ser decididas por métodos de entidade, ganham prova na própria camada, sem banco; o contrato de sucesso,
que nenhum retrato prendia, ganha um.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide, no domínio: as 17 transições e as 3 fábricas de `Chamado`, `Artigo` e `Documento` (estado, eventos, recusas, limites) | uma na própria camada, sem `OneFactory`, `OneDb` nem `HttpClient`, **e** o retrato das gravações e as recusas na fronteira HTTP | um caso por linha da tabela de decisão (C21 18 linhas, C22 18, C23 32, C24, C25, C30 a C33) e um caso HTTP por caso de uso que chama o método (C6, C20) |
| Decide e é alcançado por HTTP: a ordem das recusas de cada handler reescrito | um caso HTTP por par adjacente da cadeia da base, com as duas condições ao mesmo tempo | as 56 linhas de C8 a C12, mais as ordens já presas na `vertical-slice-completa` |
| Contrato HTTP que não pode mudar: corpos de sucesso, corpo de erro da importação, gravações do chamado | um retrato gravado com o código da base e comparado por teste | as 59 chamadas, o corpo 400 e as 24 linhas (C4 a C7) |
| Estrutura: contratos nomeados, `Shared`, entidade por arquivo, regra de dependência, agregados fechados, esquema igual | regra de texto ou de reflexão no `ArquiteturaTests` | um caso por membro do conjunto (C13 a C17, C19, C20, C26, C29, C34 a C38, C40) |
| Instrumentação: os records `Entrada`/`Resposta`, as projeções `De`/`Montar` e o lambda de cada `Mapear` | nenhuma própria | coberta pelo retrato C4 (inclusive o `equipe ? ... : ...` do detalhe, pelas chamadas de aluno e de atendente) |

Evidence:

- `api/Chamados/AcoesChamado.cs`: 8 transições estáticas com 14 pontos de decisão (`Mudar` 2, `Atribuir` 3, `Mensagem` 1, `Anexar` 1, `RespostaDaEquipe` 1, `RejeitarResolucao` 6) -> decide
- os 9 handlers de ação em `api/Chamados/`: 11 pontos de decisão (`ResponderChamado` 7, `AssumirChamado` 2, `ResolverChamado` 1, `CancelarChamado` 1); `DesativarUsuario`: 2 (laço e `EM_ATENDIMENTO`/`AGUARDANDO_ALUNO`) -> decide
- `api/Conhecimento/ArtigoRotas.cs` (`Mudar`: 1 recusa, 1 ternário de texto), `AlterarArtigo` 1, `NovaVersaoDocumento` 1, `ArquivarDocumento` 1 -> decide
- análogo no repositório: `PermissoesChamadoTests`, `IndicadoresCalculoTests` e `CargaValidacaoTests`, regras puras já provadas sem banco e presas por `ArquiteturaTests.Testes_de_regra_sem_banco`

Cost: 3 classes de domínio sem banco (`ChamadoDominioTests` 5 testes, `ArtigoDominioTests` 3, `DocumentoDominioTests` 3),
1 classe HTTP (`RecusasDoDominioTests` 3 testes), 3 testes novos no `RetratoTests` com 3 retratos, 5 no
`OrdemDasRecusasTests`, 14 regras no `ArquiteturaTests` e 4 scripts. Sem essas linhas, as 18 linhas da
tabela de transições ficam provadas só pelos caminhos que os testes HTTP de hoje atravessam, e um
`LembreteEm` ou um `AguardandoDesde` gravado diferente da base passa pela suíte inteira.

## Swept

- validation: C8 a C12 (cada validação continua na posição da base, agora que os validadores dos 8 pares recebem campos), C14 (o JSON só liga no `Entrada`, sem `usuario` nem `instituicao`); as recusas de cada campo seguem nos testes existentes (C1)
- failure modes: C22 (transição inexistente lança e não muda), C24, C25, C31, C32 (recusa de negócio vira 409 com o mesmo `detail`), C33 (número de versão inválido lança)
- idempotency: n/a - nenhuma gravação nova; a transferência dupla continua 201 e 409 com 1 chamado (C28) e as gravações condicionais do `Agendador` não mudam (C27)
- authorization: existing - `AgirNoChamado` com `PermissoesChamado` (404, 403, 409) sem mudança de forma (C26) e o filtro do `/admin` em `AdminRotas` (`RetratoTests.Admin_403_com_detail_nas_29_rotas`, C1)
- concurrency: C28 (`Xmin` sem setter público segue token de concorrência; numeração paralela e transferência dupla iguais)
- data lifecycle: C37 (nenhuma migração, modelo sem mudança pendente), C28 (append-only de eventos e mensagens pelo trigger)
- dependency failure: n/a - nenhuma chamada externa nova; o e-mail segue enfileirado em `Avisos` na mesma transação e as falhas do provedor de IA não mudam (C1)
- state transitions: C21, C22, C23 (tabela de transições, transições inexistentes, trios permitidos), C30, C20 (gravações iguais às da base)
- observability: n/a - nenhum log, métrica ou categoria muda nesta feature

## Handoff

Tamanho estimado pelo código que cada slice lê e escreve (`wc -c` em `HEAD` / 4; o que é escrito é
estimado). Contexto fixo de cada builder: `plan.md` (32.336 B), este `checks.md` (~55.000 B),
`references/build.md` (11.542 B) e `LESSONS.md` (9.712 B) = ~109 KB = ~27k.

- S1 lê `RetratoTests`, `OrdemDasRecusasTests`, `OneFactory`, `Balcao`, `Cenario`, `Semente`,
  `ChamadoFluxoTests`, `DocumentoTests` e os 20 arquivos de `api/` cujas cadeias e gravações C6 a C12
  prendem (131.495 B), e escreve 3 testes do `RetratoTests` (~24 KB), 5 do `OrdemDasRecusasTests`
  (~18 KB), `RecusasDoDominioTests` (~7 KB), os 3 retratos (~56 KB) e 2 scripts (~5 KB): 239 KB = ~60k
- S2 lê os casos de uso e auxiliares de `Acesso`, `Administracao`, `Assistente`, `Chamados` e `Conhecimento`
  sem os 10 arquivos que não mudam (`Assistente`, `Embeddings`, `Fontes`, `Conferencia`, `Pergunta`,
  `CsvMatriculas`, `Arquivos`, `Avisos`, `PermissoesChamado`, `Senha`: 34.841 B) mais `ArquiteturaTests`
  (113.762 + 25.933 B), e escreve ~41 records de resposta, 29 `Entrada`, os 9 `Shared` e 5 regras (~45 KB):
  185 KB = ~46k
- S3 lê os 9 handlers de ação, `AcoesChamado`, `Transferencia`, `DesativarUsuario`, `AgirNoChamado`,
  `PermissoesChamado`, `AcessoChamado`, `Avisos`, `IndicadoresTests`, `VisibilidadeTests`,
  `PermissoesChamadoTests` (69.833 B), e escreve `Chamado.cs`, os handlers, `ChamadoDominioTests` e 3
  regras (~50 KB): 120 KB = ~30k
- S4 lê `ArtigoRotas`, os 4 casos de artigo, `DocumentoRotas`, os 3 casos de documento, `Fontes`,
  `InstituicaoComando`, `Semente`, `AvaliarBuscaTests`, `ArtigoAdminTests` (58.421 B), e escreve
  `Artigo.cs`, `Documento.cs`, os handlers, 2 classes de domínio e 1 regra (~22 KB): 80 KB = ~20k
- S5 lê `Entidades.cs`, `OneDb.cs`, os 2 `.csproj`, `ArquiteturaTests`, `Agendador` (62.698 B), e escreve os
  24 arquivos de entidade, `Recusa.cs`, os `<Using>`, 5 regras e 2 scripts (~35 KB): 98 KB = ~25k
- Total: 60k + 46k + 30k + 20k + 25k = 181k, mais o contexto fixo 27k = 208k, acima do budget de 150k
- Corte, em slices inteiras e onde a superfície muda: **Lote 1** = S1 (`api.Tests` e retratos, com `api/`
  da base): 60k + 27k = 87k. **Lote 2** = S5, S3, S4 (`api/Dados` e os handlers que chamam as
  entidades, mais os testes de domínio): 25k + 30k + 20k = 75k + 27k = 102k. **Lote 3** = S2 (os
  contratos em todos os casos de uso, depois que as entidades assentaram, para não reescrever duas vezes os
  handlers de ação): 46k + 27k = 73k. Juntar os lotes 2 e 3 daria 121k + 27k, sem folga para a
  saída de build e de testes
- Mechanism: handoff em lotes sequenciais por subagente, só com o lote anterior verde — escolha do usuário em 02/11/2026 ("aprovado, pode escrever os checks e seguir com o build faça isso em subagentes"). Cada builder lê este `checks.md` e o diff do que já entrou, e acrescenta as 3 linhas abaixo ao terminar
- Feature base (`<base>`): `f0a7c9e` (o commit que congela `plan.md` e `checks.md`), no `main`
- e2e (C1): o container `api` do compose na porta 8080 é do builder da `interface-nova` e embute o `web/`
  dele; esta feature usa imagem e porta próprias. Num worktree limpo no commit sob teste (o `Dockerfile`
  compila o `web/` da árvore): `docker build -t one-dominio <worktree>`, depois `docker run` dessa imagem
  na porta 8082 com o mesmo ambiente do serviço `api` do compose (banco e Mailpit do compose), e
  `E2E_URL=http://localhost:8082 npm --prefix <worktree>/web run e2e`. Uma falha que venha de um commit
  `web/` da `interface-nova` é relatada, não corrigida aqui. Ao fim, o container `one-dominio` é parado e
  removido; o `api` da porta 8080 não é tocado

### Lote 1 (S1)

- Boundary: C3–C12 closed at 2900ddb (commits 2a2ba2e, 3f578ee, 2900ddb; `api/` igual a f0a7c9e). C1 e C2 verdes
  em 2900ddb e abertos até o último lote, porque cobrem todo commit da feature: `dotnet test api.Tests` 303/303
  (292 na base + 11 novos), Playwright 23/23 contra a imagem `one-dominio` de um worktree limpo em 3f578ee na
  porta 8082, `asserts_api.py f0a7c9e` 0 problema e `--autoteste` ok; `retratos_antes.py f0a7c9e` ok;
  `git diff --exit-code f0a7c9e HEAD -- api.Tests/Retratos/rotas.txt api.Tests/Retratos/erros.txt` vazio; os 13
  filtros de C3 a C12, C24, C25 e C31 executam 1 teste cada (L-002). Retratos: `sucessos.txt` 59 linhas
  (30.055 B), `importacao.txt` 1 linha (562 B), `gravacoes.txt` 24 linhas (15.576 B). Faltas injetadas e
  revertidas, mortas: `Repetidos` antes de `PapeisESetores` no `UsuarioRotas.Validar` (C10) e `DesativarUsuario`
  limpando `LembreteEm` (C6). Os testes HTTP de C24, C25 e C31 já estão em `RecusasDoDominioTests`; faltam as
  metades sem banco (`ChamadoDominioTests`, `ArtigoDominioTests`) no lote 2.
- Settled mid-build: (1) C6 G16 "`/cancelar` sem corpo": na base um POST sem `Content-Type` cai no fallback
  `/api/{**resto}` e responde 404 sem gravar nada; o retrato manda o JSON `null`, que liga `CancelarChamado.Corpo`
  nulo (o caminho `Corpo?.Motivo`) e grava a TRANSICAO com detalhe nulo. (2) C4: os retratos de sucesso e de
  gravação rodam num `OneFactory` novo por teste (banco próprio), para que ids fora de membro `id`/`*Id` (a
  lista `setores` do usuário) e os números saiam iguais em toda execução; nomes, CPFs, e-mails e matrículas são
  fixos (`Pessoa` troca o nome aleatório da `Semente` por `ExecuteUpdate`). (3) C4: a linha guarda a rota como
  modelo (`/api/chamados/{numero}/assumir`) e o ator como rótulo (`aluno`, `atendente`, `atendente-nota`, `admin`,
  `anonimo`); instantes viram a string `"instante"`, ids o número `0`, `ONE-<n>` vira `ONE-n` também dentro de
  textos. (4) C6: a linha é JSON com as colunas na ordem do check (`ResponsavelId`, `SetorId`, `CategoriaId` e
  `CategoriaOriginalId` com o nome), minutos inteiros relativos a `Relogio.GetUtcNow()`; o relógio não anda, então
  só `AguardandoDesde` de G7 sai diferente de 0 (-5760). (5) O lote 2 precisa manter compilando, sem editar,
  `RetratoTests`, `OrdemDasRecusasTests` e `RecusasDoDominioTests` (C7): eles leem `Chamado`, `MensagemChamado`,
  `EventoChamado`, `Anexo` e `VersaoArtigo` só por getters e pelos `DbSet` `MensagensChamado`, `EventosChamado`,
  `Anexos`, `VersoesArtigo`, `VersoesDocumento`; escrevem `Chamado` só por `ExecuteUpdate` (`AguardandoDesde`) e
  usam `Semente.Artigo`, `Balcao`, `Pdfs`, `Admin` e `Cenario.Resposta` como fixtures. (6) Ambiente: a primeira
  execução da suíte depois de recompilar deu 292 falhas em 1 ms cada e a seguinte, sem recompilar, 303/303
  (o DLL novo, como o aviso do Smart App Control prevê).
- Abandoned: nada.

### Lote 2 (S5, S3, S4)

- Boundary: C19 a C25, C27 a C41 fechados em e300265 (commits 7b1bfa6 e e300265); C26 fica aberto até o lote 3, porque
  `ArquiteturaTests.Pipeline_do_chamado_com_a_forma_da_base` exige `DetalheChamado.Montar` devolvendo `Task<DetalheChamado>`
  (o record é de S2; o filtro hoje executa 0 teste) e `Permissao_so_no_AgirNoChamado` já passa. C1 e C2 abertos até o último
  lote. `dotnet test api.Tests` 323/323 (303 + 12 de domínio + 8 regras), Playwright 27/27 contra a imagem `one-dominio` de
  um worktree limpo em e300265 na porta 8082 (container, imagem e worktree removidos), `arquitetura_intacta.py f0a7c9e`
  43 membros da base iguais (59 em HEAD), `migracao_vazia.py f0a7c9e` 0 arquivo, `ca1502_barra.sh` e `msg0005_barra.sh` ok,
  `dotnet build api -warnaserror:CA1502` 0 aviso, `git diff --exit-code f0a7c9e HEAD -- api/Agendador.cs
  api.Tests/Retratos/rotas.txt api.Tests/Retratos/erros.txt` vazio, os 3 testes de S1 e os 3 retratos de S1 iguais a
  3d6ee69. Os 46 outros filtros de C19 a C41 executam pelo menos 1 teste (L-002). `DocumentoDominioTests` entrou aqui junto
  com `ChamadoDominioTests` e `ArtigoDominioTests`. Faltas injetadas: nenhuma neste lote (as 18 linhas de C21 são
  comparadas coluna a coluna; `LembreteEm` fica pelas gravações G7 e G21 de C6, mortas no lote 1).
- Settled mid-build: (1) Landing 8 e 9 no `plan.md`: o laço de nomes do `OneDb` anda pelo nome simples do tipo, porque o nome
  de uma FK depende da ordem em que o modelo entrega os tipos e mover as classes para pastas a mudou (o `migrations add`
  acusou renomeação de constraints); com a ordem antiga `HasPendingModelChanges()` é falso sem migração (a migração
  temporária `TmpDiff` saiu vazia e foi removida com o snapshot restaurado). Formas de `Artigo.Criar`/`NovaVersao`,
  `Documento.Criar`/`NovaVersao`, e o número da versão conferido com `Any(v => v.Numero >= novo)` porque a regra da base
  `Ultima_versao_em_um_arquivo` proíbe `Max(x => x.Numero)` fora de `Conhecimento/`. (2) `DocumentoRotas.Versao` ficou pura;
  os trechos pendentes saem em `DocumentoRotas.Trechos`. (3) `Transferencia.Criar` grava o chamado e o evento CRIACAO num
  `SaveChanges` só (o evento entra pela navegação), dentro da mesma transação. (4) Chamado: `DevolverAFila` não passa por
  `Mudar` (não limpa `LembreteEm`, como a base); `ResponderComoAluno` em RESOLVIDO lança, o handler chama `Rejeitar`;
  `Assumir`, `ResponderComoEquipe`, `Resolver`, `Cancelar`, `Encaminhar`, `MarcarDuplicado` e `ResponderComoAluno` lançam fora
  de ABERTO/EM_ATENDIMENTO/AGUARDANDO_ALUNO (mais estreito que o mínimo de C22, igual à tabela de permissões); `Anotar`,
  `Reclassificar` e `DevolverAFila` aceitam também RESOLVIDO. (5) Fixtures: `IndicadoresTests` monta o chamado com
  `Chamado.Abrir` e fabrica estado, motivo e contadores por `db.Entry(...).Property(...).CurrentValue` (o chamado ganha o
  evento CRIACAO que antes não tinha; nenhuma asserção mudou); `VisibilidadeTests.Segunda_alteracao_simultanea_409` escreve
  por `db.Entry`; `Semente.Artigo` usa `Artigo.Criar` + `Ativar`/`Arquivar`; `ProvedorTests` e `AvaliarBuscaTests` usam as
  fábricas e os nomes sem `One.Api.Dados.` completo. (6) Os `Proof:` de C20, C28 e outros citam classes (`UsuarioAdminTests`,
  `EventosTests`, `ConcorrenciaTests`...) que existem com esse nome dentro dos arquivos `AdminTests.cs`/`VisibilidadeTests.cs`;
  todos os filtros casam. (7) `plan.md` Impact: 14 métodos novos no `ArquiteturaTests` (a conta é: C13 a C17, C19, C20, C26,
  C29, C34 a C38); 8 entraram neste lote, 5 de S2 e o `Pipeline_do_chamado_com_a_forma_da_base` ficam para o lote 3.
- Abandoned: nada.

### Lote 3 (S2)

- Boundary: C13 a C18 e C26 fechados em 3a4bf6c. `dotnet test api.Tests` 329/329 (323 + 6 de `ArquiteturaTests`:
  `Objetos_anonimos_so_fora_das_respostas`, `Entrada_por_caso_de_uso`, `Resposta_por_caso_de_uso`, `Shared_com_tres_usos_na_fatia`,
  `Nenhum_corpo_tipado_object`, `Pipeline_do_chamado_com_a_forma_da_base`; os 3 filtros de retrato e esses 6 executam 1 teste cada),
  `RetratoTests` verde com `rotas.txt`, `erros.txt`, `sucessos.txt`, `importacao.txt`, `gravacoes.txt` sem diff, `arquitetura_intacta.py f0a7c9e`
  0 problema, `migracao_vazia.py f0a7c9e` 0 arquivo, `ca1502_barra.sh` e `msg0005_barra.sh` ok, `dotnet build api -warnaserror:CA1502` limpo,
  `retratos_antes.py f0a7c9e` ok, AD-024 `active`. Playwright 28/29 contra a imagem `one-dominio` de um worktree limpo em 3a4bf6c (container,
  imagem e worktree removidos): a falha é `arranjo.spec.ts:377` (`arranjo Artigos e Documentos`, os campos de validade na mesma linha), um
  teste de layout do `web/` da `interface-nova` (commit 5cc2ac2), sem relação com JSON. **C1 e C2 ficam abertos** por duas causas que o lote
  não consegue resolver sem reescrever histórico ou renegociar: (a) C2: `asserts_api.py f0a7c9e` acusa 2 problemas. (1) A linha de `Assert`
  `var montar = Assert.Single(typeof(One.Api.Chamados.DetalheChamado).GetMethods(), m => m.Name == "Montar");` (de `Handler_sem_HttpContext`,
  já na base) mudou para `One.Api.Chamados.Shared.DetalheChamado`, porque C15/C16 e o Landing mandam o record para `Chamados/Shared`; o
  predicado é o mesmo. Pede ruling do usuário: aceitar a mudança de qualificador ou deixar C2 sem essa linha. (2) O commit 5cc2ac2
  (`feat(web)` da `interface-nova`) levou junto o `git mv api/Chamados/DetalheChamado.cs api/Chamados/Shared/DetalheChamado.cs` que este
  lote tinha no índice (índice compartilhado entre os dois builders), e o script acusa "toca api/ e web/". É só um rename de 0 linhas, e
  não se desfaz sem reescrever commit. (b) C1: o e2e tem 1 falha de layout do `web/`, que é da `interface-nova`.
- Settled mid-build: (1) Landing 10 e 11 no `plan.md` (helpers genéricos dos cadastros com `validar`/`aplicar` fechando sobre o `Entrada`;
  `Transferido<TResposta>`; `[property: JsonPropertyName("resposta")]` no `Resposta` de `NovaConversa`/`NovaMensagem`; `De(OneDb, ...)` assíncrono
  nos `Shared` de usuário, documento e artigo). (2) O erro de linha da importação sai de `ErroCsv(Linha, Motivo)` direto, sem a projeção anônima
  `{ linha, motivo }`: mesmos bytes (`importacao.txt` igual). (3) `ListarChamados.Resposta` é o item de "meus chamados"; a fila do atendente
  tem `RespostaDaFila` (categoria, responsável, dias), porque o JSON tem duas formas. (4) `DetalheChamado` declara `TranscricaoDaEquipe`
  (com `Fontes`, nulo quando a mensagem não cita) e `TranscricaoDoAluno` (sem a chave) na propriedade `IReadOnlyList<object> Transcricao`,
  a única exceção de C17; o teste ignora os membros gerados do record (`Equals(object)`) e os tipos gerados pelo compilador. (5) O teste de
  C15 conta só os `Resposta` aninhados em mensagens (o `Embeddings` já tinha um `Resposta` do provedor). (6) Em `ArquiteturaTests` mudou
  só o qualificador citado em (a)(1); nenhum outro teste existente foi editado. (7) O erro de `dotnet build` na primeira rodada veio de
  `OneDb` sem `using` em `UsuarioResposta`; nada de ambiente.
- Abandoned: nada.


### Depois do lote 3 (coordenador)

- **Decisão do usuário em 02/11/2026 sobre o C2:** aceita a troca do qualificador em
  `ArquiteturaTests.Handler_sem_HttpContext` (`One.Api.Chamados.DetalheChamado` →
  `One.Api.Chamados.Shared.DetalheChamado`), consequência da door de `Shared` (resposta usada por 10 casos). A
  afirmação é a mesma; `asserts_api.py f0a7c9e` acusa só esta linha e o Verifier confere que nada mais mudou.
- **Commit misto `5cc2ac2`:** o construtor da `interface-nova` levou no mesmo commit o `git mv` de
  `api/Chamados/DetalheChamado.cs` para `Shared/` que estava no índice compartilhado. É só a renomeação, sem
  mudança de conteúdo; fica como está (sem reescrever histórico) e entra no intervalo desta feature.
- **C1:** o e2e deu 28/29 em `3a4bf6c`; a falha é `arranjo.spec.ts:377`, teste de arranjo da `interface-nova`
  (S7) ainda sem a reconstrução do contêiner do lote dela. A verificação desta feature espera o lote 3 da
  `interface-nova` fechar.
- **Decisão do usuário em 02/11/2026 sobre o C27 (verificação rodada 1):** aceita a diferença em
  `api/Agendador.cs` que vem só da remoção de comentários pedida pelo usuário (`0960b70`, 11 linhas de comentário,
  nenhuma linha de código). O C27 vale para o arquivo sem comentários: o código do agendador continua igual ao da base.
