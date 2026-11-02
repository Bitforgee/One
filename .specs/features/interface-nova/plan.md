# Interface nova: shadcn/ui, Tailwind CSS e Lucide no lugar do Bootstrap, sem mudar comportamento

## Problem

O `web/` é Bootstrap 5.3 padrão, sem nenhum CSS próprio (AD-004, AD-020): azul `#0d6efd`, cartões
cinza, fonte do sistema, nenhuma marca do One. As 15 telas funcionam e estão presas por 99 testes
Vitest e 11 e2e (`refatoracao-solid`, lote 2), mas:

- **a banca de 20/11 vê primeiro a interface**, e as três telas que ela mais vê (Assistente,
  detalhe do chamado, indicadores) parecem um formulário de exemplo do Bootstrap. O chat do
  Assistente é uma pilha de `Card`; os indicadores são 13 números soltos e duas listas, sem
  nenhum gráfico;
- **não há tema escuro nem identidade visual**: logo e cores do One ainda não existem (o grupo
  ficou de entregar até 04/11; sem isso, a proposta desta feature vale);
- **o estado de cada tela é feito à mão**: `useAcao`, `useLista`, `useBase`, `useListas` e o
  `setInterval` de `useChamado` repetem carregar, erro e recarregar em 5 formas diferentes;
- **a navegação a 360 px é o `Navbar.Collapse` do Bootstrap**, que empurra a tela para baixo
  ao abrir.

Quem paga: o grupo na banca (nota de interface e de produto) e o aluno no celular. Evidência: a
decisão do usuário em 02/11 (AD-020 e a tabela "Interface nova" do `ROADMAP.md`); nenhuma medida
de uso, porque não há produção.

**O que muda quando isto estiver pronto:** as 15 telas usam shadcn/ui, Tailwind CSS v4, Lucide e
Inter, com tema claro e escuro, um menu em gaveta (Vaul) a 360 px, o chat do Assistente com os
componentes visuais do AI Elements, um gráfico (Recharts) e uma tabela (TanStack Table) nos rankings
dos indicadores, um calendário (React DayPicker) ao lado dos campos de data, o editor Tiptap só de
texto puro na resposta do artigo, e os dados lidos por TanStack Query. **Nada muda no comportamento:** as mesmas chamadas à API, as mesmas rotas,
os mesmos textos (fora os novos listados em `## Screens`), as mesmas permissões; os testes
existentes continuam passando e as barreiras do AD-018 continuam valendo.

## Flow

Reusa o que existe em vez de duplicar: `api()` em `web/src/api.ts` continua sendo o único caminho
até a API (o `ErroApi` com o `detail` do Problem Details vira o erro do TanStack Query), as rotas do
`App`, as 6 fatias do AD-017, a configuração do `vite-plugin-pwa`, a suíte existente como rede de
segurança, o `asserts_preservados.py` e o `mutator_windows/mutator_web.sh` do `refatoracao-solid`.

1. `web/src/main.tsx` (exists) - importa `web/src/index.css` (door 2) no lugar do CSS do Bootstrap
   e do `bootstrap-icons`, e registra o service worker como hoje
2. `App` (exists) - envolve as mesmas rotas em `QueryClientProvider` (door 7), `ThemeProvider`
   (door 10), `MotionConfig` e `Toaster` (door 13); nenhuma rota muda
3. `Autenticado` (exists) - lê `/api/auth/me` com `useQuery`; cabeçalho com um único `<nav>` e,
   abaixo de 640 px, o menu em gaveta Vaul (door 3, componente `drawer` em `web/src/ui/`)
4. telas das 6 fatias (exists) - compõem os componentes de `web/src/ui/` (door 3, door 5, door 6,
   door 8, door 11, door 14, door 15, door 16); leem com `useQuery` e gravam com `useMutation` em volta de `api()` (exists)
5. `web/src/chamado.ts` (exists) - `useChamado` vira `useQuery` com `refetchInterval` de 15 s: a
   door 18 do `mvp-one` não muda aqui (a troca pelo SignalR é o AD-022, outra feature)
6. out: as mesmas requisições HTTP e os mesmos textos; `vite build` grava em `api/wwwroot` (exists)
   com o precache do `vite-plugin-pwa` (exists), sem nenhum `/api/*`

## Impact

