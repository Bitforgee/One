# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

### L-013 - Conte os membros da Coverage por condição e não por linha de recusa; uma linha com || ou else if esconde casos sem teste.
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `specs/coverage` · harmful: 0
- features: mvp-one, rag
- evidence: .specs/features/mvp-one/checks.md:710 (specs/coverage) (+1 more)
- last seen: 2026-11-02T18:30:24Z

### L-021 - Tire de código a contagem de células e o caminho de rota escritos num check, não da memória; número ou rota errados no texto deixam o check sem prova literal.
- signal: `spec_precision_gap` · recurrence: 4 feature(s) · scope: `specs/checks` · harmful: 0
- features: refatoracao-solid, dominio-e-contratos, arquivos-minio, web-push
- evidence: checks.md C21, C32 (verification.md precision gaps) (specs/checks) (+3 more)
- last seen: 2026-11-03T06:10:38Z

### L-029 - Ponha nas linhas Proof de um check todo teste que afirma uma parte da afirmação; a parte afirmada só noutro teste sobrevive às provas nomeadas.
- signal: `surviving_mutant` · recurrence: 3 feature(s) · scope: `web` · harmful: 0
- features: interface-nova, tempo-real-signalr, web-push
- evidence: verification.md F5; web/src/test/interface.test.ts:95 (web) (+2 more)
- last seen: 2026-11-03T06:10:38Z

### L-049 - Dê um check a cada valor de ## Visual e a cada frase de arranjo de ## Screens, inclusive às notas acrescentadas durante o build.
- signal: `ac_gap` · recurrence: 2 feature(s) · scope: `specs/ui` · harmful: 0
- features: redesign-institucional, layout-painel
- evidence: plan.md ## Visual e ## Screens linha 0 (verification rodadas 1 e 2) (specs/ui) (+1 more)
- last seen: 2026-11-03T16:30:49Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Regra de 'último de vários' só é provada por um teste com dois ou mais itens diferentes; um item só não distingue primeiro de último.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/chamados` · harmful: 0
- features: mvp-one
- evidence: api/Chamados/Transferencia.cs:30 (F5) (api/chamados)
- last seen: 2026-11-02T15:26:00Z

### L-002 - Confira que cada filtro de prova executa exatamente um teste: um FullyQualifiedName que não casa nada sai com código 0.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `api.Tests` · harmful: 0
- features: mvp-one
- evidence: checks.md C164 (api.Tests)
- last seen: 2026-11-02T15:26:00Z

### L-003 - Antes de entregar, liste todo Problemas.Invalido e todo 400/413/415 das rotas e ligue cada um a uma asserção; a lista tirada do código acha recusas que a lista tirada do plano esquece.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/rotas` · harmful: 0
- features: mvp-one
- evidence: verification.md rodadas 2 e 3, Test policy linha 3 (api/rotas)
- last seen: 2026-11-02T15:26:00Z

### L-004 - Varra também os canais de erro próprios (ErrosCsv, erros do comando de carga) e não só Problemas.Invalido; cada motivo deles precisa de um caso no teste.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: mvp-one
- evidence: verification.md rodada 4, AdminRotas.cs:272-295 (api)
- last seen: 2026-11-02T15:55:35Z

### L-005 - Faça a primeira varredura de recusas sobre todo o código de entrada (rotas, importações e comandos) de uma vez; ampliar o escopo a cada rodada gera uma rodada nova por canal.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `verificacao` · harmful: 0
- features: mvp-one
- evidence: verification.md rodadas 2 a 5 (verificacao)
- last seen: 2026-11-02T16:05:23Z

### L-006 - Para cada gravação do agendador que reconfere a condição (UPDATE ... WHERE), escreva um teste que muda o item entre Ler() e Processar(); não basta cobrir conversa e RESOLVIDO.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/agendador` · harmful: 0
- features: mvp-one
- evidence: api/Agendador.cs:124 (api/agendador)
- last seen: 2026-11-02T16:26:35Z

