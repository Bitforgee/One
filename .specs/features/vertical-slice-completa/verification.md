# Vertical slice completa verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 65adab5..45fba58 (fix desta rodada: 8bd4b5e..45fba58, só `api.Tests/OrdemDasRecusasTests.cs`; b2e7e79, 2aa8a9a, 0446817 e c9df15e são de outras features ou do roadmap, fora do escopo)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

A rodada 1 (`eda9c5e`, relatório em 8bd4b5e) deu FAIL num mutante só: F13, a troca do 409 (conversa
encerrada) pelo 400 (`matriculaId` inválido) no `TransferirConversa`, que passava pela suíte inteira. O
fix 45fba58 acrescenta dois testes HTTP em `OrdemDasRecusasTests`, sem tocar em código de produção:
`Transferir_conversa_encerrada_409_antes_de_400` e `Cadastro_400_antes_de_409` (setor, categoria, curso,
resposta pronta). Nesta rodada F13 morreu, e também a troca do `CriarRespostaPronta` (o lead não
injetado da rodada 1) e outras 3 trocas na mesma superfície. A ordem que os testes afirmam é a do código
da base em 65adab5, conferida linha a linha (abaixo), não a do código atual.

Escopo: o diff do fix e os vereditos que não foram PASS (F13, Test policy linha 1, a linha de Coverage
"ordem das recusas da conversa"). As provas rodaram por inteiro em 45fba58. Tudo o que não foi refeito
diz `carried from eda9c5e`.

Como foi rodado: worktree destacado em 45fba58 no scratchpad, PostgreSQL do compose (nada parado nem
reiniciado), uma falta por vez com `git checkout -- api` e porcelana do worktree vazia depois de cada uma.
Worktree removido no fim (`git worktree list` só mostra `D:/one-system`). A porcelana de `D:\one-system`
ganhou ` M web/src/index.css` desde a linha de base: é o builder do `interface-nova` editando `web/`;
esta verificação não escreveu nada fora do worktree e deste arquivo.

## Binding sources

Carried from eda9c5e. Não há binding source (profile `standard`, sem interface) e o fix não toca a interface.

## Checks

