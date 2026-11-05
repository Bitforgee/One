# Identidade visual sem cara de modelo - checks

Profile: ui
Plan: `.specs/features/identidade-visual/plan.md`

46 checks em 6 slices (S1 a S5 e S0) · 4 one-way doors · 0 perguntas abertas (P1 a P14 decididos em 05/11 pelo orquestrador, com o plano aprovado pelo usuário)

**Como as provas rodam.** Todos os comandos rodam na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é o
commit que congela `plan.md` e este `checks.md`, gravado no `## Handoff`.

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `web/` unidade | Vitest (jsdom): `cd web && npx vitest run <arquivo> -t "<nome>"`. Relógio com `vi.useFakeTimers({ toFake: ['Date'] })` e `vi.setSystemTime`, como em `aparencia.test.tsx` `Indicadores sem dados com ilustração`. Rota não simulada responde `404` (`test/util.tsx`). O jsdom não mede layout, não aplica `@media` e não pinta: nenhum claim de fonte, cor, raio ou posição é provado aqui (L-079) | `npm --prefix web ci` |
| `web/` arranjo e medida | Playwright no Chromium com a API simulada (`e2e/simulada.ts`). Medidas por `boundingBox()` e `getComputedStyle`, em px CSS, com tolerância de 1 px. **Fonte:** `getComputedStyle(el).fontFamily` começa por `"Public Sans Variable"` (sans) ou por `"Source Serif 4 Variable"` (serifa), lido depois de `await document.fonts.ready`. `document.fonts.check(...)` devolve `true` também quando nenhuma face casa o nome, então toda prova de fonte carregada afirma ainda uma `FontFace` de `document.fonts` com `family` igual ao nome (sem aspas) e `status` `loaded`. **Rede:** `page.on('request')` grava cada URL pedida. **Cor:** a cor computada é pintada num `canvas` 1×1 e lida em sRGB de 8 bits (`instalar` e `window.__ux.pintar` de `ux.spec.ts`, como em `tema Preto com fundo preto`); "igual a `var(--x)`" compara com um elemento de referência pintado com `var(--x)` na mesma página. **Relógio:** `page.clock.setFixedTime(new Date('2026-11-05T13:00:00Z'))`. **Varredura:** as telas de `varrer` de `ux.spec.ts` (as de `Telas`, Conta e Instituições), com o ajudante movido para `simulada.ts` se `identidade.spec.ts` o usar | o `playwright.config.ts` não tem `webServer`: `npm --prefix web run build`, `npx vite preview --port 5199` em `web/` e depois `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/<arquivo> -g "<nome>"` |
| `web/` e2e real | Playwright contra uma imagem própria do `HEAD` na porta 8089, com banco, bucket e instituição `e2e` próprios, no padrão de `revisao-ux` (8087). Cada spec novo loga no máximo 2 vezes (L-066), e `workers: 1` continua | ver `## Handoff` |
| barreiras | `crapper` e `dryer` em `web/` (AD-018); mutação suspensa (AD-025); sem `dotnet`, porque nenhuma linha de `api/` muda (C43) | `npm --prefix web run coverage` |

Um filtro que não seleciona teste nenhum sai com código 0 (L-002). O construtor confere que cada `-t` e cada `-g`
executam pelo menos 1 teste. O nome citado numa linha `Proof:` é o contrato: o que não existe em `<base>` é criado
com exatamente esse nome (L-022). Arquivos de teste novos: `src/identidade.test.tsx`,
`src/acesso/identidade.test.tsx`, `src/assistente/identidade.test.tsx`, `src/indicadores/identidade.test.tsx`,
`src/administracao/identidade.test.tsx`, `e2e/identidade.spec.ts` e `e2e/identidade-real.spec.ts`. Cada
`identidade.test.tsx` de fatia abre uma tela da sua fatia, como `estrutura.test.ts` exige.

Nenhuma asserção vale para um elemento que pode não existir: nada de `if (await x.count())` (L-069). Cada medida
começa afirmando a contagem do que mede, e cada varredura afirma quantos elementos varreu. Centralização e
alinhamento são medidos nos elementos alinhados e contra a borda que o check nomeia, nunca no contêiner de largura
total (L-072, L-076). Um claim com "A (ou B)" tem um caso com A e outro com B (L-073), e cada membro nomeado é um
caso próprio. Uma asserção de ausência só vale com um caso de controle no mesmo teste em que o ausente aparece, ou
com um literal fixo que não depende do dado (L-082).

**Asserções existentes que podem mudar** (lista fechada; o Verifier confere cada edição contra ela). Cada edição só
pode levar a asserção ao arranjo, à fonte ou ao texto novo, e fica listada no `## Handoff` com o AC que a força. Um
teste que "sai" é apagado no mesmo commit que cria o check que o substitui:

1. `web/src/test/estrutura.test.ts`: `identidade.test.tsx` entra em `Raiz`, como exceção nomeada (o arquivo é
   nomeado por este `checks.md`, como `ux.test.tsx`).
2. `web/src/test/interface.test.ts`:
   - `tokens da paleta`: a linha de `--font-sans` (linha 180) passa a `'Public Sans Variable', …` (AC 1, door 1);
   - `tokens da paleta` e `tokens de Visual`: a linha `['--radius', '0.5rem', '0.5rem', '=']` da tabela `Tokens` sai,
     porque o raio único vira a escala da door 2 (AC 3);
   - `contraste do painel de entrada`: sai o literal `border-l bg-muted p-10` de `acesso/Acesso.tsx` (não há mais
     painel); o cálculo de contraste sobre `--muted` e o limite de 4,5 ficam (AC 5, door 3);
   - `títulos de página`: a regex do `h1` de `acesso/Acesso.tsx` passa às classes do nome da instituição em serifa de
     28 px; a contagem de arquivos com `h1` não muda (AC 2, AC 5).
3. `web/src/ux.test.tsx`: `opsz da Inter sem fonte nova` (linhas 159 a 164) sai, substituído por C1 (AC 1, door 1).
4. `web/e2e/ux.spec.ts`:
   - `títulos com opsz 32 da Inter` sai, substituído por C2 e C4 (AC 1, AC 2);
   - `no máximo 4 tamanhos de texto por tela`: além do único T de 20 ou 24 px, aceita 28 px só no nome da
     instituição no Login e 40 px só no número principal de Indicadores (AC 2; Screens: Login, Indicadores);
   - `sem emoji nem gradiente`: sai a exceção da faixa sobre a imagem do login (`previousElementSibling` `IMG`); o
     teste fica mais estrito (AC 6);
   - `destaques de Indicadores em 2 colunas no celular` sai, substituído por C28 (AC 14);
   - `gráficos com a mesma cor calma`: o fundo do contraste passa de `closest('[data-slot=card]')` ao fundo opaco
     mais próximo da barra; o limite de 3:1, os temas e as cores ficam (AC 16).
5. `web/e2e/arranjo.spec.ts`:
   - `fonte Inter do próprio app` sai, substituído por C2, que também afirma a origem única (AC 1);
   - `cartões sem sombra`: sai a parte de Indicadores (os 13 cartões e os cantos de 8 px); o teste passa a afirmar
     `box-shadow` `none` no cartão "Ações" do detalhe a 1280 px (AC 14 a AC 16);
   - `arranjo Indicadores` e a parte de Indicadores de `valores de tipo e bordas` (rodapés, `card-title`, cartões
     compactos) passam ao arranjo de C27 a C30; em `valores de tipo e bordas`, o canto da caixa da tabela da Fila
     passa de `8px` a `12px` (AC 3, AC 12, AC 14 a AC 16);
   - `arranjo telas de acesso` e `telas de acesso centralizadas ${caminho}` (as 3 telas de acesso; a raiz `/` fica):
     largura e centro passam aos da coluna única de C9 (AC 5);
   - o bloco `entrada institucional`: `entrada em duas colunas`, `entrada numa coluna abaixo de 1024 px`,
     `recuo da coluna de entrada`, `linha da marca na entrada`, `bloco do formulário por largura`,
     `cabeçalho do Login`, `cabeçalho de Primeiro acesso e Criar senha`, `formulário do Login: espaços, erro e teclado`,
     `fundo e borda do painel`, `conteúdo do painel`, `posição do conteúdo do painel`,
     `alerta de sucesso de Criar senha` e `frase do Login à esquerda`. Saem as partes do painel e da faixa de 128 px;
     "Entre com seu CPF e sua senha." passa a ficar logo abaixo do nome (P1); as distâncias entre campos, a ordem do
     `Tab`, o erro abaixo de "Entrar" e o recuo da coluna passam à coluna única (AC 5 a AC 7, door 3);
   - `Detalhe: cartão da equipe antes da conversa e ações que quebram em linhas`: o bloco do resumo deixa de ser
     `[data-slot=card]`; a posição acima da conversa e a quebra das ações ficam (AC 17);
   - `detalhe em duas colunas`: só o localizador do Histórico, que deixa de ser `[data-slot=card]` (P7) (AC 17);
   - `lista vazia centralizada`: `svg[data-ilustracao]` passa ao ícone `svg.lucide` (AC 18);
   - `alertas de Indicadores`: só o localizador do bloco do vazio, se ele mudar de pai (AC 18).
6. `web/e2e/celular.spec.ts`, `Indicadores sem texto cortado`: a varredura passa de `main [data-slot=card] *` a
   `main *`, e o teste afirma ter varrido pelo menos 1 elemento antes de comparar com `[]` (L-069, L-082)
   (AC 14 a AC 16).
7. `web/e2e/aparencia.spec.ts`:
   - `logo até 40 px no login`: o limite passa a 48 px (Screens: Login sem foto, item 1);
   - `imagem do login no painel e na faixa`: a faixa passa a 160 px, e os textos saem de cima da foto para a coluna
     (AC 6, AC 7);
   - `ilustração no login sem imagem` sai, substituído por C9 (AC 5, AC 19);
   - `sugestões centralizadas em 1 e 2 colunas` sai, substituído por C18 e C22 (AC 8, AC 11);
   - `textos do login na base sobre a faixa` sai, substituído por C13 (AC 6).
