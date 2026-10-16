# Documentação de contexto

Este capítulo explica por que o One existe antes de dizer o que ele faz. A ordem é: propósito do documento, cliente, problema, objetivos e justificativa; depois, o público-alvo, o escopo, o que fica de fora, as premissas e os riscos.

## Propósito do documento

Esta documentação registra o ambiente do cliente, o problema que ele enfrenta e a solução que o grupo propõe: o One, do projeto Univag One (BitForge). O trabalho é desenvolvido no Projeto Extensionista Integrador IV do Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas do UNIVAG (UNIVAG, 2026).

O texto faz parte da entrega do Relatório Periódico 3 (RP3), que pede a documentação dos requisitos com diagramas, o protótipo e o retorno do cliente. Ele serve de base para o protótipo, para a implementação e para a avaliação do piloto.

A documentação tem três leitores:

- o professor orientador, que avalia a entrega;
- os integrantes do grupo, que vão implementar o sistema;
- a coordenação dos cursos de tecnologia, que precisa validar as premissas adotadas.

## Cliente

O cliente é a coordenação dos cursos de tecnologia do UNIVAG – Centro Universitário, em Várzea Grande (MT). Essa coordenação cuida dos cursos de tecnologia, entre eles o de Análise e Desenvolvimento de Sistemas (ADS), que é o curso dos integrantes do grupo.

O grupo chegou ao cliente pela própria experiência como alunos: o problema foi buscado na coordenação, como o grupo contou no *pitch* da ideia, em 02/09/2026. Depois, o grupo entrevistou a coordenadora dos cursos de tecnologia em duas sessões, em setembro de 2026 e em 1º de outubro de 2026. Na segunda sessão, o roteiro perguntou sobre fatos já acontecidos, como o número de mensagens da última semana, e evitou perguntas hipotéticas. Os números que o grupo tinha estimado antes foram descartados e trocados pelos que a coordenadora informou.

A primeira sessão descreveu o problema. A segunda cobriu a linha de base e as demandas mais frequentes, e os demais temas do roteiro ficaram para ser respondidos por e-mail. Os achados estão em [Feedback do cliente](acompanhamento/feedback-cliente.md).

## Problema

Os alunos falam com a coordenação por três canais: WhatsApp, e-mail e o ambiente virtual de aprendizagem (AVA). O canal oficial era o WhatsApp e passou a ser o e-mail. Mesmo assim, a maior parte das mensagens ainda chega pelo WhatsApp.

Nada disso fica registrado. A coordenadora contou que manter esse registro é uma exigência do MEC para a instituição. Também não há triagem dos pedidos nem dados sobre o que os alunos mais perguntam. O aluno nem sempre sabe a quem recorrer e, a cada redirecionamento, precisa contar a história de novo.

Na semana anterior à segunda entrevista, a coordenação recebeu cerca de 256 mensagens de alunos em 7 dias: 171 pelo WhatsApp, 70 por e-mail e 15 pelo AVA. Metade delas eram demandas de fato, e 30% eram perguntas simples ou só cumprimentos. O Quadro 1.1 reúne a linha de base informada pela coordenadora. A contagem é de mensagens, e não de demandas, porque um mesmo pedido pode ocupar várias mensagens.

Quadro 1.1 — Linha de base informada pela coordenação

| Indicador | Valor informado | Observação |
| --- | --- | --- |
| Mensagens de alunos nos últimos 7 dias | 171 pelo WhatsApp, 70 por e-mail e 15 pelo AVA, cerca de 256 no total | Contagem aproximada; o WhatsApp concentra cerca de 67% |
| Composição das mensagens | 50% são demandas de fato; 30% são perguntas simples ou apenas cumprimentos | Os 20% restantes não foram classificados (a confirmar) |
| Tempo dedicado | 5 h de atendimento ao aluno e 3 h de trabalho interno | Unidade, por semana ou por dia, a confirmar |
| Tempo por demanda | Fácil: 10 min; média: 30 min; pesada: 60 min | Ela atende uma demanda do começo ao fim, e as outras esperam |
| E-mails de um único curso | 83 e-mails | Período não informado (a confirmar) |

