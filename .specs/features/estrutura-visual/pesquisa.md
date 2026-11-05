# Estrutura visual do One: pesquisa

Data: 2026-11-05. Complementa `../identidade-visual/pesquisa.md` e `../revisao-ux/pesquisa.md`, e as fontes de lá não se repetem sem necessidade. O alvo é a casca compartilhada, que um revisor anterior culpou pela nota 4 de 10 em "parece template ou feito por IA". Onde não li a fonte primária, está marcado **não verificado**. Os contrastes são cálculo meu a partir dos tokens de `web/src/index.css` (OKLCH para sRGB, sem navegador). O cálculo reproduz os 1,21:1 e 1,30:1 de AD-035, mas não substitui a medição no navegador.

## O achado que organiza o resto

A casca é, quase linha por linha, o bloco `sidebar-07` do shadcn. Não é impressão:

| O bloco | Fonte | No One |
|---|---|---|
| "A sidebar that collapses to icons" | https://ui.shadcn.com/blocks/sidebar | `web/src/Autenticado.tsx:214` |
| `<SidebarTrigger className="-ml-1" />` seguido de `<Separator orientation="vertical" …h-4>` | https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/blocks/sidebar-07/page.tsx | `web/src/Autenticado.tsx:241-242` |
| `SidebarMenuButton size="lg"`, avatar `h-8 w-8`, `ChevronsUpDown` com `ml-auto size-4`, menu `side="right"`, `align="end"`, `sideOffset={4}` | https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/blocks/sidebar-07/components/nav-user.tsx | `web/src/Autenticado.tsx:153-161` |
| `<div className="overflow-hidden rounded-md border">` em volta da tabela | https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/components/radix/data-table.mdx | `web/src/Tabela.tsx:64` |

O código admite a origem em dois comentários: "padrão do data-table do template" (`web/src/Tabela.tsx:34`) e "Compositor no estilo do ChatGPT" (`web/src/assistente/Assistente.tsx:271`). A boa notícia é que a troca não pede biblioteca nova. O primitivo `ui/sidebar.tsx` fica, e o que muda são as marcas que o bloco imprime por cima dele.

## 1. Barra lateral e topo (maior peso)

### O que lê como template hoje
- A tabela acima: trigger + separador, cartão de usuário com avatar e `ChevronsUpDown`.
- Tema em botão redondo só com ícone, no canto do topo (`web/src/Autenticado.tsx:78`).
- Item ativo como pílula cinza (`web/src/ui/sidebar.tsx:471`, `data-[active=true]:bg-sidebar-accent`). `--sidebar-accent` é `oklch(0.95 0 0)` (`web/src/index.css:17`). `--sidebar-primary` existe e nenhuma tela o usa (grep em `web/src`). A regra de `../revisao-ux/pesquisa.md` §15 (cor da instituição no item ativo) não vale na barra, só na barra de abas (`web/src/Autenticado.tsx:277`).
- Os `--sidebar*` são os cinzas puros de fábrica (`web/src/index.css:13-20`). O revisao-ux door 2 tingiu `background`, `muted`, `accent`, `border` e `input`, mas não a barra. Ela é o único neutro sem matiz da tela.
- Topo com `bg-background/90 backdrop-blur` (`web/src/Autenticado.tsx:237`), outra marca de fábrica: o conteúdo que passa embaixo mal aparece.
- Grupos com título + ícone em toda linha (`:114`, `:127`). Isso sozinho não é defeito: veja abaixo.

