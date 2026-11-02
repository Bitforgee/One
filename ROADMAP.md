# One: roadmap

- **Data:** 02/11/2026, revisão da tarde (RAG antes da banca, OpenAI no lugar do DeepSeek)
- **Base:**
  - `.specs/features/mvp-one/plan.md`: o que entra no MVP, slices S1 a S13;
  - `.specs/features/mvp-one/checks.md`: os 195 critérios com prova e as decisões tomadas no build (`## Handoff`);
  - `.specs/STATE.md`: decisões AD-001 a AD-013;
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
| 13/11/2026 (qui) | 1ª versão no AVA | entrar, conversar com o assistente e ver a resposta conferida |
| 20/11/2026 (qui) | Aplicação para a banca | todos os slices P1 funcionando de ponta a ponta, hospedados, com os dados da Univag |
| 27/11/2026 (sex) | Entrega final | P2 que couber, documento ABNT atualizado, relatório de verificação |

## Onde estamos (02/11/2026)

O código do MVP inteiro, P1, P2 e P3, ficou pronto bem antes das datas. O que falta para a banca
deixou de ser código: são dados reais, chave de IA, hospedagem e ensaio.

| Item | Estado |
| --- | --- |
| Plano do MVP (`plan.md`) | Aprovado em 01/11/2026 |
| `checks.md` | 195 checks; os 195 marcados como provados pelo construtor |
| Código | Os 13 slices (S1 a S13) e as telas de administração, em 4 lotes, todos verdes. 11 commits em `main` (`8c0cb43..a1314d6`) |
| Testes | API 190, web 32, e2e de 360 px em 10 telas, e2e de PWA contra o contêiner |
| Verificação independente | **Rodando** (subagente novo, perfil `standard`, com injeção de falhas). O relatório sai em `verification.md` |
| Repositório remoto do grupo | Não criado: `main` existe só nesta máquina |
| Perguntas que bloqueiam o uso real | 6 abertas (ver "Decisões e bloqueios") |

### O que já funciona

- **Instituições (S1):** várias instituições no mesmo banco, com filtro por instituição em toda
  tabela; comandos `instituicao criar` e `instituicao carga`.
- **Acesso (S2):** login por CPF dentro da instituição, primeiro acesso por e-mail, troca de senha
  e limite de tentativas.
- **Assistente (S3):** conversa com o modelo usando só os artigos ativos. O servidor confere cada
  trecho e cada link; se algo não confere, o aluno vê "não encontrei". Números longos e e-mails
  são retirados antes do envio, e nada do artigo chega ao aluno.
- **Transferência (S4):** "Falar com atendente" a qualquer momento, com protocolo `ONE-n` contado
  por instituição. A categoria vem da IA, do artigo ou do padrão, e o setor sai da regra. Quando o
  aluno tem mais de uma matrícula ativa, ele escolhe qual usar. A conversa é atualizada a cada 15 s.
- **Atendimento (S5, S6):** Fila, Minhas solicitações e detalhe do chamado. As ações são assumir,
  responder, nota interna, aguardando aluno, resolver, confirmar, rejeitar, cancelar, encaminhar e
  reclassificar. Uma tabela única define o que cada papel faz em cada estado, edição simultânea
  dá conflito, e o histórico não pode ser alterado nem apagado.
- **Base de conhecimento (S7):** tela Artigos para escrever, versionar, ativar e arquivar, com
  validade por data (S13).
- **Administração (S8):** importação do CSV de matrículas, que não grava nada se houver erro e
  mostra o erro de cada linha. Usuários com papéis, setores e senha temporária. Cadastros de
  setores, categorias, cursos, regras e respostas prontas.
- **Prazos (S9, S13):** conversa parada há 30 min é dada como abandonada; chamado resolvido fecha
  sozinho em 7 dias; em "aguardando aluno", lembrete no 3º dia e resolução automática no 7º.
- **Indicadores (S11):** os 14 do Quadro 12, contados no fuso da instituição, descontando o tempo
  em "aguardando aluno". A coordenação vê só os setores dela.
- **E-mail e anexos (S10):** fila `email_saida` com até 5 tentativas; anexos PDF, JPG e PNG de até
  10 MB, com o tipo conferido pelo conteúdo do arquivo.
- **Extras do GLPI (S13):** respostas prontas e marcação de chamado duplicado.
- **Plataforma (S12):** PWA instalável, sem rolagem horizontal a 360 px, erros em português num
  `Alert`.

