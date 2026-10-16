# One — Central Inteligente de Atendimento Universitário

## 1. Visão Geral

**One** é uma plataforma inteligente de atendimento universitário criada para centralizar dúvidas, solicitações e demandas acadêmicas em um único ponto de contato.

A proposta é substituir o atendimento fragmentado por WhatsApp, e-mail, mensagens diretas e outros canais informais por um fluxo único, rastreável e escalável.

O One combina três elementos principais:

- **Assistente inteligente**
- **Base de conhecimento institucional**
- **Módulo de chamados e atendimento humano**

A ideia central é simples:

> **O aluno não precisa saber quem resolve. O One precisa.**

O aluno explica o que precisa em linguagem natural. O sistema tenta resolver a demanda imediatamente utilizando a base de conhecimento. Caso não consiga, a própria interação é transformada em uma solicitação rastreável, contextualizada e direcionada ao setor responsável.

---

# 2. Problema

Em muitas instituições de ensino, o atendimento acadêmico ocorre de maneira descentralizada.

Os alunos utilizam canais como:

- WhatsApp;
- e-mail;
- mensagens diretas;
- coordenação;
- secretaria;
- professores;
- grupos de turma;
- atendimento presencial.

Esse modelo gera diversos problemas.

## 2.1 Perda de histórico

Conversas ficam espalhadas por celulares, e-mails ou contas pessoais.

Não existe um histórico institucional completo da solicitação.

## 2.2 Falta de rastreabilidade

É difícil responder perguntas como:

- Quem recebeu a solicitação?
- Quando ela foi enviada?
- Quem está tratando?
- Quanto tempo levou para responder?
- A solicitação foi realmente resolvida?

## 2.3 Sobrecarga da coordenação

Dúvidas de baixa complexidade chegam diretamente à coordenação.

Exemplos:

- Como emitir boleto?
- Onde encontro meu atestado?
- Como solicitar determinado documento?
- Onde encontro determinado serviço?
- Como acessar o portal?

Essas solicitações competem com atividades estratégicas da coordenação.

## 2.4 Falta de triagem

O aluno precisa descobrir sozinho qual setor procurar.

Em muitos casos, a própria instituição possui uma estrutura organizacional que o aluno não conhece.

## 2.5 Falta de dados

Quando o atendimento acontece apenas por mensagens, a instituição perde a oportunidade de identificar:

- assuntos mais recorrentes;
- setores mais demandados;
- cursos com maior volume de solicitações;
- problemas coletivos;
- tempo médio de atendimento;
- dúvidas que poderiam ser automatizadas.

---

# 3. Proposta de Valor

O One propõe transformar o atendimento universitário de um modelo:

> **reativo, fragmentado e dependente de pessoas**

em um modelo:

> **centralizado, inteligente, rastreável e orientado por dados.**

A principal proposta de valor é:

> **Tudo o que o aluno precisa, em um único lugar.**

O One deve funcionar como uma camada de atendimento entre o aluno e a instituição.

---

# 4. Conceito Central

O One não deve ser apresentado apenas como um sistema de chamados.

Sua proposta é ser uma:

> **Camada inteligente de atendimento universitário.**

O sistema conecta:

```text
Aluno
  ↓
Assistente
  ↓
Base de Conhecimento
  ↓
Solicitação
  ↓
Triagem
  ↓
Setor responsável
  ↓
Atendimento humano
  ↓
Resolução
  ↓
Dados e conhecimento
```

---

# 5. Princípio de Produto

O principal princípio do One é:

> **No One, o aluno não abre um chamado. Ele explica o problema.**

O sistema deve cuidar do restante.

Outro princípio importante:

> **Do autoatendimento ao atendimento humano, sem começar de novo.**

Se o assistente não resolver a demanda, o aluno não deverá preencher novamente todas as informações em um formulário tradicional.

A conversa deve ser aproveitada como contexto para gerar a solicitação.

---

# 6. Inspiração no GLPI

