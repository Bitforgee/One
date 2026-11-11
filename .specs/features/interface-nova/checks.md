# Interface nova - checks

Profile: ui
Plan: `.specs/features/interface-nova/plan.md`

94 checks em 10 slices · 16 one-way doors · 0 perguntas abertas, 1 condição de parada herdada do plano (Tiptap sob o jsdom, C69 a C74)

**Como as provas rodam.** Todos os comandos rodam na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é
o commit que congela `plan.md` e `checks.md`, gravado no `## Handoff`. Cada prova nomeia um teste, um
script ou um comando; o nome é o contrato com o construtor. Um filtro que não seleciona teste nenhum
sai com código 0 (L-002): antes de dar uma prova por verde, confira com `--list` (Playwright) ou com a
contagem do relatório (Vitest) que o filtro rodou ao menos 1 teste, e o número que o check diz.

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `web/` unidade | Vitest + Testing Library: `cd web && npx vitest run <arquivo> -t "<nome>"` | `npm --prefix web ci` |
| `web/` e2e | Playwright contra o app do `docker compose` (porta 8080): `cd web && npx playwright test <arquivo> -g "<nome>"` | o contêiner `api` reconstruído com o `web/` do commit (ver `## Handoff`) |
| barreiras do AD-018 | `crapper`, `dryer`, `mutator` dentro de `web/` | `npm --prefix web run coverage` |
| build e PWA | `npm --prefix web run build` (grava `api/wwwroot`) e scripts em `.specs/features/interface-nova/` | `npm --prefix web ci` |

**Regra dos textos** (vale para todo check "Textos da tela N"). Texto visível = o `textContent` da tela
sem as subárvores com classe `sr-only` ou `aria-hidden="true"`. Em cada estado que o teste abre, tirando
do texto visível cada literal da linha N de `## Screens` (com os `{campos}` preenchidos pelo fixture),
cada literal da linha 0 nas telas autenticadas e cada valor do fixture como a tela o formata, não sobra
nenhuma letra nem dígito (`/[\p{L}\p{N}]/u`); e somando os estados, cada literal da linha N aparece ao
menos uma vez, literalmente. Literais em alternativa ("Novo artigo"/"Editar artigo") contam como dois.

**Regra do arranjo** (vale para todo check "Arranjo"): medidas com `boundingBox()` do Playwright, em px
CSS, tolerância de 1 px salvo quando o check diz outra; "abaixo" = topo maior que o fundo do outro;
"mesma linha" = topos com diferença de no máximo 4 px.

## Checks

### S0 - Invariantes de toda a feature (P1) · ~10 files · ~53 KB · ~21k

**C1** - A suíte Vitest inteira (99 testes em `<base>`) e o e2e inteiro (11 testes em `<base>`) passam em cada commit desta feature, com os testes novos (AC 1)
Proof: `cd web && npx vitest run`
Proof: `cd web && npx playwright test`

**C2** - `.specs/features/interface-nova/seletores_conferem.py <base>` sai 0: toda linha de asserção removida ou alterada entre `<base>` e HEAD em `web/src/**/*.test.ts`, `web/src/**/*.test.tsx` e `web/e2e/**` (o critério do `conferir` de `asserts_preservados.py`, estendido a `.test.ts`) aparece na coluna `Antes` da tabela de `seletores.md` com `Depois` e `Afirmação` preenchidos, toda linha da coluna `Antes` é uma dessas (nenhuma sobra), e nenhuma linha adicionada traz `.skip(` nem `.only(`; o `--autoteste` do script mata uma linha faltando, uma linha sobrando e um `.only(` (AC 1, AC 2)
Proof: `python .specs/features/interface-nova/seletores_conferem.py --autoteste`
Proof: `python .specs/features/interface-nova/seletores_conferem.py <base>`

**C3** - Cada chamada `getByRole(`, `findByRole(`, `queryByRole(`, `getAllByRole(`, `findAllByRole(`, `queryAllByRole(`, `*ByLabelText(` e `getByLabel(` com o texto dos argumentos de `<base>` nos arquivos de teste do C2 aparece em HEAD pelo menos o mesmo número de vezes (multiconjunto) (AC 5)
Proof: `python .specs/features/interface-nova/consultas_preservadas.py --autoteste`
Proof: `python .specs/features/interface-nova/consultas_preservadas.py <base>`

**C4** - Rodando a suíte Vitest de `<base>` e a de HEAD, cada uma num `git worktree` próprio e com um arquivo de setup que grava `fetch.mock.calls` por teste: para cada teste que existe em `<base>` (pelo nome completo), o multiconjunto de (método, URL, corpo) das chamadas que não são `GET` é igual nos dois, e o conjunto de URLs `GET` distintas também; arquivos em `FormData` comparados por nome, tipo e tamanho (AC 3)
Proof: `python .specs/features/interface-nova/chamadas_iguais.py --autoteste`
Proof: `python .specs/features/interface-nova/chamadas_iguais.py <base>`

**C5** - O `crapper` sobre `web/src` inteiro, `ui/` incluído, sai 0 no limite 9.99 depois da cobertura (AC 6, door 4)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`

**C6** - O `dryer` sobre as 6 fatias e os 7 arquivos da raiz da door 4 não acha candidato com nota 0.8 ou mais (AC 7, door 4)
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx | grep -q "No duplicate candidates found"`

**C7** - `.specs/features/interface-nova/mutator_web.sh` é o `mutator_web.sh` do `refatoracao-solid` com o `PYTHONPATH` apontando para `.specs/features/refatoracao-solid/mutator_windows` e a lista de caminhos da door 4 (as 6 fatias e `src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx`), e sai 0: nenhum mutante sobrevivente (AC 8, door 4)
Proof: `npm --prefix web run coverage && bash .specs/features/interface-nova/mutator_web.sh`

**C8** - O describe "sem rolagem horizontal a 360 px" de `plataforma.spec.ts` tem 15 testes, um por tela de `## Screens` (os 10 de hoje mais "Raiz" em `/`, "Primeiro acesso" em `/univag/primeiro-acesso`, "Criar senha" em `/univag/definir-senha?token=x`, "Trocar senha" em `/univag/trocar-senha` e "Documentos" em `/univag/documentos`), e em cada um `document.documentElement.scrollWidth` é no máximo 360 a 360 × 740 (AC 9)
Proof: `cd web && npx playwright test e2e/plataforma.spec.ts -g "sem rolagem horizontal a 360 px"`

**C9** - Todo valor de `dependencies` e `devDependencies` de `web/package.json` casa `/^\d+\.\d+\.\d+$/`, e nenhuma das chaves `ai`, `@ai-sdk/react`, `streamdown` e `next-themes` existe (AC 10)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "versões exatas e pacotes proibidos"`

**C10** - Depois de `npm --prefix web run build`, todo arquivo `.js`, `.css`, `.html`, `.png`, `.svg` e `.woff2` de `api/wwwroot`, fora o próprio `sw.js` e os `workbox-*.js`, está no manifesto de precache do `sw.js`, e nenhuma URL do manifesto começa com `api/` nem `/api/` (AC 11)
Proof: `npm --prefix web run build && python .specs/features/interface-nova/precache_completo.py api/wwwroot`

**C11** - Nenhum arquivo de `web/src` importa `@/ui/select`, `@/ui/alert-dialog`, `@/ui/date-picker` nem `@radix-ui/react-select`/`@radix-ui/react-alert-dialog`, e esses arquivos não existem em `web/src/ui/`; "De", "Até", "Válido de (opcional)" e "Válido até (opcional)" são `<input type="date">`, e "Arquivo CSV", "Arquivo PDF" e "Anexos (PDF, JPG ou PNG, até 10 MB cada)" são `<input type="file">`, cada um achado pelo rótulo (doors 5, 6)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "sem Select do Radix nem AlertDialog"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "controles nativos"`

### S1 - Fundação: Tailwind, shadcn/ui, dados e cabeçalho (P1) · ~30 files · ~83 KB · ~34k

**C12** - `vite.config.ts` tem `plugins: [react(), tailwindcss(), VitePWA(` nessa ordem e o alias `'@'` para `./src`; `components.json` tem `"style": "new-york"`, `tailwind.config` `""`, `tailwind.css` `"src/index.css"`, `tailwind.cssVariables` `true` e os aliases `components` `@/ui`, `ui` `@/ui`, `utils` `@/ui/utils`, `lib` `@/ui`, `hooks` `@/ui`; `tsconfig.json` tem `"@/*": ["./src/*"]` (doors 1, 3)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "configuração do Tailwind e do shadcn"`

**C13** - Enquanto algum arquivo de `web/src` importa `react-bootstrap`, `index.css` começa com `@layer theme, base, bootstrap, components, utilities;`, importa `bootstrap/dist/css/bootstrap.min.css` só com `layer(bootstrap)` e nenhum outro arquivo de `web/src` importa esse CSS; quando nenhum importa, `index.css` não tem `bootstrap` e `package.json` não tem `bootstrap`, `react-bootstrap` nem `bootstrap-icons` - o teste afirma o ramo que vale no commit (AC 12, AC 47, door 2)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "camada do Bootstrap"`

