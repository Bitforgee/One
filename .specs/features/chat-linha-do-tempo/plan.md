# Chat com linha do tempo única e compositor alinhado

## Problem

Dois defeitos no chat, vistos nos prints de 08/11 (`demo-live-8-aluna-resposta.png`, 1872 px; `demo-live-4-chamado.png`, 1280 px).

1. No Assistente, no desktop, os controles do compositor não se alinham. O clipe de anexo fica fora do campo, 16 px à esquerda da coluna das mensagens, e "Falar com atendente" e "Encerrar" começam no x da coluna. São três alinhamentos para a mesma caixa. O campo é uma linha de 44 px solta no fim de uma tela vazia, e o "Enviar" ocupa o canto.
2. No detalhe do chamado, o que aconteceu está espalhado em quatro blocos: "Conversa com o assistente", "Atendimento" (mensagens), "Histórico" (eventos como "assumiu") e o formulário de resposta. Na equipe, o Histórico fica na coluna da direita, separado das mensagens. Para saber "quem assumiu antes de responder?" o atendente rola a coluna da esquerda e a da direita e cruza os horários de cabeça. Quanto maior a conversa, pior.

Quem paga: a aluna, que usa o Assistente, e o atendente, que lê o chamado para decidir. Evidência: os dois prints e o relato do dono do projeto em 08/11. Não há medida de uso, porque não há produção.

Depois disto, o compositor é uma caixa só, com tudo alinhado a ela. O chamado mostra uma única sequência cronológica, do mais antigo ao mais novo, em que cada evento (assumiu, encaminhou, resolveu) aparece entre as mensagens, na hora em que aconteceu, como no timeline do GLPI 10.

## Flow

Reusa `Balao`, `frase(evento)` e `Historico` já existentes, sem formatador novo e sem mudar a API: `mensagens[].criadaEm` e `eventos[].criadoEm` já chegam em `GET /api/chamados/{numero}`.

1. `GET /api/chamados/{numero}` (exists) - devolve `mensagens`, `eventos` (só equipe) e `transcricao`, sem mudança
2. `Detalhe` em `web/src/chamados/ChamadoDetalhe.tsx` (exists) - passa mensagens e eventos à linha do tempo, no lugar de `Mensagens` e `Historico`
3. `LinhaDoTempo` (new, no door - placement per conventions) em `web/src/chamados/Conversa.tsx` - mistura mensagens e eventos por data e escreve cada item: balão para mensagem, linha centrada para evento
4. `Responder` (exists) - fica colado ao fim da coluna principal (sticky) em 1024 px ou mais
5. `Entrada` em `web/src/assistente/Assistente.tsx` (exists) - o compositor do aluno vira uma caixa com borda; `BotaoAnexar` (exists) entra nela

## Impact

| Front | What changes |
| --- | --- |
| `Historico` (exists, exportado de `Conversa.tsx`) | sai da coluna da direita; os eventos passam a viver na linha do tempo. Quem o importa hoje: só `ChamadoDetalhe.tsx` |
| testes que codificam o Histórico separado | `chamado.test.tsx` (linhas 70, 71, 219, 234), `resposta.test.tsx` (170), `icones.test.tsx` (25-27) buscam `getByTestId('eventos')` e o título "Histórico"; `identidade.spec.ts` C33 e `arranjo.spec.ts` (170) medem a seção "Histórico". São asserções de features fechadas (`historico-legivel`, `historico-frases`, `identidade-visual`, `estrutura-visual`) que deixam de descrever a tela: precisam de emenda aprovada por você, nunca de edição silenciosa (regra 3 da skill) |
| `AD-037` (`estrutura-visual`) | "o compositor é um campo simples com Enviar escrito" continua verdadeiro para o campo; muda só que ele passa a morar numa caixa com o clipe dentro. Um AD novo registra isso |
| `Transcricao` (exists) | passa a vir recolhida, com a contagem de mensagens no título; antes ocupava a primeira tela inteira |
| domain | nenhum termo novo; "Histórico" deixa de ser título de bloco e vira filtro "Eventos" |
| stored data | nothing to migrate - só web, sem API, sem migration |

## Relations

None - no stored-data shape change.

## Surface

None - nothing consumed outside. Nenhuma rota nova nem alterada; o contrato de `GET /api/chamados/{numero}` não muda.

## Landing

