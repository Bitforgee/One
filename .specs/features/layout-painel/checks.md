# Layout de painel - checks

Profile: ui
Plan: `.specs/features/layout-painel/plan.md`

53 checks em 8 slices · 5 one-way doors · 0 perguntas abertas

**Como as provas rodam.** Na raiz `D:\one-system`, salvo `cd web &&`. Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"`.
Playwright: `cd web && npx playwright test <arquivo> -g "<nome>"` contra o contêiner `api` da porta 8080 reconstruído com
`docker compose up -d --build api` (ou um `vite preview` com `E2E_URL`, como no `barra-lateral-grupos`), com a API simulada de
`e2e/simulada.ts`. Um filtro que não seleciona teste sai com 0 (L-002): confira com `--list` ou com a contagem do Vitest
que ao menos 1 teste rodou. `<base>` é o commit que congela este arquivo, gravado em `## Handoff`.
Regra do arranjo e regra dos textos: as da `interface-nova` (`checks.md`, cabeçalho). Larguras de janela em px CSS;
"aberta"/"recolhida" = estado da barra lateral. A largura do `main` a cada janela vem de 256 (aberta) ou 48 (recolhida):
1280 aberta → 1024, 1440 aberta → 1184, 900 aberta → 644, 900 recolhida → 852.

## Checks

### S1 - Casca com a barra lateral do template (P1) · ~12 files · ~170 KB · ~60k

**C1** - [x] A 768, 1024, 1280 e 1440 px com a barra aberta: a barra fica em x = 0 com 256 px (±1) de largura e a altura da janela; "One" e a instituição ficam no topo, acima do primeiro título de grupo; o botão do usuário fica embaixo, com o fundo a até 16 px do fim da barra; o `main` começa em x = 256 (±1) (AC 1)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "painel barra aberta"`

**C2** - [x] A 1280 px, clicar em "Alternar barra lateral" deixa a barra com 48 px (±1), o `main` começando em x = 48 (±1) e `localStorage['one-barra'] === 'recolhida'`; clicar de novo volta a 256 px (±1) e grava `aberta` (AC 2)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "painel recolher e expandir"`
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "alternar barra grava one-barra"`

**C3** - [x] Ao carregar uma tela autenticada, a barra começa recolhida com `one-barra` = `recolhida` e aberta com `aberta`, ausente ou `xyz` (4 casos, por tabela) (AC 3)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "estado inicial da barra por one-barra"`

**C4** - [x] Recolhida a 1280 px: os 9 links do administrador mantêm o nome acessível do rótulo e só o ícone é visível (rótulo, títulos de grupo e instituição sem caixa visível ou com largura ≤ 1 px); passar o mouse num link e focar outro pelo teclado mostram uma dica com o rótulo (AC 4)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "painel barra recolhida"`

**C5** - [x] A 360, 390 e 767 px nenhuma parte da barra fica visível na janela; "Alternar barra lateral" abre um painel em x = 0 com min(288, largura da janela) px (±1), com a instituição, os 3 grupos e os 9 links do administrador e o botão do usuário (AC 5)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "painel no celular"`

**C6** - [x] A 360 px, escolher "Fila" no painel fecha o painel (nenhum `role="dialog"` visível) e o `h1` do cabeçalho passa a "Fila" (AC 6)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "painel no celular"`

**C7** - [x] Ctrl+B (e Meta+B) alterna a barra: de aberta para recolhida e de volta (AC 7)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "Ctrl+B alterna a barra"`

**C8** - [x] A 360 e 1280 px o cabeçalho tem 49 px (±1) de altura e continua em y = 0 depois de rolar a página 400 px; da esquerda para a direita: "Alternar barra lateral", um separador vertical (`data-orientation="vertical"`), o `h1` (`font-size` 16 px, `font-weight` 500), e na ponta direita "Tema"; para o aluno com a chave de push, o botão de avisos fica à esquerda de "Tema", na mesma linha (AC 8)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "painel cabeçalho"`
Proof: `cd web && npx playwright test e2e/push.spec.ts -g "avisos no cabeçalho"`

**C9** - [x] O `h1` do cabeçalho, por tabela sobre 11 rotas: os 9 caminhos de `Menu` dão o rótulo do link; `chamados/ONE-7` dá "ONE-7"; `trocar-senha` dá "Trocar senha"; em cada uma há exatamente 1 `h1` na página (AC 9)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "título do cabeçalho por rota"`

**C10** - [x] O botão do usuário abre um menu com o `nome`, o papel e "Sair"; o papel por tabela: [ADMINISTRADOR, ATENDENTE, ALUNO] → "Administrador", [ALUNO, ATENDENTE] → "Atendente", [ALUNO] → "Aluno"; "Sair" faz `POST /api/auth/logout` e leva a `/{slug}` (AC 10)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "menu do usuário"`
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "papel do usuário por precedência"`

**C11** - [x] Com `prefers-reduced-motion: reduce`, alternar a barra a 1280 px não tem transição: a largura já é a final no quadro seguinte ao clique (`transition-duration` 0s no contêiner da barra) (AC 11)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "movimento reduzido na barra lateral"`

**C12** - [x] Depois de alternar a barra 2 vezes, `document.cookie` não contém `sidebar_state`, e nenhum arquivo de `web/src` contém `document.cookie` (AC 12)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "sem cookie sidebar_state"`

### S2 - Conteúdo responsivo (P1) · ~4 files · ~60 KB · ~20k

