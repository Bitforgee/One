# Pastas no padrão .NET

## Problem

Os projetos .NET já têm nome no padrão da Microsoft: `One.Api.csproj` (assembly e namespace raiz `One.Api`)
e `One.Api.Tests.csproj` (`<ProjetoTestado>.Tests`). As pastas não seguem: o código fica em `api/` e
`api.Tests/`, quando nos tutoriais e templates da Microsoft a pasta tem o nome do `.csproj`
(`PrimeService/PrimeService.csproj`, `PrimeService.Tests/PrimeService.Tests.csproj`). Quem abre o
repositório vindo de outro projeto .NET, inclusive a banca e a segunda pessoa do par, encontra pasta e
projeto com nomes diferentes e precisa descobrir qual é qual. Não há outra evidência: o pedido vem do
usuário, que viu a diferença.

Quando isso entrar, a pasta de cada projeto terá o nome do projeto (`One.Api/`, `One.Api.Tests/`), e
build, testes, Docker, o build do `web/` e os comandos do `AGENTS.md` continuarão funcionando como hoje.
`web/` não muda: não é projeto .NET, nome de pacote npm é minúsculo, e o template React + ASP.NET Core
da Microsoft também deixa o front em minúsculas (`<app>.client`).

## Flow

Reaproveita tudo o que existe: é um `git mv` das duas pastas mais a troca dos caminhos literais que
apontam para elas. Nenhum namespace, assembly, rota ou arquivo de código muda de conteúdo além desses
caminhos.

1. `git mv api One.Api` e `git mv api.Tests One.Api.Tests` (door 1) - o histórico segue o arquivo pela detecção de rename do git
2. `One.slnx` (exists) - os dois `<Project Path>` apontam para as pastas novas
3. `One.Api.Tests/One.Api.Tests.csproj` (exists) - o `ProjectReference` passa a `..\One.Api\One.Api.csproj`; o `WebApplicationFactory` acha a raiz de conteúdo pelo atributo que o MSBuild gera a partir dessa referência
4. `web/vite.config.ts` (exists) - `build.outDir` passa a `../One.Api/wwwroot`
5. `Dockerfile` (exists) - `COPY`, `restore`, `publish` e o `COPY --from=web` usam `One.Api/`; a imagem continua rodando `One.Api.dll`
6. `.gitignore` (exists) e `.dockerignore` (exists) - ignoram `One.Api/wwwroot`
7. `ArquiteturaTests` (exists), `PlataformaTests` (exists), `ProvedorTests` (exists) e `RetratoTests` (exists) - os testes que montam caminho leem as pastas novas
8. `web/apresentacao/preparar.ts` e `tts.ts` (exist) - `cwd` e `--project` apontam para `One.Api`
9. out: `AGENTS.md` (comandos e regras) e `.specs/STATE.md` (AD-040 substitui o trecho de caminhos do AD-017)

## Impact

| Front | What changes |
| --- | --- |
| domain | nenhum termo do domínio muda; namespaces `One.Api.*` e `One.Api.Tests` continuam iguais |
| repositório | `api/` → `One.Api/` e `api.Tests/` → `One.Api.Tests/`; quem tiver branch aberta a partir de antes do rename precisa rebasear (hoje só existe `origin/main`) |
| decisões | AD-017 cita `api/<Fatia>/`, `api/Dados/` e `api/*.cs`: o AD-040 troca só esses caminhos, a regra das fatias fica |
| migrations | `api/Dados/Migracoes/` muda de pasta sem mudar conteúdo; namespace igual, então o EF não vê diferença e nenhuma migration nova é gerada |
| documentos | `AGENTS.md` (comandos `dotnet test`, `--project`, regras com caminho) é atualizado; `ROADMAP.md` e as features fechadas em `.specs/features/` ficam como estão, porque registram o que era verdade quando foram escritos |
| ferramentas locais | user secrets não mudam (`UserSecretsId` está no `.csproj`); `.idea/` e `bin/obj` são locais e se refazem no próximo build |
| stored data | nada a migrar |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside; as rotas HTTP, a imagem Docker (`One.Api.dll` na porta 8080) e o `docker-compose.yml` (`build: .`) não mudam de contrato

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. Layout das pastas do repositório | `One.slnx`, `One.Api/One.Api.csproj`, `One.Api.Tests/One.Api.Tests.csproj`, `web/package.json`, tudo na raiz | `src/One.Api/` + `tests/One.Api.Tests/`: a Microsoft não exige, é costume de repositório com muitos projetos, e aqui são dois; acrescenta um nível a todo caminho relativo sem ganho. Renomear os projetos para `One.Tests`/`One.Web`: `One.Tests` não diz o que testa (o padrão é `<ProjetoTestado>.Tests`), e `web/` é pacote npm, que exige nome minúsculo |
| 2. AD-040 em `.specs/STATE.md` | "Folders are named after their project: `One.Api/` (`One.Api.<Fatia>`), `One.Api.Tests/`, `web/` unchanged; supersedes only the paths in AD-017" | Editar o AD-017 no lugar: decisão aprovada não se reescreve; o histórico perderia quando o caminho mudou |

