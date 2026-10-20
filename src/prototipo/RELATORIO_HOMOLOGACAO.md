# One — Relatório de Homologação Final

Protótipo: **One** — frontend-only, dados simulados, persistência em `localStorage` (namespace `one.proto.`).
Natureza: **protótipo de interface** sem backend real, sem autenticação real e sem IA (correspondência determinística por palavras-chave).
Objetivo deste documento: consolidar a auditoria independente, a correção aplicada e a **execução final de regressão** das cinco suítes, com um veredito honesto de prontidão para demonstração acadêmica.

> **Importante sobre honestidade de evidência.** Nenhuma funcionalidade é declarada aprovada sem evidência suficiente. Cada afirmação é classificada em exatamente um de quatro níveis:
> - **Testado automaticamente** — uma suíte nomeada passou e cobre a regra.
> - **Testado manualmente** — interação real no navegador via CDP (Chrome DevTools Protocol), com passos descritos.
> - **Verificado por inspeção** — confirmado por leitura de código, sem execução dedicada.
> - **Não verificado** — não comprovado nesta homologação, com a justificativa.

## Ambiente

| Item | Valor |
|------|-------|
| SO / Shell | Windows / PowerShell |
| Node | v24.13.0 (`C:\Program Files\nodejs\node.exe`) |
| Chrome | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| Raiz do protótipo | `c:\Users\joaoh\OneDrive\Área de Trabalho\ProjetoIntegrador\One (1)\One\prototipo-visual` |
| Servidor estático | `node tests/static-server.mjs 4178` (segundo plano) |
| Confirmação de escuta | `GET http://localhost:4178/index.html` → **HTTP 200** |
| Dependências instaladas nesta etapa | **Nenhuma** (proibido). As suítes usam apenas Node stdlib + o Chrome já instalado. |

---

## 1. Requisitos atendidos

### 1.1 Regras de negócio BR-A..BR-I

Cada linha cita implementação (arquivo · função) e o nível de evidência. Baseado em `audit-findings.md` e confirmado pela regressão final.