| Front | What changes |
| --- | --- |
| decisões | AD-004 (Bootstrap) passa a `superseded by` o AD-020 quando a S9 entrar; AD-017 ganha a pasta compartilhada `web/src/ui/` (door 3); AD-018 passa a excluir `web/src/ui/` do `dryer` e do `mutator` (door 4). As três mudanças entram no `STATE.md` como um AD novo na aprovação deste plano |
| domain | nenhum termo novo nem alterado: o `Estados`, os papéis e os nomes das telas ficam iguais |
| stored data | nada no servidor. No navegador entra a chave `one-tema` no `localStorage` (door 10), valor `light`, `dark` ou `system`; nenhum dado pessoal |
| contrato HTTP | nada: nenhuma rota, método, corpo ou campo muda; os testes que afirmam URL e corpo (`chamadas`) seguem iguais |
| testes: asserções presas a classes do Bootstrap | 29 linhas de asserção e 17 linhas auxiliares (`closest('.card')`, `querySelector('.small')`) em 10 arquivos afirmam classes ou estrutura do Bootstrap (`alert-danger`, `spinner-border`, `btn-primary`, `btn-outline-primary`, `.card`, `.list-group-item`, `ms-auto`/`me-auto`, `bg-primary-subtle`, `bg-warning-subtle`, `bg-dark`, `hstack gap-1`, `.small`, `div.border-top`, `bi-*`, `.row` com `row-cols-*`). Cada uma troca de seletor mantendo a mesma afirmação, com a justificativa por linha (AC 2). `ms-auto`, `me-auto`, `bg-primary-subtle` e `bg-warning-subtle` continuam iguais: os dois primeiros existem no Tailwind v4 e os dois últimos viram tokens da paleta (`## Visual`) |
| testes: decisões que esta feature substitui | `acesso.test.tsx` "dependências do kit de interface" afirma as versões de `bootstrap`, `react-bootstrap` e `bootstrap-icons` (AD-004); `test/estrutura.test.ts` aceita só as 6 fatias e `test` como pastas (AD-017). As duas mudam (door 9, door 3), cada linha trocada registrada em `seletores.md`: escolha do usuário em 02/11 |
| testes: infraestrutura | `web/src/test/setup.ts` ganha um `ResizeObserver` falso: o jsdom não tem, e o `use-stick-to-bottom` (Conversation) e o `ResponsiveContainer` do Recharts usam. Nenhuma asserção muda por isso |
| features em paralelo | SignalR (06–07/11) mexe no `useChamado` de `web/src/chamado.ts`, e Web Push (07–08/11) no service worker. Quem entrar depois rebaseia; com o TanStack Query, o aviso do SignalR vira um `invalidateQueries(['chamado', numero])`, sem `setInterval` |
| pacote e PWA | saem `bootstrap`, `react-bootstrap`, `bootstrap-icons` (S9); entram as dependências de shadcn/ui, Tailwind, Lucide, Vaul, Motion, Recharts, Sonner, React Hook Form, Zod, React Dropzone, TanStack Query, TanStack Table, React DayPicker, Tiptap e Inter, todas com versão exata como hoje. O precache cresce (JS do Radix, Motion e Recharts, mais os `.woff2` do Inter); o Recharts vai num chunk separado (AC 33) |
| manifesto | `theme_color` do manifesto e `<meta name="theme-color">` trocam `#0d6efd` pelo hex do `--primary` claro (S9); o e2e do manifesto afirma só nome e ícones |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside: nenhuma rota nova nem assinatura alterada; as 15 rotas de tela do
`App` ficam iguais

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. Tailwind CSS v4 pelo plugin do Vite | `npm i -E tailwindcss @tailwindcss/vite`; em `vite.config.ts`, `import tailwindcss from '@tailwindcss/vite'` e `plugins: [react(), tailwindcss(), VitePWA({...})]`; `components.json` com `"tailwind": { "config": "", "css": "src/index.css", "cssVariables": true }` e `"style": "new-york"` (os dois não mudam depois do `init`) | Tailwind v3 com PostCSS e `tailwind.config.js`: o shadcn/ui documenta v4 para projetos novos (`tailwind.config` em branco no v4) e os componentes atuais do registro usam sintaxe v4 |
| 2. migração tela a tela com o Bootstrap numa camada de cascata | início de `web/src/index.css`: `@layer theme, base, bootstrap, components, utilities;` depois `@import "bootstrap/dist/css/bootstrap.min.css" layer(bootstrap);` depois `@import "tailwindcss";`; o `bootstrap-icons` continua importado no `main.tsx` até a S9; `<body class="bg-background text-foreground font-sans">` no `index.html`. A S9 apaga a linha do Bootstrap e a camada | (a) tudo de uma vez: não há versão parcial para o AVA de 13/11 nem para o corte de 16/11, e uma falha no fim deixa as 15 telas sem entrega; (b) Bootstrap fora de camada: CSS sem camada vence qualquer camada, e o reboot do Bootstrap (`h1`, `a`, `label`, `button`) ganharia das utilidades do Tailwind nas telas já migradas; (c) `@import "tailwindcss" prefix(tw)`: prefixo em toda classe para sempre, ou uma segunda varredura no fim |
| 3. pasta `web/src/ui/` para código copiado dos registros (precedente para toda feature do `web/`) | `components.json`: `"aliases": { "components": "@/ui", "ui": "@/ui", "utils": "@/ui/utils", "lib": "@/ui", "hooks": "@/ui" }`; `tsconfig.json`: `"paths": { "@/*": ["./src/*"] }`; `vite.config.ts`: `resolve: { alias: { '@': path.resolve(__dirname, './src') } }` com `@types/node`. Em `ui/` só entra código copiado do shadcn/ui e do AI Elements, editado apenas para tirar dependência ou traduzir texto (`Close` vira `Fechar`, `Loading` vira `Carregando`); código do One fica nas fatias ou na raiz. `estrutura.test.ts` aceita `test` e `ui` além das 6 fatias, e falha se um arquivo de `ui/` importar uma fatia ou um módulo da raiz | (a) arquivos soltos na raiz de `src/`: a regra de "2 ou mais fatias importam" do C35 reprova `drawer`, `sonner` e o `ThemeProvider` (só a raiz usa), e o CLI do shadcn reescreve imports com o alias, que o teste não conta; (b) cópia por fatia: duplicação que o `dryer` reprova; (c) o padrão `@/components/ui` + `@/lib/utils`: duas pastas novas fora das fatias em vez de uma |
| 4. barreiras do AD-018 sobre o código copiado | `crapper --use-existing-coverage -s src --threshold 9.99` continua sobre `src` inteiro, `ui/` incluído; `dryer` e `mutator` rodam só sobre as 6 fatias e os arquivos da raiz: `dryer -s src/acesso -s src/assistente -s src/chamados -s src/conhecimento -s src/indicadores -s src/administracao --threshold 0.8 src/App.tsx src/Autenticado.tsx src/api.ts src/chamado.ts src/datas.ts src/sessao.ts src/Opcoes.tsx`, e o `mutator` com os mesmos caminhos pelo `mutator_web.sh` | `dryer` e `mutator` também em `ui/`: o `Dialog` e o `Drawer` do shadcn têm cabeçalho e rodapé quase iguais (candidato acima de 0.8), e matar mutantes nas classes das variantes pede testes de string de CSS; os dois obrigam a bifurcar o código do registro e impedem `shadcn add --overwrite` |
| 5. controles nativos onde os testes e o celular dependem deles | todo `select` é o `NativeSelect` do shadcn (`<select>` nativo); todo campo de data continua `<input type="date">` com o mesmo rótulo, e o DayPicker só entra ao lado dele (door 15); todo campo de arquivo continua um `<input type="file">` com o mesmo `<label>` | `Select` do Radix: não é um `<select>`, então `userEvent.selectOptions` (11 usos) e as listas de `option` (6 asserções) deixam de funcionar, e a 360 px perde o seletor do sistema; `DatePicker` (Popover + React DayPicker): os 4 campos de data deixam de aceitar a data digitada que os testes usam |
| 6. confirmação é `Dialog`, nunca `AlertDialog` | `Dialog` do shadcn (`role="dialog"`) para Encaminhar, Cancelar solicitação, Falar com atendente, Encerrar, Arquivar, Desativar e Importar; o menu a 360 px é o `Drawer` (Vaul, também `role="dialog"`) | `AlertDialog`: `role="alertdialog"`, e 51 consultas `findByRole('dialog')`/`queryByRole('dialog')` deixariam de achar a confirmação |
| 7. TanStack Query como única camada de dados das telas | `npm i -E @tanstack/react-query`; no `App`, `const [cliente] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, networkMode: 'always' }, mutations: { networkMode: 'always' } } }))`; `queryFn` e `mutationFn` chamam `api()`; o erro mostrado é o `message` do `ErroApi`, como hoje; `useAcao`, `useLista`, `useBase` e `useListas` saem | (a) cliente no nível do módulo: o cache vaza entre os testes, que montam o `App` um por um; (b) os padrões da biblioteca: 3 novas tentativas com espera exponencial (o teste de erro esperaria ~7 s), releitura ao focar a janela (o teste dos indicadores afirma exatamente 1 chamada) e, sem rede, consulta pausada em vez do `Alert` de erro que a tela mostra hoje |
| 8. AI Elements só como componentes visuais | copiar `conversation` (dependências `lucide-react` e `use-stick-to-bottom`) e `message` do registro para `web/src/ui/`; `message.tsx` fica só com `Message` e `MessageContent`, `from` tipado como `'user' \| 'assistant'`; o texto do modelo vai como texto puro com `whitespace-pre-wrap`; sem `ConversationScrollButton`. `package.json` sem `ai`, `@ai-sdk/react` nem `streamdown` | o `message` como vem do registro: depende de `ai` (tipo `UIMessage`) e de `streamdown`, e o `MessageResponse` interpreta markdown, o que muda o texto que o aluno vê hoje (AD-012) e traz o renderizador de markdown e o KaTeX ao bundle; o `ConversationScrollButton` aparece como botão a mais quando a conversa não está no fim |
| 9. o teste de dependências passa a fixar a stack nova | em `acesso.test.tsx`, "dependências do kit de interface" afirma a versão exata de `tailwindcss`, `@tailwindcss/vite`, `lucide-react`, `@tanstack/react-query` e `vaul`, mantém `react-router` 8 e `vite-plugin-pwa` 2.0.0, e afirma a ausência de `bootstrap`, `react-bootstrap`, `bootstrap-icons`, `next-themes`, `ai`, `@ai-sdk/react` e `streamdown` (as três primeiras só a partir da S9) | apagar o teste: remove asserções; manter o Bootstrap instalado só para o teste passar: dependência morta que contradiz o AD-020 |
| 10. tema pelo `ThemeProvider` do shadcn para Vite | `web/src/ui/theme-provider.tsx` igual ao da documentação do shadcn, usado como `<ThemeProvider defaultTheme="light" storageKey="one-tema">` enquanto houver tela com `react-bootstrap`, e `defaultTheme="system"` a partir da S9; classe `light`/`dark` no `<html>` | `next-themes`: feito para Next.js; o shadcn documenta o próprio provider para Vite (AD-020) |
| 11. React Dropzone sobre o campo de arquivo nativo | `<input {...getInputProps({ id, 'aria-label': undefined, style: undefined, className: 'sr-only' })} />` dentro de `getRootProps()`, com o `<label htmlFor={id}>` de hoje; `accept` com as mesmas extensões de hoje | `getInputProps()` sem ajuste: ele grava `aria-label: "file upload"` (o nome acessível vira inglês e ignora o `<label>`) e um estilo de 0×0 px, que o Playwright não vê, e o e2e `getByLabel('Arquivo CSV').waitFor()` nunca termina |
| 12. Inter servida pelo próprio app | `npm i -E @fontsource-variable/inter`; `import '@fontsource-variable/inter'` no `main.tsx`; `--font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif` no `@theme` | Google Fonts por CDN: cada abertura manda o IP do aluno a terceiro (LGPD), a fonte fica fora do precache e falha sem rede |
| 13. Sonner só para sucesso, montado dentro do `App` | `<Toaster />` do shadcn dentro do `App` com o rótulo do contêiner em português (`containerAriaLabel="Notificações"`, sem botão de fechar); `toast.success(...)` só nos sucessos listados em `## Screens`; todo erro continua no `Alert` da tela | (a) erro em toast: o toast some sozinho, e os testes e o aluno dependem do `Alert` `role="alert"` no lugar da ação; (b) `Toaster` no `main.tsx`: os testes montam o `App`, nunca veriam o toast, e o texto do toast vira mutante sobrevivente |
| 14. Tiptap só de texto puro na resposta do artigo (o texto gravado é o que a conferência literal do AD-012 compara) | `npm i -E @tiptap/react @tiptap/pm @tiptap/extension-document @tiptap/extension-paragraph @tiptap/extension-text @tiptap/extensions`; `useEditor({ extensions: [Document, Paragraph, Text, CharacterCount.configure({ limit: 8000 })], content: { type: 'doc', content: texto.split('\n').map((l) => ({ type: 'paragraph', content: l ? [{ type: 'text', text: l }] : [] })) }, editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': 'resposta-artigo-rotulo' } }, onUpdate: ({ editor }) => setResposta(editor.getText({ blockSeparator: '\n' })) })`; o `<label id="resposta-artigo-rotulo">Resposta</label>` fica; o campo `resposta` do `POST`/`PUT` continua uma string. Sem marca e sem outro nó no esquema: formatação colada cai. O servidor (`ArtigoRotas`) não muda e grava a string recebida, então o texto enviado é o texto conferido | (a) `StarterKit`: traz negrito, listas e títulos, que o `getText` achata de forma diferente do que o administrador vê; (b) gravar `getHTML()` ou `getJSON()`: a marcação entraria no texto que a conferência literal compara, e todo trecho com tag deixaria de conferir; (c) manter a `Textarea`: contraria a decisão do usuário de 02/11 |
| 15. React DayPicker ao lado dos campos de data, nunca no lugar | componentes `calendar` e `popover` do shadcn; em Indicadores um botão "Escolher período no calendário" e em Artigos "Escolher validade no calendário", cada um abre um `Popover` com `<Calendar mode="range" locale={ptBR} selected={...} onSelect={...} />` que escreve `aaaa-mm-dd` nos dois `<input type="date">` existentes ("De"/"Até", "Válido de (opcional)"/"Válido até (opcional)"); nada é consultado nem gravado ao escolher: Indicadores continua consultando só no "Consultar", Artigos só no "Salvar". `ptBR` vem de `react-day-picker/locale` na v9 instalada pelo registro do shadcn (na v10 o pacote passa a `@daypicker/react`: conferir na instalação) | `DatePicker` no lugar do campo: os testes digitam `2026-10-01` no campo "De" e afirmam `toHaveValue('2026-11-01')` em "Válido de (opcional)"; sem o `<input>`, essas afirmações perdem o elemento, e a 360 px perde o seletor de data do sistema |
| 16. TanStack Table só onde a lista já é uma tabela de 2 colunas | `useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })` com o `Table` do shadcn (`<table>`, `<th>`, `<td>`), na tabela de erros de Matrículas ("Linha", "Motivo") e nos dois rankings dos Indicadores ("Categoria", "Total"); as células renderizadas pela API da versão instalada (`flexRender` na v8, `table.FlexRender` na v9) | TanStack Table nas listas em cartão (Fila, Minhas solicitações, Artigos, Documentos, Usuários, Cadastros): a 360 px uma tabela de 4 a 6 colunas exige rolagem horizontal (AC 9) ou um segundo DOM por largura, que o jsdom (sem media query) mostra junto e faz `getByText('ONE-1')` achar dois; e as linhas são links (`closest('a')` em `listas.test.tsx`) e botões com filhos (`linhas()` em `cadastros.test.tsx`), e um `<tr>` não é nem um nem outro |

