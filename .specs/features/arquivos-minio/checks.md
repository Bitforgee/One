# Arquivos no MinIO (AD-021) - checks

Profile: standard
Plan: `.specs/features/arquivos-minio/plan.md`

30 checks em 7 slices · 5 one-way doors · 0 perguntas abertas

**Como as provas rodam.** As mesmas ferramentas da `dominio-e-contratos`:

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `WebApplicationFactory<Program>` (`OneFactory`); `--filter "FullyQualifiedName~Classe.Metodo"` | `docker compose up -d postgres mailpit minio` (o MinIO do compose precisa estar de pé em `localhost:9000` para os testes de API) |
| `web/` e2e | Playwright (`npm --prefix web run e2e`) com `E2E_URL` | imagem própria desta feature na porta 8082 (ver `## Handoff`) |
| build do `api/` | `dotnet build api` com `CA1502` e `MSG0005` em `WarningsAsErrors` | nenhum |
| scripts | `python` e `bash` (Git Bash) na raiz | nenhum |

Todos os comandos rodam na raiz `D:\one-system`. `<base>` é o commit que congela `plan.md` e este `checks.md`,
gravado no `## Handoff`. Cada prova nomeia um teste ou um comando, e o nome é o contrato com o construtor:
classe ou método citado aqui que não existe em `<base>` é criado com exatamente esse nome. Classes novas:
`ArmazenamentoTests` (HTTP e bucket, usa o MinIO do compose) e `MigracaoArquivosMinioTests` (banco descartável).
Métodos novos em classes existentes: `OrdemDasRecusasTests` 1, `ArquiteturaTests` 8. Scripts novos em
`.specs/features/arquivos-minio/`: `asserts_minio.py` (com os modos `<base>`, `<base> --erros` e `--autoteste`). Um filtro que não seleciona nenhum teste sai com código 0
e é prova falha, não verde (L-002): o construtor confere no TRX que cada `--filter` desta lista executa pelo
menos 1 teste (as `Theory` contam os casos citados). Todo teste novo é citado na linha `Proof:` do seu check
(L-022). O texto e as contagens abaixo foram tirados de `<base>` (L-021): `erros.txt` tem 8 linhas, `rotas.txt`
61, `sucessos.txt` 59, `gravacoes.txt` 24, `importacao.txt` vazio por nome (0 linhas, o corpo 400 fica
numa linha só sem quebra).

Fatos de `<base>` que o plano não cita e que os checks obrigam a tratar:

- `ArquiteturaTests.Fatias_do_api` lista os 8 arquivos `.cs` da raiz do `api/`; `Armazenamento.cs` entra na
  lista (C28).
- `RetratoTests.Corpos_de_erro_iguais_aos_da_base` faz `Assert.Equal(8, gravados.Length)`; com a linha 503 passa a 9 (C26).
- `EmailAnexoTests` (`AnexoTests.Download_devolve_os_mesmos_bytes`) lê `x.Conteudo` e faz `Assert.Equal(png, coluna)`;
  a coluna deixa de existir e a asserção passa a ler o objeto pela chave (C7).
- Ordem de recusa da base em `ResponderChamado`: `AgirNoChamado` valida o corpo (400 de nota com anexo, 413 de tamanho,
  415 de tipo) antes de checar o estado (409); o upload de PDF checa título e categoria (400) antes do arquivo.

## Checks

### S1 - Anexo vai para o bucket e o banco guarda só a referência (P1) · ~14 files · ~140 KB · ~43k