### O que as fontes dizem
- Navegação não deve competir com o conteúdo. O Linear deixou a barra "a few notches dimmer", usa menos ícones, menores, e tirou os fundos coloridos. Os princípios: "Don't compete for attention you haven't earned" e "Structure should be felt not seen". https://linear.app/now/behind-the-latest-design-refresh
- O item atual se marca com uma borda de destaque, não com pílula: o USWDS manda usar o estado "active" e tem até um ajuste próprio para a largura dessa borda (`$theme-sidenav-current-border-width`). https://designsystem.digital.gov/components/side-navigation/ · O Primer marca com `aria-current="page"`. https://primer.style/product/components/nav-list/
- **Grupos com título são legítimos**: "Use groups to simplify navigation in long lists" (https://primer.style/product/components/nav-list/); o MoJ também agrupa em seções com título, mas diz para não usar esse componente como navegação global e o marca "To be reviewed" (https://design-patterns.service.justice.gov.uk/components/side-navigation/). AD-028 fica de pé.
- **Ícone + rótulo também é legítimo**: "Leading visuals are commonly used" (Primer, mesma URL), e a NN/g exige rótulo visível junto do ícone, porque ícone ambíguo vira "visual noise". https://www.nngroup.com/articles/icon-usability/ Tirar os ícones é escolha estética, sem amparo de usabilidade.
- Conta e ajustes no canto superior direito é o arranjo do Atlassian (notificações, ajuda, ajustes, perfil em `TopNavEnd`, https://atlassian.design/components/navigation-system/top-nav-items/examples) e do Moodle (menu do usuário "in the top-right corner", https://docs.moodle.org/404/en/User_menu). Moodle é o produto mais parecido com o nosso, e o Atlassian mantém o botão de recolher no início do topo (https://atlassian.design/components/navigation-system/layout/examples). Logo, **o botão de recolher no topo não é erro**; a marca de fábrica é o par botão + separador.
- Marca sem pintar a interface: o Stripe limita de propósito o estilo dos apps por causa do contraste e deixa a cor livre só num indicador. https://docs.stripe.com/stripe-apps/design

### Opções

**A. Tirar as marcas do bloco, mantendo o primitivo (recomendada).** Cerca de 2 h no código, mais testes.
- `index.css`: tingir `--sidebar`, `--sidebar-accent` e `--sidebar-border` como os outros neutros.
- `ui/sidebar.tsx:471`: ativo sem pílula, com barra de 3 px à esquerda em `--sidebar-primary` e texto em `--sidebar-foreground` com peso `semibold`. **A cor da marca vai na barra, não no texto**: uma cor no limite de 4,5:1 contra branco (testei `#0a7cc2`) dá cerca de 4,3:1 sobre `--sidebar`, abaixo do mínimo para texto de 14 px. A barra só precisa de 3:1. Desenhe a barra com borda ou pseudoelemento, não com `box-shadow`, que some em cores forçadas (item 5).
- Rodapé: linha "Tema" como `SidebarMenuButton`, abrindo o mesmo `Popover` e as mesmas `OpcoesDeTema` (`:47`, `:82`). O sol sai do topo. O aluno no celular já tem Tema na aba Conta (`web/src/acesso/Conta.tsx:47-51`), então para ele o topo fica sem nada redundante.
- Cartão do usuário: nome e papel em texto, sem `ChevronsUpDown` e sem círculo com iniciais na barra aberta. As iniciais continuam só na barra recolhida, onde nada mais identifica a pessoa (`arranjo.spec.ts:1213`).
- Topo: apagar o `Separator` (`:242`) e o `backdrop-blur`. No desktop, o botão de recolher vai para o rodapé da barra, só ícone e com o mesmo `aria-label`. No celular de quem não é aluno, continua no topo, com o ícone `Menu` no lugar de `PanelLeft`.
- **Fica:** `Sidebar`, `SidebarProvider`, `SidebarInset`, grupos, tooltips, `one-barra`, gaveta no celular, barra de abas.
- **Testes que quebram:** `arranjo.spec.ts:870-879` (ordem no cabeçalho e separador), `:875`, `:904-918` (botão do usuário e seta), `:1200-1204`, `push.spec.ts:99`, `identidade.spec.ts:224` (pílula de Tema) e as listas `:272` e `:285`, `src/test/interface.test.ts:68` (valores de `--sidebar`). **Devem resistir, mas confira:** `ux.test.tsx:128`, `interface.test.ts:249`, `acesso.test.tsx` e `icones.test.tsx`, que buscam o botão por nome em qualquer lugar da tela. Atenção a `ux.spec.ts:117-123`: a linha nova entra na medição de 44 px.

**B. A + texto sem ícones na barra aberta e sem a trilha recolhida.** Mais 1 h e bem mais teste.
- `collapsible="offcanvas"` em `Autenticado.tsx:214` (recolher esconde a barra inteira) e ícones escondidos. Sem a trilha não sobra motivo para os ícones: mostrá-los só na recolhida daria um desenho que a pessoa nunca viu ligado ao rótulo. Apaga código e é a mudança mais visível contra o `sidebar-07`.
- **Quebram:** `arranjo.spec.ts:806`, `:1034`, `:1056`, `:1154`, `:1213`, `:1295`, `ux.spec.ts:117-123`, `aparencia.spec.ts:120-164`, `aparencia.test.tsx:118` e `push.spec.ts:90`. Muda a decisão de recolher em ícones (`Autenticado.tsx:311`, `barra-lateral-grupos` e `layout-painel`) e AC 33 de `aparencia-instituicao` (ícone na barra recolhida), então **pede AD do usuário**. Deixe para depois de ver a opção A em prints.

**C. Navegação no topo, sem barra lateral** (Moodle, https://docs.moodle.org/dev/Moodle_4.0_navigation_improvements, lido só no trecho da busca, **não verificado**). Administrador tem 10 itens em 3 grupos e 1024 px não comporta isso sem um menu "Mais". Quase toda a suíte de arranjo mede a barra. **Rejeitada antes do congelamento.**

**Rejeitada também:** barra pintada com a cor da instituição, como faz o Canvas LMS com tokens de navegação (trecho de busca de https://community.canvaslms.com/t5/Canvas-Resource-Documents/Canvas-Theme-Editor-Components/ta-p/387083; a página não abriu, **não verificado**). Daria identidade imediata, mas viola a regra de cor de ação e exigiria nova conta de contraste.

### Invariantes
44 px no toque (`ui/sidebar.tsx`, `max-md:h-11 pointer-coarse:h-11`); barra de abas do aluno intacta; `h1` único no topo; `role="group"` nomeado (AD-028); cor de ação só na barra do ativo; neutros tingidos com a matiz de `--marca`; logo e `Sigla` por instituição (AC 32 e 33); `aria-current` do `NavLink`.

## 2. Caixa de envio

### O que lê como template hoje
`web/src/assistente/Assistente.tsx:297`: `rounded-3xl border bg-background p-1.5 shadow-sm`, com enviar redondo só com ícone (`:318`). Três problemas além da aparência:
- `rounded-3xl` (24 px) está fora da escala de AD-034 (4, 6, 12, 16), e `../identidade-visual/pesquisa.md` §2 proíbe sombra em elemento estático.
- A borda da caixa usa `--border`: **1,30:1** contra o fundo. Como o `Textarea` dentro dela tem `border-0`, esse é o único contorno do campo. AC 4 de `revisao-ux` pede 3:1 na borda de `Input`, `Textarea` e `NativeSelect`, mas o teste (`ux.spec.ts:218-222`) só mede os campos de um diálogo e não vê este.
- A segunda linha (`:316-321`) existe para um "Encerrar" que nem sempre aparece. Nos prints de 390 e 1440 ela é linha morta: a caixa tem cerca de 100 px para uma linha de texto. No celular, essa altura sai da conversa.

### O que as fontes dizem
- Rótulo junto do ícone importa mais em IA generativa: "pairing icons with descriptive labels is even more important". https://www.nngroup.com/articles/prompt-controls-genai/. A mesma página pede convenções conhecidas, então a seta redonda não é erro de usabilidade.
- **Contra a minha recomendação:** o Cloudscape, sistema maduro, põe a ação e os anexos dentro do mesmo campo (`actionButtonIconName`, `secondaryContent` "such as file attachments", `maxRows` padrão 3). https://raw.githubusercontent.com/cloudscape-design/components/main/src/prompt-input/interfaces.ts. A caixa única é um padrão válido; o que lê como ChatGPT é o raio, a sombra e a seta juntos. A página de uso dele não renderizou, **não verificado**.

### Opções

**A. Campo comum sem caixa externa, com "Enviar" escrito (recomendada).** Cerca de 45 min. Linha única: `[clipe] [campo com borda --input] [Enviar]`. "Encerrar" sobe para a linha de "Falar com atendente", reaproveitando o `flex flex-wrap gap-1.5` de `:287-292`. Tira o `<form className>` da caixa, `border-0 bg-transparent shadow-none focus-visible:ring-0` e `focus-within:border-ring`, e o foco passa a ser o de qualquer campo. É **quase só apagar**, e o campo fica igual ao "Responder" do detalhe.
- **Fica:** `Textarea`, `Button`, `BotaoAnexar`, `Selos`, `enviarComEnter`.
- **Quebram:** `identidade.spec.ts:220` (pílula passa a 6 px, e as listas `:272`/`:285` ficam com sobra), `celular.spec.ts:43` (mede `icon` no Enviar; troque por `MenuAcoes`). `ux.spec.ts:424` e `arranjo.spec.ts` buscam por nome e continuam valendo. Grep por `rounded-3xl` nos testes: nenhum.

**B. Manter a caixa com raio de 12 px, sem sombra, borda `--input` e sem a linha morta, seta redonda mantida.** Cerca de 30 min, nenhum teste quebra pelo que li. Conserta o contraste e a altura, mas ainda lê como chat de prateleira.

**C. Faixa encostada na barra de abas (`border-t`, largura total no celular).** Parece app de mensagens, mas exige mexer no contêiner da página e em `--barra`, e pode conflitar com `arranjo.spec.ts:104`. Sem ganho claro sobre A.

### Invariantes
16 px no campo do celular (`ux.spec.ts:52`, revisao-ux §5); 44 px no clipe e no Enviar; `aria-label`/nome "Enviar"; `rows={1}` crescendo até `max-h-52`; Enter envia; Enviar na cor de ação, `disabled` quando vazio; o campo é o mesmo em todas as marcas.

## 3. Tabelas em caixa arredondada

### O que lê como template hoje
`web/src/Tabela.tsx:64` é o wrapper exato do data-table do shadcn (tabela do início), com cabeçalho `bg-muted` (`:66`). O `sticky top-0` de `:66` parece inerte: o `Table` fica dentro de `overflow-x-auto` (`web/src/ui/table.tsx:13`), que não rola na vertical. Dedução minha, não testada.

### O que as fontes dizem
- O GOV.UK não usa caixa: célula com `border-bottom: 1px solid`, cabeçalho em negrito, `padding` só à direita (primeira coluna alinhada com o texto da página) e `padding-right: 0` na última. https://raw.githubusercontent.com/alphagov/govuk-frontend/main/packages/govuk-frontend/src/govuk/components/table/_mixin.scss
- O USWDS tem variante sem borda para quando a informação deve "feel more a part of the text". https://designsystem.digital.gov/components/table/
- Números à direita e em tabular: "align the numbers to the right" (https://design-system.service.gov.uk/components/table/); "Right-align numeric values and use the `tabular-num`" (https://primer.style/product/components/data-table/guidelines/).

### Opções

**A. Tabela aberta: só linhas horizontais (recomendada).** Cerca de 30 min. Em `Tabela.tsx:64-66`, tirar `overflow-hidden rounded-md border` e `bg-muted`; cabeçalho em `font-semibold` com fio inferior mais escuro; `first:ps-0` e `last:pe-0` nas células para alinhar à margem da página. `TabelaRanking` (`web/src/indicadores/Indicadores.tsx:69`) já não tem caixa, e as 9 métricas com fio fino nos prints de Indicadores mostram que esse desenho combina com o resto.
- **Fica:** todo `ui/table.tsx`, `Cartoes`, `MenuAcoes`, `Detalhe`, colunas `largo`.
- **Quebra:** `arranjo.spec.ts:1086-1095` (`thead` com fundo `--muted`; inverter a asserção). Avaliar `identidade.spec.ts` C33 a C34 na hora de rodar.

**B. Manter o contorno, com canto reto e cabeçalho sem fundo.** 15 min, mesma asserção quebra. Tira parte da marca, mas continua sendo uma caixa, e `../identidade-visual/pesquisa.md` §2 já pede menos bordas.

**C. A + `densa` em todas as listas no celular** (linhas em vez dos cartões de `web/src/index.css:164`). Quebra `identidade.spec.ts:237` e `arranjo.spec.ts:626`. Administrador no celular é caso raro. **Não faça agora.**

Depois de A, `Conta.tsx:42` e `Matriculas.tsx:32` ainda têm `divide-y rounded-md border`. Mesmo tratamento se sobrar tempo; `Conta` é do aluno e vale mais.

### Invariantes
Colunas `largo` e a linha `Detalhe` por `@2xl/main`; abaixo de 768 px sem `<table>` (`celular.spec.ts:105`); `MenuAcoes` com 44 px no toque. Sem caixa, o foco das linhas deixa de ser cortado pelo `overflow-hidden`, o que ajuda o item 5.

## 4. Gráficos

### O que lê como template hoje
`web/src/indicadores/Grafico.tsx` é o único uso do Recharts no app: um chunk de 197 KB sem compressão (`api/wwwroot/assets/Grafico-*.js`, build local) para dois rankings de barras.
- Linha de eixo e tracinhos de fábrica: `axisLine` e `tickLine` não foram desligados (`:21-38`).
- Barra sem limite de altura ocupa a faixa de 36 px, e com uma só categoria o gráfico vira um bloco largo de cerca de 60 px (print `depois-indicadores-1440-light.png`). `radius={4}` em todos os cantos (`:39`).
- **Nenhum número na barra.** Quem quer o valor precisa abrir "Ver tabela". Carbon: "use labels directly on the chart". https://carbondesignsystem.com/data-visualization/chart-anatomy/
- O rótulo cortado vem de `width={136}` (`:24`) com até 24 caracteres por linha (`:8`). A 12 px, dá cerca de 145 px em 136, então o `textAnchor="end"` empurra o começo para fora do SVG. Estimativa minha; `verification.md` registra o corte, mas os prints só têm 390 e 1440 com rótulos curtos, e não reproduzi a 360 e 1024.
- Comportamento padrão: `isAnimationActive` vale `"auto"`, então a barra entra animada (https://recharts.github.io/en-US/api/Bar, lido via Context7). Isso talvez explique a barra curta nos prints; **não verificado**.

### O que as fontes dizem
- Comprimento é o que importa em barras: "we pre-attentively process the length of each bar". https://www.nngroup.com/articles/dashboards-preattentive/. Evite encher o quadro: "Avoid filling the chart frame with too many elements" (Carbon, acima).
- `YAxis width` aceita `auto` ("will attempt to resize the axis based on its content", https://recharts.github.io/en-US/api/YAxis), e `Bar` tem `maxBarSize`, `radius` em array e `label` (https://recharts.github.io/en-US/api/Bar). Não verifiquei se o `auto` mede o `tick` personalizado de `:26`.

### Opções

**A. Só props do Recharts.** Cerca de 1 h. `axisLine={false} tickLine={false} maxBarSize={14} radius={[0, 2, 2, 0]} isAnimationActive={false}` e `label` com o total na ponta. O corte se resolve subindo `width` de 136 para cerca de 152 (medir o pior rótulo), o que mantém as 2 linhas que `arranjo.spec.ts:723` e `celular.spec.ts:83` exigem; `width="auto"` é a alternativa, se medir certo. `ux.spec.ts:1344` procura branco no SVG: confira a cor do `label`. O resto fica.

**B. Barras em HTML dentro da própria tabela, sem Recharts (recomendada se houver tempo).** Cerca de 3 h. `Grafico.tsx` sai. `TabelaRanking` ganha, em cada linha, categoria, total à direita em tabular e uma barra `<div style={{ width: pct }}>` em `var(--chart-1)`. No estreito, a barra fica embaixo do rótulo. O rótulo quebra como texto normal, então **o corte deixa de existir em qualquer largura**. Some a duplicação gráfico `aria-hidden` + tabela escondida, o item 6 ("Ver tabela") se resolve sozinho e cai uma dependência de 197 KB que só atendente e administrador baixam.
- **Quebram:** `ux.spec.ts:1325`, `:1344`, `:1477-1490` (seletor das barras; as asserções de cor valem igual), `arranjo.spec.ts:284-289`, `:723`, `celular.spec.ts:69`, `:83`, `identidade.spec.ts:855-868` (C30), `src/indicadores/indicadores.test.tsx:174`. Encerra os AC do revisao-ux citados em `Grafico.tsx:3-5` e `Indicadores.tsx:15` (chunk próprio, tabela recolhida), então **pede AD**. Volta atrás com `git revert`.

**C. Trocar a biblioteca.** Não: é o mesmo gráfico com outra casca e dependência nova.

### Invariantes
Cor das barras em `--chart-1`, diferente de `--primary` e com 3:1 sobre o fundo (`ux.spec.ts:1485`), porque cor de ação não vai em dado; sem caixa (C30, AD-034); sem rosca (revisao-ux §13); título do ranking acima; estado vazio com `BlocoVazio`.

## 5. Foco a 3:1 e área de anexos (obrigatório por AD-035)

### Estado real
- Critério AA: 1.4.11 exige que o indicador de foco tenha contraste suficiente "against the adjacent background". https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html. O 2.4.13 Focus Appearance (área de 2 px de perímetro, 3:1 entre focado e não focado) é **AAA**: não o prometa, embora a solução abaixo o atenda em área. https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- **São três fontes do `/50`, não uma:** `ring-ring/50` em 8 arquivos (`ui/button.tsx:7`, `badge`, `input`, `textarea`, `native-select`, `tabs`, `calendar` e `conhecimento/Resposta.tsx`), `outline-ring/50` no `*` (`web/src/index.css:155`) e `ring-sidebar-ring` com `--sidebar-ring` próprio (`index.css:20`, `ui/sidebar.tsx:471`).
- Sem o alfa, com `--ring` a 100%, os números são estes (mínimo do tema sobre `background`, `muted`, `accent` e `sidebar`):

| Caso | Claro | Escuro | Preto |
|---|---|---|---|
| Sem cor, hoje (`0.708` / `0.556`) | **2,23 a 2,51** | 3,26 a 4,16 | 3,36 a 4,44 |
| Sem cor, com `oklch(0.5 0 0)` no claro | 5,17 a 5,81 | igual | igual |
| Marca `#8a1538` | 7,99 a 9,04 | 5,18 a 6,53 | 5,32 a 6,97 |
| Marca `#0a7cc2` (no limite de 4,5:1 contra branco) | 3,94 a 4,38 | 7,13 a 9,29 | 7,34 a 9,92 |
| Marca quase preta `#111111` (pior caso no escuro) | 15,6 a 18,1 | 3,31 a 4,01 | 3,39 a 4,29 |

Conclusão: **tirar o alfa resolve todos os casos, menos um**, o claro sem cor, porque `0.708` já reprova sozinho. Com isso, um indicador de duas cores não é necessário.

### Opções

**A. Regra global de `outline`, fora de camada (recomendada).** Cerca de 1 h + teste novo.
```css
:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
[tabindex='-1']:focus-visible { outline: none; }
```
- **Por que funciona:** "Styles that are not defined in a layer always override styles declared in named and anonymous layers" (https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer). Os utilitários do Tailwind ficam em camada (`web/node_modules/tailwindcss/index.css:1`, `@layer theme, base, components, utilities`), então a regra vence `outline-none` e `outline-hidden` (https://tailwindcss.com/docs/outline-style) sem `!important` e cobre de uma vez `Editor`, `Conta`, `Resposta`, `Autenticado` e todo o `ui/`.
- **Resolve de graça o achado sem destino de AD-035:** a linha da pergunta sem foco em cores forçadas. O `ring` do Tailwind é `box-shadow`, e "`box-shadow` is forced to 'none'", enquanto `outline-color` é só recolorido. https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors
- Tirar `focus-visible:ring-[3px] focus-visible:ring-ring/50` dos 8 arquivos, `focus-visible:ring-destructive/20` e `/40` de `ui/button.tsx:13`, `focus-visible:ring-2` de `ui/sidebar.tsx:471` e `/50` de `index.css:155`. **A auréola translúcida de 3 px é ela mesma marca do shadcn**, então o conserto de acessibilidade também ajuda na nota. Fica `focus-visible:border-ring`.
- `outline-offset` separa o contorno do botão preenchido, o que evita o botão só parecer maior (com a mesma cor, um `ring` colado funde com ele).
- **Riscos a conferir:** corte por `overflow` (`ui/table.tsx:13`, `SidebarContent`); linhas com `ring-inset` (`Assistente.tsx:194`), onde o contorno invade a linha vizinha, então use `outline-offset: -2px` ali; dropzone e anexos; `DialogContent` e `#conteudo` (`tabindex=-1`, cobertos pela segunda regra). O caso de foco com a cor da marca sobre superfície preenchida por `--primary` não deve existir hoje, mas não varri tela por tela.

**B. Trocar `ring-ring/50` por `ring-ring ring-offset-2` nos 8 arquivos.** 30 min, sem teste novo. Mantém `box-shadow`, então cores forçadas continuam sem foco, e não alcança o que tem `outline-none` escrito à mão.

**C. Duas cores, técnica C40 ou GOV.UK.** "at least one of the two colors is guaranteed to meet 3:1 contrast with any solid background color" (https://www.w3.org/WAI/WCAG22/Techniques/css/C40). O GOV.UK usa amarelo e preto (https://design-system.service.gov.uk/get-started/focus-states/). É o mais robusto, porém a tabela acima mostra que não precisamos disso, ele traz cores novas e contraria a contenção de cor. Reserva se aparecer foco sobre foto.

### Como conciliar com AC 31 de `aparencia-instituicao`
AC 31 diz: "sem `cor`, os tokens SHALL ficar com os valores de hoje". O valor de hoje no claro é o único que reprova.
- **Recomendado:** trocar só o fallback de `:root` (`web/src/index.css:35`) para `var(--marca, oklch(0.5 0 0))`, continuando cinza, e apontar `--sidebar-ring` para `var(--ring)`. Uma **AD curta emenda AC 31** nesse único valor, e AD-035 é a decisão do usuário que já manda corrigir `--ring`. Nenhum teste fixa `0.708` (grep); `src/aparencia.test.tsx:72-73` exige só `var(--marca…, …)` e passa; `ux.spec.ts:1366` compara com `referencia('--ring')` e passa. Muda a cor da borda dos campos focados sem marca, que hoje também reprova.
- **Alternativa sem emenda:** `--foco: var(--marca, oklch(0.5 0 0))` só para o contorno. AC 31 fica literalmente intacto, porém `--ring` sobra só para a borda de foco, a 2,51:1. Um token a mais para não escrever uma AD. Não recomendo.

### Área de anexos
`web/src/CampoArquivo.tsx:11`: `border-dashed` com `--border`, 1,21:1 no form do "Responder". Tracejado e área de envio não aparecem em 1.4.11, e o contorno "is only required when there is no other visual way to identify the presence of the control": o rótulo já identifica o controle, logo o caso é mais de área de soltar invisível que de reprovação literal. O GOV.UK deixou a zona maior e sempre visível, com o botão consistente com o secundário; a página não diz se é tracejada. https://design-system.service.gov.uk/components/file-upload/

- **A. Trocar por `border-input` (recomendada):** uma palavra. Dá 3,24 a 3,40:1 no form claro (herda `--input` escurecido por `.form-resposta`, sem nova regra, então C55 segue válido), 3,10 a 3,32:1 fora do form, 3,74 a 3,86:1 no escuro, 3,97 a 4,17:1 no preto. Vale nos 4 usos: `Instituicoes`, `Matriculas`, `Documentos`, `ChamadoDetalhe`. Sem teste quebrado, nenhum fixa `dashed` (grep).
- **B. Rótulo com cara de botão secundário, sem tracejado:** 15 min, mais coerente com o GOV.UK, mas o `Label` precisa seguir achado por `getByLabel`. Fica para depois.

### Teste que falta
Um spec de ~25 linhas, reaproveitando `indicador` de `identidade.spec.ts:1102-1111`: Tab por 4 telas (Fila, Assistente, Detalhe, Aparência), 3 temas, 2 marcas, mínimo de 2 px e 3:1, e uma passada com `page.emulateMedia({ forcedColors: 'active' })`. Para os anexos, a borda contra o fundo, medida como em C48. C47 continua passando: lê `outlineStyle` e `boxShadow` e pega o melhor.

### Invariantes
AC 31 para quem tem cor (o foco deriva da marca); `--input` e `.form-resposta` sem mudança (C54 a C57); cor de foco é uma das quatro permitidas.

## 6. Opcional

### Aparência, formulário longo em coluna única
- **A coluna única não é defeito.** Baymard: "single-column layouts resulted in fewer skipped fields, misinterpreted fields, and errors"; só campos da mesma entidade podem dividir linha. https://baymard.com/blog/avoid-multi-column-forms. Com a prévia fixa à direita (`Aparencia.tsx:242`), não há nem largura para duas colunas.
- **A. Não fazer nada (recomendada).** O ganho na nota é próximo de zero: só o administrador vê a tela, poucas vezes.
- **B.** Se sobrar tempo: `Contato` (horário, telefone, e-mail) em `sm:grid-cols-3` e uma linha de âncoras para as 4 seções. 30 min. Quebra possível em `identidade.spec.ts:892-898` (C32).
- **C. Abas.** Esconde campos e obriga a trocar de aba para ver erro de validação. Não.

### "Ver tabela" como botão ghost
- `web/src/indicadores/Indicadores.tsx:112` usa `Button variant="ghost"` para algo que o GOV.UK resolve com `<details>`/`<summary>` nativos, para informação que só parte das pessoas precisa. https://design-system.service.gov.uk/components/details/
- **Se o gráfico for para a opção B, este item some.** Se ficar na A: `<details>`/`<summary>` apaga o `useState` e o `useId`. 20 min. Quebram `arranjo.spec.ts:287` (role muda) e `identidade.spec.ts:213` (raio de 6 px).

## Invariantes da rodada inteira
- 44 px nos alvos de toque e 16 px nos campos do celular.
- Barra de abas no celular do aluno (3 destinos, área segura).
- Cor de ação só em botão principal, item ativo, link e foco.
- Neutros tingidos com a matiz de `--marca`, e a cor de cada instituição chegando por tokens. Toda tela nova deve ser conferida com ao menos duas marcas, nos 3 temas.
- Public Sans e Source Serif como em AD-034. Escala de raios 4, 6, 12, 16.
- Nada de copiar o visual de um produto: Linear, GOV.UK e Atlassian entram aqui como princípio.

## Ordem sugerida, corte e efeito na nota

Hoje é 05/11; AVA em 13/11; congelamento em 17/11. Os tempos são de código e ajuste de testes, **sem rodadas de verificador**: `identidade-visual` levou 6. Convém reduzir o número de checks, porque o custo real está aí.

| Ordem | Item | Opção | Tempo | Efeito honesto na nota |
|---|---|---|---|---|
| 1 | Foco + anexos | A + `border-input` | 1,5 h | -0,1 (a auréola sai; o ganho é de acessibilidade, não de nota) |
| 2 | Barra e topo | A | 2 a 3 h | -0,5 a -0,75, o maior |
| 3 | Caixa de envio | A | 45 min | -0,25 a -0,5, e é a tela que o aluno mais vê |
| 4 | Tabelas | A | 30 min | -0,1 a -0,25 |
| 5 | Gráficos | B, ou A se apertar | 3 h / 1 h | -0,1 a -0,25 |
| 6 | Barra sem ícones | 1-B, depois de ver prints | 1 h + AD | -0,25, e pode piorar a varredura |
| 7 | Aparência, "Ver tabela" | 6 | 30 min | cerca de 0 |

**Soma realista: de 4 para algo entre 2,5 e 3.** Não espere 1. Barra lateral + topo + conteúdo com ícones lucide continua sendo a forma de muito painel, e isso ninguém desfaz antes do congelamento. Esses números são julgamento meu, não medição; a nota é uma opinião de um revisor. A forma honesta de medir é pedir a mesma nota a um revisor novo, com prints antes e depois. **Os prints usam um quadrado preto como logo e foto do assistente**: um logo real da Univag pode mexer na nota tanto quanto o item 4, e custa zero de código.

**O que cortar, nesta ordem:**
1. Item 6 inteiro e a opção 1-B.
2. Gráfico B vira A, mas mantenha o conserto do rótulo cortado.
3. Tabelas nas listas de `Conta` e `Matriculas`; a `Tabela` em si leva 30 min e fica.
4. Caixa de envio A vira B.
5. **Nunca corte o item 5** (obrigatório por AD-035) nem a parte de 1-A que tira o par botão + separador, o cartão com setas e o sol.

**Decisões que precisam do usuário:** a emenda de AC 31 (item 5); encerrar os AC do gráfico se for a opção B (item 4); a barra recolhida em ícones e AC 33 só se for a opção 1-B.

## O que não consegui verificar
- **Não abriram ou não trouxeram o conteúdo:** Cloudscape, página de uso do prompt input (só li `interfaces.ts`); gov.br Design System, `https://www.gov.br/ds/components/header` (SPA, só o título); Polaris, `polaris-react.shopify.com` redireciona a `shopify.dev/docs/api/polaris`, um índice sem orientação de tabela ou navegação; PatternFly Chatbot (404); Canvas Theme Editor (a página não trouxe o conteúdo; só trechos de busca); Primer `nav-list/guidelines` (caiu na home; usei a página do componente); Carbon UI shell, que não trata de ícones, ativo nem grupos.
- **Stripe Dashboard e portais de serviço de universidades:** só vi a documentação do Stripe Apps, que não descreve a navegação do Dashboard. Não achei fonte primária de portal universitário além do Moodle e do Canvas. O visual de Linear e Stripe não foi inspecionado no produto, só em texto.
- **Bordas de tabela do Primer e do GOV.UK:** as páginas não falam em borda; o GOV.UK veio do SCSS. Do Primer não sei.
- **Nada foi rodado.** Contrastes são cálculo sem navegador, com a mistura em OKLCH aproximada; a medição final é do spec novo. Ao aplicar `outline`, o corte por `overflow` e o foco de teclado no `CampoArquivo` (o `input` é `sr-only` e não testei qual elemento recebe o foco) precisam de teste real.
- **As listas de testes que quebram** vêm de grep e leitura, não de execução. Espere um ou dois a mais.
- **O rótulo cortado** não foi reproduzido a 360 e 1024; o mecanismo é dedução. `width="auto"` com `tick` personalizado não foi testado, e o tamanho do chunk vem do `api/wwwroot` local.
- **Só vi os prints** de 1440 e 390 em claro e um em escuro; **nenhum** mostra a Fila ou uma tabela de administração, então o item 3 é leitura de código.