None - tudo se desfaz com refactor: só web, sem schema, sem contrato novo, sem dependência nova (usa `details`/`Collapsible` já em `web/src/ui/`, se existir, ou `<details>` nativo).

- Nothing else in this change is hard to reverse

## Criteria

### S1: O compositor do aluno fica numa caixa alinhada (P1)

No Assistente, o clipe, o campo, o "Enviar" e os dois botões de ação ficam alinhados à mesma coluna.

**Acceptance Criteria**

1. WHEN a aluna abre o Assistente em 768 px ou mais THEN the system SHALL desenhar o compositor como uma caixa com borda, da largura da coluna de mensagens (`max-w-3xl`), com o clipe de anexo dentro dela, à esquerda, e o "Enviar" dentro dela, à direita
2. The system SHALL alinhar a borda esquerda de "Falar com atendente" à borda esquerda da caixa do compositor, com diferença de no máximo 1 px, e a direita de "Enviar" à borda direita da caixa, com diferença de no máximo 1 px, em 768, 1280 e 1872 px
3. WHEN o campo cresce com o texto até 208 px (`max-h-52`) THEN the system SHALL manter o clipe e o "Enviar" encostados na borda de baixo da caixa, com diferença de no máximo 2 px entre a base de cada um e a base do campo
4. WHEN a aluna anexa um arquivo THEN the system SHALL mostrar os selos dentro da caixa, acima do campo, e a ajuda "PDF ou foto, até 10 MB" abaixo da caixa
5. WHILE a tela tem menos de 768 px the system SHALL manter a caixa em toda a largura, sem rolagem horizontal, com "Falar com atendente" e "Encerrar" quebrando de linha se faltar espaço, cada um com 44 px de altura mínima
6. WHEN o Assistente está sem conversa em 1024 px ou mais THEN the system SHALL manter a caixa do compositor colada ao fim da tela, com as perguntas sugeridas acima dela
7. IF a aluna chega ao limite de 10 mensagens THEN the system SHALL esconder a caixa do compositor e manter só os botões de ação, como hoje

**Independent test:** abrir o Assistente a 1872 px, mandar uma mensagem e medir as caixas do clipe, do campo, do "Enviar" e do "Falar com atendente" com o Playwright.

### S2: O chamado mostra uma só sequência cronológica (P1)

Mensagens e eventos aparecem juntos, na ordem em que aconteceram, no detalhe do chamado.

**Acceptance Criteria**

8. WHEN a equipe abre um chamado THEN the system SHALL mostrar um só bloco "Atendimento", com as mensagens do atendimento e os eventos em uma lista ordenada (`ol`) do mais antigo ao mais novo, ordenada por `criadaEm` ou `criadoEm`
9. The system SHALL escrever cada evento numa linha de uma só linha, centrada, com o texto de `frase(evento)` e a data, sem balão, de modo que "Carla assumiu a solicitação" apareça entre a mensagem anterior e a seguinte pelo horário
10. IF uma mensagem e um evento têm o mesmo instante THEN the system SHALL mostrar o evento antes da mensagem
11. WHEN o chamado é aberto pelo aluno (`eventos` nulo) THEN the system SHALL mostrar só as mensagens, sem nenhum evento e sem o filtro "Eventos"
12. IF o chamado não tem mensagem nem evento a mostrar THEN the system SHALL escrever "Nenhuma resposta ainda."
13. WHEN a equipe desmarca "Eventos" no filtro do bloco THEN the system SHALL esconder as linhas de evento e manter as mensagens e as notas; o filtro começa marcado
14. The system SHALL remover o bloco "Histórico" da coluna da direita, deixando nela só "Etapa n de m" e as ações
15. WHEN a equipe executa uma ação (Assumir, Encaminhar, Resolver) THEN the system SHALL mostrar o evento novo no fim da sequência sem recarregar a página, com o texto de `frase(evento)` já usado hoje

**Independent test:** abrir o ONE-123 da equipe com 2 mensagens e 3 eventos e ler a ordem dos itens da lista.

### S3: A conversa longa não esconde a resposta (P1)

O atendente responde e age sem rolar a página inteira.

**Acceptance Criteria**

