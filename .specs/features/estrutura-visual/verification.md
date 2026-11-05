# Estrutura visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 93d5889..44bfd34 (HEAD); fix range 104706b..44bfd34; only `web/` and `.specs/` change (`git diff --quiet 93d5889 HEAD -- api api.Tests` exits 0)
**Round**: 2 - scoped
**Verifier**: fresh sub-agent with no inherited context, round 2 (author != verifier); it wrote none of this code, fixed nothing and committed nothing

**All 5 findings of round 1 are closed, measured.** All 35 proofs ran green at HEAD. The FAIL rests on these, all small:

1. A new visible defect made by the fix: the 4 px padding of the clamp lets the top of the third line show. Accents of a capitals title float under the second line (`Chamados.tsx:53`). Lowercase text is clean.
2. Mutant survives the whole C27 suite: ranking bar above the label, against `## Screens` ("uma barra embaixo do rótulo"). The assertion at `arranjo.spec.ts:290` does not test what its comment says. This one is carried from round 1, where it was also a survivor.
3. Hint missing on 2 footer buttons of the collapsed rail, against `## Screens` ("só ícones com dica"). The product harm is small. The fix is 2 props or a sentence amending the plan, and that choice is the user's.
4. Mutant survives: `focus-visible:opacity-100` removed from `ui/sheet.tsx`. The product is right at HEAD, measured by hand; no proof holds it.

Nothing else is worth a round. My judgement: items 1, 2 and 4 are one short fix pass; the gate reads the survivors and the uncovered cells, so I did not soften the rows.

## Binding sources

Step 1 redone only for the screens the fix touched (composer, table, cards, rail, ranking) and for the Preto token. The rest is carried from `734d29e`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/estrutura-visual/plan.md` `## Screens` | yes, verified at 44bfd34 | none | ranking bar below the label (`:62`, fault F14 survives); hint on the collapse and user buttons of the collapsed rail (`:58`, measured: `[role=tooltip]` empty on hover, "Tema" and "Contato" do have it). Footer order, total in one line and focus below 768 px, uncovered in round 1, now have C34, C31 and C33 |
| `.specs/features/estrutura-visual/pesquisa.md` §1 bar shape | yes, verified at 44bfd34 | none: the bar is a border, and it survives forced colours, seen by eye | - |
| `.specs/STATE.md` AD-027 and `redesign-institucional/plan.md:103` row `--sidebar` | yes, verified at 44bfd34 | none: P7 restored `0 0 0`; `index.css:87`, `interface.test.ts:68`; C7 no longer over-reads AC 6 | - |
| `.specs/STATE.md` AD-034 | carried from 734d29e | none | `data-barra` is 6 px tall with `rounded-xs`, so it renders as a full pill, still visible on the prints; `pílula só em avatar` only filters `lado >= 8` (`identidade.spec.ts:277`). The handoff records it as out of scope |
| `.specs/features/revisao-ux/plan.md:106` "o assunto, até 2 linhas" | yes, verified at 44bfd34 | none: the clamp is proven by `ux.spec.ts:819` (F6 killed). That assertion cannot see the bleed of finding 1 | - |
| `.specs/features/revisao-ux/pesquisa.md` §4 44 px | yes, verified at 44bfd34 | none: collapse button at coarse pointer now x = 1.5, 44 px, in a 47 px rail | - |
| `.specs/STATE.md` AD-028, AD-035, AD-037; `identidade-visual/pesquisa.md` | carried from 734d29e | none | - |

## Checks

