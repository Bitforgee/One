# Barra lateral: grupos, nome e recolher verification

**Verdict**: PASS
**Profile**: ui
**Diff range**: ff07f05..8dc1277
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Ponto de partida: rodada 1 em `d6f0b9f` (veredito anterior registrado no histórico do git deste arquivo). Diff da correção `d6f0b9f..8dc1277`: só `web/e2e/arranjo.spec.ts` (+27 -2), `web/e2e/push.spec.ts` (+16, um teste novo), `checks.md` (claims de C4, C10, C12, C13 e C16 emendados, uma prova nova no C12, a seção "Correção após a verificação rodada 1") e o relatório da rodada 1. `git diff --stat d6f0b9f..HEAD -- web/src` vazio: o código não mudou, e o contêiner :8080 serve o mesmo bundle da rodada 1 (`assets/index-8Zg6GwNy.js`), por isso não foi reconstruído.

Escopo desta rodada: todas as provas de novo no HEAD; as 4 lacunas ranqueadas da rodada 1 e as 3 notas de precisão julgadas de novo contra os claims emendados; citações renovadas nos 2 arquivos e2e tocados; linhas de Coverage tocadas recalculadas; faltas injetadas nas superfícies de asserção novas. O resto vem da rodada 1 e diz isso.

## Binding sources

Carried from d6f0b9f (abertura e comparação): a correção não tocou a interface (`web/src` intacto), então o passo 1 não roda de novo. As células `Uncovered` foram julgadas de novo no HEAD 8dc1277 contra os claims emendados e as asserções novas.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `barra-lateral-grupos/plan.md` `## Screens` linha "barra aberta" | yes - rodada 1 (lido inteiro, captura a 1280 px); relido nesta rodada | none | - |
| `barra-lateral-grupos/plan.md` `## Screens` linha "barra recolhida" | yes - rodada 1 (lido inteiro, captura recolhida com hover); relido nesta rodada | none | - |
| `barra-lateral-grupos/plan.md` `## Screens` linha "gaveta" | yes - rodada 1; relido nesta rodada | none | - |
| `barra-lateral-grupos/plan.md` `## Screens` linha "barra de topo" | yes - rodada 1; relido nesta rodada | none | - |
| respostas do usuário de 03/11 via AD-028 em `.specs/STATE.md` | yes - rodada 1 | none | - |
| `redesign-institucional/plan.md` door 3a e `## Screens` linha 0 | yes - rodada 1 | none | - |

O que fechou cada `Uncovered` da rodada 1 (verified at 8dc1277):

- **barra aberta, marca à esquerda e botão à direita**: C10 `web/e2e/arranjo.spec.ts:937` - `expect(botaoAberto.x).toBeGreaterThanOrEqual(marcaAberta.x + marcaAberta.width)`; `:938` - `botaoAberto.x + botaoAberto.width ... toBeGreaterThan(120)`.
- **barra recolhida, marca e botão de expandir empilhados**: C12 `arranjo.spec.ts:960` - `marca.y + marca.height ... toBeLessThanOrEqual((await caixa(expandir)).y + 1)`.
- **linha fina entre grupos**: C12 `arranjo.spec.ts:962` - `borderTopWidth` dos 3 grupos `toEqual(['0px', '1px', '1px'])`.
- **Tema e Sair só com ícone, um por linha**: C12 `arranjo.spec.ts:966` - rótulo de Sair `toBeLessThanOrEqual(1)`; `:967` - Sair `y` `toBeGreaterThanOrEqual(tema.y + tema.height - 1)`; Tema nunca tem texto (`aria-label` só, `Autenticado.tsx:55`) e fica nos 64 px por `:972`.
- **nome em texto escondido**: C12 `arranjo.spec.ts:957` - `nav.getByText('Ana', { exact: true }) ... toBeHidden()`.
- **dica ao passar o mouse**: C13 `arranjo.spec.ts:982-983` - `hover()` em Usuários e `getByRole('tooltip') ... toHaveText('Usuários')`.

Nota de precisão, fora do escopo desta rodada e fora do veredito: "ícones centralizados" (linha "barra recolhida") não tem asserção de centro horizontal; o link fica nos 64 px (`:953`, `:972`) e o código tem `recolhida:justify-center` (`Autenticado.tsx:81`). É alinhamento, não composição, e a rodada 1 não o enumerou.

## Checks

