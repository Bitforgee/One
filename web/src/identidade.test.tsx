import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import pacote from '../package.json'
import main from './main.tsx?raw'

// identidade-visual S1: fontes e raios lidos do código-fonte; o que se mede em pixels está em e2e/identidade.spec.ts.
const css = readFileSync('src/index.css', 'utf8') // cwd = web/ (vitest)
const tema = css.match(/@theme inline \{([^}]*)\}/)![1]
const declarado = (token: string) => tema.match(new RegExp(token + String.raw`:\s*([^;]+);`))?.[1].trim()

describe('identidade visual', () => {
  // C1 (AC 1, AC 2, door 1)
  it('fontes Public Sans e Source Serif 4 sem Inter', () => {
    expect(Object.keys(pacote.dependencies).filter((nome) => nome.startsWith('@fontsource'))).toEqual(['@fontsource-variable/public-sans', '@fontsource-variable/source-serif-4'])
    expect(main).toContain("import '@fontsource-variable/public-sans/index.css'")
    expect(main).toContain("import '@fontsource-variable/source-serif-4/index.css'")
    expect(main).not.toContain('opsz')
    expect(main.toLowerCase()).not.toContain('inter')
    expect(css.toLowerCase()).not.toContain('inter')
    expect(declarado('--font-sans')).toMatch(/^'Public Sans Variable'/)
    expect(declarado('--font-heading')).toMatch(/^'Source Serif 4 Variable'/)
  })

  // C7 (AC 3, door 2)
  it('escala de raios por papel em index.css', () => {
    const px = (valor?: string) => (valor!.endsWith('rem') ? parseFloat(valor!) * 16 : parseFloat(valor!))
    expect(['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg'].map((t) => px(declarado(t)))).toEqual([4, 6, 12, 16])
    for (const seletor of [':root', '.dark', '.black']) {
      const bloco = css.match(new RegExp(`^${seletor.replace('.', '\.')} \{([^}]*)\}`, 'm'))![1]
      expect(bloco, seletor).not.toMatch(/--radius\s*:/)
    }
  })
})
