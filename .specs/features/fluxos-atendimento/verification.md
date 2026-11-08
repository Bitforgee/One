# Fluxos de atendimento configuráveis verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: e1320eb..cdc634d
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Resumo da rodada 2: 102 de 106 checks com prova e evidência localizada; FAIL em C98 (a prova escrita casa 0 testes), C104 (ambiente), C105 (o spec real ainda marca o checkbox que o AD-042 removeu) e C106 (4 specs simulados quebram). 5 faltas injetadas, 5 mortas. Todas as provas foram rodadas de novo, por alvo, em worktree limpo em `cdc634d` (o HEAD quando a rodada começou). Durante a rodada outro agente fez o commit `675d6df` (`feat(cadastros): redesign the registers tab and the flow editor n8n-style`, outra feature, mexe em `Canvas`/`NosDoCanvas`/`grafo.ts`/`canvas.test.tsx`/`fluxos.test.tsx`); ele NÃO foi verificado aqui. Separação dos achados: (A) defeitos do código ou dos specs, (B) defeitos/lacunas dos checks, (C) bloqueios do ambiente, (D) processo.

Cada seção diz de onde vem: `verified at cdc634d` (re-executada ou relida nesta rodada) ou `carried from a57fac8` (rodada 1, arquivos que o diff não tocou).

## Binding sources

Seção `verified at cdc634d`, salvo onde diz `carried from a57fac8`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `plan.md` (AC 57, 58, 59, 71, Landing 6) | yes - relido; `git diff a57fac8 HEAD -- plan.md` vazio | AD-042 (STATE.md linha 48) substitui AC 57 (botão), AC 58 e AC 59, mas `plan.md:203-205` ainda os escreve como vigentes (sem emenda no plano). AC 71 (`plan.md:233`, "sobe após N h") segue divergente do C84 e do código (` (48 h)`, `canvas.test.tsx:97`): sem emenda desde a rodada 1 | - |
| `checks.md` `## Screens` (linhas 397, 398, 402) | yes - comparado com o código renderizado em `cdc634d` | Canvas, linha 398: "paleta com três itens numa coluna à esquerda do canvas" - o código põe a paleta numa linha ACIMA do canvas (`Canvas.tsx:178`, `AdicionarEtapa.tsx:21` `flex flex-wrap`) e o painel da etapa à direita (`Canvas.tsx:209`); "altura mínima de 360 px" - o código usa `h-[clamp(22rem,58dvh,40rem)]` (`Canvas.tsx:180`, mínimo 352 px). Diálogo de transferência, linha 402: ainda lista `Prefiro a coordenação`, que o C70 emendado e `lideranca.test.tsx:60` proíbem | - |
| `.specs/STATE.md` AD-041, AD-042, AD-043 | yes | AD-041 e AD-043 conforme. AD-042 conforme no código: `TransferirConversa.cs` `Entrada(long? MatriculaId)` sem `aceitaLideranca`; `grep aceitaLideranca web/src` só nos testes que o negam. O AD-042 também decide o canvas "n8n": grade pontilhada, cartões com ícone, "+" no fim da cadeia, painel da etapa, zoom máximo 100% | Elementos do canvas que o AD-042 decide e nenhum check afirma: grade pontilhada (`Canvas.tsx:199`), "+" `Adicionar etapa` com a lista de destinos (`AdicionarEtapa.tsx:63-68`, `:73-87`), painel `Etapa selecionada` com os campos setor e prazo e o botão `Fechar etapa selecionada` (`PainelDoNo.tsx:32`, `:40`, `:47`), zoom máximo 100% (`Canvas.tsx:118`) |
| reactflow.dev acessibilidade (lida na rodada 1, não relida) - carried from a57fac8 | yes | O defeito da rodada 1 (textos em inglês) foi corrigido: `ariaLabelConfig={TextosDoCanvas}` em `Canvas.tsx:192`, textos em `Canvas.tsx:63-75`, rótulos de ligação sem ids em `Canvas.tsx:56` | O teste `canvas.test.tsx:111-127` ("textos acessíveis em português, sem ids internos") existe e passa, mas nenhum check o nomeia em `Proof:` |
| reactflow.dev testes - carried from a57fac8 | yes | nenhuma | - |
| `## Screens`: arranjo `Simular` e `Publicar` na mesma barra | yes - `EdicaoDoFluxo.tsx:127-134` põe os dois em `acoes` do `Editor`; teste `fluxos.spec.ts:143-158` mede mesmo `y` e mesma altura, todos os botões dentro de 1440x900 (passa em :5199) | nenhuma | O teste existe, mas nenhum check (C42, C83) o nomeia em `Proof:` |
| Npgsql `AreNullsDistinct` / catálogo do Postgres - carried from a57fac8 | yes | nenhuma; migration nova não houve na feature desde a rodada 1 | - |

## Checks

