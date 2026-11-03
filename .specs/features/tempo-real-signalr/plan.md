# Tempo real com SignalR

## Problem

Hoje a tela de um chamado aberta só descobre que o atendente respondeu (ou que o chamado mudou de estado) quando o relógio dá 15 s: `useChamado` usa `refetchInterval: 15_000` (mvp-one door 18). A fila do atendente não se atualiza sozinha: um chamado novo ou reclassificado só aparece quando a pessoa recarrega a tela. Quem paga é o aluno, que fica olhando uma conversa parada até 15 s depois de a resposta existir, e o atendente, que trabalha numa fila velha. A decisão de usar polling foi tomada no mvp-one porque o atendimento é lento (minutos ou horas); o usuário reverteu a decisão em 02/11/2026 (AD-022): o SignalR entra antes da banca. A fonte não traz medida de custo nem de volume; o que existe é a decisão do usuário e a data da banca.

Quando isto entrar, a tela do chamado e a fila do atendente se atualizam no instante em que o dado muda no servidor. A resposta da IA continua indo inteira, só depois da conferência dos trechos (AD-012), e nunca chega aos poucos. Quando a conexão cai (PWA em segundo plano, rede ruim), as telas voltam sozinhas ao comportamento de hoje.

## Flow

Reaproveita `ChamadoRotas.Carregar` (a mesma regra de quem vê qual chamado que o `GET /api/chamados/{numero}` usa), as rotas `GET` existentes como única fonte de dados e a invalidação de consultas do TanStack Query; o hub só avisa que algo mudou.

1. Navegador autenticado (cookie `one.auth`) -> `HubConnection` de `@microsoft/signalr` (door 2) -> `/api/tempo-real`; `Sessao.Validar` e `Sessao.ExigirTrocaDeSenha` (exist) autenticam e barram quem deve trocar a senha, como em qualquer rota de `/api`.
2. `TempoRealHub` (door 1) - `EntrarNoChamado(numero)` chama `ChamadoRotas.Carregar` (exists) com o usuário relido do banco e a instituição do cookie; se enxerga o chamado, entra no grupo `chamado:{instituicaoId}:{numero}` (door 3). `EntrarNaFila()` entra, para um atendente, nos grupos `fila:{instituicaoId}:{setorId}` dos seus setores (`AtendenteSetores`, exists).
3. Qualquer gravação em `OneDb` (exists) -> `AvisarMudanca` (door 4), interceptador de `SaveChanges`, junta os chamados tocados (a entidade `Chamado`, uma `MensagemChamado` ou um `EventoChamado` novo) e, só depois do commit, manda por `IHubContext<TempoRealHub>` o `ChamadoMudou(numero)` ao grupo do chamado e o `FilaMudou()` ao grupo da fila do setor (o antigo e o novo, quando o setor mudou).
4. `web/src/tempo-real.ts` (new, no door - placement per conventions) guarda a conexão e o estado dela; ao receber o aviso chama `invalidateQueries` na consulta do chamado ou da fila, e `useChamado` e `ListaDeChamados` (exist) releem pelo `GET` de sempre.
5. Fallback: `useChamado` (exists) mantém `refetchInterval`, que passa a depender do estado da conexão (15 s sem conexão, 60 s com conexão como rede de segurança).

