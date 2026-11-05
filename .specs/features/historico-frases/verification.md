# Histórico com o autor certo em cada frase verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 358b2bf..01bfceb
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Os 11 checks passam com evidência localizada e as 5 falhas injetadas morreram. O FAIL vem de um membro que nenhum check cobre: depois de renomear o atendente, o Histórico escreve uma frase falsa (`Nome Corrigido atribuiu a Pessoa 9ff6c9`), e o plano prometia "sem frase falsa". A frase não é regressão desta feature: a redação antiga caía no mesmo ramo.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `historico-legivel/plan.md` `## Screens` (tabela de frases e emenda de 05/11, linha 76) | yes - arquivo lido na íntegra da seção | none - C3 a C7 repetem a emenda; `ATRIBUICAO` sem `para` continua igual à linha 66 | - |
| `historico-frases/plan.md` `## Criteria` (AC 1 a AC 8) | yes - arquivo lido | none - C1 a C8 repetem os AC | - |

Enumeração por tela. O Histórico continua sendo uma lista `ol` com `{data} · {frase}` e ` · {detalhe}` no fim; `web/src/chamados/Conversa.tsx` não está no diff (só a chamada `frase(e)` em `:111`). Linha, ordem e fuso seguem afirmados em `web/src/chamados/chamado.test.tsx:222-226`, e o detalhe em `:283`. A feature não muda arranjo, controle nem região. As linhas da tabela fora da emenda têm caso em `chamado.test.tsx:240-249` e rodaram em C10. Não há cláusula geral de exceção visual nos checks.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | solicitante `true`; atendente e sem autor `false` | `dotnet test api.Tests --filter "...Evento_diz_se_veio_do_aluno"` Aprovado, 5 de 5 no lote | `api.Tests/ChamadoFluxoTests.cs:265` - `Assert.Contains(("CRIACAO", "Sistema", false), eventos)`; `:266` - `("RESPOSTA", b.A.Usuario.Nome, false)`; `:267` - `("RESPOSTA", b.Aluno.Usuario.Nome, true)` | PASS |
| C2 | homônimo do aluno recebe `false`, aluno segue `true` | `...Atendente_com_o_nome_do_aluno_nao_vira_aluno` Aprovado | `api.Tests/ChamadoFluxoTests.cs:287` - `Assert.Equal([("RESPOSTA", b.Aluno.Usuario.Nome, false), ("RESPOSTA", b.Aluno.Usuario.Nome, true)], respostas)` | PASS |
| C3 | `RESPOSTA` do aluno sai `respondeu à equipe` | `cd web && npx vitest run src/chamados/chamado.test.tsx -t "frases com o autor certo"` 1 passed, 16 skipped | `web/src/chamados/chamado.test.tsx:260` - `'Mariana respondeu à equipe'`, afirmado por `:267` `expect(await historico(...)).toEqual(Casos.map(([, f]) => f))` | PASS |
| C4 | `RESPOSTA` da equipe sai `respondeu ao aluno` | o mesmo teste | `web/src/chamados/chamado.test.tsx:261` - `'Carla respondeu ao aluno'`, via `:267` | PASS |
| C5 | assumiu sem anterior | o mesmo teste | `web/src/chamados/chamado.test.tsx:262` - `'Carla assumiu a solicitação'`, via `:267` | PASS |
| C6 | assumiu com anterior | o mesmo teste | `web/src/chamados/chamado.test.tsx:263` - `'Carla assumiu a solicitação no lugar de Bruno'`, via `:267` | PASS |
| C7 | `para` de outro e sem `para` mantêm a frase | o mesmo teste | `web/src/chamados/chamado.test.tsx:264` - `'Carla atribuiu a Bruno'`; `:265` - `'Sistema tirou Bruno da responsabilidade'`, via `:267` | PASS |
| C8 | aluno recebe `eventos: null`; outro setor recebe `404` | `...Aluno_nao_recebe_eventos` e `...Detalhe_fora_do_setor_continua_404` Aprovados | `api.Tests/ChamadoFluxoTests.cs:301` - `Assert.Equal(JsonValueKind.Null, (await r.Json()).GetProperty("eventos").ValueKind)`; `:311` - `Assert.Equal(HttpStatusCode.NotFound, ...)` | PASS |
| C9 | retrato só ganha `doAluno` nos eventos | `...RetratoTests.Corpos_de_sucesso_iguais_aos_da_base` Aprovado; `diff` contra `358b2bf` sem saída, exit 0 | `api.Tests/RetratoTests.cs:301` - o teste; `api.Tests/Retratos/sucessos.txt:42` - primeira das 8 linhas de equipe com `"doAluno"` em evento | PASS |
| C10 | suítes verdes e build | `dotnet test api.Tests` 581 de 581, exit 0; `npx vitest run` 525 de 525, exit 0, rodando sozinho; `npm --prefix web run build` exit 0 | `web/src/chamado.ts:10` - `doAluno: boolean` obrigatório em `Evento`, cobrado pelo build | PASS |
| C11 | `crapper` sai 0 no limite 9.99 e `dryer` sem candidato | `npm --prefix web run coverage` 525 de 525; `crapper` exit 0, maior nota 9.8 (`Sidebar`); `dryer` exit 0, "No duplicate candidates found" | `web/.metrics/crap.edn` e `web/.metrics/dry.edn` gravados nesta execução; `web/src/chamado.ts:47` - `atribuicao` abaixo do limite | PASS |

