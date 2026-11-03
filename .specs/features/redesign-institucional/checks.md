# Redesign institucional - checks

Profile: ui
Plan: `.specs/features/redesign-institucional/plan.md`

27 checks em 5 slices · 4 one-way doors · 0 perguntas abertas

**Como as provas rodam.** Na raiz `D:\one-system`, salvo `cd web &&`. Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"`.
Playwright: `cd web && npx playwright test <arquivo> -g "<nome>"` contra o contêiner `api` da porta 8080, reconstruído
com o `web/` do commit (`docker compose up -d --build api`), com a API simulada de `e2e/simulada.ts`. Um filtro que
não seleciona teste sai com 0 (L-002): conferir com `--list` ou com a contagem do relatório que rodou ao menos 1.
`<base>` é o commit que congela este arquivo, gravado em `## Handoff`.

## Checks

**Nota de 03/11/2026 (decisão do usuário durante o build, door 3a):** a barra lateral é o mesmo `<nav>` da barra de topo, restilizado a partir de 1024 px, e não um `<aside>` à parte; C8 a C14 foram reescritos só nessa palavra, com os mesmos valores.

### S1 - Tokens e tema Preto (P1) · 6 files · 38 KB · ~10k

**C1** - [x] `index.css` declara em `:root`, `.dark` e `.black` exatamente os valores da tabela de `## Visual` (o `.black` só com as linhas que não são `=`), `.black` depois de `.dark`, e cada token exposto em `@theme inline` (AC 1, door 2)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens da paleta"`

**C2** - [x] Nos 3 temas (`:root`; `.dark`; `.dark` sobreposto por `.black`) os 8 pares de `## Visual` têm contraste de ao menos 4,5:1: foreground/background, foreground/card, muted-foreground/background, muted-foreground/muted, muted-foreground/primary-subtle, muted-foreground/warning-subtle, primary-foreground/primary, destructive/background (AC 2)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "contraste dos tokens"`

**C3** - [x] "Tema" lista, nesta ordem, "Claro", "Escuro", "Preto", "Sistema"; escolher "Preto" em "Tema" grava `black` em `one-tema` e põe `dark` e `black` no `<html>` (AC 3, door 1)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "Tema grava a escolha em one-tema"`

**C4** - [x] Escolher "Claro", "Escuro" ou "Sistema" depois de "Preto" tira `black` do `<html>` (AC 4)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "sair do Preto tira a classe black"`

**C5** - [x] Com o tema Preto o `background-color` computado do `<body>` é `rgb(0, 0, 0)` (AC 5)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "tema Preto com fundo preto"`

**C6** - [x] Com o tema Preto o Toaster do Sonner é renderizado com `data-sonner-theme="dark"` (AC 6)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "Toaster escuro no tema Preto"`

**C7** - [x] `one-tema` gravado antes desta feature com `light`, `dark` ou `system` aplica o mesmo tema de antes, sem `black` (AC 7)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "valor antigo de one-tema"`

### S2 - Barra lateral (P1) · 4 files · 63 KB · ~20k

**C8** - [x] A 1024 × 740, 1280, 1536 e 1920 px o `<nav>` é a barra lateral à esquerda (x = 0), com borda direita de 1 px e fundo `--sidebar`; marca acima da instituição, a instituição inteira em até 2 linhas (`white-space: normal`), os links abaixo, um por linha de 36 px (±1) na mesma coluna, o ativo em `font-weight` 500; nenhum item sobreposto; com 240 px de largura (±1) e a altura da janela, com os 9 links do administrador visíveis, cada um com ícone e rótulo de largura maior que 10 px (AC 8, door 3)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra lateral a"`

**C9** - [x] Nas mesmas larguras não há barra de topo de 56 px nem botão "Menu" visíveis, e o `main` começa à direita do `<nav>` sem sobrepor (AC 9)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra lateral a"`

**C10** - [x] A 360, 768 e 1023 px o `<nav>` é a barra de topo, com a largura da janela e 56 px de altura, o nome da instituição com largura maior que 0 e nenhum item sobreposto, e "Menu" abre a gaveta com os links e "Sair", como antes (AC 10)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "cabeçalho a 360 px abre a gaveta Menu"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "abaixo de 1024 px sem barra lateral"`

**C11** - [x] Nenhuma tela autenticada mostra "Mais", em nenhuma largura (AC 11)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra lateral a"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "abaixo de 1024 px sem barra lateral"`

**C12** - [x] O link da rota atual no `<nav>` tem `aria-current="page"` e a classe `bg-primary-subtle`; os outros não têm nenhum dos dois (AC 12)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "link ativo da barra lateral"`

**C13** - [x] Com a página rolada 300 px, o topo do `<nav>` lateral continua em 0 px (±1) (AC 13)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra lateral a"`

