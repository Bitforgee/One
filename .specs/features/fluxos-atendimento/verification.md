# Fluxos de atendimento configuráveis verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: e1320eb..a57fac8
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Resumo: 104 de 106 checks com prova e evidência localizada; C104 e C106 FAIL; 5 faltas injetadas, 5 mortas; os achados abaixo (checks que contradizem a fonte, arranjo sem check, membros sem prova) mantêm o veredicto em FAIL. Separação: (A) defeitos do código, (B) defeitos/lacunas dos checks, (C) bloqueios do ambiente, no fim.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `plan.md` (Surface, Landing 1-10, Relations, AC 1-81) | yes - lido inteiro; `plan.md` sem diff em `e1320eb..HEAD`; texto das linhas de check sem diff (comparado sem a marca `[x]`) | AC 71 diz "sobe após N h" no nó; C84 e o cabeçalho "Rótulos fixos" decidem ` (48 h)` (o código escreve ` (48 h)`, `canvas.test.tsx:97`). C105 descreve prazo de 48 h na coordenação (última etapa), que o AC 22 e C27 recusam com 400; o spec executa o prazo na liderança (`fluxos-real.spec.ts`, nota (8) do Handoff). C100 diz "11 da Surface": as rotas novas são 8 (`rotas.txt` 79-3+8 = 84, `RetratoTests.cs:39`) | Cabeçalho do `checks.md` diz 96 checks; há 106 |
| reactflow.dev acessibilidade (lida em 08/11, versão da página de 2026) | yes - web_fetch | Consistente com C91 (Tab + Enter + setas; `nodesFocusable`/`edgesFocusable` em `Canvas.tsx`). A página manda localizar os textos com `ariaLabelConfig`; o código não o usa (`grep ariaLabelConfig web/src` vazio) e o navegador mostra `Control Panel`, `Zoom In`, `Zoom Out`, `Fit View`, `Edge from inicio to no-1` e `Press enter or space to select a node...` (medido no Chromium contra o build) numa interface pt-BR (AGENTS.md: "Textos da interface em português do Brasil") | Nenhum check cobre os textos de acessibilidade do canvas |
| reactflow.dev testes (lida) | yes - web_fetch | `web/src/test/setup.ts:127-153` segue o roteiro (ResizeObserver, DOMMatrixReadOnly, offsetWidth/Height, getBBox) com variações defensáveis (aviso síncrono, 100x40 fixo); gesto de arrastar/teclado no Playwright, como a página recomenda | - |
| `.specs/STATE.md` AD-041, AD-010, AD-012, AD-018, AD-025 | yes | AD-041 conforme (tipos fechados, SUBIDA fora de `Encaminhamentos`, `@xyflow/react` 12.12.1). AD-025: `mutator` não rodado | - |
| Npgsql `AreNullsDistinct` / catálogo do Postgres | yes - `psql` no banco migrado da imagem do HEAD | nenhuma: `ux_fluxo_abrangencia ... NULLS NOT DISTINCT`, 3 `ck_*` do fluxo/etapa, `ux_versao_rascunho`, `ux_setor_lideranca ... WHERE curso_id IS NOT NULL AND ativo`, `ck_setor_*` iguais ao Landing 1, 2, 5; `regra_roteamento` não existe | - |
| `## Screens` do `checks.md` (arranjo por tela) | yes - código lido e telas renderizadas em 1440 px (Chromium, build do HEAD, API simulada) | "`Simular` e `Publicar` na mesma barra": no editor, `Simular` fica na seção "Simular um aluno" (y=755) e `Publicar` + `Descartar rascunho` numa linha abaixo (y=807), com `Cancelar` / `Salvar rascunho` em terceira linha cortada pela borda do diálogo a 900 px de altura; não é uma barra | Canvas: "paleta com três itens numa coluna à esquerda" (medido: 3 itens em x=233, canvas em x=454), "altura mínima de 360 px" (medido: `min-height 360px`, altura 448) e "Início na extremidade esquerda" estão certos no código mas nenhum check os afirma (C84/C85/C96 afirmam ordem, queda do nó e frase). "alternador no topo", "Simular e Publicar na mesma barra" (C42, C83) e "botão `Subir` entre as ações da equipe" (C58) sem check de arranjo |

## Checks