Proofs ran at `44bfd34`. Vitest: one JSON run, 524 of 524 passed in 55 files, each named test found. Build exit 0, precache 11 entries, no `Grafico-*`. Layout: one call, 193 of 193 passed, 157 s, against `vite preview` on 5199, each named test found passing in the JSON. Full e2e: 229 of 229 passed, 511 s, against my own image of HEAD on 8089 with its own Postgres, MinIO and Mailpit, `E2E_INSTITUICAO=e2e`, `E2E_ADMIN_EMAIL=admin@e2e.one`, `E2E_CONTAINER=one-v2-api`; `plataforma.spec` `manifesto e service worker` and `casca-real` are in it. Proofs re-ran for every check. Citations refreshed for `casca.spec.ts` and `interface.test.ts`, the test files the fix touched. Judgment of the unchanged assertions is carried from `734d29e` and marked `carried`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | outline solid, ≥ 2 px, ≥ 3:1, 4 screens × 3 themes × 3 brands | layout run | `web/e2e/casca.spec.ts:87` `expect(f.largura).toBeGreaterThanOrEqual(2)`, `:88` contrast ≥ 3 (carried) | PASS |
| C2 | forced colours keep the outline | layout run | `web/e2e/casca.spec.ts:111` width ≥ 2, `:123` (carried) | PASS |
| C3 | no halo on Button and Input; no class in `web/src` | layout run, Vitest | `web/e2e/casca.spec.ts:141-142`; `web/src/test/interface.test.ts:106` (carried). Precision gap of round 1 stays: `focus:ring-2` on the skip link and `Editor.tsx:42` | PASS |
| C4 | `--ring` without colour and with brand | layout run, Vitest | `web/e2e/casca.spec.ts:163`, `:165-166`; `web/src/test/interface.test.ts:72` (carried) | PASS |
| C5 | dashed attachments at 3:1 | layout run | `web/e2e/casca.spec.ts:212-213`, `:216` `medidas` = 24 (carried) | PASS |
| C6 | outline inside clipping ancestors at 1280 | layout run | `web/e2e/casca.spec.ts:258` `r.cortes >= 1`, `:259` `r.fora` empty; verified at 44bfd34, killed by F7 | PASS |
| C7 | sidebar differs by brand in light and dark; `#000` in Preto with 3 brands; text ≥ 4.5:1 | layout run, Vitest | `web/e2e/casca.spec.ts:285` `toEqual([0, 0, 0])`, `:286`, `:281`; `web/src/test/interface.test.ts:68`, `:199`; verified, killed by F3a and F3b | PASS |
| C8 | 3 px bar, colour, weight, no background, `aria-current`; control | layout run | `web/e2e/casca.spec.ts:312` reads `borderLeftWidth` of `::before`, `:325` width, `:326` colour, `:333` control; verified, killed by F4 | PASS |
| C9 | Tema in the footer, not in the top bar; student by Conta | layout run | `web/e2e/casca.spec.ts:365`, `:367`, `:371`, `:374`, `:379`, `:383` (carried) | PASS |
| C10 | name and role, no chevrons, no initials, Sair | layout run | `web/e2e/casca.spec.ts:391-397` (carried) | PASS |
| C11 | initials only when collapsed | layout run | `web/e2e/casca.spec.ts:408-409`, `:413`, `:416` (carried) | PASS |
| C12 | top bar opaque, no blur, no separator | layout run | `web/e2e/casca.spec.ts:435-438` (carried) | PASS |
| C13 | collapse in footer, 1 svg, toggles | layout run | `web/e2e/casca.spec.ts:450-462` (carried) | PASS |
| C14 | Menu in top bar below 768 for non-students | layout run | `web/e2e/casca.spec.ts:475`, `:478-480`, `:486` (carried) | PASS |
| C15 | composer in one line, sizes, no shadow | layout run | `web/e2e/casca.spec.ts:502-512` (carried; fix touched Enviar, form still 44 px at 1440) | PASS |
| C16 | field border at 3:1 | layout run | `web/e2e/casca.spec.ts:535-536`, `:539` (carried) | PASS |
| C17 | Encerrar with Falar, above the field | layout run | `web/e2e/casca.spec.ts:548`, `:554-555` (carried) | PASS |
| C18 | Enter sends once; empty disables; Shift+Enter breaks | layout run | `web/e2e/casca.spec.ts:568`, `:574-578` (carried) | PASS |
| C19 | no box, header without fill, first column aligned | layout run | `web/e2e/casca.spec.ts:614-620`; verified, killed by F8. Precision gap of round 1 stays: `thead` read elsewhere | PASS |
| C20 | 4 rows in order, totals, widths | Vitest | `web/src/indicadores/ranking.test.tsx:17-25` (carried) | PASS |
| C21 | bar colour, 3:1, tabular, total on the right, no Recharts | layout run | `web/e2e/casca.spec.ts:654-662` (carried) | PASS |
| C22 | empty and absent ranking | Vitest | `web/src/indicadores/ranking.test.tsx:44-46` (carried) | PASS |
| C23 | category of 60 characters fully visible at 5 widths | layout run | `web/e2e/casca.spec.ts:695` container `c.largura <= c.visivel`; verified, killed by F2. Round 1's blindness closed | PASS |
| C24 | no `recharts`, no `Grafico.tsx`, no chunk | Vitest, build | `web/src/test/interface.test.ts:113-117` (carried) | PASS |
| C25 | Vitest and build | `vitest run`, `npm --prefix web run build` | `web/src/indicadores/ranking.test.tsx:12` among 524 passed; build exit 0 | PASS |
| C26 | crapper, dryer, no `api/` change | as listed, in `web/` | `.specs/features/estrutura-visual/checks.md:141` crapper exit 0; `checks.md:142` "No duplicate candidates found."; `checks.md:143` exit 0 | PASS |
| C27 | layout suite | one call, 6 files | `web/e2e/casca.spec.ts:876` among 193 passed, 0 failed | PASS |
| C28 | theme survives reload, student sends by Enter, real ranking | 8089 | `web/e2e/casca-real.spec.ts:112`, `:124`, `:127` (carried) | PASS |
| C29 | whole e2e on my image of HEAD | 8089 | `web/e2e/casca-real.spec.ts:98` among 229 passed, 0 failed | PASS |
| C30 | invariants without lowering a limit | layout run | `web/e2e/ux.spec.ts:109`, `:156`, `:348`, `:565`, `:1349`; `web/e2e/identidade.spec.ts:1245`; the fix diff edits no test but `casca.spec.ts` and one token row | PASS |
| C31 | totals 999, 1000, 12345, 1234567 in 1 line at 5 widths, 60-character category whole | layout run | `web/e2e/casca.spec.ts:742` `m.altura <= m.linha + 1`, `:748`, `:750` `medidas` = 40; verified, killed by F1 | PASS |
| C32 | active bar visible under forced colours; control | layout run | `web/e2e/casca.spec.ts:773`, `:775`, `:776`; verified, killed by F4; seen by eye | PASS |
| C33 | focus whole in cards at 390, first column at 1280, Close at opacity 1 and 3:1 | layout run | `web/e2e/casca.spec.ts:791` `r.fora` empty, `:813`, `:815`, `:828`, `:831`; verified, killed by F5, F7, F9. **Dialog only**: the sheet Close has no proof (F10) | PASS |
| C34 | footer order; collapse inside the rail at coarse pointer | layout run | `web/e2e/casca.spec.ts:848`, `:861`, `:862`; verified, killed by F12, F13 | PASS |
| C35 | Enviar the height of the field and aligned; ≥ 44 at 390 | layout run | `web/e2e/casca.spec.ts:876`, `:877`; verified, killed by F11 | PASS |

