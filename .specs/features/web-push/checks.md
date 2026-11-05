# Web Push - checks

Profile: standard
Plan: `.specs/features/web-push/plan.md`

53 checks em 4 slices · 6 one-way doors · 0 perguntas abertas que bloqueiam, 3 itens para o usuário (ver `## Handoff`)

**Como as provas rodam.** Todos os comandos rodam na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é o
commit que congela `plan.md` e este `checks.md`, gravado no `## Handoff`. Esta feature só é construída
depois que `tempo-real-signalr` estiver verificada, então `<base>` já traz as rotas, as entidades e os
testes dela: onde um check diz "N + k", N é o número lido em `<base>` e gravado pelo construtor no
`## Handoff` (L-021); o valor de HEAD em 02/11/2026 vem entre parênteses.

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `WebApplicationFactory<Program>` (`OneFactory`); `PushDominioTests` sem `OneFactory`, `OneDb` nem `HttpClient` | `docker compose up -d postgres mailpit` |
| `web/` unidade | Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"` | `npm --prefix web ci` |
| `web/` e2e | Playwright (`npm --prefix web run e2e`) com `E2E_URL` | imagem própria desta feature na porta 8083 (ver `## Handoff`) |
| build e PWA | `npm --prefix web run build` (grava `api/wwwroot`) e `.specs/features/interface-nova/precache_completo.py` | `npm --prefix web ci` |
| barreiras | `dotnet build api` (CA1502, AD-018); `crapper` e `dryer` em `web/` (AD-018); mutação suspensa (AD-025), nenhum check de `mutator` | `npm --prefix web run coverage` |

Um filtro que não seleciona teste algum sai com código 0 (L-002): o construtor confere, no relatório,
que cada `--filter` (xUnit v3: `FullyQualifiedName~Classe.Metodo`), cada `-t` (Vitest) e cada `-g`
(Playwright, com `--list`) executa pelo menos 1 teste, e o número que o check diz. O nome citado numa
linha `Proof:` é o contrato: classe ou método que não existe em `<base>` é criado com exatamente esse nome
(L-022). Classes novas em `api.Tests`: `PushRotasTests`, `PushBancoTests`, `PushDominioTests`,
`PushComandoTests`, `PushAvisosTests`, `PushAgendadorTests`, `PushEnviadorTests`. Métodos novos em
`ArquiteturaTests`: 4. Arquivos novos em `web/`: `src/sw.ts`, `src/sw.test.ts`, `src/push.ts`,
`src/AvisosPush.tsx`, `src/assistente/avisos.test.tsx`, `e2e/push.spec.ts`. O `OneFactory` ganha o par
VAPID de teste, o enviador simulado `f.Push` (grava `Envios` com endpoint, `p256dh`, `auth` e payload, e
falha sob comando) e a variante `OneFactoryEnviadorReal`, no padrão de `OneFactoryComLimites`.

**Dois pontos do plano que o HEAD contradiz** (os checks seguem o HEAD; ver `## Handoff`): (1) o plano
manda o botão para `Cabecalho.tsx`, mas esse arquivo é só o título das listas; o menu do aluno, com "Sair",
está em `web/src/Autenticado.tsx`; (2) o plano cita `api/Comando/`, que não existe (`Fatias_do_api` exige
só as 7 fatias e `Dados`); o comando de linha é uma classe de fatia chamada de `Program.cs`, como
`InstituicaoComando`.

## Checks

### S1 - Subscrição, tabelas, rotas e configuração (P1) · ~20 files · ~215 KB · ~58k

**C1** - [x] A suíte inteira da API passa em cada commit desta feature; a única edição em asserção existente é a de número que as entidades e rotas novas movem (C11, C12, C13, `Tabela_de_rotas_igual_a_da_base`) (AC 9)
Proof: `dotnet test api.Tests`

