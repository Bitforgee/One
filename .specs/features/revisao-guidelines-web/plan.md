# Revisão do front pelas Web Interface Guidelines

## Problem

A revisão de `web/` contra as Web Interface Guidelines da Vercel (4 revisores independentes, 56 arquivos fora de `ui/`) achou
problemas que o `revisao-ux` e o `identidade-visual` não cobriram. Os que valem para o app inteiro, conferidos à mão no código:
- `web/src/index.css` não tem `prefers-reduced-motion`, `touch-action`, `color-scheme` nem `overscroll-behavior`; só a lib `motion` respeita movimento reduzido (`MotionConfig` em `App.tsx`);
- `theme-color` e `background_color` do manifest são fixos e claros; o tema escuro e o preto abrem com flash branco;
- `Acesso.tsx:147` gera `id="-erro"` para todos os campos (o `${nome}` se perdeu) e nenhum `aria-describedby` aponta para o erro;
- `Editor.tsx:34` fecha o painel e descarta o rascunho com um toque fora, sem aviso;
- `Moodle.tsx:99` zera o que a pessoa digitou quando `dados` é rebuscado (`useEffect` sem guarda);
- "Descartar rascunho" do fluxo (`EdicaoDoFluxo.tsx`) e "Remover etapa" (`PainelDoNo.tsx`, `NosDoCanvas.tsx`) apagam na hora;
- botões de ícone medem 36 px (`Autenticado.tsx`, `AvisosPush.tsx`, `ListaDeEtapas.tsx`, `LigacaoComMais.tsx`) e o X do anexo mede 16 px (`Anexos.tsx`), contra os 44 px do resto;
- `Conversa.tsx:116` lê `offsetHeight` a cada render;
- campos de texto sem `name`, `autoComplete="off"` e `spellCheck={false}`, carregamentos sem texto ("Carregando…") e resultados assíncronos sem `aria-live` em várias telas.

Quem paga: o aluno no celular (toque, teclado, PWA no iOS com entalhe) e o atendente e o administrador que perdem trabalho
digitado. A revisão achou ~230 apontamentos; o triage abaixo separa o que é defeito real do que o revisor presumiu sem ler
`ui/` (ex.: `Alert` já tem `role="alert"` e `Conversation` já tem `role="log"`, então esses dois não entram).

Depois desta feature: o app respeita movimento reduzido e o tema do sistema na barra e no splash, cada erro de campo é lido pelo
leitor de tela, nenhum rascunho some sem aviso, e todo alvo de toque do celular mede 44 px.

## Flow

`single module - web/` (sem mudança de API). Reaproveita `Confirmar.tsx`, `Campo.tsx`, `acao.tsx` (`BotaoAcao`), `Editor.tsx`,
`index.css` e os tokens de AD-027/AD-034; não acrescenta biblioteca.

1. `index.css` e `index.html` (exists): camada global de movimento, toque, `color-scheme`, overscroll, `scroll-padding` e `theme-color` por tema (S1).
2. `Campo.tsx` (exists): passa a ligar o erro por `aria-describedby`/`role="alert"` e a focar o primeiro campo inválido; `Acesso.tsx` (exists) usa o mesmo caminho (S2).
3. `Editor.tsx` (exists): ganha a guarda de rascunho sujo, que abre `Confirmar.tsx` (exists) antes de fechar (door 1) (S3).
4. `Autenticado.tsx` (exists), `AvisosPush.tsx` (exists), `Anexos.tsx` (exists), canvas de fluxos (exists): alvos de 44 px e foco visível (S4).
5. `acao.tsx` (exists), `Tabela.tsx` (exists), `Simulador.tsx` (exists), `Indicadores.tsx` (exists): texto e região viva nos carregamentos e resultados (S5).
6. `Indicadores.tsx` (exists), `LinkDeAnexo.tsx` (exists), `Instituicoes.tsx` (exists), `Mcp.tsx` (exists), `Matriculas.tsx` (exists), `App.tsx` (exists): `Intl`, espaço inseparável, plural, semântica e 404 (S6).
7. `Moodle.tsx` (exists), `Conversa.tsx` (exists), `PreviaAparencia.tsx` (exists): três defeitos de comportamento isolados (S7).

