# Redesign institucional verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 4797744..40af205
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Resumo: 26 de 27 checks provados com evidência localizada no HEAD `40af205`. Vitest 225/225, Playwright 57/57 (contêiner da porta 8080 servindo o build do HEAD: `theme-color #224fa7`, `.black{...}` no CSS e `lg:whitespace-normal` no JS servido). 5 faltas injetadas à mão, 5 mortas. O FAIL vem de quatro coisas. (1) C25: a prova sai com 1. (2) Um elemento que a `## Screens` vinculante decide, "instituição (truncada)" na barra lateral, foi mudado no código (`40af205`) e nenhum check o cobre. (3) Vários elementos de arranjo da barra lateral e da tela 9 ficaram sem check, e o `checks.md` não traz nenhuma isenção enumerada. (4) Uma linha de `## Test policy` foi cumprida só em parte.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `redesign-institucional/plan.md ## Visual` (tokens, tipografia, superfície) | yes - lido inteiro; tokens comparados com `interface.test.ts:51-72` e com o `.black{...}` servido em :8080 | none | `Card rounded-lg`, "popover e diálogo mantêm a sombra" e `leading-relaxed` no balão não têm check. São valores de raio, sombra e tipo que o checks.md poderia ter isentado por tela, mas não isentou: não existe seção de isenção |
| `redesign-institucional/plan.md ## Screens` linha 0 (cabeçalho, a partir de 1024 px) | yes - lida; medido em :8080 a 1024x740 e 1280x800 com spec temporária (apagada) e capturas | none com os checks. O código diverge da fonte: "marca e instituição (truncada) no topo", mas `Autenticado.tsx:126` põe `lg:whitespace-normal` (commit `40af205`, "wrapping institution name"). Medido: `white-space: normal`, altura 56 px, "Centro Universitário de / Várzea Grande" em 2 linhas. O plano não foi emendado | instituição truncada (o código quebra a linha e nenhum check pega); marca e instituição no topo da barra; links "um por linha de 36 px" (C8 não mede altura nem empilhamento; medido 36 px, x=12 para os 9); ativo em `font-medium` (C12 só olha `bg-primary-subtle`); borda à direita e fundo `--sidebar` (medidos 1px e `oklch(0.985 0 0)`, sem check); "Os 9 links visíveis de uma vez em 1024 x 740" (o e2e usa 1024x**800**, `arranjo.spec.ts:88`; medido o último link a 448 px, então passa, mas sem prova); conteúdo "centralizado com a largura máxima de hoje" (só o e2e herdado "arranjo Assistente" mede, `arranjo.spec.ts:243`, fora dos checks) |
| `redesign-institucional/plan.md ## Screens` linha 0, controle Tema | yes | none | ordem "Claro", "Escuro", "Preto", "Sistema" (Observable: "ordering and default"): `textos.test.tsx:8` e `src/test/textos.ts:23` conferem presença e ausência, não ordem. Medido em :8080: `["Claro","Escuro","Preto","Sistema"]`, correto mas sem prova |
| `redesign-institucional/plan.md ## Screens` linhas 6, 12, 1-15 | yes | none | - (cantos C18, quebras C15/C16/C17, rótulo C20, h1 C22, cartões C21, 360 px C23) |
| `redesign-institucional/plan.md ## Screens` linha 9 (Detalhe do chamado) | yes | none | "balões como a tela 6, inclusive os trechos das fontes": `chamados/Conversa.tsx:52` usa `<Quebravel texto={t} />` nos trechos, mas nenhum teste põe separador num trecho e confere `<wbr>` (rg `wbr\|Quebravel` nos testes: só `conversa.test.tsx:235,237`, que montam o `Balao`) |
| `redesign-institucional/plan.md` Landing, doors 1, 2, 3, 3a, 4 | yes | none. Door 3a (um só `<nav>`, decisão do usuário de 03/11) está no código (`Autenticado.tsx:123`, `:162`) e em `acesso.test.tsx:234` (`navs toHaveLength(1)`). Door 4 usa lookbehind em vez de `/([/?&=#])/`; o resultado é o mesmo | - |
| `interface-nova/plan.md ## Screens` (textos e arranjo fora "Mais" e "Preto") | yes - linhas 135-164 lidas | none | - (textos: `textos.test.tsx` das 6 fatias, verde. Arranjo abaixo de 1024 px: C10 e os e2e herdados) |
| `.specs/STATE.md` AD-012, AD-018, AD-025, AD-027 | yes - linhas 18, 24, 31, 33 | none com os checks. Nota: o texto do AD-027 ainda diz "a hand-written left `<aside>`", mas a door 3a (decisão do usuário registrada no plano) o substitui. O STATE.md não foi emendado | - |

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tokens `:root`/`.dark`/`.black` = `## Visual`, `.black` depois de `.dark`, todos em `@theme inline` | `npx vitest run --reporter=verbose` exit 0: `✓ interface.test.ts > interface nova > tokens da paleta` | `web/src/test/interface.test.ts:154` - `expect(css.indexOf('.black {')).toBeGreaterThan(css.indexOf('.dark {'))`; `:156`/`:157`/`:158` - `expect(preto[token]).toBe(valorPreto === '=' ? undefined : valorPreto)`; tabela literal `:52-71` | PASS |
| C2 | 8 pares x 3 temas >= 4,5:1 | mesma execução: `✓ ... contraste dos tokens` | `web/src/test/interface.test.ts:149` - `expect(contraste(t[frente], t[fundo])).toBeGreaterThanOrEqual(4.5)` sobre `temas()` (`:72`, `.dark.black` = `.dark` + `.black`) e os 8 pares `:139-147` | PASS |
| C3 | Preto grava `black`, `<html>` com `dark black` | `✓ acesso.test.tsx > acesso > Tema grava a escolha em one-tema` | `web/src/acesso/acesso.test.tsx:155` - `expect([...classList].sort()).toEqual([...classes].sort())` com `['Preto','black',['dark','black']]`; `localStorage` `:154` | PASS |
| C4 | sair do Preto tira `black` | `✓ ... sair do Preto tira a classe black` | `web/src/acesso/acesso.test.tsx:169` - `expect(document.documentElement).not.toHaveClass('black')` para Claro, Escuro e Sistema | PASS |
| C5 | fundo do `<body>` = rgb(0,0,0) no Preto | `npx playwright test --reporter=list` exit 0: `✓ arranjo.spec.ts:684:3 > tema Preto com fundo preto` | `web/e2e/arranjo.spec.ts:697` - `expect(pixel).toEqual([0, 0, 0, 255])` (cor computada pintada num canvas; o Chrome devolve oklch) | PASS |
| C6 | Toaster `data-sonner-theme="dark"` no Preto | `✓ ... tema (redesign-institucional) > Toaster escuro no tema Preto` | `web/src/acesso/acesso.test.tsx:377` - `expect(lista).toHaveAttribute('data-sonner-theme', 'dark')` | PASS |
| C7 | `light`/`dark`/`system` antigos aplicam o mesmo tema, sem `black` | `✓ ... valor antigo de one-tema` | `web/src/acesso/acesso.test.tsx:387-388` - `not.toHaveClass('black')`, `classList toHaveLength(1)` | PASS |
| C8 | 1024/1280/1536/1920: `<nav>` em x=0, 240 px, altura da janela, 9 links com ícone e rótulo > 10 px | `✓ arranjo.spec.ts:86:5 > barra lateral a 1024 px` / `1280` / `1536` / `1920` | `web/e2e/arranjo.spec.ts:93-95` - `Math.abs(barra.x)<=1`, `Math.abs(barra.width-240)<=1`, `Math.abs(barra.height-800)<=1`; `:99-101` - link e `svg` visíveis, `span` width `toBeGreaterThan(10)` | PASS |
| C9 | sem barra de topo de 56 px nem "Menu"; `main` à direita do `<nav>` | mesmas 4 execuções | `web/e2e/arranjo.spec.ts:95` (altura = 800, não 56); `:111` - `Menu toBeHidden()`; `:112` - `main.x >= barra.x + barra.width - 0.5` | PASS |
| C10 | 360/768/1023: `<nav>` barra de topo, largura da janela, 56 px; gaveta como antes | `✓ arranjo.spec.ts:57:3 > cabeçalho a 360 px abre a gaveta Menu`; `✓ :123:5 > abaixo de 1024 px sem barra lateral (360 px)` / `(768 px)` / `(1023 px)` | `web/e2e/arranjo.spec.ts:130-131` - largura e `height - 56` `<= 1`; `:137` - gaveta `toEqual([...Links, 'Sair'])`; `:63`, `:72` | PASS |
| C11 | nenhum "Mais" em nenhuma largura | `✓ src/acesso/textos.test.tsx > textos > textos cabeçalho` (e as outras 5 do arquivo); e2e `barra lateral a ...` x4 e `abaixo de 1024 px ...` x3 | `web/src/acesso/textos.test.tsx:8` (lista sem "Mais") + `web/src/test/textos.ts:23` - `expect(sobra(texto, literais)).toEqual([])`; `web/e2e/arranjo.spec.ts:113`, `:133` - `getByText('Mais', {exact:true}) toHaveCount(0)` | PASS |
| C12 | link ativo com `aria-current="page"` e `bg-primary-subtle`, os outros sem | `✓ ... link ativo da barra lateral` | `web/src/acesso/acesso.test.tsx:182-183` - `getAttribute('aria-current')).toBe(ativo ? 'page' : null)`, `classList.contains('bg-primary-subtle')).toBe(ativo)` | PASS |
| C13 | rolada 300 px, topo do `<nav>` em 0 | e2e `barra lateral a ...` x4 | `web/e2e/arranjo.spec.ts:117-118` - `scrollY toBe(300)`, `Math.abs(caixa(nav).y) <= 1` | PASS |
| C14 | depois dos links: avisos, Tema, Sair (aluno); Tema, Sair (outros) | `✓ ... rodapé da barra lateral por papel (["ALUNO"])` / `(["ATENDENTE"])` / `(["ADMINISTRADOR"])` | `web/src/acesso/acesso.test.tsx:205` - `toEqual(rodape)` sobre os itens depois do último `A` | PASS |
| C15 | `<wbr>` depois de cada `/ ? & = #`, `textContent` igual | `✓ conversa.test.tsx > ... quebra depois de / ? & = #` | `web/src/assistente/conversa.test.tsx:234` - `textContent toBe(Link)`; `:236` - `toEqual(['/','/','/','/','?','=','&','=','#'])` | PASS |
| C16 | a 360 px o link quebra só depois de espaço ou separador | `✓ arranjo.spec.ts:724:3 > link longo quebra só nos separadores` | `web/e2e/arranjo.spec.ts:733-734` - `antes.length > 0`; `expect([' ','/','?','&','=','#','-']).toContain(ch)` | PASS |
| C17 | palavra de 80 letras fica no balão, `scrollWidth` 360 | `✓ arranjo.spec.ts:738:3 > palavra longa sem separador fica no balão` | `web/e2e/arranjo.spec.ts:746` - `c.x + c.width <= 360`; `:749` - `scrollWidth toBe(360)` | PASS |
| C18 | aluno `rounded-2xl rounded-br-sm`; assistente e atendente `rounded-2xl rounded-bl-sm` | `✓ ... cantos do balão` | `web/src/assistente/conversa.test.tsx:243-245` - `toHaveClass('rounded-2xl', 'rounded-br-sm')` / `('rounded-2xl', 'rounded-bl-sm')` x2 | PASS |
| C19 | `<b>x</b> & <img src=x>` literal, só texto e `<wbr>` | `✓ ... balão sem HTML` | `web/src/assistente/conversa.test.tsx:254-255` - `querySelector('b, img')).toBeNull()`; cada filho `TEXT_NODE \|\| WBR` | PASS |
| C20 | <= 18 inteiro, senão 17 + "…"; a 360 px um `<tspan>` "Financeiro > Bole…" | `✓ indicadores.test.tsx > indicadores > rótulo do gráfico`; `✓ arranjo.spec.ts:753:3 > rótulo do gráfico numa linha` | `web/src/indicadores/indicadores.test.tsx:171-174` (17, 18, 19 e a categoria real); `web/e2e/arranjo.spec.ts:760-761` - `tspan count toBe(1)`, `textContent toBe('Financeiro > Bole…')` | PASS |
| C21 | todo card de Indicadores a 1280 px com `box-shadow: none` | `✓ arranjo.spec.ts:765:3 > cartões sem sombra` | `web/e2e/arranjo.spec.ts:771-772` - `>= 13` cards, `new Set(sombras)).toEqual(new Set(['none']))` | PASS |
| C22 | todo `<h1` fora dos testes com `text-2xl font-semibold tracking-tight` | `✓ ... títulos de página` | `web/src/test/interface.test.ts:170` - `expect(h1).toMatch(/className="(?:[^"]* )?text-2xl font-semibold tracking-tight[ "]/)`; rg acha 8 `<h1` em 7 arquivos, todos conformes | PASS |
| C23 | 15 telas a 360 px com `scrollWidth <= 360` | 15 x `✓ plataforma.spec.ts:62:5 > sem rolagem horizontal a 360 px > {Login...Documentos}` | `web/e2e/plataforma.spec.ts:66-67` - `expect(largura).toBeLessThanOrEqual(360)` sobre as 15 telas `:35-58` | PASS |
| C24 | suítes inteiras verdes, nada afrouxado fora de `## Test policy` | `npx vitest run` 225 passed; `npx playwright test` 57 passed | contagens nas saídas; diff de testes `4797744..HEAD` lido: as únicas remoções de asserção estão nos testes que o Test policy reescreve (ver `## Test policy rows`) | PASS |
| C25 | cada teste de `<base>` faz as mesmas chamadas em base e HEAD | `python .specs/features/interface-nova/chamadas_iguais.py 4797744` **exit 1**: `teste da base não rodou no alvo: ('src/assistente/avisos.test.tsx', 'avisos > no(a) Mais o item de avisos mostra o texto visível')`, `213 teste(s) da base ... 1 problema(s) em HEAD` | O teste da base não existe no HEAD; foi trocado por `web/src/assistente/avisos.test.tsx:126` "na barra lateral o botão de avisos traz o texto visível". Comparação extra, feita com as funções `rodar`/`conferir` do próprio script e mapeando base para substituto: 0 problemas, mas os dois gravam 0 chamadas (`Counter()`, `set()`), então isso não mostra nada sobre chamadas. Pelo texto do check, a prova falha | FAIL |
| C26 | sem cor literal fora do `index.css`; textos mudam só por "Mais" e "Preto" | `✓ ... tokens da paleta`; `npx vitest run` com os 6 `textos.test.tsx` (`✓ textos cabeçalho`, `textos Assistente`, `textos Indicadores`, ...) | `web/src/test/interface.test.ts:163` - `arquivos.filter((a) => CorLiteral.test(texto(a)))).toEqual([])`; `web/src/acesso/textos.test.tsx:8` - lista com "Preto", sem "Mais" | PASS |
| C27 | crapper 0 a 9.99; dryer sem candidato 0.8+; mutator não roda | `npm --prefix web run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` **exit 0** (pior `AvisosPush` 9.0; `Quebravel` 2.0, `rotulo` 2.0, `ThemeProvider` 5.0); `dryer ... --threshold 0.8 ...` exit 0, `grep -q "No duplicate candidates found"` exit 0 | saídas do crapper e do dryer (`web/.metrics/crap.edn`, `dry.edn`, ignorados pelo git); mutator suspenso pelo AD-025, não rodou | PASS |

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| temas (4) | `theme-provider.tsx:3` type + `Autenticado.tsx:29-34` `Temas` | light C4 `acesso.test.tsx:169`, C7 `:387` · dark C4, C7 · black C3 `:155`, C5, C6 `:377` · system C4, C7 (vira light pelo matchMedia do setup) | - |
| ordem dos itens de Tema (4, Observable "ordering") | plan `## Screens` linha 0 e `## Observable` | nenhuma prova afirma a ordem; `textos.test.tsx` confere só presença | ordem Claro, Escuro, Preto, Sistema |
| blocos de token (3) | `index.css` `:root`, `.dark` (`:34`), `.black` (`:63`) | C1 `interface.test.ts:156-158` · C2 `:149` | - |
| pares de contraste (8 x 3) | plan `## Visual` | C2, `interface.test.ts:139-149` sobre `temas()` | - |
| larguras com barra lateral (4) | checks C8 | 1024/1280/1536/1920, `arranjo.spec.ts:85` | - |
| larguras sem barra lateral (3) | checks C10 | 360/768/1023, `arranjo.spec.ts:122` | - |
| rodapé por papel (3 papéis) | plan AC 14 | ALUNO, ATENDENTE, ADMINISTRADOR, `acesso.test.tsx:192-205` | - |
| separadores de quebra (5) | `Balao.tsx:18` regex | `/ ? & = #`, `conversa.test.tsx:236` | - |
| variantes de balão (4) | `Balao.tsx:27`: aluno, nota interna, assistente, atendente (por `autor`) | aluno, assistente e atendente em `conversa.test.tsx:243-245` | nota interna (`rounded-bl-sm` com `bg-warning-subtle`): é "every other bubble" no AC 18, mas o set do checks.md lista só 3 autores |
| onde o `Quebravel` é usado (2) | rg `Quebravel` em `web/src` | `Balao` (C15, C19) | trechos das fontes em `chamados/Conversa.tsx:52` (`## Screens` linha 9) |
| bordas do rótulo do gráfico (3) | `Grafico.tsx:6` | 17, 18, 19 em `indicadores.test.tsx:171-173` | - |
| doors (4 + 3a) | plan `## Landing` | door 1 C3, C7 · door 2 C1 · door 3/3a C8 + `acesso.test.tsx:234` (um só `navigation`) · door 4 C15, C19 | - |
| títulos de página (8 `<h1` no código) | rg `<h1` em `web/src` sem testes | os 8 por C22 `interface.test.ts:170` | - |
| testes reescritos pela decisão nova (6) | diff de testes `4797744..HEAD` | os 5 do checks.md + `avisos > no(a) Mais ...`, substituído em `avisos.test.tsx:126` (este 6º não está no set do checks.md) | - |
| elementos da barra lateral em `## Screens` linha 0 | plan (fonte vinculante, não o código) | ver `## Binding sources` | instituição truncada; marca e instituição no topo; links de 36 px um por linha; `font-medium` no ativo; borda à direita; fundo `--sidebar`; 9 links em 1024x740 |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| (interface-nova, herdada) decisão de tela no Vitest pelo `App`; arranjo no Playwright; regra de código em `web/src/test/` | `acesso.test.tsx`, `conversa.test.tsx`, `indicadores.test.tsx`, `arranjo.spec.ts`, `interface.test.ts` | decisões: C3, C4, C6, C7, C12, C14, C15, C18, C19, C20 no Vitest · arranjo: C5, C8-C11, C13, C16, C17, C21, C23 no Playwright · fonte: C1, C22, C26 em `src/test/` | yes |
| Teste que codifica uma decisão substituída pelo AD-027 | `interface.test.ts` (Tokens, contraste), `textos.test.tsx` (cabeçalho), `acesso.test.tsx` (tema), `arranjo.spec.ts` (6 testes da barra de topo), `avisos.test.tsx` (item de avisos no "Mais") | reescrito no mesmo commit, nunca apagado sem substituto nem afrouxado; pelo menos o mesmo número de fatos | partly - gap: Tokens (+coluna, +5 tokens), contraste (+tema, +4 pares), tema (+Preto), cabeçalho ("Mais" -> "Preto") e o avisos (+1 fato, `avisos.test.tsx:132`) cumprem. Mas os 6 testes de barra da base afirmavam, de 768 a 1920 px, "nenhum filho direto da barra se sobrepõe" e "nome da instituição com largura > 0" (removido de `arranjo.spec.ts` na base, linhas 109-162). Os substitutos `arranjo.spec.ts:86` e `:123` não afirmam nenhum desses dois fatos a 768 e 1023 px, nem a instituição na barra lateral. O avisos é um 6º teste reescrito que a Evidence do Test policy e o set "testes reescritos (5)" não listam |

