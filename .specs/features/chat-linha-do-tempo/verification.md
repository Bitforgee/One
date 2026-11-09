# Chat com linha do tempo única e compositor alinhado verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: f07362b..2fe7066
**Round**: 2 - scoped (C2)
**Verifier**: independent sub-agent (author != verifier)

Após a rodada 2: 22 checks com PASS (C1-C22, incluindo C2). C23 segue NOT RUN: o dryer cumpriu, o crapper está bloqueado (AD-044), aceito pelo AD-044 mas nunca PASS. O veredito continua FAIL porque o gate recusa PASS com check sem PASS; o risco aceito do C23 fecha por AD, conforme AGENTS.md.

Rodada 1 (carregada de 9e159af): C2 FAIL, C23 NOT RUN, 21 PASS. Rodada 2 reverificou só C2; C1, C3-C22 estão `carried from 9e159af` (o diff 9e159af..HEAD só toca `web/e2e/chat.spec.ts`).

Emendas aprovadas pelo usuário em 08/11, aceitas como emendas e não como falhas: C4 perdeu a cláusula "o y de Falar com atendente não muda"; C19 passou a ser medido em 1440 px.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `demo-live-8-aluna-resposta.png` (1872x993, estado antes) | yes - imagem aberta. Textos "Falar com atendente", "Encerrar", "Escreva sua dúvida", "Enviar" iguais aos dos checks; mostra o clipe fora do campo e o campo solto, que é o defeito 1 do plano | none | - |
| `demo-live-4-chamado.png` (1280x800, estado antes) | yes - imagem aberta. Títulos "Conversa com o assistente" e "Atendimento" iguais; a conversa ocupa a primeira tela, que é o defeito 2 | none | - |
| GLPI 10, glpi-project.org/en/glpi-interface-new-version | yes - página lida: a timeline vai do mais antigo ao mais novo, de cima para baixo, com a resposta nova abaixo da última, e o painel lateral traz os dados do chamado | none | - |
| Zendesk, "Before and after activating the Agent Workspace" | no - não aberto; só o resumo do plano (comentários mais novos embaixo, nota em fundo amarelo) | none found | nota interna em fundo de aviso coberta por C16 (`bg-warning-subtle`) |

