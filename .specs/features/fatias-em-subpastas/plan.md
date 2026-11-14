# Fatias em subpastas: um assunto por pasta dentro de cada fatia

## Problem

O `One.Api` e o `web/` já estão em fatias verticais (AD-017, AD-019), mas dentro de cada fatia os arquivos
ficam todos na mesma pasta. Contagem de hoje (`.cs` direto na pasta, sem contar `bin`/`obj`):

| Pasta | Arquivos |
| --- | --- |
| `One.Api/Chamados/` | 43 |
| `One.Api/Administracao/` | 41 |
| `One.Api/Assistente/` | 27 |
| `One.Api/Instituicoes/` | 25 |
| `One.Api/Conhecimento/` | 21 |
| `web/src/administracao/` | 52 (24 testes e 28 telas e módulos) |

Quem abre `Chamados/` vê `AtivarPush.cs`, `ResolverChamado.cs`, `TempoRealHub.cs` e `FecharResolvidos.cs`
lado a lado e precisa conhecer o sistema para saber qual pertence a qual assunto. Quem paga: a dupla que
adiciona o próximo caso de uso (copia a forma que existe: mais um arquivo na pasta de 43) e a banca de
20/11, que avalia a arquitetura. Não há falha em produção: não há produção.

Quando isto estiver pronto, para o aluno, o atendente e o administrador nada muda: nenhuma rota, status,
corpo JSON, tabela, migration ou chave de configuração.

## Flow

Reusa o que já existe: o `ArquiteturaTests` (regras de pasta, namespace e um arquivo por caso de uso), os
retratos de rotas e de JSON do `refatoracao-solid`/`vertical-slice-completa` como prova de que nada mudou
por fora, o `estrutura.test.ts` do `web/` e o `asserts_preservados.py`.

1. `AD-056` (door 1) entra no `STATE.md` e o `AGENTS.md` ganha a regra de uma subpasta por assunto, antes de qualquer arquivo se mover
2. `ArquiteturaTests` (exists) recebe a regra nova: uma subpasta por fatia, nomes da lista fechada (door 3), teto de arquivos por pasta; os testes ficam vermelhos pela pasta, nunca por afrouxar regra
3. cada arquivo de `One.Api/<Fatia>/` (exists) é movido com `git mv` para `One.Api/<Fatia>/<Subpasta>/` e troca só a linha `namespace` (door 1)
4. `<Fatia>Extensoes` (exists, `AddChamados`, `MapChamados` etc.) e os `using` dos arquivos e dos testes de `One.Api.Tests/` (exists) passam a importar o namespace da subpasta
5. cada arquivo de `web/src/administracao/` (exists) é movido para `web/src/administracao/<subpasta>/` (door 4) e os imports relativos ganham um nível (`../ui/button` vira `../../ui/button`)
6. out: `dotnet test One.Api.Tests`, `npm --prefix web test` e o e2e dão o mesmo resultado de antes, e o retrato de rotas continua igual linha a linha

## Impact

| Front | What changes |
| --- | --- |
| domain | novo termo: **subpasta** - a única pasta de um assunto dentro de uma fatia (`One.Api/Chamados/Push/`); a **fatia** continua sendo a pasta de primeiro nível (AD-017) |
| domain | termo existente: o namespace `One.Api.<Fatia>` deixa de ser o de todos os arquivos da fatia. Quem ramifica nele hoje: `ArquiteturaTests` (`Um_arquivo_por_caso_de_uso` conta `t.Namespace == "One.Api.<Fatia>"`, `ArquivoDo` monta o caminho do namespace, `Dez_acoes_do_chamado` exige `t.Namespace == "One.Api.Chamados"`, `Referencias_entre_fatias` casa `One.Api.<Fatia>`, `Fatias_do_api`, a lista de `IgnoreQueryFilters` por caminho e os caminhos fixos como `Chamados/AbrirChamado.cs`) |
| domain | 30 arquivos de `One.Api.Tests/` têm `using One.Api.<Fatia>;` e passam a precisar do `using` da subpasta |
| domain | `Mcp/` (exists) referencia `Chamados`, `Assistente`, `Conhecimento` e `Indicadores`: ganha `using` da subpasta onde o tipo foi parar |
| stored data | nada a migrar: nenhuma entidade de `Dados/` se move, o `OneDbModelSnapshot.cs` não muda e nenhuma migration nasce; `dotnet ef migrations has-pending-model-changes` continua limpo |
| tooling | `crapper`, `dryer` (AD-018) e o `asserts_preservados.py` leem caminhos: a prova roda os três depois da mudança |

