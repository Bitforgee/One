# One — Pesquisa de Mercado: Helpdesks Universitários e Líderes de Mercado

- **Data:** 23/09/2026
- **Método:** pesquisa web. Legenda de confiabilidade:
  - **[V]** alegação do fornecedor (marketing);
  - **[I]** independente (estudo revisado por pares, regulador, tribunal, pesquisa de analista);
  - **[U]** relato da própria universidade;
  - **[3P]** blog/revenda de terceiros.
- **Limites:** preços de 2026 vêm majoritariamente de terceiros; taxas de resolução de fornecedores não são auditadas; preços de Mainstay, EAB, Ellucian, Ivy/Ocelot e ServiceNow não são públicos.

---

## 1. Resumo executivo

1. **Ninguém ocupa o espaço do One no Brasil.** Plataformas americanas são caras e amarradas a ERPs/realidade dos EUA; as brasileiras (Blip, Zenvia, Octadesk) são ferramentas de canal (WhatsApp) sem modelo acadêmico de roteamento; os ERPs acadêmicos (TOTVS, Jacad, Lyceum) têm "requerimentos" formais, não atendimento conversacional com triagem.
2. **O padrão vencedor é o mesmo que o One propõe:** base de conhecimento → bot → passagem ao humano com contexto → setor especialista. Isso valida o conceito, mas também mostra que **o conceito sozinho não é diferencial** — o diferencial está na execução para o contexto universitário brasileiro.
3. **Os números de fornecedores (65–98% de resolução pelo bot) são inflados.** Evidência independente: só 14% das questões são totalmente resolvidas em autoatendimento, 36% das "muito simples" (Gartner). Meta realista para o MVP: **20–40%**.
4. **O maior risco de um bot com IA é inventar regra** (casos Air Canada e Cursor) e **prender o usuário em loop** (CFPB). A regra do One de responder só a partir da base de conhecimento está alinhada com a melhor prática.
5. **O MEC valoriza canal de comunicação com registro.** O indicador 3.10 do instrumento de recredenciamento do INEP pede canais diversos, ouvidoria e que a manifestação da comunidade gere insumos para melhoria. Nenhum fornecedor mapeia isso — oportunidade direta para o One.

---

## 2. Plataformas específicas para ensino superior

### Internacionais

| Plataforma | Como funciona | Dor que resolve | Valor/resultados | Preço | Diferencial |
|---|---|---|---|---|---|
| **Mainstay (ex-AdmitHub)** — "Pounce", Georgia State | Chatbot proativo por SMS, base de conhecimento da instituição, lembretes por prazo, passagem ao humano | Alunos admitidos que não se matriculam ("summer melt"); dúvidas administrativas | Ensaio randomizado (~7 mil alunos): summer melt −21%, matrícula +3,3 pp **[I]**; <2% de 50 mil mensagens precisaram de humano **[V/U]**; efeitos maiores em alunos de primeira geração **[I]** | Sob consulta | Evidência científica; **proatividade** (avisa antes do problema) |
| **Ivy.ai + Ocelot** (fundidos na Gravyty, 2025) | Bot treinado no site/base da instituição, um por departamento, passagem para chat ao vivo, SMS, URA | Volume de ligações e e-mails repetitivos | Ligações "até −87%" **[V]**; bot responde ~97,5% **[V]**; FSW: 90% resolvido pelo bot, ligações −1/3 **[V]** | Por nº de alunos (FTE) e áreas | Conteúdo departamental pronto (ex.: auxílio financeiro) |
| **TeamDynamix** | Portal de serviços + catálogo + base de conhecimento (KCS) + workflow para TI e setores não-TI | Atendimento fragmentado entre setores | Resolução mais rápida com base crescente (USD, GRCC) **[V]** | ~US$400–700/técnico/ano; **aluno não paga licença** **[3P]** | Licença que cabe em "muitos alunos, pouca equipe"; workflow sem código |
| **ServiceNow** (Student Service Mgmt) | Portal + catálogo + casos + base, escala corporativa | Serviços estudantis em grande escala | Georgian College: casos em <24 h, US$75 mil/ano economizados **[V]** | Contrato enterprise | Profundidade de workflow; **excessivo para instituição pequena** |
| **Salesforce Education Cloud** | CRM com visão 360° do aluno, casos, roteamento, base, agente de IA | Visão única do aluno entre setores | Indiana: 13 mil casos em 6 meses **[V]**; "ROI 507%" (estudo encomendado) **[V]** | US$87–350/usuário da equipe/mês | Contexto do aluno completo |
| **EAB Navigate360** | CRM de sucesso estudantil: alertas de risco, campanhas, agendamentos | Evasão e retenção | Graduação +3–15%, retenção +2–12% **[V]** | Sob consulta | Analítica preditiva; foco em retenção, não em dúvidas |
| **Ellucian CRM Advise/Service** | Filas, casos, notas e encaminhamentos entre setores | Atendimento integrado ao ERP Ellucian | — | Sob consulta | Amarrado ao ERP Ellucian |
| **Anthology** | — | — | Pediu recuperação judicial (Chapter 11) em 29/09/2025; produtos vendidos | — | **Sinal de risco de fornecedor** |
| **Modelo "one-stop shop"** (UT Austin e outras) | Organizacional: generalistas treinados atendem nível 1 (secretaria, financeiro, bolsas) e passam casos complexos a especialistas | "7 idas a 7 departamentos" | — | — | É o mesmo fluxo do One, com o bot no papel do nível 1 |

