# Vertical slice completa verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 65adab5..eda9c5e (b2e7e79 is `interface-nova` docs, out of scope)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Todas as 31 checks têm prova verde em `eda9c5e` e asserção localizada. O FAIL vem de um mutante que
sobreviveu à suíte inteira (F13): o `TransferirConversa` pode trocar a ordem 404 -> 409 -> 400 da base
para 404 -> 400 -> 409 sem que nenhum teste note. É a linha 1 do `Test policy` ("a ordem de cada
handler que recusa") e um membro que o `Coverage` deixou de fora (o conjunto "ordem das recusas da
conversa" tem 7 casos e não tem o transferir, embora a evidência do próprio `checks.md` cite
`ConversaRotas.cs:62-121`, que o contém).

Como foi rodado: worktree destacado em `eda9c5e` no scratchpad, PostgreSQL do compose (bancos
`one_teste_*` próprios de cada fixture), imagem `one-vsa-verify` construída do worktree e servida em
`:8081` na rede `one-system_default` com o ambiente do serviço `api`; Playwright do `web/` do worktree
com `E2E_URL=http://localhost:8081`. Worktrees, contêiner e imagem removidos no fim; `git status` de
`D:\one-system` só difere da linha de base pelos commits e arquivos do `interface-nova` (outro builder).

## Binding sources

No binding source - profile `standard`, sem interface (o `web/` não muda nesta feature). Step 1 não roda.

## Checks

