import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import html from '../index.html?raw'
import { abrir, api, me } from './test/util'

const hex = (digitos: string) => '#' + digitos
const [claro, escuro, preto] = [hex('ffffff'), hex('0a0a0a'), hex('000000')]
const css = readFileSync('src/index.css', 'utf8')

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

  it('C8 manifest com id, scope, ícone maskable e background igual ao theme_color claro', () => {
    const fonte = readFileSync('vite.config.ts', 'utf8')
    const bloco = fonte.match(/manifest:\s*(\{[\s\S]*?\r?\n {6}\}),\r?\n {6}injectManifest/)![1]
    const manifest = new Function(`return (${bloco})`)() as { id: string; scope: string; icons: { purpose?: string }[]; background_color: string; theme_color: string }
    expect(manifest.id).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)
    expect(manifest.background_color).toBe(claro)
    expect(manifest.theme_color).toBe(claro)
  })

  it('C9 Topo e cabeçalho do Editor somam env(safe-area-inset-top)', () => {
    const topo = readFileSync('src/Autenticado.tsx', 'utf8').match(/<header[^>]*className="([^"]+)"/)![1]
    expect(topo).toContain('env(safe-area-inset-top)')
    const editor = readFileSync('src/Editor.tsx', 'utf8').match(/<SheetHeader[^>]*className="([^"]+)"/)![1]
    expect(editor).toContain('env(safe-area-inset-top)')
  })
})
