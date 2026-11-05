# Estrutura visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 93d5889..49f70bc (HEAD); fix range 4223b68..49f70bc; only `web/` and `.specs/` change (`git diff --quiet 93d5889 HEAD -- api api.Tests` exits 0)
**Round**: 3 - scoped
**Verifier**: fresh sub-agent with no inherited context, round 3 (author != verifier); it wrote none of this code, fixed nothing and committed nothing

**All 4 findings of round 2 are closed, measured. All 39 checks hold as written and all proofs ran green at HEAD: Vitest 524, layout 197 (twice clean, once under all-core CPU load), real e2e 233.** The FAIL rests on what no check reaches, and it is small:

1. **New visible defect, made by the C38 fix.** Rail collapsed: click the user row, click outside. The menu closes, focus returns to the row, and the black "Ana" hint stays on screen with the pointer elsewhere, until the next click or Tab. Same with touch. `4223b68` does not do it, since the row had no tooltip, and neither does `Tema` by touch; `Tema` with the mouse was not measured.
2. **A recorded out-of-scope item got worse, by one stop.** Drawer below 768 px: Esc from the user row closes in 2 presses at HEAD against 1 at `4223b68`, measured on both. The hidden tooltip takes the first Esc. Keyboard only.
3. **Three mutants survive the C27 suite**, none a defect at HEAD: `stopPropagation` removed from the card link, the title gone from the link's accessible name, and the `Tema` hint removed.

Items 1 and 2 share one line, `tooltip={me.nome}` at `web/src/Autenticado.tsx:155`. This is the user's call, as round 2 said: either keep the hint and handle the focus return, or amend `## Screens` so the hint is on icons only, since the initials are not an icon. Removing the prop closes both.

Round 3 is the bound before escalating. My judgement: nothing here should hold back the user's decision on the feature, and the gate reads the survivors and uncovered cells, so I did not soften the rows.

## Binding sources

Step 1 redone only for the screens the fix touched (cards, rail footer, ranking bar, sheet Close). The rest is carried from `44bfd34` and `734d29e`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/estrutura-visual/plan.md` `## Screens` | yes, verified at 49f70bc | none. "Os cartões do celular não mudam": heights unchanged (Fila 93 and 113 px, Solicitações 91 and 111 px, 1 and 2 lines), arrangement unchanged; the link now covers the title, the builder's recorded decision, seen only on hover and focus. "Barra recolhida: só ícones com dica": the 4 footer buttons show it at 1280 | `Tema` and `Contato` hints: no proof names them, F11 survives. Collapse and user hints now have C38, the bar below the label has C37 |
| `.specs/features/revisao-ux/plan.md:106` "o assunto, até 2 linhas" | yes, verified at 49f70bc | none: `ux.spec.ts:819`, killed by F8; bleed gone by pixel comparison | - |
| `.specs/features/layout-painel/plan.md:97` "Número é o link" | yes, verified at 49f70bc | none: it describes the table, and `LinhaDaTabela` (`Chamados.tsx:81`) is untouched; at 768 and 1280 the links read `ONE-123` only | - |
| `.specs/features/revisao-ux/pesquisa.md` §4 44 px | yes, verified at 49f70bc | none: the row is the touch target, full width and 91 to 113 px tall; collapse at coarse pointer carried | - |
| `.specs/features/estrutura-visual/pesquisa.md` §1 bar shape; `.specs/STATE.md` AD-027, AD-028, AD-034, AD-035, AD-037; `redesign-institucional/plan.md:103`; `identidade-visual/pesquisa.md` | carried from 44bfd34, fix did not touch them | none | - |

## Checks

