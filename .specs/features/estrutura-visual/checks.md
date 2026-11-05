# Estrutura visual sem cara de modelo - checks

Profile: ui
Plan: `.specs/features/estrutura-visual/plan.md`

41 checks em 6 slices (S1 a S5 e S0; C31 a C41 vêm das rodadas do Verifier) · 4 one-way doors · 0 perguntas abertas (plano, emenda de AC 31 e rankings em HTML aprovados pelo usuário em 05/11)

**Como as provas rodam.** Todos os comandos rodam na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é o commit que congela `plan.md` e este `checks.md`, gravado no `## Handoff`.

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `web/` unidade | Vitest (jsdom): `cd web && npx vitest run <arquivo> -t "<nome>"` | nada |
| `web/` arranjo e medida | Playwright com a API simulada (`e2e/simulada.ts`); medidas por `boundingBox()` e `getComputedStyle`, tolerância de 1 px; contraste como em `identidade.spec.ts` (`window.__ux.pintar`, `pilha`) | `npm --prefix web run build`; `npx vite preview --port 5199 --strictPort` em `web/`; `E2E_URL=http://localhost:5199` |
| `web/` e2e real | Playwright contra uma imagem própria do `HEAD` na porta 8089, com banco, bucket e instituição próprios, no padrão de `identidade-visual`; limite de 5 logins por minuto (L-066) | imagem própria |
| barreiras | `crapper` e `dryer` em `web/` (AD-018); mutação suspensa (AD-025); sem `dotnet`, porque nenhuma linha de `api/` muda | `npm --prefix web run coverage` |

Arquivos de teste novos: `e2e/casca.spec.ts`, `e2e/casca-real.spec.ts` e `src/indicadores/ranking.test.tsx`. O nome numa linha `Proof:` é o contrato (L-022), e cada filtro precisa executar pelo menos 1 teste (L-002).

**Regras destas provas:**
- Onde um CSS se aplica se prova medindo no navegador contra um controle, não lendo o texto do arquivo (L-095). A referência de um valor é o token pintado no `body`, nunca um clone que copia as classes do elemento medido.
- Cada medida afirma primeiro a contagem do que mede, e cada varredura afirma quantos elementos varreu (L-069). Uma asserção de ausência tem um caso de controle no mesmo teste (L-082).
- "As 2 marcas" são `#8a1538` e `#0b6e4f`; "as 3 marcas" são sem cor mais essas 2. "Os 3 temas" são claro, escuro e preto.

**Asserções existentes que podem mudar** (lista fechada; cada edição só leva a asserção ao arranjo novo e fica no `## Handoff` com o AC que a força):
1. `e2e/arranjo.spec.ts`: `painel cabeçalho`, `botão do usuário`, `cabeçalho: borda, título numa linha e botões de 36 px` (AC 8 a AC 13); `colunas largas somem no estreito`, só o `thead` com fundo `--muted` (AC 18); `arranjo Indicadores` e `rótulo do gráfico em até 2 linhas sem reticências` (AC 19 a AC 21).
2. `e2e/push.spec.ts`: `avisos no cabeçalho`, só a ordem no topo, sem Tema (AC 8).
3. `e2e/identidade.spec.ts`: `raio pelo papel do componente`, `pílula só em avatar, botão de ícone, selo e passo`, `gráficos sem cartão com o título` (AC 8, AC 9, AC 14, AC 19) e as listas de telas e elementos usadas por esses testes.
4. `e2e/celular.spec.ts`: `alvos de toque de 44 px abaixo de 768`, o localizador do botão Enviar (AC 14); `Indicadores sem texto cortado`, o `svg` do gráfico sai (AC 19, AC 21).
5. `e2e/ux.spec.ts`: `cor de ação só em botão principal, item ativo, link e foco` e `gráficos com a mesma cor calma`, o seletor das barras (AC 19); `alvos de 44 px abaixo de 768 em todas as telas` e as medidas de foco com `ring`, só o localizador da linha de Tema e a leitura de `outline` no lugar de `box-shadow` (AC 1, AC 8).
6. `src/test/interface.test.ts`: as linhas `--ring`, `--sidebar`, `--sidebar-accent`, `--sidebar-border` e `--sidebar-ring` da tabela `Tokens` (AC 4, AC 6).
7. `src/indicadores/indicadores.test.tsx` e `src/indicadores/revisao.test.tsx`: `ranking com gráfico acima da tabela`, `ranking vazio sem gráfico`, `rankings em tabela Categoria e Total`, `ranking que a API não manda não aparece` e `Ver tabela de %s` (AC 19, AC 20).

Uma edição fora da lista, forçada por um AC, é permitida só se trocar localizador ou seguir o arranjo novo sem baixar nenhum limite, e fica no `## Handoff` para o Verifier julgar. Baixar um limite ou apagar uma asserção de `revisao-ux`, `aparencia-instituicao` ou `identidade-visual` fora da lista é parar e perguntar.

## Decisões

