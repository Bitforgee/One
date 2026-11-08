# One 2.0: fluxos no estilo n8n, permissões no estilo GLPI e personalização total

Prompt e plano-mestre para o agente de planejamento (Opus 5.5). Escrito em 08/11/2026 a partir da leitura do código em `main` (`702765c`), do `STATE.md` (AD-001 a AD-043), do plano e da verificação de `fluxos-atendimento`, e de uma pesquisa de mercado (seção 4, com as fontes).

> **Como usar**: copie a seção 9 ("O prompt") para um agente novo no Opus 5.5. As seções 1 a 8 são o contexto que o prompt manda ler. Este arquivo não é um `plan.md`: cada épico da seção 6 vira uma feature própria em `.specs/features/<slug>/` com `plan.md` aprovado por você antes de qualquer código, como manda o `AGENTS.md`.

---

## 1. O que o One faz hoje (fatos conferidos no código)

| Área | Como está | Onde |
| --- | --- | --- |
| Roteamento | Um fluxo por **categoria** e por **abrangência** (todos os cursos, um curso, um semestre de um curso). Vence o mais específico. Cadeia linear de 1 a 5 etapas. Destinos fechados: `SETOR`, `COORDENACAO_CURSO`, `LIDERANCA_SEMESTRE` | `One.Api/Dados/Fluxos/ResolverFluxo.cs`, AD-041 |
| Subida de etapa | Botão "Subir" do atendente/líder ou prazo opcional por etapa (horas corridas, 1 a 720) pelo `Agendador`; evento `SUBIDA` que não conta como encaminhamento | `Chamado.Subir`, `Agendador.cs` |
| Liderança | É um `Setor` com `curso_id` + `semestre`. O papel `LIDER` é calculado pelo setor do chamado. O líder não vê transcrição nem número de matrícula. O aluno não escolhe pular a liderança (AD-042) | `PermissoesChamado.cs`, `DetalheChamado.cs` |
| Editor | Canvas `@xyflow/react` 12.12.1 + lista equivalente, rascunho, simulador, publicar versão imutável | `web/src/administracao/Canvas.tsx`, `EdicaoDoFluxo.tsx`, `Simulador.tsx` |
| Papéis | Fixos, gravados no usuário: `ALUNO`, `ATENDENTE`, `ADMINISTRADOR`, `OPERADOR` (só por CLI). Checagem espalhada: `u.Tem(Papeis.X)` em cerca de 12 handlers. A área `/api/admin` é tudo ou nada | `Dados/Entidades.cs`, `AdminRotas.cs:15`, `UsuarioRotas.cs:10` |
| Personalização | Nome curto, uma cor primária (com teste de contraste), imagens (logo, ícone, login, assistente), textos do login, nome/foto/boas-vindas/perguntas do assistente, contato, e-mail com a marca, manifesto PWA por instituição | `Dados/Instituicao.cs`, AD-032 |
| Estado da feature de fluxos | `fluxos-atendimento` está com **verificação FAIL na rodada 1** (C104 `crapper` bloqueado na máquina, C106 specs com API real; textos de acessibilidade do canvas em inglês: `Zoom In`, `Fit View`, `Press enter or space to select a node...`) | `.specs/features/fluxos-atendimento/verification.md` |

## 2. Objetivo

1. **Fluxo padrão funcionando de ponta a ponta**: o aluno abre o chamado → vai para o líder de sala do semestre → se precisar, sobe para a coordenação → se precisar, vai a outro setor. Sem nenhum buraco de lógica.
2. **A instituição desenha os fluxos que quiser**: editor visual inspirado no n8n, com condições, prazos, notificações, versões, simulação e histórico de execução. O One oferece **fluxos padrão** e **templates sugeridos**.
3. **Permissões no nível de GLPI/Zendesk/Freshdesk**: perfis com matriz de direitos por módulo e ação, escopo por setor/curso, perfis padrão e personalizados.
4. **One 100% personalizável** dentro de limites seguros (marca, tema, textos, categorias, formulário, horário de atendimento, e-mails).
5. **UX melhor para quem atende e para o aluno**: o aluno sabe onde está o chamado e quem está com ele; a equipe vê prazo, etapa e o caminho percorrido.

