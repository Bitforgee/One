# Redesign institucional verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 4797744..0ebc29c
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Resumo: rodada 2 limitada pelo diff da correção `40af205..0ebc29c` (`97ae3d8` testes, `0ebc29c` docs) e pelos veredictos não-PASS da rodada 1. `git diff --stat 40af205..HEAD -- web/src ':!*.test.*'` sai vazio: a correção não tocou código de produção do `web/`, então o contêiner de :8080 (rodada 1 o confirmou no build de `40af205`; agora serve `theme-color #224fa7`) continua valendo. Todas as provas rodaram de novo no HEAD `0ebc29c`: Vitest 226/226, Playwright 57/57, C25 `--autoteste` com saída 0 e `chamadas_iguais.py 4797744` também com 0 (213 testes da base, 0 problemas), `crapper` e `dryer` com saída 0. Os 27 checks estão provados. Injetei 5 faltas novas e as 5 morreram. O FAIL vem de duas fontes vinculantes que ainda têm elementos sem check. (1) Três valores de `## Visual`, carregados da rodada 1, que a correção não tratou. (2) A nota que a própria correção acrescentou à `## Screens` linha 0: "na barra de topo continua truncado", que nenhum check afirma.

Nota de execução: a primeira rodada do Vitest correu ao mesmo tempo que o C25, que sobe outras duas suítes Vitest em worktrees, e deu 4 timeouts de 5 s em `assistente.test.tsx` e `conversa.test.tsx` (o `userEvent` digitou "epmr e9ciso"). As duas reexecuções, cada uma sozinha, deram 226/226 e C25 com 0 problemas. Os números deste relatório são dessas execuções isoladas.

## Binding sources

Linhas 2, 3 e 6 *verified at 0ebc29c*, porque a correção tocou a linha 0 de `## Screens`, a linha 9 (com prova nova), o controle Tema e o AD-027. A linha 1 foi *re-judged at 0ebc29c*: era não-PASS na rodada 1. As demais são *carried from 40af205*.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `redesign-institucional/plan.md ## Visual` (`plan.md:84-122`) - re-judged at 0ebc29c | yes - linhas 119-122 relidas | none | Continua sem check e sem isenção enumerada: `checks.md` não tem seção de isenção (rg `isen\|fora do alcance` sem resultado). São três itens. O `Card` com `rounded-lg` (`web/src/ui/card.tsx:9`). "popover e diálogo mantêm a sombra" (`web/src/ui/popover.tsx:32` `shadow-md`, `web/src/ui/dialog.tsx:64` `shadow-lg`). `leading-relaxed` no balão (`web/src/Balao.tsx:40`). O código atende os três, e nenhum teste afirma nenhum deles (rg `rounded-lg\|leading-relaxed\|lineHeight\|borderRadius\|shadow-` em `src/**/*.test.*` e `e2e/`: só `arranjo.spec.ts:130`, que lê `lineHeight` para contar as linhas da instituição). A correção não tratou este ponto |
| `redesign-institucional/plan.md ## Screens` linha 0 (cabeçalho), com a nota de 03/11 - verified at 0ebc29c | yes - `plan.md:132` relida com a nota nova | none. A nota registra a decisão do usuário: a instituição quebra em até 2 linhas na barra lateral. Isso bate com `Autenticado.tsx:126` `lg:whitespace-normal` e com C8 | "na barra de topo continua truncado", frase da própria nota que a correção acrescentou. Nenhum check afirma: C10 só exige largura maior que 0 (`web/e2e/arranjo.spec.ts:186`), e nenhum teste lê `text-overflow`, `white-space` ou `scrollWidth` do nome abaixo de 1024 px. O código trunca (`Autenticado.tsx:126` `truncate`). O resto da linha agora tem prova: borda `:109`, fundo `--sidebar` `:118-119`, marca acima da instituição `:125`, nome inteiro em até 2 linhas `:126`, `:131`, `:132`, links de 36 px um por linha na mesma coluna `:142-146`, ativo em 500 `:171-172`, sem sobreposição `:161`, 1024 x 740 `:97`. Os 9 links cabem de uma vez porque Tema e Sair ficam abaixo do último link (`:154`) dentro de um `<nav>` com a altura da janela (`:107`). O conteúdo centralizado é medido pelo e2e "arranjo Assistente" a 1024 x 740 (`arranjo.spec.ts:294-300`), que roda na prova do C24 |
| `redesign-institucional/plan.md ## Screens` linha 0, controle Tema - verified at 0ebc29c | yes | none | - (ordem em `web/src/acesso/acesso.test.tsx:153`) |
| `redesign-institucional/plan.md ## Screens` linhas 6, 12, 1-15 - carried from 40af205 | yes (rodada 1) | none | - |
| `redesign-institucional/plan.md ## Screens` linha 9 (trechos das fontes) - verified at 0ebc29c | yes | none | - (`web/src/chamados/chamado.test.tsx:141-142`; usado em `chamados/Conversa.tsx:52`) |
| `.specs/STATE.md` AD-027, AD-025 - verified at 0ebc29c | yes - `STATE.md:31`, `:33` | none. O AD-027 agora traz a emenda da door 3a: mesmo `<nav>`, instituição em 2 linhas | - |
| `redesign-institucional/plan.md` Landing, doors 1, 2, 3, 3a, 4 - carried from 40af205 | yes (rodada 1) | none | - (door 3a: `acesso.test.tsx:238` `navs toHaveLength(1)`, linha atualizada) |
| `interface-nova/plan.md ## Screens` - carried from 40af205 | yes (rodada 1) | none | - |

