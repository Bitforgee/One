# Instituições pela tela

## Problem

Criar uma instituição nova no One exige acesso ao servidor: alguém roda `dotnet api.dll instituicao criar
--slug ... --admin-email ...` e depois `instituicao carga --slug ... --arquivo ...`, e copia do terminal o link de
primeiro acesso do administrador para mandar à mão (`api/Instituicoes/InstituicaoComando.cs`). Não há como ver
quais instituições existem, desativar uma ou reenviar o acesso de um administrador sem mexer no servidor ou no
banco. Quem paga é a equipe do One: cada cliente novo (AD-008) depende de alguém com terminal no servidor, e um
link de administrador vencido (60 minutos) volta a depender disso. A fonte não traz números; o pedido é do
usuário, em 04/11/2026.

Depois desta feature, uma pessoa da equipe do One com o papel novo `OPERADOR` entra no One da sua própria
instituição e, na tela "Instituições", faz quatro coisas sem tocar no servidor:
- lista as instituições;
- cria uma instituição com o primeiro administrador, que recebe o link de primeiro acesso por e-mail;
- importa o arquivo de carga inicial;
- desativa, reativa ou reenvia o acesso do administrador.

## Flow

Reaproveita o que o comando de linha já faz, sem duplicar:
- a validação e a criação de `instituicao criar` (exists): slug, fuso IANA, CPF e e-mail; setor "Triagem", categoria "Não
  classificado" e o administrador com token de primeiro acesso;
- a carga de `instituicao carga` (exists) (`CargaValidacao.Validar` e a gravação);
- o token e o link de `Tokens` (exists);
- a fila `EmailSaida` com o `Agendador`, que já envia e-mail com a marca da instituição (AD-032);
- a regra de sessão que já derruba quem é de instituição inativa (`Sessao.Validar`, exists).

1. O `OPERADOR` abre `/:slug/instituicoes` (door 4). A tela chama `/api/plataforma/instituicoes*` (door 2), um
   grupo que exige o papel `OPERADOR` (door 1).
2. Criar: a validação e a criação saem de `InstituicaoComando` (exists) para um caso de uso compartilhado, sem
   mudar o comando. A rota troca `db.InstituicaoAtual` para a instituição nova, como o comando faz (door 3).
   Grava a instituição, o setor, a categoria, o admin e o token, e põe na mesma transação uma `EmailSaida` (exists)
   com o link. O `Agendador` (exists) envia.
3. Carga: o arquivo JSON enviado passa por `CargaValidacao.Validar` (exists) e pela mesma gravação do comando,
   na instituição escolhida (door 3). Os artigos novos são indexados pelo `Agendador` (exists), como hoje.
4. Desativar e reativar: mudam `Instituicao.Ativa` (exists). `Login`, `PrimeiroAcesso`, `DefinirSenha`,
   `VerInstituicao` e `Sessao.Validar` (exist) já tratam a instituição inativa.
5. Reenviar acesso: um token novo e uma `EmailSaida` para cada administrador ativo da instituição (door 3).
6. O papel `OPERADOR` só é dado e tirado pelo comando novo `instituicao operador` (door 1). `UsuarioRotas`
   (exists) passa a preservar esse papel quando o admin edita o usuário.

## Impact

| Front | What changes |
| --- | --- |
| domain | termo novo: `OPERADOR`, o papel de quem gerencia todas as instituições; vive em `Papeis` |
| domain | termo existente: `Papeis` tinha 3 valores que a tela Usuários lista e valida (`UsuarioRotas.PapeisValidos`). O `OPERADOR` não entra nessa lista. `UsuarioRotas.Gravar` hoje remove todo papel fora do que a tela enviou, então passa a preservar `OPERADOR` (AC 21) |
| domain | regra existente: cada requisição só vê a própria instituição pelo filtro global (AD-008). As rotas da plataforma são as primeiras requisições HTTP que trocam `InstituicaoAtual` para outra instituição depois da sessão. Só elas, e só para escrever na instituição escolhida (door 3) |
| comando | `instituicao criar` e `instituicao carga` mudam de lugar no código, mas a saída e os códigos de retorno continuam iguais. Entra o comando `instituicao operador` |
| stored data | nada a migrar: o papel é uma linha nova em `usuario_papel`, e `instituicao.ativa` já existe |

