# Estrutura visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 93d5889..734d29e (HEAD); only `web/` and `.specs/` change (`git diff --name-only` filtered, and `git diff --quiet 93d5889 HEAD -- api api.Tests` exits 0)
**Round**: 1 - full
**Verifier**: fresh sub-agent with no inherited context (author != verifier); it wrote none of this code, fixed nothing and committed nothing

**What fails, in order.**
1. A real defect on a screen: a ranking total of 4 or more digits breaks across lines at every width (`1000` reads "100 / 0", `1234567` takes 3 lines). No check measures the total.
2. C23 cannot see the cut it exists to prove: with the category back to `nowrap`, the table overflows its scroller by 103 px at 360 px and C23 stays green (F8).
3. C7 forces `--sidebar` away from `#000` in Preto, which contradicts the `--sidebar` row of AD-027's token table with no AD amending it. This one needs the user's word, not a code fix.
4. The active item's bar disappears under forced colours, the case the research chose that bar shape to survive.
5. Focus is cut at 390 px on the list cards of Fila and Minhas solicitações, and only 1280 px was measured.

Everything else that this report marks as a gap is small. All 30 proofs ran green at HEAD, and nothing regressed from `revisao-ux`, `aparencia-instituicao` or `identidade-visual`.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/estrutura-visual/plan.md` doors 1-4, ACs 1-22, `## Screens` | yes, whole | none. "sem separador" is the `Separator` component (see deviation 1) | footer order (Contato, Tema, nome e papel, recolher: F3 survives); bar below the label (F7 survives); ranking total in one line; focus below 768 px ("em toda tela"); hint on the collapse and user buttons of the collapsed rail ("só ícones com dica") |
| `.specs/features/estrutura-visual/pesquisa.md` | yes, whole | none in the checks | §1 "desenhe a barra com borda ou pseudoelemento [...] não com box-shadow, que some em cores forçadas": the `::before` is painted with `background-color`, which forced colours also remove; no check looks (measured `rgb(255, 255, 255)`, Canvas) |
| `.specs/STATE.md` AD-027 and `redesign-institucional/plan.md` `## Visual` row `--sidebar` | yes | C7 demands `--sidebar` differ between brands "nos 3 temas", so Preto cannot keep `0 0 0`; `index.css:87` now gives `rgb(10,5,6)`. Plan `## Impact` lists AD-029 and AC 31 as amended and does not list this. AC 6 says "como os outros neutros", and `--background`, the neutral that defines the theme, stays untinted `0 0 0` in Preto, so C7 over-reads AC 6 | - |
| `.specs/STATE.md` AD-028, AD-034, AD-035, AD-037 | yes | none | AD-034: `data-barra` is 6 px tall with `rounded-xs` (4 px), so it renders as a full pill; `pílula só em avatar` only filters `lado >= 8` (`e2e/identidade.spec.ts:277`). The height moved below the filter instead of the radius coming down |
| `.specs/features/revisao-ux/pesquisa.md` | yes (principles 1-5, 12-15, referências, o que evitar) | none | §4 44 px: the collapse button at coarse pointer in the collapsed rail is 44 px wide in a 48 px rail and starts at x = -5, partly outside the viewport |
| `.specs/features/identidade-visual/pesquisa.md` | yes (§2 to §6, o que evitar) | none. §2.3 "o tema preto puro usa fundo em degraus em vez de borda" favours the Preto sidebar as a design, but it is research, and the AD and the token table are the decision | - |

**Per-screen enumeration against `## Screens`.**

| Screen | Copy and controls | Arrangement | Verdict |
| --- | --- | --- | --- |
| Barra aberta | logo or sigla, groups, Contato, Tema, nome, papel, recolher: C8, C9, C10, C13 | groups above footer `arranjo.spec.ts:791`; user above recolher `:790`; **order of Contato, Tema and user: nobody** | gap, F3 |
| Barra recolhida | initials C11, link hint `arranjo.spec.ts:829-831` | icons only by eye. **Collapse and user buttons have no hint** (measured: `[role=tooltip]` empty on hover) | gap, minor |
| Topo | title, Avisos `push.spec.ts:99`, no Tema C9, Menu C14 | opaque, no blur, no `Separator` C12. `border-b` stays | ok |
| Caixa de envio | Enviar written, clip, Encerrar next to Falar: C15, C17 | one line C15, order `arranjo.spec.ts:129-134` | ok; field 44 px beside a 36 px button at desktop is cosmetic |
| Tabela | C19; cards unchanged `celular.spec` | no outline, first column at text margin C19 | ok |
| Ranking | category, total, bar: C20, C21 | total to the right C21. **Bar below the label: nobody** (F7). **Total in one line: nobody** | gap |
| Foco | C1, C2, C3 | C6 at 1280 only. **Below 768 px: nobody**, and it is cut there | gap |
| Anexos | C5 | dashed, `--input` C5 | ok |

