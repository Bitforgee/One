# Pastas no padrão .NET verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 0fd86f1..3996f4a
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Os 16 checks passam em `3996f4a` e o motivo do FAIL da rodada 2 está fechado: o AD-019 (`.specs/STATE.md:25`) agora termina em `the `api/` paths superseded by AD-040` e o C16 conta 5. O FAIL desta rodada vem de uma falha injetada que sobrevive: o texto do AD-040 (`.specs/STATE.md:46`) enumera "AD-005, AD-017, AD-018, AD-019, AD-024" como os ADs que ele substitui, e nenhuma prova lê essa lista (F2 abaixo). A correção `e734f9b..3996f4a` mexe só em `.specs/` (STATE.md 4 linhas, checks.md, plan.md, verification.md), então tudo que lê código está `carried from e734f9b`.

## Checks

Todas as provas rodaram de novo em `3996f4a`. `okN` significa a prova inteira com exit 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | nada rastreado em `api/` e `api.Tests/`; os dois `.csproj` existem | `test -z "$(git ls-files api/ api.Tests/)" && test -f ... && test -f ...` -> `ok1`; `ArquiteturaTests` 60 de 60 Aprovado, com `Layout_e_compose` listado | `One.Api.Tests/ArquiteturaTests.cs:96` - `Assert.True(File.Exists(Path.Combine(raiz, "One.Api", "One.Api.csproj")))` e `:97` - `Assert.True(File.Exists(Path.Combine(raiz, "One.Api.Tests", "One.Api.Tests.csproj")))` (carried from e734f9b) | PASS |
| C2 | `One.slnx` lista exatamente os 2 projetos e `web/package.json` | `Dois_projetos_sem_repositorio` e `Layout_e_compose` listados `Aprovado` com `--logger "console;verbosity=normal"` | `ArquiteturaTests.cs:95` - `Assert.True(File.Exists(Path.Combine(raiz, "web", "package.json")))`; `:639` método `Dois_projetos_sem_repositorio` (carried from e734f9b) | PASS |
| C3 | `dotnet build One.slnx` sai 0 com CA1502 ligado | `dotnet build One.slnx` -> `0 Aviso(s)`, `0 Erro(s)`, `Build succeeded.` | saída do comando; `Barreira_de_complexidade_configurada` listado `Aprovado` | PASS |
| C4 | `dotnet test One.Api.Tests` inteiro, 581 como na base | `dotnet test One.Api.Tests` exit 0: `Aprovado!  – Com falha: 0, Aprovado: 581, Ignorado: 0, Total: 581, Duração: 2 m 35 s`; `ArquiteturaRagTests.Decisoes_registradas` (lê o `STATE.md`) listado `Aprovado` | `One.Api.Tests/RetratoTests.cs:20`, `ProvedorTests.cs:69,157,161`, `PlataformaTests.cs:484` com `One.Api` (carried from e734f9b); 581 = `## Handoff` de `checks.md` | PASS |
| C5 | `npm --prefix web run build` grava `One.Api/wwwroot/index.html` | `rm -rf One.Api/wwwroot && npm --prefix web run build && test -f One.Api/wwwroot/index.html` -> `ok5` | `web/vite.config.ts:40` - `build: { outDir: '../One.Api/wwwroot', emptyOutDir: true }` | PASS |
| C6 | imagem refeita responde 200 com a SPA na 8080 | `docker compose up -d --build api && sleep 15 && curl ... http://localhost:8080/` -> 200 e `grep -q '<div id="root">'`, `ok6` | `Dockerfile` (carried from e734f9b `:11-14,19,22`); prova é o status 200 + `<div id="root">` | PASS |
| C7 | EF sem mudança de modelo pendente | `dotnet tool restore && dotnet ef migrations has-pending-model-changes --project One.Api` -> `No changes have been made to the model since the last migration.`, exit 0 | saída do comando | PASS |
| C8 | nenhum `namespace`/`using` muda; só 5 `.cs` com conteúdo diferente | prova 1 `ok8a`; prova 2 imprime exatamente `One.Api.Tests/ArquiteturaTests.cs One.Api.Tests/Infra/OneFactory.cs One.Api.Tests/PlataformaTests.cs One.Api.Tests/ProvedorTests.cs One.Api.Tests/RetratoTests.cs ` (`ok8b`) | `git diff -M 0fd86f1 3996f4a --name-status -- '*.cs'` sem `.cs` novo desde e734f9b (a correção não tocou `.cs`) | PASS |
| C9 | `One.Api/wwwroot/` ignorada e fora do contexto Docker; `api/wwwroot` sumiu | `git check-ignore -q ... && grep -qx 'One.Api/wwwroot' .dockerignore && ! grep -q '^api/wwwroot' .gitignore .dockerignore` -> `ok9` | `.gitignore:5` - `One.Api/wwwroot/` | PASS |
| C10 | scripts de `web/apresentacao` usam `One.Api` | prova inteira `ok10` | `web/apresentacao/preparar.ts:77` - `{ cwd: path.join(Raiz, 'One.Api'), ...}`; `web/apresentacao/tts.ts:31` - `'--project', path.join(Raiz, 'One.Api')` | PASS |
| C11 | em `web/src` mudam só 3 arquivos e toda linha mudada cita a pasta | prova 1 `ok11a`; prova 2 `ok11b` | `web/src/test/interface.test.ts:116` - `const assets = '../One.Api/wwwroot/assets'`; `web/src/aparencia.tsx:93` e `web/src/test/estrutura.test.ts:3` com `One.Api/` em comentário | PASS |
| C12 | `AGENTS.md` com `dotnet test One.Api.Tests` e `--project One.Api`, sem `api.Tests` nem `api/` | prova inteira `ok12` | `grep -nE 'api\.Tests\|(^\|[` (])api/\|--project api' AGENTS.md` sem saída | PASS |
| C13 | AD-040 `active` com o layout; AD-017 `superseded by AD-040` | prova inteira `ok13` | `.specs/STATE.md:46` - `AD-040 \| Folders are named after their project ... \| active \| 2026-11-08`; `:23` - `...the `api/` paths superseded by AD-040` | PASS |
| C14 | testes de arquitetura leem `One.Api/` e `One.Api.Tests/`; 2280 `Assert.` | `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests"` -> `Aprovado!  – Com falha: 0, Aprovado: 60, Total: 60`; `git grep -c 'Assert\.' HEAD -- One.Api.Tests \| awk ...` -> 2280 (`ok14b`) | `ArquiteturaTests.cs:96-97` (mesmos `Assert.True(File.Exists(...))` do C1) | PASS |
| C15 | os dois testes do `web/` que leem a saída do build leem `One.Api/wwwroot/assets` e passam; nada em `web/` cita `../api/` | prova 1 `ok15a`; prova 2: `npm --prefix web run build && test -d One.Api/wwwroot/assets && npx vitest run src/test/interface.test.ts -t "sem biblioteca de gráfico"` -> `Tests  1 passed \| 24 skipped (25)`; prova 3: `docker compose up -d --build api && npx playwright test e2e/identidade.spec.ts -g "fontes latin no precache"` -> `1 passed` | `web/src/test/interface.test.ts:116-117` - `const assets = '../One.Api/wwwroot/assets'` / `expect(existsSync(assets) ? readdirSync(assets).filter((f) => f.startsWith('Grafico-')) : []).toEqual([])`; `web/e2e/identidade.spec.ts:323-324` - ``const pasta = `${process.cwd()}/../One.Api/wwwroot/assets` `` / `expect(existsSync(pasta)).toBe(true)` (carried from e734f9b) | PASS |
| C16 | textos vivos citam `One.Api/`; os 5 ADs ativos com `api/` (AD-005, AD-017, AD-018, AD-019, AD-024) marcados `superseded by AD-040` | prova 1 `ok16a` (`! git grep -nE '(^\|[^A-Za-z./])api/' -- GLOSSARIO.md aparencia.tsx estrutura.test.ts ArquiteturaTests.cs` sem saída); prova 2 -> `5` | `.specs/STATE.md:11,23,24,25,30` terminam em `superseded by AD-040` (AD-005, AD-017, AD-018, AD-019, AD-024); `.specs/GLOSSARIO.md` com `One.Api/Dados/Entidades.cs` e `One.Api/Prazos.cs` | PASS |