## 3. Falhas de lógica encontradas (corrigir antes de crescer)

Cada item tem a evidência. Os marcados "a provar" foram lidos no código mas ainda não têm teste que falhe; o primeiro passo do épico E0 é escrever esse teste.

| # | Falha | Evidência | Efeito | Correção proposta |
| --- | --- | --- | --- | --- |
| F1 | Para ser líder, o estudante precisa ganhar o papel `ATENDENTE` (o admin só consegue pôr alguém num setor se ele for atendente). Com isso ele passa em toda checagem `Tem(Atendente)` | `UsuarioRotas.cs:35`; `VerVersaoArtigo.cs:20`; `BaixarVersaoDocumento.cs:20`; `ConsultarIndicadores.cs:21`; `TempoRealHub.cs:28` | **Um aluno líder pode ler versões de artigos e documentos internos**, o que contraria o AD-012 (artigos são só fonte da IA). Também vê indicadores do setor (a provar) | Liderança deixa de depender de `ATENDENTE`: designação própria (E4) e checagem por permissão (E5). Correção mínima já no E0: essas rotas exigem atendente de setor **sem** `curso_id` |
| F2 | Reclassificar troca a categoria mas mantém o chamado no fluxo e na etapa da categoria antiga | `Chamado.Reclassificar` (`Chamado.cs:157`) só grava evento e `CategoriaId` | "Subir" e o prazo seguem a cadeia errada; o simulador não explica o que aconteceu | Ao reclassificar: reavaliar o fluxo da nova categoria a partir da etapa equivalente, ou sair do fluxo (`etapa_ordem = null`) com evento; decidir no plano |
| F3 | Não existe fluxo padrão para "qualquer categoria". Categoria sem fluxo, e a categoria padrão "Não classificado", vão sempre para a Triagem | `ResolverFluxo.Rotear`: `if (categoria.Padrao) return ... triagem` | A instituição que quer "todo chamado passa pelo líder primeiro" precisa criar um fluxo por categoria e lembrar de criar outro a cada categoria nova; quando a IA não classifica, a liderança é pulada | "Fluxo padrão da instituição" (gatilho = qualquer categoria) como último nível da precedência fixa |
| F4 | A liderança é atribuída à mão e não expira. A matrícula muda de semestre pelo CSV, o líder não | `ImportarMatriculas.cs`; out of scope do plano de fluxos ("troca automática a cada semestre") | Líder que se formou, trancou ou mudou de turma continua recebendo dúvidas de colegas | Mandato com início/fim; suspensão automática quando a matrícula do líder deixa de ser `ATIVA` ou muda de curso/semestre (E4) |
| F5 | Prazo em horas corridas | `etapa_fluxo.prazo_horas`, plano de fluxos "Prazo em horas úteis" fora do escopo | Chamado aberto sexta 18 h com prazo de 48 h sobe no domingo, para uma coordenação fechada | Calendário de atendimento da instituição (dias, horários, feriados) e prazo em horas úteis (E1/E6) |
| F6 | Ninguém é avisado quando o chamado muda de etapa, e o aluno não vê a etapa | Plano de fluxos: "Aviso por e-mail ou push à etapa nova" fora do escopo; `DetalheChamado.DoFluxoDoChamado` devolve `null` para o aluno | A coordenação só descobre olhando a fila; o aluno não sabe se está com o líder ou com a coordenação | Nó "Notificar" e linha do tempo do aluno (E1, E7) |
| F7 | Etapa que aponta para setor desativado é pulada em silêncio | `ResolverFluxo.Etapa` devolve `SetorInativo` | O fluxo publicado muda de comportamento sem o gestor saber | "Saúde do fluxo": aviso na lista de fluxos e bloqueio ao desativar setor usado em fluxo publicado, ou confirmação explícita (E1) |
| F8 | Administração é tudo ou nada | `AdminRotas.cs:15` | Um coordenador que só deveria editar o fluxo do próprio curso precisa ser admin e passa a ver todos os usuários e CPFs (LGPD) | Perfis com escopo (E5) |
| F9 | Verificação de `fluxos-atendimento` em FAIL | `verification.md` rodada 1 | A base que tudo vai estender não está fechada | E0 |

