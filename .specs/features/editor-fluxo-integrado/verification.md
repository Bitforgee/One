# Editor de fluxo dentro da casca - verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 9d80016..HEAD (5eaf9e8); rodada 2: 8579e27..a381a04; rodada 3: a381a04..5eaf9e8
**Round**: 3 - scoped (C5, C9, C10, C11, C19, C22-C25 re-verificados em 5eaf9e8; C7 e C14 carried from a381a04; o resto carried from 8579e27)
**Verifier**: independent sub-agent (author != verifier)

Resumo da rodada 3: FAIL. C22, C23, C25 PASS; **C24 FAIL** (a prova de Playwright da cadeia inválida é vazia: mutante sobrevive, ver Round 3); **mutante a1 sobrevive** (`!ignorarSaida.current` sem prova: Descartar com edições não salvas); C21 NÃO RODOU (crapper, AD-044, nenhum AD cobre esta feature).

Resumo (rodada 1; atualizado na rodada 2 abaixo): 18 de 21 checks PASS; 3 não PASS: C7 (o fim "Descartar rascunho" não tem prova do destino nem do aviso; mutante sobreviveu), C14 (a ordem dos controles é afirmada pelo check e nenhum teste a mede; mutante sobreviveu), C21 (`crapper` NÃO RODOU, AD-044; `dryer` saiu 0).

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.playwright-mcp/cad-depois-canvas2.png` (estado antigo, 1440x900) | yes - imagem aberta | none: o antigo tem "Editar: Fluxos" + "Boletos · ADS, 3º semestre" no topo, sem casca, botão `Cancelar`, canvas até ~780 px com ~120 px vazios, painel "Simular um aluno" sem moldura. O novo retira a `Cancelar`, põe a casca e preenche a altura, como o plano pede | - |
| print real do editor novo, 1440x900, dev server + API simulada (mesma preparação de `editor-fluxo.spec.ts`; arquivo temporário apagado) | yes - imagem aberta | none. Vejo: barra lateral da instituição à esquerda com "Cadastros" ativo e o título "Cadastros" no cabeçalho; trilha `Cadastros › Fluxos › Financeiro > Boletos e mensalidades · Todos os cursos`; uma barra com `Voltar`, selo `Publicado v2`, abas `Lista`/`Canvas`, e à direita `Simular`, `Salvar rascunho`, `Publicar`, `Mais`; o canvas vai até ~12 px do fim da janela; à direita o painel "Simular um aluno" com os dois seletores; sem `Cancelar`. O texto da trilha difere do antigo só porque a fixture é outra. Os cartões dos nós aparecem pequenos (enquadramento do `fitView`), o que nenhum check fixa | Ordem dos controles na barra: o check C14 diz "nesta ordem ... e o botão `Voltar`" (Voltar ao fim); o código e o print põem `Voltar` primeiro e nenhum teste mede a ordem (ver C14). Zoom/tamanho dos nós no canvas: sem check (cosmético) |
| plan.md `Surface` (200/404/403), `Landing` (endereço), `Criteria` AC 1-17 | yes - lidos | none (C20 e Surface: o plano já diz "a casca leva à tela inicial", a emenda do builder em C20 acompanha o plano) | - |
| n8n: community.n8n.io "canvas improvements" (focus panel) e blog "Autosave" | não reabertas (fontes externas só de motivação; o plano as cita como justificativa, nenhum check as copia literalmente) | none - painel lateral à direita com o diagrama à vista e salvar separado de publicar batem com AC 12/13/8 | - |

## Checks

Provas rodadas em HEAD, em um comando por alvo. Vitest: `npx vitest run src/administracao/paginaDoFluxo.test.tsx src/administracao/fluxos.test.tsx --reporter=verbose` - 20 passed, cada nome aparece no relatório. Playwright (dev server em 5173): `$env:E2E_URL='http://localhost:5173'; npx playwright test editor-fluxo.spec.ts` - 9 passed. Os 13 testes de `paginaDoFluxo.test.tsx` e os 7 de `fluxos.test.tsx` existem (`rg`/Select-String nas linhas `it(` 42-206 e 52-199).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | editor em região, sem diálogo, barra lateral, URL `/univag/cadastros/fluxos/7` | vitest `abre na casca sem diálogo` + playwright `endereço do editor` exit 0 | `paginaDoFluxo.test.tsx:42-54` (`expect(screen.queryByRole('dialog')).not.toBeInTheDocument()`); `editor-fluxo.spec.ts:46` `expect(new URL(page.url()).pathname).toBe('/univag/cadastros/fluxos/7')`, `:47` `getByRole('dialog')).toHaveCount(0)` | PASS |
| C2 | trilha com hrefs e item atual | vitest `trilha do editor` | `paginaDoFluxo.test.tsx:61` `toHaveAttribute('href', '/univag/cadastros')`, `:62` `'/univag/cadastros?aba=fluxos'`, `:64` `toHaveAttribute('aria-current', 'page')`. Emenda `?aba=fluxos`: não enfraquece (é o que o AC 2 diz) | PASS |
| C3 | abre direto e recarrega, 2 etapas | vitest `abre direto pelo endereço` + playwright `recarregar mantém o editor` | `paginaDoFluxo.test.tsx:68-76` (`Destino da etapa 1` = LIDERANCA_SEMESTRE, `etapa 2` = COORDENACAO_CURSO, 3 ausente); `editor-fluxo.spec.ts:56-57` `toHaveValue(...)` | PASS |
| C4 | id 999: mensagem e link, sem editor | vitest `fluxo inexistente` | `paginaDoFluxo.test.tsx:81`, `:82` `toHaveAttribute('href', '/univag/cadastros?aba=fluxos')`, `:83` região ausente | PASS |
| C5 | Voltar do navegador leva à aba Fluxos | playwright `voltar do navegador` | `editor-fluxo.spec.ts:68` `expect(editor(page)).toHaveCount(0)`, `:71` `toBe('/univag/cadastros?aba=fluxos')`, `:70` aba `aria-selected` `true` | PASS |
| C6 | menu ativo e `h1` Cadastros | vitest `menu ativo e título` | `paginaDoFluxo.test.tsx:92` `expect(doMenu).toHaveAttribute('aria-current', 'page')`, `:93` `h1` `toHaveTextContent('Cadastros')` | PASS |
| C7 | Publicar e Descartar voltam à aba Fluxos e mostram `Fluxo publicado.` / `Rascunho descartado.` | vitest `simular e publicar`, `descartar o rascunho`, `avisos ao voltar à lista` exit 0 | Publicar: `paginaDoFluxo.test.tsx:102-104` (`findByText('Fluxo publicado.')`, `findByRole('tab', {name:'Fluxos', selected:true})`). **Descartar**: `fluxos.test.tsx:153-154` só espera o DELETE e que a região suma; `Rascunho descartado.` aparece só em `EdicaoDoFluxo.tsx:269`, em nenhum teste (`Select-String "Rascunho descartado"` em `web/src/administracao/*.tsx`). Mutante F5b (`navegar(lista)` no Descartar) sobreviveu: `fluxos.test.tsx -t "descartar o rascunho"` passou (1 passed) | PASS (rodada 2, ver abaixo) |
| C8 | salvar fica no editor, `Rascunho salvo.` e estado | vitest `salvar fica no editor` | `paginaDoFluxo.test.tsx:109-121`: `findByText('Rascunho salvo.')`, região presente, `getByText('Rascunho salvo')` | PASS |
| C9 | guarda de saída com 3 saídas; Continuar mantém; Sair leva à lista | vitest `sair sem salvar` | `paginaDoFluxo.test.tsx:131` `findByRole('dialog', { name: 'Sair sem salvar?' })`, laço sobre trilha Fluxos, trilha Cadastros e Voltar; `:139-141` Sair leva à aba Fluxos. Mutante F2 morto | PASS |
| C10 | sem alterações e após salvar não pergunta | vitest `sair sem alterações` | `paginaDoFluxo.test.tsx:152` aba Fluxos selecionada, `:162` `queryByRole('dialog', { name: 'Sair sem salvar?' })` ausente | PASS |
| C11 | `beforeunload` `defaultPrevented` com/sem alterações | vitest `fechar a aba com alterações` | `paginaDoFluxo.test.tsx:174` `return ev.defaultPrevented`, `:177` `toBe(false)`, `:178` `toBe(true)`. Mutante F3 morto | PASS |
| C12 | 1440x900 e 1280x800: base a ≤16 px, painel 320±1, sem rolagem | playwright `canvas ocupa a página` | `editor-fluxo.spec.ts:80` `toBeLessThanOrEqual(16)`, `:82` `Math.abs(painel.width - 320)` `<= 1`, `:85` `scrollHeight/clientHeight` `toEqual([altura, altura])`. Mutantes F6 e F7 mortos | PASS |
| C13 | painel troca entre `Simular um aluno` e `Etapa selecionada`, dentro da janela | playwright `painel lateral troca` | `editor-fluxo.spec.ts:98` `expect(simular).toHaveCount(0)`, `:100-101` painel dentro de 0..900. Mutante F8 morto | PASS |
| C14 | barra: estado, visões, Simular, Salvar, Publicar, Mais, Voltar, nesta ordem; sem Cancelar; mesmo centro vertical ≤2 px | vitest `barra do editor` + playwright `barra em uma linha` exit 0 | Presença: `paginaDoFluxo.test.tsx:182-192` (`Publicado v2`, 5 botões, `:188` abas `['Lista','Canvas']`, `:189` sem `Cancelar`); alinhamento: `editor-fluxo.spec.ts:114` `Math.max(...centros) - Math.min(...centros)` `<= 2`, `:115` Cancelar ausente. **A ordem não é medida**: o vitest usa `getByRole` sem posição e o e2e só compara centros. Mutante F10 (selo de estado movido para depois das visões, antes das ações) sobreviveu: `barra em uma linha` 1 passed e `barra do editor` 1 passed. Emenda do builder (topos ≤8 px -> centros ≤2 px): não enfraquece, é mais estrita e mede a mesma "uma linha". | PASS (rodada 2, ver abaixo) |
| C15 | lista em 1440: coluna ≤768 e simulador abaixo da última etapa | playwright `lista na largura de leitura` | `editor-fluxo.spec.ts:125` `toBeLessThanOrEqual(768 + 1)`, `:126` `simulacao.y >= ultima.y + ultima.height - 1` | PASS |
| C16 | 390 px: página, Lista, frase, simulador abaixo, botões ≥44 px | playwright `celular em página` | `editor-fluxo.spec.ts:135` sem diálogo, `:138` simulador abaixo, `:139` `.height` `toBeGreaterThanOrEqual(43.9)`. Mutante F9d (frase removida) morto. F9 (tirar `min-h-11` só do Voltar) sobreviveu, mas a regra global de alvo de toque do app (`ux.spec.ts` 44 px) cobre o botão, então a classe é redundante: mutante equivalente, anotado, não conta como falha | PASS |
| C17 | 390 px: barra em mais de uma linha, sem rolagem lateral | playwright `celular sem rolagem lateral` | `editor-fluxo.spec.ts:145` `toEqual([390, 390])`, `:149` `topos.size` `toBeGreaterThan(1)`. Mutante F9e (sem `flex-wrap`) morto; F9b (só o `flex-wrap` externo) sobreviveu porque o grupo de ações interno também quebra (equivalente) | PASS |
| C18 | rota `/:slug/cadastros/fluxos/:id` com id numérico, declarada uma vez | vitest `endereço do editor` | `paginaDoFluxo.test.tsx:198` `/fluxos/abc` -> `Fluxo não encontrado.`, `:201` região ausente, `:202` `expect(app.match(/path="cadastros\/fluxos\/:id"/g)).toHaveLength(1)`; `App.tsx:71` `<Route path="cadastros/fluxos/:id" ...>`; `PaginaDoFluxo.tsx` `/^\d+$/.test(id)` | PASS |
| C19 | nada além do planejado quebra | `npx vitest run` (65 files, 602 passed, 0 failed); `npm --prefix web run build` exit 0; playwright dos 5 specs: 165 passed, 5 failed | As 5 falhas são exatamente as de ambiente conhecidas: `identidade.spec.ts:36` (Public Sans/Source Serif), `:304` (PWA fontes latin), `:1281` (PWA outros alfabetos), `arranjo.spec.ts:1189` (cabeçalho 36 px), `ux.spec.ts:472` (`Avisos no celular`). Rodei contra o dev server; **não consegui reprová-las na base** (não montei worktree da base), a classificação é pela lista dada e porque todas esperam o app compilado/service worker e não tocam fluxos. `git diff 9d80016..HEAD -U0` nos testes existentes (`canvas.test.tsx`, `fluxos.test.tsx`, `textos.test.tsx`, `fluxos.spec.ts`, `fluxos-real.spec.ts`, `ux.spec.ts`): só trocas dialog->region (`canvas.test.tsx:41`, `fluxos.test.tsx:47`, `fluxos.spec.ts:25`, `fluxos-real.spec.ts:164`, `ux.spec.ts:1190`), `Cancelar`->`Voltar` (`canvas.test.tsx:196`, `fluxos.spec.ts:165`), `w-screen`->sem diálogo (`canvas.test.tsx:302`), esperas de diálogo->região (`fluxos.test.tsx:133,154`), `'Editar: Fluxos'` fora da lista de textos e `'Voltar'` somado (`textos.test.tsx:25,30`). Nenhuma asserção de regra removida. Extra do builder: `ux.spec.ts:700` abre a transcrição recolhida do assistente (resto da feature `chat-linha-do-tempo` C17), fora do escopo deste plano, mas inofensivo (só adiciona um clique) | PASS |
| C20 | atendente que abre o editor volta à Fila | vitest `sem o papel de administrador` | `paginaDoFluxo.test.tsx:209` `findByRole('heading', { level: 1, name: 'Fila' })`, `:210` região ausente. Emenda (Fila em vez de página de acesso negado): alinhada ao `Surface` do plano ("a casca leva à tela inicial"), não enfraquece | PASS |
| C21 | `crapper` < 9.99 e `dryer` sem candidato 0.8 | `dryer -s ... --threshold 0.8 ...` exit 0: "No duplicate candidates found."; `crapper --version`: `Program 'crapper.exe' failed to run ... Uma política de Controle de Aplicativo bloqueou este arquivo.` | metade `dryer`: PASS. metade `crapper`: **NÃO RODOU** (AD-044). O check diz que fica aberto como "não rodou", nunca PASS | FAIL (crapper não rodou) |
| C22 | link `Usuários` da barra lateral com etapa não salva abre `Sair sem salvar?`; Continuar mantém; Sair leva à tela | vitest `barra lateral com alterações` (rodada 3) | `paginaDoFluxo.test.tsx:194-210` `findByRole('dialog', { name: 'Sair sem salvar?' })`, `getByLabelText('Destino da etapa 3')` após Continuar, `findByRole('heading', { level: 1, name: 'Usuários' })` após Sair. Mutante a2 morto | PASS |
| C23 | Voltar do navegador com etapa não salva abre o diálogo; Continuar mantém `/univag/cadastros/fluxos/7`; sem alterações sai direto | playwright `voltar do navegador com alterações` (rodada 3) | `editor-fluxo.spec.ts:75-98` `expect(d).toBeVisible()`, `expect(new URL(page.url()).pathname).toBe('/univag/cadastros/fluxos/7')`, `expect(page.getByRole('dialog')).toHaveCount(0)` no fim. Mutante a2 morto (diálogo não aparece); mutante d morto (editor nem monta) | PASS |
| C24 | Ctrl+S/⌘+S: cadeia válida envia PUT igual ao botão e `defaultPrevented`; cadeia inválida ou gravando: nada enviado e `defaultPrevented` | vitest `Ctrl+S salva o rascunho` + playwright `Ctrl+S com cadeia inválida` (rodada 3) | Válida e gravando: `paginaDoFluxo.test.tsx:222` `expect(fireEvent.keyDown(document.body, { key: 's', ctrlKey: true })).toBe(false)`, `:223` corpo do PUT, `:225-226` ⌘+S durante a gravação `toBe(false)` e `toHaveLength(1)`. Mutante b morto. **Inválida: `editor-fluxo.spec.ts:102-114` `expect(gravacoes).toBe(0)` é vazio**: o `page.route('**/api/admin/fluxos/7/rascunho')` do teste é registrado ANTES de `noCanvas`/`preparar` → `simularApi` (`simulada.ts:49` `**/api/**`) é registrado depois e tem precedência, então `gravacoes` nunca sobe. Mutante c (sem `valida &&`) sobrevive; num spec temporário com a rota registrada depois de `noCanvas`: código original `gravacoes=0`, mutante c `gravacoes=1`. Além disso o Playwright não assere `defaultPrevented` na cadeia inválida (o Vitest só cobre a válida): a metade "inválida + defaultPrevented" do AC 20 não tem prova | FAIL |
| C25 | `main.tsx` com `createBrowserRouter`+`RouterProvider`, `util.tsx` com `createMemoryRouter` | vitest `roteador de dados` (1 passed) | `paginaDoFluxo.test.tsx:232-239` `expect(principal).not.toMatch(/<BrowserRouter/)`, `expect(util).toMatch(/createMemoryRouter\(/)`. Prova textual (lê o fonte), mas o comportamento é provado por C22/C23 (useBlocker lança fora de roteador de dados). Mutante d morto (2 provas: este e o e2e) | PASS |

