# Ajustes de acabamento da revisão pelas Web Interface Guidelines - verification

**Verdict**: FAIL (3 checks FAIL: C7, C11, C16; C19 aberto; 1 mutante sobrevivente; 2 elementos sem check)
**Profile**: ui
**Diff range**: 6959f46..aa1de1c (commits da feature: f0b6519, 720dee6, 46ee0c7, aa1de1c)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Não é só o C19 que está aberto. `main` andou depois de `aa1de1c` (commits e modificações da refatoração do back, de outra pessoa); nada disso foi julgado. Nenhum arquivo de `web/` ou de `One.Api/Instituicoes/` mudou depois de `aa1de1c` (`git diff aa1de1c HEAD --stat -- web One.Api/Instituicoes` vazio).

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| W3C Web App Manifest (`https://www.w3.org/TR/appmanifest/`): `id` (1.11), `purpose` (2.1), zona segura (2.3) | yes - web_fetch seletivo; `id` é URL da mesma origem do `start_url`, `"/{slug}/"` cumpre; `purpose` é lista de tokens, `any` é o padrão; a zona segura é um **círculo** de raio 40% do lado, não um quadrado de 80% | `id`/`purpose`: nenhuma. Zona segura: o plano (Assumption "reduzido para 80%") e o C17 falam de um quadrado de 80%; a especificação decide um círculo de raio 40%. A arte entregue cumpre o círculo para o glifo (anel branco de raio ≈131 px < 204,8 px, medido), então a divergência é de texto, não de resultado | **sim**: nenhum check prova a zona segura. C17 só prova `512×512` pelos bytes do PNG (`guidelinesGlobal.test.ts:237`); a arte poderia estar cortada e o C17 passaria |
| `.specs/features/revisao-ux/pesquisa.md` §4 (alvos de toque: 44×44 pt/48 dp, 8 dp entre alvos) | yes - lido | none: C9 (44 px medidos na tela) cumpre | - |
| Web Interface Guidelines `command.md` (vercel-labs) | yes - web_fetch; regras usadas: "Placeholders end with …", "Large lists (>50): content-visibility", "Sticky … must not cover the focused element", "Specific button labels", "Handle empty states" | none com C5, C6, C7, C8, C10 | `Handle empty states`/estado vazio com clique perdido: ver Julgamento (sem check) |
| `revisao-guidelines-web/verification.md` e emenda 3 do C51 em `revisao-guidelines-web/checks.md` | yes - emenda lida (linha acrescentada pelo diff); a asserção nova é forte (ver C7/C8) | none | - |
| Landing, door 1 (contrato do manifest) | yes - código lido, `ManifestoInstituicao.cs` e `vite.config.ts` | `"id": "/{slug}/"`, 3 ícones sem arte própria, só `any` com arte própria, `#fafbfd`: tudo igual ao literal do Landing | `type` dos ícones novos e `display`/`scope` só em testes antigos (`ManifestoTests.cs:26-36`), aceitável |

## Checks

Provas rodadas em HEAD (feature = `aa1de1c`). Vitest `--maxWorkers=4` completo: 98 arquivos, 989 testes passaram (cada teste dos checks apareceu individualmente no modo `verbose`). `dotnet test One.Api.Tests` em worktree limpo de `aa1de1c`: 867 aprovados, 0 falhas, `ArquiteturaTests.Referencias_entre_fatias` aprovado (então a falha que o brief previa não ocorre). E2E contra :8080: 102 passaram (`ajustes` 5, `guidelines`, `casca-celular`, `celular`, `arranjo`).