### L-007 - Limite escrito dentro de uma regex (como {3,30}) é limite: teste um valor curto demais e um longo demais, não só um caractere proibido.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/comando` · harmful: 0
- features: mvp-one
- evidence: api/Comando/InstituicaoComando.cs:29 (api/comando)
- last seen: 2026-11-02T16:26:35Z

### L-008 - Conte cada disjunção e cada estado que a mensagem de recusa nomeia (ativo, desativada, conta desativada) como membro próprio; inexistente e inativo pedem casos separados.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: mvp-one
- evidence: api/Rotas/ChamadoRotas.cs:277 (api)
- last seen: 2026-11-02T16:26:35Z

### L-009 - Tire os motivos de sem_base do código (texto_vazio, provedor_indisponivel) e não só do AC, e dê a cada um uma linha na tabela do teste.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/assistente` · harmful: 0
- features: mvp-one
- evidence: api/Assistente/Assistente.cs:131 (api/assistente)
- last seen: 2026-11-02T16:26:35Z

### L-010 - Toda decisão tomada no meio do build e anotada no Handoff (como assumir sendo já o responsável = 409) entra na tabela de decisão do teste no mesmo commit.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/rotas` · harmful: 0
- features: mvp-one
- evidence: api/Rotas/ChamadoRotas.cs:232 (api/rotas)
- last seen: 2026-11-02T16:26:35Z

### L-011 - Janela de validade tem dois lados: teste o item antes do início e depois do fim, além dos dois limites.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/assistente` · harmful: 0
- features: mvp-one
- evidence: api/Assistente/Assistente.cs:53 (api/assistente)
- last seen: 2026-11-02T16:26:35Z

### L-012 - Cada prazo do agendador precisa do caso exatamente no prazo e do caso um minuto antes, não só do que vence.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/agendador` · harmful: 0
- features: mvp-one
- evidence: api/Agendador.cs:16 (api/agendador)
- last seen: 2026-11-02T16:26:35Z

### L-014 - Injete falhas só num worktree: git checkout de um arquivo mutado num tree com mudanças não commitadas apaga também a correção.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `processo` · harmful: 0
- features: mvp-one
- evidence: sessão 02/11, git checkout depois de mutação (processo)
- last seen: 2026-11-02T16:30:36Z

### L-015 - Recusa de nome repetido que confere o arquivo e o que já existe na instituição precisa de um caso para cada origem; o caso só dentro do arquivo deixa a semente do banco sem teste.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/comando` · harmful: 0
- features: mvp-one
- evidence: api/Comando/InstituicaoComando.cs:111 (api/comando)
- last seen: 2026-11-02T16:43:25Z

### L-016 - Ao corrigir uma recusa num laço da carga, aplique o mesmo caso às recusas irmãs do mesmo formato (setor, categoria, curso) contra o que já existe na instituição.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/comando` · harmful: 0
- features: mvp-one
- evidence: api/Comando/InstituicaoComando.cs:107 (api/comando)
- last seen: 2026-11-02T16:43:25Z

### L-017 - Numa tabela de recusas com preparo comum, cada caso deve falhar só na sua condição: avançar o relógio depois de emitir todos os tokens deixou o usado, o de conta desativada e o de instituição inativa também vencidos, e os mutantes dessas condições sobreviveram.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/auth` · harmful: 0
- features: mvp-one
- evidence: api.Tests/DefinirSenhaTests.cs:64 (api/auth)
- last seen: 2026-11-02T16:55:12Z

### L-018 - Um falso HTTP que responde a qualquer caminho não prova a URL: grave a URI de cada chamada no falso e afirme a URL completa montada da configuração.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api.Tests/falsos` · harmful: 0
- features: rag
- evidence: api/Assistente/Embeddings.cs:19 (F2url, rodada 2) (api.Tests/falsos)
- last seen: 2026-11-02T18:30:23Z

