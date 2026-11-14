# Fatias em subpastas checks

Profile: standard
Plan: `.specs/features/fatias-em-subpastas/plan.md`

19 checks em 6 slices · 4 one-way doors · 0 perguntas abertas

**Como as provas rodam.** Na raiz `D:\one-system`, com `docker compose up -d postgres mailpit minio` no ar. `<base>` é o commit `5c3c8ee` (HEAD de `main` quando o plano foi aprovado). Cada `--filter` desta lista tem de executar pelo menos 1 teste (L-002): filtro que não seleciona nada é prova vermelha, não verde. Os métodos novos de `ArquiteturaTests` (`Subpastas_das_fatias`, `Fatias_planas`, `Mapa_de_Chamados`, `Mapa_de_Administracao`, `Mapa_de_Assistente`, `Mapa_de_Conhecimento`, `Mapa_de_Instituicoes`) e o `it` novo de `web/src/test/estrutura.test.ts` (`administracao em subpastas`) são criados com exatamente esses nomes. No Windows, `crapper` e `dryer` rodam com `PYTHONUTF8=1`, e o Vitest com `--maxWorkers=4`.

## Checks

### S1 - A regra nova fica escrita e testada antes de mover arquivo (P1) · 3 files · 95 KB · ~24k

**C1** - `.specs/STATE.md` tem a linha `AD-056` na tabela de decisões (status `active`, citando AD-017 e AD-040) e o `AGENTS.md` traz o texto literal `One.Api/<Fatia>/<Subpasta>/` na seção "Arquitetura da API" (AC 1)
Proof: `pwsh -NoProfile -Command "if ((Select-String -Path .specs/STATE.md -Pattern '^\| AD-056 \|') -and (Select-String -Path AGENTS.md -Pattern 'One\.Api/<Fatia>/<Subpasta>/' -SimpleMatch:$false)) { exit 0 } else { exit 1 }"`

**C2** - `Subpastas_das_fatias` percorre `Chamados`, `Administracao`, `Assistente`, `Conhecimento` e `Instituicoes` e exige: nenhum `.cs` a mais de 1 nível de subpasta, nome de subpasta dentro da lista da door 3 (22 nomes: 6 de `Chamados`, 8 de `Administracao`, 3 de `Assistente`, 2 de `Conhecimento`, 3 de `Instituicoes`), no máximo 12 `.cs` por subpasta e no máximo 4 na raiz da fatia; um nome fora da lista, uma pasta com 13 arquivos ou um `.cs` em `Chamados/Acoes/Sub/` reprova (AC 2, doors 2 e 3)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Subpastas_das_fatias"`

**C3** - Todo `.cs` de `One.Api/` declara exatamente 1 `namespace` e ele é `One.Api` + a pasta relativa com `.` (por exemplo `One.Api.Chamados.Push` em `Chamados/Push/`), sem exceção para subpasta (AC 3, door 1)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Namespace_igual_a_pasta"`

**C4** - `Fatias_planas` fixa por lista que `Acesso`, `Mcp` e `Indicadores` não têm subpasta e que `Fatias_do_api` ainda lista exatamente as 7 fatias mais `Dados` em `One.Api/` (AC 4)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Fatias_planas|FullyQualifiedName~ArquiteturaTests.Fatias_do_api"`

### S2 - `Chamados` em 6 subpastas (P1) · 43 files · 72 KB · ~18k

**C5** - `Mapa_de_Chamados` conta os `.cs` por pasta: raiz 2 (`Avisos`, `ChamadosExtensoes`), `Acoes` 12, `Permissao` 4, `Consulta` 9, `Push` 6, `TempoReal` 4, `Tarefas` 6, total 43, e confere os nomes de cada pasta com o mapa do plano (AC 5)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Mapa_de_Chamados"`

**C6** - Os 10 tipos de ação (`AbrirChamado`, `AssumirChamado`, `CancelarChamado`, `ConfirmarChamado`, `EncaminharChamado`, `MarcarDuplicado`, `ReclassificarChamado`, `RejeitarChamado`, `ResolverChamado`, `ResponderChamado`) têm `Namespace == "One.Api.Chamados.Acoes"` e o arquivo em `Chamados/Acoes/<Tipo>.cs` (AC 6)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Dez_acoes_do_chamado"`

