import { expect, test, type Locator, type Page } from '@playwright/test'
import { chamadoSimulado, simularApi } from './simulada'

// chat-linha-do-tempo: arranjo do compositor do aluno e da linha do tempo do chamado, medido com boundingBox() (px CSS).
test.use({ serviceWorkers: 'block' })

const caixa = async (l: Locator) => (await l.boundingBox())!
const assentar = (page: Page) => page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished'))
const perto = (a: number, b: number, tolerancia: number, quem: string) => expect(Math.abs(a - b), `${quem}: ${a} x ${b}`).toBeLessThanOrEqual(tolerancia)

async function assistente(page: Page, largura: number, altura = 800) {
  await page.setViewportSize({ width: largura, height: altura })
  await simularApi(page)
  await page.goto('/univag/assistente')
  await page.getByLabel('Mensagem').waitFor()
  await assentar(page)
}

const compositor = (page: Page) => page.getByTestId('compositor')

test.describe('compositor do aluno', () => {
  // C1
  test('compositor numa caixa', async ({ page }) => {
    for (const largura of [768, 1280, 1872]) {
      await assistente(page, largura)
      const c = await caixa(compositor(page))
      for (const nome of ['Anexar arquivo', /Enviar/]) {
        const b = await caixa(page.getByRole('button', { name: nome }))
        expect(b.x, `${largura} ${nome}`).toBeGreaterThanOrEqual(c.x)
        expect(b.x + b.width, `${largura} ${nome}`).toBeLessThanOrEqual(c.x + c.width)
        expect(b.y, `${largura} ${nome}`).toBeGreaterThanOrEqual(c.y)
        expect(b.y + b.height, `${largura} ${nome}`).toBeLessThanOrEqual(c.y + c.height)
      }
      perto(c.width, (await caixa(page.locator('[role="log"]'))).width, 1, `${largura} largura da caixa`)
    }
  })

  // C2
  test('bordas alinhadas', async ({ page }) => {
    for (const largura of [768, 1280, 1872]) {
      await assistente(page, largura)
      const c = await caixa(compositor(page))
      const falar = await caixa(page.getByRole('button', { name: 'Falar com atendente' }))
      const enviar = await caixa(page.getByRole('button', { name: /Enviar/ }))
      perto(falar.x, c.x, 1, `${largura} esquerda de Falar com atendente`)
      perto(enviar.x + enviar.width, c.x + c.width, 8, `${largura} direita de Enviar`) // o recuo interno da caixa é de 6 px
    }
  })

  // C3
  test('campo alto', async ({ page }) => {
    await assistente(page, 1280)
    await page.getByLabel('Mensagem').fill(Array.from({ length: 10 }, (_, i) => `linha ${i + 1}`).join('\n'))
    await assentar(page)
    const campo = await caixa(page.getByLabel('Mensagem'))
    expect(campo.height).toBeGreaterThan(150)
    const base = campo.y + campo.height
    for (const nome of ['Anexar arquivo', /Enviar/]) {
      const b = await caixa(page.getByRole('button', { name: nome }))
      perto(b.y + b.height, base, 2, `base de ${nome}`)
    }
  })

  // C4
  test('selos dentro da caixa', async ({ page }) => {
    await assistente(page, 1280)
    const antes = await caixa(page.getByRole('button', { name: 'Falar com atendente' }))
    await page.locator('input[type=file]').setInputFiles({ name: 'boleto.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
    const selo = await caixa(page.getByRole('button', { name: 'Remover boleto.pdf' }))
    const c = await caixa(compositor(page))
    const campo = await caixa(page.getByLabel('Mensagem'))
    expect(selo.y).toBeGreaterThanOrEqual(c.y)
    expect(selo.y + selo.height).toBeLessThanOrEqual(campo.y + 1)
    const ajuda = await caixa(page.getByText('PDF ou foto, até 10 MB'))
    expect(ajuda.y).toBeGreaterThanOrEqual(c.y + c.height - 1)
    const depois = await caixa(page.getByRole('button', { name: 'Falar com atendente' }))
    perto(depois.y, antes.y, 1, 'Falar com atendente não se move')
  })

  // C5
  test('360 px sem rolagem lateral', async ({ page }) => {
    await assistente(page, 360, 740)
    await page.getByLabel('Mensagem').fill('preciso do boleto')
    await page.getByRole('button', { name: /Enviar/ }).click()
    await page.getByText('Isso resolveu?').waitFor()
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([360, 360])
    for (const nome of ['Falar com atendente', 'Encerrar']) expect((await caixa(page.getByRole('button', { name: nome }))).height, nome).toBeGreaterThanOrEqual(44)
  })

  // C6
  test('caixa no fim da tela vazia', async ({ page }) => {
    await assistente(page, 1280, 800)
    const c = await caixa(compositor(page))
    expect(800 - (c.y + c.height)).toBeLessThanOrEqual(16)
    const pergunta = await caixa(page.getByRole('button', { name: 'Como emito o boleto do semestre?' }))
    expect(pergunta.y + pergunta.height).toBeLessThanOrEqual(c.y)
  })
})

// 40 itens: 20 mensagens e 20 eventos, de hora em hora
function chamadoLongo() {
  const base = Date.parse('2026-11-02T12:00:00Z')
  const hora = (n: number) => new Date(base + n * 3_600_000).toISOString()
  const c = chamadoSimulado('EM_ATENDIMENTO')
  return {
    ...c,
    estado: 'ABERTO',
    mensagens: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, tipo: 'PUBLICA', texto: `Mensagem ${i + 1} do atendimento, com um texto que ocupa a linha.`, autor: i % 2 ? 'Ana Beatriz' : 'Carla', doAluno: i % 2 === 1, criadaEm: hora(2 * i) })),
    eventos: Array.from({ length: 20 }, (_, i) => ({ tipo: 'NOTA', ator: 'Carla', doAluno: false, de: null, para: null, detalhe: null, criadoEm: hora(2 * i + 1) })),
  }
}

