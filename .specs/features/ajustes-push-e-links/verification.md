# Ajustes: push desligado sem erro e links da resposta sem frase solta - verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 4df4070..1623190 (`9dac07b` amendments to `checks.md` and `web-push/checks.md`, `1623190` web fix). Round 1 covered 66e1818..4df4070. Its report is in git at `9dac07b`.
**Round**: 2 - scoped
**Verifier**: fresh sub-agent with no inherited context (author != verifier). It wrote none of this code, fixed nothing and committed nothing.

Scope: the diff `4df4070..1623190` plus every round 1 verdict that was not PASS. That covers C7 FAIL, the C2 precision gap with fault F2b, the colon-rule precision gap, the missing hostile-input test and the stale `web-push` C3 proof. The diff touches no file under `api/` or `api.Tests/`: `git diff --stat 4df4070..1623190 -- api api.Tests` is empty. Proofs re-ran in full at `1623190`. The only exception is the whole API suite, which is carried from `4df4070`, and `PushRotasTests` ran again at `HEAD`.

All round 1 failures are closed. Every new or re-injected fault was killed. What is still open are precision gaps, and none of them contradicts a check.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | GET `/api/push/chave` 204 with an empty body in the 3 states; POST 404; with both keys 200 + `chavePublica` | verified at 1623190: one `dotnet test api.Tests -c Release --no-build --filter "FullyQualifiedName~PushRotasTests"` process, 12 of 12 passed. `Chave_204_sem_par_completo` and `Chave_200_com_a_chave_configurada` are listed as passed | `api.Tests/PushRotasTests.cs:38` (test unchanged since round 1, assertions at `:46-48`) | PASS |
| C2 | (amended) with 204: no avisos button in the bar, no "Avisos no celular" in Conta, and the `['push-chave']` query ends in `success` with `null` | verified at 1623190: `npx vitest run`, verbose output shows `avisos > push desligado com 204 esconde os avisos` ✓ | `web/src/assistente/avisos.test.tsx:67` no button. `:72` no Conta row. `:77` `getQueryState(['push-chave'])?.status).toBe('success')`. `:78` `getQueryData(['push-chave'])).toBeNull()`. F2b is now killed (see Faults) | PASS |
| C3 | Chromium, Assistente/Fila/Conta with 204: no console error, no pageerror, no 4xx | verified at 1623190: layout suite against `vite preview --port 5199`, list output `push.spec.ts:50:1 › push desligado não deixa erro no console` ✓ | `web/e2e/push.spec.ts:62-67` (unchanged since round 1) | PASS |
| C4 | `separarLinks`, the 6 table rows | verified at 1623190: all 6 `links finais viram botões e a frase termina em dois-pontos (...)` rows ✓ | `web/src/links.test.tsx:13-20` (unchanged). The `fechar` refactor keeps the colon rule: `web/src/LinksDaResposta.tsx:22` | PASS |
| C5 | middle link inline, short label, `_blank`, `noreferrer`; middle + end link | verified at 1623190: `link no meio do texto fica na frase como link curto` ✓ | `web/src/links.test.tsx:23-43` (unchanged) | PASS |
| C6 | student chat and staff conversation render the same | verified at 1623190: `chat e conversa da equipe mostram os links igual` ✓ | `web/src/links.test.tsx:77` onwards (moved, content unchanged) | PASS |
| C7 | suites green; crapper 0 at 9.99; dryer clean; the only edits to existing assertions are those in the closed list | Vitest 492/492 (49 files). Build exit 0. Layout 153 passed. crapper exit 0. dryer "No duplicate candidates found." API: carried from 4df4070 (568 passed), plus `PushRotasTests` 12/12 at `HEAD` | Closed list items 4-6 now record the three round 1 out-of-list edits (`.specs/features/ajustes-push-e-links/checks.md:45-47`). This round's diff changes one existing test, `avisos.test.tsx:69-78`. The change only adds assertions, under the amended C2 claim, and weakens nothing. `links.test.tsx:46` and `:53` are new tests | PASS |
| C8 | `?`/`!` kept without a colon; a parenthetical that only wraps the link is removed whole; a dangling separator is removed; the link becomes a button in all 3 | verified at 1623190: `sem pontuação nem pedaço solto` ✓ | `web/src/links.test.tsx:46-51` (the 3 claim rows verbatim, plus a `!` row). Code: `web/src/LinksDaResposta.tsx:14-18` (`aparar`), `:21-24` (`fechar`), `:43` | PASS |
| C9 | the assistant bubble with hostile text yields only text, `<wbr>` and `a` with an http(s) `href`, no `on*` attribute and `rel="noreferrer"`, for the 6 inputs | verified at 1623190: `texto hostil não gera HTML nem link perigoso` ✓ | `web/src/links.test.tsx:53-75`: tag allow-list at `:66`, no `on*` at `:67`, `href` at `:69`, `rel` at `:70`. Four of the six inputs produce an anchor, so the anchor assertions are not vacuous | PASS |

