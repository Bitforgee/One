# One — Protótipo Visual

Protótipo visual navegável da **One**, a central inteligente de atendimento
universitário. Este diretório é um artefato **separado e paralelo** à
arquitetura oficial do MVP (React + ASP.NET Core, decisão AD-001): aqui vive
apenas o protótipo de alta fidelidade em **HTML5 + CSS3 + JavaScript Vanilla +
Bootstrap 5.3**, sem backend.

> **Protótipo visual.** Todos os dados são demonstrativos e fictícios. As
> permissões e os fluxos são simulados no navegador e **não constituem
> segurança real**.

## Estado atual

**Fase 1 — Fundação (concluída).** Estrutura, design system, app shell
(sidebar + header + offcanvas), tema claro/escuro persistido e arquitetura
JavaScript modular.

**Fase 2 — Navegação (concluída).** Landing page, login demonstrativo por
seleção de perfil, roteamento por hash com controle de acesso simulado,
páginas de erro (404/403), e dashboards iniciais dos três perfis com
organização inspirada no GLPI (KPIs + prévia de chamados em tabela + atalhos).

**Fase 3 — Base de Conhecimento + Assistente (concluída).** Consulta à base de
conhecimento (busca por palavra-chave, filtro por categoria, visualização em
modal; só artigos publicados para aluno/atendente, todos os estados para o
admin) e assistente acadêmico em chat. O assistente responde **apenas** a
partir de artigos publicados (BR-B2), pergunta "Isso resolveu?" com Sim/Não
(BR-B3), encerra como resolvido (Sim) ou oferece abrir solicitação (Não), e
informa quando não há artigo (BR-B4). A conversa guarda snapshot do artigo
(BR-B8). **Não há IA real**: a correspondência é determinística por
palavras-chave. A criação efetiva de chamados é da Fase 4.

**Fase 4 — Solicitações (concluída).** Criação de solicitação com confirmação
(BR-D1), reaproveitando o contexto da conversa do assistente (BR-D2/D4);
protocolo `ONE-<n>` sequencial (BR-D5); classificação e roteamento por
categoria/coordenação (BR-E); listagem "Minhas solicitações" com busca e
filtros (BR-A4); detalhe com histórico (timeline), resposta do aluno,
confirmação/rejeição da resolução e cancelamento (F4/F6/F7/F8).

**Fase 5 — Atendimento humano (concluída).** Fila do setor e visões por estado
(BR-A5); assumir (F2), resposta pública, nota interna invisível ao aluno
(BR-G2), aguardar aluno (F3), encaminhar com setor diferente + motivo (BR-G4/F9)
e resolver com texto (F5). Transições validadas (BR-F1); fechado é terminal
(BR-F2); histórico append-only (BR-H).

**Fase 6 — Administração (concluída).** Indicadores (seção I) com gráficos SVG
próprios (barras e rosca), gestão (leitura) de usuários, cursos, setores,
categorias e regras de encaminhamento, lista geral de chamados (BR-A6) e
gestão da base de conhecimento com CRUD de artigos — criar, editar (nova versão
ao editar publicado, BR-C5), publicar e arquivar (BR-C3).

**Fase 7 — Refinamento e validação (concluída).** Teste de integração da
jornada completa, testes de regressão, verificação de responsividade e de temas,
revisão de acessibilidade e documentação final.

### Referência GLPI

A organização visual (sidebar agrupada, listas de chamados em tabela densa,
badges de situação, visões por estado) é **inspirada** no GLPI, sem copiar
código, identidade ou funcionalidades. A identidade visual é própria do One.

## Tecnologias

- HTML5 semântico
- CSS3 (variáveis/design tokens, temas, responsividade)
- JavaScript Vanilla ES6+ (módulos nativos, sem framework)
- **Bootstrap 5.3.3** (arquivos locais, em `vendor/`)
- **Bootstrap Icons 1.11.3** (arquivos locais, em `vendor/`)

Nenhuma dependência é carregada por CDN: o protótipo funciona **offline**.

