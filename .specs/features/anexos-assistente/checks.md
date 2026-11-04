# Anexos na conversa com o assistente - checks

Profile: standard
Plan: `.specs/features/anexos-assistente/plan.md`

40 checks em 3 slices · 4 one-way doors · 0 perguntas abertas que bloqueiam o código, 1 que bloqueia o go-live (LGPD, ver o plano)

**Como as provas rodam.** Todos os comandos rodam na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é o
commit que congela `plan.md` e este `checks.md`, gravado no `## Handoff`.

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `WebApplicationFactory<Program>` (`OneFactory`, provedor `f.Llm` simulado, `f.Logs`, `f.MinioFora()`, `f.Chaves()`, `f.Objeto()`, `f.LeiturasDeObjeto`) | `docker compose up -d postgres mailpit minio` |
| `web/` unidade | Vitest: `cd web && npx vitest run <arquivo> -t "<nome>"` | `npm --prefix web ci` |
| `web/` e2e | Playwright contra uma imagem própria desta feature na porta 8084 (`E2E_URL=http://localhost:8084`), no padrão de `arquivos-minio` (instituição `e2e`, Mailpit, MinIO do compose) | ver `## Handoff` |
| provedor real | `python .specs/features/anexos-assistente/provedor_aceita_anexos.py`, que lê `LLM_CHAVE_API` do `.env` e faz 1 chamada à OpenAI (centavos) | chave no `.env` |
| barreiras | `dotnet build api` (CA1502, AD-018); `crapper` e `dryer` em `web/` (AD-018); mutação suspensa (AD-025), nenhum check de `mutator` | `npm --prefix web run coverage` |

Um filtro que não seleciona teste nenhum sai com código 0 (L-002). O construtor confere no relatório que
cada `--filter` (xUnit v3: `FullyQualifiedName~Classe.Metodo`), cada `-t` (Vitest) e cada `-g`
(Playwright, com `--list`) executa pelo menos 1 teste. O nome citado numa linha `Proof:` é o contrato: classe
ou método que não existe em `<base>` é criado com exatamente esse nome (L-022). Classe nova em `api.Tests`:
`AnexoConversaTests`. Arquivos novos em `web/`: `src/assistente/anexos.test.tsx`. Teste novo em
`web/e2e/anexos.spec.ts`.

**Asserções existentes que mudam por consequência direta do plano** (lista fechada, o Verifier confere):
(1) `api.Tests/Retratos/sucessos.txt`: as linhas de `GET /api/conversas/{id}` ganham `"anexos":[]` em cada
mensagem, e as linhas que trazem `transcricao` (`GET /api/chamados/{numero}` e as respostas de ação que devolvem
o detalhe) ganham `"anexos":[]` nas linhas do aluno; nada mais muda nelas. (2) `api.Tests/Retratos/rotas.txt` e os
números de `RetratoTests.Tabela_de_rotas_igual_a_da_base` ganham a rota de C25. (3) `.specs/GLOSSARIO.md` ganha
`AnexoConversa`, se `ArquiteturaTests.Glossario_lista_os_termos` exigir. (4) Asserções de `LlmRequisicaoTests` que
leem `content` com `GetString()` em mensagens sem anexo não mudam (C7).

## Checks

### S1 - O aluno anexa e a IA lê (P1) · ~14 files · ~150 KB · ~45k

**C1** - A suíte inteira da API passa em `HEAD`; as únicas edições em asserções existentes são as da lista fechada acima (AC 5)
Proof: `dotnet test api.Tests`