Provas re-executadas em `cdc634d`, em worktree limpo: `dotnet test One.Api.Tests --logger trx` (UMA execução: 704 aprovados, 0 falhas; as 84 expressões `FullyQualifiedName~Classe.Método` das linhas `Proof:` foram conferidas uma a uma no TRX, `D:\verif-out2\verif.trx`: 82 casam 1 ou mais testes aprovados, 2 casam 0, ver C98); `npx vitest run --reporter=json` (UMA execução: 560 aprovados, 0 falhas, cada `-t` das linhas `Proof:` casou 1 ou mais testes aprovados); `npm --prefix web run build` + `node web/scripts/entrada-sem-canvas.mjs`; Playwright simulado em :5199 (`vite preview` do worktree) e real em :8089 (imagem própria). Linhas marcadas "carried" repetem a asserção da rodada 1; o teste foi re-executado e passou, e o arquivo que o contém não mudou no diff.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1, C2 | migração vira fluxo; chamados antigos nulos | `FluxoMigracaoTests` 2/2 no TRX | carried: `FluxoMigracaoTests.cs:83`, `:91-92` | PASS |
| C3-C8 | precedência, versão/etapa/entrada, rascunho ignorado, Triagem, coordenação, etapa que não resolve | `FluxoRoteamentoTests` 6/6 | carried: `FluxoRoteamentoTests.cs:60-62`, `:78`, `:92-93`, `:112`, `:139-140`, `:157-161` | PASS |
| C9 | atendimento direto na Triagem | `TransferenciaTests.Atendimento_direto_sem_fluxo_na_triagem` 1/1 | carried: `TransferenciaTests.cs:70`, `:72` | PASS |
| C10, C11 | carga `regras` vira fluxo; categoria repetida recusada | `CargaValidacaoTests` 2/2 + `InstituicaoComandoTests.Carga_continua...` | carried: `CargaValidacaoTests.cs:74-76`, `:85`; `InstituicaoComandoTests.cs:183-186` | PASS |
| C12 | sem rotas de `regras` | `RetratoTests.Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano` 1/1 | verified at cdc634d: `RetratoTests.cs:39` `Assert.Equal(84, viva.Count)`; `:51` `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva)` | PASS |
| C13, C14 | constraints e colunas | `FluxoModeloTests` 2/2 | carried: `FluxoModeloTests.cs:50`, `:55-57`, `:65-83`, `:102-116`; `:119` `Assert.Equal("ux_setor_lideranca", ...)` | PASS |
| C15, C16 | `Escolher` (8) e `Etapa` (8) | `FluxoDominioTests` 8/8 e 8/8 | verified at cdc634d: o arquivo mudou (`aceitaLideranca` virou `comLideranca`); asserções `FluxoDominioTests.cs:56` e `:86` seguem os valores do check | PASS |
| C17-C33 | API de fluxos: criar, bordas, 409, rascunho, publicar, descartar | `FluxoAdminTests` 17 métodos, todos 1/1 | carried: `FluxoAdminTests.cs:60-64`, `:78-82`, `:94-95`, `:106-107`, `:120`, `:133`, `:148-153`, `:165-168`, `:179-181`, `:196-199`, `:210-211`, `:223-227`, `:238-241`, `:252-258`, `:274-282`, `:292`, `:307`, `:329-331`, `:341-354` | PASS |
| C34-C36 | simulação sem gravar, motivos, igual à transferência | `FluxoSimulacaoTests` 3/3 | verified at cdc634d: o arquivo mudou (sem `aceitaLideranca`, AD-042): `FluxoSimulacaoTests.cs:50`, `:55`, `:86` (3 situações com motivo), `:115` | PASS |
| C37 | decisão só no `ResolverFluxo` | `ArquiteturaTests.Setor_so_pelo_ResolverFluxo` 1/1 | carried: `ArquiteturaTests.cs:692+` lista fechada de arquivos | PASS |
| C38, C39 | simular 400/404; GET lista | `FluxoAdminTests` 2/2 | carried: `FluxoAdminTests.cs:367-380`, `:399-409` | PASS |
| C40, C41 | lista com abrangência e cadeia; criar pede abrangência | vitest `fluxos.test.tsx` `-t` 2/2 | carried: `fluxos.test.tsx:60-63`, `:73-81` | PASS |
| C42 | `Simular` pede curso e semestre (sem aceite); `Publicar` desligado até a API aceitar | vitest `-t "simular e publicar"` 1/1 | verified at cdc634d: `fluxos.test.tsx:114` `toBeDisabled()`; `:118` `Liderança do semestre: Pulada: Sem liderança disponível`; `:123`, `:127` `Publicar` desligado; `:130` `toBeEnabled()`; `:135` `['POST', '/api/admin/fluxos/6/simular', { versao: 'VIGENTE', cursoId: 4, semestre: 3 }]` (sem `aceitaLideranca`) | PASS |
| C43 | estado vazio | `-t "estado vazio"` 1/1 | carried: `fluxos.test.tsx:161-162` | PASS |
| C44-C55 | subir, eventos, 409, estados, prazo do Agendador, corridas | `FluxoSubirTests` 8/8 e `FluxoPrazoTests` 5/5 | carried: `FluxoSubirTests.cs:28-30`, `:44-49`, `:63-78`, `:105-113`, `:128-132`, `:143-145`, `:157-168`; `FluxoPrazoTests.cs:40-43`, `:60-62`, `:79-88`, `:113-115`, `:131-132` | PASS |
| C56 | frases da subida | vitest `chamado.test.tsx -t "frase da subida"` 1/1 | verified at cdc634d: `chamado.test.tsx:278` `'Ana subiu o chamado de Líderes para Coordenação'`; `:280` `'O chamado subiu de Líderes para Coordenação. Sem resposta em 48 horas'` | PASS |
| C57 | encaminhar manual sai do fluxo | `FluxoSubirTests.Encaminhar_manual_sai_do_fluxo` 1/1 | verified at cdc634d: `FluxoSubirTests.cs:182` `Assert.Equal((null, null, c.Secretaria.Id, 1), (chamado.EtapaOrdem, chamado.EtapaDesde, chamado.SetorId, chamado.Encaminhamentos))`. Efeito do `Reclassificar` novo (`Chamado.cs:163-164` zera `EtapaOrdem`/`EtapaDesde`): provado fora deste check por `ReclassificarSaiDoFluxoTests` (5/5, base-fluxos) | PASS |
| C58 | botão `Subir` pede o motivo | vitest `acoes.test.tsx -t "subir pede o motivo"` 1/1 | verified at cdc634d: `acoes.test.tsx:161` `toBeDisabled()`; `:167` `[['/api/chamados/ONE-1/subir', { motivo: '  A coordenação resolve.' }]]` | PASS |
| C59 | subida não derruba `RoteamentoCorreto` | `IndicadoresCalculoTests.Subida_nao_derruba_o_roteamento_correto` 1/1 | carried: `IndicadoresCalculoTests.cs:51-53` | PASS |
| C60 | `subir` só ATENDENTE e LIDER; 10 tipos, 11 nomes | `PermissoesChamadoTests.Subir_so_para_atendente_e_lider` + `ArquiteturaTests.Dez_acoes_do_chamado` 1/1 e 1/1 | verified at cdc634d: `PermissoesChamadoTests.cs:66` `vale == ...Contains("subir")`; `:69-71` `Assert.Equal(Abertos, ...("subir","ATENDENTE"))`, `("subir","LIDER")`, `Assert.Null(...("subir","ALUNO"))`; `ArquiteturaTests.cs:660` `Assert.Equal(10, acoes.Count)`; `:670` os 11 nomes | PASS |
| C61-C66 | liderança no setor: curso+semestre, bordas, 409, PUT, ninguém aponta | `LiderancaSetorTests` 6/6 | carried: `LiderancaSetorTests.cs:41-44`, `:57-58`, `:69-73`, `:85-94`, `:109-111`, `:125-136` | PASS |
| C67-C69 | disponibilidade, `GET /destino`, 400/404/409 | `LiderancaDestinoTests` 3/3 | verified at cdc634d: `LiderancaDestinoTests.cs:73` `BadRequest`; `:74-75` `NotFound`; `:84` `Conflict`; C69 também afirma agora o `POST /transferir` 400/404/409: `:79`, `:81`, `:85` | PASS |
| C70 | aviso literal e só `Cancelar`/`Enviar à liderança` | vitest `lideranca.test.tsx -t "aviso da liderança"` 2/2 | verified at cdc634d: `lideranca.test.tsx:37` `findByText(Aviso)`; `:38` `toEqual(['Cancelar', 'Enviar à liderança'])`; `:60` `queryByRole('button', { name: 'Prefiro a coordenação' })` ausente | PASS |
| C71 | prévia que falha segura o envio | vitest `-t "prévia que falha segura o envio"` 1/1 | verified at cdc634d: `lideranca.test.tsx:89` texto `Não foi possível confirmar para onde sua dúvida vai...`; `:90` `Confirmar` `toBeDisabled()`; `:92` `chamadas.some(c => c.url.endsWith('/transferir'))` é `false`; corpo `{}` em `:44`, `:64` | PASS |
| C72 | `/transferir` não aceita `aceitaLideranca`; o fluxo decide | `LiderancaDestinoTests.Fluxo_decide_e_o_aluno_nao_escolhe` 1/1 | verified at cdc634d: `LiderancaDestinoTests.cs:98` `foreach (var chamado in new[] { recusou, omitiu }) Assert.Equal((t.Lideranca!.Id, 1), (chamado.SetorId, chamado.EtapaOrdem))` com corpo `{ aceitaLideranca = false }` e `{ }`. A segunda metade do check (coordenação quando não há liderança) é afirmada por `Sem_lideranca_disponivel_vai_a_coordenacao` (passou no TRX), que a linha `Proof:` não nomeia | PASS |
| C73-C78 | visão do líder, 403, anexo, perde ao subir, solicitante, isolamento | `LiderVisaoTests` 5/5 + `IsolamentoTests` 1/1 | verified at cdc634d: `LiderVisaoTests.cs:27-32` `transcricao` 0, `matricula.numero`/`categorias`/`setores`/`origemCategoria` `Null`; `:65` lista de setores da equipe sem liderança; carried: `:61`, `:80-84`, `:98-102`, `:119-123`; `IsolamentoTests.cs:181-183` | PASS |
| C79 | tela do líder sem conversa nem matrícula | vitest `-t "detalhe do líder"` 1/1 | verified at cdc634d: `chamado.test.tsx:309` `queryByText('Conversa com o assistente')` ausente; `:310` `queryByText(/matrícula/)` ausente | PASS |
| C80, C81 | `fluxo` no detalhe e `null` fora | `FluxoRastroTests` 2/2 | carried: `FluxoRastroTests.cs:36`, `:44`, `:61-63` | PASS |
| C82 | coluna lateral | vitest `-t "etapa do fluxo na coluna lateral"` 1/1 | verified at cdc634d: `chamado.test.tsx:292` `findByText('Etapa 1 de 2 · ADS, 3º semestre')`; `:297` ausente com `fluxo` nulo | PASS |
| C83 | alternar mantém a edição | vitest `canvas.test.tsx -t "alternar mantém a edição"` 1/1 | verified at cdc634d: `canvas.test.tsx:79` `findByLabelText('Etapa 3: Setor -')`; `:86-87` `Destino da etapa 3` `SETOR`, `4` `LIDERANCA_SEMESTRE` | PASS |
| C84 | nós em ordem, ícone, rótulo, ` (48 h)` | `-t "nós em ordem com rótulo e prazo"` 1/1 | verified at cdc634d: `canvas.test.tsx:97-98` `'Coordenação do curso (48 h)'`; `:101-102` `svg.lucide-users`, `svg.lucide-graduation-cap`; `:105` x crescente; `:107` 2 arestas | PASS |
| C85 | arrastar da paleta | `E2E_URL=:5199 playwright e2e/fluxos.spec.ts` 6/6 | verified at cdc634d: `fluxos.spec.ts:67-68` `Math.abs(caixa.x - (fluxo.x + 320)) < 12`, `y + 160`; `:69` `arestas` `toHaveCount(0)` | PASS |
| C86 | regra de ligação | vitest `-t "regra de ligação"` 1/1 | verified at cdc634d: `canvas.test.tsx:136-142` 7 `expect(podeLigar(...))` | PASS |
| C87 | ligar em cadeia | `fluxos.spec.ts` | verified at cdc634d: `fluxos.spec.ts:85`, `:89` `toHaveCount(1)`; `:92`, `:98` `toHaveCount(2)`; `:94` `Salvar rascunho` `toBeEnabled()` | PASS |
| C88 | cadeia inválida | vitest `-t "cadeia inválida"` 2/2 | verified at cdc634d: `canvas.test.tsx:154` `toHaveTextContent(FraseDaCadeia)`; `:155-156` botões desligados; `:157`, `:172` `Fora da cadeia` | PASS |
| C89 | salvar envia ordem e posição | `-t "salvar envia ordem e posição"` 1/1 | verified at cdc634d: `canvas.test.tsx:185` PUT com `etapa('LIDERANCA_SEMESTRE', null, null, 240, 80), etapa('COORDENACAO_CURSO', null, 48, 480, 80)`; `:191-192` `translate(100px,50px)`, `translate(400px,50px)` | PASS |
| C90 | remover pede confirmação | `-t "remover nó pede confirmação"` 1/1 | verified at cdc634d: `canvas.test.tsx:203-205` cancelar mantém; `:210-214` vizinho `Fora da cadeia`, 0 arestas; `:221` `Arraste um destino para começar.` | PASS |
| C91 | Tab e setas | `fluxos.spec.ts` | verified at cdc634d: `fluxos.spec.ts:114` `['Etapa 1: Liderança do semestre','Etapa 2: Coordenação do curso','Início']`; `:124` `toBeGreaterThan(antes.x + 1)`; `:127` `depois.y > antes.y` | PASS |
| C92 | a lista tem as operações do canvas | vitest `fluxos.test.tsx -t "lista tem todas as operações do canvas"` 1/1 | carried: `fluxos.test.tsx:169-183` (arquivo tocado só em `:122-137`); teste re-executado e passou | PASS |
| C93 | abaixo de 768 px só a lista | `fluxos.spec.ts` (2 testes) | verified at cdc634d: `fluxos.spec.ts:136` `O canvas está disponível em telas maiores.`; `:137` `Canvas` `toHaveCount(0)`; `:139` `.react-flow` `toHaveCount(0)`; `:164-166` a 768 px as duas visões | PASS |
| C94 | biblioteca só sob demanda | `estrutura.test.ts -t "canvas carregado só sob demanda"` + build + `entrada-sem-canvas.mjs` | verified at cdc634d: `estrutura.test.ts:70` `expect(pasta(a), a).toBe('administracao')`; saída `entrada-sem-canvas: ok. Entrada: index-Di02j3hs.js; canvas só em: Canvas-K9PHyG7P.js`, exit 0 | PASS |
| C95 | simulação marca os nós | `-t "simulação marca os nós"` 1/1 | verified at cdc634d: `canvas.test.tsx:244` `Pulada: Sem liderança disponível`; `:245` `Vai por aqui` | PASS |
| C96 | canvas vazio e falha de carga | `-t "canvas vazio e falha de carga"` 2/2 | verified at cdc634d: `canvas.test.tsx:252-253` frase e 1 nó; `:266` `Não foi possível abrir o canvas. Use a lista.`; `:267` lista segue | PASS |
| C97 | versão exata `12.12.1` | `node -e ...` exit 0 | verified at cdc634d: `web/package.json:26` | PASS |
| C98 | visão/aceite vêm do tipo | `FluxoDominioTests.Visao_e_aceite_vem_do_tipo` e `ArquiteturaTests.Visao_e_aceite_fora_do_banco_e_da_entrada` | As duas expressões da linha `Proof:` casam 0 testes: `dotnet test --no-build --filter "FullyQualifiedName~FluxoDominioTests.Visao_e_aceite_vem_do_tipo"` imprime `Nenhum teste corresponde ao filtro` e sai 0. O commit `7d4f5d4` renomeou os dois para `Visao_e_ciencia_vem_do_tipo` (`FluxoDominioTests.cs:142`, 3/3 aprovados) e `Visao_e_ciencia_fora_do_banco_e_da_entrada` (`ArquiteturaTests.cs:678`, 1/1); o `checks.md` não foi emendado. Os testes renomeados passam e afirmam `FluxoDominioTests.cs:145-146` `Assert.Equal(veTudo, DestinosEtapa.VeTudo(destino))`, `Assert.Equal(pedeCiencia, DestinosEtapa.PedeCiencia(destino))` | FAIL (B: a prova escrita não executa nenhum teste; o comportamento está provado pelos testes renomeados) |
| C99 | modelo sem mudança pendente, filtro, domínio puro | 3 filtros `ArquiteturaTests` 3/3 | carried: `ArquiteturaTests.cs:638` `Assert.False(...HasPendingModelChanges())`; `:45`, `:588` | PASS |
| C100 | retrato de rotas (8 novas) e 403 em toda rota admin | `RetratoTests` 2/2 | verified at cdc634d: `RetratoTests.cs:39` `Assert.Equal(84, ...)`; `:64` `Assert.Equal(36, rotas.Count)`; texto do check emendado (8 rotas) confere com 79-3+8 | PASS |
| C101 | retrato de sucessos | `RetratoTests.Corpos_de_sucesso_iguais_aos_da_base` 1/1 + comando `pwsh` (UTF-8) | verified at cdc634d: `RetratoTests.cs:305` `Assert.Equal(56, gravados.Length)`; comando: `0 diffs` | PASS |
| C102 | glossário e frases de evento | `ArquiteturaTests.Glossario_lista_os_termos` 1/1 + vitest `textos.test.tsx -t "todo tipo de evento tem frase"` 1/1 | carried: `ArquiteturaTests.cs:236+`; `textos.test.tsx:194`, `:198` | PASS |
| C103 | suítes verdes | `dotnet build One.slnx` 0 erros, 0 avisos; `dotnet test` 704/0; `vitest run` 560/0; `npm --prefix web run build` exit 0 | verified at cdc634d: TRX e JSON do Vitest em `D:\verif-out2` | PASS |
| C104 | `crapper` < 10 e `dryer` sem candidato | `npm --prefix web run coverage` exit 0; `crapper --use-existing-coverage -s src --threshold 9.99`; `dryer ... --threshold 0.8` | `crapper`: `Program 'crapper.exe' failed to run ... Uma política de Controle de Aplicativo bloqueou este arquivo.` (não executou, sem saída de CRAP). `dryer`: `No duplicate candidates found.` exit 0 | FAIL (C: política de Controle de Aplicativo do Windows bloqueia `crapper.exe`; não é defeito do código) |
| C105 | fluxo real de ponta a ponta | `E2E_URL=http://localhost:8089 E2E_CONTAINER=one-verif-fluxos playwright test e2e/fluxos-real.spec.ts` na imagem `one-verif-fluxos:cdc634d` (banco `one_verif_fluxos`, instituição `e2e`) | O teste 1 estoura os 360 s esperando `getByLabel('O aluno aceita a liderança do semestre')` (`fluxos-real.spec.ts:177` `await editor.getByLabel('O aluno aceita a liderança do semestre').check()`); esse checkbox não existe mais no `Simulador.tsx` desde o AD-042. Os testes 2 e 3 ficam `did not run` (modo serial). Diagnóstico à parte, numa instituição nova `e2f` e uma cópia temporária do spec sem a linha 177 (apagada): 3/3 passam, então o produto está certo e o spec do HEAD está velho | FAIL (A: spec defasado em relação ao AD-042) |
| C106 | e2e simulada continua verde | (a) `E2E_URL=http://localhost:5199 playwright test` nos 9 specs da emenda: 212 passam, 4 falham. (b) `E2E_URL=http://localhost:8089 ... anexos.spec.ts plataforma.spec.ts` com `E2E_INSTITUICAO=e2e E2E_ADMIN_EMAIL=admin@e2e.one`: 19 passam, 0 falham (17 em `plataforma.spec.ts`, 2 em `anexos.spec.ts`) | (b) PASS. (a) falha: `arranjo.spec.ts:496` `strict mode violation: getByLabel('Senha') resolved to 2 elements` (o botão `Mostrar senha`, `Acesso.tsx:134`); `arranjo.spec.ts:1378` `Login a 360: CPF logo depois da frase: 361 contra 339`; `arranjo.spec.ts:1423` (formulário do Login); `ux.spec.ts:1187` `Setores a 1280: altura da linha ... Expected: >= 47.9, Received: 36.5` (`Cadastros.tsx:74` perdeu o `h-12`). Todos vêm do commit `7d4f5d4`, que trouxe junto mudanças alheias ao AD-042; na rodada 1 esses 4 passavam (231 passaram, só 3 falhas de ambiente). `fluxos.spec.ts` 6/6 passa | FAIL (A: regressão de 4 specs simulados) |