**C7** - `IgnoreQueryFilters` aparece em exatamente 9 arquivos: `Acesso/ApagarLancamentos.cs`, `Assistente/Conversas/AbandonarConversas.cs`, `Assistente/Busca/IndexarTrechos.cs`, `Chamados/Tarefas/FecharResolvidos.cs`, `Chamados/Tarefas/ResolverSemResposta.cs`, `Chamados/Tarefas/LembrarAguardando.cs`, `Chamados/Tarefas/SubirPorPrazo.cs`, `Chamados/Tarefas/EnviarEmails.cs`, `Chamados/Tarefas/EnviarPushes.cs`, e o teste compara a lista nos dois sentidos (AC 7)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.IgnoreQueryFilters_so_no_agendador_e_no_comando"`

### S3 - `Administracao` em 8 subpastas (P1) · 41 files · 52 KB · ~13k

**C8** - `Mapa_de_Administracao` conta: raiz 2 (`AdministracaoExtensoes`, `ErrosDeAdmin`), `Categorias` 4, `Cursos` 5, `Setores` 5, `Usuarios` 6, `RespostasProntas` 4, `Fluxos` 7, `Matriculas` 2, `Integracoes` 6, total 41, com os nomes do mapa (AC 8)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Mapa_de_Administracao"`

**C9** - O único arquivo que contém `"/matriculas/importacao"` está em `Administracao/Matriculas/` e tem 1 chamada `.Map*(` (AC 9)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Importacao_em_arquivo_proprio"`

### S4 - `Assistente`, `Conhecimento` e `Instituicoes` (P2) · 73 files · 120 KB · ~31k

**C10** - `Mapa_de_Assistente` conta: raiz 1, `Conversas` 12, `Respostas` 10, `Busca` 4, total 27, com os nomes do mapa (AC 10)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Mapa_de_Assistente"`

**C11** - `Mapa_de_Conhecimento` conta: raiz 3 (`BuscarFontes`, `CitacoesDeFontes`, `ConhecimentoExtensoes`), `Artigos` 9, `Documentos` 9, total 21, com os nomes do mapa (AC 11)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Mapa_de_Conhecimento"`

**C12** - `Mapa_de_Instituicoes` conta: raiz 1, `Aparencia` 7, `Carga` 7, `Plataforma` 10, total 25, com os nomes do mapa (AC 12)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ArquiteturaTests.Mapa_de_Instituicoes"`

### S5 - `web/src/administracao/` em 5 subpastas (P2) · 52 files · 378 KB · ~97k

**C13** - O `it("administracao em subpastas")` de `estrutura.test.ts` exige: os 52 arquivos de `web/src/administracao/` (a contagem do base) ficam em `aparencia/`, `fluxos/`, `cadastros/`, `integracoes/`, `instituicoes/` ou na raiz da fatia; a raiz tem exatamente `comum.tsx`, `avisoAoFechar.ts`, `IconesDoDestino.ts` e `LinhasDosCadastros.tsx` (os dois últimos usados por `fluxos/` e `cadastros/`, emenda E1); cada subpasta tem exatamente a lista de arquivos do mapa abaixo (aparencia 10, fluxos 14, cadastros 14, integracoes 8, instituicoes 2), conferida arquivo a arquivo (emenda E2); nenhum arquivo de produto de uma subpasta importa de outra subpasta (`../fluxos/`, `../cadastros/` etc.; emenda E1); nenhum arquivo está a mais de 1 nível de subpasta; cada `*.test.tsx` está na mesma subpasta de uma tela que ele abre (AC 13, 14, door 4)
Proof: `npm --prefix web test -- src/test/estrutura.test.ts -t "administracao em subpastas"`

**C14** - O `it("estrutura em fatias")` existente passa sem mudança de asserção: as pastas de `web/src` continuam as 6 fatias mais `ui` e `ilustracoes`, e cada teste abre uma tela da própria fatia (AC 14)
Proof: `npm --prefix web test -- src/test/estrutura.test.ts -t "estrutura em fatias"`