Proofs ran at `49f70bc`. Vitest: one JSON run, 524 of 524 in 55 files. Build exit 0, precache 11 entries, no `Grafico-*`. Layout: 3 whole runs of one call against `vite preview` on 5199, each 197 of 197, each named test found passing in the JSON. Real e2e: 233 of 233, 520 s, on my own image of HEAD on 8089 with its own Postgres, MinIO and Mailpit, `E2E_INSTITUICAO=e2e`, `E2E_ADMIN_EMAIL=admin@e2e.one`, `E2E_CONTAINER=one-r3-api`; `plataforma.spec` `manifesto e service worker` and `casca-real` are in it. A first e2e run had 232 and 1 failure of my own making: I gave the image `Push__*` keys, and `ux-real.spec.ts:121` says it expects none. I recreated the database and API without keys and ran the whole suite again. Citations refreshed for `casca.spec.ts` from line 787 on, the only test file the fix touched; lines above it did not move. Judgment of unchanged assertions is marked `carried`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | outline solid, ≥ 2 px, ≥ 3:1, 4 screens × 3 themes × 3 brands | layout | `web/e2e/casca.spec.ts:87` `expect(f.largura).toBeGreaterThanOrEqual(2)`, `:88` contrast ≥ 3 (carried) | PASS |
| C2 | forced colours keep the outline | layout | `web/e2e/casca.spec.ts:111` width ≥ 2, `:123` (carried) | PASS |
| C3 | no halo on Button and Input; no class in `web/src` | layout, Vitest | `web/e2e/casca.spec.ts:141-142`; `web/src/test/interface.test.ts:106` (carried; precision gap stays: `focus:ring-2` on the skip link and `Editor.tsx:42`) | PASS |
| C4 | `--ring` without colour and with brand | layout, Vitest | `web/e2e/casca.spec.ts:163`, `:165-166`; `web/src/test/interface.test.ts:72` (carried) | PASS |
| C5 | dashed attachments at 3:1 | layout | `web/e2e/casca.spec.ts:212-213`, `:216` `medidas` = 24 (carried) | PASS |
| C6 | outline inside clipping ancestors at 1280 | layout | `web/e2e/casca.spec.ts:258` `r.cortes >= 1`, `:259` `r.fora` empty, `:262` control (carried) | PASS |
| C7 | sidebar differs by brand; `#000` in Preto; text ≥ 4.5:1 | layout, Vitest | `web/e2e/casca.spec.ts:285` `toEqual([0, 0, 0])`, `:286`, `:281`; `web/src/test/interface.test.ts:68`, `:199` (carried) | PASS |
| C8 | 3 px bar, colour, weight, no background, `aria-current` | layout | `web/e2e/casca.spec.ts:312`, `:325`, `:326`, `:333` (carried) | PASS |
| C9 | Tema in the footer, not in the top bar; student by Conta | layout | `web/e2e/casca.spec.ts:365`, `:367`, `:371`, `:374`, `:379`, `:383` (carried) | PASS |
| C10 | name and role, no chevrons, no initials, Sair | layout | `web/e2e/casca.spec.ts:391-397` (carried) | PASS |
| C11 | initials only when collapsed | layout | `web/e2e/casca.spec.ts:408-409`, `:413`, `:416` (carried) | PASS |
| C12 | top bar opaque, no blur, no separator | layout | `web/e2e/casca.spec.ts:435-438` (carried) | PASS |
| C13 | collapse in footer, 1 svg, toggles | layout | `web/e2e/casca.spec.ts:450-462`; refreshed because `SidebarTrigger` changed: it still renders 1 svg inside the tooltip wrapper, and the assertions ran green | PASS |
| C14 | Menu in top bar below 768 for non-students | layout | `web/e2e/casca.spec.ts:475`, `:478-480`, `:486` (carried) | PASS |
| C15 | composer in one line, sizes, no shadow | layout | `web/e2e/casca.spec.ts:502-512` (carried) | PASS |
| C16 | field border at 3:1 | layout | `web/e2e/casca.spec.ts:535-536`, `:539` (carried) | PASS |
| C17 | Encerrar with Falar, above the field | layout | `web/e2e/casca.spec.ts:548`, `:554-555` (carried) | PASS |
| C18 | Enter sends once; empty disables; Shift+Enter breaks | layout | `web/e2e/casca.spec.ts:568`, `:574-578` (carried) | PASS |
| C19 | no box, header without fill, first column aligned | layout | `web/e2e/casca.spec.ts:614-620` (carried; precision gap stays: `thead` read elsewhere) | PASS |
| C20 | 4 rows in order, totals, widths | Vitest | `web/src/indicadores/ranking.test.tsx:17-25` (carried) | PASS |
| C21 | bar colour, 3:1, tabular, total on the right, no Recharts | layout | `web/e2e/casca.spec.ts:654-662` (carried) | PASS |
| C22 | empty and absent ranking | Vitest | `web/src/indicadores/ranking.test.tsx:44-46` (carried) | PASS |
| C23 | category of 60 characters fully visible at 5 widths | layout | `web/e2e/casca.spec.ts:695` `c.largura <= c.visivel` (carried) | PASS |
| C24 | no `recharts`, no `Grafico.tsx`, no chunk | Vitest, build | `web/src/test/interface.test.ts:113-117` (carried) | PASS |
| C25 | Vitest and build | `vitest run`, `npm --prefix web run build` | `web/src/indicadores/ranking.test.tsx:12` among 524 passed; build exit 0 | PASS |
| C26 | crapper, dryer, no `api/` change | as listed, in `web/` | `.specs/features/estrutura-visual/checks.md:142` crapper exit 0; `:143` "No duplicate candidates found."; `:144` exit 0 | PASS |
| C27 | layout suite | one call, 6 files, 3 times | `web/e2e/casca.spec.ts:883` among 197 passed, 0 failed, each run | PASS |
| C28 | theme survives reload, student sends by Enter, real ranking | 8089 | `web/e2e/casca-real.spec.ts:112`, `:124`, `:127` (carried) | PASS |
| C29 | whole e2e on my image of HEAD | 8089 | `web/e2e/casca-real.spec.ts:98` among 233 passed, 0 failed | PASS |
| C30 | invariants without lowering a limit | layout | `web/e2e/ux.spec.ts:109`, `:156`, `:348`, `:565`, `:1349`; `web/e2e/identidade.spec.ts:1245`; the fix edits no test but `casca.spec.ts` | PASS |
| C31 | totals in 1 line at 5 widths, category whole | layout | `web/e2e/casca.spec.ts:742`, `:748`, `:750` `medidas` = 40 (carried) | PASS |
| C32 | active bar visible under forced colours; control | layout | `web/e2e/casca.spec.ts:773`, `:775`, `:776` (carried) | PASS |
| C33 | focus whole in cards at 390, first column at 1280, dialog Close at opacity 1 and 3:1 | layout | `web/e2e/casca.spec.ts:791` 1 line-clamp inside the link, `:792` `r.fora` empty, `:797` control > 0, `:822`, `:835`, `:838`; verified, killed by F6, F7, F8. See "The C33 edit" | PASS |
| C34 | footer order; collapse inside the rail at coarse pointer | layout | `web/e2e/casca.spec.ts:855`, `:868`, `:869` (carried, lines refreshed) | PASS |
| C35 | Enviar the height of the field and aligned; ≥ 44 at 390 | layout | `web/e2e/casca.spec.ts:883` `mesma altura`, `:884` `alinhados`; killed by F5. See "The Enviar run" | PASS |
| C36 | clip 2 × line-height, third line paints nothing, focus whole | layout | `web/e2e/casca.spec.ts:928` padding 0, `:929` box = 2 × lh, `:930`, `:932` `r.fora` empty; killed by F1, F6, F7, F8; pixel-equal by my own proof below | PASS |
| C37 | bar below the label at 360 and 390 | layout | `web/e2e/casca.spec.ts:969` `topoBarra >= fimRotulo - 1`, `:972` the label wraps, `:974` `medidas` = 8; killed by F2 | PASS |
| C38 | collapsed: 1 hint on collapse and user; open: none | layout | `web/e2e/casca.spec.ts:991` `toHaveText(nome)`, `:994` `toHaveCount(0)`; killed by F3. Holds as written; findings 1 and 2 are outside its claim | PASS |
| C39 | sheet Close focused: opacity 1, 3:1, 3 themes | layout | `web/e2e/casca.spec.ts:1016`, `:1018`, `:1019`, `:1022` `medidas` = 3; killed by F4 | PASS |

