# Revisão de UI e UX - checks

Profile: ui
Plan: `.specs/features/revisao-ux/plan.md`

65 checks em 7 slices (S1 a S6 e S0) · 3 one-way doors · 0 perguntas abertas (P1 a P16 decididos em 04/11)

**Como as provas rodam.** Todos os comandos rodam na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é o
commit que congela `plan.md` e este `checks.md`, gravado no `## Handoff`. **Pré-condição:** `<base>` é o commit
seguinte à verificação de `instituicoes-plataforma` (tela `Instituicoes.tsx`, papel `OPERADOR`,
`e2e/instituicoes.spec.ts`), que dá a C39 e C41 os membros "Nova instituição", "Importar carga" e Instituições.

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `web/` unidade | Vitest (jsdom): `cd web && npx vitest run <arquivo> -t "<nome>"`. Largura de celular simulada com `vi.stubGlobal('matchMedia', ...)` casando `(max-width: 767px)` (e `(max-width: 1023px)` no detalhe), como em `acesso/acesso.test.tsx`; relógio com `vi.setSystemTime` | `npm --prefix web ci` |
| `web/` arranjo e medida | Playwright no Chromium com a API simulada (`e2e/simulada.ts`). A simulada ganha: um aluno só com `ALUNO` (`simularApi(page, ['ALUNO'])` já existe); chamados nos 5 estados; Minhas solicitações com 3 itens; 1 item em cada lista de Cadastros; o `OPERADOR` e `/api/plataforma/*`. Medidas por `boundingBox()` e `getComputedStyle`, em px CSS, com tolerância de 1 px. **Cor:** a cor computada é pintada num `canvas` 1×1 e lida em sRGB de 8 bits, como em `tema Preto com fundo preto`; uma cor com alfa é composta sobre o fundo opaco mais próximo. **Contraste:** fórmula do WCAG 2, (L1 + 0,05)/(L2 + 0,05) sobre a luminância relativa. **Ponteiro grosso:** `browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 } })`. Verificado em 04/11 no Chromium 156 do Playwright 1.64.1: com `hasTouch: true`, `(pointer: coarse)` e `(hover: none)` casam; sem ele, casa `(pointer: fine)`. O teste confere o `matchMedia` antes de medir. **Área segura:** CDP `Emulation.setSafeAreaInsetsOverride({ insets: { bottom: 34 } })`, que no mesmo Chromium faz `env(safe-area-inset-bottom)` valer 34 px (verificado em 04/11) | o `playwright.config.ts` não tem `webServer`: `npm --prefix web run build`, `npx vite preview --port 5199` em `web/` e depois `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/<arquivo> -g "<nome>"` |
| `web/` e2e real | Playwright contra uma imagem própria do `HEAD` na porta 8087, com banco, bucket e instituição `e2e` próprios, no padrão de `aparencia-instituicao` (8085). Cada spec novo loga no máximo 2 vezes (L-066), e `workers: 1` continua | ver `## Handoff` |
| barreiras | `crapper` e `dryer` em `web/` (AD-018); mutação suspensa (AD-025); sem `dotnet`, porque nenhuma linha de `api/` muda (C62) | `npm --prefix web run coverage` |

Um filtro que não seleciona teste nenhum sai com código 0 (L-002). O construtor confere que cada `-t` e cada `-g`
executam pelo menos 1 teste. O nome citado numa linha `Proof:` é o contrato: o que não existe em `<base>` é criado
com exatamente esse nome (L-022). Arquivos de teste novos: `src/ux.test.tsx`, `src/acesso/navegacao.test.tsx`,
`src/assistente/revisao.test.tsx`, `src/chamados/revisao.test.tsx`, `src/conhecimento/revisao.test.tsx`,
`src/indicadores/revisao.test.tsx`, `src/administracao/revisao.test.tsx`, `e2e/ux.spec.ts` e
`e2e/ux-real.spec.ts`. A tela Conta mora na fatia `acesso`: `estrutura.test.ts` exige que
`acesso/navegacao.test.tsx` abra uma tela da sua fatia.

Nenhuma asserção vale para um elemento que pode não existir. Cada medida começa afirmando a contagem do que
mede (L-069). Centralização e alinhamento são medidos nos elementos alinhados, nunca no contêiner de largura total
(L-072). Um claim com "A ou B" tem um caso com A e outro com B (L-073).

**Asserções existentes que podem mudar** (lista fechada; o Verifier confere cada edição contra ela). Cada edição só
pode levar a asserção ao arranjo ou ao texto novo, e fica listada no `## Handoff` com o AC que a força:

1. `web/src/test/estrutura.test.ts`: `ux.test.tsx` entra em `Raiz`, como exceção nomeada (o arquivo é nomeado por
   este `checks.md`, como `tabela.test.tsx`).
2. `web/src/test/interface.test.ts`:
   - `tokens da paleta` e `tokens de Visual`: a tabela `Tokens` troca os valores de `--background`, `--muted`,
     `--border`, `--input` e `--accent` pelos `color-mix` da door 2, e `bloco()` passa a ler o `color-mix`;
   - `contraste dos tokens` e `contraste do painel de entrada`: o cálculo passa a ler o `color-mix`, e o limite de
     4,5 não muda (AC 4, AC 5, AC 39).
3. `web/e2e/arranjo.spec.ts`:
   - `arranjo Assistente`, `compositor visível com a conversa maior que a tela` e
     `Assistente: data pequena à direita, campo que cresce e erro abaixo do compositor` (AC 15, AC 18, AC 20);
   - `arranjo listas de chamados`, `colunas largas somem no estreito` e `texto das linhas de 14 px`, só nas linhas
     de Fila e Minhas solicitações (AC 21 a AC 23);
   - `detalhe em uma coluna a {largura} px`, `arranjo Detalhe do chamado` e
     `Detalhe: cartão da equipe antes da conversa e ações que quebram em linhas` (AC 24, AC 26);
   - `diálogos a 360 px com margem de 16 px` (AC 29);
   - `arranjo Indicadores`, `valores de tipo e bordas` e `alertas de Indicadores` (AC 31, AC 32);
   - `arranjo Artigos e Documentos` (AC 33);
   - `Matrículas: cabeçalho mono que quebra, resultado em Alert e erros em tabela que quebra o motivo` (AC 35);
   - `Cadastros: detalhe pequeno embaixo do nome` e `Cadastros com select no estreito` (AC 2, AC 36).
4. `web/e2e/celular.spec.ts`:
   - `listas viram cartões abaixo de 768`, só o bloco de Fila e Minhas solicitações;
   - `Ações do chamado no rodapé abaixo de 1024` e `ação no Sheet fecha e atualiza`;
   - o botão "Ações" de `alvos de toque de 44 px abaixo de 768` (AC 21, AC 24).
5. `web/e2e/aparencia.spec.ts`:
   - `arranjo Aparência`: abaixo de 1024 px, "Ver prévia" e o `Sheet` tomam o lugar de "Ocultar prévia" (AC 37);
   - `contato abaixo do número do chamado`: o número sai do título "Sua solicitação {número} foi para {setor}"
     (AC 16).
6. `web/e2e/push.spec.ts`: `avisos no cabeçalho` e `barra com o botão de avisos sem sobreposição`. Só o caso de
   360 px, e só se o topo do aluno perder o botão de avisos (AC 11, AC 12).
7. `web/e2e/anexos.spec.ts` (e2e real): `aluno anexa foto na conversa e a equipe baixa no chamado` passa a ler o
   número no bloco "Sua solicitação {número} foi para {setor}" e no link "Ver solicitação" (AC 16).
8. Vitest de tela:
   - `tabela.test.tsx`, `selo de estado com cor por grupo`: as classes de cor mudam por contraste e para tirar o
     `text-primary`, e os textos ficam (AC 6, AC 43);
   - `chamados/listas.test.tsx`: `Fila mostra cada chamado com categoria, responsável e dias`,
     `colunas das listas de chamados` e `lista com erro mostra o detail sem o Spinner`;
   - `chamados/textos.test.tsx`: `textos Fila`, `textos detalhe do chamado` e a lista de literais (AC 21 a AC 26,
     AC 31);
   - `chamados/resposta.test.tsx`, `a equipe responde ao chamado resolvido sem o aviso de reabrir`: passa a afirmar
     que não há formulário (AC 28);
   - `assistente/transferencia.test.tsx`: `transferido mostra protocolo e respostas`,
     `atualiza chamado a cada 15 s` e `pede escolha da matrícula`;
   - `assistente/boasvindas.test.tsx`, `contato na transferência`;
   - `assistente/conversa.test.tsx`, `falar com atendente sem conversa leva o texto digitado como descrição`;
   - `assistente/anexos.test.tsx`, `erro da API mantém texto e selos`;
   - `assistente/textos.test.tsx`: `textos Assistente` e a lista de literais (AC 16, AC 19, AC 20);
   - `conhecimento/artigos.test.tsx`: `colunas de Artigos e Documentos`, `lista vazia numa linha`,
     `ações de artigo no menu` e `ações de linha mostram o Spinner enquanto gravam`;
   - `conhecimento/documentos.test.tsx`: `tela Documentos lista, vazio e confirma arquivar`,
     `artigos mostram a indexação` e `ações de documento no menu`;
   - `conhecimento/edicao.test.tsx`: os textos de selo `ATIVO` e `ARQUIVADO` passam à caixa de frase, e
     `erro ao carregar mostra o detail sem Spinner nem vazio`;
   - `conhecimento/textos.test.tsx`: `textos Artigos`, `textos Documentos` e a lista (AC 31, AC 33, P11);
   - `indicadores/indicadores.test.tsx` (`rankings em tabela Categoria e Total` e `calendário em pt-BR`),
     `indicadores/icones.test.tsx` (`o período traz CalendarDays`) e `indicadores/textos.test.tsx`
     (`textos Indicadores` e a lista) (AC 32);
   - `administracao/admin.test.tsx`: `importação mostra as linhas com erro`, `tabela de erros com Linha e Motivo`
     e `colunas das tabelas de administração`;
   - `administracao/textos.test.tsx`: `textos Matrículas`, `textos Usuários` e a lista;
   - `administracao/usuarios.test.tsx`, `lista papéis, setores e o selo de desativado` (CPF formatado);
   - as asserções de `administracao/instituicoes.test.tsx` que leem o `detail` de erro de leitura da lista
     (AC 31, AC 34, AC 35);
   - `acesso/icones.test.tsx`, `Tema traz Sun e a escolha Escuro traz Moon`: o ícone passa a ser o do tema atual
     (AC 10).

