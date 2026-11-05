# Revisão de UI e UX

## Problem

Quem usa o One hoje encontra telas corretas, mas que se leem como um modelo pronto, e vários tropeços medidos.
A auditoria de 04/11/2026 (`auditoria.md`, 44 achados, 150 capturas em 360 a 1440 px, claro e escuro) mediu:
- no celular, a barra fixa "Ações" cobre o "Enviar" no fim do chamado (3 px de sobreposição);
- o X de diálogos e folhas mede 16×16 px;
- o `select` usa 14 px, o que faz o iOS dar zoom;
- as linhas de Cadastros só são tocáveis num texto de 20 px de altura;
- depois de transferir, o assistente continua perguntando "Quer explicar melhor ou falar com um atendente?";
- o atendente precisa de 8 interações e 4 trocas entre folha e página para assumir, responder e resolver;
- os erros dizem só "Erro inesperado", sem ação;
- o aluno só navega por um menu escondido.

A pesquisa (`pesquisa.md`, com as fontes) mostra por que isso pesa:
- a navegação escondida é usada 44% das vezes, contra 89% da visível (NN/g);
- campo abaixo de 16 px dá zoom no iOS;
- status só por cor e transferência silenciosa a humano falham com quem usa;
- a "cara de IA" vem de usar os padrões sem escolha: Inter em tudo, cartões iguais e cor da marca em todo lugar.

Quem paga é o aluno, no celular, e o atendente, na fila. O pedido é do usuário, em 04/11/2026, que delegou as
decisões de design: "quero algo limpo, fácil de usar e fácil de entender ... não quero que nada fique com cara de IA".

Depois desta feature:
- o aluno navega por uma barra de abas no celular e entende em que pé está cada solicitação;
- o atendente resolve o chamado no celular com menos toques;
- todo campo e botão tem tamanho e contraste de toque, e todo erro diz o que fazer;
- o visual tem identidade própria: neutros tingidos pela cor da instituição, títulos em tamanho óptico de exibição e a
  cor da marca só onde há ação.

## Flow

`single module - web/` (sem mudança de API). Reaproveita os tokens de `index.css` e o `--marca` da AD-032, os
componentes de `web/src/ui/` e o `Tabela.tsx`, o `Confirmar.tsx`, o `ErroDe.tsx`, o `Autenticado.tsx` e o
`ChamadoDetalhe.tsx` (exist). Não acrescenta biblioteca: a fonte de exibição é o eixo `opsz` da Inter já instalada
(`@fontsource-variable/inter/opsz.css`).

1. `Autenticado.tsx` (exists): ganha a barra de abas do aluno no celular (door 1), o link "Pular para o conteúdo" e a
   guarda de papel das rotas. A tela Conta mora em `acesso/Conta.tsx` (new) e o `sessao.ts` (exists) ganha `useSair`.
2. Os componentes de `web/src/ui/` (exists) ganham os tamanhos de toque por ponteiro grosso, a fonte de 16 px nos campos
   e o X de 44 px.
3. `Tabela.tsx` (exists), `Chamados.tsx` (exists) e `ChamadoDetalhe.tsx` (exists) mudam as listas e as ações do chamado.
4. `Assistente.tsx` (exists) muda o compositor, o "Isso resolveu?", o aviso de transferência e os erros.
5. As telas de administração (exist) mudam diálogos, textos e Indicadores.
6. `index.css` (exists) muda os tokens neutros e a tipografia (door 2).

## Impact