O módulo de chamados do One pode utilizar o GLPI como referência conceitual para seu backoffice.

Elementos úteis do GLPI:

- chamados;
- filas;
- categorias;
- responsáveis;
- grupos;
- histórico;
- anexos;
- prioridade;
- status;
- SLA;
- comentários;
- notificações;
- dashboards.

Entretanto, o One **não deve ser uma cópia do GLPI**.

O GLPI serve como referência para o mecanismo interno de atendimento.

A experiência do aluno deve ser muito mais simples.

## 6.1 Help desk tradicional

```text
Aluno
  ↓
Escolhe categoria
  ↓
Preenche formulário
  ↓
Descreve o problema
  ↓
Abre chamado
  ↓
Técnico interpreta
  ↓
Encaminha
  ↓
Resolve
```

## 6.2 Modelo One

```text
Aluno
  ↓
Explica o problema
  ↓
One interpreta
  ↓
Consulta a base de conhecimento
  ↓
Resolve?
 ├── Sim → encerra
 └── Não
       ↓
Conversa vira solicitação
       ↓
Classificação
       ↓
Direcionamento
       ↓
Atendimento humano
```

---

# 7. Diferencial do One

O diferencial do One não está em possuir isoladamente:

- inteligência artificial;
- chatbot;
- chamados;
- base de conhecimento.

Todas essas tecnologias já existem.

O diferencial está na forma como elas são combinadas especificamente para o contexto universitário.

## 7.1 Entrada por linguagem natural

Em vez de preencher um formulário:

```text
Categoria:
Subcategoria:
Setor:
Prioridade:
Assunto:
Descrição:
```

o aluno pode simplesmente escrever:

> Minha nota de Arquitetura de Software ainda não apareceu.

O One interpreta a intenção e identifica o contexto.

---

## 7.2 Conhecimento antes do chamado

O sistema tenta resolver a solicitação antes de gerar um ticket.

Fluxo:

```text
Pergunta
  ↓
Base de conhecimento
  ↓
Resposta
  ↓
Resolveu?
```

Somente quando necessário existe atendimento humano.

---

## 7.3 Conversa vira chamado

Este é um dos principais diferenciais do MVP.

Exemplo:

```text
Aluno:
Como emitir meu atestado?

One:
Acesse o Portal do Aluno > Documentos > Atestado de Matrícula.

Isso resolveu?
[ Sim ] [ Não ]
```

Caso o aluno responda "Não":

```text
One:
Entendi.

Vou registrar uma solicitação para a equipe responsável.
```

O sistema pode gerar:

```text
Solicitação #ONE-1048

Categoria:
Acadêmico > Documentos

Assunto:
Problema para emitir atestado

Contexto:
Conversa realizada anteriormente com o assistente.

Setor:
Secretaria Acadêmica
```

O aluno não precisa começar novamente.

---

# 8. Inovação do Projeto

A inovação do One pode ser apresentada por meio de quatro conceitos.

## 8.1 Atendimento universitário contextual

O One conhece conceitos acadêmicos como:

- aluno;
- curso;
- turma;
- disciplina;
- professor;
- período;
- campus;
- coordenação;
- secretaria;
- setor.

Isso permite que as solicitações tenham contexto acadêmico.

---

## 8.2 Continuidade entre IA e atendimento humano

A conversa do assistente acompanha o ticket.

O atendente recebe:

- pergunta original;
- respostas do assistente;
- categoria identificada;
- contexto acadêmico;
- histórico da interação.

Isso evita retrabalho.

---

## 8.3 Roteamento inteligente

O aluno não precisa descobrir quem deve resolver sua demanda.

Exemplo:

```text
"Minha nota não apareceu."
        ↓
Acadêmico
        ↓
Notas
        ↓
Curso
        ↓
Turma
        ↓
Disciplina
        ↓
Coordenação responsável
```

---

## 8.4 Ciclo contínuo de conhecimento

A resolução humana pode gerar novo conhecimento.

