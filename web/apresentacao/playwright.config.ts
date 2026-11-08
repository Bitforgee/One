import { defineConfig } from '@playwright/test'
import { Contexto, Tamanho } from './kit'

// Só a gravação da apresentação: fica fora do testDir de web/e2e, então `npx playwright test` não a pega.
// Cada segmento abre o próprio contexto (kit.gravar) com as mesmas opções e grava em 1280x720.
export default defineConfig({
  testDir: '.',
  testMatch: 'gravar.spec.ts',
  outputDir: 'saida/test-results',
  timeout: 20 * 60_000,
  workers: 1,
  reporter: 'list',
  use: { ...Contexto, headless: true, video: { mode: 'off', size: Tamanho }, actionTimeout: 30_000, navigationTimeout: 60_000 },
})
