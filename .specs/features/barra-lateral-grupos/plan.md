# Barra lateral: recolher, agrupar os links e mostrar o nome do usuário

## Problem

A barra lateral da `redesign-institucional` (AD-027, door 3a) mostra os 9 links do administrador numa
lista única, sem divisão entre atender, manter a base de conhecimento e administrar. Ela ocupa 240 px
fixos em qualquer largura a partir de 1024 px, o que tira espaço da tabela de Indicadores e do detalhe
do chamado em telas de 1024 a 1280 px. E nada na tela diz quem está conectado: a pessoa só descobre
com que conta entrou pelo menu que aparece.

Quem paga: o administrador e o atendente, que navegam por 9 links sem grupo e não veem o próprio
nome; quem usa notebook de 1024 a 1366 px. Evidência: o pedido do usuário de 03/11 e as capturas das
telas a 1280 px (`telas/*.png`); não há medida de uso.

**O que muda quando isto estiver pronto:** os links aparecem sob "Atendimento", "Conhecimento" e
"Administração" (na barra e na gaveta); o nome do usuário fica no rodapé da barra, acima de "Tema" e
"Sair", e no topo da gaveta; a partir de 1024 px um botão recolhe a barra para 64 px, só com os ícones,
e a escolha fica gravada no aparelho.

## Flow

Reusa o `<nav>` único de `Autenticado` (door 3a), os `Links` e a lista `Menu` (que ganha o grupo),
a gaveta Vaul abaixo de 1024 px e o padrão de gravar preferência no `localStorage` do `one-tema`.

1. `/api/auth/me` (exists) - já devolve `nome`; nada muda na API
2. `Autenticado` (exists) - `Menu` ganha o grupo de cada link; `Links` desenha um título por grupo que tem link visível para o papel; o nome entra no rodapé da barra e no topo da gaveta
3. `Autenticado` (exists) - guarda `recolhida` em estado React lido de `localStorage['one-barra']` (door 1) e marca o `<nav>` com `data-recolhida`; as classes de largura, rótulo e título reagem a ele pela variante `recolhida:` declarada em `web/src/index.css` (exists) com `@custom-variant` (a partir de 1024 px, dentro de `[data-recolhida="true"]`); a transição de largura só vale depois de o usuário alternar, para redimensionar a janela não animar
4. `web/src/ui/tooltip.tsx` (new, no door - shadcn copiado na pasta `ui/` já aceita pelo AD-023) - mostra o rótulo de cada link quando a barra está recolhida
5. out: nenhuma requisição nova

## Impact

| Front | What changes |
| --- | --- |
| decisões | AD-027 rejeitou o `sidebar` do shadcn porque "recolher em ícones, que ninguém pediu"; agora foi pedido. A rejeição continua pelo outro motivo (door 2), e um AD novo registra grupos, recolher e nome |
| ordem dos links | "Indicadores" passa de 6º para 4º (fim do grupo Atendimento); a gaveta e o e2e que comparam a lista na ordem (`e2e/arranjo.spec.ts` constante `Links`, "abaixo de 1024 px sem barra lateral", "cabeçalho a 360 px abre a gaveta Menu") são reescritos para a ordem nova |
| testes de texto | `src/acesso/textos.test.tsx` "textos cabeçalho" ganha "Atendimento", "Conhecimento", "Administração" e o nome do fixture |
| `redesign-institucional` C8 | "links um por linha na mesma coluna" continua; os títulos de grupo entram entre eles |
| domain | termo novo: grupo do link (`Atendimento`, `Conhecimento`, `Administração`), só no `web/` |
| stored data | `localStorage['one-barra']` novo; quem nunca recolheu não tem a chave e vê a barra aberta |

## Relations

None - no stored-data shape change (o `localStorage` é do navegador e está na door 1).

## Surface