```text
Pergunta
  ↓
Base de conhecimento
  ↓
Não resolveu
  ↓
Ticket
  ↓
Atendimento humano
  ↓
Resolução
  ↓
Novo conhecimento
  ↓
Base de conhecimento
  ↺
```

Com isso, dúvidas que exigiram intervenção humana hoje podem ser resolvidas automaticamente no futuro.

---

# 9. Hipótese do MVP

A principal hipótese a ser validada é:

> **Se fornecermos ao aluno um único ponto de atendimento capaz de responder automaticamente dúvidas conhecidas e transformar problemas não resolvidos em solicitações rastreáveis, podemos reduzir demandas simples direcionadas à coordenação e melhorar a organização do atendimento acadêmico.**

---

# 10. Objetivo do MVP

O MVP deve provar que é possível criar um fluxo onde:

1. o aluno pergunta;
2. o One tenta resolver;
3. se não resolver, a interação vira solicitação;
4. a solicitação é encaminhada;
5. um atendente continua o atendimento;
6. todo o histórico é preservado;
7. a instituição consegue medir o processo.

O MVP não precisa resolver todos os problemas da universidade.

Ele precisa validar esse fluxo.

---

# 11. Escopo do MVP

O MVP pode ser organizado em seis capacidades principais.

```text
ONE MVP
│
├── 1. Identidade
├── 2. Assistente
├── 3. Base de Conhecimento
├── 4. Chamados
├── 5. Roteamento
└── 6. Indicadores
```

---

# 12. Módulo 1 — Identidade

Funções básicas:

- autenticação;
- usuário;
- perfil;
- aluno;
- atendente;
- administrador.

## Perfis iniciais

### Aluno

Pode:

- conversar com o assistente;
- consultar respostas;
- criar solicitações;
- acompanhar solicitações;
- responder solicitações;
- visualizar histórico.

### Atendente

Pode:

- visualizar sua fila;
- assumir solicitações;
- responder;
- alterar status;
- encaminhar;
- resolver chamados.

### Administrador

Pode:

- gerenciar usuários;
- gerenciar setores;
- gerenciar categorias;
- gerenciar base de conhecimento;
- configurar roteamento básico.

---

# 13. Módulo 2 — Assistente

O assistente é a principal interface entre o aluno e o One.

Tela inicial:

```text
ONE

Olá, Alfredo.

Como posso ajudar?

┌────────────────────────────────────┐
│ Digite sua dúvida ou solicitação   │
└────────────────────────────────────┘

Exemplos:

"Como emitir meu boleto?"
"Minha nota não apareceu."
"Como solicitar um atestado?"
"Não consigo acessar o portal."
```

O assistente deve:

1. receber a pergunta;
2. identificar a intenção;
3. consultar a base de conhecimento;
4. fornecer uma resposta;
5. perguntar se a resposta resolveu;
6. gerar solicitação quando necessário.

---

# 14. Módulo 3 — Base de Conhecimento

A base de conhecimento será utilizada especificamente pelo assistente.

Ela não precisa começar como uma Wiki complexa.

Cada artigo pode possuir:

```text
Título

Perguntas relacionadas

Categoria

Conteúdo

Links úteis

Público

Status

Data de atualização
```

Exemplo:

```text
Título:
Como emitir segunda via do boleto?

Categoria:
Financeiro

Perguntas relacionadas:
- Como emitir boleto?
- Onde vejo meu boleto?
- Segunda via da mensalidade.
- Preciso pagar minha mensalidade.

Resposta:
Acesse o Portal do Aluno e selecione...

Link:
[Acessar Portal do Aluno]

Público:
Aluno

Status:
Publicado
```

---

# 15. Módulo 4 — Chamados

O módulo de chamados será inspirado no GLPI, porém simplificado.

Cada chamado poderá possuir:

```text
Número
Solicitante
Título
Descrição
Categoria
Setor
Responsável
Prioridade
Status
Data de criação
Histórico
Anexos
Contexto da conversa
```

