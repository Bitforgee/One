# Domínio rico e contratos por caso de uso verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: f0a7c9e..9eea6e0; fix desde a rodada 1: `1d0753f..9eea6e0`, só `.specs/` (ruling do C27 em `2c462f7`), nenhum arquivo de `api/`, `api.Tests/` ou `web/` (commits da `interface-nova` que tocam só `web/` e `.specs/features/interface-nova/` ficam fora do escopo; o commit misto `5cc2ac2` entra só pelo rename `api/Chamados/DetalheChamado.cs -> Shared/`; `0960b70`, remoção de comentários do `api/` pedida pelo usuário, entra como mudança neutra)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Rodada 2, escopo: C27 (o único não-PASS da rodada 1) e o ruling do usuário de 02/11/2026 que o fecha (`checks.md`,
Handoff, coordenador: "o C27 vale para o arquivo sem comentários"). Como `git diff 1d0753f HEAD -- api api.Tests web` é
vazio, não há superfície nova para faltas nem membro novo de cobertura, e as citações `file:line` seguem válidas.
Provas re-rodadas por inteiro em `9eea6e0`, num worktree destacado (`scratchpad/dom-verify2`) com o `postgres` do compose:
suíte API, `asserts_api.py`, `arquitetura_intacta.py`, `retratos_antes.py`, `migracao_vazia.py`, `ca1502_barra.sh`,
`msg0005_barra.sh`, `dotnet build api -warnaserror:CA1502`, os diffs de retratos e migrações, o grep do AD-024. O resto
diz de onde vem: **verified at 9eea6e0** ou **carried from 1d0753f** (rodada 1, commit `bbac89a`).

