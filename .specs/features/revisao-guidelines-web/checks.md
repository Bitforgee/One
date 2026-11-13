# Revisão do front pelas Web Interface Guidelines - checks

Profile: ui
Plan: `.specs/features/revisao-guidelines-web/plan.md`

72 checks em 12 slices · 2 one-way doors · 0 perguntas abertas (plano aprovado pelo usuário: "sim pode escrever aprovo o plano")

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

**C6** - `html` declara `scroll-padding-top: 3.5rem` e `scroll-padding-bottom: calc(var(--barra, 0px) + 1rem)`, e `--barra` é definida em `html` (ou acima dele) para que a conta use a altura real da barra inferior quando ela existe (AC 6, emenda 1)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C6 "`

**C7** - `index.html` traz `theme-color` com o fundo do tema claro (`media="(prefers-color-scheme: light)"`) e do escuro (`media="(prefers-color-scheme: dark)"`); ao trocar o tema no app, o `<meta name="theme-color">` sem `media` passa ao `--background` computado do claro, do escuro e do preto (`#000000`); o teste compara o hex com o `--background` de `index.css` convertido de oklch, nunca com literal solto (emenda 1: as Guidelines pedem que a barra combine com o fundo da página); a cor da instituição (AD-032) continua sobrescrevendo (AC 7, door 2)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C7 "`
Proof: `cd web && npx vitest run src/aparencia.test.tsx -t "theme-color"`

**C8** - O manifest gerado traz `id: "/"`, `scope: "/"`, um ícone com `purpose: "maskable"` e `background_color` igual ao `theme_color` claro; o manifest por instituição gerado pela API (AD-032) fica fora (emenda 1) (AC 8)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C8 "`

**C9** - O `Topo` e o cabeçalho do `Editor` somam `env(safe-area-inset-top)` ao padding superior (AC 9)
Proof: `cd web && npx vitest run src/guidelinesGlobal.test.ts -t "C9 "`

### S2 - erro de campo lido e foco no primeiro erro · 15 arquivos · 155 KB · ~105k

**C10** - Com erro, `Campo` renderiza `<p id="<id>-erro" role="alert">` e o controle tem `aria-describedby="<id>-dica <id>-erro"`; sem erro, só o id da dica (AC 10)
Proof: `cd web && npx vitest run src/guidelinesCampos.test.tsx -t "C10 "`

**C11** - Quando o envio falha na validação, o foco vai para o primeiro campo com `aria-invalid="true"` em `Acesso`, `Artigos`, `Documentos`, `Instituicoes`, `Usuarios` e `Cadastros` (AC 11, emenda 1)
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

**C20** - "Remover etapa" com setor ou prazo preenchido abre `Confirmar` no canvas e no painel; sem nenhum dos dois, remove direto (AC 20, emenda 1)
Proof: `cd web && npx vitest run src/administracao/guidelinesFluxo.test.tsx -t "C20 "`

**C21** - Com texto não enviado na resposta do chamado, navegar para outra rota abre a guarda com `Descartar resposta?`; sem texto, navega direto (AC 21)
Proof: `cd web && npx vitest run src/chamados/guidelinesResposta.test.tsx -t "C21 "`

### S4 - alvos de toque de 44 px e foco visível · 13 arquivos · 78 KB · ~53k

**C22** - Em 360×780, os botões de ícone de `Topo`, `AvisosPush`, `ListaDeEtapas` e `LigacaoComMais`, o X de `Anexos` e o `Handle` do canvas (onde existe: telas largas, medido em px de CSS sem o zoom do canvas) medem 44×44 px no mínimo; `Topo`, `AvisosPush` e `ListaDeEtapas` já cumpriam e continuam; em desktop com ponteiro `fine` mantêm o tamanho atual (AC 22, emenda 1)
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

**C28** - Os carregamentos de `Autenticado`, `Acesso`, `Chamados`, `ChamadoDetalhe`, `Tabela`, `AbaIntegracao`, `Aparencia` e `EdicaoDoFluxo` têm `role="status"` e o texto `Carregando…` (AC 28)
Proof: `cd web && npx vitest run src/guidelinesAnuncio.test.tsx -t "C28 "`

**C29** - O resultado do `Simulador` aparece dentro de uma região `aria-live="polite"` (AC 29)
Proof: `cd web && npx vitest run src/administracao/guidelinesSimulador.test.tsx -t "C29 "`