### L-019 - Limite máximo pede o caso do valor exato aceito além do primeiro recusado; só o recusado deixa > virar >= sem falha.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/rotas` · harmful: 0
- features: rag
- evidence: api/Rotas/DocumentoRotas.cs:102 (T199, rodada 2) (api/rotas)
- last seen: 2026-11-02T18:30:24Z

### L-020 - Ao mover ou reescrever um ramo que existe para artigo e para documento, afirme cada campo derivado nos dois ramos; um teste só do artigo deixa o mesmo campo do documento sem prova.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/conhecimento` · harmful: 0
- features: refatoracao-solid
- evidence: api/Conhecimento/Fontes.cs:89 (verification.md F-C28doc) (api/conhecimento)
- last seen: 2026-11-02T22:06:05Z

### L-022 - Quando a correção de um check acrescenta um teste em outra classe, acrescente o filtro dele às linhas Proof do check; sem isso o próprio proof do check não exercita a parte corrigida.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: refatoracao-solid
- evidence: checks.md:125-126 C28 (verification.md rodada 2) (specs/checks)
- last seen: 2026-11-02T22:11:53Z

### L-023 - Tire da base a sequência de recusas de cada handler e dê um caso HTTP com dois motivos ao mesmo tempo a cada par 409 antes de 400; o conjunto escrito a partir do plano esquece handlers como o de transferir.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/ordem-das-recusas` · harmful: 0
- features: vertical-slice-completa
- evidence: api/Assistente/TransferirConversa.cs:20 (F13) (api/ordem-das-recusas)
- last seen: 2026-11-02T23:09:00Z

### L-024 - Um check de arquivo igual à base compara o código sem comentários, ou o commit cosmético que toca esse arquivo leva um ruling antes; um diff só de comentários derruba o git diff --exit-code.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: dominio-e-contratos
- evidence: verification.md C27 (api/Agendador.cs, 0960b70) (specs/checks)
- last seen: 2026-11-03T01:27:33Z

### L-025 - Cada linha da tabela de um check precisa de um teste citado no Proof; uma linha provada por outro teste da mesma classe fica fora do filtro e o mutante dela passa pela prova do check.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: dominio-e-contratos
- evidence: verification.md C21 F5 (ChamadoDominioTests.cs:92) (specs/checks)
- last seen: 2026-11-03T01:27:33Z

### L-026 - Meça o cabeçalho na maior largura e com o conjunto de papéis que mais mostra links; sobreposição só aparece acima da última largura medida.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: interface-nova
- evidence: verification.md gap 1; web/src/Autenticado.tsx:78 (web)
- last seen: 2026-11-03T01:28:01Z

### L-027 - Classe responsiva que esconde texto (sm:...:sr-only) passa na regra dos textos do jsdom; confira o texto visível no navegador em cada largura do design.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: interface-nova
- evidence: verification.md gap 2; web/src/Autenticado.tsx:78 (web)
- last seen: 2026-11-03T01:28:01Z

### L-028 - Enumere cada fato de arranjo e cada ícone nomeado de cada linha de Screens num check; uma linha de Coverage tirada de uma só região deixa o resto sem prova.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: interface-nova
- evidence: verification.md gaps 3 and 4 (web)
- last seen: 2026-11-03T01:28:01Z

### L-030 - Afirme a largura igual das colunas e não só a quantidade de posições x; um col-span no primeiro item cria uma trilha implícita que mantém a contagem.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: interface-nova
- evidence: verification.md F7a; web/src/indicadores/Indicadores.tsx:122 (web)
- last seen: 2026-11-03T01:28:01Z

### L-031 - Ao mover código compartilhado para a raiz, acrescente o arquivo às listas de caminhos do dryer e do mutator no mesmo commit.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: interface-nova
- evidence: verification.md gap 8; checks.md C6, C7 (web)
- last seen: 2026-11-03T01:28:01Z

### L-032 - When a ruling fixes how many items show at each breakpoint, assert the exact count per width, not a lower bound, so a layout that never grows fails
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `responsive-ui` · harmful: 0
- features: interface-nova
- evidence: verification.md F11 / web/e2e/arranjo.spec.ts:157 (responsive-ui)
- last seen: 2026-11-03T01:53:43Z