Os caminhos que gravam chamado e ficam cobertos sem mudar de código: as ações do `AgirNoChamado` (exists), `Transferencia.Criar` (exists, dentro de transação explícita) e as tarefas do `Agendador` (exists, que também usa transação e `ExecuteUpdateAsync`, mas sempre grava um `EventoChamado` na mesma unidade).

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `sinal de mudança` (`ChamadoMudou`, `FilaMudou`) - aviso sem dado de que um chamado mudou; vive em `api/Chamados/` e em `web/src/tempo-real.ts` |
| domain | existing term: o polling de 15 s (mvp-one door 18) deixa de ser o mecanismo e vira fallback - quem depende dele: `useChamado` (usado por `ChamadoDetalhe` e `Assistente.tsx` na transferência), `chamado.test.tsx` C41, `transferencia.test.tsx` ('atualiza chamado a cada 15 s') e C94 em `interface.test.ts` (exige a palavra `refetchInterval` em `chamado.ts`); todos continuam verdadeiros porque sem conexão o intervalo segue 15 s |
| domain | existing term: `OneDb` passa a ter um interceptador de `SaveChanges`; todo `SaveChangesAsync` da API (35 pontos) passa por ele. O `ContadorDeGravacoes` dos testes (também interceptador) conta chamadas, não é afetado |
| web | `vite.config.ts`: o proxy `/api` do dev precisa de `ws: true`; o service worker já nega `/api/*` (`navigateFallbackDenylist`) e não cacheia nada de API |
| web tests | `src/test/setup.ts` passa a trocar `@microsoft/signalr` por uma conexão falsa em todos os testes, para a conexão real não tentar o `negotiate` no jsdom; as asserções dos testes existentes não mudam |
| stored data | nada para migrar: grupos e conexões vivem na memória do processo, nenhuma tabela nova |
| infra | uma só instância da API (AD-022); com duas, os avisos só chegam a quem está conectado na mesma instância - Redis (backplane) e sessão fixa entram nessa hora |

## Relations

None - no stored-data shape change

## Surface

Só a conexão do hub e seus métodos; as rotas `GET` de chamado e fila não mudam.

| Route | In | Out | Status |
| --- | --- | --- | --- |
| `POST /api/tempo-real/negotiate` | cookie `one.auth` | dados de conexão do SignalR | `200`, `401`, `403` |
| `WS /api/tempo-real` | cookie `one.auth` | conexão aberta | `101`, `401`, `403` |
| hub `EntrarNoChamado` | `numero` | nada | conclui sem erro (equivale a `200`), `HubException "Chamado não encontrado."` (equivale a `404`), `HubException "Sessão inválida."` (equivale a `401`) |
| hub `SairDoChamado` | `numero` | nada | conclui sem erro (equivale a `200`) |
| hub `EntrarNaFila` | nada | nada | conclui sem erro (equivale a `200`), `HubException "A fila é só para atendentes."` (equivale a `403`), `HubException "Sessão inválida."` (equivale a `401`) |
| client `ChamadoMudou` | `numero` | nada | enviado ao grupo do chamado, nunca devolvido ao chamador (sem código HTTP; equivale a `200`) |
| client `FilaMudou` | nada | nada | enviado ao grupo da fila do setor (sem código HTTP; equivale a `200`) |

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. Contrato do hub | hub `TempoRealHub` em `/api/tempo-real`; métodos `EntrarNoChamado(string numero)`, `SairDoChamado(string numero)`, `EntrarNaFila()`; eventos para o cliente `ChamadoMudou(string numero)` e `FilaMudou()`; nenhum evento leva texto, estado, autor ou anexo | mandar o dado (a mensagem nova) no evento: duplica a regra de quem vê o quê fora do `GET` (nota interna, fontes, resumo só da equipe) e abre caminho para texto da IA chegar fora da conferência do AD-012 |
| 2. Dependência | `@microsoft/signalr` no `web/` com versão exata no `package.json` (como as demais); `Microsoft.AspNetCore.SignalR.Client` só no `api.Tests`; o servidor usa o SignalR do framework (`AddSignalR`, `MapHub`), sem pacote novo | `EventSource` (SSE) próprio, só servidor para cliente: sem grupos nem reconexão prontos, a cada recurso faltando o código é nosso; WebSocket cru pelo mesmo motivo |
| 3. Nome dos grupos | `chamado:{instituicaoId}:{numero}` e `fila:{instituicaoId}:{setorId}`; a instituição vem do cookie, nunca do cliente | grupo só com o número: `ONE-1` existe em toda instituição (o número é por instituição), então um aluno da instituição B entraria no grupo do chamado de mesmo número da A. Grupo por usuário: o servidor teria de achar a cada mudança quem participa do chamado (aluno, atendentes do setor) |
| 4. Ponto do aviso | interceptador `AvisarMudanca : SaveChangesInterceptor` registrado nas opções do `OneDb`; quando há transação explícita, o envio espera o commit | chamar o envio dentro do `AgirNoChamado`: fica de fora `Transferencia`, o `Agendador` e qualquer gravação futura, e esquecer a chamada vira bug silencioso (a tela não atualiza) |
| 5. Método do `negotiate` (achada no build) | o `MapHub` ganha `.Add(...)` que põe `HttpMethodMetadata(["POST"])` só no endpoint `/api/tempo-real/negotiate`; o do WebSocket fica sem método declarado (a linha de `rotas.txt` é `* /api/tempo-real`) | pôr `GET` no endpoint do WebSocket: o mesmo endpoint atende o long polling (`POST` e `DELETE`), então a queda de transporte quebraria; deixar o `negotiate` sem método: a linha `POST /api/tempo-real/negotiate` que C3 exige não existiria |