Checks com PASS: 102 de 106. FAIL: C98, C104, C105, C106.

## Coverage

Seção `verified at cdc634d` nas linhas marcadas; as outras são `carried from a57fac8`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST /api/conversas/{id}/transferir` statuses (4) - verified at cdc634d | `TransferirConversa.cs` + `Transferencia.cs` | 201 `LiderancaDestinoTests.cs:83` · 400 `:79` (campo `matriculaId`) · 404 `:81` · 409 `:85` | - |
| `GET /destino` statuses (4) - verified at cdc634d | `VerDestino.cs` | 200 C68 · 400 `:73` · 404 `:74-75` · 409 `:84` | - |
| detalhe do líder: `setores` e `origemCategoria` nulos; lista `setores` da equipe sem lideranças - verified at cdc634d | `DetalheChamado.cs` | `LiderVisaoTests.cs:31-32` · `:65` | - |
| botões do diálogo de transferência com `lideranca: true` (2) - verified at cdc634d | AD-042 | `Cancelar` e `Enviar à liderança` `lideranca.test.tsx:38`; `Prefiro a coordenação` ausente `:60`, `:91` | - |
| corpo de `POST /transferir` - verified at cdc634d | AD-042 | `{}` `lideranca.test.tsx:44`, `:64`, `:79`; `{ matriculaId: 1 }` `:128`; `aceitaLideranca` ignorado `LiderancaDestinoTests.cs:98` | - |
| tipos de destino x visão e ciência (3) - verified at cdc634d | `DestinosEtapa` | `Visao_e_ciencia_vem_do_tipo` 3/3 aprovados (`FluxoDominioTests.cs:142`) | as 2 provas que o C98 nomeia casam 0 testes: o `Proof:` do C98 não prova nenhum membro |
| ações que tiram o chamado do fluxo (2) - verified at cdc634d | `Chamado.cs:139-141`, `:163-164` | `encaminhar` C57 · `reclassificar` `ReclassificarSaiDoFluxoTests.cs:18`, `:59`, `:78` (base-fluxos, 5/5) | `reclassificar` não tem check em `fluxos-atendimento` (só em base-fluxos) |
| elementos do canvas do AD-042 (6) - verified at cdc634d | `Canvas.tsx`, `AdicionarEtapa.tsx`, `PainelDoNo.tsx` | grade pontilhada · "+" `Adicionar etapa` e a lista de destinos · campo de setor do painel · campo de prazo do painel · `Fechar etapa selecionada` · zoom máximo 100%: só `Remover etapa selecionada` (`canvas.test.tsx:202`, C90) e o clique de adicionar da Lista (`:76`) são exercidos | grade, "+" do canvas, campo setor e prazo do painel, fechar painel e zoom máximo não têm prova nenhuma |
| textos de acessibilidade do canvas (7) - verified at cdc634d | `Canvas.tsx:63-75` | `canvas.test.tsx:119-127` (6 proibidos, 3 rótulos) | sem check que o nomeie (o teste existe) |
| arranjo da barra `Simular`/`Publicar` - verified at cdc634d | `## Screens` | `fluxos.spec.ts:150-156` | sem check que o nomeie (o teste existe) |
| rotas novas (8) · statuses das rotas de fluxo · `POST /subir` · `GET /api/chamados/{numero}` · constraints · `instituicao_id` · estados de `subir` · papéis x `subir` · ações negadas ao líder · campos do detalhe do líder - carried from a57fac8 | handlers e `rotas.txt` (rotas ainda 84, `RetratoTests.cs:39`) | C17-C39, C44-C50, C60, C73-C74, C80 | - |
| asserções existentes que mudam (7) - carried from a57fac8 | diff dos testes | 1 C60 · 2 C98 · 3 C100 · 4 C101 · 5 C10 · 6 C40 · 7 C106 | item 2 e item 7 acompanham os FAIL de C98 e C106 |
| telas do `## Screens` (13 linhas) - verified at cdc634d | código renderizado | ver Binding sources | linhas 397, 398 e 402 do `## Screens` contradizem o código (paleta, altura, `Prefiro a coordenação`) |
| startup config (2) - verified at cdc634d | `Program.cs` e `OneFactory` | C103; nenhuma chave nova no diff | - |