Verified at 8dc1277. Provas: uma invocação de Vitest (`cd web && npx vitest run --reporter=verbose`, 238/238, exit 0, cada teste nomeado aparece com ✓) e uma de Playwright contra o :8080 (`cd web && npx playwright test --reporter=list`, 65/65, exit 0). Citações de `web/src/acesso/*.test.tsx` carried from d6f0b9f (arquivos sem mudança no intervalo); as de `web/e2e/arranjo.spec.ts` e `web/e2e/push.spec.ts` renovadas no HEAD.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 3 grupos na ordem, links certos, na barra e na gaveta | Vitest "grupos por assunto na barra e na gaveta" ✓ | `web/src/acesso/acesso.test.tsx:418` - `expect(grupos(nav)).toEqual(Esperado)`; `:422` - `expect(grupos(gaveta)).toEqual(Esperado)` | PASS |
| C2 | grupo sem link some, por papel | Vitest "grupos por papel" (ALUNO, ATENDENTE, ADMINISTRADOR) ✓ | `web/src/acesso/acesso.test.tsx:434` - `expect(grupos(await screen.findByRole('navigation'))).toEqual(esperado)` | PASS |
| C3 | `role="group"` nomeado pelo título | Vitest "grupos por assunto na barra e na gaveta" ✓ | `web/src/acesso/acesso.test.tsx:419` e `:423` - `getByRole('group', { name: nome })` | PASS |
| C4 | títulos 12 px acima do 1º link; 24 px entre grupos, margem 24 px depois do primeiro e 0 no primeiro; gaveta 32 px, 12 px, antes dos links | Playwright "grupos na barra lateral" ✓ "grupos na gaveta" ✓ | `web/e2e/arranjo.spec.ts:878` - `fontSize ... toBe('12px')`; `:881` - `t.y - fundoAnterior ... toBeGreaterThanOrEqual(23)`; `:882` - `marginTop ... toBe(fundoAnterior >= 0 ? '24px' : '0px')`; `:900` - `Math.abs(titulo.height - 32) ... toBeLessThanOrEqual(1)`; `:901` - gaveta `fontSize ... toBe('12px')`; `:902` antes dos links | PASS |
| C5 | nome no rodapé acima de Tema e Sair, nowrap e ellipsis, dentro da barra | Playwright "nome do usuário na barra" ✓ | `web/e2e/arranjo.spec.ts:919` - `toEqual(['nowrap', 'ellipsis'])`; `:921` - `n.x + n.width ... toBeLessThanOrEqual(241)`; `:922` acima de Tema e Sair | PASS |
| C6 | nome abaixo de "Menu" na gaveta | Vitest "nome do usuário na gaveta" ✓ | `web/src/acesso/acesso.test.tsx:445` - `titulo.compareDocumentPosition(nome) & Node.DOCUMENT_POSITION_FOLLOWING` | PASS |
| C7 | iniciais AS, A, CR | Vitest "iniciais do usuário" ✓ | `web/src/acesso/acesso.test.tsx:451-453` - `toBe('AS')`, `toBe('A')`, `toBe('CR')` | PASS |
| C8 | círculo 32x32, nome acessível e dica | Playwright "barra recolhida a 1024 px" ✓ "a 1280 px" ✓ | `web/e2e/arranjo.spec.ts:974` - `getByRole('img', { name: 'Ana' })`; `:976` - `toEqual([32, 32])`; `:978` - tooltip `toHaveText('Ana')` | PASS |
| C9 | sem nome na barra de topo a 360, 768, 1023 | Playwright "abaixo de 1024 px sem barra lateral" x3 ✓ | `web/e2e/arranjo.spec.ts:194` - `nav.getByText('Ana', { exact: true }) ... toBeHidden()` | PASS |
| C10 | botão "Recolher barra lateral" `aria-expanded=true` na linha da marca, à direita dela | Playwright "barra recolhida" x2 ✓ | `web/e2e/arranjo.spec.ts:933` - `toHaveAttribute('aria-expanded', 'true')`; `:936` - topos `toBeLessThanOrEqual(4)`; `:937` - `botaoAberto.x ... toBeGreaterThanOrEqual(marcaAberta.x + marcaAberta.width)` | PASS |
| C11 | 64 px, main a x 63 ou mais, "Expandir" `aria-expanded=false`, volta a 240 | Playwright "barra recolhida" x2 ✓; Vitest "recolher e expandir gravam one-barra" ✓ | `web/e2e/arranjo.spec.ts:941` - `toBe(64)`; `:942` - `toBeGreaterThanOrEqual(63)`; `:944` - `aria-expanded 'false'`; `:989` - `toBe(240)`; `web/src/acesso/acesso.test.tsx:465` | PASS |
| C12 | recolhida: 9 links com nome e só ícone, 36 px; títulos, instituição, nome em texto e texto dos avisos escondidos; marca acima do expandir; linha de 1 px no 2º e 3º grupo; Sair só ícone abaixo de Tema; nada visível passa dos 64 px | Playwright "barra recolhida" x2 ✓; "barra recolhida esconde o texto dos avisos" ✓ | `web/e2e/arranjo.spec.ts:950` rótulo `toBeLessThanOrEqual(1)`; `:952` 36 px; `:955` títulos; `:956` instituição; `:957` nome `toBeHidden()`; `:960` marca acima; `:962` `toEqual(['0px', '1px', '1px'])`; `:966` Sair `toBeLessThanOrEqual(1)`; `:967` Sair abaixo de Tema; `:972` `Math.max(...direitas) ... toBeLessThanOrEqual(64)`; `web/e2e/push.spec.ts:85` - texto dos avisos `toBeLessThanOrEqual(1)`; `:87` - avisos `toBeLessThanOrEqual(65)` | PASS |
| C13 | foco ou hover num link recolhido mostra `role=tooltip` com o rótulo | Playwright "barra recolhida" x2 ✓ | `web/e2e/arranjo.spec.ts:981` - após `focus()`, `toHaveText('Artigos')`; `:983` - após `hover()`, `toHaveText('Usuários')` | PASS |
| C14 | grava recolhida e aberta; recarregar começa com 64 px | Playwright "barra recolhida" x2 ✓ | `web/e2e/arranjo.spec.ts:945` - `toBe('recolhida')`; `:986` recarregou `toBe(64)`; `:990` - `toBe('aberta')` | PASS |
| C15 | ausente ou `x` começa aberta | Vitest "one-barra desconhecido começa aberta" (null) ✓ (x) ✓ | `web/src/acesso/acesso.test.tsx:477` - `data-recolhida ... toBe('false')`; `:478` - `aria-expanded 'true'` | PASS |
| C16 | 768 px com recolhida: 56 px e nenhum botão de recolher, nem na barra nem na gaveta | Playwright "abaixo de 1024 px sem barra lateral" x3 ✓ | `web/e2e/arranjo.spec.ts:187` - `Math.abs(barra.height - 56) ... toBeLessThanOrEqual(1)`; `:195` - os 2 botões `toBeHidden()`; `:200` - `gaveta.getByRole('button', { name: /barra lateral/ }) ... toHaveCount(0)`; init script `:180` | PASS |
| C17 | reduced motion: 0s; sem ele, maior que 0s | Playwright "movimento reduzido na barra lateral" ✓ | `web/e2e/arranjo.spec.ts:1001` - `not.toBe('0s')`; `:1003` - `toBe('0s')` | PASS |
| C18 | suítes inteiras verdes; só asserções do Test policy mudadas; mesmas chamadas à API | `npx vitest run` 238/238; `npx playwright test` 65/65 contra o :8080; `python .specs/features/interface-nova/chamadas_iguais.py ff07f05` exit 0, rodado sozinho depois das duas suítes | saída: "229 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD"; a correção só acrescenta asserções e o teste novo `web/e2e/push.spec.ts:76`, nenhum título renomeado (diff `d6f0b9f..HEAD`) | PASS |
| C19 | textos só os novos; crapper 0 a 9.99; dryer sem candidato; mutator suspenso | Vitest "textos cabeçalho" ✓; `npm --prefix web run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` exit 0 (pior: `AvisosPush` 9.0, `Autenticado` 9.0); `dryer ... grep -q "No duplicate candidates found"` exit 0 | `web/src/acesso/textos.test.tsx:8` - `Cabecalho` com os 3 títulos novos; `:28` e `:36` - `tela.conferir(nav, [Instituicao, Nome])`. `mutator` não rodou (AD-025) | PASS |

