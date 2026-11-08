# Pastas no padrão .NET verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 0fd86f1..e734f9b
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Os 16 checks passam em `e734f9b`, e a lacuna da rodada 1 (`web/e2e/identidade.spec.ts`) está fechada. O FAIL vem de uma linha do Coverage: o C16 afirma que os ADs ativos que escrevem `api/` são quatro (AD-005, AD-017, AD-018, AD-024), mas o `git grep` acha um quinto, o AD-019, que continua `active` com `api/` e sem a marca `superseded by AD-040`. Nenhum check o prova. Seções marcadas `carried from 85f8f47` não foram tocadas pela correção (`git diff 85f8f47 e734f9b` mexe em 10 arquivos: `GLOSSARIO.md`, `STATE.md`, `ArquiteturaTests.cs` só em 4 comentários, `identidade.spec.ts`, `aparencia.tsx`, `estrutura.test.ts`, `interface.test.ts` e os `.specs/features`).

## Checks

Todas as provas rodaram de novo em `e734f9b`. Ressalva da "prova rodada": `ok<N>` significa a prova inteira com exit 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | nada rastreado em `api/` e `api.Tests/`; os dois `.csproj` existem (verified at e734f9b) | `test -z "$(git ls-files api/ api.Tests/)" && test -f ... && test -f ...` -> `ok1`; `ArquiteturaTests.Layout_e_compose` Aprovado (`/tmp/fulltest2.txt`) | `One.Api.Tests/ArquiteturaTests.cs:96` - `Assert.True(File.Exists(Path.Combine(raiz, "One.Api", "One.Api.csproj")))` e `:97` - `Assert.True(File.Exists(Path.Combine(raiz, "One.Api.Tests", "One.Api.Tests.csproj")))` | PASS |
| C2 | `One.slnx` lista exatamente os 2 projetos e `web/package.json` (verified at e734f9b) | `Dois_projetos_sem_repositorio` e `Layout_e_compose` Aprovado no log do `dotnet test One.Api.Tests` | `ArquiteturaTests.cs:95` - `Assert.True(File.Exists(Path.Combine(raiz, "web", "package.json")))`; `:639` é o método `Dois_projetos_sem_repositorio` (corpo comparando a lista de `<Project Path>` com `One.Api.Tests/One.Api.Tests.csproj`, `One.Api/One.Api.csproj`, carried from 85f8f47 `:642`) | PASS |
| C3 | `dotnet build One.slnx` sai 0 com CA1502 ligado | `dotnet build One.slnx` -> `6 Aviso(s)  0 Erro(s)`, `Build succeeded.` | saída do comando; `Barreira_de_complexidade_configurada` Aprovado no log | PASS |
| C4 | `dotnet test One.Api.Tests` inteiro, 581 como na base | `dotnet test One.Api.Tests --logger "console;verbosity=normal"` exit 0: `Total de testes: 581  Aprovados: 581` (582 linhas contendo "Aprovado": 581 testes + a linha de resumo) | `One.Api.Tests/RetratoTests.cs:20`, `ProvedorTests.cs:69,157,161`, `PlataformaTests.cs:484` com `One.Api` (carried from 85f8f47, arquivos não tocados pela correção); 581 = `## Handoff` de `checks.md` | PASS |
| C5 | `npm --prefix web run build` grava `One.Api/wwwroot/index.html` | `rm -rf One.Api/wwwroot && npm --prefix web run build && test -f One.Api/wwwroot/index.html` -> `../One.Api/wwwroot/sw.js` gerado, `ok5` | `web/vite.config.ts:40` - `build: { outDir: '../One.Api/wwwroot', emptyOutDir: true }` | PASS |
| C6 | imagem refeita responde 200 com a SPA na 8080 | `docker compose up -d --build api && sleep 15 && curl ... http://localhost:8080/` -> 200 e `grep -q '<div id="root">'`, `ok6` | `Dockerfile` (carried from 85f8f47 `:11-14,19,22`; a correção não o tocou); prova é o status 200 + `<div id="root">` | PASS |
| C7 | EF sem mudança de modelo pendente | `dotnet tool restore && dotnet ef migrations has-pending-model-changes --project One.Api` -> `No changes have been made to the model since the last migration.`, exit 0 | saída do comando | PASS |
| C8 | nenhum `namespace`/`using` muda; só 5 `.cs` com conteúdo diferente | prova 1 `ok8a`; prova 2 imprime exatamente `One.Api.Tests/ArquiteturaTests.cs One.Api.Tests/Infra/OneFactory.cs One.Api.Tests/PlataformaTests.cs One.Api.Tests/ProvedorTests.cs One.Api.Tests/RetratoTests.cs ` (`ok8b`) | `git diff 85f8f47 e734f9b -- One.Api.Tests/ArquiteturaTests.cs`: 4 linhas `-`/`+`, todas comentário (`// refatoracao-solid: regras de texto sobre o código de One.Api/, ...`, `// C6 ...do One.Api/`, `// arquivos-minio C20 ... código do One.Api/`, `// web-push C17 ... lido num só lugar do One.Api/`); nenhuma linha de lógica | PASS |
| C9 | `One.Api/wwwroot/` ignorada e fora do contexto Docker; `api/wwwroot` sumiu | `git check-ignore -q One.Api/wwwroot/index.html && grep -qx 'One.Api/wwwroot' .dockerignore && ! grep -q '^api/wwwroot' .gitignore .dockerignore` -> `ok9` | `.gitignore:5` - `One.Api/wwwroot/` | PASS |
| C10 | scripts de `web/apresentacao` usam `One.Api` | prova inteira `ok10` | `web/apresentacao/preparar.ts:77` - `{ cwd: path.join(Raiz, 'One.Api'), ...}`; `web/apresentacao/tts.ts:31` - `'--project', path.join(Raiz, 'One.Api')` | PASS |
| C11 | em `web/src` mudam só 3 arquivos e toda linha mudada cita a pasta | prova 1 `ok11a` (`web/src/aparencia.tsx web/src/test/estrutura.test.ts web/src/test/interface.test.ts`); prova 2 `ok11b` (nenhuma linha `+`/`-` sem `api/` ou `One.Api/`) | `web/src/test/interface.test.ts:116` - `const assets = '../One.Api/wwwroot/assets'`; `web/src/aparencia.tsx:93` e `web/src/test/estrutura.test.ts:3` com `One.Api/` em comentário | PASS |
| C12 | `AGENTS.md` com `dotnet test One.Api.Tests` e `--project One.Api`, sem `api.Tests` nem `api/` | prova inteira `ok12` | `grep -nE 'api\.Tests\|(^\|[` (])api/\|--project api' AGENTS.md` sem saída | PASS |
| C13 | AD-040 `active` com o layout; AD-017 `superseded by AD-040` | prova inteira `ok13` | `.specs/STATE.md:46` - `AD-040 \| Folders are named after their project ... \| active \| 2026-11-08`; `:23` - `...the `api/` paths superseded by AD-040` | PASS |
| C14 | testes de arquitetura leem `One.Api/` e `One.Api.Tests/`; 2280 `Assert.` | `dotnet test` inteiro (60 linhas `ArquiteturaTests` Aprovado); `git grep -c 'Assert\.' HEAD -- One.Api.Tests \| awk ...` -> `2280` | `ArquiteturaTests.cs:96-97` (mesmos `Assert.True(File.Exists(...))` do C1) e o diff da correção só troca comentário | PASS |
| C15 | os dois testes do `web/` que olham a saída do build leem `One.Api/wwwroot/assets` e passam; nada em `web/` cita `../api/` | prova 1 `ok15a` (`! git grep -n '\.\./api/' -- web` sem saída); prova 2: `npm --prefix web run build && test -d One.Api/wwwroot/assets && npx vitest run src/test/interface.test.ts -t "sem biblioteca de gráfico"` -> `Tests  1 passed \| 24 skipped (25)`; prova 3: `docker compose up -d --build api && npx playwright test e2e/identidade.spec.ts -g "fontes latin no precache"` -> `1 passed` | `web/src/test/interface.test.ts:116-117` - `const assets = '../One.Api/wwwroot/assets'` / `expect(existsSync(assets) ? readdirSync(assets).filter((f) => f.startsWith('Grafico-')) : []).toEqual([])`; `web/e2e/identidade.spec.ts:323-324` - ``const pasta = `${process.cwd()}/../One.Api/wwwroot/assets` `` / `expect(existsSync(pasta)).toBe(true)`; os dois testes foram tocados pela correção (`git diff 85f8f47 e734f9b`) | PASS |
| C16 | textos vivos citam `One.Api/`; ADs ativos com `api/` marcados `superseded by AD-040` | prova 1 `ok16a` (`! git grep -nE '(^\|[^A-Za-z./])api/' -- GLOSSARIO.md aparencia.tsx estrutura.test.ts ArquiteturaTests.cs` sem saída); prova 2 -> `4` | `.specs/STATE.md:11,23,24,30` terminam em `superseded by AD-040` (AD-005, AD-017, AD-018, AD-024); `.specs/GLOSSARIO.md` com `One.Api/Dados/Entidades.cs` e `One.Api/Prazos.cs`. A afirmação "os ADs ativos que escrevem `api/` (AD-005, AD-017, AD-018, AD-024)" é a que o Coverage abaixo derruba | PASS (a prova do check passa; ver Coverage) |

