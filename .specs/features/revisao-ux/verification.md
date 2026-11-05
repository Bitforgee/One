# Revisão de UI e UX verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 56cf9d3..0487fab
**Round**: 1 - full
**Verifier**: fresh sub-agent with no inherited context (author != verifier); it wrote none of this code, fixed nothing and committed nothing

Every proof was run by the Verifier at `0487fab`:
- Vitest: 469 passed in 48 files.
- `npm --prefix web run build`: ok.
- Layout Playwright against `vite preview :5199`: 148 passed.
- The whole e2e suite against the Verifier's own image of `0487fab` on :8087 (database `one_revisao_verif`, bucket `one-revisao-ux-verif`, institution `e2e` created by the CLI): 171 passed, 0 failed.
- crapper: exit 0. dryer: no candidates.
- C62: exit 0.

The verdict is FAIL for 4 reasons. One check is false in the product even though its test is green (C57: the chart still uses the brand colour). One screen decision has no check, and the product does not deliver it (C48: the Matrículas steps are not numbered visibly). One proof command selects no test (C56). One invariant is not met as written (C59: edits outside the closed list).

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `pesquisa.md` (binding) | yes, read in full, 116 lines | none. §3 suggests "Conversa"; door 1 chose "Assistente", which is a plan decision, not something a check made up | - |
| `auditoria.md` (binding) | yes, read in full, 104 lines | none | - (findings 2, 5, 6, 19, 24, 25, 31, 35 and 44 are neither addressed nor listed in `Out of scope`. They are informational because the plan's scope is the user's decision) |
| `plan.md` `## Screens`, Matrículas: "3 passos numerados" (AC 35) | yes, `plan.md:131-132,219` | none | the visible numbering. C48 only asserts an `ol` with 3 `li` (`administracao/revisao.test.tsx:126-128`). In the product, each `li` is `display:flex` (`Matriculas.tsx:44`), so no `::marker` is generated. Measured: `[{display:"flex",marker:"normal"} x3]`, and no number is drawn at 390 or 1440 px. The `ol` keeps a blank 24 px gutter (`ps-5` + `ps-1`) where the numbers should be. Screen readers get "list, 3 items" with list positions but no step number, and the step titles are `p`, not headings |
| `plan.md` Landing door 3 / AC 43 / P6: "o gráfico ... não a usa" | yes, `plan.md:236`, `checks.md:113` | none | the chart colour. `index.css:37,77` still has `--chart-1: var(--primary)`, and `Indicadores.tsx:141` paints "Categorias por conversas" with it. Measured at 1440 px with `#8a1538`: `--primary` = `rgb(138, 21, 56)`, bar fills `["rgb(138, 21, 56)", "oklch(0.6 0.1 200)"]`. C57's sweep measures before Recharts draws the bars (its own Indicadores wait is `getByText('Indicador principal')`, `simulada.ts`; the Verifier's capture taken with the same wait shows empty chart axes), so the clause `ux.spec.ts:1393` is vacuous |
| `plan.md` `## Screens`, all other screens | yes, enumerated per screen (below) | none | - |

Per-screen enumeration of copy and arrangement against `## Screens`:
- **Casca do aluno.** Bar at the base: C13. 3 equal columns, icon over a 12 px label: C13. Active tab in the action colour at weight 600: C14. Space reserved for the bar: C15. Top bar without a menu button: C16.
  - The top bar also keeps the Tema button (and Avisos, when push is available), which the screen does not draw (Handoff lote 1, item 4). It is an extra element. The Screens sentence is not exclusive, so it is not a contradiction.
  - C16 proves the initials case only. A configured institution icon in the top bar is not measured.
