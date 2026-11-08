# cadastros-fluxo-visual — checks

Aprovado em 08/11 ("aprovo", com as recomendações: navegação em coluna, editor em tela cheia).
Prova padrão: `npm --prefix web test -- --run <arquivo>`; exit code decide. Build: `npm --prefix web run build`.
Nota sobre o plano: as colunas `Nome`/`Detalhe` (C21 de layout-painel) **não mudam**; badges e mini-cadeia ficam dentro da coluna Detalhe.

## Cadastros
- **K1 (AC 1)** Com a tela aberta, as 5 abas têm nome acessível `Setores|Categorias|Cursos|Fluxos|Respostas prontas` e mostram a contagem (`3`, `3`, `2`, `2`, `1` com os dados de `cadastros.test.tsx`) em texto oculto do nome. `tablist` tem `aria-orientation=vertical`. Prova: `cadastros.test.tsx` "abas com contagem".
- **K2 (AC 2)** Cada aba mostra `h2` com o título, uma frase de ajuda, campo `Buscar em <aba>` e botão `Novo setor|Nova categoria|Novo curso|Novo fluxo|Nova resposta pronta`. Digitar `fin` em Setores deixa só `Financeiro`. Prova: `cadastros.test.tsx` "busca e botões".
- **K3 (AC 3)** Setores mostram badges `Triagem`, `Inativo`, `Liderança de ADS, 3º semestre`; categorias `Padrão`, `Inativa`; cursos `Coordenação: Financeiro`. Prova: `cadastros.test.tsx` "cada aba lista…".
- **K4 (AC 4)** A linha do fluxo mostra a abrangência, as mini-etapas (`Setor Financeiro`, `Liderança do semestre`, `Coordenação do curso (48 h)`) e o badge `Publicado v1`, `Publicado v2`, `Rascunho` ou `Sem versão`. Prova: `cadastros.test.tsx` "cada aba lista…", `fluxos.test.tsx`.
- **K5 (AC 5)** Buscar `zzz` mostra `Nenhum resultado para «zzz»` e o botão `Limpar busca` restaura a lista; lista vazia mostra a frase do cadastro e `Novo …`. Prova: `cadastros.test.tsx` "busca sem resultado".
- **K6 (AC 6)** Clicar no nome continua abrindo o editor (`Editar: Setores`) e salvar grava o mesmo corpo de antes (testes existentes de gravação passam sem mudar as asserções de corpo). Prova: `cadastros.test.tsx`.

## Editor de fluxo
- **K7 (AC 7)** Abrir um fluxo mostra o diálogo `Editar: Fluxos` com a classe de tela cheia (`inset-0`), a barra com estado `Rascunho|Publicado v{n}`, `Lista`/`Canvas`, `Simular`, `Salvar rascunho`, `Publicar` e o menu `Mais` com `Descartar rascunho`. Prova: `fluxos.test.tsx`.
- **K8 (AC 8)** No canvas há um botão `Inserir etapa entre <A> e <B>` por ligação; escolher `Setor fixo` nele deixa a cadeia `A → novo → B` e o POST do rascunho leva 3 etapas nessa ordem. Prova: `canvas.test.tsx`.
- **K9 (AC 9)** Selecionar uma etapa mostra a barra com `Remover`; etapa com setor ou prazo pede confirmação, sem ambos remove direto. Prova: `canvas.test.tsx`.
- **K10 (AC 10)** A fileira `Destinos` acima do canvas não existe; há o botão `Adicionar etapa` no canvas que abre o menu dos 3 destinos e põe a etapa no fim. Prova: `canvas.test.tsx`.
- **K11 (AC 11)** O cartão da etapa com prazo mostra o chip `24 h` e o nome sem `(24 h)`; o nó inicial é `Chamado aberto`. Prova: `canvas.test.tsx`.
- **K12 (AC 12)** `Organizar` põe as etapas em x = 240·i + 240, y igual, e `fixarPosicoes`/`organizar` nunca devolve etapa com x < 240. Prova: `grafo` em `canvas.test.tsx` ("organizar").
- **K13 (AC 13)** No canvas o simulador é um painel `Simulação` ao lado do desenho; na Lista, abaixo. Prova: `fluxos.test.tsx`.
- **K14 (AC 14)** Os testes existentes de grafo, ligação, limite de 5 etapas, painel da etapa, simulação e publicação passam. Prova: `canvas.test.tsx`, `fluxos.test.tsx`.

## Gerais
- **K15** `npm --prefix web test -- --run` sai com 0; `npm --prefix web run build` sai com 0.
- **K16** `crapper` e `dryer` dentro de `web/` saem com 0 (AD-018); `mutator` suspenso (AD-025).
- **K17** Captura a 1440 e a 390 px de Cadastros (Setores e Fluxos) e do canvas, em claro, examinada por quem verifica.