| Regra | Implementação (arquivo · função) | Evidência | Nível |
|------|-----------------------------------|-----------|-------|
| BR-A (perfis, vínculos, visibilidade por papel) | `js/state.js` `DEMO_USERS`; `js/pages/login.js` `PROFILES`; `js/app.js` `accessGuard` | `smoke-app.mjs` (403 aluno→admin, redirect sem sessão), `e2e.mjs` (aluno bloqueado em `#/admin/indicadores`), `run-headless.mjs` (tests state) | Testado automaticamente — `smoke-app.mjs`, `e2e.mjs` |
| BR-A4 (aluno só vê o próprio) | `js/pages/tickets-student.js` `renderTicketDetail`; `js/services/ticket-service.js` `listarDoAluno` | `e2e.mjs` ("Minhas solicitações"), integração negativa em `tests/integration.js` | Testado automaticamente — `e2e.mjs` |
| BR-A5 (atendente só do setor; perde acesso após encaminhar) | `js/pages/tickets-agent.js` `renderAgentTicket`; `ticket-service.js` `listarDoSetor` / `encaminhar` | `tests/integration.js`; probe CDP PROBE2 (setor Financeiro→Secretaria, origem perde o chamado) | Testado automaticamente + Testado manualmente (CDP) |
| BR-A6 (admin vê tudo) | `js/pages/admin.js` `renderAllTicketsAdmin` | `smoke-app.mjs` ("Todos os chamados") | Testado automaticamente — `smoke-app.mjs` |
| BR-B1 (conversa de 1 aluno, texto livre) | `js/services/conversation-service.js` `novaConversa` | `run-headless.mjs` (tests conversation) | Testado automaticamente — `run-headless.mjs` |
| BR-B2 (só artigos PUBLISHED alimentam; nunca inventa) | `js/services/knowledge-service.js` `getPublishedArticles` / `matchArticle` | `e2e.mjs` ("Artigo DRAFT não alimenta o assistente"); `run-headless.mjs`; probe PROBE7 | Testado automaticamente — `e2e.mjs` |
| BR-B3 (Sim/Não exatos) | `js/pages/assistant.js` `mostrarSimNao` | `e2e.mjs` ("Assistente responde com artigo e pergunta Sim/Não") | Testado automaticamente — `e2e.mjs` |
| BR-B4 (sem correspondência não mostra artigo) | `js/pages/assistant.js` `enviar` (ramo else); `matchArticle` limiar `score<2` | `e2e.mjs` ("Assistente sem correspondência não inventa resposta"); probe PROBE7 | Testado automaticamente — `e2e.mjs` |
| BR-B5 (Sim → SELF_RESOLVED, sem ticket) | `js/pages/assistant.js` `responderFeedback(true)` | `run-headless.mjs` (tests conversation) | Testado automaticamente — `run-headless.mjs` |
| BR-B6 (Não → oferece abrir solicitação) | `js/pages/assistant.js` `responderFeedback(false)` | `e2e.mjs` ("Responder 'Não' oferece abrir solicitação") | Testado automaticamente — `e2e.mjs` |
| BR-B8 (snapshot do artigo referenciado) | `js/services/conversation-service.js` `registrarResposta` | `e2e.mjs` ("Assistente mostra referência do artigo"); `run-headless.mjs` | Testado automaticamente — `e2e.mjs` |
| BR-B9 (≤1 chamado por conversa) | `js/pages/assistant.js` `escalar` (define ESCALATED e reinicia) | Leitura de código | Verificado por inspeção |
| BR-C (CRUD de artigos; só admin; editar publicado → nova versão) | `js/services/knowledge-service.js` `criarArtigo`/`editarArtigo`/`definirStatusArtigo`; rota `#/admin/artigos` roles=[admin] | `run-headless.mjs` (tests CRUD); `smoke-app.mjs` ("Gestão da base de conhecimento") | Testado automaticamente — `run-headless.mjs`, `smoke-app.mjs` |
| BR-D1 (confirmação explícita ao abrir) | `js/pages/tickets-student.js` `abrirConfirmacao` | `smoke-app.mjs` ("Novo atendimento") + leitura de código | Testado automaticamente + Verificado por inspeção |
| BR-D2 (contexto sem redigitar) | `js/services/ticket-service.js` `criarDeConversa` (transcrição/artigos) | `tests/integration.js` | Testado automaticamente — `run-headless.mjs` |
| BR-D3 (título = 1ª mensagem truncada) | `js/services/ticket-service.js` `truncar` | Leitura de código | Verificado por inspeção |
| BR-D4 (categoria = último artigo / "Não classificado") | `ticket-service.js` `criarDeConversa`; probe PROBE4 | `run-headless.mjs`; probe PROBE4 (sem artigo → "Não classificado") | Testado automaticamente + Testado manualmente (CDP) |
| BR-D5 (protocolo `ONE-<n>` sequencial e único) | `js/services/ticket-service.js` `proximoProtocolo` | `e2e.mjs` (ONE-1054); `run-headless.mjs`; probe PROBE5 (ONE-1054, ONE-1055) | Testado automaticamente — `e2e.mjs` |
| BR-D6 (aluno vê protocolo e lista) | `js/pages/assistant.js` `escalar`; `renderMyTickets` | `e2e.mjs` ("Chamado aparece em 'Minhas solicitações'") | Testado automaticamente — `e2e.mjs` |
| BR-E (sempre 1 setor; regra/triagem) | `ticket-service.js` `criarDeConversa`/`encaminhar`; `js/services/routing-service.js` `resolverSetor`; `js/data/mock-data.js` `getSetorTriagem` | `run-headless.mjs` (tests routing); `smoke-app.mjs` (setores, triagem marcada); `e2e.mjs` (setor=Financeiro) | Testado automaticamente — `run-headless.mjs`, `e2e.mjs` |
| BR-E5 (reclassificar não muda setor) | `js/services/ticket-service.js` `reclassificar` | Probe PROBE6 (setor inalterado) | Testado manualmente (CDP) |
| BR-F1 (transição fora da tabela é rejeitada) | `js/services/ticket-service.js` `transicaoPermitida` / `TRANSICOES` | `run-headless.mjs` (OPEN→RESOLVED e CLOSED→OPEN retornam false) | Testado automaticamente — `run-headless.mjs` |
| BR-F2 (CLOSED é terminal; sem mensagens) | `js/services/ticket-service.js` guardas de CLOSED em `responder`, `adicionarNota`, `responderAluno`, `encaminhar` e **`reclassificar` (corrigido — D1)** | `run-headless.mjs`; `tests/reclassificar-closed.mjs` (4/4); probe PROBE3 | Testado automaticamente — `run-headless.mjs`, `reclassificar-closed.mjs` |
| BR-F (F2–F9: assumir/responder/encaminhar/resolver/confirmar/rejeitar/cancelar) | `js/services/ticket-service.js` ações correspondentes | `run-headless.mjs`; `tests/integration.js`; `e2e.mjs` (IN_PROGRESS→RESOLVED→CLOSED) | Testado automaticamente — `run-headless.mjs`, `e2e.mjs` |
| BR-G2 (nota interna oculta ao aluno) | `js/services/ticket-service.js` `mensagensVisiveis`; `js/pages/tickets-student.js` `cardHistorico(..,"aluno")` | `run-headless.mjs`; `e2e.mjs` (modelo=true, ocultaUI=true na renderização real) | Testado automaticamente — `e2e.mjs` |
| BR-G3 (mensagens imutáveis) | `ticket-service.js` apenas `push` em `mensagens`; sem edição/remoção | Leitura de código | Verificado por inspeção |
| BR-G4 (encaminhar exige setor diferente + motivo) | `js/services/ticket-service.js` `encaminhar` | `run-headless.mjs`; `e2e.mjs` ("Encaminhamento sem motivo ou mesmo setor é rejeitado") | Testado automaticamente — `e2e.mjs` |
| BR-G6 (e-mail) | **Não implementado** (apenas sinalizado; sem backend) | — | Não verificado — limitação intencional e documentada (sem backend de envio) |
| BR-H (histórico append-only e visível) | `ticket-service.js` `aplicarTransicao`/`mensagens.push`; `cardHistorico` | `tests/integration.js`; `e2e.mjs` ("Histórico visível no detalhe do aluno") | Testado automaticamente — `e2e.mjs` |
| BR-I (indicadores calculados) | `js/services/metrics-service.js`; `js/pages/admin.js` `renderIndicators` | Probe PROBE1 (cálculo à mão conferido para as métricas implementadas); `smoke-app.mjs` (gráficos SVG) | Testado manualmente (CDP, cálculo à mão) + Verificado por inspeção — **parcial, ver Pendência P1** |