## Faults injected

Worktree descartável `scratchpad/wt` em `HEAD`, com `web/node_modules` ligado por junction. Antes de cada falta, `git checkout` no worktree. Porcelain da árvore real antes = depois (3 linhas `??` de `.idea/` e `__pycache__` de `refatoracao-solid`). Um `__pycache__` que o meu import do `chamadas_iguais.py` criou em `.specs/features/interface-nova/` foi apagado antes da comparação final, que deu `same`. Superfícies sem falta: tokens de `index.css` (C1, C2), Sonner (C6), ordem do rodapé (C14), e2e C5/C16/C17/C20-e2e/C21/C23. O teto é 5, e cada falta usada derruba uma prova diferente. Para o e2e usei o build do worktree servido com `vite preview` e `E2E_URL`, sem rebuild do contêiner. O teste de controle passou no mesmo servidor.

| Mutation | Location | Killed |
| --- | --- | --- |
| tira `#` do lookbehind: `/(?<=[/?&=#])/` -> `/(?<=[/?&=])/` | `web/src/Balao.tsx:18` | yes - C15 `quebra depois de / ? & = #`: `expected [... …(2)] to deeply equal [... …(3)]` |
| limite do rótulo deslocado: `length > 18` -> `length > 17` | `web/src/indicadores/Grafico.tsx:6` | yes - C20 `rótulo do gráfico`: `expected 'aaaaaaaaaaaaaaaaa…' to be 'aaaaaaaaaaaaaaaaaa'` |
| link ativo sem `bg-primary-subtle` | `web/src/Autenticado.tsx:77` | yes - C12 `link ativo da barra lateral`: `Fila: expected false to be true` |
| Preto põe só `black`, sem `dark` | `web/src/ui/theme-provider.tsx:49` | yes - C3 `Tema grava a escolha em one-tema`: `Preto: expected ['black'] to deeply equal ['black','dark']` |
| barra lateral `lg:fixed` -> `lg:absolute` (rola com a página) | `web/src/Autenticado.tsx:123` | yes - C13 `barra lateral a 1280 px`: `C13 barra fixa no topo ... Received: 300`; controle `abaixo de 1024 px sem barra lateral (360 px)` verde no mesmo servidor |

