# Login institucional checks

Profile: ui
Plan: `.specs/features/login-institucional/plan.md`

22 checks em 3 slices · 1 one-way door · 0 perguntas abertas

**Como as provas rodam.** Na raiz `D:\one-system`, salvo `cd web &&`. Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"`.
Playwright: `cd web && npx playwright test <arquivo> -g "<nome>"` contra o contêiner `api` da porta 8080 reconstruído com
`docker compose up -d --build api` (ou `vite preview` com `E2E_URL`), com a API simulada de `e2e/simulada.ts`. Um filtro que
não seleciona teste sai com 0 (L-002): confira com `--list` que ao menos 1 teste rodou. Larguras e alturas em px CSS da
**janela**; a altura é 800 px quando o check não diz outra. "As 3 telas" = Login (`/univag`), Primeiro acesso
(`/univag/primeiro-acesso`) e Criar senha (`/univag/definir-senha?token=t`). "Coluna" = a coluna do formulário. Toda
medida de posição é `boundingBox()`; toda medida de estilo é `getComputedStyle`. Uma cor "em `<token>`" é igual à cor
computada de um elemento de prova com `color: var(<token>)` (o padrão do C53 da layout-painel). `<base>` é o commit que
congela este arquivo, gravado em `## Handoff`.

## Checks

### S1 - Telas de entrada em duas colunas (P1) · ~6 files · ~140 KB · ~35k

[x] **C1** - Nas 3 telas, a 1024, 1280 e 1440 px: a coluna fica em x = 0 e o painel em x = metade da janela, os dois com largura de metade da janela (±1); o painel começa em y = 0 e tem altura ≥ 800 (AC 1)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "entrada em duas colunas"`

[x] **C2** - Nas 3 telas, a 360, 768 e 1023 px: o painel tem `display: none` e a coluna tem a largura da janela (±1) (AC 2)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "entrada numa coluna abaixo de 1024 px"`

[x] **C3** - Recuo da coluna nos 4 lados (`padding-top/right/bottom/left`): `24px` a 360 e 767 px; `40px` a 768 e 1280 px, nas 3 telas (AC 3)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "recuo da coluna de entrada"`

[x] **C4** - Linha da marca, nas 3 telas: ícone `svg.lucide-graduation-cap` de 24 × 24 px (±1) com `color` em `--primary`; "One" com `font-size` 16px, `font-weight` 600 e `color` em `--primary`; 8 px (±1) entre a borda direita do ícone e a esquerda de "One", na mesma linha (centros verticais a ±2); nenhum ancestral `a` nem `button`. A 360 e 767 px o centro horizontal da linha fica no centro da coluna (±1) e o topo em y = 24 (±1); a 768 e 1280 px a linha começa em x = 40 (±1) e o topo em y = 40 (±1) (AC 4)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "linha da marca na entrada"`

[x] **C5** - Bloco do formulário (o pai do `h1`), nas 3 telas, largura e x (±1): 360 px → 312 em x = 24; 390 → 320 em x = 35; 768 → 320 em x = 224; 1024 → 320 em x = 96; 1280 → 320 em x = 160; 1440 → 320 em x = 200. Com a janela de 900 px de altura, a 360 e 1280 px, o centro vertical do bloco fica no centro da área entre a base da linha da marca + 16 px e a altura da janela − o recuo (±1) (AC 5)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "bloco do formulário por largura"`

[x] **C6** - Login, a 360 e 1280 px: a página tem um único `h1`, com o texto `nome` que a API devolve para a instituição ("Centro Universitário de Várzea Grande" na simulada, sem "One" nem "·"; emenda aprovada pelo usuário em 03/11: o exemplo antes dizia "Univag"), `font-size` 24px, `font-weight` 600, `text-align: center`; "Entre com seu CPF e sua senha." começa 4 px (±1) abaixo da base do `h1`, com 14px e `color` em `--muted-foreground`; o campo CPF começa 24 px (±1) abaixo da base dessa frase (AC 6)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "cabeçalho do Login"`
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "login mostra o nome da instituição"`

**C7** - [x] Primeiro acesso e Criar senha, a 360 e 1280 px: o `h1` ("Primeiro acesso", "Criar senha") tem o mesmo `font-size`, `font-weight` e `text-align` que o `h1` do Login na mesma largura, e fica, como o do Login, no topo do bloco do formulário (y do `h1` = y do bloco, ±1); o bloco segue centrado na vertical (C5), então o y muda de uma tela para outra (emenda aprovada pelo usuário em 03/11: antes pedia o mesmo y do Login, o que contradiz o C5); nada entre o `h1` e o primeiro campo, que começa 24 px (±1) abaixo da base do `h1`; o botão ("Enviar link", "Salvar senha") tem a largura do campo (±1); "Voltar para o login" (só Primeiro acesso) fica com o centro horizontal no centro do bloco (±1). Depois do envio em Primeiro acesso, o `Alert` de sucesso começa 24 px (±1) abaixo da base do `h1` (AC 7)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "cabeçalho de Primeiro acesso e Criar senha"`