## Etapas até a banca

```text
 Etapa 0      Etapa 1–3                 Etapa 4             Etapa 5                        Banca    Piloto
 Preparar  →  Código (feito 01–02/11)  → RAG com OpenAI  →   Dados, IA real e ensaio   →   20/11 →  Univag
 01–03/11                                03–09/11            09–19/11
                       ▲ 13/11 AVA: já atendido pelo código
```

### Etapa 0: preparar

- [x] Aprovar `plan.md`.
- [x] Escrever `checks.md` (skill `tlc-spec-lean`).
- [x] `git init` em `D:\one-system`.
- [ ] Criar o repositório remoto do grupo e enviar `main` (o `git push` espera o OK do grupo).
- [x] Conta da OpenAI criada (substitui a conta DeepSeek, que não é mais necessária).
- [ ] Colocar a chave da OpenAI no `.env` da raiz (`LLM_CHAVE_API=...`; o arquivo é ignorado pelo
      git) e garantir crédito. Sem ela, o assistente só diz "não encontrei".
- [ ] Pedir à coordenação da Univag os setores, os atendentes e o texto dos primeiros 10 a 30
      artigos (pergunta 6). **É o item de prazo mais longo.**

### Etapas 1 a 3: código, feitas em 01–02/11

- [x] Lote 1: fundação e assistente (S1, S2, S12, S3).
- [x] Lote 2: transferência, atendimento e importação (S4, S5, S8), mais as rotas do S6.
- [x] Lote 3: tela do S6, artigos (S7), prazos (S9) e indicadores (S11).
- [x] Lote 4: e-mail e anexos (S10), extras do GLPI (S13) e as telas de administração.
- [ ] Verificação independente aprovada. Rodadas 1 a 5 reprovaram só por testes faltando (o
      código não mudou de comportamento); a correção da rodada 5 está pronta e espera a rodada 6.

### Etapa 4: RAG com OpenAI (03–09/11), construído no `main`

Decisões do grupo em 02/11/2026: o RAG entra **antes** da banca, direto no `main`, e a banca de
20/11 roda com ele, sem uma versão anterior pronta para voltar (AD-014). Plano e checks aprovados
em `.specs/features/rag/` (45 checks):
- troca do DeepSeek pela OpenAI (`gpt-6-luna` no chat, `text-embedding-3-small` nos embeddings);
- busca por significado com `pgvector` no próprio PostgreSQL (imagem `pgvector/pgvector:0.8.7-pg18`);
- documentos da instituição em PDF como fonte, além dos artigos;
- comando `instituicao avaliar-busca` para medir a busca com perguntas reais;
- sem framework de agentes (MAF) nem `Microsoft.Extensions.AI`: as chamadas continuam pelo
  `HttpClient` próprio (door R7 do plano).

- [ ] Build dos 45 checks e verificação independente aprovada.
- [ ] Chamada real com a chave para responder a pergunta aberta 1 do plano (o `gpt-6-luna` aceita
      `temperature: 0`?).

**Saída:** RAG no `main` com os checks verdes e a verificação aprovada.

### Etapa 5: dados, IA real e ensaio (09–19/11)

- [ ] **Ensaio obrigatório com a chave real da OpenAI**, porque a banca roda no RAG sem versão
      anterior para voltar: chat da OpenAI, imagem `pgvector`, indexação de artigos e PDFs pelo
      agendador, e o assistente respondendo de ponta a ponta no contêiner.
- [ ] **Medir com a OpenAI de verdade** quantas respostas caem em "não encontrei" porque o trecho
      não confere, e rodar o `avaliar-busca` com perguntas reais. Se passar de 1 em cada 3, ajustar
      o prompt ou a base. **É o maior risco técnico que sobrou, e os testes não medem isso:** eles
      usam um provedor simulado.
- [ ] PDFs de exemplo ou reais da Univag (estatuto, regulamento de estágio, calendário) na tela
      Documentos.
- [ ] Arquivo de carga da `univag` (setores, cursos, categorias do Quadro 6 mais `Ouvidoria`,
      regras e artigos) e uma segunda instituição `demo`, para mostrar a separação.
- [ ] CSV de alunos de teste para a demonstração, importado pela tela Matrículas.
- [ ] Hospedagem e domínio da banca (pergunta 5). Plano B: `docker compose` num notebook do grupo;
      a imagem já sobe com `docker compose up -d --build` e aplica as migrações sozinha.