## Checks

Proofs ran at `734d29e`. Vitest: one JSON run, 524 of 524 passed, 55 files, each named test found in the output. Layout: one call, 188 of 188 passed, 152 s, against `vite preview` on 5199. Full e2e: 224 of 224 passed, 526 s, against my own image of HEAD on 8089 with an isolated Postgres, MinIO and Mailpit, plus `E2E_INSTITUICAO=e2e`, `E2E_ADMIN_EMAIL=admin@e2e.one` and `E2E_CONTAINER=one-verif-api` (`plataforma.spec` `manifesto e service worker` included).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | outline solid, ≥ 2 px, ≥ 3:1 on 4 screens × 3 themes × 3 brands | `casca.spec` in the C27 run | `web/e2e/casca.spec.ts:87` `expect(f.largura).toBeGreaterThanOrEqual(2)`, `:88` `contraste(f.composta, f.fundo) >= 3`, `:93` `telas` = 36 | PASS |
| C2 | forced colours keep the outline, question row included | same | `web/e2e/casca.spec.ts:110-111`, `:123` `f.estilo` not `none` | PASS |
| C3 | no halo on Button and Input; no class in `web/src` | same, Vitest | `web/e2e/casca.spec.ts:141-142` `solid` and `f.sombra` `none`; `web/src/test/interface.test.ts:106` | PASS. Precision gap: the grep spells 3 forms, so `focus:ring-2` stays on the skip link and `Editor.tsx:42` |
| C4 | `--ring` without colour, with brand, `--sidebar-ring` | same | `web/e2e/casca.spec.ts:163` `oklch(0.5 0 0)` and `oklch(0.556 0 0)`, `:165-166`; `web/src/test/interface.test.ts:72` | PASS |
| C5 | dashed attachments at 3:1, 4 uses, 3 themes, 2 brand states | same | `web/e2e/casca.spec.ts:212-213`, `:216` `medidas` = 24 | PASS |
| C6 | outline inside clipping ancestors, on 3 targets at 1280 | same | `web/e2e/casca.spec.ts:244` offset < 0, `:259` `r.fora` empty, `:262` control | PASS as written; see Coverage for below 768 px |
| C7 | sidebar tokens differ between brands, text ≥ 4.5:1 | same, Vitest | `web/e2e/casca.spec.ts:284` `.not.toEqual`, `:281`; `web/src/test/interface.test.ts:197-199` | PASS as written; the check itself contradicts AD-027 on Preto |
| C8 | 3 px bar, colour, weight, no background, `aria-current` | same | `web/e2e/casca.spec.ts:323-329`, `:331-333` control | PASS |
| C9 | Tema in the footer, not in the top bar; student by Conta | same | `web/e2e/casca.spec.ts:363`, `:365`, `:369`, `:372`, `:377`, `:381` | PASS |
| C10 | name and role, no chevrons, no initials, Sair | same | `web/e2e/casca.spec.ts:389-395` | PASS |
| C11 | initials only when collapsed | same | `web/e2e/casca.spec.ts:406-407`, `:411`, `:414` | PASS |
| C12 | top bar opaque, no blur, no separator, 3 themes | same | `web/e2e/casca.spec.ts:433-436` | PASS |
| C13 | collapse in footer, 1 svg, no visible text, toggles | same | `web/e2e/casca.spec.ts:448-460` | PASS |
| C14 | Menu in top bar below 768 for non-students | same | `web/e2e/casca.spec.ts:473`, `:476-478`, `:484` | PASS |
| C15 | composer in one line, sizes, no shadow | same | `web/e2e/casca.spec.ts:500-510` `f.height <= 60`, `['none','0px']`, 44 px, 16 px | PASS |
| C16 | field border at 3:1 | same | `web/e2e/casca.spec.ts:533-534`, `:537` | PASS |
| C17 | Encerrar with Falar, above the field | same | `web/e2e/casca.spec.ts:546`, `:552-553` | PASS |
| C18 | Enter sends once; empty disables; Shift+Enter breaks | same | `web/e2e/casca.spec.ts:566`, `:572-576` | PASS |
| C19 | no box, header without fill, weight 600, darker rule, first column aligned | same | `web/e2e/casca.spec.ts:612-618` | PASS. Precision gap: `th` background is read, `thead` is not (F6 needs `arranjo.spec.ts:1099` to die) |
| C20 | 4 rows in order, totals, widths 100, 50, 10, 0 | Vitest | `web/src/indicadores/ranking.test.tsx:17-25` | PASS as written. Precision gap: `textContent` cannot see a total broken over lines |
| C21 | bar colour, not action, 3:1, tabular, total on the right, no Recharts | same | `web/e2e/casca.spec.ts:652-660` | PASS as written. Same gap |
| C22 | empty and absent ranking | Vitest | `web/src/indicadores/ranking.test.tsx:44-46` | PASS |
| C23 | category of 60 characters **fully visible** at 5 widths | layout run | `web/e2e/casca.spec.ts:694-699` reads `td` and `tr`, which grow inside the scroller | FAIL: green while the text is outside the scroller (F8). The product is right at HEAD (container `scrollWidth` 328 = `clientWidth` 328 at 360) |
| C24 | no `recharts`, no `Grafico.tsx`, no chunk | Vitest | `web/src/test/interface.test.ts:113-117`; `grep -c recharts web/package-lock.json` = 0 | PASS |
| C25 | Vitest and build | `vitest run`, `npm --prefix web run build` | `web/src/indicadores/ranking.test.tsx:12`; 524 passed; build exit 0, precache 11 entries, no `Grafico-*`. Edits: deviation 7 | PASS |
| C26 | crapper, dryer, no `api/` change | as listed | `.specs/features/estrutura-visual/checks.md:140` crapper exit 0; `checks.md:141` "No duplicate candidates found."; `checks.md:142` exit 0 | PASS |
| C27 | layout suite | one call, 6 files | `web/e2e/casca.spec.ts:93` among 188 passed, 0 failed | PASS |
| C28 | theme survives reload, student sends by Enter, real ranking | 8089 | `web/e2e/casca-real.spec.ts:112`, `:115`, `:124`, `:127` `toHaveText(String(r.total))` | PASS |
| C29 | whole e2e on my image of HEAD | 8089 | `web/e2e/casca-real.spec.ts:98` among 224 passed, 0 failed | PASS |
| C30 | invariants without lowering a limit | layout run | `web/e2e/ux.spec.ts:109`, `:156`, `:348`, `:565`, `:1349`; `web/e2e/identidade.spec.ts:1245`; diff shows no limit lowered | PASS |

