# Estrutura visual sem cara de modelo - checks

Profile: ui
Plan: `.specs/features/estrutura-visual/plan.md`

30 checks em 6 slices (S1 a S5 e S0) · 4 one-way doors · 0 perguntas abertas (plano, emenda de AC 31 e rankings em HTML aprovados pelo usuário em 05/11)

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
| P6 | Largura da barra quando o total é 0 | total 0 dá largura 0, e o maior total dá 100% (C20) |

## Checks

### S1 - Foco visível e anexos (P1) · 12 files · 60 KB · ~15k

**C1** - [ ] Levando o foco com `Tab` na Fila, no Assistente, no detalhe do chamado e na Aparência, a 1280 px, nos 3 temas e com as 3 marcas, cada controle focado tem `outline-style` `solid`, `outline-width` ≥ 2 px e `outline-color` com contraste ≥ 3:1 contra o fundo opaco vizinho; ao menos 5 controles distintos por tela (door 1; AC 1)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco de 2 px com 3:1 nas 4 telas"`

**C2** - [ ] Com `forcedColors: 'active'`, nas mesmas 4 telas, a 1280 px, cada controle focado tem `outline-style` diferente de `none` e `outline-width` ≥ 2 px, incluindo a linha de pergunta do Assistente (AC 2)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco com cores forçadas"`

**C3** - [ ] Um `Button` comum e um `Input` com foco têm `box-shadow` `none`. Nenhum arquivo de `web/src` contém `ring-ring/50`, `outline-ring/50` nem `focus-visible:ring-[3px]`, e a varredura lê ao menos 8 arquivos de `ui/` (door 1; AC 3)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco sem auréola no botão e no campo"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "foco sem classes de auréola"`

**C4** - [ ] Pintado no `body`: no claro sem cor, `var(--ring)` é igual a `oklch(0.5 0 0)`; no claro, no escuro e no preto com `#8a1538`, `var(--ring)` difere do valor sem cor e é o mesmo de `var(--sidebar-ring)`. No escuro e no preto sem cor, `--ring` continua o de `<base>` (door 2; AC 4)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "ring sem cor e com marca"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens de Visual"`

**C5** - [ ] A área tracejada de anexos em Instituições, Matrículas, Documentos e no detalhe do chamado tem `border-style` `dashed` e contraste ≥ 3:1 contra o fundo em que está, nos 3 temas, sem cor e com `#0b6e4f` (AC 5)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "borda da área de anexos com 3:1"`

**C6** - [ ] Com foco, um link da barra lateral, um link da primeira coluna da Fila e uma linha de pergunta do Assistente têm a caixa do contorno (`boundingBox` + `outline-offset` + `outline-width`) dentro do retângulo de todo ancestral com `overflow` diferente de `visible`, com 1 px de tolerância; a linha de pergunta tem `outline-offset` negativo (P2; AC 1; `## Screens`)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "foco não cortado por overflow"`

### S2 - Barra lateral e topo (P1) · 8 files · 75 KB · ~19k

**C7** - [ ] Pintados no `body`, `--sidebar`, `--sidebar-accent` e `--sidebar-border` diferem entre `#8a1538` e `#0b6e4f`, nos 3 temas; o texto `--sidebar-foreground` sobre `--sidebar` tem contraste ≥ 4,5:1 nos 3 temas e com as 3 marcas (AC 6)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "barra tingida pela marca"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens da paleta"`

**C8** - [ ] A 1440 px, nos 3 temas e com as 3 marcas, o link ativo tem uma barra de 3 px (± 1) à esquerda (borda ou `::before`) na cor de `var(--sidebar-primary)`, com contraste ≥ 3:1 contra `--sidebar`, `color` igual à de `var(--sidebar-foreground)`, `font-weight` 600, fundo transparente e `aria-current="page"`. No mesmo teste, um link inativo não tem a barra, tem peso < 600 e não tem `aria-current` (door 3; AC 7)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "item ativo com barra de 3 px"`

**C9** - [ ] A 1440 px, o rodapé da barra tem o botão "Tema", que abre Claro, Escuro e Preto, e escolher Escuro põe `dark` no `<html>`. O `header` tem 0 botões "Tema", a 1440 e a 390 px (aluno e atendente). A 390 px, o aluno ainda escolhe o tema pela aba Conta (AC 8)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "Tema no rodapé da barra e fora do topo"`

