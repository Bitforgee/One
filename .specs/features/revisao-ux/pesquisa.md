# Revisão de UX do One: pesquisa de referência

Data: 2026-11-04. Pesquisa de mesa para a revisão visual e de usabilidade. Cada afirmação traz a fonte. Onde não consegui ler a página primária, marquei **não verificado**.

## Princípios, em ordem de impacto

### 1. O que faz parecer "feito por IA" é o padrão sem escolhas, não o shadcn em si
- A Anthropic chama esse visual de "convergência distribucional": sem orientação, o modelo cai em Inter, gradiente roxo sobre branco, "layouts previsíveis" e "design genérico sem caráter do contexto". https://claude.com/blog/improving-frontend-design-through-skills
- A documentação do shadcn trata os componentes como base para ser tematizada por variáveis CSS (`--primary`, `--radius`, cor base). Hoje há bases tingidas (Stone, Mauve, Olive, Mist, Taupe), além de Neutral e Zinc. https://ui.shadcn.com/docs/theming
- O "sparkles" (✨) é ambíguo: muda de sentido entre produtos, pode ser lido como "favoritar" e vende uma ideia de mágica. https://www.nngroup.com/articles/ai-sparkles-icon-problem/ (só li o trecho da busca: **parcialmente verificado**)
- **Como aplicar no One:** defina um tema próprio (cor base tingida, raio menor ou maior que 0.625rem, uma fonte de títulos diferente da Inter), tire os ✨ e emojis dos títulos e escreva textos específicos da instituição em vez de "Como posso ajudar você hoje?".

### 2. A hierarquia vem do contraste e do agrupamento; cartão em tudo apaga a hierarquia
- Use no máximo 3 tamanhos de texto e no máximo 2 elementos grandes por tela. Agrupe pelo espaço e use bordas "com parcimônia". "Se tudo tem contraste, nada se destaca." https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- O Linear refez a interface para "reduzir ruído visual", usando Inter Display só nos títulos e uma densidade maior. https://linear.app/now/how-we-redesigned-the-linear-ui
- **Como aplicar no One:** no Indicadores e no detalhe da solicitação, troque a grade de cartões iguais com borda por seções separadas por espaço e um único número ou ação de destaque por tela.

### 3. Navegação mobile do aluno: barra inferior visível, não menu hambúrguer
- Navegação escondida é menos usada e mais lenta: 44% de uso (Bloomberg, menu escondido) contra 89% (navegação visível + escondida); 33 s contra 24 s até o primeiro uso. https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/
- Barras de abas e de navegação "servem bem a sites com poucas opções". O hambúrguer é para sites "com muito conteúdo, de navegação exploratória". https://www.nngroup.com/articles/mobile-navigation-patterns/
- Segundo a Apple, a barra de abas serve para navegar e não para executar ações. Ela deve ficar sempre visível e ter rótulos de uma palavra. https://developer.apple.com/design/human-interface-guidelines/tab-bars
- O Material/Android recomenda de 3 a 5 destinos na barra inferior. https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- **Como aplicar no One:** no PWA do aluno, use uma barra inferior com "Conversa" e "Solicitações". Se houver perfil ou ajustes, "Conta" vira o 3º destino e fecha o mínimo do Material. A sidebar fica só no desktop (atendente e admin).

### 4. Alvos de toque, alcance e áreas seguras
- O WCAG 2.5.8 (AA) pede pelo menos 24×24 px CSS, ou espaçamento equivalente. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- A Apple usa 44×44 pt como padrão no iOS (mínimo de 28×28) e cerca de 12 pt de respiro em volta de controles com borda. https://developer.apple.com/design/human-interface-guidelines/accessibility
- O Android recomenda 48×48 dp, com 8 dp entre alvos. https://support.google.com/accessibility/android/answer/7101858
- Hoober (2017) pediu para desconsiderar seus desenhos de "zona do polegar": as pessoas tocam mais e com mais precisão no centro da tela. https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- Rodapés fixos devem somar `env(safe-area-inset-bottom)` ao padding. https://developer.mozilla.org/en-US/docs/Web/CSS/env
- **Como aplicar no One:** botões de ícone (enviar, anexar, voltar) com área de 44 px. O composer do chat e a barra inferior ficam fixos com padding de área segura. Ações destrutivas (cancelar solicitação) longe do polegar e com confirmação.