## Coverage

Recomputed from `index.css`, `Autenticado.tsx`, `grep CampoArquivo` and the plan, not from the table in `checks.md`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| screens in the focus sweep (4) | plan AC 1 | loops in `casca.spec.ts:38-43` | - |
| themes (3), brands (3) | `index.css`, `checks.md` rule | loops `casca.spec.ts:8-9`, as the table says | - |
| attachment uses (4) | `grep -l CampoArquivo`: Instituicoes, Matriculas, Documentos, ChamadoDetalhe | `casca.spec.ts:174-196` | - |
| doors (4) | plan `Landing` | door 1 C1 C3 · door 2 C4 · door 3 C8 · door 4 C21 C24 | door 3 under forced colours; the research's reason for its shape |
| sidebar states (2) | `Autenticado.tsx:156` | open C10 · collapsed C11 | - |
| footer items (4, the table says 3) | plan `## Screens` | Contato existing, Tema C9, user C10 C11, collapse C13 | their order (F3) |
| widths for focus, "em toda tela" | plan `## Screens` | 1280 only | below 768 px: `Chamados.tsx:51` `line-clamp-2` clips the card link |
| ranking cell values (2) | plan AC 19 | category C20, C23 · total C20, C21 | total in one line, 4+ digits |
| widths for the cut (5) | plan AC 21 | 360 to 1440 in C23 | the proof is blind at all 5 (F8) |
| ranking states (3) | plan `Observable` | data C20, C21, C28 · empty C22 · absent C22 | - |
| S0 suites (5) | `checks.md` | C25, C26, C27, C28, C29 | - |

## Test policy rows

No `Test policy` section in `checks.md`.

## Faults injected

