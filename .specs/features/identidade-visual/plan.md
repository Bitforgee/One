# Identidade visual sem cara de modelo

## Problem

Numa avaliação de 05/11/2026, o One recebeu nota 4 de 10 em "parece feito por IA ou modelo pronto". Os sinais apontados,
cada um ligado a uma fonte em `pesquisa.md` (e em `../revisao-ux/pesquisa.md`):
- **Fonte:** é Inter em tudo. A Anthropic põe a Inter na lista "Never use" dos visuais que convergem para o padrão.
- **Caixas:** os componentes do shadcn aparecem crus, com cartões de borda fina em todo bloco e o mesmo raio em tudo.
  Borda demais deixa a tela "busy and cluttered" (Refactoring UI).
- **Indicadores:** são 13 caixas iguais para métricas de pesos diferentes. O número mais importante deveria ter "the
  largest area" (Carbon).
- **Login:** é o bloco `login-02` do shadcn quase intacto, um split 50/50 com gradiente e formas abstratas quando a
  instituição não tem foto. O GOV.UK pede para evitar imagem decorativa.
- **Ilustrações:** as ilustrações próprias dos estados vazios (prédio, caixa, documento, pessoas) são genéricas. GOV.UK,
  Carbon e GitHub Primer usam ícone e texto e guardam a ilustração para o que é físico.
- **Assistente:** a boas-vindas é o roteiro padrão de chatbot, "Olá! Eu sou X." com avatar de letra e sugestões em
  pílulas. A NN/g diz que sugestões genéricas raramente funcionam.

Quem paga é a instituição, que compra um atendimento com a cara dela e recebe uma tela que parece um modelo, e o aluno,
que confia menos num serviço com aparência genérica. O pedido é do usuário, em 05/11/2026, depois da avaliação.

Depois desta feature:
- **Letra:** o texto usa Public Sans (a fonte do design system do governo dos EUA) e os títulos usam Source Serif 4, com
  tom acadêmico. Decisão do usuário com a prévia lado a lado.
- **Blocos:** o conteúdo estático se separa por espaço e título, e não por caixa. O raio varia pelo papel do componente.
- **Indicadores:** um número principal grande com a comparação ao período anterior, e o resto como lista.
- **Login:** sem foto, é uma coluna única centrada com o logo. Com foto da instituição, usa a foto.
- **Assistente:** abre com um título institucional, a solicitação em aberto do aluno e as perguntas em linhas de tarefa.
- **Estados vazios:** ícone, frase e botão. Decisão do usuário: ícones no lugar das ilustrações.

## Flow

`single module - web/` (sem mudança de API). Reaproveita os tokens de `index.css`, a aparência da instituição que
`GET /api/instituicoes/{slug}` já devolve (AD-032), `GET /api/indicadores?de=&ate=` (exists) chamada também para o
período anterior, `GET /api/chamados` (exists) para a solicitação em aberto do aluno, e os componentes `Tabela.tsx`,
`Acesso.tsx`, `Assistente.tsx`, `Indicadores.tsx` (exist).

1. `main.tsx` e `index.css` (exist): trocam a Inter pelas duas fontes novas (door 1) e definem a escala de raios (door 2).
2. `Acesso.tsx` (exists): login em coluna única sem foto, e foto quando a instituição tem (door 3).
3. `Assistente.tsx` (exists): boas-vindas institucional, solicitação em aberto e perguntas em linhas.
4. `Indicadores.tsx` (exists): número principal com comparação, destaques em faixa, o resto em lista.
5. `Tabela.tsx` e as telas com estado vazio (exist): ícone no lugar da ilustração (door 4).
6. `ChamadoDetalhe.tsx` (exists), `Conta.tsx` (exists), `Aparencia.tsx` (exists) e `PreviaAparencia.tsx` (exists): blocos estáticos sem caixa; a
   prévia acompanha o login e as boas-vindas novos.

## Impact

