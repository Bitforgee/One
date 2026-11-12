# Integrações guiadas verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 1ed5445..923568f
**Round**: 4 - scoped (final; a pedido do usuário, além do limite de 3 rodadas do `verify.md`)
**Verifier**: independent sub-agent (author != verifier)

Os 25 checks passam com a prova rodada em `HEAD` (923568f). Os 7 sobreviventes da rodada 3 foram reinjetados: 5 morreram (`overflow-y-auto` do corpo do `Sheet`, `pointer-events-none`, `ms-auto`, variante de `Indisponível`, frase de recuperação) e 2 são código fora desta feature (selo de estado da tabela de tokens, `largo` do `Editor`). Das 26 falhas novas em áreas não estressadas, 18 morreram, 2 são equivalentes, 3 estão fora do escopo (linha não tocada pela feature, ou estilo sem critério) e **3 sobreviveram em código da feature**: (1) a validade escolhida no diálogo não é enviada (`dias` fixo em 90) e nenhum teste nota, porque só se envia o padrão; (2) `pendente={criar.isPending}` do `Editor` (botão desabilitado enquanto cria, evita token duplicado) não tem asserção; (3) o aviso de entrada desligada aceita uma segunda frase qualquer (o AC 9 e o C9 só proíbem `Para testar`). Nenhum defeito de comportamento foi encontrado em `HEAD`; faltam provas. Produção inalterada desde 4f3d3e4 (`git diff 4f3d3e4..HEAD --stat -- web/src One.Api` lista só `integracoes.test.tsx` e `mcp.test.tsx`).

## Round 1

FAIL em 8a93ad0: 25/25 verdes, 6 de 14 mutantes sobreviveram. Corrigidos em b321803; mortos nas rodadas seguintes.

## Round 2

FAIL em b321803: 3 de 20 mutantes novos sobreviveram (`semCancelar` no `Sheet`, `Indisponível` do Moodle, variante do selo). Corrigidos em 30ab8f5; mortos.

## Round 3

FAIL em 30ab8f5: 7 de 39 falhas sobreviveram (corpo do `Sheet` sem rolagem, `pointer-events-none`, `ms-auto`, variante de `Indisponível`, selo da tabela, frase de recuperação, `largo`). Corrigidos em 923568f (só testes e `checks.md`); a rodada 4 os reinjetou (ver abaixo).

## Binding sources

Verified at 923568f: `pesquisa.md` (P1-P6 reabertos nesta rodada) e `plan.md` (relido). A interface não mudou desde 4f3d3e4, então a enumeração por tela da rodada 3 (`Cadastros.tsx`, `Editor.tsx`, `AbaIntegracao.tsx`) segue válida (carried from 30ab8f5); os arquivos de produção foram relidos para escolher as falhas.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `pesquisa.md` P1-P6 (estado visível; ação principal + estado; sem placeholder; segredo único com cópia confirmada; campo X -> campo Y; aviso fixo com próximo passo) | yes - reaberto em 923568f | none | `Novo token` à direita (P2) agora medido em `e2e/integracoes.spec.ts:113`; corpo da revelação alcançável (P4) agora em `:195-196` e `:206-207`; a validade escolhida chegar à API (P4/AC 13) não tem asserção (N15) |
| `plan.md` AC 1-19 e Observable | yes - relido em 923568f | none | AC 13: só o padrão 90 é enviado nos testes (N15); AC 9: texto extra no aviso desligado não é barrado (N8) |
| `Editor.tsx`, `AbaIntegracao.tsx`, `Integracoes.tsx`, `Moodle.tsx`, `Mcp.tsx` | yes - relidos em 923568f | none | `pendente` do botão do diálogo (N4) |

## Checks

Saída (comandos rodados em `d:\one-system`, HEAD 923568f; container `api` reconstruído do build do HEAD antes dos e2e e de novo no fim):

