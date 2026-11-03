# Histórico legível - checks

Profile: ui
Plan: `.specs/features/historico-legivel/plan.md`

11 checks em 2 slices · 0 one-way doors · 0 perguntas abertas

**Como as provas rodam.** Na raiz `D:\one-system`, salvo `cd web &&`. Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"`.
Playwright contra o contêiner `api` da porta 8080 reconstruído com `docker compose up -d --build api`. Um filtro
que não seleciona teste sai com 0 (L-002): conferir na contagem do relatório. `<base>` é o commit que congela
este arquivo, gravado em `## Handoff`.

## Checks

### S1 - Histórico em frases (P1) · 4 files · 40 KB · ~12k

**C1** - Com um evento de cada um dos 9 tipos e as duas formas de `ATRIBUICAO`, cada `<li>` do Histórico tem o texto `{dd/mm/aaaa hh:mm} · {frase}` com a frase exata da tabela de `## Screens` (11 linhas, tabela no teste) (AC 1)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "frase de cada tipo de evento"`

**C2** - Num `TRANSICAO` de `AGUARDANDO_ALUNO` para `EM_ATENDIMENTO` a frase é `Carla mudou o estado de Aguardando aluno para Em atendimento`, sem nenhum código em maiúsculas com `_`; um estado nulo sai como `—` (AC 2)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "frase de cada tipo de evento"`
Proof: `cd web && npx vitest run src/chamados/resposta.test.tsx -t "estado nulo no histórico sai como travessão"`

**C3** - Um evento com `detalhe` termina em ` · {detalhe}` (testado em `TRANSICAO` com justificativa, `ANEXO` com o nome do arquivo e `ATRIBUICAO` com "Responsável desativado"); sem `detalhe`, a frase não termina em ` · ` (AC 3)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "detalhe no fim da frase"`

**C4** - Um evento de tipo `ABERTURA` (fora dos 9) aparece como `Ana · ABERTURA`, ainda como item da lista ordenada (AC 4)
Proof: `cd web && npx vitest run src/chamados/icones.test.tsx -t "Histórico é uma lista ordenada"`

**C5** - Um `TRANSICAO` com estado `SUSPENSO` (fora do `Estados`) sai `Carla mudou o estado de Aberto para SUSPENSO` (AC 5)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "estado desconhecido sai cru"`

**C6** - Os eventos saem na ordem da API, com a data no fuso da instituição (`03:30Z` em `America/Cuiaba` = `01/11/2026 23:30`), a data em `text-muted-foreground` (AC 6)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "eventos em ordem no fuso"`

**C7** - Para o aluno (`eventos: null`) não há título "Histórico" nem lista (AC 7)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "aluno não vê resumo no detalhe"`

**C8** - Textos da tela 9: no estado da equipe o texto visível é o da `interface-nova` mais a frase do evento do fixture, sem sobra (AC 1)
Proof: `cd web && npx vitest run src/chamados/textos.test.tsx -t "textos detalhe do chamado"`

### S0 - Invariantes (P1) · ~6k

**C9** - As suítes inteiras passam; as únicas asserções mudadas são as 4 de `## Test policy` (AC 1-7)
Proof: `cd web && npx vitest run`
Proof: `cd web && npx playwright test`

**C10** - Cada teste de `<base>` faz as mesmas chamadas à API em `<base>` e em HEAD, exceto `conversa do chamado > histórico só mostra a seta quando o evento tem origem ou destino`, reescrito por `## Test policy` como `estado nulo no histórico sai como travessão`, que pode faltar no HEAD (L-048)
Proof: `python .specs/features/historico-legivel/chamadas_iguais.py --autoteste`
Proof: `python .specs/features/historico-legivel/chamadas_iguais.py <base>`

**C11** - Barreiras do AD-018: `crapper` sai 0 no limite 9.99 e `dryer` sem candidato 0.8+; o `mutator` segue suspenso (AD-025)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx | grep -q "No duplicate candidates found"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| frases de `## Screens` (11) | C1, table-driven sobre as 11 linhas (9 tipos, `ATRIBUICAO` com e sem `para`) | - |
| fallbacks (3) | tipo desconhecido C4 · estado desconhecido C5 · estado nulo C2 | - |
| detalhe (3 origens) | justificativa C3 · nome do anexo C3 · "Responsável desativado" C3 | - |
| quem vê (2) | equipe C1, C8 · aluno C7 | - |
| testes reescritos (4) | `eventos em ordem no fuso` C6 · `textos detalhe do chamado` C8 · `histórico só mostra a seta...` -> `estado nulo no histórico sai como travessão` C2 · `Histórico é uma lista ordenada` C4 | - |

## Test policy

Valem as linhas da `interface-nova` e da `redesign-institucional`. A frase é uma tabela de decisão (9 tipos,
2 formas de `ATRIBUICAO`, 3 fallbacks): provada na tela pelo `App` montado, uma linha afirmada por membro.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Teste que afirma o formato cru do Histórico | reescrito para a frase no mesmo commit; a ordem, o fuso e a lista ordenada que ele afirmava continuam afirmados | os mesmos fatos, com a frase no lugar do código |

Evidence:

- `src/chamados/chamado.test.tsx:165-189`, `src/chamados/resposta.test.tsx:164-169`, `src/chamados/icones.test.tsx:18-33`, `src/chamados/textos.test.tsx:83`: afirmam `TRANSICAO · Carla · ...`

## Swept

- validation: C4, C5 (valores fora do conjunto conhecido)
- failure modes: n/a - nenhuma chamada nova; erro do detalhe é o de hoje
- idempotency: n/a - só leitura
- authorization: C7; existing - a API só manda `eventos` para a equipe (`DetalheChamado.Equipe`)
- concurrency: n/a - só apresentação
- data lifecycle: n/a - nada gravado
- dependency failure: n/a - nenhuma dependência
- state transitions: C2 (rótulos dos 5 estados)
- observability: n/a - nenhum log no `web/`

## Handoff

Estimativa = arquivos lidos (`Conversa.tsx` 4,8 KB, `chamado.ts` ~3 KB, 4 testes ~45 KB) / 4 ≈ 13k + escrita ≈ 4k
+ suítes ≈ 8k = **~25k**, abaixo do budget de 150k.

- S1 + S0 = ~25k, só `web/src/chamados` e `chamado.ts` - um construtor, sem pergunta
- Mechanism: one builder
- Feature base (`<base>`): `a3d6e05` (`docs(historico-legivel): plan and checks`)
- **Settled mid-build:** C10 ganhou a exceção do teste renomeado antes de qualquer prova rodar (o nome antigo descrevia a seta, que deixou de existir); o script envolve o da `redesign-institucional`
