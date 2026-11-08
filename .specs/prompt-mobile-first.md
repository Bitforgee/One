# One mobile-first: o app instalado no celular como experiência principal

Prompt e plano-mestre para o agente de planejamento (Opus 5.5). Escrito em 08/11/2026 a partir de três fontes:

1. **Auditoria nas telas reais**: `main` `675d6df`, Playwright em 390×844, 360×780 e paisagem 844×390, com toque emulado, nos papéis aluno, atendente e admin. São 69 screenshots e as medidas em JSON, no scratchpad da sessão (`mobile-audit/`).
2. **Pesquisa das diretrizes oficiais**: Android/Material, Apple HIG, web.dev, WebKit, MDN, W3C WCAG 2.2, Zendesk, Freshdesk, Intercom e React Flow (seção 4, com as URLs).
3. **Leitura do código**: `web/index.html`, `web/vite.config.ts`, `web/src/sw.ts`, `Autenticado.tsx`, `ManifestoInstituicao.cs`, `web/e2e/celular.spec.ts` e o tamanho do build.

Complementa `.specs/prompt-evolucao-one.md` (fluxos, permissões e personalização). Aqui o assunto é **como o One se comporta instalado no celular**. Toda feature daquele plano passa a ter critérios de celular (seção 5, regra 1).

> **Como usar**: copie a seção 9 ("O prompt") para um agente novo no Opus 5.5. As seções 1 a 8 são o contexto. Cada épico M0 a M8 vira uma feature em `.specs/features/<slug>/` com `plan.md` aprovado por você antes do código (`AGENTS.md`). Como tem tela, use o profile `ui`.

---

## 1. Por que mobile-first

- O aluno usa o One pelo celular, instalado como app (PWA). A tela principal do produto é a de 360 a 430 px, não a do desktop.
- No Brasil, em out/2026, o Android tem 73,76% do mercado móvel e o iOS 26,23% (StatCounter). Por isso o **Android de entrada** é o alvo de desempenho e o **iPhone** é o alvo de compatibilidade (push só com o app instalado, teclado, safe area).
- O atendente e o líder de sala também respondem pelo celular, entre uma aula e outra. Só o admin trabalha de verdade no desktop, mas precisa conseguir resolver o urgente pelo celular.

## 2. O que já está bom (não desfazer)

| O que | Evidência |
| --- | --- |
| Sem rolagem horizontal em nenhuma tela, em 390, 360 e 844 px | `scrollWidth == innerWidth` medido em todas as telas |
| Nenhum campo com menos de 16 px, então o iOS não dá zoom ao focar; o CPF tem `inputMode="numeric"`; as senhas têm `autoComplete` | auditoria |
| Botões de 44 px ou mais no celular | `web/e2e/celular.spec.ts` ("alvos de toque de 44 px abaixo de 768") |
| O aluno já tem **barra de abas inferior** (Assistente, Solicitações, Conta) de 56 px | auditoria, `Autenticado.tsx` |
| No chamado, a equipe tem uma barra fixa com a ação principal (Assumir, depois Responder) e o "Mais" abre um Sheet inferior que cabe na tela | auditoria, `ChamadoDetalhe.tsx` |
| Diálogos e Sheets nunca passam do tamanho da tela; listas viram linhas ou cartões abaixo de 768 px; carregamento com esqueleto | auditoria |
| O editor de fluxos mostra só a Lista abaixo de 768 px | auditoria, AC 79 de `fluxos-atendimento` |
| Nada da API fica no cache do service worker (LGPD) | `web/src/sw.ts` |

## 3. Problemas encontrados (com medida)

Os screenshots citados estão em `mobile-audit/shots/`, no scratchpad da sessão de 08/11. A severidade é a da auditoria.

