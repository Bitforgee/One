# MCP do One verification

**Verdict**: FAIL
**Profile**: ui
**Diff range**: c6b6c88..312181d
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Resumo: 40 de 41 checks têm prova que roda e afirma o valor definido; C9 tem uma linha da lista de 13 motivos de `401` (hash desconhecido) que nenhum teste exercita, e C41 não rodou o `crapper` (bloqueado pelo Application Control, AD-044). 3 mutantes sobreviveram. Nenhum defeito de comportamento do produto foi reproduzido; há 2 observações de baixa gravidade em `Defeitos e observações do produto`.

Executado em 10/11/2026 sobre `HEAD` = `312181d`. Postgres, MinIO e Mailpit do compose estavam no ar. A árvore rastreada ficou limpa depois das injeções (`git status --short` mostra só os `demo-live-*.png` e `web/apresentacao/*` do usuário, ignorados por instrução).

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `plan.md` (Surface, Landing, AC 1-35) é a única fonte vinculante; não há design/mock nem URL marcada como vinculante | sim - lido inteiro e comparado com `checks.md` e com `web/src/administracao/Mcp.tsx`, `Integracoes.tsx`, `AbaIntegracao.tsx` | nenhuma: rótulos, validades, textos e comandos dos AC 28-35 coincidem com as strings de `Mcp.tsx` e com as asserções de `mcp.test.tsx` | arranjo da tela (ver abaixo): nenhum check afirma quantas regiões a aba tem nem a ordem delas |
| SDK C# do MCP / documentação do Claude Code (Sources do plano) | não aberto - são referências de pesquisa, não decisão de tela; a decisão que importa (modo `Stateless`) é afirmada por `ArquiteturaTests.cs:393-395` e `Program.cs:90` | n/a | - |

Navegador: não abri o app (API + admin semeado + Playwright não eram baratos de subir). A tela foi verificada só pelos testes Vitest e pela leitura do código.

### Tela `Integrações › MCP` (AC 28-35), enumerada de `Mcp.tsx` / `Integracoes.tsx`

Autoridade do conjunto: os AC 28-35 do plano (não o código). Regiões renderizadas, em ordem, dentro de `TabsContent value="mcp"` (`Integracoes.tsx:31-40`), largura `max-w-4xl` quando a aba é `mcp` (`Integracoes.tsx:16`):

| # | Região / elemento (código) | AC | Check que o alcança |
| --- | --- | --- | --- |
| 0 | `TabsTrigger` `MCP` sem selo (`Integracoes.tsx:19`) | 28 | C28 `mcp.test.tsx:32-33`, C36 `integracoes.test.tsx:33` |
| 1 | parágrafo de introdução (`Integracoes.tsx:33`) | - | nenhum (texto livre; o plano não fixa o texto) |
| 2 | `Url` "URL do servidor" + botão `Copiar` (`Mcp.tsx:154`) | 28 | C28 `mcp.test.tsx:31,34` |
| 3 | seção `Tokens`: tabela com 8 colunas `Nome, Dono, Final, Criado, Vence, Último uso, Estado, ""` (`Mcp.tsx:25,155-164`) | 28 | C28 `mcp.test.tsx:35-38` |
| 4 | linha: nome+`Detalhe`, dono, `…final`, criado, vence, último uso (ou `Nunca`), `Badge` do estado, botão `Revogar` só em `ATIVO` (`Mcp.tsx:31-60`, condição em `:52`) | 28, 31 | C28 `:36-38`, C31 `:94-96,110` |
| 5 | vazio: `Nenhum token ainda.` (`Mcp.tsx:26`) | 32 | C32 `mcp.test.tsx:118` |
| 6 | seção `Novo token`: painel `Token criado` (aviso, `Url` do token, `Url` do comando, `Fechar`) acima do formulário (`Mcp.tsx:62-73,90-126`) | 29, 30 | C29 `:59-64`, C30 `:79-82` |
| 7 | formulário: `Nome` (aria-invalid + erro de campo), `Validade` com 3 opções e 90 por padrão, `ErroDe` acima do botão, botão `Criar token` (`Mcp.tsx:97-122`) | 29, 34 | C29 `:52-54`, C34 `:146-156` |
| 8 | seção `Como conectar`: comando com `<seu-token>`, JSON `mcp.json`, frase do OAuth (`Mcp.tsx:128-139`) | 35 | C35 `mcp.test.tsx:163-166` |
| 9 | diálogo `Confirmar` "Revogar o token «nome»?" com `Cancelar`/`Revogar` (`Mcp.tsx:168-181`) | 31 | C31 `:99-105` |
| 10 | esqueleto durante o `GET` e erro com `Tentar de novo` (`AbaIntegracao.tsx:8-24`) | 33 | C33 `:127,133-135` |

Elementos que o código renderiza e o plano não desenha: o parágrafo de introdução (1), o cabeçalho de seção `Tokens`/`Novo token` e o `Detalhe` da primeira célula (o resumo mobile). Nenhum contradiz um AC; são acréscimos aditivos.

Arranjo: o plano fixa a *presença* de URL, tabela, painel do token e bloco "Como conectar" (AC 28, 29, 35) mas não a ordem nem a divisão em regiões, e nenhum check afirma essas coisas. O código tem 4 regiões nomeadas (`URL`, `Tokens`, `Novo token`, `Como conectar`) em coluna única, com o painel `Token criado` *dentro* de `Novo token` e *acima* do formulário. Nada do que há em `mcp.test.tsx` quebraria se o painel fosse para baixo do formulário ou o bloco "Como conectar" fosse para o topo. Sem um design que fixe a composição isto é uma lacuna de precisão dos checks, não uma contradição. Não existe cláusula genérica de "fidelidade visual não provada" em `checks.md` (nenhuma isenção em branco).

## Checks

Comandos de execução (uma invocação por alvo, cada teste nomeado aparece individualmente no TRX):

