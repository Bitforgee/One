# Barra lateral: grupos, nome e recolher - checks

Profile: ui
Plan: `.specs/features/barra-lateral-grupos/plan.md`

19 checks em 4 slices · 2 one-way doors · 0 perguntas abertas

**Como as provas rodam.** Na raiz `D:\one-system`, salvo `cd web &&`. Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"`.
Playwright: `cd web && npx playwright test <arquivo> -g "<nome>"` contra o contêiner `api` da porta 8080 reconstruído
com `docker compose up -d --build api`, com a API simulada de `e2e/simulada.ts` (o `nome` do `/me` simulado é "Ana";
os testes que precisam de sobrenome trocam o `/me`). Um filtro que não seleciona teste sai com 0 (L-002).
`<base>` é o commit que congela este arquivo, gravado em `## Handoff`. Regra do arranjo e regra dos textos: as da
`interface-nova` (`checks.md`, cabeçalho).

## Checks

### S1 - Grupos (P1) · 4 files · 75 KB · ~20k

**C1** - [x] Para o administrador com os 3 papéis, a barra e a gaveta mostram, nesta ordem, "Atendimento" (Assistente, Minhas solicitações, Fila, Indicadores), "Conhecimento" (Artigos, Documentos) e "Administração" (Usuários, Matrículas, Cadastros), cada link dentro do seu grupo (AC 1)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "grupos por assunto na barra e na gaveta"`

**C2** - [x] Grupo sem link para o papel não aparece: aluno vê só "Atendimento" (Assistente, Minhas solicitações); atendente só "Atendimento" (Fila, Indicadores); administrador "Atendimento" (Indicadores), "Conhecimento" e "Administração" (AC 2)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "grupos por papel"`

**C3** - [x] Cada grupo é um `role="group"` cujo nome acessível é o título ("Atendimento", "Conhecimento", "Administração"), na barra e na gaveta (AC 3)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "grupos por assunto na barra e na gaveta"`

**C4** - [x] Arranjo a 1280 px com a barra aberta: cada título acima do primeiro link do seu grupo, em `font-size` 12 px; entre o último link de um grupo e o título seguinte há ao menos 24 px (margem de 24 px nos grupos depois do primeiro, 0 no primeiro); a 360 px na gaveta cada título tem 32 px (±1) de altura, `font-size` 12 px, e fica antes dos seus links (`## Screens`)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "grupos na barra lateral"`
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "grupos na gaveta"`

### S2 - Nome do usuário (P1) · 3 files · 70 KB · ~12k

**C5** - [x] Com a barra aberta, o `nome` do `/me` aparece no rodapé, acima de "Tema" e "Sair", numa linha (`white-space: nowrap`, `text-overflow: ellipsis`) e dentro da barra (AC 4)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "nome do usuário na barra"`

**C6** - [x] Ao abrir a gaveta, o `nome` aparece abaixo do título "Menu" (AC 5)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "nome do usuário na gaveta"`

**C7** - [x] As iniciais são a primeira letra da primeira e da última palavra, em maiúscula: "Ana Beatriz Souza" → "AS", "ana" → "A", "  Carla  Regina " → "CR" (AC 6)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "iniciais do usuário"`

**C8** - [x] Com a barra recolhida, as iniciais ficam num círculo de 32 × 32 px (±1), com o nome inteiro como nome acessível e na dica ao focar (AC 6)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra recolhida"`

**C9** - [x] A 360, 768 e 1023 px a barra de topo não mostra o nome do usuário (AC 7)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "abaixo de 1024 px sem barra lateral"`

### S3 - Recolher (P1) · 3 files · 70 KB · ~15k

**C10** - [x] A 1024 e 1280 px, com a barra aberta, há um botão "Recolher barra lateral" com `aria-expanded="true"` na mesma linha da marca (topos com diferença de no máximo 4 px), à direita dela (AC 8)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra recolhida"`

**C11** - [x] Clicar em "Recolher barra lateral" deixa a barra com 64 px (±1), o `main` começando em x ≥ 63 e o botão com nome "Expandir barra lateral" e `aria-expanded="false"`; clicar de novo volta a 240 px (AC 9)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra recolhida"`
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "recolher e expandir gravam one-barra"`

**C12** - [x] Recolhida, os 9 links seguem com o nome acessível do rótulo e só o ícone visível (rótulo com largura de no máximo 1 px), um por linha de 36 px; títulos de grupo, instituição, nome em texto e texto dos avisos não visíveis; marca acima do botão de expandir; linha de 1 px no topo do 2º e do 3º grupo; "Sair" só com ícone, abaixo de "Tema"; nenhum item visível passa dos 64 px (AC 10, `## Screens`)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra recolhida"`
Proof: `cd web && npx playwright test e2e/push.spec.ts -g "barra recolhida esconde o texto dos avisos"`