### 5. Campos com fonte de 16 px no celular
- O Safari do iOS dá zoom no campo "quando a fonte é 15px ou menos". https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/
- **Como aplicar no One:** o composer do chat, a busca e os formulários usam `text-base` (16 px) no mobile. O `Input` do shadcn costuma vir com `text-base md:text-sm` (**não verificado** no código do One); confira se nenhum override reduz isso.

### 6. Chat: dizer que é IA, mostrar as fontes e oferecer uma saída humana
- Avise logo no início que é um robô, diga o que ele sabe fazer, admita quando não entendeu e ofereça um humano. https://www.nngroup.com/articles/chatbots/
- A UE exige avisar que a pessoa fala com IA (AI Act, art. 50(1)); é referência, não lei aqui. https://artificialintelligenceact.eu/article/50/
- Citações numeradas [1], [2] e um bloco "Fontes" expansível. O avatar só aparece no primeiro bloco da mensagem. Erros trazem uma ação de recuperação. https://cloudscape.design/patterns/genai/generative-AI-chat/
- Usuários raramente clicam nas citações, que podem não sustentar o texto: separe as fontes do texto e facilite a checagem. https://www.nngroup.com/articles/explainable-ai/
- Sugestões de pergunta mostram o que o assistente faz; controles precisam de rótulo, não só ícone. https://www.nngroup.com/articles/prompt-controls-genai/
- Na transferência, nada de passagem silenciosa: diga o que acontece e em quanto tempo, e passe o contexto para o aluno não repetir nada. https://www.intercom.com/learning-center/ai-human-collaboration-procedures-handoffs
- **Como aplicar no One:** "Assistente virtual da [Instituição]" no topo da conversa. Os artigos citados viram links abaixo da resposta. No "não encontrei", "Falar com a secretaria" cria a solicitação com a conversa anexada e mostra o prazo. De 3 a 4 sugestões reais (matrícula, boleto, documentos) só na conversa vazia.

### 7. Feedback "Isso resolveu?"
- O padrão do Cloudscape é um polegar para cima ou para baixo e, no negativo, um segundo passo opcional com o motivo. https://cloudscape.design/patterns/genai/feedback (a página deu 404; **não verificado**, conteúdo visto só no índice da busca)
- **Como aplicar no One:** coloque "Isso resolveu? Sim / Não" sob a resposta. O "Não" oferece "Falar com atendente", que liga o feedback à transferência.

### 8. Status da solicitação: texto + cor, poucos estados e o próximo passo à vista
- A cor não pode ser o único meio de informar. https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- Na etiqueta de status, use adjetivo e não verbo, não torne a etiqueta clicável e mantenha poucos estados. https://design-system.service.gov.uk/components/tag/
- Visibilidade do status do sistema é dizer o que está acontecendo para a pessoa decidir o próximo passo. https://www.nngroup.com/articles/visibility-system-status/
- **Como aplicar no One:** em "Minhas solicitações", cada item mostra a etiqueta em texto ("Em atendimento", "Aguardando você", "Resolvida") e uma linha com o próximo passo ("A secretaria responde até 06/11"). O detalhe traz uma linha do tempo com data absoluta.