- `npm --prefix web test -- --run --reporter=verbose` -> `Test Files 72 passed (72)`, `Tests 703 passed (703)`; os 32 testes das duas telas aparecem um a um com `✓` (inclui `Moodle indisponível`, `estado no cabeçalho do painel`, `revelação única`, `botão Copiado` 2422ms, `reabrir depois da revelação ou do erro começa limpo`).
- `npm --prefix web run build` -> exit 0 (`files generated ../One.Api/wwwroot/sw.js`).
- `docker compose up -d --build api` + `npm --prefix web run e2e -- e2e/integracoes.spec.ts --workers=1 --reporter=list` -> `14 passed (4.7s)`, cada um listado (`:25`, `:46`, `:59`, `:87`, `:107`, `:125`, `:145` x2, `:161`, `:173`, `:184`, `:200`, `:212`, `:230`).
- `cd web; dryer` -> exit 0; 744 linhas `DUPLICATE`, 0 fora de `src/ui/`.
- `crapper`: não rodou (bloqueado nesta máquina, AD-044); não é PASS, é não executado.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 3 estados Moodle, 3 do MCP, expirados/revogados não contam, abas `Moodle`/`MCP`, `aria-describedby` | vitest `estado de cada integração` ✓ + e2e `estado dentro de cada item da coluna` ✓ | `integracoes.test.tsx:191` `expect(nomesDasAbas()).toEqual(['Moodle', 'MCP'])`; `e2e/integracoes.spec.ts:94` `toHaveText(estado)`, `:97` `l.y >= a.y + a.height / 2` | PASS |
| C2 | carregando sem linha; `500` -> `Indisponível` no MCP e no Moodle | vitest `estado carregando e indisponível` ✓ + `Moodle indisponível` ✓ | `integracoes.test.tsx:200` `estadoDe('MCP')).toBe('Indisponível')`, `:209` `estadoDe('Moodle')).toBe('Indisponível')` | PASS |
| C3 | seletor com estado; sem sufixo ao carregar | vitest `estado no seletor` ✓ + e2e `seletor em pé` ✓ | `integracoes.test.tsx:220` `toEqual(['Moodle', 'MCP'])`, `:226` `toEqual(['Moodle · Ativo', 'MCP · 1 token ativo'])`; `e2e:151` | PASS |
| C4 | selo no cabeçalho com o mesmo texto e a variante certa | vitest `estado no cabeçalho do painel` ✓ + `Moodle indisponível` ✓ | `integracoes.test.tsx:234` `getByText('Desativado')).toHaveAttribute('data-variant', 'secondary')`, `:238` `'2 tokens ativos' ... 'default'`, `:214` `getByText('Indisponível')).toHaveAttribute('data-variant', 'secondary')` | PASS |
| C5 | estado acompanha salvar/criar/revogar sem recarregar | vitest `estado atualiza sem recarregar` ✓ | `integracoes.test.tsx:242-272` (`Ativo`, `1 token ativo`, `Sem tokens ativos`); N7 (chave de cache trocada) morreu aqui | PASS |
| C6 | 3 endereços com o campo do Moodle e cópia certa | vitest `campo do Moodle ao lado de cada endereço` ✓ | `integracoes.test.tsx:290` `expect(await navigator.clipboard.readText()).toBe(valor)`; N5 (valor trocado) morreu | PASS |
| C7 | 5 campos sem `placeholder`, dica fora do campo | vitest `sem placeholder e com dica visível` ✓ | `integracoes.test.tsx:299` `toHaveLength(5)`, `:304` `expect(campo.contains(dica), campo.id).toBe(false)` | PASS |
| C8 | aviso fixo ligado, `role="status"`, abaixo do botão | vitest `aviso fixo com a entrada ligada` ✓ + e2e `Novo token no cabeçalho e aviso…` ✓ | `integracoes.test.tsx:315` `toHaveTextContent('Para testar, abra a atividade One no Moodle com uma conta de aluno.')`; `e2e:122` `aviso.boundingBox().y >= b.y + b.height` | PASS |
| C9 | aviso desligado, sem `Para testar` | vitest `aviso fixo com a entrada desligada` ✓ | `integracoes.test.tsx:325` `queryByText(/Para testar/)).not.toBeInTheDocument()`; N8 (segunda frase qualquer) sobreviveu: ver gaps | PASS (com lacuna) |
| C10 | editar retira o aviso | vitest `aviso some ao editar` ✓ | `integracoes.test.tsx:328-341`; N6 e N8-variantes de rótulo morreram | PASS |
| C11 | `400` junto do campo, 5 valores mantidos, sem aviso | vitest `salvar com erro mantém o digitado` ✓ | `integracoes.test.tsx:351` `aria-invalid 'true'`, `:354` `querySelector('[role="status"]')).toBeNull()` | PASS |
| C12 | `Novo token` no cabeçalho, à direita, sem formulário fixo | vitest `botão Novo token e sem formulário fixo` ✓ + e2e ✓ | `mcp.test.tsx:58` `queryByRole('button', {name:'Criar token'})` ausente; `e2e:111` `botao.x > titulo.x + titulo.width`, `:113` `painel.x + painel.width - (botao.x + botao.width)).toBeLessThan(8)` | PASS |
| C13 | diálogo `Nome`, `Validade` 30/90/365 (90), `Criar token`, `Cancelar` sem API | vitest `diálogo Novo token` ✓ | `mcp.test.tsx:72` `expect(validade).toHaveValue('90')` (e a lista `toEqual(['30 dias','90 dias','365 dias'])`); N1, N2, N18 morreram | PASS |
| C14 | POST `{nome,dias:90}`, revelação com 3 valores, só `Já copiei`, token sai do DOM, reabrir limpo, frase de recuperação | vitest `revelação única` ✓ + `cria o token e mostra uma vez` ✓ + `reabrir…` ✓ | `mcp.test.tsx:91` `toEqual({ nome: 'Cursor', dias: 90 })`, `:103` `getByText('Se você não copiar, apague este token e crie outro.')`, `:107` `Cancelar` ausente, `:113` `body.textContent).not.toContain(token)`, `:156` `toHaveValue('')`; N11, N13, N19, N20 morreram | PASS |
| C15 | `Copiado` (nome `Token copiado`) por 2 s | vitest `botão Copiado` ✓ | `mcp.test.tsx:124` `toHaveTextContent('Copiado')`, `:127` ainda `Token copiado` após 1500 ms, `:128` volta a `Copiar` em até 3500 ms; N14 morreu | PASS |
| C16 | clique fora, Esc e botão do canto não fecham; `Já copiei` fecha | vitest `revelação não fecha fora nem com Esc` ✓ + e2e `:125` ✓ + `:173` ✓ | `mcp.test.tsx:135` sem botão `fechar|close`, `:139` `{Escape}`; `e2e:128`/`:176` `toHaveCount(0)`, `:129`/`:177` `Cancelar` `toHaveCount(0)`; N19 morreu | PASS |
| C17 | `400` e `409` dentro do diálogo, `Nome` mantido, sem revelação | vitest `erros da criação` ✓ | `mcp.test.tsx:235` e `:242` `expect(nome).toHaveValue('Cursor')` | PASS |
| C18 | vazio: `Nenhum token ainda.` + `Criar token` abre o diálogo | vitest `estado vazio` ✓ | `mcp.test.tsx:204` `findByText('Nenhum token ainda.')`, `:207` `findByRole('dialog', { name: 'Novo token' })` | PASS |
| C19 | revogação como era | vitest `revoga com confirmação` ✓ | `mcp.test.tsx:193` `findByText('Token revogado.')`, `:194` `toEqual(['/api/admin/mcp/tokens/1'])`; N17 (`Revogar` em token expirado) morreu. O `destrutivo` do `Confirmar` não tem asserção (N3, linha não tocada pela feature) | PASS |
| C20 | 360×780: seletor com estado, diálogo de 780 px, sem rolagem horizontal, revelação inteira | e2e `seletor em pé` ✓ + `diálogo em pé` ✓ | `e2e:164` `alturaDe(dialogo)).toBeCloseTo(780, 0)`, `:151` opções com estado, `:168-170`; Y6 (`h-96`) morreu | PASS |
| C21 | 844×390: `Já copiei` e `mcp.json` dentro da janela; 360×300 rola | e2e `diálogo deitado` ✓ + `revelação rola no celular baixo` ✓ | `e2e:191` `c.y + c.height <= 390`, `:196` `j.y + j.height <= 390`, `:207` `j.y + j.height <= 300`, `:209` `botao.y + botao.height <= 300`; C2 (sem `overflow-y-auto`) morreu em `:200` | PASS |
| C22 | 360×400: `Nome` dentro da janela, `Criar token` alcançável | e2e `teclado aberto 360×400` ✓ | `e2e:221` `campo.y + campo.height <= 400`, `:226` `botao.y + botao.height <= 400` | PASS |
| C23 | toque: `Novo token`, seletor, `Copiar`, `Já copiei` >= 44 px | e2e `alvos de toque` ✓ | `e2e:232` seletor, `:233` `Novo token`, `:235` `/^Copiar/`, `:236` `Já copiei`, todos `toBeGreaterThanOrEqual(44)` | PASS |
| C24 | suíte web e build; só as asserções listadas editadas | `npm --prefix web test -- --run` (703) + `build` exit 0 + `git diff 1ed5445..HEAD -U0` nos 3 arquivos de teste | ver abaixo | PASS |
| C25 | `dryer` sem candidato a 0.8 fora de `src/ui` | `cd web; dryer` exit 0 | 744 pares, 0 fora de `src/ui/` (AD-018) | PASS |