| Front | What changes |
| --- | --- |
| navegação | o aluno no celular passa a navegar pela barra de abas, e o menu lateral vira só do desktop e da equipe (door 1). Muda os testes de arranjo da gaveta para o papel aluno |
| tokens | `--background`, `--muted`, `--border`, `--input` e `--accent` passam a ter um traço da matiz de `--marca`, ou do azul padrão sem marca (door 2). O contraste de borda de campo sobe para pelo menos 3:1 |
| componentes | `Button`, `Input`, `Textarea`, `NativeSelect`, o X de `Dialog`/`Sheet` e `Skeleton` mudam para todas as telas |
| cor de ação | o verde deixa de ser botão: "Resolver", "Sim" e "Confirmar" passam a usar a cor de ação, e o verde fica só para status de sucesso |
| textos | rótulos e erros em linguagem simples (Lei 15.263/2025). "Chamado", na tela do aluno, vira "Solicitação", e a equipe continua vendo "Chamado" |
| testes | muitos testes de arranjo e de texto medem o que muda. A lista fechada fica em `checks.md` |
| stored data | nada |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside; nenhuma rota de API muda. A rota nova `/:slug/conta` é só do `web/` (door 1)

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. Navegação do aluno no celular | abaixo de 768 px, para quem tem só o papel `ALUNO`, uma barra de abas fixa no rodapé com 3 destinos rotulados, "Assistente" (`MessageCircle`), "Solicitações" (`ListChecks`) e "Conta" (`CircleUser`), cada um com 44 px ou mais de altura e `padding-bottom: env(safe-area-inset-bottom)`; "Conta" é a rota nova `/:slug/conta`, com tema, avisos, contato, trocar senha e sair; a gaveta lateral some para esse papel no celular | manter a gaveta: navegação escondida é usada 44% contra 89% (NN/g). Barra com 2 destinos: o Material recomenda de 3 a 5, e "Conta" junta o que hoje está espalhado no menu do usuário |
| 2. Neutros tingidos e tipografia | os neutros de `:root`, `.dark` e `.black` passam a ser `color-mix(in oklch, var(--marca, <azul de base>) N%, <neutro de base>)`, com N de 2 a 6 conforme o token, exceto o `--background` do `.black`, que continua `#000` (OLED); os títulos (`h1`, `h2`) usam `font-variation-settings: 'opsz' 32` da Inter variável, e o corpo continua na Inter; a escala de texto do app fica em 4 passos (12, 14, 16 e 20/24 px) | trocar de fonte: uma dependência nova para resolver o que o eixo `opsz` já resolve. Neutros puros: é o padrão do modelo que a pesquisa aponta como "cara de IA" (Anthropic; shadcn com bases tingidas) |
| 3. Cor de ação única | um só estilo de botão principal (`default`, cor de ação) por área, e o verde (`success`) só em selo de status; "Resolver", "Sim" e "Confirmar" passam a `default` ou `outline` | verde como "ação positiva": dois botões primários na mesma tela sem regra (auditoria 22) |

- Nada mais é difícil de reverter: textos, tamanhos e espaçamentos são constantes do `web/`

## Screens

Com 1 a 3 regras de arranjo por tela, medidas pelo Verifier.

- **Casca do aluno (< 768 px):** a barra de abas fica na base, com os 3 destinos em colunas de mesma largura e ícone
  sobre rótulo de 12 px. O destino ativo usa a cor de ação e peso 600. O conteúdo reserva a altura da barra mais a área
  segura, então nada fica coberto. O topo mostra o ícone da instituição e o título da tela, sem botão de menu.
- **Conta (`/:slug/conta`, nova):** uma lista de linhas tocáveis de 52 px:
  - nome e CPF mascarado (`cpfMascarado` de `/api/auth/me`) do aluno no topo, sem ação;
  - "Tema", com o valor atual à direita;
  - "Avisos no celular";
  - "Contato do atendimento", quando há contato;
  - "Trocar senha";
  - "Sair", em texto de cor destrutiva, por último.
- **Assistente:**
  - O compositor tem altura mínima de 44 px no campo, e o "Falar com atendente" fica numa linha própria acima do
    compositor, como botão `outline` (em destaque, depois de `sem_base`, do "Não" ou no limite, segue `default`).
  - O texto de ajuda dos anexos vira "PDF ou foto, até 10 MB" e só aparece quando há anexo escolhido ou ao focar o
    clipe.
  - "Isso resolveu?" fica logo abaixo da última resposta, dentro do fluxo da conversa, com "Sim" e "Não" `outline`.
  - A largura máxima do texto do balão é de 68 caracteres (`max-w-[68ch]`).
- **Transferido:** um bloco único com borda, com:
  - o título "Sua solicitação {número} foi para {setor}";
  - a frase "A resposta chega em Solicitações e no seu e-mail.";
  - o contato da instituição;
  - o botão "Ver solicitação".
  O convite "Quer explicar melhor...?" some.