Exemplo:

```text
#ONE-1048

Aluno:
João Silva

Categoria:
Acadêmico > Notas

Assunto:
Nota não publicada

Status:
Em atendimento

Responsável:
Coordenação de Engenharia de Software

Origem:
Assistente One
```

---

# 16. Status do Chamado

O MVP deve possuir poucos estados.

```text
ABERTO
  ↓
EM ATENDIMENTO
  ↓
AGUARDANDO ALUNO
  ↓
RESOLVIDO
  ↓
FECHADO
```

Nem todos os chamados precisam passar por todos os estados.

Um chamado pode seguir diretamente:

```text
ABERTO
  ↓
EM ATENDIMENTO
  ↓
RESOLVIDO
```

---

# 17. Módulo 5 — Roteamento

O roteamento inicial pode ser baseado em regras simples.

Exemplo:

```text
Categoria:
Financeiro > Boleto

Destino:
Financeiro
```

Outro exemplo:

```text
Categoria:
Acadêmico > Notas

Destino:
Coordenação do curso
```

No futuro, esse roteamento pode ser auxiliado por IA.

---

# 18. Categorias Iniciais

O MVP deve utilizar poucas categorias.

Exemplo:

```text
Acadêmico
├── Matrícula
├── Documentos
├── Notas
└── Disciplinas

Financeiro
├── Boleto
├── Mensalidade
└── Negociação

Tecnologia
├── Portal do Aluno
├── Wi-Fi
└── Acesso

Outros
```

---

# 19. Fluxo Principal do MVP

```text
Aluno acessa o One
        ↓
Digita sua dúvida
        ↓
Assistente identifica intenção
        ↓
Consulta Base de Conhecimento
        ↓
Resposta encontrada?
     ┌──┴──┐
    SIM   NÃO
     ↓      ↓
 Resposta   Criar solicitação
     ↓              ↓
Resolveu?      Classificação
 ┌───┴───┐          ↓
SIM     NÃO     Roteamento
 ↓        ↓          ↓
Fim      Ticket   Atendimento
                     ↓
                  Resolvido
```

---

# 20. Jornada do Aluno

## Cenário

Aluno escreve:

> Preciso emitir meu boleto.

O One responde:

```text
Para emitir seu boleto:

1. Acesse o Portal do Aluno.
2. Entre em "Financeiro".
3. Selecione "Boletos".

[Acessar Portal]

Isso resolveu sua dúvida?

[ Sim ] [ Não ]
```

Caso responda "Sim":

```text
Atendimento finalizado.
```

Caso responda "Não":

```text
Entendi.

Vou registrar uma solicitação para que a equipe responsável possa ajudar.
```

O sistema cria:

```text
#ONE-1053

Categoria:
Financeiro > Boleto

Contexto:
"Preciso emitir meu boleto."

Setor:
Financeiro
```

---

# 21. Jornada do Atendente

O atendente visualiza:

```text
Minha fila

#1053 Problema com boleto
#1052 Nota não publicada
#1051 Portal indisponível
```

Ao abrir:

```text
#ONE-1053

Aluno:
João Silva

Categoria:
Financeiro > Boleto

Status:
Em atendimento

Histórico do Assistente

Aluno:
Preciso emitir meu boleto.

One:
[resposta fornecida]

Aluno:
Não resolveu.

--------------------------------

[ Responder ]

[ Encaminhar ]

[ Resolver ]
```

---

# 22. Atendimento em Camadas

A visão completa do produto pode utilizar um atendimento em camadas.

```text
Aluno
  ↓
Assistente Inteligente
  ↓
Atendimento Operacional / Setor
  ↓
Coordenação
```

No MVP inicial, porém, o fluxo pode ser simplificado.

A camada de representante de turma pode ser adicionada posteriormente.

---

# 23. Indicadores do MVP

O dashboard inicial deve ser simples.

Indicadores:

- chamados abertos;
- chamados resolvidos;
- tempo médio até primeira resposta;
- tempo médio de resolução;
- percentual resolvido pelo assistente;
- principais categorias.

Exemplo:

```text
Chamados abertos
42

Resolvidos
128

Tempo médio de primeira resposta
34 min

Resolvidos pelo assistente
61%
```

---

# 24. Métricas de Validação

O MVP deve responder às seguintes perguntas:

- Os alunos utilizam o One?
- Quantas dúvidas são resolvidas automaticamente?
- Quantas interações viram chamados?
- Os chamados chegam ao setor correto?
- Quanto tempo demora para uma solicitação receber resposta?
- Quais assuntos são mais recorrentes?
- O volume de mensagens diretas para coordenação diminui?
- Os alunos conseguem acompanhar suas solicitações?

---

# 25. Diferencial em Relação a um Help Desk Tradicional

| Aspecto | Help Desk Tradicional | One |
|---|---|---|
| Entrada | Formulário | Linguagem natural |
| Conhecimento | Usuário procura artigos | Assistente busca conhecimento |
| Classificação | Usuário/técnico | Sistema auxilia |
| Chamado | Criado imediatamente | Apenas quando necessário |
| Contexto | Usuário repete informações | Conversa é preservada |
| Especialização | Genérica | Universitária |
| Roteamento | Manual ou por regras genéricas | Baseado em contexto acadêmico |
| Dados | Operacionais | Operacionais + acadêmicos |

---

# 26. O que não entra no MVP

Para evitar crescimento excessivo de escopo, inicialmente não devem fazer parte do MVP:

- aplicativo mobile nativo;
- integração com WhatsApp;
- CMDB;
- inventário de equipamentos;
- gestão de contratos;
- gestão de problemas ITIL;
- gestão de mudanças ITIL;
- workflow BPMN complexo;
- SLA avançado;
- múltiplos agentes de IA;
- IA executando ações em sistemas externos;
- integração profunda com ERP acadêmico;
- integração financeira;
- push notifications;
- chat em tempo real;
- multi-tenant SaaS completo;
- detecção automática de incidentes coletivos;
- integração com Moodle.

Esses recursos podem fazer parte da evolução do produto.

---

# 27. Escopo Recomendado para Piloto

O MVP pode ser validado inicialmente com:

```text
1 instituição
1 coordenação
1 ou 2 cursos
3 setores
10 a 30 artigos de conhecimento
2 a 5 atendentes
grupo reduzido de alunos
```

O objetivo é validar o fluxo antes de ampliar a solução.

---

# 28. Integração Futura com Moodle

A integração com Moodle é uma evolução estratégica importante.

A proposta é permitir que o One acompanhe o contexto em que o aluno está.

Exemplo:

```text
Aluno:
Alfredo

Curso:
Engenharia de Software

Disciplina:
Banco de Dados

Atividade:
Trabalho Final

Tela:
Envio da atividade
```

O aluno poderia clicar:

```text
[ Preciso de ajuda ]
```

e escrever:

> Não consigo enviar meu trabalho.

O One já conheceria o contexto e não precisaria perguntar novamente:

- qual curso;
- qual disciplina;
- qual atividade;
- onde o problema ocorreu.

---

# 29. Atendimento Contextual

Essa evolução cria um dos principais diferenciais futuros do produto:

> **O One leva o suporte até onde o problema acontece.**

Possíveis integrações futuras:

```text
                ONE
                 ↑
        ┌────────┼────────┐
        │        │        │
      Moodle   Portal    App
        │        │        │
        └────────┼────────┘
                 ↓
        Atendimento Institucional
```

O One passa a funcionar como uma camada de suporte compartilhada por diferentes sistemas da universidade.

---

# 30. Evolução da Plataforma

## MVP

```text
One Web
  ↓
Assistente
  ↓
Base de Conhecimento
  ↓
Chamados
```

## Versão 2

