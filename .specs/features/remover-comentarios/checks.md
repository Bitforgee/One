# Remover comentários do código - checks

Profile: standard

## Intent

Pedido do usuário em 09/11/2026: tirar todos os comentários do código atual. Não muda comportamento, mas o usuário
pediu o fluxo `tlc-spec-lean`, então vale o escape de mudança pequena (só `checks.md`, sem `plan.md`, sem one-way door).
Isto substitui, para o código existente, a convenção "comentário só para o porquê" do AGENTS.md; o AGENTS.md é ajustado
no mesmo commit.

Escopo: `.cs` escritos à mão em `One.Api/` e `One.Api.Tests/`, e `.ts`/`.tsx`/`.mjs` em `web/src/`, `web/e2e/` e
`web/*.config.*`. Fora: `One.Api/Dados/Migracoes/` (já aplicadas e geradas, AD do AGENTS.md), `One.Api/wwwroot/`,
`bin/`, `obj/`, `node_modules/`, `.specs/` (inclui os `.py` de prova), `*.css`, `*.yml`, `*.csproj`, `Dockerfile`.
Comentário = `//`, `/* */`, `///` (XML doc) e `{/* */}` em JSX. Diretivas de compilador não são comentário e ficam:
`/// <reference ... />` em `web/vite.config.ts` e qualquer `#pragma`/`#region`/`@ts-*`/`eslint-*` que existir no escopo.

5 checks - 0 one-way doors - 0 perguntas abertas

**Como as provas rodam.** `docker compose up -d postgres mailpit minio`; uma execução de `dotnet test` por vez; web em `web/`.
A contagem de comentários usa `$env:TEMP\sem-comentarios.mjs --contar` (parser do TypeScript para `.ts/.tsx/.mjs`, tokenizador
próprio para `.cs`), escrito antes do código e descartado depois.

**Asserções existentes que podem mudar:** nenhuma. Nenhum teste é editado; se um teste ler comentário de arquivo, é
stop-and-ask.

## Checks

**C1** - [x] Depois da mudança, o contador acha 0 comentários nos arquivos do escopo, e `web/vite.config.ts` ainda contém `/// <reference types="vitest/config" />`
Proof: `node $env:TEMP\sem-comentarios.mjs --contar` (exit 0 com total 0) e `git grep -n "/// <reference" -- web/vite.config.ts` (exit 0)

**C2** - [x] Só comentário sai: para cada `.ts/.tsx/.mjs` alterado, o JS emitido por `ts.transpileModule` com `removeComments: true` é idêntico antes (`HEAD`) e depois
Proof: `node $env:TEMP\sem-comentarios.mjs --comparar HEAD` (exit 0)

**C3** - [x] `dotnet build One.slnx` termina com 0 erros e 0 avisos novos em relação ao `HEAD` (inclui CA1502)
Proof: `dotnet build One.slnx` (exit 0)

**C4** - [x] `dotnet test One.Api.Tests` passa com a mesma contagem de testes do `HEAD` e 0 falhas; `npm --prefix web test` e `npm --prefix web run build` saem com 0
Proof: `dotnet test One.Api.Tests`; `npm --prefix web test`; `npm --prefix web run build`

**C5** - [x] Nenhum arquivo fora do escopo muda: `git diff --name-only HEAD` não lista nada em `Migracoes/`, `wwwroot/`, `.specs/features/` (exceto esta pasta), `*.css`, `*.py`
Proof: `git diff --name-only HEAD~1..HEAD | Select-String 'Migracoes|wwwroot|\.css$|\.py$|\.specs/features/(?!remover-comentarios)'` (sem saída)

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| extensões no escopo (4) | .cs C3 · .ts C2 · .tsx C2 · .mjs C2 | - |
| diretivas preservadas (1) | `/// <reference` do vite.config.ts C1 | - |

## Test policy

| Área | Regra | Veredito |
| --- | --- | --- |
| testes existentes | não editar; qualquer falha é stop-and-ask | C4 |

## Swept

- validation: n/a - nenhuma entrada nova
- failure modes: C4 (build e suítes quebram se um trecho de código sair junto com o comentário)
- idempotency: n/a - transformação de texto de fonte
- authorization: n/a - nenhuma linha executável muda
- concurrency: n/a - nada executa
- data lifecycle: n/a - Migracoes fora do escopo (C5)
- dependency failure: n/a - sem dependência nova
- state transitions: n/a - sem estado
- observability: n/a - nenhum log ou métrica muda
## Handoff

Estimativa: ~480 arquivos tocados, mas por script, sem leitura individual; cabe em um builder. Mecanismo: um builder.