Verified at 45fba58: `dotnet test api.Tests --logger trx` (sob `timeout 900`) - 292 aprovados, 0 falhas
(290 da rodada 1 mais os 2 novos). Os 42 filtros `FullyQualifiedName~` do `checks.md` e os 2 testes
novos casam exatamente 1 teste cada no TRX, todos `Passed` (L-002 conferido). Scripts em 45fba58:
`asserts_preservados.py 65adab5`, `retratos_antes.py 65adab5`, `listas_fixas.py 65adab5`,
`msg0005_barra.sh`, `ca1502_barra.sh` exit 0; `dotnet build api -warnaserror:CA1502 --no-incremental`
exit 0 com 0 ocorrências; o `grep -E` do C31 exit 0. Citações: o único arquivo que mudou em `api/` e
`api.Tests/` desde eda9c5e é `OrdemDasRecusasTests.cs` (+41 linhas a partir da 78), então as citações
dele foram refeitas (C1, C18, C25, C26, C27) e as demais valem como estão.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | suítes da base passam em cada commit | `dotnet test api.Tests` 292/292 em 45fba58; e2e 11/11 carried from eda9c5e (o fix só toca `api.Tests/`; `git diff eda9c5e 45fba58 -- api web/e2e Dockerfile` vazio) | `api.Tests/OrdemDasRecusasTests.cs:230` - `Assert.True(r.StatusCode == HttpStatusCode.BadRequest, ...)` (suíte inteira); e2e `web/e2e/plataforma.spec.ts:20` - `expect(status).toBe(401)` | PASS |
| C2 | nenhuma asserção da base removida/alterada/pulada | `asserts_preservados.py 65adab5` exit 0 em 45fba58 ("0 problema(s)"); o fix só adiciona linhas | `.specs/features/refatoracao-solid/asserts_preservados.py:47` - `if adicionadas[texto] < n: problemas.append(...)` | PASS |
| C3 | retrato de 61 linhas igual à tabela viva | filtros `RetratoTests.Tabela_de_rotas_igual_a_da_base`, `SpaTests.Spa_em_slug_e_api_404_em_problem_json` 1 teste cada | `api.Tests/RetratoTests.cs:49` - `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva)`; `:37` `Assert.Equal(61, viva.Count)`; `api.Tests/SpaTests.cs:23` | PASS |
| C4 | retratos gravados com o código da base | `retratos_antes.py 65adab5` exit 0 em 45fba58 | `.specs/features/vertical-slice-completa/retratos_antes.py:32` - `if git("diff", "--name-only", base, adicao, "--", "api")` | PASS |
| C5 | 29 rotas `/admin` dão 403 com o detail | `RetratoTests.Admin_403_com_detail_nas_29_rotas`; `AdminTests.Sem_papel_admin_403` | `api.Tests/RetratoTests.cs:62` `Assert.Equal(29, rotas.Count)`; `:69-70` `Forbidden` e o detail | PASS |
| C6 | 8 corpos de erro iguais sem `traceId` | `RetratoTests.Corpos_de_erro_iguais_aos_da_base` | `api.Tests/RetratoTests.cs:119-120` - `Assert.Equal(8, gravados.Length)`; `Assert.Equal(gravados.Select(SemTraceId), vivos)` | PASS |
| C7 | pacotes 3.0.2, nenhum MediatR, CA1502 e MSG0005 como erro | `ArquiteturaTests.Mediator_referenciado` | `api.Tests/ArquiteturaTests.cs:340-347` - versões `"3.0.2"`, `Assert.Contains("MSG0005", comoErro)` | PASS |
| C8 | mensagem sem handler quebra com MSG0005 | `msg0005_barra.sh` exit 0 em 45fba58 | `.specs/features/vertical-slice-completa/msg0005_barra.sh:25` - `grep -q "error MSG0005"` | PASS |
| C9 | `IMediator` e `AcessoChamado` um por escopo | `MediatorTests.Um_mediator_por_escopo` | `api.Tests/MediatorTests.cs:17-20` - `Assert.Same`/`Assert.NotSame` | PASS |
| C10 | 30 rotas com id de outra instituição 404; ids no corpo 400 | `IsolamentoTests.Recurso_de_outra_instituicao_404`; `DocumentoTests.Documento_de_outra_instituicao_404`; `IsolamentoTests.Id_de_outra_instituicao_no_corpo_400` | `api.Tests/IsolamentoTests.cs:58,65` `NotFound`; `:109` `BadRequest`; `api.Tests/DocumentoTests.cs:356-358` | PASS |
| C11 | 58 mensagens, uma por arquivo | `ArquiteturaTests.Um_arquivo_por_caso_de_uso` | `api.Tests/ArquiteturaTests.cs:369-372` - `Assert.Equal(58, mensagens.Count)` | PASS |
| C12 | 58 handlers no arquivo da mensagem | `ArquiteturaTests.Um_handler_por_mensagem_no_mesmo_arquivo` | `api.Tests/ArquiteturaTests.cs:393-401` - `Assert.Equal(58, handlers.Count)` | PASS |
| C13 | 61 `Map*` | `ArquiteturaTests.Map_so_nos_casos_de_uso` | `api.Tests/ArquiteturaTests.cs:413-419` - `Assert.Equal(61, ...)` | PASS |
| C14 | fora do mediator; logout 204 | `ArquiteturaTests.Fora_do_mediator`; `SessaoTests.Logout_204_expira_cookie` | `api.Tests/ArquiteturaTests.cs:431`; `api.Tests/SessaoTests.cs:50-53` `NoContent` | PASS |
| C15 | conversa alheia: 404 mesmo com corpo inválido | `OrdemDasRecusasTests.Conversa_alheia_404_mesmo_com_corpo_invalido` | `api.Tests/OrdemDasRecusasTests.cs:31-34` - `NotFound`, `"Conversa não encontrada."`, conversa inalterada | PASS |
| C16 | sem matrícula ativa: 403 mesmo com corpo inválido | `OrdemDasRecusasTests.Sem_matricula_ativa_403_mesmo_com_corpo_invalido` | `api.Tests/OrdemDasRecusasTests.cs:49-50` - `Forbidden` e detail | PASS |
| C17 | conversa encerrada: 400 antes de 409 | `OrdemDasRecusasTests.Conversa_encerrada_400_antes_de_409` | `api.Tests/OrdemDasRecusasTests.cs:73-74` - `BadRequest` e `errors.<campo>` | PASS |
| C18 | id inexistente: 404 antes da validação em 8 rotas admin | `OrdemDasRecusasTests.Id_inexistente_404_mesmo_com_corpo_invalido` | `api.Tests/OrdemDasRecusasTests.cs:133-134` - `NotFound` e detail; `:138-139` versão de documento | PASS |
| C19 | nada de `HttpContext`; login, anexo, upload seguem | `ArquiteturaTests.Handler_sem_HttpContext`; `LoginTests.Login_valido_200_com_cookie`; `AnexoTests.Pdf_jpg_png_ate_10mb`; `DocumentoTests.Subir_pdf_201` | `api.Tests/ArquiteturaTests.cs:441-449`; `api.Tests/LoginTests.cs:20,29`; `api.Tests/EmailAnexoTests.cs:131`; `api.Tests/DocumentoTests.cs:134` | PASS |
| C20 | listas fixas não afrouxadas | `listas_fixas.py 65adab5` exit 0 em 45fba58 ("10 de 10 pares"); 4 filtros, 1 teste cada | `.specs/features/vertical-slice-completa/listas_fixas.py:46`; `api.Tests/ArquiteturaTests.cs:321` | PASS |
| C21 | 0 CA1502 no limite 10, barreira ativa | build com `-warnaserror:CA1502` exit 0, 0 ocorrências; `ca1502_barra.sh` exit 0; `ArquiteturaTests.Barreira_de_complexidade_configurada` | `.specs/features/refatoracao-solid/ca1502_barra.sh:27`; `api.Tests/ArquiteturaTests.cs:258` | PASS |
| C22 | SMTP fora: 202 e 1 `Error` com `InstituicaoId` em `One.Api.Email` | `PrimeiroAcessoTests.Smtp_fora_loga_na_categoria_Email` | `api.Tests/PrimeiroAcessoTests.cs:121-124` | PASS |
| C23 | `Estados(` só no `AgirNoChamado` | `ArquiteturaTests.Permissao_so_no_AgirNoChamado` | `api.Tests/ArquiteturaTests.cs:464-465` | PASS |
| C24 | 9 `IAcaoChamado`, 10 nomes; matrizes iguais | `ArquiteturaTests.Nove_acoes_do_chamado`; `TransicoesTests.Matriz_acao_estado`; `TransicoesTests.Matriz_acao_papel`; `ExtrasTests.Duplicado_por_aluno_403_e_em_fechado_409` | `api.Tests/ArquiteturaTests.cs:473,483`; `api.Tests/VisibilidadeTests.cs:180,183,205`; `api.Tests/ExtrasTests.cs:164,168` | PASS |
| C25 | chamado invisível: 404 nas 9 rotas | `OrdemDasRecusasTests.Acao_invisivel_404_mesmo_com_corpo_invalido`; `VisibilidadeTests.Atendente_de_outro_setor_404` | `api.Tests/OrdemDasRecusasTests.cs:187-188` - `NotFound`, `"Chamado não encontrado."`; `:190` `conferir()`; `api.Tests/VisibilidadeTests.cs:41` | PASS |
| C26 | papel que nunca pode: 403 em 9 pares | `OrdemDasRecusasTests.Acao_por_papel_errado_403_mesmo_com_corpo_invalido` | `api.Tests/OrdemDasRecusasTests.cs:209-210` - `Forbidden` e detail | PASS |
| C27 | corpo inválido em estado errado: 400 em 9 casos | `OrdemDasRecusasTests.Acao_com_corpo_invalido_em_estado_errado_400` | `api.Tests/OrdemDasRecusasTests.cs:230-231` - `BadRequest` e `conferir()` | PASS |
| C28 | 1 `SaveChanges` e 201/200 por ação | `AcoesDoChamadoTests.Uma_gravacao_e_status_por_acao` | `api.Tests/AcoesDoChamadoTests.cs:36-38` | PASS |
| C29 | `AgirNoChamado` só nas 9 ações | `MediatorTests.AgirNoChamado_so_nas_9_acoes` | `api.Tests/MediatorTests.cs:37,42,45` | PASS |
| C30 | concorrência e chave única seguem 409 | `ConcorrenciaTests.Segunda_alteracao_simultanea_409`; `TransferenciaTests.Transferencia_dupla_um_chamado_e_409` | `api.Tests/VisibilidadeTests.cs:238`; `api.Tests/TransferenciaTests.cs:145-146` | PASS |
| C31 | AD-019 active; AD-017 superada em parte | `grep -E` da prova exit 0 em 45fba58 | `.specs/STATE.md:25`; `.specs/STATE.md:23` | PASS |

