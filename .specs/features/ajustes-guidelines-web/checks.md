# Ajustes de acabamento da revisão pelas Web Interface Guidelines - checks

Profile: ui
Plan: `.specs/features/ajustes-guidelines-web/plan.md`

21 checks em 6 slices · 1 one-way door · 0 perguntas abertas (plano aprovado pelo usuário em 12/11: "use o tlc-spec-lean para corrigir" os seis gaps e "não me pergunte nada")

**Como as provas rodam.** Na raiz `D:\one-system`, salvo `cd web &&`. Vitest sempre com `--maxWorkers=4` e pelo PowerShell em `C:` maiúsculo. `npx vitest run <arquivo> -t "C1 "`: cada teste começa com o id do check e um espaço, e um filtro que não seleciona teste sai com 0 (L-002), então conferir a contagem de testes executados. API: `docker compose up -d postgres mailpit minio` e uma execução de `dotnet test` por vez. E2E: `docker compose up -d --build` e `npm --prefix web run e2e -- <spec>` contra :8080. Mutação suspensa (AD-025). A base da feature é `6959f46`.

## Checks

### S1 - botão de criar sempre acessível · 3 arquivos · 18 KB · ~12k

**C1** - Com a lista de Artigos ou de Documentos carregando, o botão `Novo artigo` ou `Novo documento` está no cabeçalho (AC 1)
Proof: `cd web && npx vitest run src/conhecimento/guidelinesCriar.test.tsx -t "C1 "`

**C2** - Se a listagem de Artigos ou de Documentos falha, aparece o erro com o botão `Tentar de novo` e o botão de criar do cabeçalho continua presente (AC 2)
Proof: `cd web && npx vitest run src/conhecimento/guidelinesCriar.test.tsx -t "C2 "`

**C3** - Com a lista carregada e vazia, o cabeçalho não tem o botão de criar e o estado vazio tem exatamente um botão `Novo artigo` ou `Novo documento` (AC 3)
Proof: `cd web && npx vitest run src/conhecimento/guidelinesCriar.test.tsx -t "C3 "`

**C4** - Tocar `Novo documento` abre o diálogo de título `Novo documento`, e abrir "Nova versão" de um documento existente mostra o título `Nova versão` (AC 4)
Proof: `cd web && npx vitest run src/conhecimento/guidelinesCriar.test.tsx -t "C4 "`

### S2 - placeholders de busca · 2 arquivos · 26 KB · ~17k

**C5** - O campo de busca de Cadastros tem `placeholder="Buscar pelo nome…"` (AC 5)
Proof: `cd web && npx vitest run src/administracao/guidelinesBusca.test.tsx -t "C5 "`

**C6** - O campo de busca de Usuários tem `placeholder="Buscar por nome, CPF ou e-mail…"` (AC 6)
Proof: `cd web && npx vitest run src/administracao/guidelinesBusca.test.tsx -t "C6 "`

### S3 - content-visibility só onde funciona · 2 arquivos · 14 KB · ~9k

**C7** - Cada cartão da `Tabela` no celular, em todos os layouts de cartões que ela renderiza (a fila densa e os demais; o teste enumera os três), declara `content-visibility: auto` e `contain-intrinsic-size: auto 56px` (AC 7)
Proof: `cd web && npx vitest run src/tabela.test.tsx -t "C7 "`

**C8** - Nenhum seletor de `<tr>` ou `[data-slot='table-row']` do corpo da tabela do desktop declara `content-visibility`, e a lista de 120 itens continua mostrando 50 linhas (AC 8)
Proof: `cd web && npx vitest run src/tabela.test.tsx -t "C8 "`

### S4 - área de toque do canvas medida na tela · 3 arquivos · 19 KB · ~13k

**C9** - Em 820×1180 com toque, em `fitView`, no zoom mínimo e no zoom máximo do canvas, a caixa renderizada de cada `Handle` mede 44×44 px ou mais (AC 9)
Proof: `npm --prefix web run e2e -- ajustes.spec.ts -g "C9 "`

### S5 - compositor do Assistente nunca cobre o conteúdo · 1 arquivo · 23 KB · ~16k

**C10** - A 390×844 e a 360×780, com 3 anexos e uma mensagem de 6 linhas e a página no topo, a caixa do link `Sua solicitação` não cruza a caixa do compositor (AC 10)
Proof: `npm --prefix web run e2e -- ajustes.spec.ts -g "C10 "`