| # | Ponto | Decisão |
| --- | --- | --- |
| P1 | AC 1 não dizia quais controles varrer | até 12 paradas de `Tab` em cada tela, afirmando ao menos 5 controles distintos (C1, C2) |
| P2 | Risco da pesquisa: `outline` cortado por `overflow` em tabela e barra | vira obrigação própria (C6); o construtor pode usar `outline-offset` negativo onde o contêiner cortaria |
| P3 | AC 12 e o clique em recolher | continua alternando aberta e recolhida, e o atalho do primitivo não muda (C13) |
| P4 | O usuário sem setas continua abrindo "Sair" | continua: a linha é um botão com o mesmo menu (AD-028) (C10) |
| P5 | Altura da caixa de envio não tinha número | com 1 linha de texto e sem anexo, o `form` mede ≤ 60 px (C15) |
| P9 | Rodada 3 do Verifier: a dica na linha do usuário ficava presa depois do menu e fazia o Esc da gaveta pedir 2 toques; 3 mutantes sobreviveram (F9, F10, F11). O usuário escolheu em 05/11 "tirar a dica e conferência curta" | a linha do usuário fica sem dica (as iniciais não são ícone), e C38 muda; entram C40 e C41. Uma última conferência olha só isso. O que ela achar além disso vira risco aceito pelo usuário, sem nova rodada |
| P8 | Rodada 2 do Verifier: a folga do corte de 2 linhas mostrou o alto da 3ª; `## Screens` pedia "só ícones com dica" e faltava dica em recolher e no usuário | C36 a C39 só provam o que o plano aprovado já dizia; a dica entra sem nova decisão do usuário. A rodada 3 é a última antes de voltar ao usuário |
| P7 | Rodada 1 do Verifier, 05/11 | **o usuário escolheu voltar a `--sidebar` `#000` no Preto** (AD-027 fica intacta): C7 passa a exigir a diferença entre marcas só no claro e no escuro e `#000` no Preto. C23 passa a medir o contêiner da tabela. Entram C31 a C35, do que a rodada achou |
| P6 | Largura da barra quando o total é 0 | total 0 dá largura 0, e o maior total dá 100% (C20) |

## Checks

### S1 - Foco visível e anexos (P1) · 12 files · 60 KB · ~15k

**C1** - [x] Levando o foco com `Tab` na Fila, no Assistente, no detalhe do chamado e na Aparência, a 1280 px, nos 3 temas e com as 3 marcas, cada controle focado tem `outline-style` `solid`, `outline-width` ≥ 2 px e `outline-color` com contraste ≥ 3:1 contra o fundo opaco vizinho; ao menos 5 controles distintos por tela (door 1; AC 1)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco de 2 px com 3:1 nas 4 telas"`

**C2** - [x] Com `forcedColors: 'active'`, nas mesmas 4 telas, a 1280 px, cada controle focado tem `outline-style` diferente de `none` e `outline-width` ≥ 2 px, incluindo a linha de pergunta do Assistente (AC 2)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco com cores forçadas"`

**C3** - [x] Um `Button` comum e um `Input` com foco têm `box-shadow` `none`. Nenhum arquivo de `web/src` contém `ring-ring/50`, `outline-ring/50` nem `focus-visible:ring-[3px]`, e a varredura lê ao menos 8 arquivos de `ui/` (door 1; AC 3)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco sem auréola no botão e no campo"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "foco sem classes de auréola"`

**C4** - [x] Pintado no `body`: no claro sem cor, `var(--ring)` é igual a `oklch(0.5 0 0)`; no claro, no escuro e no preto com `#8a1538`, `var(--ring)` difere do valor sem cor e é o mesmo de `var(--sidebar-ring)`. No escuro e no preto sem cor, `--ring` continua o de `<base>` (door 2; AC 4)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "ring sem cor e com marca"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens de Visual"`

**C5** - [x] A área tracejada de anexos em Instituições, Matrículas, Documentos e no detalhe do chamado tem `border-style` `dashed` e contraste ≥ 3:1 contra o fundo em que está, nos 3 temas, sem cor e com `#0b6e4f` (AC 5)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "borda da área de anexos com 3:1"`

**C6** - [x] Com foco, um link da barra lateral, um link da primeira coluna da Fila e uma linha de pergunta do Assistente têm a caixa do contorno (`boundingBox` + `outline-offset` + `outline-width`) dentro do retângulo de todo ancestral com `overflow` diferente de `visible`, com 1 px de tolerância; a linha de pergunta tem `outline-offset` negativo (P2; AC 1; `## Screens`)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco não cortado por overflow"`

### S2 - Barra lateral e topo (P1) · 8 files · 75 KB · ~19k

**C7** - [x] Pintados no `body`, `--sidebar`, `--sidebar-accent` e `--sidebar-border` diferem entre `#8a1538` e `#0b6e4f` nos temas claro e escuro; no Preto, com as 3 marcas, `--sidebar` pinta `rgb(0, 0, 0)` (AD-027); o texto `--sidebar-foreground` sobre `--sidebar` tem contraste ≥ 4,5:1 nos 3 temas e com as 3 marcas (P7; AC 6)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "barra tingida pela marca"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens da paleta"`

**C8** - [x] A 1440 px, nos 3 temas e com as 3 marcas, o link ativo tem uma barra de 3 px (± 1) à esquerda (borda ou `::before`) na cor de `var(--sidebar-primary)`, com contraste ≥ 3:1 contra `--sidebar`, `color` igual à de `var(--sidebar-foreground)`, `font-weight` 600, fundo transparente e `aria-current="page"`. No mesmo teste, um link inativo não tem a barra, tem peso < 600 e não tem `aria-current` (door 3; AC 7)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "item ativo com barra de 3 px"`

**C9** - [x] A 1440 px, o rodapé da barra tem o botão "Tema", que abre Claro, Escuro e Preto, e escolher Escuro põe `dark` no `<html>`. O `header` tem 0 botões "Tema", a 1440 e a 390 px (aluno e atendente). A 390 px, o aluno ainda escolhe o tema pela aba Conta (AC 8)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "Tema no rodapé da barra e fora do topo"`

