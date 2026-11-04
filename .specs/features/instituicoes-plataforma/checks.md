# Instituições pela tela - checks

Profile: ui
Plan: `.specs/features/instituicoes-plataforma/plan.md`

38 checks em 6 slices · 5 one-way doors · 0 perguntas abertas

**Como as provas rodam.** Na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é o commit que congela `plan.md`
e este `checks.md`, gravado no `## Handoff`.

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `OneFactory`; o comando roda por `InstituicaoComando.Executar` com `StringWriter`, como em `InstituicaoComandoTests` | `docker compose up -d postgres mailpit minio`; uma só execução de `dotnet test` por vez |
| `web/` unidade | Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"` | `npm --prefix web ci` |
| `web/` arranjo | Playwright com a API simulada (`e2e/simulada.ts`, que passa a responder `/api/plataforma/instituicoes*` e um usuário com `OPERADOR`), `boundingBox()`, 1 px de tolerância | `npm --prefix web run build`, `npx vite preview --port 5199` em `web/`, `E2E_URL=http://localhost:5199` |
| `web/` e2e real | Playwright contra uma imagem própria na porta 8086, no padrão de `aparencia-instituicao` (limite de 5 logins por minuto: L-066) | ver `## Handoff` |
| barreiras | `dotnet build api` (CA1502); `crapper` e `dryer` em `web/` (AD-018); mutação suspensa (AD-025) | `npm --prefix web run coverage` |

O nome em cada `Proof:` é o contrato (L-022). Um filtro que não seleciona teste nenhum sai com 0 (L-002): confira
que cada um roda pelo menos 1 teste. Classes novas em `api.Tests`: `PlataformaTests` e `OperadorComandoTests`.
Arquivos novos em `web/`: `src/administracao/instituicoes.test.tsx`, `e2e/instituicoes.spec.ts` e
`e2e/instituicoes-real.spec.ts`.

**Asserções existentes que podem mudar** (lista fechada, cada edição listada no `## Handoff` com o AC):
1. `api.Tests/Retratos/rotas.txt` e os números de `RetratoTests.Tabela_de_rotas_igual_a_da_base` ganham as 6
   rotas do `Surface` (`autorizacao=True`).
2. As asserções estruturais que contam ou listam casos de uso, mensagens, handlers, `Map*`, arquivos de fatia,
   referências entre fatias, rotas com corpo JSON e rotas privadas (`ArquiteturaTests`, `MediatorTests`,
   `SessaoTests`) só podem ganhar o item novo desta feature ou subir na mesma conta (L-067).
3. A regra de `ArquiteturaTests` que limita onde `InstituicaoAtual` é atribuído, se existir, ganha só os
   arquivos de `/api/plataforma` (door 3).
4. Em `web/`, as contagens e os grupos do menu (`acesso.test.tsx` e os testes de arranjo da barra) ganham o
   grupo "Plataforma" só para `OPERADOR` (AC 5).
5. `.specs/GLOSSARIO.md` ganha `OPERADOR`.

## Checks

### S1 - Operador e acesso à área da plataforma (P1)

