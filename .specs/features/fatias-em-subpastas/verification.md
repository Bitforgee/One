# Fatias em subpastas verification

**Verdict**: PASS (com risco aceito: membro `crapper` do C19, AD-057, não provado)
**Profile**: standard
**Diff range**: eab6d1c..99f3689
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Base real do diff: `eab6d1c` (os checks citam `5c3c8ee`; o `Handoff` do checks.md registra a troca). Rodada 1: `eab6d1c..4b3d0c2`, FAIL em C7 e C19. Rodada 2: `..48aa387`, FAIL só no C19. Esta rodada verifica a correção `e10d95a..99f3689` (commit `99f3689`: `IconesDoDestino.ts` e `LinhasDosCadastros.tsx` vão para a raiz de `web/src/administracao/`, 5 imports ajustados, `it('administracao em subpastas')` passa a conferir a raiz com 4 arquivos, o mapa arquivo a arquivo e a ausência de import entre subpastas) e as emendas E1-E4 de `checks.md` mais a linha 4a do Landing em `plan.md:65`. As provas rodaram de novo em `HEAD` 99f3689 (lote completo). O diff da correção não toca nenhum `.cs` (`git diff --stat e10d95a..99f3689 -- '*.cs'` vazio), então o lado .NET é o mesmo código da rodada 2; as seções que dependem só dele estão marcadas `carried from 48aa387` na evidência, com as linhas de `ArquiteturaTests.cs` e `RetratoTests.cs` conferidas de novo em HEAD (as citações da rodada 2 estavam 1 linha abaixo em vários pontos; esta tabela traz as linhas atuais). Árvore real: `git status --porcelain` vazio antes e depois (comparado com `fc`); worktrees das faltas removidos.

## Binding sources

None - sem fonte vinculante além do plano (carried from 48aa387; a correção não toca interface nem tela).

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none (plano sem fonte binding) | n/a | none | - |

## Checks