## Checks

Verified at 0ebc29c. As provas rodaram de novo no HEAD, em uma execução do Vitest (`cd web && npx vitest run --reporter=verbose`, exit 0, 226 passed) e uma do Playwright (`cd web && npx playwright test --reporter=list`, exit 0, 57 passed). As citações dos arquivos que a correção tocou (`arranjo.spec.ts`, `acesso.test.tsx`, `conversa.test.tsx`, `chamado.test.tsx`) foram atualizadas.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tokens `:root`/`.dark`/`.black` = `## Visual`, `.black` depois de `.dark` | `✓ interface.test.ts > interface nova > tokens da paleta` | `web/src/test/interface.test.ts:154` - `expect(css.indexOf('.black {')).toBeGreaterThan(css.indexOf('.dark {'))`; `:156-158` (arquivo fora do diff da correção) | PASS |
| C2 | 8 pares x 3 temas >= 4,5:1 | `✓ ... contraste dos tokens` | `web/src/test/interface.test.ts:149` - `expect(contraste(t[frente], t[fundo])).toBeGreaterThanOrEqual(4.5)` | PASS |
| C3 | Tema lista Claro, Escuro, Preto, Sistema nessa ordem; Preto grava `black` e põe `dark black` | `✓ acesso.test.tsx > acesso > Tema grava a escolha em one-tema` | `web/src/acesso/acesso.test.tsx:153` - `getAllByRole('button').map((b) => b.textContent)).toEqual(['Claro', 'Escuro', 'Preto', 'Sistema'])`; `:159` - `expect([...classList].sort(), rotulo).toEqual([...classes].sort())` com `['Preto','black',['dark','black']]` | PASS |
| C4 | sair do Preto tira `black` | `✓ ... sair do Preto tira a classe black` | `web/src/acesso/acesso.test.tsx:173` - `expect(document.documentElement, rotulo).not.toHaveClass('black')` | PASS |
| C5 | `<body>` em rgb(0,0,0) no Preto | `✓ arranjo.spec.ts:740:3 > tema Preto com fundo preto` | `web/e2e/arranjo.spec.ts:753` - `expect(pixel).toEqual([0, 0, 0, 255])` | PASS |
| C6 | Toaster `data-sonner-theme="dark"` no Preto | `✓ ... tema (redesign-institucional) > Toaster escuro no tema Preto` | `web/src/acesso/acesso.test.tsx:381` - `expect(lista).toHaveAttribute('data-sonner-theme', 'dark')` | PASS |
| C7 | `light`/`dark`/`system` antigos sem `black` | `✓ ... valor antigo de one-tema` | `web/src/acesso/acesso.test.tsx:391-392` - `not.toHaveClass('black')`, `classList toHaveLength(1)` | PASS |
| C8 | 1024x740/1280/1536/1920: `<nav>` em x=0, 240 px, altura da janela, borda de 1 px, fundo `--sidebar`, marca acima da instituição, nome inteiro em até 2 linhas, links de 36 px um por linha na mesma coluna, ativo em 500, nada sobreposto, 9 links com ícone e rótulo | `✓ arranjo.spec.ts:98:5 > barra lateral a 1024 px` / `1280` / `1536` / `1920` | `web/e2e/arranjo.spec.ts:97` (`[1024, 740]`); `:105-107` x, largura e `barra.height - altura`; `:109` `borderRightWidth toBe('1px')`; `:118` `fundoBarra toBe(fundoSidebar)`; `:125` marca acima; `:126` `scrollWidth <= clientWidth`; `:131` `linhas <= 2`; `:132` `whiteSpace toBe('normal')`; `:142` `Math.abs(c.height - 36) <= 1`; `:145-146` mesma coluna, um por linha; `:161` `semSobreposicao`; `:171` `fontWeight toBe('500')`, `:172` inativo `'400'`; `:139` rótulo `> 10` | PASS |
| C9 | sem barra de 56 px nem "Menu"; `main` à direita | as mesmas 4 execuções | `web/e2e/arranjo.spec.ts:107` (altura = janela); `:156` `Menu toBeHidden()`; `:157` `main.x >= barra.x + barra.width - 0.5` | PASS |
| C10 | 360/768/1023: barra de topo na largura da janela, 56 px, instituição com largura > 0, nada sobreposto, gaveta como antes | `✓ arranjo.spec.ts:57:3 > cabeçalho a 360 px abre a gaveta Menu`; `✓ :177:5 > abaixo de 1024 px sem barra lateral (360 px)` / `(768 px)` / `(1023 px)` | `web/e2e/arranjo.spec.ts:184-185` largura e `height - 56`; `:186` `width toBeGreaterThan(0)`; `:187` `semSobreposicao`; `:193` gaveta `toEqual([...Links, 'Sair'])`; `:72` | PASS |
| C11 | nenhum "Mais" | `✓ textos.test.tsx > textos > textos cabeçalho` (e as outras 5 do arquivo); e2e `barra lateral a` x4 e `abaixo de 1024 px` x3 | `web/src/acesso/textos.test.tsx:8` + `web/src/test/textos.ts:23` `expect(sobra(texto, literais)).toEqual([])`; `web/e2e/arranjo.spec.ts:158`, `:189` `getByText('Mais', {exact:true}) toHaveCount(0)` | PASS |
| C12 | ativo com `aria-current="page"` e `bg-primary-subtle`, os outros sem | `✓ ... link ativo da barra lateral` | `web/src/acesso/acesso.test.tsx:186-187` - `toBe(ativo ? 'page' : null)`, `classList.contains('bg-primary-subtle')).toBe(ativo)` | PASS |
| C13 | rolada 300 px, topo do `<nav>` em 0 | e2e `barra lateral a` x4 | `web/e2e/arranjo.spec.ts:164-165` - `scrollY toBe(300)`, `Math.abs(caixa(nav).y) <= 1` | PASS |
| C14 | rodapé por papel | `✓ ... rodapé da barra lateral por papel (["ALUNO"])` / `(["ATENDENTE"])` / `(["ADMINISTRADOR"])` | `web/src/acesso/acesso.test.tsx:209` - `toEqual(rodape)` | PASS |
| C15 | `<wbr>` depois de `/ ? & = #` no `Balao` e no trecho das fontes; `textContent` igual | `✓ conversa.test.tsx > ... quebra depois de / ? & = #`; `✓ chamado.test.tsx > chamado > trecho da fonte quebra depois de / ? & = #` | `web/src/assistente/conversa.test.tsx:234` `textContent toBe(Link)`, `:236` `toEqual(['/','/','/','/','?','=','&','=','#'])`; `web/src/chamados/chamado.test.tsx:141` `` citacao.textContent toBe(`“${Trecho}”`) ``, `:142` `toEqual(['/', '/', '/', '?', '=', '&', '=', '#'])` | PASS |
| C16 | 360 px: link quebra só em espaço ou separador | `✓ arranjo.spec.ts:780:3 > link longo quebra só nos separadores` | `web/e2e/arranjo.spec.ts:789` `antes.length > 0`; `:790` `toContain(ch)` | PASS |
| C17 | palavra de 80 letras no balão, `scrollWidth` 360 | `✓ arranjo.spec.ts:794:3 > palavra longa sem separador fica no balão` | `web/e2e/arranjo.spec.ts:802` `c.x + c.width <= 360`; `:805` `scrollWidth toBe(360)` | PASS |
| C18 | aluno `rounded-br-sm`; assistente, atendente e nota interna `rounded-bl-sm` | `✓ ... cantos do balão` | `web/src/assistente/conversa.test.tsx:243-246` - `toHaveClass('rounded-2xl', 'rounded-br-sm')` / `('rounded-2xl', 'rounded-bl-sm')` x3, `:246` com `nota: true` | PASS |
| C19 | `<b>x</b> & <img src=x>` literal | `✓ ... balão sem HTML` | `web/src/assistente/conversa.test.tsx:255` - `querySelector('b, img')).toBeNull()` | PASS |
| C20 | rótulo <= 18 inteiro, senão 17 + "…"; um `<tspan>` a 360 px | `✓ indicadores.test.tsx > indicadores > rótulo do gráfico`; `✓ arranjo.spec.ts:809:3 > rótulo do gráfico numa linha` | `web/src/indicadores/indicadores.test.tsx:171-174`; `web/e2e/arranjo.spec.ts:816` `tspan count toBe(1)`, `:817` `toBe('Financeiro > Bole…')` | PASS |
| C21 | cards de Indicadores com `box-shadow: none` | `✓ arranjo.spec.ts:821:3 > cartões sem sombra` | `web/e2e/arranjo.spec.ts:827-828` - `>= 13`, `new Set(sombras)).toEqual(new Set(['none']))` | PASS |
| C22 | `<h1` com `text-2xl font-semibold tracking-tight` | `✓ ... títulos de página` | `web/src/test/interface.test.ts:170` (fora do diff da correção) | PASS |
| C23 | 15 telas a 360 px com `scrollWidth <= 360` | 15 x `✓ plataforma.spec.ts:62:5 > sem rolagem horizontal a 360 px > {Login...Documentos}` | `web/e2e/plataforma.spec.ts:66-67` (fora do diff da correção) | PASS |
| C24 | suítes inteiras verdes, nada afrouxado fora de `## Test policy` | `npx vitest run` 226 passed; `npx playwright test` 57 passed | diff de testes `40af205..HEAD` lido: só acréscimos (+62 `arranjo.spec.ts`, +4 `acesso.test.tsx`, +1 `conversa.test.tsx`, +21 `chamado.test.tsx`). A única linha trocada é a altura fixa 800 virando `altura` da tupla (`arranjo.spec.ts:107`) | PASS |
| C25 | cada teste de `<base>` faz as mesmas chamadas, exceto o teste reescrito do avisos, que pode faltar | `python .specs/features/redesign-institucional/chamadas_iguais.py --autoteste` exit 0 (`autoteste ok`); `python .specs/features/redesign-institucional/chamadas_iguais.py 4797744` **exit 0**: `213 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD` | `.specs/features/redesign-institucional/chamadas_iguais.py:26` - `_conferir({k: v for k, v in base.items() if k in alvo or k not in REESCRITOS}, alvo)`; autoteste `:32-34` (`== []` para o reescrito ausente, falha para outro teste sumido, compara o reescrito presente) | PASS |
| C26 | sem cor literal fora do `index.css`; textos mudam só por "Mais" e "Preto" | `✓ ... tokens da paleta`; os 6 `✓ textos.test.tsx > textos > ...` | `web/src/test/interface.test.ts:163` `toEqual([])`; `web/src/acesso/textos.test.tsx:8` | PASS |
| C27 | crapper 0 a 9.99; dryer sem candidato; mutator não roda | `npm --prefix web run coverage` exit 0 (226 passed); `crapper --use-existing-coverage -s src --threshold 9.99` **exit 0** (pior `AvisosPush` 9.0); `dryer ... --threshold 0.8 ... \| grep -q "No duplicate candidates found"` exit 0 | saídas do crapper e do dryer (`web/.metrics/`, ignorado pelo git); mutator suspenso pelo AD-025, não rodou | PASS |