16. WHEN o chamado tem conversa com o assistente THEN the system SHALL mostrar "Conversa com o assistente · n mensagens" recolhida, e abri-la mostra os mesmos balões de hoje, com as fontes citadas
17. WHILE a janela tem 1024 px ou mais, the system SHALL manter o formulário de resposta (`Responder`) visível no fim da área de rolagem, colado à borda de baixo da coluna principal, enquanto o atendente rola a linha do tempo
18. WHILE o detalhe está em duas colunas (a partir de 1328 px de janela com a barra aberta), the system SHALL manter o cartão de ações (Assumir, Encaminhar, Resolver) visível na coluna da direita enquanto a linha do tempo rola, como já faz
19. WHEN a equipe abre um chamado com mais de uma tela de itens THEN the system SHALL oferecer o botão "Ir para o mais recente", que rola a lista até o último item
20. WHILE a janela tem menos de 1024 px the system SHALL manter a barra fixa de ações atual, e o formulário de resposta fica no fluxo, sem `sticky`

**Independent test:** abrir um chamado com 40 itens a 1280 px, rolar 600 px e ver o campo de resposta e o botão "Assumir" na tela.

## Out of scope

| Excluded | Why |
| --- | --- |
| Abas de formulário "Responder / Nota / Tarefa / Solução" do GLPI | o One já tem "Nota interna" como marca no formulário; abas mudariam o fluxo de resposta, e tarefas não existem no produto |
| Filtros por tipo além de "Eventos" (só mensagens, só notas) | uma chave basta para esconder o ruído; o resto é capacidade nova |
| Linha do tempo para o aluno com eventos | o aluno não recebe `eventos` (historico-legivel, AD de privacidade); mudar isso é decisão de produto e de API |
| Lista de chamados, Indicadores, Cadastros | não fazem parte do chat |
| Mudar a API ou o schema | nada do que precisa vir falta na resposta atual |
| Realtime na linha do tempo do aluno | `tempoReal.test.tsx` já cobre a atualização atual e não muda |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Onde ficam "Falar com atendente" e "Encerrar" | acima da caixa, alinhados à esquerda dela (não dentro da caixa) | GLPI e Zendesk deixam ações de caso fora do campo de texto; dentro da caixa competem com o clipe e o Enviar | n |
| A conversa com o assistente vem recolhida | recolhida para aluno e equipe, com a contagem no título | o resumo por IA já está no topo para a equipe, e a conversa longa empurra o Atendimento para baixo (problema 2) | n |
| Evento e mensagem no mesmo instante | evento antes da mensagem | "assumiu" costuma preceder a primeira resposta do atendente | n |
| Rolar ao abrir | a página abre no topo, com o botão "Ir para o mais recente"; não rola sozinha | rolar sozinho esconde o título e o estado do chamado | n |
| Filtro "Eventos" | começa marcado e não persiste ao recarregar | o histórico é o que a equipe lê para decidir; esconder é opção | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `Assistente` | empty state | AC 6 |
| screen `Assistente` | loading state (envio pendente) | existing - Spinner no "Enviar" e "digitando…", sem mudança |
| screen `Assistente` | error state | existing - `FalhaDoEnvio` com "Reenviar", sem mudança |
| screen `Assistente` | unauthorised | n/a - a rota exige sessão e o papel do aluno, sem mudança |
| screen `Assistente` | density and ordering | AC 1, AC 2, AC 3, AC 5 |
| screen `Assistente` | destructive action confirms | existing - `Confirmacao` de "Encerrar" |
| screen `ChamadoDetalhe` | empty state | AC 12 |
| screen `ChamadoDetalhe` | loading state | existing - `Carregando` |
| screen `ChamadoDetalhe` | error state | existing - `ErroDe` e `AlertaDaAcao` |
| screen `ChamadoDetalhe` | unauthorised | AC 11 |
| screen `ChamadoDetalhe` | density and ordering | AC 8, AC 9, AC 10, AC 16 |
| screen `ChamadoDetalhe` | destructive action confirms | existing - `Confirmacao` de Cancelar solicitação |

## Sources

- Prints `demo-live-8-aluna-resposta.png` e `demo-live-4-chamado.png` (08/11) - os dois defeitos
- GLPI 10, "Discover new interface of GLPI 10!" (glpi-project.org/en/glpi-interface-new-version): a timeline passa do mais antigo ao mais novo, de cima para baixo, com a resposta nova abaixo da última, painel lateral com os dados do chamado e documentos aninhados à mensagem
- Zendesk, "Before and after activating the Agent Workspace" (support.zendesk.com): comentários mais novos embaixo, nota interna em fundo amarelo
- `.specs/STATE.md` AD-029 (layout do painel), AD-037 (compositor)
