# One — Roadmap

- **Data:** 23/09/2026 (atualizado em 02/10/2026)
- **Base:** `One_MVP_Visao_Produto.md`, `One_Caminho_Para_Criar_Um_Bom_Produto.md`,
  `One_Pesquisa_Mercado_Helpdesks.md`, `One_Refinamento_Nome_Diferenciais.md`,
  `One_Roteiro_Entrevista_Coordenacao_2026-10-01.md`, `specs/mvp-business-rules/`,
  `Manual do Projeto Extensionista Integrador - TAD.pdf` (PEI IV, Apêndices D e F).
- **Regra:** cada fase só começa quando o **critério de saída** da anterior foi cumprido. As
  datas vêm do calendário do PEI IV (abaixo), que tem prazos fixos e desconta 0,5 ponto por
  atraso. Se um prazo chegar antes de uma pergunta aberta ser respondida, segue-se o *default*
  proposto em `requirements.md`, registrado como tal.

---

## Onde estamos

| Item | Estado |
|---|---|
| Disciplina | PEI IV — Desenvolvimento de PWAs com Frameworks Avançados (Univag, ADS) |
| Fase atual | **1 — Descoberta** (em andamento) |
| Entrevistas | 1 de ~15–23 previstas (E1, coordenadora de tecnologia, Univag; follow-up em 01/10) |
| `requirements.md` | Rascunho; decisões D1–D4 tomadas; Q17 respondida com pontos a confirmar; Q14 e Q16 parciais; **Q5–Q13, Q15, Q18–Q19 abertas** |
| `design.md`, `tasks.md` | Modelos vazios — bloqueados pelas perguntas abertas |
| Código | Nenhum. `.claude/scripts/verify.ps1` sem passos de verificação definidos |
| Próximo marco | PEI: protótipo inicial em 13–14/10. One: e-mail à coordenação com o que ficou aberto (roteiro, "Seguir por e-mail") |

---

## Calendário do PEI IV

Fonte: Manual do PEI, Apêndice F. Os prazos de agosto e setembro (grupos, pitch, pesquisa de
mercado, PM Canvas) já passaram.

| Data | Entrega do PEI | Fase do One |
|---|---|---|
| 02/10 | Apresentar a pesquisa sobre a temática (5 min); entregar pesquisas e justificativas no AVA | 1 |
| 06–08/10 | Desenvolver o protótipo inicial | 2 |
| 13–14/10 | Apresentar o protótipo inicial | 2 |
| 14–15/10 | Desenvolver diagramas e documentação de requisitos | 2 |
| 20–21/10 | Apresentar diagramas e documentação de requisitos | 2 |
| 23/10 | Ajustes e correções | 2 |
| 27, 28 e 30/10 | Apresentar as correções; demonstrar as funcionalidades implementadas | 3 |
| 30/10 | Postar no AVA a documentação produzida | 3 |
| 03–04/11 | Demonstrar as funcionalidades corrigidas para validação final | 3 |
| 04 e 06/11 | Apresentar código-fonte e integrações | 3 |
| 10–11/11 | Apresentar o resultado da pesquisa de mercado de validação do MVP | 4 |
| 13/11 | Postar no AVA a primeira versão do projeto | 3–4 |
| 17–18/11 | Apresentar as melhorias | 4 |
| 20/11 | Aplicação disponível para a banca | 4 |
| 24–25/11 | Pré-banca (pré-requisito para a feira) | — |
| 27/11 | Prazo máximo: projeto documentado e código-fonte no GitHub | — |
| 09–11/12 | Feira de Projetos (o manual imprime "Junho/2026", mas o feriado de 8/12 indica dezembro) | — |

Consequência: a demonstração de 27/10 exige código antes de a Fase 2 terminar, então a Fase 3
começa em paralelo com a documentação de requisitos, por volta de 14/10.

### Exigências do PEI IV

- **Stack:** SPA e/ou aplicativo híbrido; front-end em Angular, React ou Vue; back-end em PHP,
  Java ou Node.js, com web services REST (Apêndice D.1–D.3).
- **Documento final** na estrutura do Apêndice D.5, em português e no padrão ABNT (§4.2);
  código em repositório público no GitHub.
- **Relatório semanal** no AVA (modelo do Apêndice G) e ao menos um integrante em cada aula.
- **Nota individual**; −0,5 por atraso, cumulativo; sem segunda chamada nem prova final.

