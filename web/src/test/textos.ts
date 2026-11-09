import { expect } from 'vitest'

export function textoVisivel(no: Node): string {
  if (no.nodeType === Node.TEXT_NODE) return no.textContent ?? ''
  const el = no as Element
  if (el.classList?.contains('sr-only') || el.getAttribute?.('aria-hidden') === 'true') return ''
  return [...no.childNodes].map(textoVisivel).join('')
}

export function sobra(texto: string, literais: string[]): string[] {
  const resto = [...literais].sort((a, b) => b.length - a.length).reduce((t, l) => t.split(l).join(' '), texto)
  return resto.match(/[\p{L}\p{N}]+/gu) ?? []
}

export function estados(literais: string[]) {
  const vistos: string[] = []
  return {
    conferir(no: Node, extras: string[] = []) {
      const texto = textoVisivel(no)
      expect(sobra(texto, [...literais, ...extras])).toEqual([])
      vistos.push(texto)
    },
    todos() {
      const tudo = vistos.join('\n')
      expect(literais.filter((l) => !tudo.includes(l))).toEqual([])
    },
  }
}
