# Plano de testes de software

Este capítulo apresenta a estratégia de testes do One, os tipos de teste, os casos de teste e a forma de executá-los. Hoje existem testes em duas frentes:

- O **protótipo visual**, em `src/prototipo/`. Ele roda só no navegador, com dados simulados. Os testes verificam as regras de negócio sobre esses dados e a interface.
- O **back-end**, em `src/backend/`. É a API REST em ASP.NET Core (.NET 10), ainda na estrutura inicial. Os testes verificam o comportamento básico da API.

## Estratégia

Os testes são automatizados. As suítes do protótipo não instalam dependências: usam só a biblioteca padrão do Node e o Google Chrome já instalado. Os testes do back-end usam o xUnit e o `WebApplicationFactory` do ASP.NET Core, que sobe a API em memória.

Cada resultado é classificado por nível de evidência, como no relatório de homologação do protótipo:

- **Testado automaticamente**: uma suíte nomeada passou e cobre a regra.
- **Testado manualmente**: interação real no navegador, pelo Chrome DevTools Protocol (CDP), com passos descritos.
- **Verificado por inspeção**: confirmado pela leitura do código, sem execução.
- **Não verificado**: não comprovado, com a justificativa.

## Tipos de teste

O Quadro 8.1 lista os tipos de teste, a ferramenta ou o comando e o que cada um verifica.

Quadro 8.1 — Tipos de teste

| Tipo | Comando | O que verifica |
| --- | --- | --- |
| Unitário e integração (protótipo) | `node tests/run-headless.mjs` | Os módulos `storage`, `dom`, `nav-config`, `state`, `router`, `knowledge-service`, `conversation-service`, `routing-service` e `ticket-service`, e a jornada de integração completa (10 passos) com cenários negativos. A suíte roda no Chrome sem interface (headless). |
| Smoke de navegação (protótipo) | `node tests/smoke-app.mjs` | Se todas as telas abrem e se as regras de acesso por perfil funcionam. |
| Erros de console (protótipo) | `node tests/console-check.mjs` | Se as rotas principais abrem sem erros de JavaScript. |
| Acessibilidade estrutural (protótipo) | `node tests/a11y-check.mjs` | Idioma da página, texto alternativo, rótulos de formulário, nomes de botões, regiões da página e título `h1`. |
| Ponta a ponta por CDP (protótipo) | `node tests/e2e.mjs` | A interface conduzida por cliques reais no Chrome: login, assistente, Sim/Não, criação de chamado, atendimento, resolução, confirmação, histórico, indicadores, troca de tema e bloqueio 403. |
| Regressão do defeito D1 (protótipo) | `node tests/reclassificar-closed.mjs` | Que um chamado fechado não pode ser reclassificado (defeito D1, ver capítulo de registro de testes). |
| Integração (back-end) | `dotnet test src/backend/One.slnx` | A API em memória, pelos casos do Quadro 8.3. |

Fonte: elaborado pelos autores (2026), com base no README do protótipo, no relatório de homologação e em `src/backend/One.Api.Tests/ApiTests.cs`.

## Rastreabilidade dos testes do protótipo

O Quadro 8.2 liga cada área do protótipo aos requisitos que os testes cobrem. Os IDs são os da especificação do projeto.

Quadro 8.2 — Áreas do protótipo, requisitos e testes

| Área | Requisitos | Testes |
| --- | --- | --- |
| Assistente | RF-01 a RF-07 | Unitários (`knowledge-service`, `conversation-service`) e ponta a ponta |
| Conversa vira chamado | RF-08 a RF-10 | Unitários (`ticket-service`), integração e ponta a ponta |
| Classificação e roteamento | RF-11, RF-12, RF-14 | Unitários (`routing-service`), ponta a ponta e teste manual por CDP (RF-14) |
| Ciclo de vida do chamado | RF-15, RF-16 | Unitários (`ticket-service`), integração, ponta a ponta e regressão D1 |
| Atendimento | RF-18, RF-20 | Unitários (`ticket-service`) e ponta a ponta |
| Histórico | RF-23 | Integração e ponta a ponta |
| Base de conhecimento | RF-24 a RF-26 | Unitários (CRUD de artigos) e smoke |
| Indicadores | RF-27 (parcial) | Smoke e conferência manual dos cálculos |
| Acesso por perfil | RNF-13 | Unitários (`router`, `state`), integração, smoke e ponta a ponta |

Fonte: elaborado pelos autores (2026), com base no README do protótipo e no relatório de homologação.

Limites da cobertura, segundo o relatório de homologação:

- RF-07 (no máximo um chamado por conversa) e RF-19 (mensagens não podem ser editadas nem excluídas) foram só verificados por inspeção do código.
- RF-22 (e-mail ao aluno) não foi implementado, porque o protótipo não tem back-end.
- RF-13 (exatamente um setor de triagem), RF-17 (assumir chamado de outro atendente) e RF-21 (anexos) não aparecem como testados no relatório de homologação.
- RF-27 tem só parte dos indicadores implementada, com definições simplificadas.
- O cadastro de usuários, cursos, setores, categorias e regras é só de leitura no protótipo.

## Casos de teste do back-end

O Quadro 8.3 descreve os casos de teste de integração da API, em `src/backend/One.Api.Tests/ApiTests.cs`.

Quadro 8.3 — Casos de teste do back-end

| Caso de teste | Objetivo | Passos | Critério de êxito |
| --- | --- | --- | --- |
| CT-01 — Verificação de saúde | Verificar se a API responde que está saudável. | Enviar `GET /health`. | Status 200 e corpo `Healthy`. |
| CT-02 — OpenAPI em desenvolvimento | Verificar se o documento OpenAPI é servido no ambiente de desenvolvimento. | Subir a API no ambiente `Development` e enviar `GET /openapi/v1.json`. | Status 200 e tipo `application/json`. |
| CT-03 — OpenAPI fora de desenvolvimento | Verificar se o documento OpenAPI não é exposto em produção. | Subir a API no ambiente `Production` e enviar `GET /openapi/v1.json`. | Status 404. |
| CT-04 — Endpoint de exemplo removido | Verificar se o endpoint de exemplo do modelo do projeto foi removido. | Enviar `GET /weatherforecast`. | Status 404. |

Fonte: elaborado pelos autores (2026), com base em `src/backend/One.Api.Tests/ApiTests.cs`.

## Como executar

Os testes do protótipo rodam a partir da pasta `src/prototipo/`, com o servidor estático ativo na porta 4178:

```powershell
node tests/static-server.mjs 4178   # em um terminal separado
node tests/run-headless.mjs         # unitários + integração
node tests/smoke-app.mjs            # smoke de navegação
node tests/console-check.mjs        # erros de console
node tests/a11y-check.mjs           # acessibilidade estrutural
node tests/e2e.mjs                  # ponta a ponta por CDP; rode isolado
```

A suíte ponta a ponta deve rodar sozinha. Execuções sobrepostas podem deixar processos do Chrome abertos e travar a sessão de depuração.

Os testes do back-end rodam a partir da raiz do repositório, com o SDK do .NET 10 instalado:

```bash
dotnet test src/backend/One.slnx
```

## Limitações

A conformidade completa com a WCAG 2.2 AA exige teste manual com tecnologia assistiva, como leitor de tela. As verificações automáticas não cobrem esse teste.

## Testes planejados para o produto

Segundo o roadmap, o MVP (Fase 3) termina quando os critérios de aceite AC1 a AC9 passarem e a verificação do repositório passar.

Casos de teste do front-end em React e das funcionalidades da API: [a preencher pelo grupo].