Every check holds as written. The FAIL comes from what no check reaches.

## Coverage

Recomputed at 49f70bc for the rows the fix touched; the others are carried from 44bfd34.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| screens in the focus sweep (4) | plan AC 1; carried | `casca.spec.ts:38-43` | - |
| themes (3), brands (3) | `index.css`; carried | loops `casca.spec.ts:8-9` | - |
| Preto `--sidebar` × brands (3) | AD-027, P7; carried | C7 | - |
| attachment uses (4) | `grep CampoArquivo`; carried | `casca.spec.ts:174-196` | - |
| doors (4) | plan `Landing`; carried | C1 C3 · C4 · C8 C32 · C21 C24 | - |
| sidebar states (2) | `Autenticado.tsx`; carried | open C10 · collapsed C11 | - |
| footer items (4) and their order | plan `## Screens`; carried | C34 | - |
| collapsed rail hints (4 footer buttons) | plan `## Screens:58`, hover at HEAD | collapse C38 · user C38 · Contato, Tema rendered, measured by round 2 and in the drawer here | Contato and Tema: no proof names them (F11 survives). `arranjo.spec.ts:829-831` proves the hint on nav links only |
| hint states × input (mouse, focus, touch, drawer) | fix diff, my measures | mouse collapsed and open C38 · focus, touch and drawer by hand | the state after the user menu closes: finding 1, no proof |
| card link effects (click, name) | fix diff | one navigation per click: by hand, no proof (F9) · name with the title: by hand, no proof (F10) | F9, F10 |
| ranking cell values (2) and arrangement | plan `## Screens:62` | category C20 C23 · total C20 C21 C31 · bar below C37 | - |
| totals × widths (4 × 5), widths for the cut (5), ranking states (3) | plan; carried | C31 · C23 · C20 C21 C22 C28 | - |
| Close controls with `focus-visible:opacity-100` (2) | `grep` on `web/src/ui` | `ui/dialog.tsx` C33 · `ui/sheet.tsx` C39 | - |
| findings of round 2 (4) | round 2 report | C36 · C37 · C38 · C39 | - |
| S0 suites (5) | `checks.md` | C25, C26, C27, C28, C29 | - |