Scratch worktree under the ignored `TestResults/`, own build and preview on 5198; real tree porcelain matched the baseline before and after. 8 faults against the cap of 5, because the brief wants one per slice and two survivors needed a second proof to rank them.

| Mutation | Location | Killed | Proof |
| --- | --- | --- | --- |
| F1 S1: global focus rule moved inside `@layer base` | `web/src/index.css:173` | yes | `foco sem auréola` (door 1 holds) |
| F2 S1: inward offset line removed | `web/src/index.css:175` | yes | `foco não cortado por overflow` |
| F3 S2: footer order, user above Tema | `web/src/Autenticado.tsx:231-232` | no | C9, C10, C13, `painel barra aberta`, `botão do usuário` all pass. Arrangement that `## Screens` decides |
| F4 S2: initials with the sidebar open | `web/src/Autenticado.tsx:156` | yes | `usuário em texto` |
| F5 S3: Enviar not disabled when empty | `web/src/assistente/Assistente.tsx:310` | yes | `Enter envia e campo vazio desabilita` |
| F6 S4: `bg-muted` back on `TableHeader` | `web/src/Tabela.tsx:65` | yes | C19 alone passes; `colunas largas somem no estreito` kills it |
| F7 S5: bar above the label | `web/src/indicadores/Indicadores.tsx:90-93` | no | C21, C23, `arranjo Indicadores`, `gráficos sem cartão` pass. Low stakes |
| F8 S5: category back to `nowrap` | `web/src/indicadores/Indicadores.tsx:88` | no | C23 and `Indicadores sem texto cortado` pass while the scroller measures 431 against 328 at 360. **This survivor matters**: it is the guarantee of door 4 and AC 21, and it is one class removed from `TableCell`'s default |

F7 is a mutant a future change is unlikely to hit; F3 and F8 are ones a future change can hit.

## Findings, ranked by what a person meets

1. **Ranking total splits across lines (real defect, on the print).** `web/src/indicadores/Indicadores.tsx:88` puts `[overflow-wrap:anywhere]` on both cells and `first:w-full` squeezes the last column to the `Total` header (49 px). Measured at 360, 390, 768, 1024, 1440: `999` 1 line, `1000` 2, `12345` 2, `1234567` 3. A big institution hits this on its top category, the row that matters most. The fixture has `total: 1000` (`simulada.ts`), so the builder's own print shows it. Fix: wrap only the first cell.
2. **C23 is blind (F8).** Assert `[data-slot=table-container]` `scrollWidth <= clientWidth`. Deviation 8 depends on this.
3. **`--sidebar` in Preto against AD-027.** See deviation 2. For the user: ratify with an AD line, or restore `#000` and take Preto out of C7 for that one token.
4. **Active bar lost in forced colours (seen by eye).** `web/src/ui/sidebar.tsx:471` paints `::before` with a background. Weight 600 and `aria-current` remain, so it is not lost to a screen reader. Fix: a left border, or `forced-color-adjust: none` on the pseudo-element. Ranking bars also vanish there, harmlessly, since the total is text.
5. **Focus cut on list cards at 390 (seen by eye).** `Chamados.tsx:51`, `line-clamp-2` clips the outline of the `ONE-123` link: only the bottom and right edges show, in Fila and Minhas solicitações. Also reached by a narrow window or 400% zoom.
6. **Focus outline paints over the letters of the first column link at desktop (seen at 3×).** `first:ps-0` plus the inward 2 px offset on a 16 px text link, in every list. Keyboard only; reads cramped.
7. **Close button focus below 3:1 without an institution colour.** Dialog and sheet close carry `opacity-70` (`ui/dialog.tsx:73`, `ui/sheet.tsx:77`), which also dims the outline: 2.57:1 dark, 2.65:1 Preto, 3.05:1 light, 3.66:1 dark with `#8a1538` (computed from measured colours and opacity). It is the first focus of the Contato dialog. Fix: `focus-visible:opacity-100`.
8. **Footer order unproven (F3).** One assertion.
9. **Escape in the drawer takes 2 presses when focus is on an item with a tooltip** (Tema, Contato: 2; user button: 1). Without Contato, first focus lands on Tema. At `93d5889` that first focus would have been the user button, by reading the code; I could not run the base, because `recharts` is no longer in `node_modules`.
10. **Composer at desktop:** field 44 px (`min-h-11`, a leftover of the old box) beside Enviar and the clip at 36 px, bottom-aligned, so the tops step by 8 px. At 390 all three are 44 px.
11. **Collapsed rail at coarse pointer.** Collapse button starts at x = -5 and its icon is out of line with the others. With 3 roles at 1024×768, `Aparência` is clipped under `overflow-hidden` with no scroll, because the footer now has 4 rows (156 px at fine pointer). A plain administrator has 3 fewer links and should fit (by subtraction, not measured).
12. **Pill by another name.** See `AD-034` above. `rounded-none` would let the bar be any height.
13. **Residues, cosmetic.** `focus:ring-2` on the skip link and `Editor.tsx:42` plus the outline make a 4 px band; `has-[input:focus-visible]` in `CampoArquivo.tsx:11` is redundant, because the input has `tabindex=-1` and the root takes the focus; `transition-all` on `Button` animates the outline from 3 px dark to 2 px for 150 ms.
14. **Pre-existing, not this feature.** A long attachment name overflows the page by 85 px at 360 (`Anexos.tsx`, untouched in the diff); C15 has no attachment. Focus returns to `body` after closing Contato or the drawer. A demo logo with a white background shows as a white box on the tinted sidebar (data, not code). The 60 px sidebar header line and the 49 px top bar line do not meet, as in the `antes` print.

