# Estrutura visual sem cara de modelo

## Problem

A estrutura que aparece em toda tela logada é, quase linha por linha, o bloco `sidebar-07` do shadcn: botão de recolher seguido de separador, cartão de usuário com avatar e setas, sol no canto, item ativo em pílula cinza. A caixa de envio do Assistente segue o desenho de um chat de prateleira, com o comentário "Compositor no estilo do ChatGPT" no próprio código. As tabelas ficam na caixa do data-table do shadcn, e os gráficos são os do Recharts sem ajuste. Quem conhece a biblioteca reconhece a origem em segundos depois de entrar, e a banca e as instituições veem um produto genérico. O verificador de `identidade-visual` deu 4 de 10 de "cara de IA" e culpou essa estrutura.

Dois defeitos de acessibilidade pesam mais do que a aparência (AD-035): quem navega por teclado vê um anel de foco abaixo de 3:1 no app inteiro (1,52 a 2,77:1 nos botões comuns), e a área de anexos no formulário de resposta está em 1,21:1. Com cores forçadas, as linhas de pergunta ficam sem indicador de foco. A caixa de envio tem borda de 1,30:1 e uma segunda linha quase sempre vazia, que tira altura da conversa no celular. Evidência: `.specs/features/identidade-visual/verification.md` e `pesquisa.md` desta pasta. Os contrastes da pesquisa são cálculo, sem navegador; o valor final é o medido no teste.

Quando isso sair, a estrutura deixa de exibir as marcas do bloco, o foco fica visível em toda tela e a nota sai de 4 para algo entre 2,5 e 3. Esse número é julgamento, não medida: barra, topo e conteúdo continuam sendo a forma de muito painel, e ninguém desfaz isso antes do congelamento de 17/11.

## Flow

Reusa o primitivo `ui/sidebar.tsx`, os tokens de `index.css`, `OpcoesDeTema` e o `.form-resposta`; nenhuma biblioteca entra, e o Recharts sai (door 4).

1. Tokens -> `web/src/index.css` (exists) - tinge os `--sidebar*`, troca o reserva claro de `--ring` (door 2) e cria a regra global de foco (door 1)
2. Estrutura -> `web/src/Autenticado.tsx` e `web/src/ui/sidebar.tsx` (exist) - item ativo com a barra de 3 px (door 3), Tema e recolher no rodapé da barra, sem separador, sem setas e sem `backdrop-blur`
3. Assistente -> `web/src/assistente/Assistente.tsx` (exists) - a caixa de envio vira campo comum com "Enviar" escrito
4. Listas -> `web/src/Tabela.tsx` (exists) - tabela sem caixa, só com linhas
5. Indicadores -> `web/src/indicadores/Indicadores.tsx` (exists) - os rankings desenham as barras na própria tabela; `web/src/indicadores/Grafico.tsx` (exists) é apagado (door 4)
6. Anexos -> `web/src/CampoArquivo.tsx` (exists) - borda tracejada em `border-input`
7. out: nada novo sai para a API; as telas leem os mesmos dados

## Impact

| Front | What changes |
| --- | --- |
| domínio | nada: nenhum termo novo |
| dados guardados | nada a migrar; `Aparencia` e as imagens continuam iguais |
| decisões | AD-029 ("toda tela segue o exemplo de painel do shadcn") é superada na estrutura, nas tabelas e nos gráficos; o primitivo fica. AD-028 fica: grupos e cartão no rodapé, sem setas |
| `aparencia-instituicao` AC 31 | "sem `cor`, os tokens ficam com os valores de hoje" é emendado em um único valor: o reserva claro de `--ring` (door 2). Quem tem cor não muda |
| `revisao-ux` | os AC do chunk próprio do gráfico e da tabela recolhida se encerram (door 4). Os alvos de 44 px, os campos de 16 px, a barra de abas e a cor de ação continuam valendo |
| `identidade-visual` | C55 a C57 continuam valendo: `--input` e `.form-resposta` não mudam |
| testes existentes | cerca de 20 asserções mudam, listadas em `checks.md` como lista fechada: `arranjo.spec`, `identidade.spec`, `celular.spec`, `ux.spec`, `push.spec`, `interface.test`, `indicadores.test`. A lista da pesquisa vem de leitura, e pode faltar uma ou duas |
| pacote | `recharts` sai de `web/package.json`, e o chunk de 197 KB some |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. Foco global fora de camada, padrão novo no código | Em `index.css`, fora de `@layer`: `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }` e `[tabindex='-1']:focus-visible { outline: none; }`; saem `ring-ring/50` dos 8 arquivos e `outline-ring/50` da base | `ring-ring ring-offset-2`: `box-shadow` some em cores forçadas e não alcança o `outline-none` escrito à mão. Foco em duas cores (GOV.UK): a medida mostra que não precisa, e traz cor nova |
| 2. Reserva claro de `--ring` (emenda AC 31) | `:root { --ring: var(--marca, oklch(0.5 0 0)); --sidebar-ring: var(--ring); }` | `--foco` à parte, mantendo `0.708`: um token a mais, e a borda de foco dos campos seguiria em 2,51:1 |
| 3. Item ativo da barra | Barra de 3 px à esquerda, desenhada com borda ou pseudoelemento, em `--sidebar-primary`; texto em `--sidebar-foreground` com peso 600; sem fundo | Texto na cor da marca: dá cerca de 4,3:1 numa cor no limite, abaixo do mínimo. Barra inteira pintada com a marca: viola a regra de cor de ação |
| 4. Ranking em HTML, sem Recharts | `TabelaRanking` com categoria, total à direita em `tabular-nums` e `<div style={{ width: pct }}>` em `var(--chart-1)`; `Grafico.tsx` e `recharts` saem | Só ajustar props do Recharts (1 h): mantém o `aria-hidden` mais a tabela escondida, o "Ver tabela" e os 197 KB, e o corte do rótulo depende de medir uma largura. Volta com `git revert` |