Invariantes que já estão certas e **não podem quebrar**: o aluno nunca escolhe pular a liderança (AD-042); atendimento direto nunca abre na liderança; dado visto pela equipe nunca volta para um colega; a liderança nunca recebe transcrição nem fontes internas (AD-012); versão publicada é imutável e o chamado guarda a versão; simulador e roteamento real usam a mesma função; `SUBIDA` não conta como encaminhamento; tudo filtrado por instituição (AD-008).

## 4. O que o mercado faz (pesquisa de 08/11/2026)

Feita por um subagente que abriu as páginas oficiais listadas no fim desta seção. "(não confirmado)" quer dizer que o item não foi encontrado numa página oficial.

| Padrão observado | Fonte | O que o One adota |
| --- | --- | --- |
| Rascunho salvo sozinho, versão publicada travada; execuções reais usam a publicada; Publicar só acende com mudanças; versão com nome | n8n *Publish*, *Workflow history* | Já temos rascunho/publicado e chamado preso à versão. Falta: salvar sozinho, nome da versão, restaurar e clonar versão (E3) |
| Painel de nós com busca, atalho `n`, Enter insere, Esc fecha; gatilhos com ícone próprio. O "+" no fim do nó e as categorias não foram achados na doc (não confirmado) | n8n *Nodes*, *Keyboard shortcuts* | Painel com busca e grupos fixos: Gatilho, Encaminhar, Separar por, Esperar, Avisar, Encerrar (E3) |
| Switch com saídas nomeadas e "Fallback Output"; IF com duas saídas | n8n *Switch* | "Separar por" com ramos nomeados e ramo "Nenhuma regra" obrigatório (E1) |
| Wait com "Limit Wait Time" (retoma sozinho no prazo máximo) | n8n *Wait* | "Esperar resposta" com saída "venceu o prazo": é o líder sem resposta em 48 h subindo para a coordenação (E1) |
| Lista de execuções por fluxo e geral; "Debug in editor"; pin data só para teste, nunca em produção | n8n *Executions*, *Debug*, *Data pinning* | Aba "Execuções" e caminho do chamado no detalhe; Simular com aluno fictício que não grava nada (E1, E3) |
| Galeria de templates; o template pode pedir ajustes antes de rodar | n8n *Templates* | "Usar modelo" cria rascunho com pendências marcadas ("defina a coordenação") (E2) |
| Notas adesivas (Shift+S, Markdown, 7 cores) para explicar templates | n8n *Sticky notes* | Notas no canvas; os modelos do One vêm com notas explicativas (E2, E3) |
| Trigger pode disparar outro e virar laço; automação precisa de condição que dispare uma vez só (tag `sla_alert`) | Zendesk *Triggers*, *Automations*, *SLA alert* | Validação de laço ao publicar; cada prazo dispara uma vez por etapa (o `Agendador` já faz por update condicional, AC 44) |
| SLA de 1ª resposta e de resolução, horário comercial ou corrido, política mais restritiva no topo | Zendesk *SLA policies* | Prazo de 1ª resposta e de resolução por calendário da instituição (E1, E6) |
| Fila com grupo reserva (fallback) | Zendesk *Omnichannel routing* | Etapa que não resolve cai na Triagem, que já é a fila reserva (AC 7 atual) |
| Nós Event / Condition (SIM/NÃO) / Action; aprovação com quórum ("everyone has to approve"); Execution Logs. Atenção: lá a edição vale na hora, sem versão presa | Freshservice *Workflow Automator* | Confirma nossa escolha de versão imutável. Nó "Aprovação" fica como pergunta do plano do E1 |
| Aprovação como passo com duas saídas fixas (Approve/Decline); mudança vale só depois de "Publish draft" | Jira SM *Approvals* | Se houver aprovação, duas saídas fixas |
| SLA com Start, "Pause on" e Stop, calendário com feriados | Jira SM (visto só no resultado da busca) | Prazo pausa em "Aguardando aluno" (o Agendador já não sobe nesse estado, AC 46) |
| Nome de status para o cliente separado do status interno | Jira SM *Customize statuses for a request type* | Linha do tempo do aluno com nomes próprios, sem expor transições internas (E7) |
| "Test" com dados de teste e detalhe de execução por passo, com duração | ServiceNow *Flow execution details* | Simulação passo a passo com o motivo de cada desvio (E3) |
| Ramos avaliados de cima para baixo, vale o primeiro; ramo "None met" | HubSpot *If/then branches* | "Separar por" avalia na ordem visível do painel |
| Usuário tem perfil X **na entidade Y**; atribuição recursiva; entidades em árvore | GLPI 12 *Fundamental concepts* | `usuário × perfil × escopo` (instituição › curso › semestre), com "inclui abaixo" (E5) |
| 7 perfis padrão; só Self-Service usa a interface simplificada | GLPI *Profiles* | Perfis padrão do One; portal do aluno separado do painel da equipe (já é assim) |
| Matriz Read/Update/Create/Delete/Purge por área. A doc avisa: "no permission deduction is done" | GLPI *Profiles* | Matriz módulo × ação em que marcar Editar marca Ver junto (E5) |
| Regras de negócio ordenadas com "Skip remaining rules" | GLPI *Business rules for tickets* | **Não adotado**: o AD-041 já rejeitou prioridade numérica. Mantemos a precedência fixa (mais específico vence) e o fluxo padrão como último nível |
| SLA (TTO/TTR) para o cliente, OLA interna por grupo, níveis de escalonamento antes/no/depois do prazo, cron a cada ≤5 min | GLPI *Service levels* | Prazo por etapa (OLA) mais prazo total para o aluno (SLA), no `Agendador` |
| Importação manual, LDAP, SCIM; regra padrão dá Self-Service na raiz | GLPI *Users import* | CSV continua (já existe); líderes também por CSV (E4) |
| Papéis padrão usados como estão ou clonados; poderes que papel customizado nunca recebe | Zendesk *Custom roles* | Perfis padrão travados e clonáveis; lista de poderes só de admin (dar perfis, aparência) (E5) |
| **Escopo (o que vê: global/grupo/atribuídos) separado do papel (o que faz)** | Freshdesk *Roles* | O modelo mais claro achado: perfil = ações, escopo = quais chamados (E5) |
| Portal: 5 cores, 2 fontes, logo, favicon, imagens, mostrar/ocultar blocos, Publicar e Reverter | Zendesk *Branding*, Freshdesk *Portal*, Jira SM *Help center* | Personalização com prévia e "voltar ao padrão", sem CSS/HTML livre (protege contraste e tema). Domínio próprio depois (E6) |
| ~90 equipes em 7 departamentos num portal só, cada uma com prazo, campos e fila; o aluno "não precisa saber qual equipe atende" | Freshworks, caso MMU | É o "outro setor" do fluxo: cada setor com prazo e fila, o aluno vê um balcão só |
| Representante de turma como "elo" entre turma e coordenação, eleito por período; casos omissos vão à coordenação | Regulamentos IFMG, UFSJ, UniRG, FAMA (só trechos da busca) | Líder com vigência; sem líder vigente, pula para a coordenação (E4) |
| CSAT enviado 24 h depois de resolvido, 28 dias para responder | Zendesk *Satisfaction surveys* | Avaliação de 1 clique no próprio chamado ao confirmar (E7, se o CSAT entrar) |