**C13** - [x] Sem rolagem horizontal (`document.documentElement.scrollWidth` ≤ `innerWidth`) em 15 telas (Assistente, Minhas solicitações, Detalhe do chamado, Fila, Indicadores com dados, Artigos, Documentos, Usuários, Matrículas com erros, Cadastros, Trocar senha, Login, Primeiro acesso, Definir senha, raiz) a 360, 390, 768, 1024, 1280 e 1440 px; nas autenticadas a partir de 768 px, com a barra aberta e recolhida; com os textos longos da simulada (título de 120 caracteres sem espaço em Fila, Artigos e Documentos, e-mail de 60 caracteres em Usuários) (AC 13)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "sem rolagem horizontal"`

**C14** - [x] O elemento que envolve o conteúdo de cada tela tem `container-type: inline-size` e `container-name: main`; a 900 px a Fila mostra só Número, Título e Estado com a barra aberta e as 6 colunas recolhida (a mesma janela, o arranjo muda com a largura do `main`) (AC 14)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "colunas pela largura do main"`

**C15** - [x] Na Fila, o primeiro bloco do conteúdo começa 16 px (±1) depois da borda esquerda do `main` e 16 px abaixo do cabeçalho a 360 px; 16 px à esquerda e 24 px abaixo a 768 px recolhida; 24 px e 24 px a 1280 px (AC 15)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "recuos do conteúdo"`

### S3 - Indicadores com hierarquia (P1) · ~5 files · ~45 KB · ~18k

**C16** - [x] Com dados, os 4 primeiros cartões são, nesta ordem, "Indicador principal", "Chamados abertos agora", "Autoatendimento" e "Tempo até a 1ª resposta", cada um com o valor formatado como hoje e o rodapé exato de `## Screens` (AC 16)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "destaques de Indicadores"`

**C17** - [x] Nos 4 destaques, o valor tem `font-size` ≥ 24 px e `font-variant-numeric` com `tabular-nums`, e o rótulo tem 14 px; colunas da grade (posições x distintas): 1 a 360 px, 2 a 1280 px aberta, 4 a 1440 px aberta (AC 16, AC 17)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo Indicadores"`

**C18** - [x] Os outros 9 indicadores aparecem depois dos destaques, na ordem de hoje sem os 4 ("Alunos ativos", "Conversas", "Escalonamento", "Abandono", "Perguntas sem artigo", "Chamados resolvidos", "Tempo de resolução", "Roteamento correto", "Reabertura"), com valor em 20 px (±0,5); 2 colunas a 360 px e 3 a 1440 px aberta (AC 18)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "indicadores compactos na ordem"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo Indicadores"`

**C19** - [x] Cada ranking presente fica num cartão com o título, o gráfico acima da tabela; a 1440 px aberta os 2 cartões ficam na mesma linha e a 360 px um abaixo do outro (AC 19)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "ranking com gráfico acima da tabela"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo Indicadores"`

**C20** - [x] Formulário de período, "Sem dados no período", erro e Spinner como hoje: os testes de hoje continuam verdes sem mudança de asserção, salvo a classe da grade dos rankings, que segue a quebra de 896 px do `## Screens` (`@4xl/main:grid-cols-2`; emenda aprovada pelo usuário em 03/11 após a verificação rodada 1) (AC 20)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "Sem dados no período"`
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "período pelo calendário só consulta no Consultar"`
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "cartões formatam taxa, horas e número, e o ranking vazio mostra traço"`

### S4 - Listas em tabela (P1) · ~16 files · ~190 KB · ~65k

**C21** - [x] Os cabeçalhos de coluna, na ordem, por tabela sobre 7 listas: Fila [Número, Título, Categoria, Responsável, Dias, Estado]; Minhas solicitações [Número, Título, Estado]; Usuários [Nome, CPF, E-mail, Papéis, Situação, —]; Artigos [Título, Categoria, Versão, Validade, Situação, —]; Documentos [Título, Categoria, Versão, Arquivo, Situação, —]; Cadastros (cada uma das 5 abas) [Nome, Detalhe]; erros de Matrículas [os de hoje]. "—" = coluna sem texto visível (AC 21)
Proof: `cd web && npx vitest run src/chamados/listas.test.tsx -t "colunas das listas de chamados"`
Proof: `cd web && npx vitest run src/administracao/admin.test.tsx -t "colunas das tabelas de administração"`
Proof: `cd web && npx vitest run src/conhecimento/artigos.test.tsx -t "colunas de Artigos e Documentos"`

**C22** - [x] A 360 px, nas 5 telas com colunas "largo" (Fila, Usuários, Artigos, Documentos, Cadastros), os cabeçalhos "largo" não são visíveis e abaixo da coluna principal há uma linha de 12 px com os valores unidos por " · " (Fila: "Financeiro · Ana · 2 dias"); a 1280 px aberta os cabeçalhos aparecem e essa linha não. O cabeçalho da tabela tem fundo `--muted` (AC 22)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "colunas largas somem no estreito"`