### The builder's two-word limit on parentheticals (`LinksDaResposta.tsx:15`)

The builder removes a parenthetical only when at most two words come before the link inside it. I probed `separarLinks` at `HEAD` with realistic Portuguese answers in a scratch test, which I then deleted:

- Removed correctly: "(veja url)." gives "O prazo termina em 10/11.". "(disponível em url)." gives "Confira o calendário.". "(url)." gives "Acesse o portal.". "(segunda via: url)." gives "Emita o boleto.", which loses "segunda via" but still reads well.
- **Not removed (the limit is too low):** "(veja mais em url)." gives **"O prazo termina em 10/11 (veja mais em:"**. "(Portal do Aluno: url)." gives "... pelo portal (Portal do Aluno:". "(mais detalhes em url)." gives "... regulamento (mais detalhes em:". "(p. 12, url)." gives "Consulte o Manual do Aluno (p. 12:". All four leave the unbalanced parenthesis from round 1. "Veja mais em" and "Portal do Aluno" are ordinary phrasing for this assistant.
- No false positive: a parenthetical that does not wrap the final link stays as it is ("(financeiro):", "(RG e CPF) pelo portal:", "(copie e cole no navegador):").

So the limit never deletes text that should stay. It does miss realistic three- and four-word cases, and those fall back to the old defect. This is a precision gap, not a C8 failure: C8 fixes a single case, with one word. A simpler rule would drop the limit. When the parenthesis closes right after the link, remove the `(`. If the words before the link are kept, they introduce the link ("O prazo termina em 10/11, veja mais em:"). If they are dropped, the result is "O prazo termina em 10/11.". Either way no `(` is left open.

Other probe results, both minor:
- "Fonte: Manual - url1 | url2" gives "Fonte: Manual - url1:" with one button. `|` does not join two final links.
- "Saiba mais (em português) url" gives "Saiba mais (em português)" with no colon. The text ends in `)`, so the colon rule does not fire.

### `web-push/checks.md` C3

The Proof line now names `PushRotasTests.Chave_204_sem_par_completo` (`.specs/features/web-push/checks.md:50`). That test exists (`api.Tests/PushRotasTests.cs:38`), and it ran and passed in this round's `PushRotasTests` process. A note on the same line records the supersession: GET is now 204 and POST stays 404. The claim sentence on line 49 still says that GET and POST both answer 404 in 6 requests. Only the note corrects it. Round 1 asked for a note, not a rewrite, so this is acceptable, but a reader who only skims the claim gets the old status.

## Coverage

Recomputed only for the rows the fix touched: C2, the link rules, and the new C8 and C9 sets. The other rows are carried from 4df4070.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `['push-chave']` outcome with 204 (2: success/null, error) | `web/src/AvisosPush.tsx:11` (`?? null`, `retry: false`) | success + `null` `avisos.test.tsx:77-78`. The same assertion excludes the error state, and F2b proves that | - |
| avisos render sites (2 in code) | carried from 4df4070 | header `avisos.test.tsx:67` · Conta `:72` | - |
| `aparar` outcomes (wrapping paren removed + own punctuation restored, separator removed, plain; 3) | `web/src/LinksDaResposta.tsx:15-17` | paren `links.test.tsx:48` · separator `:49` · plain: the C4 rows `:13-18` | - |
| `fechar` endings (`:` kept, `?`/`!` kept, `.,;` replaced, letter/digit gets `:`; 4) | `web/src/LinksDaResposta.tsx:22-23` | `:` C4 row 1 · `?` `links.test.tsx:47` · `!` `:48` · `.` C4 row 2 · letter C4 row 4 · digit `:49` | - |
| C8 cases (3, from the claim) | C8 claim | `links.test.tsx:47`, `:48`, `:49` | - |
| C9 hostile inputs (6, from the claim) | C9 claim | `links.test.tsx:54-61`, asserted at `:66-70` | - |
| anchor producers (2: inline `TextoComLinks`, buttons `Links`) | `rg "<a href"`: `web/src/Balao.tsx:36`, `web/src/LinksDaResposta.tsx:58` | inline: C5, C9 · buttons: `conversa.test.tsx:272` and C6 (F14 killed). Button hrefs come only from `UrlFinal`, which requires `https?://` (`LinksDaResposta.tsx:7`) | - |
| everything else (API statuses, off states, screens, link forms, positions, callers) | carried from 4df4070 | see round 1 | - |

## Test policy rows

Carried from 4df4070. `checks.md` still has no `Test policy` section, so the repo's conventions decide the test level. The fix does not move any proof to another level.

## Faults injected

Each fault ran in a scratch `git worktree` at `1623190` (`.wt-verify2`, with `node_modules` as a junction), against the narrowest covering proof. The file was reverted after each run.