Fonte: elaborado pelos autores com base na entrevista com a coordenação (2026).

A coordenadora divide cerca de 40 horas semanais entre aulas, coordenação dos cursos e gestão dos professores. Sobra pouco tempo para as demandas dos alunos. Ela atende uma demanda de cada vez, e as outras ficam esperando.

O que mais toma tempo é encontrar os dados do aluno, como curso e semestre. Isso atrasa até perguntas simples, como "qual é o meu e-mail institucional".

As demandas mais citadas foram o boleto do semestre e o atestado de escolaridade. O próprio aluno já consegue resolver as duas no Portal do Aluno. O serviço existe; o aluno é que não sabe onde encontrá-lo.

Ainda faltam dados. A coordenadora não disse quanto tempo o aluno espera pela primeira resposta, só quanto dura cada atendimento. A unidade das horas de atendimento e o volume de cada tipo de demanda também estão a confirmar.

## Objetivos

### Objetivo geral

Documentar o ambiente do cliente, a coordenação dos cursos de tecnologia do UNIVAG, as necessidades e os problemas do atendimento aos alunos e a proposta de solução One, de forma que o grupo possa implementar o produto mínimo viável e a coordenação possa validá-lo.

### Objetivos específicos

1. Levantar com a coordenação a situação atual do atendimento e registrar a linha de base de volume e de tempo (Quadro 1.1).
2. Especificar os requisitos funcionais e não funcionais do produto mínimo viável, cada requisito funcional ligado a uma regra de negócio, e os casos de uso ([Especificação do projeto](02-especificacao-do-projeto.md)).
3. Prototipar o fluxo principal e publicar o protótipo navegável ([Projeto de interface](04-projeto-de-interface.md)).
4. Validar com a coordenação as premissas Q5 a Q19 (Quadro 1.3) e trocar cada premissa pela resposta recebida.
5. Definir como medir o piloto, comparando os indicadores do One com a linha de base (Quadro 1.2).

O Quadro 1.2 mostra os indicadores que vão medir o resultado do piloto. As definições vêm da especificação de regras de negócio do projeto. As metas que ainda não foram decididas estão marcadas.

Quadro 1.2 — Indicadores para medir o piloto

| Indicador | Como é medido | Linha de base | Meta |
| --- | --- | --- | --- |
| Tempo até a primeira resposta | Da criação do chamado até a primeira resposta pública de um atendente | Não informado: a coordenadora deu o tempo de atendimento, e não o de espera | [a preencher pelo grupo] |
| Tempo de resolução | Da criação do chamado até a última transição para Resolvido | Não medido; cada atendimento leva 10, 30 ou 60 min | [a preencher pelo grupo] |
| Taxa de autoatendimento | Conversas resolvidas pelo autoatendimento divididas pelas conversas com desfecho | Não existe hoje, porque não há assistente | De 20% a 40%, proposta do grupo ainda a decidir |
| Mensagens diretas à coordenação | Contagem fora do sistema, por canal, incluindo o WhatsApp | Cerca de 256 mensagens em 7 dias | [a preencher pelo grupo] |

Fonte: elaborado pelos autores com base na entrevista com a coordenação, na especificação de regras de negócio e no roadmap do projeto (2026).

## Justificativa

O projeto se justifica por quatro motivos.

O primeiro é o registro. Hoje nenhum atendimento fica registrado, e a coordenadora relatou que esse registro é uma exigência do MEC. O instrumento de avaliação institucional do INEP pede canais de comunicação com a comunidade e que as manifestações gerem melhorias (BRASIL, 2017). Ainda falta confirmar qual indicador se aplica e por quanto tempo o registro precisa ser guardado. No One, cada passo do chamado fica no histórico, com autor, data e hora, e nada pode ser apagado.

O segundo é o tempo da coordenadora. Metade das cerca de 256 mensagens semanais são demandas de fato, ou seja, cerca de 128. Se cada uma fosse uma demanda atendida em pelo menos 10 minutos, seriam cerca de 21 horas por semana, dentro de uma jornada de 40 horas que também inclui aulas e gestão. Boa parte dessas demandas já tem resposta conhecida, como o boleto e o atestado no Portal do Aluno ou a regra de faltas do Estatuto do Aluno. O One responde essas perguntas com artigos e entrega o chamado ao setor já com o curso e o semestre do aluno.