**C14** - As pastas de `web/src` são exatamente as 6 fatias, `test` e `ui`; `cn` é declarado só em `web/src/ui/utils.ts`; `radix-ui`, `@radix-ui/*`, `vaul`, `class-variance-authority`, `use-stick-to-bottom`, `clsx` e `tailwind-merge` só são importados por arquivos de `web/src/ui/` (AC 13, door 3)
Proof: `cd web && npx vitest run src/test/estrutura.test.ts -t "estrutura em fatias"`

**C15** - `.specs/features/interface-nova/ui_isolada.sh` planta, um por vez, `web/src/ui/plantado.ts` importando `../api`, `@/api`, `../chamados/Chamados` e `@/chamados/Chamados`; com cada um o teste "estrutura em fatias" falha, sem o arquivo ele passa, e o script apaga o arquivo e sai 0 só se os 5 resultados forem esses (AC 14, door 3)
Proof: `bash .specs/features/interface-nova/ui_isolada.sh`

**C16** - Para `ALUNO`, `ATENDENTE` e `ADMINISTRADOR`, a tela tem exatamente 1 `navigation`, e dentro dela o nome da instituição, os links do papel nesta ordem (ALUNO: "Assistente", "Minhas solicitações"; ATENDENTE: "Fila", "Indicadores"; ADMINISTRADOR: "Artigos", "Documentos", "Indicadores", "Usuários", "Matrículas", "Cadastros"), o botão "Menu" e "Sair" (AC 15)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "cabeçalho num único nav por papel"`

**C17** - Cada link do cabeçalho traz o ícone Lucide de `## Visual` (`lucide-message-circle` Assistente, `lucide-list-checks` Minhas solicitações, `lucide-inbox` Fila, `lucide-book-text` Artigos, `lucide-file-text` Documentos, `lucide-chart-column` Indicadores, `lucide-users` Usuários, `lucide-upload` Matrículas, `lucide-settings` Cadastros), "Sair" traz `lucide-log-out` e "Menu" traz `lucide-menu`, todos com `aria-hidden="true"`
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "ícones Lucide do cabeçalho"`

**C18** - A 360 × 740 com os 3 papéis, a barra `<nav>` tem 56 px de altura e o topo continua em 0 depois de rolar a página 300 px no detalhe do chamado; tocar "Menu" abre um `dialog` de nome "Menu" com os 9 links na ordem do array `Menu` ("Assistente", "Minhas solicitações", "Fila", "Artigos", "Documentos", "Indicadores", "Usuários", "Matrículas", "Cadastros") e "Sair" por último, cada um com 48 px de altura; só com `ALUNO`, a gaveta tem exatamente "Assistente", "Minhas solicitações" e "Sair" (AC 16, `## Screens` linha 0)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "cabeçalho a 360 px abre a gaveta Menu"`

**C19** - Com 640 px de largura, os 9 links e "Sair" estão visíveis dentro do `<nav>`, "Sair" à direita de todos os links, e o botão "Menu" não está visível; com 639 px, "Menu" está visível e nenhum link está (AC 17)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "cabeçalho a 640 px mostra os links na barra"`

**C20** - Com `GET /api/auth/me` respondendo 500, o `fetch` dessa URL é chamado exatamente 1 vez e a tela mostra "Não foi possível carregar sua sessão. O serviço está indisponível no momento." com o botão "Tentar de novo", sem o campo "CPF" (emenda de 09/11/2026, AD-050, feature `sessao-erro-transitorio`; antes: "a tela vai para o Login"); com o `me` carregado, disparar `focus` e `visibilitychange` na janela não faz nenhuma chamada nova; montando o `App` uma segunda vez com `/api/auth/me` pendente para sempre, a tela mostra o status "Carregando" e não o nome da instituição da primeira montagem (AC 18, door 7)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "QueryClient por montagem sem nova tentativa nem releitura no foco"`

**C21** - Em `/univag`, `getComputedStyle(document.body).fontFamily` começa com `"Inter Variable"`, `document.fonts.check('16px "Inter Variable"')` é verdadeiro depois de `document.fonts.ready`, e nenhuma requisição da página vai para outra origem que não a do app (AC 20, door 12)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "fonte Inter do próprio app"`

**C22** - Convertendo os valores `oklch` de `index.css` para sRGB, o contraste é de pelo menos 4.5:1 em cada um dos 8 pares: `--foreground`/`--background`, `--primary-foreground`/`--primary`, `--muted-foreground`/`--background` e `--destructive`/`--background`, em `:root` e em `.dark` (AC 21)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "contraste dos tokens"`

**C23** - `index.css` declara em `:root` e em `.dark` os 13 tokens de `## Visual` com os valores da tabela (`--chart-1` como `var(--primary)`), expostos por `@theme inline`, com `--font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif`; nenhum `.ts`/`.tsx` de `web/src` contém `#` seguido de 3 ou 6 dígitos hexadecimais, `oklch(`, `rgb(` nem `hsl(` (`## Visual`)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens da paleta"`

**C24** - "dependências do kit de interface" afirma com `toBe` a versão exata de `tailwindcss`, `@tailwindcss/vite`, `lucide-react`, `@tanstack/react-query` e `vaul`, mantém `react-router` 8 e `vite-plugin-pwa` `2.0.0`, e afirma a ausência de `next-themes`, `ai`, `@ai-sdk/react` e `streamdown` (door 9, AC 10)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "dependências do kit de interface"`

**C25** - `App.tsx` monta `QueryClientProvider`, `ThemeProvider`, `MotionConfig` e `Toaster`, e `main.tsx` não monta nenhum deles e renderiza `<App />`; o `abrir` de `test/util.tsx` renderiza o mesmo `App` (startup config, doors 7, 10, 13)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "provedores dentro do App"`

**C26** - Enquanto algum arquivo de `web/src` importa `react-bootstrap`, com `matchMedia('(prefers-color-scheme: dark)')` falso e verdadeiro, `<html>` tem a classe `light` e não `dark`, e não há botão "Tema"; quando nenhum importa, o botão "Tema" existe - o teste afirma o ramo que vale no commit (AC 48, door 10)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tema claro enquanto houver react-bootstrap"`

**C27** - Textos da tela 0 (cabeçalho) pela regra dos textos, nos estados: carregando, cada papel, gaveta aberta (AC 4)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx -t "textos cabeçalho"`

### S2 - Assistente (P1) · ~12 files · ~57 KB · ~31k

**C28** - A conversa fica dentro de um `role="log"`; a mensagem do aluno fica num balão com `ms-auto` e `bg-primary-subtle`, a do assistente e a do atendente com `me-auto` (AC 22)
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx -t "a conversa fica num log"`
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx -t "sem conversa: exemplo, sem Encerrar, e a mensagem do aluno à direita"`
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx -t "transferido mostra o autor só nas respostas do atendente"`

**C29** - Com a resposta `"**negrito**\n- item\n<b>x</b> &amp;"`, o balão do assistente tem exatamente esse `textContent`, nenhum `strong`, `li`, `b` nem `ul` dentro, e a classe `whitespace-pre-wrap` (AC 23, door 8)
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx -t "resposta do modelo em texto puro"`

**C30** - Enquanto a resposta não chega, aparecem o status de nome "Digitando" e o texto "digitando…" (AC 24)
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx -t "enquanto o assistente responde, mostra digitando"`

**C31** - "Falar com atendente" tem a classe `bg-primary` (variante `default`) depois de um `sem_base`, depois do "Não" e no limite de 10 mensagens, e `bg-background` sem `bg-primary` (variante `outline`) sem conversa e em conversa aberta (AC 25)
Proof: `cd web && npx vitest run src/assistente/assistente.test.tsx -t "sem_base destaca Falar com atendente"`
Proof: `cd web && npx vitest run src/assistente/assistente.test.tsx -t "Não mostra Quer explicar melhor"`
Proof: `cd web && npx vitest run src/assistente/assistente.test.tsx -t "limite destaca Falar com atendente"`

**C32** - A 360 × 740, com 4 mensagens de respostas longas e `scrollHeight` acima de 740, as caixas de "Enviar" e "Falar com atendente" ficam entre y 0 e 740 com a página no topo e no fim da rolagem (AC 26)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "compositor visível com a conversa maior que a tela"`

**C33** - Com `reducedMotion: 'reduce'`, amostrando o balão novo a cada quadro por 600 ms desde a inserção, todo `transform` calculado é `none` ou a identidade (AC 27)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "movimento reduzido sem animação"`

