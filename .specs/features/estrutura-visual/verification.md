# Estrutura visual verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 93d5889..c5f10c7 (HEAD); fix range 49f70bc..c5f10c7; only `web/` and `.specs/` change (`git diff --quiet 93d5889 HEAD -- api api.Tests` exits 0)
**Round**: 4 - scoped, closing round under P9 (`.specs/features/estrutura-visual/checks.md:44`)
**Verifier**: fresh sub-agent with no inherited context, round 4 (author != verifier); it wrote none of this code, fixed nothing and committed nothing

**The product is closed. One clause of one proof is not, and the brief makes that a FAIL.**

- **Product, closed, measured.** The stuck "Ana" hint is gone by mouse and touch, Esc from the user row closes the drawer in 1 press, the row still shows initials and keeps the name `Ana Atendente`. The diff is what the brief says: 1 removed prop and 1 comment. All proofs ran green at HEAD: Vitest 524, layout 199, real e2e 235. F9, F10 and F11 now die.
- **The gap.** C38 says "depois de abrir e fechar o menu dela não sobra dica na tela". Its assertion at `web/e2e/casca.spec.ts:1009` cannot see that defect. I rebuilt round 3's defect in its pure shape, a hint on the row that opens only by focus: F14 shows the bubble stuck on screen with the pointer elsewhere, and C38 passes; C41 alone kills it. Limited to desktop (F17), where the drawer cannot help, **the whole C27 suite stays green at 199 of 199 with the bubble on screen**. What does hold the row is `:1003`, which catches any hint that opens on hover, so restoring `tooltip={me.nome}` (F12) dies in both C38 and C41 as expected.
- **How much this matters.** F14 and F17 are contrived mutants, and at HEAD the row has no tooltip at all, so no person meets this today. The natural regression is caught. The FAIL is about a proof that claims more than it proves, not about anything on screen.

**For the user:** under P9 this does not need another round of review. Either accept the clause as a known limit, or add one test (fresh page, click outside, count the hints); see finding 1. A plain swap inside the existing test is not enough, as I measured.

## Binding sources

Step 1 redone only for the screen the fix touched, the rail footer. The rest is carried from `49f70bc`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/estrutura-visual/plan.md:58` `## Screens`, "Barra recolhida" as amended on 05/11 | yes, verified at c5f10c7 | none: at 1280 the 3 icons show a hint, the initials show none, and the amendment matches P9 | `Contato` hint: "dica nos ícones" names it, no proof does, F16 survives. Outside P9's scope: accepted-risk candidate. The product is right, the hint shows by hand |
| `.specs/features/revisao-ux/plan.md:106`, `layout-painel/plan.md:97`, `revisao-ux/pesquisa.md` §4 | carried from 49f70bc, the fix did not touch them | none | - |
| `.specs/features/estrutura-visual/pesquisa.md` §1 bar shape; `.specs/STATE.md` AD-027, AD-028, AD-034, AD-035, AD-037; `redesign-institucional/plan.md:103`; `identidade-visual/pesquisa.md` | carried from 44bfd34 | none | - |

## Checks

Proofs ran at `c5f10c7`. Vitest: one JSON run, 524 of 524 in 55 files. Build exit 0, precache 11 entries. Layout: one whole C27 call against `vite preview` on 5199, 199 of 199 in 158 s, each named test found in the JSON. Real e2e: 235 of 235 in 500 s, on my own image of HEAD on 8089, own Postgres, MinIO and Mailpit (`E2E_MAILPIT=http://localhost:18025`), `E2E_INSTITUICAO=e2e`, `E2E_ADMIN_EMAIL=admin@e2e.one`, `E2E_CONTAINER=one-r4-api`, no push keys. `plataforma.spec` `manifesto e service worker` and `casca-real` passed in it. An earlier e2e run was void and of my own making: my MinIO could not write to `/data`, the API died at startup, and 234 tests got connection refused. I recreated the stack from empty and ran the whole suite again.

