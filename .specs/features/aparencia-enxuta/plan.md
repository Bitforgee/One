# Aparência enxuta e app instalado com a marca

## Problem

A tela Aparência (`/:slug/aparencia`) é um formulário único: 4 seções, 11 campos de texto e 4 imagens numa
rolagem só, com a prévia ao lado. Quem entra para trocar a cor precisa passar por login, assistente e contato;
quem quer mudar o nome do assistente não sabe onde começa a seção. O botão "Salvar" fica no fim da página, então
não há sinal de que existem alterações pendentes nem de que o que foi digitado vale para todas as seções.
Os guias de configuração de SaaS (SaaSUI, "SaaS Settings Page UX Patterns") listam exatamente isso como erro
clássico: um formulário gigante sem grupos, e salvar sem estado visível.

O nome e o ícone do aplicativo instalado já saem da Aparência (manifesto por instituição, AC 51 de
`aparencia-instituicao`), mas o administrador não sabe disso:
- o campo se chama "Nome curto", e a tela não diz que é o nome embaixo do ícone no celular e na barra de tarefas;
- a prévia mostra só o login e o assistente, nunca como o app aparece na tela inicial ou na janela do computador;
- no iPhone, o Safari lê o nome de `apple-mobile-web-app-title` (o `<title>` quando falta), e o `web/` não o define;
- o ícone não tem orientação de margem nem de fundo, e o Android recorta ícones em círculo ou quadrado arredondado.

A fonte não traz números de uso. O pedido é do usuário, em 09/11/2026: planejar o que dá para personalizar, enxugar
a tela Aparência e saber se o nome do app instalado no computador e no celular pode ser personalizado.

Resposta curta à pergunta: sim, e já é. O One instalado é um PWA, não um `.exe` nem um `.apk`: o nome vem do
manifesto (`name` e `short_name`) e o ícone dos arquivos do manifesto; cada instituição já tem o seu. Falta deixar
isso visível e correto no iPhone. Um instalador nativo com nome próprio está fora (ver Out of scope).

Depois desta feature, o administrador abre a Aparência, vê 5 abas curtas, vê na prévia o que a aba atual muda
(inclusive o ícone e o nome do app na tela inicial e na janela do computador) e sabe se há algo por salvar.

## Flow

Reaproveita a tela `Aparencia.tsx`, o `PreviaAparencia.tsx`, os endpoints `GET`/`PUT /api/admin/aparencia` e o
manifesto por instituição, que já existem e não mudam; a mudança é de organização e de prévia no `web/`, mais um
`<meta>` no ponto que já troca `<title>` e manifesto.

1. admin abre `/:slug/aparencia` -> `Aparencia.tsx` (exists) lê `GET /api/admin/aparencia` (exists)
2. `Aparencia.tsx` (exists) divide o formulário em abas com `ui/tabs.tsx` (exists); a aba ativa vive em `?aba=` (como `Cadastros.tsx`, exists, AD-046); os valores ficam num estado só e sobrevivem à troca de aba
3. `PreviaAparencia.tsx` (exists) mostra o bloco da aba ativa; o bloco do app instalado é um componente novo do mesmo arquivo (new, no door - placement per conventions)
4. salvar -> `PUT /api/admin/aparencia` e `POST /api/admin/aparencia/imagens/{tipo}` (exists), como hoje
5. `aparencia.tsx` (exists, o ponto que troca `<title>`, ícone, `theme-color` e manifesto) passa a pôr também `apple-mobile-web-app-title`
6. sair da tela com alterações -> `useBlocker` como em `EdicaoDoFluxo.tsx` (exists) pergunta "Sair sem salvar?" com `Confirmar` (exists)

## Impact

| Front | What changes |
| --- | --- |
| domain | termo existente: o campo `nomeCurto` passa a se chamar "Nome do app" na tela. No JSON continua `nomeCurto` (limite 12, AC 14 de `aparencia-instituicao`). Quem ramifica nele hoje: o `<title>` e o `short_name` do manifesto, o cabeçalho da prévia e o teste de `aparencia.test.tsx`, que procura o rótulo "Nome curto" |
| tela | `Aparencia.tsx` e `aparencia.test.tsx`: os testes que buscam campos por rótulo passam a clicar na aba antes. Os rótulos dos campos fora "Nome curto" não mudam |
| index.html | continua padrão do One: sem `slug`, o `<meta>` novo não existe e o iPhone usa o `<title>` "One" |
| stored data | nada: nenhuma coluna, rota ou contrato muda |
| decisão | nenhuma AD ativa muda. O uso de `?aba=` segue o precedente da AD-046 |

## Relations

`None - no stored-data shape change`

## Surface

`None - nothing consumed outside`

## Landing

None - nenhuma coluna, rota, dependência ou contrato novo: `?aba=` é endereço de tela, trocar abas por outro arranjo depois é refatoração, e a única dependência de UI (abas) já existe em `ui/tabs.tsx`.

## Criteria

### S1: Aparência em abas, com estado de salvar visível (P1)

O administrador acha o campo pela aba e sabe o que falta salvar.