- Nothing else in this change is hard to reverse

## Criteria

### S1: as pastas têm o nome do projeto e tudo continua de pé (P1)

O repositório tem o layout novo e cada caminho que o build, os testes, o Docker e o `web/` usam aponta para ele.

**Acceptance Criteria**

1. The repository SHALL contain `One.Api/One.Api.csproj` and `One.Api.Tests/One.Api.Tests.csproj` and SHALL NOT contain the folders `api/` or `api.Tests/`
2. The solution `One.slnx` SHALL list exactly the projects `One.Api.Tests/One.Api.Tests.csproj` and `One.Api/One.Api.csproj`, and the file `web/package.json`
3. WHEN `dotnet build One.slnx` runs THEN the build SHALL exit 0
4. WHEN `dotnet test One.Api.Tests` runs THEN every test SHALL pass, with the same test count as `dotnet test api.Tests` on the base commit
5. WHEN `npm --prefix web run build` runs THEN the system SHALL write `One.Api/wwwroot/index.html`
6. WHEN `docker compose up -d --build` runs THEN the `api` container SHALL answer `GET http://localhost:8080/` with status 200 serving the SPA
7. WHEN `dotnet ef migrations has-pending-model-changes --project One.Api` runs THEN the tool SHALL report no pending model changes
8. The rename SHALL keep the namespaces: no `.cs` file under `One.Api/` or `One.Api.Tests/` SHALL differ from its base version except in the lines that hold a folder path
9. The folder `One.Api/wwwroot/` SHALL be ignored by git and excluded from the Docker build context, as `api/wwwroot/` was

**Independent test:** clone limpo da branch, `dotnet test One.Api.Tests`, `npm --prefix web run build` e `docker compose up -d --build`; abrir http://localhost:8080.

### S2: as regras e os comandos escritos batem com o layout (P1)

Quem segue o `AGENTS.md` ou o `STATE.md` encontra os caminhos certos.

**Acceptance Criteria**

10. The `AGENTS.md` SHALL reference `One.Api` and `One.Api.Tests` in every command and path rule, and SHALL NOT contain `api.Tests` or a path starting with `api/`
11. The `.specs/STATE.md` SHALL hold an active AD-040 with the folder layout of door 1, and AD-017's status SHALL say that its paths are superseded by AD-040
12. The architecture tests SHALL read the slices from `One.Api/` and the test classes from `One.Api.Tests/`, keeping every assertion they have today

**Independent test:** `grep -nE "api\.Tests|\`api/" AGENTS.md` não acha nada; `ArquiteturaTests` passa.

## Out of scope

| Excluded | Why |
| --- | --- |
| Pastas `src/` e `tests/` | rejeitado na door 1; dois projetos não pedem |
| Renomear `web/` ou o pacote npm | não é projeto .NET; npm exige minúsculas |
| Trocar namespaces, assembly ou nome dos `.csproj` | já seguem o padrão da Microsoft |
| Reescrever caminhos em `ROADMAP.md` e nas features fechadas | são registro histórico |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quando fazer | agora, antes do congelamento de 17/11 | só existe `origin/main` e nenhuma feature em construção (Handoff), então o rename não conflita com ninguém; depois de 17/11 está congelado | n |
| `.idea/` (Rider) local | não versionado; cada pessoa reabre a solução | está fora do git | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| command `dotnet build` / `dotnet test` | saída e exit code | AC 3, AC 4 |
| command `npm --prefix web run build` | onde grava a saída | AC 5 |
| command `docker compose up -d --build` | a imagem sobe e serve a SPA | AC 6 |
| command `dotnet ef migrations` | `--project` novo, sem migration fantasma | AC 7 |
| document `AGENTS.md` | o leitor roda os comandos como estão escritos | AC 10 |
| document `.specs/STATE.md` | a decisão nova e a antiga ficam rastreáveis | AC 11 |
| API HTTP | contrato, erros, autorização, rate limit | n/a - nenhuma rota muda; a suíte inteira passando (AC 4) inclui o retrato de rotas em `RetratoTests` |
| screen | estados vazio, carregando, erro | n/a - nenhuma tela muda |

## Sources

- Microsoft Learn, "Unit testing C# in .NET using dotnet test and xUnit" - pasta com o nome do projeto, testes em `<Projeto>.Tests`
- Microsoft Learn, "Names of Assemblies and DLLs" e "Program organization" - `<Company>.<Component>`, namespace raiz = nome do projeto
