# Aparência da instituição e revisão visual - verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 5b355d9..3327feb for this feature. Proofs ran at HEAD `7590bc1`. `224d84b` and `7590bc1` belong to `protecao-injecao` and are judged here only for whether they reach this feature's proofs.
**Round**: 3 - scoped. Fix diff `5f35a14..3327feb`, restricted to this feature: `checks.md` in `b9d2435` and `8106a24`, and `web/e2e/aparencia.spec.ts` in `3327feb`. Plus the one round-2 verdict that was not PASS (C65). All proofs re-ran in full at HEAD `7590bc1`.
**Verifier**: fresh sub-agent with no inherited context (author != verifier), dispatched by the orchestrator

Why FAIL:
1. The round-2 survivor is now killed. Removing `items-center` from the welcome `<section>` fails C65: at 390 px the photo is 147 px off centre. Faults that move only the grid or only the title are killed too.
2. The centred set is still not fully proven. The design (`plan.md:138-140`) centres four items: the photo (or, with no photo, the illustration `Conversa`), "Olá! Eu sou {nome}.", the welcome text and the grid. C65 names three of them and leaves out the welcome text, and its test only renders the photo variant. Two faults that each move one element survived: the welcome paragraph moved 227 px off centre (fault D), and the illustration moved 320 px off centre (fault E).

Earlier rounds:
- Round 1 (`179d088`, FAIL): the C7 badge assertion was conditional, the `## Screens` arrangements had no checks, and C2 measured 4 of the 8 sizes.
- Round 2 (`5f35a14`, FAIL on C65 only): the test measured the full-width `<section>`, and removing `items-center` survived.

This is round 3, the last before the user decides.

## Binding sources