Prova = comando do check rodado em `a57fac8`. Os 66 filtros `dotnet test` vieram de UMA execução (`dotnet test One.Api.Tests --no-build --logger trx`: 685 aprovados, 0 falhas) e cada nome aparece individualmente no TRX com 1 ou mais resultados aprovados (C15, C16 e C98 são Theory: 8, 8 e 3). Os `-t` do Vitest vieram de uma execução (`vitest run --reporter=json`: 557 aprovados) e cada `-t` casou 1 ou mais testes. Evidência = asserção que resolve o check.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | migration converte regra em fluxo de todos os cursos, v1 publicada, 1 etapa | `FluxoMigracaoTests.Regra_vira_fluxo...` 1/1 | `FluxoMigracaoTests.cs:83` `Assert.Equal(["1,1,1,SETOR,2,nulo","1,2,1,COORDENACAO_CURSO,nulo,nulo","2,3,1,SETOR,4,nulo"], etapas)`; `:74`, `:77` | PASS |
| C2 | chamados antigos nulos, tabela some | `FluxoMigracaoTests.Chamados_antigos...` 1/1 | `:91` `Assert.Equal(["true,true,true"], chamado)`; `:92` `to_regclass` vazio. Catálogo real: `to_regclass('regra_roteamento')` nulo | PASS |
| C3 | precedência semestre > curso > todos | `FluxoRoteamentoTests.Fluxo_mais_especifico_vence` | `FluxoRoteamentoTests.cs:60-62` `"Biblioteca"`, `"Secretaria"`, `"Financeiro"` | PASS |
| C4 | chamado grava versão, etapa 1, entrada | `...Chamado_guarda_versao_etapa_e_entrada` | `:78` `Assert.Equal((versao.Id, 1, f.Relogio.GetUtcNow().UtcDateTime), (chamado.VersaoFluxoId, chamado.EtapaOrdem, chamado.EtapaDesde))` | PASS |
| C5 | fluxo só com rascunho é ignorado | `...Fluxo_so_com_rascunho_e_ignorado` | `:92-93` `"Financeiro"`, `dosCursos.Id == VersaoFluxoId` | PASS |
| C6 | sem fluxo vai à Triagem com 3 nulos | `...Sem_fluxo_publicado_vai_para_a_triagem` | `:112` `Assert.Equal((null, null, null), (VersaoFluxoId, EtapaOrdem, EtapaDesde))` | PASS |
| C7 | COORDENACAO_CURSO usa o curso da matrícula | `...Coordenacao_do_curso_da_matricula` | `:139` `"Coordenação Direito"`, `:140` `EtapaOrdem == 1` | PASS |
| C8 | etapa que não resolve passa à seguinte; nenhuma, Triagem | `...Etapa_que_nao_resolve_passa_para_a_seguinte` | `:157-158` `"Secretaria"`, `2`; `:160-161` `"Triagem"`, `(null, null)` | PASS |
| C9 | atendimento direto na Triagem sem fluxo | `TransferenciaTests.Atendimento_direto_sem_fluxo_na_triagem` | `TransferenciaTests.cs:70` `"Triagem"`; `:72` `(null, null, null)` | PASS |
| C10 | carga `regras` vira fluxo, mesmas contagens | `CargaValidacaoTests.Regra_da_carga...` + `InstituicaoComandoTests.Carga_continua...` | `CargaValidacaoTests.cs:74-76`; `InstituicaoComandoTests.cs:185-186` `Assert.Equal(2, ...VersoesFluxo.CountAsync(v => v.PublicadaEm != null))`, `:183` `Assert.Contains(linha, saida)` | PASS |
| C11 | repetir categoria recusa com `já tem regra` | `CargaValidacaoTests.Categoria_com_fluxo_ja_tem_regra` | `CargaValidacaoTests.cs:85` `Assert.Equal(["regras[0].categoria: \"Boletos\" já tem regra"], erros)` | PASS |
| C12 | sem GET/POST/PUT em `/api/admin/regras` | `RetratoTests.Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano` | `RetratoTests.cs:51` `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva)` com `rotas.txt` sem `/regras`; `:39` `84` | PASS |
| C13 | constraints/índices da door 1 | `FluxoModeloTests.Constraints_e_indices_da_door_1` | `FluxoModeloTests.cs:50` `"ux_fluxo_abrangencia"`, `:55-57` `ck_fluxo_semestre*`, `:65` `ix_versao_fluxo_fluxo_id_numero`, `:67` `ux_versao_rascunho`, `:74-83` ordem/prazo/posição; catálogo real confere | PASS |
| C14 | colunas do chamado e do setor, índice parcial | `FluxoModeloTests.Colunas_do_chamado_e_do_setor` | `:102` colunas `YES`; `:112-116` `ck_setor_*`; `:136-137` `UNIQUE INDEX ux_setor_lideranca ... WHERE ((curso_id IS NOT NULL) AND ativo)` | PASS |
| C15 | `Escolher` nas 8 combinações | `FluxoDominioTests.Escolhe_o_fluxo_mais_especifico` 8/8 | `FluxoDominioTests.cs:56` `Assert.Same(esperado == "nenhum" ? null : porNome[esperado], escolhido)` | PASS |
| C16 | `Etapa` por tipo x situação | `FluxoDominioTests.Resolve_cada_tipo_de_destino` 8/8 | `:86` `Assert.Equal((setor, motivo), (resolucao.SetorId, resolucao.Motivo))` | PASS |
| C17 | POST cria nas 3 abrangências, 201 | `FluxoAdminTests.Cria_fluxo_nas_tres_abrangencias` | `FluxoAdminTests.cs:60` `Created`; `:62-64` `categoriaId/cursoId/semestre` | PASS |
| C18 | semestre sem curso/0/13 400; 1/12 201 | `...Semestre_so_com_curso_e_de_1_a_12` | `:78-80` `Recusa400(..., "semestre", ...)`; `:82` `Created` | PASS |
| C19 | curso inexistente/alheio 400 `cursoId` | `...Curso_de_outra_instituicao_400` | `:94-95` `Recusa400(..., "cursoId", ...)` (helper `:36-37`) | PASS |
| C20 | categoria padrão/inexistente 400 | `...Categoria_padrao_ou_inexistente_400` | `:106-107` `Recusa400(..., "categoriaId", ...)` | PASS |
| C21 | duplicata 409; simultâneas 201+409 | `...Abrangencia_repetida_409` + `...Criacao_simultanea_uma_so` | `:120` `Conflict`; `:133` `Assert.Equal([Created, Conflict], ...)` | PASS |
| C22 | PUT substitui o rascunho | `...Rascunho_e_substituido_inteiro` | `:148` `3`; `:153` `[(1,"COORDENACAO_CURSO",12),(2,"SETOR",null)]` | PASS |
| C23 | 0/6 etapas 400, 1/5 200 | `...Etapas_de_1_a_5` | `:165-166` `Recusa400(..., "etapas", ...)`; `:167-168` `OK` | PASS |
| C24 | destino fora da lista 400 | `...Destino_desconhecido_400` | `:179-181` `Recusa400(..., "destino", ...)` | PASS |
| C25 | setor da etapa inválido 400 | `...Setor_da_etapa_invalido_400` | `:196-199` `Recusa400(..., "setorId", ...)` | PASS |
| C26 | setor só em SETOR | `...Setor_so_na_etapa_de_setor` | `:210-211` `Recusa400(..., "setorId", ...)` | PASS |
| C27 | prazo 1-720, nunca na última | `...Prazo_de_1_a_720_e_nunca_na_ultima` | `:223` `"prazoHoras"` 0/721; `:225` `OK` 1/720; `:226-227` última | PASS |
| C28 | liderança só 1ª e nunca última | `...Lideranca_so_na_primeira_e_nunca_a_ultima` | `:238-240` `"destino"`; `:241` `OK` | PASS |
| C29 | x sem y 400; x,y devolvidos | `...Posicao_x_y_juntas_e_devolvidas` | `:252-253` `"etapas"`; `:258` `[(120.5,-40.0),(360.0,0.0)]` | PASS |
| C30 | publicar numera e remove rascunho | `...Publicar_numera_e_remove_o_rascunho` | `:274-282` `Created`, `numero 1/2`, `rascunho Null` | PASS |
| C31 | publicar sem rascunho 409; simultâneo | `...Publicar_sem_rascunho_409` + `...Publicacao_simultanea_uma_so` | `:292` `Conflict`; `:307` `[Created, Conflict]` | PASS |
| C32 | v1 intacta, chamado não muda | `...Versao_antiga_e_chamado_nao_mudam` | `:329`, `:331` `(v1.Id, 1)` | PASS |
| C33 | descartar 204; sem rascunho 404 | `...Descartar_rascunho` | `:348` `NoContent`; `:341`, `:354` `NotFound`; `:351-353` | PASS |
| C34 | simular devolve etapas e não grava | `FluxoSimulacaoTests.Simula_sem_gravar` | `FluxoSimulacaoTests.cs:50` `[(1,"SETOR","Financeiro","RESOLVIDA"),(2,"COORDENACAO_CURSO","Coordenação ADS","RESOLVIDA")]`; `:55` `Assert.Equal(antes, await Contagens(m))` | PASS |
| C35 | NAO_RESOLVIDA com motivo | `...Etapa_nao_resolvida_com_motivo` | `:86` `("NAO_RESOLVIDA","Sem liderança disponível",null), ("NAO_RESOLVIDA","Curso sem coordenação",null), ("RESOLVIDA",null,"Biblioteca")` | PASS |
| C36 | simulação = transferência real (6 alunos) | `...Simulacao_igual_a_transferencia_real` | `:115` `Assert.Equal(real, inicial)` dentro do `foreach` de 6 | PASS |
| C37 | decisão só no ResolverFluxo | `ArquiteturaTests.Setor_so_pelo_ResolverFluxo` | `ArquiteturaTests.cs:692+` `Assert.Equal(["Administracao/SalvarRascunho.cs","Dados/Fluxos/ResolverFluxo.cs"], ArquivosQue(...))` e `DoesNotMatch(@"SetorCoordenacaoId\|DestinosEtapa\.")` | PASS |
| C38 | simular 400; 404 desconhecido/alheio | `FluxoAdminTests.Simular_400_e_id_desconhecido_404` | `:367-369` `Recusa400`; `:374-380` `NotFound` x4 para `999999` e `alheio.Id` | PASS |
| C39 | GET lista só da instituição | `...Lista_so_da_instituicao` | `:399` `Assert.Single(...)`, `:400`, `:404`, `:408-409` | PASS |
| C40 | lista com abrangência e cadeia | `vitest fluxos.test.tsx -t "lista com abrangência e cadeia"` 1/1 | `fluxos.test.tsx:60-63` `['Notas','Todos os cursos · Setor Financeiro'], ['Boletos','ADS, 3º semestre · Liderança do semestre → Coordenação do curso (48 h)']` | PASS |
| C41 | criar pede categoria e 3 abrangências | `... -t "criar pede categoria e abrangência"` | `:73` `['Todos os cursos','Um curso','Um semestre de um curso']`; `:74-75`, `:78`, `:81` | PASS |
| C42 | simular e publicar | `... -t "simular e publicar"` | `:119` `Liderança do semestre: Pulada: Sem liderança disponível`; `:124` desligado; `:127-128`; `:131` `toBeEnabled()` | PASS (arranjo: ver Binding sources) |
| C43 | estado vazio | `... -t "estado vazio"` | `:161` `Sem fluxo, os chamados vão para a Triagem.`; `:162` botão `Novo` | PASS |
| C44 | subir move, grava etapa/entrada, tira responsável | `FluxoSubirTests.Sobe_para_a_etapa_seguinte` | `FluxoSubirTests.cs:30` `(c.Coordenacao.Id, 2, f.Relogio.GetUtcNow().UtcDateTime, null, Aberto)`; `:28` | PASS |
| C45 | SUBIDA sem encaminhamento, nota | `...Subida_nao_e_encaminhamento` | `:44` `Assert.Equal(0, chamado.Encaminhamentos)`; `:46` `(AtorId,"Líderes","Coordenação","Pede a coordenação")`; `:49` | PASS |
| C46 | 409 sem próxima etapa | `...Sem_proxima_etapa_409` | `:63`, `:68` `Conflict`; `:78` `EtapaOrdem == 1` | PASS |
| C47 | subir por estado | `...Subir_por_estado` | `:105` `OK`; `:113` `Conflict` | PASS |
| C48 | motivo vazio 400 | `...Motivo_obrigatorio_400` | `:128-129` `BadRequest` + `errors.motivo`; `:132` | PASS |
| C49 | aluno 403, outro setor 404 | `...Aluno_403_e_outro_setor_404` | `:143` `Forbidden`; `:144-145` `NotFound` | PASS |
| C50 | `acoes` traz `subir` só com etapa seguinte | `...Acao_subir_so_com_etapa_seguinte` | `:157` `Contains("subir")`; `:158`, `:161`, `:165`, `:168` `DoesNotContain` | PASS |
| C51 | Agendador sobe em 48 h, não em 47 | `FluxoPrazoTests.Sobe_no_prazo_e_nao_antes` | `FluxoPrazoTests.cs:40` `(c.Coordenacao.Id, 2, Aberto, null)`; `:43` `(c.Lideres.Id, 1)` | PASS |
| C52 | SUBIDA sem autor `Sem resposta em N horas` | `...Subida_do_agendador_registra_o_prazo_da_etapa` | `:60` `(null,"Líderes","Coordenação",$"Sem resposta em {horas} horas")`; `:62` | PASS |
| C53 | uma subida só | `...Duas_subidas_simultaneas_uma_so` | `:79-80`, `:87-88` `EtapaOrdem == 2`, `Assert.Single(... "SUBIDA")` | PASS |
| C54 | resposta pública da equipe segura | `...Resposta_da_equipe_na_etapa_segura_o_chamado` | `:113` `(c.Lideres.Id, 1)`; `:114-115` `EtapaOrdem == 2` | PASS |
| C55 | AGUARDANDO_ALUNO não sobe | `...Aguardando_aluno_nao_sobe` | `:131` `(AguardandoAluno, c.Lideres.Id, 1)`; `:132` | PASS |
| C56 | frases da subida | `chamado.test.tsx -t "frase da subida"` | `chamado.test.tsx:278-280` `'Ana subiu o chamado de Líderes para Coordenação'`, `'O chamado subiu de Líderes para Coordenação. Sem resposta em 48 horas'` | PASS |
| C57 | encaminhar manual sai do fluxo | `FluxoSubirTests.Encaminhar_manual_sai_do_fluxo` | `FluxoSubirTests.cs:182` `(null, null, c.Secretaria.Id, 1)`; `:190` | PASS |
| C58 | botão Subir pede motivo | `acoes.test.tsx -t "subir pede o motivo"` | `acoes.test.tsx:161`, `:167` `['/api/chamados/ONE-1/subir', { motivo: '  A coordenação resolve.' }]` | PASS |
| C59 | subida não derruba RoteamentoCorreto | `IndicadoresCalculoTests.Subida_nao_derruba_o_roteamento_correto` | `IndicadoresCalculoTests.cs:51-53` `(Resolvido, 0)`, `1.0`, `0.0` | PASS |
| C60 | `subir` só ATENDENTE/LIDER; 10 tipos, 11 nomes | `PermissoesChamadoTests.Subir_so_para_atendente_e_lider` + `ArquiteturaTests.Dez_acoes_do_chamado` | `PermissoesChamadoTests.cs:60+` `vale == Acoes(...).Contains("subir")` e `Assert.Null(Estados("subir","ALUNO"))`; `ArquiteturaTests.cs:657+` `Assert.Equal(10, acoes.Count)`, 11 nomes | PASS |
| C61 | setor com curso e semestre 201 e GET | `LiderancaSetorTests.Cria_lideranca_com_curso_e_semestre` | `LiderancaSetorTests.cs:41`, `:44` `(m.Ads.Id, 3)` | PASS |
| C62 | só um dos dois 400 `semestre` | `...Curso_e_semestre_juntos` | `:57-58` `Recusa400(..., "semestre", ...)` | PASS |
| C63 | bordas e triagem | `...Bordas_e_triagem_400` | `:69-73` `"semestre"`, `"cursoId"`, `"triagem"` | PASS |
| C64 | uma liderança ativa por turma 409 | `...Uma_lideranca_ativa_por_turma_409` | `:85`, `:94` `Conflict` | PASS |
| C65 | PUT não muda a turma | `...Atualizar_nao_muda_a_turma` | `:109`, `:111` `(m.Ads.Id, 3)` | PASS |
| C66 | ninguém aponta para liderança | `...Ninguem_aponta_para_lideranca` | `:125` `"setorId"`, `:127-128` `"setorCoordenacaoId"`, `:136` | PASS |
| C67 | disponibilidade da liderança | `LiderancaDestinoTests.Disponibilidade_da_lideranca` | `LiderancaDestinoTests.cs:18-20`, `:24`, `:29` `False`, `:18`, `:34` `True` | PASS |
| C68 | `GET /destino` informa sem gravar | `...Destino_informa_sem_gravar` | `:48` `True`; `:49-51` `Gravacoes.Total == 0`; `:57`, `:59` `False` | PASS |
| C69 | `/destino` 400/404/409 | `...Destino_400_404_409` | `:~64-72` `BadRequest`, `NotFound` x2, `Conflict` | PASS |
| C70 | aviso literal e 3 botões | `lideranca.test.tsx -t "aviso da liderança"` 2/2 | `lideranca.test.tsx:37` `findByText(Aviso)` (texto idêntico ao AC 57, `Assistente.tsx:34`); `:38` `['Cancelar','Prefiro a coordenação','Enviar à liderança']` | PASS |
| C71 | prévia que falha | `... -t "prévia que falha"` | `:88-90`, `:94` `corpo` `{}` | PASS |
| C72 | aceite decide | `LiderancaDestinoTests.Aceite_decide_se_vai_ao_lider` | `:92` `(t.Lideranca!.Id, 1)`; `:93` `(t.Coordenacao.Id, 2)` | PASS |
| C73 | detalhe do líder | `LiderVisaoTests.Detalhe_do_lider_sem_transcricao_nem_matricula` | `LiderVisaoTests.cs:27` `Assert.Equal(0, transcricao.GetArrayLength())`; `:28` `matricula.numero Null`; `:29` `categorias Null`; `:30-37` os outros 7 campos | PASS |
| C74 | líder 403 em 3 ações | `...Lider_nao_reclassifica_nem_encaminha` | `:61` `[Forbidden, Forbidden, Forbidden]` | PASS |
| C75 | anexo da conversa 404 ao líder | `...Anexo_da_conversa_404_para_o_lider` | `:80` `NotFound`; `:81` aluno `OK`; `:84` coordenação `OK` | PASS |
| C76 | líder perde o chamado ao subir | `...Lider_perde_o_chamado_ao_subir` | `:98-99` `NotFound`; `:102` `(Coordenacao.Id, 2, 0)` | PASS |
| C77 | solicitante+atendente vê como ALUNO | `...Solicitante_atendente_ve_como_aluno` | `:119` matrícula não nula; `:120` transcrição; `:121-123` | PASS |
| C78 | isolamento da liderança | `IsolamentoTests.Lideranca_de_outra_instituicao_nunca_recebe` | `IsolamentoTests.cs:181` `(b.Coordenacao.Id, 2)`; `:182` `NotFound`; `:183` `False` | PASS |
| C79 | tela do líder | `chamado.test.tsx -t "detalhe do líder"` | `chamado.test.tsx:309-310` `queryByText('Conversa com o assistente')` e `/matrícula/` ausentes | PASS |
| C80 | `fluxo` com versão, etapa, total, destino, abrangência | `FluxoRastroTests.Detalhe_traz_fluxo_e_abrangencia` | `FluxoRastroTests.cs:36` `(1, 1, total, "SETOR", abrangencia)`; `:44` | PASS |
| C81 | fora de fluxo `fluxo: null` | `...Fora_de_fluxo_traz_null` | `:61-63` `JsonValueKind.Null` | PASS |
| C82 | coluna lateral | `chamado.test.tsx -t "etapa do fluxo na coluna lateral"` | `:292` `'Etapa 1 de 2 · ADS, 3º semestre'`; `:297` ausente | PASS |
| C83 | alternar mantém a edição | `canvas.test.tsx -t "alternar mantém a edição"` | `canvas.test.tsx:79`, `:86-87` `Destino da etapa 3 == SETOR` | PASS |
| C84 | nós em ordem com rótulo e prazo | `... -t "nós em ordem com rótulo e prazo"` | `:97-98` `'Coordenação do curso (48 h)'`; `:101-102` ícones; `:105` x crescente | PASS |
| C85 | arrastar da paleta | `playwright fluxos.spec.ts` em :5198 (5/5) | `fluxos.spec.ts:67-68` `Math.abs(caixa.x - (fluxo.x + 320)) < 12`; `:69` sem arestas | PASS |
| C86 | regra de ligação | `... -t "regra de ligação"` | `canvas.test.tsx:116-122` 7 `expect(podeLigar(...))` | PASS |
| C87 | ligar em cadeia | `fluxos.spec.ts` | `:85`, `:89` `toHaveCount(1)`, `:92`, `:98` `toHaveCount(2)` | PASS |
| C88 | cadeia inválida | `... -t "cadeia inválida"` 2/2 | `canvas.test.tsx:134-136`, `:151-155` `FraseDaCadeia` + desligados | PASS |
| C89 | salvar envia ordem e posição | `... -t "salvar envia ordem e posição"` | `:165` PUT com etapas; `:171-172` `translate(100px,50px)`, `translate(400px,50px)` | PASS |
| C90 | remover pede confirmação | `... -t "remover nó pede confirmação"` | `:190`, `:192-194` vizinho `Fora da cadeia`, 0 arestas | PASS |
| C91 | Tab e setas | `fluxos.spec.ts` | `:114` `['Etapa 1: Liderança do semestre','Etapa 2: Coordenação do curso','Início']`; `:124` `toBeGreaterThan(antes.x + 1)` | PASS |
| C92 | lista tem as operações | `fluxos.test.tsx -t "lista tem todas as operações do canvas"` | `fluxos.test.tsx:169-171`, `:177`, `:182-183` | PASS |
| C93 | abaixo de 768 só a lista | `fluxos.spec.ts` (2 testes) | `:136` `O canvas está disponível em telas maiores.`; `:137` `toHaveCount(0)`; `:147-149` | PASS |
| C94 | biblioteca só sob demanda | `estrutura.test.ts -t "canvas carregado só sob demanda"` + `npm run build && node web/scripts/entrada-sem-canvas.mjs` | `estrutura.test.ts:65+` `expect(pasta(a), a).toBe('administracao')`; saída `entrada-sem-canvas: ok. Entrada: index-DPY3tRKT.js; canvas só em: Canvas-Bhyi7bAG.js` exit 0; `sw.js` não lista `Canvas-*` | PASS |
| C95 | simulação marca os nós | `... -t "simulação marca os nós"` | `canvas.test.tsx:224-225` `'Pulada: Sem liderança disponível'`, `'Vai por aqui'` | PASS |
| C96 | canvas vazio e falha de carga | `... -t "canvas vazio e falha de carga"` 2/2 | `:232-233`, `:246` `Não foi possível abrir o canvas. Use a lista.` | PASS |
| C97 | versão exata 12.12.1 | `node -e ...` exit 0 | `web/package.json:26` `"@xyflow/react": "12.12.1"` | PASS |
| C98 | visão/aceite vêm do tipo | `FluxoDominioTests.Visao_e_aceite_vem_do_tipo` 3/3 + `ArquiteturaTests.Visao_e_aceite_fora_do_banco_e_da_entrada` | `FluxoDominioTests.cs:144-145` `VeTudo`, `ExigeAceite`; `ArquiteturaTests.cs:678+` `DoesNotContain(colunas, proibido.IsMatch)` | PASS |
| C99 | modelo sem mudança pendente, filtro, domínio puro | 3 filtros `ArquiteturaTests` | `ArquiteturaTests.cs:638` `Assert.False(...HasPendingModelChanges())`; `:45`, `:588` | PASS |
| C100 | retrato de rotas e 403 em toda rota admin | `RetratoTests.Tabela_de_rotas_sem...` + `Admin_403_com_detail_em_toda_rota_admin` | `RetratoTests.cs:51`, `:64` `Assert.Equal(36, rotas.Count)` | PASS (texto do check erra: 8 rotas novas, não 11) |
| C101 | retrato de sucessos | `RetratoTests.Corpos_de_sucesso_iguais_aos_da_base` + comando `pwsh` (com UTF-8) | `RetratoTests.cs:305` `Assert.Equal(56, gravados.Length)`; comando: 0 diferenças, exit 0 | PASS |
| C102 | glossário e frases de evento | `ArquiteturaTests.Glossario_lista_os_termos` + `textos.test.tsx -t "todo tipo de evento tem frase"` | `ArquiteturaTests.cs:236+` `Significado(l).Length >= 10` para 6 termos; `textos.test.tsx:194` `toContain('SUBIDA')`, `:198` | PASS |
| C103 | suítes verdes | `dotnet build One.slnx` (0 erros, 6 avisos); `dotnet test One.Api.Tests` 685/0; `vitest run` 557/0; `npm --prefix web run build` exit 0 | contagens acima; TRX `D:\verif-out\verif.trx` | PASS |
| C104 | crapper < 10 e dryer sem candidato | `npm --prefix web run coverage` exit 0 (557 aprovados); `crapper --use-existing-coverage -s src --threshold 9.99`; `dryer ... --threshold 0.8` | `crapper`: `Program 'crapper.exe' failed to run ... Uma política de Controle de Aplicativo bloqueou este arquivo.` (não executou; sem saída de CRAP). `dryer`: `No duplicate candidates found.` exit 0 | FAIL (C: gate bloqueado por política do SO, não é defeito do código) |
| C105 | fluxo real de ponta a ponta | `E2E_URL=http://localhost:8089 npx playwright test e2e/fluxos-real.spec.ts` na imagem própria `one-verif-fluxos:a57fac8` (banco `one_verif_fluxos`, bucket `one-verif-fluxos`, instituição `e2e`): 3/3 | `fluxos-real.spec.ts:147`, `:188`, `:208` (admin cria/simula/publica; aluno aceita; líder sem conversa sobe; coordenação recebe) | PASS (o roteiro executado difere do texto do check: prazo na liderança, ver Binding sources) |
| C106 | e2e simulada inteira | `E2E_URL=http://localhost:5198 npx playwright test <11 specs>`: 231 passam, 3 falham | `anexos.spec.ts:69`, `anexos.spec.ts:140`, `plataforma.spec.ts:4` | FAIL (comando do check errado, ver abaixo; o código passa: `plataforma.spec.ts "manifesto e service worker"` passa 1/1 na imagem real :8089) |