## Decisões

Derivações que contradiziam o plano ou que ele deixava sem valor. Todas: decisão delegada pelo usuário em 04/11, sem mudança de API. O `plan.md` foi editado nos
critérios e em `## Screens` onde a decisão muda o sentido, com a nota em `## Assumptions`. A coluna "Decisão" é o que
os checks abaixo afirmam.

| # | Ponto | Decisão | Bloqueia |
| --- | --- | --- | --- |
| P1 | AC 22: "Resolvida em {data}" e "Encerrada em {data}". `GET /api/chamados?escopo=meus` devolve só `numero`, `titulo`, `estado` e `criadoEm` (`ListarChamados.Resposta`) | "Resolvida" e "Encerrada", sem data (C32) | não |
| P2 | AC 23 e Screens Fila: nome do aluno e setor. `RespostaDaFila` traz `categoria` e `responsavel`, sem aluno nem setor | a linha mostra a categoria (já vem na lista) e a data relativa, sem aluno nem setor (C31, C33) | não |
| P3 | AC 13 e Screens Conta: "nome e e-mail". `GET /api/auth/me` (`Eu.Resposta`) não traz e-mail | a Conta mostra o nome e o CPF mascarado (`cpfMascarado`), sem e-mail (C17, C19) | não |
| P4 | AC 24 não diz a ação principal em `AGUARDANDO_ALUNO` | "Responder", como em `EM_ATENDIMENTO` | não |
| P5 | AC 24: "em `FECHADO` só Mais", mas a API não dá ação nenhuma em `FECHADO` (`PermissoesChamado`), e o "Mais" abriria um `Sheet` vazio | em `FECHADO` sem ações, não há barra nem reserva de espaço | não |
| P6 | AC 43 contra usos aprovados da cor da marca: as iniciais `Sigla` em `bg-primary` (C36 e C69 de `aparencia-instituicao`), as barras do gráfico (`--chart-1: var(--primary)`) e o selo `ABERTO` em `text-primary` | `Sigla` é a marca da instituição e fica permitida. O gráfico e o selo deixam de usar `--primary` | não |
| P7 | AC 39 tinge o `--background` do Preto, que hoje é `#000` para OLED (C5 de `redesign-institucional`) | o `--background` do `.black` continua `#000`; só os outros 4 neutros são tingidos no Preto. `tema Preto com fundo preto` não muda (C52) | não |
| P8 | AC 32: "rótulo curto" e "frase em linguagem simples" não têm valor | rótulo de até 24 caracteres; frase de até 70 caracteres, terminada em ponto | não |
| P9 | AC 21 diz "aberto hoje/ontem/há N dias"; Screens de Minhas solicitações diz "hoje", "ontem", "há 3 dias" | o texto do AC nas duas listas, contado em dias de calendário no fuso da instituição a partir de `criadoEm` | não |
| P10 | AC 42 proíbe gradiente decorativo, mas C66 de `aparencia-instituicao` exige o `linear-gradient` da faixa sobre a imagem do login | a faixa do login não é decorativa e fica | não |
| P11 | AC 33 fala só de "Indexado", mas "um só selo por linha" não cabe com "Indexando" e "Falhou" em selo; `SeloEstado` e `SeloIndexacao` são de Artigos e de Documentos | os 3 valores de indexação viram ícone com dica, e Documentos muda junto | não |
| P12 | AC 10 cita "sol, lua ou tela", mas são 4 temas (o Preto usa `MoonStar`) | o ícone do botão é o mesmo da opção no menu, e a opção atual tem `aria-pressed="true"` | não |
| P13 | Screens pede "Falar com atendente" `outline`; hoje ele vira `default` em destaque (`sem_base`, depois do "Não" e no limite) | `outline` fora do destaque; em destaque segue `default` (`assistente.test.tsx` não muda) | não |
| P14 | AC 31 vale para qualquer falha? Um `404` "Chamado não encontrado." com "Verifique sua conexão" engana | AC 31 vale para `5xx` e falha de rede; `404` e `403` seguem com o `detail` da API | não |
| P15 | O teste independente de S4 manda "contar os toques". O fluxo novo tem os mesmos 6 cliques da auditoria (que contou 8 interações, 2 delas de digitação) | C64 afirma 6 cliques e 1 abertura de `Sheet`, contra 4 trocas entre folha e página da auditoria. O ganho está nas trocas, não nos cliques | não |
| P16 | AC 41 fala de "15 telas"; `Telas` (`e2e/simulada.ts`) tem 16, mais Conta e Instituições | C55 varre `Telas`, mais Conta e Instituições | não |

## Checks

### S1 - Toque, campos e contraste (P1) · ~33 files · ~194 KB · ~48k (com S2 e os tokens de S6)

**C1** - [x] A 390 px, em cada tela de `Telas` (`e2e/simulada.ts`), em Conta e em Instituições, todo elemento visível
destes 6 tipos mede altura ≥ 44 px:
- `Button` (`[data-slot=button]`, inclusive o "Remover {arquivo}" de um anexo escolhido no Assistente);
- `Input` (`[data-slot=input]`, sem `checkbox`, `radio` e `file`);
- `Textarea` de uma linha (`textarea[rows="1"]`, o compositor);
- `NativeSelect` (`[data-slot=native-select]`);
- item da barra lateral (`[data-sidebar=menu-button]`, medido na gaveta aberta);
- botão de ícone (`[data-slot=button][data-size^=icon]`).

O teste afirma ao menos 1 elemento de cada tipo antes de medir (AC 1)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "alvos de 44 px abaixo de 768 em todas as telas"`

**C2** - [x] Com ponteiro grosso (contexto `hasTouch: true` a 1024×768; o teste confere antes que
`matchMedia('(pointer: coarse)').matches` é `true`), os 6 tipos de C1 medem ≥ 44 px nas mesmas telas. O item da
barra lateral é medido com a barra aberta e com ela recolhida. Num contexto sem `hasTouch`, a 1024 px, o `Button`
`default` "Consultar" de Indicadores mede 36 px (AC 1)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "alvos de 44 px com ponteiro grosso a 1024"`

**C3** - [x] O `font-size` computado é ≥ 16 px em todo `[data-slot=input]` visível (sem `checkbox`, `radio` e `file`),
em todo `textarea` e em todo `[data-slot=native-select]`. Vale nas duas condições de C1 e C2: a 390 px e a
1024 px com `hasTouch: true`. Cada tipo é medido ao menos uma vez em cada condição: o CPF do Login, o compositor do
Assistente e o seletor de Cadastros (AC 2)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "campos de 16 px abaixo de 768 e com ponteiro grosso"`

**C4** - [x] O botão de fechar tem nome acessível "Fechar" e caixa ≥ 44×44 px em 3 casos:
- o `Dialog` "Encerrar a conversa?" a 360 px;
- o `Sheet` do "Mais" do detalhe do chamado a 390 px;
- o `Sheet` de formulário "Novo usuário" a 360 px.

Nenhum botão com nome "Close" existe nos 3. Em jsdom, `DialogContent` e `SheetContent` abertos têm cada um 1
botão "Fechar" e nenhum "Close" (AC 3)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "X de 44 px com o nome Fechar"`
Proof: `cd web && npx vitest run src/ux.test.tsx -t "Dialog e Sheet fecham por um botão Fechar"`

**C5** - [x] A 1280 px, no diálogo "Novo artigo", 3 campos têm borda com contraste ≥ 3:1 contra o fundo do diálogo:
`Input` (Título), `Textarea` (Perguntas relacionadas) e `NativeSelect` (Categoria). A cor da borda é composta sobre
o fundo opaco mais próximo. Vale nos temas Claro, Escuro e Preto, sem cor de instituição e com `#8a1538`
(table-driven, 18 medidas) (AC 4)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "borda dos campos com contraste de 3:1 nos três temas"`

**C6** - [x] A 390 px, com `GET /api/chamados?escopo=fila` atrasado 2 s, a lista mostra 3 `[data-slot=skeleton]`. O
`background-color` computado de cada um, sem a opacidade da animação, tem contraste ≥ 1,3:1 contra o fundo da
página nos temas Claro, Escuro e Preto (AC 5)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "esqueleto com contraste de 1,3:1 nos três temas"`

