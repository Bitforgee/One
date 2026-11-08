# Fluxos de atendimento configuráveis verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: e1320eb..e4cd3e9
**Round**: 4 - scoped
**Verifier**: independent sub-agent (author != verifier)

Rodada 4, autorizada pelo usuário além do limite de 3 rodadas. Escopo: o diff `92d7749..e4cd3e9` (`checks.md` C40/C72/C108/`## Screens`, `web/e2e/fluxos-real.spec.ts`, `web/e2e/celular.spec.ts`, `web/src/administracao/canvas.test.tsx`, `.specs/STATE.md`) e os três checks não-PASS da rodada 3 (C40, C104, C105). Todas as provas rodaram de novo em worktree limpo de `e4cd3e9`.

Resultado: 111 de 113 checks com PASS. FAIL em **C105** (defeito novo: `fluxos-real.spec.ts:183` tem `` `n `` literal no lugar de quebras de linha, o arquivo não compila e o Playwright sai 1 com `SyntaxError ... Missing semicolon (183:207)` e `No tests found`) e **C104** (ambiente: `crapper.exe` bloqueado pelo Controle de Aplicativo do Windows; FAIL-por-ambiente aceito pelo AD-044, não é PASS). C40 virou PASS e a linha "Canvas" do `## Screens` não contradiz mais o código. Com o `` `n `` trocado por quebras de linha reais numa cópia temporária (apagada depois), os 3 testes reais passam e a falta F2 é morta pela asserção nova `'(48 h)'`: o conteúdo da correção está certo, mas o arquivo commitado não roda.

Atualização da rodada 5 (a4821c7): o C105 virou PASS (ver "Round 5 - addendum"). **A única linha não-PASS é o C104 (ambiente, AD-044).** O veredito segue FAIL porque `validate_verification.py` recusa PASS com uma linha FAIL.

Worktrees: `D:\verif-wt5` (provas web, e2e, imagem Docker, faltas) e `D:\verif-wt5b` (a suíte dotnet completa, ver Gate e D1), os dois em `e4cd3e9`, os dois removidos no fim. `git status --porcelain` da árvore real antes: `?? .specs/prompt-evolucao-one.md`, `?? .specs/prompt-mobile-first.md`. Depois: vazio, porque durante a rodada a outra pessoa do par fez três commits na `main` (`4af4c53`, `630bec7` que commitou esses dois arquivos, `f06a357`; HEAD agora em `f06a357`). Esses commits não são meus e estão fora do intervalo verificado (`..e4cd3e9`). Eu não mexi na árvore real: o único arquivo que escrevi nela é este relatório. Sem `git stash`.

Cada seção diz de onde vem: `verified at e4cd3e9` (re-executada ou relida nesta rodada) ou `carried from 92d7749` (julgamento da rodada 3 sobre arquivos que o diff da correção não tocou; a prova rodou de novo e passou em `e4cd3e9`).

## Binding sources

Seção `verified at e4cd3e9` para as linhas que a correção tocou; as outras são `carried from 92d7749`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/STATE.md` AD-041 a AD-044 (`:47-50`) | yes - relido em `e4cd3e9`; o diff só mexe no `## Handoff` (`:54`) | nenhuma. AD-044 aceita só o C104 (`crapper` não executável neste computador); não cobre o C105 | - |
| `checks.md` C40 (emendado em `e4cd3e9`) contra `cadastros-fluxo-visual` K4 e o código | yes | nenhuma: o claim agora diz abrangência, etapas e estado, nessa ordem, sem ` · ` nem ` → `; o código (`LinhasDosCadastros.tsx:50-56`: `abrangenciaDoFluxo`, `MiniCadeia`, `Selos`) e o teste (`fluxos.test.tsx:60-62`) batem com ele | - |
| `checks.md` `## Screens`, linha "Canvas" (emendada em `e4cd3e9`) | yes | nenhuma: "Chamado aberto" saiu; agora diz "`Início` nunca coberto pelas etapas", que bate com `NosDoCanvas.tsx:23` e com C84/C109 | - |
| `checks.md` `## Screens`, linha "Cadastros, aba `Fluxos`" | yes | nenhuma. A linha diz "`Detalhe` (abrangência e cadeia)" e não fala do selo de estado, que o C40 cobre agora; é texto incompleto, não contradição | - |
| `plan.md` AC 57-59, 71 - carried from 92d7749 | yes | nenhuma | - |
| `cadastros-fluxo-visual/{plan,checks}.md` K1-K17 - carried from 92d7749 (as linhas K4 e K11 foram relidas nesta rodada) | yes | nenhuma depois das emendas de C40 e de `## Screens` | - |
| reactflow.dev acessibilidade; Npgsql `AreNullsDistinct` - carried from a57fac8 | yes | nenhuma | - |

## Checks

Provas re-executadas em `e4cd3e9`:
- `dotnet build One.slnx` em `D:\verif-wt5`: 0 erros, 6 avisos (os mesmos da rodada 3).
- `dotnet test One.Api.Tests --no-build` em `D:\verif-wt5b`, uma execução só: **705 passaram, 0 falharam**, TRX `D:\verif-out4\verif.trx`. As **85** expressões `FullyQualifiedName~` únicas das linhas `Proof:` foram conferidas no TRX: cada uma casa 1 ou mais testes, todos aprovados, nenhuma casa 0 (inclusive `LiderancaDestinoTests.Sem_lideranca_disponivel_vai_a_coordenacao`, novo no C72).
- `npx vitest run --reporter=json`, uma execução só: **569 passaram, 0 falharam**. Os 28 nomes `-t` das linhas `Proof:` foram conferidos no JSON: cada um casa 1 ou mais testes aprovados (2 para "aviso da liderança", "cadeia inválida" e "canvas vazio e falha de carga").
- `npm run build` exit 0 e `node web/scripts/entrada-sem-canvas.mjs` exit 0.
- Playwright simulado com `vite preview` do worktree em :5199: 217 passaram, 0 falharam.
- Playwright real com a imagem `one-verif-fluxos:e4cd3e9` em :8089, banco `one_verif_fluxos4`, bucket `one-verif-fluxos4` e instituições `e2e` e `e2g` criadas por `instituicao criar`. O LLM é falso: `Llm__BaseUrl` aponta para o servidor do próprio spec.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1, C2 | migração vira fluxo; chamados antigos nulos | `FluxoMigracaoTests` 2/2 no TRX | carried from 92d7749: `FluxoMigracaoTests.cs:83`, `:91-92` | PASS |
| C3-C8 | precedência, versão/etapa/entrada, rascunho ignorado, Triagem, coordenação, etapa que não resolve | `FluxoRoteamentoTests` 6/6 | carried from 92d7749: `FluxoRoteamentoTests.cs:60-62`, `:78`, `:92-93`, `:112`, `:139-140`, `:157-161` | PASS |
| C9 | atendimento direto na Triagem | `TransferenciaTests.Atendimento_direto_sem_fluxo_na_triagem` 1/1 | carried from 92d7749: `TransferenciaTests.cs:70`, `:72` | PASS |
| C10, C11 | carga `regras` vira fluxo; categoria repetida recusada | `CargaValidacaoTests` 2/2 + `InstituicaoComandoTests.Carga_continua_com_a_mesma_saida` 1/1 | carried from 92d7749: `CargaValidacaoTests.cs:74-76`, `:85`; `InstituicaoComandoTests.cs:183-186` | PASS |
| C12 | sem rotas de `regras` | `RetratoTests.Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano` 1/1 | carried from 92d7749: `RetratoTests.cs:39` `Assert.Equal(84, viva.Count)`; `:51` | PASS |
| C13, C14 | constraints e colunas | `FluxoModeloTests` 2/2 | carried from 92d7749: `FluxoModeloTests.cs:50`, `:55-57`, `:65-83`, `:102-116`, `:119` | PASS |
| C15, C16 | `Escolher` (8) e `Etapa` (8) | `FluxoDominioTests` 8/8 e 8/8 | carried from 92d7749: `FluxoDominioTests.cs:56`, `:86` | PASS |
| C17-C33 | API de fluxos: criar, bordas, 409, rascunho, publicar, descartar | `FluxoAdminTests`, 17 métodos com 1/1 cada | carried from 92d7749: `FluxoAdminTests.cs:60-64`, `:78-82`, `:94-95`, `:106-107`, `:120`, `:133`, `:148-153`, `:165-168`, `:179-181`, `:196-199`, `:210-211`, `:223-227`, `:238-241`, `:252-258`, `:274-282`, `:292`, `:307`, `:329-331`, `:341-354` | PASS |
| C34-C36 | simulação sem gravar, motivos, igual à transferência | `FluxoSimulacaoTests` 3/3 | carried from 92d7749: `FluxoSimulacaoTests.cs:50`, `:55`, `:86`, `:115` | PASS |
| C37 | decisão só no `ResolverFluxo` | `ArquiteturaTests.Setor_so_pelo_ResolverFluxo` 1/1 | carried from 92d7749: `ArquiteturaTests.cs:692+` | PASS |
| C38, C39 | simular 400/404; GET lista | `FluxoAdminTests` 2/2 | carried from 92d7749: `FluxoAdminTests.cs:367-380`, `:399-409` | PASS |
| C40 | a linha mostra a categoria e, em ordem, a abrangência, as etapas e o estado: `Todos os cursos`, `Setor Financeiro`, `Publicado v1` / `ADS, 3º semestre`, `Liderança do semestre`, `Coordenação do curso (48 h)`, `Publicado v2` | vitest `fluxos.test.tsx -t "lista com abrangência e cadeia"` 1/1 | verified at e4cd3e9: `fluxos.test.tsx:60` `expect(linhas).toEqual([` ; `:61` `['Notas', 'Todos os cursosSetor FinanceiroPublicado v1']`; `:62` `['Boletos', 'ADS, 3º semestreLiderança do semestreCoordenação do curso (48 h)Publicado v2']`. O `textContent` concatenado prova a ordem e os valores que o claim agora define. Morta por F2 | PASS |
| C41 | criar pede categoria e abrangência | `-t "criar pede categoria e abrangência"` 1/1 | carried from 92d7749: `fluxos.test.tsx:72`, `:73`, `:74-75` | PASS |
| C42 | `Simular` pede curso e semestre; `Publicar` desligado até a API aceitar | `-t "simular e publicar"` 1/1 | carried from 92d7749: `fluxos.test.tsx:114`, `:118`, `:123`, `:127`, `:130`, `:135` | PASS |
| C43 | estado vazio | `-t "estado vazio"` 1/1 | carried from 92d7749: `fluxos.test.tsx:158-165` | PASS |
| C44-C55 | subir, eventos, 409, estados, prazo do Agendador, corridas | `FluxoSubirTests` 8/8, `FluxoPrazoTests` 5/5 | carried from 92d7749: `FluxoSubirTests.cs:28-30`, `:44-49`, `:63-78`, `:105-113`, `:128-132`, `:143-145`, `:157-168`; `FluxoPrazoTests.cs:40-43`, `:60-62`, `:79-88`, `:113-115`, `:131-132` | PASS |
| C56 | frases da subida | `chamado.test.tsx -t "frase da subida"` 1/1 | carried from 92d7749: `chamado.test.tsx:278`, `:280` | PASS |
| C57 | encaminhar manual sai do fluxo | `FluxoSubirTests.Encaminhar_manual_sai_do_fluxo` 1/1 | carried from 92d7749: `FluxoSubirTests.cs:182` | PASS |
| C58 | botão `Subir` pede o motivo | `acoes.test.tsx -t "subir pede o motivo"` 1/1 | carried from 92d7749: `acoes.test.tsx:161`, `:167` | PASS |
| C59 | subida não derruba `RoteamentoCorreto` | `IndicadoresCalculoTests.Subida_nao_derruba_o_roteamento_correto` 1/1 | carried from 92d7749: `IndicadoresCalculoTests.cs:51-53` | PASS |
| C60 | `subir` só ATENDENTE e LIDER; 10 tipos, 11 nomes | 2 filtros, 1/1 cada | carried from 92d7749: `PermissoesChamadoTests.cs:66`, `:69-71`; `ArquiteturaTests.cs:660`, `:670` | PASS |
| C61-C66 | liderança no setor | `LiderancaSetorTests` 6/6 | carried from 92d7749: `LiderancaSetorTests.cs:41-44`, `:57-58`, `:69-73`, `:85-94`, `:109-111`, `:125-136` | PASS |
| C67-C69 | disponibilidade, `GET /destino`, 400/404/409 | `LiderancaDestinoTests` 3/3 | carried from 92d7749: `LiderancaDestinoTests.cs:73-85` | PASS |
| C70 | aviso literal e só `Cancelar`/`Enviar à liderança` | `lideranca.test.tsx -t "aviso da liderança"` 2/2 | carried from 92d7749: `lideranca.test.tsx:37`, `:38`, `:60` | PASS |
| C71 | prévia que falha segura o envio | `-t "prévia que falha segura o envio"` 1/1 | carried from 92d7749: `lideranca.test.tsx:89-92` | PASS |
| C72 | `/transferir` sem `aceitaLideranca`; liderança quando o fluxo manda e há liderança, coordenação quando não há | `LiderancaDestinoTests.Fluxo_decide_e_o_aluno_nao_escolhe` 1/1 + `LiderancaDestinoTests.Sem_lideranca_disponivel_vai_a_coordenacao` 1/1 (2ª prova, nova em `e4cd3e9`) | verified at e4cd3e9: `LiderancaDestinoTests.cs:98` `foreach (var chamado in new[] { recusou, omitiu }) Assert.Equal((t.Lideranca!.Id, 1), (chamado.SetorId, chamado.EtapaOrdem))`; `:122` `Assert.Equal((t.Coordenacao.Id, 2), (chamado.SetorId, chamado.EtapaOrdem))` (teste em `:116`). Fecha a lacuna B3 da rodada 3 | PASS |
| C73-C78 | visão do líder, 403, anexo, perde ao subir, solicitante, isolamento | `LiderVisaoTests` 5/5 + `IsolamentoTests` 1/1 | carried from 92d7749: `LiderVisaoTests.cs:27-32`, `:61`, `:65`, `:80-84`, `:98-102`, `:119-123`; `IsolamentoTests.cs:181-183` | PASS |
| C79 | tela do líder sem conversa nem matrícula | `-t "detalhe do líder"` 1/1 | carried from 92d7749: `chamado.test.tsx:309-310` | PASS |
| C80, C81 | `fluxo` no detalhe e `null` fora | `FluxoRastroTests` 2/2 | carried from 92d7749: `FluxoRastroTests.cs:36`, `:44`, `:61-63` | PASS |
| C82 | coluna lateral | `-t "etapa do fluxo na coluna lateral"` 1/1 | carried from 92d7749: `chamado.test.tsx:292`, `:297` | PASS |
| C83 | alternar mantém a edição | `canvas.test.tsx -t "alternar mantém a edição"` 1/1 | verified at e4cd3e9 (linhas antes da inserção em `:236`, não mudaram): `canvas.test.tsx:86`, `:93-94` | PASS |
| C84 | nós em ordem, ícone, rótulo, ` (48 h)` | `-t "nós em ordem com rótulo e prazo"` 1/1 | verified at e4cd3e9: `canvas.test.tsx:104` `noDeEtapa(2, 'Coordenação do curso (48 h)')`; `:106`; `:109-110`; `:113`; `:115` | PASS |
| C85 | arrastar do menu `Adicionar etapa` | `fluxos.spec.ts` "arrastar tipo da paleta" ✓ (`:61`) | carried from 92d7749: `fluxos.spec.ts:74-76` | PASS |
| C86 | regra de ligação | `-t "regra de ligação"` 1/1 | verified at e4cd3e9: `canvas.test.tsx:144-150` | PASS |
| C87 | ligar em cadeia | `fluxos.spec.ts` "ligar nós em cadeia" ✓ (`:81`) | carried from 92d7749: `fluxos.spec.ts:92`, `:96`, `:99`, `:101`, `:105` | PASS |
| C88 | cadeia inválida | `-t "cadeia inválida"` 2/2 | verified at e4cd3e9: `canvas.test.tsx:162-165`, `:180` | PASS |
| C89 | salvar envia ordem e posição | `-t "salvar envia ordem e posição"` 1/1 | verified at e4cd3e9: `canvas.test.tsx:193`, `:199-200` | PASS |
| C90 | remover pede confirmação | `-t "remover nó pede confirmação"` 1/1 | verified at e4cd3e9: `canvas.test.tsx:212-213`, `:218-222`, `:229` | PASS |
| C91 | Tab e setas | `fluxos.spec.ts` "teclado no canvas" ✓ (`:109`) | carried from 92d7749: `fluxos.spec.ts:121`, `:133`, `:134` | PASS |
| C92 | a lista tem as operações do canvas | `-t "lista tem todas as operações do canvas"` 1/1 | carried from 92d7749: `fluxos.test.tsx:166-198` | PASS |
| C93 | abaixo de 768 px só a lista | `fluxos.spec.ts` "celular só com a lista" ✓✓ (`:147`, `:175`) | carried from 92d7749: `fluxos.spec.ts:152`, `:153`, `:155`, `:180-182` | PASS |
| C94 | biblioteca só sob demanda | `estrutura.test.ts -t "canvas carregado só sob demanda"` 1/1 + build + script | verified at e4cd3e9: `entrada-sem-canvas: ok. Entrada: index-B8YUSlh3.js; canvas só em: Canvas-CNjUeWJD.js`, exit 0 | PASS |
| C95 | simulação marca os nós | `-t "simulação marca os nós"` 1/1 | verified at e4cd3e9 (+1 linha): `canvas.test.tsx:271` `Pulada: Sem liderança disponível`; `:272` `Vai por aqui` | PASS |
| C96 | canvas vazio e falha de carga | `-t "canvas vazio e falha de carga"` 2/2 | verified at e4cd3e9 (+1 linha): `canvas.test.tsx:279-280`; `:294` `Não foi possível abrir o canvas. Use a lista.` | PASS |
| C97 | versão exata `12.12.1` | `node -e ...` exit 0 | verified at e4cd3e9: `web/package.json:26` | PASS |
| C98 | visão e ciência vêm do tipo | 2 filtros (3/3, 1/1) | carried from 92d7749: `FluxoDominioTests.cs:144-145`; `ArquiteturaTests.cs:685`, `:687` | PASS |
| C99 | modelo sem mudança pendente, filtro, domínio puro | 3 filtros, 1/1 cada | carried from 92d7749: `ArquiteturaTests.cs:638`, `:45`, `:588` | PASS |
| C100 | retrato de rotas e 403 em toda rota admin | `RetratoTests` 2/2 | carried from 92d7749: `RetratoTests.cs:39`, `:64` | PASS |
| C101 | retrato de sucessos | `RetratoTests.Corpos_de_sucesso_iguais_aos_da_base` 1/1 + comando `pwsh` contra `e1320eb` | verified at e4cd3e9: comando: `C101 diffs: 0`; `RetratoTests.cs:305` | PASS |
| C102 | glossário e frases de evento | 1/1 + 1/1 | carried from 92d7749: `ArquiteturaTests.cs:236+`; `textos.test.tsx` "todo tipo de evento tem frase" | PASS |
| C103 | suítes verdes | `dotnet build One.slnx` 0 erros (6 avisos); `dotnet test One.Api.Tests` 705/0 (`D:\verif-wt5b`); `vitest run` 569/0; `npm run build` exit 0 | verified at e4cd3e9: TRX `D:\verif-out4\verif.trx` (705 `Passed`), JSON `D:\verif-out4\vitest.json` (`numFailedTests: 0`). Ver D1: em `D:\verif-wt5` a mesma suíte travou de forma reproduzível em `PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo`. A causa é a ordem dos testes, que depende do caminho do worktree. O travamento acontece igual em `e1320eb` (a base): não é regressão desta feature | PASS |
| C104 | `crapper` < 10 e `dryer` sem candidato | `npm run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99`; `dryer ... --threshold 0.8` | verified at e4cd3e9: `crapper`: `Program 'crapper.exe' failed to run ... Uma política de Controle de Aplicativo bloqueou este arquivo.` (não executou, sem saída de CRAP). `dryer`: `No duplicate candidates found.` exit 0 | FAIL (C: ambiente. FAIL-por-ambiente aceito pelo AD-044, `.specs/STATE.md:50`; não é PASS) |
| C105 | fluxo real de ponta a ponta | `E2E_URL=http://localhost:8089 npx playwright test e2e/fluxos-real.spec.ts` contra `one-verif-fluxos:a4821c7`, instituição `e2e` | verified at a4821c7 (rodada 5, só este check): **3 passed, exit 0** (`fluxos-real.spec.ts:147`, `:190`, `:210`). O arquivo compila: `:183-186` são quatro linhas reais (`const linhaDoFluxo = ...` e `toContainText` de `Liderança do semestre`, `Coordenação do curso`, `(48 h)`), sem `` `n `` literal. Round 4 (e4cd3e9) deu exit 1 `SyntaxError ... (183:207)`; corrigido em a4821c7 | PASS |
| C106 | e2e simulada verde; `anexos` e `plataforma` reais | (a) 9 specs em :5199: **217 passaram, 0 falharam**, exit 0. (b) `anexos.spec.ts plataforma.spec.ts` em :8089 (`E2E_INSTITUICAO=e2g`): **19 passaram, 0 falharam**. A primeira tentativa deu 429 do limitador de logins porque veio logo depois do C105; repetida depois de 75 s | verified at e4cd3e9: `celular.spec.ts:91` "Cadastros: seletor no topo e o botão de criar logo abaixo" ✓. Asserção nova `celular.spec.ts:99` `expect(novo.y - (seletor.y + seletor.height)).toBeLessThanOrEqual(120)`; `:100` `novo.y + novo.height <= 844`. Medido a 390x844: seletor `y 65, h 44`, Novo `y 181`, **distância 72 px** (só o título e a frase entre os dois). Julgamento: 120 px deixa 48 px de folga sobre o arranjo real e recusa o caso da rodada 3 (um Novo a 700 px). Recupera a intenção "logo abaixo"; B4 da rodada 3 fechado. Morta por F3 | PASS |
| C107 | editor em tela cheia, estado e `Mais` na barra, simulador | `-t "editor em tela cheia, ..."` 1/1 | verified at e4cd3e9 (+1 linha): `canvas.test.tsx:302` `w-screen`; `:303` `Publicado v1`; `:304` `Mais`; `:305`, `:309` `closest('aside')` | PASS |
| C108 | `+` insere no ponto e o limite de 5 é respeitado | `-t "inserir etapa no meio da cadeia"` 1/1 + `-t "organizar alinha a cadeia, inserir respeita o limite e o Início nunca fica coberto"` 1/1 (2ª prova, nova em `e4cd3e9`) | verified at e4cd3e9: teste `canvas.test.tsx:315`; `:318` `Inserir etapa entre Início e Liderança do semestre`; `:325-327` PUT com 3 etapas em ordem; limite: `:349` `expect(inserirEntre(cheio, Inicio, cheio.nos[0].id, novoNo('SETOR'))).toBe(cheio)` (teste `:341`). Fecha a lacuna B3 da rodada 3 | PASS |
| C109 | organizar, abrir realinha, barra remove sem confirmar | 3 filtros, 1/1 cada | verified at e4cd3e9 (+1 linha): `canvas.test.tsx:343` `organizar(g)`; `:344` `fixarPosicoes`; `:359-360` `translate(288px,80px)`, `translate(576px,80px)`; `:334-337` | PASS |
| C110 | textos acessíveis em português | 1/1 | verified at e4cd3e9: `canvas.test.tsx:127-129`, `:131-136` | PASS |
| C111 | `Simular` e `Publicar` na mesma barra a 1440 x 900 | `fluxos.spec.ts` "arranjo da barra de ações ..." ✓ (`:159`) | carried from 92d7749: `fluxos.spec.ts:166`, `:167`, `:169-172` | PASS |
| C112 | grade pontilhada; painel com setor e prazo; prazo 36 muda o nó; `Fechar` fecha | `-t "grade pontilhada e painel da etapa selecionada"` 1/1 | verified at e4cd3e9: `canvas.test.tsx:236` `expect(document.querySelector('.react-flow__background pattern circle')).not.toBeNull()` (nova, a variante de pontos); `:235` fundo; `:244` `findByLabelText('Etapa 1: Setor Financeiro (36 h)')`; o painel some depois de `Fechar` em `:247`. Morta por F1. Fecha a lacuna B5 da rodada 3 | PASS |
| C113 | o zoom nunca passa de 100% | `fluxos.spec.ts` "zoom máximo de 100%" ✓ (`:138`) | carried from 92d7749: `fluxos.spec.ts:142`, `:143` | PASS |

Checks com PASS: 111 de 113. FAIL: C104 (ambiente, AD-044) e C105.

## Coverage

Seção `verified at e4cd3e9` nas linhas que a correção tocou; as outras são `carried from 92d7749` e a prova de cada uma passou de novo.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| elementos do canvas decididos pelo AD-042 e pela K1-K17 (9) - verified at e4cd3e9 | `Canvas.tsx` (`:220` `BackgroundVariant.Dots`), `AdicionarEtapa.tsx`, `LigacaoComMais.tsx`, `PainelDoNo.tsx`, `EdicaoDoFluxo.tsx` | tela cheia, estado/`Mais`, simulador C107 · `+` C108 · `Organizar` e barra C109 · grade de pontos `canvas.test.tsx:236` C112 · painel C112 · zoom C113 · textos C110 · barra `Simular`/`Publicar` C111 | - |
| linha da lista de Fluxos: abrangência, etapas, estado (3) - verified at e4cd3e9 | `LinhasDosCadastros.tsx:50-56` | abrangência, etapas e selo `Publicado vN`: C40 (`fluxos.test.tsx:61-62`) · real: C105 (`fluxos-real.spec.ts:183`, hoje não compila) | - (os membros têm prova unitária que passa; o lado real é o FAIL do C105) |
| rótulos do nó inicial (1) - verified at e4cd3e9 | `NosDoCanvas.tsx:23` | `Início` C84 · `## Screens` não contradiz mais | - |
| ramos do destino na transferência (2) - verified at e4cd3e9 | AD-042, `ResolverFluxo` | liderança disponível `LiderancaDestinoTests.cs:98` · sem liderança, coordenação `:122`, os dois agora nas linhas `Proof:` do C72 | - |
| limite de etapas no `+` (1) - verified at e4cd3e9 | `grafo.ts:6` `MaximoDeEtapas = 5`, `:130` `inserirEntre` | `canvas.test.tsx:349`, agora na linha `Proof:` do C108 | - |
| arranjo de Cadastros a 390 px (seletor, criar, primeira tela) (3) - verified at e4cd3e9 | `Cadastros.tsx:72-90` | abaixo `celular.spec.ts:98` · perto (≤ 120 px) `:99` · primeira tela `:100` | - |
| tipos de destino x visão e ciência; ações que tiram do fluxo; "só liderança" (7 casos); botões do diálogo; rotas novas (8) e statuses; constraints; estados e papéis de `subir`; asserções existentes que mudam (7); startup config (2) - carried from 92d7749 | como na rodada 3 | C16, C57, C98, C17-C39, C44-C50, C60, C70, C73-C74, C80, C103; `LiderSemVazamentoTests.So_lideranca_por_caso` | - (`reclassificar` sai do fluxo coberto só em `base-fluxos`, `ReclassificarSaiDoFluxoTests` 5/5, sem mudança) |

## Test policy rows

Seção `verified at e4cd3e9` para as linhas que classificam arquivos tocados; as outras são carried from 92d7749.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide, atravessa a rota HTTP | `CriarFluxo`, `SalvarRascunho`, `PublicarFluxo`, `SubirChamado`, `VerDestino`, `DetalheChamado`, `TransferirConversa` | uma na rota; cada status e cada borda | yes - nenhum arquivo `One.Api/` mudou em `92d7749..e4cd3e9`; 85 filtros com 1 ou mais testes, 705/0 |
| Decide, sem atravessar rota | `ResolverFluxo`, `Chamado.Subir`, `Chamado.Reclassificar`, visão por tipo, `EquipeDeSetor.SoLideranca` | uma na própria camada, uma linha por linha da tabela | yes - carried from 92d7749 |
| Decide, na tela | `grafo.ts` (`podeLigar`, `cadeiaValida`, `organizar`, `fixarPosicoes`, `inserirEntre`), alternador, `PedidoAoAtendente` | um caso por linha | yes - verified at e4cd3e9: C86, C88, C71, `canvas.test.tsx:341-353` |
| Arrastar, soltar e teclado no canvas | `Canvas.tsx`, `AdicionarEtapa.tsx`, `PainelDoNo.tsx`, `LigacaoComMais.tsx` | uma no navegador, gesto e resultado | yes - verified at e4cd3e9: C85, C87, C91, C113 em :5199; a grade de pontos agora afirmada (`canvas.test.tsx:236`) |
| Instrumentation | `NosDoCanvas.tsx`, mapeamento | nenhuma própria | yes |

## Faults injected

Só no worktree `D:\verif-wt5` (`e4cd3e9`), só em código de produto, nas superfícies que as asserções novas da correção cobrem. Cada falta foi revertida com `git checkout -- <arquivo>` e o `git status --porcelain` do worktree conferido vazio depois. Sem `git stash`. As faltas das rodadas 1 a 3 (5 + 5 + 5, todas mortas) seguem como estavam (carried from a57fac8, cdc634d e 92d7749).

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: a grade passa de pontos a linhas: `BackgroundVariant.Dots` vira `BackgroundVariant.Lines` | `web/src/administracao/Canvas.tsx:220` | yes - vitest "grade pontilhada e painel da etapa selecionada" falha em `canvas.test.tsx:236`: `AssertionError: expected null not to be null`. O fundo ainda existe, então quem mata é a asserção nova `pattern circle` (C112) |
| F2: a linha da lista de Fluxos perde o prazo da etapa: `{rotuloDaEtapa(e, setores)}` vira `{rotuloDaEtapa({ ...e, prazoHoras: null }, setores)}` | `web/src/administracao/LinhasDosCadastros.tsx:41` | yes - (a) vitest "lista com abrangência e cadeia" falha em `fluxos.test.tsx:60` (`toEqual`: `Expected`/`Received` diferem na linha de Boletos) (C40). (b) imagem `one-verif-fluxos:e4cd3e9-f2` em :8089, instituição `e2f`, com a cópia temporária do spec (só os `` `n `` trocados): o teste 1 falha em `toContainText('(48 h)')`, `Received string: "...ADS 1794172150340, 3º semestreLiderança do semestreCoordenação do cursoPublicado v1..."` (C105, asserção nova). Com o arquivo do HEAD, o C105 "falha" com qualquer código, por causa do `SyntaxError` |
| F3: o cabeçalho do cadastro ganha 56 px entre o seletor e o botão: `pt-14` no `div` do título e do Novo | `web/src/administracao/Cadastros.tsx:75` | yes - `celular.spec.ts:91` falha em `celular.spec.ts:99:51`: `Expected: <= 120  Received: 128`. A asserção nova da distância mata sozinha, e o teto de 844 px continua passando (C106) |

3 injetadas, 3 mortas, 0 sobreviventes. Cada uma é morta por uma asserção nova diferente da correção. `mutator` está suspenso por decisão do usuário (AD-025) e não rodou.

## Gate

`dotnet build One.slnx` - 0 erros, 6 avisos; `dotnet test One.Api.Tests` (worktree limpo `D:\verif-wt5b` em `e4cd3e9`) - 705 passed, 0 failed; `npx vitest run` - 569 passed, 0 failed; `npm run build` + `node web/scripts/entrada-sem-canvas.mjs` - exit 0; `dryer` - 0 candidatos, exit 0; `crapper` - NÃO EXECUTOU (bloqueio do SO), FAIL-por-ambiente aceito pelo AD-044, não conta como PASS; e2e simulado do C106 em :5199 - 217 passed, 0 failed; e2e real do C106 em :8089 - 19 passed, 0 failed; e2e real do C105 em :8089 - exit 1, `SyntaxError` em `fluxos-real.spec.ts:183`, 0 testes rodaram; diagnóstico na cópia temporária com quebras de linha reais: 3 passed; `mutator` - suspenso (AD-025), não rodado.

## Ranked gaps

Disposição dos achados da rodada 3 (verified at e4cd3e9):

| Achado da rodada 3 | Situação agora |
| --- | --- |
| A1 C105: `fluxos-real.spec.ts:183` esperava o texto antigo | o conteúdo foi corrigido (linha filtrada e `toContainText` de `Liderança do semestre`, `Coordenação do curso`, `(48 h)`), mas o arquivo não compila: achado novo A1 |
| B1 C40: claim velho | corrigido; PASS |
| B2 `## Screens` "Chamado aberto" | corrigido |
| B3 C108 sem a prova do limite; C72 com uma metade só | corrigidos (2ª linha `Proof:` em cada um) |
| B4 `celular.spec.ts` "logo abaixo" sem teto | corrigido (`:99` ≤ 120 px, distância real 72 px; morta por F3) |
| B5 C112 grade sem a variante | corrigido (`canvas.test.tsx:236`; morta por F1). O typo "iewport" no C113 continua |
| C1 C104 `crapper` bloqueado | aberto, FAIL-por-ambiente, AD-044 |

(A) Defeitos do código ou dos specs
1. `web/e2e/fluxos-real.spec.ts:183` - a linha contém `` `n `` literal três vezes (escapes de PowerShell gravados no arquivo) no lugar de quebras de linha. O Playwright recusa o arquivo (`SyntaxError ... Missing semicolon. (183:207)`, `No tests found`, exit 1). C105 FAIL. Como o Playwright carrega todos os specs, o mesmo erro pode derrubar também o `npm --prefix web run e2e` sem filtro de arquivo (não rodei esse comando). Correção: trocar cada `` `n `` por uma quebra de linha real, deixando quatro linhas `const linhaDoFluxo = ...` e três `await expect(linhaDoFluxo).toContainText(...)`. Com isso, o diagnóstico desta rodada passa 3/3 e mata a F2.

(B) Defeitos e lacunas dos checks
1. C113 - "iewport" no texto do check (`checks.md`, C113). Só typo.
2. `checks.md` `## Screens`, linha "Cadastros, aba `Fluxos`": diz "`Detalhe` (abrangência e cadeia)" e não fala do selo de estado, que o C40 afirma. Não é contradição; vale alinhar o texto.

(C) Bloqueios do ambiente
1. C104 - `crapper.exe` (`C:\Users\Alfredo Neto\.local\bin\crapper.exe`) bloqueado pelo Controle de Aplicativo do Windows: nenhuma saída de CRAP; o `dryer` passa. FAIL-por-ambiente aceito no AD-044 (`.specs/STATE.md:50`). Rodar o `crapper` noutro computador.
2. `mutator` suspenso (AD-025).

(D) Processo e risco fora dos checks
1. `One.Api.Tests/PushAgendadorTests.cs:308` `Subscricao_movida_de_instituicao_nao_recebe_item_antigo` trava quando roda depois de `Falha_e_demora_do_push_seguem_os_outros_itens` (`:255-284`, que deixa `f.Push.Comportamento` com `Task.Delay(Timeout.Infinite, ct)` na fixture compartilhada). A ordem dos testes do xUnit muda com o caminho do worktree. Reproduzido 5 vezes em `D:\verif-wt5` (a suíte inteira e só a classe; o `--blame-hang-timeout` derruba o processo depois de 16 aprovados) e também em `e1320eb` no mesmo caminho. Em `D:\verif-wt5b` (outra ordem) a classe passa 19/19 em `92d7749` e em `e4cd3e9`. Não é regressão desta feature e não muda o C103, cuja prova saiu 0 em worktree limpo. Mas a suíte pode travar em outro checkout. Os testes envolvidos, em isolamento: 26/26 passam.
2. Durante a rodada a `main` ganhou três commits de outra pessoa (`4af4c53`, `630bec7`, `f06a357`), fora do intervalo verificado. O próximo Verify precisa usar `..<sha do fix>` explícito.

Limpeza: contêineres `one-verif-fluxos4` e `one-verif-fluxos4f`, imagens `one-verif-fluxos:e4cd3e9` e `:e4cd3e9-f2`, banco `one_verif_fluxos4` (com as instituições `e2e`, `e2f` e `e2g`), bucket `one-verif-fluxos4`, os 12 bancos `one_teste_*` que meus runs abortados deixaram (os que foram modificados depois do início da sessão; os anteriores não são meus e ficaram), o processo do `vite preview` da :5199, os hosts `One.Api.Tests.exe` travados e os worktrees `D:\verif-wt5` e `D:\verif-wt5b` foram removidos. A junção `node_modules` foi removida com `rmdir` antes, sem tocar o alvo: `D:\one-system\web\node_modules` está intacto. Ficou `D:\verif-out4` (TRX, JSON do Vitest, logs, scripts `.ps1`), fora do repositório. As mensagens dos e2e reais no Mailpit local também ficaram.

## Round 5 - addendum at a4821c7 (confirmation of C105 only)

Re-executado só o C105, em worktree limpo de `a4821c7` (`D:\verif-wt6`, removido no fim): imagem Docker `one-verif-fluxos:a4821c7` em :8089, banco `one_verif_fluxos5`, bucket `one-verif-fluxos5`, instituição `e2e` criada por `instituicao criar`, LLM falso (`Llm__BaseUrl` no servidor do próprio spec, :8090). Comando: `E2E_URL=http://localhost:8089 npx playwright test e2e/fluxos-real.spec.ts`. Resultado: **3 passed, exit 0**. Asserções do `fluxos-real.spec.ts:183-186` presentes e executadas. Nada mais deste relatório foi re-executado; as outras linhas seguem como na rodada 4 (`e4cd3e9`). Como bônus de outra verificação, `anexos.spec.ts plataforma.spec.ts` em :8089 (`E2E_INSTITUICAO=e2g`) deram 19 passed e o comando simulado do C106 em :5199 deu 220 passed, exit 0 (mesmo `a4821c7`); isso não altera a linha do C106 da rodada 4.

Veredito: **FAIL**, e a única linha não-PASS é o **C104** (`crapper.exe` bloqueado pelo Controle de Aplicativo do Windows; aceito pelo AD-044, `.specs/STATE.md:50`). O FAIL se mantém por exigência do validador, sem suavizar a linha.

Limpeza: contêiner, imagem, banco e bucket desta rodada removidos; worktree e junção `node_modules` removidos (alvo intacto).

## Rounds 1-3 summary

Rodada 1 (`a57fac8`, completa, FAIL): 104 de 106; FAIL em C104 (ambiente) e C106 (o comando incluía 2 specs reais); 5 faltas, 5 mortas; achados de arranjo (`Simular`/`Publicar`), acessibilidade do canvas em inglês e lacunas dos checks.

Rodada 2 (`cdc634d`, escopada, FAIL): 102 de 106; FAIL em C98 (provas casavam 0 testes), C104, C105 (checkbox removido pelo AD-042) e C106 (4 specs quebrados por `7d4f5d4`); 5 faltas, 5 mortas; elementos do AD-042 sem check.

Rodada 3 (`92d7749`, escopada, FAIL): 110 de 113; FAIL em C40 (claim velho depois de `675d6df`), C104 (ambiente, AD-044) e C105 (`fluxos-real.spec.ts:183` com o texto antigo da lista); `## Screens` com "Chamado aberto"; precisão fraca em `celular.spec.ts`, C108, C72 e C112; 5 faltas, 5 mortas.