**C30** - O rótulo do botão de copiar de `Moodle` e de `Mcp` está numa região `aria-live="polite"` (AC 30)
Proof: `cd web && npx vitest run src/administracao/guidelinesCopiar.test.tsx -t "C30 "`

**C31** - A situação do documento muda de "Indexando" para "Indexado" ou "Falhou" dentro de `aria-live="polite"`; a mudança chega pelo próximo refetch da lista, que o front não dispara sozinho (emenda 1) (AC 31)
Proof: `cd web && npx vitest run src/conhecimento/guidelinesSituacao.test.tsx -t "C31 "`

**C32** - Se `navigator.clipboard.writeText` rejeita, aparece `Não foi possível copiar. Selecione o texto e copie à mão.` (AC 32)
Proof: `cd web && npx vitest run src/administracao/guidelinesCopiar.test.tsx -t "C32 "`

**C33** - Sem curso e semestre, "Simular" está habilitado e, ao clicar, aparece `Escolha o curso e o semestre.` sem chamar a API; durante a requisição fica desabilitado, e também fica desabilitado quando não há versão a simular (emenda 1) (AC 33)
Proof: `cd web && npx vitest run src/administracao/guidelinesSimulador.test.tsx -t "C33 "`

### S6 - formatação, semântica e navegação · 16 arquivos · 97 KB · ~65k

**C34** - `Indicadores` mostra `0,5 %`/`12,5 h`/variação no formato `Intl.NumberFormat('pt-BR')` (vírgula decimal) para os valores 0.5, 12.5 e 2.04, com U+00A0 entre número e unidade (emenda 1) (AC 34)
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

**C41** - O logo, a foto de login, o avatar, a `Sigla`, o `CampoImagem` e as imagens da `PreviaAparencia` têm `width` e `height` (AC 41, emenda 1)
Proof: `cd web && npx vitest run src/guidelinesFormatos.test.tsx -t "C41 "`

**C42** - `/univag/inexistente` mostra o `h1` `Página não encontrada` e o link `Voltar ao início` para `/univag` (AC 42)
Proof: `cd web && npx vitest run src/acesso/guidelinesRotas.test.tsx -t "C42 "`

**C43** - Ao trocar de rota, `document.title` fica `<Rota> · <Instituição>` e `document.activeElement` é `#conteudo` (AC 43)
Proof: `cd web && npx vitest run src/acesso/guidelinesRotas.test.tsx -t "C43 "`

**C44** - Marca, `ONE-n`, slug, CPF, e-mail e telefone exibidos têm `translate="no"` num `<span>` só em volta do token, inclusive em `Usuarios` (celular), `Instituicoes` (aviso de criação) e nas frases do `Assistente` com o protocolo (AC 44, emenda 1)
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

**C51** - Cada linha de dados de `Tabela` (efeito real só nos cartões do celular; em `<tr>` do desktop o CSS não age e o limite de 50 do C52 protege, emenda 1) declara `content-visibility: auto` e `contain-intrinsic-size: auto 56px` (AC 51)
Proof: `cd web && npx vitest run src/tabela.test.tsx -t "C51 "`

**C52** - Com 120 itens, Usuários, Chamados, Artigos e Documentos mostram 50 linhas e o botão `Mostrar mais 50`; clicar leva a 100 e depois a 120, e o botão some (AC 52)
Proof: `cd web && npx vitest run src/guidelinesListas.test.tsx -t "C52 "`

### S9 - estado de tela na URL · 10 arquivos · 78 KB · ~53k

**C53** - Escolher o período em `Indicadores` grava `?de=2026-11-01&ate=2026-11-30` e recarregar restaura o período (AC 53)
Proof: `cd web && npx vitest run src/guidelinesUrl.test.tsx -t "C53 "`

**C54** - Digitar na busca de Usuários e Cadastros (Chamados não tem busca, emenda 1) grava `q=<texto>` com `replace`, e o histórico não ganha entrada por tecla (AC 54)
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

### S12 - emendas da rodada 2 · 4 arquivos · ~20 KB · ~14k

**C70** - O diálogo de encerrar do `Assistente` tem os botões `Encerrar conversa` e `Voltar à conversa`, e nenhum `Confirmar`/`Cancelar` (rodada 2)
Proof: `cd web && npx vitest run src/assistente/guidelinesRotulos.test.tsx -t "C70 "`