- **Conta.** Each item of the list maps to C17 and C19. Order: C17. 52 px rows: C19. Sair in the destructive colour, last: C19.
- **Assistente.** Composer of 44 px: C26. "Falar com atendente" on its own line: C26. Attachment help: C27. "Isso resolveu?" in the flow: C21, C22. 68ch: C25.
- **Transferido.** Single block with a border: C24. Title, sentence, contact and button: C23. Invitation removed: C23.
- **Minhas solicitações.** Dense rows: C29. 3 lines: C31. Next step: C32.
- **Fila.** C29, C30, C31, C33 and C67. See finding 5: the 390 px row dropped the "Responsável".
- **Detalhe.** C34 to C38.
- **Diálogos de formulário.** C39, C40.
- **Erros de carregamento.** C41, plus C28 in the assistant.
- **Indicadores.** C42, C43.
- **Artigos.** C44 to C46. The icon placement in Documentos is not measured (C45 covers Artigos only).
- **Usuários.** C47.
- **Matrículas.** Numbering: uncovered (see above).
- **Cadastros.** C49.
- **Aparência.** C50, C51.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 6 types at 44 px or more at 390 px | PW `alvos de 44 px abaixo de 768 em todas as telas` passed | `e2e/ux.spec.ts:150-151` at least 1 of each type, then the minimum height | PASS |
| C2 | 44 px with a coarse pointer at 1024; Consultar is 36 px without touch | PW `alvos de 44 px com ponteiro grosso a 1024` passed | `e2e/ux.spec.ts:177` `matchMedia('(pointer: coarse)')` `toBe(true)`; `:188` `toBe(false)` | PASS |
| C3 | fields at 16 px in both conditions | PW `campos de 16 px abaixo de 768 e com ponteiro grosso` passed | `e2e/ux.spec.ts:207-208` `fontes.filter((f) => f.fonte < 16)` `toEqual([])` | PASS |
| C4 | X named "Fechar", 44 x 44 | PW `X de 44 px com o nome Fechar` + VT `Dialog e Sheet fecham por um botão Fechar` passed | `e2e/ux.spec.ts:218-219` (no "Close"); `src/ux.test.tsx:44-45` | PASS |
| C5 | field border at 3:1, 18 measurements | PW `borda dos campos com contraste de 3:1 nos três temas` passed | `e2e/ux.spec.ts:282` `contraste(composta, fundo)` `>= 3` | PASS |
| C6 | skeleton at 1.3:1 | PW `esqueleto com contraste de 1,3:1 nos três temas` passed | `e2e/ux.spec.ts:302` count 3; `:306` `>= 1.3` | PASS |
| C7 | badges at 4.5:1 | PW `selos com contraste de 4,5:1 nos três temas` passed | `e2e/ux.spec.ts:339,342` | PASS |
| C8 | no green button; `success` only in 3 files | PW `nenhum botão verde` + VT `verde só nos selos` passed | `e2e/ux.spec.ts:355-356` `data-variant`; `src/ux.test.tsx:65` `toEqual(['chamados/Chamados.tsx','conhecimento/comum.tsx','index.css'])` | PASS |
| C9 | skip link first, focus goes to `main` | VT `pular para o conteúdo leva o foco ao main` (3 cases) passed | `src/ux.test.tsx:78,82` | PASS |
| C10 | 24 out-of-role redirects; own routes open | VT `rota de outro papel volta à tela inicial` (25) passed | `src/ux.test.tsx:101-102` `[9, 10, 5]` / 24; `:108` `/univag/${Inicial[papel]}` | PASS (OPERADOR: see Coverage) |
| C11 | theme button shows and marks the current theme | VT `botão de tema mostra e marca o tema atual` (4) passed | `src/ux.test.tsx:131` `svg` innerHTML equal; `:134` `aria-pressed` | PASS |
| C12 | 3 tabs, the active one has `aria-current` | VT `barra de abas do aluno com 3 destinos e o ativo marcado` (3) passed | `src/acesso/navegacao.test.tsx:41,46` | PASS |
| C13 | fixed bar, 3 x 130 px, icon over a 12 px label | PW `barra de abas: 3 colunas iguais...` passed | `e2e/ux.spec.ts:400-403` position `fixed`, bottom 844, width 390 | PASS |
| C14 | active tab in the action colour at weight 600 | PW `aba ativa na cor de ação e peso 600` passed | `e2e/ux.spec.ts:438` `toEqual(primaria)` | PASS |
| C15 | safe area 34 px; nothing focusable under the bar | PW `nada focável fica sob a barra de abas` passed | `e2e/ux.spec.ts:473` `paddingBottom` `'34px'`; `:468` | PASS |
| C16 | student top bar without a menu button | PW `topo do aluno sem botão de menu` passed | `e2e/ux.spec.ts:495-496` | PASS |
| C17 | Conta rows in order, depending on push and contact | VT `Conta lista as linhas...` (3) passed | `src/acesso/navegacao.test.tsx:62-63` name and masked CPF; the order in the same `it.each` (line 54) | PASS |
| C18 | each Conta row acts | VT `linhas da Conta agem` (5) passed | `src/acesso/navegacao.test.tsx:81` `one-tema` `dark`; `:89` `/api/push/subscricao`; `:99`; `:107`; `:118` logout | PASS |
| C19 | 52 px rows, block without actions, Sair last | PW `Conta com linhas de 52 px e Sair por último` passed | `e2e/ux.spec.ts:540-541` 51 to 53 px; `:546` `a, button` count 0 | PASS |
| C20 | no tab bar at 768 or for staff | PW `sem barra de abas a 768 px e para a equipe` passed | `e2e/ux.spec.ts:514-515` | PASS |
| C21 | "Isso resolveu?" right after the last answer, outline | VT passed | `src/assistente/revisao.test.tsx:37` `nextElementSibling`; `:41-42` `data-variant` `outline` | PASS |
| C22 | in the flow, within 24 px, not fixed | PW `Isso resolveu no fluxo sob a resposta` passed | `e2e/ux.spec.ts:696-697` | PASS |
| C23 | transfer block; invitation at 0 | VT `transferência mostra para onde foi e tira o convite` passed | `src/assistente/revisao.test.tsx:64` `queryAllByText(Convite)` 0 | PASS |
| C24 | single block with a border | PW `Transferido num bloco único com borda` passed | `e2e/ux.spec.ts:734-736` | PASS |
| C25 | 68ch in the assistant and in the detail | PW `balão com até 68 caracteres de largura` passed | `e2e/ux.spec.ts:762,770` `largura <= limite + 1` | PASS |
| C26 | 44 px composer; Falar on its own line, outline | PW + VT passed | `e2e/ux.spec.ts:782`; `src/assistente/revisao.test.tsx:79,83` | PASS |
| C27 | attachment help in 4 cases | VT passed | `src/assistente/revisao.test.tsx:91,95,97,100` | PASS |
| C28 | send error in place of the answer, with Reenviar | VT (3) + PW `erro de envio entre o balão e o compositor` passed | `src/assistente/revisao.test.tsx:129,145` same body; `e2e/ux.spec.ts:807-808` | PASS |
| C29 | rows with a divider, no card | PW `listas em linhas com divisória...` passed | `e2e/ux.spec.ts:853` `['0px','0px','0px','none']`; `:855-856` divider | PASS |
| C30 | relative date by calendar day in the time zone | VT `data relativa aberto hoje ontem e há N dias` passed | `src/chamados/revisao.test.tsx:41-42` | PASS |
| C31 | row in 3 lines | PW `linha de solicitação em 3 linhas` passed | `e2e/ux.spec.ts:885,891-892,899-900` | PASS |
| C32 | next step per state | VT `próximo passo por estado` (5) passed | `src/chamados/revisao.test.tsx:63` | PASS |
| C33 | category and date; "Mais antigos primeiro" first | VT + PW passed | `src/chamados/revisao.test.tsx:79-80`; `e2e/ux.spec.ts:914` | PASS |
| C34 | bar per state | PW `barra do detalhe com a ação principal do estado` passed | `e2e/ux.spec.ts:972` `toEqual(botoes)`; `:980` Sheet order; `:963` none at 1024 | PASS |
| C35 | Responder scrolls and focuses | PW passed | `e2e/ux.spec.ts:991,994` | PASS |
| C36 | student has no bar; Cancelar as a text button | PW + VT passed | `e2e/ux.spec.ts:1028,1036`; `src/chamados/revisao.test.tsx:98-99` | PASS |
| C37 | Enviar above the bar | PW passed | `e2e/ux.spec.ts:1006` | PASS |
| C38 | no form for staff in RESOLVIDO and FECHADO | VT passed | `src/chamados/revisao.test.tsx:116-117` | PASS |
| C39 | full-screen dialogs, 6 cases | PW (7) passed | `e2e/ux.spec.ts:1093` `[0,0,360,740]`; `:1101,1105,1107` | PASS |
| C40 | field error below the field | VT (6) + PW passed | `src/administracao/revisao.test.tsx:65-66`; `e2e/ux.spec.ts:1141` | PASS |
| C41 | load error with Tentar de novo, 11 screens; 404 keeps the detail | VT (13) passed | `src/ux.test.tsx:199-200,216-217` | PASS |
| C42 | one period control, highlights, Ver tabela | VT (4) passed | `src/indicadores/revisao.test.tsx:29-30,39,53-54` | PASS |
| C43 | 2 columns at 390 | PW passed | `e2e/ux.spec.ts:1160-1164` | PASS |
| C44 | one badge, indexing as an icon | VT (11) passed | `src/conhecimento/revisao.test.tsx:32,39,42,51,60` | PASS |
| C45 | icon beside the title | PW passed | `e2e/ux.spec.ts:1187-1189` | PASS |
| C46 | "Novo" hidden when the list is empty | VT (2) passed | `src/conhecimento/revisao.test.tsx:66-78` | PASS |
| C47 | formatted CPF and search | VT (7) + PW passed | `src/administracao/revisao.test.tsx:94-95,110`; `e2e/ux.spec.ts:1200` | PASS |
| C48 | 3 numbered steps, template download, errors per line | VT (3) + PW passed | `src/administracao/revisao.test.tsx:126` `tagName` `OL`, `:128` 3 items, `:163`; `e2e/ux.spec.ts:1213` header | FAIL - precision gap. The `ol` tag is asserted, but the numbering AC 35 asks for is not rendered (`Matriculas.tsx:44` `flex` removes `::marker`) |
| C49 | whole row is the target, 48 px | PW passed | `e2e/ux.spec.ts:1245,1247` | PASS |
| C50 | form first; Ver prévia | PW passed | `e2e/ux.spec.ts:1262-1263,1267-1268,1273` | PASS |
| C51 | dark preview the same as the app | PW passed | `e2e/ux.spec.ts:1291-1293` | PASS |
| C52 | tinted neutrals, Black stays `#000` | VT + PW passed | `src/ux.test.tsx:149-150`; `e2e/ux.spec.ts:617,620` (14) | PASS |
| C53 | 27 contrasts at 4.5:1 | PW passed | `e2e/ux.spec.ts:641,644` | PASS |
| C54 | opsz 32; no new font | PW + VT passed | `e2e/ux.spec.ts:653`; `src/ux.test.tsx:160-161` | PASS |
| C55 | 4 text sizes per screen | PW passed | `e2e/ux.spec.ts:1338-1339` | PASS |
| C56 | no Sparkles, emoji or gradient | VT `sem Sparkles no código` passed; PW `-g "sem emoji em título nem gradiente"` selects no test: "No tests found", exit 1 | `src/ux.test.tsx:227`. The test that exists is named `sem emoji nem gradiente` (`e2e/ux.spec.ts:1347`, passed, `:1360-1361`) | FAIL - the proof as written selects no test (L-022) |
| C57 | action colour only in the primary button, active item, link and focus; never in the chart | PW (2) passed | `e2e/ux.spec.ts:1393` (chart), `:1398`, `:1414`. The chart clause never measures a bar | FAIL - the product contradicts it: the bar fill equals `--primary` (`index.css:37,77`, `Indicadores.tsx:141`) |
| C58 | the student never reads "chamado" | VT (5) passed | `src/ux.test.tsx:231` `not.toMatch(/chamado/i)`; `:266` | PASS (residual: finding 7) |
| C59 | Vitest and build pass; edits only from the closed list | `vitest run` 469 passed; build ok | the Handoff lists 13 edits "Fora da lista" plus the `tabela.test.tsx` fixture | FAIL - the second half of the claim is not met (see Edits outside the closed list) |
| C60 | crapper 9.99; dryer below 0.8 | crapper exit 0 (top 9.8 `Sidebar`); dryer "No duplicate candidates found", also with `src/LinksDaResposta.tsx` added | `web/.metrics/crap.edn`, `dry.edn` | PASS |
| C61 | layout suite | PW 6 files: 148 passed | `e2e/ux.spec.ts:1` and the others | PASS |
| C62 | no `api/` change | `git diff --quiet 56cf9d3 HEAD -- api api.Tests` exit 0; `--name-only` outside `web/` and `.specs/`: none | - (diff) `checks.md:656` | PASS |
| C63 | real e2e, student tabs and Sair | `ux-real.spec.ts:81` passed against the :8087 image (1.0 min) | `e2e/ux-real.spec.ts:111,118,124` `aria-current`; `:136` `toBe(401)` | PASS |
| C64 | 6 clicks, 1 Sheet | `ux-real.spec.ts:143` passed (1.1 min) | `e2e/ux-real.spec.ts:212` the 6 clicks; `:214` `toBe(1)` | PASS |
| C65 | whole e2e suite against :8087 | `npx playwright test`: 171 passed, 0 failed | `e2e/anexos.spec.ts:140` passed with the closed-list edit 7 | PASS |
| C66 | the action sheet keeps what was typed | PW passed | `e2e/ux.spec.ts:1435,1437` | PASS |
| C67 | "Aberto" column on one line | PW passed | `e2e/ux.spec.ts:1457-1458,1462,1465` | PASS |
| C68 | links as buttons in the staff conversation | VT passed | `src/chamados/revisao.test.tsx:187-188` | PASS |

