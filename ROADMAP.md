# One: roadmap

- **Data:** 01/11/2026
- **Base:**
  - `.specs/features/mvp-one/plan.md`: o que entra no MVP, slices S1 a S13;
  - `.specs/STATE.md`: decisões AD-001 a AD-012;
  - `.specs/features/mvp-one/glpi-referencia.md`: o que foi aproveitado do GLPI.
- **Substitui:** `D:\One\One\roadmap.md` (23/09/2026). Aquele roadmap ainda deixava
  multi-instituição para a Fase 7 e mostrava o artigo ao aluno, duas coisas que mudaram.
- **Regra:** uma etapa só fecha quando os critérios dela estão provados por teste. A data é meta;
  quem decide é o critério de saída.

## O produto em uma frase

Helpdesk acadêmico automatizado para várias instituições, no modelo de atendimento de banco:
- um assistente de IA tenta resolver usando a base interna de orientações da instituição;
- o aluno pode pedir um atendente a qualquer momento;
- o caso chega ao setor certo com protocolo e contexto, sem o aluno repetir nada;
- a instituição mede tudo.

A Univag é o primeiro cliente.

## Datas fixas

| Data | Marco | O que precisa estar pronto |
| --- | --- | --- |
| 13/11/2026 (qui) | 1ª versão no AVA | Etapas 1 e 2 concluídas: entrar, conversar com o assistente e ver a resposta conferida |
| 20/11/2026 (qui) | Aplicação para a banca | Todos os slices P1 funcionando de ponta a ponta, hospedados, com os dados da Univag |
| 27/11/2026 (sex) | Entrega final | P2 que couber, documento ABNT atualizado, relatório de verificação |

## Onde estamos

| Item | Estado |
| --- | --- |
| Plano do MVP (`plan.md`) | Aprovado em 01/11/2026 |
| `checks.md` (critérios com prova) | Escrito: 195 checks, validado pelo `validate_checks.py` |
| Código | Nenhum. `D:\one-system` ainda não é repositório git |
| Perguntas que bloqueiam o uso real | 6 abertas (ver "Decisões e bloqueios") |

## Etapas até a banca

```text
 Etapa 0      Etapa 1        Etapa 2         Etapa 3            Etapa 4
 Preparar  →  Fundação   →   Assistente  →   Transferência  →   Banca
 01–03/11     03–06/11       06–12/11        12–16/11           16–19/11
                                    ▲ 13/11 AVA                    ▲ 20/11 banca
```

### Etapa 0: preparar (01–03/11)

- [x] Aprovar `plan.md`. Pontos que pedem atenção:
  - os artigos são internos e o aluno vê só a resposta (AD-012);
  - a IA sugere a categoria (AD-010);
  - a instituição é identificada pelo endereço `/{slug}` (door 10).
- [x] Escrever `checks.md`: cada critério com o teste que o prova, a cobertura das rotas e a
      varredura das 9 dimensões (skill `tlc-spec-lean`).
- [ ] `git init` em `D:\one-system` e criar o repositório remoto do grupo.
- [ ] Criar a conta DeepSeek com crédito (pergunta 3). Sem ela, o assistente só diz "não
      encontrei".
- [ ] Pedir à coordenação da Univag os setores, os atendentes e o texto dos primeiros 10 a 30
      artigos (pergunta 6). **É o item de prazo mais longo.**

**Saída:** plano aprovado, `checks.md` validado pelo `validate_checks.py`, chave de IA funcionando.

### Etapa 1: fundação (03–06/11), slices S1, S2 e S12

- [ ] Monorepo `api/`, `api.Tests/` e `web/`, com `docker-compose.yml` (PostgreSQL 18 e Mailpit).
- [ ] Banco com `instituicao_id` em todas as tabelas e filtro global no EF Core (door 16).
      Testar que a instituição `demo` não vê nada da `univag`.
- [ ] Comandos `instituicao criar` e `instituicao carga` (S1).
- [ ] Login por CPF dentro da instituição, primeiro acesso por e-mail e troca de senha (S2).
- [ ] Base da SPA: PWA, react-bootstrap, tela de login em `/{slug}`, erros em `Alert` (S12).

