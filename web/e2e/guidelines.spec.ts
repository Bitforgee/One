import { expect, test, type Locator, type Page } from '@playwright/test'
import { simularApi } from './simulada'


test.use({ serviceWorkers: 'block' })

const medir = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    const sonda = (classe: string) => {
      const el = document.createElement('div')
      el.className = classe
      if (!classe) el.style.animation = 'spin 3s linear infinite'
      el.style.transition = 'opacity 3s'
      document.body.append(el)
      const e = getComputedStyle(el)
      const lido = { animacao: e.animationDuration, transicao: e.transitionDuration }
      el.remove()
      return lido
    }
    return { comum: sonda(''), giro: sonda('animate-spin'), rolagem: getComputedStyle(document.documentElement).scrollBehavior }
  })

const segundos = (v: string) => (v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v))

test('C1 movimento reduzido zera animação, transição e rolagem, menos no spinner', async ({ page }) => {
  await simularApi(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/univag')
  await page.getByLabel('CPF').waitFor()

  const reduzido = await medir(page)
  expect(segundos(reduzido.comum.animacao)).toBeCloseTo(0.00001, 6)
  expect(segundos(reduzido.comum.transicao)).toBeCloseTo(0.00001, 6)
  expect(reduzido.rolagem).toBe('auto')
  expect(segundos(reduzido.giro.animacao)).toBeCloseTo(1, 3)
  expect(segundos(reduzido.giro.transicao)).toBeCloseTo(3, 3)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const normal = await medir(page)
  expect(segundos(normal.comum.animacao)).toBeCloseTo(3, 3)
  expect(segundos(normal.comum.transicao)).toBeCloseTo(3, 3)
  expect(normal.rolagem).toBe('smooth')
})

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

async function abrir(page: Page, largura: number, altura: number, caminho: string, papeis: string[]) {
  await page.setViewportSize({ width: largura, height: altura })
  await simularApi(page, papeis)
  await page.route('**/api/admin/fluxos', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([fluxo]) }))
  await page.route('**/api/push/chave', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ chavePublica: 'BAEC' }) }))
  await page.addInitScript(() => Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => null } }) } }))
  await page.goto(caminho)
}

const medida = (l: Locator) => l.evaluate((e) => [(e as HTMLElement).offsetWidth, (e as HTMLElement).offsetHeight])

test.describe('C22 celular 360x780', () => {
  test.use({ hasTouch: true, isMobile: true })

  test('C22 Topo, AvisosPush, ListaDeEtapas e o X de Anexos medem 44 x 44', async ({ page }) => {
    await abrir(page, 360, 780, '/univag/chamados/ONE-123', ['ALUNO'])
    await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible()
    expect(await medida(page.getByRole('button', { name: 'Voltar' }))).toEqual([44, 44])
    expect(await medida(page.getByRole('button', { name: 'Ativar avisos neste aparelho' }))).toEqual([44, 44])

    await page.goto('/univag/assistente')
    await page.getByLabel('Mensagem').waitFor()
    await page.locator('input[type="file"]').setInputFiles({ name: 'boleto.png', mimeType: 'image/png', buffer: png })
    expect(await medida(page.getByRole('button', { name: 'Remover boleto.png' }))).toEqual([44, 44])

    await page.unrouteAll()
    await abrir(page, 360, 780, '/univag/cadastros/fluxos/8', ['ADMINISTRADOR'])
    for (const nome of ['Mover etapa 1 para cima', 'Mover etapa 1 para baixo', 'Remover etapa 1']) expect(await medida(page.getByRole('button', { name: nome })), nome).toEqual([44, 44])
  })
})

