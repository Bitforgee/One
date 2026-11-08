# Pastas no padrão .NET verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 0fd86f1..4e26541
**Round**: 4 - scoped
**Verifier**: independent sub-agent (author != verifier)

Os 16 checks passam em `4e26541`. O motivo do FAIL da rodada 3 (F2 sobrevivente) está fechado: o C16 ganhou a prova 3, que conta os ADs citados no texto do AD-040 (`.specs/STATE.md:46`), e F2 reinjetada agora morre. O diff `3996f4a..4e26541` mexe só em `checks.md` e `verification.md`, então tudo que lê código está `carried from 3996f4a`; as provas rodaram de novo por inteiro em `4e26541`.

## Checks

Todas as provas rodaram de novo em `4e26541` (`BASE=0fd86f1`). `okN` significa a prova inteira com exit 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | nada rastreado em `api/` e `api.Tests/`; os dois `.csproj` existem | `test -z "$(git ls-files api/ api.Tests/)" && test -f ... && test -f ...` -> `ok1`; `ArquiteturaTests` 60 de 60 `Aprovado`, com `Layout_e_compose` listado | `One.Api.Tests/ArquiteturaTests.cs:96` - `Assert.True(File.Exists(Path.Combine(raiz, "One.Api", "One.Api.csproj")))` e `:97` idem para `One.Api.Tests` (carried from 3996f4a) | PASS |
| C2 | `One.slnx` lista exatamente os 2 projetos e `web/package.json` | `Dois_projetos_sem_repositorio` e `Layout_e_compose` listados `Aprovado` na saída completa do `dotnet test` | `ArquiteturaTests.cs:95` - `Assert.True(File.Exists(Path.Combine(raiz, "web", "package.json")))`; `:639` método `Dois_projetos_sem_repositorio` (carried from 3996f4a) | PASS |
| C3 | `dotnet build One.slnx` sai 0 com CA1502 ligado | `dotnet build One.slnx` -> `0 Erro(s)` (6 avisos CS8604/xUnit2013 já existentes; a rodada 3 leu 0 em build limpo); `Barreira_de_complexidade_configurada` listado `Aprovado` | saída do comando | PASS |
| C4 | `dotnet test One.Api.Tests` inteiro, 581 como na base | `dotnet test One.Api.Tests` exit 0: `Total de testes: 581`, `Aprovados: 581`, `Tempo total: 2,5348 Minutos`; `ArquiteturaRagTests.Decisoes_registradas` listado `Aprovado` | `One.Api.Tests/RetratoTests.cs:20`, `ProvedorTests.cs:69,157,161`, `PlataformaTests.cs:484` com `One.Api` (carried from 3996f4a); 581 = `## Handoff` de `checks.md` | PASS |
| C5 | `npm --prefix web run build` grava `One.Api/wwwroot/index.html` | `rm -rf One.Api/wwwroot && npm --prefix web run build && test -f One.Api/wwwroot/index.html` -> `ok5` | `web/vite.config.ts:40` - `build: { outDir: '../One.Api/wwwroot', emptyOutDir: true }` (carried from 3996f4a) | PASS |
| C6 | imagem refeita responde 200 com a SPA na 8080 | `docker compose up -d --build api && sleep 15 && curl ... http://localhost:8080/` -> 200 e `grep -q '<div id="root">'`, `ok6` | `Dockerfile` (carried from 3996f4a `:11-14,19,22`); prova é o status 200 + `<div id="root">` | PASS |
| C7 | EF sem mudança de modelo pendente | `dotnet tool restore && dotnet ef migrations has-pending-model-changes --project One.Api` -> `No changes have been made to the model since the last migration.`, exit 0 | saída do comando | PASS |
| C8 | nenhum `namespace`/`using` muda; só 5 `.cs` com conteúdo diferente | prova 1 `ok8a`; prova 2 imprime exatamente `One.Api.Tests/ArquiteturaTests.cs One.Api.Tests/Infra/OneFactory.cs One.Api.Tests/PlataformaTests.cs One.Api.Tests/ProvedorTests.cs One.Api.Tests/RetratoTests.cs ` (`ok8b`) | `git diff -M 0fd86f1 4e26541 --name-status -- '*.cs'`; nenhum `.cs` mudou desde 3996f4a | PASS |
| C9 | `One.Api/wwwroot/` ignorada e fora do contexto Docker; `api/wwwroot` sumiu | `git check-ignore -q ... && grep -qx 'One.Api/wwwroot' .dockerignore && ! grep -q '^api/wwwroot' .gitignore .dockerignore` -> `ok9` | `.gitignore:5` - `One.Api/wwwroot/` (carried from 3996f4a) | PASS |
| C10 | scripts de `web/apresentacao` usam `One.Api` | prova inteira `ok10` | `web/apresentacao/preparar.ts:77` - `{ cwd: path.join(Raiz, 'One.Api'), ...}`; `web/apresentacao/tts.ts:31` - `'--project', path.join(Raiz, 'One.Api')` (carried from 3996f4a) | PASS |
| C11 | em `web/src` mudam só 3 arquivos e toda linha mudada cita a pasta | prova 1 `ok11a`; prova 2 `ok11b` | `web/src/test/interface.test.ts:116` - `const assets = '../One.Api/wwwroot/assets'`; `web/src/aparencia.tsx:93` e `web/src/test/estrutura.test.ts:3` com `One.Api/` em comentário (carried from 3996f4a) | PASS |
| C12 | `AGENTS.md` com `dotnet test One.Api.Tests` e `--project One.Api`, sem `api.Tests` nem `api/` | prova inteira `ok12` | o `grep -nE` negativo sobre `AGENTS.md` não devolve linha | PASS |
| C13 | AD-040 `active` com o layout; AD-017 `superseded by AD-040` | prova inteira `ok13` | `.specs/STATE.md:46` - linha do AD-040 com `One.Api/`, `One.Api.Tests/` e status `active`; `:23` - linha do AD-017 terminando em `superseded by AD-040` | PASS |
| C14 | testes de arquitetura leem `One.Api/` e `One.Api.Tests/`; 2280 `Assert.` | `ArquiteturaTests`: 60 linhas `Aprovado` na saída do `dotnet test` inteiro; `git grep -c 'Assert\.' HEAD -- One.Api.Tests` somado -> 2280 (`ok14b`) | `ArquiteturaTests.cs:96-97` (mesmos `Assert.True(File.Exists(...))` do C1) | PASS |
| C15 | os dois testes do `web/` que leem a saída do build leem `One.Api/wwwroot/assets` e passam; nada em `web/` cita `../api/` | prova 1 `ok15a`; prova 2: `npm --prefix web run build && test -d One.Api/wwwroot/assets && npx vitest run src/test/interface.test.ts -t "sem biblioteca de gráfico"` -> `Tests  1 passed (24 skipped, 25 total)`; prova 3: `docker compose up -d --build api && npx playwright test e2e/identidade.spec.ts -g "fontes latin no precache"` -> `1 passed (664ms)` | `web/src/test/interface.test.ts:116-117` - `const assets = '../One.Api/wwwroot/assets'` e `expect(existsSync(assets) ? readdirSync(assets).filter((f) => f.startsWith('Grafico-')) : []).toEqual([])`; `web/e2e/identidade.spec.ts:323-324` - `const pasta` com `/../One.Api/wwwroot/assets` e `expect(existsSync(pasta)).toBe(true)` (carried from 3996f4a) | PASS |
| C16 | textos vivos citam `One.Api/`; os 5 ADs ativos com `api/` (AD-005, AD-017, AD-018, AD-019, AD-024) marcados `superseded by AD-040`; o texto do AD-040 cita os mesmos 5 | prova 1 `ok16a` (`git grep` negativo em GLOSSARIO.md, aparencia.tsx, estrutura.test.ts, ArquiteturaTests.cs sem saída); prova 2 `ok16b` (conta 5); prova 3 `ok16c` (`grep -oE` dos 5 números na linha do AD-040, `sort -u`, `wc -l` = 5) | `.specs/STATE.md:11,23,24,25,30` terminam em `superseded by AD-040`; `.specs/STATE.md:46` lista `AD-005, AD-017, AD-018, AD-019, AD-024` (`grep -oE 'AD-0[0-9]+'` na linha 46 devolve `AD-040 AD-005 AD-017 AD-018 AD-019 AD-024`) | PASS |