**C23** - [x] Na Fila e em Minhas solicitações, clicar na célula "Estado" de uma linha abre `/{slug}/chamados/{numero}`; o número é um `<a>` que recebe foco pelo Tab (AC 23)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "linha da lista abre o chamado"`

**C24** - [x] Lista vazia, por tabela sobre 6 telas (Fila, Minhas solicitações, Usuários, Artigos, Documentos, uma aba de Cadastros): uma única linha no corpo, com uma célula cujo `colSpan` é o número de colunas e o texto de vazio de hoje (AC 24)
Proof: `cd web && npx vitest run src/chamados/listas.test.tsx -t "lista vazia numa linha"`
Proof: `cd web && npx vitest run src/administracao/admin.test.tsx -t "lista vazia numa linha"`
Proof: `cd web && npx vitest run src/conhecimento/artigos.test.tsx -t "lista vazia numa linha"`

**C25** - [x] Menu "Ações de <nome>", por tabela sobre 7 casos: usuário ativo → [Editar, Desativar]; usuário desativado → sem botão; artigo RASCUNHO → [Editar, Ativar, Arquivar]; artigo ATIVO → [Editar, Arquivar]; artigo ARQUIVADO → [Editar, Ativar]; documento ATIVO → [Nova versão, Arquivar]; documento ARQUIVADO → sem botão. Os itens são `role="menuitem"` e "Desativar"/"Arquivar" têm `data-variant="destructive"` (AC 25)
Proof: `cd web && npx vitest run src/administracao/usuarios.test.tsx -t "ações de usuário no menu"`
Proof: `cd web && npx vitest run src/conhecimento/artigos.test.tsx -t "ações de artigo no menu"`
Proof: `cd web && npx vitest run src/conhecimento/documentos.test.tsx -t "ações de documento no menu"`

**C26** - [x] Cadastros: a 360 px as abas não são visíveis e um select de nome "Cadastro" tem as 5 opções das abas; escolher "Cursos" mostra a tabela de cursos; a 1440 px aberta as abas são visíveis e o select não (AC 26)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "Cadastros com select no estreito"`

**C27** - [x] "Novo", diálogos de confirmação e editores como hoje: os testes de hoje continuam verdes, com no máximo o passo de abrir o menu antes do clique (AC 27)
Proof: `cd web && npx vitest run src/administracao/usuarios.test.tsx -t "desativar pede confirmação"`
Proof: `cd web && npx vitest run src/administracao/usuarios.test.tsx -t "editar troca papéis, setores e a senha temporária"`
Proof: `cd web && npx vitest run src/administracao/cadastros.test.tsx -t "editar setor grava triagem e ativo"`
Proof: `cd web && npx vitest run src/conhecimento/documentos.test.tsx -t "tela Documentos lista, vazio e confirma arquivar"`
Proof: `cd web && npx vitest run src/conhecimento/artigos.test.tsx -t "novo artigo envia perguntas e links como listas"`

### S5 - Detalhe, Assistente e acesso (P2) · ~10 files · ~170 KB · ~45k

**C28** - [x] Detalhe de um chamado da fila (atendente) a 1440 px aberta: a coluna direita tem 320 px (±1) e começa à direita do fim da coluna esquerda; nela, o cartão com o título "Ações" (com "Assumir" ou outro botão de ação) fica acima do cartão do histórico; a coluna esquerda tem o `h2` do título, as mensagens e o campo de resposta (AC 28)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "detalhe em duas colunas"`

**C29** - [x] A 360 px e a 1280 px aberta (`main` < 1024) o detalhe é uma coluna, com os topos crescentes nesta ordem: título, transcrição, mensagens, resposta, ações, histórico (AC 29)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "detalhe em uma coluna"`

**C30** - [x] No detalhe, o título do chamado é um `h2` com o texto do título, e o `h1` da página é o número (AC 30)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "título do chamado em h2"`

**C31** - [x] Assistente a 1440 px aberta: a coluna tem no máximo 768 px e as sobras à esquerda e à direita dentro do `main` diferem em no máximo 1 px; o compositor fica a até 16 px do fundo da janela com a conversa maior que a tela (AC 31)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo Assistente"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "compositor visível com a conversa maior que a tela"`

**C32** - [x] Login, Primeiro acesso, Definir senha e raiz a 360 e 1280 px: o cartão tem no máximo 384 px, o centro horizontal dele fica no centro da janela (±1), e o centro vertical também (±1) quando o cartão é mais baixo que a janela (AC 32)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "telas de acesso centralizadas"`

### S0 - Invariantes (P1) · ~8 files · ~80 KB · ~25k

**C33** - [x] As mesmas requisições à API: `chamadas_iguais.py <base>` sai 0 (todo teste da base existe no alvo com as mesmas chamadas, ou está em `REESCRITOS` com a linha correspondente em `## Handoff`), e as suítes inteiras passam (AC 33)
Proof: `python .specs/features/layout-painel/chamadas_iguais.py <base>`
Proof: `cd web && npx vitest run`
Proof: `cd web && npx playwright test`

**C34** - [x] Textos: em cada tela, só entram os marcados *(novo)* em `## Screens` ("Alternar barra lateral", os papéis no botão do usuário, os 4 rodapés de Indicadores, os cabeçalhos de coluna, "Ações", "Ações de <nome>", "Cadastro") (AC 34)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx src/indicadores/textos.test.tsx src/administracao/textos.test.tsx src/conhecimento/textos.test.tsx src/chamados/textos.test.tsx src/assistente/textos.test.tsx`

**C35** - [x] Os tokens de hoje continuam com os mesmos valores em claro, escuro e preto, e os tokens novos da barra dão contraste ≥ 4,5:1 entre `--sidebar-foreground` e `--sidebar` e entre `--sidebar-accent-foreground` e `--sidebar-accent` nos 3 temas (AC 35)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens de Visual"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "contraste dos tokens da barra"`