test.describe('C22 canvas com ponteiro grosso', () => {
  test.use({ hasTouch: true })

  test('C22 LigacaoComMais e Handle medem no mínimo 44 x 44', async ({ page }) => {
    await abrir(page, 1024, 768, '/univag/cadastros/fluxos/8', ['ADMINISTRADOR'])
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    await page.getByRole('tab', { name: 'Canvas' }).click()
    const mais = page.getByRole('button', { name: /^Inserir etapa/ })
    await expect(mais.first()).toBeVisible()
    for (const botao of await mais.all()) for (const lado of await medida(botao)) expect(lado).toBeGreaterThanOrEqual(44)
    const alcas = page.locator('.react-flow__handle')
    expect(await alcas.count()).toBeGreaterThan(0)
    for (const alca of await alcas.all()) for (const lado of await medida(alca)) expect(lado).toBeGreaterThanOrEqual(44)
  })
})

test.describe('C22 desktop com ponteiro fino', () => {
  test('C22 os tamanhos de hoje continuam', async ({ page }) => {
    await abrir(page, 1280, 800, '/univag/cadastros/fluxos/8', ['ADMINISTRADOR'])
    expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true)
    expect(await medida(page.getByRole('button', { name: 'Remover etapa 1' }))).toEqual([36, 36])
    await page.getByRole('tab', { name: 'Canvas' }).click()
    const mais = page.getByRole('button', { name: /^Inserir etapa/ })
    await expect(mais.first()).toBeVisible()
    expect(await medida(mais.first())).toEqual([24, 24])
    expect(await medida(page.locator('.react-flow__handle').first())).toEqual([12, 12])
  })
})

test.describe('C6 celular 360x780', () => {
  test.use({ hasTouch: true, isMobile: true })

  test('C6 o scroll-padding-bottom de html passa de 16 px com a barra de abas', async ({ page }) => {
    await abrir(page, 360, 780, '/univag/solicitacoes', ['ALUNO'])
    await expect(page.getByRole('navigation', { name: 'Navegação' })).toBeVisible()
    const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom))
    const barra = await page.getByRole('navigation', { name: 'Navegação' }).evaluate((e) => (e as HTMLElement).offsetHeight)
    expect(base).toBeGreaterThan(16)
    expect(base).toBeGreaterThanOrEqual(barra + 16 - 1)
  })
})

test.describe('C72 celular 360x780', () => {
  test.use({ hasTouch: true, isMobile: true })

  const distancia = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
    Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), b.y - (a.y + a.height), a.y - (b.y + b.height))

  test('C72 Falar com atendente e Encerrar conversa ficam a 8 px ou mais um do outro e dentro da tela', async ({ page }) => {
    await abrir(page, 360, 780, '/univag/assistente', ['ALUNO'])
    await page.getByLabel('Mensagem').fill('preciso do boleto do semestre')
    await page.getByRole('button', { name: /Enviar/ }).click()
    await page.getByText('Isso resolveu?').waitFor()
    const falar = (await page.getByRole('button', { name: /Falar com atendente/ }).boundingBox())!
    const encerrar = (await page.getByRole('button', { name: 'Encerrar conversa' }).boundingBox())!
    expect(distancia(falar, encerrar)).toBeGreaterThanOrEqual(8 - 0.5)
    for (const caixa of [falar, encerrar]) {
      expect(caixa.x).toBeGreaterThanOrEqual(0)
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(360)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })

  test('C72 em Indicadores o valor e a variação mantêm o gap-x-4 e não se sobrepõem', async ({ page }) => {
    await abrir(page, 360, 780, '/univag/indicadores', ['ADMINISTRADOR'])
    const numero = page.getByText(/^71,2\s%$/)
    await numero.waitFor()
    const variacao = page.getByText('vs. período anterior').locator('xpath=..')
    const [n, v] = [(await numero.boundingBox())!, (await variacao.first().boundingBox())!]
    expect(distancia(n, v), 'sem sobreposição').toBeGreaterThanOrEqual(0)
    const coluna = await numero.evaluate((e) => parseFloat(getComputedStyle(e.parentElement!).columnGap))
    expect(coluna).toBe(16)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })
})