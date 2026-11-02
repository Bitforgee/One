# Refatoração SOLID e Clean Code: fatias verticais, uma decisão em um lugar, regras puras, telas menores

## Problem

O código do MVP e do RAG funciona e tem 237 testes de API, 35 de web e e2e. Mas ele foi escrito em
dois dias, em 6 lotes, e cada lote copiou o que precisava do anterior. Hoje:

- **A mesma decisão mora em vários lugares e já diverge.** O prazo de confirmação vem da
  configuração (`Prazos:ConfirmacaoDias`, `Agendador.cs:16`), mas três textos dizem "7 dias" fixo
  (`Agendador.cs:144`, `Avisos.cs:26`, `ChamadoRotas.cs:118`). O prazo de rejeição é outra
  constante, `PrazoRejeicaoDias = 7` (`ChamadoRotas.cs:19`). O lembrete diz "3 dias" fixo
  (`Agendador.cs:160`) enquanto o valor vem de `Prazos:LembreteAguardandoDias`. Quem mudar a
  configuração para a Univag manda ao aluno um e-mail com o prazo errado, e o aluno perde o
  direito de rejeitar antes de o chamado fechar.
- **A consulta "última versão do artigo/documento" está escrita em 11 lugares** (ChamadoRotas,
  Assistente, ArtigoRotas, DocumentoRotas, InstituicaoComando), e o "é artigo ou documento?" em 4
  (`ChamadoRotas.cs:375-397`, `Assistente.cs:62-78`, `Transferencia.cs:39-41`,
  `IndicadorRotas.cs:96-99`). Uma terceira fonte de conhecimento, ou uma regra nova de versão,
  precisa ser lembrada em todos.
- **Regras de negócio só são testáveis por HTTP e banco.** A tabela de permissões do chamado
  (`ChamadoRotas.cs:25-38`), a conta dos 14 indicadores (`IndicadorRotas.cs:18-132`, um lambda de
  ~115 linhas), a validação da carga (`InstituicaoComando.cs:78-174`) e a do CSV de matrículas
  (`AdminRotas.cs:261-329`) estão misturadas com consulta e gravação. Um teste dessas regras sobe o
  contêiner do PostgreSQL inteiro.
- **Arquivos com várias responsabilidades.** `ChamadoRotas.cs` (433 linhas) junta permissões,
  upload, transições, listagem, detalhe, download de anexo, respostas prontas e a resolução das
  fontes do RAG.
- **O código está organizado por camada técnica, não por assunto.** No `api/`, toda rota está em
  `api/Rotas/` e o que ela usa está em outra pasta (`Assistente/`, `Chamados/`, `Comando/`); no
  `web/`, um arquivo `telas/Equipe.tsx` junta Artigos, Documentos e Indicadores, e `telas/Admin.tsx`
  junta Usuários, Matrículas e Cadastros. Mexer em "documentos" hoje é abrir 5 arquivos em 4 pastas.
- **Complexidade medida no front, estimada no back.** O `crapper` mede a tela `ChamadoDetalhe` com
  complexidade ciclomática 64, `Cadastros` 45, `Assistente` 40 e `Usuarios` 32, todas com cobertura
  0% porque o `web/` não gera cobertura. No C#, a auditoria estimou à mão 7 métodos acima de 10
  (o pior, ~35). As ferramentas do `ub-mode` (`crapper`, `dryer`, `mutator`) não leem C#, e o
  projeto não tem analisador de complexidade configurado.

Quem paga: o grupo, a cada mudança que precisa lembrar de N cópias; a Univag, se os prazos forem
ajustados; e a banca de 20/11, que avalia o código.

Evidência: auditoria só leitura de 02/11/2026 e `crapper`/`dryer` rodados em `web/src` no mesmo dia.
Nenhuma falha em produção ainda: não há produção.

**O que muda quando isto estiver pronto:**
- mudar um prazo na configuração muda o texto, o e-mail e a regra juntos;
- cada assunto (acesso, assistente, chamados, conhecimento, indicadores, administração,
  instituições) mora numa pasta só no `api/` e no `web/`, com rota, regra e tela juntas;
