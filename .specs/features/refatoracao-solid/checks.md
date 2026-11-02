# Refatoração SOLID e Clean Code - checks

Profile: standard
Plan: `.specs/features/refatoracao-solid/plan.md`

39 checks em 5 slices · 3 one-way doors · 1 pergunta aberta, nenhuma bloqueia

**Como as provas rodam.** Mesmas ferramentas do `mvp-one` e do `rag`, mais as do `ub-mode`:

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| `api.Tests` | xUnit v3 com `WebApplicationFactory<Program>`; testes de regra pura sem `OneFactory` | `docker compose up -d postgres mailpit` (só para os que usam `OneFactory`) |
| `web/` unidade | Vitest + Testing Library (`npm --prefix web run test`) | `npm --prefix web ci` |
| `web/` e2e | Playwright (`npm --prefix web run e2e`) | os mesmos pré-requisitos do `mvp-one` |
| complexidade e mutação do `web/` | `crapper`, `dryer`, `mutator` rodados dentro de `web/` | `npm --prefix web run coverage` |
| complexidade do `api/` | CA1502 no `dotnet build` (door 2) | nenhum |

Todos os comandos rodam na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é o commit em que o
build começa, gravado no `## Handoff`. Cada prova nomeia um teste ou um comando; o nome é o
contrato com o construtor.

## Checks

### S1 - Rede de segurança e medição antes de mexer (P1) · ~6 files · ~20 KB · ~5k

**C1** - A suíte inteira que existe em `<base>` passa em cada commit desta feature: API, web e e2e (AC 1)
Proof: `dotnet test api.Tests`
Proof: `npm --prefix web run test`
Proof: `npm --prefix web run e2e`

**C2** - Nenhuma asserção existente em `<base>` foi removida, alterada ou pulada: toda linha removida com `Assert`, `expect(` ou `toBe`/`toHave` em `api.Tests/**/*.cs`, `web/src/**/*.test.tsx` e `web/e2e/**` reaparece idêntica (espaços normalizados) como linha adicionada, e nenhuma linha adicionada traz `Skip =`, `.skip(` nem `.only(` (AC 1)
Proof: `python .specs/features/refatoracao-solid/asserts_preservados.py <base>`

**C3** - `npm --prefix web run coverage` sai 0 e grava `web/coverage/lcov.info` não vazio, com `@vitest/coverage-v8` na versão exata do `vitest` (5.0.5) (AC 2, door 1)
Proof: `npm --prefix web run coverage && test -s web/coverage/lcov.info`

**C4** - O `crapper` rodado em `web/` depois da cobertura mostra `ChamadoDetalhe` com cobertura acima de 0.0% (AC 3)
Proof: `cd web && crapper --use-existing-coverage -s src | grep -E "^ChamadoDetalhe +[^ ]+ +[0-9]+ +([1-9][0-9.]*|0\.[0-9]*[1-9][0-9]*)%"`

**C5** - Um método plantado com complexidade ciclomática 11 em `api/` faz o `dotnet build` falhar com `CA1502` com o nome do método, e o mesmo método com complexidade 10 compila sem `CA1502` (AC 4, door 2)
Proof: `bash .specs/features/refatoracao-solid/ca1502_barra.sh`

**C6** - `api/CodeMetricsConfig.txt` contém `CA1502(Method): 10`, o `api/One.Api.csproj` o inclui como `AdditionalFiles` e põe `CA1502` em `WarningsAsErrors`, e o `.editorconfig` da raiz tem `dotnet_diagnostic.CA1502.severity = warning` (door 2)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Barreira_de_complexidade_configurada"`

**C7** - `.specs/features/refatoracao-solid/baseline.md` existe, foi adicionado num commit anterior ao primeiro commit que move ou altera código de `api/` ou `web/src/`, e traz a contagem de `CA1502` por arquivo no limite 10 e o top 10 do `crapper` do `web/src` com cobertura (AC 5)
Proof: `python .specs/features/refatoracao-solid/baseline_antes.py <base>`

### S2 - Uma decisão em um lugar (P1) · ~22 files · ~130 KB · ~38k

