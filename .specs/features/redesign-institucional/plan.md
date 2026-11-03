# Redesign institucional: barra lateral, tema Preto, tokens neutros e mensagens que não se partem

## Problem

A `interface-nova` (AD-023, fechada em 02/11 pelo AD-026) trocou o Bootstrap por shadcn/ui e Tailwind,
mas manteve a cara de "exemplo de componente": nas capturas de 03/11 (API simulada de `e2e/simulada.ts`,
360 px e 1280 px, claro e escuro):

- **as mensagens se partem no meio da palavra.** A 360 px o link do Assistente sai como
  `.../finance` + `iro/boletos/...`, `semestre=2026-` + `2` e `ONE-` + `1234...`: o `break-words` do
  `Balao` corta onde a linha acaba, não onde a URL tem barra. O mesmo no balão do detail do chamado;
- **os rótulos do gráfico de Indicadores quebram em 3 linhas** (`Financeiro >` / `Boletos e` /
  `mensalidades`) dentro de 120 px;
- **a navegação não cabe**: 9 links numa barra de topo que esconde o excedente em "Mais" conforme a
  largura (3 a 1024 px, 5 a 1280 px, 7 a 1536 px). Quem é administrador procura Usuários, Matrículas
  e Cadastros num menu que muda de tamanho;
- **o tema escuro é azul-marinho** (`oklch(0.17 0.02 265)`) e não existe tema preto; o usuário pediu
  "tema escuro e preto";
- **o visual não é institucional**: cartões com sombra e `rounded-xl`, botões principais em azul
  saturado, títulos `text-xl` iguais ao corpo.

Quem paga: o grupo na banca de 20/11, que vê as telas primeiro, e o aluno no celular, que lê link
partido no meio. Evidência: as capturas acima e o pedido do usuário de 03/11; não há medida de uso,
porque não há produção.

**O que muda quando isto estiver pronto:** fundo neutro sem tom azul, um único azul institucional como
destaque, superfícies com borda fina e sem sombra; quatro temas (Claro, Escuro, Preto, Sistema); barra
lateral fixa a partir de 1024 px com todos os links visíveis e a gaveta de hoje abaixo disso; link
longo quebra depois de `/`, `?`, `&`, `=`; rótulo do gráfico numa linha só. **Nada muda no
comportamento**: as mesmas chamadas à API, rotas, permissões e textos, fora "Mais" (sai) e "Preto"
(entra).

## Flow

Reusa o que existe em vez de duplicar: o `ThemeProvider` do shadcn Vite e a chave `one-tema` (door 10
da `interface-nova`), a gaveta Vaul de `web/src/ui/drawer.tsx`, os `Links` de `Autenticado`, os
componentes de `web/src/ui/` (só as classes mudam) e a API simulada dos e2e para medir arranjo.

1. `web/src/index.css` (exists) - os tokens de `## Visual` em `:root`, `.dark` e o bloco novo `.black`
   (door 2); nenhum componente ganha cor literal
2. `web/src/ui/theme-provider.tsx` (exists) - aceita `black` e põe `dark black` no `<html>` (door 1);
   `Tema` em `Autenticado` lista Claro, Escuro, Preto, Sistema; `sonner.tsx` (exists) recebe `dark`
   quando o tema é `black`
3. `Autenticado` (exists) - abaixo de 1024 px a barra de topo e a gaveta de hoje; a partir de 1024 px
   um `<aside>` fixo à esquerda (door 3) com marca, instituição, os `Links` todos, avisos, Tema e Sair;
   `Mais`, `NaBarra` e `NoMais` são apagados
4. `Balao` (exists) - o texto continua texto puro (AD-012), com um `<wbr>` depois de cada `/ ? & = #`
   (door 4)
5. `indicadores/Grafico.tsx` (exists) - o rótulo do eixo é cortado com "…" para caber numa linha
6. telas das 6 fatias (exist) - nenhuma muda de DOM; mudam por herdar os componentes de `web/src/ui/`
   e o título de página
7. out: as mesmas requisições HTTP; `vite build` em `api/wwwroot` (exists) como hoje

## Impact