8. Vitest de tela:
   - `aparencia.test.tsx`: `logo no login e na barra` (a classe `h-10` passa à do logo de até 48 px),
     `textos do login da instituição ou os de base` (só o localizador do título, se ele deixar de ser `heading`),
     `imagem do login no painel e na faixa` (a contagem de `img` de login segue o arranjo novo; `alt=""` fica),
     `raiz com a ilustração Boas-vindas` (sai, substituído por C16), `Indicadores sem dados com ilustração` (sai,
     substituído por C35); `ícone na aba, na barra recolhida e no topo` e `item Contato no menu só com contato`
     esperam "Atendimento ao estudante · …" no lugar de "Olá! Eu sou Assistente." (AC 5 a AC 8, AC 18 a AC 20);
   - `acesso/acesso.test.tsx`, `painel de entrada sem foco e sem ícones`: o painel sai; o teste passa a afirmar, nas
     3 telas, que a coluna não tem `svg[data-ilustracao]` nem elemento focável fora do formulário (AC 5);
   - `acesso/textos.test.tsx`: `textos Login`, `textos Primeiro acesso`, `textos Criar senha`, `textos raiz` e a lista
     de literais (entram o título e a frase do login nas 3 telas; "Entre com seu CPF e sua senha." fica só no Login,
     P1, P2) (AC 5, AC 20);
   - `assistente/boasvindas.test.tsx`: `boas-vindas com nome, foto e perguntas` e `boas-vindas padrão sem aparência`
     (saem a foto de 64 px, "Olá! Eu sou" e a ilustração `Conversa`); `perguntas padrão` e
     `tocar na sugestão envia a pergunta` só se a linha deixar de ser `button` (AC 8, AC 9, AC 11);
   - `assistente/conversa.test.tsx`, `sem conversa: exemplo, sem Encerrar, e a mensagem do aluno à direita`: o texto
     esperado passa de `/Pergunte, por exemplo/` a "Respostas com base nas normas da instituição.", nos dois
     lugares (presente antes, ausente depois da mensagem) (AC 8);
   - `assistente/textos.test.tsx`: `textos Assistente` e a lista (saem "Olá! Eu sou Assistente." e o exemplo; entram
     "Atendimento ao estudante · …", a frase de base e "assistente virtual") (AC 8, AC 9);
   - `administracao/aparencia.test.tsx`, `prévia muda antes de salvar`: "Olá! Eu sou Vagner." passa a
     "Atendimento ao estudante · …" e "Vagner, assistente virtual" (AC 21);
   - `indicadores/indicadores.test.tsx`: `destaques de Indicadores`, `indicadores compactos na ordem` e
     `cartões formatam taxa, horas e número, e o ranking vazio mostra traço` (só os localizadores de cartão; os
     valores formatados ficam); `período pelos campos de data só consulta no Consultar` (a lista de URLs ganha a do
     período anterior: `de=2026-10-22&ate=2026-10-31` depois de `de=2026-11-01&ate=2026-11-10`, e
     `de=2026-10-19&ate=2026-11-02` depois de `de=2026-11-03&ate=2026-11-17`); `Sem dados no período` só se afirmar
     a ilustração (AC 12, AC 14, AC 15, AC 18);
   - `indicadores/revisao.test.tsx`, `um controle de período, destaques e Ver tabela: os 4 destaques`: passa a 1
     principal e 3 na faixa; a regra do rótulo (até 24 caracteres) e da frase (até 70, com ponto) fica (AC 12, AC 14);
   - `indicadores/textos.test.tsx`: `textos Indicadores` e a lista ("vs. período anterior" entra) (AC 12);
   - `tabela.test.tsx`: `vazio ilustrado nas 6 listas` sai, substituído por `vazio com ícone nas 6 listas` (C35), que
     mantém o título, a frase e os botões dele (P6) (AC 18);
   - `ilustracoes/ilustracoes.test.tsx`: `6 ilustrações só com currentColor e tokens` passa a
     `Planilha só com currentColor e tokens`, com 1 ilustração (AC 19);
   - `chamados/textos.test.tsx`, `textos detalhe do chamado`: a lista ganha "Dados do aluno" (P7) (AC 17).

## Decisões

Derivações que o plano deixava sem valor ou que esbarravam num teste aprovado. Todas: decisão do orquestrador em
05/11, com o plano aprovado pelo usuário. O `plan.md` foi editado na door 2, nos critérios e em `## Screens` onde a
decisão muda o sentido, com a nota em `## Assumptions`. A coluna "Decisão" é o que os checks abaixo afirmam.

| # | Ponto | Decisão |
| --- | --- | --- |
| P1 | Screens enumerava a coluna do Login sem "Entre com seu CPF e sua senha." | a frase fica, como texto de apoio logo abaixo do nome da instituição, só no Login (C10, C15) |
| P2 | AC 5 vale para "as telas de acesso", mas Screens só descrevia o Login | Primeiro acesso e Criar senha usam a mesma coluna, sem o texto de apoio; o título da tela fica entre a frase do login e o primeiro campo (C12) |
| P3 | Door 2 dava 4 px à "linha de lista", mas `revisao-ux` C29 exige `border-radius` 0 nas linhas de Fila e Minhas solicitações | 4 px só na linha de pergunta do Assistente, no item de menu (`[role=menuitem]`) e no item da barra lateral; Fila e Minhas solicitações ficam com 0 (C5, C22) |
| P4 | Door 2: `rounded-full` "só em avatar, sino e barra de abas" | `rounded-full` só em avatar e foto, nos botões só de ícone circulares ("Enviar", avisos e "Tema"), nos selos de estado e nos números dos passos de Matrículas; todo outro botão, inclusive "Falar com atendente" e os botões de link da resposta, tem 6 px (C5, C6) |
| P5 | AC 12 dava só "▲ 4,2 pts", "▼ 1,0 pt" e "= sem variação" | (atual − anterior) × 100 com 1 casa; 0,0 dá "= sem variação"; "pt" abaixo de 2,0 e "pts" de 2,0 em diante (C26) |
| P6 | AC 18 e Screens falavam em "ícone, frase e botão"; hoje o vazio tem também o título | o título fica (C35) |
| P7 | AC 17 citava "contato" no detalhe, que não tem esse bloco; o Histórico não era nomeado; os títulos de seção não tinham texto | dados do aluno e Histórico perdem borda e fundo de cartão e ganham os títulos "Dados do aluno" e "Histórico"; "contato" sai do AC (C33, C34) |
| P8 | A Conta no AC 17 | a Conta sai do AC 17 e continua uma lista agrupada com borda (padrão de lista de ajustes); ela entra como painel de 12 px em C5 |
| P9 | "{nome do assistente}, assistente virtual" sem `assistente.nome` | "Assistente virtual" (C19) |
| P10 | "Atendimento da {nome}" dava "Atendimento da Centro …" | o título passa a "Atendimento ao estudante · {nomeCurto ou nome}" (C17, C18, C39) |
| P11 | `revisao-ux` AC 41 (um só tamanho de título, 20 ou 24 px) contra o nome de 28 px e o número de 40 px; `revisao-ux` C57 (nenhuma borda na cor de ação) contra a borda à esquerda da solicitação em aberto | a varredura de tamanhos ganha as 2 exceções nomeadas (lista fechada, item 4); a borda da solicitação é exceção à C57 (o teste dela mede só `border-top` e não abre o Assistente sem conversa, então não muda) |
| P12 | "marcador discreto" nos itens do login | `list-style-type` diferente de `none` e `::marker` com a cor de `var(--muted-foreground)` (C11) |
| P13 | AC 14 e AC 15 davam a quebra em 768 px de janela; a `layout-painel` door 5 liga as grades de Indicadores à largura do `main` | as colunas seguem o contêiner `main` (`@container/main`): 3 e 2 colunas com o `main` de 768 px ou mais, 1 abaixo. Com a barra aberta, o `main` mede a janela − 304 px (976 a 1280 e 1136 a 1440, como em `arranjo Indicadores`), então as janelas de 1072 e 1071 px dão 768 e 767 px de `main` (C28, C29) |
| P14 | AC 10 não dizia o que acontece se `GET /api/chamados?escopo=meus` falhar | sem a linha e sem alerta; título, frase e perguntas ficam (C20) |

## Checks

### S1 - Fontes e raios (P1) · ~20 files · ~105 KB · ~26k

**C1** - [x] Em `web/package.json`, os pacotes de `dependencies` que começam por `@fontsource` são exatamente
`@fontsource-variable/public-sans` e `@fontsource-variable/source-serif-4`. `main.tsx` importa os dois pelo
`index.css` de cada pacote (o arquivo `wght`, sem `opsz.css`), e nenhuma linha de `main.tsx` nem de `index.css`
contém `inter` (sem caixa). No `@theme` de `index.css`, `--font-sans` começa por `'Public Sans Variable'` e
`--font-heading` começa por `'Source Serif 4 Variable'` (AC 1, AC 2, door 1)
Proof: `cd web && npx vitest run src/identidade.test.tsx -t "fontes Public Sans e Source Serif 4 sem Inter"`

**C2** - [x] No Login (`/univag`), depois de `document.fonts.ready`:
- `getComputedStyle(document.body).fontFamily` começa por `"Public Sans Variable"`;
- `document.fonts` tem uma `FontFace` `Public Sans Variable` e uma `Source Serif 4 Variable`, ambas `loaded`, e
  nenhuma face com `Inter` no nome;
- `document.fonts.check('16px "Public Sans Variable"')` e `document.fonts.check('28px "Source Serif 4 Variable"')`
  são `true`.