| # | Tela | Problema | Medida | Sev. |
| --- | --- | --- | --- | --- |
| P1 | Chamado (equipe), formulário Responder | As caixas "Nota interna" e "Aguardando aluno" só recebem o toque na caixa de 16×16 e no rótulo de 14 px de altura. **Se o toque errar "Nota interna", a nota sai pública para o aluno** | input 16×16, label 81×14 (`Marca.tsx`); `t05-responder-foco.png` | **alta** |
| P2 | App aberto sem rede | Abre pelo cache, mas mostra "Instituição não encontrada." sem menu nem aviso de rede. A mensagem é falsa e não há saída. O código não usa `navigator.onLine` | `o01-offline-assistente.png`, `o02-offline-solicitacoes.png` | **alta** |
| P3 | Todas | O `viewport-fit=cover` não existe no meta viewport, então as 3 regras com `env(safe-area-inset-bottom)` valem **0 no iPhone** e não fazem nada. Também não há inset do topo | `web/index.html:5`; `Autenticado.tsx:267/274`, `ChamadoDetalhe.tsx:263/276`, `Editor.tsx:52` | **alta** |
| P4 | Usuários, Cadastros | O mesmo padrão de caixa de 16×16 nos papéis, nos setores, em Triagem e em Ativo | `d-usuarios-novo-form.png`, `c-setor-editar.png` | média |
| P5 | Usuários, menu ⋮ | Os itens Editar e Desativar têm 32 px de altura e ficam colados, com o destrutivo logo abaixo | menuitem 118×32; `d-usuarios-menu-acoes.png` | média |
| P6 | Chamado (aluno) resolvido | "Confirmar resolução" fica abaixo da dobra (y=909, com área útil de 787), depois do formulário "Responder (reabre a solicitação)". "Rejeitar" está em y=1063 | `a30-chamado-resolvido.png` | média |
| P7 | Chamado (equipe) com teclado aberto | A barra fixa de 61 px cobre o campo: sobram cerca de 49 px de texto à vista, e o "Enviar" do formulário fica atrás da barra | `t05b-responder-teclado.png` (390×500 como aproximação do teclado) | média |
| P8 | Assistente com teclado aberto | Abas (57), composer (130) e cabeçalho (49) deixam 264 px para a conversa. Não há `interactive-widget` nem tratamento de `visualViewport` | `a07-assistente-teclado.png` | média |
| P9 | Celular deitado (844×390) | O layout vira desktop: barra lateral de 256 px (30% da largura) e as abas somem. Sobram cerca de 233 px de altura para a conversa | `a40-assistente-paisagem.png` | média |
| P10 | Editor de fluxos em celular deitado | Com 844 px ou mais, num aparelho de toque, o canvas aparece com alvos minúsculos | "+" 17×17, zoom 26×26, abas 50×29; `c-fluxo-canvas-paisagem.png` | média |
| P11 | Ícone instalado | Sem nome curto cadastrado, o `short_name` vira as iniciais ("D", "CG"). É esse o rótulo do ícone na tela inicial | `ManifestoInstituicao.Iniciais` | média |
| P12 | Manifest | Não tem `id`, `description`, `lang`, `shortcuts`, `screenshots` nem ícone `maskable`. O `apple-touch-icon` é o genérico de 192 px. O escopo do SW é `/` e o do manifest é `/demo/` | auditoria | média |
| P13 | Instalação | Não há convite nem tela de instalação (nenhum `beforeinstallprompt`). O sino de avisos some sem explicação quando falta suporte a push, e **no iPhone o push só funciona com o app instalado**, sem nenhuma orientação | auditoria, WebKit | média |
| P14 | Desempenho | O JS inicial é um pacote único de **432 KB gzip** (1,4 MB sem compressão), com todas as telas de admin dentro. Só o canvas é carregado à parte (64 KB). Meta recomendada para Android de entrada: até ~300 KB | `One.Api/wwwroot/assets/index-*.js` medido em 08/11 | média |
| P15 | Atualização | `registerType: 'autoUpdate'` com `skipWaiting` + `clientsClaim`: a versão nova assume sozinha, e isso pode acontecer no meio de uma conversa (a confirmar no aparelho) | `web/vite.config.ts:16`, `sw.ts` | média |
| P16 | Fila | Não tem paginação: 30 chamados viram 2.352 px de rolagem | `t01-fila.png` | baixa |
| P17 | Casca da equipe | O menu (☰) e o "Novo" ficam no topo, fora do alcance do polegar. O chamado do aluno não tem "voltar" no cabeçalho | `t01-fila.png` | baixa |
| P18 | Definir senha (sucesso) | O único próximo passo é um link de texto de 20 px de altura | `a04-senha-criada.png` | baixa |

Ficou sem verificar: o teclado real de iOS e Android (o Chromium não emula), a interface de push, o tempo real pelo servidor de desenvolvimento, e Encaminhar/Subir em detalhe. O container estava desatualizado em relação à `main`; a auditoria usou o Vite de desenvolvimento da `main` contra a API do container, com 3 respostas simuladas.