**C7** - [x] A 1280 px, o texto de cada selo tem contraste ≥ 4,5:1 contra o fundo do selo, composto sobre o fundo da
página. Vale nos temas Claro, Escuro e Preto, sem cor e com `#8a1538`, para 9 selos (table-driven):
- os 5 estados do chamado (`ABERTO`, `EM_ATENDIMENTO`, `AGUARDANDO_ALUNO`, `RESOLVIDO`, `FECHADO`), numa Fila
  simulada com 1 chamado por estado;
- "Ativo", "Rascunho" e "Arquivado" em Artigos;
- "Desativado" em Usuários (AC 6)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "selos com contraste de 4,5:1 nos três temas"`

**C8** - [x] Nenhum botão tem fundo verde. Em 4 telas, no tema Claro, o `background-color` de todo `button` visível é
diferente da cor de um elemento de referência pintado com `var(--success)`:
- o Assistente depois de uma resposta ("Sim");
- o diálogo de transferência ("Confirmar");
- o detalhe a 1280 px como equipe em `EM_ATENDIMENTO` ("Resolver");
- o detalhe como aluno em `RESOLVIDO` ("Confirmar resolução").

Os 4 botões citados têm `data-variant` `default` ou `outline`, cada um no seu caso. No código de `web/src` (sem os
testes), o token de cor `success` (`--success`, `bg-success`, `text-success`, `border-success` e variações com
opacidade) só aparece em `index.css`, em `chamados/Chamados.tsx` (selo do chamado) e em `conhecimento/comum.tsx` (selo
de situação); `toast.success` da biblioteca de avisos não é cor e fica de fora (AC 7, door 3; precisão por decisão
delegada pelo usuário em 04/11, depois do lote 1)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "nenhum botão verde"`
Proof: `cd web && npx vitest run src/ux.test.tsx -t "verde só nos selos"`

**C9** - [x] Em 3 telas, uma por papel (`ALUNO` em `/univag/assistente`, `ATENDENTE` em `/univag/fila`,
`ADMINISTRADOR` em `/univag/artigos`), o primeiro `Tab` a partir do `body` foca o link "Pular para o conteúdo".
`Enter` nele deixa `document.activeElement` igual ao elemento `main` (AC 8)
Proof: `cd web && npx vitest run src/ux.test.tsx -t "pular para o conteúdo leva o foco ao main"`

**C10** - [x] Um usuário de um só papel que abre uma rota de outro papel vai para `/{slug}/{telaInicial(me)}`, a tela
de `sessao.ts`. As rotas e os papéis são os 11 caminhos do menu (`Menu` de `Autenticado.tsx`, com `instituicoes`) mais `conta`:
- `ALUNO`: `assistente`, `solicitacoes`, `conta`;
- `ATENDENTE`: `fila`, `indicadores`;
- `ADMINISTRADOR`: `indicadores`, `artigos`, `documentos`, `usuarios`, `matriculas`, `cadastros`, `aparencia`;
- `OPERADOR`: `instituicoes`.

Table-driven, os 24 casos de `ALUNO`, `ATENDENTE` e `ADMINISTRADOR` fora do seu papel são redirecionados (9, 10 e
5). Os mesmos 3 papéis abrem as suas rotas sem redirecionamento. `chamados/:numero` e `trocar-senha` não têm guarda
de papel no web: a API responde por elas (AC 9)

Proof: `cd web && npx vitest run src/ux.test.tsx -t "rota de outro papel volta à tela inicial"`

**C11** - [x] Com `one-tema` em `light`, `dark`, `black` e `system` (4 casos), o botão "Tema" mostra o ícone da opção
atual: `Sun`, `Moon`, `MoonStar` e `Monitor`, comparados pelo `svg` que o lucide desenha. Aberto, a opção atual tem
`aria-pressed="true"` e as outras 3 têm `"false"` (AC 10)
Proof: `cd web && npx vitest run src/ux.test.tsx -t "botão de tema mostra e marca o tema atual"`

### S2 - Navegação do aluno no celular (P1) · ~13 files · ~101 KB · ~25k (no lote 1)

**C12** - [x] Com `matchMedia` casando `(max-width: 767px)` e `me.papeis` `['ALUNO']`, a casca tem um `nav` com
`aria-label` "Navegação" e exatamente 3 links, nesta ordem:
- "Assistente" → `/univag/assistente`;
- "Solicitações" → `/univag/solicitacoes`;
- "Conta" → `/univag/conta`.

Em cada uma das 3 rotas, o link dela tem `aria-current="page"`, e os outros 2 não têm o atributo (3 casos) (AC 11,
door 1)

Proof: `cd web && npx vitest run src/acesso/navegacao.test.tsx -t "barra de abas do aluno com 3 destinos e o ativo marcado"`

**C13** - [x] A 390×844, como aluno só `ALUNO`, o `nav` "Navegação" tem `position: fixed`, `bottom` = 844 e largura 390.
Os 3 links têm o mesmo `top`, largura 130 px cada e altura ≥ 44 px. Em cada link, o `bottom` do `svg` fica ≤ o `top`
do rótulo, o centro horizontal do `svg` fica a no máximo 1 px do centro do rótulo, e o rótulo tem `font-size` 12 px
(Screens: Casca do aluno; door 1)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "barra de abas: 3 colunas iguais e ícone sobre rótulo de 12 px"`

**C14** - [x] Nas 3 rotas da barra, a 390 px, o rótulo do link ativo tem `color` igual à de um elemento de referência
com `var(--primary)` e `font-weight` 600. Os 2 rótulos inativos têm `color` diferente dessa e peso menor que 600
(Screens: Casca do aluno)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "aba ativa na cor de ação e peso 600"`

**C15** - [x] A 390×844, com a área segura de 34 px (CDP), o `padding-bottom` computado do `nav` é 34 px. Em 4 telas
roladas até o fim, todo elemento focável visível do `main` (`a`, `button`, `input`, `textarea`, `select`,
`[tabindex]`) tem `bottom` ≤ `top` do `nav`:
- Assistente com 4 respostas longas;
- Minhas solicitações com 20 itens;
- Conta;
- detalhe do chamado do aluno em `ABERTO` (AC 12)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "nada focável fica sob a barra de abas"`

**C16** - [x] A 390 px, como aluno só `ALUNO`, a casca não tem o botão "Alternar barra lateral" e não mostra
`[data-sidebar=sidebar]`. O topo mostra as iniciais da instituição (sem ícone) com `right` ≤ `left` do `h1` e com
os centros verticais a no máximo 2 px um do outro (AC 12; Screens: Casca do aluno)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "topo do aluno sem botão de menu"`

**C17** - [x] Em `/univag/conta`, como `ALUNO`, a tela mostra no topo o nome "Ana" e o CPF mascarado "***.456.789-**" (P3), sem e-mail, e depois
as linhas nesta ordem:
- "Tema";
- "Avisos no celular";
- "Contato do atendimento";
- "Trocar senha";
- "Sair".

São 3 casos:
1. com push disponível (`suportado()` verdadeiro e `GET /api/push/chave` `200`) e com contato: as 5 linhas;
2. sem push (`GET /api/push/chave` `404`): sem "Avisos no celular";
3. sem contato (`contato` todo `null`): sem "Contato do atendimento" (AC 13)

Proof: `cd web && npx vitest run src/acesso/navegacao.test.tsx -t "Conta lista as linhas na ordem e só com push e contato"`

**C18** - [x] Na Conta, cada linha age assim (5 casos):
- "Tema" abre a escolha com "Claro", "Escuro", "Preto" e "Sistema", e escolher "Escuro" grava `one-tema` `dark`;
- "Avisos no celular" chama a mesma inscrição que o botão de avisos (`POST /api/push/subscricao`, a rota real; texto corrigido por decisão delegada em 04/11);
- "Contato do atendimento" abre um `Dialog` com o mesmo `Contato` de C45 de `aparencia-instituicao`;
- "Trocar senha" leva a `/univag/trocar-senha`;
- "Sair" faz `POST /api/auth/logout` e leva a `/univag` (AC 13)

Proof: `cd web && npx vitest run src/acesso/navegacao.test.tsx -t "linhas da Conta agem"`

**C19** - [x] A 390 px, na Conta:
- cada uma das linhas de C17 mede altura de 52 px (1 px) e é inteira o alvo: um clique a 4 px da borda direita
  dispara a ação dela;
- o bloco de nome e CPF não contém `a` nem `button`;
- em "Tema", o valor atual ("Sistema") tem `right` a no máximo 16 px do `right` da linha e o mesmo centro
  vertical (2 px);
- "Sair" é a última linha, com `color` igual à de um elemento de referência com `var(--destructive)` (Screens: Conta)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "Conta com linhas de 52 px e Sair por último"`

**C20** - [x] Não há `nav` "Navegação", e o botão "Alternar barra lateral" está visível, em 4 casos:
- `ALUNO` a 768 px;
- `ATENDENTE` a 390 px;
- `ADMINISTRADOR` a 390 px;
- `ALUNO` + `ATENDENTE` a 390 px (AC 14, door 1)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "sem barra de abas a 768 px e para a equipe"`

### S3 - Conversa com o assistente (P1) · ~14 files · ~112 KB · ~28k (no lote 2)

