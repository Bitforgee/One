# Fatias em subpastas verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: eab6d1c..48aa387
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Base real do diff: `eab6d1c` (os checks citam `5c3c8ee`; o `Handoff` do checks.md registra a troca). Rodada 1 verificou `eab6d1c..4b3d0c2` e deu FAIL em C7 e C19. A correção desta rodada é `4b3d0c2..48aa387`: uma linha, `One.Api.Tests/ArquiteturaTests.cs:80` `Assert.Equal(permitidos.Order(), usos.Order());`. As provas rodaram de novo em `HEAD` 48aa387 (lote completo). Seções marcadas `carried from 4b3d0c2` não foram refeitas: o diff da correção toca só `ArquiteturaTests.cs`, método `IgnoreQueryFilters_so_no_agendador_e_no_comando`. Árvore real: `git status --porcelain` = só este `verification.md` (untracked) antes e depois.

## Binding sources

None - sem fonte vinculante além do plano (carried from 4b3d0c2; a correção não toca interface).

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none (plano sem fonte binding) | n/a | none | - |

## Checks

Proofs em lote, verified at 48aa387. `dotnet test One.Api.Tests --logger "console;verbosity=normal"` (log próprio, cada teste por nome): `Total de testes: 986`, `Aprovados: 986`, 0 falhas, 0 ignorados. Cada nome dos checks C2-C12 e C16 aparece exatamente 1 vez como `Aprovado` (`Subpastas_das_fatias`, `Namespace_igual_a_pasta`, `Fatias_planas`, `Fatias_do_api`, `Mapa_de_Chamados`, `Dez_acoes_do_chamado`, `IgnoreQueryFilters_so_no_agendador_e_no_comando`, `Mapa_de_Administracao`, `Importacao_em_arquivo_proprio`, `Mapa_de_Assistente`, `Mapa_de_Conhecimento`, `Mapa_de_Instituicoes`, `Modelo_sem_mudanca_pendente`) e `RetratoTests` 6 vezes. `npm --prefix web test -- --maxWorkers=4`: 98 arquivos, 991 passed, 0 falhas. Citações de linha de `ArquiteturaTests.cs` conferidas contra o arquivo em HEAD: a correção acrescenta 1 linha em `:80`, depois de `:79`; as citações da rodada 1 acima de `:80` deslocam +1 (carried from 4b3d0c2, conteúdo não alterado pelo diff da correção).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | AD-056 `active` citando AD-017/AD-040 e `AGENTS.md` com `One.Api/<Fatia>/<Subpasta>/` | carried from 4b3d0c2 (`pwsh Select-String` em `STATE.md` e `AGENTS.md`, exit 0) | `.specs/STATE.md:61` `\| AD-056 \| ... \| active \|`; `AGENTS.md:87` `One.Api/<Fatia>/<Subpasta>/` | PASS |
| C2 | `Subpastas_das_fatias`: 1 nível, 22 nomes, <= 12 por subpasta, <= 4 na raiz | lote 986 em 48aa387: Aprovado (1 hit) | `ArquiteturaTests.cs:311` `Assert.Equal(22, SubpastasPermitidas.Values.Sum(s => s.Length))`; `:319` `Assert.True(porPasta[pasta].Count <= 12, ...)`; `:322` `Assert.True(naRaiz <= 4, ...)` (carried from 4b3d0c2; faltas F2, F3) | PASS |
| C3 | todo `.cs` declara 1 `namespace` = `One.Api` + pasta | lote 986: Aprovado | `ArquiteturaTests.cs:417` `Assert.True(declarados.SequenceEqual([esperado]), ...)` (carried from 4b3d0c2; falta F1) | PASS |
| C4 | `Acesso`, `Mcp`, `Indicadores` planas; `Fatias_do_api` 7 + `Dados` | lote 986: Aprovado (os dois) | `:329` `Assert.Equal(["Acesso", "Indicadores", "Mcp"], FatiasPlanas.Order())`; `:277` `Assert.Equal([.. Fatias.Append("Dados").Order()], pastas)` | PASS |
| C5 | `Chamados` 2/12/4/9/6/4/6 = 43 | lote 986: Aprovado | `:346` `Assert.Equal(nomes.Order(...), porPasta[pasta].Order(...))`; total `43` | PASS |
| C6 | 10 ações em `Chamados/Acoes/` | lote 986: Aprovado | `:778` `Assert.Equal(10, acoes.Count)`; `:779` `File.Exists(...Acoes...) && t.Namespace == "One.Api.Chamados.Acoes"` | PASS |
| C7 | `IgnoreQueryFilters` em exatamente 9 arquivos; teste compara a lista nos dois sentidos | lote 986: `IgnoreQueryFilters_so_no_agendador_e_no_comando` Aprovado (verified at 48aa387); 9 caminhos em `permitidos` (`:74`) | `One.Api.Tests/ArquiteturaTests.cs:79` `Assert.All(usos, p => Assert.Contains(p, permitidos))` (uso -> lista) e `:80` `Assert.Equal(permitidos.Order(), usos.Order())` (lista -> uso, e tamanho 9). Faltas G1, G2 e G3 (abaixo) são mortas; F6 da rodada 1, que sobrevivia, agora morre em `:80` | PASS |
| C8 | `Administracao` 2/4/5/5/6/4/7/2/6 = 41 | lote 986: Aprovado | `:346-349` `ConferirMapa`, total `41` | PASS |
| C9 | `/matriculas/importacao` em `Administracao/Matriculas/`, 1 `.Map*(` | lote 986: Aprovado | `:448` `Assert.Single(...)`; `:449` `Assert.Equal("Administracao/Matriculas", ...)`; `:450` `Assert.Single(Regex.Matches(..., @"\.Map\w*\("))` | PASS |
| C10 | `Assistente` 1/12/10/4 = 27 | lote 986: Aprovado | `:346-349`, total `27` | PASS |
| C11 | `Conhecimento` 3/9/9 = 21 | lote 986: Aprovado | `:346-349`, total `21` | PASS |
| C12 | `Instituicoes` 1/7/7/10 = 25 | lote 986: Aprovado | `:346-349`, total `25` | PASS |
| C13 | `it("administracao em subpastas")`: 52 arquivos, 5 subpastas, raiz 2 arquivos | `npm --prefix web test` 991 passed em 48aa387 (inclui o `it`; carried from 4b3d0c2: `-t` individual `1 passed`) | `web/src/test/estrutura.test.ts:58` `expect(dela.length).toBe(52)`; `:61` `expect(partes.length, arquivo).toBeLessThanOrEqual(2)`; `:64` `toEqual(['avisoAoFechar.ts', 'comum.tsx'])` | PASS |
| C14 | `it("estrutura em fatias")` passa | `npm --prefix web test` 991 passed | `estrutura.test.ts:27` `expect(pastas).toEqual([...Fatias, ...SemTela].sort())` (carried from 4b3d0c2) | PASS |
| C15 | sem import `@/` em `administracao/<subpasta>/`; `npm --prefix web run build` exit 0 | `it` dentro do lote web verde; build carried from 4b3d0c2 (exit 0) | `estrutura.test.ts:84` `expect(texto(...), arquivo).not.toMatch(/(?:from\|import)\s*\(?\s*['"]@\//)` | PASS |
| C16 | rotas, respostas e EF iguais; sem migration | lote 986: `RetratoTests` 6 Aprovado e `Modelo_sem_mudanca_pendente` Aprovado; `git diff --stat eab6d1c..HEAD -- One.Api/Dados` vazio (carried from 4b3d0c2) | `RetratoTests.cs:49` `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")).Order(...), viva.Order(...))`; `:37` `Assert.Equal(93, viva.Count)`; `ArquiteturaTests.cs:758` `Assert.False(... HasPendingModelChanges())`. Gap de precisão (carried): o check diz 61 linhas, o retrato tem 93 | PASS |
| C17 | 0 falhas, 0 pulados, >= 979 testes .NET; 0 falhas web | `dotnet test One.Api.Tests` e `npm --prefix web test -- --maxWorkers=4` em 48aa387 | `Total de testes: 986`, `Aprovados: 986` (986 >= 979); Vitest `Test Files 98 passed (98)`, `Tests 991 passed (991)` | PASS |
| C18 | asserção removida reaparece normalizada; sem skip/only | carried from 4b3d0c2 (`asserts_so_caminho.py` exit 0: 14 removidas, 0 sem equivalente, 0 skip/only; diff `-M` manual) | diff `4b3d0c2..48aa387` só adiciona `ArquiteturaTests.cs:80`; nenhuma asserção removida, nenhum `Skip`/`.skip(`/`.only(` novo | PASS |
| C19 | `crapper` < 10 depois de `coverage`; `dryer` sem candidato; e2e = base; `dotnet build` 0 com CA1502 | ver abaixo, por membro | ver abaixo | FAIL |