## Como executar

Os módulos ES (`type="module"`) exigem origem HTTP; alguns navegadores bloqueiam
`file://`. Use um servidor estático simples.

Com Node (incluso um servidor mínimo sem dependências):

```powershell
node tests/static-server.mjs 4178
# abra http://localhost:4178
```

Ou com Python:

```powershell
py -m http.server 4178
# abra http://localhost:4178
```

Parâmetro opcional de tema para demonstração: `?theme=dark` ou `?theme=light`.

## Estrutura

```text
prototipo-visual/
├── index.html              # raiz da aplicação (preenchida por app.js)
├── css/
│   ├── variables.css       # design tokens (--one-*)
│   ├── themes.css          # temas claro/escuro (data-bs-theme)
│   ├── global.css          # base tipográfica, foco, acessibilidade
│   ├── layout.css          # app shell (grid: sidebar + header + conteúdo)
│   ├── components.css       # componentes próprios do One
│   ├── pages.css           # estilos das páginas (landing, login, erros, atalhos)
│   ├── bootstrap-custom.css # ajustes finos sobre o Bootstrap
│   └── responsive.css       # ajustes responsivos complementares
├── js/
│   ├── app.js              # orquestração: router + sessão + layouts
│   ├── router.js           # roteador por hash + guardas de acesso
│   ├── state.js            # sessão demonstrativa (perfil + persistência)
│   ├── storage.js          # wrapper de localStorage (namespace one.proto.)
│   ├── dom.js              # helpers de criação de DOM e escape de texto
│   ├── nav-config.js       # navegação por perfil (menus inspirados no GLPI)
│   ├── mock-data.js        # dados demonstrativos (chamados, artigos, setores, regras, usuários)
│   ├── components/
│   │   ├── theme-switcher.js
│   │   ├── shell.js        # monta o app shell e os hosts de conteúdo
│   │   ├── sidebar.js
│   │   ├── header.js
│   │   ├── table.js        # tabela reutilizável (listas de chamados)
│   │   ├── charts.js       # gráficos SVG próprios (barras e rosca)
│   │   └── toast.js
│   ├── pages/
│   │   ├── landing.js      # página inicial pública
│   │   ├── login.js        # login demonstrativo (seleção de perfil)
│   │   ├── dashboards.js   # painéis dos 3 perfis (layout GLPI)
│   │   ├── knowledge.js    # base de conhecimento (consulta)
│   │   ├── assistant.js    # assistente acadêmico (chat)
│   │   ├── tickets-student.js # criação, listagem e detalhe (aluno)
│   │   ├── tickets-agent.js   # fila, visões e atendimento (atendente)
│   │   ├── admin.js        # indicadores e gestão (admin)
│   │   ├── admin-articles.js  # CRUD de artigos (admin)
│   │   ├── errors.js       # páginas 404 / 403
│   │   └── design-system.js # página de demonstração (Fase 1)
│   └── services/
│       ├── knowledge-service.js   # consulta, correspondência e CRUD de artigos
│       ├── conversation-service.js # estado/persistência da conversa
│       ├── ticket-service.js      # ciclo de vida e atendimento de chamados
│       ├── routing-service.js     # classificação e roteamento (BR-E)
│       └── metrics-service.js     # indicadores (seção I)
├── vendor/                 # Bootstrap + Bootstrap Icons (offline)
├── data/
│   └── demo-data.json      # chamados/categorias/setores demonstrativos
├── assets/                 # ícones/imagens próprias (quando necessárias)
└── tests/
    ├── runner.html         # suíte de testes no navegador
    ├── tests.js            # testes (storage, dom, nav-config, state, router)
    ├── test-harness.js     # micro-framework de testes (sem dependências)
    ├── static-server.mjs   # servidor estático de desenvolvimento
    ├── run-headless.mjs    # executa a suíte em Chrome headless
    ├── smoke-app.mjs       # smoke de navegação (landing/login/dashboards/erros)
    ├── shots.mjs           # captura de telas (claro/escuro, desktop/mobile)
    └── screenshots/        # PNGs gerados
```

