# Fluxos de atendimento configuráveis - checks

Profile: ui
Plan: `.specs/features/fluxos-atendimento/plan.md`

96 checks em 6 slices · 10 one-way doors · 2 perguntas abertas, das quais 1 bloqueia o go-live (plano aprovado pelo usuário em 08/11: "aprovo pode continuar")

**Como as provas rodam.** Todos os comandos rodam na raiz `D:\one-system`, salvo `cd web &&`. `<base>` é o commit que congela `plan.md` e este `checks.md`, gravado em `## Handoff`.

| Camada | Ferramenta | Antes de rodar |
| --- | --- | --- |
| API, rota HTTP e banco | xUnit v3 com `OneFactory`: `dotnet test One.Api.Tests --filter "FullyQualifiedName~<Classe>.<Método>"` | `docker compose up -d postgres mailpit minio`; uma execução de `dotnet test` por vez |
| API, domínio sem banco | xUnit v3 sem banco (`ArquiteturaTests.Testes_de_regra_sem_banco`) | nada |
| `web/` unidade | Vitest (jsdom): `cd web && npx vitest run <arquivo> -t "<nome>"` | nada; o canvas pede as simulações de `ResizeObserver` e `DOMMatrixReadOnly` em `web/src/test/setup.ts` |
| `web/` arranjo, arrastar e teclado | Playwright com a API simulada (`e2e/simulada.ts`): `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/fluxos.spec.ts -g "<nome>"` | `npm --prefix web run build`; `npx vite preview --port 5199 --strictPort` em `web/` |
| `web/` e2e real | Playwright contra uma imagem própria do `HEAD` na porta 8089, com banco, bucket e instituição próprios, no padrão de `identidade-visual`; limite de 5 logins por minuto (L-066) | imagem própria |
| barreiras | `dotnet build One.slnx` (CA1502, AD-018), `crapper` e `dryer` em `web/`; mutação suspensa (AD-025) | `npm --prefix web run coverage` |

Arquivos de teste novos: `FluxoMigracaoTests`, `FluxoModeloTests`, `FluxoDominioTests`, `FluxoRoteamentoTests`, `FluxoAdminTests`, `FluxoSimulacaoTests`, `FluxoSubirTests`, `FluxoPrazoTests`, `FluxoRastroTests`, `LiderancaSetorTests`, `LiderancaDestinoTests` e `LiderVisaoTests` em `One.Api.Tests/`; `src/administracao/fluxos.test.tsx`, `src/administracao/canvas.test.tsx`, `src/assistente/lideranca.test.tsx`, `e2e/fluxos.spec.ts`, `e2e/fluxos-real.spec.ts` e `web/scripts/entrada-sem-canvas.mjs` em `web/`.

O arrastar de um tipo da paleta para o canvas e o teclado do canvas não se provam no jsdom, porque o React Flow depende de medidas reais; por isso essas provas são Playwright. O nome numa linha `Proof:` é o contrato (L-022), e cada filtro precisa executar pelo menos 1 teste (L-002). Os números de linhas, rotas e colunas citados abaixo saem do código no momento da escrita do teste (L-021); onde um número não está escrito aqui, o teste o calcula.

**Rótulos fixos das etapas** (usados na lista, no canvas, no simulador e no Detalhe): `Setor {nome}`, `Coordenação do curso`, `Liderança do semestre`; com prazo, ` ({N} h)` logo depois. A cadeia se escreve com ` → `. A abrangência se escreve `Todos os cursos`, `{curso}` ou `{curso}, {N}º semestre`.

**Frases novas do Histórico:** com autor, `{ator} subiu o chamado de {de} para {para}`; sem autor, `O chamado subiu de {de} para {para}. {detalhe}` (por exemplo `... Sem resposta em 48 horas`).

**Asserções existentes que mudam** (lista fechada; cada edição só leva a asserção ao que o plano decidiu e fica no `## Handoff` com o AC que a força):
1. `ArquiteturaTests.Nove_acoes_do_chamado` (hoje: 9 tipos que implementam `IAcaoChamado` e 10 nomes em `PermissoesChamado`): vira `Dez_acoes_do_chamado`, com 10 tipos e 11 nomes, o novo sendo `subir` (door 8, AC 35).
2. `ArquiteturaTests.Literais_gravados_so_nas_constantes`: ganha os textos `SETOR`, `COORDENACAO_CURSO`, `LIDERANCA_SEMESTRE` e `SUBIDA` como constantes (door 3, door 8).
3. `RetratoTests.Tabela_de_rotas_igual_a_da_base` e `Admin_403_com_detail_nas_29_rotas`: saem as 3 rotas de `/api/admin/regras`, entram as novas da `Surface`; o segundo passa a varrer toda rota `/api/admin` da tabela (AC 11).
4. `RetratoTests.Corpos_de_sucesso_iguais_aos_da_base` e `Retratos/*.txt`: o retrato ganha só `fluxo` no detalhe e `cursoId`/`semestre` no setor, e perde só as linhas de `regras`.
5. `AdminTests` e demais testes de API das rotas de regras, `CargaValidacaoTests` e `InstituicaoComandoTests`: as regras de roteamento passam a ser conferidas como fluxo de uma etapa (AC 1, AC 9).
6. `web/src/administracao/cadastros.test.tsx`, `admin.test.tsx`, `textos.test.tsx` e `src/test/estrutura.test.ts`: a aba `Regras` vira `Fluxos`; a regra de import de pacote ganha `@xyflow/react` só em `web/src/administracao/` (AC 31, door 10).
7. `e2e/simulada.ts`: ganha as rotas `/api/admin/fluxos*`, `GET /destino` e `POST /subir`.

Uma edição fora da lista, forçada por um AC, é permitida só se trocar localizador ou seguir o arranjo novo sem baixar nenhum limite. Baixar um limite ou apagar uma asserção fora da lista é parar e perguntar.

## Checks

### S1 - o fluxo substitui a regra sem mudar o comportamento (P1) · ~14 arquivos · ~190 KB · ~48k

**C1** - [x] A migration converte cada `regra_roteamento` num fluxo para todos os cursos (`curso_id` e `semestre` nulos) com a versão 1 publicada e uma etapa de ordem 1 com o mesmo `destino` e `setor_id`; duas regras (`SETOR` no setor 2 e `COORDENACAO_CURSO`) viram dois fluxos (AC 1, door 4)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoMigracaoTests.Regra_vira_fluxo_de_todos_os_cursos_com_uma_etapa"`

**C2** - [x] Depois da migration, os chamados existentes ficam com `versao_fluxo_id`, `etapa_ordem` e `etapa_desde` nulos, e a tabela `regra_roteamento` não existe (AC 2, door 4)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoMigracaoTests.Chamados_antigos_ficam_fora_de_fluxo_e_a_tabela_some"`

**C3** - [x] Com os fluxos publicados de todos os cursos, de ADS e de ADS no 3º semestre, um aluno de ADS 3º usa o do semestre, um de ADS 5º usa o do curso e um de Direito usa o de todos os cursos (AC 3)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoRoteamentoTests.Fluxo_mais_especifico_vence"`

**C4** - [x] O chamado aberto por um fluxo grava `versao_fluxo_id` da versão publicada, `etapa_ordem` 1 e `etapa_desde` igual ao relógio falso (AC 3)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoRoteamentoTests.Chamado_guarda_versao_etapa_e_entrada"`