## Coverage

Recomputado em `e734f9b` por `git grep -nE '(^|[^A-Za-z0-9./_-])api/|api\.Tests|\.\./api|--project api|"api"|'"'api'"` sobre todo o repositório, exceto `.specs/features/`, `ROADMAP.md`, `.specs/LESSONS.md`, `.specs/lessons.json`, `web/package-lock.json` e as migrations. Saída inteira lida: os únicos resultados fora dos ADs são `import ... from '../api'` em 13 arquivos de `web/src`, que é o módulo TypeScript `web/src/api.ts` e não a pasta; um segundo `git grep` com `api[\\/]`, `api\.Tests` e `../api/` fora de `STATE.md` saiu 1 (zero linhas). Resíduos em `.specs/STATE.md`: AD-005 (`:11`), AD-017 (`:23`), AD-018 (`:24`), AD-024 (`:30`), todos com `superseded by AD-040`; AD-040 (`:46`) e a linha `Next step` (`:52`), que citam as pastas antigas de propósito (decisão e histórico); e **AD-019 (`:25`)**, sem marca.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| lugares que guardam a pasta (14) | `git grep` no HEAD | `One.slnx` C2 · `ProjectReference` C3 · `vite.config.ts:40` C5 · `Dockerfile` C6 · `.gitignore:5` C9 · `.dockerignore` C9 · `ArquiteturaTests` C14 · `PlataformaTests` C4 · `ProvedorTests` C4 · `RetratoTests` C4 · `preparar.ts:77` C10 · `tts.ts:31` C10 · `interface.test.ts:116` C15 · `identidade.spec.ts:323` C15 (as 14 batem com o repositório; nenhum 15o achado) | - |
| textos vivos com a pasta (7 no repositório, 6 na tabela do autor) | `git grep` no HEAD | `GLOSSARIO.md` C16 · `aparencia.tsx` C16 · `estrutura.test.ts` C16 · `ArquiteturaTests.cs` C16 · AD-005, AD-017, AD-018, AD-024 C16 · `AGENTS.md` C12 | `.specs/STATE.md:25` AD-019: `active` e diz "`api/` moves to full vertical slice" sem `superseded by AD-040`; o AD-040 promete superar "the `api/` and `api.Tests/` paths written in active decisions" e o C16 afirma serem só 4. Nenhum check o cobre (a prova 2 do C16 conta exatamente 4) |
| montagens da API (3) | `Program`/`OneFactory`/`Dockerfile` | build local C3 · `WebApplicationFactory` C4 (581/581) · imagem Docker C6 (200 + `<div id="root">`) | - |
| doors do Landing (2) | `plan.md` Landing | layout das pastas C1, C2 · AD-040 C13 | - |
| documentos com comando ou regra (2) | `AGENTS.md`, `STATE.md` | `AGENTS.md` C12 · `STATE.md` C13 | - |
| testes do web que leem a saída do build (2) | `git grep -n 'wwwroot' -- web/src web/e2e` | Vitest "sem biblioteca de gráfico" C15 · e2e "fontes latin no precache" C15 | - |