Proofs em lote, verified at 99f3689. `dotnet test One.Api.Tests --logger "console;verbosity=normal"` (dentro de `Start-Job`, `Wait-Job -Timeout 900`, concluiu em 2,75 min): `Total de testes: 986`, `Aprovados: 986`, 0 reprovados, 0 ignorados (o único `Ignorado` no log é o nome do teste `Fluxo_so_com_rascunho_e_ignorado`, que passou). Cada nome dos checks C2-C12 e C16 aparece exatamente 1 vez como `Aprovado` (`Subpastas_das_fatias`, `Namespace_igual_a_pasta`, `Fatias_planas`, `Fatias_do_api`, `Mapa_de_Chamados`, `Dez_acoes_do_chamado`, `IgnoreQueryFilters_so_no_agendador_e_no_comando`, `Mapa_de_Administracao`, `Importacao_em_arquivo_proprio`, `Mapa_de_Assistente`, `Mapa_de_Conhecimento`, `Mapa_de_Instituicoes`, `Modelo_sem_mudanca_pendente`) e `RetratoTests` 6 vezes. `npm --prefix web test -- --maxWorkers=4`: `Test Files 98 passed (98)`, `Tests 991 passed (991)`. `npm --prefix web run build`: exit 0 (tsc + vite + PWA), `One.Api/wwwroot` não aparece no porcelain.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | AD-056 `active` citando AD-017/AD-040 e `AGENTS.md` com `One.Api/<Fatia>/<Subpasta>/` | carried from 48aa387 (nenhum dos dois arquivos mudou na correção além do `STATE.md`, que ganhou AD-057) | `.specs/STATE.md:61` `¦ AD-056 ¦`; `AGENTS.md:87` `One.Api/<Fatia>/<Subpasta>/` | PASS |
| C2 | `Subpastas_das_fatias`: 1 nível, 22 nomes, <= 12 por subpasta, <= 4 na raiz | lote 986 em 99f3689: Aprovado (1 hit) | `ArquiteturaTests.cs:312` `Assert.Equal(22, SubpastasPermitidas.Values.Sum(...))`; `:320` `Assert.True(porPasta[pasta].Count <= 12, ...)`; `:323` `Assert.True(naRaiz <= 4, ...)` (faltas F2, F3 carried from 4b3d0c2) | PASS |
| C3 | todo `.cs` declara 1 `namespace` = `One.Api` + pasta | lote 986: Aprovado | `ArquiteturaTests.cs:418` `Assert.True(declarados.SequenceEqual([esperado]), ...)` (falta F1 carried from 4b3d0c2) | PASS |
| C4 | `Acesso`, `Mcp`, `Indicadores` planas; `Fatias_do_api` 7 + `Dados` | lote 986: Aprovado (os dois) | `ArquiteturaTests.cs:330` `Assert.Equal(["Acesso", "Indicadores", "Mcp"], FatiasPlanas.Order())`; `:278` e `:338` `Assert.Equal([.. Fatias.Append("Dados").Order()], pastas)` | PASS |
| C5 | `Chamados` 2/12/4/9/6/4/6 = 43 | lote 986: Aprovado | `ArquiteturaTests.cs:347` `Assert.Equal(nomes.Order(...), porPasta[pasta].Order(...))`; `:354-355` `Mapa_de_Chamados` | PASS |
| C6 | 10 ações em `Chamados/Acoes/` | lote 986: Aprovado | `ArquiteturaTests.cs:779` `Assert.Equal(10, acoes.Count)`; `:780` `Assert.All(acoes, ... "Chamados", "Acoes" ...)` | PASS |
| C7 | `IgnoreQueryFilters` em exatamente 9 arquivos, lista comparada nos dois sentidos | lote 986: Aprovado | `ArquiteturaTests.cs:74` (9 caminhos), `:79` `Assert.All(usos, p => Assert.Contains(p, permitidos))`, `:80` `Assert.Equal(permitidos.Order(), usos.Order())` (faltas G1-G3 carried from 48aa387) | PASS |
| C8 | `Administracao` 2/4/5/5/6/4/7/2/6 = 41 | lote 986: Aprovado | `ArquiteturaTests.cs:347`, `:367-368` `Mapa_de_Administracao` | PASS |
| C9 | `/matriculas/importacao` em `Administracao/Matriculas/`, 1 `.Map*(` | lote 986: Aprovado | `ArquiteturaTests.cs:449` `Assert.Single(DaPasta("Administracao"), ...)`; `:450` `Assert.Equal("Administracao/Matriculas", ...)`; `:451` `Assert.Single(Regex.Matches(..., @"\.Map\w*\("))` | PASS |
| C10 | `Assistente` 1/12/10/4 = 27 | lote 986: Aprovado | `ArquiteturaTests.cs:347`, `:382-383` | PASS |
| C11 | `Conhecimento` 3/9/9 = 21 | lote 986: Aprovado | `ArquiteturaTests.cs:347`, `:392-393` | PASS |
| C12 | `Instituicoes` 1/7/7/10 = 25 | lote 986: Aprovado | `ArquiteturaTests.cs:347`, `:401-402` | PASS |
| C13 | texto emendado (E1, E2): 52 arquivos; raiz com exatamente `comum.tsx`, `avisoAoFechar.ts`, `IconesDoDestino.ts`, `LinhasDosCadastros.tsx`; mapa arquivo a arquivo (10/14/14/8/2); sem import de produto entre subpastas; <= 1 nível; cada teste ao lado de uma tela que abre | `npm --prefix web test -- src/test/estrutura.test.ts -t "administracao em subpastas"` dentro do lote web verde (991) em 99f3689; mapa recomputado do disco (abaixo); 3 faltas novas mortas (F7-F9) | `web/src/test/estrutura.test.ts:58` `expect(dela.length).toBe(52)`; `:61` `toBeLessThanOrEqual(2)`; `:64` `expect(raiz).toEqual(['avisoAoFechar.ts', 'comum.tsx', 'IconesDoDestino.ts', 'LinhasDosCadastros.tsx'].sort())`; `:66-72` `Mapa`; `:73-74` `expect(<arquivos da subpasta>, subpasta).toEqual([...Mapa[subpasta]].sort())`; `:75-76` `expect(texto(...), arquivo).not.toMatch(/from '\.\.\/(?:aparencia¦fluxos¦cadastros¦integracoes¦instituicoes)\//)`; `:86-93` teste ao lado da tela que abre. Observação de precisão: o regex de `:76` só vê `from '...'` com aspas simples; busca mais larga no disco (qualquer `../(subpasta)/` em arquivo de produto) devolveu 0 resultados, então não há import cruzado escondido hoje | PASS |
| C14 | `it("estrutura em fatias")` passa | lote web 991 verde | `estrutura.test.ts:25` `it('estrutura em fatias'`; `:27` `expect(pastas).toEqual([...Fatias, ...SemTela].sort())`; a correção só mexeu em `:64-76` | PASS |
| C15 | sem import `@/` em `administracao/<subpasta>/`; `npm --prefix web run build` exit 0 | `it` dentro do lote web; `npm --prefix web run build` em 99f3689 exit 0 | `estrutura.test.ts:95` `expect(texto(...), arquivo).not.toMatch(/(?:from¦import)\s*\(?\s*['"]@\//)`; build exit 0 | PASS |
| C16 | texto emendado (E3): retrato de rotas de 93 linhas, respostas e modelo EF iguais; sem migration | lote 986: `RetratoTests` 6 Aprovado e `Modelo_sem_mudanca_pendente` Aprovado; `dotnet ef migrations has-pending-model-changes --project One.Api` exit 0 (`No changes have been made to the model since the last migration.`); `git diff --stat eab6d1c..99f3689 -- One.Api/Dados/Migracoes` vazio; `One.Api.Tests/Retratos/rotas.txt` tem 93 linhas | `One.Api.Tests/RetratoTests.cs:37` `Assert.Equal(93, viva.Count)`; `RetratoTests.cs:49` `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")).Order(StringComparer.Ordinal), viva.Order(StringComparer.Ordinal))`; `ArquiteturaTests.cs:759` `Assert.False(... HasPendingModelChanges())` | PASS |
| C17 | 0 falhas, 0 pulados, >= 979 testes .NET; 0 falhas web | `dotnet test One.Api.Tests` e `npm --prefix web test -- --maxWorkers=4` em 99f3689 | `Total de testes: 986`, `Aprovados: 986` (986 >= 979); Vitest `Test Files 98 passed (98)`, `Tests 991 passed (991)` | PASS |
| C18 | asserção removida reaparece normalizada; sem skip/only | `python .specs/features/fatias-em-subpastas/asserts_so_caminho.py eab6d1c` em 99f3689: exit 0, `asserções removidas: 14; sem equivalente: 0; skip/only adicionados: 0`. A única asserção trocada na correção é `estrutura.test.ts:64` (lista da raiz de 2 para 4 nomes), efeito da emenda E1 aprovada pelo dono, dentro de um `it` criado nesta feature (não existe no base) | `estrutura.test.ts:64`; `git diff e10d95a..99f3689` sem `Skip =`, `.skip(` nem `.only(` | PASS |
| C19 | `crapper` < 10 depois de `coverage`; `dryer` sem candidato; e2e = base; `dotnet build` 0 com CA1502 | por membro, abaixo | membro `crapper` NÃO provado, coberto pelo risco aceito AD-057 (`.specs/STATE.md:62`, emenda E4); os demais membros provados ou carregados como indicado | PASS com risco aceito AD-057 (crapper não provado) |