## Perfis demonstrativos

O protótipo representa os três perfis das regras de negócio (seção A):

- **Aluno** — conversa com o assistente, consulta a base, cria e acompanha
  solicitações.
- **Atendente** — fila do setor, atendimento, encaminhamento, resolução.
- **Administrador** — indicadores e gestão (usuários, cursos, setores,
  categorias, regras, artigos).

A partir da Fase 2, o acesso é feito pela tela de **login demonstrativo**
(`#/login`): escolher um perfil cria uma sessão demonstrativa e leva ao painel
correspondente. Não há senha nem autenticação real. Para demonstração e
capturas, há também o parâmetro `?demo-role=aluno|atendente|admin`.

### Rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `#/` | público | Landing page |
| `#/login` | público | Login demonstrativo |
| `#/aluno` | aluno | Painel do aluno |
| `#/atendente` | atendente | Painel do atendente |
| `#/admin` | admin | Painel do administrador |
| `#/aluno/assistente` | aluno | Assistente acadêmico (chat) |
| `#/aluno/novo` | aluno | Novo atendimento (criar solicitação) |
| `#/aluno/solicitacoes` | aluno | Minhas solicitações (lista) |
| `#/aluno/solicitacoes/:protocolo` | aluno | Detalhe da solicitação |
| `#/aluno/base` | aluno | Base de conhecimento (publicados) |
| `#/atendente/chamados` | atendente | Fila de chamados do setor |
| `#/atendente/em-atendimento` | atendente | Visão: em atendimento |
| `#/atendente/aguardando-aluno` | atendente | Visão: aguardando aluno |
| `#/atendente/resolvidos` | atendente | Visão: resolvidos |
| `#/atendente/chamado/:protocolo` | atendente | Atendimento do chamado |
| `#/atendente/base` | atendente | Base de conhecimento (publicados) |
| `#/admin/indicadores` | admin | Indicadores (gráficos) |
| `#/admin/chamados` | admin | Todos os chamados (BR-A6) |
| `#/admin/usuarios`, `/cursos`, `/setores`, `/categorias`, `/regras` | admin | Gestão (leitura) |
| `#/admin/artigos` | admin | Gestão da base de conhecimento (CRUD) |
| `#/design-system` | autenticado | Demonstração do design system |

Rotas inexistentes exibem **404**; rotas sem permissão para o perfil exibem
**403**; rotas protegidas sem sessão redirecionam ao login.

## Design system

O design system está documentado de forma viva na própria aplicação
(item **Design System** na sidebar): cores da marca, estados semânticos,
tipografia, botões, cartões de métrica, badges de estado do chamado, chips de
perfil e formulários — todos validados nos temas claro e escuro.

## Acessibilidade

A base de acessibilidade da Fase 1 inclui: HTML semântico, skip link, foco
visível, rótulos ARIA nos controles, `aria-current` na navegação ativa,
`aria-live` nos toasts e respeito a `prefers-reduced-motion`. A conformidade
completa com a WCAG 2.2 AA é verificada ao longo das próximas fases (uma
validação plena exige testes manuais com tecnologia assistiva).

## Testes

- **Suíte unitária + integração:** `tests/runner.html` — 67 testes de
  `storage`, `dom`, `nav-config`, `state`, `router`, `knowledge-service`
  (BR-B2/B4/C2/C3/C5), `conversation-service` (BR-B1/B5/B7/B8),
  `routing-service` (BR-E), `ticket-service` (BR-D/F/G/H) e a **jornada de
  integração** completa (10 passos) mais cenários negativos. Execução
  automatizada: `node tests/run-headless.mjs`.
- **Smoke de navegação:** `node tests/smoke-app.mjs` — 20 cenários cobrindo
  todas as telas e as regras de acesso por perfil.