Arranjo por tela: Assistente com uma caixa que contém clipe, campo e Enviar, com os botões de ação acima dela e a ajuda abaixo (C1-C6). Detalhe com uma só `ol` sob o `h2` "Atendimento", transcrição recolhida e coluna da direita com Etapa e Ações (C8, C14, C17). Todos têm check.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | clipe e Enviar dentro da caixa, caixa com a largura do log (768/1280/1872) | `playwright chat.spec.ts -g "compositor numa caixa"` - passou | `web/e2e/chat.spec.ts:30-34` `expect(b.x).toBeGreaterThanOrEqual(c.x)` ... `perto(c.width, (await caixa(page.locator('[role="log"]'))).width, 1, ...)` | PASS |
| C2 | esquerda de Falar e direita de Enviar a ≤ 1 px da caixa | Rodada 2 (verified at 2fe7066): `playwright chat.spec.ts -g "bordas alinhadas"` - 1 passou; mutante `mr-1.5` no Enviar faz falhar (ver Round 2) | `web/e2e/chat.spec.ts:46` `perto(falar.x, c.x, 1, ...)`; `:47` `perto(enviar.x + enviar.width, c.x + c.width, 1, ...)` (tolerância agora 1 px). Rodada 1 era FAIL com 8 px | PASS |
| C3 | base do clipe e do Enviar a ≤ 2 px da base do campo com 10 linhas | `playwright chat.spec.ts -g "campo alto"` - passou | `web/e2e/chat.spec.ts:60` `perto(b.y + b.height, base, 2, ...)` | PASS |
| C4 | selo dentro da caixa e acima do campo, ajuda abaixo (emenda 08/11) | `playwright chat.spec.ts -g "selos dentro da caixa"` - passou | `web/e2e/chat.spec.ts:70-74` `expect(selo.y + selo.height).toBeLessThanOrEqual(campo.y + 1)`; `expect(ajuda.y).toBeGreaterThanOrEqual(c.y + c.height - 1)` | PASS |
| C5 | 360 px sem rolagem lateral, botões com 44 px | `playwright chat.spec.ts -g "360 px sem rolagem lateral"` - passou | `web/e2e/chat.spec.ts:82-83` `.toEqual([360, 360])`; `toBeGreaterThanOrEqual(44)` | PASS |
| C6 | caixa a ≤ 16 px do fim da janela, sugestões acima | `playwright chat.spec.ts -g "caixa no fim da tela vazia"` - passou | `web/e2e/chat.spec.ts:90-92` `expect(800 - (c.y + c.height)).toBeLessThanOrEqual(16)`; `pergunta.y + pergunta.height <= c.y` | PASS |
| C7 | no limite não há caixa, Falar com atendente fica com a variante principal | `vitest compositor.test.tsx -t "limite de 10 mensagens"` - 1 teste passou | `web/src/assistente/compositor.test.tsx:29` `expect(screen.queryByTestId('compositor')).not.toBeInTheDocument()`; `:31-32` `toBeVisible()`, `toHaveClass('bg-primary')` | PASS |
| C8 | um `h2` e uma `ol`, ordem cronológica, sem "Histórico" nem `eventos` | `vitest linhaDoTempo.test.tsx -t "mensagens e eventos em ordem cronológica"` - passou | `web/src/chamados/linhaDoTempo.test.tsx:38-44` `toEqual([stringContaining('Sistema abriu a solicitação'), ...5 itens])`; `:45-48` | PASS |
| C9 | evento em `li` centrada, sem balão, data e frase | `-t "evento em linha centrada sem balão"` - passou | `linhaDoTempo.test.tsx:54-56` `toHaveTextContent('02/11/2026 08:05 · Carla assumiu a solicitação')`, `toHaveClass('text-center')`, `querySelector('.is-user, .is-assistant')` nulo | PASS |
| C10 | empate: evento antes | `-t "empate de horário"` - passou | `linhaDoTempo.test.tsx:63-64` `expect(lista[0]).toContain('Carla assumiu a solicitação')` | PASS |
| C11 | aluno sem eventos nem filtro | `-t "aluno sem eventos nem filtro"` - passou | `linhaDoTempo.test.tsx:70-73` `toHaveLength(2)`; `queryByLabelText('Eventos')` ausente | PASS |
| C12 | vazio: texto e nenhuma `li` | `-t "sem itens"` - passou | `linhaDoTempo.test.tsx:78-79` `findByText('Nenhuma resposta ainda.')`; `queryAllByRole('listitem')` com tamanho 0 | PASS |
| C13 | filtro Eventos | `-t "filtro Eventos"` - passou | `linhaDoTempo.test.tsx:85-93` `toBeChecked()`, 4, 2, 4 itens | PASS |
| C14 | coluna da direita sem Histórico | `-t "coluna da direita sem histórico"` - passou | `linhaDoTempo.test.tsx:98-103` `findByText('Etapa 2 de 3 · ADS')`, `getByText('Ações')`, `getAllByText(/Carla assumiu a solicitação/)` com tamanho 1 | PASS |
| C15 | ação acrescenta o evento no fim sem novo GET | `-t "ação acrescenta o evento no fim"` - passou | `linhaDoTempo.test.tsx:118-120` `expect(lista.at(-1)).toContain('Carla assumiu a solicitação')`; `expect(leituras()).toBe(antesDeAssumir)` | PASS |
| C16 | nota interna na sequência com selo e `bg-warning-subtle` | `-t "nota interna na sequência"` - passou | `linhaDoTempo.test.tsx:129-133` ordem `lista[0..2]`, `getByText('Nota interna')`, `querySelector('.bg-warning-subtle')` não nulo | PASS |
| C17 | transcrição recolhida, abre e fecha | `-t "conversa com o assistente recolhida"` - passou | `linhaDoTempo.test.tsx:153-163` `aria-expanded 'false'`, `queryByText('cadê o boleto?')` ausente, depois os 4 textos presentes, depois ausente | PASS |
| C18 | formulário de resposta na janela após rolar 600 px | `playwright chat.spec.ts -g "resposta colada ao fim"` - passou | `web/e2e/chat.spec.ts:134-136` `dentro(campo)`, `dentro(Responder)`, `dentro(Enviar)` com valor `true` | PASS |
| C19 | Ações e Assumir na janela em 1440 px (emenda 08/11) | `-g "ações visíveis ao rolar"` - passou | `web/e2e/chat.spec.ts:144-145` `dentro(cartao)`, `dentro(Assumir)` com valor `true` | PASS |
| C20 | "Ir para o mais recente" com 40 itens, ausente com 2 | `-g "ir para o mais recente"` - passou | `web/e2e/chat.spec.ts:152-157` última `li` dentro da janela e acima do formulário; `:159` `toHaveCount(0)` | PASS |
| C21 | 390 px: barra `fixed`, formulário `static` | `-g "celular mantém a barra"` - passou | `web/e2e/chat.spec.ts:166` `.toBe('fixed')`; `:168` `.toBe('static')` | PASS |
| C22 | Vitest, build e specs existentes | `npx vitest run`: 64 arquivos, 589 testes, exit 0. `npm --prefix web run build`: exit 0. `playwright arranjo identidade celular`: 107 passaram, 4 falharam | As 4 falhas são `identidade.spec.ts:36`, `:304`, `:1281` e `arranjo.spec.ts:1189`. Falham no servidor de dev por esperar o app construído (fontes em `/assets/`, service worker e botão "Ativar avisos"). Não consegui reprovar na base f07362b: não há worktree com `node_modules` e a verificação por `vite preview` foi bloqueada. Por instrução do orquestrador são falhas de ambiente e não regressão: o diff de `arranjo.spec.ts` não toca o teste da linha 1189 nem o cabeçalho. `git diff f07362b..HEAD` nos testes existentes só tira asserções do bloco Histórico (`arranjo.spec.ts:167-180`, `identidade.spec.ts` C33 com o espaço de 32 px depois do Histórico, `chamado.test.tsx`, `icones.test.tsx`, `resposta.test.tsx`, `textos.test.tsx`). O resto são cliques para abrir a transcrição recolhida e `scrollTo` antes de medir o espaço de 32 px antes do formulário fixo | PASS |
| C23 | crapper < 9.99 e dryer sem candidato ≥ 0.8 | `dryer ... --threshold 0.8`: "No duplicate candidates found", exit 0. `crapper`: "Uma política de Controle de Aplicativo bloqueou este arquivo" (AD-044) | dryer cumprido. A metade do crapper NOT RUN, nunca PASS | NOT RUN |

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| larguras do compositor (3) | AC 1, AC 2 do plano | 768, 1280 e 1872 no laço de C1 e C2 (`chat.spec.ts:24`, `:40`) | - |
| larguras especiais (2) | AC 5, AC 20 | 360 C5, 390 C21 | - |
| estados do compositor (4) | AC 3, 4, 6, 7 | vazio C6, campo alto C3, com arquivo C4, no limite C7 | - |
| tipos de item (3) | AC 8, 9 | mensagem C8, evento C9, nota C16 | - |
| quem lê (2) | AC 11 | equipe C8, aluno C11 | - |
| filtro Eventos (2) | AC 13 | marcado C8/C13, desmarcado C13 | - |
| estados da sequência (3) | AC 12, 15 | vazia C12, com itens C8, com ação nova C15 | - |
| partes coladas (2) | AC 17, 18 | resposta C18, ações C19 | - |
| larguras do chamado (3) | AC 17-20 | 1280 C18/C20, 1440 C19, 390 C21 | - |
| critérios AC 1-20 | plano | cada AC tem ao menos um check, como na tabela de `checks.md`; AC 2 agora provado a 1 px (rodada 2) | - |
| Surface / Landing | plano | ambos None: sem rota nem one-way door | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide, na tela | `Conversa.tsx` (`sequencia`, filtro, `Transcricao`) | Vitest, `linhaDoTempo.test.tsx` | yes - ordem, desempate, filtro, vazio e recolhida têm teste e todos foram mortos por falha injetada |
| Arranjo | `Assistente.tsx`, `ChamadoDetalhe.tsx` | Playwright, `chat.spec.ts` | yes - rodada 2 (verified at 2fe7066): a borda direita do Enviar (AC 2) é medida com 1 px e o mutante `mr-1.5` é morto (rodada 1: no, 8 px) |
| Instrumentation | classes e ícones | nenhuma própria | yes |