### Edits outside the closed list (asked: does each one only follow the new arrangement, or weaken?)

All edits outside the closed list are recorded in the Handoff. None of them removes a behaviour that is still in the product. In detail:
- **Follow the new arrangement or text.** `sem rede a lista mostra o erro` (new copy, still 1 query). `artigos.test`, `edicao.test` (3), `interface.test` `controles nativos` ("Novo" becomes "Novo artigo" on an empty list). `conhecimento/icones.test` (1 article, so the "Novo" button exists; icons still asserted). `indicadores.test`: `cartões formatam`, `ranking com gráfico`, `ranking vazio` open "Ver tabela" first; the renamed period test keeps "consults only on Consultar". `arranjo.spec`: `arranjo administração` (-24 px for the step gutter), `quebras medidas` (150 px in 2 columns, 24 px value), the CPF mask, the login panel at 24 px. `tabela.test`: the `admin` fixture gains ALUNO.
- **Minor weakenings.**
  - `aparencia.test` `prévia muda antes de salvar` used to assert the button's `backgroundColor` and now asserts only the `--marca-previa` variable on `.previa-marca`. The light-theme chain from that variable to `--primary` to the button is proven by no browser test (C51 covers dark only).
  - `assistente/anexos.test` (extension) dropped `toBeVisible()`. It has no substantive effect in jsdom.