### Asserções editadas (C24)

`git diff 1ed5445..HEAD -U0 -- web/src/administracao/integracoes.test.tsx web/src/administracao/mcp.test.tsx web/e2e/integracoes.spec.ts`, linhas removidas (`^-`): em `integracoes.test.tsx`, só a de `seletor sem coluna` (`['Moodle', 'MCP']` -> opções com estado); em `mcp.test.tsx`, só linhas de `cria o token e mostra uma vez`, `fecha o painel e esconde o token`, `estado vazio` e `erros da criação` (formulário fixo/região virou diálogo; os `expect` de `Validade` seguem em `diálogo Novo token` `:72`, `…wxyz` e `Copiar Token` seguem afirmados); em `e2e/integracoes.spec.ts`, as opções do seletor sem estado, `height >= 44` (virou `alturaDe`), os `const nome`/`criar` de `teclado aberto 360×400`, a chave final reposicionada e a linha do stub `route` do Moodle (alargada para `PUT`; stub, não asserção, fora da lista do C24 mas inofensiva). `git diff 30ab8f5..HEAD -U0 | Select-String '^-[^-]'` (a rodada de correção 923568f) não retorna nenhuma linha removida: só adições. `revoga com confirmação`, `como conectar`, `carregando e erro` e `aba MCP lista os tokens` sem hunk. Nenhuma asserção enfraquecida.