C106, causa: os 3 specs não usam `simulada.ts`. `anexos.spec.ts:3-5` se declara "e2e real, sem simulada.ts" (Mailpit e MinIO atrás da API); `plataforma.spec.ts:4` pede `/api/auth/me` e espera 401, recebeu 502 do proxy do `vite preview` (nada na 5226). Nenhum dos dois arquivos mudou em `e1320eb..HEAD`. É defeito do comando do check (B), não do código; o check segue FAIL porque o comando escrito não sai 0.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| rotas novas (8) | `Retratos/rotas.txt` (igual à tabela viva, `RetratoTests.cs:51`) | `GET/POST /fluxos` C39/C17 · `PUT/DELETE rascunho` C22/C33 · `publicar` C30 · `simular` C34 · `GET /destino` C68 · `POST /subir` C44 | - |
| statuses das rotas de fluxo (GET 200; POST 201/400/409; PUT 200/400/404; DELETE 204/404; publicar 201/404/409; simular 200/400/404) | handlers de `Administracao/*.cs` | todos casam com C17-C39 | - |
| `POST /api/conversas/{id}/transferir` 201/400/404/409 | `TransferirConversa.cs` + `Transferencia.cs` | 201 C72 · 409 C69 (`LiderancaDestinoTests.cs` `Conflict` no POST) · 400 e 404: a tabela do autor cita C69, mas o proof de C69 não afirma 400/404 do POST; só `TransferenciaTests.cs:146` (400) e `ConversaTests.cs:83/106` (existentes, não citados) | 400 e 404 do `POST /transferir` sem check que os afirme (existem em testes antigos, não nomeados) |
| `GET /destino` 200/400/404/409 | `VerDestino.cs` | C68, C69 | - |
| `POST /subir` 200/400/403/404/409 | `SubirChamado.cs` | C44, C48, C49, C46 | - |
| `GET /api/chamados/{numero}` 200/404 | `ChamadoRotas.cs` | C80, C76 | - |
| constraints do Postgres (fluxo 2 ck + 1 ux; versao_fluxo 2 ux; etapa_fluxo 3 ck + 1 ux; setor 2 ck + 1 ux) | catálogo `pg_constraint`/`pg_indexes` da imagem do HEAD | C13, C14 (nomes asseridos em `FluxoModeloTests.cs:50-137`) | - |
| `instituicao_id` NOT NULL + query filter nas 3 tabelas | `information_schema` (NO) e `ArquiteturaTests.cs:45` | C99 | - |
| estados do chamado para `subir` (5) | `EstadosChamado` | C47 · permissão C60 | - |
| papéis x `subir` (3) | `PermissoesChamado.cs:27,32` | C60 (ATENDENTE, LIDER, ALUNO) | - |
| ações negadas ao líder (6: reclassificar, duplicado, encaminhar, confirmar, rejeitar, cancelar) | `PermissoesChamado.cs` | C74 (3 por HTTP) · `PermissoesChamadoTests.Lider_tem_cinco_acoes` (6, não citado) | - |
| campos do detalhe do líder (22 chaves de `DetalheChamado` no JSON real) | `DetalheChamado.cs:10-15` | `transcricao`, `matricula.numero`, `categorias`, `solicitante`, `resumo`, `matricula.curso/.semestre`, `mensagens`, `eventos`, `fluxo`, `acoes` C73 | `setores` e `origemCategoria` do líder (nulos por `DetalheChamado.cs:127`, descritos no Handoff como parte da door 7) sem asserção em nenhum teste (`grep` em `One.Api.Tests` e `web/src/chamados`) |
| lista `setores` do detalhe da equipe sem lideranças (`DetalheChamado.cs:130` `s.CursoId == null`) | código + Handoff (3) | nenhum (C66 afirma só o 400 do `encaminhar`) | filtro de lideranças na lista de destinos sem prova |
| frases do Histórico para SUBIDA (2) e tipos de evento | `textos.ts` | C56, C102 | - |
| asserções existentes que mudam (7) | diff dos testes existentes | 1 C60 · 2 C98 · 3 C100 · 4 C101 · 5 C10 · 6 C40 · 7 C106 (FAIL) | - |
| edições fora da lista | `git diff -U0` de ArquiteturaTests, MediatorTests, SessaoTests, PlataformaTests, OrdemDasRecusasTests, PermissoesChamadoTests, RetratoTests | só contagens que subiram (74→79, 77→82, 28→30, 38→40, 65→69, 70→75, 79→84, 33→36, 100→110) e renomeações; nenhum limite baixou, nenhuma asserção apagada. Única baixa: `Retratos/sucessos.txt` 59→56 linhas (as 3 de `regras`, prevista) | - |
| telas do `## Screens` (13 linhas) | código renderizado | ver Binding sources | arranjo "Simular e Publicar na mesma barra" contradito pelo código; arranjo do canvas e do alternador sem check |
| startup config (2) | `Program.cs` e `OneFactory` | C103; nenhuma chave nova (`git diff` sem `appsettings`) | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide, atravessa a rota HTTP | `CriarFluxo`, `SalvarRascunho`, `PublicarFluxo`, `SubirChamado`, `VerDestino`, `DetalheChamado` | uma na rota; cada status da Surface, cada recusa com o campo, cada borda | no - `POST /transferir` 400/404 sem check que os afirme; `setores`/`origemCategoria` do líder sem asserção; demais bordas (0/1/5/6, 0/720/721, 0/13) provadas |
| Decide, sem atravessar rota | `ResolverFluxo`, `Chamado.Subir`, visão por tipo | uma na própria camada, uma linha por linha da tabela | yes - C15 (8), C16 (8), C98 (3), `ChamadoDominioTests` (2 subir) |
| Decide, na tela | `grafo.ts` (`podeLigar`, `cadeiaValida`), alternador | um caso por linha | yes - C86 (7 expects: 5 casos + 2), C88 (2 testes) |
| Arrastar, soltar e teclado no canvas | `Canvas.tsx` | uma no navegador, gesto e resultado | yes - C85, C87, C91 passam em :5198; os textos de acessibilidade em inglês e o arranjo da paleta não têm check |
| Instrumentation | nós de apresentação, mapeamento | nenhuma própria | yes |