**C15** - Nenhum arquivo sob `web/src/administracao/<subpasta>/` importa de `@/` e `npm --prefix web run build` (`tsc --noEmit` e `vite build`) sai 0, o que prova que cada import `../../ui/...`, `../../api`, `../../acao` resolve (AC 15)
Proof: `npm --prefix web test -- src/test/estrutura.test.ts -t "administracao em subpastas"`
Proof: `npm --prefix web run build`

### S6 - Nada muda por fora (P1) · 0 files novos · ~6k

**C16** - O retrato de rotas (93 linhas, `RetratoTests.cs` fixa `Assert.Equal(93, viva.Count)`; emenda E3), os retratos de resposta e o modelo EF não mudam: `RetratoTests` inteira passa, `Modelo_sem_mudanca_pendente` passa, `dotnet ef migrations has-pending-model-changes --project One.Api` sai 0 e `git diff --stat <base>..HEAD -- One.Api/Dados/Migracoes` não imprime nada (AC 16)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~RetratoTests|FullyQualifiedName~ArquiteturaTests.Modelo_sem_mudanca_pendente"`
Proof: `dotnet ef migrations has-pending-model-changes --project One.Api`
Proof: `pwsh -NoProfile -Command "if (git diff --stat 5c3c8ee..HEAD -- One.Api/Dados/Migracoes) { exit 1 } else { exit 0 }"`

**C17** - No último commit, `dotnet test One.Api.Tests` termina com 0 falhas e 0 pulados e com pelo menos os 979 testes do base, e `npm --prefix web test` termina com 0 falhas, 0 pulados (AC 17)
Proof: `dotnet test One.Api.Tests`
Proof: `npm --prefix web test -- --maxWorkers=4`

**C18** - Entre `<base>` e `HEAD`, toda linha com `Assert`, `expect(`, `toBe` ou `toHave` removida em `One.Api.Tests/**/*.cs`, `web/src/**/*.test.tsx` e `web/e2e/**` reaparece como linha adicionada depois de trocar cada caminho ou namespace do mapa por um marcador; nenhuma linha adicionada traz `Skip =`, `.skip(` nem `.only(`. O `asserts_preservados.py` do `refatoracao-solid` não serve: lê o prefixo `api.Tests/` e não vê o diretório atual. O script novo é `.specs/features/fatias-em-subpastas/asserts_so_caminho.py` (AC 18)
Proof: `python .specs/features/fatias-em-subpastas/asserts_so_caminho.py 5c3c8ee`

**C19** - Os gates do AD-018 e o e2e continuam verdes: `crapper --use-existing-coverage -s src --threshold 9.99` sai 0 depois de `npm --prefix web run coverage -- --maxWorkers=4`; `dryer` sobre as 6 fatias e a raiz com `--threshold 0.8` imprime `No duplicate candidates found.`; `npm --prefix web run e2e` passa as mesmas specs do base; `dotnet build One.slnx` sai 0 com `CA1502` ligado (AC 19)
Proof: `npm --prefix web run coverage -- --maxWorkers=4`
Proof: `dotnet build One.slnx`
Proof: `npm --prefix web run e2e`

## Emendas

Aprovadas pelo dono em 13/11 ("faça isso"), depois da rodada 2 do Verify. Os checks originais não foram apagados; o texto novo está no próprio check.

