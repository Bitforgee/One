# Editor de fluxo dentro da casca - checks

Profile: ui
Plan: `.specs/features/editor-fluxo-integrado/plan.md`

25 checks em 3 slices e 1 emenda · 2 one-way doors (o endereço do editor e o roteador de dados) · 0 perguntas abertas (plano aprovado pelo usuário em 08/11: "aprovado pode fazer")

**Como as provas rodam.** Na raiz `D:\one-system`. Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"`; um filtro que não seleciona teste sai com 0 (L-002), então confira a contagem no relatório. Playwright mede com `boundingBox()` (px CSS, tolerância dita em cada check) contra o servidor de desenvolvimento: `npm --prefix web run dev` em outro terminal e, na raiz, `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "<nome>"`. A API é simulada por `page.route`; nada chama IA nem e-mail real. Mutação suspensa (AD-025).

As emendas de testes de features fechadas listadas em `## Impact` do plano valem como aprovadas ("aprovado pode fazer"): só trocam o papel `dialog` "Editar: Fluxos" pelo papel `region` de mesmo nome (a página mantém o nome acessível), o fim das esperas de "diálogo fechou" por "voltou à lista", e o `inset-0`/`w-screen` do K7 pela ausência do diálogo. As asserções de regra (cadeia, 5 etapas, simulação, publicação, corpos gravados) não mudam (C19).

## Checks

### S1 - o editor é uma página da casca · 5 arquivos · 52 KB · ~13k

**C1** - Clicar no nome do fluxo "Boletos" em Cadastros › Fluxos mostra o editor como `region` "Editar: Fluxos" com a barra lateral (`navigation`) à vista e nenhum `role="dialog"` aberto; no navegador o endereço passa a ser `/univag/cadastros/fluxos/7` (AC 1)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "abre na casca sem diálogo"`
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "endereço do editor"`

**C2** - A trilha é uma `nav` "Trilha" com `Cadastros` (`href` `/univag/cadastros`), `Fluxos` (`href` `/univag/cadastros?aba=fluxos`) e o texto `Boletos · ADS, 3º semestre` como item atual (`aria-current="page"`) (AC 2)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "trilha do editor"`

**C3** - Abrir `/univag/cadastros/fluxos/7` direto mostra o editor de "Boletos" com as 2 etapas `Liderança do semestre` e `Coordenação do curso`, sem passar pela lista (AC 3)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "abre direto pelo endereço"`
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "recarregar mantém o editor"`

**C4** - `/univag/cadastros/fluxos/999` mostra `Fluxo não encontrado.` e o link `Voltar aos fluxos` (`href` `/univag/cadastros?aba=fluxos`), e não mostra a `region` "Editar: Fluxos" (AC 4)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "fluxo inexistente"`

**C5** - No navegador, do editor o botão Voltar leva a `/univag/cadastros?aba=fluxos` com a aba Fluxos selecionada (`tab` "Fluxos" com `aria-selected="true"`) (AC 5)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "voltar do navegador"`

**C6** - Com o editor aberto, o link `Cadastros` do menu lateral tem `aria-current="page"` e o `h1` do cabeçalho é `Cadastros` (AC 6)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "menu ativo e título"`

**C7** - Publicar um rascunho aceito pela API volta à lista de Cadastros com a aba Fluxos aberta e mostra `Fluxo publicado.`; Descartar rascunho volta do mesmo modo e mostra `Rascunho descartado.` (AC 7)
Proof: `cd web && npx vitest run src/administracao/fluxos.test.tsx -t "simular e publicar"`
Proof: `cd web && npx vitest run src/administracao/fluxos.test.tsx -t "descartar o rascunho"`
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "avisos ao voltar à lista"`
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "avisos ao descartar"`