async function chamado(page: Page, largura: number, itens: 'longo' | 'curto' = 'longo') {
  await page.setViewportSize({ width: largura, height: 800 })
  await simularApi(page)
  await page.route('**/api/chamados/ONE-123', (rota) => rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(itens === 'longo' ? chamadoLongo() : chamadoSimulado()) }))
  await page.goto('/univag/chamados/ONE-123')
  await page.getByTestId('linha-do-tempo').waitFor()
  await assentar(page)
}

// a janela é quem rola: o main cresce com o conteúdo
const rolar = (page: Page, y: number) => page.evaluate((alvo) => window.scrollTo(0, alvo), y)
const dentro = async (l: Locator, altura = 800) => {
  const b = await caixa(l)
  return b.y >= 0 && b.y + b.height <= altura
}

test.describe('linha do tempo do chamado', () => {
  // C18
  test('resposta colada ao fim', async ({ page }) => {
    await chamado(page, 1280)
    await rolar(page, 600)
    await assentar(page)
    const campo = page.locator('form.form-resposta')
    expect(await dentro(campo), 'formulário de resposta na janela').toBe(true)
    expect(await dentro(page.getByLabel('Responder', { exact: true })), 'campo Responder na janela').toBe(true)
    expect(await dentro(campo.getByRole('button', { name: 'Enviar' })), 'Enviar na janela').toBe(true)
  })

  // C19
  test('ações visíveis ao rolar', async ({ page }) => {
    await chamado(page, 1280)
    await rolar(page, 600)
    await assentar(page)
    const cartao = page.locator('[data-slot=card]').filter({ has: page.getByText('Ações', { exact: true }) })
    expect(await dentro(cartao), 'cartão Ações na janela').toBe(true)
    expect(await dentro(page.getByRole('button', { name: 'Assumir' })), 'Assumir na janela').toBe(true)
  })

  // C20
  test('ir para o mais recente', async ({ page }) => {
    await chamado(page, 1280)
    await page.getByRole('button', { name: 'Ir para o mais recente' }).click()
    await assentar(page)
    const ultima = page.getByTestId('linha-do-tempo').getByRole('listitem').last()
    expect(await dentro(ultima), 'última li na janela').toBe(true)
    const campo = await caixa(page.locator('form.form-resposta'))
    const u = await caixa(ultima)
    expect(u.y + u.height, 'última li acima do formulário de resposta').toBeLessThanOrEqual(campo.y + 1)

    await chamado(page, 1280, 'curto')
    await expect(page.getByRole('button', { name: 'Ir para o mais recente' })).toHaveCount(0)
  })

  // C21
  test('celular mantém a barra', async ({ page }) => {
    await chamado(page, 390)
    const barra = page.getByRole('button', { name: 'Assumir' }).locator('xpath=..')
    expect(await barra.evaluate((e) => getComputedStyle(e).position)).toBe('fixed')
    await expect(page.getByRole('button', { name: 'Mais', exact: true })).toBeVisible()
    expect(await page.locator('form.form-resposta').evaluate((e) => getComputedStyle(e).position)).toBe('static')
  })
})