- [ ] SMTP de verdade (pergunta 4), ou demonstrar o e-mail no Mailpit.
- [ ] Roteiro da demonstração em 5 minutos:
  1. o aluno pergunta sobre o boleto e o assistente resolve;
  2. o aluno pergunta sobre falta abonada, a IA inventa e o sistema segura com "não encontrei";
  3. o aluno pede um atendente e o chamado chega à coordenação de ADS;
  4. o atendente responde com uma resposta pronta e um PDF, e depois resolve; o aluno confirma;
  5. o administrador abre os indicadores do dia;
  6. a `demo` não vê nada da `univag`.
- [ ] Ensaiar com a internet caída: o assistente precisa cair em "não encontrei" sem travar.

**Saída (20/11):** demonstração ensaiada com a chave real, hospedada, com as duas verificações
(MVP e RAG) aprovadas.

### Histórico: como a Etapa 4 (RAG) foi decidida

Decisão do grupo em 02/11/2026 (AD-014): o piloto na Univag só começa com o assistente usando
RAG. Hoje o catálogo inteiro de artigos ativos vai no prompt (door 4), sem busca nem embeddings.
Essa forma serve para 10 a 30 artigos e deixa de servir com a base real de uma instituição.

As decisões abaixo eram as que estavam em aberto em 02/11 de manhã. O plano aprovado à tarde
escolheu: artigos **e** documentos, busca por embeddings com `pgvector`, e a OpenAI gerando os
embeddings (o DeepSeek não tem API de embeddings).

| Decisão em aberto | Opções | Ponto de atenção |
| --- | --- | --- |
| O que entra na base consultada | só os artigos aprovados, como hoje, ou também documentos da instituição (estatuto, regulamentos, calendário em PDF) quebrados em trechos | documento bruto sem revisão humana enfraquece a regra de que a IA só fala o que a instituição aprovou (AD-012); uma saída é o PDF virar rascunhos de artigo que alguém revisa e ativa |
| Como buscar | busca textual em português do PostgreSQL (`to_tsvector('portuguese')`); embeddings com `pgvector`; ou as duas juntas (busca híbrida) | a busca textual não pede dependência nova; embeddings acham paráfrases, mas pedem um modelo de embeddings e reindexar quando um artigo muda |
| Quem gera os embeddings | API externa ou modelo local | é mais um envio de dados para fora: a mesma questão de LGPD da pergunta 2. Conferir antes se o DeepSeek oferece embeddings; não está confirmado |
| Quantos trechos vão ao modelo | os *k* mais próximos, com nota mínima | se a busca não trouxer o artigo certo, o aluno recebe "não encontrei" mesmo com a resposta existindo; isso precisa ser medido |

O que não muda com o RAG:
- a conferência literal dos trechos e dos links no servidor (door 19);
- o "não encontrei" quando algo não confere;
- o filtro por instituição (door 16), que vale também para a busca e para os vetores;
- nenhum dado de artigo chega ao aluno (AD-012).

**Saída:** com a base real da Univag, a taxa de "não encontrei" com RAG fica igual ou menor que
com o catálogo inteiro, medida sobre as mesmas perguntas, e todos os checks do plano novo verdes
com a verificação independente aprovada.

## Depois da banca (21–27/11): entrega final

O código previsto para esta semana (S6, S7, S9, S11 e o resto do S8) já está pronto. Sobra:

| Prioridade | Item | Tipo |
| --- | --- | --- |
| 1 | Atualizar o documento ABNT em `D:\One\One`. O modelo lógico precisa de instituição em toda tabela, CPF e senha em `usuario`, `matricula`, conversa com várias mensagens, artigo interno com validade, trechos citados, `resumo` e origem da categoria em `chamado`, anexos em `bytea` e `email_saida` | documentação |
| 2 | Relatório de verificação final (`verification.md`), aprovado pelo `validate_verification.py` | processo |
| 3 | Ajustes que a banca pedir | produto |

## Depois da entrega: piloto e produto