**C21** - Depois de uma resposta `tipo: 'resposta'`, o grupo "Isso resolveu?" é o elemento seguinte ao último
balão `.is-assistant`, dentro do `role="log"`. "Sim" e "Não" têm `data-variant="outline"`. Com 2 respostas, há 1
grupo só, depois da segunda (AC 15)
Proof: `cd web && npx vitest run src/assistente/revisao.test.tsx -t "Isso resolveu logo abaixo da última resposta"`

**C22** - A 390×844, com 3 respostas longas, o `top` do texto "Isso resolveu?" fica entre o `bottom` do último
balão e esse `bottom` + 24 px. O grupo e os seus ancestrais até o `main` não têm `position` `fixed` nem `sticky`
(AC 15; Screens: Assistente)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "Isso resolveu no fluxo sob a resposta"`

**C23** - A transferência para "Financeiro", com número `ONE-5`, deixa 3 coisas:
- o convite "Quer explicar melhor ou falar com um atendente?", que estava na tela depois do "Não", passa a ter 0
  ocorrências;
- a tela mostra "Sua solicitação ONE-5 foi para Financeiro", "A resposta chega em Solicitações e no seu e-mail.",
  o bloco "Contato do atendimento" e um link "Ver solicitação" com `href` `/univag/chamados/ONE-5`;
- "Transferido para" não aparece.

Sem contato, o bloco de contato não aparece, e o resto fica (2 casos) (AC 16)

Proof: `cd web && npx vitest run src/assistente/revisao.test.tsx -t "transferência mostra para onde foi e tira o convite"`

**C24** - A 390 px, depois da transferência com contato, o menor ancestral comum do título, da frase, do bloco de
contato e de "Ver solicitação" tem `border-width` ≥ 1 px nos 4 lados. Nenhum dos 4 fica dentro de outro elemento
com borda dentro desse bloco (Screens: Transferido)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "Transferido num bloco único com borda"`

**C25** - A 1440 px, com o texto longo (`Longa` de `arranjo.spec.ts`), a largura do elemento de texto do balão é ≤
a largura de 68 caracteres "0" na mesma fonte + 1 px. Vale em 2 lugares: no balão `.is-assistant` do Assistente e
no balão da conversa do detalhe do chamado (AC 17)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "balão com até 68 caracteres de largura"`

**C26** - A 390 e a 1440 px, o campo "Mensagem" mede altura ≥ 44 px. "Falar com atendente" tem `bottom` ≤ `top`
do `form` do compositor, e nenhum outro `button` ou `a` se sobrepõe a ele na vertical (linha própria). Sem
destaque, ele tem `data-variant="outline"` (P13) (AC 18; Screens: Assistente)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "compositor de 44 px e Falar com atendente na linha de cima"`
Proof: `cd web && npx vitest run src/assistente/revisao.test.tsx -t "Falar com atendente outline fora do destaque"`

**C27** - O texto "PDF ou foto, até 10 MB" aparece só em 2 condições (4 casos):
- na tela sem anexo, ele tem 0 ocorrências;
- com o foco no botão "Anexar arquivo", ele aparece (1);
- quando o foco sai, ele some (0);
- com 1 arquivo escolhido, ele aparece (1).

O texto de `<base>` "Fotos e PDFs de até 10 MB, ..." tem 0 ocorrências (AC 19)

Proof: `cd web && npx vitest run src/assistente/revisao.test.tsx -t "ajuda dos anexos só com arquivo ou clipe focado"`

**C28** - Um envio que falha com `500` `detail` "Falha simulada" mostra, como último filho do `role="log"`,
depois do balão do aluno, um `role="alert"` com "Falha simulada" e o botão "Reenviar". Nada de alerta fica abaixo
do compositor. "Reenviar" faz um segundo pedido com o mesmo corpo; com `201`, o alerta some, a resposta aparece e o
balão do aluno continua 1 só. São 3 casos:
- primeira mensagem (`POST /api/conversas`, JSON);
- segunda mensagem (`POST /api/conversas/1/mensagens`);
- mensagem com 1 anexo (multipart, mesmo nome de arquivo nos dois envios).

A 390 px, o `top` do alerta é ≥ o `bottom` do balão do aluno e ≤ o `top` do compositor (AC 20)

Proof: `cd web && npx vitest run src/assistente/revisao.test.tsx -t "erro de envio no lugar da resposta com Reenviar"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "erro de envio entre o balão e o compositor"`

### S4 - Solicitações, fila e chamado (P1) · ~18 files · ~124 KB · ~31k (no lote 2)

**C29** - A 390 px, em Fila (2 itens, `extremos`) e em Minhas solicitações (3 itens), cada `role="listitem"` tem
`border-left-width` e `border-right-width` 0, `border-radius` 0 e `box-shadow` `none`. Entre 2 itens seguidos há
uma divisória de 1 px ou mais: o `border-bottom-width` do primeiro ou o `border-top-width` do segundo, com distância
≤ 1 px entre eles. A 1024 px, as linhas da tabela têm `border-radius` 0 e `border-left-width` 0 (AC 21)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "listas em linhas com divisória e sem borda de cartão"`

**C30** - Com o fuso `America/Cuiaba` e o relógio em `2026-11-04T15:00:00Z`, cada linha de Fila e de Minhas
solicitações mostra o selo de estado em texto e a data relativa por `criadoEm`:
- `2026-11-04T13:00:00Z` → "aberto hoje";
- `2026-11-03T15:00:00Z` → "aberto ontem";
- `2026-11-01T15:00:00Z` → "aberto há 3 dias".

Com o relógio em `2026-11-04T04:10:00Z` (00h10 em Cuiabá) e `criadoEm` `2026-11-04T03:50:00Z` (23h50 do dia 3
em Cuiabá), a linha diz "aberto ontem", mesmo com `dias: 0` na Fila. São 8 casos (4 por lista), e "0 dias" nunca
aparece (P9) (AC 21; Screens: Fila)

Proof: `cd web && npx vitest run src/chamados/revisao.test.tsx -t "data relativa aberto hoje ontem e há N dias"`

**C31** - A 390 px, em cada linha de Minhas solicitações e da Fila, com o título longo de 104 caracteres:
- o assunto ocupa no máximo 2 linhas (altura ≤ 2 × `line-height` + 1 px);
- o selo e a data relativa têm o mesmo `top` (2 px), e esse `top` é ≥ o `bottom` do assunto − 1 px;
- na Fila, a categoria fica na mesma linha de meta que a data (mesmo `top`, 2 px);
- em Minhas solicitações, o próximo passo tem `font-size` 12 px e `top` ≥ o `bottom` do selo − 1 px
  (Screens: Minhas solicitações, Fila)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "linha de solicitação em 3 linhas"`

**C32** - Cada linha de Minhas solicitações mostra o próximo passo do estado (5 casos, table-driven):
- `ABERTO` e `EM_ATENDIMENTO` → "A equipe vai responder";
- `AGUARDANDO_ALUNO` → "Responda para continuar";
- `RESOLVIDO` → "Resolvida";
- `FECHADO` → "Encerrada".

Nenhum dos 5 mostra data (P1) (AC 22)

Proof: `cd web && npx vitest run src/chamados/revisao.test.tsx -t "próximo passo por estado"`

**C33** - Na Fila, cada linha mostra a categoria ("Financeiro > Boletos e mensalidades") e a data relativa, e
nenhuma mostra o nome do aluno nem o setor (P2). O texto "Mais antigos primeiro" vem antes da lista no DOM. A 390 px, o `bottom` desse texto é ≤ o `top` do primeiro item
(AC 23; Screens: Fila)
Proof: `cd web && npx vitest run src/chamados/revisao.test.tsx -t "Fila com categoria, data e Mais antigos primeiro"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "Mais antigos primeiro acima da Fila"`

**C34** - A 390 e a 1023 px, como equipe, o detalhe tem uma barra com `position: fixed` e `bottom` 0, de altura ≥
44 px, por estado (as `acoes` são as que `PermissoesChamado` dá ao atendente que não é o responsável):

| Estado | Botões da barra | O "Mais" abre um `Sheet` de baixo com |
| --- | --- | --- |
| `ABERTO` | "Assumir" e "Mais" | as outras ações, na ordem do cartão a 1024 px |
| `EM_ATENDIMENTO` | "Responder" e "Mais" | as outras ações, na mesma ordem |
| `AGUARDANDO_ALUNO` | "Responder" e "Mais" (P4) | as outras ações, na mesma ordem |
| `RESOLVIDO` | só "Mais" | "Reclassificar" |
| `FECHADO` | sem barra (P5) | - |

A 1024 px não há barra (5 casos table-driven por largura) (AC 24)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "barra do detalhe com a ação principal do estado"`

**C35** - A 390×844, em `EM_ATENDIMENTO`, um toque em "Responder" na barra deixa `document.activeElement` igual ao
campo "Responder" (`#resposta`). A caixa do campo fica inteira na janela, com `top` ≥ 49 px (abaixo do cabeçalho) e
`bottom` ≤ `top` da barra (AC 25)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "Responder rola até o campo e foca"`

**C36** - Como aluno, a 390 e a 1280 px (2 casos), o detalhe em `ABERTO` não tem botão "Ações" nem "Mais" e não
tem elemento `fixed` fora do `nav` "Navegação". "Cancelar solicitação" é o último elemento focável do `main`, com
`background-color` transparente e `color` igual a `var(--destructive)`. Tocar nele abre o `Dialog`
"Cancelar a solicitação?", e confirmar faz `POST /api/chamados/ONE-123/cancelar` (AC 26)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "aluno cancela por botão de texto no fim do detalhe"`
Proof: `cd web && npx vitest run src/chamados/revisao.test.tsx -t "aluno sem barra e Cancelar solicitação com confirmação"`

