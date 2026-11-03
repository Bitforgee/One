# Histórico legível verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: a3d6e05..32ece77
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Uma única lacuna derruba o PASS: o conjunto "eventos com `detalhe`", recalculado da API, tem o membro
`LEMBRETE` (o agendador sempre grava `Detalhe`, `api/Agendador.cs:171`) sem prova nenhuma; o teste do C1 usa
um `LEMBRETE` sem `detalhe`, forma que a API nunca produz. Todo o resto está provado: 11/11 checks com
evidência localizada, 5 faltas injetadas e 5 mortas, Vitest 229/229, Playwright 58/58.

Nota de faixa: durante a verificação entrou `ff07f05 docs(barra-lateral-grupos): plan, checks and AD-028`
(outra feature, só `.specs/`); `git diff 32ece77 ff07f05 -- web` é vazio, então as provas valem para os dois.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `plan.md` `## Screens`, tabela de frases (12 linhas: 10 por tipo + tipo desconhecido + estado desconhecido) | yes - lida linha a linha contra `web/src/chamado.ts:47-62` | none | - |
| `plan.md` `## Screens`, formato da linha (data em `text-muted-foreground`, ` · `, frase, ` · {detalhe}`) | yes - contra `web/src/chamados/Conversa.tsx:111-116` | none | - |
| Decisão do usuário de 03/11 "Frase" | yes - registrada só em `plan.md` `## Assumptions` (linha "formato") e `## Sources`; não há outro artefato | none | - |
| `api/Dados/Entidades.cs` `TiposEvento` (9) e `EstadosChamado` (5) | yes - `Entidades.cs:36-56` | none | - |
| `api/Dados/Chamados/Chamado.cs` (o que cada tipo grava em de/para/detalhe) | yes - `Chamado.cs:54,130,140,157,160,170-208`; também `api/Agendador.cs:156,171`, que o plano cita só na prosa ("Sistema" do agendador, "Fechado automaticamente") | none | - |

Enumeração por elemento da linha do Histórico (tela 9, só a lista): lista ordenada `<ol>` (C4,
`icones.test.tsx:27`); um `<li>` por evento, na ordem da API (C6); data em elemento próprio com
`text-muted-foreground` (C6, `chamado.test.tsx:189`); separador ` · ` depois da data (C1 via prefixo exato,
C6/C4/C2 por igualdade do `textContent`); frase (C1); sufixo ` · {detalhe}` (C3); ausentes: seta `→` e
código cru (C1 por igualdade exata e pela regex de `chamado.test.tsx:217`). Arranjo: data e frase no mesmo
`<li>`, data num `<span>` separado - `getByText(/^data$/)` só casa se a data estiver sozinha no elemento.
A margem `me-2` antiga saiu (espaçamento, fora do alcance de seletor; o ` · ` da tabela a substitui).
O resto da tela 9 não muda: C8 confere o texto visível inteiro contra a `interface-nova` linha 9.