**C36** - [x] Barreiras do AD-018: `crapper` 0 no limite 9.99 e `dryer` sem candidato; `mutator` suspenso (AD-025)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx | grep -q "No duplicate candidates found"`

**C37** - [x] O build passa (`tsc --noEmit` e `vite build`), e o teste de estrutura aceita os arquivos novos de `web/src/ui/` (door 1, door 4)
Proof: `npm --prefix web run build`
Proof: `cd web && npx vitest run src/test/estrutura.test.ts`

**C38** - [x] Nenhum arquivo importa `ui/drawer`, e `web/src/ui/drawer.tsx` não existe mais; com isso, `vaul` sai de `package.json` (Impact, gaveta Vaul)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "sem gaveta Vaul"`

### S6 - Correção da verificação rodada 1 (P1) · derivado de `## Screens` já aprovado

Checks novos, aditivos: elementos e arranjos que `## Screens` decide e que nenhum check cobria (verification.md rodada 1).

**C39** - [x] Trocar senha a 360 e 1280 px: o cartão tem no máximo 384 px de largura (`## Screens`, linha "área principal")
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "Trocar senha até 384 px"`

**C40** - [x] Botão do usuário a 1280 px com a barra aberta: as iniciais ficam num quadrado de 32 × 32 px (±1) à esquerda; nome e papel ficam em 2 linhas à direita dele (topo do papel abaixo do fundo do nome), cada uma com `text-overflow: ellipsis`; há um ícone de seta (`lucide-chevrons-up-down`) à direita dos textos (`## Screens`, "casca, janela ≥ 768 px")
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "botão do usuário"`

**C41** - [x] Menu do usuário: no topo o nome e, abaixo, o papel; depois um separador (`role="separator"`); por último "Sair" com o ícone `LogOut`. A 1280 px com a barra aberta, o menu abre à direita do botão (esquerda do menu ≥ direita do botão); a 360 px, dentro do painel, abre acima do botão (fundo do menu ≤ topo do botão) (`## Screens`, "menu do usuário")
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "menu do usuário abre ao lado"`

**C42** - [x] Barra aberta a 1280 px: fundo igual ao `--sidebar` do tema, borda direita de 1 px, e a instituição "Centro Universitário de Várzea Grande" quebra em até 2 linhas sem passar da barra (`## Screens`, "casca, janela ≥ 768 px")
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra com fundo, borda e instituição"`

**C43** - [x] A 360 px, com o painel aberto, há uma camada escura atrás dele cobrindo a janela (`data-slot="sheet-overlay"` visível, cor de fundo com alfa > 0) (`## Screens`, "casca, janela < 768 px")
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "painel no celular"`

**C44** - [x] Cadastros a 1440 px com a barra aberta: a lista de abas e o botão "Novo" ficam na mesma linha, as abas à esquerda e "Novo" à direita (`## Screens`, "Cadastros")
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "Cadastros com select no estreito"`

**C45** - [x] Indicadores: o `Alert` de "Sem dados no período" e o de erro ficam abaixo da linha de ferramentas e com a largura do bloco de conteúdo (±1), a 360 e 1280 px; ao clicar em "Consultar", o botão mostra o Spinner (`role="status"`) e fica desabilitado até a resposta (`## Screens`, "Indicadores, vazio / erro / carregando"; AC 20)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "alertas de Indicadores"`
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "Consultar mostra o Spinner enquanto busca"`

**C46** - [x] Os dois lados de cada quebra de `## Screens` que nenhum check media: recuo do cabeçalho 16 px (±1) a 768 px e 24 px a 1024 px; recuo do cartão de acesso 24 px a 360 px e 40 px a 768 px; valor dos destaques de Indicadores 24 px com o cartão abaixo de 250 px (1328 px aberta) e 30 px com 250 px ou mais (1440 px aberta) (`## Screens`)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "quebras medidas dos dois lados"`

**C47** - [x] Enquanto uma ação de linha grava, o botão "Ações de <nome>" mostra o Spinner e fica desabilitado, nas 3 telas: Artigos (Ativar), Usuários (Desativar) e Documentos (Arquivar). Em `dac2832` só "Ativar" mostrava Spinner; as outras ações só desabilitavam, ou nem isso (Usuários): o retorno visual igual nas 3 é a forma de AC 27 sob o menu (texto corrigido após a verificação rodada 2) (AC 27)
Proof: `cd web && npx vitest run src/conhecimento/artigos.test.tsx -t "ações de linha mostram o Spinner enquanto gravam"`
Proof: `cd web && npx vitest run src/administracao/usuarios.test.tsx -t "ações de linha mostram o Spinner enquanto gravam"`
Proof: `cd web && npx vitest run src/conhecimento/documentos.test.tsx -t "ações de linha mostram o Spinner enquanto gravam"`

**C48** - [x] As asserções exatas de antes continuam exatas: em `usuarios.test.tsx` o papel "Aluno" é conferido com `/^Aluno$/` na célula; em `listas.test.tsx` o número e o título são conferidos com âncora `$` na célula (verification.md rodada 1, ponto 5)
Proof: `cd web && npx vitest run src/administracao/usuarios.test.tsx -t "lista papéis, setores e o selo de desativado"`
Proof: `cd web && npx vitest run src/chamados/listas.test.tsx -t "colunas das listas de chamados"`