- Nada mais aqui é difícil de reverter

## Screens

- **Barra lateral, aberta (a partir de 768 px):** logo ou sigla, grupos com título, ícone e rótulo; item ativo como na door 3; no rodapé, em linhas: Contato (quando há), Tema, nome e papel em texto e o botão de recolher só com ícone. Sem círculo de iniciais e sem setas.
- **Barra recolhida:** só ícones, com dica nos ícones, e as iniciais do usuário no rodapé, único lugar em que elas ficam, sem dica (emenda aprovada em 05/11).
- **Topo:** título da tela e, para o aluno, os avisos. Fundo opaco, sem separador, sem desfoque e sem Tema. No celular de quem não é aluno, o botão de menu fica no topo com o ícone `Menu`. A barra de abas do aluno não muda, e o Tema dele continua na Conta.
- **Caixa de envio:** uma linha com `[clipe] [campo com borda] [Enviar]`. Sem caixa externa, sem sombra e sem seta. "Encerrar" fica junto de "Falar com atendente".
- **Tabela:** sem contorno; cabeçalho sem fundo, em peso 600, com fio inferior mais escuro; a primeira coluna alinhada à margem do texto da página. Os cartões do celular não mudam.
- **Ranking de Indicadores:** em cada linha, categoria, total à direita e uma barra embaixo do rótulo no estreito. Sem "Ver tabela".
- **Foco:** contorno de 2 px afastado 2 px do controle, em toda tela; nas linhas de pergunta, para dentro da linha.
- **Área de anexos:** tracejado na cor de `--input`.

## Criteria

### S1: Foco visível e anexos (P1)

Qualquer controle mostra onde está o foco, com ou sem cor da instituição.

**Acceptance Criteria**

1. WHEN um controle recebe foco por teclado na Fila, no Assistente, no detalhe do chamado ou na Aparência, THEN o system SHALL mostrar um indicador de pelo menos 2 px com contraste ≥ 3:1 contra o fundo vizinho, nos 3 temas, sem cor e com 2 marcas
2. WHILE cores forçadas estão ativas, the system SHALL manter o indicador de foco nos mesmos controles
3. The system SHALL não usar `ring-ring/50`, `outline-ring/50` nem `focus-visible:ring-[3px]` em `web/src`
4. The system SHALL usar `oklch(0.5 0 0)` como reserva de `--ring` no tema claro e mantê-lo derivado de `--marca` quando há cor
5. The system SHALL desenhar a área tracejada de anexos com contraste ≥ 3:1 contra o fundo em que está, nas 4 telas que a usam, nos 3 temas

**Independent test:** percorrer as 4 telas com Tab, sem cor no claro, e ver o contorno em todo controle.

### S2: Barra lateral e topo (P1)

A estrutura deixa de exibir as marcas do bloco `sidebar-07`.

**Acceptance Criteria**

6. The system SHALL derivar `--sidebar`, `--sidebar-accent` e `--sidebar-border` da matiz de `--marca`, como os outros neutros
7. WHILE um link da barra está ativo, the system SHALL mostrar uma barra de 3 px em `--sidebar-primary` com contraste ≥ 3:1, texto em `--sidebar-foreground` com peso 600 e nenhum fundo próprio, mantendo `aria-current="page"`
8. The system SHALL mostrar Tema como uma linha do rodapé da barra, abrindo as mesmas 3 opções, e não mostrar Tema no topo
9. WHILE a barra está aberta, the system SHALL mostrar nome e papel em texto no rodapé, sem `ChevronsUpDown` e sem círculo de iniciais
10. WHILE a barra está recolhida, the system SHALL mostrar as iniciais do usuário no rodapé
11. The system SHALL desenhar o topo com fundo opaco, sem `Separator` e sem `backdrop-blur`
12. WHEN a largura é ≥ 768 px, THEN the system SHALL mostrar o botão de recolher no rodapé da barra, só com ícone e o mesmo `aria-label`
13. WHEN a largura é < 768 px e o usuário não é aluno, THEN the system SHALL mostrar o botão de menu no topo com o ícone `Menu`

**Independent test:** entrar como atendente a 1440 e a 390 px, em 2 marcas, e achar Tema, recolher e sair.

### S3: Caixa de envio (P1)

O campo do Assistente é igual a qualquer outro campo do One.

**Acceptance Criteria**