**C37** - A 390×844 e a 1023×844, como equipe em `EM_ATENDIMENTO`, com a página rolada até o fim, o `bottom` de
"Enviar" é ≤ o `top` da barra, e "Enviar" tem a altura inteira dentro da janela (AC 27; Screens: Detalhe)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "Enviar inteiro acima da barra no fim do detalhe"`

**C38** - Como equipe, não há campo "Responder" nem botão "Enviar" em 2 casos: `RESOLVIDO` com
`acoes: ['nota', 'reclassificar']` e `FECHADO` com `acoes: []`. Como aluno em `RESOLVIDO`, o campo
"Responder (reabre a solicitação)" continua (AC 28)
Proof: `cd web && npx vitest run src/chamados/revisao.test.tsx -t "sem formulário de resposta para a equipe em RESOLVIDO e FECHADO"`

### S5 - Formulários, erros e administração (P1) · ~33 files · ~248 KB · ~62k (lote 3)

**C39** - A 360×740, 6 diálogos de formulário ocupam a tela inteira. Cada um é aberto pelo seu botão:
- Artigos "Novo";
- Documentos "Enviar PDF";
- Usuários "Novo";
- Cadastros "Novo" na aba Setores;
- Instituições "Nova instituição";
- "Importar carga" no menu de uma instituição.

Em cada um (table-driven, 6 casos):
- a caixa do `role="dialog"` é (0, 0, 360, 740);
- o cabeçalho tem o título e o botão "Fechar" de 44×44 px;
- o rodapé tem exatamente 2 botões, "Cancelar" e a ação, com `bottom` = 740 antes de rolar;
- o corpo entre os dois tem `overflow-y` `auto` ou `scroll`, e em "Novo usuário" tem `scrollHeight` >
  `clientHeight`.

A 768 px, "Novo usuário" tem largura < 768 (AC 29; Screens: Diálogos de formulário)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "diálogos de formulário em tela inteira abaixo de 768"`

**C40** - Um `400` com erro de campo mostra o texto logo depois do campo, em 5 formulários (5 casos):
- Novo artigo, `errors.titulo`;
- Enviar PDF, `errors.titulo`;
- Novo usuário, `errors.cpf` "CPF inválido.";
- Cadastros/Setores, `errors.nome`;
- Nova instituição, `errors.slug`.

Em cada caso:
- o texto vem depois do campo no DOM e antes do rótulo do campo seguinte;
- o campo tem `aria-invalid="true"` e `aria-describedby` com o `id` do texto;
- o texto não fica no rodapé de ações.

A 360 px, em Novo usuário, o `top` do erro é ≥ o `bottom` do campo CPF e ≤ esse `bottom` + 24 px (AC 30;
Screens: Diálogos de formulário)

Proof: `cd web && npx vitest run src/administracao/revisao.test.tsx -t "erro de campo da API abaixo do campo"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "erro do CPF abaixo do campo a 360"`

**C41** - Uma leitura que responde `500` mostra um `role="alert"` com 3 partes: um `svg`, o texto
"Não foi possível carregar {o quê}. Verifique sua conexão." e o botão "Tentar de novo". O botão faz um segundo
`GET` à mesma URL; com `200`, o alerta some e o conteúdo aparece. São 11 superfícies (table-driven), com o
{o quê} de cada uma:

| Superfície | {o quê} |
| --- | --- |
| Minhas solicitações | "suas solicitações" |
| Fila | "a fila" |
| detalhe como aluno | "a solicitação" |
| detalhe como equipe | "o chamado" |
| Artigos | "os artigos" |
| Documentos | "os documentos" |
| Usuários | "os usuários" |
| Cadastros | "os cadastros" |
| Indicadores | "os indicadores" |
| Aparência | "a aparência" |
| Instituições | "as instituições" |

Um `404` no detalhe mostra o `detail` da API (P14) (AC 31; Screens: Erros de carregamento)

Proof: `cd web && npx vitest run src/ux.test.tsx -t "erro de carregamento com Tentar de novo em 11 telas"`

**C42** - Em Indicadores:
- o período tem 1 controle: os campos "De" e "Até" de `type="date"`, sem botão
  "Escolher período no calendário"; o único outro botão do formulário é "Consultar";
- cada um dos 4 destaques tem o número, um rótulo de até 24 caracteres e uma frase de até 70 caracteres terminada
  em ponto (P8);
- cada um dos 2 rankings tem um botão "Ver tabela" com `aria-expanded="false"` e a tabela fora do DOM. Um clique
  mostra a tabela e põe `aria-expanded="true"` (2 casos) (AC 32)

Proof: `cd web && npx vitest run src/indicadores/revisao.test.tsx -t "um controle de período, destaques e Ver tabela"`

**C43** - A 390 px, os 4 destaques de Indicadores ficam em 2 colunas: 2 valores distintos de `left` e 2 linhas,
com o mesmo `top` (1 px) em cada par. A 1440 px, ficam em 4 colunas, como em `<base>` (AC 32; Screens: Indicadores)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "destaques de Indicadores em 2 colunas no celular"`

**C44** - Em Artigos, cada linha tem exatamente 1 `[data-slot=badge]`, com o texto do estado em caixa de frase
(3 casos): `ATIVO` → "Ativo", `RASCUNHO` → "Rascunho", `ARQUIVADO` → "Arquivado". A indexação é um `svg` com nome
acessível e dica iguais ao valor (3 casos: "Indexado", "Indexando", "Falhou"), sem `[data-slot=badge]`. Documentos
segue a mesma regra (P11) (AC 33)
Proof: `cd web && npx vitest run src/conhecimento/revisao.test.tsx -t "um selo de situação e a indexação em ícone"`

**C45** - A 1280 px, em Artigos, o ícone de indexação fica à direita do título: `left` do ícone ≥ `right` do
texto do título e a no máximo 8 px dele, com os centros verticais a no máximo 2 px (Screens: Artigos)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "Indexado em ícone ao lado do título"`

**C46** - Com a lista de Artigos vazia, não há botão de nome exato "Novo", e o botão "Novo artigo" do vazio existe.
Com 1 artigo, "Novo" existe (2 casos) (Screens: Artigos)
Proof: `cd web && npx vitest run src/conhecimento/revisao.test.tsx -t "Novo some com a lista vazia"`

**C47** - Em Usuários:
- o CPF `12345678909` aparece como "123.456.789-09";
- um campo com rótulo "Buscar por nome, CPF ou e-mail" filtra a lista, com 2 usuários, em 5 casos:
  - "carla" (nome, sem caixa) → 1 linha;
  - "123.456" (CPF com máscara) → 1;
  - "123456" (CPF só dígitos) → 1;
  - "albuquerque@" (e-mail) → 1;
  - "zzz" → 0.

A 390 px, o `bottom` do campo é ≤ o `top` do primeiro item (AC 34; Screens: Usuários)

Proof: `cd web && npx vitest run src/administracao/revisao.test.tsx -t "CPF formatado e busca por nome, CPF ou e-mail"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "busca de Usuários acima da lista"`

**C48** - Em Matrículas:
- há uma `ol` com 3 itens, nesta ordem: "Baixe o modelo", "Preencha uma linha por aluno" e "Envie o arquivo";
- o botão "Baixar modelo (CSV)" dispara um download `.csv` cuja primeira linha é exatamente
  `cpf;nome;email;matricula;curso;semestre;situacao`, o cabeçalho de `Matriculas.tsx` em `<base>`;
- um `400` com 2 erros (`linha` 2 e 5) mostra 2 linhas de erro, e cada uma tem o texto "Linha 2" (e
  "Linha 5") e o motivo no mesmo elemento de linha (AC 35; Screens: Matrículas)

Proof: `cd web && npx vitest run src/administracao/revisao.test.tsx -t "Matrículas em 3 passos com modelo e erros por linha"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "Baixar modelo baixa o CSV com o cabeçalho"`

**C49** - A 390 e a 1280 px, nas 5 listas de Cadastros (Setores, Categorias, Cursos, Regras, Respostas prontas;
table-driven, cada uma com 1 item), a linha mede altura ≥ 48 px. Um clique a 4 px da borda direita da linha, no
centro vertical, abre o diálogo de edição desse item (AC 36; Screens: Cadastros)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "linha inteira de Cadastros é o alvo de 48 px"`

**C50** - A 390 e a 1023 px, na tela Aparência:
- o campo "Cor principal" está visível, e nenhum elemento da prévia está visível antes do primeiro campo;
- o botão "Ver prévia" abre um `role="dialog"` que contém a prévia (o botão "Entrar" da prévia).

A 1024 px, a prévia fica ao lado do formulário, e não há "Ver prévia" (AC 37; Screens: Aparência)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "Aparência com o formulário primeiro e Ver prévia"`