## Coverage

Recomputado dos critérios 1-17 do plano, do `Surface` e do `Landing`, não da tabela de `checks.md`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| critérios do plano (17) | plan.md Criteria AC 1-17 | AC1 C1 · AC2 C2 · AC3 C3 · AC4 C4 · AC5 C5 · AC6 C6 · AC7 C7 (Publicar sim; Descartar sem destino e sem aviso) · AC8 C8 · AC9 C9 · AC10 C10 · AC11 C11 · AC12 C12 · AC13 C13 · AC14 C14 (ordem sem medida) · AC15 C15 · AC16 C16 · AC17 C17 | - (rodada 2: AC 7 Descartar por `avisos ao descartar`; AC 14 ordem por `barra em uma linha`) |
| `Surface` tela `/:slug/cadastros/fluxos/:id` (3) | plan.md Surface | 200 C1,C3 · 404 C4 (e C18 para id não numérico) · 403/redirect C20 | - |
| fim de uma gravação (3) | `EdicaoDoFluxo.tsx:267-269` (`salvar`, `publicar`, `descartar`) | Salvar C8 · Publicar C7 | - (rodada 2: Descartar C7) |
| formas de sair do editor (5) | plan AC 5, 9, 11 | trilha Cadastros, trilha Fluxos, Voltar C9 · Voltar do navegador C5 · fechar a aba C11 | - |
| painel lateral (2) | plan AC 13 | C13 | - |
| visões (2) | plan AC 12, 15 | Canvas C12 · Lista C15 | - |
| larguras (4) | plan AC 12, 14-17 | 390 C16,C17 · 1280 e 1440 C12 · lista 1440 C15 · barra 1440 C14 | - |
| doors do `Landing` (2) | endereço do editor C18 · roteador de dados C25 | - |
| critérios da emenda (3) | plan.md AC 18-20 | AC 18 C22 (barra lateral), C23 (Voltar do navegador) · AC 19 C24 válida (Vitest) · AC 20 gravando (Vitest) | AC 20 cadeia inválida: sem prova que falhe (Playwright vazio, mutante c vivo; sem `defaultPrevented`) |
| formas de sair do editor, rodada 3 (7) | `EdicaoDoFluxo.tsx` `useBlocker`, `sairDeVez` | trilha Cadastros/Fluxos e Voltar C9 · Voltar do navegador C5, C23 · fechar a aba C11 · link da barra lateral C22 · Publicar/Descartar (saem sem perguntar) C7 | Descartar com edições não salvas: nenhum teste (mutante a1 vivo) |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide, na tela (achar o fluxo pelo id, guarda de saída, para onde cada fim de gravação volta) | `PaginaDoFluxo.tsx`, `EdicaoDoFluxo.tsx` (`sair`, `publicar`, `descartar`) | Vitest na própria camada, um caso por linha da tabela de decisão | yes (rodada 2) - o caso `avisos ao descartar` existe e mata F5b/F5c; achar o fluxo (F1), guarda (F2), `beforeunload` (F3), trilha (F4) e destino do Publicar (F5) seguem mortos |
| Arranjo (alturas, larguras, uma linha, painel de 320 px) | `EdicaoDoFluxo.tsx` (altura), `Canvas.tsx` (`lg:w-80`, painel), barra | Playwright com `boundingBox`, cada largura do plano | yes - 390, 1280, 1440 medidos; altura (F6), largura do painel (F7), troca de painel (F8) e quebra da barra (F9e) mortos; a ordem dos controles é medida desde a rodada 2 (F10b morto, ver C14) |
| Instrumentation (classes, ícones, textos fixos) | `Trilha`, `MaisAcoes`, textos | nenhuma própria | yes |
| Decide, na tela - rodada 3 (guarda de saída com `useBlocker`, atalho Ctrl+S) | `EdicaoDoFluxo.tsx` (`useBlocker`, `ignorarSaida`, `useAtalhoDeSalvar`) | Vitest na própria camada, um caso por linha da tabela de decisão | **no** - faltam os casos "Descartar com edições não salvas sai sem perguntar" (a1) e "Ctrl+S com cadeia inválida não envia" (c); o caso no Playwright é vazio |

