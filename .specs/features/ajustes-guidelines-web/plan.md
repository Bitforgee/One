# Ajustes de acabamento da revisão pelas Web Interface Guidelines

## Problem

A feature `revisao-guidelines-web` fechou com o C68 aberto (`crapper` bloqueado, fora desta feature) e seis defeitos menores que a verificação independente (rodadas 1 a 3, `verification.md`) deixou registrados. Hoje:
- em Artigos e Documentos, o botão de criar do cabeçalho some com a lista vazia, carregando ou com erro de listagem (`Artigos.tsx:149`, `Documentos.tsx:135`); com a lista com erro a pessoa fica sem como criar. O botão de Documentos diz "Novo documento" e abre um diálogo chamado "Enviar PDF" (`Documentos.tsx:111`);
- os placeholders de busca `Buscar pelo nome` (`Cadastros.tsx:85`) e `Buscar por nome, CPF ou e-mail` (`Usuarios.tsx:152`) não terminam em `…`;
- `index.css:184` declara `content-visibility: auto` em `[data-slot='table-row']` do corpo da tabela, mas o navegador ignora a propriedade em `<tr>`: o efeito só existe nos cartões do celular, e a declaração do desktop é código morto;
- o `Handle` do canvas de fluxos mede 44 px em CSS no ponteiro `coarse` (`NosDoCanvas.tsx:10`), mas o canvas escala por zoom (`fitView`), então a área de toque real na tela pode ser menor que 44 px;
- a 390×844, com 3 anexos e uma mensagem de 6 linhas, o compositor `sticky` do Assistente (`Assistente.tsx:510`) cobre por 4 px o link "Sua solicitação" com a página no topo;
- o manifest por instituição (`ManifestoInstituicao.cs`) entrega `background_color` `#ffffff` fixo, não declara `id` e não tem ícone `maskable`; o manifest estático do `vite.config.ts` reaproveita `icon-512.png` como `maskable`, sem a margem de segurança, e o Android corta a arte.

Quem paga: o atendente e o administrador que não conseguem criar artigo ou documento quando a listagem falha, o aluno de celular que perde a área de toque do canvas e vê o link coberto, e quem instala o PWA e recebe um ícone cortado e um splash branco sobre um app de fundo `#fafbfd`. Evidência: `verification.md` da `revisao-guidelines-web`, gaps 1, 2, 3, 4, 5 e 6 da rodada 3.

Depois desta feature: o botão de criar nunca some por erro, cada diálogo leva o nome da ação do botão que o abriu, o canvas tem área de toque de 44 px reais, o compositor do Assistente nunca cobre o conteúdo no topo, e o ícone instalado tem margem de segurança e o splash combina com o fundo do app.

## Flow

`single module - web/` mais uma rota da API (`ManifestoInstituicao`, exists). Reaproveita `Cabecalho`, `Tabela`, `Editor`, o `Canvas` do `@xyflow/react` (`useViewport`) e o manifest do `vite-plugin-pwa` (exists); a API só ganha campos no JSON.

1. `Artigos.tsx` (exists) e `Documentos.tsx` (exists): a regra de mostrar o botão do cabeçalho passa a depender de "lista carregada e vazia", não de "sem itens" (S1).
2. `Cadastros.tsx` (exists), `Usuarios.tsx` (exists): placeholders com `…` (S2).
3. `index.css` (exists): a regra `content-visibility` fica só nos cartões (S3).
4. `NosDoCanvas.tsx` (exists): o `Handle` compensa o zoom no ponteiro `coarse` (S4).
5. `Assistente.tsx` (exists): o compositor limita a própria altura e rola por dentro (S5).
6. `GET /api/instituicoes/{slug}/manifest.webmanifest` -> `ManifestoInstituicao` (exists, door 1) e `vite.config.ts` (exists): `id`, ícone `maskable` e `background_color` (S6).

## Impact

