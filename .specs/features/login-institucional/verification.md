# Login institucional verification

**Verdict**: PASS
**Profile**: ui
**Diff range**: 1e9e76c..547a6f2
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 2 is scoped to the fix range `0b1cb84..547a6f2` (05d3052 docs, c83cf75 `test(web)`, 547a6f2 docs) and to the four round-1 gaps. `git diff 0b1cb84..HEAD` touches only `.specs/` files, `web/e2e/arranjo.spec.ts` (+39 lines appended at :1567, three tests) and `web/src/acesso/textos.test.tsx` (+18 lines inserted at :119, one test). `git diff --quiet 0b1cb84 HEAD -- web/src ':!web/src/**/*.test.*'` exits 0, so no production code changed. The `api` container serves the same bundle as round 1 (`/assets/index-ClewLWmE.js`, with markers `grid min-h-svh lg:grid-cols-2`, `Atendimento ao estudante` and `Entre com seu CPF e sua senha.`).

All 26 proofs were re-run at 547a6f2. All four round-1 gaps are closed by C23-C26, each with a located assertion, and each of the four new assertion surfaces was made to fail by a production fault.

## Binding sources

The shadcn sources are carried from 0b1cb84, because the fix touched neither them nor the interface. The three `## Screens` rows the fix targets were re-enumerated at 547a6f2.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| shadcn `login-02` `page.tsx` (carried from 0b1cb84) | yes - WebFetch at round 1, full source | none | - |
| shadcn `login-02` `components/login-form.tsx` (carried from 0b1cb84) | yes - curl at round 1, read in full | none | - |
| shadcn `examples/authentication/page.tsx`, binding for the panel fill only (carried from 0b1cb84) | yes - curl at round 1, read in full | none | - |
| plan `## Screens` "cabeçalho do corpo, Login" (plan.md:83), verified at 547a6f2 | yes | none | - |
| plan `## Screens` "cabeçalho do corpo, Primeiro acesso e Criar senha" (plan.md:84), verified at 547a6f2 | yes | none | - |
| plan `## Screens` "Login, instituição não encontrada" (plan.md:89), verified at 547a6f2 | yes | none | - |
| plan `## Observable` rows for Primeiro acesso and Criar senha (plan.md:176-177), verified at 547a6f2 | yes | none | - |

**Step 1 re-enumeration (verified at 547a6f2).**
- **"cabeçalho do corpo, Login" (plan.md:83).**
  - `h1` = API `nome`: C6, arranjo.spec.ts:1407. The page has a single `h1`: C6, :1406.
  - The `h1` is 24/600 and centred: C6, :1408. It keeps `tracking-tight`: C20, interface.test.ts:186.
  - The line "Entre com seu CPF e sua senha." is new text: C18, textos.test.tsx:69. It sits 4 px below the `h1`: C6, :1412. It is 14 px and muted: C6, :1410.
  - **The line is centred**: C25. It has `text-align: center` (:1601) and its centre on the block centre (:1603).
  - CPF starts 24 px below the line: C6, :1413.
  - Nothing is left uncovered.
- **"cabeçalho do corpo, Primeiro acesso e Criar senha" (plan.md:84).**
  - The `h1` has the same style as the Login `h1` (C7, :1426) and sits at the top of the block (C7, :1421 and :1429).
  - There is no line below it: C7, :1432.
  - The first field starts 24 px below the `h1`: C7, :1430.
  - The success `Alert` starts 24 px below the `h1`. Primeiro acesso: C7, :1442. **Criar senha: C23, :1577.**
  - Nothing is left uncovered.
- **"Login, instituição não encontrada" (plan.md:89).**
  - The text: C15 Vitest, acesso.test.tsx:54, and C18.
  - The `Alert` is centred in the window horizontally (C15, :1562) and **vertically (C24, :1591)**.
  - There is no grid and no panel: C15, :1563, `h1, h2` count 0.
  - The `Centro` padding and width are exempted by name in `## Exempted`.
  - Nothing is left uncovered.
- **`## Observable`, Primeiro acesso (sucesso, erro, enviando) and Criar senha (sucesso, token inválido, enviando).**
  - Success texts: C18, textos.test.tsx:103 (`'Link enviado.'`) and the `estados` list at :108 (`'Senha criada. '`, `'Entre com o CPF e a nova senha.'`).
  - Success positions: C7 and C23.
  - **Error and invalid-token states: C26** (:130-132).
  - "Enviando" adds no text: the `Spinner` is an svg inside the button. `## Exempted` names it in the forms row ("o Spinner dentro do botão").
  - Nothing is left uncovered.