Não pesquisados: Ellucian CRM Advise, Salesforce Education Cloud, esquemas de permissão do Jira SM.

**Páginas abertas**: docs.n8n.io (`/workflows/executions/`, `/workflows/executions/debug/`, `/data/data-pinning/`, `/workflows/history/`, `/workflows/publish/`, `/workflows/templates/`, `/workflows/components/nodes/`, `/keyboard-shortcuts/`, `/workflows/components/sticky-notes/`, `/flow-logic/error-handling/`, `/integrations/builtin/core-nodes/n8n-nodes-base.wait/`, `.../n8n-nodes-base.switch/`); support.zendesk.com (artigos 4408822236058, 4408832701850, 4408829459866, 4408820131994, 4408831658650, 4408882153882, 4408824139546, 4408887007386); support.freshservice.com (232139, 50000011845); support.freshdesk.com (97079, 50000003753); support.atlassian.com (JSM: *add-an-approval-to-a-workflow*, *customize-the-workflow-statuses-for-a-request-type*, *what-can-i-customize-about-the-help-center*); servicenow.com (*flow-execution-details*); knowledge.hubspot.com (*use-if-then-branches-in-workflows*); glpi-user-documentation.readthedocs.io (*profiles*); help.glpi-project.org (*the-fundamental-concepts*, *business_rules_for_tickets*, *service_levels*, *usersimport*); freshworks.com/customers/stories/mmu/.

