# CRAP abaixo de 10 nas funções antigas do web verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 8cd91fd..27e28a4
**Round**: 4 - full
**Verifier**: independent sub-agent (author != verifier)

Rodadas anteriores:
- Rodada 1 (`8cd91fd..51be573`): FAIL. K1 não rodou e K3/K4 saíram 1 por timeouts de ambiente; sobreviveram `precisaConfirmar` `||`→`&&` e os rótulos trocados em `BotaoVerSenha`.
- Rodada 2 (`8cd91fd..7414eab`): FAIL só por mutantes. K1 a K9 PASS; sobreviveram A10, S2, S4, S5 e S7 (S1 e S3 julgados equivalentes).
- Rodada 3 (`8cd91fd..a3dc738`): FAIL só por mutantes. K1 a K9 PASS; os 5 da rodada 2 morreram; sobreviveram N3 (`vazioDaAba` sem `&& todos?.length`), N4 (`AdicionarNoProximo` `cheia ?`→`false ?`) e N5 (`PublicarBotao` sem `|| !valida`).

Desde a rodada 3 só entrou `27e28a4`: `export` em `vazioDaAba`, `AdicionarNoProximo` e `PublicarBotao` (3 linhas) e 3 testes no describe `decisões do editor de fluxo e da Aparência` de `canvas.test.tsx` (`busca sem itens mostra o vazio da aba, não o sem resultado`, `canvas cheio não oferece adicionar o próximo nó`, `Publicar só habilitado salvo, válido e sem pendência`). Escopo do diff completo (`git diff --stat 8cd91fd..HEAD`): 15 arquivos, +480 −110. Bate com Impact e Surface.

