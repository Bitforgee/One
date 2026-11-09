# Remover comentários do código verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: c0733c9..b2c2850
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 1 (FAIL at 41828d8) found 211 trailing comments left in 69 `.ts`/`.tsx` files. The fix commit `41828d8..b2c2850` touched exactly those 69 files (`git diff --name-only 41828d8..HEAD` lists 69 `.ts/.tsx` plus the round-1 report; no `.cs`, `.csproj` or `One.Api*` path). All proofs were re-run in full at b2c2850. Sections not touched by the fix are marked `carried from 41828d8`.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 (verified at b2c2850, `.ts/.tsx/.mjs`) | The counter finds 0 comments in scope and `web/vite.config.ts` keeps `/// <reference types="vitest/config" />` | My own counter `node $env:TEMP\v2.mjs contar` (TypeScript compiler API from `web/node_modules/typescript`): for every leaf token and JsxText of the 189 tracked in-scope files, leading AND trailing comment ranges (JSX `{/* */}` and inline `/* */` included), plus a raw-text cross-check that strips string, template and regex literals and looks for `//`, `/*`, `*/`. Exit 0. `git grep -n "/// <reference" -- web/vite.config.ts` exit 0 | Output: `files 189 total ast comments 1 raw hits 1`. Both hits are `web/vite.config.ts:1` `/// <reference types="vitest/config" />` (the kept directive). In round 1 the same class of counter gave 212. | PASS |
| C1 (carried from 41828d8, `.cs`) | 0 comments in the 264 tracked `.cs` files outside `Migracoes` | Round 1 Roslyn 5.0.0 trivia scan: `remaining comment trivia 0`. Carried because `git diff --name-only 41828d8..HEAD` filtered for `.cs`, `.csproj` and `One.Api` paths prints nothing | No `.cs` changed since 41828d8 | PASS |
| C2 (verified at b2c2850) | Only comments leave: `ts.transpileModule` (removeComments, jsx ReactJSX, CRLF normalised to LF) is identical before and after | My own `node $env:TEMP\v2.mjs comparar c0733c9 WT` (original base vs working tree): `changed 164 emit differences 0 comments before 1573`. Fix only: `comparar 41828d8 b2c2850`: `changed 69 emit differences 0 comments before 212` | 164 changed `.ts/.tsx/.mjs` files, 0 emit differences. The 69 fix files also have identical emit before and after the fix commit. The `.cs` Roslyn token-stream equality (135 files, 0 differences) is carried from 41828d8, valid because no `.cs` changed. Limit: emit equality ignores type-only code. | PASS |
| C3 (verified at b2c2850) | `dotnet build One.slnx` exits 0, 0 errors, no new warnings | `dotnet build One.slnx` exit 0: `6 Aviso(s) 0 Erro(s)` | Same 6 warnings as the c0733c9 baseline measured in round 1 (CS8604 x4, xUnit2013 at `One.Api.Tests/ArquiteturaTests.cs:1062`). No CA1502. | PASS |
| C4 (web verified at b2c2850; .NET tests carried from 41828d8) | Same test count, 0 failures; `npm test` and `npm run build` exit 0 | `npm --prefix web test -- --run` exit 0: `Test Files 66 passed (66)`, `Tests 628 passed (628)`. `npm --prefix web run build` exit 0 (`files generated ../One.Api/wwwroot/sw.js`). `git status --porcelain` after the build: no tracked change (only the 15 untracked `demo-live-*.png`) | .NET: `dotnet test` 705/705 passed at 41828d8 (round 1, in a worktree because the Application Control policy blocks `One.Api.Tests.exe` in the real tree). Carried: `git diff --name-only 41828d8..HEAD` has no path under `One.Api/` or `One.Api.Tests/`, so the compiled tests are unchanged. | PASS |
| C5 (verified at b2c2850) | No file outside scope changes | `git diff --name-only c0733c9..HEAD` piped through Select-String for Migracoes, wwwroot, css, py and other `.specs/features` folders (the C5 proof as written), exit 0, no output | 302 changed paths: `.cs`, `.ts`, `.tsx`, `.mjs`, plus `AGENTS.md`, `.specs/features/remover-comentarios/checks.md` and `verification.md`. Nothing else. | PASS |

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| extensões no escopo (4) (verified at b2c2850 for ts/tsx/mjs; .cs carried from 41828d8) | tracked in-scope files by extension (`git ls-files`, excluding wwwroot, Migracoes, .specs, bin, obj, node_modules): 189 `.ts/.tsx/.mjs` files; 264 `.cs` | `.ts`: 0 remaining comments (C1), emit equal (C2). `.tsx`: 0 remaining (C1), emit equal (C2). `.mjs`: 0 remaining (C1), emit equal (C2). `.cs`: 0 remaining (C1 carried), C3 build holds | - |
| diretivas preservadas (1) (verified at b2c2850) | `git grep -n "/// <reference" -- web/vite.config.ts` and the C1 scan | `web/vite.config.ts:1` `/// <reference types="vitest/config" />` is the only comment-looking token left. Roslyn found 0 `#pragma/#region/#nullable` in `.cs` before and after (carried). | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| testes existentes: não editar; qualquer falha é stop-and-ask (verified at b2c2850) | all `*Tests.cs`, `*.test.ts(x)`, `web/e2e/*.spec.ts`, `web/src/test/*` in the diff | C2 emit equality 0 differences over 164 files (including the 69 fix files), `.cs` token equality carried; C4 628/628 web tests green, 705/705 .NET carried | yes |

## Faults injected

Done in a scratch `git worktree` at HEAD outside the repo (`$env:TEMP\vwt2`), on the surfaces the fix touched. No `git stash`.

| Mutation | Location | Killed |
| --- | --- | --- |
| Appended `const x = 1 // y` to a `.ts` file | `web/src/push.ts` | yes - counter listed `web/src/push.ts:34 trail // y` (AST and raw cross-check) |
| Appended `const x = 1 // y` to a `.tsx` file | `web/src/main.tsx` | yes - counter listed `web/src/main.tsx:20 trail // y` (AST and raw cross-check) |
| Appended inline block comment `foo(/* y */ 1)` | `web/src/tempo-real.ts` | yes - counter listed `web/src/tempo-real.ts:141 trail /* y */` (AST; the raw cross-check strips it as a regex-like token, so the AST is the proof) |
| Deleted the code line `await inscricao.unsubscribe()` that sat next to a trailing comment in the base | `web/src/push.ts:17` | yes - `comparar 41828d8 WT` printed `DIFF web/src/push.ts`, `emit differences 1`; the unmutated control gave 0 differences |

With the three injections the total went from 1 to 4 (the kept directive plus 3). The scratch worktree was removed (`git worktree list` shows only `d:/one-system b2c2850 [main]`). The real tree's `git status --porcelain` shows only the 15 untracked `demo-live-*.png`, the same as before.

## Gate

`node $env:TEMP\v2.mjs contar` - 189 files, 1 comment (the kept directive), 0 other; `comparar c0733c9 WT` - 164 files, 0 emit differences; `npm --prefix web test -- --run` - 628 passed, 0 failed (66 files); `npm --prefix web run build` - exit 0; `dotnet build One.slnx` - 0 errors, 6 warnings (same as c0733c9); `dotnet test` 705 passed, 0 failed carried from 41828d8 (no `.cs` change since).