## Test policy rows

Seção `verified at cdc634d`.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide, atravessa a rota HTTP | `CriarFluxo`, `SalvarRascunho`, `PublicarFluxo`, `SubirChamado`, `VerDestino`, `DetalheChamado`, `TransferirConversa` | uma na rota; cada status da Surface, cada recusa com o campo, cada borda | yes - a lacuna da rodada 1 (`POST /transferir` 400/404, `setores`/`origemCategoria` do líder) foi fechada: `LiderancaDestinoTests.cs:79`, `:81`; `LiderVisaoTests.cs:31-32` |
| Decide, sem atravessar rota | `ResolverFluxo`, `Chamado.Subir`, `Chamado.Reclassificar`, visão por tipo | uma na própria camada, uma linha por linha da tabela | yes - `FluxoDominioTests` (8 + 8 + 3, 3 de `Visao_e_ciencia`), `ChamadoDominioTests` |
| Decide, na tela | `grafo.ts` (`podeLigar`, `cadeiaValida`), alternador, `PedidoAoAtendente` (prévia) | um caso por linha | yes - C86 (7 expects), C88 (2 testes), C71 |
| Arrastar, soltar e teclado no canvas | `Canvas.tsx`, `AdicionarEtapa.tsx`, `PainelDoNo.tsx` | uma no navegador, gesto e resultado | yes - C85, C87, C91 passam em :5199; a linha cobre o gesto e o resultado que ela define, e os elementos novos do AD-042 sem prova estão listados em Coverage |
| Instrumentation | nós de apresentação (`NosDoCanvas.tsx`), mapeamento | nenhuma própria | yes |