**C34** - Sem redução de movimento, nas mesmas amostras o balão novo tem ao menos um `transform` com deslocamento vertical acima de 0 e no máximo 8 px, e `opacity` calculada `1` em todas (AC 28)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "mensagem nova anima só com transform"`

**C35** - Com `onlineManager.setOnline(false)` e o `fetch` rejeitando com `TypeError('Failed to fetch')`, enviar uma mensagem mostra um `alert` com "Failed to fetch" e o `fetch` é chamado exatamente 1 vez (AC 19 em mutação, door 7)
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx -t "sem rede o envio mostra o erro"`

**C36** - `web/src/ui/conversation.tsx` e `web/src/ui/message.tsx` existem; `message.tsx` exporta exatamente `Message` e `MessageContent`; nenhum arquivo de `web/src` contém `ConversationScrollButton` nem `MessageResponse` (door 8)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "AI Elements só visual"`

**C37** - Textos da tela 6 (Assistente) pela regra dos textos, nos estados: sem conversa, digitando, resposta com "Isso resolveu?", depois do "Não", limite, diálogos "Falar com um atendente?" (com e sem conversa) e "Encerrar a conversa?", transferido, encerrada pelo "Sim" e pelo "Encerrar", erro (AC 4)
Proof: `cd web && npx vitest run src/assistente/textos.test.tsx -t "textos Assistente"`

**C38** - Arranjo da tela 6: a 360 px, de cima para baixo, título, aviso, `log` e compositor; o balão do aluno termina na borda direita do `log` e o do assistente começa na esquerda, cada um com largura de no máximo 90% do `log`; "Isso resolveu?" abaixo da última resposta; "Falar com atendente" e "Encerrar" na mesma linha, abaixo de "Enviar"; o diálogo "Encerrar a conversa?" tem x 16 e largura 328, com "Confirmar" acima de "Cancelar" e "Cancelar" antes de "Confirmar" no DOM; a 1024 px a coluna tem no máximo 768 px e está centralizada (`## Screens` linha 6, estados comuns)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo Assistente"`

### S3 - Detalhe do chamado (P1) · ~12 files · ~65 KB · ~37k

**C39** - No detalhe, a mensagem pública do aluno tem `ms-auto` e `bg-primary-subtle`, a do atendente `me-auto`, a nota interna `bg-warning-subtle` com o selo "Nota interna", e a transcrição põe o aluno em `ms-auto` e o assistente em `me-auto` (AC 29)
Proof: `cd web && npx vitest run src/chamados/resposta.test.tsx -t "mensagens mostram autor, nota interna e anexo com o tamanho"`
Proof: `cd web && npx vitest run src/chamados/resposta.test.tsx -t "a conversa com o assistente alinha o aluno à direita e avisa documento atualizado"`

**C40** - A fonte de documento traz o ícone de nome "Documento" com a classe `lucide-file-text`, e a de artigo o de nome "Artigo" com `lucide-book-text` (AC 30)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "fonte de documento no detalhe"`

**C41** - Com relógio falso no detalhe, `GET /api/chamados/ONE-1` foi chamado 1 vez aos 14 999 ms, 2 vezes aos 15 000 ms e 3 vezes aos 30 000 ms (AC 31, Flow 5)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "detalhe relê o chamado a cada 15 s"`

**C42** - "Anexos (PDF, JPG ou PNG, até 10 MB cada)" acha um `<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png">` sem atributo `aria-label`; soltar `a.pdf` na área do Dropzone e enviar manda `anexos` com o arquivo `a.pdf` no `POST` da resposta (AC 32, door 11)
Proof: `cd web && npx vitest run src/chamados/resposta.test.tsx -t "soltar arquivo em Anexos envia em anexos"`
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "resposta pronta preenche o texto e o anexo vai junto"`

**C43** - Textos da tela 9 (detalhe do chamado) pela regra dos textos, nos estados: carregando, erro, sem respostas, aluno com chamado resolvido, equipe com todas as ações, fontes de documento e de artigo atualizadas, nota interna com anexo, diálogos "Encaminhar para outro setor?" e "Cancelar a solicitação?" (AC 4)
Proof: `cd web && npx vitest run src/chamados/textos.test.tsx -t "textos detalhe do chamado"`

**C44** - Arranjo da tela 9: a 360 px, o título não passa da largura da tela, cada botão de ação visível tem pelo menos 44 px de altura, e as fontes ficam dentro do balão do assistente, abaixo do texto; a 1024 px a coluna tem no máximo 768 px (`## Screens` linha 9)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo Detalhe do chamado"`

### S4 - Indicadores (P1) · ~10 files · ~50 KB · ~21k

**C45** - Depois de `npm --prefix web run build`, o `.js` de entrada que o `index.html` de `api/wwwroot` carrega não contém `recharts-surface`, e outro `.js` de `api/wwwroot/assets` contém (AC 33)
Proof: `npm --prefix web run build && python .specs/features/interface-nova/recharts_separado.py api/wwwroot`

**C46** - Com 1 categoria no ranking, o cartão "Categorias por conversas" tem um elemento `aria-hidden="true"` com `.recharts-responsive-container` antes da `table` na ordem do DOM (AC 34)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "ranking com gráfico acima da tabela"`

**C47** - Com o ranking vazio, o cartão mostra "—" e não tem `.recharts-responsive-container` (AC 35)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "ranking vazio sem gráfico"`
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "cartões formatam taxa, horas e número, e o ranking vazio mostra traço"`

**C48** - Os 13 cartões, com "Indicador principal" primeiro, ocupam 2 posições x distintas a 360 e a 767 px, com "Indicador principal" da largura das 2 colunas, e 4 posições x distintas a 768 e a 1024 px; os 2 rankings ficam um abaixo do outro a 360 e a 767 px e na mesma linha a 768 e a 1024 px (AC 36, AC 37)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "indicadores em 2 e 4 colunas"`

**C49** - Com o relógio em 10/11/2026, abrir "Escolher período no calendário" e escolher os dias 3 e 17 grava `2026-11-03` em "De" e `2026-11-17` em "Até" sem nenhuma chamada nova; "Consultar" faz `GET /api/indicadores?de=2026-11-03&ate=2026-11-17` (AC 52, door 15)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "período pelo calendário só consulta no Consultar"`

**C50** - O calendário dos Indicadores mostra "novembro" e "2026" no título do mês, e os 7 cabeçalhos dos dias, da esquerda para a direita, começam por "dom", "seg", "ter", "qua", "qui", "sex", "sáb" (texto ou `aria-label`) (AC 53)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "calendário em pt-BR"`

**C51** - Cada ranking tem uma `table` com os `columnheader` "Categoria" e "Total" e uma `row` por categoria com 2 `cell`, categoria e total (com "Boleto"/3: as células "Boleto" e "3") (AC 54, door 16)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "rankings em tabela Categoria e Total"`

**C52** - `useReactTable` só aparece em `web/src/indicadores/Indicadores.tsx` e `web/src/administracao/Matriculas.tsx`, e nenhum arquivo de `web/src` usa `getSortedRowModel`, `getFilteredRowModel` nem `getPaginationRowModel` (door 16)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "TanStack Table só nas 3 tabelas"`

**C53** - Textos da tela 12 (Indicadores) pela regra dos textos, nos estados: sem dados, com dados e um ranking vazio, calendário aberto, erro (AC 4)
Proof: `cd web && npx vitest run src/indicadores/textos.test.tsx -t "textos Indicadores"`

**C54** - Arranjo da tela 12: a 360 px, "De" e "Até" na mesma linha, o botão de calendário e "Consultar" na mesma linha abaixo deles, e em cada ranking o gráfico acima da tabela; a 1024 px "De", "Até", o botão de calendário e "Consultar" na mesma linha (`## Screens` linha 12)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo Indicadores"`

### S5 - Listas de chamados (P2) · ~5 files · ~19 KB · ~13k

**C55** - Cada chamado das listas é 1 link para `/univag/chamados/{número}` com número, selo do estado e título (AC 38)
Proof: `cd web && npx vitest run src/chamados/listas.test.tsx -t "Fila mostra cada chamado com categoria, responsável e dias"`
Proof: `cd web && npx vitest run src/chamados/listas.test.tsx -t "Minhas solicitações lista os chamados do aluno sem a linha da equipe"`

**C56** - Com `onlineManager.setOnline(false)` e o `fetch` rejeitando com `TypeError('Failed to fetch')`, a Fila mostra um `alert` com "Failed to fetch", sem o status "Carregando", e o `fetch` da lista é chamado exatamente 1 vez (AC 19 em consulta, door 7)
Proof: `cd web && npx vitest run src/chamados/listas.test.tsx -t "sem rede a lista mostra o erro"`

**C57** - Textos da tela 7 (Minhas solicitações) pela regra dos textos, nos estados: carregando, vazia, com os 5 estados de chamado, erro (AC 4)
Proof: `cd web && npx vitest run src/chamados/textos.test.tsx -t "textos Minhas solicitações"`