O terceiro é a expectativa realista sobre o autoatendimento. Os fornecedores anunciam que o assistente resolve de 65% a 98% dos casos, mas uma pesquisa independente com clientes aponta que só 14% das questões são resolvidas por completo no autoatendimento (GARTNER, 2024). Por isso, no One, o assistente só responde com base nos artigos publicados. A resolução pelo autoatendimento só conta quando o aluno responde "Sim". Quando a resposta não resolve, o sistema sempre oferece abrir um chamado.

O quarto são os dados. Hoje não se sabe o que os alunos mais perguntam. Com o One, a coordenação passa a ter indicadores como as principais categorias, o tempo até a primeira resposta e a taxa de autoatendimento.

Relação com os Objetivos de Desenvolvimento Sustentável (ODS): [a preencher pelo grupo].

## Público-alvo

O One tem três perfis de usuário. Uma mesma pessoa pode ter mais de um perfil.

- **Alunos.** No piloto, são os alunos de Análise e Desenvolvimento de Sistemas. Hoje eles usam principalmente o WhatsApp para falar com a coordenação, e a maior parte das mensagens chega pelo celular. Muitas vezes não sabem onde encontrar um serviço que já existe, como o boleto no Portal do Aluno. Conhecimentos prévios e relação com a tecnologia: [a preencher pelo grupo].
- **Atendentes dos setores.** São os funcionários dos setores que recebem chamados, como a coordenação de curso e a Central de Atendimento ao Estudante (CAE). Pela premissa Q11, a coordenadora é atendente do setor da coordenação. A CAE resolve hoje as questões financeiras, os pagamentos e os documentos pessoais. O piloto prevê até três setores.
- **Administrador.** É o responsável pela configuração do sistema: usuários, setores, categorias, regras de roteamento e base de conhecimento. Também consulta os indicadores. Quem vai ser o administrador no piloto: [a preencher pelo grupo].

Os professores resolvem várias demandas, como estágio, trabalho de conclusão de curso e nota lançada errada, mas não são usuários do produto mínimo viável. Pela premissa Q18, um artigo orienta o aluno a procurar o professor diretamente.

## Escopo

O produto mínimo viável cobre um único fluxo, do começo ao fim: o aluno pergunta, o sistema tenta resolver, registra o pedido, direciona ao setor, o atendente atende e resolve, e os resultados são medidos.

> perguntar → tentar resolver → registrar → direcionar → atender → resolver → medir

Para isso, o produto tem oito módulos:

1. identidade e acesso;
2. base de conhecimento;
3. assistente que só responde a partir da base;
4. transformação da conversa em chamado;
5. roteamento por categoria;
6. ciclo de vida e atendimento do chamado;
7. histórico auditável;
8. indicadores.

O piloto previsto é pequeno. Ele envolve uma instituição (o UNIVAG), uma coordenação (a dos cursos de tecnologia), os alunos de Análise e Desenvolvimento de Sistemas, até três setores e de dez a trinta artigos na base de conhecimento.

Os requisitos de cada módulo estão em [Especificação do projeto](02-especificacao-do-projeto.md).

## Fora do escopo

Esta lista registra o que foi combinado como fora do produto mínimo viável. Um pedido que caia nela é tratado como mudança de escopo e não entra sem uma nova decisão registrada.

Ficam de fora do produto mínimo viável:

- aplicativo nativo, atendimento pelo WhatsApp, notificações *push* e *chat* em tempo real;
- integrações com o Moodle, o sistema acadêmico, o Portal do Aluno ou o sistema financeiro;
- prioridade de chamados e acordos de nível de serviço (SLA);
- roteamento por inteligência artificial e detecção automática de incidentes coletivos;
- criação automática de artigos a partir de chamados resolvidos;
- artigos diferentes por curso ou perfil, uso por várias instituições, exportação de relatórios e pesquisa de satisfação.

## Premissas

