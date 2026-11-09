# Aparência enxuta e app instalado com a marca verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: 490aa69..fca3a90 (HEAD)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Resumo: 18 dos 20 checks provados com evidência localizada. C13 reprova porque um mutante sobrevive (o corte de 12 caracteres do nome do app aceita 13). C20 fica aberto ("não rodou"): o `crapper` está bloqueado neste computador (AD-044); o `dryer` passou. Também há três lacunas de cobertura (ver `Coverage` e `Ranked gaps` no fim).

Escopo do diff: `git diff --stat 490aa69..HEAD` toca só `web/` e `.specs/features/aparencia-enxuta/` (20 arquivos). Nenhum arquivo de `One.Api/`, migration, rota ou contrato mudou, como o `## Surface`, `## Relations` e `## Landing` do plano dizem.

## Binding sources

O plano não marca nenhuma fonte como binding (as três de `## Sources` são referência de pesquisa); nada a comparar, sem contradição.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| nenhuma marcada como binding no `plan.md` | n/a - plano não marca | none | - |

Arranjo (perfil `ui`), o que o plano decide por tela/aba, e o check de cada um:

| Decisão do plano | Check | Observação |
| --- | --- | --- |
| 5 abas na ordem Marca, App instalado, Login, Assistente, Contato; Marca ativa | C1 (`aparenciaAbas.test.tsx:66` `toEqual(Abas)`, `:67`) | ok |
| só os campos da aba ativa; campos por aba | C1 `:68`, C2 `:72-84` (laço sobre todos os rótulos, presença e ausência) | ok |
| `?aba=` e Voltar | C3 `:93`, `:102` | ok |
| lista de abas rola <768 px, abas com >=44 px, sem rolagem horizontal da página | C9 (Playwright `aparencia.spec.ts:45`) | passou |
| prévia ao lado a partir de 1024 px | C10 (Playwright `aparencia.spec.ts:60`, medido só a 1280 px e só na aba `app`) | ok; abaixo de 1024 px segue o teste antigo "Ver prévia" |
| prévia mostra só o bloco da aba ativa | C10 `:269` | ok |
| barra de ações FIXA no rodapé (AC 5: "fixa no rodapé da tela") | C5 prova só o texto e o estado | **sem check de posição**: `Aparencia.tsx:190` tem `sticky bottom-0`, e nenhum teste de Vitest nem de Playwright lê `position` da barra (busca `sticky\|position` em `*aparencia*` só acha a prévia, `aparencia.spec.ts:25`) |

O código renderiza, e o plano não descreve: (1) `Confirmar` ganhou a propriedade `voltar` (`Confirmar.tsx`), componente compartilhado, usada para o rótulo "Continuar editando"; (2) as amostras de cor têm 44 px abaixo de `md` (`CoresProntas.tsx:35`); (3) o bloco "Tela inicial" cai nas iniciais do `nome` quando `nomeCurto` está vazio (`PreviaAparencia.tsx`, `iniciais(d.nome)`), o que bate com o `short_name` do servidor (`ManifestoInstituicao.cs:49`), mas nenhum check cobre esse ramo. Nenhum dos três contradiz o plano.

## Checks