## Test policy rows

No `Test policy` section in `checks.md`.

## Faults injected

Scratch worktree under the ignored `TestResults/`, own build and preview on 5198, 6 fault builds plus one baseline build of `4223b68`. Real tree porcelain matched the baseline before and after. Over the cap of 5 because the brief asks at least one per item. Each killed row reports the assertion message quoted, which confirms the fault ran. F9 and F10 shared a build with F6 and a whole-suite run in which only F6's two tests failed; on that served build I measured history +2 and the name `ONE-123`, so they were live. F11 has no live confirmation beyond being built from the edited tree.

| Mutation | Location | Killed | Proof and message |
| --- | --- | --- | --- |
| F1 item 1: clamp box `h-11`, third line shows | `web/src/chamados/Chamados.tsx:54` | yes | C36 "/univag/fila a 360: a caixa mede 2 × line-height" |
| F2 item 1: ranking bar above the label | `web/src/indicadores/Indicadores.tsx:88-91` | yes | C37 "360: barra abaixo do rótulo" (survivor of rounds 1 and 2) |
| F3 item 5: collapse hint `hidden={isMobile}`, shows with the bar open | `web/src/ui/sidebar.tsx:276` | yes | C38 "Alternar barra lateral: controle, sem dica com a barra aberta" |
| F4 item 1: sheet Close without `focus-visible:opacity-100` | `web/src/ui/sheet.tsx:77` | yes | C39 "light: opacidade 1" (survivor of round 2) |
| F5 item 2: Enviar `h-9` | `web/src/assistente/Assistente.tsx:310` | yes | C35 "1440: mesma altura" |
| F6 item 4: `overflow-hidden` on the link's parent `p` | `web/src/chamados/Chamados.tsx:51` | yes | C33 "/univag/fila: contorno inteiro"; C36 "/univag/fila a 360: contorno inteiro" |
| F7 item 4: `overflow-hidden` on the list, far ancestor | `web/src/Tabela.tsx` `role="list"` | yes | the same two tests, same message |
| F8 items 3, 4: no `line-clamp-2` inside the link | `web/src/chamados/Chamados.tsx:54` | yes | C33 "1 line-clamp dentro do link"; C36 "1 caixa que corta"; `ux.spec.ts` "solicitacoes: assunto em até 2 linhas" |
| F9 item 3: `stopPropagation` removed from the card link | `web/src/chamados/Chamados.tsx:53` | no | whole C27: nothing fails. Effect measured: 1 click adds 2 history entries, Voltar stays on the chamado. The fix widened this path: on the phone the title now goes through the link |
| F10 item 3: `aria-label={c.numero}` on the card link | `web/src/chamados/Chamados.tsx:53` | no | whole C27: nothing fails. Effect measured: the link's name is `ONE-123`, the title is gone for a screen reader. Proofs match `/ONE-123/` only. Less plausible than F9 |
| F11 item 5: `tooltip="Tema"` removed | `web/src/Autenticado.tsx:79` | no | 197 of 197. Low stakes: the same prop on nav links is held at `arranjo.spec.ts:829`. No Vitest file mentions `tooltip`, and I did not read a count from the Vitest run under this fault |