**C5** - [x] Um fluxo mais específico que só tem rascunho é ignorado, e o chamado usa o fluxo menos específico (AC 4)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoRoteamentoTests.Fluxo_so_com_rascunho_e_ignorado"`

**C6** - [x] Sem fluxo publicado na categoria, e na categoria padrão, o chamado abre na Triagem com as três colunas nulas (AC 5)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoRoteamentoTests.Sem_fluxo_publicado_vai_para_a_triagem"`

**C7** - [x] Uma etapa `COORDENACAO_CURSO` abre o chamado no `SetorCoordenacaoId` do curso da matrícula escolhida pelo aluno (AC 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoRoteamentoTests.Coordenacao_do_curso_da_matricula"`

**C8** - [x] Se a etapa não resolve (curso sem coordenação), o chamado abre na etapa seguinte que resolve; se nenhuma resolve, abre na Triagem com `etapa_ordem` nulo (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoRoteamentoTests.Etapa_que_nao_resolve_passa_para_a_seguinte"`

**C9** - [x] `POST /api/atendimento-direto` abre o chamado na Triagem, sem fluxo e sem liderança (AC 8)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~TransferenciaTests.Atendimento_direto_sem_fluxo_na_triagem"`

**C10** - [x] A carga JSON com `regras` cria um fluxo para todos os cursos por regra, com a versão 1 publicada e uma etapa, e responde as mesmas contagens de antes (AC 9)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CargaValidacaoTests.Regra_da_carga_vira_fluxo_de_uma_etapa"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~InstituicaoComandoTests.Carga_continua_com_a_mesma_saida"`

**C11** - [x] A carga JSON que repete uma categoria que já tem fluxo para todos os cursos é recusada com o erro `regras[i].categoria: "X" já tem regra` (AC 10)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~CargaValidacaoTests.Categoria_com_fluxo_ja_tem_regra"`

**C12** - [x] A tabela de rotas não tem `GET`, `POST` nem `PUT` em `/api/admin/regras` (AC 11)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano"`

**C13** - [x] O banco impõe o modelo do fluxo: `UNIQUE NULLS NOT DISTINCT (instituicao_id, categoria_id, curso_id, semestre)`, `CHECK` de semestre com curso e de 1 a 12, `UNIQUE (fluxo_id, numero)`, índice parcial `ux_versao_rascunho`, `UNIQUE (versao_fluxo_id, ordem)`, `CHECK` de ordem de 1 a 5, de prazo de 1 a 720 e de `pos_x`/`pos_y` juntos (door 1)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoModeloTests.Constraints_e_indices_da_door_1"`

**C14** - [x] O banco impõe as colunas do chamado (`versao_fluxo_id`, `etapa_ordem`, `etapa_desde`, todas anuláveis) e do setor: `CHECK ((curso_id IS NULL) = (semestre IS NULL))`, `CHECK (semestre BETWEEN 1 AND 12)` e o índice `ux_setor_lideranca` parcial em `ativo` (door 2, door 5)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoModeloTests.Colunas_do_chamado_e_do_setor"`

**C15** - [x] `ResolverFluxo.Escolher` devolve, para as 8 combinações de existência do fluxo de curso e semestre, do curso e de todos os cursos (com e sem versão publicada em cada), o mais específico publicado, ou nenhum (AC 3, AC 4, door 9)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoDominioTests.Escolhe_o_fluxo_mais_especifico"`

**C16** - `ResolverFluxo.Etapa` devolve o setor ou a falta dele para cada tipo de destino (3) cruzado com setor fixo ativo ou inativo, curso com ou sem coordenação, e liderança disponível ou não (AC 6, AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoDominioTests.Resolve_cada_tipo_de_destino"`

### S2 - o gestor cria o fluxo, define a abrangência, simula e publica (P1) · ~12 arquivos · ~140 KB · ~35k

**C17** - [x] `POST /api/admin/fluxos` cria um fluxo sem versões e responde `201` com `categoriaId`, `cursoId` e `semestre` para as três abrangências: só categoria, categoria e curso, categoria, curso e semestre 3 (AC 12)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Cria_fluxo_nas_tres_abrangencias"`

**C18** - [x] `semestre` sem `cursoId` responde `400` com o campo `semestre`; `semestre` 0 e 13 respondem `400` em `semestre`, e 1 e 12 respondem `201` (AC 13, AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Semestre_so_com_curso_e_de_1_a_12"`

**C19** - [x] `cursoId` inexistente ou de outra instituição responde `400` com o campo `cursoId` (AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Curso_de_outra_instituicao_400"`

**C20** - [x] A categoria padrão e uma categoria inexistente respondem `400` com o campo `categoriaId` (AC 15)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Categoria_padrao_ou_inexistente_400"`

**C21** - [x] Um segundo fluxo com a mesma categoria, curso e semestre responde `409`, e duas criações simultâneas dão um `201` e um `409` (AC 16)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Abrangencia_repetida_409"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Criacao_simultanea_uma_so"`

**C22** - [x] `PUT /api/admin/fluxos/{id}/rascunho` com 3 etapas responde `200`, e um segundo `PUT` com 2 etapas deixa só as 2 (AC 17)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Rascunho_e_substituido_inteiro"`

**C23** - [x] O rascunho com 0 e com 6 etapas responde `400` no campo `etapas`, e com 1 e com 5 responde `200` (AC 18)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Etapas_de_1_a_5"`

**C24** - [x] Um `destino` fora de `SETOR`, `COORDENACAO_CURSO` e `LIDERANCA_SEMESTRE` responde `400` no campo `destino` (AC 19)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Destino_desconhecido_400"`

**C25** - [x] Uma etapa `SETOR` sem `setorId`, com setor inexistente, de outra instituição ou inativo responde `400` no campo `setorId` (AC 20)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Setor_da_etapa_invalido_400"`

**C26** - [x] Uma etapa `COORDENACAO_CURSO` ou `LIDERANCA_SEMESTRE` com `setorId` responde `400` no campo `setorId` (AC 21)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Setor_so_na_etapa_de_setor"`

**C27** - [x] `prazoHoras` 0 e 721 respondem `400` em `prazoHoras`, 1 e 720 respondem `200`, e `prazoHoras` na última etapa responde `400` (AC 22)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Prazo_de_1_a_720_e_nunca_na_ultima"`

**C28** - [x] `LIDERANCA_SEMESTRE` como segunda etapa e como única etapa respondem `400` em `destino`, e como primeira de duas responde `200` (AC 23, door 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Lideranca_so_na_primeira_e_nunca_a_ultima"`

**C29** - [x] Uma etapa com `x` e sem `y` responde `400` em `etapas`; com os dois, grava e devolve os dois valores no `GET` (AC 24, AC 75)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Posicao_x_y_juntas_e_devolvidas"`

**C30** - [x] Publicar cria a versão 1 e remove o rascunho; depois de editar de novo e publicar, cria a versão 2; as duas respondem `201` (AC 25)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Publicar_numera_e_remove_o_rascunho"`

**C31** - [x] Publicar sem rascunho responde `409`; publicar duas vezes ao mesmo tempo dá um `201` e um `409` (AC 26)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Publicar_sem_rascunho_409"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Publicacao_simultanea_uma_so"`

**C32** - [x] Depois de publicar a versão 2, a versão 1 continua com as mesmas etapas e um chamado aberto pela versão 1 continua apontando para ela, com `etapa_ordem` igual (AC 27)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Versao_antiga_e_chamado_nao_mudam"`

**C33** - [x] `DELETE /api/admin/fluxos/{id}/rascunho` responde `204` e mantém as versões publicadas; sem rascunho responde `404` (AC 28)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Descartar_rascunho"`

**C34** - [x] `POST /simular` para curso 4 e semestre 3 devolve cada etapa com `ordem`, `destino`, `setor` e `situacao`, `inicial` e `escolhido`, e as tabelas `chamado`, `fluxo`, `versao_fluxo` e `etapa_fluxo` ficam com a mesma contagem de linhas (AC 29)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSimulacaoTests.Simula_sem_gravar"`

**C35** - [x] Uma etapa que não resolve vem com `situacao: NAO_RESOLVIDA` e o motivo escrito: `Curso sem coordenação` ou `Sem liderança disponível` (AC 29)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSimulacaoTests.Etapa_nao_resolvida_com_motivo"`

**C36** - [x] Para 6 alunos diferentes, o `inicial` da simulação da versão vigente é o setor em que a transferência real abre o chamado do mesmo aluno (AC 30)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSimulacaoTests.Simulacao_igual_a_transferencia_real"`

**C37** - [x] A simulação e a transferência só chamam `ResolverFluxo`, e nenhum outro arquivo decide o setor por tipo de destino (AC 30)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Setor_so_pelo_ResolverFluxo"`

**C38** - [x] `POST /simular` com `semestre` 0 ou 13, ou `cursoId` inexistente, responde `400`; `PUT`, `DELETE`, `publicar` e `simular` de um fluxo que não existe, ou que é de outra instituição, respondem `404` (Surface)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Simular_400_e_id_desconhecido_404"`

**C39** - [x] `GET /api/admin/fluxos` responde `200` com `id`, `categoriaId`, `cursoId`, `semestre`, `vigente` e `rascunho`, cada versão com `numero` e `etapas`, e só os fluxos da instituição do admin (Surface)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoAdminTests.Lista_so_da_instituicao"`

**C40** - [x] Na aba Fluxos, uma linha mostra o nome da categoria e, em `Detalhe`, a abrangência e a cadeia: `Todos os cursos · Setor Financeiro` e `ADS, 3º semestre · Liderança do semestre → Coordenação do curso (48 h)` (AC 31)
Proof: `cd web && npx vitest run src/administracao/fluxos.test.tsx -t "lista com abrangência e cadeia"`

**C41** - [x] Ao criar, o formulário pede a categoria e oferece a abrangência como três opções: `Todos os cursos`, `Um curso` e `Um semestre de um curso`, e só então mostra o curso e o semestre (AC 32)
Proof: `cd web && npx vitest run src/administracao/fluxos.test.tsx -t "criar pede categoria e abrangência"`

**C42** - [x] Na edição, `Simular` pede curso, semestre e aceite; `Publicar` fica desligado enquanto a API devolve erro de validação do rascunho e liga quando o rascunho passa (AC 33)
Proof: `cd web && npx vitest run src/administracao/fluxos.test.tsx -t "simular e publicar"`

**C43** - [x] Sem nenhum fluxo, a aba mostra `Sem fluxo, os chamados vão para a Triagem.` e o botão `Novo` (AC 34)
Proof: `cd web && npx vitest run src/administracao/fluxos.test.tsx -t "estado vazio"`

### S3 - o chamado sobe de etapa (P1) · ~12 arquivos · ~170 KB · ~43k

**C44** - [x] `POST /api/chamados/{numero}/subir` com `motivo` num chamado `EM_ATENDIMENTO` da etapa 1 de 2 o move ao setor da etapa 2, grava `etapa_ordem` 2 e `etapa_desde` igual ao relógio, tira o responsável e deixa `ABERTO` (AC 35)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSubirTests.Sobe_para_a_etapa_seguinte"`

**C45** - [x] Ao subir, o histórico ganha um evento `SUBIDA` com os nomes dos setores em `de` e `para`, o motivo vira nota interna e `Encaminhamentos` continua 0 (AC 36, door 8)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSubirTests.Subida_nao_e_encaminhamento"`

**C46** - [x] `subir` responde `409` num chamado fora de fluxo, na última etapa, e quando nenhuma etapa seguinte resolve (AC 37)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSubirTests.Sem_proxima_etapa_409"`

**C47** - [x] `subir` responde `200` em `ABERTO`, `EM_ATENDIMENTO` e `AGUARDANDO_ALUNO`, e `409` em `RESOLVIDO` e `FECHADO` (AC 38)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSubirTests.Subir_por_estado"`

**C48** - [x] `subir` com `motivo` vazio ou só de espaços responde `400` no campo `motivo` (AC 39)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSubirTests.Motivo_obrigatorio_400"`

**C49** - [x] O aluno que chama `subir` recebe `403`, e um atendente de outro setor recebe `404` (AC 40)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSubirTests.Aluno_403_e_outro_setor_404"`

**C50** - [x] `acoes` do detalhe traz `subir` para o atendente enquanto há etapa seguinte, e não traz na última etapa, fora de fluxo, em `RESOLVIDO` e para o aluno (AC 41)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSubirTests.Acao_subir_so_com_etapa_seguinte"`

**C51** - [x] Com `prazoHoras` 48 e o relógio 48 horas depois de `etapa_desde`, o Agendador move o chamado `ABERTO` ou `EM_ATENDIMENTO` sem mensagem pública da equipe à etapa seguinte; com 47 horas, não move (AC 42)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoPrazoTests.Sobe_no_prazo_e_nao_antes"`

**C52** - [x] A subida do Agendador grava `SUBIDA` sem autor com o detalhe `Sem resposta em 48 horas` (e `Sem resposta em 12 horas` numa etapa de 12), tira o responsável e deixa `ABERTO` (AC 43)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoPrazoTests.Subida_do_agendador_registra_o_prazo_da_etapa"`

**C53** - [x] Duas execuções do Agendador, e o Agendador junto com um atendente, sobem o chamado uma vez só, com `etapa_ordem` aumentando de 1 para 2 e não para 3 (AC 44)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoPrazoTests.Duas_subidas_simultaneas_uma_so"`

**C54** - [x] Uma mensagem pública da equipe depois de `etapa_desde` impede a subida do Agendador; uma enviada antes de `etapa_desde` não impede (AC 45)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoPrazoTests.Resposta_da_equipe_na_etapa_segura_o_chamado"`

**C55** - [x] O Agendador não move um chamado `AGUARDANDO_ALUNO` vencido (AC 46)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoPrazoTests.Aguardando_aluno_nao_sobe"`

**C56** - [x] O Histórico escreve `Ana subiu o chamado de Líderes para Coordenação` com autor e `O chamado subiu de Líderes para Coordenação. Sem resposta em 48 horas` sem autor (AC 47)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "frase da subida"`

**C57** - [x] `encaminhar` manual deixa `etapa_ordem` e `etapa_desde` nulos, e o Agendador não move mais o chamado (AC 48)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoSubirTests.Encaminhar_manual_sai_do_fluxo"`

**C58** - [x] No Detalhe, o botão `Subir` aparece quando `acoes` tem `subir`, abre o diálogo que pede o motivo e envia `POST /subir` com `{ motivo }` (Observable)
Proof: `cd web && npx vitest run src/chamados/acoes.test.tsx -t "subir pede o motivo"`

**C59** - [x] Um chamado que subiu da liderança à coordenação e foi resolvido conta como roteado corretamente em `RoteamentoCorreto` (Impact, door 8)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~IndicadoresCalculoTests.Subida_nao_derruba_o_roteamento_correto"`

**C60** - `PermissoesChamado` tem `subir` só para `ATENDENTE` e `LIDER`, em `ABERTO`, `EM_ATENDIMENTO` e `AGUARDANDO_ALUNO`, e a regra de arquitetura acusa 10 tipos de ação e 11 nomes em `PermissoesChamado` (Impact, door 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~PermissoesChamadoTests.Subir_so_para_atendente_e_lider"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dez_acoes_do_chamado"`

### S4 - a liderança é avisada, vê só o necessário e sobe (P2) · ~12 arquivos · ~120 KB · ~30k

**C61** - `POST /api/admin/setores` com `cursoId` e `semestre` responde `201` com os dois, e `GET /api/admin/setores` os devolve (AC 49)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaSetorTests.Cria_lideranca_com_curso_e_semestre"`

**C62** - Só `cursoId` ou só `semestre` responde `400` no campo `semestre` (AC 50)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaSetorTests.Curso_e_semestre_juntos"`

**C63** - `semestre` 0 e 13, `cursoId` de outra instituição e `triagem: true` com curso respondem `400` em `semestre`, `cursoId` e `triagem`, e `semestre` 1 e 12 respondem `201` (AC 51)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaSetorTests.Bordas_e_triagem_400"`

**C64** - Uma segunda liderança ativa do mesmo curso e semestre responde `409` ao criar e ao reativar (AC 52)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaSetorTests.Uma_lideranca_ativa_por_turma_409"`

**C65** - `PUT /api/admin/setores/{id}` com outro `cursoId` e `semestre` no corpo mantém os valores gravados (AC 53)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaSetorTests.Atualizar_nao_muda_a_turma"`

**C66** - Uma etapa `SETOR`, a coordenação de um curso e o `encaminhar` apontando para uma liderança respondem `400` em `setorId` ou `setorCoordenacaoId` (AC 54, AC 64)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaSetorTests.Ninguem_aponta_para_lideranca"`

**C67** - A liderança é disponível só com o setor ativo e pelo menos um atendente ativo que não é o aluno; setor inativo, sem atendente e com o próprio aluno como único atendente são indisponíveis (AC 55)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaDestinoTests.Disponibilidade_da_lideranca"`

**C68** - `GET /destino` responde `lideranca: true` quando o fluxo começa por `LIDERANCA_SEMESTRE` e há liderança disponível, `false` nos outros casos, e não grava nenhuma linha (AC 56)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaDestinoTests.Destino_informa_sem_gravar"`

**C69** - `GET /destino` responde `400` com matrícula que não é do aluno, `404` com conversa de outro aluno e `409` com conversa já transferida (Surface)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaDestinoTests.Destino_400_404_409"`

**C70** - Com `lideranca: true` o diálogo mostra o aviso literal do AC 57 e os botões `Cancelar`, `Prefiro a coordenação` e `Enviar à liderança` (AC 57)
Proof: `cd web && npx vitest run src/assistente/lideranca.test.tsx -t "aviso da liderança"`

**C71** - Se `GET /destino` falha, o diálogo mostra o aviso de hoje e `POST /transferir` vai sem `aceitaLideranca`; `Prefiro a coordenação` também envia sem o campo (AC 58)
Proof: `cd web && npx vitest run src/assistente/lideranca.test.tsx -t "prévia que falha"`

**C72** - `POST /transferir` com `aceitaLideranca: true` abre o chamado na liderança; com `false` e sem o campo abre na coordenação do curso, pulando a etapa de liderança (AC 59)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderancaDestinoTests.Aceite_decide_se_vai_ao_lider"`

**C73** - Para o líder, o detalhe traz `transcricao: []`, `matricula.numero: null` e `categorias: null`, e traz `solicitante`, `resumo`, `matricula.curso`, `matricula.semestre`, `mensagens`, `eventos` e `fluxo` (AC 60)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderVisaoTests.Detalhe_do_lider_sem_transcricao_nem_matricula"`

**C74** - O líder que chama `reclassificar`, `duplicado` ou `encaminhar` recebe `403` (AC 61)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderVisaoTests.Lider_nao_reclassifica_nem_encaminha"`

**C75** - `GET /api/conversas/anexos/{id}` de um anexo da conversa de um chamado da liderança responde `404` ao líder (AC 62)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderVisaoTests.Anexo_da_conversa_404_para_o_lider"`

**C76** - Depois de subir, o líder recebe `404` no mesmo chamado (AC 63)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderVisaoTests.Lider_perde_o_chamado_ao_subir"`

**C77** - Quem é o solicitante e também atendente do setor do chamado recebe a visão `ALUNO` (AC 65)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~LiderVisaoTests.Solicitante_atendente_ve_como_aluno"`

**C78** - Uma liderança da instituição A nunca recebe chamado da instituição B, mesmo com o mesmo curso e semestre (AC 66)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~IsolamentoTests.Lideranca_de_outra_instituicao_nunca_recebe"`

**C79** - Na tela do líder, o bloco `Conversa com o assistente` e o número de matrícula não aparecem (AC 60)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "detalhe do líder"`

### S5 - o gestor vê por que o chamado caiu ali (P2) · ~5 arquivos · ~40 KB · ~10k

**C80** - [x] Para a equipe, o detalhe de um chamado de fluxo traz `fluxo` com `versao`, `etapa`, `total`, `destino` e `abrangencia` (`Todos os cursos`, `ADS` ou `ADS, 3º semestre`) (AC 67)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoRastroTests.Detalhe_traz_fluxo_e_abrangencia"`

**C81** - [x] O detalhe de um chamado fora de fluxo traz `fluxo: null` (AC 68)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoRastroTests.Fora_de_fluxo_traz_null"`

**C82** - [x] A coluna lateral escreve `Etapa 1 de 2 · ADS, 3º semestre` com `fluxo`, e não escreve a linha quando `fluxo` é null (AC 69)
Proof: `cd web && npx vitest run src/chamados/chamado.test.tsx -t "etapa do fluxo na coluna lateral"`

### S6 - o gestor monta o fluxo arrastando e soltando (P2) · ~12 arquivos · ~110 KB · ~28k

**C83** - A edição oferece `Lista` e `Canvas` do mesmo rascunho, e alternar entre as duas mantém uma etapa adicionada e não salva (AC 70)
Proof: `cd web && npx vitest run src/administracao/canvas.test.tsx -t "alternar mantém a edição"`

**C84** - O canvas mostra o nó `Início` e um nó por etapa ligados em ordem, cada um com ícone do tipo, o rótulo fixo e ` (48 h)` quando há prazo (AC 71)
Proof: `cd web && npx vitest run src/administracao/canvas.test.tsx -t "nós em ordem com rótulo e prazo"`

**C85** - Arrastar `Coordenação do curso` da paleta e soltá-lo no canvas adiciona um nó sem ligação na posição do soltar (AC 72)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/fluxos.spec.ts -g "arrastar tipo da paleta"`

**C86** - A regra de ligação aceita só saída de nó sem saída para nó sem entrada, e recusa autoligação, segunda saída, segunda entrada e ciclo (5 casos) (AC 73)
Proof: `cd web && npx vitest run src/administracao/canvas.test.tsx -t "regra de ligação"`

**C87** - Ligar o `Início` a um nó, e esse nó a outro, no navegador, forma a cadeia em ordem e recusa uma segunda saída do `Início` (AC 73)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/fluxos.spec.ts -g "ligar nós em cadeia"`

**C88** - Um nó fora da cadeia, e um sexto nó, são marcados e desligam `Salvar rascunho` e `Publicar` com a frase `Ligue todas as etapas ao Início, em uma única cadeia, com até 5 etapas.` (AC 74)
Proof: `cd web && npx vitest run src/administracao/canvas.test.tsx -t "cadeia inválida"`

**C89** - `Salvar rascunho` envia as etapas na ordem do caminho com `x` e `y` de cada nó, e reabrir o rascunho coloca cada nó onde estava (AC 75)
Proof: `cd web && npx vitest run src/administracao/canvas.test.tsx -t "salvar envia ordem e posição"`

**C90** - Remover um nó com setor ou prazo pede confirmação antes, e confirmar remove o nó e as ligações dele sem religar os vizinhos (AC 76)
Proof: `cd web && npx vitest run src/administracao/canvas.test.tsx -t "remover nó pede confirmação"`

**C91** - No navegador, `Tab` chega a cada nó do canvas e as setas movem o nó selecionado (AC 77)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/fluxos.spec.ts -g "teclado no canvas"`

**C92** - A Lista faz o que o canvas faz: adicionar uma etapa, remover, subir, descer, escolher o destino e definir o prazo, cada um com um botão ou campo nomeado (AC 78)
Proof: `cd web && npx vitest run src/administracao/fluxos.test.tsx -t "lista tem todas as operações do canvas"`

**C93** - Abaixo de 768 px o editor mostra só a Lista e a frase `O canvas está disponível em telas maiores.`; a partir de 768 px mostra as duas visões (AC 79)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/fluxos.spec.ts -g "celular só com a lista"`

**C94** - A biblioteca do canvas só é importada por `web/src/administracao/`, só por `import()` dinâmico, e o pacote de entrada do build não contém o código dela (AC 80, door 10)
Proof: `cd web && npx vitest run src/test/estrutura.test.ts -t "canvas carregado só sob demanda"`
Proof: `npm --prefix web run build && node web/scripts/entrada-sem-canvas.mjs`

**C95** - Simular com o canvas aberto marca cada nó com `Vai por aqui` ou `Pulada: {motivo}` conforme a resposta da API (AC 81)
Proof: `cd web && npx vitest run src/administracao/canvas.test.tsx -t "simulação marca os nós"`

**C96** - O canvas sem etapas mostra só o `Início` e a frase `Arraste um destino para começar.`, e se a biblioteca falha ao carregar, o editor mostra a Lista com o aviso `Não foi possível abrir o canvas. Use a lista.` (Observable)
Proof: `cd web && npx vitest run src/administracao/canvas.test.tsx -t "canvas vazio e falha de carga"`

### Barreiras e doors · arquivos de configuração e testes · ~20 KB · ~5k

**C97** - `web/package.json` fixa `@xyflow/react` na versão exata `12.12.1`, sem `^` nem `~` (door 10)
Proof: `node -e "process.exit(require('./web/package.json').dependencies['@xyflow/react']==='12.12.1'?0:1)"`

**C98** - O tipo de destino é uma lista fechada no código, e o que cada tipo enxerga e se exige aceite vem do tipo: `SETOR` e `COORDENACAO_CURSO` veem tudo e não pedem aceite, `LIDERANCA_SEMESTRE` vê o resumo restrito e pede aceite; nenhuma coluna nem campo de entrada guarda isso (door 3)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~FluxoDominioTests.Visao_e_aceite_vem_do_tipo"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Visao_e_aceite_fora_do_banco_e_da_entrada"`

**C99** - [x] O modelo do EF Core não tem mudança pendente em relação à migration nova, as entidades novas têm `instituicao_id` e filtro, e o domínio do fluxo não referencia ASP.NET Core nem Mediator (door 1, AD-008, AD-024)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Modelo_sem_mudanca_pendente"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Toda_entidade_tem_instituicao_e_filtro"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dominio_sem_AspNetCore_Mediator_nem_fatias"`

**C100** - O retrato de rotas e de erros: a tabela de rotas é a da base sem as 3 de regras e com as 11 da `Surface`, e toda rota `/api/admin` da tabela responde `403` com `detail` a quem não é admin (AC 11)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~RetratoTests.Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano"`
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~RetratoTests.Admin_403_com_detail_em_toda_rota_admin"`

**C101** - O retrato de sucessos só ganha `fluxo` no detalhe e `cursoId`/`semestre` no setor, e perde só as linhas de `regras`; tirar esses campos deixa o arquivo igual ao de `<base>` (Impact)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~RetratoTests.Corpos_de_sucesso_iguais_aos_da_base"`
Proof: `pwsh -c "$a = git show <base>:One.Api.Tests/Retratos/sucessos.txt | Where-Object { $_ -notmatch 'regras' }; $b = (Get-Content One.Api.Tests/Retratos/sucessos.txt) -replace ',\"fluxo\":(null|\{[^}]*\})','' -replace ',\"cursoId\":(null|\d+),\"semestre\":(null|\d+)','' | Where-Object { $_ -notmatch 'regras' }; if (Compare-Object $a $b) { exit 1 }"`

**C102** - O `GLOSSARIO.md` lista `Fluxo`, `Abrangência`, `Etapa`, `Liderança`, `Subir` e o evento `SUBIDA`, e o aviso do Histórico não deixa tipo de evento sem frase (Impact)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Glossario_lista_os_termos"`
Proof: `cd web && npx vitest run src/chamados/textos.test.tsx -t "todo tipo de evento tem frase"`

**C103** - [x] As suítes continuam verdes: a API inteira, o Vitest inteiro, o build do .NET com `CA1502`, e o build do web com tipos (todo teste que muda está na lista de `Asserções existentes que mudam`)
Proof: `dotnet build One.slnx`
Proof: `dotnet test One.Api.Tests`
Proof: `cd web && npx vitest run`
Proof: `npm --prefix web run build`

**C104** - O `crapper` sobre `web/src` sai 0 no limite 9.99, e o `dryer` não acha candidato com nota 0.8 ou mais (AD-018)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts`

**C105** - O fluxo real de ponta a ponta: o admin cria na tela o fluxo "Liderança do semestre → Coordenação do curso (48 h)" para ADS 3º semestre, simula, publica; o aluno transfere aceitando; o líder vê o chamado sem transcrição e sobe; a coordenação o recebe (AC 3, AC 29, AC 35, AC 59, AC 60)
Proof: `cd web && E2E_URL=http://localhost:8089 npx playwright test e2e/fluxos-real.spec.ts`

**C106** - A e2e inteira com a API simulada continua verde com as 7 edições da lista de asserções existentes (todas listadas nesta cabeça)
Proof: `cd web && E2E_URL=http://localhost:5199 npx playwright test e2e/anexos.spec.ts e2e/aparencia.spec.ts e2e/arranjo.spec.ts e2e/casca.spec.ts e2e/celular.spec.ts e2e/identidade.spec.ts e2e/instituicoes.spec.ts e2e/plataforma.spec.ts e2e/push.spec.ts e2e/ux.spec.ts e2e/fluxos.spec.ts`

## Screens

Enumeração por tela do que se vê e de onde. Os valores visuais vêm dos tokens existentes de `web/src/index.css` e do `estrutura-visual` (AD-037), sem valor novo: texto `foreground`, painéis `card`, ação principal `primary`, foco global `:focus-visible`. Nenhuma cor, raio ou fonte nova entra nesta feature. A fonte vinculante é `AD-034` e `AD-037`; o canvas pinta nós e linhas só com `--border`, `--muted`, `--primary` e `--foreground`, nos três temas.

| Tela | O que aparece e onde | Check |
| --- | --- | --- |
| Cadastros, aba `Fluxos` | tabela de 2 colunas `Nome` (categoria) e `Detalhe` (abrangência e cadeia), sem coluna nova | C40 |
| Cadastros, aba `Fluxos` | vazia: a frase do AC 34 e `Novo` | C43 |
| Cadastros, formulário `Novo: Fluxos` | categoria, abrangência em três opções, curso e semestre só quando a opção os pede | C41 |
| Edição do fluxo | alternador `Lista`/`Canvas` no topo; `Simular` e `Publicar` na mesma barra; `Publicar` desligado enquanto inválido | C42, C83 |
| Canvas | paleta com três itens numa coluna à esquerda do canvas; `Início` na extremidade esquerda; nós da esquerda para a direita; altura mínima de 360 px | C84, C85, C96 |
| Canvas | nó marcado `Vai por aqui` ou `Pulada: {motivo}` depois de simular | C95 |
| Canvas, cadeia inválida | frase de erro acima do canvas e os dois botões desligados | C88 |
| Edição do fluxo, abaixo de 768 px | só a Lista e a frase do canvas | C93 |
| Diálogo de transferência | aviso, `Cancelar`, `Prefiro a coordenação`, `Enviar à liderança`, nessa ordem | C70 |
| Detalhe do chamado | botão `Subir` entre as ações da equipe; diálogo pede o motivo | C58 |
| Detalhe do chamado, coluna lateral | linha `Etapa X de Y · {abrangência}` | C82 |
| Detalhe do chamado, líder | sem `Conversa com o assistente`, sem número de matrícula | C79 |
| Histórico | frase da subida com e sem autor | C56 |

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| tipos de destino (3) | `SETOR` C16 · `COORDENACAO_CURSO` C16 · `LIDERANCA_SEMESTRE` C16 | - |
| abrangência do fluxo (3) | todos os cursos C17 · curso C17 · curso e semestre C17 | - |
| precedência de fluxo (3) | semestre C3 · curso C3 · todos C3, e C15 table-driven sobre as 8 combinações | - |
| `GET /api/admin/fluxos` statuses (1) | 200 C39 | - |
| `POST /api/admin/fluxos` statuses (3) | 201 C17 · 400 C18 · 409 C21 | - |
| `PUT /api/admin/fluxos/{id}/rascunho` statuses (3) | 200 C22 · 400 C23 · 404 C38 | - |
| `DELETE /api/admin/fluxos/{id}/rascunho` statuses (2) | 204 C33 · 404 C33 | - |
| `POST /api/admin/fluxos/{id}/publicar` statuses (3) | 201 C30 · 404 C38 · 409 C31 | - |
| `POST /api/admin/fluxos/{id}/simular` statuses (3) | 200 C34 · 400 C38 · 404 C38 | - |
| `GET /api/conversas/{id}/destino` statuses (4) | 200 C68 · 400 C69 · 404 C69 · 409 C69 | - |
| `POST /api/conversas/{id}/transferir` statuses (4) | 201 C72 · 400 C69 · 404 C69 · 409 C69 | - |
| `POST /api/chamados/{numero}/subir` statuses (5) | 200 C44 · 400 C48 · 403 C49 · 404 C49 · 409 C46 | - |
| `GET /api/chamados/{numero}` statuses (2) | 200 C80 · 404 C76 | - |
| `POST` e `PUT /api/admin/setores` statuses (4) | 201 C61 · 200 C65 · 400 C62 · 409 C64 | - |
| `GET /api/admin/setores` statuses (1) | 200 C61 | - |
| `semestre` bordas do fluxo (4) | 0 C18 · 1 C18 · 12 C18 · 13 C18 | - |
| `semestre` bordas da liderança (4) | 0 C63 · 1 C63 · 12 C63 · 13 C63 | - |
| número de etapas (4 bordas) | 0 C23 · 1 C23 · 5 C23 · 6 C23 | - |
| `prazoHoras` (5) | 0 C27 · 1 C27 · 720 C27 · 721 C27 · última etapa C27 | - |
| posição da liderança no fluxo (3) | primeira de duas C28 · segunda C28 · única C28 | - |
| estados do chamado para `subir` (5) | `ABERTO` C47 · `EM_ATENDIMENTO` C47 · `AGUARDANDO_ALUNO` C47 · `RESOLVIDO` C47 · `FECHADO` C47 | - |
| recusas de `subir` por situação (3) | fora de fluxo C46 · última etapa C46 · nenhuma seguinte resolve C46 | - |
| quem chama `subir` (3) | atendente C44 · líder C60 · aluno C49 | - |
| ações negadas ao líder (3) | `reclassificar` C74 · `duplicado` C74 · `encaminhar` C74 | - |
| campos do detalhe do líder (10) | `transcricao` C73 · `matricula.numero` C73 · `categorias` C73 · `solicitante` C73 · `resumo` C73 · `matricula.curso` C73 · `matricula.semestre` C73 · `mensagens` C73 · `eventos` C73 · `fluxo` C73 | - |
| disponibilidade da liderança (4) | ativo com atendente C67 · setor inativo C67 · sem atendente C67 · só o aluno C67 | - |
| visões do detalhe (3) | `ALUNO` C77 · `ATENDENTE` C80 · `LIDER` C73 | - |
| frases do Histórico para `SUBIDA` (2) | com autor C56 · sem autor C56 | - |
| one-way doors (10) | 1 C13 · 2 C14 · 3 C98 · 4 C1 e C2 · 5 C14 · 6 C28 e C72 · 7 C60 · 8 C45 · 9 C3 e C15 · 10 C97 e C94 | - |
| entidades de `Relations` (6) | `Fluxo` C13 · `VersaoFluxo` C13 · `EtapaFluxo` C13 · chamado com caminho C14 · setor com turma C14 · atendente do setor C67 | - |
| asserções existentes que mudam (7) | 1 C60 · 2 C98 · 3 C100 · 4 C101 · 5 C10 · 6 C40 · 7 C106 | - |
| nomes de ação em `PermissoesChamado` (11) | `responder` C60 · `nota` C60 · `assumir` C60 · `resolver` C60 · `confirmar` C60 · `rejeitar` C60 · `cancelar` C60 · `encaminhar` C60 · `reclassificar` C60 · `duplicado` C60 · `subir` C60 | - |
| startup config: assembly de teste e app (2) | harness do `OneFactory` C103 · `Program.cs` C103; nenhuma chave de configuração nova (o prazo é por etapa) | - |

- Afirmam status, rota ou campo de resposta: C12, C17 a C21, C34 a C39, C44 a C50, C61 a C69, C72 a C77, C80, C81, C100, C101; cada um tem prova que passa pela rota HTTP
- C40 a C43, C56, C58, C70, C71, C79, C82 a C96 são afirmações de tela; os campos que elas leem são os que C39, C45, C73 e C80 afirmam no JSON
- Nenhum outro check afirma mais que o caso único que a sua prova exercita

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decide, atravessa a rota HTTP (criar, publicar, subir, destino, detalhe do líder) | uma na rota | cada status da `Surface`, cada recusa com o campo, cada borda numérica |
| Decide, sem atravessar rota (`ResolverFluxo`, `Chamado.Subir`, visão por tipo) | uma na própria camada | uma linha afirmada por linha da tabela de decisão |
| Decide, na tela (alternador, regra de ligação, cadeia inválida) | uma na própria camada | um caso por linha da tabela (5 casos de ligação, 2 de cadeia inválida) |
| Arrastar, soltar e teclado no canvas | uma no navegador | o gesto e o resultado em tela |
| Instrumentation (mapeamento do fluxo para a resposta, componentes de nó só de apresentação) | nenhuma própria | coberta pelo consumidor |

Evidence:

- `One.Api/Chamados/Transferencia.cs` `Setor()`: 3 saídas, 4 pontos de decisão -> decide; o `ResolverFluxo` generaliza para 3 níveis de precedência, 3 tipos de destino e 2 situações, a contar do código quando existir
- `One.Api/Dados/Chamados/Chamado.cs` `Encaminhar()`: 1 guarda de estado e 1 mudança de setor -> decide; `Subir()` é do mesmo formato com a etapa
- `One.Api.Tests/ChamadoDominioTests.cs`: análogo no repositório, mesmo formato de estado e transição, já provado na própria camada
- `One.Api.Tests/TransferenciaTests.cs`: análogo da rota de transferência, já provado pela rota HTTP

Cost: 8 testes de domínio sem banco, ~45 de rota HTTP, ~25 no Vitest e 5 no navegador. Sem estas linhas, as 3 tabelas de decisão (precedência, tipo de destino, estado da subida) só seriam provadas pelo caminho feliz da rota.

## Swept

- validation: C18, C19, C20, C23, C24, C25, C26, C27, C28, C29, C48, C62, C63, C88
- failure modes: C8 (etapa que não resolve), C35, C46, C71 (prévia que falha), C96 (biblioteca que não carrega); a subida do Agendador que falha no meio fica numa transação e é refeita no próximo ciclo (C53)
- idempotency: C21, C31, C53 (criar, publicar e subir duas vezes dão um efeito)
- authorization: C49, C60, C74, C75, C100; existing - as rotas `/api/admin` já exigem admin
- concurrency: C21, C31, C53
- data lifecycle: C1, C2, C32, C33 (migração das regras, chamados antigos fora de fluxo, versões antigas mantidas, rascunho descartado); n/a - sem TTL nem arquivamento de versão publicada, porque os chamados apontam para elas
- dependency failure: C71, C96 (prévia e biblioteca); n/a - a API não chama serviço externo nesta feature
- state transitions: C44, C47, C57, C59, C60
- observability: C45, C52, C80 (evento `SUBIDA` com motivo ou prazo, e o rastro do fluxo no chamado); o log do Agendador por chamado segue o formato dos outros prazos (C51)

## Out of scope

- Ver `## Out of scope` do plano.

## Handoff

Estimativa por slice, em bytes dos arquivos que cada um lê ou altera, divididos por quatro (tokens), mais o código novo estimado:

- S1 = Transferencia.cs 3,7 KB + Chamado.cs 8,9 KB + OneDb.cs 11,7 KB + CargaValidacao.cs 5,9 KB + CargaInicial.cs 2,1 KB + `Regra*` 4,3 KB + Cadastros.tsx 11 KB + TransferenciaTests.cs 14 KB + RetratoTests.cs 35 KB + cadastros.test.tsx 10,6 KB + ArquiteturaTests.cs 67,6 KB + código novo ~40 KB = ~215 KB / 4 = ~54k
- S2 = AdminTests + Cadastros.tsx 11 KB + `comum.tsx` 0,8 KB + código novo (6 casos de uso, formulário, 3 testes) ~80 KB = ~92 KB / 4 = ~23k. S1+S2 = ~77k, todo em `Administracao`, `Chamados` e `Dados`
- S3 = Agendador.cs 14,4 KB + Chamado.cs 8,9 KB + PermissoesChamado.cs 1,4 KB + EncaminharChamado.cs 1,8 KB + DetalheChamado.cs 6,9 KB + ChamadoDetalhe.tsx 22,3 KB + chamado.ts 4,2 KB + AgendadorTests.cs 7,3 KB + chamado.test.tsx 20,1 KB + PermissoesChamadoTests.cs 2,8 KB + código novo ~30 KB = ~120 KB / 4 = ~30k. Acumulado S1+S2+S3 = ~107k
- S5 = DetalheChamado.cs 6,9 KB + ChamadoDetalhe.tsx 22,3 KB + código novo ~6 KB = ~35 KB / 4 = ~9k. Acumulado S1+S2+S3+S5 = ~116k, abaixo de 150k
- S6 = setup.ts 5 KB + estrutura.test.ts 3,8 KB + simulada.ts 15 KB + código novo do canvas, da lista e dos testes ~100 KB = ~124 KB / 4 = ~31k. Acumulado com os quatro = ~147k, no limite, sem folga para o S4
- S4 = Assistente.tsx 24 KB + TransferirConversa.cs 1,5 KB + transferencia.test.tsx 4,8 KB + DetalheChamado.cs 6,9 KB + ChamadoRotas.cs 1 KB + CriarSetor/AlterarSetor/ListarSetores 3 KB + código novo ~50 KB = ~91 KB / 4 = ~23k. Total do feature = ~170k, acima do orçamento de 150k

A estimativa passa de 150k. Corte proposto, em sequência e só no verde: lote 1 = S1 + S2 + S3 + S5 (~116k); lote 2 = S6 + S4 (~54k). S4 vai por último porque depende da resposta da Univag à pergunta 1.

- Mechanism: **handoff em dois lotes sequenciais, só no verde, construídos por subagentes** (decisão do usuário em 08/11: "use subagentes para construir"). Lote 1 = S1 + S2 + S3 + S5; lote 2 = S6 + S4. O C60 (papel `LIDER`), o C98, o C100 a C102 (campos `cursoId`/`semestre` do setor) e o C105 só fecham no lote 2; os demais fecham no lote 1. Verificador: subagente novo, depois do último commit, sobre `<base>..HEAD` com todos os checks
- Base: `e1320eb` (commit que congela `plan.md` e este arquivo), na branch `feature/fluxos-atendimento`

**Lote 1 (construtor, 08/11)**

- Boundary: lote 1 fechado em `2a731b5` (código: `7d3ffb3` API, `2a731b5` web), sobre a base `e1320eb`. Checks fechados `[x]`: C1 a C15, C17 a C43, C44 a C55, C57, C58, C59, C80 a C82, C99, C56 e C103. Abertos no lote 1: C16 (o teste `FluxoDominioTests.Resolve_cada_tipo_de_destino` existe e passa, inclusive a linha "liderança disponível" pela função pura, mas o check fecha com a liderança real do lote 2), C60 (papel `LIDER`), C98, C100 a C102 e C105 (lote 2), C14 (a metade do setor com curso e semestre é do lote 2; `FluxoModeloTests.Colunas_do_chamado_e_do_setor` só prova as 3 colunas do chamado) e C104 (o `dryer` sai 0 sem candidato; o `crapper.exe` não roda neste computador: "Uma política de Controle de Aplicativo bloqueou este arquivo"; contagem própria de complexidade ≤ 8 e cobertura de linhas de 100% em `EdicaoDoFluxo.tsx` e `ChamadoDetalhe.tsx`, 99% em `Cadastros.tsx`, que não substitui o `crapper`). Os testes `C83` a `C96` do S6 não foram escritos, exceto `fluxos.test.tsx` "lista tem todas as operações do canvas" (C92), que já existe e passa e fica `[ ]` até o lote 2. 60 filtros `dotnet test` dos checks fechados executam ≥ 1 teste cada e passam; `dotnet test One.Api.Tests` inteiro: 661 aprovados; `vitest run` inteiro: 56 arquivos, 536 testes; `dotnet build One.slnx`: 0 erros.
- Settled mid-build: (1) `ResolverFluxo` mora em `One.Api/Dados/Fluxos/` (funções puras `Escolher`, `Etapa`, `Situacao`, `Proximo` e o carregamento `Rotear`/`Seguinte`), e não em `Chamados/`, para a fatia `Administracao` (simulador) e o `Agendador` o chamarem sem nova referência entre fatias; `Contexto.Lideranca` é sempre nulo no lote 1 (liderança resolve "Sem liderança disponível"), e o lote 2 só precisa preenchê-lo. (2) O rascunho nasce com o número seguinte da última versão publicada e publicar só põe `publicada_em` nele (não copia): o "remover o rascunho" do AC 25 é o rascunho passar a ser a versão. `versao_fluxo.publicada_em` é token de concorrência, e é isso que dá o `409` da publicação simultânea (C31) sem tabela de bloqueio. (3) A subida do Agendador não usa `ExecuteUpdate` condicional em `etapa_ordem`: carrega o chamado, repete o filtro de prazo, chama `Chamado.Subir` e grava com o `xmin` (`RowVersion`) do chamado; quem perde a corrida leva `DbUpdateConcurrencyException` (o Agendador ignora, a rota responde `409` pelo tratador global). É o mesmo efeito do AC 44 com a mesma garantia, e `Chamado.Subir` continua o único lugar que grava eventos. (4) `fluxo` no detalhe vem só para a equipe; o aluno recebe `null`. (5) Chamado que não resolve nenhuma etapa na abertura grava as 3 colunas nulas (inclusive `versao_fluxo_id`), igual ao "sem fluxo". (6) Simulador: `inicial` é o nome do setor (ou da Triagem) e `escolhido` é o fluxo que `Escolher` devolve para o curso e o semestre, de qualquer versão publicada; a simulação roda sobre as etapas do fluxo da rota. Sem aceite, a liderança disponível sai `NAO_RESOLVIDA` com o motivo `O aluno não aceitou a liderança`. (7) Os testes C16/C35 só têm a linha "liderança indisponível" pela rota HTTP; a linha "disponível" fica para o lote 2 (C16 inteiro). (8) `PermissoesChamado`: o nome `subir` vale só para `ATENDENTE` no lote 1; `Lider` não existe ainda. (9) `RetratoTests`: a tabela de rotas do lote 1 tem 83 rotas (79 menos as 3 de regras, mais as 6 de fluxos e a de `subir`); o `GET /destino` entra com o lote 2.
- Abandoned: nada. A chave `regras` da carga JSON continua e gera fluxo; o canvas (`@xyflow/react`) e a liderança ficaram para o lote 2 como combinado.

**Asserções existentes que mudaram no lote 1** (lista fechada do cabeçalho, mais o que o novo arranjo forçou sem baixar limite):

- Item 1: `ArquiteturaTests.Nove_acoes_do_chamado` virou `Dez_acoes_do_chamado` (10 tipos, 11 nomes com `subir`; AC 35). `MediatorTests.AgirNoChamado_so_nas_9_acoes` virou `..._10_acoes` com (10, 68) no lugar de (9, 65).
- Item 2: `ArquiteturaTests.Literais_gravados_so_nas_constantes` ganhou `SUBIDA` em `TiposEvento` e o grupo `DestinosEtapa` (`SETOR`, `COORDENACAO_CURSO`, `LIDERANCA_SEMESTRE`); `Glossario_lista_os_termos` ganhou o grupo `tipo de destino` e as linhas do `GLOSSARIO.md`.
- Item 3: `RetratoTests.Tabela_de_rotas_igual_a_da_base` virou `Tabela_de_rotas_sem_regras_e_com_as_rotas_do_plano` (83 rotas, 80 de um método, 81 com autorização) e `Admin_403_com_detail_nas_29_rotas` virou `Admin_403_com_detail_em_toda_rota_admin` (36 rotas `/api/admin`). `Retratos/rotas.txt` perdeu as 3 linhas de regras e ganhou as 6 de fluxos e a de `subir`.
- Item 4: `Retratos/sucessos.txt` perdeu as 3 linhas de `regras` e cada corpo de detalhe de chamado ganhou `,"fluxo":null`; tirando só isso, o arquivo é igual ao de `e1320eb` sem as linhas de `regras` (conferido por comparação: 0 diferenças); `Corpos_de_sucesso_iguais_aos_da_base` espera 56 linhas.
- Item 5: `AdminTests` (`Regra_unica_por_categoria`, `Regra_setor_fixo_sem_setor_400`, `Curso_com_coordenacao_roteia` pelo helper `f.Regra`, `Recusas_dos_cadastros_400`, `Crud_dos_cadastros` sem a linha de `regras`), `OrdemDasRecusasTests` (rota `/api/admin/fluxos/999999/rascunho`, `Cadeia_dos_cadastros` com fluxos), `IsolamentoTests`, `InstituicaoComandoTests`, `PlataformaTests` e `CargaValidacaoTests` passaram a conferir fluxo de uma etapa. O helper `Balcao.Regra` cria um fluxo publicado de uma etapa.
- Item 6: `web/src/administracao/cadastros.test.tsx`, `admin.test.tsx` e `textos.test.tsx`: a aba `Regras` virou `Fluxos` (o teste "regra por setor e resposta pronta..." ficou só com a resposta pronta; o "regra por coordenação" virou "fluxo para todos os cursos envia só a categoria"). `src/test/estrutura.test.ts` não mudou: a regra do `@xyflow/react` é do lote 2.
- Item 7: `web/e2e/simulada.ts` ganhou as rotas `/api/admin/fluxos*` e `/subir`; `ux.spec.ts` e `arranjo.spec.ts` trocaram a aba `Regras` por `Fluxos`. Os e2e simulados não foram rodados neste lote (C106 é do lote 2).
- Fora da lista, só para seguir o arranjo (contagens e nomes, sem baixar limite): `ArquiteturaTests` (`TabelasDaInstituicao` com as 3 tabelas novas, 78 mensagens e 78 handlers, 81 `Map*`, 34 `Entrada`, 68 respostas JSON, 40 usos de `Shared`, `FluxoResposta` no lugar de `RegraResposta`, 30 entidades com a pasta `Fluxos`, `Subir` entre os métodos públicos de `Chamado`, 14 objetos anônimos em `OneDb.cs` pelos 3 índices novos), `SessaoTests` (74 rotas privadas), `PermissoesChamadoTests.Acoes_por_papel_e_estado` (a coluna `subir` do `ATENDENTE`, 110 células), `web/src/tabela.test.tsx` e `ux.test.tsx` (a URL `/api/admin/fluxos`).