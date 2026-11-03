# Histórico legível verification

**Verdict**: PASS
**Profile**: ui
**Diff range**: a3d6e05..2b713e2
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

A lacuna que derrubou a rodada 1 (`LEMBRETE` com `detalhe`, que o agendador sempre grava) agora tem prova
própria, e a falta injetada nela morre só na asserção nova. As duas observações de precisão também foram
tratadas (contagem 10 + 1 no C1/Coverage; C7 afirma a ausência da lista). 11/11 checks com evidência
localizada no HEAD `2b713e2`, Vitest 229/229, Playwright 58/58, 2 faltas novas injetadas e 2 mortas.

Escopo do fix: `git diff --stat 32ece77..2b713e2 -- web/src ':!*.test.*'` é vazio; o fix toca só
`web/src/chamados/chamado.test.tsx` (+3 linhas) e `checks.md`. O resto de `32ece77..2b713e2` é
`ff07f05` (outra feature, só `.specs/`) e o `STATE.md`. O contêiner :8080 serve o mesmo bundle da rodada 1
(`assets/index-CURQlzLk.js`, contém `da responsabilidade`), conferido antes e depois do Playwright.

## Binding sources

Carried from 32ece77. O fix não tocou a interface (nenhum arquivo não-teste em `web/src`), então o passo 1
não roda de novo; a tabela da rodada 1 vale.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `plan.md` `## Screens`, tabela de frases (10 linhas por tipo + 2 fallbacks) | yes - rodada 1 contra `web/src/chamado.ts:47-62`; relida nesta rodada em `plan.md` | none | - |
| `plan.md` `## Screens`, formato da linha (data em `text-muted-foreground`, ` · `, frase, ` · {detalhe}`) | yes - rodada 1 contra `web/src/chamados/Conversa.tsx:111-116` (inalterado) | none | - |
| Decisão do usuário de 03/11 "Frase" | yes - rodada 1, registrada em `plan.md` `## Assumptions` e `## Sources` | none | - |
| `api/Dados/Entidades.cs` `TiposEvento` (9) e `EstadosChamado` (5) | yes - rodada 1, `Entidades.cs:36-56` | none | - |
| `api/Dados/Chamados/Chamado.cs` e `api/Agendador.cs` (o que cada tipo grava em de/para/detalhe) | yes - reaberto nesta rodada: `Chamado.cs:54,130,140,157,160,170-171,177,186,193,200,208`; `Agendador.cs:156,171,185` | none | - |

Observação de texto (carregada, não contradição): a linha real do lembrete fica
`Sistema enviou um lembrete ao aluno · Lembrete ao aluno: N dias aguardando resposta`, agora afirmada
literalmente em `chamado.test.tsx:235`. A tabela aprovada manda anexar o `detalhe`, então está conforme; o
`checks.md` já devolve a decisão de redação ao usuário.

## Checks