| Front | What changes |
| --- | --- |
| dependência | sai `@fontsource-variable/inter` e entram `@fontsource-variable/public-sans` e `@fontsource-variable/source-serif-4` (OFL-1.1, ~78 KB latin, contra ~73 KB hoje) |
| tokens | `--font-sans` passa a Public Sans; `--font-heading` (novo) é Source Serif 4; `--radius` único vira uma escala por papel (door 2) |
| decisão | supera a AD-032 door 9 (ilustrações próprias) e a door de arranjo do login da AD-030 (split `login-02`) e da AD-032 (painel com imagem ou ilustração). Os campos de aparência (textos do login, nome, foto, boas-vindas e perguntas do assistente) continuam e mudam só de lugar na tela |
| testes | muitos testes de arranjo e de tela medem o que muda: Inter fixada (`ux.test.tsx:160-161`, `interface.test.ts:180`), ilustrações (`aparencia-instituicao` C40, C41, C47 a C50), split do login (AD-030), "Olá! Eu sou" (C41), caixas de Indicadores. A lista fechada fica em `checks.md` |
| PWA | o precache passa a ter os arquivos das fontes novas em vez da Inter |
| stored data | nada |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside; nenhuma rota muda

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. Fontes | `@fontsource-variable/public-sans` (`'Public Sans Variable'`) em todo texto e controle, e `@fontsource-variable/source-serif-4` (`'Source Serif 4 Variable'`, arquivo `wght`) só em `h1`/`h2` de conteúdo com 20 px ou mais, no número principal de Indicadores, no nome da instituição no login e no título das boas-vindas; botão, campo, tabela, etiqueta, menu e a barra do topo ficam em sans | Inter com o eixo `opsz`: é a mesma família, e a pesquisa a cita como sinal de modelo pronto. Só Public Sans: muda menos o visual. IBM Plex Sans: carrega a identidade da IBM (decisão do usuário em 05/11 com a prévia) |
| 2. Escala de raios | `--radius-xs` 4 px (campo e linha de lista: a linha de pergunta do Assistente, o item de menu e o item da barra lateral; as linhas de Fila e Minhas solicitações ficam com 0, como na `revisao-ux` C29), `--radius-sm` 6 px (botão, inclusive "Falar com atendente" e os botões de link da resposta), `--radius-md` 12 px (painel e cartão que sobrar), `--radius-lg` 16 px (`Dialog`, `Sheet`, menu); `rounded-full` só em avatar e foto, nos botões só de ícone circulares ("Enviar", avisos e "Tema"), nos selos de estado e nos números dos passos de Matrículas (decisão do orquestrador em 05/11, com o plano aprovado pelo usuário) | um raio único de 0,625 rem em tudo: é o padrão do shadcn que a pesquisa aponta (Material 3 usa 4/8/12/16/28) |
| 3. Login | sem `imagens.login`: coluna única centrada (até 400 px) sobre o fundo, com o logo (ou as iniciais), o nome em serifa, "Entre com seu CPF e sua senha." logo abaixo do nome (no Login), o título e a frase do login, o formulário e, abaixo, os itens do login como lista discreta; com `imagens.login`: a foto ocupa o painel ao lado do formulário a partir de 1024 px e a faixa do topo abaixo disso, sem gradiente decorativo nem formas | manter o split 50/50 com ilustração quando não há foto: é o bloco `login-02` cru e imagem decorativa (GOV.UK) |
| 4. Estados vazios | ícone lucide de 28 px em `text-muted-foreground`, uma frase e o botão de ação; `web/src/ilustracoes/` sai, com exceção de uma ilustração `Planilha` só no guia de Matrículas (mostra o cabeçalho do CSV) | manter as 6 ilustrações (decisão do usuário em 05/11: trocar por ícones) |

- Nada mais é difícil de reverter: textos, espaçamentos e o arranjo de Indicadores são constantes do `web/`

## Screens

- **Login sem foto (≥ 1024 px e < 1024 px):** uma coluna centrada de até 400 px:
  1. o logo (até 48 px) ou as iniciais;
  2. o nome da instituição em serifa (28 px);
  3. logo abaixo do nome, o texto de apoio "Entre com seu CPF e sua senha.";
  4. o título e a frase do login da Aparência (ou os de hoje), em texto secundário;
  5. o formulário (CPF, Senha, Entrar e "Primeiro acesso ou esqueci minha senha");
  6. os itens do login como lista de até 3 linhas com marcador discreto (o `::marker` na cor de
     `--muted-foreground`), abaixo do formulário.

  Não há painel lateral nem ilustração. O fundo é o `--background` tingido. (Item 3 e o valor do marcador: decisão do
  orquestrador em 05/11, com o plano aprovado pelo usuário.)