## Relations

None - no stored-data shape change. O papel `OPERADOR` é um valor novo de `usuario_papel.papel`, que já é texto livre.

## Surface

| Route | In | Out | Status |
| --- | --- | --- | --- |
| `GET /api/plataforma/instituicoes` | - | lista de `{slug, nome, fuso, ativa, criadaEm, administradores}` | `200`, `401`, `403` |
| `POST /api/plataforma/instituicoes` | `slug`, `nome`, `fuso`, `admin {cpf, nome, email}` | `{slug, nome, fuso, ativa, criadaEm, administradores}` e `Location: /api/plataforma/instituicoes/{slug}` | `201`, `400`, `401`, `403`, `409` |
| `POST /api/plataforma/instituicoes/{slug}/carga` | multipart `arquivo` (JSON) | `{setores, cursos, categorias, regras, artigos}` (quantidades gravadas) | `200`, `400`, `401`, `403`, `404`, `413` |
| `POST /api/plataforma/instituicoes/{slug}/desativar` | - | `{slug, ativa:false}` | `200`, `401`, `403`, `404`, `409` |
| `POST /api/plataforma/instituicoes/{slug}/reativar` | - | `{slug, ativa:true}` | `200`, `401`, `403`, `404` |
| `POST /api/plataforma/instituicoes/{slug}/reenviar-acesso` | - | `{enviados}` (quantos administradores receberam) | `202`, `401`, `403`, `404`, `409` |

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. Papel `OPERADOR` | `Papeis.Operador = "OPERADOR"`, gravado em `usuario_papel` de um usuário da sua própria instituição; dado e tirado só por `dotnet api.dll instituicao operador --slug <slug> --cpf <cpf> [--remover]`, nunca por rota HTTP | instituição reservada `/plataforma`: vira um caso especial em toda regra que hoje vale para qualquer instituição (login, aparência, filtros). Papel concedido pela tela Usuários: um admin de cliente poderia se dar acesso a todos os clientes (decisão do usuário em 04/11) |
| 2. Rotas da plataforma | grupo `/api/plataforma` com um filtro que responde `403 "Só operadores da plataforma podem usar esta área."` sem o papel; a instituição alvo vem do `{slug}` da URL | sob `/api/admin`: o filtro de lá exige `ADMINISTRADOR` e resolve a instituição pelo cookie, que aqui é justamente a que não importa |
| 3. Troca de instituição numa requisição | só os casos de uso de `/api/plataforma` trocam `db.InstituicaoAtual` para a instituição do `{slug}` depois da sessão, para gravar nela; a leitura da lista usa só a tabela `instituicao`, que não tem filtro | `IgnoreQueryFilters`: a regra `ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando` existe para que nenhuma consulta HTTP veja outra instituição por acidente |
| 4. Tela `/:slug/instituicoes` | grupo novo "Plataforma" na barra lateral e na gaveta, com o link "Instituições" (ícone `Building2`), só para `OPERADOR` | um app separado de administração: outro build, outro login e outro deploy para 6 ações |

- Nada mais nesta mudança é difícil de reverter: textos, a lista de fusos e a sugestão de endereço são constantes

## Screens

- **Instituições (≥ 768 px):** cabeçalho com o título "Instituições" e o botão "Nova instituição" à direita.
  Abaixo, a `Tabela` com as colunas Nome (e, embaixo em `text-xs`, o endereço `/{slug}`), Situação (selo
  "Ativa" ou "Desativada"), Administradores (quantos ativos), Criada em, e o menu de ações da linha:
  "Importar carga", "Reenviar acesso do admin" e "Desativar" ou "Reativar". Ordem: as ativas primeiro, por nome.
