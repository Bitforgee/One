import { expect, test, type Locator, type Page } from '@playwright/test'
import { simularApi } from './simulada'

// editor-fluxo-integrado: o editor de fluxo é uma página da casca, medida com boundingBox() (px CSS).
test.use({ serviceWorkers: 'block' })

const categoria = 'Financeiro > Boletos e mensalidades'
const etapa = (destino: string, prazoHoras: number | null = null) => ({ destino, setorId: null, prazoHoras, x: null, y: null })
const json = (corpo: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) })
const caixa = async (l: Locator) => (await l.boundingBox())!
const assentar = (page: Page) => page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished'))

async function preparar(page: Page, largura: number, altura = 900) {
  await page.setViewportSize({ width: largura, height: altura })
  await simularApi(page)
  await page.route('**/api/admin/fluxos', (r) =>
    r.fulfill(json([{ id: 7, categoriaId: 1, cursoId: null, semestre: null, rascunho: null, vigente: { numero: 2, etapas: [etapa('LIDERANCA_SEMESTRE', 48), etapa('COORDENACAO_CURSO')] } }])),
  )
  await page.route('**/api/admin/categorias', (r) => r.fulfill(json([{ id: 1, nome: categoria, ativa: true, padrao: false }])))
}

const editor = (page: Page) => page.getByRole('region', { name: 'Editar: Fluxos' })

async function abrirEditor(page: Page, largura: number, altura = 900) {
  await preparar(page, largura, altura)
  await page.goto('/univag/cadastros/fluxos/7')
  await editor(page).waitFor()
  await assentar(page)
}

async function noCanvas(page: Page, largura: number, altura = 900) {
  await abrirEditor(page, largura, altura)
  await editor(page).getByRole('tab', { name: 'Canvas' }).click()
  await expect(page.getByLabel('Início', { exact: true })).toBeVisible()
  await assentar(page)
}