Every check holds as written. The FAIL comes from what no check reaches, below.

## Coverage

Recomputed at 44bfd34 for the rows the fix touched; the others are carried from 734d29e.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| screens in the focus sweep (4) | plan AC 1; carried | `casca.spec.ts:38-43` | - |
| themes (3), brands (3) | `index.css`; carried | loops `casca.spec.ts:8-9` | - |
| Preto `--sidebar` × brands (3) | AD-027, P7 | C7 `casca.spec.ts:285` | - |
| attachment uses (4) | `grep CampoArquivo`; carried | `casca.spec.ts:174-196` | - |
| doors (4) | plan `Landing` | door 1 C1 C3 · door 2 C4 · door 3 C8, and forced colours C32 · door 4 C21 C24 | - |
| sidebar states (2) | `Autenticado.tsx:156` | open C10 · collapsed C11 | - |
| footer items (4) and their order | plan `## Screens` | Contato, Tema, user, collapse, order C34 | - |
| collapsed rail hints (4 footer buttons) | plan `## Screens:58`, measured on hover | Contato and Tema render a hint, no check names it | hint on collapse and on the user button: not rendered, no check |
| widths for focus, "em toda tela" | plan `## Screens:63` | 1280 C1 C6 C33 · 390 C33. 360 and the other lists at 390 I walked, none cut, no proof | - |
| ranking cell values (2) and arrangement | plan `## Screens:62` | category C20 C23 · total C20 C21 C31 | bar below the label (F14) |
| totals × widths (4 × 5) | plan AC 19, 21 | C31, 40 measures | - |
| widths for the cut (5) | plan AC 21 | C23, reading the container | - |
| ranking states (3) | plan `Observable`; carried | data C20 C21 C28 · empty C22 · absent C22 | - |
| Close controls with `focus-visible:opacity-100` (2) | `grep` on `web/src/ui` | `ui/dialog.tsx` C33 | `ui/sheet.tsx` (F10) |
| S0 suites (5) | `checks.md` | C25, C26, C27, C28, C29 | - |