None - nothing consumed outside.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. preferência gravada no navegador | `localStorage['one-barra'] ∈ {'recolhida', 'aberta'}`; chave ausente = aberta | guardar no servidor por usuário: rota e coluna novas para uma preferência de aparelho; o tema já é por aparelho |
| 2. recolher sem trocar o `<nav>` | o mesmo `<nav>` de `Autenticado` com `data-recolhida="true"`: `lg:w-16` no lugar de `lg:w-60`, rótulos e títulos em `sr-only`, `main` com `lg:ps-16` | o `sidebar` do shadcn (`SidebarProvider`, `collapsible="icon"`): trocaria a gaveta Vaul pelo `Sheet` dele e o `<nav>` único por um layout com dois elementos, reescrevendo os ~20 testes que a door 3a evitou; ~700 linhas e 4 arquivos para o que aqui são classes |

- Nothing else in this change is hard to reverse: os nomes dos grupos e a ordem são texto e lista em `Autenticado`.

## Screens

Fonte **binding**: as respostas do usuário de 03/11 ("Por assunto", e o pedido de recolher e de mostrar
o nome) e esta tabela. Só a linha 0 (`Autenticado`) muda; as outras telas só ganham ou perdem largura.

| Estado | Texto | Arranjo |
| --- | --- | --- |
| barra aberta (a partir de 1024 px) | títulos de grupo "Atendimento", "Conhecimento", "Administração" *(novos)*; o nome do usuário *(novo, do `/me`)*; botão "Recolher barra lateral" (nome acessível, ícone `PanelLeftClose`) *(novo)* | 240 px. No topo: marca à esquerda e o botão de recolher à direita na mesma linha; a instituição embaixo. Grupos na ordem acima, cada um com o título (`text-xs font-medium text-muted-foreground`, 24 px de espaço antes, menos o primeiro) e os seus links: Atendimento = Assistente, Minhas solicitações, Fila, Indicadores; Conhecimento = Artigos, Documentos; Administração = Usuários, Matrículas, Cadastros. Grupo sem link para o papel não aparece (o aluno vê só Atendimento). No rodapé, acima da linha de Tema e Sair, o nome do usuário numa linha, truncado com reticências |
| barra recolhida (a partir de 1024 px) | botão "Expandir barra lateral" (nome acessível, ícone `PanelLeftOpen`) *(novo)*; ao focar ou passar o mouse num link, a dica com o rótulo *(novo)* | 64 px. Marca e botão de expandir empilhados no topo; instituição, títulos de grupo, rótulos dos links, texto dos avisos e o nome em `sr-only` (o nome acessível dos links não muda); uma linha fina entre grupos no lugar do título; ícones centralizados, um por linha de 36 px; no rodapé as iniciais do usuário (até 2 letras) num círculo de 32 px com o nome na dica, depois Tema e Sair só com ícone, um por linha. O conteúdo começa a 64 px |
| gaveta (abaixo de 1024 px) | o nome do usuário abaixo do título "Menu" *(novo)*; os mesmos títulos de grupo | como hoje, com o título de cada grupo antes dos seus links (linha de 32 px, `text-xs`) e o nome em `text-sm text-muted-foreground` abaixo de "Menu". Sem botão de recolher |
| barra de topo (abaixo de 1024 px) | igual | igual - sem nome (não cabe a 360 px) |

## Criteria

### S1: Grupos (P1)

Os links aparecem divididos por assunto, na barra e na gaveta.

**Acceptance Criteria**

1. The web SHALL render the links under the headings "Atendimento" (Assistente, Minhas solicitações, Fila, Indicadores), "Conhecimento" (Artigos, Documentos) and "Administração" (Usuários, Matrículas, Cadastros), in this order, both in the sidebar and in the drawer
2. IF none of a group's links is visible for the user's roles THEN the web SHALL NOT render that group's heading
3. The web SHALL associate each group's links with its heading so that a screen reader announces the group name (`role="group"` with `aria-labelledby`, or a list labelled by the heading)

**Independent test:** administrador a 1280 px vê os 3 títulos com os links certos; aluno vê só "Atendimento".

### S2: Nome do usuário (P1)

Quem está conectado aparece na barra e na gaveta.

**Acceptance Criteria**

4. WHILE the sidebar is expanded the web SHALL show the user's `nome` from `/api/auth/me` above "Tema" and "Sair", in one line truncated with an ellipsis
5. WHEN the drawer opens THEN the web SHALL show the user's `nome` below the title "Menu"
6. WHILE the sidebar is collapsed the web SHALL show the user's initials (first letter of the first and of the last word of `nome`, uppercase; one letter when `nome` has one word) in a 32 px circle, with the full name in a tooltip and as the accessible name
7. WHILE the viewport is narrower than 1024 px the top bar SHALL NOT show the user's name