### L-033 - Afirme Content-Length numa resposta lida com ResponseHeadersRead; com GetAsync o HttpClient calcula o tamanho do corpo em buffer e a asserção passa sem o cabeçalho.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api.Tests/download` · harmful: 0
- features: arquivos-minio
- evidence: verification.md F5; api.Tests/ArmazenamentoTests.cs:119 (api.Tests/download)
- last seen: 2026-11-03T03:21:42Z

### L-034 - Conte leituras no caminho que o código de fato usa; um contador de eventos do SDK fica sempre em zero quando a leitura passa por URL assinada e HttpClient.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api.Tests/falsos` · harmful: 0
- features: arquivos-minio
- evidence: verification.md F8; api.Tests/ArmazenamentoTests.cs:144 (api.Tests/falsos)
- last seen: 2026-11-03T03:21:42Z

### L-035 - Dê um caso a cada tipo de exceção que um catch converte em status; a porta fechada só exercita a falha de rede e deixa o erro devolvido pelo serviço sem prova.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/armazenamento` · harmful: 0
- features: arquivos-minio
- evidence: verification.md F9; api/Armazenamento.cs:35 (api/armazenamento)
- last seen: 2026-11-03T03:21:42Z

### L-036 - Liste toda recusa que acontece depois de um efeito externo (gravar no bucket, enviar e-mail) e dê a cada uma um caso que confere o efeito; recusa do domínio depois da gravação deixa resíduo sem check.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/armazenamento` · harmful: 0
- features: arquivos-minio
- evidence: api/Conhecimento/NovaVersaoDocumento.cs:25; api/Chamados/ResponderChamado.cs:47 (api/armazenamento)
- last seen: 2026-11-03T03:21:42Z

### L-037 - Antes de citar o e2e como prova de um fluxo, ache no spec a rota ou o seletor desse fluxo; uma suíte que simula a API não envia nem baixa nada.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: arquivos-minio
- evidence: checks.md C29; web/e2e/arranjo.spec.ts:664 (specs/checks)
- last seen: 2026-11-03T03:21:42Z

### L-038 - When a fix makes a side effect conditional on a domain decision, test the accepted branch's side effect as well as the refused branch's absence
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `storage` · harmful: 0
- features: arquivos-minio
- evidence: verification.md round 2 N4, api/Chamados/ResponderChamado.cs:61 (storage)
- last seen: 2026-11-03T04:04:35Z

### L-039 - Quando um falso substitui o cliente de uma conexão nos testes, grave no falso a URL e as opções com que o app o constrói e afirme-as; o falso que ignora a configuração deixa o endereço errado passar em toda suíte.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: tempo-real-signalr
- evidence: verification.md F9; web/src/tempo-real.ts:74 (web)
- last seen: 2026-11-03T05:07:14Z

### L-040 - Não prove 'só depois do commit' por uma leitura feita ao receber o aviso; o commit vem microssegundos depois e a leitura passa mesmo com o aviso adiantado: afirme a ausência do aviso entre a gravação e o commit.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: tempo-real-signalr
- evidence: verification.md F4; api.Tests/TempoRealAvisosTests.cs:135-137 (api)
- last seen: 2026-11-03T05:07:14Z

### L-041 - Quando N ações mandam o mesmo evento ao mesmo destino, afirme a contagem N ou um evento por ação; um Receber só é satisfeito pela primeira.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: tempo-real-signalr
- evidence: C22; api.Tests/TempoRealAvisosTests.cs:118 (api)
- last seen: 2026-11-03T05:07:14Z

### L-042 - Antes de fixar num check o conteúdo exato de uma lista de permissões, confira os arquivos que os outros checks mandam criar no mesmo lugar.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: tempo-real-signalr
- evidence: C49 vs C41; web/src/test/estrutura.test.ts:10 (web)
- last seen: 2026-11-03T05:07:14Z

