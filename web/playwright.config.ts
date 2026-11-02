import { defineConfig, devices } from '@playwright/test'

// Roda contra o app do `docker compose up` (porta 8080), ou contra E2E_URL.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.E2E_URL ?? 'http://localhost:8080' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