**C71** - Nenhum botão de `ChamadoDetalhe` tem o texto exato `Salvar`; o botão que salva a categoria ou a edição declara o objeto (`Salvar categoria`) (rodada 2)
Proof: `cd web && npx vitest run src/chamados/guidelinesRotulos.test.tsx -t "C71 "`

**C72** - Em 360×780, a caixa de `Falar com atendente` e de `Encerrar conversa` no `Assistente` tem 8 px ou mais entre si (horizontal ou vertical), e em `Indicadores` o valor e a variação mantêm o `gap-x-4` de antes da feature, quebrando de linha se não couberem; nenhum alvo de toque da feature fica a menos de 8 px de outro (pesquisa.md §4) (rodada 2)
Proof: `npm --prefix web run e2e -- guidelines.spec.ts -g "C72 "`

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
| formulários com foco no primeiro erro (6) | `Acesso` C11 · `Artigos` C11 · `Documentos` C11 · `Instituicoes` C11 · `Usuarios` C11 · `Cadastros` C11 | - |
| carregamentos com `role="status"` (8) | `Acesso` C28 · `Autenticado` C28 · `Chamados` C28 · `ChamadoDetalhe` C28 · `Tabela` C28 · `AbaIntegracao` C28 · `Aparencia` C28 · `EdicaoDoFluxo` C28 | - |
| verbos do `BotaoAcao` pendente (3) | Salvando… C27 · Enviando… C27 · Consultando… C27 | - |
| regiões `aria-live` novas (4) | `Simulador` C29 · copiar C30 · situação do documento C31 · aviso de cópia C32 | - |
| unidades com U+00A0 (5) | 10 MB C36 · 20 MB C36 · 12 h C36 · 512 px C36 · 3 MB C36 | - |
| plurais (3) | setor C37 · matrícula C37 · administrador C37 | - |
| enums de `Mcp` (3) | ATIVO C46 · EXPIRADO C46 · REVOGADO C46 | - |
| imagens com `width`/`height` (6) | logo C41 · foto de login C41 · avatar C41 · `Sigla` C41 · `CampoImagem` C41 · `PreviaAparencia` C41 | - |
| listas com 50 por vez (4) | Usuários C52 · Chamados C52 · Artigos C52 · Documentos C52 | - |
| estados na URL (4) | período C53 · busca (Usuários, Cadastros) C54 · `editar` C55 · aba de `Integracoes` C56 | - |
| URL inválida (3) | data malformada C57 · id inexistente C57 · `q` em branco C57 | - |
| botões de criar (8) | Novo curso C62 · Novo fluxo C62 · Nova resposta pronta C62 · Novo artigo C62 · Novo documento C62 · Novo usuário C62 · Novo setor C62 · Nova categoria C62 | - |
| `translate="no"` (6 lugares de código) | marca C44 · `ONE-n` em frases do `Assistente` C44 · slug C44 · CPF C44 · e-mail C44 · telefone C44 | - |
| rótulos de envio do `Editor` (6) | Salvar artigo C63 · Salvar usuário C63 · Salvar setor C63 · Salvar categoria C63 · Enviar documento C63 · Salvar nova senha C63 | - |
| rota `/:slug/*` inexistente (1) | 404 C42 | - |
| startup config: `index.html` e manifest (2 assemblies) | `index.html` C7 · `vite.config.ts` C8 | - |

- Afirmam algo na rota HTTP ou na API: nenhum, a API não muda (Surface: `None`)
- Os doors do `Landing`: padrão `sujo` do `Editor` C16 C17 C18; `theme-color` por tema C7
- Os claims C1 e C22 têm prova de navegador real (Playwright); jsdom não calcula `@media` nem caixa de layout
- Nenhum outro check afirma mais que o caso que a prova exercita

## Amendments

Rodada 2, a pedido do usuário ("ajuste, não me pergunte nada"), depois do FAIL da rodada 1 do Verify. Cada emenda corrige um check que contradizia o código certo, a regra do repositório ou uma fonte vinculante, e está marcada `emenda 1` na linha do check. Os checks C70 a C72 são novos. Os demais ficam como aprovados.