- cada regra de negócio central tem teste sem banco e sem HTTP;
- `dotnet build` falha se um método passar de complexidade 10, e o `crapper` passa a ver a
  cobertura do `web/`;
- nenhuma rota, campo JSON, tabela ou chave de configuração muda: para o aluno, o atendente e o
  administrador, nada muda.

## Flow

Reusa o que já existe: o padrão de regra pura em classe estática testada direto (como `Cpf`,
`Conferencia` e `Mascara` hoje), o `TimeProvider` já injetado em todo lugar, o cliente nomeado
`"llm"` do `IHttpClientFactory`, o `EstadosChamado` como modelo de constantes, as rotas estáticas
com `MapGroup` e projeção anônima, e o `ArquiteturaTests` como lugar das regras de texto sobre o
código (já faz isso com `IgnoreQueryFilters`).

1. `api/Rotas/*`, `api/Assistente/*`, `api/Chamados/*`, `api/Comando/*` (exists) - mudam de pasta
   para as 7 fatias da door 3; cada fatia guarda as rotas, as regras e os tipos do seu assunto
2. rotas de cada fatia (exists) - continuam validando a entrada e respondendo; passam a chamar as
   regras puras e os helpers únicos em vez de escrever a regra inline
3. regras puras novas dentro da fatia dona (new, no door - placement per conventions): permissões
   do chamado, cálculo dos indicadores, validação da carga, leitura do CSV, regra de pergunta do
   assistente - sem `OneDb`, sem `HttpContext`
4. fatia `Conhecimento` (door 3) - dona única de "última versão" e de "artigo ou documento", usada
   por `Chamados`, `Assistente`, `Indicadores` e `Instituicoes`
5. `Program.cs` (exists) - registra uma vez os prazos (`Prazos:*`, lidos em `api/Prazos.cs`) e o cliente
   `"llm"` com base e chave (o limite de 20 s continua no relógio injetado, `Embeddings.TempoLimite`), e
   chama o `Mapear` de cada fatia; a URL base (`App:UrlBase`) é lida uma vez em `Tokens.UrlBase`
6. `Agendador`, `Avisos` (exists) - leem os prazos do mesmo lugar que as rotas
7. `api/One.Api.csproj` (exists) + `api/CodeMetricsConfig.txt` (door 2) - o build barra
   complexidade acima de 10
8. `web/src/telas/*` (exists) - vão para as 6 fatias do `web/` (door 3), e `ChamadoDetalhe`,
   `Cadastros`, `Assistente`, `Usuarios`, `Artigos`, `Documentos` viram componentes menores com
   hooks; `web/package.json` (door 1) gera cobertura
9. out: as mesmas respostas HTTP e as mesmas telas de hoje, verificadas pela suíte existente

## Impact