- **Primeiro acesso e Criar senha:** a mesma coluna, sem o item 3; o título da tela ("Primeiro acesso" ou "Criar
  senha") fica entre a frase do login e o primeiro campo (decisão do orquestrador em 05/11, com o plano aprovado pelo
  usuário).
- **Login com foto:** a partir de 1024 px, o formulário fica na coluna da esquerda, como na coluna única, e a foto ocupa
  a coluna da direita inteira, sem gradiente e sem texto sobre ela. Abaixo de 1024 px, a foto vira uma faixa de 160 px
  acima do formulário.
- **Assistente sem conversa:**
  - no topo, à esquerda, um título em serifa (24 px), "Atendimento ao estudante · {nomeCurto ou nome}";
  - abaixo do título, a frase de boas-vindas da Aparência (ou "Respostas com base nas normas da instituição.");
  - a foto do assistente (32 px), quando há, ao lado do nome do assistente em texto pequeno ("Vagner, assistente
    virtual"; sem nome, "Assistente virtual"). Não há mais "Olá! Eu sou…". (Título e texto sem nome: decisão do
    orquestrador em 05/11, com o plano aprovado pelo usuário.);
  - se o aluno tem uma solicitação em `ABERTO`, `EM_ATENDIMENTO` ou `AGUARDANDO_ALUNO`, uma linha com borda à esquerda
    na cor de ação: "Sua solicitação {número} · {estado}" e o próximo passo, como link para o detalhe. Ela vem antes das
    perguntas;
  - as perguntas sugeridas em uma lista de linhas de 48 px, com divisória, ícone `MessageCircleQuestion` à esquerda e
    `ChevronRight` à direita. Não são mais pílulas.
- **Indicadores:**
  - no topo, o "Indicador principal": o rótulo, o número em serifa (40 px, `tabular-nums`) e, ao lado, a variação
    contra o período anterior de mesmo tamanho ("▲ 4,2 pts" ou "▼ 1,0 pt", com a palavra "vs. período anterior");
  - abaixo, os outros 3 destaques numa faixa de 3 colunas (1 coluna quando a área de conteúdo, o contêiner `main`,
    mede menos de 768 px), separados por divisória vertical, sem caixa;
  - abaixo, as outras 9 métricas numa lista de 2 colunas (1 quando o contêiner `main` mede menos de 768 px): rótulo à
    esquerda e valor tabular à direita, com divisória fina entre as linhas, sem caixa. As colunas seguem a largura do
    `main`, como na `layout-painel` door 5 (decisão do orquestrador em 05/11, com o plano aprovado pelo usuário);
  - abaixo, os dois gráficos, sem cartão em volta, cada um com o seu título.
- **Detalhe do chamado e Aparência:** os blocos de conteúdo estático (os dados do aluno e o Histórico no detalhe, as
  seções da Aparência) perdem a borda e o fundo de cartão; separam-se por espaço de 32 px e por um título de seção
  ("Dados do aluno" e "Histórico" no detalhe). Só o bloco que pede ação (a resposta, o resumo gerado por IA) mantém um
  fundo tingido. A Conta fica como está, uma lista agrupada com borda (padrão de lista de ajustes). (Decisão do
  orquestrador em 05/11, com o plano aprovado pelo usuário.)
- **Estados vazios (6 listas, Indicadores sem dados):** um ícone de 28 px, o título de hoje, a frase e o botão,
  centrados na largura da lista (o título fica: decisão do orquestrador em 05/11, com o plano aprovado pelo usuário).
- **Matrículas:** o passo 2 ganha a ilustração `Planilha`, que mostra as colunas do CSV como uma linha de planilha.
- **Raiz `/`:** o nome "One" em serifa, a frase e o texto de como entrar, sem ilustração.

## Criteria

### S1: Fontes e raios (P1)

