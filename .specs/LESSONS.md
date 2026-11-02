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

### L-021 - Tire de código a contagem de células e o caminho de rota escritos num check, não da memória; número ou rota errados no texto deixam o check sem prova literal.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: refatoracao-solid
- evidence: checks.md C21, C32 (verification.md precision gaps) (specs/checks)
- last seen: 2026-11-02T22:06:05Z

### L-022 - Quando a correção de um check acrescenta um teste em outra classe, acrescente o filtro dele às linhas Proof do check; sem isso o próprio proof do check não exercita a parte corrigida.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs/checks` · harmful: 0
- features: refatoracao-solid
- evidence: checks.md:125-126 C28 (verification.md rodada 2) (specs/checks)
- last seen: 2026-11-02T22:11:53Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