Rodada única da suíte em `eda9c5e`: `dotnet test api.Tests --logger trx` - 290 aprovados, 0 falhas.
Cada um dos 42 filtros `FullyQualifiedName~` do `checks.md` casa exatamente 1 teste do TRX, todos
`Passed` (L-002 conferido). Caminhos relativos à raiz em `eda9c5e`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | suítes da base passam em cada commit | `dotnet test api.Tests` 290/290 em eda9c5e; também em 9ef0f19 (271), d2036d4 (273), ed2c414 (282), e4da548 (282), d1a1a5c (282), d84707e (290); `npx playwright test` 11/11 contra a imagem de eda9c5e | `api.Tests/OrdemDasRecusasTests.cs:189` - `Assert.True(r.StatusCode == HttpStatusCode.BadRequest, ...)` (suíte inteira; e2e `web/e2e/plataforma.spec.ts:20` - `expect(status).toBe(401)`) | PASS |
| C2 | nenhuma asserção da base removida/alterada/pulada | `python .specs/features/refatoracao-solid/asserts_preservados.py 65adab5` exit 0 em eda9c5e e em cada um dos 6 commits; `git diff -U0 65adab5 eda9c5e -- api.Tests` não tem nenhuma linha removida | `.specs/features/refatoracao-solid/asserts_preservados.py:47` - `if adicionadas[texto] < n: problemas.append(...)` | PASS |
| C3 | retrato de 61 linhas igual à tabela viva | filtro `RetratoTests.Tabela_de_rotas_igual_a_da_base` 1 teste; `SpaTests.Spa_em_slug_e_api_404_em_problem_json` 1 teste | `api.Tests/RetratoTests.cs:49` - `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva)`; `:37` `Assert.Equal(61, viva.Count)`; `:40-47` fallbacks, anônimas e políticas; `api.Tests/SpaTests.cs:23` `Assert.Equal("application/problem+json", ...)` | PASS |
| C4 | retratos gravados com o código da base | `python .specs/features/vertical-slice-completa/retratos_antes.py 65adab5` exit 0; independente: `RetratoTests` rodado num worktree em 9ef0f19 (`git diff 65adab5 9ef0f19 -- api` vazio) 3/3 verdes, e `RetratoTests.cs`/`Retratos/` iguais entre 9ef0f19 e eda9c5e | `.specs/features/vertical-slice-completa/retratos_antes.py:32` - `if git("diff", "--name-only", base, adicao, "--", "api")` | PASS |
| C5 | 29 rotas `/admin` dão 403 com o detail para aluno e atendente | `RetratoTests.Admin_403_com_detail_nas_29_rotas`; `AdminTests.Sem_papel_admin_403` | `api.Tests/RetratoTests.cs:62` `Assert.Equal(29, rotas.Count)`; `:69-70` `Forbidden` e `Assert.Equal("Só administradores podem usar esta área.", ...)` | PASS |
| C6 | 8 corpos de erro iguais byte a byte sem `traceId` | `RetratoTests.Corpos_de_erro_iguais_aos_da_base` | `api.Tests/RetratoTests.cs:119-120` - `Assert.Equal(8, gravados.Length)`; `Assert.Equal(gravados.Select(SemTraceId), vivos)`; status por linha em `:106` | PASS |
| C7 | pacotes 3.0.2, nenhum MediatR, CA1502 e MSG0005 como erro | `ArquiteturaTests.Mediator_referenciado` | `api.Tests/ArquiteturaTests.cs:340-347` - versões `"3.0.2"`, `PrivateAssets` `"all"`, `DoesNotContain(... StartsWith("MediatR", OrdinalIgnoreCase))`, `Assert.Contains("MSG0005", comoErro)` | PASS |
| C8 | mensagem sem handler quebra o build com MSG0005 | `bash .specs/features/vertical-slice-completa/msg0005_barra.sh` exit 0 ("ok: sem handler quebra com MSG0005...") | `.specs/features/vertical-slice-completa/msg0005_barra.sh:25` - `if [ "$codigo" -eq 0 ] \|\| ! grep -q "error MSG0005"` | PASS |
| C9 | `IMediator` e `AcessoChamado` um por escopo | `MediatorTests.Um_mediator_por_escopo` | `api.Tests/MediatorTests.cs:17-20` - `Assert.Same(...)` no mesmo escopo, `Assert.NotSame(...)` entre escopos | PASS |
| C10 | 30 rotas com id de outra instituição dão 404; ids no corpo dão 400 | `IsolamentoTests.Recurso_de_outra_instituicao_404`; `DocumentoTests.Documento_de_outra_instituicao_404`; `IsolamentoTests.Id_de_outra_instituicao_no_corpo_400` | `api.Tests/IsolamentoTests.cs:58,65` - `Assert.True(r.StatusCode == HttpStatusCode.NotFound, ...)`; `:109` `Assert.All(respostas, r => Assert.Equal(HttpStatusCode.BadRequest, ...))`; `api.Tests/DocumentoTests.cs:356-358` | PASS |
| C11 | 58 mensagens, uma por arquivo, contagem por fatia | `ArquiteturaTests.Um_arquivo_por_caso_de_uso` | `api.Tests/ArquiteturaTests.cs:369-372` - `Assert.Equal(58, mensagens.Count)` e contagem por fatia; `:380` uma declaração por arquivo | PASS |
| C12 | 58 handlers `<X>Handler` no arquivo da mensagem | `ArquiteturaTests.Um_handler_por_mensagem_no_mesmo_arquivo` | `api.Tests/ArquiteturaTests.cs:393-401` - `Assert.Equal(58, handlers.Count)`; `Assert.Equal(mensagem.Name + "Handler", handler.Name)` | PASS |
| C13 | 61 `Map*`: 1 por caso, logout, 2 fallbacks | `ArquiteturaTests.Map_so_nos_casos_de_uso` | `api.Tests/ArquiteturaTests.cs:413-419` - `Assert.Equal(61, ...)`, 1 por caso, `[".MapFallback(", ".MapFallbackToFile("]`, `.MapPost("/auth/logout"` | PASS |
| C14 | fora do mediator sem `IMediator`/`ISender`/`using Mediator`; logout 204 | `ArquiteturaTests.Fora_do_mediator`; `SessaoTests.Logout_204_expira_cookie` | `api.Tests/ArquiteturaTests.cs:431` - `Assert.False(codigo.Contains(proibido), ...)`; `api.Tests/SessaoTests.cs:50-53` `NoContent`, cookie `one.auth=` expirado | PASS |
| C15 | conversa alheia: 404 mesmo com corpo inválido | `OrdemDasRecusasTests.Conversa_alheia_404_mesmo_com_corpo_invalido` | `api.Tests/OrdemDasRecusasTests.cs:31-34` - `NotFound`, `Assert.Equal("Conversa não encontrada.", ...)`, conversa inalterada | PASS |
| C16 | sem matrícula ativa: 403 mesmo com corpo inválido | `OrdemDasRecusasTests.Sem_matricula_ativa_403_mesmo_com_corpo_invalido` | `api.Tests/OrdemDasRecusasTests.cs:49-55` - `Forbidden` e os 2 details; `Assert.Equal(0, ... Conversas.CountAsync())` | PASS |
| C17 | conversa encerrada: 400 antes de 409 | `OrdemDasRecusasTests.Conversa_encerrada_400_antes_de_409` | `api.Tests/OrdemDasRecusasTests.cs:73-74` - `BadRequest` e `errors.<campo>` | PASS |
| C18 | id inexistente: 404 antes da validação em 8 rotas admin | `OrdemDasRecusasTests.Id_inexistente_404_mesmo_com_corpo_invalido` | `api.Tests/OrdemDasRecusasTests.cs:92-93,97-98` - `NotFound` e detail por rota | PASS |
| C19 | nada de `HttpContext` em mensagem/handler; login, anexo e upload seguem | `ArquiteturaTests.Handler_sem_HttpContext`; `LoginTests.Login_valido_200_com_cookie`; `AnexoTests.Pdf_jpg_png_ate_10mb`; `DocumentoTests.Subir_pdf_201` | `api.Tests/ArquiteturaTests.cs:441-449`; `api.Tests/LoginTests.cs:20,29` `OK` e cookie `one.auth=`; `api.Tests/EmailAnexoTests.cs:131` `Created`; `api.Tests/DocumentoTests.cs:134` `Created` | PASS |
| C20 | listas fixas do `ArquiteturaTests` não afrouxadas | `python .specs/features/vertical-slice-completa/listas_fixas.py 65adab5` exit 0 ("10 de 10 pares"); 4 filtros, 1 teste cada | `.specs/features/vertical-slice-completa/listas_fixas.py:46` - `elif not ph <= pb:`; `api.Tests/ArquiteturaTests.cs:321` `Assert.Equal(ReferenciasEntreFatias.Order(), usadas.Order())`; `:279`, `:295`, `:78` | PASS |
| C21 | 0 CA1502 no limite 10, barreira ativa | `dotnet build api -warnaserror:CA1502 --no-incremental` 0 ocorrências; `bash .specs/features/refatoracao-solid/ca1502_barra.sh` exit 0; `ArquiteturaTests.Barreira_de_complexidade_configurada` | `.specs/features/refatoracao-solid/ca1502_barra.sh:27`; `api.Tests/ArquiteturaTests.cs:258` - `Assert.Contains("CA1502(Method): 10", ...)` | PASS |
| C22 | SMTP fora: 202 e 1 `Error` com `InstituicaoId` na categoria `One.Api.Email` | `PrimeiroAcessoTests.Smtp_fora_loga_na_categoria_Email` | `api.Tests/PrimeiroAcessoTests.cs:121-124` - `Assert.Equal(HttpStatusCode.Accepted, ...)`; `Assert.Single(... Error && InstituicaoId == i.Id)`; `Assert.Equal("One.Api.Email", log.Categoria)` | PASS |
| C23 | `Estados(` só no arquivo do `AgirNoChamado` | `ArquiteturaTests.Permissao_so_no_AgirNoChamado` | `api.Tests/ArquiteturaTests.cs:464-465` - `Assert.Single(chamaEstados)`; `Assert.Contains("class AgirNoChamado<", ...)` | PASS |
| C24 | 9 `IAcaoChamado`, 10 nomes de ação; matrizes iguais | `ArquiteturaTests.Nove_acoes_do_chamado`; `TransicoesTests.Matriz_acao_estado`; `TransicoesTests.Matriz_acao_papel`; `ExtrasTests.Duplicado_por_aluno_403_e_em_fechado_409` | `api.Tests/ArquiteturaTests.cs:473,483` - `Assert.Equal(9, acoes.Count)`; `Assert.Equal(["assumir", ... "responder"], nomes.Order())`; `api.Tests/VisibilidadeTests.cs:180,183,205`; `api.Tests/ExtrasTests.cs:164,168` | PASS |
| C25 | chamado invisível: 404 nas 9 rotas com corpo inválido | `OrdemDasRecusasTests.Acao_invisivel_404_mesmo_com_corpo_invalido`; `VisibilidadeTests.Atendente_de_outro_setor_404` | `api.Tests/OrdemDasRecusasTests.cs:146-149` - `NotFound`, `"Chamado não encontrado."`, `conferir()`; `api.Tests/VisibilidadeTests.cs:41` | PASS |
| C26 | papel que nunca pode: 403 em 9 pares | `OrdemDasRecusasTests.Acao_por_papel_errado_403_mesmo_com_corpo_invalido` | `api.Tests/OrdemDasRecusasTests.cs:168-171` - `Forbidden`, `"Seu papel neste chamado não permite esta ação."` | PASS |
| C27 | corpo inválido em estado errado: 400, não 409, em 9 casos | `OrdemDasRecusasTests.Acao_com_corpo_invalido_em_estado_errado_400` | `api.Tests/OrdemDasRecusasTests.cs:189-190` - `BadRequest` e chamado inalterado | PASS |
| C28 | 1 `SaveChanges` e 201/200 por ação | `AcoesDoChamadoTests.Uma_gravacao_e_status_por_acao` | `api.Tests/AcoesDoChamadoTests.cs:36-38` - status por ação, `f.Gravacoes.Total == 1`, `numero` da rota | PASS |
| C29 | `AgirNoChamado` só nas 9 ações | `MediatorTests.AgirNoChamado_so_nas_9_acoes` | `api.Tests/MediatorTests.cs:37,42,45` - `Assert.Single(behaviors)` do tipo `AgirNoChamado<X,T>`, `behaviors.Count == 0`, `Assert.Equal((9, 49), ...)` | PASS |
| C30 | concorrência e chave única seguem 409 | `ConcorrenciaTests.Segunda_alteracao_simultanea_409`; `TransferenciaTests.Transferencia_dupla_um_chamado_e_409` | `api.Tests/VisibilidadeTests.cs:238` - `[OK, Conflict]`; `api.Tests/TransferenciaTests.cs:145-146` - `[Created, Conflict]` e 1 chamado | PASS |
| C31 | AD-019 active; AD-017 superada em parte | o `grep -E` da prova exit 0 | `.specs/STATE.md:25` (AD-019 `active`) e `.specs/STATE.md:23` (`superseded by AD-019`) | PASS |

