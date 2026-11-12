# Integrações guiadas - checks

Profile: ui
Plan: `.specs/features/integracoes-guiadas/plan.md`

24 checks em 3 slices · 0 portas de mão única · 1 pergunta aberta (`open`, não bloqueia)

## Checks

### S1 - O estado de cada integração à vista · web · 3 arquivos · ~14 KB · ~4k

**C1** - Ao abrir `/univag/integracoes`, a coluna mostra sob `Moodle` uma linha de estado `Não configurado` (`configurada=false`), `Ativo` (`configurada=true`, `ativa=true`) ou `Desativado` (`configurada=true`, `ativa=false`), e sob `MCP` `Sem tokens ativos` (0 tokens `ATIVO`), `1 token ativo` ou `2 tokens ativos` (tokens `EXPIRADO` e `REVOGADO` não contam); o nome acessível de cada aba continua `Moodle` e `MCP`, e o estado é a descrição da aba (`aria-describedby`) (AC 1)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "estado de cada integração"`
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "estado dentro de cada item da coluna"`

**C2** - Com a leitura do Moodle pendente, o item `Moodle` não mostra linha de estado; com `GET /api/admin/mcp` respondendo `500`, o item `MCP` mostra `Indisponível`, o item `Moodle` mostra o estado dele e o painel aberto segue usável (AC 2)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "estado carregando e indisponível"`
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "Moodle indisponível"`

**C3** - O seletor `Integração` traz as opções `Moodle · Ativo` e `MCP · 1 token ativo` quando as leituras respondem, e `Moodle` e `MCP` sem sufixo enquanto carregam (AC 3)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "estado no seletor"`
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "seletor em pé"`

**C4** - O cabeçalho de cada painel traz uma etiqueta com o mesmo texto de estado ao lado do `h2`, e ela muda junto com a linha da coluna (AC 4)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "estado no cabeçalho do painel"`

**C5** - Salvar o Moodle com a entrada ligada muda `Não configurado` para `Ativo`; criar um token muda `Sem tokens ativos` para `1 token ativo` e revogá-lo volta para `Sem tokens ativos`; em nenhum caso a página recarrega (AC 5)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "estado atualiza sem recarregar"`

### S2 - Moodle campo a campo · web · 2 arquivos · ~12 KB · ~3k

**C6** - Cada endereço do One mostra o campo do Moodle: `URL de login` com `Initiate login URL`, `URL de redirecionamento` com `Redirection URI(s)` e `URL das chaves públicas` com `Public keyset`, e cada botão `Copiar` continua copiando o endereço dele (AC 6)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "campo do Moodle ao lado de cada endereço"`

**C7** - Nenhum dos 5 campos do formulário do Moodle tem `placeholder`, e cada um tem a dica visível no DOM fora do campo e ligada por `aria-describedby` (AC 7)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "sem placeholder e com dica visível"`

**C8** - Salvar o Moodle com `Permitir a entrada pelo Moodle` marcado mostra, com `role="status"`, `Moodle salvo e ativo.` e `Para testar, abra a atividade One no Moodle com uma conta de aluno.` (AC 8)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "aviso fixo com a entrada ligada"`
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "aviso do Moodle abaixo do botão"`

**C9** - Salvar o Moodle com a entrada desmarcada mostra `Moodle salvo, mas a entrada pelo Moodle está desligada.` e não mostra `Para testar` (AC 9)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "aviso fixo com a entrada desligada"`

**C10** - Depois de salvar, digitar em qualquer campo ou mudar a marca retira o aviso fixo (AC 10)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "aviso some ao editar"`