- Nada mais nesta mudança é difícil de reverter: o intervalo de segurança, os textos de erro do hub e o formato do estado da conexão no `web/` mudam em um commit

## Criteria

### S1: Só entra no grupo quem pode ver o chamado ou a fila (P1)

A conexão usa o cookie que já existe, e cada entrada em grupo repete a regra do `GET /api/chamados/{numero}`.

**Acceptance Criteria**

1. IF a requisição a `/api/tempo-real/negotiate` chega sem cookie `one.auth` válido THEN the system SHALL responder `401` e não abrir conexão.
2. IF o usuário autenticado tem `DeveTrocarSenha` THEN the system SHALL responder `403` ao `negotiate`, com o mesmo texto "Troque a senha para continuar." das demais rotas.
3. WHEN um usuário chama `EntrarNoChamado(numero)` de um chamado que `ChamadoRotas.Carregar` entrega a ele (solicitante, ou atendente de um setor do chamado) THEN the system SHALL colocar a conexão no grupo `chamado:{instituicaoId}:{numero}`.
4. IF o chamado não existe, é de outra instituição ou o usuário não é solicitante nem atendente do setor THEN the system SHALL lançar `HubException` com o texto "Chamado não encontrado." (o mesmo do `GET`) e não colocar a conexão em grupo algum.
5. WHEN um usuário com papel `ATENDENTE` chama `EntrarNaFila()` THEN the system SHALL colocar a conexão em `fila:{instituicaoId}:{setorId}` para cada setor que ele atende.
6. IF um usuário sem papel `ATENDENTE` chama `EntrarNaFila()` THEN the system SHALL lançar `HubException` com o texto "A fila é só para atendentes." e não colocar a conexão em grupo algum.
7. WHEN o hub atende qualquer método THEN the system SHALL reler o usuário no banco com a instituição do cookie (e não confiar no `ClaimsPrincipal` guardado desde a conexão), e IF o usuário ou a instituição estiver inativo THEN the system SHALL lançar `HubException` com o texto "Sessão inválida.".

**Independent test:** cliente .NET com o cookie de um aluno entra no próprio chamado e é recusado no de outro aluno; o atendente de outro setor também é recusado.

### S2: O servidor avisa depois de cada gravação que muda um chamado (P1)

Todo caminho que grava chamado avisa, sem que cada ação lembre de chamar.

**Acceptance Criteria**