No registro de rede do Login, do Assistente e de Indicadores, há pelo menos 1 pedido a
`/assets/public-sans-latin-wght-normal-*.woff2` e 1 a `/assets/source-serif-4-latin-wght-normal-*.woff2`, nenhum URL
contém `inter-`, e todo pedido é da origem do app (AC 1, door 1)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "Public Sans e Source Serif 4 carregadas e nenhuma Inter"`

**C3** - A 390 e a 1440 px, nas telas da varredura, todo elemento visível com texto próprio, ou campo, que é ou fica
dentro de um destes 7 tipos tem `fontFamily` começando por `"Public Sans Variable"`:
- `body` (o texto corrido);
- `button` e `[data-slot=button]`;
- `input`, `textarea` e `select`;
- `td` e `th`;
- `[data-slot=badge]`;
- `[role=menuitem]`, com o menu "Ações de …" de Artigos e o menu do usuário abertos;
- o `header` da casca, cujo `h1` mede `font-size` 16 px.

O teste afirma pelo menos 1 elemento de cada tipo na varredura antes de comparar (AC 1, AC 2; Assumptions: barra do
topo em sans)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "texto e controles em Public Sans"`

**C4** - A 390 e a 1440 px, na varredura mais o Assistente sem conversa e a raiz `/`:
- todo elemento visível com `fontFamily` começando por `"Source Serif 4 Variable"` mede `font-size` ≥ 20 px e é um
  destes 5: `h1` ou `h2` fora do `header`, o número principal de Indicadores, o nome da instituição no login, o
  título das boas-vindas ou "One" na raiz;
- todo `h1` e `h2` visível fora do `header` com `font-size` ≥ 20 px tem `fontFamily` começando por
  `"Source Serif 4 Variable"`, e todo `h1` e `h2` com menos de 20 px começa por `"Public Sans Variable"`.

O teste afirma pelo menos 1 elemento em serifa no Login, no Assistente sem conversa, em Indicadores, no detalhe do
chamado (o `h2` do título, 24 px) e na raiz (AC 2, door 1)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "serifa só em títulos de 20 px ou mais"`

**C5** - [x] O `border-radius` computado (os 4 cantos, salvo onde dito) é, table-driven sobre 23 medidas:

| Papel | Valor | Elementos medidos |
| --- | --- | --- |
| campo | 4 px | `Input` "CPF" do Login a 1440 px; `Textarea` "Mensagem" do Assistente a 1440 px; `NativeSelect` de Cadastros a 390 px |
| linha de lista (P3) | 4 px | o primeiro `[role=menuitem]` do menu "Ações de …" de Artigos a 1440 px; o `[data-sidebar=menu-button][data-active=true]` da Fila a 1440 px |
| linha sem raio (P3, `revisao-ux` C29) | 0 | a linha de Fila e a de Minhas solicitações a 390 px |
| botão (P4) | 6 px | "Entrar" (`default`) do Login; "Ver tabela" (`ghost`) de Indicadores; "Falar com atendente" (`outline`) do Assistente; o botão de link "portal.univag.edu.br/financeiro/boletos/segunda-via" da resposta do Assistente, todos a 1440 px |
| pílula (P4) | ≥ metade da altura | "Enviar" do compositor do Assistente e "Tema" do cabeçalho a 1440 px; o selo "Aguardando aluno" da Fila a 1440 px; o número "1" dos passos de Matrículas a 1440 px |
| painel | 12 px | o cartão "Ações" do detalhe a 1440 px; a caixa da tabela da Fila a 1440 px (pai de `[data-slot=table-container]`); a região "Prévia" da Aparência a 1440 px; o cartão de uma linha de Artigos a 390 px (`[data-cartoes] [data-slot=table-row]`); a lista agrupada da Conta a 390 px (P8) |
| `Dialog`, `Sheet`, menu | 16 px | o `Dialog` "Encaminhar para outro setor?" a 1280 px; o `Sheet` do "Mais" do detalhe a 390 px (só os 2 cantos de cima); o `[role=menu]` de "Ações de …" de Artigos a 1440 px |

(AC 3, door 2)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "raio pelo papel do componente"`

**C6** - A 390 e a 1440 px, nas telas da varredura com `comAparencia`, todo elemento visível com o menor lado ≥ 8 px
e `border-radius` ≥ metade do menor lado − 1 px (pílula ou círculo) é um destes (P4):
- avatar ou foto: a `img` da foto do assistente e as iniciais do usuário no botão do usuário;
- um botão só de ícone circular: "Enviar" do compositor, o botão de avisos (ícone `Bell` ou `BellOff`) ou "Tema";
- um selo de estado (`[data-slot=badge]`);
- o número de um passo de Matrículas.

Todo `[data-slot=button]` visível fora de "Enviar", avisos e "Tema" mede 6 px nos 4 cantos. O teste afirma ter
achado pelo menos 1 pílula (a foto do assistente nos balões do Assistente) e pelo menos 1 `[data-slot=button]` no conjunto das telas da varredura (Minhas solicitações não tem nenhum: os gatilhos de "Tema" e de avisos são `popover-trigger`; decisão do orquestrador em 05/11, depois do lote 1)
tela (AC 3, door 2)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "pílula só em avatar, botão de ícone, selo e passo"`

**C7** - [x] O `@theme` de `index.css` declara `--radius-xs` 4 px, `--radius-sm` 6 px, `--radius-md` 12 px e
`--radius-lg` 16 px (em `px`, ou em `rem` de valor igual: 0.25, 0.375, 0.75 e 1), e nem `:root`, nem `.dark`, nem
`.black` declaram `--radius` (AC 3, door 2)
Proof: `cd web && npx vitest run src/identidade.test.tsx -t "escala de raios por papel em index.css"`

**C8** - [x] Com o service worker ativo no Login (como em `plataforma.spec.ts` `manifesto e service worker`), os URLs de
`caches` têm exatamente 1 que casa `/assets/public-sans-latin-wght-normal-[^/]+\.woff2` e 1 que casa
`/assets/source-serif-4-latin-wght-normal-[^/]+\.woff2`, e nenhum contém `/inter-`. Os corpos desses 2 arquivos,
lidos por `request.get`, somam ≤ 92 160 bytes (90 × 1024). Na mesma prova, a pasta `api/wwwroot/assets` do build
não tem arquivo começando por `inter-` e tem os 2 arquivos (AC 4; Impact: PWA)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "fontes latin no precache com até 90 KB"`

### S2 - Login com a cara da instituição (P1) · ~7 files · ~87 KB · ~22k

**C9** - [x] Sem imagem de login, nas 3 telas de acesso (`/univag`, `/univag/primeiro-acesso`,
`/univag/definir-senha?token=t`), a 390, 1023, 1024 e 1440 px, com `semAparencia` e com `comAparencia` de
`imagens.login` `null` (24 casos, table-driven):
- a coluna (o menor elemento que contém o nome da instituição e o formulário) mede largura ≤ 401 px, e o centro
  horizontal dela fica a no máximo 1 px do centro de `document.documentElement.clientWidth` (a centralização
  afirmada é a horizontal; o plano não fixa a vertical);
- todo elemento visível que não é ancestral da coluna fica dentro da faixa horizontal dela (1 px): não há painel
  lateral;
- não há `svg[data-ilustracao]`, nem `img[src*="/imagens/login"]`, nem elemento com `background-image` que
  contenha `gradient` (AC 5, door 3)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "login sem foto em coluna única de até 400 px"`

**C10** - No Login sem imagem de login, a 390 e a 1440 px, de cima para baixo, cada `top` ≥ o `bottom` do anterior
− 1 px, nesta ordem:
1. o logo (`img[src*="/imagens/logo"]`, altura ≤ 49 px) ou as iniciais;
2. o nome "Centro Universitário de Várzea Grande";
3. o título do login;
4. a frase do login;
5. "Entre com seu CPF e sua senha." (P1), o elemento imediatamente antes do rótulo "CPF" no DOM (ordem ajustada pelo orquestrador em 05/11, depois do lote 1: a instrução fica junto do formulário);
6. "CPF", "Senha", "Entrar" e o link "Primeiro acesso ou esqueci minha senha";
7. a lista dos itens, com 3 `li`.

São 2 casos: `semAparencia` (as iniciais, "Atendimento ao estudante", a frase e os 3 itens de base) e `comAparencia`
com `imagens.login` `null` (o logo, "Fale com a Univag", "Aqui você resolve tudo sobre a sua vida acadêmica.",
"Boletos", "Matrícula" e "Documentos") (AC 5; Screens: Login sem foto, itens 1 a 6)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "login sem foto: logo, nome, textos, formulário e itens nessa ordem"`

**C11** - [x] No Login sem imagem de login, a 390 e a 1440 px, sem cor e com `#8a1538`:
- o nome da instituição tem `fontFamily` começando por `"Source Serif 4 Variable"` e `font-size` 28 px;
- o título e a frase do login têm `color` igual à de `var(--muted-foreground)`;
- cada um dos 3 `li` dos itens tem `list-style-type` diferente de `none` e `::marker` com a cor de
  `var(--muted-foreground)` (P12);
- o `background-color` pintado do `body` é igual ao de `var(--background)`, e nenhum ancestral da coluna tem outro
  fundo opaco (AC 5; Screens: Login sem foto, itens 2, 4 e 6 e o fundo)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "login sem foto: nome em serifa de 28 px, textos secundários e fundo tingido"`

**C12** - [x] Em Primeiro acesso e em Criar senha, sem imagem de login, com `semAparencia`, a 390 e a 1440 px, de cima
para baixo, cada `top` ≥ o `bottom` do anterior − 1 px (P2):
1. as iniciais;
2. o nome da instituição, em `"Source Serif 4 Variable"` de 28 px;
3. "Atendimento ao estudante" e a frase de base;
4. o título da tela: "Primeiro acesso" ou "Criar senha";
5. o primeiro campo ("CPF" ou "Nova senha") e o botão ("Enviar link" ou "Salvar senha");
6. os 3 itens de base.

"Entre com seu CPF e sua senha." tem 0 ocorrências nas duas telas (P1, P2) (AC 5; Screens: Primeiro acesso e Criar
senha)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "Primeiro acesso e Criar senha na mesma coluna"`

**C13** - [x] Com `comAparencia` (`imagens.login` 1, `logo` 3), nas 3 telas de acesso, a 1024 e a 1440 px de largura e
900 de altura:
- a `img[src*="/imagens/login"]` visível é 1 só, com `x` = largura/2, `y` = 0, largura = largura/2 (1 px) e
  `bottom` ≥ 899 e igual ao `bottom` da coluna da esquerda ou da janela, o que for maior (1 px);
