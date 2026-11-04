# Aparência da instituição e revisão visual - verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 5b355d9..179d088 (proofs run at HEAD `161411c`; `5dc1977..161411c` is `protecao-injecao` and a ROADMAP doc, not judged here)
**Round**: 1 - full
**Verifier**: fresh sub-agent with no inherited context (author != verifier), dispatched by the orchestrator

Why FAIL, in one line each:
1. Surviving mutant on C7: removing `data-celula="selo"` from the state cell moves the badge under the card's first line, and `listas viram cartões abaixo de 768` still passes, because its badge assertions sit inside `if (await selo.count())` (`web/e2e/celular.spec.ts:95`).
2. `## Screens` decides arrangements no check reaches: the suggested questions in 1 column on mobile and 2 on desktop, centered (Assistente sem conversa); the login texts at the base of the image panel; the assistant photo to the left of the bubble; "Contato do atendimento" below the ticket number; the 32 px and 24 px icon sizes and "icon before the title" in the shell.
3. AC 2 says "todo `Button`", but C2 measures 4 of the 8 sizes in `web/src/ui/button.tsx:22-31`. `lg`, `icon-xs` and `icon-sm` are used on screens (`Autenticado.tsx`, `assistente/Anexos.tsx`), and `icon-lg` exists. None of them has a 44 px proof.

All 64 proofs that ran are green, and every edit to an existing assertion is on the closed list.

## Binding sources

The plan marks these as binding: its own `## Screens` and `## Landing` (doors 1-11), plus the sources in `## Sources`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| plan `## Landing` doors 1-11 | yes - `plan.md:105-117` | none. Door 10 (JSON-path error names) is proven by C14 (`Erros(json, "login.titulo")`, `AparenciaAdminTests.cs:167`) and C18 (`arquivo`, `:274`). Door 11 (`removida_em`) is proven by C21 | - |
| plan `## Screens` - Login, Primeiro acesso, Criar senha >= 1024 | yes - `plan.md:126-130`; screenshots `com/sem-light-1440-Login` | none | the title, phrase and items sit "sobre uma faixa escura na base" of the image panel. C38 only asserts that they are inside the panel box (`web/e2e/aparencia.spec.ts:105-106`). Nothing asserts that they are at the base or on the dark band (`Acesso.tsx:84` `mt-auto`, `:110` gradient) |
| plan `## Screens` - Login < 1024 | yes - `plan.md:131-132`; screenshots `*-390-Login` | none | - (C38 `aparencia.spec.ts:111-117`, C50 `:129-130`) |
| plan `## Screens` - Raiz `/` | yes - `plan.md:133-134` | none | - (C40 `aparencia.test.tsx:209`; `arranjo.spec.ts` `telas de acesso centralizadas /`) |
| plan `## Screens` - Casca autenticada | yes - `plan.md:135-137`; screenshots `*-AssistenteVazio` | none | the 32 px sidebar icon, the 24 px mobile-top icon, and the mobile icon sitting "antes do título da tela". C35/C36 assert presence and `src` only (`aparencia.test.tsx:105,125-126`) |
| plan `## Screens` - Assistente sem conversa | yes - `plan.md:138-140`; screenshots `com-light-1440-AssistenteVazio`, `sem-light-390-AssistenteVazio` | none | the welcome block is centered; the questions are pills in a grid of 1 column on mobile and 2 on desktop. C41 asserts text, order and the 64 px round photo (`boasvindas.test.tsx:27-31`). A search of `web/e2e` for the suggested questions finds only the fixture (`simulada.ts:32`), so no proof measures the arrangement |
| plan `## Screens` - Assistente com conversa | yes - `plan.md:141` | none | the photo is "à esquerda" of the bubble. C44 asserts the `img`, its `size-6` and its `alt` (`boasvindas.test.tsx:75-83`), not its side |
| plan `## Screens` - Transferido | yes - `plan.md:142-143` | none | the "Contato do atendimento" block sits "abaixo do número do chamado". C45 asserts the block's contents (`boasvindas.test.tsx:114-118`), not its position |
| plan `## Screens` - Menu (barra e gaveta) | yes - `plan.md:144-145` | none | - (C46 `aparencia.test.tsx:222,237`) |
| plan `## Screens` - Listas | yes - `plan.md:146-151`; screenshot `com-light-390-Fila` | none | the badge to the right on the first line: the C7 assertion exists, but it is conditional and a real regression survives it (see Faults) |
| plan `## Screens` - Detalhe do chamado < 1024 | yes - `plan.md:152-153` | none | - (C8) |
| plan `## Screens` - Indicadores | yes - `plan.md:154-155` | none | - (C5, C49) |
| plan `## Screens` - Cadastros < 768 | yes - `plan.md:156` | none | - (C6) |
| plan `## Screens` - Aparência | yes - `plan.md:157-159`; screenshots `com-light-1440-Aparência`, `sem-dark-390-Aparência` | none | the controls for each image (thumbnail, "Enviar imagem", "Remover") are asserted only for Logo (`administracao/aparencia.test.tsx:124,161,163`); the other 3 images have no proof. Door 7 calls the preview "uma réplica pequena do login", but its initials read "CE" (`PreviaAparencia.tsx:21` `nome.slice(0, 2)`) while the login reads "CG" (`aparencia.tsx:104-107` `iniciais`) |
| STATE.md AD-008, AD-021, AD-027, AD-029, AD-030 | yes - `.specs/STATE.md:14,27,33,35,36` | none. One deploy for all institutions (door 5), MinIO behind the API (door 4), default blue kept when there is no colour (C33), the shell header and the `login-02` grid kept | - |
| design audit 04/11 (15 screens, 390 and 1440 px) | no repo artifact. Its findings exist only as `plan.md:10-20`; compared against that text | none | - (each finding has a check: alert C1, empty states C48, 44 px C2, ticket actions C8, badge colour C3) |
| user request 04/11 | only through `plan.md:22-29` and the confirmed Assumptions | none | - |