Provas de Vitest rodadas em UMA invocação em `d:\one-system\web`: `npx vitest run src/administracao/aparenciaAbas.test.tsx src/administracao/aparencia.test.tsx src/aparencia.test.tsx --reporter=verbose` - 3 arquivos, 39 testes passaram, 0 falharam; cada teste nomeado aparece individualmente como `✓`. Provas de Playwright em UMA invocação com configuração temporária (removida depois): `npx playwright test -c pw.tmp.config.ts aparencia.spec.ts -g "abas a 360 px|prévia ao lado a 1280 px"` - 2 passaram.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 5 abas na ordem, Marca ativa, só os campos da aba | vitest `-t "cinco abas com Marca ativa"` exit 0, `✓` | `aparenciaAbas.test.tsx:66` `expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(Abas)` (`Abas` = Marca, App instalado, Login, Assistente, Contato, `:30`); `:67` `toHaveAttribute('aria-selected', 'true')`; `:68` `queryByLabelText('Título do login')).not.toBeInTheDocument()` | PASS |
| C2 | rótulos exatos por aba, nenhum em duas abas | vitest `-t "campos de cada aba"` `✓` | `:79-81` por aba e por rótulo, `if (Rotulos[aba].includes(rotulo)) expect(getByLabelText(rotulo))...toBeInTheDocument() else expect(queryByLabelText(rotulo))...not.toBeInTheDocument()`; `Rotulos` (`:34-40`) bate com o texto do check | PASS |
| C3 | `?aba=assistente`; digitado e miniatura mantidos; `navigate(-1)` volta | vitest `-t "troca de aba mantém o digitado"` `✓` | `:93` `expect(roteador.state.location.search).toBe('?aba=assistente')`; `:97`/`:105` `toHaveValue('Ana')`; `:99` `getByAltText('Miniatura: Logo')).toHaveAttribute('src', 'blob:imagem-nova')`; `:102` `roteador.navigate(-1)` e `:103` `expect(ativa()).toBe('Marca')` | PASS |
| C4 | `?aba=xyz` abre Marca; `?aba=login` abre Login | vitest `-t "aba desconhecida abre Marca"` `✓` | `:113` `expect(ativa()).toBe('Marca')` com `?aba=xyz`; `:117` `expect(ativa()).toBe('Login')` com `?aba=login` | PASS |
| C5 | Tudo salvo/Salvar desabilitado; Alterações não salvas/Salvar/Descartar; volta a Tudo salvo | vitest `-t "barra de salvar mostra o estado"` `✓` | `:132-134` `getByText('Tudo salvo')`, `salvar()).toBeDisabled()`, `queryByRole('button', { name: 'Descartar' })).not...`; `:137-139` `'Alterações não salvas'`, `toBeEnabled()`, `Descartar` presente; `:142-143` `findByText('Tudo salvo')`, `toBeDisabled()` | PASS |
| C6 | Descartar volta cor, nome e imagem ao salvo, sem PUT/POST | vitest `-t "descartar volta ao salvo sem chamar a API"` `✓` | `:156` `Nome do assistente)).toHaveValue('')`; `:158` `Cor principal)).toHaveValue('')`; `:159` `queryByAltText('Miniatura: Logo')).not...`; `:160` `Tudo salvo`; `:161` `expect(chamadas.filter((c) => c.metodo !== 'GET')).toEqual([])` | PASS |
| C7 | diálogo, Continuar editando, Sair sem salvar, beforeunload true/false, sem alteração sai direto | vitest `-t "sair sem salvar"` `✓` | `:175` `expect(aviso()).toBe(false)` sem alteração; `:177` `expect(aviso()).toBe(true)` (`aviso` lê `defaultPrevented`, `:170-173`); `:180` `findByRole('dialog', { name: 'Sair sem salvar?' })`; `:181` botão `Continuar editando`; `:183` pathname segue `/univag/aparencia`; `:187-188` `Sair sem salvar` e pathname `/univag/cadastros`; `:194-197` sem alteração: `aviso()` false, sai sem diálogo | PASS |
| C8 | 400 em `contato.email` e `nomeCurto`: pontos `com erro`, primeira aba ativa, texto e digitado ficam; 413 e 415 de imagem | vitest `-t "erro marca a aba e ativa a primeira"` e `-t "erro de imagem marca a aba"` `✓` | `:211` `expect(ativa()).toBe('App instalado')`; `:214-216` `within(marca('Contato')).getByLabelText('com erro')`, idem App instalado, `within(marca('Marca')).queryByLabelText('com erro')).not...`; `:219`/`:221` `toHaveValue('errado')`; imagem: `:226-227` 413/logo/Marca e 415/icone/App instalado, `:240` `toBe(aba)`, `:241` `getByLabelText('com erro')`, `:242` `findByText(detail)` | PASS |
| C9 | 360 px: lista rola, overflow-x auto, abas >=44 px, página sem rolagem | playwright `-g "abas a 360 px"` 1 passou | `aparencia.spec.ts:52` `expect(rolagem).toBeGreaterThan(visivel)`; `:53` `expect(estilo).toBe('auto')`; `:54` `(await caixa(aba)).height ... toBeGreaterThanOrEqual(44)` em cada aba; `:56` `expect(doc, 'sem rolagem horizontal').toBe(janela)` | PASS |
| C10 | prévia só do bloco ativo; 1280 px ao lado | vitest `-t "prévia por aba"` `✓`; playwright `-g "prévia ao lado a 1280 px"` passou | `aparenciaAbas.test.tsx:269` `expect(achar(), ...).toBeInTheDocument()` para o esperado e `.not.toBeInTheDocument()` para os 4 outros blocos, em cada uma das 5 abas (`esperado`, `:259-265`); `:274` `'Atendimento ao estudante'` na aba Login; `:276-278` contato com horário, `tel:`, `mailto:`; `aparencia.spec.ts:66` `expect(p.x, ...).toBeGreaterThanOrEqual(f.x + f.width - 1)` | PASS (ver observação 3) |
| C11 | rótulo Nome do app, dica, contador `5/12`, `13/12` vermelho | vitest `-t "nome do app com contador"` `✓` | `:288` dica exata; `:290` `getByText('5/12')`; `:292` `getByText('13/12')).toHaveClass('text-destructive')`; `:294` `6/12 ... not.toHaveClass` | PASS |
| C12 | dica do ícone e nota de atualização, textos exatos | vitest `-t "dicas do ícone e nota de atualização"` `✓` | `:302` `getByText(/PNG quadrado, sem transparência, com o desenho a pelo menos 10% das bordas\. O Android recorta as pontas\./)`; `:303` `getByText('Quem já instalou o app pode levar um tempo para ver o nome e o ícone novos.')` | PASS |
| C13 | Tela inicial com nome cortado em 12 caracteres; janela com barra na cor e nome completo; 3 origens do ícone | vitest `-t "tela inicial e janela do computador"` `✓` (e `-t "tela inicial sem ícone usa o do One"` do arquivo, mesmo `describe`) | `:316` `icones()).toEqual(['/api/instituicoes/univag/imagens/icone?v=3', ...])`; `:317` `getByText('Universidade')`; `:318` `queryByText('Universidade Federal')).not...`; `:319` nome completo `Univag` na barra; `:320` `toHaveStyle({ backgroundColor: Cor })` (cor SALVA); `:324` `['blob:imagem-nova','blob:imagem-nova']`; `:332` `'/icons/icon-192.png'`. **Mutante sobrevive**: `PreviaAparencia.tsx` `.slice(0, 12)` -> `.slice(0, 13)` e o teste segue verde, porque `getByText('Universidade')` apara o espaço final de `"Universidade "`. O limite de 12 não é provado do lado de cima. A cor DIGITADA na barra (claim "salva ou digitada") nunca é afirmada | FAIL |
| C14 | digitar e escolher ícone atualiza a prévia sem API | vitest `-t "prévia do app muda antes de salvar"` `✓` | `:340` `within(region 'Tela inicial').getByText('Univag')`; `:343` `getByTestId('icone-do-app'), regiao).toHaveAttribute('src', 'blob:imagem-nova')` para as duas regiões; `:345` `expect(chamadas.filter((c) => c.metodo !== 'GET')).toEqual([])` | PASS |
| C15 | meta do iPhone: `nomeCurto`, `nome`, sem slug removido | vitest `src/aparencia.test.tsx -t "título do app no iPhone"` `✓` | `aparencia.test.tsx:54` `toBe('Marca')` (nomeCurto), `:59` `toBe('Centro Universitário')` (sem nomeCurto), `:64` `expect(titulo()).toBeUndefined()` em `/` | PASS |
| C16 | salvar `Nova` troca meta e título sem recarregar | vitest `-t "salvar troca meta e título"` `✓` | `aparenciaAbas.test.tsx:364` `meta[name="apple-mobile-web-app-title"]` `toHaveAttribute('content', 'Nova')`; `:365` `expect(document.title).toBe('Nova')` | PASS |
| C17 | 8 rádios nomeados em `radiogroup` `Cores prontas`, seletor `Escolher cor`, contraste >=4,5 | vitest `-t "oito cores prontas com contraste"` `✓` | `:377` `getAllByRole('radio')...toEqual(Nomes)` (8 nomes na ordem); `:378` `getByLabelText('Escolher cor')).toHaveAttribute('type', 'color')`; `:381` laço nas 8: `contraste(valor do campo, nome)).toBeGreaterThanOrEqual(4.5)` | PASS |
| C18 | Azul One -> `#224fa7`, prévia, `aria-checked` 1 true e 7 false; cor livre deixa 8 false | vitest `-t "escolher amostra preenche e marca"` `✓` | `:391` `toHaveValue('#224fa7')`; `:393` `toHaveStyle('--marca-previa: #224fa7')`; `:394-395` `toEqual(Nomes.map((n) => `${n}:${n === 'Azul One'}`))`; `:398` `toEqual(Array(8).fill('false'))` | PASS |
| C19 | `#ffff00` mostra aviso vermelho e desabilita Salvar; amostra reabilita; testes antigos verdes | vitest `-t "cor sem contraste bloqueia o Salvar"` `✓` e `src/administracao/aparencia.test.tsx` inteiro (9 testes) `✓` | `:408` `getByText(/^Contraste com o branco:/)).toHaveClass('text-destructive')`; `:409` `expect(salvar()).toBeDisabled()`; `:411` `toBeEnabled()` após `Azul One`. Os 9 testes antigos de `aparencia.test.tsx` passaram; emendas avaliadas em `Test policy` abaixo | PASS |
| C20 | gate da AD-018: `crapper` <9.99 e `dryer` sem candidato 0.8 | `npm --prefix web run coverage` 66 arquivos, 628 testes passaram; `crapper --use-existing-coverage -s src --threshold 9.99` NÃO RODOU; `dryer -s src/acesso ... --threshold 0.8 ...` exit 0 | `crapper`: "Uma política de Controle de Aplicativo bloqueou este arquivo" (AD-044) - crapper NOT RUN; `dryer`: saída `No duplicate candidates found.`, exit 0 - dryer PASS | OPEN (não rodou) |