- ela tem `object-fit` `cover` e `alt=""`;
- nenhum elemento visível com texto próprio tem caixa que cruze a caixa da foto;
- nenhum elemento tem `background-image` com `gradient`;
- a coluna do formulário tem centro horizontal a no máximo 1 px de largura/4 e largura ≤ 401 px (AC 6;
  Screens: Login com foto)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "login com foto: a foto na coluna direita inteira, sem texto nem gradiente"`

**C14** - [x] Com `comAparencia`, nas 3 telas de acesso, a 390 e a 1023 px:
- a `img[src*="/imagens/login"]` visível é 1 só, com `x` 0, `y` 0, largura igual a `clientWidth` e altura 160 px
  (1 px);
- o `bottom` dela é ≤ o `top` do logo + 1 px, e o logo fica acima de "CPF" (ou do primeiro campo da tela);
- nenhum elemento visível com texto próprio cruza a caixa da foto, e nenhum elemento tem `background-image` com
  `gradient` (AC 6; Screens: Login com foto, abaixo de 1024 px)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "login com foto abaixo de 1024: faixa de 160 px acima do formulário"`

**C15** - [x] No Login, 4 casos (com e sem `imagens.login` × com e sem aparência):
- com `comAparencia`, com ou sem foto: "Fale com a Univag", "Aqui você resolve tudo sobre a sua vida acadêmica.",
  "Boletos", "Matrícula" e "Documentos" aparecem, e há uma `img` com `src`
  `/api/instituicoes/univag/imagens/logo?v=3` e `alt` igual ao nome;
- com `semAparencia`, com ou sem foto: o título, a frase e os 3 itens de base, comparados com `test/textos.ts`, e as
  iniciais "CG", sem "One".

Nos 4 casos, "Entre com seu CPF e sua senha." tem 1 ocorrência (P1) (AC 5, AC 7)

Proof: `cd web && npx vitest run src/acesso/identidade.test.tsx -t "textos e logo do login com e sem foto"`

**C16** - [x] A raiz `/` mostra o `heading` "One", "Dúvidas, solicitações e respostas da sua instituição em um só lugar."
e "Abra o endereço da sua instituição, por exemplo /univag.", e nenhum `svg`. No Chromium, a 360 e a 1280 px, "One"
tem `fontFamily` começando por `"Source Serif 4 Variable"`, e o centro horizontal do texto de cada uma das 3 linhas
fica a no máximo 1 px do centro da janela (AC 20; Screens: Raiz)
Proof: `cd web && npx vitest run src/acesso/identidade.test.tsx -t "raiz sem ilustração"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "raiz com One em serifa"`

### S3 - Assistente que não parece chatbot de prateleira (P1) · ~7 files · ~64 KB · ~16k

**C17** - Sem conversa, o Assistente mostra um `h2` e a frase de boas-vindas em 4 casos:
- `nomeCurto` "Univag" e `boasVindas` "Oi! Posso ajudar com boletos e matrícula." → "Atendimento ao estudante ·
  Univag" e essa frase;
- `nomeCurto` "Univag" sem `boasVindas` → "Atendimento ao estudante · Univag" e "Respostas com base nas normas da
  instituição.";
- sem `nomeCurto`, com `boasVindas` → "Atendimento ao estudante · Centro Universitário de Várzea Grande" (P10) e a
  frase;
- sem `nomeCurto` e sem `boasVindas` → o mesmo título e "Respostas com base nas normas da instituição.".

Nos 4 casos, "Olá! Eu sou" e "Pergunte, por exemplo" têm 0 ocorrências, e não há `svg[data-ilustracao]` (AC 8)

Proof: `cd web && npx vitest run src/assistente/identidade.test.tsx -t "boas-vindas institucional sem Olá Eu sou"`

**C18** - Sem conversa, a 390 e a 1440 px, com `comAparencia`:
- o título "Atendimento ao estudante · Univag" é o primeiro cabeçalho do `main`, com `fontFamily` começando por
  `"Source Serif 4 Variable"`, `font-size` 24 px e `text-align` `start`;
- o `left` do título fica a no máximo 1 px do `left` do `form` do compositor;
- a frase tem `top` ≥ o `bottom` do título − 1 px e `left` a no máximo 1 px do `left` do título (Screens: Assistente
  sem conversa, itens 1 e 2)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "título das boas-vindas em serifa de 24 px à esquerda"`

**C19** - Sem conversa, 3 casos:
- com foto (`imagens.assistente` 4) e `nome` "Vagner": uma `img` com `src`
  `/api/instituicoes/univag/imagens/assistente?v=4` e o texto "Vagner, assistente virtual";
- sem foto, com `nome` "Vagner": o texto, e nenhuma `img` nas boas-vindas;
- sem foto e sem `nome`: "Assistente virtual" (P9).

No Chromium, a 390 e a 1440 px, com foto, a `img` mede 32×32 px (1 px) com `border-radius` ≥ 16 px, o `right` dela
é ≤ o `left` do texto, os centros verticais ficam a no máximo 2 px, e o texto mede `font-size` ≤ 14 px (AC 9;
Screens: Assistente sem conversa, item 3)

Proof: `cd web && npx vitest run src/assistente/identidade.test.tsx -t "assistente virtual com e sem foto"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "foto de 32 px ao lado do nome do assistente"`

**C20** - Sem conversa, com `GET /api/chamados?escopo=meus` simulado, table-driven sobre 8 casos:

| Lista devolvida | A tela mostra |
| --- | --- |
| `ONE-5` `ABERTO` | um link com `href` `/univag/chamados/ONE-5`, com "Sua solicitação ONE-5 · Aberto" e "A equipe vai responder" |
| `ONE-5` `EM_ATENDIMENTO` | o link com "Sua solicitação ONE-5 · Em atendimento" e "A equipe vai responder" |
| `ONE-5` `AGUARDANDO_ALUNO` | o link com "Sua solicitação ONE-5 · Aguardando aluno" e "Responda para continuar" |
| `ONE-5` `RESOLVIDO` | 0 ocorrências de "Sua solicitação" |
| `ONE-5` `FECHADO` | 0 ocorrências de "Sua solicitação" |
| `[]` | 0 ocorrências de "Sua solicitação" |
| `ONE-5` `ABERTO` de 2026-11-03, `ONE-9` `RESOLVIDO` de 2026-11-05 e `ONE-7` `AGUARDANDO_ALUNO` de 2026-11-04, nesta ordem | 1 link só, o de `ONE-7` |
| `500` | 0 ocorrências de "Sua solicitação", nenhum `role="alert"`, e o título e as perguntas aparecem (P14) |

Quando há link, ele vem antes da primeira pergunta no DOM (AC 10)

Proof: `cd web && npx vitest run src/assistente/identidade.test.tsx -t "solicitação em aberto antes das perguntas"`

**C21** - Sem conversa, com a simulada (`ONE-123` `EM_ATENDIMENTO` em Minhas solicitações) e `#8a1538`, a 390 e a
1440 px, o link "Sua solicitação ONE-123 · Em atendimento" tem `border-left-width` ≥ 1 px com `border-left-color`
pintada igual à de `var(--primary)`, as outras 3 bordas com largura 0, e `bottom` ≤ o `top` da primeira linha de
pergunta + 1 px (Screens: Assistente sem conversa, item 4)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "solicitação em aberto com borda na cor de ação antes das perguntas"`

**C22** - Sem conversa, a 390 e a 1440 px, em 2 casos (`comAparencia`, 4 perguntas; `semAparencia`, as 2 perguntas
padrão), as perguntas são `button`s em linhas:
- cada linha mede altura ≥ 48 px, e todas têm o mesmo `left` e a mesma largura (1 px), com `top` crescente;
- entre 2 linhas seguidas há uma divisória de 1 px: o `border-bottom-width` da de cima ou o `border-top-width` da de
  baixo, com distância ≤ 1 px entre elas;
- em cada linha, o primeiro `svg` tem a classe `lucide-message-circle-question-mark` (o `MessageCircleQuestion` do
  lucide 1.66) e `right` ≤ o `left` do texto, e o último tem `lucide-chevron-right` e `left` ≥ o `right` do texto;
- cada linha tem `border-radius` 4 px (P3), menor que metade da altura.

Tocar numa linha envia a pergunta como hoje (`aparencia-instituicao` C43) (AC 11; Screens: Assistente sem conversa,
item 5)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "perguntas em linhas de 48 px com ícone e seta"`
Proof: `cd web && npx vitest run src/assistente/identidade.test.tsx -t "perguntas com MessageCircleQuestion e ChevronRight"`
Proof: `cd web && npx vitest run src/assistente/boasvindas.test.tsx -t "tocar na sugestão envia a pergunta"`

### S4 - Indicadores com hierarquia (P1) · ~8 files · ~46 KB · ~12k

**C23** - Cada consulta faz exatamente 2 `GET /api/indicadores`: a do período e a do período anterior de mesmo
número de dias, terminando na véspera de `de`. Com o relógio em 5/11/2026, 3 casos:
- ao abrir: `de=2026-11-01&ate=2026-11-05` e `de=2026-10-27&ate=2026-10-31`;
- "Consultar" com 2026-03-01 a 2026-03-31: `de=2026-03-01&ate=2026-03-31` e `de=2026-01-29&ate=2026-02-28`;
- "Consultar" com 2026-11-05 a 2026-11-05: `de=2026-11-05&ate=2026-11-05` e `de=2026-11-04&ate=2026-11-04` (AC 12)

Proof: `cd web && npx vitest run src/indicadores/identidade.test.tsx -t "período anterior de mesmo tamanho"`

**C24** - Com o período atual em `indicadorPrincipal` 0,712, o Indicador principal mostra "71,2%" e, ao lado,
"vs. período anterior" com a variação, em 3 casos:
- anterior 0,670 → "▲ 4,2 pts";
- anterior 0,722 → "▼ 1,0 pt";
- anterior 0,712 → "= sem variação" (AC 12)

