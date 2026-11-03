# One: roadmap

- **Data:** 02/11/2026, fim da noite (RAG, refatoração e vertical slice completa verificados no `main`;
  domínio rico e contratos verificado; interface nova concluída com o C7 de mutação aberto por decisão do usuário)
- **Base:**
  - `.specs/features/mvp-one/plan.md`: o que entra no MVP, slices S1 a S13;
  - `.specs/features/mvp-one/checks.md`: os 195 critérios com prova e as decisões tomadas no build (`## Handoff`);
  - `.specs/features/rag/plan.md` e `checks.md`: o RAG (Etapa 4), 46 checks;
  - `.specs/features/refatoracao-solid/plan.md` e `checks.md`: a refatoração (Etapa 4b), 36 critérios, 39 checks;
  - `.specs/features/vertical-slice-completa/`: um arquivo por caso de uso com `Mediator` (Etapa 4c), 31 checks;
  - `.specs/features/interface-nova/`: shadcn/ui e Tailwind no `web/` (Etapa 4c), 61 critérios, 94 checks;
  - `.specs/features/dominio-e-contratos/`: domínio rico e contratos por caso de uso (Etapa 4c), 28 critérios, 41 checks;
  - `.specs/STATE.md`: decisões AD-001 a AD-026;
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

O código do MVP inteiro (P1, P2 e P3) e o RAG ficaram prontos bem antes das datas. O que falta
para a banca deixou de ser código: a verificação do RAG fechar, dados reais, chave da OpenAI,
hospedagem e ensaio.

| Item | Estado |
| --- | --- |
| MVP (`mvp-one`) | 195 checks provados; verificação independente **aprovada** em 02/11 (rodada 9) |
| RAG (`rag`) | 46 checks provados; verificação independente **aprovada** em 02/11 (rodada 3). As rodadas 1 e 2 reprovaram só por testes faltando, fechados em `a92daae` e `00d439c` |
| Código | 72 commits em `main`; a refatoração vai de `69fd9ab` a `f18ad08`, a vertical slice completa de `9ef0f19` a `45fba58` |
| Testes | API 329 (237 antes da refatoração), web 168 (35 antes da refatoração, 99 antes da interface nova), e2e 45 (11 de antes mais 34 de tela e de arranjo de 360 a 1920 px), e2e de 360 px em 10 telas, e2e de PWA contra o contêiner. A IA nos testes é simulada: nenhum teste chamou a OpenAI de verdade ainda |
| Repositório remoto do grupo | Não criado: `main` existe só nesta máquina |
| Chave da OpenAI no `.env` | Ainda não colocada |
| Refatoração (`refatoracao-solid`) | 39 checks provados; verificação independente **aprovada** em 02/11 (rodada 2). A rodada 1 reprovou só por um teste faltando (aviso de versão atualizada do documento citado), fechado em `f18ad08`. API 268 testes, web 99, e2e 11; CA1502 de 18 métodos para 0; pior CRAP do `web/` de 120,9 para 9,0; 282 mutantes mortos |
| Vertical slice completa (`vertical-slice-completa`) | 31 checks provados; verificação independente **aprovada** em 02/11 (rodada 2). A rodada 1 reprovou só por uma ordem de recusa sem teste (transferir: 409 antes de 400), fechada em `45fba58`. 58 casos de uso, um arquivo cada, com `Mediator` 3.0.2 |
| Interface nova (`interface-nova`) | **Concluída em 02/11** (`2aa8a9a..bd7d7ce`): 15 telas em shadcn/ui e Tailwind, Bootstrap removido, cabeçalho com nomes sempre visíveis e menu "Mais". Verificação: rodada 1 reprovou por sobreposição no cabeçalho e lacunas de teste, rodada 2 pela contagem de links da barra, rodada 3 só pelo C7 (mutação suspensa, AD-025). Decisão do usuário (AD-026): fechar com o C7 aberto. Vitest 168, e2e 45 |
| Domínio rico e contratos (`dominio-e-contratos`) | 41 checks provados; verificação independente **aprovada** em 02/11 (rodada 2). A rodada 1 reprovou só pelo C27 (`Agendador.cs` mudou só nos comentários removidos a pedido do usuário), aceito pelo usuário. 28 falhas injetadas, todas pegas; API 329, nenhuma migração |
| Perguntas que bloqueiam o uso real | 6 abertas (ver "Decisões e bloqueios") |