**C8** - Salvar rascunho aceito pela API mantém o editor na tela, mostra `Rascunho salvo.` e o estado `Rascunho salvo` (AC 8)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "salvar fica no editor"`

**C9** - Com uma etapa adicionada e não salva, acionar a trilha `Fluxos`, a trilha `Cadastros` ou o botão `Voltar` abre o diálogo `Sair sem salvar?` com `Continuar editando` e `Sair sem salvar`; `Continuar editando` fecha o diálogo e mantém o editor com a etapa nova; `Sair sem salvar` leva à lista (AC 9)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "sair sem salvar"`

**C10** - Sem nenhuma alteração, a trilha e o `Voltar` levam à lista sem abrir diálogo algum; depois de Salvar rascunho também (AC 10)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "sair sem alterações"`

**C11** - Com alterações não salvas o evento `beforeunload` sai com `defaultPrevented` verdadeiro; sem alterações, falso (AC 11)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "fechar a aba com alterações"`

**C20** - Um atendente (sem o papel ADMINISTRADOR) que abre `/univag/cadastros/fluxos/7` não vê o editor: a casca o leva à tela inicial dele (a fila), como faz com qualquer rota sem permissão (403 da tela) (Surface)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "sem o papel de administrador"`

### S2 - o desenho ocupa o espaço da página · 4 arquivos · 36 KB · ~9k

**C12** - Em 1440×900 e em 1280×800, na visão Canvas, a base do canvas fica a no máximo 16 px do fim da janela, o canvas e o painel lateral são vizinhos (o painel com 320 px de largura, ±1 px) e `scrollHeight` do documento é igual a `clientHeight` (sem rolagem da página) (AC 12)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "canvas ocupa a página"`

**C13** - No Canvas, sem etapa selecionada o painel lateral mostra `Simular um aluno`; selecionar uma etapa (Enter no nó) troca o título para `Etapa selecionada`; em ambos os casos o painel está inteiro dentro da janela (AC 13)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "painel lateral troca"`

**C14** - A barra do editor tem, da esquerda para a direita, o botão `Voltar`, o estado (`Publicado v2`), as visões `Lista` e `Canvas`, `Simular`, `Salvar rascunho`, `Publicar` e `Mais` (com `Descartar rascunho`) (emenda do builder após a rodada 1: a ordem do texto antigo punha o `Voltar` por último, mas o plano e o código o põem primeiro); não existe `Cancelar`; em 1440 px todos esses controles têm o mesmo centro vertical, com diferença de no máximo 2 px (uma linha; emenda do builder, anotada no relatório: era "o mesmo `y` do topo, ≤ 8 px", que o selo de estado, mais baixo, não cumpre mesmo estando na mesma linha) (AC 14)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "barra do editor"`
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "barra em uma linha"`

**C15** - Na visão Lista em 1440 px, a coluna das etapas e do simulador não passa de 768 px de largura e o simulador fica abaixo da última etapa (AC 15)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "lista na largura de leitura"`

### S3 - no celular o editor também é página · 2 arquivos · 12 KB · ~3k

**C16** - Em 390 px o editor é página (sem `role="dialog"`), na visão Lista, com a frase `O canvas está disponível em telas maiores.`, o simulador abaixo e cada botão da barra com 44 px de altura ou mais (AC 16)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "celular em página"`

**C17** - Em 390 px a barra do editor quebra em mais de uma linha e `scrollWidth` do documento é igual a `clientWidth` (AC 17)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "celular sem rolagem lateral"`

### Emenda de 08/11 (melhor usabilidade) - guarda de saída total e atalho · 4 arquivos · 20 KB · ~5k

**C22** - Com uma etapa adicionada e não salva, clicar no link `Fila` da barra lateral abre `Sair sem salvar?`; `Continuar editando` mantém a `region` "Editar: Fluxos" com a etapa; `Sair sem salvar` leva à Fila (AC 18)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "barra lateral com alterações"`
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "descartar depois de editar sai sem perguntar"`