**C11** - Com uma mensagem de 12 linhas, o campo mede no máximo 30% da altura da janela (`30dvh`) e o texto rola dentro dele; a 844×390 o conteúdo útil do campo (altura sem padding) comporta ao menos 4 linhas de 24 px, ou seja 96 px ou mais (AC 11, emenda 1)
Proof: `npm --prefix web run e2e -- ajustes.spec.ts -g "C11 "`

### S6 - manifest instalável sem corte e sem flash · 4 arquivos · 8 KB · ~6k

**C12** - `GET /api/instituicoes/univag/manifest.webmanifest` devolve `200` com `"id": "/univag/"` (AC 12)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ManifestoTests.Manifesto_declara_o_id_da_instituicao"`

**C13** - Sem ícone próprio, `icons` tem 3 entradas: `192x192` e `512x512` com `"purpose": "any"` e `/icons/icon-maskable-512.png` `512x512` com `"purpose": "maskable"` (AC 13)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ManifestoTests.Sem_icone_proprio_lista_o_maskable"`

**C14** - Com ícone próprio, `icons` tem só entradas `"purpose": "any"` apontando para `/api/instituicoes/univag/imagens/icone?v=<versão>`, e nenhuma `maskable` (AC 14)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ManifestoTests.Com_icone_proprio_so_lista_any"`

**C15** - O manifest declara `"background_color": "#fafbfd"` (AC 15)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ManifestoTests.Manifesto_declara_o_fundo_do_app"`

**C16** - Um slug inexistente e um slug de instituição inativa respondem `404` com ProblemDetails e o corpo traz `status: 404` e `title` do ProblemDetails (AC 16, emenda 1)
Proof: `dotnet test One.Api.Tests --filter "FullyQualifiedName~ManifestoTests.Instituicao_inexistente_ou_inativa_responde_404"`

**C17** - O manifest estático gerado pelo `vite.config.ts` lista `/icons/icon-maskable-512.png` com `purpose: "maskable"` e `icon-512.png` só com `purpose: "any"`, e o arquivo `web/public/icons/icon-maskable-512.png` existe com 512×512 px e todo pixel diferente da moldura `#224fa7` fica dentro do círculo central de raio 40% do lado, a zona segura da especificação do W3C (AC 17, emenda 1)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C17 "`

### Fechamento

**C18** - As suítes continuam verdes: Vitest inteiro (com os testes existentes ajustados só onde o título `Enviar PDF` e o `content-visibility` do desktop mudam), a API inteira e o build com tipos (Impact)
Proof: `cd web && npx vitest run --maxWorkers=4`
Proof: `dotnet test One.Api.Tests`
Proof: `npm --prefix web run build`

**C19** - O `crapper` sobre `web/src` sai 0 no limite 9.99 e o `dryer` não acha candidato com nota 0.8 ou mais (AD-018)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts`

**C20** - As telas tocadas continuam passando no E2E em 360×780 e 844×390 (Observable, linhas de celular)
Proof: `docker compose up -d --build && npm --prefix web run e2e -- ajustes.spec.ts guidelines.spec.ts casca-celular.spec.ts celular.spec.ts arranjo.spec.ts`

**C21** - O manifest por instituição continua instalável: o PWA estático e o da API apontam o mesmo arquivo maskable (Landing, door 1)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C21 "`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| estado da lista de Artigos e Documentos (3) | carregando C1 · erro C2 · vazia C3 | - |
| telas com o botão de criar (2) | Artigos C1 C2 C3 · Documentos C1 C2 C3 | - |
| títulos do diálogo de documento (2) | novo C4 · nova versão C4 | - |
| placeholders de busca (2) | Cadastros C5 · Usuários C6 | - |
| layouts da `Tabela` (2) | cartões C7 · tabela do desktop C8 | - |
| zoom do canvas (3) | `fitView` C9 · mínimo C9 · máximo C9 | - |
| viewports do compositor (2) | 390×844 C10 · 360×780 C10 | - |
| altura do campo (2) | 30dvh a 12 linhas C11 · 4 linhas a 844×390 C11 | - |
| `GET /api/instituicoes/{slug}/manifest.webmanifest` statuses (2) | 200 C12 C13 C14 C15 · 404 C16 | - |
| ícones do manifest da API (2 modos) | sem ícone próprio C13 · com ícone próprio C14 | - |
| campos novos do manifest (3) | `id` C12 · `purpose` C13 C14 · `background_color` C15 | - |
| startup config: manifest (2 assemblies) | API `ManifestoInstituicao.cs` C12 C13 C14 C15 · `vite.config.ts` C17 | - |