## Faults injected

Feitas na árvore real, uma de cada vez, revertidas com `git checkout -- <arquivo>`; `git status --porcelain` depois de cada rodada só mostrou os `demo-live-*.png` não rastreados que já existiam antes de eu começar.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 PaginaDoFluxo ignora o id (`dados.fluxos[0]`) | `PaginaDoFluxo.tsx` (find por id) | yes - `abre direto pelo endereço` e `fluxo inexistente` falharam (2 failed) |
| F2 `sair` sempre navega (`navegar(destino)`) | `EdicaoDoFluxo.tsx` `sair` | yes - `sair sem salvar` falhou |
| F3 `useAvisoAoFechar(false)` | `EdicaoDoFluxo.tsx` | yes - `fechar a aba com alterações` falhou |
| F4 href da trilha `?aba=fluxo` | `EdicaoDoFluxo.tsx` `fluxos` | yes - `trilha do editor` falhou |
| F5 Publicar volta à lista sem aba (`navegar(lista)`) | `EdicaoDoFluxo.tsx` `publicar` | yes - `avisos ao voltar à lista` falhou |
| F5b Descartar volta à lista sem aba (`navegar(lista)`) | `EdicaoDoFluxo.tsx:269` `descartar` | no na rodada 1 (corrigido: ver F5b-r2, yes) - `fluxos.test.tsx -t "descartar o rascunho"`: 1 passed |
| F6 altura do canvas `lg:h-[calc(100dvh-200px)]` | `EdicaoDoFluxo.tsx` | yes - `canvas ocupa a página`: base do canvas 140 > 16 |
| F7 `lg:w-80` -> `lg:w-64` | `Canvas.tsx` | yes - `canvas ocupa a página`: painel 64 px fora de 1 px |
| F8 painel da etapa e simulador juntos | `Canvas.tsx` `<aside>` | yes - `painel lateral troca`: `toHaveCount(0)` recebeu 1 |
| F9 tirar `min-h-11` do Voltar | `EdicaoDoFluxo.tsx` | no (equivalente: regra global de 44 px; anotado, não conta) |
| F9b tirar só o `flex-wrap` externo da barra | `EdicaoDoFluxo.tsx` `BarraDoEditor` | no (equivalente: o grupo de ações interno também quebra; anotado) |
| F9d remover a frase "O canvas está disponível..." | `EdicaoDoFluxo.tsx` | yes - `celular em página` falhou |
| F9e remover todo `flex-wrap` da barra | `EdicaoDoFluxo.tsx` | yes - `celular sem rolagem lateral` falhou |
| F10 selo de estado depois das visões e antes das ações | `EdicaoDoFluxo.tsx` `BarraDoEditor` | no na rodada 1 (corrigido: ver F10b, yes) - `barra em uma linha` 1 passed e `barra do editor` 1 passed |
| a1 (rodada 3) sem `!ignorarSaida.current` no `useBlocker` | `EdicaoDoFluxo.tsx:254` | **no** - `paginaDoFluxo.test.tsx` + `fluxos.test.tsx`: 24 passed |
| a2 (rodada 3) condição do bloqueio sempre falsa (`false && ...`) | `EdicaoDoFluxo.tsx:254` | yes - `sair sem salvar` e `barra lateral com alterações` falharam; playwright `voltar do navegador com alterações` falhou (diálogo invisível) |
| b (rodada 3) sem `e.preventDefault()` em `useAtalhoDeSalvar` | `EdicaoDoFluxo.tsx:~233` | yes - `Ctrl+S salva o rascunho` falhou |
| c (rodada 3) salva mesmo com `!valida` | `EdicaoDoFluxo.tsx:~277` | **no** - playwright `Ctrl+S com cadeia inválida` 1 passed (prova vazia); vitest `Ctrl+S` 1 passed (não cobre cadeia inválida) |
| d (rodada 3) `main.tsx` volta a `<BrowserRouter>` | `main.tsx` | yes - `roteador de dados` falhou e o e2e `voltar do navegador` expirou (editor não monta) |