:8080 reflete a feature: `GET /api/instituicoes/univag/manifest.webmanifest` devolveu `id:"/univag/"`, `background_color:"#fafbfd"`, 3 ícones com `purpose` (`any`, `any`, `maskable` em `/icons/icon-maskable-512.png`); o CSS do bundle só declara `content-visibility:auto` em `[data-cartoes]>[data-slot=table-row],[data-linhas]>[data-slot=table-row]`; `/icons/icon-maskable-512.png` responde 200 e o manifest estático lista o maskable.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | carregando mantém o botão no cabeçalho (2 telas) | `vitest guidelinesCriar -t "C1 "` - ambos testes `C1` apareceram e passaram | `web/src/conhecimento/guidelinesCriar.test.tsx:28` - `expect(within(principal()).getAllByRole('button', { name: botao })).toHaveLength(1)` com a listagem pendente (`:24`) e `Carregando…` visível (`:27`) | PASS |
| C2 | erro de listagem: `Tentar de novo` e botão de criar | idem `-t "C2 "` | `guidelinesCriar.test.tsx:33` `findByRole('button', { name: 'Tentar de novo' })` + `:35` `getAllByRole('button', { name: botao })).toHaveLength(1)` | PASS |
| C3 | vazia: um só botão, o do estado vazio | idem `-t "C3 "` (2 testes por tela) | `guidelinesCriar.test.tsx:43` `toHaveLength(1)` + `:44` `celula.contains(botoes[0])` `toBe(true)`; com itens `:52-53` o botão está fora da célula (`closest('[data-slot=table-cell]')` `toBeNull`) | PASS |
| C4 | título `Novo documento`; `Nova versão` mantida | idem `-t "C4 "` (3 testes) | `guidelinesCriar.test.tsx:62` `findByRole('dialog', { name: titulo })`; `:73-74` `dialog { name: 'Nova versão' }` e `queryByRole('dialog', { name: 'Novo documento' })` `not.toBeInTheDocument` | PASS |
| C5 | placeholder de Cadastros | `vitest guidelinesBusca -t "C5 "` | `web/src/administracao/guidelinesBusca.test.tsx:15` `toHaveAttribute('placeholder', 'Buscar pelo nome…')` | PASS |
| C6 | placeholder de Usuários | `-t "C6 "` | `guidelinesBusca.test.tsx:21` `toHaveAttribute('placeholder', 'Buscar por nome, CPF ou e-mail…')` | PASS |
| C7 | cada cartão do celular declara `content-visibility: auto` e `contain-intrinsic-size: auto 56px` | `vitest tabela.test.tsx -t "C7 "` | `web/src/tabela.test.tsx:100-101` regex das duas declarações; `:106` `expect(cartoes).toHaveLength(2)` e `:107` `matches(seletor)` - mas a fila usa `densa` (`Chamados.tsx:107`), então só o ramo `[data-linhas]` é exercido; o ramo `[data-cartoes]` (Usuários, Artigos etc.) não. **Mutante: apagar `[data-cartoes] > [data-slot='table-row'], ` de `index.css:184` passa os 12 testes de `tabela.test.tsx`** | FAIL |
| C8 | desktop sem `content-visibility` em `<tr>`; 120 itens mostram 50 | `-t "C8 "` | `tabela.test.tsx:113-114` `expect(parte).toMatch(/^\[data-(cartoes|linhas)\]/)` e `.not.toMatch(/\btr\b\|table-body\]\s*>/)`; `:120` `querySelectorAll('[data-slot=table-body] > [data-slot=table-row]')).toHaveLength(50)`. Emenda do C51: `:76` `expect(regras).toHaveLength(1)` e `:86` `expect(linha.matches(seletor)).toBe(false)` em 3 linhas do `<table>` com `:84` `toHaveLength(3)` - forte, não vazia; a falta F2 a matou | PASS |
| C9 | `Handle` ≥ 44×44 na tela em `fitView`, zoom mínimo e máximo, 820×1180 toque | `playwright ajustes.spec.ts -g "C9 "` (:8080) | `web/e2e/ajustes.spec.ts:61,66,71` `expect(await medirAlcas(page), …).toEqual([])` onde `:41` junta toda alça com `width < 43.5 \|\| height < 43.5` de `getBoundingClientRect`; `:65` `minimo < 1`, `:70` `maximo > 1` | PASS |
| C10 | link `Sua solicitação` sem interseção com o compositor a 390×844 e 360×780, 3 anexos, 6 linhas, topo | `-g "C10 "` | `ajustes.spec.ts:95-96` `cruza = a.top < b.bottom && b.top < a.bottom; expect(cruza).toBe(false)`. Acoplado a `ancestor::div[contains(@class,"sticky")]` (`:93`). F10 (tirar `max-h-16` dos anexos) mata só o caso 360×780; o 390×844 passa; tirar o limite do campo (F9) não derruba o C10 | PASS (com ressalva) |
| C11 | 12 linhas: campo ≤ 30dvh e rola; a 844×390 **mostra ≥ 4 linhas** | `-g "C11 "` | `ajustes.spec.ts:109` `height <= 0.3*844+0.5` (passa); `:121` `expect(clientHeight).toBeGreaterThanOrEqual(4 * linha)` - **`clientHeight` inclui o padding de 20 px**. Medido no :8080 a 844×390, 390×844 e 360×780: `client 112`, `lh 24px`, `pt 10px pb 10px`, `max-height 112px` → área de texto 92 px = **3,83 linhas < 4**. A claim do check é falsa no produto e a asserção a esconde | FAIL |
| C12 | `id` é `/{slug}/` | `dotnet test --filter ManifestoTests.Manifesto_declara_o_id_da_instituicao` - apareceu e passou | `One.Api.Tests/ManifestoTests.cs:89` `Assert.Equal($"/{slug}/", m.GetProperty("id").GetString())` (slug aleatório, não o literal `univag`; é mais forte: prova a derivação do slug). F7 (`id` = `"/"`) matou | PASS |
| C13 | sem ícone: 3 entradas com `purpose` | `…Sem_icone_proprio_lista_o_maskable` | `ManifestoTests.cs:97-99` `Assert.Equal([("/icons/icon-192.png","192x192","any"), ("/icons/icon-512.png","512x512","any"), ("/icons/icon-maskable-512.png","512x512","maskable")], icones)`; F6 (remover o maskable) matou | PASS |
| C14 | com ícone: só `any`, nenhuma `maskable` | `…Com_icone_proprio_so_lista_any` | `ManifestoTests.cs:108` `Assert.Equal(2, icones.Count)`, `:111-112` `src == $"/api/instituicoes/{slug}/imagens/icone?v=2"` e `"any"`, `:114` `Assert.DoesNotContain(icones, x => x.Purpose == "maskable")` | PASS |
| C15 | `background_color` `#fafbfd` | `…Manifesto_declara_o_fundo_do_app` | `ManifestoTests.cs:122` `Assert.Equal("#fafbfd", …"background_color")`; F5 (`#ffffff`) matou | PASS |
| C16 | 404 **com ProblemDetails** para slug inexistente e inativa | `…Instituicao_inexistente_ou_inativa_responde_404` | `ManifestoTests.cs:63-64` `Assert.Equal(HttpStatusCode.NotFound, …StatusCode)` x2. Nenhuma asserção do corpo (`application/problem+json`, `status`, `title`): o "ProblemDetails" da claim não está provado (o teste antigo também não provava) | FAIL |
| C17 | manifest estático: maskable `/icons/icon-maskable-512.png`, `icon-512.png` só `any`, arquivo 512×512 | `vitest guidelinesGlobal -t "C17 "` | `web/src/guidelinesGlobal.test.ts:235` `…filter(purpose==='maskable').map(src)).toEqual([Maskable])`; `:236` `…filter(src==='/icons/icon-512.png')…toEqual(['any'])`; `:237` `dimensoesDoPng(...)).toEqual([512, 512])`. F3 (maskable aponta `icon-512.png`) matou C17 e C21. A zona segura não é afirmada (ver Coverage) | PASS |
| C18 | suítes e build | `vitest run` (989), `dotnet test` (867, worktree limpo), `npm --prefix web run build` exit 0 | saídas acima | PASS |
| C19 | `crapper` < 9.99 e `dryer` 0.8 | `npm --prefix web run coverage` exit 0 (989 testes); `crapper --use-existing-coverage -s src --threshold 9.99`; `dryer …` | `crapper`: `ResourceUnavailable: Program 'crapper.exe' failed to run: An error occurred trying to start process 'C:\Users\Alfredo Neto\.local\bin\crapper.exe' with working directory 'D:\one-system\web'. Uma política de Controle de Aplicativo bloqueou este arquivo.` Não contornei. `dryer`: `No duplicate candidates found.` Em `.specs/STATE.md` não há AD de risco aceito para esta feature nem para a `revisao-guidelines-web` (grep de `ajustes-guidelines`, `revisao-guidelines`, `C68`: vazio; o AD-044 cobre só `fluxos-atendimento` e `base-fluxos`) | **ABERTO** (sem PASS) |
| C20 | e2e `ajustes`, `guidelines`, `casca-celular`, `celular`, `arranjo` | `npm --prefix web run e2e -- <5 specs>` contra :8080 | `102 passed (1.2m)`; saída em `ajustes.spec.ts` 1..5 (C9, C10 x2, C11 x2) | PASS |
| C21 | manifests estático e da API apontam o mesmo maskable | `vitest guidelinesGlobal -t "C21 "` | `guidelinesGlobal.test.ts:243-244` `expect(daApi).toBe(maskable.src); expect(daApi).toBe(Maskable)` com `daApi` lido por regex de `ManifestoInstituicao.cs` | PASS |