| Front | What changes |
| --- | --- |
| domain | novo termo: `Prazos` - os 5 prazos do atendimento (abandono, confirmação, rejeição, lembrete, resolver aguardando), lidos de `Prazos:*` num lugar só |
| domain | termo existente: "prazo de rejeição" era a constante 7 em `ChamadoRotas`; passa a ser `Prazos:ConfirmacaoDias` (padrão 7). Quem ramifica nele hoje: `ChamadoRotas.Rejeitar` (409) e os textos de `Avisos` e `Agendador` |
| domain | novos nomes para strings já gravadas: tipos de evento (`TRANSICAO`, `ATRIBUICAO`, `LEMBRETE`...), tipos de mensagem (`PUBLICA`, `NOTA`), motivos de fechamento. Os valores não mudam. Quem ramifica neles: `IndicadorRotas`, `Agendador`, e o `web/` (`m.tipo === 'NOTA'` em `Chamados.tsx`) |
| código | os namespaces mudam com as pastas (`One.Api.Rotas` deixa de existir). Quem depende: os `using` dos testes em `api.Tests` e os `import` dos testes em `web/src/*.test.tsx`; o texto fixo `InstituicaoComando.cs` no `ArquiteturaTests` (regra do `IgnoreQueryFilters`) muda para o caminho novo |
| stored data | nada a migrar: nenhuma tabela, coluna ou valor gravado muda. `citacao_artigo` mantém o nome |
| contrato HTTP | nada: rotas, status, nomes de campo JSON e chaves de configuração ficam iguais |
| testes | os existentes só mudam de lugar, de `using`/`import` e de caminho de arquivo: nenhuma asserção removida, afrouxada ou alterada; entram testes de unidade das regras puras e regras de texto no `ArquiteturaTests` |
| verificação do RAG | os commits desta feature só entram no `main` depois de a verificação do `rag` aprovar, para não mexer no intervalo que o Verifier está lendo |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside changes: nenhuma rota nova nem assinatura alterada

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. dependência de dev no `web/` | `"@vitest/coverage-v8": "5.0.5"` (mesma versão do `vitest`) em `devDependencies` e `"coverage": "vitest run --coverage --coverage.reporter=lcov"` em `scripts`; o `crapper` roda `npm run coverage` | `c8` em volta do `npm test`: um segundo mecanismo de cobertura paralelo ao do Vitest, que o `crapper` só usa como último recurso |
| 2. barreira de complexidade no build do C# | `api/CodeMetricsConfig.txt` com `CA1502(Method): 10`; no `.csproj`, `<AdditionalFiles Include="CodeMetricsConfig.txt" />` e `<WarningsAsErrors>CA1502</WarningsAsErrors>`; `.editorconfig` na raiz com `dotnet_diagnostic.CA1502.severity = warning`. É precedente: toda feature seguinte herda a barreira | `SonarAnalyzer.CSharp` (S3776, complexidade cognitiva): dependência de terceiros com centenas de regras fora do escopo, e o CRAP do `ub-mode` usa complexidade ciclomática, não cognitiva |

| 3. arquitetura em fatias verticais simples (precedente para toda feature seguinte) | `api/<Fatia>/` com namespace `One.Api.<Fatia>`, fatias: `Acesso`, `Assistente`, `Chamados`, `Conhecimento`, `Indicadores`, `Administracao`, `Instituicoes`; compartilhado só em `api/Dados/` e nos arquivos da raiz `api/*.cs` (`Program`, `Problemas`, `Sessao`, `Cpf`, `Tokens`, `Email`, `Agendador` e os prazos). No `web/`: `web/src/<fatia>/` com `acesso`, `assistente`, `chamados`, `conhecimento`, `indicadores`, `administracao`, e o teste da fatia dentro dela; na raiz `web/src/` só o que 2 ou mais fatias usam. Uma fatia só usa outra pelas referências da lista fechada no `ArquiteturaTests` | VSA completa, um arquivo por caso de uso com handler (`IHandler` ou MediatR): ~60 rotas virariam ~60 arquivos e uma interface sem segundo uso, e o pipeline `Agir` do chamado (404 -> 403 -> 400 -> 409), que já é a abstração certa, teria de virar um kernel compartilhado. Camadas (Controllers/Services/Repositories): separa justamente o que muda junto |
- Nothing else in this change is hard to reverse: nenhuma rota, campo JSON, tabela, coluna ou
  chave de configuração muda; mover código entre arquivos e extrair funções se desfaz com outro
  refactor.

## Criteria

### S1: Rede de segurança e medição antes de mexer (P1)

O comportamento atual fica preso pela suíte existente, e a complexidade passa a ser medida dos dois
lados antes do primeiro commit estrutural.

**Acceptance Criteria**

1. The system SHALL pass every test that exists at the feature base (API, web e e2e) at every
   commit of this feature, with no existing assertion removed, skipped or loosened.
2. WHEN `npm run coverage` runs in `web/` THEN the system SHALL write `web/coverage/lcov.info`.
3. WHEN `crapper` runs in `web/` after `npm run coverage` THEN it SHALL report a coverage
   above 0.0% for `ChamadoDetalhe`.