Verified at 2b713e2. Uma única execução Vitest (`cd web && npx vitest run --reporter=verbose`, exit 0,
229 passed) e uma Playwright (`cd web && npx playwright test`, exit 0, 58 passed contra :8080). Cada teste
nomeado aparece individualmente com ✓ na saída verbose. Citações de `chamado.test.tsx` refrescadas; as
dos outros arquivos de teste (não tocados pelo fix) conferidas iguais.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 9 tipos + 2 formas de `ATRIBUICAO` (10 linhas de `## Screens`) mais um `TRANSICAO` extra, frase exata, formato `{data} · {frase}` | Vitest exit 0; `chamado.test.tsx > chamado > frase de cada tipo de evento` ✓ | `web/src/chamados/chamado.test.tsx:217` - `expect(itens).toEqual(Casos.map(([, f]) => f))` sobre as 11 linhas `:204-214` (prefixo `02/11/2026 08:00 · ` removido no helper `:198`; se faltar, a igualdade falha) | PASS |
| C2 | `Aguardando aluno para Em atendimento`, sem código com `_`; estado nulo sai `—` | Vitest exit 0; `frase de cada tipo de evento` ✓ e `resposta.test.tsx > conversa do chamado > estado nulo no histórico sai como travessão` ✓ | `chamado.test.tsx:205` caso `'Carla mudou o estado de Aguardando aluno para Em atendimento'`; `:218` - `not.toMatch(/[A-Z]{2,}_[A-Z]+.../)`; `web/src/chamados/resposta.test.tsx:169` - `'02/11/2026 08:00 · Carla mudou o estado de Em atendimento para —'` dentro de `toEqual` | PASS |
| C3 | com `detalhe` termina em ` · {detalhe}` (justificativa, anexo, "Responsável desativado", lembrete do agendador); sem, não termina em ` · ` | Vitest exit 0; `chamado.test.tsx > chamado > detalhe no fim da frase` ✓ | `chamado.test.tsx:231-236` - `toEqual(['Carla mudou o estado de Aberto para Fechado · Aluno desistiu', 'Carla anexou um arquivo · boleto.pdf', 'Sistema tirou Bruno da responsabilidade · Responsável desativado', 'Sistema enviou um lembrete ao aluno · Lembrete ao aluno: 3 dias aguardando resposta', 'Carla escreveu uma nota interna'])`; entrada do lembrete em `:228` | PASS |
| C4 | tipo `ABERTURA` sai `Ana · ABERTURA`, ainda item da lista ordenada | Vitest exit 0; `icones.test.tsx > ícone e lista do detalhe > Histórico é uma lista ordenada` ✓ | `web/src/chamados/icones.test.tsx:27` - `expect(lista.tagName).toBe('OL')`; `:29` - `'02/11/2026 08:00 · Ana · ABERTURA'` dentro de `toEqual` | PASS |
| C5 | estado `SUSPENSO` sai cru | Vitest exit 0; `estado desconhecido sai cru` ✓ | `chamado.test.tsx:242` - `toEqual(['Carla mudou o estado de Aberto para SUSPENSO'])` | PASS |
| C6 | ordem da API, fuso `America/Cuiaba` (`03:30Z` = `01/11/2026 23:30`), data em `text-muted-foreground` | Vitest exit 0; `eventos em ordem no fuso` ✓ | `chamado.test.tsx:185-189` - `toEqual(['01/11/2026 23:30 · Sistema abriu a solicitação', '02/11/2026 08:00 · Carla atribuiu a Carla', '02/11/2026 08:00 · Carla mudou o estado de Aberto para Em atendimento'])`; `:190` - `toHaveClass('text-muted-foreground')` | PASS |
| C7 | aluno (`eventos: null`) sem título "Histórico" nem lista | Vitest exit 0; `aluno não vê resumo no detalhe` ✓ | `chamado.test.tsx:60` - `expect(screen.queryByText('Histórico')).not.toBeInTheDocument()`; `:61` - `expect(screen.queryByTestId('eventos')).not.toBeInTheDocument()` (o `data-testid="eventos"` é o do `<ol>`, `Conversa.tsx:111`) | PASS |
| C8 | texto visível da tela 9 = `interface-nova` + frase do fixture, sem sobra | Vitest exit 0; `textos.test.tsx > textos > textos detalhe do chamado` ✓ | `web/src/chamados/textos.test.tsx:83` - `'Carla mudou o estado de Aberto para Em atendimento'` em `ValoresDaEquipe`, conferido pelo `t.conferir(tela())` do teste (`:92-99`) | PASS |
| C9 | suítes inteiras passam; só as 4 asserções de `## Test policy` mudaram | Vitest exit 0, 229 passed; Playwright exit 0, 58 passed contra :8080 (bundle `index-CURQlzLk.js`) | `git diff a3d6e05..2b713e2 -- web/src`: asserções mudadas só em `chamado.test.tsx:185-190`, `resposta.test.tsx:165-169`, `icones.test.tsx:29-30`, `textos.test.tsx:83`; o fix só acrescentou (`chamado.test.tsx:61`, `:228`, `:235`), nenhuma asserção existente mudou | PASS |
| C10 | cada teste da base faz as mesmas chamadas em base e HEAD, salvo o teste renomeado | `python .specs/features/historico-legivel/chamadas_iguais.py --autoteste` -> `autoteste ok`, exit 0; `... a3d6e05` -> `226 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD`, exit 0 (na 3ª execução; ver nota) | `.specs/features/historico-legivel/chamadas_iguais.py:15-18` - `mod.REESCRITOS` só com o teste renomeado (inalterado desde a rodada 1, cujo julgamento da emenda vale) | PASS |
| C11 | `crapper` 0 no limite 9.99, `dryer` sem candidato 0.8+, `mutator` suspenso | `npm --prefix web run coverage` exit 0 (229 passed); `crapper --use-existing-coverage -s src --threshold 9.99` exit 0; `dryer ... --threshold 0.8 ...` exit 0, saída `No duplicate candidates found.`; `mutator` não rodado (AD-025) | `crapper`: `frase chamado 4 100.0% 4.0`, `estado chamado 3 100.0% 3.0` (gravado em `web/.metrics/crap.edn`) | PASS |