- **Minhas solicitações:** linhas densas separadas por divisória, sem borda de cartão. Cada linha tem:
  - na 1ª linha, o assunto, até 2 linhas;
  - na 2ª, o selo de estado em texto e a data relativa ("hoje", "ontem", "há 3 dias");
  - na 3ª, o próximo passo em texto pequeno: "A equipe vai responder", "Responda para continuar", "Resolvida" ou "Encerrada".
- **Fila (atendente):** linhas densas como as do aluno, com a categoria e a data relativa na linha de meta. A data diz
  "aberto há 3 dias", nunca "0 dias" (usa "aberto hoje"), em dias de calendário no fuso da instituição. Acima da lista,
  o texto "Mais antigos primeiro".
- **Detalhe do chamado (< 1024 px):**
  - Atendente: a barra fixa mostra a ação principal do estado ("Assumir" em `ABERTO`, "Responder" em
    `EM_ATENDIMENTO` e em `AGUARDANDO_ALUNO`, que rola até o campo e o foca) e um botão "Mais" que abre o `Sheet` com as
    outras ações. Em `RESOLVIDO`, a barra mostra só "Mais". Em `FECHADO`, sem ações, não há barra.
  - Aluno: não há barra. "Cancelar solicitação" vira um botão de texto destrutivo no fim da página, com confirmação.
  - O conteúdo reserva a altura da barra.
- **Diálogos de formulário (< 768 px):** ocupam a tela inteira (`Sheet` de baixo, altura total). O cabeçalho tem o
  título e o X de 44 px, o corpo rola, e o rodapé fica fixo com "Cancelar" e a ação. O erro de campo aparece abaixo do
  próprio campo.
- **Erros de carregamento:** um bloco com ícone de alerta, o texto "Não foi possível carregar {o quê}. Verifique sua
  conexão." e o botão "Tentar de novo". No assistente, o erro de envio aparece no lugar da resposta, com "Reenviar".
- **Indicadores:**
  - Um só controle de período: as datas, com o calendário dentro do próprio campo.
  - No celular, os 4 destaques ficam em 2 colunas.
  - Cada destaque tem o número, um rótulo de até 24 caracteres e uma frase de até 70 caracteres, terminada em ponto.
  - A tabela de cada gráfico fica recolhida em "Ver tabela".
- **Artigos:** um só selo de situação por linha, em caixa de frase ("Ativo", "Rascunho", "Arquivado"), e a indexação
  ("Indexado", "Indexando", "Falhou") vira um ícone com dica ao lado do título; Documentos segue a mesma regra. O botão "Novo" do topo some quando a lista está vazia.
- **Usuários:** o CPF aparece formatado (`000.000.000-00`), e há um campo "Buscar por nome, CPF ou e-mail" acima da lista.
- **Matrículas:** 3 passos numerados ("Baixe o modelo", "Preencha uma linha por aluno", "Envie o arquivo"), o botão
  "Baixar modelo (CSV)" e os erros em linhas com "Linha N" e o motivo.
- **Cadastros:** a linha inteira é o alvo de toque, com 48 px ou mais.
- **Aparência (< 1024 px):** o formulário vem primeiro, e "Ver prévia" abre a prévia num `Sheet`. A prévia no tema
  escuro usa a mesma cor clareada que o app.

## Criteria

### S1: Toque, campos e contraste (P1)

Correções que valem para todas as telas.

**Acceptance Criteria**

1. WHILE o ponteiro é grosso (`pointer: coarse`) ou a largura é menor que 768 px, o sistema SHALL dar 44 px ou mais de altura a todo `Button`, `Input`, `Textarea` de uma linha, `NativeSelect`, item da barra lateral e botão de ícone
2. WHILE o ponteiro é grosso ou a largura é menor que 768 px, o sistema SHALL usar 16 px ou mais de fonte em todo `Input`, `Textarea` e `NativeSelect`
3. The system SHALL dar ao botão de fechar de `Dialog` e `Sheet` uma área de toque de 44×44 px e o rótulo acessível "Fechar"
4. The system SHALL dar à borda de `Input`, `Textarea` e `NativeSelect` contraste de 3:1 ou mais contra o fundo, nos temas Claro, Escuro e Preto
5. The system SHALL dar ao `Skeleton` contraste de 1,3:1 ou mais contra o fundo, nos três temas
6. The system SHALL dar a todo selo de estado contraste de texto de 4,5:1 ou mais, nos três temas
7. The system SHALL usar o verde (`success`) só em selos de estado, e nenhum botão SHALL ter fundo verde
8. The system SHALL oferecer, como primeiro elemento focável de toda tela autenticada, o link "Pular para o conteúdo", que leva o foco ao `main`
9. IF alguém abre uma rota de um papel que não tem (por exemplo, o aluno em `/fila`) THEN o sistema SHALL levá-lo à tela inicial do seu papel
10. WHEN o botão de tema é aberto THEN o ícone SHALL ser o do tema atual, o mesmo da opção no menu (`Sun`, `Moon`, `MoonStar` ou `Monitor`), e o item atual SHALL ter `aria-pressed="true"`

