# Login institucional verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 1e9e76c..0b1cb84
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Verified at 0b1cb84. All 22 checks are proven by located assertions, and 5 of 5 faults were killed. The verdict is FAIL anyway: three values that `## Screens` decides have no check and no exemption, and one `Test policy` row is not met. See `## Ranked gaps`.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| shadcn `login-02` `page.tsx` (raw.githubusercontent.com, shadcn-ui/ui main, apps/v4/registry/new-york-v4/blocks/login-02/page.tsx) | yes - WebFetch, full source returned | none | - |
| shadcn `login-02` `components/login-form.tsx` (same directory) | yes - WebFetch returned only a summary, so the raw file was downloaded with curl and read in full | none | - |
| shadcn `examples/authentication/page.tsx` (binding only for the panel fill) | yes - WebFetch returned only a summary, so the raw file was downloaded with curl and read in full | none | - |
| plan `## Screens` row "cabeçalho do corpo, Login" (plan.md:83) | yes | none | "texto centrado": the description line "Entre com seu CPF e sua senha." has no centring check. C6 asserts `text-align` on the `h1` only (arranjo.spec.ts:1408); the line itself gets only size, colour and y (1410, 1412). Not in `## Exempted` |
| plan `## Screens` row "cabeçalho do corpo, Primeiro acesso e Criar senha" (plan.md:84) and AC 7 | yes | none | "24 px ... até o `Alert` de sucesso" is measured only on Primeiro acesso (arranjo.spec.ts:1437-1442). The Criar senha success `Alert` ("Senha criada.") has no position check |
| plan `## Screens` row "Login, instituição não encontrada" (plan.md:89) and AC 15 | yes | none | "`Alert` centrado na janela": C15 checks only the horizontal centre (arranjo.spec.ts:1562). The vertical centre is unchecked, while the Spinner gets both (1552-1553). `## Exempted` leaves out only the `Centro` padding and width |