**C10** - [x] Com a barra aberta, o rodapé mostra nome e papel; a página tem 0 `svg.lucide-chevrons-up-down` e 0 elementos com as iniciais do usuário; clicar na linha do usuário abre o menu com "Sair" (P4; AC 9)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "usuário em texto com a barra aberta"`

**C11** - [x] Com a barra recolhida, o rodapé mostra as iniciais do usuário, e o nome fica visualmente escondido; ao reabrir, as iniciais somem (controle) (AC 10)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "iniciais só com a barra recolhida"`

**C12** - [x] A 1440 e a 390 px, nos 3 temas, o `header` tem `background-color` opaco (alfa 1), `backdrop-filter` `none` e 0 `[data-slot=separator]` (AC 11)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "topo opaco e sem separador"`

**C13** - [x] A 768 e a 1440 px, o botão de recolher está no rodapé da barra, com 1 `svg`, sem texto visível e o mesmo `aria-label` de `<base>`; o `header` tem 0 botões de recolher; clicar recolhe e clicar de novo reabre (P3; AC 12)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "recolher no rodapé a partir de 768"`

**C14** - [x] A 390 px, o atendente tem no `header` um botão de menu com `svg.lucide-menu`, que abre a gaveta com os links, Tema e o usuário; a 767 px, o mesmo. O aluno a 390 px não tem esse botão (controle) (AC 13)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "menu no topo abaixo de 768 para quem não é aluno"`

### S3 - Caixa de envio (P1) · 4 files · 40 KB · ~10k

**C15** - [x] A 360, 390 e 1440 px, anexar, o campo e o botão "Enviar", nessa ordem da esquerda para a direita, se sobrepõem na vertical, sem estouro horizontal. O `form` e o campo têm `box-shadow` `none`, o `form` tem `border-width` 0, e com 1 linha de texto e sem anexo o `form` mede ≤ 60 px. A 390 px, anexar e "Enviar" medem ≥ 44 px de altura, e o campo tem `font-size` 16 px (P5; AC 14)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "caixa de envio em uma linha"`

**C16** - [x] O campo da caixa de envio tem `border-width` ≥ 1 px e contraste ≥ 3:1 contra o fundo, nos 3 temas e com as 2 marcas, a 390 e a 1440 px (AC 15)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "borda da caixa de envio com 3:1"`

**C17** - [x] Com conversa aberta que pode ser encerrada, "Encerrar" e "Falar com atendente" se sobrepõem na vertical, acima da linha do campo. Sem conversa, "Encerrar" não aparece e "Falar com atendente" continua (controle) (AC 16)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "Encerrar junto de Falar com atendente"`

**C18** - [x] Enter com texto faz 1 `POST` da mensagem e limpa o campo; Shift+Enter quebra a linha sem `POST`; com o campo vazio ou só com espaços, "Enviar" está desabilitado (AC 17)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "Enter envia e campo vazio desabilita"`

### S4 - Tabelas sem caixa (P1) · 2 files · 10 KB · ~3k

**C19** - [x] Em Fila e Usuários, a 1440 px, nos 3 temas: o ancestral imediato da rolagem da tabela tem `border-width` 0 e `border-radius` 0; o `th` tem fundo transparente, `font-weight` 600 e `border-bottom-width` ≥ 1 px, com contraste contra o fundo maior que o do fio entre linhas; o texto da primeira coluna fica alinhado (± 1 px) à esquerda do conteúdo da página (AC 18)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "tabela sem caixa e cabeçalho sem fundo"`

### S5 - Rankings sem biblioteca de gráfico (P1) · 6 files · 30 KB · ~8k

**C20** - [x] Com totais 50, 25, 5 e 0, na ordem da API: 4 linhas nessa ordem, com a categoria inteira e o total em texto, e barras de largura 100%, 50%, 10% e 0% (P6; AC 19)
Proof: `cd web && npx vitest run src/indicadores/ranking.test.tsx -t "ranking com total e barra proporcional"`

**C21** - [x] Em Indicadores, nos 3 temas e com as 2 marcas, a 390 e a 1440 px, cada barra tem cor igual à de `var(--chart-1)`, diferente da de `var(--primary)` e com contraste ≥ 3:1 contra o fundo; o total tem `font-variant-numeric` com `tabular-nums` e fica à direita da categoria; a página tem 0 `svg.recharts-surface` e 0 botões "Ver tabela" (door 4; AC 19)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "barras do ranking na cor calma e sem Recharts"`

**C22** - [x] Sem linhas no ranking, a seção mostra o título e o mesmo estado vazio de `<base>`, com 0 barras; com a API sem o ranking, a seção não aparece (AC 20)
Proof: `cd web && npx vitest run src/indicadores/ranking.test.tsx -t "ranking vazio e ausente"`

**C23** - [x] A 360, 390, 768, 1024 e 1440 px, com uma categoria de 60 caracteres, o texto inteiro está visível: `scrollWidth` ≤ `clientWidth` no `table-container` do ranking e na linha, e `text-overflow` diferente de `ellipsis`, sem estouro horizontal da página (P7; AC 21)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "categoria longa inteira nas 5 larguras"`

**C24** - [x] `recharts` não está em `web/package.json` nem em `package-lock.json` como dependência direta; `web/src/indicadores/Grafico.tsx` não existe; o build não gera arquivo `Grafico-*` em `api/wwwroot/assets` (door 4)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "sem biblioteca de gráfico"`

### S0 - Invariantes e barreiras (P1)

**C25** - [x] A suíte Vitest inteira e o build passam. As edições em asserções existentes são as da lista fechada ou as permitidas por ela, cada uma no `## Handoff` com o AC que a força (AC 22)
Proof: `npm --prefix web test`
Proof: `npm --prefix web run build`