## Faults injected

Worktree `D:\verif-wt` (HEAD detached em `a57fac8`), removido no fim; `git status --porcelain` da árvore real vazio antes e depois (salvo o arquivo temporário `web/e2e/zz-verif.spec.ts`, criado para medir o arranjo e apagado). Obs.: a 1ª tentativa da falta 4 foi desfeita por uma corrida minha entre `git checkout` e a edição e não vale; a falta foi reaplicada e rodada.

| Mutation | Location | Killed |
| --- | --- | --- |
| precedência trocada: fluxo só do curso antes do curso+semestre | `One.Api/Dados/Fluxos/ResolverFluxo.cs:28-29` | yes - `FluxoDominioTests.Escolhe_o_fluxo_mais_especifico` (2 linhas) e `FluxoRoteamentoTests.Fluxo_mais_especifico_vence` falham (3 falhas) |
| `Subir` incrementa `Encaminhamentos` | `One.Api/Dados/Chamados/Chamado.cs:152-154` | yes - `FluxoSubirTests.Subida_nao_e_encaminhamento`, `IndicadoresCalculoTests.Subida_nao_derruba_o_roteamento_correto`, 2 de `ChamadoDominioTests` (4 falhas) |
| LIDER ganha `reclassificar` (o 403 some) | `One.Api/Chamados/PermissoesChamado.cs:32` | yes - `LiderVisaoTests.Lider_nao_reclassifica_nem_encaminha` falha |
| limite do prazo `<=` -> `<` | `One.Api/Agendador.cs:69` | yes - `FluxoPrazoTests.Sobe_no_prazo_e_nao_antes` `Assert.Equal() Failure` |
| `podeLigar` deixa de recusar ciclo (`return true`) | `web/src/administracao/grafo.ts:71` | yes - `canvas.test.tsx` "regra de ligação" `expected true to be false` |