## Coverage

Linhas tocadas pela correção recalculadas at 8dc1277, do `## Screens` e dos AC (autoridade do desenho), não do código; as demais carried from d6f0b9f (a correção não tocou `web/src`, então nenhum membro novo apareceu do lado do código).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| grupos (3) | AC 1, `## Screens` - carried from d6f0b9f | Atendimento, Conhecimento, Administração -> C1 `acesso.test.tsx:418`, C3 `:419` | - |
| papéis (3) | `Menu` `Autenticado.tsx:17-27` - carried from d6f0b9f | ALUNO, ATENDENTE, ADMINISTRADOR -> C2 `acesso.test.tsx:434` | - |
| lugares dos grupos (2) | `## Screens` - carried from d6f0b9f | barra C1, C4 `arranjo.spec.ts:878` · gaveta C1, C4 `arranjo.spec.ts:900` | - |
| lugares do nome (4) | `## Screens`, AC 4 a 7 - carried from d6f0b9f | rodapé aberto C5 · gaveta C6 · iniciais recolhida C8 · barra de topo C9 | - |
| formas do nome para iniciais (3) | AC 6 - carried from d6f0b9f | várias palavras, uma palavra, espaços sobrando -> C7 | - |
| valores de `one-barra` (4) | door 1 - carried from d6f0b9f | recolhida C14 · aberta C14 · ausente C15 · `x` C15 | - |
| larguras (2 faixas) | AC 8 a 14 - carried from d6f0b9f | a partir de 1024 C10-C14 (1024 e 1280) · abaixo de 1024 C9, C16 (360, 768, 1023) | - |
| doors do plano (2) | `## Landing` - carried from d6f0b9f | door 1 C14, C15 · door 2 C11, C12 | - |
| gatilhos da dica do link (2) | AC 11, `## Screens` - recalculado | foco C13 `arranjo.spec.ts:981` · hover C13 `arranjo.spec.ts:983` | - |
| itens do rodapé recolhido (4) | `## Screens` linha "barra recolhida" - recalculado | círculo C8 `arranjo.spec.ts:976` · Tema só ícone C12 `:967`, `:972` · Sair só ícone C12 `:966` · texto dos avisos escondido C12 `push.spec.ts:85` | - |
| itens do topo recolhido (2) | `## Screens` ("Marca e botão de expandir empilhados") - recalculado | botão Expandir C11 `arranjo.spec.ts:944` · marca acima do botão C12 `:960` | - |
| separação entre grupos recolhidos (3) | `## Screens` ("uma linha fina entre grupos") - recalculado | 1º sem linha, 2º e 3º com 1 px -> C12 `arranjo.spec.ts:962` | - |
| textos escondidos recolhida (5) | `## Screens` ("instituição, títulos, rótulos, avisos e nome em sr-only") - recalculado | instituição C12 `:956` · títulos C12 `:955` · rótulos C12 `:950` · avisos C12 `push.spec.ts:85` · nome C12 `arranjo.spec.ts:957` | - |
| topo da barra aberta (2) | `## Screens` ("marca à esquerda e o botão à direita") - recalculado | mesma linha C10 `arranjo.spec.ts:936` · lado C10 `:937` | - |
| testes reescritos (3) | `## Impact`, `## Test policy` - carried from d6f0b9f | `Links` e gaveta do e2e C1, C4 · "textos cabeçalho" C19 · rodapé (redesign C14) C5 | - |

