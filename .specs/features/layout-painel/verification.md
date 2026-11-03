# Layout de painel verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: dac2832..0486bc1
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Scope: the fix range `ef737f1..0486bc1` (e1f61f4, e75fc76, af95317, 6900c95, 0486bc1) and every round-2 verdict that was not PASS: gap 1 (C47) and gap 2 (`## Screens` values neither checked nor exempted). The code diff is one line in `web/src/indicadores/Indicadores.tsx` (footer wrapped in `line-clamp-1`). The test diff adds 2 Vitest tests (C47) and 4 e2e tests plus one assertion (C49-C53). `checks.md` gains C49-C53 and the amended C47 text. `## Exempted` is unchanged. All 53 proofs re-ran at `0486bc1`. Sections or rows the fix did not touch say `carried from ef737f1`, or carry round 2's own `carried from a3bd34d`.

The fix closes both round-2 gaps. C47 is now proven on all 3 screens, and the round-2 survivor F2 is killed. Each of the 13 values in round-2 gap 2 has a check whose proof asserts it. Every proof is green: Vitest 275/275 and Playwright 76/76, with each named test seen individually. All 5 faults were killed.

The feature still fails on step 1. I re-enumerated the screens the fix touched, and two values that `## Screens` decides have neither a check nor an exemption. Round 2 missed both when it enumerated these same rows:

1. **tabela**: "Linhas de 14 px". The body row text size is never asserted. C53 measures only the header's 14 px.
2. **casca, barra recolhida**: "ícones centralizados". C4 asserts that the icon is visible and the label is collapsed, but nothing measures the icon's horizontal centring in the 48 px bar.

## Binding sources

Verified at 0486bc1 for the screens whose interface the fix touched: Indicadores (highlights and compacts), the table pattern and the empty table (Fila), Trocar senha, the header, and the sidebar (open and collapsed). The other rows are carried from ef737f1.

Opened this round:
- the plan's `## Screens` table (binding), read in full at `plan.md:74-108`;
- the shadcn `section-cards.tsx` from `raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/app/(app)/examples/dashboard/components/section-cards.tsx`. Its `CardTitle` is `text-2xl font-semibold tabular-nums @[250px]/card:text-3xl`. Its `CardFooter` is `flex-col items-start gap-1.5 text-sm` and holds two lines: `line-clamp-1 flex gap-2 font-medium` (trend) and `text-muted-foreground` (description).