### L-043 - Quando um check afirma o estado da tela depois de uma ação, faça o falso mudar o que a tela relê e afirme o estado final; um falso que não muda nada deixa o retorno sem prova.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: web-push
- evidence: verification.md C48; web/src/assistente/avisos.test.tsx:105 (web)
- last seen: 2026-11-03T06:10:38Z

### L-044 - Dê a cada estado de uma linha Observable (erro e negado) um AC e um check próprios; um AC que cobre só um deles deixa a falha da API sem prova.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: web-push
- evidence: verification.md Coverage: estado de erro do botão; web/src/AvisosPush.tsx:23 (specs/checks)
- last seen: 2026-11-03T06:10:38Z

### L-045 - Desvio de um valor fixado num check (transporte de um campo, texto visível de um botão) pede decisão do usuário antes do commit; anotar no Handoff como decisão do construtor não amenda o check.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `build` · harmful: 0
- features: web-push
- evidence: verification.md C45, C46, C48 (build)
- last seen: 2026-11-03T06:10:38Z

### L-046 - Antes de fixar num check e2e um valor do navegador, confira-o no Chromium headless; Notification.permission vem denied lá e só permissions.query mostra prompt.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `e2e` · harmful: 0
- features: web-push
- evidence: verification.md C51; web/e2e/push.spec.ts:38 (e2e)
- last seen: 2026-11-03T06:10:38Z

### L-047 - Quando uma decisão do usuário troca uma dependência, reescreva no mesmo commit o texto dos checks que nomeiam a antiga.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: web-push
- evidence: verification.md C24, C34 (specs/checks)
- last seen: 2026-11-03T06:10:38Z

### L-048 - Quando o Test policy permite reescrever testes, nomeie no check de comparação com a base os testes reescritos que podem faltar.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: redesign-institucional
- evidence: checks.md C25 (verification rodada 1, gap 1) (specs/checks)
- last seen: 2026-11-03T12:33:37Z

### L-050 - Ajuste visual feito depois da aprovação entra como nota em ## Screens e num check antes do commit que o fecha.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: redesign-institucional
- evidence: web/src/Autenticado.tsx:126 lg:whitespace-normal (verification rodada 1, gap 2) (web)
- last seen: 2026-11-03T12:33:37Z

### L-051 - Tire os casos de teste de um campo de todos os lugares que o gravam, inclusive o agendador, não só da entidade de domínio.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `specs/coverage` · harmful: 0
- features: historico-legivel
- evidence: chamado.test.tsx:207 LEMBRETE sem detalhe (verification rodada 1, gap 1) (specs/coverage)
- last seen: 2026-11-03T13:15:33Z

### L-052 - Dê um check a cada estado de tela de ## Screens, inclusive os que só existem depois de uma interação, como a barra recolhida.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `specs/ui` · harmful: 0
- features: barra-lateral-grupos
- evidence: barra-lateral-grupos verification rodada 1 gaps 1-4 (arranjo recolhido sem check) (specs/ui)
- last seen: 2026-11-03T13:34:23Z

### L-053 - Confira que o fixture do teste faz o elemento citado no check aparecer antes de afirmar algo sobre ele.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: barra-lateral-grupos
- evidence: checks.md C12 avisos sem a chave no simularApi (verification rodada 1, gap 2) (web)
- last seen: 2026-11-03T13:34:23Z

### L-054 - Give every width cap named in Screens, including exceptions in shared rows, its own check measured against the Screens value
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `web-layout` · harmful: 0
- features: layout-painel
- evidence: web/src/acesso/Acesso.tsx:185 (web-layout)
- last seen: 2026-11-03T15:51:11Z

### L-055 - Enumerate each Screens row's composition (what sits inside what, in which order) into checks, not only its texts and counts
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web-layout` · harmful: 0
- features: layout-painel
- evidence: verification.md Binding sources: user button, Cadastros Novo, Alert placement (web-layout)
- last seen: 2026-11-03T15:51:11Z

### L-056 - Measure both sides of every breakpoint Screens names, including padding and type-size breakpoints
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web-layout` · harmful: 0
- features: layout-painel
- evidence: verification.md Test policy: header padding, access padding, @[250px]/card (web-layout)
- last seen: 2026-11-03T15:51:11Z