- **E1 (C13):** `IconesDoDestino.ts` e `LinhasDosCadastros.tsx` são usados por `fluxos/` e `cadastros/` e vão para a raiz de `web/src/administracao/`; nenhum arquivo de produto de uma subpasta importa de outra. Motivo: o build deixou um em cada subpasta, com import cruzado nos dois sentidos.
- **E2 (C13):** a atribuição arquivo a arquivo do web passa a ser conferida pelo teste, contra a lista literal do mapa (a rodada 1 achou que o teste só exigia 1 arquivo por subpasta).
- **E3 (C16):** o retrato de rotas tem 93 linhas, não 61 (o número 61 veio do `vertical-slice-completa`; o retrato cresceu depois). A prova não muda.
- **E4 (C19):** o membro `crapper` do C19 fica sem prova por risco aceito, AD-057 (o executável é bloqueado pelo Controle de Aplicativo deste computador).

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| door 1: namespace segue a pasta (1) | `Namespace_igual_a_pasta` C3 | - |
| door 2: um nível (1) | `Subpastas_das_fatias` C2 | - |
| door 3: nomes de subpasta da API (22) | `Categorias` C2 · `Cursos` C2 · `Setores` C2 · `Usuarios` C2 · `RespostasProntas` C2 · `Fluxos` C2 · `Matriculas` C2 · `Integracoes` C2 · `Acoes` C2 · `Permissao` C2 · `Consulta` C2 · `Push` C2 · `TempoReal` C2 · `Tarefas` C2 · `Conversas` C2 · `Respostas` C2 · `Busca` C2 · `Artigos` C2 · `Documentos` C2 · `Aparencia` C2 · `Carga` C2 · `Plataforma` C2 | - |
| door 4: subpastas do web (5) | `aparencia` C13 · `fluxos` C13 · `cadastros` C13 · `integracoes` C13 · `instituicoes` C13 | - |
| contagem de arquivos por pasta de `Chamados` (7) | raiz C5 · `Acoes` C5 · `Permissao` C5 · `Consulta` C5 · `Push` C5 · `TempoReal` C5 · `Tarefas` C5 | - |
| contagem de arquivos por pasta de `Administracao` (9) | raiz C8 · `Categorias` C8 · `Cursos` C8 · `Setores` C8 · `Usuarios` C8 · `RespostasProntas` C8 · `Fluxos` C8 · `Matriculas` C8 · `Integracoes` C8 | - |
| contagem por pasta de `Assistente`, `Conhecimento`, `Instituicoes` (11) | `Assistente`/raiz C10 · `Conversas` C10 · `Respostas` C10 · `Busca` C10 · `Conhecimento`/raiz C11 · `Artigos` C11 · `Documentos` C11 · `Instituicoes`/raiz C12 · `Aparencia` C12 · `Carga` C12 · `Plataforma` C12 | - |
| 10 ações do chamado (10) | `AbrirChamado` C6 · `AssumirChamado` C6 · `CancelarChamado` C6 · `ConfirmarChamado` C6 · `EncaminharChamado` C6 · `MarcarDuplicado` C6 · `ReclassificarChamado` C6 · `RejeitarChamado` C6 · `ResolverChamado` C6 · `ResponderChamado` C6 | - |
| arquivos que usam `IgnoreQueryFilters` (9) | `ApagarLancamentos` C7 · `AbandonarConversas` C7 · `IndexarTrechos` C7 · `FecharResolvidos` C7 · `ResolverSemResposta` C7 · `LembrarAguardando` C7 · `SubirPorPrazo` C7 · `EnviarEmails` C7 · `EnviarPushes` C7 | - |
| fatias planas (3) | `Acesso` C4 · `Mcp` C4 · `Indicadores` C4 | - |
| rotas do retrato, nenhuma nova ou alterada (93) | todas as 93 linhas do retrato C16, table-driven | - |
| startup config: assemblies de teste (1) | `OneFactory` único, usado por `RetratoTests` C16 e pela suíte C17 | - |

- Claims que citam rota, status ou corpo: C16 - cruza a fronteira HTTP pelo retrato e pelas suítes de integração existentes
- Nenhum outro check afirma mais do que o caso que a prova exercita

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Regra de arquitetura (`ArquiteturaTests`) | um teste por regra, no próprio `ArquiteturaTests` | cada nome de subpasta e cada contagem do mapa aparece como linha da asserção, nos dois sentidos |
| Código movido sem mudança de lógica | nenhuma prova própria | coberto pelos testes de integração e de domínio existentes (C17) |

Evidence:

- `ArquiteturaTests.cs`: 40 `[Fact]` de regra sobre pasta, namespace e dependência -> decisão (cada um falha por um motivo próprio)
- arquivos movidos: o corpo não muda, só `namespace` e `using` -> instrumentation
- analogue mais próximo: `Fatias_do_api` e `Um_arquivo_por_caso_de_uso`, já provados no mesmo nível com lista fixa

Cost: 8 testes novos de regra num arquivo. Sem eles, a regra "uma subpasta por assunto" fica só em texto e a pasta volta a crescer sem ninguém ver.

## Swept

