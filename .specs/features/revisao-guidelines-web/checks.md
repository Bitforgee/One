# Revisão do front pelas Web Interface Guidelines - checks

Profile: ui
Plan: `.specs/features/revisao-guidelines-web/plan.md`

69 checks em 11 slices · 2 one-way doors · 0 perguntas abertas (plano aprovado pelo usuário: "sim pode escrever aprovo o plano")

**Como as provas rodam.** Na raiz `D:\one-system`, salvo `cd web &&`. Vitest sempre com `--maxWorkers=4` e pelo PowerShell em `C:` maiúsculo (STATE.md, Handoff). `npx vitest run <arquivo> -t "C12 "`: cada teste começa com o id do check e um espaço, e um filtro que não seleciona teste sai com 0 (L-002), então conferir a contagem de testes executados no relatório. E2E: `docker compose up -d --build` e `npm --prefix web run e2e -- <spec>`. A API não muda: nenhuma prova .NET. Mutação suspensa (AD-025). O commit que congela este arquivo fica em `## Handoff`.

## Checks

### S1 - base global de movimento, toque e tema · 5 arquivos · 34 KB · ~23k

**C1** - Com `prefers-reduced-motion: reduce`, `animation-duration`, `transition-duration` e `scroll-behavior` de `*` computam `0.01ms`/`auto`, e `.animate-spin` continua com a duração original (AC 1)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C1 "`
Proof: `npm --prefix web run e2e -- guidelines.spec.ts -g "C1 "`

**C2** - `index.css` declara `touch-action: manipulation` em `a`, `button`, `[role=button]`, `input`, `select`, `textarea`, `label` e `-webkit-tap-highlight-color: transparent` no `body`; `html` não recebe `touch-action` (AC 2)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C2 "`

**C3** - `:root` declara `color-scheme: light`; `.dark` e `.black` declaram `color-scheme: dark` (AC 3)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C3 "`

**C4** - `overscroll-behavior: contain` está declarado para `[data-slot=sheet-content]`, `[data-slot=dialog-content]`, `[data-slot=popover-content]` e para o corpo rolável do `Editor` (AC 4)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C4 "`

**C5** - `overscroll-behavior: none` em `html` só existe dentro de `@media (pointer: fine)`; fora dela o `html` não declara `overscroll-behavior` (AC 5)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C5 "`

**C6** - `html` declara `scroll-padding-top: 3.5rem` e `scroll-padding-bottom: calc(var(--barra, 0px) + 1rem)` (AC 6)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C6 "`

**C7** - `index.html` traz `theme-color` `#ffffff` (`media="(prefers-color-scheme: light)"`) e `#0a0a0a` (`media="(prefers-color-scheme: dark)"`); ao trocar o tema no app, o `<meta name="theme-color">` sem `media` passa a `#ffffff` no claro, `#0a0a0a` no escuro e `#000000` no preto; a cor da instituição (AD-032) continua sobrescrevendo (AC 7, door 2)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C7 "`
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "theme-color"`

**C8** - O manifest gerado traz `id: "/"`, `scope: "/"`, um ícone com `purpose: "maskable"` e `background_color` igual ao `theme_color` claro `#ffffff` (AC 8)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C8 "`

**C9** - O `Topo` e o cabeçalho do `Editor` somam `env(safe-area-inset-top)` ao padding superior (AC 9)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C9 "`

### S2 - erro de campo lido e foco no primeiro erro · 15 arquivos · 155 KB · ~105k

**C10** - Com erro, `Campo` renderiza `<p id="<id>-erro" role="alert">` e o controle tem `aria-describedby="<id>-dica <id>-erro"`; sem erro, só o id da dica (AC 10)
Proof: `cd web && npx vitest run src/guidelinesCampos.test.tsx -t "C10 "`

**C11** - Quando o envio falha na validação, o foco vai para o primeiro campo com `aria-invalid="true"` em `Acesso`, `Artigos`, `Documentos` e `Instituicoes` (AC 11)
Proof: `cd web && npx vitest run src/guidelinesCampos.test.tsx -t "C11 "`