**C19 por membro**

| Membro | Proof run | Saída | Resultado |
| --- | --- | --- | --- |
| coverage | `npm --prefix web run coverage -- --maxWorkers=4` (48aa387) | exit 0, `Test Files 98 passed (98)`, `Tests 991 passed (991)` | PASS |
| `crapper` | `cd web; $env:PYTHONUTF8=1; crapper --use-existing-coverage -s src --threshold 9.99` (48aa387, depois do `coverage`) | NÃO RODOU de novo. Erro literal: `Program 'crapper.exe' failed to run: An error occurred trying to start process 'C:\Users\Alfredo Neto\.local\bin\crapper.exe' with working directory 'D:\one-system\web'. Uma política de Controle de Aplicativo bloqueou este arquivo.` Sem contorno da política. CRAP < 10 não provado | FAIL (não provado) |
| `dryer` | carried from 4b3d0c2: `dryer -s ... --threshold 0.8` exit 0, `No duplicate candidates found.` | a correção não toca `web/` | PASS |
| `dotnet build One.slnx` | carried from 4b3d0c2: exit 0, 0 Aviso(s), 0 Erro(s), CA1502 ligado; `dotnet test` de 48aa387 compilou `One.Api` e `One.Api.Tests` sem erro | a correção é só teste | PASS |
| `npm --prefix web run e2e` | não rodei | Carregado do builder (303 passaram / 8 falharam por ambiente contra 302 / 9 no base): NÃO VERIFICADO POR MIM | FAIL (não provado) |