- Afirmam status ou corpo de rota: C12 a C16, todos com prova que passa pela rota HTTP real
- C9, C10 e C11 têm prova de navegador real (Playwright): o jsdom não calcula caixa de layout nem `@media`
- Door 1 do `Landing`: C12 C13 C14 C15 C21
- Nenhum outro check afirma mais que o caso que a prova exercita

## Amendments

Rodada 2, depois do FAIL da rodada 1 do Verify, a pedido do usuário ("não me pergunte nada").

- C11: a altura que importa é a do conteúdo, sem o padding; o 7rem calibrado a olho sai e a correção do C10 fica no limite dos anexos (max-h-16)
- C7: a Tabela tem 3 layouts de cartões, e o check os enumera
- C16: o corpo ProblemDetails também é afirmado
- C17: a zona segura do ícone maskable é um círculo de raio 40% (W3C), não um quadrado de 80%; o plano diz 80% como aproximação e o círculo é o critério
- Fica fora, por ser baixo: a linha "teclado aberto" do Observable e o clique perdido quando o botão do cabeçalho some ao carregar vazio
- C19: segue aberto; crapper bloqueado pelo Windows e sem AD do dono

## Swept

- validation: C11 (limite de altura do campo), C16 (slug inexistente)
- failure modes: C2 (listagem que falha), C16
- idempotency: n/a - nenhuma escrita nova; o manifest é uma leitura
- authorization: existing - a rota do manifest é `AllowAnonymous` e continua (`ManifestoInstituicao.cs`); as telas de conhecimento seguem as guardas de papel de `rotaPermitida`
- concurrency: n/a - sem estado compartilhado novo; o zoom do canvas é local ao componente
- data lifecycle: n/a - nada persistido; o ícone `maskable` é um arquivo estático versionado
- dependency failure: C2 (API de listagem fora), C16 (instituição inativa)
- state transitions: C1 C2 C3 (carregando, erro, vazia, com itens)
- observability: n/a - sem requisito de log ou métrica

## Handoff

Estimativa por slice = (tamanho em KB dos arquivos de código tocados × 2,7 para somar os testes existentes) × 1000 ÷ 4, medido com `Get-Item` nos 12 arquivos tocados (105 KB no total: `Artigos` 9,9 · `Documentos` 7,8 · `Cadastros` 16,3 · `Usuarios` 9,3 · `Tabela` 4,0 · `index.css` 10,4 · `NosDoCanvas` 4,4 · `Canvas` 14,0 · `Assistente` 23,4 · `ManifestoInstituicao.cs` 2,8 · `ManifestoTests.cs` 3,3 · `vite.config.ts` 1,6).

- S1 = 18 KB → 12k
- S2 = 26 KB → 17k
- S3 = 14 KB → 9k
- S4 = 19 KB → 13k
- S5 = 23 KB → 16k
- S6 = 8 KB → 6k
- Total = 73k, abaixo dos 150k do `budget` do AGENTS.md: um builder, sem perguntar
- Mechanism: one builder

**Boundary:** C1-C18 e C20-C21 closed at 46ee0c7; C19 open: `dryer` sem candidato (exit 0), `crapper` bloqueado pelo Controle de Aplicativo do Windows (`crapper.exe` não inicia), sem PASS
**Settled mid-build:** S5 precisou de mais que `30dvh` no campo: a 360x780 o compositor tinha 372 px e cobria o link; ficou `max-h-[min(30dvh,7rem)]` no campo e `max-h-16` com rolagem na lista de anexos (compositor 264 px). S4: `Handle` usa `--alvo` = 44/zoom via `useStore` e o ponto interno `inset-[36%]`. Os testes novos de `ManifestoTests` usam slug aleatório (o slug `univag` colide no banco da classe). Testes existentes que clicavam em `Novo artigo/documento` na lista vazia passaram a esperar o estado vazio (o botão do cabeçalho some quando a lista carrega vazia).
**Abandoned:** nada do plano; C19 (crapper) segue sem prova e não é declarado PASS.

