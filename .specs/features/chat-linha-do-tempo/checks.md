# Chat com linha do tempo única e compositor alinhado - checks

Profile: ui
Plan: `.specs/features/chat-linha-do-tempo/plan.md`

23 checks em 3 slices · 0 one-way doors · 0 perguntas abertas (plano aprovado pelo usuário em 08/11: "aprovado pode continuar")

**Como as provas rodam.** Na raiz `D:\one-system`. Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"`; um filtro que não seleciona teste sai com 0 (L-002), então confira a contagem no relatório. Playwright mede layout com `boundingBox()` (px CSS, tolerância dita em cada check) contra o servidor de desenvolvimento: `npm --prefix web run dev` em outro terminal e, na raiz, `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "<nome>"`. A API é simulada por `simularApi` (`web/e2e/simulada.ts`); nada chama IA nem e-mail real. Mutação suspensa (AD-025).

As emendas de testes de features fechadas listadas em `## Impact` do plano valem como aprovadas ("aprovado pode continuar"): só mudam as asserções que descrevem o bloco "Histórico" separado. As outras asserções dos mesmos arquivos ficam como estão (C22).

## Checks

### S1 - compositor do aluno numa caixa alinhada · 3 arquivos · 36 KB · ~9k

**C1** - Em 768, 1280 e 1872 px, o clipe "Anexar arquivo" e o botão "Enviar" ficam inteiros dentro da caixa do compositor (`data-testid="compositor"`), e a caixa tem a largura da coluna de mensagens, com diferença de no máximo 1 px (AC 1)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "compositor numa caixa"`

**C2** - Nas mesmas 3 larguras, `|x de "Falar com atendente" - x da caixa|` ≤ 1 px e `|borda direita de "Enviar" - borda direita da caixa|` ≤ 1 px (AC 2)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "bordas alinhadas"`

**C3** - Com um texto de 10 linhas no campo (altura 208 px, `max-h-52`), a base do clipe e a base do "Enviar" ficam a no máximo 2 px da base do campo (AC 3)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "campo alto"`

**C4** - Com 1 arquivo escolhido, o selo "Remover <nome>" fica dentro da caixa e acima do campo, a ajuda "PDF ou foto, até 10 MB" fica abaixo da caixa, e o y de "Falar com atendente" não muda em relação ao estado sem arquivo (diferença ≤ 1 px) (AC 4)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "selos dentro da caixa"`

**C5** - Em 360 px, `scrollWidth` do documento é igual a `clientWidth`, e "Falar com atendente" e "Encerrar" têm 44 px de altura ou mais (AC 5)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "360 px sem rolagem lateral"`

**C6** - Em 1280×800, sem conversa, a base da caixa do compositor fica a no máximo 16 px do fim da janela e as perguntas sugeridas ficam acima dela (AC 6)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "caixa no fim da tela vazia"`

**C7** - Depois da 10ª mensagem do aluno, a caixa do compositor não existe e "Falar com atendente" continua na tela, com a variante principal (AC 7)
Proof: `cd web && npx vitest run src/assistente/compositor.test.tsx -t "limite de 10 mensagens"`

### S2 - uma só sequência cronológica no chamado · 3 arquivos · 40 KB · ~11k

**C8** - A equipe vê um só `h2` "Atendimento" e uma só `ol` com 2 mensagens e 3 eventos misturados: a ordem dos itens é a de `criadaEm`/`criadoEm` crescente, e não existe heading "Histórico" nem `data-testid="eventos"` (AC 8)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "mensagens e eventos em ordem cronológica"`

**C9** - Cada evento é um `li` com a data e o texto exato de `frase(evento)` (por exemplo `Carla assumiu a solicitação`), sem balão: nenhum `.is-user` nem `.is-assistant` dentro dele, e `text-align` centralizado (AC 9)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "evento em linha centrada sem balão"`

**C10** - Evento e mensagem com o mesmo `criadoEm`/`criadaEm`: o evento vem antes (AC 10)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "empate de horário"`

**C11** - Para o aluno (`eventos: null`), a lista tem só as mensagens, sem nenhum evento e sem a chave "Eventos" (AC 11)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "aluno sem eventos nem filtro"`