### S7 - Correção da verificação rodada 2 (P1) · derivado de `## Screens` já aprovado

**C49** - [x] Lista vazia: o texto da linha única fica centralizado (`text-align: center`) e a linha tem 96 px (±1) de altura, na Fila a 360 e 1280 px (AC 24, `## Screens` "tabela vazia")
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "lista vazia centralizada"`

**C50** - [x] Trocar senha a 360 e 1280 px: o centro horizontal do cartão fica no centro do bloco de conteúdo (±1) (`## Screens`, "área principal")
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "Trocar senha até 384 px"`

**C51** - [x] Cabeçalho a 360 e 1280 px: borda inferior de 1 px; o `h1` fica numa linha (`white-space: nowrap`, `text-overflow: ellipsis`) e um título longo não passa de "Tema"; os botões-ícone Tema e Avisos têm 36 × 36 px (±1) (`## Screens`, "cabeçalho")
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "cabeçalho: borda, título numa linha e botões de 36 px"`

**C52** - [x] Barra a 1280 px: com a janela de 600 px de altura, a área dos grupos rola (`overflow-y: auto`, `scrollHeight` > `clientHeight`) e o botão do usuário continua visível embaixo; recolhida, as iniciais ficam num quadrado de 32 × 32 px (±1) dentro dos 48 px (`## Screens`, casca aberta e recolhida)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "grupos rolam e iniciais na barra recolhida"`

**C53** - [x] Valores de tipo e bordas, por tabela a 1440 px com a barra aberta: rodapé dos destaques 14 px, cor `--muted-foreground`, uma linha (`-webkit-line-clamp: 1` ou `white-space: nowrap`); valor dos destaques e dos compactos com `font-weight` 600; rótulo dos compactos 14 px; valor dos compactos com `tabular-nums`; cabeçalho de tabela 14 px peso 500; caixa da tabela com borda de 1 px e raio de 8 px; linhas do corpo separadas por borda inferior de 1 px (Fila) (`## Screens`)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "valores de tipo e bordas"`

## Exempted

Fora do alcance dos checks, por tela (cores vêm dos tokens, conferidos por C35):

- casca: espessura das bordas internas da barra, raio e cor de hover dos links, peso dos títulos de grupo
- cabeçalho: altura do separador vertical (16 px no `## Screens`) e cor dos botões-ícone
- Indicadores: gradiente e sombra dos cartões de destaque (classes do template), espaço entre cartões, peso do rótulo
- tabelas: altura das linhas, cor do hover, raio da caixa; o cabeçalho `bg-muted` é conferido por C22
- Detalhe, Assistente, acesso: espaço interno dos cartões e distância entre blocos

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| door 1 `sidebar` (3 estados) | aberta C1 · recolhida C2 C4 · celular C5 C6 | - |
| door 2 `one-barra` (4 valores) | C3, table-driven over all 4 (`recolhida`, `aberta`, ausente, `xyz`); gravação C2; sem cookie C12 | - |
| door 3 `h1` por rota (11) | C9, table-driven over all 11 | - |
| door 4 menu de ações (7 casos) | C25, table-driven over all 7 | - |
| door 5 container (2 lados) | aberta → estreito C14 · recolhida → largo C14 | - |
| papel no botão (3) | Administrador C10 · Atendente C10 · Aluno C10 | - |
| larguras de janela sem rolagem (6) | 360 C13 · 390 C13 · 768 C13 · 1024 C13 · 1280 C13 · 1440 C13 | - |
| telas sem rolagem (15) | C13, table-driven over all 15 | - |
| destaques de Indicadores (4) | C16, table-driven over all 4 (ordem e rodapé) | - |
| colunas de Indicadores (3 quebras) | 1 coluna C17 · 2 colunas C17 · 4 colunas C17 | - |
| listas em tabela (7) | Fila C21 · Minhas solicitações C21 · Usuários C21 · Artigos C21 · Documentos C21 · Cadastros C21 · Matrículas C21 | - |
| colunas "largo" (5 telas) | C22, table-driven over all 5 | - |
| vazio (6) | C24, table-driven over all 6 | - |
| estados do detalhe (2) | largo C28 · estreito C29 | - |
| telas de acesso (4) | C32, table-driven over all 4 (Login, Primeiro acesso, Definir senha, raiz) | - |
| temas para os tokens da barra (3) | C35, table-driven over all 3 (claro, escuro, preto) | - |

- Nenhum check afirma rota ou status da API: o plano não tem `Surface`
- C27 e C20 só afirmam o que os testes de hoje já afirmam; o resto dessas telas fica sob C33

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| mapa rota → título, papel por precedência, estado inicial da barra (decidem) | Vitest no `Autenticado` | um caso por linha (C3, C9, C10) |
| condições do menu de ações (decide) | Vitest na tela | um caso por estado de linha (C25) |
| arranjo e container queries (CSS, não roda no jsdom) | Playwright com `boundingBox()` e `getComputedStyle` | cada quebra de `## Screens` numa largura de cada lado |
| componentes copiados para `web/src/ui/` (instrumentação) | nenhuma própria | cobertos pelas telas que os usam |

Evidence:

