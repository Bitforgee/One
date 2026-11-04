# Aparência da instituição e revisão visual - checks

Profile: ui
Plan: `.specs/features/aparencia-instituicao/plan.md`

71 checks em 9 slices · 9 one-way doors · 0 perguntas abertas

**Como as provas rodam.** Todos os comandos rodam na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é o
commit que congela `plan.md` e este `checks.md`, gravado no `## Handoff`.

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `OneFactory` (`f.MinioFora()`, `f.Chaves()`, `f.Objeto()`); e-mail lido no Mailpit por `PrimeiroAcessoTests.EmailNoMailpit` ou um leitor da API do Mailpit no mesmo padrão | `docker compose up -d postgres mailpit minio`; uma só execução de `dotnet test` por vez |
| `web/` unidade | Vitest (jsdom): `cd web && npx vitest run <arquivo> -t "<nome>"` | `npm --prefix web ci` |
| `web/` arranjo | Playwright com a API simulada (`e2e/simulada.ts`, que passa a responder a aparência), medindo com `boundingBox()` e `getComputedStyle` em px CSS, tolerância de 1 px: `cd web && npx playwright test e2e/<arquivo> -g "<nome>"` | o `playwright.config.ts` não tem `webServer`: `npm --prefix web run build`, `npx vite preview --port 5199` em `web/` e `E2E_URL=http://localhost:5199` (alguns testes precisam do service worker do build) |
| `web/` e2e real | Playwright contra uma imagem própria na porta 8085, no padrão de `arquivos-minio` e `anexos-assistente` | ver `## Handoff` |
| barreiras | `dotnet build api` (CA1502, AD-018); `crapper` e `dryer` em `web/` (AD-018); mutação suspensa (AD-025) | `npm --prefix web run coverage` |

Um filtro que não seleciona teste nenhum sai com código 0 (L-002). O construtor confere que cada `--filter`,
`-t` e `-g` executa pelo menos 1 teste. O nome citado numa linha `Proof:` é o contrato: o que não existe em
`<base>` é criado com exatamente esse nome (L-022). Classes novas em `api.Tests`: `AparenciaAdminTests`,
`AparenciaPublicaTests`, `ManifestoTests` e `EmailMarcaTests`. Arquivos novos em `web/`:
`src/administracao/aparencia.test.tsx`, `src/aparencia.test.tsx`, `src/assistente/boasvindas.test.tsx`,
`src/tabela.test.tsx`, `src/ilustracoes/ilustracoes.test.tsx`, `e2e/aparencia.spec.ts`, `e2e/celular.spec.ts` e `e2e/aparencia-real.spec.ts`.

**Asserções existentes que podem mudar** (lista fechada, o Verifier confere cada edição contra ela):
1. `api.Tests/Retratos/sucessos.txt`: a linha de `GET /api/instituicoes/{slug}` ganha os campos novos com o valor
   padrão (`null` ou listas vazias); `nome` não muda.
2. `api.Tests/Retratos/rotas.txt` e os números de `RetratoTests.Tabela_de_rotas_igual_a_da_base` e
   `RetratoTests.Admin_403_com_detail_nas_29_rotas` ganham as 7 rotas do `Surface` (o nome do teste pode passar a
   dizer 33 no lugar de 29).
3. As asserções estruturais que contam ou listam tabelas, entidades, casos de uso, `Map*`, rotas anônimas e
   arquivos de fatia (`ArquiteturaTests`, `MediatorTests`, `SessaoTests`, e a contagem de rotas de admin de `AdminTests.Sem_papel_admin_403`, emenda aprovada pelo usuário em 04/11) só podem ganhar o item novo desta
   feature ou subir na mesma conta (L-067).
4. `.specs/GLOSSARIO.md` ganha `Aparência` e `ImagemInstituicao`.
5. Em `web/e2e/arranjo.spec.ts` e nos testes Vitest de tela, só as asserções que medem o que o plano muda, e só
   para o arranjo novo:
   - `rótulo do gráfico numa linha` (AC 5);
   - `raiz com a marca e o texto centralizados` (AC 37);
   - `arranjo telas de acesso`, `telas de acesso centralizadas` e `Login: campos empilhados` (AC 32, AC 35);
   - `arranjo listas de chamados`, `arranjo Artigos e Documentos`, `arranjo administração` e
     `Cadastros: detalhe pequeno embaixo do nome` (AC 6, AC 7);
   - `arranjo Detalhe do chamado`, `detalhe em uma coluna a {largura} px` e
     `Detalhe: cartão da equipe antes da conversa e ações que quebram em linhas` (AC 8);
   - `botões pequenos em linha em Artigos, Documentos e Usuários` (AC 2);
   - `arranjo Assistente` (AC 38);
   - `painel no celular`, `painel cabeçalho` e `barra com fundo, borda e instituição` (AC 33);
   - `Matrículas: ... resultado em Alert ...` (AC 1);
   - as asserções de texto de vazio e de `Spinner` das listas (AC 4, AC 45);
   - emenda aprovada pelo usuário em 04/11, depois do lote 2: `compositor visível com a conversa maior que a tela` e `cabeçalho: borda, título numa linha e botões de 36 px` (AC 2), `colunas largas somem no estreito`, `lista vazia centralizada` e `texto das linhas de 14 px` (AC 7), `valores de tipo e bordas` (AC 5), e a exceção com nome de `src/tabela.test.tsx` em `web/src/test/estrutura.test.ts`.
   - emenda aprovada pelo usuário em 04/11, depois do lote 3: em `acesso.test.tsx`, as contagens e os grupos do menu com o link "Aparência" (AC 23), os testes de primeiro acesso e definir senha passando a filtrar as chamadas `POST` (AC 28, a tela também busca a aparência) e o painel de entrada esperando 1 ilustração `boas-vindas` (AC 47); o texto de Indicadores vazio (AC 46); e em `arranjo.spec.ts`, `linha da marca na entrada` (AC 32), `posição do conteúdo do painel` (AC 35) e `alertas de Indicadores` (AC 46).

   Cada edição fica listada no `## Handoff` com o AC que a força.

## Checks

### S1 - Alertas legíveis e toque confortável no celular (P1) · ~12 files · ~70 KB · ~20k

**C1** - [x] A 390 px, a mensagem "Há erros no arquivo." do `Alert` de Matrículas ocupa 1 linha (altura do texto ≤ 1,5 × `line-height`). Um `Alert` sem ícone tem o texto com a largura do conteúdo do alerta, com tolerância de 1 px (AC 1)
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "alerta sem ícone em uma linha"`

**C2** - [x] A 390 px, a altura medida é ≥ 44 px para: `Button` nos 8 tamanhos de `ui/button.tsx` (`default`, `sm`, `lg`, `xs`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`), um de cada, em tela real quando o tamanho é usado e num botão de teste com as classes de `buttonVariants` quando não é (emenda aprovada pelo usuário em 04/11, rodada 1), `Input` (CPF do login), `NativeSelect` (Cadastros) e o botão "Ações" de uma linha da `Tabela`. A 1024 px, o `Button` `default` mantém 36 px (AC 2)
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "alvos de toque de 44 px abaixo de 768"`

**C3** - [x] O selo de estado do chamado tem a classe de fundo por grupo, para os 5 estados: `ABERTO` e `EM_ATENDIMENTO` → `bg-primary-subtle`; `AGUARDANDO_ALUNO` → `bg-warning-subtle`; `RESOLVIDO` e `FECHADO` → a classe de `success` escolhida. O texto de cada selo é o de `<base>` (AC 3)
Proof: `cd web && npx vitest run src/tabela.test.tsx -t "selo de estado com cor por grupo"`

**C4** - [x] Com a lista ainda carregando, a `Tabela` mostra 3 elementos `[data-slot="skeleton"]` e nenhum `Spinner` (AC 4)
Proof: `cd web && npx vitest run src/tabela.test.tsx -t "carregando mostra 3 esqueletos"`

**C5** - [x] A 390 px em Indicadores, nenhuma frase de destaque e nenhum rótulo de barra tem `text-overflow: ellipsis`, e nenhum tem `scrollWidth` > `clientWidth`. Um rótulo de 40 caracteres ocupa no máximo 2 linhas (AC 5)
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "Indicadores sem texto cortado"`