**C13** - [x] Recolhida, focar um link pelo teclado ou passar o mouse sobre ele mostra um `role="tooltip"` com o rótulo do link (AC 11)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra recolhida"`

**C14** - [x] Recolher grava `recolhida` e expandir grava `aberta` em `localStorage['one-barra']`; recarregar a página com `recolhida` começa com 64 px (AC 12, door 1)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "barra recolhida"`

**C15** - [x] Sem `one-barra`, ou com o valor `x`, a barra começa aberta (`data-recolhida` ausente ou `false`, botão "Recolher barra lateral") (AC 13)
Proof: `cd web && npx vitest run src/acesso/acesso.test.tsx -t "one-barra desconhecido começa aberta"`

**C16** - [x] A 768 px com `one-barra = recolhida` a barra de topo tem 56 px e nenhum botão "Recolher barra lateral" ou "Expandir barra lateral" está visível, nem na barra nem na gaveta (AC 14)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "abaixo de 1024 px sem barra lateral"`

**C17** - [x] Com `prefers-reduced-motion: reduce` o `transition-duration` computado do `<nav>` é `0s`; sem ele, maior que `0s` (AC 15)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts -g "movimento reduzido na barra lateral"`

### S0 - Invariantes (P1) · ~8k

**C18** - [x] As suítes inteiras passam; as asserções mudadas são só as de `## Test policy`; cada teste de `<base>` faz as mesmas chamadas à API em `<base>` e em HEAD (nenhum teste renomeado) (AC 16)
Proof: `cd web && npx vitest run`
Proof: `cd web && npx playwright test`
Proof: `python .specs/features/interface-nova/chamadas_iguais.py <base>`

**C19** - [x] Textos: só entram os marcados *(novo)* em `## Screens` (títulos dos grupos e o nome do fixture); barreiras do AD-018: `crapper` 0 no limite 9.99 e `dryer` sem candidato; `mutator` suspenso (AD-025) (AC 17)
Proof: `cd web && npx vitest run src/acesso/textos.test.tsx -t "textos cabeçalho"`
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx | grep -q "No duplicate candidates found"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| grupos (3) | Atendimento C1, C3 · Conhecimento C1, C3 · Administração C1, C3 | - |
| papéis (3) | aluno C2 · atendente C2 · administrador C2 | - |
| lugares dos grupos (2) | barra C1, C4 · gaveta C1, C4 | - |
| lugares do nome (4) | rodapé aberto C5 · gaveta C6 · iniciais recolhida C8 · barra de topo sem nome C9 | - |
| formas do nome para iniciais (3) | várias palavras C7 · uma palavra C7 · espaços sobrando C7 | - |
| estados da barra (2) | aberta C10 · recolhida C11, C12 | - |
| valores de `one-barra` (4) | `recolhida` C14 · `aberta` C14 · ausente C15 · outro C15 | - |
| larguras (2 faixas) | a partir de 1024 C10-C14 · abaixo de 1024 C9, C16 | - |
| doors do plano (2) | door 1 C14, C15 · door 2 C11, C12 | - |
| testes reescritos (3) | constante `Links` e gaveta do e2e C1, C4 · "textos cabeçalho" C19 · rodapé da barra (C14 da `redesign-institucional`) C5 | - |

## Test policy

Valem as linhas da `interface-nova` e da `redesign-institucional`.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Teste que afirma a lista de links na ordem antiga ou o cabeçalho sem grupos | reescrito no mesmo commit para a ordem e os títulos novos, sem trocar o nome do teste | os mesmos fatos (todos os links, 48 px na gaveta, "Sair" por último) com a ordem nova |

Evidence:

- `web/e2e/arranjo.spec.ts` constante `Links` (ordem antiga, usada em "cabeçalho a 360 px abre a gaveta Menu", "abaixo de 1024 px sem barra lateral" e "barra lateral a")
- `web/src/acesso/textos.test.tsx` lista `Cabecalho`, que não tem os títulos de grupo nem o nome
- `web/src/acesso/acesso.test.tsx` "cabeçalho num único nav por papel": a lista do administrador na ordem antiga (Artigos antes de Indicadores); reescrita para a ordem dos grupos
- `web/src/acesso/acesso.test.tsx` "rodapé da barra lateral por papel" (redesign C14): o nome entra antes de Tema; o teste lê só `a, button`, então não muda

