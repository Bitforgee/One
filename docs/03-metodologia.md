# Metodologia

Este capítulo descreve como o grupo organiza o trabalho: o controle de versão, a divisão de papéis, o processo, as ferramentas e o cronograma. As regras vêm do README do repositório `Bitforgee/prototipo-v1-one` e do roadmap do projeto (`roadmap.md`).

## Controle de versão

O grupo usa o Git, e os repositórios ficam no GitHub, na conta `Bitforgee`. O projeto tem dois repositórios:

- `Bitforgee/prototipo-v1-one`: documentação de requisitos, pesquisas, roadmap e o protótipo visual navegável.
- `Bitforgee/One`: esta documentação e o código do produto, com o front-end em React e a API REST em ASP.NET Core.

O Manual do PEI IV exige o código-fonte em um repositório público no GitHub.

O fluxo de branches segue o Quadro 3.1.

Quadro 3.1 — Fluxo de branches

| Branch | Uso |
| --- | --- |
| `main` | Versão integrada e estável. Ninguém faz push direto nela. |
| `feat/nome-da-funcionalidade` | Novas funcionalidades. |
| `fix/nome-da-correcao` | Correções. |
| `docs/nome-da-documentacao` | Documentação. |

Fonte: elaborado pelos autores (2026), com base no README do repositório `prototipo-v1-one`.

Cada integrante segue estes passos:

1. Atualiza a `main` local com `git pull`.
2. Cria a sua branch, por exemplo `git checkout -b feat/minha-funcionalidade`.
3. Desenvolve a mudança.
4. Executa os testes.
5. Faz o commit com uma mensagem descritiva. O padrão sugerido é o Conventional Commits, por exemplo `feat: ...`.
6. Envia a branch com `git push -u origin feat/minha-funcionalidade`.
7. Abre um pull request para a `main`.
8. Integra a mudança só depois da revisão de pelo menos um colega.

Boas práticas do grupo:

- Não versionar segredos, como arquivos `.env`, chaves e tokens. O `.gitignore` já ignora esses arquivos.
- Não versionar caches nem binários gerados.
- Preferir `git add` de arquivos específicos a `git add -A`.

Etiquetas de issues e gestão de issues: [a preencher pelo grupo].

## Gerenciamento do projeto

### Divisão de papéis

O grupo tem cinco integrantes. O Quadro 3.2 mostra o papel de cada um.

Quadro 3.2 — Divisão de papéis

| Integrante | Papel |
| --- | --- |
| Alfredo Pinto de Souza Neto | [a preencher pelo grupo] |
| David El Hage de Oliveira | [a preencher pelo grupo] |
| Gustavo Henrique Rondon Melo | [a preencher pelo grupo] |
| Marco Antônio Rodrigues Menezes | [a preencher pelo grupo] |
| João Henrique Queiroz Mitsuyuki | [a preencher pelo grupo] |

Fonte: elaborado pelos autores (2026).

Gerente de projeto (GP): [a preencher pelo grupo].

O orientador do projeto é o Prof. Esp. Walderson Ryutti Shimokawa.

### Processo

O projeto avança em sete fases, descritas no roadmap. O Quadro 3.3 resume cada fase e o seu critério de saída.

Quadro 3.3 — Fases do projeto

| Fase | Nome | Objetivo | Critério de saída |
| --- | --- | --- | --- |
| 1 | Descoberta | Provar que o problema existe, com números, e obter os dados do piloto. | Responder, com evidência: quem é o primeiro usuário, quais as cinco principais demandas, como são resolvidas hoje e qual melhoria mensurável o One deve produzir sobre uma baseline medida. |
| 2 | Validação | Testar o fluxo com usuários reais antes de escrever código, com um protótipo navegável. | Requisitos sem perguntas abertas e marcados como acordados; protótipo testado e ajustado. |
| 3 | MVP | Fazer o fluxo completo funcionar de ponta a ponta (fatia vertical). | Critérios de aceite AC1 a AC9 passando; verificação do repositório passando. |
| 4 | Piloto | Usar o One na Univag, com uma coordenação, um ou dois cursos (ADS), três setores, 10 a 30 artigos, dois a cinco atendentes e um grupo controlado de alunos. | Saber se o aluno preferiu o One, se a coordenação recebeu menos perguntas repetitivas e quais funções não foram usadas ou foram pedidas, com comparação antes e depois. |
| 5 | Validação de produto | Evoluir com base na evidência do piloto, uma melhoria por vez, e incluir mais cursos. | Não definido no roadmap. |
| 6 | Integrações | Integrar com sistemas acadêmicos, Moodle, Portal do Aluno e ERP. | Não definido no roadmap. |
| 7 | Produto comercial | Atender várias instituições. | Não definido no roadmap. |

