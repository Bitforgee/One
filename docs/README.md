# Documentação do Univag One (BitForge)

Documentação do Projeto Extensionista Integrador IV, organizada como o template de projeto da PUC Minas (`ICEI-PUC-Minas-PMV-ADS/IntApplicationProject-Template`), com as correções pedidas pelo professor nas aulas. Os arquivos estão em Markdown; o documento final nas normas da ABNT será montado a partir deles, na estrutura do Apêndice D.5 do manual do PEI (tabela no fim desta página). O código-fonte fica em [`src/`](../src/README.md) e as apresentações em [`presentation/`](../presentation/README.md).

**Entrega atual:** [Relatório periódico 3 (RP3)](relatorios-periodicos/rp3.md).

## Capítulos

1. [Glossário](00-glossario.md)
2. [Documentação de contexto](01-documentacao-de-contexto.md)
3. [Especificação do projeto](02-especificacao-do-projeto.md): requisitos, regras de negócio, diagrama e especificações de casos de uso
4. [Metodologia](03-metodologia.md)
5. [Projeto de interface](04-projeto-de-interface.md): fluxo principal e telas do protótipo
6. [Arquitetura da solução](05-arquitetura-da-solucao.md): arquitetura, diagrama de classes, modelos conceitual e lógico
7. [Template padrão da aplicação](06-template-padrao-da-aplicacao.md)
8. [Programação de funcionalidades](07-programacao-de-funcionalidades.md): o que está implementado e como acessar
9. [Plano de testes de software](08-plano-de-testes-de-software.md)
10. [Registro de testes de software](09-registro-de-testes-de-software.md)
11. [Plano de testes de usabilidade](10-plano-de-testes-de-usabilidade.md)
12. [Registro de testes de usabilidade](11-registro-de-testes-de-usabilidade.md)
13. [Apresentação do projeto](12-apresentacao-do-projeto.md)
14. [Referências](13-referencias.md)

## Outras pastas

| Pasta | O que guarda |
| --- | --- |
| `figuras/` | Diagramas, com a fonte editável (`.puml`, `.drawio`, `.mmd`) ao lado do PNG, e telas do protótipo em `figuras/telas/` |
| `pesquisas/` | Visão do produto, pesquisa de mercado, refinamento do nome, roteiro da entrevista e *roadmap*, copiados sem alteração do repositório do protótipo |
| `acompanhamento/` | [Feedback do cliente](acompanhamento/feedback-cliente.md), atas (`atas/`, modelo em `modelo-ata.md`) e relatórios semanais (`relatorios-semanais/`); cópias nomeadas `AAAA-MM-DD.md` |
| `relatorios-periodicos/` | Relatórios periódicos enviados pelo AVA |
| `requisitos-abnt-v1/` | [Documento de requisitos em ABNT, versão 1](requisitos-abnt-v1/README.md) (02/10/2026), em `.docx` e `.pdf`, com o gerador; superado por estes capítulos |

Os diagramas PlantUML são gerados com `java -jar plantuml.jar -tpng docs/figuras/<arquivo>.puml`.

## Correspondência com o documento final (Apêndice D.5)

| Elemento do Apêndice D.5 | Onde está |
| --- | --- |
| Capa, folha de rosto, resumo e palavras-chave | Feitos na montagem do documento ABNT; o resumo é escrito por último |
| Sumário | Gerado automaticamente na montagem |
| Introdução: propósito, escopo, premissas | [Documentação de contexto](01-documentacao-de-contexto.md) |
| Introdução: convenções, termos e abreviações | [Glossário](00-glossario.md) |
| Fundamentação teórica: PWAs e frameworks | [a preencher pelo grupo] |
| Visão geral: produto, usuários, soluções similares, suposições | [Documentação de contexto](01-documentacao-de-contexto.md), [Especificação do projeto](02-especificacao-do-projeto.md) (perfis) e [pesquisa de mercado](pesquisas/One_Pesquisa_Mercado_Helpdesks.md) |
| Requisitos funcionais e não funcionais | [Especificação do projeto](02-especificacao-do-projeto.md) |
| Casos de uso: diagrama e especificações | [Especificação do projeto](02-especificacao-do-projeto.md) |
| Diagrama de classes, modelos conceitual e lógico | [Arquitetura da solução](05-arquitetura-da-solucao.md) |
| Funcionalidades desenvolvidas: telas | [Projeto de interface](04-projeto-de-interface.md) e [Programação de funcionalidades](07-programacao-de-funcionalidades.md) |
| Considerações finais | [a preencher pelo grupo] |
| Referências | [Referências](13-referencias.md) |
| Apêndices e anexos | Metodologia, template, testes, apresentação, `acompanhamento/` e `pesquisas/` |
