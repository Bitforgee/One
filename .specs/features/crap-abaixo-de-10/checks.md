# CRAP abaixo de 10 nas funções antigas do web - checks

Profile: standard
Plan: `.specs/features/crap-abaixo-de-10/plan.md`

9 checks · 0 one-way doors · plano e checks aprovados pelo dono em 10/11/2026 (ver `plan.md`, Aprovação)

`<base>`: `4b809c8`, o commit da `main` imediatamente antes do primeiro commit desta feature. Provas em `web/` salvo indicação; provas com `comm` e `<(...)` rodam no Git Bash na raiz. No Windows, `dryer` e `crapper` rodam com `PYTHONUTF8=1`. Ferramentas: `crapper` `6fd92c4c9bcc56efb64a2f8743d5a2993bcfd42d`, `dryer` `66ff6d21a42c04afcad89c78a80066176d1294b0`, `tree-sitter==0.26.1`, `tree-sitter-language-pack==1.25.0`.

## Checks

| # | Afirmação | Prova |
|---|---|---|
| K1 | Depois de `npm --prefix web run coverage -- --maxWorkers=4` (sem outra suíte em paralelo), `crapper --use-existing-coverage -s src --threshold 9.99` sai 0; a saída não tem `N/A`; a maior nota é ≤ 9.99; `Corpo`, `EdicaoDoFluxo`, `Formulario`, `CampoDeTexto`, `Detalhe`, `Campo`, `aplicar` e `PainelDaAba` (ou o que restar delas depois da extração) aparecem com `Cov%` numérico e nota ≤ 9.99 (critério 1) | `PYTHONUTF8=1 crapper --use-existing-coverage -s src --threshold 9.99` exit 0, mais `grep -c 'N/A'` = 0 na saída |
| K2 | Toda linha `expect(` dos arquivos de teste de `web/src` na `<base>` segue no `HEAD`, idêntica (multiconjunto); nenhum arquivo de teste foi apagado ou renomeado; todo nome de teste (`it(`/`it.each(`/`test(`) da `<base>` segue no `HEAD` (critério 2) | `comm -23 <(git ls-tree -r --name-only <base> web/src \| grep -E '\.test\.tsx?$' \| xargs -I{} git show <base>:{} \| grep -E '^\s*expect\(' \| sort) <(git ls-files 'web/src/*.test.ts' 'web/src/*.test.tsx' \| xargs cat \| grep -E '^\s*expect\(' \| sort)` não imprime nada; `git diff --diff-filter=DR --name-only <base>..HEAD -- web/src` não imprime nada; o mesmo `comm -23` sobre as linhas `^\s*(it\|it\.each\|test)\(` não imprime nada |
| K3 | `npm --prefix web test -- --maxWorkers=4` sai 0 com 0 falhas e 0 `skipped`/`todo`; `Test Files` e `Tests` são pelo menos os 68 e 648 da `<base>`, e toda diferença é um teste novo desta feature listado no relatório (critério 2) | o comando, exit 0, e a contagem |
| K4 | `npm --prefix web run coverage -- --maxWorkers=4` sai 0 nas mesmas condições do K3 e grava `web/coverage/lcov.info` com entrada `SF:` para cada um dos 7 arquivos tocados | o comando, exit 0, e `grep -c` de cada `SF:` |
| K5 | Uma execução, dentro de `web/`: `dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao` mais um `-s` por arquivo de produto da raiz de `web/src` (`git ls-files 'src/*.ts' 'src/*.tsx'` sem subpasta e sem `.test.`) e `--threshold 0.8` imprime exatamente `No duplicate candidates found.`; o escopo, tirado das funções `select_files`/`scan_files` do dryer com os mesmos argumentos, é o conjunto das 6 fatias e da raiz sem testes, sem `src/ui/`, `src/ilustracoes/` e `src/test/` (critério 3, AD-023) | o comando e a lista do escopo |
| K6 | `npm --prefix web run build` sai 0 (inclui `tsc --noEmit`) | o comando, exit 0 |
| K7 | Com a imagem do `HEAD` (`docker compose up -d --build`), `npx playwright test aparencia.spec.ts arranjo.spec.ts casca.spec.ts celular.spec.ts chat.spec.ts editor-fluxo.spec.ts fluxos.spec.ts identidade.spec.ts ux.spec.ts` sai 0 com os mesmos 233 testes que passaram na `<base>` em 10/11/2026 (`233 passed (5.0m)`, imagem de `4b809c8`) (critério 4) | o comando, exit 0, e a contagem de passados |
| K8 | `git diff --name-only <base>..HEAD` lista só arquivos em `web/src/` (os 7 do plano e testes novos `*.test.tsx`) e em `.specs/` (esta feature, o C8 e o handoff de `sessao-erro-transitorio` e o `STATE.md`); `git diff --quiet <base> HEAD -- One.Api One.Api.Tests web/src/ui web/package.json web/package-lock.json web/vite.config.ts web/src/index.css` sai 0 (critério 5) | os dois comandos |
| K9 | Nenhuma linha acrescentada em `.ts`/`.tsx` tem comentário: `git diff <base>..HEAD -- 'web/src/*.ts' 'web/src/*.tsx' \| grep -E '^\+' \| grep -E '//\|/\*'` não imprime nada além de URLs dentro de strings já existentes (critério 5, decisão de 09/11 `remover-comentarios`) | o comando |

## Emenda de 11/11/2026 (decisão do dono)
K8 passa a permitir também `web/src/assistente/compositor.test.tsx`, `web/src/assistente/assistente.test.tsx` e `web/src/assistente/conversa.test.tsx`, só com o timeout de 15000 ms passado como terceiro argumento do `it(` nos 4 testes que enviam 10 mensagens (`limite de 10 mensagens`, `limite oferece só dois botões`, `limite destaca Falar com atendente`, `o limite conta só as mensagens do aluno, mesmo sem resposta do assistente`). Motivo: sob `coverage` neste computador o laço de 10 mensagens leva pouco mais de 5 s (5033 ms medidos em três rodadas seguidas, sempre o mesmo teste), e o K4 não fechava. Nenhum nome, asserção ou configuração global muda; K2 continua valendo. Rejeitado: subir o `testTimeout` global ou acrescentar `--testTimeout` ao comando do K4, que afrouxaria os 650 testes.

## Verify
Agente novo, sem o contexto de quem construiu, roda cada prova em `<base>..HEAD` e injeta à mão, num worktree fora do repositório (L-014), ao menos uma falha por arquivo tocado (por exemplo: inverter uma condição extraída, trocar um texto devolvido por uma função extraída, tirar um ramo de um subcomponente) e registra qual teste a pega. Feito = K1 a K9 com PASS e toda falha injetada pega.