### 1.2 Critérios de aceitação AC1..AC9

| AC | Descrição | Evidência | Nível / Situação |
|----|-----------|-----------|------------------|
| AC1 | Autoatendimento (Sim → SELF_RESOLVED, sem ticket) | `run-headless.mjs` (tests conversation); fluxo `assistant.js` | Testado automaticamente — OK |
| AC2 | Escalonamento mantém contexto (ticket OPEN, categoria/setor/transcrição) | `tests/integration.js`; `e2e.mjs` (ONE-1054, Financeiro) | Testado automaticamente — OK |
| AC3 | Sem correspondência → ticket "Não classificado" na triagem | Probe PROBE4 (categoria "Não classificado", setor=Secretaria) | Testado manualmente (CDP) — OK |
| AC4 | Roteamento por curso → coordenação; triagem se não houver | `run-headless.mjs` (tests routing) | Testado automaticamente — OK |
| AC5 | Ciclo F1–F9 válido; combinações ilegais rejeitadas | `run-headless.mjs`; probe PROBE3; `tests/reclassificar-closed.mjs` | Testado automaticamente — OK (a brecha de `reclassificar` em CLOSED foi corrigida — ver D1) |
| AC6 | Encaminhar exige motivo; move/limpa assignee; origem perde acesso | `run-headless.mjs` (BR-G4); probe PROBE2 | Testado automaticamente + Testado manualmente (CDP) — OK |
| AC7 | Aluno não vê ticket alheio nem nota interna; atendente não vê fora do setor | `tests/integration.js`; `e2e.mjs`; leitura de código | Testado automaticamente + Testado manualmente (CDP) — OK |
| AC8 | Histórico imutável; edição de artigo não muda snapshot | `run-headless.mjs` (snapshot em conversation) | Testado automaticamente — OK |
| AC9 | Toda métrica da seção I = valor calculado à mão | Probe PROBE1 (as métricas implementadas conferem) | **PARCIAL** — subconjunto implementado e definições simplificadas (ver Pendência P1) |