**C51** - No tema Escuro, com a cor `#8a1538`, o botão "Entrar" da prévia tem `background-color` e `color` iguais
aos do botão `default` "Salvar" da própria tela Aparência. O contraste entre os dois é ≥ 4,5:1 (AC 38;
Screens: Aparência)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "prévia escura com a mesma cor do app"`

### S6 - Identidade visual sem cara de modelo (P2) · ~7 files · ~38 KB · ~9k (tokens no lote 1, varreduras no lote 3)

**C52** - [x] Em `index.css`, os blocos `:root` e `.dark` declaram os 5 tokens `--background`, `--muted`, `--border`,
`--input` e `--accent`, e o `.black` declara os 4 últimos, no formato
`color-mix(in oklch, var(--marca, <azul de base>) N%, <neutro de base>)`, com N inteiro de 2 a 6 (table-driven,
14 declarações). O `--background` do `.black` continua `oklch(0 0 0)` (P7). No Chromium, para cada uma das 14
combinações de token e tema, a cor computada com `--marca: #8a1538` difere da cor com `--marca: #1f7a3a`. No
Preto, o fundo do `body` é o pixel `[0, 0, 0]` com as duas marcas e sem marca, e `tema Preto com fundo preto` passa
sem edição (AC 39, door 2)
Proof: `cd web && npx vitest run src/ux.test.tsx -t "neutros tingidos pela marca nos três temas"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "neutros mudam com a cor da instituição"`

**C53** - [x] Nos temas Claro, Escuro e Preto, sem cor, com `#8a1538` e com `#224fa7`, as cores computadas têm
contraste ≥ 4,5:1 em 3 pares (table-driven, 27 medidas): `--foreground` sobre `--background`,
`--muted-foreground` sobre `--background` e `--muted-foreground` sobre `--muted` (AC 39)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "texto com 4,5:1 sobre os neutros tingidos"`

**C54** - [x] O `font-variation-settings` computado é `"opsz" 32` em 2 casos: o `h1` do Login e o `h2` "Olá! Eu sou
Assistente." do Assistente. O corpo (`body`) não tem `opsz` declarado. `main.tsx` importa
`@fontsource-variable/inter/opsz.css`, e `dependencies` do `package.json` têm um só pacote de fonte,
`@fontsource-variable/inter` (AC 40, door 2)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "títulos com opsz 32 da Inter"`
Proof: `cd web && npx vitest run src/ux.test.tsx -t "opsz da Inter sem fonte nova"`

**C55** - A 390 e a 1440 px, em cada tela de `Telas`, em Conta e em Instituições (P16), o conjunto de `font-size`
computados dos elementos visíveis com texto próprio (inclusive o `text` dos `svg`) está contido em
{12, 14, 16, T}, com um só T por tela, igual a 20 ou a 24 px (AC 41, door 2)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "no máximo 4 tamanhos de texto por tela"`

**C56** - Sem `Sparkles`, emoji em título nem gradiente decorativo:
- nenhum arquivo de `web/src` fora dos testes contém `Sparkles`;
- a 1440 px, em cada tela de `Telas`, em Conta e em Instituições, nenhum `h1`, `h2` ou `h3` tem caractere
  `\p{Extended_Pictographic}`;
- nenhum elemento tem `background-image` com `gradient`, exceto a faixa sobre a imagem do login com imagem (P10,
  C66 de `aparencia-instituicao`) (AC 42)

Proof: `cd web && npx vitest run src/ux.test.tsx -t "sem Sparkles no código"`
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "sem emoji em título nem gradiente"`

**C57** - A 1440 px, tema Claro, com `#8a1538`, em cada tela de `Telas`, em Conta (a 390 px) e em Instituições, sem
foco em nada, cada elemento visível com a cor de ação cai num destes casos (P6):
- `background-color` igual a `var(--primary)`: é `[data-slot=button][data-variant=default]`, um item ativo
  (`[aria-current=page]` ou `[data-active=true]`) ou a `Sigla`;
- `color` igual a `var(--primary)`: é um `a`, um `[data-variant=link]` ou um item ativo;
- nenhum `svg` do gráfico tem `fill` igual a `var(--primary)`;
- nenhum elemento tem `border-color` igual a `var(--primary)`.

Com o foco por `Tab` num campo, a borda dele passa a ter a cor de foco (AC 43, door 3)

Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/ux.spec.ts -g "cor de ação só em botão principal, item ativo, link e foco"`

**C58** - Como `ALUNO`, nenhum texto visível de Assistente (com conversa e transferido), Minhas solicitações,
detalhe do chamado e Conta contém "chamado" (sem caixa). Como `ATENDENTE`, o vazio da Fila continua
"Nenhum chamado na fila dos seus setores." (Impact: textos)
Proof: `cd web && npx vitest run src/ux.test.tsx -t "aluno lê Solicitação e a equipe lê Chamado"`

### S0 - Invariantes e barreiras (P1)

**C59** - A suíte Vitest inteira e `npm --prefix web run build` passam. As edições em asserções existentes são só
as da lista fechada, cada uma listada no `## Handoff` com o seu AC (AC 1 a AC 43)
Proof: `npm --prefix web test`
Proof: `npm --prefix web run build`

**C60** - O `crapper` sobre `web/src` sai 0 no limite 9.99, e o `dryer` não acha candidato com nota 0.8 ou mais. Os
arquivos novos da raiz de `web/src` entram na lista do `dryer` no mesmo commit que os cria (L-031) (AD-018)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao -s src/ilustracoes --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx src/sw.ts src/push.ts src/AvisosPush.tsx src/aparencia.tsx | grep -q "No duplicate candidates found"`

**C61** - A suíte de arranjo passa inteira com a API simulada: `arranjo.spec.ts`, `celular.spec.ts`,
`aparencia.spec.ts`, `instituicoes.spec.ts`, `push.spec.ts` e `ux.spec.ts` (Screens)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/aparencia.spec.ts e2e/instituicoes.spec.ts e2e/push.spec.ts e2e/ux.spec.ts`

**C62** - Nenhum arquivo de `api/` nem de `api.Tests/` muda entre `<base>` e `HEAD`; P1 a P3 foram decididos sem
mudança de API (Flow: sem mudança de API)
Proof: `git diff --quiet <base> HEAD -- api api.Tests`

**C63** - [x] De ponta a ponta, na imagem própria (porta 8087), um aluno só `ALUNO` da instituição `e2e`, a 390×844:
1. entra e cai em Assistente com o link "Assistente" em `aria-current="page"`;
2. toca "Solicitações" e vê a lista, com o link marcado;
3. toca "Conta" e vê as linhas de C17;
4. toca "Sair" e volta ao Login, e um `GET /api/auth/me` seguinte responde `401`.

O spec loga 1 vez (AC 11, AC 13, door 1)

Proof: `cd web && E2E_URL=http://localhost:8087 npx playwright test e2e/ux-real.spec.ts -g "aluno navega pelas abas e sai pela Conta"`

**C64** - De ponta a ponta, na imagem própria, um atendente a 390×844 abre um chamado `ABERTO` do seu setor (criado
pelo aluno de C63 por `POST /api/atendimento-direto`) e o leva a `RESOLVIDO` com exatamente 6 cliques:
1. a linha da Fila;
2. "Assumir";
3. "Responder";
4. "Enviar";
5. "Mais";
6. "Resolver".

Há 2 preenchimentos (resposta e resolução) e 1 só abertura de `Sheet`. O selo termina em "Resolvido". O spec loga
1 vez, como atendente (P15) (AC 24, AC 25, AC 27)

Proof: `cd web && E2E_URL=http://localhost:8087 npx playwright test e2e/ux-real.spec.ts -g "atendente assume, responde e resolve no celular"`

