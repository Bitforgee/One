# Aparência enxuta e app instalado com a marca - checks

Profile: ui
Plan: `.specs/features/aparencia-enxuta/plan.md`

20 checks (19 + o gate da AD-018) em 3 slices · 0 one-way doors (nenhuma coluna, rota ou contrato muda) · 2 perguntas abertas, nenhuma bloqueia (plano aprovado pelo usuário em 09/11: "siga com o que for recomendado, eu aprovo o plano")

**Como as provas rodam.** Na raiz `D:\one-system`. Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"`; um filtro que não seleciona teste sai com 0 (L-002), então confira a contagem no relatório. Playwright mede com `boundingBox()` e `scrollWidth` contra o servidor de desenvolvimento: `npm --prefix web run dev` em outro terminal e, na raiz, `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- aparencia.spec.ts -g "<nome>"`. A API é simulada; nada chama IA nem e-mail real. Mutação suspensa (AD-025).

Os testes de `web/src/administracao/aparencia.test.tsx` que procuram campos por rótulo passam a abrir a aba antes (emenda aprovada com o plano, `## Impact`); as asserções de regra não mudam (C19). O rótulo "Nome curto" vira "Nome do app" nesses testes.

## Checks

### S1 - Aparência em abas, com estado de salvar visível · 4 arquivos · 45 KB · ~12k

**C1** - Ao abrir `/univag/aparencia` como administrador há um `tablist` com 5 `tab`, nesta ordem: `Marca`, `App instalado`, `Login`, `Assistente`, `Contato`; `Marca` tem `aria-selected="true"` e só os campos da aba ativa estão na tela (`Cor principal` sim; `Título do login` não) (AC 1)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "cinco abas com Marca ativa"`

**C2** - Cada aba mostra exatamente estes rótulos: Marca = `Cor principal` e `Logo`; App instalado = `Nome do app` e `Ícone do app`; Login = `Título do login`, `Frase do login`, `Itens do login (um por linha, até 3)` e `Imagem do login`; Assistente = `Nome do assistente`, `Foto do assistente`, `Boas-vindas do assistente` e `Perguntas sugeridas (uma por linha, até 4)`; Contato = `Horário de atendimento`, `Telefone` e `E-mail de atendimento`; nenhum campo aparece em duas abas (AC 2)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "campos de cada aba"`

**C3** - Clicar em `Assistente` põe `?aba=assistente` no endereço; digitar `Ana` em `Nome do assistente`, ir a `Contato` e voltar mantém `Ana`; uma imagem escolhida e não salva continua com miniatura depois da troca; `navigate(-1)` volta à aba anterior (AC 3)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "troca de aba mantém o digitado"`

**C4** - Com `?aba=xyz` abre `Marca`; com `?aba=login` abre `Login` (AC 4)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "aba desconhecida abre Marca"`

**C5** - Sem alteração a barra fixa mostra `Tudo salvo` e o botão `Salvar` está desabilitado; depois de digitar em qualquer campo mostra `Alterações não salvas`, `Salvar` habilitado e `Descartar`; depois de salvar com sucesso volta a `Tudo salvo` (AC 5)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "barra de salvar mostra o estado"`

**C6** - `Descartar` devolve todos os campos ao valor salvo (a cor, o nome do assistente e a imagem escolhida), mostra `Tudo salvo` e não faz nenhuma chamada `PUT` nem `POST` (AC 6)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "descartar volta ao salvo sem chamar a API"`