Settled mid-build, julgados:

- (1) C3, fallbacks achados pela `Order` `int.MaxValue`: continua provado. A comparação linha a linha
  das 61 linhas (`RetratoTests.cs:49`) prende método, padrão e ordem de todos, incluindo
  `GET,HEAD {*path:nonfile}`; o retrato bate com o código da base (rodado em 9ef0f19). F1b mostra
  que a comparação com o arquivo falha sozinha.
- (2) C22, um só `Error` com `InstituicaoId`: continua provado. O `Error` do EF na partida não leva
  `InstituicaoId`; `Assert.Single` falha se o handler logar duas vezes, e F6 (categoria trocada) morreu.
  Nota de precisão, não lacuna: o claim diz "1 log de nível Error", e o processo grava 2 `Error`; o que
  vale é 1 `Error` com `InstituicaoId`.

## Coverage

Membros tirados de `api.Tests/Retratos/rotas.txt` (provado igual à tabela da base ao rodar
`RetratoTests` em 9ef0f19), do código em `65adab5` (ordem das recusas) e do código em `eda9c5e`
(mensagens, handlers, `Map*`, `IAcaoChamado`, `PermissoesChamado`).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| rotas por grupo (59 + 2) | `rotas.txt` linhas 1-61 | auth 6, instituição 1, conversa 7, consulta 4, ações 9, artigo 6, documento 5, indicadores 1, usuários 4, importação 1, regras 3, cadastros 12, fallbacks 2 -> C3 (linha a linha) | - |
| rotas anônimas (5) | coluna `anonimo=True` | login, primeiro-acesso, definir-senha, logout, instituicoes/{slug} -> C3 `RetratoTests.cs:42` | - |
| políticas de limite (5) | coluna `limite=` | `auth` 2, `mensagens` 3 -> C3 `RetratoTests.cs:46-47` | - |
| rotas `/api/admin/*` (29) | linhas 31-59 | as 29, lidas do `EndpointDataSource`, para aluno e atendente -> C5 | - |
| corpos de erro (8) | `erros.txt` | 400, 401, 403, 404, 409, 413, 415, 429 -> C6 | - |
| rotas com `{id}`/`{numero}` (30) | `rotas.txt`, padrões com `{` exceto `{slug}` e fallbacks | conversa 5, chamado 10, anexo 1, versão de artigo 1, versão de documento 1, usuários 2, cadastros 4, regras 1, artigos admin 3, documentos admin 2 -> C10 (`IsolamentoTests.cs:36-53` + `VisibilidadeTests.cs:16-26` + `DocumentoTests.cs:356-358`) | - |
| mensagens por fatia (58) | `record ... : IRequest<`/`IAcaoChamado` em `api/` | Acesso 6, Assistente 7, Chamados 13, Conhecimento 11, Indicadores 1, Administracao 20, Instituicoes 0 -> C11 | - |
| handlers (58) | `IRequestHandler<` em `api/` | 58 -> C12 | - |
| chamadas `Map*` (61) | grep em `api/` | 58 casos + logout (`Acesso/AuthRotas.cs:21`) + 2 em `Program.cs` -> C13 | - |
| `IAcaoChamado` (9) e nomes de ação (10) | `Acao =>` em `api/Chamados/*.cs`; chaves de `PermissoesChamado.cs:17-27` | 9 tipos, 10 nomes -> C24 | - |
| pipeline por mensagem (9 + 49) | idem | -> C29 | - |
| startup config (2 lugares) | `api/Program.cs:62-63`; `api.Tests/Infra/OneFactory.cs` não toca mediator nem `AcessoChamado` (grep vazio) | -> C9, C29 | - |
| ordem das recusas da conversa (base: `ConversaRotas.cs` em 65adab5, 8 posições) | `NovaConversa` 403<400, `NovaMensagem` 404<400<409, `Avaliar` 404<400<409, `AtendimentoDireto` 403<400, `Transferir` 404<409<400 | 7 casos -> C15, C16, C17 | `Transferir`: 409 (conversa encerrada) antes de 400 (`matriculaId` inválido) - nenhum teste; F13 sobreviveu à suíte inteira |
| 404 antes da validação no admin (8) | handlers `Alterar*`, `NovaVersaoDocumento` | -> C18 | - |
| ações: 404/403/400/409 e gravação (10 + 9 + 9 + 11) | `AgirNoChamado.cs:29-39` | -> C25, C26, C27, C28 | - |
| exceções que viram 409 (2) | `Problemas.cs:10-11` | concorrência, chave única -> C30 | - |
| barreiras do build (2) / pacotes (3) / decisões (2) | `One.Api.csproj`, `CodeMetricsConfig.txt`, `STATE.md` | -> C7, C8, C21, C31 | - |