**C11** - Um `400` com `errors.authUrl` ao salvar mostra a mensagem junto do campo `URL de autenticação`, mantém os 5 valores digitados e não mostra aviso fixo (AC 11)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "salvar com erro mantém o digitado"`

### S3 - Token do MCP com revelação única · web · 3 arquivos · ~20 KB · ~5k

**C12** - O cabeçalho do painel MCP tem o botão `Novo token`, e a página não tem mais o campo `Nome` nem o botão `Criar token` fora de um diálogo (AC 12)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "botão Novo token e sem formulário fixo"`
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "Novo token no cabeçalho"`

**C13** - `Novo token` abre o diálogo `Novo token` com `Nome` (dica `Ex.: Cursor no meu notebook` como texto fora do campo, sem `placeholder`), `Validade` com `30 dias`, `90 dias`, `365 dias` e `90 dias` selecionado, e os botões `Criar token` e `Cancelar`; `Cancelar` fecha sem chamar a API (AC 13)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "diálogo Novo token"`
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "validade escolhida segue no corpo"`

**C14** - Criar o token (`POST /api/admin/mcp/tokens` com `{ nome, dias: 90 }`) troca o diálogo para `Copie o token agora`, com `Copie agora: o token não será mostrado de novo.`, o token inteiro, o comando do Claude Code e o `mcp.json` do Cursor com o token real e o botão `Já copiei`, sem `Cancelar` nem o botão `Criar token`; `Já copiei` fecha o diálogo e o token sai do DOM (AC 14)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "revelação única"`
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "reabrir depois da revelação ou do erro começa limpo"`
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "criar token desabilita o botão enquanto envia"`

**C15** - Clicar em `Copiar` na revelação grava o valor na área de transferência e troca o texto do botão para `Copiado` (nome acessível `Token copiado`); passados 2 segundos volta a `Copiar` (AC 15)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "botão Copiado"`

**C16** - Com a revelação aberta, clicar fora, apertar Esc e não ter botão `Fechar` do canto deixam o diálogo aberto; `Já copiei` fecha (AC 16)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "revelação não fecha fora nem com Esc"`
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "revelação no computador ignora clique fora e Esc"`
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "revelação no celular ignora Esc e não tem botão de fechar"`

**C17** - Um `400` (`errors.nome`) e um `409` na criação mostram o erro dentro do diálogo, mantêm `Nome` digitado e não mostram a revelação (AC 17)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "erros da criação"`

**C18** - Sem tokens, o painel mostra `Nenhum token ainda.` com o botão `Criar token`, que abre o diálogo `Novo token` (AC 18)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "estado vazio"`

**C19** - A revogação segue como era: `Revogar` só em token `ATIVO`, diálogo de confirmação destrutivo, `DELETE /api/admin/mcp/tokens/1` e `Token revogado.` (AC 19)
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "revoga com confirmação"`

### S4 - Celular · web · 1 arquivo · ~6 KB · ~2k

**C20** - A 360×780 com toque, o seletor mostra `Moodle · Não configurado`; `Novo token` abre o diálogo ocupando a altura da janela (780 px), sem rolagem horizontal, e criar o token mostra a revelação inteira (AC 3, 13, 14)
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "diálogo em pé"`

**C21** - A 844×390 com toque, a revelação abre e o botão `Já copiei` fica dentro da janela depois de rolar o diálogo, sem rolagem horizontal da página (AC 14)
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "diálogo deitado"`
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "revelação rola no celular baixo"`

**C22** - A 360×400 (teclado aberto), com `Novo token` aberto e `Nome` focado, o campo fica dentro da janela e `Criar token` alcança-se rolando o diálogo (AC 13)
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "teclado aberto 360×400"`

**C23** - No toque, `Novo token`, o seletor `Integração`, `Copiar` e `Já copiei` medem 44 px de altura ou mais (AC 3, 12, 14)
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "alvos de toque"`

### Fechamento

