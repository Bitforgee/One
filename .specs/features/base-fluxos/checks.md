# base-fluxos checks

Profile: standard
Plan: `.specs/features/base-fluxos/plan.md`

24 checks em 4 slices · 0 one-way doors · 0 perguntas abertas (plano aprovado pelo usuário em 08/11: "aprovado")

**Como as provas rodam.** Todos os comandos rodam na raiz `D:\one-system`, salvo `--prefix web`. A API usa `docker compose up -d postgres mailpit minio` e uma execução de `dotnet test` por vez. Cada filtro `--filter "FullyQualifiedName~<Classe>.<Método>"` precisa executar pelo menos 1 teste (L-002), e o nome na linha `Proof:` é o contrato (L-022).

Arquivos de teste novos: `LiderSemVazamentoTests`, `ReclassificarSaiDoFluxoTests` e `SetorEmFluxoTests` em `One.Api.Tests/`; `web/src/administracao/setorEmFluxo.test.tsx` e `web/src/indicadores/lideranca.test.tsx`. Os cenários reusam `Turma` e `Cadeia` (`One.Api.Tests/Infra/`) e `f.Atendente`, `f.Artigo` e `Balcao`, os mesmos de `LiderVisaoTests` e `FluxoPrazoTests`. Nada de dado real: CPF, nome e matrícula vêm de `Semente` (LGPD).

**Ordem de trabalho (AGENTS.md e prompt-evolucao-one).** Os testes de S1, S2 e S3 são escritos primeiro, a partir destes checks, e vistos **falhar** no `HEAD` `702765c` antes de qualquer correção; a saída da falha vai para o `## Handoff`.

**Textos fixos** (viram constantes e entram no retrato de textos se `ArquiteturaTests.Literais_gravados_so_nas_constantes` pedir):
- artigo: `Versão de artigo não encontrada.`; documento: `Documento não encontrado.` (os que existem hoje)
- indicadores: `Os indicadores não estão disponíveis para a liderança de turma.`
- setor em fluxo: `O setor é usado em fluxo publicado (categoria: {nomes em ordem alfabética, separados por "; "}). Publique o fluxo sem ele antes de desativar.`

**Asserções existentes que mudam:** nenhuma é esperada. As 4 rotas só ganham uma recusa nova para um perfil que nenhum teste atual usa. Se `RetratoTests` ou outro teste do `HEAD` falhar por causa do E0, é para parar e perguntar, não para editar a asserção.

## Checks

### S1 - o líder de turma não lê o que é só da equipe (P1) · 5 arquivos · ~34 KB · ~9k

**C1** - Um usuário com `ATENDENTE` apenas num setor de liderança recebe 404 com o detalhe `Versão de artigo não encontrada.` em `GET /api/artigos/versoes/{id}` de uma versão que existe (AC 1)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderSemVazamentoTests.Lider_nao_le_versao_de_artigo"`

**C2** - O mesmo usuário recebe 404 com o detalhe `Documento não encontrado.` em `GET /api/documentos/versoes/{id}` de uma versão que existe (AC 2)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderSemVazamentoTests.Lider_nao_baixa_versao_de_documento"`

**C3** - O mesmo usuário recebe 403 com o detalhe `Os indicadores não estão disponíveis para a liderança de turma.` em `GET /api/indicadores?de=2026-11-01&ate=2026-11-08` (AC 3)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderSemVazamentoTests.Lider_nao_consulta_indicadores"`

**C4** - Para os quatro perfis administrador, atendente de setor comum, atendente de uma liderança e de um setor comum, e atendente sem nenhum setor, as três rotas respondem 200 com os dados de hoje (artigo: `titulo`; documento: `application/pdf`; indicadores: `chamadosAbertos`) (AC 4, AC 5)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderSemVazamentoTests.Quem_nao_e_so_lider_segue_como_hoje"`

