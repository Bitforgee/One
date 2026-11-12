# Integrações em submenu lateral - checks

Profile: ui
Plan: none (Intent abaixo; mudança só no `web/`, sem porta de mão única)

## Intent

Hoje a página Integrações (`integracoes-admin`, `mcp-one`) escolhe a integração por duas abas horizontais no topo, `Moodle` e `MCP`. Cadastros (AD-046) já resolveu o mesmo problema de outro jeito: uma coluna de itens à esquerda do conteúdo, e um seletor no lugar da coluna quando falta largura. O administrador pediu o mesmo desenho aqui. Depois desta mudança, `/{slug}/integracoes` mostra, a partir de 896 px de largura útil, a coluna lateral com `Moodle` e `MCP` (a mesma de Cadastros: 224 px, item ativo com fundo de destaque) e o conteúdo da integração escolhida ao lado; abaixo disso, a coluna vira um seletor `Integração`, como em Cadastros. Cada painel ganha o título da integração (`h2`) com a frase de apresentação logo abaixo, no mesmo lugar do cabeçalho de Cadastros. A próxima integração é mais um item da coluna.

Não muda: a API, o conteúdo dos painéis Moodle e MCP (formulário, tokens, comandos de conexão), a visibilidade do item `Integrações` no menu (só `ADMINISTRADOR`) e o endereço (`?aba=moodle`, `?aba=mcp`).

Fica de fora: contagem ou estado ao lado do nome do item (Cadastros mostra a contagem de registros; aqui não há registros para contar); extrair a coluna de Cadastros para um componente compartilhado (este é o segundo uso, a regra do `AGENTS.md` pede o terceiro); `replace` no histórico ao trocar de item (Cadastros usa; aqui a troca continua empilhando no histórico, como hoje).

6 checks em 1 slice · 0 portas de mão única · 0 perguntas abertas.

## Checks

### S1 - Integrações com coluna lateral (P1) · web · 3 arquivos · ~13 KB · ~4k

**C1** - Com a janela a 1440 px, a página mostra o `h1` `Integrações` e uma `tablist` com `aria-orientation="vertical"` e exatamente 2 abas, `Moodle` (selecionada) e `MCP`, nesta ordem; a coluna mede 224 px de largura e fica à esquerda do painel (o `x` das abas é menor que o `x` do painel); não existe a lista horizontal de abas de antes (nenhuma aba acima do painel)
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "coluna lateral"`
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "coluna a 1440"`

**C2** - O painel da integração escolhida começa com um `h2` com o nome dela (`Moodle` ou `MCP`) e, logo abaixo, a frase de apresentação que hoje abre a aba (`Alunos que entram pela atividade One no Moodle...` e `Conecte a IA que você já usa...`), sem repetir a frase em outro lugar da página
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "cabeçalho do painel"`

**C3** - O endereço escolhe o item: sem `?aba=` ou com `?aba=moodle` abre `Moodle`; `?aba=mcp` abre `MCP`; `?aba=qualquer-coisa` cai em `Moodle`; clicar em `MCP` na coluna troca o endereço para `?aba=mcp` e a seta para baixo, com o foco na aba `Moodle`, move a seleção para `MCP`
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "item pelo endereço e pelo teclado"`

**C4** - Os painéis seguem como eram: `Moodle` com esqueleto durante o `GET /api/admin/moodle`, erro com `Tentar de novo`, formulário vazio com 3 URLs e 3 botões `Copiar` quando `configurada=false`, e salvar envia `PUT /api/admin/moodle` com os 6 campos e mostra `Moodle salvo.`; `MCP` mostra a URL do servidor, a tabela de tokens, o formulário `Novo token` e os comandos de conexão do Claude Code e do Cursor
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "estados da aba Moodle"`
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "salva e mostra o erro do campo"`
Proof: `npm --prefix web test -- --run src/administracao/mcp.test.tsx`