4. WHEN an `api/` method outside `Dados/Migracoes` has cyclomatic complexity above 10 THEN `dotnet build` SHALL fail
   with `CA1502` naming that method.
5. The system SHALL record, before the first structural commit, the baseline in
   `.specs/features/refatoracao-solid/baseline.md`: the CA1502 count per file at threshold 10 and
   the `crapper` top 10 for `web/src` with coverage.

**Independent test:** `dotnet build` com a barreira ligada lista os métodos acima de 10; `npm run
coverage` seguido do `crapper` mostra cobertura diferente de 0%.

### S2: Uma decisão em um lugar (P1)

Cada prazo, limite, string gravada e consulta repetida passa a ter um único dono.

**Acceptance Criteria**

6. WHEN `Prazos:ConfirmacaoDias` is 10 THEN the system SHALL write "10 dias" in the automatic-close
   event detail and in the "resolvido" e-mail, and SHALL close the ticket only after 10 days.
7. IF a student rejects a resolution after `Prazos:ConfirmacaoDias` days THEN the API SHALL return 409
   with a detail naming that number of days.
8. WHEN `Prazos:LembreteAguardandoDias` is 4 THEN the system SHALL write "4 dias" in the reminder
   event detail.
9. The system SHALL keep the defaults 30 min, 7, 3 and 7 days when no `Prazos:*` key is set.
10. The API source outside `Dados/Migracoes` SHALL contain each persisted literal of event type,
    message type and closing motive only in the one file that declares its constant group.
11. The API source SHALL express "latest version of an artigo or documento" in exactly one file.
12. The API source SHALL branch on "artigo or documento" for a cited source in exactly one file.
13. The API source SHALL read `Llm:BaseUrl` and `Llm:ChaveApi` only where the `"llm"` client is
    registered, and `App:UrlBase` in exactly one place.
14. The API source SHALL read an uploaded file into bytes and check its signature in exactly one
    helper, used by anexos and documentos, keeping today's 413 and 415 responses.
15. The API source SHALL define the password length bounds 8 and 128 in exactly one place.
16. The API source SHALL not contain `DateTime.UtcNow` nor `DateTime.Now`.
17. The project SHALL keep `.specs/GLOSSARIO.md` listing every term named in criteria 6 to 12 with
    its persisted value and meaning.

**Independent test:** mudar `Prazos:ConfirmacaoDias` para 10 num teste e ver os três textos e o 409
seguirem; as regras de texto do `ArquiteturaTests` falham se uma cópia voltar.

### S3: Regras de negócio puras, testadas sem banco (P1)

As regras centrais saem dos lambdas de rota e ganham teste de unidade que não sobe o PostgreSQL.

**Acceptance Criteria**

18. The ticket permission table SHALL be callable from a test with no `OneFactory`, and a test
    SHALL assert the allowed actions for every (papel, estado) pair the table lists.
19. The 14 indicators SHALL be computed by a function that takes the loaded tickets, their events
    and the institution time zone, callable with no database.
20. WHEN that function gets a ticket resolved 10 h after opening THEN it SHALL report 6 h if 4 h
    were spent in `AGUARDANDO_ALUNO`.
21. The `instituicao carga` validation SHALL be a function that returns the list of errors without
    writing, and IF the list is not empty THEN the command SHALL write no row.
22. The enrolment CSV reading SHALL be a function that returns the valid rows and the per-row
    errors without writing, with the same error texts as today.
23. WHEN the model's reply is a question THEN the assistant rule SHALL accept it only if it has at
    most 200 characters, ends in "?", and is not the third consecutive question.
24. The rule of criterion 23 SHALL be callable with no HTTP and no database, with tests at 200 and
    201 characters and at the second and third consecutive question.

**Independent test:** `dotnet test --filter` nos testes novos de unidade roda com o PostgreSQL
parado.

