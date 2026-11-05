# Aviso no celular com a marca da instituição verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: d13fcec..7f46cfc
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Three gaps, ranked:

1. **C8: an existing test was weakened by an edit outside the closed list.** `PushEnviadorTests.Real_envia_post_cifrado_com_vapid` (the proof of `web-push` C33) checks encryption only through `Assert.True(pedido.Corpo.AsSpan().IndexOf("One"u8) < 0, "o corpo deve ir cifrado")` (`api.Tests/PushEnviadorTests.cs:63`). The new call `PayloadPush.De("univag", "ONE-1", "Univag", "ABERTO", null)` (`:56`) produces a plaintext with no `One` in it: `{"titulo":"Univag","corpo":"Sua solicitação ONE-1 …","url":"/univag/chamados/ONE-1","icone":"/icons/icon-192.png"}`. Checked with node: `includes("One")` is `false`. The assertion now passes whether or not the body is encrypted. The Handoff says the test "só ganhou os novos argumentos", but the edit removed its only check on the body.
2. **C6: the service worker's icon guard can be bypassed.** `iconeDoApp` (`web/src/sw.ts:25`) accepts any string that starts with `/` and not with `//`. Two inputs get through and, under WHATWG URL parsing (Chrome resolves the notification `icon` this way), load an image from another site:
   - `/\evil.com/x.png` resolves to `https://evil.com/x.png`.
   - `/<TAB>/evil.com/x.png` resolves to `https://evil.com/x.png` (the same happens with `\n`).

   The percent-encoded forms `/%2fevil.com` and `%2f%2fevil.com` stay on the app or fall back to the default icon, so they are fine. The claim's security clause ("o aviso não carrega imagem de fora") is false. The check also equates "starts with `/`" with "app path", which is a precision gap. Real-world risk is low: the server builds the icon from a slug that must match `^[a-z0-9-]{3,30}$` (`api/Instituicoes/Criacao.cs:21`), and VAPID means only the server can send. Still, the guard exists only for defence in depth, and it fails at that.
3. **Isolation fault survives the narrowest proofs.** With `.IgnoreQueryFilters()` added to the icon query (`api/Agendador.cs:221`), so the Agendador reads any institution's icon:
   - `Payload_padrao_sem_aparencia` (C3) passes.
   - `Cada_item_usa_a_instituicao_da_linha` (`web-push` C32) passes.
   - Run together with `Payload_com_marca_da_instituicao`, all 4 pass.

   The mutant is killed only in a full `PushAgendadorTests` run (6 fail), because icons left behind by `Icone_do_payload_e_o_da_rota_publica` sit in the shared class-fixture database, and the current xUnit order runs that test first. No test sends, in one cycle, for one institution with an icon and one without.

## Binding sources