### The coordinator's 3 readings of the prints

1. **Total broken: confirmed**, measured, finding 1. C20 and C23 do not catch it, as suspected. Neither does C21.
2. **Paler "Consultar": a captured transition, no change.** Settled, the button is `opacity 1` and `rgb(138, 21, 56)`, equal to `--primary`. The print's pixel is `155,55,85` (about 85% opacity) and the `antes` print's is `169,83,109` (about 73%), so the earlier print was paler still. `disabled:opacity-50` during the first query, then 150 ms of `transition-all`: I measured 0.98, 0.5, then 1 over a refetch.
3. **Double outline on the field: not autofocus and not a defect; cosmetic, acceptable.** On load the active element is `body`. The print shows it because the print script typed and sent, and focus stays in the field. It does appear on a pointer click, correctly: text fields always match `:focus-visible`, by the browser's heuristic. What you see is the 1 px `focus-visible:border-ring` plus the 2 px outline at offset 2, in one colour, the same on every field; the research kept `border-ring` on purpose. It reads a little heavy on the phone, where every tap shows it. If the user dislikes it, removing `focus-visible:border-ring` leaves one line and the border stays at 3:1.

### The builder's 8 deviations

1. **`border-b` on the top bar: true reading.** AC 11 writes `Separator` in code, the research says "apagar o `Separator` (:242)", the mark it names is button plus separator, and the existing test is named `cabeçalho: borda`.
2. **`--sidebar` in Preto: contradicts an active AD on the token, not on the promise.** Page background is still `#000` and `tema Preto com fundo preto` holds. Sidebar is `rgb(10,5,6)`, `rgb(5,8,7)` and `rgb(5,7,12)` across brands. By eye the step is barely there and looks fine. No test's spirit breaks, only the `Tokens` row, edited on the closed list. Decision for the user (finding 3).
3. **`shadow-xs` out of the 3 fields: fine.** Follows AD-034's no static shadow; no measure depended on it. `outline` buttons keep theirs, invisible beside a field.
4. **`first:ps-0` in shared `ui/table.tsx`: fine, with one cost.** Reaches all 7 table screens as intended, and the empty cell stays centred. Cost is finding 6. The 6 px bar is finding 12 (the handoff says height; the brief said radius).
5. **Focus: shows, by another path than the handoff says.** `CampoArquivo` keyboard focus lands on the dropzone root (`tabindex=0`), the global rule paints it (2 px, offset 2, `oklch(0.5 0 0)` without colour), and Enter opens the file chooser. Seen by eye. `data-foco` and the negative offsets work (F2). `[tabindex='-1']` is sound: Radix menu items are `tabindex=0` when focused and show outline plus `bg-accent`, which crowds the menu edge but reads. Dialogs opened by pointer show no outline on non-text first focus.
6. **`useReactTable` kept: fine.** Removing it means editing a test off the closed list for no user gain.
7. **Edits outside the closed list: all follow the arrangement, none lowers a limit.** Diffed every test body. `arranjo Assistente`, `painel barra aberta`, `valores de tipo e bordas`, `botões do cabeçalho por papel`, `sem tema gravado`, `textos` (3), `icones` renamed, `tema claro`, `cartões formatam` all as declared. No undeclared edit found. Noted, not a finding: `celular.spec` drops the 2-line limit with the chart, as door 4 implies, and `quadrado das iniciais 32×32` leaves `botão do usuário` with no replacement size.
8. **`rótulo do gráfico` deleted: forced, but not truly replaced.** The function is gone by door 4, and "até 2 linhas" ends with the chart. "Sem corte" is meant to pass to C23, and C23 is blind (F8), so that guarantee goes unproved until finding 2 is fixed. Also: it is a `aparencia-instituicao` test outside closed list item 7, where the rule says stop and ask. Recorded as process, harmless in substance.