## Coverage

Membros recomputados do código e do plano (`Surface`, `Relations`, `Landing` e AC), não da tabela do `checks.md`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| abas, na ordem (5) | `abasDaAparencia.ts` `Abas` e AC 1 | Marca, App instalado, Login, Assistente, Contato -> C1 `:66` | - |
| campos por aba (5 abas, 12 campos de texto/imagem) | AC 2 e `Abas[].campos/imagens` | C2 `:72-84`, todos os rótulos em todas as abas | - |
| valores de `?aba=` (3) | AC 3 e AC 4 | `assistente` C3 `:93`; `xyz` C4 `:113`; `login` C4 `:117` | - |
| prévia por aba (5) | `PreviaAparencia.tsx` `Blocos` e AC 10 | Marca, App instalado, Login, Assistente, Contato -> C10 `:269`. Marca e Login usam o mesmo componente; a prévia de Assistente com perguntas (AC 10 "com as perguntas") não é afirmada em C10 (o fixture não traz perguntas), mas é afirmada nos testes antigos `identidade.test.tsx` e `aparencia.test.tsx` | - |
| estados da barra de salvar (3) | AC 5 | `Tudo salvo` `:132`; `Alterações não salvas` `:137`; depois de salvar `:142` | - |
| posição da barra de salvar ("fixa no rodapé") (1) | AC 5 e `Aparencia.tsx:190` | nenhum teste lê a posição | **sticky bottom-0 da barra sem prova** |
| saídas com alteração (3) | AC 7 | `Continuar editando` `:181`; `Sair sem salvar` `:187`; `beforeunload` `:177` e `:194` | - |
| erros que marcam aba (5) | AC 8 (`400` de campo; `413`, `415`, `400` de imagem) | `400` `contato.email` `:214`; `400` `nomeCurto` `:215`; `413` `:226`; `415` `:227` | **`400` de imagem (AC 8 nomeia `400`) sem prova**; mesmo caminho de código (`catch` genérico em `gravarTudo`), mas nenhum teste usa 400 em `POST /imagens/{tipo}` |
| origem do ícone na prévia (3) | AC 13 | padrão do One `:332`; escolhido `:324`; salvo `?v=3` `:316` | - |
| cor da barra da janela (2) | AC 13 ("salva ou digitada") | salva `:320` | **cor digitada sem prova** |
| corte do nome do app (limite 12) | AC 13 | `Universidade Federal` -> `Universidade` `:317-318`; lado de cima (13) não distingue | **mutante 13 sobrevive** |
| origem do `apple-mobile-web-app-title` (3) | AC 15 | `nomeCurto` `:54`; `nome` `:59`; sem slug `:64` | - |
| contador do nome do app (2) | AC 11 | dentro `:290`; acima `:292` | - |
| cores prontas (8) | `CoresProntas.tsx` `Prontas` | Azul One, Verde, Vinho, Roxo, Laranja, Grafite, Petróleo, Marrom -> C17 `:377` e `:381` (laço) | - |
| rotas da Surface do plano (0) | `None - nothing consumed outside`; `git diff --stat` não toca `One.Api/` | n/a | - |
| startup config (0) | n/a - nenhuma configuração de inicialização muda | n/a | - |
| strings de interface do AC (13 textos) | AC 5, 7, 11, 12, 17, 13 contra o código | `Alterações não salvas`/`Tudo salvo` (`Aparencia.tsx:192`), `Sair sem salvar?`/`Continuar editando` (`Aparencia.tsx`, `<Confirmar ... voltar="Continuar editando">`), dica do nome do app, dica do ícone, nota (`abasDaAparencia.ts`), `Cores prontas`, `Escolher cor` (`CoresProntas.tsx`), `Tela inicial`, `Janela do computador` (`PreviaAparencia.tsx`): todas idênticas às do `plan.md` | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Tela que decide (abas, aba com erro, estado de salvar, origem do ícone) | `Aparencia.tsx`, `PreviaAparencia.tsx`, `abasDaAparencia.ts`, `CoresProntas.tsx` | uma prova no DOM; um caso por linha da tabela de decisão | parcial: há prova de DOM para as 5 abas, as 3 origens do ícone, os erros 400/413/415 e os 3 estados da barra, mas o corte de 12 (lado de cima), a cor digitada da janela e o `400` de imagem não têm caso; veredito: **no** (ver mutante sobrevivente) |
| Medida de layout (rolagem, altura de toque, prévia ao lado) | `Aparencia.tsx` (`overflow-x-auto`, `min-h-11`, `lg:grid-cols`) | uma prova de Playwright com `boundingBox`; o número dito | yes para 360 px (`scrollWidth`, `overflow-x: auto`, altura >=44, página sem rolagem) e 1280 px (prévia à direita); a posição fixa da barra de salvar (AC 5) não é medida |
| Texto fixo sem decisão (dicas, rótulos) | `abasDaAparencia.ts`, `CampoImagem.tsx`, `Aparencia.tsx` | a prova do check que o cita; o texto exato | yes: C11 (`:288`), C12 (`:302-303`), C5 (`:132`, `:137`), C7 (`:180`, `:181`) afirmam o texto exato |

