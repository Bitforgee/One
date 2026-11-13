import { expect, test, type Locator, type Page } from '@playwright/test'
import { simularApi } from './simulada'

test.use({ serviceWorkers: 'block' })

const fluxo = {
  id: 8,
  categoriaId: 1,
  cursoId: null,
  semestre: null,
  vigente: null,
  rascunho: {
    numero: 1,
    etapas: [
      { destino: 'SETOR', setorId: 1, prazoHoras: 24, x: 300, y: 50 },
      { destino: 'COORDENACAO_CURSO', setorId: null, prazoHoras: null, x: 600, y: 50 },
    ],
  },
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const arquivos = [1, 2, 3].map((n) => ({ name: `boleto-${n}.png`, mimeType: 'image/png', buffer: png }))

async function abrir(page: Page, largura: number, altura: number, caminho: string, papeis: string[]) {
  await page.setViewportSize({ width: largura, height: altura })
  await simularApi(page, papeis)
  await page.route('**/api/admin/fluxos', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([fluxo]) }))
  await page.route('**/api/push/chave', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ chavePublica: 'BAEC' }) }))
  await page.addInitScript(() => Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => null } }) } }))
  await page.goto(caminho)
}

const caixa = (l: Locator) => l.evaluate((e) => e.getBoundingClientRect().toJSON() as { x: number; y: number; width: number; height: number; top: number; bottom: number })
const zoomAtual = (page: Page) => page.locator('.react-flow__viewport').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a)

async function medirAlcas(page: Page) {
  const alcas = page.locator('.react-flow__handle')
  expect(await alcas.count()).toBeGreaterThan(0)
  const medidas: string[] = []
  for (const alca of await alcas.all()) {
    const { width, height } = await caixa(alca)
    if (width < 43.5 || height < 43.5) medidas.push(`${width.toFixed(1)}x${height.toFixed(1)}`)
  }
  return medidas
}

async function ate(botao: Locator) {
  for (let i = 0; i < 12 && (await botao.isEnabled()); i++) await botao.click()
  await expect(botao).toBeDisabled()
}

test.describe('C9 canvas em tablet com toque', () => {
  test.use({ hasTouch: true })

  test('C9 o Handle mede 44 x 44 ou mais na tela em fitView, no zoom mínimo e no máximo', async ({ page }) => {
    await abrir(page, 820, 1180, '/univag/cadastros/fluxos/8', ['ADMINISTRADOR'])
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    await page.getByRole('tab', { name: 'Canvas' }).click()
    await page.getByRole('button', { name: 'Enquadrar o fluxo' }).click()
    await expect(page.locator('.react-flow__handle').first()).toBeVisible()
    await page.waitForTimeout(500)
    expect(await medirAlcas(page), `fitView, zoom ${await zoomAtual(page)}`).toEqual([])

    await ate(page.getByRole('button', { name: 'Afastar' }))
    const minimo = await zoomAtual(page)
    expect(minimo).toBeLessThan(1)
    expect(await medirAlcas(page), `zoom mínimo ${minimo}`).toEqual([])

    await ate(page.getByRole('button', { name: 'Aproximar' }))
    const maximo = await zoomAtual(page)
    expect(maximo).toBeGreaterThan(1)
    expect(await medirAlcas(page), `zoom máximo ${maximo}`).toEqual([])
  })
})

const seis = Array.from({ length: 6 }, (_, i) => `linha ${i + 1} da mensagem`).join('\n')
const doze = Array.from({ length: 12 }, (_, i) => `linha ${i + 1} da mensagem`).join('\n')

for (const [largura, altura] of [
  [390, 844],
  [360, 780],
] as const) {
  test.describe(`C10 celular ${largura}x${altura}`, () => {
    test.use({ hasTouch: true, isMobile: true })

    test('C10 com 3 anexos e 6 linhas o link Sua solicitação não cruza o compositor', async ({ page }) => {
      await abrir(page, largura, altura, '/univag/assistente', ['ALUNO'])
      const link = page.getByRole('link', { name: /Sua solicitação/ })
      await link.waitFor()
      await page.locator('input[type="file"]').setInputFiles(arquivos)
      await expect(page.getByRole('button', { name: 'Remover boleto-3.png' })).toBeVisible()
      await page.getByLabel('Mensagem').fill(seis)
      await page.evaluate(() => window.scrollTo(0, 0))
      const compositor = page.getByTestId('compositor').locator('xpath=ancestor::div[contains(@class,"sticky")]')
      const [a, b] = [await caixa(link), await caixa(compositor)]
      const cruza = a.top < b.bottom && b.top < a.bottom
      expect(cruza, `link ${a.top}-${a.bottom} compositor ${b.top}-${b.bottom}`).toBe(false)
    })
  })
}

test.describe('C11 altura do campo da mensagem', () => {
  test.use({ hasTouch: true, isMobile: true })

  test('C11 com 12 linhas o campo mede no máximo 30dvh e rola por dentro (390x844)', async ({ page }) => {
    await abrir(page, 390, 844, '/univag/assistente', ['ALUNO'])
    const campo = page.getByLabel('Mensagem')
    await campo.fill(doze)
    const { height } = await caixa(campo)
    expect(height).toBeLessThanOrEqual(0.3 * 844 + 0.5)
    expect(await campo.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
    expect(await campo.evaluate((e) => getComputedStyle(e).overflowY)).toMatch(/auto|scroll/)
  })

  test('C11 a 844x390 o campo mostra pelo menos 4 linhas e respeita 30dvh', async ({ page }) => {
    await abrir(page, 844, 390, '/univag/assistente', ['ALUNO'])
    const campo = page.getByLabel('Mensagem')
    await campo.fill(doze)
    const { height } = await caixa(campo)
    const linha = await campo.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight))
    expect(height).toBeLessThanOrEqual(0.3 * 390 + 0.5)
    expect(await campo.evaluate((e) => e.clientHeight)).toBeGreaterThanOrEqual(4 * linha)
    expect(await campo.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
  })
})