Observação de texto, não contradição: a linha real do lembrete fica
`Sistema enviou um lembrete ao aluno · Lembrete ao aluno: N dias aguardando resposta` (redundante). A tabela
manda anexar o `detalhe` não nulo, então o código está conforme; o usuário pode querer revisar a redação.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 9 tipos + 2 formas de `ATRIBUICAO`, frase exata da tabela, formato `{data} · {frase}` | `cd web && npx vitest run --reporter=verbose` exit 0; linha `chamado.test.tsx > chamado > frase de cada tipo de evento` ✓ | `web/src/chamados/chamado.test.tsx:216` - `expect(itens).toEqual(Casos.map(([, f]) => f))` sobre as linhas 203-213 (prefixo `02/11/2026 08:00 · ` removido em `:197`; se faltar, a igualdade falha) | PASS |
| C2 | `Aguardando aluno para Em atendimento`, sem código com `_`; estado nulo sai `—` | mesma execução; `frase de cada tipo de evento` ✓ e `resposta.test.tsx > conversa do chamado > estado nulo no histórico sai como travessão` ✓ | `chamado.test.tsx:204` caso `'Carla mudou o estado de Aguardando aluno para Em atendimento'`; `:217` - `not.toMatch(/[A-Z]{2,}_[A-Z]+.../)`; `web/src/chamados/resposta.test.tsx:169` - `toEqual([..., '02/11/2026 08:00 · Carla mudou o estado de Em atendimento para —'])` | PASS |
| C3 | com `detalhe` termina em ` · {detalhe}` (justificativa, anexo, "Responsável desativado"); sem, não termina em ` · ` | mesma execução; `detalhe no fim da frase` ✓ | `chamado.test.tsx:229-234` - `toEqual(['Carla mudou o estado de Aberto para Fechado · Aluno desistiu', 'Carla anexou um arquivo · boleto.pdf', 'Sistema tirou Bruno da responsabilidade · Responsável desativado', 'Carla escreveu uma nota interna'])` | PASS |
| C4 | tipo `ABERTURA` sai `Ana · ABERTURA`, ainda item da lista ordenada | mesma execução; `icones.test.tsx > ícone e lista do detalhe > Histórico é uma lista ordenada` ✓ | `web/src/chamados/icones.test.tsx:27` - `expect(lista.tagName).toBe('OL')`; `:29` - `'02/11/2026 08:00 · Ana · ABERTURA'` dentro de `toEqual` | PASS |
| C5 | estado `SUSPENSO` sai cru | mesma execução; `estado desconhecido sai cru` ✓ | `chamado.test.tsx:239` - `toEqual(['Carla mudou o estado de Aberto para SUSPENSO'])` | PASS |
| C6 | ordem da API, fuso `America/Cuiaba` (`03:30Z` = `01/11/2026 23:30`), data em `text-muted-foreground` | mesma execução; `eventos em ordem no fuso` ✓ | `chamado.test.tsx:184-188` - `toEqual(['01/11/2026 23:30 · Sistema abriu a solicitação', '02/11/2026 08:00 · Carla atribuiu a Carla', '02/11/2026 08:00 · Carla mudou o estado de Aberto para Em atendimento'])`; `:189` - `toHaveClass('text-muted-foreground')` | PASS |
| C7 | aluno (`eventos: null`) sem título "Histórico" nem lista | mesma execução; `aluno não vê resumo no detalhe` ✓ | `chamado.test.tsx:60` - `expect(screen.queryByText('Histórico')).not.toBeInTheDocument()`; fixture `web/src/test/util.tsx:73` `eventos: null`. A ausência da lista não é afirmada à parte; decorre de `Historico` retornar `null` inteiro (`Conversa.tsx:107`) | PASS |
| C8 | texto visível da tela 9 = `interface-nova` + frase do fixture, sem sobra | mesma execução; `textos.test.tsx > textos > textos detalhe do chamado` ✓ | `web/src/chamados/textos.test.tsx:83` - `'Carla mudou o estado de Aberto para Em atendimento'` em `ValoresDaEquipe`, conferido pelo `t.conferir(tela())` do teste (`:92-99`) | PASS |
| C9 | suítes inteiras passam; só as 4 asserções de `## Test policy` mudaram | `npx vitest run --reporter=verbose` exit 0, 229 passed; `npx playwright test` exit 0, 58 passed contra :8080 (bundle servido `assets/index-CURQlzLk.js` contém `tirou ${e.de} da responsabilidade`) | `git diff a3d6e05..32ece77 -- web/src/**/*.test.tsx`: asserções mudadas só em `chamado.test.tsx:184-189`, `resposta.test.tsx:165-169`, `icones.test.tsx:29-30`, `textos.test.tsx:83`; o resto são testes novos (`:201`, `:221`, `:238`) | PASS |
| C10 | cada teste da base faz as mesmas chamadas em base e HEAD, salvo o teste renomeado | `python .specs/features/historico-legivel/chamadas_iguais.py --autoteste` -> `autoteste ok`, exit 0; `... a3d6e05` -> `226 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD`, exit 0 | `.specs/features/historico-legivel/chamadas_iguais.py:15-18` - `mod.REESCRITOS` só com o teste renomeado; autoteste em `redesign-institucional/chamadas_iguais.py:30-35`. Julgamento abaixo | PASS |
| C11 | `crapper` 0 no limite 9.99, `dryer` sem candidato 0.8+, `mutator` suspenso | `npm --prefix web run coverage` exit 0 (229 passed); `crapper ... --threshold 9.99` exit 0 (`frase` CRAP 4.0, `estado` 3.0, cobertura 100%); `dryer ... --threshold 0.8 ...` exit 0, saída `No duplicate candidates found.`; `mutator` não rodado (AD-025) | `web/.metrics/crap.edn` linhas `frase chamado 4 100.0% 4.0` e `estado chamado 3 100.0% 3.0`; `web/.metrics/dry.edn` | PASS |