**C6** - [x] A 390 px em Cadastros, o seletor de lista e o botão "Novo" têm o mesmo `top`, com tolerância de 1 px (AC 6)
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "Cadastros seletor e Novo na mesma linha"`

### S2 - Listas e chamado pensados para o celular (P1) · ~8 files · ~80 KB · ~22k

**C7** - [x] A 390 px, nas 6 listas (Fila, Minhas solicitações, Artigos, Documentos, Usuários, Cadastros), nenhum `<table>` está visível, e cada item é um cartão (`role="listitem"`): Nas listas com estado (Fila e Minhas solicitações), o teste afirma que existe 1 selo por cartão antes de medir a posição, sem condicionar a medida à existência do selo (L-069) (emenda aprovada pelo usuário em 04/11, rodada 1)
- O selo de estado, quando a lista tem estado, fica à direita da primeira coluna e com o mesmo `top` (1 px).
- A coluna principal fica abaixo das duas.

A 1024 px, as 6 listas continuam em `<table>` (AC 7)
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "listas viram cartões abaixo de 768"`

**C8** - [x] A 390 px e a 1023 px, o detalhe do chamado tem um botão "Ações" fixo (`position: fixed`), com `bottom` a 0 ou ao recuo da área segura e altura ≥ 44 px. Tocar nele abre um `Sheet` (`role="dialog"`) que vem de baixo, com os mesmos botões de ação que o cartão mostra a 1024 px, na mesma ordem. A 1024 px, não há botão "Ações" (AC 8)
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "Ações do chamado no rodapé abaixo de 1024"`

**C9** - [x] A 390 px, tocar em "Ações" e depois em "Assumir" (com a API simulada devolvendo o chamado em `EM_ATENDIMENTO`) fecha o `Sheet`, e o selo do chamado mostra o novo estado (AC 9)
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "ação no Sheet fecha e atualiza"`

**C10** - [x] A 360 px, `document.documentElement.scrollWidth` ≤ 360 nas 6 listas e no detalhe do chamado, inclusive com os textos longos de `simularApi(page, papeis, true)` (AC 10)
Proof: `cd web && npx playwright test e2e/celular.spec.ts -g "sem rolagem horizontal a 360"`

### S3 - A tela Aparência (P1) · ~16 files · ~120 KB · ~35k