- **Instituições (< 768 px):** os cartões da `Tabela` (AD-032), com o nome e o selo na primeira linha e o
  endereço embaixo.
- **Nova instituição (`Dialog`):** os campos Nome, Endereço, Fuso horário e, sob o título "Primeiro
  administrador", Nome, CPF e E-mail, com "Cancelar" e "Criar".
  - Endereço tem o prefixo fixo `/`. Ao digitar o nome, ele se preenche sozinho em minúsculas, sem acento e com
    hífen; depois de editado à mão, para de seguir o nome.
  - Fuso horário é um `NativeSelect` com os fusos do Brasil, começando por `America/Sao_Paulo`.
  - Depois de criar, o `Dialog` fecha, e um alerta de sucesso diz "Instituição {nome} criada. Enviamos o link de
    primeiro acesso para {email}." com o link `/{slug}` para abrir o login.
- **Importar carga (`Dialog`):** o `CampoArquivo` aceitando `.json`, o botão "Importar" e, depois, o resumo
  "Importados: N setores, N cursos, N categorias, N regras, N artigos." ou a lista de erros numa `Tabela`.
- **Desativar:** o `Confirmar` existente, com "Desativar {nome}? Ninguém dessa instituição consegue entrar até
  você reativar.".

## Criteria

### S1: Operador e acesso à área da plataforma (P1)

Só quem a equipe do One escolheu vê e usa a área.

**Acceptance Criteria**

1. WHEN `dotnet api.dll instituicao operador --slug <slug> --cpf <cpf>` roda para um usuário ativo THEN o sistema SHALL dar o papel `OPERADOR` a esse usuário, imprimir "Operador {nome} adicionado." e sair com 0
2. WHEN o mesmo comando roda com `--remover` THEN o sistema SHALL tirar o papel, imprimir "Operador {nome} removido." e sair com 0
3. IF a instituição ou o CPF não existem, ou o usuário está inativo THEN o comando SHALL imprimir o erro no erro padrão e sair com 1, sem gravar nada
4. IF quem chama qualquer rota de `/api/plataforma` não tem o papel `OPERADOR` THEN o sistema SHALL responder `403` "Só operadores da plataforma podem usar esta área.", e sem sessão, `401`
5. The system SHALL mostrar o grupo "Plataforma" com o link "Instituições" na barra lateral e na gaveta só para quem tem `OPERADOR`
6. WHEN o admin de uma instituição salva um usuário que tem `OPERADOR` pela tela Usuários THEN o sistema SHALL manter o papel `OPERADOR` desse usuário
7. IF a tela Usuários envia `OPERADOR` em `papeis` THEN o sistema SHALL responder `400` "Escolha ao menos um papel." no campo `papeis`, como faz hoje com qualquer papel fora dos 3

**Independent test:** dar o papel pelo comando, entrar e ver "Instituições"; entrar como admin comum e não ver.

### S2: Listar e criar (P1)

O operador vê as instituições e cria uma nova sem terminal.

**Acceptance Criteria**