## Test policy rows

No `Test policy` section in `checks.md`.

## Faults injected

Scratch worktree under the ignored `TestResults/`, own build and preview on 5198, 6 builds. Real tree porcelain matched the baseline before and after. Over the cap of 5 because the brief asks at least one per fixed item. Each proof below reported the assertion message quoted, which is what confirms the fault ran; faults sharing a build had separate tests, and F6 with F10 shared a whole-suite run in which only F6's test failed.

| Mutation | Location | Killed | Proof and message |
| --- | --- | --- | --- |
| F1 total: wrap classes on both cells | `web/src/indicadores/Indicadores.tsx:88` | yes | C31 "360: total 1234567 em 1 linha" |
| F2 category back to `nowrap` | `web/src/indicadores/Indicadores.tsx:88` | yes | C23 "360: a caixa da tabela 0 não rola" (F8 of round 1, now dead) |
| F3a Preto `--sidebar` back to the round 1 mix | `web/src/index.css:87` | yes | C7 "preto sem cor: barra #000" |
| F3b Preto `--sidebar` at `oklch(0.05 0 0)` | `web/src/index.css:87` | yes | C7 passes, because it rounds to `rgb(0,0,0)` and is the same colour on a screen; `tokens da paleta` and `tokens de Visual` kill it |
| F4 active bar back to `background` | `web/src/ui/sidebar.tsx:471` | yes | C32 "o ativo tem 1 borda de barra"; C8 "barra do ativo" |
| F5 clamp on the link itself, span without it | `web/src/chamados/Chamados.tsx:53-54` | yes | C33 "/univag/fila: o link tem ancestral que corta (line-clamp)". The precondition dies, not the outline assertion |
| F6 clamp removed, `overflow-hidden` kept on the span | `web/src/chamados/Chamados.tsx:53` | yes | `linha de solicitação em 3 linhas` "solicitacoes: assunto em até 2 linhas"; C33 alone stays green |
| F7 table without the slack (`w-full`, no `-ms-1 ps-1`) | `web/src/ui/table.tsx:13` | yes | C33 "e continua inteiro no contêiner"; C6 |
| F8 `-ms-1` removed, first column 4 px off the page | `web/src/ui/table.tsx:13` | yes | C19 "/univag/fila light: primeira coluna" |
| F9 Close of dialog without `focus-visible:opacity-100` | `web/src/ui/dialog.tsx:73` | yes | C33 "light: opacidade 1" |
| F10 Close of sheet without `focus-visible:opacity-100` | `web/src/ui/sheet.tsx:77` | no | whole C27 suite. C33 opens the dialog only. Low stakes: the same class in the sibling file is held |
| F11 Enviar 36 px on desktop | `web/src/assistente/Assistente.tsx:310` | yes | C35 "1440: mesma altura" |
| F12 collapse without `self-center` | `web/src/Autenticado.tsx:234` | yes | C34 "recolher: x ≥ 0" |
| F13 Tema above Contato | `web/src/Autenticado.tsx:230-231` | yes | C34 "Contato, Tema, usuário, recolher: de cima para baixo" |
| F14 ranking bar above the label | `web/src/indicadores/Indicadores.tsx:89-91` | no | 193 of 193 pass. `web/e2e/arranjo.spec.ts:290` asserts the bar stays inside the cell, under a comment saying "embaixo da categoria". A refactor of that cell could hit it; one assertion closes it |

## Findings, ranked by what a person meets