`## Screens` decides one footer line: "rodapé em 14 px `muted` numa linha". The fix's `<div className="line-clamp-1">` inside a `text-sm text-muted-foreground` footer (`Indicadores.tsx:143-145`) follows `## Screens` and reuses the template's clamp. This is not a contradiction.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `## Screens` values listed in round-2 gap 2 (13), against C49-C53 | yes | none | - all closed: header icon buttons 36 px -> C51 `arranjo.spec.ts:1190`; highlight footer 14 px muted one line -> C53 `:1245-1247`; compact label 14 px -> C53 `:1253`; table header 14 px / 500 -> C53 `:1260`; empty row centred -> C49 `:1163`; Trocar senha horizontal centring -> C50 `:885`; header bottom border -> C51 `:1181`; `h1` one truncated line -> C51 `:1183`, `:1187-1188`; table box border -> C53 `:1262`; row borders -> C53 `:1263`; value weight 600 (highlights, compacts) -> C53 `:1249`, `:1254`; compact `tabular-nums` -> C53 `:1255`; sidebar groups scroll -> C52 `:1205`; collapsed initials square -> C52 `:1214-1216` |
| `## Screens` "tabela (padrão das listas)", re-enumerated this round | yes | none | "Linhas de 14 px": the body row text size has no check and is not in `## Exempted` (the `tabelas` line exempts only "altura das linhas, cor do hover, raio da caixa"). Code: `text-sm` on the table, `web/src/ui/table.tsx:14`. Search: `rg -n "fontSize\|font-size" e2e/*.ts` shows no assertion on a body cell. `arranjo.spec.ts:630` only compares Cadastros detail < name. Everything else on this row is covered: box border and 8 px (C53), no horizontal scroll (C13), header `muted` (C22), header 14/500 (C53), row border (C53), hover (exempted), main column wraps (C13 with the 120-character unbroken title), "largo" from 672 and the 12 px narrow line (C22) |
| `## Screens` "casca, barra recolhida", re-enumerated this round | yes | none | "barra de 48 px só com ícones centralizados": the centring of the icons in the 48 px bar has no check and no exemption (`## Exempted` casca names only internal border thickness, link radius and hover colour, and group-title weight). C4 (`arranjo.spec.ts:806-807`) asserts only that the icon is visible and the label is ≤ 1 px. Search: `rg -n "centr\|center\|width / 2" e2e/*.ts` hits only access, raiz, C49 and C50. Covered on this row: 48 px (C2), no visible text and tooltips (C4), initials square (C52), content at 48 (C2) |
| `## Screens` "tabela vazia" | yes | none | - one row, all columns (C24); 96 px and centred (C49); text `muted` is a token colour, under the `## Exempted` lead "cores vêm dos tokens, conferidos por C35" (`Tabela.tsx:33` `text-muted-foreground`) |
| `## Screens` "cabeçalho (todas as larguras)" | yes | none | - 49 px and sticky (C8); bottom border (C51); toggle, separator, `h1` order (C8); separator 16 px (exempted); `h1` 16/500 (C8); one truncated line (C51); Avisos and Tema at 36 px (C51), Avisos left of Tema (C8); padding 16/24 (C46) |
| `## Screens` "casca, janela ≥ 768 px, barra aberta" | yes | none | - 256 px (C1); `--sidebar` and right border (C42); brand and institution at the top, wrapping to 2 lines (C1, C42); groups scroll in the middle (C52); user button at the bottom (C1, C52 `:1207-1208`); initials 32, 2 truncated lines, `ChevronsUpDown` (C40); content at 256 (C1) |
| `## Screens` "área principal" (Trocar senha) | yes | none | - ≤ 384 (C39), centred in the content block (C50) |
| `## Screens` "Indicadores, destaque" and "Indicadores, demais" | yes | none | - highlights: gradient and `shadow-xs` (exempted); label 14 (C17); value 24/30 (C17, C46), weight 600 (C53), `tabular-nums` (C17); footer 14 muted one line (C53); grid (C17). Compacts: label 14 (C53); value 20 (C18), 600 (C53), `tabular-nums` (C53); no footer (C18 Vitest `indicadores.test.tsx:128`, exactly `[label, value]` per card); grid 2/3 (C18) |
| shadcn `section-cards.tsx` (highlight footer, value class) | yes - URL above | none | - |
| shadcn `data-table.tsx`, `nav-user.tsx`, `site-header.tsx`, `page.tsx`, `app-sidebar.tsx`; `## Screens` rows not touched by the fix (menu do usuário, celular, período, rankings, vazio/erro, Fila, Usuários, Artigos, Documentos, Cadastros, Matrículas, Detalhe, Assistente, acesso, raiz) | carried from ef737f1 | none | carried from ef737f1 |

Facing the other way: the fix renders nothing that `## Screens` does not draw. The new wrapper `div` carries no text and no box of its own.

## Checks

Verified at 0486bc1.

- `cd web && npx vitest run --reporter=verbose`: exit 0, 275 passed (34 files). Every named proof appears with `✓` and none with `×`: "estado inicial da barra por one-barra" ×4, "título do cabeçalho por rota" ×11, "papel do usuário por precedência" ×3, "lista vazia numa linha" ×3, "ações de linha mostram o Spinner enquanto gravam" ×3 (`usuarios.test.tsx`, `artigos.test.tsx`, `documentos.test.tsx`), and the 17 tests of the textos files plus `estrutura.test.ts`. Every other named Vitest proof appears exactly once with `✓`.
- The api container was up and answering 200 on 8080. `cd web && npx playwright test --reporter=list`: exit 0, 76 passed, nothing failed, flaky or retried. The 5 S7 filters hit 1 test each with `✓`: `arranjo.spec.ts:1155` "lista vazia centralizada", `:1172` "cabeçalho: borda, título numa linha e botões de 36 px", `:1197` "grupos rolam e iniciais na barra recolhida", `:1220` "valores de tipo e bordas", and "Trocar senha até 384 px". Every other named e2e proof also appears with `✓`.