Ambiente: Vitest pelo PowerShell em `<repo>`, sempre com `--maxWorkers=4`, uma execução de cada vez. `crapper`/`dryer` em `web/` com `PYTHONUTF8=1`. A suíte .NET não rodou: `git diff --quiet 8cd91fd HEAD -- One.Api One.Api.Tests` sai 0.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| K1 | `crapper` sai 0, sem `N/A`, nota máxima ≤ 9.99, as 8 funções com `Cov%` numérico e nota ≤ 9.99 | `PYTHONUTF8=1 rtk bypass crapper --use-existing-coverage -s src --threshold 9.99` em `web/`, depois do K4 (`lcov.info` gravado às 12:34:53) | exit 0, 553 funções, `grep -c 'N/A'` = 0. Maior nota: `Sidebar` (`ui.sidebar`) 9.8. As 8: `Corpo` (Canvas) CC 7, 66.7%, 8.8; `Campo` (acesso.Acesso) 8, 100%, 8.0; `Formulario` (administracao.Aparencia) 6, 90.0%, 6.0; `Detalhe` (chamados.ChamadoDetalhe) 5, 100%, 5.0; `EdicaoDoFluxo` 4, 100%, 4.0; `aplicar` 4, 100%, 4.0; `PainelDaAba` 3, 100%, 3.0; `CampoDeTexto` 2, 100%, 2.0. As exportadas: `vazioDaAba` 5.0, `descricaoDe` 4.0, `montarBarra` 4.0, `PublicarBotao` 3.0, `deveBloquear` 3.0, `AdicionarNoProximo` 2.0, `emCanvas` 2.0, `semPendencia` 2.0, todas 100% | PASS |
| K2 | Toda linha `expect(` e todo nome de teste da base seguem no HEAD; nenhum teste apagado ou renomeado | os três comandos como escritos, no Git Bash na raiz | `comm -23` de `expect(`: sem saída, exit 0 (1668 na base, 1703 no HEAD). `git diff --diff-filter=DR --name-only 8cd91fd..HEAD -- web/src`: sem saída. `comm -23` de `it(`/`it.each(`/`test(`: sem saída | PASS |
| K3 | `npm --prefix web test -- --maxWorkers=4` sai 0, 0 falhas, 0 skipped/todo, ≥ 68/648, diferença explicada | `rtk bypass npm --prefix web test -- --maxWorkers=4` | exit 0, 175,8 s, `Test Files 68 passed (68)`, `Tests 658 passed (658)`, sem `skipped`/`todo`; `grep -E '\.(skip\|todo\|only)[(]'` nos testes: nada. 658 − 648 = 10 testes novos: `botão do olho mostra e oculta a senha`, `remover pede confirmação com só prazo ou só setor`, os 7 de `decisões do editor de fluxo e da Aparência` e o de `barra do chamado no celular` | PASS |
| K4 | `npm --prefix web run coverage -- --maxWorkers=4` sai 0 e grava `lcov.info` com `SF:` dos 7 arquivos | `rtk bypass npm run coverage -- --maxWorkers=4` em `web/` | exit 0, 212,4 s, `Test Files 68 passed (68)`, `Tests 658 passed (658)`. `web/coverage/lcov.info` 107379 bytes, 97 `SF:`; uma entrada cada para `src\acesso\Acesso.tsx`, `src\administracao\Aparencia.tsx`, `Cadastros.tsx`, `Canvas.tsx`, `EdicaoDoFluxo.tsx`, `src\aparencia.tsx`, `src\chamados\ChamadoDetalhe.tsx` | PASS |
| K5 | `dryer` nas 6 fatias + 26 arquivos da raiz, `--threshold 0.8`, imprime exatamente `No duplicate candidates found.`; escopo certo | `PYTHONUTF8=1 rtk bypass dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao -s src/App.tsx ... --threshold 0.8` em `web/` (26 `-s` da raiz tirados de `git ls-files 'src/*.ts' 'src/*.tsx'` sem subpasta e sem `.test.`; 32 `-s` no total). Escopo: `escopo_dryer.py` (lido antes: só `parse_args`, `select_files`, `scan_files` e impressão) no Python do dryer com `-I` e os mesmos argumentos | exit 0; stdout exatamente `No duplicate candidates found.` (`Wrote ...\.metrics\dry.edn` no stderr). Escopo: `TOTAL arquivos=63 formas=320 avisos=0`; `(raiz) 26, acesso 2, administracao 25, assistente 2, chamados 3, conhecimento 4, indicadores 1`; 0 arquivos `.test.`, `src/ui/`, `src/ilustracoes/` ou `src/test/` | PASS |
| K6 | `npm --prefix web run build` sai 0 (com `tsc --noEmit`) | `rtk bypass npm --prefix web run build` | exit 0, `tsc --noEmit && vite build`, `✓ built in 1.16s`, `files generated` | PASS |
| K7 | Os 9 specs E2E saem 0 com 233 passados sobre a imagem do HEAD | herdado da rodada 1 (stack docker parado): a rodada 1 rodou o comando sobre a imagem de `51be573` com `exit 0, 233 passed (6.7m)`. `git diff --name-only 51be573..HEAD`, `git diff 51be573..HEAD -- web/src ':!*.test.tsx'`, `git diff --name-only 51be573..HEAD -- web/e2e` | depois de `51be573`: `checks.md` desta feature, 5 arquivos de produto e 6 de teste; nada em `web/e2e` (sem saída). O diff de produto é só `function` → `export function` em 8 linhas (`descricaoDe`, `vazioDaAba`, `AdicionarNoProximo`, `emCanvas`, `deveBloquear`, `semPendencia`, `PublicarBotao`, `montarBarra`; 5 arquivos, +8 −8), sem efeito de comportamento | PASS (herdado da rodada 1) |
| K8 | O diff só toca `web/src/` (os 7 arquivos, testes novos e os 3 testes da emenda) e `.specs/`; nada em API, `ui/`, `package*.json`, `vite.config.ts`, `index.css` | `git diff --name-only 8cd91fd..HEAD`; `git diff --quiet 8cd91fd HEAD -- One.Api One.Api.Tests web/src/ui web/package.json web/package-lock.json web/vite.config.ts web/src/index.css` | 15 caminhos: os 7 de produto, `acesso.test.tsx`, `canvas.test.tsx`, `resposta.test.tsx`, os 3 de `assistente/` da emenda de 11/11, `plan.md` e `checks.md`. `git diff --quiet`: exit 0 | PASS |
| K9 | Nenhuma linha acrescentada em `.ts`/`.tsx` tem comentário | `git diff 8cd91fd..HEAD -- 'web/src/*.ts' 'web/src/*.tsx' \| grep -E '^\+' \| grep -E '//\|/\*'` | sem saída (o `grep` sai 1) | PASS |

## Faults injected

Num worktree de `27e28a4` fora do repositório (`%TEMP%\verif-r4`, L-014) com junção `web\node_modules` → `<repo>\web\node_modules`. Cada mutação foi aplicada por script que exige o trecho original exatamente 1 vez, rodou `npx vitest run <alvo> --maxWorkers=4` e desfez com `git checkout`; `git status --short` do worktree ficou vazio depois de cada uma. No fim a junção saiu com `cmd /c rmdir` antes de `git worktree remove --force`; `git worktree list` mostra só `<repo> 27e28a4 [main]` e `web/node_modules` segue íntegro.