**C23** - Com uma etapa adicionada e não salva, o Voltar do navegador abre `Sair sem salvar?`; `Continuar editando` deixa o endereço em `/univag/cadastros/fluxos/7`; sem alterações o Voltar do navegador sai direto (AC 18)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "voltar do navegador com alterações"`

**C24** - Ctrl+S (e ⌘+S) no editor com cadeia válida envia `PUT /api/admin/fluxos/7/rascunho` com o mesmo corpo do botão `Salvar rascunho` e o evento sai com `defaultPrevented` verdadeiro (e a cadeia válida grava uma vez no navegador); com a cadeia inválida (um nó solto no canvas, que desliga o botão Salvar rascunho) ou durante uma gravação, nada é enviado e `defaultPrevented` continua verdadeiro (AC 19, AC 20)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "Ctrl+S salva o rascunho"`
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- editor-fluxo.spec.ts -g "Ctrl+S com cadeia inválida"``

**C25** - O roteador é de dados: `main.tsx` usa `createBrowserRouter` e `RouterProvider` uma vez cada e não usa `<BrowserRouter`; `abrir()` de `test/util.tsx` usa `createMemoryRouter` (Landing, door 2)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "roteador de dados"`
### Fechamento

**C18** - O endereço do editor é exatamente `/:slug/cadastros/fluxos/:id` com `id` numérico: `/univag/cadastros/fluxos/abc` não abre o editor e não quebra a casca, e a rota está declarada uma vez em `App.tsx` (Landing, door 1)
Proof: `cd web && npx vitest run src/administracao/paginaDoFluxo.test.tsx -t "endereço do editor"`

**C19** - Nada além do planejado quebra: o Vitest inteiro sai 0, o build com tipos sai 0, e os specs existentes `fluxos.spec.ts`, `arranjo.spec.ts`, `identidade.spec.ts`, `celular.spec.ts` e `ux.spec.ts` saem 0, à parte as falhas de ambiente já registradas na rodada de `chat-linha-do-tempo` (fontes e PWA, que esperam o app compilado). `git diff <base>..HEAD` nos testes existentes não remove nenhuma asserção além das do diálogo (Impact)
Proof: `cd web && npx vitest run`
Proof: `npm --prefix web run build`
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- fluxos.spec.ts arranjo.spec.ts identidade.spec.ts celular.spec.ts ux.spec.ts`

