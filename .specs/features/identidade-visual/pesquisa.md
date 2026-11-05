# Identidade visual do One: pesquisa

Data: 2026-11-05. Complementa `../revisao-ux/pesquisa.md` (as fontes de lá não se repetem aqui). O alvo são os seis motivos do "parece feito por IA": Inter em tudo, cartões shadcn com o mesmo raio, Indicadores em 13 caixas iguais, login-02, ilustrações genéricas e boas-vindas de chatbot de prateleira. Onde não li a fonte primária, está marcado **não verificado**.

## 1. Tipografia (prioridade 1)

As métricas abaixo eu mesmo medi nos arquivos `files/<fonte>-latin-wght-normal.woff2` dos pacotes `@fontsource-variable`, com fontTools: altura-x em relação ao corpo (`OS/2 sxHeight / unitsPerEm`), tamanho do arquivo pela CDN jsDelivr e presença de `tnum`. Todas têm licença OFL-1.1 (API do Fontsource) e eixo `wght`. O subconjunto `latin` (U+0000–00FF) tem ç ã õ é ê á í ó ú â ô à e as maiúsculas: conferi glifo por glifo. Para comparar: o One hoje carrega `inter/opsz.css`, com **72,9 KB** e altura-x de **0,546**.

| Fonte | Pacote npm (versão) | woff2 latin | Altura-x | Algarismos | Quem usa |
|---|---|---|---|---|---|
| Public Sans | `@fontsource-variable/public-sans` (5.3.0) | 26,8 KB | 0,517 | `tnum` | USWDS, governo dos EUA |
| Source Serif 4 | `@fontsource-variable/source-serif-4` (5.3.1) | 50,9 KB (wght) / 122 KB (opsz) | 0,475 | tabulares por padrão + `tnum` | Adobe |
| Source Sans 3 | `@fontsource-variable/source-sans-3` (5.3.1) | 28,9 KB | 0,478 | tabulares por padrão | Adobe; USWDS (como Source Sans Pro) |
| IBM Plex Sans | `@fontsource-variable/ibm-plex-sans` (5.3.0) | 45,7 KB | 0,516 | tabulares por padrão (sem `pnum`) | IBM, Carbon |
| Atkinson Hyperlegible Next | `@fontsource-variable/atkinson-hyperlegible-next` (5.3.0) | 34,0 KB | 0,496 | `tnum` | Braille Institute |