### O que já funciona

- **Instituições (S1):** várias instituições no mesmo banco, com filtro por instituição em toda
  tabela; comandos `instituicao criar` e `instituicao carga`.
- **Acesso (S2):** login por CPF dentro da instituição, primeiro acesso por e-mail, troca de senha
  e limite de tentativas.
- **Assistente (S3 e RAG):** conversa com o `gpt-6-luna` da OpenAI. A cada mensagem, as 3
  últimas falas do aluno viram um embedding (`text-embedding-3-small`) e o `pgvector` traz os 5
  trechos mais próximos, só de artigos ativos e válidos e de documentos ativos da instituição. O
  servidor confere cada trecho e cada link contra o trecho buscado; se algo não confere, ou se a
  busca cair, o aluno vê "não encontrei". Números longos e e-mails são retirados antes do envio, e
  nada de artigo ou documento chega ao aluno.
- **Documentos (RAG):** tela Documentos para enviar PDFs com texto (até 20 MB), subir nova versão e
  arquivar. O texto vira trechos de até 1500 caracteres, e o agendador gera os embeddings em
  segundo plano, com até 5 tentativas. Artigos e documentos mostram "Indexando", "Indexado" ou
  "Falhou". No chamado, a equipe vê a fonte citada (artigo ou documento, com link para o PDF da
  versão citada).
- **Medição da busca (RAG):** comando `instituicao avaliar-busca --slug --arquivo` com perguntas e
  a fonte esperada; mostra acerto e posição, ou o que veio no lugar, e o total. Não chama o chat
  nem grava nada.
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
 Etapa 0      Etapa 1–3                 Etapa 4          Etapa 4b        Etapa 4c                       Etapa 5                   Banca    Piloto
 Preparar  →  Código (feito 01–02/11)  → RAG com OpenAI → Refatoração → Arquitetura, interface,   →  Dados, IA real e ensaio → 20/11 →  Univag
 01–03/11                                código 02/11     até 03/11      arquivos e tempo real         09–19/11 (ensaio 17–19/11)
                                                                         03–16/11 (congelado a partir de 17/11)
                       ▲ 13/11 AVA: a versão do `main` verde nesse dia
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
- [x] Verificação independente aprovada em 02/11/2026, na rodada 9 (`verification.md`). As rodadas
      1 a 8 reprovaram por testes faltando e um teste que mascarava três regras do link de senha;
      a única mudança de código foi recusar curso repetido na carga.

### Etapa 4: RAG com OpenAI (previsto 03–09/11; código feito em 02/11), no `main`

Decisões do grupo em 02/11/2026: o RAG entra **antes** da banca, direto no `main`, e a banca de
20/11 roda com ele, sem uma versão anterior pronta para voltar (AD-014). Plano e checks aprovados
em `.specs/features/rag/` (46 checks):
- troca do DeepSeek pela OpenAI (`gpt-6-luna` no chat, `text-embedding-3-small` nos embeddings);
- busca por significado com `pgvector` no próprio PostgreSQL (imagem
  `pgvector/pgvector:0.8.7-pg18-trixie`, door R8: a variante `bookworm` dava desencontro de
  collation com o banco existente);
- documentos da instituição em PDF como fonte, além dos artigos;
- comando `instituicao avaliar-busca` para medir a busca com perguntas reais;
- sem framework de agentes (MAF) nem `Microsoft.Extensions.AI`: as chamadas continuam pelo
  `HttpClient` próprio (door R7 do plano).

- [x] S1 e S2: troca para a OpenAI, indexação pelo agendador e busca (`9c0a7a3`, `564a5f3`).
- [x] S3: documentos em PDF, tela Documentos, indexação na tela Artigos e fonte de documento no
      chamado (`cf83134`).