| Front | What changes |
| --- | --- |
| domain | termo existente: "sem itens" em Artigos e Documentos passava por vazio, carregando e erro; passa a significar só "carregada e vazia"; quem lê: `Cabecalho` e o `vazio` da `Tabela` |
| domain | termo existente: título do diálogo de documento novo era `Enviar PDF`, passa a `Novo documento`; os testes e o catálogo de textos que citam `Enviar PDF` mudam junto |
| domain | `content-visibility` em `<tr>` deixa de ser declarada; o teste C51 de `revisao-guidelines-web` (`tabela.test.tsx`) é reescrito para afirmar só os cartões (emenda registrada no `checks.md`) |
| stored data | nada a migrar |
| API | `ManifestoInstituicao.Resposta` ganha `id` e `purpose` nos ícones; `background_color` muda de `#ffffff` para `#fafbfd`; quem lê: os navegadores que instalam o PWA e `ManifestoTests.cs` |
| assets | novo `web/public/icons/icon-maskable-512.png` (arte com margem de segurança); `One.Api/wwwroot/` é gerado e não se edita |

## Relations

`None - no stored-data shape change`

## Surface

| Route | In | Out | Status |
| --- | --- | --- | --- |
| `GET /api/instituicoes/{slug}/manifest.webmanifest` | `slug` | `name` · `short_name` · `id` · `start_url` · `scope` · `display` · `theme_color` · `background_color` · `icons[src, sizes, type, purpose]` | `200`, `404` |

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| contrato do manifest por instituição (campos novos que o navegador já leu e guarda no app instalado) | `"id": "/{slug}/"`; `icons`: sem ícone da instituição `[{192 any}, {512 any}, {"src":"/icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]`; com ícone da instituição só entradas `"purpose":"any"`; `"background_color": "#fafbfd"` | marcar o ícone da instituição como `maskable`: a arte enviada pelo administrador não tem margem de segurança e o Android a cortaria |

- Nada mais nesta mudança é difícil de desfazer

## Criteria

### S1: botão de criar sempre acessível em Artigos e Documentos (P1)

O botão de criar do cabeçalho só some quando o estado vazio mostra o mesmo botão.

**Acceptance Criteria**

1. WHILE a lista de Artigos ou de Documentos está carregando, the system SHALL mostrar o botão `Novo artigo` ou `Novo documento` no cabeçalho
2. IF a listagem de Artigos ou de Documentos falha, THEN the system SHALL mostrar o erro com `Tentar de novo` e manter o botão de criar no cabeçalho
3. WHILE a lista carregada está vazia, the system SHALL esconder o botão do cabeçalho e mostrar o botão `Novo artigo` ou `Novo documento` do estado vazio, e nunca os dois
4. WHEN a pessoa toca `Novo documento`, the system SHALL abrir o diálogo com o título `Novo documento`; em "Nova versão" o título segue `Nova versão`

**Independent test:** derrubar a API de documentos; a tela mostra o erro e o botão `Novo documento`.

### S2: placeholders de busca com reticências (P3)

**Acceptance Criteria**

5. The `Input` de busca de Cadastros SHALL declarar `placeholder="Buscar pelo nome…"`
6. The `Input` de busca de Usuários SHALL declarar `placeholder="Buscar por nome, CPF ou e-mail…"`

**Independent test:** abrir Cadastros e Usuários; o texto de ajuda termina em `…`.

### S3: content-visibility só onde funciona (P3)

**Acceptance Criteria**

7. WHILE `Tabela` renderiza cartões (celular), the system SHALL declarar `content-visibility: auto` e `contain-intrinsic-size: auto 56px` em cada cartão
8. WHILE `Tabela` renderiza `<table>` (desktop), the system SHALL NOT declarar `content-visibility` em `<tr>`; o limite de 50 linhas de `revisao-guidelines-web` (C52) segue valendo

**Independent test:** inspecionar o CSS; só o seletor de cartões declara a propriedade.

### S4: área de toque do canvas medida na tela (P2)

**Acceptance Criteria**

9. WHILE o ponteiro é `coarse` e o canvas está em qualquer zoom entre o mínimo e o máximo, the system SHALL manter a caixa renderizada (`getBoundingClientRect`) do `Handle` com 44×44 px no mínimo

**Independent test:** em um tablet (820×1180, toque), enquadrar o fluxo e medir o `Handle`.

### S5: compositor do Assistente nunca cobre o conteúdo (P2)

**Acceptance Criteria**