O que o documento final exige e onde isso está no One hoje:

| Exigência (D.4/D.5) | No repositório |
|---|---|
| Introdução: propósito, escopo, premissas, convenções | `requirements.md` (Problem, Glossary, Out of scope), em inglês |
| Fundamentação: pesquisa sobre PWAs e frameworks, com referências | Não encontrada |
| Contexto do estudo de caso | `One_MVP_Visao_Produto.md`, achados E1 |
| Visão geral: produto, usuários, soluções similares, suposições | Visão do produto; `One_Pesquisa_Mercado_Helpdesks.md` |
| Requisitos funcionais | `requirements.md`, regras BR-A a BR-I |
| Requisitos não funcionais | Não existem |
| Casos de uso com especificação; diagrama de classes | Não existem |
| Modelos conceitual e lógico do banco | Não existem |
| Protótipo | Planejado (Fase 2) |
| Código-fonte e telas da aplicação | Não existem |
| Relatórios semanais | Não estão no repositório |

---

## Visão geral

```text
Fase 1        Fase 2        Fase 3      Fase 4     Fase 5          Fase 6         Fase 7
Descoberta → Validação  →  MVP     →  Piloto  →  Validação   →  Integrações →  Produto
(agora)      (protótipo)   (fatia     (Univag,   de produto     (Moodle,       comercial
                            vertical)  ADS)      (mais cursos)  Portal, ERP)   (multi-IES)
```

Fluxo que o MVP precisa provar (visão §43):
**perguntar → tentar resolver → registrar → direcionar → atender → resolver → medir.**

---

## Fase 1 — Descoberta *(em andamento)*

**Objetivo:** provar que o problema existe, com números, e obter os dados do piloto.

| Entregável | Estado | Fonte |
|---|---|---|
| Entrevista com a coordenação (E1) | Feito | requirements.md §E1 |
| Pesquisa de mercado | Feito | Pesquisa_Mercado |
| Refinamento de nome e diferenciais | Proposta, não aprovada | Refinamento |
| Reunião de follow-up 01/10 — baseline, funil, representantes, MEC | Feito: seções 1–2; 3–7 por e-mail | Roteiro |
| Registrar respostas como achados E1.x e fechar Q14–Q17 | Feito: E1.8–E1.13; Q17 respondida, Q14/Q16 parciais | Roteiro "Após a reunião" |
| Contagem de e-mails de alunos das últimas 2 semanas (baseline real) | Parcial: contagem de 7 dias por canal (E1.8); a de 2 semanas não veio | Q17, roteiro 1.5 |
| Entrevistas com 10–15 alunos | Não iniciado | Caminho §5.1 |
| Entrevistas com 5–8 pessoas da equipe (secretaria, CAE, financeiro) | Não iniciado | Caminho §5.2 |
| Lista das 10–20 demandas mais frequentes, com quem resolve | Parcial: tipos e quem resolve (E1.13); faltam volumes | Q16, Caminho §6 |
| Jornada atual mapeada | Não iniciado | Caminho §7 |
| Identificar o instrumento MEC que exige o registro | Pendente | Q15 |
| Papel da CAE e ERP por trás do Portal do Aluno | Pendente | Roteiro §7 |

**Critério de saída** — as quatro respostas do Caminho §22, com evidência:

1. Quem é o primeiro usuário (hipótese: alunos de ADS da coordenação de tecnologia).
2. Quais as cinco principais demandas.
3. Como são resolvidas hoje.
4. Qual melhoria mensurável o One deve produzir, sobre uma **baseline medida** (não o chute da
   equipe de ~60/semana).

**Decisões que esta fase precisa fechar**

| Pergunta | Muda o quê |
|---|---|
| Q15 — exigência do MEC | Retenção, relatório/exportação de histórico; diferencial "registro" (Refinamento §6) |
| Q16 — funil de demandas | Categorias, regras de roteamento, primeiros artigos |
| Q17 — baseline | Se chegam poucas demandas à coordenação, o público principal vira secretaria/CAE. *Chegam ~256 mensagens/semana (E1.8): público mantido* |
| Q14 — representantes de turma | Se existe uma fila "turma" antes da coordenação |
| Q18 — professor como destino | Se o roteamento (BR-E2) precisa chegar ao professor |
| Q19 — dados do aluno no chamado | Campos do cadastro do aluno e da importação (Q5) |
| Papel da CAE | Diferencial "encaminha pelo curso" vs. "triagem para a CAE" |
| Aprovar descritor e diferenciais (Refinamento §2–§3) | Pitch e tela inicial |

