# cadastros-fluxo-visual — plano (aguardando "aprovado" de um humano)

Só `web/`. Sem mudança de API, schema ou migration. Perfil `ui`.

## Problema
Medido em 08/11 com o código atual (Vite dev, API simulada, 1440 px):
- **Cadastros**: 5 abas soltas no topo e uma tabela crua de 2 colunas. Sem busca, sem contagem, sem status visível
  (triagem, inativo, padrão, liderança aparecem como texto cinza), botão genérico "Novo", nada diz para que serve cada cadastro.
  A aba Fluxos mostra a cadeia como uma frase com setas.
- **Editor de fluxo**: abre numa janela modal de ~1000 px; o canvas é uma caixa pequena dentro dela; o simulador fica abaixo da
  dobra; a paleta é uma fileira de botões acima do desenho; só dá para inserir etapa no fim da cadeia; o nó "Início" se sobrepõe
  à 1ª etapa quando a etapa tem `x` salvo perto de 0 (visto na captura); não há "organizar".

## Referências pesquisadas
- n8n: nós como cartões com ícone, "+" no fim e **no meio de cada ligação**, barra de ações ao passar o mouse sobre o nó
  (executar, desativar, excluir), painel de detalhes do nó, atalho `1` para enquadrar, "organizar" (tidy up).
  Fontes: community.n8n.io (melhorias do canvas, barra de ação do nó, "+" no canvas).
- Listas de admin em SaaS (Stripe, Supabase, saasui.design): título + frase do que é, busca, status como badge, ação primária
  com nome do objeto ("Novo setor"), estado vazio com chamada para a ação, ações da linha à direita.
- Já aprovados no projeto e mantidos: AD-037 (estrutura do shell), AD-042 (canvas n8n, zoom máx. 100 %, painel lateral), alvos de toque 44 px.

## Critérios de aceite (EARS)
Cadastros
1. Quando a tela abre, o sistema deve mostrar uma navegação de cadastros em coluna (a 1ª aba continua "Setores") com a contagem de cada um; abaixo de 768 px continua o seletor nativo.
2. Cada cadastro deve ter um título e uma frase curta dizendo para que serve, um campo de busca que filtra a lista pelo nome, e o botão primário com o nome do objeto ("Novo setor", "Nova categoria", "Novo curso", "Novo fluxo", "Nova resposta pronta").
3. Setores, categorias e cursos devem mostrar o status como badge (Triagem, Liderança de …, Inativo, Padrão) e não como texto corrido.
4. Cada fluxo deve aparecer como linha com a categoria, a abrangência, a cadeia desenhada em mini-etapas com ícone (Setor → Coordenação → Liderança) e um badge: "Publicado v{n}", "Rascunho" ou "Sem versão".
5. Quando a busca não acha nada, o sistema deve dizer "Nenhum resultado para «x»" com o botão "Limpar busca"; quando a lista está vazia, a frase do que falta e o botão de criar.
6. Os papéis `tab`/`tabpanel` e o nome acessível de cada aba continuam; a linha continua abrindo o editor por um botão com o nome do registro.

Editor de fluxo
7. Quando o gestor abre um fluxo, o editor deve ocupar a tela inteira (diálogo `fixed inset-0`), com barra superior: voltar, categoria · abrangência, badge de estado, Lista/Canvas, Simular, Salvar rascunho, Publicar; "Descartar rascunho" vai para um menu "Mais".
8. No canvas, o sistema deve mostrar um "+" no meio de cada ligação (aparece no hover e no foco) que insere a etapa naquele ponto da cadeia; o "+" do fim continua.
9. Ao passar o mouse ou focar uma etapa, deve aparecer uma barra com "Remover" (mesma confirmação de hoje se a etapa tem setor ou prazo).
10. A paleta de destinos deixa de ser uma fileira acima do canvas: vira o botão flutuante "Adicionar etapa" no canto do canvas, abrindo o mesmo menu do "+"; arrastar para o canvas continua valendo na lista de destinos do menu.
11. O cartão da etapa deve mostrar o prazo como chip ("24 h") em vez de dentro do nome, e o nó de início chama-se "Chamado aberto".
12. O sistema deve ter o botão "Organizar" que realinha as etapas em linha horizontal, sem sobrepor o nó inicial, e o canvas deve fazer isso ao abrir um fluxo cujas posições salvas sobreponham o nó inicial.
13. O simulador deve abrir num painel lateral direito do editor (e continuar abaixo da lista na visão Lista), sem rolar a tela para achá-lo.
14. A etapa selecionada continua abrindo o painel lateral (AD-042); a cadeia, o limite de 5 etapas e as regras de `grafo.ts` não mudam.

## Flow
`Cadastros.tsx` ganha cabeçalho de cadastro (título, frase, busca, botão) e navegação em coluna; `ListaDaAba` troca a coluna
"Detalhe" por badges; nova linha de fluxo com mini-cadeia. `EdicaoDoFluxo.tsx` deixa de usar `Editor` modal estreito e passa a
um diálogo de tela cheia com barra superior; `Canvas.tsx` ganha aresta própria com "+" (`edgeTypes`), barra do nó (`NodeToolbar`),
botão "Organizar" e botão flutuante; `AdicionarEtapa.tsx` perde a `Paleta` em fileira.

## Impact
- Testes a ajustar (comportamento mantido, estrutura muda): `admin.test.tsx` C21 (colunas `Nome`/`Detalhe` das 5 abas passam a `Nome`/`Detalhe` só onde a coluna existir — **o check C21 muda, precisa de aprovação**), `cadastros.test.tsx`, `fluxos.test.tsx`, `canvas.test.tsx`, `ux.test.tsx`, e2e `identidade.spec.ts` (usa o 1º `native-select` em 390 px).
- Termos novos de UI: "Chamado aberto", "Organizar", "Mais", "Publicado v{n}".
- Sem dependência nova (`@xyflow/react` já tem `BaseEdge`, `EdgeLabelRenderer`, `NodeToolbar`).

## Relations
Sem entidade nova. Um fluxo continua 1 categoria × 1 abrangência × (1 vigente + 0..1 rascunho).

## Surface
Nenhuma rota nova nem alterada: `GET /api/admin/{setores,categorias,cursos,fluxos,respostas-prontas}`, `PUT/DELETE …/fluxos/{id}/rascunho`, `POST …/publicar`, `POST …/simular` iguais.

## Landing (decisões difíceis de desfazer)
Nenhuma: não toca schema, contrato de API nem migration. `x`/`y` das etapas continuam no mesmo formato.

## Perguntas para você
1. **Navegação**: coluna à esquerda com contagem (padrão Stripe/Linear, minha recomendação) ou manter as abas no topo e só enriquecer as listas?
2. **Editor**: tela cheia (n8n) ou manter a janela modal maior? Recomendo tela cheia.
3. O check C21 (colunas `Nome`/`Detalhe`) pode mudar? Sem isso o item 3 e 4 não cabem.