## Coverage

Os conjuntos que a correção tocou foram recalculados *at 0ebc29c*. Os outros são *carried from 40af205*.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| ordem dos itens de Tema (4) - verified at 0ebc29c | plan `## Screens` linha 0 | Claro, Escuro, Preto, Sistema em `acesso.test.tsx:153` | - |
| temas (4) - carried from 40af205 | `theme-provider.tsx:3` + `Autenticado.tsx` `Temas` | light/dark/system C4 `:173`, C7 `:391` · black C3 `:159`, C5, C6 `:381` | - |
| blocos de token (3) - carried | `index.css` | C1, C2 | - |
| pares de contraste (8 x 3) - carried | plan `## Visual` | C2 | - |
| larguras com barra lateral (4) - verified at 0ebc29c | checks C8 | 1024x740, 1280, 1536, 1920 em `arranjo.spec.ts:97` | - |
| larguras sem barra lateral (3) - verified at 0ebc29c | checks C10 | 360/768/1023 em `arranjo.spec.ts:177`, com os fatos novos `:186-187` | - |
| rodapé por papel (3) - carried | plan AC 14 | `acesso.test.tsx:209` x3 papéis | - |
| separadores de quebra (5) - carried | `Balao.tsx:18` | `conversa.test.tsx:236`; também `chamado.test.tsx:142` | - |
| onde o `Quebravel` é usado (2) - verified at 0ebc29c | rg `Quebravel` em `web/src`: `Balao.tsx:41`, `chamados/Conversa.tsx:52` | balão C15 `conversa.test.tsx:236` · trecho C15 `chamado.test.tsx:142` | - |
| autores de balão (4) - verified at 0ebc29c | `Balao.tsx:27` (aluno, nota, os outros por `autor`) | aluno `:243` · assistente `:244` · atendente `:245` · nota interna `:246` | - |
| arranjo da barra lateral, `## Screens` linha 0 (fonte vinculante) - verified at 0ebc29c | `plan.md:132`, não o código | 240 px à esquerda `:105-106` · altura `:107` · borda `:109` · fundo `:118` · marca e instituição no topo `:125`, `:143` · instituição em até 2 linhas e sem reticências `:126`, `:131-132` · 36 px um por linha `:142-146` · ativo `bg-primary-subtle` C12 e 500 `:171` · rodapé C14 · 9 links em 1024x740 `:97`, `:154` · conteúdo centralizado `:294-300` (e2e herdado, prova do C24) | barra de topo "continua truncado" (nota da linha 0): nenhum check, `Autenticado.tsx:126` |
| bordas do rótulo do gráfico (3) - carried | `Grafico.tsx:6` | `indicadores.test.tsx:171-173` | - |
| doors (4 + 3a) - carried | plan `## Landing` | door 1 C3, C7 · door 2 C1 · door 3/3a C8 + `acesso.test.tsx:238` · door 4 C15, C19 | - |
| títulos de página - carried | rg `<h1` em `web/src` | C22 `interface.test.ts:170` | - |
| testes reescritos (6) - verified at 0ebc29c | diff de testes `4797744..HEAD` | os 6 de `checks.md:136`; o do avisos é `avisos.test.tsx` "na barra lateral o botão de avisos traz o texto visível" `✓` e está isento em C25 | - |
| valores de `## Visual` sem check (3) - re-judged at 0ebc29c | `plan.md:121-122` | nenhum | `Card` `rounded-lg` (`ui/card.tsx:9`); sombra de popover e diálogo (`ui/popover.tsx:32`, `ui/dialog.tsx:64`); `leading-relaxed` no balão (`Balao.tsx:40`) |