- Nothing else in this change is hard to reverse: paleta, raio, arranjo de cada tela, animações e
  textos novos se mudam com outro commit; nenhuma rota, campo JSON ou dado gravado no servidor muda.

## Visual

Fonte de referência **binding**: paleta, raio e fonte aceitos pelo usuário em 02/11. Toda cor
fica em variável CSS (`:root` e `.dark` em `index.css`, expostas ao Tailwind por `@theme inline`);
nenhum componente usa cor literal. Se o grupo entregar logo e cores, só os valores de `--primary*`
e o logo mudam; o resto fica.

**Estilo de referência:** mensageiro de suporte com o chat em primeiro plano: uma coluna, conversa
rolando, campo de mensagem fixo embaixo e o botão de falar com uma pessoa sempre visível. Base
neutra do shadcn/ui `new-york` com um único azul de marca. Nenhuma tela de produto existente é
copiada; a referência é o arranjo genérico de chat do exemplo do AI Elements, não um produto.

**Tokens (oklch), claro / escuro:**

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--background` | `oklch(1 0 0)` | `oklch(0.17 0.02 265)` | fundo |
| `--foreground` | `oklch(0.21 0.02 265)` | `oklch(0.97 0 0)` | texto |
| `--primary` | `oklch(0.49 0.17 262)` (azul One) | `oklch(0.70 0.14 262)` | botão principal, links, selo do estado |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.17 0.02 265)` | texto sobre o primário |
| `--primary-subtle` | `oklch(0.95 0.03 262)` | `oklch(0.28 0.06 262)` | balão do aluno (`bg-primary-subtle`) |
| `--muted` / `--muted-foreground` | `oklch(0.967 0.003 265)` / `oklch(0.50 0.02 265)` | `oklch(0.24 0.02 265)` / `oklch(0.72 0.02 265)` | balão do assistente e do atendente, textos pequenos |
| `--warning-subtle` | `oklch(0.96 0.05 90)` | `oklch(0.32 0.06 85)` | nota interna (`bg-warning-subtle`) |
| `--success` | `oklch(0.55 0.14 155)` | `oklch(0.70 0.14 155)` | ATIVO, Indexado, Sim, Confirmar resolução |
| `--destructive` | `oklch(0.577 0.245 27.325)` (padrão do shadcn) | `oklch(0.704 0.191 22.216)` | erro, Arquivar, Desativar, Cancelar solicitação |
| `--chart-1`, `--chart-2` | `--primary` e `oklch(0.65 0.12 200)` | `--primary` escuro e `oklch(0.75 0.11 200)` | barras dos rankings |
| `--radius` | `0.625rem` | igual | cantos (padrão do shadcn) |