**Nota sobre o C10 (não bloqueia).** As duas primeiras execuções de `chamadas_iguais.py a3d6e05` saíram
1 com `a suíte de HEAD falhou` e depois `a suíte de a3d6e05 falhou`: 3 testes de `src/assistente`
(`limite destaca Falar com atendente`, `o limite conta só as mensagens do aluno...`, `a conversa fica num
log`) estouraram o timeout de 5s com texto digitado embaralhado (`apgreemc i8so d`), um lado de cada vez.
São testes que esta feature não toca, a falha trocou de lado entre execuções e a máquina estava com outra
feature em andamento (`vite preview` de `D:\one-system-barra`); a 3ª execução, sem mudança alguma, saiu 0.
Leio como instabilidade de carga do `user-event` nas suítes do assistente, não como diferença de chamadas.
Fica como risco do instrumento: a prova do C10 pode dar falso vermelho sob carga.

## Coverage

Verified at 2b713e2 para a linha `detalhe` (a única cuja autoridade o fix tocou) e a linha de contagem das
frases; as demais carried from 32ece77 (o fix não acrescenta ramo nem membro).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| tipos de evento que a API grava com `detalhe` não nulo (4 tipos, 5 origens) | `Chamado.cs:157` (ATRIBUICAO), `:186` (ANEXO), `:208` (TRANSICAO, justificativa), `:170-171` (único ponto que grava `Detalhe` no agregado); `Agendador.cs:156` (TRANSICAO, fechamento automático), `:171` (LEMBRETE, sempre); `:185` sem detalhe | TRANSICAO C3 `chamado.test.tsx:232` (o fechamento automático passa pelo mesmo `Frases.TRANSICAO` e o mesmo sufixo); ANEXO C3 `:233`; ATRIBUICAO C3 `:234`; LEMBRETE C3 `:235` | - |
| linhas por tipo de `## Screens` (10) | tabela de `plan.md` `## Screens` | 9 tipos com `ATRIBUICAO` em 2 formas -> C1 `chamado.test.tsx:204-213`; 11º caso `:214` é um `TRANSICAO` extra (Resolvido -> Fechado). O check agora diz "10 linhas ... mais um TRANSICAO; 11 casos" | - |
| tipos de evento (9) | `api/Dados/Entidades.cs:45-56` `TiposEvento` (carried) | os 9 -> C1, uma linha cada em `chamado.test.tsx:204-214` | - |
| fallbacks (3) | `## Screens` (2 linhas) + AC 2 (estado nulo) (carried) | tipo desconhecido C4 `icones.test.tsx:29`; estado desconhecido C5 `chamado.test.tsx:242`; estado nulo C2 `resposta.test.tsx:169` | - |
| rótulos de estado (5) | `api/Dados/Entidades.cs:36-43` `EstadosChamado` (carried) | ABERTO C5/C6; EM_ATENDIMENTO C1/C2; AGUARDANDO_ALUNO C1/C2; RESOLVIDO e FECHADO C1 `chamado.test.tsx:214` | - |
| ator (2 origens) | `api/Chamados/Shared/DetalheChamado.cs:77` (carried) | nome C1 ("Carla"); "Sistema" C1 `chamado.test.tsx:204,208`, C3 `:234-235`, C6 `:186` | - |
| quem vê (2) | AC 7, `DetalheChamado` (carried) | equipe C1, C8; aluno C7 (título `:60` e lista `:61`) | - |
| testes reescritos (4) | `checks.md` `## Test policy` Evidence + diff (carried) | `eventos em ordem no fuso` C6; `textos detalhe do chamado` C8; seta -> `estado nulo no histórico sai como travessão` C2; `Histórico é uma lista ordenada` C4 | - |

