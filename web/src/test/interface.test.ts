import { screen, within } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import componentes from '../../components.json'
import html from '../../index.html?raw'
import pacote from '../../package.json'
import tsconfig from '../../tsconfig.json'
import vite from '../../vite.config.ts?raw'
import { abrir, api, chamado, me } from './util'

// Regras sobre o código-fonte e a configuração da interface nova (lidas como texto, como o "estrutura em fatias").
const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const arquivos = Object.keys(fontes).map((c) => c.replace('/src/', ''))
const texto = (arquivo: string) => fontes[`/src/${arquivo}`]
// o Vitest troca o CSS importado por texto vazio; o index.css é lido do disco
const css = readFileSync('src/index.css', 'utf8') // cwd = web/ (vitest e mutator)
const todas = { ...pacote.dependencies, ...pacote.devDependencies } as Record<string, string>
const comBootstrap = () => arquivos.some((a) => /from 'react-bootstrap'/.test(texto(a)))
const semEspacos = (t: string) => t.replace(/\s+/g, '')

// Declarações de um bloco do index.css (":root" ou ".dark" ou "@theme inline"), com o valor oklch sem a função.
function bloco(seletor: string): Record<string, string> {
  const corpo = css.slice(css.indexOf(`${seletor} {`)).split('}')[0]
  const valores: Record<string, string> = {}
  for (const [, nome, valor] of corpo.matchAll(/(--[\w-]+):\s*([^;]+);/g)) valores[nome] = valor.trim().replace(/^var\(--[\w-]+, (.*)\)$/, '$1').replace(/^oklch\((.*)\)$/, '$1') // o fallback de var(--marca, base) é o valor de base
  return valores
}

// color-mix(in oklch, var(--marca, oklch(L C H)) N%, oklch(L2 0 0)) sem marca: o neutro não tem matiz, então a mistura leva a da marca (CSS Color 5)
function misturar(valor: string) {
  const m = valor.match(/^color-mix\(in oklch, var\(--marca, oklch\(([^)]+)\)\) (\d+)%, oklch\(([^)]+)\)\)$/)
  if (!m) return valor
  const [[l1, c1, h1], p, [l2]] = [m[1].split(' ').map(Number), Number(m[2]) / 100, m[3].split(' ').map(Number)]
  return `${l1 * p + l2 * (1 - p)} ${c1 * p} ${h1}`
}