Proof: `cd web && npx vitest run src/indicadores/identidade.test.tsx -t "variação contra o período anterior"`

**C25** - Com o atual em 0,712, a tela mostra "71,2%", sem "▲", "▼", "= sem variação" nem "vs. período anterior", e
sem `role="alert"`, em 3 casos: o anterior responde `500`; o anterior tem `semDados` `true`; o anterior tem
`indicadorPrincipal` `null`. No mesmo teste, um caso de controle com o anterior em 0,670 mostra "▲ 4,2 pts" (AC 13)
Proof: `cd web && npx vitest run src/indicadores/identidade.test.tsx -t "sem variação quando o anterior falha ou não tem dados"`

**C26** - Arredondamento e plural da variação, com o atual em 0,7123 (P5), 3 casos:
- anterior 0,7121 → "= sem variação";
- anterior 0,6933 → "▲ 1,9 pt";
- anterior 0,6923 → "▲ 2,0 pts" (AC 12)

Proof: `cd web && npx vitest run src/indicadores/identidade.test.tsx -t "arredondamento e plural da variação"`

**C27** - Com o relógio fixo em 5/11/2026 e as 2 consultas simuladas (atual 0,712, anterior 0,670), a 390 e a
1440 px:
- o rótulo "Indicador principal" está visível;
- o número "71,2%" tem `fontFamily` começando por `"Source Serif 4 Variable"`, `font-size` 40 px e
  `font-variant-numeric` contendo `tabular-nums`;
- o elemento da variação ("▲ 4,2 pts" e "vs. período anterior") tem `left` ≥ o `right` do número − 1 px e se
  sobrepõe a ele na vertical;
- o bloco do principal tem `top` ≥ o `bottom` do formulário do período − 1 px e `bottom` ≤ o `top` do primeiro
  destaque da faixa + 1 px (AC 12; Screens: Indicadores, item 1)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "Indicador principal em serifa de 40 px com a variação ao lado"`

**C28** - Os 3 destaques "Chamados abertos agora", "Autoatendimento" e "Tempo até a 1ª resposta" (P13):
- com o contêiner `main` de 768 px (janela de 1072 px com a barra aberta) e de 1136 px (janela de 1440 px): 3 valores
  distintos de `left`, o mesmo `top` (1 px) e larguras iguais (1 px); entre 2 destaques vizinhos há uma divisória
  vertical de 1 px (o `border-right-width` do da esquerda ou o `border-left-width` do da direita);
- com o contêiner `main` de 767 px (janela de 1071 px com a barra aberta) e na janela de 390 px: o mesmo `left`
  (1 px) e `top` crescente;
- o teste confere a largura do contêiner `main` (o elemento com `@container/main`) antes de medir;
- nos 4 casos, nenhum `[data-slot=card]` contém um destaque, e nenhum destaque nem ancestral dele até o `main`
  (exclusive) tem borda nos 4 lados ou `background-color` diferente de transparente (AC 14; Screens: Indicadores,
  item 2)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "3 destaques em faixa de 3 colunas sem caixa"`

**C29** - As outras 9 métricas ("Alunos ativos", "Conversas", "Escalonamento", "Abandono", "Perguntas sem artigo",
"Chamados resolvidos", "Tempo de resolução", "Roteamento correto", "Reabertura", nesta ordem no DOM) são linhas de
rótulo e valor (P13):
- com o contêiner `main` de 768 px (janela de 1072 px) e de 1136 px (janela de 1440 px), 2 valores distintos de
  `left`; com o contêiner de 767 px (janela de 1071 px) e na janela de 390 px, 1; o teste confere a largura do
  contêiner antes de medir;
- em cada linha, o `left` do rótulo fica a no máximo 1 px do `left` da linha, o `right` do valor a no máximo 1 px do
  `right` da linha, os dois se sobrepõem na vertical, e o valor tem `font-variant-numeric` contendo `tabular-nums`;
- entre 2 linhas seguidas da mesma coluna há uma divisória de 1 px, com distância ≤ 1 px;
- nenhuma linha nem ancestral dela até o `main` (exclusive) é `[data-slot=card]`, tem borda nos 4 lados ou
  `background-color` diferente de transparente;
- a lista vem abaixo da faixa: o `top` da primeira linha é ≥ o `bottom` do último destaque − 1 px (AC 15;
  Screens: Indicadores, item 3)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "9 métricas em lista de rótulo e valor sem caixa"`

**C30** - A 390 e a 1440 px, cada um dos 2 gráficos (`.recharts-responsive-container`, depois de pelo menos 1 barra
com altura > 0, L-077) tem acima dele o seu cabeçalho, "Categorias por conversas" ou "Categorias por chamados"
(`bottom` do cabeçalho ≤ `top` do gráfico + 1 px, com sobreposição horizontal). Nenhum ancestral do gráfico até o
`main` (exclusive) é `[data-slot=card]`, tem borda nos 4 lados ou `background-color` diferente de transparente. O
`top` do primeiro gráfico é ≥ o `bottom` da última linha da lista − 1 px (AC 16; Screens: Indicadores, item 4)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "gráficos sem cartão com o título"`

### S5 - Menos caixas e estados vazios com ícone (P1) · ~17 files · ~135 KB · ~34k

**C31** - Em `web/src`, fora dos testes, nenhum arquivo importa de `ilustracoes` outro nome que `Planilha`, e só
`administracao/Matriculas.tsx` o importa. `ilustracoes/index.tsx` exporta exatamente `Planilha`, que desenha um
`svg` com `aria-hidden="true"`, `data-ilustracao="planilha"`, só `currentColor`, `none`, `var(--primary)` e
`var(--primary-subtle)` como cor, e nenhum `<image>` nem `href` externo, como as de `aparencia-instituicao` C47
(AC 19, door 4)
Proof: `cd web && npx vitest run src/identidade.test.tsx -t "ilustrações só com Planilha em Matrículas"`
Proof: `cd web && npx vitest run src/ilustracoes/ilustracoes.test.tsx -t "Planilha só com currentColor e tokens"`

**C32** - Na Aparência a 1440 px, as 4 seções "Marca", "Login", "Assistente" e "Contato" (`section[aria-labelledby]`):
- têm `border-width` 0 nos 4 lados e `background-color` transparente;
- entre 2 seções seguidas, o `top` da de baixo menos o `bottom` da de cima é 32 px (1 px);
- o `h2` de cada seção tem `top` a no máximo 1 px do `top` dela (AC 17; Screens: Detalhe do chamado e Aparência)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "seções da Aparência sem caixa a 32 px"`

**C33** - No detalhe do chamado `ONE-123` visto pela equipe, a 390 e a 1440 px (P7):
- há um `h2` "Dados do aluno" e um `h2` "Histórico"; o `top` de cada um fica a no máximo 1 px do `top` do seu bloco
  (o dos dados do aluno e o da lista de eventos);
- o bloco do Histórico não fica dentro de `[data-slot=card]`, e ele e cada ancestral dele até a coluna (exclusive)
  têm `border-width` 0 e `background-color` transparente;
- o `top` do bloco do Histórico menos o `bottom` do bloco visível anterior na mesma coluna (o cartão "Ações" a 1440
  px; o `form` da resposta a 390 px) é 32 px (1 px).

A Conta fica fora do AC 17 e não muda (P8) (AC 17; Screens: Detalhe do chamado e Aparência)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "Dados do aluno e Histórico sem caixa e com título"`

**C34** - No detalhe do chamado `ONE-123` visto pela equipe, a 390 e a 1440 px (P7):
- o bloco dos dados do aluno ("Ana Beatriz · matrícula 2000567890 · …"), e cada ancestral dele até a coluna
  (exclusive), têm `border-width` 0 e `background-color` transparente;
- o bloco "Resumo gerado por IA" (o menor elemento com o título e o texto do resumo) e o `form` da resposta têm
  `background-color` pintado diferente do fundo da página e não transparente;
- nesta ordem, bloco "Dados do aluno" (com o título), resumo, seção "Conversa com o assistente", seção "Atendimento" e
  `form` da resposta, o `top` de cada um menos o `bottom` do anterior é 32 px (1 px) (AC 17; Screens: Detalhe do
  chamado e Aparência)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "detalhe sem caixa e com fundo tingido só no que pede ação"`

**C35** - Com a lista vazia, o bloco do vazio tem exatamente 1 `svg`, com a classe `lucide`, a frase e, quando a
lista tem, o botão; a página não tem `svg[data-ilustracao]`. Table-driven sobre 8 casos:

| Tela | Frase | Botão |
| --- | --- | --- |
| Fila | "Nenhum chamado na fila dos seus setores." | nenhum |
| Minhas solicitações | "Você ainda não tem solicitações." | "Falar com o assistente", `href` `/univag/assistente` |
| Artigos | "Os artigos são a base das respostas do assistente." | "Novo artigo", que abre o diálogo de artigo novo |
| Documentos | "PDFs como regulamentos e calendários também alimentam o assistente." | "Novo documento", que abre o diálogo de documento novo |
| Usuários | "Cadastre a equipe ou importe as matrículas." | nenhum |
| Usuários, busca "zzz" | "Nenhum usuário combina com a busca." | nenhum |
| Cadastros | "Nenhum item cadastrado." | nenhum |
| Indicadores com `semDados` | "Sem atendimentos neste período." | nenhum |

O título de hoje de cada lista fica (P6) (AC 18)

Proof: `cd web && npx vitest run src/tabela.test.tsx -t "vazio com ícone nas 6 listas"`
Proof: `cd web && npx vitest run src/indicadores/identidade.test.tsx -t "Indicadores sem dados com ícone"`

**C36** - Nos 8 casos de C35, a 390 e a 1440 px (16 medidas, table-driven):
- o ícone mede 28×28 px (1 px), com `color` pintada igual à de `var(--muted-foreground)`;
- o centro horizontal do ícone, o do texto da frase e o do botão (quando há) ficam a no máximo 1 px do centro do
  bloco do vazio (a célula da lista, ou o bloco abaixo do formulário em Indicadores);
- o `bottom` do ícone é ≤ o `top` da frase + 1 px, e o `bottom` da frase ≤ o `top` do botão + 1 px (AC 18;
  Screens: Estados vazios)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "vazio com ícone de 28 px centrado"`

