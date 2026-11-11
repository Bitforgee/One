# Sessão com erro transitório verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: e17dc66..7414eab
**Round**: 3 - full
**Verifier**: independent sub-agent (author != verifier)

Rodada 1 (`51cd8e5..2df768a`, base histórica antes do rebase): FAIL só no C8.
Rodada 2 (`e17dc66..7702914`): FAIL só no C8 (suíte e cobertura com timeouts de 5 s neste computador, `crapper` sem `lcov.info`); C1 a C7 PASS e 10 de 10 faltas mortas. Depois da emenda do C8 (`a1cd3bf`) o `crapper` saía 2 por 8 funções antigas fora do diff, que a feature `crap-abaixo-de-10` levou abaixo de 10 (`8476406..7414eab`).

No `plan.md` (checks-only feature, `## Intent` in `checks.md`). Commits desta feature no intervalo: `b41dd35`, `7702914`, `a1cd3bf`, `8cd91fd`. Depois deles vêm só os 3 commits de `crap-abaixo-de-10` (`8476406`, `51be573`, `7414eab`), que não tocam `web/src/Autenticado.tsx` nem `web/src/chamados/sessao.test.tsx` (`git diff --quiet 8cd91fd HEAD -- web/src/chamados/sessao.test.tsx web/src/Autenticado.tsx`: exit 0). O único produto da feature segue sendo `web/src/Autenticado.tsx` (`semSessao` só no 401, `textoDaSessao`, `ErroDaSessao`).