14. The system SHALL mostrar a caixa de envio em uma linha com anexar, campo e o botão "Enviar" escrito, sem contorno externo e sem sombra
15. The system SHALL dar ao campo da caixa de envio uma borda com contraste ≥ 3:1 contra o fundo, nos 3 temas e com 2 marcas
16. WHERE "Encerrar" está disponível, the system SHALL mostrá-lo na mesma linha de "Falar com atendente"
17. WHEN o aluno aperta Enter com texto, THEN the system SHALL enviar a mensagem; IF o campo está vazio THEN "Enviar" SHALL ficar desabilitado

**Independent test:** mandar uma mensagem a 360 px e ver a conversa ganhar altura.

### S4: Tabelas sem caixa (P1)

**Acceptance Criteria**

18. WHILE uma lista está em `<table>`, the system SHALL não mostrar contorno nem raio em volta da tabela e SHALL mostrar o cabeçalho sem fundo, em peso 600, com fio inferior

**Independent test:** abrir a Fila a 1440 px e ver só as linhas.

### S5: Rankings sem biblioteca de gráfico (P1)

**Acceptance Criteria**

19. WHEN um ranking de Indicadores tem dados, THEN the system SHALL mostrar em cada linha a categoria inteira, o total à direita em `tabular-nums` e uma barra em `--chart-1` com contraste ≥ 3:1, proporcional ao maior total
20. IF um ranking não tem dados THEN the system SHALL mostrar o mesmo estado vazio de hoje
21. The system SHALL não cortar o texto de nenhuma categoria em 360, 390, 768, 1024 e 1440 px

**Independent test:** abrir Indicadores a 360 px com uma categoria longa.

### S0: Invariantes (P1)

22. The system SHALL manter o que `revisao-ux`, `aparencia-instituicao` e `identidade-visual` garantem e esta feature não muda (alvos de 44 px, campos de 16 px, barra de abas, cor de ação só em botão principal, item ativo, link e foco, neutros tingidos, fontes e raios), com as suítes de arranjo, Vitest e e2e real passando, salvo a lista fechada de `checks.md`

## Out of scope

| Excluded | Why |
| --- | --- |
| Tirar os ícones da barra e a trilha recolhida (opção 1-B) | As fontes sustentam ícone com rótulo; muda AC 33 de `aparencia-instituicao`. Avaliar depois de ver os prints |
| Navegação no topo, sem barra lateral | Administrador tem 10 itens em 3 grupos, e quase toda a suíte de arranjo mede a barra |
| Barra pintada com a cor da instituição | Viola a regra de cor de ação |
| Reorganizar a Aparência | A coluna única não é defeito (Baymard), e só o administrador vê a tela |
| `Conta` e `Matriculas` sem caixa | Primeira coisa a cortar da tabela; entra só se sobrar tempo |
| Mensagem sem internet no login ("Instituição não encontrada.") | Defeito real e anterior, sem relação com a estrutura; fica anotado para a Etapa 5 |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Emenda de AC 31 (door 2) | Trocar o reserva claro de `--ring` para `oklch(0.5 0 0)` | É o único valor que reprova mesmo sem o alfa, e AD-035 já manda corrigir o foco | n |
| Ranking (door 4) | Barras em HTML, encerrando os AC do gráfico no `revisao-ux` | Apaga dependência e resolve o corte em qualquer largura | n |
| Tamanho da verificação | No máximo 30 checks, com posição e cor medidas no navegador, não no texto do CSS (L-095); até 3 rodadas de Verifier, e depois a decisão é do usuário | `identidade-visual` levou 6 rodadas, e desde a 3ª só achou brechas de teste | n |
| Medir a nota | Ao fechar, um revisor novo dá a nota com prints antes e depois, usando uma logo e uma foto reais de teste | Os prints atuais têm um quadrado preto como logo, o que pode ter pesado na nota | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| tela barra e topo | estado vazio, carregando, erro, sem permissão | existing - não mudam; grupos sem link continuam escondidos (AD-028) |
| tela barra e topo | densidade e ordem | AC 8, AC 9, AC 12 |
| tela caixa de envio | estado vazio | AC 17 |
| tela caixa de envio | erro e carregando | existing - o envio e o erro não mudam |
| tela lista em tabela | vazio, carregando, erro | existing - `BlocoVazio` e o tratamento da `Tabela` não mudam |
| tela ranking | estado vazio | AC 20 |
| tela ranking | carregando e erro | existing - seguem a consulta de Indicadores |
| tela ranking | densidade e ordem | AC 19; a ordem é a que a API devolve |
| tela foco | sem permissão e ação destrutiva | n/a - foco não tem estado próprio nem confirma nada |
| telas | ação destrutiva confirma | existing - nenhuma ação nova; "Encerrar" e "Sair" seguem como estão |

## Sources

- `.specs/features/estrutura-visual/pesquisa.md` - fontes, opções, custo e invariantes de cada item
- `.specs/STATE.md` AD-035 - foco e anexos entram como obrigação nesta rodada, por decisão do usuário
- `.specs/features/identidade-visual/verification.md` - de onde vem a nota e o que a sustenta