**C19 por membro**

| Membro | Proof run | Saída | Resultado |
| --- | --- | --- | --- |
| coverage | `npm --prefix web run coverage -- --maxWorkers=4` (99f3689) | exit 0, `Test Files 98 passed (98)` | PASS (verified at 99f3689) |
| `crapper` | não rodado nesta rodada | `crapper.exe` bloqueado pelo Controle de Aplicativo deste computador (erro literal da rodada 2: `Program 'crapper.exe' failed to run ... Uma política de Controle de Aplicativo bloqueou este arquivo.`). CRAP < 10 NÃO PROVADO. Decisão do dono registrada em AD-057 (`.specs/STATE.md:62`, "ignore o crapper", 13/11/2026) e emenda E4 | RISCO ACEITO AD-057, não provado |
| `dryer` | K5 de `crap-abaixo-de-10/checks.md`, em `web/`, `$env:PYTHONUTF8=1`: `-s` das 6 fatias (`acesso`, `assistente`, `chamados`, `conhecimento`, `indicadores`, `administracao`) mais 30 arquivos de produto da raiz de `web/src` (`git ls-files 'src/*.ts' 'src/*.tsx'` sem subpasta e sem `.test.`), `--threshold 0.8` | `No duplicate candidates found.`, exit 0. Escopo cobre o movimento dos 2 arquivos para a raiz de `administracao/` | PASS (verified at 99f3689) |
| `dotnet build One.slnx` | `dotnet build One.slnx` (99f3689) | exit 0, `0 Aviso(s)`, `0 Erro(s)`, CA1502 ligado; a correção não toca `.cs` | PASS (verified at 99f3689) |
| `npm --prefix web run e2e` | não rodei nesta rodada | carried from builder (fcb5ed4/cdce9f0; 303 passaram, 8 falharam por ambiente contra 302 e 9 no base): NÃO VERIFICADO POR MIM. A correção só move 2 módulos e ajusta 5 imports; `npm --prefix web run build` e os 991 testes seguem verdes | carried from builder (não verificado por este verificador) |