## Test policy rows

Re-judged at 0ebc29c.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| (interface-nova, herdada) decisão no Vitest pelo `App`; arranjo no Playwright; regra de código em `web/src/test/` | `acesso.test.tsx`, `conversa.test.tsx`, `chamado.test.tsx`, `indicadores.test.tsx`, `arranjo.spec.ts`, `interface.test.ts` | decisões C3, C4, C6, C7, C12, C14, C15 (os dois balões pelo `App`), C18-C20 no Vitest · arranjo C5, C8-C11, C13, C16, C17, C21, C23 no Playwright · fonte C1, C22, C26 em `src/test/` | yes |
| Teste que codifica uma decisão substituída pelo AD-027 | `interface.test.ts`, `textos.test.tsx`, `acesso.test.tsx`, `arranjo.spec.ts` (barra de topo), `avisos.test.tsx` | reescrito no mesmo commit, nunca apagado sem substituto nem afrouxado; ao menos o mesmo número de fatos | yes - o gap da rodada 1 está fechado. "Sem sobreposição" e "instituição com largura > 0" voltaram a 768 e 1023 px (`arranjo.spec.ts:186-187`, e a 360 px também) e entraram na barra lateral (`:161`, `:126`). O avisos reescrito está na Evidence (`checks.md:155`). Sobra uma nota sem peso: `checks.md:158` ainda diz "Cost: 5 testes reescritos" enquanto `:136` diz 6 |

