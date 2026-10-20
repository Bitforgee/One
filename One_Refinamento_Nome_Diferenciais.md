# One — Refinamento de Nome e Diferenciais do MVP

- **Data:** 23/09/2026
- **Base:** `One_MVP_Visao_Produto.md`, `One_Pesquisa_Mercado_Helpdesks.md`,
  `specs/mvp-business-rules/requirements.md` (entrevista E1).
- **Status:** proposta. Nada foi alterado na visão nem na spec.

---

## 1. Diagnóstico

1. **O descritor atual vende tecnologia, não resultado.** "Central *Inteligente* de Atendimento
   Universitário" é o que o próprio `One_Caminho_Para_Criar_Um_Bom_Produto.md` (§20.2) manda
   evitar. A pesquisa reforça: 64% dos usuários preferem que não se use IA no atendimento (Gartner).
2. **Parte dos "diferenciais" da visão não existe no MVP.** A spec deixou fora de escopo o
   roteamento por IA, o ciclo automático de conhecimento (§8.4), incidentes coletivos e o
   Moodle. Apresentá-los como diferencial do MVP é prometer o que o piloto não entrega.
3. **O núcleo do fluxo não é diferencial, é paridade.** Base de conhecimento → bot → humano com
   contexto é o padrão de Intercom, Zendesk, HubSpot e Mainstay (pesquisa, §1 item 2). É
   obrigatório ter, mas não é o motivo para escolher o One.
4. **A entrevista E1 mudou o motivo de compra.** A coordenadora falou em registro exigido pelo
   MEC (E1.2) e em falta de tempo (E1.3); as principais demandas já têm solução no Portal do
   Aluno (E1.7). O valor está em **registro, triagem e proteção do tempo da coordenação**, não em
   "responder com IA".

---

## 2. Nome

### Recomendação: manter **One**, trocar o descritor

| Mantém | Troca |
|---|---|
| **One** — já está em toda a documentação e sustenta a frase principal ("O aluno não precisa saber quem resolve. O One precisa."). | ~~Central Inteligente de Atendimento Universitário~~ |

**Descritor proposto:**

> **One — o atendimento acadêmico em um só lugar, com registro.**

Alternativas, caso o grupo prefira outra ênfase:

| Descritor | Ênfase | Quando usar |
|---|---|---|
| **One — atendimento acadêmico em um só lugar, com registro** (recomendado) | Canal único + rastreabilidade (MEC) | Apresentação para coordenação e gestão |
| One — pergunte uma vez, chegue ao setor certo | Aluno: não repetir, não procurar setor | Tela inicial e comunicação com alunos |
| One — a porta única do aluno | Modelo *one-stop shop* (UT Austin), citado na pesquisa | Pitch curto |

**Por que não trocar o nome agora:** o projeto está em Discovery. Trocar o nome não valida
nenhuma hipótese e gera retrabalho na documentação.

**Risco a tratar antes da fase comercial (Fase 7):** "One" é uma palavra genérica, difícil de
achar em busca e provavelmente já registrada por terceiros em classes de software/educação.
**Não verificado** — fazer busca no INPI antes de investir em marca. Se estiver ocupado,
candidatos em português para avaliar na época: **Balcão** (de "balcão único", o termo
brasileiro para *one-stop shop*) e **Encaminha** (descreve a triagem). Também não verificados.

---

## 3. Diferenciais refinados

Critério: só entra como diferencial do MVP o que (a) está no escopo da spec e (b) os
concorrentes analisados não oferecem ou oferecem mal.

### 3.1 Diferenciais do MVP

| # | Diferencial | Onde está garantido | Por que é diferencial | Evidência |
|---|---|---|---|---|
| 1 | **Encaminha pelo curso do aluno.** "Minha nota não saiu" vai para a coordenação *do curso dele*, sem o aluno escolher setor. | BR-E2(b), BR-E3, AC4 | Blip, Zenvia e Octadesk roteiam por canal/fila, sem modelo acadêmico; os ERPs têm requerimento formal, não triagem. | Pesquisa §1 item 1, §7 |
| 2 | **Todo atendimento fica registrado e auditável.** Quem pediu, quem respondeu, quando, o que foi dito; nada é apagado. | Seção H (BR-H1, BR-H2), BR-G3 | Atende uma necessidade de conformidade citada pela coordenação; nenhum fornecedor mapeia o indicador 3.10 do INEP. | E1.2; pesquisa §1 item 5. **Depende da Q15** |
| 3 | **Protege o tempo da coordenação.** Dúvida simples é respondida ou vai para o setor certo antes de chegar a ela; a métrica principal é "quantas demandas chegam à coordenação". | BR-E2, métricas da seção I | Concorrentes medem secretaria/financeiro e deflexão genérica, não o tempo do coordenador. | E1.3; pesquisa §7 item 3. **Depende da Q17 (baseline)** |
| 4 | **Só responde o que a instituição aprovou.** Sem artigo publicado, diz que não sabe e oferece encaminhar; nunca inventa regra. | BR-B2, BR-B4 | Mitiga o caso Air Canada (instituição responsável pelo que o bot diz). | Pesquisa §6 |
| 5 | **Leve de adotar.** Não integra com ERP: aponta o aluno para o serviço que já existe no Portal do Aluno. | Fora de escopo (integrações); E1.7 | Cabe numa coordenação sem projeto de TI; as plataformas americanas exigem ERP e contrato enterprise. | Pesquisa §2, §5 item 7 |

