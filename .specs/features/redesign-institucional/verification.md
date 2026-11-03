# Redesign institucional verification

**Verdict**: PASS
**Profile**: ui
**Diff range**: 4797744..0fcc2e9
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Resumo: a rodada 3 cobre o diff da correção `0ebc29c..0fcc2e9` e os veredictos não-PASS da rodada 2. O diff toca só `web/e2e/arranjo.spec.ts` (+22, nenhuma linha removida), `checks.md` e o relatório anterior. `git diff --stat 0ebc29c..HEAD -- web/src` sai vazio, então o contêiner `one-system-api-1` em :8080 ainda corresponde ao código. Ele serve `theme-color #224fa7` e a rodada 1 o confirmou no build de `40af205`, sem mudança em `web/src` desde então. Rodei de novo, no HEAD `0fcc2e9`, todas as provas. Cada uma rodou sozinha, sem concorrência:

- Vitest: 226/226.
- Playwright: 58/58. Eram 57; o teste novo é "superfícies de Visual".
- C25 `--autoteste`: saída 0.
- C25 `chamadas_iguais.py 4797744`: saída 0, com 213 testes e 0 problemas.
- `coverage`, `crapper` e `dryer`: saída 0.

Os dois gaps da rodada 2 estão fechados. Cada asserção nova derrubou a sua falta: 5 faltas injetadas, 5 mortas. A nota de contagem também foi corrigida. Os 27 checks estão provados.

## Binding sources

As linhas 1 e 2 foram *re-judged at 0fcc2e9*: eram não-PASS na rodada 2. As demais são *carried from 0ebc29c* ou de `40af205`. A correção não tocou a interface (`web/src` fica fora do diff), então o passo 1 não roda de novo para as outras telas.

| Source | Opened | Contradiction | Covered by | Uncovered |
| --- | --- | --- | --- | --- |
| `redesign-institucional/plan.md ## Visual` "Tipografia e superfície" (`plan.md:119-123`), re-judged at 0fcc2e9 | sim, linhas 119-123 relidas | none. C21 agora diz "canto de 8 px (`rounded-lg`)", "popover e diálogo mantêm `box-shadow` diferente de `none`" e "`line-height` de 26 px (`leading-relaxed`)". Bate com a fonte e com o código (`ui/card.tsx:9`, `ui/popover.tsx:32`, `ui/dialog.tsx:64`, `Balao.tsx:40`) | Os três valores da rodada 2 têm prova e falta morta: `rounded-lg` em `web/e2e/arranjo.spec.ts:850`, sombra do popover em `:832`, sombra do diálogo em `:837`, `leading-relaxed` em `:828`. O resto da frase: Inter em `arranjo.spec.ts:205-206`, título C22, cartão sem sombra C21 `:848`. Dois itens que vêm da `interface-nova` sem mudança ("continua") seguem sem asserção e vão como nota fora do veredito, ver Ranked gaps 1 | - |
| `redesign-institucional/plan.md ## Screens` linha 0, nota de 03/11 "na barra de topo continua truncado", re-judged at 0fcc2e9 | sim, `plan.md:132` | none | C10 agora afirma em `web/e2e/arranjo.spec.ts:188` que `[whiteSpace, textOverflow]` dá `toEqual(['nowrap', 'ellipsis'])` a 360, 768 e 1023 px (laço `:177`). A falta F1 morreu ali | - |
| `redesign-institucional/plan.md ## Screens` linha 0, arranjo da barra lateral e controle Tema, carried from 0ebc29c | sim (rodada 2) | none | As citações foram atualizadas: as linhas 97-172 de `arranjo.spec.ts` não mudaram; conteúdo centralizado em `:297`, `:301` (antes `:294-300`) | - |
| `redesign-institucional/plan.md ## Screens` linhas 6, 9, 12, carried from 0ebc29c | sim (rodada 2) | none | rodada anterior | - |
| `.specs/STATE.md` AD-027, AD-025, carried from 0ebc29c | sim, `STATE.md:31`, `:33` | none | rodada anterior | - |
| `redesign-institucional/plan.md` Landing, doors 1, 2, 3, 3a, 4, carried from 40af205 | sim (rodada 1) | none | rodada anterior | - |
| `interface-nova/plan.md ## Screens`, carried from 40af205 | sim (rodada 1) | none | rodada anterior | - |

## Checks