## 5. Princípios de produto para o One

1. **Determinístico e explicável**: para qualquer chamado, o gestor vê "por que caiu aqui" com o caminho aceso no canvas. Sem prioridade numérica entre fluxos (a precedência é fixa: mais específico vence, AD-041 door 9).
2. **Privacidade decidida no código, não no clique**: o que a liderança vê e onde ela pode estar no caminho continua regra do sistema. O editor recusa o desenho, não confia no gestor.
3. **Uma função de execução**: roteamento real, subida, prazo, simulador e "execuções" chamam o mesmo interpretador do grafo.
4. **Começar pronto**: instituição nova já nasce com o fluxo padrão (aluno → liderança → coordenação → setor) e perfis padrão. Personalizar é opcional.
5. **Não técnico**: o gestor da instituição não é programador. Rótulos em português, sem jargão de automação ("gatilho" vira "Quando o chamado chega", "IF" vira "Separar por").
6. **Celular primeiro**: toda feature daqui segue `.specs/prompt-mobile-first.md` (critérios e checks em 360×780, celular deitado, teclado aberto e toque).
7. **Menor código que resolve**: reusar `Setor`, `AtendenteSetor`, fila, tempo real, `Agendador`, `@xyflow/react`, shadcn/ui. Nada de motor de workflow genérico, BPMN ou dependência nova sem necessidade comprovada no plano.

## 6. Épicos (cada um vira uma feature com `plan.md` próprio)

Ordem recomendada. Nenhum começa antes do anterior estar com PASS, exceto onde dito.

### E0. Fechar a base (`fluxos-atendimento` + F1, F2, F7) — antes do congelamento de 17/11

- Rodar o Verificador independente até PASS ou risco aceito com AD; resolver C104 (crapper) e C106 (specs com API real).
- Traduzir os textos de acessibilidade do canvas com `ariaLabelConfig` do React Flow.
- F1 correção mínima, F2 (decidir: reavaliar ou sair do fluxo), F7 (aviso de setor inativo usado em fluxo publicado).
- Testes que provam cada falha **antes** da correção.

### E1. Motor de fluxos v2: do encadeamento para o grafo

- **Nós** (lista fechada, cada um com ícone e cor por tipo, como as categorias de nós do n8n):
  - *Quando o chamado chega* (gatilho): categorias (uma, várias ou qualquer) + abrangência. Um fluxo pode atender várias categorias.
  - *Separar por* (condição, estilo IF/Switch do n8n): categoria, curso, semestre, turno, situação da matrícula, dentro/fora do horário de atendimento, origem (conversa ou atendimento direto). Sempre com saída "Senão" obrigatória.
  - *Enviar para*: setor, coordenação do curso, liderança do semestre.
  - *Esperar resposta* (prazo): horas úteis ou corridas, com o que acontece quando vence (subir, notificar, ou ambos).
  - *Avisar*: e-mail/push para a equipe da etapa, para o aluno, para o responsável.
  - *Fim*: Triagem, ou encerrar o fluxo deixando o chamado onde está.
  - *Aprovação* (a decidir no plano): alguém da etapa aprova ou recusa, com duas saídas fixas, como no Jira SM e no Freshservice.
- **Validação antes de publicar** (lint com mensagem por nó): nó solto, caminho sem fim, laço sem espera, "Separar por" sem "Senão", liderança depois de qualquer etapa de equipe em algum caminho, liderança como último destino, setor inativo, curso sem coordenação (aviso).
- **Execuções** (inspirado no histórico de execuções do n8n): cada chamado grava os nós por onde passou, com hora e motivo; o detalhe do chamado e a aba "Execuções" do fluxo mostram o caminho aceso no canvas.
- **Fluxo padrão da instituição** (F3) e calendário de atendimento (F5).
- Decisões difíceis de desfazer para o `plan.md` (cada uma com formato literal e alternativa rejeitada): tabelas `no_fluxo` e `ligacao_fluxo` por versão (o plano anterior rejeitou JSON numa coluna; reavaliar com o grafo), `chamado.no_atual_id` no lugar de `etapa_ordem`, tabela de execução append-only, migração das cadeias atuais para grafos equivalentes (cada fluxo publicado hoje deve rotear igual depois: prova por teste com os mesmos casos de `FluxoRoteamentoTests`).