Fonte Inter Variable (door 12); corpo 16 px a 360 px (evita o zoom do iOS em campo), títulos
`text-xl font-semibold`. Ícones Lucide no lugar dos `bi-*` com o mesmo significado: `MessageCircle`,
`ListChecks`, `Inbox`, `BookText`, `FileText`, `ChartColumn`, `Users`, `Upload`, `Settings`,
`LogOut`, `Menu`, `Send`, `Hand`, `ShieldAlert`, `Paperclip`, `Plus`, `Sun`, `Moon`. Wordmark
provisório: "One" em Inter 600 na cor `--primary`; os ícones do PWA em `web/public/icons/` ficam
até o logo chegar.

## Screens

Enumeração **binding** de texto e arranjo, 360 × 740 primeiro. "Texto" é literal e **não muda**,
fora o que está marcado *(novo)*. Ordem do arranjo = ordem do DOM de hoje, de cima para baixo;
nenhuma tela reordena o DOM. Toda lista tem a largura toda a 360 px e quebra palavra longa
(`break-words`), sem rolagem horizontal.

| # | Tela (rota) | Texto | Arranjo a 360 px · a partir de 768 px |
| --- | --- | --- | --- |
| 0 | cabeçalho (`Autenticado`) | "One", nome da instituição; links por papel: "Assistente", "Minhas solicitações", "Fila", "Artigos", "Documentos", "Indicadores", "Usuários", "Matrículas", "Cadastros"; "Sair"; botão "Menu" (nome acessível); título da gaveta "Menu" *(novo)*; controle "Tema" com "Claro", "Escuro", "Sistema" *(novo, a partir da S9)*; carregando: status "Carregando" | barra fixa no topo, altura 56 px: wordmark e instituição (truncada) à esquerda; "Tema" e "Menu" à direita; "Menu" abre a gaveta Vaul de baixo, um link por linha de 48 px com o ícone, "Sair" por último · a partir de 640 px os links ficam na barra, "Sair" à direita, sem botão "Menu". Tudo dentro de um `<nav>` |
| 1 | raiz (`/`) | "Abra o endereço da sua instituição, por exemplo /univag." | wordmark e o texto centralizados, `text-muted-foreground` · igual |
| 2 | Login (`/:slug`) | título "One · {instituição}"; "CPF", "Senha", "Entrar"; "Primeiro acesso ou esqueci minha senha"; "Instituição não encontrada."; status "Carregando"; erro: o `detail` da API | cartão com margem de 16 px, campos empilhados, "Entrar" na largura toda, link centralizado embaixo; o erro num `Alert` abaixo do formulário · cartão de no máximo 420 px centralizado |
| 3 | Primeiro acesso | "Primeiro acesso", "CPF", "Enviaremos um link para criar a senha no e-mail registrado na instituição.", "Enviar link", "Voltar para o login"; sucesso: a mensagem da API | como o Login · igual |
| 4 | Criar senha | "Criar senha", "Nova senha", "De 8 a 128 caracteres.", "Salvar senha", "Senha criada. ", link "Entre com o CPF e a nova senha." | como o Login · igual |
| 5 | Trocar senha | "Trocar senha", "Troque a senha temporária para continuar.", "Senha atual", "Nova senha", "De 8 a 128 caracteres.", "Salvar" | dentro do cabeçalho; título, aviso, campos empilhados, "Salvar" · coluna de no máximo 420 px |
| 6 | **Assistente** (P1) | "Assistente"; aviso "Suas mensagens são analisadas por um serviço externo de inteligência artificial, com servidores fora do Brasil. Não escreva CPF, matrícula, telefone ou dados de saúde."; exemplo "Pergunte, por exemplo: “Como emito o boleto do semestre?” ou “Posso abonar falta com atestado?”"; "Resposta gerada por IA com base nas orientações da instituição."; status "Digitando" e "digitando…"; "Isso resolveu?", "Sim", "Não"; "Quer explicar melhor ou falar com um atendente?"; "Confirmar transferência"; "Mensagem" (rótulo oculto), placeholder "Escreva sua dúvida", "Enviar"; "Falar com atendente", "Encerrar"; diálogos "Falar com um atendente?" / "Encerrar a conversa?", "Sua conversa será enviada a um atendente da instituição, que responde por aqui.", "Descreva seu pedido", "Matrícula", "Escolha a matrícula", "A conversa será encerrada.", "Cancelar", "Confirmar"; "Transferido para {setor}. Protocolo {número}."; "Abrir a solicitação {número}"; "Que bom que resolveu! Conversa encerrada." / "Conversa encerrada."; erro: o `detail` da API | título; aviso compacto com `ShieldAlert`; `Conversation` (`role="log"`) ocupa a altura que sobra: balão do aluno à direita em `bg-primary-subtle`, do assistente à esquerda em `bg-muted`, até 90% da largura, data `dd/mm/aaaa hh:mm` pequena à direita; "Isso resolveu?" com Sim/Não logo abaixo da última resposta; compositor fixo no fim da tela (`sticky bottom-0`): campo de 2 linhas, "Enviar" com `Send`, e na linha de baixo "Falar com atendente" (variante `default` quando em destaque, `outline` fora dele) e "Encerrar"; erro em `Alert` abaixo do compositor; balão novo entra com deslocamento vertical de 8 px (Motion, só transform) · coluna de no máximo 768 px centralizada |
| 7 | Minhas solicitações | "Minhas solicitações"; "Você ainda não tem solicitações. " + link "Fale com o assistente" + "."; número, selo do estado ("Aberto", "Em atendimento", "Aguardando aluno", "Resolvido", "Fechado"), título; status "Carregando"; erro: `detail` | título; lista de cartões-link, um por chamado: número e selo na primeira linha, título embaixo · coluna de no máximo 768 px |
| 8 | Fila | "Fila"; "Nenhum chamado na fila dos seus setores."; como a 7, mais "{categoria} · {responsável ou "sem responsável"} · {1 dia / N dias}" | como a 7 |
| 9 | **Detalhe do chamado** (P1) | "{número} · {título}"; selo do estado; "{setor} · {categoria} · {responsável}"; (equipe) "{solicitante} · matrícula {n} · {curso} · {s}º semestre", "Resumo gerado por IA"; "Conversa com o assistente"; fonte: ícone "Documento"/"Artigo", título, trechos entre aspas, "Abrir o PDF (versão {n})", "Este documento/artigo foi atualizado depois desta resposta."; "Atendimento"; "Nenhuma resposta ainda."; "Nota interna"; anexo "{nome} ({n} KB)"; "Resposta pronta", "Inserir resposta pronta…"; "Responder" / "Responder (reabre a solicitação)"; "Anexos (PDF, JPG ou PNG, até 10 MB cada)"; "Nota interna", "Aguardando aluno"; "Enviar"; "Assumir", "Confirmar resolução", "Encaminhar", "Cancelar solicitação"; "Resolução", "Resolver"; "Reclassificar", "Escolha a categoria", "Salvar"; "Duplicado de outro pedido do mesmo aluno", placeholder "ONE-123", "Marcar"; "Não resolveu? Explique o motivo", "Rejeitar resolução"; "Histórico"; diálogos "Encaminhar para outro setor?", "O chamado volta para a fila do setor escolhido, sem responsável. O motivo fica como nota interna.", "Setor", "Escolha o setor", "Motivo", "Voltar", "Encaminhar"; "Cancelar a solicitação?", "Justificativa (opcional)", "Cancelar solicitação"; status "Carregando"; erro: `detail` | título com quebra de palavra; selo e linha de setor; cartão da equipe; transcrição com os mesmos balões da tela 6 e as fontes em bloco com borda superior dentro do balão do assistente; mensagens do atendimento (nota interna em `bg-warning-subtle` com selo); formulário de resposta (área de soltar arquivo do Dropzone com o campo nativo); botões de ação em linha que quebra, cada um com no mínimo 44 px de altura; formulários de ação empilhados; histórico como lista ordenada pequena · coluna de no máximo 768 px |
| 10 | Artigos | "Artigos", "Novo", "Orientações internas usadas pelo assistente. O aluno nunca vê os artigos, só a resposta."; título, selo "Indexando"/"Indexado"/"Falhou", estado "RASCUNHO"/"ATIVO"/"ARQUIVADO", "{categoria} · versão {n} · válido de {dd/mm/aaaa} · válido até {dd/mm/aaaa}", "Editar", "Ativar", "Arquivar"; "Nenhum item cadastrado."; diálogo "Novo artigo"/"Editar artigo", "Salvar cria uma nova versão; as anteriores ficam guardadas." / "O artigo nasce como rascunho e só entra na base do assistente quando for ativado.", "Título", "Perguntas relacionadas (uma por linha)", "Categoria", "Escolha a categoria", "Resposta", "Links (um por linha, com https://)", "Válido de (opcional)", "Válido até (opcional)", "Cancelar", "Salvar"; "Escolher validade no calendário" *(novo)*, nomes de mês e dia do calendário em pt-BR *(novo, do `ptBR`)*; "Arquivar o artigo?", "“{título}” sai da base do assistente. As conversas que já o citaram continuam como estão.", "Voltar", "Arquivar"; toasts "Artigo salvo.", "Artigo ativado.", "Artigo arquivado." *(novos)* | título e "Novo" na mesma linha (quebra se faltar espaço); texto de apoio; lista de cartões: título e selos lado a lado com 4 px de espaço, linha pequena, botões pequenos em linha; no diálogo, "Resposta" é o editor Tiptap com a aparência de um campo de 6 linhas, e "Válido de"/"Válido até" ficam lado a lado com o botão de calendário (ícone `CalendarDays`) embaixo deles · diálogo de largura `lg` |
| 11 | Documentos | "Documentos", "Enviar PDF", "PDFs da instituição (regulamentos, calendários, editais) que o assistente consulta. O aluno nunca vê o documento, só a resposta."; título, selos, "{categoria} · versão {n} · {p} página(s) · {arquivo}", "Nova versão", "Arquivar"; diálogo "Enviar PDF"/"Nova versão", "PDF com texto (não digitalizado), até 20 MB." / "A nova versão de “{título}” substitui a atual na busca; as anteriores ficam guardadas.", "Título", "Categoria", "Arquivo PDF", "Cancelar", "Enviar"; "Arquivar o documento?"; toasts "Documento enviado.", "Documento arquivado." *(novos)* | como a 10; o campo "Arquivo PDF" é a área do Dropzone |
| 12 | **Indicadores** (P1) | "Indicadores", "De", "Até", "Consultar"; "Sem dados no período"; cartões "Indicador principal", "Alunos ativos", "Conversas", "Autoatendimento", "Escalonamento", "Abandono", "Perguntas sem artigo", "Chamados abertos agora", "Chamados resolvidos", "Tempo até a 1ª resposta", "Tempo de resolução", "Roteamento correto", "Reabertura"; valores `12,3%`, `1,5 h`, `—`; "Categorias por conversas", "Categorias por chamados", cabeçalhos "Categoria", "Total" *(novos)*, linha "{categoria}{total}", vazio "—"; "Escolher período no calendário" *(novo)* e o calendário em pt-BR; erro: `detail` | título; "De" e "Até" lado a lado em 2 colunas, o botão de calendário (ícone `CalendarDays`) e "Consultar" na linha de baixo; cartões em 2 colunas, "Indicador principal" ocupando as 2 e com o valor maior; rankings um embaixo do outro, cada cartão com o gráfico de barras horizontais (Recharts, `aria-hidden`) acima da tabela de 2 colunas Categoria/Total (TanStack Table) · formulário em linha; cartões em 4 colunas; rankings lado a lado |
| 13 | Usuários | "Usuários", "Novo"; nome, "Desativado", "CPF {cpf} · {e-mail}", papéis "Aluno"/"Atendente"/"Administrador" e setores, "Editar", "Desativar"; "Nenhum item cadastrado."; diálogo "Novo usuário"/"Editar usuário", "CPF", "Nome", "E-mail", "Papéis", "Setores do atendente", "Senha temporária (opcional)", "Com senha temporária, a pessoa troca a senha no primeiro login. Sem ela, entra pelo primeiro acesso por e-mail.", "Cancelar", "Salvar"; "Desativar {nome}?", "A pessoa perde o acesso na próxima requisição. Conversas, chamados e histórico ficam guardados; os chamados em que ela era responsável voltam para a fila do setor.", "Voltar", "Desativar"; toasts "Usuário salvo.", "Usuário desativado." *(novos)* | como a 10 |
| 14 | Matrículas | "Importar matrículas"; "Arquivo CSV em UTF-8, separado por ponto e vírgula, com o cabeçalho `cpf;nome;email;matricula;curso;semestre;situacao`. Alunos são atualizados pelo CPF e matrículas pelo número. Se alguma linha tiver erro, nada é importado."; "Arquivo CSV", "Importar"; "Importação concluída: {c} matrículas criadas e {a} atualizadas."; tabela "Linha", "Motivo"; "Importar {arquivo}?", "Os dados de alunos e matrículas que já existem serão substituídos pelos do arquivo.", "Voltar", "Importar" | título; texto com o cabeçalho em fonte mono que quebra; área do Dropzone; "Importar" na largura toda; resultado em `Alert`; tabela de erros (TanStack Table com o `Table` do shadcn) de 2 colunas que quebra o motivo · "Importar" do tamanho do texto |
| 15 | Cadastros | "Cadastros", "Novo"; abas "Setores", "Categorias", "Cursos", "Regras", "Respostas prontas"; linhas "triagem · inativo", "padrão · inativa", "coordenação: {setor}", "setor {setor}" / "coordenação do curso"; "Nenhum item cadastrado."; diálogo "Novo: {aba}"/"Editar: {aba}", "Nome", "Setor de triagem (exatamente um na instituição)", "Ativo", "Ativa", "Setor de coordenação", "Sem coordenação (vai para a triagem)", "Categoria", "Destino", "Setor fixo", "Coordenação do curso da matrícula", "Setor", "Escolha o setor", "Título", "Texto", "Cancelar", "Salvar"; toast "Cadastro salvo." *(novo)* | título e "Novo"; abas (`Tabs` do Radix) roláveis na horizontal dentro da própria faixa, sem rolar a página; cada linha é um botão da largura toda com nome e detalhe pequeno · abas sem rolagem |

