# Área Integrações do administrador - checks

Profile: standard
Plan: none (Intent abaixo; mudança só no `web/`, sem porta de mão única)

## Intent

Hoje o administrador configura o Moodle numa página própria, o item "Moodle" do grupo Administração (`integracao-moodle`, AD-048). A próxima integração, o MCP do One, criaria outro item no menu, e cada integração nova faria o mesmo. Depois desta mudança há um item só, "Integrações", em `/{slug}/integracoes`, e cada integração é uma aba da página, com a aba escolhida no endereço (`?aba=moodle`), no mesmo padrão de Cadastros (AD-046). O MCP do One já aparece como uma segunda aba, marcada `Em breve`, só com o aviso de que chega numa próxima versão; a configuração dele entra na feature do MCP. A API não muda: a aba Moodle continua lendo e gravando `GET`/`PUT /api/admin/moodle`, e o conteúdo da aba é o da tela Moodle de hoje.

Fica de fora: qualquer configuração do MCP (só o aviso `Em breve`); manter o endereço antigo `/{slug}/moodle` (não está publicado em produção; abrir esse endereço cai na regra que já existe para rota desconhecida).

## Checks

### S1 - Integrações com abas (P1) · web · ~6 arquivos · ~25k

**C1** - Para `ADMINISTRADOR`, o grupo `Administração` da barra traz, nesta ordem, `Usuários`, `Matrículas`, `Cadastros`, `Aparência`, `Integrações`, sem o item `Moodle`; o link `Integrações` aponta para `/univag/integracoes` e tem o ícone `lucide-plug`
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "item no menu"`

**C2** - Para `ATENDENTE`, `ALUNO` e `OPERADOR` o item `Integrações` não aparece, e abrir `/univag/integracoes` como `ATENDENTE` leva à tela inicial dele (`Fila`) sem chamar `/api/admin/moodle`
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "item no menu"`

**C3** - `/univag/integracoes` mostra o título `Integrações` como único `h1` e uma lista de abas com exatamente 2 abas, nesta ordem, `Moodle` (selecionada) e `MCP` com o selo `Em breve`; `/univag/integracoes?aba=moodle` mostra o mesmo, e `?aba=qualquer-coisa` cai na aba `Moodle`; clicar na aba `MCP` muda o endereço para `?aba=mcp`
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "abas"`

**C8** - `/univag/integracoes?aba=mcp` deixa a aba `MCP` selecionada e mostra `A integração com o MCP do One chega em uma próxima versão.`, sem campo de formulário, sem botão `Salvar` e sem chamar `/api/admin/moodle`
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "aba MCP em breve"`

**C4** - A aba `Moodle` mantém o comportamento da tela anterior: esqueleto durante o `GET /api/admin/moodle`, erro com `Tentar de novo`, formulário vazio com as 3 URLs e 3 botões `Copiar` quando `configurada=false`
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "estados da aba Moodle"`

**C5** - Salvar na aba `Moodle` envia `PUT /api/admin/moodle` com os 6 campos, mostra `Moodle salvo.`, e um `400` com `errors.authUrl` mostra a mensagem no campo
Proof: `npm --prefix web test -- --run src/administracao/integracoes.test.tsx -t "salva e mostra o erro do campo"`

**C6** - A suíte web e o build passam; as únicas edições em asserções existentes trocam `Moodle`/`moodle` por `Integrações`/`integracoes` nas listas de menu, rotas e títulos
Proof: `npm --prefix web test -- --run`
Proof: `npm --prefix web run build`

**C7** - O `dryer` do `web/` não aponta candidato a 0.8 (AD-018); se o Smart App Control seguir bloqueando, fica "não rodado", sem PASS (como o C38 de `integracao-moodle`)
Proof: `cd web && dryer`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| papéis que veem o item (4) | ADMINISTRADOR C1 · ATENDENTE C2 · ALUNO C2 · OPERADOR C2 | - |
| valores de `?aba=` (4) | ausente C3 · `moodle` C3 · `mcp` C8 · desconhecido C3 | - |
| estados da aba Moodle (4) | carregando C4 · erro C4 · vazio C4 · erro de campo C5 | - |

## Test policy

Nenhuma linha nova: a tela segue o padrão já provado por `cadastros.test.tsx` e `moodle.test.tsx` (teste de tela com `api()` simulada).

## Swept

- validation: existing - a validação dos campos fica na API (`AlterarMoodle`, provada em `integracao-moodle`); a tela só mostra o erro (C5)
- failure modes: C4 (erro com `Tentar de novo`)
- idempotency: n/a - só navegação e o mesmo `PUT` de antes
- authorization: C2, e existing - o `GET`/`PUT` seguem exigindo `ADMINISTRADOR` na API (provado em `integracao-moodle`)
- concurrency: n/a - nenhuma gravação nova
- data lifecycle: n/a - nenhum dado novo
- dependency failure: C4
- state transitions: C3, C8 (aba escolhida pelo endereço e pelo clique)
- observability: n/a - nenhuma mudança na API

## Handoff

- Arquivos: `Autenticado.tsx` 16,6 KB · `App.tsx` 3,3 KB · `administracao/Moodle.tsx` ~6 KB · nova `administracao/Integracoes.tsx` ~2 KB · `moodle.test.tsx` → `integracoes.test.tsx` ~5 KB · listas em `acesso.test.tsx` 28,6 KB, `textos.test.tsx` ~6 KB e `aparencia.test.tsx` 13,9 KB = ~82 KB ≈ 21k, abaixo dos 150k - um construtor
- Mecanismo: one builder (cabe no orçamento)