### L-057 - A behaves-as-today check must name a proof for each state it lists, and must not promise unchanged assertions when the plan moves a breakpoint they pin
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: layout-painel
- evidence: C20; web/src/indicadores/indicadores.test.tsx:65 (web-tests)
- last seen: 2026-11-03T15:51:11Z

### L-058 - When moving a list into a table, keep exact-match assertions exact by targeting the cell, not the whole row text
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: layout-painel
- evidence: web/src/administracao/usuarios.test.tsx:34 (web-tests)
- last seen: 2026-11-03T15:51:12Z

### L-059 - When several screens pass the same new prop to a shared component, give each screen its own case; a test on one screen leaves the other screens' wiring without proof
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: layout-painel
- evidence: F2 web/src/administracao/Usuarios.tsx:53, web/src/conhecimento/Documentos.tsx:64 (C47) (web-tests)
- last seen: 2026-11-03T16:30:49Z

### L-060 - Before a check says a list of actions behaves as today, read the base behaviour of each action; extending one action's behaviour to the rest misstates the base
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: layout-painel
- evidence: C47; dac2832 web/src/conhecimento/Artigos.tsx:77 (specs/checks)
- last seen: 2026-11-03T16:30:49Z

### L-061 - When writing checks for a gap list, re-read every value in each Screens row the list touches instead of copying only the values the gap list named; a verifier's list inherits its own earlier misses
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: layout-painel
- evidence: plan.md:95 'Linhas de 14 px'; plan.md:85 'ícones centralizados' (specs/checks)
- last seen: 2026-11-03T19:03:24Z

### L-062 - A check reworded after a verification round needs the user's approval recorded in checks.md, like any amended check, even when the new text only narrows it to the real behaviour
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: layout-painel
- evidence: C47 (rewritten after round 2) (specs/checks)
- last seen: 2026-11-03T19:03:24Z

### L-063 - When a check lists a position for a state on several screens, measure that state on each screen; proving it on one screen repeats L-059
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: login-institucional
- evidence: C7; web/e2e/arranjo.spec.ts:1437-1442 (Criar senha success Alert unmeasured) (web-tests)
- last seen: 2026-11-03T20:25:41Z

### L-064 - When Screens says 'centred' for an element, write both the horizontal and the vertical claim (or say which one) and name every text the 'centrado' covers, not only the h1
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: login-institucional
- evidence: C15, C6; plan.md:83,89 (specs/checks)
- last seen: 2026-11-03T20:25:41Z

### L-065 - A text check that promises every state of every screen must enumerate the error states of each form screen, not only the ones the old test already had
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: login-institucional
- evidence: C18; web/src/acesso/textos.test.tsx:95-117 (web-tests)
- last seen: 2026-11-03T20:25:41Z

### L-066 - Conte os logins de cada spec e2e contra Limites:AuthPorMinuto (5 por IP por minuto); um spec novo que loga várias vezes estoura o limite e dá 429 na suíte inteira.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `web/e2e` · harmful: 0
- features: anexos-assistente
- evidence: web/e2e/anexos.spec.ts:49 (web/e2e)
- last seen: 2026-11-04T17:58:20Z

### L-067 - Quem acrescenta rota, entidade ou caso de uso põe na lista fechada do checks.md as contagens estruturais de ArquiteturaTests, MediatorTests e SessaoTests que vão subir.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: anexos-assistente
- evidence: api.Tests/ArquiteturaTests.cs:19 (specs/checks)
- last seen: 2026-11-04T17:58:20Z

### L-068 - Uma falha de dependência afirmada para duas rotas precisa de uma prova em cada rota; a linha de Coverage não pode citar o check de uma rota pela outra.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/coverage` · harmful: 0
- features: anexos-assistente
- evidence: checks.md C16 (specs/coverage)
- last seen: 2026-11-04T17:58:20Z