- **E2E real (cliques no navegador):** `node tests/e2e.mjs` — 20 verificações
  conduzindo a interface via Chrome DevTools Protocol (login, assistente,
  Sim/Não, criação de chamado, atendimento, resolução, confirmação, histórico,
  indicadores, troca de tema, 403). Sem dependências externas.
- **Erros de console:** `node tests/console-check.mjs` — 0 erros de JavaScript
  nas rotas-chave.
- **Acessibilidade estrutural:** `node tests/a11y-check.mjs` — 0 avisos
  (lang, alt, rótulos de formulário, nomes de botões, landmarks, h1). Não
  substitui auditoria WCAG manual com leitor de tela.
- **Capturas:** `node tests/shots.mjs` — gera `tests/screenshots/`.

### Jornada principal validada

Aluno → Assistente → Solicitação → Protocolo → Atendente → Resposta →
Resolução → Aluno → Histórico → Administrador → Indicadores. Validada pelo
teste de integração (`tests/integration.js`) e reproduzível manualmente.

Os utilitários em `tests/*.mjs` usam apenas Node e o Chrome já instalado; não
instalam dependências.

## Matriz de rastreabilidade (resumo)

| Regras | Área | Tela / Serviço | Teste |
|---|---|---|---|
| BR-A | Identidade e acesso | login, guardas do `router`, visibilidade em `ticket-service` | router, integração |
| BR-B | Assistente | `pages/assistant.js`, `knowledge-service`, `conversation-service` | knowledge/conversation |
| BR-C | Base de conhecimento | `pages/knowledge.js`, `pages/admin-articles.js`, `knowledge-service` | CRUD de artigos |
| BR-D | Conversa → chamado | `pages/tickets-student.js`, `ticket-service.criarDeConversa` | ticket-service |
| BR-E | Classificação e roteamento | `routing-service` | routing-service |
| BR-F | Ciclo de vida | `ticket-service` (transições F1–F9) | ticket-service, integração |
| BR-G | Atendimento | `pages/tickets-agent.js`, `ticket-service` | ticket-service |
| BR-H | Histórico | timeline em `tickets-*`, `ticket-service` | integração |
| BR-I | Indicadores | `pages/admin.js`, `metrics-service`, `charts` | smoke |

## Limitações

- **Sem backend**: toda a persistência é no `localStorage` do navegador
  (demonstrativa). Limpar os dados do navegador reinicia o protótipo.
- **Sem IA**: o assistente usa correspondência determinística por
  palavras-chave sobre os artigos publicados.
- **Sem autenticação real**: o login apenas simula o acesso por perfil; as
  permissões são verificadas no cliente e **não constituem segurança**.
- Algumas regras dependem de backend e são apenas sinalizadas, não executadas:
  notificação por e-mail (BR-G6) e janelas de tempo automáticas de
  inatividade/confirmação (Q6/Q7).
- A gestão administrativa de usuários/cursos/setores/categorias/regras é de
  **leitura** (os dados do piloto refletem a documentação); o CRUD completo
  desses cadastros está fora do escopo do MVP. O CRUD de **artigos** é completo.
- A verificação automatizada cobre a lógica (serviços/regras), a renderização
  por rota (smoke) e a ausência de erros de console. A automação de cliques
  ponta a ponta no navegador exigiria uma ferramenta adicional (ex.: Playwright),
  não instalada; a jornada foi validada pelo teste de integração sobre os
  serviços reais e por verificação visual.

## Instruções de execução

1. Suba um servidor estático na pasta `prototipo-visual/`:
   - `node tests/static-server.mjs 4178`  (ou `py -m http.server 4178`)
2. Abra `http://localhost:4178`.
3. Clique em **Acessar** → escolha um perfil (Aluno, Atendente ou Administrador).
4. Para restaurar os dados demonstrativos: menu do usuário → **Restaurar dados
   demonstrativos**.

Verificação:

```powershell
node tests/static-server.mjs 4178   # em um terminal
node tests/run-headless.mjs         # testes unitários + integração
node tests/smoke-app.mjs            # smoke de navegação
node tests/console-check.mjs        # erros de console
```
