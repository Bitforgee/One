# Remover comentários do código verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: c0733c9..41828d8
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

C1 fails: 211 comments (plus the kept `/// <reference` directive) remain in 69 `.ts`/`.tsx` files. All are trailing comments on a line of code. The builder's helper `sem-comentarios.mjs --contar` reports `total 0` and missed all of them. The `.cs` side is clean. The other four checks hold.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | After the change the counter finds 0 comments in scope and `web/vite.config.ts` keeps `/// <reference types="vitest/config" />` | Own counter instead of the author's helper. `.ts/.tsx/.mjs`: `node v-ts.mjs contar` (TypeScript AST; every leaf token's leading and trailing comment ranges, so JSX `{/* */}` and `/** */` are covered) over the 189 tracked in-scope files, exit 0: `files 189 total comments 212`. `.cs`: Roslyn 5.0.0 (NuGet cache, loaded in pwsh) trivia scan over the 264 tracked `.cs` files outside `Migracoes`: `remaining comment trivia 0`. `git grep -n "/// <reference" -- web/vite.config.ts` exit 0 | The directive is present at `web/vite.config.ts:1`. 212 minus that directive leaves 211 real comments. Examples: `web/apresentacao/kit.ts:16` `const Pausa = 1.2 // segundos de respiro depois de cada fala`; `web/apresentacao/compor.ts:12` `const so = process.argv[3] // ensaio: só este segmento, sem juntar`; `web/e2e/arranjo.spec.ts:66` (33 in this file); `web/src/chamados/textos.test.tsx:84` `... /* historico-legivel C8 */, data(...)` and `:119` `// a conversa vem recolhida ...`; `web/src/api.ts` (`corpo: any // o ProblemDetails inteiro...`). Counts per file are in the `contar` output (69 files). I found no whole-line comments, so every leftover is a trailing comment. The helper's own `--contar` prints `total 0`, so it cannot see this class. | **FAIL** |
| C2 | Only comments leave: for each changed `.ts/.tsx/.mjs`, the JS from `ts.transpileModule` (`removeComments`, jsx ReactJSX) is identical before and after | Own script `node v-ts.mjs comparar c0733c9` (CRLF normalised to LF on both sides), exit 0: `changed ts files 163 emit differences 0 comments before 1572`. For `.cs`, Roslyn token-stream equality for all 135 changed files: `token-stream differences 0; comments before 725 after 0; parse errors before 0 after 0; directives before 0 after 0`. This compares the full token text, including verbatim, raw and interpolated strings and char literals, and also covers a `//` inside a string such as `http://`. The author's helper also agrees: `comparados 174, diferentes 0` | Of 1572 comments before the change, 1360 were removed. The rest are the C1 leftovers. The check can tell a pure comment removal from a code change: an injected comment-only removal in `web/src/tempo-real.ts:9` gave `emitEqual true` (see Faults injected). Limits: emit equality ignores type-only code (types, interfaces), so a type-only edit is not caught by C2. `.cs` token equality covers every token. The author's helper compared 174 files against my 163; I did not investigate the difference. | PASS |
| C3 | `dotnet build One.slnx` exits 0, 0 errors, 0 new warnings against `HEAD~1` (includes CA1502) | `dotnet build One.slnx` at HEAD exit 0: `6 Aviso(s) 0 Erro(s)`. Baseline: `git worktree add $env:TEMP\vwt0 c0733c9` plus `dotnet build`: `6 Aviso(s) 0 Erro(s)` | The same 6 unique warnings in both builds: CS8604 in `One.Api.Tests/AparenciaAdminTests.cs`, `PermissoesChamadoTests.cs`, `One.Api/Assistente/NovaConversa.cs`, `NovaMensagem.cs`; xUnit2013 in `One.Api.Tests/ArquiteturaTests.cs` (line 1062 at HEAD). Only line numbers moved. No CA1502 warning or error. | PASS |
| C4 | `dotnet test` keeps the same count and 0 failures; `npm test` and `npm run build` exit 0 | In a worktree at HEAD, not the real tree: `dotnet build` then `dotnet One.Api.Tests.dll -quiet -xml` gives `total 705 passed 705 failed 0 skipped 0 errors 0`, exit 0. Baseline measured the same way at c0733c9: `705/705/0/0/0`. `npm --prefix web test -- --run` exit 0: `Test Files 66 passed (66)`, `Tests 628 passed (628)`. `npm --prefix web run build` exit 0 (`files generated ../One.Api/wwwroot/sw.js`). | The DLL in the real tree `d:\one-system\One.Api.Tests\bin\Debug\net10.0` was blocked by the Application Control policy (`FileLoadException 0x800711C7`) on 3 attempts and after `--no-incremental`. The HEAD worktree DLL ran, and its tree is identical to the real tree: HEAD is the same commit, `git status` clean. After the `web` build, `git status --porcelain` shows no tracked change. Docker postgres, mailpit and minio were `Up (healthy)`. | PASS |
| C5 | No file outside scope changes | `git diff --name-only c0733c9..HEAD \| Select-String 'Migracoes\|wwwroot\|\.css$\|\.py$\|\.specs/features/(?!remover-comentarios)'` exits 0 with no output | 300 changed paths: 135 `.cs`, 47 `.ts`, 115 `.tsx`, 1 `.mjs`, plus `AGENTS.md` and `.specs/features/remover-comentarios/checks.md`. Nothing in `Migracoes`, `wwwroot`, `*.css`, `*.py`, `*.yml` or `*.csproj`. The `AGENTS.md:120` diff replaces "comentário só para o porquê que o código não mostra" with "sem comentários no código (decisão de 09/11/2026, feature `remover-comentarios`); o porquê vai no plano ou num AD do `STATE.md`". That is coherent with the intent. | PASS |

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| extensões no escopo (4) | `git diff --name-only` by extension: .cs 135, .ts 47, .tsx 115, .mjs 1; tracked in-scope files .cs 264, .ts 51, .tsx 137, .mjs 1 | `.cs`: 0 remaining (Roslyn), C2 and C3 hold. `.ts`, `.tsx`: C2 holds but C1 has leftovers (212 in total including the directive, across 69 files; I did not split `.ts` from `.tsx`). `.mjs`: 0 remaining, C2 holds | `.ts` and `.tsx` still carry trailing comments (C1 FAIL), e.g. `web/apresentacao/kit.ts:16`, `web/e2e/arranjo.spec.ts:66`, `web/src/chamados/textos.test.tsx:84` |
| diretivas preservadas (1) | `rg`-style search (`@ts-\|eslint-\|#pragma\|#region\|/// <reference\|prettier-ignore\|c8 ignore\|istanbul\|vitest-environment`) over all tracked `.cs/.ts/.tsx/.mjs`, at HEAD and at c0733c9 | The only hit is `web/vite.config.ts:1` `/// <reference types="vitest/config" />`, present at both commits (1 before, 1 after). No `#pragma/#region/#nullable` in the `.cs` scope: Roslyn found 0 directives before and after. C1 | - |

Sweep for other leftovers: JSX `{/* */}` and `/** */` are covered by the AST scan (the single inline `/* historico-legivel C8 */` at `web/src/chamados/textos.test.tsx:84` is one of them). The only `//` hits in `.cs` are 62 lines, all URLs in strings (`http://localhost`, `https://...`) or the verbatim regex at `One.Api.Tests/ArquiteturaTests.cs:133` and the prompt text at `One.Api/Assistente/Assistente.cs:40`. After stripping string literals, none has a residual `//`, `/*` or `*/`. Roslyn confirms 0 comment trivia. Untracked in-scope files: none (`git ls-files -o --exclude-standard` lists no .cs/.ts/.tsx/.mjs; `web/apresentacao` and `web/scripts` sources are tracked).

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| testes existentes: não editar; qualquer falha é stop-and-ask | all `*Tests.cs`, `*.test.ts(x)`, `web/e2e/*.spec.ts`, `web/src/test/*` in the diff | C2 emit equality (0 differences, 163 files) and Roslyn token equality (0 differences, 135 files): no assertion, literal or call changed. C4: 705/705 and 628/628 green, no stop-and-ask failure | yes |

## Faults injected

| Mutation | Location | Killed |
| --- | --- | --- |
| Appended `// x` to a `.cs` file in a scratch `git worktree` outside the repo | `One.Api/Program.cs` | yes - Roslyn `remaining` listed exactly `One.Api/Program.cs 1` |
| Appended `// x` to a `.tsx` file | `web/src/main.tsx` | yes - `contar` went 212 -> 214 and listed `web/src/main.tsx 1` |
| Appended `// x` to a `.mjs` file | `web/scripts/entrada-sem-canvas.mjs` | yes - listed `web/scripts/entrada-sem-canvas.mjs 1` (3 injections, exactly 3 flagged) |
| Deleted the code line together with its trailing comment (looks like a comment removal) | `web/src/push.ts:17` `await inscricao.unsubscribe() // ...` | yes - C2 gave `emitEqual false` |
| Control: removed only the trailing comment | `web/src/tempo-real.ts:9` | not applicable - C2 gave `emitEqual true` and the comment count went 1 -> 0, as it should |

The scratch worktrees were removed and `git worktree list` shows only the real tree. The real tree's `git status --porcelain` shows only the 15 untracked `demo-live-*.png`.

## Gate

`npm --prefix web test -- --run` - 628 passed, 0 failed (66 files); `dotnet One.Api.Tests.dll` in a HEAD worktree - 705 passed, 0 failed; `dotnet build One.slnx` - 0 errors, 6 warnings (same as c0733c9). Gate overall FAIL on C1: 211 comments remain in 69 `.ts`/`.tsx` files.