**C27 (verified at 9eea6e0).** `git diff -U0 f0a7c9e HEAD -- api/Agendador.cs` mostra 10 linhas `//` removidas e 1 linha
trocada só no comentário de fim de linha (`catch (Exception falha) // ...` -> `catch (Exception falha)`); `git log
f0a7c9e..HEAD -- api/Agendador.cs` = só `0960b70`. Prova mecânica: um tokenizador C# (`scratchpad/strip_cs.py`, ignora `//`
e `/* */` dentro de strings `"..."`, `@"..."`, `$"..."` e de chars) tira os comentários da base, descarta as linhas que só
tinham comentário e apara o fim das linhas que tinham: `strip(base) == HEAD` byte a byte (`True`, 208 -> 198 linhas, igual às
198 de HEAD) e `strip(HEAD) == HEAD` (HEAD sem comentário). Controle negativo: trocar `Fechado automaticamente` por
`Fechado automatico` na cópia de HEAD dá `False`. Pelo ruling, C27 PASS.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | suítes API e e2e verdes, nada removido | verified at 9eea6e0: `dotnet test api.Tests` 329/329; carried from 1d0753f: Playwright 31/31 (`E2E_URL=http://localhost:8082`, nenhum arquivo de `web/` mudou desde então) e 303/303 em `7b1bfa6` | suíte inteira em `trx`; e2e `web/e2e/arranjo.spec.ts:377` (o que falhava no lote 3) verde agora | PASS |
| C2 | asserts preservados, sem `Skip`, sem commit misto | verified at 9eea6e0: `asserts_api.py f0a7c9e` exit 1, os mesmos 2 problemas: (1) a linha de `Handler_sem_HttpContext`, (2) `5cc2ac2` toca `api/` e `web/` | a única linha removida com `Assert` em `api.Tests` é `api.Tests/ArquiteturaTests.cs:449` (base: `typeof(One.Api.Chamados.DetalheChamado)`, HEAD: `typeof(One.Api.Chamados.Shared.DetalheChamado)`, o resto idêntico); `git show --stat 5cc2ac2 -- api` = só o rename `api/Chamados/{ => Shared}/DetalheChamado.cs`, 0 linhas | PASS (ruling do usuário de 02/11 no Handoff sobre (1); (2) é o rename de 0 linhas que o Handoff registra; nada além disso mudou) |
| C3 | `rotas.txt` e `erros.txt` iguais à base | `git diff --exit-code f0a7c9e HEAD -- ...` exit 0; os 2 filtros 1 teste cada | `api.Tests/RetratoTests.cs:51` `Assert.Equal(File.ReadAllLines(Retrato("rotas.txt")), viva)`; `api.Tests/RetratoTests.cs:122` `Assert.Equal(gravados.Select(SemTraceId), vivos)` | PASS |
| C4 | 59 corpos de sucesso iguais à base | filtro `Corpos_de_sucesso_iguais_aos_da_base` 1 teste | `api.Tests/RetratoTests.cs:305` `Assert.Equal(59, gravados.Length)`; `:306` `Assert.Equal(gravados.Select(Normalizar), vivos)` | PASS |
| C5 | corpo 400 da importação igual sem `traceId` | filtro 1 teste | `api.Tests/RetratoTests.cs:329` `Assert.Equal(SemTraceId(gravado[0]), vivo)` | PASS |
| C6 | 24 gravações G1–G21 iguais à base | filtro 1 teste | `api.Tests/RetratoTests.cs:501` `Assert.Equal(24, gravadas.Length)`; `:502` `Assert.Equal(gravadas, vivas)` | PASS |
| C7 | retratos gravados com o código da base e testes de S1 sem mudança | `retratos_antes.py f0a7c9e` exit 0 ("ok") | `.specs/features/dominio-e-contratos/retratos_antes.py` saída ok | PASS |
| C8 | cadeia do acesso e da conversa | filtro 1 teste | `api.Tests/OrdemDasRecusasTests.cs:242` `Assert.True(errors.TryGetProperty(campo, ...))`, chamado em `:261`–`:265`; `:249` `Assert.Equal(detail, await Detail(r))` | PASS |
| C9 | cadeia dos cadastros | filtro 1 teste | `api.Tests/OrdemDasRecusasTests.cs:326` (11 linhas POST/PUT pelo `Recusa400` de `:242`); `:243` mensagem da categoria padrão | PASS |
| C10 | cadeia do usuário | filtro 1 teste | `api.Tests/OrdemDasRecusasTests.cs:354` (7 linhas × POST/PUT); `:356` 409 com `detail` | PASS |
| C11 | cadeia do conhecimento | filtro 1 teste | `api.Tests/OrdemDasRecusasTests.cs:381`, `:383`–`:384`, `:392`–`:395` | PASS |
| C12 | cadeia das ações do chamado, chamado sem mudança | filtro 1 teste | `api.Tests/OrdemDasRecusasTests.cs:408`–`:422`; `:414` 409 "A ação não é permitida..."; `conferir*()` em `:410`, `:416`, `:423` | PASS |
| C13 | anônimos só nos 6 arquivos (27) | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:684` `Assert.Equal(esperado.OrderBy(...), achados.OrderBy(...))`; `:685` `Assert.Equal(27, ...)` | PASS |
| C14 | 29 `Entrada`, `ResultadoLogin`, 29 rotas JSON | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:710`, `:717` `Assert.Equal(29, entradas.Count)`, `:725`, `:727` | PASS |
| C15 | 15 `Resposta` + 38 `Shared` + `Resultado`; 9 arquivos `Shared` | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:778` `Assert.Equal(ComRespostaAninhada.Order(), aninhadas)`; `:780`; `:803` `Assert.Equal(9, shared.Count)` | PASS |
| C16 | cada `Shared` com ≥ 3 usos na fatia | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:825` `Assert.True(citam.Count >= 3, ...)`; `:826`; `:828` | PASS |
| C17 | nenhum corpo tipado `object` exceto a transcrição | 2 filtros, 1 teste cada | `api.Tests/ArquiteturaTests.cs:853` `Assert.Empty(restante)`; `:858`–`:860` | PASS (precision gap: "os 14 de hoje" são 16 na base, ver Coverage) |
| C18 | AD-024 `active` | grep da linha AD-024 com `active` em `.specs/STATE.md`: 1 linha, exit 0 (re-rodado em 9eea6e0) | `.specs/STATE.md` linha AD-024 | PASS |
| C19 | `Chamado` fechado, filhos `init` | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:477` `Assert.Equal(["InstituicaoId"], ...)`; `:479`; `:486`; `:498` | PASS |
| C20 | mensagem/evento só pelo domínio; 24 gravações | 4 filtros, 1 teste cada | `api.Tests/ArquiteturaTests.cs:509` `Assert.Empty(ArquivosQue(...))`; `api.Tests/RetratoTests.cs:502`; `api.Tests/VisibilidadeTests.cs:262`; `api.Tests/AdminTests.cs:364` | PASS |
| C21 | 18 linhas da tabela de transições | filtro 1 teste | `api.Tests/ChamadoDominioTests.cs:106`, `:107`, `:109` `Assert.True(l.Eventos.SequenceEqual(...))`, `:112`; linha 1 (`Abrir`) só em `api.Tests/ChamadoDominioTests.cs:92` `Assert.Equal("CRIACAO", e.Tipo)` | PASS (precision gap: o teste da linha 1 não está no `Proof:`, ver F5) |
| C22 | 18 transições inexistentes lançam e não mudam | filtro 1 teste | `api.Tests/ChamadoDominioTests.cs:143` `Assert.Equal(18, casos.Length)`; `:148` `Assert.Throws<InvalidOperationException>`; `:149`–`:150` | PASS |
| C23 | 32 trios aceitos | filtro 1 teste | `api.Tests/ChamadoDominioTests.cs:186` `Assert.True(recusa is null, ...)`; `:189` `Assert.Equal(32, contados)` | PASS |
| C24 | assumir sendo o responsável: 409 e `Recusa` | 2 filtros, 1 teste cada | `api.Tests/RecusasDoDominioTests.cs:34`–`:36`; `api.Tests/ChamadoDominioTests.cs:199` `Assert.Equal("Você já é o responsável por este chamado.", recusa?.Motivo)` | PASS |
| C25 | prazo de rejeição: 409, 10 dias, limite exato | 3 filtros, 1 teste cada | `api.Tests/RecusasDoDominioTests.cs:54`–`:55`; `api.Tests/PrazosTests.cs:55`; `api.Tests/ChamadoDominioTests.cs:209` (no limite aceita), `:216` (1 tick depois recusa) | PASS |
| C26 | forma do pipeline e `Recusa` | 2 filtros, 1 teste cada | `api.Tests/ArquiteturaTests.cs:871`, `:901` `Assert.Equal(typeof(Task<...DetalheChamado>), ...)`, `:905`, `:911`; `:466`–`:467` | PASS |
| C27 | `api/Agendador.cs` igual ao da base sem comentários (ruling de 02/11) | verified at 9eea6e0: `git diff --exit-code` exit 1 (só comentários); `strip_cs.py`: `strip(base) == HEAD` byte a byte, controle negativo `False` | `api/Agendador.cs:116` `catch (Exception falha)` (a única linha de código tocada, só perdeu o comentário de fim de linha); as outras 10 diferenças são linhas `//` inteiras | PASS (ruling do usuário de 02/11 no Handoff) |
| C28 | concorrência e append-only | 4 filtros, 1 teste cada | `api.Tests/VisibilidadeTests.cs:238`; `api.Tests/TransferenciaTests.cs:145`–`:146`; `api.Tests/TransferenciaTests.cs:173` `Assert.Equal(Enumerable.Range(1, 20)...)`; `api.Tests/VisibilidadeTests.cs:321` | PASS |
| C29 | `Artigo`/`Documento` fechados | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:516`–`:521` (via `:477`, `:479`, `:486`, `:490`) | PASS |
| C30 | transições de artigo e documento | 2 filtros, 1 teste cada | `api.Tests/ArtigoDominioTests.cs:18`, `:24`, `:30`, `:32`, `:34`, `:38`; `api.Tests/DocumentoDominioTests.cs:18`, `:22`, `:26` | PASS |
| C31 | artigo já ativo/arquivado: 409 e `Recusa` | 3 filtros, 1 teste cada | `api.Tests/RecusasDoDominioTests.cs:79`–`:81`; `api.Tests/ArtigoAdminTests.cs:149`, `:151`; `api.Tests/ArtigoDominioTests.cs:46`, `:51` | PASS |
| C32 | documento arquivado: 409 e `Recusa` | 3 filtros, 1 teste cada | `api.Tests/DocumentoTests.cs:411` `Assert.Equal(detail, ...)` sobre as linhas `:403` e `:405`; `api.Tests/DocumentoDominioTests.cs:34`–`:35` | PASS |
| C33 | número de versão não maior lança | 3 filtros, 1 teste cada | `api.Tests/ArtigoDominioTests.cs:63`–`:64`, `:68`; `api.Tests/DocumentoDominioTests.cs:47`–`:48`, `:51`; `api.Tests/ArquiteturaTests.cs:167`–`:168` | PASS |
| C34 | 24 entidades em 24 arquivos por pasta | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:545` `Assert.Equal(24, tipos.Count)`; `:552`; `:555`; `:559` | PASS |
| C35 | domínio sem ASP.NET Core, Mediator nem fatias | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:586`–`:588` (texto); `:598`–`:599` (reflexão) | PASS |
| C36 | testes de domínio sem banco, 20 métodos | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:619`, `:622` `Assert.Equal(metodos.Order(), declarados.Order())`, `:623` | PASS |
| C37 | `HasPendingModelChanges()` falso, sem migração | filtro 1 teste; `migracao_vazia.py f0a7c9e` exit 0 (0 arquivo); `git diff f0a7c9e HEAD -- api/Dados/Migracoes` vazio | `api.Tests/ArquiteturaTests.cs:631` `Assert.False(... HasPendingModelChanges())` | PASS |
| C38 | 2 projetos, nenhum `Repositor` | filtro 1 teste | `api.Tests/ArquiteturaTests.cs:641`, `:644`, `:645` | PASS |
| C39 | 0 `CA1502`, barreiras ativas | `dotnet build api -warnaserror:CA1502 --no-incremental` 0 erro; `ca1502_barra.sh` ok; `msg0005_barra.sh` ok; filtro `Mediator_referenciado` 1 teste | `api.Tests/ArquiteturaTests.cs:348`–`:349` `Assert.Contains("CA1502", comoErro)` / `MSG0005` | PASS |
| C40 | membros da base do `ArquiteturaTests` iguais; 3 regras verdes | verified at 9eea6e0: `arquitetura_intacta.py f0a7c9e` exit 1, igual à rodada 1: só `Handler_sem_HttpContext: mudou` (43 membros na base, 76 em HEAD); 3 filtros 1 teste cada | a diferença é só o qualificador de `api.Tests/ArquiteturaTests.cs:449`; `:281`, `:297`, `:323` | PASS (mesmo ruling do usuário do C2) |
| C41 | 7 regras da base verdes | 7 filtros, 1 teste cada | `api.Tests/ArquiteturaTests.cs:159`, `:54`–`:57`, `:113`, `:382`, `:396`, `:417`, `:450` | PASS (o `Handler_sem_HttpContext` mudou só o qualificador do ruling) |

