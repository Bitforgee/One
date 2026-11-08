# Glossário do One

Termos do domínio com valor gravado no banco ou lido da configuração. Cada valor gravado é declarado
uma vez no código, num grupo de constantes de `One.Api/Dados/Entidades.cs`; cada prazo é lido uma vez de
`Prazos:*` em `One.Api/Prazos.cs`. Mudar um valor gravado pede migração dos dados já gravados.

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
| `SUBIDA` | tipo de evento | o chamado subiu à etapa seguinte do próprio fluxo, por um atendente ou pelo prazo da etapa (`de` e `para` guardam os nomes dos setores e `detalhe` o motivo ou `Sem resposta em N horas`); não conta como encaminhamento |

## Fluxos de atendimento (`Fluxo`, `VersaoFluxo`, `EtapaFluxo`)

| Termo | Grupo | Significado |
| --- | --- | --- |
| `Fluxo` | fluxo de atendimento | a cadeia de etapas de uma categoria e de uma abrangência, com versões; substitui a antiga regra por categoria. A transferência usa o fluxo publicado mais específico da categoria: curso e semestre da matrícula, depois só o curso, depois todos os cursos. Sem fluxo publicado, o chamado vai para a Triagem |
| `Abrangência` | fluxo de atendimento | o par curso e semestre de um fluxo, ambos vazios quando vale para todos os cursos; semestre só existe com curso, e não muda depois que o fluxo é criado |
| `Etapa` | fluxo de atendimento | uma posição da cadeia (de 1 a 5) com um tipo de destino, um prazo opcional em horas e a posição no canvas; a versão publicada nunca muda, e o chamado guarda a versão, a etapa e o instante em que entrou nela |
| `Subir` | fluxo de atendimento | passar o chamado à etapa seguinte do próprio fluxo, pelo botão da equipe ou pelo prazo da etapa; grava o evento `SUBIDA` e não soma em `encaminhamentos`, para o caminho previsto não contar como roteamento errado |
| `Liderança` | fluxo de atendimento | um setor com curso e semestre (`setor.curso_id` e `setor.semestre`, os dois juntos), no máximo um ativo por turma; quem é atendente dele é o líder daquela turma. O aluno só chega a ela se aceitar, e o líder (papel `LIDER`, calculado pelo setor do chamado) vê o nome, o curso, o semestre e o resumo, nunca a transcrição, o número da matrícula nem os anexos da conversa |
| `SETOR` | tipo de destino | a etapa aponta para um setor fixo e ativo da instituição; se o setor for desativado depois, a etapa não resolve |
| `COORDENACAO_CURSO` | tipo de destino | a etapa resolve para o setor de coordenação do curso da matrícula do chamado; sem coordenação a etapa não resolve |
| `LIDERANCA_SEMESTRE` | tipo de destino | a etapa resolve para a liderança do curso e do semestre da matrícula; só pode ser a primeira etapa e nunca a última, e sem liderança disponível a etapa não resolve |
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

## Arquivos (`Armazenamento`, chaves `Armazenamento:*`)

| Termo | Chave | Significado |
| --- | --- | --- |
| `Armazenamento` | `Armazenamento:Endpoint`, `Chave`, `Segredo`, `Bucket` | o único código que fala com o MinIO (`One.Api/Armazenamento.cs`): grava os bytes de anexos e PDFs sob chave nova `{instituicaoId}/{anexos ou documentos}/{guid}`, lê pela chave da linha e nunca apaga; o banco guarda só chave, hash SHA-256 e tamanho |
| `AnexoConversa` | `anexo_conversa` | o arquivo (PDF, JPG ou PNG, até 10 MB, até 3 por conversa) que o aluno anexou a uma mensagem da conversa com o assistente; vive em `{instituicaoId}/anexos-conversa/{guid}`, é lido pela IA só como contexto (nunca como fonte) e a equipe o recebe na transcrição do chamado transferido. O `Anexo` continua sendo só o do chamado |

## Tempo real (`/api/tempo-real`)

| Termo | Chave | Significado |
| --- | --- | --- |
| `sinal de mudança` | `ChamadoMudou(numero)`, `FilaMudou()` | aviso sem dado de que um chamado mudou: o hub `TempoRealHub` o manda depois do commit (`AvisarMudanca`) ao grupo `chamado:{instituicaoId}:{numero}` e às filas `fila:{instituicaoId}:{setorId}`; a tela relê pelo `GET` de sempre. O polling de 15 s do `useChamado` segue como rede de segurança (15 s sem conexão, 60 s com ela) |

## Avisos no aparelho (Web Push, chaves `Push:*`)

| Termo | Chave | Significado |
| --- | --- | --- |
| `SubscricaoPush` | `Push:ChavePublica`, `ChavePrivada`, `Assunto` | inscrição de um navegador de um usuário para receber avisos; o `endpoint` é único no banco inteiro e um novo `POST` do mesmo endpoint a move para quem ativou por último |
| `PushSaida` | `Push:*` | aviso a enviar a uma `SubscricaoPush`, com tentativas e próxima tentativa como o `EmailSaida`; o texto não é guardado, o agendador monta o JSON a partir do número do chamado |
| `Aparência` | `instituicao.nome_curto`, `cor`, `login_*`, `assistente_*`, `contato_*` | o que a instituição personaliza: cor (contraste 4,5:1 com o branco), textos do login, nome e perguntas do assistente, contato do atendimento e as imagens; todo campo é opcional e nulo é o padrão do One; vive em `One.Api/Instituicoes/` |
| `ImagemInstituicao` | `Armazenamento:*` | uma imagem da instituição por `tipo` (`logo`, `icone`, `login`, `assistente`), no máximo uma por tipo; trocar sobe a `versao` e grava objeto novo, remover só apaga a linha e o objeto fica no bucket |

## Papéis (`Papeis`, coluna `usuario_papel.papel`)

| Valor gravado | Grupo | Significado |
| --- | --- | --- |
| `OPERADOR` | papel | quem na equipe do One gerencia todas as instituições pela área `/api/plataforma` e pela tela Instituições; vive no usuário da própria instituição e só é dado ou tirado por `dotnet api.dll instituicao operador --slug <slug> --cpf <cpf> [--remover]`, nunca pela tela Usuários |