## Impact

| Front | What changes |
| --- | --- |
| domain | termo existente: `Editor` ganha o estado "sujo"; quem chama (`Artigos`, `Documentos`, `Cadastros`, `Usuarios`, `Instituicoes`) passa `sujo` vindo do formulário |
| domain | termo existente: `Campo` (id do erro `${id}-erro`) é lido por `Acesso`, `Artigos`, `Documentos`, `Indicadores`; o id do erro muda, os testes que o procuram por id mudam junto |
| stored data | nada a migrar |
| visual | `theme-color` e `background_color` deixam de ser `#224fa7`/`#fff` fixos: seguem o tema; AD-032 (cor da instituição) continua sobrescrevendo o `theme-color` |
| decisões | AD-035 (anel de foco sem prometer 3:1) não muda; esta feature adiciona anel onde hoje só há troca de fundo, sem mexer em `--ring` |

## Relations

`None - no stored-data shape change`

## Surface

`None - nothing consumed outside`

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| padrão de rascunho sujo nos painéis de edição (precedente que as próximas telas vão copiar) | `<Editor sujo={form.formState.isDirty} …>`; fechar com `sujo` abre `Confirmar` com título `Descartar alterações?`, botões `Continuar editando` (foco inicial) e `Descartar` | `beforeunload` do navegador: não cobre o fechar do painel nem o Esc, só recarregar a aba |
| `theme-color` por tema | `<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">` e `<meta … content="#0a0a0a" media="(prefers-color-scheme: dark)">`; o app em `class="dark"`/`black` reescreve o valor sem `media` | uma só cor fixa: não acompanha o tema escolhido dentro do app |

- Nada mais nesta mudança é difícil de desfazer

## Criteria

### S1: base global de movimento, toque e tema (P1)

O app inteiro passa a obedecer às preferências do sistema, sem mexer em tela nenhuma.

**Acceptance Criteria**

1. WHILE `prefers-reduced-motion: reduce` está ativo, the system SHALL zerar `animation-duration`, `transition-duration` e `scroll-behavior` de todo elemento exceto `.animate-spin`
2. The system SHALL declarar `touch-action: manipulation` em `a`, `button`, `[role=button]`, `input`, `select`, `textarea`, `label` e `-webkit-tap-highlight-color: transparent` no `body`
3. WHILE o tema ativo é `dark` ou `black`, the system SHALL declarar `color-scheme: dark` em `:root`; no tema claro, `color-scheme: light`
4. The system SHALL declarar `overscroll-behavior: contain` em `[data-slot=sheet-content]`, `[data-slot=dialog-content]`, `[data-slot=popover-content]` e no corpo rolável do `Editor`
5. WHERE `pointer: fine` casa, the system SHALL declarar `overscroll-behavior: none` em `html`; em `pointer: coarse` o `html` mantém o padrão
6. The system SHALL declarar `scroll-padding-top: 3.5rem` e `scroll-padding-bottom: calc(var(--barra, 0px) + 1rem)` em `html`
7. WHEN o tema muda entre claro, escuro e preto, the system SHALL atualizar o `<meta name="theme-color">` para o `--background` do claro, o do escuro e `#000000` no preto (emenda 1: a barra combina com o fundo da página)
8. The `manifest` SHALL declarar `id: "/"`, `scope: "/"`, um ícone `purpose: "maskable"` e `background_color` igual ao `theme_color` claro
9. The `Topo` (`Autenticado.tsx`) e o cabeçalho do `Editor` SHALL somar `env(safe-area-inset-top)` ao padding superior

**Independent test:** abrir o app com o sistema em escuro e movimento reduzido; barra do navegador escura, sem animação de painel.