**Julgamento da emenda do C10.** O texto congelado em `a3d6e05` apontava para o script da `interface-nova`,
que reprovaria o teste renomeado (o nome descrevia a seta, que deixou de existir). A emenda entrou no mesmo
commit do código (`a82cfc0`), não depois de uma prova vermelha, e a linha de `## Test policy` autoriza
reescrever exatamente esse teste. A exceção é estreita (um par arquivo/nome; o autoteste prova que outro
teste sumido ainda reprova e que o renomeado, se existir, é comparado). O script não compara as chamadas do
substituto com as do antigo (o valor de `REESCRITOS` não é usado), mas o diff de `resposta.test.tsx:164-169`
mostra o corpo idêntico (mesmo fixture, mesmo `detalhe(chamado(...))`), só nome e strings esperadas mudaram.
Emenda aceita. Que ela entrou "antes de qualquer prova rodar" não é verificável pelo git; só que entrou junto
com o código.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| tipos de evento (9) | `api/Dados/Entidades.cs:45-56` `TiposEvento` | CRIACAO, TRANSICAO, ATRIBUICAO, LEMBRETE, NOTA, RESPOSTA, ANEXO, ENCAMINHAMENTO, RECLASSIFICACAO -> C1, uma linha cada em `chamado.test.tsx:203-213` | - |
| linhas por tipo de `## Screens` (10; o check diz 11) | tabela de `plan.md` `## Screens` | 9 tipos com `ATRIBUICAO` em 2 formas -> C1; a 11ª linha do teste é um `TRANSICAO` extra (Resolvido -> Fechado) | - |
| fallbacks (3) | `## Screens` (2 linhas) + AC 2 (estado nulo) | tipo desconhecido C4 `icones.test.tsx:29`; estado desconhecido C5 `chamado.test.tsx:239`; estado nulo C2 `resposta.test.tsx:169` | - |
| rótulos de estado (5) | `api/Dados/Entidades.cs:36-43` `EstadosChamado` | ABERTO C5/C6; EM_ATENDIMENTO C1/C2; AGUARDANDO_ALUNO C1/C2; RESOLVIDO e FECHADO C1 `chamado.test.tsx:213` | - |
| tipos de evento que a API grava com `detalhe` não nulo (4) | `Chamado.cs:157` (ATRIBUICAO), `:186` (ANEXO), `:208` (TRANSICAO, justificativa); `api/Agendador.cs:156` (TRANSICAO, "Fechado automaticamente"), `:171` (LEMBRETE, sempre) | TRANSICAO C3 `chamado.test.tsx:230` (o fechamento automático passa pelo mesmo `Frases.TRANSICAO` e o mesmo sufixo); ATRIBUICAO C3 `:232`; ANEXO C3 `:231`; LEMBRETE sem prova (o único caso de teste, `:207`, não tem `detalhe`) | LEMBRETE com detalhe (`api/Agendador.cs:171`) |
| ator (2 origens) | `api/Chamados/Shared/DetalheChamado.cs:77` (nome ou "Sistema") | nome C1 ("Carla"); "Sistema" C1 `chamado.test.tsx:203,207`, C3 `:232`, C6 `:185` | - |
| quem vê (2) | AC 7, `DetalheChamado` | equipe C1, C8; aluno C7 | - |
| testes reescritos (4) | `checks.md` `## Test policy` Evidence + diff | `eventos em ordem no fuso` C6; `textos detalhe do chamado` C8; seta -> `estado nulo no histórico sai como travessão` C2; `Histórico é uma lista ordenada` C4 | - |

