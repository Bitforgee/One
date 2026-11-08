import { expect, test, type Page } from '@playwright/test'
import { simularApi } from './simulada'

// fluxos-atendimento S6: o que o canvas faz com mouse e teclado, que o jsdom não mede. API simulada (e2e/simulada.ts).
const etapa = (destino: string, x: number | null = null, y: number | null = null, prazoHoras: number | null = null) => ({ destino, setorId: null, prazoHoras, x, y })
const categoria = { id: 1, nome: 'Financeiro > Boletos e mensalidades', ativa: true, padrao: false }

async function fluxos(page: Page, rascunho: object | null) {
  await simularApi(page)
  // a lista de fluxos desta tela: um fluxo para todos os cursos, com o rascunho pedido (o último route registrado vale primeiro)
  await page.route('**/api/admin/fluxos', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 6, categoriaId: 1, cursoId: null, semestre: null, vigente: null, rascunho }]) }),
  )
  await page.route('**/api/admin/categorias', (rota) => rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([categoria]) }))
}

async function abrirEditor(page: Page) {
  await page.goto('/univag/cadastros')
  await page.waitForSelector('[role=tab], select[aria-label=Cadastro]', { state: 'attached' })
  // em telas estreitas as abas viram uma lista de escolha
  const aba = page.getByRole('tab', { name: 'Fluxos' })
  if (await aba.isVisible()) await aba.click()
  else await page.getByLabel('Cadastro').selectOption('fluxos')
  await page.getByRole('tabpanel', { name: 'Fluxos' }).getByRole('button', { name: categoria.nome }).click()
  return page.getByRole('dialog', { name: 'Editar: Fluxos' })
}

async function abrirCanvas(page: Page) {
  const dialogo = await abrirEditor(page)
  await dialogo.getByRole('tab', { name: 'Canvas' }).click()
  await expect(page.getByLabel('Início', { exact: true })).toBeVisible()
  return dialogo
}

// arrasta um destino do menu do botão Adicionar etapa até um ponto do canvas (a paleta em fileira deu lugar ao menu)
async function arrastar(page: Page, destino: string, alvo: { x: number; y: number }) {
  await page.getByRole('button', { name: 'Adicionar etapa', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`^${destino}`) }).dragTo(page.locator('.react-flow'), { targetPosition: alvo })
  await page.keyboard.press('Escape')
}

const nos = (page: Page) => page.locator('.react-flow__node')
const arestas = (page: Page) => page.locator('.react-flow__edge')
const centro = async (alvo: ReturnType<Page['locator']>) => {
  const caixa = (await alvo.boundingBox())!
  return { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 }
}

// arrasta da bolinha de saída de um nó até a de entrada de outro, com o mouse, em passos
async function ligar(page: Page, de: ReturnType<Page['locator']>, para: ReturnType<Page['locator']>) {
  const [a, b] = [await centro(de.locator('.react-flow__handle.source')), await centro(para.locator('.react-flow__handle.target'))]
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 })
  await page.mouse.move(b.x, b.y, { steps: 5 })
  await page.mouse.up()
}

