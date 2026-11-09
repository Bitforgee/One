import { expect, test, type Page } from '@playwright/test'
import { simularApi } from './simulada'

const Ativar = 'Ativar avisos neste aparelho'

async function comChave(page: Page, status: number, papeis = ['ALUNO']) {
  await simularApi(page, papeis)
  await page.route('**/api/push/chave', (rota) =>
    rota.fulfill({ status, contentType: 'application/json', body: status === 204 ? undefined : JSON.stringify({ chavePublica: 'BAEC' }) }),
  )
}

test('sw.js na raiz traz os tratadores de push', async ({ page, request }) => {
  const r = await request.get('/sw.js')
  expect(r.status()).toBe(200)
  expect(r.headers()['content-type']).toMatch(/javascript/)
  const texto = await r.text()
  expect(texto).toContain('push')
  expect(texto).toContain('notificationclick')

  await page.goto('/univag')
  const script = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL ?? (await navigator.serviceWorker.ready).active?.scriptURL)
  expect(script).toMatch(/\/sw\.js$/)
})

test('botão de avisos aparece com a chave e não pede permissão ao carregar', async ({ page }) => {
  await comChave(page, 200)
  await page.addInitScript(() => {
    const w = window as unknown as { pedidos: number }
    w.pedidos = 0
    const pedir = Notification.requestPermission.bind(Notification)
    Notification.requestPermission = (...a: []) => (w.pedidos++, pedir(...a))
  })
  await page.goto('/univag/assistente')
  await expect(page.getByRole('button', { name: Ativar })).toBeVisible()
  expect(await page.evaluate(async () => (await navigator.permissions.query({ name: 'notifications' })).state)).toBe('prompt')
  expect(await page.evaluate(() => (window as unknown as { pedidos: number }).pedidos)).toBe(0)
})

test('sem a chave o botão de avisos não existe', async ({ page }) => {
  await comChave(page, 204)
  await page.goto('/univag/assistente')
  await expect(page.getByTestId('instituicao')).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect(page.getByRole('button', { name: /avisos/i })).toHaveCount(0)
})

test('push desligado não deixa erro no console', async ({ page }) => {
  await comChave(page, 204, ['ALUNO', 'ATENDENTE'])
  await page.route('**/api/tempo-real/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ negotiateVersion: 1, connectionId: 'x', connectionToken: 'x', availableTransports: [] }) }))
  const erros: string[] = []
  const falhas: string[] = []
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()))
  page.on('pageerror', (e) => erros.push(e.message))
  page.on('response', (r) => r.status() >= 400 && r.status() < 500 && falhas.push(`${r.status()} ${r.url()}`))
  for (const [caminho, marca] of [['assistente', 'Mensagem'], ['fila', 'ONE-123'], ['conta', 'Ana']] as const) {
    const pedido = page.waitForResponse('**/api/push/chave')
    await page.goto(`/univag/${caminho}`)
    expect((await pedido).status()).toBe(204)
    await (caminho === 'assistente' ? page.getByLabel(marca) : page.getByText(marca).first()).waitFor()
    await expect(page.getByRole('button', { name: /avisos/i })).toHaveCount(0)
  }
  expect(falhas).toEqual([])
  expect(erros).toEqual([])
})

test('barra com o botão de avisos sem sobreposição', async ({ page }) => {
  await comChave(page, 200)
  for (const largura of [360, 640, 1024, 1536]) {
    await page.setViewportSize({ width: largura, height: 740 })
    await page.goto('/univag/assistente')
    await expect(page.getByRole('button', { name: Ativar })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${largura} px: rolagem horizontal`).toBeLessThanOrEqual(largura)
    const itens = await page.locator('main > header').evaluate((n) => {
      const filhos = [...n.firstElementChild!.children].flatMap((e) => (e.tagName === 'DIV' ? [...e.children] : [e]))
      return filhos.map((e) => ({ texto: e.textContent || e.getAttribute('aria-label'), ...e.getBoundingClientRect().toJSON() })).filter((c) => c.width > 0)
    })
    const sobrepoe = (a: (typeof itens)[number], b: typeof a) => a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1
    for (let i = 0; i < itens.length; i++)
      for (let j = i + 1; j < itens.length; j++) expect(sobrepoe(itens[i], itens[j]), `${largura} px: "${itens[i].texto}" x "${itens[j].texto}"`).toBe(false)
  }
})

test('avisos no cabeçalho', async ({ page }) => {
  await comChave(page, 200)
  for (const [largura, estado] of [[360, 'aberta'], [1280, 'aberta'], [1280, 'recolhida']] as const) {
    await page.setViewportSize({ width: largura, height: 740 })
    await page.goto('/univag')
    await page.evaluate((v) => localStorage.setItem('one-barra', v), estado)
    await page.goto('/univag/assistente')
    const cabecalho = page.locator('main > header')
    const avisos = cabecalho.getByRole('button', { name: Ativar })
    await expect(avisos, `${largura} px ${estado}`).toBeVisible()
    const a = (await avisos.boundingBox())!
    await expect(cabecalho.getByRole('button', { name: 'Tema' }), `${largura} px ${estado}: sem Tema`).toHaveCount(0)
    const c = (await cabecalho.boundingBox())!
    expect(c.x + c.width - (a.x + a.width), `${largura} px ${estado}: avisos na ponta direita`).toBeLessThanOrEqual(25)
    expect(await avisos.textContent(), 'só o ícone').toBe('')
    await expect(page.locator('[data-sidebar=sidebar]').getByRole('button', { name: Ativar }), 'fora da barra').toHaveCount(0)
  }
})