## 4. Diretrizes de mercado e de plataforma (pesquisa de 08/11/2026)

| Padrão | Fonte | Para o One |
| --- | --- | --- |
| Classes de largura: compact < 600, medium 600 a 840, expanded 840 a 1200. Telefone deitado tem altura compact (< 480) | Android *window size classes* | Pontos de quebra pela **largura em 600 e 840**, e pela **altura em 480** para o celular deitado. Hoje é 768/1024 pela largura só, o que causa o P9 |
| Barra inferior em compact (3 a 5 destinos), rail em medium/expanded, drawer opcional no expanded | Android *adaptive navigation*, *navigation bar* | Barra inferior também para a equipe abaixo de 600; rail (ícones, ~80 px) entre 600 e 1200 e no celular deitado; barra lateral acima disso |
| Tab bar só para navegar, nunca para ações; não esconder abas; rótulos de uma palavra; evitar a aba "Mais" | Apple HIG *Tab bars* | Ações ("Novo") ficam fora da barra |
| FAB: uma ação primária por tela, embaixo à direita | Android *FAB* | Ação primária ao alcance do polegar (P17) |
| Alvos de 48 dp no Android, 44 pt no iOS; WCAG 2.5.8 pede 24 px no mínimo | Android a11y, HIG, W3C | Manter 44 px no mínimo em **todo** o controle, inclusive caixas e itens de menu (P1, P4, P5), e 48 px na barra e no composer |
| Sheets para tarefas curtas, com alça e arrastar para fechar; fluxo longo em tela cheia | HIG *Sheets*, Android *bottom sheets* | Respostas prontas, ações e filtros em Sheet inferior; formulários longos em tela cheia |
| Gesto complementa o botão; não brigar com o voltar do sistema na borda | HIG *Gestures*; WCAG 2.5.7 | Swipe só com equivalente no menu; nenhum swipe na borda |
| `viewport-fit=cover` + `env(safe-area-inset-*)`; `svh` para o que tem de caber, `dvh` para acompanhar a área visível | MDN `env`, web.dev *viewport units* | Corrige P3 |
| `interactive-widget=resizes-content` (Chrome 108+) encolhe o layout com o teclado; o Safari não suporta | Chrome blog *viewport resize* | Corrige P7 e P8 no Android; no iPhone, validar em aparelho real |
| Campo com 16 px ou mais não dá zoom no iOS; `enterkeyhint`, `inputmode`, `autocomplete="one-time-code"` | CSS-Tricks, MDN, web.dev | Já ok nos tamanhos; falta `enterkeyhint="send"` no composer |
| `capture="environment"` abre a câmera direto e tira o acesso à galeria | MDN *capture* | Dois botões: "Tirar foto" e "Anexar arquivo" |
| Manifest com `id` fixo, ícone `maskable`, `shortcuts`, `description`; de 3 a 5 screenshots `narrow` ativam a instalação mais rica no Chrome Android; `theme-color` claro e escuro por `<meta media>` | web.dev *add-manifest*, Chrome blog *richer install*, MDN | Corrige P11 e P12 |
| Não travar `orientation` (falha F97 do WCAG 1.3.4) | W3C | Nunca `orientation: portrait` |
| Convite de instalação só depois de `beforeinstallprompt`, nunca ao carregar, dispensável e lembrado, depois de uma conversão | web.dev *promote-install* | Convidar depois do primeiro protocolo ONE-n: "Instale para ser avisado quando responderem" |
| iOS: Web Push só com o app na Tela de Início (16.4+), pedido por gesto; no iOS 26, site adicionado abre como app | WebKit 13878, WebKit Safari 26 | Tela "Compartilhar → Adicionar à Tela de Início" antes de oferecer avisos no iPhone (P13) |
| Badging só no Safari iOS 16.4+ e no Chrome desktop, não no Chrome Android | caniuse | Contador no ícone só como melhoria, com detecção de recurso |
| Safari 17+ despeja dados de sites sem uso | WebKit *storage policy* | O servidor é a fonte da verdade; nada durável só no aparelho |
| `injectManifest`: o SW escuta `SKIP_WAITING`, e o app mostra "Atualizar" pelo `onNeedRefresh` | vite-pwa *prompt-for-update* | Toast persistente "Nova versão disponível", sem recarregar no meio da conversa (P15) |
| Estratégias Workbox: shell em precache; network-only para dado autenticado | Chrome *Workbox strategies* | Manter tudo da API fora do cache (LGPD) e criar o estado offline honesto (P2) |
| Background Sync não existe no Safari nem no Firefox, e o reenvio só roda com o app aberto | caniuse, Workbox | Fila de envio com "enviando / falhou, tocar para reenviar" e reenvio no evento `online`; nada prometido com o app fechado |
| Core Web Vitals no p75 mobile: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. Num Galaxy A51 com 7,2 Mbps, cerca de 365 KiB de JS carregam em 3 s | web.dev *vitals*, infrequently.org 2024 | Meta de ≤ 300 KB gzip na rota do aluno (P14) |
| App do agente: lista abre na última visão, macros ao lado do composer, "Take it", 4 abas (Zendesk); swipe para assumir ou fechar (Freshdesk); push agrupado em 10 s e "atribuídos a mim" ligado por padrão (Intercom) | Zendesk, Freshdesk e Intercom help | Fila em cartões com swipe "Assumir" e "Resolver" (com o mesmo no menu ⋯), respostas prontas em Sheet, push agrupado |
| Tabela no celular: cartões, primeira coluna fixa ou escolha de colunas | NN/g *mobile tables* | Já é assim abaixo de 768 px; manter abaixo de 600 |
| Formulário longo: uma pergunta por página | GOV.UK *question pages* | Atendimento direto e primeiro acesso em etapas curtas |
| Reflow a 320 px (WCAG 1.4.10); texto a 200% (HIG; Android 14 não linear); reduzir movimento | W3C, HIG, Android 14 | Testar a 320 px e com fonte a 200%; usar `motion-reduce:` |
| No toque, o React Flow conecta tocando em dois handles (`connectOnClick`), com handles maiores. O Zapier diz que o editor dele "não é otimizado para mobile" | reactflow *touch-device*, comunidade Zapier | Em aparelho de toque, o canvas fica só leitura (pinça e mover) e a edição vai pela Lista (P10) |