| Front | What changes |
| --- | --- |
| decisões | AD-023 fixou a paleta "neutral + azul oklch(0.49 0.17 262)" e a barra de topo com "Mais" (nota C19 de 02/11). Um AD novo no `STATE.md`, na aprovação deste plano, substitui essas duas partes; o resto do AD-023 (pastas, Tiptap, Table, DayPicker) fica |
| testes que codificam a decisão substituída | `src/test/interface.test.ts` (tabela `Tokens` e `contraste dos tokens`), `src/acesso/textos.test.tsx` (lista `Cabecalho` com "Mais"), `src/acesso/acesso.test.tsx` C91 (tema em 3 valores), `e2e/arranjo.spec.ts` "cabeçalho a 1024 px mostra os links na barra" e "barra a {largura} px sem sobreposição". São reescritos para a decisão nova, nunca afrouxados: ver `Test policy` em `checks.md` |
| domain | termo novo: tema `black` (rótulo "Preto") - fundo `#000`, mesmo `dark:` do Tailwind; só `theme-provider.tsx` e `sonner.tsx` ramificam no valor do tema hoje |
| stored data | `localStorage['one-tema']` ganha o valor `black`; quem tem `light`, `dark` ou `system` gravado não muda. Nada no servidor |
| AD-018 | `Autenticado` perde três funções e ganha uma; crapper e dryer continuam valendo. Mutator segue suspenso (AD-025) |

## Relations

None - no stored-data shape change (o `localStorage` é do navegador e está em `Impact` e na door 1).

## Surface

None - nothing consumed outside. Nenhuma rota da API muda.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. valor do tema gravado no navegador | `localStorage['one-tema'] ∈ {'light','dark','black','system'}`; `black` põe `class="dark black"` no `<html>` | `data-theme="black"` num atributo à parte: o `dark:` do Tailwind, usado nas 15 telas, e o Sonner não o enxergariam; cada tela precisaria de `black:` repetido |
| 2. tema Preto como camada sobre o Escuro | em `index.css`, depois de `.dark { ... }`, um `.black { ... }` só com os tokens de superfície e texto de `## Visual` (fundo, cartão, popover, muted, primary-subtle, warning-subtle, borda, input, sidebar, foreground) | um terceiro bloco completo copiando o `.dark`: dois lugares para o mesmo `--destructive` e `--primary`, que divergem no primeiro ajuste |
| 3. barra lateral como padrão de layout | `<aside class="hidden lg:flex ... sticky top-0 h-svh w-60 border-e">` em `Autenticado`, com os mesmos `NavLink` da gaveta; `main` ao lado. Abaixo de 1024 px nada muda | o `sidebar` do shadcn: ~700 linhas e 4 arquivos novos em `web/src/ui/` (sheet, tooltip, skeleton, separator) para recolher em ícones e atalho Ctrl+B, que ninguém pediu e que duplicariam a gaveta Vaul |
| 4. ponto de quebra em texto de mensagem | `Balao` divide o texto em `/([/?&=#])/` e põe `<wbr />` depois de cada separador; continua React text, sem HTML | `overflow-wrap:anywhere` sozinho: parte "financeiro" no meio, que é o defeito; `dangerouslySetInnerHTML` ou Markdown: contrariam o texto puro do AD-012 |
| 3a. barra lateral no mesmo `<nav>` (decisão do usuário de 03/11/2026 durante o build, "Um único <nav>"; substitui o `<aside>` separado da door 3, que fica registrada) | um único `<nav>` em `Autenticado`: abaixo de 1024 px a barra de topo de hoje; a partir de 1024 px `lg:fixed lg:inset-y-0 lg:start-0 lg:w-60 lg:h-svh lg:flex-col lg:border-e lg:bg-sidebar`, e o `main` com `lg:ps-60`. Onde os critérios 8 a 14 e o `## Screens` dizem `<aside>`, vale este `<nav>` | o `<aside>` separado da door 3: duplica no DOM os 9 links, "Tema" e "Sair" (um deles escondido por CSS) e faz ~20 testes Vitest que buscam por papel acharem dois |

- Nothing else in this change is hard to reverse: classes, raio, tipografia e o corte do rótulo do gráfico se desfazem num commit.

## Visual

Fonte **binding**: as respostas do usuário de 03/11 ("Claro + Escuro + Preto", "Barra lateral") e esta
tabela. Toda cor fica em variável CSS; nenhum componente usa cor literal (regra que já existe em
`interface.test.ts`).

**Referências** (arranjo genérico, nenhuma tela copiada): painéis de produto com barra lateral
neutra e um único destaque (Linear, Vercel); a sobriedade dos sistemas de governo (GOV.BR DS 4.0,
USWDS: medida de 45 a 90 caracteres por linha, entrelinha de no mínimo 1,5 no corpo); dark mode com
elevação por luminosidade e não por sombra, texto que não é branco puro e preto puro só como opção
(Material, Atmos). As capturas de 03/11 são o "antes".

