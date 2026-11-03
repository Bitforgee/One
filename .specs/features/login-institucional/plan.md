# Login institucional: as telas de entrada no molde do bloco login-02 do shadcn

## Problem

A tela de login do One é hoje um cartão de até 384 px centrado numa página vazia. O cartão traz o título
"One · Univag", os campos CPF e Senha, o botão "Entrar" e um link. A 1280 px o cartão ocupa 384 dos
1280 px da janela, e os outros 70% ficam em branco. Primeiro acesso e Criar senha repetem o mesmo
cartão. Nada na tela diz o que é o One nem para que serve. A instituição aparece só como um nome em
cinza ao lado da marca, no mesmo tamanho do título.

Quem paga: o aluno que chega pelo link da instituição e encontra um formulário genérico, sem nenhum
sinal de que está no atendimento da sua faculdade; e a banca de 20/11, que vê essa tela antes de
qualquer outra. Única evidência: o pedido do usuário de 03/11 ("está muito simples ... procure na
internet inspirações institucionais e modernas e aplique o shadcn"). Não há medida de uso.

**O que muda quando isto estiver pronto:** a partir de 1024 px, as três telas de entrada (Login,
Primeiro acesso e Criar senha) passam a ter duas colunas, como o bloco `login-02` do shadcn. À
esquerda fica o formulário, com a marca no topo. À direita, um painel institucional na cor da marca,
com uma frase e três itens sobre o atendimento. No Login, o nome da instituição vira o título grande da
tela. Abaixo de 1024 px fica só a coluna do formulário, com a marca no topo e o formulário centrado. A
raiz `/` e Trocar senha não mudam.

## Flow

Reusa `Formulario`, `Campo`, `Centro`, a consulta `['instituicao', slug]` do Login, o par marca
`GraduationCap` + "One" da barra lateral e os ícones Lucide do menu. Nenhum arquivo novo em `web/src/ui/`,
nenhuma requisição nova e nenhuma mudança na API.

single module - `web/src/acesso/Acesso.tsx` (exists): o `Cartao` das telas Login, Primeiro acesso e
Criar senha dá lugar à grade de duas colunas do `login-02` (door 1). `Login` continua a ler `nome` de
`GET /api/instituicoes/{slug}` (exists) e a postar em `/api/auth/login` (exists), como hoje. Os estados
de carregando e de "Instituição não encontrada." continuam em `Centro` (exists).

## Impact

| Front | What changes |
| --- | --- |
| layout-painel AC 32 e `## Screens` linha "Login, Primeiro acesso, Definir senha" | deixam de valer para essas 3 telas: o cartão de até 384 px centrado na janela vira a grade de duas colunas (door 1). Para a raiz `/` continuam valendo. Não se reabre a verificação da layout-painel |
| layout-painel C32 (e2e `telas de acesso centralizadas ${caminho}`) | os 3 casos `/univag`, `/univag/primeiro-acesso` e `/univag/definir-senha?token=t` são reescritos para `## Screens` deste plano: não há mais `[data-slot=card]`, e a 1280 px o formulário fica centrado na coluna da esquerda, não na janela. O caso `/` fica como está |
| layout-painel C46 (e2e `quebras medidas dos dois lados`) | a parte do acesso procura o ancestral `min-h-svh` do cartão. Passa a medir a coluna do formulário, com os mesmos valores (24 px a 360 px e 40 px a 768 px). As partes do cabeçalho e de Indicadores ficam como estão |
| layout-painel C39 e C50 (e2e `Trocar senha até 384 px`) | nada: Trocar senha não muda |
| e2e `arranjo telas de acesso` (interface-nova C66, mantido pela layout-painel) | o laço sobre as 3 telas, que mede o cartão em x = 24 a 360 px e a largura até 384 px a 1024 px, é reescrito. As partes da raiz e de Trocar senha ficam. `Login: campos empilhados e o erro abaixo do formulário`, `raiz com a marca e o texto centralizados` e `sem rolagem horizontal` ficam sem mudança e continuam provando |
| Vitest `acesso/textos.test.tsx` | `textos Login` perde o "·" e ganha os textos *(novo)* de `## Screens`, com o nome da instituição como texto do fixture. `textos Primeiro acesso` e `textos Criar senha` ganham os textos do painel. `textos raiz` e `textos Trocar senha` não mudam |
| Vitest que continuam | `login mostra o nome da instituição`, `slug desconhecido mostra Instituição não encontrada`, `erro mostra detail num Alert`, `requisição pendente mostra Spinner e desabilita o botão` e os de primeiro acesso e definir senha de `acesso.test.tsx`; `títulos de página` de `interface.test.ts` (o `h1` de `acesso/Acesso.tsx` mantém `text-2xl font-semibold tracking-tight`); `tokens da paleta` (nenhuma cor literal) |
| quando | o build só começa depois que a verificação final da layout-painel fechar, porque antes disso as provas C32 e C46 dela ficariam vermelhas sob o Verifier |
| decisões | AD-027 (tokens e temas) continua: o painel usa `--primary` a 5% e os tokens de texto. Na aprovação, uma AD nova registra a door 1 |
| domain | nothing - nenhum termo novo |
| stored data | nothing - nada gravado, nada a migrar |

## Relations

None - no stored-data shape change.

## Surface

None - nothing consumed outside: a API e as requisições das telas são as de hoje.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. arranjo das telas públicas por instituição (precedente para as próximas telas de entrada) | `<div className="grid min-h-svh lg:grid-cols-2">`; coluna do formulário `flex flex-col gap-4 p-6 md:p-10` com a linha da marca (`flex justify-center gap-2 md:justify-start`) e o corpo `flex flex-1 items-center justify-center` > `w-full max-w-xs`; painel `relative hidden lg:flex flex-col border-l bg-primary/5 p-10` com o conteúdo em `mt-auto max-w-md`. Usado por Login, Primeiro acesso e Criar senha; a raiz, Trocar senha e os estados carregando e erro do Login ficam em `Centro` | `login-04`: a coluna da imagem fica dentro de um cartão de até 896 px e precisa de uma foto que a API não tem; `login-03`: fundo `muted` com o mesmo cartão de 384 px que o usuário chamou de simples; painel à esquerda, como em `examples/authentication`: lá a marca fica dentro do painel, que some abaixo de 1024 px, e teria de ser repetida na coluna do formulário |

- Nothing else in this change is hard to reverse: os textos do painel, os ícones e as cores são texto e classes.

## Screens

Fonte **binding** do arranjo: o bloco `login-02` do shadcn (`page.tsx` e `components/login-form.tsx`,
lidos em 03/11). Dele vêm a grade, a coluna do formulário, a linha da marca, a largura de 320 px e o
painel à direita escondido abaixo de 1024 px. O preenchimento do painel vem do exemplo
`examples/authentication` do shadcn (`bg-primary/5`, conteúdo no fim com `mt-auto`), que é binding só
para isso. Esta tabela fecha o que os dois deixam aberto. Medidas em px CSS e larguras da **janela** (as
telas de acesso não têm barra lateral). Textos novos estão marcados *(novo)*. Todo texto que não aparece
na tabela continua como está hoje.

| Tela / estado | Texto | Arranjo |
| --- | --- | --- |
| grade (Login, Primeiro acesso, Criar senha), janela < 1024 px | — | uma coluna só, a do formulário, com altura mínima da janela (`min-h-svh`). O painel não é desenhado (`display: none`). Sem rolagem horizontal a 360, 390 e 768 px |
| grade, janela ≥ 1024 px | — | duas colunas de largura igual (metade da janela, ±1): o formulário à esquerda (x = 0) e o painel à direita (x = metade da janela). O painel vai do topo ao fim da página, com no mínimo a altura da janela. Sem rolagem horizontal a 1024, 1280 e 1440 px |
| coluna do formulário | — | recuo de 24 px nos quatro lados com janela < 768 px e de 40 px a partir de 768 px. De cima para baixo: a linha da marca, 16 px de espaço e o corpo, que ocupa o resto da altura |
| linha da marca | "One" (existe) | ícone `GraduationCap` de 24 px na cor `primary`, 8 px de espaço e "One" em 16 px peso 600 na cor `primary`, numa linha. Não é link. Com janela < 768 px fica centrada na horizontal da coluna (±1); a partir de 768 px, alinhada à esquerda, no recuo (x = 40, ±1). Topo em y = recuo (24 ou 40, ±1) |
| corpo | — | bloco de até 320 px de largura, centrado na horizontal da coluna (±1) e na vertical da área abaixo da marca (±1) quando é mais baixo que ela. Larguras do bloco e x: 312 px em x = 24 a 360 px; 320 px em x = 35 a 390 px; 320 px em x = 224 a 768 px; 320 px em x = 96 a 1024 px; 320 px em x = 160 a 1280 px; 320 px em x = 200 a 1440 px |
| cabeçalho do corpo, Login | `h1` com o `nome` da instituição (vem da API, hoje "One · Univag" no título); "Entre com seu CPF e sua senha." *(novo)* | texto centrado. `h1` em 24 px peso 600 `tracking-tight` (a classe de hoje), único `h1` da página; abaixo, a 4 px, a frase em 14 px na cor `muted-foreground`. 24 px entre o cabeçalho e o campo CPF |
| cabeçalho do corpo, Primeiro acesso e Criar senha | "Primeiro acesso", "Criar senha" (existem) | o `h1` no mesmo lugar e estilo do Login, sem frase abaixo. 24 px até o primeiro campo ou até o `Alert` de sucesso |
| formulário, Login | "CPF", "Senha", "Entrar", "Primeiro acesso ou esqueci minha senha", erro da API (existem) | como hoje: CPF, Senha e Entrar empilhados, com 24 px entre eles; "Entrar" com a largura do CPF (±1); o `Alert` de erro abaixo do formulário; o link centrado abaixo de "Entrar" (e do `Alert`, quando houver). Ordem do teclado: CPF, Senha, Entrar, link |
| formulário, Primeiro acesso e Criar senha | textos de hoje | como hoje, sem o cartão em volta: campos, dica, botão de largura total, `Alert` de sucesso no lugar do formulário, "Voltar para o login" centrado (só em Primeiro acesso) |
| painel (janela ≥ 1024 px) | "Atendimento ao estudante" *(novo)*; "Dúvidas, solicitações e respostas da sua instituição em um só lugar." *(novo)*; "Tire dúvidas com o assistente a qualquer hora" *(novo)*; "Acompanhe suas solicitações até a resposta" *(novo)*; "Fale com a equipe da instituição quando precisar" *(novo)* | fundo `primary` a 5% sobre o fundo da página (`bg-primary/5`), borda esquerda de 1 px em `--border`, recuo de 40 px. O conteúdo fica no fim do painel: a base da lista a 40 px do fim do painel (±1) quando a página não é mais alta que a janela. O bloco de texto começa em x = metade da janela + 41 (±1) e tem até 448 px de largura. De cima para baixo: "Atendimento ao estudante" em `h2` de 30 px peso 600 `tracking-tight` na cor `foreground`; a 8 px, a frase em 16 px `muted-foreground`; a 24 px, a lista de 3 itens, na ordem acima, com 16 px entre eles. Cada item tem um ícone de 20 px na cor `primary` (`MessageCircle`, `ListChecks`, `Users`, nessa ordem, com `aria-hidden`), 12 px de espaço e o texto em 16 px `foreground`. Nenhum elemento focável |
| Login carregando | — | como hoje: `Spinner` de 32 px centrado na janela (`Centro`), sem grade nem painel |
| Login, instituição não encontrada | "Instituição não encontrada." (existe) | como hoje: `Alert` centrado na janela (`Centro`), sem grade nem painel |
| temas | — | Claro, Escuro e Preto com os tokens da AD-027, sem cor literal. No painel, os textos em `foreground` e `muted-foreground` com contraste de no mínimo 4,5:1 sobre o fundo do painel nos 3 temas |
| raiz `/` e Trocar senha | textos de hoje | sem mudança (layout-painel C32 caso `/`, C39 e C50) |

## Criteria

### S1: Telas de entrada em duas colunas (P1)

A partir de 1024 px, o formulário fica à esquerda e o painel institucional à direita. Abaixo disso, só o
formulário.

**Acceptance Criteria**

1. WHILE the viewport is at least 1024 px wide the Login, Primeiro acesso and Criar senha screens SHALL show two columns each half the viewport wide (±1 px), the form column at x = 0 and the panel at x = half the viewport, the panel at least as tall as the viewport
2. WHILE the viewport is narrower than 1024 px those screens SHALL show only the form column, and the panel SHALL have `display: none`
3. The form column SHALL have 24 px padding on every side below a 768 px viewport and 40 px from 768 px
4. The brand row SHALL sit at the top of the form column with the `GraduationCap` icon at 24 px in `primary`, 8 px gap and "One" at 16 px weight 600 in `primary`, horizontally centred in the column (±1) below a 768 px viewport and at x = 40 (±1) from 768 px
5. The form block SHALL be at most 320 px wide, horizontally centred in the form column (±1), and vertically centred (±1) in the area below the brand row and its 16 px gap when it is shorter than that area, with the widths and x positions listed in `## Screens` at 360, 390, 768, 1024, 1280 and 1440 px
6. WHEN the Login has loaded the institution THEN the web SHALL show its `nome` as the page's only `h1` (24 px, weight 600, centred), followed 4 px below by "Entre com seu CPF e sua senha." at 14 px in `muted-foreground`, and 24 px below that the CPF field
7. The Primeiro acesso and Criar senha screens SHALL show their current `h1` ("Primeiro acesso", "Criar senha") in the Login's header position and style, with no description line, 24 px above the first field or the success `Alert`
8. The Login SHALL keep CPF, Senha and "Entrar" stacked 24 px apart, "Entrar" as wide as CPF (±1), the error `Alert` below the form, and the link "Primeiro acesso ou esqueci minha senha" centred below "Entrar"; keyboard focus SHALL move CPF, Senha, "Entrar", link in that order
9. The web SHALL NOT scroll horizontally on Login, Primeiro acesso and Criar senha at viewport widths 360, 390, 768, 1024, 1280 and 1440 px (`document.documentElement.scrollWidth` ≤ `innerWidth`)

**Independent test:** a 1280 px, `/univag` mostra o formulário centrado em x = 320 e o painel a partir de x = 640; a 360 px, só o formulário, com "One" centrado no topo.

### S2: Painel institucional (P1)

O painel diz o que é o One, sem foto e sem dado novo da API.

**Acceptance Criteria**

10. WHILE the viewport is at least 1024 px wide the panel SHALL have the `primary` token at 5% over the page background as its fill, a 1 px left border in `--border`, and 40 px padding
11. The panel SHALL show, top to bottom, "Atendimento ao estudante" as an `h2` at 30 px weight 600, then 8 px below "Dúvidas, solicitações e respostas da sua instituição em um só lugar." at 16 px in `muted-foreground`, then 24 px below a list of exactly 3 items 16 px apart: `MessageCircle` "Tire dúvidas com o assistente a qualquer hora", `ListChecks` "Acompanhe suas solicitações até a resposta", `Users` "Fale com a equipe da instituição quando precisar", each icon 20 px in `primary` and 12 px before 16 px text in `foreground`
12. WHILE the page is not taller than the viewport the panel content SHALL end 40 px (±1) above the panel's bottom edge, start at x = half the viewport + 41 (±1), and be at most 448 px wide
13. The panel icons SHALL carry `aria-hidden="true"` and the panel SHALL contain no focusable element
14. The panel texts SHALL have a contrast of at least 4.5:1 against the panel fill in Claro, Escuro and Preto

**Independent test:** a 1440 px nos temas Claro e Preto, o painel mostra o título, a frase e os três itens no fim, a 40 px da base.

### S0: Invariantes (P1)

15. IF the institution request fails THEN the Login SHALL show "Instituição não encontrada." centred in the viewport, as today, with no grid and no panel; and WHILE the request is pending the Login SHALL show today's centred `Spinner` with no grid and no panel
16. The root `/` and Trocar senha screens SHALL keep their current arrangement
17. The web SHALL send the same API requests as before this feature on every access screen
18. The web SHALL show no visible text on Login, Primeiro acesso and Criar senha beyond today's texts minus the "·" of the Login title, plus the texts marked *(novo)* in `## Screens`
19. The access screens SHALL use no literal colour, and the AD-027 tokens SHALL stay unchanged in the three themes

## Out of scope

| Excluded | Why |
| --- | --- |
| logo, foto ou cor própria da instituição | a API devolve só `nome` (`VerInstituicao.Resposta(string Nome)`); exigiria campo novo, envio de arquivo e cadastro por instituição |
| botão "mostrar senha" | recomendado pelo USWDS e pelo Authgear, mas é comportamento novo; o pedido é visual |
| "Entrar com gov.br" ou outro login social, e o separador "Ou continue com" dos blocos | o One só entra com CPF e senha (AD-009) |
| "Lembrar de mim" | muda a duração do cookie de autenticação, não o visual |
| rodapé com termos de uso e privacidade | o One não tem essas páginas |
| controle de tema nas telas de acesso | não pedido; o tema segue o sistema ou a escolha gravada, como hoje |
| copiar `field.tsx` do shadcn | `Campo` já desenha rótulo, campo e dica com o mesmo arranjo; seria um arquivo novo em `ui/` sem efeito visível |
| mudar a raiz `/` e Trocar senha | a raiz não tem instituição, e Trocar senha fica dentro do painel autenticado |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| escopo | Login, Primeiro acesso e Criar senha com a mesma grade; raiz e Trocar senha como estão | as três são o mesmo fluxo de entrada; trocar de molde entre o login e o primeiro acesso pareceria outro site | y (usuário, 03/11) |
| fonte binding | bloco `login-02` (duas colunas, painel à direita, formulário de 320 px) | é o bloco do shadcn com painel; não precisa do cartão que o usuário achou simples | y (plano aprovado pelo usuário, 03/11) |
| conteúdo do painel | sem foto: fundo `primary/5` (do `examples/authentication`), título, frase e 3 itens com os ícones do menu | a API não tem imagem; o Carbon pede conteúdo extra mínimo e fácil de ler ao lado do login | y (usuário, 03/11: título, frase e 3 itens; textos revisados na revisão do plano) |
| textos novos | os 6 marcados *(novo)*, voltados ao aluno | o One é atendimento ao estudante; atendente e administrador também entram por aqui e leem o mesmo texto | y (usuário, 03/11) |
| título do Login | o nome da instituição vira o `h1`; "One" fica na linha da marca | a instituição é quem o aluno reconhece; o "One · Univag" de hoje deixa a instituição em cinza | y (plano aprovado pelo usuário, 03/11) |
| marca | `GraduationCap` + "One", como no topo da barra lateral | marca provisória da AD-027; nenhum logo novo | y (plano aprovado pelo usuário, 03/11) |
| carregando e erro da instituição | continuam em `Centro`, sem painel | sem instituição não há o que mostrar ao lado; é o comportamento de hoje | y (plano aprovado pelo usuário, 03/11) |
| perfil do tlc-spec-lean | `ui` | tela binding, como as features de interface anteriores | y (plano aprovado pelo usuário, 03/11) |
| quando | depois que a verificação da layout-painel fechar, antes do congelamento de 17/11 | as provas C32 e C46 dela medem as telas que mudam aqui | y (layout-painel PASS rodada 4 em 8d9ffcf, 03/11) |

**Open questions:** none - all resolved or logged above. Respondidas pelo usuário em 03/11: (1) escopo: Login, Primeiro acesso e Criar senha; (2) painel: título, frase e 3 itens; (3) logo e imagem por instituição ficam fora, numa feature própria depois da banca (ver `## Out of scope`).

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen Login | empty state | n/a - não há lista nem dado que possa faltar além da instituição (AC 15) |
| screen Login | loading state | AC 15 |
| screen Login | error state (instituição) | AC 15 |
| screen Login | error state (CPF ou senha recusados) | AC 8 - o `Alert` com o `detail` da API, como hoje |
| screen Login | unauthorised | n/a - tela pública |
| screen Login | density and ordering | AC 4, AC 5, AC 6, AC 8 |
| screen Login | destructive action confirms | n/a - nenhuma ação destrutiva |
| screen Primeiro acesso | estados (sucesso, erro, enviando) | existing - `Alert` com a mensagem da API no lugar do formulário, `Alert` de erro e `Spinner` no botão; AC 7 só muda a posição |
| screen Criar senha | estados (sucesso, token inválido, enviando) | existing - "Senha criada." com o link, `Alert` com o erro da API e `Spinner` no botão; AC 7 só muda a posição |
| screens de acesso | responsividade | AC 1, AC 2, AC 3, AC 5, AC 9 |
| screens de acesso | temas e contraste | AC 14, AC 19 |
| painel | conteúdo e ordem | AC 11, AC 12 |
| painel | teclado e leitor de tela | AC 13; abaixo de 1024 px o painel tem `display: none` (AC 2) e sai da árvore de acessibilidade |
| copy do painel | tom, profundidade e o que o leitor faz depois | AC 11 - frases curtas sobre o que o aluno encontra; a ação seguinte é o formulário ao lado |

## Sources

- Pedido do usuário de 03/11 ("está muito simples ... inspirações institucionais e modernas ... aplique o shadcn") - define o escopo visual
- **Binding (arranjo):** bloco `login-02` do shadcn, https://ui.shadcn.com/blocks/login e o código em https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/blocks/login-02/page.tsx e `.../login-02/components/login-form.tsx`, lidos em 03/11
- **Binding (só o preenchimento do painel):** exemplo `authentication` do shadcn, https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/app/(app)/examples/authentication/page.tsx, lido em 03/11
- Inspiração, não binding: blocos `login-01`, `login-03`, `login-04` e `login-05` (mesmo diretório do registro); Carbon, padrão de login (https://carbondesignsystem.com/patterns/login-pattern/: conteúdo extra separado do login, mínimo e fácil de ler); USWDS, formulário de entrada (https://designsystem.digital.gov/templates/form-templates/sign-in-form/: pouco texto em volta do formulário); Microsoft Entra, marca da organização na tela de entrada (https://learn.microsoft.com/en-us/entra/fundamentals/how-to-customize-branding: modelo de fundo parcial); Authgear (https://www.authgear.com/post/login-signup-ux-guide/: rótulos visíveis, `autocomplete`, spinner no botão); documentação do `Field` do shadcn via Context7 (https://ui.shadcn.com/docs/components/radix/field)
- AD-009, AD-027 e AD-029 (`.specs/STATE.md`) e `layout-painel/plan.md` `## Screens` - o que continua e o que este plano substitui