Estados comuns: carregando = `Spinner` com `role="status"` e nome "Carregando"; erro = `Alert`
variante `destructive` com o `detail` da API; diálogo em tela cheia menos 16 px de margem a 360 px,
rodapé com o botão de confirmar acima do "Cancelar"/"Voltar" (o `DialogFooter` do shadcn), sem
mudar a ordem no DOM.

## Criteria

Numeração única no plano. "Testes da base" = os testes Vitest e e2e que existem no commit em que
o build começa.

### S0: Invariantes de toda a feature (P1)

Vale em cada commit, de qualquer slice.

**Acceptance Criteria**

1. The web SHALL pass every Vitest and e2e test of the feature base at every commit of this feature, with no `.skip(` nor `.only(` added.
2. IF a commit removes or changes an assertion line of the feature base THEN `.specs/features/interface-nova/seletores.md` SHALL list that line, its replacement and the unchanged claim, and the two lists SHALL match line for line.
3. The web SHALL send, for every action exercised by the tests of the feature base, the same method, URL and body as at the feature base.
4. The web SHALL show every text listed in `## Screens` for its screen, and no new visible text other than the ones marked *(novo)* there.
5. The web SHALL keep the role and the accessible name of every element the tests of the feature base query by role or by label.
6. WHEN `crapper --use-existing-coverage -s src --threshold 9.99` runs in `web/` after `npm run coverage` THEN it SHALL exit 0.
7. WHEN `dryer` runs with the paths of door 4 and `--threshold 0.8` THEN it SHALL report no candidate.
8. WHEN `mutator` runs over the paths of door 4 THEN it SHALL leave no surviving mutant.
9. WHEN the 360 × 740 e2e opens each of the 15 screens of `## Screens` THEN `document.documentElement.scrollWidth` SHALL be at most 360.
10. The web SHALL list in `web/package.json` none of `ai`, `@ai-sdk/react`, `streamdown` and `next-themes`, and every dependency with an exact version.
11. WHEN `vite build` runs THEN the PWA precache SHALL contain every emitted `.js`, `.css`, `.html`, `.png`, `.svg` and `.woff2` file and no path under `/api/`.