Cost: 3 testes reescritos, ~10 novos.

## Swept

- validation: C7 (nome com espaços sobrando), C15 (valor desconhecido em `one-barra`)
- failure modes: n/a - nenhuma chamada nova; sem `/me` a barra não aparece, como hoje
- idempotency: n/a - nenhuma gravação na API
- authorization: C2 (grupos por papel); existing - o `Menu` filtra por papel
- concurrency: n/a - preferência por aba, lida na carga
- data lifecycle: C14, C15 (a chave `one-barra`)
- dependency failure: n/a - nenhuma dependência nova (o Tooltip vem do `radix-ui` instalado)
- state transitions: C11 (aberta ↔ recolhida), C14
- observability: n/a - nenhum log no `web/`

## Handoff

Estimativa = arquivos lidos (`Autenticado.tsx` 9 KB, `AvisosPush.tsx` 2 KB, `e2e/arranjo.spec.ts` 45 KB, `acesso.test.tsx`
20 KB, `textos.test.tsx` 6 KB, `simulada.ts` 6 KB ≈ 88 KB) / 4 ≈ 22k + escrita ≈ 10k + `plan.md` e este arquivo ≈ 7k
+ suítes ≈ 10k = **~49k**, abaixo do budget de 150k.

- S1-S3 + S0 = ~49k, só `web/` - um construtor, sem pergunta
- Mechanism: one builder
- Ordem: depois de o Verifier do `historico-legivel` terminar (os dois usam o contêiner da porta 8080)
- Feature base (`<base>`): `ff07f05` (`docs(barra-lateral-grupos): plan, checks and AD-028`)
- **Settled mid-build:** (1) construído numa worktree (`D:\one-system-barra`, branch `barra-lateral-grupos`) enquanto o Verifier do `historico-legivel` usava a árvore principal e o contêiner; os e2e rodaram contra um `vite preview` do build da worktree com `E2E_URL` (os 2 e2e que precisam da API real, `plataforma` e `anexos`, só rodam contra o contêiner). (2) Classes montadas em tempo de execução não geram CSS no Tailwind: a barra recolhida usa a variante literal `recolhida:` (`@custom-variant` em `index.css`). (3) O `Slot` do Tooltip transformava a classe-função do `NavLink` em texto e marcava todos os links como ativos: o ativo vem de `useMatch`. (4) A transição de largura disparava ao redimensionar a janela e quebrava as medidas dos e2e: só anima depois de alternar; o teste do C17 alterna antes de medir. (5) Com títulos e nome, a lista da gaveta passa dos 80vh a 740 px: a lista rola, e "grupos na gaveta" confere que "Sair" fica ao alcance. (6) A instituição recolhida usa `hidden` (o `min-w-16` ganhava do `sr-only`)
- **Abandoned:** helper `recolhida()` que montava as classes (o Tailwind não as enxerga)
- (7) O `crapper` reprovou `Autenticado` (CRAP 20.4, complexidade 14): o estado da barra foi para `useBarra`, o botão para `BotaoBarra` e a gaveta para `Gaveta`; um teste Vitest novo ("recolher e expandir gravam one-barra") cobre o alternar, antes só no e2e, e entrou como prova extra do C11
- **Boundary:** C1-C19 closed (feature base `ff07f05`; a branch foi rebaseada sobre o `historico-legivel` e entrou na `main` por fast-forward). Provas no HEAD: Vitest 238/238; Playwright 64/64 contra o contêiner reconstruído; `chamadas_iguais.py ff07f05` 229 testes, 0 problema; `crapper` 0 (pior: `Autenticado` 9.0); `dryer` sem candidato; `mutator` não rodou (AD-025)

### Correção após a verificação rodada 1

- **Gaps tratados (só testes):** arranjo da barra recolhida (marca e botão empilhados, linha entre grupos, Tema e Sair só com ícone um por linha, nome em texto escondido, nada além dos 64 px) e o texto dos avisos (prova nova em `e2e/push.spec.ts`, que serve a chave e o service worker) em C12; dica por hover em C13; botão à direita da marca em C10; margem 0 no primeiro grupo e 12 px nos títulos da gaveta em C4; nenhum botão de recolher na gaveta em C16
- **Observação do Verifier, fora do veredito e não tratada:** com a barra recolhida, uma dica aberta por hover continua na tela se a janela encolher abaixo de 1024 px sem mexer o mouse