Blanket exemptions: none. `checks.md` does not exempt visual fidelity, and the plan puts only colour, spacing and font weight on the tokens (`plan.md:124`).

## Checks

API proofs were run as one xUnit v3 process over the whole `api.Tests` assembly at HEAD (see Gate), in `-c Release`. Smart App Control blocked the freshly built Debug `One.Api.Tests.dll` with `0x800711C7`; the Release build loaded. Web unit tests: one `npx vitest run` over the whole suite. Layout tests: one Playwright run of the 3 layout specs against `vite preview` of the HEAD build on :5199. Real e2e: the whole suite against a HEAD image on :8085. Every named test below appears individually as passed in those reports.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | alert text in 1 line, full-width column | PW `alerta sem ícone em uma linha` passed | `web/e2e/celular.spec.ts:30` `expect(medidas.altura).toBeLessThanOrEqual(medidas.linha * 1.5)`; `:31` `\|coluna - conteudo\| <= 1` | PASS |
| C2 | 44 px for default, sm, icon and xs Buttons, Input, NativeSelect and Tabela actions; 36 at 1024 | PW `alvos de toque de 44 px abaixo de 768` passed | `celular.spec.ts:39,41,43,44,46,48,50` `toBeGreaterThanOrEqual(44)`; `:53` `toBe(36)` | PASS (as written; see Coverage for the sizes AC 2 claims and C2 leaves out) |
| C3 | badge class per group, base text | VT `selo de estado com cor por grupo` passed | `web/src/tabela.test.tsx:35` `expect(screen.getByText(texto)).toHaveClass(classe)` over the 5 states at `:26-30` | PASS |
| C4 | 3 skeletons, no Spinner | VT `carregando mostra 3 esqueletos` passed | `tabela.test.tsx:43` `toHaveLength(3)`; `:44` `queryByRole('status')` absent | PASS |
| C5 | no ellipsis or overflow; a 40-character label in <= 2 lines | PW `Indicadores sem texto cortado` passed | `celular.spec.ts:66` `expect(cortados).toEqual([])`; `:71` `tspan` count `<= 2` | PASS |
| C6 | selector and "Novo" share a top | PW `Cadastros seletor e Novo na mesma linha` passed | `celular.spec.ts:80` `\|seletor.y - novo.y\| <= 1` | PASS |
| C7 | 6 lists become cards; badge on the right with the same top; main column below; tables at 1024 | PW `listas viram cartões abaixo de 768` passed | `celular.spec.ts:91` `table:visible` count 0; `:98-99` badge top and right, inside `if (await selo.count())` at `:95`; `:107` table at 1024 | FAIL - the assertion is conditional on the same `data-celula` attribute that drives the layout (`index.css:153-154`); the mutant survived |
| C8 | fixed "Ações" >= 44 px at 390 and 1023; bottom Sheet with the same buttons; none at 1024 | PW `Ações do chamado no rodapé abaixo de 1024` passed | `celular.spec.ts:115` count 0 at 1024; `:123` `{posicao:'fixed', fundo:'0px'}`; `:124` `>= 44`; `:129` Sheet bottom 800; `:130` `toEqual(nomesNoCartao)` | PASS |
| C9 | action in the Sheet closes it and updates the badge | PW `ação no Sheet fecha e atualiza` passed | `celular.spec.ts:149` dialog `toBeHidden()`; `:150` `toHaveText('Em atendimento')` | PASS |
| C10 | no horizontal scroll at 360 px | PW `sem rolagem horizontal a 360` passed | `celular.spec.ts:158` `scrollWidth <= 360` over 6 lists and the detail | PASS |
| C11 | GET admin returns 200 with exactly 6 null keys, then the saved values | xUnit `AparenciaAdminTests.Get_sem_aparencia_devolve_nulos` passed | `api.Tests/AparenciaAdminTests.cs:43` `HttpStatusCode.OK`; `:45` exact keys; `:46-52` nulls; `:56-60` values after the PUT | PASS |
| C12 | PUT saves; an absent or null field returns to default; institution B untouched | xUnit `Put_grava_e_campo_ausente_volta_ao_padrao` passed | `AparenciaAdminTests.cs:76` saved row tuple; `:92-94` `Assert.Null(linha2.Cor)`, `LoginTitulo` null, others kept; `:97-98` B null | PASS |
| C13 | invalid colour returns 400 with `errors.cor` and saves nothing, 4 inputs; `#767676` and `#224fa7` accepted | xUnit `Cor_invalida_ou_sem_contraste_400` (6 cases) passed | `AparenciaAdminTests.cs:102-107` InlineData; `:122` `BadRequest`; `:123` `Assert.Equal([RecusaDaCor], Erros(..., "cor"))`; `:125` `Assert.Null(linha.Cor)`; `:118-119` accepted | PASS |
| C14 | 400 on the right field, limit in the text, nothing saved; 12 limits on both sides of the edge; invalid e-mail | xUnit `Limites_dos_textos_400` (12 cases) and `Email_de_contato_invalido_400` passed | `AparenciaAdminTests.cs:130-132` 12 rows; `:159` accepted at max; `:166` `BadRequest` at max+1; `:168` `m.Contains(max.ToString())`; `:169` not saved; e-mail `:181-183` | PASS (precision: see Findings) |
| C15 | upload: 200 `{logo,1}`, key prefix, same bytes, row with sha256; re-upload gives v2, one row, new key, old object kept | xUnit `Enviar_imagem_grava_e_reenviar_sobe_a_versao` passed | `AparenciaAdminTests.cs:198-203`; `:208` versao 2; `:209-216` single row, new key, both objects present | PASS |
| C16 | 415 for GIF logo, PDF login, JPEG icone, nothing saved; JPEG accepted for 3 types | xUnit `Tipo_de_imagem_recusado_415` passed | `AparenciaAdminTests.cs:225-227` `UnsupportedMediaType`; `:229-230` no row, no object; `:232-233` 3 accepted | PASS |
| C17 | 413 with the limit at 1 MiB+1 and 3 MiB+1, nothing saved; exact limits accepted | xUnit `Imagem_acima_do_limite_413` passed | `AparenciaAdminTests.cs:246` `RequestEntityTooLarge`; `:247` `"{limite/Mb} MB"`; `:249-250` nothing saved; `:253` OK at the limit | PASS |
| C18 | icon 400 for 512x511 and 511x511; 512 and 1024 accepted | xUnit `Icone_nao_quadrado_ou_pequeno_400` (4 cases) passed | `AparenciaAdminTests.cs:257-260`; `:273-276` 400, message on `arquivo`, nothing saved; `:270` OK | PASS |
| C19 | unknown type returns 404 on POST and DELETE | xUnit `Tipo_desconhecido_404` passed | `AparenciaAdminTests.cs:284-285` `HttpStatusCode.NotFound` | PASS |
| C20 | MinIO down: 503, row unchanged | xUnit `Minio_fora_503_sem_mudar_a_imagem` passed | `AparenciaAdminTests.cs:298` `ServiceUnavailable`; `:300` same `(Versao, Chave, Hash)` | PASS |
| C21 | DELETE gives 204 and marks the row removed with the object kept; both reads return null; public 404; 2nd DELETE 404; re-upload never reuses a version | xUnit `Remover_imagem_204_e_objeto_fica` and `Reenviar_depois_de_remover_nao_repete_versao` passed | `AparenciaAdminTests.cs:312` `NoContent`; `:314` `RemovidaEm` set; `:315` key in bucket; `:316-318` nulls and 404; `:319` 404; `:321` versao 2; `:335` versao 3, `:331` `?v=2` 404 | PASS |
| C22 | 12 requests: 403 for aluno and atendente, 401 anonymous; isolation between A and B | xUnit `Rotas_de_admin_403_e_401` passed | `AparenciaAdminTests.cs:362` `Unauthorized` or `Forbidden` per caller over 3x4 requests; `:372-376` B sees null and gets 404 on DELETE | PASS |
| C23 | "Aparência" link with Palette after Cadastros, admin only, `/{slug}/aparencia`; bar and drawer | VT `link Aparência só para administrador` passed (and `acesso.test.tsx` `grupos por assunto na barra e na gaveta`) | `web/src/administracao/aparencia.test.tsx:46` absent for ALUNO/ATENDENTE; `:49` `href '/univag/aparencia'`; `:50` `lucide-palette`; `:52` group order | PASS |
| C24 | preview changes before saving, 4 cases | VT `prévia muda antes de salvar` passed | `administracao/aparencia.test.tsx:64` `toHaveStyle({backgroundColor: Cor})`; `:68` blob img; `:71` title; `:74` `'Olá! Eu sou Vagner.'` | PASS |
| C25 | PUT with the form; "Aparência salva."; query invalidated; `--marca` without reload | VT `salvar mostra Aparência salva e aplica sem recarregar` passed | `administracao/aparencia.test.tsx:92` text; `:94-95` url and body; `:96` `--marca` equals Cor; `:97` GET public > 1 | PASS |
| C26 | API error shown, form kept: 400 under the colour field; 413/415/503 in the image block | VT `erro da API aparece e o formulário fica` passed | `administracao/aparencia.test.tsx:108` error container holds the colour field; `:109-110` values kept; `:123-126` alert text, in the image block, thumbnail kept | PASS |
| C27 | swatch and "Contraste com o branco: N,NN:1"; 7,65 / 4,54 / 1,40; Salvar disabled for `#ffd700`; pure `contraste()` | VT `contraste ao lado da cor e Salvar desabilitado` and `contraste calcula a razão WCAG` passed | `administracao/aparencia.test.tsx:142` text; `:143` `amostra` background; `:145-146` enabled/disabled; `web/src/aparencia.test.tsx:42-44` `toBe('7.65'/'4.54'/'1.40')` | PASS |
| C28 | 1440: form left and preview right, same top, sticky; 390: preview above, "Ocultar prévia"; section order | PW `arranjo Aparência` passed | `web/e2e/aparencia.spec.ts:23-25`; `:31` sorted ys over Marca, Login, Assistente, Contato, Salvar; `:35` preview above; `:40` collapsed | PASS |
| C29 | "Remover" opens Confirmar "Remover a imagem?", DELETE, thumbnail disappears | VT `remover imagem pede confirmação` passed | `administracao/aparencia.test.tsx:164` dialog name; `:165` no DELETE before; `:167` thumbnail gone; `:168` DELETE url | PASS |
| C30 | public GET returns 200 with `nome` and the 6 keys, `imagens.logo` a number; inactive returns 404 | xUnit `AparenciaPublicaTests.Instituicao_publica_traz_a_aparencia` passed | `api.Tests/AparenciaPublicaTests.cs:28,30,31,36-37`; `:40` `NotFound` | PASS |
| C31 | anonymous image GET: 200, same bytes, content type, exact Cache-Control | xUnit `Imagem_publica_com_cache_imutavel` passed | `AparenciaPublicaTests.cs:52-55` `Assert.Equal("public, max-age=31536000, immutable", ...)` | PASS |
| C32 | image route 404 in 4 cases; 503 with MinIO down | xUnit `Imagem_publica_404_e_503` passed | `AparenciaPublicaTests.cs:68-71` `NotFound` x4; `:75` `ServiceUnavailable` | PASS |
| C33 | "Entrar" background equals `#8a1538` (Claro) and `color-mix(... 55%, white)` (Escuro, Preto); base blue without colour | PW `cor da instituição nos três temas` passed | `aparencia.spec.ts:73` `expect(fundo).toBe(esperado)` over the 5 cases at `:61-65` | PASS |
| C34 | tokens derive from `var(--marca, base)` in 3 themes; `--marca` on `<html>` only with a colour | VT `marca no html só com cor` and `tokens derivam de marca nos três temas` passed | `web/src/aparencia.test.tsx:52` `--marca` equals Cor; `:58-59` removed; `:78-79` token is `var(--marca…, base)` and derives from `var(--marca)`; `:82-84` dark mix and foreground | PASS |
| C35 | logo `img` src and alt, <= 40 px in the login and in the open bar; without logo, initials and no "One" | VT `logo no login e na barra` and PW `logo até 40 px no login` passed | `aparencia.test.tsx:94` src; `:95` `h-10`; `:105` bar src; `:113-114` no "One", initials; `aparencia.spec.ts:85` height `<= 41`; `:86` alt equals nome | PASS |
| C36 | icon in icon and apple-touch links, collapsed bar and mobile top; without icon, default links and initials in `bg-primary` | VT `ícone na aba, na barra recolhida e no topo` passed | `aparencia.test.tsx:122-123` hrefs; `:125` bar img; `:126` header img; `:133-136` default links, no img, `span.bg-primary` 'U' | PASS |
| C37 | `document.title` is `nomeCurto` or `nome`; theme-color is the colour or `#224fa7` | VT `título e theme-color da instituição` passed | `aparencia.test.tsx:143-144`; `:150-151` (base `index.html:6` is `#224fa7`); `:156` | PASS |
| C38 | 1440: image box equals the panel, `object-fit: cover`, `alt=""`, texts on it; 390: 128 px band above `h1`, logo inside | PW `imagem do login no painel e na faixa` passed | `aparencia.spec.ts:98` box per side; `:99` `'cover'`; `:100` alt; `:105-106` texts within the panel; `:111` 128; `:113` band above h1; `:114-117` logo inside | PASS |
| C39 | institution login texts, or the base texts | VT `textos do login da instituição ou os de base` passed | `aparencia.test.tsx:176-180`; `:185-188` | PASS |
| C40 | Boas-vindas svg above `h1` "One" at `/` | VT `raiz com a ilustração Boas-vindas` passed | `aparencia.test.tsx:209` `compareDocumentPosition(titulo) & FOLLOWING` | PASS |
| C41 | 64 px round photo with alt; "Olá! Eu sou Vagner."; 4 buttons in order; defaults without appearance | VT `boas-vindas com nome, foto e perguntas` and `boas-vindas padrão sem aparência` passed | `web/src/assistente/boasvindas.test.tsx:27` `toHaveClass('size-16','rounded-full')`; `:28-31`; `:39-42` | PASS |
| C42 | 2 default questions | VT `perguntas padrão` passed | `boasvindas.test.tsx:51` `toEqual([Boleto, Atestado])` | PASS |
| C43 | tapping a suggestion POSTs `{mensagem}`, then the bubble shows it and the suggestions disappear | VT `tocar na sugestão envia a pergunta` passed | `boasvindas.test.tsx:60` `toEqual([['/api/conversas', { mensagem: Atestado }]])`; `:61-63` | PASS |
| C44 | 24 px photo with alt on assistant bubbles only; no photo, no img | VT `foto do assistente nos balões` passed | `boasvindas.test.tsx:75` count; `:78` `size-6`; `:81-83` none on the student's bubble | PASS |
| C45 | "Contato do atendimento" with time, `tel:6536886000`, `mailto:`; only the filled fields; absent when there is no contact | VT `contato na transferência` passed | `boasvindas.test.tsx:114` null without contact; `:117-118` texts and `hrefs` equal per case at `:105-107` | PASS |
| C46 | "Contato" item above the user in bar and drawer, Dialog with the same links; absent without contact | VT `item Contato no menu só com contato` passed | `aparencia.test.tsx:222` index before the user; `:226-227` links; `:237` drawer; `:245` absent | PASS |
| C47 | exactly 6 SVGs, `aria-hidden`, `data-ilustracao`, only currentColor, none or tokens, no image or href | VT `6 ilustrações só com currentColor e tokens` passed | `web/src/ilustracoes/ilustracoes.test.tsx:13` exact exports; `:19-20` aria-hidden and kebab name; `:25` fill/stroke in Permitidos; `:28,32` no colour literal; `:29-30` no external URL or href | PASS |
| C48 | 6 empty lists show illustration, title, phrase and button; buttons navigate or open dialogs | VT `vazio ilustrado nas 6 listas` (6 cases) passed | `tabela.test.tsx:52` svg; `:53` title; `:55` buttons `toEqual(botao ? [botao] : [])`; `:58` href; `:62` dialog | PASS |
| C49 | Indicadores without data: Grafico svg and the phrase | VT `Indicadores sem dados com ilustração` passed | `aparencia.test.tsx:259-260` | PASS |
| C50 | no login image: boas-vindas svg in the panel at 1440 and the band at 390 | PW `ilustração no login sem imagem` passed | `aparencia.spec.ts:129` count 1; `:130` inside `lg:flex` / `lg:hidden` ancestor | PASS |
| C51 | multipart/alternative; text/plain equals Corpo (CRLF normalized); text/html part | xUnit `EmailMarcaTests.Email_vai_com_texto_e_html` passed | `api.Tests/EmailMarcaTests.cs:50` `Contains("multipart/alternative", raw)`; `:51` `Assert.Equal(Corpo, Texto(msg))`; `:52` HTML; `:59` first-access HTML carries the colour | PASS (precision: see Findings) |
| C52 | colour header, `cid:logo` with alt, inline bytes, name; escaping and `<br>`; default `#224fa7` without `cid:` | xUnit `Html_com_cor_logo_e_corpo_escapado` passed | `EmailMarcaTests.cs:71-77`; `:79` `ContentID` logo; `:81` same bytes; `:85-86` default colour, no `cid:` | PASS |
| C53 | MinIO down: sent in the same cycle, no `cid:`, name in text | xUnit `Minio_fora_envia_sem_logo` passed | `EmailMarcaTests.cs:100` one `Agendador.Executar()` under `MinioFora()`; `:102` `EnviadoEm` set; `:105-106` | PASS |
| C54 | manifest 200, content type and every field; defaults without appearance | xUnit `ManifestoTests.Manifesto_da_instituicao` and `Manifesto_padrao_sem_aparencia` passed | `api.Tests/ManifestoTests.cs:24-25`; `:27` tuple `("...","Univag","/univag/","/univag/","standalone","#8a1538","#ffffff")`; `:31-36` icons; `:49-54` defaults | PASS |
| C55 | manifest 404 for nonexistent and inactive | xUnit `Manifesto_404` passed | `ManifestoTests.cs:64-65` `NotFound` | PASS |
| C56 | manifest link `href` per slug; base at `/` | VT `manifesto da instituição no link` passed | `aparencia.test.tsx:163` `/api/instituicoes/univag/manifest.webmanifest`; `:167` `/manifest.webmanifest` | PASS |
| C57 | whole API suite passes; existing edits only items 1-4 | whole assembly, see Gate | assertion-edit audit below, `RetratoTests.cs:39,43,46`, `AdminTests` 29 -> 33, `ArquiteturaTests`, `MediatorTests`, `SessaoTests` - all items 1-3 (`AdminTests` by the 04/11 amendment) | PASS |
| C58 | `rotas.txt` gains exactly 6 lines (2 anonymous, 4 admin), none removed | xUnit `RetratoTests.Tabela_de_rotas_igual_a_da_base` passed | `api.Tests/RetratoTests.cs:51` `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva)`; `git diff` of `rotas.txt` is `+6/-0` | PASS |
| C59 | door 1 nullable snake_case columns; unique `(instituicao_id, tipo)` under the filter; no pending model changes | xUnit `ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro`, `Tabelas_snake_case_e_datas_timestamptz` and `AparenciaAdminTests.Tabelas_da_aparencia` passed; `dotnet ef migrations has-pending-model-changes` (see Gate) | `AparenciaAdminTests.cs:385` all 11 columns nullable; `:389` the columns of `imagem_instituicao`; `:392` unique index; `api.Tests/ArquiteturaTests.cs:20` `imagem_instituicao` in the tenant tables | PASS |
| C60 | `dotnet build api` with CA1502 | see Gate | build output `0 Erro(s)` | PASS |
| C61 | whole Vitest suite and the web build pass; edits only from item 5 | `npx vitest run`: 329/329 (40 files); `npm --prefix web run build` exit 0 | assertion-edit audit below | PASS |
| C62 | crapper 9.99 exit 0; dryer finds no candidate | `npm --prefix web run coverage` then `crapper ... --threshold 9.99`, exit 0; the `dryer` command from C62, `No duplicate candidates found.` | `web/.metrics/crap.edn`, `dry.edn` | PASS |
| C63 | the 3 layout specs pass whole | `npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/aparencia.spec.ts` against :5199: 84 expected, 0 unexpected | per-test titles above | PASS |
| C64 | real e2e: admin customizes, login shows the logo and colour, manifest has the icon; whole e2e suite passes | `E2E_URL=http://localhost:8085 npx playwright test` against a HEAD image: 109 expected, 0 unexpected; `admin personaliza a aparência e o login muda` passed | `web/e2e/aparencia-real.spec.ts:83` "Aparência salva."; `:86` sidebar logo; `:95-96` login logo src and natural width; `:104` button background; `:111-112` manifest colour and icons; `:118` Cache-Control | PASS |