## Coverage

Recomputado em 99f3689 a partir do disco e dos arquivos de teste as linhas cuja autoridade a correção tocou (door 4 e a contagem de `web/src/administracao`); as demais carried from 48aa387, com as linhas de `.cs` reconferidas em HEAD.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| door 4: subpastas do web (5) + raiz (1) | `Get-ChildItem web/src/administracao -Recurse -File` em HEAD: 52 arquivos; raiz 4 (`avisoAoFechar.ts`, `comum.tsx`, `IconesDoDestino.ts`, `LinhasDosCadastros.tsx`), `aparencia` 10, `fluxos` 14, `cadastros` 14, `integracoes` 8, `instituicoes` 2 (4+10+14+14+8+2 = 52); nome a nome igual a `estrutura.test.ts:66-72` | `aparencia` C13 `:73-74` · `fluxos` C13 `:73-74` · `cadastros` C13 `:73-74` · `integracoes` C13 `:73-74` · `instituicoes` C13 `:73-74` · raiz C13 `:64` | - |
| arquivos de produto de subpasta sem import de outra subpasta (35 de 52 que não são teste e estão em subpasta, menos a raiz) | busca por `\.\./(aparencia¦fluxos¦cadastros¦integracoes¦instituicoes)/` em arquivo não-teste de subpasta: 0 resultados. Só `fluxos/canvas.test.tsx:6` e `:8` importam de `../aparencia/Aparencia` e `../cadastros/Cadastros`, e a regra da emenda E1 vale para arquivo de produto, não para teste | C13 `:75-76` | - |
| door 1: namespace segue a pasta (1) | `ArquiteturaTests.cs:418` | C3 | - |
| door 2: um nível (1) | `ArquiteturaTests.cs:312-323` | C2 | - |
| door 3: nomes de subpasta da API (22) | `SubpastasPermitidas`, soma 22 em `ArquiteturaTests.cs:312` | C2 e os 5 `Mapa_de_*` | - |
| contagem por pasta: `Chamados` (7), `Administracao` (9), `Assistente`, `Conhecimento`, `Instituicoes` (11) | `ArquiteturaTests.cs:341-402`, nenhum `.cs` mudou desde 48aa387 | C5, C8, C10, C11, C12 | - |
| 10 ações do chamado (10) | `ArquiteturaTests.cs:779-780` | C6, C5 | - |
| arquivos que usam `IgnoreQueryFilters` (9) | `ArquiteturaTests.cs:74`, `:79`, `:80` | C7 | - |
| fatias planas (3) | `ArquiteturaTests.cs:330` | C4 | - |
| rotas do retrato, nenhuma nova ou alterada (93) | `One.Api.Tests/Retratos/rotas.txt` com 93 linhas (`(Get-Content ...).Count`) | C16 `RetratoTests.cs:37`, `:49` | - |
| startup config: assemblies de teste (1) | `One.Api.Tests/Infra/OneFactory.cs` (carried from 48aa387) | C16, C17 | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Regra de arquitetura (`ArquiteturaTests`) | `One.Api.Tests/ArquiteturaTests.cs` (a correção não o tocou) e `web/src/test/estrutura.test.ts` (a correção o tocou: `:64-76`) | um teste por regra, cada nome de subpasta e cada contagem do mapa como linha da asserção, nos dois sentidos | yes: o `it` do web agora confere a raiz (`:64`), cada subpasta arquivo a arquivo (`:73-74`) e a ausência de import entre subpastas (`:75-76`); as 3 faltas novas (F7-F9) morreram nesses números de linha |
| Código movido sem mudança de lógica | 252 arquivos do diff `eab6d1c..99f3689` | cobertura pelos testes existentes (C17) | yes: `dotnet test` 986/986, `npm test` 991/991, `RetratoTests` 6/6 em 99f3689 |

