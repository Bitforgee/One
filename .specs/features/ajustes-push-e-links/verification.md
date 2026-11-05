# Ajustes: push desligado sem erro e links da resposta sem frase solta - verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 66e1818..4df4070 (`f438531`, `4df4070`)
**Round**: 1 - full
**Verifier**: fresh sub-agent with no inherited context (author != verifier). It wrote none of this code, fixed nothing and committed nothing.

The code does what the Intent asks. All proofs are green at `HEAD`. The real app on a fresh institution shows no console error and no 4xx. Every fault except one was killed. The feature still fails on two counts, and neither needs a code change:

1. **C7's closed-list clause is false.** Three edits to existing assertions fall outside the closed list: `Sem_assunto_o_push_fica_desligado`, `e2e/arranjo.spec.ts:230` and `test/estrutura.test.ts` `Raiz`. The Handoff discloses them, but `checks.md` never extended the list. `revisao-ux` round 3 set the precedent of extending the closed list in `checks.md`.
2. **One mutant survived on C2.** The claim says "nenhum erro é lançado", but the proof only spies `console.error`. A `useAvisos` that throws on `204` passes C2 and C3.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | GET `/api/push/chave` 204 with an empty body in all 3 states; POST stays 404; with both keys GET is 200 + `chavePublica` | one `dotnet test api.Tests -c Release` process (see Gate). TRX: `Chave_204_sem_par_completo` Passed, `Chave_200_com_a_chave_configurada` Passed | `api.Tests/PushRotasTests.cs:46` `Assert.Equal(HttpStatusCode.NoContent, r.StatusCode)`. `:47` `Assert.Equal("", await r.Content.ReadAsStringAsync())`. `:48` POST `NotFound`. `:33-34` `["chavePublica"]` and `OneFactory.Vapid.PublicKey` | PASS |
| C2 | with 204: no avisos button, no "Avisos no celular" in Conta, no error thrown | `npx vitest run` (whole suite). Verbose output shows `avisos > push desligado com 204 esconde os avisos` ✓ | `web/src/assistente/avisos.test.tsx:65` `expect(screen.queryByRole('button', { name: /avisos/i })).not.toBeInTheDocument()`. `:70` `queryByText('Avisos no celular')).not...`. `:71` `expect(erro).not.toHaveBeenCalled()`. "No error thrown" is proven only as "no console.error": fault F2b survives | PASS (precision gap, see Faults) |
| C3 | Chromium, Assistente/Fila/Conta with 204: no console error, no pageerror, no 4xx | layout suite against `vite preview --port 5199`. List output: `push.spec.ts:50:1 › push desligado não deixa erro no console` ✓ | `web/e2e/push.spec.ts:62` `expect((await pedido).status()).toBe(204)`. `:64` `toHaveCount(0)`. `:66` `expect(falhas).toEqual([])`. `:67` `expect(erros).toEqual([])` | PASS |
| C4 | `separarLinks`, 6 table rows | `npx vitest run`. All 6 `links finais viram botões e a frase termina em dois-pontos (...)` rows ✓ | `web/src/links.test.tsx:13-18` (the 6 rows, verbatim from the claim). `:20` `expect(separarLinks(texto)).toEqual({ texto: frase, links })` | PASS |
| C5 | middle link stays inline as `a[href]`, `_blank`, `noreferrer`, short label, no `https://`, no button. Middle + end link: middle inline, end becomes a button | `npx vitest run`. `link no meio do texto fica na frase como link curto` ✓ | `web/src/links.test.tsx:28` `expect(links).toEqual([])`. `:29` full text with `a.edu.br/boletos`. `:31-33` href, target, rel. `:35` `not.toContain('https://')`. `:40` `toEqual({ texto: 'Veja https://a.edu.br/boletos primeiro. Depois acesse:', links: ['https://b.edu.br/pagar'] })`. `:43` one inline link | PASS |
| C6 | student chat and staff conversation render the same: text ends in "acessar diretamente:", 1 `a[href]` labelled `portal.univag.edu.br/financeiro/boletos` | `npx vitest run`. `chat e conversa da equipe mostram os links igual` ✓ | `web/src/links.test.tsx:62` and `:74` `.textContent).toBe(Frase)`. `:63` and `:75` `getAllByRole('link')).toHaveLength(1)`. The label is matched by the `findByRole('link', { name: /portal\.univag.../ })` at `:61` and `:73` | PASS |
| C7 | API, Vitest, build and layout suites green; crapper 0 at 9.99; dryer clean; **"as únicas edições em asserções existentes são as da lista fechada"** | API 566 + 2 passed (see Gate). Vitest 490/490. Build exit 0. Layout 153 passed. crapper exit 0. dryer "No duplicate candidates found." | Suites: see Gate. The closed-list clause does not hold: `api.Tests/PushRotasTests.cs:59` (`Sem_assunto_o_push_fica_desligado`, 404 to 204), `web/e2e/arranjo.spec.ts:230` ("O boleto fica em." to "fica em:") and `web/src/test/estrutura.test.ts:12` (`links.test.tsx` added to `Raiz`) are not in items 1-3 | FAIL |