### Edits to existing assertions (`git diff 5b355d9..179d088 -- api.Tests web/src web/e2e`)

Each hunk was mapped to its enclosing test and compared with the closed list.
- `api.Tests`: the `sucessos.txt` line (item 1); `rotas.txt` +6 and `RetratoTests` 67/64/65/5 -> 73/70/71/7 (item 2); `AdminTests.Sem_papel_admin_403` 29 -> 33 (item 3, 04/11 amendment); `ArquiteturaTests`, `MediatorTests` and `SessaoTests` counts and lists, each only gaining this feature's items (item 3). Nothing removed.
- `web/e2e/arranjo.spec.ts`: 21 hunks in `compositor visível…`, `arranjo Assistente`, `detalhe em uma coluna a ${largura} px`, `arranjo listas de chamados`, `telas de acesso centralizadas`, `arranjo Artigos e Documentos`, `arranjo administração`, `Detalhe: cartão da equipe…`, `botões pequenos em linha…`, `Matrículas: …`, `Cadastros: detalhe pequeno…`, `rótulo do gráfico…`, `alertas de Indicadores`, `colunas largas somem no estreito`, `lista vazia centralizada`, `cabeçalho: borda…`, `valores de tipo e bordas`, `texto das linhas de 14 px`, `linha da marca na entrada`, `posição do conteúdo do painel`. Every one is named in item 5 or its two 04/11 extensions.
- Vitest: `acesso.test.tsx` (menu counts and groups, icons, header title with "Aparência"; the POST filter in first access and set password; 1 `boas-vindas` svg), `acesso/textos.test.tsx`, the empty-text and Spinner -> skeleton edits in `administracao/*`, `chamados/*` and `conhecimento/*`, `indicadores/*` ("Sem atendimentos neste período."; `rotulo` -> `linhasDoRotulo`), `assistente/textos.test.tsx`, `test/estrutura.test.ts`, `test/interface.test.ts`. All are inside item 5 or the 04/11 extensions.

