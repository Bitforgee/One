import { expect, test, type Locator } from '@playwright/test'
import { simularApi } from './simulada'

// Arranjo de ## Screens (Instituições) medido com boundingBox(), tolerância de 1 px.
test.use({ serviceWorkers: 'block' })

const caixa = async (l: Locator) => (await l.boundingBox())!

test.describe('arranjo Instituições', () => {
  test('1440 px: um só título, e o botão no topo da área de conteúdo, à direita', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await simularApi(page, ['ADMINISTRADOR', 'OPERADOR'])
    await page.goto('/univag/instituicoes')
    await page.getByText('Faculdade Antiga').waitFor()

    await expect(page.getByRole('heading', { name: 'Instituições' })).toHaveCount(1)
    await expect(page.getByRole('heading', { name: 'Instituições', level: 1 })).toHaveCount(1)
    // a área de conteúdo é o contêiner da casca menos o recuo (24 px em cima, à direita e embaixo)
    const area = await caixa(page.locator('[class~="@container/main"]'))
    const botao = await caixa(page.getByRole('button', { name: 'Nova instituição' }))
    const tabela = await caixa(page.getByRole('table'))
    expect(Math.abs(botao.x + botao.width - (tabela.x + tabela.width))).toBeLessThanOrEqual(1)
    expect(botao.y - area.y).toBeLessThanOrEqual(24 + 1)
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

  test('cartão com nome e selo na 1ª linha e endereço abaixo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page, ['ADMINISTRADOR', 'OPERADOR'])
    await page.goto('/univag/instituicoes')
    await page.getByText('Faculdade Antiga').waitFor()

    const cartao = page.getByRole('listitem').first()
    // o nome é o texto solto da célula: mede o Range do 1º nó de texto
    const nome = await cartao.evaluate((el) => {
      const r = document.createRange()
      r.selectNodeContents([...el.querySelectorAll('*')].find((c) => c.firstChild?.nodeType === 3 && c.firstChild.textContent?.includes('Várzea'))!.firstChild!)
      const { x, y, width } = r.getBoundingClientRect()
      return { x, y, width }
    })
    const selo = await caixa(cartao.getByText('Ativa', { exact: true }))
    const endereco = await caixa(cartao.getByText('/univag', { exact: true }))
    expect(Math.abs(selo.y - nome.y)).toBeLessThanOrEqual(1)
    expect(selo.x).toBeGreaterThanOrEqual(nome.x + nome.width)
    expect(endereco.y).toBeGreaterThan(nome.y + 1)
    expect(endereco.y).toBeGreaterThan(selo.y + selo.height - 1)
  })

  test('diálogo Nova instituição com campos em ordem, Cancelar e prefixo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await simularApi(page, ['ADMINISTRADOR', 'OPERADOR'])
    await page.goto('/univag/instituicoes')
    await page.getByRole('button', { name: 'Nova instituição' }).click()

    const d = page.getByRole('dialog', { name: 'Nova instituição' })
    const nomes = d.getByRole('textbox', { name: 'Nome', exact: true })
    const ordem = [nomes.nth(0), d.getByRole('textbox', { name: 'Endereço' }), d.getByLabel('Fuso horário'), d.getByText('Primeiro administrador'), nomes.nth(1), d.getByRole('textbox', { name: 'CPF' }), d.getByRole('textbox', { name: 'E-mail' })]
    const ys: number[] = []
    for (const campo of ordem) ys.push((await caixa(campo)).y)
    expect(ys).toEqual([...ys].sort((a, b) => a - b))
    expect(new Set(ys).size).toBe(ys.length)

    const cancelar = await caixa(d.getByRole('button', { name: 'Cancelar' }))
    const criar = await caixa(d.getByRole('button', { name: 'Criar', exact: true }))
    expect(cancelar.x + cancelar.width).toBeLessThanOrEqual(criar.x)
    const prefixo = await caixa(d.getByText('/', { exact: true }))
    expect(prefixo.x + prefixo.width).toBeLessThanOrEqual((await caixa(ordem[1])).x + 1)
    expect(Math.abs(prefixo.y + prefixo.height / 2 - ((await caixa(ordem[1])).y + (await caixa(ordem[1])).height / 2))).toBeLessThanOrEqual(8)
  })
})
