import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { describe, expect, it, vi } from 'vitest'
import html from '../index.html?raw'
import { abrir, api, instituicao, me } from './test/util'

const css = readFileSync('src/index.css', 'utf8')

type ManifestoEstatico = { id: string; scope: string; icons: { src: string; sizes: string; purpose?: string }[]; background_color: string; theme_color: string }

function manifestoEstatico() {
  const fonte = readFileSync('vite.config.ts', 'utf8')
  const bloco = fonte.match(/manifest:\s*(\{[\s\S]*?\r?\n {6}\}),\r?\n {6}injectManifest/)![1]
  return new Function(`return (${bloco})`)() as ManifestoEstatico
}

const Maskable = '/icons/icon-maskable-512.png'
const dimensoesDoPng = (arquivo: string) => {
  const b = readFileSync(arquivo)
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}
const Moldura = [34, 79, 167, 255]
function pixelsDoPng(arquivo: string) {
  const b = readFileSync(arquivo)
  const [largura, altura] = [b.readUInt32BE(16), b.readUInt32BE(20)]
  expect([b[24], b[25], b[28]]).toEqual([8, 6, 0])
  const partes: Buffer[] = []
  for (let o = 8; o < b.length; o += 12 + b.readUInt32BE(o)) if (b.toString('ascii', o + 4, o + 8) === 'IDAT') partes.push(b.subarray(o + 8, o + 8 + b.readUInt32BE(o)))
  const bruto = inflateSync(Buffer.concat(partes))
  const passo = largura * 4
  const saida = Buffer.alloc(passo * altura)
  const paeth = (a: number, c: number, d: number) => {
    const p = a + c - d
    const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - c), Math.abs(p - d)]
    return pa <= pb && pa <= pc ? a : pb <= pc ? c : d
  }
  for (let y = 0; y < altura; y++) {
    const filtro = bruto[y * (passo + 1)]
    for (let x = 0; x < passo; x++) {
      const v = bruto[y * (passo + 1) + 1 + x]
      const a = x >= 4 ? saida[y * passo + x - 4] : 0
      const c = y > 0 ? saida[(y - 1) * passo + x] : 0
      const d = x >= 4 && y > 0 ? saida[(y - 1) * passo + x - 4] : 0
      const previsto = [0, a, c, (a + c) >> 1, paeth(a, c, d)][filtro]
      saida[y * passo + x] = (v + previsto) & 255
    }
  }
  return { largura, altura, pixel: (x: number, y: number) => [...saida.subarray(y * passo + x * 4, y * passo + x * 4 + 4)] }
}
type Regra = { contexto: string[]; seletor: string; corpo: string }

function regras(texto: string, contexto: string[] = []): Regra[] {
  const limpo = texto.replace(/\/\*[\s\S]*?\*\//g, '')
  const saida: Regra[] = []
  let i = 0
  while (i < limpo.length) {
    const abre = limpo.indexOf('{', i)
    if (abre < 0) break
    const cabecalho = limpo.slice(i, abre).replace(/^(?:\s*@[^{;]*;)+/, '').trim()
    let fundo = 1
    let j = abre + 1
    while (fundo > 0 && j < limpo.length) {
      if (limpo[j] === '{') fundo++
      if (limpo[j] === '}') fundo--
      j++
    }
    const corpo = limpo.slice(abre + 1, j - 1)
    if (cabecalho.startsWith('@media') || cabecalho.startsWith('@layer') || cabecalho.startsWith('@supports')) saida.push(...regras(corpo, [...contexto, cabecalho.replace(/\s+/g, ' ')]))
    else if (!cabecalho.startsWith('@')) saida.push({ contexto, seletor: cabecalho.replace(/\s+/g, ' '), corpo: corpo.replace(/\s+/g, ' ').trim() })
    i = j
  }
  return saida
}

const semAspas = (s: string) => s.replace(/['"]/g, '')
const seletores = (r: Regra) => r.seletor.split(',').map((s) => semAspas(s.trim()))
const declara = (r: Regra, propriedade: string, valor?: string) => {
  const m = r.corpo.match(new RegExp(`(?:^|[;\\s])${propriedade}\\s*:\\s*([^;]+)`))
  return !!m && (valor === undefined || m[1].replace(/\s*!important/, '').trim() === valor)
}
const com = (propriedade: string, valor?: string) => regras(css).filter((r) => declara(r, propriedade, valor))
const dosSeletores = (rs: Regra[]) => rs.flatMap(seletores)

type Cor = { L: number; C: number; h?: number }
const lerCor = (texto: string): Cor => {
  const [L, C, H] = texto.match(/oklch\(([^)]+)\)/)![1].trim().split(/\s+/)
  return { L: Number(L), C: Number(C), h: H === 'none' ? undefined : Number(H) }
}

function fundoDe(valor: string): Cor {
  const mistura = valor.match(/color-mix\(in oklch,\s*var\(--marca,\s*(oklch\([^)]+\))\)\s*([\d.]+)%,\s*(oklch\([^)]+\))\)/)
  if (!mistura) return lerCor(valor)
  const [a, b, p] = [lerCor(mistura[1]), lerCor(mistura[3]), Number(mistura[2]) / 100]
  return { L: a.L * p + b.L * (1 - p), C: a.C * p + b.C * (1 - p), h: a.h ?? b.h ?? 0 }
}

const canal = (x: number) => {
  const c = Math.min(1, Math.max(0, x))
  return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255).toString(16).padStart(2, '0')
}