### L-069 - Não condicione uma asserção de arranjo a if (await x.count()); se o elemento some, o teste passa sem medir nada. Afirme a contagem antes.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web/e2e` · harmful: 0
- features: aparencia-instituicao
- evidence: web/e2e/celular.spec.ts:95 (web/e2e)
- last seen: 2026-11-04T21:19:21Z

### L-070 - Dê um check a cada frase de arranjo de ## Screens ao escrever checks.md, inclusive colunas por largura, posição de ícone e de faixa.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `specs/ui` · harmful: 0
- features: aparencia-instituicao
- evidence: plan.md ## Screens (specs/ui)
- last seen: 2026-11-04T21:19:21Z

### L-071 - Quando um check distingue dois conjuntos (citadas x buscadas), a massa de teste precisa de um membro que só exista no conjunto excluído; sem ele, trocar um pelo outro passa.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api.Tests` · harmful: 0
- features: protecao-injecao
- evidence: api.Tests/Infra/Cenario.cs:11 (api.Tests)
- last seen: 2026-11-04T21:45:40Z

### L-072 - Meça centralização nos elementos centralizados, nunca no contêiner de largura total que os contém; o contêiner sempre fica no centro.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web/e2e` · harmful: 0
- features: aparencia-instituicao
- evidence: web/e2e/aparencia.spec.ts:151 (web/e2e)
- last seen: 2026-11-04T22:02:57Z

### L-073 - Um check com 'A (ou B)' precisa de uma prova com A e outra com B; testar só com a foto deixa a ilustração sem prova.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web/e2e` · harmful: 0
- features: aparencia-instituicao
- evidence: web/e2e/aparencia.spec.ts C65 (web/e2e)
- last seen: 2026-11-04T22:20:24Z

### L-074 - Cada separador ou classe de caractere que uma regra pura nomeia precisa de um caso de teste que só passa por ele.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `api.Tests` · harmful: 0
- features: protecao-injecao
- evidence: api/Assistente/Conferencia.cs:38 (api.Tests)
- last seen: 2026-11-04T22:20:24Z

### L-075 - Para provar 'na mesma transação', faça falhar a gravação de dentro e confira que o resto não ficou; falhar só o commit não distingue gravar antes ou depois.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api.Tests` · harmful: 0
- features: instituicoes-plataforma
- evidence: checks C10 (api.Tests)
- last seen: 2026-11-04T23:29:06Z

### L-076 - Meça o alinhamento contra a borda que o check nomeia; usar um vizinho como substituto consome a tolerância e deixa passar um erro de 1 px.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web/e2e` · harmful: 0
- features: instituicoes-plataforma
- evidence: web/e2e/instituicoes.spec.ts:22 (web/e2e)
- last seen: 2026-11-04T23:49:12Z

### L-077 - Uma varredura de cor em gráfico precisa esperar as barras desenharem; medir antes do render passa com qualquer cor.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web/e2e` · harmful: 0
- features: revisao-ux
- evidence: web/e2e/ux.spec.ts C57 (web/e2e)
- last seen: 2026-11-05T02:01:12Z

### L-078 - Lista numerada com li em display:flex perde o marcador; prove o número como texto visível, não só a tag ol.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: revisao-ux
- evidence: web/src/administracao/Matriculas.tsx:44 (web)
- last seen: 2026-11-05T02:01:12Z

### L-079 - Uma cláusula sobre a cor pintada precisa de prova no navegador; no jsdom o teste que injeta o próprio CSS só confere a si mesmo.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: revisao-ux
- evidence: web/src/administracao/aparencia.test.tsx:74 (web)
- last seen: 2026-11-05T02:36:50Z

### L-080 - 'Nenhum erro é lançado' precisa afirmar o estado da consulta (success), não só espiar console.error; o erro do React Query fica silencioso.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: ajustes-push-e-links
- evidence: web/src/assistente/avisos.test.tsx C2 (web)
- last seen: 2026-11-05T03:29:19Z