---

## Fase 2 — Validação *(bloqueada pela Fase 1)*

**Objetivo:** testar o fluxo com usuários reais antes de escrever código.

**Prazos do PEI:** protótipo inicial em 13–14/10; diagramas e documentação de requisitos em
20–21/10. Os artefatos que faltam (requisitos não funcionais, casos de uso, diagrama de classes,
modelos conceitual e lógico) são produzidos aqui.

- Protótipo navegável (Figma): login → assistente → resposta → "Isso resolveu?" → Não →
  chamado criado → tela do atendente → resposta → resolução (Caminho §9).
- Testes de usabilidade com tarefas reais (ex.: "descubra como emitir seu atestado"), sem
  explicar a interface.
- Validação manual do diferencial: busca simples na base antes de IA sofisticada (Caminho §10).
- Decidir as propostas da pesquisa que alteram a spec (não aplicadas ainda):

| # | Proposta | Recomendação para decidir aqui |
|---|---|---|
| P1 | "Falar com uma pessoa" visível em toda resposta | Candidata forte (CFPB, Gartner) |
| P2 | Mostrar o artigo-fonte e rotular resposta de IA | Candidata forte (Air Canada, Cursor) |
| P5 | Métricas em horário comercial | Ligada à Q10 |
| P7 | Meta de autoatendimento do piloto em 20–40% | Critério do piloto |

- Fechar Q5 (SSO ou contas locais), Q11 (coordenação como setor), Q12 (quem vê o painel),
  Q13 (dados de alunos em LLM externo + aviso) e os defaults Q6–Q10.

**Critério de saída:** `requirements.md` sem perguntas abertas e marcado como acordado;
protótipo testado e ajustado.

---

## Fase 3 — MVP *(fatia vertical)*

**Objetivo:** o fluxo completo funcionando de ponta a ponta, não módulos pela metade.

**Prazos do PEI:** demonstração de funcionalidades em 27–30/10; código-fonte em 04 e 06/11;
primeira versão no AVA em 13/11; aplicação para a banca em 20/11; código no GitHub até 27/11.

1. `design.md` escrito (stack dentro das exigências do PEI IV, modelo de dados, LLM/RAG
   restrito a artigos publicados — D3).
2. `.claude/scripts/verify.ps1` populado com build e testes reais.
3. `tasks.md` com incrementos pequenos e verificáveis.
4. Implementação, na ordem da fatia:

| Módulo | Regras | Critérios de aceite |
|---|---|---|
| Identidade e acesso | BR-A1–A7 | AC7 |
| Base de conhecimento (versões, publicação) | BR-C1–C5 | AC8 |
| Assistente (só responde da base; Sim/Não; desfechos) | BR-B1–B9 | AC1, AC3 |
| Conversa → chamado com contexto | BR-D1–D6 | AC2 |
| Roteamento (categoria → setor ou coordenação do curso; triagem) | BR-E1–E5 | AC4 |
| Ciclo de vida e atendimento (estados, encaminhar, notas, e-mail) | F1–F9, BR-G1–G6 | AC5, AC6 |
| Histórico auditável | BR-H1–H2 | AC8 |
| Indicadores (dashboard mínimo) | Seção I | AC9 |

5. Dados do piloto carregados: categorias, setores, regras e 10–30 artigos vindos da Fase 1
   (primeiros: boleto do semestre e atestado de escolaridade, apontando para o Portal do Aluno).

**Critério de saída:** AC1–AC9 passando; `verify.ps1` passando.

**Fora do MVP (vinculante):** app nativo, WhatsApp, push, chat em tempo real, integrações
(Moodle, ERP, Portal, financeiro), prioridade/SLA, roteamento por IA, incidentes coletivos,
aprendizado automático da base, segmentação de artigos, multi-tenant, exportação de
relatórios, CSAT, CMDB/ITIL/BPMN.

---

## Fase 4 — Piloto

**Escopo:** 1 instituição (Univag), 1 coordenação, 1–2 cursos (ADS), 3 setores, 10–30 artigos,
2–5 atendentes, grupo controlado de alunos. Duração suficiente para gerar comportamento real.