**C26** - [x] O `crapper` sobre `web/src` sai 0 no limite 9.99, o `dryer` não acha candidato com nota 0.8 ou mais, e nenhum arquivo de `api/` nem de `api.Tests/` muda desde `<base>` (AC 22)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao -s src/ilustracoes --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx src/sw.ts src/push.ts src/AvisosPush.tsx src/aparencia.tsx src/LinksDaResposta.tsx src/Balao.tsx | grep -q "No duplicate candidates found"`
Proof: `git diff --quiet <base> HEAD -- api api.Tests`

**C27** - [x] A suíte de arranjo passa inteira com a API simulada, salvo `plataforma.spec.ts` `manifesto e service worker`, que precisa de API e é julgado em C29 (AC 22)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/ux.spec.ts e2e/aparencia.spec.ts e2e/identidade.spec.ts e2e/casca.spec.ts`

**C28** - [x] De ponta a ponta na imagem própria: o atendente escolhe Escuro no rodapé da barra, recarrega e continua em Escuro; o aluno manda uma mensagem pela caixa nova com Enter, e ela aparece na conversa; em Indicadores, com chamados criados, o ranking mostra a categoria e o total reais, com 1 barra por linha (AC 8, AC 17, AC 19)
Proof: `cd web && E2E_URL=http://localhost:8089 npx playwright test e2e/casca-real.spec.ts`

**C29** - [x] A suíte e2e inteira passa contra a imagem própria do `HEAD` na porta 8089 (AC 22)
Proof: `cd web && E2E_URL=http://localhost:8089 npx playwright test`

**C30** - [x] Os testes dos invariantes de AC 22 passam sem baixar limite: alvos de 44 px, campos de 16 px, barra de abas, cor de ação e neutros tingidos, mais os checks C47 a C57 de `identidade-visual` (AC 22)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "alvos de 44 px abaixo de 768 em todas as telas"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "campos de 16 px abaixo de 768 e com ponteiro grosso"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "barra de abas: 3 colunas iguais e ícone sobre rótulo de 12 px"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "cor de ação só em botão principal, item ativo, link e foco"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "neutros mudam com a cor da instituição"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "borda do form igual ao token no escuro e no preto"`

**C31** - [x] Com totais 999, 1000, 12345 e 1234567, a 360, 390, 768, 1024 e 1440 px, o total de cada linha do ranking ocupa 1 linha só (altura do `Range` do texto ≤ 1 `line-height`), e a categoria de 60 caracteres continua inteira (P7; AC 19, AC 21)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "total do ranking em uma linha"`

**C32** - [x] Com `forcedColors: 'active'`, a 1440 px, o item ativo da barra continua com a barra visível de 3 px (± 1): medida como `border` sólida no elemento ou no `::before`, com largura ≥ 2 px e cor diferente da cor de fundo pintada; um link inativo não tem essa borda (P7; AC 7)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "item ativo visível com cores forçadas"`

**C33** - [x] A 390 px, nos cartões da Fila e de Minhas solicitações, a caixa do contorno do controle focado fica dentro de todo ancestral com `overflow` diferente de `visible`, inclusive `line-clamp`. A 1280 px, na primeira coluna da Fila, a caixa do contorno contém a caixa do texto do link, sem cruzar as letras. O botão Fechar de um diálogo, com foco, tem `opacity` 1 e contorno com contraste ≥ 3:1 nos 3 temas, sem cor (P7; AC 1)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco inteiro nos cartões, na primeira coluna e no Fechar"`

**C34** - [x] O rodapé da barra aberta mostra, de cima para baixo: Contato, Tema, usuário e recolher. Na barra recolhida, com ponteiro grosso, o botão de recolher tem `x` ≥ 0 e a largura inteira dentro da barra (P7; AC 8, AC 9, AC 12)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "ordem do rodapé e recolher dentro da barra"`

**C35** - [x] A 1440 px, com 1 linha de texto, "Enviar" e o campo da caixa de envio têm a mesma altura (± 1 px) e estão alinhados na vertical; a 390 px, os dois medem ≥ 44 px (P7; AC 14)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "Enviar da altura do campo"`

**C36** - [x] A 360 e a 390 px, nos cartões da Fila e de Minhas solicitações, com um título em maiúsculas com `Ã`, `Á` e `Í` na 3ª linha, a caixa que corta o texto mede até 2 × `line-height` (± 1 px) e nenhum pixel da 3ª linha pinta abaixo da 2ª: o `Range` do texto visível termina dentro dela; o título continua em 2 linhas com o contorno de foco inteiro, como em C33 (P8; AC 1)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "corte de 2 linhas sem o alto da terceira"`

**C37** - [x] Com a coluna estreita, a 360 e a 390 px, a barra do ranking tem `top` ≥ o `bottom` do rótulo da categoria − 1 px, nas linhas com dados (P8; AC 19; `## Screens`)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "barra do ranking embaixo do rótulo no estreito"`

**C38** - [x] Com a barra recolhida, a 1280 px, passar o ponteiro em recolher e em Tema mostra 1 dica com o nome de cada um; com a barra aberta, não (controle). A linha do usuário não mostra dica em nenhum dos dois estados, e depois de abrir e fechar o menu dela não sobra dica na tela (P8, P9; `## Screens`)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "dica nos ícones do rodapé com a barra recolhida, sem dica no usuário"`

**C39** - [x] O botão Fechar da gaveta (`Sheet`), com foco, tem `opacity` 1 e contorno com contraste ≥ 3:1 nos 3 temas, sem cor (P8; AC 1)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco inteiro no Fechar da gaveta"`