**Saída:** o aluno da `univag` entra com o CPF, e o mesmo CPF na `demo` é outra conta.

### Etapa 2: assistente (06–12/11), slice S3 e a parte da base de artigos usada pela carga

- [ ] Chamada ao DeepSeek com os artigos ativos, as categorias e a conversa, retirando números
      longos e e-mails das mensagens (door 4).
- [ ] Conferência no servidor (door 19):
  - cada trecho precisa aparecer literalmente no artigo;
  - cada link precisa estar nos links do artigo;
  - qualquer falha vira "não encontrei".
- [ ] Nenhum dado de artigo na API do aluno (AC 40). Teste com resposta simulada que inventa regra.
- [ ] Registro append-only do texto exibido, dos trechos e das versões citadas (AC 44, door 6).
- [ ] **Medir com o DeepSeek de verdade** quantas respostas caem em "não encontrei" porque o
      trecho não confere. Se passar de 1 em cada 3, ajustar o prompt antes da banca.

**Saída (13/11, AVA):** conversa com o assistente funcionando, com respostas conferidas e
"não encontrei" quando não há base.

### Etapa 3: transferência e atendimento (12–16/11), slices S4, S5 e S8 (importação)

- [ ] "Falar com atendente" a qualquer momento, com protocolo `ONE-n` contado por instituição
      (door 5).
- [ ] A categoria vem da sugestão da IA, senão do artigo citado, senão de "Não classificado". A
      regra de roteamento decide o setor ou a coordenação do curso.
- [ ] O chamado continua na mesma conversa do aluno, atualizada a cada 15 s (door 18).
- [ ] Fila do atendente; detalhe com matrícula, resumo da IA e fontes; assumir, pedir informação
      e resolver; o aluno confirma ou rejeita.
- [ ] Importação do CSV `cpf;nome;email;matricula;curso;semestre;situacao` (S8, critérios de
      importação).

**Saída:** o fluxo completo, da pergunta ao fechamento, num teste de ponta a ponta.

### Etapa 4: banca (16–19/11)

- [ ] Verificador independente (subagente novo) sobre todos os checks P1; corrigir o que ele
      apontar.
- [ ] Hospedagem e domínio da banca (pergunta 5). Plano B: `docker compose` num notebook do grupo.
- [ ] Carga da `univag` com dados e artigos reais ou de exemplo, e uma segunda instituição
      `demo`, para mostrar a separação.
- [ ] Roteiro da demonstração em 5 minutos:
  1. o aluno pergunta sobre o boleto e o assistente resolve;
  2. o aluno pergunta sobre falta abonada, a IA inventa e o sistema segura com "não encontrei";
  3. o aluno pede um atendente e o chamado chega à coordenação de ADS;
  4. o atendente resolve e o aluno confirma;
  5. a `demo` não vê nada da `univag`.
- [ ] Ensaiar com a internet caída: o assistente precisa cair em "não encontrei" sem travar.

**Saída (20/11):** demonstração ensaiada; todos os slices P1 verdes.

## Depois da banca (21–27/11): entrega final

| Prioridade | Item | Slice |
| --- | --- | --- |
| 1 | Encaminhar e reclassificar chamado | S6 |
| 2 | Tela de artigos do administrador (escrever, ativar, versionar, arquivar) | S7 |
| 3 | Prazos automáticos: abandono em 30 min, fechamento em 7 dias | S9 |
| 4 | Indicadores da instituição e das coordenações, com taxa de autoatendimento | S11 |
| 5 | Resto da administração: usuários, setores, categorias, regras | S8 |
| — | Atualizar o documento ABNT em `D:\One\One`: modelo lógico com instituição, conversa com várias mensagens, artigo interno, trechos, `email_saida` | documentação |
| — | Relatório de verificação final (`verification.md`) | processo |

## Depois da entrega: piloto e produto