Lead não injetado (mesma classe, fora do conjunto): `CriarRespostaPronta` valida o texto (400) antes
do título repetido (409); não achei teste com os dois inválidos ao mesmo tempo.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide e é alcançado por HTTP: ordem do `AgirNoChamado` e de cada handler que recusa | `api/Chamados/AgirNoChamado.cs`, os handlers com 2+ recusas (`Assistente/*.cs`, `Administracao/Alterar*.cs`, `Conhecimento/NovaVersaoDocumento.cs`...) | um caso HTTP por rota × posição, com corpo inválido | no - `Assistente/TransferirConversa.cs` (404 -> 409 -> 400 na base) sem caso; F13 sobreviveu |
| Contrato HTTP: tabela de rotas e corpos de erro | `api.Tests/Retratos/*`, `RetratoTests.cs` | retrato gravado na base e comparado | yes - 61 linhas e 8 corpos; retrato confirmado no código da base; F1, F1b, F2 mortos |
| Estrutura: um arquivo, um handler, um `Map`, pipeline só nas ações, sem `HttpContext` | `ArquiteturaTests.cs`, `MediatorTests.cs` | regra de texto/reflexão por membro | yes - C11-C14, C19, C23, C24, C29 por membro; F3b e F10 mortos (mais as faltas do construtor) |
| Instrumentação: o lambda de cada `Mapear` | os 58 `Mapear` | nenhuma própria (C1, C3, C10) | yes - F1 e F1b (lambda/rota) mortos pelo C3 |