Precisão: C1 e a tabela de Coverage do `checks.md` dizem "11 linhas" para "9 tipos, `ATRIBUICAO` com e sem
`para`", que são 10. O teste cobre as 10 e mais uma, então não há membro perdido; é contagem errada no check.

Swept: `authorization: existing - a API só manda eventos para a equipe (DetalheChamado.Equipe)` - conferido,
`api/Chamados/Shared/DetalheChamado.cs:47` usa `DaEquipe.Nada` (eventos `null`, `:31`) fora da equipe e só `Equipe(...)` (`:72-80`) monta os eventos e a fixture do aluno chega
com `eventos: null` (`util.tsx:73`). Os demais `n/a` são política aprovada.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Teste que afirma o formato cru do Histórico | `chamado.test.tsx:165-189`, `resposta.test.tsx:164-169`, `icones.test.tsx:18-33`, `textos.test.tsx:83` | reescrito no mesmo commit (`a82cfc0`, o único que toca `web/`); ordem `chamado.test.tsx:184`, fuso `:185` (23:30), lista ordenada `icones.test.tsx:27` continuam afirmados | yes |

## Faults injected

Scratch: `git worktree add --detach <scratchpad>/wt 32ece77`, `web/node_modules` por junção para o da árvore
real; uma falta por vez, revertida com `git checkout` antes da próxima (porcelain do scratch vazio entre
elas). Porcelain da árvore real antes e depois: `?? .idea/`, `?? .specs/features/refatoracao-solid/__pycache__/`,
`?? .specs/features/refatoracao-solid/mutator_windows/__pycache__/` - idênticos. Junção removida com
`rmdir`, worktree removida e podada; nenhum `__pycache__` novo. (Uma primeira tentativa acumulou as faltas
por erro de caminho no revert; foi descartada e refeita limpa; os resultados abaixo são da refeita.)

| Mutation | Location | Killed |
| --- | --- | --- |
| frase `respondeu ao aluno` -> `respondeu o aluno` | `web/src/chamado.ts:53` | yes - `frase de cada tipo de evento` falhou |
| `estado` sem o `Estados` (`Estados[v] ?? v` -> `v`) | `web/src/chamado.ts:46` | yes - `estado nulo no histórico sai como travessão` falhou |
| sufixo do detalhe removido (`${texto} · ${e.detalhe}` -> `texto`) | `web/src/chamado.ts:61` | yes - `detalhe no fim da frase` falhou |
| fallback de tipo desconhecido sem o tipo (`${e.ator} · ${e.tipo}` -> `${e.ator}`) | `web/src/chamado.ts:60` | yes - `Histórico é uma lista ordenada` falhou |
| data sem `text-muted-foreground` | `web/src/chamados/Conversa.tsx:114` | yes - `eventos em ordem no fuso` falhou |

`mutator` não rodou: suspenso por decisão do usuário (AD-025).

## Gate

`cd web && npx vitest run --reporter=verbose` - 229 passed, 0 failed
`cd web && npx playwright test` - 58 passed, 0 failed
`python .specs/features/historico-legivel/chamadas_iguais.py a3d6e05` - 226 testes da base, 0 problema

## Ranked gaps

1. Membro de Coverage sem prova: `LEMBRETE` com `detalhe` (o único formato que a API grava, `api/Agendador.cs:171`) - C3/C1 - `web/src/chamados/chamado.test.tsx:207` usa `LEMBRETE` sem `detalhe`, e `:221-235` não tem `LEMBRETE`. Correção: uma linha a mais no teste `detalhe no fim da frase`, p.ex. `{ tipo: 'LEMBRETE', ator: 'Sistema', detalhe: 'Lembrete ao aluno: 3 dias aguardando resposta' }`. O código (`chamado.ts:61`) já trata o caso.
2. Precisão (não bloqueia): C1 e a Coverage do `checks.md` contam "11 linhas" onde a tabela tem 10 linhas por tipo.
3. Precisão (não bloqueia): C7 afirma ausência do título; a ausência da lista decorre da estrutura (`Conversa.tsx:107`), sem asserção própria.