Verified at 0fcc2e9. Rodei uma execução do Vitest (`cd web && npx vitest run --reporter=verbose`, exit 0, 34 arquivos, 226 passed) e uma do Playwright (`cd web && npx playwright test --reporter=list`, exit 0, 58 passed, nenhum `✘` nem flaky) contra :8080. Cada teste citado aparece na saída como `✓`. Refiz as citações de `arranjo.spec.ts`, o único arquivo de teste que a correção tocou: de `:187` em diante as linhas descem 2, e de `:821` em diante descem 20.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tokens `:root`/`.dark`/`.black` = `## Visual`, `.black` depois de `.dark` | `✓ interface.test.ts > interface nova > tokens da paleta` | `web/src/test/interface.test.ts:154` - `expect(css.indexOf('.black {')).toBeGreaterThan(css.indexOf('.dark {'))`; `:156-158` | PASS |
| C2 | 8 pares x 3 temas >= 4,5:1 | `✓ ... contraste dos tokens` | `web/src/test/interface.test.ts:149` - `expect(contraste(t[frente], t[fundo])).toBeGreaterThanOrEqual(4.5)` | PASS |
| C3 | Tema: Claro, Escuro, Preto, Sistema; Preto grava `black` e põe `dark black` | `✓ acesso.test.tsx > acesso > Tema grava a escolha em one-tema` | `web/src/acesso/acesso.test.tsx:153` - `toEqual(['Claro', 'Escuro', 'Preto', 'Sistema'])`; `:159` - `expect([...classList].sort(), rotulo).toEqual([...classes].sort())` | PASS |
| C4 | sair do Preto tira `black` | `✓ ... sair do Preto tira a classe black` | `web/src/acesso/acesso.test.tsx:173` - `expect(document.documentElement, rotulo).not.toHaveClass('black')` | PASS |
| C5 | `<body>` em rgb(0,0,0) no Preto | `✓ arranjo.spec.ts:742:3 > tema Preto com fundo preto` | `web/e2e/arranjo.spec.ts:755` - `expect(pixel).toEqual([0, 0, 0, 255])` | PASS |
| C6 | Toaster `data-sonner-theme="dark"` no Preto | `✓ ... tema (redesign-institucional) > Toaster escuro no tema Preto` | `web/src/acesso/acesso.test.tsx:381` - `expect(lista).toHaveAttribute('data-sonner-theme', 'dark')` | PASS |
| C7 | `light`/`dark`/`system` antigos sem `black` | `✓ ... valor antigo de one-tema` | `web/src/acesso/acesso.test.tsx:391-392` - `not.toHaveClass('black')`, `classList toHaveLength(1)` | PASS |
| C8 | barra lateral a 1024x740/1280/1536/1920: x=0, 240 px, altura, borda, `--sidebar`, marca acima, nome em até 2 linhas, links de 36 px em coluna, ativo 500, sem sobreposição, 9 links com ícone e rótulo | `✓ arranjo.spec.ts:98:5 > barra lateral a 1024 px` / `1280` / `1536` / `1920` | `web/e2e/arranjo.spec.ts:105-107` x, largura, altura; `:109` `borderRightWidth toBe('1px')`; `:118` `fundoBarra toBe(fundoSidebar)`; `:125` marca acima; `:126` `scrollWidth <= clientWidth`; `:131` `linhas <= 2`; `:132` `whiteSpace toBe('normal')`; `:139` rótulo `> 10`; `:142` `Math.abs(c.height - 36) <= 1`; `:145-146`; `:161` `semSobreposicao`; `:171` `fontWeight toBe('500')` | PASS |
| C9 | sem barra de 56 px nem "Menu"; `main` à direita | as mesmas 4 execuções | `web/e2e/arranjo.spec.ts:107`; `:156` `Menu toBeHidden()`; `:157` `main.x >= barra.x + barra.width - 0.5` | PASS |
| C10 | 360/768/1023: barra de topo na largura da janela, 56 px, nome com largura > 0 **e truncado (`nowrap`, `ellipsis`)**, nada sobreposto, gaveta como antes | `✓ arranjo.spec.ts:57:3 > cabeçalho a 360 px abre a gaveta Menu`; `✓ :177:5 > abaixo de 1024 px sem barra lateral (360 px)` / `(768 px)` / `(1023 px)` | `web/e2e/arranjo.spec.ts:184-185` largura e `height - 56`; `:186` `width toBeGreaterThan(0)`; **`:188` - `expect(... [getComputedStyle(e).whiteSpace, getComputedStyle(e).textOverflow], 'truncado').toEqual(['nowrap', 'ellipsis'])`**; `:189` `semSobreposicao`; `:195` `toEqual([...Links, 'Sair'])`; `:72` | PASS |
| C11 | nenhum "Mais" | `✓ textos.test.tsx > textos > textos cabeçalho` (e as outras 5 do arquivo); e2e `barra lateral a` x4 e `abaixo de 1024 px` x3 | `web/src/acesso/textos.test.tsx:8` + `web/src/test/textos.ts:23` `expect(sobra(texto, literais)).toEqual([])`; `web/e2e/arranjo.spec.ts:158`, `:191` `getByText('Mais', {exact:true}) toHaveCount(0)` | PASS |
| C12 | ativo com `aria-current="page"` e `bg-primary-subtle` | `✓ ... link ativo da barra lateral` | `web/src/acesso/acesso.test.tsx:186-187` - `toBe(ativo ? 'page' : null)`, `classList.contains('bg-primary-subtle')).toBe(ativo)` | PASS |
| C13 | rolada 300 px, topo do `<nav>` em 0 | e2e `barra lateral a` x4 | `web/e2e/arranjo.spec.ts:164-165` - `scrollY toBe(300)`, `Math.abs(caixa(nav).y) <= 1` | PASS |
| C14 | rodapé por papel | `✓ ... rodapé da barra lateral por papel (["ALUNO"])` / `(["ATENDENTE"])` / `(["ADMINISTRADOR"])` | `web/src/acesso/acesso.test.tsx:209` - `toEqual(rodape)` | PASS |
| C15 | `<wbr>` depois de `/ ? & = #` no balão e no trecho das fontes | `✓ conversa.test.tsx > ... quebra depois de / ? & = #`; `✓ chamado.test.tsx > chamado > trecho da fonte quebra depois de / ? & = #` | `web/src/assistente/conversa.test.tsx:234` `textContent toBe(Link)`, `:236` `toEqual(['/','/','/','/','?','=','&','=','#'])`; `web/src/chamados/chamado.test.tsx:141-142` | PASS |
| C16 | 360 px: link quebra só em espaço ou separador | `✓ arranjo.spec.ts:782:3 > link longo quebra só nos separadores` | `web/e2e/arranjo.spec.ts:791` `antes.length > 0`; `:792` `toContain(ch)` | PASS |
| C17 | palavra de 80 letras no balão, `scrollWidth` 360 | `✓ arranjo.spec.ts:796:3 > palavra longa sem separador fica no balão` | `web/e2e/arranjo.spec.ts:804` `c.x + c.width <= 360`; `:807` `scrollWidth toBe(360)` | PASS |
| C18 | cantos do balão por autor | `✓ ... cantos do balão` | `web/src/assistente/conversa.test.tsx:243-246` - `toHaveClass('rounded-2xl', 'rounded-br-sm')` / `('rounded-2xl', 'rounded-bl-sm')` x3 | PASS |
| C19 | `<b>x</b> & <img src=x>` literal | `✓ ... balão sem HTML` | `web/src/assistente/conversa.test.tsx:255` - `querySelector('b, img')).toBeNull()` | PASS |
| C20 | rótulo <= 18 inteiro, senão 17 + "…"; um `<tspan>` a 360 px | `✓ indicadores.test.tsx > indicadores > rótulo do gráfico`; `✓ arranjo.spec.ts:811:3 > rótulo do gráfico numa linha` | `web/src/indicadores/indicadores.test.tsx:171-174`; `web/e2e/arranjo.spec.ts:818` `tspan count toBe(1)`, `:819` `toBe('Financeiro > Bole…')` | PASS |
| C21 | cards de Indicadores com `box-shadow: none` **e canto de 8 px; popover e diálogo com sombra; balão com `line-height` 26 px** | `✓ arranjo.spec.ts:841:3 > cartões sem sombra`; `✓ arranjo.spec.ts:823:3 > superfícies de Visual` | `web/e2e/arranjo.spec.ts:847-848` - `>= 13`, `new Set(sombras)).toEqual(new Set(['none']))`; `:850` - `expect(new Set(cantos), 'rounded-lg = --radius 0.5rem').toEqual(new Set(['8px']))`; `:828` - `lineHeight ... toBe('26px')`; `:832` - `expect(popover boxShadow, 'popover com sombra').not.toBe('none')`; `:837` - `expect(dialogo boxShadow, 'diálogo com sombra').not.toBe('none')` | PASS |
| C22 | `<h1` com `text-2xl font-semibold tracking-tight` | `✓ ... títulos de página` | `web/src/test/interface.test.ts:170` | PASS |
| C23 | 15 telas a 360 px com `scrollWidth <= 360` | 15 x `✓ plataforma.spec.ts:62:5 > sem rolagem horizontal a 360 px > {Login...Documentos}` | `web/e2e/plataforma.spec.ts:66-67` (fora do diff da correção) | PASS |
| C24 | suítes inteiras verdes, nada afrouxado | `npx vitest run` 226 passed; `npx playwright test` 58 passed | diff de testes `0ebc29c..HEAD`: só `arranjo.spec.ts`, +22 linhas e 0 removidas (2 asserções num teste existente, 1 teste novo). Nada afrouxado | PASS |
| C25 | mesmas chamadas à API por teste da base, exceto o reescrito do avisos | `python .specs/features/redesign-institucional/chamadas_iguais.py --autoteste` exit 0 (`autoteste ok`); `python .specs/features/redesign-institucional/chamadas_iguais.py 4797744` exit 0: `213 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD` (rodado depois do Vitest e do Playwright, sem concorrência) | `.specs/features/redesign-institucional/chamadas_iguais.py:26` - `_conferir({k: v for k, v in base.items() if k in alvo or k not in REESCRITOS}, alvo)`; autoteste `:32-34` | PASS |
| C26 | sem cor literal fora do `index.css`; textos só mudam por "Mais" e "Preto" | `✓ ... tokens da paleta`; os 6 `✓ textos.test.tsx > textos > ...` | `web/src/test/interface.test.ts:163` `toEqual([])`; `web/src/acesso/textos.test.tsx:8` | PASS |
| C27 | crapper 0 a 9.99; dryer sem candidato; mutator não roda | `npm --prefix web run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` exit 0 (pior `AvisosPush` 9.0); `dryer ... --threshold 0.8 ...` com a saída passada a `grep -q "No duplicate candidates found"`: exit 0 | saídas do crapper e do dryer (`web/.metrics/`, ignorado pelo git); mutator suspenso pelo AD-025, não rodou | PASS |