Linhas C3–C26, C28–C39 e C41: evidência carried from 1d0753f (nenhum arquivo citado mudou); as provas foram re-rodadas
verified at 9eea6e0: os 60 filtros `FullyQualifiedName~...` distintos das linhas `Proof:` casam cada um exatamente 1
resultado `Passed` no TRX dos 329 (L-002); `retratos_antes.py` exit 0, `migracao_vazia.py` exit 0, retratos e migrações sem
diff, AD-024 `active`, `ca1502_barra.sh` e `msg0005_barra.sh` ok, build `-warnaserror:CA1502` 0 erro. Nenhum `Skip =` adicionado em `api.Tests` (`asserts_api.py` não acusou).

**`0960b70` é neutro** (carried from 1d0753f). No diff do commit, as 31 linhas adicionadas são exatamente as 31 linhas de código removidas
sem o comentário de fim de linha (comparação de multiconjunto, igual); as outras 172 linhas removidas são comentário
puro; nenhum arquivo de `api.Tests/` nem de `api/Dados/Migracoes` foi tocado. Os retratos e a suíte passam em HEAD.

## Coverage

Carried from 1d0753f: nenhum arquivo de `api/` ou `api.Tests/` mudou, então nenhum conjunto mudou de tamanho.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| entidades (24) | `api/Dados/Entidades.cs` em `f0a7c9e`: 24 classes não estáticas + 8 estáticas + `IDaInstituicao`; HEAD: modelo do `OneDb` | C34 sobre as 24 do modelo (`:545`–`:553`), as 8 estáticas em `:555`; F22 morto | - |
| criações anônimas da base (75) | `\bnew\s*\{` em `api/` de `f0a7c9e`, sem comentários: 75 em 31 arquivos | 48 somem e as 27 ficam (`Agendador` 1, `Assistente` 8, `Embeddings` 1, `Fontes` 4, `ConsultarIndicadores` 2, `OneDb` 11): C13 (`:684`–`:685`), F13 morto | - |
| records `*In` da base (21) | `record \w+In` em `f0a7c9e`: `AuthRotas` 4, `CadastroRotas` 4, `RegraRotas` 1, `UsuarioRotas` 1, `ConversaRotas` 4, `AcoesChamado` 6, `ArtigoRotas` 1 | C14 (`:710`) | - |
| `Entrada` por caso (29) | HEAD: 29 `record Entrada` aninhados; 29 rotas com `IAcceptsMetadata` JSON | C14 (`:717`, `:725`, `:727`); F12 (dois casos ligados ao mesmo `Entrada`) morto | - |
| origem do corpo das 54 mensagens JSON | HEAD: 16 `record Resposta` (15 em mensagens + o do provedor em `Embeddings.cs`), 9 arquivos em `*/Shared/` | C15 (`:778`, `:780`, `:803`), C16 (`:825`); F17 morto | - |
| rotas com corpo JSON (54) | `rotas.txt` (61 linhas) menos as 5 sem JSON (definir-senha, logout, senha, 2 downloads) e os 2 fallbacks | as 54 aparecem em `sucessos.txt` (59 linhas, 55 pares método/rota), C4 (`:306`); F16a morto | - |
| assinaturas `object` da base (16, o check diz 14) | `object`/`Task<object>`/`Func<T, object>` em assinaturas de `f0a7c9e`: `CadastroRotas` 3, `Saida` dos cadastros 4, `RegraRotas.Saida`, `UsuarioRotas.Saida`, `ConversaRotas.Responder`, `DetalheChamado.Montar` e `Mensagens`, `ListarChamados.Meus` e `Fila`, `ArtigoRotas.Saida`, `DocumentoRotas.Saida` | C17 varre todas as assinaturas por reflexão (`:853`), então as 16 estão cobertas (precision gap só na contagem do texto); F14 morto | - |
| transições e fábricas (20) | HEAD: métodos públicos declarados de `Chamado` (13), `Artigo` (4), `Documento` (3) | C36 (`:622`); cada um com caso em C21–C25, C30–C33 (linha 1 `Abrir` em `ChamadoDominioTests.cs:92`); F1–F10, F23 mortos | - |
| quem chama o `Chamado` (13 casos) | HEAD: `DesativarUsuario`, `AcoesChamado` (rejeição), 9 handlers de ação, `Transferencia` (`TransferirConversa`, `AtendimentoDireto`) | C6/C20 gravações G1–G21 (`RetratoTests.cs:502`); F16b morto | - |
| trios permitidos (32) | `PermissoesChamado.Permitidas` em HEAD: 4+3+4+3+3+1+1+3+3+4+3 = 32 (arquivo da base com só comentários a menos) | C23 (`:189`); F7 morto | - |
| cadeias de recusa (56 linhas) | ordem dos `Problemas.Invalido` em `f0a7c9e` (`UsuarioRotas` 7 + 409, `ArtigoRotas` 6, `CriarSetor` 2, `CriarCurso` 2, `CriarRespostaPronta` 3, `RegraRotas` 3, `CriarCategoria` 2): 7 + 12 + 16 + 15 + 6 | C8–C12; F26 morto | - |
| recusas que a entidade decide (6) | HEAD: `return new Recusa(` em `Chamado` 2, `Artigo` 2, `Documento` 2 | C24, C25, C31, C32; F6, F9 mortos | - |
| retratos (5) | `api.Tests/Retratos/`: `rotas.txt`, `erros.txt` iguais à base; `sucessos.txt` 59, `gravacoes.txt` 24, `importacao.txt` 1 | C3, C4, C5, C6, C7; F16a, F16b, F16c mortos | - |
| esquema (FKs e tabelas) | `git diff f0a7c9e HEAD -- api/Dados/Migracoes` vazio; o snapshot da base é a referência do `HasPendingModelChanges()` | C37 (`:631`); F15 (laço do `OneDb` pelo nome completo) morto | - |
| regra de dependência (4 partes) | door 7 | C35 texto (`:586`–`:588`) e reflexão (`:598`–`:599`); F11a e F11b mortos | - |