Os dois testes novos (verified at 45fba58), julgados contra a ordem da base:

- `Transferir_conversa_encerrada_409_antes_de_400`: base `65adab5:api/Assistente/ConversaRotas.cs:120-124`
  é 404 -> 409 (`Desfecho is not null`) -> 400 (`Transferencia.MatriculaInvalida`). O teste encerra a
  conversa e manda `matriculaId = 999999`: `api.Tests/OrdemDasRecusasTests.cs:89` -
  `Assert.Equal(HttpStatusCode.Conflict, r.StatusCode)`; `:90` -
  `Assert.Equal("Esta conversa já foi encerrada.", await Detail(r))`; `:91` nenhum chamado criado.
- `Cadastro_400_antes_de_409`: base `65adab5:api/Administracao/CadastroRotas.cs:64-93`, cada `Validar*`
  devolve os 400 antes do `Repetido` (409). O teste monta os dois motivos ao mesmo tempo nos 4 e
  afirma o 400 e o campo: `api.Tests/OrdemDasRecusasTests.cs:114` -
  `Assert.True(r.StatusCode == HttpStatusCode.BadRequest, ...)`; `:115` -
  `...GetProperty("errors").TryGetProperty(campo, out _)` com `triagem`, `nome`, `setorCoordenacaoId`,
  `texto`. Os 3 `Created` de `:101-103` provam que o nome/título repetido existe de fato.