Premissa é o que o grupo considera verdadeiro antes de executar o projeto, sem ter certeza. Ela pode se confirmar ou não durante a execução. Por isso, toda premissa ainda não confirmada também é tratada como risco na seção Riscos.

### Premissas do projeto

Estas premissas tratam da equipe, do calendário e da disponibilidade do cliente.

- O calendário do PEI IV se mantém: os prazos são fixos, e cada atraso desconta 0,5 ponto (UNIVAG, 2026).
- Quando um prazo chega antes da resposta da coordenação, o grupo segue a premissa adotada e a registra. A resposta da coordenação substitui a premissa quando chegar.
- A coordenação continua disponível para responder, por e-mail, às questões que ficaram fora das duas sessões de entrevista.
- A coordenação indica os setores que participam do piloto, os atendentes de cada setor e o conteúdo dos primeiros artigos.
- A instituição entrega ao administrador a lista de alunos, com curso e semestre, para a criação das contas.
- O uso do ASP.NET Core no *back-end* é aceito, porque a seção 2.1.4 do manual admite outras tecnologias além de PHP, Java e Node.js (UNIVAG, 2026). O grupo ainda vai confirmar isso com o professor orientador.
- Disponibilidade semanal de cada integrante para o projeto: [a preencher pelo grupo].

### Premissas do produto

Para funcionar, o One depende de algumas condições:

- o Portal do Aluno continua oferecendo o boleto, o atestado e os outros serviços para os quais os artigos apontam;
- há um provedor externo de IA disponível para interpretar as perguntas, e a instituição aceita esse uso com aviso ao aluno (premissa Q13);
- há um serviço de envio de e-mail para notificar os alunos;
- alunos e atendentes usam navegadores atuais, com suporte a aplicações web progressivas.

Algumas decisões do produto dependem de respostas da coordenação que ainda não chegaram. Para não atrasar o calendário da disciplina, o grupo adotou uma premissa para cada questão em aberto, como mostra o Quadro 1.3. Quando a coordenação responder, a resposta substitui a premissa e passa a valer como requisito.

Quadro 1.3 — Premissas adotadas para as questões em aberto

| Questão | Tema | Premissa adotada | Situação |
| --- | --- | --- | --- |
| Q5 | Autenticação | Contas locais criadas pelo administrador, uma a uma ou por importação em lote; no piloto não há *login* institucional | a confirmar com a coordenação |
| Q6 | Inatividade da conversa | A conversa em que o aluno não responde por 30 minutos é encerrada como abandonada | a confirmar com a coordenação |
| Q7 | Prazo de confirmação | O aluno tem 7 dias corridos para confirmar ou rejeitar a resolução; depois disso o chamado é fechado automaticamente | a confirmar com a coordenação |
| Q8 | Troca de responsável | Qualquer atendente do setor pode assumir um chamado atribuído a um colega, e a troca fica no histórico | a confirmar com a coordenação |
| Q9 | Anexos | Permitidos nas respostas públicas: PDF, JPG e PNG, com até 10 MB cada | a confirmar com a coordenação |
| Q10 | Tempo nos indicadores | Os tempos são medidos em tempo corrido, sem descontar o horário fora do expediente | a confirmar com a coordenação |
| Q11 | Coordenação como setor | A coordenação de cada curso é um setor comum, e a coordenadora é atendente desse setor | a confirmar com a coordenação |
| Q12 | Acesso ao painel | Só o administrador vê o painel de indicadores | a confirmar com a coordenação |
| Q13 | Uso de IA externa | As mensagens dos alunos podem ser processadas por um provedor externo de IA, com aviso visível; os anexos nunca são enviados | a confirmar com a coordenação |
| Q14 | Representantes de turma | Os representantes não entram no produto mínimo viável | a confirmar com a coordenação |
| Q15 | Exigência do MEC | O histórico é mantido sem exclusão; ainda faltam o prazo de retenção e o formato que o MEC exige | a confirmar com a coordenação |
| Q16 | Funil de demandas | As categorias iniciais saem das demandas citadas pela coordenação; ainda falta o volume de cada tipo | a confirmar com a coordenação |
| Q17 | Linha de base | Os valores do Quadro 1.1 são a referência para comparar o piloto; alguns pontos ainda estão pendentes | a confirmar com a coordenação |
| Q18 | Demandas do professor | Essas demandas não são roteadas ao professor; um artigo orienta o aluno a procurá-lo diretamente | a confirmar com a coordenação |
| Q19 | Dados do aluno | O cadastro do aluno inclui curso e semestre, carregados na importação | a confirmar com a coordenação |