**C7** - Com alteração não salva, acionar o link `Cadastros` do menu abre o diálogo `Sair sem salvar?`; `Continuar editando` fecha o diálogo e mantém a tela e o texto digitado; `Sair sem salvar` leva a `/univag/cadastros`; o evento `beforeunload` sai com `defaultPrevented` verdadeiro; sem alteração o link leva a `/univag/cadastros` sem diálogo e `beforeunload` sai falso (AC 7)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "sair sem salvar"`

**C8** - Quando a API responde `400` com erro em `contato.email` e em `nomeCurto` ao salvar, as abas `Contato` e `App instalado` ganham um ponto com `aria-label` `com erro` e a `Marca` não; a aba ativa passa a ser `App instalado` (a primeira com erro na ordem das abas); o texto da API aparece sob o campo; o que foi digitado fica. O mesmo para um `413` e um `415` de imagem: a aba do tipo da imagem fica com o ponto e o texto da API aparece sob a imagem (AC 8)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "erro marca a aba e ativa a primeira"`
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "erro de imagem marca a aba"`

**C9** - A 360 px a lista de abas tem `scrollWidth` maior que `clientWidth` e `overflow-x` `auto`, cada `tab` mede pelo menos 44 px de altura (`boundingBox`), e o documento não rola na horizontal (`scrollWidth` igual a `clientWidth`) (AC 9)
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- aparencia.spec.ts -g "abas a 360 px"`

**C10** - A prévia mostra só o bloco da aba ativa: em `Marca` o login com o botão `Entrar` na cor; em `App instalado` os blocos `Tela inicial` e `Janela do computador`; em `Login` o login (com o título `Atendimento ao estudante` e o botão); em `Assistente` o assistente com as perguntas; em `Contato` o bloco `Contato do atendimento` com os campos preenchidos. Em cada aba os blocos das outras 4 não existem. A 1280 px a prévia fica ao lado do formulário (a esquerda da prévia maior que a direita do formulário) (AC 10)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "prévia por aba"`
Proof: `$env:E2E_URL='http://localhost:5173'; npm --prefix web run e2e -- aparencia.spec.ts -g "prévia ao lado a 1280 px"`

### S2 - O app instalado, visível e correto no iPhone · 3 arquivos · 25 KB · ~7k

**C11** - Na aba `App instalado` o campo se chama `Nome do app`, tem a dica `Aparece embaixo do ícone no celular e na barra de tarefas. Até 12 letras.` e um contador `5/12` ao digitar `Univa`; com 13 letras o contador é `13/12` e tem a classe `text-destructive` (AC 11)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "nome do app com contador"`

**C12** - Na aba `App instalado` o campo do ícone mostra a dica `PNG quadrado, sem transparência, com o desenho a pelo menos 10% das bordas. O Android recorta as pontas.` e a página mostra a nota `Quem já instalou o app pode levar um tempo para ver o nome e o ícone novos.` (AC 12)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "dicas do ícone e nota de atualização"`

**C13** - A prévia de `App instalado` tem `Tela inicial` (uma `img` do ícone e, embaixo, o nome do app cortado em 12 caracteres: `Universidade` para `Universidade Federal`) e `Janela do computador` (barra de título com o fundo igual à `cor` salva ou digitada, a `img` pequena e o `nome` completo da instituição); sem ícone salvo nem escolhido a `img` aponta para `/icons/icon-192.png`; com ícone escolhido e não salvo a `img` aponta para o `blob:` do arquivo; com ícone salvo aponta para `/api/instituicoes/univag/imagens/icone?v=3` (AC 13)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "tela inicial e janela do computador"`

**C14** - Digitar `Univag` em `Nome do app` troca o texto embaixo do ícone em `Tela inicial` para `Univag` na hora, e escolher um arquivo no ícone troca a `src` das duas `img`, sem nenhuma chamada à API (AC 14)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "prévia do app muda antes de salvar"`

**C15** - Em `/univag/` com `nomeCurto` `Univag` o `<head>` tem `meta[name="apple-mobile-web-app-title"]` com `content` `Univag`; sem `nomeCurto` o `content` é o `nome` da instituição; ao sair para uma rota sem `slug` (`/`) o `<meta>` não existe mais (AC 15)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "título do app no iPhone"`

