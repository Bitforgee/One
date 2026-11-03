# Tempo real com SignalR - checks

Profile: standard
Plan: `.specs/features/tempo-real-signalr/plan.md`

51 checks em 4 slices (S0 transversal, S1 a S3 do plano) · 4 one-way doors · 0 perguntas abertas, 3 decisões de construção registradas no `## Handoff`

**Como as provas rodam.** As mesmas ferramentas das features anteriores:

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `WebApplicationFactory<Program>` (`OneFactory`) e `Microsoft.AspNetCore.SignalR.Client` (só no `api.Tests`, door 2) | `docker compose up -d postgres mailpit` |
| `web/` | Vitest (`npx vitest run`, filtro `-t`) com `@microsoft/signalr` trocado por uma conexão falsa no `setup.ts` | nenhum |
| `web/` e2e | Playwright (`npm --prefix web run e2e`) com `E2E_URL` | imagem e porta próprias desta feature (8085, ver `## Handoff`); o `api` da 8080 não é tocado |
| build do `api/` | `dotnet build api -warnaserror:CA1502` | nenhum |
| scripts | `python` e `bash` (Git Bash) na raiz | nenhum |

Todos os comandos rodam na raiz `D:\one-system`. `<base>` é o commit que congela `plan.md` e este
`checks.md`, gravado no `## Handoff`. Cada prova nomeia um teste ou um comando, e o nome é o contrato com
o construtor: classe ou método citado aqui que não existe em `<base>` é criado com exatamente esse nome.
Classes novas no `api.Tests`: `TempoRealEntradaTests` (cliente .NET contra o hub real, S1),
`AvisarMudancaTests` (o interceptador com um `IHubContext` gravador no lugar do real, S2) e
`TempoRealAvisosTests` (cliente .NET contra a API, S2). Métodos novos em `ArquiteturaTests`: 4. Arquivos
novos no `web/src`: `tempo-real.ts`, `tempo-real.test.ts`, `chamados/tempoReal.test.tsx`,
`acesso/tempoReal.test.tsx`. Um filtro que não seleciona nenhum teste sai com código 0 e é prova falha, não
verde (L-002): o construtor confere no TRX do xUnit e na saída do Vitest e do Playwright que cada filtro
desta lista executa pelo menos 1 teste, e que nenhum nome de método novo é prefixo de outro. Todo teste novo
é citado na linha `Proof:` do seu check (L-022). Números e rotas escritos aqui saíram do código em `HEAD`
(L-021): 61 linhas em `rotas.txt`, 17 caminhos que gravam chamado, 5 estados de `HubConnectionState`,
4 rotas de conversa que não geram chamado. O `Impact` do plano fala em "~40 pontos" de `SaveChangesAsync`;
o código tem 35 linhas com a chamada, e o construtor corrige o número no `Impact` (seção mantida
verdadeira).

Sem tela nova e sem arranjo novo: as regras de largura e de texto visível (L-026 a L-030, L-032) não se
aplicam. A mutação está suspensa (AD-025): nenhum check de `mutator` aqui, e nenhum construtor ou Verifier
roda a ferramenta.

## Checks

### S0 - Rede de segurança (vale para todo commit da feature) · 0 files · 0 KB · ~3k

**C1** - [x] As três suítes inteiras terminam sem falha e sem teste removido: `api.Tests`, Vitest e Playwright contra a imagem própria desta feature (porta 8085); a contagem de cada uma vai para o `## Handoff`
Proof: `dotnet test api.Tests`
Proof: `cd web && npx vitest run`
Proof: `E2E_URL=http://localhost:8085 npm --prefix web run e2e`

**C2** - [x] Entre `<base>` e `HEAD` nenhum arquivo de `api.Tests`, `web/src` ou `web/e2e` é apagado e nenhuma linha adicionada traz `Skip =`, `.skip(` nem `.only(`
Proof: `test -z "$(git diff --diff-filter=D --name-only <base> HEAD -- api.Tests web/src web/e2e)"`
Proof: `! git diff <base> HEAD -- api.Tests web/src web/e2e | grep -E '^\+.*(Skip *=|\.skip\(|\.only\()'`

