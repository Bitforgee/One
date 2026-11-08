# Pastas no padrão .NET verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 0fd86f1..85f8f47
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Todos os 14 checks passam, mas a recomputação do Coverage achou um lugar que ainda guarda a pasta `api/` e que o plano e a tabela de Coverage do autor não listaram: `web/e2e/identidade.spec.ts:323`. O e2e correspondente quebra de verdade (saída abaixo). Pelas regras do verify.md, um membro não provado fecha o veredito em FAIL.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | nada rastreado em `api/` e `api.Tests/`; os dois `.csproj` novos existem | `test -z "$(git ls-files api/ api.Tests/)" && test -f One.Api/One.Api.csproj && test -f One.Api.Tests/One.Api.Tests.csproj` exit 0; `ls -d api api.Tests` = "No such file"; `ArquiteturaTests.Layout_e_compose` Aprovado (`/tmp/fulltest.txt:61`) | `One.Api.Tests/ArquiteturaTests.cs:96` - `Assert.True(File.Exists(Path.Combine(raiz, "One.Api", "One.Api.csproj")))` e `:97` - `Assert.True(File.Exists(Path.Combine(raiz, "One.Api.Tests", "One.Api.Tests.csproj")))` | PASS |
| C2 | `One.slnx` lista exatamente os 2 projetos e `web/package.json` | `ArquiteturaTests.Dois_projetos_sem_repositorio` Aprovado (`:33` do log) e `Layout_e_compose` Aprovado; `cat One.slnx` mostra as 2 linhas `<Project Path>` e `web/package.json` | `ArquiteturaTests.cs:642` - `Assert.Equal(["One.Api.Tests/One.Api.Tests.csproj", "One.Api/One.Api.csproj"], projetos.Order(StringComparer.Ordinal))`; `:92-94` - `Assert.Contains("One.Api/One.Api.csproj", solucao)` etc. | PASS |
| C3 | `dotnet build One.slnx` sai 0 com CA1502 ligado | `dotnet build One.slnx` -> `6 Aviso(s)  0 Erro(s)`, exit 0 | saída do comando; `ArquiteturaTests.Barreira_de_complexidade_configurada` (que lê `CodeMetricsConfig.txt` em `One.Api/`, `ArquiteturaTests.cs:260`) Aprovado | PASS |
| C4 | `dotnet test One.Api.Tests` inteiro, mesmo total da base (581) | `dotnet test One.Api.Tests --logger "console;verbosity=normal"` exit 0: `Total de testes: 581  Aprovados: 581` (`Aprovado` x581 no log) | `One.Api.Tests/RetratoTests.cs:20` - `Path.Combine(ArquiteturaTests.Raiz(), "One.Api.Tests", "Retratos", nome)`; `ProvedorTests.cs:69,157,161` - `Path.Combine(raiz, "One.Api", ...)`; `PlataformaTests.cs:484` - `Path.Combine(ArquiteturaTests.Raiz(), "One.Api")`; 581 = valor de `## Handoff` | PASS |
| C5 | `npm --prefix web run build` grava `One.Api/wwwroot/index.html` | `rm -rf One.Api/wwwroot && npm --prefix web run build && test -f One.Api/wwwroot/index.html` -> `../One.Api/wwwroot/sw.js` gerado, `ok5` | `web/vite.config.ts:40` - `build: { outDir: '../One.Api/wwwroot', emptyOutDir: true }` | PASS |
| C6 | imagem refeita responde 200 com a SPA na 8080 | `docker compose up -d --build api && sleep 15 && curl -s -o /tmp/spa.html -w '%{http_code}' http://localhost:8080/` -> `http 200`; `grep -c '<div id="root">' /tmp/spa.html` -> `1` | `Dockerfile:11-14,19,22` - `COPY One.Api/One.Api.csproj One.Api/`, `RUN dotnet publish One.Api/One.Api.csproj ...`, `COPY --from=web /src/One.Api/wwwroot ./wwwroot`, `ENTRYPOINT ["dotnet", "One.Api.dll"]` | PASS |
| C7 | EF sem mudança de modelo pendente | `dotnet tool restore && dotnet ef migrations has-pending-model-changes --project One.Api` -> `No changes have been made to the model since the last migration.`, exit 0 | saída do comando | PASS |
| C8 | nenhum `namespace`/`using` muda; só 5 `.cs` com conteúdo diferente | prova 1 (`git diff -M 0fd86f1 HEAD -- '*.cs' \| grep ...`) vazia, `ok8a`; prova 2 imprime exatamente `One.Api.Tests/ArquiteturaTests.cs One.Api.Tests/Infra/OneFactory.cs One.Api.Tests/PlataformaTests.cs One.Api.Tests/ProvedorTests.cs One.Api.Tests/RetratoTests.cs ` (igual ao esperado) | diff por arquivo (`git diff 0fd86f1:api.Tests/<f> HEAD:One.Api.Tests/<f>`): só linhas com caminho (`"api"` -> `"One.Api"`, `"api.Tests"` -> `"One.Api.Tests"`, `slnx` strings) e um comentário em `OneFactory.cs`; nenhuma linha de lógica | PASS |
| C9 | `One.Api/wwwroot/` ignorada e fora do contexto Docker; `api/wwwroot` sumiu | `git check-ignore -q One.Api/wwwroot/index.html && grep -qx 'One.Api/wwwroot' .dockerignore && ! grep -q '^api/wwwroot' .gitignore .dockerignore` -> `ok9` | `.gitignore:5` - `One.Api/wwwroot/`; `.dockerignore` - linha `One.Api/wwwroot` | PASS |
| C10 | scripts de `web/apresentacao` usam `One.Api` | prova inteira exit 0 (`ok10`) | `web/apresentacao/preparar.ts:77` - `{ cwd: path.join(Raiz, 'One.Api'), ...}`; `web/apresentacao/tts.ts:31` - `'--project', path.join(Raiz, 'One.Api')` | PASS |
| C11 | nenhum arquivo em `web/src` muda | `git diff --quiet 0fd86f1 HEAD -- web/src` exit 0 (`ok11`) | `git diff --stat 0fd86f1 HEAD -- . ':!One.Api' ':!One.Api.Tests'` lista só `web/apresentacao/*.ts` e `web/vite.config.ts` no `web/` | PASS |
| C12 | `AGENTS.md` com `dotnet test One.Api.Tests` e `--project One.Api`, sem `api.Tests` nem `api/` | prova inteira exit 0 (`ok12`) | `grep -nE 'api\.Tests\|(^\|[` (])api/\|--project api' AGENTS.md` sem saída | PASS |
| C13 | AD-040 `active` com o layout; AD-017 `superseded by AD-040` | prova inteira exit 0 (`ok13`) | `.specs/STATE.md:46` - `AD-040 \| Folders are named after their project ... \| active \| 2026-11-08`; `:23` - `... the `api/` paths superseded by AD-040` | PASS |
| C14 | testes de arquitetura leem `One.Api/` e `One.Api.Tests/`; 2280 `Assert.` | `dotnet test One.Api.Tests` (inclui 60 testes `ArquiteturaTests`, todos Aprovado); `git grep -c 'Assert\.' HEAD -- One.Api.Tests \| awk ...` -> `2280` | `ArquiteturaTests.cs:74` e `:124` - `Path.Combine(Raiz(), "One.Api")`; diff de `ArquiteturaTests.cs` contra a base não remove nem adiciona linha com `Assert.` além de trocar o texto do caminho | PASS |