```text
One
  ↓
Integração com sistemas acadêmicos
  ↓
Contexto de aluno, curso e turma
```

## Versão 3

```text
One + Moodle
  ↓
Atendimento contextual
```

## Versão 4

```text
ONE
├── Moodle
├── Portal do Aluno
├── Aplicativo
├── Biblioteca
├── Financeiro
└── Outros sistemas
```

---

# 31. Inteligência Institucional

Cada atendimento gera dados.

Com o tempo, o One pode transformar essas informações em conhecimento institucional.

Exemplo:

```text
42 alunos perguntaram:

"Como emitir boleto?"

Variação:
+180% na semana
```

Isso pode indicar que o problema não está no atendimento.

Pode existir um problema de usabilidade no Portal do Aluno.

Outro exemplo:

```text
27 alunos
Mesma turma
Mesma disciplina
Mesmo assunto

"Nota não apareceu."
```

O One poderia identificar um possível problema coletivo.

---

# 32. Visão Futura — Incidentes Coletivos

Em vez de tratar:

```text
27 chamados individuais
```

o One poderá futuramente identificar:

```text
INCIDENTE ACADÊMICO

Disciplina:
Arquitetura de Software

Turma:
ENG-2026-4

Alunos impactados:
27

Problema:
Nota não publicada
```

Isso permitiria:

- comunicação coletiva;
- redução de chamados duplicados;
- detecção de padrões;
- resposta institucional mais rápida.

---

# 33. One como Plataforma

A visão de longo prazo é que o One deixe de ser apenas um sistema isolado.

Ele poderá tornar-se uma camada central de atendimento institucional.

Possível organização futura:

```text
ONE
│
├── One Assist
│   └── Assistente e autoatendimento
│
├── One Desk
│   └── Chamados e atendimento humano
│
├── One Flow
│   └── Triagem, roteamento e escalonamento
│
└── One Insights
    └── Indicadores e inteligência institucional
```

Esses nomes não precisam aparecer para o usuário no MVP.

Eles servem apenas para organizar a visão do produto.

---

# 34. One Assist

Responsável por:

- interface conversacional;
- consultas à base de conhecimento;
- respostas automáticas;
- sugestões;
- identificação inicial da intenção;
- criação de solicitação quando necessário.

---

# 35. One Desk

Responsável por:

- chamados;
- filas;
- atendentes;
- histórico;
- anexos;
- respostas;
- status;
- encerramento.

---

# 36. One Flow

Responsável futuramente por:

- classificação;
- roteamento;
- regras;
- escalonamento;
- contexto acadêmico;
- automações.

---

# 37. One Insights

Responsável por:

- indicadores;
- relatórios;
- análise de recorrência;
- volume por curso;
- volume por turma;
- tempo de resposta;
- percentual de autoatendimento;
- identificação de possíveis problemas coletivos.

---

# 38. Frases de Posicionamento

## Principal

> **O aluno não precisa saber quem resolve. O One precisa.**

## Atendimento

> **No One, o aluno não abre um chamado. Ele explica o problema.**

## Continuidade

> **Do autoatendimento ao atendimento humano, sem começar de novo.**

## Contexto

> **A demanda certa, para a pessoa certa, no momento certo.**

## Visão futura

> **O suporte onde o problema acontece.**

---

# 39. Pitch Curto

> O One é uma plataforma inteligente de atendimento universitário que centraliza dúvidas e solicitações dos alunos em um único canal.
>
> O aluno simplesmente explica o que precisa.
>
> O sistema consulta a base de conhecimento e tenta resolver a demanda imediatamente.
>
> Caso não consiga, a própria conversa é transformada em uma solicitação rastreável, contextualizada e encaminhada ao setor responsável.
>
> Dessa forma, o One reduz demandas simples direcionadas à coordenação, melhora a experiência do aluno e transforma cada atendimento em informação útil para a instituição.

---

# 40. Pitch em Uma Frase