| Fase | Objetivo | Itens |
| --- | --- | --- |
| Piloto na Univag | provar o resultado com alunos reais de ADS | <ul><li>roda no RAG (Etapa 4), já usado na banca;</li><li>resolver as perguntas 1, 2 e 4 (CSV real, aceite da OpenAI pela LGPD, sem região de dados no Brasil, e SMTP);</li><li>medir autoatendimento, transferência e tempo de resolução contra a linha de base do Quadro 5</li></ul> |
| Escala | aguentar o volume de mais alunos | <ul><li>anexos em armazenamento de objetos (S3/MinIO) com streaming, quando o banco crescer (`shortcut:` em `Anexo.Conteudo`);</li><li>indicadores agregados em SQL (`shortcut:` em `IndicadorRotas.cs`)</li></ul> |
| Qualidade da IA | aprender com o que falhou | <ul><li>relatório de perguntas sem base;</li><li>revisão das respostas da IA pelo administrador;</li><li>botão "reportar resposta errada";</li><li>atendente sugere artigo a partir da resolução</li></ul> |
| Segunda instituição | provar o produto multi-instituição | <ul><li>tela do operador;</li><li>provedor de IA, prazos e marca por instituição;</li><li>subdomínio próprio</li></ul> |
| Integrações | tirar o CSV do caminho | <ul><li>API dos ERPs acadêmicos;</li><li>Moodle com botão "Preciso de ajuda";</li><li>WhatsApp como primeiro canal extra</li></ul> |
| Produto comercial | vender | <ul><li>cobrança por resolução ou por aluno ativo;</li><li>LGPD completa;</li><li>observabilidade;</li><li>busca no INPI pelo nome "One"</li></ul> |

## Decisões e bloqueios

| # | Pergunta | Quem resolve | Até | Se não resolver |
| --- | --- | --- | --- | --- |
| 1 | A Univag fornece o CSV dos alunos do piloto? | coordenação / TI Univag | piloto | só alunos de teste |
| 2 | A Univag aceita a OpenAI processando conversas mascaradas e documentos, sem região de dados no Brasil (LGPD art. 33)? | Univag (jurídico) | piloto | o assistente roda só em teste |
| 3 | ~~Quem cria a conta de IA?~~ Resolvida: conta da OpenAI criada. Falta a chave no `.env` com crédito | grupo | **03/11** | o assistente só diz "não encontrei", e o ensaio da Etapa 5 não acontece |
| 4 | Qual conta SMTP envia os e-mails? | grupo | 16/11 | Mailpit local e senha temporária dada pelo admin |
| 5 | Onde hospedar a banca, e com qual domínio? | grupo | **16/11** | `docker compose` num notebook |
| 6 | A coordenação fornece setores, atendentes e textos dos artigos? | coordenação Univag | **06/11** | carga de exemplo escrita pelo grupo |
| 7 | A "exigência do MEC" são os indicadores 3.10, 3.11 e 2.3? | coordenadora | 27/11 | vale o padrão: nada é apagado, sem relatório para o MEC |

## Riscos

| Risco | Mitigação |
| --- | --- |
| A IA inventa uma regra (caso Air Canada) | o servidor confere trechos e links; se algo falha, mostra "não encontrei"; tudo fica gravado (door 19, AD-012) |
| O modelo não copia os trechos literalmente e quase tudo vira "não encontrei" | **ainda não medido**. Medir com a OpenAI na Etapa 5, ajustar o prompt e a base |
| A banca roda no RAG sem versão anterior para voltar | ensaio obrigatório com a chave real na Etapa 5; se a IA ou a busca caírem, o aluno ainda vê "não encontrei" e fala com um atendente |
| A base interna vaza para o aluno | AC 40 com teste na API do aluno; fontes só para atendente e administrador |
| Dados de uma instituição aparecem em outra | filtro global (door 16) e teste com duas instituições nas 27 rotas com id |
| O código ficou pronto, mas sem dados reais nem IA real | a Etapa 5 inteira é sobre isso; a carga de exemplo é o plano B |
| O repositório existe só numa máquina | criar o remoto do grupo e enviar `main` |
| Não ter artigos reais da Univag a tempo | pedir em 03/11; plano B: o grupo escreve 10 artigos a partir do Quadro 6 |
| Internet ou API de IA fora do ar na banca | "não encontrei" com transferência continua funcionando; ensaiar sem rede |
| Aluno preso no robô | "Falar com atendente" sempre visível, inclusive antes da primeira mensagem |
| Expectativa inflada de autoatendimento | meta do piloto de 20 a 40% (Gartner), não os 65 a 98% dos fornecedores |
| Crescimento de escopo | a seção `Out of scope` do plano decide; item novo entra lá antes de entrar no código |