**C10** - [ ] Com a barra aberta, o rodapé mostra nome e papel; a página tem 0 `svg.lucide-chevrons-up-down` e 0 elementos com as iniciais do usuário; clicar na linha do usuário abre o menu com "Sair" (P4; AC 9)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "usuário em texto com a barra aberta"`

**C11** - [ ] Com a barra recolhida, o rodapé mostra as iniciais do usuário, e o nome fica visualmente escondido; ao reabrir, as iniciais somem (controle) (AC 10)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "iniciais só com a barra recolhida"`

**C12** - [ ] A 1440 e a 390 px, nos 3 temas, o `header` tem `background-color` opaco (alfa 1), `backdrop-filter` `none` e 0 `[data-slot=separator]` (AC 11)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "topo opaco e sem separador"`

**C13** - [ ] A 768 e a 1440 px, o botão de recolher está no rodapé da barra, com 1 `svg`, sem texto visível e o mesmo `aria-label` de `<base>`; o `header` tem 0 botões de recolher; clicar recolhe e clicar de novo reabre (P3; AC 12)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "recolher no rodapé a partir de 768"`

**C14** - [ ] A 390 px, o atendente tem no `header` um botão de menu com `svg.lucide-menu`, que abre a gaveta com os links, Tema e o usuário; a 767 px, o mesmo. O aluno a 390 px não tem esse botão (controle) (AC 13)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "menu no topo abaixo de 768 para quem não é aluno"`

### S3 - Caixa de envio (P1) · 4 files · 40 KB · ~10k

**C15** - [ ] A 360, 390 e 1440 px, anexar, o campo e o botão "Enviar", nessa ordem da esquerda para a direita, se sobrepõem na vertical, sem estouro horizontal. O `form` e o campo têm `box-shadow` `none`, o `form` tem `border-width` 0, e com 1 linha de texto e sem anexo o `form` mede ≤ 60 px. A 390 px, anexar e "Enviar" medem ≥ 44 px de altura, e o campo tem `font-size` 16 px (P5; AC 14)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "caixa de envio em uma linha"`

**C16** - [ ] O campo da caixa de envio tem `border-width` ≥ 1 px e contraste ≥ 3:1 contra o fundo, nos 3 temas e com as 2 marcas, a 390 e a 1440 px (AC 15)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "borda da caixa de envio com 3:1"`

**C17** - [ ] Com conversa aberta que pode ser encerrada, "Encerrar" e "Falar com atendente" se sobrepõem na vertical, acima da linha do campo. Sem conversa, "Encerrar" não aparece e "Falar com atendente" continua (controle) (AC 16)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "Encerrar junto de Falar com atendente"`

**C18** - [ ] Enter com texto faz 1 `POST` da mensagem e limpa o campo; Shift+Enter quebra a linha sem `POST`; com o campo vazio ou só com espaços, "Enviar" está desabilitado (AC 17)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "Enter envia e campo vazio desabilita"`

### S4 - Tabelas sem caixa (P1) · 2 files · 10 KB · ~3k

**C19** - [ ] Em Fila e Usuários, a 1440 px, nos 3 temas: o ancestral imediato da rolagem da tabela tem `border-width` 0 e `border-radius` 0; o `th` tem fundo transparente, `font-weight` 600 e `border-bottom-width` ≥ 1 px, com contraste contra o fundo maior que o do fio entre linhas; o texto da primeira coluna fica alinhado (± 1 px) à esquerda do conteúdo da página (AC 18)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "tabela sem caixa e cabeçalho sem fundo"`

### S5 - Rankings sem biblioteca de gráfico (P1) · 6 files · 30 KB · ~8k

**C20** - [ ] Com totais 50, 25, 5 e 0, na ordem da API: 4 linhas nessa ordem, com a categoria inteira e o total em texto, e barras de largura 100%, 50%, 10% e 0% (P6; AC 19)
Proof: `cd web && npx vitest run src/indicadores/ranking.test.tsx -t "ranking com total e barra proporcional"`