- `Autenticado.tsx`: mapa de títulos com 11 rotas e a precedência de 3 papéis → decide
- telas de lista: a condição de cada ação (`ativo`, `estado`) já existia e muda de lugar → decide, provada por linha
- o jsdom não aplica `@container`, então as colunas escondidas existem no DOM em qualquer largura: a prova de esconder é só e2e (C14, C22)
- análogo: `barra-lateral-grupos` provou o arranjo do mesmo jeito (C4, C11, C12)

Cost: ~12 testes Vitest novos e ~14 e2e novos ou reescritos. Os testes de hoje que procuram o `h1` da tela, a gaveta ou os botões soltos são reescritos e entram em `REESCRITOS` de `chamadas_iguais.py`, com uma linha em `## Handoff` cada.

## Swept

- validation: C3 (valor desconhecido em `one-barra`), C13 (textos longos sem espaço)
- failure modes: C20 (erro e vazio de Indicadores); existing - `ErroDe` e `Situacao` das listas acima da tabela
- idempotency: n/a - nenhuma gravação nova na API
- authorization: C9, C10 (rotas e papéis); existing - `Menu` filtra por papel (AD-028)
- concurrency: n/a - preferência lida na carga, por aba
- data lifecycle: C3, C12 (a chave `one-barra`, sem cookie)
- dependency failure: C38 (sai o `vaul`); n/a para o resto - `radix-ui` já instalado traz Dialog, DropdownMenu, Separator
- state transitions: C2 (aberta ↔ recolhida), C6 (painel aberto → fechado)
- observability: n/a - nenhum log no `web/`

## Handoff

Estimativa (`wc -c` / 4). Casca: `Autenticado`, `App`, `Cabecalho`, `Situacao`, `index.css`, `AvisosPush` e os `ui/` usados ≈ 30 KB
mais os e2e e os testes de `acesso/` e `test/` ≈ 140 KB, mais o `ui/` novo do shadcn (`sidebar`, `sheet`, `dropdown-menu`,
`separator`, `skeleton`, `use-mobile`) ≈ 40 KB = 210 KB ≈ 52k de leitura. Somando ≈ 25k de escrita e ≈ 15k de suítes, dá **~92k**.
Indicadores e listas: telas e testes ≈ 141 KB, mais `arranjo.spec.ts` 45 KB e o `data-table.tsx` do template 27 KB = 213 KB ≈ 53k.
Somando ≈ 30k de escrita e ≈ 15k de suítes, dá **~98k**. Detalhe, Assistente e acesso: ≈ 127 KB mais `arranjo.spec.ts` 45 KB = 172 KB ≈ 43k.
Somando ≈ 15k de escrita e ≈ 10k de suítes, dá **~68k**. Total **~258k**, acima do budget de 150k.

- S1 + S2 + C33-C38 (casca, conteúdo, invariantes) = ~92k; entrar em S3 + S4 leva a ~190k → corte depois de S2
- S3 + S4 (Indicadores e listas) = ~98k; entrar em S5 leva a ~166k → corte depois de S4
- S5 (detalhe, Assistente, acesso) = ~68k; o lote final roda de novo C33-C38 sobre a feature inteira
- Mechanism: handoff em 3 lotes sequenciais (lote 1: S1 + S2 + S0; lote 2: S3 + S4; lote 3: S5 e S0 de novo sobre a feature inteira), cada um só depois do verde do anterior - escolha do usuário em 03/11; construtores no Sonnet (memória do projeto)
- Feature base (`<base>`): `dac2832` (`docs(layout-painel): plan, checks and AD-029`)