**C12** - Sem mensagem e sem evento, o bloco mostra `Nenhuma resposta ainda.` e nenhuma `li` (AC 12)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "sem itens"`

**C13** - A chave "Eventos" começa marcada e mostra os eventos; ao desmarcar, as `li` de evento somem e as 2 mensagens e a nota ficam; marcar de novo traz os eventos de volta (AC 13)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "filtro Eventos"`

**C14** - Na coluna da direita da equipe não há heading "Histórico" nem lista de eventos; "Etapa 2 de 3 · …" e o cartão "Ações" continuam lá (AC 14)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "coluna da direita sem histórico"`

**C15** - Ao clicar em "Assumir", a resposta de `POST /api/chamados/ONE-1/assumir` traz um evento novo e ele aparece como última `li` da lista com `frase(evento)`, sem nova chamada a `GET /api/chamados/ONE-1` (AC 15)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "ação acrescenta o evento no fim"`

**C16** - Uma nota interna fica na sequência, entre a mensagem e o evento que a cercam pelo horário, com o selo "Nota interna" e o fundo `bg-warning-subtle` (AC 8)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "nota interna na sequência"`

### S3 - a conversa longa não esconde a resposta · 3 arquivos · 18 KB · ~5k

**C17** - "Conversa com o assistente · 3 mensagens" vem recolhida (nenhum balão da transcrição visível); ao abrir, os 3 balões e a fonte citada aparecem, e fechar os esconde de novo (AC 16)
Proof: `cd web && npx vitest run src/chamados/linhaDoTempo.test.tsx -t "conversa com o assistente recolhida"`

**C18** - Em 1280×800, com 40 itens, depois de rolar a página 600 px, o formulário de resposta (campo `Responder` e botão "Enviar") está inteiro dentro da janela (AC 17)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "resposta colada ao fim"`

**C19** - Nas mesmas condições de C18, o cartão "Ações" e o botão "Assumir" continuam inteiros dentro da janela (AC 18)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "ações visíveis ao rolar"`

**C20** - Com 40 itens, "Ir para o mais recente" existe e, ao clicar, a última `li` fica inteira dentro da janela; com 2 itens o botão não existe (AC 19)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "ir para o mais recente"`

**C21** - Em 390 px, a barra fixa de ações continua (`position: fixed`, "Assumir" e "Mais") e o formulário de resposta tem `position: static` (AC 20)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- chat.spec.ts -g "celular mantém a barra"`

### Fechamento

**C22** - Nada além do planejado quebra: o Vitest inteiro sai 0, o build com tipos sai 0, e os specs existentes `arranjo.spec.ts`, `identidade.spec.ts` e `celular.spec.ts` saem 0. As únicas asserções alteradas em arquivos existentes são as do bloco "Histórico" listadas em `## Impact`; `git diff <base>..HEAD` nesses arquivos não remove nenhuma outra asserção (Impact)
Proof: `cd web && npx vitest run`
Proof: `npm --prefix web run build`
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- arranjo.spec.ts identidade.spec.ts celular.spec.ts`

**C23** - O `crapper` sobre `web/src` sai 0 no limite 9.99 e o `dryer` não acha candidato com nota 0.8 ou mais (AD-018). Se o `crapper` seguir bloqueado neste computador (AD-044), o check fica aberto como "não rodou", nunca como PASS
Proof: `npm --prefix web run coverage; cd web; crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web; dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| larguras do compositor (3) | 768 C1, C2 · 1280 C1, C2, C6 · 1872 C1, C2 | - |
| larguras especiais (2) | 360 C5 · 390 C21 | - |
| estados do compositor (4) | vazio C6 · campo alto C3 · com arquivo C4 · no limite C7 | - |
| tipos de item da sequência (3) | mensagem C8 · evento C9 · nota interna C16 | - |
| quem lê o chamado (2) | equipe C8 · aluno C11 | - |
| filtro Eventos (2) | marcado C8, C13 · desmarcado C13 | - |
| estados da sequência (3) | vazia C12 · com itens C8 · com ação nova C15 | - |
| partes coladas ao rolar em 1024 px ou mais (2) | resposta C18 · cartão de ações C19 | - |
| larguras do chamado (3) | 1280 C18, C19, C20 · 390 C21 · 1024 ou mais C8 (layout em jsdom) | - |
| critérios do plano (20) | AC 1 C1 · AC 2 C2 · AC 3 C3 · AC 4 C4 · AC 5 C5 · AC 6 C6 · AC 7 C7 · AC 8 C8, C16 · AC 9 C9 · AC 10 C10 · AC 11 C11 · AC 12 C12 · AC 13 C13 · AC 14 C14 · AC 15 C15 · AC 16 C17 · AC 17 C18 · AC 18 C19 · AC 19 C20 · AC 20 C21 | - |