10. WHEN a página do Assistente está no topo a 390×844 com 3 anexos e uma mensagem de 6 linhas, the system SHALL deixar a caixa do link `Sua solicitação` sem interseção com a caixa do compositor
11. WHILE a mensagem passa de 6 linhas, the system SHALL limitar a altura do campo a `30dvh` e rolar o texto por dentro

**Independent test:** a 390×844, anexar 3 arquivos e digitar 6 linhas; o link continua livre.

### S6: manifest instalável sem corte e sem flash (P2)

**Acceptance Criteria**

12. WHEN `GET /api/instituicoes/{slug}/manifest.webmanifest` responde `200`, the system SHALL incluir `"id": "/{slug}/"`
13. WHERE a instituição não tem ícone próprio, the system SHALL listar `/icons/icon-maskable-512.png` com `"purpose": "maskable"` e os dois ícones `"purpose": "any"`
14. WHERE a instituição tem ícone próprio, the system SHALL listar só entradas `"purpose": "any"` e nenhuma `maskable`
15. WHEN o manifest responde `200`, the system SHALL declarar `"background_color": "#fafbfd"`
16. IF a instituição não existe ou está inativa, THEN the system SHALL responder `404` com ProblemDetails, como hoje
17. The manifest estático do `vite.config.ts` SHALL referenciar `/icons/icon-maskable-512.png` como `maskable`, e `icon-512.png` só como `any`

**Independent test:** `curl` do manifest de `univag`; abrir o PWA instalado com o ícone sem corte.

## Out of scope

| Excluded | Why |
| --- | --- |
| C68 de `revisao-guidelines-web` (`crapper`) | bloqueio do Windows neste computador; decisão do dono (AD de risco aceito) ou outra máquina |
| Ícone `maskable` gerado a partir da arte da instituição | a API não processa imagem; o administrador não tem como enviar a margem hoje |
| `theme_color` e `background_color` por tema claro e escuro no manifest | o manifest só aceita um valor por arquivo |
| Mudar a cor padrão `#224fa7` do `theme_color` quando a instituição não tem cor | decisão de marca (AD-027, AD-032) |
| Virtualização real da tabela do desktop | sem volume medido; o limite de 50 do C52 protege |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| `background_color` do manifest igual ao `--background` claro `#fafbfd` | `#fafbfd` | a feature anterior fez o `theme-color` seguir o fundo da página; o splash do PWA segue o mesmo valor | n |
| Altura máxima do campo do Assistente | `30dvh` | deixa o link e o cabeçalho visíveis em 844 px de altura e em 390 px deitado | n |
| Compensação do zoom do `Handle` | escala `1/zoom` pelo `useViewport()`, só no ponteiro `coarse` | o desktop mantém o tamanho atual | n |
| Arte do ícone `maskable` | o `icon-512.png` atual reduzido para 80% e centralizado sobre a cor `#224fa7` | zona segura de 80% da especificação do W3C | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| all screens | celular 360×780 | AC 1, 3, 10 |
| all screens | celular deitado 844×390 | AC 11 (altura de `30dvh` a 390 px é 117 px; o campo ainda mostra 4 linhas) |
| all screens | teclado aberto | AC 10, 11 (o compositor limitado cabe acima do teclado) |
| all screens | toque | AC 9 |
| screen `Artigos` | loading, error, empty | AC 1, 2, 3 |
| screen `Documentos` | loading, error, empty, destructive confirms | AC 1, 2, 3, 4; confirmação existing - `Confirmar` do arquivar |
| screen `Cadastros`, `Usuarios` | placeholder | AC 5, 6 |
| screen `Fluxo` (canvas) | touch target | AC 9 |
| screen `Assistente` | long input | AC 10, 11 |
| API `GET /api/instituicoes/{slug}/manifest.webmanifest` | error shape and codes | AC 16 (ProblemDetails existing) |
| API `GET /api/instituicoes/{slug}/manifest.webmanifest` | authorization, versioning, rate limits | n/a - rota anônima de leitura que já existe; sem versão nova |

## Sources

- `.specs/features/revisao-guidelines-web/verification.md` - os seis gaps da rodada 3 que esta feature fecha
- Web App Manifest, `id` e `purpose` (W3C): `https://www.w3.org/TR/appmanifest/` - ícone `maskable` e zona segura de 80%