**C11** - [x] `GET /api/admin/aparencia` de um `ADMINISTRADOR` de uma instituição sem aparência responde `200` com exatamente as chaves `nomeCurto`, `cor`, `login`, `assistente`, `contato` e `imagens`, todas `null` ou com subcampos `null`/listas vazias. Depois de um `PUT`, devolve os valores gravados (AC 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Get_sem_aparencia_devolve_nulos"`

**C12** - [x] Um `PUT /api/admin/aparencia` com todos os campos válidos responde `200` com os mesmos valores e grava em `instituicao`. Um segundo `PUT` com `login.titulo` ausente e `cor` `null` deixa os dois `null` e mantém os outros. Uma instituição B não é alterada (AC 12, door 1, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Put_grava_e_campo_ausente_volta_ao_padrao"`

**C13** - [x] `PUT` com `cor` inválida responde `400` com `errors.cor` "Escolha uma cor mais escura: o texto branco precisa de contraste 4,5:1 sobre ela." e não grava nada, em 4 entradas: `224fa7` (sem `#`), `#224fa` (5 dígitos), `#ffd700` (contraste 1,4:1) e `#767676` + 1 grau, isto é `#777777` (contraste 4,48:1). Aceita `#767676` (4,54:1) e `#224fa7` (AC 13, door 8)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Cor_invalida_ou_sem_contraste_400"`

**C14** - O `PUT` responde `400` no campo certo, com o limite no texto, e não grava nada. Cada limite é testado exatamente no valor aceito e no valor + 1 (12 limites nos dois lados da borda, 24 pedidos, mais o e-mail inválido) (emenda aprovada pelo usuário em 04/11, rodada 1):
- tamanho máximo: `nomeCurto` 12, `login.titulo` 60, `login.frase` 160, cada `login.itens` 80, `assistente.nome` 40, `assistente.boasVindas` 300, cada `assistente.perguntas` 100, `contato.horario` 120, `contato.telefone` 30 e `contato.email` 120;
- quantidade máxima: 3 `login.itens` e 4 `assistente.perguntas`;
- `contato.email` "nao-e-email" (inválido) (AC 14)

Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Limites_dos_textos_400"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Email_de_contato_invalido_400"`

**C15** - [x] `POST /api/admin/aparencia/imagens/logo` com um PNG válido responde `200` com `{tipo:"logo", versao:1}`, grava o objeto com chave começando por `{instituicaoId}/aparencia/`, com os mesmos bytes, e 1 linha `imagem_instituicao` com `conteudo` `image/png`, `tamanho` e `hash` SHA-256. Um segundo envio responde `versao:2`, deixa 1 linha só e uma chave nova, e o objeto antigo continua no bucket (AC 15, door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Enviar_imagem_grava_e_reenviar_sobe_a_versao"`

**C16** - [x] Responde `415`, sem gravar linha nem objeto, em 3 casos: um GIF como `logo`, um PDF como `login` e um JPEG como `icone`. Um JPEG como `login`, `logo` e `assistente` é aceito (AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Tipo_de_imagem_recusado_415"`

**C17** - [x] Responde `413` com o limite, sem gravar nada, para `logo`, `icone` e `assistente` de 1 MiB + 1 byte e `login` de 3 MiB + 1 byte. Os quatro tipos aceitam exatamente 1 MiB e 3 MiB (AC 17)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Imagem_acima_do_limite_413"`

**C18** - [x] O `icone` responde `400` "O ícone deve ser um PNG quadrado de pelo menos 512 px.", sem gravar nada, com PNG de 512×511 e de 511×511. Aceita 512×512 e 1024×1024. A largura e a altura vêm do `IHDR` (AC 18)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Icone_nao_quadrado_ou_pequeno_400"`

**C19** - [x] `POST` e `DELETE /api/admin/aparencia/imagens/fundo` respondem `404` (AC 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Tipo_desconhecido_404"`

**C20** - [x] Com `f.MinioFora()`, o `POST` de um `logo` válido responde `503`, e a linha `imagem_instituicao` existente fica com a versão e a chave de antes (AC 20)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Minio_fora_503_sem_mudar_a_imagem"`

**C21** - [x] `DELETE /api/admin/aparencia/imagens/logo` responde `204`, marca a imagem como removida sem apagar a linha e deixa o objeto em `f.Chaves()`: `GET /api/admin/aparencia` e `GET /api/instituicoes/{slug}` passam a devolver `imagens.logo` `null`, e a rota pública da imagem responde `404`. Um segundo `DELETE` responde `404`. Um novo envio do mesmo tipo depois da remoção responde `versao` igual à anterior + 1, nunca uma versão já usada (AC 21, door 11; emenda aprovada pelo usuário em 04/11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Remover_imagem_204_e_objeto_fica"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Reenviar_depois_de_remover_nao_repete_versao"`

**C22** - [x] As 4 rotas de `/api/admin/aparencia` respondem `403` para `ALUNO` e para `ATENDENTE`, e `401` sem sessão, em 12 pedidos. O admin da instituição A nunca lê nem altera a aparência de B (AC 22, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Rotas_de_admin_403_e_401"`

**C23** - [x] O link "Aparência", com ícone `Palette`, aparece no grupo "Administração", depois de "Cadastros", na barra e na gaveta para `ADMINISTRADOR`. Não aparece para `ALUNO` nem para `ATENDENTE`. Leva a `/{slug}/aparencia` (AC 23, door 7)
Proof: `cd web && npx vitest run src/administracao/aparencia.test.tsx -t "link Aparência só para administrador"`

**C24** - [x] Na tela Aparência, sem salvar, a prévia muda em 4 casos:
- digitar `#8a1538` em "Cor principal" muda a cor do botão da prévia para esse valor;
- escolher um arquivo de logo mostra uma `img` na prévia com `src` `blob:`;
- digitar "Fale com a Univag" em "Título do login" mostra esse texto na prévia;
- digitar "Vagner" em "Nome do assistente" mostra "Olá! Eu sou Vagner." na prévia (AC 24)

Proof: `cd web && npx vitest run src/administracao/aparencia.test.tsx -t "prévia muda antes de salvar"`

**C25** - [x] Ao salvar, a tela faz `PUT /api/admin/aparencia` com os campos do formulário e mostra "Aparência salva.". A consulta de `GET /api/instituicoes/{slug}` é invalidada, e o `--marca` do `<html>` passa ao valor novo sem recarregar a página (AC 25)
Proof: `cd web && npx vitest run src/administracao/aparencia.test.tsx -t "salvar mostra Aparência salva e aplica sem recarregar"`

**C26** - [x] A tela mostra o texto da API sem apagar o que foi digitado:
- um `400` com `errors.cor` aparece abaixo do campo de cor;
- um `413`, um `415` e um `503` no envio de imagem aparecem no alerta da seção da imagem (AC 26)

Proof: `cd web && npx vitest run src/administracao/aparencia.test.tsx -t "erro da API aparece e o formulário fica"`

**C27** - [x] Ao lado do campo de cor, a tela mostra uma amostra com `background-color` igual à cor e o texto "Contraste com o branco: N,NN:1". O valor é calculado pela mesma regra do servidor: `#224fa7` → "7,65:1" (valor corrigido com aprovação do usuário em 04/11; o texto aprovado dizia 7,47 por erro de conta), `#767676` → "4,54:1", `#ffd700` → "1,40:1". "Salvar" fica desabilitado com `#ffd700` e habilitado com `#767676`. Uma função pura `contraste(hex)` é testada sobre os 3 valores (AC 27, door 8)
Proof: `cd web && npx vitest run src/administracao/aparencia.test.tsx -t "contraste ao lado da cor e Salvar desabilitado"`
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "contraste calcula a razão WCAG"`

**C28** - [x] A 1440 px, o formulário fica à esquerda e a prévia à direita, com `top` igual (1 px) e a prévia `position: sticky`. A 390 px, a prévia fica acima do formulário e tem um botão "Ocultar prévia" que a recolhe. As seções aparecem nesta ordem: "Marca", "Login", "Assistente", "Contato", depois "Salvar" (Screens: Aparência)
Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "arranjo Aparência"`

**C29** - [x] "Remover" numa imagem abre o `Confirmar` existente, com "Remover a imagem?". Confirmar faz `DELETE /api/admin/aparencia/imagens/{tipo}`, e a miniatura some (AC 21, Observable)
Proof: `cd web && npx vitest run src/administracao/aparencia.test.tsx -t "remover imagem pede confirmação"`

### S4 - A marca da instituição no app (P1) · ~14 files · ~110 KB · ~32k

**C30** - [x] `GET /api/instituicoes/{slug}` responde `200` com `nome` igual ao de `<base>` e as chaves `nomeCurto`, `cor`, `login`, `assistente`, `contato` e `imagens {logo, icone, login, assistente}`. Com logo enviado, `imagens.logo` é a versão atual (número) e os outros tipos são `null`. Uma instituição inativa responde `404` (AC 28)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaPublicaTests.Instituicao_publica_traz_a_aparencia"`

**C31** - [x] `GET /api/instituicoes/{slug}/imagens/logo?v=1`, sem cookie, responde `200` com os mesmos bytes, o `Content-Type` do arquivo e `Cache-Control` exatamente `public, max-age=31536000, immutable` (AC 29, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaPublicaTests.Imagem_publica_com_cache_imutavel"`

**C32** - [x] A rota de imagem responde `404` em 4 casos: instituição inexistente, instituição inativa, tipo sem imagem e tipo desconhecido. Com `f.MinioFora()`, responde `503` (AC 30)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AparenciaPublicaTests.Imagem_publica_404_e_503"`

**C33** - [x] Com a aparência simulada com `cor` `#8a1538`, a 1024 px, o fundo computado do botão "Entrar" é igual ao de um elemento de referência pintado com `#8a1538` no tema Claro. Nos temas Escuro e Preto, é igual ao de um elemento pintado com `color-mix(in oklch, #8a1538 55%, white)`. Sem `cor`, o fundo é igual ao `oklch(0.45 0.15 262)` de `<base>` no Claro e ao `oklch(0.72 0.12 262)` no Escuro (AC 31, door 8)
Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "cor da instituição nos três temas"`

**C34** - [x] `index.css` define `--primary`, `--sidebar-primary`, `--primary-subtle` e `--ring` a partir de `var(--marca, <valor de base>)` em `:root`, `.dark` e `.black`. O componente que aplica a aparência põe `style="--marca: #8a1538"` no `<html>` quando há `cor` e remove a propriedade quando não há (AC 31)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "marca no html só com cor"`
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "tokens derivam de marca nos três temas"`

**C35** - [x] Com `imagens.logo` = 3, o login mostra no topo do formulário uma `img` com `src` `/api/instituicoes/univag/imagens/logo?v=3`, `alt` igual ao nome da instituição e altura ≤ 40 px. A barra lateral aberta mostra a mesma `img` no cabeçalho. Sem logo, o login mostra as iniciais e não mostra "One" (AC 32)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "logo no login e na barra"`
Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "logo até 40 px no login"`

**C36** - [x] Com `imagens.icone` = 2, os `href` de `<link rel="icon">` e de `<link rel="apple-touch-icon">` são `/api/instituicoes/univag/imagens/icone?v=2`. A barra recolhida e o topo do celular mostram uma `img` com esse `src`. Sem ícone, os dois links voltam a `/icons/icon-192.png`, e a barra mostra as iniciais num elemento com `bg-primary` (AC 33)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "ícone na aba, na barra recolhida e no topo"`

**C37** - [x] Nas telas com `slug`, `document.title` é o `nomeCurto` ("Univag"), ou o `nome` sem `nomeCurto`. `<meta name="theme-color">` tem `content` `#8a1538` com cor, e `#224fa7` sem cor (AC 34)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "título e theme-color da instituição"`

**C38** - [x] Com `imagens.login` = 1, a 1440 px, a imagem ocupa o painel direito inteiro (a caixa da `img` é igual à do painel, com 1 px de tolerância), com `object-fit: cover`, `alt=""` e o título, a frase e os itens sobre ela. A 390 px, uma faixa de altura 128 px (1 px) com a imagem fica acima do `h1` do formulário, com o logo dentro da faixa (AC 35)
Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "imagem do login no painel e na faixa"`

**C39** - [x] Com `login` definido, o painel mostra o `titulo`, a `frase` e os `itens` da instituição. Sem `login`, mostra "Atendimento ao estudante", a frase de `<base>` e os 3 itens de `<base>`, comparados com os textos de `<base>` lidos em `web/src/test/textos.ts` (AC 36)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "textos do login da instituição ou os de base"`

**C40** - [x] A raiz `/` mostra a ilustração `Boas-vindas` (`svg[data-ilustracao="boas-vindas"]`) acima do `h1` "One" (AC 37)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "raiz com a ilustração Boas-vindas"`

### S5 - Assistente com identidade e contato do atendimento (P1) · ~8 files · ~70 KB · ~20k

**C41** - [x] Sem conversa, com `assistente {nome:"Vagner", boasVindas:"Oi! Posso ajudar com boletos e matrícula.", perguntas:[4 textos]}` e foto, o assistente mostra:
- uma `img` redonda de 64 px com `alt` "Vagner";
- o texto "Olá! Eu sou Vagner." e as boas-vindas;
- 4 botões com os textos das perguntas, na ordem.

Sem nada definido, mostra a ilustração `Conversa`, "Olá! Eu sou Assistente." e o texto de exemplo de `<base>` (AC 38)

Proof: `cd web && npx vitest run src/assistente/boasvindas.test.tsx -t "boas-vindas com nome, foto e perguntas"`
Proof: `cd web && npx vitest run src/assistente/boasvindas.test.tsx -t "boas-vindas padrão sem aparência"`

**C42** - [x] Sem `assistente.perguntas`, a tela mostra 2 botões: "Como emito o boleto do semestre?" e "Posso abonar falta com atestado?" (AC 39)
Proof: `cd web && npx vitest run src/assistente/boasvindas.test.tsx -t "perguntas padrão"`

**C43** - [x] Tocar na pergunta "Posso abonar falta com atestado?" faz `POST /api/conversas` com o corpo `{ "mensagem": "Posso abonar falta com atestado?" }`. Depois, o balão do aluno mostra esse texto e as sugestões somem (AC 40)
Proof: `cd web && npx vitest run src/assistente/boasvindas.test.tsx -t "tocar na sugestão envia a pergunta"`

**C44** - [x] Com foto do assistente, cada balão `ASSISTENTE` tem uma `img` de 24 px com `alt` igual ao nome do assistente, e os balões do aluno não têm. Sem foto, nenhum balão tem `img` (AC 41)
Proof: `cd web && npx vitest run src/assistente/boasvindas.test.tsx -t "foto do assistente nos balões"`

**C45** - [x] Na tela "Transferido", com `contato {horario:"Seg a sex, 8h às 18h", telefone:"(65) 3688-6000", email:"atendimento@univag.edu.br"}`, aparece "Contato do atendimento" com:
- o horário;
- um link `href="tel:6536886000"` com o texto do telefone;
- um link `href="mailto:atendimento@univag.edu.br"`.

Com só o telefone, aparece só o link do telefone. Sem contato, o bloco não aparece (AC 42)

Proof: `cd web && npx vitest run src/assistente/boasvindas.test.tsx -t "contato na transferência"`

**C46** - [x] Com contato, a barra lateral e a gaveta têm o item "Contato" acima do usuário, que abre um `Dialog` com os mesmos campos e links de C45. Sem contato, o item não existe (AC 43)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "item Contato no menu só com contato"`

### S6 - Ilustrações nos estados vazios (P2) · ~10 files · ~40 KB · ~14k

**C47** - [x] `web/src/ilustracoes/` exporta exatamente as 6 ilustrações `BoasVindas`, `Conversa`, `CaixaVazia`, `Documento`, `Pessoas` e `Grafico`. Cada uma renderiza um `<svg>` com `aria-hidden="true"` e `data-ilustracao` com o nome em kebab-case. Nenhum atributo `fill`/`stroke` e nenhum `style` contém cor literal (hex, `rgb`, `hsl`, `oklch` ou nome de cor). Só aparecem `currentColor`, `none`, `var(--primary)` e `var(--primary-subtle)`, e nenhum `<image>` nem `href` externo (AC 44, door 9)
Proof: `cd web && npx vitest run src/ilustracoes/ilustracoes.test.tsx -t "6 ilustrações só com currentColor e tokens"`

**C48** - [x] Com a lista vazia, cada lista mostra a ilustração, o título, a frase e o botão de ação, como no AC 45 (6 listas, table-driven). "Falar com o assistente" leva a `/{slug}/assistente`, "Novo artigo" abre o diálogo de artigo novo e "Novo documento" abre o de documento novo (AC 45)
Proof: `cd web && npx vitest run src/tabela.test.tsx -t "vazio ilustrado nas 6 listas"`

**C49** - [x] Indicadores sem atendimento no período mostra `svg[data-ilustracao="grafico"]` e "Sem atendimentos neste período." (AC 46)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "Indicadores sem dados com ilustração"`

**C50** - [x] Sem imagem de login, o painel direito do login a 1440 px e a faixa a 390 px mostram `svg[data-ilustracao="boas-vindas"]` (AC 47)
Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "ilustração no login sem imagem"`

### S7 - E-mails com a marca (P2) · ~5 files · ~40 KB · ~12k

**C51** - Um e-mail da fila `EmailSaida` de uma instituição com cor e logo (o caminho que envia os e-mails de aviso e, pelo mesmo `Email.Enviar`, o de primeiro acesso) chega ao Mailpit como `multipart/alternative`. A parte `text/plain` é igual ao `Corpo` da `EmailSaida` com as quebras de linha normalizadas (o SMTP entrega ` (emenda aprovada pelo usuário em 04/11, rodada 1)
`; emenda aprovada pelo usuário em 04/11), e há uma parte `text/html` (AC 48, door 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EmailMarcaTests.Email_vai_com_texto_e_html"`

**C52** - [x] O HTML desse e-mail contém:
- um elemento com `background-color:#8a1538`;
- `<img src="cid:logo"` com `alt` igual ao nome da instituição, e um anexo inline com `Content-ID` `logo` com os mesmos bytes do logo;
- o nome da instituição.

Com o `Corpo` contendo `<script>` e `&`, o HTML tem `&lt;script&gt;` e `&amp;`, e uma linha vira um parágrafo ou um `<br>`. Sem cor nem logo, o cabeçalho tem `background-color:#224fa7` e nenhum `cid:` (AC 49)

Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EmailMarcaTests.Html_com_cor_logo_e_corpo_escapado"`

**C53** - [x] Com `f.MinioFora()` no momento do envio, o e-mail de uma instituição com logo é enviado (`EnviadoEm` preenchido no mesmo ciclo do `Agendador`), sem `cid:` e com o nome em texto (AC 50)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EmailMarcaTests.Minio_fora_envia_sem_logo"`

### S8 - App instalado com a marca (P2) · ~5 files · ~30 KB · ~10k

**C54** - [x] `GET /api/instituicoes/univag/manifest.webmanifest`, sem cookie, com `nomeCurto` "Univag", cor `#8a1538` e ícone na versão 2, responde `200` com `Content-Type` `application/manifest+json` e um JSON com:
- `name` igual ao `nome` e `short_name` "Univag";
- `start_url` e `scope` "/univag/";
- `display` "standalone";
- `theme_color` "#8a1538" e `background_color` "#ffffff";
- `icons` com 2 entradas, `src` `/api/instituicoes/univag/imagens/icone?v=2` com `sizes` "192x192" e "512x512" e `type` "image/png".

Sem `nomeCurto`, sem cor e sem ícone: `short_name` são as iniciais do nome, `theme_color` é "#224fa7", e os `icons` são `/icons/icon-192.png` e `/icons/icon-512.png` (AC 51, door 5)

Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ManifestoTests.Manifesto_da_instituicao"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ManifestoTests.Manifesto_padrao_sem_aparencia"`

**C55** - [x] O manifesto responde `404` para instituição inexistente e para instituição inativa (AC 52)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ManifestoTests.Manifesto_404"`

**C56** - [x] Nas telas com `slug`, `<link rel="manifest">` tem `href` igual a `/api/instituicoes/univag/manifest.webmanifest`. Na raiz `/`, ele fica com o `href` de `<base>` (AC 53)
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "manifesto da instituição no link"`

### S0 - Invariantes e barreiras (P1)

**C57** - [x] A suíte inteira da API passa em `HEAD`. As únicas edições em asserções existentes são as dos itens 1 a 4 da lista fechada (Surface, door 1 a 6)
Proof: `dotnet test api.Tests`

**C58** - [x] `rotas.txt` ganha exatamente 6 linhas, as rotas novas do `Surface` (`GET /api/instituicoes/{slug}` já existia): 2 anônimas (`anonimo=True`, imagem e manifesto) e 4 de admin (`autorizacao=True`), e nenhuma linha some (Surface; emenda aprovada pelo usuário em 04/11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_igual_a_da_base"`

**C59** - [x] As tabelas `instituicao` e `imagem_instituicao` ficam com:
- as colunas novas da door 1, todas anuláveis, em snake_case;
- o índice único `(instituicao_id, tipo)`, com `instituicao_id` sob o filtro global;
- `has-pending-model-changes` limpo (door 1, door 2)

Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro|FullyQualifiedName~ArquiteturaTests.Tabelas_snake_case_e_datas_timestamptz|FullyQualifiedName~AparenciaAdminTests.Tabelas_da_aparencia"`
Proof: `dotnet ef migrations has-pending-model-changes --project api`

**C60** - [x] `dotnet build api` passa com a barreira CA1502 (AD-018)
Proof: `dotnet build api`

**C61** - [x] A suíte Vitest inteira e `npm --prefix web run build` passam. As edições em asserções existentes são só as do item 5 da lista fechada, cada uma listada no `## Handoff` (AC 1 a AC 53)
Proof: `npm --prefix web test`
Proof: `npm --prefix web run build`

**C62** - [x] O `crapper` sobre `web/src` sai 0 no limite 9.99, e o `dryer` não acha candidato com nota 0.8 ou mais. Os arquivos novos da raiz de `web/src` entram na lista do `dryer` no mesmo commit que os cria (L-031) (AD-018)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao -s src/ilustracoes --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx src/sw.ts src/push.ts src/AvisosPush.tsx src/aparencia.tsx | grep -q "No duplicate candidates found"`

**C63** - [x] A suíte de arranjo (`arranjo.spec.ts`, `celular.spec.ts`, `aparencia.spec.ts`) passa inteira com a API simulada (Screens)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/aparencia.spec.ts`

**C64** - [x] De ponta a ponta, na imagem própria (MinIO do compose):
1. O admin da instituição `e2e` abre Aparência, define a cor `#8a1538`, envia um logo PNG e um ícone PNG de 512×512 e salva.
2. Num contexto sem cookie, o login da instituição mostra o logo, e o fundo do botão "Entrar" é igual ao de `#8a1538`.
3. O manifesto traz o ícone novo.

A suíte e2e inteira passa (AC 15, AC 25, AC 31, AC 32, AC 51)

Proof: `cd web && E2E_URL=http://localhost:8085 npx playwright test e2e/aparencia-real.spec.ts -g "admin personaliza a aparência e o login muda"`
Proof: `cd web && E2E_URL=http://localhost:8085 npx playwright test`

### S9 - Arranjos de ## Screens sem check na rodada 1 (P1)

Acrescentados com aprovação do usuário em 04/11, depois da rodada 1 da verificação.

**C65** - [x] Sem conversa, com 4 perguntas sugeridas: a 390 px, os 4 botões têm o mesmo `left` (1 px) e `top` crescente (1 coluna); a 1440 px, ficam em 2 colunas (2 valores distintos de `left`, 2 linhas). Nas duas larguras, o centro horizontal do bloco de boas-vindas fica a no máximo 1 px do centro da área de conteúdo (Screens: Assistente sem conversa)
Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "sugestões centralizadas em 1 e 2 colunas"`

**C66** - [x] A 1440 px, com imagem de login, a base do bloco de título, frase e itens fica a no máximo 48 px da base do painel. O bloco fica sobre um elemento do painel com `background-image` `linear-gradient` cuja caixa contém a caixa do bloco (Screens: Login ≥ 1024 px)
Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "textos do login na base sobre a faixa"`

**C67** - [x] Com foto do assistente, a 390 e a 1440 px, a `img` do assistente de cada balão `ASSISTENTE` tem `right` ≤ `left` do balão e se sobrepõe a ele na vertical (Screens: Assistente com conversa)
Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "foto do assistente à esquerda do balão"`

**C68** - [x] Na tela "Transferido", com contato, o `top` do bloco "Contato do atendimento" é maior que o `bottom` do número do chamado (Screens: Transferido)
Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "contato abaixo do número do chamado"`

**C69** - [x] Medidas do ícone na casca:
- com ícone, a 1440 px, a `img` do ícone na barra recolhida mede 32×32 px (1 px);
- a 390 px, a do topo mede 24×24 px, com `right` ≤ `left` do título da tela e centro vertical a no máximo 2 px do centro do título;
- sem ícone, a 390 px, as iniciais em `bg-primary` (24×24 px) ocupam a mesma posição antes do título (Screens: Casca autenticada; AC 33)

Proof: `cd web && npx playwright test e2e/aparencia.spec.ts -g "ícone de 32 e 24 px antes do título"`

**C70** - [x] Na tela Aparência, para cada um dos 4 tipos (`logo`, `icone`, `login`, `assistente`), table-driven:
- com versão, a seção mostra a miniatura com `src` `/api/instituicoes/{slug}/imagens/{tipo}?v={versao}`, o botão "Enviar imagem" e o botão "Remover";
- "Enviar imagem" faz o `POST` multipart para o tipo;
- "Remover" abre o `Confirmar` e faz o `DELETE` do tipo;
- sem versão, não há miniatura nem "Remover" (Screens: Aparência; AC 15, AC 21)

Proof: `cd web && npx vitest run src/administracao/aparencia.test.tsx -t "as 4 imagens com miniatura, enviar e remover"`

**C71** - [x] Sem logo, as iniciais da prévia da tela Aparência são iguais às do login para o mesmo nome, em 2 nomes: "Centro Universitário de Várzea Grande" e "Faculdade Demo". As duas telas usam a mesma função `iniciais` (AC 24)
Proof: `cd web && npx vitest run src/administracao/aparencia.test.tsx -t "iniciais da prévia iguais às do login"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/instituicoes/{slug}` statuses (2) | 200 C30 · 404 C30 | - |
| `GET /api/instituicoes/{slug}/imagens/{tipo}` statuses (3) | 200 C31 · 404 C32 · 503 C32 | - |
| `GET /api/instituicoes/{slug}/manifest.webmanifest` statuses (2) | 200 C54 · 404 C55 | - |
| `GET /api/admin/aparencia` statuses (3) | 200 C11 · 401 C22 · 403 C22 | - |
| `PUT /api/admin/aparencia` statuses (4) | 200 C12 · 400 C13, C14 · 401 C22 · 403 C22 | - |
| `POST /api/admin/aparencia/imagens/{tipo}` statuses (8) | 200 C15 · 400 C18 · 401 C22 · 403 C22 · 404 C19 · 413 C17 · 415 C16 · 503 C20 | - |
| `DELETE /api/admin/aparencia/imagens/{tipo}` statuses (4) | 204 C21 · 401 C22 · 403 C22 · 404 C19, C21 | - |
| tipos de imagem (4) | `logo` C15, C16, C17 · `icone` C16, C17, C18 · `login` C16, C17 · `assistente` C16, C17 | - |
| limites de texto e e-mail inválido (14) | C14, table-driven sobre os 13 nos dois lados da borda e o e-mail inválido | - |
| bordas da cor (6) | sem `#` C13 · 5 dígitos C13 · `#ffd700` C13 · `#777777` C13 · `#767676` aceito C13 · `#224fa7` aceito C13 | - |
| temas com cor (3) e sem cor (2) | Claro C33 · Escuro C33 · Preto C33 · sem cor Claro C33 · sem cor Escuro C33 | - |
| tokens derivados (4) | `--primary` C34 · `--sidebar-primary` C34 · `--primary-subtle` C34 · `--ring` C34 | - |
| lugares da marca (8) | `<title>` C37 · `theme-color` C37 · `icon` C36 · `apple-touch-icon` C36 · `manifest` C56 · logo no login C35 · logo na barra C35 · ícone recolhido e no topo C36 | - |
| estados do selo (5) | `ABERTO` C3 · `EM_ATENDIMENTO` C3 · `AGUARDANDO_ALUNO` C3 · `RESOLVIDO` C3 · `FECHADO` C3 | - |
| componentes com 44 px (5) | `Button` (4 tamanhos) C2 · `Input` C2 · `NativeSelect` C2 · ações da `Tabela` C2 · "Ações" do chamado C8 | - |
| listas (6) | Fila · Minhas solicitações · Artigos · Documentos · Usuários · Cadastros: C7 (cartões), C10 (360 px), C48 (vazio), table-driven sobre as 6 | - |
| ilustrações (6) | `BoasVindas` C40, C50 · `Conversa` C41 · `CaixaVazia` C48 · `Documento` C48 · `Pessoas` C48 · `Grafico` C49 · as 6 C47 | - |
| campos de contato (3) | horário C45 · telefone C45 · e-mail C45 | - |
| e-mail (3 variantes) | com cor e logo C52 · sem cor nem logo C52 · MinIO fora C53 | - |
| one-way doors do `Landing` (11) | 1 C12, C59 · 2 C15, C59 · 3 C12, C22 · 4 C31 · 5 C54, C56 · 6 C51, C52 · 7 C23, C28 · 8 C13, C27, C33 · 9 C47 · 10 C14 · 11 C21 | - |
| startup config: aparência aplicada (2 lugares) | telas com `slug` antes do login (Acesso) C35, C37 · casca autenticada C35, C36 | - |

- Claims que nomeiam status, rota ou forma de resposta: C11 a C22, C30 a C32, C51 a C55. Cada um tem uma prova
  que cruza a fronteira HTTP (ou o Mailpit, para o e-mail)
- Os claims de arranjo e de medida (C1, C2, C5 a C10, C28, C33, C35, C38, C50) são provados no Chromium com
  `boundingBox()`/`getComputedStyle`; o jsdom não mede layout
- Nenhum check afirma mais que o caso que a sua prova exercita

## Swept

- validation: C13 (cor e contraste), C14 (13 limites e e-mail), C16 a C18 (tipo, tamanho e forma da imagem), C19 (tipo desconhecido)
- failure modes: C20 (o envio da imagem falha sem mudar a linha), C26 (o formulário fica)
- idempotency: C15 (reenviar troca a versão, sem segunda linha, por causa do índice único da door 2), C21 (o segundo `DELETE` dá `404`)
- authorization: C22 (403/401 nas 4 rotas de admin e isolamento entre instituições), C23 (link só para admin), C32 e C55 (instituição inativa); existing - o grupo `/admin` com o filtro de papel
- concurrency: n/a - dois admins salvando ao mesmo tempo: vale o último `PUT` (last write wins), como nos Cadastros de hoje; dois envios da mesma imagem disputam o índice único, e o perdedor recebe o erro do banco, registrado no `## Handoff` se acontecer no teste
- data lifecycle: C21 (remover deixa o objeto no bucket versionado), C15 (o objeto antigo fica); existing - o bucket versionado sem exclusão (AD-021)
- dependency failure: C20, C32 (MinIO ao gravar e ao servir), C53 (MinIO ao montar o e-mail)
- state transitions: n/a - a aparência não tem estados; cada campo é definido ou padrão (C12)
- observability: n/a - nenhuma rota nova tem decisão que precise de log além do que `Problemas` e o log de requisição já registram; a falha de e-mail continua no log do `Agendador` (existing)

## Handoff

Tamanho: bytes dos arquivos que cada lote lê e edita (`wc -c` em `HEAD` em 04/11/2026), divididos por 4, mais o
código e os testes novos.
- API: `VerInstituicao.cs`, `Instituicao.cs`, `OneDb.cs`, `Email.cs`, `Agendador.cs`, `AdminRotas.cs`,
  `RetratoTests.cs`, `sucessos.txt`, `ArquiteturaTests.cs` e `EmailTests.cs` somam 162 KB (~41k), mais ~25k novos.
- Web S1 e S2: `ui/alert`, `button`, `input`, `native-select`, `Tabela`, `Chamados`, `ChamadoDetalhe`,
  `Indicadores` e `Cadastros` somam 49 KB (~12k), mais `arranjo.spec.ts` e `test/util.tsx` (96 KB, ~24k) e ~15k novos.
- Web S3 a S6 e S8: `Acesso`, `App`, `Autenticado`, `Assistente`, `sessao` e `simulada` somam 54 KB (~13k), mais
  ~45k novos (tela Aparência, ilustrações, testes).

Estimativa:
- Um construtor só: ~41k + 25k + 12k + 24k + 15k + 13k + 45k ≈ 175k, acima do orçamento de 150k.
- Corte proposto, onde a superfície muda, em 3 lotes sequenciais, cada um só depois do anterior verde:
  1. API: S3, S4, S7 e S8 do lado do servidor, C11 a C22, C30 a C32, C51 a C55, C57 a C60 (~66k).
  2. Web S1 e S2: C1 a C10 (~51k).
  3. Web S3 a S6 e S8: C23 a C29, C33 a C50, C56, C61 a C64 (~58k, lendo o diff dos lotes 1 e 2).
- Mecanismo: handoff em 3 lotes sequenciais, escolha do usuário em 04/11 ("3 lotes em sequência")

### Lote 1 (API) - valores de `<base>` (`5b355d9`) que a lista fechada deixou subir

| Asserção | Base | Agora |
| --- | --- | --- |
| `RetratoTests.Tabela_de_rotas_igual_a_da_base`: total de rotas / com 1 método / com autorização | 67 / 64 / 65 | 73 / 70 / 71 |
| `RetratoTests.Tabela_de_rotas_igual_a_da_base`: rotas anônimas | 5 | 7 (as 2 novas ao fim) |
| `RetratoTests.Admin_403_com_detail_nas_29_rotas` (nome mantido: outros `checks.md` o citam) | 29 | 33 |
| `AdminTests.Sem_papel_admin_403` (não está na lista fechada; a mesma conta de rotas `/admin`) | 29 | 33 |
| `ArquiteturaTests`: mensagens e handlers (4 asserções) | 62 | 68 |
| `ArquiteturaTests`: fatia `Instituicoes` | 0 | 6 |
| `ArquiteturaTests`: `Map*` | 65 | 71 |
| `ArquiteturaTests`: entidades / `Entrada` aninhadas e rotas com corpo JSON / mensagens com corpo JSON | 27 / 30 / 55 | 28 / 31 / 59 |
| `MediatorTests`: mensagens / `(ações, outras)` | 62 / (9, 53) | 68 / (9, 59) |
| `SessaoTests`: rotas privadas | 60 | 64 |

Edições em asserções existentes (todas só acrescentam o item novo ou sobem a mesma conta):
- `sucessos.txt`: a linha de `GET /api/instituicoes/{slug}` ganhou os campos novos com `null` e listas vazias (AC 28).
- `rotas.txt`: 6 linhas novas, nenhuma some. O `Surface` tem 7 linhas, mas a de `GET /api/instituicoes/{slug}` já existe: as rotas novas são 6 (2 anônimas, 4 de admin), e `C58` diz "7 linhas / 3 anônimas" por contar a existente.
- `ArquiteturaTests`: `TabelasDaInstituicao` ganhou `imagem_instituicao`; `EntidadesPorPasta[""]` ganhou `ImagemInstituicao`; `AsEntradas` ganhou `AlterarAparencia`; `SemCorpoJson` ganhou `RemoverImagemInstituicao` e `BaixarImagemInstituicao`; `ComRespostaAninhada` ganhou `VerAparencia`, `AlterarAparencia`, `EnviarImagemInstituicao` e `ManifestoInstituicao`; `ReferenciasEntreFatias` ganhou `(Acesso, Instituicoes)` e `(Administracao, Instituicoes)`; `Baixar_so_com_chave_de_coluna_do_banco` ganhou `Email.cs` e `Instituicoes/BaixarImagemInstituicao.cs`.
- `SessaoTests.Publicas` e a lista de anônimas de `RetratoTests` ganharam as 2 rotas anônimas novas.
- `.specs/GLOSSARIO.md`: `Aparência` e `ImagemInstituicao`.

- **Boundary:** lote 1 (API) fechado em `06d68a8`: C11 a C22, C30 a C32, C51 a C55 e C57 a C60 marcados `[x]`; `dotnet test api.Tests` com 517 testes verdes; `dotnet build api` e `has-pending-model-changes` limpos. Falta o web (lotes 2 e 3).
- **Boundary:** cauda do lote 1 (API) em `850b615`: door 11 (`removida_em`, migration `ImagemRemovida`), C21, C51 e C58 marcados `[x]`; `dotnet test api.Tests` com 518 testes verdes; `dotnet build api` e `has-pending-model-changes` limpos. `Tabelas_da_aparencia` ganhou a coluna `removida_em`.
- **Settled mid-build:** nada com o usuário. Decisões do construtor: o `Landing` ganhou a linha 10 (nomes dos campos nos `400`, pontuados por caminho JSON); a aparência vai em `AparenciaDados`, que a `Resposta` de `VerInstituicao`, `VerAparencia` e `AlterarAparencia` herdam; o e-mail não guarda HTML, `Email.Enviar(db, instituicao, ...)` monta no envio e espera o logo até 3 s; no Mailpit a parte `text/plain` chega com CRLF (SMTP), então `EmailMarcaTests` compara o `Corpo` depois de trocar `\r\n` por `\n`; texto ou lista vazios no `PUT` viram `null` (padrão).
- **Abandoned:** nada. Em aberto para quem verifica: (1) [resolvido pela door 11 em `850b615`] `DELETE` e novo envio do mesmo tipo recomeçam a `versao` em 1, e a URL `?v=1` do logo antigo está `immutable` no cache do navegador (door 4); o plano manda apagar a linha, então a versão não sobrevive. (2) `C58` diz 7 linhas e 3 anônimas, mas são 6 novas (2 anônimas); a conta bate com o `Surface` sem a linha já existente. (3) `AdminTests.Sem_papel_admin_403` também conta as rotas `/admin` e subiu de 29 para 33, fora dos 3 arquivos que a lista fechada nomeia.

### Lote 2 (web S1 e S2) - edições em asserções existentes (lista fechada, item 5)

Vitest:
- `indicadores/indicadores.test.tsx`, `rótulo do gráfico`: `rotulo()` (corte em 17 caracteres + "…") virou `linhasDoRotulo()` (até 2 linhas, sem reticências), com os valores de C5 (AC 5).
- `chamados/listas.test.tsx` `lista carregando mostra o Spinner e nada mais` (agora `... 3 esqueletos ...`), `chamados/textos.test.tsx` (Fila e Minhas solicitações carregando), `administracao/usuarios.test.tsx` `carregando mostra o Spinner` (agora `... 3 esqueletos`), `administracao/textos.test.tsx` (Usuários carregando) e `administracao/cadastros.test.tsx` `o editor abre antes de as listas chegarem`: o `status "Carregando"` da lista virou os 3 `[data-slot="skeleton"]` (AC 4).
- `test/estrutura.test.ts`: `tabela.test.tsx` entra em `Raiz` (o arquivo é nomeado por este `checks.md` na raiz de `src/`) e o laço de testes de tela o ignora. Acrescenta uma exceção nomeada, não afrouxa nenhuma outra (AC 4).

Playwright (`e2e/arranjo.spec.ts`; a 360 px as listas são cartões e não há `<table>`, os botões têm 44 px e as ações do chamado estão no `Sheet`):
- `rótulo do gráfico numa linha` (agora `... em até 2 linhas sem reticências`): 2 `tspan`, texto sem "…" (AC 5).
- `arranjo listas de chamados`, `arranjo Artigos e Documentos`, `arranjo administração`, `Cadastros: detalhe pequeno embaixo do nome`: `row`/`table` viram `listitem`/`list` (AC 6, AC 7).
- `detalhe em uma coluna a 360 px` e `Detalhe: cartão da equipe antes da conversa e ações que quebram em linhas`: o cartão de ações sai da ordem a 360 px, e os botões são medidos no `Sheet` (AC 8).
- `botões pequenos em linha em Artigos, Documentos e Usuários`: `row` vira `listitem`, o "⋮" tem 44 px e não mais ≤ 36 (AC 2, AC 7).
- `arranjo Assistente`: a 360 px "Falar com atendente" e "Encerrar" quebram em 2 linhas com o enviar de 44 px; a asserção passa a pedir `Encerrar` abaixo de `Falar`, alinhado ao enviar (AC 2).
- `Matrículas: ...`: `cell` vira `getByText` do motivo e some o `columnheader` (sem `<table>` a 360 px; AC 1, AC 7).
- `restantes que nenhuma linha da lista fechada nomeia, mas que medem o arranjo que o plano muda` (o Verifier decide): `compositor visível com a conversa maior que a tela` (mede o compositor inteiro em vez do botão "Falar", AC 2); `colunas largas somem no estreito` (cabeçalho `thead` medido só a 1280 px, linha de detalhe dentro de `listitem`, AC 7); `lista vazia centralizada` (célula `[data-slot=table-cell]`, cartão de 96 + 26 px, AC 7); `cabeçalho: borda, título numa linha e botões de 36 px` (44 px abaixo de 768 px, AC 2); `valores de tipo e bordas` (o rodapé do destaque não é mais cortado e cabe em até 2 linhas, AC 5); `texto das linhas de 14 px` (`[data-slot=table-cell]`, AC 7).
- `e2e/simulada.ts` (não é asserção): `chamadoSimulado(estado)` exportado; com `extremos`, a categoria de Indicadores tem 40 caracteres; a espera de Matrículas usa `getByText`.

- **Boundary:** lote 2 (web S1 e S2) fechado em `aaf0b9f`: C1 a C10 marcados `[x]`; `npx vitest run` com 296 testes verdes (36 arquivos); Playwright `arranjo.spec.ts` + `celular.spec.ts` com 79 verdes (71 + 8) contra `vite preview` do build; `npm --prefix web run build`, `crapper` (limite 9.99, maior nota 9.8) e `dryer` limpos. Falta o lote 3 (web S3 a S6 e S8).
- **Settled mid-build:** nada com o usuário. Decisões do construtor: abaixo de 768 px a `Tabela` não renderiza `<table>` (`ui/table.tsx` lê o contexto `Cartoes` e emite `div` com `role="listitem"` dentro de um `div role="list"`), porque o Playwright conta uma `<table display:contents>` como visível; o layout do cartão está em `index.css` sob `[data-cartoes]`, e as células de selo e de ações levam `data-celula`. `Tabela` ganhou a prop `erro` (sem ela, lista sem dados mostra os 3 esqueletos); `Situacao.tsx` saiu. Selo do chamado: `SeloDoChamado` em `chamados/Chamados.tsx` (também no cabeçalho do detalhe); verde é `bg-success/15 text-success`. Detalhe do chamado: o cartão de ações e o `Sheet` nunca coexistem no DOM (`useConsulta` em `ui/use-mobile.ts`), para não repetir os `id` dos formulários; "Encaminhar" e "Cancelar" fecham o `Sheet` antes de abrir o diálogo. O botão `xs` não existe em nenhuma tela, então C2 mede uma `<button>` com a classe de `buttonVariants({ size: 'xs' })`. As provas de arranjo rodam contra `vite preview` (porta 5199, `E2E_URL`): não há `webServer` no `playwright.config.ts`, e o service worker do build é necessário para `cabeçalho: borda, ...`.
- **Abandoned:** nada. Em aberto para quem verifica: (1) as 6 asserções de `arranjo.spec.ts` acima, fora dos nomes da lista fechada. (2) `Cabecalho` ganhou a prop `linha` (só Cadastros a usa). (3) `Matriculas` mostra os erros por linha como cartões a 360 px, sem o cabeçalho "Linha"/"Motivo".

### Lote 3 (web S3 a S6 e S8) - edições em asserções existentes (lista fechada, item 5, e o que ela não nomeia)

Vitest (cada uma só acrescenta o item novo ou troca o texto que o AC troca; nenhuma asserção saiu):
- `acesso/acesso.test.tsx`: `link ativo da barra lateral` (7 para 8 links), `cabeçalho num único nav por papel`, `grupos por assunto na barra e na gaveta`, `grupos por papel`, os ícones do menu e `título do cabeçalho por rota` ganham "Aparência" (AC 23; não estão nomeadas na lista, que só fala de Playwright para a barra). `primeiro acesso mostra a mensagem da API no lugar do formulário` e `definir senha envia o token do link e mostra Senha criada` passam a conferir só as chamadas `POST` (`chamadas.filter(...)`): as telas leem `GET /api/instituicoes/{slug}` (AC 36, AC 53) e a lista de corpos ganhou um `undefined` (não nomeadas). `painel de entrada sem foco e sem ícones`: de 0 `svg` para exatamente a ilustração `boas-vindas` (AC 47; não nomeada).
- `acesso/textos.test.tsx`: "Aparência" na lista do cabeçalho; a raiz ganha a frase de hoje (AC 37); "One" sai das listas de Login, Primeiro acesso e Criar senha (AC 32).
- Texto de vazio (AC 45): `administracao/admin.test.tsx` e `usuarios.test.tsx` (Usuários: "Cadastre a equipe ou importe as matrículas."), `administracao/textos.test.tsx` (Usuários e "Nada cadastrado" em Cadastros, que mantém "Nenhum item cadastrado."), `chamados/listas.test.tsx` e `textos.test.tsx` ("Fila em dia", "Nenhuma solicitação", "Falar com o assistente"), `conhecimento/artigos.test.tsx`, `documentos.test.tsx`, `textos.test.tsx` e `edicao.test.tsx` (a asserção de ausência passou para o texto novo, para continuar a valer). `artigos.test.tsx` clica em "Novo" por nome exato: o vazio ganhou o botão "Novo artigo".
- Indicadores (AC 46): `indicadores/indicadores.test.tsx` e `textos.test.tsx` trocam "Sem dados no período" por "Sem atendimentos neste período." (não nomeadas).
- `assistente/textos.test.tsx`: "Olá! Eu sou Assistente." e as 2 perguntas de base entram na lista de literais (AC 38, AC 39).
- `test/estrutura.test.ts`: `aparencia.test.tsx` na lista da raiz (o arquivo é nomeado por este `checks.md`, como `tabela.test.tsx`) e `ilustracoes` como segunda pasta sem tela, ao lado de `ui` (AC 44). `test/interface.test.ts`: `bloco()` passa a ler `var(--marca, base)` como `base`; os valores de base que as asserções comparam não mudam (AC 31). `test/util.tsx`: helper `instituicao()`.

Playwright (`e2e/arranjo.spec.ts`; medido contra `vite preview` e contra a imagem na 8085):
- `telas de acesso centralizadas /` (AC 37): o cartão sai, e a caixa medida é o bloco de ilustração, "One" e textos. `linha da marca na entrada` (AC 32): no lugar da palavra "One", o quadrado de 40 px com as iniciais "CG" em `bg-primary`, e abaixo de 1024 px abaixo da faixa de 128 px (não nomeada). `posição do conteúdo do painel`: o bloco de texto é achado por `h2/..` (o painel agora tem a ilustração ao lado; não nomeada). `lista vazia centralizada` (AC 45): a altura de 96 px do cartão sai, e o título e a ilustração ficam no centro da célula. `alertas de Indicadores` (AC 46): sem dados, o bloco "Sem atendimentos neste período." no lugar do alerta (não nomeada). `e2e/simulada.ts` ganhou a aparência (`semAparencia`, `comAparencia`), as rotas de imagem e `/api/admin/aparencia`, e a tela Aparência entrou em `Telas`.
- `playwright.config.ts`: `workers: 1`, porque `anexos.spec.ts` e `aparencia-real.spec.ts` dividem o limitador de login da API (5 por minuto por IP, L-066) e rodando em paralelo tomavam 429.

- **Boundary:** lote 3 (web S3 a S6 e S8) fechado em `e5fc7c1` (tela, marca, ilustrações, Vitest) e `3e4f05b` (arranjo e e2e real), mais o commit deste handoff: C23 a C26, C28, C29, C33 a C50, C56 e C61 a C64 marcados `[x]`; **C27 fica aberto** (ver abaixo). Contagens em `HEAD`: `api.Tests` 518 verdes (`dotnet build api` e `has-pending-model-changes` limpos); Vitest 329 verdes (40 arquivos); `crapper` no limite 9.99 sai 0 (maior nota 9.8, `Sidebar`); `dryer` sem candidato com a lista de C62 mais `src/aparencia.tsx`; Playwright `arranjo` + `celular` + `aparencia` 84 verdes contra `vite preview`; e2e real inteiro 109 verdes contra a imagem de `3e4f05b` na porta 8085 (instituição `e2e`, banco `one_aparencia_e2e`, bucket `one-aparencia-e2e`; contêiner, imagem, banco, bucket e worktree removidos).
- **Settled mid-build:** nada com o usuário. Decisões do construtor: (1) **C27 não fecha**: o check pede `#224fa7` → "7,47:1", mas a regra do servidor (`ContrasteDaCor.cs`, WCAG 2.x, a que o próprio C27 manda usar) dá 7,65; `#767676` 4,54 e `#ffd700` 1,40 batem. O teste e a tela usam 7,65 (`aparencia.test.tsx` e `administracao/aparencia.test.tsx` comentam o porquê); falta alguém corrigir o valor do check. (2) `AplicaAparencia` fica ao lado de `Routes` e lê o `slug` por `useMatch`, e `iniciais` mudou para `aparencia.tsx` (reexportada por `Autenticado.tsx`). (3) Os tokens derivam por variáveis auxiliares (`--marca-sutil`, `--marca-clara`, `--marca-sutil-escuro`, `--marca-sutil-preto`), todas `color-mix(... var(--marca) ...)`: sem `--marca` ficam inválidas e `var(--aux, base)` cai no valor de hoje; `--primary`, `--sidebar-primary` e `--ring` do `:root` são exatamente `var(--marca, base)`. (4) Na tela Aparência as imagens são escolhidas localmente (miniatura `blob:`) e só sobem no "Salvar" (`PUT` e depois um `POST` por imagem); "Remover" de uma imagem escolhida e ainda não salva só a descarta, e de uma salva abre o `Confirmar` e faz o `DELETE`. (5) O login tem o logo duas vezes no DOM (faixa e coluna), cada uma visível em uma faixa de largura; a faixa escura sobre a imagem do painel é um degradê (`bg-linear-to-t`), para o bloco de texto continuar filho direto do painel. (6) As 6 ilustrações são dados (lista de formas por nome) desenhados por um `Desenho` só, porque o `dryer` achava duplicata (nota 0.81) entre os 6 JSX. (7) Nenhuma linha de `api/` mudou.
- **Abandoned:** nada. Em aberto para quem verifica: (1) C27 (valor 7,47 do check contra 7,65 do servidor). (2) As edições acima que a lista fechada não nomeia (`acesso.test.tsx` x3 grupos, `primeiro acesso`/`definir senha` por `POST`, `painel de entrada sem foco e sem ícones`, Indicadores, `linha da marca na entrada`, `posição do conteúdo do painel`, `alertas de Indicadores`). (3) `playwright.config.ts` com `workers: 1`.
- **Boundary (rodada 1):** C7 sem `if` na medida do selo (conta 1 selo por cartão antes); C2 mede os 8 tamanhos (real: default, icon, sm, icon-sm, icon-xs; `lg` e `xs` num botão de teste); C65 a C69 em `e2e/aparencia.spec.ts`, C70 e C71 em `administracao/aparencia.test.tsx`. Código: `PreviaAparencia` usa `Sigla` (a mesma `iniciais` do login, C71); o topo do celular mostra as iniciais `size-6` quando não há ícone (C69).
- **Settled mid-build (rodada 1):** nada com o usuário. `ui/button.tsx` já tinha 44 px abaixo de 768 nos 8 tamanhos, então não mudou. O balão do assistente é achado por `.is-assistant` e a foto por `preceding-sibling::img`. C14 e C51 seguem sem marca, para o orquestrador.
- **Abandoned (rodada 1):** nada.