**Tokens (oklch sem a função), Claro / Escuro / Preto** - Preto herda do Escuro o que está `=`:

| Token | Claro (`:root`) | Escuro (`.dark`) | Preto (`.black`) | Uso |
| --- | --- | --- | --- | --- |
| `--background` | `1 0 0` | `0.17 0 0` | `0 0 0` | fundo |
| `--foreground` | `0.145 0 0` | `0.95 0 0` | `0.92 0 0` | texto |
| `--card` / `--popover` | `1 0 0` | `0.205 0 0` | `0.15 0 0` | cartão, popover, diálogo |
| `--sidebar` | `0.985 0 0` | `0.15 0 0` | `0 0 0` | barra lateral |
| `--primary` | `0.45 0.15 262` | `0.72 0.12 262` | = | botão principal, link ativo, foco |
| `--primary-foreground` | `0.985 0 0` | `0.17 0 0` | = | texto sobre o primário |
| `--primary-subtle` | `0.96 0.02 262` | `0.27 0.05 262` | `0.24 0.05 262` | balão do aluno, item ativo da barra |
| `--muted` | `0.97 0 0` | `0.24 0 0` | `0.20 0 0` | balão do assistente e do atendente |
| `--muted-foreground` | `0.50 0 0` | `0.71 0 0` | `0.70 0 0` | texto pequeno, datas |
| `--warning-subtle` | `0.97 0.04 90` | `0.30 0.05 85` | `0.27 0.05 85` | nota interna |
| `--success` | `0.52 0.13 155` | `0.72 0.14 155` | = | ATIVO, Sim, Confirmar resolução |
| `--destructive` | `0.577 0.245 27.325` | `0.704 0.191 22.216` | = | erro, Arquivar, Cancelar |
| `--border` / `--input` | `0.922 0 0` | `1 0 0 / 10%` / `1 0 0 / 15%` | `1 0 0 / 14%` / `1 0 0 / 18%` | bordas finas |
| `--chart-1`, `--chart-2` | `var(--primary)`, `0.60 0.10 200` | `var(--primary)`, `0.75 0.10 200` | = | barras |
| `--radius` | `0.5rem` | = | = | cantos |

Contraste calculado em 03/11 (WCAG 2, script em `scratchpad/contraste.py`, recalculado pelo teste):
os 3 temas passam de 4,5:1 em texto/fundo, texto/cartão, texto pequeno/fundo, texto pequeno/muted,
texto pequeno/primary-subtle, texto pequeno/warning-subtle, primário/texto do primário e destrutivo/fundo.

**Tipografia e superfície:** Inter (já instalada); título de página `text-2xl font-semibold
tracking-tight`; corpo 16 px a 360 px, `leading-relaxed` no balão; `Card` sem sombra e com `rounded-lg`
(o `shadow-sm` e o `rounded-xl` saem de `web/src/ui/card.tsx`); popover e diálogo mantêm a sombra
(é a única elevação no claro). Marca provisória "One" em Inter 600 continua até o logo do grupo.

## Screens

Enumeração **binding**. Texto: o de `interface-nova/plan.md ## Screens` linha a linha, **sem mudança**,
fora o marcado abaixo. Arranjo: o de lá, fora o marcado abaixo. Nenhuma tela reordena o DOM.

| # | Tela | Texto | Arranjo a 360 px · a partir de 1024 px |
| --- | --- | --- | --- |
| 0 | cabeçalho (`Autenticado`) | sai "Mais"; o controle "Tema" lista "Claro", "Escuro", "Preto" *(novo)*, "Sistema" | 360 a 1023 px: igual a hoje (barra de 56 px, gaveta Vaul) · a partir de 1024 px: sem barra de topo; barra lateral de 240 px fixa à esquerda, altura da tela, borda à direita, fundo `--sidebar`: marca e instituição (truncada) no topo, os links do papel um por linha de 36 px com ícone e rótulo, o ativo em `bg-primary-subtle` e `font-medium`; no rodapé avisos (aluno), "Tema" e "Sair"; o conteúdo ocupa o resto, centralizado com a largura máxima de hoje. Os 9 links visíveis de uma vez em 1024 × 740<br>**Nota de 03/11/2026 (decisão do usuário após a verificação rodada 1, "Quebrar em 2 linhas"; acrescenta, não reescreve):** na barra lateral o nome da instituição aparece inteiro, quebrando em até 2 linhas, sem reticências; na barra de topo continua truncado |
| 6 | Assistente | igual | balão com `rounded-2xl`, canto do lado de quem fala em `rounded-sm` (aluno: baixo-direita; os outros: baixo-esquerda); texto que só quebra numa fronteira de palavra ou depois de `/ ? & = #`, salvo um pedaço sem nenhum desses que sozinho passe da largura do balão |
| 9 | Detalhe do chamado | igual | balões como a tela 6, inclusive os trechos das fontes |
| 12 | Indicadores | igual | cada rótulo do eixo do gráfico numa linha só: até 18 caracteres, senão 17 + "…" (o nome inteiro segue na tabela abaixo, que já existe) |
| 1 a 15 | todas | igual | `h1` em `text-2xl font-semibold tracking-tight`; cartões sem sombra; nenhuma rolagem horizontal a 360 px |