**C24** - A suíte web e o build passam; as únicas asserções existentes editadas são: em `mcp.test.tsx`, os testes `cria o token e mostra uma vez`, `fecha o painel e esconde o token`, `estado vazio` e `erros da criação` (o formulário fixo virou diálogo); em `integracoes.test.tsx`, `seletor sem coluna` (opções com estado); em `e2e/integracoes.spec.ts`, `teclado aberto 360×400`, `seletor em pé` e `seletor deitado` (o campo `Nome` agora vive no diálogo e o seletor traz o estado); os testes de Moodle, de menu e de revogação ficam idênticos
Proof: `npm --prefix web test -- --run`
Proof: `npm --prefix web run build`

**C25** - O `dryer` do `web/` não aponta candidato a 0.8 fora de `src/ui` (AD-018)
Proof: `cd web && dryer`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| estados do Moodle (3) | `Não configurado` C1 · `Ativo` C1 · `Desativado` C1 | - |
| estados do MCP (3) | `Sem tokens ativos` C1 · `1 token ativo` C1 · `2 tokens ativos` C1 | - |
| estados de leitura (3) | carregando C2 · erro `Indisponível` C2 · ok C1 | - |
| lugares do estado (3) | coluna C1 · seletor C3 · cabeçalho do painel C4 | - |
| endereços do One com o campo do Moodle (3) | login C6 · redirecionamento C6 · chaves públicas C6 | - |
| campos do formulário do Moodle (5) | `Emissor (iss)` C7 · `Client ID` C7 · `Deployment ID` C7 · `URL de autenticação` C7 · `URL das chaves (JWKS)` C7 | - |
| avisos após salvar o Moodle (3) | ligado C8 · desligado C9 · retirado ao editar C10 | - |
| formas de fechar a revelação (3) | clique fora C16 · Esc C16 · `Já copiei` C14 | - |
| valores copiáveis da revelação (3) | token C15 · comando do Claude Code C14 · `mcp.json` do Cursor C14 | - |
| validades do token (3) | 30 dias C13 · 90 dias C13 · 365 dias C13 | - |
| erros da criação (2) | `400` C17 · `409` C17 | - |
| estados do painel MCP com dados (2) | com tokens C19 · vazio C18 | - |
| larguras e entradas do celular (4) | 360×780 C20 · 844×390 C21 · 360×400 com teclado C22 · toque C23 | - |
| alvos de toque (4) | `Novo token` C23 · seletor C23 · `Copiar` C23 · `Já copiei` C23 | - |

- Os estados `carregando` e `erro` do painel MCP seguem provados pelo teste existente `carregando e erro` de `mcp.test.tsx`, que não é editado (C24)
- Claims naming a size, position or width: C20, C21, C22, C23 - cada uma tem prova no navegador, porque o jsdom não mede layout
- Nenhum outro check afirma mais do que o caso que a prova exercita

## Test policy

Nenhuma linha nova: a decisão da tela é uma função pura de dados que a API já devolve (3 estados do Moodle, 3 do MCP, 2 de leitura), provada por teste de tela com `api()` simulada como em `cadastros.test.tsx` e `mcp.test.tsx`; as medidas ficam em `e2e/integracoes.spec.ts` como em `casca-celular.spec.ts`.

## Swept

- validation: existing - a API valida nome, validade e os campos do Moodle (provado em `mcp-one` e `integracao-moodle`); a tela só mostra o erro junto do campo (C11, C17)
- failure modes: C2 (leitura que falha), C11 e C17 (gravação que falha mantém o digitado)
- idempotency: n/a - nenhuma gravação nova; o `POST` de token é o de hoje
- authorization: existing - só `ADMINISTRADOR` vê o item e as rotas `/api/admin/*` (provado em `integracoes-admin`, `item no menu`)
- concurrency: C5 (o estado acompanha a gravação pelo cache compartilhado, sem corrida entre as duas leituras)
- data lifecycle: C14 (o token sai do DOM ao fechar) e C16 (o segredo único não se perde por clique fora)
- dependency failure: C2
- state transitions: C1, C5, C10, C14
- observability: n/a - nenhuma mudança na API nem log novo