## Faults injected

| Mutation | Location | Killed |
| --- | --- | --- |
| caixa do compositor com `max-w-xs` | `Assistente.tsx` (div `data-testid="compositor"`) | yes - C1: "768 largura da caixa: 320 x 480" |
| `items-end` trocado por `items-start` | `Assistente.tsx` (linha do campo e botões) | yes - C3: "base de Anexar arquivo: 629 x 793" |
| Enviar deslocado 6 px (`mr-1.5`) | `Assistente.tsx` (botão Enviar) | yes - rodada 2: C2 falha com "768 direita de Enviar: 745 x 752" (rodada 1: no, tolerância 8 px) |
| comparador de data invertido | `Conversa.tsx` `sequencia()` | yes - C8 falhou |
| desempate invertido | `Conversa.tsx` `sequencia()` | yes - C10 falhou |
| filtro Eventos invertido (`!comEventos`) | `Conversa.tsx` `sequencia()` | yes - C13 falhou |
| transcrição aberta por padrão (`useState(true)`) | `Conversa.tsx` `Transcricao` | yes - C17: `aria-expanded` "true" |
| sem `lg:sticky lg:bottom-0` | `ChamadoDetalhe.tsx` `Responder` | yes - C18: "formulário de resposta na janela" |
| `scrollIntoView` no primeiro item | `Conversa.tsx` botão "Ir para o mais recente" | yes - C20: "última li na janela" |
| caixa sempre renderizada, mesmo no limite | `Assistente.tsx` `Entrada` | yes - C7 falhou |

