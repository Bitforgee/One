# Refatoração do back: checks

Profile: standard
Plan: `.specs/features/refatoracao-back-limpa/plan.md`
Base: `97524d1` (`One.Api` e `One.Api.Tests` sem mudança desde a base na hora de escrever estes checks)

104 checks em 9 fatias · 9 portas de Landing · 0 perguntas abertas · 0 bloqueiam

## Como ler as provas

- `dotnet test One.Api.Tests --filter` com o nome qualificado do teste roda o teste nomeado. Filtro que não acha teste **sai 0** (conferido nesta sessão), por isso o check C104 exige que todo nome deste arquivo exista no fim.
- `provas.ps1 <modo>` é o ajudante desta feature (`.specs/features/refatoracao-back-limpa/provas.ps1`): sai 0 quando a afirmação vale e 1 quando não vale. Modos: `contagem`, `sem-skip`, `migracoes`, `modelo`, `retratos`, `grep`, `linhas`, `existe`, `definido-uma-vez`, `todos-com`, `lista`, `lista-contem`, `lista-sem`, `listas-encolhem`, `ratchet-falha`, `pares`, `pares-ausentes`, `pares-presentes`, `pares-novos`, `asserts-intactos`, `logs-agendador`, `nomes`. O texto depois de `#` só nomeia o modo.
- `<S1>`, `<S2>`, `<S6>` são o sha do `Boundary` da fatia, anotado em `## Handoff` quando a fatia fecha.
- Testes que dependem de infraestrutura exigem `docker compose up -d postgres mailpit minio` (5432, 9000 e 1025). Os modos do `provas.ps1` que só leem arquivos e git não exigem.
- Ratchet: cada lista `Excecoes_<Regra>` é igual aos ofensores nos dois sentidos (o teste da regra) e só perde linhas depois da S1 (`listas-encolhem`). Mudar o arquivo, o nome ou a lista de dados de um teste de arquitetura já existente é permitido pelo plano (Assumptions, decisão 2) só nos testes dele, um por commit, com a regra e o valor esperado intactos; o Verificador confere cada diff.

## Checks

Numeração corre pela feature inteira, na ordem de construção (S1 a S7, S9, S8).

### S1 - Rede de segurança e régua (AC 1-10) · 14 arquivos · 183,7 KB · ~47k

**C1** - Em cada commit de fatia, a suíte atual passa inteira: 0 testes com falha em `dotnet test One.Api.Tests`, o número de casos de teste listados é pelo menos 810 (o da base `97524d1`) e nenhuma linha adicionada em `One.Api.Tests` contém `Skip`, `[Ignore` ou `Explicit` (AC 1)
Proof: `dotnet test One.Api.Tests` # sai 0
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 contagem -Min 810 # contagem`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 sem-skip # sem-skip`

**C2** - Os cinco retratos `rotas.txt` (93 linhas), `erros.txt` (9), `sucessos.txt` (56), `gravacoes.txt` (24) e `importacao.txt` (1) ficam byte a byte iguais aos da base e as 6 comparações de `RetratoTests` passam (AC 2); o modo `retratos` compara só esses 5 arquivos contra a base, e os goldens novos `provedor.txt`, `servicos.txt` e `instituicao-publica.txt` são provados pelos seus próprios checks (C5-C7, C20 e C21)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 retratos # retratos`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~RetratoTests"`

**C3** - Nenhum arquivo novo em `One.Api/Dados/Migracoes/`, `OneDbModelSnapshot.cs` idêntico ao da base e `dotnet ef migrations has-pending-model-changes` sai 0 (AC 3)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 migracoes # migracoes`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 modelo # modelo`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Modelo_sem_mudanca_pendente"`

**C4** - `dotnet build One.slnx` sai 0 com 0 erros; CA1502 (complexidade ciclomática acima de 10) está em `WarningsAsErrors`, então uma violação derruba o build (AC 4)
Proof: `dotnet build One.slnx` # sai 0
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Barreira_de_complexidade_configurada"`

**C5** - O texto JSON enviado ao provedor numa pergunta sem anexo é igual ao golden gravado em `One.Api.Tests/Retratos/provedor.txt` no commit da S1 (golden gerado com o código da base, AC 5)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CorpoParaProvedorTests.Sem_anexo_igual_ao_golden"`

**C6** - O texto JSON enviado ao provedor numa pergunta com anexo é igual ao golden de `Retratos/provedor.txt` (AC 5)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CorpoParaProvedorTests.Com_anexo_igual_ao_golden"`

**C7** - O texto JSON enviado ao provedor ao gerar um embedding é igual ao golden de `Retratos/provedor.txt` (AC 5)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CorpoParaProvedorTests.Embedding_igual_ao_golden"`