## Coverage

Recomputado em `4e26541` a partir de `.specs/STATE.md` (linhas com a pasta `api/`: `:11`, `:23`, `:24`, `:25`, `:30`, todas com a marca; AD-032 e AD-033 citam rotas `/api/...`, não a pasta; AD-040 `:46` cita a pasta antiga de propósito) e do `git grep` amplo da rodada 2 para o resto (carried from 3996f4a: o diff desta rodada não toca código).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| lugares que guardam a pasta (14) | `git grep` no HEAD (carried from 3996f4a) | `One.slnx` C2, `ProjectReference` C3, `vite.config.ts:40` C5, `Dockerfile` C6, `.gitignore:5` C9, `.dockerignore` C9, `ArquiteturaTests` C14, `PlataformaTests` C4, `ProvedorTests` C4, `RetratoTests` C4, `preparar.ts:77` C10, `tts.ts:31` C10, `interface.test.ts:116` C15, `identidade.spec.ts:323` C15 | - |
| ADs ativos que escrevem a pasta `api/` (5) | `.specs/STATE.md` em `4e26541` | AD-005 C16, AD-017 C13 e C16, AD-018 C16, AD-019 C16, AD-024 C16 (prova 2 conta 5) | - |
| ADs que o texto do AD-040 diz substituir (5) | `.specs/STATE.md:46` | AD-005, AD-017, AD-018, AD-019, AD-024 -> C16 prova 3 (conta 5; F2, F4 e F5 matam a perda e a troca de um membro) | - |
| textos vivos com a pasta (6) | `git grep` no HEAD | `GLOSSARIO.md` C16, `aparencia.tsx` C16, `estrutura.test.ts` C16, `ArquiteturaTests.cs` C16, ADs ativos C16, `AGENTS.md` C12 | - |
| montagens da API (3) | `Program`/`OneFactory`/`Dockerfile` | build local C3, `WebApplicationFactory` C4 (581/581), imagem Docker C6 (200 e `<div id="root">`) | - |
| doors do Landing (2) | `plan.md` Landing | layout das pastas C1 e C2, AD-040 C13 | - |
| documentos com comando ou regra (2) | `AGENTS.md`, `STATE.md` | `AGENTS.md` C12, `STATE.md` C13 | - |
| testes do web que leem a saída do build (2) | `git grep -n 'wwwroot' -- web/src web/e2e` (carried from 3996f4a) | Vitest "sem biblioteca de gráfico" C15, e2e "fontes latin no precache" C15 | - |