Nota sobre C10 e C11: a primeira rodada do Vitest foi em paralelo com o `dotnet test` deste Verificador, e testes fora da feature estouraram 5 s (`assistente.test.tsx > limite oferece só dois botões`, e no `coverage` também 2 de `conversa.test.tsx`). Rodando sozinhos, deram 525 de 525. Os números acima são dessa segunda rodada.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| autor do evento (3) | `api/Dados/Chamados/Chamado.cs:54,171`, `api/Agendador.cs:157,172,186` | solicitante C1 · atendente C1 · sem autor C1 (`CRIACAO`; os do agendador caem na mesma comparação) | - |
| frase de `RESPOSTA` (2) | `web/src/chamado.ts:58` | true C3 · false C4 | - |
| ramos de `atribuicao` (4) | `web/src/chamado.ts:48-50` | sem anterior C5 · com anterior C6 · `para` diferente C7 · sem `para` C7 | - |
| `ATRIBUICAO` como o domínio grava e a rota lê (4, autoridade: `Chamado.cs`, não o `web/`) | `api/Dados/Chamados/Chamado.cs:63,81,96,113,131,157`; `api/Chamados/Shared/DetalheChamado.cs:88` | mesma pessoa sem anterior C5 · mesma pessoa com anterior C6 · sem `para` C7 · mesma pessoa renomeada depois: sem prova | mesma pessoa renomeada depois de assumir: `para` é o nome gravado e `ator` é o nome atual, e sai `{novo} atribuiu a {antigo}` (sonda real) |
| `GET /api/chamados/{numero}` statuses (2) | `api/Chamados/VerChamado.cs:18` | 200 C1 · 404 C8 | - |
| quem lê os eventos (2) | `api/Chamados/Shared/DetalheChamado.cs:42,50` | equipe C1 · aluno C8 | - |
| linhas do retrato que devolvem o corpo com `doAluno` em evento (8; as 7 POST ficam fora do `Surface`) | `api/Chamados/AgirNoChamado.cs:35`; diff de `sucessos.txt` | GET · `mensagens` · `mensagens` nota · `resolver` · `assumir` · `reclassificar` · `encaminhar` · `duplicado`, todas no retrato, C9 | - |

Papel duplo verificado, sem achado: quem é solicitante sempre entra como `ALUNO` (`api/Chamados/ChamadoRotas.cs:14`), então `RESPOSTA` com `doAluno: true` nunca vem de quem age como equipe. O administrador que abre chamado próprio e desativa um atendente grava `ATRIBUICAO` com `doAluno: true` (`DesativarUsuario.cs:26`), o que respeita o AC 1, e `frase` não lê `doAluno` nesse tipo.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide, atravessa a rota HTTP (`doAluno`) | `api/Chamados/Shared/DetalheChamado.cs` | na rota: C1, C2 | yes - os 3 autores em `ChamadoFluxoTests.cs:265-267`, o homônimo em `:287` |
| Decide, na tela (`frase`) | `web/src/chamado.ts` | na própria camada: C3 a C7 | yes - 2 de `RESPOSTA` e 4 de `ATRIBUICAO` em `chamado.test.tsx:260-265` |

`Swept`, linhas `existing`: `frase` trata tipo desconhecido em `web/src/chamado.ts:65`, provado em `web/src/chamados/icones.test.tsx:29`; `Historico` não está no diff. As duas restrições citadas existem.