- **Boundary:** C1-C13 and C15 closed at the `feat(web)` and `test(web)` commits after `8b9e5dc`; C14 stays open: its container half is proven ("colunas pela largura do main" checks `container-type`/`container-name`), the Fila columns half needs the table of batch 2. Provas no HEAD: Vitest 259/259; Playwright 58/58 contra o contêiner `api` reconstruído; `chamadas_iguais.py dac2832` 238 testes, 0 problema (com o `vaul` reinstalado só em `node_modules`, `--no-save`, porque a base ainda importa `ui/drawer`); `crapper` 0 (pior: `Sidebar` 9.8); `dryer` sem candidato; `mutator` não rodou (AD-025)
- **Settled mid-build:** (1) Vitest reescritos (entradas em `REESCRITOS`): `rodapé da barra lateral por papel (...)` x3 -> `botões do cabeçalho por papel (...)`; `nome do usuário na gaveta` -> `nome do usuário no painel do celular`; `recolher e expandir gravam one-barra` -> `alternar barra grava one-barra`; `one-barra desconhecido começa aberta (null/x)` -> `estado inicial da barra por one-barra (...)`; `avisos > na barra lateral ...` e `avisos > no(a) gaveta ...` -> `no cabeçalho o botão de avisos é um ícone com nome acessível e alterna`. (2) Mantidos pelo nome mas adaptados à casca: `dependências do kit de interface` (vaul agora ausente), `títulos de página` (h1 só em `Autenticado` e `Acesso`), textos de `cabeçalho`, `Trocar senha`, `Matrículas` e `detalhe do chamado`, o filtro de botões de `limite oferece só dois botões`, o título `h2` nos testes do detalhe, o passo de abrir o menu do usuário em `sair encerra a conexão...`, a classe `@3xl/main:` no teste dos cartões de Indicadores. (3) e2e: sai todo teste da barra de 240/64 px, da gaveta e de `grupos`; `push.spec` troca `na gaveta...` e `barra recolhida esconde...` por `avisos no cabeçalho`; `arranjo.spec` mede o `main > div > div` (o `main` é o `SidebarInset`, o contêiner é `main > div`). (4) O contêiner `@container/main` é um bloco com os recuos nele mesmo (o `mx-auto` de filho num `flex-col` encolhia a tela ao conteúdo); as listas de chamados perderam o `max-w-3xl` e Indicadores trocou `md:` por `@3xl/main:` para passar C13. (5) `SidebarMenuAction` e `SidebarMenuSub*` saíram do `sidebar.tsx` copiado (CRAP 20 e 12 sem uso). (6) A barra tem `role="navigation"` no `SidebarContent`. (7) `Telas` de `simulada.ts` é compartilhada com `plataforma.spec.ts`; `simularApi(page, papeis, extremos)` acrescenta os textos longos de C13. (8) Medidas depois de redimensionar esperam as transições (`assentar`)
- **Abandoned:** `Cabecalho` com título (o h1 é do cabeçalho da casca); `drawer.tsx` e o pacote `vaul`
- **Boundary:** C14, C16-C27 closed at the `feat(web)` and `test(web)` commits of batch 2 (the `docs` commit that records this line follows them). Provas no HEAD: Vitest 270/270; Playwright 59/59 contra o contêiner `api` reconstruído (cada filtro das provas selecionou ao menos 1 teste); `chamadas_iguais.py dac2832` 238 testes, 0 problema (com o `vaul` reinstalado só em `node_modules`, `--no-save`, e depois restaurado); `crapper` 0 (pior: `Sidebar` 9.8); `dryer` sem candidato; `npm run build` e `estrutura.test.ts` verdes; `mutator` não rodou (AD-025)
- **Settled mid-build (lote 2):** (1) nenhum teste Vitest da base mudou de nome, então `REESCRITOS` não ganhou entradas; os que liam cartões ou botões soltos ficaram com o mesmo nome e leem a linha (`closest('tr')`) e o menu "Ações de <nome>" (`escolher` e `acoesDe` em `src/test/util.tsx`). (2) C20: em `cartões formatam taxa, horas e número, e o ranking vazio mostra traço` a classe esperada da grade dos rankings passou de `@3xl/main:grid-cols-2` para `@4xl/main:grid-cols-2` (o breakpoint que `## Screens` manda); as asserções de valores não mudaram. (3) `Tabela.tsx` (caixa com borda, cabeçalho `muted`, vazio de uma linha, `MenuAcoes`, `CelulaLargo`, `Detalhe`) é o único componente compartilhado; `Situacao` só mostra o Spinner e o texto de vazio ("Nenhum item cadastrado.", ou o da tela) é da `Tabela`; `Cabecalho` virou a linha de ferramentas com filhos (texto de ajuda, ou select e abas). (4) o jsdom não aplica `@container`: a coluna "largo" e a linha de `Detalhe` existem juntas no DOM, então os textos das telas aparecem duas vezes nos testes de `textos`, que ganharam os cabeçalhos, os 4 rodapés e `versão`/`válido de`/`válido até` sem o `·` colado. (5) Nos Cadastros as abas ficam em `TabsContent` e o select "Cadastro" só troca o mesmo estado; o editor abre pelo botão do nome (não mais pela linha inteira). (6) e2e reescritos no `arranjo.spec.ts`: `indicadores em 2 e 4 colunas` (sai, vira parte de `arranjo Indicadores`), `abas de Cadastros rolam na própria faixa` (sai: as abas somem no estreito; vira `Cadastros com select no estreito`), `arranjo listas de chamados`, `arranjo Artigos e Documentos`, `arranjo administração`, `botões pequenos em linha em Artigos, Documentos e Usuários` (agora o botão "⋮"), `Cadastros: detalhe pequeno embaixo do nome` e `cartões sem sombra` (os 4 destaques levam `shadow-xs`, como no template; os demais seguem sem sombra). (7) A medição da tabela contra o conteúdo desconta a borda de 1 px de cada lado
- **Abandoned (lote 2):** `ItemUsuario`, `ItemArtigo`, `ItemDocumento` e a lista de botões de `Cadastros` (cartões por item); `BotaoAcao` com Spinner em "Ativar" (o item do menu só desabilita enquanto a gravação roda)
- **Boundary:** C28-C38 closed at the `feat(web)` and `test(web)` commits of batch 3 (the `docs` commit that records this line follows them). Provas no HEAD: Vitest 271/271; Playwright 66/66 contra o contêiner `api` reconstruído (cada filtro das provas selecionou ao menos 1 teste: 1 de "detalhe em duas colunas", 2 de "detalhe em uma coluna", 1 de "arranjo Assistente", 1 de "compositor visível...", 4 de "telas de acesso centralizadas"); `chamadas_iguais.py dac2832` 238 testes, 0 problema (com o `vaul` reinstalado só em `node_modules`, `--no-save`, e depois restaurado com `npm install`); `crapper` 0 (pior: `Sidebar` 9.8); `dryer` sem candidato; `npm run build`, `estrutura.test.ts` e `interface.test.ts` verdes; `mutator` não rodou (AD-025)
- **Settled mid-build (lote 3):** (1) nenhum teste Vitest da base mudou de nome (`REESCRITOS` sem entradas novas); o e2e `arranjo telas de acesso` ficou com o nome e trocou o que mudou: cartão de até 384 px (era 420) e recuo de 24 px a 360 px (era 16), pelo bloco de login do shadcn. O `arranjo Assistente` mede a coluna a 1440 px aberta (era 1024) com sobras iguais dentro do `main`; `compositor visível...` ganhou a distância ao fundo (até 16 px). (2) C20, mantido do lote 2: em `cartões formatam taxa, horas e número, e o ranking vazio mostra traço` a classe esperada dos rankings é `@4xl/main:grid-cols-2` (era `@3xl/main:`) porque `## Screens` moveu essa quebra para 896 px; as asserções de valores não mudaram. (3) `Centro` (em `Acesso.tsx`) é a área `min-h-svh` do bloco de login e também envolve a raiz `/` (agora num `Card`) e os estados "Instituição não encontrada" e carregando do Login. (4) O detalhe é uma grade `@5xl/main:grid-cols-[minmax(0,1fr)_320px]`; a ordem do DOM (esquerda, depois direita) dá a ordem de uma coluna do C29. O `Card` "Ações" só existe quando há alguma ação permitida; o alerta de erro da ação fica fora dele, para não sumir se a ação sair da lista. O `Historico` é um `Card` com o mesmo `section` e `h2` de antes. (5) O `Assistente` leva `-mb-4 md:-mb-6` para o compositor `sticky` encostar no fundo (o recuo do contêiner o deixava a 24 px). (6) "Ações" entrou na lista de literais de `textos detalhe do chamado`, e o select "Cadastro" (nome acessível, não texto visível) é afirmado em `textos Cadastros`
- **Abandoned (lote 3):** feedback de pendência no "Ativar" do menu da linha de Artigos: o menu fecha ao escolher o item, então um Spinner dentro dele não apareceria, e mostrá-lo no botão "⋮" pediria saber qual linha gravou; o item só desabilita enquanto a gravação roda (registrado, não escondido)