- [x] S4: comando `instituicao avaliar-busca` (`c29942e`).
- [x] Verificação independente aprovada em 02/11, na rodada 3. Rodada 1 reprovou com 2 checks
      fracos e 7 falhas injetadas que nenhum teste pegava; rodada 2 com 3 mutantes sobreviventes (URL
      de `/embeddings`, título de 200 aceito, JSON `null` no `avaliar-busca`). Todas lacunas de
      teste, nenhum erro de código; fechadas em `a92daae` e `00d439c`.
- [ ] Chamada real com a chave para responder a pergunta aberta 1 do plano (o `gpt-6-luna` aceita
      `temperature: 0`?).

**Saída:** RAG no `main` com os checks verdes e a verificação aprovada. Com o código adiantado,
a semana de 03–09/11 fica para a chave real, a pergunta aberta 1 e a Etapa 5.

### Etapa 4b: refatoração SOLID e clean code, em fatias verticais (obrigatória antes da banca)

Decisão do usuário em 02/11/2026: a refatoração entra **inteira antes da banca** (AD-018), e o
código passa para uma arquitetura de **fatias verticais simples** (AD-017). Plano e checks em
`.specs/features/refatoracao-solid/` (skills `tlc-spec-lean` e `ub-mode`, perfil `standard`),
feitos a partir de uma auditoria do código e do `crapper`/`dryer` em 02/11.

Nada muda para o usuário: nenhuma rota, campo JSON, tabela ou chave de configuração. O que justifica
fazer antes da banca:
- **um defeito latente:** os prazos vêm de `Prazos:*`, mas os textos dizem "7 dias" e "3 dias"
  fixos, e o prazo de rejeição é outra constante. Mudar a configuração manda e-mail com o prazo
  errado e tira do aluno o direito de rejeitar antes do fechamento. A rejeição passa a seguir
  `Prazos:ConfirmacaoDias`;
- o código está por camada técnica (`api/Rotas/`, `web/src/telas/`), não por assunto: mexer em
  "documentos" hoje é abrir 5 arquivos em 4 pastas;
- a mesma consulta "última versão do artigo/documento" em 11 lugares, e "artigo ou documento" em 4;
- regras centrais (permissões, 14 indicadores, carga, CSV) só testáveis subindo o PostgreSQL;
- telas com complexidade alta: `ChamadoDetalhe` 64, `Cadastros` 45, `Assistente` 40.

**A arquitetura (door 3 do plano, AD-017):**
- `api/` em 7 fatias por assunto: `Acesso`, `Assistente`, `Chamados`, `Conhecimento`,
  `Indicadores`, `Administracao`, `Instituicoes`. Cada uma guarda as rotas, as regras e os tipos do
  seu assunto. Compartilhado só em `api/Dados/` e nos arquivos da raiz (`Program`, `Problemas`,
  `Sessao`, `Cpf`, `Tokens`, `Email`, `Agendador`, prazos);
- `web/src/` em 6 fatias: `acesso`, `assistente`, `chamados`, `conhecimento`, `indicadores`,
  `administracao`, com o teste de cada tela dentro da fatia;
- uma fatia só usa outra pelos pares de uma lista fechada no `ArquiteturaTests`;
- **sem** handler por caso de uso nem MediatR (seriam ~60 arquivos e uma interface sem segundo
  uso), e **sem** camadas de serviços/repositórios, controllers ou mapeadores de DTO.

**Medição (`ub-mode`):** o `dotnet build` passa a barrar método com complexidade ciclomática acima
de 10 (CA1502, AD-018); no `web/`, `crapper` abaixo de CRAP 10, `dryer` sem duplicação a partir de
0.8 e `mutator` sem sobreviventes (o `mutator` está suspenso desde 02/11, AD-025). As ferramentas do `ub-mode` não leem C#; no `api/` a mutação é a
injeção de falhas do Verifier.

- [x] Aprovar o `plan.md` (02/11: recomendações aceitas; fatias verticais; tudo antes da banca).
- [x] Escrever `checks.md`: 39 checks em 5 slices, validados pelo `validate_checks.py`.
- [x] Mecanismo do build: handoff em 2 lotes, `api/` (S1 a S4) e depois `web/` (S5), porque a
      estimativa (180k) passa do budget de 150k.
- [x] Verificação do `rag` aprovada (rodada 3, 02/11).
- [x] S1: rede de segurança e medição (nenhuma asserção existente pode sumir; CA1502; cobertura
      do `web/`).
