# Histórico legível: cada evento do chamado como uma frase em português

## Problem

O Histórico do detalhe do chamado mostra os códigos internos do banco: `02/11/2026 08:10 TRANSICAO ·
Carla Regina de Souza · AGUARDANDO_ALUNO → EM_ATENDIMENTO`. Os 9 tipos de evento (`CRIACAO`,
`TRANSICAO`, `ATRIBUICAO`, `LEMBRETE`, `NOTA`, `RESPOSTA`, `ANEXO`, `ENCAMINHAMENTO`,
`RECLASSIFICACAO`) e os 5 estados saem crus, e o `detalhe` que a API já manda (motivo do
cancelamento, "Fechado automaticamente: 7 dias sem confirmação", nome do anexo, "Responsável
desativado") não aparece em lugar nenhum.

Quem paga: o atendente e o administrador, que leem a linha do tempo do chamado para entender o que
aconteceu, e o grupo na banca de 20/11, que mostra o detalhe do chamado como tela principal. Evidência:
a captura de 03/11 (`chamado-360-light.png`) e a observação do usuário de que "aparece na banca"; não
há medida de uso, porque não há produção.

**O que muda quando isto estiver pronto:** cada evento vira uma frase com quem fez e o que mudou, os
estados com os mesmos nomes do selo do chamado ("Aguardando aluno"), e o detalhe ao fim quando existe:
`02/11/2026 08:10 · Carla Regina de Souza mudou o estado de Aguardando aluno para Em atendimento`.

## Flow

Reusa o mapa `Estados` de `web/src/chamado.ts`, o mesmo do selo do chamado, em vez de criar outro.

1. `GET /api/chamados/{numero}` (exists) - devolve `eventos` só para a equipe, sem mudança
2. `web/src/chamado.ts` (exists) - ganha a função que monta a frase de um `Evento` (placement per conventions)
3. `Historico` em `web/src/chamados/Conversa.tsx` (exists) - mostra a data e a frase de cada evento, na ordem de hoje

## Impact

| Front | What changes |
| --- | --- |
| testes que codificam o formato cru | `src/chamados/chamado.test.tsx` "eventos em ordem no fuso" e a linha do Histórico em `src/chamados/textos.test.tsx` afirmam `TRANSICAO · Carla · ABERTO → EM_ATENDIMENTO`; são reescritos para as frases, mantendo a ordem e o fuso que já afirmam |
| `## Screens` da `interface-nova` (linha 9) | o texto "Histórico" fica; as linhas do histórico passam das variáveis cruas às frases de `## Screens` abaixo |
| domain | nenhum termo novo; `Estados` ganha um segundo consumidor |
| stored data | nothing to migrate - só a apresentação muda |
| API | nada; o contrato `DoEvento` (`tipo`, `ator`, `de`, `para`, `detalhe`, `criadoEm`) continua |

## Relations

None - no stored-data shape change.

## Surface

None - nothing consumed outside.

## Landing

None - a tradução é texto do `web/` e se desfaz num commit; a API e o banco continuam com os códigos, que os indicadores (`CalculoIndicadores`) usam.

## Screens

Fonte **binding**: a resposta do usuário de 03/11 ("Frase") e esta tabela. Linha 9 da `interface-nova`
(Detalhe do chamado), só a lista do Histórico; o resto da tela não muda.

Cada linha: `{dd/mm/aaaa hh:mm}` em `text-muted-foreground`, depois ` · ` e a frase; quando `detalhe`
não é nulo, a frase termina com ` · {detalhe}`. `{ator}` é o nome que a API manda (o `"Sistema"` dos
eventos do agendador inclusive). `{de}` e `{para}` de estado passam pelo `Estados`; de setor, categoria e
responsável saem como vieram.

| Tipo | Frase |
| --- | --- |
| `CRIACAO` | `{ator} abriu a solicitação` |
| `TRANSICAO` | `{ator} mudou o estado de {Estados[de]} para {Estados[para]}` |
| `ATRIBUICAO` com `para` | `{ator} atribuiu a {para}` |
| `ATRIBUICAO` sem `para` | `{ator} tirou {de} da responsabilidade` |
| `LEMBRETE` | `{ator} enviou um lembrete ao aluno` |
| `NOTA` | `{ator} escreveu uma nota interna` |
| `RESPOSTA` | `{ator} respondeu ao aluno` |
| `ANEXO` | `{ator} anexou um arquivo` |
| `ENCAMINHAMENTO` | `{ator} encaminhou de {de} para {para}` |
| `RECLASSIFICACAO` | `{ator} mudou a categoria de {de} para {para}` |
| outro tipo | `{ator} · {tipo}` (código cru, para nunca esconder um evento) |
| estado fora do `Estados` | o código cru no lugar do nome |

Emenda de 05/11 (`historico-frases`): as linhas `RESPOSTA` e `ATRIBUICAO` com `para` mudam quando o autor é o aluno ou quando `para` é o próprio ator. As frases valem como estão em `.specs/features/historico-frases/plan.md`.

## Criteria

### S1: Histórico em frases (P1)

O atendente lê o histórico do chamado sem nenhum código interno.

**Acceptance Criteria**

1. WHEN the team opens a ticket with events THEN the web SHALL render each event as `{data} · {frase}` with the sentence of `## Screens` for its type
2. WHEN an event is `TRANSICAO` THEN the web SHALL render `de` and `para` with the labels of `Estados` ("Aguardando aluno", not `AGUARDANDO_ALUNO`)
3. WHEN an event has a non-null `detalhe` THEN the web SHALL append ` · {detalhe}` to its sentence
4. IF an event type is not one of the 9 known types THEN the web SHALL render `{ator} · {tipo}` and still list the event
5. IF a `TRANSICAO` state is not in `Estados` THEN the web SHALL render the raw code in its place
6. The web SHALL keep the events in the order the API sends and the dates in the institution's time zone, as today
7. WHILE the viewer is the student the web SHALL render no Histórico, as today (the API sends `eventos: null`)

**Independent test:** abrir um chamado com um evento de cada tipo e ler as 9 frases.

## Out of scope

| Excluded | Why |
| --- | --- |
| traduzir no servidor (`DoEvento` com o texto pronto) | o contrato e os indicadores usam os códigos; o texto é do `web/` como o `Estados` |
| traduzir `RASCUNHO`/`ATIVO`/`ARQUIVADO` em Artigos e Documentos | são texto binding da `interface-nova` (linha 10); outro pedido |
| ícone por tipo de evento, linha do tempo vertical | não pedido |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| formato | frase por tipo, com o detalhe | resposta do usuário em 03/11 ("Frase") | y |
| texto de cada frase | a tabela de `## Screens` | redação curta no passado, sujeito = quem fez; o usuário revisa aqui | n |
| `ATRIBUICAO` em que o atendente assume para si | `Carla atribuiu a Carla` | a API não distingue "assumiu" de "atribuiu"; distinguir pelo nome é frágil (homônimos) | n |
| perfil do tlc-spec-lean | `ui` | tela e texto binding, como as features de interface anteriores | n |
| quando | antes da banca de 20/11, antes do `barra-lateral-grupos` | é o que a banca vê no detalhe do chamado | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen Histórico | empty state | existing - sem eventos a lista fica vazia, como hoje |
| screen Histórico | loading and error state | existing - os do detalhe do chamado |
| screen Histórico | unauthorised | AC 7 |
| screen Histórico | ordering | AC 6 |
| screen Histórico | unknown values | AC 4, AC 5 |
| copy | texto e tom | `## Screens`, AC 1 |
| API | error shape, versioning | n/a - nenhuma rota muda |

## Sources

- Resposta do usuário de 03/11/2026 ("Frase (Recomendado)") - settles o formato
- `api/Dados/Entidades.cs` `TiposEvento` e `api/Dados/Chamados/Chamado.cs` - o que cada tipo grava em `de`, `para` e `detalhe`