URLs abertas pela pesquisa: developer.android.com (*use-window-size-classes*, *build-adaptive-navigation*, *navigation-bar*, *fab*, *bottom-sheets*, *accessibility/apps*, *14/features#non-linear-font-scaling*); developer.apple.com HIG (*tab-bars*, *accessibility*, *sheets*, *layout*, *gestures*); web.dev (*add-manifest*, *promote-install*, *viewport-units*, *sms-otp-form*, *vitals*); developer.chrome.com (*richer-pwa-installation*, *viewport-resize-behavior*, *workbox-background-sync*, *caching-strategies-overview*); webkit.org (13878, 16993, 14403); developer.mozilla.org (*VirtualKeyboard_API*, *env*, *Badging_API*, *theme-color*, *overscroll-behavior*, *Navigator/share*, *enterkeyhint*, *capture*, *Background_Synchronization_API*); caniuse (*setappbadge*, *background-sync*); vite-pwa-org (*prompt-for-update*, *inject-manifest*); css-tricks (*16px-or-larger-text-prevents-ios-form-zoom*); infrequently.org (*performance-inequality-gap-2024*); support.zendesk.com (4408825697434); support.freshdesk.com (50000001136); intercom.com (*187*); nngroup.com (*mobile-tables*); design-system.service.gov.uk (*question-pages*); w3.org WCAG 2.2 (*target-size-minimum*, *dragging-movements*, *reflow*, *orientation*); reactflow.dev (*accessibility*, *touch-device*, *the-viewport*); community.zapier.com (13511); gs.statcounter.com (*os-market-share/mobile/brazil*).

Não verificado na pesquisa: as medidas exatas do Material 3 (as páginas do m3.material.io não carregaram), os apps de banco brasileiros, o editor do n8n no celular, o ajuste do teclado no iOS por `visualViewport` e o `minimal-ui` no iOS.

## 5. Princípios

1. **Celular primeiro em toda feature nova.** Todo `plan.md`, inclusive os épicos E1 a E8 de `prompt-evolucao-one.md`, tem na tabela Observable as linhas "celular 360×780", "celular deitado", "teclado aberto" e "toque", cada uma com critério EARS e check.
2. **Uma ação principal por tela, ao alcance do polegar.** Fica na metade de baixo; o topo é para título, voltar e contexto.
3. **Nenhum controle menor que 44 px de área tocável**, contando caixa, item de menu, link e handle. O check que existe hoje mede só `Button`; ele passa a medir todo elemento interativo.
4. **Honestidade sobre a rede**: sem conexão, a tela diz isso e oferece tentar de novo. Nunca mostra um erro falso.
5. **Nada sensível no aparelho**: dado autenticado nunca vai para o Cache Storage nem para o IndexedDB (LGPD; regra atual do `sw.ts`).
6. **Validar em aparelho real**: Android de entrada e iPhone, além do Playwright. O teclado e o push do iPhone não se provam no Chromium.
7. **Menor mudança que resolve**: reusar o primitivo `sidebar` do shadcn (`useIsMobile`), `Sheet`, Sonner, `vite-plugin-pwa` e o `sw.ts` atual. Nenhuma biblioteca nova sem justificativa no plano. Não adotar o Vaul, que a página do repositório marca como sem manutenção.

## 6. Épicos

### M0. Correções urgentes (pequenas; candidatas a entrar antes do congelamento de 17/11)

- **P1 e P4**: o rótulo inteiro de toda caixa de marcação vira a área tocável, com no mínimo 44 px de altura (`Marca.tsx`). Para "Nota interna", avaliar também uma troca visual clara (fundo e aviso "Só a equipe vê"), porque o erro aqui vaza informação.
- **P3**: `viewport-fit=cover` no meta viewport, mais o inset do topo onde houver cabeçalho fixo. Isso faz as 3 regras existentes funcionarem.
- **P2**: estado offline honesto ("Sem conexão. Tentar de novo") em vez de "Instituição não encontrada.", e o cabeçalho e as abas continuam visíveis.
- **P5**: itens de menu com 44 px e o destrutivo separado.
- **P6**: no chamado resolvido, "Confirmar" e "Rejeitar" vêm antes do formulário que reabre.
- **P18**: o próximo passo depois de criar a senha vira botão.
- Todas com teste que falha antes. É mais de 3 arquivos, então precisa de `plan.md` curto.

### M1. Casca adaptativa (navegação)

- Pontos de quebra pela largura em 600 e 840 px e pela altura em 480 px (P9). A decisão sobre os 768/1024 atuais e o AD-029/AD-037 vai para o Landing do plano.
- **Abaixo de 600**: barra inferior para todo papel. Aluno: Assistente, Solicitações, Conta (já existe). Atendente e líder: Fila, Meus, Indicadores, Conta. Admin: Fila (se for atendente), Indicadores, Administração (tela-índice com os cadastros), Conta.
- **De 600 a 1200 e no celular deitado**: rail de ícones com rótulo, no lugar da barra lateral de 256 px.
- **Acima de 1200**: a barra lateral atual.
- Botão "voltar" no cabeçalho de toda tela de detalhe (P17). Ação primária da tela embaixo, fora da barra de navegação.

### M2. Conversa e teclado

- `interactive-widget=resizes-content` no meta viewport. No iPhone, validar em aparelho e, se precisar, ajustar por `visualViewport` (P8).
- Composer compacto: `enterkeyhint="send"`, altura que cresce até um limite, anexos em linha.
- Dois botões: "Tirar foto" (`capture`) e "Anexar arquivo".
- Rolagem: `overscroll-behavior: contain` na lista; ao abrir e ao enviar, rola até o fim; se o aluno tiver rolado para cima, aparece "Novas mensagens ↓".
- Protocolo ONE-n em destaque quando a conversa vira chamado, com copiar e compartilhar (Web Share).
- Chamado da equipe: com o teclado aberto, a barra fixa some ou vira o próprio composer (P7).

### M3. Chamado e fila no celular

- Aluno: linha do tempo do chamado no topo (liga com o E7 do outro plano); decisão principal (confirmar/rejeitar) antes de tudo.
- Fila em cartões (protocolo, assunto, setor, tempo, prazo), com paginação ou carga incremental (P16), filtros em Sheet e a última visão lembrada.
- Swipe "Assumir" e "Resolver" no cartão, sempre com o mesmo no menu ⋯ (WCAG 2.5.7) e sem swipe na borda.
- Respostas prontas num Sheet ao lado do composer, no lugar do select.
- "Nota interna" com estado visual inconfundível (liga com P1).

### M4. App instalado (PWA)

- Manifest por instituição completo (P11, P12): `id` fixo por instituição, `description`, `lang: pt-BR`, ícone `maskable` (gerado do ícone da instituição com margem segura), `shortcuts` (Assistente, Minhas solicitações; Fila para a equipe, se o manifest puder variar por papel, o que é decisão do plano), de 3 a 5 screenshots `narrow`, `short_name` com fallback melhor que as iniciais (nome curto obrigatório na aparência, ou as 12 primeiras letras do nome), `theme-color` claro e escuro, `apple-touch-icon` da instituição. Alinhar o escopo do SW e o do manifest.
- Convite de instalação: Android, por `beforeinstallprompt` depois do primeiro protocolo, dispensável e lembrado, com um item fixo "Instalar o app" na Conta. iPhone: tela com o passo a passo "Compartilhar → Adicionar à Tela de Início".
- Avisos (push): no iPhone, o botão só aparece com o app instalado (`display-mode: standalone`) e, fora dele, explica por quê, em vez de sumir (P13). Avisos da equipe agrupados, com "atribuídos a mim" ligado por padrão.
- Contador no ícone (Badging) onde houver suporte.
- Atualização: trocar o `autoUpdate` por aviso "Nova versão disponível · Atualizar" (Sonner persistente) e `SKIP_WAITING` no `sw.ts` (P15).

### M5. Rede ruim e offline

- Indicador de conexão (evento `online`/`offline`) e telas que dizem "sem conexão" com "tentar de novo".
- Fila de envio das mensagens com estados visíveis ("enviando", "falhou, tocar para reenviar") e reenvio quando a conexão volta, com o app aberto. Nada é guardado depois de fechar o app (LGPD), salvo decisão contrária no plano.
- Esqueletos com altura fixa (CLS) e atualização otimista no envio de mensagem (TanStack Query).

### M6. Desempenho em Android de entrada

- Code splitting por rota com `React.lazy`: telas de admin, Indicadores, Aparência e o canvas fora do pacote do aluno (P14).
- Orçamento: ≤ 300 KB gzip de JS inicial na rota do aluno, com um check no build que falha acima disso.
- Medir LCP, INP e CLS com Lighthouse mobile (CPU 4x mais lenta, rede 4G lenta) nas telas Login, Assistente e Solicitações, mais uma medida num Android de entrada real.

### M7. Acessibilidade no celular

- Medir os 44 px em todo elemento interativo, não só em `Button` (estender `celular.spec.ts`).
- Reflow a 320 px, fonte do sistema a 200% (Android e iOS), TalkBack e VoiceOver no percurso principal, tema escuro e preto, `motion-reduce`.
- Celular deitado utilizável em todas as telas, sem travar a orientação.
- Canvas: em aparelho de toque (`pointer: coarse`) fica só leitura, com pinça e mover, e a edição vai pela Lista, mesmo a 844 px ou mais (P10). Isso liga com o E3 do outro plano.

### M8. Administração pelo celular (o mínimo útil)

- Definir no plano o que o admin precisa resolver pelo celular: desativar usuário, reenviar acesso, subir CSV de matrículas pelo seletor de arquivos, ver indicadores, publicar ou despublicar um artigo.
- O resto (editor de fluxos, perfis e permissões, aparência completa) continua funcional no celular, mas desenhado para o desktop, com o aviso "Melhor numa tela maior" quando fizer sentido.

## 7. Calendário e ordem

- Hoje é 08/11. **Congelamento em 17/11, banca em 20/11, entrega final em 27/11**, e a Etapa 5 ocupa 09 a 19/11.
- O M0 é pequeno e corrige um vazamento possível (P1) e uma tela falsa (P2). É o candidato a entrar antes do congelamento, junto com o E0 do outro plano, se você aprovar.
- Para a banca, o maior ganho visível com pouco risco é: M0, mais o manifest e o convite de instalação (M4, parte 1), mais o meta viewport com `interactive-widget` (M2, parte 1).
- Depois da banca: M6 → M1 → M2 → M3 → M4 (resto) → M5 → M7 → M8, intercalados com E1 a E8 conforme a seção 5, regra 1.

## 8. Perguntas que só o dono do projeto responde

1. O M0 entra antes de 17/11 junto com o E0?
2. Quais aparelhos reais temos para teste: modelo do Android de entrada e do iPhone, com as versões?
3. A barra inferior da equipe vale também para o admin, ou o admin fica com o menu atual no celular?
4. Rascunho de mensagem e fila de envio podem ficar guardados no aparelho depois de fechar o app (IndexedDB), ou nada sensível fica no aparelho (padrão de hoje)?
5. O nome curto da instituição passa a ser obrigatório na Aparência, já que vira o rótulo do ícone instalado?
6. Quem tira os screenshots do manifest: geramos por Playwright a partir da instituição demo, ou cada instituição usa a própria?

---

## 9. O prompt

Copie o bloco abaixo para um agente novo (Opus 5.5 para Plan e Checks; Sonnet 5.5 no Build, como manda o `AGENTS.md`).

```text
Você vai planejar a versão mobile-first do One (D:\one-system), um PWA que os alunos, líderes de sala e atendentes usam instalado no celular.

Antes de tudo, leia nesta ordem:
1. AGENTS.md (regras do projeto e o processo SDD: Plan → Checks → Build → Verify).
2. .specs/STATE.md (decisões ativas, em especial AD-027, AD-029, AD-032, AD-034, AD-037 sobre visual e casca, e o ## Handoff) e a seção Confirmed de .specs/LESSONS.md.
3. .specs/prompt-mobile-first.md inteiro (o que já está bom, os problemas P1 a P18 com medida, as diretrizes com fonte, os épicos M0 a M8, o calendário e as perguntas).
4. .specs/prompt-evolucao-one.md (o outro plano: fluxos, permissões, personalização). Todo épico de lá ganha critérios de celular.
5. O código citado nas tabelas: web/index.html, web/vite.config.ts, web/src/sw.ts, web/src/Autenticado.tsx, web/src/Marca.tsx, web/src/chamados/ChamadoDetalhe.tsx, web/src/assistente/Assistente.tsx, One.Api/Instituicoes/ManifestoInstituicao.cs, web/e2e/celular.spec.ts. Confira cada problema antes de usar. Se algum já estiver corrigido ou estiver errado, diga qual e corrija o prompt-mobile-first.md.

Objetivo: o One instalado no celular é a experiência principal. Usabilidade, UX e UI pensadas primeiro para 360 a 430 px, com toque, teclado virtual, rede ruim, celular deitado e Android de entrada, sem piorar o desktop.

Regras:
- Siga o AGENTS.md à risca. Nenhum código antes de um plan.md aprovado por mim. Um épico por feature em .specs/features/<slug>/, profile ui, usando historico-frases/ e fluxos-atendimento/ como modelo de formato.
- Toda decisão visual nova cita a diretriz pesquisada (Android/Material, Apple HIG, WCAG 2.2, web.dev, WebKit) e usa os tokens de web/src/index.css. Se contrariar um AD ativo de visual, proponha o AD novo no plano.
- Cada critério de tela tem check medido no Playwright (boundingBox, getComputedStyle) em 390x844, 360x780 e 844x390, com toque emulado, como em web/e2e/celular.spec.ts. O que o Chromium não prova (teclado do iPhone, push no iOS, desempenho em Android real) vira um item de verificação em aparelho real no verification.md, com o modelo do aparelho.
- Para cada problema P1 a P18: primeiro o teste que falha hoje, depois a correção.
- Nada de dado autenticado no Cache Storage nem no IndexedDB, salvo decisão minha registrada em AD.
- Menor mudança que resolve: reuse o sidebar do shadcn, Sheet, Sonner, vite-plugin-pwa e o sw.ts atual. Nenhuma dependência nova sem justificativa no plano; não adote o Vaul.
- Calendário: hoje é 08/11/2026, congelamento em 17/11, banca em 20/11. Antes de 17/11, só o que eu aprovar (candidatos: M0, M4 parte 1, M2 parte 1).
- Na dúvida entre caminhos, pergunte antes.

Entregue agora:
1. A lista do que você conferiu no código e do que estava diferente do prompt-mobile-first.md.
2. As perguntas da seção 8 que bloqueiam o M0, numa só mensagem.
3. Depois das minhas respostas: o .specs/features/<slug-do-M0>/plan.md completo (Problem, Flow, Impact, Relations, Surface, Landing, Criteria em EARS, Out of scope, Assumptions, Observable com as linhas de celular, Sources) e pare esperando meu "aprovado".
4. Só depois do M0 fechado com PASS: o plano do próximo épico, na ordem da seção 7.
```