### S4: O `api/` em fatias verticais, um arquivo por responsabilidade (P1)

Cada assunto mora numa pasta, e `ChamadoRotas`, `AdminRotas` e `Assistente` deixam de juntar
assuntos diferentes.

**Acceptance Criteria**

25. The ticket detail SHALL obtain its cited sources from the `Conhecimento` slice, and no file in
    `api/Chamados` SHALL query `VersoesArtigo` nor `VersoesDocumento`.
26. The API SHALL hold every non-shared `.cs` file in exactly one of the 7 slice folders of door 3,
    and `api/Rotas` and `api/Comando` SHALL not exist.
27. The API SHALL declare in each `.cs` file the namespace `One.Api.<Fatia>` matching its folder.
28. The API source SHALL reference another slice's namespace only through the pairs listed in the
    architecture test.
29. The enrolment CSV import route SHALL live in its own file in `api/Administracao`.
30. WHEN an admin creates or edits a user THEN the API SHALL save all changes in one
    `SaveChangesAsync` call.
31. The API SHALL build with zero `CA1502` at the threshold of criterion 4.

**Independent test:** `dotnet build` sem `CA1502`, o `ArquiteturaTests` verde com as regras de pasta,
namespace e referências, e a suíte da API verde.

### S5: O `web/` em fatias verticais, telas com CRAP abaixo de 10 (P1)

As telas mudam para a pasta do seu assunto e as grandes viram componentes pequenos, cada um testado.

**Acceptance Criteria**

32. The web SHALL hold every screen and its test in exactly one of the 6 slice folders of door 3,
    and `web/src/telas` SHALL not exist.
33. WHEN `crapper --threshold 9.99` runs in `web/` after `npm run coverage` THEN it SHALL
    exit 0.
34. WHEN `dryer` runs over `web/src` THEN it SHALL report no candidate at score 0.8 or above.
35. WHEN `mutator` runs over the files S5 changed THEN the system SHALL leave no surviving mutant:
    each one killed by a test or its code deleted as dead.
36. WHILE a ticket is loading, empty or in error, `ChamadoDetalhe` SHALL show the same spinner,
    texts and `Alert` as today.

**Independent test:** `npm run coverage && crapper ... --threshold 9.99` sai 0; os e2e de 360 px
continuam verdes.

## Out of scope

| Excluded | Why |
| --- | --- |
| `crapper`, `dryer` e `mutator` no C# | as três ferramentas não leem C#; no lugar, CA1502 (critério 4) e a injeção de falhas do Verifier |
| Stryker.NET para mutação no C# | o upstream 4.14.1 não roda em .NET 10 com `.slnx`; o que roda é um fork da comunidade (`dotnet-stryker-netx`), não oficial. Rever quando o upstream suportar |
| Camada de serviços, repositórios, interfaces por classe, controllers, MediatR, mapeadores de DTO | as rotas estáticas com projeção anônima são a convenção do projeto e funcionam; interface sem segunda implementação é abstração que ninguém pediu |
| Interface para o `Email` | os testes já usam Mailpit real e o `OneFactorySmtpFora`; não há segundo uso |
| Trocar o `switch` de tipos do `Agendador` por estratégia | 6 casos, estáveis; no máximo constantes (entra no critério 10) |
| `OneDb.OnModelCreating` e o mapeamento declarativo de `AdminRotas.Mapear` | configuração declarativa, longa mas coesa; só mexe se o CA1502 obrigar |
| Renomear `CitacaoArtigo` / `citacao_artigo` | cita documentos também, mas renomear pede migração de tabela |
| Consultas N+1 (`AdminRotas.cs:207`, `DocumentoRotas.cs:93`) | desempenho, não estrutura; entra na fase "Escala" do roadmap |
| Reorganizar `api.Tests` por fatia | os testes de API são por comportamento HTTP e cruzam fatias; mover só muda caminho e aumenta o diff que o Verifier precisa ler |
| Cobertura de código do C# | sem `crapper` para C# ela não vira número de CRAP; o critério 1 e o Verifier cobrem o risco |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Antes da banca | S1 a S5 inteiros entram no `main` antes de 20/11 | decisão do usuário em 02/11/2026 ("vão obrigatoriamente entrar antes da banca") | y |
| Quando construir | depois de a verificação do `rag` aprovar; meta 08/11, limite 12/11; congelamento de código de 13/11 a 20/11 (só correção de bug) | a banca roda no `main` sem versão anterior (AD-014); o ensaio com a chave real precisa de uma semana sobre o código final | n |
| Arquitetura | fatias verticais simples por assunto (door 3), sem handler por caso de uso | user delegated ("vertical slice ou uma arquitetura mais simples"); recomendação aceita | y |
| Prazo de rejeição | o mesmo valor de `Prazos:ConfirmacaoDias`: o aluno pode rejeitar enquanto o chamado não fecha sozinho | hoje os dois são 7 por coincidência de duas fontes; separados, um ajuste deixa o aluno sem poder rejeitar antes do fechamento | y |
| Limite de complexidade no C# | ciclomática 10 por método | é o análogo do CRAP 10 do `ub-mode` com cobertura total (CRAP = CC); o padrão do CA1502 é 25 | y |
| Perfil do `tlc-spec-lean` | `standard`, como no `mvp-one` (AD-013) | um refactor só é seguro se os testes que o prendem falham quando o comportamento muda; o `standard` injeta falhas para provar isso | y |
| Textos com prazo | "N dias" com o número vindo de `Prazos:*`, mesma frase de hoje | não mudar o texto além do número | y |