Citations: `arranjo.spec.ts` lines after `:881` moved +4 because of the C50 insertion, and they are refreshed below. Rows citing other files the fix did not touch are carried from ef737f1.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | open bar 256 at x=0, full height; brand above groups; user button at bottom; main at 256 | e2e "painel barra aberta" ✓ | `web/e2e/arranjo.spec.ts:766` `expect(Math.abs(b.width - 256)).toBeLessThanOrEqual(1)`; `:771-772`; `:774`; `:776` (carried from ef737f1, lines unchanged) | PASS |
| C2 | toggle 48/256, `one-barra` | e2e "painel recolher e expandir" ✓ + vitest "alternar barra grava one-barra" ✓ | `web/e2e/arranjo.spec.ts:787-789` `expect.poll(() => largura(page)).toBe(48)`, `toBe('recolhida')`; `web/src/acesso/acesso.test.tsx:469-473` (carried) | PASS |
| C3 | initial state, 4 cases | vitest ×4 ✓ | `web/src/acesso/acesso.test.tsx:477-487` `expect(estado()).toBe(esperado)` (carried) | PASS |
| C4 | collapsed: names kept, labels hidden, tooltip | e2e "painel barra recolhida" ✓ | `web/e2e/arranjo.spec.ts:807` label width `toBeLessThanOrEqual(1)`; `:813` `toHaveText('Usuários')`; `:815` `toHaveText('Artigos')` (carried) | PASS |
| C5 | < 768: sheet x=0, min(288,w), 3 groups, 9 links, user button | e2e "painel no celular" ✓ | `web/e2e/arranjo.spec.ts:824` `toBeHidden()`; `:828-829`; `:831` `toHaveCount(3)`; `:832-833` (carried) | PASS |
| C6 | "Fila" closes the sheet, h1 Fila | e2e "painel no celular" ✓ | `web/e2e/arranjo.spec.ts:843` `toHaveCount(0)`; `:844` `toHaveText('Fila')` (carried) | PASS |
| C7 | Ctrl+B / Meta+B | vitest "Ctrl+B alterna a barra" ✓ | `web/src/acesso/acesso.test.tsx:495-499` (carried) | PASS |
| C8 | header 49, sticky, order, h1 16/500; Avisos left of Tema | e2e "painel cabeçalho" ✓ + "avisos no cabeçalho" ✓ | `web/e2e/arranjo.spec.ts:855` height 49; `:859`; `:866-869`; `:870` `toEqual(['16px', '500'])`; `web/e2e/push.spec.ts:80-81` (carried) | PASS |
| C9 | h1 per route, 11 | vitest ×11 ✓ | `web/src/acesso/acesso.test.tsx:530`, `:532` `toHaveLength(1)` (carried) | PASS |
| C10 | menu name, role ×3, Sair | vitest ✓ + ×3 ✓ | `web/src/acesso/acesso.test.tsx:545-546`, `:556-557` (carried) | PASS |
| C11 | reduced motion | e2e "movimento reduzido na barra lateral" ✓ | `web/e2e/arranjo.spec.ts:1011` `transitionDuration` `toBe('0s')`; `:1015` `toBe(48)` (refreshed +4) | PASS |
| C12 | no `sidebar_state` cookie | vitest ✓ | `web/src/acesso/acesso.test.tsx:509`, `:511` (carried) | PASS |
| C13 | no horizontal scroll, 15 screens × 6 widths × 2 states | e2e "sem rolagem horizontal" ✓ | `web/e2e/arranjo.spec.ts:1032` `expect(rolagem, ...).toBeLessThanOrEqual(janela)` (refreshed) | PASS |
| C14 | container `main`; Fila 3/6 columns at 900 | e2e "colunas pela largura do main" ✓ | `web/e2e/arranjo.spec.ts:1043` `toEqual(['inline-size', 'main'])`; `:1045`; `:1049` (refreshed) | PASS |
| C15 | content padding 16/16, 16/24, 24/24 | e2e "recuos do conteúdo" ✓ | `web/e2e/arranjo.spec.ts:1149-1150` (refreshed) | PASS |
| C16 | 4 highlights, order, values, footers | vitest "destaques de Indicadores" ✓ | `web/src/indicadores/indicadores.test.tsx:116` `expect(cartoesDe(destaques)).toEqual([...])` with the 4 exact footers at `:117-120`. It still passes with the new wrapper: `cartoesDe` (`:103`) takes the leaf `div`s, now the `line-clamp-1` div | PASS |
| C17 | value ≥ 24, tabular-nums, label 14; 1/2/4 columns | e2e "arranjo Indicadores" ✓ | `web/e2e/arranjo.spec.ts:270`; `:282` `toBeGreaterThanOrEqual(24)`; `:283` `toContain('tabular-nums')`; `:284` `toBe(14)` | PASS |
| C18 | 9 compacts, 20 px, 2/3 columns | vitest ✓ + e2e ✓ | `web/src/indicadores/indicadores.test.tsx:128` `toEqual([['Alunos ativos', '12'], ...])`; `web/e2e/arranjo.spec.ts:271`, `:287` | PASS |
| C19 | ranking card, chart above table | vitest ✓ + e2e ✓ | `web/src/indicadores/indicadores.test.tsx:181`; `web/e2e/arranjo.spec.ts:272`, `:275`, `:295` (carried) | PASS |
| C20 | period form, "Sem dados", error, Spinner as today; only the rankings class changes | the 3 named vitest ✓ | `web/src/indicadores/indicadores.test.tsx:29` `findByText('Sem dados no período')`; `:219-225`; `:74-86`; `:94` `toHaveClass('grid-cols-1', '@4xl/main:grid-cols-2')` (carried from ef737f1) | PASS |
| C21 | column headers, 7 lists | 3 vitest ✓ | `web/src/chamados/listas.test.tsx:47`, `:56`; `web/src/administracao/admin.test.tsx:38,44,53`; `web/src/conhecimento/artigos.test.tsx:57,63` (carried) | PASS |
| C22 | "largo" hidden at 360, 12 px detail, header `--muted` | e2e "colunas largas somem no estreito" ✓ | `web/e2e/arranjo.spec.ts:1068` `toHaveCount(0)`; `:1070-1071` `toBe('12px')`; `:1081` muted; `:1084-1085` (refreshed) | PASS |
| C23 | Estado click opens ticket; number link focusable | e2e "linha da lista abre o chamado" ✓ | `web/e2e/arranjo.spec.ts:1099` `toHaveURL(/\/univag\/chamados\/ONE-123$/)`; `:1108` (refreshed) | PASS |
| C24 | empty: 1 row, colSpan, 6 screens | 3 vitest ✓ | `web/src/test/util.tsx:102-106`; `web/src/chamados/listas.test.tsx:66,72`; `web/src/administracao/admin.test.tsx:69,74`; `web/src/conhecimento/artigos.test.tsx:71,77` (carried) | PASS |
| C25 | "Ações de" menu, 7 cases | 3 vitest ✓ | `web/src/administracao/usuarios.test.tsx:44-45` `toEqual(['Editar', 'Desativar!'])`; `web/src/conhecimento/artigos.test.tsx:85-87`; `web/src/conhecimento/documentos.test.tsx:84-85` `toEqual(['Nova versão', 'Arquivar!'])` (carried) | PASS |
| C26 | Cadastros select at 360, tabs at 1440 | e2e ✓ | `web/e2e/arranjo.spec.ts:1121-1122`; `:1124`; `:1127-1128` (refreshed) | PASS |
| C27 | Novo, dialogs, editors as today | 5 vitest ✓ | `web/src/administracao/usuarios.test.tsx:94` `getByText('Desativar Carla?')`, `:100`; `:59`; `web/src/administracao/cadastros.test.tsx:66`; `web/src/conhecimento/documentos.test.tsx:51`; `web/src/conhecimento/artigos.test.tsx:30` (carried) | PASS |
| C28 | detail 2 columns at 1440 | e2e ✓ | `web/e2e/arranjo.spec.ts:184-188` (carried) | PASS |
| C29 | one column at 360 and 1280 | e2e ×2 ✓ | `web/e2e/arranjo.spec.ts:204` (carried) | PASS |
| C30 | title h2, number h1 | vitest ✓ | `web/src/chamados/chamado.test.tsx:50-52` (carried) | PASS |
| C31 | Assistente ≤ 768 centred; composer ≤ 16 px | e2e ×2 ✓ | `web/e2e/arranjo.spec.ts:162,164`; `:86` (carried) | PASS |
| C32 | 4 access screens centred, ≤ 384 | e2e ×4 ✓ | `web/e2e/arranjo.spec.ts:388` `toBeLessThanOrEqual(384)`; `:389` centre `toBeLessThanOrEqual(1)` (carried) | PASS |
| C33 | same API calls; suites green | `chamadas_iguais.py dac2832` exit 0 ("238 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD"); `--autoteste` ok; vitest 275/275; playwright 76/76 | `.specs/features/layout-painel/chamadas_iguais.py:17-31` `REESCRITOS`, untouched by the fix. No base test was renamed: the fix only adds tests | PASS |
| C34 | only *(novo)* texts | 6 textos files ✓ | `web/src/acesso/textos.test.tsx:8` etc. (carried; the fix adds no visible text) | PASS |
| C35 | tokens unchanged; sidebar contrast ≥ 4.5 | vitest ×2 ✓ | `web/src/test/interface.test.ts:181`, `:192` (carried) | PASS |
| C36 | crapper 0 at 9.99, dryer clean; mutator suspended | `npm --prefix web run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99` exit 0 (worst `Sidebar` 9.8, `SidebarProvider` 9.5); dryer `grep -q` exit 0. `mutator` not run, suspended (AD-025) | `web/.metrics/crap.edn` `{:name "Sidebar", ... :crap 9.7558}` | PASS |
| C37 | build + structure | `npm --prefix web run build` exit 0; vitest "estrutura em fatias" ✓ | `web/src/test/estrutura.test.ts:28` (carried) | PASS |
| C38 | no drawer, no vaul | vitest "sem gaveta Vaul" ✓ | `web/src/test/interface.test.ts:197-199` (carried) | PASS |
| C39 | Trocar senha ≤ 384 at 360 and 1280 | e2e "Trocar senha até 384 px" ✓ | `web/e2e/arranjo.spec.ts:882` `expect(cartao.width, \`${w} px\`).toBeLessThanOrEqual(384)` in the loop over `[360, 1280]`; also `:374` | PASS |
| C40 | initials 32×32; 2 ellipsis lines; chevron right | e2e "botão do usuário" ✓ | `web/e2e/arranjo.spec.ts:898` `toEqual([32, 32])`; `:902-904`; `:905` chevron right of the texts (refreshed) | PASS |
| C41 | menu items and side | e2e "menu do usuário abre ao lado" ✓ | `web/e2e/arranjo.spec.ts:922` `toEqual([[null, 'AnaAdministrador'], ['separator', ''], ['menuitem', 'Sair']])`; `:919` `m.x >= b.x + b.width - 1`; `:920` `m.y + m.height <= b.y + 1`; `:925` `svg.lucide-log-out` (refreshed) | PASS |
| C42 | `--sidebar`, 1 px right border, institution ≤ 2 lines | e2e ✓ | `web/e2e/arranjo.spec.ts:952` `toBe(token)`; `:953` `toBe('1px')`; `:956-958` (refreshed) | PASS |
| C43 | overlay at 360, alpha > 0 | e2e "painel no celular" ✓ | `web/e2e/arranjo.spec.ts:836` `toBeVisible()`; `:838`; `:839` `toBeGreaterThan(0)` (carried) | PASS |
| C44 | Cadastros 1440: tabs left, Novo right, same row | e2e ✓ | `web/e2e/arranjo.spec.ts:1133` centres within 4 px; `:1134` `expect(novo.x, ...).toBeGreaterThanOrEqual(a.x + a.width - 1)` (refreshed) | PASS |
| C45 | Alerts below the toolbar at block width; Consultar Spinner | e2e ✓ + vitest ✓ | `web/e2e/arranjo.spec.ts:1001` `toBeGreaterThanOrEqual(f.y + f.height - 1)`; `:1002` `Math.abs(a.width - bloco.width)` `toBeLessThanOrEqual(1)`; `web/src/indicadores/indicadores.test.tsx:55-56` (refreshed) | PASS |
| C46 | breakpoint sides: header, access, highlight value | e2e "quebras medidas dos dois lados" ✓ | `web/e2e/arranjo.spec.ts:968` `toBe(esperado)`; `:975`; `:984` `w === 1328 ? largura < 250 : largura >= 250`; `:985` `fontSize` `toBe(fonte)` (refreshed) | PASS |
| C47 | while a row action saves, the "Ações de" trigger shows the Spinner and is disabled, on 3 screens: Artigos (Ativar), Usuários (Desativar), Documentos (Arquivar) (amended e75fc76) | 3 vitest "ações de linha mostram o Spinner enquanto gravam" ✓ | Artigos: `web/src/conhecimento/artigos.test.tsx:104` `expect(gatilho).toBeDisabled()`, `:105` `within(gatilho).getByRole('status')`, `:108` gone after the reply. Usuários: `web/src/administracao/usuarios.test.tsx:130` `expect(gatilho).toBeDisabled()`, `:131` `within(gatilho).getByRole('status')`, `:133` `queryByRole('status')).not.toBeInTheDocument()`. Documentos: `web/src/conhecimento/documentos.test.tsx:101`, `:102`, `:104` (same three). Fault F1 (round-2 F2 again) is killed by the two new tests. The round-2 precision gap ("como os botões soltos de hoje") is closed: the text now states the `dac2832` history. Sampling: the amended claim names one action per screen, where the round-2 text named 4 actions. Each screen has one pending source, so the one action exercises the only wiring: `acao.isPending` at `Usuarios.tsx:132`, `Documentos.tsx:134`, `Artigos.tsx:148`. Note for the orchestrator: unlike C20, the amendment does not record user approval | PASS |
| C48 | exact assertions restored | 2 vitest ✓ | `web/src/administracao/usuarios.test.tsx:35` `toHaveTextContent(/^Aluno$/)`; `web/src/chamados/listas.test.tsx:49-50`, `:57-58` (carried) | PASS |
| C49 | empty list text centred, row 96 px (±1), Fila at 360 and 1280 | e2e "lista vazia centralizada" ✓ | `web/e2e/arranjo.spec.ts:1163` `expect(... getComputedStyle(e).textAlign ...).toBe('center')`; `:1164` `expect(Math.abs((await caixa(page.locator('tbody tr'))).height - 96)).toBeLessThanOrEqual(1)` in the loop over `[360, 1280]` | PASS |
| C50 | Trocar senha card centred in the content block (±1) at 360 and 1280 | e2e "Trocar senha até 384 px" ✓ | `web/e2e/arranjo.spec.ts:885` `expect(Math.abs(cartao.x + cartao.width / 2 - (bloco.x + bloco.width / 2)), ...).toBeLessThanOrEqual(1)`, with `bloco` = `main > div` (`:884`), in the loop over `[360, 1280]` | PASS |
| C51 | header bottom border 1 px; `h1` nowrap+ellipsis, long title stays left of Tema; Tema and Avisos 36×36 | e2e "cabeçalho: borda, título numa linha e botões de 36 px" ✓ | `web/e2e/arranjo.spec.ts:1181` `borderBottomWidth` `toBe('1px')`; `:1183` `toEqual(['nowrap', 'ellipsis'])`; `:1187` `h.x + h.width` `toBeLessThanOrEqual(t.x + 1)`; `:1188` height `<= 24`; `:1190` `[Math.abs(b.width - 36) <= 1, Math.abs(b.height - 36) <= 1]` `toEqual([true, true])` for Tema and Avisos, at 360 and 1280 | PASS |
| C52 | groups scroll at 1280×600, user button visible at the bottom; collapsed initials 32×32 within 48 | e2e "grupos rolam e iniciais na barra recolhida" ✓ | `web/e2e/arranjo.spec.ts:1205` `toEqual(['auto', true])` (`overflowY`, `scrollHeight > clientHeight`); `:1207` `u.y + u.height <= 601`; `:1208` `u.y > 300`; `:1214` 32×32 `toEqual([true, true])`; `:1215-1216` x within `[-1, 49]` | PASS |
| C53 | type values and borders at 1440 open | e2e "valores de tipo e bordas" ✓ | `web/e2e/arranjo.spec.ts:1245` `expect([e.tam, e.cor]).toEqual(['14px', mudo])` for all 4 footers; `:1246` `e.grampo === '1' \|\| e.quebra === 'nowrap'` `toBe(true)`; `:1247` height `<= 24`; `:1249` highlight value `peso` `toBe('600')`; `:1253` compact label `toBe('14px')`; `:1254` compact value `toBe('600')`; `:1255` `toContain('tabular-nums')`; `:1260` header `toEqual(['14px', '500'])`; `:1262` `toEqual(['1px', '1px', '8px'])`; `:1263` row `borderBottomWidth` `toBe('1px')`. Sampling: the value weight is read on the first highlight and the first compact only. Each set renders from one template line (`Indicadores.tsx:141` `CardTitle ... font-semibold`, `:155` `text-xl font-semibold tabular-nums`), so one member exercises the only code path. Accepted. C53 also asserts the 8 px box radius, which `## Exempted` lists under `tabelas`: a stronger check, not a contradiction | PASS |

