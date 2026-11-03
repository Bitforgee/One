# Barra lateral: grupos, nome e recolher verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: ff07f05..d6f0b9f
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Escopo do diff: `git diff ff07f05..HEAD -- web/src/Autenticado.tsx web/src/AvisosPush.tsx web/src/index.css web/src/ui/tooltip.tsx web/src/acesso web/e2e .specs/features/barra-lateral-grupos` (commits `f9aa888` e `d6f0b9f`; os commits do `historico-legivel` no meio ficam fora). No intervalo, `checks.md` só ganhou `[x]`, uma prova extra no C11 e o `## Handoff`; nenhum claim mudou. O `plan.md` mudou só no passo 3 do `## Flow` (variante `recolhida:` e "a transição só vale depois de alternar").

O código desenha o que o plano decide: as 4 capturas contra o :8080 (barra aberta a 1280, recolhida a 1280 com hover, barra de topo a 360, gaveta a 360) batem com o `## Screens`. O FAIL vem das provas: a barra recolhida é desenhada pelo plano e a maior parte do arranjo dela não tem check, e o C12 afirma duas coisas que o teste não mede.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `barra-lateral-grupos/plan.md` `## Screens` linha "barra aberta" | yes - lido inteiro; captura a 1280 px | none | marca à esquerda e botão de recolher à direita: o C10 só mede a mesma linha (`arranjo.spec.ts:931`), não o lado |
| `barra-lateral-grupos/plan.md` `## Screens` linha "barra recolhida" | yes - lido inteiro; captura a 1280 px recolhida com hover | none | marca e botão de expandir empilhados no topo (sem check); linha fina entre grupos no lugar do título (sem check); no rodapé Tema e Sair só com ícone, um por linha, e o nome em texto escondido (sem check: o C12 mede só os 9 links); dica ao passar o mouse num link (o C13 só cobre foco) |
| `barra-lateral-grupos/plan.md` `## Screens` linha "gaveta" | yes - lido inteiro; captura a 360 px | none | - |
| `barra-lateral-grupos/plan.md` `## Screens` linha "barra de topo" | yes - lido inteiro; captura a 360 px | none | - |
| respostas do usuário de 03/11 ("Por assunto", recolher, mostrar o nome) via AD-028 em `.specs/STATE.md` | yes - AD-028 lido | none | - |
| `redesign-institucional/plan.md` door 3a e `## Screens` linha 0 | yes - lidos | none (o mesmo `<nav>` fica; 240 px, borda, `--sidebar`, 36 px por link seguem provados pelo "barra lateral a" do redesign) | - |

Enumeração do step 1, por estado (o que o plano decide e quem prova):

- **barra aberta**: 240 px (redesign "barra lateral a", C11 volta a 240); botão "Recolher barra lateral" com `aria-expanded` (C10); mesma linha da marca (C10); marca à esquerda e botão à direita (sem check); instituição embaixo (redesign `arranjo.spec.ts:126`); 3 títulos na ordem com os links certos (C1, C3); título em 12 px (C4); 24 px antes do título (C4); "menos o primeiro" (sem check, precisão); grupo sem link some (C2); nome no rodapé acima de Tema e Sair, uma linha com reticências (C5).
- **barra recolhida**: 64 px e conteúdo a 64 (C11); botão "Expandir barra lateral" `aria-expanded=false` (C11); marca e botão empilhados (sem check); instituição, títulos e rótulos escondidos (C12); texto dos avisos escondido (no claim do C12, sem asserção); nome em texto escondido (sem check); linha fina entre grupos (sem check); ícones um por linha de 36 px dentro dos 64 px (C12, só os links); iniciais no círculo de 32 px com o nome na dica (C8); Tema e Sair só com ícone, um por linha (sem check); dica ao focar (C13) ou passar o mouse (sem check).
- **gaveta**: nome abaixo de "Menu" (C6); títulos de grupo antes dos links com 32 px (C4); `text-xs` do título na gaveta (sem check, precisão); sem botão de recolher (não renderizado em `Gaveta`, `Autenticado.tsx:171-197`; sem asserção, o C16 olha só o `<nav>`).
- **barra de topo**: sem nome (C9); 56 px e sem botões de recolher com `one-barra=recolhida` (C16).