### Correção após a verificação rodada 1

- **Boundary:** C39-C48 closed at c95d470 (`fix(web)` 484942c, `test(web)` c95d470; the `docs` commit that records this block follows). Provas no HEAD: Vitest 273/273 (34 arquivos); Playwright 72/72 contra o contêiner `api` reconstruído (cada filtro das provas selecionou ao menos 1 teste: 9 nos filtros de S6 mais "painel no celular", "Cadastros com select no estreito" e "arranjo telas de acesso"); `chamadas_iguais.py dac2832` 238 testes, 0 problema (com o `vaul` reinstalado só em `node_modules`, `--no-save`, e depois restaurado com `npm install`; não foi commitado); `crapper` 0 (pior: `Sidebar` 9.8); `dryer` sem candidato; `mutator` não rodou (AD-025)
- **Settled mid-build:** (1) código mudado para casar com `## Screens`: só o cartão de Trocar senha (`max-w-[420px]` -> `max-w-sm`, 384 px) e `MenuAcoes` (prop `pendente`: Spinner no lugar do "⋮" e botão desabilitado; passada por Artigos, Documentos e Usuários com o `isPending` da tela). Menu do usuário, `ChevronsUpDown`, quebra da instituição e camada do painel já casavam com a tabela, só faltava medir. (2) C39: o e2e `arranjo telas de acesso` passou de `<= 420` para `<= 384`, e o teste novo "Trocar senha até 384 px" mede a 360 e 1280 px. (3) C43 e C44 estendem "painel no celular" e "Cadastros com select no estreito". (4) C41: o `boundingBox()` do botão é lido antes de abrir o menu, porque o menu aberto tira o resto da árvore de acessibilidade. (5) C48: as âncoras ficaram nas células dentro de "colunas das listas de chamados" (`/^ONE-1$/`, `/^boleto.*1 dia$/`, `/^ONE-3$/`, `/^histórico$/`) e `/^Aluno$/` na célula Papéis de "lista papéis, setores e o selo de desativado"; as asserções antigas de texto da linha ficaram. (6) C47: o item "Ativar" do menu continua só desabilitado; o feedback vai no gatilho "Ações de <nome>", que fica visível com o menu fechado
- **Abandoned:** nada novo; o "Abandoned (lote 3)" sobre o Spinner do "Ativar" fica superado pelo C47

### Correção após a verificação rodada 2

- **Boundary:** C47 (texto corrigido) e C49-C53 closed at af95317 (`fix(web)`: código e testes juntos; o `docs` 6900c95 marca os checks). Provas no HEAD do autor: Vitest 275/275 (34 arquivos); os 5 filtros de S7 selecionaram 1 teste cada e passaram contra `vite preview` com `E2E_URL` (Docker parado na hora; `anexos` e `plataforma` deram 502 por falta da API real, sem relação com a mudança)
- **Settled mid-build:** (1) C47: Usuários e Documentos já passavam `pendente` ao `MenuAcoes` desde 484942c; faltava a prova. Os testes novos de `usuarios.test.tsx` e `documentos.test.tsx` falham com `pendente` tirado das duas telas (F2 da rodada 2, conferido pelo autor e revertido). (2) Única mudança de código: o rodapé dos destaques de Indicadores em `<div className="line-clamp-1">` dentro do `CardFooter`; sem ela o C53 falha ("rodapé ... numa linha"). (3) C50 estende o e2e "Trocar senha até 384 px" com o centro do cartão; C49, C51, C52 e C53 são testes novos em `arranjo.spec.ts`. Lista vazia, cabeçalho, barra e bordas já casavam com `## Screens`, só faltava medir
- **Abandoned:** nada