## Faults injected

Uma de cada vez no worktree em `eda9c5e`, prova mais estreita, e `git checkout -- api api.Tests`
depois de cada uma (porcelana limpa conferida). As faltas de script (F4, F11, F11b, F14) foram
commits descartáveis no worktree destacado, desfeitos com `git reset --hard eda9c5e`. O limite de 5 do
procedimento foi excedido a pedido do orquestrador, para cobrir as superfícies que o construtor não
atacou.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 tirar `.RequireRateLimiting("auth")` do primeiro acesso | `api/Acesso/PrimeiroAcesso.cs:10` | yes - `RetratoTests.Tabela...` (`RetratoTests.cs:46`) |
| F1b `{id:long}` -> `{id}` em `GET /conversas` (só o arquivo do retrato vê) | `api/Assistente/VerConversa.cs:11` | yes - `RetratoTests.cs:49`, linha 10 do retrato |
| F2 detail do 415 "nem PNG" -> "ou PNG" | `api/Chamados/ResponderChamado.cs:36` | yes - `RetratoTests.Corpos...` (`RetratoTests.cs:120`) |
| F3 tirar `MSG0005` do `WarningsAsErrors` | `api/One.Api.csproj:9` | yes - `msg0005_barra.sh` exit 1 ("não quebrou o build com MSG0005") |
| F3b mesma mutação | `api/One.Api.csproj:9` | yes - `ArquiteturaTests.Mediator_referenciado` |
| F4 par novo `("Acesso","Chamados")` em `ReferenciasEntreFatias` (commit) | `api.Tests/ArquiteturaTests.cs:302` | yes - `listas_fixas.py` exit 1 ("pares novos em HEAD") |
| F14 linha do `rotas.txt` mudada num commit posterior | `api.Tests/Retratos/rotas.txt:10` | yes - `retratos_antes.py` exit 1 ("mudou depois de 9ef0f19") |
| F11 `[Fact(Skip = "x")]` num teste da base (commit) | `api.Tests/LoginTests.cs:10` | yes - `asserts_preservados.py` exit 1 ("pulo adicionado") |
| F11b `Assert.Equal(u.Id, ...)` afrouxado para `Assert.NotEqual(0L, ...)` (commit) | `api.Tests/LoginTests.cs:22` | yes - `asserts_preservados.py` exit 1 ("asserção removida ou alterada") |
| F5 limite `CA1502(Method): 10` -> `11` | `api/CodeMetricsConfig.txt:1` | yes - `ca1502_barra.sh` exit 1 |
| F6 `ILogger<Email>` -> `ILogger<PrimeiroAcessoHandler>` | `api/Acesso/PrimeiroAcesso.cs:13` | yes - `Smtp_fora_loga_na_categoria_Email` (`PrimeiroAcessoTests.cs:124`) |
| F7 behavior genérico que embrulha toda exceção, depois do `AgirNoChamado` | `api/Program.cs:62` | yes - `Transferencia_dupla_um_chamado_e_409` (500 em vez de 409); a concorrência do resolver não passa por ele (o `SaveChanges` está no `AgirNoChamado`) |
| F7b o mesmo behavior antes do `AgirNoChamado` | `api/Program.cs:62` | yes - `Segunda_alteracao_simultanea_409` (`[OK, InternalServerError]`) |
| F8 `VerChamadoHandler` usa o `OneDb` de outro escopo (`IServiceScopeFactory`), não o filtrado pelo `Sessao.Validar` (AD-008 door 16) | `api/Chamados/VerChamado.cs:12-16` | yes - pela suíte (C1: `VisibilidadeTests.Detalhe_do_aluno_sem_resumo`, `DocumentoTests.Fonte_documento_no_detalhe` e outros, 404 no próprio chamado); a prova do C10 sozinha passa, porque o `OneDb` sem `InstituicaoAtual` falha fechado (vê nada) |
| F9 segundo `SaveChangesAsync` no handler do resolver | `api/Chamados/ResolverChamado.cs:28` | yes - `AcoesDoChamadoTests` ("resolver: 2 gravações") |
| F10 `using Mediator;` no `Sessao.cs` | `api/Sessao.cs:7` | yes - `ArquiteturaTests.Fora_do_mediator` |
| F12 atendimento direto valida a descrição antes do 403 | `api/Assistente/AtendimentoDireto.cs:19-21` | yes - `Sem_matricula_ativa_403...` (`BadRequest` em vez de `Forbidden`) |
| F13 transferir confere `matriculaId` (400) antes da conversa encerrada (409) | `api/Assistente/TransferirConversa.cs:20-22` | no - survived: suíte inteira 290/290 verde |

## Gate

`dotnet test api.Tests` em eda9c5e - 290 passed, 0 failed (42 filtros de prova, 1 teste cada);
`npx playwright test` contra `one-vsa-verify` em `:8081` - 11 passed, 0 failed; scripts
`asserts_preservados.py`, `retratos_antes.py`, `listas_fixas.py`, `msg0005_barra.sh`,
`ca1502_barra.sh` exit 0.

## Ranked gaps

1. Ordem de recusas do `POST /api/conversas/{id}/transferir` sem prova (404 -> 409 -> 400 da base): mutante F13 sobrevive à suíte inteira - Test policy linha 1, door 4, Coverage "ordem das recusas da conversa" - `api/Assistente/TransferirConversa.cs:20-22`. Fix sugerido: um caso em `OrdemDasRecusasTests` com conversa encerrada e `matriculaId` inválido esperando 409 (o código atual já está certo; falta o teste).
