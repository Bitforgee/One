# integracoes-submenu verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 2721edd..HEAD
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Todas as provas rodaram em `HEAD` (b22f148) e passaram, mas um mutante sobreviveu: o destaque do item ativo da coluna (`data-[state=active]:bg-accent`), que o Intent e a tela de Cadastros fixam, não tem check nem prova.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/src/administracao/Cadastros.tsx` 68-75 (cabeçalho `h2` + frase) e 283-345 (`Navegacao`, `NativeSelect`, `Tabs orientation="vertical"`) | yes - lido neste round | none: `Integracoes.tsx:14-41` copia coluna `w-56`, `@4xl/main`, seletor `w-full min-w-0`, `h2 m-0 font-heading text-xl font-semibold` + `p m-0 text-sm text-muted-foreground`; diferenças deliberadas e listadas em Out of scope (sem contagem, `justify-start`, sem `replace`, painel com `max-w`) | item ativo com fundo de destaque (`Integracoes.tsx:18`, Intent "item ativo com fundo de destaque"): nenhum check ou asserção lê isso; e o corte de 896 px (`@4xl/main`): só se provam 844 e 1440, nunca 895/896 |

Arranjo enumerado por tela: 2 regiões (coluna | painel) a partir de 896 px, 1 região com seletor acima do painel abaixo disso. Coluna com 2 itens em ordem Moodle, MCP (C1). Seletor com 2 opções (C5). Painel = `h2` + frase + conteúdo (C2). Coberto por check: orientação, ordem, contagem, largura de 224, posição à esquerda, seletor oculto/visível, título e frase. Sem check: destaque do item ativo e o limiar de 896.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | coluna vertical, 2 abas, 224 px, à esquerda | `npm --prefix web test -- --run src/administracao/integracoes.test.tsx src/administracao/mcp.test.tsx` exit 0 (15 passed, `coluna lateral` ✓); `npm --prefix web run e2e -- e2e/integracoes.spec.ts --workers=1` exit 0 (4 passed, `coluna a 1440` ✓) | `integracoes.test.tsx:32` `expect(lista).toHaveAttribute('aria-orientation', 'vertical')`, `:33` `expect(nomesDasAbas()).toEqual(['Moodle', 'MCP'])`; `e2e/integracoes.spec.ts:31` `expect(coluna.width).toBeCloseTo(224, 0)`, `:33` `expect(coluna.x + coluna.width).toBeLessThanOrEqual(painel.x)` | PASS |
| C2 | `h2` + frase abaixo, sem repetir | idem (`cabeçalho do painel` ✓) | `integracoes.test.tsx:43` `expect(moodle.nextElementSibling).toHaveTextContent(/^Alunos que entram ...)`, `:44` `.toHaveLength(1)` (e o mesmo para MCP logo abaixo) | PASS |
| C3 | `?aba=` (4 valores), clique, ArrowDown | idem (`item pelo endereço e pelo teclado` ✓) | `integracoes.test.tsx` bloco `item pelo endereço e pelo teclado`: `expect(screen.getByRole('tab', { name: esperado }), caminho).toHaveAttribute('aria-selected', 'true')` nos 4 caminhos; `data-aba-ativa` = `mcp` após o clique; após `{ArrowDown}` `findByRole('heading', { name: 'MCP', level: 2 })`; URL real em `e2e/integracoes.spec.ts:40` `toHaveURL(/\/univag\/integracoes\?aba=mcp$/)` | PASS |
| C4 | painéis como eram | idem (`estados da aba Moodle` ✓, `salva e mostra o erro do campo` ✓, `mcp.test.tsx` 8 ✓) | `integracoes.test.tsx:91` e `:113` (testes existentes, não editados: o diff só remove o teste `abas`); `mcp.test.tsx` inteiro verde | PASS |
| C5 | seletor `Integração` abaixo de 896, 3 situações, 44 px no toque | `integracoes.test.tsx` `seletor sem coluna` ✓; e2e `celular › seletor em pé 360×780`, `deitado 844×390`, `teclado aberto 360×400` ✓ (4 passed) | unit: `expect(within(seletor).getAllByRole('option').map(o => o.textContent)).toEqual(['Moodle','MCP'])`, `expect(seletor).toHaveValue('mcp')`; e2e `spec.ts:56-60` `expect((await seletor.boundingBox())!.height).toBeGreaterThanOrEqual(44)`, `semRolagemHorizontal` `toBe(true)` | PASS |
| C6 | suíte e build passam; só `abas` editado | `npm --prefix web test -- --run` exit 0, 686 passed; `npm --prefix web run build` exit 0 (`built`, PWA files generated); `git diff 2721edd..HEAD -- integracoes.test.tsx` | o único `it` removido é `abas`; `item no menu` (`integracoes.test.tsx:148`) e os demais sem hunk; `git diff --stat` 53+/9- | PASS |
| C7 | `dryer` sem candidato 0.8 | `cd web; dryer` exit 0 | só pares `DUPLICATE score=0.85` dentro de `src/ui/*` (spinner/table/textarea, cópias shadcn); `Select-String` por `Integra`, `AbaIntegracao` e por caminho fora de `src/ui/` não acha nada; `.metrics/dry.edn` e AD-018 tratam `src/ui` como cópia do shadcn | PASS |

Nota: C1 e C5 afirmam o 44 px e as larguras no navegador (e2e), como o próprio checks.md exige. O servidor do e2e (:8080) foi reconstruído a partir de `HEAD` (`docker compose up -d --build api`) depois das injeções, e as 4 provas e2e voltaram a passar.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| valores de `?aba=` (4) | `Integracoes.tsx:12` (`Abas` + fallback) | ausente, `moodle`, `mcp`, desconhecido: `integracoes.test.tsx` `item pelo endereço e pelo teclado` | - |
| larguras (4) | Intent + `@4xl/main` em `Integracoes.tsx:16,31,32` | 1440 `spec.ts:23`; 360×780, 844×390, 360×400 `spec.ts:51-67` | limiar de 896 px (`@4xl`) nunca exercido em 895/896; o Intent o nomeia ("a partir de 896 px") |
| estados do painel Moodle (4) | `integracoes.test.tsx:91,113` | carregando, erro, vazio, erro de campo | - |
| papéis do item no menu (4) | `integracoes.test.tsx:148-149` | 4 papéis | - |
| itens da coluna (2) | `Integracoes.tsx:9-10` | `integracoes.test.tsx:33`, `spec.ts:28` | - |
| partes do painel MCP (4) | `mcp.test.tsx` | 8 testes verdes | - |
| aparência do item da coluna (ativo / inativo), do Intent e de Cadastros | `Integracoes.tsx:18` `data-[state=active]:bg-accent` | só `aria-selected` (`integracoes.test.tsx:34-35`); nenhuma leitura de fundo | destaque do item ativo (nenhuma prova) |

## Test policy rows

Nenhuma linha em `checks.md` (`## Test policy` diz "Nenhuma linha nova"); vale a convenção do repositório (teste de tela com `api()` simulada; medidas no navegador). Cumprida.

## Faults injected

| Mutation | Location | Killed |
| --- | --- | --- |
| remove `orientation="vertical"` | `Integracoes.tsx:31` | yes - `coluna lateral`, `item pelo endereço e pelo teclado` falham |
| `aria-label="Integração"` -> `"Escolha"` | `Integracoes.tsx:33` | yes - `seletor sem coluna` falha |
| fallback `'moodle'` -> `'mcp'` (substituição de `: 'moodle'`, atinge o fallback e outros pontos, então a morte é ampla: 6 testes falham) | `Integracoes.tsx:12` | yes |
| remove o `h2` | `AbaIntegracao.tsx` | yes - `cabeçalho do painel`, `item pelo endereço e pelo teclado` falham |
| `onValueChange={escolher}` -> no-op (cobre clique e ArrowDown) | `Integracoes.tsx:31` | yes - `cabeçalho do painel`, `item pelo endereço e pelo teclado` falham |
| `w-56` -> `w-48` | `Integracoes.tsx:16` | yes - e2e `coluna a 1440`: esperado 224, recebido 192 |
| remove `pointer-coarse:h-11` | `ui/native-select.tsx:19` | yes - e2e `seletor deitado 844×390`: esperado >= 44, recebido 36 (2 falhas e 2 passes no total; o 360×780 segue por `max-md:h-11`) |
| remove `data-[state=active]:bg-accent data-[state=active]:shadow-none` | `Integracoes.tsx:18` | **no** - 7 passed no unit; nenhuma asserção e2e lê fundo (`Select-String background|accent|toHaveCSS` em `spec.ts` = vazio) |

Árvore real restaurada com `git checkout -- <arquivo>` por arquivo; `git status --porcelain` vazio ao final (igual ao baseline). Os dois testes e2e das injeções de largura e de altura exigiram reconstruir a imagem da API; ela foi reconstruída de novo a partir de `HEAD` depois.

## Gate

`npm --prefix web test -- --run` - 686 passed, 0 failed; `npm --prefix web run build` - exit 0; `npm --prefix web run e2e -- e2e/integracoes.spec.ts --workers=1` - 4 passed, 0 failed; `cd web; dryer` - exit 0, só `src/ui`.

## Ranked gaps

1. Mutante sobrevivente: remover o destaque do item ativo (`data-[state=active]:bg-accent`) não quebra nenhuma prova; o Intent e Cadastros fixam "item ativo com fundo de destaque" e C1 só confere `aria-selected` - C1 - `Integracoes.tsx:18`. Falta check com prova no navegador (por exemplo `toHaveCSS('background-color', ...)` do token `accent` no item selecionado e não no outro).
2. Lacuna de precisão: o Intent diz "a partir de 896 px" mas as provas só usam 844 e 1440; trocar `@4xl/main` por `@5xl/main` ou outro limiar entre os dois não seria pego pelo unit e só por acaso pelo e2e - C1/C5 - `Integracoes.tsx:16,31,32`. Falta prova em 895 e 896 px.
3. Menor: a troca de item por clique tem a URL provada só a 1440 no e2e (`spec.ts:40`); o unit prova `data-aba-ativa`, não a URL. Aceitável, sem ação.