- API: `dotnet test One.Api.Tests --no-build --filter "FullyQualifiedName~McpAdminTests|FullyQualifiedName~McpAcessoTests|FullyQualifiedName~McpFerramentasTests|FullyQualifiedName~TokenMcpDominioTests|FullyQualifiedName~ArquiteturaTests" --logger "trx;LogFileName=v.trx"` - exit 0, `Aprovado!  – Com falha: 0, Aprovado: 100, Total: 100`. Lista de nomes lida do TRX (todos `Passed`).
- Web: `npm --prefix web test -- --run src/administracao/mcp.test.tsx src/administracao/integracoes.test.tsx --reporter=verbose` - exit 0, `Test Files 2 passed`, `Tests 12 passed` (cada `-t` dos checks aparece com ✓).
- Web, suíte inteira: `npm --prefix web test -- --run` - exit 0, `Test Files 69 passed`, `Tests 646 passed`.
- `npm --prefix web run build` - exit 0 (`precache 11 entries`, `files generated`).
- `dotnet build One.slnx` - exit 0, `0 Aviso(s)`, `0 Erro(s)` (CA1502 ativo como erro: ele derrubou um dos meus mutantes por complexidade 11, ver `Faults injected`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `201`, 6 chaves, formato do token, `final`, 90 dias, só o hash gravado | `dotnet test ... --filter "FullyQualifiedName~McpAdminTests.Criar_devolve_o_token_uma_vez_e_grava_so_o_hash"` exit 0 (1 passed) | `McpAdminTests.cs:35` `Assert.Equal(HttpStatusCode.Created, r.StatusCode)`; `:37` `Assert.Equal(["id","nome","token","final","criadoEm","expiraEm"], j.EnumerateObject().Select(p => p.Name))`; `:44` `Assert.Equal(TimeSpan.FromDays(90), expira - criado)`; `:47` `Assert.Equal((Sha256(token), token[^4..], "Cursor"), (gravado.Hash, gravado.Final, gravado.Nome))`; `:49` `Assert.DoesNotContain(token, Assert.Single(linhas))` | PASS |
| C2 | `400` com `errors.nome`/`errors.dias` nas bordas, `201` em 60/30/90/365, nada gravado nos `400` | `... McpAdminTests.Criar_valida_nome_e_dias` exit 0 | `McpAdminTests.cs:68` `Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode)`; `:69` `...GetProperty("errors").TryGetProperty(campo, out _)`; `:71` `Assert.Empty(await Gravados(i))`; `:74` `Assert.Equal(HttpStatusCode.Created, ...)`; `:75` `Assert.Equal(3, (await Gravados(i)).Count)` | PASS |
| C3 | sexto token `409` com a mensagem; revogado e vencido não contam; limite por usuário | `... McpAdminTests.Criar_limita_a_5_ativos_por_usuario` exit 0 | `McpAdminTests.cs:91` `Assert.Equal(HttpStatusCode.Conflict, sexto.StatusCode)`; `:92` `Assert.Equal("Você já tem 5 tokens ativos. Revogue um para criar outro.", ...GetProperty("detail"))`; `:97` `409` com 5 ativos + 1 revogado + 1 vencido; `:101` outro admin `Created` | PASS |
| C4 | `GET` `200`, `url`, ordem, estados, sem segredo, sem outra instituição | `... McpAdminTests.Listar_mostra_url_estados_e_nao_vaza_segredo` exit 0 | `McpAdminTests.cs:122` `Assert.Equal($"http://localhost:8080/api/mcp/{i.Slug}", ...)`; `:124` `Assert.Equal(["ativo","revogado","velho"], ...)`; `:125` `Assert.Equal(["ATIVO","REVOGADO","EXPIRADO"], ...)`; `:126` chaves por token; `:130` `DoesNotContain` dos 3 tokens e do hash | PASS |
| C5 | `DELETE` `204`, `revogado_em` gravado, repetido mantém a data, admin revoga o de outro admin | `... McpAdminTests.Revogar_e_idempotente` exit 0 | `McpAdminTests.cs:140,142` `Assert.Equal(HttpStatusCode.NoContent, ...)`; `:144` `Assert.Equal(primeira, Assert.Single(await Gravados(i)).RevogadoEm)`; `:148-149` outro admin `NoContent` e `RevogadoEm` não nulo | PASS |
| C6 | `404` para inexistente e de outra instituição, o alheio intacto | `... McpAdminTests.Revogar_inexistente_ou_de_outra_instituicao_da_404` exit 0 | `McpAdminTests.cs:160-161` `Assert.Equal(HttpStatusCode.NotFound, ...)`; `:163` `Assert.Null(Assert.Single(await Gravados(j)).RevogadoEm)` | PASS |
| C7 | 3 rotas: `403` para ATENDENTE/ALUNO/OPERADOR, `401` sem sessão | `... McpAdminTests.Rotas_exigem_administrador` exit 0 | `McpAdminTests.cs:177-179` `Assert.Equal(esperado, ...)` nas 3 rotas × 4 clientes (`:171-173` define `Forbidden`/`Unauthorized`); `:181` `Assert.Empty(await Gravados(i))` | PASS |
| C38 | `TokenMcp`: fronteiras de estado, revogação vence vencimento, `Revogar` idempotente, `RegistrarUso` 1 min | `... --filter "FullyQualifiedName~TokenMcpDominioTests"` exit 0 (4 passed) | `TokenMcpDominioTests.cs:17` `Estado(vence.AddTicks(-1))` = `Ativo`; `:18` `Estado(vence)` = `Expirado`; `:27,31` `Revogado` antes e depois do vencimento; `:41` `Assert.Equal(Agora.AddHours(1), t.RevogadoEm)`; `:50` `Assert.False(t.RegistrarUso(Agora.AddSeconds(59)))`, `:52` `Assert.True(t.RegistrarUso(Agora.AddSeconds(60)))` | PASS |
| C39 | `hash` único entre instituições; modelo sem mudança pendente | `... McpAdminTests.Hash_e_unico_no_banco` e `... ArquiteturaTests.Modelo_sem_mudanca_pendente` exit 0 | `McpAdminTests.cs:194` `await Assert.ThrowsAsync<DbUpdateException>(...)` gravando o mesmo hash em `j` depois de `i`; `ArquiteturaTests.cs:623` `Assert.False(...HasPendingModelChanges())` | PASS |
| C8 | `initialize` + `tools/list` `200`, 4 ferramentas, sem `Mcp-Session-Id` | `... McpAcessoTests.Lista_as_quatro_ferramentas_sem_sessao` exit 0 | `McpAcessoTests.cs:18` `Assert.Equal(HttpStatusCode.OK, ...)`; `:19` `Assert.DoesNotContain("Mcp-Session-Id", resposta.Headers.Select(h => h.Key))`; `:23` `Assert.Equal(["buscar_conhecimento","listar_chamados","ver_chamado","ver_indicadores"], ferramentas)` | PASS |
| C9 | `401` + `WWW-Authenticate: Bearer` para 5 entradas ruins | `... McpAcessoTests.Recusa_token_ausente_malformado_ou_desconhecido` exit 0 (5 casos, todos Passed no TRX) | `McpAcessoTests.cs:36` `Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode)`; `:37` `Assert.Contains("Bearer", r.Headers.WwwAuthenticate.ToString())`. **Lacuna**: o caso "hash desconhecido" (`:30`) usa o slug `teste`, e a instituição do teste tem slug aleatório (`NovoSlug()`), então a recusa vem da regra de slug (`AutenticacaoMcp.cs:22`) e nunca chega ao `registro is null` (`:31`). Mutante `registro!.Estado(...)` sobreviveu (ver `Faults injected`, F3) | FAIL |
| C10 | revogado `401` na requisição seguinte; vencido `401`; 1 s antes `200` | `... McpAcessoTests.Recusa_token_revogado_e_vencido` exit 0 | `McpAcessoTests.cs:49` e `:52` `Assert.Equal(HttpStatusCode.Unauthorized, ...)`; `:55` `Assert.Equal(HttpStatusCode.OK, ...)` com `agora.AddDays(-1).AddSeconds(1)`. Nota: a revogação é feita por `ExecuteUpdate` (`:47`), não pelo `DELETE`; o efeito é o mesmo para o esquema | PASS |
| C11 | token de A em B `401`, em A `200` | `... McpAcessoTests.Recusa_slug_diferente_do_token` exit 0 | `McpAcessoTests.cs:65` `Unauthorized` em `j.Slug`; `:66` `OK` em `i.Slug` | PASS |
| C12 | `401` com instituição inativa, usuário inativo, `DeveTrocarSenha`, só ALUNO | `... McpAcessoTests.Recusa_quando_instituicao_ou_usuario_nao_valem_mais` exit 0 | `McpAcessoTests.cs:79,80,81,84` quatro `Assert.Equal(HttpStatusCode.Unauthorized, ...)`, um por motivo | PASS |
| C13 | 3 requisições em 30 s gravam uma vez; a de 61 s grava de novo | `... McpAcessoTests.Grava_ultimo_uso_no_maximo_uma_vez_por_minuto` exit 0 | `McpAcessoTests.cs:100` `Assert.Equal(agora, primeiro)`; `:104` `Assert.Equal(agora.AddSeconds(61), Assert.Single(...))` | PASS |
| C14 | `Limites:McpPorMinuto`=3: quarta `429`, outro token `200` | `... McpAcessoTests.Limita_requisicoes_por_token` exit 0 | `McpAcessoTests.cs:133` `Assert.Equal(HttpStatusCode.TooManyRequests, ...)`; `:135` `Assert.Equal(HttpStatusCode.OK, ...)` com `t2` | PASS |
| C15 | cookie em `/api/mcp` `401`; token em `/api/auth/me`, `/api/chamados`, `/api/admin/mcp` `401` | `... McpAcessoTests.Cookie_e_token_nao_se_misturam` exit 0 | `McpAcessoTests.cs:115` cookie em `/api/mcp/{slug}` `Unauthorized`; `:119-121` três `Unauthorized` com o token em rotas `/api/*` | PASS |
| C16 | `listar_chamados` igual à rota, `meus`, corte em 50 com `total` 52 | `... McpFerramentasTests.Listar_chamados_igual_a_rota_e_corta_em_50` exit 0 | `McpFerramentasTests.cs:58` `Assert.Equal(52, daRota.Count)`; `:64` `Assert.Equal(52, j.GetProperty("total").GetInt32())`; `:66` `Assert.Equal(50, itens.Count)`; `:67` mesmos `numero` e ordem; `:77` `meus` igual à rota | PASS |
| C17 | `escopo`/`estado` inválidos dão erro de ferramenta que lista os valores | `... McpFerramentasTests.Listar_chamados_recusa_argumento_invalido` exit 0 | `McpFerramentasTests.cs:88-90` `Assert.True(escopo.Erro)`, `Contains("fila")`, `Contains("meus")`; `:91-92` `Assert.True(estado.Erro)` e os 5 estados | PASS |
| C18 | `ver_chamado`: 14 chaves, mensagens/eventos iguais à rota, sem anexo e sem matrícula, LIDER sem matrícula | `... McpFerramentasTests.Ver_chamado_igual_a_rota_sem_anexo_nem_matricula` exit 0 | `McpFerramentasTests.cs:113-114` conjunto de chaves; `:118` mensagens iguais à rota; `:119` `Assert.Contains(("NOTA","Nota interna da equipe"), mensagens)`; `:123` `Assert.DoesNotContain(matricula, r.Texto)`; `:124` `DoesNotContain("comprovante-secreto", ...)`; `:134` `DoesNotContain(matricula, doLider.Texto)` | PASS |
| C19 | `Chamado não encontrado.` nos 3 casos | `... McpFerramentasTests.Ver_chamado_nao_vaza_existencia` exit 0 | `McpFerramentasTests.cs:154` `Assert.True(r.Erro, numero)`; `:155` `Assert.Equal("Chamado não encontrado.", r.Texto)` para inexistente, de outra instituição e de outro setor | PASS |
| C20 | só ativos da instituição, ordem por distância, `limite` 2, padrão 5 | `... McpFerramentasTests.Buscar_conhecimento_so_ativos_da_instituicao` exit 0 | `McpFerramentasTests.cs:190` títulos `["Boleto vencido","Calendário acadêmico"]`; `:191` tipos `["ARTIGO","DOCUMENTO"]`; `:194-195` `DoesNotContain("arquivado")`, `DoesNotContain("outra instituição")`; `:199` `Assert.Equal(5, ...GetArrayLength())` | PASS |
| C21 | só liderança: `Seu papel não tem acesso à base de conhecimento.` | `... McpFerramentasTests.Buscar_conhecimento_recusa_so_lideranca` exit 0 | `McpFerramentasTests.cs:211-212` `Assert.True(r.Erro)`, `Assert.Equal("Seu papel não tem acesso à base de conhecimento.", r.Texto)` | PASS |
| C22 | embedding `500`: mensagem fixa, sem texto da exceção | `... McpFerramentasTests.Buscar_conhecimento_quando_embedding_falha` exit 0 | `McpFerramentasTests.cs:225-226` `Assert.True(r.Erro)`, `Assert.Equal("A busca está indisponível agora. Tente de novo em instantes.", r.Texto)` | PASS |
| C23 | bordas de `consulta` (0, 1, 500, 501) e `limite` (0, 1, 10, 11) | `... McpFerramentasTests.Buscar_conhecimento_valida_os_limites` exit 0 | `McpFerramentasTests.cs:241` 4 recusas citando `500`/`10`; `:246-247` `Assert.True(r.Erro, ...)`, `Assert.Contains(cita, r.Texto)`; `:249-250` aceita `("a",1)` e `(500×'a',10)` | PASS |
| C24 | `ver_indicadores` igual à rota, com e sem `setorId`, ATENDENTE e ADMINISTRADOR | `... McpFerramentasTests.Ver_indicadores_igual_a_rota` exit 0 | `McpFerramentasTests.cs:265` `Assert.True(daRota...chamadosAbertos > 0)`; `:270` `Assert.True(JsonNode.DeepEquals(Normal(daRota), Normal(r.Json())))` nos 4 pares | PASS |
| C25 | 4 erros de `ver_indicadores` com o texto da rota | `... McpFerramentasTests.Ver_indicadores_repete_os_erros_da_rota` exit 0 | `McpFerramentasTests.cs:290` status da rota `400`/`403`; `:296` `Assert.Equal(detalhe, r.Texto)`; `:298` `Contains("Este setor não é seu.")` | PASS |
| C26 | ferramentas não gravam nada (foto de contagem+hash de todas as tabelas) | `... McpFerramentasTests.Ferramentas_nao_gravam_nada` exit 0 | `McpFerramentasTests.cs:330` `Assert.Equal(antes, await Foto())`; `:307` exclui só `ultimo_uso_em` de `token_mcp`; as 8 chamadas (ok e erro das 4 ferramentas) em `:324-327`. Injeção F9 (gravar um `Setor`) falhou este teste | PASS |
| C27 | log `Information` por execução, com ferramenta, usuário, instituição e `ok`/`erro`, sem conteúdo | `... McpFerramentasTests.Registra_ferramenta_usuario_e_resultado_sem_conteudo` exit 0 | `McpFerramentasTests.cs:353` `Assert.Equal(LogLevel.Information, l.Nivel)`; `:354-356` `Contains` de ferramenta, `u.Id`, `i.Id`; `:358-359` `EndsWith("ok")`, `EndsWith("erro")`; `:360` `DoesNotContain(novas, ... "marcador-unico-xyz" ...)` | PASS |
| C28 | aba `MCP` selecionada, sem "Em breve", URL com `Copiar`, 7 cabeçalhos + coluna de ação, ordem da resposta | `npm --prefix web test -- --run src/administracao/mcp.test.tsx -t "aba MCP lista os tokens"` exit 0 (✓) | `mcp.test.tsx:32` `aria-selected` `'true'`; `:33` `queryByText('Em breve')` ausente; `:34` botão `Copiar URL do servidor`; `:35` `toEqual(['Nome','Dono','Final','Criado','Vence','Último uso','Estado',''])`; `:37` ordem das linhas | PASS |
| C29 | `POST {nome:'Cursor',dias:90}`, token inteiro uma vez, aviso, comando real, linha nova | `... -t "cria o token e mostra uma vez"` exit 0 (✓) | `mcp.test.tsx:53` opções `['30 dias','90 dias','365 dias']`; `:54` valor `'90'`; `:60` `expect(corpo).toEqual({ nome: 'Cursor', dias: 90 })`; `:61-63` aviso, token, `comando(token)`; `:65` linha `Cursor` | PASS |
| C30 | fechar o painel tira o token da página, fica só o `Final` | `... -t "fecha o painel e esconde o token"` exit 0 (✓) | `mcp.test.tsx:79` painel ausente; `:80` `expect(document.body.textContent).not.toContain(token)`; `:81` comando ausente; `:82` `getByText('…wxyz')` | PASS |
| C31 | confirmação, `Cancelar` não chama `DELETE`, `Revogar` chama, `REVOGADO`, aviso, sem botão em `EXPIRADO`/`REVOGADO` | `... -t "revoga com confirmação"` exit 0 (✓) | `mcp.test.tsx:95-96` sem botão em `Antigo`/`Perdido`; `:99` diálogo `Revogar o token «Cursor»?`; `:102` nenhum `DELETE` após `Cancelar`; `:107` `Token revogado.`; `:108` `DELETE` em `/api/admin/mcp/tokens/1`; `:109` dois `REVOGADO` | PASS |
| C32 | vazio: `Nenhum token ainda.` + formulário | `... -t "estado vazio"` exit 0 (✓) | `mcp.test.tsx:118` `findByText('Nenhum token ainda.')`; `:119-120` campo `Nome` e botão `Criar token` | PASS |
| C33 | esqueleto no carregamento; `500` com `Tentar de novo` que refaz o `GET` | `... -t "carregando e erro"` exit 0 (✓) | `mcp.test.tsx:127` `querySelectorAll('[data-slot="skeleton"]').length > 0` (só `> 0`, ver Coverage); `:133` clique em `Tentar de novo`; `:135` `expect(tentativas).toBe(2)` | PASS |
| C34 | `400` com `aria-invalid` e mensagem sob o campo; `409` acima do botão; formulário preenchido, sem token | `... -t "erros da criação"` exit 0 (✓) | `mcp.test.tsx:146` mensagem do `400`; `:147` `toHaveAttribute('aria-invalid','true')`; `:148` valor `'Cursor'`; `:154-155` mensagem do `409` e valor mantido; `:149,156` painel ausente | PASS |
| C35 | bloco `Como conectar` com comando, JSON `mcp.json` e a frase do OAuth | `... -t "como conectar"` exit 0 (✓) | `mcp.test.tsx:163` heading nível 2; `:164` `comando('<seu-token>')`; `:165` JSON exato; `:166` frase `Claude.ai e ChatGPT na web ainda não conectam: pedem OAuth.` | PASS |
| C36 | `integracoes.test.tsx` sem o selo/aviso; `abas` espera `Moodle`,`MCP`; teste `aba MCP em breve` removido; suíte web e build passam | `npm --prefix web test -- --run src/administracao/integracoes.test.tsx` exit 0 (✓ 4 testes); `npm --prefix web test -- --run` exit 0 (646 passed); `npm --prefix web run build` exit 0 | `integracoes.test.tsx:33` `expect(nomesDasAbas(), caminho).toEqual(['Moodle','MCP'])`; `git diff c6b6c88..HEAD` do arquivo: removidos `EmBreve`, a asserção do selo e o teste `aba MCP em breve`; acrescentados o mock de `GET /api/admin/mcp` (`:19`) e `findByText('Nenhum token ainda.')` no lugar do aviso (`:42`); nenhuma outra asserção mudou | PASS |
| C37 | `ArquiteturaTests` descreve a fatia `Mcp`, os 4 pares, `token_mcp`, 34 entidades, `Pacote_mcp_fixado`; `dotnet build` com CA1502 | `... --filter "FullyQualifiedName~ArquiteturaTests"` exit 0 (59 passed no TRX, inclui `Pacote_mcp_fixado`); `dotnet build One.slnx` exit 0 (0 avisos, 0 erros) | `ArquiteturaTests.cs:257` `"Mcp"` em `Fatias`; `:294` os 4 pares `("Mcp", ...)`; `:20` `"token_mcp"` em `TabelasDaInstituicao`; `:530` `["Mcp"] = ["TokenMcp"]`; `:540` `Assert.Equal(34, tipos.Count)`; `:393` `Assert.Equal("2.4.0", (string?)mcp.Attribute("Version"))`; `:394-395` `Contains("HttpServerSessionMode.Stateless")`, `Contains("WithTools<FerramentasMcp>")`. Leitura direta do startup: `Program.cs:90` (`AddMcpServer().WithHttpTransport(... Stateless).WithTools<FerramentasMcp>()`), `Program.cs:128` (`AddScheme<..., AutenticacaoMcp>`), `Program.cs:147` (`McpRotas.Mapear(app)`), `One.Api.csproj:19` (`Version="2.4.0"`) | PASS |
| C40 | `AD-049` ativa em `STATE.md`; `plan.md`, `checks.md` e `verification.md` na pasta | `Select-String -Path .specs/STATE.md -Pattern '^\| AD-049 \|.*\| active \|'` exit 0 com 1 linha | `STATE.md:56` `\| AD-049 \| ... \| active \|`; `Get-ChildItem .specs/features/mcp-one` lista `checks.md`, `plan.md` (e este `verification.md`) | PASS |
| C41 | `dryer` sem candidato a 0.8 no código novo; `crapper` abaixo de CRAP 10 | `cd web; dryer` exit 0; `cd web; crapper` | `dryer`: 2233 linhas de saída, só pares `src/ui/*` (score 0.85, isentos pelo AD-023); `dryer ... \| Select-String 'mcp\|Mcp\|Integra\|AbaInt'` não achou nada em `Mcp.tsx`, `Integracoes.tsx`, `AbaIntegracao.tsx`, `Moodle.tsx`. `crapper`: `ResourceUnavailable: ... crapper.exe ... Uma política de Controle de Aplicativo bloqueou este arquivo.` | dryer PASS; crapper **não rodado** (AD-044), sem PASS |

## Coverage

Recomputado a partir do plano (Surface, Landing, AC) e do código, não da tabela do autor.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/admin/mcp` statuses (3) | plan Surface | 200 C4 `:119` · 401/403 C7 `:171-179` | - |
| `POST /api/admin/mcp/tokens` statuses (5) | plan Surface | 201 C1 `:35` · 400 C2 `:68` · 401/403 C7 · 409 C3 `:91` | - |
| `DELETE /api/admin/mcp/tokens/{id}` statuses (4) | plan Surface | 204 C5 `:140` · 401/403 C7 · 404 C6 `:160` | - |
| `POST /api/mcp/{slug}` statuses (3) | plan Surface | 200 C8 `:18` · 401 C9/C10/C11/C12/C15 · 429 C14 `:133` | - |
| `GET`/`DELETE /api/mcp/{slug}` (2) | plan Assumptions ("esperado `405`, conferido no build") | nenhuma prova | `GET /api/mcp/{slug}` e `DELETE /api/mcp/{slug}` (assunção do plano, sem check) |
| papéis que chamam `/api/admin/mcp*` (4) | plan AC 7 | ADMINISTRADOR C1 · ATENDENTE/ALUNO/OPERADOR C7 `:171` | - |
| motivos de `401` em `/api/mcp/{slug}` (13) | `AutenticacaoMcp.cs:19-34` + AC 9-12, 15 | sem cabeçalho C9 `:27` · `Bearer lixo` C9 `:28` · segredo vazio C9 `:29` · esquema `Basic` C9 `:31` · revogado C10 `:49` · vencido C10 `:52` · slug diferente C11 `:65` · instituição inativa C12 `:84` · usuário inativo C12 `:81` · `DeveTrocarSenha` C12 `:80` · sem papel da equipe C12 `:79` · cookie C15 `:115` | **hash desconhecido** (`AutenticacaoMcp.cs:31`, `registro is null`): o caso de C9 `:30` morre na regra de slug (F3 sobreviveu) |
| outras rotas que recusam o token (3) | plan AC 15 | `/api/auth/me`, `/api/chamados`, `/api/admin/mcp` C15 `:119-121` | - |
| `estado` do token (3) | `TokenMcp.cs:5-9,29-30` | ATIVO/EXPIRADO/REVOGADO C4 `:125` + C38 `:16-27` | - |
| fronteiras do estado (3) | `TokenMcp.cs:30` | C38 `:17,18,27,31` (F5 `>=`→`>` morto) | - |
| ferramentas (4) | `FerramentasMcp.cs:29,45,68,95` + AC 8 | uma ou mais provas por ferramenta (C16-C25) | - |
| `escopo` de `listar_chamados` (3) | `FerramentasMcp.cs:34-35` | `fila` C16 `:60` · `meus` C16 `:76` · inválido C17 `:85` | - |
| argumento `estado` de `listar_chamados` (6: omitido + 5 valores de `EstadosChamado`) | plan Surface (`estado` opcional), `FerramentasMcp.cs:27,36-37` | só o inválido (C17 `:86`) | **o caminho feliz do filtro**: o mutante `new ListarChamados(qual, null, usuario)` (F13) passou 12/12 |
| bordas de `consulta` e `limite` (8) | AC 23, `FerramentasMcp.cs:74-75` | C23 `:241,249-250` | - |
| bordas de `nome` e `dias` (8) | AC 2, `CriarTokenMcp.cs:21-22` | C2 `:58-63,73` (60 e 61 caracteres, 29/30/365/366/ausente) | - |
| erros de `ver_indicadores` (4) | AC 25 | C25 `:282-285` | - |
| `ver_chamado` não encontrado (3) | AC 19 | C19 `:151` | - |
| comportamentos decididos no build sem AC (1) | `checks.md` Handoff, "Settled mid-build" (4): a consulta passa por `Mascara.Aplicar` | nenhum check | **máscara da consulta** (`FerramentasMcp.cs:85`): o mutante `Mascara.Aplicar(consulta)`→`consulta` passou 12/12 (F14) |
| estados da aba (6) | AC 28, 32-34 | lista C28 · vazio C32 · carregando C33 `:127` · erro C33 `:133` · erro de campo C34 `:146` · conflito C34 `:154` | - (o esqueleto é afirmado só com `> 0` elementos) |
| ações da aba (4) | AC 29-31 | criar C29 · fechar C30 · revogar C31 `:105` · cancelar C31 `:100` | - |
| arranjo da aba (4 regiões + ordem) | tela enumerada acima | nenhuma prova de ordem ou de aninhamento | **composição da tela** (ver `Binding sources`): precisão do check, não contradição |
| portas (6) | plan Landing | 1 C1 `:47` + C39 `:194` · 2 C1 `:39` + C9 · 3 C8 `:23` · 4 C37 `:393-395` + C8 `:19` · 5 C37 `:257,294` · 6 C15 `:115-121` | - |
| startup config: registro do servidor MCP e do esquema `mcp` (1 assembly) | `Program.cs:90`, `:128`, `:136`, `:147` lidos diretamente | `OneFactory` monta `Program` (`WebApplicationFactory<Program>`): C8 `McpAcessoTests.cs:18-23`, C14 (política `mcp` em `:133`) | - |

Claims com status/rota/forma de resposta (C1-C9, C14, C15): todas têm prova que cruza a fronteira HTTP (`f.Rpc`/`HttpClient` em `McpTeste.cs:37-51`, `McpAdminTests`). Nenhuma sobe só no nível da unidade.

Igualdades com a rota (C16, C18, C24): cada teste afirma o tamanho/valor não vazio antes de comparar (`McpFerramentasTests.cs:58`, `:122`, `:265`).

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide e é alcançado por uma fronteira HTTP | `AutenticacaoMcp.cs`, `CriarTokenMcp.cs`, `RevogarTokenMcp.cs`, `VerMcp.cs`, `FerramentasMcp.cs` | fronteira: `McpAcessoTests`, `McpAdminTests`, `McpFerramentasTests` · entidade: `TokenMcpDominioTests` | **não** - contrato HTTP presente, mas "um caso asserido por motivo de recusa (13 motivos de `401`)" tem 12 de 13; falta o motivo "hash desconhecido" (`AutenticacaoMcp.cs:31`) |
| Decide e não cruza fronteira | `TokenMcp.cs` | `TokenMcpDominioTests`, sem banco, um caso por fronteira (3) | sim - `TokenMcpDominioTests.cs:17,18,27,31,50,52`; F5, F11 e F12 foram mortos aqui |
| Instrumentação (registro `AddMcpServer`/`MapMcp`, records de resposta) | `Program.cs` (trecho MCP), `McpRotas.cs`, `RespostasMcp.cs` | nenhuma própria | sim - coberta por C8 (`McpAcessoTests.cs:23`); F15 (tirar `RequireRateLimiting`) e F16 (`RequireAuthorization()` sem esquema) foram mortos |

## Faults injected

Injetadas na árvore real e revertidas com `git checkout -- <arquivo>` (o procedimento do verify.md pede `git worktree`; usei a árvore real por instrução do pedido e confirmei a reversão). Linha de base: `git status --porcelain` só com os `demo-live-*.png` e `web/apresentacao/*` do usuário; depois de cada injeção e no fim, o mesmo conjunto.

| # | Mutation | Location | Narrowest proof run | Killed |
| --- | --- | --- | --- | --- |
| F1 | aceitar revogado: `Estado(agora) != Ativo` → `== Expirado` | `One.Api/Mcp/AutenticacaoMcp.cs:31` | `McpAcessoTests` (12) | yes - 1 falha (`Recusa_token_revogado_e_vencido`, por contagem e pela lógica do teste) |
| F2 | pular a checagem de slug (`|| Request.RouteValues["slug"] as string != slug`) | `AutenticacaoMcp.cs:22` | `McpAcessoTests` (12) | yes - 1 falha (`Recusa_slug_diferente_do_token`) |
| F3 | hash desconhecido não tratado: `registro is null || registro.Estado(...)` → `registro!.Estado(...)` | `AutenticacaoMcp.cs:31` | `McpAcessoTests` (12) | **no** - 12/12 passaram. Um token de formato válido, do slug certo e sem linha em `token_mcp` passaria a dar `NullReferenceException` e nenhum teste veria |
| F3b | hash lookup devolve qualquer token do tenant: `FirstOrDefaultAsync(t => t.Hash == hash)` → `FirstOrDefaultAsync(t => true)` | `AutenticacaoMcp.cs:30` | `McpAcessoTests` (12) | yes - 1 falha (`Recusa_token_revogado_e_vencido`); `Recusa_token_ausente_malformado_ou_desconhecido` continua verde |
| F3c | remover a regra de slug e rodar só `Recusa_token_ausente_malformado_ou_desconhecido` | `AutenticacaoMcp.cs:22` | 5 casos | **no** - 5/5 passaram, o que confirma que o caso "hash desconhecido" não depende do hash |
| F4 | `DeveTrocarSenha: false` → `true` na regra de uso | `AutenticacaoMcp.cs:41` | `McpAcessoTests` (12) | yes - 6 falhas |
| F5 | `agora >= ExpiraEm` → `agora > ExpiraEm` | `One.Api/Dados/Mcp/TokenMcp.cs:30` | `TokenMcpDominioTests`+`McpAcessoTests`+`McpAdminTests` (24) | yes - `Estado_na_fronteira_do_vencimento` |
| F6 | `RevogadoEm ??= agora` → `= agora` | `TokenMcp.cs:32` | `TokenMcpDominioTests`+`McpAdminTests` (12) | yes - `Revogar_duas_vezes_mantem_a_primeira_data`, `Revogar_e_idempotente` |
| F7 | `ultimo` janela: `< IntervaloDeUso` → `<= IntervaloDeUso` | `TokenMcp.cs:36` | `TokenMcpDominioTests`+`McpAcessoTests` (16) | yes - só `Registrar_uso_so_depois_de_um_minuto` (o teste HTTP C13 não pega a fronteira de 60 s, a unidade pega; coerente com o Test policy) |
| F8 | limite de tokens `>=` → `>` (aceita o sexto) | `One.Api/Administracao/CriarTokenMcp.cs:35` | `McpAdminTests` (8) | yes - `Criar_limita_a_5_ativos_por_usuario` |
| F8b | contar revogados como ativos: tirar `t.RevogadoEm == null` | `CriarTokenMcp.cs:34` | `McpAdminTests` (8) | yes - `Criar_limita_a_5_ativos_por_usuario` |
| F8c | `final` = 4 caracteres errados (`token[^5..^1]`) | `CriarTokenMcp.cs:38` | `McpAdminTests` (8) | yes - `Criar_devolve_o_token_uma_vez_e_grava_so_o_hash` |
| F8d | listagem em ordem crescente | `One.Api/Administracao/VerMcp.cs:24` | `McpAdminTests` (8) | yes - `Listar_mostra_url_estados_e_nao_vaza_segredo` |
| F9 | ferramenta grava um `Setor` depois de responder `ok` | `One.Api/Mcp/FerramentasMcp.cs:120` | `McpFerramentasTests` (12) | yes - 6 falhas, inclusive `Ferramentas_nao_gravam_nada` |
| F10 | `ver_chamado` volta a devolver `detalhe` de eventos `ANEXO` | `FerramentasMcp.cs:62` | `McpFerramentasTests` (12) | yes - 1 falha (`Ver_chamado_igual_a_rota_sem_anexo_nem_matricula`) |
| F11 | `buscar_conhecimento` sem a recusa de só-liderança (`if (false) throw`) | `FerramentasMcp.cs:76` | `McpFerramentasTests` (12) | yes - 1 falha (`Buscar_conhecimento_recusa_so_lideranca`) |
| F12 | corte da lista em 60 em vez de 50 | `FerramentasMcp.cs:38` | `McpFerramentasTests` (12) | yes - 1 falha (`Listar_chamados_igual_a_rota_e_corta_em_50`) |
| F13 | `listar_chamados` ignora `estado`: `new ListarChamados(qual, estado, usuario)` → `(qual, null, usuario)` | `FerramentasMcp.cs:37` | `McpFerramentasTests` (12) | **no** - 12/12 passaram |
| F14 | consulta não passa por `Mascara.Aplicar` antes do provedor de embeddings | `FerramentasMcp.cs:85` | `McpFerramentasTests` (12) | **no** - 12/12 passaram (comportamento "settled mid-build (4)", sem AC nem check) |
| F15 | log em `LogDebug` no lugar de `LogInformation` | `FerramentasMcp.cs:131` | `McpFerramentasTests` (12) | yes - `Registra_ferramenta_usuario_e_resultado_sem_conteudo` |
| F16 | sem `RequireRateLimiting("mcp")` | `One.Api/Mcp/McpRotas.cs:10` | `McpAcessoTests` (12) | yes - `Limita_requisicoes_por_token` |
| F17 | `RequireAuthorization()` sem o esquema `mcp` | `McpRotas.cs:9` | `McpAcessoTests` (12) | yes - 11 falhas (a porta deixa de aceitar o token) |
| F18 | validade `365` → `180` nas opções do formulário | `web/src/administracao/Mcp.tsx:24` | `mcp.test.tsx`+`integracoes.test.tsx` (12) | yes - `cria o token e mostra uma vez` |
| F19 | validade padrão `90` → `30` | `Mcp.tsx:78` (`useState(90)`) | idem | yes - `cria o token e mostra uma vez` |
| F20 | `Fechar` não limpa o token (painel continua) | `Mcp.tsx:94` | idem | yes - `fecha o painel e esconde o token` |
| F21 | `Revogar` chama o `DELETE` sem confirmação | `Mcp.tsx:162` | idem | yes - `revoga com confirmação` |
| F22 | botão `Revogar` também em `EXPIRADO` | `Mcp.tsx:52` | idem | yes - `revoga com confirmação` |
| F0 | tentativa de `FirstOrDefaultAsync(t => t.Hash == hash \|\| t.Hash != hash)` | `AutenticacaoMcp.cs:30` | - | não compila: CA1502 (complexidade 11 em `HandleAuthenticateAsync`); descartada, o método já está no teto 10 |

Cobertura das 8 superfícies de asserção da feature: autenticação (F1-F4, F17), entidade (F5-F7), administração (F8-F8d), ferramentas (F9-F14), log (F15), limite (F16), UI (F18-F22). **Sobreviventes: F3/F3c, F13, F14.**

## Gate

- `dotnet test One.Api.Tests --no-build --filter "McpAdminTests|McpAcessoTests|McpFerramentasTests|TokenMcpDominioTests|ArquiteturaTests"` - 100 passed, 0 failed
- `npm --prefix web test -- --run` - 646 passed, 0 failed (69 arquivos)
- `npm --prefix web run build` - exit 0 · `dotnet build One.slnx` - exit 0, 0 avisos, 0 erros
- `cd web; dryer` - exit 0, sem candidato fora de `src/ui/` · `cd web; crapper` - **não rodado** (Application Control, AD-044)

## Alegações do pedido do usuário ("construir o MCP do One e adicionar na aba de integrações")

- Ponta a ponta por HTTP: `McpTeste.Rpc` (`One.Api.Tests/Infra/McpTeste.cs:37-51`) faz `POST /api/mcp/{slug}` com `Authorization`, corpo JSON-RPC 2.0 e `Accept: application/json, text/event-stream`, e lê a resposta JSON ou SSE. `initialize` + `tools/list` em `McpAcessoTests.cs:17,21`; `tools/call` em `McpTeste.Chamar` (`:56-64`) usado por todos os testes de ferramenta. A rota é servida pelo `WebApplicationFactory` em memória (TestServer), não por um socket; não subi `dotnet run` nem usei um cliente MCP real.
- Aba ligada: `Integracoes.tsx:19` (`TabsTrigger value="mcp"`), `:31-40` (`TabsContent` com `ConteudoMcp`), `:4` importa `./Mcp`; `Mcp.tsx` consome `POST /api/admin/mcp/tokens` (`:80`) e `DELETE` (`:145`); o `GET` vem de `AbaIntegracao` com `url="/api/admin/mcp"` (`Integracoes.tsx:36`).
- Nada é gravado pelas ferramentas: C26, mais F9 (a injeção de escrita foi pega por 6 testes). A única escrita do caminho MCP é `RegistrarUso` em `AutenticacaoMcp.cs:36`, uma vez por minuto, que o AC 13 permite.

## Defeitos e observações do produto

Nenhum defeito de comportamento reproduzido. Observações de baixa gravidade, sem teste que as prove:

1. `One.Api/Program.cs:136` - a partição do limite `mcp` é `Tokens.Hash(Authorization)`. Cabeçalhos diferentes (inclusive lixo) criam partições novas sem teto, então o limite não freia quem tenta adivinhar tokens nem impede o crescimento do conjunto de limitadores; ele só limita o uso repetido do mesmo token. O AC 14 pede limite "por token" e é cumprido; a ressalva é de robustez.
2. `One.Api/Mcp/FerramentasMcp.cs:123` - `Executar` só captura `McpException`. Uma falha inesperada (por exemplo `JsonException`/`InvalidOperationException` ao ler a resposta de `ListarChamados`, ou `Embeddings.Gerar` lançando algo fora da lista de `:87`) escapa para o SDK sem a linha de log `erro` do AC 27 e sai com a mensagem padrão do SDK.
3. `checks.md` abre com "37 checks" mas numera C1-C41 (41 ids). Descuido de documento.

## Ranked gaps

1. Mutante F3 sobrevivente - C9 / Test policy (13 motivos de `401`) - `One.Api.Tests/McpAcessoTests.cs:30` usa o slug `teste` contra uma instituição de slug aleatório; o motivo "hash desconhecido" (`One.Api/Mcp/AutenticacaoMcp.cs:31`) nunca é exercitado. Correção: usar o `i.Slug` real com 43 caracteres válidos sem linha em `token_mcp`.
2. Mutante F13 sobrevivente - `estado` de `listar_chamados` (`FerramentasMcp.cs:36-37`) sem prova do caminho feliz; nenhum check o nomeia, embora o Surface o liste.
3. Mutante F14 sobrevivente - `Mascara.Aplicar(consulta)` (`FerramentasMcp.cs:85`) é comportamento decidido no build sem AC nem check.
4. C41 - `crapper` não rodado (Application Control, AD-044); sem PASS.
5. Precisão dos checks da tela: nenhum check afirma a ordem/divisão das regiões da aba MCP (`Mcp.tsx:154-167`); o skeleton é afirmado só com `> 0` (`mcp.test.tsx:127`).
6. `GET`/`DELETE /api/mcp/{slug}` (`405` esperado pela assunção do plano) sem prova.

## Round 2 - correções dos sobreviventes (10/11/2026)

**Verdict**: FAIL só pelo C41 (`crapper` bloqueado pelo Application Control, AD-044); todos os outros checks com PASS.

| Item | Correção | Prova | Resultado |
| --- | --- | --- | --- |
| C9 / F3, F3c | `McpAcessoTests.Recusa_token_ausente_malformado_ou_desconhecido` passa a usar o slug real da instituição (`onemcp_{slug}.` + 43 caracteres válidos sem linha em `token_mcp`) | mutante `registro!.Estado(...)` em `AutenticacaoMcp.cs:31`: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpAcessoTests"` -> Com falha: 1, Aprovado: 11 | PASS (mutante morto) |
| F13 | novo teste `McpFerramentasTests.Listar_chamados_filtra_por_estado` (um `ABERTO`, um `EM_ATENDIMENTO`; o filtro devolve só o segundo) | mutante `new ListarChamados(qual, null, usuario)`: `--filter "FullyQualifiedName~McpFerramentasTests"` -> Com falha: 1, Aprovado: 12 | PASS (mutante morto) |
| F14 | `buscar_conhecimento` afirma que o e-mail da consulta não chega ao provedor de embeddings (`[e-mail removido]`) | mutante `Mascara.Aplicar(consulta)` -> `consulta`: Com falha: 1, Aprovado: 12 | PASS (mutante morto) |
| GET/DELETE em `/api/mcp/{slug}` | `McpAcessoTests.Lista_as_quatro_ferramentas_sem_sessao` afirma `404` nos dois métodos (a assunção do plano dizia `405`; o comportamento real é `404`) | `dotnet test One.Api.Tests` | PASS |
| Falha inesperada em ferramenta | `FerramentasMcp` registra `erro` no log antes de relançar qualquer exceção que não seja `McpException` | `dotnet test One.Api.Tests` | PASS |

Os três mutantes foram revertidos depois de cada execução (`git diff -- One.Api` mostra só o `catch (Exception)` acima).

Suítes da rodada: `dotnet test One.Api.Tests` -> Aprovado: 810, Com falha: 0; `dotnet build One.slnx` -> 0 Aviso(s), 0 Erro(s); `npm --prefix web test -- --run` -> 69 arquivos, 646 testes passed; `npm --prefix web run build` -> exit 0.

**C41 (`crapper`)**: `crapper` -> "Uma política de Controle de Aplicativo bloqueou este arquivo". Continua sem prova; fechar com risco aceito exige um AD do dono do projeto (como o AD-036). Não registrei esse AD.