**C14** - [x] Depois dos links, o `<nav>` tem, em ordem, o controle de avisos, "Tema" e "Sair" para o aluno, e "Tema" e "Sair" para atendente e administrador (AC 14)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "rodapé da barra lateral por papel"`

### S3 - Mensagens que não se partem (P1) · 3 files · 51 KB · ~15k

**C15** - [x] O `Balao`, e o trecho citado das fontes no detalhe do chamado (## Screens linha 9), põem um `<wbr>` logo depois de cada `/`, `?`, `&`, `=` e `#` do texto, e o `textContent` do balão é igual ao texto original (AC 15, door 4)
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx -t "quebra depois de / ? & = #"`
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "trecho da fonte quebra depois de / ? & = #"`

**C16** - [x] A 360 px, enviando `https://portal.univag.edu.br/financeiro/boletos/segunda-via?matricula=2000567890&semestre=2026-2`, toda quebra de linha do balão cai depois de espaço, `/`, `?`, `&`, `=`, `#` ou `-`, nunca dentro de `financeiro`, `boletos`, `segunda` ou `matricula` (AC 16)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "link longo quebra só nos separadores"`

**C17** - [x] A 360 px, uma palavra de 80 letras sem separador fica dentro do balão (borda direita do balão até 360) e `scrollWidth` da página é 360 (AC 17)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "palavra longa sem separador fica no balão"`

**C18** - [x] O balão do aluno tem `rounded-2xl rounded-br-sm`; o do assistente, o do atendente e o da nota interna, `rounded-2xl rounded-bl-sm` (AC 18)
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx -t "cantos do balão"`

**C19** - [x] Uma mensagem com `<b>x</b> & <img src=x>` aparece literal: os filhos do conteúdo do balão são só nós de texto e `<wbr>`, sem `b` nem `img` (AC 19)
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx -t "balão sem HTML"`

### S4 - Indicadores e superfícies (P2) · 13 files · 60 KB · ~18k

**C20** - [x] O rótulo do eixo do gráfico é a categoria quando tem até 18 caracteres e os 17 primeiros + "…" quando tem mais (17, 18 e 19 caracteres testados); a 360 px o rótulo de "Financeiro > Boletos e mensalidades" é um único `<tspan>` com o texto "Financeiro > Bole…" (AC 20)
Proof: `cd web && npx vitest run src/indicadores/indicadores.test.tsx -t "rótulo do gráfico"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "rótulo do gráfico numa linha"`

**C21** - [x] Todo `[data-slot=card]` de Indicadores a 1280 px tem `box-shadow` computado `none` (AC 21)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "cartões sem sombra"`

**C22** - [x] Todo `<h1` de `web/src` fora dos testes tem `text-2xl font-semibold tracking-tight` na classe (AC 22)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "títulos de página"`

**C23** - [x] A 360 px, cada uma das telas de `e2e/plataforma.spec.ts` tem `scrollWidth` de no máximo 360 (AC 23)
Proof: `cd web && npx playwright test e2e/plataforma.spec.ts -g "sem rolagem horizontal a 360 px"`

### S0 - Invariantes (P1) · 0 files novos · ~8k

**C24** - [x] As suítes inteiras passam, sem nenhuma asserção afrouxada fora das reescritas de `## Test policy` (AC 24)
Proof: `cd web && npx vitest run`
Proof: `cd web && npx playwright test`

**C25** - [x] Cada teste de `<base>` faz as mesmas chamadas à API em `<base>` e em HEAD, exceto o teste da base que a linha de `## Test policy` reescreveu (`avisos > no(a) Mais o item de avisos mostra o texto visível`), que pode faltar no HEAD; se ainda existir, é comparado (AC 24; exceção por decisão do usuário de 03/11/2026 após a verificação rodada 1)
Proof: `python .specs/features/redesign-institucional/chamadas_iguais.py --autoteste`
Proof: `python .specs/features/redesign-institucional/chamadas_iguais.py <base>`

**C26** - [x] Nenhum arquivo de `web/src` fora do `index.css` tem cor literal (AC 26); textos visíveis só mudam por "Mais" e "Preto" (AC 25)
Proof: `cd web && npx vitest run src/test/interface.test.ts -t "tokens da paleta"`
Proof: `cd web && npx vitest run textos`