Weakenings on the list, accepted because the list names them: the POST filter (`acesso.test.tsx:326,338`) now ignores GET calls; `lista vazia centralizada` drops the 96 px row height; the "valores de tipo e bordas" footer goes from <= 24 px to <= 48 px. No edit is outside the list.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/instituicoes/{slug}` statuses (2) | plan `## Surface` | 200 `AparenciaPublicaTests.cs:28` · 404 `:40` | - |
| image route statuses (3) | plan `## Surface` | 200 `AparenciaPublicaTests.cs:52` · 404 `:68-71` · 503 `:75` | - |
| manifest statuses (2) | plan `## Surface` | 200 `ManifestoTests.cs:24` · 404 `:64-65` | - |
| `GET /api/admin/aparencia` statuses (3) | plan `## Surface` | 200 `AparenciaAdminTests.cs:43` · 401/403 `:362` | - |
| `PUT /api/admin/aparencia` statuses (4) | plan `## Surface` | 200 `:71` · 400 `:122,:166,:181` · 401/403 `:362` | - |
| `POST .../imagens/{tipo}` statuses (8) | plan `## Surface` | 200 `:196` · 400 `:273` · 401/403 `:362` · 404 `:284` · 413 `:246` · 415 `:225-227` · 503 `:298` | - |
| `DELETE .../imagens/{tipo}` statuses (4) | plan `## Surface` | 204 `:312` · 401/403 `:362` · 404 `:285,:319` | - |
| image types (4) | door 2 | logo, icone, login, assistente: `:225-233`, `:246-253` | - |
| text limits (12) + invalid e-mail | AC 14 | 12 TheoryData rows `AparenciaAdminTests.cs:130-132`, both sides of each edge; e-mail `:173-183` | - |
| colour edges (6) | AC 13 | InlineData `:102-107` | - |
| themes with and without colour (5) | AC 31 | `aparencia.spec.ts:61-65` | - |
| derived tokens (4 x 3 themes) | `web/src/index.css`, AC 31 | `aparencia.test.tsx:72-79` (`.black` inherits 3 tokens from `.dark`, AD-027 `class="dark black"`) | - |
| brand places (8) | AC 32-34, 53 | C35 to C37 and C56 lines above | - |
| badge states (5) | `chamado.ts` states | `tabela.test.tsx:26-30` | - |
| `Button` sizes AC 2 covers ("todo `Button`") (8) | `web/src/ui/button.tsx:22-31` | default, xs, icon, sm: `celular.spec.ts:39-44` | `lg` (used in `Autenticado.tsx`), `icon-xs`, `icon-sm` (used in `assistente/Anexos.tsx`), `icon-lg` - no 44 px proof |
| other 44 px components (4) | AC 2 | Input `:46` · NativeSelect `:48` · Tabela actions `:50` · ticket "Ações" `:124` | - |
| lists (6) | plan `## Screens` Listas | C7 `celular.spec.ts:87-108`, C10 `:156-158`, C48 `tabela.test.tsx:9-16` | - (badge member weak: see Faults) |
| illustrations (6) | door 9 | `ilustracoes.test.tsx:13` and per-screen C40, C41, C48, C49, C50 | - |
| contact fields (3) | AC 42 | `boasvindas.test.tsx:105-107` | - |
| e-mail variants (3) | AC 49-50 | `EmailMarcaTests.cs:71,85,105` | - |
| one-way doors (11) | plan `## Landing` | 1 C12, C59 · 2 C15, C59 · 3 C12, C22 · 4 C31 · 5 C54, C56 · 6 C51, C52 · 7 C23, C28 · 8 C13, C27, C33 · 9 C47 · 10 C14 (`AparenciaAdminTests.cs:167`), C18 (`:274`) · 11 C21 | - (the checks table lists 9 doors: stale, but 10 and 11 are proven) |
| startup: appearance applied (2 places) | read directly | `web/src/App.tsx:48` `<AplicaAparencia />` beside `Routes`; `acesso/Acesso.tsx:119` and `Autenticado.tsx:263` `useInstituicao(slug)` | - |