Emendas dos testes antigos (`git diff 490aa69..HEAD -- web/src/administracao/aparencia.test.tsx web/src/administracao/identidade.test.tsx web/src/ux.test.tsx web/e2e`), cada uma julgada:

| Mudança | Julgamento |
| --- | --- |
| `aparencia.test.tsx`: helper `ir(aba)` e `await ir('Login')`/`ir('Assistente')`/`ir('App instalado')` antes dos campos; "Nome curto" -> "Nome do app" | forçada pelo layout e equivalente: os valores esperados (`'Fale com a Univag'`, `Vagner`, o PUT) não mudaram |
| `aparencia.test.tsx` "erro da API": a asserção do título do login vai para depois de `ir('Login')`; comentário novo na asserção de cor | forçada e equivalente: mesma asserção, só reordenada |
| `aparencia.test.tsx` imagem com erro: o upload do logo vem antes do título; a asserção `toHaveValue('Fale com a Univag')` desce para depois de `ir('Login')` | forçada e equivalente (a tela passa sozinha para a Marca depois do erro) |
| `aparencia.test.tsx` "Ver prévia": `getAllByRole('heading', {level: 2}) ... toEqual(['Marca','Login','Assistente','Contato'])` -> `getAllByRole('tab') ... toEqual(['Marca','App instalado','Login','Assistente','Contato'])` | forçada e equivalente: os títulos de seção viraram abas; a asserção continua a lista ordenada |
| `aparencia.test.tsx` 4 imagens: cada tipo ganha a aba (`['logo','Logo','Marca']` etc.) | forçada e equivalente: mesmos `src` e botões esperados |
| `identidade.test.tsx`: dois cliques em abas (Assistente antes das asserções do assistente; Login antes do upload do login) | forçada e equivalente: nenhuma asserção removida nem alterada |
| `ux.test.tsx`: `MemoryRouter` -> `createMemoryRouter`/`RouterProvider` | forçada (a Aparência usa `useBlocker`, AD-047) e equivalente: asserções intactas |
| `identidade.spec.ts` C32: `4 seções com h2, caixa e espaço de 32 px` -> `5 painéis (tabpanel) sem borda nem fundo` | forçada; parte da asserção some: o título de nível 2 no topo da seção e o espaço de 32 px entre seções não têm o que medir sem seções empilhadas. Fica `bordas [0,0,0,0]` e `transparente` em cada painel. Não é enfraquecimento de regra, mas o ritmo de 32 px não tem substituto |
| `identidade.spec.ts` C39: serifa do login na Marca; a serifa do assistente depois de clicar `Assistente` | forçada e equivalente |
| `ux.spec.ts` C57: `amostra` também aceita `data-amostra` | restrita: `data-amostra` só existe em `CoresProntas.tsx:35`; a varredura continua a recusar o resto |
| `aparencia.spec.ts`: ordem das abas e Salvar; `aparencia-real.spec.ts`: clique em `App instalado` antes do ícone | forçadas e equivalentes |