**Independent test:** a 390 px e num tablet de toque emulado, medir campos e botões; a 360 px, tocar no X de um diálogo.

### S2: Navegação do aluno no celular (P1)

O aluno vê e alcança suas duas áreas sem abrir menu.

**Acceptance Criteria**

11. WHILE a largura é menor que 768 px e o usuário tem só o papel `ALUNO`, o sistema SHALL mostrar a barra de abas com "Assistente", "Solicitações" e "Conta", fixa no rodapé, com o destino ativo marcado por `aria-current="page"`
12. WHILE a barra de abas está visível, o sistema SHALL esconder o botão do menu lateral e reservar no fim do conteúdo a altura da barra mais `env(safe-area-inset-bottom)`, de modo que nenhum elemento focável fique sob a barra
13. WHEN o aluno abre "Conta" THEN o sistema SHALL mostrar o nome e o CPF mascarado, e as linhas "Tema", "Avisos no celular" (quando o push está disponível), "Contato do atendimento" (quando há contato), "Trocar senha" e "Sair", nessa ordem
14. WHILE a largura é 768 px ou mais, ou o usuário tem papel de equipe, o sistema SHALL manter a navegação atual e não mostrar a barra de abas

**Independent test:** a 390 px como aluno, trocar entre as 3 abas e sair pela Conta.

### S3: Conversa com o assistente (P1)

O aluno lê, avalia e é transferido sem confusão.

**Acceptance Criteria**

15. WHEN uma resposta do assistente chega THEN "Isso resolveu?" com "Sim" e "Não" SHALL aparecer logo abaixo dela, no fluxo da conversa, e não fixo acima do compositor
16. WHEN a conversa é transferida THEN o sistema SHALL tirar da tela o convite "Quer explicar melhor ou falar com um atendente?" e mostrar o bloco "Sua solicitação {número} foi para {setor}" com "A resposta chega em Solicitações e no seu e-mail.", o contato da instituição, quando há, e o botão "Ver solicitação"
17. The system SHALL limitar o texto de cada balão a 68 caracteres de largura no desktop
18. The system SHALL dar ao campo do compositor altura mínima de 44 px e mostrar "Falar com atendente" numa linha própria acima do compositor, `outline` fora do destaque
19. The system SHALL mostrar o texto de ajuda dos anexos ("PDF ou foto, até 10 MB") só quando há arquivo escolhido ou quando o clipe tem foco
20. IF o envio de uma mensagem falha THEN o sistema SHALL mostrar o erro no lugar da resposta, com o botão "Reenviar", que reenvia a mesma mensagem

**Independent test:** a 390 px, perguntar, ver o "Isso resolveu?" sob a resposta, dizer "Não" e transferir.

### S4: Solicitações, fila e chamado (P1)

Listas que se varrem e um chamado que se resolve com poucos toques.

**Acceptance Criteria**