**C16** - Salvar um `nomeCurto` novo (`Nova`) troca, sem recarregar, o `content` do `<meta>` e o `document.title` para `Nova` (AC 16)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "salvar troca meta e título"`

### S3 - Cor sem digitar hexadecimal · 2 arquivos · 18 KB · ~5k

**C17** - A aba `Marca` mostra 8 botões `radio` nomeados num `radiogroup` `Cores prontas` e um `<input type="color">` com o rótulo `Escolher cor`; o contraste de cada uma das 8 cores contra o branco, calculado por `contraste()`, é de pelo menos 4,5 (AC 17)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "oito cores prontas com contraste"`

**C18** - Clicar na amostra `Azul One` põe `#224fa7` no campo `Cor principal`, atualiza a cor da prévia (o botão `Entrar` usa `--marca-previa` igual a `#224fa7`) e a amostra fica com `aria-checked="true"` e as outras 7 com `false`; digitar no campo uma cor que não é de nenhuma amostra deixa as 8 com `false` (AC 18)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "escolher amostra preenche e marca"`

**C19** - Mudar o seletor nativo para `#ffff00` (contraste menor que 4,5) mostra `Contraste com o branco:` em vermelho (`text-destructive`) e deixa `Salvar` desabilitado; trocar por uma amostra o habilita; e os testes antigos de `aparencia.test.tsx` (prévia muda antes de salvar, salvar aplica sem recarregar, erro da API, contraste, remover imagem, 4 imagens, Ver prévia, iniciais) seguem verdes com a única mudança de abrir a aba antes (AC 19; regra do AC 27 de `aparencia-instituicao`)
Proof: `cd web && npx vitest run src/administracao/aparenciaAbas.test.tsx -t "cor sem contraste bloqueia o Salvar"`
Proof: `cd web && npx vitest run src/administracao/aparencia.test.tsx`