## Coverage

Recalculei *at 0fcc2e9* as linhas cuja autoridade a correção tocou. As outras são *carried from 0ebc29c*.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| valores de superfície de `## Visual` (4), verified at 0fcc2e9 | `plan.md:121-123`, não o código | cartão sem sombra `arranjo.spec.ts:848` · cartão `rounded-lg` `:850` · popover e diálogo com sombra `:832`, `:837` · balão `leading-relaxed` `:828` (classe única em `Balao.tsx:40` para os 4 autores). Cada membro derrubou a sua falta | - |
| larguras sem barra lateral (3), verified at 0fcc2e9 | checks C10 | 360/768/1023 no laço `arranjo.spec.ts:177`, com o truncamento em `:188` nas 3 | - |
| arranjo da `## Screens` linha 0 (fonte vinculante), verified at 0fcc2e9 | `plan.md:132`, com a nota de 03/11 | barra lateral (rodada 2: `:105-172`, conteúdo centralizado `:297`, `:301`) · barra de topo truncada `:188` | - |
| testes reescritos (6), verified at 0fcc2e9 | diff de testes `4797744..HEAD` | os 6 de `checks.md:138`; `Cost` em `checks.md:160` agora diz 6 | - |
| ordem do Tema (4), temas (4), blocos de token (3), pares de contraste (8 x 3), larguras com barra lateral (4), rodapé por papel (3), separadores (5), onde o `Quebravel` é usado (2), autores de balão (4), bordas do rótulo (3), doors (4 + 3a), títulos de página, carried from 0ebc29c | idem rodada 2 | idem rodada 2; as citações de `arranjo.spec.ts` foram atualizadas na tabela Checks | - |

