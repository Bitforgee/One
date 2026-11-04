# Aparência da instituição e revisão visual - verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 5b355d9..5f35a14 (proofs run at HEAD `5f35a14`; HEAD moved to `224d84b` during the run, a `protecao-injecao` checks edit with no code. `5dc1977`, `301eb16`, `beb4de3`, `161411c`, `5b53ce7`, `a2906dd` belong to other features and are not judged)
**Round**: 2 - scoped (fix diff `e2e3bcb..5f35a14`, plus every round-1 verdict that was not PASS; all proofs re-run in full at HEAD; the screen enumeration was redone for every screen, as the orchestrator asked)
**Verifier**: fresh sub-agent with no inherited context (author != verifier), dispatched by the orchestrator

Why FAIL, in one line:
1. Surviving mutant on C65. Removing `items-center` from the welcome `<section>` (`web/src/assistente/Assistente.tsx:208`) moves the 64 px photo and the grid of suggestions to the left edge, and `sugestões centralizadas em 1 e 2 colunas` still passes. The test measures the centre of the heading's parent (`web/e2e/aparencia.spec.ts:151-152`). That parent is the full-width `<section>`, so its centre equals the centre of `main` whatever happens to its contents. With the fault at 1440 px: the section is x=464 w=768 (centre 848, the same as `main`), the photo is at x=464 and the grid is at x=464 w=576 (centre 752).

Round 1 (`179d088`, FAIL) found three things: the C7 badge assertion was conditional and a fault survived it; `## Screens` arrangements had no check (the suggestions grid and centring, the login texts at the base, the photo to the left of the bubble, the contact below the ticket number, and the 32/24 px shell icon); and C2 measured 4 of the 8 `Button` sizes. The amendments in `e2e3bcb` and the fixes in `94b373b` close all of these except the centring in C65 (above). C2 and C7 now pass, and their faults are killed.

## Binding sources