### Judgment on the edits outside the closed list (C7)

- **`Sem_assunto_o_push_fica_desligado` 404 to 204** (`PushRotasTests.cs:59`). This is a direct consequence of the change. The handler has one "off" branch (`ConfigPush.Ligado` is false when the key pair *or* `Assunto` is empty, `api/Chamados/ConfigPush.cs:6`), so keeping 404 there would assert a defect. The edit does not weaken anything: it now proves a fourth "off" state (`Assunto` empty) that the Coverage table never named. Accept it, and record it as closed-list item 4.
- **`e2e/arranjo.spec.ts:230` "fica em." to "fica em:"**. This is the arrangement test of the ticket detail, and the text locator follows the C4 rule. The assertion it feeds, that the source sits below the text, is unchanged. It does not weaken anything. Accept it as item 5.
- **`test/estrutura.test.ts:12` `Raiz` gains `links.test.tsx`**. The checks fix the path `web/src/links.test.tsx` (intro, "Classes e arquivos novos"), and the structure test refuses root test files that are not listed. The allow-list grows by exactly the file the contract names. This loosens a structure rule by one named file, which is acceptable. Accept it as item 6.
- **Rename `Sem_par_completo_404_nas_duas_rotas` to `Chave_204_sem_par_completo`**. The checks intro anticipates it, so it is inside the contract. Its side effect is outside: **`.specs/features/web-push/checks.md` C3 (line 49-50) is now broken twice.** Its `Proof:` filter `PushRotasTests.Sem_par_completo_404_nas_duas_rotas` matches no test (`rg` finds the name only in the two `checks.md` files). Under VSTest a filter that matches nothing exits 0, so the old check would read green with no test behind it. Its claim also still says GET responds `404`. Record this in `web-push/checks.md` C3: GET is `204` since `ajustes-push-e-links` C1 (AD-022 unchanged otherwise), POST stays `404`, and the proof becomes `PushRotasTests.Chave_204_sem_par_completo`. Also add a note that the claim was superseded by this feature, not silently rewritten.

### C3's SignalR stub (`push.spec.ts:53`)

This is simulator noise and hides no real 4xx. `simularApi` answers every unknown `/api/**` route with `404` (`web/e2e/simulada.ts:104`). The SignalR negotiate at `/api/tempo-real/negotiate` is opened for every authenticated session (`web/src/Autenticado.tsx:340`) and has nothing to do with push. In the real HEAD image (below), a fresh student's session made **zero** responses `>= 400` across Assistente, Solicitações and Conta, so the real negotiate does not 4xx. The stub only replaces a 404 that exists only in the simulator. The rest of the test still counts every other unsimulated route as a 4xx, so it stays strict.

### Real app (HEAD image on :8088)