### S2: erro de campo lido e foco no primeiro erro (P1)

**Acceptance Criteria**

10. WHEN um campo tem erro, the `Campo` SHALL renderizar o erro com `id="<id>-erro"` e `role="alert"`, e o controle SHALL declarar `aria-describedby` com o id da dica e o id do erro
11. WHEN o envio do formulário falha na validação, the system SHALL mover o foco para o primeiro campo com erro, em Acesso, Artigos, Documentos, Instituições, Usuários e Cadastros
12. IF `Acesso.tsx` renderiza dois campos com erro, THEN the system SHALL gerar ids de erro distintos (`cpf-erro`, `senha-erro`)
13. The campos de CPF, e-mail, URL, protocolo (`ONE-n`), slug, busca e título SHALL declarar `name`, `autoComplete="off"` (exceto login: `username`/`current-password`/`new-password`) e `spellCheck={false}` nos de código, e-mail e URL
14. The campos de e-mail, telefone e URL SHALL declarar `type="email"`, `type="tel"` e `type="url"`
15. The placeholders de exemplo SHALL terminar em `…` e mostrar um exemplo (`Ex.: ONE-123…`, `Ex.: 000.000.000-00…`)

**Independent test:** em Acesso, enviar vazio; leitor de tela anuncia os dois erros e o foco cai no CPF.

### S3: nenhum trabalho digitado ou apagado sem aviso (P1)

**Acceptance Criteria**

16. WHEN o `Editor` está sujo e a pessoa toca fora, aperta Esc ou toca "Cancelar", the system SHALL abrir `Confirmar` com o título `Descartar alterações?` em vez de fechar
17. WHEN a pessoa escolhe `Continuar editando`, the system SHALL manter o `Editor` aberto com os valores digitados
18. WHEN o `Editor` não está sujo, the system SHALL fechar sem pedir confirmação
19. WHEN a pessoa escolhe "Descartar rascunho" do fluxo, the system SHALL abrir `Confirmar` com o botão `Descartar rascunho` e só então chamar o DELETE
20. WHEN a pessoa escolhe "Remover etapa" no canvas ou no painel da etapa e a etapa tem setor ou prazo (todas têm destino, então ele não decide; emenda 1), the system SHALL abrir `Confirmar` antes de remover
21. WHEN o campo de resposta do chamado tem texto não enviado e a pessoa navega para outra rota, the system SHALL abrir a guarda de navegação com `Descartar resposta?`

**Independent test:** abrir "Novo artigo", digitar, tocar fora: aparece a confirmação; "Continuar editando" mantém o texto.

### S4: alvos de toque de 44 px e foco visível (P1)

**Acceptance Criteria**

22. WHILE o ponteiro é `coarse` ou a largura é menor que 768 px, the botões de ícone de `Topo`, `AvisosPush`, `ListaDeEtapas`, `LigacaoComMais`, o X de `Anexos` e o `Handle` do canvas SHALL medir no mínimo 44×44 px
23. WHEN um botão ou link recebe foco por teclado em `Gerir`, `Conta`, `AdicionarEtapa`, `LigacaoComMais`, `CoresProntas`, a linha de perguntas sugeridas do `Assistente`, o disclosure de `Conversa` e os links de `BarraDeAbas`, the system SHALL mostrar o anel `focus-visible:ring-2 ring-ring`
24. The `SheetClose` de `Editor` SHALL usar `focus-visible:ring-2` no lugar de `focus:ring-2`
25. WHILE `CoresProntas` está em foco, the setas SHALL mover a seleção entre as cores (um só `tab stop`)
26. The ícones decorativos de `Conta` SHALL declarar `aria-hidden="true"`

**Independent test:** no emulador 360×780, medir cada botão; Tab por `Conta` mostra o anel.

### S5: carregamento e resultado anunciados (P2)

**Acceptance Criteria**