### E2. Templates e sugestões do One

- Galeria de templates na criação do fluxo ("Começar do zero" ou "Usar um modelo"), cada um com descrição, prévia do desenho e o que vai precisar (ex.: "precisa de liderança cadastrada no semestre"). Modelos iniciais:
  1. Liderança → Coordenação → Setor (o padrão do One).
  2. Direto para o setor (sem liderança).
  3. Financeiro com prazo de 24 h úteis e aviso ao aluno.
  4. Estágio e TCC: Coordenação → Setor de estágio.
  5. Fora do horário: avisa o aluno do prazo e entra na fila do dia seguinte.
- "Usar modelo" cria um **rascunho** e pede para mapear os setores que faltam (nunca publica sozinho).
- **Sugestões a partir dos dados**, sem IA generativa: "62 % dos chamados de Boletos foram encaminhados da Triagem para o Financeiro nos últimos 30 dias. Criar um fluxo direto?" (lido dos eventos `ENCAMINHAMENTO`). Botão "Criar rascunho".
- Assistente de configuração na primeira entrada do admin: cria o fluxo padrão, liga categorias, aponta setores.
- Fora do escopo inicial (decidir no plano): gerar fluxo por texto livre com o LLM.

### E3. Editor no estilo n8n (UX)

- Painel de nós com busca e grupos fixos (abre pelo "+" no fim da cadeia, que já existe, e pela tecla `n`, como no n8n; Enter insere, Esc fecha).
- Painel lateral do nó selecionado (já existe: `PainelDoNo.tsx`), com validação inline.
- Notas adesivas no canvas, minimapa, desfazer/refazer, organizar automaticamente, copiar/colar nós, atalhos de teclado com uma folha de atalhos (`?`).
- Barra superior: nome do fluxo, status (Rascunho / Publicado vN / Alterações não publicadas), Simular, Publicar, histórico de versões com diferenças e "restaurar como rascunho".
- Simulação estilo "testar workflow": escolhe um aluno fictício (curso, semestre, categoria, horário) e o caminho acende nó a nó, com o motivo de cada desvio.
- Acessibilidade mantida: lista equivalente, foco por Tab, setas, textos pt-BR, alvos de 44 px, canvas só a partir de 768 px.
- Esses itens estavam no "fora do escopo" do plano de fluxos; entram aqui com critério e check próprios.

### E4. Liderança de turma v2

- Tela "Lideranças": por curso e semestre, quem é o líder (até N por turma), início e fim do mandato, suplente.
- O líder **não ganha `ATENDENTE`**: ganha a designação de liderança, com espaço de trabalho próprio (só os chamados da turma, sem artigos, documentos, indicadores gerais ou fila de outros setores). Resolve F1 na raiz.
- Mandato expira sozinho no fim do período ou quando a matrícula do líder deixa de ser `ATIVA` ou muda de curso/semestre na importação (F4). Chamados abertos com o líder que saiu sobem para a etapa seguinte com evento.
- Termo de confidencialidade aceito pelo líder no primeiro acesso, registrado com data (depende da pergunta 1 do plano de fluxos: a Univag aceita estudante atendendo estudante?).
- Importação de líderes por CSV, igual à de matrículas.

### E5. Usuários, perfis e permissões (inspiração GLPI, Zendesk, Freshdesk)