// oklch -> sRGB linear (CSS Color 4), cortado em [0, 1]; luminância e contraste do WCAG 2.
function linear(valor: string): number[] {
  const [l, c, h] = misturar(valor).split(' ').map(Number)
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const [l3, m3, s3] = [l + 0.3963377774 * a + 0.2158037573 * b, l - 0.1055613458 * a - 0.0638541728 * b, l - 0.0894841775 * a - 1.291485548 * b].map((x) => x ** 3)
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ].map((x) => Math.min(1, Math.max(0, x)))
}
const luminancia = (valor: string) => {
  const [r, g, b] = linear(valor)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contraste = (x: string, y: string) => {
  const [claro, escuro] = [luminancia(x), luminancia(y)].sort((p, q) => q - p)
  return (claro + 0.05) / (escuro + 0.05)
}

// revisao-ux door 2: background, muted, accent, border e input = a marca (ou o azul de base) em N% sobre o neutro
const tingido = (n: number, neutro: string) => `color-mix(in oklch, var(--marca, oklch(0.45 0.15 262)) ${n}%, oklch(${neutro}))`

// redesign-institucional ## Visual: cada token em claro, escuro e preto; '=' = o .black não declara e herda do .dark
const Tokens: [string, string, string, string][] = [
  ['--background', tingido(2, '1 0 none'), tingido(3, '0.17 0 none'), '0 0 0'],
  ['--foreground', '0.145 0 0', '0.95 0 0', '0.92 0 0'],
  ['--card', '1 0 0', '0.205 0 0', '0.15 0 0'],
  ['--popover', '1 0 0', '0.205 0 0', '0.15 0 0'],
  ['--sidebar', tingido(4, '0.975 0 none'), tingido(3, '0.15 0 none'), '0 0 0'],
  ['--sidebar-accent', tingido(5, '0.94 0 none'), tingido(6, '0.269 0 none'), tingido(6, '0.22 0 none')],
  ['--sidebar-border', tingido(6, '0.9 0 none'), tingido(5, '0.27 0 none'), tingido(5, '0.26 0 none')],
  ['--sidebar-ring', 'var(--ring)', 'var(--ring)', '='],
  ['--ring', '0.5 0 0', '0.556 0 0', '='],
  ['--primary', '0.45 0.15 262', '0.72 0.12 262', '='],
  ['--primary-foreground', '0.985 0 0', '0.17 0 0', '='],
  ['--primary-subtle', '0.96 0.02 262', '0.27 0.05 262', '0.24 0.05 262'],
  ['--muted', tingido(4, '0.985 0 none'), tingido(5, '0.22 0 none'), tingido(4, '0.19 0 none')],
  ['--accent', tingido(5, '0.975 0 none'), tingido(6, '0.25 0 none'), tingido(6, '0.24 0 none')],
  ['--muted-foreground', '0.50 0 0', '0.71 0 0', '0.70 0 0'],
  ['--warning-subtle', '0.97 0.04 90', '0.30 0.05 85', '0.27 0.05 85'],
  ['--success', '0.52 0.13 155', '0.72 0.14 155', '='],
  ['--destructive', '0.577 0.245 27.325', '0.704 0.191 22.216', '='],
  ['--border', tingido(6, '0.93 0 none'), tingido(5, '0.27 0 none'), tingido(5, '0.26 0 none')],
  ['--input', tingido(6, '0.66 0 none'), tingido(5, '0.58 0 none'), tingido(5, '0.58 0 none')],
  ['--chart-1', tingido(45, '0.6 0 none'), tingido(45, '0.8 0 none'), '='],
  ['--chart-2', tingido(45, '0.6 0 none'), tingido(45, '0.8 0 none'), '='],
]
// os 3 temas como o navegador os resolve: o Preto é o .dark com o .black por cima
const temas = () => ({ ':root': bloco(':root'), '.dark': bloco('.dark'), '.dark.black': { ...bloco('.dark'), ...bloco('.black') } })

afterEach(() => {
  document.documentElement.className = ''
})

describe('interface nova', () => {
  it('versões exatas e pacotes proibidos', () => {
    expect(Object.entries(todas).filter(([, versao]) => !/^\d+\.\d+\.\d+$/.test(versao))).toEqual([])
    for (const proibido of ['ai', '@ai-sdk/react', 'streamdown', 'next-themes']) expect(todas, proibido).not.toHaveProperty([proibido])
  })

  // estrutura-visual C3 (door 1, AC 3): o foco é o contorno global; as classes de auréola saem de web/src
  it('foco sem classes de auréola', () => {
    // os nomes vão em pedaços para este arquivo não se acusar
    const proibidas = ['ring-ring' + '/50', 'outline-ring' + '/50', 'focus-visible:ring-' + '[3px]']
    const lidos = arquivos.filter((a) => a !== 'test/interface.test.ts')
    expect(arquivos.filter((a) => a.startsWith('ui/') && !a.includes('.test.')).length).toBeGreaterThanOrEqual(8)
    for (const p of proibidas) expect([p, lidos.filter((a) => texto(a).includes(p))]).toEqual([p, []])
    expect(css).not.toContain('outline-ring' + '/50')
  })

  // estrutura-visual C24 (door 4): o Recharts e o Grafico saem
  it('sem biblioteca de gráfico', () => {
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
    expect(todas).not.toHaveProperty(['recharts'])
    expect(lock.packages[''].dependencies).not.toHaveProperty(['recharts'])
    expect(arquivos).not.toContain('indicadores/Grafico.tsx')
    const assets = '../api/wwwroot/assets'
    expect(existsSync(assets) ? readdirSync(assets).filter((f) => f.startsWith('Grafico-')) : []).toEqual([])
  })

  // tempo-real-signalr C44 (door 2): a conexão do navegador é do @microsoft/signalr, em dependencies e com versão exata
  it('SignalR exato e só no web', () => {
    expect(pacote.dependencies['@microsoft/signalr']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(pacote.devDependencies).not.toHaveProperty(['@microsoft/signalr'])
  })

  // tempo-real-signalr C45: o proxy do dev leva o WebSocket e o service worker não guarda API
  it('proxy do dev com WebSocket e PWA sem API em cache', () => {
    expect(semEspacos(vite)).toContain("proxy:{'/api':{target:'http://localhost:5226',ws:true}}")
    // web-push door 5: com injectManifest o fallback de navegação e a lista de negados moram no sw.ts
    const sw = readFileSync('src/sw.ts', 'utf8')
    expect(sw).toContain('denylist: Negados')
    expect(sw).toContain('export const Negados = [/^\\/api\\//]')
    expect(vite).toContain("globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}']")
    expect(vite).not.toContain('runtimeCaching')
  })

  // C76 (door 14)
  it('pacotes do Tiptap', () => {
    for (const nome of ['@tiptap/react', '@tiptap/pm', '@tiptap/extension-document', '@tiptap/extension-paragraph', '@tiptap/extension-text', '@tiptap/extensions'])
      expect(todas[nome], nome).toMatch(/^\d+\.\d+\.\d+$/)
    expect(todas).not.toHaveProperty(['@tiptap/starter-kit'])
  })

  it('configuração do Tailwind e do shadcn', () => {
    expect(semEspacos(vite)).toContain('plugins:[react(),tailwindcss(),VitePWA(')
    expect(vite).toMatch(/alias:\s*\{\s*'@':\s*path\.resolve\(__dirname,\s*'\.\/src'\)\s*\}/)
    expect(componentes.style).toBe('new-york')
    expect(componentes.tailwind).toMatchObject({ config: '', css: 'src/index.css', cssVariables: true })
    expect(componentes.aliases).toEqual({ components: '@/ui', ui: '@/ui', utils: '@/ui/utils', lib: '@/ui', hooks: '@/ui' })
    expect(tsconfig.compilerOptions.paths).toEqual({ '@/*': ['./src/*'] })
  })

  // C90 (AC 47): ninguém importa o Bootstrap nem os ícones dele (os nomes vão em pedaços para este arquivo não se acusar)
  it('sem Bootstrap nos arquivos', () => {
    for (const pacote of ['react-' + 'bootstrap', 'bootstrap-' + 'icons']) expect(arquivos.filter((a) => !a.includes('.test.') && texto(a).includes(pacote)), pacote).toEqual([])
    expect(css).not.toContain('bootstrap')
  })

  it('camada do Bootstrap', () => {
    const Css = 'bootstrap/dist/css/bootstrap.min.css'
    if (comBootstrap()) {
      expect(css.startsWith('@layer theme, base, bootstrap, components, utilities;')).toBe(true)
      expect(css.split(Css)).toHaveLength(2)
      expect(css).toContain(`@import "${Css}" layer(bootstrap);`)
      expect(arquivos.filter((a) => texto(a).includes(Css))).toEqual([])
    } else {
      expect(css).not.toContain('bootstrap')
      for (const nome of ['bootstrap', 'react-bootstrap', 'bootstrap-icons']) expect(todas, nome).not.toHaveProperty([nome])
    }
  })

  it('contraste dos tokens', () => {
    for (const [seletor, t] of Object.entries(temas()))
      for (const [frente, fundo] of [
        ['--foreground', '--background'],
        ['--foreground', '--card'],
        ['--muted-foreground', '--background'],
        ['--muted-foreground', '--muted'],
        ['--muted-foreground', '--primary-subtle'],
        ['--muted-foreground', '--warning-subtle'],
        ['--primary-foreground', '--primary'],
        ['--destructive', '--background'],
      ])
        expect(contraste(t[frente], t[fundo]), `${seletor} ${frente}/${fundo}`).toBeGreaterThanOrEqual(4.5)
  })

  // login-institucional C14: texto sobre o fundo do painel, que agora é o --muted neutro
  it('contraste do painel de entrada', () => {
    for (const [seletor, t] of Object.entries(temas()))
      for (const frente of ['--foreground', '--muted-foreground']) expect(contraste(t[frente], t['--muted']), `${seletor} ${frente}`).toBeGreaterThanOrEqual(4.5)
  })

  it('tokens da paleta', () => {
    const [claro, escuro, preto, tema] = [bloco(':root'), bloco('.dark'), bloco('.black'), bloco('@theme inline')]
    expect(css.indexOf('.black {')).toBeGreaterThan(css.indexOf('.dark {'))
    for (const [token, valorClaro, valorEscuro, valorPreto] of Tokens) {
      expect(claro[token], `:root ${token}`).toBe(valorClaro)
      expect(escuro[token], `.dark ${token}`).toBe(valorEscuro)
      expect(preto[token], `.black ${token}`).toBe(valorPreto === '=' ? undefined : valorPreto)
      expect(Object.values(tema), `@theme inline ${token}`).toContain(`var(${token})`)
    }
    expect(tema['--font-sans']).toBe("'Public Sans Variable', ui-sans-serif, system-ui, sans-serif")
    const CorLiteral = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])|\b(?:oklch|rgb|hsl)\(/
    expect(arquivos.filter((a) => CorLiteral.test(texto(a)))).toEqual([])
  })

  // redesign-institucional C22 (AC 22), layout-painel door 3: o h1 das telas de acesso é o de sempre; o das telas autenticadas é um só, no cabeçalho
  it('títulos de página', () => {
    const titulos = arquivos.filter((a) => !a.includes('.test.')).flatMap((a) => [...texto(a).matchAll(/<h1[^>]*>/g)].map((m) => [a, m[0]]))
    expect(titulos.map(([arquivo]) => arquivo).sort()).toEqual(['Autenticado.tsx', 'acesso/Acesso.tsx'])
    for (const [arquivo, h1] of titulos)
      expect(h1, arquivo).toMatch(arquivo === 'Autenticado.tsx' ? /className="(?:[^"]* )?text-base font-medium[ "]/ : /className="(?:[^"]* )?font-heading text-\[28px\][ "]/)
  })

  // identidade-visual C55: fora dos temas, só o form da resposta redefine --input, e só o cinza do token claro
  it('regra da borda do form da resposta', () => {
    expect(css.match(/form-resposta/g)).toHaveLength(1)
    const regras = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*form-resposta[^{}]*)\{([^}]*)\}/g)]
    expect(regras.map((r) => r[1].trim())).toEqual(['.form-resposta:not(.dark *)'])
    const token = Tokens.find((l) => l[0] === '--input')![1]
    expect(token).toContain('0.66 0 none')
    expect(regras[0][2].trim()).toBe(`--input: ${token.replace('0.66 0 none', '0.63 0 none')};`)
  })

  // layout-painel C35 (AC 35): os tokens de ## Visual não mudaram nos 3 temas
  it('tokens de Visual', () => {
    const t = temas()
    const colunas = { ':root': 1, '.dark': 2, '.dark.black': 3 } as const
    for (const [seletor, coluna] of Object.entries(colunas))
      for (const linha of Tokens) {
        const esperado = linha[coluna] === '=' ? linha[2] : linha[coluna]
        expect(t[seletor as keyof typeof t][linha[0]], `${seletor} ${linha[0]}`).toBe(esperado)
      }
  })

  // layout-painel C35 (AC 35): o texto e o item ativo da barra legíveis nos 3 temas
  it('contraste dos tokens da barra', () => {
    for (const [seletor, t] of Object.entries(temas()))
      for (const [frente, fundo] of [
        ['--sidebar-foreground', '--sidebar'],
        ['--sidebar-accent-foreground', '--sidebar-accent'],
      ])
        expect(contraste(t[frente], t[fundo]), `${seletor} ${frente}/${fundo}`).toBeGreaterThanOrEqual(4.5)
  })

  // layout-painel C38: a gaveta Vaul saiu, com o pacote
  it('sem gaveta Vaul', () => {
    expect(arquivos.filter((a) => a === 'ui/drawer.tsx')).toEqual([])
    expect(arquivos.filter((a) => /ui\/drawer['"]|from 'vaul'/.test(texto(a)) && !a.includes('interface.test'))).toEqual([])
    expect(todas).not.toHaveProperty(['vaul'])
  })

  it('provedores dentro do App', () => {
    for (const provedor of ['<QueryClientProvider', '<ThemeProvider', '<MotionConfig', '<Toaster']) {
      expect(texto('App.tsx'), provedor).toContain(provedor)
      expect(texto('main.tsx'), provedor).not.toContain(provedor)
    }
    expect(texto('main.tsx')).toContain('<App />')
    expect(texto('test/util.tsx')).toMatch(/export function abrir[\s\S]*<App \/>/)
    expect(texto('test/util.tsx')).toContain("import { App } from '../App'")
  })

  it('tema claro enquanto houver react-bootstrap', async () => {
    for (const escuro of [false, true]) {
      vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: escuro, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
      api({ 'GET /api/auth/me': () => [200, me()] })
      const { unmount } = abrir('/univag/trocar-senha')
      await screen.findByRole('heading', { name: 'Trocar senha' })
      if (comBootstrap()) {
        expect(document.documentElement, `escuro ${escuro}`).toHaveClass('light')
        expect(document.documentElement, `escuro ${escuro}`).not.toHaveClass('dark')
        expect(screen.queryByRole('button', { name: 'Tema' })).not.toBeInTheDocument()
      } else {
        // o Tema mora no rodapé da barra; o aluno abaixo de 768 px (o stub escuro) tem a barra de abas e o Tema na aba Conta
        if (!escuro) expect(screen.getByRole('button', { name: 'Tema' })).toBeInTheDocument()
        else expect(screen.queryByRole('button', { name: 'Tema' })).not.toBeInTheDocument()
      }
      unmount()
    }
  })

  it('AI Elements só visual', () => {
    expect(arquivos).toEqual(expect.arrayContaining(['ui/conversation.tsx', 'ui/message.tsx']))
    const exportados = [...texto('ui/message.tsx').matchAll(/export (?:const|function) (\w+)/g)].map(([, nome]) => nome)
    expect(exportados).toEqual(['Message', 'MessageContent'])
    // os nomes vão em pedaços para este arquivo não se acusar
    for (const proibido of ['Conversation' + 'ScrollButton', 'Message' + 'Response']) expect(arquivos.filter((a) => texto(a).includes(proibido)), proibido).toEqual([])
  })

  // C52 (door 16): o TanStack Table só nas tabelas de 2 colunas, sem ordenação, filtro nem paginação
  it('TanStack Table só nas 3 tabelas', () => {
    // os nomes vão em pedaços para este arquivo não se acusar
    const usam = arquivos.filter((a) => texto(a).includes('useReact' + 'Table('))
    expect(['indicadores/Indicadores.tsx', 'administracao/Matriculas.tsx']).toEqual(expect.arrayContaining(usam))
    expect(usam).toContain('indicadores/Indicadores.tsx')
    for (const recurso of ['getSorted' + 'RowModel', 'getFiltered' + 'RowModel', 'getPagination' + 'RowModel']) expect(arquivos.filter((a) => texto(a).includes(recurso)), recurso).toEqual([])
  })

  it('sem Select do Radix nem AlertDialog', () => {
    const Proibido = /from ['"](?:@\/ui\/|(?:\.\.?\/)+ui\/)(?:select|alert-dialog|date-picker)['"]|from ['"]@radix-ui\/react-(?:select|alert-dialog)['"]|import \{[^}]*\b(?:Select|AlertDialog)\b[^}]*\} from ['"]radix-ui['"]/
    expect(arquivos.filter((a) => Proibido.test(texto(a)))).toEqual([])
    for (const nome of ['select', 'alert-dialog', 'date-picker']) expect(arquivos).not.toContain(`ui/${nome}.tsx`)
  })

  it('controles nativos', async () => {
    const admin = me({ papeis: ['ADMINISTRADOR', 'ATENDENTE'], matriculas: [] })
    const tipo = (rotulo: string, raiz: HTMLElement = document.body) => within(raiz).getByLabelText(rotulo).getAttribute('type')
    const telas: [string, Record<string, () => [number, unknown]>, () => Promise<void>][] = [
      ['/univag/indicadores', {}, async () => {
        await screen.findByLabelText('De')
        expect([tipo('De'), tipo('Até')]).toEqual(['date', 'date'])
      }],
      ['/univag/artigos', { 'GET /api/admin/artigos': () => [200, []], 'GET /api/admin/categorias': () => [200, []] }, async () => {
        await userEvent.click(await screen.findByRole('button', { name: 'Novo artigo' }))
        const dialogo = await screen.findByRole('dialog')
        expect([tipo('Válido de (opcional)', dialogo), tipo('Válido até (opcional)', dialogo)]).toEqual(['date', 'date'])
      }],
      ['/univag/documentos', { 'GET /api/admin/documentos': () => [200, []], 'GET /api/admin/categorias': () => [200, []] }, async () => {
        await userEvent.click(await screen.findByRole('button', { name: /Enviar PDF/ }))
        expect(tipo('Arquivo PDF', await screen.findByRole('dialog'))).toBe('file')
      }],
      ['/univag/matriculas', {}, async () => {
        await screen.findByLabelText('Arquivo CSV')
        expect(tipo('Arquivo CSV')).toBe('file')
      }],
      ['/univag/chamados/ONE-1', { 'GET /api/chamados/ONE-1': () => [200, chamado({ acoes: ['responder'] })] }, async () => {
        await screen.findByLabelText('Anexos (PDF, JPG ou PNG, até 10 MB cada)')
        expect(tipo('Anexos (PDF, JPG ou PNG, até 10 MB cada)')).toBe('file')
      }],
    ]
    for (const [caminho, rotas, conferir] of telas) {
      api({ 'GET /api/auth/me': () => [200, admin], ...rotas })
      const { unmount } = abrir(caminho)
      await conferir()
      unmount()
    }
  })

  // C93 (AC 51): o theme_color do manifesto e a meta theme-color são o --primary claro em sRGB de 8 bits
  it('theme-color é o primary claro', () => {
    const gama = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)
    const hex = '#' + linear(bloco(':root')['--primary']).map((x) => Math.round(gama(x) * 255).toString(16).padStart(2, '0')).join('')
    expect(vite.match(/theme_color:\s*'([^']+)'/)![1]).toBe(hex)
    expect(html.match(/<meta name="theme-color" content="([^"]+)"/)![1]).toBe(hex)
    expect(hex).not.toBe('#0d6efd')
  })

  // C94 (door 7, Flow 5): o estado das telas é do TanStack Query
  it('estado das telas só pelo TanStack Query', () => {
    // os nomes vão em pedaços para este arquivo não se acusar
    for (const nome of ['use' + 'Acao', 'use' + 'Lista', 'use' + 'Base', 'use' + 'Listas']) expect(arquivos.filter((a) => !a.includes('.test.') && texto(a).includes(nome)), nome).toEqual([])
    expect(texto('chamado.ts')).not.toContain('set' + 'Interval')
    expect(texto('chamado.ts')).toContain('refetchInterval')
  })
})