**C12** - Em `Acesso`, enviar vazio gera `cpf-erro` e `senha-erro` distintos, e nenhum elemento tem `id="-erro"` (AC 12)
Proof: `cd web && npx vitest run src/acesso/guidelinesAcesso.test.tsx -t "C12 "`

**C13** - Os campos de CPF, e-mail, URL, protocolo `ONE-n`, slug, busca e título declaram `name` e `autoComplete="off"`; os de e-mail, URL, protocolo, slug e CPF declaram `spellCheck={false}`; o login mantém `username`, `current-password` e `new-password` (AC 13)
Proof: `cd web && npx vitest run src/guidelinesCampos.test.tsx -t "C13 "`

**C14** - Os campos de e-mail, telefone e URL têm `type="email"`, `type="tel"` e `type="url"` (AC 14)
Proof: `cd web && npx vitest run src/guidelinesCampos.test.tsx -t "C14 "`

**C15** - Os placeholders de exemplo terminam em `…`: `Ex.: ONE-123…` no protocolo e `Ex.: 000.000.000-00…` no CPF (AC 15)
Proof: `cd web && npx vitest run src/guidelinesCampos.test.tsx -t "C15 "`

### S3 - nenhum trabalho digitado ou apagado sem aviso · 11 arquivos · 97 KB · ~65k

**C16** - Com o `Editor` sujo, tocar fora, apertar Esc e tocar "Cancelar" abrem `Confirmar` com o título `Descartar alterações?` e o `Editor` continua aberto (AC 16, door 1)
Proof: `cd web && npx vitest run src/guidelinesRascunho.test.tsx -t "C16 "`

**C17** - "Continuar editando" mantém o `Editor` aberto com os valores digitados, e "Descartar" fecha e zera (AC 17, door 1)
Proof: `cd web && npx vitest run src/guidelinesRascunho.test.tsx -t "C17 "`

**C18** - Com o `Editor` limpo, tocar fora, Esc e "Cancelar" fecham sem abrir `Confirmar` (AC 18)
Proof: `cd web && npx vitest run src/guidelinesRascunho.test.tsx -t "C18 "`

**C19** - "Descartar rascunho" abre `Confirmar` com o botão `Descartar rascunho` e só chama o DELETE depois dele (AC 19)
Proof: `cd web && npx vitest run src/administracao/guidelinesFluxo.test.tsx -t "C19 "`

**C20** - "Remover etapa" com destino, setor ou prazo preenchido abre `Confirmar` no canvas e no painel; sem nenhum dos três, remove direto (AC 20)
Proof: `cd web && npx vitest run src/administracao/guidelinesFluxo.test.tsx -t "C20 "`

**C21** - Com texto não enviado na resposta do chamado, navegar para outra rota abre a guarda com `Descartar resposta?`; sem texto, navega direto (AC 21)
Proof: `cd web && npx vitest run src/chamados/guidelinesResposta.test.tsx -t "C21 "`

### S4 - alvos de toque de 44 px e foco visível · 13 arquivos · 78 KB · ~53k

**C22** - Em 360×780, os botões de ícone de `Topo`, `AvisosPush`, `ListaDeEtapas` e `LigacaoComMais`, o X de `Anexos` e o `Handle` do canvas medem 44×44 px no mínimo; em desktop com ponteiro `fine` mantêm o tamanho atual (AC 22)
Proof: `npm --prefix web run e2e -- guidelines.spec.ts -g "C22 "`
Proof: `cd web && npx vitest run src/guidelinesToque.test.tsx -t "C22 "`

**C23** - Com foco por teclado, `Gerir`, `Conta`, `AdicionarEtapa`, `LigacaoComMais`, `CoresProntas`, as perguntas sugeridas do `Assistente`, o disclosure de `Conversa` e os links da `BarraDeAbas` têm a classe `focus-visible:ring-2` e `ring-ring` (AC 23)
Proof: `cd web && npx vitest run src/guidelinesToque.test.tsx -t "C23 "`

**C24** - O `SheetClose` de `Editor` usa `focus-visible:ring-2` e não tem `focus:ring-2` (AC 24)
Proof: `cd web && npx vitest run src/guidelinesToque.test.tsx -t "C24 "`