## Faults injected

Isolamento: `git worktree` descartável sob o scratchpad. `git status --porcelain` do repositório real igual antes e depois (4 linhas não rastreadas, sem relação com a feature).

| Mutation | Location | Killed |
| --- | --- | --- |
| comparar pelo nome em vez do id: `nomes[x] == nomes[c.SolicitanteId]` | `api/Chamados/Shared/DetalheChamado.cs:88` | yes - C2 com falha; C1 aprovado, ou seja, só o homônimo pega |
| `doAluno` sempre `false` | `api/Chamados/Shared/DetalheChamado.cs:88` | yes - C1 e `Corpos_de_sucesso_iguais_aos_da_base` com falha |
| `RESPOSTA` ignora `doAluno`, sempre `respondeu ao aluno` | `web/src/chamado.ts:58` | yes - `frases com o autor certo` com falha |
| aluno recebe os eventos da equipe | `api/Chamados/Shared/DetalheChamado.cs:50` | yes - `Aluno_nao_recebe_eventos` com falha |
| retirar a checagem de setor do atendente | `api/Chamados/ChamadoRotas.cs:15` | yes - `Detalhe_fora_do_setor_continua_404` com falha |

Toda prova nomeada falhou uma vez, salvo a dos ramos de `atribuicao`, que divide o teste de tabela com a falha 3 e tem o esperado literal por linha. O `mutator` não rodou (AD-025).

## Gate

`dotnet test api.Tests` - 581 passed, 0 failed
`cd web && npx vitest run` - 525 passed, 0 failed
`npm --prefix web run build` - exit 0
`crapper` - exit 0; `dryer` - exit 0

## Ranked gaps

1. **Frase falsa depois de renomear o atendente** - coverage, S1 "sem frase falsa", AC 7 - `web/src/chamado.ts:49`, `api/Chamados/Shared/DetalheChamado.cs:88`. Sequência real: o atendente assume, e o administrador corrige o nome por `PUT /api/admin/usuarios/{id}` (`api/Administracao/UsuarioRotas.cs:53`); `ImportarMatriculas.cs:58` também reescreve o nome. A sonda pela rota devolveu `ATRIBUICAO ator=Nome Corrigido de= para=Pessoa 9ff6c9`, e `frase` escreve `Nome Corrigido atribuiu a Pessoa 9ff6c9`. Nenhum código do domínio grava atribuição a outra pessoa: os 3 chamadores com responsável novo usam o próprio ator (`Chamado.cs:63,81,96`). Logo, em dado real, o ramo `atribuiu a` só é alcançado por esse caminho. O AC 7 manda exatamente isso, portanto o defeito está no plano, e o `Impact` em `plan.md:28` ("eventos antigos ganham a frase certa") não vale para esses eventos. A própria `historico-legivel/plan.md:110` já avisava que distinguir pelo nome é frágil. Corrigir pede decisão de plano.
2. **`Carla tirou Carla da responsabilidade`** - sem check, observação - `api/Dados/Chamados/Chamado.cs:131`. É o caso comum de quem assumiu e encaminha, confirmado por sonda. A frase é verdadeira e a tabela binding a mantém (`historico-legivel/plan.md:66`), então não sustenta o FAIL. Só que tem a mesma forma de "Marcos atribuiu a Marcos", que motivou a feature; cabe ao usuário decidir.
3. **`Surface` e `Flow` citam só o GET** - consumidor omitido, sem efeito no comportamento - `plan.md:38`, `api/Chamados/AgirNoChamado.cs:35`. As ações da equipe devolvem o mesmo corpo, e o `web/` desenha o Histórico a partir dele (`web/src/chamados/ChamadoDetalhe.tsx:391`). O campo sai certo porque a montagem é a mesma, e o retrato prova as 7 linhas POST.
4. **`Impact` fala em 4 arquivos de fixture; são 5** - documento - `plan.md:25`, `web/e2e/simulada.ts:21`. O `Handoff` cita o quinto. Nenhuma prova desta feature roda o Playwright.

## Not checked

- Passo 5 (percorrer o fluxo com o usuário): não feito, não cabe nesta execução.
- O teste independente do plano em navegador real: C3 a C7 são jsdom sobre JSON simulado. A rota e a tela só foram ligadas por leitura do campo comum.
- Playwright (`web/e2e`): não rodou; nenhum check o pede.