Fonte: elaborado pelos autores (2026), com base no roadmap do projeto.

A regra do roadmap é simples: cada fase só começa quando o critério de saída da anterior foi cumprido. O calendário do PEI IV tem prazos fixos e desconta 0,5 ponto por atraso. Por isso, se um prazo chega antes de uma pergunta aberta ser respondida, o grupo segue o valor padrão proposto nos requisitos e registra essa escolha.

No roadmap, atualizado em 02/10/2026, a fase atual é a Fase 1 — Descoberta, em andamento. Pelo calendário do PEI IV, as entregas de 06/10 a 23/10 pertencem à Fase 2. A demonstração de 27/10 exige código antes de a Fase 2 terminar, então a Fase 3 começa em paralelo, por volta de 14/10.

Fase atual em 16/10/2026: [a preencher pelo grupo].

A especificação vem antes da implementação. Na Fase 3, a ordem prevista é:

1. Escrever o desenho técnico (`design.md`), com a stack exigida pelo PEI IV e o modelo de dados.
2. Preencher a verificação do repositório com build e testes reais.
3. Dividir o trabalho em tarefas pequenas e verificáveis (`tasks.md`).
4. Implementar os módulos na ordem da fatia vertical.

No repositório `Bitforgee/One`, as especificações e as decisões técnicas ficam na pasta `.specs/`.

O acompanhamento segue as exigências do PEI IV: um relatório semanal no AVA, no modelo do Apêndice G, e ao menos um integrante em cada aula. As atas de reunião ficam em `docs/acompanhamento/atas/`.

Quadro de tarefas e frequência das reuniões do grupo: [a preencher pelo grupo].

### Ferramentas

O Quadro 3.4 lista as ferramentas usadas no projeto.

Quadro 3.4 — Ferramentas

| Ferramenta | Uso no projeto |
| --- | --- |
| GitHub | Hospedagem dos repositórios, pull requests e revisão de código. |
| GitHub Actions e GitHub Pages | O workflow `deploy-pages.yml` publica a pasta `prototipo-visual/` no GitHub Pages a cada push na `main` que altere o protótipo. |
| Kiro IDE e VS Code | O projeto é desenvolvido no Kiro IDE, com recursos ECC. O VS Code é a alternativa compatível. |
| draw.io, Mermaid e PlantUML | Diagramas. O arquivo-fonte fica ao lado da imagem exportada. |
| AVA | Entregas do PEI IV e relatórios semanais. |
| Node.js e Google Chrome | Servidor estático e suítes de teste do protótipo. Os testes usam só a biblioteca padrão do Node e o Chrome instalado, sem dependências externas. |
| SDK do .NET 10 | Execução e testes da API em ASP.NET Core. |
| Comunicação do grupo | [a preencher pelo grupo] |

Fonte: elaborado pelos autores (2026), com base nos READMEs dos repositórios `prototipo-v1-one` e `One`.

## Cronograma

O cronograma segue o calendário do PEI IV, do Apêndice F do Manual do PEI. Os prazos de agosto e setembro (grupos, pitch, pesquisa de mercado e PM Canvas) já passaram. O Quadro 3.5 mostra as próximas entregas e a fase do One ligada a cada uma.

Quadro 3.5 — Cronograma do PEI IV

| Data (2026) | Entrega do PEI | Fase do One |
| --- | --- | --- |
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
| 09–11/12 | Feira de Projetos | — |

Fonte: elaborado pelos autores (2026), com base no Manual do PEI IV (Apêndice F) e no roadmap do projeto.

O manual imprime "Junho/2026" para a Feira de Projetos, mas o roadmap registra que o feriado de 8/12 indica dezembro.