27. WHILE `BotaoAcao` está pendente, the system SHALL trocar o rótulo para o gerúndio com reticências (`Salvando…`, `Enviando…`, `Consultando…`) e manter o `aria-busy="true"`
28. The estados `Spinner` soltos de `Autenticado`, `Chamados`, `ChamadoDetalhe`, `Tabela`, `AbaIntegracao`, `Aparencia` e `EdicaoDoFluxo` SHALL vir com `role="status"` e o texto `Carregando…` (visível ou `sr-only`)
29. WHEN o `Simulador` devolve o resultado, the system SHALL anunciá-lo em região `aria-live="polite"`
30. WHEN o botão de copiar de `Moodle` e `Mcp` muda de rótulo, the system SHALL anunciar o novo rótulo em `aria-live="polite"`
31. WHEN a situação de um documento passa de "Indexando" para "Indexado" ou "Falhou", the system SHALL anunciar em `aria-live="polite"`
32. IF a cópia para a área de transferência falha, THEN the system SHALL mostrar o aviso `Não foi possível copiar. Selecione o texto e copie à mão.`
33. IF `Simulador` não tem curso e semestre, THEN the system SHALL manter "Simular" habilitado e mostrar a dica `Escolha o curso e o semestre.` (o botão só desabilita durante a requisição)

**Independent test:** com leitor de tela, salvar um formulário; ouvir "Salvando…" e depois o aviso de sucesso.

### S6: formatação, semântica e navegação (P2)

**Acceptance Criteria**

34. The system SHALL formatar percentuais, horas e variação de `Indicadores` com `Intl.NumberFormat('pt-BR')`
35. The system SHALL formatar o tamanho de `LinkDeAnexo` em KB ou MB com `Intl.NumberFormat('pt-BR')` (20480 KB vira `20 MB`)
36. The system SHALL usar espaço inseparável entre número e unidade em "10 MB", "20 MB", "12 h", "512 px", "3 MB"
37. The system SHALL flexionar o plural de "setor", "matrícula" e "administrador" com `Intl.PluralRules('pt-BR')` (`1 setor`, `2 setores`)
38. The system SHALL formatar datas de `Instituicoes` e `Mcp` com `Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })`, sem `slice` de texto formatado
39. The `<th>` de ações vazio de `Tabela` SHALL conter `<span class="sr-only">Ações</span>`
40. The métricas de `Indicadores` SHALL usar `<dl>`, `<dt>`, `<dd>`; a lista de ranking SHALL declarar `role="list"`
41. The `<img>` de logo, foto de login, avatar, `Sigla`, `CampoImagem` e as imagens da `PreviaAparencia` SHALL declarar `width` e `height`
42. WHEN a rota sob `/:slug` não existe, the system SHALL mostrar a página `Página não encontrada` com `h1` e link `Voltar ao início`
43. WHEN a rota muda, the system SHALL atualizar `document.title` para `<Rota> · <Instituição>` e mover o foco para `#conteudo`
44. The nome da marca, o protocolo `ONE-n`, o slug, CPF, e-mail e telefone exibidos, em qualquer tela e dentro de frases, SHALL declarar `translate="no"` num `<span>` em volta só do token
45. The citações em texto SHALL usar aspas curvas “ ” no lugar de `"` e `«»`
46. The enums `ATIVO`, `EXPIRADO`, `REVOGADO` de `Mcp` SHALL aparecer como `Ativo`, `Expirado`, `Revogado`

**Independent test:** `1 setor` e `2 setores` em Instituições; `20 MB` no anexo de 20480 KB.

### S7: três defeitos de comportamento (P1)

**Acceptance Criteria**

47. WHEN `Moodle` rebusca `dados` com o formulário sujo, the system SHALL manter o que a pessoa digitou
48. WHEN a janela de `Conversa` é redimensionada, the system SHALL decidir "mais de uma tela" por `ResizeObserver`, sem ler `offsetHeight` a cada render
49. WHILE `PreviaAparencia` está na tela, the system SHALL marcá-la com `inert` e `aria-hidden="true"`, e seus links `tel:` e `mailto:` SHALL ser `<span>`
50. The textos de usuário da `PreviaAparencia` (nome, e-mail, telefone, perguntas) SHALL declarar `min-w-0` e `break-words`