### Other requests

- **Regressions:** none. 44 px, 16 px, contrast, tab bar, action colour, tints and 2 brands pass; every `identidade.spec` test including C47 to C57 is in the 188.
- **Focus walk:** every Tab stop read in the browser. 1280: Fila, Usuários, Documentos, Artigos, Cadastros, Detalhe, Aparência, Assistente, Indicadores. 390: Assistente, Solicitações, Conta, Fila, Usuários, Detalhe. Plus collapsed sidebar, drawer (focus trapped, first focus on Contato at the bottom), Tema popover, user menu, row actions and editor, Contato dialog by key and pointer. Only cuts: finding 5. Double-up: findings 7 and 13. Date inputs: the picker icon stop has no outline on the host, and the browser draws its own square, seen by eye.
- **Student's desktop:** Tema in the footer. Push notices in the top bar (`Autenticado.tsx:255`, proven by `push.spec.ts:99` in the 224; my blocked-service-worker capture does not show them).
- **Composer:** the conversation gains 62 px at 390, composer top at 743 against 681 on the `antes` and `depois` prints. At 360 the composer with a conversation open measures 100 px above the tab bar, against the old 162 px at 390. Long draft of 1000 characters: field stops at 208 px and scrolls, no overflow. Enviar disabled with attachments and no text, unchanged behaviour. Falar and Encerrar fit in one line.
- **Rankings, real data:** `casca-real` passes on real data. 1 category gives a full bar that reads as intended. An outlier flattens the rest to 0-7 px, which is what proportional means.
- **`recharts`:** 0 lines in the lock, no chunk, no import (remaining mentions are tests asserting absence), precache 11 entries, build ok.

### "Looks AI or template-made": 3 out of 10

Was 4. With the real Univag logo and photo in place, by eye. What moved it: no more `sidebar-07` marks (user card with chevrons, separator pair, sun in the corner, grey pill), the open table, the written Enviar, ranking bars with numbers next to them. The real logo helps as much as the plan guessed, though the white box shows. What holds it at 3: sidebar plus top bar plus content is still the shape of many panels, plus Lucide icons on every row, the rounded "Ações" card, and chat bubbles. The serif headings do real work. This matches the plan's expected 2.5 to 3. It is a reviewer's judgement, not a measure, and finding 1 pulls it up if left on the demo.

- **Opened by eye (my captures):** Fila 1280 and 1440 light, dark, Preto; collapsed at 1280 and coarse 1024; Assistente 1440 in 2 brands and 390; Detalhe 1440; Indicadores 1440, Preto not opened; ranking 390 and 1440 with 1 category and many; composer 360 and 390 in 5 states; drawer; user menu; focus on skip link, card, first column; forced colours Fila; date input. `antes` Fila and conversation, `depois` Indicadores and conversation.
- **Metrics only:** the focus-walk screens not listed above, ranking at 360, 768 and 1024, close-button contrast (computed), `real-fila-390`, `real-indic-390`, Usuários, dialogs other than as captured.
- **Not checked:** Safari, Firefox and a physical phone; a real screen reader; real Windows High Contrast, only Chromium's emulation; push on a device; `93d5889` running, since `recharts` left `node_modules`, so before numbers come from the builder's prints; Instituições and Matrículas in the focus walk (C5 reaches them, I did not walk them).

## Gate

`npx vitest run` - 524 passed, 0 failed. Layout suite - 188 passed, 0 failed. Full e2e on my image of HEAD - 224 passed, 0 failed. `npm --prefix web run build` exit 0. `crapper` exit 0, `dryer` no candidates, `git diff --quiet 93d5889 HEAD -- api api.Tests` exit 0.

Cleanup done: servers on 5198 and 5199 by PID, containers `one-verif-*` with volumes, network, image, worktree and its junction. The API on :8080 answered 200 and was not touched, and no `one-system-*` container was entered.