**C40** - [x] A 390 px, no cartão da Fila, o link se chama "ONE-123 Preciso…" (número e título) e um clique abre o chamado com exatamente 1 entrada a mais em `history`; voltar retorna à lista (P9; AC 1)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "link do cartão abre o chamado com 1 entrada no histórico"`

**C41** - [x] A 390 px, na gaveta do atendente, com foco na linha do usuário, 1 `Escape` fecha a gaveta (P9; AC 13)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "Esc fecha a gaveta em 1 toque a partir do usuário"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| telas varridas no foco (4) | Fila C1, C2 · Assistente C1, C2 · detalhe C1, C2 · Aparência C1, C2 | - |
| temas (3) | claro C1, C5, C8, C12, C16 · escuro C1, C5, C8, C12, C16 · preto C1, C5, C8, C12, C16 | - |
| marcas (3) | sem cor C1, C4, C5, C8 · `#8a1538` C1, C4, C8, C16 · `#0b6e4f` C1, C5, C8, C16 | - |
| usos da área de anexos (4) | Instituições C5 · Matrículas C5 · Documentos C5 · detalhe C5 | - |
| portas (4) | door 1 C1, C3 · door 2 C4 · door 3 C8 · door 4 C21, C24 | - |
| estados da barra (2) | aberta C10 · recolhida C11 | - |
| itens do rodapé (3) | Tema C9 · usuário C10, C11 · recolher C13 | - |
| papéis no topo do celular (2) | aluno C9, C14 · atendente C9, C14 | - |
| larguras do corte (5) | 360 C23 · 390 C23 · 768 C23 · 1024 C23 · 1440 C23 | - |
| estados do ranking (3) | com dados C20, C21, C28 · vazio C22 · ausente C22 | - |
| frases de `## Screens` (8) | barra aberta C8, C9, C10, C13 · barra recolhida C11 · topo C9, C12, C14 · caixa de envio C15, C17 · tabela C19 · ranking C20, C21, C23 · foco C1, C6 · anexos C5 | - |
| achados da rodada 1 (7) | total em uma linha C31 · corte da categoria C23 · Preto em `#000` C7 · barra ativa em cores forçadas C32 · foco nos cartões C33 · ordem do rodapé C34 · Enviar e campo C35 | - |
| achados da rodada 2 (4) | alto da 3ª linha C36 · barra embaixo do rótulo C37 · dicas na barra recolhida C38 · Fechar da gaveta C39 | - |
| achados da rodada 3 (3) | dica fora da linha do usuário C38 · link do cartão C40 · Esc da gaveta C41 | - |
| suítes do S0 (5) | Vitest e build C25 · `crapper`, `dryer` e `api/` C26 · arranjo C27 · fluxo real C28 · e2e inteira C29 | - |

## Swept

- validation: C20 (total 0 e proporção), C23 (categoria de 60 caracteres)
- failure modes: existing - a consulta de Indicadores e o envio de mensagem mantêm o tratamento de erro de hoje; C22 cobre o ranking ausente
- idempotency: n/a - nada novo grava; C18 afirma 1 `POST` por Enter
- authorization: existing - a guarda de papel do web e o `403` da API não mudam; C14 mostra a diferença de aluno e atendente na estrutura
- concurrency: n/a - nenhuma escrita nova; o tema continua local ao navegador
- data lifecycle: n/a - nada gravado muda (`## Relations`: None)
- dependency failure: existing - o ranking vem da mesma consulta de Indicadores, e sai uma dependência (C24)
- state transitions: C11 (barra aberta e recolhida), C17 (com e sem conversa encerrável)
- observability: n/a - só o `web/` muda, e nenhuma decisão nova precisa de log

## Handoff

Tamanho: bytes dos arquivos que cada slice lê e edita (`wc -c` em 05/11/2026), divididos por 4: código ~22k (90 KB: `Autenticado.tsx`, `ui/sidebar.tsx`, `index.css`, `Assistente.tsx`, `Tabela.tsx`, `Indicadores.tsx`, `Grafico.tsx`, `CampoArquivo.tsx`), trechos de `arranjo.spec`, `ux.spec`, `identidade.spec` e `celular.spec` ~24k, `plan.md` e este arquivo ~10k, código e testes novos ~15k, varredura de `ring-ring/50` em `ui/` ~3k.

Total: 22k + 24k + 10k + 15k + 3k ≈ **74k**, abaixo do orçamento de 150k. Mecanismo: um construtor, no modelo Sonnet. Sem pergunta, porque cabe.