## Findings, ranked by what a person meets

1. **"Ana" bubble stays after the user menu closes (made by the fix; seen on `toque-dica-presa-Ana.png` and `usuario-apos-esc.png`).** Rail collapsed, `tooltip={me.nome}` at `web/src/Autenticado.tsx:155`. Radix returns focus to the trigger, and focus opens the tooltip. With the mouse: click outside at (700, 500), bubble visible and focus on the row. With touch at 1024: same, still there 2.5 s later, gone at the next tap. After Esc it also shows, there with a focus ring, which reads as correct. `4223b68`: no bubble on this path. `Tema`, measured by touch only: no bubble, its `Popover` does not return focus to it after an outside tap. Harm is small, a stray label until the next click, and it happens on every open and close of that menu in the collapsed rail.
2. **Esc in the drawer: user row went from 1 to 2 (fix worsened a recorded item).** Measured on HEAD and `4223b68`: user 2 against 1; Tema, Contato and the first focus on opening 2 in both. The hidden tooltip takes the first Esc. Nothing is lost and it is keyboard only, below 768 px, for non-students. By the rule given to this round, a worsened item carries the FAIL.
3. **F9, one click, two history entries, unproven.** Product is right at HEAD: 1 entry, Voltar returns to the list. Someone removing that handler as noise would ship it silently.
4. **F10 and F11, unproven.** Product is right at HEAD: the name carries the whole title, including what the clamp hides.
5. **Card focus outline meets the badge, cosmetic, made by the fix.** Block link: outline 4 px below the link, meta row starts exactly there (125 + 4 = 129, and 351 + 4 = 355). On `cartao-foco-fila-linha0-390.png` the bottom edge touches the badge. It is also 358 px wide around a short title. Reads fine, and it is a clean rectangle.
6. **Stale comment.** `web/src/chamados/Chamados.tsx:107` still says "o número é o link"; true of the table, not of the card.
7. **Enviar test budget.** See below.
8. **Recorded out of scope, unchanged, no FAIL:** collapsed rail cutting `Aparência` on short screens (the 4 footer rows did not grow), `Total` 8 px inside the numbers (seen on `indicadores-1440-claro.png`), ranking bar as a pill, clip 6 px below the field's centre. Residues carried: `transition-all` on the outline offset, `focus:ring-2`. Not this feature: demo logo's white background, brightest in dark (`fila-1440-escuro.png`).

