# Layout de painel: o front no molde do dashboard do shadcn

## Problem

As telas autenticadas do One não têm uma hierarquia visual: os 13 indicadores aparecem como cartões
quase iguais (só o "Indicador principal" é maior); as seis listas (Fila, Minhas solicitações,
Usuários, Artigos, Documentos, Cadastros) são pilhas de cartões, com dados que pediam colunas e
botões soltos em cada item; e o título de cada tela é desenhado de um jeito diferente em cada uma.
No celular, a navegação é uma gaveta que sobe de baixo, e o desktop usa outra estrutura, a barra
lateral própria (AD-027 door 3a, AD-028 door 2). Com isso, o mesmo app tem duas formas de navegar.

Quem paga: o administrador e o atendente, que procuram um número no meio de 13 caixas iguais e leem
listas sem colunas; e quem usa o celular, que encontra uma navegação diferente da do desktop. Única
evidência: o pedido do usuário de 03/11 ("refazer todo o front da aplicação para ele seguir o
template https://ui.shadcn.com/examples/dashboard ... a responsividade isso é de extrema importância
e como as informações são apresentadas, elementos maiores e menores"). Não há medida de uso.

**O que muda quando isto estiver pronto:** o app passa a ter o layout do template. Uma barra lateral
do shadcn que recolhe em ícones no desktop e abre como painel lateral no celular. Um cabeçalho fino
com o título da tela. Em Indicadores, quatro números grandes no topo e os demais menores. As listas
viram tabelas com borda, e as colunas secundárias somem quando falta largura. As ações de cada linha
ficam num menu "⋮". O conteúdo reage à largura da área principal, e não à da janela.

## Flow

Reusa a lista `Menu` e os grupos da AD-028, o `ThemeProvider`, o `Tooltip`, o `Popover`, a `Table`,
os `Card`, o `Tabs`, o `Badge`, os `Editor`/`Confirmar` e todas as consultas e mutações das telas;
nenhum hop de dados muda, só onde cada coisa é desenhada.

1. `/api/auth/me` (exists) - devolve `nome`, `papeis`, `instituicao`; nada muda na API
2. `Autenticado` (exists) - passa a montar `SidebarProvider` + `Sidebar` + `SidebarInset` de `web/src/ui/sidebar.tsx` (door 1), com o estado aberto/recolhido controlado por `localStorage['one-barra']` (door 2); o cabeçalho do inset leva o título da tela como único `h1` (door 3)
3. `web/src/ui/sidebar.tsx`, `sheet.tsx`, `separator.tsx`, `skeleton.tsx`, `use-mobile.ts` (door 1) - abaixo de 768 px a barra vira `Sheet` pela esquerda; a partir de 768 px fica fixa, de 256 px, e recolhe para 48 px
4. `<main>` (exists, em `Autenticado`) - vira `@container/main` (door 5); cada tela decide colunas e grades pela largura do `main`, não da janela
5. telas (exist) - `Indicadores` ganha 4 cartões de destaque e 9 compactos; as listas passam a usar `Table` (exists) com colunas que somem por container query, e as ações por linha vão para `web/src/ui/dropdown-menu.tsx` (door 4); `ChamadoDetalhe` ganha uma coluna lateral a partir de `@5xl/main`; as telas de acesso centralizam o cartão na janela
6. out: as mesmas requisições de antes; `one-barra` continua a ser a única preferência nova gravada (já existia)

## Impact

| Front | What changes |
| --- | --- |
| decisões | AD-027 door 3a (um `<nav>` só, restilizado) e AD-028 door 2 (recolher sem trocar o `<nav>`, `sidebar` do shadcn rejeitado) passam a valer como superseded por um AD novo: o `sidebar` do shadcn entra, por decisão do usuário de 03/11 ("Adotar o sidebar") |
| ponto de quebra da navegação | era 1024 px (barra de topo + gaveta abaixo, barra lateral acima); passa a 768 px (`MOBILE_BREAKPOINT` do shadcn). Entre 768 e 1023 px a barra lateral agora aparece |
| largura recolhida | era 64 px (AD-028); passa a 48 px (`--sidebar-width-icon: 3rem` do shadcn). Aberta: era 240 px; passa a 256 px (o template usa `calc(var(--spacing) * 64)`) |
| gaveta Vaul do menu | sai; o "Menu" de baixo vira `Sheet` lateral. `web/src/ui/drawer.tsx` só é usado por `Autenticado`: sai junto, e `vaul` sai do `package.json` se nenhum teste de `interface.test.ts` o fixar (se fixar, o teste é reescrito: a AD-020 listava o Vaul para a gaveta, que deixa de existir) |
| títulos (`h1`) | cada tela deixa de desenhar o próprio `h1`; o `h1` único fica no cabeçalho, com o rótulo do link ativo. "Importar matrículas" vira "Matrículas"; no detalhe, o `h1` passa a ser o número ("ONE-12") e o título do chamado vira `h2`. Testes que procuram `heading` por nome são reescritos |
| botões por item | "Editar", "Desativar", "Ativar", "Arquivar" e "Nova versão" saem da linha e vão para o menu "Ações de <nome>". Os testes de `administracao/` e `conhecimento/` que clicam nesses botões ganham um passo antes, que abre o menu. A asserção de cada um continua a mesma |
| Sair, nome e Avisos | "Sair" e o nome vão para o menu do usuário no rodapé da barra; "Avisos" (aluno) e "Tema" ficam no cabeçalho, à direita. `e2e/push.spec.ts` "na gaveta o item de avisos mostra o texto visível" e "barra recolhida esconde o texto dos avisos" são reescritos para o cabeçalho |
| e2e de arranjo | `e2e/arranjo.spec.ts` mede o arranjo atual (barra de 240/64 px, gaveta a 360 px, listas em cartão, Indicadores em 2/4 colunas): todo teste de casca, lista e Indicadores é reescrito para `## Screens` deste plano; os de Assistente, balões, tema Preto, fonte e movimento reduzido continuam |
| checks anteriores | `redesign-institucional` C8 e `barra-lateral-grupos` (AC 8-14) descrevem a casca antiga: ficam superseded por este plano, sem reabrir aquelas verificações |
| tokens | `index.css` ganha os tokens do `sidebar` (`--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` e os `-foreground`), derivados dos tokens atuais em claro, escuro e preto; nenhum token existente muda |
| domain | nenhum termo novo; os grupos e rótulos da AD-028 continuam |
| stored data | `localStorage['one-barra']` continua com `recolhida`/`aberta`; quem já recolheu continua recolhido. Nada a migrar. O cookie `sidebar_state` do shadcn não é gravado (door 2) |

## Relations

None - no stored-data shape change (a preferência é do navegador e já existe, door 2).

## Surface

None - nothing consumed outside.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. casca com o `sidebar` do shadcn | `web/src/ui/sidebar.tsx` copiado do registro `new-york-v4` (com `sheet.tsx`, `separator.tsx`, `skeleton.tsx`, `use-mobile.ts`), usado como `<SidebarProvider><Sidebar collapsible="icon" variant="sidebar"/><SidebarInset/></SidebarProvider>`; abaixo de 768 px, `Sheet` pela esquerda com 288 px | manter o `<nav>` próprio restilizado: decisão do usuário de 03/11 ("Adotar o sidebar"); no celular não seguiria o template |
| 2. preferência no navegador, sem cookie | `SidebarProvider open/onOpenChange` controlado por `localStorage['one-barra'] ∈ {'recolhida','aberta'}` (ausente ou outro valor = aberta); a linha do `sidebar.tsx` copiado que grava `document.cookie = sidebar_state=...` é removida | o cookie `sidebar_state` do shadcn: iria à API em toda requisição sem uso no servidor e faria quem já recolheu a barra perder a escolha |
| 3. título no cabeçalho, um só `h1` | `Autenticado` desenha `<header>` de 49 px com `SidebarTrigger`, `Separator` vertical e `<h1 className="text-base font-medium">` com o título da rota: o rótulo do link de `Menu` ativo, `numero` em `chamados/:numero`, "Trocar senha" em `trocar-senha`; telas novas entram nesse mapa | cada tela com o próprio `h1`: o template não faz assim, haveria dois `h1` com o cabeçalho, e o título mudaria de lugar a cada tela |
| 4. ações por linha num menu | `web/src/ui/dropdown-menu.tsx` (shadcn), botão `variant="ghost" size="icon"` com o ícone `EllipsisVertical` e o nome acessível "Ações de <nome do item>" na última coluna; itens destrutivos com `variant="destructive"`; os diálogos de confirmação continuam os mesmos | botões na linha: a 360 px três botões não cabem numa linha de tabela; e o `Popover` não tem a semântica e o teclado de `menu`/`menuitem` |
| 5. responsividade pelo conteúdo | `<main className="@container/main ...">`; grades e colunas usam variantes `@xl/main:`, `@2xl/main:`, `@3xl/main:`, `@4xl/main:` e `@5xl/main:` do Tailwind v4 (sem plugin), e não `md:`/`lg:` da janela | pontos de quebra da janela: entre 768 e 1100 px, com a barra aberta, o `main` tem só 512 a 850 px e as telas montariam o arranjo largo num espaço estreito |

- Nothing else in this change is hard to reverse: as cores, a fonte, os rótulos e as colunas de cada tabela são classes e texto.

## Screens

Fonte **binding**: o exemplo do shadcn (`apps/v4/app/(app)/examples/dashboard`: `page.tsx`,
`site-header.tsx`, `app-sidebar.tsx`, `section-cards.tsx`, `data-table.tsx`, lidos em 03/11), as
respostas do usuário de 03/11 e esta tabela. Medidas em px CSS. "Estreito" e "largo" se referem à
largura do `main` (container), não à da janela. Textos novos estão marcados *(novo)*. Todo texto que
não aparece na tabela continua como está hoje.

| Tela / estado | Texto | Arranjo |
| --- | --- | --- |
| casca, janela ≥ 768 px, barra aberta | "One", nome da instituição; títulos de grupo e rótulos da AD-028; no rodapé, o nome e o papel *(novo: "Aluno", "Atendente" ou "Administrador", o primeiro de `papeis` na ordem Administrador, Atendente, Aluno)* | barra fixa à esquerda, 256 px, fundo `--sidebar`, borda à direita. No topo, a marca e a instituição numa linha que pode quebrar em 2; os grupos rolam no meio; no rodapé, o botão do usuário (iniciais num quadrado de 32 px, nome e papel em 2 linhas truncadas, ícone `ChevronsUpDown`). O conteúdo começa a 256 px |
| casca, barra recolhida | sem texto visível na barra; os nomes ficam em dicas e nos nomes acessíveis | barra de 48 px só com ícones centralizados e o quadrado das iniciais; o conteúdo começa a 48 px |
| casca, janela < 768 px | os mesmos da barra aberta, dentro do painel | sem barra fixa; o botão do cabeçalho abre um `Sheet` pela esquerda, de 288 px (até a largura da janela), com fundo escurecido atrás |
| cabeçalho (todas as larguras) | botão "Alternar barra lateral" *(novo, nome acessível)*; título da tela; "Tema"; "Avisos" do aluno (já existe) | 49 px de altura com borda inferior, fixo no topo do conteúdo (`sticky`). Da esquerda para a direita: botão, separador vertical de 16 px, `h1` de 16 px peso 500 numa linha truncada. À direita: Avisos e Tema, botões-ícone de 36 px. Recuo de 16 px, e de 24 px com janela ≥ 1024 px |
| menu do usuário | nome; papel; "Sair" | abre ao lado do botão (à direita com a barra aberta, acima no celular); nome e papel no topo, separador, "Sair" com o ícone `LogOut` |
| área principal | — | `@container/main`; 16 px de recuo lateral, e 24 px com janela ≥ 1024 px; 16 px entre blocos e no topo, e 24 px com janela ≥ 768 px; largura total, sem `max-w-6xl`. Exceções centralizadas: Assistente e Detalhe até 768 px de texto, Trocar senha até 384 px |
| Indicadores, período | De, Até, "Escolher período no calendário", "Consultar" (existem) | linha de ferramentas no topo: largo (`@3xl/main`), tudo numa linha alinhada embaixo; estreito, De e Até em 2 colunas e calendário e Consultar na linha de baixo |
| Indicadores, destaque | "Indicador principal", "Chamados abertos agora", "Autoatendimento", "Tempo até a 1ª resposta"; rodapés *(novos)*: "Resolvidas sem reabertura, sobre as conversas com desfecho", "Chamados não fechados neste momento", "Resolvidas pelo assistente, sobre as conversas com desfecho", "Da abertura à primeira resposta pública" | 4 cartões com o fundo em gradiente `from-primary/5 to-card` e `shadow-xs`. Cada um tem o rótulo em 14 px na cor `muted`, o valor em 24 px peso 600 com `tabular-nums` (30 px quando o cartão tem 250 px ou mais) e o rodapé em 14 px `muted` numa linha. Grade com 1 coluna; 2 a partir de `@xl/main` (576 px); 4 a partir de `@5xl/main` (1024 px) |
| Indicadores, demais | os 9 rótulos restantes de hoje | cartões compactos: rótulo de 14 px `muted` e valor de 20 px peso 600 `tabular-nums`, sem rodapé. Grade com 2 colunas; 3 a partir de `@3xl/main` (768 px) |
| Indicadores, rankings | "Categorias por conversas", "Categorias por chamados" (existem) | cada ranking num `Card` com o título em `CardTitle`, e o gráfico seguido da tabela em `CardContent`. Uma coluna; duas a partir de `@4xl/main` (896 px) |
| Indicadores, vazio / erro / carregando | "Sem dados no período", mensagem de erro, Spinner no "Consultar" (existem) | o `Alert` ocupa a largura do conteúdo, abaixo da linha de ferramentas |
| tabela (padrão das listas) | cabeçalhos *(novos)* por tela, abaixo | caixa com borda e cantos de 8 px, sem rolagem horizontal. Cabeçalho com fundo `muted`, texto de 14 px peso 500. Linhas de 14 px com borda entre elas e fundo `muted/50` no hover. A coluna principal quebra o texto; as colunas marcadas como "largo" só aparecem a partir de `@2xl/main` (672 px), e no estreito o conteúdo delas vira uma linha de 12 px `muted` abaixo da coluna principal |
| tabela vazia | o texto de vazio de cada tela (existe) | uma linha só, que ocupa todas as colunas, com 96 px de altura e o texto centralizado em `muted` |
| Fila | colunas "Número", "Título", "Categoria" (largo), "Responsável" (largo), "Dias" (largo), "Estado" | a linha inteira abre o chamado; "Número" é o link (o foco de teclado vai nele). "Estado" em `Badge` |
| Minhas solicitações | "Número", "Título", "Estado" | como a Fila |
| Usuários | "Nome", "CPF" (largo), "E-mail" (largo), "Papéis" (largo, com os setores depois de "·"), "Situação" (o "Desativado" de hoje, ou vazio), última coluna sem título com o menu | linha de ferramentas acima da tabela com "Novo" à direita; o menu "Ações de <nome>" tem "Editar" e "Desativar" (destrutivo), só para usuários ativos, como hoje |
| Artigos | o texto de ajuda de hoje; "Título", "Categoria" (largo), "Versão" (largo), "Validade" (largo), "Situação" (selos de indexação e estado), menu | linha de ferramentas com o texto de ajuda à esquerda (14 px `muted`) e "Novo" à direita; no estreito, o texto em cima e o botão embaixo, alinhado à direita. O menu tem "Editar", "Ativar" e "Arquivar" (destrutivo), com as mesmas condições de hoje |
| Documentos | o texto de ajuda de hoje; "Título", "Categoria" (largo), "Versão" (largo, "versão n · p páginas"), "Arquivo" (largo), "Situação", menu | como Artigos; o menu tem "Nova versão" e "Arquivar" (destrutivo), só para documentos ativos |
| Cadastros | abas de hoje; "Nome", "Detalhe" (largo) | largo (`@4xl/main`, 896 px): `TabsList` à esquerda e "Novo" à direita na mesma linha. Estreito: no lugar das abas, um `NativeSelect` *(novo nome acessível "Cadastro")* com as mesmas opções. Abaixo, a tabela; o nome é um botão que abre o editor, como hoje |
| Matrículas | textos de hoje | um `Card` com a explicação do CSV, o campo de arquivo e "Importar". Abaixo, o resultado em `Alert` e a tabela de erros no padrão das tabelas |
| Detalhe do chamado | número no `h1` do cabeçalho; título do chamado em `h2` | largo (`@5xl/main`, 1024 px): 2 colunas, com o conteúdo à esquerda e uma coluna de 320 px à direita. Na esquerda ficam o título, o estado e o cartão da equipe, depois a transcrição, as mensagens e a resposta. Na direita, um `Card` "Ações" *(novo título)* com os botões e os formulários de ação, e um `Card` com o histórico. Estreito: uma coluna na ordem de hoje |
| Assistente | textos de hoje, sem o `h1` "Assistente" na página (vai para o cabeçalho) | coluna central de até 768 px, com o compositor fixo embaixo como hoje |
| Login, Primeiro acesso, Definir senha | textos de hoje | cartão de até 384 px centralizado na horizontal e na vertical da janela (`min-h-svh`), com 24 px de recuo, e 40 px com janela ≥ 768 px |
| raiz `/` | textos de hoje | centralizado na janela como o login |

## Criteria

### S1: Casca com a barra lateral do template (P1)

A navegação é a mesma do template em qualquer largura.

**Acceptance Criteria**

1. WHILE the viewport is at least 768 px wide the web SHALL show a fixed left sidebar 256 px wide (±1) with "One" and the institution name at the top, the AD-028 groups and links in the middle, and the user button at the bottom, and the content SHALL start at x = 256 (±1)
2. WHEN the user activates the button named "Alternar barra lateral" while the viewport is at least 768 px wide THEN the sidebar SHALL become 48 px wide (±1) with only icons, the content SHALL start at x = 48 (±1), and `localStorage['one-barra']` SHALL hold `recolhida`; activating it again SHALL restore 256 px and store `aberta`
3. WHEN an authenticated screen loads at 768 px or wider THEN the sidebar SHALL start collapsed if `localStorage['one-barra']` is `recolhida`, and expanded otherwise
4. WHILE the sidebar is collapsed every link SHALL keep its accessible name, and hover or keyboard focus on a link SHALL show a tooltip with its label; group titles, institution and link labels SHALL NOT be visible
5. WHILE the viewport is narrower than 768 px the web SHALL NOT show a fixed sidebar, and activating "Alternar barra lateral" SHALL open a left sheet 288 px wide (or the viewport width when narrower) with the same groups, links, institution and user button
6. WHEN the user picks a link inside the sheet THEN the sheet SHALL close and that screen SHALL open
7. WHEN the user presses Ctrl+B (Cmd+B on macOS) THEN the web SHALL toggle the sidebar as the button does
8. The web SHALL show on every authenticated screen a sticky header 49 px tall (±1) holding, from left to right, "Alternar barra lateral", a vertical separator, the screen title as the page's only `h1`, and at the right "Tema" and, for a student with push available, the push button
9. The header `h1` SHALL be the label of the active menu link; on `chamados/:numero` it SHALL be the ticket number; on `trocar-senha` it SHALL be "Trocar senha"
10. WHEN the user activates the user button THEN a menu SHALL open with the user's `nome`, the role label (the first of `papeis` in the order Administrador, Atendente, Aluno) and "Sair"; "Sair" SHALL sign out as it does today
11. WHILE the user prefers reduced motion the sidebar SHALL change width with no transition
12. The web SHALL NOT write a `sidebar_state` cookie

**Independent test:** a 1280 px, recolher a barra, recarregar: continua com 48 px; a 360 px, abrir pelo botão, escolher "Fila": o painel fecha e o cabeçalho diz "Fila".

### S2: Conteúdo responsivo (P1)

Nada transborda e o conteúdo se arranja pela largura que tem.

**Acceptance Criteria**

13. The web SHALL NOT scroll horizontally on any authenticated or access screen at viewport widths 360, 390, 768, 1024, 1280 and 1440 px, with the sidebar expanded and collapsed (`document.documentElement.scrollWidth` ≤ `innerWidth`)
14. The `main` element SHALL be a size container named `main`, and every grid and hidden column in `## Screens` SHALL switch on the width of `main`, not of the viewport
15. The content SHALL have 16 px horizontal padding below a 1024 px viewport and 24 px from 1024 px; 16 px gap and top padding below 768 px and 24 px from 768 px

**Independent test:** a 360, 768 e 1280 px, abrir cada tela: sem barra de rolagem horizontal; a 1024 px, com a barra aberta, a Fila mostra só as colunas estreitas.

### S3: Indicadores com hierarquia (P1)

Os números importantes aparecem grandes no topo, e os demais menores abaixo deles.

**Acceptance Criteria**

16. WHEN Indicadores has data THEN the web SHALL show, before any other card, 4 highlight cards in this order, "Indicador principal", "Chamados abertos agora", "Autoatendimento" and "Tempo até a 1ª resposta", each with its label, its value in a 24 px or larger font with `tabular-nums`, and the footer text from `## Screens`
17. The highlight grid SHALL have 1 column below a 576 px `main`, 2 columns from 576 px and 4 columns from 1024 px
18. WHEN Indicadores has data THEN the web SHALL show the other 9 indicators, in today's order, as compact cards with the value in a 20 px font, in 2 columns, 3 from a 768 px `main`
19. WHEN a ranking is present THEN the web SHALL show it in a card with its title, the chart and the table, the two rankings side by side from an 896 px `main`
20. The period form, the "Sem dados no período" alert, the error alert and the loading spinner SHALL behave as today

**Independent test:** a 1440 px com a barra aberta, quatro cartões grandes numa linha e nove menores em três colunas; a 360 px, um cartão grande por linha.

### S4: Listas em tabela (P1)

As listas viram tabelas com borda, e o que é secundário some quando falta espaço.

**Acceptance Criteria**

21. The web SHALL show Fila, Minhas solicitações, Usuários, Artigos, Documentos, each Cadastros tab and the Matrículas errors as tables with the columns listed in `## Screens`, in that order, with a muted header row
22. WHILE `main` is narrower than 672 px the columns marked "largo" SHALL NOT be shown, and their values SHALL appear as one 12 px line under the main column, joined by " · "
23. WHEN the user clicks anywhere on a Fila or Minhas solicitações row THEN the web SHALL open that ticket, and the ticket number SHALL be a link reachable by keyboard
24. IF a list is empty THEN the web SHALL show today's empty text in a single centred row spanning every column
25. The web SHALL put each row's actions in a menu opened by a button named "Ações de <nome>" (Usuários: `nome`; Artigos: título da versão; Documentos: `titulo`), offering exactly the actions shown on that row today under the same conditions, with "Desativar" and "Arquivar" styled destructive; and IF a row has no action THEN the web SHALL render no menu button on it
26. WHILE `main` is narrower than 896 px Cadastros SHALL replace the tabs with a select named "Cadastro" holding the same options, and changing it SHALL show that tab's table
27. The "Novo" buttons, the confirmation dialogs and the editors SHALL behave as today

**Independent test:** a 360 px, a Fila mostra Número, Título e Estado, com "categoria · responsável · dias" embaixo do título; em Usuários, "Ações de Ana" abre Editar e Desativar.

### S5: Detalhe, Assistente e acesso (P2)

As telas de conversa e de acesso seguem o mesmo molde.

**Acceptance Criteria**

28. WHILE `main` is at least 1024 px wide the ticket detail SHALL show 2 columns: the ticket, transcript, messages and reply on the left, and on the right a 320 px column (±1) with an "Ações" card holding the action buttons and forms, followed by the history card
29. WHILE `main` is narrower than 1024 px the ticket detail SHALL show one column in today's order
30. The ticket title SHALL be an `h2` inside the content, and the ticket number SHALL be the header `h1`
31. The Assistente SHALL keep its column centred at up to 768 px of width, with the composer fixed at the bottom as today
32. The Login, Primeiro acesso, Definir senha and root screens SHALL centre their card at up to 384 px wide, horizontally and vertically, inside a `min-h-svh` area

**Independent test:** a 1440 px, o detalhe de um chamado da fila mostra Ações à direita; a 360 px, a ordem de hoje; o login fica no centro da janela.

### S0: Invariantes (P1)

33. The web SHALL send the same API requests as before this feature (the existing suites stay green with no assertion weakened beyond the rewrites in `## Impact`)
34. The web SHALL show no visible text beyond today's screens plus the texts marked *(novo)* in `## Screens`
35. The four themes (Claro, Escuro, Preto, Sistema) SHALL keep their existing tokens, and the new sidebar tokens SHALL give link text a contrast of at least 4.5:1 against `--sidebar` in each theme

## Out of scope

| Excluded | Why |
| --- | --- |
| tela inicial "Dashboard" por papel | o template tem uma; o One abre direto na tela do papel. Seria capacidade nova |
| selos de tendência (+12,5%) nos cartões | exigem o período anterior na API |
| gráfico de área por dia, com os botões 7d/30d/90d | a API não devolve série temporal |
| arrastar linhas, escolher colunas, seleção por checkbox, paginação | não pedidos; as listas de hoje também não paginam |
| "Quick Create", busca e links secundários da barra | o One não tem esses destinos |
| foto do usuário | a API não tem foto; o botão usa as iniciais |
| mudar cores, fonte ou temas | AD-027 continua; o template muda o arranjo, não a paleta |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| barra lateral | `sidebar` do shadcn, `collapsible="icon"` | resposta do usuário em 03/11 | y |
| listas no celular | tabela que esconde colunas, com a linha de detalhe embaixo | resposta do usuário em 03/11 | y |
| variante | `variant="sidebar"` (borda, sem o cartão "inset") | é a do `page.tsx` do endereço que o usuário passou | n |
| larguras | 256 px aberta, 48 px recolhida, 288 px no celular, quebra a 768 px | padrões do componente e do template; mudar exige editar o `ui/` copiado | n |
| quatro destaques de Indicadores | principal, abertos agora, autoatendimento, 1ª resposta | o indicador principal é a meta do projeto; os outros três são o que o atendente e o administrador acompanham no dia | n |
| segunda linha do botão do usuário | o papel | a API não manda o e-mail no `/me`; o CPF mascarado não diz nada a quem lê | n |
| Ctrl+B | fica, como no componente | vem com o `sidebar` e o editor de artigos (Tiptap só texto) não usa negrito | n |
| perfil do tlc-spec-lean | `ui` | tela binding, como as três features de interface anteriores | n |
| quando | logo depois desta aprovação, antes do congelamento de 17/11 | a banca é em 20/11 e esta é a cara do app | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen casca | empty state | n/a - todo papel tem ao menos um grupo (AD-028 AC 2) |
| screen casca | loading, error, unauthorised | existing - `Spinner` e `Navigate` de `Autenticado`, sem barra |
| screen casca | density and ordering | AC 1, AC 8, `## Screens` |
| screen casca | destructive action confirms | existing - "Sair" não confirma, como hoje |
| screen Indicadores | empty, error, loading | AC 20 |
| screen Indicadores | density and ordering | AC 16, AC 17, AC 18, AC 19 |
| screens de lista | empty state | AC 24 |
| screens de lista | loading, error | existing - `Situacao` (Spinner) e `ErroDe` acima da tabela |
| screens de lista | unauthorised | existing - a API devolve 403 e a tela mostra o erro; o link não aparece para o papel |
| screens de lista | density and ordering | AC 21, AC 22, a ordem de cada lista vem da API como hoje |
| screens de lista | destructive action confirms | existing - `Confirmar` de Desativar e `ConfirmarArquivar`; AC 27 |
| screen Detalhe | empty, loading, error | existing - `Alert` e `Carregando` de `ChamadoDetalhe` |
| screen Detalhe | density and ordering | AC 28, AC 29 |
| screen Detalhe | destructive action confirms | existing - diálogos de encaminhar e cancelar |
| screens de acesso | estados | existing - erros e Spinner de hoje; AC 32 só muda a posição |
| todas | responsividade | AC 13, AC 14, AC 15 |

## Sources

- Pedido do usuário de 03/11 e as respostas "Adotar o sidebar" e "Tabela que esconde colunas" - definem o escopo, a casca e as listas
- shadcn/ui `apps/v4/app/(app)/examples/dashboard` (`page.tsx`, `site-header.tsx`, `app-sidebar.tsx`, `section-cards.tsx`, `data-table.tsx`), lidos em 03/11 - arranjo binding
- AD-027 e AD-028 (`.specs/STATE.md`) - tokens e grupos que continuam
