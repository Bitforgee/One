# RAG com OpenAI verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 4b9fbd6..00d439c (rodada 3 escopada em a92daae..00d439c: só `00d439c`, que toca testes, o falso `LlmFalso` e uma linha do `## Handoff` de `checks.md`)
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier); fresh context, did not build the feature nor the fix

Resumo: as 46 checks têm prova que existe, roda e passa em `00d439c` (as 44 provas de API aparecem
uma a uma como `Aprovado` na suíte completa de 237; as 3 web passam com `--reporter=verbose`). Os
**três mutantes sobreviventes da rodada 2 foram reinjetados e morreram**, cada um na prova do seu check
e na asserção nova da correção:

1. F2url (URL fixa, ignora `Llm:BaseUrl`) morre em C7, `BuscaTests.cs:87`;
2. T199 (`> 200` -> `>= 200`) morre em C28, `DocumentoTests.cs:211`;
3. JSON `null` sem checagem morre em C43, caso `JSON null` (`AvaliarBuscaTests.cs:124`, falha em `:132`).

Os três membros que a rodada 2 deixou Unproven agora têm prova, e a linha 3 de Test policy fica
atendida. Uma observação sobre o falso, que não muda o veredito, está em `## Faults injected`.

## Binding sources

Carried from c29942e (a correção não toca interface). Profile `standard`: o passo 1 não roda e o plano
não marca nenhuma fonte como binding.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| nenhuma marcada binding | n/a - profile standard | - | - |

## Checks

Verified at 00d439c. Provas re-executadas em `HEAD`, uma invocação por alvo:

- API: `dotnet test api.Tests --logger "console;verbosity=normal"` -> `Total de testes: 237, Aprovados: 237`.
  Os 44 nomes `FullyQualifiedName~Classe.Metodo` tirados de `checks.md` foram procurados na saída como
  `Aprovado One.Api.Tests.<Classe>.<Metodo> [`: os 44 aparecem exatamente uma vez (nenhum zero, nenhum
  duplicado; C22 tem duas provas). Lição L-002: cada filtro usado nos mutantes rodou `Total de testes: 1`.
- Web: `npm --prefix web run test -- --reporter=verbose -t "tela Documentos lista, vazio e confirma arquivar|artigos mostram a indexação|fonte de documento no detalhe"`
  -> `✓ chamado > fonte de documento no detalhe`, `✓ documentos > tela Documentos lista, vazio e confirma arquivar`,
  `✓ documentos > artigos mostram a indexação` (3 passed, 32 skipped); suíte web completa 35/35.