### 9. Lista no lugar de cartão quando a pessoa precisa achar ou comparar
- Cartões não servem para buscar um item específico nem para comparar. São menos escaneáveis e mostram menos itens por tela. https://www.nngroup.com/articles/cards-component/
- Filtros no mobile: bandeja sobre os resultados, rótulo "Filtrar", contagem sempre visível. https://www.nngroup.com/articles/mobile-faceted-search/
- **Como aplicar no One:** a "Fila" do atendente e "Minhas solicitações" viram linhas densas (assunto, status, data). Os filtros da Fila no mobile abrem numa bandeja lateral.

### 10. Estados vazios que ensinam e levam à ação
- Diga o estado real (carregando, erro ou vazio), explique para que serve a área e ofereça o botão do próximo passo. https://www.nngroup.com/articles/empty-state-interface-design/
- **Como aplicar no One:** em "Minhas solicitações" vazia, escreva "Você ainda não abriu solicitações. Pergunte ao assistente; se ele não resolver, a solicitação é criada aqui." e coloque o botão "Começar conversa".

### 11. Formulários: rótulo visível, validação ao sair do campo, erro específico
- Placeholder não substitui rótulo, porque some quando a pessoa digita. https://www.nngroup.com/articles/form-design-placeholders/
- Valide ao sair do campo (onblur) e retire o erro a cada tecla assim que for corrigido. Erros prematuros irritam. https://baymard.com/blog/inline-form-validation
- Erro perto do campo, com problema e correção, sem culpar e preservando o que foi digitado. https://www.nngroup.com/articles/error-message-guidelines/
- Evite "inválido", "ops", "desculpe". Campo vazio pede instrução ("Informe o e-mail"); formato errado descreve o limite. https://design-system.service.gov.uk/components/error-message/
- Upload com uma mensagem por falha ("O arquivo deve ser CSV", "O arquivo está vazio"). https://design-system.service.gov.uk/components/file-upload/
- **Como aplicar no One:** na Importação de Matrículas (CSV), cada erro sai por linha e coluna ("Linha 14: CPF com 10 dígitos; deve ter 11"). No Aparência e em Documentos, a área de soltar arquivo fica visível e diz o tipo e o tamanho aceitos.

### 12. Tabelas de admin no celular
- Cabeçalho e primeira coluna fixos, rolagem horizontal sinalizada, colunas escolhidas pela pessoa. https://www.nngroup.com/articles/mobile-tables/
- **Como aplicar no One:** Usuários e Artigos no celular mostram só nome e status, com a primeira coluna fixa. O resto fica no detalhe.

### 13. Painel de indicadores legível
- Para quantidades, use comprimento e posição (barras, linhas). Evite pizza, rosca, gauge e 3D, e não use cor como magnitude. Um painel serve para monitorar, não para explorar. https://www.nngroup.com/articles/dashboards-preattentive/
- **Como aplicar no One:** em Indicadores, use poucos números grandes com comparação ("vs. semana anterior"), barras horizontais por assunto e nenhuma rosca decorativa.

### 14. Linguagem simples em português
- A Lei 15.263/2025 (Política Nacional de Linguagem Simples), art. 5º, manda usar ordem direta, frases curtas e voz ativa, explicar jargão e escrever o nome por extenso antes da sigla. https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15263.htm
- O guia gov.br pede blocos curtos com o mais importante primeiro, sem jargão do dia a dia do órgão nem "juridiquês". https://www.gov.br/pt-br/guia-de-edicao-de-servicos-do-gov.br/escrevendo-o-seu-texto
- **Como aplicar no One:** troque "Ticket", "Chamado #" e "SLA" por "Solicitação" e "Prazo de resposta". Botões dizem o verbo da ação ("Enviar solicitação", não "Confirmar"). Escreva "Secretaria Acadêmica (SA)" na primeira vez que a sigla aparecer.