| Mutation | Location | Killed |
| --- | --- | --- |
| F2b (re-run) `useAvisos` throws on 204 instead of `?? null` | `web/src/AvisosPush.tsx:11` | yes - C2 `push desligado com 204 esconde os avisos` fails at `:77` (status `error`) |
| F9 final "?" turned into ":" (`fechar` strips `?!` like `.,;`) | `web/src/LinksDaResposta.tsx:22` | yes - C8 `sem pontuação nem pedaço solto` fails |
| F10 parenthetical wrapping the link left behind (`paren` always null) | `web/src/LinksDaResposta.tsx:15` | yes - C8 fails (deep-equal on the "(veja url)." row) |
| F11 dangling "-" left (separator `replace` removed) | `web/src/LinksDaResposta.tsx:16` | yes - C8 fails |
| F15 own punctuation not restored after the paren (`fim` always empty) | `web/src/LinksDaResposta.tsx:17` | yes - C8 fails |
| F12 anchor with a non-http(s) `href`: `PorUrl` widened to `javascript:` and `data:` | `web/src/LinksDaResposta.tsx:5` | yes - C9 fails: `javascript:alert(1): expected 'javascript:throw new Error(...)' to match /^https?:\/\//` |
| F12c anchor `href` set to the short label (relative, non-http) | `web/src/Balao.tsx:36` | yes - C9 fails |
| F13 inline anchor without `rel="noreferrer"` | `web/src/Balao.tsx:36` | yes - C9 fails at `links.test.tsx:70` |
| F14 button anchor without `rel="noreferrer"` | `web/src/LinksDaResposta.tsx:58` | yes - `conversa.test.tsx:272` "link da resposta vira botão..." fails |

The first version of F12 kept the `//` after the scheme. It matched none of the hostile inputs, so it was an equivalent mutant. I discarded it and replaced it with the F12 above. Cleanup: I removed the junction with `rmdir`, then removed and pruned the worktree. `git status --porcelain` matched the baseline (`.idea/`, `.playwright-mcp/`, `web/apresentacao/`).

## Findings

1. **The two-word limit misses realistic parentheticals (precision gap, C8, non-blocking).** See the judgment above: "(veja mais em url)", "(Portal do Aluno: url)" and "(mais detalhes em url)" still leave an open `(`. The limit never misfires by deleting text that should stay. Consider dropping it.
2. **Closed list item 3 is split (documentation).** Items 4-6 were inserted between the two lines of item 3, so its tail ("em nova aba" passam a esperar os dois-pontos...) now appears after item 6 (`checks.md:44-48`). Nothing is lost, but item 6 now ends with item 3's text. Move the tail back under item 3.
3. **A Coverage row in `checks.md` still lists the drawer.** The row "lugares dos avisos (3)" has "gaveta C2" (`checks.md:108`). The amended C2 claim no longer mentions the drawer, and round 1 found no drawer render site. Shrink the row to 2.
4. **The `web-push` C3 claim sentence still says GET 404.** The Proof line points at a real test that passed, and the note records the supersession. Low risk.
5. **Bullet lists and `|` between final links** are still known limits (see the Handoff), and the probe confirms them. Unchanged from round 1.
6. **XSS: still safe, and now covered by a committed test** (C9). F12, F12c and F13 show that the test can fail.

## Gate

- `dotnet test api.Tests -c Release --no-build --filter "FullyQualifiedName~PushRotasTests"` (one process, Release, built at `HEAD`): 12 passed, 0 failed. The full API suite is carried from 4df4070 (568 passed): no API file changed in `4df4070..1623190`.
- `cd web && npx vitest run`: 49 files, 492 passed, 0 failed. The named C2, C4-C6, C8 and C9 tests are present and ✓ in the verbose output.
- `npm --prefix web run build`: exit 0.
- `E2E_URL=http://localhost:5199 npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/aparencia.spec.ts e2e/instituicoes.spec.ts e2e/push.spec.ts e2e/ux.spec.ts`: 153 passed, 0 failed. I killed the preview server by PID afterwards.
- `npm --prefix web run coverage && crapper --use-existing-coverage -s src --threshold 9.99`: exit 0 (`Balao` 8.0, `useAvisos` 7.0, `aparar` 6.1, `separarLinks` 6.1, `fechar` 3.0, `TextoComLinks` 2.0).
- `dryer` (C60 list + `src/LinksDaResposta.tsx` + `src/Balao.tsx`): "No duplicate candidates found."

## Ranked gaps

1. The two-word limit leaves "(veja mais em:" on parentheticals of three or more words - C8 precision - `web/src/LinksDaResposta.tsx:15`
2. Closed list item 3 split by items 4-6 - C7 doc - `.specs/features/ajustes-push-e-links/checks.md:44-48`
3. Coverage row still lists the drawer under C2 - `.specs/features/ajustes-push-e-links/checks.md:108`
4. `web-push` C3 claim text still says GET 404 (the note corrects it) - `.specs/features/web-push/checks.md:49`