Profile `standard`: this step does not run. The feature has no `plan.md`, and `checks.md` marks no source as binding.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | nomeCurto + icon v2 + EM_ATENDIMENTO -> exact JSON | named filter run, `Aprovado PushAgendadorTests.Payload_com_marca_da_instituicao` | `api.Tests/PushAgendadorTests.cs:116` - `Assert.Equal("""{"titulo":"Univag","corpo":"Sua solicitação ONE-1 tem uma resposta nova.","url":"/univag-marca/chamados/ONE-1","icone":"/api/instituicoes/univag-marca/imagens/icone?v=2"}""", …Payload)`. The slug is `univag-marca` instead of `univag`; the claim still holds, because the slug is interpolated into both `url` and `icone` and `nome` ("Centro Universitário Vale", `:103`) differs from `nomeCurto`, which proves the precedence | PASS |
| C2 | body by state, 5 cases | 5 theory rows `Aprovado Corpo_pelo_estado_do_chamado(estado: …)` | `api.Tests/PushAgendadorTests.cs:135` - `Assert.Equal($"Sua solicitação {c.Numero} {fim}", corpo)` with InlineData `:121-125` | PASS |
| C3 | no nomeCurto -> nome; no icon / removed icon -> `/icons/icon-192.png` | `Aprovado Payload_padrao_sem_aparencia(iconeRemovido: False/True)` | `api.Tests/PushAgendadorTests.cs:155` - `Assert.Equal(Payload(i, c.Numero), …)`, with the helper at `:44` reading `"titulo":"{{i.Nome}}"…"icone":"/icons/icon-192.png"` | PASS |
| C4 | no "chamado"/"One" title, no personal data | `Aprovado Payload_exato_sem_dado_pessoal` | `api.Tests/PushAgendadorTests.cs:94` - `Assert.DoesNotContain(dado, payload)` over nome, e-mail, CPF, message text and chamado title. `:96` - `Assert.NotEqual("One", …titulo)`. `:97` - `Assert.DoesNotContain("chamado", titulo + corpo, OrdinalIgnoreCase)`. The exact JSON at `:90` and the 4 keys at `:91` are kept | PASS |
| C5 | SW passes institution icon to showNotification | vitest `✓ sw.test.ts > aviso com o ícone da instituição` | `web/src/sw.test.ts:37` - `expect(mostrar).toHaveBeenCalledWith('Univag', { body: corpo, icon: icone, tag: 'ONE-1', data: { url: '/univag/chamados/ONE-1' } })` | PASS |
| C6 | icon only from the app itself; anything else -> default | vitest `✓ ícone só do próprio app (URL de fora / esquema javascript / sem barra inicial / barra dupla / número / ausente)` + `carga ilegível` | `web/src/sw.test.ts:49` - `expect(…[1].icon).toBe('/icons/icon-192.png')`. Bypass: `/\evil.com/x.png` and `/\t/evil.com/x.png` pass `web/src/sw.ts:25` and resolve to `https://evil.com/x.png` (node `new URL(s, origin)`) | FAIL |
| C7 | public icon route 200 without cookie; version = `imagens.icone` | `Aprovado Icone_do_payload_e_o_da_rota_publica` | `api.Tests/PushAgendadorTests.cs:171` - `Assert.Equal($"/api/instituicoes/{i.Slug}/imagens/icone?v={versao}", icone)`. `:172` - `Assert.Equal(HttpStatusCode.OK, (await f.Cliente().GetAsync(icone)).StatusCode)` | PASS |
| C8 | suites green; only closed-list edits; build, crapper, dryer | `dotnet test api.Tests` 577/577, exit 0. vitest 500/500 in 49 files. `dotnet build api` 0 warnings, 0 errors. `npm --prefix web run build` exit 0. crapper exit 0. dryer "No duplicate candidates found." | The suites are green, but the "only closed-list edits" part fails: `api.Tests/PushEnviadorTests.cs:56` changed the input so that `:63` `Assert.True(pedido.Corpo.AsSpan().IndexOf("One"u8) < 0, "o corpo deve ir cifrado")` can no longer fail (gap 1) | FAIL |
| C9 | end to end in the user's Chrome | `docker compose exec -T postgres psql … push_saida` | Server side: the newest row (id 2) has `enviado_em = 2026-11-05 03:58:52Z`. That is after the `api` container was created (03:54:50Z) and after `14e4ad8` was committed (03:54:08Z). The payload is not stored, so the title, icon and text on screen are still unproven | manual, pending orchestrator |

Named tests confirmed to exist and run individually at `HEAD` in a single listing run (`--logger "console;verbosity=normal"`, 13 results, all `Aprovado`). They also ran inside the full `dotnet test api.Tests` run (577 passed, no hang; `Subscricao_movida_de_instituicao_nao_recebe_item_antigo` included).

### The edits outside the closed list