[x] **C8** - Login, a 360 e 1280 px: CPF, Senha e "Entrar" empilhados com 24 px (±1) entre a base de um e o topo do seguinte; "Entrar" com a largura do CPF (±1); o link "Primeiro acesso ou esqueci minha senha" abaixo de "Entrar" e com o centro horizontal no centro do bloco (±1); com a API recusando o login, o `Alert` fica abaixo de "Entrar" e o link abaixo do `Alert`. Com o foco no CPF, `Tab` leva a Senha, "Entrar" e o link, nessa ordem (AC 8)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "formulário do Login: espaços, erro e teclado"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "Login: campos empilhados e o erro abaixo do formulário"`

[x] **C9** - Sem rolagem horizontal (`scrollWidth` ≤ `innerWidth`) nas 3 telas a 360, 390, 768, 1024, 1280 e 1440 px (AC 9)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "sem rolagem horizontal"`

### S2 - Painel institucional (P1) · ~3 files · ~95 KB · ~25k

[x] **C10** - Painel, nas 3 telas, a 1024 e 1440 px, tema Claro: `background-color` igual ao de um elemento de prova com a classe `bg-primary/5` e com alfa > 0; `border-left-width` 1px com `border-left-color` em `--border`; `padding` 40px nos 4 lados (AC 10)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "fundo e borda do painel"`

[x] **C11** - Painel do Login a 1440 px, de cima para baixo: `h2` "Atendimento ao estudante" com 30px, peso 600 e `color` em `--foreground`; 8 px (±1) abaixo, "Dúvidas, solicitações e respostas da sua instituição em um só lugar." com 16px e `color` em `--muted-foreground`; 24 px (±1) abaixo, uma lista (`ul`) com exatamente 3 `li`, 16 px (±1) entre a base de um e o topo do seguinte, nesta ordem: `svg.lucide-message-circle` + "Tire dúvidas com o assistente a qualquer hora", `svg.lucide-list-checks` + "Acompanhe suas solicitações até a resposta", `svg.lucide-users` + "Fale com a equipe da instituição quando precisar"; cada ícone com 20 × 20 px (±1) e `color` em `--primary`, 12 px (±1) até o texto, que tem 16px e `color` em `--foreground`. Primeiro acesso e Criar senha mostram o mesmo `h2` e os mesmos 3 itens (AC 11)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "conteúdo do painel"`

[x] **C12** - Conteúdo do painel (o pai do `h2`), nas 3 telas, a 1024 × 740 e 1440 × 900 px: base do conteúdo a 40 px (±1) da base do painel; x = metade da janela + 41 (±1); largura ≤ 448 (AC 12)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "posição do conteúdo do painel"`

[x] **C13** - No Login, Primeiro acesso e Criar senha montados, os 3 `svg` do painel têm `aria-hidden="true"` e o painel não contém `a`, `button`, `input`, `select`, `textarea` nem `[tabindex]` (AC 13)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "painel de entrada sem foco e com ícones escondidos"`