- **One edit locks in a loss of information.** `arranjo.spec` `colunas largas somem no estreito`, in the closed list: the Fila row at 360 px used to assert "category · responsável · days" and now asserts only the category. See finding 5.
- **`calendário em pt-BR` removal: justified.** The calendar left Indicadores (AC 32: a single period control). pt-BR is still proven where a calendar remains, on the Artigos validity field, in an existing, unchanged test: `conhecimento/edicao.test.tsx:297-300`, with `novembro` and `dom` to `sáb`. The Handoff cites `conhecimento/textos.test.tsx:28`, which is also valid. Residual risk: Indicadores now uses native `type="date"` fields, whose picker and display format follow the browser locale, not ptBR, and no test proves pt-BR there.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| roles x guarded routes (4 roles, 12 routes) | `Autenticado.tsx:20-31,304` (`Menu` + `conta`), `sessao.ts:9-16` | ALUNO 9, ATENDENTE 10, ADMINISTRADOR 5: C10 (`ux.test.tsx:101`) | OPERADOR outside its role (11 routes). The claim maps OPERADOR to `instituicoes` and the Handoff (lote 1, item 7) added `telaInicial` for it, but no case opens a route as OPERADOR only |
| `## Screens` arrangement items (design authority) | `plan.md:82-135`, enumerated above | 46 items: C13 to C51 as in `checks.md` Coverage | Matrículas "passos numerados" (no visible number; C48 asserts only `ol`) |
| action-colour surfaces (AC 43, P6: button, active item, link, focus, Sigla; never chart or badge) | `plan.md:236`, `checks.md:113` | button, active item, link, Sigla, badges: C57 `ux.spec.ts:1390-1394`; focus: `:1414` | chart: the clause is vacuous (`:1393` runs before Recharts draws); the product paints `--chart-1: var(--primary)` |
| detail bar per state (5) | `PermissoesChamado`, `ChamadoDetalhe.tsx:242-256` | ABERTO, EM_ATENDIMENTO, AGUARDANDO_ALUNO, RESOLVIDO, FECHADO: C34 | - |
| load-error surfaces (11) | `ErroDe` users with `oque` | C41, table of 11 (`ux.test.tsx:184`) | - |
| tinted tokens (14) | `index.css` `:root`, `.dark`, `.black` | C52 (`ux.spec.ts:620` 14) | - |
| next step per state (5) | AC 22 | C32 | - |
| relative date (4 cases x 2 lists) | AC 21, P9 | C30 | - |
| form dialogs (6) | AC 29 | C39 (6 + 768); C40 covers 5. "Importar carga" has no field-error case, because it has no field the API names | - |
| Cadastros lists (5) | `Cadastros.tsx` tabs | C49 (`ux.spec.ts:1251` 10 cases = 5 x 2 widths) | - |
| screens for C55 to C57 (16 `Telas` + Conta + Instituições) | `simulada.ts:109-147` | C55 (`ux.spec.ts:1343` `2 * (Telas.length + 2)`), C56, C57 | - (open dialogs and toasts are outside the sweep) |
| student texts without "chamado" (4 screens) | Impact: textos | C58 | - (on screen). Push notification text: finding 7 |