**Acceptance Criteria**

1. The system SHALL usar `'Public Sans Variable'` como `font-family` de `body`, botões, campos, tabelas, etiquetas, menus e da barra do topo, e não SHALL carregar nenhum arquivo da Inter
2. The system SHALL usar `'Source Serif 4 Variable'` só nos títulos de conteúdo de 20 px ou mais, no número principal de Indicadores, no nome da instituição no login e no título das boas-vindas; nenhum botão, campo, célula de tabela, etiqueta ou item de menu SHALL usar serifa
3. The system SHALL dar raio de 4 px a campos e linhas de lista (linha de pergunta do Assistente, item de menu, item da barra lateral), 6 px a botões, 12 px a painéis e 16 px a `Dialog`, `Sheet` e menus, e SHALL usar `rounded-full` só em avatar e foto, nos botões só de ícone circulares ("Enviar", avisos e "Tema"), nos selos de estado e nos números dos passos de Matrículas
4. The system SHALL incluir os arquivos `woff2` latin das duas fontes no precache do PWA e somar no máximo 90 KB entre eles

### S2: Login com a cara da instituição (P1)

5. WHERE a instituição não tem imagem de login, as telas de acesso SHALL mostrar uma coluna única centrada de até 400 px, sem painel lateral, sem ilustração e sem gradiente, com o logo (ou as iniciais), o nome em serifa, no Login o texto "Entre com seu CPF e sua senha." logo abaixo do nome, o título e a frase do login, em Primeiro acesso e Criar senha o título da tela antes do primeiro campo, o formulário e os itens do login abaixo dele
6. WHERE a instituição tem imagem de login, a partir de 1024 px a foto SHALL ocupar a coluna direita inteira sem gradiente nem texto sobre ela, e abaixo de 1024 px SHALL ser uma faixa de 160 px acima do formulário
7. The system SHALL manter os textos do login da Aparência (título, frase, itens) e o logo nas duas formas do login

### S3: Assistente que não parece chatbot de prateleira (P1)

8. WHILE o aluno não tem conversa, o Assistente SHALL mostrar o título em serifa "Atendimento ao estudante · {nomeCurto ou nome}", a frase de boas-vindas da Aparência (ou "Respostas com base nas normas da instituição."), e não SHALL mostrar "Olá! Eu sou"
9. WHERE há foto do assistente, a tela SHALL mostrá-la em 32 px ao lado de "{nome do assistente}, assistente virtual" ("Assistente virtual" sem nome); sem foto, SHALL mostrar só o texto
10. WHEN o aluno tem uma solicitação em `ABERTO`, `EM_ATENDIMENTO` ou `AGUARDANDO_ALUNO` THEN o Assistente sem conversa SHALL mostrar, antes das perguntas, a linha "Sua solicitação {número} · {estado}" com o próximo passo, como link para o detalhe; com mais de uma, a mais recente
11. The system SHALL mostrar as perguntas sugeridas como uma lista de linhas de 48 px ou mais, com divisória, ícone à esquerda e seta à direita, e tocar numa linha SHALL enviar a pergunta como hoje

### S4: Indicadores com hierarquia (P1)

12. The system SHALL mostrar o Indicador principal no topo, com o número em serifa de 40 px e `tabular-nums`, e a variação contra o período anterior de mesmo tamanho ("▲ N pts", "▼ N pt" ou "= sem variação"), calculada por uma segunda consulta a `GET /api/indicadores` com o período anterior; N é (atual − anterior) × 100 com 1 casa, 0,0 dá "= sem variação", "pt" abaixo de 2,0 e "pts" de 2,0 em diante
13. IF a consulta do período anterior falha ou o período anterior não tem dados THEN a tela SHALL mostrar o número sem a variação, sem erro
14. The system SHALL mostrar os outros 3 destaques numa faixa de 3 colunas quando o contêiner `main` mede 768 px ou mais (1 abaixo), separados por divisória, sem caixa
15. The system SHALL mostrar as outras 9 métricas como lista de rótulo e valor tabular, em 2 colunas quando o contêiner `main` mede 768 px ou mais (1 abaixo), com divisória entre as linhas, sem caixa
16. The system SHALL mostrar os dois gráficos sem cartão em volta, cada um com o seu título