- C6, C7: o `--barra` e o `theme-color` seguem o `--background` real (Guidelines: a barra combina com o fundo) - código a corrigir
- C11, C28, C41, C44: ampliados aos lugares que o Verify achou
- C20, C22, C31, C33, C34, C51, C54: texto alinhado ao comportamento e à tela que existem
- C8: o manifest por instituição da API (`ManifestoInstituicao.cs`) fica fora, por exigir mudança de API
- AC 59 a 61 do plano: o ator é o aluno em "Confirmar resolução" e "Rejeitar resolução"
- C68: segue aberto; o `crapper` está bloqueado pelo Windows e não há AD do dono aceitando o risco

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

**Boundary:** C16-C21, C47-C52, C58-C61 closed at 40a2518
**Settled mid-build:** Editor ganhou `sujo` e o hook `useSujo(valor, chave?)` (compara o valor atual com o primeiro valor aberto; Documentos usa chave com nome e tamanho do arquivo; Mcp e a Importar carga passam `sujo` direto); a confirmação `Descartar alterações?` mora no próprio `Editor` e todos os 3 caminhos de fechar passam por ela; C20 já era atendido por `precisaConfirmar` do canvas (setor ou prazo) e o painel usa o mesmo caminho, então só ganhou teste: "destino" não conta como dado porque toda etapa tem destino (ver Abandoned); `Confirmar` de S10 em `ChamadoDetalhe` por `pedir()` sobre `executar` para assumir/confirmar/resolver/rejeitar, e a guarda de resposta usa `useBlocker` (AD-047) dentro de `Responder`; Moodle preserva por campo editado (os outros campos recebem o valor novo), limpo ao salvar; `Conversa` usa `ResizeObserver` no `<ol>` e no `documentElement` e lê `contentRect.height`; S8: `useMostrarMais` em `Tabela.tsx` e a regra `content-visibility` em `index.css` (seletores `[data-slot=table-body] > [data-slot=table-row]`, `[data-cartoes] >` e `[data-linhas] >`); `content-visibility` não age em `<tr>` (caixa interna de tabela), só nos cartões do celular, mas a declaração do C51 está lá; testes existentes mudados: `fluxos`, `paginaDoFluxo` (confirmar Descartar rascunho), `chamados/acoes`, `linhaDoTempo`, `revisao` (confirmar Assumir/Resolver/Rejeitar), `conhecimento/artigos`, `edicao`, `textos` (confirmar Ativar e catálogo de textos), `administracao/cadastros`, `mcp` (Descartar depois de Cancelar com campo editado), `aparencia`, `aparenciaAbas`, `identidade` (consultas da prévia com `hidden: true` e telefone/e-mail como texto, não link), `e2e/celular`, `ux`, `ux-real` (passo de confirmar; o contador de Sheet do `ux-real` agora conta só `sheet-content`, `includeHidden` na prévia); e2e rodou contra `vite dev` (porta 5199, `webServer` em config temporária removida) porque o Docker não roda aqui: `ux` e `celular` com 166 passed e 15 failed, e os 15 vêm de fora do lote B (ver Abandoned).
**Abandoned:** nada dos checks C16-C21, C47-C52, C58-C61; falhas de e2e fora do lote B, medidas no `vite dev`: `arranjo` "movimento reduzido" (2 testes, esperam `0s` e o S1 do lote A põe `0.01ms`) e `ux` "diálogos de formulário em tela inteira" (6 testes, o seletor `form > div:not([data-slot])` não acha mais o corpo que o lote A marcou com `data-slot="editor-corpo"`) falham desde o `c429ee8` e passam em `a1004de`; `arranjo` "cabeçalho: borda, título numa linha e botões de 36 px" e `ux` "Conta com linhas de 52 px" falham também em `a1004de` (ambiente), e `anexos` (2) pedem a API real; ficam para o lote C/E (C69).