Citations are refreshed for `casca.spec.ts` from line 873 on, the only test file the fix touched; lines above it did not move. `carried` marks the judgment of an unchanged assertion, carried from round 3 at `49f70bc`; its proof still ran at HEAD.

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
| C10 | name and role, no chevrons, no initials, Sair | layout | `web/e2e/casca.spec.ts:391-397` (carried; the row is what the fix edited, and this ran green) | PASS |
| C11 | initials only when collapsed | layout | `web/e2e/casca.spec.ts:408-409`, `:413`, `:416` (carried; initials also read by hand, `A` for the fixture's `Ana`) | PASS |
| C12 | top bar opaque, no blur, no separator | layout | `web/e2e/casca.spec.ts:435-438` (carried) | PASS |
| C13 | collapse in footer, 1 svg, toggles | layout | `web/e2e/casca.spec.ts:450-462` (carried) | PASS |
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
| C26 | crapper, dryer, no `api/` change | as listed, in `web/` | `.specs/features/estrutura-visual/checks.md:143` crapper exit 0; `:144` "No duplicate candidates found."; `:145` exit 0 | PASS |
| C27 | layout suite | one call, 6 files | `web/e2e/casca.spec.ts:1039` among 199 passed, 0 failed | PASS |
| C28 | theme survives reload, student sends by Enter, real ranking | 8089 | `web/e2e/casca-real.spec.ts:112`, `:124`, `:127` (carried) | PASS |
| C29 | whole e2e on my image of HEAD | 8089 | `web/e2e/casca-real.spec.ts:98` among 235 passed, 0 failed | PASS |
| C30 | invariants without lowering a limit | layout | `web/e2e/ux.spec.ts:109`, `:156`, `:348`, `:565`, `:1349`; `web/e2e/identidade.spec.ts:1245`; the fix edits no test but `casca.spec.ts` | PASS |
| C31 | totals in 1 line at 5 widths, category whole | layout | `web/e2e/casca.spec.ts:742`, `:748`, `:750` `medidas` = 40 (carried) | PASS |
| C32 | active bar visible under forced colours; control | layout | `web/e2e/casca.spec.ts:773`, `:775`, `:776` (carried) | PASS |
| C33 | focus whole in cards at 390, first column at 1280, dialog Close at opacity 1 and 3:1 | layout | `web/e2e/casca.spec.ts:791`, `:792` `r.fora` empty, `:797` control > 0, `:822`, `:835`, `:838` (carried) | PASS |
| C34 | footer order; collapse inside the rail at coarse pointer | layout | `web/e2e/casca.spec.ts:855`, `:868`, `:869` (carried) | PASS |
| C35 | Enviar the height of the field and aligned; ≥ 44 at 390 | layout | `web/e2e/casca.spec.ts:884` `mesma altura`, `:885` `alinhados`; the diff at `:875` adds only `test.setTimeout(90_000)`, and no assertion changed | PASS |
| C36 | clip 2 × line-height, third line paints nothing, focus whole | layout | `web/e2e/casca.spec.ts:929` padding 0, `:930` box = 2 × lh, `:931`, `:933` `r.fora` empty (carried, lines refreshed) | PASS |
| C37 | bar below the label at 360 and 390 | layout | `web/e2e/casca.spec.ts:970` `topoBarra >= fimRotulo - 1`, `:973` the label wraps, `:975` `medidas` = 8 (carried, lines refreshed) | PASS |
| C38 | collapsed: 1 hint on collapse and Tema; open: none. User row: no hint in either state, and none left after its menu closes | layout | `web/e2e/casca.spec.ts:990` `toHaveText(nome)`, `:993` control: killed by F11, F13. `:1003` `usuario sem dica`: killed by F12. **`:1009` `nada preso depois do menu`: does not prove its clause**, F14 and F17 pass it with the bubble live. See finding 1 | FAIL |
| C39 | sheet Close focused: opacity 1, 3:1, 3 themes | layout | `web/e2e/casca.spec.ts:1057` opacity, `:1059`, `:1060`, `:1063` `medidas` = 3 (carried, lines refreshed) | PASS |
| C40 | at 390 the card link is named "ONE-123 Preciso…", 1 click adds exactly 1 history entry, back returns to the list | layout | `web/e2e/casca.spec.ts:1019` `toHaveAccessibleName(/^ONE-123 Preciso/)`: killed by F10. `:1023` `toBe(antes + 1)`: killed by F9. `:1025` `waitForURL` back on the list | PASS |
| C41 | at 390, drawer, focus on the user row: 1 `Escape` closes it | layout | `web/e2e/casca.spec.ts:1039` `expect(gaveta, '1 Esc fecha').toHaveCount(0)`: killed by F12 and F14. The test uses `.focus()`; by hand, a real Tab to the row also closes in 1 press | PASS |

## Coverage

Recomputed at c5f10c7 for the rows the fix touched; the others are carried from 49f70bc.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| screens in the focus sweep (4) | plan AC 1; carried | `casca.spec.ts:38-43` | - |
| themes (3), brands (3) | `index.css`; carried | loops `casca.spec.ts:8-9` | - |
| Preto `--sidebar` × brands (3) | AD-027, P7; carried | C7 | - |
| attachment uses (4) | `grep CampoArquivo`; carried | `casca.spec.ts:174-196` | - |
| doors (4) | plan `Landing`; carried | C1 C3 · C4 · C8 C32 · C21 C24 | - |
| sidebar states (2) | `Autenticado.tsx`; carried | open C10 · collapsed C11 | - |
| footer items (4) and their order | plan `## Screens`; carried | C34 | - |
| collapsed rail hints (3 footer icons) | plan `## Screens:58` as amended, hover at HEAD | collapse C38 · Tema C38 (F11 dies) · Contato right by hand, no proof | Contato: F16 survives. Outside P9's scope, accepted-risk candidate |
| user row hint × path (hover, Esc, click outside, touch, drawer) | fix diff, plan `## Screens:58`, P9 | hover C38 `:1003` · drawer C41 · Esc, click outside and touch 0 hints by hand | hint after the menu closes on desktop, by Esc or click outside: F17 survives the whole C27. This is C38's own clause |
| card link effects (click, name) | fix diff | one navigation per click C40 (F9 dies) · name with the title C40 (F10 dies) | - |
| Esc in the drawer by focus (first focus, Contato, Tema, user) | P9, measured | user C41 · others are the item recorded out of scope, by hand 2 presses, same as round 3 | - |
| ranking cell values (2) and arrangement | plan `## Screens:62`; carried | category C20 C23 · total C20 C21 C31 · bar below C37 | - |
| totals × widths (4 × 5), widths for the cut (5), ranking states (3) | plan; carried | C31 · C23 · C20 C21 C22 C28 | - |
| Close controls with `focus-visible:opacity-100` (2) | `grep` on `web/src/ui`; carried | `ui/dialog.tsx` C33 · `ui/sheet.tsx` C39 | - |
| findings of round 3 (3) | round 3 report | hint off the user row C38 · card link C40 · drawer Esc C41 | - |
| S0 suites (5) | `checks.md` | C25, C26, C27, C28, C29 | - |

## Test policy rows

No `Test policy` section in `checks.md`.

## Faults injected

Scratch worktree under the ignored `TestResults/`, own build and preview on 5198. Baseline first: C38, C40 and C41 green unmodified, and green again after the last fault. The real tree's porcelain matched its baseline before and after. Over the cap of 5 because the brief names 4 and C38's clause needed 2 more. Each killed row quotes the assertion message, which confirms the fault ran. F14 and F17 were confirmed live by a probe on their build (`fora: [1,1,1]`), F16 by a hover on `Contato` that timed out waiting for a hint.

| Mutation | Location | Killed | Proof and message |
| --- | --- | --- | --- |
| F12: `tooltip={me.nome}` back on the user row | `web/src/Autenticado.tsx:155` | yes | C38 "recolhida: usuário sem dica"; C41 "1 Esc fecha". Both, as the brief expected |
| F11: `tooltip="Tema"` removed (survivor of round 3) | `web/src/Autenticado.tsx:79` | yes | C38 "Tema: 1 dica com o nome" |
| F9: `stopPropagation` removed from the card link (survivor of round 3) | `web/src/chamados/Chamados.tsx:53` | yes | C40 "1 entrada a mais" |
| F10: `aria-label={c.numero}` on the card link (survivor of round 3) | `web/src/chamados/Chamados.tsx:53` | yes | C40 "nome com número e título" |
| F13: collapse hint `hidden={isMobile}`, shows with the rail open | `web/src/ui/sidebar.tsx:276` | yes | C38 "Alternar barra lateral: controle, sem dica com a barra aberta" |
| F15: user name `hidden` instead of `sr-only` when collapsed, row loses its name | `web/src/Autenticado.tsx:161` | yes | C38 "recolhida: usuário" |
| F14: hint on the user row that opens only by focus (`tooltip` plus `onPointerMove` `preventDefault`) | `web/src/Autenticado.tsx:155` | yes | C41 "1 Esc fecha" only. **C38 passes** with the bubble live after the menu closes, so `:1009` did not fire |
| F17: F14 on desktop only (`tooltip={isMobile ? undefined : me.nome}`) | `web/src/Autenticado.tsx:155` | no | whole C27: 199 of 199. Probe on the build: click outside leaves 1 hint at 100, 800 and 2500 ms. Finding 1 |
| F16: `tooltip="Contato"` removed. Outside P9's scope | `web/src/Autenticado.tsx:185` | no | whole C27: 199 of 199. Same shape as F11, one button down. Finding 2 |

## Findings, ranked by what a person meets

**In scope, carries the FAIL:**

1. **C38's last clause does not prove what it says; no person meets this at HEAD.** `web/e2e/casca.spec.ts:1006-1009`: the test closes by Esc with the pointer on the row, moves the pointer away in steps, then counts. A hint opened by focus return dies when the pointer leaves, so the count is 0 whatever the product does. Round 3's defect happened the other way round: the pointer was already elsewhere when focus came back, so nothing dismissed it.
   - **Swapping Esc for a click outside inside this test is not enough, measured:** F17 still passes. After the hovers on the neighbouring icons in the same page, focus went to `body` on my run and no hint opened. I did not find out why that sequence differs.
   - **What does see it:** a fresh page, hover, click, click outside, count. On F17 that sequence shows 1 hint at 100, 300, 800, 1800 and 3800 ms; at HEAD 0 at 100, 800 and 2500 ms. I measured those as series and did not run them as a committed assertion.
   - **Options:** add that as its own test, or accept the clause as a known limit, since `:1003` and C41 catch every plausible return of the prop.

**Brief item 3, the stepped moves: do they hide a real defect?**

- **In the product, no.** A single jump leaves any Radix hint open until the next pointer event: measured 1, 1, 1, then 0 after a 1 px move, on collapse, Tema, Contato and a nav link alike, so it is stock behaviour that the feature did not add. A real mouse sends more moves, so at `:995-997` the steps are correct.
- **In the proof, yes.** At `:1007-1008` the same steps wipe the very bubble `:1009` looks for. That is finding 1.

**Outside the scope, accepted-risk candidates under P9; none of these starts a round or carries the FAIL:**

2. **`Contato` hint has no proof (F16).** The product is right, it shows on hover. The same one-word fix as F11, in the list at `:986`.
3. **Focus ring stays on the row after a mouse click outside.** On a fresh page, at HEAD, the menu closes and a solid 2 px ring stays on the initials until the next click (`usuario-apos-clicar-fora-1280.png`). No bubble, and focus returning to the trigger is correct for the keyboard, but it reads as a smaller version of the same leftover. Not compared with earlier commits. By touch there is no ring.
4. **Without the hint, a sighted user in the collapsed rail sees only the initials until they click.** This is the choice the user made; the menu shows name and role (`usuario-menu-aberto-1280.png`). Noted so it is a known effect.
5. **Carried from round 3, unchanged and not re-measured:** card focus outline touching the badge; collapsed rail cutting `Aparência` on short screens; `Total` 8 px inside the numbers; ranking bar as a pill; clip 6 px below the field's centre; `transition-all` on the outline offset; `focus:ring-2`; demo logo's white background.

### Round 3's items: closed

- **Stuck "Ana" hint: closed.** Rail collapsed at 1280, mouse: hover, menu open, click outside, Esc, keyboard Enter then Esc all give 0 hints at every sample up to 2.5 s. Touch at 1024 with a coarse pointer: tap, tap outside, 0 hints (`toque-apos-fechar-1024.png`).
- **Esc in the drawer from the user row: closed.** 1 press, reached by real Tab with `:focus-visible` on. With the user menu open: the first Esc closes only the menu and returns focus to the row, the second closes the drawer, which is right.
- **2 presses from Tema, Contato and the first focus: the same as round 3, unchanged.** Still recorded out of scope.
- **F9, F10, F11: closed.** All three die.
- **Identity on the collapsed row: holds.** Initials visible, accessible name `Ana Atendente`, no `aria-describedby` left behind, no `title`.
- **Stale comment: closed.** `web/src/chamados/Chamados.tsx:107` now says what the card does.
- **Neighbouring buttons, measured because round 3 had not:** `Tema` with the mouse, click outside 0 hints; after Esc 1 hint while the pointer is still on it, 0 once it leaves, which is correct. `Contato`, closed by Esc, by its Close button and by click outside: 0 hints. The stuck hint has no sibling.
- **`Sair` from the collapsed rail: works**, reaches the login at `/univag` on the simulated API. Round 3 had not checked it.

### "Looks AI or template-made": 3 out of 10

**Carried from round 2 through round 3.** The only visual change here is that a hover hint no longer appears. Nothing I opened says otherwise, and I opened only the rail footer and drawer, not the screens behind the rating.

- **Opened by eye (`D:\one-system\.playwright-mcp\estrutura\verificador-r4\`):** `usuario-hover-recolhida-1280`, `usuario-menu-aberto-1280`, `usuario-apos-clicar-fora-1280`, `toque-apos-fechar-1024`, `gaveta-usuario-foco-390`.
- **Saved, metrics only:** `usuario-apos-esc-1280`, `tema-apos-esc-1280`, `contato-apos-esc-1280`, `contato-apos-fora-1280`, `mao.json`, and `f14/` and `f17/` with the fault probes.
- **"By hand" means** scripted real input events in Chromium through Playwright, with the shots above opened by eye; nobody moved a physical mouse.
- **Not checked:** Safari, Firefox and a physical phone or tablet, so touch is Chromium's emulation; a real screen reader; step 5, the walk with the user, is theirs; why focus lands differently after neighbouring hovers; whether the ring in finding 3 predates this fix; everything else in the feature beyond running its proofs, per P9.

## Gate

`npx vitest run` - 524 passed, 0 failed. Layout suite - 199 passed, 0 failed. Full e2e on my image of HEAD - 235 passed, 0 failed. `npm --prefix web run build` exit 0. `crapper` exit 0 at 9.99, `dryer` no candidates, `git diff --quiet 93d5889 HEAD -- api api.Tests` exit 0.

Cleanup done, each by name or PID: previews on 5198 and 5199, containers `one-r4-*` with their anonymous volumes, network `one-r4`, volume `one-r4-minio-data`, image `one-r4:c5f10c7`, scratch worktree with its junction removed first. Docker's build cache keeps the image's layers, since no prune was run. The API on :8080 answered 200 and was not touched, no `one-system-*` container was entered, and `.env` was not read.
