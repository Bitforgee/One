import { expect, test, type Locator } from '@playwright/test'
import { simularApi } from './simulada'

// Arranjo de ## Screens (Instituições) medido com boundingBox(), tolerância de 1 px.
test.use({ serviceWorkers: 'block' })

const caixa = async (l: Locator) => (await l.boundingBox())!

test.describe('arranjo Instituições', () => {
  test('1440 px: o botão fica à direita do título, no mesmo topo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await simularApi(page, ['ADMINISTRADOR', 'OPERADOR'])
    await page.goto('/univag/instituicoes')
    await page.getByText('Faculdade Antiga').waitFor()

    const titulo = await caixa(page.getByRole('heading', { name: 'Instituições', level: 2 }))
    const botao = await caixa(page.getByRole('button', { name: 'Nova instituição' }))
    expect(botao.x).toBeGreaterThanOrEqual(titulo.x + titulo.width - 1)
    expect(Math.abs(botao.y - titulo.y)).toBeLessThanOrEqual(1)
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('390 px: as linhas viram cartões sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page, ['ADMINISTRADOR', 'OPERADOR'])
    await page.goto('/univag/instituicoes')
    await page.getByText('Faculdade Antiga').waitFor()

    await expect(page.getByRole('listitem')).toHaveCount(2)
    await expect(page.getByRole('table')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    for (const cartao of await page.getByRole('listitem').all()) {
      const c = await caixa(cartao)
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.x + c.width).toBeLessThanOrEqual(390)
    }
  })
})