**C21** - [ ] Em Indicadores, nos 3 temas e com as 2 marcas, a 390 e a 1440 px, cada barra tem cor igual à de `var(--chart-1)`, diferente da de `var(--primary)` e com contraste ≥ 3:1 contra o fundo; o total tem `font-variant-numeric` com `tabular-nums` e fica à direita da categoria; a página tem 0 `svg.recharts-surface` e 0 botões "Ver tabela" (door 4; AC 19)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "barras do ranking na cor calma e sem Recharts"`

**C22** - [ ] Sem linhas no ranking, a seção mostra o título e o mesmo estado vazio de `<base>`, com 0 barras; com a API sem o ranking, a seção não aparece (AC 20)
Proof: `cd web && npx vitest run src/indicadores/ranking.test.tsx -t "ranking vazio e ausente"`

**C23** - [ ] A 360, 390, 768, 1024 e 1440 px, com uma categoria de 60 caracteres, o texto inteiro está visível: `scrollWidth` ≤ `clientWidth` e `text-overflow` diferente de `ellipsis` na linha, sem estouro horizontal da página (AC 21)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/casca.spec.ts -g "categoria longa inteira nas 5 larguras"`

**C24** - [ ] `recharts` não está em `web/package.json` nem em `package-lock.json` como dependência direta; `web/src/indicadores/Grafico.tsx` não existe; o build não gera arquivo `Grafico-*` em `api/wwwroot/assets` (door 4)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "sem biblioteca de gráfico"`

### S0 - Invariantes e barreiras (P1)

**C25** - [ ] A suíte Vitest inteira e o build passam. As edições em asserções existentes são as da lista fechada ou as permitidas por ela, cada uma no `## Handoff` com o AC que a força (AC 22)
Proof: `npm --prefix web test`
Proof: `npm --prefix web run build`

**C26** - [ ] O `crapper` sobre `web/src` sai 0 no limite 9.99, o `dryer` não acha candidato com nota 0.8 ou mais, e nenhum arquivo de `api/` nem de `api.Tests/` muda desde `<base>` (AC 22)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage --threshold 9.99 src`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/indicadores -s src/administracao -s src/ui --threshold 0.8`
Proof: `git diff --quiet <base> HEAD -- api api.Tests`

**C27** - [ ] A suíte de arranjo passa inteira com a API simulada, salvo `plataforma.spec.ts` `manifesto e service worker`, que precisa de API e é julgado em C29 (AC 22)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/ux.spec.ts e2e/aparencia.spec.ts e2e/identidade.spec.ts e2e/casca.spec.ts`

**C28** - [ ] De ponta a ponta na imagem própria: o atendente escolhe Escuro no rodapé da barra, recarrega e continua em Escuro; o aluno manda uma mensagem pela caixa nova com Enter, e ela aparece na conversa; em Indicadores, com chamados criados, o ranking mostra a categoria e o total reais, com 1 barra por linha (AC 8, AC 17, AC 19)
Proof: `cd web && E2E_URL=http://localhost:8089 npx playwright test e2e/casca-real.spec.ts`

**C29** - [ ] A suíte e2e inteira passa contra a imagem própria do `HEAD` na porta 8089 (AC 22)
Proof: `cd web && E2E_URL=http://localhost:8089 npx playwright test --grep-invert "@simulada"`

**C30** - [ ] Os testes dos invariantes de AC 22 passam sem baixar limite: alvos de 44 px, campos de 16 px, barra de abas, cor de ação e neutros tingidos, mais os checks C47 a C57 de `identidade-visual` (AC 22)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "alvos de 44 px abaixo de 768 em todas as telas"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "campos de 16 px abaixo de 768 e com ponteiro grosso"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "barra de abas: 3 colunas iguais e ícone sobre rótulo de 12 px"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "cor de ação só em botão principal, item ativo, link e foco"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "neutros mudam com a cor da instituição"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "borda do form igual ao token no escuro e no preto"`

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

- **Base:** `<base>` é o commit que grava este arquivo.
- **Verificação:** Verifier novo, no modelo padrão, sobre `<base>..HEAD`, com até 3 rodadas; depois disso a decisão é do usuário. Na última entrega, um revisor novo dá a nota de "cara de IA" com prints antes e depois, usando logo e foto reais de teste.
