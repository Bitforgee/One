# Glossário do One

Termos do domínio com valor gravado no banco ou lido da configuração. Cada valor gravado é declarado
uma vez no código, num grupo de constantes de `api/Dados/Entidades.cs`; cada prazo é lido uma vez de
`Prazos:*` em `api/Prazos.cs`. Mudar um valor gravado pede migração dos dados já gravados.

## Tipos de evento do chamado (`TiposEvento`, coluna `evento_chamado.tipo`)

| Valor gravado | Grupo | Significado |
| --- | --- | --- |
| `CRIACAO` | tipo de evento | o chamado foi criado, pela transferência da conversa ou pelo atendimento direto |
| `TRANSICAO` | tipo de evento | o estado do chamado mudou (`de` e `para` guardam os estados) |
| `ATRIBUICAO` | tipo de evento | o responsável mudou (`de` e `para` guardam os nomes), inclusive quando o responsável é desativado |
| `LEMBRETE` | tipo de evento | o Sistema lembrou o aluno de responder um chamado em `AGUARDANDO_ALUNO` |
| `NOTA` | tipo de evento | um atendente escreveu uma nota interna, que o aluno não vê |
| `RESPOSTA` | tipo de evento | alguém escreveu uma mensagem pública no chamado |
| `ANEXO` | tipo de evento | um arquivo foi anexado a uma mensagem (`detalhe` guarda o nome) |
| `ENCAMINHAMENTO` | tipo de evento | o chamado foi para outro setor (`de` e `para` guardam os nomes dos setores) |
| `RECLASSIFICACAO` | tipo de evento | a categoria do chamado mudou (`de` e `para` guardam os nomes) |

## Tipos de mensagem do chamado (`TiposMensagem`, coluna `mensagem_chamado.tipo`)

| Valor gravado | Grupo | Significado |
| --- | --- | --- |
| `PUBLICA` | tipo de mensagem | mensagem que o aluno e a equipe veem |
| `NOTA` | tipo de mensagem | nota interna, só para a equipe do setor |

## Motivos de fechamento (`MotivosFechamento`, coluna `chamado.motivo_fechamento`)

| Valor gravado | Grupo | Significado |
| --- | --- | --- |
| `CONFIRMADO` | motivo de fechamento | o aluno confirmou que a resolução resolveu |
| `CANCELADO` | motivo de fechamento | o aluno cancelou o pedido antes da resolução |
| `DUPLICADO` | motivo de fechamento | a equipe marcou o chamado como repetição de outro do mesmo aluno; sai dos indicadores |
| `FECHADO_AUTOMATICAMENTE` | motivo de fechamento | o prazo de confirmação passou sem o aluno confirmar nem rejeitar |

## Prazos do atendimento (`Prazos`, chaves `Prazos:*`)

| Termo | Chave | Padrão | Significado |
| --- | --- | --- | --- |
| prazo de abandono | `Prazos:AbandonoMinutos` | 30 min | conversa com o assistente sem mensagem nova por esse tempo vira `ABANDONADA` |
| prazo de confirmação | `Prazos:ConfirmacaoDias` | 7 dias | chamado `RESOLVIDO` há esse tempo fecha sozinho com `FECHADO_AUTOMATICAMENTE` |
| prazo de rejeição | `Prazos:ConfirmacaoDias` | 7 dias | o aluno pode rejeitar a resolução até esse tempo depois dela; é o mesmo valor do prazo de confirmação, para o aluno poder rejeitar enquanto o chamado não fecha |
| prazo de lembrete | `Prazos:LembreteAguardandoDias` | 3 dias | chamado em `AGUARDANDO_ALUNO` há esse tempo gera um lembrete por e-mail, uma vez |
| prazo de resolver aguardando | `Prazos:ResolverAguardandoDias` | 7 dias | chamado em `AGUARDANDO_ALUNO` há esse tempo é resolvido pelo Sistema por falta de resposta |