21. The system SHALL mostrar Minhas solicitações e a Fila como linhas separadas por divisória, sem borda de cartão em cada item, com o selo de estado em texto e a data relativa ("aberto hoje", "aberto ontem", "aberto há N dias"), contada em dias de calendário no fuso da instituição a partir de `criadoEm`
22. The system SHALL mostrar, em cada linha de Minhas solicitações, o próximo passo: "A equipe vai responder" (`ABERTO`, `EM_ATENDIMENTO`), "Responda para continuar" (`AGUARDANDO_ALUNO`), "Resolvida" (`RESOLVIDO`) ou "Encerrada" (`FECHADO`)
23. The system SHALL mostrar, em cada linha da Fila, a categoria e a data relativa, e acima da lista o texto "Mais antigos primeiro"
24. WHILE a largura é menor que 1024 px e quem vê é da equipe, o detalhe do chamado SHALL ter na barra fixa a ação principal do estado ("Assumir" em `ABERTO`, "Responder" em `EM_ATENDIMENTO` e `AGUARDANDO_ALUNO`) e o botão "Mais" para as outras ações; em `RESOLVIDO`, só "Mais"; em `FECHADO`, sem ações, nenhuma barra
25. WHEN o atendente toca em "Responder" na barra THEN o sistema SHALL rolar até o campo de resposta e pôr o foco nele
26. WHILE quem vê o chamado é o aluno, o sistema SHALL não mostrar barra fixa, e "Cancelar solicitação" SHALL ser um botão de texto destrutivo no fim da página, com confirmação
27. The system SHALL reservar, abaixo do conteúdo do detalhe, a altura da barra fixa, de modo que o botão "Enviar" fique inteiro visível ao rolar até o fim
28. WHILE o chamado está `RESOLVIDO` ou `FECHADO`, o sistema SHALL não mostrar o formulário de resposta para a equipe

44. WHEN a folha de ações do chamado fecha e abre de novo THEN o sistema SHALL manter o que foi digitado na resolução, na reclassificação e no duplicado, até o envio ou a saída da tela (decisão delegada pelo usuário em 04/11, depois do lote 2)
45. WHILE a largura é 768 px ou mais, a Fila SHALL mostrar a coluna "Aberto" com "hoje", "ontem" ou "há N dias", cada valor numa linha só (decisão delegada em 04/11, depois do lote 2)
46. The system SHALL mostrar os links das respostas do assistente como botões também na conversa vista pela equipe no detalhe do chamado, como no chat do aluno (decisão delegada em 04/11, depois do lote 2; auditoria 17)

**Independent test:** a 390 px como atendente, assumir, responder e resolver um chamado: 6 cliques e 1 só abertura de `Sheet` (a auditoria contou 4 trocas entre folha e página).

### S5: Formulários, erros e administração (P1)

Cada formulário diz o que falta perto do campo, e cada erro diz o que fazer.

**Acceptance Criteria**

29. WHILE a largura é menor que 768 px, os diálogos de formulário (Novo artigo, Novo documento, Novo usuário, Cadastros, Nova instituição, Importar carga) SHALL ocupar a tela inteira com o cabeçalho e o rodapé de ações fixos e o corpo rolando
30. IF a API devolve erro de um campo THEN o sistema SHALL mostrar o texto abaixo do próprio campo, e não junto do botão
31. IF uma lista ou tela falha ao carregar (resposta `5xx` ou falha de rede; `404` e `403` seguem com o `detail` da API) THEN o sistema SHALL mostrar o ícone de alerta, "Não foi possível carregar {o quê}. Verifique sua conexão." e o botão "Tentar de novo", que refaz a consulta
32. The system SHALL mostrar em Indicadores um só controle de período, os 4 destaques em 2 colunas abaixo de 768 px, cada um com o número, um rótulo de até 24 caracteres e uma frase de até 70 caracteres terminada em ponto, e a tabela de cada gráfico recolhida em "Ver tabela"
33. The system SHALL mostrar em Artigos um só selo de situação por linha, em caixa de frase ("Ativo", "Rascunho", "Arquivado"), com a indexação ("Indexado", "Indexando", "Falhou") como ícone com dica, e o mesmo em Documentos
34. The system SHALL mostrar em Usuários o CPF formatado `000.000.000-00` e um campo "Buscar por nome, CPF ou e-mail" que filtra a lista
35. The system SHALL mostrar em Matrículas os 3 passos numerados, o botão "Baixar modelo (CSV)", que baixa um arquivo com o cabeçalho de hoje, e os erros com "Linha N" ao lado do motivo
36. The system SHALL fazer a linha inteira de Cadastros ser o alvo de toque, com 48 px ou mais
37. WHILE a largura é menor que 1024 px, a tela Aparência SHALL mostrar o formulário primeiro e um botão "Ver prévia" que abre a prévia
38. The system SHALL mostrar na prévia da Aparência, no tema escuro, o botão principal com a mesma cor e o mesmo texto que o app usa no escuro, com contraste de 4,5:1 ou mais

**Independent test:** a 360 px, abrir Novo usuário, enviar vazio, ver o erro no campo e o "Salvar" no rodapé fixo.