## Gate

`cd web && npx vitest run` - 65 files, 602 passed, 0 failed. `npm --prefix web run build` exit 0. `npx playwright test editor-fluxo.spec.ts` - 9 passed. Specs existentes - 165 passed, 5 failed (as 5 falhas de ambiente listadas em C19).

## Ranked gaps

1. C7 - `Rascunho descartado.` e o destino aba Fluxos do Descartar sem prova (`EdicaoDoFluxo.tsx:269`; `fluxos.test.tsx:153-154` só vê o DELETE e a região sumir). Falta um caso no `paginaDoFluxo.test.tsx` análogo a `avisos ao voltar à lista` (`:97-107`) para Descartar.
2. C14 - "nesta ordem" sem medida nenhuma (mutante F10 sobreviveu). Ou o teste compara as posições x na ordem estado, visões, Simular, Salvar, Publicar, Mais, ou o check muda o texto (e diz onde fica o `Voltar`, hoje primeiro; o check o lista por último).
3. C21 - `crapper` NÃO RODOU (bloqueio de Application Control, AD-044); precisa ser rodado em outra máquina ou aceito por AD do dono do projeto.

## Round 2 (scoped: C7, C14)

**Base da rodada**: round 1 em 8579e27; correção do builder em a381a04 (`test(web): prove the Descartar notice and destination and the order of the editor bar`). Header, Coverage e Test policy acima foram atualizados para esta rodada; o resto (C1-C6, C8-C13, C15-C20, binding sources, faults F1-F9e) está `carried from 8579e27` e não foi reverificado.