## Relations

`None - no stored-data shape change`

## Surface

`None - nothing consumed outside`

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. O namespace segue a pasta até a subpasta | `One.Api/Chamados/Push/AtivarPush.cs` declara `namespace One.Api.Chamados.Push;`; `Namespace_igual_a_pasta` continua valendo sem exceção | namespace fica `One.Api.Chamados` com a subpasta só no disco: contradiz a regra que o dono adotou no AD-040 (`Namespace_igual_a_pasta`) e a IDE0130 passaria a acusar cada arquivo; o diff seria menor (nenhum `using` novo), mas a pasta deixaria de existir para o compilador |
| 2. Um nível só | `One.Api/<Fatia>/<Subpasta>/Arquivo.cs`; nada abaixo disso | aninhamento livre: `Referencias_entre_fatias` e `ArquivoDo` tiram a fatia do primeiro segmento e passariam a depender de profundidade variável; o maior grupo tem 12 arquivos e não precisa de segundo nível |
| 3. Lista fechada de nomes de subpasta | Chamados: `Acoes`, `Permissao`, `Consulta`, `Push`, `TempoReal`, `Tarefas` · Administracao: `Categorias`, `Cursos`, `Setores`, `Usuarios`, `RespostasProntas`, `Fluxos`, `Matriculas`, `Integracoes` · Assistente: `Conversas`, `Respostas`, `Busca` · Conhecimento: `Artigos`, `Documentos` · Instituicoes: `Aparencia`, `Carga`, `Plataforma`; o nome vira um segmento de namespace que as próximas features copiam | nomes no singular iguais a tipos existentes (`Conversa`, `Assistente`, `Resposta`): o tipo `Conversa` de `Dados` deixa de resolver dentro de `One.Api.Assistente.Conversa` (o segmento do namespace sombreia o tipo) |
| 4. Mesma forma no `web/` | `web/src/administracao/<subpasta>/Tela.tsx`, uma subpasta por assunto, o teste da tela na mesma subpasta, módulos compartilhados da fatia (`comum.tsx`, `avisoAoFechar.ts`) na raiz da fatia, import de `ui` como `../../ui/button`; subpastas: `aparencia`, `fluxos`, `cadastros`, `integracoes`, `instituicoes` | criar novas fatias no `web/` (`fluxos`, `aparencia`): `Fatias` em `estrutura.test.ts` é a lista fechada de 6 do AD-017 e as rotas de `App.tsx` mapeiam telas para ela |
| 4a. Módulo usado por duas subpastas do web (emenda E1, 13/11) | fica na raiz da fatia: `web/src/administracao/IconesDoDestino.ts` e `web/src/administracao/LinhasDosCadastros.tsx`; arquivo de produto de uma subpasta não importa de outra subpasta | deixar em quem mais usa, com import cruzado `../fluxos/` e `../cadastros/`: cria dependência nos dois sentidos entre as subpastas |

- Nada mais nesta mudança é difícil de desfazer: mover arquivo é reversível por `git mv` de volta

### Mapa das subpastas (membros por nome; o que não está listado fica na raiz da fatia)