**C58** - Textos da tela 8 (Fila) pela regra dos textos, nos estados: carregando, vazia, com e sem responsável e com 1 e com N dias, erro (AC 4)
Proof: `cd web && npx vitest run src/chamados/textos.test.tsx -t "textos Fila"`

**C59** - Arranjo das telas 7 e 8: a 360 px, cada cartão tem a largura da lista, número e selo na mesma linha e o título abaixo; a 1024 px a coluna tem no máximo 768 px (`## Screens` linhas 7 e 8)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo listas de chamados"`

### S6 - Acesso (P2) · ~10 files · ~50 KB · ~20k

**C60** - Nos 4 formulários de acesso, cada um dos 6 campos obrigatórios (Login "CPF" e "Senha", Primeiro acesso "CPF", Criar senha "Nova senha", Trocar senha "Senha atual" e "Nova senha") vazio impede o envio, sem nenhuma chamada; com os campos preenchidos com valores que a API recusa (CPF `1`, senha `x`), a requisição sai e o `detail` da API aparece no `alert` (AC 39, AC 40)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "formulários de acesso exigem só os obrigatórios"`

**C61** - Textos da tela 1 (raiz `/`) pela regra dos textos, com o wordmark "One" que o arranjo da linha 1 nomeia (AC 4)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx -t "textos raiz"`

**C62** - Textos da tela 2 (Login) pela regra dos textos, nos estados: carregando, formulário, instituição não encontrada, erro (AC 4)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx -t "textos Login"`

**C63** - Textos da tela 3 (Primeiro acesso) pela regra dos textos, nos estados: formulário e sucesso (AC 4)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx -t "textos Primeiro acesso"`

**C64** - Textos da tela 4 (Criar senha) pela regra dos textos, nos estados: formulário e senha criada (AC 4)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx -t "textos Criar senha"`

**C65** - Textos da tela 5 (Trocar senha) pela regra dos textos, com e sem a senha temporária (AC 4)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx -t "textos Trocar senha"`

**C66** - Arranjo das telas 1 a 5: a raiz tem `text-align: center`; Login, Primeiro acesso e Criar senha têm o cartão com x 16 e borda direita em 344 a 360 px, e largura de no máximo 420 px centralizada (diferença das margens até 1 px) a 1024 px; no Login, "Entrar" tem a largura do campo "CPF" e o link "Primeiro acesso ou esqueci minha senha" fica abaixo de "Entrar", centralizado; Trocar senha tem a coluna de no máximo 420 px a 1024 px (`## Screens` linhas 1 a 5)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo telas de acesso"`

### S7 - Conhecimento (P2) · ~16 files · ~86 KB · ~30k

**C67** - Salvar, ativar e arquivar um artigo com sucesso mostram "Artigo salvo.", "Artigo ativado." e "Artigo arquivado." dentro da região de nome começando por "Notificações"; salvar com 422 não mostra "Artigo salvo." e mostra o `detail` no `alert` (AC 41, door 13)
Proof: `cd web && npx vitest run src/conhecimento/edicao.test.tsx -t "toasts de artigo só no sucesso"`

**C68** - Enviar e arquivar um documento com sucesso mostram "Documento enviado." e "Documento arquivado."; o erro ao arquivar não mostra toast (AC 42, door 13)
Proof: `cd web && npx vitest run src/conhecimento/edicao.test.tsx -t "toasts de documento só no sucesso"`

**C69** - Digitar "Faltas não são abonadas." em "Resposta" e salvar manda `resposta: 'Faltas não são abonadas.'` no `POST` (AC 43; se falhar sob o jsdom, vale a condição de parada do plano)
Proof: `cd web && npx vitest run src/conhecimento/artigos.test.tsx -t "novo artigo envia perguntas e links como listas"`

**C70** - Digitar `<b>x</b> &amp; **y**`, Enter e `fim` em "Resposta" e salvar manda `resposta: '<b>x</b> &amp; **y**\nfim'` (AC 55, door 14)
Proof: `cd web && npx vitest run src/conhecimento/edicao.test.tsx -t "resposta é o texto digitado sem marcação"`

**C71** - Abrir para edição e salvar sem mudar manda no `PUT` a `resposta` carregada igual caractere a caractere, em cada um dos 8 casos: `'a\n\nb'`, `'a  b'`, `' a '`, `'a\n'`, `''`, `'<b>x</b>'`, `'**x**'` e `'&amp;'` (AC 56)
Proof: `cd web && npx vitest run src/conhecimento/edicao.test.tsx -t "resposta sem mudança volta igual"`

**C72** - Colar em "Resposta" `text/html` `<b>negrito</b> e <i>itálico</i>` com `text/plain` `negrito e itálico` deixa o editor sem `strong`, `b`, `em` nem `i`, e salvar manda `resposta: 'negrito e itálico'` (AC 57)
Proof: `cd web && npx vitest run src/conhecimento/edicao.test.tsx -t "colar formatado fica só o texto"`

**C73** - `getByRole('textbox', { name: 'Resposta' })` acha o editor, com `aria-multiline="true"` e `contenteditable="true"` (AC 58)
Proof: `cd web && npx vitest run src/conhecimento/edicao.test.tsx -t "editor Resposta acessível"`

**C74** - Com 7 999 caracteres carregados em "Resposta", digitar `bc` e salvar manda uma `resposta` de 8 000 caracteres terminando em `b` (AC 59)
Proof: `cd web && npx vitest run src/conhecimento/edicao.test.tsx -t "Resposta para em 8000 caracteres"`

**C75** - Com o relógio em 10/11/2026, "Escolher validade no calendário" com os dias 3 e 17 grava `2026-11-03` em "Válido de (opcional)" e `2026-11-17` em "Válido até (opcional)" sem nenhuma chamada nova; "Salvar" manda as duas datas; o calendário mostra "novembro" e "2026" e os dias começando por "dom" a "sáb" (AC 60, AC 53, door 15)
Proof: `cd web && npx vitest run src/conhecimento/edicao.test.tsx -t "validade pelo calendário só grava no Salvar"`

**C76** - `web/package.json` lista com versão exata `@tiptap/react`, `@tiptap/pm`, `@tiptap/extension-document`, `@tiptap/extension-paragraph`, `@tiptap/extension-text` e `@tiptap/extensions`, e não lista `@tiptap/starter-kit` (door 14)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "pacotes do Tiptap"`

**C77** - "Arquivo PDF" acha um `<input type="file" accept=".pdf,application/pdf">` sem atributo `aria-label`; soltar `r.pdf` na área do Dropzone e enviar manda `arquivo` com `r.pdf` no `POST /api/admin/documentos` (door 11)
Proof: `cd web && npx vitest run src/conhecimento/edicao.test.tsx -t "soltar PDF em Arquivo PDF envia o arquivo"`

**C78** - Textos da tela 10 (Artigos) pela regra dos textos, nos estados: vazia, lista com os 3 estados e os 3 selos de indexação, diálogos "Novo artigo" e "Editar artigo" com o calendário aberto, "Arquivar o artigo?", os 3 toasts (AC 4)
Proof: `cd web && npx vitest run src/conhecimento/textos.test.tsx -t "textos Artigos"`

**C79** - Textos da tela 11 (Documentos) pela regra dos textos, nos estados: lista, diálogos "Enviar PDF" e "Nova versão", "Arquivar o documento?", os 2 toasts (AC 4)
Proof: `cd web && npx vitest run src/conhecimento/textos.test.tsx -t "textos Documentos"`

**C80** - Arranjo das telas 10 e 11: a 360 px, o título e "Novo"/"Enviar PDF" na mesma linha, e no cartão o título e os selos na mesma linha; no diálogo do artigo, "Válido de (opcional)" e "Válido até (opcional)" na mesma linha com o botão de calendário abaixo deles, e "Resposta" com altura de pelo menos 6 vezes o `line-height`; a 1024 px o diálogo do artigo tem 512 px de largura (`## Screens` linhas 10 e 11)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo Artigos e Documentos"`

### S8 - Administração (P2) · ~17 files · ~61 KB · ~34k

**C81** - Salvar e desativar um usuário com sucesso mostram "Usuário salvo." e "Usuário desativado."; salvar com 422 não mostra toast (AC 44, door 13)
Proof: `cd web && npx vitest run src/administracao/usuarios.test.tsx -t "toasts de usuário só no sucesso"`

**C82** - Salvar um registro em Cadastros com sucesso mostra "Cadastro salvo."; com 422 não mostra (AC 45, door 13)
Proof: `cd web && npx vitest run src/administracao/cadastros.test.tsx -t "toast de cadastro só no sucesso"`

