# Interface nova verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: b2e7e79..1d0753f (web/, e2e, `.specs/features/interface-nova/`; `api/` and `dominio-e-contratos` commits, the `api/` rename inside 5cc2ac2 and 0960b70 out of scope)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier); all proofs and faults run in a detached worktree at 1d0753f, e2e against a container built from it (`one-ui-verify`, port 8083)

## Ranked gaps

1. **Header composition breaks at 1280 px and wider for a user with all 3 roles** (`## Screens` row 0, binding). With ALUNO+ATENDENTE+ADMINISTRADOR (the e2e fixture user) at 1280, 1366, 1440 and 1920 px, the "Tema" button box overlaps the "Cadastros" link (the screenshot shows "Cadas" + sun icon + "os"), and the institution name collapses to 0 px wide. ADMINISTRADOR alone and ATENDENTE+ADMINISTRADOR do not overlap. No check measures the bar above 640 px or the position of "Tema"; C19 measures only 639 and 640. Major; this is a composition finding.
2. **Header link labels are hidden from 640 to 1279 px.** `web/src/Autenticado.tsx:78` puts `sm:max-xl:sr-only` on each label. `## Screens` row 0 lists the link texts and says that from 640 px "os links ficam na barra", but at 768 and 1024 px the screen shows 9 bare icons. The builder settled this mid-build (Handoff, lote 1, item 2); the plan never approved it. C27 cannot see the problem because its texts rule runs in jsdom, where the responsive class never applies (`web/src/test/textos.ts:7` drops only a literal `sr-only`). AC 4 ("show every text listed") therefore holds only at 1280 px and wider, which is exactly where gap 1 appears.
3. **Arrangement facts in `## Screens` with no check** (Test policy row "Arranjo" unmet). The live UI matches the design on every one of these; none is measured:
   - Row 0: wordmark and institution on the left, "Tema" and "Menu" on the right, drawer from below.
   - Row 1: wordmark centred (only the notice's `text-align` is asserted).
   - Row 2: error `Alert` below the form, fields stacked.
   - Row 6: date small and on the right, error `Alert` below the composer, 2-line field.
   - Row 9: team card, action buttons wrapping in a row, history as an ordered list.
   - Rows 10, 11 and 13: small buttons in a row. Row 13 says "como a 10", but only its title and "Novo" are measured.
   - Row 14: CSV header in monospace that wraps, result in an `Alert`, error table that wraps the reason.
   - Row 15: small detail under each name.
   - Estados comuns: the 16 px dialog margin is measured only on "Encerrar a conversa?".
4. **8 icons named in `## Visual`/`## Screens` have no assertion**: `Send`, `Hand`, `ShieldAlert`, `Paperclip`, `Plus`, `Sun`, `Moon` (Visual) and `CalendarDays` (rows 10 and 12). The code renders them (`assistente/Assistente.tsx`, `CampoArquivo.tsx`, `Autenticado.tsx`, `Periodo.tsx`), but the checks' "ícones" Coverage row only took the 11 header icons. A grep of every `*.test.*` and `e2e/` file finds only the 11 header classes plus `lucide-file-text`/`lucide-book-text`.
5. **C7 (mutator, AC 8, door 4) is not proven.** It is suspended by user decision (AD-025), not passed. The hand-injected faults below compensate for it.
6. **Fault F5 survived C90's named proofs.** With `import 'bootstrap-icons/font/bootstrap-icons.css'` added to `main.tsx`, both "dependências do kit de interface" and "camada do Bootstrap" stay green. Only `web/src/test/interface.test.ts:95` ("sem Bootstrap nos arquivos") kills it, and that test runs under C1 but is not a C90 proof. This is a precision gap in C90's Proof lines.
7. **Fault F7a survived C48.** Changing `grid-cols-2` to `grid-cols-1` on the 13-card grid still yields 2 x positions, because `col-span-2` on the first card adds an implicit track. The columns come out 151 px and 169 px wide, and C48 never asserts equal columns. Minor.
8. **The literal path lists in C6 and C7 are stale.** This feature added 11 shared root files (`Balao`, `Cabecalho`, `Campo`, `CampoArquivo`, `Confirmar`, `Editor`, `ErroDe`, `Marca`, `Periodo`, `Situacao`, `acao`) that sit outside the door-4 list, while AD-023 says "the 6 slices and the root". Running `dryer` over all 18 root files finds no candidate, so the substance holds, but the mutator never sees these files. Precision gap.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `## Screens` row 0 cabeçalho (plan.md:144) | yes - live UI 360 (bar, drawer, Tema popover), 640/768/1024/1280/1366/1440/1920 px, 3 role sets | code vs design: link labels hidden 640-1279 px (Autenticado.tsx:78); Tema overlaps Cadastros and institution 0 px wide at 1280+ px with 3 roles | wordmark/institution left and Tema/Menu right not measured; drawer from below; bar above 640 px |
| `## Screens` row 1 raiz | yes - 360, 1024 | none | wordmark centring |
| `## Screens` row 2 Login | yes - 360, 1024 | none | error Alert below form; fields stacked |
| `## Screens` rows 3-4 Primeiro acesso, Criar senha | yes - 360, 1024 | none | - |
| `## Screens` row 5 Trocar senha | yes - 360, 1024 | none | title, notice, fields, Salvar order not measured |
| `## Screens` row 6 Assistente | yes - 360, 1024 | none | date small at right; error Alert below composer; 2-line field; Send/Hand/ShieldAlert icons |
| `## Screens` rows 7-8 listas | yes - 360, 1024 | none | - |
| `## Screens` row 9 Detalhe | yes - 360, 1024 | none | team card; action row wraps; history as ordered list |
| `## Screens` row 10 Artigos | yes - 360, 1024 | none | small buttons in a row; Plus and CalendarDays icons |
| `## Screens` row 11 Documentos | yes - 360, 1024 | none | small buttons in a row |
| `## Screens` row 12 Indicadores | yes - 360, 1024 | none | CalendarDays icon; equal column widths (F7a) |
| `## Screens` row 13 Usuários | yes - 360, 1024 | none | "como a 10": selos and buttons in the card not measured |
| `## Screens` row 14 Matrículas | yes - 360, 1024 | none | mono header that wraps; result Alert; error table wraps the reason |
| `## Screens` row 15 Cadastros | yes - 360, 1024 | none | small detail under the name |
| `## Visual` tokens and icons (plan.md:100-133) | yes - plan, `web/src/index.css`, rendered UI | none (tokens C23, contrast C22, theme_color `#2559bf` C93) | icons Send, Hand, ShieldAlert, Paperclip, Plus, Sun, Moon, CalendarDays |
| AD-020 / ROADMAP "Interface nova" (stack, where each lib goes) | yes - STATE.md AD-020/AD-023/AD-025 | none (TanStack Table 8.21.3: door 16 names both v8 `flexRender` and v9; DayPicker 10.0.2 `ptBR` from `react-day-picker/locale`) | - |

Per-screen comparison (live, container `one-ui-verify`, `simularApi` fixture, 360x740 and 1024x740):

- **0 header.** At 360: a 56 px bar with "One" and the truncated institution on the left and Tema and Menu on the right. The drawer comes from below, titled "Menu", with 9 links with icons and "Sair" last. Tema opens Claro/Escuro/Sistema. At 768/1024: icon-only links (gap 2). At 1280+: overlap (gap 1).
- **1 raiz.** "One" and the text, centred. Matches.
- **2 Login.** Card at x 16, fields stacked, full-width "Entrar", centred link. Matches.
- **3/4 Primeiro acesso and Criar senha.** Same card as Login; texts match the row.
- **5 Trocar senha.** Title, fields, hint and a full-width Salvar; 420 px column at 1024. Matches.
- **6 Assistente.** Title and the ShieldAlert notice. The student bubble sits on the right in `bg-primary-subtle`, the assistant bubble on the left in `bg-muted`, with the date on the right. "Isso resolveu?" with Sim/Não sits under the last answer. Then the 2-line field with "Enviar", and a row with "Falar com atendente" and "Encerrar". The column is centred at 1024. Matches.
- **7/8 listas.** Card links with number and badge on one line and the title below; 768 px column. Matches.
- **9 Detalhe.** The title wraps, followed by the badge, the sector line and the team card. The transcript shows the source block (border-top) inside the assistant bubble, and the internal note is in `bg-warning-subtle` with its badge. Then the Dropzone, 44 px buttons, stacked forms and the `ol` history. Matches.
- **10/11 Artigos and Documentos.** Title and "Novo"/"Enviar PDF" on one line, the support text, cards with title and badges side by side, small buttons. Matches.
- **12 Indicadores.** At 360: De/Até in 2 columns, then the calendar button and Consultar. Cards in 2 columns, with "Indicador principal" spanning both. The rankings are stacked, each chart above its Categoria/Total table. At 1024: 4 columns, rankings side by side. Matches.
- **13 Usuários.** Same as row 10. Matches.
- **14 Matrículas.** Title, the mono header that wraps, the Dropzone, a full-width "Importar". Matches.
- **15 Cadastros.** The tabs scroll inside their own strip, and each line is a full-width button. Matches.

Not opened: the dark theme per screen (contrast is proven by C22 on the tokens), and dialogs other than "Encerrar a conversa?" (their texts are covered by the textos checks).

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | A suíte Vitest inteira (99 testes em `<base>`) e o e2e inteiro (11 tes... | `npx vitest run` 161/161; `npx playwright test` 31/31 (E2E_URL :8083) | Vitest JSON reporter: numPassedTests 161, numFailedTests 0, numPendingTests 0; e2e `31 passed`; no `.skip(`/`.only(` added: `.specs/features/interface-nova/seletores_conferem.py:90` (autoteste kills an added `.only(`; the run at b2e7e79 is clean) | PASS |
| C2 | `.specs/features/interface-nova/seletores_conferem.py <base>` sai 0: t... | `seletores_conferem.py --autoteste` ok; `b2e7e79` exit 0, 0 problema | `.specs/features/interface-nova/seletores_conferem.py:116` - `return 1 if problemas else 0` | PASS |
| C3 | Cada chamada `getByRole(`, `findByRole(`, `queryByRole(`, `getAllByRol... | `consultas_preservadas.py --autoteste` ok; `b2e7e79` exit 0, 389 consultas, 0 problema | `.specs/features/interface-nova/consultas_preservadas.py:78` - `return 1 if problemas else 0` | PASS |
| C4 | Rodando a suíte Vitest de `<base>` e a de HEAD, cada uma num `git work... | `chamadas_iguais.py --autoteste` ok; `b2e7e79` exit 0, 99 testes, 0 problema (Bootstrap `--no-save`, pruned after) | `.specs/features/interface-nova/chamadas_iguais.py:136` - `return 1 if problemas or not antes else 0` | PASS |
| C5 | O `crapper` sobre `web/src` inteiro, `ui/` incluído, sai 0 no limite 9... | `npm run coverage` exit 0; `crapper -s src --threshold 9.99` exit 0 | crapper over `src` incl. `ui/`, exit 0; worst `web/src/Periodo.tsx:1` `Periodo` CRAP 8.1 (< 9.99) | PASS |
| C6 | O `dryer` sobre as 6 fatias e os 7 arquivos da raiz da door 4 não acha... | `dryer` door-4 paths: "No duplicate candidates found"; rerun with all 18 root files: same | `web/src/Balao.tsx:1` - extended run includes the 11 shared root files outside the door-4 list; no candidate | PASS |
| C7 | `.specs/features/interface-nova/mutator_web.sh` é o `mutator_web.sh` d... | not run - AD-025 | `.specs/features/interface-nova/mutator_web.sh:13` - path list present; tool not executed | suspended by user decision (AD-025) - not proven |
| C8 | O describe "sem rolagem horizontal a 360 px" de `plataforma.spec.ts` t... | `playwright test e2e/plataforma.spec.ts -g "sem rolagem horizontal a 360 px"` 15/15 | `web/e2e/plataforma.spec.ts:67` - `expect(largura).toBeLessThanOrEqual(360)` (15 named tests listed and run) | PASS |
| C9 | Todo valor de `dependencies` e `devDependencies` de `web/package.json`... | `src/test/interface.test.ts` `73` 1/1 passed | `web/src/test/interface.test.ts:74` - `expect(Object.entries(todas).filter(([, versao]) => !/^\d+\.\d+\.\d+$/.test(vers` | PASS |
| C10 | Depois de `npm --prefix web run build`, todo arquivo `.js`, `.css`, `.... | `npm run build` exit 0; `precache_completo.py api/wwwroot` 17 URLs, 0 problema; `--autoteste` ok | `.specs/features/interface-nova/precache_completo.py:48` - `return 1 if problemas or not urls else 0` | PASS |
| C11 | Nenhum arquivo de `web/src` importa `@/ui/select`, `@/ui/alert-dialog`... | `src/test/interface.test.ts` `180` 1/1 passed; `src/test/interface.test.ts` `186` 1/1 passed | `web/src/test/interface.test.ts:182` - `expect(arquivos.filter((a) => Proibido.test(texto(a)))).toEqual([])` · `web/src/test/interface.test.ts:192` - `expect([tipo('De'), tipo('Até')]).toEqual(['date', 'date'])` | PASS |
| C12 | `vite.config.ts` tem `plugins: [react(), tailwindcss(), VitePWA(` ness... | `src/test/interface.test.ts` `85` 1/1 passed | `web/src/test/interface.test.ts:86` - `expect(semEspacos(vite)).toContain('plugins:[react(),tailwindcss(),VitePWA(')` | PASS |
| C13 | Enquanto algum arquivo de `web/src` importa `react-bootstrap`, `index.... | `src/test/interface.test.ts` `100` 1/1 passed | `web/src/test/interface.test.ts:103` - `expect(css.startsWith('@layer theme, base, bootstrap, components, utilities;')).` | PASS |
| C14 | As pastas de `web/src` são exatamente as 6 fatias, `test` e `ui`; `cn`... | `src/test/estrutura.test.ts` `28` 1/1 passed | `web/src/test/estrutura.test.ts:30` - `expect(pastas).toEqual([...Fatias, 'ui'])` | PASS |
| C15 | `.specs/features/interface-nova/ui_isolada.sh` planta, um por vez, `we... | `bash ui_isolada.sh` exit 0 (4 plants fail the test, clean passes) | `.specs/features/interface-nova/ui_isolada.sh:15` - `FALHA: o teste passou com o import` | PASS |
| C16 | Para `ALUNO`, `ATENDENTE` e `ADMINISTRADOR`, a tela tem exatamente 1 `... | `src/acesso/acesso.test.tsx` `162` 1/1 passed | `web/src/acesso/acesso.test.tsx:172` - `expect(navs, papel).toHaveLength(1)` | PASS |
| C17 | Cada link do cabeçalho traz o ícone Lucide de `## Visual` (`lucide-mes... | `src/acesso/acesso.test.tsx` `182` 1/1 passed | `web/src/acesso/acesso.test.tsx:199` - `expect(svg, rotulo).toHaveClass(classe)` | PASS |
| C18 | A 360 × 740 com os 3 papéis, a barra `<nav>` tem 56 px de altura e o t... | `e2e/arranjo.spec.ts` `57` 1/1 passed | `web/e2e/arranjo.spec.ts:63` - `expect((await caixa(nav)).height).toBeCloseTo(56, 0)` | PASS |
| C19 | Com 640 px de largura, os 9 links e "Sair" estão visíveis dentro do `<... | `e2e/arranjo.spec.ts` `84` 1/1 passed | `web/e2e/arranjo.spec.ts:90` - `await expect(sair).toBeVisible()` | PASS |
| C20 | Com `GET /api/auth/me` respondendo 500, o `fetch` dessa URL é chamado ... | `src/acesso/acesso.test.tsx` `212` 1/1 passed | `web/src/acesso/acesso.test.tsx:218` - `expect(await screen.findByLabelText('CPF')).toBeInTheDocument()` | PASS |
| C21 | Em `/univag`, `getComputedStyle(document.body).fontFamily` começa com ... | `e2e/arranjo.spec.ts` `106` 1/1 passed | `web/e2e/arranjo.spec.ts:112` - `expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).to` | PASS |
| C22 | Convertendo os valores `oklch` de `index.css` para sRGB, o contraste é... | `src/test/interface.test.ts` `113` 1/1 passed | `web/src/test/interface.test.ts:122` - `expect(contraste(t[frente], t[fundo]), `${seletor} ${frente}/${fundo}`).toBeGrea` | PASS |
| C23 | `index.css` declara em `:root` e em `.dark` os 13 tokens de `## Visual... | `src/test/interface.test.ts` `126` 1/1 passed | `web/src/test/interface.test.ts:129` - `expect(claro[token], `:root ${token}`).toBe(valorClaro)` | PASS |
| C24 | "dependências do kit de interface" afirma com `toBe` a versão exata de... | `src/acesso/acesso.test.tsx` `120` 1/1 passed | `web/src/acesso/acesso.test.tsx:122` - `for (const saiu of ['bootstrap', 'react-bootstrap', 'bootstrap-icons']) expect(t` | PASS |
| C25 | `App.tsx` monta `QueryClientProvider`, `ThemeProvider`, `MotionConfig`... | `src/test/interface.test.ts` `138` 1/1 passed | `web/src/test/interface.test.ts:140` - `expect(texto('App.tsx'), provedor).toContain(provedor)` | PASS |
| C26 | Enquanto algum arquivo de `web/src` importa `react-bootstrap`, com `ma... | `src/test/interface.test.ts` `148` 1/1 passed | `web/src/test/interface.test.ts:155` - `expect(document.documentElement, `escuro ${escuro}`).toHaveClass('light')` | PASS |
| C27 | Textos da tela 0 (cabeçalho) pela regra dos textos, nos estados: carre... | `src/acesso/textos.test.tsx` `12` 1/1 passed | `web/src/acesso/textos.test.tsx:12` + `web/src/test/textos.ts:23` - `expect(sobra(texto, [...literais, ...extras])).toEqual([])`; jsdom has no media query, so `sm:max-xl:sr-only` (`web/src/Autenticado.tsx:78`) never hides the link labels here - see Binding sources row 0 | PASS |
| C28 | A conversa fica dentro de um `role="log"`; a mensagem do aluno fica nu... | `src/assistente/conversa.test.tsx` `182` 1/1 passed; `src/assistente/conversa.test.tsx` `28` 1/1 passed; `src/assistente/conversa.test.tsx` `142` 1/1 passed | `web/src/assistente/conversa.test.tsx:186` - `expect(await log.findByText('É do semestre atual?')).toBeInTheDocument()` · `web/src/assistente/conversa.test.tsx:30` - `expect(await screen.findByText(Exemplo)).toBeInTheDocument()` | PASS |
| C29 | Com a resposta `"**negrito**\n- item\n<b>x</b> &amp;"`, o balão do ass... | `src/assistente/conversa.test.tsx` `195` 1/1 passed | `web/src/assistente/conversa.test.tsx:200` - `expect(texto.textContent).toBe(Modelo)` | PASS |
| C30 | Enquanto a resposta não chega, aparecem o status de nome "Digitando" e... | `src/assistente/conversa.test.tsx` `39` 1/1 passed | `web/src/assistente/conversa.test.tsx:42` - `expect(await screen.findByRole('status', { name: 'Digitando' })).toBeInTheDocume` | PASS |
| C31 | "Falar com atendente" tem a classe `bg-primary` (variante `default`) d... | `src/assistente/assistente.test.tsx` `63` 1/1 passed; `src/assistente/assistente.test.tsx` `83` 1/1 passed; `src/assistente/assistente.test.tsx` `114` 1/1 passed | `web/src/assistente/assistente.test.tsx:66` - `expect(falar()).toHaveClass('bg-background')` · `web/src/assistente/assistente.test.tsx:90` - `expect(await screen.findByText('Quer explicar melhor ou falar com um atendente?'` | PASS |
| C32 | A 360 × 740, com 4 mensagens de respostas longas e `scrollHeight` acim... | `e2e/arranjo.spec.ts` `121` 1/1 passed | `web/e2e/arranjo.spec.ts:126` - `await expect(page.locator('.is-assistant')).toHaveCount(n)` | PASS |
| C33 | Com `reducedMotion: 'reduce'`, amostrando o balão novo a cada quadro p... | `e2e/arranjo.spec.ts` `139` 1/1 passed | `web/e2e/arranjo.spec.ts:145` - `expect(amostras.length).toBeGreaterThan(0)` | PASS |
| C34 | Sem redução de movimento, nas mesmas amostras o balão novo tem ao meno... | `e2e/arranjo.spec.ts` `149` 1/1 passed | `web/e2e/arranjo.spec.ts:156` - `expect(deslocamentos.some((y) => y > 0 && y <= 8)).toBe(true)` | PASS |
| C35 | Com `onlineManager.setOnline(false)` e o `fetch` rejeitando com `TypeE... | `src/assistente/conversa.test.tsx` `205` 1/1 passed | `web/src/assistente/conversa.test.tsx:216` - `expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch')` | PASS |
| C36 | `web/src/ui/conversation.tsx` e `web/src/ui/message.tsx` existem; `mes... | `src/test/interface.test.ts` `163` 1/1 passed | `web/src/test/interface.test.ts:164` - `expect(arquivos).toEqual(expect.arrayContaining(['ui/conversation.tsx', 'ui/mess` | PASS |
| C37 | Textos da tela 6 (Assistente) pela regra dos textos, nos estados: sem ... | `src/assistente/textos.test.tsx` `70` 1/1 passed | `web/src/assistente/textos.test.tsx:77` - `expect(campo).toHaveAttribute('placeholder', 'Escreva sua dúvida')` | PASS |
| C38 | Arranjo da tela 6: a 360 px, de cima para baixo, título, aviso, `log` ... | `e2e/arranjo.spec.ts` `161` 1/1 passed | `web/e2e/arranjo.spec.ts:171` - `expect(aviso.y).toBeGreaterThanOrEqual(titulo.y + titulo.height - 1)` | PASS |
| C39 | No detalhe, a mensagem pública do aluno tem `ms-auto` e `bg-primary-su... | `src/chamados/resposta.test.tsx` `116` 1/1 passed; `src/chamados/resposta.test.tsx` `143` 1/1 passed | `web/src/chamados/resposta.test.tsx:130` - `expect(within(publica).getByRole('link', { name: 'boleto.pdf' })).toHaveAttribut` · `web/src/chamados/resposta.test.tsx:158` - `expect((await screen.findByText('quantas horas?')).closest('.is-user, .is-assist` | PASS |
| C40 | A fonte de documento traz o ícone de nome "Documento" com a classe `lu... | `src/chamados/chamado.test.tsx` `91` 1/1 passed | `web/src/chamados/chamado.test.tsx:116` - `expect(within(doc).getByRole('img', { name: 'Documento' })).toHaveClass('lucide-` | PASS |
| C41 | Com relógio falso no detalhe, `GET /api/chamados/ONE-1` foi chamado 1 ... | `src/chamados/chamado.test.tsx` `125` 1/1 passed | `web/src/chamados/chamado.test.tsx:134` - `expect(leituras()).toBe(1)` after 14 999 ms · `:136` `toBe(2)` after +1 ms · `:138` `toBe(3)` after +15 000 ms | PASS |
| C42 | "Anexos (PDF, JPG ou PNG, até 10 MB cada)" acha um `<input type="file"... | `src/chamados/resposta.test.tsx` `57` 1/1 passed; `src/chamados/chamado.test.tsx` `170` 1/1 passed | `web/src/chamados/resposta.test.tsx:60` - `expect(campo).toHaveAttribute('type', 'file')` · `web/src/chamados/chamado.test.tsx:180` - `expect(screen.getByLabelText('Responder')).toHaveValue('Seu boleto está no Porta` | PASS |
| C43 | Textos da tela 9 (detalhe do chamado) pela regra dos textos, nos estad... | `src/chamados/textos.test.tsx` `92` 1/1 passed | `web/src/chamados/textos.test.tsx:98` - `expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocum` | PASS |
| C44 | Arranjo da tela 9: a 360 px, o título não passa da largura da tela, ca... | `e2e/arranjo.spec.ts` `211` 1/1 passed | `web/e2e/arranjo.spec.ts:218` - `expect(titulo.x).toBeGreaterThanOrEqual(0)` | PASS |
| C45 | Depois de `npm --prefix web run build`, o `.js` de entrada que o `inde... | build + `recharts_separado.py api/wwwroot` 0 problema; `--autoteste` ok | `.specs/features/interface-nova/recharts_separado.py:58` - `sys.exit(1 if problemas else 0)` | PASS |
| C46 | Com 1 categoria no ranking, o cartão "Categorias por conversas" tem um... | `src/indicadores/indicadores.test.tsx` `101` 1/1 passed | `web/src/indicadores/indicadores.test.tsx:104` - `await waitFor(() => expect(grafico(conversas)).not.toBeNull())` | PASS |
| C47 | Com o ranking vazio, o cartão mostra "—" e não tem `.recharts-responsi... | `src/indicadores/indicadores.test.tsx` `111` 1/1 passed; `src/indicadores/indicadores.test.tsx` `32` 1/1 passed | `web/src/indicadores/indicadores.test.tsx:113` - `await waitFor(async () => expect(grafico(await cartao('Categorias por conversas'` · `web/src/indicadores/indicadores.test.tsx:44` - `expect(await cartao('Indicador principal')).toBe('Indicador principal12,3%')` | PASS |
| C48 | Os 13 cartões, com "Indicador principal" primeiro, ocupam 2 posições x... | `e2e/arranjo.spec.ts` `249` 1/1 passed | `web/e2e/arranjo.spec.ts:260` - `expect(xs.size, `${largura} px`).toBe(colunas)` | PASS |
| C49 | Com o relógio em 10/11/2026, abrir "Escolher período no calendário" e ... | `src/indicadores/indicadores.test.tsx` `139` 1/1 passed | `web/src/indicadores/indicadores.test.tsx:145` - `expect(screen.getByLabelText('De')).toHaveValue('2026-11-03')` | PASS |
| C50 | O calendário dos Indicadores mostra "novembro" e "2026" no título do m... | `src/indicadores/indicadores.test.tsx` `155` 1/1 passed | `web/src/indicadores/indicadores.test.tsx:159` - `expect(calendario).toHaveTextContent('novembro')` | PASS |
| C51 | Cada ranking tem uma `table` com os `columnheader` "Categoria" e "Tota... | `src/indicadores/indicadores.test.tsx` `120` 1/1 passed | `web/src/indicadores/indicadores.test.tsx:124` - `expect(within(tabela).getAllByRole('columnheader').map((h) => h.textContent)).to` | PASS |
| C52 | `useReactTable` só aparece em `web/src/indicadores/Indicadores.tsx` e ... | `src/test/interface.test.ts` `172` 1/1 passed | `web/src/test/interface.test.ts:175` - `expect(['indicadores/Indicadores.tsx', 'administracao/Matriculas.tsx']).toEqual(` | PASS |
| C53 | Textos da tela 12 (Indicadores) pela regra dos textos, nos estados: se... | `src/indicadores/textos.test.tsx` `41` 1/1 passed | `web/src/indicadores/textos.test.tsx:62` - `expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao calcular.')` | PASS |
| C54 | Arranjo da tela 12: a 360 px, "De" e "Até" na mesma linha, o botão de ... | `e2e/arranjo.spec.ts` `274` 1/1 passed | `web/e2e/arranjo.spec.ts:286` - `expect(mesmaLinha(c.de, c.ate)).toBe(true)` | PASS |
| C55 | Cada chamado das listas é 1 link para `/univag/chamados/{número}` com ... | `src/chamados/listas.test.tsx` `13` 1/1 passed; `src/chamados/listas.test.tsx` `33` 1/1 passed | `web/src/chamados/listas.test.tsx:23` - `expect(primeiro).toHaveAttribute('href', '/univag/chamados/ONE-1')` · `web/src/chamados/listas.test.tsx:37` - `expect(item).toHaveAttribute('href', '/univag/chamados/ONE-3')` | PASS |
| C56 | Com `onlineManager.setOnline(false)` e o `fetch` rejeitando com `TypeE... | `src/chamados/listas.test.tsx` `59` 1/1 passed | `web/src/chamados/listas.test.tsx:68` - `expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch')` | PASS |
| C57 | Textos da tela 7 (Minhas solicitações) pela regra dos textos, nos esta... | `src/chamados/textos.test.tsx` `173` 1/1 passed | `web/src/chamados/textos.test.tsx:173` + `web/src/test/textos.ts:23` - `expect(sobra(texto, [...literais, ...extras])).toEqual([])`, `:28` all literals seen | PASS |
| C58 | Textos da tela 8 (Fila) pela regra dos textos, nos estados: carregando... | `src/chamados/textos.test.tsx` `178` 1/1 passed | `web/src/chamados/textos.test.tsx:178` + `web/src/test/textos.ts:23` - `expect(sobra(texto, [...literais, ...extras])).toEqual([])`, `:28` all literals seen | PASS |
| C59 | Arranjo das telas 7 e 8: a 360 px, cada cartão tem a largura da lista,... | `e2e/arranjo.spec.ts` `306` 1/1 passed | `web/e2e/arranjo.spec.ts:315` - `expect(Math.abs(c.width - lista.width), caminho).toBeLessThanOrEqual(1)` | PASS |
| C60 | Nos 4 formulários de acesso, cada um dos 6 campos obrigatórios (Login ... | `src/acesso/acesso.test.tsx` `84` 1/1 passed | `web/src/acesso/acesso.test.tsx:98` - `await waitFor(() => expect(screen.getByLabelText(vazio)).toHaveAttribute('aria-i` | PASS |
| C61 | Textos da tela 1 (raiz `/`) pela regra dos textos, com o wordmark "One... | `src/acesso/textos.test.tsx` `51` 1/1 passed | `web/src/acesso/textos.test.tsx:51` + `web/src/test/textos.ts:23` - `expect(sobra(texto, [...literais, ...extras])).toEqual([])`, `:28` all literals seen | PASS |
| C62 | Textos da tela 2 (Login) pela regra dos textos, nos estados: carregand... | `src/acesso/textos.test.tsx` `59` 1/1 passed | `web/src/acesso/textos.test.tsx:64` - `expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocum` | PASS |
| C63 | Textos da tela 3 (Primeiro acesso) pela regra dos textos, nos estados:... | `src/acesso/textos.test.tsx` `86` 1/1 passed | `web/src/acesso/textos.test.tsx:86` + `web/src/test/textos.ts:23` - `expect(sobra(texto, [...literais, ...extras])).toEqual([])`, `:28` all literals seen | PASS |
| C64 | Textos da tela 4 (Criar senha) pela regra dos textos, nos estados: for... | `src/acesso/textos.test.tsx` `98` 1/1 passed | `web/src/acesso/textos.test.tsx:98` + `web/src/test/textos.ts:23` - `expect(sobra(texto, [...literais, ...extras])).toEqual([])`, `:28` all literals seen | PASS |
| C65 | Textos da tela 5 (Trocar senha) pela regra dos textos, com e sem a sen... | `src/acesso/textos.test.tsx` `110` 1/1 passed | `web/src/acesso/textos.test.tsx:110` + `web/src/test/textos.ts:23` - `expect(sobra(texto, [...literais, ...extras])).toEqual([])`, `:28` all literals seen | PASS |
| C66 | Arranjo das telas 1 a 5: a raiz tem `text-align: center`; Login, Prime... | `e2e/arranjo.spec.ts` `330` 1/1 passed | `web/e2e/arranjo.spec.ts:338` - `expect(await aviso.evaluate((e) => getComputedStyle(e).textAlign), 'raiz').toBe(` | PASS |
| C67 | Salvar, ativar e arquivar um artigo com sucesso mostram "Artigo salvo.... | `src/conhecimento/edicao.test.tsx` `172` 1/1 passed | `web/src/conhecimento/edicao.test.tsx:183` - `expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextC` | PASS |
| C68 | Enviar e arquivar um documento com sucesso mostram "Documento enviado.... | `src/conhecimento/edicao.test.tsx` `198` 1/1 passed | `web/src/conhecimento/edicao.test.tsx:211` - `await waitFor(() => expect(avisos()).toHaveTextContent('Documento enviado.'))` | PASS |
| C69 | Digitar "Faltas não são abonadas." em "Resposta" e salvar manda `respo... | `src/conhecimento/artigos.test.tsx` `9` 1/1 passed | `web/src/conhecimento/artigos.test.tsx:18` - `expect(await screen.findByText('Nenhum item cadastrado.')).toBeInTheDocument()` | PASS |
| C70 | Digitar `<b>x</b> &amp; **y**`, Enter e `fim` em "Resposta" e salvar m... | `src/conhecimento/edicao.test.tsx` `226` 1/1 passed | `web/src/conhecimento/edicao.test.tsx:235` - `expect(gravadas(chamadas)[0][2].resposta).toBe('<b>x</b> &amp; **y**
fim')` | PASS |
| C71 | Abrir para edição e salvar sem mudar manda no `PUT` a `resposta` carre... | `src/conhecimento/edicao.test.tsx` `239` 1/1 passed | `web/src/conhecimento/edicao.test.tsx:242` - `expect(await salvo(chamadas), JSON.stringify(resposta)).toBe(resposta)` | PASS |
| C72 | Colar em "Resposta" `text/html` `<b>negrito</b> e <i>itálico</i>` com ... | `src/conhecimento/edicao.test.tsx` `248` 1/1 passed | `web/src/conhecimento/edicao.test.tsx:252` - `await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('textbox` | PASS |
| C73 | `getByRole('textbox', { name: 'Resposta' })` acha o editor, com `aria-... | `src/conhecimento/edicao.test.tsx` `258` 1/1 passed | `web/src/conhecimento/edicao.test.tsx:262` - `expect(campo).toHaveAttribute('aria-multiline', 'true')` | PASS |
| C74 | Com 7 999 caracteres carregados em "Resposta", digitar `bc` e salvar m... | `src/conhecimento/edicao.test.tsx` `267` 1/1 passed | `web/src/conhecimento/edicao.test.tsx:274` - `expect(await salvo(chamadas)).toBe('a'.repeat(7999) + 'b')` | PASS |
| C75 | Com o relógio em 10/11/2026, "Escolher validade no calendário" com os ... | `src/conhecimento/edicao.test.tsx` `282` 1/1 passed | `web/src/conhecimento/edicao.test.tsx:296` - `expect(d.getByLabelText('Válido de (opcional)')).toHaveValue('2026-11-03')` | PASS |
| C76 | `web/package.json` lista com versão exata `@tiptap/react`, `@tiptap/pm... | `src/test/interface.test.ts` `79` 1/1 passed | `web/src/test/interface.test.ts:81` - `expect(todas[nome], nome).toMatch(/^\d+\.\d+\.\d+$/)` | PASS |
| C77 | "Arquivo PDF" acha um `<input type="file" accept=".pdf,application/pdf... | `src/conhecimento/edicao.test.tsx` `310` 1/1 passed | `web/src/conhecimento/edicao.test.tsx:315` - `expect(campo).toHaveAttribute('type', 'file')` | PASS |
| C78 | Textos da tela 10 (Artigos) pela regra dos textos, nos estados: vazia,... | `src/conhecimento/textos.test.tsx` `55` 1/1 passed | `web/src/conhecimento/textos.test.tsx:91` - `await waitFor(() => expect(avisos()).toHaveTextContent('Artigo salvo.'))` | PASS |
| C79 | Textos da tela 11 (Documentos) pela regra dos textos, nos estados: lis... | `src/conhecimento/textos.test.tsx` `112` 1/1 passed | `web/src/conhecimento/textos.test.tsx:137` - `await waitFor(() => expect(avisos()).toHaveTextContent('Documento enviado.'))` | PASS |
| C80 | Arranjo das telas 10 e 11: a 360 px, o título e "Novo"/"Enviar PDF" na... | `e2e/arranjo.spec.ts` `377` 1/1 passed | `web/e2e/arranjo.spec.ts:388` - `expect(naMesmaLinha(h1, await caixa(page.getByRole('button', { name: botao }))),` | PASS |
| C81 | Salvar e desativar um usuário com sucesso mostram "Usuário salvo." e "... | `src/administracao/usuarios.test.tsx` `95` 1/1 passed | `web/src/administracao/usuarios.test.tsx:105` - `expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextC` | PASS |
| C82 | Salvar um registro em Cadastros com sucesso mostra "Cadastro salvo."; ... | `src/administracao/cadastros.test.tsx` `182` 1/1 passed | `web/src/administracao/cadastros.test.tsx:189` - `expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextC` | PASS |
| C83 | A 360 px em Cadastros, a `tablist` tem `overflow-x` `auto`, rolar até ... | `e2e/arranjo.spec.ts` `414` 1/1 passed | `web/e2e/arranjo.spec.ts:420` - `expect(await abas.evaluate((e) => getComputedStyle(e).overflowX)).toBe('auto')` | PASS |
| C84 | Com 2 erros de importação, a tabela tem os `columnheader` "Linha" e "M... | `src/administracao/admin.test.tsx` `116` 1/1 passed; `src/administracao/admin.test.tsx` `10` 1/1 passed | `web/src/administracao/admin.test.tsx:126` - `expect(within(tabela).getAllByRole('columnheader').map((h) => h.textContent)).to` · `web/src/administracao/admin.test.tsx:21` - `expect(await screen.findByText('O arquivo tem linhas inválidas; nenhuma linha fo` | PASS |
| C85 | "Arquivo CSV" acha um `<input type="file" accept=".csv,text/csv">` sem... | `src/administracao/admin.test.tsx` `136` 1/1 passed | `web/src/administracao/admin.test.tsx:140` - `expect(campo).toHaveAttribute('type', 'file')` | PASS |
| C86 | Textos da tela 13 (Usuários) pela regra dos textos, nos estados: carre... | `src/administracao/textos.test.tsx` `45` 1/1 passed | `web/src/administracao/textos.test.tsx:53` - `expect(await within(await screen.findByRole('main')).findByRole('status', { name` | PASS |
| C87 | Textos da tela 14 (Matrículas) pela regra dos textos, nos estados: ini... | `src/administracao/textos.test.tsx` `98` 1/1 passed | `web/src/administracao/textos.test.tsx:98` + `web/src/test/textos.ts:23` - `expect(sobra(texto, [...literais, ...extras])).toEqual([])`, `:28` all literals seen | PASS |
| C88 | Textos da tela 15 (Cadastros) pela regra dos textos, nas 5 abas, vazia... | `src/administracao/textos.test.tsx` `132` 1/1 passed | `web/src/administracao/textos.test.tsx:161` - `await waitFor(() => expect(within(screen.getByRole('tabpanel', { name: titulo })` | PASS |
| C89 | Arranjo das telas 13 a 15: a 360 px, "Usuários" e "Novo" na mesma linh... | `e2e/arranjo.spec.ts` `432` 1/1 passed | `web/e2e/arranjo.spec.ts:437` - `expect(naMesmaLinha(await caixa(page.getByRole('heading', { name: 'Usuários' }))` | PASS |
| C90 | Nenhum arquivo de `web/src` importa `react-bootstrap` nem `bootstrap-i... | `src/acesso/acesso.test.tsx` `120` 1/1 passed; `src/test/interface.test.ts` `100` 1/1 passed | `web/src/acesso/acesso.test.tsx:122` - absence of the 3 packages · `web/src/test/interface.test.ts:108` - `expect(css).not.toContain('bootstrap')`; the 'no file imports bootstrap-icons' half is asserted only at `web/src/test/interface.test.ts:96` ('sem Bootstrap nos arquivos', not a named proof - see fault F5) | PASS |
| C91 | O botão "Tema" do cabeçalho oferece "Claro", "Escuro" e "Sistema"; esc... | `src/acesso/acesso.test.tsx` `135` 1/1 passed | `web/src/acesso/acesso.test.tsx:142` - `expect(localStorage.getItem('one-tema'), rotulo).toBe(valor)` | PASS |
| C92 | Sem `one-tema` gravado, `<html>` recebe `dark` com `matchMedia('(prefe... | `src/acesso/acesso.test.tsx` `149` 1/1 passed | `web/src/acesso/acesso.test.tsx:156` - `expect(document.documentElement).toHaveClass(escuro ? 'dark' : 'light')` | PASS |
| C93 | O `theme_color` do manifesto em `vite.config.ts` e o `content` de `<me... | `src/test/interface.test.ts` `221` 1/1 passed | `web/src/test/interface.test.ts:224` - `expect(vite.match(/theme_color:\s*'([^']+)'/)![1]).toBe(hex)` | PASS |
| C94 | Nenhum arquivo de `web/src` declara nem importa `useAcao`, `useLista`,... | `src/test/interface.test.ts` `230` 1/1 passed | `web/src/test/interface.test.ts:232` - `for (const nome of ['use' + 'Acao', 'use' + 'Lista', 'use' + 'Base', 'use' + 'Li` | PASS |

Every Vitest proof filter was checked against the JSON reporter output. Each of the 80 `-t` filters selects exactly 1 test, and that test passed; none selects 0 (L-002). Each Playwright `-g` filter selects exactly 1 test, except C8, which selects its 15 named screens; `--list` shows 31 tests.

Settled builder items, checked:

- `@tanstack/react-table` is `8.21.3` (`web/package.json:17`), and `useReactTable` appears only in the 2 files (C52).
- The temporary `@layer base` utility block is gone. It had 19 rule lines at 5cc2ac2 and has 2 at f3eb39d and HEAD (`web/src/index.css:91-98`, now only shadcn's `border-border`/`bg-background`).
- `Balao.tsx` and the other shared root files sit outside the door-4 list (gap 8).
- `toast.dismiss()` runs after each test (`web/src/test/setup.ts:19`).
- Exactly 3 `vi.advanceTimersByTime` lines became `await vi.advanceTimersByTimeAsync` with the same numbers (`web/src/assistente/transferencia.test.tsx:89,91,93`). The change is recorded in `seletores.md`, and no `expect` changed.
- `useChamado` uses `refetchInterval: IntervaloAtualizacao` (`web/src/chamado.ts:43,53`, 15 000 ms).

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| plan criteria (61) | plan.md `## Criteria` | 60 mapped as in checks.md and re-traced to the rows above | AC 8 (C7 suspended, AD-025); AC 4 for row 0 at 640-1279 px (labels hidden, gap 2) |
| one-way doors (16) | plan.md `## Landing` | 15 complete | door 4 mutator half (C7 suspended); door 4 path list misses 11 new root files (gap 8) |
| Screens texts (16 screens) | plan.md `## Screens` "Texto" column, every literal compared to the literal lists in the 6 `textos.test.tsx` | 16/16; template literals (`triagem · inativo`, `{categoria} · versão {n}...`) present as their pieces | - |
| Screens arrangement facts (16 screens) | plan.md `## Screens` "Arranjo" column, enumerated per screen | measured facts in C18, C19, C32, C38, C44, C48, C54, C59, C66, C80, C83, C89 | the facts listed in gap 3; header above 640 px (gaps 1, 2) |
| no horizontal scroll at 360 px (15) | plan.md `## Screens` rows 1-15 | C8, 15 named tests ran | - |
| Lucide icons (18 Visual + CalendarDays) | plan.md `## Visual` and rows 10, 12 | 11 header icons C17; FileText, BookText sources C40 | Send, Hand, ShieldAlert, Paperclip, Plus, Sun, Moon, CalendarDays |
| new texts (17) and ptBR names (2 calendars) | `## Screens` *(novo)* marks | as in checks.md (C18, C27, C49-C51, C53, C67, C68, C75, C78, C81, C82, C91) | - |
| QueryClient options (5) | `web/src/App.tsx:23-24` | C20, C35, C56 | - |
| refetch edges (3) | `web/src/chamado.ts:43` | C41 at 14 999 / 15 000 / 30 000 ms | - |
| file fields (3), date fields (4), TanStack tables (3) | doors 5, 11, 15, 16 | C11, C42, C77, C85, C49, C75, C51, C84 | - |
| access required fields (6) | `web/src/acesso/Acesso.tsx` `min(1)` fields | C60, table-driven over 6 | - |
| article round-trip (8), Resposta limit (2) | AC 56, AC 59 | C71, C74 | - |
| Bootstrap branch (2) | `web/src/test/interface.test.ts:19` `comBootstrap` | without-Bootstrap branch C13, C26, C90 at HEAD; the with-Bootstrap branch is no longer reachable after S9 | - |
| startup assemblies (2) | `web/src/main.tsx`, `web/src/test/util.tsx` | C25 | - |
| AD-018 barriers (3) | door 4 | crapper C5, dryer C6 | mutator C7 (suspended by user decision) |
| build outputs (2) | `vite build` | C10, C45 | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Tela que decide | `assistente/Assistente.tsx`, `acesso/Acesso.tsx`, `conhecimento/*`, `administracao/*` toasts | Vitest through `abrir` with mocked `fetch` (C31, C60, C67, C68, C81, C82) | yes |
| Arranjo e medidas da tela | all 15 screens + header | Playwright at 360 and 1024, every arrangement fact measured | not met - the facts in gap 3 have no measurement; the header above 640 px is unmeasured and holds a real defect (gap 1) |
| Regra sobre código-fonte | `test/interface.test.ts`, `test/estrutura.test.ts` | one case per member | yes, except C90, whose import half sits in an unnamed test (gap 6) |
| Saída do build e comparação com base | 5 scripts with `--autoteste` | full list, no sampling | yes - all 5 autotests ok; full-list runs 0 problema |
| Código copiado para `ui/` | `web/src/ui/*` | none; crapper | yes - crapper exit 0 over `src` incl. `ui/` |

Swept rows that resolve to existing all hold:

- authorization: `web/src/acesso/acesso.test.tsx:25` (404) and `:68` (401) exist.
- concurrency: "conflito relê o chamado e mostra o detail" exists and passed (`web/src/chamados/acoes.test.tsx:70`).
- observability: the "manifesto e service worker" e2e passed.

## Faults injected

All faults ran in the scratch worktree. Each was reverted with `git checkout -- <file>`, and `git status --porcelain` was clean after each one. The mutator is suspended by user decision (AD-025) and was not run.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 required text dropped: "Troque a senha temporária para continuar." becomes "...provisória..." | `web/src/acesso/Acesso.tsx:178` | yes - C65 `textos Trocar senha` 1 failed |
| F2 stray new visible text " Atualizado agora" in the Fila empty state | `web/src/chamados/Chamados.tsx:59` | yes - C58 `textos Fila` 1 failed |
| F3 Tiptap saves markup: `editor.getText({ blockSeparator })` becomes `editor.getHTML()` | `web/src/conhecimento/Resposta.tsx:24` | yes - C70 failed (C71 stays green as expected: no `onUpdate` without an edit) |
| F4 refetch interval 15 000 becomes 16 000 ms | `web/src/chamado.ts:43` | yes - C41 failed |
| F5 Bootstrap back: `import 'bootstrap-icons/font/bootstrap-icons.css'` in main.tsx | `web/src/main.tsx:1` | no - C90's 2 named proofs stay green; only `interface.test.ts:95` (in C1) fails |
| F6 Recharts in the entry chunk: `lazy(() => import('./Grafico'))` becomes a static import | `web/src/indicadores/Indicadores.tsx:15` | yes - C45 `recharts_separado.py` exit 1, 2 problems |
| F7a 360 px grid `grid-cols-2` becomes `grid-cols-1` | `web/src/indicadores/Indicadores.tsx:122` | no - C48 green: still 2 x positions (implicit track), columns 151/169 px |
| F7b 360 px grid `grid-cols-2` becomes `grid-cols-3` | `web/src/indicadores/Indicadores.tsx:122` | yes - C48 "360 px Expected 2 Received 3" |
| F8 composer not sticky (`sticky bottom-0` removed) | `web/src/assistente/Assistente.tsx:322` | yes - C32 failed "topo /Enviar/" |
| F9 selector swap not recorded in `seletores.md` (`queryByText('...')` becomes `queryByText(/Nenhum chamado na fila/)`) | `web/src/chamados/listas.test.tsx:29` (via `git commit-tree`, no ref moved) | yes - C2 `seletores_conferem.py` exit 1, "asserção trocada sem linha em seletores.md" |

## Gate

- Vitest: `cd web && npx vitest run`, 161 passed, 0 failed, 0 skipped.
- e2e: `E2E_URL=http://localhost:8083 npx playwright test`, 31 passed, 0 failed.
- Scripts: `seletores_conferem`, `consultas_preservadas`, `chamadas_iguais`, `precache_completo` and `recharts_separado` exit 0; `ui_isolada.sh` exit 0.
- Barriers: `crapper` exit 0; `dryer` finds no candidate.
- `mutator`: suspended by user decision (AD-025).
