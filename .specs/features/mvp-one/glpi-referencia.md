# GLPI como referência do backoffice do One

Engenharia reversa do código do GLPI 12.0.1 (`github.com/glpi-project/glpi`, tag `12.0.1`), feita em 01/11/2026.
Só ideias: nenhum código do GLPI entra no One (GPLv3).
Legenda: ADOPT = usar como está; ADAPT = versão simplificada; SKIP = fora do MVP.

| Mecânica do GLPI | Como o GLPI faz (fonte em `src/`) | One | plan.md |
|---|---|---|---|
| Status e transições | matriz de/para por perfil (`CommonITILObject::isAllowedStatus`) | ADAPT: matriz fixa no código | AC 50–62 |
| Novo → Atribuído | automático ao atribuir (`CommonITILActor::post_addItem`) | ADOPT | AC 50, 51 |
| Volta para Novo sem responsável | `CommonITILActor::post_deleteFromDB` | ADAPT: atendente desativado devolve os chamados para `ABERTO` | gap (AC 83 só preserva) |
| Solicitante escreve e reabre | `CommonITILObject::needReopen` em WAITING/SOLVED/CLOSED | ADAPT: definir o efeito de uma mensagem do aluno em `RESOLVIDO` | gap (AC 54 trata AGUARDANDO; AC 62 trata FECHADO) |
| Pegar livre / tomar de outro | direitos `Ticket::OWN` / `Ticket::STEAL` | ADOPT | AC 50, 52 |
| Take into account | 1ª ação do técnico, gravada uma vez (`Ticket::updateDateMod`) | ADAPT: data da 1ª resposta pública no chamado | AC 64, Quadro 12 |
| Acompanhamento público/privado | `ITILFollowup.is_private` | ADOPT, imutável (o GLPI permite editar e apagar) | AC 49, 65 |
| Aceitar/recusar a solução | `add_close` / `add_reopen` com motivo obrigatório | ADOPT | AC 55–59 |
| Fechamento automático | `Ticket::cronCloseTicket` + `autoclose_delay` | ADOPT | AC 90–92 |
| Responsável padrão da categoria | `ITILCategory.groups_id`, aplicado depois das regras | ADOPT (REGRA_ROTEAMENTO) | AC 38–40, 85 |
| Árvore de categorias | `CommonTreeDropdown` | SKIP | Out of scope |
| Motor de regras | `RuleTicket`, ranking, regras encadeadas | SKIP: uma regra por categoria | AC 85–87 |
| Templates de chamado | campos obrigatórios/ocultos/predefinidos | ADAPT opcional: não resolver em "Não classificado" | gap opcional |
| Histórico | `glpi_logs`, purgável, autor em texto | One é mais forte (append-only) | AC 64, 65 |
| Lixeira e purga | `is_deleted` + cron `purgeticket` | SKIP: cancelar, nunca excluir | AC 60 |
| FAQ e visibilidade dirigida | `is_faq` + alvos por grupo/perfil | SKIP: no One os artigos são internos, só fonte da IA (AD-012) | — |
| Validade do artigo | `KnowbaseItem.begin_date/end_date` | ADAPT: datas opcionais para o catálogo | gap |
| Revisões de artigo | snapshot da versão anterior | ADOPT | AC 31, 73 |
| Artigo a partir da solução | `_sol_to_kb`, manual | ADAPT: botão "criar rascunho a partir da resolução" | gap (P3) |
| Eventos de e-mail | `new`, `solved`, `add_followup`, `assign_group`… | ADAPT: + "chamado registrado" (aluno) e "novo chamado no setor" (atendentes) | gap em AC 93–95 |
| Fila de e-mail com novas tentativas | `QueuedNotification` + cron, `smtp_max_retries` | ADAPT: tabela outbox lida pelo agendador | gap: AC 96 perde o e-mail |
| Tempo pendente descontado | `waiting_duration` sai do tempo de solução | ADAPT: decidir se `AGUARDANDO_ALUNO` conta | decisão (Q10 = tempo corrido) |
| Horário útil | `Calendar::getActiveTimeBetween` | SKIP (sem SLA) | Out of scope |
| Contagens e médias | `Stat.php`, `Dashboard/Provider.php` | ADOPT | S10, AC 100 |
| Aprovação | `TicketValidation` | SKIP (ITIL) | — |
| Duplicados e fusão | `DUPLICATE_WITH`, `Ticket::merge` | ADAPT: fechar como "duplicado de ONE-n" | gap |
| Cobrança de pendência | `PendingReasonCron` (lembra e resolve sozinho) | ADAPT: `AGUARDANDO_ALUNO` parado → lembrete → fechamento | gap (S8) |
| Respostas prontas | `SolutionTemplate`, `ITILFollowupTemplate` | ADAPT: lista simples por setor | gap (P3) |
| Alerta de chamado parado | `cronAlertNotClosed` | ADAPT: e-mail ao setor sobre `ABERTO` há N dias (não é SLA) | gap |

Não verificado: a documentação oficial; como a 12.0 mostra o artigo ligado à categoria; se o GLPI trata edição concorrente (AC 63).

Decisões de 01/11/2026, aplicadas em `plan.md`: entram no plano os critérios 86–87 (resposta em `RESOLVIDO`), 112 (atendente desativado), 125–126 (fila de e-mail) e 133 (desconto da espera), na numeração do plano reescrito. Ficam no P3, slice S13, os critérios 145–150 (cobrança de pendência, respostas prontas, duplicado, validade de artigo). Os outros GAPs não entram.