## Swept existing

- authorization: `api/Administracao/AdminRotas.cs:14-15`. The `/admin` group's filter returns 403 unless the user is `Administrador`, and `:23` maps `AparenciaRotas.MapearAdmin(admin)` inside it. Present.
- data lifecycle: `api/Armazenamento.cs:22`. `PutBucketVersioningAsync(... VersionStatus.Enabled)`. Present.
- observability: `api/Agendador.cs:89` `LogError(..., "Agendador falhou no item ...")`. Present.

## Faults injected

Each fault was made in `git worktree add D:/one-verif-wt HEAD`; web faults ran with a junction to `web/node_modules`. Independent faults were batched per proof surface, and each kill was attributed by its own assertion message. The real tree's `git status --porcelain` was identical before and after (3 untracked dirs only).

| Mutation | Location | Killed |
| --- | --- | --- |
| S1: `AGUARDANDO_ALUNO` badge `bg-warning-subtle` -> `bg-primary-subtle` | `web/src/chamados/Chamados.tsx:21` | yes - C3 `tabela.test.tsx:35` "Expected the element to have class" |
| S1: alert back to `grid-cols-[0_1fr]` (the original bug) | `web/src/ui/alert.tsx` cva base | yes - C1 `celular.spec.ts:30` "Expected <= 30, Received 77" |
| S2: Sheet breakpoint `(max-width: 1023px)` -> `767px` | `web/src/chamados/ChamadoDetalhe.tsx:242` | yes - C8 times out finding "Ações" at 1023 |
| S2: state cell loses `data-celula="selo"`; the badge drops to its own row (measured: first cell y=78, badge y=198) | `web/src/chamados/Chamados.tsx:59` | no - survived; C7 `listas viram cartões abaixo de 768` passed, its badge asserts skipped by `if (await selo.count())` at `celular.spec.ts:95` |
| S3 web: preview ignores the colour (`const cor = undefined`) | `web/src/administracao/PreviaAparencia.tsx:68` | yes - C24 `administracao/aparencia.test.tsx:64` |
| S4 web: theme-color always the base (`d?.cor ?? null` -> `null`) | `web/src/aparencia.tsx:75` | yes - C37 `aparencia.test.tsx:144` "expected '#224fa7' to be '#8a1538'" |
| S4 web: login image `object-cover` -> `object-contain` | `web/src/acesso/Acesso.tsx:104` | yes - C38 `aparencia.spec.ts:99` "Expected cover, Received contain" |
| S5: contact block always rendered (`temContato(contato) &&` -> `true &&`) | `web/src/assistente/Assistente.tsx:230` | yes - C45 `boasvindas.test.tsx:114` "expected <section> to be null" |
| S6: illustration fill literal `#dbe4f5` instead of `var(--primary-subtle)` | `web/src/ilustracoes/index.tsx:5` | yes - C47 `ilustracoes.test.tsx:25` "BoasVindas fill ... to include '#dbe4f5'" |
| S3 API: `ContrasteDaCor.Minimo` 4.5 -> 4.4 | `api/Instituicoes/ContrasteDaCor.cs:8` | yes - C13 `AparenciaAdminTests.cs:122` `(#777777, aceita: False)` "Expected: BadRequest, Actual: OK" |
| S4 API: Cache-Control drops `immutable` | `api/Instituicoes/BaixarImagemInstituicao.cs:10` | yes - C31 `AparenciaPublicaTests.cs:55` "Expected public, max-age=31536000, immutable" |
| S7: e-mail body lines not escaped (`.Select(Escapar)` -> `.Select(s => s)`) | `api/Email.cs:64` | yes - C52 `EmailMarcaTests.cs:74` "Assert.Contains() Failure: Sub-string not found" |
| S8: manifest `start_url` without the trailing slash | `api/Instituicoes/ManifestoInstituicao.cs:49` | yes - C54 `ManifestoTests.cs:27` start_url "/univag" vs "/univag/" |

