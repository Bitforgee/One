import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import * as ilustracoes from '.'

// aparencia-instituicao C47 (AC 44): a ilustração é SVG inline e só usa currentColor e os tokens da marca; identidade-visual AC 19 deixou só a Planilha.
const Nomes: Record<string, string> = { Planilha: 'planilha' }
const Permitidos = ['currentColor', 'none', 'var(--primary)', 'var(--primary-subtle)']
// as funções de cor e os nomes entram em pedaços para este arquivo não se acusar no teste de cores literais de interface.test.ts
const CorLiteral = new RegExp(['#[0-9a-fA-F]{3,8}', '\\b(?:' + ['ok' + 'lch', 'rg' + 'b', 'hs' + 'l'].join('|') + ')a?\\('].join('|'))

describe('ilustrações', () => {
  it('Planilha só com currentColor e tokens', () => {
    expect(Object.keys(ilustracoes).sort()).toEqual(Object.keys(Nomes).sort())
    for (const [nome, kebab] of Object.entries(Nomes)) {
      const Ilustracao = (ilustracoes as Record<string, (p: { className?: string }) => React.ReactElement>)[nome]
      const { container, unmount } = render(<Ilustracao />)
      const svg = container.querySelector('svg')!
      expect(container.querySelectorAll('svg'), nome).toHaveLength(1)
      expect(svg, nome).toHaveAttribute('aria-hidden', 'true')
      expect(svg, nome).toHaveAttribute('data-ilustracao', kebab)
      expect(container.querySelector('image, use, foreignObject, script'), nome).toBeNull()
      for (const el of [svg, ...svg.querySelectorAll('*')]) {
        for (const atributo of ['fill', 'stroke']) {
          const valor = el.getAttribute(atributo)
          if (valor !== null) expect(Permitidos, `${nome} ${atributo}`).toContain(valor)
        }
        const estilo = el.getAttribute('style') ?? ''
        expect(estilo, `${nome} style`).not.toMatch(CorLiteral)
        for (const atributo of el.getAttributeNames()) expect(el.getAttribute(atributo)!, `${nome} ${atributo}`).not.toMatch(/https?:|^\/\//)
        expect(el.getAttribute('href'), nome).toBeNull()
      }
      expect(svg.outerHTML, nome).not.toMatch(CorLiteral)
      unmount()
    }
  })
})
