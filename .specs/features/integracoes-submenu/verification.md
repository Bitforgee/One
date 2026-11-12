# integracoes-submenu verification

**Verdict**: PASS
**Profile**: ui
**Diff range**: 2721edd..HEAD (HEAD = 21c4e24)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier; did not build the feature nor write round 1)

Todas as provas dos 7 checks rodaram de novo em `HEAD` (21c4e24) e passaram. Os 12 mutantes injetados à mão morreram, inclusive o que sobreviveu na rodada 1. O código de produção não mudou desde b22f148 (`git diff --stat 2721edd..HEAD -- web/src web/e2e` mostra só `integracoes.spec.ts`, `AbaIntegracao.tsx`, `Integracoes.tsx` e `integracoes.test.tsx`; o commit 12a244c só toca `web/e2e/integracoes.spec.ts`).

## Round 1

FAIL em b22f148: o mutante "remove `data-[state=active]:bg-accent`" (`Integracoes.tsx:18`) sobreviveu (nenhuma prova lia o fundo do item ativo) e o corte de 896 px (`@4xl/main`) só era exercido em 844 e 1440 px. Corrigido em 12a244c, que só acrescentou dois testes e2e: `item ativo com fundo de destaque` (`web/e2e/integracoes.spec.ts:44`) e `limite de 896 px de largura útil` (`:57`). Nesta rodada: provas, faults e cobertura do que o commit tocou foram refeitos (`verified at 21c4e24`); o restante (Step 1 sobre a tela, nada na interface mudou) vem de `carried from b22f148`.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/src/administracao/Cadastros.tsx` 68-75 e 283-345 (cabeçalho `h2` + frase, `Navegacao`, `NativeSelect`, `Tabs orientation="vertical"`) - carried from b22f148; `Integracoes.tsx` relido em 21c4e24 (idêntico a b22f148) | yes | none: `Integracoes.tsx:14-41` mantém coluna `w-56`, `@4xl/main`, seletor `w-full min-w-0`; diferenças deliberadas estão em Out of scope | - |

Os dois itens sem check da rodada 1 agora têm prova: destaque do item ativo em `spec.ts:44-55`, limiar de 896 px em `spec.ts:57-69`.

Arranjo (carried from b22f148, a interface não mudou): 2 regiões (coluna | painel) a partir de 896 px, 1 região com seletor acima do painel abaixo disso; coluna com 2 itens Moodle, MCP; seletor com 2 opções; painel = `h2` + frase + conteúdo.

Observação sobre o checks.md (congelado): C1 diz "item ativo com fundo de destaque" só no Intent, não na linha do check; a prova nova cobre a afirmação do Intent mesmo assim. Não é contradição, é imprecisão do texto do check; sem ação.

## Checks

Provas (verified at 21c4e24): `npm --prefix web test -- --run` exit 0 (72 arquivos, 686 passed); `npm --prefix web test -- --run src/administracao/integracoes.test.tsx src/administracao/mcp.test.tsx --reporter=verbose` exit 0 (15 passed); `npm --prefix web run build` exit 0 (`files generated ../One.Api/wwwroot/sw.js`); `docker compose up -d --build api` e depois `npm --prefix web run e2e -- e2e/integracoes.spec.ts --workers=1`: 6 passed, cada teste listado individualmente (`coluna a 1440`, `item ativo com fundo de destaque`, `limite de 896 px de largura útil`, `seletor em pé 360×780`, `seletor deitado 844×390`, `teclado aberto 360×400`); `cd web; dryer` exit 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `tablist` vertical, 2 abas Moodle/MCP, 224 px, à esquerda do painel, sem abas acima | unit `coluna lateral` ✓ (verbose); e2e `coluna a 1440` ✓ | `integracoes.test.tsx:32` `expect(lista).toHaveAttribute('aria-orientation', 'vertical')`, `:33` `expect(nomesDasAbas()).toEqual(['Moodle', 'MCP'])`; `e2e/integracoes.spec.ts:31` `expect(coluna.width).toBeCloseTo(224, 0)`, `:33` `expect(coluna.x + coluna.width).toBeLessThanOrEqual(painel.x)`; destaque do ativo (Intent): `spec.ts:50` `expect.poll(() => fundo('Moodle')).toBe(destaque)`, `:51` `fundo('MCP')).toBe(transparente)`, `:53-54` idem após clicar em MCP | PASS |
| C2 | `h2` com o nome e a frase logo abaixo, sem repetir | unit `cabeçalho do painel` ✓ | `integracoes.test.tsx:43` `expect(moodle.nextElementSibling).toHaveTextContent(/^Alunos que entram ...senha\./)`, `:44` `.toHaveLength(1)`; `:47-48` o mesmo para MCP | PASS |
| C3 | `?aba=` (ausente, moodle, mcp, desconhecido), clique, ArrowDown | unit `item pelo endereço e pelo teclado` ✓; e2e URL | `integracoes.test.tsx:61` `expect(screen.getByRole('tab', { name: esperado }), caminho).toHaveAttribute('aria-selected', 'true')` nos 4 caminhos; `:70` `data-aba-ativa` `toBe('mcp')`; `:74` `{ArrowDown}` e `:76` `MCP ... aria-selected true`; `spec.ts:40` `toHaveURL(/\/univag\/integracoes\?aba=mcp$/)` | PASS |
| C4 | painéis como eram (Moodle: esqueleto, erro, vazio, erro de campo; MCP completo) | unit `estados da aba Moodle` ✓, `salva e mostra o erro do campo` ✓, `mcp.test.tsx` (8) ✓ | `integracoes.test.tsx:108` `expect(await screen.findByLabelText(rotulo)).toHaveValue('')` (testes em `:91` e `:113`, não editados: o diff só remove `abas`); `mcp.test.tsx` inteiro verde | PASS |
| C5 | abaixo de 896 px: seletor `Integração`, 3 situações, sem rolagem horizontal, 44 px no toque | unit `seletor sem coluna` ✓; e2e `limite de 896 px`, `seletor em pé`, `seletor deitado`, `teclado aberto` ✓ | `integracoes.test.tsx:85` `expect(seletor).toHaveValue('moodle')`, `:88-89` `data-aba-ativa` `toBe('mcp')` e `toHaveValue('mcp')`; `spec.ts:85` `expect((await seletor.boundingBox())!.height).toBeGreaterThanOrEqual(44)`, `:86` `semRolagemHorizontal ... toBe(true)`, `:88` `toHaveURL(...?aba=mcp$/)`; teclado `:100-101` e `:105-106` `<= 400`; limiar `spec.ts:62` `expect(largura).toBe(895)` + `:63-64` seletor visível/tablist oculta, `:66` `>= 896` + `:67-68` seletor oculto/tablist visível | PASS |
| C6 | suíte e build passam; só `abas` editado | `npm --prefix web test -- --run` 686 passed; build exit 0; `git diff 2721edd..HEAD -- web/src/administracao/integracoes.test.tsx` | as únicas linhas `-` são o `it('abas'...)` e o seu corpo (`for` dos 3 caminhos, `findByLabelText`, `getAllByRole('heading')`, `nomesDasAbas`, `aria-selected` do Moodle, os dois `/^MCP/`); `item no menu` (`:148`) sem hunk | PASS |
| C7 | `dryer` sem candidato a 0.8 | `cd web; dryer` exit 0 | 1488 linhas de arquivo em candidatos, 0 fora de `src/ui/` (filtro `^\s+src/` sem `src/ui/` = 0); nenhum acerto para `Integra`/`AbaIntegracao`; `src/ui` é cópia do shadcn (`.metrics/dry.edn`, AD-018) | PASS |

Aviso: a pasta `web/.metrics` e `One.Api/wwwroot` são ignoradas pelo git (`git status --porcelain` vazio após dryer e build).

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| valores de `?aba=` (4) | `Integracoes.tsx:12` | ausente, moodle, mcp, desconhecido: `integracoes.test.tsx:51-61` (carried; reconfirmado verde em 21c4e24) | - |
| larguras (7) | Intent (896 px) + `@4xl/main` em `Integracoes.tsx:16,31,32` | 1440 `spec.ts:23`; 895 e 896+ `spec.ts:62,66` (viewport 1199 e 1200, largura útil medida); 360×780, 844×390, 360×400 `spec.ts:78,94` | - |
| estados do painel Moodle (4) | `integracoes.test.tsx:91,113` | carregando, erro, vazio, erro de campo | - |
| papéis do item no menu (4) | `integracoes.test.tsx:148` | 4 papéis | - |
| itens da coluna (2) | `Integracoes.tsx:9-10` | `integracoes.test.tsx:33`, `spec.ts:28` | - |
| partes do painel MCP (4) | `mcp.test.tsx` | 8 testes verdes | - |
| aparência do item da coluna (ativo, inativo) x (Moodle selecionado, MCP selecionado) (4) | `Integracoes.tsx:18` `data-[state=active]:bg-accent` | `spec.ts:50-54`: Moodle ativo = `var(--accent)`, MCP transparente; depois do clique o inverso | - |

## Test policy rows

Nenhuma linha em `checks.md` (`## Test policy`: "Nenhuma linha nova"); vale a convenção do repositório (teste de tela com `api()` simulada; medidas no navegador). Cumprida.