Swept (carried from 32ece77): `authorization: existing` conferido em `DetalheChamado.cs:47,72-80`.

## Test policy rows

Verified at 2b713e2 (a linha classifica `chamado.test.tsx`, tocado pelo fix).

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Teste que afirma o formato cru do Histórico | `chamado.test.tsx:166-190`, `resposta.test.tsx:164-169`, `icones.test.tsx:18-33`, `textos.test.tsx:83` | reescrito no mesmo commit (`a82cfc0`); o fix só acrescenta linhas. Ordem `chamado.test.tsx:185`, fuso `:186` (23:30), lista ordenada `icones.test.tsx:27` continuam afirmados | yes |

## Faults injected

Verified at 2b713e2, só nas superfícies novas do fix (as 5 faltas da rodada 1 carried from 32ece77; o código
não mudou desde então). Scratch: `git worktree add --detach <scratchpad>/wt HEAD`, `web/node_modules` por
junção para o da árvore real; uma falta por vez, revertida com `git checkout` (porcelain do scratch vazio
entre elas). Porcelain da árvore real antes e depois idênticos (`diff` vazio: `?? .idea/` e os dois
`__pycache__` de `refatoracao-solid` que já existiam). Junção removida com `rmdir`, worktree removida e
podada; nenhum `__pycache__` novo.

| Mutation | Location | Killed |
| --- | --- | --- |
| `LEMBRETE` perde o sufixo do detalhe (`e.detalhe ?` -> `e.detalhe && e.tipo !== 'LEMBRETE' ?`) | `web/src/chamado.ts:61` | yes - `detalhe no fim da frase` falhou; `frase de cada tipo de evento` passou (só a asserção nova pega) |
| aluno recebe a lista vazia sem título (`return null` -> `return <ol data-testid="eventos" />`) | `web/src/chamados/Conversa.tsx:107` | yes - `aluno não vê resumo no detalhe` falhou em `chamado.test.tsx:61`; a asserção do título `:60` passou (só a asserção nova pega) |

`mutator` não rodou: suspenso por decisão do usuário (AD-025).

## Gate

`cd web && npx vitest run --reporter=verbose` - 229 passed, 0 failed
`cd web && npx playwright test` - 58 passed, 0 failed
`python .specs/features/historico-legivel/chamadas_iguais.py a3d6e05` - 226 testes da base, 0 problema (3ª execução; as 2 primeiras caíram em timeouts de `src/assistente`, ver nota do C10)

## Ranked gaps

Nenhum bloqueante.

1. Risco do instrumento (não bloqueia): o C10 deu falso vermelho 2 vezes por timeouts de `user-event` em `src/assistente/*.test.tsx` sob carga - `.specs/features/historico-legivel/chamadas_iguais.py` (via o script da `redesign-institucional`).
2. Cosmético (não bloqueia): o comentário `web/src/chamados/chamado.test.tsx:201` ainda diz "as 11 linhas de ## Screens", que são 10 linhas mais um caso extra; o check já foi corrigido.
3. Redação (decisão do usuário, carried): a frase do lembrete repete o assunto (`chamado.test.tsx:235`).