5 injetadas, 5 mortas, 0 sobreviventes. Não foram injetadas: a exigência "sem mensagem pública da equipe" do Agendador (superfície coberta só pela leitura de C54), o filtro de lideranças em `DetalheChamado.cs:130` e `setores`/`origemCategoria` do líder (cap de 5).

## Gate

`dotnet build One.slnx` - 0 erros; `dotnet test One.Api.Tests` - 685 passed, 0 failed; `npx vitest run` - 557 passed, 0 failed (58 arquivos de teste de feature); `npm --prefix web run build` + `node web/scripts/entrada-sem-canvas.mjs` - exit 0; `dryer` - 0 candidatos, exit 0; `crapper` - NÃO EXECUTOU (bloqueio do SO); `fluxos.spec.ts` em :5198 - 5 passed, 0 failed; `fluxos-real.spec.ts` na imagem própria em :8089 - 3 passed, 0 failed; C106 - 231 passed, 3 failed (comando do check); `mutator` - suspenso por decisão do usuário (AD-025), não rodado, não conta como PASS.

## Ranked gaps

(A) Defeitos do código
1. `web/src/administracao/EdicaoDoFluxo.tsx` (layout do editor): `Simular` fica na seção do simulador e `Publicar` numa linha abaixo; `## Screens` decide "na mesma barra". A barra de `Cancelar`/`Salvar rascunho` fica abaixo da dobra a 900 px de altura (captura `lista-1440.png`).
2. `web/src/administracao/Canvas.tsx` (`<ReactFlow>`, sem `ariaLabelConfig`): `Control Panel`, `Zoom In/Out`, `Fit View`, `Edge from inicio to no-1` e a instrução de teclado saem em inglês numa interface pt-BR (AGENTS.md) e o aria-label da aresta expõe ids internos.
3. `One.Api/Dados/Chamados/Chamado.cs:143` - comentário truncado (`// torId nulo ...`), cosmético.