### 15. Cor da marca com contenção, neutros tingidos e modo escuro
- Texto: 4.5:1. Bordas de campos, ícones e foco: 3:1 contra a cor vizinha (1.4.11, AA). https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Use um cinza com o matiz da cor de destaque, com cuidado em fundos saturados no escuro. https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette
- O Linear gera o tema a partir de 3 variáveis (base, destaque, contraste) em LCH. https://linear.app/now/how-we-redesigned-the-linear-ui
- O Material recomenda #121212 em vez de preto puro e cores primárias dessaturadas no escuro. https://m2.material.io/design/color/dark-theme (a página não renderizou; **verificado só via trecho de busca**)
- **Como aplicar no One:** a cor da instituição entra só em ação principal, item ativo e foco. Na tela Aparência, calcule o contraste da cor escolhida contra branco e contra o fundo escuro e avise abaixo de 4.5:1. No escuro, gere uma variante mais clara e menos saturada.

## Referências visuais

1. **Linear: redesenho da UI.** https://linear.app/now/how-we-redesigned-the-linear-ui. Pegar a densidade, a sidebar discreta, o tema a partir de 3 variáveis e Inter Display só nos títulos.
2. **GOV.UK Design System.** https://design-system.service.gov.uk/. Pegar as etiquetas de status, as mensagens de erro e o upload; serve de modelo para os textos.
3. **Cloudscape: padrões de IA generativa (AWS).** https://cloudscape.design/patterns/genai/generative-AI-chat/. Pegar as citações numeradas, o bloco "Fontes", os estados de erro e de carregamento no chat.
4. **Help Scout Beacon.** https://www.helpscout.com/beacon/. Pegar o modelo de artigo primeiro e contato humano no mesmo painel.
5. **Intercom: procedimentos de transferência.** https://www.intercom.com/learning-center/ai-human-collaboration-procedures-handoffs. Pegar a nota de passagem para o atendente e a mensagem de "o que acontece agora" para o aluno.
6. **Zendesk Garden.** https://garden.zendesk.com/. Pegar os componentes e padrões de um workspace de atendente maduro (Fila, detalhe).
7. **Radix Colors.** https://www.radix-ui.com/colors. Pegar as escalas de 12 passos e os cinzas tingidos que combinam com a cor da instituição.
8. **Nubank + OpenAI.** https://openai.com/pt-BR/index/nubank/. Pegar o limite de turnos automáticos antes de chamar humano (55% do nível 1, até 5 interações: **não verificado na página**, números de marketing).
9. **Georgia State "Pounce".** https://campustechnology.com/articles/2017/03/07/using-ai-chatbots-to-freeze-summer-melt-in-higher-ed.aspx. Assistente para alunos com ~21% menos evasão pré-matrícula em ensaio randomizado (números variam entre fontes).
10. **Guia de edição de serviços gov.br.** https://www.gov.br/pt-br/guia-de-edicao-de-servicos-do-gov.br. Pegar o tom e a estrutura de texto para o público brasileiro.

## O que evitar

- Gradiente roxo, ✨ como ícone de IA e emoji em título. https://claude.com/blog/improving-frontend-design-through-skills · https://www.nngroup.com/articles/ai-sparkles-icon-problem/
- Grade de cartões idênticos para listas que a pessoa precisa varrer ou comparar. https://www.nngroup.com/articles/cards-component/
- Menu hambúrguer como única navegação do aluno. https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/
- Status só por cor ou bolinha. https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- Placeholder como rótulo, e erro do tipo "Campo inválido" ou "Ops!". https://www.nngroup.com/articles/form-design-placeholders/ · https://design-system.service.gov.uk/components/error-message/
- Transferência silenciosa para humano, que obriga o aluno a repetir tudo. https://www.intercom.com/learning-center/ai-human-collaboration-procedures-handoffs
- Pizza, rosca e gauge no Indicadores. https://www.nngroup.com/articles/dashboards-preattentive/
- Campo com menos de 16 px no celular. https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/
- Depender do pacote AI Elements a longo prazo: o site diz "AI Elements is moving to shadcn/ui. This project will be deprecated at the end of November 2026." https://elements.ai-sdk.dev/