**C25** - Em `CoresProntas`, ArrowRight e ArrowLeft movem a seleção entre as cores e só uma cor entra na ordem de Tab (`tabIndex=0`, as outras `-1`) (AC 25)
Proof: `cd web && npx vitest run src/administracao/guidelinesCores.test.tsx -t "C25 "`

**C26** - Os ícones de `Conta` têm `aria-hidden="true"` (AC 26)
Proof: `cd web && npx vitest run src/acesso/guidelinesAcesso.test.tsx -t "C26 "`

### S5 - carregamento e resultado anunciados · 12 arquivos · 102 KB · ~69k

**C27** - Com `BotaoAcao` pendente, o rótulo vira `Salvando…`, `Enviando…` ou `Consultando…` conforme o verbo da ação e o botão tem `aria-busy="true"` (AC 27)
Proof: `cd web && npx vitest run src/guidelinesAnuncio.test.tsx -t "C27 "`

**C28** - Os carregamentos de `Autenticado`, `Chamados`, `ChamadoDetalhe`, `Tabela`, `AbaIntegracao`, `Aparencia` e `EdicaoDoFluxo` têm `role="status"` e o texto `Carregando…` (AC 28)
Proof: `cd web && npx vitest run src/guidelinesAnuncio.test.tsx -t "C28 "`

**C29** - O resultado do `Simulador` aparece dentro de uma região `aria-live="polite"` (AC 29)
Proof: `cd web && npx vitest run src/administracao/guidelinesSimulador.test.tsx -t "C29 "`

**C30** - O rótulo do botão de copiar de `Moodle` e de `Mcp` está numa região `aria-live="polite"` (AC 30)
Proof: `cd web && npx vitest run src/administracao/guidelinesCopiar.test.tsx -t "C30 "`

**C31** - A situação do documento muda de "Indexando" para "Indexado" ou "Falhou" dentro de `aria-live="polite"` (AC 31)
Proof: `cd web && npx vitest run src/conhecimento/guidelinesSituacao.test.tsx -t "C31 "`

**C32** - Se `navigator.clipboard.writeText` rejeita, aparece `Não foi possível copiar. Selecione o texto e copie à mão.` (AC 32)
Proof: `cd web && npx vitest run src/administracao/guidelinesCopiar.test.tsx -t "C32 "`

**C33** - Sem curso e semestre, "Simular" está habilitado e, ao clicar, aparece `Escolha o curso e o semestre.` sem chamar a API; durante a requisição fica desabilitado (AC 33)
Proof: `cd web && npx vitest run src/administracao/guidelinesSimulador.test.tsx -t "C33 "`

### S6 - formatação, semântica e navegação · 16 arquivos · 97 KB · ~65k

**C34** - `Indicadores` mostra `0,5 %`/`12,5 h`/variação no formato `Intl.NumberFormat('pt-BR')` (vírgula decimal) para os valores 0.5, 12.5 e 2.04 (AC 34)
Proof: `cd web && npx vitest run src/indicadores/guidelinesFormatos.test.tsx -t "C34 "`

**C35** - `LinkDeAnexo` mostra `20 MB` para 20480 KB e `512 KB` para 512 KB (AC 35)
Proof: `cd web && npx vitest run src/guidelinesFormatos.test.tsx -t "C35 "`

**C36** - "10 MB", "20 MB", "12 h", "512 px" e "3 MB" usam U+00A0 entre o número e a unidade (AC 36)
Proof: `cd web && npx vitest run src/guidelinesFormatos.test.tsx -t "C36 "`

**C37** - `1 setor`/`2 setores`, `1 matrícula`/`2 matrículas` e `1 administrador`/`2 administradores` (AC 37)
Proof: `cd web && npx vitest run src/guidelinesFormatos.test.tsx -t "C37 "`

**C38** - As datas de `Instituicoes` e `Mcp` saem em `dd/mm/aaaa` via `Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })`, e o código não contém `.slice(0, 10)` sobre `formatarData` (AC 38)
Proof: `cd web && npx vitest run src/guidelinesFormatos.test.tsx -t "C38 "`

**C39** - O `<th>` da coluna de ações de `Tabela` contém `<span class="sr-only">Ações</span>` (AC 39)
Proof: `cd web && npx vitest run src/tabela.test.tsx -t "C39 "`