## Criteria

### S1: Tokens e tema Preto (P1)

O usuário escolhe Claro, Escuro, Preto ou Sistema e o app inteiro troca, com o contraste garantido.

**Acceptance Criteria**

1. The web SHALL declare in `web/src/index.css` exactly the token values of `## Visual` for `:root`, `.dark` and `.black`, with `.black` after `.dark`
2. The web SHALL keep, in each of `:root`, `.dark` and `.dark.black`, contrast of at least 4.5:1 for the 8 pairs listed under `## Visual`
3. WHEN the user picks "Preto" in "Tema" THEN the web SHALL store `black` in `localStorage['one-tema']` and set both classes `dark` and `black` on `<html>`
4. WHEN the user picks "Claro", "Escuro" or "Sistema" after "Preto" THEN the web SHALL remove the class `black` from `<html>`
5. WHILE the theme is `black` the web SHALL render the computed `background-color` of `<body>` as `rgb(0, 0, 0)`
6. WHILE the theme is `black` the web SHALL pass `dark` as the theme of the Sonner `Toaster`
7. IF `localStorage['one-tema']` holds `light`, `dark` or `system` from before this feature THEN the web SHALL apply that theme unchanged

**Independent test:** abrir "Tema", escolher "Preto": fundo preto, cartões cinza-escuro, toast escuro; recarregar e continua Preto.

### S2: Barra lateral (P1)

A partir de 1024 px todos os links ficam à vista numa barra lateral; abaixo disso nada muda.

**Acceptance Criteria**

8. WHILE the viewport is at least 1024 px wide the web SHALL show a left `<aside>` 240 px wide, as tall as the viewport, with every link of the user's roles visible, each with icon and label
9. WHILE the viewport is at least 1024 px wide the web SHALL NOT render the top bar nor the "Menu" button, and the page content SHALL start to the right of the `<aside>` without overlapping it
10. WHILE the viewport is narrower than 1024 px the web SHALL render the top bar and the Vaul drawer exactly as before this feature and SHALL NOT render the `<aside>`
11. The web SHALL NOT render the text "Mais" on any authenticated screen at any width
12. WHEN the current route matches a link THEN the web SHALL mark that link with `aria-current="page"` and the class `bg-primary-subtle`
13. WHILE the page scrolls the `<aside>` SHALL keep its top at 0 px of the viewport
14. WHILE the user is a student the `<aside>` SHALL show the avisos control, "Tema" and "Sair" below the links; for the other roles "Tema" and "Sair"

**Independent test:** administrador a 1280 × 800: os 9 links à esquerda, nenhum "Mais"; estreitar para 800 px: volta a barra de topo com "Menu".

### S3: Mensagens que não se partem (P1)

Link longo na conversa quebra nas barras, não no meio das palavras.

**Acceptance Criteria**

15. WHEN a message text contains `/`, `?`, `&`, `=` or `#` THEN the `Balao` SHALL render a `<wbr>` right after each of them and keep `textContent` identical to the original text
16. WHILE the viewport is 360 px wide, WHEN the student sends `https://portal.univag.edu.br/financeiro/boletos/segunda-via?matricula=2000567890&semestre=2026-2` THEN every rendered line break of that bubble SHALL fall after a space, `/`, `?`, `&`, `=`, `#` or `-`, never inside `financeiro`, `boletos`, `segunda` or `matricula`
17. IF a run with none of those separators is wider than the bubble THEN the `Balao` SHALL break it inside the bubble and the page SHALL have no horizontal scroll
18. The `Balao` SHALL render the student's bubble with `rounded-2xl rounded-br-sm` and every other bubble with `rounded-2xl rounded-bl-sm`
19. The `Balao` SHALL render text only as React text nodes and `<wbr>` elements, never as HTML from the message (AD-012)