## Faults injected

Isolated in `git worktree` scratch copies at `0487fab`. The real tree's `git status --porcelain` was recorded first and matched the baseline afterwards. The mutator is suspended (AD-025), so every fault was injected by hand, at least one per slice, with one build per layout fault.

| Mutation | Location | Killed |
| --- | --- | --- |
| S1: `NativeSelect` back to `text-sm` (14 px) on mobile and with a coarse pointer | `web/src/ui/native-select.tsx:19` | yes - C3 `ux.spec.ts:208` "390 px: campos abaixo de 16 px" |
| S2: `aria-current` inverted on the tab bar | `web/src/Autenticado.tsx:276` | yes - C12, 3 of 3 cases failed |
| S3: transfer invitation kept after `TRANSFERIDA` | `web/src/assistente/Assistente.tsx:138` | yes - C23 failed |
| S4: `criadoEm` counted in UTC instead of the institution's time zone | `web/src/datas.ts` (`abertoHa`) | yes - C30 failed (midnight case) |
| S5: Cadastros row from `h-12` to `h-10` | `web/src/administracao/Cadastros.tsx:71` | yes - C49 `ux.spec.ts:1245` "Setores a 390: altura da linha" |
| S6: Indicadores compact value from `text-base` to `text-xl` (20 px next to the 24 px value) | `web/src/indicadores/Indicadores.tsx:166` | yes - C55 `ux.spec.ts:1338` "Indicadores a 390: no máximo 1 tamanho de título" |
| S7: assistant links no longer split out of the staff conversation | `web/src/chamados/Conversa.tsx:70` | yes - C68 failed |