- [x] S2: uma decisão em um lugar (prazos, literais gravados, consultas repetidas, glossário).
- [x] S3: regras de negócio puras, com teste sem banco.
- [x] S4: `api/` em fatias verticais; `ChamadoRotas`, `AdminRotas` e `Assistente` com uma
      responsabilidade cada.
- [x] S5: `web/` em fatias verticais; telas abaixo de CRAP 10.
- [x] Verificação independente aprovada em 02/11, na rodada 2 (`verification.md`). A rodada 1 reprovou
      com 1 falha injetada que nenhum teste pegava (o aviso de versão atualizada para documento citado);
      fechada em `f18ad08`. Texto impreciso em C17, C21, C32 e C35, com as afirmações provadas.

**Saída (meta 08/11, limite 12/11):** S1 a S5 no `main` com a suíte inteira verde, nenhuma
asserção existente removida, e a verificação aprovada.
**Congelamento de código de 17/11 a 20/11** (era 13/11; mudou em 02/11 porque a Etapa 4c entrou
antes da banca): só correção de bug, para o ensaio da Etapa 5 rodar sobre o código que vai à banca. Se o limite de 12/11 estiver em risco, o grupo decide
antes o que corta; a decisão de 02/11 é que a refatoração entra antes da banca.

### Etapa 4c: arquitetura completa, interface nova, arquivos e tempo real (antes da banca, 03–16/11)

Decisão do usuário em 02/11/2026: **todos os assuntos discutidos em 02/11 entram antes da banca**
(AD-019 a AD-024). Cada item é uma feature própria do `tlc-spec-lean` (plano e checks aprovados
antes do código, verificação independente depois), e a próxima só começa com a anterior verde. No
`api/` uma feature por vez; a interface nova, que só mexe no `web/`, corre em paralelo.

| Quando | Feature | Onde |
| --- | --- | --- |
| 02/11 | vertical slice completa com `Mediator`: **feita e verificada** (rodada 2, `verification.md`); API 292 testes, 58 casos de uso | `api/` |
| 02/11 | domínio rico e contratos por caso de uso (AD-024): **feito e verificado** (rodada 2) | `api/` |
| 05–06/11 | arquivos no MinIO | `api/`, `docker-compose.yml` |
| 06–07/11 | tempo real com SignalR | `api/`, `web/` |
| 07–08/11 | Web Push | `api/`, `web/` (service worker) |
| 02/11 | interface nova (shadcn/ui e Tailwind): **concluída**, as 15 telas migradas e o Bootstrap removido; C7 (mutação) aberto por decisão do usuário (AD-026) | `web/` |
| 13/11 | 1ª versão no AVA: o que estiver verde no `main` nesse dia | |
| 16/11 | limite: o que não estiver verificado sai da banca e volta para depois | |

O tema sobre o Bootstrap (`tema.css`) que estava previsto aqui foi descartado: com a interface nova
antes da banca, ele seria jogado fora. Logo e cores do One: o grupo fornece ou aprova a proposta
antes de 04/11.

**Vertical slice completa com `Mediator` (AD-019)**

- hoje são ~50 rotas em 12 arquivos (`Chamados/AcoesChamado.cs` tem 9); cada rota vira um arquivo com request, handler e validação, dentro das 7 fatias que já existem.
- mediator: **`Mediator` (martinothamar), decidido em 02/11**, no lugar do MediatR, que ficou comercial em 2025. É MIT, gerado em compilação, com pipeline behaviors, 10,7 mi de downloads e versão de 03/2026. A 3.0.2 roda no .NET 10: testado em 02/11 com request, handler e pipeline behavior. Um request sem handler dá o aviso `MSG0005` no build, e `MSG0005` entra no `WarningsAsErrors`. Descartado: `Balta.Mediator` (André Baltieri, MIT), que hoje tem 1 commit, ~500 downloads, alvo .NET 8, resolve o handler por reflexão e só oferece `SendAsync`.
- o pipeline `Agir` (permissões dos chamados) vira um pipeline behavior, para continuar em um lugar só.
- planejar com `tlc-spec-lean` (feature `vertical-slice-completa`, plano e checks antes do código), mantendo as regras do `ArquiteturaTests` e o CA1502.