- **Perfil** = conjunto de direitos por módulo × ação. Módulos: Chamados, Fila, Fluxos, Cadastros, Usuários, Matrículas, Base de conhecimento, Documentos, Indicadores, Aparência. Ações: Ver, Criar, Editar, Excluir/Desativar, Publicar, Exportar (só as que fazem sentido em cada módulo).
- **Escopo** por atribuição: instituição inteira, setores, ou cursos (equivalente às entidades/recursividade do GLPI, reduzido ao que o One tem).
- **Perfis padrão**, que não podem ser apagados (podem ser clonados): Aluno, Líder de turma, Atendente, Coordenador de curso (fila + fluxos + indicadores do próprio curso), Gestor de conhecimento, Administrador. Perfis personalizados criados a partir de um clone.
- Atribuição usuário × perfil × escopo (um usuário pode ter mais de uma). `OPERADOR` continua só por CLI (AD-033).
- Código: uma política central (`Permissoes.Pode(usuario, "fluxos.publicar", escopo)`) substitui os `u.Tem(...)` espalhados; o teste de arquitetura passa a proibir `Tem(Papeis.` fora dela.
- Tela de perfis: matriz de caixas por módulo e ação, com descrição de cada direito e um aviso quando o direito expõe dado pessoal (CPF, matrícula). CPF mascarado salvo direito explícito.
- Tela de usuários: filtros (perfil, setor, ativo), busca, ações em lote, convite por e-mail (o fluxo de primeiro acesso já existe), último acesso, desativar em vez de excluir.
- Auditoria: quem deu ou tirou qual direito, quando (append-only).
- Migração: cada usuário atual ganha o perfil padrão equivalente ao papel que tem hoje; comportamento idêntico provado por teste antes de liberar perfis personalizados.

### E6. Personalização total (com limites)

- Tema: cor primária e de destaque (com o teste de contraste que já existe em `ContrasteDaCor.cs`), arredondamento (3 opções), tema padrão (claro/escuro/sistema), fonte de uma lista curada. Nada de CSS livre.
- Nomenclatura: como a instituição chama "chamado", "líder", "coordenação" e o prefixo do protocolo (`ONE-n` como padrão).
- Categorias visíveis ao aluno com ícone e descrição; campos extras por categoria no formulário de atendimento direto (ex.: "número do boleto"), com tipos fechados (texto, número, data, lista).
- Calendário de atendimento (dias, horas, feriados), usado pelos prazos e pelo nó "Separar por horário".
- Modelos de e-mail e de push editáveis com variáveis fechadas (`{aluno}`, `{protocolo}`, `{etapa}`), com prévia.
- Prévia ao vivo e "voltar ao padrão do One" em tudo (o padrão de `/aparencia` já existe).

### E7. Experiência do aluno

- Linha do tempo do chamado no estilo "rastreio de encomenda": Recebido → Com a liderança do 3º semestre → Com a Coordenação de ADS → Resolvido, com data de cada passo e o prazo esperado da etapa atual (sem mostrar nomes de pessoas da equipe se a instituição não quiser).
- Aviso por push/e-mail quando o chamado muda de etapa ou recebe resposta (push e e-mail já existem).
- Avaliação depois de confirmar a solução (1 a 5 + comentário opcional), que entra nos indicadores. (Hoje CSAT está fora do MVP: decidir.)
- Lista "Minhas solicitações" com filtros e estado claro.

### E8. Experiência da equipe

- Fila com visões salvas e selo de prazo ("vence em 3 h", "vencido").
- No detalhe: "Etapa 2 de 3 · veio da liderança por prazo" com link para a execução.
- Painel do coordenador: tempo médio por etapa, % resolvido na liderança (o indicador que prova o valor do fluxo), chamados que subiram por prazo.
- Respostas prontas sugeridas por categoria/etapa.

## 7. Calendário e prioridade

- Hoje é 08/11. **Congelamento em 17/11, banca em 20/11, entrega final em 27/11.** A Etapa 5 (dados reais da Univag, medição com a IA real, ensaio) já ocupa 09 a 19/11.
- Recomendação: **só o E0 antes do congelamento**. E1 a E8 depois da banca, na ordem E1 → E4 → E5 → E2 → E3 → E7 → E8 → E6 (E4 e E5 resolvem privacidade; E2 e E3 dependem do grafo do E1).
- Se você quiser algo visível na banca além do E0, o candidato de menor risco é a linha do tempo do aluno (E7, parte 1), que não muda schema.

## 8. Perguntas que só o dono do projeto responde