**C40** - As métricas de `Indicadores` são `<dl>/<dt>/<dd>` e o ranking tem `role="list"` (AC 40)
Proof: `cd web && npx vitest run src/indicadores/guidelinesFormatos.test.tsx -t "C40 "`

**C41** - O logo, a foto de login, o avatar e a `Sigla` têm `width` e `height` (AC 41)
Proof: `cd web && npx vitest run src/guidelinesFormatos.test.tsx -t "C41 "`

**C42** - `/univag/inexistente` mostra o `h1` `Página não encontrada` e o link `Voltar ao início` para `/univag` (AC 42)
Proof: `cd web && npx vitest run src/acesso/guidelinesRotas.test.tsx -t "C42 "`

**C43** - Ao trocar de rota, `document.title` fica `<Rota> · <Instituição>` e `document.activeElement` é `#conteudo` (AC 43)
Proof: `cd web && npx vitest run src/acesso/guidelinesRotas.test.tsx -t "C43 "`

**C44** - Marca, `ONE-n`, slug, CPF, e-mail e telefone exibidos têm `translate="no"` (AC 44)
Proof: `cd web && npx vitest run src/guidelinesFormatos.test.tsx -t "C44 "`

**C45** - Nenhum texto de interface contém `"` ou `«»` como aspas de citação; os de `comum.tsx` (conhecimento), `Documentos` e `Cadastros` usam “ ” (AC 45)
Proof: `cd web && npx vitest run src/guidelinesFormatos.test.tsx -t "C45 "`

**C46** - `Mcp` mostra `Ativo`, `Expirado` e `Revogado` para `ATIVO`, `EXPIRADO` e `REVOGADO` (AC 46)
Proof: `cd web && npx vitest run src/administracao/mcp.test.tsx -t "C46 "`

### S7 - três defeitos de comportamento · 3 arquivos · 18 KB · ~12k

**C47** - Em `Moodle`, digitar num campo e rebuscar `dados` (foco da janela) mantém o valor digitado; sem edição, o campo recebe o valor novo (AC 47)
Proof: `cd web && npx vitest run src/administracao/guidelinesMoodle.test.tsx -t "C47 "`

**C48** - `Conversa` não lê `offsetHeight` durante o render: o código usa `ResizeObserver`, e o `ResizeObserver` falso do teste liga e desliga "Ir para o mais recente" (AC 48)
Proof: `cd web && npx vitest run src/chamados/guidelinesConversa.test.tsx -t "C48 "`

**C49** - A raiz da `PreviaAparencia` tem `inert` e `aria-hidden="true"`, e não contém `<a>` com `tel:` nem `mailto:` (AC 49)
Proof: `cd web && npx vitest run src/administracao/guidelinesPrevia.test.tsx -t "C49 "`

**C50** - Nome, e-mail, telefone e perguntas da `PreviaAparencia` têm `min-w-0` e `break-words` (AC 50)
Proof: `cd web && npx vitest run src/administracao/guidelinesPrevia.test.tsx -t "C50 "`

### S8 - listas longas sem custo de renderização · 6 arquivos · 36 KB · ~24k

**C51** - Cada linha de dados de `Tabela` declara `content-visibility: auto` e `contain-intrinsic-size: auto 56px` (AC 51)
Proof: `cd web && npx vitest run src/tabela.test.tsx -t "C51 "`

**C52** - Com 120 itens, Usuários, Chamados, Artigos e Documentos mostram 50 linhas e o botão `Mostrar mais 50`; clicar leva a 100 e depois a 120, e o botão some (AC 52)
Proof: `cd web && npx vitest run src/guidelinesListas.test.tsx -t "C52 "`

### S9 - estado de tela na URL · 10 arquivos · 78 KB · ~53k

**C53** - Escolher o período em `Indicadores` grava `?de=2026-11-01&ate=2026-11-30` e recarregar restaura o período (AC 53)
Proof: `cd web && npx vitest run src/guidelinesUrl.test.tsx -t "C53 "`

**C54** - Digitar na busca de Usuários, Cadastros e Chamados grava `q=<texto>` com `replace`, e o histórico não ganha entrada por tecla (AC 54)
Proof: `cd web && npx vitest run src/guidelinesUrl.test.tsx -t "C54 "`