### Brasil

| Solução | O que faz | Resultados | Observação |
|---|---|---|---|
| **Yduqs/Estácio + Blip** | Agentes no WhatsApp para captação e matrícula; copiloto para atendentes | 13 mil+ chamados com copiloto; 61% das sugestões da IA aceitas; 92% das matrículas via "Smart Contact" sem humano **[V]** | Foco em **captação e receita**, não em atendimento acadêmico |
| **Ânima + Zenvia** | Chatbots no WhatsApp para ~400 mil alunos | Redução "significativa" no tempo de resposta, sem número **[V]** | Movidesk (helpdesk) agora é da Zenvia |
| **Kroton/Cogna + Plusoft — "Julia"** (~2015) | Chatbot; perguntas não respondidas eram registradas e curadas por humanos | 80% dos diálogos tratados pelo bot **[V]** | Único caso brasileiro com **ciclo lacuna → base de conhecimento** explícito |
| **TOTVS Educacional (RM)** | Requerimento no portal vira atendimento no CRM TOTVS, com prazos, anexos e discussão | — | Camada de **protocolo formal**, não conversacional |
| **Jacad** | Requerimentos online (declarações, históricos) com acompanhamento de status | — | Idem |
| **Lyceum** | Chatbot consulta notas e boletos, solicita documentos, passa ao humano | — | O mais próximo do One entre os ERPs; amarrado ao próprio ERP |
| **Gennera** | Acompanhamento de solicitações, boletos e PIX | — | ERP |
| **Estudo UNESC** (acadêmico) | Estudo de caso de chatbot | 61% das demandas eram dúvidas simples; 76% preferem WhatsApp **[I]** | Sem resultado pós-implantação |

**Univag hoje:** tem Portal do Aluno (ASP.NET) e uma **CAE — Central de Atendimento ao Estudante** (matrícula, protocolo, financeiro, FIES, estágio). O ERP por trás **não foi confirmado**.

---

## 3. Helpdesks líderes de mercado (gerais)

| Produto | Fluxo | Resultados | Modelo de preço (IA) | Diferencial |
|---|---|---|---|---|
| **Zendesk** | Chamado primeiro; IA na frente | — | ~US$1,50–2,00 por resolução **verificada** (desde mai/2026) **[3P]** | Definição rigorosa de "resolvido" (72 h sem retorno + checagem por LLM); roteamento e SLA maduros |
| **Intercom Fin** | **Conversa primeiro**; IA na frente, caixa de entrada atrás | 76% de resolução média **[V]**; revisores independentes relatam menos | US$0,99 por resolução | Pioneiro em cobrar por resultado; sugere melhorias de conteúdo a partir de conversas que falharam |
| **Freshdesk / Freshservice** | Chamado primeiro | — | Por **sessão** — paga mesmo quando o bot falha **[3P]** | Preço e simplicidade |
| **ServiceNow** | Workflow corporativo (CMDB, catálogo, SLA) | 86% de deflexão de tarefas repetitivas (uso interno) **[V]** | Contrato enterprise | Profundidade e governança |
| **Jira Service Management** | Portal/chamado primeiro | Deflexão 20–40% **[V]** — a estimativa mais conservadora | Por atendente; agente virtual incluso até 1.000 conversas/mês | Integração com Jira/Confluence |
| **HubSpot Service Hub** | Conversa primeiro, sobre o CRM | 65% das conversas resolvidas **[V]** | ~US$0,50 por resolução; escalonamento não é cobrado | Contexto do CRM |
| **Salesforce Agentforce** | Caso primeiro + camada de agentes | — | US$2 por conversa ou por ação | Ações em registros; complexo e caro |
| **GLPI** (referência do One) | Chamado primeiro, ITIL, open source | — | Gratuito (auto-hospedado) | Regras de categorização/atribuição, SLA nativo; **sem IA generativa nativa** |
| **Movidesk (Zenvia)** | Chamado primeiro; todo canal vira chamado | — | R$0 a ~R$3.900/mês | Português, LGPD, preço em real |
| **Octadesk** | Conversa primeiro, centrado em WhatsApp, IA própria | — | Por conversa ativa diária (R$2.499/mês para 3 mil) | WhatsApp |
| **Blip / Huggy** | Plataformas conversacionais / omnichannel | — | Consultivo / tabela pública | WhatsApp, voz |

