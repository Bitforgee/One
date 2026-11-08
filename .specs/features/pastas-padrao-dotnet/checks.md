# Pastas no padrão .NET - checks

Profile: standard
Plan: `.specs/features/pastas-padrao-dotnet/plan.md`

16 checks em 2 slices · 2 one-way doors · 0 perguntas abertas (plano aprovado pelo usuário em 08/11: "aprovado, pode seguir com os checks e o build")

**Emenda de 08/11, aprovada pelo usuário** depois da verificação rodada 1 (FAIL): `web/e2e/identidade.spec.ts` e `web/src/test/interface.test.ts` ainda liam `../api/wwwroot`, e o primeiro falhava. O usuário escolheu "Corrigir e emendar" e "AD-040 + glossário + comentários". O C11 foi reescrito (antes: "nenhum arquivo em `web/src` muda"); C15 e C16 são novos. Os outros checks não mudaram.

**Como as provas rodam.** No Git Bash, na raiz `D:\one-system`. `BASE=0fd86f1` é a `main` de onde a branch saiu: nenhum `.cs` mudou entre ela e o commit que congela este arquivo. API: `docker compose up -d postgres mailpit minio` e uma execução de `dotnet test` por vez. Um filtro que não seleciona teste sai com 0 (L-002): conferir a contagem no relatório. Mutação suspensa (AD-025).

## Checks

### S1 - as pastas têm o nome do projeto e tudo continua de pé · 13 arquivos · 160 KB · ~40k

**C1** - [x] O git não rastreia nenhum arquivo em `api/` nem em `api.Tests/`, e `One.Api/One.Api.csproj` e `One.Api.Tests/One.Api.Tests.csproj` existem (AC 1, door 1)
Proof: `test -z "$(git ls-files api/ api.Tests/)" && test -f One.Api/One.Api.csproj && test -f One.Api.Tests/One.Api.Tests.csproj`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Layout_e_compose"`

**C2** - [x] `One.slnx` lista exatamente os 2 projetos `One.Api.Tests/One.Api.Tests.csproj` e `One.Api/One.Api.csproj`, e o arquivo `web/package.json` (AC 2, door 1)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dois_projetos_sem_repositorio"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Layout_e_compose"`

**C3** - [x] `dotnet build One.slnx` sai com 0, com o CA1502 ligado (AC 3)
Proof: `dotnet build One.slnx`

**C4** - [x] `dotnet test One.Api.Tests` passa inteiro, com o mesmo total de testes que `dotnet test api.Tests` deu em `BASE` (gravado em `## Handoff`) (AC 4)
Proof: `dotnet test One.Api.Tests`

**C5** - [x] `npm --prefix web run build` grava `One.Api/wwwroot/index.html` (AC 5)
Proof: `rm -rf One.Api/wwwroot && npm --prefix web run build && test -f One.Api/wwwroot/index.html`

**C6** - [x] A imagem refeita sobe e `GET http://localhost:8080/` responde `200` com o HTML da SPA (AC 6)
Proof: `docker compose up -d --build api && sleep 15 && test "$(curl -s -o /tmp/spa.html -w '%{http_code}' http://localhost:8080/)" = 200 && grep -q '<div id="root">' /tmp/spa.html`

**C7** - [x] O EF não vê mudança de modelo pendente com o projeto na pasta nova (AC 7)
Proof: `dotnet tool restore && dotnet ef migrations has-pending-model-changes --project One.Api`

**C8** - [x] Nenhuma linha `namespace` ou `using` muda em `.cs`, e os únicos `.cs` com conteúdo diferente da base são os que guardam caminho de pasta: `ArquiteturaTests.cs`, `PlataformaTests.cs`, `ProvedorTests.cs`, `RetratoTests.cs` e `Infra/OneFactory.cs` (AC 8)
Proof: `test -z "$(git diff -M $BASE HEAD -- '*.cs' | grep -E '^[-+][[:space:]]*(namespace|using|global using) ')"`
Proof: `test "$(git diff -M $BASE HEAD --name-status -- '*.cs' | grep -v '^R100' | awk '{print $NF}' | sort | tr '\n' ' ')" = "One.Api.Tests/ArquiteturaTests.cs One.Api.Tests/Infra/OneFactory.cs One.Api.Tests/PlataformaTests.cs One.Api.Tests/ProvedorTests.cs One.Api.Tests/RetratoTests.cs "`