Ruído de ambiente: no worktree, `npx vitest run src/administracao` sem mutação nenhuma saiu 1 (`3 failed | 145 passed`: `aparencia.test.tsx` > `erro da API aparece e o formulário fica` e `contraste ao lado da cor e Salvar desabilitado`, `textos.test.tsx` > `textos Cadastros`, por timeout de 5000 ms). Por isso um mutante só conta como pego quando falha um teste que não está nessa lista e com asserção ligada à mutação.

| # | Arquivo | Função | Mutação | Testes rodados | Teste que pegou | Pega |
| --- | --- | --- | --- | --- | --- | --- |
| N3 | `administracao/Cadastros.tsx` | `vazioDaAba` | `busca.trim() && todos?.length ?` → `busca.trim() ?` | `src/administracao` (148) | `canvas.test.tsx` > `busca sem itens mostra o vazio da aba, não o sem resultado` (`AssertionError ... Object.is equality`) | sim |
| N4 | `administracao/Canvas.tsx` | `AdicionarNoProximo` | `cheia ? null :` → `false ? null :` | `src/administracao` | `canvas.test.tsx` > `canvas cheio não oferece adicionar o próximo nó` (`expected { …(10) } to be null`) | sim |
| N5 | `administracao/EdicaoDoFluxo.tsx` | `PublicarBotao` | `!salvo \|\| !valida \|\| pendente` → `!salvo \|\| pendente` | `src/administracao` | `canvas.test.tsx` > `Publicar só habilitado salvo, válido e sem pendência` (`expected false to be true`) | sim |
| A10 | `chamados/ChamadoDetalhe.tsx` | `montarBarra` | `principal \|\| temMais` → `&&` | `src/chamados` (104) | `resposta.test.tsx` > `barra do chamado no celular` > `aparece com ação principal ou com mais ações, só no celular` (`expected undefined to deeply equal { principal: 'Assumir', …}`) | sim |
| S2 | `administracao/EdicaoDoFluxo.tsx` | `deveBloquear` | tira `&& atual !== proximo` | `src/administracao` | `canvas.test.tsx` > `sair sem salvar só bloqueia com alteração, sem ignorar e para outra rota` (`expected true to be false`) | sim |
| S4 | `administracao/EdicaoDoFluxo.tsx` | `emCanvas` | tira `&& !estreito` | `src/administracao` | `canvas.test.tsx` > `canvas só em tela larga` (`expected true to be false`); também `paginaDoFluxo.test.tsx` > `barra do editor` | sim |
| S5 | `administracao/EdicaoDoFluxo.tsx` | `semPendencia` | tira `&& !pendente` | `src/administracao` | `canvas.test.tsx` > `ação liberada só sem requisição pendente` (teste puro, sem render) e mais 13, entre eles `canvas` > `alternar mantém a edição` | sim |
| S7 | `administracao/Aparencia.tsx` | `descricaoDe` | `erro && \`${id}-erro\`` → `false && ...` | `src/administracao` | `canvas.test.tsx` > `descrição do campo junta dica e erro` (`expected 'nome-dica' to be 'nome-dica nome-erro'`) | sim |
| R1a | `administracao/Canvas.tsx` | `precisaConfirmar` | `\|\|` → `&&` | `src/administracao` | `canvas.test.tsx` > `remover pede confirmação com só prazo ou só setor` (`Unable to find role="dialog" and name "Remover a etapa?"`) | sim |
| R1b | `acesso/Acesso.tsx` | `BotaoVerSenha` | rótulos `Ocultar senha`/`Mostrar senha` trocados | `src/acesso` (97) | `acesso.test.tsx` > `botão do olho mostra e oculta a senha` (`Unable to find ... name "Mostrar senha"`) | sim |
| N8 (novo) | `administracao/Cadastros.tsx` | `vazioDaAba` | `aba === 'fluxos' ? SemFluxo` → `aba !== 'fluxos' ?` | `src/administracao` | `fluxos.test.tsx` > `estado vazio`, `admin.test.tsx` > `lista vazia numa linha` (`Unable to find ... "Nenhum item cadastrado."`), `canvas.test.tsx` > `busca sem itens ...` (`expected undefined to be defined`) | sim |
| N9 (novo) | `administracao/Canvas.tsx` | `AdicionarNoProximo` | `vazio={grafo.nos.length === 0}` → `!== 0` (texto `Adicionar a primeira etapa` e o tamanho do botão invertidos) | `src/administracao`; depois `canvas`, `paginaDoFluxo`, `textos`, `integracoes`, `aparencia`, `fluxos` `.test.tsx` | inconclusivo: as falhas foram timeouts ou estão na lista de ruído (`aparencia`, `textos`, `integracoes` > `abas`/`aba MCP em breve`, `paginaDoFluxo` > `barra do editor`), e as 4 de `canvas.test.tsx` na segunda execução (`cadeia inválida desliga salvar e publicar`, `cadeia inválida: o sexto nó é marcado`, `salvar envia ordem e posição...`, `remover nó pede confirmação se tem setor ou prazo`) não têm asserção ligada ao `vazio` e não foram isoladas. `grep` de `primeira etapa` em `web/src/**/*.test.tsx` e `web/e2e`: nada | não provado |