- **Base:** `<base>` = `93d5889`, o commit que grava `plan.md` e este arquivo.
- **Verificação:** Verifier novo, no modelo padrão, sobre `<base>..HEAD`, com até 3 rodadas; depois disso a decisão é do usuário. Na última entrega, um revisor novo dá a nota de "cara de IA" com prints antes e depois, usando logo e foto reais de teste.
- **Boundary:** `8aac849` (foco global e tokens, e a remoção de `Grafico.tsx`, que ficou nesse commit por ter sido apagado com `git rm` antes), `6d24532` (rodapé da barra, topo, item ativo), `3ede672` (caixa de envio), `5620241` (tabela), `e8476a9` (rankings, `recharts` fora) e `18c7491` (testes novos e ajustados), sobre `93d5889`. Fechados: C1 a C30. Resultado no `18c7491`: Vitest 524 verdes em 55 arquivos; `npm --prefix web run build` ok; `crapper` sai 0 no limite 9.99 (maior nota 9,8, `Sidebar`); `dryer` sem candidato; `git diff --quiet 93d5889 HEAD -- api api.Tests` sai 0. Arranjo (C27) 188 verdes contra `vite preview` na 5199. E2E real: imagem do `HEAD` (`git archive HEAD | docker build`) na 8089, banco `one_estrutura`, bucket `one-estrutura`, instituição `e2e` e contêiner `one-estrutura-api` próprios, todos removidos: a suíte inteira, 224 testes, verde (uma primeira tentativa falhou por eu não ter passado `E2E_INSTITUICAO=e2e`, `E2E_ADMIN_EMAIL=admin@e2e.one` e `E2E_CONTAINER=one-estrutura-api` aos specs reais antigos, e foi refeita com banco novo). Injeções à mão, todas pegas: contorno de foco de 2 px para 1 px (`foco de 2 px com 3:1 nas 4 telas` e `foco com cores forçadas`), barra do item ativo de 3 px para 1 px (`item ativo com barra de 3 px`), a caixa de envio de volta com borda, raio e sombra (`caixa de envio em uma linha`), o `first:ps-0` tirado da tabela (`tabela sem caixa e cabeçalho sem fundo`), `--ring` claro de volta a `0.708` (`ring sem cor e com marca` e `foco de 2 px com 3:1 nas 4 telas`) e a largura da barra dividida por `maior + 1` (`ranking com total e barra proporcional`). Prints de antes e depois em `.playwright-mcp/estrutura/` (22 de cada, a partir do fixture da API simulada; o de antes numa árvore de trabalho de `93d5889`).
- **Settled mid-build:** nada com o usuário. Decisões do construtor, para o Verifier julgar: (1) o topo mantém o `border-b` de 1 px; "sem separador" foi lido como o componente `Separator` (C12 mede `[data-slot=separator]`, `backdrop-filter` e o alfa do fundo). (2) C7 exige que `--sidebar` difira entre as marcas nos 3 temas, e uma mistura de 4% sobre `oklch(0 0 0)` dá `rgb(0,0,0)` nas duas; no Preto a barra ficou `color-mix(8% marca, oklch(0.1 0 none))`, portanto deixa de ser `#000` puro. (3) C3 exige `box-shadow` `none` no `Input` com foco, e o `Input` trazia `shadow-xs`; o `shadow-xs` saiu de `Input`, `Textarea` e `NativeSelect`. (4) `first:ps-0` entrou em `TableHead` e `TableCell` de `ui/table.tsx`, e a célula do estado vazio ganhou `first:ps-2` para continuar centrada; a barra do ranking tem 6 px de altura (com 8 px ela contaria como pílula em `pílula só em avatar, botão de ícone, selo e passo`). (5) A linha de pergunta ganhou `data-foco="dentro"`, e `index.css` tem a regra de `outline-offset: -2px` para `[data-sidebar='content']`, `[data-slot='table-container']` e `[data-foco='dentro']`, que são os contêineres que cortam. (6) O `input` de `CampoArquivo` é `sr-only`, então o contorno dele ficaria cortado; o contêiner ganhou o contorno por `has-[input:focus-visible]`. (7) `TabelaRanking` continua usando `useReactTable`, porque `interface.test.ts` `TanStack Table só nas 3 tabelas` exige isso de `Indicadores.tsx`. (8) No celular o botão de menu do topo só aparece com `isMobile` (JS), e o botão de recolher do rodapé tem `max-md:hidden`, o que evita botão duplicado no DOM dos testes de jsdom.
- **Asserções existentes editadas na lista fechada** (cada uma com o AC que a força): `arranjo.spec.ts` `painel cabeçalho` (AC 8, 11, 13: sem Tema nem separador, menu só abaixo de 768 px), `botão do usuário` (AC 9: sem iniciais nem seta), `cabeçalho: borda, título numa linha e botões de 36 px` (AC 8), `colunas largas somem no estreito` (AC 18: `thead` sem fundo, com o `--muted` pintado como controle), `arranjo Indicadores` e `rótulo do gráfico em até 2 linhas sem reticências` (AC 19, 21: tabela à vista, texto da célula); `push.spec.ts` `avisos no cabeçalho` (AC 8); `identidade.spec.ts` `raio pelo papel do componente` (AC 8, 14, 18, 19: "Consultar" no lugar de "Ver tabela", "Enviar" e "Tema" a 6 e 4 px, caixa da tabela a 0), `pílula só em avatar, botão de ícone, selo e passo` (AC 8, 9, 14: saem "Enviar", "Tema" e as iniciais da lista de pílulas permitidas) e `gráficos sem cartão com o título` (AC 19); `celular.spec.ts` `alvos de toque de 44 px abaixo de 768` (AC 14: o `Enviar` mede como `default` e o `icon` vem do `MenuAcoes`) e `Indicadores sem texto cortado` (AC 19, 21); `ux.spec.ts` `cor de ação só em botão principal, item ativo, link e foco` e `gráficos com a mesma cor calma` (AC 19: seletor `[data-barra]`; a barra é uma `div` com fundo próprio e o fundo vizinho vem do pai); `interface.test.ts` linha `--sidebar` de `Tokens` (AC 6) e as linhas `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` e `--ring`, que não existiam e entraram (AC 4, 6); `indicadores.test.tsx` `ranking com gráfico acima da tabela` e `ranking vazio sem gráfico` (renomeados `ranking com barras na própria tabela` e `ranking vazio sem barras`) e `rankings em tabela Categoria e Total`, e `revisao.test.tsx` `Ver tabela de %s` (agora `a tabela de %s já vem à vista`) (AC 19, 20).
- **Edições fora da lista, forçadas por um AC** (nenhuma baixa limite; para o Verifier julgar): `arranjo.spec.ts` `arranjo Assistente` (AC 14, 16: "Encerrar" na linha de "Falar com atendente", acima do campo), `painel barra aberta` (AC 12: o recolher fecha o rodapé e o usuário fica acima dele) e `valores de tipo e bordas` (AC 18: cabeçalho 600 e caixa da tabela a 0); `acesso.test.tsx` `botões do cabeçalho por papel` (AC 8, 13: a lista de botões do topo perde "Tema" e "Alternar barra lateral", que só existe abaixo de 768 px) e `sem tema gravado segue o sistema` (AC 8: espera o título, não o botão Tema, que abaixo de 768 px mora na gaveta); `acesso/textos.test.tsx` (AC 8: "Tema" entra no vocabulário visível); `assistente/textos.test.tsx` (AC 14: "Enviar" é texto visível); `assistente/icones.test.tsx` `Assistente traz ArrowUp, Hand e ShieldAlert` (AC 14; renomeado `Assistente traz Enviar escrito, Hand e ShieldAlert`: sem seta); `interface.test.ts` `tema claro enquanto houver react-bootstrap` (AC 8: o Tema só é esperado no desktop, e o aluno no celular tem a aba Conta); `indicadores/textos.test.tsx` (AC 19: sai "Ver tabela" e o clique nele); `indicadores.test.tsx` `cartões formatam taxa, horas e número...` (AC 19: sai o clique em "Ver tabela").
- **Apagado:** o teste `rótulo do gráfico` de `indicadores.test.tsx` (importava `linhasDoRotulo` de `Grafico.tsx`, que a door 4 e o C24 apagam; o corte do rótulo passou a ser medido por C23, `arranjo.spec.ts` e `celular.spec.ts`).
- **Abandonado ou não feito:** nada dos 30 checks. Fora do escopo e intocado: ícones da barra, formulário da Aparência, listas de `Conta` e `Matriculas`, mensagem sem internet do login. `web/e2e/zz-prints.spec.ts`, usado só para os prints, não foi commitado.