### Testes alterados pelo builder (enfraquecidos?)

| Arquivo | Mudança | Veredito |
| --- | --- | --- |
| `conhecimento/textos.test.tsx:19` | tirou `Enviar PDF` da lista de textos | legítimo (o texto deixou de existir) |
| `administracao/revisao.test.tsx`, `conhecimento/edicao.test.tsx`, `guidelinesFormatos.test.tsx:53`, `test/interface.test.ts` | acrescentou `await screen.findByText('Nenhum artigo/documento')` antes do clique | não enfraquece, só espera o estado vazio |
| `guidelinesUrl.test.tsx:32,161` | regex do botão `(Novo\|Nova)`; título `Novo documento` | legítimo |
| `tabela.test.tsx` | C51 reescrito (emenda 3) | **forte**: `toHaveLength(1)` regra, 3 linhas do `<table>` `matches(seletor)` `false`, cabeçalho `false`, cartões `true` |
| `ux.spec.ts:947`, `ajustes.spec.ts` novo | título `Novo documento` | legítimo |
| `guidelinesToque.test.tsx:79-81` | de `pointer-coarse:size-11!` para `size-(--alvo)!` + `--alvo` `^[\d.]+px$` | mais fraco no jsdom (não prova 44 px), mas o C9 em navegador real o substitui (F8 o mata) |
| `ManifestoTests.cs` | `#ffffff`→`#fafbfd`; `Manifesto_404`→`…_ou_inativa_…` | legítimo; `Manifesto_da_instituicao` já não olha `purpose` (coberto por C14) |
| `guidelinesGlobal.test.ts` | extraiu `manifestoEstatico()` | igual |

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| estados da lista (3) x 2 telas | `Artigos.tsx:129`, `Documentos.tsx:125` (`vazia = x?.length === 0`) | carregando C1, erro C2, vazia C3; com itens C3 (2º teste) nas duas telas | - |
| títulos do diálogo de documento (2) | `Documentos.tsx:111` | novo C4, nova versão C4 | - |
| `placeholder=` com `Buscar` (2 de 10) | varredura de `web/src` (sem testes): `Cadastros.tsx:85`, `Usuarios.tsx:152`; os outros 8 já terminam em `…` e não tinham "Buscar" | Cadastros C5, Usuários C6 | - |
| layouts da `Tabela` (**3**, não 2) | `Tabela.tsx:67` (`data-linhas` se `densa`, senão `data-cartoes`) e a `<table>` | tabela desktop C8/C51; linhas densas C7; **cartões `[data-cartoes]` sem prova** | **cartões não densos (Usuários, Artigos, Documentos, Cadastros no celular)**: mutante sobrevive |
| zoom do canvas (3) e alças (3 `<Alca>` em `NosDoCanvas.tsx:28,76,93`) | `Canvas.tsx`, `NosDoCanvas.tsx` | `fitView` 0,47, mínimo, máximo medidos em todas as `.react-flow__handle` (C9) | - |
| viewports (celular 360×780, deitado 844×390, teclado aberto, toque) do `## Observable` | plano | 360×780 C10; 844×390 C11; toque C9 | **teclado aberto**: a linha do Observable (AC 10, 11) não tem check nem prova |
| campos do manifest da API (a especificação decide) | W3C 1.4-1.13 e 2.1: `name`, `short_name`, `id`, `start_url`, `scope`, `display`, `theme_color`, `background_color`, `icons[src,sizes,type,purpose]` | `id` C12; `purpose` C13/C14; `background_color` C15; os demais em `Manifesto_da_instituicao` (`ManifestoTests.cs:26-36`) | - |
| ícone maskable: zona segura (círculo, raio 40%) | W3C 2.3 | nenhuma | **arte nunca afirmada**: só o tamanho 512×512 (C17) |
| status da rota (2) | `Surface` | 200 C12-C15; 404 C16 (status só) | corpo ProblemDetails do 404 |
| startup config manifest (2 assemblies) | `ManifestoInstituicao.cs` e `vite.config.ts` | C12-C15 e C17/C21 | - |