**C2** - [x] `POST /api/conversas` em `multipart/form-data` com `mensagem` "esse boleto está certo?" e 1 PNG em `anexos` responde `201` com exatamente as chaves `conversaId` e `resposta {tipo, texto}`. Grava 1 `AnexoConversa` ligado à mensagem do aluno, com `nome` igual ao nome enviado, `tipo` `image/png`, `tamanho` igual ao número de bytes e `hash` igual ao SHA-256 hexadecimal minúsculo dos bytes. A `chave` começa com `{instituicaoId}/anexos-conversa/`, e `f.Objeto(chave)` devolve os mesmos bytes (AC 1, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Primeira_mensagem_com_anexo_grava_objeto_e_linha"`

**C3** - [x] `POST /api/conversas/{id}/mensagens` em multipart com `mensagem` e 3 arquivos (JPEG, PNG, PDF) responde `200` com exatamente a chave `resposta {tipo, texto}`, e grava 3 `AnexoConversa` na mensagem do aluno, com os tipos `image/jpeg`, `image/png` e `application/pdf` (AC 1, door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Mensagem_com_tres_anexos_grava_os_tres"`

**C4** - [x] No corpo enviado ao provedor (`f.Llm.UltimoCorpo`), a mensagem `user` com JPEG, PNG e PDF tem `content` como lista de exatamente 4 partes, nesta ordem: `{"type":"text","text":<texto mascarado>}`; `{"type":"image_url","image_url":{"url":"data:image/jpeg;base64,<base64 dos bytes>"}}`; o mesmo para `image/png`; e `{"type":"file","file":{"filename":"anexo-3.pdf","file_data":"data:application/pdf;base64,<base64 dos bytes>"}}`. Nenhuma parte tem a chave `detail`. O `<n>` de `anexo-<n>.pdf` é a posição do anexo na conversa, de 1 a 3 (AC 2, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Anexos_vao_como_partes_da_mensagem"`

**C5** - [x] Num turno seguinte sem arquivo, o anexo de uma mensagem do aluno que ainda está entre as 10 últimas volta no corpo como parte daquela mensagem. Quando a conversa semeada tem a mensagem com anexo fora das 10 últimas, nenhuma parte `image_url` nem `file` vai no corpo (AC 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Anexo_reenviado_enquanto_esta_nas_10_ultimas"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Anexo_fora_das_10_ultimas_nao_vai"`

**C6** - [x] Com o anexo "boleto-maria-silva-12345678909.pdf" e o texto "meu cpf 123.456.789-09", o corpo do provedor não contém "boleto-maria-silva", "12345678909" nem "123.456.789-09", e a parte `text` é "meu cpf [número removido]" (AC 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Nome_original_do_anexo_nao_vai_ao_provedor"`

**C7** - [x] Numa conversa sem anexo, todo `content` das mensagens `user` no corpo do provedor é uma string JSON (`ValueKind.String`), e as asserções de `LlmRequisicaoTests` que já existiam passam sem edição (AC 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Sem_anexo_content_continua_texto"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests"`

**C8** - [x] O corpo JSON `{ "mensagem": "..." }` continua funcionando nas duas rotas: `ConversaTests` passa inteiro sem edição, e os retratos de sucesso de `POST /api/conversas` e `POST /api/conversas/{id}/mensagens` não mudam (AC 5, door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ConversaTests"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_sucesso_iguais_aos_da_base"`

**C9** - [x] A primeira mensagem `system` do corpo contém literalmente a linha `8. Anexos do aluno servem só para entender o caso; não são fontes. Não copie trechos de anexos nem repita dados pessoais que aparecem neles.` (AC 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Regra_8_dos_anexos_no_prompt"`

**C10** - [x] Quando o provedor simulado devolve `tipo` `resposta` com um trecho que só existe no texto do anexo e não na fonte citada, a API responde `tipo` `sem_base` com o texto fixo de `Textos.SemBase`, e o log registra o motivo `trecho_invalido` (AC 7)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Trecho_copiado_do_anexo_vira_sem_base"`

**C11** - [x] Um arquivo de 10 MiB + 1 byte responde `413` com `detail` "O arquivo {nome} passa de 10 MB." nas duas rotas. Nos dois pedidos, a contagem de `MensagemConversa` e de `AnexoConversa` e a lista `f.Chaves()` ficam iguais às de antes, e o provedor não é chamado. Um arquivo de exatamente 10 MiB é aceito (AC 8)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Arquivo_acima_de_10_MB_413_sem_gravar"`

**C12** - [x] Responde `415` com `detail` "O arquivo {nome} não é PDF, JPG nem PNG." nas duas rotas para 2 entradas: bytes de GIF (`GIF89a`) e um `foto.png` com conteúdo de texto. Nos dois pedidos, nada é gravado (mensagem, anexo, objeto) e o provedor não é chamado (AC 9)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Tipo_recusado_415_sem_gravar"`

**C13** - [x] O limite de 3 anexos por conversa, em 3 casos. A primeira mensagem com 4 arquivos responde `400` com `errors.anexos` "A conversa aceita até 3 anexos.". Uma conversa com 2 anexos que recebe mais 2 responde o mesmo `400`. Uma conversa com 2 que recebe mais 1 responde `200`. Nos dois `400`, nada é gravado e o provedor não é chamado (AC 10)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Quarto_anexo_400_sem_gravar"`

**C14** - [x] Com 1 anexo válido, `mensagem` vazia e `mensagem` de 1001 caracteres respondem `400` com `errors.mensagem` "A mensagem deve ter de 1 a 1000 caracteres.", sem objeto novo em `f.Chaves()` (AC 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Texto_invalido_com_anexo_400_sem_gravar"`

**C15** - [x] Com 1 anexo válido, os 3 casos de hoje respondem igual ao JSON e sem objeto novo: conversa encerrada `409` "Esta conversa já foi encerrada.", conversa de outro aluno `404` "Conversa não encontrada." e conversa com 10 mensagens do aluno `409` "A conversa chegou ao limite de 10 mensagens. Fale com um atendente ou encerre." (AC 12)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Recusas_de_hoje_com_anexo_sem_gravar"`

**C16** - [x] Com `f.MinioFora()`, `POST /api/conversas/{id}/mensagens` com 1 anexo responde `503` com `detail` "Armazenamento de arquivos indisponível.". A contagem de `MensagemConversa` da conversa não muda e o provedor não é chamado (AC 13)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Minio_fora_ao_gravar_503_sem_mensagem"`

**C17** - [x] Numa conversa com 1 anexo já gravado, uma mensagem nova sem arquivo, com `f.MinioFora()`, responde `200` com `tipo` `sem_base` e o texto de `Textos.SemBase`. O log tem o motivo `anexo_indisponivel` com instituição e conversa, e `f.Llm.Corpos` (chat) não cresce (AC 14)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Minio_fora_ao_ler_anexo_sem_base_sem_chamar_provedor"`

**C18** - [x] A linha de log "Chamada ao provedor de IA" traz o campo `Anexos` com 3 num turno que mandou 3 anexos e com 0 numa conversa sem anexo (AC 15)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Log_traz_a_quantidade_de_anexos"`

**C19** - [x] Um pedido com 3 arquivos de exatamente 10 MiB cada (PNG pela assinatura) responde `201`, e não o `413` do limite de corpo do servidor (AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Tres_arquivos_de_10_MB_aceitos"`

**C20** - [x] A OpenAI real aceita a forma da porta 3 com o modelo de `api/appsettings.json` (`gpt-6-luna`): um pedido com `reasoning_effort` `none`, `response_format` `json_object`, um PNG em `image_url` com data URL e um PDF em `file` com `file_data` e `filename` `anexo-1.pdf` responde `200` com `choices[0].message.content` não vazio. O script sai 0, e sai 1 sem a chave (door 3)
Proof: `python .specs/features/anexos-assistente/provedor_aceita_anexos.py`

**C21** - [x] `dotnet build api` passa com a barreira CA1502 (nenhum método acima de 10 de complexidade) e sem migração pendente (AD-018)
Proof: `dotnet build api`
Proof: `dotnet ef migrations has-pending-model-changes --project api`

### S2 - O aluno vê e baixa os anexos na conversa (P1) · ~8 files · ~80 KB · ~25k

**C22** - [x] `GET /api/conversas/{id}` traz em cada mensagem `anexos`, cada item com exatamente as chaves `id`, `nome`, `tipo` e `tamanho`, na ordem de envio. A mensagem sem anexo traz `[]`, e o corpo não contém `chave` nem `hash` (AC 17)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Ver_conversa_lista_anexos_sem_chave_nem_hash"`

**C23** - [x] O aluno dono pede `GET /api/conversas/anexos/{id}` e recebe `200`, com os mesmos bytes enviados, `Content-Type` igual ao `tipo`, `Content-Disposition` com o `nome` e `Content-Length` igual ao `tamanho` (AC 18, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Download_pelo_aluno_dono"`

**C24** - [x] `GET /api/conversas/anexos/{id}` responde `404` com `detail` "Anexo não encontrado." em 5 casos, sem ler objeto (`f.LeiturasDeObjeto` não muda): outro aluno da mesma instituição; atendente da instituição com a conversa sem chamado; atendente de outro setor que não abre o chamado criado da conversa; usuário de outra instituição; id que não existe (AC 19, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Download_negado_404_sem_abrir_objeto"`

**C25** - [x] Com `f.MinioFora()`, o aluno dono pede `GET /api/conversas/anexos/{id}` e recebe `503` (AC 20)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Download_com_minio_fora_503"`

**C26** - [x] `api.Tests/Retratos/rotas.txt` ganha exatamente a linha `GET /api/conversas/anexos/{id:long} anonimo=False autorizacao=True limite=-` e não perde nenhuma. Em `RetratoTests.Tabela_de_rotas_igual_a_da_base`, cada número que conta essa rota sobe 1 (os valores de `<base>` ficam gravados no `## Handoff`, L-021) e nenhuma outra asserção muda (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_igual_a_da_base"`

**C27** - [x] A tabela `anexo_conversa` tem `instituicao_id` com o filtro global, colunas em snake_case e `mensagem_conversa_id` não nulo, com chave estrangeira para `mensagem_conversa` (Relations, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Tabelas_snake_case_e_datas_timestamptz"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Tabela_anexo_conversa_com_fk_nao_nula"`

**C28** - [x] A tela Assistente tem, no formulário da mensagem, um botão com nome acessível "Anexar arquivo" que aciona um `input type="file"` com `accept=".pdf,.jpg,.jpeg,.png"` e `multiple` (AC 21)
Proof: `cd web && npx vitest run src/assistente/anexos.test.tsx -t "botão Anexar arquivo abre o seletor de PDF, JPG e PNG"`

**C29** - [x] Escolhidos `boleto.png` e `comprovante.pdf`, a tela mostra 2 selos, nessa ordem, com os nomes e os botões "Remover boleto.png" e "Remover comprovante.pdf". Clicar em "Remover boleto.png" deixa só o selo de `comprovante.pdf` (AC 22)
Proof: `cd web && npx vitest run src/assistente/anexos.test.tsx -t "selos dos arquivos escolhidos e remover"`

**C30** - [x] "Anexar arquivo" fica desabilitado em 2 casos: com 3 arquivos escolhidos e nenhum enviado, e com 2 já enviados na conversa mais 1 escolhido. Com 2 escolhidos e nenhum enviado, fica habilitado (AC 23)
Proof: `cd web && npx vitest run src/assistente/anexos.test.tsx -t "Anexar arquivo desabilitado com 3 anexos na conversa"`

**C31** - [x] Ao enviar com 2 arquivos, a tela faz `POST /api/conversas` com `FormData` contendo `mensagem` e 2 entradas `anexos`. Depois do sucesso, os selos somem e o balão do aluno mostra 2 links, com os nomes, para `/api/conversas/anexos/{id}`, com os `id` devolvidos pela API (AC 24)
Proof: `cd web && npx vitest run src/assistente/anexos.test.tsx -t "envio com anexos vai em FormData e o balão mostra os links"`

**C32** - [x] Sem arquivo escolhido, a tela continua mandando o corpo JSON `{ "mensagem": "..." }`, e `conversa.test.tsx` passa inteiro sem edição (AC 24, door 2)
Proof: `cd web && npx vitest run src/assistente/anexos.test.tsx -t "sem anexo o envio continua em JSON"`
Proof: `cd web && npx vitest run src/assistente/conversa.test.tsx`

**C33** - [x] Para cada uma das respostas `400`, `413`, `415` e `503` da API, a tela mostra o `detail` da API no alerta de erro e mantém no campo o texto digitado e os selos escolhidos (AC 25)
Proof: `cd web && npx vitest run src/assistente/anexos.test.tsx -t "erro da API mantém texto e selos"`

**C34** - [x] A tela Assistente mostra, abaixo do campo, o texto literal "Fotos e PDFs de até 10 MB, até 3 por conversa. Mostre só os dados de que o atendimento precisa." (AC 26)
Proof: `cd web && npx vitest run src/assistente/anexos.test.tsx -t "texto de ajuda dos anexos"`

**C35** - [x] A suíte Vitest inteira e `npm --prefix web run build` passam. O `crapper` sobre `web/src` sai 0 no limite 9.99, e o `dryer` não acha candidato com nota 0.8 ou mais (AD-018)
Proof: `npm --prefix web test`
Proof: `npm --prefix web run build`
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx src/sw.ts src/push.ts src/AvisosPush.tsx | grep -q "No duplicate candidates found"`

### S3 - O atendente recebe os anexos no chamado transferido (P1) · ~5 files · ~60 KB · ~18k

**C36** - [x] `GET /api/chamados/{numero}`, pedido pelo atendente do setor de um chamado transferido de uma conversa com 1 anexo, traz `anexos` com exatamente `id`, `nome`, `tipo` e `tamanho` na linha da transcrição do aluno que anexou, e `[]` nas outras linhas do aluno (AC 27)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Transcricao_do_chamado_traz_anexos_do_aluno"`

**C37** - [x] O atendente que abre esse chamado pede `GET /api/conversas/anexos/{id}` e recebe `200` com os mesmos bytes (AC 28, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoConversaTests.Download_pelo_atendente_do_chamado"`

**C38** - [x] Na tela do chamado, a transcrição mostra cada anexo do aluno como link com o nome, para `/api/conversas/anexos/{id}` (AC 29)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "transcrição mostra os anexos do aluno como links"`

**C39** - De ponta a ponta na imagem própria (MinIO do compose, provedor sem chave), o aluno anexa um PNG à primeira mensagem e vê o link no balão. O download devolve o mesmo SHA-256 e `Content-Type` `image/png`. Depois de "Falar com atendente", o administrador abre o chamado, vê o link na transcrição e baixa os mesmos bytes (AC 1, AC 24, AC 29)
Proof: `cd web && E2E_URL=http://localhost:8084 npx playwright test e2e/anexos.spec.ts -g "aluno anexa foto na conversa e a equipe baixa no chamado"`

**C40** - A suíte e2e inteira passa contra a imagem própria (AC 5)
Proof: `cd web && E2E_URL=http://localhost:8084 npx playwright test`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `POST /api/conversas` statuses (7) | 201 C2, C19 · 400 C13, C14 · 403 C8 (`ConversaTests`, sem mudança) · 413 C11 · 415 C12 · 429 C8 (`RateLimitTests` no C1, sem mudança) · 503 C16 | - |
| `POST /api/conversas/{id}/mensagens` statuses (8) | 200 C3 · 400 C13, C14 · 404 C15 · 409 C15 · 413 C11 · 415 C12 · 429 C1 · 503 C16 | - |
| `GET /api/conversas/{id}` statuses (2) | 200 C22 · 404 C8 (`ConversaTests`, sem mudança) | - |
| `GET /api/chamados/{numero}` statuses (2) | 200 C36 · 404 C1 (`PermissoesChamadoTests`, sem mudança) | - |
| `GET /api/conversas/anexos/{id}` statuses (3) | 200 C23, C37 · 404 C24 · 503 C25 | - |
| tipos aceitos (3) | JPEG C3, C4 · PNG C2, C4 · PDF C3, C4 | - |
| tipos recusados (2) | outra assinatura (GIF) C12 · extensão aceita com conteúdo errado C12 | - |
| borda do tamanho (2) | 10 MiB aceito C11, C19 · 10 MiB + 1 recusado C11 | - |
| limite por conversa (3) | 4 na primeira C13 · 2 + 2 C13 · 2 + 1 aceito C13 | - |
| partes no pedido ao provedor (3) | `text` C4, C6 · `image_url` C4 · `file` C4 | - |
| janela do histórico (2) | dentro das 10 últimas C5 · fora C5 | - |
| recusas de hoje com anexo (5) | texto vazio C14 · texto de 1001 C14 · encerrada C15 · de outro aluno C15 · limite de 10 C15 | - |
| falhas do MinIO (3) | ao gravar C16 · ao ler para o provedor C17 · ao baixar C25 | - |
| quem baixa (7) | aluno dono C23 · equipe que abre o chamado C37 · outro aluno C24 · atendente sem chamado C24 · atendente de outro setor C24 · outra instituição C24 · id inexistente C24 | - |
| estados da tela Assistente (5) | vazio C28, C34 · escolhidos C29 · limite C30 · enviado C31 · erro C33 | - |
| erros mostrados na tela (4) | 400 C33 · 413 C33 · 415 C33 · 503 C33 | - |
| corpo do envio pela tela (2) | `FormData` com anexos C31 · JSON sem anexos C32 | - |
| one-way doors do `Landing` (4) | 1 `anexo_conversa` C2, C27 · 2 contrato multipart + JSON C3, C8, C32 · 3 partes no provedor C4, C20 · 4 rota de download C23, C24, C37 | - |
| startup config: limite de corpo (2 lugares) | a rota no `Program`/`Mapear` que serve a produção e os testes (`OneFactory` sobe o mesmo `Program`) C19 · a imagem do e2e C39 | - |

- Claims que nomeiam status, rota ou forma de resposta: C2, C3, C8, C11 a C17, C19, C22 a C26, C36, C37. Cada um tem uma prova que cruza a fronteira HTTP
- A forma do pedido ao provedor (C4 a C7, C9, C18) é provada no corpo capturado pelo `f.Llm`. Só C20 prova que a OpenAI real aceita essa forma, e ele não prova a qualidade da leitura
- Nenhum check afirma mais que o caso que a sua prova exercita

## Swept

- validation: C11 (tamanho e borda), C12 (tipo pela assinatura), C13 (limite de 3), C14 (texto), C19 (limite de corpo)
- failure modes: C16 (nada gravado quando o MinIO falha ao gravar), C11 a C15 (recusa antes de gravar objeto)
- idempotency: n/a - cada envio é uma mensagem nova, como hoje; não há chave de deduplicação para mensagem de conversa, e a interface desabilita o envio enquanto o anterior está pendente (existing - `pendente={envio.isPending}`)
- authorization: C24 (5 casos negados sem ler objeto), C23 e C37 (os 2 que podem), C15 (conversa de outro aluno); existing - `PodeUsarAssistente` (403) e o filtro global por instituição
- concurrency: n/a - dois envios simultâneos na mesma conversa podem passar juntos do limite de 3 (o mesmo vale hoje para o limite de 10 mensagens); a tela não permite envio paralelo e o efeito é no máximo um anexo a mais, registrado no `## Handoff`
- data lifecycle: C27 (FK não nula e append-only), existing - bucket versionado sem exclusão (`Armazenamento`); o anexo vive tanto quanto a conversa
- dependency failure: C16, C17, C25 (MinIO), existing - falhas do provedor viram `sem_base` (`ProvedorTests.Falhas_do_chat_viram_sem_base`), inclusive um `400` da OpenAI recusando um anexo
- state transitions: C15 (conversa encerrada não aceita anexo); nenhum estado novo
- observability: C18 (`anexos=` na linha do provedor), C17 (motivo `anexo_indisponivel`)

## Handoff

Tamanho: bytes dos arquivos que cada slice lê e edita (`wc -c` em `HEAD` 04/11/2026), divididos por 4, mais
os testes novos. API: `Assistente.cs`, `NovaConversa.cs`, `NovaMensagem.cs`, `ConversaRotas.cs`, `VerConversa.cs`,
`DetalheChamado.cs`, `BaixarAnexo.cs`, `OneDb.cs`, `Program.cs`, `LlmRequisicaoTests.cs`, `ConversaTests.cs`,
`ArmazenamentoTests.cs`, `Cenario.cs`, `sucessos.txt` e `RetratoTests.cs` somam 153 KB (~38k). Web: `Assistente.tsx`,
`Conversa.tsx`, `conversa.test.tsx`, `chamado.test.tsx`, `api.ts` e `anexos.spec.ts` somam 63 KB (~16k).

- S1 = ~45k, S2 entra com ~70k e S3 com ~88k no total, abaixo do orçamento de 150k: um construtor só, sem pergunta
- Mecanismo: um construtor