1. **Clamp bleed, made by the fix (seen by eye at 4×; `cartao-sangria-caixa-alta-4x.png`).** `web/src/chamados/Chamados.tsx:53`: `p-1` on the clamped span leaves 4 px of the third line inside the clip. A title in capitals with `Á`, `Ã`, `Í` on line 3 shows loose accents under the second line. A student typing in capitals is plausible. Lowercase Portuguese is clean (`cartao-sangria-minusculas-4x.png`), because lowercase accents and ascenders start about 4.6 px down the line. The clamp itself holds: 2 lines, `p` 40 px, card 113 px with 2 lines and 93 px with 1. Round-1 fix idea for the bottom slack: the outline only needs it when the title has 1 line, about 2 px past the line box; capital accents begin around 1.75 px, so measure before picking a value. Not tested in Safari, where a phone student would meet it.
2. **F14, bar position unproven.** See above. Product is right at HEAD.
3. **Hints on the collapsed rail.** Decision for the user: add the hint to collapse and user, or amend `## Screens`. See "minor items" below.
4. **F10, sheet Close unproven.** Product measured right: `Mais` at 390, Close by keyboard, opacity 1, outline solid 2 px. Note: the navigation drawer has no Close button, so the sheet Close is met on `Mais` and similar sheets.
5. **Collapsed rail clips the last link, carried from round 1.** With 3 roles the content area is `overflow: hidden`, with no scroll: `Aparência` is cut at 1280×600 fine pointer and at 1024×768 coarse pointer (bottom 585 against 560). Fine at 1366×650, and a plain administrator or attendant was never cut in the sizes I measured. The footer rows of this feature make it reachable. Minor.
6. **Clip beside the field at desktop, cosmetic.** The fix aligned Enviar at 44 px; the clip stays 32 px bottom-aligned, so its icon sits 6 px below the field's centre. Seen on `composer-1440.png`.
7. **Ranking edge, cosmetic.** `first:ps-0` has no twin on the last column, so `Total` ends 8 px inside the numbers above it (1408 against 1416 on `indicadores-1440-claro.png`).
8. **Residues carried, cosmetic.** `transition-all` on `Button` animates the outline offset from 0 to 2 px, measured mid-way at 0 px on `Novo`; `focus:ring-2` residues; bar as a pill under another height.
9. **Not this feature.** Demo logo with a white background is a bright box on the tinted bar and a very bright one in Preto (data, not code). Calendar icon of date inputs is dim in Escuro, same on the `antes` print.

### The 5 findings of round 1: closed

1. **Total in one line: closed.** Fixture: 999, 1000, 12345, 1234567 at 360, 390, 768, 1024, 1440: 1 client rect, 16 px, column 85 px, container `scrollWidth = clientWidth`, no page overflow. Real data: I inserted those totals in my own database (1,249,911 chamados, ranking answered in 1.9 s), and measured the same at the 5 widths on my image; `ranking-real-390.png`.
2. **C23 sees the cut: closed.** F2 dies with the container message.
3. **Preto `#000`: closed, no seam.** Measured with no colour, `#8a1538`, `#0b6e4f` and a dark `#1a2a6c`: sidebar, body, main, header and inset all `oklch(0 0 0)`. By eye on `fila-1440-preto.png` there is no colour step; the only mark is the 1 px `--sidebar-border`, as in the other themes. The bar is visible on black (`oklch(0.62+)`).
4. **Active bar in forced colours: closed.** Seen open and collapsed (`barra-forcadas-aberta.png`, `barra-forcadas-recolhida.png`). Border 3 px solid, `rgb(0, 0, 159)` against white. Normal: 3 px, `rgb(138, 21, 56)`, open and collapsed.
5. **Focus whole in cards and first column: closed.** 360 and 390, Fila and Solicitações, 3 title lengths: nothing cut. First column at 1280 seen at 3×: `foco-primeira-coluna-3x.png`, the outline surrounds the letters.

### The fix's side effects