## Test policy rows

Carried from 1d0753f: nenhum arquivo classificado foi tocado e nenhuma linha estava não atendida.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decide, no domínio | `api/Dados/Chamados/Chamado.cs`, `Artigos/Artigo.cs`, `Documentos/Documento.cs` | sem banco: `ChamadoDominioTests`, `ArtigoDominioTests`, `DocumentoDominioTests` (C36 prova sem `OneFactory`/`OneDb`/`HttpClient`); HTTP: C6/C20, `RecusasDoDominioTests` | yes - 18/18/32 casos contados nos próprios testes, limites de C25 e C33 com os dois lados |
| Decide e é alcançado por HTTP | validadores dos 8 pares e handlers reescritos | `OrdemDasRecusasTests` C8–C12 | yes - 56 linhas recontadas da base |
| Contrato HTTP que não pode mudar | todas as respostas, importação, gravações | `RetratoTests` com retratos gravados na base (C7) | yes - 59 + 1 + 24 |
| Estrutura | contratos, `Shared`, pastas, regra de dependência, agregados, esquema | 14 regras novas no `ArquiteturaTests` | yes - cada uma morta por uma falta (F11a–F25, F15, F17) |
| Instrumentação | `Entrada`/`Resposta`, `De`/`Montar`, `Mapear` | retrato C4 | yes - F16a mostra o retrato pegando uma chave JSON trocada |