As capturas mostram o arranjo recolhido certo (medido: "One" y=16, botão y=48, ambos dentro dos 64 px; Tema y=712, Sair y=752, cada um 36 px de largura; borda entre grupos visível; dica "Artigos" ao passar o mouse). O que falta é a prova, não o desenho.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 3 grupos na ordem, links certos, na barra e na gaveta | `npx vitest run src/acesso/acesso.test.tsx src/acesso/textos.test.tsx -t "<7 nomes>"` exit 0, "grupos por assunto na barra e na gaveta" ✓ | `web/src/acesso/acesso.test.tsx:418` - `expect(grupos(nav)).toEqual(Esperado)`; `:422` - `expect(grupos(gaveta)).toEqual(Esperado)` | PASS |
| C2 | grupo sem link some, por papel | mesma invocação, "grupos por papel" x3 ✓ | `web/src/acesso/acesso.test.tsx:434` - `expect(grupos(await screen.findByRole('navigation'))).toEqual(esperado)` com aluno, atendente e administrador | PASS |
| C3 | `role="group"` nomeado pelo título | mesma invocação ✓ | `web/src/acesso/acesso.test.tsx:419` e `:423` - `getByRole('group', { name: nome })` na barra e na gaveta | PASS |
| C4 | títulos em 12 px acima do 1º link, 24 px entre grupos; gaveta 32 px antes dos links | `npx playwright test` (64/64) "grupos na barra lateral" ✓ "grupos na gaveta" ✓ | `web/e2e/arranjo.spec.ts:877` - `fontSize ... toBe('12px')`; `:880` - `t.y - fundoAnterior ... toBeGreaterThanOrEqual(23)`; `:898` - `Math.abs(titulo.height - 32) ... toBeLessThanOrEqual(1)`; `:899` antes dos links | PASS |
| C5 | nome no rodapé acima de Tema e Sair, nowrap e ellipsis, dentro da barra | "nome do usuário na barra" ✓ | `web/e2e/arranjo.spec.ts:916` - `toEqual(['nowrap', 'ellipsis'])`; `:918` - `n.x + n.width ... toBeLessThanOrEqual(241)`; `:919` acima de Tema e Sair | PASS |
| C6 | nome abaixo de "Menu" na gaveta | Vitest "nome do usuário na gaveta" ✓ | `web/src/acesso/acesso.test.tsx:445` - `titulo.compareDocumentPosition(nome) & Node.DOCUMENT_POSITION_FOLLOWING` | PASS |
| C7 | iniciais AS, A, CR | Vitest "iniciais do usuário" ✓ | `web/src/acesso/acesso.test.tsx:451-453` - `iniciais('Ana Beatriz Souza')).toBe('AS')`, `('ana')).toBe('A')`, `('  Carla  Regina ')).toBe('CR')` | PASS |
| C8 | círculo 32x32, nome acessível e dica | "barra recolhida a 1024 px" ✓ e "a 1280 px" ✓ | `web/e2e/arranjo.spec.ts:951` - `getByRole('img', { name: 'Ana' })`; `:953` - `toEqual([32, 32])`; `:955` - tooltip `toHaveText('Ana')` | PASS |
| C9 | sem nome na barra de topo a 360, 768, 1023 | "abaixo de 1024 px sem barra lateral" x3 ✓ | `web/e2e/arranjo.spec.ts:194` - `nav.getByText('Ana', { exact: true }) ... toBeHidden()` | PASS |
| C10 | botão "Recolher barra lateral" `aria-expanded=true` na linha da marca a 1024 e 1280 | "barra recolhida" x2 ✓ | `web/e2e/arranjo.spec.ts:930` - `toHaveAttribute('aria-expanded', 'true')`; `:931` - diferença de topo `toBeLessThanOrEqual(4)` | PASS |
| C11 | 64 px, main a x 63 ou mais, "Expandir" `aria-expanded=false`, volta a 240 | "barra recolhida" x2 ✓; Vitest "recolher e expandir gravam one-barra" ✓ | `web/e2e/arranjo.spec.ts:934` - `toBe(64)`; `:935` - `toBeGreaterThanOrEqual(63)`; `:937` - `aria-expanded 'false'`; `:964` - `toBe(240)`; `web/src/acesso/acesso.test.tsx:465` | PASS |
| C12 | recolhida: 9 links com nome e só ícone, 36 px; títulos, instituição e texto dos avisos não visíveis; nenhum item passa dos 64 px | "barra recolhida" x2 ✓ | `web/e2e/arranjo.spec.ts:943` rótulo `toBeLessThanOrEqual(1)`; `:945` 36 px; `:946` `c.x + c.width ... toBeLessThanOrEqual(65)` só nos links; `:948` títulos; `:949` instituição. Sem asserção para o texto dos avisos (a `simularApi` não serve `/api/push/chave`, então os avisos nem renderizam no teste) nem para marca, botão, Tema e Sair dentro dos 64 px (busca por `visos`, `Tema`, `Sair` em `arranjo.spec.ts` a partir da linha 920: nada no bloco recolhido) | FAIL - 2 de 5 cláusulas sem prova |
| C13 | foco num link recolhido mostra `role=tooltip` com o rótulo | "barra recolhida" x2 ✓ | `web/e2e/arranjo.spec.ts:958` - `page.getByRole('tooltip') ... toHaveText('Artigos')` após `focus()` | PASS |
| C14 | grava recolhida e aberta; recarregar começa com 64 px | "barra recolhida" x2 ✓ | `web/e2e/arranjo.spec.ts:938` - `toBe('recolhida')`; `:961` recarregou `toBe(64)`; `:965` - `toBe('aberta')` | PASS |
| C15 | ausente ou `x` começa aberta | Vitest "one-barra desconhecido começa aberta" (null) ✓ (x) ✓ | `web/src/acesso/acesso.test.tsx:477` - `data-recolhida ... toBe('false')`; `:478` - `aria-expanded 'true'` | PASS |
| C16 | 768 px com recolhida: 56 px e sem botões de recolher | "abaixo de 1024 px sem barra lateral" x3 ✓ | `web/e2e/arranjo.spec.ts:187` - `Math.abs(barra.height - 56) ... toBeLessThanOrEqual(1)`; `:195` - os 2 botões `toBeHidden()`; init script com `one-barra=recolhida` na linha 180 | PASS |
| C17 | reduced motion: 0s; sem ele, maior que 0s | "movimento reduzido na barra lateral" ✓ | `web/e2e/arranjo.spec.ts:976` - `not.toBe('0s')`; `:978` - `toBe('0s')` (mede depois de alternar, como o passo 3 do `## Flow` emendado diz) | PASS |
| C18 | suítes inteiras verdes; só asserções do Test policy mudadas; mesmas chamadas à API | `npx vitest run` 238/238; `npx playwright test` 64/64 contra o :8080 (bundle `index-8Zg6GwNy.js` contém "Recolher barra lateral"); `python .specs/features/interface-nova/chamadas_iguais.py ff07f05` exit 0, sozinho | saída: "229 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD"; diff dos testes: só `Links` (`arranjo.spec.ts:8`), lista do administrador (`acesso.test.tsx:233`) e `Cabecalho` (`textos.test.tsx:8`) mudam, nenhum título de teste renomeado | PASS |
| C19 | textos só os novos; crapper 0 a 9.99; dryer sem candidato; mutator suspenso | Vitest "textos cabeçalho" ✓; `npm --prefix web run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` exit 0 (pior: `Autenticado` 9.0, `AvisosPush` 9.0); `dryer ... grep -q "No duplicate candidates found"` exit 0 | `web/src/acesso/textos.test.tsx:8` - `Cabecalho` com só os 3 títulos novos; `:28` e `:36` - `tela.conferir(nav, [Instituicao, Nome])`, gaveta com `[Nome]`. `mutator` não rodou (AD-025) | PASS |