## Coverage

Recomputado dos arquivos de produção em `HEAD` e do `plan.md`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| estados do Moodle (3) | `Integracoes.tsx` `estadoDoMoodle` | `Não configurado`/`Ativo`/`Desativado` C1; variante do `Desativado` `:234` (N9 morreu) | - |
| estados do MCP (3) | `estadoDoMcp` | `Sem tokens ativos`/`1 token ativo`/`2 tokens ativos` C1 (N16 morreu) | - |
| estados de leitura (3) x itens (2) | `useEstados` | carregando C2/C3 · erro MCP `:200` · erro Moodle `:209` · ok C1; variante de `Indisponível` `:214` (F19 morreu) | - |
| lugares do estado (3) | `Navegacao`, `<option>`, `AbaIntegracao` | coluna C1 (N10 morreu) · seletor C3 · cabeçalho C4 | - |
| clicabilidade da linha de estado | `Navegacao` | `e2e:101-104` clique na linha seleciona a aba (F15 morreu) | - |
| endereços com campo do Moodle (3) | `Enderecos` | login · redirecionamento · chaves C6 (N5 morreu) | - |
| campos do formulário do Moodle (5) | `Campos` | 5 em C7 `:299`, 5 em C11 | - |
| avisos após salvar (3) | `AvisoDeSalvo` | ligado C8 · desligado C9 · retirado C10 | texto extra no aviso desligado (N8 sobreviveu) |
| formas de fechar a revelação (3) x (Dialog, Sheet) | `Editor.tsx` | Dialog `mcp.test.tsx:135-139` + e2e `:128-135`; Sheet e2e `:176-181` | - |
| valores copiáveis da revelação (3) | `Revelacao` | token C15 · comando C14 · `mcp.json` C14 | - |
| frases da revelação (2) | `Revelacao` | `Copie agora…` e `Se você não copiar…` `mcp.test.tsx:103` (F13 morreu) | - |
| validades (3) e a escolhida | `Validades`, `NovoToken` | 30/90/365 C13 (N2 morreu); padrão 90 C13/C14 (N1 morreu) | validade escolhida enviada à API (N15 sobreviveu) |
| erros da criação (2) | `FormularioNovo` + `ErroDe` | `400` · `409` C17 | - |
| estados do painel MCP (2) | `Tabela` `vazio` | com tokens C19 · vazio C18 | - |
| arranjo do cabeçalho do painel (4) | `AbaIntegracao` | intro após o `h2` · intro abaixo (`e2e:114`, `order-last`) · `Novo token` depois do título `:111` · à direita `:113` (D2 morreu) | - |
| rolagem do corpo da revelação (2 alturas) | `Editor.tsx` `Sheet` | 390 `:196` · 300 `:207` (C2 morreu) | - |
| botão do diálogo desabilitado enquanto cria | `Editor` `pendente` | nenhum | N4 sobreviveu |
| larguras e entradas do celular (4) | plan Observable | 360×780 C20 · 844×390 C21 · 360×400 C22 · toque C23 | - |
| critérios EARS (19) | `plan.md` | AC 1-19 provados | AC 13 (validade escolhida) e AC 9 (texto extra) parciais |

