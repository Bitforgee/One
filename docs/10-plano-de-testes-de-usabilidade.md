# Plano de testes de usabilidade

Este capítulo apresenta o plano dos testes de usabilidade do One. **É um plano: nenhum teste de usabilidade foi executado até agora.** O roadmap prevê esses testes na Fase 2 (Validação), com tarefas reais e sem explicar a interface ao participante. Os testes usam o protótipo visual navegável.

## Objetivos

- Verificar se o aluno resolve uma dúvida com o assistente, sem ajuda.
- Verificar se o aluno abre um chamado quando o assistente não resolve, sem perder o contexto da conversa.
- Verificar se o atendente consegue atender e encaminhar um chamado para outro setor.
- Verificar se a coordenação consegue publicar um artigo e ler os indicadores.
- Identificar barreiras de navegação e pontos de confusão na interface.
- Validar, de forma manual, se uma busca simples na base de conhecimento já resolve as dúvidas, antes de investir em IA.

## Participantes

Os participantes representam os três perfis do One, como mostra o Quadro 10.1. O modelo da PUC Minas recomenda no mínimo 5 participantes.

Quadro 10.1 — Participantes previstos

| Grupo | Perfil no protótipo | Cenários | Quantidade |
| --- | --- | --- | --- |
| Alunos de ADS | Aluno | C1, C2 | [a preencher pelo grupo] |
| Atendentes dos setores | Atendente | C3 | [a preencher pelo grupo] |
| Coordenação dos cursos de tecnologia | Administrador | C4, C5 | [a preencher pelo grupo] |

Fonte: elaborado pelos autores (2026).

Duas perguntas do roadmap ainda estão abertas e podem mudar este quadro: se a coordenação é um setor de atendimento (Q11) e quem vê o painel de indicadores (Q12).

## Ambiente e procedimento

- **Aplicação**: protótipo publicado em <https://bitforgee.github.io/prototipo-v1-one/>. Ele funciona em computador, tablet e smartphone, direto no navegador.
- **Dados**: todos os dados são simulados no navegador. Antes de cada sessão, o moderador restaura os dados pelo menu do usuário, em **Restaurar dados demonstrativos**.
- **Acesso**: o login só seleciona o perfil (Aluno, Atendente ou Administrador). Não há senha.
- **Condução**: o moderador lê a tarefa e não explica a interface. Ele só ajuda se o participante pedir, e registra o pedido.
- **Dispositivo e local de cada sessão**: [a preencher pelo grupo].

## Cenários de teste

Os cinco cenários seguem o fluxo principal do One: perguntar, tentar resolver, registrar, direcionar, atender, resolver e medir. Os requisitos citados são os da especificação do projeto.

Quadro 10.2 — Cenário C1: perguntar ao assistente

| Item | Descrição |
| --- | --- |
| Perfil | Aluno |
| Objetivo | Avaliar se o aluno encontra uma resposta pelo assistente, sem ajuda. |
| Contexto | O aluno precisa de um atestado de escolaridade e não sabe como emitir. |
| Tarefa | "Descubra como emitir seu atestado de escolaridade." |
| Critério de sucesso | O participante abre o assistente, faz a pergunta, lê a resposta e responde Sim ou Não em "Isso resolveu?". |
| Requisitos | RF-01, RF-02, RF-03 |

Fonte: elaborado pelos autores (2026).

Quadro 10.3 — Cenário C2: abrir chamado

| Item | Descrição |
| --- | --- |
| Perfil | Aluno |
| Objetivo | Avaliar se o aluno transforma a conversa em chamado e o encontra depois. |
| Contexto | A resposta do assistente não resolveu o problema do aluno. |
| Tarefa | "A resposta não resolveu. Peça ajuda à equipe e depois encontre o seu pedido." |
| Critério de sucesso | O participante responde Não, confirma a abertura do chamado, vê o protocolo no formato ONE-n e encontra o chamado em "Minhas solicitações". |
| Requisitos | RF-08, RF-09, RF-10 |

Fonte: elaborado pelos autores (2026).

Quadro 10.4 — Cenário C3: atender e encaminhar

| Item | Descrição |
| --- | --- |
| Perfil | Atendente |
| Objetivo | Avaliar se o atendente assume, responde e encaminha um chamado. |
| Contexto | Um chamado chegou à fila do setor do atendente, mas o assunto é de outro setor. |
| Tarefa | "Assuma o chamado indicado, responda ao aluno e encaminhe o chamado para o setor certo." |
| Critério de sucesso | O participante assume o chamado, envia uma resposta pública e o encaminha para outro setor com o motivo registrado. O chamado sai da fila do setor de origem. |
| Requisitos | RF-15, RF-18, RF-20 |

Fonte: elaborado pelos autores (2026).

Quadro 10.5 — Cenário C4: publicar artigo

| Item | Descrição |
| --- | --- |
| Perfil | Administrador |
| Objetivo | Avaliar se a coordenação cria e publica um artigo na base de conhecimento. |
| Contexto | Uma dúvida frequente dos alunos ainda não tem artigo. |
| Tarefa | "Crie um artigo com a resposta para esta dúvida e deixe-o disponível para os alunos." |
| Critério de sucesso | O participante cria o artigo e o publica. O artigo aparece com a situação publicado. |
| Requisitos | RF-24, RF-25 |

Fonte: elaborado pelos autores (2026).

Quadro 10.6 — Cenário C5: consultar indicadores

| Item | Descrição |
| --- | --- |
| Perfil | Administrador |
| Objetivo | Avaliar se a coordenação lê os indicadores sem ajuda. |
| Contexto | A coordenação quer saber quais assuntos geram mais chamados. |
| Tarefa | "Descubra qual categoria tem mais chamados." |
| Critério de sucesso | O participante abre os indicadores e responde a categoria certa. |
| Requisitos | RF-27 |

Fonte: elaborado pelos autores (2026).

Tempo máximo esperado para cada cenário: [a preencher pelo grupo].

Texto da dúvida usada no cenário C4: [a preencher pelo grupo].

## Métodos de coleta de dados

O moderador observa cada sessão e registra as métricas do Quadro 10.7.

Quadro 10.7 — Métricas coletadas por cenário

| Métrica | Tipo | Como coletar |
| --- | --- | --- |
| Conclusão da tarefa | Quantitativa | Sim ou não, pelo critério de sucesso do cenário |
| Tempo | Quantitativa | Segundos entre o fim da leitura da tarefa e a conclusão ou a desistência |
| Erros | Quantitativa | Número de caminhos errados ou ações desfeitas |
| Pedidos de ajuda | Quantitativa | Número de vezes que o participante pediu ajuda ao moderador |
| Comentários e dificuldades | Qualitativa | Anotações do moderador e falas do participante |

Fonte: elaborado pelos autores (2026).

Ao final, o participante responde a um questionário curto:

1. A interface foi fácil de entender?
2. Em qual etapa você teve dificuldade?
3. O que você mudaria?

Para atender à LGPD, os participantes são identificados só como P1, P2 e assim por diante. Nenhum dado que identifique a pessoa entra no registro. Termo de consentimento: [a preencher pelo grupo].

## Cronograma

Datas das sessões de teste: [a preencher pelo grupo].

Os resultados serão registrados no capítulo de registro de testes de usabilidade.