## Coverage

Verified at 0486bc1 for the rows whose authority the fix touched: row-action pending feedback, and the `## Screens` values of round-2 gap 2. The other rows are carried from ef737f1 with the same members and proofs, and their tests re-ran green above.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| row-action pending feedback (3 screens) | the code: `MenuAcoes` `pendente` (`Tabela.tsx:52-57`), passed at `Artigos.tsx:73`, `Documentos.tsx:64`, `Usuarios.tsx:53`, each from the screen's single `acao.isPending` | Artigos -> `artigos.test.tsx:104-108` · Usuários -> `usuarios.test.tsx:130-133` · Documentos -> `documentos.test.tsx:101-104` | - |
| round-2 gap-2 values (13) | `## Screens` (`plan.md:74-108`), the round-2 list | 13/13 -> C49-C53 (see Binding sources row 1) | - |
| empty-table facts (4: one row, all columns, 96 px, centred) | `## Screens` "tabela vazia" | C24 (row, colSpan) · C49 `:1163-1164` (centred, 96 at 360 and 1280) | - |
| table pattern values (`## Screens` "tabela", touched by C53) | `## Screens` "tabela (padrão das listas)" | box border and 8 px C53 `:1262` · header muted C22 · header 14/500 C53 `:1260` · row border C53 `:1263` · "largo" and narrow line C22 · no scroll C13 | row text 14 px: no proof (step-1 finding) |
| collapsed bar facts (`## Screens` "casca, barra recolhida", touched by C52) | `## Screens` | 48 px C2 · no visible text and tooltips C4 · initials square C52 · content at 48 C2 | icons centred: no proof (step-1 finding) |
| header facts (`## Screens` "cabeçalho", touched by C51) | `## Screens` | C8, C46, C51 as listed under Binding sources | - |
| access width caps; Indicadores states; user button parts; user menu; sidebar surface; Indicadores alerts; breakpoint sides; restored exact assertions | carried from ef737f1 | carried from ef737f1; every proof re-ran green at 0486bc1 | - |
| sidebar states (3), one-barra values (4), h1 per route (11), role precedence (3), action menu by row state (7), no-scroll widths (6) × screens (15), highlights (4) and compacts (9), Indicadores grid breakpoints, lists as tables (7), "largo" screens (5), empty (6), detail states (2), sidebar-token themes (3) | carried from a3bd34d (via ef737f1) | carried; every proof re-ran green at 0486bc1 | - |