**C9** - [x] `One.Api/wwwroot/` é ignorada pelo git e fica fora do contexto do Docker, e `api/wwwroot` sai dos dois arquivos (AC 9)
Proof: `git check-ignore -q One.Api/wwwroot/index.html && grep -qx 'One.Api/wwwroot' .dockerignore && ! grep -q '^api/wwwroot' .gitignore .dockerignore`

**C10** - [x] Os scripts de `web/apresentacao` rodam o comando da API na pasta `One.Api` e não citam mais a pasta `api` (Flow, hop 8)
Proof: `grep -q "'One.Api'" web/apresentacao/preparar.ts && grep -q "'One.Api'" web/apresentacao/tts.ts && ! grep -nE "Raiz, 'api'" web/apresentacao/preparar.ts web/apresentacao/tts.ts`

**C11** - [ ] Em `web/src` mudam só 3 arquivos, `aparencia.tsx`, `test/estrutura.test.ts` e `test/interface.test.ts`, e toda linha mudada cita a pasta (`api/` antes, `One.Api/` depois); nenhuma linha de lógica muda, então os gates `crapper` e `dryer` do AD-018 não têm o que medir de novo (Impact, emenda)
Proof: `test "$(git diff --name-only $BASE HEAD -- web/src | sort | tr '\n' ' ')" = "web/src/aparencia.tsx web/src/test/estrutura.test.ts web/src/test/interface.test.ts "`
Proof: `test -z "$(git diff -U0 $BASE HEAD -- web/src | grep -E '^[-+][^-+]' | grep -vE 'api/|One\.Api/')"`

**C15** - [ ] Os dois testes do `web/` que olham a saída do build leem `One.Api/wwwroot/assets` e passam: o Vitest "sem biblioteca de gráfico" com a pasta gerada, e o e2e "fontes latin no precache" contra a imagem da 8080; nenhum arquivo em `web/` cita mais `../api/` (Flow, hop 9, emenda)
Proof: `grep -q "'../One.Api/wwwroot/assets'" web/src/test/interface.test.ts && grep -q '/../One.Api/wwwroot/assets' web/e2e/identidade.spec.ts && ! git grep -n '\.\./api/' -- web`
Proof: `npm --prefix web run build && test -d One.Api/wwwroot/assets && cd web && npx vitest run src/test/interface.test.ts -t "sem biblioteca de gráfico"`
Proof: `docker compose up -d --build api && cd web && npx playwright test e2e/identidade.spec.ts -g "fontes latin no precache"`

### S2 - as regras e os comandos escritos batem com o layout · 4 arquivos · 55 KB · ~14k

**C12** - [x] O `AGENTS.md` traz `dotnet test One.Api.Tests` e `--project One.Api` e não cita `api.Tests` nem caminho começando em `api/` (AC 10)
Proof: `grep -q 'dotnet test One.Api.Tests' AGENTS.md && grep -q -- '--project One.Api ' AGENTS.md && ! grep -nE 'api\.Tests|(^|[` (])api/|--project api' AGENTS.md`

**C13** - [x] O `.specs/STATE.md` tem o AD-040 `active` com o layout `One.Api/`, `One.Api.Tests/`, `web/`, e o status do AD-017 diz que os caminhos foram substituídos pelo AD-040 (AC 11, door 2)
Proof: `grep -E '^\| AD-040 \|' .specs/STATE.md | grep 'One.Api/' | grep 'One.Api.Tests/' | grep -q '| active |' && grep -E '^\| AD-017 \|' .specs/STATE.md | grep -q 'superseded by AD-040'`

**C14** - [x] Os testes de arquitetura leem as fatias de `One.Api/` e as classes de `One.Api.Tests/`, passam, e o total de `Assert.` nos testes continua 2280, o mesmo de `BASE` (AC 12)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests"`
Proof: `test "$(git grep -c 'Assert\.' HEAD -- One.Api.Tests | awk -F: '{s+=$NF} END {print s}')" = 2280`