[x] **C14** - Contraste ≥ 4,5:1 de `--foreground` e de `--muted-foreground` sobre o fundo do painel, calculado a partir do `index.css` como 5% de `--primary` sobre `--background` (composição alfa em sRGB codificado), nos temas `:root`, `.dark` e `.dark.black` (AC 14)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "contraste do painel de entrada"`

### S0 - Invariantes (P1) · ~5 files · ~120 KB · ~20k

[x] **C15** - Login a 360 e 1280 px: com `GET /api/instituicoes/univag` pendente, o `Spinner` (`role=status`) tem 32 × 32 px (±1) com o centro no centro da janela (±1); com a resposta 404, o `Alert` "Instituição não encontrada." tem o centro horizontal no centro da janela (±1); nos dois estados, nem "Atendimento ao estudante" nem o `h1` existem na página (AC 15)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "carregando e instituição não encontrada no centro"`
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "slug desconhecido mostra Instituição não encontrada"`

[x] **C16** - Raiz `/` e Trocar senha como antes: os testes da layout-painel que as medem passam sem mudança de asserção (AC 16)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "telas de acesso centralizadas /$"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "Trocar senha até 384 px"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "raiz com a marca e o texto centralizados"`

[x] **C17** - As mesmas requisições à API: `chamadas_iguais.py <base>` sai 0 (todo teste Vitest da base existe no alvo com as mesmas chamadas, ou está em `REESCRITOS` com a linha correspondente em `## Handoff`), e as suítes inteiras passam (AC 17)
Proof: `python .specs/features/login-institucional/chamadas_iguais.py <base>`
Proof: `python .specs/features/login-institucional/chamadas_iguais.py --autoteste`

[x] **C18** - Textos: em Login, Primeiro acesso e Criar senha, em cada estado, só aparecem os textos de hoje, sem o "·" do Login, mais os 6 marcados *(novo)* no `## Screens` do plano, com o `nome` da instituição ("Univag") no Login (AC 18)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx -t "textos das telas de acesso"`

[x] **C19** - Nenhuma cor literal nos arquivos de `web/src`, e os tokens da AD-027 com os mesmos valores nos 3 temas (AC 19)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens da paleta"`
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens de Visual"`

[x] **C20** - O `h1` de `acesso/Acesso.tsx` mantém `text-2xl font-semibold tracking-tight`, e é o único `h1` do arquivo além do de `Autenticado.tsx` (door 1)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "títulos de página"`

[x] **C21** - Os testes da layout-painel que mediam o cartão das 3 telas continuam com o mesmo nome e passam a medir a grade (Impact): `telas de acesso centralizadas /univag`, `/univag/primeiro-acesso` e `/univag/definir-senha?token=t` medem, a 360 e 1280 px, o bloco do formulário com o centro horizontal no centro da coluna (±1); `quebras medidas dos dois lados` mede o recuo da coluna (`24px` a 360, `40px` a 768); `arranjo telas de acesso` mede o bloco a 360 px em x = 24 com 312 de largura e a 1024 px em x = 96 com 320. Nenhum deles procura `[data-slot=card]` nas 3 telas (door 1)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "telas de acesso centralizadas /univag"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "quebras medidas dos dois lados"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "arranjo telas de acesso"`