### Round 2's 4 findings: closed

1. **Accents under line 2: closed, by eye and by pixel.** At 360 and 390, Fila and Solicitações, 4× scale: real capitals title with `Á`, `Ã`, `Í` on line 3 (`SOLICITAÇÃO DE SEGUNDA VIA DO BOLETO ... REITORIA ÁREA ÃO ÍNDICE ÁGUA`), nothing under line 2 (`c36-caixa-alta-*-4x.png`). Stronger than C36's geometry: the same two lines over a third line of `ÃÁÍ...` and over one of `xxx...` give **byte-identical PNGs** in all 4 cases, and a control with 4 px of bottom slack differs and shows the loose accents (`c36-controle-com-folga-4x.png`). Paragraph 40 px, same as before.
2. **Bar below the label: closed.** F2, a survivor for 2 rounds, now dies. C37 is not vacuous: `:972` demands the label wraps.
3. **Hints on the collapsed rail: closed as written, and the source of finding 1.** Both show on hover (`dica-recolher-1280.png`).
4. **Sheet Close: closed.** F4 dies.

### The Enviar run (brief item 2)

**Not reproduced, and not a flake I can show at HEAD.** C27 clean 3 times, 197 of 197: twice quiet, once with every core held busy by a stress script (175 s). The test alone: 40 of 40 while the image built from cache, 60 of 60 during an uncached `docker build` plus the stress script, 12 of 12 at 30× CPU throttling by CDP. In those 24 throttled measures the height and `y` differences were 0 and 0, so **the geometry has no timing dependency**. The only timing dependency I found is the budget: this test has no `test.setTimeout` and opens 2 pages inside the default 30 s, while its neighbours set 240 s. At 30× each page took about 15 s, so it passes with almost no margin. That fits a stall during a Docker build, but the builder's report does not record the failure's message, so this is a likely cause and not a proven one.

### Card link (brief item 3)

- **Click area:** title and number are now the link, full width, 20 or 40 px tall; row and meta row still navigate. Measured: 1 click on the title adds 1 history entry, Voltar returns to the list, click on meta navigates, Enter on the link navigates.
- **Screen-reader name:** `ONE-123 <whole title>`, including what the clamp hides, with the space between them (aria snapshot; no real screen reader).
- **Focus outline:** one clean rectangle, solid 2 px, offset 2 px, around the 2 lines; 0 clipping ancestors at 390. Finding 5.
- **Staff menu and nesting:** `LinhaCompacta` has no action menu, the row has 1 interactive element, 0 inside the link, no link or button ancestor; only `span` inside the `a` inside the `p`, so valid. No proof holds this; I did not inject a nested control, as no plausible change asks for one.
- **Desktop table:** does not share the code. `LinhaDaTabela` is untouched; links read `ONE-123` at 768 and 1280, and 767 is the card.
- **44 px:** the row is the target at 91 to 113 px; `ux.spec.ts` `Alvos` has no type for this link, and it did not have one before. Hover underlines the whole title, the ellipsis not (`cartao-hover-fila-390.png`).

### The C33 edit (brief item 4)

**It still proves its claim and is not vacuous, with one thing to know.** At HEAD the link has 0 clipping ancestors at 390, so `r.fora` at `:792` is empty because the list is empty, and `r.cortes` is no longer asserted. That is the correct state of the fix: the claim "inside every clipping ancestor" is met by having none. What keeps it honest: the control at `:797` shows the measure fires on a clip, and F6 and F7, a real `overflow-hidden` on the parent and on a far ancestor, both kill it with no outline offset to help. The precondition at `:791` kills the clamp moving out (F8). The control's own `overflow: hidden` plus 40 px is more than it needs, which is harmless.