**C2** - [x] `GET /api/push/chave` com o cookie de um aluno e `Push:ChavePublica` e `Push:ChavePrivada` preenchidas responde `200` com o corpo JSON de uma só chave, `chavePublica`, igual à configurada (AC 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Chave_200_com_a_chave_configurada"`

**C3** - [x] Sem o par completo o push está desligado: `GET /api/push/chave` e `POST /api/push/subscricao` respondem `404` em cada um dos 3 estados da configuração (as duas vazias, só a pública, só a privada), 6 pedidos; `DELETE /api/push/subscricao` continua `204` com as duas vazias (AC 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Chave_204_sem_par_completo"` (nota de 04/11: substituído por `ajustes-push-e-links` C1 - o `GET /api/push/chave` passou a responder `204` com o push desligado, e o `POST` continua `404`; o teste antigo `Sem_par_completo_404_nas_duas_rotas` foi renomeado para este)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Delete_204_mesmo_sem_chaves"`

**C4** - [x] `POST /api/push/subscricao` com `endpoint` https, `chaves.p256dh` e `chaves.auth` responde `204` sem corpo e grava 1 `SubscricaoPush` com `usuario_id` e `instituicao_id` do cookie e as duas chaves enviadas (AC 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Post_204_grava_usuario_e_instituicao_do_cookie"`

**C5** - [x] `POST /api/push/subscricao` responde `400` com o corpo `ProblemDetails` do app (`status` 400, `title` "Requisição inválida", `detail` não vazio) e não grava linha, em 6 entradas: endpoint `http://...`, endpoint com 2049 caracteres, endpoint ausente, `p256dh` ausente, `auth` ausente, objeto `chaves` ausente; com endpoint de exatamente 2048 caracteres responde `204` (AC 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Post_400_nas_entradas_invalidas"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Post_204_com_endpoint_de_2048_caracteres"`

**C6** - [x] `POST` de um `endpoint` que já existe mantém uma só linha para ele e troca o dono e as chaves, em 3 casos: do mesmo usuário (chaves novas, sem duplicar), de outro usuário da mesma instituição e de usuário de outra instituição (a linha passa a ter o `usuario_id` e o `instituicao_id` do cookie) (AC 5, door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Post_de_endpoint_existente_move_a_linha"`

**C7** - [x] Ao gravar a 11ª subscrição de um usuário a mais antiga dele, pela data do último `POST` dela (`registrada_em`, atualizada a cada `POST`, de modo que a linha recém-gravada nunca é a apagada), é apagada e ficam 10; com 10 nada é apagado; as subscrições de outro usuário não mudam (AC 6, door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Post_11a_subscricao_apaga_a_mais_antiga"`

**C8** - [x] `DELETE /api/push/subscricao` responde `204` em 4 casos e só apaga a linha do próprio usuário: endpoint seu (a linha some), endpoint que não existe, endpoint de outro usuário da mesma instituição (a linha dele fica), endpoint de usuário de outra instituição (a linha dele fica) (AC 7, AC 9)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Delete_204_nos_quatro_casos"`

**C9** - [x] `DELETE /api/push/subscricao` responde `400` com o `ProblemDetails` do app e não apaga nada quando o `endpoint` falta ou é vazio, 2 pedidos (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Delete_400_sem_endpoint"`

**C10** - [x] Sem cookie válido as 3 rotas respondem `401`, com as chaves configuradas (AC 8)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushRotasTests.Sem_cookie_401_nas_tres_rotas"`

**C11** - [x] A tabela de rotas ganha exatamente 3 linhas e perde nenhuma: `api.Tests/Retratos/rotas.txt` recebe, contíguas e nesta ordem, imediatamente antes das duas linhas de fallback, `GET /api/push/chave anonimo=False autorizacao=True limite=-`, `POST /api/push/subscricao anonimo=False autorizacao=True limite=-` e `DELETE /api/push/subscricao anonimo=False autorizacao=True limite=-`; em `RetratoTests.Tabela_de_rotas_igual_a_da_base` os três números sobem em 3 (total N + 3, com N = 61; rotas de um só método N + 3, com N = 59; com autorização N + 3, com N = 59) e nenhuma outra asserção muda (Surface)
Proof: `! git diff <base> HEAD -- api.Tests/Retratos/rotas.txt | grep -q '^-[^-]'`
Proof: `test "$(git diff <base> HEAD -- api.Tests/Retratos/rotas.txt | grep -c '^+[^+]')" -eq 3`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_igual_a_da_base"`

**C12** - [x] Toda tabela do modelo, as 2 novas incluídas, tem `instituicao_id` `bigint` não nulo, chave estrangeira para `instituicao` e filtro global: `subscricao_push` e `push_saida` entram em `TabelasDaInstituicao` (N + 2 tabelas, N = 23) (AC 9, AD-008)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro"`

**C13** - [x] O modelo passa a ter N + 2 tipos de entidade (N = 24): `SubscricaoPush` e `PushSaida` ficam em `api/Dados/Push/<Tipo>.cs`, um tipo por arquivo, namespace `One.Api.Dados.Push`, a pasta `Push` entra em `EntidadesPorPasta` e o `<Using Include="One.Api.Dados.Push" />` entra em `api/One.Api.csproj` e em `api.Tests/One.Api.Tests.csproj` (AD-024, door 2, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Uma_entidade_por_arquivo_por_agregado"`

**C14** - [x] No banco, `subscricao_push.endpoint` é único na tabela inteira (a segunda linha com o mesmo endpoint, de outra instituição, viola o índice); apagar a `SubscricaoPush` apaga em cascata as suas `PushSaida`; as colunas das tabelas são exatamente as 7 de `subscricao_push` (`id`, `instituicao_id`, `usuario_id`, `endpoint`, `p256dh`, `auth`, `registrada_em`) e as 7 de `push_saida` (`id`, `instituicao_id`, `subscricao_id`, `chamado_id`, `tentativas`, `proxima_tentativa`, `enviado_em`), sem coluna de texto do aviso (door 2, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushBancoTests.Endpoint_unico_no_banco"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushBancoTests.Push_saida_some_com_a_subscricao"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushBancoTests.Colunas_das_duas_tabelas"`

**C15** - [x] As duas entidades decidem pelos próprios métodos, sem setter público (AD-024): `SubscricaoPush.Registrar` guarda usuário, instituição, endpoint e chaves; `SubscricaoPush.Reatribuir` troca usuário, instituição e chaves e deixa o endpoint; `PushSaida.RegistrarFalha(agora)` faz `Tentativas` subir 1 e `ProximaTentativa = agora + 2^Tentativas minutos`, nas 5 falhas seguidas (2, 4, 8, 16 e 32 minutos); `PushSaida.Concluir(agora)` grava `EnviadoEm = agora`; por reflexão nenhuma propriedade pública das duas tem setter público (door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushDominioTests.Registrar_e_reatribuir_trocam_so_o_que_devem"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushDominioTests.Falha_agenda_2_elevado_a_n_minutos"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushDominioTests.Concluir_grava_enviado_em"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushDominioTests.Sem_setter_publico"`

**C16** - [x] O comando `push chaves` (chamado de `Program.cs`; `dotnet run --project api -- push chaves`) imprime em `saida` exatamente 2 linhas, `PUSH_CHAVE_PUBLICA=<valor>` e `PUSH_CHAVE_PRIVADA=<valor>`, e sai 0; a pública decodifica de base64url para 65 bytes começando em `0x04` e a privada para 32 bytes; duas execuções dão pares diferentes; qualquer outro argumento escreve `uso: push chaves` em `erro` e sai 1 (door 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushComandoTests.Imprime_par_vapid_decodificavel"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushComandoTests.Dois_pares_diferem"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushComandoTests.Argumento_desconhecido_sai_1"`

**C17** - [x] Cada chave `Push:ChavePublica`, `Push:ChavePrivada` e `Push:Assunto` é lida num só lugar do código do `api/` (3 chaves, 1 leitura cada), no padrão de `Configuracao_lida_em_um_lugar` (door 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Push_configuracao_lida_em_um_lugar"`

**C18** - [x] O `docker-compose.yml` repassa ao serviço `api` as 3 variáveis, `Push__ChavePublica: ${PUSH_CHAVE_PUBLICA:-}`, `Push__ChavePrivada: ${PUSH_CHAVE_PRIVADA:-}` e `Push__Assunto: ${PUSH_ASSUNTO:-}`; nenhum `appsettings*.json` versionado traz valor não vazio em `Push:ChavePrivada`; `.env` segue em `.gitignore` (door 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Push_chaves_fora_do_git"`

**C19** - [x] `.specs/GLOSSARIO.md` lista os termos novos `SubscricaoPush` e `PushSaida`, cada um numa linha de tabela com significado de pelo menos 10 caracteres (Impact, domain)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Glossario_lista_subscricao_e_push_saida"`

### S2 - Os mesmos eventos do e-mail enfileiram push (P1) · ~6 files · ~50 KB · ~13k

**C20** - [x] Em cada uma das 5 origens que já enfileiram e-mail do solicitante, a mesma transação cria também 1 `PushSaida` por `SubscricaoPush` dele (aluno com 2 subscrições dá 2 linhas), com o `chamado_id` do chamado e `ProximaTentativa` igual ao relógio: `ResponderChamado` -> `Avisos.NovaResposta`, `MarcarDuplicado` -> `Avisos.NovaResposta`, `ResolverChamado` -> `Avisos.Resolvido`, `Agendador.ResolverSemResposta` -> `Avisos.Resolvido`, `Agendador.Lembrar` -> `Avisos.AguardaResposta`; o `EmailSaida` de cada uma continua criado, 1 por origem (AC 10)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAvisosTests.Cinco_origens_enfileiram_push_por_aparelho"`

**C21** - [x] O e-mail é criado e nenhuma `PushSaida` nasce em 2 casos: o solicitante não tem subscrição; o solicitante tem subscrição mas `Push:ChavePrivada` está vazia (AC 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAvisosTests.Sem_subscricao_ou_sem_chaves_so_email"`

**C22** - [x] Se a transação do evento falha (um gatilho do banco recusa o `INSERT` em `push_saida`, no padrão de `Falha_num_item_segue_os_outros`), o pedido responde `500`, e não existe `EmailSaida`, `PushSaida` nem mensagem do atendente criados por ela (AC 12)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAvisosTests.Falha_na_transacao_nao_deixa_email_nem_push"`

**C23** - [x] Só o solicitante é avisado: quando o atendente responde, resolve ou marca duplicado, as `PushSaida` criadas pertencem só às subscrições do solicitante; uma subscrição do próprio atendente e uma de outro aluno da mesma instituição recebem 0 (AC 13)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAvisosTests.So_o_solicitante_recebe"`

### S3 - O agendador envia, repete e limpa (P1) · ~9 files · ~120 KB · ~30k

**C24** - [x] `api/One.Api.csproj` referencia `WebPush` na versão `1.0.13` e nenhuma outra biblioteca de push (door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Pacote_webpush_fixo"`

**C25** - [x] `Agendador.Ler` devolve o item `push` só da `PushSaida` pendente: lida a vencida com `EnviadoEm` nulo e 0 tentativas, lida a com 4 tentativas; não lidas a de `ProximaTentativa` no futuro, a com `EnviadoEm` preenchido e a com 5 tentativas (5 linhas, 2 lidas, 3 não) (AC 14, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Le_so_pendente_vencida_com_menos_de_5_tentativas"`

**C26** - [x] Com o enviador simulado, `Agendador.Executar` sobre 1 `PushSaida` pendente faz exatamente 1 chamada com o `endpoint`, o `p256dh` e o `auth` da subscrição e o payload da door 4, e grava `EnviadoEm` igual ao relógio; um segundo `Executar` não chama de novo (AC 14)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Envia_ao_endpoint_com_as_chaves_e_marca_enviado"`

**C27** - [x] Para o chamado `ONE-12` da instituição de slug `univag`, o payload enviado é exatamente a string `{"titulo":"One","corpo":"Seu chamado ONE-12 foi atualizado.","url":"/univag/chamados/ONE-12"}`, com 3 chaves, e não contém nenhum de 5 dados do cenário: nome do aluno, e-mail, CPF, texto de uma mensagem e assunto do chamado (AC 15, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Payload_exato_sem_dado_pessoal"`

**C28** - [x] Quando o enviador falha com status `404` ou `410` a `SubscricaoPush` é apagada com todas as suas `PushSaida` (as de outros chamados também) e um segundo ciclo não chama o enviador; 2 casos (AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Status_404_e_410_apagam_a_subscricao"`

**C29** - [x] Qualquer outra falha (status `500`, `429`, `403`, ou exceção sem status) soma 1 em `Tentativas` e define `ProximaTentativa = agora + 2^Tentativas minutos`: 2, 4, 8, 16 e 32 minutos nas 5 falhas seguidas, com 1 `LogWarning` por falha das 4 primeiras; na 5ª o agendador registra 1 `LogError` com a instituição e o id da linha e, 1 dia depois, não lê mais a linha; a subscrição fica (AC 17)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Outras_falhas_repetem_e_desistem_na_quinta"`

**C30** - [x] Uma `PushSaida` marcada como enviada depois de `Agendador.Ler` e antes de `Agendador.Processar` não chama o enviador (0 chamadas) e `EnviadoEm` fica como estava (AC 18)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Enviada_entre_a_leitura_e_o_processamento_nao_reenvia"`

**C31** - [x] Um push que falha e um push que demora não impedem o resto do ciclo: no mesmo `Executar`, com o 1º push lançando exceção, o 2º push, 1 e-mail e 1 conversa parada são processados (4 efeitos); com o enviador pendurado, o envio é cancelado quando o relógio avança 30 s, conta como falha (`Tentativas` 1) e o resto do ciclo roda (AC 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Falha_e_demora_do_push_seguem_os_outros_itens"`

**C32** - [x] Cada `PushSaida` é processada com a instituição da própria linha: com 2 instituições de slugs diferentes, ambas recebem a chamada e o `url` de cada payload traz o slug da sua; uma `PushSaida` da instituição A cuja subscrição foi movida para a instituição B (C6) não chama o enviador e não é lida de novo no ciclo seguinte (AC 9, AC 20)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Cada_item_usa_a_instituicao_da_linha"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushAgendadorTests.Subscricao_movida_de_instituicao_nao_recebe_item_antigo"`

**C33** - [x] O enviador real, com um `HttpMessageHandler` capturador no lugar da rede e uma subscrição de teste de chaves válidas, faz 1 `POST` ao `endpoint` com `Content-Encoding: aes128gcm`, cabeçalho `Authorization` de esquema `vapid` com `t=` e `k=` igual à chave pública configurada e corpo cifrado que não contém o texto "One"; resposta `404` e resposta `410` chegam ao chamador como o status `404` e `410` (door 1, AC 14, AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushEnviadorTests.Real_envia_post_cifrado_com_vapid"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushEnviadorTests.Real_expoe_404_e_410_como_status"`

**C34** - [x] O host sem a troca da fábrica de teste (`OneFactoryEnviadorReal`) resolve o enviador de push como a classe em volta de `WebPushClient`, não como o simulado (startup, `Program.cs`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PushEnviadorTests.Producao_registra_o_enviador_real"`

**C35** - [x] `dotnet build api` sai 0 com `Agendador.Processar` e todo método novo em complexidade ciclomática 10 ou menos (CA1502 em `WarningsAsErrors`); se o `switch` estourar, o despacho dos itens de fila sai para um método (AD-018, Impact)
Proof: `dotnet build api`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Barreira_de_complexidade_configurada"`

### S4 - Service worker, notificação e botão (P2) · ~14 files · ~100 KB · ~26k

**C36** - [x] A suíte Vitest inteira (N testes em `<base>`, N gravado no `## Handoff`; 168 em 02/11/2026) e `npm --prefix web run build` (`tsc --noEmit && vite build`) passam em cada commit desta fatia, com os testes novos e sem asserção removida, pulada nem afrouxada (AC 29)
Proof: `cd web && npx vitest run`
Proof: `npm --prefix web run build`

**C37** - [x] `src/test/estrutura.test.ts` passa com os arquivos novos na raiz de `web/src` (`sw.ts`, `sw.test.ts`, `push.ts`, `AvisosPush.tsx`); a única edição nele é acrescentar esses nomes à lista `Raiz`, e `assistente/avisos.test.tsx` abre uma rota da própria fatia (`abrir('/univag/assistente')`)
Proof: `cd web && npx vitest run src/test/estrutura.test.ts -t "estrutura em fatias"`

**C38** - [x] O `crapper` sobre `web/src` inteiro sai 0 no limite 9.99 depois da cobertura, com os arquivos novos (AD-018)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`

**C39** - [x] O `dryer` sobre as 6 fatias e os arquivos da raiz, com `src/sw.ts`, `src/push.ts` e `src/AvisosPush.tsx` acrescentados à lista no mesmo commit que os cria (L-031), não acha candidato com nota 0.8 ou mais (AD-018)
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx src/sw.ts src/push.ts src/AvisosPush.tsx | grep -q "No duplicate candidates found"`

**C40** - [x] Com `vite-plugin-pwa` em `strategies: 'injectManifest'` (`srcDir: 'src'`, `filename: 'sw.ts'`, `registerType: 'autoUpdate'`, manifesto atual e `globPatterns` da door 5), o build grava `api/wwwroot/sw.js` na raiz e `precache_completo.py` sai 0: todo `.js`, `.css`, `.html`, `.png`, `.svg` e `.woff2` do build (fora `sw.js` e `workbox-*.js`) está no precache e nenhuma URL começa com `api/` nem `/api/`; o script aceita o manifesto injetado com chaves entre aspas (`"url":"..."`) além de `url:"..."`, e o `--autoteste` ganha um caso para cada formato, mais os 5 que já tem, sem enfraquecer nenhum (AC 29, door 5)
Proof: `python .specs/features/interface-nova/precache_completo.py --autoteste`
Proof: `npm --prefix web run build && python .specs/features/interface-nova/precache_completo.py api/wwwroot`

**C41** - [x] O teste e2e existente do service worker continua verde com o `sw.js` novo: com a página controlada pelo worker, `/api/auth/me` responde `401` (não `index.html`) e nenhuma URL `/api/` está nos caches (AC 29)
Proof: `E2E_URL=http://localhost:8083 npx playwright test e2e/plataforma.spec.ts -g "manifesto e service worker"`

**C42** - [x] O tratador `push` do `sw.ts`, exercitado como função pura com registro falso, chama `showNotification` com o `titulo`, o `corpo` como `body` e `tag` igual ao número do chamado tirado do último trecho do `url` (`ONE-12` para `/univag/chamados/ONE-12`; dois avisos do mesmo chamado têm a mesma `tag`, `ONE-12` e `ONE-13` têm tags diferentes); com 4 cargas sem JSON legível (sem dados, texto que não é JSON, `[]`, `{}`) mostra título "One" e corpo "Seu chamado foi atualizado." (AC 21, AC 23)
Proof: `cd web && npx vitest run src/sw.test.ts -t "push mostra a notificação com a tag do chamado"`
Proof: `cd web && npx vitest run src/sw.test.ts -t "push sem JSON legível mostra o texto padrão"`

**C43** - [x] O tratador `notificationclick`, com clientes falsos, fecha a notificação e, em 3 casos: com janela aberta do app, chama `navigate(url)` e `focus()` nela e não chama `openWindow`; sem janela, chama `openWindow(url)` uma vez; notificação sem `url` (a do texto padrão), abre `/` (AC 22)
Proof: `cd web && npx vitest run src/sw.test.ts -t "toque na notificação"`

**C44** - [x] O `sw.ts` registra o fallback de navegação para `/index.html` com a lista de negados que casa `/api/auth/me` e `/api/push/chave` e não casa `/univag/chamados/ONE-12` (AC 29)
Proof: `cd web && npx vitest run src/sw.test.ts -t "fallback de navegação nega a API"`

**C45** - [x] O botão de avisos fica oculto em 4 casos e aparece no quinto: navegador sem `serviceWorker`, sem `PushManager`, sem `Notification`, `GET /api/push/chave` com `404`; com os três recursos e a chave `200` aparece com o texto "Ativar avisos neste aparelho" (AC 24)
Proof: `cd web && npx vitest run src/assistente/avisos.test.tsx -t "botão de avisos oculto sem suporte ou sem chave"`
Proof: `cd web && npx vitest run src/assistente/avisos.test.tsx -t "botão de avisos aparece com suporte e chave"`

**C46** - [x] A permissão do navegador nunca é pedida ao carregar (0 chamadas a `Notification.requestPermission` depois de renderizar e de a chave chegar); ao tocar em "Ativar avisos neste aparelho" pede a permissão 1 vez e só então chama `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` com a chave pública da API em bytes e `POST /api/push/subscricao` com o corpo `{ endpoint, chaves: { p256dh, auth } }`, nessa ordem; o botão fica desabilitado enquanto a chamada corre e o texto passa a "Desativar avisos" (AC 25)
Proof: `cd web && npx vitest run src/assistente/avisos.test.tsx -t "permissão só no toque"`
Proof: `cd web && npx vitest run src/assistente/avisos.test.tsx -t "ativar assina e envia a subscrição"`
Proof: `cd web && npx vitest run src/assistente/avisos.test.tsx -t "botão desabilitado enquanto a chamada corre"`

**C47** - [x] Com a permissão negada no toque, a tela mostra "Os avisos estão bloqueados neste navegador" e há 0 chamadas a `subscribe` e a `/api/push/subscricao` (AC 26)
Proof: `cd web && npx vitest run src/assistente/avisos.test.tsx -t "permissão negada bloqueia sem chamar a API"`

**C48** - [x] Com uma subscrição local ativa, o botão mostra "Desativar avisos"; ao tocar chama `unsubscribe()` nela e `DELETE /api/push/subscricao` com o corpo `{ endpoint }` e volta a "Ativar avisos neste aparelho" (AC 27)
Proof: `cd web && npx vitest run src/assistente/avisos.test.tsx -t "desativar cancela e apaga a subscrição"`

**C49** - [x] O botão aparece só para quem tem o papel `ALUNO`: aparece para `ALUNO` e para `ALUNO` + `ATENDENTE`, fica oculto para `ATENDENTE` e para `ADMINISTRADOR`, 4 conjuntos de papéis, com os recursos e a chave presentes (AC 28)
Proof: `cd web && npx vitest run src/assistente/avisos.test.tsx -t "botão de avisos só para o papel de aluno"`

**C50** - [x] No build servido pela imagem desta feature, `GET /sw.js` responde `200` com `content-type` de JavaScript e o texto contém `push` e `notificationclick`; a página registra o worker com `scriptURL` terminando em `/sw.js` (door 5)
Proof: `E2E_URL=http://localhost:8083 npx playwright test e2e/push.spec.ts -g "sw.js na raiz traz os tratadores de push"`

**C51** - [x] No navegador real, com `/api/push/chave` simulada em `200` e o papel `ALUNO`, o botão "Ativar avisos neste aparelho" fica visível e `Notification.permission` continua `default` depois do carregamento; com a rota em `404` o botão não existe (AC 24, AC 25)
Proof: `E2E_URL=http://localhost:8083 npx playwright test e2e/push.spec.ts -g "botão de avisos aparece com a chave e não pede permissão ao carregar"`
Proof: `E2E_URL=http://localhost:8083 npx playwright test e2e/push.spec.ts -g "sem a chave o botão de avisos não existe"`

**C52** - [x] Com o botão presente (papel `ALUNO`, chave simulada), a barra do `Autenticado` não tem rolagem horizontal (`documentElement.scrollWidth` no máximo igual à largura) nem caixas sobrepostas entre os seus itens (links, Tema, botão de avisos, Menu ou Sair; tolerância de 1 px) nas 4 larguras 360, 640, 1024 e 1536 px (L-026)
Proof: `E2E_URL=http://localhost:8083 npx playwright test e2e/push.spec.ts -g "barra com o botão de avisos sem sobreposição"`

**C53** - [x] O e2e inteiro (N testes em `<base>`, N + 5 com os novos de `push.spec.ts`) passa na imagem desta feature (AC 29)
Proof: `E2E_URL=http://localhost:8083 npm --prefix web run e2e`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/push/chave` statuses (3) | 200 C2 · 401 C10 · 404 C3 | - |
| `POST /api/push/subscricao` statuses (4) | 204 C4 · 400 C5 · 401 C10 · 404 C3 | - |
| `DELETE /api/push/subscricao` statuses (3) | 204 C8 · 400 C9 · 401 C10 | - |
| estado do par de chaves (4) | as duas preenchidas C2 · as duas vazias C3 · só a pública C3 · só a privada C3 | - |
| entradas inválidas do `POST` (6) | endpoint http C5 · endpoint 2049 C5 · endpoint ausente C5 · `p256dh` ausente C5 · `auth` ausente C5 · `chaves` ausente C5 | - |
| bordas do `endpoint` (2) | 2048 aceito C5 · 2049 recusado C5 | - |
| `POST` de endpoint existente (3) | mesmo usuário C6 · outro usuário, mesma instituição C6 · outra instituição C6 | - |
| limite por usuário (3) | 10 mantém C7 · 11ª apaga a mais antiga C7 · outro usuário intacto C7 | - |
| `DELETE` por endpoint (4) | seu C8 · inexistente C8 · de outro usuário C8 · de outra instituição C8 | - |
| `DELETE` sem endpoint (2) | ausente C9 · vazio C9 | - |
| rotas novas na tabela (3) | `GET /api/push/chave` C11 · `POST /api/push/subscricao` C11 · `DELETE /api/push/subscricao` C11 | - |
| tabelas novas (2) | `subscricao_push` C12, C13, C14 · `push_saida` C12, C13, C14 | - |
| colunas de `subscricao_push` (7) | `id` · `instituicao_id` · `usuario_id` · `endpoint` · `p256dh` · `auth` · `registrada_em`: C14, table-driven sobre as 7 | - |
| colunas de `push_saida` (7) | `id` · `instituicao_id` · `subscricao_id` · `chamado_id` · `tentativas` · `proxima_tentativa` · `enviado_em`: C14, table-driven sobre as 7 | - |
| métodos das entidades (4) | `Registrar` C15 · `Reatribuir` C15 · `RegistrarFalha` C15 · `Concluir` C15 | - |
| argumentos do comando `push` (3) | `chaves` C16 · duas execuções C16 · qualquer outro C16 | - |
| origens de `Avisos` (5) | `ResponderChamado` C20 · `MarcarDuplicado` C20 · `ResolverChamado` C20 · `Agendador.ResolverSemResposta` C20 · `Agendador.Lembrar` C20 | - |
| eventos de `Avisos` (3) | `NovaResposta` C20 · `Resolvido` C20 · `AguardaResposta` C20 | - |
| condições sem push (2) | sem subscrição C21 · sem chaves C21 | - |
| destinatários (3) | solicitante recebe C20 · atendente autor não C23 · outro aluno não C23 | - |
| linhas de `push_saida` lidas (5) | vencida pendente C25 · 4 tentativas C25 · futura C25 · já enviada C25 · 5 tentativas C25 | - |
| falhas do serviço de push (6) | 404 C28 · 410 C28 · 500 C29 · 429 C29 · 403 C29 · exceção sem status C29 | - |
| tentativas de envio (5) | 1ª, 2 min C29 · 2ª, 4 min C29 · 3ª, 8 min C29 · 4ª, 16 min C29 · 5ª, desiste com `LogError` C29 | - |
| continuidade do ciclo (4) | push seguinte C31 · e-mail C31 · conversa C31 · push pendurado cancelado aos 30 s C31 | - |
| chaves do payload (3) | `titulo` C27 · `corpo` C27 · `url` C27 | - |
| dados excluídos do payload (5) | nome C27 · e-mail C27 · CPF C27 · texto da mensagem C27 · assunto C27 | - |
| cargas do evento `push` no worker (5) | JSON legível C42 · sem dados C42 · texto que não é JSON C42 · `[]` C42 · `{}` C42 | - |
| casos do `notificationclick` (3) | janela aberta C43 · sem janela C43 · sem `url` C43 | - |
| condições do botão (5) | sem `serviceWorker` C45 · sem `PushManager` C45 · sem `Notification` C45 · chave 404 C45 · tudo presente C45 | - |
| estados da permissão (3) | `default` no carregamento C46, C51 · concedida no toque C46 · negada C47 | - |
| conjuntos de papéis do botão (4) | `ALUNO` C49 · `ALUNO` + `ATENDENTE` C49 · `ATENDENTE` C49 · `ADMINISTRADOR` C49 | - |
| larguras da barra com o botão (4) | 360 C52 · 640 C52 · 1024 C52 · 1536 C52 | - |
| arquivos novos na raiz de `web/src` (4) | `sw.ts` C37, C39 · `sw.test.ts` C37 · `push.ts` C37, C39 · `AvisosPush.tsx` C37, C39 | - |
| one-way doors do `Landing` (6) | 1 NuGet C24, C33 · 2 `subscricao_push` C6, C7, C14 · 3 `push_saida` C14, C20, C25 · 4 payload C27, C42 · 5 `injectManifest` C40, C41, C50 · 6 chaves VAPID C16, C17, C18 | - |
| startup config: chaves e enviador (3 lugares) | `Program.cs` de produção C34 · `OneFactory` (par de teste e enviador simulado) C2, C26 · `docker-compose.yml` C18 | - |
| fronteira, config de build (2 lugares) | `vite.config.ts` com `injectManifest` C40 · `src/main.tsx` com `registerSW` apontando para o `sw.js` novo C41, C50 | - |

- Claims que nomeiam status, rota ou forma de resposta: C2 a C11, C41, C50; cada um tem prova que cruza a fronteira HTTP
- As provas de camada própria (sem HTTP) são as de decisão: C15 (entidades), C25 a C32 (agendador sobre o enviador simulado), C33 (enviador real sobre a rede simulada), C42 a C44 (worker); nenhum desses checks é dado por provado pelo e2e
- Nenhum outro check afirma mais que o caso que a sua prova exercita
- Entrega real do push no navegador, com a chave VAPID de verdade, não é automatizada: fica como verificação manual de go-live (ver `## Out of scope`)

## Swept

- validation: C5 (6 entradas e a borda de 2048), C9, C6 (endpoint existente), C7 (limite), C16 (argumento do comando)
- failure modes: C22 (transação), C28 e C29 (falha do serviço de push), C31 (falha e demora não param o ciclo), C47 (permissão negada)
- idempotency: C6 (mesmo endpoint), C8 (apagar o inexistente), C26 (segundo ciclo não reenvia), C30 (já enviada)
- authorization: C10 (401 nas 3 rotas), C12 (filtro de instituição), C8 e C32 (nunca a linha de outro usuário nem de outra instituição), C23 (só o solicitante), C49 (só o papel de aluno)
- concurrency: C30 (enviada entre a leitura e o processamento); duas execuções simultâneas do agendador não têm prova: o agendador é uma instância única (AD-022), registrado no `## Handoff`
- data lifecycle: C28 (apagar subscrição leva as `PushSaida`), C14 (cascata e índice único), C7 (limite), C8 (apagar)
- dependency failure: C28, C29, C31, C33 (serviço de push, em 4 formas: 404/410, outro status, exceção, demora)
- state transitions: C15 (`PushSaida` só vai de pendente a enviada por `Concluir`; as tentativas só sobem por `RegistrarFalha`)
- observability: C29 (`LogWarning` por tentativa, `LogError` na desistência, com instituição e id), existing - `log.LogWarning` e `log.LogError` do `Enviar` do e-mail no padrão

## Out of scope

- push para o atendente - o plano restringe ao aluno, decisão do usuário em 02/11/2026
- push de "chamado novo na fila" ou "transferido" - eventos que não geram e-mail hoje
- preferências por tipo de evento, horário silencioso, painel de subscrições - não pedidos
- texto da resposta ou do assunto na notificação - LGPD (C27)
- entrega do push ao navegador real com a chave VAPID de verdade, e em iOS - verificação manual de go-live, dita como não automatizada; o Playwright não recebe push real
- limpeza das linhas enviadas de `push_saida` - espelha `email_saida`
- mutação (`mutator`) - suspensa por AD-025, nenhum check de mutação aqui

## Handoff

Tamanho estimado por slice = (2 × bytes dos arquivos existentes que a slice reescreve inteiros, contados em
HEAD com `git cat-file -s`, + 1 × bytes dos arquivos grandes editados por trechos, + bytes dos arquivos
novos estimados) / 4 + 8k de saída das suítes. Contexto fixo por construtor: este `checks.md` (39 700 B)
+ `plan.md` (19 341 B) + `build.md` (11 542 B) = 70 583 B / 4 ≈ 17,6k, mais o diff que já entrou ≈ 5k,
total 22,6k.

| Slice | Existentes (B) | Novos (B, est.) | Conta | ≈ |
| --- | --- | --- | --- | --- |
| S1 | 2 × 37 586 (`OneDb.cs`, `Program.cs`, os 2 `.csproj`, `OneFactory.cs`, `docker-compose.yml`, `GLOSSARIO.md`, `rotas.txt`) + 1 × 89 159 (`RetratoTests.cs`, `ArquiteturaTests.cs`); a migração e o snapshot são gerados pela ferramenta, 0 | 36 000 (2 entidades, `PushRotas`, comando, 4 classes de teste, 4 métodos de arquitetura) | (75 172 + 89 159 + 36 000) / 4 + 8k | 58k |
| S2 | 2 × 1 910 (`Avisos.cs`) + 1 × 8 000 lidos (`Balcao.cs`, `Cenario.cs`) | 9 000 (`PushAvisosTests`) | (3 820 + 8 000 + 9 000) / 4 + 8k | 13k |
| S3 | 2 × 29 242 (`Agendador.cs` 11 258, `Program.cs` 5 463, `OneFactory.cs` 10 915, `One.Api.csproj` 1 606) + 1 × 11 178 lidos (`AgendadorTests.cs` 7 178, trechos de `ArquiteturaTests.cs` 4 000) | 23 000 (enviador e interface, `PushAgendadorTests`, `PushEnviadorTests`) | (58 484 + 11 178 + 23 000) / 4 + 8k | 31k |
| S4 | 2 × 16 991 (`Autenticado.tsx`, `vite.config.ts`, `main.tsx`, `package.json`, `estrutura.test.ts`, `precache_completo.py`) + 1 × 10 250 lidos (`setup.ts`, `arranjo.spec.ts`, `simulada.ts`) | 27 000 (`sw.ts`, `sw.test.ts`, `push.ts`, `AvisosPush.tsx`, `avisos.test.tsx`, `push.spec.ts`) | (44 232 + 27 000) / 4 + 8k | 26k |

- Soma das slices: 58k + 13k + 31k + 26k = 128k; com o contexto fixo uma vez, 150,6k - acima do budget de 150k (por 0,6k, dentro do erro da estimativa; o usuário já escolheu o mecanismo para esse caso)
- Corte onde a superfície muda, em slices inteiras: **lote 1** = S1, S2, S3 (`api/` e `api.Tests`: 102k + 22,6k = 125k); **lote 2** = S4 (`web/`: 26k + 22,6k = 49k). Nenhuma slice foi dividida
- Mechanism: handoff em lotes sequenciais por subagente, só com o lote anterior verde - escolha do usuário em 02/11/2026
- Feature base (`<base>`): o commit que congela `plan.md` e `checks.md` (o coordenador grava o hash aqui)
- Ordem: esta feature só é construída depois que `tempo-real-signalr` estiver verificada; o lote 1 grava aqui N de cada contagem "N + k" (entidades, rotas, tabelas, testes Vitest e e2e) lida em `<base>`
- e2e: o contêiner `api` da porta 8080 e as imagens das outras features não são tocados. Num worktree limpo no commit sob teste (o `Dockerfile` compila o `web/` da árvore): `docker build -t one-webpush <worktree>`, depois `docker run` dessa imagem na porta 8083 com o ambiente do serviço `api` do compose (banco e Mailpit do compose, `Push__*` vazios, porque os testes de push do navegador simulam a API), e `E2E_URL=http://localhost:8083`. Ao fim o contêiner `one-webpush` é parado e removido. Só o lote 2 roda o e2e
- Dependência nova que o plano não nomeia: `sw.ts` importa `workbox-precaching` e `workbox-routing` (e `workbox-core` se o tipo pedir); entram em `web/package.json` e `package-lock.json`, e o construtor acrescenta uma linha à `Landing` do `plan.md` antes do código
- Não automatizado, para o go-live (pergunta 2 do plano, `blocks go-live`): gerar o par com `dotnet run --project api -- push chaves`, colar `PUSH_CHAVE_PUBLICA`, `PUSH_CHAVE_PRIVADA` e `PUSH_ASSUNTO` no `.env` do servidor da banca, abrir o app num Chrome em `localhost:8080`, ativar os avisos, responder o chamado como atendente e ver a notificação com o app fechado
- Para o usuário, antes ou durante o build: (1) `Push:Assunto` vazio com o par preenchido não tem regra no plano; o construtor usa o `mailto:` obrigatório da biblioteca com `PUSH_ASSUNTO` e, se faltar, um literal fixo `mailto:` num só lugar (C17), a menos que o usuário diga outro; (2) o limite de 30 s por envio (C31) é valor dos checks, o plano diz só "falha ou demora"; (3) o botão vai em `Autenticado.tsx` e a decisão de plano "Cabecalho.tsx" fica corrigida aqui; se o usuário quiser outro lugar, C45 a C52 mudam

<Cada construtor acrescenta, ao terminar, as 3 linhas abaixo:>

- **Boundary:** C1-C35 closed at `<sha>` (lote 1)
- **Settled mid-build:** <cada esclarecimento do usuário que não virou linha de Landing nem check editado>
- **Abandoned:** <tentado, descartado, e por quê>

**Lote 1 (construtor, 03/11/2026)**

- `<base>` = `f30a358` (congela `plan.md` e `checks.md`). Diffs de prova desta feature comparam com o HEAD do início do lote 1, `c9535d2` (o `f30a358` é anterior aos builds `arquivos-minio` e `tempo-real-signalr`). Commits do lote: `9db8dcd` (S1), `1bcbfa3` (S2), `5e5be5d` (S3).
- Números lidos em `c9535d2`: rotas 63 (total) / 60 (um só método) / 61 (com autorização), agora 66 / 63 / 64; tipos de entidade 24 (agora 26); tabelas da instituição 23 (agora 25); mensagens e handlers do mediator 58 (agora 61); `Map*` 61 (agora 64); `Entrada` aninhadas e corpos JSON 29 (agora 30); respostas JSON 54 (agora 55); rotas privadas em `SessaoTests` 56 (agora 59); `MediatorTests` ações/outras (9, 49) agora (9, 52); API 405 testes (agora 448 verdes, 43 novos); Vitest 186 em 32 arquivos; Playwright `--list` 46 testes em 3 arquivos (lote 1 não mexe em `web/`, e2e não rodou).
- Edições em testes existentes (só número ou lista): `ArquiteturaTests` (`TabelasDaInstituicao` +2, `EntidadesPorPasta` +`Push`, 24->26, 58->61 em 4 lugares, `porFatia` Chamados 13->16, `Map*` 61->64, `AsEntradas` +`AtivarPush`, 29->30 em 2 lugares, `SemCorpoJson` +`AtivarPush` +`DesativarPush`, `ComRespostaAninhada` +`VerChavePush`, 54->55); `RetratoTests` (63->66, 60->63, 61->64) e `rotas.txt` (+3 linhas, 0 removidas); `MediatorTests` (58->61 e (9,49)->(9,52)); `SessaoTests` (56->59). Nenhuma asserção enfraquecida.
- Os 4 métodos novos de `ArquiteturaTests`: `Push_configuracao_lida_em_um_lugar`, `Push_chaves_fora_do_git`, `Glossario_lista_subscricao_e_push_saida`, `Pacote_webpush_fixo`. Arquivos `PushDominioTests` sem `OneFactory`/`OneDb`/`HttpClient`.
- Decisões de detalhe (reversíveis): todo o push mora na fatia `Chamados` (`api/Chamados/{ConfigPush,PushEnviador,PushComando,PushRotas,VerChavePush,AtivarPush,DesativarPush}.cs`) porque `Fatias_do_api` fixa a lista de arquivos da raiz e `Referencias_entre_fatias` os pares de fatias; `PushRotas` abre um `MapGroup("/push")` para as 3 rotas caírem logo antes dos fallbacks (C11); `DELETE /api/push/subscricao` leva o endpoint em `?endpoint=` (URL-encoded), não em corpo JSON: um `DELETE` sem corpo JSON exigido não vira 404 pelo fallback em `SessaoTests.Sem_cookie_401_em_toda_rota_privada`; `POST` leva `{"endpoint","chaves":{"p256dh","auth"}}`; `GET /api/push/chave` devolve `{"chavePublica"}`. `Push:Assunto` vazio = push desligado (nota 3 do coordenador), sem literal `mailto:` de reserva. A `SubscricaoPush` de outra instituição muda de dono por um `UPDATE` SQL no `POST` (o filtro global do AD-008 a esconde e `IgnoreQueryFilters` é só do agendador). `PushSaida.EnviadoEm` é token de concorrência (AC 18). `Agendador.Ler` só lê `PushSaida` cuja subscrição ainda é da instituição da linha (C32). `Sem_setter_publico` (C15): a única propriedade com set público é `InstituicaoId`, exigida por `IDaInstituicao`, como em `AgregadoFechado`.
- **Boundary:** C1-C35 closed at `5e5be5d` (lote 1), exceto a primeira linha `Proof` de **C33** (`PushEnviadorTests.Real_envia_post_cifrado_com_vapid`), bloqueada abaixo; C1 segue aberto até o lote 2.
- **Settled mid-build:** nenhum esclarecimento do usuário durante o lote 1.
- **Abandoned / BLOQUEIO C33:** o `WebPush` 1.0.13 só implementa o rascunho antigo: `Content-Encoding: aesgcm`, `Authorization: WebPush <jwt>` e `Crypto-Key: p256ecdsa=...` (medido capturando o pedido real e lendo as constantes da DLL; não há `aes128gcm` nem `vapid t=,k=`). O C33 (e o texto da door 1 do plano) pedem `aes128gcm` e `Authorization: vapid t=..., k=...` (RFC 8291/8292); o check está errado para esta biblioteca, e o Chrome/Firefox ainda aceitam o formato antigo, mas o Safari/iOS não. Não enfraqueci o teste: ele ficou fora do commit, em `C:\Users\ALFRED~1\AppData\Local\Temp\claude\D--one-system\9f8775ec-584d-4485-b8ac-6d314b08e437\scratchpad\PushEnviadorTests.c33-literal.cs` (a versão literal, com os dois asserts, que hoje falha). O resto do C33 (`Real_expoe_404_e_410_como_status`) e o C34 passam. Decisão do usuário: (a) trocar o C33 para `aesgcm` + `WebPush` jwt e aceitar o limite de iOS, ou (b) escrever o `aes128gcm` com a BCL (ECDH, HKDF, AesGcm, uns 40 linhas) e usar `VapidHelper.GetVapidHeaders` só para o JWT, o que contraria a alternativa rejeitada da door 1.

### Notas do coordenador (02/11/2026, antes do build)

- Itens que o escritor dos checks levantou, decididos como detalhe técnico, sem mudar o que o usuário aprovou:
  (1) o botão de ativar avisos fica em `web/src/Autenticado.tsx` (o cabeçalho real, onde está "Sair"); o
  `Cabecalho.tsx` citado no plano é só o título da lista; (2) o comando de linha é `push chaves`, chamado a partir
  do `Program.cs` (não existe `api/Comando/`); o `Flow` do plano é corrigido no commit que cria o comando;
  (3) `Push:Assunto` vazio conta como configuração ausente: push desligado (404), como sem as chaves;
  (4) 30 s de tempo-limite por envio e `registrada_em` como critério de "mais antiga" no limite de 10 por usuário
  ficam como estão; (5) os builds são sequenciais, então a porta do e2e (8083) não colide com outro build;
  (6) os pacotes `workbox-*` do `sw.ts` e o ajuste do `precache_completo.py` ao manifesto do `injectManifest`
  entram no lote que constrói o S4, com a mesma afirmação do C10 da `interface-nova` (precache completo).

### Decisão do usuário sobre o C33 (03/11/2026, depois do lote 1)

- A `WebPush` 1.0.13 só envia `Content-Encoding: aesgcm` com `Authorization: WebPush` e `Crypto-Key` (confirmado pelo
  construtor capturando a requisição); Safari e iOS exigem `aes128gcm` com `Authorization: vapid t=,k=`, que é o que o
  C33 pede. Decisão: trocar a dependência por `Lib.Net.Http.WebPush` 3.3.1 (MIT), que implementa o RFC 8291 e o VAPID do
  RFC 8292. A door 1 do plano ganha uma nota datada com a troca (a linha aprovada não é reescrita). O C33 fica como está.

**Lote 2 (construtor, 03/11/2026)**

- Commits: `59e3005` (troca da biblioteca, C33), `a831fb3` (sw.ts, injectManifest, precache), `ebce678` (botão), `6dd3fe9` e o seguinte (e2e). Contagens: API 449 verdes (448 + a prova literal do C33); Vitest 209 em 34 arquivos (eram 186 em 32: +9 `sw.test.ts`, +14 `avisos.test.tsx`); Playwright 50 testes (46 + 4 de `push.spec.ts`; o "N + 5" do C53 conta um a mais do que C50 a C52 pedem: 1 + 2 + 1), 50 verdes na imagem própria. `crapper` 0, `dryer` sem candidato, `seletores_conferem`, `consultas_preservadas` e `chamadas_iguais` (contra `b2e7e79`) com 0 problema, `precache_completo.py` 17 URLs e 0 problema.
- **Boundary:** C1-C53 closed at o último commit deste lote.
- **Settled mid-build:** C33 (troca para `Lib.Net.Http.WebPush` 3.3.1, nota na door 1); `ParVapid` (chaves por `ECDsa`, a biblioteca não gera); `DELETE` leva `?endpoint=` (lote 1), então C48 afirma a query e não o corpo `{ endpoint }`; o botão é um sino com `aria-label`/`title` (cabe em 360 px), não texto visível; `interface.test.ts` (`navigateFallbackDenylist` em `vite.config.ts`) passou a ler a mesma lista em `sw.ts`, porque a opção deixou de existir com `injectManifest`; C24 e o teste 404/410 do C33 mudaram só nome do pacote/versão e tipo da exceção; C51: o Chromium headless informa `Notification.permission` "denied" sem decisão, então o e2e afirma `permissions.query` = "prompt" e 0 chamadas a `requestPermission`.
- **Abandoned:** nada de código; `WebPush` 1.0.13 removido. Limites conhecidos: se o `POST` falha depois do `subscribe`, a subscrição local fica (o botão mostra "Desativar avisos"); C44 afirma a lista `Negados` e o texto `denylist: Negados` no `sw.ts`, não a rota registrada no Workbox. A entrega real com a chave VAPID de verdade segue manual (go-live).


### Decisões do usuário depois da verificação rodada 1 (03/11/2026)

- **C45/C46 (botão):** na barra, o sino com `aria-label` e `title`; na gaveta (abaixo de 1024 px) e no menu "Mais", o
  item mostra o texto visível ("Ativar avisos neste aparelho" / "Desativar avisos"). Testes medem o texto visível
  nesses dois lugares.
- **C48 (DELETE):** aceito `DELETE /api/push/subscricao?endpoint=<url-encoded>` no lugar do corpo `{ endpoint }`. O teste
  que mostra o botão voltando para "Ativar avisos neste aparelho" depois de desativar continua obrigatório.
- **Estado de erro do botão:** se o `POST` da inscrição falhar depois do `subscribe`, o navegador desfaz a inscrição
  (`unsubscribe`), mostra a mensagem de erro e o botão volta para "Ativar avisos neste aparelho"; um teste prova esse caminho.

### Correção após a verificação rodada 1

Commit `4f89704`. Cada lacuna: conserto, teste, falha vista em vermelho.

- **C45/C46 texto visível:** `AvisosPush` ganhou a variante `item` (botão com ícone e texto); `Autenticado.tsx` a põe na gaveta e no "Mais" (só aluno), a barra segue com o sino. Testes: `avisos.test.tsx` "no(a) gaveta/Mais o item de avisos mostra o texto visível" (2) e e2e `push.spec.ts` "na gaveta o item de avisos mostra o texto visível" (360 px). Falha: sem os itens, os 2 de Vitest ficam vermelhos. Os testes de arranjo da barra (sem sobreposição, 360 px) seguem verdes.
- **C48 volta a "Ativar":** o fake `unsubscribe` agora zera a subscrição de verdade; "desativar cancela e apaga a subscrição" ganhou `expect(await botao(Ativar))`. DELETE segue `?endpoint=`.
- **Estado de erro:** `ativar` (`push.ts`) chama `unsubscribe()` e relança se o `POST` falha. Teste "POST que falha depois do subscribe desfaz a inscrição e o botão volta a Ativar". Falha: sem o `unsubscribe`, vermelho.
- **C44:** `sw.test.ts` "fallback de navegação nega a API (rota registrada no worker)" importa o `sw.ts` com o Workbox simulado e exige `NavigationRoute(..., { denylist: Negados })` e 1 `registerRoute`. Falha: com `registerRoute` comentado, vermelho (o `-t` do C44 casa os dois).
- Para manter o `crapper` abaixo de 10, `alternar` saiu do componente para `push.ts` e `Avisos` virou componente de módulo em `Autenticado.tsx`.
- Contagens: Vitest 213 em 34 arquivos (+4); Playwright 51 verdes na imagem própria (:8083); `crapper`, `dryer`, `seletores_conferem`, `consultas_preservadas`, `chamadas_iguais`, `precache_completo.py` sem problema.