Arte maskable, medida (`icon-maskable-512.png`, 512×512, 14 239 B, 0 pixels transparentes): quadrado `#0d6efd` ocupa x/y 51..460 (≈80%) sobre moldura `#224fa7`; o anel branco fica a ≤ 131 px do centro. Dentro do círculo de 204,8 px está todo o glifo; os 36 312 px "fora" são os cantos do quadrado claro, não a marca. Não está cortada.

## Faults injected

Worktree isolado do commit `aa1de1c` (`git worktree add`, junction de `node_modules`), `git status --porcelain` da árvore real antes e depois: limpo nos dois pontos (as modificações da outra pessoa não foram tocadas). Worktrees removidos. Para o e2e, `vite` dev server do worktree em :5199 com `E2E_URL`; a linha de base passou 5 de 5 antes de cada falta.

| Mutation | Location | Killed |
| --- | --- | --- |
| botão some em erro/carregando: `vazia = !artigos?.length` | `Artigos.tsx:129` | yes (C1 e C2 de Artigos) |
| `content-visibility` volta ao `<tr>` do `table-body` | `index.css:184` | yes (C8 e C51) |
| manifest estático aponta o maskable para `icon-512.png` | `vite.config.ts:31` | yes (C17 e C21) |
| placeholder de Usuários sem `…` | `Usuarios.tsx:152` | yes (C6) |
| `FundoDoApp` `#ffffff` e sem o ícone maskable | `ManifestoInstituicao.cs:11,38` | yes (C15, C13; também `Manifesto_da_instituicao`, `Manifesto_padrao_sem_aparencia`) |
| `id` do manifest vira `"/"` | `ManifestoInstituicao.cs:53` | yes (C12). (A 1ª tentativa mutou o `scope` por engano e foi descartada.) |
| `Alca` sem compensar o zoom (`${AlvoEmTela}px`) | `NosDoCanvas.tsx:16` | yes (C9: 7 alças menores que 44 a `zoom 0.47`) |
| anexos sem `max-h-16` | `Anexos.tsx:66` | yes só a 360×780 (C10); o caso 390×844 **não** morre |
| campo do Assistente volta a `max-h-52` | `Assistente.tsx:304` | yes só por C11 a 844×390; C10 e o C11 a 390×844 **sobrevivem** |
| campo do Assistente só `max-h-[30dvh]` (literal do plano) | `Assistente.tsx:304` | **no**: os 4 testes `ajustes` passam; `7rem` não é exigido por nenhuma prova |
| remover o seletor `[data-cartoes] > [data-slot='table-row']` | `index.css:184` | **no**: os 12 testes de `tabela.test.tsx` passam |

