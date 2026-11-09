# Editor de fluxo dentro da casca, sem tela cheia

## Problem

Quem edita um fluxo de atendimento sente que saiu do sistema. Ao clicar no nome de um fluxo em Cadastros, o editor abre num diálogo `fixed inset-0` (`EdicaoDoFluxo.tsx`, `JanelaCheia`) que cobre a barra lateral e o cabeçalho. Some o menu, some o "Cadastros" onde o gestor estava, o endereço da página não muda e o botão Voltar do navegador não volta para a lista. O único caminho de volta é o botão "Cancelar" da barra do diálogo, que descarta o que foi editado sem avisar. Relato do dono do projeto em 08/11: "ele abre em tela cheia e parece que eu vou pra outra tela". Print: `.playwright-mcp/cad-depois-canvas2.png` (1440 px).

Dentro desse diálogo o desenho também não aproveita o espaço: o canvas para a ~700 px de altura e deixa ~120 px vazios embaixo, e o simulador ocupa uma coluna estreita ao lado, sem cabeçalho próprio.

Quem paga: o gestor (administrador) que monta e publica fluxos, e o grupo na banca de 20/11, porque o editor é a tela de maior apelo visual do produto. Não há medida de uso, porque não há produção.

Depois disto, o editor é uma página da casca: a barra lateral e o cabeçalho continuam à vista, o endereço tem o fluxo (`/univag/cadastros/fluxos/3`), a trilha "Cadastros › Fluxos › Boletos · ADS, 3º semestre" leva de volta à lista, e o desenho ocupa o espaço que sobra, como a tela de workflow do n8n dentro do seu menu.

## Flow

Reusa `EdicaoDoFluxo` (corpo, barra, `Canvas`, `ListaDeEtapas`, `Simulador`, `useGravacao`) e `useLeituras` de `Cadastros.tsx`; só o invólucro muda de diálogo para página.

1. `Cadastros` (exists) - clicar no nome de um fluxo passa a navegar para `/:slug/cadastros/fluxos/{id}` em vez de abrir o diálogo
2. `App.tsx` (exists) - nova `Route path="cadastros/fluxos/:id"` dentro de `Autenticado`, ao lado de `cadastros`
3. `PaginaDoFluxo` (new, no door - placement per conventions) - lê as listas de cadastros pela mesma `useLeituras`, acha o fluxo pelo `id`, mostra a trilha e entrega a `EdicaoDoFluxo`
4. `EdicaoDoFluxo` (exists) - deixa de usar `Dialog`/`JanelaCheia` e `Editor` modal; desenha a barra do editor e o corpo na própria página, e avisa antes de sair com alterações não salvas
5. `Canvas` (exists) - passa a ter a altura da janela menos o cabeçalho e a barra do editor, em vez de `clamp(24rem, 100dvh - 12rem, 60rem)`
6. out: Publicar ou Descartar voltam a `/:slug/cadastros` com a aba Fluxos aberta; `Autenticado` (exists) mantém "Cadastros" ativo no menu

## Impact

| Front | What changes |
| --- | --- |
| domain | novo termo de interface: a "trilha" (breadcrumb) do editor; "Cancelar" deixa de existir no editor e vira o link "Fluxos" da trilha mais o botão "Voltar" |
| `cadastros-fluxo-visual` AC 7 / K7 | dizia "o editor deve ocupar a tela inteira (diálogo `fixed inset-0`)". Esta feature substitui isso; um AD novo registra a troca, com a decisão do dono do projeto |
| testes que codificam o diálogo | `fluxos.test.tsx` (K7: classe `inset-0`, `role=dialog` "Editar: Fluxos", botão "Cancelar"), `canvas.test.tsx`, `cadastros.test.tsx` e os e2e `fluxos.spec.ts`, `fluxos-real.spec.ts` abrem o editor por clique e procuram o diálogo. São asserções de features fechadas e precisam de emenda aprovada por você; as asserções de regra (cadeia, 5 etapas, simulação, publicação) não mudam |
| rota | `/:slug/cadastros/fluxos/:id` passa a existir; quem fixou `/cadastros` continua na lista |
| stored data | nothing to migrate - só web, sem API, sem migration |

## Relations

None - no stored-data shape change.

## Surface

Rota de tela que esta feature adiciona. Nenhuma rota de API nova nem alterada: `GET /api/admin/fluxos`, `PUT/DELETE ./fluxos/{id}/rascunho`, `POST ./publicar` e `POST ./simular` ficam iguais.