**C16** - [ ] Os textos vivos que citavam a pasta passam a `One.Api/`: o `.specs/GLOSSARIO.md` e os comentários de `aparencia.tsx`, `estrutura.test.ts` e `ArquiteturaTests.cs` não citam mais `api/` como pasta; e os ADs ativos que escrevem `api/` (AD-005, AD-017, AD-018, AD-024) dizem no status que esses caminhos foram substituídos pelo AD-040 (emenda)
Proof: `! git grep -nE '(^|[^A-Za-z./])api/' -- .specs/GLOSSARIO.md web/src/aparencia.tsx web/src/test/estrutura.test.ts One.Api.Tests/ArquiteturaTests.cs`
Proof: `test "$(grep -E '^\| AD-0(05|17|18|24) \|' .specs/STATE.md | grep -c 'superseded by AD-040')" = 4`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| lugares que guardam a pasta (14) | `One.slnx` C2 · `ProjectReference` do teste C3 · `vite.config.ts` C5 · `Dockerfile` C6 · `.gitignore` C9 · `.dockerignore` C9 · `ArquiteturaTests` C14 · `PlataformaTests` C4 · `ProvedorTests` C4 · `RetratoTests` C4 · `preparar.ts` C10 · `tts.ts` C10 · `interface.test.ts` C15 · `identidade.spec.ts` C15 | - |
| textos vivos com a pasta (6) | `GLOSSARIO.md` C16 · `aparencia.tsx` C16 · `estrutura.test.ts` C16 · `ArquiteturaTests.cs` C16 · ADs ativos (AD-005, AD-017, AD-018, AD-024) C16 · `AGENTS.md` C12 | - |
| montagens da API (3) | `dotnet run`/build local C3 · `WebApplicationFactory` dos testes C4 · imagem Docker C6 | - |
| doors do Landing (2) | layout das pastas C1, C2 · AD-040 C13 | - |
| documentos com comando ou regra (2) | `AGENTS.md` C12 · `STATE.md` C13 | - |

- Nenhum check afirma status de rota além do C6, cuja prova bate na porta 8080 da imagem refeita
- `OneFactory.cs` só tem caminho num comentário; o C8 confere que ele é o único conteúdo mudado ali junto dos outros 4

## Test policy

Sem linhas novas: o `AGENTS.md` (`## Testes`) já diz o nível de cada camada, e esta mudança não acrescenta ponto de decisão (0 condicionais novos; só caminhos literais). As provas são comandos porque as afirmações são sobre o repositório, o build e a imagem; C3 e C4 afirmam de propósito a suíte inteira, que é o que o AC 3 e o AC 4 pedem.

## Swept

- validation: n/a - nada recebe entrada nova
- failure modes: C3, C6 - um caminho esquecido quebra o build ou a imagem, e os dois são provas
- idempotency: n/a - nenhuma operação repetível nova
- authorization: n/a - nenhuma rota muda; a suíte inteira (C4) inclui `SessaoTests`
- concurrency: n/a - sem código de execução novo
- data lifecycle: C7 - migrations só mudam de pasta, o EF não vê diferença
- dependency failure: n/a - nenhuma dependência nova
- state transitions: n/a - nenhum estado muda
- observability: n/a - nenhum log muda

## Handoff

- S1 + S2 = 213.217 bytes / 4 = ~53k (`One.slnx`, `One.Api.Tests.csproj`, `vite.config.ts`, `Dockerfile`, `.gitignore`, `.dockerignore`, `ArquiteturaTests.cs`, `PlataformaTests.cs`, `ProvedorTests.cs`, `RetratoTests.cs`, `OneFactory.cs`, `preparar.ts`, `tts.ts`, `AGENTS.md`, `STATE.md`); o `git mv` não entra na conta porque não lê os arquivos. Abaixo do orçamento de 150k - um construtor
- **Boundary:** C1-C14 closed at `c7e3fdd`; base `0fd86f1`, checks congelados em `a91776f`. `dotnet test api.Tests` em `0fd86f1`: 581 de 581; `dotnet test One.Api.Tests` em `cb2ce84`: 581 de 581. Build, web build, EF sem mudança pendente e a imagem na 8080 (`200`) saem 0
- **Settled mid-build:** nada; nenhuma asserção mudou além do caminho literal (2280 `Assert.` antes e depois)
- **Abandoned:** nada. O `git mv` levou junto `bin/` e `obj/` (não rastreados), então não sobra pasta `api/` local; isso importa porque um teste que ainda apontasse para `api/` com só `bin/obj` lá dentro enumeraria zero `.cs` e passaria vazio
