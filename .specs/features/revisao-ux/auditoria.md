# Auditoria de usabilidade e responsividade (web/)

Data: 2026-11-04. Método: Playwright (Chromium) contra a API real em `localhost:8080` (instituição `univag-apresentacao-4`, cor #8a1538) pelo Vite em `:5197`, mais a API simulada (`web/e2e/simulada.ts`) para textos longos, listas vazias, erros e carregamento lento. Todas as rotas de `App.tsx`, nos papéis certos, em 360, 390, 768, 1024 e 1440 px, tema claro e escuro (150 capturas). Medições: `scrollWidth`, alvos < 44 px, `font-size` de campos, contraste WCAG (cores computadas), caracteres por linha, foco por Tab. Custo de IA: 1 mensagem real. Scripts e imagens em `C:\Users\ALFRED~1\AppData\Local\Temp\claude\32208d8f0bb63a9f\023d6896-6e71-49ab-bcad-30fe290f9094\scratchpad\audit2\`; `S` abaixo é a subpasta `shots\` desse caminho.

Efeitos na base de demonstração: chamados ONE-4 e ONE-5 criados (ONE-5 resolvido) e uma resposta de aluno com anexo em ONE-4. Nada mais foi gravado (formulários de artigo, usuário, cadastro e importação foram só até o erro de validação).

## Resultado geral (o que está bom)

- Nenhum estouro horizontal em nenhuma rota, largura ou tema, inclusive com textos de 120 caracteres sem espaço (`extremos`).
- No celular (< 768 px) os campos têm 16 px e 44 px de altura e os `Button` têm `max-md:h-11` (`ui/button.tsx`). Contrastes correntes passam: texto/fundo 19,8 (claro) e 16,5 (escuro); texto secundário 6,0 e 7,4; botão primário 8,96 e 6,39; link da marca 9,35 e 6,39.
- Foco por teclado visível (borda cheia da marca mais halo de 3 px).
- Estados vazios têm ilustração, texto e ação. Diálogos cabem em 360 px (rolam por dentro).

## 1. Login, primeiro acesso, criar senha (`acesso/Acesso.tsx`)

1. (média) O link "Primeiro acesso ou esqueci minha senha" tem 20 px de altura em 360 e 390 px (271x20), `Acesso.tsx:211`. `S\login-360-light.png`.
2. (média) Dois casos num só link, sem dizer o que acontece. Em `definir-senha`, o link vencido mostra só "Link inválido ou vencido." sem botão para pedir outro (`S\f-definir-erro-390.png`).
3. (média) Campo de senha sem botão mostrar/ocultar; no celular, errar a digitação leva a "CPF ou senha inválidos." (`S\f-login-erro-senha-390.png`).
4. (baixa) Em 768 e 1024 px campos de 14 px e 36 px (`md:text-sm`, `ui/input.tsx:10`): em tablet de toque ficam abaixo de 44 px e com fonte < 16 px (3 campos medidos no login, 11 em Aparência).
5. (baixa) Foco no link usa contorno padrão `1px auto`, diferente do halo de 3 px dos demais.
6. (baixa) Contraste 1,08 acusado no painel de marca do login (1024 px+) é falso positivo (texto branco sobre imagem escura); porém o título "Bem-vindo" cai sobre um bloco claro da ilustração em 1440 px: conferir com imagens de outras instituições (`S\login-1440-light.png`).

## 2. Aluno: Assistente (`assistente/Assistente.tsx`)

Fluxo medido em 390 px: pergunta sugerida (1 toque, resposta em 4,9 s) → "Isso resolveu? Não" (2) → "Falar com atendente" (3) → "Confirmar" (4) → protocolo ONE-5. São 4 toques, bom. Minhas solicitações → ONE-4 → escrever → anexar → Enviar = 5 interações. O primeiro acesso foi só visto (não enviei, para não disparar e-mail).

7. (alta) Após transferir, "Quer explicar melhor ou falar com um atendente?" continua na tela, acima de "Transferido para Financeiro. Protocolo ONE-5." (`Assistente.tsx:173`; o `explicar` não é limpo). `S\f-aluno-4-transferida-390.png`.
8. (média) Compositor: área de texto com 40 px de altura em 360 e 390 px (264x40, 294x40), `Assistente.tsx:296-305` (`min-h-10`). O botão "Falar com atendente" fica colado ao texto de ajuda de 12 px ("Fotos e PDFs de até 10 MB, até 3 por conversa. Mostre só os dados de que o atendimento precisa."), fixo, em 2 linhas e técnico demais. `S\assistente-360-light.png`.
9. (média) "Isso resolveu? Sim/Não" fica ancorado sobre o compositor, ~300 px abaixo da resposta que avalia (390x844); "Sim" verde e "Não" contornado (`Assistente.tsx:186-192`). `S\f-aluno-1-resposta-390.png`.
10. (média) Nada avisa que o aluno já tem ONE-4 sobre o mesmo assunto; a transferência criou ONE-5 idêntico.
11. (baixa) Linha de leitura da bolha: ~81 caracteres em 1440 px (87 medidos no detalhe do chamado, bolha de 692 px), acima do ideal de 75. `S\f-aluno-1-resposta-1440.png`.
12. (baixa) Em 768 px os alvos voltam ao tamanho de mouse: "Anexar arquivo" 32x32, "Tema" 36x36, itens da barra lateral 239x32, "Alternar barra lateral" 28x28.
13. (baixa) Sem "pular para o conteúdo": o campo de mensagem é a 12ª parada do Tab (a barra lateral inteira vem antes), `Autenticado.tsx`.

## 3. Aluno: Minhas solicitações e detalhe (`chamados/Chamados.tsx`, `ChamadoDetalhe.tsx`)

14. (alta) No celular a barra fixa "Ações" (44 px) cobre o fim da página: com a página rolada até o fim, "Enviar" termina em y=803 e a barra começa em y=800 (viewport 844). O contêiner não reserva espaço (`Autenticado.tsx:291`, `ChamadoDetalhe.tsx:253`). `S\f-aluno-6-detalhe-fim-390.png`.
15. (média) Para o aluno a barra "Ações" abre uma folha com um único botão, "Cancelar solicitação": ação destrutiva escondida atrás de uma faixa de cor cheia. `S\f-aluno-7-acoes-390.png`.
16. (média) A folha tem o rótulo em inglês "Close" para leitor de tela (`ui/sheet.tsx:79`; o diálogo usa "Fechar").
17. (baixa) O link da resposta do assistente aparece como texto cru (https://portal...) no histórico do chamado, mas como botão no chat. Inconsistente.
18. (baixa) A lista não mostra data nem quem atende; "Aberto"/"Fechado" são selos de 12 px; "Fechado" tem contraste 4,19 (mínimo 4,5), verde sobre verde claro (`Chamados.tsx:22-23`).
19. (baixa) Na mensagem enviada, o clipe do anexo fica em linha separada do nome do arquivo (`S\f-aluno-9-enviado-390.png`).

## 4. Atendente: Fila, assumir, responder, resolver

Em 390 px: abrir ONE-5 (1) → Ações (2) → Assumir (3) → resposta pronta (4) → Enviar (5) → Ações (6) → digitar resolução (7) → Resolver (8). Quatro trocas entre folha e página.

20. (média) A fila mostra "0 dias" (`Chamados.tsx:73,84`), sem aluno, sem setor e sem ordem visível; "0 dias" é ambíguo. `S\f-at-1-fila-390.png`.
21. (média) No celular o formulário de resposta fica no fim de uma página longa (resumo, conversa, fontes citadas): ~900 px de rolagem até "Responder"; falta atalho na barra fixa (`S\f-at-2b-detalhe-full-390.png`).
22. (média) "Resolver", "Sim" e "Confirmar" são verdes, "Assumir" e "Enviar" são da marca: dois botões primários sem regra (`ChamadoDetalhe.tsx:133,313`, `Assistente.tsx:187`). Verde sobre claro: 5,16.
23. (baixa) Depois de resolver, "Responder" e a barra "Ações" continuam, com só "Encaminhar" na folha (`S\f-at-7-resolvido-390.png`).
24. (baixa) "Resolução" vira mensagem ao aluno sem aviso; "Duplicado de outro pedido do mesmo aluno" com "ONE-123" é jargão; as caixas "Nota interna / Aguardando aluno" têm 16 px (rótulo de 20 px).
25. (baixa) A resposta pronta ("Boleto já pago aparecendo em aberto") foi enviada sem prévia a um chamado de outro assunto; nada pede revisão.

## 5. Administração

**Indicadores** (`indicadores/Indicadores.tsx`, `Periodo.tsx`)
26. (média) Dois controles de período (datas e "Escolher período no calendário"). Em 360 px os quatro indicadores principais empilham (~160 px cada): a primeira tela mostra 1,5 cartão. Texto técnico: "Resolvidas sem reabertura, sobre as conversas com desfecho". `S\indicadores-360-light.png`.
27. (baixa) O gráfico repete a tabela logo abaixo; rótulos do eixo minúsculos e quebrados (`S\indicadores-1440-light.png`).

**Artigos** (`conhecimento/Artigos.tsx`, `comum.tsx`)
28. (média) Em 360 px o título fica espremido (4 linhas) ao lado de dois selos: "Indexado" e "ATIVO" ambos verdes, um em caixa mista e outro em maiúsculas; "ARQUIVADO" preto (`comum.tsx:9,20`). `S\m-a.png`.
29. (média) Diálogo "Novo artigo" em 360 px: 940 px de conteúdo para 706 visíveis; "Salvar" só no fim e o erro "Informe o título, com até 200 caracteres." aparece junto do botão, longe do campo Título (`S\f-ad-artigo-novo-erro-360-light.png`). Datas `dd/mm/yyyy` cortadas e com rótulos desalinhados; botão "Escolher validade no calendário" duplica os campos (`Artigos.tsx:117`).
30. (baixa) Estado vazio repete a ação ("Novo" no topo e "Novo artigo").

**Documentos**
31. (baixa) Título e nome do arquivo ocupam 8 linhas em 360 px; no diálogo "Enviar PDF" o botão fica desabilitado sem dizer que falta o arquivo (`S\f-ad-doc-novo-360-light.png`). Não enviei PDF (o regulamento da demonstração já existe).

**Usuários** (`administracao/Usuarios.tsx`)
32. (média) CPF sem máscara ("39627154873"), sem busca nem filtro. Diálogo "Novo usuário" em 360 px com 1074 px de altura; "Salvar" no fim; "CPF inválido." junto do botão (`S\f-ad-usuario-novo-erro-360-dark.png`).

**Matrículas** (`administracao/Matriculas.tsx:49-51`)
33. (média) Instrução técnica ("CSV em UTF-8, separado por ponto e vírgula, com o cabeçalho cpf;nome;...") em fonte monoespaçada que quebra no meio da palavra; sem modelo para baixar. Importação com erro: 3 passos (arquivo, Importar, confirmar) e o número da linha aparece sozinho ("1"), sem rótulo, em 390 px (`S\f-ad-mat-erro-390.png`). O diálogo usa "Voltar" (`Confirmar.tsx:18`) e os demais "Cancelar".

**Cadastros** (`administracao/Cadastros.tsx:71`)
34. (média) Em 360/390 px as abas viram um `select` de 14 px (`ui/native-select.tsx:19`, zoom do iOS) e cada linha é um botão de 20 px dentro de um cartão de 46 px (55x20, 70x20, 147x20): só o texto é tocável. Vale para Setores, Categorias, Cursos, Regras e Respostas prontas. O `select` de 14 px também está nos diálogos de artigo e documento. `S\f-ad-cad-Categorias-390.png`.
35. (baixa) "Setor de triagem (exatamente um na instituição)" sai com entrelinha comprimida (`S\f-ad-cad-novo-390.png`).

**Aparência** (`administracao/Aparencia.tsx`, `PreviaAparencia.tsx`)
36. (média) No celular a prévia vem antes do formulário e a página tem 2970 px (`S\f-ad-aparencia-full-390.png`); em 768-1440 px, 11 campos com 14 px.
37. (média) Em tema escuro o botão "Entrar" da prévia tem contraste 2,05 (texto #0f0f0f sobre #8a1538); a prévia mostra uma cor que o aluno não verá (o escuro usa a marca clareada) (`PreviaAparencia.tsx`).

## 6. Transversais

38. (alta) O X de diálogos e folhas mede 16x16 px (`ui/dialog.tsx:70-77`, `ui/sheet.tsx:76-80`): difícil de tocar no celular.
39. (média) Erros de leitura são texto vermelho simples ("Erro inesperado"), sem ícone nem "Tentar de novo" (`ErroDe.tsx:5`). No assistente o erro aparece abaixo do compositor, sem reenviar (`S\est-erro-assistente.png`).
40. (média) Rotas sem guarda de papel: o aluno abre `/univag-apresentacao-4/fila` e vê "Fila em dia" (`App.tsx:60`; o link some da barra, a rota responde).
41. (baixa) Esqueleto de carregamento quase invisível (`bg-accent` sobre branco, ~1,05:1, `ui/skeleton.tsx`): `S\est-lento-solicitacoes.png`.
42. (baixa) Borda dos campos com contraste 1,26:1 (claro) e 1,51:1 (escuro), abaixo de 3:1 para componentes (`index.css`, `--input`).
43. (baixa) O botão de tema mostra sempre o sol, mesmo no escuro (`Autenticado.tsx:56-58`), e o menu não marca a opção atual (Claro/Escuro/Preto/Sistema).
44. (baixa) Em 768 px a barra lateral de 240 px fica fixa (31% da largura), deixando 528 px; alvos de 32 px.

## Os 10 problemas de maior impacto

1. Barra fixa "Ações" cobre o botão Enviar no fim do detalhe do chamado no celular, sem reserva de espaço: `ChamadoDetalhe.tsx:253`, `Autenticado.tsx:291`.
2. Após a transferência o assistente mantém "Quer explicar melhor ou falar com um atendente?" acima do aviso de transferido: `Assistente.tsx:173`.
3. Botão X dos diálogos e folhas com 16x16 px: `ui/dialog.tsx:70`, `ui/sheet.tsx:76`.
4. `select` de 14 px no celular (zoom do iOS) em Cadastros e nos diálogos de artigo e documento: `ui/native-select.tsx:19`.
5. Linhas de Cadastros com alvo de 20 px em cartões de 46 px: `Cadastros.tsx:71`.
6. Diálogos longos em 360 px sem rodapé fixo: erro e "Salvar" no fim, longe do campo (artigo 940 px, usuário 1074 px).
7. Erros genéricos sem recuperação ("Erro inesperado", sem repetir); no assistente o erro fica abaixo do compositor: `ErroDe.tsx:5`.
8. Fluxo do atendente no celular: resposta no fim de página longa e 8 interações para assumir, responder e resolver; fila com "0 dias" e sem aluno.
9. Matrículas: instruções técnicas (UTF-8, ponto e vírgula), sem modelo, erro com linha sem rótulo: `Matriculas.tsx:49-51`.
10. Rota `/fila` abre para o aluno; selos e botões verdes sem regra (Indexado, ATIVO, Resolver, Sim); prévia de Aparência com contraste 2,05 no escuro.