A afirmação do cabeçalho do `checks.md` (os testes antigos só mudaram por abrir a aba antes) é quase verdadeira: as demais emendas são as da tabela acima, todas forçadas pelo layout; nenhuma asserção de regra foi enfraquecida.

## Faults injected

Em `git worktree add $env:TEMP\verif-aparencia HEAD` (fora do repositório), com junção para `node_modules`; cada falta revertida com `git checkout` no scratch. `git status --porcelain` da árvore real antes e depois: idênticos (só os untracked `demo-live-*.png` e `.specs/features/remover-comentarios/`, que já existiam).

| Mutation | Location | Killed |
| --- | --- | --- |
| ativar a última aba com erro em vez da primeira (`[0]` -> `.at(-1)`) | `web/src/administracao/Aparencia.tsx` (`abasComErro(f.campos, f.imagens)[0]`) | yes - `erro marca a aba e ativa a primeira`: expected 'Contato' to be 'App instalado' |
| `alterado` ignora imagens escolhidas e não salvas (`|| Object.keys(escolhidas).length > 0` removido) | `web/src/administracao/Aparencia.tsx` (`const alterado`) | yes - `erro de imagem marca a aba`: expected 'Contato' to be 'Marca' (o Salvar fica desabilitado) |
| corte do nome do app em 13 caracteres (`.slice(0, 12)` -> `.slice(0, 13)`) | `web/src/administracao/PreviaAparencia.tsx` (`nomeDoApp`) | **no** - `tela inicial e janela do computador` segue verde (1 passed); o espaço final é aparado pelo `getByText` |
| `apple-mobile-web-app-title` sempre com o `nome` (`(d.nomeCurto ?? d.nome)` -> `d.nome`) | `web/src/aparencia.tsx:78` | yes - `título do app no iPhone`: expected 'Centro Universitário' to be 'Marca' |
| `aria-checked` invertido nas cores prontas (`marcada` -> `!marcada`) | `web/src/administracao/CoresProntas.tsx` | yes - `escolher amostra preenche e marca`: arrays de `aria-checked` diferentes |