**C3** - [x] A tabela de rotas da base segue: as 61 linhas de `rotas.txt` ficam sem nenhuma linha removida ou alterada, toda linha acrescentada é do prefixo `/api/tempo-real` com `anonimo=False autorizacao=True`, a linha `POST /api/tempo-real/negotiate` existe, e `Tabela_de_rotas_igual_a_da_base` passa (os totais dentro dele sobem só pelo número de linhas do hub, nenhum outro valor muda) (AC 1, AC 2, Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_igual_a_da_base"`
Proof: `test "$(git diff <base> HEAD -- api.Tests/Retratos/rotas.txt | grep -c '^-[^-]')" = 0`
Proof: `! git diff <base> HEAD -- api.Tests/Retratos/rotas.txt | grep '^+[^+]' | grep -qv '/api/tempo-real'`
Proof: `! git diff <base> HEAD -- api.Tests/Retratos/rotas.txt | grep '^+[^+]' | grep -qv 'anonimo=False autorizacao=True'`
Proof: `git diff <base> HEAD -- api.Tests/Retratos/rotas.txt | grep -q '^+POST /api/tempo-real/negotiate '`

**C4** - [x] Os outros quatro retratos da base não mudam: `erros.txt`, `sucessos.txt`, `importacao.txt` e `gravacoes.txt` iguais byte a byte, e os quatro testes que os comparam passam, de modo que o interceptador não acrescenta nem uma gravação (AC 8, AC 13)
Proof: `git diff --exit-code <base> HEAD -- api.Tests/Retratos/erros.txt api.Tests/Retratos/sucessos.txt api.Tests/Retratos/importacao.txt api.Tests/Retratos/gravacoes.txt`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_erro_iguais_aos_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_sucesso_iguais_aos_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Erros_da_importacao_iguais_aos_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Gravacoes_do_chamado_iguais_as_da_base"`

### S1 - Só entra no grupo quem pode ver o chamado ou a fila (P1) · ~21 files · ~176 KB · ~44k

**C5** - [x] `POST /api/tempo-real/negotiate` responde `401` sem cookie `one.auth`, com cookie de usuário inativo e com cookie de instituição inativa (3 casos), e `WS /api/tempo-real` responde `401` sem cookie; nenhuma conexão abre (AC 1, Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.Negociar_recusa_401_sem_cookie_e_com_sessao_inativa"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.WebSocket_sem_cookie_responde_401"`

**C6** - [x] Com o cookie de um usuário com `DeveTrocarSenha`, o `negotiate` e o `WS /api/tempo-real` respondem `403` com `detail` "Troque a senha para continuar." (o texto das demais rotas de `/api`) (AC 2, Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.Negociar_com_troca_de_senha_pendente_responde_403"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.WebSocket_com_troca_de_senha_pendente_responde_403"`

**C7** - [x] Com cookie válido o `negotiate` responde `200` com um `connectionId` e o `WS /api/tempo-real` completa o upgrade com `101` (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.Negociar_com_cookie_valido_responde_200"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.WebSocket_com_cookie_valido_responde_101"`

**C8** - [x] `EntrarNoChamado(numero)` do solicitante e do atendente de um setor do chamado conclui sem erro e põe a conexão em `chamado:{instituicaoId}:{numero}` (a sonda enviada pelo `IHubContext` a esse nome exato chega às 2 conexões); entrar duas vezes no mesmo chamado entrega a sonda uma vez só (AC 3, door 3, Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.EntrarNoChamado_entra_no_grupo_do_solicitante_e_do_atendente_do_setor"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.EntrarNoChamado_duas_vezes_entrega_um_aviso_so"`

**C9** - [x] `EntrarNoChamado` lança `HubException` "Chamado não encontrado." (o mesmo `detail` do `GET /api/chamados/{numero}` para o mesmo caso) e não põe a conexão em grupo algum nos 6 casos: número inexistente, `ONE-1` de outra instituição, chamado de outro aluno, atendente de outro setor, administrador sem setor do chamado, número vazio (AC 4, door 3, Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.EntrarNoChamado_recusa_com_Chamado_nao_encontrado"`

**C10** - [x] `EntrarNaFila()` de um atendente de 2 setores conclui sem erro e põe a conexão em `fila:{instituicaoId}:{setorId}` dos 2 setores e de nenhum terceiro (AC 5, door 3, Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.EntrarNaFila_entra_na_fila_de_cada_setor_do_atendente"`

**C11** - [x] `EntrarNaFila()` de um usuário só `ALUNO` e de um só `ADMINISTRADOR` lança `HubException` "A fila é só para atendentes." e não põe a conexão em grupo algum (AC 6, Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.EntrarNaFila_recusa_quem_nao_e_atendente"`

**C12** - [x] Os 3 métodos (`EntrarNoChamado`, `SairDoChamado`, `EntrarNaFila`) lançam `HubException` "Sessão inválida." com o usuário desativado e com a instituição desativada depois de a conexão abrir (6 casos), e a recusa de sessão vem antes das outras: usuário inativo com chamado inexistente em `EntrarNoChamado` e usuário inativo que não é atendente em `EntrarNaFila` também dão "Sessão inválida." (2 casos) (AC 7, Surface, L-023)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.Sessao_invalida_nos_tres_metodos"`

**C13** - [x] O hub relê o usuário a cada chamada: depois de a conexão abrir, tirar o papel `ATENDENTE` faz `EntrarNaFila()` lançar "A fila é só para atendentes.", e tirar o atendente do setor do chamado faz `EntrarNoChamado` lançar "Chamado não encontrado." (2 casos) (AC 7)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.Papel_e_setor_sao_relidos_a_cada_chamada"`

**C14** - [x] `SairDoChamado(numero)` conclui sem erro e a sonda do grupo deixa de chegar; nenhum dos 3 métodos do hub devolve `ChamadoMudou` nem `FilaMudou` a quem o chamou (Surface, AC 20)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.SairDoChamado_tira_a_conexao_do_grupo"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealEntradaTests.Metodos_do_hub_nao_devolvem_evento_ao_chamador"`

**C15** - [x] O contrato do hub é exatamente `TempoRealHub` com os métodos públicos `EntrarNoChamado(string)`, `SairDoChamado(string)` e `EntrarNaFila()`, todos retornando `Task`, nenhum retornando `IAsyncEnumerable` nem `ChannelReader` (a resposta da IA não chega aos poucos, AC 16, AD-012), mapeado em `/api/tempo-real` (door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Contrato_do_hub"`

**C16** - [x] Os nomes `chamado:` e `fila:` dos grupos aparecem em um só arquivo de `api/`, que recebe a instituição como argumento vindo do usuário relido do banco e nunca de parâmetro do hub (door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Grupos_num_so_lugar"`

**C17** - [x] A dependência nova segue a door 2: `Microsoft.AspNetCore.SignalR.Client` com versão exata em `api.Tests/One.Api.Tests.csproj` e nenhum `PackageReference` acrescentado em `api/One.Api.csproj`
Proof: `grep -qE 'Microsoft.AspNetCore.SignalR.Client" Version="[0-9]+\.[0-9]+\.[0-9]+"' api.Tests/One.Api.Tests.csproj`
Proof: `! git diff <base> HEAD -- api/One.Api.csproj | grep -E '^\+.*PackageReference'`

### S2 - O servidor avisa depois de cada gravação que muda um chamado (P1) · ~22 files · ~114 KB · ~28k

**C18** - [x] Uma gravação que confirma `Chamado` criado, `Chamado` alterado, `MensagemChamado` nova ou `EventoChamado` novo (4 casos) manda ao gravador `ChamadoMudou(numero)` para `chamado:{instituicaoId}:{numero}` e `FilaMudou()` para `fila:{instituicaoId}:{setorId}` do setor do chamado, com o `numero` achado pelo interceptador mesmo quando a entidade só traz `ChamadoId` (AC 8, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvisarMudancaTests.Gravacoes_de_Chamado_Mensagem_e_Evento_avisam"`

**C19** - [x] Uma gravação que só toca `Usuario`, `Artigo` ou `Conversa` (3 casos) não envia evento algum (AC 8, AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvisarMudancaTests.Gravacoes_de_Usuario_Artigo_e_Conversa_nao_avisam"`

**C20** - [x] Uma gravação que toca `Chamado`, `MensagemChamado` e `EventoChamado` do mesmo chamado envia 1 `ChamadoMudou` e 1 `FilaMudou`, e uma que toca 2 chamados envia 1 par para cada (AC 8, door 4 "junta os chamados tocados")
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvisarMudancaTests.Varias_entidades_do_mesmo_chamado_avisam_uma_vez"`

**C21** - [x] Cada um dos 14 caminhos que gravam chamado pela API faz o atendente conectado à fila do setor receber `FilaMudou()`, e os 12 que alteram um chamado existente fazem o conectado ao grupo do chamado receber `ChamadoMudou(numero)`: `assumir`, `cancelar`, `confirmar`, `encaminhar`, `duplicado`, `reclassificar`, `rejeitar`, `resolver`, mensagem do atendente, mensagem do aluno, nota interna, desativar usuário (esses 12) e `transferir`, `atendimento-direto` (só `FilaMudou`, o chamado nasce agora) (AC 8, AC 9)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Cada_caminho_que_grava_chamado_avisa"`

**C22** - [x] Cada uma das 3 tarefas do `Agendador` que grava chamado (fechamento automático, lembrete, volta para resolvido) envia `ChamadoMudou(numero)` ao grupo do chamado e `FilaMudou()` à fila do setor, mesmo gravando o estado por `ExecuteUpdateAsync` (AC 10)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Agendador_avisa_fechamento_lembrete_e_volta_para_resolvido"`

**C23** - [x] `Transferencia.Criar` não avisa nada antes do `CommitAsync` e, no momento em que o atendente conectado recebe o `FilaMudou()`, a listagem `GET /api/chamados?escopo=fila` dele já traz o chamado novo (AC 9, AC 12)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Transferir_avisa_so_depois_do_commit_e_a_fila_ja_traz_o_chamado"`

**C24** - [x] Com transação explícita aberta, o gravador não recebe nada depois do `SaveChanges` e recebe os avisos depois do commit; e no momento em que o aluno conectado recebe `ChamadoMudou`, o `GET /api/chamados/{numero}` dele já traz a resposta nova do atendente (AC 12)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvisarMudancaTests.Aviso_espera_o_commit_da_transacao"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Aviso_chega_com_a_mudanca_ja_visivel_no_GET"`

**C25** - [x] Um `SaveChanges` que falha (conflito de concorrência, 1 caso) e uma transação desfeita com `Rollback` depois de um `SaveChanges` bem-sucedido (1 caso) não enviam evento algum (AC 13)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvisarMudancaTests.Gravacao_que_falha_nao_avisa"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvisarMudancaTests.Transacao_desfeita_nao_avisa"`

**C26** - [x] Com o envio ao hub lançando exceção, a resposta de `responder` (status e corpo) e a de `transferir` (status e corpo) são as mesmas do envio saudável (2 casos), e o log traz 1 aviso com o id do chamado e o id da instituição e sem o texto da mensagem (AC 14)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Falha_no_envio_mantem_a_resposta_da_acao"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvisarMudancaTests.Falha_no_envio_registra_aviso_com_ids_e_sem_texto"`

**C27** - [x] Com `ONE-1` nas instituições A e B, uma mudança em A não entrega `ChamadoMudou` nem `FilaMudou` à conexão de B, e entrega às conexões de A (controle positivo) (AC 15, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Outra_instituicao_com_o_mesmo_numero_nao_recebe_nada"`

**C28** - [ ] `encaminhar` e `reclassificar` que trocam o setor mandam `FilaMudou()` às filas do setor antigo e do novo (2 casos), `reclassificar` dentro do mesmo setor manda a uma fila só, e a troca de `SetorId` na gravação manda às duas filas (AC 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Encaminhar_avisa_a_fila_antiga_e_a_nova"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Reclassificar_avisa_a_fila_antiga_e_a_nova"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Reclassificar_no_mesmo_setor_avisa_uma_fila"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvisarMudancaTests.Setor_trocado_avisa_a_fila_antiga_e_a_nova"`

**C29** - [x] As 4 rotas de conversa que não geram chamado (`POST /api/conversas`, `POST /api/conversas/{id}/mensagens`, `POST /api/conversas/{id}/encerrar`, `POST /api/conversas/{id}/avaliacao`) não enviam evento algum do hub, e a resposta do assistente continua inteira no corpo da própria chamada, só depois da conferência (AC 16, AD-012)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Conversa_sem_chamado_nao_envia_evento"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Resposta_conferida_devolve_tipo_e_texto"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AssistenteTests.Trecho_invalido_vira_sem_base_e_log"`

**C30** - [x] `ChamadoMudou` leva 1 argumento, o número do chamado como texto, e `FilaMudou` leva 0 argumentos (AC 17, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvisarMudancaTests.ChamadoMudou_leva_so_o_numero_e_FilaMudou_nenhum_argumento"`

**C31** - [x] Em todo o `api/` o único envio por `IHubContext` está no interceptador e só usa os nomes `ChamadoMudou` e `FilaMudou`; nenhum handler injeta `IHubContext` (door 1, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Hub_so_envia_ChamadoMudou_e_FilaMudou"`

**C32** - [x] `AddSignalR`, `MapHub` e o registro do `AvisarMudanca` no `OneDb` aparecem só em `api/Program.cs` (que o host real, o comando `instituicao` e o `OneFactory` com suas 2 subclasses usam), e nada em `api.Tests/Infra` os repete (door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Aviso_registrado_so_no_Program"`

**C33** - [x] O aluno com a tela aberta recebe `ChamadoMudou` quando só entrou uma nota interna, e o `GET /api/chamados/{numero}` dele depois do aviso é idêntico ao de antes (a nota não aparece) (decisão do usuário em 02/11/2026, Assumptions)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~TempoRealAvisosTests.Nota_interna_avisa_o_aluno_e_a_releitura_volta_igual"`

**C34** - [x] `dotnet build api -warnaserror:CA1502` termina com 0 aviso: o interceptador e o hub respeitam o limite de complexidade 10 (door 4)
Proof: `dotnet build api -warnaserror:CA1502`

### S3 - As telas do chamado e da fila reagem ao aviso (P1) · ~28 files · ~141 KB · ~35k

**C35** - [x] Com a tela de `ONE-1` aberta, `ChamadoMudou('ONE-1')` relê `['chamado', 'ONE-1']` e mostra o texto novo sem avançar o relógio; `ChamadoMudou('ONE-2')` não faz nova leitura de `ONE-1` (2 casos) (AC 18)
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "ChamadoMudou do chamado aberto relê e mostra o texto novo sem avançar o relógio"`
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "ChamadoMudou de outro chamado não relê o aberto"`

**C36** - [x] Com a fila do atendente aberta, `FilaMudou()` faz nova leitura de `GET /api/chamados?escopo=fila` e mostra a lista nova; "Minhas solicitações" (`GET /api/chamados`) não é relida (2 casos) (AC 19)
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "FilaMudou relê a fila do atendente"`
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "FilaMudou não relê Minhas solicitações"`

**C37** - [x] Abrir a tela do chamado chama `EntrarNoChamado('ONE-1')` e fechá-la chama `SairDoChamado('ONE-1')`; abrir a fila chama `EntrarNaFila()`; e uma conexão que só abre depois de a tela estar aberta entra nos grupos das telas abertas assim que abre (derivado de AC 20 com AC 23) (AC 20)
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "abrir o chamado chama EntrarNoChamado e fechar chama SairDoChamado"`
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "abrir a fila chama EntrarNaFila"`
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "conexão que abre depois da tela entra nos grupos das telas abertas"`

**C38** - [x] A releitura do chamado é de 60 000 ms com a conexão em `Connected` (59 999 ms sem nova leitura, 60 000 ms com) e de 15 000 ms nos outros 4 estados de `HubConnectionState` (`Disconnected`, `Connecting`, `Disconnecting`, `Reconnecting`) (AC 21)
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "intervalo de releitura por estado da conexão"`

**C39** - [x] Os 3 testes de 15 s da base seguem verdadeiros sem edição de asserção, porque a conexão falsa do `setup.ts` nasce fora de `Connected`: o check 41 da `interface-nova` (`detalhe relê o chamado a cada 15 s`, 14 999 ms e 15 000 ms), `atualiza chamado a cada 15 s` da transferência (14 900 ms e 100 ms) e o check 94 da `interface-nova` (`chamado.ts` ainda contém `refetchInterval` e não contém `setInterval`) (AC 21, AC 25)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "detalhe relê o chamado a cada 15 s"`
Proof: `cd web && npx vitest run src/assistente/transferencia.test.tsx -t "atualiza chamado a cada 15 s"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "estado das telas só pelo TanStack Query"`

**C40** - [x] Quando a conexão volta de uma queda (`onreconnected`), o app chama de novo `EntrarNoChamado` do chamado aberto e `EntrarNaFila` da fila aberta e relê as duas consultas (3 membros: chamado aberto, fila aberta, tela já fechada); uma tela fechada antes da queda não é reentrada (AC 22)
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "reconexão entra de novo nos grupos das telas abertas e relê"`
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "reconexão não entra em chamado de tela fechada"`

**C41** - [x] Com a conexão fechada e o usuário autenticado, a espera entre duas tentativas de reabrir nunca passa de 30 000 ms (depois de 10 falhas seguidas a próxima tentativa acontece em até 30 000 ms), a aba que volta a ficar visível tenta de imediato, e sem usuário autenticado nenhuma tentativa acontece (3 casos) (AC 23)
Proof: `cd web && npx vitest run src/tempo-real.test.ts -t "tentativas de reabrir nunca esperam mais de 30 s"`
Proof: `cd web && npx vitest run src/tempo-real.test.ts -t "aba visível tenta reabrir de imediato"`
Proof: `cd web && npx vitest run src/tempo-real.test.ts -t "sem usuário autenticado não abre"`

**C42** - [x] Sair encerra a conexão (1 `stop`) e entrar abre uma nova (1 `start` de uma conexão nova) (AC 24)
Proof: `cd web && npx vitest run src/acesso/tempoReal.test.tsx -t "sair encerra a conexão e entrar abre uma nova"`

**C43** - [x] Com a conexão que não abre (servidor fora, `negotiate` recusado com `401`: 2 casos) a tela do chamado segue relendo a cada 15 000 ms e nenhum texto de erro novo aparece na tela (AC 25)
Proof: `cd web && npx vitest run src/chamados/tempoReal.test.tsx -t "conexão que não abre mantém a releitura de 15 s sem mensagem nova"`

**C44** - [x] `@microsoft/signalr` está em `dependencies` do `web/package.json` com versão exata (`x.y.z`), e todas as versões do `package.json` continuam exatas (door 2)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "SignalR exato e só no web"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "versões exatas e pacotes proibidos"`

**C45** - [x] O proxy `/api` do `vite.config.ts` tem `ws: true`, e o service worker segue negando `/api/*` (`navigateFallbackDenylist: [/^\/api\//]`) sem cache de API (Impact web)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "proxy do dev com WebSocket e PWA sem API em cache"`

**C46** - [x] Nenhuma asserção de teste da base é trocada ou removida em `web/src` e `web/e2e` entre `<base>` e `HEAD` (as linhas de teste só crescem) e nenhum `.skip(`/`.only(` entra (o `seletores.md` da `interface-nova` é só dela, por isso o conjunto de linhas trocadas vai comparado a uma tabela vazia)
Proof: `python -B .specs/features/interface-nova/seletores_conferem.py --autoteste`
Proof: `python -B -c "import subprocess,sys;sys.path.insert(0,'.specs/features/interface-nova');import seletores_conferem as s;d=subprocess.run(['git','diff','--no-renames','--no-color','-U0','<base>','HEAD','--','web/src','web/e2e'],capture_output=True,text=True,encoding='utf-8',check=True).stdout;sys.exit(1 if s.conferir(d,'') else 0)"`

**C47** - [x] Toda consulta por papel ou rótulo dos testes de `<base>` continua em `HEAD` com os mesmos argumentos
Proof: `python -B .specs/features/interface-nova/consultas_preservadas.py --autoteste`
Proof: `python -B .specs/features/interface-nova/consultas_preservadas.py <base>`

**C48** - [x] Cada teste da base faz as mesmas chamadas à API em `<base>` e em `HEAD`: nenhuma chamada nova que não seja `GET` (o `POST /api/tempo-real/negotiate` nunca sai no Vitest, a conexão é a falsa) e o mesmo conjunto de URLs `GET`
Proof: `python -B .specs/features/interface-nova/chamadas_iguais.py --autoteste`
Proof: `python -B .specs/features/interface-nova/chamadas_iguais.py <base>`

**C49** - [x] O `web/` continua em fatias com `tempo-real.ts` na raiz (nenhuma assertão de `estrutura.test.ts` é afrouxada; a lista `Raiz` só ganha `'tempo-real.ts'`), o `crapper` sai com nota abaixo de 9,99 e o `dryer` com `src/tempo-real.ts` na lista de caminhos não acha candidato com nota 0,8 ou mais (L-031)
Proof: `cd web && npx vitest run src/test/estrutura.test.ts -t "estrutura em fatias"`
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx src/tempo-real.ts | grep -q "No duplicate candidates found"`

**C50** - [x] O build do `web/` com a dependência nova passa e o precache do service worker segue completo (todo arquivo de `api/wwwroot` que o `globPatterns` cobre está no precache)
Proof: `npm --prefix web run build && python -B .specs/features/interface-nova/precache_completo.py api/wwwroot`

**C51** - [x] As falhas do `negotiate` no navegador não quebram o e2e: com a API simulada do Playwright (que não conhece `/api/tempo-real`), os testes existentes terminam sem falha, porque a conexão real cai no polling de 15 s (AC 25)
Proof: `E2E_URL=http://localhost:8085 npm --prefix web run e2e`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `POST /api/tempo-real/negotiate` statuses (3) | `200` C7 · `401` C5 · `403` C6 | - |
| `WS /api/tempo-real` statuses (3) | `101` C7 · `401` C5 · `403` C6 | - |
| `401` do negotiate, motivos (3) | sem cookie C5 · usuário inativo C5 · instituição inativa C5 | - |
| hub `EntrarNoChamado` resultados (3) | sem erro C8 · "Chamado não encontrado." C9 · "Sessão inválida." C12 | - |
| hub `SairDoChamado` resultados (2) | sem erro C14 · "Sessão inválida." C12 | - |
| hub `EntrarNaFila` resultados (3) | sem erro C10 · "A fila é só para atendentes." C11 · "Sessão inválida." C12 | - |
| client `ChamadoMudou` (3) | enviado ao grupo do chamado C21 · não devolvido ao chamador C14 · nunca a outra instituição C27 | - |
| client `FilaMudou` (3) | enviado ao grupo da fila C21 · não devolvido ao chamador C14 · nunca a outra instituição C27 | - |
| `EntrarNoChamado` aceitos (2) | solicitante C8 · atendente do setor C8 | - |
| `EntrarNoChamado` recusados (6) | número inexistente C9 · `ONE-1` de outra instituição C9 · chamado de outro aluno C9 · atendente de outro setor C9 · administrador sem setor do chamado C9 · número vazio C9 | - |
| `EntrarNaFila` recusados (2) | só `ALUNO` C11 · só `ADMINISTRADOR` C11 | - |
| `Sessão inválida.` (8) | `EntrarNoChamado` com usuário inativo C12 · `EntrarNoChamado` com instituição inativa C12 · `SairDoChamado` com usuário inativo C12 · `SairDoChamado` com instituição inativa C12 · `EntrarNaFila` com usuário inativo C12 · `EntrarNaFila` com instituição inativa C12 · usuário inativo com chamado inexistente C12 · usuário inativo que não é atendente C12 | - |
| releitura do hub (2) | papel `ATENDENTE` retirado C13 · setor retirado C13 | - |
| entidades que avisam (4) | `Chamado` criado C18 · `Chamado` alterado C18 · `MensagemChamado` nova C18 · `EventoChamado` novo C18 | - |
| entidades que não avisam (3) | `Usuario` C19 · `Artigo` C19 · `Conversa` C19 | - |
| caminhos que gravam chamado (17) | `assumir` C21 · `cancelar` C21 · `confirmar` C21 · `encaminhar` C21 · `duplicado` C21 · `reclassificar` C21 · `rejeitar` C21 · `resolver` C21 · mensagem do atendente C21 · mensagem do aluno C21 · nota interna C21 · desativar usuário C21 · `transferir` C21 · `atendimento-direto` C21 · fechamento automático C22 · lembrete C22 · volta para resolvido C22 | - |
| desfechos da gravação (5) | sem transação explícita C18 · transação com commit C24 · transação desfeita C25 · `SaveChanges` que falha C25 · `Transferencia.Criar` C23 | - |
| mudança de setor (3) | `encaminhar` C28 · `reclassificar` C28 · `reclassificar` no mesmo setor C28 | - |
| falha do envio ao hub (2) | `responder` C26 · `transferir` C26 | - |
| conversas que não geram chamado (4) | `POST /api/conversas` C29 · `POST /api/conversas/{id}/mensagens` C29 · `POST /api/conversas/{id}/encerrar` C29 · `POST /api/conversas/{id}/avaliacao` C29 | - |
| argumentos dos eventos (2) | `ChamadoMudou` com 1 texto C30 · `FilaMudou` com 0 C30 | - |
| nome dos eventos e dos grupos (3) | só `ChamadoMudou` e `FilaMudou` C31 · grupo `chamado:` C16 · grupo `fila:` C16 | - |
| nota interna e aluno (2) | aluno recebe `ChamadoMudou` C33 · releitura idêntica C33 | - |
| `HubConnectionState` -> intervalo (5) | `Connected` C38 · `Disconnected` C38 · `Connecting` C38 · `Disconnecting` C38 · `Reconnecting` C38 | - |
| eventos que a tela recebe (2) | `ChamadoMudou` C35 · `FilaMudou` C36 | - |
| `ChamadoMudou` de outro número (1) | não relê o aberto C35 | - |
| chamadas de tela ao hub (3) | `EntrarNoChamado` C37 · `SairDoChamado` C37 · `EntrarNaFila` C37 | - |
| reentrada depois da queda (3) | chamado aberto C40 · fila aberta C40 · tela fechada não reentra C40 | - |
| reabrir a conexão (3) | espera máxima de 30 s C41 · aba visível tenta de imediato C41 · sem usuário não abre C41 | - |
| ciclo de sessão (2) | sair encerra C42 · entrar abre C42 | - |
| conexão que não abre (2) | servidor fora C43 · `negotiate` recusado C43 | - |
| testes de 15 s da base (3) | `detalhe relê o chamado a cada 15 s` C39 · `atualiza chamado a cada 15 s` C39 · `estado das telas só pelo TanStack Query` C39 | - |
| porta de entrada da dependência (3) | `api.Tests` C17 · `api` sem pacote novo C17 · `web/package.json` C44 | - |
| startup config: registro do hub e do interceptador (4 places) | `Program.Servicos` C32 · `Program.Rotas` (`MapHub`) C32 · `OneFactory` e subclasses herdam o `Program` C32 · comando `instituicao` usa o mesmo `Program` C32 | - |
| startup config: conexão no `web/` (4 places) | app real (`App.tsx`, `main.tsx`) C42 · Vitest (`setup.ts` com a conexão falsa) C48 · proxy do `vite.config.ts` C45 · service worker C45 | - |
| rede de segurança (5) | `rotas.txt` C3 · outros 4 retratos C4 · suítes inteiras C1 · nada removido C2 · asserções, consultas e chamadas da base C46 C47 C48 | - |

- Claims naming a status code, route or response shape: C3, C5, C6, C7, C21, C23, C26 - cada um tem uma prova que cruza a fronteira (cliente .NET contra o `Program`, ou retrato da tabela de rotas)
- Nenhum outro check afirma mais que o caso único que a sua prova exercita; onde a afirmação tem N casos, o N está no texto e a prova é table-driven sobre eles

## Test policy

O repositório não tem guia de testes (não há `AGENTS.md`); valem as linhas da `vertical-slice-completa` e da `dominio-e-contratos`, mais as que esta feature pede.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide, alcançado só pela conexão: `TempoRealHub` (3 métodos, 7 pontos de decisão) | uma pela conexão, com cliente .NET real; não há camada abaixo que decida outra coisa (a regra de ver o chamado é `ChamadoRotas.Carregar`, já provada) | um caso por membro de C5 a C14 |
| Decide e é alcançado pela gravação: `AvisarMudanca` (tipo de entidade, criada ou alterada, setor trocado, transação explícita, falha da gravação, falha do envio, junção por chamado: 7 pontos) | uma na própria camada, com o `IHubContext` gravador, **e** uma pela API com cliente .NET | um caso por membro de C18 a C20 e C24 a C26 na camada; os 17 caminhos de C21 e C22 e as 4 rotas de C29 pela API |
| Decide, no `web/`: `tempo-real.ts` e o `refetchInterval` de `useChamado` (estado da conexão, entrar e sair, reentrada, espera de 30 s, visibilidade, sessão, falha ao abrir: 8 pontos) | uma na própria camada, com a conexão falsa | um caso por membro de C35 a C43 |
| Estrutura: contrato do hub, nomes de grupo, registro único | regra de texto ou reflexão no `ArquiteturaTests` | um caso por membro de C15, C16, C31 e C32 |
| Instrumentação: `AddSignalR`, `MapHub`, `ws: true`, a conexão falsa do `setup.ts` | nenhuma própria | coberta por C3, C7, C45 e C48 |

Evidence:

- `api/Chamados/ChamadoRotas.cs`: `Carregar` decide com 3 saídas (aluno, atendente, nada) e já tem prova (`PermissoesChamadoTests`, `VisibilidadeTests`); o hub a reusa
- `web/src/chamado.ts`: `useChamado` fixa `refetchInterval` em 15 000 ms, 1 ponto de decisão hoje, que passa a depender de 5 estados
- análogo no repositório (`api`): `AgendadorTests`, que prova as 3 tarefas com `FakeTimeProvider` e `OneFactory`; análogo no `web/`: `detalhe relê o chamado a cada 15 s` em `chamado.test.tsx`, que prova o intervalo com `vi.useFakeTimers`

Cost: 3 classes novas no `api.Tests` (`TempoRealEntradaTests` 15 métodos, `AvisarMudancaTests` 9, `TempoRealAvisosTests` 11), 4 regras no `ArquiteturaTests`, 3 arquivos de teste novos no `web/` mais 2 testes novos em `interface.test.ts`. Sem essas linhas, as 17 gravações de C21 e C22 e os 5 estados de C38 ficam provados só por um caminho que por acaso atravessa o interceptador ou o hook.

Pergunta ao usuário (uma, não bloqueia): essas linhas entram num guia de testes do repositório? Hoje não há arquivo para recebê-las; o build segue sob elas e nenhum arquivo de guia é escrito sem resposta.

## Swept

- validation: C9 (número inexistente e número vazio), C12 (sessão antes de qualquer outra recusa), C30 (o evento só leva o número), C44
- failure modes: C25 (gravação que falha e transação desfeita), C26 (envio falho mantém a resposta), C43 (conexão que não abre)
- idempotency: C8 (entrar duas vezes entrega um aviso só), C20 (várias entidades do mesmo chamado, um par de avisos)
- authorization: C5, C6 (cookie e troca de senha), C8, C9, C10, C11, C13 (o hub relê papel e setor), C27 (outra instituição); existing - `ChamadoRotas.Carregar` e `Sessao.Validar`/`ExigirTrocaDeSenha` seguem como a regra única
- concurrency: C24 (o `GET` do aviso já vê a mudança), C25 (conflito de concorrência não avisa), C20
- data lifecycle: n/a - nenhuma tabela nem migração, grupos e conexões vivem na memória do processo; o ciclo da conexão está em C42 e C41
- dependency failure: C26 (hub falha), C43 (servidor fora, `negotiate` recusado), C41 (reabrir em até 30 s)
- state transitions: C22 (as 3 tarefas do `Agendador`), C38 (5 estados da conexão), C40 (queda e volta), C42 (sair e entrar)
- observability: C26 (aviso no log com id do chamado e da instituição, sem texto)

## Out of scope

- texto da IA chegando aos poucos (streaming) - AD-012; C15 e C29 prendem que o hub não tem retorno em fluxo e que a resposta vai inteira
- backplane (Redis) e sessão fixa - uma só instância (AD-022)
- aviso com o app fechado - é a feature `web-push`
- a lista "Minhas solicitações" do aluno em tempo real - C36 prende que ela não é relida pelo `FilaMudou`
- indicador visual de "conectado" ou "reconectando" - sem tela nova; sem snapshot nem teste de arranjo nesta feature
- presença, "digitando", salas de conversa; Azure SignalR Service e MessagePack; telas de administração e indicadores em tempo real - nenhuma decisão pediu
- prova com WebSocket pelo Kestrel dentro do Docker Compose no navegador real - ensaio manual da etapa 5 (Assumptions do plano); C51 prova só que o e2e existente não quebra
- limite de taxa nas chamadas do hub - Assumption do plano
- `mutator` (api e web) - suspenso pelo AD-025, não é check desta feature

## Handoff

Tamanho estimado pelo código que cada slice lê e escreve (`wc -c` em `HEAD` / 4; o que é escrito é estimado). Contexto fixo do construtor: `plan.md` (18.184 B), este `checks.md` (41.437 B), `references/build.md` (11.542 B) e `LESSONS.md` (13.308 B) = 84 KB = ~21 k.

- S0 só roda comandos: a saída das 3 suítes e dos 4 comandos `git` e `python`: ~3k
- S1 lê `Program.cs`, `Sessao.cs`, `ChamadoRotas.cs`, `OneFactory`, `Balcao`, `Cenario`, `Semente`, `RetratoTests`, `ArquiteturaTests`, `TransferenciaTests`, `Entidades.cs` e os 2 `.csproj` (146 KB) e escreve `TempoRealHub.cs`, `TempoRealEntradaTests` (15 métodos), 2 regras do `ArquiteturaTests`, as linhas do hub em `rotas.txt` e os totais de `RetratoTests` (~30 KB): 176 KB = ~44k
- S2 lê `OneDb.cs`, `Agendador.cs`, `Transferencia.cs`, `AgirNoChamado.cs`, `AcoesChamado.cs`, `TransferirConversa.cs`, `DesativarUsuario.cs`, `AtendimentoDireto.cs`, os 9 handlers de ação, `AgendadorTests` e `AcoesDoChamadoTests` (57 KB) e escreve `AvisarMudanca.cs`, o registro no `Program.cs`, `AvisarMudancaTests` (9 métodos), `TempoRealAvisosTests` (11 métodos) e 2 regras do `ArquiteturaTests` (~57 KB): 114 KB = ~28k
- S3 lê `chamado.ts`, `Chamados.tsx`, `ChamadoDetalhe.tsx`, `Assistente.tsx` (trecho), `Autenticado.tsx`, `App.tsx`, `sessao.ts`, `main.tsx`, `api.ts`, `setup.ts`, `vite.config.ts`, `package.json`, `util.tsx`, `chamado.test.tsx`, `listas.test.tsx`, `transferencia.test.tsx`, `interface.test.ts` e `estrutura.test.ts` (98 KB) e escreve `tempo-real.ts`, os ajustes de `chamado.ts`, `Chamados.tsx`, `Autenticado.tsx` e `setup.ts`, 3 arquivos de teste novos e 2 testes em `interface.test.ts` (~43 KB): 141 KB = ~35k
- Total: 3k + 44k + 28k + 35k = 110k, mais o contexto fixo 21 k = 131 k, abaixo do budget de 150k (folga de 19 k para a saída de build e de testes): um só construtor, sem pergunta de mecanismo
- Se a medição de um slice passar o orçamento: corte em slice inteira, na fronteira que o plano já escreveu, **api | web** (S1 e S2 num lote, S3 no outro); com o mecanismo do usuário já registrado para a `dominio-e-contratos`: "handoff em lotes sequenciais por subagente, só com o lote anterior verde — escolha do usuário em 02/11/2026"; só vale para esta feature se o usuário repetir a escolha
- Feature base (`<base>`): o commit que congela `plan.md` e este `checks.md` (o pai preenche aqui o hash): `f996d30`. Entre ele e o `HEAD` do início do build (`c1a2a56`) entrou a `arquivos-minio` (`erros.txt` +1 linha, `AWSSDK.S3` no `One.Api.csproj`, testes novos), então as provas por diff de C2, C3, C4, C17 e C46 a C48 rodaram contra `c1a2a56`, o pai do primeiro commit desta feature; C46 e C48 também passam contra `f996d30`, C3 e C2 também, C4 e C17 não por construção
- Ordem de construção: esta feature só constrói depois de a `arquivos-minio` estar verificada (ambas mexem em `api/Program.cs` e em `docker-compose.yml`)
- e2e (C1, C51): imagem e porta próprias desta feature. Num worktree limpo no commit sob teste (o `Dockerfile` compila o `web/` da árvore): `docker build -t one-tempo-real <worktree>`, depois `docker run` dessa imagem na porta 8085 com o mesmo ambiente do serviço `api` do compose, e `E2E_URL=http://localhost:8085 npm --prefix <worktree>/web run e2e`. Ao fim, o container `one-tempo-real` é parado e removido; o `api` da porta 8080 não é tocado. A porta 8085 escapa das 8082 (`dominio-e-contratos`) e 8083 (`interface-nova`); se outra feature em construção já a usa, o construtor escolhe a próxima livre e anota aqui
- Decisões de construção (reversíveis, em aberto até o construtor fechar): (1) `tempo-real.ts` fica na raiz de `web/src` e `Raiz` em `estrutura.test.ts` ganha `'tempo-real.ts'` (nenhuma asserção muda; o arquivo é importado por `chamado.ts`, `Chamados.tsx` e `Autenticado.tsx`, e a regra de "2 ou mais fatias" não o alcança porque `chamado.ts` é raiz); (2) os totais dentro de `Tabela_de_rotas_igual_a_da_base` (61, 59, 59) sobem exatamente pelo número de linhas que o `MapHub` acrescentar à tabela, e o número exato sai da tabela viva, não deste texto; (3) `seletores_conferem.py` é amarrado ao `seletores.md` da `interface-nova`, então C46 usa a função `conferir` do script com tabela vazia, em vez de um script novo

<Appended by each builder as it finishes, three lines each:>

- **Boundary:** C1-C51 fechados em `1baf8ff`, exceto C28: a prova `TempoRealAvisosTests.Reclassificar_avisa_a_fila_antiga_e_a_nova` não existe porque `reclassificar` não troca o setor (mvp-one AC 97: "manter ... o setor"; `Chamado.Reclassificar` só muda `CategoriaId`), então o caso não é alcançável pela API; as outras 3 provas de C28 passam. Contagens: `api.Tests` 405 (367 da base + 38 novos: `TempoRealEntradaTests` 15, `AvisarMudancaTests` 9, `TempoRealAvisosTests` 10, `ArquiteturaTests` 4), Vitest 185 (168 + 17: `tempo-real.test.ts` 3, `chamados/tempoReal.test.tsx` 11, `acesso/tempoReal.test.tsx` 1, `interface.test.ts` 2), Playwright 46 contra a imagem `one-tempo-real` na porta 8085. Linhas do hub em `rotas.txt`: 2 (`POST /api/tempo-real/negotiate`, `* /api/tempo-real`), totais de `Tabela_de_rotas_igual_a_da_base`: 63 linhas, 60 rotas de método único (o WebSocket fica sem método, porque o mesmo endpoint atende o long polling), 61 com autorização. Um construtor só, sem corte api | web
- **Settled mid-build:** nenhuma resposta do usuário durante o build. Decisões do construtor: `tempo-real.test.ts` entra na lista `Raiz` de `estrutura.test.ts` junto de `tempo-real.ts` (a regra de raiz acusaria o arquivo de teste na raiz que o C41 manda criar); `SessaoTests` passa a contar o hub entre as rotas privadas (54 para 56, WebSocket lido como `GET`); o `Impact` do plano diz 35 pontos de `SaveChangesAsync`; Landing door 5 (método do `negotiate`) acrescentada ao plano; termo `sinal de mudança` no glossário
- **Abandoned:** `IgnoreQueryFilters` na busca do número do chamado dentro do interceptador (a regra `IgnoreQueryFilters_so_no_agendador_e_no_comando` recusa; a gravação já roda com a instituição da sessão) e `object` no registro interno do interceptador (`Nenhum_corpo_tipado_object` recusa; o registro guarda uma função que lê o `ChamadoId` depois da gravação)

### Notas do coordenador (02/11/2026, antes do build)

- Itens que o escritor dos checks levantou, decididos como detalhe técnico, sem mudar o que o usuário aprovou:
  (1) o C46 usa a função `conferir` do `seletores_conferem.py` da `interface-nova` com tabela vazia, sem copiar o
  script; (2) a lista `Raiz` do `estrutura.test.ts` ganha `'tempo-real.ts'`, a mesma afirmação (arquivo da raiz
  usado por 2 ou mais fatias); (3) os builds são sequenciais, então a porta do e2e (8085) não colide; (4) os totais
  de `Tabela_de_rotas_igual_a_da_base` sobem exatamente pelo número de linhas que o `MapHub` acrescenta, e o
  construtor registra esse número no Handoff; (5) as linhas de Test policy valem sem arquivo de guia; (6) o código
  tem 35 `SaveChangesAsync`, não ~40 como o Impact do plano diz — o construtor corrige o número no Impact;
  (7) "nunca devolvido a quem chama" = os métodos do hub não ecoam dados; "30 s no máximo" = espera de nova
  tentativa limitada a 30 s.

### Decisões do usuário depois do build (03/11/2026)

- **C28:** aceito sem o caso "reclassificar avisa a fila antiga e a nova". Reclassificar só troca a categoria e nunca
  o setor (mvp-one AC 97), então o caso não existe; o C28 vale pelas outras três provas.
- **`SessaoTests`:** aceita a mudança: o endpoint WebSocket do hub, que não declara método, é lido como `GET` na
  enumeração, e a contagem de rotas privadas vai de 54 para 56 (as duas rotas novas do hub). A afirmação continua a
  mesma: toda rota privada exige sessão.
- **Nota do coordenador sobre a base:** o commit `f996d30` congelou os checks antes do build do `arquivos-minio`, então
  as provas por diff (C4, C17) comparam com `c1a2a56`, o HEAD quando este build começou; o intervalo da feature para o
  Verifier é `c1a2a56..dfa2573`.