**C8** - [x] Com `Prazos:ConfirmacaoDias` = 10: um chamado resolvido há 9 dias e 23 h continua `RESOLVIDO`; com 10 dias ele fecha, o evento traz "Fechado automaticamente: 10 dias sem confirmação" e o e-mail de resolução traz "(até 10 dias)" (AC 6)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrazosTests.Confirmacao_de_10_dias_fecha_no_10o_e_textos_dizem_10"`

**C9** - [x] Com `Prazos:ConfirmacaoDias` = 10: rejeitar com 10 dias exatos depois da resolução é aceito; com 10 dias e 1 min a API responde 409 com detail "O prazo de 10 dias para rejeitar a resolução terminou." (AC 7)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrazosTests.Rejeicao_segue_prazo_de_confirmacao"`

**C10** - [x] Com `Prazos:LembreteAguardandoDias` = 4: o lembrete não sai com 3 dias e 23 h; sai com 4 dias, e o evento traz "Lembrete ao aluno: 4 dias aguardando resposta" (AC 8)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrazosTests.Lembrete_de_4_dias_no_texto"`

**C11** - [x] Sem nenhuma chave `Prazos:*`, valem 30 min de abandono, 7 dias de confirmação e de rejeição, 3 dias de lembrete e 7 dias para resolver aguardando, e os textos dizem "7 dias" e "3 dias" como hoje (AC 9)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AgendadorTests"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PrazosTests.Padroes_sem_configuracao"`

**C12** - [x] Fora do arquivo que declara as constantes de cada grupo, o código de `api/` (sem `Dados/Migracoes`) não contém, entre aspas, nenhum dos 15 literais gravados: tipos de evento `CRIACAO`, `TRANSICAO`, `ATRIBUICAO`, `LEMBRETE`, `NOTA`, `RESPOSTA`, `ANEXO`, `ENCAMINHAMENTO`, `RECLASSIFICACAO`; tipos de mensagem `PUBLICA`, `NOTA`; motivos de fechamento `CONFIRMADO`, `CANCELADO`, `DUPLICADO`, `FECHADO_AUTOMATICAMENTE`; e cada um é declarado uma vez no seu grupo, com o valor de hoje (AC 10)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Literais_gravados_so_nas_constantes"`

**C13** - [x] A expressão "última versão" (`OrderByDescending(... .Numero)` ou `Max(... .Numero)` sobre versões de artigo ou documento) aparece em exatamente 1 arquivo de `api/`, dentro de `api/Conhecimento` (AC 11)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Ultima_versao_em_um_arquivo"`

**C14** - [x] O teste de "é artigo ou documento" (`VersaoArtigoId`/`VersaoDocumentoId` comparado a `null`, `is { }`, `is null`, `is not null`) aparece em exatamente 1 arquivo de `api/` fora de `api/Dados`, dentro de `api/Conhecimento` (AC 12)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Artigo_ou_documento_em_um_arquivo"`

**C15** - [x] As chaves `Llm:BaseUrl` e `Llm:ChaveApi` são lidas em exatamente 1 lugar, o registro do cliente `"llm"`, e `App:UrlBase` em exatamente 1 lugar (AC 13)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Configuracao_lida_em_um_lugar"`

**C16** - [x] Com o cliente `"llm"` configurado uma vez, o chat continua chamando `https://llm.teste/v1/chat/completions` e os embeddings `https://llm.teste/v1/embeddings`, com `Authorization: Bearer` da chave e timeout de 20 s (AC 13; fecha também a URL de embeddings que a rodada 2 do `rag` achou sem prova)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Parametros_e_ordem_do_prompt"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~LlmRequisicaoTests.Embeddings_usam_a_url_base"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ProvedorTests.Falhas_do_chat_viram_sem_base"`

**C17** - [x] A assinatura de arquivo (`0x25 0x50 0x44 0x46` do PDF) aparece em exatamente 1 arquivo de `api/`, e anexos e documentos continuam respondendo 413 acima do limite e 415 com tipo errado (AC 14)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Assinatura_de_arquivo_em_um_lugar"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~EmailAnexoTests"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~DocumentoTests"`

**C18** - [x] Os limites de senha 8 e 128 são declarados em exatamente 1 lugar, e a senha de 7 e a de 129 caracteres continuam recusadas na troca de senha e no cadastro de usuário, a de 8 e a de 128 aceitas (AC 15)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Limites_de_senha_em_um_lugar"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~SenhaTests.Limites_7_8_128_129"`

**C19** - [x] O código de `api/` não contém `DateTime.UtcNow` nem `DateTime.Now` (AC 16)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Sem_DateTime_Now"`