## Coverage

Recomputado em `3996f4a` a partir de `.specs/STATE.md` (grep por `api/`, `api.Tests`, `../api`, `--project api`), mais o `git grep` amplo da rodada 2 para o resto do repositório (carried from e734f9b: a correção só tocou `.specs/`). Linhas do `STATE.md` com `api/`: AD-005 (`:11`), AD-017 (`:23`), AD-018 (`:24`), AD-019 (`:25`), AD-024 (`:30`), os cinco `active` com a marca `superseded by AD-040`; AD-032 (`:38`) e AD-033 (`:39`) citam rotas `/api/instituicoes/{slug}` e `/api/plataforma`, não a pasta; AD-040 (`:46`) cita a pasta antiga de propósito, ao descrever o que substitui; a linha `Next step` (`:52`) é histórico. Nenhum outro AD `active` escreve a pasta sem marca. O AD-040 enumera os mesmos 5 (`:46`, `AD-005, AD-017, AD-018, AD-019, AD-024`).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| lugares que guardam a pasta (14) | `git grep` no HEAD (carried from e734f9b) | `One.slnx` C2 · `ProjectReference` C3 · `vite.config.ts:40` C5 · `Dockerfile` C6 · `.gitignore:5` C9 · `.dockerignore` C9 · `ArquiteturaTests` C14 · `PlataformaTests` C4 · `ProvedorTests` C4 · `RetratoTests` C4 · `preparar.ts:77` C10 · `tts.ts:31` C10 · `interface.test.ts:116` C15 · `identidade.spec.ts:323` C15 | - |
| ADs ativos que escrevem a pasta `api/` (5) | `.specs/STATE.md` em `3996f4a` | AD-005 C16 · AD-017 C13 e C16 · AD-018 C16 · AD-019 C16 · AD-024 C16 (prova 2 conta 5; F1 e F3 matam a perda da marca do AD-019) | - |
| ADs que o texto do AD-040 diz substituir (5) | `.specs/STATE.md:46` | os 5 batem em número e nome com as marcas | a lista escrita no AD-040 não tem prova: nenhum check nem teste lê esse trecho (F2 sobrevive) |
| textos vivos com a pasta (6) | `git grep` no HEAD | `GLOSSARIO.md` C16 · `aparencia.tsx` C16 · `estrutura.test.ts` C16 · `ArquiteturaTests.cs` C16 · ADs ativos C16 · `AGENTS.md` C12 | - |
| montagens da API (3) | `Program`/`OneFactory`/`Dockerfile` | build local C3 · `WebApplicationFactory` C4 (581/581) · imagem Docker C6 (200 + `<div id="root">`) | - |
| doors do Landing (2) | `plan.md` Landing | layout das pastas C1, C2 · AD-040 C13 | - |
| documentos com comando ou regra (2) | `AGENTS.md`, `STATE.md` | `AGENTS.md` C12 · `STATE.md` C13 | - |
| testes do web que leem a saída do build (2) | `git grep -n 'wwwroot' -- web/src web/e2e` (carried from e734f9b) | Vitest "sem biblioteca de gráfico" C15 · e2e "fontes latin no precache" C15 | - |