**Escopo do diff** (`git diff 8579e27..HEAD --stat`): `checks.md` (3 linhas), `web/e2e/editor-fluxo.spec.ts` (+4), `web/src/administracao/paginaDoFluxo.test.tsx` (+12), mais o próprio `verification.md` da rodada 1 (100 linhas, committed depois de 8579e27). Nenhum arquivo de produção mudou. Confirmado.

**Emenda do check C14** (`checks.md`): a ordem passou de "...`Mais`, e o botão `Voltar`" para "da esquerda para a direita, o botão `Voltar`, o estado, ...". Concordo que não enfraquece: o texto antigo contradizia o plano e o código (Voltar primeiro, `EdicaoDoFluxo.tsx:176-178`, antes do `Badge` em `:179`) e agora a ordem é medida. O builder acrescentou `Proof:` de C7 (`-t "avisos ao descartar"`). Não alterou nenhuma asserção existente.

### Provas (rodadas em a381a04, Vitest em uma chamada)

`npx vitest run src/administracao/paginaDoFluxo.test.tsx src/administracao/fluxos.test.tsx -t "simular e publicar|descartar o rascunho|avisos ao voltar à lista|avisos ao descartar|barra do editor" --reporter=verbose` - Test Files 2 passed, Tests 5 passed, 16 skipped (contagem > 0; cada nome no relatório):