Lacuna menor herdada (rodadas 2 e 3, não bloqueante): `interface.test.ts:117` passa vazio com caminho errado por causa do `existsSync(assets) ? ... : []`; a prova 1 do C15 (`grep -q "'../One.Api/wwwroot/assets'"`) mata essa falha, então não é mutante vivo do check.

## Test policy rows

carried from 3996f4a: sem linhas `Test policy` em `checks.md`; nenhum código mudou nesta rodada. Nenhuma linha a julgar.

## Faults injected

Worktree `git worktree add /d/wt-verify4 HEAD`, removido no fim (`git worktree remove --force` e `prune`; `git worktree list` mostra só `D:/one-system`). `git status --porcelain` da árvore real vazio antes e depois (`diff` igual ao baseline). As falhas das rodadas 1 e 2 e F1/F3 da rodada 3 ficam `carried from 3996f4a`: os arquivos que elas tocam não mudaram. Abaixo, F2 reinjetada e as variantes na superfície nova (prova 3 do C16, lista do AD-040), todas sobre a cópia de `.specs/STATE.md:46`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F2 (rodada 3): AD-040 perde `AD-019, ` na lista | `.specs/STATE.md:46`; prova 3 do C16 imprime `4` (esperado `5`) | yes |
| F4: AD-040 perde `AD-005, ` na lista | `.specs/STATE.md:46`; prova 3 do C16 imprime `4` | yes |
| F5: AD-040 troca `AD-024` por `AD-023` (um AD a mais no lugar de outro) | `.specs/STATE.md:46`; prova 3 do C16 imprime `4` | yes |

Nota fora da tabela, não bloqueante: F6, acrescentar `AD-033` à lista sem tirar nenhum dos 5, deixa a prova 3 em `5` (a prova exige os 5 presentes, não que a lista seja exatamente esses 5). O C16 afirma "cita os mesmos 5", não "só esses", então não é mutante do check; fica como limite conhecido da prova.

## Gate

`dotnet test One.Api.Tests` - 581 passed, 0 failed (`Aprovados: 581`, 2,5348 min). `dotnet build One.slnx` - 0 erros. `npm --prefix web run build` - ok (`One.Api/wwwroot/index.html` e `assets/`). Vitest `interface.test.ts -t "sem biblioteca de gráfico"` - 1 passed. Playwright `identidade.spec.ts -g "fontes latin no precache"` - 1 passed (8080 com a imagem refeita, `200` e `<div id="root">`). `ArquiteturaTests` - 60 passed, 0 failed. `dotnet ef migrations has-pending-model-changes` - sem mudança, exit 0.