**C83** - A 360 px em Cadastros, a `tablist` tem `overflow-x` `auto`, rolar até "Respostas prontas" deixa o `scrollLeft` da `tablist` acima de 0 e o `window.scrollX` em 0, e `scrollWidth` do documento fica no máximo 360; a 1024 px o `scrollWidth` da `tablist` é no máximo o `clientWidth` (AC 46)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "abas de Cadastros rolam na própria faixa"`

**C84** - Com 2 erros de importação, a tabela tem os `columnheader` "Linha" e "Motivo" e 2 `row` de corpo, cada uma com 2 `cell` na ordem linha, motivo (AC 61, door 16)
Proof: `cd web && npx vitest run src/administracao/admin.test.tsx -t "tabela de erros com Linha e Motivo"`
Proof: `cd web && npx vitest run src/administracao/admin.test.tsx -t "importação mostra as linhas com erro"`

**C85** - "Arquivo CSV" acha um `<input type="file" accept=".csv,text/csv">` sem atributo `aria-label`; soltar `alunos.csv` na área do Dropzone e confirmar manda `arquivo` com `alunos.csv` no `POST /api/admin/matriculas/importacao` (door 11)
Proof: `cd web && npx vitest run src/administracao/admin.test.tsx -t "soltar CSV em Arquivo CSV importa o arquivo"`

**C86** - Textos da tela 13 (Usuários) pela regra dos textos, nos estados: carregando, vazia, lista com desativado e os 3 papéis, diálogos "Novo usuário", "Editar usuário" e "Desativar {nome}?", os 2 toasts (AC 4)
Proof: `cd web && npx vitest run src/administracao/textos.test.tsx -t "textos Usuários"`

**C87** - Textos da tela 14 (Matrículas) pela regra dos textos, nos estados: inicial, confirmação "Importar {arquivo}?", concluída, erros por linha (AC 4)
Proof: `cd web && npx vitest run src/administracao/textos.test.tsx -t "textos Matrículas"`

**C88** - Textos da tela 15 (Cadastros) pela regra dos textos, nas 5 abas, vazia, e nos diálogos "Novo: {aba}" e "Editar: {aba}" de cada aba, com o toast (AC 4)
Proof: `cd web && npx vitest run src/administracao/textos.test.tsx -t "textos Cadastros"`

**C89** - Arranjo das telas 13 a 15: a 360 px, "Usuários" e "Novo" na mesma linha; em Matrículas "Importar" tem a largura do conteúdo a 360 px e largura menor que o conteúdo a 1024 px; em Cadastros cada linha é um botão da largura da lista (`## Screens` linhas 13 a 15)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo administração"`

### S9 - Saída do Bootstrap e tema escuro (P1) · ~12 files · ~45 KB · ~19k

**C90** - Nenhum arquivo de `web/src` importa `react-bootstrap` nem `bootstrap-icons`; "dependências do kit de interface" afirma a ausência de `bootstrap`, `react-bootstrap` e `bootstrap-icons`, e "camada do Bootstrap" afirma o ramo sem Bootstrap (AC 47)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "dependências do kit de interface"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "camada do Bootstrap"`

**C91** - O botão "Tema" do cabeçalho oferece "Claro", "Escuro" e "Sistema"; escolher cada um grava `light`, `dark` e `system` em `localStorage['one-tema']` e põe em `<html>` a classe `light`, `dark` e a do sistema (AC 49, door 10)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "Tema grava a escolha em one-tema"`

**C92** - Sem `one-tema` gravado, `<html>` recebe `dark` com `matchMedia('(prefers-color-scheme: dark)')` verdadeiro e `light` com falso (AC 50, door 10)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "sem tema gravado segue o sistema"`

**C93** - O `theme_color` do manifesto em `vite.config.ts` e o `content` de `<meta name="theme-color">` do `index.html` são o mesmo hex, igual à conversão para sRGB 8 bits do `--primary` de `:root` em `index.css`, e diferente de `#0d6efd` (AC 51)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "theme-color é o primary claro"`

**C94** - Nenhum arquivo de `web/src` declara nem importa `useAcao`, `useLista`, `useBase` ou `useListas`, e `web/src/chamado.ts` não contém `setInterval` (door 7, Flow 5)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "estado das telas só pelo TanStack Query"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| critérios do plano (61) | AC 1 C1, C2 · AC 2 C2 · AC 3 C4 · AC 4 C27, C37, C43, C53, C57, C58, C61, C62, C63, C64, C65, C78, C79, C86, C87, C88 · AC 5 C3 · AC 6 C5 · AC 7 C6 · AC 8 C7 · AC 9 C8 · AC 10 C9, C24 · AC 11 C10 · AC 12 C13 · AC 13 C14 · AC 14 C15 · AC 15 C16 · AC 16 C18 · AC 17 C19 · AC 18 C20 · AC 19 C35, C56 · AC 20 C21 · AC 21 C22 · AC 22 C28 · AC 23 C29 · AC 24 C30 · AC 25 C31 · AC 26 C32 · AC 27 C33 · AC 28 C34 · AC 29 C39 · AC 30 C40 · AC 31 C41 · AC 32 C42 · AC 33 C45 · AC 34 C46 · AC 35 C47 · AC 36 C48 · AC 37 C48 · AC 38 C55 · AC 39 C60 · AC 40 C60 · AC 41 C67 · AC 42 C68 · AC 43 C69 · AC 44 C81 · AC 45 C82 · AC 46 C83 · AC 47 C13, C90 · AC 48 C26 · AC 49 C91 · AC 50 C92 · AC 51 C93 · AC 52 C49 · AC 53 C50, C75 · AC 54 C51 · AC 55 C70 · AC 56 C71 · AC 57 C72 · AC 58 C73 · AC 59 C74 · AC 60 C75 · AC 61 C84 | - |
| doors (16) | 1 C12, C24 · 2 C13 · 3 C12, C14, C15 · 4 C5, C6, C7 · 5 C11 · 6 C11 · 7 C20, C35, C56, C94 · 8 C29, C36 · 9 C24, C90 · 10 C26, C91, C92 · 11 C42, C77, C85 · 12 C21 · 13 C25, C67, C68, C81, C82 · 14 C69, C70, C71, C72, C73, C74, C76 · 15 C49, C75 · 16 C51, C52, C84 | - |
| telas de Screens, textos (16) | 0 cabeçalho C27, C91 · 1 raiz C61 · 2 Login C62 · 3 Primeiro acesso C63 · 4 Criar senha C64 · 5 Trocar senha C65 · 6 Assistente C37 · 7 Minhas solicitações C57 · 8 Fila C58 · 9 detalhe C43 · 10 Artigos C78 · 11 Documentos C79 · 12 Indicadores C53 · 13 Usuários C86 · 14 Matrículas C87 · 15 Cadastros C88 | - |
| telas de Screens, arranjo (16) | 0 cabeçalho C18, C19 · 1 raiz C66 · 2 Login C66 · 3 Primeiro acesso C66 · 4 Criar senha C66 · 5 Trocar senha C66 · 6 Assistente C32, C38 · 7 Minhas solicitações C59 · 8 Fila C59 · 9 detalhe C44 · 10 Artigos C80 · 11 Documentos C80 · 12 Indicadores C48, C54 · 13 Usuários C89 · 14 Matrículas C89 · 15 Cadastros C83, C89 | - |
| telas sem rolagem horizontal a 360 px (15) | C8, table-driven over all 15 | - |
| estados comuns (3) | Spinner "Carregando" C27, C43, C57 · Alert com o detail C56, C62 · diálogo a 360 px com rodapé C38 | - |
| textos novos (17) | "Menu" da gaveta C18, C27 · "Tema" C91 · "Claro" C91 · "Escuro" C91 · "Sistema" C91 · "Artigo salvo." C67 · "Artigo ativado." C67 · "Artigo arquivado." C67 · "Documento enviado." C68 · "Documento arquivado." C68 · "Usuário salvo." C81 · "Usuário desativado." C81 · "Cadastro salvo." C82 · "Escolher período no calendário" C49, C53 · "Escolher validade no calendário" C75, C78 · "Categoria" C51 · "Total" C51 · "Mais" C27, e2e do cabeçalho (nota de 02/11/2026 em `plan.md` Screens linha 0) | - |
| nomes de mês e dia do ptBR (2 calendars) | Indicadores C50 · Artigos C75 | - |
| links do cabeçalho por papel (3) | `ALUNO` C16, C18 · `ATENDENTE` C16 · `ADMINISTRADOR` C16, C18 | - |
| ícones Lucide do cabeçalho (11) | `MessageCircle` C17 · `ListChecks` C17 · `Inbox` C17 · `BookText` C17 · `FileText` C17 · `ChartColumn` C17 · `Users` C17 · `Upload` C17 · `Settings` C17 · `LogOut` C17 · `Menu` C17 | - |
| ícones das fontes (2) | `FileText` Documento C40 · `BookText` Artigo C40 | - |
| largura do cabeçalho (2 edges) | 639 C19 · 640 C19 | - |
| largura dos Indicadores (4 widths) | 360 C48 · 767 C48 · 768 C48 · 1024 C48 | - |
| opções do QueryClient (5) | `retry: false` C20 · `refetchOnWindowFocus: false` C20 · `networkMode` das consultas C56 · `networkMode` das mutações C35 · um cliente por montagem C20 | - |
| destaque de "Falar com atendente" (5 cases) | `sem_base` C31 · depois do "Não" C31 · limite C31 · sem conversa C31 · conversa aberta C31 | - |
| movimento do balão novo (2 modes) | reduzido C33 · normal C34 | - |
| releitura do chamado (3 edges) | 14 999 ms C41 · 15 000 ms C41 · 30 000 ms C41 | - |
| campos de arquivo (3) | "Anexos (PDF, JPG ou PNG, até 10 MB cada)" C11, C42 · "Arquivo PDF" C11, C77 · "Arquivo CSV" C11, C85 | - |
| campos de data (4) | "De" C11, C49 · "Até" C11, C49 · "Válido de (opcional)" C11, C75 · "Válido até (opcional)" C11, C75 | - |
| tabelas do TanStack Table (3) | ranking por conversas C51 · ranking por chamados C51 · erros de Matrículas C84 | - |
| rankings (2 cases) | com categoria C46 · vazio C47 | - |
| campos obrigatórios do acesso (6) | Login "CPF" C60 · Login "Senha" C60 · Primeiro acesso "CPF" C60 · Criar senha "Nova senha" C60 · Trocar senha "Senha atual" C60 · Trocar senha "Nova senha" C60 | - |
| resposta do artigo ida e volta (8 cases) | C71, table-driven over all 8 | - |
| limite da Resposta (2 edges) | 8 000 aceito C74 · 8 001 recusado C74 | - |
| toasts só no sucesso (4 screens) | Artigos C67 · Documentos C68 · Usuários C81 · Cadastros C82 | - |
| escolha de tema (3) | `light` C91 · `dark` C91 · `system` C91 | - |
| tema sem escolha gravada (2) | sistema escuro C92 · sistema claro C92 | - |
| pares de contraste (8) | C22, table-driven over all 8 | - |
| tokens de Visual (13) | C23, table-driven over all 13 | - |
| ramos condicionais do Bootstrap (2) | com `react-bootstrap` C13, C26 · sem `react-bootstrap` C13, C26, C90 | - |
| formas de import plantadas em ui (4) | `../api` C15 · `@/api` C15 · `../chamados/Chamados` C15 · `@/chamados/Chamados` C15 | - |
| startup config: provedores (2 assemblies) | `main.tsx` C25 · `abrir` de `test/util.tsx` C25 | - |
| barreiras do AD-018 (3) | `crapper` C5 · `dryer` C6 · `mutator` C7 | - |
| suítes da base (2) | Vitest C1 · e2e C1 | - |
| saídas do build (2) | precache C10 · chunk do Recharts C45 | - |