**Dentro do PEI:** só cabe uma validação curta antes de 10–11/11 (pesquisa de validação do MVP)
e as melhorias até 17–18/11. O piloto com duração real fica para depois da disciplina.

**O que medir**

- No sistema (seção I): alunos ativos, taxa de autoatendimento, escalonamento, abandono,
  perguntas sem artigo, tempo até 1ª resposta, tempo de resolução, roteamento correto,
  reabertura, principais categorias, North Star (proxy).
- Fora do sistema (BR-I1): demandas que ainda chegam à coordenação por e-mail/outros canais,
  comparadas com a baseline da Fase 1; pesquisa com alunos.

**Critério de saída:** respostas às perguntas do Caminho §16 (o aluno preferiu o One? a
coordenação recebeu menos perguntas repetitivas? quais funções não foram usadas ou foram
pedidas?) e comparação honesta antes/depois.

---

## Fase 5 — Validação de produto

Evoluir com base na evidência do piloto (Caminho §17), uma coisa por vez, sempre respondendo
*"qual problema validado isso resolve e qual métrica melhora?"*:

| Ordem sugerida | Item | Origem |
|---|---|---|
| 1 | Relatório de lacunas (perguntas sem artigo, chamados por categoria) | P3 |
| 2 | Atendente sugere artigo ao resolver chamado (KCS leve, curadoria humana) | P4, visão §8.4 |
| 3 | Mais cursos e setores; representantes de turma, se Q14 pedir | Caminho §19, Q14 |
| 4 | Satisfação (joinha) na resposta e no fechamento | P6 |
| 5 | Lembretes proativos por prazo (matrícula, boleto) | P9 — única evidência independente forte |
| 6 | Roteamento assistido por IA | Visão §17 |
| 7 | SLA, analytics, relatório para CPA/ouvidoria (indicador 3.10 do INEP) | Caminho §17, Pesquisa §7 |

---

## Fase 6 — Integrações

Só depois de o fluxo estar validado (Caminho §20.4). Corresponde às versões 2–4 da visão (§30):

- **V2** — sistemas acadêmicos: contexto de aluno, curso e turma.
- **V3** — Moodle: botão "Preciso de ajuda" com contexto (curso, disciplina, atividade, tela).
- **V4** — Portal do Aluno, aplicativo, biblioteca, financeiro; WhatsApp como primeiro canal
  extra (P8).
- Detecção de incidentes coletivos (visão §32).

---

## Fase 7 — Produto comercial

Multi-instituição, configuração, segurança, LGPD completa, observabilidade, cobrança, escala.

Antes de investir em marca: **busca no INPI pelo nome "One"** (não verificado; alternativas a
avaliar: Balcão, Encaminha — Refinamento §2).

---

## Riscos

| Risco | Mitigação |
|---|---|
| Construir antes de provar o problema | Portões entre fases; o código começa pelos módulos que não dependem de perguntas abertas |
| Prazos fixos do PEI (−0,5 por atraso) antes de as perguntas abertas fecharem | Seguir os *defaults* da spec e registrar; código a partir de ~14/10 em paralelo com os requisitos |
| Fatia do MVP (8 módulos, AC1–AC9) grande para ~5 semanas de código até 20/11 | Na Fase 2, fixar o que precisa estar pronto em 27/10 e o que fica para 20/11 |
| Crescimento de escopo ("GLPI + IA + Moodle + WhatsApp…") | Seção *Out of scope* da spec é vinculante |
| Bot inventar regra (casos Air Canada, Cursor) | Responder só de artigos publicados (BR-B2, BR-B4); P2 |
| Aluno preso em loop sem humano | Sempre oferecer solicitação; P1 |
| Expectativa inflada de autoatendimento | Meta de 20–40% (Gartner), não os 65–98% de fornecedores |
| Baseline inexistente → piloto sem prova de melhora | Contagem de e-mails na Fase 1 (Q17) |
| WhatsApp (~67% das mensagens, E1.8) fora do MVP → aluno continua lá | Contar WhatsApp na comparação do piloto (BR-I1); WhatsApp como canal extra na Fase 6 (P8) |
| Diferencial "registro para o MEC" não se confirmar | Rebaixar para "rastreabilidade" (Refinamento §6) |
| Dados de alunos em LLM externo | Q13: aviso na tela, anexos nunca enviados |