**Tendência de mercado:** a cobrança está migrando de "por atendente" para **"por resultado"** (resolução). O ponto polêmico é **o que conta como resolvido**: abandono silencioso conta como resolução no Intercom, o que infla tanto a fatura quanto o índice divulgado.

---

## 4. Como eles geram valor

| Alavanca de valor | Como aparece | Quem compra por isso |
|---|---|---|
| **Deflexão** — dúvida resolvida sem humano | Menos ligações, e-mails, chamados | Gestor de atendimento (custo) |
| **Tempo da equipe** | Horas economizadas por semana | Coordenação / RH |
| **Tempo de resposta** | Resposta imediata vs. dias | Aluno (experiência) |
| **Rastreabilidade** | Histórico, protocolo, SLA | Gestão, auditoria, **regulador (MEC)** |
| **Retenção e matrícula** | Lembretes proativos por prazo | Reitoria / financeiro (receita) — é a alegação *premium* |
| **Dados** | Assuntos recorrentes, gargalos | Gestão (decisão) |

A única evidência **independente e forte** do setor é de **proatividade** (Georgia State): lembretes direcionados antes de prazos, não perguntas e respostas abertas.

---

## 5. Diferenciais competitivos dos líderes

1. **Definição rigorosa de "resolvido"** — resolução explícita/verificada, não tentativa. KPI e cobrança atrelados ao resultado.
2. **Ciclo de conhecimento (KCS)** — conversas que falharam alimentam sugestões de artigos; o índice de resolução cresce com o tempo (~1% ao mês segundo o Fin **[V]**). KCS maduro: tempo de resolução 25–50% melhor em 3–9 meses; usuário volta ao autoatendimento se achar ajuda em 40–50% das vezes.
3. **Passagem ao humano sem perda de contexto** — bot e humano compartilham o mesmo registro: transcrição, intenção, categoria, dados coletados.
4. **Respostas ancoradas e controláveis** — só a partir de conteúdo aprovado, com recusa quando não encontra.
5. **Espaço de trabalho e analítica unificados** — uma caixa, roteamento, SLA, satisfação e comparação bot vs. humano.
6. **Encaixe local** — no Brasil: WhatsApp, LGPD, preço em real, português.
7. **Encaminhar para o que já existe** — no ensino superior, o valor está em levar o aluno à ação que já existe no ERP/portal (boleto, declaração), não em reimplementá-la.

---

## 6. Modos de falha conhecidos (evidência independente)

| Caso | O que aconteceu | Lição para o One |
|---|---|---|
| **Moffatt v. Air Canada** (2024) | Tribunal responsabilizou a empresa por política de reembolso inventada pelo chatbot | A instituição responde pelo que o bot diz → só responder da base, citar o artigo |
| **Cursor** (abr/2025) | Bot de suporte inventou uma política; usuários cancelaram | Rotular respostas de IA |
| **CFPB** (regulador dos EUA) | "Doom loops": respostas repetitivas sem caminho até um humano | Sempre oferecer "falar com uma pessoa" |
| **Gartner** (n=5.728) | 64% preferem que empresas não usem IA no atendimento; medo principal: ficar mais difícil falar com alguém | Idem; deixar a saída visível |
| **Gartner** | Só 14% das questões resolvidas em autoatendimento; 36% das "muito simples" | Meta realista de 20–40% no MVP |
| **Klarna** | Disse que a IA substituía 700 atendentes; recontratou humanos por queda de qualidade | Medir qualidade, não só contenção |