Nota de precisão (não muda o veredito): o `checks.md` não foi atualizado com o fix. A linha de Coverage
"ordem das recusas da conversa" ainda diz 7 casos e o claim e o filtro do C17
(`Conversa_encerrada_400_antes_de_409`) não alcançam `Transferir_conversa_encerrada_409_antes_de_400`
nem `Cadastro_400_antes_de_409`; os dois só rodam pela suíte inteira do C1. Os membros estão provados
(abaixo), mas convém que o dono do `checks.md` acrescente os 2 testes a um check e o membro ao conjunto.

## Coverage

Linhas recalculadas (verified at 45fba58) a partir do código da base em 65adab5, que é a autoridade
sobre a ordem (door 4: a ordem não muda).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| ordem das recusas da conversa (base: 8 posições) | `65adab5:api/Assistente/ConversaRotas.cs:62-126`: `NovaConversa` 403<400, `NovaMensagem` 404<400<409, `Avaliar` 404<400<409, `AtendimentoDireto` 403<400, `Transferir` 404<409<400 | 7 casos -> C15, C16, C17 (carried from eda9c5e, re-run verde) · `Transferir` 409 antes de 400 -> `Transferir_conversa_encerrada_409_antes_de_400` (`OrdemDasRecusasTests.cs:89-90`), F13 morto | - |
| 400 antes de 409 nos cadastros (4 alcançáveis) | `65adab5:api/Administracao/CadastroRotas.cs:64-93` (o `Validar` de cada entidade, hoje `Criar<Entidade>.Validar`, usado por `Criar*` e `Alterar*`) | setor `triagem` < repetido · categoria padrão renomeada < repetida · curso `setorCoordenacaoId` < repetido · resposta pronta `texto` < título repetido -> `Cadastro_400_antes_de_409` (`OrdemDasRecusasTests.cs:114-115`); F15-F18 mortos. Os outros 400 (`nome`/`titulo` inválido, `setorId` inexistente) não podem coexistir com o 409, porque `AdminRotas.Nome` exige não vazio e até o máximo e o repetido compara com nomes já válidos ou com o mesmo `setorId` | - |