**Independent test:** "Ana Beatriz Souza" aparece no rodapé; recolhida, "AS"; na gaveta, abaixo de "Menu".

### S3: Recolher (P1)

A barra cede espaço ao conteúdo e lembra a escolha.

**Acceptance Criteria**

8. WHILE the viewport is at least 1024 px wide the web SHALL show a button named "Recolher barra lateral" with `aria-expanded="true"` at the top of the expanded sidebar
9. WHEN the user activates "Recolher barra lateral" THEN the sidebar SHALL become 64 px wide (±1), the content SHALL start at 64 px, and the button SHALL be named "Expandir barra lateral" with `aria-expanded="false"`
10. WHILE the sidebar is collapsed every link SHALL keep its accessible name and show only its icon, and the group headings, the institution and the link labels SHALL NOT be visible
11. WHEN a collapsed link receives keyboard focus or hover THEN the web SHALL show a tooltip with the link's label
12. WHEN the user collapses or expands the sidebar THEN the web SHALL store `recolhida` or `aberta` in `localStorage['one-barra']`, and on the next load SHALL start in that state
13. IF `localStorage['one-barra']` is absent or holds another value THEN the web SHALL start with the sidebar expanded
14. WHILE the viewport is narrower than 1024 px the web SHALL ignore `one-barra`: top bar and drawer as today, with no collapse button
15. WHILE the user prefers reduced motion the sidebar SHALL change width with no transition

**Independent test:** a 1280 px recolher, recarregar a página: continua recolhida; Tab até um link mostra a dica; expandir volta a 240 px.

### S0: Invariantes (P1)

16. The web SHALL send the same API requests as before this feature (the existing suites stay green with no assertion weakened beyond the rewrites in `## Impact`)
17. The web SHALL show no visible text beyond the `interface-nova` and `redesign-institucional` screens plus the texts marked *(novo)* in `## Screens`

## Out of scope

| Excluded | Why |
| --- | --- |
| atalho de teclado (Ctrl+B) para recolher | não pedido |
| recolher abaixo de 1024 px | lá a barra já é de topo com gaveta |
| papel, foto ou menu de conta sob o nome | não pedido; o nome é só leitura |
| grupos que abrem e fecham (acordeão) | 9 links cabem abertos |
| guardar a preferência no servidor | door 1 |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| grupos | por assunto: Atendimento, Conhecimento, Administração | resposta do usuário em 03/11 | y |
| estado inicial | aberta | é o que existe hoje; recolher é escolha | n |
| lugar do nome | rodapé da barra e topo da gaveta | padrão de painéis (conta junto de Sair); a barra de topo a 360 px não tem espaço | n |
| iniciais | primeira letra da primeira e da última palavra | "Ana Beatriz Souza" → "AS"; nomes com "de"/"da" no fim são raros | n |
| largura recolhida | 64 px | ícone de 16 px com área de toque de 36 px e margem | n |
| perfil do tlc-spec-lean | `ui` | tela binding | n |
| quando | depois do `historico-legivel`, antes do congelamento de 17/11 | o histórico pesa mais na banca | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen barra lateral | empty state | AC 2 - grupo sem link some; todo papel tem ao menos um grupo |
| screen barra lateral | loading, error, unauthorised | existing - `Spinner` e `Navigate` de `Autenticado`, sem barra |
| screen barra lateral | density and ordering | AC 1, `## Screens` |
| screen barra lateral | accessibility of the collapsed state | AC 3, AC 10, AC 11 |
| screen barra lateral | motion | AC 15 |
| screen barra lateral | persisted preference | AC 12, AC 13 |
| screen gaveta | groups and name | AC 1, AC 5 |
| copy | textos novos | AC 17, `## Screens` |
| API | error shape, versioning | n/a - nenhuma rota muda |

## Sources

- Respostas do usuário de 03/11/2026 ("Por assunto (Recomendado)") e o pedido de recolher e mostrar o nome - settle grupos e escopo
- `.specs/features/redesign-institucional/plan.md` door 3a e `## Screens` linha 0 - a barra que esta feature altera