---

## 2. Testes executados

Todos os comandos foram executados de dentro de `prototipo-visual`, com o servidor estático ativo em `http://localhost:4178` (HTTP 200). As contagens de **baseline** vêm de `baseline.md` (reexecução independente da auditoria) e as de **regressão final** foram capturadas nesta etapa.

| # | Suíte | Comando | Baseline (auditoria) | Regressão final (esta etapa) | Exit | GREEN? |
|---|-------|---------|----------------------|------------------------------|------|--------|
| 1 | Headless (unit + integração) | `node tests/run-headless.mjs` | 67 ok, 0 falhas | **67 ok, 0 falhas** | 0 | ✅ |
| 2 | Smoke de navegação | `node tests/smoke-app.mjs` | 20/20 cenários ok | **20/20 cenários ok** | 0 | ✅ |
| 3 | Console (erros JS) | `node tests/console-check.mjs` | 0 erros JS (8 rotas) | **0 erros JS (8 rotas)** | 0 | ✅ |
| 4 | A11y estrutural | `node tests/a11y-check.mjs` | 0 avisos (7 telas) | **0 avisos estruturais (7 telas)** | 0 | ✅ |
| 5 | E2E (CDP, navegador real) | `node tests/e2e.mjs` | 20/20 verificações reais | **20/20 verificações reais ok** | 0 | ✅ |
| + | Regressão focada D1 (BR-F2) | `node tests/reclassificar-closed.mjs` | 4/4 ok | **4/4 ok** | 0 | ✅ |

**Resultado da regressão final: as cinco suítes originais estão GREEN**, com contagens idênticas ao baseline, mais o probe D1 em 4/4. Nenhuma regressão foi introduzida pela correção.

### Observação operacional sobre o E2E (ambiente, não é defeito)

A suíte `e2e.mjs` lança uma instância **isolada** de Chrome (`--headless=new`, `--user-data-dir` próprio, porta de depuração dedicada). O baseline registrou que execuções **sobrepostas** da suíte deixam processos Chrome órfãos que travam a sessão CDP de forma intermitente. Nesta etapa o E2E foi executado **em isolamento** (uma única instância) e completou normalmente 20/20. É uma fragilidade de execução de ambiente, não de código da aplicação.

---

## 3. Evidências por ponto de auditoria (1–20)