## Out of scope

- botão `Testar conexão`, assistente em várias telas, escopos por token, OAuth para Claude.ai, barra de salvar fixa, rótulo flutuante e nova integração - ver `plan.md`

## Handoff

- Arquivos: `Integracoes.tsx` 3,6 KB · `AbaIntegracao.tsx` 1,1 KB · `Moodle.tsx` 6,2 KB · `Mcp.tsx` 9,1 KB · `Editor.tsx` 4,1 KB · `integracoes.test.tsx` 9,8 KB · `mcp.test.tsx` 8,6 KB · `e2e/integracoes.spec.ts` 5,0 KB = ~48 KB ≈ 12k, abaixo dos 150k - um construtor
- Mecanismo: one builder (cabe no orçamento)
- Decisão do plano que a construção precisa registrar: `Editor` ganha duas propriedades opcionais, `bloqueado` e `semCancelar`, para a revelação ser o mesmo diálogo (AC 14, 16)

- **Boundary:** C1-C24 fechados em `4f3d3e4`; C25 (`dryer`): sem candidato fora de `src/ui`; `crapper` não roda neste computador (AD-044)
- **Settled mid-build:** a linha de estado da coluna fica num `span` fora do `TabsTrigger` (ligado por `aria-describedby`), para o nome acessível da aba seguir `Moodle`/`MCP` e os testes de `coluna lateral` e `item pelo endereço e pelo teclado` ficarem idênticos; o botão de copiar ganhou o nome acessível `<rótulo> copiado` enquanto mostra `Copiado`; o toast `Copiado.` saiu (o botão confirma); no cabeçalho do painel o `p` da frase vem logo depois do `h2` no DOM (`order-last`), para o teste `cabeçalho do painel` seguir idêntico; as dicas e o texto `…` do token (reticências em `…wxyz`) vêm do código existente
- **Abandoned:** nada
- **Reforço depois da rodada 1 do Verificador (6 de 14 falhas sobreviveram):** 5 testes acrescentados e listados nas linhas `Proof` de C1, C8, C12, C14 e C16 (lição L-029), mais o aperto do teste `botão Copiado` (o botão segue `Copiado` por pelo menos 1,5 s) em C15; as 6 falhas foram reinjetadas e todas morreram
- **Reforço depois da rodada 2 do Verificador (3 de 20 falhas novas sobreviveram):** o teste e2e da revelação passa a exigir que `Cancelar` não exista (desktop e celular); `Moodle indisponível` prova o `Indisponível` do Moodle (C2); o teste do cabeçalho do painel lê a variante da etiqueta (C4); as 3 falhas foram reinjetadas e morreram
- **Reforço depois da rodada 3 do Verificador (7 de 39 falhas sobreviveram):** a revelação ganhou prova de rolagem em celular baixo (`revelação rola no celular baixo`, 360×300, listada em C21) e de `mcp.json` alcançável em 844×390; o clique na linha de estado da coluna seleciona a aba; `Novo token` fica na borda direita do painel; a etiqueta `Indisponível` é `secondary`; a frase `Se você não copiar, apague este token e crie outro.` passa a ter asserção em `revelação única` (C14), sem critério próprio: é o caminho de recuperação que a pesquisa P4 pede; as falhas foram reinjetadas e morreram
- **Reforço depois da rodada 4 do Verificador (3 de 33 falhas sobreviveram, as demais mortas, equivalentes ou fora do escopo):** `validade escolhida segue no corpo` (C13: 30 e 365 dias chegam ao `POST`), `criar token desabilita o botão enquanto envia` (C14: um clique, uma chamada) e o texto exato do aviso fixo do Moodle (C8 e C9); as 3 falhas foram reinjetadas pelo construtor e morreram. **A rodada 4 passou do limite de 3 rodadas do `verify.md` e o reforço depois dela não teve nova verificação independente**