Os 10 mutantes pedidos (N3, N4, N5 e a amostra A10, S2, S4, S5, S7, R1a, R1b) morrem, cada um num teste ligado à mutação. Dos 2 novos, N8 morre; N9 ficou sem prova: o coordenador encerrou a rodada antes de uma execução isolada de `canvas.test.tsx` com N9. A condição vem da base (`Canvas.tsx:222` de `8cd91fd`, `vazio={grafo.nos.length === 0}`), movida sem mudança: lacuna herdada, não regressão. Não é equivalente: muda o texto visível do botão e a classe.

## Gaps (ranked)

1. **N9, `AdicionarNoProximo` (`Canvas.tsx`), `vazio` invertido no botão de adicionar.** Nenhum teste unitário nem E2E procura `Adicionar a primeira etapa`; provável sobrevivente, não provado. Pela regra (prova incompleta = FAIL) é o único item que segura o veredito. Fecha com um teste que renderize `AdicionarNoProximo` com grafo vazio e não vazio e veja o texto, ou com `npx vitest run src/administracao/canvas.test.tsx` isolado com N9 aplicado mostrando falha atribuível.
2. A suíte `src/administracao` tem timeouts de 5000 ms sob carga neste computador mesmo sem mutação (`aparencia.test.tsx` 2, `textos.test.tsx` 1). Não afeta K3/K4 (suíte inteira sai 0), mas atrapalha a atribuição de mutantes.
3. Observação, não falha de check: `SairSemSalvar` de `EdicaoDoFluxo.tsx` segue no `crapper` com CC 2 e 0,0% (CRAP 6.0), abaixo do limite.
4. K7 vem da rodada 1, não foi executado de novo; vale porque o diff depois de `51be573` só acrescenta `export` a 8 funções e testes unitários.

Durante a rodada, `.specs/STATE.md` apareceu modificado na árvore principal (3 linhas, +3 −3). Não fui eu; não toquei nele.

## Gate

`npm --prefix web run coverage -- --maxWorkers=4`: exit 0 (68/658). `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0, sem `N/A`, máximo 9.8. `npm --prefix web test -- --maxWorkers=4`: exit 0 (68/658). `npm --prefix web run build`: exit 0. `dryer` (6 fatias + 26 da raiz, 0.8): `No duplicate candidates found.`. E2E: herdado da rodada 1 (233 passed). Suíte .NET: não rodou, `git diff --quiet 8cd91fd HEAD -- One.Api One.Api.Tests` = 0. `mutator`: suspenso por decisão do usuário (AD-025), não rodou.

## Lesson candidates

- Fechar os sobreviventes de uma rodada não basta: em refatoração por extração, toda condição movida (`&&`, `||`, ternário, `disabled`, prop booleana como `vazio`) é candidata a mutante, e cada rodada que muta condições novas acha lacunas herdadas novas. Antes de pedir a rodada seguinte, o construtor deve listar todas as condições das funções extraídas e mostrar o teste que distingue cada uma.
- Antes de injetar mutantes, rode o alvo sem mutação no worktree: se ele já falha por timeout, a falha do mutante só conta quando cai num teste fora dessa lista e com asserção ligada à mutação.

## Adendo do construtor (11/11/2026, depois da rodada 4)

Não é verificação independente: registra o que o construtor fez com o único item aberto da rodada 4, por pedido do dono para fechar sem nova rodada pesada.

- N9 (`AdicionarNoProximo` `vazio={grafo.nos.length === 0}` → `!== 0`): o teste `canvas cheio não oferece adicionar o próximo nó` (`web/src/administracao/canvas.test.tsx`) ganhou duas asserções sobre a prop `vazio` (grafo com um nó → `false`; grafo vazio → `true`). Com o N9 aplicado à mão na árvore principal e desfeito em seguida, `npx vitest run src/administracao/canvas.test.tsx --maxWorkers=2` falha nesse teste em 12 ms por asserção (não por timeout); sem a mutação, o teste passa. `npm --prefix web run build` sai 0.
- A suíte inteira não rodou depois do adendo (o dono pediu para fechar sem outra suíte); a última suíte completa é a da rodada 4 sobre `27e28a4` (68/658, exit 0). O adendo só acrescenta duas linhas `expect(` a um teste existente.