function hexDe({ L, C, h = 0 }: Cor) {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const [l, m, s] = [(L + 0.3963377774 * a + 0.2158037573 * b) ** 3, (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, (L - 0.0894841775 * a - 1.291485548 * b) ** 3]
  return '#' + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(canal).join('')
}

const fundoDoTema = (seletor: string) => {
  const regra = regras(css).find((r) => r.contexto.length === 0 && seletores(r).includes(seletor) && declara(r, '--background'))
  return hexDe(fundoDe(regra!.corpo.match(/--background\s*:\s*([^;]+)/)![1].trim()))
}
const [claro, escuro, preto] = [':root', '.dark', '.black'].map(fundoDoTema)

describe('base global do css', () => {
  it('C1 movimento reduzido zera animação, transição e rolagem exceto .animate-spin', () => {
    const reduzido = regras(css).filter((r) => r.contexto.some((c) => c.includes('prefers-reduced-motion: reduce')))
    expect(reduzido.length).toBeGreaterThan(0)
    for (const propriedade of ['animation-duration', 'transition-duration', 'scroll-behavior']) {
      const regra = reduzido.find((r) => declara(r, propriedade))
      expect(regra, propriedade).toBeDefined()
      expect(regra!.seletor, propriedade).toContain(':not(.animate-spin)')
      expect(regra!.corpo, propriedade).toMatch(propriedade === 'scroll-behavior' ? /scroll-behavior:\s*auto\s*!important/ : new RegExp(`${propriedade}:\\s*0\\.01ms\\s*!important`))
    }
    expect(reduzido.some((r) => /animate-spin\b/.test(r.seletor) && !r.seletor.includes(':not(.animate-spin)'))).toBe(false)
  })

  it('C2 touch-action manipulation nos controles e sem tap highlight no body', () => {
    const alvo = ['a', 'button', '[role=button]', 'input', 'select', 'textarea', 'label']
    const regra = com('touch-action', 'manipulation').find((r) => alvo.every((s) => seletores(r).includes(s)))
    expect(regra).toBeDefined()
    expect(com('touch-action').flatMap(seletores)).not.toContain('html')
    expect(com('touch-action').flatMap(seletores)).not.toContain('body')
    const body = regras(css).filter((r) => seletores(r).includes('body') && declara(r, '-webkit-tap-highlight-color', 'transparent'))
    expect(body.length).toBeGreaterThan(0)
  })

  it('C3 color-scheme claro no :root e escuro em .dark e .black', () => {
    const declara3 = (seletor: string, valor: string) => regras(css).some((r) => r.contexto.length === 0 && seletores(r).includes(seletor) && declara(r, 'color-scheme', valor))
    expect(declara3(':root', 'light')).toBe(true)
    expect(declara3('.dark', 'dark')).toBe(true)
    expect(declara3('.black', 'dark')).toBe(true)
  })

  it('C4 overscroll-behavior contain em sheet, dialog, popover e corpo do Editor', () => {
    const lista = dosSeletores(com('overscroll-behavior', 'contain'))
    for (const s of ['[data-slot=sheet-content]', '[data-slot=dialog-content]', '[data-slot=popover-content]', '[data-slot=editor-corpo]']) expect(lista, s).toContain(s)
    const editor = readFileSync('src/Editor.tsx', 'utf8')
    expect(editor).toMatch(/data-slot=["']editor-corpo["']/)
  })

  it('C5 overscroll-behavior none em html só com pointer fine', () => {
    const doHtml = com('overscroll-behavior').filter((r) => seletores(r).includes('html'))
    expect(doHtml.length).toBeGreaterThan(0)
    for (const r of doHtml) {
      expect(r.contexto.some((c) => c.includes('(pointer: fine)'))).toBe(true)
      expect(declara(r, 'overscroll-behavior', 'none')).toBe(true)
    }
    expect(regras(css).filter((r) => seletores(r).includes('html') && r.contexto.length === 0 && declara(r, 'overscroll-behavior'))).toEqual([])
  })

  it('C6 scroll-padding de topo e de base em html', () => {
    const doHtml = regras(css).filter((r) => seletores(r).includes('html'))
    expect(doHtml.some((r) => declara(r, 'scroll-padding-top', '3.5rem'))).toBe(true)
    expect(doHtml.some((r) => declara(r, 'scroll-padding-bottom', 'calc(var(--barra, 0px) + 1rem)'))).toBe(true)
  })

  it('C6 --barra é definida em html enquanto a barra de abas existe e sai junto com ela', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media.startsWith('(max-width: 767px)'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
    api({
      'GET /api/auth/me': () => [200, me()],
      'GET /api/instituicoes/univag': () => [200, instituicao()],
      'GET /api/chamados?escopo=meus': () => [200, []],
    })
    const barra = () => document.documentElement.style.getPropertyValue('--barra')
    const { unmount } = abrir('/univag/conta')
    await screen.findByRole('navigation', { name: 'Navegação' })
    expect(barra()).toMatch(/^calc\(3\.5rem \+ 1px \+ env\(safe-area-inset-bottom\)\)$/)
    unmount()
    expect(barra()).toBe('')
    vi.unstubAllGlobals()
  })

  it('C6 --barra não existe em html sem a barra de abas', async () => {
    window.innerWidth = 1024
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/conta')
    await screen.findByRole('heading', { name: 'Conta' })
    expect(document.documentElement.style.getPropertyValue('--barra')).toBe('')
  })
  it('C7 index.html traz theme-color por tema', () => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const metas = [...doc.head.querySelectorAll('meta[name="theme-color"]')]
    const por = (media: string) => metas.find((m) => m.getAttribute('media') === media)?.getAttribute('content')
    expect(por('(prefers-color-scheme: light)')).toBe(claro)
    expect(por('(prefers-color-scheme: dark)')).toBe(escuro)
  })

  it('C7 trocar o tema atualiza o theme-color sem media', async () => {
    localStorage.clear()
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    const cor = () => document.head.querySelector('meta[name="theme-color"]:not([media])')?.getAttribute('content')
    for (const [rotulo, esperado] of [['Escuro', escuro], ['Claro', claro], ['Preto', preto], ['Claro', claro]] as const) {
      await userEvent.click(await screen.findByRole('button', { name: 'Tema' }))
      await userEvent.click(await screen.findByRole('button', { name: rotulo }))
      await vi.waitFor(() => expect(cor(), rotulo).toBe(esperado))
    }
  })

  it('C7 no tema Sistema o theme-color sem media acompanha prefers-color-scheme e os outros temas seguem os hex', async () => {
    localStorage.clear()
    let escuroAgora = false
    const ouvintes = new Set<(e: { matches: boolean }) => void>()
    vi.stubGlobal('matchMedia', (media: string) => ({
      media,
      get matches() {
        return media === '(prefers-color-scheme: dark)' && escuroAgora
      },
      addEventListener: (_: string, f: (e: { matches: boolean }) => void) => ouvintes.add(f),
      removeEventListener: (_: string, f: (e: { matches: boolean }) => void) => ouvintes.delete(f),
      addListener() {},
      removeListener() {},
    }))
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    const cor = () => document.head.querySelector('meta[name="theme-color"]:not([media])')?.getAttribute('content')
    const trocar = async (rotulo: string) => {
      await userEvent.click(await screen.findByRole('button', { name: 'Tema' }))
      await userEvent.click(await screen.findByRole('button', { name: rotulo }))
    }
    const sistema = (escuro: boolean) => {
      escuroAgora = escuro
      act(() => ouvintes.forEach((f) => f({ matches: escuro })))
    }
    await vi.waitFor(() => expect(cor(), 'sistema claro').toBe(claro))
    sistema(true)
    await vi.waitFor(() => expect(cor(), 'sistema escuro').toBe(escuro))
    sistema(false)
    await vi.waitFor(() => expect(cor(), 'sistema claro de novo').toBe(claro))
    sistema(true)
    await trocar('Preto')
    await vi.waitFor(() => expect(cor(), 'preto').toBe(preto))
    await trocar('Claro')
    await vi.waitFor(() => expect(cor(), 'claro com o sistema escuro').toBe(claro))
    await trocar('Sistema')
    await vi.waitFor(() => expect(cor(), 'volta ao sistema escuro').toBe(escuro))
  })

  it('C8 manifest com id, scope, ícone maskable e background igual ao theme_color claro', () => {
    const manifest = manifestoEstatico()

    expect(manifest.id).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)
    expect(manifest.background_color).toBe(claro)
    expect(manifest.theme_color).toBe(claro)
  })

  it('C17 o manifest estático lista o maskable de 512 x 512 e deixa icon-512.png só como any', () => {
    const { icons } = manifestoEstatico()
    expect(icons.filter((i) => i.purpose === 'maskable').map((i) => i.src)).toEqual([Maskable])
    expect(icons.filter((i) => i.src === '/icons/icon-512.png').map((i) => i.purpose)).toEqual(['any'])
    expect(dimensoesDoPng(`public${Maskable}`)).toEqual([512, 512])
  })

  it('C17 todo pixel do maskable diferente da moldura fica no círculo central de raio 40% do lado (zona segura do W3C)', () => {
    const { largura, altura, pixel } = pixelsDoPng(`public${Maskable}`)
    expect(pixel(0, 0)).toEqual(Moldura)
    const raio = 0.4 * largura
    const fora: string[] = []
    let arte = 0
    for (let y = 0; y < altura; y++)
      for (let x = 0; x < largura; x++) {
        if (pixel(x, y).every((v, i) => v === Moldura[i])) continue
        arte++
        if (Math.hypot(x + 0.5 - largura / 2, y + 0.5 - altura / 2) > raio) fora.push(`(${x},${y})`)
      }
    expect(arte).toBeGreaterThan(0)
    expect(fora.length, fora.slice(0, 5).join(' ')).toBe(0)
  })

  it('C21 o manifest estático e o da API apontam o mesmo arquivo maskable', () => {
    const daApi = readFileSync('../One.Api/Instituicoes/Carga/ManifestoInstituicao.cs', 'utf8').match(/IconeMaskable\s*=\s*"([^"]+)"/)![1]
    const maskable = manifestoEstatico().icons.find((i) => i.purpose === 'maskable')!
    expect(daApi).toBe(maskable.src)
    expect(daApi).toBe(Maskable)
    expect(maskable.sizes).toBe('512x512')
  })
  it('C9 Topo e cabeçalho do Editor somam env(safe-area-inset-top)', () => {
    const topo = readFileSync('src/Autenticado.tsx', 'utf8').match(/<header[^>]*className="([^"]+)"/)![1]
    expect(topo).toContain('env(safe-area-inset-top)')
    const editor = readFileSync('src/Editor.tsx', 'utf8').match(/<SheetHeader[^>]*className="([^"]+)"/)![1]
    expect(editor).toContain('env(safe-area-inset-top)')
  })
})