## Coverage

Recomputado em 48aa387 só a linha cuja autoridade a correção tocou; as demais carried from 4b3d0c2.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| arquivos que usam `IgnoreQueryFilters` (9) | busca real `Get-ChildItem One.Api -Recurse *.cs` com `IgnoreQueryFilters` fora de bin/obj = 9, os mesmos 9 de `ArquiteturaTests.cs:74` | `:79` uso -> lista e `:80` lista -> uso, C7 (falta G2 caminho fantasma e G3 uso retirado mortas) | - |
| door 1: namespace segue a pasta (1) | `ArquiteturaTests.cs:417` (carried from 4b3d0c2) | C3 | - |
| door 2: um nível (1) | `ArquiteturaTests.cs:317` (carried from 4b3d0c2) | C2 | - |
| door 3: nomes de subpasta da API (22) | `SubpastasPermitidas` `:284-290` (carried from 4b3d0c2) | C2 e os 5 `Mapa_de_*` | - |
| door 4: subpastas do web (5) | `web/src/administracao` (carried from 4b3d0c2) | C13 `:62`, `:65` | contagem por subpasta (10/15/15/2/8) e atribuição arquivo a arquivo sem asserção (gap de precisão, não bloqueia) |
| contagem por pasta: `Chamados` (7), `Administracao` (9), `Assistente`, `Conhecimento`, `Instituicoes` (11) | `Get-ChildItem` (carried from 4b3d0c2) | C5, C8, C10, C11, C12 | - |
| 10 ações do chamado (10) | `:356` e `IAcaoChamado` (carried from 4b3d0c2) | C6, C5 | - |
| fatias planas (3) | `FatiasPlanas` `:293` (carried from 4b3d0c2) | C4 | - |
| rotas do retrato (93, não 61) | `rotas.txt` (carried from 4b3d0c2) | C16 `RetratoTests.cs:37`, `:49` | tamanho 61 no checks.md está errado; prova cobre as 93 |
| web `administracao`: 52 arquivos (52) | `Get-ChildItem -Recurse -File` (carried from 4b3d0c2) | C13 `:58` | - |
| startup config: assemblies de teste (1) | `One.Api.Tests/Infra/OneFactory.cs` (carried from 4b3d0c2) | C16, C17 | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Regra de arquitetura (`ArquiteturaTests`) | `One.Api.Tests/ArquiteturaTests.cs` (arquivo tocado pela correção) | um teste por regra, cada nome de subpasta e cada contagem do mapa como linha da asserção, nos dois sentidos | yes: `Subpastas_das_fatias`, 5 `Mapa_de_*`, `Fatias_planas` (carried from 4b3d0c2) e agora a lista de `IgnoreQueryFilters` nos dois sentidos (`:79` e `:80`), que a rodada 1 apontara |
| Código movido sem mudança de lógica | 252 arquivos do diff (carried from 4b3d0c2) | cobertura pelos testes existentes (C17) | yes: `dotnet test` 986/0/0, `npm test` 991/0/0, `RetratoTests` 6/6 em 48aa387 |