---

## 7. Implicações para o One

### O que a pesquisa confirma na spec atual

- Responder só a partir de artigos publicados e dizer que não encontrou quando não há artigo (BR-B2, BR-B4) — é exatamente a mitigação dos casos Air Canada/Cursor.
- "Isso resolveu? Sim/Não" com resolução **explícita** (BR-B3, BR-B5) — mais rigoroso que o Intercom; o abandono já é medido separado (`ABANDONED`).
- Conversa vira chamado com transcrição (seção D) — padrão dos líderes.
- Roteamento por regra categoria → setor com setor de triagem (seção E) — padrão GLPI/Zendesk.
- Taxa de roteamento correto = chamados sem reencaminhamento (seção I) — mesma métrica recomendada.
- Deep link para o Portal do Aluno em vez de integrar — padrão "encaminhar para o que já existe".

### Posicionamento sugerido

> **Atendimento acadêmico com triagem e registro, leve o bastante para uma instituição de ~10 mil alunos, que responde só o que a instituição aprovou e gera evidência para o MEC.**

Diferenciais possíveis frente ao mercado:

1. **Roteamento acadêmico** (curso → coordenação) — Blip/Zenvia/Octadesk não têm.
2. **Evidência para o SINAES** (indicador 3.10, relatório para CPA/ouvidoria) — ninguém oferece.
3. **Proteção do tempo da coordenação** como métrica principal — ferramentas focam secretaria e financeiro.
4. **Ciclo lacuna → artigo com curadoria humana** — só o caso Kroton "Julia" descreve.
5. **Avaliação honesta** (baseline antes/depois) — quase todo resultado brasileiro é release de fornecedor.

### Pontos a decidir (candidatos a mudança na spec — não aplicados)

| # | Proposta | Base | Onde na spec |
|---|---|---|---|
| P1 | Oferecer "falar com uma pessoa" em toda resposta, não só após "Não" | CFPB, Gartner | BR-B3/B6 |
| P2 | Mostrar a fonte (artigo) e rotular a resposta como gerada por IA | Air Canada, Cursor | BR-B2 |
| P3 | Relatório semanal de lacunas (perguntas sem artigo + chamados por categoria) — hoje é só a métrica "No-answer rate" | KCS, Fin, Julia | Seção I / fora de escopo |
| P4 | Atendente sugere/cria artigo ao resolver um chamado (KCS leve) — hoje está fora de escopo | KCS | Out of scope |
| P5 | Métricas de tempo em horário comercial (setores não funcionam 24/7) | Boas práticas de SLA | Q10 |
| P6 | Satisfação (joinha) na resposta do bot e após o fechamento — hoje CSAT está fora de escopo | Líderes | Out of scope |
| P7 | Meta de autoatendimento do piloto em 20–40% | Gartner, JSM | Critérios do piloto |
| P8 | WhatsApp como primeiro canal extra depois do MVP | UNESC (76%), mercado BR | Fora de escopo (manter) |
| P9 | Lembretes proativos por prazo (matrícula, rematrícula, boleto) — única evidência independente forte | Georgia State | Evolução pós-MVP |

### Novas perguntas para a coordenação/instituição

- Qual a relação do One com a **CAE (Central de Atendimento ao Estudante)**? A CAE seria um setor/atendente no One, ou o One seria a porta de entrada que a CAE atende?
- Qual **ERP acadêmico** a Univag usa? (define se existe "requerimento" formal que o One deve apenas encaminhar)
- A **ouvidoria/CPA** usa algum registro hoje para o indicador 3.10?

---

## 8. Fontes principais