**Independent test:** a suíte inteira e o e2e verdes num commit qualquer da feature, e o
`asserts_preservados.py` do `refatoracao-solid` reportando só as linhas listadas em `seletores.md`.

### S1: Fundação: Tailwind, shadcn/ui, dados e cabeçalho (P1)

A base que toda tela usa, com o Bootstrap ainda presente nas telas não migradas.

**Acceptance Criteria**

12. WHILE any file in `web/src` imports `react-bootstrap`, the web SHALL load Bootstrap's stylesheet only inside the cascade layer `bootstrap`, declared after `base` and before `components` and `utilities`.
13. The web SHALL hold every file copied from the shadcn/ui and AI Elements registries, and the `cn` helper, in `web/src/ui/`, and no folder in `web/src` other than the 6 slices, `test` and `ui`.
14. IF a file in `web/src/ui/` imports a slice folder or a root module of `web/src` THEN the structure test SHALL fail.
15. The shell SHALL render the institution name, the role-filtered links, the "Menu" button and "Sair" inside one `<nav>` element.
16. WHEN the viewport is 360 px wide and the user taps "Menu" THEN the shell SHALL open a drawer titled "Menu" with the same role-filtered links and "Sair".
17. WHEN the viewport is 640 px wide or more THEN the shell SHALL show the links in the bar and SHALL not show the "Menu" button.
18. The web SHALL create one `QueryClient` per `App` mount with `retry: false`, `refetchOnWindowFocus: false` and `networkMode: 'always'` for queries and mutations.
19. IF a request fails while offline THEN the screen SHALL show the error `Alert`, as it does at the feature base.
20. The web SHALL render text in the font family "Inter Variable" served from the app's own origin, with no request to a font host.
21. The web SHALL give a contrast ratio of at least 4.5:1 to the token pairs `--foreground`/`--background`, `--primary-foreground`/`--primary`, `--muted-foreground`/`--background` and `--destructive`/`--background`, in light and in dark.

**Independent test:** abrir `/univag/fila` a 360 px e a 1024 px, abrir e fechar a gaveta, ver as
telas ainda em Bootstrap sem quebra; `npm run test` verde.

### S2: Assistente (P1)

O chat do aluno com os componentes visuais do AI Elements.

**Acceptance Criteria**

22. The Assistente SHALL render the conversation inside a `role="log"` container, each student message on the end side with `bg-primary-subtle` and each assistant message on the start side.
23. The Assistente SHALL render the model text as plain text with its line breaks, with no markdown interpretation.
24. WHILE an answer is pending, the Assistente SHALL show the status named "Digitando" and the text "digitando…".
25. WHILE "Falar com atendente" is highlighted (after a `sem_base`, after "Não", or at the 10-message limit) the button SHALL use the variant `default`, and the variant `outline` otherwise.
26. WHEN the conversation is taller than a 360 × 740 viewport THEN "Enviar" and "Falar com atendente" SHALL stay inside the viewport.
27. WHERE the system asks for reduced motion, the Assistente SHALL run no animation on new messages.
28. The Assistente SHALL animate a new message only through `transform`, never `opacity`.

**Independent test:** a 360 px, mandar 12 mensagens contra a API simulada do e2e e ver o
compositor sempre visível; `assistente.test.tsx`, `conversa.test.tsx` e `transferencia.test.tsx`
verdes.

### S3: Detalhe do chamado (P1)

A tela que o atendente e o aluno abrem, com a conversa, as fontes, a resposta e as ações.

**Acceptance Criteria**

29. The ticket detail SHALL render transcript and public messages with the bubbles of criterion 22, and each internal note with `bg-warning-subtle` and the badge "Nota interna".
30. The ticket detail SHALL mark a cited source with an icon named "Documento" or "Artigo", each a different Lucide icon.
31. WHILE the ticket detail is open, the web SHALL reload the ticket every 15 s.
32. WHEN the user drops or picks files in "Anexos (PDF, JPG ou PNG, até 10 MB cada)" THEN the reply SHALL send them in the field `anexos`, as at the feature base.

**Independent test:** `chamado.test.tsx`, `acoes.test.tsx` e `resposta.test.tsx` verdes; abrir
`/univag/chamados/ONE-123` no e2e a 360 px nos dois temas.

### S4: Indicadores (P1)

Os 14 indicadores com um gráfico nos rankings.

**Acceptance Criteria**

33. WHEN the Indicadores screen first renders THEN the Recharts code SHALL load in a chunk other than the entry chunk.
34. WHEN a ranking has at least one category THEN its card SHALL show a horizontal bar chart hidden from assistive technology above the list of category and total.
35. IF a ranking is empty THEN its card SHALL show "—" and no chart.
36. The Indicadores screen SHALL lay the 13 cards in 2 columns below 768 px and 4 columns from 768 px, with "Indicador principal" first.
37. The Indicadores screen SHALL stack the two rankings below 768 px and place them side by side from 768 px.
52. WHEN the user picks a range in "Escolher período no calendário" THEN "De" and "Até" SHALL hold its first and last day as `aaaa-mm-dd`, and the screen SHALL send no request until "Consultar".
53. The calendar SHALL name months and weekdays in pt-BR.
54. The Indicadores screen SHALL render each ranking category as one table row with the cells category and total, under the headers "Categoria" and "Total".

**Independent test:** `indicadores.test.tsx` verde; a 360 px e a 1024 px com os dados do e2e.

### S5: Listas de chamados (P2)

"Minhas solicitações" e "Fila".

**Acceptance Criteria**

38. The lists SHALL render each ticket as one link to `/{slug}/chamados/{número}` with number, state badge and title.

**Independent test:** `listas.test.tsx` verde.

### S6: Acesso (P2)

Raiz, Login, Primeiro acesso, Criar senha e Trocar senha, com React Hook Form e Zod.