## Faults injected

Todas em `git worktree add %TEMP%\verif-wt2 HEAD` (sem `git stash`), removido ao fim com `git worktree remove --force`; `git worktree list` sem `verif-wt2` e porcelain da árvore real igual ao baseline. Faltas F1-F5 da rodada 1 carried from 4b3d0c2 (mortas, nos arquivos que a correção não toca). Faltas desta rodada, na superfície nova (`ArquiteturaTests.cs:80`):

| Mutation | Location | Killed |
| --- | --- | --- |
| G1 (rodada 2): F6 da rodada 1 refeita, retirar `.IgnoreQueryFilters()` de arquivo da lista (compila) | `One.Api/Acesso/ApagarLancamentos.cs:17` -> `dotnet test --filter ...IgnoreQueryFilters_so_no_agendador_e_no_comando`: `Assert.Equal() Failure: Collections differ at index 0`, `ArquiteturaTests.cs:line 80`, `Com falha: 1` | yes |
| G2 (rodada 2): caminho fantasma em `permitidos` (membro da lista sem uso) | `One.Api.Tests/ArquiteturaTests.cs:74` com `Path.Combine(api, "Acesso", "Fantasma.cs")` acrescentado -> `Assert.Equal() Failure: Collections differ at index 1`, `:line 80`, `Com falha: 1` | yes |
| G3 (rodada 2): mover um dos 9 arquivos de pasta (`git mv Chamados/Tarefas/FecharResolvidos.cs Chamados/Push/`) | `One.Api/Chamados/Push/FecharResolvidos.cs` -> `Assert.All() Failure: 1 out of 9 items ... did not pass`, `:line 79`, `Com falha: 1` | yes |

Observação de ambiente: o orquestrador relatou que remover `.IgnoreQueryFilters()` de `Acesso/ApagarLancamentos.cs` travava o `dotnet test` da suíte inteira. Não reproduzi: G1 rodou com `--filter` do teste e terminou em 65 ms com falha, sem travar. Não rodei a suíte inteira com essa falta, então o travamento da suíte completa nem se confirma nem se descarta; G1 não é usado como prova de trava.

## Gate

`dotnet test One.Api.Tests --logger "console;verbosity=normal"` - 986 passed, 0 failed, 0 skipped
`npm --prefix web test -- --maxWorkers=4` - 991 passed, 0 failed, 0 skipped (98 arquivos)
`npm --prefix web run coverage -- --maxWorkers=4` - 991 passed, 0 failed
`crapper --use-existing-coverage -s src --threshold 9.99` - não rodou (Controle de Aplicativo bloqueou `crapper.exe`): C19 não provado
`npm --prefix web run e2e` - não rodado por este verificador; resultado do builder carregado, não verificado

## Gaps ranqueados

1. C19: `crapper` segue bloqueado neste computador (`C:\Users\Alfredo Neto\.local\bin\crapper.exe`), CRAP < 10 não provado; e2e carregado do builder, não verificado. Exige rodar em outra máquina ou liberar o executável.
2. C16 (precisão, não bloqueia): checks.md cita 61 linhas de rotas; `RetratoTests.cs:37` fixa 93.
3. C13 (precisão, não bloqueia): atribuição arquivo a arquivo do web sem asserção (`estrutura.test.ts:65` exige só >= 1 arquivo por subpasta).
4. C18 (ressalva, PASS, carried from 4b3d0c2): `asserts_so_caminho.py` é cego a arquivo movido ou apagado; compensado pelo diff `git diff -M`.

C7 mudou de FAIL para PASS nesta rodada.
