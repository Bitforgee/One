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
- signal: `spec_precision_gap` · recurrence: 3 feature(s) · scope: `specs/checks` · harmful: 0
- features: refatoracao-solid, dominio-e-contratos, arquivos-minio
- evidence: checks.md C21, C32 (verification.md precision gaps) (specs/checks) (+2 more)
- last seen: 2026-11-03T03:21:42Z

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

### L-029 - Ponha nas linhas Proof de um check todo teste que afirma uma parte da afirmação; a parte afirmada só noutro teste sobrevive às provas nomeadas.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: interface-nova
- evidence: verification.md F5; web/src/test/interface.test.ts:95 (web)
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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