## Faults injected

Worktree `D:\verif-wt2` (HEAD destacado em `cdc634d`), removido no fim, sem `git stash`; cada falta revertida com `git checkout -- <arquivo>` e o `git status --porcelain` do worktree conferido vazio depois de cada uma. Superfícies tocadas desde a rodada 1, cada uma com uma prova diferente (verified at cdc634d). As rodadas anteriores (5 faltas, 5 mortas em `a57fac8`) ficam como estavam.

| Mutation | Location | Killed |
| --- | --- | --- |
| aluno passa a pular a liderança: default `comLideranca = true` -> `false` | `One.Api/Chamados/Transferencia.cs:41` | yes - `LiderancaDestinoTests.Fluxo_decide_e_o_aluno_nao_escolhe` falha (C72) |
| `Reclassificar` deixa de zerar `EtapaOrdem` e `EtapaDesde` | `One.Api/Dados/Chamados/Chamado.cs:163-164` | yes - `ReclassificarSaiDoFluxoTests` 3 falhas de 5 (`Reclassificar_no_fluxo_sai_da_etapa_e_fica_no_setor`, `Reclassificado_nao_tem_subir_nem_fluxo`, `Agendador_nao_sobe_o_reclassificado`); prova de base-fluxos, sem check em `fluxos-atendimento` |
| `ariaLabelConfig={TextosDoCanvas}` removido | `web/src/administracao/Canvas.tsx:192` | yes - vitest "textos acessíveis em português, sem ids internos" falha: `expected 'Pular para o conteúdo...' not to contain 'Control Panel'` |
| botão `Confirmar` deixa de se desligar quando a prévia falha: `disabled={!pronto \|\| (!encerrar && pedido.falhou)}` -> `disabled={!pronto}` | `web/src/assistente/Assistente.tsx:400` | yes - vitest "prévia que falha segura o envio" falha (C71) |
| `Simular` sai da barra do `Editor` e vai para depois do simulador (`acoes={barra}` removido, `{barra}` ao fim do corpo) | `web/src/administracao/EdicaoDoFluxo.tsx:137`, `:147` | yes - `fluxos.spec.ts` "arranjo da barra de ações" falha: `Expected: <= 1  Received: 52` (`fluxos.spec.ts:150`) |