| Fatia | Subpasta (arquivos) | Membros |
| --- | --- | --- |
| Chamados | `Acoes` (12) | as 10 ações (`AbrirChamado`, `AssumirChamado`, `CancelarChamado`, `ConfirmarChamado`, `EncaminharChamado`, `MarcarDuplicado`, `ReclassificarChamado`, `RejeitarChamado`, `ResolverChamado`, `ResponderChamado`), `SubirChamado`, `Transferencia` |
| Chamados | `Permissao` (4) | `AcoesChamado`, `AgirNoChamado`, `AcessoChamado`, `PermissoesChamado` |
| Chamados | `Consulta` (9) | `ListarChamados`, `VerChamado`, `DetalheChamado`, `ConsultasDoDetalhe`, `ConsultasDeFluxo`, `ChamadoDoUsuario`, `BaixarAnexo`, `AnexoDeFormulario`, `RespostasProntasDoSetor` |
| Chamados | `Push` (6) | `AtivarPush`, `DesativarPush`, `ConfigPush`, `VerChavePush`, `PushComando`, `PushEnviador` |
| Chamados | `TempoReal` (4) | `TempoRealGrupos`, `TempoRealHub`, `AvisarMudanca`, `ColetaDeMudancas` |
| Chamados | `Tarefas` (6) | `FecharResolvidos`, `LembrarAguardando`, `ResolverSemResposta`, `SubirPorPrazo`, `EnviarEmails`, `EnviarPushes` |
| Chamados | raiz (2) | `Avisos`, `ChamadosExtensoes` |
| Administracao | `Categorias` (4) | `CriarCategoria`, `AlterarCategoria`, `ListarCategorias`, `CategoriaResposta` |
| Administracao | `Cursos` (5) | `CriarCurso`, `AlterarCurso`, `ListarCursos`, `CursoResposta`, `ValidacaoDeCurso` |
| Administracao | `Setores` (5) | `CriarSetor`, `AlterarSetor`, `ListarSetores`, `SetorResposta`, `ValidacaoDeSetor` |
| Administracao | `Usuarios` (6) | `CriarUsuario`, `AlterarUsuario`, `DesativarUsuario`, `ListarUsuarios`, `UsuarioResposta`, `ValidacaoDeUsuario` |
| Administracao | `RespostasProntas` (4) | `CriarRespostaPronta`, `AlterarRespostaPronta`, `ListarRespostasProntas`, `RespostaProntaResposta` |
| Administracao | `Fluxos` (7) | `CriarFluxo`, `SalvarRascunho`, `DescartarRascunho`, `PublicarFluxo`, `SimularFluxo`, `ListarFluxos`, `FluxoResposta` |
| Administracao | `Matriculas` (2) | `ImportarMatriculas`, `CsvMatriculas` |
| Administracao | `Integracoes` (6) | `VerMoodle`, `AlterarMoodle`, `MoodleDados`, `VerMcp`, `CriarTokenMcp`, `RevogarTokenMcp` |
| Administracao | raiz (2) | `AdministracaoExtensoes`, `ErrosDeAdmin` |
| Assistente | `Conversas` (12) | `NovaConversa`, `NovaMensagem`, `EnvioDeMensagem`, `VerConversa`, `VerDestino`, `EncerrarConversa`, `AvaliarConversa`, `TransferirConversa`, `ConversaDoAluno`, `BaixarAnexoConversa`, `AtendimentoDireto`, `AbandonarConversas` |
| Assistente | `Respostas` (10) | `Assistente`, `MontarPrompt`, `ChamarProvedor`, `CorpoDoProvedor`, `SaidaModelo`, `Conferencia`, `ConferirResposta`, `Pergunta`, `Textos`, `LerAnexosDaJanela` |
| Assistente | `Busca` (4) | `Embeddings`, `IndexarTrechos`, `Trecho`, `ComandoAvaliarBusca` |
| Assistente | raiz (1) | `AssistenteExtensoes` |
| Conhecimento | `Artigos` (9) | `CriarArtigo`, `AlterarArtigo`, `ArquivarArtigo`, `AtivarArtigo`, `ListarArtigos`, `ArtigoComVersoes`, `ArtigoResposta`, `ValidacaoDeArtigo`, `VerVersaoArtigo` |
| Conhecimento | `Documentos` (9) | `CriarDocumento`, `ArquivarDocumento`, `NovaVersaoDocumento`, `BaixarVersaoDocumento`, `ListarDocumentos`, `DocumentoComVersoes`, `DocumentoResposta`, `DivisorDeTexto`, `LeitorDePdf` |
| Conhecimento | raiz (3) | `BuscarFontes`, `CitacoesDeFontes`, `ConhecimentoExtensoes` |
| Instituicoes | `Aparencia` (7) | `AlterarAparencia`, `VerAparencia`, `AparenciaDados`, `ContrasteDaCor`, `EnviarImagemInstituicao`, `BaixarImagemInstituicao`, `RemoverImagemInstituicao` |
| Instituicoes | `Carga` (7) | `CargaInicial`, `CargaValidacao`, `ComandoCarga`, `ContratosDaCarga`, `ImportarCargaInstituicao`, `ManifestoInstituicao`, `ArquivoDeComando` |
| Instituicoes | `Plataforma` (10) | `CriarInstituicao`, `Criacao`, `ComandoCriar`, `DesativarInstituicao`, `ReativarInstituicao`, `ReenviarAcesso`, `ListarInstituicoes`, `ComandoOperador`, `InstituicaoComando`, `ErrosDaPlataforma` |
| Instituicoes | raiz (1) | `InstituicoesExtensoes` |
| web `administracao` | `aparencia`, `fluxos`, `cadastros`, `integracoes`, `instituicoes` | cada tela com os módulos que só ela usa e os testes que abrem só ela; `comum.tsx` e `avisoAoFechar.ts` ficam na raiz da fatia; a atribuição arquivo a arquivo sai do `import` de cada um e vai para o `checks.md` |