8. WHEN uma gravação confirma a criação ou a alteração de um `Chamado`, de uma `MensagemChamado` ou de um `EventoChamado` THEN the system SHALL enviar `ChamadoMudou(numero)` ao grupo `chamado:{instituicaoId}:{numero}` e `FilaMudou()` ao grupo `fila:{instituicaoId}:{setorId}` do setor do chamado.
9. WHEN `Transferencia.Criar` confirma o commit de um chamado novo THEN the system SHALL enviar `FilaMudou()` ao grupo da fila do setor roteado, e nenhum aviso antes do commit.
10. WHEN uma tarefa do `Agendador` (fechamento automático, lembrete ou volta para resolvido) confirma a gravação THEN the system SHALL enviar os mesmos dois avisos do chamado afetado.
11. WHEN `encaminhar` ou `reclassificar` muda o setor de um chamado THEN the system SHALL enviar `FilaMudou()` ao grupo da fila do setor antigo e ao do novo.
12. WHILE a gravação está dentro de transação explícita the system SHALL enviar os avisos só depois do commit, de modo que o `GET` disparado pelo aviso já veja a mudança.
13. IF o `SaveChanges` falha ou a transação é desfeita THEN the system SHALL não enviar aviso algum.
14. IF o envio ao hub falha THEN the system SHALL manter inalterada a resposta da ação (status e corpo) e registrar um aviso no log com o id do chamado e da instituição, sem texto de mensagem.
15. WHEN um chamado de uma instituição muda THEN the system SHALL não entregar `ChamadoMudou` nem `FilaMudou` a conexão de outra instituição, mesmo com o mesmo número de chamado.
16. WHILE o assistente gera ou entrega uma resposta numa conversa que não virou chamado the system SHALL não enviar evento algum do hub, e a resposta continua sendo entregue inteira no corpo da resposta da própria chamada (AD-012).
17. The system SHALL enviar em `ChamadoMudou` apenas o número do chamado e em `FilaMudou` nenhum argumento.

**Independent test:** teste de integração com o cliente .NET: aluno e atendente conectados, o atendente responde pela API e o aluno recebe `ChamadoMudou("ONE-n")`; um aluno de outra instituição conectado não recebe nada.

### S3: As telas do chamado e da fila reagem ao aviso (P1)

A tela relê pelo `GET` de sempre assim que o aviso chega; sem conexão, tudo continua como hoje.

**Acceptance Criteria**

18. WHEN a tela de um chamado está aberta e chega `ChamadoMudou(numero)` desse chamado THEN the system SHALL invalidar a consulta `['chamado', numero]` e mostrar o dado novo sem esperar o intervalo.
19. WHEN a fila do atendente está aberta e chega `FilaMudou()` THEN the system SHALL invalidar a consulta da fila (`escopo=fila`) e mostrar a lista nova.
20. WHEN a tela de um chamado abre THEN the system SHALL chamar `EntrarNoChamado(numero)`, e WHEN ela fecha THEN the system SHALL chamar `SairDoChamado(numero)`; a fila chama `EntrarNaFila()` ao abrir.
21. WHILE a conexão não está `Connected` the system SHALL reler o chamado a cada 15 s (`IntervaloAtualizacao`), e WHILE está `Connected` the system SHALL reler a cada 60 s como rede de segurança.
22. WHEN a conexão volta de uma queda (`onreconnected`) THEN the system SHALL chamar de novo `EntrarNoChamado` e `EntrarNaFila` para as telas abertas (os grupos não sobrevivem à nova conexão) e invalidar as consultas delas, porque avisos da queda se perderam.
23. WHILE o usuário está autenticado e a conexão está fechada the system SHALL tentar reabrir a cada 30 s no máximo, e WHEN a aba volta a ficar visível THEN the system SHALL tentar de imediato.
24. WHEN o usuário sai (logout) THEN the system SHALL encerrar a conexão, e WHEN entra THEN the system SHALL abrir uma nova.
25. IF a conexão não abre (servidor fora, `negotiate` recusado) THEN the system SHALL manter as telas funcionando pelo polling de 15 s, sem mensagem de erro nova.

**Independent test:** teste do Vitest com conexão falsa: dispara `ChamadoMudou('ONE-1')` e o texto novo aparece sem avançar o relógio; derruba a conexão e o `GET` volta a ser repetido a cada 15 s.

## Out of scope