- validation: C2 (nome fora da lista, 13 arquivos, 2 níveis reprovam), C13
- failure modes: C16 (o modelo EF e as rotas não mudam se um tipo trocar de namespace), C17
- idempotency: n/a - mover arquivos não cria operação repetível
- authorization: existing - a decisão de permissão é do `AgirNoChamado` e das políticas de rota; C16 (retrato com `IAuthorizeData` e `IAllowAnonymous`) prova que continuam as mesmas
- concurrency: n/a - mudança só de organização de arquivos, sem estado compartilhado novo
- data lifecycle: C16 (nenhuma migration, nenhuma entidade de `Dados/` se move)
- dependency failure: n/a - nenhuma dependência externa nova nem alterada
- state transitions: C17 (os testes de domínio e de integração dos chamados passam como no base)
- observability: n/a - nenhum log, métrica ou rastro muda; nomes de categoria de log usam o nome do tipo, não o namespace completo (conferido no `grep` de `FullName` e `.Namespace` em `One.Api/`, só o teste usa)

## Handoff

Estimativa por `wc -c` dos arquivos que cada slice toca, dividido por 4, com o orçamento de 150k do `AGENTS.md`:

- S1 = ~24k (`ArquiteturaTests.cs` 74 KB ≈ 19k, `STATE.md` e `AGENTS.md` ≈ 5k)
- S2 = ~18k (`Chamados/`) → acumulado 42k
- S3 = ~13k (`Administracao/`) → acumulado 55k
- S4 = ~31k (`Assistente/` 13k, `Conhecimento/` 7k, `Instituicoes/` 11k) → acumulado 86k
- S6 = ~6k (rodar provas e escrever `asserts_so_caminho.py`) → acumulado 92k, tudo em `One.Api/` e `One.Api.Tests/`
- S5 = ~97k (`web/src/administracao/`, 378 KB) entra em 189k, acima do orçamento de 150k → corte proposto depois de S4 e S6 (a fronteira da API para o `web/`)
- Mechanism: **handoff** (escolha do dono) - batch 1 = S1-S4 e S6 da API, batch 2 = S5 do `web/`, em sequência e só no verde; o Verificador roda depois do último commit, dispatchado pelo orquestrador
- **Boundary:** C1-C12, C16, C18 fechados em bef094d
- **Settled mid-build:** base real foi eab6d1c (os checks citam 5c3c8ee); `Fatias_do_api` ficou sem mudança (a lista `Fatias` já tem 8 fatias mais `Dados`); `asserts_so_caminho.py` normaliza também `FatiaDo(t) == fatia` como `t.Namespace == $"One.Api.{fatia}"` e o sufixo `\.{SubpastaDoShared[x]}`; `Retratos/servicos.txt`, `AgendadorTarefasTests`, `PlataformaTests` e `ProvedorTests` ganharam só caminhos e namespaces novos; os commits S2 a S4 não compilam o projeto de testes sozinhos (testes e `using` de `One.Api.Tests`, `Mcp` e `Program.cs` vão no último commit)
- **Abandoned:** nada
- **Boundary (batch 2):** C13, C14, C15, C17 e C18 (web), C19 fechados em fcb5ed4 e cdce9f0; `crapper` bloqueado neste computador por política de Controle de Aplicativo (`crapper.exe` não inicia), o gate CRAP fica para outra máquina; e2e igual ao base (mesmas 8 specs falham nos dois: anexos, casca-real, chat campo alto, fluxos-real, identidade-real, instituicoes-real, ux-real x2; ambiente, sem relação com o move)
- **Settled mid-build (batch 2):** `IconesDoDestino` (fluxos) e `LinhasDosCadastros` (cadastros) são usados pelas duas subpastas e ficaram em quem os usa mais, com import cruzado `../fluxos/` e `../cadastros/`, para a raiz ficar só com `comum.tsx` e `avisoAoFechar.ts`; `fluxos.test` e `setorEmFluxo.test` abrem só `/cadastros` e foram para `cadastros/`; o it `administracao em subpastas` conta como aberta a subpastas de uma rota aberta por `abrir` ou de um módulo importado pelo teste (`canvas.test` fica em `fluxos/`); no `estrutura.test.ts` só os regex de caminho de `estrutura em fatias` e `canvas carregado só sob demanda` ganharam profundidade; `guidelinesGlobal.test.ts` apontava para `One.Api/Instituicoes/ManifestoInstituicao.cs` (movido no batch 1) e passou a `Instituicoes/Carga/`
- **Abandoned (batch 2):** nada