**C27** - [x] Barreiras do AD-018: `crapper` sai 0 no limite 9.99 e `dryer` não acha candidato 0.8+; o `mutator` segue suspenso (AD-025) e não roda
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx | grep -q "No duplicate candidates found"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| ordem dos itens de "Tema" (4) | Claro C3 · Escuro C3 · Preto C3 · Sistema C3 | - |
| temas (4) | `light` C4, C7 · `dark` C4, C7 · `black` C3, C5, C6 · `system` C4, C7 | - |
| blocos de token (3) | `:root` C1, C2 · `.dark` C1, C2 · `.black` C1, C2 | - |
| pares de contraste (8) | C2, table-driven sobre os 8 × 3 temas | - |
| larguras da barra lateral (4) | 1024 C8 · 1280 C8 · 1536 C8 · 1920 C8 | - |
| larguras sem barra lateral (3) | 360 C10 · 768 C10 · 1023 C10 | - |
| rodapé da barra por papel (2) | aluno C14 · equipe C14 | - |
| separadores de quebra (5) | `/` C15 · `?` C15 · `&` C15 · `=` C15 · `#` C15 | - |
| textos que quebram nos separadores (2) | balão C15 · trecho da fonte C15 | - |
| arranjo da barra lateral, ## Screens linha 0 (8) | 240 px à esquerda C8 · altura da janela C8 · borda direita C8 · fundo `--sidebar` C8 · marca e instituição no topo C8 · links de 36 px um por linha C8 · ativo `bg-primary-subtle` e `font-medium` C8, C12 · rodapé avisos/Tema/Sair C14 | - |
| autores de balão (4) | aluno C18 · assistente C18 · atendente C18 · nota interna C18 | - |
| bordas do rótulo do gráfico (3) | 17 C20 · 18 C20 · 19 C20 | - |
| doors do plano (4) | door 1 C3, C7 · door 2 C1 · door 3/3a C8 · door 4 C15, C19 | - |
| títulos de página (9) | Acesso.tsx:25 C22 · Acesso.tsx:177 C22 · Matriculas.tsx C22 · Assistente.tsx C22 · Cabecalho.tsx C22 · Chamados.tsx C22 · Conversa.tsx C22 · Indicadores.tsx C22 · todo `h1` novo C22 | - |
| testes reescritos (6) | `tokens da paleta` C1 · `contraste dos tokens` C2 · textos do cabeçalho C11 · `Tema grava a escolha em one-tema` C3 · e2e da barra de topo C8, C10 · avisos no "Mais" C14, C25 | - |

- Nenhum check afirma mais do que o caso que a sua prova exercita; o arranjo fica no Playwright e as decisões no Vitest

## Test policy

Valem as linhas da `interface-nova` (`checks.md ## Test policy`): decisão de tela no Vitest pelo `App`,
arranjo com medida no Playwright, regra de código-fonte em `web/src/test/`. Uma linha a mais para
esta feature, porque ela substitui decisões que já tinham teste:

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Teste que codifica uma decisão substituída pelo AD-027 | reescrito para a decisão nova no mesmo commit da mudança; nunca apagado sem substituto nem afrouxado | o substituto afirma ao menos o mesmo número de fatos: a tabela `Tokens` ganha uma coluna, o contraste ganha um tema e 4 pares, o teste do tema ganha um valor, a lista do cabeçalho troca "Mais" por "Preto", e os 6 testes da barra de topo viram 4 da barra lateral + 1 abaixo de 1024 px |

Evidence:

- `e2e/arranjo.spec.ts:85-162`: "cabeçalho a 1024 px mostra os links na barra" e "barra a {768..1920} px" afirmam a barra com "Mais" (decisão C19 de 02/11), substituída pela door 3
- `src/test/interface.test.ts:51-65,135-160`: tabela `Tokens` e contraste de `:root`/`.dark`, substituídos pelo `## Visual` novo
- `src/acesso/textos.test.tsx:8` e `src/acesso/acesso.test.tsx:139-150`: "Mais" e os 3 temas
- `src/assistente/avisos.test.tsx` "no(a) Mais o item de avisos mostra o texto visível" (regra do `web-push`: avisos com texto visível fora da barra de topo): trocado por "na barra lateral o botão de avisos traz o texto visível" (acrescentado após a verificação rodada 1, que apontou a ausência desta linha)
- os fatos "sem sobreposição" e "nome da instituição com largura maior que 0" da barra de topo antiga seguem afirmados a 360, 768 e 1023 px (C10) e na barra lateral (C8)

Cost: 5 testes reescritos, ~10 novos.

## Swept