**C65** - A suíte e2e inteira passa contra a imagem própria do `HEAD` na porta 8087. A única edição no e2e real
fora de `ux-real.spec.ts` é o item 7 da lista fechada (Flow 1: a navegação muda)
Proof: `cd web && E2E_URL=http://localhost:8087 npx playwright test`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| componentes de 44 px (6) × condição (2) | `Button` C1, C2 · `Input` C1, C2 · `Textarea` de uma linha C1, C2 · `NativeSelect` C1, C2 · item da barra lateral C1, C2 · botão de ícone C1, C2 | - |
| campos de 16 px (3) | `Input` C3 · `Textarea` C3 · `NativeSelect` C3 | - |
| botão Fechar (3) | `Dialog` C4 · `Sheet` de ações C4 · `Sheet` de formulário C4, C39 | - |
| temas (3) nos contrastes | Claro C5, C6, C7, C53 · Escuro C5, C6, C7, C51, C53 · Preto C5, C6, C7, C53 | - |
| cor de instituição nos contrastes (3) | sem cor C5, C7, C53 · `#8a1538` C5, C7, C51, C53 · `#224fa7` C53 | - |
| selos (9) | `ABERTO` C7 · `EM_ATENDIMENTO` C7 · `AGUARDANDO_ALUNO` C7 · `RESOLVIDO` C7 · `FECHADO` C7 · "Ativo" C7, C44 · "Rascunho" C7, C44 · "Arquivado" C7, C44 · "Desativado" C7 | - |
| botões que deixam o verde (4) | "Resolver" C8 · "Sim" C8, C21 · "Confirmar resolução" C8 · "Confirmar" C8 | - |
| papéis e rotas da guarda (24) | C10, table-driven sobre os 24 casos (9 de `ALUNO`, 10 de `ATENDENTE`, 5 de `ADMINISTRADOR`) | - |
| temas do botão Tema (4) | Claro C11 · Escuro C11 · Preto C11 · Sistema C11 | - |
| pular para o conteúdo, por papel (3) | `ALUNO` C9 · `ATENDENTE` C9 · `ADMINISTRADOR` C9 | - |
| abas do aluno (3) | "Assistente" C12, C13, C14, C63 · "Solicitações" C12, C13, C14, C63 · "Conta" C12, C13, C14, C63 | - |
| telas sem nada sob a barra (4) | Assistente C15 · Minhas solicitações C15 · Conta C15 · detalhe do aluno C15 | - |
| linhas da Conta (6) | nome e CPF mascarado C17, C19 · "Tema" C17, C18, C19 · "Avisos no celular" C17, C18 · "Contato do atendimento" C17, C18 · "Trocar senha" C17, C18 · "Sair" C17, C18, C19, C63 | - |
| condições da Conta (3) | com push e contato C17 · sem push C17 · sem contato C17 | - |
| casos sem barra de abas (4) | `ALUNO` a 768 C20 · `ATENDENTE` a 390 C20 · `ADMINISTRADOR` a 390 C20 · `ALUNO` + `ATENDENTE` a 390 C20 | - |
| ajuda dos anexos (4) | sem anexo C27 · clipe focado C27 · foco sai C27 · arquivo escolhido C27 | - |
| envio com erro (3) | primeira mensagem C28 · segunda mensagem C28 · com anexo C28 | - |
| transferência (2) | com contato C23, C24 · sem contato C23 | - |
| balões de 68ch (2) | Assistente C25 · detalhe do chamado C25 | - |
| data relativa (4) × lista (2) | hoje C30 · ontem C30 · há 3 dias C30 · virada da meia-noite no fuso C30 | - |
| próximo passo por estado (5) | `ABERTO` C32 · `EM_ATENDIMENTO` C32 · `AGUARDANDO_ALUNO` C32 · `RESOLVIDO` C32 · `FECHADO` C32 | - |
| barra do detalhe por estado (5) | `ABERTO` C34, C64 · `EM_ATENDIMENTO` C34, C35, C37, C64 · `AGUARDANDO_ALUNO` C34 · `RESOLVIDO` C34, C38 · `FECHADO` C34, C38 | - |
| larguras do detalhe (3) | 390 C34, C35, C36, C37 · 1023 C34, C37 · 1024 ou mais C34, C36 | - |
| diálogos de formulário (6) | Novo artigo C39, C40 · Enviar PDF C39, C40 · Novo usuário C39, C40 · Cadastros C39, C40 · Nova instituição C39, C40 · Importar carga C39 | - |
| superfícies de erro de carregamento (11) | C41, table-driven sobre as 11 (Minhas solicitações, Fila, detalhe do aluno, detalhe da equipe, Artigos, Documentos, Usuários, Cadastros, Indicadores, Aparência, Instituições) | - |
| superfícies de erro (3) | carregamento C41 · envio no assistente C28 · campo de formulário C40 | - |
| rankings com "Ver tabela" (2) | "Categorias por conversas" C42 · "Categorias por chamados" C42 | - |
| indexação (3) | "Indexado" C44, C45 · "Indexando" C44 · "Falhou" C44 | - |
| busca de Usuários (5) | nome C47 · CPF com máscara C47 · CPF só dígitos C47 · e-mail C47 · sem resultado C47 | - |
| listas de Cadastros (5) | C49, table-driven sobre as 5 (Setores, Categorias, Cursos, Regras, Respostas prontas) | - |
| tokens neutros tingidos (14) | C52, table-driven sobre as 14 declarações e as 14 comparações (5 no Claro, 5 no Escuro, 4 no Preto) | - |
| fundo do Preto `#000` (3 marcas) | sem marca C52 · `#8a1538` C52 · `#1f7a3a` C52 | - |
| títulos com `opsz` (2) | `h1` C54 · `h2` C54 | - |
| one-way doors do `Landing` (3) | 1 C12, C13, C15, C17, C20, C63 · 2 C52, C53, C54, C55 · 3 C8, C57 | - |
| frases e itens de arranjo de `## Screens` (47) | barra na base com 3 colunas C13 · ativo na cor de ação e 600 C14 · reserva da barra C15 · topo sem menu C16 · linhas de 52 px C19 · nome e CPF sem ação C19 · Tema com valor à direita C19 · Avisos C17 · Contato quando há C17 · Trocar senha C17 · Sair destrutivo por último C19 · compositor 44 e Falar em linha própria C26 · ajuda dos anexos C27 · Isso resolveu no fluxo C21, C22 · balão 68ch C25 · Transferido bloco com borda C24 · título e frase do Transferido C23 · contato no Transferido C23 · Ver solicitação C23 · convite some C23 · linhas sem borda de cartão C29 · assunto em até 2 linhas C31 · selo e data na 2ª linha C31 · próximo passo na 3ª linha C31, C32 · Fila com categoria e data C33 · "aberto hoje" e nunca "0 dias" C30 · Mais antigos primeiro C33 · barra do atendente por estado C34 · Responder rola e foca C35 · aluno sem barra e Cancelar de texto C36 · reserva da barra no detalhe C37 · diálogo em tela inteira C39 · cabeçalho, corpo e rodapé do diálogo C39 · erro abaixo do campo C40 · bloco de erro de carregamento C41 · erro de envio com Reenviar C28 · um controle de período C42 · 4 destaques em 2 colunas C43 · número, rótulo e frase C42 · Ver tabela C42 · um selo e Indexado em ícone C44, C45 · Novo some no vazio C46 · CPF formatado e busca C47 · Matrículas em 3 passos C48 · linha de Cadastros de 48 px C49 · Aparência formulário primeiro C50 · prévia escura C51 | - |

- `## Screens` foi lido frase a frase e item a item de lista: 47 afirmações de arranjo, cada uma com o seu token (L-049, L-070)
- Os claims de arranjo, medida e cor (C1 a C7, C13 a C16, C19, C20, C22, C24 a C26, C28, C29, C31, C33 a C37, C39,
  C40, C43, C45, C47 a C57) são provados no Chromium, com `boundingBox()`, `getComputedStyle` e cor lida por
  `canvas`; o jsdom não mede layout
- Os claims de decisão (C9 a C12, C17, C18, C21, C23, C27, C28, C30, C32, C38, C41, C42, C44, C46 a C48) têm prova
  no Vitest, um caso por linha da tabela
- Nenhum check afirma uma rota de API nova: `## Surface` é "None", e C62 prova que `api/` não muda

## Swept

- validation: C40 (o erro de campo da API fica abaixo do campo, nos 5 formulários), C47 (a busca aceita CPF com e sem máscara)
- failure modes: C28 (o envio falha e o aluno reenvia), C41 (a leitura falha e a tela refaz a consulta)
- idempotency: C28 ("Reenviar" faz 1 pedido por toque, e o balão do aluno não se repete)
- authorization: C10 (guarda de papel nas rotas do web); existing - a API responde `403` a toda rota fora do papel (`Sessao`, grupos `/admin` e `/plataforma`), e C62 prova que ela não muda
- concurrency: existing - uma ação do chamado que perde a corrida recebe `409`, e `ChamadoDetalhe` relê o chamado e mostra o `detail`; nada novo grava
- data lifecycle: n/a - nada gravado muda (`## Relations`: None); "Sair" da Conta é o mesmo `POST /api/auth/logout`
- dependency failure: C41 (API fora na leitura), C28 (API fora no envio)
- state transitions: C32 (próximo passo por estado), C34 (barra por estado), C38 (formulário some em `RESOLVIDO` e `FECHADO`), C64 (`ABERTO` → `EM_ATENDIMENTO` → `RESOLVIDO` no celular)
- observability: n/a - só o `web/` muda, e nenhuma decisão nova precisa de log

## Handoff

Tamanho: bytes dos arquivos que cada lote lê e edita (`wc -c` em `HEAD` em 04/11/2026, união sem repetir arquivo),
divididos por 4. Somam-se:
- os trechos de `e2e/arranjo.spec.ts` (94 KB inteiro, ~23k) que o lote edita, ~8k por lote;
- `plan.md` mais este `checks.md`, ~18k por lote;
- o código e os testes novos.