[x] **C22** - Barreiras do AD-018 e o build: `crapper` 0 no limite 9.99, `dryer` sem candidato, `npm run build` sai 0; `mutator` suspenso (AD-025)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx | grep -q "No duplicate candidates found"`
Proof: `npm --prefix web run build`

## Exempted

Fora do alcance dos checks, por tela; as cores vêm dos tokens, conferidas por C19 e, no painel, por C14:

- coluna do formulário e linha da marca: altura de linha dos textos, família da fonte (`--font-sans`, C19), espessura do traço dos ícones
- formulários das 3 telas: o arranjo interno de cada `Campo` (rótulo, campo, dica: 8 px entre eles, dica de 14px), raio, borda e altura dos campos e do botão, estilo de foco e de hover do link e do botão, o Spinner dentro do botão (`requisição pendente mostra Spinner e desabilita o botão`) - componentes de hoje, sem mudança
- painel: altura de linha do título, da frase e dos itens; `tracking-tight` do `h2`; quebra de linha da frase dentro dos 448 px
- temas Escuro e Preto: as cores computadas de cada texto e ícone (só o Claro é medido em C4, C6, C10 e C11); os 3 temas ficam com o contraste do C14
- Login carregando e instituição não encontrada: recuo e largura do `Centro` (de hoje)

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| door 1, telas na grade (3) | Login C1 C2 C3 C4 C5 · Primeiro acesso C1 C2 C3 C4 C5 · Criar senha C1 C2 C3 C4 C5, table-driven over all 3 em cada | - |
| quebra de 1024 px (2 lados) | 1023 C2 · 1024 C1 | - |
| quebra de 768 px (2 lados) | 767 C3 C4 · 768 C3 C4 | - |
| larguras do bloco do formulário (6) | 360 C5 · 390 C5 · 768 C5 · 1024 C5 · 1280 C5 · 1440 C5 | - |
| larguras sem rolagem (6) | 360 C9 · 390 C9 · 768 C9 · 1024 C9 · 1280 C9 · 1440 C9 | - |
| cabeçalhos do corpo (3) | Login C6 · Primeiro acesso C7 · Criar senha C7 | - |
| textos do painel (5) | título C11 · frase C11 · item 1 C11 · item 2 C11 · item 3 C11 | - |
| ícones do painel (3) | `MessageCircle` C11 C13 · `ListChecks` C11 C13 · `Users` C11 C13 | - |
| temas para o contraste do painel (3) | C14, table-driven over all 3 (`:root`, `.dark`, `.dark.black`) | - |
| estados do Login fora da grade (2) | carregando C15 · instituição não encontrada C15 | - |
| telas que não mudam (2) | raiz C16 · Trocar senha C16 | - |
| testes da layout-painel reescritos (3 testes) | `telas de acesso centralizadas` (3 casos) C21 · `quebras medidas dos dois lados` C21 · `arranjo telas de acesso` C21 | - |
| textos novos (6) | C18, table-driven over all 6 (frase do Login e os 5 do painel) | - |

- Nenhum check afirma rota ou status da API: o plano não tem `Surface`; C17 prova que as requisições não mudam
- C16 e C20 só afirmam o que testes de hoje já afirmam

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| arranjo das telas de entrada (CSS de breakpoint, não roda no jsdom) | Playwright com `boundingBox()` e `getComputedStyle` | cada quebra de `## Screens` (768 e 1024 px) numa largura de cada lado, nas 3 telas |
| textos visíveis por estado | Vitest `textos` (o padrão `estados`/`conferir`/`todos`) | cada estado de cada tela |
| contraste derivado dos tokens | Vitest sobre o `index.css` (o padrão de `contraste dos tokens`) | os 3 temas |
| `Acesso.tsx` (instrumentação: nenhuma condição nova; os ramos de carregando, erro e sucesso já existem) | nenhuma própria além das acima | coberto pelos testes das telas |

Evidence:

- `Acesso.tsx`: as condições `isError`, `isPending`, `mensagem` e `pronto` já existem e não mudam; o trabalho é trocar `Cartao` pela grade → nenhuma decisão nova
- o jsdom não aplica `lg:` nem `md:`, então o painel existe no DOM em qualquer largura: esconder e medir é só e2e (C1-C5, C10-C12)
- análogo: layout-painel provou o arranjo do mesmo jeito (C32, C39, C46)

Cost: ~9 e2e novos e 3 reescritos, ~2 Vitest novos e 3 de textos ampliados.

## Swept

