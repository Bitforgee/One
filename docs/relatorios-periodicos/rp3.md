# Relatório periódico 3 (RP3) — Univag One (BitForge)

Projeto Extensionista Integrador IV — Desenvolvimento de PWAs com Frameworks Avançados. Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas, UNIVAG. Entrega de 16/10/2026.

## Resumo para o campo de mensagem do AVA

> Grupo BitForge, projeto Univag One: central de atendimento acadêmico em que o aluno pergunta, o assistente responde a partir da base de conhecimento e, se não resolver, a conversa vira um chamado rastreável que chega ao setor certo.
>
> Desde a última entrega, publicamos o protótipo navegável no GitHub Pages (13/10), criamos o repositório oficial do produto com a base do back-end em ASP.NET Core e reorganizamos toda a documentação no padrão do template da PUC Minas, aplicando as correções das aulas: glossário no início, requisitos funcionais começando pelo problema do aluno, autenticação e permissões como requisitos não funcionais, casos de uso sem "Autenticar-se" e sem "Gerenciar", pré-condições como estado dos dados e fluxos de exceção separados.
>
> Documentação, diagramas e código: https://github.com/Bitforgee/One (comece por docs/README.md). Protótipo: https://bitforgee.github.io/prototipo-v1-one/. Os problemas, as necessidades e os links completos estão em docs/relatorios-periodicos/rp3.md.

## Integrantes

| Integrante | Papel |
| --- | --- |
| Alfredo Pinto de Souza Neto | [a preencher pelo grupo] |
| David El Hage de Oliveira | [a preencher pelo grupo] |
| Gustavo Henrique Rondon Melo | [a preencher pelo grupo] |
| Marco Antônio Rodrigues Menezes | [a preencher pelo grupo] |
| João Henrique Queiroz Mitsuyuki | [a preencher pelo grupo] |

## O que foi feito desde a última entrega

- **Protótipo publicado (13/10/2026).** O protótipo visual de alta fidelidade foi publicado no GitHub Pages, com publicação automática por GitHub Actions. Ele funciona no celular e no computador, com três perfis demonstrativos (Aluno, Atendente e Administrador) e dados simulados no navegador. Também corrigimos a navegação e a barra lateral recolhida.
- **Repositório oficial do produto (16/10/2026).** Criamos o repositório `Bitforgee/One` com três pastas: `docs/` (documentação), `frontend/` e `backend/`. O back-end tem a base da API em ASP.NET Core (.NET 10), com `GET /health` e 4 testes de integração passando. O front-end em React com Vite e vite-plugin-pwa aguarda a escolha entre TypeScript e JavaScript.
- **Documentação no padrão PUC (16/10/2026).** A documentação de requisitos, os diagramas, as pesquisas e o registro da entrevista com a coordenação foram trazidos do repositório do protótipo para `docs/`, nos capítulos 00 a 13 do template da PUC Minas.
- **Correções pedidas nas aulas.** Aplicamos:
  - glossário no início, em ordem alfabética;
  - capítulo de contexto na ordem propósito, cliente, problema, objetivos, escopo, fora do escopo, premissas e riscos;
  - lista de requisitos funcionais começando pela conversa do aluno, com prioridade (MoSCoW) e status;
  - autenticação (ASP.NET Core Identity, senha com hash), regras de conta e visibilidade por perfil como requisitos não funcionais de segurança, com uma tabela de correspondência entre os IDs antigos e os novos;
  - requisito de compatibilidade com valores mensuráveis;
  - diagrama de casos de uso refeito em PlantUML, sem setas entre ator e caso de uso, sem "Autenticar-se", com os "Gerenciar" divididos em uma operação cada (22 casos de uso) e legenda de status;
  - 22 especificações de casos de uso com objetivo, ator principal, pré-condição como estado dos dados, fluxos alternativos e de exceção separados e pós-condição no fim;
  - novo diagrama de arquitetura (front-end PWA, API REST, PostgreSQL, provedor de IA e serviço de e-mail);
  - legendas "Figura N —" e "Quadro N —" com a fonte abaixo.
- **Feedback do cliente consolidado.** Os achados das duas sessões com a coordenadora dos cursos de tecnologia (setembro e 01/10/2026) estão em `docs/acompanhamento/feedback-cliente.md`, com o que mudou no projeto por causa deles.

## Problemas e dificuldades

- **Questões em aberto com a coordenação.** As premissas Q5 a Q19 ainda não foram confirmadas, entre elas o tipo de *login*, os prazos de inatividade e de confirmação, o uso de IA externa e a exigência de retenção do MEC. Também faltam a unidade das horas de atendimento (por dia ou por semana), o período dos 83 e-mails e o volume de cada tipo de demanda.
- **Validação do protótipo com a coordenação.** [a preencher pelo grupo: se o protótipo já foi apresentado à coordenação e o que ela disse]
- **Back-end só com a base.** A demonstração de funcionalidades de 27/10 exige a primeira fatia vertical (conversa → chamado) implementada de ponta a ponta.
- **Tecnologia do back-end.** O manual cita PHP, Java ou Node.js "entre outras". Escolhemos ASP.NET Core e ainda precisamos da confirmação do professor.
- **Linguagem do front-end.** A escolha entre TypeScript e JavaScript ainda não foi feita.

## Necessidades para prosseguir

- Respostas da coordenação às questões em aberto (lista em `docs/acompanhamento/feedback-cliente.md`), enviadas por e-mail.
- Uma sessão presencial com a coordenação para validar o protótipo e o diagrama de casos de uso.
- Confirmação do professor sobre o uso de ASP.NET Core no back-end.
- Definição da linguagem do front-end, para começar a implementação.
- Definição de onde hospedar a API e o banco de dados.

## Links

| Item | Link |
| --- | --- |
| Repositório do produto (documentação e código) | https://github.com/Bitforgee/One |
| Índice da documentação | https://github.com/Bitforgee/One/blob/main/docs/README.md |
| Repositório do protótipo | https://github.com/Bitforgee/prototipo-v1-one |
| Protótipo online | https://bitforgee.github.io/prototipo-v1-one/ |
| Documento de requisitos em ABNT (versão de 02/10/2026) | https://github.com/Bitforgee/prototipo-v1-one/blob/main/docs/requisitos/One_Levantamento_e_Requisitos.pdf |
| Vídeo de demonstração do protótipo | [a preencher pelo grupo] |

## Pendências do grupo

- Gravar o vídeo do protótipo funcionando e colocar o link acima.
- Anexo 1 (termo de compromisso) assinado com a coordenação, Anexo 2 (diário de bordo) e, no fim do semestre, Anexo 4 (avaliação do cliente).
- Fotos e atas das reuniões com a coordenação e do grupo, nas pastas `docs/acompanhamento/atas/` e `docs/apresentacoes/`.
- Papéis de cada integrante (tabela acima e `docs/03-metodologia.md`).
- Os demais trechos marcados com `[a preencher pelo grupo]` na documentação.