## Coverage

Recalculado da fonte com autoridade: o `## Screens` e os AC do plano para os conjuntos de desenho; o código só para os papéis (`Menu`, `Autenticado.tsx:17-27`) e os valores lidos de `one-barra` (`Autenticado.tsx:151`).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| grupos (3) | AC 1 e `## Screens` | Atendimento, Conhecimento, Administração -> C1 `acesso.test.tsx:418`, C3 `:419` | - |
| papéis (3) | `Menu` `Autenticado.tsx:17-27` | ALUNO, ATENDENTE, ADMINISTRADOR -> C2 `acesso.test.tsx:434` (it.each) | - |
| lugares dos grupos (2) | `## Screens` | barra C1, C4 · gaveta C1, C4 | - |
| lugares do nome (4) | `## Screens` e AC 4 a 7 | rodapé aberto C5 · gaveta C6 · iniciais recolhida C8 · barra de topo sem nome C9 | - |
| formas do nome para iniciais (3) | AC 6 | várias palavras, uma palavra, espaços sobrando -> C7 | - |
| valores de `one-barra` (4) | door 1 e `Autenticado.tsx:151,154` | recolhida C14 · aberta C14 · ausente C15 · `x` C15 | - |
| larguras (2 faixas) | AC 8 a 14 | a partir de 1024 C10-C14 (1024 e 1280) · abaixo de 1024 C9, C16 (360, 768, 1023) | - |
| doors do plano (2) | `## Landing` | door 1 C14, C15 · door 2 C11 (`lg:w-16`, `lg:ps-16`), C12 | - |
| gatilhos da dica do link (2) | AC 11 e `## Screens` ("ao focar ou passar o mouse") | foco C13 `arranjo.spec.ts:958` | hover |
| itens do rodapé recolhido (4) | `## Screens` linha "barra recolhida" | círculo das iniciais C8 `arranjo.spec.ts:953` | Tema só ícone · Sair só ícone · texto dos avisos escondido |
| itens do topo recolhido (2) | `## Screens` ("Marca e botão de expandir empilhados") | botão Expandir: nome C11 | marca e botão empilhados (nenhum check de posição) |
| testes reescritos (3) | `## Impact` e `## Test policy` | `Links` e gaveta do e2e C1, C4 · "textos cabeçalho" C19 · rodapé (redesign C14) C5 | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Teste que afirma a lista de links na ordem antiga ou o cabeçalho sem grupos | `web/e2e/arranjo.spec.ts` (`Links`), `web/src/acesso/textos.test.tsx` (`Cabecalho`), `web/src/acesso/acesso.test.tsx` ("cabeçalho num único nav por papel") | reescrito no mesmo commit (`f9aa888`) sem trocar o nome | yes - nomes iguais; "cabeçalho a 360 px abre a gaveta Menu", "abaixo de 1024 px sem barra lateral" e "barra lateral a" seguem com os 9 links, 48 px na gaveta e "Sair" por último, e passam no :8080 |
| linhas herdadas da `interface-nova` e da `redesign-institucional` | os mesmos arquivos | suítes inteiras e chamadas iguais | yes - Vitest 238/238, Playwright 64/64, `chamadas_iguais.py` 0 problema |

