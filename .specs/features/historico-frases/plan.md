# Histórico com o autor certo em cada frase

## Problem

O Histórico do chamado escreve duas frases falsas. Quando a aluna responde, aparece "Mariana Costa respondeu ao aluno", como se ela fosse da equipe. Quando o atendente assume, aparece "Marcos Tavares atribuiu a Marcos Tavares", que não diz o que aconteceu.

Quem paga é o atendente, que lê o Histórico para entender o caso, e o grupo na banca de 20/11, porque o detalhe do chamado é tela principal. Evidência: os prints da rodada final de `estrutura-visual` em 05/11. Não há medida de uso, porque não há produção.

Depois disto, a resposta da aluna vira "Mariana Costa respondeu à equipe", e assumir vira "Marcos Tavares assumiu a solicitação".

## Flow

Reusa a regra que `DaMensagem.DoAluno` já aplica (`AutorId == SolicitanteId`) e o mapa `Frases` de `web/src/chamado.ts`, sem criar outro formatador.

1. `DetalheChamado.Equipe` (exists) - cada `DoEvento` passa a levar `doAluno`, calculado pelo id do autor, e nunca pelo nome
2. `GET /api/chamados/{numero}` (exists) - devolve o campo novo só em `eventos`, que continua `null` para o aluno
3. `frase` em `web/src/chamado.ts` (exists) - escolhe a frase de `RESPOSTA` por `doAluno` e a de `ATRIBUICAO` comparando `para` com `ator`
4. `Historico` em `web/src/chamados/Conversa.tsx` (exists) - mostra a frase, sem mudança

## Impact

| Front | What changes |
| --- | --- |
| `## Screens` de `historico-legivel` | as linhas `RESPOSTA` e `ATRIBUICAO com para` são substituídas pelas de `## Criteria` abaixo; as outras continuam |
| testes que codificam as frases antigas | `eventos em ordem no fuso` afirmava a própria frase errada ("Carla atribuiu a Carla") e passa à frase de AC 5; os casos com "respondeu ao aluno" e "atribuiu a Bruno" continuam valendo (AC 4, AC 7); as frases novas ganham casos próprios. As fixtures de 4 arquivos de teste ganham `doAluno`, porque o tipo `Evento` o exige |
| retrato da API | `api.Tests/Retratos/sucessos.txt` ganha `doAluno` em cada evento da equipe; nenhum outro campo muda |
| domain | nenhum termo novo; `TiposEvento` continua igual |
| stored data | nothing to migrate - eventos antigos ganham a frase certa, porque o autor já está gravado |

## Relations

None - no stored-data shape change.

## Surface

| Route | In | Out | Status |
| --- | --- | --- | --- |
| `GET /api/chamados/{numero}` | `numero` | `eventos[].doAluno` além dos campos atuais | `200`, `404` |

## Landing

None - o campo é consumido só pelo `web/` deste repositório, e tudo se desfaz em um commit.

## Criteria

### S1: frases com o autor certo (P1)

O atendente lê no Histórico quem fez o quê, sem frase falsa.

**Acceptance Criteria**

1. WHEN the team reads a ticket THEN the API SHALL send `doAluno: true` on events whose author id is the requester and `doAluno: false` on every other event, including those with no author
2. IF a team member has the same name as the requester THEN the API SHALL send `doAluno: false` on that member's events
3. WHEN an event is `RESPOSTA` with `doAluno: true` THEN the web SHALL render `{ator} respondeu à equipe`
4. WHEN an event is `RESPOSTA` with `doAluno: false` THEN the web SHALL render `{ator} respondeu ao aluno`
5. WHEN an event is `ATRIBUICAO` with `para` equal to `ator` and a null `de` THEN the web SHALL render `{ator} assumiu a solicitação`
6. WHEN an event is `ATRIBUICAO` with `para` equal to `ator` and a non-null `de` THEN the web SHALL render `{ator} assumiu a solicitação no lugar de {de}`
7. WHEN an event is `ATRIBUICAO` with `para` different from `ator` THEN the web SHALL keep `{ator} atribuiu a {para}`
8. WHILE the viewer is the student the API SHALL keep sending `eventos: null`

**Independent test:** abrir um chamado em que a aluna respondeu e um atendente assumiu, e ler as duas frases no Histórico.

## Out of scope

| Excluded | Why |
| --- | --- |
| Trocar "Sistema abriu a solicitação" | a frase é verdadeira: a transferência é automática e o evento não tem autor |
| Tratamento pelo gênero de quem atua | o sistema não guarda essa informação, e as frases novas não dependem dela |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Palavra da frase da aluna | "respondeu à equipe" | não depende de gênero e diz para quem foi | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen Histórico | empty, loading, error | existing - `Historico` e `ChamadoDetalhe` não mudam |
| screen Histórico | unauthorised | AC 8 |
| screen Histórico | density and ordering | existing - `historico-legivel` AC 6 |
| screen Histórico | destructive action confirms | n/a - a lista é só leitura |
| API `GET /api/chamados/{numero}` | response shape | AC 1 |
| API `GET /api/chamados/{numero}` | error shape, who may call | existing - rota sem mudança |
| API `GET /api/chamados/{numero}` | versioning, rate limits | n/a - campo acrescentado e lido só pelo `web/` deste repositório, sem limite próprio |
| document Histórico | structure, tone, next step | AC 3 a AC 7 |

## Sources

- Mensagem final de `estrutura-visual` em 05/11 - os dois textos errados
- `.specs/features/historico-legivel/plan.md` `## Screens` - a tabela que este plano altera
