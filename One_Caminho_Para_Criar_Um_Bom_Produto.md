# One — Caminho para Potencializar as Chances de Criar um Bom Produto

## 1. Objetivo desta análise

O objetivo deste documento é definir um caminho prático para aumentar as chances de o **One** evoluir de uma boa ideia para um produto realmente útil, utilizável, validado e com potencial de adoção institucional.

A recomendação principal é seguir esta sequência:

```text
Problema
  ↓
Validação
  ↓
Protótipo
  ↓
MVP
  ↓
Piloto
  ↓
Métricas
  ↓
Evolução
```

O principal risco do projeto não é técnico.

O maior risco é investir tempo construindo uma solução completa antes de comprovar que:

- o problema realmente existe com frequência;
- os alunos adotariam a solução;
- os setores internos perceberiam valor;
- o fluxo proposto realmente melhora o atendimento;
- a instituição teria interesse em manter ou adquirir o produto.

---

# 2. Princípio central

Antes de pensar em arquitetura, banco de dados, integrações, IA avançada ou Moodle, o One precisa validar sua proposta principal.

A pergunta central deve ser:

> **O One consegue tornar o atendimento universitário mais simples para o aluno e mais organizado para a instituição?**

Toda funcionalidade deve contribuir para responder essa pergunta.

---

# 3. Etapa 1 — Fechar o problema

Antes da solução, o problema deve estar claramente definido.

Uma formulação inicial pode ser:

> Alunos possuem dúvidas e solicitações acadêmicas distribuídas entre WhatsApp, e-mail, coordenação, secretaria e outros canais. Esse modelo gera perda de histórico, retrabalho, demora, dificuldade de direcionamento e ausência de dados gerenciais.

## 3.1 Problemas a investigar

É importante validar se realmente existem:

- excesso de mensagens diretas para coordenação;
- dificuldade do aluno em saber qual setor procurar;
- repetição das mesmas dúvidas;
- perda de histórico;
- ausência de protocolo;
- demora de resposta;
- necessidade de repetir informações;
- encaminhamento incorreto;
- dificuldade de medir atendimento;
- falta de conhecimento centralizado.

---

# 4. Etapa 2 — Escolher um público inicial pequeno

O One não deve começar tentando resolver o atendimento de uma universidade inteira.

Para o primeiro piloto, o ideal é escolher um cenário limitado.

Exemplo:

```text
1 instituição
1 coordenação
1 ou 2 cursos
2 ou 3 setores
grupo reduzido de alunos
```

Isso permite acompanhar de perto o comportamento dos usuários e entender o que realmente funciona.

---

# 5. Etapa 3 — Product Discovery

Antes de desenvolver, realizar uma etapa curta de descoberta.

O objetivo não é perguntar:

> "Você usaria um sistema assim?"

Esse tipo de pergunta costuma gerar respostas pouco confiáveis.

O ideal é investigar comportamentos reais.

## 5.1 Entrevistas com alunos

Sugestão inicial:

- 10 a 15 alunos.

Perguntas:

- Qual foi a última dúvida ou problema acadêmico que você teve?
- Como tentou resolver?
- Com quem falou?
- Quanto tempo demorou?
- Precisou falar com mais de uma pessoa?
- Precisou repetir sua explicação?
- Você sabia qual setor procurar?
- Já ficou sem saber se alguém estava resolvendo?
- Quais dúvidas você mais tem durante o semestre?
- Qual canal você usa primeiro?

## 5.2 Entrevistas com equipe administrativa

Sugestão inicial:

- 5 a 8 pessoas.

Podem participar:

- coordenação;
- secretaria;
- atendimento;
- financeiro;
- suporte;
- professores, quando relevante.

Perguntas:

- Quais são as dúvidas mais frequentes?
- Quais assuntos poderiam ser resolvidos automaticamente?
- Quais demandas chegam ao setor errado?
- Quais canais recebem mais solicitações?
- Existe histórico centralizado?
- Como os atendimentos são acompanhados?
- Quanto tempo é gasto com dúvidas repetitivas?
- Como saber se algo foi resolvido?
- Quais informações fariam diferença em um dashboard?