## Test policy rows

Nenhuma linha: `checks.md` declara «Nenhuma linha nova» em `Test policy`; vale a convenção do repositório (teste de tela com `api()` simulada; medidas no Playwright), cumprida.

## Faults injected

Rodada 4, scoped: os 7 sobreviventes da rodada 3 e 26 falhas novas. Injetadas no tree real e restauradas com `git checkout -- <arquivo>` após cada uma (scripts em `%TEMP%`, fora do repositório; sem `git stash`); `git status --short` antes = depois = só `verification.md`. Unitárias: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx src/administracao/mcp.test.tsx` (32 testes). E2E: `npm --prefix web run build` + `docker compose up -d --build api` + `npm --prefix web run e2e -- e2e/integracoes.spec.ts --workers=1`, em 3 lotes (A: C2, F15, D2, X1; B: Y6, Y11; C: Y5, Y13), cada falha atribuída ao teste que falhou. Ao fim, rebuild no HEAD e `14 passed`.

| Mutation | Location | Killed |
| --- | --- | --- |
| R3-C2 `overflow-y-auto` removido do corpo do `Sheet` | `Editor.tsx:47` | yes - e2e `revelação rola no celular baixo` (`:200`); `diálogo deitado` sozinho não pega |
| R3-F15 `pointer-events-none` removido | `Integracoes.tsx:49` | yes - e2e `estado dentro de cada item da coluna` (`:103`) |
| R3-D2 `ms-auto` removido | `AbaIntegracao.tsx:20` | yes - e2e `Novo token no cabeçalho…` (`:113`) |
| R3-F19 `Indisponível` com `bom: true` | `Integracoes.tsx:18` | yes - `Moodle indisponível` (`integracoes.test.tsx:214`) |
| R3-F13 frase de recuperação encurtada | `Mcp.tsx` `Revelacao` | yes - `revelação única` (`mcp.test.tsx:103`) |
| R3-F14 variante do selo da tabela de tokens invertida | `Mcp.tsx` `LinhaDoToken` | out-of-scope - 32/32 passam; o `Badge` não está no diff `1ed5445..HEAD` (linha pré-existente, nunca testada) |
| R3-F16 `largo` do `Editor` invertido | `Editor.tsx:60` | out-of-scope - 32/32 passam; a lógica de `largo` não está no diff (só ganhou props ao lado) e a prop não é usada por esta feature |
| N1 `useState(90)` -> `30` | `Mcp.tsx` `NovoToken` | yes - `diálogo Novo token`, `cria o token e mostra uma vez` |
| N2 validades `[365, 90, 30]` | `Mcp.tsx` `Validades` | yes - `diálogo Novo token` |
| N3 `destrutivo` removido do `Confirmar` | `Mcp.tsx:179` | out-of-scope - 32/32 passam; bloco `Confirmar` não tocado pela feature (`git diff` só mostra o import), teste `revoga com confirmação` idêntico ao de antes. Fica o aviso: o texto do C19 diz «destrutivo» sem asserção |
| N4 `pendente={criar.isPending}` -> `false` | `Mcp.tsx:123` | no - 32/32 passam; duplo clique em `Criar token` não tem teste (linha movida pela feature para o `Editor`) |
| N5 valor de `URL de login` trocado pelo das chaves | `Moodle.tsx` `Enderecos` | yes - `campo do Moodle ao lado de cada endereço`, `estados da aba Moodle` |
| N6 padrão de `ativa` na primeira configuração -> `p.ativa` | `Moodle.tsx` `valoresDe` | yes - 5 testes (`aviso fixo com a entrada ligada`, ...) |
| N7 chave de cache do Moodle no `useEstados` trocada | `Integracoes.tsx` | yes - `estado atualiza sem recarregar` |
| N8 aviso desligado ganha 2ª frase `Ative a entrada para testar.` | `Moodle.tsx:40` | no - 32/32 passam; só `Para testar` é proibido (`:325`) |
| N9 `Desativado` com `bom: true` | `Integracoes.tsx` `estadoDoMoodle` | yes - `estado no cabeçalho do painel` (`:234`) |
| N10 `aria-describedby` da aba sempre `undefined` | `Integracoes.tsx` `Navegacao` | yes - 5 testes |
| N11 `salvar` do `Já copiei` volta a criar token | `Mcp.tsx` `NovoToken` | yes - 5 testes (`revelação única`, ...) |
| N12 `vence` -> `expira` no `Detalhe` da tabela | `Mcp.tsx:38` | out-of-scope - 32/32 passam; linha idêntica à de `1ed5445`, fora do diff |
| N13 `setNome('')` removido do sucesso | `Mcp.tsx` `NovoToken` | yes - `reabrir depois da revelação ou do erro começa limpo` |
| N14 `aria-label` do `Copiar` sem o prefixo | `Moodle.tsx` `Url` | yes - 4 testes |
| N15 `dias` fixo em 90 no POST | `Mcp.tsx:105` | no - 32/32 passam; só o padrão 90 é enviado (`:91`), escolher 30/365 não é testado |
| N16 `ativos === 0` -> `< 0` | `Integracoes.tsx` `estadoDoMcp` | yes - `estado de cada integração` e 2 mais |
| N17 `Revogar` também em token `EXPIRADO` | `Mcp.tsx` `LinhaDoToken` | yes - `revoga com confirmação` |
| N18 dica `Ex.: Cursor no meu notebook` encurtada | `Mcp.tsx` `FormularioNovo` | yes - `diálogo Novo token` |
| N19 `bloqueado={false}` | `Mcp.tsx` `NovoToken` | yes - `revelação não fecha fora nem com Esc` |
| N20 título da revelação sempre `Novo token` | `Mcp.tsx` `NovoToken` | yes - 5 testes |
| N21 `alerta` sem o `criado ? null :` | `Mcp.tsx:127` | equivalent - `criar.error` é `null` depois do sucesso (e `sair` faz `criar.reset()`), então `ErroDe` não renderiza nada |
| X1 `size-11` -> `size-6` do `SheetClose` | `Editor.tsx:42` | out-of-scope - 14/14 passam; botão `Fechar` do canto é estilo pré-existente do `Editor` e nenhum AC/check mede o tamanho dele (C23 lista 4 alvos, sem ele) |
| Y5 `size="sm"` em `Novo token` | `Integracoes.tsx` `PainelMcp` | equivalent - 14/14 passam; todo `Button` tem `max-md:h-11 pointer-coarse:h-11` (`web/src/ui/button.tsx`), então a altura no toque não muda |
| Y6 `h-dvh` -> `h-96` no `SheetContent` | `Editor.tsx` | yes - e2e `diálogo em pé` (`:164`) e `revelação rola…` |
| Y11 `@4xl/main:hidden` do seletor removido | `Integracoes.tsx` | yes - e2e `coluna a 1440`, `limite de 896 px…` |
| Y13 largura da coluna `w-56` -> `w-24` | `Integracoes.tsx` `Navegacao` | yes - e2e `coluna a 1440`, `estado dentro de cada item da coluna` |

Resumo: 33 falhas (7 da rodada 3 + 26 novas): 23 mortas, 2 equivalentes (N21, Y5), 5 fora do escopo (F14, F16, N3, N12, X1), **3 sobreviventes em código da feature (N4, N8, N15)**.

## Gate

- `npm --prefix web test -- --run` - 72 arquivos, 703 passed, 0 failed
- `npm --prefix web run build` - exit 0
- `npm --prefix web run e2e -- e2e/integracoes.spec.ts --workers=1` - 14 passed, 0 failed
- `cd web; dryer` - exit 0, 0 candidatos fora de `src/ui`
- `crapper` - não rodou (AD-044), não conta como PASS

## Ranked gaps

1. Validade escolhida não é provada - C13/C14, AC 13 - `Mcp.tsx:105` (`{ nome, dias }`); N15 sobreviveu. Em `mcp.test.tsx`, no teste `diálogo Novo token` ou `cria o token e mostra uma vez` (`:79-91`): `userEvent.selectOptions(validade, '365')` e `expect(corpo).toEqual({ nome: 'Cursor', dias: 365 })`. É a falha mais provável de chegar à produção: o administrador escolhe 30 dias e o token sai com 90.
2. Botão do diálogo sem estado `pendente` provado - C14/C17 (sem critério próprio) - `Mcp.tsx:123`; N4 sobreviveu. Falta um teste com `POST` pendente que confirme `Criar token` desabilitado (evita token duplicado por duplo clique), ou um critério que diga que isso não é requisito.
3. Texto do aviso desligado só é barrado em parte - C9, AC 9 - `Moodle.tsx:40`; N8 sobreviveu. Falta `expect(aviso).toHaveTextContent('Moodle salvo, mas a entrada pelo Moodle está desligada.')` e que o aviso tenha um só parágrafo (ou `toHaveTextContent` exato).
4. Avisos (fora do escopo desta feature, sem fix exigido): `destrutivo` do `Confirmar` de revogação sem asserção (N3, C19 diz «destrutivo»); selo de estado do token na tabela e `largo` do `Editor` sem teste (F14, F16); `Detalhe` do token sem teste (N12); tamanho do `Fechar` do canto não medido (X1).
5. Menores, carried from 30ab8f5 (código inalterado): foco depois de fechar o diálogo vai para `body`, não para `Novo token`; `Copiado` sem `aria-live`; `escolher` com `replace` (F2, equivalente na rodada 3) sem AC que decida o histórico.

Defeitos reais no HEAD: nenhum encontrado. Esta é a rodada 4 (acima do limite de 3 do `verify.md`): as três lacunas 1-3 mudam só testes e `checks.md`; o usuário decide entre acrescentá-las ou fechar com risco aceito num AD do `STATE.md` (a lacuna 1 é a que mais pesa).