| # | Ponto de auditoria | Como foi verificado | Nível |
|---|--------------------|---------------------|-------|
| 1 | Integridade dos arquivos | `index.html` referencia CSS/JS existentes; módulos ES carregam sem erro em 8 rotas (`console-check.mjs`) + 15 rotas extras (probe) | Testado automaticamente + Verificado por inspeção |
| 2 | Reexecução de todos os testes | Cinco suítes reexecutadas (ver seção 2) | Testado automaticamente |
| 3 | Regras BR-A..BR-I | Tabela da seção 1.1; implementação localizada e, na maioria, testada | Testado automaticamente + Verificado por inspeção |
| 4 | Integração entre módulos | `tests/integration.js` exercita conversation→ticket→routing→metrics (10 passos + negativos) | Testado automaticamente |
| 5 | Três perfis | `login.js` oferece aluno/atendente/admin; `smoke-app.mjs` cobre os três painéis; `e2e.mjs` faz login real do aluno por clique | Testado automaticamente + Testado manualmente (CDP) |
| 6 | Permissões simuladas | `accessGuard` (público/redirect/403); `smoke-app.mjs` e `e2e.mjs` validam 403 e bloqueio; aluno/atendente restritos por `renderTicketDetail`/`renderAgentTicket` | Testado automaticamente + Testado manualmente (CDP) |
| 7 | Formulários, botões e menus | `e2e.mjs` dirige cliques reais: envio do assistente, Sim/Não, abrir solicitação, assumir, resolver (modal), confirmar, troca de tema, navegação | Testado automaticamente + Testado manualmente (CDP) |
| 8 | Persistência após recarregamento | `e2e.mjs` recarrega a página e confirma chamado em "Minhas solicitações"; tema persiste após reload (`localStorage`) | Testado automaticamente + Testado manualmente (CDP) |
| 9 | Geração de protocolos `ONE-<n>` | `proximoProtocolo` incrementa `ticket-seq`; probe PROBE5 (ONE-1054, ONE-1055, sequenciais e únicos); `e2e.mjs` (ONE-1054) | Testado automaticamente + Testado manualmente (CDP) |
| 10 | Transições de estado F1–F9 | `TRANSICOES` espelha a tabela F; transições inválidas rejeitadas; **1 defeito D1 encontrado e corrigido** (BR-F2 em `reclassificar`) | Testado automaticamente + Verificado por inspeção |
| 11 | Proteção visual das notas internas | `mensagensVisiveis` filtra `tipo==="interna"` para aluno; `e2e.mjs` confirma na renderização real (modelo=true, ocultaUI=true) | Testado automaticamente + Testado manualmente (CDP) |
| 12 | Assistente com e sem correspondência | Com: KB-001 + Sim/Não (`e2e.mjs`); Sem: "Não encontrei um artigo publicado", sem artigo (`e2e.mjs` BR-B4); probe PROBE7 (limiar `score<2`) | Testado automaticamente + Testado manualmente (CDP) |
| 13 | DRAFT/ARCHIVED não alimentam o assistente | `getPublishedArticles` filtra `status==="PUBLISHED"`; probe PROBE7 (KB-005 DRAFT → null; KB-006 ARCHIVED nunca retornado); `e2e.mjs` (DRAFT não alimenta) | Testado automaticamente + Testado manualmente (CDP) |
| 14 | Indicadores calculados | Probe PROBE1: contagem por situação, top categorias, por setor, totais — todos conferidos à mão contra `metrics-service` | Testado manualmente (CDP, cálculo à mão) + Verificado por inspeção — **parcial (P1)** |
| 15 | Tema claro e escuro | `theme-switcher.js` (`data-bs-theme`, persistência, override `?theme=`, anti-flash); `e2e.mjs` alterna por clique e persiste após reload | Testado automaticamente + Testado manualmente (CDP) |
| 16 | Responsividade | `css/responsive.css` presente; shell com sidebar desktop + offcanvas mobile; capturas mobile existentes inspecionadas | Verificado por inspeção + Testado manualmente parcial — **ver P2** |
| 17 | Mensagens de erro do console | `console-check.mjs` (8 rotas) = 0 erros; probe adicional (15 rotas extras) = 0 erros | Testado automaticamente + Testado manualmente (CDP) |
| 18 | Acessibilidade | `a11y-check.mjs` (regras estruturais: lang, alt, rótulos, nomes de botão, landmark main, h1) = 0 avisos em 7 telas; HTML semântico, skip link, `aria-live`, `aria-current` | Testado automaticamente (estrutural) — **WCAG AA completa: Não verificado (P3)** |
| 19 | Funcionalidades incompletas / stubs | Confirmado no código que as limitações declaradas batem com a implementação (CRUD de cadastros somente leitura; CRUD de artigos completo; e-mail e janelas Q6/Q7 apenas sinalizados) | Verificado por inspeção |
| 20 | Implementação vs. requisitos originais (AC1–AC9) | Tabela da seção 1.2; AC1–AC8 cobertos; AC9 parcial | Testado automaticamente + Verificado por inspeção |

---

## 4. Erros encontrados

Fonte: `.agents/tasks/homologacao-one/defects.json` (`anyProvenDefects: true`, 1 defeito comprovado).

### D1 — BR-F2 violado em `reclassificar` (severidade: minor)

- **Ponto de auditoria:** 10 (transições de estado) · **Regra:** BR-F2 ("CLOSED é terminal; nenhuma mensagem pode ser adicionada a um chamado fechado").
- **Arquivo:** `js/services/ticket-service.js` · **Função:** `reclassificar(protocolo, autor, novaCategoria)`.
- **Como foi provado:** bug de runtime reproduzido por probe CDP sobre o serviço real (PROBE3). Em um chamado `CLOSED` (fechado via `cancelar`), **todas** as ações mutadoras bloquearam corretamente (`responder`, `adicionarNota`, `responderAluno`, `encaminhar`, `resolver`, `confirmarResolucao`, `rejeitarResolucao`, `cancelar`), **exceto `reclassificar`**, que alterou a categoria para "Nova" e acrescentou uma mensagem de evento ao histórico (`mensagens` 2 → 3) — contradição direta de BR-F2.
- **Por que minor:** `reclassificar` **não está ligado a nenhum botão/menu da UI atual** (busca por "reclassific" em `js/` só encontra a definição no serviço), portanto o caminho **não é alcançável pelo usuário final**. Ainda assim, o serviço violava a regra e era alcançável por código.