8. WHEN o operador pede `GET /api/plataforma/instituicoes` THEN o sistema SHALL devolver `200` com todas as instituições, ativas e inativas, cada uma com `slug`, `nome`, `fuso`, `ativa`, `criadaEm` e `administradores` (quantos usuários ativos com `ADMINISTRADOR`), as ativas primeiro e cada grupo por `nome`
9. WHEN o operador envia `POST /api/plataforma/instituicoes` válido THEN o sistema SHALL criar a instituição, o setor "Triagem", a categoria "Não classificado", o administrador com o papel `ADMINISTRADOR` e um token de primeiro acesso, e responder `201` com a instituição e o `Location`
10. WHEN a instituição é criada THEN o sistema SHALL gravar, na mesma transação, uma `EmailSaida` da instituição nova para o e-mail do administrador, com o assunto "[{nome}] Crie sua senha" e o link de primeiro acesso no corpo
11. IF `slug` não casa com `^[a-z0-9-]{3,30}$`, `nome` ou `admin.nome` estão vazios, `fuso` não é um fuso IANA, `admin.cpf` é inválido, ou `admin.email` não é um e-mail válido THEN o sistema SHALL responder `400` no campo (`slug`, `nome`, `fuso`, `admin.cpf`, `admin.nome`, `admin.email`) sem gravar nada
12. IF `slug` já existe THEN o sistema SHALL responder `409` "Esse endereço já está em uso." sem gravar nada
13. The system SHALL manter o comando `instituicao criar` com a mesma saída e os mesmos códigos de retorno de hoje
14. The system SHALL mostrar na tela Instituições a lista com Nome e endereço, Situação, Administradores, Criada em e o menu de ações, como em `## Screens`
15. WHEN o operador digita o Nome no `Dialog` "Nova instituição" THEN o campo Endereço SHALL se preencher com o nome em minúsculas, sem acento e com hífens no lugar de espaços e símbolos, até o operador editar o Endereço à mão
16. WHEN a criação dá certo THEN a tela SHALL fechar o `Dialog`, mostrar "Instituição {nome} criada. Enviamos o link de primeiro acesso para {email}." com o link `/{slug}`, e a lista SHALL trazer a instituição nova
17. IF a API responde `400` ou `409` THEN o `Dialog` SHALL mostrar o texto no campo da API, sem apagar o que foi digitado

**Independent test:** criar a instituição `demo` pela tela e abrir o e-mail no Mailpit.

### S3: Carga inicial pela tela (P1)

O operador importa setores, cursos, categorias, regras e artigos de uma vez.

**Acceptance Criteria**

18. WHEN o operador envia `POST /api/plataforma/instituicoes/{slug}/carga` com um JSON válido no formato de `ArquivoCarga` THEN o sistema SHALL gravar na instituição do `{slug}` o mesmo que `instituicao carga` grava e responder `200` com as quantidades de setores, cursos, categorias, regras e artigos gravados
19. IF o arquivo não é JSON válido, ou `CargaValidacao.Validar` devolve erros THEN o sistema SHALL responder `400` com a lista de erros, sem gravar nada; IF o arquivo passa de 2 MB THEN `413`; IF o `{slug}` não existe THEN `404`
20. The system SHALL manter o comando `instituicao carga` com a mesma saída e os mesmos códigos de retorno de hoje
21. WHEN a importação dá certo THEN o `Dialog` SHALL mostrar "Importados: N setores, N cursos, N categorias, N regras, N artigos."; IF ela falha com `400` THEN SHALL mostrar cada erro numa linha

**Independent test:** importar a carga de exemplo na `demo` e ver os setores na tela Cadastros do admin da `demo`.

### S4: Desativar, reativar e reenviar acesso (P1)

O operador controla quem pode entrar e destrava o administrador.

**Acceptance Criteria**

22. WHEN o operador pede `POST .../{slug}/desativar` THEN o sistema SHALL gravar `ativa = false` e responder `200`; a partir daí o login, o primeiro acesso e `GET /api/instituicoes/{slug}` dessa instituição SHALL responder como instituição inexistente, e as sessões abertas dela SHALL ser recusadas na próxima requisição (existing `Sessao.Validar`)
23. IF o `{slug}` é a instituição do próprio operador THEN `desativar` SHALL responder `409` "Você não pode desativar a instituição em que está." sem gravar nada
24. WHEN o operador pede `POST .../{slug}/reativar` THEN o sistema SHALL gravar `ativa = true` e responder `200`, e o login volta a funcionar
25. WHEN o operador pede `POST .../{slug}/reenviar-acesso` THEN o sistema SHALL criar um token de primeiro acesso novo e uma `EmailSaida` com o link para cada administrador ativo da instituição, e responder `202` com `enviados` igual a quantos
26. IF a instituição está desativada ou não tem administrador ativo THEN `reenviar-acesso` SHALL responder `409` "Esta instituição não tem administrador ativo para receber o acesso." (ou "A instituição está desativada.") sem gravar nada
27. IF o `{slug}` não existe THEN `carga`, `desativar`, `reativar` e `reenviar-acesso` SHALL responder `404` "Instituição não encontrada."
28. WHEN o operador escolhe "Desativar" no menu THEN a tela SHALL pedir confirmação com o `Confirmar` e o texto de `## Screens`, e depois mostrar o selo "Desativada" na linha; "Reativar" e "Reenviar acesso do admin" SHALL agir direto e mostrar "Instituição reativada." ou "Enviamos o link para N administrador(es)."