test.describe('canvas dos fluxos', () => {
  // fluxos-atendimento C85 (AC 72)
  test('arrastar tipo da paleta', async ({ page }) => {
    await fluxos(page, { numero: 1, etapas: [] })
    await abrirCanvas(page)
    await expect(nos(page)).toHaveCount(1) // só o Início
    await expect(page.getByText('Arraste um destino para começar.')).toBeVisible()

    await arrastar(page, 'Coordenação do curso', { x: 320, y: 160 })

    await expect(nos(page)).toHaveCount(2)
    const novo = page.getByLabel('Etapa 1: Coordenação do curso')
    await expect(novo).toBeVisible()
    const fluxo = (await page.locator('.react-flow').boundingBox())! // medido depois: o aviso da cadeia empurra o canvas para baixo
    const caixa = (await novo.boundingBox())!
    expect(Math.abs(caixa.x - (fluxo.x + 320))).toBeLessThan(12) // o nó cai onde foi largado
    expect(Math.abs(caixa.y - (fluxo.y + 160))).toBeLessThan(12)
    await expect(arestas(page)).toHaveCount(0) // sem ligação
    await expect(page.getByRole('alert').filter({ hasText: 'Ligue todas as etapas ao Início' })).toBeVisible()
  })

  // C87 (AC 73)
  test('ligar nós em cadeia', async ({ page }) => {
    await fluxos(page, { numero: 1, etapas: [] })
    await abrirCanvas(page)
    await arrastar(page, 'Liderança do semestre', { x: 330, y: 60 })
    await arrastar(page, 'Coordenação do curso', { x: 330, y: 360 })
    const inicio = page.getByLabel('Início', { exact: true })
    const primeiro = page.getByLabel('Etapa 1: Liderança do semestre')
    const segundo = page.getByLabel('Etapa 2: Coordenação do curso')
    await expect(segundo).toBeVisible()

    await ligar(page, inicio, primeiro)
    await expect(arestas(page)).toHaveCount(1)

    // o Início já tem a sua saída: uma segunda é recusada
    await ligar(page, inicio, segundo)
    await expect(arestas(page)).toHaveCount(1)

    await ligar(page, primeiro, segundo)
    await expect(arestas(page)).toHaveCount(2)
    await expect(page.getByRole('alert').filter({ hasText: 'Ligue todas as etapas ao Início' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toBeEnabled()

    // o fim da cadeia não fecha um ciclo com o primeiro
    await ligar(page, segundo, primeiro)
    await expect(arestas(page)).toHaveCount(2)
  })

  // C91 (AC 77)
  test('teclado no canvas', async ({ page }) => {
    await fluxos(page, { numero: 1, etapas: [etapa('LIDERANCA_SEMESTRE', 320, 40), etapa('COORDENACAO_CURSO', 620, 40)] })
    const dialogo = await abrirCanvas(page)
    await dialogo.getByRole('tab', { name: 'Canvas' }).focus()

    // Tab chega a cada nó do canvas
    const visitados = new Set<string>()
    for (let i = 0; i < 30 && visitados.size < 3; i++) {
      await page.keyboard.press('Tab')
      const rotulo = await page.evaluate(() => (document.activeElement?.classList.contains('react-flow__node') ? document.activeElement.getAttribute('aria-label') : null))
      if (rotulo) visitados.add(rotulo)
    }
    expect([...visitados].sort()).toEqual(['Etapa 1: Liderança do semestre', 'Etapa 2: Coordenação do curso', 'Início'])

    // Enter seleciona o nó em foco e as setas o movem
    const primeiro = page.getByLabel('Etapa 1: Liderança do semestre')
    await primeiro.focus()
    await page.keyboard.press('Enter')
    const antes = (await primeiro.boundingBox())!
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await expect.poll(async () => (await primeiro.boundingBox())!.x).toBeGreaterThan(antes.x + 1)
    const depois = (await primeiro.boundingBox())!
    expect(depois.x - antes.x).toBeLessThan(40)
    expect(depois.y).toBeGreaterThan(antes.y)
  })

  // C113 (AD-042): o zoom nunca passa de 100%, nem com um fluxo curto
  test('zoom máximo de 100%', async ({ page }) => {
    await fluxos(page, { numero: 1, etapas: [etapa('COORDENACAO_CURSO', 320, 40)] })
    await abrirCanvas(page)
    const escala = await page.locator('.react-flow__viewport').evaluate((e) => new DOMMatrixReadOnly(getComputedStyle(e).transform).a)
    expect(escala).toBeLessThanOrEqual(1)
    expect(escala).toBeGreaterThan(0)
  })

  // C93 (AC 79)
  test('celular só com a lista', async ({ page }) => {
    await fluxos(page, { numero: 1, etapas: [etapa('COORDENACAO_CURSO')] })
    await page.setViewportSize({ width: 767, height: 900 })
    const editor = await abrirEditor(page)

    await expect(editor.getByText('O canvas está disponível em telas maiores.')).toBeVisible()
    await expect(editor.getByRole('tab', { name: 'Canvas' })).toHaveCount(0)
    await expect(editor.getByLabel('Destino da etapa 1')).toBeVisible()
    await expect(page.locator('.react-flow')).toHaveCount(0)
  })

  // fluxos-atendimento ## Screens: Simular e Publicar na mesma barra, os quatro botões à vista (extra)
  test('arranjo da barra de ações: Simular e Publicar na mesma barra a 1440x900', async ({ page }) => {
    await fluxos(page, { numero: 1, etapas: [etapa('LIDERANCA_SEMESTRE'), etapa('COORDENACAO_CURSO')] })
    await page.setViewportSize({ width: 1440, height: 900 })
    const editor = await abrirEditor(page)

    const caixas: Record<string, { x: number; y: number; width: number; height: number }> = {}
    for (const nome of ['Simular', 'Publicar', 'Salvar rascunho', 'Cancelar']) caixas[nome] = (await editor.getByRole('button', { name: nome, exact: true }).boundingBox())!
    expect(Math.abs(caixas['Simular'].y - caixas['Publicar'].y)).toBeLessThanOrEqual(1)
    expect(Math.abs(caixas['Simular'].height - caixas['Publicar'].height)).toBeLessThanOrEqual(1)
    for (const [nome, c] of Object.entries(caixas)) {
      expect(c.x, nome).toBeGreaterThanOrEqual(0)
      expect(c.y, nome).toBeGreaterThanOrEqual(0)
      expect(c.x + c.width, nome).toBeLessThanOrEqual(1440)
      expect(c.y + c.height, nome).toBeLessThanOrEqual(900)
    }
  })
  test('celular só com a lista: a partir de 768 px as duas visões', async ({ page }) => {
    await fluxos(page, { numero: 1, etapas: [etapa('COORDENACAO_CURSO')] })
    await page.setViewportSize({ width: 768, height: 900 })
    const editor = await abrirEditor(page)

    await expect(editor.getByRole('tab', { name: 'Lista' })).toBeVisible()
    await expect(editor.getByRole('tab', { name: 'Canvas' })).toBeVisible()
    await expect(editor.getByText('O canvas está disponível em telas maiores.')).toHaveCount(0)
  })
})
