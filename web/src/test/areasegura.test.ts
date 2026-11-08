import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

// mobile-m0 AC 9: o iPhone só informa a área segura com viewport-fit=cover.
const ler = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), 'utf8')

it('área segura: viewport-fit=cover e recuo lateral no body', () => {
  expect(ler('../../index.html')).toMatch(/<meta name="viewport"[^>]*viewport-fit=cover/)
  const css = ler('../index.css')
  expect(css).toContain('env(safe-area-inset-left)')
  expect(css).toContain('env(safe-area-inset-right)')
})