- validation: existing - `obrigatorio` (Zod) dos formulários de acesso, provado por `formulários de acesso exigem só os obrigatórios`
- failure modes: C15 (instituição não encontrada), C8 (`Alert` do login recusado)
- idempotency: n/a - nenhuma gravação nova
- authorization: n/a - telas públicas; existing - a API decide o login
- concurrency: n/a - nenhum estado compartilhado novo
- data lifecycle: n/a - nada gravado, nada a migrar
- dependency failure: C15 (a consulta da instituição falha ou não volta)
- state transitions: C7 (formulário → `Alert` de sucesso em Primeiro acesso); existing - `definir senha envia o token do link e mostra Senha criada`
- observability: n/a - nenhum log no `web/`

## Handoff

Estimativa (`wc -c` / 4): `Acesso.tsx` 7 KB, `arranjo.spec.ts` 73 KB, `textos.test.tsx` 7 KB, `acesso.test.tsx` 29 KB,
`interface.test.ts` 17 KB, `simulada.ts` 9 KB e este plano 22 KB = 164 KB ≈ 41k de leitura. Somando ≈ 15k de escrita e
≈ 15k de suítes, dá **~71k**, abaixo do orçamento de 150k - um construtor, sem pergunta.

- Feature base (`<base>`): o commit `docs(login-institucional): plan, checks and AD-030`
- Mechanism: one builder (Sonnet, preferência do usuário de 02/11)

### Build

- **Boundary**: C1-C6 e C8-C22 fechados em 3142042 (provas: Playwright `entrada institucional` + os 3 reescritos, 90 de 91 verdes; Vitest 277/277; `chamadas_iguais.py 1e9e76c` e `--autoteste` saem 0; `crapper` 0, `dryer` sem candidato, `npm run build` 0). **C7 aberto**: a prova `cabeçalho de Primeiro acesso e Criar senha` falha só na afirmação "mesmo y (±1) que o h1 do Login": o bloco é centrado na vertical (AC 5) e o do Login é mais alto, então o h1 do Login fica mais acima (240 contra 285 px a 360 px). As demais afirmações do C7 passam. Precisa de decisão: trocar "mesmo y" por "mesma posição dentro do bloco" ou alinhar o bloco ao topo.
- **Settled mid-build**: (1) `simulada.ts` devolve `nome` = "Centro Universitário de Várzea Grande", não "Univag" (C6): os testes e2e comparam com esse nome. (2) "CPF"/"Senha" em C6, C7 e C8 são medidos no `Campo` inteiro (rótulo + campo), pois o espaço de 24 px é entre campos; "Entrar"/botão comparam a largura com o `input`. (3) A frase do Login usa `-mt-5` para ficar a 4 px do `h1` com o `h1` filho direto do bloco (C5 chama o bloco de "o pai do h1"). (4) C15: o `Spinner` gira, então a caixa de `boundingBox()` incha (35 px); o tamanho vem de `getComputedStyle` (32 px) e o centro da caixa. (5) C9 é provado pelo teste existente `sem rolagem horizontal` (já cobre as 3 telas nas 6 larguras). (6) Reescritos: `telas de acesso centralizadas` (3 casos, a raiz `/` com as mesmas asserções), `quebras medidas dos dois lados` e `arranjo telas de acesso`, como o C21 manda; nenhum teste Vitest da base foi renomeado, `REESCRITOS` vazio. `login mostra o nome da instituição` não foi alterado (não contradiz o C6). (7) A marca "One" está num `span` para medir o espaço até o ícone.
- **Abandoned**: nada.
- **Emendas após o build (orquestrador, aprovadas pelo usuário em 03/11):** C7 pedia o `h1` de Primeiro acesso e Criar senha no mesmo y do Login, o que contradiz o C5 (bloco centrado na vertical; o do Login é mais alto: 240 contra 285 px a 360 px). Passou a pedir o `h1` no topo do bloco nas 3 telas; o teste mede `h1.y = bloco.y` (±1), também no Login. C6: o exemplo "Univag" virou "Centro Universitário de Várzea Grande", o `nome` que `e2e/simulada.ts` devolve; a exigência (o `h1` é o `nome` da API) não mudou