**C21** - O `crapper` sobre `web/src` sai 0 no limite 9.99 e o `dryer` não acha candidato com nota 0.8 ou mais (AD-018). Se o `crapper` seguir bloqueado neste computador (AD-044), o check fica aberto como "não rodou", nunca como PASS
Proof: `npm --prefix web run coverage; cd web; crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web; dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| tela `/:slug/cadastros/fluxos/:id` statuses (3) | 200 C1, C3 · 404 C4 · 403 C20 | - |
| formas de chegar ao editor (3) | clique na lista C1 · endereço direto C3 · recarregar C3 | - |
| formas de sair do editor (7) | trilha Cadastros C9 · trilha Fluxos C9 · Voltar C9 · Voltar do navegador C5, C23 · fechar a aba C11 · link da barra lateral C22 · link do cabeçalho C22 | - |
| saída com e sem alterações (2) | com alterações C9 · sem alterações C10 | - |
| fim de uma gravação (3) | Publicar C7 · Descartar C7 · Salvar rascunho C8 | - |
| painel lateral (2) | Simular um aluno C13 · Etapa selecionada C13 | - |
| visões (2) | Canvas C12 · Lista C15 | - |
| larguras (4) | 390 C16, C17 · 1024 ou mais C12 (1280 e 1440) · lista em 1440 C15 · barra em 1440 C14 | - |
| teclas (2) | Ctrl+S C24 · ⌘+S C24 | - |
| critérios do plano (20) | AC 18 C22, C23 · AC 19 C24 · AC 20 C24 · AC 1 C1 · AC 2 C2 · AC 3 C3 · AC 4 C4 · AC 5 C5 · AC 6 C6 · AC 7 C7 · AC 8 C8 · AC 9 C9 · AC 10 C10 · AC 11 C11 · AC 12 C12 · AC 13 C13 · AC 14 C14 · AC 15 C15 · AC 16 C16 · AC 17 C17 | - |
| doors do `Landing` (2) | endereço do editor C18 · roteador de dados C25 | - |

- Afirmam arranjo medido em navegador real: C5, C12 a C17, todos com `boundingBox()` ou `getComputedStyle`
- Afirmam texto e comportamento em jsdom: C1 a C4, C6 a C11, C14, C18, C20
- Nenhuma rota de API nova (a `Surface` só lista a rota de tela)

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide, na tela (achar o fluxo pelo id, guarda de saída, para onde cada fim de gravação volta) | uma na própria camada (Vitest) | um caso por linha das tabelas de decisão |
| Arranjo (alturas, larguras, uma linha, painel de 320 px) | uma no navegador real (Playwright) | cada largura citada no plano |
| Instrumentation (classes, ícones, textos fixos) | nenhuma própria | coberta pelo consumidor |

Evidence:

- `PaginaDoFluxo` (nova): 1 busca por id com 2 saídas (achou, não achou), 1 guarda de saída com 2 estados, 3 destinos de volta -> 6 pontos de decisão
- `EdicaoDoFluxo`: as 4 funções de gravação já são provadas por `fluxos.test.tsx`; muda só o invólucro
- análogo no repositório: `ChamadoDetalhe` lê `useParams` e mostra `ErroDe` quando o chamado não existe (`chamado.test.tsx`)

Cost: 1 arquivo de Vitest novo (`paginaDoFluxo.test.tsx`) e 1 spec novo de Playwright (`editor-fluxo.spec.ts`). Sem eles o arranjo só seria visto por quem olha o print.

## Swept

- validation: C4 (id inexistente) e C18 (id que não é número)
- failure modes: existing - `ErroDe` mostra a falha de leitura e de gravação, sem mudança; C4 cobre o fluxo que sumiu
- idempotency: n/a - a tela não grava nada ao abrir; Publicar e Descartar são as mesmas chamadas de hoje
- authorization: C20
- concurrency: existing - `useGravacao` desliga os botões enquanto grava (`fluxos.test.tsx`, "simular e publicar"); edição por duas pessoas está fora de escopo
- data lifecycle: n/a - nada é gravado ou apagado por esta mudança
- dependency failure: existing - se o pacote do canvas não carrega, o editor mostra a Lista e o aviso (`FalhaDoCanvas`, `canvas.test.tsx`)
- state transitions: C7, C8, C9, C10
- observability: n/a - sem log nem métrica nova; o estado do fluxo aparece na barra

## Out of scope

- Autosave do rascunho (n8n 2.4) - muda quando o rascunho existe
- Histórico de versões e bloqueio por duas pessoas - capacidade nova
- Editar a etapa num modal ao dar duplo clique - o painel lateral já cumpre o papel
- Regras do fluxo, limite de 5 etapas, destinos e simulação - não mudam (AD-041, AD-042)

## Handoff

Estimativa por `wc -c` dos arquivos que cada fatia toca, dividida por 4:

- S1 = `EdicaoDoFluxo.tsx` 11 KB + `Cadastros.tsx` 17 KB + `App.tsx` 3 KB + testes novos ≈ 52 KB ≈ 13k
- S2 = `Canvas.tsx` 13 KB + `EdicaoDoFluxo.tsx` 11 KB + `Simulador.tsx` 3 KB + `PainelDoNo.tsx` 3 KB + spec novo ≈ 36 KB ≈ 9k
- S3 = `EdicaoDoFluxo.tsx` + spec novo ≈ 12 KB ≈ 3k
- Emendas em `fluxos.test.tsx` 12 KB, `canvas.test.tsx` 20 KB, `cadastros.test.tsx` 16 KB e 3 specs e2e ≈ 80 KB ≈ 20k; total ≈ 45k, abaixo do orçamento de 150k
- Mechanism: one builder (cabe no orçamento, sem pergunta)

Base da feature: `9d80016`. A emenda de 08/11 (C22 a C25) foi pedida pelo usuário ("aplique o que for melhor pra usabilidade") depois da rodada 2 do Verificador.