**Independent test:** a 360 px enviar o link acima: quebras só depois de `/`, `?`, `&`.

### S4: Indicadores e superfícies (P2)

Rótulos de gráfico legíveis e o acabamento institucional em todas as telas.

**Acceptance Criteria**

20. The `Grafico` SHALL render each y-axis label in one line: the category itself when it has up to 18 characters, otherwise its first 17 characters followed by "…"
21. The `Card` of `web/src/ui/card.tsx` SHALL render with computed `box-shadow: none`
22. The web SHALL render every page `h1` with the classes `text-2xl font-semibold tracking-tight`
23. WHILE the viewport is 360 px wide each of the 15 screens SHALL have `document.documentElement.scrollWidth` equal to 360

**Independent test:** Indicadores a 360 px com a categoria "Financeiro > Boletos e mensalidades": rótulo "Financeiro > Bole…" numa linha, nome inteiro na tabela.

### S0: Invariantes (P1)

24. The web SHALL send the same API requests, in the same order, with the same bodies, as before this feature on every screen (the existing Vitest and e2e suites stay green with no assertion weakened)
25. The web SHALL show on every screen the same visible text as `interface-nova/plan.md ## Screens`, except "Mais" removed and "Preto" added
26. The web SHALL contain no color literal (`#hex`, `oklch(`, `rgb(`, `hsl(`) outside `web/src/index.css`

## Out of scope

| Excluded | Why |
| --- | --- |
| recolher a barra lateral em ícones, atalho Ctrl+B | não pedido; a barra de 240 px cabe a partir de 1024 px |
| grupos com título na barra lateral ("Atendimento", "Administração") | texto novo nas telas; 9 links cabem sem agrupar |
| nome do usuário e avatar na barra | texto novo; não pedido |
| traduzir os estados crus do Histórico (`TRANSICAO`, `AGUARDANDO_ALUNO`) | é mudança de texto, não de visual; vale uma feature própria antes da banca |
| logo e cores do grupo | não entregues; só `--primary*` e a marca mudam quando chegarem |
| Markdown nas respostas do assistente | contraria o texto puro do AD-012 |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| temas | Claro, Escuro neutro, Preto `#000`, Sistema | resposta do usuário em 03/11 | y |
| estrutura | barra lateral a partir de 1024 px, gaveta abaixo | resposta do usuário em 03/11 | y |
| "Sistema" com o celular em modo escuro | aplica Escuro, não Preto | o sistema operacional só informa claro ou escuro; Preto é escolha explícita | n |
| cor principal | azul `0.45 0.15 262` (mesmo matiz de hoje, mais sóbrio) e não preto como no shadcn | mantém a marca provisória aceita no AD-023 e um único destaque; trocar por preto é só o valor de `--primary` | n |
| perfil do tlc-spec-lean | `ui` | feature de tela, como a `interface-nova` (AD-020); a verificação abre as capturas e compara com `## Screens` | n |
| quando | depois da etapa 4c e antes da banca de 20/11 | o pedido é de agora; nada no roadmap bloqueia | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen barra lateral | empty state | n/a - todo papel tem ao menos um link (Menu filtra por papel, como hoje) |
| screen barra lateral | loading state | existing - `Spinner` "Carregando" antes do `/api/auth/me`, sem barra |
| screen barra lateral | error and unauthorised state | existing - `Navigate` para o login, como hoje |
| screen barra lateral | density and ordering | AC 8, AC 12 - ordem do `Menu` de hoje |
| screen controle Tema | ordering and default | AC 3, AC 4, AC 7 - Claro, Escuro, Preto, Sistema; padrão `system` |
| screen balão de mensagem | long unbroken content | AC 16, AC 17 |
| screen gráfico de Indicadores | long labels | AC 20 |
| all 15 screens | empty, loading, error, destructive confirms | existing - inalterados (`interface-nova` AC e `## Screens`); AC 24, AC 25 |
| copy | textos | AC 25 - só "Mais" sai e "Preto" entra |
| API | error shape, versioning, rate limits | n/a - nenhuma rota muda |

## Sources

- Pedido do usuário de 03/11/2026 e as respostas "Claro + Escuro + Preto" e "Barra lateral" - settle temas e estrutura
- `.specs/features/interface-nova/plan.md ## Screens` - texto e arranjo que não mudam
- Capturas de 03/11 em `scratchpad/shots/` (360 e 1280 px, claro e escuro) - o "antes" das S3 e S4