**Independent test:** em `Moodle`, digitar e trocar de janela; o texto fica.

### S8: listas longas sem custo de renderização (P2)

**Acceptance Criteria**

51. WHILE `Tabela` renderiza linhas ou cartões, the system SHALL declarar `content-visibility: auto` e `contain-intrinsic-size: auto 56px` em cada linha de dados
52. WHILE a lista de Usuários, Chamados, Artigos ou Documentos passa de 50 itens, the system SHALL renderizar os 50 primeiros e o botão `Mostrar mais 50` até esgotar a lista

**Independent test:** com 120 usuários de teste, a tela mostra 50 e o botão `Mostrar mais 50` leva a 100.

### S9: estado de tela na URL (P2)

**Acceptance Criteria**

53. WHEN a pessoa muda o período de `Indicadores`, the system SHALL gravar `de` e `ate` na query string (`?de=2026-11-01&ate=2026-11-30`) e restaurar o período ao recarregar
54. WHEN a pessoa digita na busca de Usuários ou Cadastros (Chamados não tem busca; emenda 1), the system SHALL gravar `q` na query string com `replace`, sem empilhar histórico
55. WHEN a pessoa abre o `Editor` de Artigos, Documentos, Cadastros ou Usuários, the system SHALL gravar `editar=<id>` (ou `editar=novo`) na query string e reabrir o painel ao recarregar
56. WHEN a pessoa troca a aba de `Integracoes`, the system SHALL usar `replace`, como `Cadastros`
57. IF a query string traz um valor inválido (data malformada, id inexistente), THEN the system SHALL ignorá-lo e mostrar a tela sem filtro

**Independent test:** em Indicadores, escolher um período, recarregar: o período continua.

### S10: confirmação onde o efeito chega a outra pessoa (P2)

**Acceptance Criteria**

58. WHEN a pessoa escolhe "Ativar" em Artigos, the system SHALL abrir `Confirmar` com o texto `O assistente passa a usar este artigo nas respostas aos alunos.` e o botão `Ativar artigo`
59. WHEN o atendente escolhe "Assumir" no chamado, the system SHALL abrir `Confirmar` com o botão `Assumir chamado`
60. WHEN o atendente escolhe "Resolver" ou o aluno escolhe "Confirmar resolução", the system SHALL abrir `Confirmar` com o botão `Resolver chamado`
61. WHEN o aluno escolhe "Rejeitar resolução", the system SHALL abrir `Confirmar` com o botão `Rejeitar resolução`

**Independent test:** em um chamado aberto, tocar "Assumir": aparece a confirmação e nada muda até confirmar.

### S11: rótulos específicos (P3)

**Acceptance Criteria**

62. The system SHALL rotular o botão de criar de Artigos como `Novo artigo`, de Documentos como `Novo documento`, de Usuários como `Novo usuário`, de Cadastros como `Novo setor` ou `Nova categoria` conforme a aba
63. The `Editor` SHALL receber o rótulo do envio de cada chamador: `Salvar artigo`, `Salvar usuário`, `Salvar setor`, `Salvar categoria`, `Enviar documento`, `Salvar nova senha` (Acesso)
64. The diálogo de transferência do `Assistente` SHALL usar `Falar com atendente` e `Voltar à conversa` no lugar de `Confirmar` e `Cancelar`
65. The botão "Encerrar" do `Assistente` SHALL ser `Encerrar conversa`
66. The `Confirmar` padrão SHALL usar `Cancelar` como rótulo de recusa quando a ação não é destrutiva, e `Continuar editando` ou `Voltar` quando é

**Independent test:** nenhum botão com o texto exato `Novo`, `Salvar` ou `Confirmar` isolado nas telas listadas.