| Excluded | Why |
| --- | --- |
| texto da IA chegando aos poucos (streaming) | AD-012: o servidor confere os trechos antes de mostrar; a resposta vai inteira |
| backplane (Redis) e sessão fixa | uma só instância na banca (AD-022); entram quando houver duas |
| aviso com o app fechado | é a feature `web-push`; a PWA em segundo plano perde a conexão e nada aqui tenta mantê-la |
| a lista "Minhas solicitações" do aluno em tempo real | a decisão cobre a tela do chamado e a fila do atendente |
| indicador visual de "conectado" ou "reconectando" | sem tela nova nesta feature; o usuário só nota que, sem conexão, a atualização volta a ser de 15 s |
| presença, "digitando", salas de conversa entre aluno e atendente | nenhuma decisão pediu |
| Azure SignalR Service e MessagePack | só com mais de uma instância; o JSON padrão basta para um aviso de poucos bytes |
| telas de administração e indicadores em tempo real | fora da decisão (AD-022) |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Intervalo de segurança com a conexão aberta | 60 s (AC 21) | um aviso perdido sem queda de conexão (falha de envio, AC 14) se repara em até 1 min; custo: 1 `GET` por minuto por tela aberta | y (usuário, 02/11/2026) |
| Nota interna e aluno | o aluno com a tela aberta também recebe `ChamadoMudou` quando só entrou uma nota interna; a releitura volta idêntica | separar em dois grupos por chamado (aluno e equipe) dobra a regra de entrada; o aviso não leva conteúdo, só revela que algo mudou | y (usuário, 02/11/2026) |
| Papel ou setor muda com a conexão aberta | os grupos de fila ficam como estavam até a próxima reconexão; o `GET` sempre confere de novo, então nenhum dado vaza | o `ClaimsPrincipal` fica guardado na conexão (documentação do SignalR); o sinal não tem conteúdo | n |
| Transporte | o padrão do SignalR (WebSocket, com queda para SSE e long polling) | o cliente e o servidor negociam sozinhos; a hospedagem pode barrar WebSocket | n |
| Prova com navegador real | automatizada: cliente .NET contra a API de teste e Vitest com conexão falsa; WebSocket pelo Kestrel dentro do Docker Compose fica no ensaio manual da etapa 5 | o e2e do Playwright usa API simulada; subir API e PostgreSQL só para isto custa mais que o risco | n |
| Caminho do hub | `/api/tempo-real` | já fica sob `/api`: o `navigateFallbackDenylist` da PWA e o `MapFallback("/api/...")` tratam do prefixo | n |
| Limite de taxa nas chamadas do hub | nenhum | cada entrada custa uma consulta indexada e só vale para chamado do próprio usuário | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `Chamado` | loading, error e unauthorised states | existing - o `GET` continua dono deles; a conexão não os altera (AC 25) |
| screen `Chamado` | empty state | n/a - a tela não tem estado vazio novo; "Nenhuma resposta ainda." já existe |
| screen `Chamado` | conexão caída | AC 21, AC 25 |
| screen `Fila` | empty state, error state | existing - `ListaDeChamados` mostra o vazio e o erro; o aviso só dispara a releitura (AC 19) |
| screen `Fila` | conexão caída | AC 25 |
| screen `Chamado` e `Fila` | ação destrutiva pede confirmação | n/a - nenhuma ação nova |
| API `POST /api/tempo-real/negotiate` e `WS /api/tempo-real` | error shape and codes, quem pode chamar | AC 1, AC 2 |
| hub `EntrarNoChamado`, `EntrarNaFila`, `SairDoChamado` | error shape (`HubException`) e quem pode chamar | AC 3, AC 4, AC 5, AC 6, AC 7 |
| all new hub endpoints | versioning, rate limits | n/a - o hub é consumido só pelo `web/` do mesmo repositório e publicado junto; rate limit na Assumption |

## Sources

- `.specs/STATE.md` AD-022 - o SignalR substitui o polling de 15 s, resposta da IA inteira depois da conferência (AD-012), uma instância, sem backplane
- `.specs/features/mvp-one/plan.md` door 18 - o polling de 15 s que isto substitui
- Microsoft Learn, "Authentication and authorization in ASP.NET Core SignalR" (.NET 10) - o cookie vale para o hub e o principal fica guardado na conexão; "ASP.NET Core SignalR JavaScript client" - `withAutomaticReconnect`, `IRetryPolicy`, `onreconnected` e novo `connectionId` a cada reconexão
