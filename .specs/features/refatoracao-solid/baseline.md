# Baseline antes da refatoração (C7)

Medido em `c267db8` (feature base), 02/11/2026, antes de qualquer commit que mova ou altere código de
`api/` ou `web/src/`.

## CA1502 no limite 10

Como foi medido: `api/CodeMetricsConfig.txt` com `CA1502(Method): 10`, incluído como `AdditionalFiles`
no `api/One.Api.csproj`, e `dotnet_diagnostic.CA1502.severity = warning` no `.editorconfig`, só como
aviso; `dotnet build api --no-incremental`. Total: **18 métodos acima de 10**.

| Arquivo | Métodos acima de 10 | Métodos (complexidade) |
| --- | --- | --- |
| api/Agendador.cs | 1 | `Ler` (11) |
| api/Assistente/Assistente.cs | 3 | `Responder` (22), `Buscar` (14), `Conferir` (11) |
| api/Comando/InstituicaoComando.cs | 3 | `Carga` (51), `AvaliarBusca` (17), `Criar` (12) |
| api/Rotas/AdminRotas.cs | 4 | `Importar` (35), `Mapear` (33), `Usuarios` (29), `Regras` (13) |
| api/Rotas/ArtigoRotas.cs | 1 | `Validar` (12) |
| api/Rotas/AuthRotas.cs | 1 | `Mapear` (28) |
| api/Rotas/ChamadoRotas.cs | 2 | `Mapear` (41), `Detalhe` (26) |
| api/Rotas/ConversaRotas.cs | 1 | `Mapear` (22) |
| api/Rotas/DocumentoRotas.cs | 1 | `MapearAdmin` (16) |
| api/Rotas/IndicadorRotas.cs | 1 | `Mapear` (39) |

Pergunta aberta 1 do plano, respondida: **sim**, o CA1502 soma ao método que os contém os lambdas e as
funções locais. `ChamadoRotas.Mapear` (41), `IndicadorRotas.Mapear` (39) e `AuthRotas.Mapear` (28)
só têm chamadas `Map*` com lambdas; `AdminRotas.Usuarios` (29) e `Regras` (13) somam as funções
locais. Por isso as rotas viram métodos estáticos nomeados.

## crapper do web/src com cobertura

Como foi medido: `npm --prefix web run coverage` (Vitest com `@vitest/coverage-v8` 5.0.5) e
`cd web && crapper --use-existing-coverage -s src`. Top 10 por CRAP:

| # | Função (namespace) | CC | Cobertura | CRAP |
| --- | --- | --- | --- | --- |
| 1 | ChamadoDetalhe (telas.Chamados) | 64 | 76.0% | 120.9 |
| 2 | Cadastros (telas.Admin) | 45 | 69.4% | 103.1 |
| 3 | Usuarios (telas.Admin) | 32 | 60.5% | 95.0 |
| 4 | Documentos (telas.Equipe) | 21 | 51.9% | 70.2 |
| 5 | Assistente (telas.Assistente) | 40 | 90.0% | 41.6 |
| 6 | Artigos (telas.Equipe) | 21 | 67.7% | 35.8 |
| 7 | Fila (telas.Chamados) | 9 | 63.6% | 12.9 |
| 8 | api (api) | 11 | 88.9% | 11.2 |
| 9 | Matriculas (telas.Admin) | 9 | 75.0% | 10.3 |
| 10 | Indicadores (telas.Equipe) | 7 | 66.7% | 8.8 |