**C20** - [x] `.specs/GLOSSARIO.md` lista cada um dos 15 literais do C12 com o grupo e o significado, e os 5 prazos do C11 com a chave `Prazos:*` e o padrão (AC 17)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Glossario_lista_os_termos"`

### S3 - Regras de negócio puras, testadas sem banco (P1) · ~12 files · ~90 KB · ~30k

**C21** - A tabela de permissões do chamado devolve, para cada uma das 11 ações × 2 papéis (`ALUNO`, `ATENDENTE`) × 5 estados, exatamente as ações de hoje: par ausente nega, estado fora da lista nega, e `assumir` some para quem já é o responsável - um caso afirmado por célula, 110 células mais o caso do responsável (AC 18)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PermissoesChamadoTests.Acoes_por_papel_e_estado"`

**C22** - A função dos indicadores recebe chamados, eventos e o fuso e devolve os 14 indicadores; para um chamado resolvido 10 h depois de aberto, com 4 h em `AGUARDANDO_ALUNO`, o tempo de resolução é 6 h (AC 19, AC 20)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresCalculoTests.Resolucao_desconta_aguardando"`

**C23** - Sobre a mesma massa do `IndicadoresTests` de hoje, a função pura devolve os mesmos 14 números que a rota devolve (AC 19)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresCalculoTests.Os_14_iguais_aos_da_rota"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~IndicadoresTests"`

**C24** - A validação da carga devolve a lista de erros sem gravar, com um caso afirmado por motivo (os 16 motivos de `setores`, `categorias`, `cursos`, `regras` e `artigos`), e o comando com qualquer erro não grava nenhuma linha (AC 21)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CargaValidacaoTests.Um_caso_por_motivo"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests"`

**C25** - A leitura do CSV de matrículas devolve as linhas válidas e os erros por linha sem gravar, com os mesmos textos de hoje, um caso afirmado por motivo (os 10 motivos), incluindo dois motivos na mesma linha juntados por "; " (AC 22)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~CsvMatriculasTests.Um_caso_por_motivo"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AdminTests"`

**C26** - A regra de pergunta do assistente aceita uma pergunta de 200 caracteres terminada em "?", recusa a de 201, recusa a que não termina em "?", aceita a 2ª pergunta seguida e recusa a 3ª (AC 23, AC 24)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~PerguntaTests.Limites"`

**C27** - As classes `PermissoesChamadoTests`, `IndicadoresCalculoTests`, `CargaValidacaoTests`, `CsvMatriculasTests` e `PerguntaTests` não usam `OneFactory`, `OneDb` nem `HttpClient` (AC 18, 19, 21, 22, 24)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Testes_de_regra_sem_banco"`

### S4 - O `api/` em fatias verticais, um arquivo por responsabilidade (P1) · ~25 files · ~175 KB · ~30k

**C28** - Nenhum arquivo de `api/Chamados` usa `VersoesArtigo` nem `VersoesDocumento`, e o detalhe do chamado continua mostrando à equipe a fonte citada (artigo ou documento, com o link do PDF da versão citada) e o aviso de versão atualizada (AC 25)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Chamados_nao_consulta_versoes"`
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~VersaoCitadaTests"`