```
paginaDoFluxo.test.tsx > editor de fluxo na casca > avisos ao voltar à lista   ✓
paginaDoFluxo.test.tsx > editor de fluxo na casca > avisos ao descartar         ✓
paginaDoFluxo.test.tsx > editor de fluxo na casca > barra do editor             ✓
fluxos.test.tsx > fluxos > simular e publicar                                   ✓
fluxos.test.tsx > fluxos > descartar o rascunho                                 ✓
```

Playwright, dev server `npm run dev` em 5173: `$env:E2E_URL='http://localhost:5173'; npx playwright test editor-fluxo.spec.ts -g "barra em uma linha"` - `✓ 1 [chromium] › e2e\editor-fluxo.spec.ts:105:3 › editor de fluxo na casca › barra em uma linha` / `1 passed`.

### Evidência por check

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C7 | Publicar e Descartar voltam à aba Fluxos e mostram `Fluxo publicado.` / `Rascunho descartado.` | os 3 vitest de C7 (`simular e publicar`, `descartar o rascunho`, `avisos ao voltar à lista`) + `avisos ao descartar`: 4 passed | `paginaDoFluxo.test.tsx:109-118` (`avisos ao descartar`): `expect(await screen.findByText('Rascunho descartado.')).toBeInTheDocument()`, `expect(await screen.findByRole('tab', { name: 'Fluxos', selected: true })).toBeInTheDocument()`, `expect(gravadas(chamadas)).toEqual([['DELETE', '/api/admin/fluxos/6/rascunho', undefined]])`; Publicar segue em `:97-107` | PASS |
| C14 | barra, da esquerda para a direita: Voltar, estado, visões, Simular, Salvar, Publicar, Mais; sem Cancelar; centros ≤ 2 px | vitest `barra do editor` + playwright `barra em uma linha`, ambos passed | `editor-fluxo.spec.ts:117-118`: `for (const c of controles) xs.push((await caixa(c)).x)` e `expect(xs, JSON.stringify(xs)).toEqual([...xs].sort((a, b) => a - b))`, sobre `controles` = Voltar, `Publicado v2`, aba Lista, Simular, Salvar rascunho, Publicar, Mais (`:108-109`); centros `:114` ≤ 2; `Cancelar` ausente `:119`; presença no vitest `paginaDoFluxo.test.tsx:182-192` | PASS |