**C37** - Em Matrículas, o 2º item da `ol` ("Preencha uma linha por aluno") contém o `svg[data-ilustracao="planilha"]`,
o único `svg[data-ilustracao]` da página. Os elementos `text` dele, em ordem, são exatamente `cpf`, `nome`,
`email`, `matricula`, `curso`, `semestre` e `situacao`, iguais ao cabeçalho do CSV de "Baixar modelo (CSV)" separado
por `;` (AC 19)
Proof: `cd web && npx vitest run src/administracao/identidade.test.tsx -t "Planilha no passo 2 com as 7 colunas"`

**C38** - A 390 e a 1440 px, em Matrículas, a Planilha tem altura > 0 e fica dentro da caixa do 2º passo. Os 7 nomes
de coluna estão visíveis, cada um dentro da caixa do `svg`, com o mesmo `top` (1 px) e `left` crescente na ordem de
C37 (Screens: Matrículas)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "Planilha mostra as 7 colunas numa linha"`

**C39** - A prévia da Aparência, com os dados de `comAparencia`, mostra:
- no login: o logo, o nome da instituição, "Fale com a Univag", a frase, os 3 itens e "Entrar"; sem foto de login,
  nenhuma `img` de login; com a foto de login escolhida no formulário, a `img` dela;
- nas boas-vindas: "Atendimento ao estudante · Univag", "Oi! Posso ajudar com boletos e matrícula.", "Vagner, assistente
  virtual" e as 4 perguntas, cada uma numa linha com `svg.lucide-chevron-right`;
- 0 ocorrências de "Olá! Eu sou" e nenhum `svg[data-ilustracao]`.

No Chromium, a 1440 px, o nome e o título das boas-vindas da prévia têm `fontFamily` começando por
`"Source Serif 4 Variable"`, nenhuma linha de pergunta é pílula (`border-radius` < metade da altura), e nenhum
elemento da prévia tem `background-image` com `gradient` (AC 21)

Proof: `cd web && npx vitest run src/administracao/identidade.test.tsx -t "prévia com o login e as boas-vindas novos"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/identidade.spec.ts -g "prévia com serifa e perguntas em linhas"`

### S0 - Invariantes e barreiras (P1)

**C40** - A suíte Vitest inteira e `npm --prefix web run build` passam. As edições em asserções existentes são só
as da lista fechada, cada uma listada no `## Handoff` com o seu AC (AC 1 a AC 22)
Proof: `npm --prefix web test`
Proof: `npm --prefix web run build`

**C41** - O `crapper` sobre `web/src` sai 0 no limite 9.99, e o `dryer` não acha candidato com nota 0.8 ou mais, com
a lista do `revisao-ux` C60 mais `src/LinksDaResposta.tsx` e `src/Balao.tsx` (`push-com-marca`). `src/ilustracoes`
continua na lista, com a `Planilha`. Um arquivo novo na raiz de `web/src` entra na lista no mesmo commit que o cria
(L-031) (AD-018)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao -s src/ilustracoes --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx src/sw.ts src/push.ts src/AvisosPush.tsx src/aparencia.tsx src/LinksDaResposta.tsx src/Balao.tsx | grep -q "No duplicate candidates found"`

**C42** - A suíte de arranjo passa inteira com a API simulada: `arranjo.spec.ts`, `celular.spec.ts`,
`aparencia.spec.ts`, `instituicoes.spec.ts`, `push.spec.ts`, `ux.spec.ts`, `plataforma.spec.ts` e
`identidade.spec.ts` (Screens)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/aparencia.spec.ts e2e/instituicoes.spec.ts e2e/push.spec.ts e2e/ux.spec.ts e2e/plataforma.spec.ts e2e/identidade.spec.ts`

**C43** - Nenhum arquivo de `api/` nem de `api.Tests/` muda entre `<base>` e `HEAD` (Flow: sem mudança de API;
Surface: None)
Proof: `git diff --quiet <base> HEAD -- api api.Tests`

**C44** - De ponta a ponta, na imagem própria (porta 8089), instituição `e2e`:
1. o Login sem cookie pede `/assets/public-sans-latin-wght-normal-*.woff2`, que responde `200` com `Content-Type`
   contendo `woff2` (o `UseStaticFiles` da API serve o `wwwroot`), e nenhum URL pedido contém `inter-`;
2. um aluno só `ALUNO` abre uma solicitação por `POST /api/atendimento-direto`, abre o Assistente sem conversa e vê
   o link "Sua solicitação {número} · Aberto", com "A equipe vai responder" e `href` `/e2e/chamados/{número}`;
3. um `ADMINISTRADOR` abre Indicadores, e o registro de rede tem exatamente 2 `GET /api/indicadores`, ambos `200`,
   com o período padrão e o período anterior de mesmo número de dias (as datas tiradas do relógio do navegador); o
   "Indicador principal" aparece sem `role="alert"`.

O spec loga 2 vezes, uma por pessoa (AC 1, AC 10, AC 12)

Proof: `cd web && E2E_URL=http://localhost:8089 npx playwright test e2e/identidade-real.spec.ts -g "aluno vê a solicitação em aberto e as fontes do app"`
Proof: `cd web && E2E_URL=http://localhost:8089 npx playwright test e2e/identidade-real.spec.ts -g "Indicadores consulta o período anterior na API real"`

**C45** - A suíte e2e inteira passa contra a imagem própria do `HEAD` na porta 8089. Nenhum spec real fora de
`identidade-real.spec.ts` é editado (AC 22)
Proof: `cd web && E2E_URL=http://localhost:8089 npx playwright test`

**C46** - Os testes que provam os 6 invariantes nomeados no AC 22 passam sem edição, porque nenhum está na lista
fechada (AC 22):
- alvos de 44 px (`revisao-ux` C1 e C2);
- campos de 16 px (C3);
- contrastes (C5, C7 e C53);
- barra de abas (C13 e C14);
- cor de ação (C57);
- tokens tingidos (C52).

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "alvos de 44 px abaixo de 768 em todas as telas"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "alvos de 44 px com ponteiro grosso a 1024"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "campos de 16 px abaixo de 768 e com ponteiro grosso"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "borda dos campos com contraste de 3:1 nos três temas"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "selos com contraste de 4,5:1 nos três temas"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "texto com 4,5:1 sobre os neutros tingidos"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "barra de abas: 3 colunas iguais e ícone sobre rótulo de 12 px"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "aba ativa na cor de ação e peso 600"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "cor de ação só em botão principal, item ativo, link e foco"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "neutros mudam com a cor da instituição"`
Proof: `cd web && npx vitest run src/ux.test.tsx -t "neutros tingidos pela marca nos três temas"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| papéis em sans (7) | `body` C2, C3 · botão C3 · campo C3 · célula de tabela C3 · etiqueta C3 · item de menu C3 · barra do topo C3 | - |
| papéis em serifa (5) | `h1`/`h2` de conteúdo com 20 px ou mais C4 · número principal de Indicadores C4, C27 · nome da instituição no login C4, C11, C12 · título das boas-vindas C4, C18, C39 · "One" na raiz C4, C16 | - |
| arquivos de fonte (3) | Public Sans latin C1, C2, C8, C44 · Source Serif 4 latin C1, C2, C8 · Inter ausente C1, C2, C8, C44 | - |
| papéis de raio (9) | campo 4 px C5 · linha de lista 4 px C5, C22 · linha de Fila e Minhas solicitações 0 C5 · botão 6 px C5, C6 · painel 12 px C5 · `Dialog` 16 px C5 · `Sheet` 16 px C5 · menu 16 px C5 · `rounded-full` C5, C6 | - |
| `rounded-full` permitido (4) | avatar e foto C6 · botão só de ícone circular ("Enviar", avisos, "Tema") C5, C6 · selo de estado C5, C6 · número de passo de Matrículas C5, C6 | - |
| degraus da escala em `index.css` (4) | `--radius-xs` C7 · `--radius-sm` C7 · `--radius-md` C7 · `--radius-lg` C7 | - |
| telas de acesso (3) | Login C9, C10, C11, C13, C14, C15 · Primeiro acesso C9, C12, C13, C14 · Criar senha C9, C12, C13, C14 | - |
| texto de apoio do Login (2) | presente no Login, logo abaixo do nome C10, C15 · ausente em Primeiro acesso e Criar senha C12 | - |
| variantes do login (8) | sem foto a partir de 1024 C9, C10, C11 · sem foto abaixo de 1024 C9, C10, C11 · com foto a partir de 1024 C13, C15 · com foto abaixo de 1024 C14, C15 · com logo C10, C15 · sem logo, com as iniciais C10, C12, C15 · textos da Aparência C10, C15 · textos de base C10, C12, C15 | - |
| larguras dos dois lados de 1024 (4) | 390 C9, C14 · 1023 C9, C14 · 1024 C9, C13 · 1440 C9, C13 | - |
| estados do Assistente sem conversa (15) | com `nomeCurto` C17 · sem `nomeCurto` C17 · com `boasVindas` C17 · sem `boasVindas` C17 · com foto C19 · sem foto C19 · sem nome do assistente C19 · `ABERTO` C20 · `EM_ATENDIMENTO` C20, C21 · `AGUARDANDO_ALUNO` C20 · só `RESOLVIDO` C20 · só `FECHADO` C20 · sem solicitação C20 · várias, a mais recente C20 · leitura com `500` C20 | - |
| perguntas sugeridas (2) | as 4 da Aparência C22, C39 · as 2 padrão C22 | - |
| comparação de Indicadores (6) | ▲ C24, C27, C44 · ▼ C24 · "=" C24, C26 · falha do anterior C25 · anterior com `semDados` C25 · anterior com `indicadorPrincipal` `null` C25 | - |
| período anterior (3) | mês corrente até hoje C23, C44 · mês de 31 dias com virada de mês C23 · um dia C23 | - |
| larguras de Indicadores (4) | janela de 390 C27, C28, C29, C30 · `main` de 767 C28, C29 · `main` de 768 C28, C29 · janela de 1440 C27, C28, C29, C30 | - |
| estados vazios (8) | Fila C35, C36 · Minhas solicitações C35, C36 · Artigos C35, C36 · Documentos C35, C36 · Usuários C35, C36 · Usuários com busca sem resultado C35, C36 · Cadastros C35, C36 · Indicadores sem dados C35, C36 | - |
| ilustrações removidas (6) | `BoasVindas` C31, C9, C16, C39 · `Conversa` C31, C17, C39 · `CaixaVazia` C31, C35 · `Documento` C31, C35 · `Pessoas` C31, C35 · `Grafico` C31, C35 | - |
| colunas da `Planilha` (7) | C37, table-driven sobre as 7 (`cpf`, `nome`, `email`, `matricula`, `curso`, `semestre`, `situacao`) · C38 | - |
| blocos estáticos sem caixa (3) | dados do aluno C34 · Histórico C33 · seções da Aparência C32 | - |
| títulos de seção (3) | "Dados do aluno" C33 · "Histórico" C33 · `h2` das seções da Aparência C32 | - |
| blocos que pedem ação com fundo tingido (2) | resumo gerado por IA C34 · formulário de resposta C34 | - |
| one-way doors do `Landing` (4) | 1 C1, C2, C3, C4, C8 · 2 C5, C6, C7 · 3 C9, C10, C11, C12, C13, C14 · 4 C31, C35, C36, C37 | - |
| invariantes do AC 22 (6) | alvos de 44 px C46 · campos de 16 px C46 · contrastes C46 · barra de abas C46 · cor de ação C46 · tokens tingidos C46 | - |
| suítes do S0 (5) | Vitest e build C40 · `crapper` e `dryer` C41 · arranjo C42 · `api/` igual C43 · e2e real C44, C45 | - |
| frases e itens de arranjo de `## Screens` (41) | coluna centrada de até 400 px C9 · logo até 48 px ou iniciais C10 · nome em serifa de 28 px C11 · texto de apoio logo abaixo do nome C10 · Primeiro acesso e Criar senha com o título da tela antes do primeiro campo C12 · título e frase em texto secundário C10, C11 · formulário C10 · itens em lista com marcador abaixo do formulário C10, C11 · sem painel nem ilustração C9 · fundo `--background` tingido C11 · com foto, formulário na coluna da esquerda C13 · foto na coluna direita inteira C13 · sem gradiente e sem texto sobre a foto C13, C14 · faixa de 160 px abaixo de 1024 C14 · título em serifa de 24 px à esquerda C18 · "Atendimento ao estudante · …" C17 · frase abaixo do título C17, C18 · foto de 32 px ao lado do nome C19 · sem "Olá! Eu sou" C17 · linha da solicitação com borda na cor de ação C21 · solicitação com estado, próximo passo e link C20 · solicitação antes das perguntas C20, C21 · perguntas em linhas de 48 px com divisória C22 · `MessageCircleQuestion` à esquerda e `ChevronRight` à direita C22 · perguntas sem pílula C22 · principal com rótulo e número de 40 px `tabular-nums` C27 · variação ao lado com "vs. período anterior" C24, C27 · 3 destaques em 3 colunas, 1 no celular C28 · divisória vertical e sem caixa C28 · 9 métricas em 2 colunas, 1 no celular C29 · rótulo à esquerda e valor tabular à direita C29 · divisória entre linhas e sem caixa C29 · gráficos sem cartão, com título C30 · blocos estáticos sem borda nem fundo C32, C33, C34 · separados por 32 px C32, C33, C34 · título de seção C32, C33 · só o que pede ação com fundo tingido C34 · vazio com ícone de 28 px, título, frase e botão C35, C36 · vazio centrado na largura da lista C36 · Planilha no passo 2 numa linha C37, C38 · raiz com "One" em serifa, frase e texto, sem ilustração C16 | - |