Ambiente: 2,9 GB livres de 15,7 GB. Vitest sempre com `--maxWorkers=4`, uma suíte de cada vez, pelo PowerShell em `<repo>`, tudo com `rtk bypass`. Os gates pesados (build, suíte, cobertura, `crapper`, `dryer`) rodaram uma vez no HEAD `7414eab` e são os mesmos registrados na rodada 2 de `crap-abaixo-de-10`. A suíte .NET não rodou: `git diff --quiet e17dc66 HEAD -- One.Api One.Api.Tests` sai 0. Nenhum check desta feature é E2E.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 401 mostra "CPF" e o `/me` é chamado 1 vez | `rtk bypass npx vitest run src/chamados/sessao.test.tsx -t "401 vai para o login" --maxWorkers=4` em `web/` | exit 0, 10,1 s, `Tests 1 passed \| 11 skipped (12)` | PASS |
| C2 | 6 linhas (403, 429, 500 ProblemDetails; 502, 503, 504 com corpo vazio): texto fixo, "Tentar de novo" só fora do 403, sem "CPF" e sem "Entrar" | `... -t "status do /me"` | exit 0, 8,4 s, `Tests 6 passed \| 6 skipped (12)` | PASS |
| C3 | 1 chamada ao `/me`, ainda 1 depois de `focus`/`visibilitychange`; só `/api/auth/me` e `/api/instituicoes/univag`; sem "Alternar barra lateral"; 503 e depois 200: após 1500 ms e refoco, contagem 1, texto visível, sem "Minhas solicitações" | `-t "status do /me"` + `-t "falha transitória sem nova tentativa"` | exit 0 (`6 passed`); exit 0, 9,1 s, `1 passed \| 11 skipped (12)` | PASS |
| C4 | 429/503 e depois 200: contagem 1 antes do clique; depois de "Tentar de novo", "Minhas solicitações", texto some, sem "CPF", contagem 2; caso de rede inalterado | `-t "recupera a sessão"` + `-t "tentar de novo repete a leitura da sessão"` | exit 0, 7,7 s, `2 passed \| 10 skipped (12)`; exit 0, 8,0 s, `1 passed \| 11 skipped (12)` | PASS |
| C5 | Os 3 testes existentes mantêm nome e passam; nenhuma linha `expect(` da base sai ou muda | `-t "sem rede mostra a conexão e não vai para o login"` + os 2 do C1 e C4; `comm -23 <(git show e17dc66:web/src/chamados/sessao.test.tsx \| grep -E '^\s*expect\(' \| sort) <(grep -E '^\s*expect\(' web/src/chamados/sessao.test.tsx \| sort)` no Git Bash na raiz | `sem rede ...` exit 0, 7,5 s, `1 passed \| 11 skipped (12)`; os outros 2 exit 0 (acima). `comm`: sem saída | PASS |
| C6 | C20 emendado: a única linha `expect(` da base que sai de `acesso.test.tsx` é `findByLabelText('CPF')` desse teste; as mudanças da feature ficam dentro do teste | `rtk bypass npx vitest run src/acesso/acesso.test.tsx -t "QueryClient por montagem sem nova tentativa nem releitura no foco" --maxWorkers=4`; o `comm -23` como escrito com `e17dc66`; `git diff e17dc66..HEAD -- web/src/acesso/acesso.test.tsx` | vitest exit 0, 8,1 s, `Tests 1 passed \| 58 skipped (59)`. `comm` imprime exatamente uma linha, uma vez: `    expect(await screen.findByLabelText('CPF')).toBeInTheDocument()`. O diff no HEAD tem 2 hunks: `@@ -289,7 +303,9 @@` (desta feature, dentro do teste) e `@@ -33,6 +33,20 @@`, que é o teste novo `botão do olho mostra e oculta a senha` de `7414eab` (`crap-abaixo-de-10`). No intervalo da feature (`e17dc66..8cd91fd`) há um hunk só, `@@ -289,7 +289,9 @@` | PASS |
| C7 | Só os 7 caminhos listados mudam; a API não muda | `git diff --name-only e17dc66..HEAD`; `git diff --quiet e17dc66 HEAD -- One.Api One.Api.Tests` | No intervalo da feature (`e17dc66..8cd91fd`) são 7 caminhos, todos da lista (`.specs/STATE.md`, `interface-nova/checks.md`, `sessao-erro-transitorio/checks.md` e `verification.md`, `Autenticado.tsx`, `acesso/acesso.test.tsx`, `chamados/sessao.test.tsx`). Até o HEAD aparecem mais 13, todos dos 3 commits de `crap-abaixo-de-10` (`git log --name-only 8cd91fd..HEAD`), cobertos pelo K8 daquela feature. `git diff --quiet`: exit 0 | PASS |
| C8 | Todos os gates saem 0, com comando, duração, exit code e contagens | os comandos abaixo, com `rtk bypass` | **(1) C1 a C6**: as 7 provas focadas acima, todas exit 0. **(2)** `npm --prefix web run build`: exit 0, 11,5 s (`tsc --noEmit && vite build`, `✓ built in 1.15s`, `files generated`; `git status` igual). **(3)** `npm --prefix web test -- --maxWorkers=4`: exit 0, 165,9 s, `Test Files 68 passed (68)`, `Tests 650 passed (650)`, 0 falhas, 0 `skipped`/`todo`. Diferença com a referência de `7702914` (68/648): +2, os testes novos de `crap-abaixo-de-10` (`acesso.test.tsx` > `botão do olho mostra e oculta a senha`, `canvas.test.tsx` > `remover pede confirmação com só prazo ou só setor`). **(4)** `npm --prefix web run coverage -- --maxWorkers=4`, sozinho: exit 0, 185,5 s, `68 passed`, `650 passed`; `web/coverage/lcov.info` 107376 bytes, `SF:src\Autenticado.tsx` com `LF:97`, `LH:97`, `BRH:90` de `BRF:92`. **(5)** `dryer` numa execução com as 6 fatias e os 26 arquivos da raiz, `--threshold 0.8`: exit 0, stdout exatamente `No duplicate candidates found.`. Escopo por `select_files`/`scan_files` do próprio dryer: 63 arquivos (26 da raiz, 37 das fatias, igual a `git ls-files` sem `.test.`), 320 formas, 0 avisos, nenhum `.test.`, `src/ui/`, `src/ilustracoes/` ou `src/test/`. Controle positivo a `--threshold 0.5`: 48 candidatos, entre eles pares raiz-fatia (`src/acao.tsx` com `src/chamados/ChamadoDetalhe.tsx`, `src/Campo.tsx` com `src/acesso/Acesso.tsx`, `src/Cabecalho.tsx` com `src/conhecimento/comum.tsx`). **(6)** `PYTHONUTF8=1 crapper --use-existing-coverage -s src --threshold 9.99`: exit 0, 557 funções, 0 `N/A`, maior nota 9.8 (`Sidebar`). Funções de `Autenticado.tsx` com `Cov%` numérico: `semSessao` 100%, `textoDaSessao` 100%, `ErroDaSessao` CC 6, 100%, CRAP 6.0, `desvio` 92.9%, `tituloDaRota` 87.5%, as outras 100%. Conferido com o `lcov.info`: os `BRDA` das linhas 313 a 328 (`semSessao`, `textoDaSessao`, `ErroDaSessao`) têm todos contagem > 0 (100%), e os de `desvio` (339 a 345) têm 13 de 14 ramos com contagem > 0 (`BRDA:341,27,0,0`), 92.9%. **`mutator`**: suspenso por decisão do usuário (AD-025), não rodou | PASS |