### S6: Identidade visual sem cara de modelo (P2)

O app se lê como da instituição, com uma cor de ação só e uma hierarquia clara.

**Acceptance Criteria**

39. The system SHALL derivar `--background`, `--muted`, `--border`, `--input` e `--accent` de `color-mix(in oklch, var(--marca, <azul de base>) N%, <neutro de base>)` nos três temas, exceto o `--background` do Preto, que continua `#000`, mantendo o contraste do texto corrente em 4,5:1 ou mais
40. The system SHALL usar nos títulos `h1` e `h2` o eixo `opsz` da Inter (`font-variation-settings: 'opsz' 32`), carregado de `@fontsource-variable/inter/opsz.css`, sem fonte nova
41. The system SHALL limitar cada tela de `Telas` (`e2e/simulada.ts`), Conta e Instituições a 4 tamanhos de texto: 12, 14, 16 e um tamanho de título (20 ou 24 px)
42. The system SHALL não usar o ícone `Sparkles`, emoji em título nem gradiente decorativo em nenhuma tela (a faixa sobre a imagem do login não é decorativa e fica)
43. The system SHALL usar a cor de ação só em botão principal, item ativo, link e foco, além das iniciais da instituição (`Sigla`); o gráfico e os selos não a usam

**Independent test:** comparar as 15 telas antes e depois em 390 e 1440 px, com e sem cor de instituição.

## Out of scope

| Excluded | Why |
| --- | --- |
| Avisar que já existe solicitação aberta do mesmo assunto | precisa de regra no servidor; anotado para depois (auditoria 10) |
| Mostrar e ocultar senha no login | ganho pequeno frente ao resto; anotado (auditoria 3) |
| Citações numeradas das fontes para o aluno | a AD-012 proíbe mostrar artigo ao aluno |
| Trocar o AI Elements | o código está copiado em `web/src/ui/`; a descontinuação de 11/2026 não quebra nada |
| Revisar a frase solta depois de um link na resposta | depende do modelo seguir a regra 4 do prompt; é comportamento da IA, não da tela |
| Prazo de resposta na transferência | o MVP não tem SLA (Out of scope da `mvp-one`); o texto diz onde a resposta chega, não quando |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Decisões de design | tomadas pelo orquestrador com base em `pesquisa.md` e `auditoria.md` | o usuário delegou em 04/11 ("confio na sua decisão") e pediu para não ser perguntado | y |
| "Solicitação" × "Chamado" | o aluno vê "Solicitação", e a equipe continua vendo "Chamado" | linguagem simples para o aluno; a equipe já usa "chamado" e a fila é dela | n |
| Barra de abas só no celular | abaixo de 768 px | acima disso a barra lateral cabe e é visível | n |
| Cartões × linhas | linhas densas para listas de varredura | NN/g (cards-component); muda o visual da AD-032 S2 sem mudar o que ela garante (sem `<table>` no celular, item de lista) | n |
| Perfil | `ui` | toca todas as telas | n |
| Pontos abertos dos checks (P1 a P16 de `checks.md`) | P1: "Resolvida" e "Encerrada" sem data; P2: a Fila mostra categoria e data relativa, sem aluno nem setor; P3: a Conta mostra nome e CPF mascarado, sem e-mail; P4 a P16 com os padrões de `checks.md`; P7: o `--background` do Preto continua `#000` | decisão delegada pelo usuário em 04/11, sem mudança de API | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| todas as telas | vazio | existing - os estados vazios ilustrados da AD-032 |
| todas as telas | carregando | AC 5 (esqueleto visível) |
| todas as telas | erro | AC 20, AC 30, AC 31 |
| todas as telas | não autorizado | AC 9 |
| todas as telas | ação destrutiva confirma | AC 26 (cancelar), existing - `Confirmar` |
| listas | densidade e ordem | AC 21 a AC 23 |
| Conta | ação destrutiva confirma | n/a - "Sair" não destrói dado |
| textos | estrutura, tom e o que o leitor faz | AC 16, AC 22, AC 31, AC 35 em linguagem simples |

## Sources

- `.specs/features/revisao-ux/pesquisa.md` (binding): os princípios e as fontes
- `.specs/features/revisao-ux/auditoria.md` (binding): os achados medidos
- Pedido do usuário em 04/11/2026, com as decisões delegadas
