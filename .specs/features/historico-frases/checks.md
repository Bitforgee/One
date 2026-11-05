# Histórico com o autor certo em cada frase - checks

Profile: ui
Plan: `.specs/features/historico-frases/plan.md`

11 checks em 1 slice · 0 one-way doors · 0 perguntas abertas (plano aprovado pelo usuário em 05/11: "pode construir")

**Como as provas rodam.** Na raiz `D:\one-system`, salvo `cd web &&`. API: `docker compose up -d postgres mailpit minio` e uma execução de `dotnet test` por vez. Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"`. Um filtro que não seleciona teste sai com 0 (L-002): conferir a contagem no relatório. `358b2bf` é o commit que congela este arquivo, gravado em `## Handoff`. Mutação suspensa (AD-025).

## Checks

### S1 - frases com o autor certo · 6 arquivos · 89 KB · ~22k

**C1** - [x] Para a equipe, o evento cujo autor é o solicitante vem com `doAluno: true`; o do atendente e o sem autor (`CRIACAO`, ator `Sistema`) vêm com `doAluno: false` (AC 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Evento_diz_se_veio_do_aluno"`

**C2** - [x] Um atendente com o mesmo nome do solicitante recebe `doAluno: false` nos próprios eventos, e o solicitante continua com `true` (AC 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Atendente_com_o_nome_do_aluno_nao_vira_aluno"`

**C3** - [x] `RESPOSTA` com `doAluno: true` sai `{ator} respondeu à equipe` (AC 3)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "frases com o autor certo"`

**C4** - [x] `RESPOSTA` com `doAluno: false` sai `{ator} respondeu ao aluno` (AC 4)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "frases com o autor certo"`

**C5** - [x] `ATRIBUICAO` com `para` igual a `ator` e `de` nulo sai `{ator} assumiu a solicitação` (AC 5)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "frases com o autor certo"`

**C6** - [x] `ATRIBUICAO` com `para` igual a `ator` e `de` preenchido sai `{ator} assumiu a solicitação no lugar de {de}` (AC 6)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "frases com o autor certo"`

**C7** - [x] `ATRIBUICAO` com `para` diferente de `ator` continua `{ator} atribuiu a {para}`, e sem `para` continua `{ator} tirou {de} da responsabilidade` (AC 7)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "frases com o autor certo"`

**C8** - [x] Para o aluno, `GET /api/chamados/{numero}` devolve `eventos: null`, sem `doAluno` de evento; para um atendente de outro setor, devolve `404` (AC 8)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Aluno_nao_recebe_eventos"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ChamadoFluxoTests.Detalhe_fora_do_setor_continua_404"`

**C9** - [x] O retrato da API só ganha `doAluno` nos eventos: ele passa, e tirar esse campo do arquivo o deixa igual ao de `358b2bf` (Impact)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_sucesso_iguais_aos_da_base"`
Proof: `diff <(git show 358b2bf:api.Tests/Retratos/sucessos.txt) <(sed -E 's/("ator":"[^"]*"),"doAluno":(true|false)/\1/g' api.Tests/Retratos/sucessos.txt)`

**C10** - [x] As suítes continuam verdes: a API inteira, o Vitest inteiro e o build com tipos (`Evento.doAluno` obrigatório) (Impact)
Proof: `dotnet test api.Tests`
Proof: `cd web && npx vitest run`
Proof: `npm --prefix web run build`

**C11** - [x] O `crapper` sobre `web/src` sai 0 no limite 9.99, e o `dryer` não acha candidato com nota 0.8 ou mais (AD-018)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| autor do evento (3) | solicitante C1 · atendente C1 · sem autor C1 | - |
| frase de `RESPOSTA` (2) | `doAluno` true C3 · `doAluno` false C4 | - |
| frase de `ATRIBUICAO` (4) | assumiu sem anterior C5 · assumiu com anterior C6 · para outra pessoa C7 · sem `para` C7 | - |
| `GET /api/chamados/{numero}` statuses (2) | 200 C1 · 404 C8 | - |
| quem lê os eventos (2) | equipe C1 · aluno C8 | - |

- Afirmam campo ou status da API: C1, C2, C8, C9, todos com prova que passa pela rota HTTP
- C3 a C7 são afirmações de tela; o campo que elas leem é o mesmo que C1 afirma no JSON

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide, atravessa a rota HTTP (`doAluno`) | uma na rota | os 3 autores e o homônimo |
| Decide, na tela (`frase`) | uma na própria camada | um caso por linha das 2 tabelas de frases |

Evidence:

- `api/Chamados/Shared/DetalheChamado.cs`: 1 comparação nova de id -> decide
- `web/src/chamado.ts`: `RESPOSTA` tem 2 saídas e `ATRIBUICAO` tem 4 -> decide
- análogo no repositório: `DaMensagem.DoAluno`, provado pela rota no retrato

Cost: 4 testes novos de API e 1 tabela no Vitest. Sem esta tabela, as 2 frases novas só passariam por um caminho do `Historico`.

## Swept

- validation: n/a - a mudança não recebe entrada
- failure modes: existing - `Historico` não muda; `frase` trata tipo desconhecido (`historico-legivel` C4)
- idempotency: n/a - só leitura
- authorization: C8
- concurrency: n/a - só leitura de eventos já gravados
- data lifecycle: n/a - nada é gravado; eventos antigos usam o autor já guardado
- dependency failure: n/a - nenhuma dependência nova
- state transitions: n/a - nenhum estado muda
- observability: n/a - sem log novo; o Histórico é o próprio registro

## Out of scope

- Ver `## Out of scope` do plano.

## Handoff

- S1 = 88.716 bytes / 4 = ~22k (`DetalheChamado.cs`, `chamado.ts`, `chamado.test.tsx`, `ChamadoFluxoTests.cs`, `sucessos.txt`, `simulada.ts`), abaixo do orçamento de 150k - um construtor
- **Boundary:** C1-C11 closed at `e565c50`; base `358b2bf`. API 581 de 581, Vitest 525 de 525, build, `crapper` e `dryer` saem 0
- **Settled mid-build:** a asserção de `eventos em ordem no fuso` em `chamado.test.tsx` saiu de "Carla atribuiu a Carla" para "Carla assumiu a solicitação" (AC 5); nada mais foi editado em asserção existente. Fixtures de `chamado`, `icones`, `resposta` e `textos` ganharam `doAluno: false`
- **Abandoned:** nada