## Julgamento (sem suavizar)

- `7rem` (`Assistente.tsx:304`): foi escolhido a olho e é pior que o plano. Com `min(30dvh,7rem)` o campo mede 112 px em qualquer janela ≥ 374 px de altura, o que dá 92 px de texto (3,83 linhas) em 844×390, 390×844 e 360×780. O AC 11 e o Observable (844×390) pedem 4 linhas. A falta com `30dvh` puro (117 px a 390 px de altura → 97 px de texto = 4,04 linhas) passa C10 e C11, o que contradiz a nota do `checks.md` ("S5 precisou de mais que 30dvh ... 372 px"): essa necessidade veio do compositor sem o `max-h-16` dos anexos, não do campo. O C11 só passa porque mede `clientHeight` com o padding.
- Clique perdido no AC 3: o botão do cabeçalho aparece enquanto carrega (AC 1) e some quando a lista chega vazia (AC 3); quem tocou no meio da transição não abre o diálogo e o botão pula para a célula do estado vazio. Nenhum check cobre a transição; os testes `C1` e `C3` olham estados isolados. Defeito de baixo impacto, real.
- C10 acoplado a `.sticky` (`ajustes.spec.ts:93`): se a classe sair, o locator falha alto (não passa em silêncio). Aceito. Mas o C10 a 390×844 não é mutável por nenhuma falta testada: não prova nada a 390×844 além do que já passa sem a correção (a base do `6959f46` não foi reexecutada).
- C12/C14 sem o literal `univag`: slug aleatório é mais forte para o `id` e para o `src`; desvio do texto do check, sem perda de prova. Aceito.
- Decisões visuais sem referência (AGENTS.md pede referência pesquisada registrada): `7rem`, `max-h-16`, `inset-[36%]` e a arte maskable (quadrado `#0d6efd` inset sobre moldura `#224fa7`, cores diferentes: com máscara circular o quadrado claro e a moldura escura aparecem como duas camadas) só têm o W3C como fonte, e o W3C descreve um círculo de 40%, não um quadrado de 80%. Nenhuma referência visual nem do ícone nem do compositor no plano. A arte não foi revisada por uma pessoa neste verify (seção 5 do procedimento não foi percorrida com o usuário).