## Faults injected

Verified at 0ebc29c. Usei um worktree descartável `scratchpad/wt2` em `HEAD` (`git worktree add`, nunca `git stash`), com `web/node_modules` da árvore real ligado por junction, e voltei com `git checkout -- .` entre uma falta e outra. Para o e2e servi o build do worktree (`npx vite build`, saída em `wt2/api/wwwroot`) com `npx vite preview --port 4174` e rodei com `E2E_URL=http://localhost:4174`. Em cada rodada um teste de controle passou no mesmo servidor ("cartões sem sombra"; na F5 também "barra lateral a 1280 px", o que confirma que a F4 tinha sido desfeita). O porcelain da árvore real foi o mesmo antes e depois: as 3 linhas `??` (`.idea/` e os dois `__pycache__` de `refatoracao-solid`), comparadas com `diff` e com saída `same`. O worktree foi removido e podado, e nenhum `__pycache__` novo foi criado. Cada falta foi feita para derrubar uma superfície de asserção diferente criada pela correção. A ordem do Tema (`acesso.test.tsx:153`, `toEqual` literal) ficou sem falta porque o teto de 5 foi atingido.

| Mutation | Location | Killed |
| --- | --- | --- |
| trecho da fonte sem `Quebravel`: `“<Quebravel texto={t} />”` -> `“{t}”` | `web/src/chamados/Conversa.tsx:52` | yes - C15 `trecho da fonte quebra depois de / ? & = #`: `expected [] to deeply equal [ '/', '/', '/', '?', '=', '&', …(2) ]` |
| canto da nota interna `rounded-bl-sm` -> `rounded-br-sm` | `web/src/Balao.tsx:27` | yes - C18 `cantos do balão`: `Expected the element to have class: rounded-2xl rounded-bl-sm` (`:246`) |
| exceção do C25 sem `k in alvo or` (descarta o reescrito mesmo quando ele existe) | `.specs/features/redesign-institucional/chamadas_iguais.py:26` | yes - C25 `--autoteste` exit 1: `AssertionError: teste reescrito que ainda existe é comparado` (`:34`) |
| barra lateral volta a truncar o nome (tira `lg:whitespace-normal`) | `web/src/Autenticado.tsx:126` | yes - C8 `barra lateral a 1280 px`: `instituição sem corte na largura`, Expected true, Received false (`arranjo.spec.ts:126`); controle verde |
| nome sobrepõe o Tema abaixo de 1024 px (`-me-24 lg:me-0` no nome) | `web/src/Autenticado.tsx:126` | yes - C10 `abaixo de 1024 px sem barra lateral (768 px)`: `768 px: "Centro Universitário de Várzea Grande" x "Tema"`, Expected false, Received true (`arranjo.spec.ts:93`); controles verdes |