## Gate

`cd web && npx vitest run` - 225 passed, 0 failed · `cd web && npx playwright test` - 57 passed, 0 failed · `chamadas_iguais.py 4797744` - exit 1 (1 problema) · `crapper` exit 0 · `dryer` sem candidato · `python validate_verification.py redesign-institucional` - exit 1 (verdict FAIL)

## Ranked gaps

1. **C25 FAIL**: a prova sai com 1 porque o teste da base `avisos > no(a) Mais o item de avisos mostra o texto visível` não existe no HEAD. O substituto `web/src/assistente/avisos.test.tsx:126` está dentro do Test policy, mas o C25 é literal ("cada teste de `<base>`"). Falta de precisão no check: o C25 não previu testes renomeados pelas reescritas do próprio Test policy. Mesmo mapeando base para substituto, os dois gravam 0 chamadas.
2. **Composição contra fonte vinculante, sem check**: em `## Screens` linha 0 a barra lateral tem "instituição (truncada)", e `web/src/Autenticado.tsx:126` (`lg:whitespace-normal`, commit `40af205`) a quebra em 2 linhas sem emenda no plano. Ou o plano registra a decisão, ou o código volta a truncar. Nos dois casos falta um check.
3. **Arranjo da barra lateral sem check, sem isenção enumerada**: links de 36 px um por linha, marca e instituição no topo, `font-medium` no ativo, borda à direita, fundo `--sidebar`, os 9 links em 1024x**740** (o e2e mede em 800, `web/e2e/arranjo.spec.ts:88`). Medi tudo em :8080 e o código atende, mas nenhuma prova afirma.
4. **Tela 9, trechos das fontes**: `web/src/chamados/Conversa.tsx:52` põe `<wbr>` nos trechos e nenhum teste exercita isso.
5. **Ordem do controle Tema** (Claro, Escuro, Preto, Sistema) sem prova. Hoje está correta em :8080.
6. **Cobertura, balão da nota interna**: `web/src/Balao.tsx:27`, o canto `rounded-bl-sm` da nota não é afirmado (AC 18 "every other bubble").
7. **Test policy, linha AD-027, cumprida em parte**: o fato "sem sobreposição na barra / instituição com largura > 0" a 768 e 1023 px saiu com os testes da barra antiga e não voltou em `web/e2e/arranjo.spec.ts:123`. O avisos reescrito não está listado no Test policy.
8. Nota sem peso no veredito: `.specs/STATE.md:33` (AD-027) ainda diz `<aside>`; a door 3a do plano o substitui.
