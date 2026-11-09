import { defineConfig } from '@playwright/test'
import { Contexto, Tamanho } from './kit'

export default defineConfig({
  testDir: '.',
  testMatch: 'gravar.spec.ts',
  outputDir: 'saida/test-results',
  timeout: 20 * 60_000,
  workers: 1,
  reporter: 'list',
  use: { ...Contexto, headless: true, video: { mode: 'off', size: Tamanho }, actionTimeout: 30_000, navigationTimeout: 60_000 },
})