## Faults injected

Todas aplicadas na árvore real (o container do e2e serve o build da árvore), restauradas com `git checkout -- <arquivo>`; `git status --porcelain` vazio ao final; build e `docker compose up -d --build api` refeitos a partir de HEAD (e2e final: 6 passed).

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 remove `data-[state=active]:bg-accent ` (sobrevivente da rodada 1) | `Integracoes.tsx:18` | yes - e2e `item ativo com fundo de destaque`: esperado `oklch(0.94875 0.0075 262)`, recebido `oklch(0.989 0.003 262)` (1 failed, 5 passed) |
| F2 breakpoint `@4xl/main` -> `@3xl/main` (todas as ocorrências) | `Integracoes.tsx:16,31,32` | yes - e2e `limite de 896 px` falha (`toBeVisible` do seletor em 1199 px) e mais um teste (2 failed, 4 passed) |
| F3 breakpoint `@4xl/main` -> `@5xl/main` | `Integracoes.tsx:16,31,32` | yes - e2e falha em `toBeHidden` (esperado oculto, recebido visível; 1 failed, 5 passed) |
| F4 `w-56` -> `w-48` | `Integracoes.tsx:16` | yes - e2e `coluna a 1440`: esperado 224, recebido 192 (1 failed) |
| F5 item ativo em outra cor: `bg-accent` -> `bg-destructive` | `Integracoes.tsx:18` | yes - e2e `item ativo com fundo de destaque`: esperado `oklch(0.94875 ...)`, recebido `oklch(0.577 0.245 27.325)` (1 failed) |
| G1 remove `orientation="vertical"` | `Integracoes.tsx:31` | yes - unit `coluna lateral` e `item pelo endereço e pelo teclado` (2 failed, 5 passed) |
| G2 `aria-label="Integração"` -> `"Escolha"` | `Integracoes.tsx:33` | yes - unit `seletor sem coluna` (1 failed) |
| G3 `h2` -> `h3` no painel | `AbaIntegracao.tsx:12` | yes - unit `cabeçalho do painel` e `item pelo endereço e pelo teclado` (2 failed) |
| G4 `escolher` vira no-op (clique, teclado e seletor) | `Integracoes.tsx:29` | yes - unit `cabeçalho do painel`, `item pelo endereço e pelo teclado`, `seletor sem coluna` (3 failed, 4 passed) |

9 faults desta rodada, 9 mortos. Os 7 de rodada 1 (orientation, aria-label, fallback, h2, onValueChange, w-56, pointer-coarse:h-11) seguem cobertos por G1-G4 e F4 e pelos testes não alterados (carried from b22f148; `pointer-coarse:h-11` em `ui/native-select.tsx` não foi tocado nesta rodada).

## Gate

`npm --prefix web test -- --run` - 686 passed, 0 failed; `npm --prefix web run build` - exit 0; `npm --prefix web run e2e -- e2e/integracoes.spec.ts --workers=1` - 6 passed, 0 failed; `cd web; dryer` - exit 0, nenhum candidato fora de `src/ui`.

## Ranked gaps

1. Menor: o texto de C1 em `checks.md` não cita o fundo do item ativo (só o Intent), então a prova nova não está ligada a um check pelo nome. Congelado; sem ação.
2. Menor: o teste de limiar (`spec.ts:57`) usa viewports 1199 e 1200 e confia na medida de largura útil (`toBe(895)`); se a casca mudar o preenchimento, o teste falha e acusa, o que é o comportamento desejado.