(B) Defeitos/lacunas dos checks
1. C106 - o comando inclui `anexos.spec.ts` e `plataforma.spec.ts`, que são e2e reais; contra `vite preview` 3 testes dão 502. Trocar por specs simulados, ou rodar esses dois contra a imagem própria.
2. C105 - o texto pede prazo de 48 h na coordenação (última etapa), que o AC 22/C27 recusam.
3. C84 x AC 71 ("sobe após N h" no plano, ` (48 h)` no check): o plano e o check divergem sem emenda registrada.
4. C100 - "as 11 da Surface": as rotas novas são 8.
5. `Coverage`: `POST /transferir` 400/404 atribuídos a C69, que não os afirma.
6. Arranjo sem check: paleta em coluna à esquerda, altura mínima 360 px, Início na extremidade esquerda, alternador no topo, `Simular`/`Publicar` na mesma barra, `Subir` entre as ações (Screens, C42/C58/C83-C85/C96).
7. Sem check: textos de acessibilidade do canvas em pt-BR (página do React Flow, `ariaLabelConfig`).
8. `setores`/`origemCategoria` do líder e o filtro de lideranças na lista `setores` sem asserção; cabeçalho diz 96 checks, há 106.

(C) Bloqueios do ambiente
1. C104 - `crapper.exe` bloqueado pelo Controle de Aplicativo do Windows (`C:\Users\Alfredo Neto\.local\bin\crapper.exe`); não há saída de CRAP. Precisa ser rodado noutro computador ou com a exceção liberada. O `dryer` passa.
2. `mutator` suspenso (AD-025).

Limpeza: contêiner `one-verif-fluxos`, imagem `one-verif-fluxos:a57fac8`, banco `one_verif_fluxos` (o bucket `one-verif-fluxos` criado pela API ficou no MinIO do compose; remover à mão), worktree `D:\verif-wt` e o preview da :5198 removidos; `D:\verif-out` (TRX, JSON do Vitest, capturas) fica fora do repositório. Não houve `git stash` nem alteração de arquivo rastreado além deste relatório.