Lacuna 2 da rodada 2 (o Vitest `interface.test.ts:117` passa vazio com caminho errado por causa do `existsSync(assets) ? ... : []`), julgada pelo verify.md: o C15 afirma os dois testes e a leitura do caminho, e a prova 1 do C15 (`grep -q "'../One.Api/wwwroot/assets'"`) mata a falha F1 da rodada 2 (o grep segue na prova 1 e rodou em `ok15a`). Não é mutante vivo do check; o teste isolado continua frouxo, e fica como lacuna menor, não bloqueante. O argumento do autor não foi aceito por estar escrito: foi aceito porque a prova do check mata a falha.

## Test policy rows

carried from e734f9b: sem linhas `Test policy` em `checks.md`; a correção só mexeu em `.specs/` e não acrescenta condicional. Nenhuma linha a julgar.

## Faults injected

Worktree `git worktree add /d/wt-verify3 HEAD`, removido no fim (`git worktree prune`; `git worktree list` mostra só `D:/one-system`). `git status --porcelain` da árvore real vazio antes e depois (`diff` igual ao baseline). As falhas F1-F5 da rodada 2 e as 6 da rodada 1 ficam `carried from e734f9b`: os arquivos que elas tocam não mudaram. Abaixo, as novas, na superfície que a correção criou (marca do AD-019 e lista do AD-040).

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: AD-019 perde `; the `api/` paths superseded by AD-040` | `.specs/STATE.md:25`; prova 2 do C16 imprime `4` (esperado `5`) | yes |
| F2: AD-040 perde `AD-019, ` na lista dos ADs que substitui | `.specs/STATE.md:46`; a prova do C13 segue passando; a prova 2 do C16 segue em 5; `grep -n 'AD-040' One.Api.Tests/*.cs` sem saída, então nenhum teste o lê | no |
| F3: marca do AD-019 vira `superseded by AD-041` | `.specs/STATE.md:25`; prova 2 do C16 imprime `4` (esperado `5`) | yes |

## Gate

`dotnet test One.Api.Tests` - 581 passed, 0 failed (`Total: 581`, 2 m 35 s). `dotnet build One.slnx` - 0 avisos, 0 erros. `npm --prefix web run build` - ok (`One.Api/wwwroot/index.html` e `assets/`). Vitest `interface.test.ts -t "sem biblioteca de gráfico"` - 1 passed. Playwright `identidade.spec.ts -g "fontes latin no precache"` - 1 passed (8080 com a imagem refeita, `200` e `<div id="root">`). `ArquiteturaTests` - 60 passed, 0 failed.

## Ranked gaps

1. `.specs/STATE.md:46` (AD-040) lista "AD-005, AD-017, AD-018, AD-019, AD-024" e nenhuma prova lê essa lista: F2 sobrevive. Um AD sair da lista não deixa check vermelho. Correção: um check de uma linha que compare a lista do AD-040 com as cinco linhas marcadas; checks aprovados não mudam, então isso pede parar e perguntar ao dono, ou registrar o risco aceito em AD, como o AD-036.
2. `web/src/test/interface.test.ts:117` passa vazio com o caminho errado (`existsSync(assets) ? ... : []`); só o `grep` do C15 protege. Não bloqueia: o check mata a falha F1 da rodada 2.