Linhas carried from eda9c5e (o fix não tocou a autoridade de nenhuma; a suíte que as prova rodou verde
em 45fba58): rotas por grupo (61), anônimas (5), políticas de limite (5), `/api/admin/*` (29), corpos de
erro (8), rotas com `{id}`/`{numero}` (30), mensagens por fatia (58), handlers (58), `Map*` (61),
`IAcaoChamado` (9) e nomes (10), pipeline por mensagem (9 + 49), startup config (2), 404 antes da
validação no admin (8), ações 404/403/400/409 e gravação, exceções que viram 409 (2), barreiras,
pacotes e decisões. Nenhuma tinha membro sem prova na rodada 1.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide e é alcançado por HTTP: ordem do `AgirNoChamado` e de cada handler que recusa (re-judged at 45fba58) | `api/Chamados/AgirNoChamado.cs`, handlers com 2+ recusas (`Assistente/*.cs` incluindo `TransferirConversa.cs`, `Administracao/Criar*.cs`/`Alterar*.cs`, `Conhecimento/NovaVersaoDocumento.cs`) | um caso HTTP por rota × posição, com os dois motivos ao mesmo tempo | yes - `TransferirConversa` tem o caso 409-antes-de-400 da base; os 4 `Validar` de cadastro têm o caso 400-antes-de-409; F13 e F15-F18 mortos |
| Contrato HTTP: tabela de rotas e corpos de erro | `api.Tests/Retratos/*`, `RetratoTests.cs` | retrato gravado na base e comparado | yes - carried from eda9c5e; re-run verde em 45fba58 |
| Estrutura: um arquivo, um handler, um `Map`, pipeline só nas ações, sem `HttpContext` | `ArquiteturaTests.cs`, `MediatorTests.cs` | regra de texto/reflexão por membro | yes - carried from eda9c5e; re-run verde em 45fba58 |
| Instrumentação: o lambda de cada `Mapear` | os 58 `Mapear` | coberta por C1, C3, C10 | yes - carried from eda9c5e |

## Faults injected

Rodada 2, verified at 45fba58: uma falta por vez no worktree, prova mais estreita, `git checkout -- api`
e porcelana vazia depois de cada uma. Todas são trocas de ordem que mantêm o número de desvios (o
CA1502 limite 10 recusaria uma falta com desvio novo); todas compilaram e o teste rodou.

| Mutation | Location | Killed |
| --- | --- | --- |
| F13 transferir confere `matriculaId` (400) antes da conversa encerrada (409) | `api/Assistente/TransferirConversa.cs:20-22` | yes - `Transferir_conversa_encerrada_409_antes_de_400` (`OrdemDasRecusasTests.cs:89`: Expected `Conflict`, Actual `BadRequest`) |
| F15 resposta pronta confere o título repetido (409) antes do texto (400) | `api/Administracao/CriarRespostaPronta.cs:20-21` | yes - `Cadastro_400_antes_de_409` (`OrdemDasRecusasTests.cs:114`: "/api/admin/respostas-prontas: 409") |
| F16 setor confere o nome repetido (409) antes da regra de triagem (400) | `api/Administracao/CriarSetor.cs:20-22` | yes - `Cadastro_400_antes_de_409` ("/api/admin/setores: 409") |
| F17 categoria confere o nome repetido (409) antes da renomeação da padrão (400) | `api/Administracao/CriarCategoria.cs:19-21` | yes - `Cadastro_400_antes_de_409` ("/api/admin/categorias/1: 409") |
| F18 curso confere o nome repetido (409) antes do setor de coordenação (400) | `api/Administracao/CriarCurso.cs:19-20` | yes - `Cadastro_400_antes_de_409` ("/api/admin/cursos: 409") |

Carried from eda9c5e (código de produção igual em 45fba58, então valem): F1, F1b, F2, F3, F3b, F4, F14,
F11, F11b, F5, F6, F7, F7b, F8, F9, F10, F12, todos mortos na rodada 1. O F13 da rodada 1, que não
morria, foi re-injetado acima.

## Gate

`dotnet test api.Tests` em 45fba58 - 292 passed, 0 failed (44 filtros, 1 teste cada); scripts
`asserts_preservados.py`, `retratos_antes.py`, `listas_fixas.py`, `msg0005_barra.sh`, `ca1502_barra.sh`
exit 0; build CA1502 0 ocorrências. `npx playwright test` 11 passed carried from eda9c5e (não re-rodado:
o fix só toca `api.Tests/`).

## Lessons

Nenhuma lição nova. O sinal desta feature (F13) já está em `.specs/lessons.json` como L-023, gravado
pela rodada 1; esta rodada é PASS sem mutante vivo nem membro sem prova. A nota de precisão acima é
sobre o `checks.md` não ter acompanhado o fix, não sobre um valor que um check deixou vago.