Cada falha foi revertida com `git checkout -- <arquivo>`. `git status --porcelain` ficou sem arquivos modificados, só os `demo-live-*.png` já não rastreados. O `sticky` do cartão de ações (C19) e `position: static` de C21 não receberam falha própria.

## Gate

`npx vitest run` - 589 passed, 0 failed. `playwright chat.spec.ts` - 10 passed. `playwright arranjo identidade celular` - 107 passed, 4 falhas de ambiente (C22).

## Round 2 (scoped: C2)

Escopo: o diff do conserto e todo veredito que não foi PASS (C2, C23). O resto vem de 9e159af (`carried from 9e159af`). C23 não mudou: o crapper segue bloqueado (AD-044), NOT RUN.

`git diff 9e159af..HEAD --stat` (HEAD = 2fe7066, commits 6c4165b e 2fe7066):

```
 web/e2e/chat.spec.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

Só `chat.spec.ts` mudou; nenhum código de produção. A linha 47 passou de tolerância 8 (com comentário "recuo interno de 6 px") para 1:

```
-      perto(enviar.x + enviar.width, c.x + c.width, 8, `${largura} direita de Enviar`) // o recuo interno da caixa é de 6 px
+      perto(enviar.x + enviar.width, c.x + c.width, 1, `${largura} direita de Enviar`)
```

Prova em HEAD (dev server `npm run dev`, porta 5173, `E2E_URL=http://localhost:5173`):

```
$ npx playwright test chat.spec.ts -g "bordas alinhadas"
  ✓  1 [chromium] › e2e\chat.spec.ts:39:3 › compositor do aluno › bordas alinhadas (879ms)
  1 passed (1.3s)
```

Mutante: `className="h-11 shrink-0"` -> `className="h-11 shrink-0 mr-1.5"` no botão `type="submit"` (Enviar) de `web/src/assistente/Assistente.tsx:328`:

```
  ✘  1 [chromium] › e2e\chat.spec.ts:39:3 › compositor do aluno › bordas alinhadas (416ms)
    Error: 768 direita de Enviar: 745 x 752
    Expected: <= 1
    Received:    7
    >  9 | const perto = (...) => expect(Math.abs(a - b), ...).toBeLessThanOrEqual(tolerancia)
        at D:\one-system\web\e2e\chat.spec.ts:46:7
  1 failed
```

Mutante morto. Revertido com `git checkout -- src/assistente/Assistente.tsx`; `git status --porcelain src` vazio. Dev server parado (localhost:5173 sem resposta). Observação: o rastreio da linha no stack diz `:46`, mas a asserção que falha é a da linha 47 (mensagem "direita de Enviar"); a numeração do stack aponta o início da instrução dentro do laço.

Resultado da rodada: C2 PASS. Resumo final: PASS em C1-C22; C23 NOT RUN (dryer ok, crapper bloqueado, AD-044).