Nenhum outro defeito foi **comprovado** por teste falho, bug de runtime reproduzido ou contradição clara de especificação.

---

## 5. Correções aplicadas

Fonte: `.agents/tasks/homologacao-one/fix-notes.md` e `fix-review.md` (veredito: APPROVED). Escopo respeitado: alterações **somente** dentro de `prototipo-visual/`; sem commit/push/deploy; sem instalar dependências; sem alterar documentação original.

### Correção de D1

- **Arquivo alterado:** `js/services/ticket-service.js` (1 linha).
- **O que mudou:** adicionada, em `reclassificar`, a mesma guarda de estado terminal já usada nas demais ações mutadoras, imediatamente após localizar o chamado e antes de qualquer mutação:

  ```js
  if (t.situacao === "CLOSED") throw new Error("Chamado fechado não aceita alterações (BR-F2)");
  ```

- **Por quê:** fecha a única brecha de BR-F2 no modelo de serviço, tornando o comportamento consistente com `responder`, `adicionarNota`, `responderAluno` e `encaminhar`. **Preserva o comportamento da UI:** nenhuma ação alcançável pela interface muda (a UI não expõe `reclassificar`); apenas um chamador em nível de código passa a receber erro em vez de uma mutação silenciosa.
- **Confirmação nesta etapa:** a guarda está presente no código (`ticket-service.js`, linha 346) e o probe de regressão `tests/reclassificar-closed.mjs` passa 4/4 (pré-condição CLOSED, erro lançado, categoria inalterada, histórico inalterado).

- **Helper adicionado (útil, mantido):** `tests/reclassificar-closed.mjs` — probe de regressão focado em D1 (Node stdlib apenas, não requer servidor). Nenhum arquivo existente foi removido; nenhum teste foi enfraquecido.

---

## 6. Testes de regressão (após a correção)

Com a correção de D1 aplicada, a regressão final confirma que **as cinco suítes originais permanecem GREEN** e o probe D1 passa:

| # | Suíte | Comando | Resultado | Exit |
|---|-------|---------|-----------|------|
| 1 | Headless | `node tests/run-headless.mjs` | **67 ok, 0 falhas** | 0 |
| 2 | Smoke | `node tests/smoke-app.mjs` | **20/20 cenários ok** | 0 |
| 3 | Console | `node tests/console-check.mjs` | **0 erros JS** (8 rotas) | 0 |
| 4 | A11y | `node tests/a11y-check.mjs` | **0 avisos estruturais** (7 telas) | 0 |
| 5 | E2E (CDP) | `node tests/e2e.mjs` | **20/20 verificações reais ok** | 0 |
| + | Regressão D1 | `node tests/reclassificar-closed.mjs` | **4/4 ok** | 0 |

**Nenhuma regressão.** A correção é de uma única linha, idêntica a um padrão já presente, e não afeta nenhum fluxo alcançável pela interface.

---

## 7. Limitações (intencionais e documentadas — não são defeitos)

Confirmadas contra o código nesta homologação (ponto 19 e tabela BR):

- **Sem backend real:** persistência somente em `localStorage` (namespace `one.proto.`). Limpar o navegador reinicia o protótipo.
- **Sem IA:** o assistente usa correspondência determinística por palavras-chave (`matchArticle`, limiar `score<2`), não um modelo de linguagem.
- **Sem autenticação/segurança real:** as permissões são de cliente (`accessGuard`) e **não constituem segurança**; servem apenas à simulação de perfis.
- **Gestão administrativa de cadastros é somente leitura:** `admin.js` (`renderUsers`/`renderCourses`/`renderSectors`/`renderCategories`/`renderRoutingRules`) apenas monta tabelas; não há criar/editar/excluir. O **CRUD completo existe apenas para artigos** (`knowledge-service`).
- **E-mail (BR-G6):** não implementado; apenas sinalizado (depende de backend).
- **Janelas automáticas de inatividade/confirmação (Q6/Q7):** não há timers; `AUTO_CLOSED`/`ABANDONED` não ocorrem por tempo (dependem de backend).
- **Dados simulados:** sementes em `js/data/mock-data.js`; o protocolo reinicia em ONE-1053 ao "Restaurar dados demonstrativos" (reinicialização total do store, não reuso dentro de uma sequência viva).
- **Acessibilidade — teste manual com tecnologia assistiva NÃO realizado.** A verificação automatizada cobre apenas regras **estruturais**. **Não se declara conformidade WCAG 2.2 AA**, pois ela exige teste manual com leitor de tela, navegação por teclado ponta a ponta e contraste medido — não executados nesta homologação.