`Acesso` (17), `Mcp` (5) e `Indicadores` (3) ficam planas: abaixo de 20 arquivos não há assunto a separar.

## Criteria

### S1: A regra nova fica escrita e testada antes de mover qualquer arquivo (P1)

O AD, o `AGENTS.md` e o `ArquiteturaTests` dizem como a fatia se divide; os testes ficam vermelhos até os arquivos irem para o lugar.

**Acceptance Criteria**

1. The system SHALL record the folder rule as `AD-056` in `.specs/STATE.md` (next number after `git pull`), superseding the "namespace `One.Api.<Fatia>` for all files of the slice" reading of AD-017, and the `AGENTS.md` section "Arquitetura da API" SHALL name the layout `One.Api/<Fatia>/<Subpasta>/`
2. WHEN `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests"` runs THEN the system SHALL fail if any `.cs` under `Chamados`, `Administracao`, `Assistente`, `Conhecimento` or `Instituicoes` sits deeper than one subfolder, if a subfolder name is outside the list in door 3, if a subfolder holds more than 12 `.cs` files, or if the slice root holds more than 4
3. IF a `.cs` file in a subfolder declares a namespace other than `One.Api.<Fatia>.<Subpasta>` THEN the system SHALL fail `Namespace_igual_a_pasta`
4. The system SHALL keep `Acesso`, `Mcp` and `Indicadores` flat, pinned by a list in `ArquiteturaTests`

### S2: `Chamados` em 6 subpastas (P1)

`One.Api/Chamados/` passa de 43 arquivos a 2 na raiz e 6 subpastas conforme o mapa.

**Acceptance Criteria**

5. WHEN the move ends THEN the system SHALL hold the 43 files of `Chamados` as 2 in the slice root plus `Acoes` 12, `Permissao` 4, `Consulta` 9, `Push` 6, `TempoReal` 4 and `Tarefas` 6
6. The system SHALL keep the 10 actions of the ticket in `Chamados/Acoes/` with namespace `One.Api.Chamados.Acoes`, and the `Dez_acoes_do_chamado` check SHALL read that path
7. The system SHALL keep the nine `IgnoreQueryFilters` users (`ApagarLancamentos`, `AbandonarConversas`, `FecharResolvidos`, `ResolverSemResposta`, `LembrarAguardando`, `SubirPorPrazo`, `EnviarEmails`, `EnviarPushes`, `IndexarTrechos`) as the exact allow-list of `IgnoreQueryFilters_so_no_agendador_e_no_comando`, with their new paths

### S3: `Administracao` em 8 subpastas (P1)

**Acceptance Criteria**

8. WHEN the move ends THEN the system SHALL hold the 41 files of `Administracao` as 2 in the slice root plus `Categorias` 4, `Cursos` 5, `Setores` 5, `Usuarios` 6, `RespostasProntas` 4, `Fluxos` 7, `Matriculas` 2 and `Integracoes` 6
9. The system SHALL keep the matrículas import route mapped in its own file, so `Importacao_em_arquivo_proprio` finds one file under `Administracao/Matriculas/`

### S4: `Assistente`, `Conhecimento` e `Instituicoes` em subpastas (P2)

**Acceptance Criteria**

10. WHEN the move ends THEN the system SHALL hold `Assistente` as 1 in the root plus `Conversas` 12, `Respostas` 10 and `Busca` 4
11. WHEN the move ends THEN the system SHALL hold `Conhecimento` as 3 in the root plus `Artigos` 9 and `Documentos` 9
12. WHEN the move ends THEN the system SHALL hold `Instituicoes` as 1 in the root plus `Aparencia` 7, `Carga` 7 and `Plataforma` 10

### S5: `web/src/administracao/` em 5 subpastas (P2)

**Acceptance Criteria**

13. WHEN the move ends THEN the system SHALL hold the 52 files of `web/src/administracao/` as `aparencia/`, `fluxos/`, `cadastros/`, `integracoes/`, `instituicoes/` and the shared modules (`comum.tsx`, `avisoAoFechar.ts`) in the slice root, with no `.tsx`/`.ts` file under `web/src/administracao/` deeper than one subfolder
14. The system SHALL keep each test file in the same subfolder as the screen it opens, and `estrutura.test.ts` SHALL still pass with the same 6 slices and the same `Fatias` list
15. IF a file under `web/src/administracao/<subpasta>/` imports `ui/`, `api`, `acao` or another root module THEN the system SHALL use the relative path with two levels (`../../ui/button`), and no `@/` alias SHALL appear outside `web/src/ui/`