### Tooltips (brief item 5)

- **Collapse hint and Ctrl+B: no collision.** The hint does not name the shortcut. Hover, Ctrl+B: hidden when open. Ctrl+B again with the pointer parked: visible again, right, the pointer is on the button. Click and Enter: closed, nothing stuck. Focus plus Ctrl+B: nothing stuck.
- **Drawer and touch for collapse: no.** The button is not visible in the drawer, and a tap at 1024 shows no hint.
- **User row and its menu while open: no visible conflict.** After a click the tooltip is still mounted for an instant under the menu, fully covered (`usuario-menu-aberto-1280.png`), and leaves at the next pointer move; by keyboard, none. Highlight and `aria-expanded` are right, and the menu anchors to the trigger. In the drawer a tap opens the menu with no visible hint.
- **User row after its menu closes: yes.** Finding 1. **Esc in the drawer: yes.** Finding 2.

### "Looks AI or template-made": 3 out of 10

**Carried from round 2, nothing visual changed here but the hover and focus of the card link.** By screen: Fila 2, Indicadores 2.5, Assistente 3, Detalhe 4. What holds it at 3: sidebar plus top bar plus content is still the shape of many panels, Lucide on every row, and on Detalhe the rounded "Ações" card, grey summary and bubbles. The white logo box costs more than anything in the code. A reviewer's judgement, not a measure.

- **Opened by eye (`D:\one-system\.playwright-mcp\estrutura\verificador-r3\`):** `assistente-390-claro`, `assistente-1440-claro`, `fila-390-claro`, `fila-1440-claro`, `fila-1440-escuro`, `indicadores-390-claro`, `indicadores-1440-claro`, `detalhe-390-claro`, `detalhe-1440-claro`, `c36-caixa-alta-fila-360-4x`, `c36-controle-com-folga-4x`, `cartao-foco-fila-linha0-390`, `cartao-foco-fila-linha2-390`, `cartao-hover-fila-390`, `dica-recolher-1280`, `usuario-menu-aberto-1280`, `usuario-apos-esc`, `toque-dica-presa-Ana`. The real logo, icon and assistant image were served through my fixture, read-only from :8080.
- **Saved, metrics only:** the other `c36-caixa-alta-*` (pixel equality measured), `cartao-foco-solicitacoes-*`, `cartao-hover-solicitacoes-390`, `dica-recolher-pos-atalho`, `usuario-menu-teclado-1280`, `gaveta-usuario-menu-390`, `indicadores-1440-escuro`.
- **Not checked:** Safari, Firefox and a physical phone or tablet, so touch is Chromium's emulation; a real screen reader; step 5, the walk with the user, is theirs on return; `Sair` from the collapsed rail by hand, the real e2e covers `Sair` by Conta; `aria-describedby` left on the trigger by the hidden tooltip; dragging to select a title now inside a link; screens the fix did not touch, carried.

## Gate

`npx vitest run` - 524 passed, 0 failed. Layout suite - 197 passed, 0 failed, 3 runs. Full e2e on my image of HEAD - 233 passed, 0 failed. `npm --prefix web run build` exit 0. `crapper` exit 0 at 9.99, `dryer` no candidates, `git diff --quiet 93d5889 HEAD -- api api.Tests` exit 0.

Cleanup done, each by name or PID: previews on 5198 and 5199, containers `one-r3-*` with their anonymous volumes, network `one-r3`, volume `one-r3-minio-data`, images `one-r3:49f70bc` and `one-r3-carga:x`, scratch worktree with its junction removed first. The uncached build's layers remain in Docker's build cache, since no prune was run. The API on :8080 answered 200 and was not touched, no `one-system-*` container was entered, and `.env` was not read.
