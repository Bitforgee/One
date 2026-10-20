# Instruções de utilização

Código-fonte do Univag One (BitForge). A pasta tem quatro partes:

| Pasta | Conteúdo | Situação em 20/10/2026 |
| --- | --- | --- |
| [`src/backend/`](./backend/) | API REST em ASP.NET Core (.NET 10), com testes de integração em xUnit | Estrutura inicial: `GET /health` e documento OpenAPI |
| [`src/frontend/`](./frontend/README.md) | SPA/PWA em React com Vite | Ainda sem código; o grupo vai escolher entre TypeScript e JavaScript |
| [`src/diagramas/`](./diagramas/) | Fontes PlantUML (`.puml`) dos diagramas da documentação; as imagens PNG ficam em [`docs/diagramas/`](../docs/diagramas/) | 12 diagramas |
| [`src/prototipo/`](./prototipo/README.md) | Protótipo visual navegável em HTML, CSS e JavaScript, com dados simulados e sem back-end | Publicado em <https://bitforgee.github.io/prototipo-v1-one/> |

Todos os comandos abaixo rodam a partir da raiz do repositório.

## Pré-requisitos

- SDK do .NET 10, para a API.
- Node.js, para o servidor estático e os testes do protótipo.
- Google Chrome ou Microsoft Edge, para os testes do protótipo.

## Back-end

Executar a API:

```bash
dotnet run --project src/backend/One.Api
```

A API sobe em `http://localhost:5221` (porta definida em `src/backend/One.Api/Properties/launchSettings.json`). O endereço `http://localhost:5221/health` responde `Healthy`. Em desenvolvimento, o documento OpenAPI fica em `/openapi/v1.json`.

Rodar os testes:

```bash
dotnet test src/backend/One.slnx
```

## Protótipo

O protótipo publicado abre direto no navegador, no computador ou no celular: <https://bitforgee.github.io/prototipo-v1-one/>.

Para rodar no próprio computador, suba o servidor estático:

```bash
node src/prototipo/tests/static-server.mjs 4178
```

Depois, abra `http://localhost:4178` e escolha um perfil: Aluno, Atendente ou Administrador.

Com o servidor ativo, rode os testes em outro terminal:

```bash
node src/prototipo/tests/run-headless.mjs          # unitários e integração (67 testes)
node src/prototipo/tests/smoke-app.mjs             # navegação (20 cenários)
node src/prototipo/tests/console-check.mjs         # erros de JavaScript
node src/prototipo/tests/a11y-check.mjs            # acessibilidade estrutural
node src/prototipo/tests/e2e.mjs                   # ponta a ponta; rode sozinho
node src/prototipo/tests/reclassificar-closed.mjs  # regressão do defeito D1
```

Os resultados da última execução estão no [registro de testes de software](../docs/09-registro-de-testes-de-software.md). Os detalhes do protótipo estão no [README do protótipo](prototipo/README.md).

## Front-end

Como criar o projeto React depois da escolha da linguagem: [`src/frontend/README.md`](./frontend/README.md).

# Histórico de versões

## [0.3.0] - 20/10/2026

### Adicionado

- Protótipo visual em `src/prototipo/`, trazido do repositório `prototipo-v1-one` (commit `e10c6d3`, a versão publicada).

### Alterado

- Back-end e front-end movidos para `src/backend/` e `src/frontend/`, no modelo de projeto integrador da PUC Minas.

## [0.2.0] - 16/10/2026

### Adicionado

- API REST em ASP.NET Core (.NET 10) com `GET /health`, documento OpenAPI em desenvolvimento e 4 testes de integração.
- Pasta do front-end, ainda sem código.

## [0.1.0] - 13/10/2026

### Adicionado

- Protótipo visual navegável publicado no GitHub Pages.