test.describe('editor de fluxo na casca', () => {
  // C1
  test('endereço do editor', async ({ page }) => {
    await preparar(page, 1440)
    await page.goto('/univag/cadastros')
    await page.getByRole('tab', { name: 'Fluxos' }).click()
    await page.getByRole('tabpanel', { name: 'Fluxos' }).getByRole('button', { name: categoria }).click()
    await editor(page).waitFor()
    expect(new URL(page.url()).pathname).toBe('/univag/cadastros/fluxos/7')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('[data-sidebar=sidebar]').first()).toBeVisible()
  })

  // C3
  test('recarregar mantém o editor', async ({ page }) => {
    await abrirEditor(page, 1440)
    await page.reload()
    await editor(page).waitFor()
    await expect(editor(page).getByLabel('Destino da etapa 1')).toHaveValue('LIDERANCA_SEMESTRE')
    await expect(editor(page).getByLabel('Destino da etapa 2')).toHaveValue('COORDENACAO_CURSO')
  })

  // C5
  test('voltar do navegador', async ({ page }) => {
    await preparar(page, 1440)
    await page.goto('/univag/cadastros')
    await page.getByRole('tab', { name: 'Fluxos' }).click()
    await page.getByRole('tabpanel', { name: 'Fluxos' }).getByRole('button', { name: categoria }).click()
    await editor(page).waitFor()
    await page.goBack()
    await expect(editor(page)).toHaveCount(0)
    await expect(page.getByRole('tab', { name: 'Fluxos' })).toHaveAttribute('aria-selected', 'true')
    const url = new URL(page.url())
    expect(url.pathname + url.search).toBe('/univag/cadastros?aba=fluxos')
  })

  // C12
  test('canvas ocupa a página', async ({ page }) => {
    for (const [largura, altura] of [[1440, 900], [1280, 800]]) {
      await noCanvas(page, largura, altura)
      const c = await caixa(page.locator('.react-flow'))
      const painel = await caixa(page.locator('aside').filter({ has: page.getByText('Simular um aluno') }))
      expect(altura - (c.y + c.height), `${largura}: base do canvas`).toBeLessThanOrEqual(16)
      expect(altura - (c.y + c.height), `${largura}: base do canvas`).toBeGreaterThanOrEqual(0)
      expect(Math.abs(painel.width - 320), `${largura}: painel de 320 px`).toBeLessThanOrEqual(1)
      expect(painel.x, `${largura}: painel ao lado do canvas`).toBeGreaterThanOrEqual(c.x + c.width - 1)
      expect(c.height, `${largura}: canvas alto`).toBeGreaterThan(altura * 0.6)
      expect(await page.evaluate(() => [document.documentElement.scrollHeight, document.documentElement.clientHeight]), `${largura}: sem rolagem`).toEqual([altura, altura])
    }
  })

  // C13
  test('painel lateral troca', async ({ page }) => {
    await noCanvas(page, 1440)
    const simular = page.getByRole('heading', { name: 'Simular um aluno' })
    await expect(simular).toBeVisible()
    await page.getByLabel('Etapa 1: Liderança do semestre', { exact: false }).focus()
    await page.keyboard.press('Enter')
    const etapa = page.getByRole('heading', { name: 'Etapa selecionada' })
    await expect(etapa).toBeVisible()
    await expect(simular).toHaveCount(0)
    const painel = await caixa(page.locator('aside').filter({ has: etapa }))
    expect(painel.y).toBeGreaterThanOrEqual(0)
    expect(painel.y + painel.height).toBeLessThanOrEqual(900)
  })

  // C14
  test('barra em uma linha', async ({ page }) => {
    await abrirEditor(page, 1440)
    const e = editor(page)
    const controles = [e.getByRole('button', { name: 'Voltar' }), e.getByText('Publicado v2'), e.getByRole('tab', { name: 'Lista' }), e.getByRole('button', { name: 'Simular' }), e.getByRole('button', { name: 'Salvar rascunho' }), e.getByRole('button', { name: 'Publicar' }), e.getByRole('button', { name: 'Mais' })]
    const centros: number[] = []
    for (const c of controles) {
      const b = await caixa(c)
      centros.push(b.y + b.height / 2)
    }
    expect(Math.max(...centros) - Math.min(...centros), JSON.stringify(centros)).toBeLessThanOrEqual(2)
    await expect(e.getByRole('button', { name: 'Cancelar' })).toHaveCount(0)
  })

  // C15
  test('lista na largura de leitura', async ({ page }) => {
    await abrirEditor(page, 1440)
    const e = editor(page)
    const simulacao = await caixa(e.getByRole('region', { name: 'Simulação' }))
    const ultima = await caixa(e.getByLabel('Destino da etapa 2'))
    const raiz = await caixa(e)
    expect(simulacao.x + simulacao.width - raiz.x).toBeLessThanOrEqual(768 + 1)
    expect(simulacao.y).toBeGreaterThanOrEqual(ultima.y + ultima.height - 1)
  })
})

test.describe('editor de fluxo no celular', () => {
  // C16
  test('celular em página', async ({ page }) => {
    await abrirEditor(page, 390, 844)
    const e = editor(page)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(e.getByText('O canvas está disponível em telas maiores.')).toBeVisible()
    const ultima = await caixa(e.getByLabel('Destino da etapa 2'))
    expect((await caixa(e.getByRole('region', { name: 'Simulação' }))).y).toBeGreaterThanOrEqual(ultima.y + ultima.height - 1)
    for (const nome of ['Voltar', 'Simular', 'Salvar rascunho', 'Publicar', 'Mais']) expect((await caixa(e.getByRole('button', { name: nome }))).height, nome).toBeGreaterThanOrEqual(43.9)
  })

  // C17
  test('celular sem rolagem lateral', async ({ page }) => {
    await abrirEditor(page, 390, 844)
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([390, 390])
    const e = editor(page)
    const topos = new Set<number>()
    for (const nome of ['Voltar', 'Simular', 'Salvar rascunho', 'Publicar', 'Mais']) topos.add(Math.round((await caixa(e.getByRole('button', { name: nome }))).y))
    expect(topos.size, 'a barra quebra em mais de uma linha').toBeGreaterThan(1)
  })
})