- `## Screens` foi lido frase a frase e item a item: 41 afirmações de arranjo, cada uma com o seu token (L-049,
  L-070), depois das decisões de 05/11
- Os claims de fonte, cor, raio e posição (C2 a C6, C8 a C14, C16, C18, C19, C21, C22, C27 a C30, C32 a C34, C36,
  C38, C39) são provados no Chromium; o jsdom não mede layout nem pinta (L-079)
- Os claims de decisão (C1, C7, C15, C17, C19, C20, C23 a C26, C31, C35, C37, C39) têm prova no Vitest, um caso por
  linha da tabela; C20 e C23 a C25 cruzam a fronteira da API simulada, e C44 cruza a da API real
- Nenhum check afirma uma rota de API nova: `## Surface` é "None", e C43 prova que `api/` não muda. As duas rotas
  lidas, `GET /api/indicadores` e `GET /api/chamados`, já existem
- Fora dos papéis da door 2 e sem mudança: o balão da conversa (`rounded-2xl`, `assistente/conversa.test.tsx`
  `cantos do balão`)

## Swept

- validation: C23 (o período anterior derivado de `de` e `até`: um dia, mês de 31 dias e virada de mês)
- failure modes: C25 (a consulta do período anterior falha: o número aparece sem variação e sem alerta), C20 (a leitura das solicitações falha: sem a linha e sem alerta, P14)
- idempotency: n/a - nada grava; as duas consultas de Indicadores são leituras, e C23 afirma exatamente 2 por consulta
- authorization: existing - a guarda de papel do web (`revisao-ux` C10) e o `403` da API fora do papel; `GET /api/chamados?escopo=meus` devolve só as do aluno da sessão; C43 prova que a API não muda
- concurrency: n/a - nada grava; as duas leituras de Indicadores são independentes, e a variação só aparece com as duas respostas (C25 cobre a falta de uma)
- data lifecycle: n/a - nada gravado muda (`## Relations`: None); os textos e as imagens da Aparência só mudam de lugar na tela (C15, C39)
- dependency failure: C25 (API fora no período anterior), C20 (API fora nas solicitações), C2 (as fontes vêm da origem do app, sem CDN)
- state transitions: C20 (a linha aparece em `ABERTO`, `EM_ATENDIMENTO` e `AGUARDANDO_ALUNO` e some em `RESOLVIDO` e `FECHADO`)
- observability: n/a - só o `web/` muda, e nenhuma decisão nova precisa de log

## Handoff

Tamanho: bytes dos arquivos que cada slice lê e edita (`wc -c` em `HEAD` em 05/11/2026, união sem repetir arquivo),
divididos por 4. Somam-se por lote:
- os trechos de `e2e/arranjo.spec.ts` (92 965 B inteiro, ~23k) e de `e2e/ux.spec.ts` (87 752 B, ~22k) que o lote
  edita, ~8k cada por lote;
- `plan.md` (16 354 B) mais este `checks.md` (62 627 B), (16 354 + 62 627) ÷ 4 ≈ 20k por lote;
- `e2e/simulada.ts` (11 991 B, ~3k) e `test/estrutura.test.ts` (3 749 B, ~1k);
- o código e os testes novos, estimados.

`package-lock.json` muda pela troca de pacote, mas o construtor não o lê inteiro e fica fora da conta.

| Slice | Arquivos (união) | Bytes | ÷ 4 |
| --- | --- | --- | --- |
| S1 | `package.json`, `main.tsx`, `index.css`, `ui/` (`button`, `input`, `textarea`, `native-select`, `badge`, `card`, `dialog`, `sheet`, `dropdown-menu`, `sidebar`, `table`, `tabs`), `assistente/Anexos.tsx`, `LinksDaResposta.tsx`, `AvisosPush.tsx`, `test/interface.test.ts`, `ux.test.tsx` | 105 037 | ~26k |
| S2 | `acesso/Acesso.tsx`, `aparencia.tsx`, `acesso/acesso.test.tsx`, `acesso/textos.test.tsx`, `test/textos.ts`, `aparencia.test.tsx`, `e2e/aparencia.spec.ts` | 86 596 | ~22k |
| S3 | `assistente/Assistente.tsx`, `assistente/boasvindas.test.tsx`, `assistente/textos.test.tsx`, `assistente/revisao.test.tsx`, `chamados/Chamados.tsx`, `chamado.ts`, `test/util.tsx` | 64 477 | ~16k |
| S4 | `indicadores/` (6 arquivos), `ErroDe.tsx`, `Periodo.tsx`, `e2e/celular.spec.ts` | 46 374 | ~12k |
| S5 | `Tabela.tsx`, `chamados/Chamados.tsx`, `conhecimento/Artigos.tsx`, `conhecimento/Documentos.tsx`, `administracao/Usuarios.tsx`, `ilustracoes/` (2), `chamados/ChamadoDetalhe.tsx`, `chamados/Conversa.tsx`, `acesso/Conta.tsx`, `administracao/Aparencia.tsx`, `administracao/PreviaAparencia.tsx`, `administracao/Matriculas.tsx`, `tabela.test.tsx`, `administracao/aparencia.test.tsx`, `administracao/revisao.test.tsx`, `chamados/textos.test.tsx` | 135 469 | ~34k |

| Lote | Slices e checks | Conta |
| --- | --- | --- |
| 1. Fontes, raios e login | S1 e S2: C1 a C16 | (105 037 + 86 596) ÷ 4 = 47,9k + 8k + 8k + 20k + 3k + 1k + ~15k novos (`identidade.spec.ts` de S1 e S2, `identidade.test.tsx`, `acesso/identidade.test.tsx`) ≈ **103k** |
| 2. Telas autenticadas e barreiras | S3, S4, S5 e S0: C17 a C46 | (64 477 + 46 374 + 135 469 − 7 829 de `Chamados.tsx` repetido) ÷ 4 = 59,6k + 8k + 8k + 20k + 3k + 1k + ~15k novos ≈ **115k** |

Estimativa:
- Um construtor só: 103k + 115k − 24k de contexto repetido (plano e checks 20k, `simulada.ts` 3k,
  `estrutura.test.ts` 1k) ≈ 194k, acima do orçamento de 150k.