- **`-ms-1 ps-1` on the table: no harm.** 8 screens at 800, 1024, 1280 and 1440: first column text at the `h1` x (280, or 272 at 800), right edge on the parent's, `scrollWidth = clientWidth` everywhere including the long-text fixture at 768 and 1024, no page overflow. Parents are stretching flex, so `w-auto` still fills. Focus on up to 12 controls per screen and on the card lists at 390: nothing cut.
- **`-m-1 p-1` on the card span:** height and truncation right, text x unchanged, card not taller. One defect: finding 1.
- **`::before` with `w-0` and `border-l`: right**, collapsed too.
- **`self-center`: right.** Centre 23.5 against 24 of the links; x = 9.5 fine, 1.5 coarse; open still `self-end` at x = 219.
- **`Enviar` `h-11` at desktop: reads right beside its field.** `Falar com atendente` above it is 32 px, not 36, in another row, so the 12 px difference does not read as a mistake. Finding 6 is the only rest of it.
- **`focus-visible:opacity-100`: right on both,** by keyboard 1, by pointer the dialog stays 0.7 with no focus-visible, as before.

### Round 1's minor items: should they block?

- **2-Esc drawer closure: no.** Reproduced: 2 from Tema or Contato, 1 from the user button. The first Esc closes the tooltip; the second closes the drawer; nothing is lost, and the path is keyboard below 768 px for non-students. No source decides it. Not in the gate.
- **Missing hints when collapsed: no on product grounds, yes by the letter.** The collapse icon is the standard one with an `aria-label`, and the initials are not an icon, but `## Screens` does write "com dica". It needs either 2 props or a plan amendment, so it should not stand as it is.

### "Looks AI or template-made": 3 out of 10

Same as round 1, 4 before the feature. This fix round moved almost nothing visually, which is what it was for. Against the `antes`, with the real logo and photo: the tinted bar with a thin active mark, footer in plain lines, open tables, ranking numbers beside their bars, written `Enviar`, and serif headings carry it. What holds it at 3: sidebar plus top bar plus content is still the shape of many panels; Lucide on every row; on Detalhe, the rounded "Ações" card, grey rounded summary and chat bubbles. By screen: Fila 2, Indicadores 2.5, Assistente 3, Detalhe 4. The white logo box costs more than anything in the code, and most in Preto. A reviewer's judgement, not a measure.

- **Opened by eye (`D:\one-system\.playwright-mcp\estrutura\verificador-r2\`):** `assistente-1440-claro`, `assistente-390-claro`, `assistente-conversa-1440-claro`, `fila-1440-claro`, `fila-390-claro`, `fila-1440-escuro`, `fila-1440-preto`, `indicadores-1440-claro`, `indicadores-390-claro`, `indicadores-1440-escuro`, `indicadores-1440-preto`, `detalhe-1440-claro`, `detalhe-390-claro`, `composer-1440`, `ranking-totais-390`, `ranking-real-390`, `barra-forcadas-aberta`, `barra-forcadas-recolhida`, `recolhida-grossa-1024`, `cartao-foco-fila-390`, `cartao-sangria-4x`, `cartao-sangria-minusculas-4x`, `cartao-sangria-caixa-alta-4x`, `foco-primeira-coluna-3x`, `fechar-dialogo-foco`. `antes`: `antes-fila-1440-light`, `antes-assistente-1440-light`, `antes-indicadores-1440-dark`.
- **Saved, metrics only:** `ranking-totais-1440`, `barra-normal-recolhida`, `cartao-foco-meus-390`.
- **Not checked:** Safari, Firefox and a physical phone; a real screen reader; real Windows High Contrast, only Chromium's emulation; the login photo, since the demo's `login` image shows only on the login screen, which this fix did not touch; `93d5889` running; step 1 and focus walk on screens the fix did not touch, carried from `734d29e`.

## Gate

`npx vitest run` - 524 passed, 0 failed. Layout suite - 193 passed, 0 failed. Full e2e on my image of HEAD - 229 passed, 0 failed. `npm --prefix web run build` exit 0. `crapper` exit 0 at 9.99, `dryer` no candidates, `git diff --quiet 93d5889 HEAD -- api api.Tests` exit 0.

Cleanup done: previews on 5198 and 5199, containers `one-v2-*` with their anonymous volumes, network, image, scratch worktree with its junction removed first, and the scratch files. The API on :8080 answered 200 and was not touched, and no `one-system-*` container was entered. `.env` was not read.