## Findings

About the checks:
1. **C7 assertion is conditional (surviving mutant).** `celular.spec.ts:94-104` asserts the badge only when `[data-celula=selo] [data-slot=badge]` exists. That attribute is also what places the badge (`index.css:153-154`), so losing it breaks the layout and silences the test at once. Fila and Minhas solicitações always have a badge, so the test should require `count() > 0` for them.
2. **AC 2 is over-claimed by C2:** "todo `Button`" is proven on 4 of 8 sizes, and 3 of the unproven ones are on real screens.
3. **Arrangement gaps from `## Screens`** (Binding sources table): the suggestions grid and centering, login texts at the base of the image panel, the assistant photo on the left, contact below the ticket number, and the shell icon sizes and order. All are visibly right in the screenshots, but no check would catch them regressing.
4. **Precision:** C14 says "13 limites, 26 pedidos", but it lists 12 limits (10 lengths + 2 counts), and the invalid e-mail is a separate test (`Email_de_contato_invalido_400`) that C14's `Proof:` filter (`~Limites_dos_textos_400`) does not select. The e-mail case is proven only in the full run.
5. **Precision:** C51 names the first-access e-mail, but the multipart and `text/plain == Corpo` assertions (`EmailMarcaTests.cs:50-51`) are on a generic `EmailSaida`. The first-access mail is checked only for the colour (`:59`). Both go through `Email.Enviar`, so this is not a gap in the behaviour.
6. **Precision:** C26 "abaixo do campo de cor" is asserted as "same container" (`administracao/aparencia.test.tsx:108`), not as a position.
7. The `checks.md` Coverage row "one-way doors (9)" is stale: the plan has 11. Doors 10 and 11 are proven (see Coverage).