Superfícies não mutadas (limite de 5 faltas): a posição fixa da barra de salvar (a análise de código mostra que nada a afirma, ver `Coverage`), a medida de layout de Playwright (C9, C10) e os textos fixos.

## Gate

`npm --prefix web run coverage` - 66 arquivos, 628 passed, 0 failed (Vitest, suíte inteira).
`cd web; npx vitest run` dos 3 arquivos do check - 39 passed, 0 failed. `npx playwright test -c pw.tmp.config.ts aparencia.spec.ts -g "abas a 360 px|prévia ao lado a 1280 px"` - 2 passed, 0 failed.
`dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts` - exit 0, "No duplicate candidates found."
`crapper --use-existing-coverage -s src --threshold 9.99` - NÃO RODOU (AD-044, bloqueio do Windows Application Control). O C20 fica aberto como "não rodou", nunca como PASS.
Sem a bateria completa de Playwright (os testes de `identidade.spec.ts`/`ux.spec.ts` emendados dependem de build e não foram rodados; só os 2 do C9/C10, como pedido).

## Ranked gaps

1. C13: mutante sobrevivente no corte de 12 caracteres da "Tela inicial" (`.slice(0, 13)` passa) e a cor digitada da barra "Janela do computador" nunca é afirmada - `aparenciaAbas.test.tsx:317-320`, `PreviaAparencia.tsx` (`nomeDoApp`, `style backgroundColor`).
2. C20: `crapper` não rodou (AD-044); check aberto como "não rodou" - `npm --prefix web run coverage` ok, dryer ok.
3. C5/AC 5: a barra "fixa no rodapé" (`sticky bottom-0`, `Aparencia.tsx:190`) não tem check nem prova; é um elemento de arranjo que o plano decide.
4. C8/AC 8: `400` de imagem (AC 8 nomeia `413`, `415`, `400`) sem caso próprio; só `413`, `415` (e `503` no teste antigo) são exercitados.
5. Observação (não bloqueia sozinha): C10 não afirma as perguntas na prévia de Assistente (só nos testes antigos), e a medida de "prévia ao lado" a 1280 px só roda na aba `app`; o ramo de iniciais do nome do app sem `nomeCurto` não tem check.