**Acceptance Criteria**

1. WHEN o `ADMINISTRADOR` abre `/:slug/aparencia` THEN the system SHALL mostrar 5 abas, nesta ordem, "Marca", "App instalado", "Login", "Assistente" e "Contato", com "Marca" ativa e só os campos da aba ativa na tela
2. The system SHALL distribuir os campos assim: Marca = cor principal e logo; App instalado = nome do app (`nomeCurto`) e ícone; Login = título, frase, itens e imagem do login; Assistente = nome, foto, boas-vindas e perguntas; Contato = horário, telefone e e-mail
3. WHEN o admin troca de aba THEN the system SHALL pôr `?aba=` com o nome da aba no endereço, manter todo valor digitado e toda imagem escolhida e ainda não salva, e o botão Voltar do navegador SHALL voltar à aba anterior
4. IF `?aba=` traz um valor que não é uma das 5 abas THEN the system SHALL abrir "Marca"
5. WHILE há alteração não salva, a barra de ações fixa no rodapé da tela SHALL mostrar "Alterações não salvas", o botão "Salvar" habilitado e o botão "Descartar"; WHILE não há, SHALL mostrar "Tudo salvo" e o "Salvar" desabilitado
6. WHEN o admin aciona "Descartar" THEN the system SHALL voltar todos os campos e imagens escolhidas ao último valor salvo, sem chamar a API
7. WHEN o admin tenta sair da tela com alteração não salva THEN the system SHALL perguntar "Sair sem salvar?" por `Confirmar`, e SHALL avisar no fechamento da aba do navegador; sem alteração, SHALL sair sem perguntar
8. IF a API recusa um campo (`400`) ou uma imagem (`413`, `415`, `400`) THEN the system SHALL mostrar o texto da API sob o campo, marcar com um ponto de erro e `aria-label` "com erro" cada aba que tem um campo recusado, e ativar a primeira aba com erro
9. WHILE a largura é menor que 768 px, the system SHALL manter a lista de abas numa linha que rola na horizontal, cada aba com pelo menos 44 px de altura, e a página SHALL ficar sem rolagem horizontal a 360 px
10. The system SHALL manter a prévia ao lado a partir de 1024 px, e SHALL mostrar nela só o bloco da aba ativa: Marca = login e botão na cor; App instalado = tela inicial e janela do computador (AC 13); Login = login; Assistente = o assistente; Contato = o bloco "Contato do atendimento"

**Independent test:** entrar como admin, mudar o nome do assistente, ver "Alterações não salvas", trocar para Contato e voltar sem perder o texto, tentar sair e ver "Sair sem salvar?", salvar e ver "Tudo salvo".

### S2: O app instalado, visível e correto no iPhone (P1)

O administrador vê e controla o nome e o ícone que o aluno terá no aparelho.

**Acceptance Criteria**

11. The system SHALL rotular o campo `nomeCurto` na aba "App instalado" como "Nome do app", com a dica "Aparece embaixo do ícone no celular e na barra de tarefas. Até 12 letras." e um contador "n/12" que fica vermelho acima de 12
12. The system SHALL mostrar, na aba "App instalado", uma dica no campo do ícone: "PNG quadrado, sem transparência, com o desenho a pelo menos 10% das bordas. O Android recorta as pontas.", e uma nota: "Quem já instalou o app pode levar um tempo para ver o nome e o ícone novos."
13. The system SHALL mostrar na prévia da aba "App instalado" dois blocos: "Tela inicial" (o ícone num quadrado de cantos arredondados, com o nome do app embaixo cortado em 12 caracteres) e "Janela do computador" (uma barra de título na `cor` com o ícone pequeno e o `nome` da instituição); o ícone é o escolhido e ainda não salvo, ou o salvo, ou o do One
14. WHEN o admin digita o nome do app ou escolhe um ícone THEN the system SHALL atualizar os dois blocos da prévia na hora, antes de salvar
15. WHERE uma tela tem `slug`, the web SHALL manter em `<head>` um `<meta name="apple-mobile-web-app-title">` com `nomeCurto` (ou o `nome`, sem `nomeCurto`); sem `slug`, SHALL remover o `<meta>`
16. WHEN o admin salva um nome do app novo THEN the web SHALL trocar o `<meta>` e o `<title>` sem recarregar a página

**Independent test:** na aba "App instalado", digitar "Univag", escolher um ícone e ver a tela inicial e a janela; salvar e ver o `<meta>` de `/univag/`.

### S3: Cor sem digitar hexadecimal (P2)

A cor sai de uma lista pronta, ou de um seletor, sem quebrar o contraste.

**Acceptance Criteria**

17. The system SHALL mostrar na aba "Marca", acima do campo hexadecimal, 8 amostras de cor como botões de rádio nomeados (por exemplo "Azul One"), todas com contraste de pelo menos 4,5:1 contra o branco, mais um seletor nativo `<input type="color">`
18. WHEN o admin escolhe uma amostra ou uma cor no seletor THEN the system SHALL pôr a cor no campo hexadecimal e atualizar a prévia, e a amostra da cor atual SHALL ficar marcada (`aria-checked`)
19. IF o seletor nativo traz uma cor com contraste menor que 4,5:1 THEN the system SHALL manter o aviso e o "Salvar" desabilitado da regra do AC 27 de `aparencia-instituicao`