**Acceptance Criteria**

39. The access forms SHALL validate with Zod only the constraints the screens enforce at the feature base (required fields).
40. IF an input passes the constraints of the feature base THEN the form SHALL send the request, even when the API will reject it.

**Independent test:** `acesso.test.tsx` verde; o e2e a 360 px nas 4 telas de acesso.

### S7: Conhecimento (P2)

Artigos e Documentos.

**Acceptance Criteria**

41. WHEN saving, activating or archiving an article succeeds THEN the web SHALL show the toast "Artigo salvo.", "Artigo ativado." or "Artigo arquivado.".
42. WHEN sending or archiving a document succeeds THEN the web SHALL show the toast "Documento enviado." or "Documento arquivado.".
43. The article editor SHALL send the field `resposta` with exactly the text typed, as at the feature base.
55. WHEN an article is saved THEN the field `resposta` SHALL be the string `editor.getText({ blockSeparator: '\n' })`, with no HTML tag, entity or markdown sign the user did not type.
56. WHEN an article is opened for editing and saved with no change THEN `resposta` SHALL equal the loaded text character for character, for each of: a blank line between paragraphs, repeated spaces, leading and trailing spaces, a trailing line break, the empty text, and the literals `<b>x</b>`, `**x**` and `&amp;`.
57. WHEN formatted content is pasted into "Resposta" THEN the editor SHALL keep only its text.
58. The "Resposta" editor SHALL have `role="textbox"` and `aria-multiline="true"`, and SHALL take the accessible name "Resposta" from its label.
59. IF the text in "Resposta" reaches 8000 characters THEN the editor SHALL accept no further character.
60. WHEN the user picks a range in "Escolher validade no calendário" THEN "Válido de (opcional)" and "Válido até (opcional)" SHALL hold its first and last day as `aaaa-mm-dd`, and nothing SHALL be saved until "Salvar".

**Independent test:** `artigos.test.tsx`, `documentos.test.tsx` e `edicao.test.tsx` verdes.

### S8: Administração (P2)

Usuários, Matrículas e Cadastros.

**Acceptance Criteria**

44. WHEN saving or deactivating a user succeeds THEN the web SHALL show the toast "Usuário salvo." or "Usuário desativado.".
45. WHEN saving a record in Cadastros succeeds THEN the web SHALL show the toast "Cadastro salvo.".
46. WHILE the viewport is 360 px wide, the Cadastros tab list SHALL scroll inside its own strip without page overflow.
61. The Matrículas error table SHALL render one row per error with the cells "Linha" and "Motivo", keeping the roles `table`, `columnheader` and `cell`.

**Independent test:** `admin.test.tsx`, `cadastros.test.tsx` e `usuarios.test.tsx` verdes.

### S9: Saída do Bootstrap e tema escuro (P1)

Só depois de a última tela sair do `react-bootstrap`; é o passo que faz o AD-020 substituir o AD-004.

**Acceptance Criteria**

47. WHEN no file in `web/src` imports `react-bootstrap` THEN `web/package.json` SHALL list none of `bootstrap`, `react-bootstrap` and `bootstrap-icons`, and `index.css` SHALL have no `bootstrap` layer.
48. WHILE any file in `web/src` imports `react-bootstrap`, the web SHALL render the light theme and SHALL not show the theme control.
49. WHEN the user picks "Claro", "Escuro" or "Sistema" in "Tema" THEN the web SHALL store `light`, `dark` or `system` under the `localStorage` key `one-tema`.
50. IF no theme is stored THEN the web SHALL apply the class `dark` to `<html>` when `prefers-color-scheme` is dark, and `light` otherwise.
51. The PWA manifest `theme_color` and the `<meta name="theme-color">` SHALL be the hex value of the light `--primary`.

**Independent test:** `npm ls bootstrap` vazio; o e2e de 360 px verde com `colorScheme: 'dark'`.

## Out of scope

| Excluded | Why |
| --- | --- |
| formatação no artigo (negrito, listas, títulos) | o texto do artigo é a fonte da conferência literal (AD-012); o Tiptap entra só como texto puro (door 14) |
| TanStack Table nas listas em cartão, ordenação, filtro e paginação | as listas em cartão não cabem numa tabela a 360 px sem mudar o que os testes afirmam (door 16); ordenar, filtrar e paginar são capacidades novas |
| DayPicker no lugar dos campos de data | o campo nativo fica (door 5); o calendário só preenche os campos (door 15) |
| TanStack Virtual | o jsdom não tem layout, então um virtualizador não desenha linha nenhuma nos testes; nenhuma lista medida passa de algumas centenas de itens. Rever se a lista de Usuários da Univag passar de 2 000 |
| Dexie | o único dado não sensível guardado no aparelho é o tema, uma chave no `localStorage`; conversas e chamados são dados pessoais (LGPD) e o assistente precisa de rede |
| validação nova no navegador (dígito do CPF, 8 a 128 na senha) | muda quando a requisição sai; a API continua a fonte (Problem Details) e o Zod só repete o que a tela já exige (AC 39) |
| markdown ou streaming na resposta do assistente | a resposta chega inteira, depois da conferência dos trechos (AD-012, AD-022) |
| SignalR e Web Push | features próprias (AD-022) |
| logo do One | o grupo fornece; até lá vale o wordmark de `## Visual` |
| redesenho em duas colunas no desktop | mudaria a ordem do DOM ou pediria grade com áreas; a coluna única de até 768 px atende a banca |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Perfil e budget do `tlc-spec-lean` | perfil `ui`, budget 150k | decisão do usuário em 02/11 (AD-020) | y |
| Calendário | build de 04 a 14/11 em paralelo às features do `api/`, só no `web/`; corte em 16/11 (o que não estiver verificado sai da banca); congelamento a partir de 17/11 | decisão do usuário em 02/11; com a migração tela a tela (door 2), o que não migrar fica em Bootstrap e a S9 não entra | y |
| Ordem das slices | S0 sempre; S1, S2, S3, S4 (as 3 telas da banca), depois S5 a S8, e a S9 por último | prioridade do usuário: Assistente, chamado e indicadores primeiro | y |
| Trocar seletor de asserção | permitido quando a afirmação não muda, uma linha por asserção em `seletores.md` (AC 2) | regra do usuário em 02/11 | y |
| Paleta, raio e fonte | os tokens de `## Visual`: base neutra `new-york`, azul `oklch(0.49 0.17 262)` / escuro `oklch(0.70 0.14 262)`, raio `0.625rem`, Inter Variable pelo Fontsource; cores só em variáveis CSS | aceito pelo usuário em 02/11 | y |
| Tiptap, TanStack Table e React DayPicker | entram antes da banca na forma mínima das doors 14, 15 e 16 | escolha do usuário em 02/11 ("usar na forma mínima antes da banca") | y |
| Asserções que registram decisões substituídas (`acesso.test.tsx` versões do Bootstrap; `estrutura.test.ts` "só 6 pastas") | trocadas como nas doors 9 e 3, cada linha em `seletores.md` | escolha do usuário em 02/11 ("trocar os dois testes") | y |
| Registro no `STATE.md` | um AD novo, AD-023, registra que o AD-020 substitui o AD-004 (status do AD-004 vira `superseded by AD-020`), a pasta `web/src/ui/` como emenda do AD-017 (door 3) e o escopo do `dryer`/`mutator` sem `web/src/ui/` como emenda do AD-018 (door 4) | quem escreve é o coordenador, na aprovação deste plano; este plano não edita o `STATE.md` | y |
| Textos novos | os 15 marcados *(novo)* em `## Screens`: gaveta, tema, 8 toasts, os 2 botões de calendário, os 2 cabeçalhos dos rankings e os nomes de mês e dia do `ptBR` | cada texto novo ganha asserção, senão vira mutante sobrevivente | n |
| Limite da "Resposta" | `CharacterCount` com `limit: 8000`, que conta os caracteres sem as quebras de linha; acima do limite da API vale o `detail` dela | a `Textarea` contava as quebras; a diferença é de no máximo uma quebra por parágrafo, e a API continua a fonte da validação | n |
| Chave do tema | `one-tema` no `localStorage` | nome do produto; o padrão `vite-ui-theme` não diz de quem é | n |
| Gráfico nos indicadores | só nos dois rankings | a API devolve agregados do período, sem série no tempo; um gráfico de um número só não informa | n |
| Gaveta do menu | Vaul vindo de baixo | é o padrão do `Drawer` do shadcn e fica ao alcance do polegar | n |
| Toasts do chamado | nenhum: o selo do estado e a mensagem nova já mostram o resultado | evita texto novo onde a tela já muda | n |
| Parar e perguntar: digitação no Tiptap sob o jsdom | IF `userEvent.type(dialogo.getByLabelText('Resposta'), 'Faltas não são abonadas.')` (`artigos.test.tsx` linha 25) não produzir `resposta: 'Faltas não são abonadas.'` no `POST` (linha 34), mesmo com `Range.prototype.getClientRects`, `Range.prototype.getBoundingClientRect` e `document.elementFromPoint` falsos no `setup.ts`, THEN o build para e pergunta antes de mexer na S7; nenhuma asserção é trocada para contornar | o `user-event` edita `contenteditable`, mas o ProseMirror mede a seleção com APIs de layout que o jsdom não tem; não há como confirmar sem rodar. As saídas a oferecer: outro modo de entrada no teste (muda como a afirmação é exercida, então precisa de OK) ou a `Textarea` só na S7 | y |
| Parar e perguntar: qualquer outra afirmação | IF uma biblioteca da stack só entrar mudando o que uma asserção existente afirma (não só o seletor) THEN o build para e pergunta; nada é afrouxado | regra do usuário em 02/11 | y |