### Correções da rodada 1 (P7)

- Mecanismo: um construtor, depois do FAIL da rodada 1 do Verifier; a volta a `#000` é decisão do usuário em 05/11.
- **Boundary:** `c5270df` (código e testes de C7, C23 e C31 a C35) e o commit deste handoff, sobre o `104706b`. Fechados: C7, C23, C31, C32, C33, C34 e C35; com C1 a C30, os 35 checks estão `[x]`. Resultado: Vitest 524 verdes em 55 arquivos; `npm --prefix web run build` ok; `crapper` sai 0 no limite 9.99; `dryer` sem candidato; `git diff --quiet 93d5889 HEAD -- api api.Tests` sai 0. Arranjo (C27) 193 verdes contra `vite preview` na 5199. E2E real: imagem do `c5270df` (`git archive HEAD | docker build`) na 8089, banco `one_estrutura`, bucket `one-estrutura`, instituição `e2e` e contêiner `one-estrutura-api` próprios, removidos ao fim: a suíte inteira, 229 testes, verde (8,6 min). Injeções à mão, todas pegas: total do ranking com `overflow-wrap:anywhere` nas duas células (`total do ranking em uma linha`), `nowrap` na categoria (`categoria longa inteira nas 5 larguras`, agora medindo o `table-container`), barra ativa de volta ao `background` (`item ativo visível com cores forçadas` e `item ativo com barra de 3 px`), o corte das 2 linhas sem a folga de 4 px (`foco inteiro nos cartões, na primeira coluna e no Fechar`), a tabela sem a folga à esquerda (o mesmo teste e `foco não cortado por overflow`), o Fechar sem `focus-visible:opacity-100` (o mesmo teste), Tema e usuário trocados (`ordem do rodapé e recolher dentro da barra`), o recolher sem `self-center` (o mesmo teste: x = -5), o Enviar de volta a 36 px (`Enviar da altura do campo`) e a barra do Preto tingida de novo (`barra tingida pela marca` e, no Vitest, `tokens da paleta` e `tokens de Visual`). Prints novos de Fila, Indicadores e Assistente, a 390 e 1440 px no claro, em `.playwright-mcp/estrutura/` (`depois-*`, sobrescritos).
- **Settled mid-build:** (1) por decisão do usuário em 05/11 (P7), `--sidebar` do Preto volta a `oklch(0 0 0)`; o claro e o escuro seguem tingidos, e `--sidebar-foreground` sobre `#000` segue ≥ 4,5:1. A decisão (2) do build anterior deixa de valer. (2) A barra do item ativo é um `::before` de largura 0 com `border-left` de 3 px na cor de `--sidebar-primary`, no lugar do `background`; mantém os 3 px e o recorte `inset-y-1`, e C8 mede a borda do `::before`. (3) A tabela (`ui/table.tsx`) ganhou 4 px de folga à esquerda no contêiner (`-ms-1 ps-1`, o texto da primeira coluna continua alinhado), e o contorno de foco do contêiner deixou de entrar 2 px no controle: por isso o contorno do link da primeira coluna cerca as letras em vez de cruzá-las. O deslocamento negativo continua na barra lateral e na linha de pergunta. (4) O corte das 2 linhas dos cartões foi para um `span` interno com `-m-1 p-1`, que dá 4 px de folga ao contorno do link sem mudar a altura do `p[data-linha=assunto]`. (5) O recolher do rodapé, com a barra recolhida, centraliza (`self-center`), e fica em x = 2 com ponteiro grosso. (6) O botão Enviar tem `h-11` em todas as larguras, a altura do campo.
- **Asserções existentes editadas:** `interface.test.ts` linha `--sidebar` de `Tokens`, coluna Preto de `tingido(8, '0.1 0 none')` para `0 0 0` (lista fechada, item 6; AC 6 e P7). `casca.spec.ts` (arquivo da própria feature): `barra tingida pela marca` (C7: no Preto exige `rgb(0,0,0)` com as 3 marcas, e a diferença entre marcas só no claro e no escuro), `item ativo com barra de 3 px` (C8: a barra do `::before` é lida pela borda, não pelo fundo; AC 7) e `categoria longa inteira nas 5 larguras` (C23: soma a medida do `table-container`; AC 21). Nenhuma outra asserção existente mudou, e nenhum limite baixou.
- **Fora do escopo, registrado pelo Verifier e não feito:** o Esc que fecha a gaveta em 2 toques, as dicas que faltam no recolher e no usuário recolhidos, o arredondamento da barra do ranking, os itens do app fora dos checks e a mensagem sem internet.