## Coverage

Recomputado por `git grep` no HEAD por tudo que ainda cita `api/`, `api.Tests`, `--project api`, `"api"` ou `../api` como caminho, fora de `.specs/features/` e `ROADMAP.md` (e de `web/package-lock.json`).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| lugares que guardam a pasta (12 na tabela do autor, 13 no repositório) | `git grep` no HEAD | `One.slnx` C2 · `ProjectReference` `One.Api.Tests.csproj:23` C3 · `vite.config.ts:40` C5 · `Dockerfile` C6 · `.gitignore:5` C9 · `.dockerignore` C9 · `ArquiteturaTests` C14 · `PlataformaTests` C4 · `ProvedorTests` C4 · `RetratoTests` C4 · `preparar.ts:77` C10 · `tts.ts:31` C10 · **`web/e2e/identidade.spec.ts:323`: sem check** | `web/e2e/identidade.spec.ts:323` ainda lê `${process.cwd()}/../api/wwwroot/assets`; rodei `npx playwright test e2e/identidade.spec.ts -g "fontes latin no precache"` e falhou em `:324` com `expect(existsSync(pasta)).toBe(true)`, `Expected: true  Received: false` (a API da 8080 estava de pé). Nem o plano (Flow, hop 8) nem a tabela de Coverage citam esse arquivo |
| montagens da API (3) | `Program`/`OneFactory`/`Dockerfile` | build local C3 · `WebApplicationFactory` C4 (581/581) · imagem Docker C6 (200 + `<div id="root">`) | - |
| doors do Landing (2) | `plan.md` Landing | layout das pastas C1, C2 · AD-040 C13 | - |
| documentos com comando ou regra (2 na tabela; 4 no repositório) | `git grep` no HEAD | `AGENTS.md` C12 · `STATE.md` AD-017 e AD-040 C13 | note, nao bloqueia: `.specs/STATE.md:11` (AD-005, `api/`) e `:24` (AD-018, `api/` e `api/CodeMetricsConfig.txt`) continuam `active` com caminho antigo e o AD-040 só declara superar o AD-017; `.specs/GLOSSARIO.md:4,5,51,66` cita `api/Dados/Entidades.cs`, `api/Prazos.cs`, `api/Armazenamento.cs`, `api/Instituicoes/`; comentários em `web/src/aparencia.tsx:93` e `web/src/test/estrutura.test.ts:3`. Nenhum desses é lido por um teste como caminho (o `GLOSSARIO` é lido só pelas linhas de tabela em `ArquiteturaTests.cs:237`), então ficam como lacuna de documento, nao de prova |

