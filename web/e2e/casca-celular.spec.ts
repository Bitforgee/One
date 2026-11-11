import { expect, test, type Locator, type Page } from '@playwright/test'
import { simularApi } from './simulada'

test.use({ serviceWorkers: 'block' })

const caixa = async (l: Locator) => (await l.boundingBox())!
const barra = (page: Page) => page.getByRole('navigation', { name: 'Navegação' })
const lateral = (page: Page) => page.locator('[data-sidebar=sidebar]')
const titulo = (page: Page) => page.locator('header h1')
const ponteiroGrosso = (page: Page) => page.evaluate(() => matchMedia('(pointer: coarse)').matches)

async function abrir(page: Page, largura: number, altura: number, caminho: string, papeis?: string[]) {
  await page.setViewportSize({ width: largura, height: altura })
  await simularApi(page, papeis)
  await page.goto(caminho)
  await titulo(page).waitFor()
}

test.describe('casca do celular com toque', () => {
  test.use({ hasTouch: true, isMobile: true })

  test('alvos da barra a 360', async ({ page }) => {
    await abrir(page, 360, 780, '/univag/fila')
    expect(await ponteiroGrosso(page)).toBe(true)
    const abas = barra(page).getByRole('link')
    await expect(abas).toHaveCount(5)
    for (const aba of await abas.all()) {
      const c = await caixa(aba)
      expect(c.width, await aba.innerText()).toBeGreaterThanOrEqual(44)
      expect(c.height, await aba.innerText()).toBeGreaterThanOrEqual(56)
    }
    const b = await caixa(barra(page))
    expect(b.y + b.height).toBeCloseTo(780, 0)
  })

  test('troca de classe mantém a rota', async ({ page }) => {
    await abrir(page, 390, 844, '/univag/chamados/ONE-123', ['ATENDENTE'])
    await expect(titulo(page)).toHaveText('ONE-123')
    await expect(barra(page)).toHaveCount(0)
    await page.setViewportSize({ width: 1024, height: 800 })
    await expect(lateral(page)).toBeVisible()
    await expect(barra(page)).toHaveCount(0)
    await expect(titulo(page)).toHaveText('ONE-123')
    expect(new URL(page.url()).pathname).toBe('/univag/chamados/ONE-123')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(lateral(page)).toHaveCount(0)
    await expect(titulo(page)).toHaveText('ONE-123')
    expect(new URL(page.url()).pathname).toBe('/univag/chamados/ONE-123')
    await page.goto('/univag/fila')
    await titulo(page).waitFor()
    await expect(barra(page)).toHaveCount(1)
    await page.setViewportSize({ width: 1024, height: 800 })
    await expect(barra(page)).toHaveCount(0)
    await expect(lateral(page)).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/univag/fila')
  })

  for (const [largura, altura, nome, comBarra] of [
    [767, 800, '767 de largura', true],
    [768, 800, '768 de largura', false],
    [844, 390, '844×390 com ponteiro grosso', true],
    [844, 480, '844×480 com ponteiro grosso', false],
  ] as const)
    test(`bordas do celular: ${nome}`, async ({ page }) => {
      await abrir(page, largura, altura, '/univag/fila', ['ATENDENTE'])
      expect(await ponteiroGrosso(page)).toBe(true)
      await expect(barra(page)).toHaveCount(comBarra ? 1 : 0)
      await expect(lateral(page)).toHaveCount(comBarra ? 0 : 1)
    })

  test('celular deitado', async ({ page }) => {
    await abrir(page, 844, 390, '/univag/fila', ['ATENDENTE'])
    expect(await ponteiroGrosso(page)).toBe(true)
    await expect(lateral(page)).toHaveCount(0)
    const abas = barra(page).getByRole('link')
    await expect(abas).toHaveCount(3)
    for (const aba of await abas.all()) expect((await caixa(aba)).height, await aba.innerText()).toBeCloseTo(48, 0)
    const primeira = abas.first()
    const [icone, rotulo] = [await caixa(primeira.locator('svg')), await caixa(primeira.locator('span'))]
    expect(Math.abs(icone.y + icone.height / 2 - (rotulo.y + rotulo.height / 2))).toBeLessThanOrEqual(2)
    expect(rotulo.x).toBeGreaterThanOrEqual(icone.x + icone.width)
    const b = await caixa(barra(page))
    expect(b.y + b.height).toBeCloseTo(390, 0)
    expect((await caixa(page.getByRole('main'))).width).toBeGreaterThanOrEqual(844)
  })

  test('linhas do Gerir', async ({ page }) => {
    await abrir(page, 390, 844, '/univag/gerir', ['ADMINISTRADOR'])
    const links = page.locator('[class*="container/main"]').getByRole('link')
    await expect(links).toHaveCount(7)
    for (const link of await links.all()) expect((await caixa(link)).height, await link.innerText()).toBeGreaterThanOrEqual(52)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })

  test('Voltar de 44 px', async ({ page }) => {
    await abrir(page, 390, 844, '/univag/chamados/ONE-123')
    const voltar = page.getByRole('button', { name: 'Voltar' })
    const c = await caixa(voltar)
    expect(c.width).toBeGreaterThanOrEqual(44)
    expect(c.height).toBeGreaterThanOrEqual(44)
    expect(c.x).toBeLessThan((await caixa(titulo(page))).x)
  })

  test('barra do chamado sozinha embaixo', async ({ page }) => {
    await abrir(page, 390, 844, '/univag/chamados/ONE-123', ['ATENDENTE'])
    await page.getByText('Resumo gerado por IA').waitFor()
    await expect(barra(page)).toHaveCount(0)
    const mais = page.getByRole('button', { name: 'Mais', exact: true })
    const pai = await mais.evaluate((b) => getComputedStyle(b.parentElement!).position)
    expect(pai).toBe('fixed')
    const c = await caixa(mais.locator('..'))
    expect(c.y + c.height).toBeCloseTo(844, 0)
  })
})

test.describe('casca com mouse', () => {
  test.use({ hasTouch: false, isMobile: false })

  test('bordas do celular: 844×390 com ponteiro fino', async ({ page }) => {
    await abrir(page, 844, 390, '/univag/fila', ['ATENDENTE'])
    expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true)
    await expect(barra(page)).toHaveCount(0)
    await expect(lateral(page)).toHaveCount(1)
  })
})