- **Public Sans** se define como "A strong, neutral, principles-driven, open source typeface for text or display". É um fork da Libre Franklin. https://github.com/uswds/public-sans. O USWDS destaca que ela tem "a large x-height" (legível em tamanho pequeno) e "tabular numerals for aligning numbers in tables". https://designsystem.digital.gov/components/typography/
- **Source Serif 4** é "an open-source typeface to complement the Source Sans family". Tem tamanhos ópticos desde 2021. https://github.com/adobe-fonts/source-serif
- **Source Sans 3**, segundo o USWDS, foi "created for legibility in UI design". https://designsystem.digital.gov/components/typography/. A altura-x é baixa: 14 px dela rendem o mesmo x que ~12 px de Inter.
- **IBM Plex Sans** é uma grotesca com raiz na Franklin Gothic, desenhada por Mike Abbink com a Bold Monday. https://en.wikipedia.org/wiki/IBM_Plex. Tem personalidade, mas carrega a identidade da IBM, e a própria IBM diz ter patente sobre o desenho (**não verificado** além do trecho da busca: https://www.ibm.com/design/language/typography/typeface).
- **Atkinson Hyperlegible Next** foi feita para "improve legibility and readability for individuals with low vision", com letras sem ambiguidade (I/l/1, 0/O). https://www.brailleinstitute.org/freefont/. É boa reserva para acessibilidade, mas tem cara própria demais para títulos.
- O governo federal usa a **Rawline**, com Verdana como substituta na web (manual do MDR: https://www.gov.br/mdr/pt-br/imprensa/Manualdeusodamarca.pdf). Não está no Fontsource e não achei a licença: **não verificado**. Não use.

### Recomendação: Public Sans no texto + Source Serif 4 nos títulos

- **Texto e interface: `@fontsource-variable/public-sans`** (`'Public Sans Variable'`, 26,8 KB). Ela tem o tom de serviço público, a altura-x quase igual à da Inter (então os tamanhos de 12 a 16 px não mudam) e `tnum` para os números do Indicadores.
- **Títulos h1/h2, número principal do Indicadores, login e boas-vindas: `@fontsource-variable/source-serif-4`** (`'Source Serif 4 Variable'`, use o `index.css`, que traz só `wght` e pesa 50,9 KB). A serifa dá tom acadêmico e institucional e é a troca mais visível contra o padrão shadcn. Botões, tabelas, a Fila e os rótulos continuam em sans.
- Total de **77,7 KB**, quase o mesmo que os 72,9 KB de hoje.
- Alternativa: se a serifa for vetada, **Source Sans 3 + Source Serif 4** (mesma superfamília, corpo mínimo de 15 px) ou só **IBM Plex Sans**.
- **Como aplicar no One:** em `web/src/main.tsx`, troque o import da Inter. Em `web/src/index.css`, defina `--font-sans: 'Public Sans Variable', …` e crie `--font-heading`. Os testes que fixam a Inter também mudam: `web/src/ux.test.tsx:160-161` e `web/src/test/interface.test.ts:180`. Comece pelo login e pelo título "Indicadores".

## 2. Hierarquia sem encaixotar tudo

1. **Menos bordas.** Bordas demais deixam a tela "busy and cluttered". No lugar delas, use "a box shadow, using contrasting background colors, or simply adding more space between elements". https://www.refactoringui.com/
   **Como aplicar no One:** no detalhe do chamado (07) e em Conta (05), tire a borda dos blocos. Separe por espaço (`gap-8`) e títulos de seção. Use fundo tingido (`bg-muted`) só no bloco que pede ação.
2. **Escala de raios, não um raio único.** O Material 3 usa 4/8/12/16/28 dp (extra small a extra large). https://github.com/material-components/material-components-android/blob/master/docs/theming/Shape.md. Qual componente usa qual degrau: **não verificado**.
   **Como aplicar no One:** campos, linhas da Fila e etiquetas com 4 px; botões com 6 a 8 px; painéis com 12 px; Sheet e Dialog com 16 a 20 px. Saia do 0.625rem em tudo.
3. **Borda, fundo ou sombra, cada um com seu papel.** A borda separa itens de uma lista densa, o fundo tingido agrupa e a sombra fica só no que flutua (menu, diálogo, bandeja). Isso é síntese minha das fontes acima.
   **Como aplicar no One:** nada de sombra em cartão estático, e o tema preto puro usa fundo em degraus em vez de borda.

## 3. Indicadores (08)

1. **Um número principal, maior e no topo à esquerda.** O mais importante "should have the highest contrast and occupy the largest area". Ponha-o no topo e siga o padrão em F. https://carbondesignsystem.com/data-visualization/dashboards/
2. **Linha de métricas que comanda um único gráfico.** No Plausible, "You can click on a particular metric to display it in the top graph", com comparação contra o período anterior. https://plausible.io/docs/guided-tour
3. **Sparklines no lugar de caixas.** São "data-intense, design-simple, word-sized graphics", postos ao lado do número. Tufte: "Avoid all data frames; the physical location of the numbers… enforces the implicit grid". https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/
- **Como aplicar no One:** "Resolvidas sem reabertura 57,1%" em Source Serif grande, com "vs. período anterior" e uma sparkline. Logo abaixo, uma faixa de 3 números clicáveis (Abertos agora, Autoatendimento, 1ª resposta) que trocam o gráfico. As outras 9 métricas viram uma lista de duas colunas (rótulo à esquerda, valor tabular à direita) com divisórias finas, sem caixas. O exemplo do Stripe Dashboard ficou **não verificado**: a documentação não descreve a home.

## 4. Login (01, 02)

1. **Foto real da instituição, nunca imagem genérica.** As pessoas "ignore stock photos of generic people" e olham imagens que "carry information". https://www.nngroup.com/articles/photos-as-web-content/. Os manuais de universidades proíbem foto de banco de imagens de pessoas e de campus (https://www.uml.edu/marcom/content-creative/photography.aspx, https://www.monash.edu/brandbook/brand-elements/imagery). O de Oregon veta "AI-generated imagery presented as real photography" (https://communications.uoregon.edu/uo-brand/applying-the-brand/photography).
2. **Sem imagem é melhor que imagem decorativa.** "Avoid using images for unnecessary decoration… avoid generic stock photography." https://design-system.service.gov.uk/styles/images/
- **Como aplicar no One:** saia do split 50/50 com gradiente e retângulos abstratos. Opção A: coluna única centrada sobre fundo tingido, com o logo grande, o nome da instituição em serifa e o formulário de CPF e senha; a lista "Assistente 24 h…" sai. Opção B: foto do campus enviada pela instituição em Aparência, como faixa no topo (mobile) ou no fundo com o formulário num painel opaco (desktop). Sem foto enviada, vale a opção A. Peça foto com autorização de uso de imagem. O padrão de login gov.br e de bancos (CPF primeiro, senha depois) ficou **não verificado**.

## 5. Boas-vindas do assistente (03)

1. **Uma tela inicial de tarefas, não um chat vazio.** O Intercom trocou a abertura por um Home com busca em artigos, conversas recentes (as dos últimos 3 dias, porque ">95%" da interação acontece em 24 h) e apps de tarefa. https://www.intercom.com/blog/product-thinking-behind-messenger-home/
2. **O autosserviço vem antes do contato.** O Beacon tem um modo em que a pessoa tenta se ajudar antes de ver as opções de contato, e o humano fica "two clicks away". https://docs.helpscout.com/article/1250-beacon-jumpstart-guide
3. **Pílula ou cartão.** Pílulas servem para "a wide range of topics", e cartões para ferramentas "primarily used for a small number of tasks". Personalize para o usuário. "Broad or generic prompt suggestions are rarely effective." https://www.nngroup.com/articles/designing-use-case-prompt-suggestions/
4. **Redação das sugestões.** Voz ativa, sem "please" e sem exclamação. https://cloudscape.design/patterns/genai/support-prompts
- **Como aplicar no One:** tire o avatar "V" e o "Olá! Eu sou Vagner.". No lugar, um título em serifa: "Secretaria Acadêmica da Univag · respostas com base nas normas da instituição". Abaixo, 4 linhas de categoria em lista com ícone lucide e texto de apoio: "Boletos e pagamentos — 2ª via, prazos", "Rematrícula", "Declarações e documentos", "Estágio". Tocar numa linha mostra 2 ou 3 perguntas daquela categoria. Para quem já usou, "Sua solicitação #123 — Em atendimento" aparece primeiro. O aviso de IA vira uma linha discreta acima do composer.

## 6. Estados vazios: ilustração, ícone ou foto

1. **Ilustração só para explicar algo físico.** Exemplo: mostrar onde fica o número num documento. Com pouca cor e evitando pessoas. https://design-system.service.gov.uk/styles/images/
2. **Imagem opcional.** Em espaço pequeno ou com vários vazios na mesma tela, use só texto. Em erro, a imagem deve "be sensitive to what could be a serious situation". Imagem decorativa leva `alt=""`. https://carbondesignsystem.com/patterns/empty-states-pattern/
3. O Primer (GitHub) usa um ícone médio no Blankslate, não ilustração (https://primer.style/product/components/blankslate/). As diretrizes desse componente ficaram **não verificadas**: só vi o exemplo de código.
- **Como aplicar no One:** tire as ilustrações genéricas. Em Minhas solicitações (04), Fila (06) e Matrículas (09), use um ícone lucide de 24 a 32 px em `text-muted-foreground`, uma frase e o botão. Ilustração própria só no guia de importação de CSV, mostrando a planilha. Foto só no login.

## O que evitar

- **Fontes de template de IA:** Inter, Roboto, Open Sans e Lato estão na lista "Never use" da Anthropic, que admite que os modelos convergem para Space Grotesk. https://claude.com/blog/improving-frontend-design-through-skills. Pela minha observação (opinião, **não verificado**), Geist, Plus Jakarta Sans, DM Sans, Manrope, Figtree, Bricolage Grotesque, Fraunces e Playfair Display viraram a mesma assinatura.
- Usar Inter Display ou o eixo `opsz` como se fosse uma "fonte de títulos": continua sendo a mesma família.
- Serifa em botão, tabela, etiqueta ou campo.
- Grade de caixas iguais para métricas de pesos diferentes, e borda mais sombra no mesmo elemento.
- Um raio só para tudo; pílula (`rounded-full`) em sugestões de texto longo.
- Gradiente com formas abstratas no login; foto de banco de imagens ou gerada por IA como se fosse do campus.
- "Olá! Eu sou X." com avatar de letra; sugestões genéricas.
- Ilustração decorativa em tela de erro ou em vários vazios da mesma tela.
- Rawline enquanto a licença não estiver confirmada.