Risco que o verificador investigou (enumeração vazia): com o caminho errado e uma pasta antiga `api/` só com `bin/` presente, a enumeração dá zero arquivos. Provado na injeção F4b: `ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando` com `"api"` e `api/bin/x.txt` **passa vazio** (`Assert.All` sobre lista vazia, `ArquiteturaTests.cs:80`). Sem a pasta antiga ele falha (`DirectoryNotFound`). O `git mv` levou `bin/obj` junto, então no HEAD limpo a pasta antiga não existe e o risco só aparece numa máquina com sobra de `api/`; a suíte `ArquiteturaTests` inteira ainda reprova nesse cenário (F4a, 30+ falhas) porque os outros testes leem arquivos nomeados.

## Test policy rows

Sem linhas `Test policy` em `checks.md` (a seção diz "Sem linhas novas"; vale `AGENTS.md ## Testes`). Nenhum ponto de decisão novo: 0 condicionais novos, só caminhos literais (confirmado em C8). Nenhuma linha a julgar.

## Faults injected

Worktree `git worktree add /d/wt-verify HEAD`, removido no fim; `git status --porcelain` da árvore real igual ao baseline (vazio) antes e depois.

| Mutation | Location | Killed |
| --- | --- | --- |
| `.gitignore` volta a `api/wwwroot/` | `.gitignore:5`; prova C9 (`git check-ignore -q One.Api/wwwroot/index.html`) falha: "not ignored" | yes |
| `outDir` do Vite volta a `'../api/wwwroot'` | `web/vite.config.ts:40`; prova C5: o build grava `api/wwwroot/sw.js` e `test -f One.Api/wwwroot/index.html` falha | yes |
| `COPY One.Api/One.Api.csproj` -> `COPY api/One.Api.csproj` | `Dockerfile:11`; `docker build` sai 1: `"/api/One.Api.csproj": not found` (mesmo Dockerfile do `docker compose up --build` do C6) | yes |
| F4a: `Api` aponta para `"api"` (com `api/bin/x.txt` existente) | `One.Api.Tests/ArquiteturaTests.cs:124`; `dotnet test --filter ArquiteturaTests` -> dezenas de `Com falha` (ex.: `Fatias_do_api`, `Um_arquivo_por_caso_de_uso`, `Barreira_de_complexidade_configurada`) | yes |
| F4b: `var api` do teste `IgnoreQueryFilters_so_no_agendador_e_no_comando` aponta para `"api"` com `api/bin/x.txt` existente | `ArquiteturaTests.cs:74`; esse teste isolado **passa** (1/1) com a pasta velha vazia e falha (1/1) sem ela | yes (a prova do check, o filtro `ArquiteturaTests` inteiro, reprova pela F4a; o teste isolado tem a fraqueza descrita no Coverage) |
| linha do `One.Api.Tests` removida de `One.slnx` | `One.slnx:3`; `ArquiteturaTests.Layout_e_compose` e `Dois_projetos_sem_repositorio` falham (2/2 `Com falha`) | yes |

## Gate

`dotnet test One.Api.Tests` - 581 passed, 0 failed (`Total de testes: 581`, `Aprovados: 581`, 2,37 min). `dotnet build One.slnx` - 0 erros. `npx playwright test e2e/identidade.spec.ts -g "fontes latin no precache"` - 1 failed (a falha do Coverage acima; fora dos 14 checks).

## Ranked gaps

1. `web/e2e/identidade.spec.ts:323` aponta para `../api/wwwroot/assets` e quebra o e2e `PWA > fontes latin no precache com até 90 KB`; nenhum check cobre os e2e (o plano e o Coverage deixaram o arquivo de fora). Correção sugerida: `../One.Api/wwwroot/assets`, mais um check novo que cubra `web/e2e` (nota: checks aprovados não mudam, então isso pede parar e perguntar).
2. `.specs/STATE.md:11` (AD-005) e `:24` (AD-018) seguem `active` com `api/` e `api/CodeMetricsConfig.txt`; o AD-040 só diz superar o AD-017. Não bloqueia prova.
3. `.specs/GLOSSARIO.md:4,5,51,66` cita `api/...`; comentários em `web/src/aparencia.tsx:93`, `web/src/test/estrutura.test.ts:3` e `ArquiteturaTests.cs:123,256,987,1085`. Só texto.
4. `IgnoreQueryFilters_so_no_agendador_e_no_comando` (`ArquiteturaTests.cs:80`) passa vazio se sobrar uma pasta `api/` local sem `.cs`; suíte inteira cobre, então é só fraqueza do teste isolado.