**C1** - [x] `instituicao operador --slug univag --cpf <cpf de um usuário ativo>` sai com 0, imprime exatamente "Operador {nome} adicionado." e grava 1 linha `usuario_papel` com `OPERADOR` para esse usuário. Rodar de novo sai 0 sem segunda linha (AC 1, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OperadorComandoTests.Adicionar_operador_sai_0"`

**C2** - [x] O mesmo comando com `--remover` sai 0, imprime "Operador {nome} removido." e apaga a linha `OPERADOR`, mantendo os outros papéis do usuário (AC 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OperadorComandoTests.Remover_operador_sai_0"`

**C3** - [x] O comando sai com 1, escreve o erro em `erro` e não grava nada em 3 casos: slug inexistente, CPF sem usuário na instituição e usuário inativo (AC 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OperadorComandoTests.Operador_invalido_sai_1"`

**C4** - [x] As 6 rotas de `/api/plataforma` respondem `403` com `detail` "Só operadores da plataforma podem usar esta área." para `ADMINISTRADOR`, `ATENDENTE` e `ALUNO` (18 pedidos), e `401` sem sessão (6 pedidos) (AC 4, door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Rotas_403_sem_operador_e_401_sem_sessao"`

**C5** - [x] O grupo "Plataforma", com o link "Instituições" (ícone `Building2`) para `/{slug}/instituicoes`, aparece por último na barra lateral e na gaveta para um usuário com `OPERADOR` e `ADMINISTRADOR`. Não aparece para `ADMINISTRADOR`, `ATENDENTE` nem `ALUNO` sem `OPERADOR` (AC 5, door 4)
Proof: `cd web && npx vitest run src/administracao/instituicoes.test.tsx -t "grupo Plataforma só para operador"`

**C6** - [x] Um admin salva pela tela Usuários (`PUT` da rota de usuário de `<base>`) um usuário com `ADMINISTRADOR` e `OPERADOR`, enviando `papeis: ["ADMINISTRADOR"]`: a resposta é `200`, e o usuário continua com `OPERADOR` no banco. Enviando `["ATENDENTE"]` com setor, ele fica com `ATENDENTE` e `OPERADOR` (AC 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Editar_usuario_preserva_operador"`

**C7** - [x] Criar ou editar usuário com `papeis: ["OPERADOR"]` ou `["ADMINISTRADOR","OPERADOR"]` responde `400` com `errors.papeis` "Escolha ao menos um papel." e não grava (AC 7, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Tela_usuarios_nao_da_operador"`

### S2 - Listar e criar (P1)

**C8** - [x] Com 3 instituições (B ativa, A ativa, C inativa, além da do operador), `GET /api/plataforma/instituicoes` responde `200`:
- uma lista com todas, cada item com exatamente `slug`, `nome`, `fuso`, `ativa`, `criadaEm` e `administradores`;
- a ordem: as ativas por nome (A, B e a do operador, na ordem alfabética), depois C;
- `administradores` conta só os usuários ativos com `ADMINISTRADOR`: 2 ativos e 1 inativo dão 2 (AC 8)

Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Listar_todas_ativas_primeiro"`

**C9** - [x] `POST /api/plataforma/instituicoes` com `slug` "demo", `nome` "Faculdade Demo", `fuso` "America/Cuiaba" e um admin válido responde `201`, com `Location` `/api/plataforma/instituicoes/demo` e o corpo da instituição (`ativa` true, `administradores` 1). No banco, a instituição "demo" tem:
- 1 setor "Triagem" com `triagem` true;
- 1 categoria "Não classificado" com `padrao` true;
- 1 usuário com `ADMINISTRADOR`, o CPF normalizado, o nome e o e-mail;
- 1 token de primeiro acesso para ele (AC 9)

Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Criar_instituicao_201"`

**C10** - [x] Depois de C9, existe 1 `EmailSaida` com `instituicao_id` da "demo", `Destinatario` igual ao e-mail do admin, `Assunto` "[Faculdade Demo] Crie sua senha" e `Corpo` contendo o link `.../demo/definir-senha?token=` de um token válido do admin. A linha é gravada na mesma transação: com o commit simulado falhando (`f.Commit`), nada da instituição nem o e-mail fica (AC 10) Com a gravação da `EmailSaida` falhando (o `SaveChanges` que grava o e-mail lança), nem a instituição nem o administrador ficam no banco (decisão delegada pelo usuário em 04/11, depois da rodada 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Criar_grava_o_email_na_mesma_transacao"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Falha_ao_gravar_o_email_nao_cria_a_instituicao"`

**C11** - [x] O `POST` responde `400` no campo e não grava nada em 7 casos: `slug` "ab" (curto), `slug` "Demo" (maiúscula), `nome` vazio, `fuso` "Brasil/Cuiaba", `admin.cpf` "111.111.111-11", `admin.nome` vazio e `admin.email` "x". Os campos são `slug`, `nome`, `fuso`, `admin.cpf`, `admin.nome` e `admin.email` (AC 11) A recusa do CPF de dígitos iguais vale só para a rota: `instituicao criar --admin-cpf 111.111.111-11` continua saindo com 0, como em `<base>` (AD-033: o comando mantém a saída) (decisão delegada pelo usuário em 04/11, depois da rodada 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Criar_invalido_400"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OperadorComandoTests.Cli_aceita_cpf_de_digitos_iguais_como_na_base"`

**C12** - [x] Um `POST` com o `slug` de uma instituição que já existe (ativa ou inativa) responde `409` com `detail` "Esse endereço já está em uso." e não grava nada (AC 12)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Slug_repetido_409"`

**C13** - [x] `InstituicaoComandoTests` passa inteiro sem edição de asserção (AC 13, AC 20)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests"`

**C14** - [x] Na tela Instituições, a lista simulada com 2 instituições mostra:
- por linha, o nome, o endereço `/{slug}` em texto pequeno, o selo "Ativa" ou "Desativada", o número de administradores e a data de criação;
- o menu de ações com "Importar carga", "Reenviar acesso do admin" e "Desativar" na ativa, e "Reativar" no lugar de "Desativar" na inativa;
- o botão "Nova instituição" no cabeçalho (AC 14)

Proof: `cd web && npx vitest run src/administracao/instituicoes.test.tsx -t "lista com selo, administradores e ações"`

**C15** - [x] A 1440 px, a tela tem um só título "Instituições" (o `h1` da casca, sem título repetido na área de conteúdo), e "Nova instituição" fica no topo da área de conteúdo, alinhado à direita (`right` a no máximo 1 px do `right` da área). A 390 px, as linhas viram cartões (`role="listitem"`), sem `<table>` visível, e `scrollWidth` ≤ 390 (Screens) (decisão delegada pelo usuário em 04/11, depois da rodada 1)
Proof: `cd web && npx playwright test e2e/instituicoes.spec.ts -g "arranjo Instituições"`

**C16** - [x] Digitar "Centro Universitário São José & Cia" no Nome preenche o Endereço com "centro-universitario-sao-jose-cia". Editar o Endereço para "csj" e depois mudar o Nome deixa "csj". O fuso começa em `America/Sao_Paulo`, e a lista de fusos tem só fusos `America/*` do Brasil (AC 15)
Proof: `cd web && npx vitest run src/administracao/instituicoes.test.tsx -t "endereço segue o nome até ser editado"`

**C17** - [x] Criar com sucesso faz `POST /api/plataforma/instituicoes` com `{slug, nome, fuso, admin {cpf, nome, email}}`. Depois, o `Dialog` fecha, o alerta mostra "Instituição Faculdade Demo criada. Enviamos o link de primeiro acesso para admin@demo.edu.br." com um link para `/demo`, e a lista é buscada de novo (AC 16)
Proof: `cd web && npx vitest run src/administracao/instituicoes.test.tsx -t "criar fecha, avisa e recarrega a lista"`

**C18** - [x] Um `400` com `errors["admin.email"]` mostra o texto abaixo do campo E-mail do administrador. Um `409` mostra "Esse endereço já está em uso." abaixo do Endereço. Nos dois casos, os 6 campos mantêm o que foi digitado (AC 17)
Proof: `cd web && npx vitest run src/administracao/instituicoes.test.tsx -t "erro da API no campo sem perder o formulário"`

### S3 - Carga inicial pela tela (P1)

**C19** - [x] `POST .../demo/carga` com o JSON de exemplo de `InstituicaoComandoTests.Carga_valida_sai_0` responde `200` com exatamente `setores`, `cursos`, `categorias`, `regras` e `artigos`, iguais às quantidades que o comando imprime para o mesmo arquivo. Os registros ficam na "demo" e não na instituição do operador (AC 18, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Carga_pela_rota_grava_na_instituicao_do_slug"`

**C20** - [x] Respostas da rota de carga, sem gravar nada:
- `400` com `errors` listando cada erro para o arquivo "{" (JSON inválido) e para um arquivo com uma regra de categoria inexistente;
- `413` para um arquivo de 2 MiB + 1 byte;
- `404` "Instituição não encontrada." para um slug inexistente (AC 19)

Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Carga_invalida_400_413_404"`

**C21** - [x] Na tela, "Importar carga" abre um `Dialog` com `CampoArquivo` que aceita `.json` e faz `POST` multipart com o campo `arquivo`. Com sucesso, mostra "Importados: 2 setores, 1 cursos, 3 categorias, 2 regras, 5 artigos." com os números da resposta. Com `400`, mostra cada erro da lista numa linha (AC 21)
Proof: `cd web && npx vitest run src/administracao/instituicoes.test.tsx -t "importar carga mostra o resumo ou os erros"`

### S4 - Desativar, reativar e reenviar acesso (P1)

**C22** - [x] `POST .../demo/desativar` responde `200` com `{slug:"demo", ativa:false}`. Depois:
- `GET /api/instituicoes/demo` responde `404`;
- `POST /api/auth/login` na "demo" responde como instituição inexistente, igual a `<base>`;
- o cliente do admin da "demo", logado antes, recebe `401` em `GET /api/auth/me` (AC 22)

- `POST /api/auth/primeiro-acesso` com o CPF do admin da "demo" não grava token nem `EmailSaida` (decisão delegada pelo usuário em 04/11, depois da rodada 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Desativar_bloqueia_login_e_sessao"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Desativar_bloqueia_primeiro_acesso"`

**C23** - [x] `desativar` com o slug da instituição do próprio operador responde `409` com `detail` "Você não pode desativar a instituição em que está.", e `ativa` continua true (AC 23)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Nao_desativa_a_propria"`

**C24** - [x] `POST .../demo/reativar` depois de desativar responde `200` com `{slug:"demo", ativa:true}`, e o login do admin da "demo" volta a responder `200` (AC 24)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Reativar_volta_o_login"`

**C25** - [x] Com 2 administradores ativos e 1 inativo na "demo", `POST .../demo/reenviar-acesso` responde `202` com `{enviados:2}`, cria 2 tokens novos e 2 `EmailSaida` com o link, um para cada admin ativo, e nenhum para o inativo (AC 25)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Reenviar_acesso_para_admins_ativos"`

**C26** - [x] `reenviar-acesso` responde `409` sem gravar token nem e-mail em 2 casos:
- instituição sem admin ativo: "Esta instituição não tem administrador ativo para receber o acesso.";
- instituição desativada: "A instituição está desativada." (AC 26)

Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Reenviar_sem_admin_ou_desativada_409"`

**C27** - [x] `carga`, `desativar`, `reativar` e `reenviar-acesso` com o slug "nao-existe" respondem `404` com `detail` "Instituição não encontrada." (4 pedidos) (AC 27)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PlataformaTests.Slug_inexistente_404"`

**C28** - [x] No menu da linha, na tela:
- "Desativar" abre o `Confirmar` com "Desativar Faculdade Demo? Ninguém dessa instituição consegue entrar até você reativar."; confirmar faz o `POST .../desativar`, e a linha mostra o selo "Desativada";
- "Reativar" faz o `POST` direto e mostra "Instituição reativada.";
- "Reenviar acesso do admin" faz o `POST` direto e mostra "Enviamos o link para 2 administrador(es)." com o `enviados` da resposta (AC 28)

Proof: `cd web && npx vitest run src/administracao/instituicoes.test.tsx -t "desativar confirma, reativar e reenviar agem direto"`

### S5 - Arranjos de ## Screens sem check na rodada 1 (P1)

Acrescentados por decisão delegada pelo usuário em 04/11, depois da rodada 1 (L-070).

**C37** - [x] A 390 px, cada cartão da lista tem o nome e o selo de situação na primeira linha (mesmo `top`, 1 px; o selo à direita do nome) e o endereço `/{slug}` abaixo deles (Screens: Instituições < 768 px)
Proof: `cd web && npx playwright test e2e/instituicoes.spec.ts -g "cartão com nome e selo na 1ª linha e endereço abaixo"`

**C38** - [x] O `Dialog` "Nova instituição" mostra os campos nesta ordem de cima para baixo: Nome, Endereço, Fuso horário, e sob o título "Primeiro administrador": Nome, CPF, E-mail; o rodapé tem "Cancelar" à esquerda de "Criar"; o campo Endereço mostra o prefixo fixo "/" antes do texto (Screens: Nova instituição)
Proof: `cd web && npx playwright test e2e/instituicoes.spec.ts -g "diálogo Nova instituição com campos em ordem, Cancelar e prefixo"`

### S0 - Invariantes e barreiras (P1)

**C29** - [x] A suíte inteira da API passa em `HEAD`. As únicas edições em asserções existentes são as dos itens 1 a 3 e 5 da lista fechada (Surface)
Proof: `dotnet test api.Tests`

**C30** - [x] `rotas.txt` ganha exatamente as 6 linhas do `Surface`, todas `anonimo=False autorizacao=True limite=-`, e nenhuma linha some (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_igual_a_da_base"`

**C31** - [x] Nenhum arquivo de `api/` fora dos arquivos nomeados (os 3 casos de uso da plataforma que gravam em outra instituição, mais `BaixarImagemInstituicao.cs`, `ManifestoInstituicao.cs` e `InstituicaoComando.cs`, que já trocavam), `api/Sessao.cs`, `api/Acesso/*` e `api/Agendador.cs` atribui `InstituicaoAtual` além dos de `<base>`. `IgnoreQueryFilters` continua só no agendador e no comando (door 3) (decisão delegada pelo usuário em 04/11, depois da rodada 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando|FullyQualifiedName~PlataformaTests.InstituicaoAtual_so_onde_ja_era_e_na_plataforma"`

**C32** - [x] `dotnet build api` passa com a barreira CA1502 (AD-018)
Proof: `dotnet build api`

**C33** - [x] A suíte Vitest inteira e `npm --prefix web run build` passam. As edições em asserções existentes são só as do item 4 da lista fechada (AC 5)
Proof: `npm --prefix web test`
Proof: `npm --prefix web run build`

**C34** - [x] O `crapper` sobre `web/src` sai 0 no limite 9.99, e o `dryer` não acha candidato com nota 0.8 ou mais (AD-018)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao -s src/ilustracoes --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx src/sw.ts src/push.ts src/AvisosPush.tsx src/aparencia.tsx | grep -q "No duplicate candidates found"`

**C35** - [x] A suíte de arranjo (`arranjo.spec.ts`, `celular.spec.ts`, `aparencia.spec.ts`, `instituicoes.spec.ts`) passa inteira com a API simulada (Screens)
Proof: `cd web && npx playwright test e2e/arranjo.spec.ts e2e/celular.spec.ts e2e/aparencia.spec.ts e2e/instituicoes.spec.ts`

**C36** - [x] De ponta a ponta, na imagem própria:
1. Um operador, com o papel dado pelo comando dentro do contêiner, entra, abre Instituições e cria a "demo".
2. O e-mail de primeiro acesso do admin da "demo" chega ao Mailpit, e o link leva à tela de criar senha da "demo".
3. O operador desativa a "demo", e o login dela dá "Instituição não encontrada".

A suíte e2e inteira passa (AC 1, AC 9, AC 10, AC 22)

Proof: `cd web && E2E_URL=http://localhost:8086 npx playwright test e2e/instituicoes-real.spec.ts -g "operador cria e desativa uma instituição"`
Proof: `cd web && E2E_URL=http://localhost:8086 npx playwright test`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/plataforma/instituicoes` statuses (3) | 200 C8 · 401 C4 · 403 C4 | - |
| `POST /api/plataforma/instituicoes` statuses (5) | 201 C9 · 400 C11 · 401 C4 · 403 C4 · 409 C12 | - |
| `POST /api/plataforma/instituicoes/{slug}/carga` statuses (6) | 200 C19 · 400 C20 · 401 C4 · 403 C4 · 404 C20, C27 · 413 C20 | - |
| `POST /api/plataforma/instituicoes/{slug}/desativar` statuses (5) | 200 C22 · 401 C4 · 403 C4 · 404 C27 · 409 C23 | - |
| `POST /api/plataforma/instituicoes/{slug}/reativar` statuses (4) | 200 C24 · 401 C4 · 403 C4 · 404 C27 | - |
| `POST /api/plataforma/instituicoes/{slug}/reenviar-acesso` statuses (5) | 202 C25 · 401 C4 · 403 C4 · 404 C27 · 409 C26 | - |
| papéis sem acesso (4) | `ADMINISTRADOR` C4, C5 · `ATENDENTE` C4, C5 · `ALUNO` C4, C5 · sem sessão C4 | - |
| campos inválidos na criação (7) | slug curto C11 · slug maiúsculo C11 · nome C11 · fuso C11 · CPF C11 · nome do admin C11 · e-mail C11 | - |
| casos do comando `operador` (6) | adicionar C1 · repetir C1 · remover C2 · slug inexistente C3 · CPF sem usuário C3 · usuário inativo C3 | - |
| efeitos de desativar (4) | página pública 404 C22 · login C22 · primeiro acesso C22 · sessão aberta C22 | - |
| destinatários do reenvio (2) | admin ativo C25 · admin inativo excluído C25 | - |
| one-way doors do `Landing` (5) | 1 C1, C6, C7 · 2 C4 · 3 C19, C31 · 4 C5 · 5 C8 | - |

- Os claims que nomeiam status, rota ou forma de resposta (C4, C6 a C12, C19 a C27) têm prova pela API
- Os de arranjo (C15) são medidos no Chromium; os de tela (C5, C14, C16 a C18, C21, C28) pelo Vitest com a API simulada

## Swept

- validation: C11 (7 campos), C12 (slug repetido), C20 (arquivo de carga), C3 (comando)
- failure modes: C10 (criação e e-mail numa transação só), C20 (carga inválida não grava nada; existing - a gravação da carga numa transação, `InstituicaoComando.Gravar`)
- idempotency: C1 (dar o papel duas vezes não duplica), C12 (criar com slug existente dá 409)
- authorization: C4 (403/401 nas 6 rotas), C5 (menu só para operador), C6 e C7 (a tela Usuários não dá nem tira o papel), C23 (não desativa a própria)
- concurrency: n/a - dois operadores criando o mesmo slug ao mesmo tempo: o índice único de `instituicao.slug` de `<base>` recusa o segundo, que recebe o erro do banco; registrado no `## Handoff` se acontecer no teste
- data lifecycle: C22, C24 (desativar não apaga nada e é reversível)
- dependency failure: n/a - o e-mail vai pela fila `EmailSaida` com novas tentativas do `Agendador` (existing); se o SMTP cair, o comando continua imprimindo o link
- state transitions: C22, C24 (ativa ↔ desativada), C26 (reenviar só com a instituição ativa)
- observability: n/a - as ações são poucas e feitas por operadores; o log de requisição já registra rota e usuário

## Handoff

Tamanho: `InstituicaoComando.cs` (~12 KB), `UsuarioRotas.cs`, `Sessao.cs`, `AdminRotas.cs`, `Program.cs`,
`InstituicaoComandoTests.cs`, `RetratoTests.cs`, `ArquiteturaTests.cs`, `Autenticado.tsx`, `App.tsx`, `simulada.ts`
e `acesso.test.tsx` somam ~260 KB (~65k), mais ~35k de código e testes novos. Total ~100k, abaixo do orçamento de
150k: um construtor só, sem pergunta.

- Mecanismo: um construtor

**Base (`5b53ce7`), valores que a lista fechada deixa subir, anotados antes de mudar:**
- `RetratoTests.Tabela_de_rotas_igual_a_da_base`: 73 rotas, 70 com um só método, 71 com autorização; `rotas.txt` com 71 linhas de rota antes dos 2 fallbacks.
- `ArquiteturaTests`: mensagens 68 (`Um_arquivo_por_caso_de_uso`, `Resposta_por_caso_de_uso`), fatia `Instituicoes` 6 de 68, handlers 68 (`Um_handler_por_mensagem_no_mesmo_arquivo`, `Handler_sem_HttpContext`), `Map*` 71 (`Map_so_nos_casos_de_uso`), `Entrada` aninhadas 31 e rotas com corpo JSON 31 (`Entrada_por_caso_de_uso`, `AsEntradas` com 31 nomes), mensagens com JSON 59 (`Resposta_por_caso_de_uso`; `ComRespostaAninhada` com 20 nomes).
- `MediatorTests.AgirNoChamado_so_nas_9_acoes`: 68 mensagens, (9, 59).
- `SessaoTests.Sem_cookie_401_em_toda_rota_privada`: 64 rotas privadas.
- `web/`: nenhuma contagem nem grupo existente mudou (o menu novo só aparece para `OPERADOR`, que nenhum teste antigo usa): a edição 4 da lista fechada não foi preciso fazer.

**Valores novos** (cada um subiu a mesma conta, só com as 6 rotas, os 6 casos de uso e `CriarInstituicao.Entrada`):
- `RetratoTests.Tabela_de_rotas_igual_a_da_base`: 73 -> 79 rotas, 70 -> 76 com um só método, 71 -> 77 com autorização; `rotas.txt` ganhou as 6 linhas do `Surface` depois das de push, nenhuma some.
- `ArquiteturaTests`: mensagens e handlers 68 -> 74 (4 asserções), fatia `Instituicoes` 6 -> 12, `Map*` 71 -> 77, `Entrada` aninhadas e rotas com corpo JSON 31 -> 32, mensagens com JSON 59 -> 65; `AsEntradas` ganhou `CriarInstituicao` e `ComRespostaAninhada` ganhou os 6 casos de uso novos.
- `MediatorTests.AgirNoChamado_so_nas_9_acoes`: 68 -> 74 mensagens, (9, 59) -> (9, 65).
- `SessaoTests.Sem_cookie_401_em_toda_rota_privada`: 64 -> 70.
- `.specs/GLOSSARIO.md`: seção `Papéis` com `OPERADOR`.
- Fora da lista fechada, só acréscimos: `AtrasoDoCommit.Falhar` em `api.Tests/Infra/OneFactory.cs` (infra de teste, para C10); um `it` novo em `usuarios.test.tsx` (`usuário com OPERADOR edita sem enviar o papel`).

- **Boundary:** `HEAD` depois do commit deste handoff (antes dele: `f1f7d40` API, `5ca4505` web). Todos os 36 checks marcados `[x]`. `dotnet build api` 0 erros (CA1502); `dotnet test api.Tests` 565 verdes (inclui `OperadorComandoTests` e `PlataformaTests`); Vitest 340 verdes em 41 arquivos (+9 em `instituicoes.test.tsx`/`usuarios.test.tsx`); `crapper` sai 0 no limite 9.99 (maior CRAP novo: `Instituicoes` 8.0) e `dryer` sem candidato; layout (`arranjo`, `celular`, `aparencia`, `instituicoes`) 91 verdes contra `vite preview` na 5199; e2e real contra a imagem de `5ca4505` na 8086: `operador cria e desativa uma instituição` verde e a suíte inteira 117 verdes. Container, imagem, banco `one_e2e_plataforma`, bucket `one-e2e-plataforma` e worktree removidos.
- **Settled mid-build:** nada com o usuário. Decisões do construtor: (1) `Landing` ganhou a linha 5: a contagem de administradores da lista é um SQL direto (`Database.SqlQuery`) em `usuario`/`usuario_papel`, porque `Usuario` tem filtro global e a porta 3 proíbe `IgnoreQueryFilters` e trocar a instituição para ler. (2) C11 pede `400` para o CPF `111.111.111-11`, mas `Cpf.Normalizar` o aceita (os dígitos verificadores batem); a recusa dos 11 dígitos iguais ficou em `Criacao.Validar` (a criação do administrador, também usada pelo comando `instituicao criar`), sem mexer em `Cpf.Normalizar`, que vale para o login e a tela Usuários. (3) Os `400` da carga voltam em `errors.arquivo` (lista de textos) e o JSON inválido também; o `413` e o `404` saem antes de ler o JSON. (4) C15 pede "Nova instituição" à direita do título com o mesmo `top`: o `h1` único mora no cabeçalho da casca, outra linha, então a tela traz um `h2` "Instituições" de 36 px na mesma linha do botão (o `h1` e o `h2` repetem o texto). (5) `Usuarios.tsx` filtra `OPERADOR` do formulário e da coluna Papéis (sem isso o `PUT` da tela devolveria `OPERADOR` e levaria `400`, AC 7). (6) `acao.tsx`: `aviso` de `useGravacao` pode ser função da resposta (o "N administrador(es)" vem do `enviados`). (7) O Agendador olha a fila de e-mail a cada 60 s: o e2e real espera até 100 s pelo e-mail. (8) `--remover` do comando é uma flag sem valor e é tirada dos argumentos antes de ler os pares. Nenhuma corrida de dois operadores com o mesmo slug apareceu nos testes; o `POST` trata a violação do índice único como `409`.
- **Abandoned:** nada.

**Rodada 1, correções (C10, C11, C15, C22, C31, C37, C38).**
- **Boundary:** `HEAD` depois do commit das correções. Checks C10, C11, C15, C22, C31, C37 e C38 marcados `[x]`; os 38 estão marcados. `dotnet test api.Tests` 568 verdes (sem travar), `dotnet build api` 0 erros, Vitest 340 verdes, `npm --prefix web run build` ok, layout (`arranjo`, `celular`, `aparencia`, `instituicoes`) 93 verdes contra `vite preview` na 5199, `crapper` 0 e `dryer` sem candidato. O e2e real (C36) não foi rodado de novo: nada que ele exercita mudou além de o `h2` repetido sair da tela (o `h1` da casca continua) e de o CPF de dígitos iguais ser recusado só pela rota.
- **Settled mid-build:** nada com o usuário; seguiu as decisões delegadas de 04/11. (1) C11/AD-033: a recusa dos 11 dígitos iguais saiu de `Criacao.Validar` e ficou em `CriarInstituicaoHandler` (o CPF vira `null` antes de validar); `Criacao.Validar` só testa `Cpf is null`. (2) C10: `ContadorDeGravacoes.FalharAoGravarEmail` (infra de teste) faz o `SaveChanges` que traz uma `EmailSaida` nova lançar. (3) C22: o primeiro acesso grava o e-mail por SMTP direto (não por `EmailSaida`); o teste prova a ausência de token novo e de `EmailSaida` depois de desativar, e que antes o pedido grava o token. (4) C31: a exceção deixou de ser a pasta `Instituicoes/` e passou a listar `Criacao.cs`, `ReenviarAcesso.cs`, `ImportarCargaInstituicao.cs`, `BaixarImagemInstituicao.cs`, `ManifestoInstituicao.cs` e `InstituicaoComando.cs`. (5) C15: sem `h2`, "Nova instituição" é medido contra a borda direita da tabela e o topo da área de conteúdo (contêiner da casca, 24 px de recuo); a 390 px o nome é medido pelo `Range` do texto da célula.
- **Abandoned:** nada.