Citações renovadas nos 3 arquivos de teste que a correção tocou (`BuscaTests.cs` +2 depois da linha 85,
`DocumentoTests.cs` +2 depois da 209, `AvaliarBuscaTests.cs` +1 depois da 123; deslocamentos conferidos
linha a linha com `sed -n`). Nos demais arquivos de teste, intocados por `00d439c`, as linhas são as da
rodada 2 (carried from a92daae, mesmas linhas em `HEAD`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | corpo do chat OpenAI, sem `max_tokens`/`temperature`/`thinking` | `LlmRequisicaoTests.Parametros_e_ordem_do_prompt` passou | `api.Tests/LlmRequisicaoTests.cs:76` URL `https://llm.teste/v1/chat/completions`; `:79-82` `gpt-6-luna`, `json_object`, `800`, `none`; `:83-84` ausentes | PASS |
| C2 | log com cache 1000/200/80 | `ProvedorTests.Log_tokens_com_cache_openai` passou | `api.Tests/ProvedorTests.cs:35` `Assert.Equal((1000, 200, 80), ...)` | PASS |
| C3 | 429, 500, 20 s, JSON inválido -> `sem_base` e motivo | `ProvedorTests.Falhas_do_chat_viram_sem_base` passou | `api.Tests/ProvedorTests.cs:45-53` tabela; `:59` `("sem_base", SemBase)`; `:60` `Logou(id, motivo)` | PASS |
| C4 | padrões OpenAI e `Llm__ChaveApi` no compose | `ProvedorTests.Configuracao_padrao_openai` passou | `api.Tests/ProvedorTests.cs:70-73` | PASS |
| C5 | corpo só com o permitido, últimas 10 | `LlmRequisicaoTests.Corpo_so_traz_o_permitido` passou | `api.Tests/LlmRequisicaoTests.cs:55-56`, `:60`, `:64` | PASS |
| C6 | ativar/editar gravam trecho pendente; falha mantém RASCUNHO | `IndexacaoTests.Ativar_e_editar_gravam_trecho_pendente` passou | `api.Tests/BuscaTests.cs:39-40`, `:45`, `:58-59` `EstadosArtigo.Rascunho` | PASS |
| C7 | 250 pendentes -> lotes 100/100/50, vetores 1536 | `IndexacaoTests.Lotes_de_100_gravam_vetores` passou | `api.Tests/BuscaTests.cs:83` `Assert.Equal([100, 100, 50], lotes)`; `:84-85` `("text-embedding-3-small", "float")` em cada corpo; `:87` `Assert.All(f.Llm.UrisEmbeddings.Skip(antes), u => Assert.Equal("https://llm.teste/v1/embeddings", u.ToString()))` (`Llm:BaseUrl` = `https://llm.teste/v1` em `api.Tests/Infra/OneFactory.cs:38`); `:92` `1536` | PASS - re-julgada: F2url morto em `:87` |
| C8 | 5 tentativas, 2^n min, log, 6ª sem chamada, `FALHOU` | `IndexacaoTests.Falha_de_embeddings_tenta_5_vezes` passou | `api.Tests/BuscaTests.cs:111`, `:112`, `:118`, `:123` | PASS |
| C9 | `indexacao` PENDENTE -> INDEXADO | `IndexacaoTests.Indexacao_no_admin` passou | `api.Tests/BuscaTests.cs:136`, `:140`, `:142` | PASS |
| C10 | exatamente os 5 mais próximos, em ordem | `BuscaTests.Chat_recebe_os_5_mais_proximos` passou | `api.Tests/BuscaTests.cs:192` `Assert.Equal(esperados, IdsDasFontes(...))` | PASS |
| C11 | consulta = 2ª+3ª+4ª; "sim" ainda acha o boleto | `BuscaTests.Consulta_com_as_ultimas_3_mensagens` passou | `api.Tests/BuscaTests.cs:205`, `:210` | PASS |
| C12 | consulta de embedding mascarada | `BuscaTests.Consulta_de_embedding_mascarada` passou | `api.Tests/BuscaTests.cs:222` | PASS |
| C13 | 7 filtros da busca | `BuscaTests.So_trechos_buscaveis` passou | `api.Tests/BuscaTests.cs:265-266` `Assert.Empty(ids.Intersect(proibidos))` | PASS |
| C14 | arquivar tira da busca, conversa mantida | `BuscaTests.Arquivar_tira_da_busca` passou | `api.Tests/BuscaTests.cs:282`, `:284` | PASS |
| C15 | nada indexado -> fontes vazias, `sem_base` | `BuscaTests.Sem_trechos_indexados` passou | `api.Tests/BuscaTests.cs:300-301` | PASS |
| C16 | fonte fora dos buscados -> `sem_base`, `fonte_invalida` | `BuscaTests.Fonte_fora_dos_buscados_sem_base` passou | `api.Tests/BuscaTests.cs:316`, `:318-319` | PASS |
| C17 | conferência contra o trecho de fonte (3 casos) | `BuscaTests.Conferencia_contra_o_trecho_de_fonte` passou | `api.Tests/BuscaTests.cs:338-339` | PASS |
| C18 | `trechos_buscados` em ordem e vazio; citação só com `trecho_fonte_id` | `BuscaTests.Grava_buscados_e_citacoes` passou | `api.Tests/BuscaTests.cs:353`, `:355`, `:361` | PASS |
| C19 | UPDATE/DELETE recusados **pelo trigger**, embedding nulo aceito | `ImutabilidadeRagTests.Trechos_e_versoes_append_only` passou | `api.Tests/ProvedorTests.cs:198`; `:204-205` `Assert.Equal(("P0001", motivo), (e.SqlState, e.MessageText))`; `:206`; `:210-212` door R4 `("23505", "ix_versao_documento_documento_id_numero")`; `:215-216` | PASS |
| C20 | embedding da consulta falha -> `sem_base`, 0 chats, `busca_indisponivel` | `BuscaTests.Embedding_da_consulta_falha_sem_base` passou | `api.Tests/BuscaTests.cs:374-376` | PASS |
| C21 | log da busca sem texto | `BuscaTests.Log_da_busca_sem_texto` passou | `api.Tests/BuscaTests.cs:391-395` | PASS |
| C22 | `vector`, `vector(1536)`, hnsw cosseno, imagem trixie, mapeamento nos dois modelos | `ArquiteturaRagTests.Pgvector_e_indice_hnsw` e `ArquiteturaTests.Layout_e_compose` passaram | `api.Tests/ProvedorTests.cs:91-95`, `:97-99`; `api.Tests/ArquiteturaTests.cs:85` | PASS |
| C23 | CHECKs de trecho e citação | `ArquiteturaRagTests.Check_constraints` passou | `api.Tests/ProvedorTests.cs:129-135` `Assert.Equal(restricao, e.ConstraintName)` | PASS |
| C24 | 3 tabelas novas com `instituicao_id`, FK e filtro | `ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro` passou | `api.Tests/ArquiteturaTests.cs:17`, `:47`, `:51-54`, `:59` | PASS |
| C25 | STATE.md: AD-015, AD-016 ativas, AD-006 substituída | `ArquiteturaRagTests.Decisoes_registradas` passou | `api.Tests/ProvedorTests.cs:145-149` | PASS |
| C46 | sem `Microsoft.Agents.AI*`/`Microsoft.Extensions.AI*`, cliente `llm` | `ArquiteturaRagTests.Sem_framework_de_agentes` passou | `api.Tests/ProvedorTests.cs:158-161` | PASS |
| C26 | upload 201, ATIVO, v1, 2 páginas, texto e trechos na mesma transação | `DocumentoTests.Subir_pdf_201` passou | `api.Tests/DocumentoTests.cs:134` `Created`; `:136` `("ATIVO", 1, 2)`; `:139-143`; `:156` `InternalServerError`; `:157` `Assert.Equal(antes, await Linhas())` | PASS |
| C27 | divisão 1500/1501, parágrafo, frase, sobreposição 200 | `DivisaoTests.Trechos_de_ate_1500_com_sobreposicao` passou | `api.Tests/DocumentoTests.cs:70`, `:77-78`, `:83-84`, `:89-91`, `:94-95` | PASS |
| C28 | 415, 413, 20 MB aceito, 400 sem texto/título/categoria, nada gravado; título até 200 | `DocumentoTests.Recusas_do_upload` passou | `api.Tests/DocumentoTests.cs:178-193` tabela de 16 casos; `:199` `Assert.True(r.StatusCode == esperado, caso)`; `:200-204` `detail`; `:206` contagens iguais; `:209` 20 MB `Created`; `:211` `Assert.Equal(HttpStatusCode.Created, (await m.Admin.Subir(new string('t', 200), ...)).StatusCode)` | PASS - re-julgada: T199 morto em `:211` |
| C29 | versão 2, v1 legível, busca só v2 | `DocumentoTests.Nova_versao` passou | `api.Tests/DocumentoTests.cs:225-227`, `:231-232` | PASS |
| C30 | arquivar 200/409/409/404/404, sai da busca | `DocumentoTests.Arquivar` passou | `api.Tests/DocumentoTests.cs:250-259` | PASS |
| C31 | fontes com `tipo`; PDF a atendente e admin | `DocumentoTests.Fonte_documento_no_detalhe` passou | `api.Tests/DocumentoTests.cs:297-300`, `:305-307` | PASS |
| C32 | aluno não recebe nada do documento; 404 no PDF | `SigiloRagTests.Aluno_nao_recebe_dado_de_documento` passou | `api.Tests/DocumentoTests.cs:443`, `:445` | PASS |
| C33 | categoria do documento com origem `ARTIGO`; última citação decide | `DocumentoTests.Categoria_do_documento_no_chamado` passou | `api.Tests/DocumentoTests.cs:318`, `:328` | PASS |
| C34 | tela Documentos: lista, vazio, Modal antes de arquivar | vitest `tela Documentos lista, vazio e confirma arquivar` passou | `web/src/documentos.test.tsx:29`, `:35-40`, `:44-46`, `:51` | PASS |
| C35 | 403 nas 29 rotas `/api/admin/*` | `AdminTests.Sem_papel_admin_403` passou | `api.Tests/AdminTests.cs:42` `Assert.Equal(29, ...)`; `:49` | PASS |
| C36 | admin de outra instituição recebe 404 nas 3 rotas | `DocumentoTests.Documento_de_outra_instituicao_404` passou | `api.Tests/DocumentoTests.cs:340-342`, `:344` | PASS |
| C37 | 401 nas 54 rotas privadas | `SessaoTests.Sem_cookie_401_em_toda_rota_privada` passou | `api.Tests/SessaoTests.cs:34` `Assert.Equal(54, ...)`; `:39` | PASS |
| C38 | lista 200, campos, ordem por título | `DocumentoTests.Listar_200` passou | `api.Tests/DocumentoTests.cs:357`, `:359`, `:361-363` (`PENDENTE`); `:369` `Assert.Equal(["FALHOU", "INDEXADO"], depois)` | PASS |
| C39 | tela Artigos mostra a indexação | vitest `artigos mostram a indexação` passou | `web/src/documentos.test.tsx:68-72` | PASS |
| C40 | detalhe na SPA: ícone, trecho, link do PDF | vitest `fonte de documento no detalhe` passou | `web/src/chamado.test.tsx:209-211` | PASS |
| C41 | `acerto 1`, `acerto 3`, `erro`, `2/3`, código 0 | `AvaliarBuscaTests.Avaliacao_valida_sai_0` passou | `api.Tests/AvaliarBuscaTests.cs:57`, `:60-68` | PASS |
| C42 | 0 chats, 1 embedding por pergunta, banco igual | `AvaliarBuscaTests.Nao_chama_chat_nem_grava` passou | `api.Tests/AvaliarBuscaTests.cs:101`; `:106` `Assert.Equal(0, codigo)`; `:107` `/4`; `:108-110` | PASS |
| C43 | erros -> caminho e motivo, código 1 | `AvaliarBuscaTests.Arquivo_invalido_sai_1` passou | `api.Tests/AvaliarBuscaTests.cs:120-127` tabela de 7 casos, `:124` caso `JSON null` com `["--arquivo: nenhuma pergunta"]`; `:133` `Assert.True(codigo == 1, caso)`; `:135` `Assert.Contains(e, erro)`; `:136`; `:140-146` falha de embeddings, `Assert.Equal(1, codigo)` e a mensagem | PASS - re-julgada: mutante JSON `null` morto |
| C44 | erros em `problem+json` com `detail` | `DocumentoTests.Erros_em_problem_json` passou | `api.Tests/DocumentoTests.cs:394-395` | PASS |
| C45 | 404 a atendente de outro setor, 200 ao aluno | `DocumentoTests.Detalhe_com_documento_segue_visibilidade` passou | `api.Tests/DocumentoTests.cs:406-407` | PASS |

Nível (carried from a92daae, a correção não muda nível): as checks que nomeiam status, rota ou forma
de resposta são provadas pelo HTTP com `WebApplicationFactory`; C7 afirma a URL na saída HTTP real do
cliente `llm` (o falso é o `HttpMessageHandler`); C19, C22-C25, C27 e C46 ficam na própria camada.
Nenhuma lacuna de nível.

`00d439c` muda `checks.md` só no `## Handoff` (uma linha registrando a rodada 2); nenhuma check, linha
de Coverage ou de Test policy foi alterada.

## Coverage

Verified at 00d439c para as três linhas que estavam Unproven na rodada 2; membros tirados do código de
produção (inalterado desde c29942e: `git diff a92daae..00d439c -- api web` vazio) e do plano. As demais
linhas: carried from a92daae.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/admin/documentos` statuses (3) | carried from a92daae | 200 C38 · 401 C37 · 403 C35 | - |
| `GET /api/admin/documentos` `indexacao` (3) | carried from a92daae | PENDENTE C38 · FALHOU e INDEXADO C38 | - |
| `POST /api/admin/documentos` statuses (5) | carried from a92daae | 201 C26 · 400 C28 · 403 C35 · 413 C28 · 415 C28 | - |
| recusas 400 do upload, do código (por condição) | `DocumentoRotas.cs:42,52,57,102,103` | sem `arquivo` C28 · sem texto C28 · PDF ilegível C28 · título em branco C28 · título: 201 recusado (`DocumentoTests.cs:188`, `:202`) e 200 aceito (`:211`, T199 morto) · `categoriaId` ausente C28 · não numérico C28 · categoria inativa, inexistente, de outra instituição C28 · versão sem texto C28 | - |
| `POST /api/admin/documentos/{id}/versoes` statuses (7) | carried from a92daae | 201 C29 · 400 C28 · 403 C35 · 404 C30 · 409 C30 · 413 C28 · 415 C28 | - |
| `POST /api/admin/documentos/{id}/arquivar` statuses (4) | carried from a92daae | 200 C30 · 403 C35 · 404 C30 · 409 C30 | - |
| `GET /api/documentos/versoes/{id}` statuses (3) | carried from a92daae | 200 C31 · 401 C37 · 404 C32, C36 | - |
| `GET /api/admin/artigos` statuses e `indexacao` (3 + 3) | carried from a92daae | 200 C9 · 401 C37 · 403 C35 · PENDENTE/INDEXADO C9 · FALHOU C8 | - |
| `GET /api/chamados/{numero}` statuses e `tipo` (3 + 2) | carried from a92daae | 200 C31 · 401 C37 · 404 C45 · ARTIGO/DOCUMENTO C31 | - |
| rotas novas com `{id}` de outra instituição (3) | carried from a92daae | C36 sobre as 3 | - |
| door R1, forma literal (chat 6 + embeddings 4) | plan Landing R1 (`plan.md:141`); `Embeddings.cs:19-22` | chat C1 · embeddings: URL `{Llm:BaseUrl}/embeddings` C7 (`BuscaTests.cs:87`, F2url morto) · `input` em lote C7 (`:83`) · `model` e `encoding_format: "float"` C7 (`:84-85`) | - |
| door R2 (5) | carried from a92daae | extensão, `vector(1536)`, hnsw cosseno, imagem C22 · `ORDER BY <=> LIMIT k` C10 | - |
| door R3 (5) | carried from a92daae | CHECK C23 · trigger C19 · trecho de artigo C6 · divisão C27 · pendente sem embedding C6/C26 | - |
| door R4 (4) | carried from a92daae | `documento`/`versao_documento` C24, C26 · 20 MB e `%PDF` C28 · append-only C19 · `numero` único C19 | - |
| doors R5-R8 (4) | carried from a92daae | R5 C18 · R6 C25 · R7 C46 · R8 C22 | - |
| entidades e restrições de Relations (5 + 5) | carried from a92daae | como o autor; append-only via C19 | - |
| falhas do chat (4) | carried from a92daae | C3 tabelado | - |
| motivos de `sem_base` novos (3) | carried from a92daae | `fonte_invalida` C16 · `busca_indisponivel` C20 · nada indexado C15 | - |
| filtros da busca (7) | carried from a92daae | C13 tabelado | - |
| lote / tentativas (3 + 5) | carried from a92daae | C7 · C8 | - |
| divisão: guardas de corte (2) | carried from a92daae | parágrafo C27 · frase C27 | - |
| saídas e erros do `avaliar-busca`, do código (2 + 9 condições) | `InstituicaoComando.cs:184-213` | 0 C41 · 1 C43 · slug (`AvaliarBuscaTests.cs:120`) · arquivo inexistente (`:122`) · JSON inválido (`:121`) · lista vazia (`:123`) · JSON `null` (`:124`, mutante morto) · pergunta vazia (`:125`) · fonte inválida (`:126-127`) · falha de embeddings (`:140-146`) | - |
| `fonte` aceita no `avaliar-busca` (2) | carried from a92daae | artigo C41 · documento ativo C42 | - |
| checks do `mvp-one` substituídos (8) | carried from a92daae | como o autor; suíte completa verde | - |
| startup config `UseVector` (2) | carried from a92daae | C22 abre os dois contextos (`ProvedorTests.cs:97-99`) | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide e é alcançado por HTTP: filtros, conferência, recusas do upload, falhas do provedor | `Assistente.cs`, `DocumentoRotas.cs` | tabela na fronteira, um caso por linha | yes - verified at 00d439c: a tabela de C28 tem um caso por recusa e o limite do título agora tem os dois lados (201 recusado, 200 aceito em `DocumentoTests.cs:211`) |
| Decide e não depende de HTTP: divisão, lotes, tentativas | `DocumentoRotas.Dividir`, `Agendador.cs` | uma na própria camada, com os limites | yes - carried from a92daae |
| Entrada que não decide: corpo das rotas de documento, arquivo do `avaliar-busca` | `DocumentoRotas.cs`, `InstituicaoComando.cs` | uma na fronteira: entrada aceita, cada recusa, cada erro | yes - verified at 00d439c: o arquivo JSON `null` ganhou caso (`AvaliarBuscaTests.cs:124`); cada erro do comando tem caso |
| Instrumentação, repasses | logs da busca e da chamada | nenhuma própria | yes - carried from c29942e |

## Faults injected

Verified at 00d439c. Num worktree separado (`git worktree add ../one-verify-rag3 HEAD`), nunca no tree
real (lição L-014). Cada mutante aplicado por substituição exata (contagem 1 conferida), revertido com
`git checkout -- api api.Tests` no worktree; todos compilaram (`error CS` = 0) e cada filtro rodou
exatamente um teste (`Total de testes: 1`, lição L-002). Baseline `git status --porcelain` do tree real:
`M .specs/STATE.md`, `M ROADMAP.md`, `?? .idea/`, `?? .metrics/`, `?? .specs/features/rag/verification.md`,
`?? .specs/features/refatoracao-solid/`; depois de `git worktree remove` a saída é idêntica.

| Mutation | Location | Killed |
| --- | --- | --- |
| F2url URL ignora `Llm:BaseUrl` (`"https://api.openai.com/v1/embeddings"` fixo) | `api/Assistente/Embeddings.cs:19` | yes - C7, `BuscaTests.cs:87` (`Assert.All() Failure: 3 out of 3`, `Actual "https://api.openai.com/v1/embeddings"`) |
| T199 limite do título `> 200` -> `>= 200` | `api/Rotas/DocumentoRotas.cs:102` | yes - C28, `DocumentoTests.cs:211` (`Expected Created`, `Actual BadRequest`) |
| JSON `null` sem checagem (`perguntas!.Count == 0`) | `api/Comando/InstituicaoComando.cs:190` | yes - C43, caso `JSON null`: `NullReferenceException` em `AvaliarBuscaTests.cs:132` |

A superfície nova que a correção criou no limite do título (o caso de 200 aceito) é a que T199 faz
falhar; `> 201` continua morto pelo caso de 201, que a correção não tocou.

Superfície nova no próprio falso (`api.Tests/Infra/OneFactory.cs:170`, `UrisEmbeddings.Add`): F2url
morrer com `3 out of 3 items` mostra que, em `HEAD`, a lista é preenchida e a asserção lê a URL real.
Tirar a gravação do falso **junto com** F2url deixa C7 verde (`Aprovado`, `Total de testes: 1`), porque
`Assert.All` sobre lista vazia passa e a linha `:87` não afirma a contagem de URIs (a de corpos é
ancorada por `:83`). É uma falha dupla, uma delas no código de teste e não na implementação, então não
entra na tabela como mutante sobrevivente; fica como observação: `Assert.Equal(3, ...)` ou
`Assert.Equal(Enumerable.Repeat("https://llm.teste/v1/embeddings", 3), ...)` em `:87` tiraria a
dependência.

Rodadas anteriores (carried from a92daae, superfícies intocadas pela correção): F1, F2, F3, F4, F5, F6,
F7, F7b, F8, F9, F10, F11, F12, F13, F14, F15, F16, F17, R4, G25, G29, T200, os 4 mutantes de recusa
do upload, o de falha de embeddings do `avaliar-busca`, W1, W2, W3 mortos.

## Swept

Carried from a92daae: `00d439c` não muda código de produção (`git diff a92daae..00d439c -- api web`
vazio), então as restrições citadas continuam onde as rodadas anteriores as acharam. As duas ressalvas
da rodada 2 (JSON `null`, limite 200) ficam resolvidas.

## Gate

`dotnet test api.Tests --logger "console;verbosity=normal"` em `00d439c` - 237 passed, 0 failed (as 44 provas listadas uma a uma)
`npm --prefix web run test` - 35 passed, 0 failed; as 3 provas web com `--reporter=verbose` - 3 passed
