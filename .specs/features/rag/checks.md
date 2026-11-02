# RAG com OpenAI - checks

Profile: standard
Plan: `.specs/features/rag/plan.md`

45 checks em 4 slices · 6 one-way doors · 5 perguntas abertas, 1 bloqueia (a 1, só a chamada real; nenhum check depende dela) e 4 bloqueiam só o uso real

**Como as provas rodam.** Mesmas ferramentas do `mvp-one`:

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `WebApplicationFactory<Program>`, provedor OpenAI falso por `HttpMessageHandler` (chat e embeddings, vetores determinísticos), relógio por `TimeProvider` | `docker compose up -d postgres mailpit` com a imagem `pgvector/pgvector:0.8.7-pg18` (C22); cada classe de teste cria o próprio banco |
| `web/` unidade | Vitest + Testing Library (`npm --prefix web run test`) | `npm --prefix web ci` |

Todos os comandos rodam na raiz `D:\one-system`. Cada prova nomeia um teste; o nome é o contrato
com o construtor.

## Checks

### S1 - O assistente passa a usar a OpenAI (P1) · ~5 files · ~30 KB · ~8k

**C1** - Uma mensagem do aluno gera `POST https://llm.teste/v1/chat/completions` com `model` `gpt-6-luna`, `response_format` `{"type":"json_object"}`, `max_completion_tokens` 800 e `reasoning_effort` `none`, e o corpo não tem `max_tokens`, `temperature` nem `thinking` (AC 1, door R1; substitui o nº 53 do `mvp-one`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Parametros_e_ordem_do_prompt"`

**C2** - Com `usage` `{"prompt_tokens":1200,"completion_tokens":80,"prompt_tokens_details":{"cached_tokens":1000}}`, o log da chamada traz `entradaComCache` 1000, `entradaSemCache` 200 e `saida` 80 (AC 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ProvedorTests.Log_tokens_com_cache_openai"`

**C3** - O chat respondendo 429, 500, demorando mais de 20 s ou devolvendo JSON inválido faz o aluno ver o texto fixo de `sem_base`, e o log traz o motivo de cada caso (AC 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ProvedorTests.Falhas_do_chat_viram_sem_base"`

**C4** - Sem configuração de teste, o app lê `Llm:BaseUrl` `https://api.openai.com/v1`, `Llm:Modelo` `gpt-6-luna` e `Llm:ModeloEmbeddings` `text-embedding-3-small`, e o `docker-compose.yml` passa `Llm__ChaveApi` ao contêiner da `api` (door R1)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ProvedorTests.Configuracao_padrao_openai"`

**C5** - O corpo enviado ao chat traz só as regras fixas, os trechos buscados (id da fonte, título da fonte, texto do trecho e links do artigo de origem), as categorias ativas e as últimas 10 mensagens mascaradas; nome, CPF, matrícula e curso do aluno nunca aparecem (AC 34 do `mvp-one` com a busca; substitui o C52)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Corpo_so_traz_o_permitido"`

### S2 - O assistente busca por significado nos artigos (P1) · ~12 files · ~90 KB · ~22k

**C6** - Ativar um artigo grava 1 trecho de fonte pendente (sem embedding) com o título, as perguntas e a resposta da versão atual; editar o artigo ativo grava o trecho da versão nova; uma falha forçada na gravação do trecho deixa o artigo no estado anterior (AC 4)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndexacaoTests.Ativar_e_editar_gravam_trecho_pendente"`

**C7** - Com 250 trechos pendentes em duas instituições, uma execução do agendador faz 3 chamadas a `/embeddings` com 100, 100 e 50 entradas e grava um vetor de 1536 posições em cada trecho (AC 5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndexacaoTests.Lotes_de_100_gravam_vetores"`

**C8** - Com `/embeddings` respondendo 500, cada uma de 5 execuções soma 1 a `tentativas` dos trechos do lote, marca a próxima para 2^`tentativas` minutos e grava a falha no log com a instituição; a 6ª execução não chama a API, e `GET /api/admin/artigos` mostra `indexacao` `FALHOU` (AC 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndexacaoTests.Falha_de_embeddings_tenta_5_vezes"`

**C9** - `GET /api/admin/artigos` responde 200 com `indexacao` `PENDENTE` logo depois de ativar e `INDEXADO` depois da execução do agendador (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndexacaoTests.Indexacao_no_admin"`

**C10** - Com 7 artigos indexados, uma mensagem faz o chat receber exatamente os 5 trechos mais próximos do vetor da consulta, em ordem crescente de distância de cosseno (AC 7; substitui o nº 133 do `mvp-one`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Chat_recebe_os_5_mais_proximos"`

**C11** - Na 4ª mensagem de uma conversa, a entrada enviada a `/embeddings` é a concatenação da 2ª, 3ª e 4ª mensagens do aluno e não traz a 1ª; uma resposta "sim" depois de uma conversa sobre boleto ainda busca o trecho do boleto (AC 7)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Consulta_com_as_ultimas_3_mensagens"`

**C12** - A entrada enviada a `/embeddings` troca `2000567890`, `123.456.789-09` e `aluno@x.com` por `[número removido]` e `[e-mail removido]`, como o corpo do chat (AC 7, AC 34 do `mvp-one`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Consulta_de_embedding_mascarada"`

**C13** - A busca nunca devolve trecho de artigo `RASCUNHO`, `ARQUIVADO`, com `visivelAte` ontem, com `visivelDe` amanhã, de versão anterior, sem embedding ou de outra instituição, mesmo quando é o mais próximo da consulta (AC 8; substitui o nº 195 do `mvp-one`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.So_trechos_buscaveis"`

**C14** - Depois de arquivar um artigo, a próxima mensagem não recebe o trecho dele, e a conversa que o citou continua mostrando o texto exibido (AC 9; substitui o nº 134 do `mvp-one`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Arquivar_tira_da_busca"`

**C15** - Sem nenhum trecho indexado na instituição, o chat recebe a lista de fontes vazia e uma `resposta` do modelo vira `sem_base` (AC 10)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Sem_trechos_indexados"`

**C16** - Uma `resposta` que cita o id de um trecho de artigo ativo da instituição que não estava entre os buscados vira `sem_base`, e o log traz `fonte_invalida` (AC 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Fonte_fora_dos_buscados_sem_base"`

**C17** - Contra o trecho de fonte citado: um trecho copiado literalmente gera `resposta`; um trecho que não está no texto do trecho de fonte gera `sem_base` com `trecho_invalido`; um link que não está nos links do artigo de origem gera `sem_base` com `link_invalido` (AC 12, door 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Conferencia_contra_o_trecho_de_fonte"`

**C18** - A mensagem do assistente guarda `trechos_buscados` com os ids na ordem da busca (e uma lista vazia quando nada foi buscado), e cada citação nova guarda o `trecho_fonte_id` com `versao_artigo_id` nulo (AC 13, door R5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Grava_buscados_e_citacoes"`

**C19** - `UPDATE` e `DELETE` em `versao_documento` e em `citacao_artigo`, `DELETE` em `trecho_fonte` e `UPDATE` de `texto` ou de `embedding` já preenchido em `trecho_fonte` lançam exceção do trigger e a linha fica igual; `UPDATE` de `embedding` nulo para um vetor é aceito (Relations, door R3, door 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ImutabilidadeRagTests.Trechos_e_versoes_append_only"`

**C20** - Com `/embeddings` respondendo 500 na consulta, o aluno vê o texto fixo de `sem_base`, o chat recebe 0 chamadas e o log traz `busca_indisponivel` (AC 14)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Embedding_da_consulta_falha_sem_base"`

**C21** - O log de cada busca traz instituição, conversa, ids buscados, distâncias e duração em milissegundos, e não traz o texto de nenhuma mensagem do aluno (AC 15)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~BuscaTests.Log_da_busca_sem_texto"`

**C22** - O banco tem a extensão `vector`, `trecho_fonte.embedding` é `vector(1536)` com índice `hnsw` `vector_cosine_ops`; o `docker-compose.yml` usa `pgvector/pgvector:0.8.7-pg18`; o modelo do `OneDbDesignTime` mapeia `embedding` para `vector(1536)` (door R2; substitui a parte da imagem do nº 19 do `mvp-one`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaRagTests.Pgvector_e_indice_hnsw"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Layout_e_compose"`

**C23** - Inserir por SQL um `trecho_fonte` com `versao_artigo_id` e `versao_documento_id` preenchidos, ou com os dois nulos, viola o `CHECK`; inserir uma citação sem `trecho_fonte_id` e sem `versao_artigo_id` viola o `CHECK` (Relations, doors R3 e R5)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaRagTests.Check_constraints"`

**C24** - `documento`, `versao_documento` e `trecho_fonte` têm `instituicao_id` não nulo com FK e filtro global, como as outras 20 tabelas (Relations, door 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro"`

**C25** - `.specs/STATE.md` tem as entradas ativas do provedor OpenAI e da busca por trechos, e a AD-006 está marcada como substituída (door R6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaRagTests.Decisoes_registradas"`

### S3 - Documentos da instituição viram fonte do assistente (P1) · ~12 files · ~100 KB · ~25k

**C26** - `POST /api/admin/documentos` com um PDF de 2 páginas com texto, título e categoria ativa responde 201 com o documento `ATIVO`, versão 1, `paginas` 2, e grava na mesma transação o texto extraído e os trechos pendentes (AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Subir_pdf_201"`

**C27** - A divisão de um texto em trechos produz trechos de no máximo 1500 caracteres, corta no fim de parágrafo quando há um antes do limite, senão no fim de frase, e repete os últimos 200 caracteres do trecho anterior no começo do seguinte; um texto de 1500 caracteres vira 1 trecho e um de 1501 vira 2 (AC 17)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DivisaoTests.Trechos_de_ate_1500_com_sobreposicao"`

**C28** - Em `POST /api/admin/documentos` e em `POST /api/admin/documentos/{id}/versoes`: arquivo sem `%PDF` responde 415; PDF de 20 MB + 1 byte responde 413 e de exatamente 20 MB é aceito; PDF sem texto responde 400 com `detail` "O PDF não tem texto. Exporte o documento com texto, não digitalizado."; sem título, com categoria inativa, inexistente ou de outra instituição responde 400; em nenhum caso grava documento, versão ou trecho (AC 18)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Recusas_do_upload"`

**C29** - `POST /api/admin/documentos/{id}/versoes` responde 201 com a versão 2, a versão 1 continua legível, e depois da indexação a busca devolve só trechos da versão 2 (AC 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Nova_versao"`

**C30** - Arquivar responde 200 e tira os trechos do documento da busca seguinte, mantendo a conversa que o citou; arquivar de novo responde 409; nova versão de documento arquivado responde 409; `versoes` e `arquivar` com id inexistente respondem 404 (AC 20, Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Arquivar"`

**C31** - No detalhe do chamado, a equipe vê cada fonte com `tipo` (`ARTIGO` com o título e a versão do artigo; `DOCUMENTO` com o título, a versão e o trecho confirmado do documento), e `GET /api/documentos/versoes/{id}` responde 200 com o PDF (mesmos bytes, `application/pdf`) a atendente e a administrador (AC 21, Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Fonte_documento_no_detalhe"`

**C32** - Para o aluno, as respostas de `POST /api/conversas`, mensagens, `GET /api/conversas/{id}`, `GET /api/chamados` e `GET /api/chamados/{numero}` não trazem título, texto, trechos, ids nem nome de arquivo do documento citado, nem as chaves `trechoFonteId`, `trechos` ou `fontes`, e `GET /api/documentos/versoes/{id}` responde 404 (AC 22)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SigiloRagTests.Aluno_nao_recebe_dado_de_documento"`

**C33** - Numa conversa cuja última citação é de um documento da categoria "Estágio", o chamado transferido fica na categoria "Estágio" com origem `ARTIGO`; com a última citação de artigo depois do documento, fica na categoria do artigo (AC 23)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Categoria_do_documento_no_chamado"`

**C34** - A tela Documentos lista título, categoria, estado, versão, páginas e indexação; sem documentos mostra "Nenhum item cadastrado."; "Arquivar" abre um `Modal` e só chama a API depois de confirmar (AC 24)
Proof: `npm --prefix web run test -- -t "tela Documentos lista, vazio e confirma arquivar"`

**C35** - Aluno e atendente sem o papel administrador recebem 403 nas 29 rotas `/api/admin/*`, agora com as 4 de documentos (Surface, AC 104 do `mvp-one`; substitui a contagem do C137)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AdminTests.Sem_papel_admin_403"`

**C36** - Um administrador da `demo` recebe 404 em `POST /api/admin/documentos/{id}/versoes`, `POST /api/admin/documentos/{id}/arquivar` e `GET /api/documentos/versoes/{id}` com ids que só existem na `univag`, e o documento da `univag` fica igual (AC 7 do `mvp-one`, door 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Documento_de_outra_instituicao_404"`

**C37** - Sem cookie, as 54 rotas `/api/*` privadas respondem 401, agora com as 5 de documentos (Surface; substitui a contagem do nº 36 do `mvp-one`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SessaoTests.Sem_cookie_401_em_toda_rota_privada"`

**C38** - `GET /api/admin/documentos` responde 200 com cada documento, a categoria, o estado, a versão atual com `nomeArquivo` e `paginas`, e `indexacao`, em ordem de título (Surface)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Listar_200"`

**C39** - A tela Artigos mostra o estado da indexação de cada artigo ("Indexado", "Indexando" ou "Falhou") (Observable)
Proof: `npm --prefix web run test -- -t "artigos mostram a indexação"`

**C40** - O detalhe do chamado na SPA mostra, numa fonte de documento, o título com o ícone de documento, o trecho confirmado e o link para o PDF da versão citada (AC 21)
Proof: `npm --prefix web run test -- -t "fonte de documento no detalhe"`

### S4 - O grupo mede a busca com perguntas reais antes do piloto (P1) · ~3 files · ~20 KB · ~5k

**C41** - `instituicao avaliar-busca` com 3 perguntas (duas que acham a fonte esperada nas posições 1 e 3 e uma longe de todas) imprime "acerto 1", "acerto 3", "erro" com os títulos buscados e "2/3", e sai com código 0 (AC 25)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvaliarBuscaTests.Avaliacao_valida_sai_0"`

**C42** - Durante o `avaliar-busca`, o chat do provedor falso recebe 0 chamadas, `/embeddings` recebe uma por pergunta, e o banco tem as mesmas linhas antes e depois (AC 26)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvaliarBuscaTests.Nao_chama_chat_nem_grava"`

**C43** - `avaliar-busca` com slug inexistente, arquivo que não é JSON, pergunta vazia ou `fonte` que não é título de artigo ou documento ativo imprime o caminho e o motivo na saída de erro e sai com código 1 (AC 27)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AvaliarBuscaTests.Arquivo_invalido_sai_1"`

**C44** - As 4 rotas `/api/admin/documentos*` e `GET /api/documentos/versoes/{id}` respondem erros em `application/problem+json` com `detail` em português (door 8 do `mvp-one`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Erros_em_problem_json"`

**C45** - `GET /api/chamados/{numero}` responde 404 a atendente de outro setor também num chamado com fonte de documento, e o aluno dono continua recebendo 200 (Surface, AC 72 do `mvp-one`)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests.Detalhe_com_documento_segue_visibilidade"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/admin/documentos` statuses (3) | 200 C38 · 401 C37 · 403 C35 | - |
| `POST /api/admin/documentos` statuses (5) | 201 C26 · 400 C28 · 403 C35 · 413 C28 · 415 C28 | - |
| `POST /api/admin/documentos/{id}/versoes` statuses (7) | 201 C29 · 400 C28 · 403 C35 · 404 C30 · 409 C30 · 413 C28 · 415 C28 | - |
| `POST /api/admin/documentos/{id}/arquivar` statuses (4) | 200 C30 · 403 C35 · 404 C30 · 409 C30 | - |
| `GET /api/documentos/versoes/{id}` statuses (3) | 200 C31 · 401 C37 · 404 C32 | - |
| `GET /api/admin/artigos` statuses, assinatura nova (3) | 200 C9 · 401 C37 · 403 C35 | - |
| `GET /api/chamados/{numero}` statuses, assinatura nova (3) | 200 C31 · 401 C37 · 404 C45 | - |
| rotas novas com `{id}` de outra instituição (3) | C36, table-driven over all 3 | - |
| falhas do chat (4) | 429 C3 · 500 C3 · tempo esgotado C3 · JSON inválido C3 | - |
| campos do corpo do chat (7) | `model` C1 · `response_format` C1 · `max_completion_tokens` C1 · `reasoning_effort` C1 · sem `max_tokens` C1 · sem `temperature` C1 · conteúdo C5 | - |
| configuração padrão (4) | `Llm:BaseUrl` C4 · `Llm:Modelo` C4 · `Llm:ModeloEmbeddings` C4 · `Llm__ChaveApi` no compose C4 | - |
| filtros da busca (7) | C13, table-driven over all 7 | - |
| recusas do upload (7) | sem `%PDF` C28 · 20 MB + 1 C28 · sem texto C28 · sem título C28 · categoria inativa C28 · inexistente C28 · de outra instituição C28 | - |
| limite de 20 MB (2 bordas) | 20 MB C28 · 20 MB + 1 C28 | - |
| divisão em trechos (5) | limite 1500 C27 · 1501 vira 2 C27 · corte em parágrafo C27 · corte em frase C27 · sobreposição 200 C27 | - |
| lote de embeddings (3) | 100 C7 · 100 C7 · 50 C7 | - |
| tentativas de embeddings (5) | C8, table-driven over all 5 | - |
| motivos de `sem_base` novos (3) | `fonte_invalida` C16 · `busca_indisponivel` C20 · nada indexado C15 | - |
| conferência contra o trecho de fonte (3) | trecho literal C17 · trecho inventado C17 · link alheio C17 | - |
| tipos de fonte no detalhe (2) | `ARTIGO` C31 · `DOCUMENTO` C31 | - |
| `indexacao` (3) | `PENDENTE` C9 · `INDEXADO` C9 · `FALHOU` C8 | - |
| saídas do `avaliar-busca` (2) | 0 C41 · 1 C43 | - |
| erros do `avaliar-busca` (4) | C43, table-driven over all 4 | - |
| one-way doors (6) | R1 C1 · R2 C22 · R3 C19 · R4 C26 · R5 C18 · R6 C25 | - |
| entidades de Relations (5) | `documento` C24 · `versao_documento` C19 · `trecho_fonte` C23 · citação C18 · trechos buscados C18 | - |
| restrições de Relations (5) | um tipo de versão por trecho C23 · citação com fonte C23 · append-only C19 · 1536 dimensões C22 · instituição C24 | - |
| checks do `mvp-one` substituídos (8) | nº 19 do mvp -> C22 · nº 36 do mvp -> C37 · nº 52 do mvp -> C5 · nº 53 do mvp -> C1 · nº 133 do mvp -> C10 · nº 134 do mvp -> C14 · nº 137 do mvp -> C35 · nº 195 do mvp -> C13 | - |
| startup config: mapeamento `vector` do Npgsql (2 places) | `Program.cs` (app, testes e comando) C22 · `OneDbDesignTime` (migrações) C22 | - |

- Claims naming a status code, route or response shape: todas as provas de `api.Tests` atravessam o
  HTTP pelo `WebApplicationFactory<Program>`, menos C19, C22, C23, C24, C25 e C27, que afirmam regras
  do banco, do modelo, do registro de decisões ou da divisão de texto e as testam na camada delas
- Nenhuma outra check afirma mais do que o caso que a prova exercita

## Test policy

O repositório não tem guia de testes; valem as mesmas linhas do `mvp-one`, com a evidência desta
feature.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide e é alcançado por HTTP: filtros da busca, conferência contra o trecho, recusas do upload, falhas do provedor | uma prova na fronteira, tabelada | um caso afirmado por linha da tabela de decisão, na fronteira |
| Decide e não depende de HTTP: divisão em trechos, lotes e tentativas do agendador | uma na própria camada | um caso por linha, com os limites (1500 e 1501; 100 e 50; 5 tentativas) |
| Entrada que não decide: corpo das rotas de documento, arquivo do `avaliar-busca` | uma na fronteira | entrada aceita, cada recusa, cada erro |
| Instrumentação, repasses | nenhuma própria | coberta pela prova de quem a usa |

Evidence:

- divisão em trechos: 5 pontos de decisão (limite, parágrafo, frase, sobreposição, último trecho) -> decide, própria camada (C27)
- filtros da busca: 7 condições na consulta -> decide, na fronteira (C13)
- recusas do upload: 7 motivos -> entrada, na fronteira (C28)
- agendador de embeddings: lote, tentativa, desistência -> decide, própria camada pelo agendador (C7, C8)
- análogo no repositório: `AgendadorTests` e `EmailFalhaTests` (mesma forma de tentativas), `ImportacaoTests` (recusas tabeladas)

Cost: 0 provas além das 45 escritas; as tabelas de decisão já estão nas provas tabeladas.

## Swept

- validation: C28, C43, C27
- failure modes: C6, C8, C20
- idempotency: C7, C8 (só trechos com embedding nulo entram no lote; a 6ª execução não chama a API)
- authorization: C32, C35, C36, C45
- concurrency: C19 (o embedding só é gravado uma vez num trecho que ainda não tem; uma segunda gravação concorrente é recusada pelo trigger)
- data lifecycle: C14, C29, C30
- dependency failure: C3, C8, C20
- state transitions: C29, C30
- observability: C2, C8, C21

## Handoff

Tamanho estimado pelo código que cada slice cria ou altera (bytes / 4), mais o contexto fixo: o
`plan.md` desta feature (~30 KB) e este `checks.md` (~25 KB), cerca de 14k, e o código existente
que o construtor precisa ler (`Assistente.cs`, `Agendador.cs`, `ChamadoRotas.cs`, `ArtigoRotas.cs`,
`OneDb.cs`, `Entidades.cs`, a infraestrutura de testes e as duas telas web tocadas), cerca de 40k.

- S1 = 8k; S2 entra em indexação e busca a 30k; S3 entra em documentos a 55k; S4 a 60k. Com o
  contexto fixo e o código existente: 60k + 14k + 40k = 114k, abaixo do budget de 150k - um
  construtor
- Mechanism: um construtor (cabe no budget, sem pergunta)