Step 1 re-ran at `7590bc1` only for the screen whose check the fix touched (Assistente sem conversa). Every other row is carried from `5f35a14`. Citations into `aparencia.spec.ts` are refreshed: the fix added 4 lines at 150-156, so every line from 152 on moved by +4.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| plan `## Landing` doors 1-11 | yes - `plan.md:105-117` (carried from 179d088) | none | - |
| `## Screens` Login, Primeiro acesso, Criar senha >= 1024 | yes - `plan.md:126-130` (carried from 5f35a14) | none | - (logo/initials C35 + `arranjo.spec.ts` `linha da marca na entrada`; image cover C38; texts at the base on the dark band C66 `aparencia.spec.ts:168,172`; illustration without an image C50, with the texts at the base below it by `arranjo.spec.ts:1546`) |
| `## Screens` Login < 1024 | yes - `plan.md:131-132` (carried from 5f35a14) | none | - (C38 `aparencia.spec.ts:111-117`, C50) |
| `## Screens` Raiz `/` | yes - `plan.md:133-134` (carried from 5f35a14) | none | - (C40) |
| `## Screens` Casca autenticada | yes - `plan.md:135-137` (carried from 5f35a14) | none | - (logo on the open bar C35; icon 32 px collapsed C69 `aparencia.spec.ts:215-216`; 24 px before the title on mobile, icon and initials, C69 `:227-230`; links C36) |
| `## Screens` Assistente sem conversa | yes - `plan.md:138-140`, re-read at HEAD (the fix touched C65, the check for this screen) | none | the welcome text ("as boas-vindas", which the design lists among the centred items) has no check: C65 names the photo, the title and the grid only, and a fault that moves only the paragraph 227 px off centre survived (fault D). The illustration ("sem foto, a ilustração `Conversa`") is named by C65 but never rendered by its test, and a fault that moves only the illustration 320 px off centre survived (fault E). Covered: photo, title text and grid centred (C65 `aparencia.spec.ts:156`, faults A-C killed); 1/2-column grid (C65 `:146-149`); 64 px photo, text and order of questions (C41) |
| `## Screens` Assistente com conversa | yes - `plan.md:141` (carried from 5f35a14) | none | - (C67 `aparencia.spec.ts:188-189`, C44) |
| `## Screens` Transferido | yes - `plan.md:142-143` (carried from 5f35a14) | none | - (C68 `aparencia.spec.ts:204`, C45) |
| `## Screens` Menu | yes - `plan.md:144-145` (carried from 5f35a14) | none | - (C46) |
| `## Screens` Listas | yes - `plan.md:146-151` (carried from 5f35a14) | none | - (C4, C48; cards with the badge on the right C7, now unconditional `celular.spec.ts:105`) |
| `## Screens` Detalhe do chamado < 1024 | yes - `plan.md:152-153` (carried from 5f35a14) | none | - (C8, C9) |
| `## Screens` Indicadores | yes - `plan.md:154-155` (carried from 5f35a14) | none | - (C5, C49) |
| `## Screens` Cadastros < 768 | yes - `plan.md:156` (carried from 5f35a14) | none | - (C6) |
| `## Screens` Aparência | yes - `plan.md:157-159` (carried from 5f35a14) | none | - (C28; each of the 4 images with thumbnail, "Enviar imagem" and "Remover" C70 `administracao/aparencia.test.tsx:193-206`; preview initials equal the login's C71 `:228-229`) |
| STATE.md AD-008, AD-021, AD-027, AD-029, AD-030 | yes (carried from 179d088) | none | - |
| design audit 04/11, user request 04/11 | only through `plan.md:10-29` (carried from 179d088) | none | - |

Blanket exemptions: none (carried from 5f35a14; `plan.md:124` assigns only colour, spacing and font weight to the tokens).

## Checks

Proofs ran at `7590bc1` (HEAD) as follows:
- API: one xUnit v3 process of the Release `One.Api.Tests.exe`, built at HEAD, over the whole assembly except `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo`: 535 passed, 0 failed. That test then ran alone: 1 passed.
- Vitest: `cd web && npx vitest run` over the whole suite: 331 passed, 0 failed (40 files).
- Layout: `npm --prefix web run build`, then `npx vite preview --port 5199`, then one Playwright run of the `arranjo`, `celular` and `aparencia` specs: 89 expected, 0 unexpected, 0 flaky.
- Real e2e (C64): carried from `5f35a14` (see the C64 row).

Every test named below appears individually as passed in those reports (the xUnit XML and the Vitest and Playwright JSON). Citations into files the fix did not touch carry from `5f35a14`. Citations into `web/e2e/aparencia.spec.ts` are refreshed at `7590bc1`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | alert text in 1 line, full-width column | PW `alerta sem ícone em uma linha` passed | `web/e2e/celular.spec.ts:30` `toBeLessThanOrEqual(medidas.linha * 1.5)`; `:31` column vs content `<= 1` | PASS |
| C2 | 44 px for the 8 Button sizes, Input, NativeSelect, Tabela actions; 36 at 1024 | PW `alvos de toque de 44 px abaixo de 768` passed | `celular.spec.ts:53` `for (const tamanho of nomes) expect(medidos[tamanho], \`Button ${tamanho}\`).toBeGreaterThanOrEqual(44)` over the 8 names at `:38`: real default, icon, sm, icon-sm and icon-xs; test buttons for lg, xs and icon-lg, which no screen uses (`Autenticado.tsx:139` `size="lg"` is a `SidebarMenuButton`); `:55,:57,:59` Input, NativeSelect, actions; `:62` `toBe(36)` | PASS |
| C3 | badge class per group | VT `selo de estado com cor por grupo` passed | `web/src/tabela.test.tsx:35` `toHaveClass(classe)` (carried) | PASS |
| C4 | 3 skeletons, no Spinner | VT `carregando mostra 3 esqueletos` passed | `tabela.test.tsx:43` `toHaveLength(3)`; `:44` (carried) | PASS |
| C5 | no ellipsis or overflow; 40 chars in <= 2 lines | PW `Indicadores sem texto cortado` passed | `celular.spec.ts:75` `expect(cortados).toEqual([])`; `:80` tspan `<= 2` | PASS |
| C6 | selector and "Novo" on the same top | PW `Cadastros seletor e Novo na mesma linha` passed | `celular.spec.ts:89` `\|seletor.y - novo.y\| <= 1` | PASS |
| C7 | 6 lists as cards; 1 badge per card asserted before measuring; badge right, same top; title below; tables at 1024 | PW `listas viram cartões abaixo de 768` passed | `celular.spec.ts:105` `expect(...[data-celula=selo] [data-slot=badge]).count()).toBe(await cartoes.count())` for Fila and Minhas, no `if` on the badge; `:109-110` top and right; `:112` title below; `:100` no table; `:116` table at 1024 | PASS |
| C8 | fixed "Ações" >= 44; bottom Sheet with the same buttons; none at 1024 | PW `Ações do chamado no rodapé abaixo de 1024` passed | `celular.spec.ts:124` count 0; `:132` `{posicao:'fixed', fundo:'0px'}`; `:133` `>= 44`; `:138` bottom 800; `:139` `toEqual(nomesNoCartao)` | PASS |
| C9 | Sheet action closes it and updates the badge | PW `ação no Sheet fecha e atualiza` passed | `celular.spec.ts:158` `toBeHidden()`; `:159` `toHaveText('Em atendimento')` | PASS |
| C10 | no horizontal scroll at 360 | PW `sem rolagem horizontal a 360` passed | `celular.spec.ts:167` `scrollWidth <= 360` | PASS |
| C11 | GET admin 200 with 6 null keys, then the values | xUnit `Get_sem_aparencia_devolve_nulos` passed | `api.Tests/AparenciaAdminTests.cs:43` `HttpStatusCode.OK`; `:45-52` (carried) | PASS |
| C12 | PUT saves; absent/null back to default; B untouched | xUnit `Put_grava_e_campo_ausente_volta_ao_padrao` passed | `AparenciaAdminTests.cs:92-94` `Assert.Null(linha2.Cor)`; `:97-98` (carried) | PASS |
| C13 | invalid colour 400 `errors.cor`, nothing saved; 2 accepted | xUnit `Cor_invalida_ou_sem_contraste_400` x6 passed | `AparenciaAdminTests.cs:122` `BadRequest`; `:123` `Erros(..., "cor")`; `:125` (carried) | PASS |
| C14 | 12 limits on both sides, 24 requests, plus the invalid e-mail | xUnit `Limites_dos_textos_400` x12 and `Email_de_contato_invalido_400` passed (both `Proof:` lines now select them) | `AparenciaAdminTests.cs:159` accepted at max; `:166` `BadRequest` at max+1; `:168` limit in the text; `:181-183` e-mail (carried) | PASS |
| C15 | upload v1, then re-upload v2 with the old object kept | xUnit `Enviar_imagem_grava_e_reenviar_sobe_a_versao` passed | `AparenciaAdminTests.cs:198-216` (carried) | PASS |
| C16 | 415 x3, nothing saved; JPEG accepted for 3 types | xUnit `Tipo_de_imagem_recusado_415` passed | `AparenciaAdminTests.cs:225-233` (carried) | PASS |
| C17 | 413 with the limit; exact limits accepted | xUnit `Imagem_acima_do_limite_413` passed | `AparenciaAdminTests.cs:246-253` (carried) | PASS |
| C18 | icon 400 for 512x511 and 511x511 | xUnit `Icone_nao_quadrado_ou_pequeno_400` x4 passed | `AparenciaAdminTests.cs:270-276` (carried) | PASS |
| C19 | unknown type 404 | xUnit `Tipo_desconhecido_404` passed | `AparenciaAdminTests.cs:284-285` (carried) | PASS |
| C20 | MinIO down 503, row unchanged | xUnit `Minio_fora_503_sem_mudar_a_imagem` passed | `AparenciaAdminTests.cs:298,300` (carried) | PASS |
| C21 | DELETE 204, row marked, object kept; 404s; no reused version | xUnit `Remover_imagem_204_e_objeto_fica` and `Reenviar_depois_de_remover_nao_repete_versao` passed | `AparenciaAdminTests.cs:312-321,331,335` (carried) | PASS |
| C22 | 403/401 over 12 requests; A/B isolation | xUnit `Rotas_de_admin_403_e_401` passed | `AparenciaAdminTests.cs:362,372-376` (carried) | PASS |
| C23 | "Aparência" link, admin only | VT `link Aparência só para administrador` passed | `web/src/administracao/aparencia.test.tsx:47` absent for ALUNO/ATENDENTE; `:50` href; `:51` palette | PASS |
| C24 | preview changes before saving, 4 cases | VT `prévia muda antes de salvar` passed | `administracao/aparencia.test.tsx:65` `toHaveStyle({ backgroundColor: Cor })`; `:69,:72,:75` | PASS |
| C25 | PUT, "Aparência salva.", `--marca` without reload | VT `salvar mostra Aparência salva e aplica sem recarregar` passed | `administracao/aparencia.test.tsx:93` text; `:95-98` | PASS |
| C26 | API error shown, form kept | VT `erro da API aparece e o formulário fica` passed | `administracao/aparencia.test.tsx:109` `toContainElement(...'Cor principal')`; `:124-127` | PASS |
| C27 | contrast 7,65 / 4,54 / 1,40; Salvar disabled | VT `contraste ao lado da cor e Salvar desabilitado` and `contraste calcula a razão WCAG` passed | `administracao/aparencia.test.tsx:143` text; `:146-147`; `web/src/aparencia.test.tsx:42-44` | PASS |
| C28 | 1440 two columns sticky; 390 preview above, collapsible; section order | PW `arranjo Aparência` passed | `web/e2e/aparencia.spec.ts:23-25,31,35,40` | PASS |
| C29 | Remover asks Confirmar, DELETE, thumbnail gone | VT `remover imagem pede confirmação` passed | `administracao/aparencia.test.tsx:165` dialog; `:169` `toEqual(['/api/admin/aparencia/imagens/logo'])` | PASS |
| C30 | public GET 200 with the keys; inactive 404 | xUnit `Instituicao_publica_traz_a_aparencia` passed | `api.Tests/AparenciaPublicaTests.cs:28-40` (carried) | PASS |
| C31 | anonymous image with immutable cache | xUnit `Imagem_publica_com_cache_imutavel` passed | `AparenciaPublicaTests.cs:55` `Assert.Equal("public, max-age=31536000, immutable", ...)` (carried) | PASS |
| C32 | image 404 x4, 503 | xUnit `Imagem_publica_404_e_503` passed | `AparenciaPublicaTests.cs:68-75` (carried) | PASS |
| C33 | "Entrar" background in 3 themes, with and without colour | PW `cor da instituição nos três temas` passed | `aparencia.spec.ts:73` `expect(fundo).toBe(esperado)` | PASS |
| C34 | tokens from `var(--marca, base)`; `--marca` only with a colour | VT `marca no html só com cor`, `tokens derivam de marca nos três temas` passed | `web/src/aparencia.test.tsx:52,58-59,78-84` (carried) | PASS |
| C35 | logo src/alt <= 40 px; initials without a logo | VT `logo no login e na barra`, PW `logo até 40 px no login` passed | `aparencia.test.tsx:94-114`; `aparencia.spec.ts:85-86` | PASS |
| C36 | icon links, collapsed bar, mobile top; defaults | VT `ícone na aba, na barra recolhida e no topo` passed | `aparencia.test.tsx:122-136` (carried) | PASS |
| C37 | title and theme-color | VT `título e theme-color da instituição` passed | `aparencia.test.tsx:143-156` (carried) | PASS |
| C38 | panel image box, cover, alt; 128 px band | PW `imagem do login no painel e na faixa` passed | `aparencia.spec.ts:98-117` | PASS |
| C39 | login texts or the base texts | VT `textos do login da instituição ou os de base` passed | `aparencia.test.tsx:176-188` (carried) | PASS |
| C40 | Boas-vindas above h1 at `/` | VT `raiz com a ilustração Boas-vindas` passed | `aparencia.test.tsx:209` (carried) | PASS |
| C41 | 64 px photo, greeting, 4 buttons; defaults | VT `boas-vindas com nome, foto e perguntas`, `boas-vindas padrão sem aparência` passed | `web/src/assistente/boasvindas.test.tsx:27-31,39-42` (carried) | PASS |
| C42 | 2 default questions | VT `perguntas padrão` passed | `boasvindas.test.tsx:51` (carried) | PASS |
| C43 | tapping a suggestion POSTs it | VT `tocar na sugestão envia a pergunta` passed | `boasvindas.test.tsx:60-63` (carried) | PASS |
| C44 | 24 px photo on assistant bubbles only | VT `foto do assistente nos balões` passed | `boasvindas.test.tsx:75-83` (carried) | PASS |
| C45 | contact block in Transferido | VT `contato na transferência` passed | `boasvindas.test.tsx:114-118` (carried) | PASS |
| C46 | "Contato" menu item | VT `item Contato no menu só com contato` passed | `aparencia.test.tsx:222-245` (carried) | PASS |
| C47 | 6 SVGs, tokens only | VT `6 ilustrações só com currentColor e tokens` passed | `web/src/ilustracoes/ilustracoes.test.tsx:13-32` (carried) | PASS |
| C48 | illustrated empty state in 6 lists | VT `vazio ilustrado nas 6 listas` x6 passed | `tabela.test.tsx:52-62` (carried) | PASS |
| C49 | Indicadores without data | VT `Indicadores sem dados com ilustração` passed | `aparencia.test.tsx:259-260` (carried) | PASS |
| C50 | illustration without a login image | PW `ilustração no login sem imagem` passed | `aparencia.spec.ts:129-130` | PASS |
| C51 | `EmailSaida` mail is multipart/alternative; text/plain equals Corpo; html part | xUnit `EmailMarcaTests.Email_vai_com_texto_e_html` passed | `api.Tests/EmailMarcaTests.cs:50` `Contains("multipart/alternative", raw)`; `:51` `Assert.Equal(Corpo, Texto(msg))`; `:52` (carried; the amended claim now matches the test's generic `EmailSaida`) | PASS |
| C52 | colour, `cid:logo`, escaping; defaults | xUnit `Html_com_cor_logo_e_corpo_escapado` passed | `EmailMarcaTests.cs:71-86` (carried) | PASS |
| C53 | MinIO down: sent without logo | xUnit `Minio_fora_envia_sem_logo` passed | `EmailMarcaTests.cs:100-106` (carried) | PASS |
| C54 | manifest fields; defaults | xUnit `Manifesto_da_instituicao`, `Manifesto_padrao_sem_aparencia` passed | `api.Tests/ManifestoTests.cs:24-36,49-54` (carried) | PASS |
| C55 | manifest 404 | xUnit `Manifesto_404` passed | `ManifestoTests.cs:64-65` (carried) | PASS |
| C56 | manifest link per slug | VT `manifesto da instituição no link` passed | `aparencia.test.tsx:163,167` (carried) | PASS |
| C57 | whole API suite; existing edits on items 1-4 only | 536 passed at HEAD (see Gate) | `api.Tests/RetratoTests.cs:51`; the fix `5f35a14..3327feb` changed no file under `api/` or `api.Tests/`. `7590bc1` changed `api/Assistente/*` and two test files of `protecao-injecao`, outside this feature | PASS |
| C58 | `rotas.txt` +6, none removed | xUnit `RetratoTests.Tabela_de_rotas_igual_a_da_base` passed | `RetratoTests.cs:51` `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva)` | PASS |
| C59 | door 1 columns, unique index, no pending changes | xUnit `Toda_entidade_tem_instituicao_e_filtro`, `Tabelas_snake_case_e_datas_timestamptz`, `Tabelas_da_aparencia` passed; `has-pending-model-changes` clean | `AparenciaAdminTests.cs:385-392`; `api.Tests/ArquiteturaTests.cs:20` (carried) | PASS |
| C60 | `dotnet build api` with CA1502 | `0 Erro(s)` | build output at `5f35a14`; `api/One.Api.csproj:9` `<WarningsAsErrors>...CA1502...` | PASS |
| C61 | whole Vitest and the web build; edits on item 5 only | Vitest 331/331 (40 files) at HEAD; `npm --prefix web run build` exit 0 | the fix edits only the body of C65's own test (`aparencia.spec.ts:150-156`, created by this feature in round 1); no pre-existing assertion was edited | PASS |
| C62 | crapper 9.99 exit 0; dryer clean | `npm --prefix web run coverage`, `crapper ... --threshold 9.99` exit 0; the C62 `dryer` command prints `No duplicate candidates found.` | `web/.metrics/crap.edn:1` | PASS |
| C63 | the 3 layout specs pass whole | Playwright against :5199 at HEAD: 89 expected, 0 unexpected, 0 flaky | per-test results in the JSON report; `aparencia.spec.ts:139,160,175,194,207` are the 5 round-1 additions | PASS |
| C64 | real e2e: admin customizes; login logo and colour; manifest icon; whole e2e suite | `E2E_URL=http://localhost:8085 npx playwright test` against the `5f35a14` image (round 2): 114 expected, 0 unexpected; `admin personaliza a aparência e o login muda` passed | `web/e2e/aparencia-real.spec.ts:83,86,95-96,104,111-112,118` (carried) | PASS (carried from 5f35a14: the fix changed only `web/e2e/aparencia.spec.ts`; `7590bc1` changed `Conferir`, which runs only on a model answer of `tipo` `resposta`, and the real e2e runs with no provider key, so every assistant answer is `sem_base` before `Conferir` - `anexos.spec.ts:127`) |
| C65 | 1 column at 390 and 2 at 1440; centres of the photo (or illustration), the title "Olá! Eu sou …" and the grid each within 1 px of the content centre | PW `sugestões centralizadas em 1 e 2 colunas` passed at HEAD | `web/e2e/aparencia.spec.ts:146` distinct `left` count `toBe(colunas)`; `:148` 2 rows; `:149` same left; `:156` `perto(c.x + c.width / 2, area.x + area.width / 2, ...)` over `foto` (`:152`, `section:has(h2) > img, section:has(h2) > svg`), the title text by `Range` (`:154`) and the grid (`botoes[0]` parent) | FAIL - photo, title and grid are now proven (faults A, B, C killed), but the illustration named in the claim is never rendered: the test runs only with `comAparencia` (`imagens.assistente: 4`), and a fault that moves only the illustration survived (fault E) |
| C66 | text block base within 48 px of the panel base; on a gradient element containing it | PW `textos do login na base sobre a faixa` passed | `aparencia.spec.ts:168` `toBeLessThanOrEqual(48)`; `:172` `faixas.some(... contains bloco)` `toBe(true)` | PASS |
| C67 | assistant photo right <= bubble left, vertical overlap, at 390 and 1440 | PW `foto do assistente à esquerda do balão` passed | `aparencia.spec.ts:184` count `> 0`; `:188` `foto.x + foto.width <= b.x + 1`; `:189` overlap `toBe(true)` | PASS |
| C68 | contact block top > ticket number bottom | PW `contato abaixo do número do chamado` passed | `aparencia.spec.ts:204` `expect(contato.y).toBeGreaterThan(numero.y + numero.height)` | PASS |
| C69 | icon 32x32 on the collapsed bar; 24x24 before the title at 390, icon and initials | PW `ícone de 32 e 24 px antes do título` passed | `aparencia.spec.ts:215-216` `perto(..., 32)`; `:227-228` `perto(..., 24)`; `:229` `m.x + m.width <= t.x + 1`; `:230` vertical centre `<= 2` | PASS |
| C70 | 4 image types: thumbnail src, Enviar, Remover; POST and DELETE per type; none without a version | VT `as 4 imagens com miniatura, enviar e remover` passed | `administracao/aparencia.test.tsx:193` `toHaveAttribute('src', \`/api/instituicoes/univag/imagens/${tipo}?v=7\`)`; `:196-197` exactly 1 Remover and 1 thumbnail; `:201` POST url `toEqual([...${tipo}])`; `:206` DELETE url `toEqual([...${tipo}])` | PASS |
| C71 | preview initials equal the login's, for 2 names | VT `iniciais da prévia iguais às do login` passed | `administracao/aparencia.test.tsx:228` `expect(daPrevia, nome).toBe(doLogin)`; `:229` `toBe(iniciais(nome))` | PASS |

### Edits to existing assertions (fix diff `5f35a14..3327feb`)

- `web/e2e/aparencia.spec.ts`: only the body of `sugestões centralizadas em 1 e 2 colunas` (C65) changed. This feature created that test in round 1. The edit replaces the section-centre assertion, which could never fail, with three element centres, as the 04/11 round-2 amendment to C65 asks. Nothing else changed.
- `checks.md`: C65 was sharpened (an approved amendment), and stale texts were fixed: 11 doors, 8 `Button` sizes, 13 in the text-limits row, and the C51 note moved out of the code span. No `Proof:` line changed.

## Coverage

Recomputed at `7590bc1` for the rows the fix touched. The rest carry from `5f35a14`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| centred items of the welcome block (4: photo or illustration, title, welcome text, grid) | `plan.md:138-140` (the design is the authority, not the code) | photo `aparencia.spec.ts:156` (fault A killed) · title text by `Range` `:154,156` (fault C killed) · grid `:156` (fault B killed at 1440; at 390 the grid is full width, so it is centred by construction) | welcome text `<p>` (not in C65; fault D survived) · illustration variant (named in C65, never rendered by the test; fault E survived) |
| suggestion grid widths (2) | `plan.md:139-140` | 390 one column `aparencia.spec.ts:146-149` · 1440 two columns `:146,148` | - |
| text limits and invalid e-mail (13) | C14 text after `8106a24` (12 limits + the e-mail) | carried from 5f35a14: `AparenciaAdminTests.cs:159,166,168,181-183` | - |
| `Button` sizes (8), other 44 px targets (4), lists (6), images (4), shell brand places (4), preview names (2), route statuses, image types, colour edges, themes, tokens, brand places (8), badge states (5), illustrations (6), contact fields (3), e-mail variants (3), one-way doors (11), startup places (2) | carried from 5f35a14 | as in round 2 (`celular.spec.ts:53,55,57,59,100,105`; `administracao/aparencia.test.tsx:183-229`; C69 is now at `aparencia.spec.ts:215,227`) | - |

## Swept existing

Carried from `5f35a14`, since the fix touched none of these files. All three are present:
- authorization: `api/Administracao/AdminRotas.cs:14-15,23`;
- versioned bucket: `api/Armazenamento.cs:22`;
- observability: `api/Agendador.cs:89`.

## Test policy rows

`checks.md` has no `Test policy` section (re-checked at `7590bc1`), so the repo's conventions decide the level: the arrangement claims are measured in Chromium against `vite preview`, and the HTTP claims cross the boundary. Carried from 5f35a14.

## Faults injected

Verified at `7590bc1`. Each fault ran in a scratch worktree (`git worktree add --detach <scratchpad>/wt HEAD`) with a junction to `web/node_modules`. Each was built with `npm --prefix web run build`, served by `vite preview` on :5198, and checked with `npx playwright test e2e/aparencia.spec.ts -g "sugestões centralizadas em 1 e 2 colunas"`.

Faults D and E shared one build. The test passed, so both survived. A scratch probe spec, deleted afterwards, measured where each element went. At HEAD the same probe measured the paragraph at 848.0 and the illustration at 848, against a `main` centre of 848.

The real tree's `git status --porcelain` was the same before and after: only the 3 untracked dirs.

| Mutation | Location | Killed |
| --- | --- | --- |
| A: welcome `<section>` loses `items-center` (the round-2 survivor) | `web/src/assistente/Assistente.tsx:208` | yes - C65 `aparencia.spec.ts:156` "390 px: centro da foto, Expected <= 1, Received 147" |
| B: the grid alone gets `self-start` | `web/src/assistente/Assistente.tsx:212` | yes - C65 `:156` "1440 px: centro da grade, Received 96" (390 px passed, because there the grid is full width) |
| C: the title alone gets `self-start` | `web/src/assistente/Assistente.tsx:210` | yes - C65 `:156` "390 px: centro da título, Received 85.02" |
| D: the welcome paragraph alone gets `self-start` (probe: centre 620.6 vs 848) | `web/src/assistente/Assistente.tsx:211` | no - survived; C65 passed, because C65 does not name the welcome text |
| E: the illustration `Conversa` alone gets `self-start` (probe with no assistant image: centre 528 vs 848) | `web/src/assistente/Assistente.tsx:209` | no - survived; C65 passed, because the test always has a photo (`web/e2e/simulada.ts:33` `assistente: 4`) |

Faults on surfaces this fix did not touch carry from earlier rounds, all killed:
- from round 2 (`5f35a14`): C2, C7, the C65 grid columns, C66 (two faults), C67, C68, C69, C70, C71;
- from round 1: C1, C3, C8, C13, C24, C31, C37, C38, C45, C47, C52, C54.

## Findings

1. **C65 does not cover the whole centred set (FAIL).** The design centres the welcome text, and C65 does not mention it, so fault D survived. Suggested wording: add "o texto de boas-vindas" to the measured elements, measured by `Range` like the title (`aparencia.spec.ts:154`).
2. **The illustration half of C65 has no proof (FAIL).** C65 says "da foto (ou ilustração)", but the test runs only with `comAparencia`, which has an assistant image, so fault E survived. Fix: run the same measurement once more with `imagens.assistente: null`. The selector at `:152` already accepts an `svg`.
3. This is round 3, so under the three-round bound it goes to the user rather than back to a builder. Both gaps are small: one more element and one more fixture in the same test.
4. `checks.md` C51 (lines 255-256): the amendment note is now outside the code span. The span still holds a raw line break where `\r\n` was meant, but the claim still reads correctly once the line break is ignored. Cosmetic.
5. The other stale texts from round 2 are fixed: `checks.md:6` says 11 doors, the 44 px row says 8 sizes, and the text-limits row says 13.
6. `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo` ran alone, as the brief asks: 1 passed in 3 s. It is outside this feature.

## Gate

- `api.Tests` (Release `One.Api.Tests.exe`, built at HEAD `7590bc1`): 536 passed, 0 failed (535 in one process with the push test excluded by `-method-`, plus the push test alone).
- `dotnet build api`: `0 Erro(s)` at HEAD. `has-pending-model-changes`: carried from 5f35a14, since no entity or migration changed after it.
- Vitest: 331 passed, 0 failed (40 files). `npm --prefix web run build`: exit 0.
- Playwright layout (arranjo, celular, aparencia) against `vite preview` on :5199: 89 passed, 0 failed.
- Playwright real e2e: carried from 5f35a14 (114 passed).
- crapper 9.99 and dryer: carried from 5f35a14, since the fix changed no file under `web/src`.
- Cleanup:
  - the preview servers on :5198 and :5199 were stopped;
  - the `node_modules` junction was deleted before the worktree was removed, and `git worktree list` shows only `D:/one-system`;
  - the real-tree porcelain is unchanged except for this report.