**Domínio rico e contratos por caso de uso (AD-024)**

Plano e checks aprovados em 02/11. Build em 3 lotes, cada um só com o anterior verde:
- [x] Lote 1 (S1): rede de segurança gravada contra o código de antes: JSON de sucesso de 59 chamadas
      (`sucessos.txt`), importação, o que cada ação grava (`gravacoes.txt`: colunas, mensagens, eventos)
      e a ordem de recusa de cada handler reescrito. API 303, e2e 23; `api/` sem mudança.
- [x] Lote 2 (S5, S3, S4): uma entidade por arquivo em pastas por agregado, regra de dependência no
      `ArquiteturaTests`, `Chamado` rico (12 transições e `Abrir`), `Artigo` e `Documento` ricos. API 323,
      e2e 27, nenhuma migração (o `OneDb` percorre as entidades por nome para manter os nomes das FKs).
- [x] Lote 3 (S2): respostas nomeadas e 29 `Entrada`, um por caso de uso; as compartilhadas por 3 ou mais
      casos em `Shared/`. API 329, retratos de JSON idênticos. Decisão do usuário em 02/11: aceita a troca
      do nome do tipo citado numa asserção antiga (`Chamados.DetalheChamado` → `Chamados.Shared.DetalheChamado`).
- [x] Verificação independente aprovada em 02/11 (rodada 2).

Decisão do usuário em 02/11/2026: a vertical slice não basta se as entidades ficam todas num
arquivo, sem regra, e as respostas são objetos anônimos. Entra logo depois da verificação da vertical
slice e antes do MinIO, para que MinIO e SignalR já nasçam no formato novo. Princípios, das fontes
abaixo:

- **cada caso de uso é dono do seu request e da sua resposta**: um `record` de entrada e um de saída
  nomeados no arquivo do caso de uso, sem objetos anônimos nem DTO compartilhado entre fatias (um DTO
  compartilhado acumula campos que ficam vazios metade do tempo). O retrato das respostas que a
  vertical slice já grava prova que o JSON não muda;
- **as fatias compartilham o modelo de domínio**, e a regra de negócio desce para ele: as transições de
  estado do `Chamado` (assumir, responder, resolver, rejeitar, cancelar, encaminhar…) e as de
  `Artigo`/`Documento` viram métodos da entidade, com setters privados; o handler só faz o trabalho
  "sujo" (ler e gravar, chamar e-mail e IA). Hoje essas regras estão em helpers estáticos
  (`AcoesChamado.Mudar`, `Atribuir`);
- **uma entidade por arquivo**, agrupadas por agregado em `api/Dados/` (hoje são 24 classes em
  `Entidades.cs`, 366 linhas);
- **regra de dependência da arquitetura limpa dentro do projeto**: o domínio não referencia ASP.NET
  Core, Mediator nem os handlers, e isso vira regra do `ArquiteturaTests`;
- **teste de unidade no domínio, de integração nos handlers e na API**;
- **compartilhar só depois do terceiro uso**; nada de pasta `Common`/`Utils`; o que duas fatias da
  mesma família usam fica numa pasta `Shared` da fatia;
- **sem** projetos separados Domain/Application/Infrastructure nem repositórios sobre o EF Core: o EF
  já é a unidade de trabalho, e as camadas desfariam a coesão por fatia (opção rejeitada pelo usuário
  em 02/11).