**Independent test:** desativar a `demo` e ver o login dela dar "Instituição não encontrada"; reativar e reenviar o acesso.

## Out of scope

| Excluded | Why |
| --- | --- |
| Apagar instituição | nada é apagado no One (exigência do MEC e AD-021); desativar basta |
| Editar nome, slug ou fuso pela plataforma | o slug é a URL de todos os links e e-mails já enviados; o nome e a marca o admin da instituição muda em Aparência |
| Dar o papel `OPERADOR` pela tela | decisão do usuário em 04/11: só pelo comando |
| Entrar como o admin de outra instituição | sessão de outra instituição é uma porta para vazar dados; o operador usa só as 6 ações |
| Ver dados de dentro das instituições (chamados, usuários) | fora da finalidade da tela; cada admin vê a sua |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quem cria | papel `OPERADOR` dado pelo comando | decisão do usuário em 04/11 | y |
| Ações da tela | listar, criar, desativar e reativar, carga, reenviar acesso | decisão do usuário em 04/11 | y |
| O link de primeiro acesso | vai só por e-mail e não aparece na tela | o link dá a senha de administrador; a tela não o mostra a quem não é o dono, e o comando continua imprimindo para quando não há SMTP | n |
| Limite do arquivo de carga | 2 MB | uma carga com 200 artigos tem menos de 500 KB | n |
| Lista de fusos | os fusos IANA do Brasil, `America/Sao_Paulo` primeiro | o One atende instituições brasileiras; o servidor aceita qualquer IANA | n |
| Perfil de verificação | `ui` | uma tela nova com arranjo e textos definidos | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| tela Instituições | vazio | n/a - quem abre a tela é de uma instituição, então a lista nunca vem vazia |
| tela Instituições | carregando | existing - os esqueletos da `Tabela` (AD-032) |
| tela Instituições | erro | AC 17, AC 21 e o alerta de erro existente da lista |
| tela Instituições | não autorizado | AC 4, AC 5 |
| tela Instituições | ação destrutiva confirma | AC 28: desativar pede confirmação; reativar e reenviar não destroem nada |
| tela Instituições | densidade e ordem | AC 8, AC 14: ativas primeiro, por nome |
| `/api/plataforma/*` | forma e códigos de erro | AC 4, AC 11, AC 12, AC 19, AC 23, AC 26, AC 27, no formato `Problemas` |
| `/api/plataforma/*` | limite de taxa | n/a - só operadores, poucas pessoas, nenhuma rota anônima |
| `/api/plataforma/*` | versionamento | n/a - consumidas só pelo `web/` deste repositório |
| comando `instituicao operador` | saída, códigos e falha no meio | AC 1 a AC 3: grava numa transação só, ou nada |

## Sources

- Pedido do usuário em 04/11/2026 e as respostas: papel `OPERADOR` e as 4 ações além de criar
- `api/Instituicoes/InstituicaoComando.cs`: o que `criar` e `carga` fazem hoje
- `.specs/STATE.md` AD-008, AD-021, AD-032: multi-instituição, nada se apaga, e-mail com a marca