**Open questions:**

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| 1 | open | O CA1502 soma a complexidade dos lambdas ao método que os contém (`AdminRotas.Mapear`, `ChamadoRotas.Mapear`)? A documentação da Microsoft não diz. | o S1 mede; se somar, os lambdas de rota viram métodos estáticos nomeados (a minimal API aceita), o que já é a direção do S3 e do S4 |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| copy: evento e e-mail "fechado automaticamente" / "resolvido" | estrutura, tom | existente; só o número de dias passa a vir da configuração, AC 6 |
| copy: evento "lembrete" | estrutura, tom | existente; número da configuração, AC 8 |
| API `POST /api/chamados/{numero}/rejeitar` | forma e código do erro | existente (409, `Problemas.Erro`); o número de dias segue a configuração, AC 7 |
| API: todas as rotas | forma da resposta, erros, versionamento, limite de taxa | n/a - nenhuma muda; AC 1 prende o comportamento |
| comando `npm run coverage` | saída, flags, códigos de saída | os do Vitest: sai diferente de 0 se um teste falha; AC 2 |
| comando `dotnet build` com CA1502 | saída quando falha | erro `CA1502` com o nome do método; AC 4 |
| comando `crapper --threshold` | código de saída | 2 quando o pior CRAP passa do limite, 0 caso contrário; AC 33 |
| tela `ChamadoDetalhe` | carregando, vazio, erro, sem permissão | existentes; AC 36 prende os três primeiros, o 404/403 da API decide o quarto |
| telas `Cadastros`, `Assistente`, `Usuarios`, `Artigos`, `Documentos` | estados e confirmação de ação destrutiva | existentes; AC 1 (testes atuais) e AC 33 |

## Sources

- Pedido do usuário em 02/11/2026: refatorar com SOLID e clean code onde for necessário, usando
  `tlc-spec-lean` e `ub-mode`.
- `ub-mode` (`~/.claude/skills/ub-mode/SKILL.md`): CRAP abaixo de 10, `dryer` a partir de 0.8,
  `mutator` sem sobreviventes, regra pura na fronteira, uma decisão em um lugar, glossário.
- Pedido do usuário em 02/11/2026, segunda mensagem: fatias verticais ou arquitetura mais simples,
  tudo antes da banca.
- CA1502 e o arquivo de limites (CA1509): https://learn.microsoft.com/dotnet/fundamentals/code-analysis/quality-rules/ca1502