- validation: n/a - nenhum campo novo; o único valor lido de fora é `one-tema`, e um valor desconhecido segue o padrão do `ThemeProvider` (C7)
- failure modes: C17 (texto que não cabe não estoura a tela), C23
- idempotency: n/a - nenhuma gravação nova na API; C25 prova as mesmas chamadas
- authorization: C8, C14 (links e rodapé por papel); existing - o `Menu` filtra por papel como hoje
- concurrency: n/a - nenhum estado compartilhado novo; o tema é por aparelho
- data lifecycle: C3, C7 (o valor `black` em `one-tema` e os valores antigos)
- dependency failure: n/a - nenhuma dependência nova
- state transitions: C3, C4 (tema entra e sai do Preto)
- observability: n/a - nenhum log nem métrica no `web/`

## Handoff

Estimativa = (bytes lidos dos 21 arquivos que a feature toca, 151 545 B, contados com `wc -c`) / 4 ≈ 38k
+ reescrita dos ~45 KB que mudam / 4 ≈ 11k + testes novos ~15 KB / 4 ≈ 4k + `plan.md` e este arquivo ≈ 8k
+ saída das suítes e barreiras ≈ 10k = **~71k**, abaixo do budget de 150k.

- S1 a S4 + S0 = ~71k, todas em `web/` - um construtor, sem pergunta
- Mechanism: one builder

### Build (one builder, S1 a S4 + S0)

- **Boundary:** C1-C24, C26, C27 closed at the `feat(web)` commits after `433418e`; feature base (`<base>`) = `4797744` (`docs(redesign-institucional): plan, checks and AD-027`). Provas no HEAD: Vitest 225/225; Playwright 57/57 contra o contêiner `api` reconstruído com `docker compose up -d --build api`; `crapper` sai 0 (pior: `AvisosPush` 9.0); `dryer` sem candidato; `mutator` não rodou (AD-025)
- **C25 aberto:** `chamadas_iguais.py 4797744` acusa 1 problema: o teste de base `avisos > no(a) Mais o item de avisos mostra o texto visível` não existe no HEAD. Ele codificava o "Mais" (decisão substituída pela door 3a) e foi trocado, pela linha de `## Test policy`, por `avisos > na barra lateral o botão de avisos traz o texto visível` (mesmo ambiente, mesmo clique, mesma checagem de "Desativar avisos"). As outras 212 de 213 batem
- **Settled mid-build:** (1) decisão do usuário de 03/11: a barra lateral é o mesmo `<nav>` restilizado (door 3a), não um `<aside>`; C8 a C14 reescritos só nessa palavra (commit `433418e`). (2) As provas de C6 e C7 passaram de `src/test/tema.test.tsx` para `src/acesso/acesso.test.tsx` (`describe('tema (redesign-institucional)')`): o `estrutura em fatias` só aceita `.test.tsx` dentro de uma fatia e que abra uma tela dela. (3) No Chrome a cor computada sai em `oklch(0 0 0)`; o e2e do C5 pinta a cor num canvas e confere o pixel `[0, 0, 0, 255]`. (4) O `Text` do Recharts quebra o rótulo pela largura estimada mesmo cortado; o eixo passou a desenhar o próprio `<text><tspan>` de uma linha e a ter 136 px (com 120 o "A" de "Acadêmico > Notas…" saía cortado a 1280 px). (5) `theme_color` do manifesto e a meta `theme-color` passaram a `#224fa7`, o `--primary` claro novo (teste C93 da `interface-nova`). (6) A coluna do Assistente a 1024 px centraliza no espaço à direita da barra lateral; o e2e "arranjo Assistente" mede a partir da borda do `<nav>`. (7) Na barra lateral o botão de avisos mostra o texto (`hidden lg:inline`), mantendo a regra do `web-push` de texto visível fora da barra de topo
- **Abandoned:** `tickFormatter` sozinho no gráfico (o Recharts ainda quebrava em 2 `tspan`); teste do tema num arquivo próprio em `src/test/` (barrado pelo `estrutura em fatias`)

### Correção após a verificação rodada 1

- **Gaps tratados:** (1) C25 com a exceção do teste reescrito e o script `.specs/features/redesign-institucional/chamadas_iguais.py`, que envolve o da `interface-nova` sem mudá-lo (decisão do usuário). (2) Instituição em 2 linhas na barra lateral: nota na linha 0 de `## Screens` (decisão do usuário) e afirmada em C8. (3) Arranjo da barra lateral (borda, fundo, marca/instituição no topo, links de 36 px um por linha, `font-medium`, 1024 × 740) afirmado em C8. (4) `<wbr>` nos trechos das fontes: prova nova em C15. (5) Ordem dos temas: afirmada no teste do C3. (6) Canto da nota interna: afirmado no teste do C18. (7) Sobreposição e largura da instituição voltaram a ser afirmadas (C8, C10); a troca do teste dos avisos entrou na evidência do `## Test policy`. (8) AD-027 no `STATE.md` ganhou a nota da door 3a