---

# 6. Etapa 4 — Mapear as demandas mais frequentes

Depois das entrevistas, listar as 10 a 20 demandas mais comuns.

Exemplo:

```text
1. Segunda via de boleto
2. Atestado de matrícula
3. Nota não publicada
4. Acesso ao Portal do Aluno
5. Problema com senha
6. Matrícula
7. Frequência
8. Documento acadêmico
9. Prazo de atividade
10. Informações sobre disciplina
```

Esse levantamento deve direcionar:

- a base de conhecimento;
- as categorias iniciais;
- os fluxos;
- o roteamento;
- os cenários de teste;
- o primeiro piloto.

O MVP deve ser excelente nas demandas mais frequentes, e não mediano em dezenas de situações.

---

# 7. Etapa 5 — Mapear a jornada atual

Antes de criar a jornada futura, entender como o atendimento funciona hoje.

Exemplo:

```text
Aluno tem dúvida
      ↓
Manda WhatsApp
      ↓
Pessoa não sabe responder
      ↓
Encaminha para outro setor
      ↓
Aluno explica novamente
      ↓
Espera resposta
      ↓
Não sabe o status
      ↓
Problema é resolvido ou abandonado
```

A partir disso, identificar:

- gargalos;
- retrabalho;
- espera;
- falhas de comunicação;
- falta de contexto;
- etapas desnecessárias.

---

# 8. Etapa 6 — Definir a jornada ideal do One

Depois de compreender a jornada atual, desenhar a jornada desejada.

```text
Aluno pergunta
      ↓
One entende a intenção
      ↓
Consulta a Base de Conhecimento
      ↓
Resolveu?
 ┌────┴────┐
SIM       NÃO
 ↓          ↓
Fim     Gera solicitação
             ↓
       Mantém contexto
             ↓
       Classificação
             ↓
       Roteamento
             ↓
       Atendimento humano
             ↓
          Resolução
```

Essa deve ser a experiência principal a ser validada.

---

# 9. Etapa 7 — Prototipar antes de implementar

Criar um protótipo navegável no Figma antes do desenvolvimento.

O protótipo pode conter apenas:

```text
Login
  ↓
Home
  ↓
Assistente
  ↓
Resposta
  ↓
"Isso resolveu?"
  ↓
Não
  ↓
Ticket criado
  ↓
Tela do atendente
  ↓
Resposta
  ↓
Resolução
```

## 9.1 Teste de usabilidade

Entregar tarefas para usuários reais.

Exemplo:

> Você precisa descobrir como emitir seu atestado de matrícula.

Observar:

- onde clicam;
- o que procuram;
- onde travam;
- o que entendem;
- o que ignoram;
- quanto tempo levam;
- se precisam de ajuda.

Não explicar a interface durante o teste.

---

# 10. Etapa 8 — Validar o diferencial manualmente

Antes de investir em IA sofisticada, validar o conceito principal.

A primeira versão pode utilizar uma lógica simples:

```text
Pergunta
  ↓
Busca na base de conhecimento
  ↓
Resposta
  ↓
Resolveu?
```

Se não resolver:

```text
Conversa
  ↓
Ticket
  ↓
Contexto preservado
  ↓
Atendente
```

A inteligência pode evoluir depois.

O objetivo inicial é validar se essa experiência realmente é melhor do que:

- abrir formulário;
- enviar e-mail;
- procurar coordenação;
- mandar WhatsApp.

---

# 11. Etapa 9 — Definir o MVP como fatia vertical

O MVP deve funcionar de ponta a ponta.

Não construir vários módulos parcialmente.

Construir um fluxo completo.

## Escopo recomendado

```text
ONE MVP
│
├── Autenticação
├── Assistente
├── Base de Conhecimento
├── Conversa
├── "Resolveu / Não resolveu"
├── Conversão em ticket
├── Fila do atendente
├── Histórico
├── Respostas
├── Status
└── Dashboard mínimo
```

---

# 12. O que não deve entrar inicialmente