**C55** - Abrir o `Editor` de Artigos, Documentos, Cadastros e Usuários grava `editar=<id>` (ou `editar=novo`), e recarregar reabre o painel (AC 55)
Proof: `cd web && npx vitest run src/guidelinesUrl.test.tsx -t "C55 "`

**C56** - Trocar a aba de `Integracoes` usa `replace` (AC 56)
Proof: `cd web && npx vitest run src/administracao/integracoes.test.tsx -t "C56 "`

**C57** - Com `de=abc`, `editar=999999` inexistente e `q` em branco na URL, a tela abre sem filtro e sem painel, sem erro na tela (AC 57)
Proof: `cd web && npx vitest run src/guidelinesUrl.test.tsx -t "C57 "`

### S10 - confirmação onde o efeito chega a outra pessoa · 3 arquivos · 32 KB · ~22k

**C58** - "Ativar" em Artigos abre `Confirmar` com `O assistente passa a usar este artigo nas respostas aos alunos.` e o botão `Ativar artigo`; a ativação só acontece depois (AC 58)
Proof: `cd web && npx vitest run src/guidelinesConfirmar.test.tsx -t "C58 "`

**C59** - "Assumir" no chamado abre `Confirmar` com o botão `Assumir chamado`; nada é enviado antes (AC 59)
Proof: `cd web && npx vitest run src/guidelinesConfirmar.test.tsx -t "C59 "`

**C60** - "Resolver" e "Confirmar resolução" abrem `Confirmar` com o botão `Resolver chamado` (AC 60)
Proof: `cd web && npx vitest run src/guidelinesConfirmar.test.tsx -t "C60 "`

**C61** - "Rejeitar resolução" abre `Confirmar` com o botão `Rejeitar resolução` (AC 61)
Proof: `cd web && npx vitest run src/guidelinesConfirmar.test.tsx -t "C61 "`

### S11 - rótulos específicos · 8 arquivos · 80 KB · ~54k

**C62** - Os botões de criar são `Novo artigo`, `Novo documento`, `Novo usuário`, `Novo setor` e `Nova categoria` (conforme a aba) (AC 62)
Proof: `cd web && npx vitest run src/guidelinesRotulos.test.tsx -t "C62 "`

**C63** - O envio do `Editor` é `Salvar artigo`, `Salvar usuário`, `Salvar setor`, `Salvar categoria`, `Enviar documento` e, em `Acesso`, `Salvar nova senha` (AC 63)
Proof: `cd web && npx vitest run src/guidelinesRotulos.test.tsx -t "C63 "`

**C64** - O diálogo de transferência do `Assistente` tem os botões `Falar com atendente` e `Voltar à conversa` e nenhum `Confirmar`/`Cancelar` (AC 64)
Proof: `cd web && npx vitest run src/assistente/guidelinesRotulos.test.tsx -t "C64 "`

**C65** - O botão do `Assistente` é `Encerrar conversa` (AC 65)
Proof: `cd web && npx vitest run src/assistente/guidelinesRotulos.test.tsx -t "C65 "`

**C66** - `Confirmar` de ação não destrutiva usa `Cancelar` como recusa; o de ação destrutiva usa `Voltar` (e `Continuar editando` no `Editor` sujo) (AC 66)
Proof: `cd web && npx vitest run src/guidelinesRotulos.test.tsx -t "C66 "`

### Fechamento

**C67** - A suíte do front continua verde, com os testes existentes ajustados só nos ids de erro e nos textos de botão que os critérios mudam, e o build com tipos passa (Impact)
Proof: `cd web && npx vitest run --maxWorkers=4`
Proof: `npm --prefix web run build`

**C68** - O `crapper` sobre `web/src` sai 0 no limite 9.99 e o `dryer` não acha candidato com nota 0.8 ou mais (AD-018)
Proof: `npm --prefix web run coverage && cd web && crapper --use-existing-coverage -s src --threshold 9.99`
Proof: `cd web && dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts`