## Faults injected

Carried from 1d0753f (28 faltas, 28 mortas): o fix só toca `.specs/`, sem superfície nova para re-injetar.
Injetadas à mão no worktree (ferramenta de mutação suspensa, AD-025), sem mudar o número de ramos (barreira
`CA1502`), em 5 rodadas; cada rodada revertida com `git checkout -- api api.Tests` e porcelain do worktree vazio.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 `Confirmar` aceita `NaoFechados` em vez de `[Resolvido]` | `api/Dados/Chamados/Chamado.cs:103` | yes - `Transicao_inexistente_lanca_e_nao_muda` |
| F2 ordem dos eventos do `Encaminhar` (ATRIBUICAO antes de ENCAMINHAMENTO) | `Chamado.cs:130`–`:131` | yes - `ChamadoDominioTests.Cada_transicao_como_a_base` ("14 Encaminhar ... eventos NOTA ATRIBUICAO ENCAMINHAMENTO") |
| F3 `Rejeitar` sem `Reaberturas++` | `Chamado.cs:115` | yes - `Cada_transicao_como_a_base` (linha 11) |
| F4 prazo `>` -> `>=` | `Chamado.cs:110` | yes - `Rejeitar_no_limite_aceita_e_depois_recusa` |
| F5 `Abrir` sem o evento CRIACAO | `Chamado.cs:54` | yes - `Abrir_cria_aberto_com_o_evento_de_criacao`; **não** pela prova nomeada de C21 (`Cada_transicao_como_a_base` passa) |
| F6 texto da recusa do `Assumir` | `Chamado.cs:61` | yes - `Assumir_pelo_responsavel_recusa` e `RecusasDoDominioTests.Assumir_sendo_o_responsavel_409` |
| F7 `Anotar` exige `Abertos` | `Chamado.cs:87` | yes - `Todo_trio_permitido_e_aceito` ("nota/ATENDENTE/RESOLVIDO") |
| F8 versão do artigo `>=` -> `>` | `api/Dados/Artigos/Artigo.cs:46` | yes - `ArtigoDominioTests.Versao_sem_numero_maior_lanca` |
| F9 texto "já está arquivado" do documento | `api/Dados/Documentos/Documento.cs:32` | yes - `DocumentoDominioTests.Arquivado_recusa_versao_e_arquivar` |
| F10 `Ativar` grava `RASCUNHO` | `Artigo.cs:33` | yes - `ArtigoDominioTests.Cada_transicao_como_a_base`, `Ativar_ativo_e_arquivar_arquivado_recusam`, `RecusasDoDominioTests.Artigo_ja_ativo_ou_ja_arquivado_409` |
| F11a `using Microsoft.AspNetCore.Http;` no domínio | `api/Dados/Recusa.cs:1` | yes - `Dominio_sem_AspNetCore_Mediator_nem_fatias` (texto) |
| F11b propriedade `Microsoft.AspNetCore.Routing.RouteValueDictionary` em `Recusa`, sem `using` | `Recusa.cs` | yes - `Dominio_sem_AspNetCore_Mediator_nem_fatias` (reflexão: "Recusa usa ... RouteValueDictionary") |
| F12 `AlterarSetor` liga o corpo em `CriarSetor.Entrada` | `api/Administracao/AlterarSetor.cs:12` | yes - `Entrada_por_caso_de_uso` |
| F13 `EncerrarConversa` responde objeto anônimo com o mesmo JSON | `api/Assistente/EncerrarConversa.cs:25` | yes - `Objetos_anonimos_so_fora_das_respostas` |
| F14 `RegraResposta.De` devolve `object` | `api/Administracao/Shared/RegraResposta.cs:5` | yes - `Nenhum_corpo_tipado_object` |
| F15 laço de nomes do `OneDb` por `ClrType.FullName` | `api/Dados/OneDb.cs:141` | yes - `Modelo_sem_mudanca_pendente` (o `Migrate()` do `OneFactory` lança `PendingModelChangesWarning`) |
| F16a chave JSON `desfecho` -> `desfechoFinal` | `EncerrarConversa.cs:9` | yes - `Corpos_de_sucesso_iguais_aos_da_base` (índice 38, encerrar) |
| F16b nomes dos setores trocados no handler do encaminhamento | `api/Chamados/EncaminharChamado.cs:33` | yes - `Gravacoes_do_chamado_iguais_as_da_base` (índice 16, G17) |
| F16c chave `motivo` do erro da importação -> `erro` | `api/Administracao/CsvMatriculas.cs:4` | yes - `Erros_da_importacao_iguais_aos_da_base` |
| F17 `ListarRegras` com `Resposta` própria em vez de `RegraResposta` | `api/Administracao/ListarRegras.cs` | yes - `Shared_com_tres_usos_na_fatia` ("RegraResposta: 2 usos") e `Resposta_por_caso_de_uso` |
| F19 `NumeroOriginal` com `set` público | `Chamado.cs:38` | yes - `Chamado_fechado` |
| F20 `VersaoArtigo.ArtigoId` com `set` | `api/Dados/Artigos/VersaoArtigo.cs:7` | yes - `Artigo_e_documento_fechados` |
| F21 `new EventoChamado` num handler | `EncaminharChamado.cs` | yes - `Chamado_muda_so_pelos_metodos` |
| F22 segundo tipo no arquivo da entidade | `api/Dados/Emails/EmailSaida.cs` | yes - `Uma_entidade_por_arquivo_por_agregado` |
| F23 método público a mais em `Documento` | `Documento.cs` | yes - `Testes_de_dominio_sem_banco` |
| F24 tipo `RecusaRepositorio` | `Recusa.cs` | yes - `Dois_projetos_sem_repositorio` |
| F25 membro público a mais em `PermissoesChamado` | `api/Chamados/PermissoesChamado.cs` | yes - `Pipeline_do_chamado_com_a_forma_da_base` |
| F26 ordem título/perguntas da validação do artigo | `api/Conhecimento/ArtigoRotas.cs:19`–`:20` | yes - `OrdemDasRecusasTests.Cadeia_do_conhecimento` |