Evitar no primeiro MVP:

```text
❌ Moodle
❌ WhatsApp
❌ aplicativo mobile
❌ ERP acadêmico
❌ CMDB
❌ inventário
❌ workflow complexo
❌ múltiplos agentes de IA
❌ IA executando ações
❌ SLA avançado
❌ multi-tenancy completo
❌ analytics avançado
❌ dezenas de integrações
```

Esses recursos podem ser importantes no futuro, mas não são necessários para validar o núcleo da ideia.

---

# 13. Etapa 10 — Rodar um piloto real

Depois do MVP, realizar um piloto com usuários reais.

Sugestão:

```text
1 coordenação
1 ou 2 cursos
3 setores
10 a 30 artigos
2 a 5 atendentes
grupo controlado de alunos
```

O piloto precisa durar tempo suficiente para gerar comportamento real.

---

# 14. Métricas do piloto

O MVP precisa produzir dados.

## Métricas principais

- quantidade de alunos que utilizaram;
- quantidade de conversas iniciadas;
- percentual resolvido sem atendimento humano;
- percentual transformado em ticket;
- tempo médio até primeira resposta;
- tempo médio de resolução;
- percentual encaminhado corretamente;
- quantidade de reencaminhamentos;
- assuntos mais recorrentes;
- abandono do fluxo;
- quantidade de mensagens externas ainda enviadas à coordenação.

---

# 15. North Star Metric

Uma métrica central possível para o One é:

> **Percentual de demandas resolvidas corretamente pelo One sem o aluno precisar procurar outro canal.**

Essa métrica representa tanto:

- autoatendimento;
- quanto atendimento humano bem direcionado.

O objetivo do One não é gerar mais tickets.

Em muitos casos, menos tickets pode significar um produto melhor.

---

# 16. Etapa 11 — Analisar aprendizado, não apenas uso

Depois do piloto, responder:

- O aluno entendeu o produto?
- O aluno preferiu utilizar o One?
- O assistente realmente ajudou?
- A base de conhecimento resolveu dúvidas reais?
- Os chamados chegaram ao setor correto?
- A coordenação recebeu menos perguntas repetitivas?
- Os atendentes sentiram ganho de organização?
- Quais funções não foram usadas?
- Quais funções foram pedidas espontaneamente?

Essas respostas devem orientar a próxima versão.

---

# 17. Etapa 12 — Evoluir com base em evidência

Depois de validar o núcleo, adicionar funcionalidades de forma incremental.

Possível evolução:

```text
MVP
  ↓
Contexto acadêmico
  ↓
Roteamento inteligente
  ↓
Base alimentada por resoluções
  ↓
SLA
  ↓
Notificações
  ↓
Analytics
  ↓
Integrações
```

---

# 18. Moodle deve entrar depois

A integração com Moodle pode ser um grande diferencial, mas não precisa estar no MVP inicial.

Primeiro validar:

```text
Aluno
  ↓
One
  ↓
Assistente
  ↓
Ticket
```

Depois:

```text
Moodle
  ↓
One
  ↓
Contexto automático
```

Exemplo:

```text
Aluno: Alfredo
Curso: Engenharia de Software
Disciplina: Banco de Dados
Atividade: Trabalho Final
Tela: Envio da atividade
```

O aluno escreve:

> Não consigo enviar meu trabalho.

O One já saberá onde o problema aconteceu.

Esse modelo cria um atendimento mais contextual.

---

# 19. Roadmap recomendado

## Fase 1 — Descoberta

```text
Problema
  ↓
Entrevistas
  ↓
Demandas frequentes
  ↓
Personas
  ↓
Jornada atual
```

## Fase 2 — Validação

```text
Protótipo
  ↓
Testes de usabilidade
  ↓
Ajustes
  ↓
Definição do MVP
```

## Fase 3 — MVP

```text
Pergunta
  ↓
Conhecimento
  ↓
Resposta
  ↓
Não resolveu
  ↓
Ticket
  ↓
Atendimento
  ↓
Resolução
```

## Fase 4 — Piloto