`git archive HEAD | docker build -t one-verify:head -` produced the image. It ran on `:8088` on `one-system_default` with empty `Push__*` values. `instituicao criar --slug verif-0411` (CLI in the container) created the institution. Then: admin first access, a course, a CSV import of one student, the student's first access through Mailpit, and login through the UI. The browser visited `assistente`, `solicitacoes`, `conta` and `assistente` again. Results:
- `/api/push/chave`: `204` four times;
- console `error` or `warning`: none; `pageerror`: none; responses `>= 400`: none;
- avisos buttons: 0.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/push/chave` statuses (3) | `VerChavePush.cs:16` (200 / 204), route group auth | 200 `PushRotasTests.cs:33-34` · 204 `:46` · 401 `Sem_cookie_401_nas_tres_rotas` (TRX Passed, unchanged) | - |
| push "off" states (4, from code, not 3) | `ConfigPush.cs:6`: `Ligado` needs public, private **and** `Assunto` | both empty, only public, only private `PushRotasTests.cs:46` (loop of 3) · `Assunto` empty `:59` (the out-of-list edit; the checks' set missed this member) · all set -> 200 `:33` | - |
| `POST /api/push/subscricao` when off (3 states) | same | `PushRotasTests.cs:48` inside the 3-state loop | - |
| avisos render sites (2 in code; checks name 3) | `rg AvisosPush/useAvisos`: header `Autenticado.tsx:248` (student), Conta row `acesso/Conta.tsx:31`. No drawer site exists | header `avisos.test.tsx:65` · Conta `:70` · drawer: vacuous (nothing renders there), so the document-wide query at `:65` covers it | - |
| screens without console errors (3) | C3 claim | Assistente, Fila and Conta in the loop at `push.spec.ts:59-65`, asserted at `:66-67` | - |
| final-link forms (6, from the claim) | C4 claim | `links.test.tsx:13-18`, asserted at `:20` | - |
| link position (3) | C5 claim | end only C4 · middle only `links.test.tsx:28-35` · middle + end `:40-43` | - |
| `separarLinks` + `comLinks` callers (2) | `rg "separarLinks\(|comLinks="`: `Assistente.tsx:111-113`, `Conversa.tsx:70-72` | student chat `links.test.tsx:74-75` · staff conversation `:62-63` | - |

## Test policy rows

`checks.md` has no `Test policy` section, so the repo's conventions decide the level. The API status claims (C1) are proven at the HTTP boundary through `WebApplicationFactory`, and the browser-console claim (C3) is proven in Chromium. No level gap.

## Faults injected

Each fault ran in a scratch `git worktree` at `HEAD` (`.wt-verify`, `node_modules` as a junction), against the narrowest covering proof.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 GET back to `Problemas.Erro(404, NaoConfigurado)` | `api/Chamados/VerChavePush.cs:16` | yes - `Chave_204_sem_par_completo` and `Sem_assunto_o_push_fica_desligado` fail |
| F2a `useAvisos` returns `undefined` on 204 (drops `?? null`; react-query records the undefined data as an error) | `web/src/AvisosPush.tsx:11` | yes - C2 `push desligado com 204 esconde os avisos` fails (console.error spy) |
| F2b `useAvisos` treats 204 as an error: `if (!r) throw new Error('push desligado')` | `web/src/AvisosPush.tsx:11` | no - survived: C2 green, and C3 green against a preview of the mutant build. The query's error state is never logged or shown (no `QueryCache.onError`, `App.tsx:24-31`), so the clause "nenhum erro é lançado" has no assertion behind it. Either reword C2 to "no console.error" or assert the `['push-chave']` query state is `success` |
| F3 trailing link kept inline (`UrlFinal` never matches) | `web/src/LinksDaResposta.tsx:7` | yes - C4 (5 of 6 rows), C5 and C6 fail |
| F4 middle link also becomes a button | `web/src/LinksDaResposta.tsx:27` | yes - C5 fails: `expected [ 'https://a.edu.br/boletos' ] to deeply equal []` |
| F5 colon replaced by period again | `web/src/LinksDaResposta.tsx:28-29` | yes - C4 fails on 5 rows |
| F6 inline anchor without `rel="noreferrer"` | `web/src/Balao.tsx:36` | yes - C5 fails at `toHaveAttribute('rel', 'noreferrer')` |
| F7 staff conversation skips `separarLinks` | `web/src/chamados/Conversa.tsx:70` | yes - C6 fails |
| F8 `console.error` on 204 (production build, preview :5299) | `web/src/AvisosPush.tsx:11` | yes - C3 fails |

After cleanup the real tree's `git status --porcelain` matched the baseline.

## Findings

1. **C7 closed list (FAIL, documentation only).** Extend the closed list in `checks.md` with items 4-6 (above) and get the user's approval. The edits themselves are sound.
2. **`web-push/checks.md` C3 stale (outside this feature's rows).** Its proof name matches no test, and its claim still says `404`. Record the supersession as described above.
3. **C2 precision gap / F2b survived.** "Nenhum erro é lançado" is proven only as "no console.error".
4. **The colon rule gives odd text in realistic answers (precision gap in C4, not failing).** I probed `separarLinks` and `Balao comLinks` with realistic Portuguese answers:
   - OK: "...Você também pode acessar diretamente:" + button; "O calendário ... em <inline>. Lá você encontra ..." (inline, no button); "Consulte o regulamento:" + 3 buttons; "Mais informações (url)." gives "Mais informações:"; "Acesse o portal do aluno. url" gives "Acesse o portal do aluno:".
   - Odd: "O prazo termina em 10/11 (veja https://a.edu.br/prazos)." gives **"O prazo termina em 10/11 (veja:"**, an unbalanced parenthesis. "Ficou com dúvida? url" gives **"Ficou com dúvida:"** (the question mark is lost). "Fonte: Manual do Aluno, p. 12 - url" gives "... p. 12 -" (dangling dash, no colon). A bulleted list "- Boletos: url\n- Notas: url" turns only the last item into a button, leaving "- Notas:" dangling while "Boletos" stays inline. "...o edital em <inline> e o resultado em:" + button is mixed but readable.
   - None of these contradicts a check. The checks enumerate 6 forms, and these sit outside them. Worth a row each if the team cares; the parenthesis and the list cases are the most visible.
5. **XSS: safe.** I rendered hostile texts through `separarLinks` + `Balao comLinks`: `javascript:alert(1)`, `javascript:...//https://...`, `data:text/html,<script>`, `"onmouseover="`, `'onx='`, `<img onerror>`, `<script>` inside a URL, `&#34;`, `https://javascript:alert(1)@...` and upper-case `HTTPS://`. The content held only text nodes, `<wbr>` and `<a>`. Every `href` started with `http(s)://` (the `PorUrl` match stops at quotes, `<`, `>`, parentheses and whitespace). No element had an `on*` attribute and every anchor had `rel="noreferrer"`. No committed test covers hostile input for the new anchors. The old text-only assertion (`conversa.test.tsx` ~257) still covers the no-URL case.
6. **Environment note.** The first full API run hung (CPU flat for more than 1 min, about 7 min in) and was killed. A rerun excluding `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo` finished, and that test then passed alone in 1 s. `ArquiteturaTests.Dois_projetos_sem_repositorio` failed in that rerun only because my scratch worktree added 2 `.csproj` files under the repo root. It passed when rerun after the worktree was removed.