1. A Univag aceita estudante atendendo estudante, vendo nome e resumo, e com qual termo? (bloqueia a liderança com alunos reais)
2. E0 antes de 17/11 e o resto depois da banca: confirma?
3. F2, reclassificar no meio do fluxo: reavaliar pelo fluxo da nova categoria ou tirar do fluxo?
4. CSAT e SLA estavam fora do MVP; entram agora (E7, E1)?
5. Gerar fluxo por texto livre com o LLM entra no E2 ou fica para depois?
6. Domínio próprio por instituição (ex.: `atendimento.univag.edu.br`) entra no E6?

---

## 9. O prompt

Copie o bloco abaixo para um agente novo (Opus 5.5 para Plan e Checks; troque para Sonnet 5.5 no Build, como manda o `AGENTS.md`).

```text
Você vai planejar a evolução do One (D:\one-system), helpdesk acadêmico multi-instituição.

Antes de tudo, leia nesta ordem:
1. AGENTS.md (regras do projeto e o processo SDD: Plan → Checks → Build → Verify).
2. .specs/STATE.md (decisões AD-001 a AD-043 e o ## Handoff) e a seção Confirmed de .specs/LESSONS.md.
3. .specs/prompt-evolucao-one.md inteiro (estado atual, falhas F1 a F9 com evidência, pesquisa de mercado, épicos E0 a E8, calendário e perguntas abertas).
4. .specs/features/fluxos-atendimento/plan.md, checks.md e verification.md.
5. O código citado nas tabelas das seções 1 e 3 daquele arquivo. Confira cada afirmação no código antes de usá-la; se alguma estiver errada, diga qual e corrija o prompt-evolucao-one.md.

Objetivo do produto:
- O fluxo padrão "aluno → líder de sala do semestre → coordenação do curso → outro setor" funciona de ponta a ponta, sem buraco de lógica.
- A instituição cria os fluxos que quiser num editor visual inspirado no n8n (visual e funcionalidades), tem fluxos padrão e templates sugeridos pelo One.
- Usuários e permissões no nível de GLPI/Zendesk/Freshdesk: perfis com matriz de direitos por módulo e ação, escopo por setor ou curso, perfis padrão e personalizados.
- O One é 100% personalizável dentro de limites seguros, e a UX melhora para a equipe e para o aluno.

Regras:
- Siga o AGENTS.md à risca. Nenhum código antes de um plan.md aprovado por mim. Uma feature por épico, em .specs/features/<slug>/, usando historico-frases/ e fluxos-atendimento/ como modelo de formato.
- Respeite os invariantes da seção 3 do prompt-evolucao-one.md e as decisões ativas do STATE.md. Se uma proposta contraria um AD ativo, diga qual e proponha o AD novo em vez de ignorar.
- Para cada falha F1 a F9: escreva primeiro o teste que prova a falha (deve falhar hoje), depois a correção.
- Toda decisão de UI nova cita uma referência pesquisada (n8n, Zendesk, Freshdesk, Jira Service Management, GLPI) registrada no plano. Nada de valor visual inventado; use os tokens de web/src/index.css e os ADs de visual (AD-027 em diante).
- Menor mudança que resolve: reuse Setor, AtendenteSetor, fila, tempo real, Agendador, @xyflow/react e shadcn/ui. Nada de motor BPMN, motor de workflow genérico ou dependência nova sem justificativa no plano.
- Calendário: hoje é 08/11/2026, congelamento em 17/11, banca em 20/11. Antes de 17/11 só o E0, salvo decisão minha em contrário.
- Na dúvida entre caminhos, pergunte antes. Faça as perguntas da seção 8 que bloqueiam o épico em que você estiver.

Entregue agora:
1. Uma lista curta do que você conferiu no código e do que estava diferente do prompt-evolucao-one.md.
2. As perguntas da seção 8 que bloqueiam o E0, numa só mensagem.
3. Depois das minhas respostas: o .specs/features/<slug-do-E0>/plan.md completo (Problem, Flow, Impact, Relations, Surface, Landing com formato literal e alternativa rejeitada, Criteria em EARS, Out of scope, Assumptions, Observable, Sources) e pare esperando meu "aprovado".
4. Só depois do E0 fechado com PASS: o plan.md do E1, e assim por diante na ordem da seção 7.
```