**Independent test:** na aba "Marca", clicar numa amostra e ver o botão da prévia mudar; escolher no seletor um amarelo e ver o aviso de contraste.

## Out of scope

| Excluded | Why |
| --- | --- |
| Instalador nativo (`.exe`, `.apk`, loja) com nome próprio | o One instalado é um PWA; um pacote nativo exige empacotar por instituição, contra a AD-008 (um deploy para todas) |
| Nome do app diferente do nome curto | exigiria coluna nova (schema, porta de mão única); o limite de 12 já é o do aparelho |
| Ícone adaptativo do Android (`purpose: "maskable"`) | precisa de um 5º tipo de imagem ou de redimensionar no servidor (sem biblioteca de imagem, ver `aparencia-instituicao`); a dica do AC 12 cobre o recorte por ora |
| Redimensionar o ícone para 180 px do iOS | mesma razão; o `apple-touch-icon` continua o ícone enviado |
| Prefixo do protocolo (`ONE-n`), rótulos ("chamado" ou "solicitação"), rodapé e assinatura dos e-mails, tema padrão, links de termos e LGPD | candidatos reais a personalizar, mas cada um toca dados ou textos de várias fatias; ficam para a lista de candidatos, uma feature cada |
| Botão "Usar o padrão" por aba | capacidade nova; hoje esvaziar o campo já volta ao padrão (AC 12 de `aparencia-instituicao`) |
| Domínio próprio e tema Escuro forçado por instituição | AD-008 e AD-027 |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Abas ou barra lateral interna | abas em cima do formulário, `?aba=` | são 5 grupos pequenos; a barra lateral do SaaSUI é para muitos grupos, e a tela já tem a barra do app e a prévia | n |
| Onde fica o nome do app | reaproveitar `nomeCurto`, sem coluna nova | evita porta de mão única; o `short_name` do manifesto e o `<title>` já usam o campo | n |
| Ordem das abas | Marca, App instalado, Login, Assistente, Contato | do que toda instituição muda primeiro ao que só algumas usam | n |
| As 8 amostras | 8 cores nomeadas, escolhidas na construção, validadas pela mesma função de contraste do servidor e do `web/` | a lista é constante e reversível | n |
| Barra de salvar | fixa no rodapé da área de conteúdo, não da janela, acima da barra inferior do celular | segue o botão "Ações" fixo do chamado (`aparencia-instituicao`) | n |
| Perfil de verificação | `ui` | a feature muda a tela de um administrador e seu arranjo; o Verifier enumera arranjo e textos | n |

**Open questions:** 2, both `open` (nada bloqueia a construção; viram verificação em aparelho real).

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| 1 | open | O Chrome e o Edge usam o `<link rel="manifest">` trocado por JavaScript depois do carregamento para instalar o app com o nome e o ícone da instituição? Não conferi nesta pesquisa; a prova é instalar `/univag/` num Chrome real e ler o nome na janela instalada | o AC 13 mostra o que o manifesto promete; sem a prova, não se afirma que o aparelho obedece |
| 2 | open | O iPhone atualiza o nome e o ícone de um app já na tela inicial, ou é preciso reinstalar? Não conferi | o AC 12 diz só que "pode levar um tempo" |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `Aparência` | loading state | existing - o `Skeleton` de 3 blocos de `Aparencia.tsx` |
| screen `Aparência` | error state ao ler | existing - `ErroDe` com "Tentar de novo" de `Aparencia.tsx` |
| screen `Aparência` | error state ao salvar | AC 8 |
| screen `Aparência` | unauthorised state | existing - a rota é de `ADMINISTRADOR` e a API responde `403` (AC 22 de `aparencia-instituicao`) |
| screen `Aparência` | empty state | n/a - todo campo tem o padrão da instituição, não existe lista vazia |
| screen `Aparência` | destructive action confirms | existing - `Confirmar` "Remover a imagem?" de `Aparencia.tsx`; sair sem salvar, AC 7 |
| screen `Aparência` | density and ordering | AC 1, AC 2, AC 10 |
| screen `Aparência` | save state visible | AC 5, AC 6 |
| screen `Aparência` | mobile | AC 9 |
| head do HTML | nome do app no iPhone | AC 15, AC 16 |

## Sources

- Pedido do usuário em 09/11/2026 - enxugar a Aparência e personalizar o nome do app instalado.
- SaaSUI, "SaaS Settings Page UX Patterns" - formulário gigante sem grupos e salvar sem estado visível como erros de configuração; abas para poucos grupos, barra lateral para muitos.
- MDN, "Define your app icons", e web.dev, "Web app manifest" - o manifesto define `name`, `short_name` e ícones de 192 e 512 px; o iOS usa `apple-touch-icon` e `apple-mobile-web-app-title`.