**C69** - As telas tocadas continuam passando no E2E em 360×780 e 844×390 (Observable, linhas de celular)
Proof: `docker compose up -d --build && npm --prefix web run e2e -- guidelines.spec.ts casca-celular.spec.ts celular.spec.ts`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| temas do `theme-color` (3) | claro C7 · escuro C7 · preto C7 | - |
| lugares onde o `theme-color` nasce (3) | `index.html` C7 · `aparencia.tsx` em runtime C7 · manifest `background_color` C8 | - |
| seletores com `touch-action` (7) | `a` C2 · `button` C2 · `[role=button]` C2 · `input` C2 · `select` C2 · `textarea` C2 · `label` C2 | - |
| alvos de `overscroll-behavior: contain` (4) | sheet C4 · dialog C4 · popover C4 · corpo do `Editor` C4 | - |
| botões de ícone de 44 px (6) | `Topo` C22 · `AvisosPush` C22 · `ListaDeEtapas` C22 · `LigacaoComMais` C22 · X de `Anexos` C22 · `Handle` C22 | - |
| controles com anel de foco (8) | `Gerir` C23 · `Conta` C23 · `AdicionarEtapa` C23 · `LigacaoComMais` C23 · `CoresProntas` C23 · perguntas sugeridas C23 · disclosure de `Conversa` C23 · `BarraDeAbas` C23 | - |
| caminhos de fechar o `Editor` (3) | toque fora C16 · Esc C16 · "Cancelar" C16 | - |
| estados do `Editor` (2) | sujo C16 · limpo C18 | - |
| confirmações novas (9) | descartar alterações C16 · descartar rascunho C19 · remover etapa C20 · descartar resposta C21 · ativar C58 · assumir C59 · resolver C60 · confirmar resolução C60 · rejeitar C61 | - |
| remover etapa, onde e com quê (4) | canvas com dados C20 · painel com dados C20 · canvas vazia C20 · painel vazio C20 | - |
| campos com `name`/`autoComplete` (7) | CPF C13 · e-mail C13 · URL C13 · protocolo C13 · slug C13 · busca C13 · título C13 | - |
| campos com `type` (3) | e-mail C14 · tel C14 · url C14 | - |
| ids de erro de `Acesso` (2) | `cpf-erro` C12 · `senha-erro` C12 | - |
| formulários com foco no primeiro erro (4) | `Acesso` C11 · `Artigos` C11 · `Documentos` C11 · `Instituicoes` C11 | - |
| carregamentos com `role="status"` (7) | `Autenticado` C28 · `Chamados` C28 · `ChamadoDetalhe` C28 · `Tabela` C28 · `AbaIntegracao` C28 · `Aparencia` C28 · `EdicaoDoFluxo` C28 | - |
| verbos do `BotaoAcao` pendente (3) | Salvando… C27 · Enviando… C27 · Consultando… C27 | - |
| regiões `aria-live` novas (4) | `Simulador` C29 · copiar C30 · situação do documento C31 · aviso de cópia C32 | - |
| unidades com U+00A0 (5) | 10 MB C36 · 20 MB C36 · 12 h C36 · 512 px C36 · 3 MB C36 | - |
| plurais (3) | setor C37 · matrícula C37 · administrador C37 | - |
| enums de `Mcp` (3) | ATIVO C46 · EXPIRADO C46 · REVOGADO C46 | - |
| imagens com `width`/`height` (4) | logo C41 · foto de login C41 · avatar C41 · `Sigla` C41 | - |
| listas com 50 por vez (4) | Usuários C52 · Chamados C52 · Artigos C52 · Documentos C52 | - |
| estados na URL (4) | período C53 · busca C54 · `editar` C55 · aba de `Integracoes` C56 | - |
| URL inválida (3) | data malformada C57 · id inexistente C57 · `q` em branco C57 | - |
| botões de criar (5) | Novo artigo C62 · Novo documento C62 · Novo usuário C62 · Novo setor C62 · Nova categoria C62 | - |
| rótulos de envio do `Editor` (6) | Salvar artigo C63 · Salvar usuário C63 · Salvar setor C63 · Salvar categoria C63 · Enviar documento C63 · Salvar nova senha C63 | - |
| rota `/:slug/*` inexistente (1) | 404 C42 | - |
| startup config: `index.html` e manifest (2 assemblies) | `index.html` C7 · `vite.config.ts` C8 | - |