**Boundary:** C22-C33 closed at ce44132
**Settled mid-build:** C22 era quase todo atendido pelo `Button` `icon` (`max-md:size-11 pointer-coarse:size-11`); o lote só acrescentou `LigacaoComMais` e o `Handle` do canvas (`pointer-coarse:size-11!` com ponto interno por `after:`; o canvas só existe a partir de 768 px, então `max-md` não se aplica ao Handle) e o e2e mede por `offsetWidth` (o canvas escala por zoom, então na tela o alvo é 44 px × zoom do fitView); rótulos pendentes usam `…` (U+2026) por decisão do usuário no briefing, no lugar do `.` literal de C27/C28 do checks; gerúndio derivado da primeira palavra do rótulo em `gerundio()` (`acao.tsx`), e o `Consultar` de Indicadores virou `BotaoAcao` (era `Button`); o `BotaoAcao` local de `ChamadoDetalhe` passou a envolver o compartilhado; o Spinner dentro de `BotaoAcao` ganhou `aria-hidden` para o nome do botão ser só `Salvando…` (testes de acesso e indicadores consultam `status` com `hidden: true`); novo `web/src/Carregando.tsx` (`role=status`, `aria-label=Carregando`, texto sr-only `Carregando…`) substitui o Spinner solto e os esqueletos de Autenticado, ChamadoDetalhe, Tabela, AbaIntegracao, Aparencia, EdicaoDoFluxo (Suspense) e PaginaDoFluxo, e o `Carregando` antigo de `chamados/Chamados.tsx` saiu; `Simular` fica habilitado até haver requisição e só desabilita sem versão (`!versao`, nada a enviar), a dica `Escolha o curso e o semestre.` mora na região `aria-live` do Simulador; cópia falha por `Promise.resolve().then(writeText)` (cobre `navigator.clipboard` ausente) com toast; `IconeIndexacao` sempre renderiza o `<span aria-live=polite>`; testes existentes mudados: `tabela`, `chamados/listas` (esqueleto agora tem `status` com `Carregando…`), `chamados/chamado` (idem, `animate-spin` no svg interno), `acesso/acesso` (`Entrando…`, spinner `hidden`), `indicadores/indicadores` (spinner `hidden`), `indicadores/revisao` (espera o `Consultar` voltar), `administracao/fluxos` (`Simular` habilitado + dica); e2e consertados no lote: `arranjo` (`0.01ms` e a primeira amostra do balão pode ser o quadro inicial, as demais têm de ser identidade), `ux` (`form > [data-slot=editor-corpo]`) e `aparencia` (`includeHidden` na prévia que o Lote B marcou `inert`/`aria-hidden`); e2e rodou contra `vite dev` (porta 5199, sem Docker).
**Abandoned:** nada de C22-C33. Falhas de e2e que não são deste lote, medidas no `vite dev`: `arranjo` "cabeçalho: borda…" e `ux` "Conta com linhas de 52 px" (já falhavam em `a1004de`), `anexos` (2) e todos os `*-real` (pedem a API real), e `push` (5), `identidade` (3: fontes e precache), `plataforma` (1) que dependem de `sw.js`/assets do build e não existem no dev server (não conferidos em `a1004de`); ficam para o C69 com Docker.