| Fase | Objetivo | Itens |
| --- | --- | --- |
| Piloto na Univag | provar o resultado com alunos reais de ADS | <ul><li>resolver as perguntas 1, 2 e 4 (CSV real, aceite do DeepSeek pela LGPD ou troca de provedor, SMTP);</li><li>medir autoatendimento, transferência e tempo de resolução contra a linha de base do Quadro 5</li></ul> |
| P3 | completar o atendimento | <ul><li>e-mails com fila de reenvio e anexos (S10);</li><li>lembrete e resolução por falta de resposta, respostas prontas, duplicado e validade de artigo (S13)</li></ul> |
| Qualidade da IA | aprender com o que falhou | <ul><li>relatório de perguntas sem base;</li><li>revisão das respostas da IA pelo administrador;</li><li>botão "reportar resposta errada";</li><li>atendente sugere artigo a partir da resolução</li></ul> |
| Segunda instituição | provar o produto multi-instituição | <ul><li>tela do operador;</li><li>provedor de IA, prazos e marca por instituição;</li><li>subdomínio próprio</li></ul> |
| Integrações | tirar o CSV do caminho | <ul><li>API dos ERPs acadêmicos;</li><li>Moodle com botão "Preciso de ajuda";</li><li>WhatsApp como primeiro canal extra</li></ul> |
| Produto comercial | vender | <ul><li>cobrança por resolução ou por aluno ativo;</li><li>LGPD completa;</li><li>observabilidade;</li><li>busca no INPI pelo nome "One"</li></ul> |

## Decisões e bloqueios

| # | Pergunta | Quem resolve | Até | Se não resolver |
| --- | --- | --- | --- | --- |
| 1 | A Univag fornece o CSV dos alunos do piloto? | coordenação / TI Univag | piloto | só alunos de teste |
| 2 | A Univag aceita o DeepSeek, com dados na China (LGPD art. 33)? | Univag (jurídico) | piloto | trocar `Llm:BaseUrl` e `Llm:Modelo` por um provedor aceito |
| 3 | Quem cria a conta DeepSeek e coloca crédito? | grupo | **03/11** | o assistente só diz "não encontrei" |
| 4 | Qual conta SMTP envia os e-mails? | grupo | 16/11 | Mailpit local e senha temporária dada pelo admin |
| 5 | Onde hospedar a banca, e com qual domínio? | grupo | **16/11** | `docker compose` num notebook |
| 6 | A coordenação fornece setores, atendentes e textos dos artigos? | coordenação Univag | **06/11** | carga de exemplo escrita pelo grupo |
| 7 | A "exigência do MEC" são os indicadores 3.10, 3.11 e 2.3? | coordenadora | 27/11 | vale o padrão: nada é apagado, sem relatório para o MEC |

## Riscos

| Risco | Mitigação |
| --- | --- |
| A IA inventa uma regra (caso Air Canada) | o servidor confere trechos e links; se algo falha, mostra "não encontrei"; tudo fica gravado (door 19, AD-012) |
| O DeepSeek não copia os trechos literalmente e quase tudo vira "não encontrei" | medir na Etapa 2 com a chave real; ajustar o prompt; se não resolver, testar outro modelo trocando só a configuração |
| A base interna vaza para o aluno | AC 40 com teste na API do aluno; fontes só para atendente e administrador |
| Dados de uma instituição aparecem em outra | filtro global (door 16) e teste com duas instituições em toda rota |
| 19 dias para a banca | só os slices P1 até 20/11; P2 depois; o roteiro da demo é o critério |
| Não ter artigos reais da Univag a tempo | pedir em 03/11; plano B: o grupo escreve 10 artigos a partir do Quadro 6 |
| Internet ou API de IA fora do ar na banca | "não encontrei" com transferência continua funcionando; ensaiar sem rede |
| Aluno preso no robô | "Falar com atendente" sempre visível, inclusive antes da primeira mensagem |
| Expectativa inflada de autoatendimento | meta do piloto de 20 a 40% (Gartner), não os 65 a 98% dos fornecedores |
| Crescimento de escopo | a seção `Out of scope` do plano decide; item novo entra lá antes de entrar no código |