## Faults injected

Num worktree de `7414eab` fora do repositório (`%TEMP%\verif-r2`, L-014) com junção `web\node_modules`, o mesmo usado para `crap-abaixo-de-10`. Cada mutação exigiu o trecho original exatamente 1 vez, rodou `npx vitest run src/chamados/sessao.test.tsx src/acesso/acesso.test.tsx --maxWorkers=4` (B8: só `sessao.test.tsx`) e foi desfeita com `git checkout` (worktree limpo depois de cada uma). No fim a junção saiu com `cmd /c rmdir` antes de `git worktree remove --force`; `git status --short` da árvore principal mostra só `.claude/` e o `verification.md` de `crap-abaixo-de-10`, além deste arquivo.

| # | Área | Mutação | Teste que pegou | Pega |
| --- | --- | --- | --- | --- |
| B1 (F1) | `semSessao` | `erro instanceof ErroApi` (sem `&& erro.status === 401`) | exit 1, 10 falhas: `status do /me` 403, 429, 500, 502, 503, 504, `falha transitória sem nova tentativa` e o C6 `QueryClient por montagem sem nova tentativa nem releitura no foco` | sim |
| B2 (F2) | `semSessao` | `status === 401 \|\| status === 403` | exit 1, só `status do /me 403` | sim |
| B3 (F3) | `textoDaSessao` | 429 devolve `'O serviço está indisponível no momento.'` | exit 1, `status do /me 429` e `recupera a sessão depois do 429` | sim |
| B4 | `textoDaSessao` | 403 devolve o texto de indisponibilidade | exit 1, `status do /me 403` | sim |
| B5 | `ErroDaSessao` | botão com `erro.status !== 429` no lugar de `!== 403` | exit 1, `status do /me 403` (`expected true to be false`), `status do /me 429`, `recupera a sessão depois do 429` | sim |
| B6 | `ErroDaSessao` | limite `erro.status < 503` no lugar de `< 500` (500 e 502 caem no `ErroDe`) | exit 1, `status do /me 500`, `status do /me 502` e o teste do C6 | sim |
| B7 | `ErroDaSessao` | tira `erro.status !== 429 &&` (429 cai no `ErroDe`) | exit 1, `status do /me 429`, `recupera a sessão depois do 429` | sim |
| B8 (F6) | `Autenticado` | `tentar={() => {}}` (sem `refetch`) | exit 1, `recupera a sessão depois do 429`, `recupera a sessão depois do 503`, `tentar de novo repete a leitura da sessão` | sim |

8 de 8 faltas mortas. F4a/F4b/F4c e F5 não foram repetidas nesta rodada: mexem em `App.tsx` e na consulta `['me']`, que não mudaram desde a rodada 2, onde morreram.

## Gaps (ranked)

1. C6 e C7 citam `<base>..HEAD`, e o HEAD agora inclui os commits de `crap-abaixo-de-10`. Lidas ao pé da letra no HEAD, as provas mostram também o hunk do teste novo `botão do olho ...` (C6) e 13 caminhos a mais (C7). Este verificador julgou pela mudança desta feature (`e17dc66..8cd91fd`) e atribuiu cada caminho a mais a um commit de `crap-abaixo-de-10`. Se o dono quiser a leitura literal, os dois checks precisam de emenda para fixar o fim do intervalo em `8cd91fd`.
2. Fora do escopo por decisão (Intent): um 5xx com corpo HTML de proxy quebra o `JSON.parse` de `web/src/api.ts:20` e segue no bloco de rede. Nenhum check cobre, por desenho.

## Gate

C1 a C6 focadas: todas exit 0. `npm --prefix web run build`: exit 0. `npm --prefix web test -- --maxWorkers=4`: exit 0 (68/650). `npm --prefix web run coverage -- --maxWorkers=4`: exit 0 (68/650, `lcov.info` gravado). `dryer` (6 fatias + 26 da raiz, 0.8): `No duplicate candidates found.`; controle positivo a 0.5 com 48 candidatos. `crapper --use-existing-coverage -s src --threshold 9.99`: exit 0, sem `N/A`, máximo 9.8. `mutator`: suspenso por decisão do usuário (AD-025).