| Edit | Weakens a test? |
| --- | --- |
| `Payload` helper now `(Instituicao, numero)` (`PushAgendadorTests.cs:44`), used at `:71` and in `Cada_item_usa_a_instituicao_da_linha` | No. The expected value is still the exact JSON. `titulo` now also tells the two institutions apart (by `Nome`), on top of the slug in `url`. |
| `PushEnviadorTests.Real_envia_post_cifrado_com_vapid` new arguments (`:56`) | **Yes** - gap 1. The encryption guard at `:63` is now vacuous. The simplest fix is to look for a string the plaintext contains (`"Univag"`, `"solicita"`) or for the whole payload bytes. |
| `Payload_exato_sem_dado_pessoal` new assertions (closed list item 1) | No. The exclusions loop (`:93-94`) is unchanged, and `:96-97` add new checks. |
| `sw.test.ts` three `showNotification` expectations gain `icon` (closed list item 2) | No. They are exact-object matches with one more key. |
| `web-push/checks.md` C27 note (closed list item 3) | Not a test; present at `web-push/checks.md:138`. |

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| chamado state at send time (5) | `EstadosChamado` consts, `api/Dados/Entidades.cs:39-43` | ABERTO, EM_ATENDIMENTO, AGUARDANDO_ALUNO, RESOLVIDO, FECHADO -> C2 rows; EM_ATENDIMENTO also C1 | - |
| title source (2) | `i.NomeCurto ?? i.Nome`, `api/Agendador.cs:220`; empty nomeCurto normalised to null by `Limpo`, `AlterarAparencia.cs:18` | nomeCurto C1 · nome C3 | - |
| icon source (3) | `api/Agendador.cs:221`, unique (instituicao, tipo) `OneDb.cs:51` | uploaded C1, C7 · none C3 · removed C3 | - |
| icon source belongs to the sending institution (isolation, 2 institutions in one cycle) | `InstituicaoAtual` per item `api/Agendador.cs:85`; query filter `OneDb.cs:189` | no deterministic proof: the fault survives C3 and `Cada_item_usa_a_instituicao_da_linha` (gap 3) | icon of another institution |
| SW `icon` inputs (claim 5; recomputed against WHATWG URL parsing: 9) | `iconeDoApp` `web/src/sw.ts:25` + URL parser | app path C5 · `https://` C6 · `javascript:` C6 · number C6 · absent C6 · no leading slash C6 · `//` C6 · `/\host` none · `/<TAB>/host` none | `/\evil.com/x.png`, `/\t/evil.com/x.png` (accepted, load from evil.com) |
| payload keys (4) | `PayloadPush` record, `api/Chamados/PushEnviador.cs:30` | titulo C1 · corpo C1, C2 · url C1 · icone C1, C5 | - |

## Test policy rows

`checks.md` has no `Test policy` section, so the repo convention decides. The new proofs sit at the agendador/HTTP level for the API and at unit level for the service worker, which is the same as the neighbouring `web-push` proofs.

## Swept existing

- failure modes: send failures are still handled; `Status_404_e_410_apagam_a_subscricao`, `Outras_falhas_repetem_e_desistem_na_quinta` and `Falha_e_demora_do_push_seguem_os_outros_itens` exist and passed in the 577 run.
- idempotency: `tag` per chamado, `web/src/sw.test.ts:17-20` (`expect(tag(push(corpo('ONE-12')))).toBe(tag(a))`).
- observability: the agendador logs per item (`api/Agendador.cs:90`).

## Faults injected

All faults were applied in `git worktree` `.wt-verify` at `7f46cfc`. The real tree's porcelain matched the baseline after the worktree was removed.

| Mutation | Location | Killed |
| --- | --- | --- |
| title back to "One" (`new PayloadPush("One", …)`) | `api/Chamados/PushEnviador.cs:37` | yes - `Payload_com_marca_da_instituicao` and `Payload_exato_sem_dado_pessoal` fail |
| body ignores state (RESOLVIDO / AGUARDANDO_ALUNO arms removed) | `api/Chamados/PushEnviador.cs:39-40` | yes - `Corpo_pelo_estado_do_chamado` RESOLVIDO and AGUARDANDO_ALUNO fail |
| removed icon still used (`&& x.RemovidaEm == null` dropped) | `api/Agendador.cs:221` | yes - `Payload_padrao_sem_aparencia(iconeRemovido: True)` fails |
| SW accepts `//evil.com/x.png` (`&& !i.startsWith('//')` dropped) | `web/src/sw.ts:25` | yes - `ícone só do próprio app (barra dupla)` fails |
| payload carries the chamado title (`c.Numero + " " + c.Titulo`) | `api/Agendador.cs:219` | yes - `Payload_exato_sem_dado_pessoal` fails |
| icon of another institution (`.IgnoreQueryFilters()` on the icon query) | `api/Agendador.cs:221` | no - survives C3 + `Cada_item_usa_a_instituicao_da_linha` + C1 run together (4/4 pass). It is killed only in the full class run, by icons left in the fixture database (gap 3) |

## Gate

- `dotnet test api.Tests` - 577 passed, 0 failed
- `cd web && npx vitest run` - 500 passed, 0 failed (49 files)
- `dotnet build api` - 0 warnings, 0 errors
- `npm --prefix web run build` - exit 0
- `crapper --use-existing-coverage -s src --threshold 9.99` - exit 0
- `dryer … src/LinksDaResposta.tsx src/Balao.tsx --threshold 0.8` - "No duplicate candidates found."
- C61, the Playwright arrangement suite, was not run: it is not a crapper or dryer command and is outside this feature's C8.