7 injected, 7 killed. The checks that failed do not fail through a weak assertion that a mutant could pass. C57 and C48 fail because of what their assertions never reach: a chart that is not drawn yet, and a marker that is not rendered.

## Findings, ranked

1. **(C57, major, composition and colour) The chart still uses the action colour.** The bar for "Categorias por conversas" is `rgb(138, 21, 56)` = `--primary` (`index.css:37,77`; `Indicadores.tsx:141`). AC 43 and P6 say the chart stops using it. The green test is vacuous because the sweep runs before Recharts draws.
2. **(C48 / AC 35, major, composition) Matrículas has no visible step numbers.** `li` is `flex` (`Matriculas.tsx:44`), so the `list-decimal` markers never render, at any width and in both themes; a blank 24 px gutter remains. Screen readers get "list, 3 items" and positions only; the steps are `p`, not headings. The before/after captures (`lote3/matriculas-erros-390-*`) and the Verifier's own captures at 390 and 1440 px agree. C48 asserts only the `ol` tag.
3. **(C56, process) The proof name does not exist.** `-g "sem emoji em título nem gradiente"` selects no test (exit 1). The test is `sem emoji nem gradiente` (`ux.spec.ts:1347`) and it passes.
4. **(C59, low) Edits outside the closed list.** 13 edits plus a fixture change, all recorded in the Handoff. Each one follows the new arrangement. Two are minor weakenings: the light-theme preview colour is no longer proven by computed style, and `toBeVisible` was dropped.
5. **(product regression, medium) Fila at 390 px lost the "Responsável".**
   - Before: "Financeiro > ... · Carla · 0 dias". After: badge, date and the truncated category only (`lote2/antes|depois-fila-390-claro.png`).
   - P2 removed only the student and the sector. On mobile, an attendant can no longer see who holds each ticket.
   - The category is also cut with an ellipsis on long rows.