5 injetadas, 5 mortas, 0 sobreviventes. Três delas foram mortas por testes que nenhum `Proof:` do `checks.md` nomeia (`ReclassificarSaiDoFluxoTests`, o teste de acessibilidade, o arranjo da barra): ver B1 e B3. Não injetadas (cap de 5): o filtro de liderança de `CriarSetor.EmFluxoPublicado` e `EquipeDeSetor.SoLideranca` (base-fluxos).

## Gate

`dotnet build One.slnx` - 0 erros, 0 avisos; `dotnet test One.Api.Tests` - 704 passed, 0 failed; `npx vitest run` - 560 passed, 0 failed; `npm --prefix web run build` + `node web/scripts/entrada-sem-canvas.mjs` - exit 0; `dryer` - 0 candidatos, exit 0; `crapper` - NÃO EXECUTOU (bloqueio do SO), não conta como PASS; `fluxos.spec.ts` em :5199 - 6 passed, 0 failed; e2e simulado da emenda do C106 em :5199 - 212 passed, 4 failed; e2e real em :8089 - `fluxos-real.spec.ts` 0 passed, 1 failed, 2 did not run; `anexos.spec.ts` + `plataforma.spec.ts` 19 passed, 0 failed; `mutator` - suspenso por decisão do usuário (AD-025), não rodado.