> **One é uma camada inteligente de atendimento universitário que conecta autoatendimento, conhecimento institucional e atendimento humano sem perda de contexto.**

---

# 41. Proposta de Inovação

A inovação do One não está em inventar um novo sistema de chamados.

Ela está em mudar a forma como o atendimento universitário começa.

Em sistemas tradicionais:

```text
Problema
  ↓
Formulário
  ↓
Ticket
```

No One:

```text
Problema
  ↓
Conversa
  ↓
Conhecimento
  ↓
Tentativa de resolução
  ↓
Ticket somente se necessário
```

Portanto, o ticket deixa de ser o ponto de entrada.

Ele passa a ser um mecanismo interno utilizado apenas quando o autoatendimento não consegue resolver a demanda.

---

# 42. MVP — Funcionalidade de Maior Valor

Se apenas uma funcionalidade tiver que demonstrar o diferencial do One, deve ser:

```text
CONVERSA
   ↓
BASE DE CONHECIMENTO
   ↓
RESPOSTA
   ↓
NÃO RESOLVEU
   ↓
CONVERSA → TICKET
   ↓
CLASSIFICAÇÃO
   ↓
ENCAMINHAMENTO
```

Essa funcionalidade:

- é simples de demonstrar;
- diferencia o One de um help desk tradicional;
- evidencia o valor da base de conhecimento;
- permite utilizar IA futuramente;
- cria a base para integração com Moodle;
- evita que o aluno repita informações.

---

# 43. Riscos do Projeto

## Crescimento excessivo de escopo

O principal risco é tentar construir simultaneamente:

```text
GLPI
+ IA
+ Moodle
+ WhatsApp
+ Analytics
+ Automação
+ ERP
+ Aplicativo
```

Isso pode atrasar a validação da ideia principal.

A recomendação é manter o MVP focado no fluxo:

```text
PERGUNTAR
  ↓
TENTAR RESOLVER
  ↓
REGISTRAR
  ↓
DIRECIONAR
  ↓
ATENDER
  ↓
RESOLVER
  ↓
MEDIR
```

---

# 44. Critério de Sucesso do MVP

O MVP será bem-sucedido se conseguir provar que:

1. alunos utilizam a plataforma;
2. parte das dúvidas é resolvida automaticamente;
3. solicitações não resolvidas viram chamados sem perda de contexto;
4. os chamados chegam ao setor correto;
5. atendentes conseguem continuar o atendimento;
6. todo o histórico fica registrado;
7. a instituição consegue medir o processo;
8. a coordenação recebe menos solicitações simples diretamente.

---

# 45. Avaliação Estratégica da Ideia

A proposta possui alto potencial de utilidade porque resolve um problema existente e frequente.

A inovação não depende de uma tecnologia inédita.

Ela depende da integração entre:

```text
Experiência conversacional
        +
Base de conhecimento
        +
Contexto universitário
        +
Help Desk
        +
Roteamento
        +
Dados
```

O principal ativo do One será sua especialização no ambiente universitário.

---

# 46. Resumo Executivo

O **One** é uma central inteligente de atendimento universitário.

Seu objetivo é substituir um atendimento fragmentado por um fluxo único, rastreável e escalável.

O aluno não precisa conhecer o organograma da universidade nem descobrir qual setor procurar.

Ele apenas explica sua necessidade.

O One consulta a base de conhecimento e tenta resolver a solicitação imediatamente.

Se o problema persistir, a conversa é convertida em um chamado, preservando todo o contexto e encaminhando a demanda ao setor responsável.

O MVP deve validar exatamente esse ciclo.

No futuro, o One poderá integrar-se ao Moodle, Portal do Aluno e outros sistemas acadêmicos, tornando-se uma camada institucional de atendimento contextual.

A visão final é:

> **Um único ponto de atendimento capaz de entender a necessidade do aluno, tentar resolvê-la imediatamente e garantir que, quando intervenção humana for necessária, a demanda certa chegue à pessoa certa, no momento certo.**