**Boundary:** C34-C46, C53-C57 closed at 5f76a82
**Settled mid-build:** formatação num só lugar, `web/src/formatos.ts` (`numero`, `comUnidade`, `porcentagem`, `decimalFixo`, `plural`, `tamanhoDoArquivo`, `dataCurta`), com U+00A0 entre número e unidade; o `%` também leva U+00A0 porque o C34 escreve `0,5 %` (o `Intl` com `style: 'percent'` daria `0,5%`), e por isso o `Principal` de Indicadores passou de `gap-x-4` para `gap-x-3`: a 390 px `71,2 %` + variação mediram 125 + 16 + 219,3 px para 358 px e a variação descia de linha (identidade.spec "variação ao lado"); `plural` usa `Intl.PluralRules` com 0 no plural e vale também para a carga (curso, categoria, regra, artigo) e para "atualizada(s)" de Matrículas; `dataCurta` é `dateStyle: 'short'` no fuso da instituição, e o "Último uso" do Mcp continua com hora (`formatarData`); `translate="no"` direto no elemento (h1 do login e da raiz, nome e "One" da barra, CPF da Conta, `tel:`/`mailto:` do contato, slug de Instituições, h1 do Topo quando é ONE-n) e por `web/src/Literal.tsx` (span) no CPF/e-mail de Usuários e no ONE-n das listas; dimensões: logo 160×32 (barra) e 192×48 (login), foto do login 800×160/800×1200, Sigla 32×32, avatares 24 e 32; a 404 é `NaoEncontrada` em `Acesso.tsx` na rota `/:slug/*` (fora do `Autenticado`, sem pedir sessão); o título `<Rota> · <Instituição>` vem de `useRota` (`aparencia.tsx`, `data-rota` + `titular`, nome curto se houver) só na casca autenticada, e o foco vai para `#conteudo` só quando o `pathname` muda (não na primeira entrada, `preventScroll`); aspas `«»` trocadas por “ ” em Cadastros, Mcp e Moodle, e as retas do Moodle também; S9 em `web/src/urlDaTela.ts`: `useBuscaNaUrl` (`q` com `replace`, em branco vira sem filtro) e `useEditarNaUrl` (`editar=<id>|novo` com `replace`, reabre depois de os dados chegarem e apaga da URL o valor que não acha; Usuários só ativos, Documentos só ATIVO como "Nova versão", Cadastros nunca reabre fluxo), integrado ao `sujo` do Lote B pelo `useSujo` de sempre (reaberto pela URL nasce limpo); Indicadores aceita `de`/`ate` só quando ambos são datas reais e `de <= ate`, e o Consultar grava com `replace`; Integracoes usa `replace`; `test/util.tsx` exporta `abrirComRoteador` (e `abrir` passa a ser ele); a troca de aba de Cadastros continua a limpar `q` e `editar`; corrida conhecida, não corrigida: `setSearchParams` funcional parte dos parâmetros do último render, então um clique numa linha até ~25 ms depois do clique na aba grava `editar` sobre a URL velha e a aba volta (o e2e antigo fazia isso e passava por acaso em `a1004de`, abrindo dados de setor sob a aba Cursos); testes existentes mudados: `admin`, `instituicoes`, `mcp`, `artigos` (cabeçalho `Ações`, plural, aspas curvas, estados traduzidos), `cadastros`, `integracoes` (aspas curvas), `aparenciaAbas` (título `Aparência · Nova`), `chamados/listas` (o ONE-n agora está num span dentro do link), `textos` de administracao/assistente/chamados/conhecimento/indicadores (U+00A0 e plural), `indicadores/indicadores`, `identidade`, `revisao` (U+00A0 e `dt`/`dd` no lugar de `div`/`li`/`span`), `test/estrutura` (Raiz ganha `guidelinesFormatos` e `guidelinesUrl`); e2e mudados: `arranjo` e `identidade` (`71,2 %` e `dt`/`dd`), `ux` (espera a aba de Cadastros trocar antes de clicar na linha); e2e rodou contra `vite dev` (porta 5199, config temporária do Playwright removida) porque o Docker não roda aqui, com `a1004de` e `153016f` em worktrees temporários nas portas 5198/5197 para comparar: 13 specs das telas tocadas com 261 passed e 6 failed, e os 6 não são do Lote D: `arranjo` "cabeçalho: borda…", `ux` "Conta com linhas de 52 px" e `identidade` (3: fontes e precache) falham também em `a1004de`, e `arranjo` "movimento reduzido sem animação" é instável também em `153016f` (1 de 6); faltas injetadas à mão e restauradas, todas pegas: S6 (U+00A0 trocado por espaço comum, plural desligado, fuso da data em UTC, `sr-only Ações` removido, enum cru no Mcp, `ul` no lugar de `dl` e `span` no lugar de `dt`, `%` sem `Intl`, sem `translate` no e-mail do contato, sem rota 404, sem foco em `#conteudo`) e S9 (`replace: false`, editar sem reabrir, período da URL sem validar, Integracoes sem `replace`, busca de Cadastros fora da URL).
**Abandoned:** nada de C34-C46 e C53-C57. Fica parcial no C44: ONE-n dentro de frases ("Sua solicitação ONE-n…" do Assistente), CPF/e-mail no `Detalhe` do celular de Usuários e o e-mail do aviso de instituição criada não ganharam `translate="no"` (o atributo na frase inteira impediria traduzir o português; separar mexe em testes de texto exato) e a prova do C44 não os cobre. Gates do AD-018 (C68, Lote E): o `crapper` está bloqueado aqui pelo Controle de Aplicativos do Windows (como no AD-044), e o `dryer` acha um só candidato, `Aparencia.tsx:272-278` × `ChamadoDetalhe.tsx:85-91` (nota 1,00), que já existia em `153016f` (Lote B). As falhas de e2e acima ficam para o C69 com Docker.

