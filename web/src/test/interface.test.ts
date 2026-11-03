import { screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
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
  for (const [, nome, valor] of corpo.matchAll(/(--[\w-]+):\s*([^;]+);/g)) valores[nome] = valor.trim().replace(/^oklch\((.*)\)$/, '$1')
  return valores
}

// oklch -> sRGB linear (CSS Color 4), cortado em [0, 1]; luminância e contraste do WCAG 2.
function linear(valor: string): number[] {
  const [l, c, h] = valor.split(' ').map(Number)
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

// ## Visual: os 13 tokens, claro e escuro (o oklch sem a função)
const Tokens: [string, string, string][] = [
  ['--background', '1 0 0', '0.17 0.02 265'],
  ['--foreground', '0.21 0.02 265', '0.97 0 0'],
  ['--primary', '0.49 0.17 262', '0.70 0.14 262'],
  ['--primary-foreground', '0.985 0 0', '0.17 0.02 265'],
  ['--primary-subtle', '0.95 0.03 262', '0.28 0.06 262'],
  ['--muted', '0.967 0.003 265', '0.24 0.02 265'],
  ['--muted-foreground', '0.50 0.02 265', '0.72 0.02 265'],
  ['--warning-subtle', '0.96 0.05 90', '0.32 0.06 85'],
  ['--success', '0.55 0.14 155', '0.70 0.14 155'],
  ['--destructive', '0.577 0.245 27.325', '0.704 0.191 22.216'],
  ['--chart-1', 'var(--primary)', 'var(--primary)'],
  ['--chart-2', '0.65 0.12 200', '0.75 0.11 200'],
  ['--radius', '0.625rem', '0.625rem'],
]

afterEach(() => {
  document.documentElement.className = ''
})

describe('interface nova', () => {
  it('versões exatas e pacotes proibidos', () => {
    expect(Object.entries(todas).filter(([, versao]) => !/^\d+\.\d+\.\d+$/.test(versao))).toEqual([])
    for (const proibido of ['ai', '@ai-sdk/react', 'streamdown', 'next-themes']) expect(todas, proibido).not.toHaveProperty([proibido])
  })

  // tempo-real-signalr C44 (door 2): a conexão do navegador é do @microsoft/signalr, em dependencies e com versão exata
  it('SignalR exato e só no web', () => {
    expect(pacote.dependencies['@microsoft/signalr']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(pacote.devDependencies).not.toHaveProperty(['@microsoft/signalr'])
  })

  // tempo-real-signalr C45: o proxy do dev leva o WebSocket e o service worker não guarda API
  it('proxy do dev com WebSocket e PWA sem API em cache', () => {
    expect(semEspacos(vite)).toContain("proxy:{'/api':{target:'http://localhost:5226',ws:true}}")
    expect(vite).toContain('navigateFallbackDenylist: [/^\\/api\\//]')
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
    for (const seletor of [':root', '.dark']) {
      const t = bloco(seletor)
      for (const [frente, fundo] of [
        ['--foreground', '--background'],
        ['--primary-foreground', '--primary'],
        ['--muted-foreground', '--background'],
        ['--destructive', '--background'],
      ])
        expect(contraste(t[frente], t[fundo]), `${seletor} ${frente}/${fundo}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('tokens da paleta', () => {
    const [claro, escuro, tema] = [bloco(':root'), bloco('.dark'), bloco('@theme inline')]
    for (const [token, valorClaro, valorEscuro] of Tokens) {
      expect(claro[token], `:root ${token}`).toBe(valorClaro)
      expect(escuro[token], `.dark ${token}`).toBe(valorEscuro)
      expect(Object.values(tema), `@theme inline ${token}`).toContain(`var(${token})`)
    }
    expect(tema['--font-sans']).toBe("'Inter Variable', ui-sans-serif, system-ui, sans-serif")
    const CorLiteral = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])|\b(?:oklch|rgb|hsl)\(/
    expect(arquivos.filter((a) => CorLiteral.test(texto(a)))).toEqual([])
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
      } else expect(screen.getByRole('button', { name: 'Tema' })).toBeInTheDocument()
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
        await userEvent.click(await screen.findByRole('button', { name: /Novo/ }))
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