Fonte: elaborado pelos autores (2026).

## Riscos

O Quadro 1.4 lista os riscos do projeto, o impacto de cada um e a resposta planejada. Ele inclui os riscos do roadmap do projeto e as premissas ainda não confirmadas.

Quadro 1.4 — Riscos do projeto

| Risco | Impacto | Resposta |
| --- | --- | --- |
| Prazos fixos do PEI IV chegarem antes das respostas da coordenação | Desconto de 0,5 ponto por entrega atrasada | Seguir as premissas adotadas, registrá-las e trocar cada uma pela resposta quando ela chegar |
| Construir o produto antes de provar o problema | O produto pode não resolver o problema real da coordenação | Avançar de fase só depois do critério de saída da anterior; começar o código pelos módulos que não dependem de questões em aberto |
| Fatia do produto mínimo viável (oito módulos) grande para cerca de cinco semanas de código até 20/11 | Funcionalidades incompletas na demonstração de 27/10 ou na banca de 20/11 | Definir o que precisa estar pronto em 27/10 e o que fica para 20/11 |
| Crescimento do escopo, com pedidos como integração com Moodle ou WhatsApp | Módulos pela metade em vez do fluxo completo funcionando | A lista da seção Fora do escopo é vinculante |
| Assistente inventar uma regra da instituição, como nos casos Air Canada e Cursor, descritos na [pesquisa de mercado](pesquisas/One_Pesquisa_Mercado_Helpdesks.md) | O aluno recebe orientação errada, e a instituição responde pelo que o assistente diz | Responder só com base em artigos publicados e informar quando não encontrar resposta |
| Aluno preso em respostas repetidas, sem chegar a uma pessoa | O aluno fica sem atendimento e se frustra | Sempre oferecer a abertura de chamado quando a resposta não resolver |
| Expectativa exagerada de autoatendimento, com base nos 65% a 98% anunciados pelos fornecedores | Meta do piloto impossível de alcançar | Meta proposta de 20% a 40%, considerando que só 14% das questões são resolvidas por completo no autoatendimento (GARTNER, 2024) |
| Linha de base incompleta: unidade das horas, tempo de espera do aluno, período dos 83 e-mails e 20% de mensagens sem classificação | Piloto sem prova de melhora | Usar a contagem por canal de 7 dias já obtida e enviar os pontos pendentes à coordenação por e-mail |
| WhatsApp, com cerca de 67% das mensagens, fora do produto mínimo viável | Uma queda nos e-mails pode significar apenas que os alunos trocaram de canal | Contar também as mensagens do WhatsApp na comparação do piloto; tratar o WhatsApp como canal extra numa fase futura de integrações |
| Exigência do MEC não identificada: prazo de retenção e formato do registro desconhecidos (Q15) | Pode mudar a retenção e pedir relatório ou exportação do histórico; o diferencial "registro para o MEC" pode não se confirmar | Manter o histórico sem exclusão; se a exigência não se confirmar, apresentar o diferencial como rastreabilidade |
| Mensagens dos alunos processadas por um provedor externo de IA (Q13) | Exposição de dados pessoais protegidos pela LGPD (BRASIL, 2018) | Aviso visível ao aluno antes da primeira mensagem; anexos nunca enviados ao provedor |
| Demandas resolvidas pelo professor não chegam a ele pelo roteamento por setor (Q18) | Parte das demandas fica sem destino no One | Um artigo orienta o aluno a procurar o professor diretamente |
| Premissas Q5 a Q19 não confirmadas pela coordenação | Requisitos e regras podem mudar depois de especificados | Cada resposta diferente da premissa entra em uma nova versão da documentação |

Fonte: elaborado pelos autores com base no roadmap do projeto (2026).