```text
Usuários reais
  ↓
Métricas
  ↓
Feedback
  ↓
Correções
```

## Fase 5 — Validação de produto

```text
Mais cursos
  ↓
Mais setores
  ↓
Roteamento
  ↓
Analytics
```

## Fase 6 — Integrações

```text
Moodle
Portal do Aluno
ERP
Aplicativo
Outros sistemas
```

## Fase 7 — Produto comercial

```text
Multi-instituição
  ↓
Configuração
  ↓
Segurança
  ↓
LGPD
  ↓
Observabilidade
  ↓
Cobrança
  ↓
Escala
```

---

# 20. Armadilhas a evitar

## 20.1 Construir um GLPI menor

O One não deve competir tentando reproduzir todo o GLPI.

Seu diferencial está na experiência universitária.

---

## 20.2 Vender "IA"

A IA é tecnologia.

O produto deve vender resultado.

Não:

> Sistema de atendimento com IA.

Melhor:

> Plataforma que resolve dúvidas recorrentes e direciona automaticamente solicitações acadêmicas.

---

## 20.3 Criar uma base enorme antes de validar

Não escrever centenas de artigos sem saber quais dúvidas realmente existem.

Começar pelas demandas mais frequentes.

---

## 20.4 Integrar Moodle cedo demais

A integração deve potencializar um produto validado.

Ela não deve ser usada para tentar salvar um fluxo que ainda não foi comprovado.

---

## 20.5 Adicionar funcionalidades por interesse técnico

Antes de desenvolver qualquer funcionalidade, perguntar:

> **Qual problema validado isso resolve e qual métrica esperamos melhorar?**

Se a resposta não for clara, provavelmente a funcionalidade ainda não deveria entrar.

---

# 21. Artefatos recomendados

A ordem recomendada de documentação é:

```text
One Product Vision
        ↓
Problem Statement
        ↓
Personas
        ↓
Mapa da Jornada Atual
        ↓
Entrevistas
        ↓
Hipóteses
        ↓
Matriz de Dores
        ↓
Proposta de Valor
        ↓
Escopo MVP
        ↓
Protótipo
        ↓
Teste com Usuários
        ↓
Product Requirements Document
        ↓
Arquitetura
        ↓
Implementação
```

---

# 22. Quatro respostas necessárias antes de desenvolver

Antes da implementação, o projeto deve conseguir responder objetivamente:

## 1. Quem é o primeiro usuário?

Exemplo:

> Alunos de Engenharia de Software atendidos pela coordenação X.

## 2. Quais são as cinco principais demandas?

Exemplo:

- boletos;
- notas;
- documentos;
- acesso;
- matrícula.

## 3. Como essas demandas são resolvidas hoje?

Exemplo:

> WhatsApp → coordenação → encaminhamento manual.

## 4. Qual melhoria mensurável o One deve produzir?

Exemplo:

> Reduzir em 30% as dúvidas repetitivas enviadas diretamente à coordenação.

---

# 23. Ordem correta de execução

A recomendação final é:

```text
NÃO COMEÇAR POR:

Arquitetura
Banco
IA
Moodle
Código

COMEÇAR POR:

Problema
↓
Usuário
↓
Evidência
↓
Protótipo
↓
Validação
↓
MVP
↓
Piloto
↓
Métricas
↓
Produto
```

---

# 24. Conclusão

O One já possui uma proposta de valor interessante.

O principal desafio agora não é adicionar mais funcionalidades.

É comprovar que o produto resolve melhor um problema real.

O caminho recomendado é:

> **descobrir → validar → construir pouco → medir → aprender → evoluir.**

O desenvolvimento deve começar somente depois que estiver claro:

- quem será atendido;
- quais dores realmente existem;
- quais demandas são mais recorrentes;
- como o atendimento funciona hoje;
- qual resultado o One precisa melhorar.

Seguindo esse caminho, o projeto reduz o risco de se tornar apenas mais um sistema de chamados e aumenta suas chances de evoluir para uma solução realmente útil, diferenciada e comercializável.