6. **(Coverage) No proof for the OPERADOR-only redirect.** The guard code is generic (`Autenticado.tsx:304-308`).
7. **(C58 residual, low) The student can still read "chamado" outside the screens.**
   - Push notifications read "Seu chamado {numero} foi atualizado." (`api/Chamados/PushEnviador.cs:32`, which cannot change without an API change).
   - The web fallback `web/src/sw.ts:21` says "Seu chamado foi atualizado." and is in scope, but no check covers it.
   - The student's URL is `/:slug/chamados/ONE-n`.
8. **(C55 side effects, low)**
   - To keep one title size per screen, `DialogTitle` went from 18 to 16 px. Dialog titles now match body text and differ only by weight 600.
   - Indicadores compact values went from 20 to 16 px, and the login panel h2 from 30 to 24 px.
   - At 390 px the screen's single title size is the 24 px KPI number, while the page `h1` in the top bar is 16 px.
   - The captures do not look worse. The hierarchy is flatter but readable.
9. **(C57 exemption for the colour swatch: justified)**
   - `data-testid="amostra"` is the colour the administrator typed, shown as data, so it is not an "action colour" use. The exemption is keyed narrowly to that test id.
   - It is not written in the C57 claim, which is a precision gap in the check.
   - The `Sigla` exemption in the test is broad: any `aria-hidden` element with 2 or fewer characters passes.

The Verifier's own captures were taken with the simulated API, `#8a1538`, at 360, 390, 768, 1024 and 1440 px, light and dark: 11 screens plus 4 student views each, 150 files, in `C:\Users\ALFRED~1\AppData\Local\Temp\claude\32208d8f0bb63a9f\023d6896-6e71-49ab-bcad-30fe290f9094\scratchpad\shots\`.
- **Better than before:** dense lists, the transfer block, labelled error rows in Matrículas, the Indicadores 2x2 layout, Conta and the tab bar, the dark contrast.
- **Worse:** findings 2 and 5.
- **Unchanged and still wrong:** finding 1.

## Gate

`cd web && npx vitest run`: 469 passed, 0 failed. Layout PW: 148 passed. Real e2e on :8087: 171 passed, 0 failed. `validate_verification.py revisao-ux` was run after writing this report.

Cleanup:
- removed: container `one-revisao-ux-verif`, image `one-revisao-ux-verif:0487fab`, database `one_revisao_verif`, MinIO bucket `one-revisao-ux-verif`, both worktrees (junction removed first) and the preview servers on :5199 and :5198;
- left alone: the compose `api` on :8080;
- not removed: `D:\one-wt-antes`, left behind by the builder (Handoff, lote 3), which the Verifier did not touch.