### S6: Nada muda por fora (P1)

**Acceptance Criteria**

16. The system SHALL keep routes, statuses, JSON bodies, ProblemDetails, tables, migrations and configuration keys unchanged: the route snapshot test passes line by line, the response snapshots pass, and `dotnet ef migrations has-pending-model-changes --project One.Api` exits 0 with no new file under `One.Api/Dados/Migracoes/`
17. WHEN `dotnet test One.Api.Tests` runs at the last commit THEN the system SHALL pass every test that passes at the base, none skipped or deleted
18. The system SHALL change in `ArquiteturaTests` only path and namespace strings and the new rule of S1: no `Assert` of the base is removed or weakened (`asserts_preservados.py` reviewed line by line for the file)
19. WHEN `npm --prefix web test`, `npm --prefix web run coverage` and the gates of AD-018 (`crapper` below CRAP 10, `dryer` with no candidate at 0.8) run THEN the system SHALL exit 0, and `npm --prefix web run e2e` SHALL pass the same specs as the base

**Independent test:** `Get-ChildItem One.Api/Chamados -File` lista 2 arquivos; `dotnet test One.Api.Tests` e `npm --prefix web test` passam; o retrato de rotas é o mesmo.

## Out of scope

| Excluded | Why |
| --- | --- |
| Dividir `One.Api/Dados/Mapeamento/` (34 arquivos) por agregado | é código compartilhado (AD-017), não fatia; muda `Dados/<Agregado>` e os caminhos citados no `ArquiteturaTests`. Vale uma feature própria |
| Mexer em `One.Api/Dados/Migracoes/` | regra do `AGENTS.md`: migration aplicada não se altera |
| Dividir `Acesso`, `Mcp`, `Indicadores`, nem `web/src/chamados` (17) e `web/src/assistente` (15) | abaixo de 20 arquivos não há assunto claro a separar |
| Renomear tipos, rotas ou arquivos, ou mudar comportamento | é só mover e ajustar `namespace`/`using`/imports; renomear é outro risco |
| Mover testes de `One.Api.Tests/` para subpastas | os testes ficam planos como hoje; só os `using` mudam |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quais pastas "jogadas" o pedido cobre | as 5 fatias do `One.Api` com 20 ou mais arquivos e `web/src/administracao/` (52) | são as pastas medidas hoje acima do limite; o pedido não nomeou uma | n |
| Namespace acompanha a subpasta (door 1) | sim, `One.Api.<Fatia>.<Subpasta>` | `Namespace_igual_a_pasta` já é regra do AD-040; manter o namespace da fatia exigiria excepcionar a regra | n |
| Teto de arquivos | 12 por subpasta, 4 na raiz da fatia | o maior grupo do mapa tem 12 e a raiz mais cheia tem 3; o teste impede a pasta de voltar a crescer sem decisão | n |
| Atribuição arquivo a arquivo | o mapa vale; um arquivo que o compilador mostre pertencer a outra subpasta troca de lugar no diff, sem mudar a lista de nomes (door 3) | mover é reversível; só os nomes das pastas são porta | n |
| Commits | direto na `main`, um commit por fatia (move + ajuste de namespace e `using`), `git pull` antes de começar (AD-043) | regra do `AGENTS.md`; o `push` só com "ok" do humano | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `web/src/administracao/*` | celular 360×780 | n/a - nenhuma tela muda de aparência, só o arquivo muda de pasta; os mesmos e2e das telas tocadas passam (AC 19) |
| screen `web/src/administracao/*` | celular deitado 844×390 | n/a - nenhum layout muda, só o caminho do arquivo |
| screen `web/src/administracao/*` | teclado aberto | n/a - nenhum formulário muda, só o caminho do arquivo |
| screen `web/src/administracao/*` | toque | n/a - nenhum alvo de toque muda, só o caminho do arquivo |
| screen `web/src/administracao/*` | empty, loading, error e unauthorised | n/a - nenhum estado muda, os testes existentes seguem verdes (AC 17, 19) |
| API `One.Api/*` | error shape and codes | AC 16 |
| all `One.Api` routes | versioning, rate limits | n/a - nenhuma rota é criada nem alterada |

## Sources

- Pedido do dono (Alfredo): separar as pastas seguindo o padrão vertical slice, pois hoje há pastas com vários arquivos jogados
- AD-017, AD-019, AD-040, AD-043, AD-054 do `.specs/STATE.md` - fatias, um arquivo por caso de uso, `Namespace_igual_a_pasta`, commits na `main`, `Add<Fatia>`/`Map<Fatia>` por fatia