- Afirmam algo na rota HTTP ou na API: nenhum, a API não muda (Surface: `None`)
- Os doors do `Landing`: padrão `sujo` do `Editor` C16 C17 C18; `theme-color` por tema C7
- Os claims C1 e C22 têm prova de navegador real (Playwright); jsdom não calcula `@media` nem caixa de layout
- Nenhum outro check afirma mais que o caso que a prova exercita

## Swept

- validation: C57 (URL com valor inválido), C13 e C14 (tipos e limites de entrada), C52 (50 por vez)
- failure modes: C32 (cópia que falha), C57, C28 (carregamento anunciado)
- idempotency: n/a - nenhuma escrita nova; as confirmações de S10 só adiam a mesma chamada, que o servidor já trata
- authorization: existing - `rotaPermitida` em `Autenticado.tsx` e as guardas de papel do servidor; a 404 de C42 não revela rota de outro papel
- concurrency: C47 (rebusca durante a edição) e C48 (redimensionamento sem leitura de layout)
- data lifecycle: n/a - nada persistido novo; `editar=` e `q` na URL não guardam dado pessoal, só ids e termos
- dependency failure: C32 (área de transferência), C28
- state transitions: C16 C17 C18 (limpo, sujo, descartado), C31 (Indexando, Indexado, Falhou)
- observability: n/a - sem requisito de log ou métrica; o ganho é de acessibilidade, não de telemetria

## Handoff

Estimativa por slice = (tamanho em KB dos arquivos de código tocados × 2,7 para somar os testes existentes, razão 576 KB de testes para 345 KB de fonte medida com `Get-ChildItem web/src`) × 1000 ÷ 4. Os arquivos repetem entre slices; o builder relê cada um.

- S1 = 34 KB → 23k
- S2 = 155 KB → 105k
- S3 = 97 KB → 65k
- S4 = 78 KB → 53k
- S5 = 102 KB → 69k
- S6 = 97 KB → 65k
- S7 = 18 KB → 12k
- S8 = 36 KB → 24k
- S9 = 78 KB → 53k
- S10 = 32 KB → 22k
- S11 = 80 KB → 54k
- Total = 545k, acima dos 150k do `budget` do AGENTS.md.

Corte proposto, em lotes sequenciais, cada um só depois do anterior verde:

- Lote A = S1 + S2 = 128k (base global e formulários)
- Lote B = S3 + S7 + S8 + S10 = 123k (rascunho, defeitos, listas, confirmações)
- Lote C = S4 + S5 = 122k (toque, foco e anúncios)
- Lote D = S6 + S9 = 118k (formatos, semântica, URL)
- Lote E = S11 = 54k (rótulos, por último porque depende do `Editor` do S3 e do `Confirmar` do S10)

Nenhum slice sozinho passa de 150k (o maior é S2, com 105k).

- Mechanism: handoff - 5 lotes sequenciais, só sobre verde (escolha do usuário: "pode seguir com o que for recomendado")

**Boundary:** C1-C15 closed at 02f974e
**Settled mid-build:** theme-color em runtime vem de web/src/corDaBarra.json (interface.test.ts proíbe hex literal em .ts/.tsx); o meta sem media é criado como primeiro filho do head e carrega a cor da instituição ou a do tema; ícone maskable reaproveita icon-512.png (sem arte própria); foco no primeiro erro do servidor por useFocoNoPrimeiroErro (Campo.tsx) em Artigos, Documentos e Instituicoes, e o RHF no Acesso; erros de Campo e de Acesso com role=alert; C1 e2e rodou contra o vite dev (E2E_URL) porque o Docker não está instalado/ligado aqui; testes existentes mudados: identidade.test.tsx (regex \binter\b por causa de pointer), acesso.test.tsx (sem Alert de formulário em vez de sem role alert), interface.test.ts (theme-color acompanha o tema claro), chamados/textos.test.tsx (placeholder Ex.: ONE-123…), estrutura.test.ts (Raiz ganha os dois testes da raiz).
**Abandoned:** nada do lote A; C22-C26 (S4) e demais slices ficaram para os lotes seguintes.