## Test policy rows

Verified at 8dc1277: a linha que classifica `web/e2e/arranjo.spec.ts` foi julgada de novo porque o arquivo mudou.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Teste que afirma a lista de links na ordem antiga ou o cabeçalho sem grupos | `web/e2e/arranjo.spec.ts` (`Links`), `web/src/acesso/textos.test.tsx` (`Cabecalho`), `web/src/acesso/acesso.test.tsx` ("cabeçalho num único nav por papel") | reescrito no mesmo commit (`f9aa888`) sem trocar o nome | yes - a correção só acrescenta asserções; "abaixo de 1024 px sem barra lateral" segue com `[...Links, 'Sair']` na gaveta (`arranjo.spec.ts:199`) e passa contra o :8080 |
| linhas herdadas da `interface-nova` e da `redesign-institucional` | os mesmos arquivos | suítes inteiras e chamadas iguais | yes - Vitest 238/238, Playwright 65/65, `chamadas_iguais.py` 0 problema |

## Faults injected

Verified at 8dc1277, só nas superfícies de asserção criadas pela correção (as 5 faltas da rodada 1 em `Autenticado.tsx:21`, `:33`, `:151`, `:92` e `:37` ficam carried from d6f0b9f; o código delas não mudou). Worktree descartável (`git worktree add --detach <scratch>/wt HEAD`), `web/node_modules` por junção à árvore principal, removida antes de `git worktree remove`. Cada mutante num `vite build --outDir <scratch>/dist-mN` próprio, servido por `vite preview --outDir ... --port 4181-4185 --strictPort`, mais um build sem mutação na 4186 como controle; Playwright com `E2E_URL`. Em cada servidor mutante um teste de controle passou no mesmo run ("grupos na barra lateral" para arranjo, "na gaveta o item de avisos mostra o texto visível" para push). O build de controle passou as 9 provas de C4, C8-C14, C16 e C12-avisos. `git status --porcelain` da árvore real igual antes e depois (`.idea/` e os 2 `__pycache__` da `refatoracao-solid`, já presentes); nenhum `__pycache__` novo. `mutator` não rodou (AD-025).