---

## 8. Pendências

- **P1 — Cobertura/definição de indicadores (BR-I / AC9).** `metrics-service` implementa um **subconjunto** da seção I e com **definições simplificadas** (ex.: "Roteamento correto" calculado sobre o total, não sobre resolvidos; ausentes: taxas de autoatendimento/escalonamento/abandono/no-answer, tempo de 1ª resposta, tempo de resolução, North Star). As métricas **implementadas** conferem com o cálculo à mão (PROBE1), mas AC9 ("toda métrica da seção I = valor à mão") **não é integralmente atendível** com o conjunto atual. É uma simplificação declarada no README e no cabeçalho de `metrics-service.js`, não um bug oculto. **Decisão de produto** (ampliar ou aceitar como limitação) fora do escopo de correção de defeitos.
- **P2 — Verificação responsiva multi-viewport.** Não reexecutada nesta etapa; capturas mobile existentes (`tests/screenshots/*-mobile-*.png`) e o layout foram inspecionados. Recomenda-se um passe visual em ≥2 viewports antes da apresentação.
- **P3 — WCAG 2.2 AA.** Classificada como **Não verificado**: só comprovável com teste manual de tecnologia assistiva, não executado.
- **BR-G6 (e-mail):** permanece **Não verificado / não implementado** (limitação de ausência de backend).

Nenhuma pendência é bloqueante para uma demonstração acadêmica de protótipo frontend; todas são limitações conhecidas e declaradas.

---

## 9. Avaliação final de prontidão

As cinco suítes de teste estão **GREEN por reexecução independente nesta homologação** — Headless 67/0, Smoke 20/20, Console 0 erros, A11y estrutural 0 avisos, E2E 20/20 — mais o probe de regressão D1 em 4/4. A jornada principal (autoatendimento → escalonamento → ciclo de vida do chamado F1–F9 → indicadores) e as regras BR-A..BR-I estão implementadas e, em sua grande maioria, cobertas por **teste automatizado e/ou interação real no navegador (CDP)**.

A auditoria encontrou **um único defeito comprovado (D1, minor, não alcançável pela UI)**, que foi **corrigido com uma alteração mínima e segura** e verificado por regressão sem introduzir falhas.

As limitações remanescentes são **intencionais e próprias de um protótipo frontend com dados simulados** (sem backend, sem IA, sem segurança real, CRUD de cadastros somente leitura, e-mail e janelas automáticas apenas sinalizados), e as pendências abertas (P1 indicadores parciais, P2 responsividade multi-viewport, P3 WCAG AA) estão **declaradas honestamente** e não são bloqueantes.

**Veredito:** dentro dos limites de um **protótipo frontend com dados simulados**, o **One está adequado para demonstração e apresentação acadêmica**. Não se declara, e este relatório não deve ser lido como, prontidão para produção, conformidade WCAG 2.2 AA completa ou cobertura integral da seção I de indicadores — esses itens exigem trabalho adicional explicitamente listado em Limitações e Pendências.

---

### Anexo — Procedência das evidências

- Baseline independente das suítes: `.agents/tasks/homologacao-one/baseline.md`.
- Achados detalhados por ponto (1–20), tabelas BR e AC, probes CDP (PROBE1–PROBE7): `.agents/tasks/homologacao-one/audit-findings.md`.
- Defeito comprovado D1: `.agents/tasks/homologacao-one/defects.json`.
- Correção aplicada e sua verificação: `.agents/tasks/homologacao-one/fix-notes.md`.
- Revisão da correção (veredito APPROVED): `.agents/tasks/homologacao-one/fix-review.md` e `review.json`.
- Regressão final (contagens desta etapa): registradas na seção 2 e 6 deste relatório.