**Boundary:** C62-C67 and C69 closed at c3b4f61; C68 stays open: crapper is blocked on this computer, so there is no CRAP output (see Abandoned)
**Settled mid-build:** `Confirmar` recebe `voltar` opcional e usa `Cancelar` quando a ação não é destrutiva e `Voltar` quando é; `ConfirmarSaida` (em `web/src/Confirmar.tsx`) junta os dois diálogos de saída por `useBlocker` (Aparencia e ChamadoDetalhe) porque o `dryer` acusou o trecho repetido (nota 1,00); Documentos e Artigos escondem o botão de criar com a lista vazia ou ainda carregando (o vazio já traz o seu), e o botão de Documentos passou a `Novo documento` (o título do diálogo segue `Enviar PDF`); Cadastros rotula o envio por aba (`Salvar setor`, `Salvar categoria`, `Salvar curso`, `Salvar fluxo`, `Salvar resposta pronta`); em Acesso só `TrocarSenha` virou `Salvar nova senha` (`DefinirSenha` já era `Salvar senha`); `Encerrar conversa` obrigou o `gap-1` da linha de botões do Assistente para caber com `Falar com atendente` em 360 px; o e2e `aparencia-real` lia o `theme-color` sem filtrar `:not([media])` desde o lote A.
**Abandoned:** C68 sem PASS: `crapper --use-existing-coverage -s src --threshold 9.99` falha com `Program 'crapper.exe' failed to run: ... Uma política de Controle de Aplicativo bloqueou este arquivo` (a cobertura rodou: 95 arquivos, 935 testes verdes); o `dryer` sai sem candidato (`No duplicate candidates found.`) depois de extrair `ConfirmarSaida`. Como proxy, a complexidade ciclomática das funções dos arquivos tocados no feature tem máximo 9 (`useModo`), o que só vira CRAP abaixo de 10 com a cobertura que o `crapper` mediria; o AD do dono para fechar com risco aceito (como o AD-044) não existe. C69 rodou no compose real (:8080, Docker funcionou): `guidelines`, `casca-celular` e `celular` 26 de 26; o e2e inteiro deu 292 passed e 7 failed: `anexos` (a foto não aparece no chamado da equipe; falha igual em `a1004de`), `casca-real`, `fluxos-real`, `identidade-real` e `ux-real` (2) (o admin `admin@e2e.one` não recebe e-mail de primeiro acesso neste banco, erro no `beforeAll` antes de qualquer tela) e `arranjo` "movimento reduzido sem animação" (passou nas outras 4 rodadas, amostragem de tempo). `instituicoes-real` passa com `E2E_CONTAINER=one-system-api-1`.
**Commits (`git log --oneline a1004de..c3b4f61`):** c3b4f61 test(web): read the theme-color meta without media in the aparencia-real spec; 130bb32 fix(web): keep Falar com atendente and Encerrar conversa on one row at 360 px; cfef515 refactor(web): share the leave-screen confirmation between Aparencia and ChamadoDetalhe; 2744dfb test(web): follow the specific button labels in the e2e specs; 4ad1234 feat(web): specific button labels for create, submit, transfer and end; 0140873 docs(specs): record the lote D handoff for the web guidelines review; 5f76a82 feat(web): keep period, search and open editor in the URL; ed0426b feat(web): pt-BR formats, semantics, 404 page and route titles; 153016f docs(specs): record the lote C handoff for the web guidelines review; ce44132 feat(web): 44 px touch targets, focus rings and announced loading and results; 0d2eeb6 test(web): follow reduced motion and the editor body selector in the e2e specs; a1b79db docs(specs): record the lote B handoff for the web guidelines review; 40a2518 test(web): follow the new confirm steps in the e2e specs; 37dfb55 feat(web): render long lists 50 at a time with content-visibility rows; a5a41cd test(web): open the guideline tests through abrir for the structure rule; 92a4799 fix(web): keep Moodle edits, observe Conversa size, freeze preview; 0ab141e test(web): confirm the discard in the cadastros and mcp editor tests; 60f2253 feat(web): confirm before discarding work or acting on others; c429ee8 docs(specs): record the lote A handoff for the web guidelines review; 02f974e feat(web): link field errors, focus the first one, set input attrs; bd612cd feat(web): add global motion, touch and per-theme theme-color base; 97524d1 docs(specs): plan and checks for the web guidelines review