Observação (não reprova): a aba `Canvas` não está na lista de `controles`; a ordem entre Lista e Simular a cobre indiretamente (Canvas fica entre as duas, no mesmo `Alternador`), e o mutante F10b abaixo mexe nessa vizinhança. Nenhum check novo é necessário.

### Faults injected (round 2)

Todas na árvore real, em `web/src/administracao/EdicaoDoFluxo.tsx`, revertidas com `git checkout -- <arquivo>`; `git status --porcelain` depois só mostra os `demo-live-*.png` não rastreados anteriores.

| Mutation | Location | Killed |
| --- | --- | --- |
| F5b-r2.a Descartar volta à lista sem aba (`depois: () => navegar(lista)`) | `EdicaoDoFluxo.tsx:269` | yes - `avisos ao descartar`: `Unable to find role="tab" and name "Fluxos"` (1 failed) |
| F5b-r2.b texto do aviso trocado para `Descartado.` | `EdicaoDoFluxo.tsx:269` | yes - `Unable to find an element with the text: Rascunho descartado.` |
| F5b-r2.c os dois juntos (pedido pelo brief) | `EdicaoDoFluxo.tsx:269` | yes - falhou no aviso, 1 failed |
| F10b `Badge` do estado movido para depois do `Alternador` (dentro de `BarraDoEditor`) | `EdicaoDoFluxo.tsx:179-182` | yes - `barra em uma linha`: `expect(xs).toEqual(sorted)`, `Error: [280,490.59,364.48,1016.4,1109.59,1256.73,1351.03]` (o 2º x, 490, é maior que o 3º, 364) |

Os mutantes sobreviventes da rodada 1 (F5b, F10) agora estão mortos; F9 e F9b continuam equivalentes, como anotado.

### C21 (carried, NÃO RODOU)

`crapper` continua bloqueado por Application Control neste computador (round 1: `Program 'crapper.exe' failed to run ... Uma política de Controle de Aplicativo bloqueou este arquivo`); não tentei de novo. O AD-044 em `.specs/STATE.md` aceita essa lacuna só para `fluxos-atendimento` e `base-fluxos`; **nenhum AD cobre `editor-fluxo-integrado` ainda**. C21 fica `NÃO RODOU` (Result FAIL na tabela), sem ser promovido a PASS. Resolver: rodar `crapper` noutro computador, ou o dono do projeto estender o AD-044 (ou criar um AD novo) a esta feature.

### Resumo da rodada 2

C1-C20: 20 de 20 PASS (C7 e C14 agora PASS; os outros carried from 8579e27). C21: não rodou. Coverage: 0 membros sem prova. Test policy: 3 de 3 atendidas. Faults: 4 injetadas na rodada 2, 4 mortas. Gate desta rodada: vitest 5 passed, playwright 1 passed (escopo C7/C14; o gate completo da rodada 1 - 602 vitest, 165+5 playwright - é carried from 8579e27, e a rodada 2 só mexeu em 2 arquivos de teste e no checks.md).

Fechamento: `Verdict` permanece FAIL só por C21.

## Round 3 (scoped: C22-C25 and the mechanism change)

**Base da rodada**: a381a04 (rodada 2) .. 5eaf9e8 (`feat(web): guard every exit of the flow editor with a data router and save the draft with Ctrl+S`). Escopo do diff: `plan.md` (AC 18-20, Landing door 2), `checks.md` (C22-C25), `STATE.md` (AD-047), `EdicaoDoFluxo.tsx`, `main.tsx`, `test/util.tsx`, `paginaDoFluxo.test.tsx`, `editor-fluxo.spec.ts`, `casca.spec.ts`. Seções carried from rodadas anteriores dizem de onde vêm; as tabelas Checks/Coverage/Test policy/Faults acima foram atualizadas com as linhas desta rodada.

### Provas (HEAD 5eaf9e8; dev server Vite em 5173, parado no fim)