## Test policy rows

Verified at 0486bc1 for the rows classifying touched files: `Indicadores.tsx` (arrangement row), and `Usuarios.tsx`/`Documentos.tsx` through their new tests (action-menu row). The other rows are carried from ef737f1.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| route -> title map, role precedence, initial bar state (decide) | `web/src/Autenticado.tsx` | Vitest, one case per row: C9 (11), C10 (3), C3 (4) | yes (carried from ef737f1; re-ran green) |
| action-menu conditions (decide) | `Usuarios.tsx`, `Artigos.tsx`, `Documentos.tsx` | Vitest, one case per row state: C25 (7) | yes - the 7 C25 cases re-ran green; `pendente` is now proven per screen (C47) |
| arrangement and container queries | `Autenticado.tsx`, `Tabela.tsx`, `Cabecalho.tsx`, `Indicadores.tsx`, `ChamadoDetalhe.tsx`, `Cadastros.tsx`, `Acesso.tsx`, `Assistente.tsx` | Playwright on each side of every breakpoint in `## Screens` | yes - the fix adds no breakpoint. The footer clamp has none, and C53 measures it at 1440 open, where the highlight cards are narrowest relative to their text (4 columns). Breakpoint-free values left uncovered are a step-1 finding, not this row's |
| components copied into `web/src/ui/` | `sidebar.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `separator.tsx`, `skeleton.tsx`, `use-mobile.ts` | none of their own | yes (crapper 0, worst `Sidebar` 9.8) |

Swept `existing` rows: carried from ef737f1. The fix touched none of `ErroDe`/`Situacao`, the `Menu` role filter or `radix-ui`.

## Faults injected

Verified at 0486bc1. Isolation: `git worktree add <scratchpad>/wt3 HEAD`, with `web/node_modules` as a junction (created with PowerShell `New-Item -ItemType Junction`, because `cmd //c mklink /J` rejected the Git Bash path quoting). Each fault was applied with `sed` in the worktree and reverted with `git checkout -- src` after its run (`git status --porcelain` count 0 each time). The junction was removed with `rmdir` before `git worktree remove --force`. `git worktree list` shows only `D:/one-system`. Real-tree porcelain before and after: `?? .idea/`, `?? .playwright-mcp/`, identical. `git stash` was not used.