- Claims naming a route or a request: C4, C35, C41, C42, C49, C56, C60, C70 a C72, C74, C75, C77, C85 - cada prova grava as chamadas do `fetch` simulado e afirma método, URL e corpo
- Claims de geometria (C8, C18, C19, C21, C32 a C34, C38, C44, C48, C54, C59, C66, C80, C83, C89) têm prova no Playwright com viewport real; o jsdom não faz layout e nenhum deles é provado por Vitest
- Nenhum outro check afirma mais casos do que a prova exercita

## Test policy

O repositório não tem guia de testes do `web/`; valem as linhas do `refatoracao-solid`, mais três para
o que esta feature cria: layout, regras de código-fonte e scripts sobre o build.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Tela que decide (destaque, permissões vindas da API, estados, toasts, formulários) | Vitest pelo `App` montado com `abrir`, com o `fetch` simulado | um caso afirmado por linha da tabela de decisão (C31, C60, C67, C68, C81, C82) |
| Arranjo e medidas da tela | Playwright a 360 × 740 e a 1024 px, com a API simulada | um teste por tela ou grupo de telas de arranjo igual em `## Screens`, cada fato do arranjo afirmado com medida (C18, C19, C38, C44, C48, C54, C59, C66, C80, C83, C89) |
| Regra sobre o código-fonte ou a configuração (pastas, imports, versões, tokens) | um teste em `web/src/test/` que lê o texto, como o "estrutura em fatias" | um caso por membro do conjunto (C9, C12 a C14, C23, C25, C36, C52, C76, C94) |
| Saída do build e comparação com `<base>` | script em `.specs/features/interface-nova/` com `--autoteste` quando compara listas | a lista inteira, sem amostra (C2 a C4, C10, C45) |
| Código copiado para `web/src/ui/` | nenhuma própria (door 4); coberto pelo consumidor e pelo `crapper` | - |

Evidence:

- `assistente/Assistente.tsx`: destaque de "Falar com atendente" sobre 5 estados -> decide, provado na tela (C31)
- `acesso/Acesso.tsx:70-190`: 6 campos `required` -> decide, provado na tela (C60)
- `indicadores/Indicadores.tsx:44-58`: 13 cartões, 3 formatadores -> decide, provado na tela e no layout (C48, C53)
- análogo no repositório: `test/estrutura.test.ts` (regra de fonte lida como texto) e `e2e/plataforma.spec.ts` (medida de layout a 360 px), os dois já provando a sua camada

Cost: 6 arquivos `textos.test.tsx` (16 testes), 1 `e2e/arranjo.spec.ts` (17 testes), 1 `test/interface.test.ts`
(14 testes), ~25 testes novos nos arquivos existentes e 7 scripts em `.specs/features/interface-nova/`.
Sem essas linhas, o arranjo de `## Screens` só seria comparado a olho pelo Verifier.

## Swept

- validation: C60 (só os 6 obrigatórios da base, nada além), C74 (limite da Resposta)
- failure modes: C20 (500 sem nova tentativa), C35 e C56 (sem rede vira `alert`), C67, C68, C81, C82 (erro não vira toast)
- idempotency: n/a - nenhuma gravação nova; as chamadas de hoje são comparadas uma a uma por C4
- authorization: C16 e C18 (links por papel); existing - 401/403/404 da API viram o `alert` ou a volta ao Login, como hoje (C1)
- concurrency: n/a - nenhum estado compartilhado entre abas; a releitura de 15 s é a de hoje (C41) e o conflito 409 segue em "conflito relê o chamado e mostra o detail" (C1)
- data lifecycle: C91, C92 (a chave `one-tema` no `localStorage`, única coisa nova guardada no aparelho)
- dependency failure: C21 (fonte sem terceiros), C35, C56 (rede fora), C10 (precache sem `/api/`)
- state transitions: C31 (destaque por estado da conversa), C91 (tema), C13 e C26 (antes e depois da saída do Bootstrap)
- observability: n/a - nenhum log nem métrica no `web/`; o service worker continua como hoje (C1, e2e "manifesto e service worker")

## Handoff

Tamanho estimado por slice = (2 × bytes dos arquivos existentes que a slice reescreve, contados em
HEAD com `git cat-file -s`, porque cada um é lido e reescrito inteiro + bytes dos arquivos novos
estimados) / 4 + 8k de saída das barreiras e das suítes. Contexto fixo por construtor: este
`checks.md` (49 740 B) + `plan.md` (55 679 B) + `test/util.tsx`, `test/setup.ts` e `test/estrutura.test.ts`
(5 514 B) = 110 933 B / 4 ≈ 28k, mais `build.md` e o diff que já entrou ≈ 30k.

| Slice | Existentes (B) | Novos (B, est.) | Conta | ≈ |
| --- | --- | --- | --- | --- |
| S0 | 13 059 (+ 5 305 só lidos: `asserts_preservados.py`, `mutator_web.sh`) | 22 000 (7 scripts, 5 telas no e2e, `interface.test.ts`) | (26 118 + 5 305 + 22 000) / 4 + 8k | 21k |
| S1 | 22 912 | 60 000 (`index.css`, `components.json`, ~14 arquivos de `ui/`, testes, e2e do cabeçalho) | (45 824 + 60 000) / 4 + 8k | 34k |
| S2 | 36 922 | 20 000 | (73 844 + 20 000) / 4 + 8k | 31k |
| S3 | 49 969 | 15 000 | (99 938 + 15 000) / 4 + 8k | 37k |
| S4 | 10 610 | 29 000 (`calendar`, `popover`, `table`, gráfico, script) | (21 220 + 29 000) / 4 + 8k | 21k |
| S5 | 5 917 | 7 000 | (11 834 + 7 000) / 4 + 8k | 13k |
| S6 | 15 992 | 18 000 (formulário, Zod, 5 telas de texto) | (31 984 + 18 000) / 4 + 8k | 20k |
| S7 | 32 630 | 21 000 (editor Tiptap, testes) | (65 260 + 21 000) / 4 + 8k | 30k |
| S8 | 43 909 | 17 000 (`tabs`, testes) | (87 818 + 17 000) / 4 + 8k | 34k |
| S9 | 16 604 | 12 000 (controle de tema, testes) | (33 208 + 12 000) / 4 + 8k | 19k |

