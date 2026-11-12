import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: 'http://localhost:4173' },
  webServer: { command: 'npx vite preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 60000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