Fontes: [Jimmy Bogard, Vertical Slice Architecture](https://jimmybogard.com/vertical-slice-architecture/);
[Bogard, slides do dotNET 2022](https://cdn.plainconcepts.com/wp-content/uploads/2022/08/dotNET-2022-Vertical-Slice-Architecture.pdf)
("push behavior down", "encapsulating data", "unit test domain");
[Milan Jovanović, onde mora a lógica compartilhada](https://milanjovanovic.tech/blog/vertical-slice-architecture-where-does-the-shared-logic-live);
[Jovanović, vertical slice vs clean architecture](https://milanjovanovic.tech/blog/vertical-slice-vs-clean-architecture).

**Arquivos no MinIO (AD-021)**

- **arquivos em armazenamento de objetos (MinIO/S3)**: hoje os anexos (até 10 MB) e os PDFs da instituição (até 20 MB) ficam no PostgreSQL em `bytea` (door 13), lidos inteiros na memória no download (`shortcut:` em `api/Dados/Entidades.cs`). Foi escolhido no lugar do disco local, que some em hospedagem efêmera e fica fora do backup. Assim há um só backup, e o filtro por instituição e o append-only valem para os arquivos. Na troca: o banco guarda só a chave, o hash e o tamanho; o download passa a ser por streaming ou URL pré-assinada; o caminho é prefixado pela instituição; o bucket tem versionamento ou object lock para manter o append-only. Decisão revista em 02/11: troca antes da banca.

**Tempo real com SignalR (AD-022)**

- **tempo real (SignalR)**: hoje a tela do chamado aberta pergunta à API a cada 15 s (door 18), e o SignalR foi rejeitado no plano. Motivos: o atendente responde em minutos ou horas; a resposta da IA não pode chegar aos poucos, porque o servidor confere os trechos antes de mostrar (AD-012); com mais de um servidor, o SignalR pede sessão fixa e backplane (Redis ou Azure SignalR Service); e a conexão cai com a PWA em segundo plano. Decisão revista em 02/11: entra antes da banca, com os limites abaixo.
- Antes da banca, o SignalR substitui o polling de 15 s (door 18 do `mvp-one`) para avisar a tela
  do chamado e a fila do atendente que algo mudou. **A resposta da IA continua indo inteira, só
  depois da conferência dos trechos** (AD-012): nada de texto chegando aos poucos.
- Uma só instância da API na banca, então sem backplane; o Redis entra quando houver mais de uma.

**Web Push (AD-022)**

- **aviso com o app fechado**: Web Push pelo service worker que a Vite PWA já registra, não SignalR. Hoje esse papel é do e-mail (`email_saida`).

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
| Escala | aguentar o volume de mais alunos | <ul><li>consultas N+1 em `AdminRotas` e `DocumentoRotas`;</li><li>indicadores agregados em SQL (`shortcut:` em `IndicadorRotas.cs`)</li></ul> |
| Qualidade da IA | aprender com o que falhou | <ul><li>relatório de perguntas sem base;</li><li>revisão das respostas da IA pelo administrador;</li><li>botão "reportar resposta errada";</li><li>atendente sugere artigo a partir da resolução</li></ul> |
| Segunda instituição | provar o produto multi-instituição | <ul><li>tela do operador;</li><li>provedor de IA, prazos e marca por instituição;</li><li>subdomínio próprio</li></ul> |
| Integrações | tirar o CSV do caminho | <ul><li>API dos ERPs acadêmicos;</li><li>Moodle com botão "Preciso de ajuda";</li><li>WhatsApp como primeiro canal extra</li></ul> |
| Produto comercial | vender | <ul><li>cobrança por resolução ou por aluno ativo;</li><li>LGPD completa;</li><li>observabilidade;</li><li>busca no INPI pelo nome "One"</li></ul> |

### Interface nova (Etapa 4c, antes da banca)

- [x] Lote 1 (S0 a S2, C1 a C38): portões, fundação (Tailwind v4, shadcn/ui, TanStack Query) e o chat do
      Assistente. Vitest 118, e2e 23, 300 mutantes mortos. Achado: as classes utilitárias do Bootstrap
      usam `!important` e vencem as do Tailwind com o mesmo nome; um bloco provisório em `index.css`
      corrige até a S9 apagar o Bootstrap.
- [x] Lote 2 (S3 a S5, C39 a C59): detalhe do chamado, Indicadores (Recharts carregado sob demanda,
      TanStack Table 8.21.3, DayPicker 10.0.2 em português) e listas. Vitest 131, e2e 27, pior CRAP 9,0,
      dryer limpo. A mutação desse lote foi interrompida em 02/11 (AD-025); os checks de mutação ficam abertos.
- [x] Lote 3 (S6 a S9, C60 a C94): acesso, conhecimento (Tiptap só texto, área de arrastar arquivo),
      administração e a saída do Bootstrap. Sem mutação (AD-025); construtor no Sonnet. Decisão do usuário
      em 02/11: a tela do chamado troca o `setInterval` pelo `refetchInterval` do TanStack Query, e o teste
      "atualiza chamado a cada 15 s" passa a avançar o relógio com `await` (nenhum `expect` muda).
- [x] Verificação independente (perfil `ui`), 3 rodadas: todos os checks provados menos o C7 (mutação),
      suspenso pela AD-025. Decisão do usuário em 02/11 (AD-026): a interface fecha com o C7 aberto, que roda
      quando a mutação for liberada. O cabeçalho mostra os nomes sempre, com 3, 5 e 7 links a partir de 1024,
      1280 e 1536 px e o resto no menu "Mais"; abaixo de 1024 px, a gaveta.

Decisão do usuário em 02/11/2026 (AD-020): o `web/` troca o Bootstrap por esta stack antes da banca, tela a tela,
dentro das 6 fatias do AD-017. Planejar com `tlc-spec-lean` perfil `ui`, e a migração não pode
mudar nenhum teste de comportamento.

| Categoria | Biblioteca | Onde entra no One | Observação |
| --- | --- | --- | --- |
| Componentes UI | [shadcn/ui](https://ui.shadcn.com) | todas as telas | substitui o `react-bootstrap` |
| Estilização | [Tailwind CSS](https://tailwindcss.com) | todas as telas | substitui o CSS do Bootstrap |
| Ícones | [Lucide React](https://lucide.dev) | todas as telas | substitui o `bootstrap-icons` |
| Componentes acessíveis | [Radix UI](https://www.radix-ui.com) | base do shadcn/ui | vem junto, não é escolha à parte |
| Animações | [Motion](https://motion.dev) | chat e transições | só onde ajuda a entender o estado |
| Navegação mobile | [Vaul](https://vaul.emilkowal.ski) (drawer) | menu e ações em 360 px | |
| Gráficos | [Recharts](https://recharts.org) | indicadores | |
| Tabelas responsivas | [TanStack Table](https://tanstack.com/table) | filas de chamados, cadastros, usuários | |
| Formulários | [React Hook Form](https://react-hook-form.com) | login, cadastros, artigos | |
| Validação | [Zod](https://zod.dev) | formulários | a API continua sendo a fonte da validação (Problem Details); o Zod só antecipa o erro na tela |
| Notificações visuais | [Sonner](https://sonner.emilkowal.ski) | resultado das ações | |
| Calendário | [React DayPicker](https://daypicker.dev) | período dos indicadores | só se houver campo de data |
| Editor de texto | [Tiptap](https://tiptap.dev) | edição de artigo | o texto do artigo é a fonte da conferência literal de trechos (AD-012): o editor não pode gravar marcação que mude o texto conferido |
| Upload de arquivos | [React Dropzone](https://react-dropzone.js.org) | anexos e documentos | a API continua conferindo tipo e tamanho |
| Chat | [AI Elements](https://ui.shadcn.com/docs/ai-elements) | Assistente | foi feito para o `useChat` do Vercel AI SDK. No One a resposta passa pela API, que confere os trechos (AD-012), então entram só os componentes visuais, sem AI SDK no navegador |
| Fontes | [Inter](https://fonts.google.com/specimen/Inter) | todas as telas | |
| Temas claro/escuro | [next-themes](https://github.com/pacocoursey/next-themes) | todas as telas | é pensado para Next.js; no Vite o shadcn/ui documenta um `ThemeProvider` próprio, que é o que entra |
| PWA / Service Worker | [Vite PWA](https://vite-pwa-org.netlify.app) | app instalável | já em uso |
| Cache e sincronização | [TanStack Query](https://tanstack.com/query) | chamadas à API | substitui o `useAcao` e as buscas manuais |
| Armazenamento offline | [Dexie.js](https://dexie.org) | a decidir no plano | guardar conversas e chamados no aparelho é questão de LGPD, e o assistente precisa de rede; só dado não sensível |
| Listas virtualizadas | [TanStack Virtual](https://tanstack.com/virtual) | listas longas | só se uma lista real passar de algumas centenas de itens |

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

## Código sem comentários no `api/` (02/11)

Pedido do usuário em 02/11/2026: os comentários do código do `api/` foram removidos (`0960b70`, 65 arquivos,
202 linhas), com uma ferramenta sobre o Roslyn que só tira o que o compilador chama de comentário (os `//`
dentro de textos, como URLs, ficam). Ficaram de fora as migrações geradas pelo EF, cujo cabeçalho
`// <auto-generated />` mantém o limite de complexidade longe delas, e o `api.Tests/`, cujas linhas os scripts
de asserções preservadas comparam. Build com CA1502, barreira do Mediator e API 329/329 verdes. As referências
aos critérios (`// AC 18`) e os dois `shortcut:` saíram do código; os limites conhecidos continuam na linha
"Escala" deste roadmap e a ligação com os critérios fica nos `plan.md`/`checks.md` e no git.

## Custo do build com subagentes

Em 02/11 os subagentes desta etapa (planos, checks, construtores e Verifiers) somaram cerca de 4 milhões
de tokens: um construtor gasta de 340 a 410 mil, um Verifier de 90 a 270 mil. Decisão do usuário em
02/11: daqui em diante os construtores rodam no Sonnet, com briefing curto e saída de testes filtrada; o
Verifier continua no modelo mais forte, porque é ele que tenta provar que os testes podem falhar.

**Mutação suspensa (AD-025, 02/11):** por decisão do usuário, o `mutator` não roda mais até segunda
ordem; cada rodada levava de 20 a 40 minutos por lote. Os checks de mutação já escritos ficam abertos e
aparecem como "suspensos por decisão do usuário", não como aprovados. Continuam valendo crapper, dryer,
as suítes, o e2e e as falhas injetadas à mão pelo Verifier.

## Riscos

| Risco | Mitigação |
| --- | --- |
| A IA inventa uma regra (caso Air Canada) | o servidor confere trechos e links; se algo falha, mostra "não encontrei"; tudo fica gravado (door 19, AD-012) |
| O modelo não copia os trechos literalmente e quase tudo vira "não encontrei" | **ainda não medido**. Medir com a OpenAI na Etapa 5, ajustar o prompt e a base |
| A busca não traz a fonte certa e o aluno recebe "não encontrei" com a resposta existindo | rodar o `avaliar-busca` com perguntas reais antes do piloto (pergunta aberta 4 do plano `rag`) |
| A banca roda no RAG sem versão anterior para voltar | ensaio obrigatório com a chave real na Etapa 5; se a IA ou a busca caírem, o aluno ainda vê "não encontrei" e fala com um atendente |
| A base interna vaza para o aluno | AC 40 com teste na API do aluno; fontes só para atendente e administrador |
| Dados de uma instituição aparecem em outra | filtro global (door 16) e teste com duas instituições nas 27 rotas com id |
| O código ficou pronto, mas sem dados reais nem IA real | a Etapa 5 inteira é sobre isso; a carga de exemplo é o plano B |
| O repositório existe só numa máquina | criar o remoto do grupo e enviar `main` |
| Não ter artigos reais da Univag a tempo | pedir em 03/11; plano B: o grupo escreve 10 artigos a partir do Quadro 6 |
| Internet ou API de IA fora do ar na banca | "não encontrei" com transferência continua funcionando; ensaiar sem rede |
| Aluno preso no robô | "Falar com atendente" sempre visível, inclusive antes da primeira mensagem |
| Expectativa inflada de autoatendimento | meta do piloto de 20 a 40% (Gartner), não os 65 a 98% dos fornecedores |
| A refatoração quebra algo às vésperas da banca | nenhuma asserção existente pode sumir (C2); verificação com injeção de falhas; congelamento de 17/11 a 20/11 |
| A Etapa 4c (5 features em 14 dias) não cabe ou quebra algo antes da banca | uma feature por vez no `api/`, cada uma verificada antes da próxima; nenhuma asserção existente pode sumir; a versão do AVA em 13/11 é o `main` verde; em 16/11 o que não estiver verificado sai da banca |
| Crescimento de escopo | a seção `Out of scope` do plano decide; item novo entra lá antes de entrar no código |