- Vitest `paginaDoFluxo.test.tsx` inteiro, verbose: 17 passed, cada nome aparece (inclui `barra lateral com alterações`, `Ctrl+S salva o rascunho`, `roteador de dados`, `sair sem salvar`, `sair sem alterações`, `fechar a aba com alterações`). Contagem > 0 em todos.
- Playwright `editor-fluxo.spec.ts`: 11 passed (inclui `voltar do navegador`, `voltar do navegador com alterações`, `Ctrl+S com cadeia inválida`).
- Vitest inteiro: 65 files, 606 passed, 0 failed. `npm --prefix web run build`: exit 0.
- Playwright `fluxos arranjo identidade celular ux casca chat editor-fluxo`: 219 passed, 5 failed na primeira execução (exatamente as 5 de ambiente: `identidade.spec.ts:36`, `:304`, `:1281`, `arranjo.spec.ts:1189`, `ux.spec.ts:472`). Numa segunda execução completa `identidade.spec.ts:1154` (campos do form da resposta, borda de 3:1) falhou além das 5; rodado sozinho 3 vezes: 3 passed. Classificado como instável sob carga, não causado por esta feature (não toca fluxos). `casca.spec.ts` 'borda da caixa de envio com 3:1' passa. Não rodei `anexos.spec.ts`, `plataforma.spec.ts`, `push.spec.ts` (precisam do app compilado ou da API real). Não montei worktree da base para reprovar as 5 de ambiente: classificação pela lista dada.

### Veredito por check

| Check | Result | Nota |
| --- | --- | --- |
| C5 | PASS | `voltar do navegador` 1 passed com `useBlocker` (sem alterações não bloqueia); mutante a2/d não o torna vacuoso (d o derruba) |
| C9 | PASS | `sair sem salvar` passa; mutante a2 o derruba (trilha Fluxos/Cadastros e Voltar) |
| C10 | PASS | `sair sem alterações` passa (inclui após Salvar rascunho) |
| C11 | PASS | `fechar a aba com alterações` passa; `:174-178` inalterado |
| C19 | PASS (com ressalva de ambiente) | Vitest 606, build 0, Playwright só as falhas de ambiente conhecidas (+1 instável que passa isolada). `git diff a381a04..HEAD` nos testes existentes: `casca.spec.ts` (+/-1 linha, corrige a medição do compositor, não enfraquece: mede a borda real) |
| C22 | PASS | asserção de diálogo, Continuar e Sair com destino; mutante a2 morto |
| C23 | PASS | mutantes a2 e d mortos; o ramo "sem alterações sai direto" está no mesmo teste |
| C24 | **FAIL** | metade Vitest (válida, ⌘+S, gravando, `defaultPrevented`) prova e mutante b morre. Metade Playwright (cadeia inválida) é vazia: a rota `**/api/admin/fluxos/7/rascunho` é registrada antes de `preparar()`, `simularApi` (`**/api/**`) a sombreia, `gravacoes` fica 0 mesmo com a cadeia válida (verificado: spec temporário, apagado). Mutante c sobrevive. Também não há asserção de `defaultPrevented` na cadeia inválida (AC 20 pede) |
| C25 | PASS | prova textual; mutante d morto; o comportamento real vem de C22/C23 |

### Emenda de C24 (prova da cadeia inválida movida para o Playwright)

Mover a prova para o navegador é defensável: criar o nó solto exige o canvas (`@xyflow`) e `dragTo`, que o jsdom não faz. Mas a emenda **enfraquece** o check na prática: o texto do check promete "nada é enviado e `defaultPrevented` verdadeiro" para a cadeia inválida e a prova movida (a) conta chamadas por uma rota que nunca é atingida, (b) não lê `defaultPrevented`. Sem a emenda um teste Vitest com um nó solto de verdade não existe; a única prova do ramo `!valida` hoje não pega o mutante c. Conserto sugerido ao builder: registrar o `page.route` depois de `noCanvas` (ou usar `page.on('request')`), provar a rota com um Ctrl+S de cadeia válida que dá `gravacoes === 1` no mesmo spec, e disparar o `keydown` por `page.evaluate` para ler `defaultPrevented`.

### Mutante a1 (sobrevivente): `!ignorarSaida.current`

Sem ele, `Descartar rascunho` depois de editar a tela (Descartar fica ligado com rascunho e sem gravação, mesmo com alterações) faria o `useBlocker` abrir `Sair sem salvar?` depois de o DELETE ter dado certo (raciocinado pelo código, não demonstrado no navegador). Publicar não depende dele (Publicar só liga com `salvo`, que implica `alterado === false`). O AC 7 diz que Descartar volta à lista e o plano de AC 18-20 e a Landing door 2 afirmam que Descartar/Publicar saem sem perguntar; nenhum check e nenhum teste exercita Descartar com `alterado`. Falta um caso Vitest (em `paginaDoFluxo.test.tsx`: editar, Mais › Descartar, esperar `Rascunho descartado.` e a aba Fluxos sem diálogo).

### C21

`crapper` segue bloqueado por Application Control (AD-044); não tentei de novo. Nenhum AD cobre `editor-fluxo-integrado`: C21 fica NÃO RODOU (FAIL na tabela), nunca PASS. O AD-047 desta emenda trata do roteador, não do `crapper`.

### Resumo da rodada 3

C1-C20 e C22, C23, C25: PASS (C1-C4, C6-C8, C12-C13, C15-C18, C20 carried; C5, C9-C11, C19, C22, C23, C25 verificados em 5eaf9e8). C24: FAIL. C21: não rodou. Faults: 5 injetadas, 3 mortas (a2, b, d), 2 sobreviveram (a1, c). Gate: Vitest 606 passed; Playwright 219 passed + 5 de ambiente. Verdict: FAIL.