**Code against design** (carried from 0b1cb84): no production change since then.

## Checks

All proofs were re-run at 547a6f2 in one Vitest invocation (`cd web && npx vitest run --reporter=verbose`) and one Playwright invocation (`cd web && npx playwright test --reporter=list`). The verbose and list output shows each named test as its own passing line. No filter selects zero tests: for every `-g` and `-t` string, the full-run output was grepped and each one hit at least one passing test. C1-C22 evidence lines are carried from 0b1cb84. Both files gained lines only at :119 and :1567, and every cited carried line is above those points, so none of them moved. This was re-read at 547a6f2 for textos.test.tsx:69, :86, :96, :108 and arranjo.spec.ts:1442.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | two columns from 1024 px | `entrada em duas colunas` (arranjo.spec.ts:1328) passed at 547a6f2 | carried from 0b1cb84: `:1334` `perto(c.x, 0, ...)`; `:1336` `perto(p.x, w / 2, ...)`; `:1337` `perto(p.width, w / 2, ...)`; `:1339` `toBeGreaterThanOrEqual(800 - 1)` | PASS |
| C2 | panel `display: none`, column = viewport below 1024 | `entrada numa coluna abaixo de 1024 px` (:1343) passed | carried from 0b1cb84: `:1348` `...toBe('none')`; `:1349` `perto((await caixa(coluna(page))).width, w, ...)` | PASS |
| C3 | padding 24/40 | `recuo da coluna de entrada` (:1353) passed | carried from 0b1cb84: `:1357` `.toEqual([esperado, esperado, esperado, esperado])` | PASS |
| C4 | brand row | `linha da marca na entrada` (:1361) passed | carried from 0b1cb84: `:1368` `perto(i.width, 24, ...)`; `:1371` `toEqual(['16px', '600', await cor(page, '--primary')])`; `:1372` `perto(o.x, i.x + i.width + 8, ...)`; `:1374` ancestor a/button count `toBe(0)` | PASS |
| C5 | block width, x, vertical centre | `bloco do formulário por largura` (:1385) passed | carried from 0b1cb84: `:1390` `perto(b.width, largura, ...)`; `:1391` `perto(b.x, x, ...)`; `:1397` `perto(b.y + b.height / 2, (topo + base) / 2, ...)` | PASS |
| C6 | Login header | `cabeçalho do Login` (:1402) and Vitest `login mostra o nome da instituição` passed | carried from 0b1cb84: `:1406` `.toBe(1)`; `:1407` `.toBe(NomeSimulado)`; `:1408` `.toEqual(['24px', '600', 'center'])`; `:1412` `perto(f.y, h.y + h.height + 4, ...)`; `:1413` `perto(cpf.y, f.y + f.height + 24, ...)`; `acesso.test.tsx:33` | PASS |
| C7 | PA and CS header, PA success Alert | `cabeçalho de Primeiro acesso e Criar senha` (:1417) passed | carried from 0b1cb84: `:1426` `.toEqual(estiloLogin)`; `:1429` `perto(h.y, blocoCaixa.y, ...)`; `:1430` `perto(primeiroCampo.y, h.y + h.height + 24, ...)`; `:1442` `perto(alerta.y, h2.y + h2.height + 24, ...)` | PASS |
| C8 | Login form stack, Alert, link, Tab | `formulário do Login: espaços, erro e teclado` (:1448) and `Login: campos empilhados e o erro abaixo do formulário` (:494) passed | carried from 0b1cb84: `:1454-1456`, `:1458`, `:1462` `toBeFocused()`, `:1471-1472`, `:507` `expect(abaixo(entrar, erro)).toBe(true)` | PASS |
| C9 | no horizontal scroll | `sem rolagem horizontal` (arranjo.spec.ts:1027) passed | carried from 0b1cb84: `:1041` `expect(rolagem, ...).toBeLessThanOrEqual(janela)` | PASS |
| C10 | panel fill, border, padding | `fundo e borda do painel` (:1476) passed | carried from 0b1cb84: `:1489` `expect(fundo, ...).toBe(esperado)`; `:1490` `.toEqual(['1px', await cor(page, '--border')])`; `:1491` `.toEqual(['40px', '40px', '40px', '40px'])` | PASS |
| C11 | panel content | `conteúdo do painel` (:1495) passed | carried from 0b1cb84: `:1499` `.toBe('Atendimento ao estudante')`; `:1507` `.toBe(3)`; `:1512` `.toBe(texto)`; `:1520`, `:1521` | PASS |
| C12 | panel content position | `posição do conteúdo do painel` (:1531) passed | carried from 0b1cb84: `:1537` `perto(c.y + c.height, p.y + p.height - 40, ...)`; `:1538` `perto(c.x, w / 2 + 41, ...)`; `:1539` `toBeLessThanOrEqual(448 + 1)` | PASS |
| C13 | panel svgs hidden, nothing focusable | Vitest `painel de entrada sem foco e com ícones escondidos` passed | carried from 0b1cb84: `acesso.test.tsx:45` `toHaveAttribute('aria-hidden', 'true')`; `:46` `...toHaveLength(0)` | PASS |
| C14 | panel contrast ≥ 4.5, 3 themes | Vitest `contraste do painel de entrada` passed | carried from 0b1cb84: `interface.test.ts:162` `...toBeGreaterThanOrEqual(4.5)` | PASS |
| C15 | loading and not found centred (x) | `carregando e instituição não encontrada no centro` (:1543) and Vitest `slug desconhecido mostra Instituição não encontrada` passed | carried from 0b1cb84: `:1551` `.toEqual(['32px', '32px'])`; `:1552-1553`; `:1562` `perto(a.x + a.width / 2, w / 2, ...)`; `:1563` `h1, h2` count `toBe(0)`; `acesso.test.tsx:54` | PASS |
| C16 | root and Trocar senha unchanged | `telas de acesso centralizadas /` (:378, case `/`), `Trocar senha até 384 px` (:884), `raiz com a marca e o texto centralizados` (:485) passed | carried from 0b1cb84: `:388-390`; `:894`; `:489` | PASS |
| C17 | same API requests | `chamadas_iguais.py 1e9e76c` exit 0 ("275 teste(s) da base, 143 gravação(ões) distintas; 0 problema(s) em HEAD"); `--autoteste` exit 0 ("autoteste ok"), at 547a6f2 | carried from 0b1cb84: `chamadas_iguais.py:16` `mod.REESCRITOS = {}`; `:22` `sys.exit(mod.base_ci.main(sys.argv))` | PASS |
| C18 | texts per state | Vitest `-t "textos das telas de acesso"`: textos raiz, Login, Primeiro acesso, Criar senha and Trocar senha passed (the filter now also selects C26's test) | carried from 0b1cb84: `textos.test.tsx:69`, `:86` `t.conferir(montada.container, ['Univag'])`, `:96`, `:108`; `web/src/test/textos.ts:23` `expect(sobra(texto, [...literais, ...extras])).toEqual([])`; `:28` | PASS |
| C19 | no literal colour, tokens unchanged | Vitest `tokens da paleta` and `tokens de Visual` passed | carried from 0b1cb84: `interface.test.ts:171-173`, `:179` `.toEqual([])`, `:196` | PASS |
| C20 | `h1` classes, only 2 `h1` files | Vitest `títulos de página` passed | carried from 0b1cb84: `interface.test.ts:184` `.toEqual(['Autenticado.tsx', 'acesso/Acesso.tsx'])`; `:186` | PASS |
| C21 | rewritten layout-painel tests | `telas de acesso centralizadas /univag` (3 cases, :378), `quebras medidas dos dois lados` (:971), `arranjo telas de acesso` (:335) passed | carried from 0b1cb84: `:397-399` (`[data-slot=card]` count `toBe(0)`); `:984`; `:351-352`; `:356-357` | PASS |
| C22 | crapper, dryer, build | at 547a6f2: `npm --prefix web run coverage` exit 0 (278 passed); `crapper --use-existing-coverage -s src --threshold 9.99` exit 0; C22 dryer command piped to `grep -q` exit 0 (`No duplicate candidates found.`); `npm --prefix web run build` exit 0 | command exit codes; `mutator` NOT run, suspended by user decision (AD-025) | PASS |
| C23 | CS success `Alert` 24 px below `h1`, 360 and 1280 | `alerta de sucesso de Criar senha` (arranjo.spec.ts:1569) passed at 547a6f2 | verified at 547a6f2: `web/e2e/arranjo.spec.ts:1574` `page.getByRole('alert').filter({ hasText: 'Senha criada.' })`; `:1577` `perto(alerta.y, h.y + h.height + 24, \`${w}: alerta de sucesso\`)` over `[360, 1280]` (:1570) | PASS |
| C24 | not-found `Alert` vertical centre in window, 360 and 1280 | `instituição não encontrada no centro vertical` (:1583) passed | verified at 547a6f2: `web/e2e/arranjo.spec.ts:1585` `setViewportSize({ width: w, height: 800 })`; `:1591` `perto(a.y + a.height / 2, 400, \`${w}: centro y do Alert\`)` | PASS |
| C25 | Login line `text-align: center` and centred on the block | `frase do Login centrada` (:1597) passed | verified at 547a6f2: `web/e2e/arranjo.spec.ts:1601` `expect(await estilo(frase, 'text-align'), ...).toEqual(['center'])`; `:1603` `perto(f.x + f.width / 2, b.x + b.width / 2, \`${w}: centro da frase\`)` | PASS |
| C26 | PA error and CS invalid-token states show only today's texts plus the API `detail` in an `Alert` | Vitest `textos dos erros de Primeiro acesso e Criar senha` passed | verified at 547a6f2: `web/src/acesso/textos.test.tsx:130` `expect(await screen.findByRole('alert'), caminho).toHaveTextContent('Dados recusados pela API.')`; `:131` `t.conferir(container, ['Dados recusados pela API.'])` (`textos.ts:23` `sobra(...)` `.toEqual([])`); `:132` `t.todos()`, looped over both screens (:122-123) | PASS |

Run totals at 547a6f2:
- Vitest: 34 files, 278 passed, 0 failed.
- Playwright: 93 passed, 0 failed. That is round 1's 90 plus C23-C26's three e2e tests, which show as tests 91, 92 and 93.

The four new proofs sit in the files the fix touched. They are new tests, and no older assertion changed.

## Coverage

Rows the fix touched were recomputed at 547a6f2. All other rows are carried from 0b1cb84.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| door 1, screens on the grid (3) - carried from 0b1cb84 | plan `## Landing` door 1 | C1-C5 over `Entradas` (:1302) | - |
| 1024 px breakpoint (2 sides) - carried from 0b1cb84 | `## Screens` grade rows | 1023 C2 · 1024 C1 | - |
| 768 px breakpoint (2 sides) - carried from 0b1cb84 | `## Screens` coluna, marca | 767 C3 C4 · 768 C3 C4 | - |
| form block widths (6) - carried from 0b1cb84 | `## Screens` corpo | C5 (:1387) | - |
| no-scroll widths (6) - carried from 0b1cb84 | `## Screens` grade and AC 9 | C9 (:1032) | - |
| body headers (3) - carried from 0b1cb84 | `## Screens` header rows | Login C6 · PA C7 · CS C7 | - |
| what follows the header at 24 px (4) - verified at 547a6f2 | `## Screens` plan.md:84 and AC 7 | PA first field C7 (:1430) · CS first field C7 (:1430) · PA success Alert C7 (:1442) · CS success Alert C23 (:1577) | - |
| panel texts (5) - carried from 0b1cb84 | `## Screens` painel | C11 | - |
| panel icons (3) - carried from 0b1cb84 | `## Screens` painel | C11 C13 | - |
| themes for panel contrast (3) - carried from 0b1cb84 | `## Screens` temas | C14 | - |
| Login states off the grid, centred in window (2 states × 2 axes) - verified at 547a6f2 | `## Screens` plan.md:88-89 and AC 15 | loading x, y C15 (:1552-1553) · not-found x C15 (:1562) · not-found y C24 (:1591) | - |
| Login header texts centred (2) - verified at 547a6f2 | `## Screens` plan.md:83 "texto centrado" | `h1` C6 (:1408) · line C25 (:1601, :1603) | - |
| screens that do not change (2) - carried from 0b1cb84 | `## Screens` raiz/Trocar senha | C16 | - |
| layout-painel tests rewritten (3) - carried from 0b1cb84 | plan `## Impact` | C21 | - |
| new texts (6) - carried from 0b1cb84 | `## Screens` *(novo)* marks | C18 | - |
| text states per screen (Observable) - verified at 547a6f2 | plan `## Observable` plan.md:169-177 | Login: loading, not found, form, refused C18 · PA: form, success C18; error C26 (:130-131) · CS: form, success C18; invalid token C26 (:130-131) | - |

The "enviando" states add no visible text. The `Spinner` is an svg inside `BotaoAcao` (carried from 0b1cb84), and `## Exempted` names it.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| arranjo das telas de entrada (carried from 0b1cb84) | `web/src/acesso/Acesso.tsx` (Entrada) | Playwright `boundingBox()` and `getComputedStyle`, each side of 768 and 1024, 3 screens: C1-C4 | yes |
| textos visíveis por estado (re-judged at 547a6f2) | `Acesso.tsx` Login, PrimeiroAcesso, DefinirSenha | Vitest `textos` with `estados`, `conferir` and `todos`, each state of each screen. Login covered by C18 (:69-92). PA form and success covered by C18 (:96-104), PA error by C26 (:122, :131). CS form and success covered by C18 (:108-116), CS invalid token by C26 (:123, :131) | yes |
| contraste derivado dos tokens (carried from 0b1cb84) | `web/src/index.css` | Vitest over `index.css`, 3 themes: C14 | yes |
| `Acesso.tsx` no new condition (carried from 0b1cb84, re-confirmed: no production change in the fix range) | `web/src/acesso/Acesso.tsx` | none of its own; crapper 0 above 9.99 at 547a6f2 | yes |

**Swept `existing` rows**: carried from 0b1cb84. The fix changed no production code, so the cited constraints (`Acesso.tsx:17`, `:131`, `:190`) cannot have moved.

## Faults injected

Faults F1-F5 are carried from 0b1cb84, all killed: the grid breakpoint, the panel item order, the body's vertical centring, the `--muted-foreground` contrast, and the `h1` text.

Round 2 put one fault on each new assertion surface (verified at 547a6f2). The real tree's porcelain before was `?? .idea/` and `?? .playwright-mcp/`. The isolated worktree was set up with `git worktree add <scratch>/wtl2 HEAD`, and `web/node_modules` was linked in as a junction made with `mklink /J`.

For each e2e fault, the edit was applied with `sed`. Then `npx vite build` ran, followed by `npx vite preview --port 4179 --strictPort`. The marker was grepped from the served bundle, and only the narrowest proof ran, with `E2E_URL=http://localhost:4179`. The preview was killed with `taskkill /T`, and the source was restored with `git checkout`. The worktree porcelain was empty after each fault.

One run is not counted. My first F2 attempt used a wrong line address, so `sed` changed nothing. The diff stat was empty and the served bundle had no marker, so the test's pass there is not a surviving mutant. F2 was re-run with a pattern address, and the fault was confirmed in the bundle.

| Mutation | Location | Killed |
| --- | --- | --- |
| F6 Criar senha success `<Alert>` -> `<Alert className="mt-4">`. Served marker: `` mt-4`,children:[`Senha criada `` | `web/src/acesso/Acesso.tsx:180` | yes - `alerta de sucesso de Criar senha`: "360: alerta de sucesso: 423 contra 407" (received 16, expected ≤ 1) |
| F7 `Centro` `items-center` -> `items-start`. Served marker: `flex min-h-svh w-full items-start justify-center` | `web/src/acesso/Acesso.tsx:22` | yes - `instituição não encontrada no centro vertical`: "360: centro y do Alert: 67 contra 400" |
| F8 Login line loses `text-center` (`-mt-5 text-center text-sm` -> `-mt-5 text-sm`). Served marker: `mt-5 text-sm text-muted-foreground` | `web/src/acesso/Acesso.tsx:46` | yes - `frase do Login centrada`: "360: text-align", `toEqual(['center'])` failed at arranjo.spec.ts:1601 |
| F9 form error `Alert` shows an extra literal (`{m.error.message}` -> `{m.error.message} Tente de novo.`). Vitest, run in the worktree | `web/src/acesso/Acesso.tsx:99` | yes - `textos dos erros de Primeiro acesso e Criar senha`: "expected [ 'Tente', 'de', 'novo' ] to deeply equal []" (1 failed, 6 skipped) |

F8 was killed by the `text-align` assertion (:1601). The box-centre assertion (:1603) alone could not catch it, because the `p` spans the block's width. The two assertions together settle C25's claim.

**Cleanup.**
- Port 4179 had no LISTENING socket left.
- The junction was removed with `rmdir`, and `D:\one-system\web\node_modules` is still intact (`node_modules\vite` exists).
- `git worktree remove --force` ran, and `git worktree list` shows only `D:/one-system 547a6f2 [main]`.
- The real tree's porcelain matches the baseline (`?? .idea/`, `?? .playwright-mcp/`).
- `git stash` was never used.

## Gate

All results below are verified at 547a6f2.

- The `api` container (up, port 8080) serves `/assets/index-ClewLWmE.js`, the same bundle as round 1. It carries `grid min-h-svh lg:grid-cols-2`, `Atendimento ao estudante` and `Entre com seu CPF e sua senha.`. There was no production change in the fix range.
- `cd web && npx vitest run --reporter=verbose`: 34 files, 278 passed, 0 failed.
- `cd web && npx playwright test --reporter=list`: 93 passed, 0 failed.
- `python .specs/features/login-institucional/chamadas_iguais.py 1e9e76c`: exit 0. `--autoteste`: exit 0.
- `npm --prefix web run coverage`: 278 passed. Then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0.
- dryer (the exact C22 command) piped to `grep -q "No duplicate candidates found"`: exit 0.
- `npm --prefix web run build`: exit 0.
- `mutator`: NOT run, suspended by user decision (AD-025).