| Route | In | Out | Status |
| --- | --- | --- | --- |
| tela `/:slug/cadastros/fluxos/:id` | `id` do fluxo na URL; papel ADMINISTRADOR | editor do fluxo com trilha, barra, desenho e painel lateral | `200` editor (fluxo existe), `404` "Fluxo não encontrado." na tela (id fora da lista), `403` tela de acesso negado da casca (quem não é administrador) |

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| endereço do editor | `/:slug/cadastros/fluxos/:id` (`id` numérico do fluxo) | `/:slug/fluxos/:id`: "Fluxos" é uma aba de Cadastros, e o menu ativo e o título do cabeçalho vêm do primeiro segmento (`cadastros`), então ficaria sem menu ativo; `/:slug/cadastros?fluxo=3`: não tem tela própria, o botão Voltar e o título do cabeçalho não distinguem lista de editor |

- Nada além disso é difícil de desfazer: sem schema, sem contrato de API, sem dependência nova (o `Canvas` e o `@xyflow/react` ficam como estão)

## Criteria

### S1: O editor é uma página da casca (P1)

O gestor edita o fluxo sem perder o menu, e o endereço e o botão Voltar funcionam.

**Acceptance Criteria**

1. WHEN o gestor clica no nome de um fluxo em Cadastros THEN the system SHALL navegar para `/univag/cadastros/fluxos/{id}` e mostrar o editor com a barra lateral e o cabeçalho da casca visíveis, sem nenhum elemento `role="dialog"` aberto
2. The system SHALL mostrar acima do editor a trilha `Cadastros › Fluxos › {categoria} · {abrangência}`, em que "Cadastros" leva a `/univag/cadastros` e "Fluxos" leva à mesma tela com a aba Fluxos selecionada
3. WHEN o gestor abre `/univag/cadastros/fluxos/{id}` direto (recarregando a página ou colando o endereço) THEN the system SHALL mostrar o editor do mesmo fluxo, com a mesma cadeia
4. IF o `id` da URL não é de nenhum fluxo da instituição THEN the system SHALL mostrar "Fluxo não encontrado." e o link "Voltar aos fluxos", sem o editor
5. WHEN o gestor aciona o botão Voltar do navegador no editor THEN the system SHALL mostrar a lista de Cadastros com a aba Fluxos selecionada
6. WHILE o editor está aberto the system SHALL manter "Cadastros" como item ativo do menu lateral e o título "Cadastros" no cabeçalho
7. WHEN Publicar ou Descartar rascunho conclui com sucesso THEN the system SHALL voltar a `/univag/cadastros` com a aba Fluxos selecionada e mostrar o aviso `Fluxo publicado.` ou `Rascunho descartado.`
8. WHEN Salvar rascunho conclui com sucesso THEN the system SHALL continuar no editor e mostrar `Rascunho salvo.` e o estado `Rascunho salvo`
9. WHILE há alterações não salvas, WHEN o gestor aciona a trilha ("Cadastros" ou "Fluxos") ou "Voltar" THEN the system SHALL abrir o diálogo "Sair sem salvar?" com os botões "Continuar editando" e "Sair sem salvar", e só "Sair sem salvar" deixa o editor
10. WHILE não há alterações não salvas the system SHALL deixar o editor pela trilha ou por "Voltar" sem nenhum diálogo
11. WHILE há alterações não salvas, WHEN o gestor fecha ou recarrega a aba THEN the system SHALL pedir a confirmação nativa do navegador (`beforeunload`)

**Independent test:** logado como administrador, abrir Cadastros › Fluxos, clicar num fluxo e ver o menu lateral, o endereço e a trilha; apertar Voltar do navegador.

### S2: O desenho ocupa o espaço da página (P1)

O canvas e o painel lateral usam a altura e a largura que a casca deixa.

**Acceptance Criteria**

12. WHILE a janela tem 1024 px ou mais e a visão é Canvas, the system SHALL fazer o canvas ocupar toda a largura do conteúdo menos um painel lateral de 320 px, com a base do canvas a no máximo 16 px do fim da janela e sem rolagem da página
13. WHILE a visão é Canvas the system SHALL mostrar no painel lateral "Simular um aluno" quando nenhuma etapa está selecionada e "Etapa selecionada" quando há uma, ambos sem rolar a página
14. The system SHALL mostrar a barra do editor numa linha só, abaixo da trilha, com o estado do fluxo (`Publicado v{n}`, `Rascunho salvo` ou `Alterações não salvas`), as visões Lista e Canvas, Simular, Salvar rascunho, Publicar e o menu Mais com Descartar rascunho
15. WHILE a visão é Lista the system SHALL mostrar as etapas e o simulador abaixo delas, na coluna do conteúdo, com a largura de leitura da casca (`max-w-3xl`)