### 3.2 Paridade obrigatória (não vender como diferencial)

- Pergunta em linguagem natural.
- Base de conhecimento antes do chamado.
- Conversa vira chamado sem o aluno repetir (BR-D2) — continua sendo a demonstração central do
  MVP, mas é o que os líderes já fazem.
- Status e histórico visíveis ao aluno.

### 3.3 Visão futura (não prometer no piloto)

- Ciclo lacuna → artigo com curadoria humana (propostas P3/P4 da pesquisa).
- Roteamento assistido por IA.
- Atendimento contextual no Moodle.
- Detecção de incidentes coletivos.
- Lembretes proativos por prazo (P9 — única evidência independente forte do setor).

---

## 4. Ajustes sugeridos em `One_MVP_Visao_Produto.md`

Não aplicados; dependem de aprovação.

| Seção | Hoje | Proposta |
|---|---|---|
| Título | "Central Inteligente de Atendimento Universitário" | "o atendimento acadêmico em um só lugar, com registro" |
| §7, §8 | Listam roteamento inteligente e ciclo contínuo como diferenciais | Separar em "diferenciais do MVP" (3.1), "paridade" (3.2) e "visão futura" (3.3) |
| §8.3 | "Roteamento inteligente" | "Roteamento pelo curso do aluno (por regras)" |
| §25 (tabela) | "Dados: operacionais + acadêmicos"; "Roteamento baseado em contexto acadêmico" | "Roteamento por curso → coordenação"; acrescentar linha "Registro auditável" |
| §40 | Pitch com "camada inteligente" | Pitch da seção 5 abaixo |

---

## 5. Pitch refinado

**Uma frase:**

> O One é o canal único de atendimento acadêmico: responde o que a instituição já documentou,
> encaminha o resto ao setor certo pelo curso do aluno e registra tudo — para que a
> coordenação só receba o que precisa dela.

**Curto (30 segundos):**

> Hoje o aluno manda e-mail ou WhatsApp para a coordenação até para pedir boleto, que já está no
> Portal do Aluno. Não há registro de quem respondeu nem quando.
>
> No One, o aluno escreve o que precisa. Se a instituição já tem a resposta, ele recebe na hora,
> com o caminho no portal. Se não, a conversa vira uma solicitação com protocolo, encaminhada
> ao setor responsável pelo curso dele, sem precisar explicar de novo.
>
> A coordenação recebe menos demandas simples, e a instituição passa a ter o registro de
> todos os atendimentos.

---

## 6. O que valida (ou derruba) esta proposta

A reunião de 01/10/2026 decide três dos cinco diferenciais:

| Diferencial | Pergunta do roteiro | Se a resposta for negativa |
|---|---|---|
| 2 — Registro para o MEC | 5.1–5.3 (Q15) | Rebaixar para "rastreabilidade" (benefício de gestão, não de conformidade) e tirar "com registro" do descritor |
| 3 — Tempo da coordenação | 1.1–1.5 (Q17) | Se chegam poucas demandas a ela, o público principal passa a ser secretaria/CAE |
| 1 — Encaminha pelo curso | 2.2–2.3 (Q16), 7.1 (CAE) | Se quase tudo vai para a CAE, o diferencial vira "triagem para a CAE", não "coordenação do curso" |

Resultado de 01/10/2026 (só as seções 1–2 do roteiro foram cobertas; achados E1.8–E1.13 em
`requirements.md`):

- **Diferencial 3 — mantido.** Chegam a ela ~256 mensagens por semana, ~50% demandas de fato.
- **Diferencial 1 — mantido.** Só financeiro e documentos pessoais vão para a CAE; o restante se
  divide entre coordenação, professor e representante. O professor ainda não cabe no
  roteamento (Q18).
- **Diferencial 2 — em aberto.** A seção 5 (MEC) não foi perguntada; segue por e-mail (Q15).