## Faults injected

Todas em `git worktree add %TEMP%\verif-wt3 HEAD` (sem `git stash`; `node_modules` por junction para o da árvore real, removida antes do `worktree remove --force`); `git worktree list` sem `verif-wt3` ao fim e porcelain da árvore real igual ao baseline (`fc`: nenhuma diferença). Comando de cada falta, dentro de `verif-wt3\web`: `npx vitest run src/test/estrutura.test.ts -t "administracao em subpastas"` (equivalente ao `npm --prefix web test -- ...` da prova do C13; a primeira tentativa com `npm --prefix <caminho do worktree>` devolveu `no tests` por causa do caminho temporário e foi descartada). Baseline no worktree: `Tests 1 passed | 2 skipped`, antes e depois das faltas. Faltas F1-F6 e G1-G3 das rodadas 1 e 2 carried from 48aa387 (superfície `.cs` que a correção não tocou). Faltas desta rodada, na superfície nova:

| Mutation | Location | Killed |
| --- | --- | --- |
| F7: recolocar import cruzado em arquivo de produto | `web/src/administracao/fluxos/PainelDoNo.tsx` com `import { vazioDaAba } from '../cadastros/Cadastros'` acrescentado na 1ª linha -> `AssertionError: fluxos/PainelDoNo.tsx: expected 'import { vazioDaAba } from '../cadas…' not to match /…/(?:aparencia¦fluxos¦cadastros¦integracoes¦instituicoes)\/`, `estrutura.test.ts:76:60`, `1 failed` | yes |
| F8: mover um arquivo de uma subpasta para outra | `git mv web/src/administracao/integracoes/Moodle.tsx web/src/administracao/cadastros/Moodle.tsx` -> `AssertionError: cadastros: expected [ 'Cadastros.tsx', 'Gerir.tsx', …(13) ] to deeply equal [ 'Cadastros.tsx', 'Gerir.tsx', …(12) ]`, `estrutura.test.ts:74:120`, `1 failed` | yes |
| F9: `IconesDoDestino.ts` de volta para `fluxos/` | `git mv web/src/administracao/IconesDoDestino.ts web/src/administracao/fluxos/IconesDoDestino.ts` -> `AssertionError: expected [ 'LinhasDosCadastros.tsx', …(2) ] to deeply equal [ 'IconesDoDestino.ts', …(3) ]`, `estrutura.test.ts:64:55`, `1 failed` | yes |

## Gate

`dotnet test One.Api.Tests --logger "console;verbosity=normal"` - 986 passed, 0 failed, 0 skipped (99f3689)
`npm --prefix web test -- --maxWorkers=4` - 991 passed, 0 failed, 0 skipped (98 arquivos)
`npm --prefix web run build` - exit 0
`npm --prefix web run coverage -- --maxWorkers=4` - exit 0, 98 arquivos passaram
`dryer` (K5, `--threshold 0.8`) - `No duplicate candidates found.`, exit 0
`dotnet build One.slnx` - exit 0, 0 avisos, 0 erros
`dotnet ef migrations has-pending-model-changes --project One.Api` - exit 0
`crapper --use-existing-coverage -s src --threshold 9.99` - NÃO RODADO, nem provado: risco aceito AD-057 (decisão do dono, `.specs/STATE.md:62`), `crapper.exe` bloqueado neste computador
`npm --prefix web run e2e` - carried from builder, não verificado por este verificador

## Gaps ranqueados

1. Risco aceito, AD-057 (`.specs/STATE.md:62`): CRAP < 10 do `web/` (membro `crapper` do C19) não foi provado. Não é PASS provado; é uma decisão do dono. Para fechar de fato: rodar `crapper` em outra máquina.
2. e2e carregado do builder (303 passaram, 8 falharam por ambiente), não rodado por este verificador.
3. C13 (precisão, não bloqueia): o regex de `estrutura.test.ts:76` só reconhece `from '...'` com aspas simples. Hoje a busca mais larga no disco dá 0 resultados; um `import('../fluxos/x')` ou aspas duplas futuros passariam despercebidos.
4. C18 (ressalva, carried): `asserts_so_caminho.py` é cego a arquivo movido ou apagado; compensado pelo diff `git diff -M`.