**Open questions:** none - all resolved or logged above; os dois itens "Parar e perguntar" são condições de parada do build, não perguntas em aberto.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| tela cabeçalho | sem permissão (sem sessão) | existing - `Autenticado` manda para `/{slug}` quando `/api/auth/me` falha; só a leitura passa a `useQuery` (AC 1) |
| tela cabeçalho | carregando | existing - status "Carregando" (AC 5) |
| tela cabeçalho | menu a 360 px | AC 15, AC 16, AC 17 |
| telas de acesso (Login, Primeiro acesso, Criar senha, Trocar senha) | vazio | n/a - formulário, não lista |
| telas de acesso | carregando, erro | existing - botão com Spinner e `Alert` com o `detail` (AC 1, AC 5); instituição inexistente: "Instituição não encontrada." (AC 4) |
| telas de acesso | validação | AC 39, AC 40 |
| tela Assistente | vazio | existing - o texto de exemplo (AC 4) |
| tela Assistente | carregando | AC 24 |
| tela Assistente | erro | existing - `Alert` com o `detail` abaixo do compositor (AC 1) |
| tela Assistente | ação que confirma | existing - diálogos "Falar com um atendente?" e "Encerrar a conversa?" (door 6) |
| tela Assistente | densidade e ordem | AC 22, AC 26; mensagens em ordem de envio, como hoje |
| tela Minhas solicitações e Fila | vazio, carregando, erro | existing - textos vazios, Spinner e `Alert` (AC 4, AC 5) |
| tela Minhas solicitações e Fila | ordem | existing - a ordem que a API manda; nenhuma ordenação no navegador |
| tela Detalhe do chamado | carregando, erro, sem respostas | existing - C39 do `refatoracao-solid` (AC 1) |
| tela Detalhe do chamado | sem permissão | existing - 404/403 da API viram o `Alert` de erro (AC 1) |
| tela Detalhe do chamado | ação destrutiva confirma | existing - "Cancelar a solicitação?" e "Encaminhar para outro setor?" (door 6) |
| tela Detalhe do chamado | atualização | AC 31 |
| tela Indicadores | vazio | existing - "Sem dados no período" e "—" no ranking vazio (AC 35) |
| tela Indicadores | carregando, erro | existing - botão "Consultar" com Spinner e `Alert` (AC 1) |
| tela Indicadores | densidade | AC 36, AC 37, AC 54 |
| telas Indicadores e Artigos | escolha de data pelo calendário | AC 52, AC 53, AC 60; o campo nativo continua aceitando a data digitada (AC 1) |
| tela Artigos | texto da resposta (fonte da conferência literal, AD-012) | AC 55, AC 56, AC 57, AC 58, AC 59 |
| tela Matrículas | tabela de erros | AC 61 |
| telas Artigos, Documentos, Usuários, Cadastros | vazio, carregando, erro | existing - "Nenhum item cadastrado.", Spinner e `Alert`, inclusive o erro dentro do diálogo (AC 1) |
| telas Artigos, Documentos, Usuários | ação destrutiva confirma | existing - "Arquivar o artigo?", "Arquivar o documento?", "Desativar {nome}?" (door 6) |
| telas Artigos, Documentos, Usuários, Cadastros | resultado da ação | AC 41, AC 42, AC 44, AC 45 |
| tela Matrículas | ação destrutiva confirma | existing - "Importar {arquivo}?" (door 6) |
| tela Matrículas | erro por linha | existing - tabela "Linha"/"Motivo" (AC 1) |
| todas as telas | tema e contraste | AC 21, AC 48, AC 49, AC 50 |
| todas as telas | 360 px sem rolagem horizontal | AC 9 |
| todas as telas | movimento reduzido | AC 27 |
| copy: textos novos | estrutura, tom | frase curta no passado com ponto final ("Artigo salvo."), como os textos de hoje; listados em `## Screens` (AC 4) |
| API: todas as rotas | forma, erros, versionamento, limite de taxa | n/a - nenhuma rota muda (AC 3) |
| comando `vite build` | saída e precache | AC 11, AC 33 |

## Sources

- AD-020 e a tabela "Interface nova (Etapa 4c, antes da banca)" do `ROADMAP.md` (binding: a stack e o "onde entra" de cada biblioteca); pedido do usuário em 02/11/2026 para este plano (prioridade das 3 telas, calendário, regra de seletores).
- `## Visual` e `## Screens` deste plano (binding depois da aprovação, até chegar o logo e as cores do grupo).
- Documentação conferida em 02/11/2026: Tiptap (`getText`, `setContent` com JSON, `CharacterCount` em `@tiptap/extensions`); React DayPicker (`mode="range"`, `locale` de `react-day-picker/locale`, guia v8 para v10); TanStack Table (`getCoreRowModel`, `flexRender`/`FlexRender`); shadcn/ui Vite (`ui.shadcn.com/docs/installation/vite`), dark mode Vite (`ui.shadcn.com/docs/dark-mode/vite`), `components.json`, `native-select`, `spinner`, `alert` e `button` do registro `new-york-v4`; Tailwind CSS v4.3 Vite e Preflight (`tailwindcss.com/docs`); registro do AI Elements (`registry.ai-sdk.dev/message.json` e `conversation.json`); TanStack Query, network mode e testes; `react-dropzone` `src/index.tsx` (`getInputProps`); Sonner `src/index.tsx`; Motion acessibilidade; Fontsource variable.