## Gate

`cd web && npx vitest run` - 226 passed, 0 failed · `cd web && npx playwright test` - 57 passed, 0 failed · `chamadas_iguais.py --autoteste` exit 0 · `chamadas_iguais.py 4797744` exit 0 (213 testes, 0 problemas) · `crapper` exit 0 · `dryer` sem candidato · mutator não rodou (AD-025)

## Ranked gaps

1. **`## Visual` com elementos sem check e sem isenção enumerada** (carregado da rodada 1; a correção não tratou). São três valores que um seletor alcança e que a fonte vinculante decide: `Card` `rounded-lg` (`web/src/ui/card.tsx:9`), a sombra do popover e do diálogo (`web/src/ui/popover.tsx:32`, `web/src/ui/dialog.tsx:64`) e `leading-relaxed` no balão (`web/src/Balao.tsx:40`). O código atende os três. Falta, para cada um, um check (C21 já pega o `Card` por `box-shadow`, e daria para estender a `border-radius`) ou uma isenção enumerada por tela no `checks.md`.
2. **`## Screens` linha 0, "na barra de topo continua truncado", sem check.** A frase vem da nota que a própria correção acrescentou. C10 só afirma largura > 0 (`web/e2e/arranjo.spec.ts:186`). Se alguém tirar o `truncate` de `web/src/Autenticado.tsx:126` abaixo de 1024 px, nenhuma prova falha. Bastaria uma asserção em `abaixo de 1024 px` com `whiteSpace` `nowrap` e `textOverflow` `ellipsis`.
3. Notas sem peso no veredito: `checks.md:158` "5 testes reescritos" contra os 6 de `:136`. A suíte Vitest dá timeout quando roda ao mesmo tempo que o C25 (4 falhas de 5 s). Sozinha, fica verde.