## Faults injected

Worktree descartável (`git worktree add --detach <scratch>/wt HEAD`, `node_modules` por junção, removida antes da worktree). Faltas de Vitest rodaram na worktree; as de e2e num `vite build --outDir` da worktree servido por `vite preview` (portas 4174 e 4175), com `E2E_URL` e o controle "grupos na barra lateral" verde no mesmo servidor. `git status --porcelain` da árvore real igual antes e depois (só `.idea/` e os 2 `__pycache__` da `refatoracao-solid`, que já estavam lá). `mutator` não rodou (AD-025).

| Mutation | Location | Killed |
| --- | --- | --- |
| Indicadores no grupo `Conhecimento` em vez de `Atendimento` | `web/src/Autenticado.tsx:21` | yes - "grupos por assunto na barra e na gaveta" falhou |
| iniciais com a 2ª palavra em vez da última (`partes[1]`) | `web/src/Autenticado.tsx:33` | yes - "iniciais do usuário" falhou |
| leitura de `one-barra` `!== 'aberta'` (ausente e `x` começam recolhidas) | `web/src/Autenticado.tsx:151` | yes - "one-barra desconhecido começa aberta" (null) e (x) falharam |
| rótulo do link sem `recolhida:sr-only` | `web/src/Autenticado.tsx:92` | yes - "barra recolhida a 1280 px" falhou em `arranjo.spec.ts:943`; controle passou |
| transição sem `motion-safe:` | `web/src/Autenticado.tsx:37` | yes - "movimento reduzido na barra lateral" falhou (Received "0.2s"); controle passou |

Não injetado (limite de 5): `overflow-y-auto` da lista da gaveta (`Autenticado.tsx:186`), cuja única prova é "grupos na gaveta" `arranjo.spec.ts:905`.

## Ranked gaps

1. Arranjo da barra recolhida sem check (composição desenhada pelo `## Screens`, peso de FAIL): marca e botão empilhados, linha fina entre grupos, Tema e Sair só com ícone um por linha, nome em texto escondido - sem check; `web/e2e/arranjo.spec.ts:924-966` só mede links, títulos, instituição e o círculo.
2. C12 com cláusulas sem prova: "texto dos avisos não visíveis" (os avisos não renderizam na `simularApi`, sem `/api/push/chave`) e "nenhum item passa dos 64 px" medido só nos 9 links - `web/e2e/arranjo.spec.ts:946`.
3. AC 11 hover sem prova: o C13 cobre só o foco (`web/e2e/arranjo.spec.ts:957-958`); o hover funciona na captura, mas sem teste.
4. Barra aberta: "marca à esquerda, botão à direita" sem check de lado - `web/e2e/arranjo.spec.ts:931` mede só o topo.

Lacunas de precisão (não pesam no veredito): "24 px antes, menos o primeiro" não mede o primeiro título; `text-xs` do título na gaveta não medido; ausência do botão de recolher na gaveta não afirmada (o C16 olha só o `<nav>`, e a gaveta é um portal).

Observação fora do enumerado: com a barra recolhida e o mouse parado sobre um link, reduzir a janela abaixo de 1024 px deixa a dica "Artigos" aberta sobre a barra de topo (captura a 360 px), porque o link some sem `pointerleave`. Sequência rara; não pesa no veredito.

## Gate

- `cd web && npx vitest run` - 238 passed, 0 failed (34 arquivos)
- `cd web && npx vitest run src/acesso/acesso.test.tsx src/acesso/textos.test.tsx -t "<7 nomes>"` - 10 passed, 31 skipped
- `cd web && npx playwright test` (contêiner :8080) - 64 passed, 0 failed
- `python .specs/features/interface-nova/chamadas_iguais.py ff07f05` - exit 0, 229 testes, 0 problema
- `crapper --use-existing-coverage -s src --threshold 9.99` - exit 0; `dryer ... | grep -q "No duplicate candidates found"` - exit 0