## Ranked gaps

Disposição dos achados da rodada 1 (verified at cdc634d):

| Achado da rodada 1 | Situação agora |
| --- | --- |
| A1 `Simular`/`Publicar` na mesma barra | corrigido no código (`EdicaoDoFluxo.tsx:127-137`, `Editor.tsx` `acoes`); teste `fluxos.spec.ts:143-158` passa e a falta da barra (`EdicaoDoFluxo.tsx`) o mata; falta o check que o nomeie (B3) |
| A2 textos do canvas em inglês | corrigido (`Canvas.tsx:63-75`, `:192`); `canvas.test.tsx:111-127` passa e a falta do `ariaLabelConfig` o mata; falta o check (B3) |
| A3 comentário truncado | corrigido (`Chamado.cs:143`) |
| B1 comando do C106 | emendado, mas o C106 segue FAIL por 4 specs que quebraram (A2, A3) |
| B2 C105 prazo na coordenação | texto emendado; o spec ficou defasado em outro ponto (A1) |
| B3 AC 71 x C84 | aberto (B2) |
| B4 C100 "11 rotas" | corrigido (texto emendado) |
| B5 `POST /transferir` 400/404 | corrigido (`LiderancaDestinoTests.cs:79`, `:81`) |
| B6 arranjo sem check | parcial: testes existem, checks e `## Screens` não foram emendados (B2, B3) |
| B7 textos de acessibilidade sem check | teste existe, check não (B3) |
| B8 `setores`/`origemCategoria`, filtro de lideranças, cabeçalho | corrigido (`LiderVisaoTests.cs:31-32`, `:54-65`; cabeçalho diz 106) |