- Afirmam arranjo medido em navegador real: C1 a C6, C18 a C21, todos com `boundingBox()` ou `getComputedStyle`
- Afirmam texto e ordem em jsdom: C7 a C17; C9 e C16 também checam classes
- Nenhuma rota nova (`## Surface` é `None`), então não há linha de status

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide, na tela (mistura por horário, filtro, recolher, empate) | uma na própria camada (Vitest) | um caso por linha das tabelas de decisão |
| Arranjo (alinhamento, sticky, larguras) | uma no navegador real (Playwright) | cada largura citada no plano |
| Instrumentation (classes `className`, ícones) | nenhuma própria | coberta pelo consumidor |

Evidence:

- `LinhaDoTempo` (nova): 1 ordenação com 1 desempate, 1 filtro e 1 vazio -> 3 pontos de decisão
- `Transcricao` recolhida: 1 estado aberto/fechado -> 1 ponto de decisão
- `Entrada` do `Assistente.tsx`: 2 ramos (`noLimite`, `emConversa`) -> já provados por `src/assistente/*.test.tsx` e C7
- análogo no repositório: `arranjo.spec.ts` mede o Assistente e o detalhe pelo mesmo `boundingBox()`

Cost: 1 spec novo de Playwright (`chat.spec.ts`) e 2 arquivos de Vitest novos (`compositor.test.tsx`, `linhaDoTempo.test.tsx`). Sem eles, o alinhamento só seria visto por quem olha o print.

## Swept

- validation: existing - `maxLength` 1000 do campo, 3 anexos e 10 MB não mudam (C5, C7 mantêm os limites)
- failure modes: existing - `FalhaDoEnvio` e `AlertaDaAcao` não mudam; C15 prova a ação que dá certo, e o 409 continua em `chamado.test.tsx` (C22)
- idempotency: n/a - só leitura e reordenação de itens já recebidos
- authorization: C11
- concurrency: existing - `tempoReal.test.tsx` cobre a releitura do chamado; a linha do tempo é recalculada a cada render (C22)
- data lifecycle: n/a - nada é gravado nem apagado
- dependency failure: n/a - nenhuma dependência nova
- state transitions: C15
- observability: n/a - sem log nem métrica nova; a própria sequência é o registro

## Out of scope

- Abas Responder / Nota / Tarefa / Solução do GLPI - o One já tem "Nota interna" como marca e não tem tarefas
- Filtros por tipo além de "Eventos" - uma chave basta
- Eventos na tela do aluno - o aluno não recebe `eventos`; mudar isso é decisão de API
- Mudança de API ou de schema - não há

## Handoff

Estimativa por `wc -c` dos arquivos que cada fatia toca, dividida por 4:

- S1 = `Assistente.tsx` 25.8 KB + `Anexos.tsx` 2.8 KB + `index.css` ~ 7 KB ≈ 36 KB ≈ 9k
- S2 = `ChamadoDetalhe.tsx` 23.6 KB + `Conversa.tsx` 5.2 KB + `Balao.tsx` 4.1 KB + `chamado.ts` ~ 7 KB ≈ 40 KB ≈ 11k, entra em `chamados/` com 20k no total
- S3 = os mesmos arquivos de S2 + `simulada.ts` 15 KB ≈ 18 KB de arquivos novos ≈ 5k, total 25k
- Testes novos (3 arquivos, ~30 KB) ≈ 8k; total ≈ 33k, abaixo do orçamento de 150k
- Mechanism: one builder (cabe no orçamento, sem pergunta)

Base da feature: `f07362b`.