**C5** - O líder segue entrando no grupo de fila do próprio setor: `EntrarNaFila` do atendente só de liderança coloca a conexão em `TempoRealGrupos.Fila(instituicao, setorDaLideranca)` (AC 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderSemVazamentoTests.Lider_entra_na_fila_do_proprio_setor"`

**C6** - O líder segue vendo a fila da turma: `GET /api/chamados?escopo=fila` do atendente só de liderança lista o chamado aberto na liderança (200, 1 item) (AC 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderSemVazamentoTests.Lider_segue_vendo_a_fila_da_turma"`

**C7** - Na tela Indicadores, uma resposta 403 com o detalhe `Os indicadores não estão disponíveis para a liderança de turma.` aparece no alerta da tela e não deixa a página em branco (AC 3; screen Indicadores, unauthorised state)
Proof: `npm --prefix web test -- --run src/indicadores/lideranca.test.tsx -t "403 da liderança aparece no alerta"`

### S2 - o chamado reclassificado sai do fluxo (P1) · 3 arquivos · ~38 KB · ~10k

**C8** - Reclassificar um chamado que está na etapa 1 de um fluxo grava a categoria nova e deixa `etapa_ordem` e `etapa_desde` nulos, mantendo `setor_id`, o estado e `versao_fluxo_id`, e grava exatamente 1 evento `RECLASSIFICACAO` com `de` e `para` os nomes das categorias (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ReclassificarSaiDoFluxoTests.Reclassificar_no_fluxo_sai_da_etapa_e_fica_no_setor"`

**C9** - Reclassificar um chamado que já está fora de fluxo (3 colunas nulas) grava a categoria e o evento `RECLASSIFICACAO` e não muda mais nenhum campo do fluxo (AC 8)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ReclassificarSaiDoFluxoTests.Reclassificar_fora_de_fluxo_so_troca_a_categoria"`

**C10** - Depois da reclassificação, o detalhe da equipe devolve `fluxo` nulo e `acoes` sem `subir`, e `POST /api/chamados/{numero}/subir` responde 409 (AC 9)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ReclassificarSaiDoFluxoTests.Reclassificado_nao_tem_subir_nem_fluxo"`

**C11** - Um chamado reclassificado em uma etapa com prazo de 48 h, com a entrada recuada em 49 h no banco, continua no mesmo setor depois de `Agendador.Executar()`, e um segundo chamado não reclassificado na mesma situação sobe para a etapa 2 (AC 9)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ReclassificarSaiDoFluxoTests.Agendador_nao_sobe_o_reclassificado"`

**C12** - Reclassificar para uma categoria inativa e para um id inexistente responde 400 com o campo `categoriaId` e deixa `etapa_ordem`, `etapa_desde` e a categoria como estavam (AC 10)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ReclassificarSaiDoFluxoTests.Categoria_invalida_400_e_fluxo_intacto"`

**C13** - A transição de domínio `Chamado.Reclassificar` num chamado com `EtapaOrdem` 2 zera `EtapaOrdem` e `EtapaDesde`, mantém `VersaoFluxoId` e `SetorId` e acrescenta 1 evento `RECLASSIFICACAO` (AC 7; nível de entidade, sem banco)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ChamadoDominioTests.Reclassificar_em_fluxo_sai_da_etapa"`

### S3 - não desativar um setor que um fluxo publicado usa (P2) · 4 arquivos · ~30 KB · ~8k

**C14** - Com o setor "Financeiro" como destino da versão vigente de dois fluxos (categorias "Boletos" e "Estágio", abrangências de todos os cursos e de ADS), `PUT /api/admin/setores/{id}` com `ativo: false` responde 409 com o detalhe literal `O setor é usado em fluxo publicado (categoria: Boletos; Estágio). Publique o fluxo sem ele antes de desativar.` e o setor continua `ativo` no banco (AC 11)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~SetorEmFluxoTests.Setor_em_fluxo_publicado_nao_desativa"`

**C15** - Um setor que só aparece num rascunho, ou só numa versão que já não é a vigente (v1 usava, v2 publicada não usa), é desativado com 200 (AC 12)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~SetorEmFluxoTests.Setor_so_em_rascunho_ou_versao_antiga_desativa"`

**C16** - Reativar um setor inativo e renomear um setor ativo que está em fluxo publicado respondem 200 e gravam (AC 13)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~SetorEmFluxoTests.Renomear_e_reativar_seguem_como_hoje"`

**C17** - Um setor de outra instituição com o mesmo nome em fluxo publicado dela não bloqueia a desativação do setor da instituição atual (200) (AC 11; AD-008)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~SetorEmFluxoTests.Fluxo_de_outra_instituicao_nao_bloqueia"`

**C18** - Em Cadastros > Setores, uma resposta 409 do `PUT /api/admin/setores/1` mostra o detalhe `O setor é usado em fluxo publicado (categoria: Boletos). Publique o fluxo sem ele antes de desativar.` no alerta do editor e mantém o editor aberto (AC 11; screen Cadastros, error state)
Proof: `npm --prefix web test -- --run src/administracao/setorEmFluxo.test.tsx -t "409 do setor aparece no editor"`

**C22** - `PUT /api/admin/setores/{id}` segue respondendo 400 para a Triagem tirada ou duplicada, e responde 404 para um id que não existe e para o setor de outra instituição (AC 13; regressão das recusas vizinhas)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~AdminTests.Triagem_zero_ou_duas_400"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~SetorEmFluxoTests.Setor_inexistente_ou_alheio_404"`

### Regressões das rotas vizinhas (provas que já existem; a lista é fechada)

**C23** - `GET /api/indicadores` segue respondendo 400 para `de` depois de `ate`, 403 para o aluno e 200 só com os setores do atendente (AC 4)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~IndicadoresTests.De_depois_de_ate_400"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~IndicadoresTests.Aluno_403"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~IndicadoresTests.Atendente_ve_so_seus_setores"`

**C24** - `POST /api/chamados/{numero}/reclassificar` segue respondendo 403 por papel, 404 para o chamado de outro setor e 409 por estado (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~VisibilidadeTests.Matriz_acao_papel"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~VisibilidadeTests.Atendente_de_outro_setor_404"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~VisibilidadeTests.Matriz_acao_estado"`

### S4 - fluxos-atendimento fecha com contas feitas (P1) · só artefatos e comandos · ~4k

**C19** - No `HEAD` do E0, `dotnet build One.slnx`, `dotnet test One.Api.Tests`, `npm --prefix web test -- --run` e `npm --prefix web run build` saem com 0 (AC 14)
Proof: `dotnet build One.slnx`
Proof: `dotnet test One.Api.Tests`
Proof: `npm --prefix web test -- --run`
Proof: `npm --prefix web run build`

**C20** - O comando do C106 de `fluxos-atendimento` lista só specs que usam `e2e/simulada.ts` (nenhum de `anexos.spec.ts` e `plataforma.spec.ts`) e sai com 0, e os dois reais saem com 0 contra a imagem própria em `:8089` (AC 15)
Proof: `node -e "const s=require('fs').readFileSync('.specs/features/fluxos-atendimento/checks.md','utf8');const c=s.split('**C106**')[1];if(/anexos\.spec|plataforma\.spec/.test(c.split('Proof:')[1].split('\n')[0]))process.exit(1)"`
Proof: `npm --prefix web run e2e` (specs simulados, com o `vite preview` em :5199 e `E2E_URL=http://localhost:5199`)

**C21** - O relatório `.specs/features/fluxos-atendimento/verification.md` da rodada 2 cobre cada check da lista emendada (sem C42, C70, C71, C72 do AD-042) com `PASS` ou `FAIL` e evidência, e `validate_verification.py fluxos-atendimento` sai com 0, ou um AD no `STATE.md` registra o risco aceito do C104 (`crapper` bloqueado) (AC 16)
Proof: `python "C:\Users\Alfredo Neto\.kiro\skills\tlc-spec-lean\scripts\validate_verification.py" fluxos-atendimento --root D:\one-system`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| rotas que o plano reviu (5) | `GET /api/artigos/versoes/{id}` C1, C4 · `GET /api/documentos/versoes/{id}` C2, C4 · `GET /api/indicadores` C3, C4, C7 · `PUT /api/admin/setores/{id}` C14, C15, C16, C17, C18 · `POST /api/chamados/{numero}/reclassificar` C8, C9, C12 | - |
| statuses de `GET /api/artigos/versoes/{id}` (2) | 200 C4 · 404 C1 | - |
| statuses de `GET /api/documentos/versoes/{id}` (2) | 200 C4 · 404 C2 | - |
| statuses de `GET /api/indicadores` (3) | 200 C4 · 400 C23 · 403 C3 | - |
| statuses de `PUT /api/admin/setores/{id}` (4) | 200 C15 · 400 C22 · 404 C22 · 409 C14 | - |
| statuses de `POST /api/chamados/{numero}/reclassificar` (5) | 200 C8 · 400 C12 · 403 C24 · 404 C24 · 409 C24 | - |
| perfis em cada uma das 3 rotas de S1 (4) | administrador C4 · atendente de setor comum C4 · atendente de liderança e setor comum C4 · atendente sem setor C4 (cada um nas 3 rotas, table-driven) | - |
| quem é "só liderança" (3 casos) | todos os setores são liderança C1, C2, C3 · liderança e setor comum C4 · nenhum setor C4 | - |
| estados do chamado ao reclassificar (2 que o plano separa) | em etapa de fluxo C8, C13 · fora de fluxo C9 | - |
| efeitos de sair do fluxo (4) | `acoes` sem `subir` C10 · `fluxo` nulo C10 · `POST /subir` 409 C10 · `Agendador` não sobe C11 | - |
| onde um setor pode estar para desativar (4) | versão vigente C14 · só rascunho C15 · versão antiga C15 · outra instituição C17 | - |
| startup config (0 assemblies) | nenhuma chave nova; só o `OneFactory` já usado | - |

- Claims que nomeiam status, rota ou forma de resposta: C1, C2, C3, C10, C12, C14, C18 - cada um tem uma prova que cruza a rota HTTP (ou a tela com o mesmo corpo).
- Nenhum outro check afirma mais do que o caso único que a prova exercita.

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide, atravessa a rota HTTP (`VerVersaoArtigoHandler`, `BaixarVersaoDocumentoHandler`, `ConsultarIndicadoresHandler`, `AlterarSetorHandler`, `ReclassificarChamadoHandler`) | uma na rota **e** uma no `Chamado` para a transição | cada status da `Surface`, cada perfil da tabela, cada lugar onde o setor pode estar |
| Decide, sem atravessar a rota (`Chamado.Reclassificar`, a regra "só liderança") | uma na própria camada | uma linha por linha da tabela (em etapa, fora de fluxo; os 3 casos de "só liderança") |
| Tela que só mostra o `detail` (`Indicadores`, editor de Cadastros) | uma por tela | o corpo 403/409 aparece no alerta |
| Instrumentation | nenhuma própria | coberta pelo consumidor |

Evidence:

- `Chamado.Reclassificar` (`Chamado.cs:157`): 2 ramos depois da mudança (em etapa, fora de fluxo) e 1 `Exigir` -> decide; o precedente é `ChamadoDominioTests` linha 72 (`15 Reclassificar RESOLVIDO`), que já prova a transição pelo nível de entidade.
- `VerVersaoArtigoHandler`, `BaixarVersaoDocumentoHandler` e `ConsultarIndicadoresHandler`: 1 condição de papel cada, que passa a ter um terceiro ramo -> decidem; os 404/403 existentes são provados na rota (`DocumentoTests.cs:407`, `IndicadoresTests.cs:191`).
- `CriarSetor.Validar` (`CriarSetor.cs:16`): 3 ramos de recusa hoje e mais 1 -> decide; o precedente é `LiderancaSetorTests` (`Uma_lideranca_ativa_por_turma_409`), que prova um 409 do mesmo método pela rota.
- Ligação do `detail` na tela: `ErroDe` já usada pelo `Editor` e pelos Indicadores; só os dois casos novos precisam de prova.

Cost: 5 provas de rota, 1 de entidade e 2 de tela, em 5 arquivos de teste novos. Sem estas linhas, o ramo "só liderança" seria provado só por um caminho que passa por ele.

## Swept

- validation: C12 (categoria inativa/inexistente), C14 (o texto literal do 409); S1 não aceita entrada nova
- failure modes: C12 (nada gravado quando a categoria é inválida), C14 (o setor continua ativo quando recusa); a reclassificação é uma única transação do `ReclassificarChamadoHandler`
- idempotency: C9 (reclassificar de novo um chamado que já saiu do fluxo só troca a categoria, sem efeito extra); repetir a recusa de C14 devolve o mesmo 409
- authorization: C1, C2, C3, C4 (os quatro perfis); C17 (isolamento por instituição, AD-008); a área `/api/admin` segue só para administradores, provada por `RetratoTests.Admin_403_com_detail_em_toda_rota_admin`
- concurrency: n/a - uma desativação que corre com uma publicação deixa o fluxo como hoje: a etapa é pulada (`SetorInativo`), sem perda nem duplicação de dado; o E1 trata a saúde do fluxo
- data lifecycle: n/a - nenhuma coluna nem linha nova; setores que já estão inativos em fluxo publicado ficam como estão, e o plano os deixa fora de escopo
- dependency failure: n/a - nenhuma chamada externa nova; as quatro rotas só leem o banco
- state transitions: C8, C9, C13 (em etapa e fora de fluxo), C10 e C11 (o que o estado "fora do fluxo" implica)
- observability: n/a - nenhum requisito de log; as recusas viram ProblemDetails e o evento `RECLASSIFICACAO` já existe no histórico

## Out of scope

- Perfil próprio de líder e retirar `ATENDENTE` dele - E4/E5.
- Reavaliar o fluxo da nova categoria ao reclassificar - E1.
- Aviso de "saúde do fluxo" e setores que já estão inativos em fluxo publicado - E1.
- Esconder o link "Indicadores" do menu para o líder: o menu usa só `papeis` de `/api/auth/me`, e esconder pede um dado novo ali; o E0 mostra a recusa na tela (C7). O E5 resolve o menu pelas permissões.
- Fluxo padrão, calendário, aviso de etapa, mandato do líder e perfis - E1, E4, E5, E6, E7.

## Handoff

Estimativa, depois dos checks e antes do código. Tamanho dos arquivos que o E0 toca, de `Get-Item`: 12 arquivos existentes somam 101 974 bytes, ou 25 mil tokens (bytes ÷ 4); 5 testes novos, 3 em `One.Api.Tests/` e 2 em `web/`, somam cerca de 35 mil tokens escritos; mais as leituras de `Turma`, `Cadeia` e `Balcao` e os outputs dos comandos.

- S1 = 9k, em `Conhecimento/`, `Indicadores/` e um helper em `Dados/Usuarios/`
- S2 = 10k, em `Dados/Chamados/` e `Chamados/`
- S3 = 8k, em `Administracao/`
- S4 = 4k, em artefatos e comandos
- Total ≈ 31k de trabalho de código, e ≈ 85k contando leituras e saídas, abaixo do orçamento de 150k do `AGENTS.md` -> um construtor (S1-S3 em sequência; S4 depois)
- Mecanismo: um construtor, sem pergunta (a estimativa cabe).
- Modelos por fase: Build com o Sonnet 5.5; o Verificador roda num agente novo, sem o contexto de quem construiu (AGENTS.md).

Antes do primeiro commit de código:
1. Atualizar o `## Handoff` do `STATE.md`: a branch é a `main` (AD-043), não `feature/fluxos-atendimento`.
2. Emendar o `fluxos-atendimento/checks.md`: o comando do C106 e os checks C42, C70, C71 e C72 (AD-042); o cabeçalho de 96 para 106 checks. O usuário aprovou o C106 em 08/11; as emendas do AD-042 ainda pedem revisão da outra pessoa do par.