(A) Defeitos do código ou dos specs
1. `web/e2e/fluxos-real.spec.ts:177` - `getByLabel('O aluno aceita a liderança do semestre').check()` espera um checkbox que o AD-042 removeu do simulador; o C105 estoura em 360 s e os outros 2 testes do arquivo nem rodam. O comentário de `:174` e o título de `:188` ainda falam de "aceita". C105 - `fluxos-real.spec.ts:177`.
2. `web/src/acesso/Acesso.tsx:123-140` (commit `7d4f5d4`, alheio ao AD-042) - o botão `Mostrar senha` quebra 3 specs simulados: `web/e2e/arranjo.spec.ts:496` (dois elementos casam `getByLabel('Senha')`), `:1378` (CPF 361 contra 339 a 360 px), `:1423`. C106.
3. `web/src/administracao/Cadastros.tsx:74` (commit `7d4f5d4`) - `h-12 min-h-12` virou `min-h-12`; a linha da tabela mede 36,5 px e o alvo do AD-037 é 48 px: `web/e2e/ux.spec.ts:1187` falha. C106.

(B) Defeitos e lacunas dos checks
1. C98 - as duas linhas `Proof:` casam 0 testes (`dotnet test` sai 0 com "Nenhum teste corresponde ao filtro"); os testes foram renomeados (`FluxoDominioTests.cs:142`, `ArquiteturaTests.cs:678`) e o texto do check ainda diz "pede aceite". Emendar o `checks.md`.
2. `checks.md:397`, `:398`, `:402` (`## Screens`) e `plan.md:203-205`, `:233` contradizem o AD-042 e o código: paleta em coluna à esquerda (o código: linha acima, `AdicionarEtapa.tsx:21`), altura mínima 360 px (o código: 352 px, `Canvas.tsx:180`), `Prefiro a coordenação` (removido), AC 58/59, "sobe após N h" (AC 71 x C84).
3. Elementos que o AD-042 decide sem nenhum check: grade pontilhada `Canvas.tsx:199`, "+" `AdicionarEtapa.tsx:63`, painel da etapa `PainelDoNo.tsx:32`, `:40`, `:47`, zoom máximo 100% `Canvas.tsx:118`; e dois testes que existem sem check (`canvas.test.tsx:111` acessibilidade, `fluxos.spec.ts:143` barra de ações).
4. C72 - a linha `Proof:` nomeia só `Fluxo_decide_e_o_aluno_nao_escolhe`; a metade "na coordenação quando não há liderança" está em `Sem_lideranca_disponivel_vai_a_coordenacao`, que não consta.

(C) Bloqueios do ambiente
1. C104 - `crapper.exe` bloqueado pelo Controle de Aplicativo do Windows (`C:\Users\Alfredo Neto\.local\bin\crapper.exe`); sem saída de CRAP. Rodar noutro computador ou liberar a exceção. `dryer` passa.
2. `mutator` suspenso (AD-025).

(D) Processo
1. O commit `675d6df` (feature `cadastros-fluxo-visual`) entrou em `main` durante esta rodada e muda `Canvas`/`NosDoCanvas`/`grafo.ts`/`PainelDoNo.tsx`/`Simulador.tsx` e os testes do canvas; nada disso foi verificado. Uma nova rodada precisa começar no HEAD novo. Os 4 specs que quebraram e o `fluxos-real.spec.ts` continuam a corrigir.

Limpeza: contêiner `one-verif-fluxos`, imagem `one-verif-fluxos:cdc634d`, banco `one_verif_fluxos` (derrubado), bucket `one-verif-fluxos` (removido do MinIO), preview da :5199 e worktree `D:\verif-wt2` (a junção `node_modules` removida antes, sem tocar o alvo) removidos. Ficaram `D:\verif-out2` (TRX, JSON do Vitest, logs do Playwright) e `D:\verif-status-before.txt`/`after.txt`, fora do repositório. Há 24 bancos `one_teste_*` no Postgres do compose: são criados pelos testes da API e não deu para provar de quem são (outros `dotnet` rodavam na máquina); não foram apagados. O `git status --porcelain` da árvore real mudou entre o início e o fim por causa do commit `675d6df` do outro agente (as modificações de `web/src/administracao/*` e `web/e2e/*` e a pasta `.specs/features/cadastros-fluxo-visual/` entraram nele); eu não alterei, guardei, commitei nem resetei nada ali. Sem `git stash`. O único arquivo rastreado que escrevi é este relatório.

## Round 1 summary

Rodada 1 (`a57fac8`, completa, FAIL): 104 de 106 checks com prova (C104 FAIL por bloqueio do SO sobre `crapper.exe`; C106 FAIL porque o comando incluía 2 specs de e2e real), 685 testes de API e 557 de Vitest verdes, 5 faltas injetadas e 5 mortas. Achados: A1 `Simular` e `Publicar` fora da mesma barra, A2 textos de acessibilidade do canvas em inglês e com ids internos, A3 comentário truncado em `Chamado.cs`; B1-B8 lacunas dos checks (comando do C106, prazo do C105, AC 71 x C84, "11 rotas" do C100, 400/404 do `POST /transferir`, arranjo sem check, textos de acessibilidade sem check, `setores`/`origemCategoria` e cabeçalho). Corrigidos desde então: A1, A2, A3, B4, B5, B8 e as emendas de B1 e B2; veja a tabela de disposição acima.
