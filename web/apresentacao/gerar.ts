import { execSync } from 'node:child_process'
import path from 'node:path'

// Grava e monta de uma vez. Uso (na pasta web): node apresentacao/gerar.ts [amostra|principal]
const roteiro = process.argv[2] ?? 'principal'
const web = path.resolve(import.meta.dirname, '..')
execSync('npx playwright test -c apresentacao/playwright.config.ts', { cwd: web, stdio: 'inherit', env: { ...process.env, ROTEIRO: roteiro } })
execSync(`node apresentacao/compor.ts ${roteiro}`, { cwd: web, stdio: 'inherit' })