Fraqueza do teste, não membro: o Vitest `interface.test.ts:117` usa `existsSync(assets) ? ... : []`. Com o caminho errado ou sem build, o `expect` compara `[]` com `[]` e passa vazio (F1 abaixo). Quem fecha esse buraco é a primeira prova do C15 (o `grep -q "'../One.Api/wwwroot/assets'"`), e a segunda prova só roda depois de `test -d One.Api/wwwroot/assets`; o teste isolado, sozinho, não pega o caminho errado.

## Test policy rows

carried from 85f8f47: sem linhas `Test policy` em `checks.md` (a seção diz "Sem linhas novas"; vale `AGENTS.md ## Testes`). A correção não acrescenta condicional: só caminhos literais e comentários. Nenhuma linha a julgar.

## Faults injected

Worktree `git worktree add /d/wt-verify2 HEAD` (com `One.Api/wwwroot` copiada e junção para `web/node_modules`), removido no fim; `git status --porcelain` da árvore real vazio antes e depois (`diff` igual ao baseline). A seção da rodada 1 (6 falhas em `.gitignore`, `vite.config.ts`, `Dockerfile`, `ArquiteturaTests.cs` x2, `One.slnx`; todas mortas) fica `carried from 85f8f47`, e abaixo estão as novas, nas superfícies que a correção criou.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: `const assets = '../One.Api/wwwroot/assets'` -> `'../api/wwwroot/assets'` | `web/src/test/interface.test.ts:116`; o Vitest sozinho **passa** (`1 passed`, vazio); a prova 1 do C15 (`grep -q "'../One.Api/wwwroot/assets'"`) falha | yes (só pelo `grep` do C15; o teste isolado sobrevive, ver fraqueza no Coverage) |
| F2: um arquivo `Grafico-x.js` plantado em `One.Api/wwwroot/assets` com o caminho certo | `web/src/test/interface.test.ts:117`; Vitest -> `1 failed` | yes |
| F3: `/../One.Api/wwwroot/assets` -> `/../api/wwwroot/assets` | `web/e2e/identidade.spec.ts:323`; `playwright ... -g "fontes latin no precache"` -> `Expected: true  Received: false`, `1 failed`; o `grep` do C15 também falha | yes |
| F4: AD-024 perde `; the `api/` paths superseded by AD-040` | `.specs/STATE.md:30`; prova 2 do C16 imprime `3` (esperado `4`) | yes |
| F5: AD-040 `active` -> `proposed` | `.specs/STATE.md:46`; prova do C13 sai 1 | yes |

## Gate

`dotnet test One.Api.Tests` - 581 passed, 0 failed (`Total de testes: 581`, `Aprovados: 581`, 2,65 min). `dotnet build One.slnx` - 0 erros. `npm --prefix web run build` - ok. Vitest `interface.test.ts -t "sem biblioteca de gráfico"` - 1 passed. Playwright `identidade.spec.ts -g "fontes latin no precache"` - 1 passed (8080 com a imagem refeita, `200` e `<div id="root">`).

## Ranked gaps

1. `.specs/STATE.md:25` (AD-019, `active`) ainda escreve "`api/` moves to full vertical slice" sem `superseded by AD-040`; o C16 e o AD-040 contam só AD-005, AD-017, AD-018 e AD-024. Correção: acrescentar a marca ao status do AD-019 (e ajustar o C16 para 5, o que pede parar e perguntar, porque checks aprovados não mudam).
2. `web/src/test/interface.test.ts:117` passa vazio com o caminho errado (`existsSync(assets) ? ... : []`); hoje só o `grep` do C15 protege, então um futuro rename quebraria sem o Vitest acusar. Não bloqueia: a prova do C15 mata a falha F1.
