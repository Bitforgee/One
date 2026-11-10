# integracoes-admin verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 3bfe06b..435ffdc
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

C1-C6 e C8 têm prova com `arquivo:linha`. C7 não tem prova: o `dryer` não executa nesta máquina (Smart App Control). Isso é "não rodado", sem PASS, então o veredito é FAIL (ou risco aceito via AD no `STATE.md`, como pede o AGENTS.md).

## Binding sources

Nenhuma fonte vinculante (sem `plan.md`; o `## Intent` de `checks.md` faz o papel dele). Nada a comparar.

## Checks

Prova numa invocação: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx --reporter=verbose` - exit 0, 5 passed. Testes executados, cada um listado na saída: `tela Integrações > abas`, `> aba MCP em breve`, `> estados da aba Moodle`, `> salva e mostra o erro do campo`, `> item no menu`. Os cinco nomes existem em `web/src/administracao/integracoes.test.tsx` (linhas 26, 48, 58, 80, 115). O arquivo é novo no diff (renomeado de `moodle.test.tsx`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | Admin: grupo Administração na ordem, sem `Moodle`, href `/univag/integracoes`, ícone `lucide-plug` | `... integracoes.test.tsx -t "item no menu"`; rodado no arquivo inteiro, 5 passed | `integracoes.test.tsx:124` - `expect(grupo.getAllByRole('link').map((l) => l.textContent)).toEqual(['Usuários', 'Matrículas', 'Cadastros', 'Aparência', 'Integrações'])`; `:126` - `expect(link).toHaveAttribute('href', '/univag/integracoes')`; `:127` - `expect(link.querySelector('svg')).toHaveClass('lucide-plug')`; `:121` - `expect(nav.queryByRole('link', { name: 'Moodle' }), papel).not.toBeInTheDocument()` | PASS |
| C2 | ATENDENTE/ALUNO/OPERADOR sem o item; `/univag/integracoes` como ATENDENTE vai para `Fila` sem chamar `/api/admin/moodle` | idem (`item no menu`) | `integracoes.test.tsx:128` - `expect(nav.queryByRole('link', { name: 'Integrações' }), papel).not.toBeInTheDocument()` (laço sobre os 4 papéis, linha 116); `:134` - `expect(await screen.findByRole('heading', { name: 'Fila', level: 1 })).toBeInTheDocument()`; `:135` - `expect(chamadas.some((c) => c.url === '/api/admin/moodle')).toBe(false)` | PASS |
| C3 | h1 único `Integrações`; 2 abas em ordem, `Moodle` selecionada e `MCP` com selo; `?aba=moodle` igual; `?aba=qualquer-coisa` cai em Moodle; clique em MCP muda para `?aba=mcp` | `... -t "abas"`; rodado no arquivo inteiro | `integracoes.test.tsx:32` - `expect(titulos.map((h) => h.textContent), caminho).toEqual(['Integrações'])`; `:33` - `expect(nomesDasAbas(), caminho).toEqual(['Moodle', 'MCPEm breve'])`; `:34` - `expect(screen.getByRole('tab', { name: 'Moodle' })).toHaveAttribute('aria-selected', 'true')`; `:35` - `expect(within(screen.getByRole('tab', { name: /^MCP/ })).getByText('Em breve')).toHaveAttribute('data-slot', 'badge')` (os três caminhos, laço da linha 27); `:45` - `expect(document.querySelector('[data-aba-ativa]')?.getAttribute('data-aba-ativa')).toBe('mcp')` | PASS (ver lacuna 2) |
| C8 | `?aba=mcp`: MCP selecionada, aviso, sem formulário, sem `Salvar`, sem chamar `/api/admin/moodle` | `... -t "aba MCP em breve"`; rodado no arquivo inteiro | `integracoes.test.tsx:51` - `expect(await screen.findByText(EmBreve)).toBeInTheDocument()`; `:52` - `expect(screen.getByRole('tab', { name: /^MCP/ })).toHaveAttribute('aria-selected', 'true')`; `:53` - `expect(screen.queryByRole('textbox')).not.toBeInTheDocument()`; `:54` - `expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()`; `:55` - `expect(chamadas.some((c) => c.url === '/api/admin/moodle')).toBe(false)` | PASS |
| C4 | Aba Moodle: esqueleto, erro com `Tentar de novo`, formulário vazio com 3 URLs e 3 `Copiar` | `... -t "estados da aba Moodle"`; rodado no arquivo inteiro | `integracoes.test.tsx:62` - `expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)`; `:70` - `await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))`; `:75` - `expect(await screen.findByLabelText(rotulo)).toHaveValue('')`; `:76` - `expect(screen.getByText(url)).toBeInTheDocument()`; `:77` - `expect(screen.getAllByRole('button', { name: /^Copiar/ })).toHaveLength(3)` | PASS |
| C5 | Salvar envia `PUT` com 6 campos, mostra `Moodle salvo.`; 400 com `errors.authUrl` mostra no campo | `... -t "salva e mostra o erro do campo"`; rodado no arquivo inteiro | `integracoes.test.tsx:104` - `expect(corpo).toEqual({ ativa: true, emissor: ..., clientId: ..., deploymentId: '7', authUrl: ..., jwksUrl: ... })`; `:105` - `expect(Object.keys(corpo)).toHaveLength(6)`; `:102` - `expect(campo).toHaveAttribute('aria-invalid', 'true')`; `:111` - `expect(await screen.findByText('Moodle salvo.')).toBeInTheDocument()` | PASS |
| C6 | Suíte web e build passam; só as asserções do menu/rota/título trocam `Moodle`->`Integrações` | `npm --prefix web test -- --run` exit 0: 68 files, 639 passed, 0 failed; `npm --prefix web run build` exit 0 (`built in 20ms`, PWA `sw.js` gerado) | Diff de `acesso.test.tsx`, `textos.test.tsx`, `aparencia.test.tsx`: só `'Moodle'`->`'Integrações'`, `'moodle'`->`'integracoes'`, `lucide-plug` mantido. Em `integracoes.test.tsx` (ex-`moodle.test.tsx`) há só troca de rota e acréscimos, nenhuma asserção enfraquecida | PASS |
| C7 | `dryer` sem candidato a 0.8, ou "não rodado" sem PASS | `cd web; dryer` exit 1 | Saída literal (final): `tree_sitter_language_pack.DynamicLoadError: Dynamic library load error: Failed to load library C:\Users\Alfredo Neto\AppData\Local\tree-sitter-language-pack\v1.23.1\libs\tree_sitter_typescript.dll: LoadLibraryExW failed` (traceback em `dryer\scan.py:37` -> `extract.py:158` -> `treesitter.py:16`). Não rodou, sem PASS | NÃO RODADO (sem PASS) |

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| papéis que veem o item (4) | `web/src/Autenticado.tsx:20-31` (Menu): ALUNO, ATENDENTE, ADMINISTRADOR, OPERADOR; o item de `integracoes` (`:30`) é só ADMINISTRADOR | ADMINISTRADOR `integracoes.test.tsx:124-127` · ATENDENTE/ALUNO/OPERADOR `:128` (laço `:116`) · redirecionamento ATENDENTE `:134` | - |
| valores de `?aba=` (4) | `web/src/administracao/Integracoes.tsx:6-9` (`Abas = ['moodle','mcp']`, `abaPedida`): ausente, `moodle`, `mcp`, desconhecido | ausente/`moodle`/desconhecido `integracoes.test.tsx:27,32-35` · `mcp` `:48-55` | - |
| estados da aba Moodle (4) | `web/src/administracao/Moodle.tsx:121-133` (`error` -> `ErroDe`, sem dado -> `Skeleton`, formulário, `aria-invalid` em `:100`) | carregando `:62` · erro `:70` · vazio `:75-77` · erro de campo `:102` | - |
| selo do MCP e destino do clique (extra, tirado do código) | `Integracoes.tsx:19-21` (`Badge`), `:14` (`setParams`) | selo `:35` · clique `:45` | - |

O estado "configurada=true" do formulário não é membro do conjunto de C4 (que diz `configurada=false`). Só aparece de forma incidental depois do `PUT`.

## Test policy rows

Nenhuma linha nova em `checks.md` (seção `Test policy`: "Nenhuma linha nova"). O padrão de teste de tela com `api()` simulada vale: o arquivo usa `rotas`/`api` (`integracoes.test.tsx:15`) e Testing Library. Veredito: não há linha a julgar.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| nenhuma linha nova | - | - | n/a |

## Faults injected

Worktree `D:\one-system-vf` em HEAD `435ffdc`, com junction para `node_modules`. Sem `git stash`. `git status --porcelain` do tree real antes e depois: idêntico (`fc` sem diferenças; 21 entradas, as de `demo-live-*.png` e `web/apresentacao/`). Worktree e junction removidos (`git worktree list` só mostra o tree real). Linha de base no worktree antes das faltas: 5 passed.

| Mutation | Location | Killed |
| --- | --- | --- |
| item `Integrações` visível para ATENDENTE (`papeis: ['ADMINISTRADOR','ATENDENTE']`) | `web/src/Autenticado.tsx:30` | yes - `item no menu` falhou |
| `abaPedida` devolve `'mcp'` para valor desconhecido | `web/src/administracao/Integracoes.tsx:9` | yes - `abas`, `estados da aba Moodle` e `salva e mostra o erro do campo` falharam |
| aba MCP monta `<AbaMoodle />` | `web/src/administracao/Integracoes.tsx:26` | yes - `aba MCP em breve` falhou |
| selo `Em breve` removido | `web/src/administracao/Integracoes.tsx:21` | yes - `abas` falhou |
| `setParams` não chamado ao trocar de aba (`onValueChange` vira `void v`) | `web/src/administracao/Integracoes.tsx:14` | yes - `abas` falhou |

A primeira tentativa de F2 não aplicou a troca (a string não casou). Repeti com o texto exato e a troca foi aplicada. A falta de `abaPedida` caiu em 3 testes porque o padrão errado afeta todas as telas abertas sem `?aba`. Não conta como mais de uma superfície.

## Gate

`npm --prefix web test -- --run` - 639 passed, 0 failed (68 files); `npm --prefix web run build` - exit 0; `dryer` - não rodou (C7).

## Lacunas

1. C7 - `web/` (`dryer`): sem prova, `tree_sitter_typescript.dll: LoadLibraryExW failed`. Fecha só por risco aceito num AD do `STATE.md` (AGENTS.md) ou ao rodar o `dryer` em máquina sem o bloqueio.
2. C3 - `web/src/administracao/integracoes.test.tsx:45` e `web/src/administracao/Integracoes.tsx:15`: a mudança do endereço para `?aba=mcp` é provada pelo atributo de teste `data-aba-ativa`, que repete `params.get('aba')`, não por `location.search`. Foi declarado no Handoff do `checks.md`, então é lacuna de precisão e não bloqueia. Se `setParams` gravasse outro valor na URL, o teste ainda passaria.
3. C5 - `web/src/administracao/integracoes.test.tsx:103`: `getByText('A URL de autenticação deve começar com https://.')` não restringe o texto ao campo. O vínculo com o campo vem de `aria-invalid` (`:102`). Pequena imprecisão.