- Soma das slices: 260k; com o contexto fixo, 290k - acima do budget de 150k
- Corte onde a superfície muda, com as 3 telas da banca nos 2 primeiros lotes: **lote 1** = S0, S1, S2
  (fundação e Assistente: 86k + 30k = 116k); **lote 2** = S3, S4, S5 (fatias `chamados` e
  `indicadores`: 71k + 30k = 101k); **lote 3** = S6, S7, S8, S9 (`acesso`, `conhecimento`,
  `administracao` e a saída do Bootstrap: 103k + 30k = 133k). Nenhuma slice foi dividida
- Mechanism: handoff em lotes sequenciais por subagente, só com o lote anterior verde - escolha do
  usuário em 02/11/2026
- Feature base (`<base>`): b2e7e79 (`docs(interface-nova): plan, checks and AD-023`), o commit que congela
  `plan.md` e `checks.md`
- e2e: o Playwright roda contra o contêiner `api` compartilhado (porta 8080), que serve o `web/`
  gravado em `api/wwwroot`. Um construtor só roda as provas Playwright (C1 e2e, C8, C18, C19, C21,
  C32 a C34, C38, C44, C48, C54, C59, C66, C80, C83, C89) e só reconstrói esse contêiner quando
  nenhum outro construtor (hoje o `vertical-slice-completa`, em `api/`) o estiver reconstruindo; o
  coordenador sequencia. As provas Vitest e os scripts que não dependem do contêiner rodam a qualquer
  momento

### Lote 1 (S0, S1, S2)

- Boundary: C1–C38 closed at 3559eed (commits 2aa8a9a, 0446817, 3559eed). Provas em 3559eed: Vitest 118/118;
  Playwright 23/23 duas vezes contra o contêiner `api` reconstruído com `docker compose up -d --build api` (o
  Dockerfile compila o `web/` da árvore); `seletores_conferem.py`, `consultas_preservadas.py` (389 consultas) e
  `chamadas_iguais.py` (99 testes) com 0 problema contra b2e7e79; `ui_isolada.sh` sai 0; `precache_completo.py`
  18 URLs, 0 problema; `crapper` sai 0 (pior: `Documentos` 9.0, das telas ainda não migradas); `dryer` sem
  candidato; `mutator_web.sh` 300 mortos, 0 sobreviventes, 0 descobertos
- Settled mid-build: (1) o `!important` dos utilitários do Bootstrap inverte a ordem das camadas e ganha das
  utilidades do Tailwind de mesmo nome (`px-4`, `bg-primary`, `gap-4`...); `index.css` ganhou um bloco
  `@layer base` temporário que devolve o valor do Tailwind às classes de um lado só que as telas migradas usam
  (sem atalhos como `p-4`, que ganhariam do `px-0` vizinho); quem migrar outra tela acrescenta a linha, a S9
  apaga o bloco; (2) na barra, de 640 a 1279 px os links mostram só o ícone (rótulo `sm:max-xl:sr-only`), porque
  9 rótulos não cabem em 640 px numa barra de 56 px; (3) o Vitest troca CSS importado (`?raw`) por texto vazio, e
  `interface.test.ts` lê `src/index.css` do disco (cwd `web/`); (4) `setup.ts` ganhou também um `matchMedia`
  falso, que o Vaul chama ao abrir a gaveta; (5) o registro do shadcn 4.23 importa `cn` de um pacote `cn` e o
  `sonner` usa `next-themes`: as cópias apontam para `@/ui/utils` e para o `ThemeProvider` (edições de door 3),
  com "Close" → "Fechar" e "Loading" → "Carregando"; (6) sem `baseUrl` no `tsconfig.json` (o TS 6 o recusa); (7)
  textos que são só nome acessível ("Menu" do botão, "Carregando", "Digitando", "Mensagem", o placeholder) são
  conferidos por papel ou atributo, não no texto visível; "Tema", "Claro", "Escuro", "Sistema" ficam para a S9;
  (8) `chamadas_iguais.py` grava as chamadas 50 ms depois de cada teste (relógio de `node:timers`), senão
  "lista carregando mostra o Spinner e nada mais" variava entre duas rodadas da própria base; (9) o balão entra
  com `ease: 'easeOut'` para não passar de 0 px; (10) a API simulada do e2e saiu para `e2e/simulada.ts`, com os
  papéis como parâmetro e um documento para a tela Documentos
- Abandoned: nenhum

### Lote 2 (S3, S4, S5)

- Boundary: C39–C59 closed at 18225eb (commits ad45b53, 18225eb). Provas em 18225eb: Vitest 131/131 (124/124 em
  ad45b53, num `git worktree`); Playwright 27/27 duas vezes contra o contêiner `api` reconstruído com
  `docker compose up -d --build api`; `seletores_conferem.py` (também em ad45b53, com o `seletores.md` daquele
  commit), `consultas_preservadas.py` (389 consultas) e `chamadas_iguais.py` (99 testes) com 0 problema contra
  b2e7e79; `ui_isolada.sh` sai 0; `recharts_separado.py` e `precache_completo.py` (19 URLs) com 0 problema;
  `crapper` sai 0 (pior: `Documentos` 9.0, ainda não migrada; `useChamado` 8.1); `dryer` sem candidato
- Mutação suspensa por decisão do usuário em 02/11/2026 (até segunda ordem); checks de mutator não rodados neste
  lote. A rodada iniciada foi interrompida (Ctrl+C sem efeito, processo encerrado); o `web/target` foi desmontado
  junction a junction (`rmdir` sem `/s`), com `git status` e o conteúdo de `web/src` iguais antes e depois
- Settled mid-build: (1) TanStack Table na 8.21.3, não na 9.3.1: a v9 não tem `useReactTable` nem
  `getCoreRowModel` (virou `useTable({ features, columns, data })`), e a door 16 e o C52 nomeiam `useReactTable`;
  a v8 cumpre a forma literal da door com `flexRender`; (2) React DayPicker 10.0.2 continua expondo `ptBR` em
  `react-day-picker/locale`, já com os rótulos em português; `@daypicker/react` e `date-fns` não entram; (3) o
  `thead` dos dias da semana do DayPicker é `aria-hidden`: o C50 lê os `th` pelo DOM, e o nome completo
  ("sábado") vem do `aria-label`, o texto visível é "sab"; (4) o balão saiu para `web/src/Balao.tsx` (raiz, 2
  fatias importam), com as fontes, os anexos e o aviso do assistente como `children` e a nota interna em
  `bg-warning-subtle` com o `Badge`; `Balao.tsx` fica fora da lista de caminhos da door 4, então `dryer` e
  `mutator` não o veem até a lista ganhar o arquivo; (5) o `useChamado` continua com `setInterval`: com
  `refetchInterval` o teste da base `transferencia.test.tsx` "atualiza chamado a cada 15 s" falha (3ª leitura não
  sai), porque ele avança o relógio com `vi.advanceTimersByTime` sem `await` e o TanStack Query não dispara uma
  releitura enquanto a anterior está em voo; o C41 passa com as duas formas (usa `advanceTimersByTimeAsync`). O
  C94 (lote 3) depende de uma decisão do usuário: trocar as 3 linhas `vi.advanceTimersByTime` daquele teste por
  `await vi.advanceTimersByTimeAsync` (nenhum `expect` muda, mas muda como a afirmação é exercida) ou manter o
  `setInterval`; (6) Indicadores: cada "Consultar" é uma chave nova da consulta (`vez` + 1), para reconsultar o
  mesmo período como na base, com `keepPreviousData`; os rankings vazios mostram uma linha "—" na tabela; o
  gráfico é `lazy` (chunk próprio); (7) Anexos: o `useDropzone` com `noClick` (o `<label>` abre o seletor), o
  campo nativo `sr-only` com `accept=".pdf,.jpg,.jpeg,.png"` e sem `aria-label`, e a lista dos nomes escolhidos
  na área; no e2e o campo de arquivo tem papel `button` no Chromium, então o C44 mede só os `<button>` do `main`;
  (8) `index.css` ganhou `.bg-warning-subtle` e `.gap-3` no bloco `@layer base` temporário; (9) botões de ação do
  detalhe com `h-11` (44 px) em toda largura
- Abandoned: a conversão do `useChamado` para `useQuery` com `refetchInterval` (Flow 5), revertida pelo motivo do
  item (5); fica para o lote 3 depois da decisão

### Lote 3 (S6, S7, S8, S9)