### L-081 - Valide URL por lista de formatos permitidos, não por prefixo: '/\host' e '/<tab>/host' começam com '/' e o navegador resolve para outro site.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: push-com-marca
- evidence: web/src/sw.ts:25 (web)
- last seen: 2026-11-05T04:02:12Z

### L-082 - Mudar o dado de um teste pode esvaziar uma asserção negativa (procurar 'One' que sumiu); confira cada asserção de ausência depois de trocar o dado.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `api.Tests` · harmful: 0
- features: push-com-marca
- evidence: api.Tests/PushEnviadorTests.cs:63 (api.Tests)
- last seen: 2026-11-05T04:02:12Z

### L-083 - When a value depends on two queries, test the state where one response is still pending, not only the final states
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md F4d, Indicadores.tsx:219 (web)
- last seen: 2026-11-05T06:33:45Z

### L-084 - A guard on a flag needs a case where the flag is set and every other field would pass
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md F4e, Indicadores.tsx:218 (web)
- last seen: 2026-11-05T06:33:45Z

### L-085 - Assert the order of every item a screen enumerates, not only the pairs a check happens to name
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md L13, Assistente.tsx BoasVindas (web)
- last seen: 2026-11-05T06:33:45Z

### L-086 - Re-measure field border contrast on every new tinted surface; a token pair proven on one background does not hold on another
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md finding 2, ChamadoDetalhe.tsx:113 (web)
- last seen: 2026-11-05T06:33:45Z

### L-087 - A plain control that replaces a Button must keep a focus indicator of 3:1 and have a check for it
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md finding 1, Assistente.tsx:194 (web)
- last seen: 2026-11-05T06:33:45Z

### L-088 - Measure a side-by-side arrangement with the longest text at the narrowest supported width
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md finding 5, C27 (web)
- last seen: 2026-11-05T06:33:45Z

### L-089 - A precache size limit must state the total of what the glob precaches, not only the files the app requests
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md finding 8, C8, vite.config.ts:33 (web)
- last seen: 2026-11-05T06:33:45Z

### L-090 - When a check names a role, assert something only that role's view shows; a session role in a fixture does not change a screen decided by the response
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md fault border only for staff, web/e2e/identidade.spec.ts:1135 (web)
- last seen: 2026-11-05T07:20:57Z

### L-091 - A dark variant override on a component with state variants also beats its focus and invalid styles; measure those states after any class override
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md finding 2, web/src/chamados/ChamadoDetalhe.tsx:116 (web)
- last seen: 2026-11-05T07:20:57Z

### L-092 - Give fixtures the optional data that renders conditional controls, or contrast sweeps never see those controls
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: identidade-visual
- evidence: verification.md finding 1, web/src/chamados/ChamadoDetalhe.tsx:55 (web)
- last seen: 2026-11-05T07:20:57Z

### L-093 - A rule that repeats a token's formula needs a literal assertion beside the token's own pin, because a contrast floor cannot see it drift
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `css-tokens` · harmful: 0
- features: identidade-visual
- evidence: verification.md F2, F11, F12; web/src/index.css:101-103 (css-tokens)
- last seen: 2026-11-05T08:11:35Z

### L-094 - A test that pins the only rule naming a selector must count its mentions in the whole file, because a line-based regex cannot see a selector list broken across lines
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `css-tokens` · harmful: 0
- features: identidade-visual
- evidence: verification.md F18; web/src/test/interface.test.ts:193 (css-tokens)
- last seen: 2026-11-05T11:16:28Z

### L-095 - Corrects L-094: counting mentions of a selector is not enough either; to prove where a CSS rule applies, measure the computed value in the browser against a control, because text has more spellings than any regex
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `css-tokens` · harmful: 0
- features: identidade-visual
- evidence: verification.md F29 (round 5); web/e2e/identidade.spec.ts C57 (css-tokens)
- last seen: 2026-11-05T12:24:23Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