**How the sources compare with the checks.** login-02 sets the grid `grid min-h-svh lg:grid-cols-2` (C1, C2). It sets the form column `flex flex-col gap-4 p-6 md:p-10` (C3; the 16 px gap is folded into C5's centring formula, arranjo.spec.ts:1395-1397). It sets the brand row `flex justify-center gap-2 md:justify-start` (C4), the body `flex flex-1 items-center justify-center` > `w-full max-w-xs` (C5), and a panel to the right that is hidden below `lg` (C1, C2). Its header puts `gap-1` (4 px) between the `h1` and the line, which matches C6. examples/authentication sets the panel fill `bg-primary/5`, `p-10` and content at `mt-auto` (C10, C12).

None of these is a contradiction, for these reasons:
- The source brand is an `<a href="#">`, a placeholder with no destination; the approved plan says "Não é link" (C4).
- Icon size and colour, the `h1` weight (`font-bold` in the source, `font-semibold tracking-tight` in the house system, C20) and the 24 px header-to-field gap (FieldGroup `gap-7` in the source) are values. `## Screens` sets them from the house design system.
- `lg:block` became `lg:flex` so that `mt-auto` works, and `border-l` replaces the example's `dark:border-r` because the panel moved to the right. The plan's door 1 decides both.

**Each screen against `## Screens`.**
- Grade < 1024: one column, `min-h-svh`, panel `display:none`, no horizontal scroll at 360, 390 and 768. Proven by C2, C9, and C5's 900 px centring (which needs the column to reach the window bottom).
- Grade ≥ 1024: two equal columns, panel at x = half, y = 0, height ≥ window. Proven by C1 and C9.
- Coluna: padding by C3; brand-row-to-body gap of 16 px by C5; body fills the remaining height by C5.
- Linha da marca: icon, 8 px gap, "One" 16/600 primary, one row, not a link, centred or x = 40, top = padding. All proven by C4.
- Corpo: width and x at 6 widths and vertical centring by C5.
- Login header: `h1` = nome, single `h1`, 24/600, centred; line 4 px below at 14 px muted; CPF 24 px below. Proven by C6 and C20. The line's centring is **uncovered**.
- Primeiro acesso and Criar senha header: proven by C7, except the Criar senha success Alert spacing, which is **uncovered**.
- Login form: 24 px stack, Entrar width, Alert below, link centred below, Tab order. Proven by C8.
- Primeiro acesso and Criar senha forms: full-width button and centred "Voltar" by C7; no card by C21; texts by C18. The rest is unchanged behaviour (Swept existing).
- Painel: proven by C10-C13.
- Loading: proven by C15.
- Not found: proven by C15, horizontal only; vertical is **uncovered**.
- Themes: proven by C14 and C19.
- Root and Trocar senha: proven by C16.

**Code against design.** `Acesso.tsx:35-67` renders only what `## Screens` draws: the brand row, the body with `h1`, optional line and children, and the panel with `h2`, `p` and a `ul` of 3 items. No extra element, link or text. `-mt-5` on the line is spacing only (Settled mid-build 3).

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | two columns from 1024 px, panel at half, y 0, height ≥ 800 | `npx playwright test e2e/arranjo.spec.ts -g "entrada em duas colunas"` - passed (arranjo.spec.ts:1328) | `web/e2e/arranjo.spec.ts:1334` `perto(c.x, 0, ...)`; `:1336` `perto(p.x, w / 2, ...)`; `:1337` `perto(p.width, w / 2, ...)`; `:1338` `perto(p.y, 0, ...)`; `:1339` `expect(p.height, ...).toBeGreaterThanOrEqual(800 - 1)` over Entradas × [1024, 1280, 1440] | PASS |
| C2 | panel `display: none`, column = viewport at 360, 768, 1023 | `-g "entrada numa coluna abaixo de 1024 px"` - passed (:1343) | `web/e2e/arranjo.spec.ts:1348` `expect(await painel(page).evaluate((e) => getComputedStyle(e).display), ...).toBe('none')`; `:1349` `perto((await caixa(coluna(page))).width, w, ...)` | PASS |
| C3 | padding 24px at 360/767, 40px at 768/1280 | `-g "recuo da coluna de entrada"` - passed (:1353) | `web/e2e/arranjo.spec.ts:1357` `expect(await estilo(coluna(page), 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'), ...).toEqual([esperado, esperado, esperado, esperado])` | PASS |
| C4 | brand row: icon 24 primary, "One" 16/600 primary, 8 px, same line, not a link, centred or x 40, top 24 or 40 | `-g "linha da marca na entrada"` - passed (:1361) | `web/e2e/arranjo.spec.ts:1368` `perto(i.width, 24, ...)`; `:1370` `toBe(await cor(page, '--primary'))`; `:1371` `toEqual(['16px', '600', await cor(page, '--primary')])`; `:1372` `perto(o.x, i.x + i.width + 8, ...)`; `:1374` ancestor a or button `.count()` `toBe(0)`; `:1376` `perto(l.x + l.width / 2, c.x + c.width / 2, ...)`; `:1379` `perto(i.x, 40, ...)` | PASS |
| C5 | block widths and x at 6 widths; vertical centre at 900 px height | `-g "bloco do formulário por largura"` - passed (:1385) | `web/e2e/arranjo.spec.ts:1390` `perto(b.width, largura, ...)`; `:1391` `perto(b.x, x, ...)` over the 6 tuples at :1387; `:1397` `perto(b.y + b.height / 2, (topo + base) / 2, ...)` with `topo = m.y + m.height + 16`, `base = 900 - recuo` | PASS |
| C6 | Login single `h1` = API nome, 24/600/center; line 4 px below, 14px muted; CPF 24 px below | `-g "cabeçalho do Login"` - passed (:1402); vitest `login mostra o nome da instituição` - passed | `web/e2e/arranjo.spec.ts:1406` `expect(await page.locator('h1').count(), ...).toBe(1)`; `:1407` `.toBe(NomeSimulado)`; `:1408` `.toEqual(['24px', '600', 'center'])`; `:1410` `.toEqual(['14px', await cor(page, '--muted-foreground')])`; `:1412` `perto(f.y, h.y + h.height + 4, ...)`; `:1413` `perto(cpf.y, f.y + f.height + 24, ...)`; `web/src/acesso/acesso.test.tsx:33` `expect(await screen.findByText(/Univag/)).toBeInTheDocument()` | PASS |
| C7 | (amended 03/11) PA and CS `h1` same style as Login, at top of block; field 24 px below; nothing between; button = field width; Voltar centred; PA success Alert 24 px below `h1` | `-g "cabeçalho de Primeiro acesso e Criar senha"` - passed (:1417) | `web/e2e/arranjo.spec.ts:1426` `.toEqual(estiloLogin)`; `:1421` and `:1429` `perto(h.y, blocoCaixa.y, ...)`; `:1430` `perto(primeiroCampo.y, h.y + h.height + 24, ...)`; `:1432` `following-sibling::*[1]//label` `.count()` `toBe(1)`; `:1433` `perto(b.width, ...width, ...)`; `:1436` `perto(voltar.x + voltar.width / 2, blocoCaixa.x + blocoCaixa.width / 2, ...)`; `:1442` `perto(alerta.y, h2.y + h2.height + 24, ...)` | PASS |
| C8 | Login 24 px stack, Entrar = CPF width, link centred below, Alert below Entrar and link below Alert, Tab order | `-g "formulário do Login: espaços, erro e teclado"` (:1448) and `-g "Login: campos empilhados e o erro abaixo do formulário"` (:494) - both passed | `web/e2e/arranjo.spec.ts:1454` `perto(s.y, c.y + c.height + 24, ...)`; `:1455` `perto(e.y, s.y + s.height + 24, ...)`; `:1456` `perto(e.width, (await caixa(cpf)).width, ...)`; `:1458` `perto(l.x + l.width / 2, bb.x + bb.width / 2, ...)`; `:1462` `await expect(alvo, ...).toBeFocused()` over [senha, entrar, link]; `:1471` `expect(erro.y, ...).toBeGreaterThanOrEqual(e2.y + e2.height - 1)`; `:1472` `expect(l2.y, ...).toBeGreaterThanOrEqual(erro.y + erro.height - 1)`; `:507` `expect(abaixo(entrar, erro)).toBe(true)` | PASS |
| C9 | no horizontal scroll on the 3 screens at 6 widths | `-g "sem rolagem horizontal"` - passed (:1027) | `web/e2e/arranjo.spec.ts:1041` `expect(rolagem, ...).toBeLessThanOrEqual(janela)` over `Telas` (Login, Primeiro acesso and Criar senha at `web/e2e/simulada.ts:82,113,114`) × [360, 390, 768, 1024, 1280, 1440] | PASS |
| C10 | panel bg = `bg-primary/5` probe with alpha, border-left 1px `--border`, padding 40 | `-g "fundo e borda do painel"` - passed (:1476) | `web/e2e/arranjo.spec.ts:1487` probe colour `not.toMatch` an opaque or zero-alpha pattern; `:1489` `expect(fundo, ...).toBe(esperado)`; `:1490` `.toEqual(['1px', await cor(page, '--border')])`; `:1491` `.toEqual(['40px', '40px', '40px', '40px'])` | PASS |
| C11 | panel `h2`, line, 3 `li` in order with icons, sizes, colours, gaps; PA and CS same | `-g "conteúdo do painel"` - passed (:1495) | `web/e2e/arranjo.spec.ts:1499` `.toBe('Atendimento ao estudante')`; `:1500` `.toEqual(['30px', '600', await cor(page, '--foreground')])`; `:1502` `.toEqual(['16px', await cor(page, '--muted-foreground')])`; `:1504` `perto(f.y, t.y + t.height + 8, ...)`; `:1505` `perto(l.y, f.y + f.height + 24, ...)`; `:1507` `expect(await itens.count(), 'itens').toBe(3)`; `:1512` `expect(await item.textContent(), ...).toBe(texto)` with `svg.lucide-${icone}` (:1513); `:1515` `perto(s.width, 20, ...)`; `:1517` icon colour `--primary`; `:1520` `perto(textoX, s.x + s.width + 12, ...)`; `:1521` `perto(caixaItem.y, anterior.y + anterior.height + 16, ...)`; `:1526-1527` PA and CS `h2` visible, `li` count `toBe(3)` | PASS |
| C12 | content bottom 40 px above panel bottom, x = half + 41, width ≤ 448 at 1024×740 and 1440×900 | `-g "posição do conteúdo do painel"` - passed (:1531) | `web/e2e/arranjo.spec.ts:1537` `perto(c.y + c.height, p.y + p.height - 40, ...)`; `:1538` `perto(c.x, w / 2 + 41, ...)`; `:1539` `expect(c.width, ...).toBeLessThanOrEqual(448 + 1)` | PASS |
| C13 | 3 panel svgs `aria-hidden="true"`, no focusable in panel | vitest `painel de entrada sem foco e com ícones escondidos` - passed | `web/src/acesso/acesso.test.tsx:44` `expect(icones, caminho).toHaveLength(3)`; `:45` `expect(i, caminho).toHaveAttribute('aria-hidden', 'true')`; `:46` `expect(painel.querySelectorAll('a, button, input, select, textarea, [tabindex]'), caminho).toHaveLength(0)` | PASS |
| C14 | contrast ≥ 4.5 of fg and muted-fg on 5% primary over background, 3 themes | vitest `contraste do painel de entrada` - passed | `web/src/test/interface.test.ts:158` `decodificar(0.05 * c + 0.95 * f[i])`; `:162` `expect((Math.max(l, luz) + 0.05) / (Math.min(l, luz) + 0.05), ...).toBeGreaterThanOrEqual(4.5)` over `temas()` (`:73`, `:root`, `.dark`, `.dark.black`) | PASS |
| C15 | loading Spinner 32 px centred in window; 404 Alert horizontally centred; no `h1` nor panel | `-g "carregando e instituição não encontrada no centro"` - passed (:1543); vitest `slug desconhecido mostra Instituição não encontrada` - passed | `web/e2e/arranjo.spec.ts:1551` `.toEqual(['32px', '32px'])`; `:1552` `perto(s.x + s.width / 2, w / 2, ...)`; `:1553` `perto(s.y + s.height / 2, 400, ...)`; `:1554` and `:1563` `expect(await page.locator('h1, h2').count(), ...).toBe(0)`; `:1562` `perto(a.x + a.width / 2, w / 2, ...)`; `web/src/acesso/acesso.test.tsx:54` `expect(await screen.findByText('Instituição não encontrada.')).toBeInTheDocument()` | PASS |
| C16 | root `/` and Trocar senha tests pass unchanged | `-g "telas de acesso centralizadas /"`, `-g "Trocar senha até 384 px"` (:884), `-g "raiz com a marca e o texto centralizados"` (:485) - all passed | `web/e2e/arranjo.spec.ts:388-390` (case `/`, the same three expressions as at base, now inside `if (caminho === '/')`) `expect(c.width, rotulo).toBeLessThanOrEqual(384)`; `:894` `expect(Math.abs(cartao.x + cartao.width / 2 - (bloco.x + bloco.width / 2)), ...).toBeLessThanOrEqual(1)`; `:489` `expect(Math.abs(c.x + c.width / 2 - 180)).toBeLessThanOrEqual(1)`; tests at :884 and :485 untouched by the diff | PASS |
| C17 | same API requests; script exits 0; full suites pass | `python .specs/features/login-institucional/chamadas_iguais.py 1e9e76c` exit 0 ("275 teste(s) da base, 143 gravação(ões) distintas; 0 problema(s) em HEAD"); `--autoteste` exit 0 ("autoteste ok"); full Vitest 277/277, full Playwright 90/90 | `.specs/features/login-institucional/chamadas_iguais.py:16` `mod.REESCRITOS = {}` (matches Handoff Settled 6: no Vitest test renamed); `:22` `sys.exit(mod.base_ci.main(sys.argv))` | PASS |
| C18 | only today's texts minus "·", plus the 6 new ones, per state | vitest `-t "textos das telas de acesso"` - textos raiz, Login, Primeiro acesso, Criar senha and Trocar senha all passed | `web/src/acesso/textos.test.tsx:69` list without `'·'`, with `'Entre com seu CPF e sua senha.'` and `...Painel` (`:56`, the 5 panel texts); `:86` `t.conferir(montada.container, ['Univag'])`; `:96`, `:108` PA and CS lists with `...Painel`; `web/src/test/textos.ts:23` `expect(sobra(texto, [...literais, ...extras])).toEqual([])` and `:28` `expect(literais.filter((l) => !tudo.includes(l))).toEqual([])` | PASS |
| C19 | no literal colour; AD-027 tokens unchanged in 3 themes | vitest `tokens da paleta`, `tokens de Visual` - passed | `web/src/test/interface.test.ts:171-173` `expect(claro[token], ...).toBe(valorClaro)` (and `.dark`, `.black`); `:179` `expect(arquivos.filter((a) => CorLiteral.test(texto(a)))).toEqual([])`; `:196` `expect(t[seletor][linha[0]], ...).toBe(esperado)` | PASS |
| C20 | `h1` of `Acesso.tsx` keeps `text-2xl font-semibold tracking-tight`; only `h1` files are Acesso and Autenticado | vitest `títulos de página` - passed | `web/src/test/interface.test.ts:184` `.toEqual(['Autenticado.tsx', 'acesso/Acesso.tsx'])`; `:186` `toMatch(/className="(?:[^"]* )?text-2xl font-semibold tracking-tight[ "]/)` | PASS |
| C21 | rewritten layout-painel tests keep their names and measure the grid; no card on the 3 screens | `-g "telas de acesso centralizadas /univag"` (3 cases, :378), `-g "quebras medidas dos dois lados"` (:971), `-g "arranjo telas de acesso"` (:335) - all passed | `web/e2e/arranjo.spec.ts:397` `expect(b.width, rotulo).toBeLessThanOrEqual(320)`; `:398` `expect(Math.abs(b.x + b.width / 2 - (coluna.x + coluna.width / 2)), rotulo).toBeLessThanOrEqual(1)`; `:399` `expect(await page.locator('[data-slot=card]').count(), rotulo).toBe(0)`; `:984` `expect(await padding(coluna), ...).toBe(esperado)` over [[360,'24px'],[768,'40px']]; `:351-352` x 24, width 312; `:356-357` x 96, width 320 | PASS |
| C22 | crapper 0 at 9.99, dryer no candidate, build 0; mutator suspended | `npm --prefix web run coverage` exit 0 then `crapper --use-existing-coverage -s src --threshold 9.99` exit 0 (no function above 9.99); C22 dryer command piped to `grep -q "No duplicate candidates found"` exit 0; `npm --prefix web run build` exit 0 | command exit codes; the dryer output line reads `No duplicate candidates found.`; `mutator` NOT run, suspended by user decision (AD-025) | PASS |

Every named test above shows up individually as passed in one Vitest invocation (12 selected, 12 passed, 71 skipped) and one Playwright invocation (22 selected, 22 passed). No filter matched zero tests (L-002). Each new proof sits in a file the diff touches. C9's test (:1027) and C8's second test (:494) predate the feature, but they ran at HEAD against the new grid. The Handoff says "90 de 91" e2e; `npx playwright test --list` reports 90 tests in total, and all 90 passed.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| door 1, screens on the grid (3) | plan `## Landing` door 1 | Login, Primeiro acesso, Criar senha: C1-C5 each loop over `Entradas` (arranjo.spec.ts:1302) | - |
| 1024 px breakpoint (2 sides) | `## Screens` grade rows | 1023 C2 (:1345) · 1024 C1 (:1330) | - |
| 768 px breakpoint (2 sides) | `## Screens` coluna and linha da marca rows | 767 C3 C4 · 768 C3 C4 | - |
| form block widths (6) | `## Screens` corpo row | 360, 390, 768, 1024, 1280, 1440 C5 (:1387) | - |
| no-scroll widths (6) | `## Screens` grade rows and AC 9 | 360, 390, 768, 1024, 1280, 1440 C9 (:1032) | - |
| body headers (3) | `## Screens` header rows | Login C6 · Primeiro acesso C7 · Criar senha C7 | - |
| what follows the header at 24 px (4) | `## Screens` plan.md:84 and AC 7 | PA first field C7 · CS first field C7 · PA success Alert C7 (:1442) | Criar senha success Alert ("Senha criada.") |
| panel texts (5) | `## Screens` painel row | title, line, items 1-3 C11 | - |
| panel icons (3) | `## Screens` painel row | MessageCircle, ListChecks, Users C11 C13 | - |
| themes for panel contrast (3) | `## Screens` temas row | `:root`, `.dark`, `.dark.black` C14 (interface.test.ts:73) | - |
| Login states off the grid, each centred in window (2 states × 2 axes) | `## Screens` plan.md:88-89 and AC 15 | loading x and y C15 (:1552-1553) · not-found x C15 (:1562) | not-found Alert vertical centre |
| Login header texts centred (2) | `## Screens` plan.md:83 "texto centrado" | `h1` C6 (:1408) | description line "Entre com seu CPF e sua senha." |
| screens that do not change (2) | `## Screens` raiz/Trocar senha row | root C16 · Trocar senha C16 | - |
| layout-painel tests rewritten (3) | plan `## Impact` | `telas de acesso centralizadas` (3 cases) C21 · `quebras medidas dos dois lados` C21 · `arranjo telas de acesso` C21 | - |
| new texts (6) | `## Screens` *(novo)* marks | Login line + 5 panel texts C18 | - |
| text states per screen (Observable) | plan `## Observable` plan.md:169-177 | Login: loading, not found, form, login refused C18 · PA: form, success C18 · CS: form, success C18 | Primeiro acesso error state (API `Alert`); Criar senha invalid-token state (API `Alert`) |

There is no `Surface` and no `Relations`, so the plan has no route or entity set. The "sending" state adds no visible text (`Spinner` is an svg inside `BotaoAcao`, `web/src/acao.tsx:12`), so it is not counted as a text state.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| arranjo das telas de entrada (breakpoint CSS) | `web/src/acesso/Acesso.tsx` (Entrada, :35-67) | Playwright `boundingBox()` and `getComputedStyle`, one width on each side of 768 and 1024, on the 3 screens: C1 (1024), C2 (1023), C3 and C4 (767 and 768), all over `Entradas` | yes |
| textos visíveis por estado | `Acesso.tsx` Login, PrimeiroAcesso, DefinirSenha | Vitest `textos` with `estados`, `conferir` and `todos`, each state of each screen | no - Primeiro acesso error and Criar senha invalid-token states have no `conferir` (textos.test.tsx:95-117 covers form and success only) |
| contraste derivado dos tokens | `web/src/index.css` | Vitest over `index.css`, 3 themes: C14 (interface.test.ts:155-165) over `temas()` | yes |
| `Acesso.tsx` (no new condition) | `web/src/acesso/Acesso.tsx` | none of its own beyond the above: the `isError`, `isPending`, `mensagem` and `pronto` branches already exist (:111, :117, :154, :179); crapper reports 0 above 9.99 | yes |

**Swept `existing` rows, read against the code:**
- validation: `obrigatorio = z.string().min(1)` at `Acesso.tsx:17`, used at :104, :158, :185; test `formulários de acesso exigem só os obrigatórios` at acesso.test.tsx:111. Present.
- authorization: the login posts to `/api/auth/login` at `Acesso.tsx:131`, and the API decides. Present.
- state transitions: `setPronto(true)` at `Acesso.tsx:190`, the `pronto` branch at :179-182; test `definir senha envia o token do link e mostra Senha criada` at acesso.test.tsx:330. Present.

## Faults injected

Each fault ran in the isolated worktree (`git worktree add <scratch>/wtl HEAD`, `web/node_modules` as a junction). For the e2e faults: `npx vite build`, then `npx vite preview --port 4179 --strictPort`, then `E2E_URL=http://localhost:4179`, running only the narrowest proof. After each fault the source was restored and the worktree porcelain was empty.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 grid breakpoint `lg:grid-cols-2` -> `xl:grid-cols-2`. Served bundle marker: `grid min-h-svh xl:grid-cols-2` | `web/src/acesso/Acesso.tsx:37` | yes - `entrada em duas colunas`: "/univag a 1024: largura da coluna: 1024 contra 512" |
| F2 panel items 2 and 3 swapped (ListChecks and Users). Bundle marker: `` [Sy,`Fale com a equipe da instituição quando precisar`],[Hv,`Acompanhe suas solicitações até a resposta`] `` | `web/src/acesso/Acesso.tsx:30-31` | yes - `conteúdo do painel`: item 1 expected "Acompanhe suas solicitações até a resposta", received "Fale com a equipe da instituição quando precisar" |
| F3 vertical centring `items-center` -> `items-start` on the body. Served bundle marker: `flex flex-1 items-start justify-center` | `web/src/acesso/Acesso.tsx:43` | yes - `bloco do formulário por largura`: "/univag a 360: centro vertical: 244 contra 470" |
| F4 contrast input: `:root --muted-foreground` `oklch(0.50 0 0)` -> `oklch(0.66 0 0)` (Vitest reads the source file) | `web/src/index.css:27` | yes - `contraste do painel de entrada`: ":root --muted-foreground: expected 2.88 to be greater than or equal to 4.5" |
| F5 Login `h1` text `instituicao.nome` -> `"One · " + instituicao.nome`. Served bundle marker: `` lo:`One · `+n.nome,des `` | `web/src/acesso/Acesso.tsx:125` | yes - `cabeçalho do Login`: expected "Centro Universitário de Várzea Grande", received "One · Centro Universitário de Várzea Grande" |

**Cleanup.** Port 4179 was confirmed free. The junction was removed with `rmdir`, and `D:\one-system\web\node_modules` is still intact. Then `git worktree remove --force` ran. `git worktree list` shows only `D:/one-system 0b1cb84 [main]`. The real tree's porcelain matches the baseline (`?? .idea/`, `?? .playwright-mcp/`). `git stash` was never used.

## Gate

- `docker compose up -d --build api`: the container serves the HEAD bundle, confirmed by `lg:grid-cols-2` and `Atendimento ao estudante` in `/assets/index-ClewLWmE.js`.
- `cd web && npx vitest run --reporter=verbose`: 34 files, 277 passed, 0 failed.
- `cd web && npx playwright test --reporter=list`: 90 passed, 0 failed (90 listed).
- `python .specs/features/login-institucional/chamadas_iguais.py 1e9e76c`: exit 0. `--autoteste`: exit 0.
- `npm --prefix web run coverage`: 277 passed. Then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0, no function above 9.99.
- dryer (the exact C22 command) piped to `grep -q "No duplicate candidates found"`: exit 0.
- `npm --prefix web run build`: exit 0.
- `mutator`: NOT run, suspended by user decision (AD-025).

## Ranked gaps

1. Criar senha success `Alert` spacing has no check. `## Screens` and AC 7 require 24 px from the `h1` "até o `Alert` de sucesso" on both screens, but C7 measures only Primeiro acesso. This is the shared-component, one-screen pattern from L-059. - C7 - `web/e2e/arranjo.spec.ts:1437-1442` (Primeiro acesso only); plan.md:84
2. The not-found `Alert` is centred "na janela" (plan.md:89, AC 15), but C15 asserts only the horizontal centre. The vertical centre is unproven, and `## Exempted` leaves out only the `Centro` padding and width. Precision gap in C15. - C15 - `web/e2e/arranjo.spec.ts:1562`
3. The Login header "texto centrado" (plan.md:83) covers the description line "Entre com seu CPF e sua senha.", which has no centring check. C6 asserts `text-align: center` on the `h1` only. - C6 - `web/e2e/arranjo.spec.ts:1408-1412`
4. The `Test policy` row "textos visíveis por estado" requires every state of every screen. The Primeiro acesso error state and the Criar senha invalid-token state (plan `## Observable` plan.md:176-177) have no `conferir`, although the Login's refused state does. - C18 - `web/src/acesso/textos.test.tsx:95-117`