### Correções da rodada 2 (P8)

- Mecanismo: um construtor, depois do FAIL da rodada 2 do Verifier.
- **Boundary:** `3f4731c` (código e testes de C36 a C39), `6d49bed` (o título volta ao próprio `span`, que `arranjo listas de chamados` e `texto das linhas de 14 px` localizam por `getByText(/^Preciso/)`) e o commit deste handoff, sobre o `4223b68`. Fechados: C36, C37, C38 e C39; com C1 a C35, os 39 checks estão `[x]`. C37 e C39 só ganharam teste (o produto já estava certo); C36 e C38 mudaram o código. Resultado no `6d49bed`: Vitest 524 verdes em 55 arquivos; `npm --prefix web run build` ok; `crapper` sai 0 no limite 9.99; `dryer` sem candidato; `git diff --quiet 93d5889 HEAD -- api api.Tests` sai 0. Arranjo (C27) 196 verdes e 1 falha, `Enviar da altura do campo`, que passa sozinho (rodou com a imagem do Docker sendo construída ao lado); a primeira rodada, antes de `6d49bed`, falhou em `arranjo listas de chamados` e `texto das linhas de 14 px` e levou ao segundo commit. E2E real: imagem do `6d49bed` (`git archive HEAD | docker build`) na 8089, banco `one_estrutura`, bucket `one-estrutura`, instituição `e2e` e contêiner `one-estrutura-r2` próprios, removidos ao fim: a suíte inteira, 233 testes, verde (8,7 min), com `E2E_INSTITUICAO=e2e`, `E2E_ADMIN_EMAIL=admin@e2e.one` e `E2E_CONTAINER=one-estrutura-r2`. Injeções à mão, todas pegas: `-m-1 p-1` de volta no corte (`corte de 2 linhas sem o alto da terceira`: `sem folga vertical`), a barra do ranking acima do rótulo (`barra do ranking embaixo do rótulo no estreito`), a dica do usuário tirada (`dica em recolher e no usuário com a barra recolhida`), a dica do recolher sempre escondida (o mesmo teste) e sempre à mostra com a barra aberta (o mesmo teste, o controle), e o Fechar da gaveta sem `focus-visible:opacity-100` (`foco inteiro no Fechar da gaveta`: `opacidade 1`).
- **Settled mid-build:** nada com o usuário. Decisões do construtor, para o Verifier julgar: (1) C36: o link do cartão virou o bloco de fora (`<Link className="block">`) e o corte das 2 linhas (`line-clamp-2`, sem `p-1` nem `-m-1`) é um `span` dentro dele; nada corta o contorno do link, e a caixa que corta mede 2 × `line-height` sem folga vertical. Efeito: o link agora cobre o número e o título (antes só o número), então o título também sublinha ao passar o ponteiro e é alvo de clique; o cartão já navegava pelo clique na linha, e o nome acessível do link passa a ser "ONE-123 título". (2) C33: a precondição "o link tem ancestral que corta" era do construtor, não do check, e deixou de valer. Virou "há 1 `line-clamp` dentro do link", e o controle passou a pôr `overflow: hidden` no pai do link com o contorno a 40 px, para a medida `foraDoCorte` acusar um corte; a alegação do check (contorno inteiro dentro de todo ancestral que corta) segue medida, agora por um cartão sem ancestral cortando. (3) C38: o recolher (`SidebarTrigger`, em `ui/sidebar.tsx`) ganhou `Tooltip` com o mesmo `hidden={state !== "collapsed" || isMobile}` do `SidebarMenuButton`, e a linha do usuário ganhou `tooltip={me.nome}`: a dica do recolher é "Alternar barra lateral" e a do usuário é o nome. Sem emenda de `## Screens`. (4) C36 mede o corte por geometria (altura da caixa, `padding` 0, linhas do `Range` que começam acima da base da caixa, contorno de foco inteiro) e não por pixel; Safari não foi testado.
- **Asserções existentes editadas:** `casca.spec.ts` `foco inteiro nos cartões, na primeira coluna e no Fechar` (teste da própria feature): só a precondição do cartão, como em (2). Nenhuma outra asserção existente mudou, e nenhum limite baixou.
- **Fora do escopo, registrado pelo Verifier e não feito:** o Esc que fecha a gaveta em 2 toques, a barra recolhida cortando `Aparência` em telas baixas, o alinhamento de `Total` no ranking, o arredondamento da barra e o centro vertical do clipe.

### Correções da rodada 3 (P9)

- Mecanismo: orquestrador; uma linha de produto (`tooltip={me.nome}` sai) e testes; escolha do usuário em 05/11.
- **Edições em asserções existentes:** o teste de C38 muda de nome e de texto (P9); `Enviar da altura do campo` ganha `test.setTimeout(90_000)`, porque o Verifier achou que 2 páginas nos 30 s padrão são a causa provável da falha isolada, sem a reproduzir. Nenhum limite baixou.