| Mutation | Location | Killed |
| --- | --- | --- |
| sem `recolhida:border-t` nos grupos (nenhuma linha entre grupos recolhidos) | `web/src/Autenticado.tsx:107` | yes - "barra recolhida a 1280 px" falhou em `arranjo.spec.ts:962` ("C12 linha entre grupos"); controle passou |
| rótulo de Sair sem `recolhida:sr-only` | `web/src/Autenticado.tsx:253` | yes - falhou em `arranjo.spec.ts:966` ("C12 Sair só com ícone"); controle passou |
| topo sem `recolhida:flex-col` (marca e botão lado a lado) | `web/src/Autenticado.tsx:236` | yes - falhou em `arranjo.spec.ts:960` ("C12 marca acima do botão de expandir"); controle passou |
| texto dos avisos sem `recolhida:sr-only` | `web/src/AvisosPush.tsx:42` | yes - "barra recolhida esconde o texto dos avisos" falhou em `push.spec.ts:85` ("texto escondido"); controle passou |
| `onPointerMove` com `preventDefault` no link (o hover deixa de abrir a dica; o foco ainda abre) | `web/src/Autenticado.tsx:90` | yes - `:981` (foco) passou e `arranjo.spec.ts:983` ("C13 dica ao passar o mouse") falhou; controle passou |

Não injetado (limite de 5): o lado do botão na barra aberta (`arranjo.spec.ts:937`), a margem 0 do primeiro grupo (`:882`), o `text-xs` do título na gaveta (`:901`), nenhum botão de recolher na gaveta (`:200`), o nome em texto escondido (`:957`), "tudo dentro dos 64 px" (`:972`) e o `overflow-y-auto` da lista da gaveta (`Autenticado.tsx:186`, prova `:908`, já fora da rodada 1). A escolha deu prioridade às superfícies de arranjo que a rodada 1 apontou como sem check, mais o hover, que é superfície nova; o `overflow-y-auto` não foi tocado pela correção.

## Ranked gaps

Nenhuma lacuna que pese no veredito. As 4 da rodada 1 fecharam:

1. Arranjo da barra recolhida: fechado por C12 `arranjo.spec.ts:957`, `:960`, `:962`, `:966`, `:967`, `:972`; 3 deles feitos falhar por falta injetada.
2. C12, cláusulas sem prova: texto dos avisos `push.spec.ts:85` (falta morta) e todo item visível nos 64 px `arranjo.spec.ts:972`, mais os avisos `push.spec.ts:87`.
3. Hover da dica: C13 `arranjo.spec.ts:983` (falta morta).
4. Marca à esquerda e botão à direita: C10 `arranjo.spec.ts:937-938`.

As 3 notas de precisão da rodada 1 também fecharam: margem 0 no primeiro grupo `:882`, `text-xs` na gaveta `:901`, nenhum botão de recolher na gaveta `:200`.

Ficam como notas, fora do veredito: "ícones centralizados" sem asserção de centro (ver Binding sources); a observação da rodada 1 sobre a dica aberta por hover que continua na tela quando a janela encolhe abaixo de 1024 px, que o autor registrou como não tratada em `checks.md`.

## Gate

- `cd web && npx vitest run --reporter=verbose` - 238 passed, 0 failed (os 10 testes nomeados das provas aparecem com ✓)
- `cd web && npx playwright test --reporter=list` (contêiner :8080, bundle `index-8Zg6GwNy.js`) - 65 passed, 0 failed
- `python .specs/features/interface-nova/chamadas_iguais.py ff07f05` - exit 0, 229 testes, 0 problema (rodado sozinho)
- `npm --prefix web run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` exit 0; `dryer ... | grep -q "No duplicate candidates found"` exit 0