## Out of scope

| Excluded | Why |
| --- | --- |
| Title Case em botões e títulos | a regra é do inglês; o app usa maiúscula só na primeira letra em pt-BR (AGENTS.md, textos em português) |
| Paginação no servidor | S8 pagina só no cliente; mudar a API é capacidade nova |
| Enter do chat do assistente | segue enviando (decisão do usuário); não muda |
| `preload` de fontes e subset latino | ganho de desempenho sem defeito medido; fica para uma feature de desempenho |
| Fallback `<noscript>` e tela de carregamento do `index.html` | sem requisito de produto |
| `apple-mobile-web-app-*` e `screenshots` do manifest | cosmético de instalação |
| Manifest por instituição gerado pela API (`ManifestoInstituicao.cs`, AD-032): `id`, ícone `maskable`, cores por tema | exige mudança de API; vira feature própria |
| Mexer em `web/src/ui/` | código do shadcn (AGENTS.md); `Alert` e `Conversation` já têm `role` |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| `Ativar` artigo e `Assumir`/`Resolver` chamado continuam imediatos | sem confirmação | reversíveis por `Arquivar` e por reabrir; confirmar tudo gera fadiga | n |
| Aspas curvas só em texto de interface, não em código nem em dados | S6 critério 45 | dados do usuário não se reescrevem | n |
| `touch-action: manipulation` não é aplicado a `html` | só nos controles | evita bloquear pinça no conteúdo | n |
| Alvo de 44 px só abaixo de 768 px ou ponteiro `coarse` | desktop mantém 36 px | alinhado a `max-md:size-11` e `pointer-coarse:size-11` já usados | n |
| Lista longa (S8) usa `content-visibility: auto` mais "Mostrar mais 50" no cliente | sem biblioteca de virtualização | AGENTS.md: sem dependência nova sem necessidade; a API não muda | n |
| Enter do chat do assistente continua enviando | sem mudança | decisão do usuário | y |
| O triage dos 4 revisores é a lista; apontamentos "baixa" sem critério aqui não entram | sem varredura 2 | evita escopo aberto | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| all screens | celular 360×780 | AC 22, 9, 6 |
| all screens | celular deitado 844×390 | AC 9, 6; Esc e rolagem do `Editor` com `h-dvh` seguem como hoje (existing) |
| all screens | teclado aberto | AC 6 (`scroll-padding-bottom` evita a barra cobrir o foco) |
| all screens | toque | AC 2, 22, 5 |
| screen `Usuarios`, `Chamados`, `Artigos`, `Documentos` | lista longa | AC 51, 52
| screen `Indicadores`, `Usuarios`, `Chamados`, `Cadastros` | estado na URL | AC 53, 54, 57
| screen `Artigos`, `ChamadoDetalhe` | destructive confirms | AC 58, 59, 60, 61
| screen `Editor` (painel) | estado sujo, destrutivo confirma | AC 16, 17, 18 |
| screen `Acesso` | error state | AC 10, 11, 12 |
| screen `Simulador` | disabled sem motivo | AC 33 |
| screen `Indicadores` | empty state | existing - "Sem atendimentos neste período" |
| screen `Indicadores` | loading state | AC 27, 28 |
| screen `PaginaDoFluxo` | unauthorised e error | existing - `ErroDe` com retry |
| screen `Página não encontrada` | empty state | AC 42 |
| screen `EdicaoDoFluxo` | destructive confirms | AC 19 |
| screen `Autenticado` (shell) | loading, error | AC 28; error existing - `ErroDaSessao` |
| all new components | no API surface | n/a - feature só de front, sem rota nova |

## Sources

- Web Interface Guidelines (Vercel) - `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`, lista de regras aplicada pelos 4 revisores
- `.specs/features/revisao-ux/pesquisa.md` - alvo de 44 px e 16 px de campo no iOS (WCAG 2.5.5, HIG), já registrados