**Ensino superior**
- Georgia State / Mainstay: https://success.gsu.edu/reduction-of-summer-melt/ · https://eric.ed.gov/?id=EJ1294362 · https://files.eric.ed.gov/fulltext/EJ1194134.pdf · https://edworkingpapers.com/ai20-208 · https://edworkingpapers.com/sites/default/files/ai22-564.pdf
- Ivy/Ocelot/Gravyty: https://campustechnology.com/articles/2025/03/11/gravyty-merges-with-ai-powered-student-engagement-companies-ivy-ai-and-ocelot.aspx · https://ocelotbot.com/features/chatbot/ · https://ivy.ai/pricing
- TeamDynamix: https://teamdynamix.com/tdx_resources/case-study-university-of-south-dakota · https://www.rezolve.ai/blog/teamdynamix-pricing
- ServiceNow Georgian College: https://www.servicenow.com/content/dam/servicenow-assets/public/en-us/doc-type/resource-center/case-study/cs-georgian-college.pdf
- Salesforce Education: https://www.salesforce.com/education/pricing/
- EAB: https://eab.com/why-eab/partner-stories/student-success-compendium/
- Anthology: https://www.insidehighered.com/news/tech-innovation/administrative-tech/2025/10/08/why-ed-tech-behemoth-unraveled
- One-stop: https://www.insidehighered.com/news/2022/09/21/students-get-better-service-colleges-one-stops-infographic
- Yduqs/Blip: https://abes.org.br/en/blip-impulsiona-yduqs-a-transformar-conversas-em-matriculas/
- Ânima/Zenvia: https://www.zenvia.com/casos-de-sucesso/anima-educacao/
- Kroton "Julia": https://abrarec.com.br/kroton-atende-estudantes-com-tecnologia-chatbot-da-plusoft/
- TOTVS: https://tdn.totvs.com/display/public/LRM/Requerimentos · Jacad: https://conteudos.jacad.com.br//requerimentos-online-e-automatizados/ · Lyceum: https://blog.lyceum.com.br/suporte-ao-aluno/
- UNESC: https://revistaft.com.br/aplicacao-de-chatbots-para-automatizacao-do-atendimento-academico-um-estudo-de-caso/
- Univag CAE: https://www.univag.com.br/servicos/12/atendimento-estudantil-cae/

**Regulatório**
- Instrumento INEP recredenciamento 2017 (indicadores 3.9, 3.10): https://download.inep.gov.br/educacao_superior/avaliacao_institucional/instrumentos/2017/IES_recredenciamento.pdf
- Portaria MEC 315/2018 (acervo acadêmico digital): https://abmes.org.br/arquivos/legislacoes/Port-MEC-315-2018-04-04.pdf

**Helpdesks gerais**
- Zendesk: https://support.zendesk.com/hc/en-us/articles/8357756668186 · https://support.zendesk.com/hc/en-us/articles/9570369117338
- Intercom Fin: https://fin.ai/help/en/articles/13975800-fin-pricing-outcomes · https://fin.ai/learn/ai-resolution-rate
- Freshdesk: https://www.eesel.ai/blog/freshdesk-freddy-ai-pricing
- ServiceNow: https://www.servicenow.com/customers/now-on-now-now-assist.html
- Jira SM: https://www.atlassian.com/software/jira/service-management/product-guide/tips-and-tricks/virtual-agent
- HubSpot: https://www.hubspot.com/company-news/hubspots-customer-agent-and-prospecting-agent-now-you-pay-when-the-task-is-complete
- Salesforce Agentforce: https://help.salesforce.com/s/articleView?id=004811240&language=en_US&type=1
- GLPI: https://www.glpi-project.org/en/features/
- Movidesk: https://zenvia.com/movidesk/ · Octadesk: https://www.octadesk.com/precos
- KCS: https://library.serviceinnovation.org/KCS/KCS_v6/KCS_v6_Adoption_Guide/000_Introduction/020_KCS_Benefits

**Modos de falha**
- Air Canada: https://www.mccarthy.ca/en/insights/blogs/techlex/moffatt-v-air-canada-misrepresentation-ai-chatbot
- Cursor: https://www.theregister.com/special-features/2025/04/18/cursor-ai-support-bot-hallucinated-its-own-company-policy/1015579
- CFPB: https://www.consumerfinance.gov/data-research/research-reports/chatbots-in-consumer-finance/chatbots-in-consumer-finance/
- Gartner (64%): https://www.gartner.com/en/newsroom/press-releases/2024-07-09-gartner-survey-finds-64-percent-of-customers-would-prefer-that-companies-didnt-use-ai-for-customer-service
- Gartner (14%): https://www.gartner.com/en/newsroom/press-releases/2024-08-19-gartner-survey-finds-only-14-percent-of-customer-service-issues-are-fully-resolved-in-self-service
- Klarna: https://www.customerexperiencedive.com/news/klarna-reinvests-human-talent-customer-service-AI-chatbot/747586/