## Gate

- `dotnet test api.Tests -c Release --no-build --filter "FullyQualifiedName!~PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo"`: 566 passed, 1 failed (`Dois_projetos_sem_repositorio`, caused by the verifier's worktree). Then `--filter "...Dois_projetos_sem_repositorio|...Subscricao_movida_de_instituicao_nao_recebe_item_antigo"` after removing the worktree: 2 passed, 0 failed. Total 568 passed, 0 failed.
- `cd web && npx vitest run`: 49 files, 490 passed, 0 failed.
- `npm --prefix web run build`: exit 0.
- `E2E_URL=http://localhost:5199 npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/aparencia.spec.ts e2e/instituicoes.spec.ts e2e/push.spec.ts e2e/ux.spec.ts`: 153 passed, 0 failed.
- `npm --prefix web run coverage && crapper --use-existing-coverage -s src --threshold 9.99`: exit 0 (`Balao` 8.0, `useAvisos` 7.0, `separarLinks` 7.0, `TextoComLinks` 2.0).
- `dryer` (C60 list + `src/LinksDaResposta.tsx` + `src/Balao.tsx`): "No duplicate candidates found."

## Ranked gaps

1. C7 closed-list clause false (3 out-of-list edits not recorded in `checks.md`) - C7 - `api.Tests/PushRotasTests.cs:59`, `web/e2e/arranjo.spec.ts:230`, `web/src/test/estrutura.test.ts:12`
2. F2b survived: C2's "no error thrown" is unasserted - C2 - `web/src/assistente/avisos.test.tsx:71`
3. `web-push` C3 proof names a test that no longer exists and claims 404 - `.specs/features/web-push/checks.md:49-50`
4. Precision gap: colon rule on "(veja url)." / "?" / bullet lists - C4 - `web/src/LinksDaResposta.tsx:20-29`
