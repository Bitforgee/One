# One

> Descrição do projeto: a preencher.

## Estrutura do repositório

| Pasta | Conteúdo |
| --- | --- |
| `docs/` | Documentação em Markdown, que depois vira um documento único nas normas da ABNT. Veja [docs/README.md](docs/README.md). |
| `frontend/` | SPA/PWA em React com Vite. A linguagem ainda vai ser escolhida; veja [frontend/README.md](frontend/README.md). |
| `backend/` | API REST em ASP.NET Core (.NET 10). |
| `.specs/` | Especificações e decisões técnicas do repositório. |

## Back-end

Pré-requisito: [SDK do .NET 10](https://dotnet.microsoft.com/download/dotnet/10.0).

Executar a API:

```bash
dotnet run --project backend/One.Api
```

A API sobe em `http://localhost:5221` (porta definida em `backend/One.Api/Properties/launchSettings.json`). `GET /health` responde `Healthy`. Em desenvolvimento, o documento OpenAPI fica em `/openapi/v1.json`.

Rodar os testes:

```bash
dotnet test backend/One.slnx
```