**C5** - Abaixo de 896 px de largura útil não existe a coluna: aparece um seletor com o rótulo `Integração` e as opções `Moodle` e `MCP`; escolher `MCP` mostra o painel MCP e muda o endereço para `?aba=mcp`. Provado em celular em pé (360×780), celular deitado (844×390) e com o teclado aberto (360×400, campo `Nome` do `Novo token` focado: o campo fica dentro da janela e o botão `Criar token` alcança-se rolando), sem rolagem horizontal em nenhuma das três; no toque (`pointer: coarse`) o seletor mede 44 px de altura ou mais
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "seletor sem coluna"`
Proof: `npm --prefix web run e2e -- e2e/integracoes.spec.ts -g "celular"`

**C6** - A suíte web e o build passam; as únicas asserções existentes editadas são as do teste `abas`, que dizia `2 abas horizontais, MCP com o selo Em breve` e passa a ser `coluna lateral` (C1) e `item pelo endereço e pelo teclado` (C3), e o teste `item no menu` (visível só para `ADMINISTRADOR`, 4 papéis) segue idêntico
Proof: `npm --prefix web test -- --run`
Proof: `npm --prefix web run build`

**C7** - O `dryer` do `web/` não aponta candidato a 0.8 (AD-018); se o Smart App Control seguir bloqueando, fica "não rodado", sem PASS (AD-044)
Proof: `cd web && dryer`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| valores de `?aba=` (4) | ausente C3 · `moodle` C3 · `mcp` C3 · desconhecido C3 | - |
| larguras da página (4) | 1440 px C1 · 360×780 C5 · 844×390 C5 · 360×400 com teclado C5 | - |
| estados do painel Moodle (4) | carregando C4 · erro C4 · vazio C4 · erro de campo C4 | - |
| papéis que veem o item no menu (4) | ADMINISTRADOR C6 · ATENDENTE C6 · ALUNO C6 · OPERADOR C6 | - |
| itens da coluna (2) | `Moodle` C1 · `MCP` C1 | - |
| partes do painel MCP (4) | URL do servidor C4 · tabela de tokens C4 · `Novo token` C4 · comandos de conexão C4 | - |

- Claims naming a size, position or width: C1 e C5 - cada uma tem prova no navegador (Playwright), porque o jsdom não mede layout nem container query
- Nenhum outro check afirma mais do que o caso que a prova exercita

## Test policy

Nenhuma linha nova: a tela é só de apresentação e segue o padrão já provado por `cadastros.test.tsx` (teste de tela com `api()` simulada) e por `casca-celular.spec.ts` (medidas no navegador). A decisão da tela (qual painel abre) é o `?aba=` com 4 valores, todos em C3.

## Swept

- validation: existing - `?aba=` desconhecido cai em `Moodle` (C3); a validação dos campos fica na API (`AlterarMoodle`, provada em `integracao-moodle`)
- failure modes: C4 (erro do `GET` com `Tentar de novo`)
- idempotency: n/a - só navegação entre painéis; o `PUT` do Moodle é o mesmo de antes
- authorization: existing - o item só aparece para `ADMINISTRADOR` e a API segue exigindo o papel (C6, `integracao-moodle`, `mcp-one`)
- concurrency: n/a - nenhuma gravação nova
- data lifecycle: n/a - nenhum dado novo
- dependency failure: C4
- state transitions: C3 (item escolhido pelo endereço, pelo clique e pelo teclado), C5 (pelo seletor)
- observability: n/a - nenhuma mudança na API

## Out of scope

- contagem ou estado ao lado do nome do item - não há registros para contar, e um selo de estado exigiria nova leitura da API
- componente compartilhado entre Cadastros e Integrações - segundo uso (`AGENTS.md`: compartilhar só no terceiro)
- `replace` no histórico ao trocar de item - mudaria o comportamento do botão Voltar fora do pedido

## Handoff

- Arquivos: `administracao/Integracoes.tsx` 1,9 KB · `administracao/integracoes.test.tsx` 6,6 KB · novo `e2e/integracoes.spec.ts` ~3 KB · `AbaIntegracao.tsx` 0,9 KB lido = ~13 KB ≈ 4k, abaixo dos 150k - um construtor
- Mecanismo: one builder (cabe no orçamento)