E2e faults ran against `npx vite build` (output goes to the worktree's own `api/wwwroot`) and `npx vite preview --port 4179 --strictPort` from the worktree, with `E2E_URL=http://localhost:4179`. Each preview was stopped with `taskkill /T` after its run, and nothing is left listening on 4179. Each run included the control "painel recolher e expandir", which passed every time.

Each fault was confirmed in the served `index-*.js`, which holds the Indicadores, Tabela, Autenticado and sidebar code. The first F2 attempt used a quoted marker that does not match the minifier's backtick strings, so its bundle check proved nothing. It was redone as F2 below: the unfaulted bundle contains ``className:`line-clamp-1`,children:t`` once, and the F2 bundle contains it 0 times while still holding the footer text.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 Usuários and Documentos stop passing `pendente` to `MenuAcoes` (round-2 survivor F2, re-injected) | `web/src/administracao/Usuarios.tsx:53`, `web/src/conhecimento/Documentos.tsx:64` | yes - `usuarios.test.tsx:130` and `documentos.test.tsx:101` `toBeDisabled()` failed (2 failed, Artigos passed) |
| F2 highlight footer loses the `line-clamp-1` wrapper (back to the pre-fix footer) | `web/src/indicadores/Indicadores.tsx:144` | yes - C53 "valores de tipo e bordas" failed at `:1246`: `rodapé "Resolvidas sem reabertura, ..." numa linha` expected `true`, received `false` |
| F3 empty row loses `text-center` | `web/src/Tabela.tsx:33` | yes - C49 "lista vazia centralizada" failed at `:1163`: `360 px: alinhamento` expected `"center"`, received `"start"` |
| F4 header `h1` loses `truncate` | `web/src/Autenticado.tsx:197` | yes - C51 failed at `:1183` (`360 px: h1`, `['nowrap', 'ellipsis']` not received) |
| F5 sidebar group region `overflow-auto` -> `overflow-hidden` | `web/src/ui/sidebar.tsx:371` | yes - C52 "grupos rolam e iniciais na barra recolhida" failed at `:1205` ("grupos rolam") |

Cap of 5 reached. The new C50 assertion (`:885`) was not faulted. Its proof, "Trocar senha até 384 px", was made to fail in round 2 (F3 there), so every proof carrying a check has now failed at least once.

## Gate

Verified at 0486bc1.

- `cd web && npx vitest run --reporter=verbose`: 275 passed, 0 failed
- api container up (8080 answering 200); `cd web && npx playwright test --reporter=list`: 76 passed, 0 failed, no retries
- `npm --prefix web install vaul@1.1.2 --no-save`, then `python .specs/features/layout-painel/chamadas_iguais.py dac2832`: exit 0, "238 teste(s) da base, 138 gravação(ões) distintas; 0 problema(s) em HEAD". `--autoteste` ok. `npm --prefix web install` restored `node_modules` (`vaul` gone); porcelain unchanged
- `npm --prefix web run coverage` (exit 0, 275 passed), then `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0. Worst: `Sidebar` 9.8
- dryer (the C36 command) with `grep -q "No duplicate candidates found"`: exit 0
- `npm --prefix web run build`: exit 0; porcelain unchanged
- `mutator`: not run, suspended by user decision (AD-025)

Ranked gaps:

1. **Table row text size has no check and no exemption.** `## Screens` "tabela (padrão das listas)" says "Linhas de 14 px". The code sets it (`web/src/ui/table.tsx:14` `text-sm`), but no proof asserts a body cell's font size: C53 `web/e2e/arranjo.spec.ts:1260` measures only the header. The `tabelas` line in `## Exempted` names "altura das linhas, cor do hover, raio da caixa", not the text size. Round 2 missed this when it enumerated the same row.
2. **Collapsed bar "ícones centralizados" has no check and no exemption.** `## Screens` "casca, barra recolhida": "barra de 48 px só com ícones centralizados". C4 (`web/e2e/arranjo.spec.ts:806-807`) asserts that the icon is visible and the label is collapsed, not that the icon is centred in the 48 px. No e2e measures it (`rg -n "centr|center|width / 2" e2e/*.ts`). The `casca` exemption does not name it. Round 2 missed this too.

This is round 3, the last of the three-round bound, so per `verify.md` these route to the user rather than to another automatic fix round. Both gaps are measurement gaps, not known wrong output: the code appears to meet the values (`text-sm`; the shadcn collapsed-icon classes), but this report did not measure them.