## Test policy rows

As duas linhas foram re-judged at 0fcc2e9, porque `arranjo.spec.ts` é um arquivo que elas classificam.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| (interface-nova, herdada) decisão no Vitest pelo `App`; arranjo no Playwright; regra de código em `web/src/test/` | `acesso.test.tsx`, `conversa.test.tsx`, `chamado.test.tsx`, `indicadores.test.tsx`, `arranjo.spec.ts`, `interface.test.ts` | os valores novos são computados (raio, sombra, entrelinha, truncamento) e ficam no Playwright (`arranjo.spec.ts:188`, `:823-838`, `:850`) | yes |
| Teste que codifica uma decisão substituída pelo AD-027 | `interface.test.ts`, `textos.test.tsx`, `acesso.test.tsx`, `arranjo.spec.ts`, `avisos.test.tsx` | reescrito no mesmo commit, nunca afrouxado; ao menos o mesmo número de fatos | yes. A correção só acrescenta. A contagem foi corrigida para "6 testes reescritos" (`checks.md:160`), igual a `:138` |

## Faults injected

Verified at 0fcc2e9. Montei o worktree descartável `scratchpad/wt3` em `HEAD` com `git worktree add --detach`, sem `git stash`, e liguei `web/node_modules` da árvore real por junction. Antes de cada falta voltei com `git checkout -- .`. Cada falta seguiu os mesmos passos:

1. `npx vite build`, com saída em `wt3/api/wwwroot`.
2. `npx vite preview --port 4174 --strictPort`.
3. `E2E_URL=http://localhost:4174 npx playwright test e2e/arranjo.spec.ts -g "superfícies de Visual|cartões sem sombra|abaixo de 1024 px sem barra lateral \(768|barra lateral a 1280"`.

Antes das faltas, a linha de base sem mutação deu 4/4 verdes no mesmo servidor. Em cada falta, os 3 testes que ela não mira ficaram verdes e serviram de controle, o que confirma que a falta anterior tinha sido desfeita. No fim removi a junction e depois o worktree (`git worktree remove --force` e `prune`). Conferi que o `web/node_modules` real seguia inteiro, com `vitest 5.0.5` e `playwright 1.64.1` respondendo. O porcelain da árvore real foi o mesmo antes e depois: as 3 linhas `??`, comparadas com `diff`, saída `same`. Nenhum `__pycache__` novo; só os dois de `refatoracao-solid` que já existiam. Cada falta mira uma superfície de asserção nova da correção; foram 5, o teto.

| Mutation | Location | Killed |
| --- | --- | --- |
| barra de topo sem truncar: `truncate` -> `overflow-hidden` | `web/src/Autenticado.tsx:126` | yes - C10 `abaixo de 1024 px sem barra lateral (768 px)`: `Error: truncado`, esperado `["nowrap", "ellipsis"]`, recebido outro par (`arranjo.spec.ts:188`); controles verdes |
| `Card` `rounded-lg` -> `rounded-xl` | `web/src/ui/card.tsx:9` | yes - C21 `cartões sem sombra`: `rounded-lg = --radius 0.5rem`, esperado `"8px"`, recebido `"12px"` (`:850`) |
| popover sem `shadow-md` | `web/src/ui/popover.tsx:32` | yes - C21 `superfícies de Visual`: `popover com sombra`, `Expected: not "none"` (`:832`) |
| diálogo sem `shadow-lg` | `web/src/ui/dialog.tsx:64` | yes - C21 `superfícies de Visual`: `diálogo com sombra`, `Expected: not "none"` (`:837`) |
| balão `leading-relaxed` -> `leading-normal` | `web/src/Balao.tsx:40` | yes - C21 `superfícies de Visual`: `leading-relaxed`, esperado `"26px"`, recebido `"24px"` (`:828`) |

## Gate

- `cd web && npx vitest run`: 226 passed, 0 failed.
- `cd web && npx playwright test`: 58 passed, 0 failed.
- `chamadas_iguais.py --autoteste`: exit 0.
- `chamadas_iguais.py 4797744`: exit 0 (213 testes, 0 problemas).
- `coverage`: exit 0.
- `crapper`: exit 0 (pior 9.0).
- `dryer`: sem candidato.
- `mutator`: não rodou (AD-025).

## Ranked gaps

Nenhum gap pesa no veredito. Os 3 gaps da rodada 2 estão fechados:

- `## Visual`: C21 em `arranjo.spec.ts:828`, `:832`, `:837`, `:850`.
- Barra de topo truncada: C10 em `:188`.
- Contagem: `checks.md:160`.

Notas para o usuário, fora do veredito:

1. **Dois itens da frase "Tipografia e superfície" (`plan.md:121`, `:123`) não têm asserção.** São o "corpo 16 px a 360 px" e a "Marca provisória 'One' em Inter 600". Não vieram desta feature: são herança da `interface-nova` (`interface-nova/plan.md:128`, `:132`), e a própria frase diz "continua". O código não muda nenhum dos dois. O `font-semibold` da marca segue em `web/src/Autenticado.tsx:125`, onde a feature só acrescentou `lg:px-2`. As rodadas 1 e 2 leram essas mesmas linhas e limitaram o que faltava a três itens. Não conto como gap, mas registro. Se o usuário quiser fechar, bastam uma asserção `fontWeight` `'600'` na marca e uma `fontSize` `'16px'` no corpo a 360 px.
2. **A entrelinha de 26 px é medida só no balão do aluno** (`.is-user`, `arranjo.spec.ts:828`). Isso basta hoje, porque `leading-relaxed` está numa única string de classe, compartilhada pelos 4 autores (`Balao.tsx:40`).