Verified at `5f35a14`. Every `## Screens` bullet was re-enumerated against the checks. The non-screen sources carry from round 1 (`179d088`): the fix touched none of them.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| plan `## Landing` doors 1-11 | yes - `plan.md:105-117` (carried from 179d088) | none | - |
| `## Screens` Login, Primeiro acesso, Criar senha >= 1024 | yes - `plan.md:126-130` | none | - (logo/initials C35 + `arranjo.spec.ts` `linha da marca na entrada`; image cover C38; texts at the base on the dark band C66 `aparencia.spec.ts:164,168`; illustration without an image C50, with the texts at the base below it by `arranjo.spec.ts:1546`) |
| `## Screens` Login < 1024 | yes - `plan.md:131-132` | none | - (C38 `aparencia.spec.ts:111-117`, C50) |
| `## Screens` Raiz `/` | yes - `plan.md:133-134` | none | - (C40) |
| `## Screens` Casca autenticada | yes - `plan.md:135-137` | none | - (logo on the open bar C35; icon 32 px collapsed C69 `aparencia.spec.ts:211-212`; 24 px before the title on mobile, icon and initials, C69 `:223-226`; links C36) |
| `## Screens` Assistente sem conversa | yes - `plan.md:138-140` | none | "centralizados": no proof can fail on it. C65's centring assertion (`aparencia.spec.ts:152`) measures the full-width `<section>`, not the photo, the text or the grid inside it (surviving mutant, see Faults). Covered: the 1/2-column grid (C65 `:146-149`), the 64 px round photo, the text and the order of questions (C41) |
| `## Screens` Assistente com conversa | yes - `plan.md:141` | none | - (C67 `aparencia.spec.ts:184-185`, C44) |
| `## Screens` Transferido | yes - `plan.md:142-143` | none | - (C68 `aparencia.spec.ts:200`, C45) |
| `## Screens` Menu | yes - `plan.md:144-145` | none | - (C46) |
| `## Screens` Listas | yes - `plan.md:146-151` | none | - (C4, C48; cards with the badge on the right C7, now unconditional `celular.spec.ts:105`) |
| `## Screens` Detalhe do chamado < 1024 | yes - `plan.md:152-153` | none | - (C8, C9) |
| `## Screens` Indicadores | yes - `plan.md:154-155` | none | - (C5, C49) |
| `## Screens` Cadastros < 768 | yes - `plan.md:156` | none | - (C6) |
| `## Screens` Aparência | yes - `plan.md:157-159` | none | - (C28; each of the 4 images with thumbnail, "Enviar imagem" and "Remover" C70 `administracao/aparencia.test.tsx:193-206`; preview initials equal the login's C71 `:228-229`) |
| STATE.md AD-008, AD-021, AD-027, AD-029, AD-030 | yes (carried from 179d088) | none | - |
| design audit 04/11, user request 04/11 | only through `plan.md:10-29` (carried from 179d088) | none | - |

Blanket exemptions: none. The plan puts only colour, spacing and font weight on the tokens (`plan.md:124`).

## Checks

Proofs were run at `5f35a14` as follows:
- API: one xUnit v3 process of the Release `One.Api.Tests.exe` over the whole assembly, excluding `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo`, which then ran alone.
- Vitest: `npx vitest run` over the whole suite.
- Layout: one Playwright run of the 3 layout specs against `vite preview` of the HEAD build on :5199.
- Real e2e: the whole suite against a HEAD image on :8085.

Every test named below appears individually as passed in those reports (the xUnit XML and the Vitest and Playwright JSON). For files the fix did not touch, the citations carry from `179d088`. Citations in `celular.spec.ts` and `administracao/aparencia.test.tsx` are refreshed.

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
| C57 | whole API suite; existing edits on items 1-4 only | 534 passed (see Gate) | `api.Tests/RetratoTests.cs:51` and the round-1 audit; the fix changed no file under `api/` or `api.Tests/` (`git diff e2e3bcb..94b373b -- api api.Tests` empty) | PASS |
| C58 | `rotas.txt` +6, none removed | xUnit `RetratoTests.Tabela_de_rotas_igual_a_da_base` passed | `RetratoTests.cs:51` `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva)` | PASS |
| C59 | door 1 columns, unique index, no pending changes | xUnit `Toda_entidade_tem_instituicao_e_filtro`, `Tabelas_snake_case_e_datas_timestamptz`, `Tabelas_da_aparencia` passed; `has-pending-model-changes` clean | `AparenciaAdminTests.cs:385-392`; `api.Tests/ArquiteturaTests.cs:20` (carried) | PASS |
| C60 | `dotnet build api` with CA1502 | `0 Erro(s)` | build output at `5f35a14`; `api/One.Api.csproj:9` `<WarningsAsErrors>...CA1502...` | PASS |
| C61 | whole Vitest and the web build; edits on item 5 only | Vitest 331/331 (40 files); build exit 0 | the fix edits only tests this feature created (`celular.spec.ts` C2/C7 bodies, per the approved amendment) and adds tests (`aparencia.spec.ts:134-229`, `administracao/aparencia.test.tsx:181-232`). No pre-existing assertion was edited | PASS |
| C62 | crapper 9.99 exit 0; dryer clean | `npm --prefix web run coverage`, `crapper ... --threshold 9.99` exit 0; the C62 `dryer` command prints `No duplicate candidates found.` | `web/.metrics/crap.edn:1` | PASS |
| C63 | the 3 layout specs pass whole | Playwright against :5199: 89 expected, 0 unexpected | per-test results in the JSON report; `aparencia.spec.ts:139,156,171,190,203` are the 5 new ones | PASS |
| C64 | real e2e: admin customizes; login logo and colour; manifest icon; whole e2e suite | `E2E_URL=http://localhost:8085 npx playwright test` against a HEAD image: 114 expected, 0 unexpected; `admin personaliza a aparência e o login muda` passed | `web/e2e/aparencia-real.spec.ts:83,86,95-96,104,111-112,118` (carried) | PASS |
| C65 | 1 column at 390 and 2 at 1440; welcome block centred within 1 px | PW `sugestões centralizadas em 1 e 2 colunas` passed | `aparencia.spec.ts:146` distinct `left` count `toBe(colunas)`; `:148` 2 rows; `:149` same left; `:152` `perto(bloco.x + bloco.width / 2, area.x + area.width / 2, ...)` with `bloco` = the heading's parent, the full-width `<section>` (`:151`) | FAIL - the centring assertion cannot fail while the section stays full width; the fault that left-aligns the photo and the grid survived (see Faults) |
| C66 | text block base within 48 px of the panel base; on a gradient element containing it | PW `textos do login na base sobre a faixa` passed | `aparencia.spec.ts:164` `toBeLessThanOrEqual(48)`; `:168` `faixas.some(... contains bloco)` `toBe(true)` | PASS |
| C67 | assistant photo right <= bubble left, vertical overlap, at 390 and 1440 | PW `foto do assistente à esquerda do balão` passed | `aparencia.spec.ts:180` count `> 0`; `:184` `foto.x + foto.width <= b.x + 1`; `:185` overlap `toBe(true)` | PASS |
| C68 | contact block top > ticket number bottom | PW `contato abaixo do número do chamado` passed | `aparencia.spec.ts:200` `expect(contato.y).toBeGreaterThan(numero.y + numero.height)` | PASS |
| C69 | icon 32x32 on the collapsed bar; 24x24 before the title at 390, icon and initials | PW `ícone de 32 e 24 px antes do título` passed | `aparencia.spec.ts:211-212` `perto(..., 32)`; `:223-224` `perto(..., 24)`; `:225` `m.x + m.width <= t.x + 1`; `:226` vertical centre `<= 2` | PASS |
| C70 | 4 image types: thumbnail src, Enviar, Remover; POST and DELETE per type; none without a version | VT `as 4 imagens com miniatura, enviar e remover` passed | `administracao/aparencia.test.tsx:193` `toHaveAttribute('src', \`/api/instituicoes/univag/imagens/${tipo}?v=7\`)`; `:196-197` exactly 1 Remover and 1 thumbnail; `:201` POST url `toEqual([...${tipo}])`; `:206` DELETE url `toEqual([...${tipo}])` | PASS |
| C71 | preview initials equal the login's, for 2 names | VT `iniciais da prévia iguais às do login` passed | `administracao/aparencia.test.tsx:228` `expect(daPrevia, nome).toBe(doLogin)`; `:229` `toBe(iniciais(nome))` | PASS |

### Edits to existing assertions (fix diff `e2e3bcb..94b373b`)

- `web/e2e/celular.spec.ts`: only the bodies of `alvos de toque de 44 px abaixo de 768` (C2) and `listas viram cartões abaixo de 768` (C7) changed. Both are this feature's own tests, created in `5b355d9..179d088`. Both edits strengthen them, as the 04/11 round-1 amendment asks: 4 to 8 sizes, and the `if (await selo.count())` was removed.
- `web/e2e/aparencia.spec.ts` and `web/src/administracao/aparencia.test.tsx`: tests added only. The `import` lines changed, and no assertion was edited.
- No pre-existing (`<base>`) assertion was touched. The round-1 audit of `5b355d9..179d088` carries from `179d088`: every edit there is on the closed list or its 04/11 extensions.

## Coverage

Recomputed at `5f35a14` for the rows the fix touched. The rest carry from `179d088`, where the members were taken from the plan, `ui/button.tsx` and the code.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| route statuses: public GET (2), image (3), manifest (2), admin GET (3), PUT (4), POST (8), DELETE (4) | plan `## Surface` (carried from 179d088) | as in round 1: `AparenciaPublicaTests.cs:28,40,52,68-75`, `ManifestoTests.cs:24,64-65`, `AparenciaAdminTests.cs:43,71,122,166,181,196,225,246,273,284,285,298,312,319,362` | - |
| `Button` sizes, AC 2 "todo `Button`" (8) | `web/src/ui/button.tsx:23-30` | default, sm, icon, icon-sm, icon-xs on real screens; lg, xs and icon-lg (unused by any `Button`, grep of `size=` over `web/src`) on test buttons: all at `celular.spec.ts:53` | - |
| other 44 px targets (4) | AC 2 | Input `celular.spec.ts:55` · NativeSelect `:57` · Tabela actions `:59` · ticket "Ações" `:133` | - |
| lists with a state badge (2) and lists (6) | plan `## Screens` Listas | badge Fila, Minhas `celular.spec.ts:105-112`; 6 lists `:100`, C10 `:167`, C48 `tabela.test.tsx:9-16` | - |
| Aparência images (4) | door 2, `## Screens` Aparência | logo, icone, login, assistente: table at `administracao/aparencia.test.tsx:183`, asserted `:193-206` | - |
| shell brand places at 390/1440 (4) | `## Screens` Casca autenticada | open-bar logo C35 · collapsed icon 32 px `aparencia.spec.ts:211` · mobile icon 24 px `:223` · mobile initials 24 px `:223` | - |
| suggestion grid widths (2) | `## Screens` Assistente sem conversa | 390 one column `aparencia.spec.ts:146-149` · 1440 two columns `:146,148` | - |
| centred contents of the welcome block (3: photo, text, grid) | `## Screens` Assistente sem conversa "centralizados" | only the full-width section is measured (`aparencia.spec.ts:152`) | photo, grid (the fault moved both, and the test passed); text only by its full-width parent |
| preview initials names (2) | C71 | `administracao/aparencia.test.tsx:213` table, `:228-229` | - |
| image types, text limits, colour edges, themes, tokens, brand places (8), badge states (5), illustrations (6), contact fields (3), e-mail variants (3) | carried from 179d088 | as round 1 | - |
| one-way doors (11) | plan `## Landing` | 1 C12, C59 · 2 C15, C59, C70 · 3 C12, C22 · 4 C31 · 5 C54, C56 · 6 C51, C52 · 7 C23, C28, C71 · 8 C13, C27, C33 · 9 C47 · 10 C14, C18 · 11 C21 | - |
| startup: appearance applied (2 places) | read directly (carried from 179d088) | `web/src/App.tsx:48` `<AplicaAparencia />`; `acesso/Acesso.tsx:119`, `Autenticado.tsx:263` | - |

## Swept existing

Carried from `179d088`. The fix touched none of these files.
- authorization: `api/Administracao/AdminRotas.cs:14-15,23`. Present.
- data lifecycle: `api/Armazenamento.cs:22`, a versioned bucket. Present.
- observability: `api/Agendador.cs:89`. Present.

## Test policy rows

`checks.md` carries no `Test policy` section, so the repo's conventions decide the level. The arrangement claims are measured in Chromium and the HTTP claims cross the boundary.

## Faults injected

Each fault was made in a scratch `git worktree add --detach <scratchpad>/wtf HEAD`, with a junction to `web/node_modules`. The 6 layout faults were batched into one build served on :5198, one fault per targeted test, and each kill is attributed by its own assertion message. A second build swapped in the C65 grid fault and the C66 gradient fault. The real tree's `git status --porcelain` was identical before and after (the 3 untracked dirs only).

| Mutation | Location | Killed |
| --- | --- | --- |
| round-1 survivor: state cell loses `data-celula="selo"` | `web/src/chamados/Chamados.tsx:59` | yes - C7 `celular.spec.ts:105` "Fila: 1 selo por cartão, Expected 1, Received 0" |
| C2: `lg` loses `max-md:h-11` | `web/src/ui/button.tsx:26` | yes - C2 `celular.spec.ts:53` "Button lg, Expected >= 44, Received 40" |
| C65: welcome `<section>` loses `items-center` (photo and pill grid go to the left; measured: grid centre 752 vs area centre 848) | `web/src/assistente/Assistente.tsx:208` | no - survived; `sugestões centralizadas em 1 e 2 colunas` passed, because `:152` measures the full-width section |
| C65: grid `grid-cols-1` -> `grid-cols-2` (2 columns on mobile) | `web/src/assistente/Assistente.tsx:212` | yes - C65 `aparencia.spec.ts:146` "390 px: colunas, Expected 1, Received 2" |
| C66: text block loses `mt-auto` (texts go to the top of the panel) | `web/src/acesso/Acesso.tsx:84` | yes - C66 `aparencia.spec.ts:164` "Expected <= 48, Received 620" |
| C66: gradient band removed | `web/src/acesso/Acesso.tsx:110` | yes - C66 `aparencia.spec.ts:168` "faixa com gradiente cobre o bloco, Expected true, Received false" |
| C67: photo wrapper `flex-row-reverse` (photo on the right) | `web/src/Balao.tsx:51` | yes - C67 `aparencia.spec.ts:184` "390 px: foto à esquerda, Received 338.19" |
| C68: contact block moved above the "Protocolo" alert | `web/src/assistente/Assistente.tsx:229-234` | yes - C68 `aparencia.spec.ts:200` "Expected > 860, Received 714" |
| C69: mobile top `Sigla` `size-6` -> `size-8` | `web/src/Autenticado.tsx:233` | yes - C69 `aparencia.spec.ts:223` "com ícone: largura, Received 8" |
| C70: DELETE always to `/imagens/logo` | `web/src/administracao/Aparencia.tsx:212` | yes - C70 `administracao/aparencia.test.tsx:206` "icone: expected ['/api/admin/aparencia/imagens/logo'] to deeply equal [...]" |
| C71: preview back to `nome.slice(0, 2)` | `web/src/administracao/PreviaAparencia.tsx:23` | yes - C71 `administracao/aparencia.test.tsx:228` "expected 'CE' to be 'CG'" |

Round-1 faults on surfaces the fix did not touch (C1, C3, C8, C24, C37, C38, C45, C47, C13, C31, C52, C54: all killed) carry from `179d088`.

## Findings

1. **C65 centring is vacuous (surviving mutant, FAIL).** `aparencia.spec.ts:151` takes `heading.locator('xpath=..')`, which is the `<section>` that fills the content column, so its centre always equals the centre of `main`. The test should measure what the design centres: the photo, the heading text box (or a `w-fit` wrapper) and the suggestions grid. It is also a precision gap in the C65 text: "o centro horizontal do bloco de boas-vindas" names a box that is full width by construction. Suggested wording: "the centres of the photo, of `h2` and of the grid of questions are within 1 px of the centre of the content area".
2. Stale text in `checks.md`, outside any proof:
   - line 6 says "9 one-way doors" (the plan has 11);
   - the Coverage row `componentes com 44 px` still says "`Button` (4 tamanhos)" (C2 now has 8);
   - the row `limites de texto e e-mail inválido (14)` says "os 13", while C14 says 12 limits plus the e-mail (13 members).
3. The C51 text in `checks.md:255-256` is broken. The `\r\n` inside backticks was a literal line break even before the amendment, and the amendment note was inserted in the middle of that code span. The claim still reads correctly once the line break is ignored.
4. Two Vitest tests outside this feature (`assistente.test.tsx` `limite destaca Falar com atendente` and `conversa.test.tsx` `o limite conta só as mensagens do aluno...`) timed out at 5 s in a first full run that shared the CPU with the API suite. Both files pass alone (33/33), and the clean full rerun is 331/331. The timeouts come from load, not from this diff.
5. `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo` was run alone, as the brief asks (passed in 3 s). It is known to hang under full parallelism and is outside this feature.

## Gate

- `api.Tests` (xUnit v3 Release executable, HEAD `5f35a14`): 534 passed, 0 failed. 533 ran in one process with `-method-` excluding the push test, and the push test ran alone.
- `dotnet build api`: `0 Erro(s)`; `dotnet ef migrations has-pending-model-changes --project api`: "No changes have been made to the model since the last migration."
- Vitest: 331 passed, 0 failed (40 files); `npm --prefix web run build` exit 0
- Playwright layout (arranjo, celular, aparencia) against `vite preview` :5199: 89 passed, 0 failed
- Playwright e2e, whole suite, against the HEAD image on :8085 (own DB `one_verif2_e2e`, own bucket `one-verif2-e2e`, institution `e2e` with admin `admin-verif2@e2e.one`): 114 passed, 0 failed
- crapper 9.99: exit 0; dryer: `No duplicate candidates found.`
- Cleanup:
  - removed: container `one-verif-aparencia2` and its image, DB `one_verif2_e2e`, bucket `one-verif2-e2e`, the preview servers on :5198 and :5199, both scratch worktrees (`git worktree list` shows only `D:/one-system`);
  - nothing was left outside the repo; the round-1 folder `D:/one-verif-wt` no longer exists;
  - Mailpit keeps the e2e messages for `admin-verif2@e2e.one`;
  - the real-tree porcelain is unchanged except for this report.