**Independent test:** a 1440×900, abrir um fluxo no Canvas e medir o canvas, o painel e o fim da janela.

### S3: No celular o editor é uma página também (P2)

**Acceptance Criteria**

16. WHILE a janela tem menos de 768 px the system SHALL mostrar o editor na página (sem o diálogo `Editor`), na visão Lista, com a frase "O canvas está disponível em telas maiores.", o simulador abaixo e cada botão da barra com 44 px de altura ou mais
17. WHILE a janela tem menos de 768 px the system SHALL deixar a barra do editor quebrar em duas linhas sem rolagem horizontal da página

**Independent test:** a 390 px, abrir um fluxo e ver a página com a trilha, a lista de etapas e os botões.

## Out of scope

| Excluded | Why |
| --- | --- |
| Salvar o rascunho sozinho a cada 2 s, como o autosave do n8n 2.4 | muda quando o rascunho existe e quando "Publicar" liga; é decisão de produto separada, e o rascunho já é separado da versão vigente |
| Bloquear a saída pelos links da barra lateral quando há alterações | o roteador é o `BrowserRouter`, e `useBlocker` só existe em roteador de dados; trocar o roteador mexe em todos os testes. O aviso cobre a trilha, "Voltar" e fechar a aba |
| Histórico de versões e bloqueio de edição por duas pessoas (n8n) | capacidade nova, sem pedido |
| Editar a etapa num modal ao dar duplo clique (n8n "node details") | o painel lateral já é o "focus panel" do n8n e basta |
| Regras do fluxo, limite de 5 etapas, destinos, simulação | não mudam (AD-041, AD-042) |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Rota própria ou estado na mesma tela | rota própria `/cadastros/fluxos/:id` | endereço compartilhável, Voltar do navegador e recarregar funcionam; o n8n dá uma URL por workflow | n |
| Onde fica "Descartar rascunho" | continua no menu Mais da barra | já aprovado em `cadastros-fluxo-visual` AC 7 e é a ação que apaga | n |
| O botão "Cancelar" da barra | sai; entra "Voltar" (volta à lista, com o aviso de AC 9) | "Cancelar" parecia desfazer a edição e não avisava | n |
| Largura do painel lateral | 320 px, igual à coluna de ações do chamado | uma só medida de painel lateral no produto | n |
| Mobile | mesma página, só Lista | o `Editor` modal estreito era outro "ir para outra tela" | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen editor de fluxo | empty state (fluxo sem etapas) | existing - a lista e o canvas já mostram "Arraste um destino para começar." |
| screen editor de fluxo | loading state | existing - `Carregando` enquanto as listas chegam |
| screen editor de fluxo | error state | AC 4 (id inexistente) e existing `ErroDe` (leitura que falha, gravação que falha) |
| screen editor de fluxo | unauthorised | existing - a casca barra quem não é administrador (`Autenticado`) |
| screen editor de fluxo | density and ordering | AC 12, AC 14, AC 15 |
| screen editor de fluxo | destructive action confirms | AC 9 (sair sem salvar) e existing - Descartar rascunho e remover etapa com setor ou prazo |
| screen editor de fluxo | focus and keyboard | existing - a trilha e os botões são links e botões nativos; "Voltar" e a trilha são alcançáveis por Tab |
| route `/:slug/cadastros/fluxos/:id` | error shape and codes | AC 4 |
| route `/:slug/cadastros/fluxos/:id` | versioning, rate limits | n/a - rota de tela, sem API nova |

## Sources

- `.playwright-mcp/cad-depois-canvas2.png` e o relato do dono do projeto em 08/11 - o problema
- n8n, "Help us test some canvas improvements" (community.n8n.io/t/help-us-test-some-canvas-improvements/201703): o "focus panel" mostra os parâmetros do nó à direita do canvas, para o diagrama continuar à vista; o modal de tela cheia continua só como alternativa
- n8n, "Announcing Autosave & More!" (blog.n8n.io/announcing-autosave): salvar o rascunho é separado de publicar; o botão de publicar mostra se a versão em edição divergiu da publicada
- `.specs/features/cadastros-fluxo-visual/plan.md` AC 7 (tela cheia, a ser substituído) e `.specs/STATE.md` AD-041, AD-042