**C20** - O `crapper` sobre `web/src` sai 0 no limite 9.99 e o `dryer` não acha candidato com nota 0.8 ou mais (AD-018, acrescentado na construção: o gate vale para todo `web/` e faltava como check). Se o `crapper` seguir bloqueado neste computador (AD-044), o check fica aberto como "não rodou", nunca como PASS
Proof: `npm --prefix web run coverage; cd web; crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web; dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| abas, na ordem (5) | `Marca` C1 · `App instalado` C1 · `Login` C1 · `Assistente` C1 · `Contato` C1 | - |
| campos por aba (5 abas) | Marca C2 · App instalado C2 · Login C2 · Assistente C2 · Contato C2 | - |
| valores de `?aba=` (3) | `assistente` C3 · desconhecido C4 · `login` C4 | - |
| prévia por aba (5) | Marca C10 · App instalado C10 · Login C10 · Assistente C10 · Contato C10 | - |
| estados da barra de salvar (3) | tudo salvo C5 · alterações não salvas C5 · depois de salvar C5 | - |
| saídas com alteração (3) | `Continuar editando` C7 · `Sair sem salvar` C7 · `beforeunload` C7 | - |
| erros que marcam aba (4) | `400` `contato.email` C8 · `400` `nomeCurto` C8 · `413` imagem C8 · `415` imagem C8 | - |
| origem do ícone na prévia (3) | padrão do One C13 · escolhido (`blob:`) C13 · salvo (`?v=3`) C13 | - |
| origem do `apple-mobile-web-app-title` (3) | `nomeCurto` C15 · `nome` sem `nomeCurto` C15 · rota sem `slug` C15 | - |
| contador do nome do app (2) | dentro do limite C11 · acima do limite C11 | - |
| cores prontas (8), cada uma com contraste ≥ 4,5 em um teste em laço | `Azul One` C17 · `Verde` C17 · `Vinho` C17 · `Roxo` C17 · `Laranja` C17 · `Grafite` C17 · `Petróleo` C17 · `Marrom` C17 (a escolha de `Azul One` é C18) | - |
| rotas da Surface do plano (0) | `None - nothing consumed outside`: nenhuma rota nova nem alterada | - |
| startup config (0) | n/a - nenhuma configuração de inicialização muda | - |

- Claims que nomeiam tamanho de tela medido: C9 (360 px) e C10 (1280 px); cada um tem prova de Playwright que mede `boundingBox`/`scrollWidth`, as outras são de Vitest sobre o DOM
- Nenhum outro check afirma mais do que o caso que a sua prova exercita

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Tela que decide (abas, aba com erro, estado de salvar, origem do ícone) | uma prova no DOM (Vitest + Testing Library) | um caso por linha da tabela de decisão |
| Medida de layout (rolagem, altura de toque, prévia ao lado) | uma prova de Playwright com `boundingBox` | o número dito no check, com tolerância |
| Texto fixo sem decisão (dicas, rótulos) | a prova do check que o cita | o texto exato |

Evidence:

- `Aparencia.tsx` hoje: 1 componente de formulário, 3 ramos (`falhaDe`, `corProibida`, `estreito`); passa a decidir aba ativa, aba com erro, estado de salvar -> decide
- `PreviaAparencia.tsx`: 2 blocos fixos; passa a escolher bloco por aba (5 casos) e a origem do ícone (3 casos) -> decide
- análogo no repositório: `Cadastros.tsx` (abas em `?aba=`) provado em `cadastros.test.tsx`, e `EdicaoDoFluxo.tsx` (saída com alterações) provado em `paginaDoFluxo.test.tsx`

Cost: 1 arquivo de teste novo (`aparenciaAbas.test.tsx`, cerca de 19 provas) e 2 provas de Playwright em `aparencia.spec.ts`. Sem estas linhas, as 5 prévias e as 3 origens do ícone seriam provadas só pelo caminho que o teste de salvar atravessa.

## Swept

- validation: C11 (limite de 12 do nome do app), C17, C19 (contraste); os limites de texto da API não mudam
- failure modes: C8 (a API recusa e a aba mostra o erro, o digitado fica)
- idempotency: n/a - salvar duas vezes grava o mesmo `PUT` (substitui os campos), e nada novo é criado
- authorization: existing - o grupo `/admin` exige `ADMINISTRADOR` e a rota do `web/` só existe para ele (AC 22 e 23 de `aparencia-instituicao`); nada novo
- concurrency: n/a - o formulário é de um administrador por vez e o `PUT` é o último que chega; esta feature não muda isso
- data lifecycle: n/a - nenhum dado novo é guardado; as imagens e os campos seguem as regras de `aparencia-instituicao`
- dependency failure: C8 (`503` e `413`/`415` da imagem chegam como erro sob a imagem)
- state transitions: C3, C5, C6, C7 (aba ativa, tudo salvo e alterações não salvas, descartar, sair)
- observability: n/a - a tela não grava log nem métrica, como o resto do `web/`

## Out of scope

- Instalador nativo, nome do app separado do nome curto, ícone adaptativo (`maskable`), redimensionar o ícone para 180 px, `Usar o padrão` por aba, prefixo do protocolo, rótulos, e-mail, tema padrão - todos no `## Out of scope` do plano, com o motivo

## Handoff

Arquivos que a feature toca, em bytes (`wc -c` por `Get-Item`): `Aparencia.tsx` 13 275 · `PreviaAparencia.tsx` 3 432 · `CampoImagem.tsx` 1 926 · `aparencia.tsx` cerca de 5 000 · `aparencia.test.tsx` 14 388 · `aparencia.test.tsx` da raiz cerca de 6 000 · `aparencia.spec.ts` cerca de 6 000 · `ui/tabs.tsx` 2 000 · `EdicaoDoFluxo.tsx` (só o guarda) 14 107 · `Cadastros.tsx` (modelo das abas) 16 715. Soma de leitura e escrita: 82 KB, cerca de 21k tokens, mais o arquivo novo de testes (cerca de 20 KB, 5k).

- S1 = 12k, S2 = 7k (entra em `aparencia.tsx` e `PreviaAparencia.tsx`), S3 = 5k: total 24k, abaixo do orçamento de 150k - one builder
- Mechanism: one builder (cabe no orçamento, sem pergunta)
