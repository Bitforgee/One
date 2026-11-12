import { expect, test, type Page } from '@playwright/test'
import { simularApi } from './simulada'

test.use({ serviceWorkers: 'block' })

const moodleVazio = {
  configurada: false, ativa: false, emissor: '', clientId: '', deploymentId: '', authUrl: '', jwksUrl: '',
  urlLogin: 'http://localhost:8080/api/moodle/univag/login', urlLancamento: 'http://localhost:8080/api/moodle/univag/lancamento', urlJwks: 'http://localhost:8080/api/moodle/univag/jwks',
}
const mcpVazio = { url: 'http://localhost:8080/api/mcp/univag', tokens: [] }

async function abrir(page: Page, largura: number, altura: number, caminho = '/univag/integracoes') {
  await page.setViewportSize({ width: largura, height: altura })
  await simularApi(page, ['ADMINISTRADOR'])
  await page.route('**/api/admin/moodle', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(moodleVazio) }))
  await page.route('**/api/admin/mcp', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mcpVazio) }))
  await page.goto(caminho)
  await page.locator('header h1').waitFor()
}

const semRolagemHorizontal = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test('coluna a 1440', async ({ page }) => {
  await abrir(page, 1440, 900)
  await expect(page.locator('header h1')).toHaveText('Integrações')
  const lista = page.getByRole('tablist')
  await expect(lista).toHaveAttribute('aria-orientation', 'vertical')
  await expect(lista.getByRole('tab')).toHaveText(['Moodle', 'MCP'])
  await expect(page.getByRole('combobox', { name: 'Integração' })).toBeHidden()
  const coluna = (await lista.boundingBox())!
  expect(coluna.width).toBeCloseTo(224, 0)
  const painel = (await page.getByRole('tabpanel').boundingBox())!
  expect(coluna.x + coluna.width).toBeLessThanOrEqual(painel.x)
  for (const aba of await lista.getByRole('tab').all()) {
    const c = (await aba.boundingBox())!
    expect(c.y).toBeGreaterThanOrEqual(coluna.y)
    expect(c.x).toBeGreaterThanOrEqual(coluna.x)
  }
  await lista.getByRole('tab', { name: 'MCP' }).click()
  await expect(page).toHaveURL(/\/univag\/integracoes\?aba=mcp$/)
  await expect(page.getByRole('heading', { name: 'MCP', level: 2 })).toBeVisible()
})

test('item ativo com fundo de destaque', async ({ page }) => {
  await abrir(page, 1440, 900)
  const fundo = (nome: string) => page.getByRole('tab', { name: nome }).evaluate((e) => getComputedStyle(e).backgroundColor)
  const transparente = 'rgba(0, 0, 0, 0)'
  const destaque = await page.evaluate(() => { const e = document.createElement('div'); e.style.backgroundColor = 'var(--accent)'; document.body.append(e); const c = getComputedStyle(e).backgroundColor; e.remove(); return c })
  expect(destaque).not.toBe(transparente)
  await expect.poll(() => fundo('Moodle')).toBe(destaque)
  await expect.poll(() => fundo('MCP')).toBe(transparente)
  await page.getByRole('tab', { name: 'MCP' }).click()
  await expect.poll(() => fundo('MCP')).toBe(destaque)
  await expect.poll(() => fundo('Moodle')).toBe(transparente)
})

test('limite de 896 px de largura útil', async ({ page }) => {
  const seletor = page.getByRole('combobox', { name: 'Integração' })
  const util = () => page.locator('[class*="@container/main"]').evaluate((e) => { const c = getComputedStyle(e); return e.clientWidth - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight) })
  await abrir(page, 1199, 900)
  const largura = await util()
  expect(largura).toBe(895)
  await expect(seletor).toBeVisible()
  await expect(page.getByRole('tablist')).toBeHidden()
  await page.setViewportSize({ width: 1200, height: 900 })
  expect(await util()).toBeGreaterThanOrEqual(896)
  await expect(seletor).toBeHidden()
  await expect(page.getByRole('tablist')).toBeVisible()
})

test.describe('celular', () => {
  test.use({ hasTouch: true, isMobile: true })

  for (const [largura, altura, nome] of [
    [360, 780, 'em pé 360×780'],
    [844, 390, 'deitado 844×390'],
  ] as const) {
    test(`seletor ${nome}`, async ({ page }) => {
      await abrir(page, largura, altura)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
      await expect(page.getByRole('tablist')).toBeHidden()
      const seletor = page.getByRole('combobox', { name: 'Integração' })
      await expect(seletor).toBeVisible()
      await expect(seletor.locator('option')).toHaveText(['Moodle', 'MCP'])
      expect((await seletor.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      expect(await semRolagemHorizontal(page)).toBe(true)
      await seletor.selectOption('mcp')
      await expect(page).toHaveURL(/\/univag\/integracoes\?aba=mcp$/)
      await expect(page.getByRole('heading', { name: 'MCP', level: 2 })).toBeVisible()
      expect(await semRolagemHorizontal(page)).toBe(true)
    })
  }

  test('teclado aberto 360×400', async ({ page }) => {
    await abrir(page, 360, 400, '/univag/integracoes?aba=mcp')
    expect(await semRolagemHorizontal(page)).toBe(true)
    const nome = page.getByLabel('Nome')
    await nome.focus()
    const campo = (await nome.boundingBox())!
    expect(campo.y).toBeGreaterThanOrEqual(0)
    expect(campo.y + campo.height).toBeLessThanOrEqual(400)
    const criar = page.getByRole('button', { name: 'Criar token' })
    await criar.scrollIntoViewIfNeeded()
    const botao = (await criar.boundingBox())!
    expect(botao.y).toBeGreaterThanOrEqual(0)
    expect(botao.y + botao.height).toBeLessThanOrEqual(400)
    expect(await semRolagemHorizontal(page)).toBe(true)
  })
})