About the screens (screenshots at 390 and 1440, with and without appearance, light and dark, simulated API):
8. The Aparência preview's initials are "CE" (`PreviaAparencia.tsx:21`, first two letters), while the login it replicates shows "CG" (`iniciais`, `aparencia.tsx:104-107`). No check covers the preview's identity row.
9. Without an icon, the mobile top bar shows no initials before the title (`sem-light-390-AssistenteVazio`). AC 33's "sem ícone, as iniciais" is read for the bar only by C36, and the plan's mobile sentence names only the icon. Ambiguous, not counted as a contradiction.
10. Without a logo, the < 1024 band shows the illustration, and the initials sit below the band rather than inside it (`sem-light-390-Login`). The plan puts "o logo" in the band, so with no logo this is consistent.
11. Everything else seen matches `## Screens`: a two-column login with the image and text at the base; the illustration above the text without an image; root `/`; a 1/2-column suggestions grid; the photo left of the bubble; the "Contato" item above the user; cards with the badge right; the fixed "Ações" bar; a two-column Aparência with the preview on the right, and a collapsible preview above the form at 390.

## Gate

- `api.Tests` (whole assembly, xUnit v3 in-process runner, Release, HEAD `161411c`): 534 passed, 0 failed. Run as 533 in one process (`-method-` excluding `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo`), plus that test alone (passed in 3 s). In two full parallel runs that one push test hung with no DB activity (`[Long Running Test]` past 7 min). It is outside this feature: the feature touched one line of `Agendador.cs` (the e-mail call), not push. It is flaky under parallelism, not a failure of this diff
- `dotnet build api`: `0 Erro(s)`; `dotnet ef migrations has-pending-model-changes --project api`: "No changes have been made to the model since the last migration."
- Vitest: 329 passed, 0 failed (40 files); `npm --prefix web run build` exit 0
- Playwright layout (arranjo, celular, aparencia) against `vite preview` :5199: 84 passed, 0 failed
- Playwright e2e whole suite against the HEAD image on :8085 (own DB `one_verif_e2e`, own bucket `one-verif-e2e`, institution `e2e`): 109 passed, 0 failed
- crapper 9.99: exit 0; dryer: `No duplicate candidates found.`
- Environment: the first `dotnet test` attempts failed to load the freshly built Debug test DLL (Smart App Control, `0x800711C7`). One VSTest run of the Release build hung with no DB activity and was stopped. The verdict uses the xUnit executable run.
- Cleanup: e2e container `one-verif-aparencia` and its image removed, DB `one_verif_e2e` dropped, bucket `one-verif-e2e` removed, preview servers on :5198 and :5199 stopped, both worktrees unregistered (`git worktree list` shows only `D:/one-system`). The safety check refused to remove the empty folder `D:/one-verif-wt` (with an empty `web/`), so it is left for the user. The real-tree porcelain is unchanged except for this report. Mailpit keeps the e2e messages for `admin-verif@e2e.one`.
- HEAD moved to `5b53ce7` (docs for another feature) during the run. No code under `api/`, `api.Tests` or `web/` changed after `161411c`.