## Gate

`cd web && npx vitest run --maxWorkers=4` - 989 passed, 0 failed
`dotnet test One.Api.Tests` (worktree limpo de `aa1de1c`) - 867 passed, 0 failed
`npm --prefix web run build` - exit 0
`npm --prefix web run e2e -- ajustes.spec.ts guidelines.spec.ts casca-celular.spec.ts celular.spec.ts arranjo.spec.ts` - 102 passed
`crapper` - **bloqueado pelo Windows (C19 aberto)**; `dryer` - `No duplicate candidates found.`

Gaps ranqueados:
1. C11 FAIL: o campo mostra 3,83 linhas, não 4; a asserção conta o padding - `web/e2e/ajustes.spec.ts:121`, `web/src/assistente/Assistente.tsx:304` (`7rem`).
2. C7 FAIL / mutante vivo: cartões `[data-cartoes]` sem prova - `web/src/tabela.test.tsx:97-108`, `web/src/index.css:184`.
3. Uncovered: nenhuma prova da zona segura do ícone maskable (círculo de raio 40%) - `web/src/guidelinesGlobal.test.ts:233-238`, `web/public/icons/icon-maskable-512.png`.
4. C16 FAIL: ProblemDetails do 404 sem asserção do corpo - `One.Api.Tests/ManifestoTests.cs:63-64`.
5. C19 aberto: `crapper.exe` bloqueado, sem AD do dono em `.specs/STATE.md`.
6. Observable "teclado aberto" sem check; C10 a 390×844 e C11 a 390×844 não morrem sem a correção do compositor; clique perdido na transição do AC 3 sem check.