**C1** - [x] Uma resposta de chamado com um PNG de 5000 bytes grava um objeto no bucket com a chave `{instituicaoId}/anexos/{32 hexadecimais minúsculos}` e a linha do `Anexo` guarda essa chave, o SHA-256 em hexadecimal minúsculo de 64 caracteres igual ao calculado sobre os bytes e `Tamanho` 5000; os bytes do objeto, lidos direto do bucket pela chave, são os enviados (AC 1, door 1, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Anexo_vai_para_o_bucket_com_chave_hash_e_tamanho"`

**C2** - [x] `Anexo` e `VersaoDocumento` não têm propriedade `byte[]` nem coluna `bytea`; `Chave` é obrigatória com índice único e `Hash` é obrigatório com 64 caracteres, nas duas tabelas; `VersaoDocumento` ganhou `Tamanho` (AC 2, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Anexo_e_VersaoDocumento_nao_guardam_bytes"`

**C3** - [x] O anexo no `DetalheChamado` tem exatamente os membros `id`, `nome`, `tipo` e `tamanho` e nenhum `chave` nem `hash`, com os mesmos valores de hoje (AC 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Detalhe_do_chamado_nao_expoe_chave_nem_hash"`

**C4** - [x] Quatro recusas de anexo mantêm o status de hoje e não deixam nenhum objeto no bucket nem linha nova: nota com anexo 400, tipo `.exe` 415, arquivo de 10 MB mais 1 byte 413, chamado em estado que não aceita a resposta 409 (AC 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Recusa_antes_da_gravacao_nao_deixa_objeto"`

**C5** - [x] Um anexo `.exe` enviado a um chamado em estado que não aceita a resposta recebe 400 (a recusa do corpo vem antes do 409), e a ordem não muda por causa da gravação (L-023, AC 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~OrdemDasRecusasTests.Anexo_invalido_em_chamado_fechado_recusa_400_antes_do_409"`

**C6** - [x] O `IAmazonS3` registrado tem `ServiceURL` igual a `Armazenamento:Endpoint`, `ForcePathStyle` verdadeiro e `RequestChecksumCalculation` e `ResponseChecksumValidation` em `WHEN_REQUIRED`, e `Program.cs` e `OneFactory` leem as quatro chaves `Armazenamento:Endpoint`, `Chave`, `Segredo` e `Bucket` (door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Cliente_S3_configurado_como_a_door_2"`

### S2 - Download devolve os mesmos bytes pela mesma rota e só a quem já podia (P1) · ~8 files · ~65 KB · ~17k

**C7** - [x] `GET /api/anexos/{id}` por aluno dono e por atendente da mesma instituição responde 200 com os bytes enviados, `Content-Type` `image/png`, o `Content-Disposition` com o nome de download e o `Content-Length` iguais aos que `Results.File` produz na base (valores capturados em `<base>` e gravados como literais no teste) e `Content-Length` igual a `Tamanho`; `AnexoTests.Download_devolve_os_mesmos_bytes` passa a ler o objeto pela chave no lugar de `x.Conteudo` (AC 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Download_do_anexo_devolve_bytes_tipo_nome_e_content_length"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AnexoTests.Download_devolve_os_mesmos_bytes"`

**C8** - [x] Três pedidos de download respondem 404 com `detail` "Anexo não encontrado." e o teste conta zero leituras de objeto no bucket: anexo inexistente, anexo de outra instituição, anexo de chamado que o usuário não vê (AC 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Download_negado_e_404_sem_abrir_objeto"`

**C9** - [x] O download lê o objeto da `Chave` da linha: um pedido com `?chave=` e cabeçalho apontando para o objeto de outra instituição devolve o objeto da linha; e `Armazenamento.Baixar` só é chamado em `BaixarAnexo.cs` e `BaixarVersaoDocumento.cs`, cada um passando um membro `Chave` lido do `OneDb` (AC 7)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Download_usa_so_a_chave_da_linha"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Baixar_so_com_chave_de_coluna_do_banco"`

**C10** - [x] `GET /api/documentos/versoes/{id}` por atendente responde 200 com os bytes do PDF gravado, `Content-Type` `application/pdf`, o nome de download e `Content-Length` iguais aos de hoje, e por aluno continua 404 "Documento não encontrado." (AC 8)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Download_da_versao_devolve_pdf_e_application_pdf"`

**C11** - [x] Um download de 10 MiB lido em blocos de 64 KiB aloca menos de 5 MiB no total na API (medido com `GC.GetTotalAllocatedBytes` antes e depois), e `BaixarAnexo.cs` e `BaixarVersaoDocumento.cs` não contêm `Results.File` nem `byte[]` e chamam `Results.Stream` (AC 9)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Download_de_10_MiB_nao_aloca_o_array_inteiro"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Download_em_streaming_sem_array_inteiro"`

### S3 - PDFs da instituição vão para o bucket e o texto continua no banco (P1) · ~14 files · ~100 KB · ~28k

**C12** - [x] `POST /api/admin/documentos` e `POST /api/admin/documentos/{id}/versoes` com PDF válido gravam o objeto em `{instituicaoId}/documentos/{32 hexadecimais}` e a `VersaoDocumento` guarda `Chave`, `Hash` (SHA-256 de 64 caracteres) e `Tamanho`, com `Texto`, `Paginas` e `NomeArquivo` iguais aos de hoje; o corpo 201 é o de hoje (AC 10, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Pdf_novo_e_nova_versao_vao_para_o_bucket"`

**C13** - [x] Oito recusas mantêm o status de hoje e não deixam objeto nem linha, em cada uma das duas rotas de envio: mais de 20 MB 413, não é PDF 415, PDF sem texto 400, PDF ilegível 400 (AC 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Pdf_recusado_nao_deixa_objeto"`

**C14** - [x] Depois da versão 2, o objeto da versão 1 continua no bucket com o mesmo SHA-256 e o download de cada versão devolve o PDF dela (AC 12)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Nova_versao_mantem_o_objeto_anterior"`

### S4 - Armazenamento fora do ar é recusado de forma clara e não deixa linha sem arquivo (P1) · ~8 files · ~55 KB · ~19k

**C15** - [x] Com o endpoint apontando para uma porta fechada (fábrica derivada pelo membro virtual `PortaMinio`), as três rotas de envio respondem 503 com `Content-Type` `application/problem+json` e `detail` "Armazenamento de arquivos indisponível.", e a contagem de `MensagemChamado`, `EventoChamado`, `Anexo`, `Documento`, `VersaoDocumento` e `TrechoFonte` não muda (AC 13)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Envio_com_armazenamento_fora_responde_503_e_nada_no_banco"`

**C16** - [x] Os dois downloads respondem 503 com o mesmo `detail`, nunca 200 de corpo vazio, em dois casos cada: endpoint em porta fechada e linha cuja chave não existe no bucket (AC 14)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Leitura_com_armazenamento_fora_ou_objeto_ausente_responde_503"`

**C17** - [x] Quando o `SaveChanges` falha por conflito de concorrência depois de o objeto estar gravado, a resposta tem o status de hoje (409 com `Problemas.AlteradoPorOutro`), o bucket guarda 1 objeto novo e nenhuma linha de `Anexo` o aponta (AC 15)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Conflito_no_banco_apos_gravar_deixa_objeto_orfao"`

**C18** - [x] `Armazenamento.Preparar` contra uma porta fechada lança erro cuja mensagem contém o endpoint e o nome do bucket, e a subida do `Program` falha com ela (AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Preparar_sem_minio_falha_a_subida_citando_endpoint_e_bucket"`

### S5 - O bucket mantém o histórico e o código não apaga (P2) · ~5 files · ~34 KB · ~17k

**C19** - [x] `Preparar` chamado duas vezes seguidas cria o bucket na primeira, não lança erro na segunda, e `GetBucketVersioning` devolve `Enabled` nas duas (AC 17, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Preparar_cria_bucket_e_liga_versionamento_e_e_idempotente"`

**C20** - [x] Nenhum arquivo `.cs` de `api/` (fora de `Migracoes`) contém `DeleteObject`, `DeleteObjectAsync`, `DeleteObjects` nem `DeleteObjectsAsync`, e a regra falha para cada um dos 4 nomes quando aplicada a um texto que o contém (AC 18, door 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Codigo_do_api_nao_apaga_objeto"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Regra_de_delete_pega_cada_chamada"`

**C21** - [x] Duas gravações dos mesmos bytes geram duas chaves diferentes e dois objetos, e o primeiro objeto continua com os bytes originais (AC 19, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArmazenamentoTests.Duas_gravacoes_do_mesmo_conteudo_geram_chaves_diferentes"`

### S6 - A migração não perde dado em silêncio (P2) · ~6 files · ~50 KB · ~14k

**C22** - [x] Em banco descartável migrado até `Rag` sem linha em `Anexos` nem `VersoesDocumento`, aplicar `ArquivosMinio` passa e deixa `Chave` e `Hash` `NOT NULL` com índice único em `Chave` nas duas tabelas, `Tamanho` em `VersoesDocumento` e nenhuma coluna `Conteudo` (AC 20, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~MigracaoArquivosMinioTests.Migracao_aplica_em_banco_sem_linha"`

**C23** - [x] Com 1 linha em `Anexos` (caso 1) ou 1 linha em `VersoesDocumento` (caso 2), aplicar `ArquivosMinio` lança erro cuja mensagem contém `docker compose down -v`, `Conteudo` continua existindo nas duas tabelas e `__EFMigrationsHistory` não registra `ArquivosMinio` (AC 21, door 1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~MigracaoArquivosMinioTests.Migracao_aborta_com_linha_em_anexo_ou_versao"`

**C24** - [x] O modelo do `OneDb` não tem mudança pendente em relação ao `OneDbModelSnapshot`, e `dotnet ef migrations has-pending-model-changes --project api` sai com 0 (AC 22)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Modelo_sem_mudanca_pendente"`
Proof: `dotnet ef migrations has-pending-model-changes --project api`

### S7 - Nada muda para o cliente fora do 503 (P1) · ~11 files · ~75 KB · ~22k

**C25** - [x] `rotas.txt`, `sucessos.txt`, `gravacoes.txt` e `importacao.txt` são byte a byte os de `<base>`, e as quatro comparações do `RetratoTests` passam (AC 23)
Proof: `git diff --exit-code <base> HEAD -- api.Tests/Retratos/rotas.txt api.Tests/Retratos/sucessos.txt api.Tests/Retratos/gravacoes.txt api.Tests/Retratos/importacao.txt`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_igual_a_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_sucesso_iguais_aos_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Erros_da_importacao_iguais_aos_da_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Gravacoes_do_chamado_iguais_as_da_base"`

**C26** - [x] `erros.txt` só ganha linhas: nenhuma das 8 linhas de `<base>` é removida nem alterada, e a linha nova é `503 {"type":"https://tools.ietf.org/html/rfc9110#section-15.6.4","title":"Erro interno","status":503,"detail":"Armazenamento de arquivos indisponível."}` (o `title` é o de `Problemas.Titulo(503)` na base); o `RetratoTests` compara as 9 linhas com os corpos vivos (AC 23)
Proof: `python .specs/features/arquivos-minio/asserts_minio.py <base> --erros` (confere por `git diff --numstat` 1 linha acrescentada, 0 removidas, e o texto da linha nova)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_erro_iguais_aos_da_base"`

**C27** - [x] Toda linha removida com `Assert` em `api.Tests/**/*.cs` entre `<base>` e `HEAD` reaparece idêntica como linha adicionada, exceto 3 linhas listadas no script: `Assert.Equal(8, gravados.Length);` (vira 9, C26), `Assert.Equal(png, coluna);` (vira leitura do objeto, C7) e `Assert.Equal(["Agendador", "Cpf", "Email", "Prazos", "Problemas", "Program", "Sessao", "Tokens"],` (ganha `Armazenamento`, C28); nenhuma linha adicionada traz `Skip =`; nenhum commit de `<base>..HEAD` mistura `api/` ou `api.Tests/` com `web/`; o script aplica a função `conferir` de `.specs/features/refatoracao-solid/asserts_preservados.py` e acusa as 3 exceções só se a linha nova também faltar (AC 23, AC 24)
Proof: `python .specs/features/arquivos-minio/asserts_minio.py <base>`
Proof: `python .specs/features/arquivos-minio/asserts_minio.py --autoteste`

**C28** - [x] As regras da `ArquiteturaTests` seguem: `Armazenamento.cs` é o 9º arquivo da raiz do `api/` (`Fatias_do_api`), o domínio não referencia ASP.NET Core nem `Mediator`, um arquivo por caso de uso, `Entrada` e `Resposta` por caso de uso, e `.specs/GLOSSARIO.md` ganha uma linha para `Armazenamento` com significado de pelo menos 10 caracteres; `CA1502` até 10 e `MSG0005` como erro (AC 24)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Fatias_do_api"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dominio_sem_AspNetCore_Mediator_nem_fatias"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Um_arquivo_por_caso_de_uso"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Glossario_tem_armazenamento"`
Proof: `bash .specs/features/refatoracao-solid/ca1502_barra.sh`
Proof: `bash .specs/features/vertical-slice-completa/msg0005_barra.sh`

**C29** - [x] `docker-compose.yml` tem o serviço `minio` com imagem `cgr.dev/chainguard/minio@sha256:` seguida de 64 hexadecimais, comando `server /data --console-address ":9001"`, portas 9000 e 9001, volume `miniodata`, `healthcheck`, as variáveis `MINIO_ROOT_USER` e `MINIO_ROOT_PASSWORD`, e o serviço `api` com `depends_on` em `minio` com `service_healthy` e as quatro chaves `Armazenamento__Endpoint`, `__Chave`, `__Segredo` e `__Bucket`; e a imagem do `api` sobe com esse compose e a suíte e2e passa contra ela enviando e baixando anexo (AC 25, door 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Compose_com_minio_por_digest"`
Proof: `E2E_URL=http://localhost:8082 npm --prefix web run e2e`

**C30** - [x] A suíte da API inteira passa em cada commit desta feature e a `ArquiteturaTests.Layout_e_compose` segue verde com o serviço novo (AC 23, AC 24)
Proof: `dotnet test api.Tests`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Layout_e_compose"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| rotas do `Surface` (5) | `POST /api/chamados/{numero}/mensagens` C1 C15 · `POST /api/admin/documentos` C12 C15 · `POST /api/admin/documentos/{id}/versoes` C12 C15 · `GET /api/anexos/{id}` C7 C16 · `GET /api/documentos/versoes/{id}` C10 C16 | - |
| `POST /api/chamados/{numero}/mensagens` statuses (6) | 201 C1 · 400 C4 C5 · 409 C4 C17 · 413 C4 · 415 C4 · 503 C15 | - |
| `POST /api/admin/documentos` statuses (5) | 201 C12 · 400 C13 · 413 C13 · 415 C13 · 503 C15 | - |
| `POST /api/admin/documentos/{id}/versoes` statuses (5) | 201 C12 · 400 C13 · 413 C13 · 415 C13 · 503 C15 | - |
| `GET /api/anexos/{id}` statuses (3) | 200 C7 · 404 C8 · 503 C16 | - |
| `GET /api/documentos/versoes/{id}` statuses (3) | 200 C10 · 404 C10 · 503 C16 | - |
| recusas de anexo antes da gravação (4) | nota com anexo C4 · tipo `.exe` C4 · mais de 10 MB C4 · estado que não aceita C4 | - |
| recusas de PDF por rota (8) | `/documentos` mais de 20 MB C13 · `/documentos` não é PDF C13 · `/documentos` sem texto C13 · `/documentos` ilegível C13 · `/versoes` mais de 20 MB C13 · `/versoes` não é PDF C13 · `/versoes` sem texto C13 · `/versoes` ilegível C13 | - |
| par de recusas com dois motivos (1) | estado fechado e anexo `.exe`: 400 antes de 409 C5 | - |
| falhas do armazenamento (4) | gravação C15 · leitura C16 · objeto ausente C16 · `Preparar` C18 | - |
| porta de entrada da falha de banco depois do objeto (1) | `SaveChanges` com conflito C17 | - |
| one-way doors de `Landing` (5) | 1 esquema C2 C22 C23 · 2 dependência C6 · 3 chave C1 C12 C21 · 4 append-only C19 C20 · 5 compose C29 | - |
| colunas novas (6) | `Anexo.Chave` C2 C22 · `Anexo.Hash` C2 C22 · `Anexo.Tamanho` C1 · `VersaoDocumento.Chave` C2 C22 · `VersaoDocumento.Hash` C2 C22 · `VersaoDocumento.Tamanho` C2 C12 | - |
| nomes proibidos no `api/` (4) | `DeleteObject` C20 · `DeleteObjectAsync` C20 · `DeleteObjects` C20 · `DeleteObjectsAsync` C20 | - |
| asserções alteradas do retrato e da arquitetura (3) | `Assert.Equal(8, gravados.Length);` C26 C27 · `Assert.Equal(png, coluna);` C7 C27 · lista da raiz `Fatias_do_api` C28 C27 | - |
| arquivos de retrato (5) | `rotas.txt` C25 · `sucessos.txt` C25 · `gravacoes.txt` C25 · `importacao.txt` C25 · `erros.txt` C26 | - |
| startup config `Armazenamento:*` (3 places) | entry point `Program.cs` C6 · test harness `OneFactory` C6 · compose do `api` C29 | - |
| critérios do plan (25) | AC 1 C1 · 2 C2 · 3 C3 · 4 C4 C5 · 5 C7 · 6 C8 · 7 C9 · 8 C10 · 9 C11 · 10 C12 · 11 C13 · 12 C14 · 13 C15 · 14 C16 · 15 C17 · 16 C18 · 17 C19 · 18 C20 · 19 C21 · 20 C22 · 21 C23 · 22 C24 · 23 C25 C26 C27 C30 · 24 C28 C27 C30 · 25 C29 | - |

- Claims naming a status code, route or response shape: C1, C3, C4, C5, C7, C8, C10, C12, C13, C15, C16, C17, C25, C26 - cada um tem uma prova que atravessa a rota por HTTP
- Nenhum outro check afirma mais do que o caso que a prova exercita; os Theory (C4, C13, C15, C16, C23) trazem a lista dos casos no texto do check

## Test policy

Omitida: o repo já responde as duas perguntas para cada camada tocada (`ArquiteturaTests` para regras de código, `RetratoTests` para contrato, testes HTTP com `OneFactory` para os casos de uso), e esta feature não acrescenta lógica de decisão fora do que os checks já enumeram.

## Swept

- validation: C4, C13 (tamanho e tipo continuam em `Arquivos.Ler`, só se prova que a recusa precede a gravação)
- failure modes: C15, C16, C17, C18
- idempotency: C19 (`Preparar` repetido), C21 (mesma entrada gera chaves distintas)
- authorization: existing - `AgirNoChamado`, `ChamadoRotas.Carregar` e o grupo `/admin` não mudam; C8 e C9 provam que o download só abre a chave da linha filtrada por instituição
- concurrency: C17
- data lifecycle: C14, C20, C23 (objeto antigo mantido, nenhum código apaga, a migração recusa linha existente)
- dependency failure: C15, C16, C18
- state transitions: existing - `Chamado` e `Documento` não mudam de forma; C4 prova a recusa de estado sem objeto
- observability: n/a - o plano não pede log novo; a mensagem de C18 já cita endpoint e bucket

## Out of scope

- URL pré-assinada, object lock, envio direto do navegador, limpeza de órfãos, cópia dos bytes antigos, antivírus, criptografia em repouso, cotas e mudança de limites: ver `Out of scope` do plan
- Mutação (AD-025): nenhum check de `mutator` nesta feature; o gate segue suspenso por decisão do usuário

## Handoff

Tamanho estimado por slice = (2 x bytes dos arquivos existentes que a slice reescreve + 1 x bytes dos que só ganham método ou linha + bytes novos estimados) / 4 + 8k de saída das barreiras e das suítes. `ArquiteturaTests.cs` (54 354 B) conta 12 000 B por slice: o construtor lê só os auxiliares `Raiz`/`Api` e o fim da classe. O `Designer` da migração (gerado por `dotnet ef`) e o `OneDbModelSnapshot` não são lidos. Contexto fixo por construtor: este `checks.md` (25 576 B) + `plan.md` (21 682 B) + `build.md` (11 542 B) = 58 800 B / 4 ≈ 15k, mais o diff que já entrou no lote 2.

| Slice | Reescritos (2x, B) | Só ganham (1x, B) | Novos (B, est.) | Conta | ≈ |
| --- | --- | --- | --- | --- | --- |
| S1 | 39 960 (`ResponderChamado`, `Anexo`, `Entidades`, `EmailAnexoTests`, `ChamadoDominioTests`, `Program`, csproj, compose) | 45 418 (`OneFactory`, `OrdemDasRecusasTests`, `Chamado` só lido) | 15 000 (`Armazenamento.cs`, `ArmazenamentoTests`) + 12 000 (`ArquiteturaTests`) | (79 920 + 45 418 + 27 000) / 4 + 8k | 46k |
| S2 | 2 291 (`BaixarAnexo`, `BaixarVersaoDocumento`) | 12 000 (`ArmazenamentoTests`) | 8 000 + 12 000 (`ArquiteturaTests`) | (4 582 + 12 000 + 20 000) / 4 + 8k | 17k |
| S3 | 28 985 (`CriarDocumento`, `NovaVersaoDocumento`, `DocumentoRotas`, `VersaoDocumento`, `DocumentoDominioTests`, `ProvedorTests`, `AvaliarBuscaTests`) | 13 498 (`Documento` 1 498 + `ArmazenamentoTests` 12 000) | 8 000 | (57 970 + 13 498 + 8 000) / 4 + 8k | 28k |
| S4 | 3 842 (`Problemas`) | 31 506 (`Armazenamento` 3 000, `Program` 5 591, `OneFactory` 10 915, `ArmazenamentoTests` 12 000) | 10 000 | (7 684 + 31 506 + 10 000) / 4 + 8k | 20k |
| S5 | 0 | 15 000 (`ArmazenamentoTests` 12 000 + `Armazenamento` 3 000) | 4 000 + 15 000 (`ArquiteturaTests`) | (15 000 + 19 000 + 0) / 4 + 8k | 17k |
| S6 | 0 | 21 972 (`OneDb` 9 972 + `ArquiteturaTests` 12 000) | 3 000 (migração) + 8 000 (`MigracaoArquivosMinioTests`) | (21 972 + 11 000) / 4 + 8k | 16k |
| S7 | 0 | 49 669 (`RetratoTests` 35 309, `erros.txt` 1 360, `ArquiteturaTests` 12 000, compose 1 000) | 3 000 (`asserts_minio.py`) + 3 000 | (49 669 + 6 000) / 4 + 8k | 22k |

- Soma das slices: 166k; com o contexto fixo, 181k - acima do budget de 150k
- Corte em fronteira de slice, sem dividir nenhuma: **lote 1** = S1, S2, S3 (gravar e baixar anexo e PDF: 91k + 15k = 106k); **lote 2** = S4, S5, S6, S7 (falha, histórico, migração e retratos: 75k + 15k + diff do lote 1 de uns 15k = 105k). Nenhuma slice passa de 46k
- Mechanism: handoff em lotes sequenciais por subagente, só com o lote anterior verde - escolha do usuário em 02/11/2026
- Feature base (`<base>`): `8e73913`, o commit que congela `plan.md` e `checks.md`
- Ambiente: os testes de API precisam do serviço `minio` do compose de pé em `localhost:9000` (`docker compose up -d postgres mailpit minio`). O e2e usa imagem e porta próprias: `docker build -t one-minio <worktree limpo>` e `docker run` na porta 8082 com `E2E_URL=http://localhost:8082`, apontando `Armazenamento__Endpoint` para o MinIO do compose; container, imagem e worktree saem no fim
- Os commits das features `tempo-real-signalr` e `web-push` entram em `<base>..HEAD` quando rodam em paralelo e não são escopo destes checks, exceto quando mexem em `api.Tests` (C27 os pega)
- Lote 1, boundary: S1, S2 e S3 em `9ca2325` (compose, `AWSSDK.S3` 4.0.104.8) e `432dff2` (`Armazenamento`, migração `ArquivosMinio`, entidades, handlers, testes). `api.Tests` 345 verdes duas vezes; e2e 45 verdes (imagem própria, banco `one_minio_e2e` e bucket `one-e2e` já removidos). Imagem `cgr.dev/chainguard/minio@sha256:090010a3f73f6aa2dff606c61cd0de3640b22748abe19f4e48cce6dc9de7a53f` (entrypoint `/usr/bin/minio`, healthcheck `mc ready local` com `MC_HOST_local`). Fica para o lote 2: C5 aberto (o texto diz 400 para `.exe` em chamado fechado, a base responde 415; o teste entregue afirma 400 para nota com anexo, 415 para `.exe` e 409 para PNG válido, nesta ordem, e o construtor do lote 2 ou o usuário decide se o texto de C5 muda), C15 a C18 (503: hoje `Gravar`, `Baixar` e `Preparar` deixam subir `HttpRequestException`/`AmazonServiceException`/`InvalidOperationException`; `Preparar` já cita endpoint e bucket), C19 a C21, C22 a C24 (tabelas reais: `anexo` e `versao_documento`; `has-pending-model-changes` já sai limpo; o `OneDbModelSnapshot` foi regenerado e trocou o namespace antigo `One.Api.Dados.Anexo` pelo atual), C25 a C30 (`Armazenamento` já está na lista de `Fatias_do_api`; falta a linha no `.specs/GLOSSARIO.md`)
- Lote 1, settled mid-build: (1) imagem do MinIO `cgr.dev/chainguard/minio` por digest (decisão do usuário em 02/11); (2) `Baixar` usa URL assinada interna aberta com `HttpClient` (plan, Landing linha 6), porque o `ResponseStream` do SDK aloca 1,4x o objeto e reprova C11; (3) `Results.Stream` não define `Content-Length` com fluxo que não anda para trás, então `Armazenamento.ComTamanho` embrulha o `IResult` e grava o tamanho da linha; (4) `ArmazenamentoTests` fica numa coleção sem paralelismo porque `GC.GetTotalAllocatedBytes` conta o processo todo; (5) `Program` lê as quatro chaves `Armazenamento:*` e passa só o bucket ao `Armazenamento`; (6) `OneFactory`: bucket `one-teste-*` por instância, `PortaMinio` virtual (9000), `LeiturasDeObjeto` conta `GetObjectRequest` pelo `BeforeRequestEvent`, `Chaves()` e `Objeto()` leem o bucket direto e o `DisposeAsync` apaga todas as versões e o bucket. `Preparar` roda no `Program` depois do `Migrate` e depois do ramo do comando `instituicao` (o comando não precisa do MinIO): uma fábrica em porta fechada (C15/C16) não sobe com `Preparar` falhando (C18), então o lote 2 precisa trocar o `IAmazonS3` depois da subida ou deixar a fábrica derivada subir na porta real e só então apontar para a fechada
- Lote 1, abandoned: `GetObjectAsync(...).ResponseStream` para o download (alocação de 14,5 MB para 10 MiB); `IConfiguration` dentro do `Armazenamento` (C6 pede as quatro chaves em `Program.cs`)

- Lote 2, boundary: S4 a S7 em `6f94d1a` (503), `ffbb944` (migração), `8bab948` (delete, compose, glossário) e `f9fc2f8` (`asserts_minio.py`). `api.Tests` 361 verdes; e2e 45 verdes (imagem `one-minio` na porta 8082, banco `one_minio_e2e` e bucket `one-e2e` já removidos, junto do container e do worktree). `asserts_minio.py <base>`, `--erros` e `--autoteste` com 0 problemas; `has-pending-model-changes`, `ca1502_barra.sh` e `msg0005_barra.sh` ok. C1 a C30 marcados. O verificador deve saber: (a) a suíte e2e não envia nem baixa anexo (o único `setInputFiles` é o CSV de matrículas), então o trecho "enviando e baixando anexo" do C29 só é coberto pelos testes de API contra o mesmo MinIO e pela subida da imagem com `Armazenamento__*` do compose (o `Preparar` criou o bucket); (b) `dotnet test api.Tests` rodou inteiro só no `HEAD`, não em cada commit do lote; (c) `OneFactory.MinioFora()` aponta o `AmazonS3Config.ServiceURL` do cliente da API para a porta 1 depois da subida, em vez de uma fábrica em porta fechada, porque `Preparar` derruba a subida (a `OneFactoryMinioFechado` só prova o C18)
- Lote 2, settled mid-build: (1) Landing linha 7 do plano: `Gravar` e `Baixar` lançam `ArmazenamentoIndisponivel`, mapeada para 503 no `StatusCodeSelector` e no `CustomizeProblemDetails`; objeto ausente (404 do MinIO) também vira 503; (2) C5 segue a nota do coordenador (prova do lote 1: 400, 415 e 409); (3) o objeto ausente no C16 é provado apagando o objeto pelo cliente do teste (bucket versionado, marca de exclusão), porque a tabela `anexo` é append-only e a chave não pode ser trocada; (4) o conflito do C17 vem de `AfterResponseEvent` do `PutObject`, que altera o chamado em outra sessão antes do `SaveChanges`, com o chamado em `AGUARDANDO_ALUNO` e o aluno respondendo (resposta de equipe em `EM_ATENDIMENTO` não escreve a linha do chamado); (5) as exceções do C27 são as três listadas e o script confere a linha nova
- Lote 2, abandoned: fábrica derivada em porta fechada para o 503 de envio e leitura (a subida falha no `Preparar`); `try/catch` com `Problemas.Erro(503)` em cada caso de uso (Landing linha 7)

### Nota do coordenador sobre o C5 (02/11/2026, depois do lote 1)

- O texto do C5 diz 400 para um `.exe` enviado a chamado fechado, mas a base responde 415: o `AgirNoChamado`
  confere o corpo antes do 409 de estado. O plano exige que nada mude para o usuário, então vale o comportamento
  da base. O C5 fica provado pelo teste do lote 1, que exige 400 (nota com anexo), 415 (`.exe`) e 409 (PNG válido),
  nessa ordem. Erro de texto do check (como L-021), não mudança de comportamento.
- **Decisão do usuário em 02/11/2026 sobre o C5 (depois da verificação rodada 1):** aceito o comportamento da base,
  415 para `.exe` em chamado fechado; o C5 vale pelo teste que exige 400 (nota com anexo), 415 (`.exe`) e 409 (PNG
  válido), nessa ordem.
- **Decisão do usuário em 02/11/2026 sobre o C29:** criar o e2e real com anexo (Playwright contra o contêiner, usuário
  criado pelo primeiro acesso com o Mailpit, envio e download de um PDF conferindo os bytes).