### S5: Menos caixas e estados vazios com ícone (P1)

17. The system SHALL tirar a borda e o fundo de cartão dos blocos estáticos do detalhe do chamado (dados do aluno, Histórico) e das seções da Aparência, separando-os por 32 px e por título de seção ("Dados do aluno" e "Histórico" no detalhe); o resumo gerado por IA e o formulário de resposta SHALL manter um fundo tingido; a Conta SHALL continuar uma lista agrupada com borda
18. WHEN uma lista está vazia, ou Indicadores não tem dados THEN a tela SHALL mostrar um ícone lucide de 28 px em `text-muted-foreground`, o título de hoje (quando a lista tem), a frase e o botão (quando a lista tem), e nenhum `svg` de ilustração
19. The system SHALL remover de `web/src/ilustracoes/` as 6 ilustrações e manter só `Planilha`, mostrada no passo 2 de Matrículas com as colunas `cpf`, `nome`, `email`, `matricula`, `curso`, `semestre` e `situacao`
20. The system SHALL mostrar na raiz `/` o nome "One" em serifa, a frase e o texto de como entrar, sem ilustração
21. The system SHALL mostrar na prévia da Aparência o login e as boas-vindas no arranjo novo

### S0: Invariantes (P1)

22. The system SHALL manter tudo o que a `revisao-ux` e a `aparencia-instituicao` garantem e que esta feature não muda (alvos de 44 px, campos de 16 px, contrastes, barra de abas, cor de ação, tokens tingidos), com as suítes de arranjo, Vitest e e2e real verdes

## Out of scope

| Excluded | Why |
| --- | --- |
| Sparkline e gráfico que muda pela métrica escolhida | precisam de série diária, que `GET /api/indicadores` não devolve; mudaria a API |
| Categorias de perguntas no assistente (linha que abre 2 ou 3 perguntas) | precisa de configuração nova por instituição; as 4 perguntas da Aparência continuam |
| Fonte escolhida pela instituição | multiplica as combinações a testar; a marca vem pela cor, logo, ícone e foto |
| Foto do campus da Univag | depende da Univag enviar, com autorização de uso de imagem; a tela Aparência já aceita |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fonte | Public Sans + Source Serif 4 | decisão do usuário em 05/11 com a prévia | y |
| Ilustrações | ícones; só `Planilha` fica | decisão do usuário em 05/11 | y |
| Comparação do indicador | período anterior de mesmo tamanho, imediatamente antes | padrão de painéis (Plausible) e não muda a API | n |
| Serifa na barra do topo | não; a barra fica em sans (16 px) | serifa abaixo de 20 px perde legibilidade em tela | n |
| Perfil | `ui` | muda o arranjo de várias telas | n |
| Pontos P1 a P14 de `checks.md` (texto de apoio do Login, título de Primeiro acesso e Criar senha, linha de lista, `rounded-full`, arredondamento da variação, título do vazio, blocos do detalhe, Conta fora do AC 17, "Assistente virtual", título neutro do assistente, exceções da `revisao-ux` AC 41 e C57, marcador, colunas pelo `main`, falha das solicitações) | os valores escritos nos critérios, em `## Screens` e na door 2 acima | decisão do orquestrador em 05/11, com o plano aprovado pelo usuário | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| login | sem foto, com foto | AC 5, AC 6 |
| Assistente | vazio, com solicitação em aberto | AC 8 a AC 11 |
| Indicadores | sem dados, erro do período anterior | AC 13, AC 18 |
| listas | vazio | AC 18 |
| Aparência | prévia | AC 21 |
| todas as telas | carregando, erro, não autorizado | existing - `revisao-ux` (esqueletos, "Tentar de novo", guarda de papel) |

## Sources

- `.specs/features/identidade-visual/pesquisa.md` (binding): fontes medidas e fontes das recomendações
- `.specs/features/revisao-ux/pesquisa.md` (binding): princípios de hierarquia e o que dá cara de IA
- Pedido e decisões do usuário em 05/11/2026: rodada de identidade visual, fonte A e ícones no lugar das ilustrações