- Boundary: C60-C94 closed at b43672a (commits 95b8669, 5cc2ac2, f3eb39d, b43672a). Provas em b43672a: Vitest 161/161 (C1-C59 seguem verdes,
  nenhum `.skip(` nem `.only(` novo); Playwright 31/31 duas vezes contra o contêiner `api` reconstruído com
  `docker compose up -d --build api` (C66, C80, C83 e C89 incluídos, mais o C8 nas 15 telas); `seletores_conferem.py`,
  `consultas_preservadas.py` (389 consultas) e `chamadas_iguais.py` (99 testes) com 0 problema contra b2e7e79;
  `ui_isolada.sh` sai 0; `recharts_separado.py` e `precache_completo.py` (17 URLs) com 0 problema; `crapper` sai 0
  (pior: `Periodo` 8.1); `dryer` sem candidato; `npm ls bootstrap` vazio
- Mutação suspensa por decisão do usuário em 02/11/2026; checks de mutator não rodados neste lote.
- Settled mid-build: (1) a S8 e a S9 entraram no mesmo commit (f3eb39d): quando o último `react-bootstrap` sai,
  "camada do Bootstrap" e "tema claro enquanto houver react-bootstrap" passam sozinhos para o ramo sem Bootstrap, e
  esse ramo exige a camada, os pacotes e o controle "Tema" já fora e dentro; (2) o Tiptap digita sob o jsdom com as
  três APIs falsas que o plano nomeou (`Range.getClientRects`, `Range.getBoundingClientRect` e
  `document.elementFromPoint`, em `setup.ts`), então a condição de parada do plano não valeu; o teste do C74 leva o
  cursor ao fim com `getSelection().collapse` antes de digitar, porque o jsdom o põe no começo; (3) o `setup.ts` chama
  `toast.dismiss()` depois de cada teste (o Sonner guarda os toasts no módulo) e os testes de toast esperam 50 ms antes
  de montar, porque a gravação de um teste anterior pode terminar depois dele; (4) `useChamado` passou ao
  `refetchInterval` (com `refetchIntervalInBackground`), e as três linhas `vi.advanceTimersByTime` de "atualiza
  chamado a cada 15 s" viraram `await vi.advanceTimersByTimeAsync` por decisão do usuário, cada linha em
  `seletores.md`; (5) peças repetidas entre fatias foram para a raiz: `Periodo` (calendário), `CampoArquivo`
  (Dropzone), `Cabecalho`, `Editor`, `Confirmar`, `Marca`, `Situacao`, `ErroDe`, `Campo`, e em `acao.tsx` o
  `BotaoAcao`, o `useLeituras` e o `useGravacao`; esses arquivos ficam fora da lista de caminhos da door 4 (como o
  `Balao.tsx`), mas o `dryer` rodado com eles também sai sem candidato; (6) o Zod do acesso valida só `min(1)` nos 6
  campos obrigatórios, com `noValidate` no formulário e `aria-invalid` no campo (sem texto novo); (7) o botão "Tema" é
  um `Popover` com três botões, não um menu do Radix, e só o nome acessível "Tema" não aparece no texto visível; (8)
  `theme_color` e a meta `theme-color` passaram a `#2559bf` (o `--primary` claro em sRGB de 8 bits); (9) `chamadas_iguais.py`
  roda a suíte da base, que importa o Bootstrap: com os três pacotes fora, é preciso `npm i --no-save` deles em
  `web/node_modules` durante a rodada e `npm prune` depois; (10) `ui/tabs.tsx` foi escrito à mão a partir do
  registro `new-york-v4` (sem rede)
- Abandoned: nenhum

### Correção após a verificação rodada 1

Decisão do usuário em 02/11/2026: "Nomes sempre visíveis, com 'Mais'" (registrada em `plan.md` Screens linha 0). Os textos de check ficam como estão; os testes abaixo entram SOB os checks existentes.

- **Lacuna 1 e 2 (cabeçalho)** -> `Autenticado.tsx`: rótulos sempre visíveis; 3 links desde 1024 px, 5 desde 1280 px, 7 desde 1536 px, o resto no `Popover` "Mais"; gaveta abaixo de 1024 px; nome da instituição com `flex-1 min-w-16`. Testes (C18/C19, `e2e/arranjo.spec.ts`): `barra a 768 px`, `barra a 1024 px`, `barra a 1280 px`, `barra a 1920 px sem sobreposição, com todos os links ao alcance` (sem sobreposição entre os itens da barra, nome com largura > 0, rótulo visível, todo link visível ou dentro de "Mais"). "Mais" entrou na lista de literais de `textos.test.tsx` (C27).
- **C19 muda por essa decisão, não por conveniência**: o teste `cabeçalho a 640 px mostra os links na barra` virou `cabeçalho a 1024 px mostra os links na barra` (1024 px: 3 links com "Sair" à direita e sem "Menu"; 1023 px: "Menu" visível e nenhum link). O texto de C19 ("640 px", "os 9 links") fica congelado e já não vale: 9 links com rótulo não cabem a 640 px nem a 1024 px. O Verifier deve ler C19 pela nota de `plan.md` Screens linha 0.
- **Lacuna 3 (arranjo sem check)** -> testes novos no `describe('arranjo restante')` de `e2e/arranjo.spec.ts`, 360 px: C18 `cabeçalho a 360 px: marca e instituição à esquerda, Tema e Menu à direita, gaveta de baixo`; C66 `raiz com a marca e o texto centralizados`, `Login: campos empilhados e o erro abaixo do formulário`; C38 `Assistente: data pequena à direita, campo de 2 linhas e erro abaixo do compositor`; C44 `Detalhe: cartão da equipe antes da conversa e ações que quebram em linhas`; C80/C89 `botões pequenos em linha em Artigos, Documentos e Usuários`, `diálogos a 360 px com margem de 16 px`; C89 `Matrículas: cabeçalho mono que quebra, resultado em Alert e erros em tabela que quebra o motivo`, `Cadastros: detalhe pequeno embaixo do nome`. Histórico como lista ordenada (Vitest): `chamados/icones.test.tsx` `Histórico é uma lista ordenada` (C44). `e2e/simulada.ts` ganhou as ações `assumir`, `confirmar` e `cancelar` no chamado do fixture (para a linha de ações quebrar).
- **Lacuna 4 (8 ícones)** -> Vitest, um arquivo `icones.test.tsx` por fatia: `acesso` `Tema traz Sun e a escolha Escuro traz Moon`; `assistente` `Assistente traz Send, Hand e ShieldAlert`; `chamados` `Anexos traz Paperclip`; `conhecimento` `Novo traz Plus e a validade traz CalendarDays`; `administracao` `Novo traz Plus em Usuários e em Cadastros`; `indicadores` `o período traz CalendarDays`.
- **Lacuna 6 (F5, C90)** -> `acesso.test.tsx` `dependências do kit de interface` (já é proof do C90) afirma agora que nenhum arquivo de `web/src` importa `bootstrap`, `react-bootstrap` nem `bootstrap-icons`; com `import 'bootstrap-icons/font/bootstrap-icons.css'` no `main.tsx` ele falha (conferido à mão).
- **Lacuna 7 (F7a, C48)** -> `indicadores em 2 e 4 colunas` afirma que os 12 cartões restantes têm a mesma largura (±1 px) em 360, 767, 768 e 1024 px; com `grid-cols-1` no lugar de `grid-cols-2` falha com "151,169,...".
- **Lacuna 8 (C6/C7)**: o texto de C6 diz "os 7 arquivos da raiz" e a linha Proof é congelada; não a alterei. Nota para o Verifier: a prova vale também com os 11 arquivos compartilhados (`Balao`, `Cabecalho`, `Campo`, `CampoArquivo`, `Confirmar`, `Editor`, `ErroDe`, `Marca`, `Periodo`, `Situacao`, `acao`) acrescentados à lista, e `dryer` sai "No duplicate candidates found" assim. A lista do `mutator_web.sh` (C7) não foi tocada (mutação suspensa, AD-025).
- Provas após a correção: Vitest 168/168; Playwright 44/44 contra o contêiner reconstruído; `crapper` sai 0 (pior: `Periodo` 8.1); `dryer` sem candidato (lista da door 4 e com os 11 arquivos); `seletores_conferem.py`, `consultas_preservadas.py` (389) e `chamadas_iguais.py` (99) com 0 problema contra b2e7e79; `ui_isolada.sh` sai 0; `recharts_separado.py` e `precache_completo.py` (17 URLs) com 0 problema.

### Decisão do usuário sobre o C19 (02/11/2026, depois da verificação rodada 1)

- Aceita a barra a partir de 1024 px: gaveta abaixo de 1024 px; acima, links com nome (3 a partir de 1024 px, 5 a
  partir de 1280 px, 7 a partir de 1536 px) e o resto no menu "Mais". O texto do C19 ("640 px", "os 9 links") fica
  congelado e não vale mais literalmente; o teste que o prova passa a ser `cabeçalho a 1024 px mostra os links na
  barra`, junto com `barra a 768/1024/1280/1920 px sem sobreposição, com todos os links ao alcance`. Consequência da
  escolha "Nomes sempre visíveis, com 'Mais'" feita pelo usuário na mesma data.