**C8** - Conversa que recebe mensagem entre `Agendador.Ler()` e `Agendador.Processar(lidos)` continua com `Desfecho` nulo e nenhum log de abandono (AC 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Conversa_mudada_entre_Ler_e_Processar_fica_intacta"`

**C9** - Chamado resolvido que a equipe reabre entre `Ler()` e `Processar(lidos)` continua no estado novo, com 0 `EventoChamado`, 0 `MensagemChamado` e 0 aviso gravados (AC 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Resolvido_mudado_entre_Ler_e_Processar_fica_intacto"`

**C10** - Chamado aguardando que o aluno responde entre `Ler()` e `Processar(lidos)` fica com `LembreteEm` nulo, 0 `EventoChamado` de lembrete e 0 aviso (AC 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Lembrete_mudado_entre_Ler_e_Processar_fica_intacto"`

**C11** - Chamado em `AGUARDANDO_ALUNO` cujo `AguardandoDesde` é renovado entre `Ler()` e `Processar(lidos)` (nova resposta da equipe com `aguardaAluno=true`) continua `AGUARDANDO_ALUNO`; e chamado em que o aluno responde (pela rota) entre as duas chamadas fica `EM_ATENDIMENTO`; nos dois casos o `Processar` acrescenta 0 `MensagemChamado` de `TextoSemResposta`, 0 `EventoChamado` e 0 aviso (AC 6). O que a prova garante: o comportamento observável acima, e a mutação que remove juntos o prazo (`AguardandoDesde <= limite`) e o estado (`Estado == AguardandoAluno`) de `Agendador.ResolverSemResposta` derruba os dois testes (2 de 2, já provado). O que ela não promete: remover só o filtro de estado (`c.Estado == AguardandoAluno`, `Agendador.cs` ~L208) é mutante equivalente e nenhum teste o mata, porque `Chamado.Mudar` zera `AguardandoDesde` ao sair de `AGUARDANDO_ALUNO` e `AguardandoDesde <= limite` já recusa a linha; não existe estado alcançável pela rota que distinga as duas condições, então o filtro de estado é defesa redundante (E4)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.SemResposta_mudado_entre_Ler_e_Processar_fica_intacto|FullyQualifiedName~AgendadorConcorrenciaTests.SemResposta_com_resposta_do_aluno_entre_Ler_e_Processar_fica_em_atendimento"`

**C12** - Dois `Agendador.Executar()` simultâneos sobre a mesma conversa parada há 30 minutos deixam `Desfecho` = `ABANDONADA` e exatamente 1 log "Conversa {id} abandonada" (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Duas_execucoes_conversa_um_abandono"`

**C13** - Dois `Executar()` simultâneos sobre o mesmo chamado resolvido há 7 dias deixam exatamente 1 `EventoChamado` `TRANSICAO` `RESOLVIDO` para `FECHADO` (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Duas_execucoes_resolvido_um_fechamento"`

**C14** - Dois `Executar()` simultâneos sobre o mesmo chamado aguardando há 4 dias deixam exatamente 1 `EventoChamado` `LEMBRETE` e 1 e-mail de aviso em `EmailsSaida` (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Duas_execucoes_lembrete_um_lembrete"`

**C15** - Dois `Executar()` simultâneos sobre o mesmo chamado aguardando há 10 dias deixam exatamente 1 `MensagemChamado` com `TextoSemResposta`, 1 `EventoChamado` `TRANSICAO` e `Estado` = `RESOLVIDO` (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Duas_execucoes_sem_resposta_uma_resolucao"`

**C16** - Dois `Executar()` simultâneos sobre o mesmo chamado com prazo de etapa vencido deixam `EtapaOrdem` = 2 e exatamente 1 evento `SUBIDA` (teste que já existe e passa na base)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoPrazoTests.Duas_subidas_simultaneas_uma_so"`

**C17** - Trecho que ganha `Embedding` entre `Ler()` e `Processar(lidos)` não é sobrescrito: o vetor gravado continua o da escrita concorrente e `Tentativas` continua 0 (base do AC 46)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Trecho_indexado_entre_Ler_e_Processar_fica_intacto"`

**C18** - `Agendador.Ler()` devolve os itens com `Tipo` na ordem `conversa`, `chamado`, `aguardando`, `lembrete`, `subir`, `email`, `trecho`, `push` quando há um de cada (8 tipos, base do AC 42)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorOrdemTests.Ler_devolve_os_tipos_na_ordem_da_base"`

**C19** - `Agendador.Processar` indexa os trechos antes de despachar os demais itens: o log "Agendador indexou {n} trechos" sai antes do log "Conversa {id} abandonada" no mesmo ciclo (ordem de hoje, base do AC 42)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorOrdemTests.Trechos_sao_indexados_antes_dos_demais_itens"`

**C20** - O tempo de vida (singleton, scoped ou transient) de cada serviço do namespace `One.Api` e a ordem dos `IHostedService` registrados são iguais ao golden `Retratos/servicos.txt` gerado com a base (base do AC 50) na S1; a partir da S6/S7 (E5) o conjunto esperado é golden - Removidas + Adicionadas, com igualdade exata, onde Removidas é Singleton One.Api.Email -> One.Api.Email (a troca Email por EnviadorSmtp, AC 52) e Adicionadas é a lista fechada abaixo (9 tarefas do AC 41 e C71, todas Singleton porque Agendador é Singleton, recebe IEnumerable<ITarefaAgendada> e só Singleton cabe nele; EnviadorSmtp fica Singleton como Email na base). Fontes: plano AC 41, door 1 e AC 52; Agendador.cs (cada tarefa recebe o OneDb do escopo que o Agendador abre por item; os serviços que usam são Singleton: Email, IEnviadorPush, Embeddings, Prazos). Nomes das classes: plano fixa só FecharResolvidos e ApagarLancamentos (door 1); os outros 7 vêm do diagnóstico e as fatias donas não estão no plano: decisão do builder da S6, verificar. Até a S6/S7 as duas listas do teste ficam vazias. Lista permitida:
- `Singleton One.Api.ITarefaAgendada -> One.Api.Acesso.ApagarLancamentos`
- `Singleton One.Api.ITarefaAgendada -> One.Api.Assistente.AbandonarConversas`
- `Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.EnviarEmails`
- `Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.EnviarPushes`
- `Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.FecharResolvidos`
- `Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.LembrarAguardando`
- `Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.ResolverSemResposta`
- `Singleton One.Api.ITarefaAgendada -> One.Api.Chamados.SubirPorPrazo`
- `Singleton One.Api.ITarefaAgendada -> One.Api.Assistente.IndexarTrechos` (E10: era `One.Api.Conhecimento.IndexarTrechos`; a tarefa injeta `Embeddings`, que mora em `Assistente`, e `Conhecimento` usar `Assistente` criaria o inverso do par `Assistente>Conhecimento`, proibido pelos AC 27 e AC 68; plano B7)
- `Singleton One.Api.EnviadorSmtp -> One.Api.EnviadorSmtp`
Ao preenchê-las o teste segue exato: o esperado é montado como golden - Removidas + Adicionadas, Assert.Empty(Removidas.Except(golden)) e Assert.Empty(Adicionadas.Intersect(golden)) rejeitam item inexistente ou repetido, e Dourado.Igual compara o texto inteiro, então um serviço a mais, a menos ou com outro tempo de vida falha (provado no container, ver notas-build.md)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ServicosTests.Tempos_de_vida_iguais_ao_golden"`

**C21** - `GET /api/instituicoes/{slug}` de uma instituição ativa devolve 200 com o JSON igual ao golden `Retratos/instituicao-publica.txt` (base do AC 64, rota que nenhum retrato cobre)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~InstituicaoPublicaTests.Corpo_igual_ao_golden"`

**C22** - As 11 regras de ratchet existem como `[Fact]` em `ArquiteturaTests`, cada uma com `static readonly string[] Excecoes_<NomeDoTeste>` e `Assert.Equal(Excecoes.Order(), Ofensores().Order())`, e passam: `Dados_sem_EfCore`, `Relogio_so_pelo_TimeProvider`, `Entidade_sem_setter_publico`, `Raiz_sem_fatias`, `Handler_sem_new_de_entidade`, `Arquivo_ate_150_linhas`, `Dados_ate_5_parametros`, `Mensagem_sem_entidade`, `Service_locator_so_na_composicao`, `Caso_de_uso_sem_chamada_estatica_de_outro`, `Sem_balde_horizontal` (AC 8)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dados_sem_EfCore|FullyQualifiedName~ArquiteturaTests.Relogio_so_pelo_TimeProvider|FullyQualifiedName~ArquiteturaTests.Entidade_sem_setter_publico|FullyQualifiedName~ArquiteturaTests.Raiz_sem_fatias|FullyQualifiedName~ArquiteturaTests.Handler_sem_new_de_entidade|FullyQualifiedName~ArquiteturaTests.Arquivo_ate_150_linhas|FullyQualifiedName~ArquiteturaTests.Dados_ate_5_parametros|FullyQualifiedName~ArquiteturaTests.Mensagem_sem_entidade|FullyQualifiedName~ArquiteturaTests.Service_locator_so_na_composicao|FullyQualifiedName~ArquiteturaTests.Caso_de_uso_sem_chamada_estatica_de_outro|FullyQualifiedName~ArquiteturaTests.Sem_balde_horizontal"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static readonly string\[\]\s+Excecoes_(Dados_sem_EfCore|Relogio_so_pelo_TimeProvider|Entidade_sem_setter_publico|Raiz_sem_fatias|Handler_sem_new_de_entidade|Arquivo_ate_150_linhas|Dados_ate_5_parametros|Mensagem_sem_entidade|Service_locator_so_na_composicao|Caso_de_uso_sem_chamada_estatica_de_outro|Sem_balde_horizontal)\b' -Caminho One.Api.Tests/ArquiteturaTests.cs -Esperado 11 # grep`

**C23** - No commit da S1 as listas de exceção têm o tamanho do ofensor medido na base: `Arquivo_ate_150_linhas` 6 (`Agendador.cs`, `Program.cs`, `Assistente/Assistente.cs`, `Dados/OneDb.cs`, `Dados/Chamados/Chamado.cs`, `Instituicoes/InstituicaoComando.cs`), `Sem_balde_horizontal` 19 (3 pastas `Shared` e 16 classes `*Rotas`), `Entidade_sem_setter_publico` 17 (16 entidades e `OneDb`, medido por reflexão), `Caso_de_uso_sem_chamada_estatica_de_outro` 5, `Dados_sem_EfCore` 2 (`EquipeDeSetor.cs`, `ResolverFluxo.cs`), `Relogio_so_pelo_TimeProvider` 1 (`Armazenamento.cs`) (AC 8)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Arquivo_ate_150_linhas -Rev <S1> -Esperado 6 # lista`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Sem_balde_horizontal -Rev <S1> -Esperado 19 # lista`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Entidade_sem_setter_publico -Rev <S1> -Esperado 17 # lista`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Caso_de_uso_sem_chamada_estatica_de_outro -Rev <S1> -Esperado 5 # lista`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Dados_sem_EfCore -Rev <S1> -Esperado 2 # lista`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Relogio_so_pelo_TimeProvider -Rev <S1> -Esperado 1 # lista`

**C24** - Para cada uma das 11 listas, acrescentar a linha `"__falso__"` ou tirar a primeira linha, sem mexer no código, faz o teste da regra falhar (exit diferente de 0 com "Com falha"): a regra pega ofensor novo e ofensor que sumiu (AC 9)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Arquivo_ate_150_linhas # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Sem_balde_horizontal # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Entidade_sem_setter_publico # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Caso_de_uso_sem_chamada_estatica_de_outro # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Dados_sem_EfCore # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Relogio_so_pelo_TimeProvider # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Raiz_sem_fatias # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Handler_sem_new_de_entidade # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Dados_ate_5_parametros # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Mensagem_sem_entidade # ratchet-falha`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 ratchet-falha -Regra Service_locator_so_na_composicao # ratchet-falha`

**C25** - Depois do último commit da S1, `git diff 97524d1 <S1> -- One.Api` está vazio (exit 0) e nenhum commit posterior acrescenta linha a nenhuma das 11 listas `Excecoes_*` (AC 10)
Proof: `git diff --exit-code 97524d1 <S1> -- One.Api` # <S1> = sha do Boundary da S1 em ## Handoff
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 listas-encolhem -Base <S1> # listas-encolhem`

### S2 - Domínio rico I: e-mail, usuário, conversa, token, instituição e Cpf (AC 11-17) · 52 arquivos · 420,5 KB · ~107,6k

**C26** - `EmailSaida.RegistrarFalha(agora)` soma 1 a `Tentativas` e põe `ProximaTentativa` = `agora` + 2 elevado a `Tentativas` minutos: de 0 para 1 dá +2 min, de 1 para 2 dá +4 min, de 4 para 5 dá +32 min, testado sem banco (AC 11)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~EmailSaidaDominioTests.Registrar_falha_soma_uma_tentativa_e_agenda_2_elevado_a_tentativas_minutos"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~EmailFalhaTests.Retry_2_a_n_e_desiste_em_5"`

**C27** - Os 7 tipos `Usuario`, `Conversa`, `MensagemConversa`, `TokenAcesso`, `Instituicao`, `ImagemInstituicao` e `EmailSaida` não têm setter público (exceto `InstituicaoId`): `Entidade_sem_setter_publico` passa e a lista cai de 17 para 10 nomes e `UsuarioPapel` continua nela; a prova `lista-sem` compara por igualdade exata do nome (`UsuarioPapel` não casa com `Usuario`) (AC 12)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Entidade_sem_setter_publico"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista-sem -Regra Entidade_sem_setter_publico -Nomes Usuario,Conversa,MensagemConversa,TokenAcesso,Instituicao,ImagemInstituicao,EmailSaida # lista-sem`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Entidade_sem_setter_publico -Esperado 10 # lista`

**C28** - Nenhum `new Usuario`, `new Conversa`, `new TokenAcesso`, `new Instituicao` nem `new EmailSaida` aparece em `One.Api/` fora de `One.Api/Dados/` (a base tem 10 ocorrências em 8 arquivos: Tokens.cs, Acesso/Login.cs, Administracao/CriarUsuario.cs, Administracao/ImportarMatriculas.cs, Assistente/AtendimentoDireto.cs, Assistente/NovaConversa.cs, Chamados/Avisos.cs, Instituicoes/Criacao.cs) e `Handler_sem_new_de_entidade` passa (AC 13)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'new (Usuario|Conversa|TokenAcesso|Instituicao|EmailSaida)\b' -Caminho One.Api -Excluir '\\Dados\\' -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Handler_sem_new_de_entidade"`

**C29** - `DefinirSenha` com token válido grava o hash novo, põe `DeveTrocarSenha` = false e `token.UsadoEm` = agora, decidido por método de `Usuario`/`TokenAcesso` testado sem banco; a rota devolve 204 e, com token usado ou vencido, 400 "Link inválido ou vencido." (AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~UsuarioDominioTests.Definir_senha_grava_hash_zera_a_troca_e_marca_o_token_usado"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~DefinirSenhaTests"`

**C30** - `TrocarSenha` grava o hash novo e põe `DeveTrocarSenha` = false por método de `Usuario` testado sem banco; a rota devolve 204 e 400 "A senha atual está incorreta." com a senha atual errada (AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~UsuarioDominioTests.Trocar_senha_grava_hash_e_zera_a_troca"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~SenhaTests|FullyQualifiedName~PrimeiroAcessoTests"`

**C31** - `DesativarUsuario` põe `Ativo` = false por método de `Usuario` testado sem banco; a rota devolve 200 com o `UsuarioResposta` da base e uma conta desativada recebe 401 na requisição seguinte (AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~UsuarioDominioTests.Desativar_marca_inativo"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~SessaoTests.Conta_desativada_401_na_proxima_requisicao|FullyQualifiedName~UsuarioAdminTests"`

**C32** - `Conversa.Encerrar(agora)` grava `Desfecho` = `ENCERRADA_PELO_ALUNO` e `DesfechoEm` = agora, e devolve `Recusa` quando `Desfecho` já existe; a rota devolve 200 e, com desfecho, 409, sem banco no teste de domínio (AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ConversaDominioTests.Encerrar_grava_ENCERRADA_e_a_data|FullyQualifiedName~ConversaDominioTests.Encerrar_com_desfecho_devolve_Recusa"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ConversaTests.Encerrar_200|FullyQualifiedName~ConversaTests.Conversa_com_desfecho_409"`

**C33** - `Conversa.Avaliar(resolveu, agora)` com `true` grava `RESOLVIDA_AUTOATENDIMENTO` e a data, com `false` não muda nada, e com `Desfecho` existente devolve `Recusa`; as rotas continuam em 200 e 409, sem banco no teste de domínio (AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ConversaDominioTests.Avaliar_resolveu_grava_RESOLVIDA|FullyQualifiedName~ConversaDominioTests.Avaliar_nao_resolveu_nao_muda|FullyQualifiedName~ConversaDominioTests.Avaliar_com_desfecho_devolve_Recusa"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ConversaTests.Sim_resolve_sem_chamado|FullyQualifiedName~ConversaTests.Nao_mantem_aberta|FullyQualifiedName~ConversaTests.Avaliacao_sem_resolveu_400"`

**C34** - `Dados/Entidades.cs` fica só com `interface IDaInstituicao` (0 `class`) e cada uma das 9 classes de valores gravados (`Papeis`, `EstadosArtigo`, `Desfechos`, `EstadosDocumento`, `EstadosChamado`, `TiposEvento`, `DestinosEtapa`, `TiposMensagem`, `MotivosFechamento`) é definida em exatamente 1 arquivo, que não é `Entidades.cs` (AC 15)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao '\bclass\b' -Caminho One.Api/Dados/Entidades.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'interface\s+IDaInstituicao' -Caminho One.Api/Dados/Entidades.cs -Esperado 1 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 definido-uma-vez -Nomes Papeis,EstadosArtigo,Desfechos,EstadosDocumento,EstadosChamado,TiposEvento,DestinosEtapa,TiposMensagem,MotivosFechamento -Excluir 'Entidades\.cs' # definido-uma-vez`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Literais_gravados_so_nas_constantes"`

**C35** - `Cpf.Tentar("111.444.777-35")` devolve um `Cpf` com `Valor` = `"11144477735"` e `Mascarado` = `"***.444.777-**"`; `Tentar("11144477735")` devolve o mesmo `Valor` (AC 16)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CpfValorTests.Tentar_cpf_valido_normaliza_e_mascara"`

**C36** - `Cpf.Tentar` devolve `null` nos 5 casos de entrada inválida: `null`, 10 dígitos, letra no meio, primeiro dígito verificador errado (`"111.444.777-45"`) e segundo dígito verificador errado (`"111.444.777-36"`) (AC 16)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CpfValorTests.Tentar_devolve_null_nos_cinco_casos_invalidos"`

**C37** - `Usuario.Cpf` é gravado na coluna `char(11)` existente com `"11144477735"` (sem máscara), o índice único `(instituicao_id, cpf)` segue valendo (409 em CPF repetido) e não nasce migration (AC 17)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CpfPersistenciaTests.Cpf_grava_char_11_sem_mascara"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~UsuarioAdminTests.Cpf_ou_email_repetido_409|FullyQualifiedName~CpfTests.Respostas_fora_do_admin_mascaram_cpf|FullyQualifiedName~LoginTests"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 migracoes # migracoes`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'HasConversion\(c => c\.Valor, v => Cpf\.Ler\(v\)\)' -Caminho One.Api/Dados -Esperado 1 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Modelo_sem_mudanca_pendente"`

**C38** - Porta 6: `Dados/Invalido.cs` declara `public sealed record Invalido(string Motivo)` (1 declaração) e o domínio não referencia ASP.NET Core, Mediator nem handlers (regra existente)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'public sealed record Invalido\(string Motivo\)' -Caminho One.Api/Dados/Invalido.cs -Esperado 1 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dominio_sem_AspNetCore_Mediator_nem_fatias"`

### S3 - Dados sem EF: o roteamento de fluxo (AC 18-21) · 16 arquivos · 175,7 KB · ~45k

**C39** - `Dados/Fluxos/RoteamentoDeFluxo.cs` define `Escolher`, `Etapa`, `Situacao` e `Proximo` e tem 0 ocorrências de `OneDb` e de `Microsoft.EntityFrameworkCore`; os testes dessas regras não usam banco (AC 18)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'OneDb|Microsoft\.EntityFrameworkCore' -Caminho One.Api/Dados/Fluxos/RoteamentoDeFluxo.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static .* (Escolher|Etapa|Situacao|Proximo)\(' -Caminho One.Api/Dados/Fluxos/RoteamentoDeFluxo.cs -Esperado 4 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Testes_de_regra_sem_banco"`

**C40** - `Escolher` devolve o fluxo vigente mais específico nas 8 combinações de (semestre, curso, todos) publicados: `semestre` quando há de semestre, senão `curso`, senão `todos`, senão `nenhum`; fluxo de outro curso ou semestre não vale (AC 18)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoDominioTests.Escolhe_o_fluxo_mais_especifico|FullyQualifiedName~FluxoDominioTests.Fluxo_de_outro_semestre_ou_curso_nao_vale"`

**C41** - `Etapa` resolve os 3 destinos em 8 casos: `SETOR` ativo dá o setor, `SETOR` inativo ou inexistente dá "Setor inativo", `COORDENACAO_CURSO` com id dá o id e sem id dá "Curso sem coordenação", `LIDERANCA_SEMESTRE` com id dá o id e sem id dá "Sem liderança disponível" (AC 18)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoDominioTests.Resolve_cada_tipo_de_destino"`

**C42** - `Situacao` devolve "Atendimento direto não passa pela liderança" quando o destino pede ciência, resolve e não há conversa, e `Proximo` pula a etapa que não resolve e devolve `null` quando nenhuma resolve (AC 18)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoDominioTests.Lideranca_sem_conversa_nao_resolve_e_o_proximo_passo_a_pula|FullyQualifiedName~FluxoDominioTests.Proximo_pula_a_etapa_que_nao_resolve_e_acaba_sem_resolver|FullyQualifiedName~FluxoDominioTests.Visao_e_ciencia_vem_do_tipo"`

**C43** - `CarregarContexto`, `Candidatos`, `Rotear`, `Seguinte` e `SoLideranca` não existem mais em `One.Api/Dados/` (0 ocorrências), `Dados/EquipeDeSetor.cs` e `Dados/Fluxos/ResolverFluxo.cs` deixaram de existir e `Dados_sem_EfCore` fica com lista vazia (AC 19)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao '\b(CarregarContexto|Candidatos|Rotear|Seguinte|SoLideranca)\(' -Caminho One.Api/Dados -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 existe -Caminho One.Api/Dados/EquipeDeSetor.cs,One.Api/Dados/Fluxos/ResolverFluxo.cs -Esperado 0 # existe`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Dados_sem_EfCore -Esperado 0 # lista`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dados_sem_EfCore|FullyQualifiedName~FluxoRoteamentoTests|FullyQualifiedName~FluxoSimulacaoTests|FullyQualifiedName~LiderancaDestinoTests"`

**C44** - Os 4 motivos aparecem como constantes literais, cada um em exatamente 1 declaração de `One.Api`: "Curso sem coordenação", "Sem liderança disponível", "Setor inativo" e "Atendimento direto não passa pela liderança"; `Setor_so_pelo_ResolverFluxo` passa com os nomes novos (AC 20)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'const string \w+ = "(Curso sem coordenação|Sem liderança disponível|Setor inativo|Atendimento direto não passa pela liderança)"' -Caminho One.Api -Esperado 4 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Setor_so_pelo_ResolverFluxo"`

**C45** - `ReferenciasEntreFatias` ganha no máximo o par `Administracao>Chamados` em relação ao fim da S2 (de 16 para 17 pares) e `Referencias_entre_fatias` passa (AC 21)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 pares-novos -Base <S2> -Nomes Administracao>Chamados # pares-novos`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 pares -Max 17 # pares`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Referencias_entre_fatias"`

### S4 - Assistente, Chamados e Indicadores sem ciclo (AC 22-31) · 30 arquivos · 296,7 KB · ~76k

**C46** - `Assistente/MontarPrompt.cs`, `ChamarProvedor.cs`, `ConferirResposta.cs` e `LerAnexosDaJanela.cs` existem, cada um com no máximo 150 linhas, e `Assistente/Assistente.cs` sai da lista de `Arquivo_ate_150_linhas` (AC 22)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 linhas -Caminho One.Api/Assistente/MontarPrompt.cs,One.Api/Assistente/ChamarProvedor.cs,One.Api/Assistente/ConferirResposta.cs,One.Api/Assistente/LerAnexosDaJanela.cs -Max 150 # linhas`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista-sem -Regra Arquivo_ate_150_linhas -Nomes Assistente.cs # lista-sem`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Arquivo_ate_150_linhas|FullyQualifiedName~AssistenteTests"`

**C47** - `ConferirResposta.Classificar` devolve `resposta` com citações quando a conferência passa, `sem_base` quando falha, `pergunta` quando `Pergunta.Aceita`, `sem_base` com motivo `pergunta_invalida` quando não aceita, `transferir` para o tipo transferir e `sem_base` sem motivo para outro tipo (6 casos), sem banco e sem HTTP (AC 22)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ConferirRespostaTests.Classificar_cada_tipo"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'OneFactory|HttpClient' -Caminho One.Api.Tests/ConferirRespostaTests.cs -Esperado 0 # grep`

**C48** - `ConferirResposta.Conferir` devolve o motivo `fonte_invalida`, `texto_vazio`, `texto_longo` (acima de 700 caracteres), `trecho_invalido`, `link_invalido` ou `numero_sem_fonte` conforme a primeira regra violada, e `null` com as citações quando todas passam (7 casos), sem banco e sem HTTP (AC 22)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ConferirRespostaTests.Conferir_cada_motivo|FullyQualifiedName~ConferenciaTests"`

**C49** - `Assistente/` (incluindo `Embeddings.cs`) tem 0 ocorrências de `Task<object>` e 0 de objeto anônimo (`new {`), os corpos do provedor são records com `JsonPropertyName` (ao menos 1) e os 3 goldens do AC 5 seguem iguais (AC 23)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Task<object>|\bnew\s*\{' -Caminho One.Api/Assistente -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'JsonPropertyName' -Caminho One.Api/Assistente -Min 1 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CorpoParaProvedorTests|FullyQualifiedName~LlmRequisicaoTests"`

**C50** - `AbrirChamado` existe em `Chamados`, `TransferirConversa` e `AtendimentoDireto` o chamam (2 `new AbrirChamado(` em `Assistente/`) e `Transferencia.Criar` deixou de existir (0 ocorrências); a transferência responde 201 sem responsável e o atendimento direto 201 sem chamar a IA (AC 24)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 existe -Caminho One.Api/Chamados/AbrirChamado.cs -Esperado 1 # existe`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'new AbrirChamado\(' -Caminho One.Api/Assistente -Esperado 2 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Transferencia\.Criar\b' -Caminho One.Api -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~TransferenciaTests"`

**C51** - Vinte transferências paralelas numa instituição recebem 20 números `ONE-n` distintos e consecutivos, tirados por 1 `UPDATE instituicao ... RETURNING` dentro da transação (1 ocorrência em `One.Api/`) (AC 25)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~NumeracaoTests.Vinte_transferencias_paralelas_numeros_distintos|FullyQualifiedName~NumeracaoTests.Numero_por_instituicao"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'UPDATE instituicao SET ultimo_numero_chamado' -Caminho One.Api -Esperado 1 # grep`

**C52** - `DetalheChamado.Montar` faz no máximo as consultas da tabela abaixo (contador de comandos SQL; base `683e6a6` entre parênteses) e, no cenário simples (sem fluxo e sem citação), no máximo 4 para qualquer papel; nenhum arquivo do detalhe passa de 150 linhas e o JSON do detalhe segue igual a `Retratos/sucessos.txt` (AC 26)

| Papel | simples | com citação | com fluxo | com citação e fluxo |
| --- | --- | --- | --- | --- |
| aluno | 3 (7) | 3 (7) | 3 (8) | 3 (8) |
| líder | 3 (7) | 3 (7) | 5 (11) | 5 (11) |
| atendente | 4 (14) | 7 (14) | 6 (18) | 9 (18) |

"Com citação" é uma mensagem do assistente com `Fontes.Citadas` no histórico da conversa; "com fluxo" é chamado com `VersaoFluxoId` (para o aluno o fluxo não aparece no JSON).
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~DetalheChamadoTests.Montar_faz_no_maximo_4_consultas|FullyQualifiedName~DetalheChamadoTests.Montar_consultas_por_cenario"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 linhas -Caminho 'One.Api/Chamados/*Detalhe*.cs,One.Api/Chamados/Shared/*Detalhe*.cs' -Max 150 # linhas`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_sucesso_iguais_aos_da_base|FullyQualifiedName~ArmazenamentoTests.Detalhe_do_chamado_nao_expoe_chave_nem_hash"`

**C53** - `ReferenciasEntreFatias` não lista `Chamados>Assistente` nem `Indicadores>Assistente` e nenhum par tem o inverso listado (de 17 para 15 pares) (AC 27)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 pares-ausentes -Nomes Chamados>Assistente,Indicadores>Assistente # pares-ausentes`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 pares -Tipo inversos -Max 15 # pares`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Referencias_entre_fatias"`

**C54** - `Chamado.Abrir` (13 parâmetros hoje), `Rejeitar` (7), `Subir` (8) e `Encaminhar` (7) ficam com no máximo 5 parâmetros e saem de `Dados_ate_5_parametros` na S4; a lista fica só com `Chamado.ResponderComoEquipe`, `TokenMcp.Criar`, `PlataformaMoodle.Configurar` e `SubscricaoPush.Registrar` (4 itens, igualdade exata), exceção permanente "cadastro de uso único, record não paga" registrada no plano (Assumptions); `Reclassificar` já tem 5 parâmetros na base e não é ofensor (AC 28)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista-sem -Regra Dados_ate_5_parametros -Nomes Abrir,Rejeitar,Subir,Encaminhar # lista-sem`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista-contem -Regra Dados_ate_5_parametros -Nomes ResponderComoEquipe,TokenMcp.Criar,PlataformaMoodle.Configurar,SubscricaoPush.Registrar # lista-contem`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Dados_ate_5_parametros -Esperado 4 # lista`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Dados_ate_5_parametros -Justificativa .specs/features/refatoracao-back-limpa/plan.md # lista`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dados_ate_5_parametros|FullyQualifiedName~ChamadoDominioTests|FullyQualifiedName~EncaminharTests|FullyQualifiedName~ReclassificarSaiDoFluxoTests"`

**C55** - `MaxAnexo` é declarado 1 vez em `One.Api/` (hoje 2) e `ResponderChamado` e a rota de conversa leem o anexo pelo mesmo tipo: um anexo de 10 MiB + 1 byte devolve 413 nas duas rotas e o retrato de erros segue igual (AC 29)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'MaxAnexo\s*=' -Caminho One.Api -Esperado 1 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AnexoConversaTests|FullyQualifiedName~AnexoTests|FullyQualifiedName~RetratoTests.Corpos_de_erro_iguais_aos_da_base"`

**C56** - `AgirNoChamado` não tem o cast `(IResult)(object)` (0 ocorrências), `AvisarMudanca` se divide em interceptador, coleta de mudanças e aviso ao hub, e `AvisarMudancaTests`, `Hub_so_envia_ChamadoMudou_e_FilaMudou` e `Pipeline_do_chamado_com_a_forma_da_base` passam sem linha de `Assert` alterada em `AvisarMudancaTests.cs` (AC 30)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao '\(IResult\)\(object\)' -Caminho One.Api -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 asserts-intactos -Caminho One.Api.Tests/AvisarMudancaTests.cs # asserts-intactos`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AvisarMudancaTests|FullyQualifiedName~ArquiteturaTests.Hub_so_envia_ChamadoMudou_e_FilaMudou|FullyQualifiedName~ArquiteturaTests.Pipeline_do_chamado_com_a_forma_da_base"`

**C57** - `Indicadores/ConsultarIndicadores.cs` tem 0 ocorrências de `using One.Api.Assistente`, `Tipos.SemBase` está declarado em `One.Api/Dados/`, e os 2 objetos anônimos (L65 e L73 na base) viram records privados nomeados (0 `new {` no arquivo) (AC 31)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'using One\.Api\.Assistente' -Caminho One.Api/Indicadores/ConsultarIndicadores.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'new\s*\{' -Caminho One.Api/Indicadores/ConsultarIndicadores.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'SemBase\s*=' -Caminho One.Api/Dados -Esperado 1 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Objetos_anonimos_so_fora_das_respostas|FullyQualifiedName~IndicadoresTests|FullyQualifiedName~IndicadoresCalculoTests"`

### S5 - Administração, Instituições e Conhecimento sem regra no handler (AC 32-40) · 49 arquivos · 289,5 KB · ~74,1k

**C58** - `Usuario.DefinirPapeis` deixa só os papéis informados mais `OPERADOR` se já existia, sem duplicar: de [`ALUNO`, `OPERADOR`] com [`ATENDENTE`, `ATENDENTE`] resulta [`OPERADOR`, `ATENDENTE`] (AC 32)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~UsuarioDominioTests.Definir_papeis_mantem_OPERADOR_remove_os_ausentes_e_nao_duplica"`

**C59** - `Usuario.DefinirSenhaTemporaria(hash)` grava o hash e põe `DeveTrocarSenha` = true (AC 32)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~UsuarioDominioTests.Definir_senha_temporaria_grava_hash_e_exige_troca|FullyQualifiedName~UsuarioAdminTests.Criar_com_e_sem_senha_temporaria"`

**C60** - `Usuario.VincularSetores` troca os vínculos pelos informados: de [1, 2] com [2, 3] ficam [2, 3]; recebe os dados como um `DadosUsuario` e `Administracao/` tem 0 `db.Entry(` (AC 32)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~UsuarioDominioTests.Vincular_setores_remove_os_ausentes_e_acrescenta_os_novos"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'db\.Entry\(' -Caminho One.Api/Administracao -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'record DadosUsuario' -Caminho One.Api -Esperado 1 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~UsuarioAdminTests"`

**C61** - `Fluxo.Validar` devolve `Invalido("O fluxo precisa de 1 a 5 etapas.")` para 0 e para 6 etapas e aceita 1 e 5; `SalvarRascunho` responde 400 com o mesmo detalhe (AC 33)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoValidacaoDominioTests.Etapas_de_1_a_5"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Etapas_de_1_a_5"`

**C62** - `Fluxo.Validar` aceita `LIDERANCA_SEMESTRE` só na primeira etapa e nunca na última: posição 0 de 3 aceita, posição 1 e a última devolvem `Invalido("A liderança do semestre só pode ser a primeira etapa e nunca a última.")` (AC 33)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoValidacaoDominioTests.Lideranca_so_na_primeira_e_nunca_a_ultima"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Lideranca_so_na_primeira_e_nunca_a_ultima"`

**C63** - `Fluxo.Validar` aceita `PrazoHoras` de 1 a 720 e devolve `Invalido("O prazo vai de 1 a 720 horas e não vale na última etapa.")` para 0, 721 e para qualquer prazo na última etapa (4 casos) (AC 33)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoValidacaoDominioTests.Prazo_de_1_a_720_e_nunca_na_ultima"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Prazo_de_1_a_720_e_nunca_na_ultima|FullyQualifiedName~FluxoAdminTests.Destino_desconhecido_400|FullyQualifiedName~FluxoAdminTests.Setor_da_etapa_invalido_400|FullyQualifiedName~FluxoAdminTests.Setor_so_na_etapa_de_setor|FullyQualifiedName~FluxoAdminTests.Posicao_x_y_juntas_e_devolvidas"`

**C64** - `Setor.Validar` devolve o `Invalido` de cada regra pura: nome vazio "Informe o nome do setor.", curso sem semestre "Informe o curso e o semestre da liderança juntos.", semestre 0 e 13 "O semestre deve ficar entre 1 e 12.", triagem com curso "O setor de triagem não pode ser uma liderança." (5 casos); `Setor.Criar` sem validar lança `InvalidOperationException`; as respostas seguem iguais a `gravacoes.txt` e `erros.txt` (AC 34)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~SetorDominioTests.Validar_cada_regra_pura|FullyQualifiedName~SetorDominioTests.Criar_sem_validar_lanca"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CadastroTests.Triagem_zero_ou_duas_400|FullyQualifiedName~CadastroTests.Recusas_dos_cadastros_400|FullyQualifiedName~CadastroTests.Indice_recusa_segundo_setor_de_triagem|FullyQualifiedName~SetorEmFluxoTests|FullyQualifiedName~RetratoTests.Gravacoes_do_chamado_iguais_as_da_base|FullyQualifiedName~RetratoTests.Corpos_de_erro_iguais_aos_da_base"`

**C65** - `Instituicao.AlterarAparencia` grava os 11 campos que `AlterarAparencia.Aplicar` atribui na base (`NomeCurto`, `Cor`, `LoginTitulo`, `LoginFrase`, `LoginItens`, `AssistenteNome`, `AssistenteBoasVindas`, `AssistentePerguntas`, `ContatoHorario`, `ContatoTelefone`, `ContatoEmail`) e `AlterarAparencia.cs` não atribui campo de `Instituicao` (0 ocorrências de `i.NomeCurto`) (AC 35)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~InstituicaoDominioTests.AlterarAparencia_grava_os_campos_da_aparencia"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'i\.(NomeCurto|Cor|LoginTitulo|AssistenteNome|ContatoEmail)\b' -Caminho One.Api/Instituicoes/AlterarAparencia.cs -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AparenciaAdminTests.Put_grava_e_campo_ausente_volta_ao_padrao"`

**C66** - Os comandos `criar`, `operador` e `carga` de `instituicao` são 1 classe cada com dependências no construtor, `InstituicaoComando.cs` tem 0 ocorrências de `GetRequiredService` e sai da lista de `IgnoreQueryFilters`; a saída e o código de saída seguem os de `InstituicaoComandoTests` e `OperadorComandoTests` (AC 36)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'GetRequiredService|GetService' -Caminho One.Api/Instituicoes -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests|FullyQualifiedName~OperadorComandoTests|FullyQualifiedName~ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando"`

**C67** - `CadastroRotas.Listar`, `Criar` e `Alterar` deixaram de existir (0 ocorrências de `CadastroRotas`) e os 4 cadastros (setor, categoria, curso, resposta pronta) respondem como `gravacoes.txt` e `erros.txt` (AC 37)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'CadastroRotas' -Caminho One.Api -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CadastroTests.Crud_dos_cadastros|FullyQualifiedName~CadastroTests.Nome_repetido_409|FullyQualifiedName~CadastroTests.Regra_unica_por_categoria|FullyQualifiedName~RetratoTests.Gravacoes_do_chamado_iguais_as_da_base"`

**C68** - Cada linha do CSV vira 1 record tipado em `CsvMatriculas` (0 `Campo(l,` com índice) e o corpo 400 de `erros` (4 itens) segue igual a `Retratos/importacao.txt` (AC 38)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Campo\(\w+, [0-9]\)' -Caminho One.Api/Administracao/CsvMatriculas.cs -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CsvMatriculasTests|FullyQualifiedName~ImportacaoTests|FullyQualifiedName~RetratoTests.Erros_da_importacao_iguais_aos_da_base"`

**C69** - `DivisorDeTexto` (puro), `LeitorDePdf`, `BuscarFontes` e `CitacoesDeFontes` existem, `Fontes.cs` e os novos têm no máximo 150 linhas, `VersaoArtigo.Criar` monta as versões e o limite de título de 200 caracteres aparece em 1 lugar (AC 39)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 linhas -Caminho One.Api/Conhecimento/DivisorDeTexto.cs,One.Api/Conhecimento/LeitorDePdf.cs,One.Api/Conhecimento/BuscarFontes.cs,One.Api/Conhecimento/CitacoesDeFontes.cs -Max 150 # linhas`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao '\b200\b' -Caminho One.Api/Conhecimento -Esperado 1 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static .*VersaoArtigo Criar\(' -Caminho One.Api/Dados/Artigos -Esperado 1 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~DivisaoTests|FullyQualifiedName~ArtigoDominioTests|FullyQualifiedName~ArtigoAdminTests|FullyQualifiedName~DocumentoTests|FullyQualifiedName~IndexacaoTests|FullyQualifiedName~BuscaTests"`

**C70** - No fim da S5 `Entidade_sem_setter_publico` tem lista vazia, ou cada nome que sobrar (`OneDb`, cuja propriedade `InstituicaoAtual` é o tenant do escopo) aparece com o motivo em `verification.md` (AC 40)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Entidade_sem_setter_publico"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista-sem -Regra Entidade_sem_setter_publico -Nomes Setor,TrechoFonte,Matricula,Categoria,Curso,RespostaPronta,CitacaoArtigo,AtendenteSetor,UsuarioPapel # lista-sem`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Entidade_sem_setter_publico -Justificativa .specs/features/refatoracao-back-limpa/verification.md # lista`

### S6 - O Agendador só repete e despacha (AC 41-48) · 21 arquivos · 212,4 KB · ~54,4k

**C71** - Existem 9 classes `ITarefaAgendada` (`conversa`, `chamado`, `aguardando`, `lembrete`, `subir`, `email`, `trecho`, `push` e a limpeza de lançamentos vencidos), fora da raiz, cada uma registrada por `AddSingleton<ITarefaAgendada,` em uma extensão de fatia (`AddAcesso`, `AddAssistente`, `AddChamados`, `AddIndexacaoDeTrechos` e `AddEnvioDePush`; as duas últimas existem para a ordem do AC 41, plano B8), e o registro tem as 9 classes: os 8 `Tipo` da base na ordem do AC 41 e `ApagarLancamentos` com `Tipo` `lancamento`, cujo `Ler` devolve lista vazia (E11)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao ':\s*ITarefaAgendada\b' -Caminho One.Api -Excluir 'Agendador\.cs' -Esperado 9 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'AddSingleton<ITarefaAgendada,' -Caminho One.Api -Esperado 9 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorTarefasTests.Tarefas_registradas_na_ordem_da_base"`

**C72** - Depois da mudança `Ler()` devolve os mesmos itens na mesma ordem, cada um com o `Tipo` da base (AC 42; o teste é o da S1)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorOrdemTests.Ler_devolve_os_tipos_na_ordem_da_base|FullyQualifiedName~AgendadorOrdemTests.Trechos_sao_indexados_antes_dos_demais_itens"`

**C73** - `Agendador.cs` tem no máximo 150 linhas, 0 ocorrências de `Estado`, `Desfecho`, `ExecuteUpdateAsync`, `new EventoChamado` e `new MensagemChamado`, e todo arquivo com `IgnoreQueryFilters` implementa `ITarefaAgendada` (AC 43)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 linhas -Caminho One.Api/Agendador.cs -Max 150 # linhas`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao '\bEstado\b|\bDesfecho\b|ExecuteUpdateAsync|new EventoChamado|new MensagemChamado' -Caminho One.Api/Agendador.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 todos-com -Padrao IgnoreQueryFilters -Tipo ITarefaAgendada -Caminho One.Api # todos-com`

**C74** - `Chamado.FecharPorInatividade`, `LembrarAluno` e `ResolverPorFaltaDeResposta` aplicam a condição de hoje e devolvem `Recusa` fora dela: em cada uma, no limite exato (data = agora - prazo) a transição acontece, 1 segundo antes devolve `Recusa`, e estado errado devolve `Recusa` (3 métodos, 3 casos); `Chamado_muda_so_pelos_metodos` passa sem isenção do `Agendador.cs` (AC 44)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ChamadoAgendadorDominioTests.Fechar_por_inatividade_no_limite_antes_e_estado_errado|FullyQualifiedName~ChamadoAgendadorDominioTests.Lembrar_aluno_no_limite_antes_e_estado_errado|FullyQualifiedName~ChamadoAgendadorDominioTests.Resolver_por_falta_de_resposta_no_limite_antes_e_estado_errado"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Chamado_muda_so_pelos_metodos"`

**C75** - Quando o `SaveChangesAsync` de uma tarefa de `Chamado` termina em `DbUpdateConcurrencyException` ou o método devolve `Recusa`, a linha, os eventos, as mensagens e os avisos ficam como estavam (0 linhas novas) e nenhum log de nível Error é emitido (AC 45)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Conflito_de_xmin_nao_muda_nada_e_nao_registra_erro|FullyQualifiedName~AgendadorConcorrenciaTests.Recusa_do_dominio_nao_muda_nada_e_nao_registra_erro"`

**C76** - A tarefa de conversa e a de trecho mudam a linha com 1 `ExecuteUpdateAsync` condicionado pela expressão do domínio (`Conversa.Abandonavel` usada ao menos 2 vezes em `One.Api/`) e uma linha alterada depois da leitura continua intacta (AC 46)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Conversa\.Abandonavel\(' -Caminho One.Api -Min 2 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorConcorrenciaTests.Conversa_mudada_entre_Ler_e_Processar_fica_intacta|FullyQualifiedName~AgendadorConcorrenciaTests.Trecho_indexado_entre_Ler_e_Processar_fica_intacto|FullyQualifiedName~IndexacaoTests|FullyQualifiedName~AgendadorTests.Conversa_parada_30_min_abandona"`

**C77** - Os 11 modelos de mensagem de `LogInformation`, `LogWarning` e `LogError` do `Agendador.cs` da base aparecem byte a byte iguais no `Agendador.cs` e nas classes `ITarefaAgendada` (AC 47)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 logs-agendador # logs-agendador`

**C78** - Os testes do agendador passam sem linha de `Assert` alterada em `AgendadorTests.cs`, `FluxoPrazoTests.cs` e `PushAgendadorTests.cs`, e os 9 testes de concorrência do AC 6 e do AC 7 passam como na S1 (AC 48)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 asserts-intactos -Caminho One.Api.Tests/AgendadorTests.cs,One.Api.Tests/FluxoPrazoTests.cs,One.Api.Tests/PushAgendadorTests.cs # asserts-intactos`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AgendadorTests|FullyQualifiedName~FluxoPrazoTests|FullyQualifiedName~PushAgendadorTests|FullyQualifiedName~AgendadorConcorrenciaTests|FullyQualifiedName~AgendadorOrdemTests"`

**C79** - Porta 1: `Agendador.cs` declara `public sealed record ItemAgendado(string Tipo, long Id, long InstituicaoId)` e `public interface ITarefaAgendada` com `Tipo`, `Lote => 1`, `Ler`, `Executar` e `Limpar` com implementação padrão (1 declaração de cada)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'public sealed record ItemAgendado\(string Tipo, long Id, long InstituicaoId\)' -Caminho One.Api/Agendador.cs -Esperado 1 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'public interface ITarefaAgendada|int Lote => 1;|Task Limpar\(OneDb db, DateTime agora, CancellationToken parar\) => Task\.CompletedTask;' -Caminho One.Api/Agendador.cs -Esperado 3 # grep`

### S7 - Program.cs e a raiz sem responsabilidade extra (AC 49-54) · 23 arquivos · 181,7 KB · ~46,5k

**C80** - `Program.cs` tem no máximo 60 linhas, 0 registros diretos (`AddSingleton`, `AddHttpClient`, `AddDbContext`, `AddRateLimiter`, `AddAuthentication`, `AddProblemDetails`, `AddExceptionHandler`, `AddSignalR`, `AddMediator`, `AddMcpServer`), 0 `AutenticacaoMcp`, 0 `CookieAuthenticationDefaults`, e `Persistencia.cs`, `Seguranca.cs` e `TratamentoDeErros.cs` existem na raiz (AC 49)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 linhas -Caminho One.Api/Program.cs -Max 60 # linhas`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao '\.Add(Singleton|Scoped|Transient|HostedService|HttpClient|DbContext|RateLimiter|Authentication|ProblemDetails|ExceptionHandler|SignalR|Mediator|McpServer)\b|AutenticacaoMcp|CookieAuthenticationDefaults' -Caminho One.Api/Program.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 existe -Caminho One.Api/Persistencia.cs,One.Api/Seguranca.cs,One.Api/TratamentoDeErros.cs -Esperado 1 # existe`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Configuracao_lida_em_um_lugar|FullyQualifiedName~ArquiteturaTests.Cliente_S3_configurado_como_a_door_2|FullyQualifiedName~ArquiteturaTests.Aviso_registrado_so_no_Program|FullyQualifiedName~ArquiteturaTests.Pacote_mcp_fixado|FullyQualifiedName~SessaoTests"`

**C81** - As 3 políticas de limite mantêm os padrões `Limites:AuthPorMinuto` 5, `Limites:McpPorMinuto` 60 e `Limites:MensagensPorMinuto` 10 (3 ocorrências em `One.Api/`), o cookie mantém `one.auth`, `HttpOnly`, `Secure` sempre e `SameSite` Strict, e o golden de serviços da S1 segue igual (AC 50), exceto pela lista fechada do C20: `Removidas` = `Singleton One.Api.Email -> One.Api.Email` e `Adicionadas` = as 9 linhas `Singleton One.Api.ITarefaAgendada -> One.Api.<Fatia>.<Tarefa>` do C20 (com `One.Api.Assistente.IndexarTrechos`, E10) mais `Singleton One.Api.EnviadorSmtp -> One.Api.EnviadorSmtp`, e nada além disso (E5)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Limites:(AuthPorMinuto", 5\)|McpPorMinuto", 60\)|MensagensPorMinuto", 10\))' -Caminho One.Api -Esperado 3 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Cookie\.Name = "one\.auth"|Cookie\.HttpOnly = true|CookieSecurePolicy\.Always|SameSiteMode\.Strict' -Caminho One.Api -Esperado 4 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ServicosTests.Tempos_de_vida_iguais_ao_golden|FullyQualifiedName~RateLimitTests|FullyQualifiedName~McpAcessoTests.Limita_requisicoes_por_token|FullyQualifiedName~RetratoTests.Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano|FullyQualifiedName~SessaoTests.Logout_204_expira_cookie"`

**C82** - `TimeProvider.System` aparece 1 vez em `One.Api/` (o registro), `Armazenamento` recebe `TimeProvider` por injeção e `Relogio_so_pelo_TimeProvider` fica com lista vazia (AC 51)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'TimeProvider\.System' -Caminho One.Api -Esperado 1 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Relogio_so_pelo_TimeProvider -Esperado 0 # lista`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Relogio_so_pelo_TimeProvider|FullyQualifiedName~ArmazenamentoTests"`

**C83** - `Validar`, `Principal` e `ExigirTrocaDeSenha` ficam em `One.Api/Acesso/` (3 declarações) e fora de `Sessao.cs`, `Sessao.cs` mantém os acessores `Usuario()` e `Instituicao()` e `Prazos.cs` fica na raiz (AC 52)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static .* (Validar|Principal|ExigirTrocaDeSenha)\(' -Caminho One.Api/Acesso -Min 3 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static .* (Validar|Principal|ExigirTrocaDeSenha)\(' -Caminho One.Api/Sessao.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static .* (Usuario|Instituicao)\(this HttpContext' -Caminho One.Api/Sessao.cs -Esperado 2 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 existe -Caminho One.Api/Prazos.cs -Esperado 1 # existe`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~SessaoTests"`

**C84** - `Tokens.Novo` deixou de existir e `TokenAcesso.Criar` é a única criação, `NovoMcp` e `SlugDoMcp` estão em `Dados/Mcp/TokenMcp.cs` (2 declarações) e `Tokens.cs` fica com `Hash`, `UrlBase` e `Link` (3 declarações) (AC 52)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static .* Novo\(' -Caminho One.Api/Tokens.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static .* (NovoMcp|SlugDoMcp)\(' -Caminho One.Api/Dados/Mcp/TokenMcp.cs -Esperado 2 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static .* (Hash|UrlBase|Link)\(' -Caminho One.Api/Tokens.cs -Esperado 3 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~TokenMcpDominioTests|FullyQualifiedName~McpAdminTests|FullyQualifiedName~PrimeiroAcessoTests"`

**C85** - `Email.cs` deixou de existir, `EnviadorSmtp.cs` e `LayoutEmail.cs` existem, não existe `IEnviadorEmail` (0 ocorrências) e `Armazenamento.ComTamanho` não está mais em `Armazenamento.cs` (AC 52)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 existe -Caminho One.Api/Email.cs -Esperado 0 # existe`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 existe -Caminho One.Api/EnviadorSmtp.cs,One.Api/LayoutEmail.cs -Esperado 1 # existe`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'IEnviadorEmail' -Caminho One.Api -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'ComTamanho' -Caminho One.Api/Armazenamento.cs -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~EmailTests|FullyQualifiedName~EmailMarcaTests|FullyQualifiedName~EmailAnexoTests|FullyQualifiedName~ArmazenamentoTests"`

**C86** - As movimentações da S7 não criam nenhum par novo: `ReferenciasEntreFatias` não ganha entrada em relação ao fim da S6 (AC 52)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 pares-novos -Base <S6> # pares-novos`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Referencias_entre_fatias"`

**C87** - `Raiz_sem_fatias` fica com lista vazia: nenhum arquivo da raiz além de `Program.cs` tem `using One.Api.<Fatia>` (0 ocorrências nos arquivos da raiz) (AC 53)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Raiz_sem_fatias -Esperado 0 # lista`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'using One\.Api\.(Acesso|Administracao|Assistente|Chamados|Conhecimento|Indicadores|Instituicoes|Mcp)\b' -Caminho One.Api/Agendador.cs,One.Api/Armazenamento.cs,One.Api/Prazos.cs,One.Api/Problemas.cs,One.Api/Sessao.cs,One.Api/Tokens.cs,One.Api/EnviadorSmtp.cs,One.Api/LayoutEmail.cs,One.Api/Persistencia.cs,One.Api/Seguranca.cs,One.Api/TratamentoDeErros.cs -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Raiz_sem_fatias"`

**C88** - Os comandos `push`, `instituicao` (`criar`, `operador`, `carga`) e `avaliar` imprimem as mesmas linhas e saem com os mesmos códigos da base (`PushComandoTests` 3, `InstituicaoComandoTests` 16, `OperadorComandoTests` 4, `AvaliarBuscaTests` 3), e `Program.cs` não escreve no console (0 `Console.`) (AC 54)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Console\.' -Caminho One.Api/Program.cs -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~PushComandoTests|FullyQualifiedName~InstituicaoComandoTests|FullyQualifiedName~OperadorComandoTests|FullyQualifiedName~AvaliarBuscaTests"`

**C89** - Porta 2: as 8 fatias (`Acesso`, `Administracao`, `Assistente`, `Chamados`, `Conhecimento`, `Indicadores`, `Instituicoes`, `Mcp`) declaram `Add<Fatia>` e `Map<Fatia>` como métodos de extensão públicos (16 declarações) e nenhum `*Rotas.Mapear` é chamado de `Program.cs` (0)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'public static \w+(<\w+>)? (Add|Map)(Acesso|Administracao|Assistente|Chamados|Conhecimento|Indicadores|Instituicoes|Mcp)\(this' -Caminho One.Api -Esperado 16 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Rotas\.Mapear' -Caminho One.Api/Program.cs -Esperado 0 # grep`

### S9 - Fatias sem balde horizontal e sem chamada ao interior da vizinha (AC 60-68) · 47 arquivos · 196,0 KB · ~50,2k

**C90** - Não existe pasta `Shared`, `Common`, `Utils` ou `Helpers` em `One.Api/` (as 3 pastas de hoje somem), os 9 records de resposta estão cada um em exatamente 1 arquivo fora de `Shared`, nenhum `using One.Api.<Fatia>.Shared;` resta em `One.Api/` nem em `One.Api.Tests/`, e os JSON seguem iguais aos retratos (AC 60)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 existe -Caminho One.Api/Administracao/Shared,One.Api/Chamados/Shared,One.Api/Conhecimento/Shared -Esperado 0 # existe`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 definido-uma-vez -Nomes CategoriaResposta,CursoResposta,FluxoResposta,RespostaProntaResposta,SetorResposta,UsuarioResposta,ArtigoResposta,DocumentoResposta,DetalheChamado -Tipo '(public )?(sealed )?(record|class)' -Excluir 'Shared' # definido-uma-vez`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'using One\.Api\.\w+\.Shared;' -Caminho 'One.Api,One.Api.Tests' -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Sem_balde_horizontal|FullyQualifiedName~ArquiteturaTests.Namespace_igual_a_pasta|FullyQualifiedName~RetratoTests"`

**C91** - Não existe classe `*Rotas` em `One.Api/` (as 16 de hoje: `AdminRotas`, `AparenciaRotas`, `ArtigoRotas`, `AuthRotas`, `CadastroRotas`, `ChamadoRotas`, `ConversaRotas`, `DocumentoRotas`, `FluxoRotas`, `ImportacaoRotas`, `IndicadorRotas`, `InstituicaoRotas`, `McpRotas`, `PlataformaRotas`, `PushRotas`, `UsuarioRotas`), `Sem_balde_horizontal` fica com lista vazia e `POST /api/auth/logout` segue achado por `Fora_do_mediator` (AC 61)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'static class \w+Rotas\b' -Caminho One.Api -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Sem_balde_horizontal -Esperado 0 # lista`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Map_so_nos_casos_de_uso|FullyQualifiedName~ArquiteturaTests.Fora_do_mediator|FullyQualifiedName~ArquiteturaTests.Sem_balde_horizontal|FullyQualifiedName~SessaoTests.Logout_204_expira_cookie"`

**C92** - `Caso_de_uso_sem_chamada_estatica_de_outro` fica com lista vazia: `AlterarSetor`, `AlterarCurso`, `AlterarCategoria` e `AlterarRespostaPronta` não chamam `Criar<X>.Validar` (0 ocorrências) e `ConversaRotas` não chama `ResponderChamado.LerAnexo` (0), sem mudar as respostas de `CadastroTests` (AC 62)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Caso_de_uso_sem_chamada_estatica_de_outro -Esperado 0 # lista`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Criar(Setor|Curso|Categoria|RespostaPronta)\.Validar|ResponderChamado\.LerAnexo' -Caminho One.Api -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Caso_de_uso_sem_chamada_estatica_de_outro|FullyQualifiedName~CadastroTests"`

**C93** - `AcessoChamado` tem exatamente as propriedades `Agora`, `Chamado` e `Papel`, `AgirNoChamado` não tem `Prazos` nem `IConfiguration` (0 ocorrências) e os 4 handlers que leem esses valores os recebem pelo construtor; `AvisarMudancaTests` e `AcoesDoChamadoTests` passam sem `Assert` alterado em `AvisarMudancaTests.cs` (AC 63)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AcessoChamadoTests.Tem_so_Agora_Chamado_e_Papel"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Prazos|IConfiguration' -Caminho One.Api/Chamados/AgirNoChamado.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 asserts-intactos -Caminho One.Api.Tests/AvisarMudancaTests.cs # asserts-intactos`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AvisarMudancaTests|FullyQualifiedName~AcoesDoChamadoTests|FullyQualifiedName~ArquiteturaTests.Dez_acoes_do_chamado|FullyQualifiedName~ArquiteturaTests.Pipeline_do_chamado_com_a_forma_da_base|FullyQualifiedName~MediatorTests.AgirNoChamado_so_nas_10_acoes|FullyQualifiedName~PrazosTests"`

**C94** - `Acesso/VerInstituicao.Resposta` declara os próprios campos (0 ocorrências de `AparenciaDados` em `One.Api/Acesso/`) e `GET /api/instituicoes/{slug}` devolve o JSON do golden da S1 (AC 64)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'AparenciaDados' -Caminho One.Api/Acesso -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~InstituicaoPublicaTests.Corpo_igual_ao_golden|FullyQualifiedName~InstituicaoRotaTests|FullyQualifiedName~AparenciaPublicaTests"`

**C95** - `Arquivos.cs` está na raiz e não em `Conhecimento/`, `Fontes.DoArtigo` e `TextoDoArtigo` não existem mais (0), as 2 `Ultima()` são métodos em `One.Api/Dados/` e a lista de arquivos da raiz de `Fatias_do_api` inclui `Arquivos` (AC 65)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 existe -Caminho One.Api/Arquivos.cs -Esperado 1 # existe`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 existe -Caminho One.Api/Conhecimento/Arquivos.cs -Esperado 0 # existe`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'Fontes\.(DoArtigo|TextoDoArtigo)\b' -Caminho One.Api -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao '\bUltima\(' -Caminho One.Api/Dados -Min 2 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao '"Arquivos"' -Caminho One.Api.Tests/ArquiteturaTests.cs -Min 1 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Fatias_do_api|FullyQualifiedName~ArquiteturaTests.Ultima_versao_em_um_arquivo|FullyQualifiedName~ArtigoDominioTests|FullyQualifiedName~DocumentoDominioTests"`

**C96** - `dotnet One.Api.dll instituicao avaliar` imprime as mesmas linhas e sai com o mesmo código (0 com avaliação válida, 1 com arquivo inválido), sua classe está em `One.Api/Assistente/` e `InstituicaoComando.cs` tem 0 `using One.Api.Assistente` (AC 66)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AvaliarBuscaTests"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'using One\.Api\.Assistente' -Caminho One.Api/Instituicoes -Esperado 0 # grep`

**C97** - As rotas `/admin` de `Conhecimento` e `Instituicoes` são registradas por `Map<Fatia>` da fatia dona: `Administracao/` tem 0 `using One.Api.Conhecimento` e 0 `using One.Api.Instituicoes`, `rotas.txt` segue com as mesmas 93 linhas (comparadas ordenadas) e as 41 rotas `/api/admin/` seguem respondendo 403 a quem não é administrador (AC 67)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'using One\.Api\.(Conhecimento|Instituicoes)\b' -Caminho One.Api/Administracao -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 retratos # retratos`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano|FullyQualifiedName~RetratoTests.Admin_403_com_detail_em_toda_rota_admin"`

**C98** - `ReferenciasEntreFatias` termina com no máximo 10 pares (de 16 hoje), nenhum com o inverso listado, e `Referencias_entre_fatias` passa; par que ficar exige o motivo em `verification.md` (AC 68)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 pares -Tipo inversos -Max 10 # pares`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Referencias_entre_fatias"`

### S8 - MCP e mapeamento EF (AC 55-59) · 44 arquivos · 150,7 KB · ~38,6k

**C99** - `Mcp/FerramentasMcp.cs` chama os casos de uso das outras fatias e lê o resultado tipado: 0 `GetProperty("` e 0 `TryGetProperty("`, 0 `db.Usuarios` e 0 `db.Instituicoes` na entrada, e as 4 ferramentas (`listar_chamados`, `ver_chamado`, `buscar_conhecimento`, `ver_indicadores`) devolvem o texto JSON da base (AC 55)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'GetProperty\("|TryGetProperty\("' -Caminho One.Api/Mcp/FerramentasMcp.cs -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'db\.(Usuarios|Instituicoes)' -Caminho One.Api/Mcp/FerramentasMcp.cs -Esperado 0 # grep`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~McpFerramentasTests.Listar_chamados_igual_a_rota_e_corta_em_50|FullyQualifiedName~McpFerramentasTests.Ver_chamado_igual_a_rota_sem_anexo_nem_matricula|FullyQualifiedName~McpFerramentasTests.Buscar_conhecimento_so_ativos_da_instituicao|FullyQualifiedName~McpFerramentasTests.Ver_indicadores_igual_a_rota|FullyQualifiedName~McpFerramentasTests|FullyQualifiedName~McpAcessoTests"`

**C100** - Existem 34 classes `IEntityTypeConfiguration<T>` em `Dados/Mapeamento/`, uma por tipo de entidade do modelo (34 hoje), aplicadas antes do laço de renomeação; `OneDb.cs` tem no máximo 150 linhas; o modelo construído em `pt-BR` e em `Invariant` é idêntico (decide se `ApplyConfigurationsFromAssembly` pode ser usado) (AC 56)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao ':\s*IEntityTypeConfiguration<' -Caminho One.Api/Dados/Mapeamento -Esperado 34 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 linhas -Caminho One.Api/Dados/OneDb.cs -Max 150 # linhas`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~MapeamentoTests.Uma_configuracao_por_tipo_de_entidade|FullyQualifiedName~MapeamentoTests.Modelo_igual_em_pt_BR_e_Invariant"`

**C101** - Em `One.Api/Dados/` só `OneDb.cs` e `Dados/Mapeamento/` importam `Microsoft.EntityFrameworkCore` ou citam `OneDb` (0 ocorrências nos demais) e `Dados_sem_EfCore` tem lista vazia (AC 57)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 grep -Padrao 'using Microsoft\.EntityFrameworkCore|\bOneDb\b' -Caminho One.Api/Dados -Excluir 'OneDb\.cs|Mapeamento' -Esperado 0 # grep`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Dados_sem_EfCore -Esperado 0 # lista`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dados_sem_EfCore"`

**C102** - Nenhum nome de tabela, coluna, índice ou restrição muda: `Modelo_sem_mudanca_pendente`, `Tabelas_snake_case_e_datas_timestamptz` e `Toda_entidade_tem_instituicao_e_filtro` passam, `has-pending-model-changes` sai 0 e `Migracoes/` segue idêntica à base (AC 58)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Modelo_sem_mudanca_pendente|FullyQualifiedName~ArquiteturaTests.Tabelas_snake_case_e_datas_timestamptz|FullyQualifiedName~ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro"`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 modelo # modelo`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 migracoes # migracoes`

**C103** - No último commit nenhuma lista `Excecoes_*` cresceu desde a S1 (tamanho de cada lista menor ou igual ao da S1; item novo só como renomeação listada em `## Emendas aprovadas`, E9), `Arquivo_ate_150_linhas` lista só `Dados/Chamados/Chamado.cs` (1 item), `dotnet build One.slnx` sai 0 e a suíte inteira passa (AC 59)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 listas-encolhem -Base <S1> # listas-encolhem`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista -Regra Arquivo_ate_150_linhas -Esperado 1 # lista`
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 lista-contem -Regra Arquivo_ate_150_linhas -Nomes Chamado.cs # lista-contem`
Proof: `dotnet build One.slnx` # sai 0
Proof: `dotnet test One.Api.Tests` # sai 0

**C104** - Todo filtro `FullyQualifiedName~` deste arquivo lista ao menos 1 teste no último commit (um filtro sem teste sai 0 e não prova nada)
Proof: `pwsh -NoProfile -File .specs/features/refatoracao-back-limpa/provas.ps1 nomes # nomes`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| fatias (9) | S1 C1 C2 C3 C4 C22 C24 · S2 C26 C27 C35 C37 · S3 C39 C43 C45 · S4 C46 C50 C53 · S5 C58 C61 C64 C70 · S6 C71 C73 C74 · S7 C80 C82 C87 · S9 C90 C91 C98 · S8 C100 C101 C103 | - |
| critérios do plano (68) | AC1 C1 · AC2 C2 · AC3 C3 · AC4 C4 · AC5 C5 C6 C7 · AC6 C8 C9 C10 C11 · AC7 C12 C13 C14 C15 C16 · AC8 C22 C23 · AC9 C24 · AC10 C25 · AC11 C26 · AC12 C27 · AC13 C28 · AC14 C29 C30 C31 C32 C33 · AC15 C34 · AC16 C35 C36 · AC17 C37 · AC18 C39 C40 C41 C42 · AC19 C43 · AC20 C44 · AC21 C45 · AC22 C46 C47 C48 · AC23 C49 · AC24 C50 · AC25 C51 · AC26 C52 · AC27 C53 · AC28 C54 · AC29 C55 · AC30 C56 · AC31 C57 · AC32 C58 C59 C60 · AC33 C61 C62 C63 · AC34 C64 · AC35 C65 · AC36 C66 · AC37 C67 · AC38 C68 · AC39 C69 · AC40 C70 · AC41 C71 · AC42 C72 · AC43 C73 · AC44 C74 · AC45 C75 · AC46 C76 · AC47 C77 · AC48 C78 · AC49 C80 · AC50 C81 · AC51 C82 · AC52 C83 C84 C85 C86 · AC53 C87 · AC54 C88 · AC55 C99 · AC56 C100 · AC57 C101 · AC58 C102 · AC59 C1 C103 · AC60 C90 · AC61 C91 · AC62 C92 · AC63 C93 · AC64 C94 · AC65 C95 · AC66 C96 · AC67 C97 · AC68 C98 | - |
| portas do Landing (9) | porta 1 contrato do Agendador C79 C71 · porta 2 Add e Map por fatia C89 C80 · porta 3 ratchet C22 C23 C24 · porta 4 Cpf C35 C36 C37 · porta 5 CadastroRotas C67 · porta 6 Invalido C38 C61 C64 · porta 7 regra do Agendador sobre agregado C74 C76 C26 · porta 8 mapeamento EF C100 C101 · porta 9 fronteira entre fatias C92 C91 C98 | - |
| retratos de resposta (5) | rotas.txt 93 linhas C2 · erros.txt 9 linhas C2 · sucessos.txt 56 linhas C2 · gravacoes.txt 24 linhas C2 · importacao.txt 1 linha C2 | - |
| rotas de rotas.txt (93) | as 93 rotas, uma linha cada, C2 table-driven over all 93 lines of rotas.txt | - |
| status de erro de erros.txt (9) | C2 table-driven over all 9 lines of erros.txt: 400 · 401 · 403 · 404 · 409 · 413 · 415 · 429 · 503 | - |
| rotas /api/admin/ com 403 (41) | C2 table-driven over all 41 admin routes, para aluno e atendente | - |
| rotas anônimas (10) | C2 table-driven over all 10 anonymous routes in `Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano` | - |
| políticas de limite (3) | auth 5 por minuto C81 · mcp 60 por minuto C81 · mensagens 10 por minuto C81 | - |
| regras de ratchet (11) | Dados_sem_EfCore C22 C24 · Relogio_so_pelo_TimeProvider C22 C24 · Entidade_sem_setter_publico C22 C24 · Raiz_sem_fatias C22 C24 · Handler_sem_new_de_entidade C22 C24 · Arquivo_ate_150_linhas C22 C24 · Dados_ate_5_parametros C22 C24 · Mensagem_sem_entidade C22 C24 · Service_locator_so_na_composicao C22 C24 · Caso_de_uso_sem_chamada_estatica_de_outro C22 C24 · Sem_balde_horizontal C22 C24 | - |
| tipos com setter público na base (17) | Usuario C27 · Conversa C27 · MensagemConversa C27 · TokenAcesso C27 · Instituicao C27 · ImagemInstituicao C27 · EmailSaida C27 · Setor C70 · TrechoFonte C70 · Matricula C70 · Categoria C70 · Curso C70 · RespostaPronta C70 · CitacaoArtigo C70 · AtendenteSetor C70 · UsuarioPapel C70 · OneDb C70 | - |
| classes de valores gravados (9) | Papeis C34 · EstadosArtigo C34 · Desfechos C34 · EstadosDocumento C34 · EstadosChamado C34 · TiposEvento C34 · DestinosEtapa C34 · TiposMensagem C34 · MotivosFechamento C34 | - |
| tarefas do Agendador (9) | conversa C8 C12 C76 · chamado C9 C13 C74 · aguardando C11 C15 C74 · lembrete C10 C14 C74 · subir C16 C71 · email C26 C71 · trecho C17 C19 C76 · push C78 C71 · limpeza de lançamentos C71 C18 | - |
| tipos de item em Ler() (8) | conversa C18 C72 · chamado C18 C72 · aguardando C18 C72 · lembrete C18 C72 · subir C18 C72 · email C18 C72 · trecho C18 C72 · push C18 C72 | - |
| requisições ao provedor de IA (3) | sem anexo C5 · com anexo C6 · embedding C7 | - |
| métodos de Chamado que saem da lista de mais de 5 parâmetros (4) | Abrir C54 · Rejeitar C54 · Subir C54 · Encaminhar C54 | - |
| decisões do Agendador sobre Chamado (3) | FecharPorInatividade C74 C13 · LembrarAluno C74 C14 · ResolverPorFaltaDeResposta C74 C15 | - |
| entradas inválidas de Cpf.Tentar (6) | null C36 · 10 dígitos C36 · letra no meio C36 · primeiro dígito verificador errado C36 · segundo dígito verificador errado C36 · válido com pontuação C35 | - |
| motivos de rejeição do roteamento (4) | Curso sem coordenação C44 C41 · Sem liderança disponível C44 C41 · Setor inativo C44 C41 · Atendimento direto não passa pela liderança C44 C41 | - |
| regras de Fluxo.Validar (3) | 1 a 5 etapas C61 · liderança só na primeira C62 · prazo de 1 a 720 horas C63 | - |
| comandos de linha de comando (5) | push C88 · instituicao criar C66 C88 · instituicao operador C66 C88 · instituicao carga C66 C88 · instituicao avaliar C96 C88 | - |
| ferramentas do MCP (4) | listar_chamados C99 · ver_chamado C99 · buscar_conhecimento C99 · ver_indicadores C99 | - |
| classes *Rotas dissolvidas (16) | AdminRotas C91 · AparenciaRotas C91 · ArtigoRotas C91 · AuthRotas C91 · CadastroRotas C91 · ChamadoRotas C91 · ConversaRotas C91 · DocumentoRotas C91 · FluxoRotas C91 · ImportacaoRotas C91 · IndicadorRotas C91 · InstituicaoRotas C91 · McpRotas C91 · PlataformaRotas C91 · PushRotas C91 · UsuarioRotas C91 | - |
| records de resposta fora de Shared (9) | CategoriaResposta C90 · CursoResposta C90 · FluxoResposta C90 · RespostaProntaResposta C90 · SetorResposta C90 · UsuarioResposta C90 · ArtigoResposta C90 · DocumentoResposta C90 · DetalheChamado C90 | - |
| tamanho inicial das listas do ratchet (6) | Arquivo_ate_150_linhas 6 C23 · Sem_balde_horizontal 19 C23 · Entidade_sem_setter_publico 17 C23 · Caso_de_uso_sem_chamada_estatica_de_outro 5 C23 · Dados_sem_EfCore 2 C23 · Relogio_so_pelo_TimeProvider 1 C23 | - |
| pares em ReferenciasEntreFatias (4 marcos) | 16 na base e 17 depois da S3 C45 · 15 depois da S4 C53 · nenhum par novo na S7 C86 · 10 ou menos no fim da S9 C98 | - |
| startup: lugares onde a configuração de serviços é montada (2) | Program.cs C20 C81 · fábrica dos testes `OneFactory` C20 C1 | - |

- Claims que citam status, rota ou forma de resposta: C2, C52, C94, C97, C21; cada um tem prova que cruza a fronteira HTTP (`RetratoTests`, `InstituicaoPublicaTests`) ou o JSON do provedor (`CorpoParaProvedorTests`).
- A seção `Surface` do plano é `None`: o conjunto de rotas e status é o das rotas existentes congeladas por `rotas.txt` (93), `erros.txt` (9), `sucessos.txt` (56), `gravacoes.txt` (24) e `importacao.txt` (1); nenhuma rota nova, então nenhum status novo.
- Os testes de domínio novos (`EmailSaidaDominioTests`, `UsuarioDominioTests`, `ConversaDominioTests`, `CpfValorTests`, `FluxoValidacaoDominioTests`, `SetorDominioTests`, `InstituicaoDominioTests`, `ChamadoAgendadorDominioTests`, `ConferirRespostaTests`, `AcessoChamadoTests`) não podem usar `OneFactory`; `Testes_de_dominio_sem_banco` e `Testes_de_regra_sem_banco` guardam isso.

## Test policy

O repositório responde ao nível (AGENTS.md: integração bate na rota HTTP, regra de domínio tem teste unitário na entidade) mas não à cobertura da entrada: nenhum texto diz quanto da tabela de decisão um teste precisa afirmar. Estas linhas fecham essa lacuna para a refatoração.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide e é alcançado por uma rota | um na rota (HTTP, banco real) e um na entidade ou no tipo de domínio | o contrato na rota; um caso afirmado por linha da tabela de decisão na entidade |
| Decide e não é alcançado por rota (tarefa do `Agendador`) | um no tipo de domínio e um de concorrência pelo `Agendador.Executar()` | um caso por linha da tabela de decisão; um teste de concorrência por tarefa |
| Só encaminha (rota que liga o corpo e envia a mensagem, `Add<Fatia>`, `Map<Fatia>`) | nenhum próprio | coberto pelo teste do consumidor e por `RetratoTests` |
| Regra de arquitetura | um teste de reflexão ou de texto com lista de exceção igual aos ofensores | lista nos dois sentidos; só encolhe depois da S1 |

Evidence:

- `Agendador.cs`: 72 pontos de decisão (`if`, `case`, `catch`, `when`, ternário, `??`, `&&`, `||`, contados por regex), despacha 8 tipos -> decide
- `Dados/Fluxos/ResolverFluxo.cs`: 34 pontos de decisão, 4 funções puras (`Escolher`, `Etapa`, `Situacao`, `Proximo`) -> decide; já provado na entidade por `FluxoDominioTests` (24 casos)
- `Cpf.cs`: 6 pontos de decisão, 5 saídas `null` mais o caso válido -> decide
- `Administracao/SalvarRascunho.cs`: 24 pontos de decisão, 5 mensagens `Invalido` -> decide; `Administracao/CriarSetor.cs`: 31 pontos, 8 mensagens -> decide
- `Assistente/Assistente.cs`: 43 pontos de decisão, `Classificar` com 4 saídas e `Conferir` com 6 motivos -> decide
- `Program.cs`: 17 pontos de decisão, a maioria registro e configuração -> encaminha; `Dados/OneDb.cs`: 3 pontos, mapeamento sem condição -> encaminha
- análogos já provados no nível da entidade no repositório: `ChamadoDominioTests` (11 casos), `FluxoDominioTests` (24), `PushDominioTests` (4), `TokenMcpDominioTests` (4)

Cost: 10 classes novas de teste de domínio (cerca de 45 casos) e 3 classes de teste de borda (`CorpoParaProvedorTests`, `AgendadorConcorrenciaTests`, `AgendadorOrdemTests`); sem essas linhas, as 6 tabelas de decisão movidas ficam provadas só por um caminho que passa por elas. Pergunta ao dono: essas linhas entram nas diretrizes do repositório? Sem resposta, o build segue sob elas e nenhum arquivo de diretriz é tocado.

## Swept

- validation: C36, C61, C62, C63, C64, C48
- failure modes: C75, C26, C8, C9, C10, C11; falha parcial: item que falha não derruba os outros, existing `AgendadorTests.Falha_num_item_segue_os_outros` e `PushAgendadorTests.Falha_e_demora_do_push_seguem_os_outros_itens`, mantidos por C78
- idempotency: C12, C13, C14, C15, C16; push existing `PushAgendadorTests.Enviada_entre_a_leitura_e_o_processamento_nao_reenvia` mantido por C78; `EmailSaida` não tem prova de não reenvio porque o `Agendador.Enviar` da base não relê `EnviadoEm` (achado em Pendências, comportamento preservado e não corrigido)
- authorization: existing: `RetratoTests.Admin_403_com_detail_em_toda_rota_admin`, `Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano` (91 rotas com autorização, 10 anônimas) e `SessaoTests`, mantidos por C2 e C97; nada de autorização muda
- concurrency: C12, C13, C14, C15, C16, C75 (conflito de `xmin` do `Chamado` adia o item para o ciclo seguinte), C76, C19
- data lifecycle: C3, C37, C102 (nenhuma tabela, coluna, índice ou valor gravado muda); limpeza de lançamentos vencidos: C71
- dependency failure: existing: `AgendadorTests.Falha_num_item_segue_os_outros`, `EmailFalhaTests.Retry_2_a_n_e_desiste_em_5`, `PushAgendadorTests.Outras_falhas_repetem_e_desistem_na_quinta`, `IndexacaoTests.Falha_de_embeddings_tenta_5_vezes` e `ArmazenamentoTests.Erro_do_bucket_responde_503_e_nada_fica`, mantidos por C78, C76 e C1
- state transitions: C32, C33, C31, C29, C30, C74, C13, C15
- observability: C77 (11 modelos de log do agendador byte a byte), C19, C75 (nenhum log de erro no conflito); `ProblemDetails` e traceId: C2

## Swept existing

Os guardas que já existem e que esta feature não pode enfraquecer, com a prova de que seguem de pé:

- retratos de rota, status e corpo: `RetratoTests` (6) -> C2
- sem migration e sem mudança de modelo: `Modelo_sem_mudanca_pendente` -> C3, C102
- complexidade ciclomática: CA1502 em `WarningsAsErrors` -> C4
- multi-instituição: `Toda_entidade_tem_instituicao_e_filtro` e `IsolamentoTests` -> C102, C1
- domínio sem ASP.NET Core, Mediator nem fatias: `Dominio_sem_AspNetCore_Mediator_nem_fatias` -> C38
- um arquivo por caso de uso, um handler por mensagem, entrada e resposta por caso de uso: `Um_arquivo_por_caso_de_uso`, `Um_handler_por_mensagem_no_mesmo_arquivo`, `Entrada_por_caso_de_uso`, `Resposta_por_caso_de_uso` -> C1
- dois projetos e nenhum repositório sobre o EF: `Dois_projetos_sem_repositorio` -> C1

## Out of scope

O plano traz a seção `Out of scope`; nada de novo aqui.

- Reenvio de `EmailSaida` entre a leitura e o processamento: é comportamento da base, a refatoração o preserva e o achado vai para o dono.
- `DateTimeOffset.UtcNow` em `Instituicoes/RemoverImagemInstituicao.cs:19`: a regra `Relogio_so_pelo_TimeProvider` mede só `TimeProvider.System` (AC 51); corrigir é feature à parte.

## Handoff

Tamanho, com a aritmética: bytes dos arquivos que a fatia lê ou altera (produção e testes, `Get-Item.Length` sobre a base `97524d1`) dividido por 4. Não entram os arquivos novos, a saída de build e de teste nem a ida e volta da conversa, então os números são piso. Budget: 150k (`AGENTS.md`, profile standard). Script de medição: lista de arquivos por fatia pelos nomes do plano; as classes `CadastroTests` e `IndexacaoTests` estão em `AdminTests.cs` e `BuscaTests.cs` e entram por esses arquivos.

| Fatia | Arquivos (produção + teste) | KB | Tokens da fatia | Soma das fatias inteiras | Soma contando cada arquivo uma vez |
| --- | --- | --- | --- | --- | --- |
| S1 | 4 + 10 = 14 | 183,7 | 47,0k | 47,0k | 47,0k |
| S2 | 27 + 25 = 52 | 420,5 | 107,6k | 154,6k | 123,3k |
| S3 | 8 + 8 = 16 | 175,7 | 45,0k | 199,6k | 139,1k |
| S4 | 19 + 11 = 30 | 296,7 | 76,0k | 275,6k | 164,6k |
| S5 | 40 + 9 = 49 | 289,5 | 74,1k | 349,7k | 204,8k |
| S6 | 13 + 8 = 21 | 212,4 | 54,4k | 404,1k | 210,1k |
| S7 | 15 + 8 = 23 | 181,7 | 46,5k | 450,6k | 225,4k |
| S9 | 42 + 5 = 47 | 196,0 | 50,2k | 500,8k | 231,4k |
| S8 | 42 + 2 = 44 | 150,7 | 38,6k | 539,4k | 240,7k |

Veredito: não cabe. A conta mais favorável (cada arquivo contado uma vez, um builder só) dá 240,7k contra 150k, e a conta fatia a fatia dá 539,4k. O orçamento estoura na entrada da S4 (164,6k acumulado na conta favorável; já na S2 a soma das fatias inteiras passa de 150k, com 154,6k). Nenhuma fatia sozinha passa do orçamento (a maior é a S2, com 107,6k), então o corte é em fronteira de fatia, não no meio de um resultado. `ArquiteturaTests.cs` (67 KB, 16,8k) é tocado em 8 das 9 fatias e responde por boa parte da diferença entre as duas colunas.

Cortes propostos nas fronteiras de fatia, com a soma de cada lote contando cada arquivo uma vez dentro do lote (um builder novo por lote, só em verde):

- Lote A = S1 + S2 = 123,3k (folga de 26,7k para arquivos novos e saída de teste; se for pouco, separar S1 = 47,0k e S2 = 107,6k)
- Lote B = S3 + S4 = 103,2k
- Lote C = S5 = 74,1k
- Lote D = S6 + S7 = 79,1k
- Lote E = S9 + S8 = 71,9k (S9 antes da S8, como no plano)

Mecanismo: handoff em 5 lotes sequenciais, só em verde (A: S1+S2, B: S3+S4, C: S5, D: S6+S7, E: S9+S8). Escolhido por delegação do usuário ("siga o que for recomendado"). Execução dos testes: `.specs/features/refatoracao-back-limpa/testar-em-container.ps1` (container `mcr.microsoft.com/dotnet/sdk:10.0` com `--network host`), porque o App Control do Windows bloqueia `One.Api.Tests.exe`. Linha de base na `97524d1`+árvore atual: 809 de 810; a falha `PlataformaTests.InstituicaoAtual_so_onde_ja_era_e_na_plataforma` é de ordem de enumeração de arquivos no Linux, não de código.

Cada builder acrescenta aqui, ao fechar o lote, três linhas: `Boundary` (checks fechados e sha), `Settled mid-build` e `Abandoned`.

- Lote A, S1: Boundary `ad7cf78` (C1-C25: suíte 837/837 no commit; listas 6/19/17/5/2/1 conferidas por `provas.ps1 lista`; `git diff 97524d1 ad7cf78 -- One.Api` vazio; mutação das 11 listas pega no container). C2 só vale para os cinco retratos originais (ver notas-build.md, item 2).
- Lote A, S2: Boundary `967860a` (C26-C38: suíte 862/862; C27 `lista-sem` e C28 grep conferidos, C27 `lista-sem` não fecha pela prova escrita, ver notas-build.md, item 6). Settled mid-build: vocabulários em arquivo próprio na pasta da entidade; `Invalido` e `DadosDeAparencia` criados em `Dados/`. Abandoned: nenhum item; o lote B (S3 e S4) não foi iniciado.
- Lote D, S6: Boundary `d1e099b` (C71-C79: suíte 935/935 ao fim do lote; mutação à mão em `Chamado.FecharPorInatividade` e em `FecharResolvidos` pega no container; ver notas-build.md, Lote D). Settled mid-build: tarefa `trecho` na fatia `Assistente` (`Assistente.IndexarTrechos`, plano B7, E10); ordem das tarefas por `AddIndexacaoDeTrechos` e `AddEnvioDePush` (plano B8). Abandoned: nenhum item.
- Lote D, S7: Boundary `6e225a2` (C80-C89: suíte 935/935 ao fim do lote; `dotnet build One.slnx` sem erros; ver notas-build.md, Lote D). Settled mid-build: `AddPersistencia` registra também `Prazos`, `EnviadorSmtp`, `Agendador` e o `IHostedService`; `Sessao.cs` virou `Acesso/CookieDeSessao.cs` (renomeação do E9). Abandoned: nenhum item.

## Emendas aprovadas

Aprovadas pelo humano em 2026-11-13: "ok aplique". Checks aprovados só mudam por aprovação humana; cada linha registra o que mudou.

| Emenda | Check | Antes | Depois | Motivo |
| --- | --- | --- | --- | --- |
| E1 | C2 (e a linha do C97 que reusa o modo) | `provas.ps1 retratos` fazia `git diff` do diretório `Retratos/` inteiro | o modo compara só `rotas`, `erros`, `sucessos`, `gravacoes` e `importacao` (.txt) contra a base; os goldens `provedor`, `servicos` e `instituicao-publica` são provados por C5-C7, C20 e C21 | os 3 goldens novos nascem na S1 e fazem o diretório diferir da base por construção |
| E2 | C27 | `lista-sem` e `lista-contem` casavam por `-like "*nome*"`; `Usuario` casava com `UsuarioPapel` | igualdade exata do nome, aceitando para métodos o sufixo qualificado (`-eq $n -or -like "*.$n"`); `UsuarioPapel` continua na lista de 10 | a prova escrita não fechava (notas-build.md, item 6) |
| E3 | C32, C33 | `ENCERRADA`, `RESOLVIDA` | `ENCERRADA_PELO_ALUNO`, `RESOLVIDA_AUTOATENDIMENTO` | são os valores de `One.Api/Dados/Conversas/Desfechos.cs` |
| E4 | C11 | "aluno responde ... continua `AGUARDANDO_ALUNO`" | dois casos: `AguardandoDesde` renovado pela equipe continua `AGUARDANDO_ALUNO`; aluno responde pela rota fica `EM_ATENDIMENTO`; `Proof:` lista os dois testes; fechada em 2026-11-13 ("siga o que for recomendado"): o teste fica como está e o texto passa a dizer que a prova é o comportamento observável mais a mutação prazo+estado juntos (2 de 2), e que remover só `c.Estado == AguardandoAluno` é mutante equivalente (`Chamado.Mudar` zera `AguardandoDesde`), não alcançável pela rota e não prometido | responder pela rota tira o chamado de `AGUARDANDO_ALUNO` (notas-build.md, item 4); a mutação só do estado não pode ser morta por nenhum teste |
| E5 | C20, C81 | golden de serviços "igual ao da base" | igualdade exata com `golden - Removidas + Adicionadas`; `Removidas` = `Singleton One.Api.Email -> One.Api.Email`; `Adicionadas` = 9 linhas `Singleton One.Api.ITarefaAgendada -> One.Api.<Fatia>.<Tarefa>` (lista literal no C20) mais `Singleton One.Api.EnviadorSmtp -> One.Api.EnviadorSmtp`; listas do teste vazias até a S6/S7; fechada em 2026-11-13 ("siga o que for recomendado") | o plano (AC 41, AC 52) cria as 9 tarefas e troca `Email` por `EnviadorSmtp`, então o golden da S1 não pode ficar igual depois da S6/S7; nomes das classes e fatias fora do plano: decisão do builder da S6, verificar |
| E6 | C54, AC 28, plano (Impact e Assumptions) | `Reclassificar` entre os métodos a reduzir; 8 ofensores a sair da lista | AC 28 e C54 citam só `Abrir`, `Rejeitar`, `Subir` e `Encaminhar`; os outros 4 ofensores (`ResponderComoEquipe`, `TokenMcp.Criar`, `PlataformaMoodle.Configurar`, `SubscricaoPush.Registrar`) são exceção permanente, lista fixa de 4 (igualdade exata), motivo "cadastro de uso único, record não paga" | `Chamado.Reclassificar` já tem 5 parâmetros na base e não é ofensor |

E4 e E5 fechadas em 2026-11-13 por delegação do humano ("siga o que for recomendado"); detalhes em notas-build.md.

Aprovadas pelo humano em 2026-11-13: "pode aplicar e seguir".

| Emenda | Check | Antes | Depois | Motivo |
| --- | --- | --- | --- | --- |
| E7 | C47 | "(5 casos)" | "(6 casos)"; asserção e prova iguais | o texto enumera 6 saídas (`resposta`, `sem_base`, `pergunta`, `sem_base` com `pergunta_invalida`, `transferir`, `sem_base` sem motivo), conferidas contra o AC 22 e `ConferirRespostaTests.Classificar_cada_tipo` (6 cenários) |
| E8 | C52 | "no máximo 4 consultas (hoje 9 a 10)", provado só no cenário simples | tabela de limites por papel e cenário (simples, citação, fluxo, os dois), com a base `683e6a6` ao lado; teoria `Montar_consultas_por_cenario` acrescentada; `Montar_faz_no_maximo_4_consultas` intacto | medido: com citação ou fluxo o atendente passa de 4 (7, 6 e 9), sempre abaixo da base (14, 18 e 18); a base também não fazia 9 a 10 (media 14 no simples) |

Aprovadas pelo humano em 2026-11-13: "Sim autorizo" (E9-E14, Lote D).

| Emenda | Check | Antes | Depois | Motivo |
| --- | --- | --- | --- | --- |
| E9 | C103 (prova `listas-encolhem`) | a prova rejeitava item novo na lista (`-notcontains` por nome) | a prova compara o tamanho de cada lista com o da S1 (nunca cresce) e aceita item novo só com a renomeação listada nesta seção, no formato `Renomeacao permitida (listas-encolhem): <Regra>: <antigo> -> <novo>` (antigo na lista da S1 e fora da atual); acrescentar item novo continua falhando | o C83 manda `Validar` sair de `Sessao.cs` para `Acesso/CookieDeSessao.cs` (usa `GetRequiredService<OneDb>`); a lista manteve 2 itens e a prova por nome falhava |
| E10 | C20, C81 | `Singleton One.Api.ITarefaAgendada -> One.Api.Conhecimento.IndexarTrechos` | `Singleton One.Api.ITarefaAgendada -> One.Api.Assistente.IndexarTrechos` | `Embeddings` mora em `Assistente`; `Conhecimento` usar `Assistente` cria o inverso de `Assistente>Conhecimento`, par proibido pelos AC 27 e AC 68 (plano B7); conferido contra `ServicosTests` (linha 23) |
| E11 | C71 | "os 8 `Tipo`"; "registrada em `Add<Fatia>`" | 9 classes (os 8 `Tipo` da base na ordem mais `ApagarLancamentos` com `Tipo` `lancamento`); registro em `AddAcesso`, `AddAssistente`, `AddChamados`, `AddIndexacaoDeTrechos` e `AddEnvioDePush` | `AgendadorTarefasTests.Tarefas_registradas_na_ordem_da_base` afirma as 9 classes e os 8 tipos da base; a ordem do AC 41 pede as 2 extensões extras (plano B8) |
| E12 | AC 49 (plan.md); nenhum check cita a contagem | "the four infrastructure extensions" | as 4 de infraestrutura (`AddPersistencia`, `AddArmazenamento`, `AddSeguranca`, `AddTratamentoDeErros`) mais `AddIndexacaoDeTrechos` e `AddEnvioDePush`: 6 extensões que não são `Add<Fatia>` no `Program.cs` | conferido em `Program.cs`; as 2 extras existem para a ordem das tarefas (B8); C80 e C89 não mudam (o C89 conta 16 declarações `Add`/`Map` das 8 fatias) |
| E13 | C74, C75 | nomes do `Proof:` | sem mudança de texto: os nomes já são os reais (`ChamadoAgendadorDominioTests` 3 métodos; `AgendadorConcorrenciaTests.Conflito_de_xmin_nao_muda_nada_e_nao_registra_erro` e `Recusa_do_dominio_nao_muda_nada_e_nao_registra_erro`); provado por `provas.ps1 nomes` | o builder da S6 escreveu os testes a partir do texto dos checks |
| E14 | `## Handoff` | sem `Boundary` de S6 e S7 | `Boundary` `d1e099b` (S6) e `6e225a2` (S7) | o builder não podia editar o `checks.md`; hashes conferidos com `git log` |

Renomeacao permitida (listas-encolhem): Service_locator_so_na_composicao: Sessao.cs -> Acesso/CookieDeSessao.cs