| Lote | Slices e checks | Arquivos (união) | Conta |
| --- | --- | --- | --- |
| 1. Casca e base visual | S1, S2 e os tokens de S6: C1 a C20, C52 a C54, C63 | `ui/` (button, input, textarea, native-select, dialog, sheet, skeleton, sidebar, badge), `index.css`, `main.tsx`, `Autenticado.tsx`, `App.tsx`, `sessao.ts`, `api.ts`, `aparencia.tsx`, `AvisosPush.tsx`, `push.ts`, `Acesso.tsx`, `Chamados.tsx` (selo), `conhecimento/comum.tsx` (selo), `Grafico.tsx`, `Marca.tsx`, `interface.test.ts`, `estrutura.test.ts`, `tabela.test.tsx`, `acesso.test.tsx`, `acesso/textos.test.tsx`, `celular.spec.ts`, `push.spec.ts`, `simulada.ts`, `util.tsx`, `setup.ts`: 194 KB | 48k + 8k + 18k + ~22k novos (Conta, barra de abas, `ux.spec.ts`, `ux.test.tsx`, `navegacao.test.tsx`) ≈ **96k** |
| 2. Conversa e chamados | S3 e S4: C21 a C38 | `Assistente.tsx`, `Anexos.tsx`, `Balao.tsx`, `ui/message.tsx`, `ui/conversation.tsx`, `ChamadoDetalhe.tsx`, `Chamados.tsx`, `Conversa.tsx`, `Tabela.tsx`, `ui/table.tsx`, `datas.ts`, `chamado.ts`, `acao.tsx`, os 6 testes de `assistente/` e os 5 de `chamados/` da lista fechada, `tabela.test.tsx`, `celular.spec.ts`, `simulada.ts`, `util.tsx`: 203 KB | 51k + 8k + 18k + ~15k novos ≈ **92k** |
| 3. Administração e varreduras | S5 e as varreduras de S6: C39 a C51, C55 a C58, depois S0 inteiro (C59 a C62, C64, C65) | `Editor.tsx`, `Campo.tsx`, `Confirmar.tsx`, `ErroDe.tsx`, `Periodo.tsx`, `ui/dialog.tsx`, `ui/sheet.tsx`, `acao.tsx`, `Artigos.tsx`, `Documentos.tsx`, `conhecimento/comum.tsx`, `Usuarios.tsx`, `Cadastros.tsx`, `Instituicoes.tsx`, `Matriculas.tsx`, `Indicadores.tsx`, `Aparencia.tsx`, `PreviaAparencia.tsx`, os 13 testes de `administracao/`, `conhecimento/` e `indicadores/` da lista fechada, `aparencia.spec.ts`, `simulada.ts`, `util.tsx`: 248 KB | 62k + 8k + 18k + ~20k novos ≈ **108k** |

Estimativa:
- Um construtor só: 96k + 92k + 108k ≈ 296k, quase o dobro do orçamento de 150k.
- Corte proposto onde a superfície muda, em 3 lotes sequenciais, cada um só depois do anterior verde:
  1. Lote 1: a casca e os componentes de `ui/` que todas as telas herdam.
  2. Lote 2: as telas do aluno e do atendente (`assistente/`, `chamados/`).
  3. Lote 3: as telas de administração. As varreduras de todas as telas (C55 a C57) e as barreiras finais fecham
     aqui, porque só medem certo depois que as telas mudaram.
- Cada lote roda C59 a C61 antes de passar adiante. C63 fecha no lote 1, e C64 e C65 no lote 3.
- Mecanismo: handoff em lotes sequenciais - decisão delegada pelo usuário em 04/11

### Lote 1 (casca e base visual)

- **Feature base:** `56cf9d3`.
- **Boundary:** lote 1 fechado em `3ad84e4`, `5cbeca1`, `ee05032`, `8d68a79` e `2be0803`, mais o commit deste handoff. C1 a C20, C52 a C54 e C63 marcados `[x]`. C59 a C61 verdes no fim do lote e **sem marca** (a prova de C59 a C61 só fecha no lote 3): Vitest 399 verdes em 43 arquivos (340 da base mais 48 de `ux.test.tsx` e 11 de `acesso/navegacao.test.tsx`), `npm --prefix web run build` ok, `crapper` sai 0 no limite 9.99 (maior nota 9.8, `Sidebar`; `Autenticado` foi dividido em `desvio` e `Casca` para sair de 17), `dryer` sem candidato, layout (`arranjo`, `celular`, `aparencia`, `instituicoes`, `push` e `ux`) 115 verdes contra `vite preview` na 5199. C63 verde contra a imagem de `2be0803` na 8087 (instituição `e2e`, banco `one_revisao_ux`, bucket `one-revisao-ux`); contêiner, imagem, banco, bucket e worktree removidos. `api/` não mudou. A suíte e2e real inteira (C65) fica para o lote 3.
- **Settled mid-build:** nada com o usuário; decisões do construtor, para o orquestrador e o Verifier:
  1. C8 pede que a palavra `success` só apareça em `index.css`, `Chamados.tsx` e `comum.tsx`, mas `toast.success(...)` (API do Sonner, em `acao.tsx` e `administracao/Aparencia.tsx`) e a chave `success` de `ui/sonner.tsx` a trazem. O teste `verde só nos selos` procura o **token de cor** (`bg-success`, `text-success`, `--success` etc.), que é o que AC 7 e a door 3 proíbem em botão. Se o texto literal for a exigência, é preciso trocar as chamadas do Sonner.
  2. C18 cita `POST /api/push/inscricoes`, mas a rota real é `POST /api/push/subscricao`; o teste usa a real.
  3. C4: o botão da barra do detalhe ainda se chama "Ações" (o "Mais" nasce em C34, lote 2) e "Novo usuário" ainda é `Dialog` (vira `Sheet` em C39, lote 3). O teste abre `/^(Mais|Ações)$/` e acha o `role="dialog"`; o lote 2 pode estreitar para "Mais".
  4. O aluno com a barra de abas **mantém Avisos e Tema no topo** (a Conta repete as duas linhas): `acesso.test.tsx` `sem tema gravado segue o sistema` simula `matchMedia` casando toda consulta, e `push.spec.ts` mede o botão de avisos a 360 px; assim nenhuma dessas asserções mudou.
  5. C7 pede os selos "Ativo", "Rascunho" e "Arquivado", então a caixa de frase de `SeloEstado` veio neste lote (as classes dos 3 selos não mudaram); o ícone de indexação e o resto de AC 33 seguem no lote 3. Os selos do chamado deixaram `text-primary`/`bg-primary-subtle`: Aberto e Em atendimento `bg-accent text-foreground`, Resolvido e Fechado `bg-success/15 text-foreground` (o verde com texto verde dava menos de 4,5:1).
  6. O contrato `--barra` (altura da barra de abas mais a área segura, definida no `SidebarProvider` só quando a barra aparece) é lido pelo compositor fixo do Assistente (`bottom` e `min-h`) e pela barra "Ações" do detalhe (`bottom`), para C15; o lote 2 troca essa barra do aluno por "Cancelar solicitação" no fim da página.
  7. `telaInicial` ganhou `OPERADOR` -> `instituicoes` (sem isso a guarda de AC 9 mandava o operador puro de volta para uma rota que não é dele, em laço); a guarda também não redireciona quando o destino é a própria rota.
  8. Door 2: o neutro de base é escrito `oklch(L 0 none)`. Com `oklch(L 0 0)` o Chromium interpola a matiz 0 e o neutro tinge para rosa; com `none` ele leva a matiz da marca (ou do azul de base).
  9. O `--input` virou a cor da borda de 3:1 (`oklch` 0,66 no Claro e 0,58 no Escuro e no Preto), então saíram os preenchimentos `dark:bg-input/30` de `Input`, `Textarea` e `NativeSelect` e o `dark:border-input dark:bg-input/30 dark:hover:bg-input/50` do `Button` `outline`.
  10. `Button`/`Input`/`NativeSelect` usam `pointer-coarse:` do Tailwind (vem depois de `md:` no CSS gerado, conferido no build). O item da barra lateral recolhida só ganha `h-11` com ponteiro grosso (a largura fica em 32 px, dentro dos 3 rem da barra).
  11. C19 roda com o service worker liberado (`serviceWorkers: 'allow'`): com ele bloqueado `navigator.serviceWorker.ready` nunca resolve e a linha "Avisos no celular" não aparece. C63 usa 'e2e' como slug padrão (o Proof não passa `E2E_INSTITUICAO`) e, no pior caso, 5 autenticações por minuto (limitador, L-066), com espera no 429.
  12. `Landing`/`plan.md`: nenhuma linha nova. `Flow` ganhou `acesso/Conta.tsx` e `useSair` (`sessao.ts`).
- **Abandoned:** nada.
- **Edições em asserções existentes** (lista fechada; AC que força cada uma):
  - `test/estrutura.test.ts`: `ux.test.tsx` na lista `Raiz` (item 1).
  - `test/interface.test.ts` (item 2; AC 4, AC 5, AC 39): a tabela `Tokens` troca `--background`, `--muted`, `--border` e `--input` pelos `color-mix` e ganha a linha `--accent`; `linear()` lê o `color-mix` por `misturar()` (limite 4,5 igual). `bloco()` não precisou mudar: devolve o `color-mix` inteiro.
  - `e2e/celular.spec.ts`, `Ações do chamado no rodapé abaixo de 1024` (item 4; AC 3): o filtro do nome do X passa de `Close` para `Fechar`.
  - `tabela.test.tsx` (item 8; AC 6, AC 43): `selo de estado com cor por grupo` troca `bg-primary-subtle` por `bg-accent`. **Fora da lista:** o usuário `admin` (fixture) ganhou `ALUNO`, porque `vazio ilustrado nas 6 listas` abre `/solicitacoes` e a guarda de papel (AC 9) o mandava para a Fila; só o fixture mudou.
  - `acesso/icones.test.tsx` (item 8; AC 10): `Tema traz Sun e a escolha Escuro traz Moon` afirma `Monitor` (Sistema, sem tema gravado) e, depois de escolher Escuro, `Moon` no botão.
  - `conhecimento/documentos.test.tsx` (`tela Documentos lista...` e `artigos mostram a indexação`), `conhecimento/edicao.test.tsx` (`ativar e arquivar aparecem...` e `documento arquivado não oferece...`) e `conhecimento/textos.test.tsx` (as 2 listas de literais) (item 8; AC 33 via C7): `ATIVO`, `ARQUIVADO` e `RASCUNHO` passam a `Ativo`, `Arquivado` e `Rascunho`; os ajudantes `de()` e `item()` pegam o primeiro de vários textos iguais (o título de teste "Rascunho" divide o texto com o selo).