**C29** - As pastas de `api/` (sem `bin`, `obj`, `Properties`, `wwwroot`) são exatamente `Acesso`, `Assistente`, `Chamados`, `Conhecimento`, `Indicadores`, `Administracao`, `Instituicoes` e `Dados`; `api/Rotas` e `api/Comando` não existem; na raiz de `api/` só ficam `Program`, `Problemas`, `Sessao`, `Cpf`, `Tokens`, `Email`, `Agendador` e o arquivo dos prazos (AC 26, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Fatias_do_api"`

**C30** - Cada `.cs` de `api/` fora de `Dados/Migracoes` declara `namespace One.Api` na raiz e `namespace One.Api.<Pasta>` nas pastas (AC 27, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Namespace_igual_a_pasta"`

**C31** - Todo `using One.Api.<Fatia>` dentro de outra fatia está na lista fechada de pares do teste, e a lista só traz pares que existem no código (a lista não pode ter sobra) (AC 28, door 3)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Referencias_entre_fatias"`

**C32** - O arquivo de `api/Administracao` que mapeia `POST /api/admin/matriculas/importar` não mapeia nenhuma outra rota (AC 29)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Importacao_em_arquivo_proprio"`

**C33** - Criar um atendente com 2 setores e editar um usuário trocando papéis e setores fazem exatamente 1 `SaveChanges` cada, contados por um interceptor do EF no teste (AC 30)
Proof: `dotnet test api.Tests --filter "FullyQualifiedName~AdminTests.Usuario_grava_uma_vez"`

**C34** - `dotnet build api` termina com 0 avisos e 0 erros `CA1502` no limite 10 (AC 31)
Proof: `dotnet build api -warnaserror:CA1502`

### S5 - O `web/` em fatias verticais, telas com CRAP abaixo de 10 (P1) · ~25 files · ~130 KB · ~55k

**C35** - As pastas de `web/src` (sem `test`) são exatamente `acesso`, `assistente`, `chamados`, `conhecimento`, `indicadores` e `administracao`; `web/src/telas` não existe; cada `*.test.tsx` está dentro da fatia da tela que testa; na raiz de `web/src` só ficam `main`, `App`, `api`, `acao`, `datas`, `sessao`, o layout `Autenticado` e o que 2 ou mais fatias importam (AC 32, door 3)
Proof: `npm --prefix web run test -- -t "estrutura em fatias"`

**C36** - O `crapper` rodado em `web/` com a cobertura do Vitest termina com código 0 no limite 9.99: nenhuma função de `web/src` com CRAP 10 ou mais (AC 33)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`

**C37** - O `dryer` rodado em `web/src` não acha nenhum candidato com nota 0.8 ou mais (AC 34)
Proof: `cd web && dryer -s src --threshold 0.8 | grep -q "No duplicate candidates found"`

**C38** - O `mutator` sobre as 6 fatias de `web/src` termina com código 0: todo mutante executado foi morto (AC 35)
Proof: `cd web && mutator --mutate-all src/acesso src/assistente src/chamados src/conhecimento src/indicadores src/administracao`

**C39** - `ChamadoDetalhe` mostra o spinner "Carregando" enquanto carrega, o `Alert` com o detail quando a API falha, e "Nenhuma resposta ainda." quando o chamado não tem mensagens (AC 36)
Proof: `npm --prefix web run test -- -t "detalhe do chamado carregando, erro e sem respostas"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| suítes que prendem o comportamento (3) | API C1 · web C1 · e2e C1 | - |
| doors (3) | door 1 C3 · door 2 C5, C6 · door 3 C29, C30, C31, C35 | - |
| prazos (5) | abandono C11 · confirmação C8, C11 · rejeição C9, C11 · lembrete C10, C11 · resolver aguardando C11 | - |
| limite do prazo de confirmação (2 bordas) | 9 d 23 h C8 · 10 d C8 | - |
| limite do prazo de rejeição (2 bordas) | 10 d C9 · 10 d 1 min C9 | - |
| limite do lembrete (2 bordas) | 3 d 23 h C10 · 4 d C10 | - |
| textos com número de dias (3) | evento de fechamento C8 · e-mail de resolução C8 · detail do 409 C9 · (lembrete C10) | - |
| tipos de evento (9) | `CRIACAO` C12, C20 · `TRANSICAO` C12, C20 · `ATRIBUICAO` C12, C20 · `LEMBRETE` C12, C20 · `NOTA` C12, C20 · `RESPOSTA` C12, C20 · `ANEXO` C12, C20 · `ENCAMINHAMENTO` C12, C20 · `RECLASSIFICACAO` C12, C20 | - |
| tipos de mensagem (2) | `PUBLICA` C12, C20 · `NOTA` C12, C20 | - |
| motivos de fechamento (4) | `CONFIRMADO` C12, C20 · `CANCELADO` C12, C20 · `DUPLICADO` C12, C20 · `FECHADO_AUTOMATICAMENTE` C12, C20 | - |
| leituras de configuração únicas (3) | `Llm:BaseUrl` C15 · `Llm:ChaveApi` C15 · `App:UrlBase` C15 | - |
| startup config: cliente `"llm"` (2 assemblies) | `Program.cs` C15 · `OneFactory` (troca só o handler) C16 | - |
| URLs do provedor (2) | chat C16 · embeddings C16 | - |
| recusas do upload (4) | 413 anexo C17 · 415 anexo C17 · 413 documento C17 · 415 documento C17 | - |
| limites de senha (4 bordas) | 7 C18 · 8 C18 · 128 C18 · 129 C18 | - |
| pares ação/papel da tabela de permissões (11), cada um sobre os 5 estados e o par oposto ausente | `responder/ALUNO` C21 · `responder/ATENDENTE` C21 · `nota/ATENDENTE` C21 · `assumir/ATENDENTE` C21 · `resolver/ATENDENTE` C21 · `confirmar/ALUNO` C21 · `rejeitar/ALUNO` C21 · `cancelar/ALUNO` C21 · `encaminhar/ATENDENTE` C21 · `reclassificar/ATENDENTE` C21 · `duplicado/ATENDENTE` C21 | - |
| indicadores (14) | `alunosAtivos` C23 · `conversas` C23 · `taxaAutoatendimento` C23 · `taxaEscalonamento` C23 · `taxaAbandono` C23 · `taxaPerguntasSemArtigo` C23 · `chamadosAbertos` C23 · `chamadosResolvidos` C23 · `tempoPrimeiraRespostaHoras` C23 · `tempoResolucaoHoras` C23 · `roteamentoCorreto` C23 · `taxaReabertura` C23 · `principaisCategorias` C23 · `indicadorPrincipal` C23 (e `tempoResolucaoHoras` também C22) | - |
| motivos da carga (16) | setor sem nome C24 · setor repetido C24 · categoria sem nome C24 · categoria repetida C24 · curso sem nome C24 · curso repetido C24 · coordenação inexistente C24 · regra sem categoria C24 · categoria já com regra C24 · regra sem setor nem coordenação, ou com os dois C24 · setor da regra inexistente C24 · artigo sem título C24 · artigo sem pergunta C24 · artigo sem resposta C24 · link sem http(s) C24 · categoria do artigo inexistente C24 | - |
| motivos do CSV (10) | campos diferentes de 7 C25 · CPF inválido C25 · nome vazio ou longo C25 · e-mail inválido C25 · e-mail de outro CPF C25 · matrícula vazia ou longa C25 · matrícula de outro CPF C25 · curso inexistente C25 · semestre fora de 1 a 12 C25 · situação C25 | - |
| regra de pergunta (5 casos) | 200 aceita C26 · 201 recusa C26 · sem "?" recusa C26 · 2ª aceita C26 · 3ª recusa C26 | - |
| classes de regra sem banco (5) | `PermissoesChamadoTests` C27 · `IndicadoresCalculoTests` C27 · `CargaValidacaoTests` C27 · `CsvMatriculasTests` C27 · `PerguntaTests` C27 | - |
| pastas do `api/` (8) | `Acesso` C29 · `Assistente` C29 · `Chamados` C29 · `Conhecimento` C29 · `Indicadores` C29 · `Administracao` C29 · `Instituicoes` C29 · `Dados` C29 | - |
| fatias do `web/` (6) | `acesso` C35 · `assistente` C35 · `chamados` C35 · `conhecimento` C35 · `indicadores` C35 · `administracao` C35 | - |
| gravações de usuário (2) | criar C33 · editar C33 | - |
| estados de `ChamadoDetalhe` (4) | carregando C39 · erro C39 · sem respostas C39 · sem permissão: existente, 404/403 da API (`VisibilidadeTests`), C1 | - |
| ferramentas do `ub-mode` no `web/` (3) | `crapper` C36 · `dryer` C37 · `mutator` C38 | - |

- Claims naming a status code or response shape: C9 (409), C17 (413, 415), C28 (detalhe), C39 (Alert) - each has a proof that crosses the HTTP or the screen boundary
- C1 is the only check that runs a whole suite; that is its claim (nada que existia quebrou), and C2 is what stops the suite from going green by losing asserts
- No other check claims more than the cases its proof asserts

## Test policy

O repositório não tem guia de testes; valem as linhas do `mvp-one` e do `rag`, mais uma para o que
esta feature cria: regras puras que hoje só são provadas por HTTP.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide e é alcançado por HTTP: permissões, indicadores, carga, CSV, regra de pergunta | a prova de fronteira que já existe (C1) **e** uma na própria camada, sem banco | um caso afirmado por linha da tabela de decisão na própria camada (C21, C23, C24, C25, C26) |
| Decide e não depende de HTTP: prazos lidos da configuração | uma na fronteira do agendador e da rota, com o relógio falso | as duas bordas de cada prazo configurado (C8, C9, C10) |
| Estrutura do código: pastas, namespaces, referências, literais, configuração | uma regra de texto no `ArquiteturaTests`, como a do `IgnoreQueryFilters` | um caso por membro do conjunto (C12 a C15, C19, C29 a C32) |
| Instrumentação, repasses, mudança de pasta | nenhuma própria | coberta pela suíte existente (C1, C2) |

Evidence:

- `ChamadoRotas.cs:25-38`: tabela de 11 pares ação × papel sobre 5 estados, mais o filtro de `assumir` -> decide, alcançado por HTTP, 111 casos
- `IndicadorRotas.cs:18-132`: 14 métricas, ~30 pontos de decisão (estimativa) -> decide, alcançado por HTTP
- `InstituicaoComando.cs:78-174`: 16 motivos de recusa -> decide, alcançado pelo comando
- `AdminRotas.cs:261-329`: 10 motivos de recusa -> decide, alcançado por HTTP
- `Assistente.cs:139-141`: 3 condições da pergunta -> decide, alcançado por HTTP
- análogo no repositório: `CpfTests` e `ConferenciaTests`, regras puras já provadas na própria camada sem `OneFactory`

Cost: 5 classes de teste novas de regra pura (~150 casos, a maioria tabelada) e 1 classe `PrazosTests`.
Sem essas linhas, as 5 tabelas de decisão continuam provadas só por caminhos HTTP que passam por
algumas células.

## Swept

- validation: C24, C25, C17, C18 (as recusas existentes, cada motivo com caso na própria camada)
- failure modes: C2 (uma asserção perdida faz a prova falhar), C5 (complexidade acima do limite falha o build), C16 (falhas do provedor continuam virando "não encontrei")
- idempotency: n/a - nenhuma gravação nova; as gravações condicionais do agendador (`ExecuteUpdate ... WHERE`) não mudam e continuam provadas por `AgendadorTests` (C11)
- authorization: C21 (tabela de permissões célula a célula), C39 (sem permissão continua 404/403)
- concurrency: n/a - nenhum estado compartilhado novo; os prazos são lidos da configuração, imutáveis depois do startup, e a gravação concorrente do chamado (409) não muda e segue em C1
- data lifecycle: n/a - nenhuma tabela, coluna ou valor gravado muda; C12 prende os 15 valores gravados de hoje
- dependency failure: C16 (chat e embeddings pela mesma configuração, falhas viram "não encontrei")
- state transitions: C21 (ações válidas por estado), C8, C9, C10 (transições automáticas e rejeição seguem os prazos)
- observability: n/a - nenhum log muda; os logs do provedor e do agendador continuam provados pelos testes existentes (C1)

## Handoff

Tamanho estimado pelo código que cada slice lê e reescreve (bytes / 4), mais o contexto fixo:
este `plan.md` (~22 KB) e este `checks.md` (~25 KB), cerca de 12k, e a infraestrutura de testes
(`OneFactory`, `ArquiteturaTests`, `test/util.tsx`), cerca de 10k.

- S1 = 5k; S2 entra em quase todo o `api/` (~130 KB) a 43k; S3 entra nas regras (~90 KB) a 73k;
  S4 move as pastas e divide `ChamadoRotas`/`AdminRotas` a 103k; S5 entra no `web/` (~130 KB,
  mais testes novos e as rodadas do `mutator`) a 158k. Com o contexto fixo: 158k + 22k = 180k,
  acima do budget de 150k
- Corte proposto onde a superfície muda: lote 1 = S1 a S4 (`api/`, 103k + 22k = 125k); lote 2 =
  S5 (`web/`, 55k + 22k = 77k), só depois do lote 1 verde
- Mechanism: handoff em 2 lotes sequenciais (lote 1 = S1 a S4, lote 2 = S5, só com o lote 1
  verde) - escolha do usuário em 02/11/2026
- Feature base (`<base>`): `c267db8` (docs: plano e checks congelados), no `main`, depois de a verificação do `rag` aprovar