- Corte proposto depois de S2, onde a superfície muda: o lote 1 fica nos tokens de `index.css`, nos componentes de
  `ui/` que todas as telas herdam e nas telas de acesso, que abrem sem sessão; o lote 2 entra nas telas
  autenticadas (`assistente/`, `indicadores/`, `chamados/`, `conhecimento/`, `administracao/`) e fecha o S0.
- As varreduras C3, C4 e C6 nascem no lote 1, mas só ficam verdes no lote 2, depois que o Assistente, Indicadores e o
  detalhe mudam; no lote 1 o construtor roda as partes delas de Login, raiz e `ui/`, e elas fecham no lote 2, como as
  varreduras do `revisao-ux`.
- Cada lote roda C40 a C42 antes de passar adiante. C43 a C46 fecham no lote 2.
- Mecanismo: handoff em 2 lotes sequenciais, com o corte depois de S2 - escolha do usuário em 05/11

- **Boundary:** lote 1 (S1 e S2) em `HEAD`, a partir de `<base>` = `6d83112`. Fechados: C1, C2, C5, C7, C8 e C9 a C16. **Abertos até o lote 2:** C3, C4 e C6 (as varreduras). Os testes existem com o nome do check e passam, mas cobrem só o que o lote 1 mudou: C3 varre as 15 telas de `Telas` (mais Conta e Instituições, o menu "Ações de …" de Artigos e o menu do usuário) e já passa inteira; C4 varre Login, Primeiro acesso, Criar senha e a raiz, e o lote 2 acrescenta o Assistente sem conversa, Indicadores e o detalhe do chamado (o `h2` de 24 px do detalhe ainda não é serifa); C6 varre as telas inteiras e passa, e o lote 2 a reroda depois de Assistente, Indicadores e detalhe mudarem. Gates no `HEAD`: Vitest 506 verdes (51 arquivos), build ok, `crapper` sai 0 no limite 9.99 (maior: `Sidebar` 9,8; `Entrada` caiu de 16 para menos de 9 ao ser dividida em `Nome`, `Textos`, `ListaDeItens` e `Foto`), `dryer` sem candidato, layout (`arranjo`, `celular`, `aparencia`, `instituicoes`, `push`, `ux`, `plataforma`, `identidade`) 172 verdes e 2 vermelhos contra `vite preview` na 5199. Os 2 vermelhos já falham em `<base>` (conferido num worktree de `6d83112`, removido): `plataforma.spec.ts` `manifesto e service worker` pede `GET /api/auth/me` pelo `vite preview` e recebe 502 porque o proxy aponta para a porta 5226, onde não há API (o C8 não usa essa chamada e passa); `ux.spec.ts` `detalhe da Fila em texto corrido no celular` espera "aberto há 2 dias" e hoje (05/11) são 3 dias (o chamado simulado é de 02/11 e o teste não fixa o relógio). C43 vale (nenhum arquivo de `api/` muda). C40 a C42 ficam para o lote 2, que os fecha de ponta a ponta; o e2e real (C44, C45) também. Capturas antes e depois em `.playwright-mcp/identidade/lote1/`.
- **Settled mid-build:** (1) `Entrada` do login sempre mostra o título, a frase e os 3 itens de base quando a instituição ainda não carregou (como o painel antigo fazia), e o `h1` com o nome só aparece com a instituição carregada; por isso `acesso/textos.test.tsx` não precisou de edição (os literais já cobriam as 3 telas). (2) "Entre com seu CPF e sua senha." ficou em 14 px (`text-sm`), cor secundária e 4 px abaixo do nome, os valores que `frase do Login à esquerda` e `cabeçalho do Login` já afirmavam. (3) O título da tela de Primeiro acesso e Criar senha é um `h2` de 16 px em sans (abaixo de 20 px, C4); o `h1` das 3 telas é o nome da instituição em serifa de 28 px. (4) A raiz `/` reusa o mesmo `h1` de 28 px; por isso a exceção de `no máximo 4 tamanhos de texto por tela` aceita 28 px no `h1` das 3 telas de acesso e da raiz, e não só no Login (o plano não dá tamanho ao "One"). (5) Os botões "Tema" e de avisos têm `data-slot` `popover-trigger` e não `button` (o `PopoverTrigger asChild` troca o atributo): o C6 mede a pílula deles pelo `aria-label`, e a contagem de `[data-slot=button]` por tela do C6 não vale para Minhas solicitações (nenhum botão desse tipo a 390 nem a 1440), então o teste afirma pelo menos 1 botão no total da varredura; o lote 2 ou o Verifier decide se isso basta. (6) A `section` "Prévia" da Aparência não tem raio: o C5 mede o primeiro filho dela, o painel de 12 px. (7) Efeitos de fonte em testes fora da lista fechada, corrigidos no código e não na asserção: `ux.spec.ts` `balão com até 68 caracteres de largura` mede a largura de 68 zeros com kerning e o `ch` da Public Sans dá 0,1 px a mais por caractere, então `Balao.tsx` passou de `max-w-[68ch]` a `max-w-[67ch]`; `instituicoes.spec.ts` `cartão com nome e selo na 1ª linha` mede o `y` do `Range` do nome (a Public Sans muda a altura do conteúdo em 1 px), então o selo da linha em cartão ganhou `margin-top: 1px` em `index.css`. Nas duas, a asserção ficou como estava. (8) Raios: o cartão de linha em `[data-cartoes]` passou de `var(--radius-lg)` a `var(--radius-md)` (12 px); `Tabela`, `Conta`, `Matriculas` e os painéis passam de `rounded-lg` a `rounded-md`, os botões de `rounded-md` a `rounded-sm`, campos a `rounded-xs`, itens de menu e da barra lateral a `rounded-xs`, menu e popover a `rounded-lg`; o `Sheet` ganhou o raio de 16 px nos cantos do lado de abertura. Tirei `rounded-full` de "Falar com atendente", dos botões de link da resposta, de "Anexar arquivo" e de "Remover" do anexo (P4); `rounded-full` ficou em "Enviar", "Tema" e avisos, e as iniciais do usuário passaram a `rounded-full` (avatar). As perguntas da prévia da Aparência saíram de pílula para `rounded-xs` (o lote 2 as troca por linhas, AC 21). (9) `e2e/simulada.ts` ganhou `instalar`, `referencia`, `abrirTela` e `varrer`, movidos de `ux.spec.ts` (que agora os importa) para o `identidade.spec.ts` poder usá-los. (10) O C9 varre `#root` e ignora elementos sem altura (a região vazia de avisos do Sonner).
- **Abandoned:** nada. O lote 1 não toca o C46 nem os checks de S3, S4, S5 e S0, que são do lote 2.
- **Edições na lista fechada (lote 1), com o AC que as força:** item 1: `estrutura.test.ts` (`identidade.test.tsx` em `Raiz`). Item 2, `interface.test.ts`: a linha de `--font-sans` passa a `'Public Sans Variable', …` (AC 1); a linha `--radius` sai da tabela `Tokens` (AC 3); `contraste do painel de entrada` perde o literal `border-l bg-muted p-10` e mantém o cálculo (AC 5); a regex do `h1` de `títulos de página` passa a `font-heading text-[28px]` (AC 2, AC 5). Item 3: `opsz da Inter sem fonte nova` sai de `ux.test.tsx` (AC 1; C1). Item 4, `ux.spec.ts`: `títulos com opsz 32 da Inter` sai (AC 1, AC 2; C2 e C4); `no máximo 4 tamanhos de texto por tela` aceita 28 px no `h1` das telas de acesso e da raiz e 40 px só em Indicadores, e separa esse tamanho do único tamanho de título (AC 2); `sem emoji nem gradiente` perde a exceção da faixa sobre a imagem (AC 6). Item 5, `arranjo.spec.ts`: `fonte Inter do próprio app` sai (AC 1; C2); `cartões sem sombra` passa ao cartão "Ações" do detalhe a 1280 px com `box-shadow` `none`, e a parte de Indicadores sai (AC 3, AC 14 a AC 16); em `valores de tipo e bordas` só o canto da caixa da tabela da Fila passa de `8px` a `12px` (AC 3); `arranjo telas de acesso` e `telas de acesso centralizadas` (as 3 telas de acesso) passam à coluna única de até 400 px (AC 5); no bloco `entrada institucional`: saem `entrada em duas colunas`, `entrada numa coluna abaixo de 1024 px`, `fundo e borda do painel`, `conteúdo do painel` e `posição do conteúdo do painel` (só tinham o painel, AC 5; substituídos por C9, C10, C11, C13); `recuo da coluna de entrada` fica como estava; `linha da marca na entrada` passa a iniciais de 48 px à esquerda da coluna, sem o topo de 128 px (AC 5, AC 7); `bloco do formulário por largura` passa às larguras da coluna de 400 px e perde o centro vertical, que o plano não fixa (AC 5); `cabeçalho do Login` passa a `h1` de 28 px e a frase logo abaixo do nome (P1, AC 5); `cabeçalho de Primeiro acesso e Criar senha` e `alerta de sucesso de Criar senha` passam a medir o título da tela e o alerta 32 px abaixo dele (AC 5, P2); `formulário do Login: espaços, erro e teclado` e `frase do Login à esquerda` só mudam o localizador do bloco para a coluna. Item 7, `aparencia.spec.ts`: `logo até 40 px no login` passa a 48 px; `imagem do login no painel e na faixa` virou `imagem do login na coluna direita e na faixa` (faixa de 160 px, textos fora da foto; AC 6, AC 7); `ilustração no login sem imagem` e `textos do login na base sobre a faixa` saem (C9 e C13). Item 8: `aparencia.test.tsx` (`logo no login e na barra` passa a `h-12`; `raiz com a ilustração Boas-vindas` sai, C16) e `acesso/acesso.test.tsx` (`painel de entrada sem foco e sem ícones`: na coluna das 3 telas, sem `svg[data-ilustracao]` e sem focável fora do formulário além do link da tela; AC 5).