## Gate

Verified at 9eea6e0:

- `dotnet test api.Tests` - 329 passed, 0 failed (TRX; 60 filtros distintos das provas com 1 teste cada)
- `dotnet build api -warnaserror:CA1502 --no-incremental` - 0 erro, 2 avisos
- `ca1502_barra.sh` ok, `msg0005_barra.sh` ok, `migracao_vazia.py` exit 0, `retratos_antes.py` exit 0
- `asserts_api.py` exit 1 e `arquitetura_intacta.py` exit 1, os mesmos problemas da rodada 1, cobertos pelo ruling do C2 (C2, C40)
- `strip_cs.py` sobre `api/Agendador.cs` base e HEAD - iguais sem comentários (C27, ruling do C27)

Carried from 1d0753f: Playwright 31 passed, 0 failed; `dotnet test` 303/303 em `7b1bfa6`.

## Notas não bloqueantes (carried from 1d0753f)

1. **C21, precision gap** - a linha 1 da tabela (`Abrir` -> CRIACAO) é provada só por
   `ChamadoDominioTests.Abrir_cria_aberto_com_o_evento_de_criacao` (`api.Tests/ChamadoDominioTests.cs:92`), que não está no
   `Proof:` de C21; F5 passa pela prova nomeada. Acrescentar o filtro ao `Proof:` de C21.
2. **C17, precision gap** - o texto fala em "os 14 de hoje" e enumera 16; a base tem 16. A prova é exaustiva, então nada
   fica sem prova; só o número do texto está errado.
3. Bookkeeping: `checks.md` ainda tem `[ ]` em C1, C2, C19–C25 e C27–C41.