---

# Round 2

**Verdict**: PASS exceto C19 (aberto, sem PASS)
**Diff range**: aa1de1c..HEAD (rodada 2: 2e6535c, c9f3047, f7cabaf, 343c43e, 916f1e7); HEAD = f7df10a. Nada julgado fora dos checks.
**Verifier**: agente independente, rodada 2, só provas focadas (sem suíte inteira, sem cobertura).

## Checks

| Check | Prova | Saída | Result |
| --- | --- | --- | --- |
| C1-C6 | `vitest guidelinesCriar` (11) e `guidelinesBusca` (2) | passaram; sem mudança desde a rodada 1 | PASS |
| C7 | `vitest tabela.test.tsx` (12 testes); teste `C7 os tres layouts da Tabela: cartao denso e cartao comum declaram content-visibility auto e contain-intrinsic-size auto 56px, a tabela do desktop nao…` | 12 passed; a falta F1 abaixo o derruba (o mutante da rodada 1 morreu) | PASS |
| C8 | idem | passou | PASS |
| C9 | `e2e ajustes.spec.ts` contra :8080 | 7 passed | PASS |
| C10 | idem (390×844 e 360×780, nomes curtos/6 linhas e longos/12 linhas) | 4 de 4 passed | PASS |
| C11 | idem (390×844 12 linhas ≤30dvh e rola; 844×390 ≥ 4 linhas) | 2 de 2 passed | PASS |
| C12-C15 | `dotnet test --filter ManifestoTests` em worktree de HEAD | Aprovado 7, falhas 0, total 7 | PASS |
| C16 | `ManifestoTests.cs:66-70` afirma 404, `application/problem+json`, `status` 404, `title` "Não encontrado" | dentro dos 7 acima | PASS |
| C17, C21 | `vitest guidelinesGlobal.test.ts` (16 testes) | passaram | PASS |
| C18, C20 | não reexecutados nesta rodada (restrição de tempo do usuário); e2e dos 5 specs não rodado, só `ajustes` | - | não executado: escopo |
| C19 | `dryer` não repetido; `crapper` segue bloqueado pelo Controle de Aplicativo do Windows; sem AD do dono | - | **ABERTO** (sem PASS) |

Vitest focado: 4 arquivos, 41 testes passaram (guidelinesBusca 2, tabela 12, guidelinesCriar 11, guidelinesGlobal 16).
:8080 estava no ar e reflete a rodada 2: o bundle servido contém `4lh` (teto do campo) e `data-cartoes`.
C17: a zona segura (círculo de raio 40%) é provada pelo teste de pixels de `guidelinesGlobal.test.ts` (executado, passou); não reinspecionei a arte a olho.

## Faltas injetadas (worktree isolado de HEAD, descartado; árvore real intocada)

| Falta | Onde | Morreu |
| --- | --- | --- |
| remover `[data-cartoes] > [data-slot='table-row'], ` do seletor de `content-visibility` | `web/src/index.css:184` | **sim** (C7: 1 failed, 11 passed) |
| 404 do manifest vira `Results.StatusCode(404)` em vez de `Problemas.Erro(404, …)` | `One.Api/Instituicoes/ManifestoInstituicao.cs:50` | **não**, mas é mutante equivalente: o `UseStatusCodePages` converte o 404 vazio no mesmo ProblemDetails, então o corpo observável é idêntico e o teste afirma o contrato HTTP corretamente |

Não injetei falta no C11 (e2e; exigiria subir dev server do worktree); o e2e passou contra o :8080 atual.

## Gaps (ranqueados)

1. C19 aberto: `crapper` bloqueado, sem AD de risco aceito.
2. C18/C20 completos não reexecutados nesta rodada (por restrição do usuário); só as provas focadas.
3. Baixos, herdados e fora do escopo declarado: Observable "teclado aberto" sem check; clique perdido na transição do AC 3.
