import { expect, test, type Page } from '@playwright/test'
import { simularApi } from './simulada'

const Ativar = 'Ativar avisos neste aparelho'

// A chave da API é simulada: o push real não chega ao Playwright.
async function comChave(page: Page, status: number) {
  await simularApi(page, ['ALUNO'])
  await page.route('**/api/push/chave', (rota) =>
    rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? { chavePublica: 'BAEC' } : { title: 'Não encontrado', status, detail: 'x' }) }),
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
  await page.goto('/univag/assistente')
  await expect(page.getByRole('button', { name: Ativar })).toBeVisible()
  expect(await page.evaluate(() => Notification.permission)).toBe('default')
})

test('sem a chave o botão de avisos não existe', async ({ page }) => {
  await comChave(page, 404)
  await page.goto('/univag/assistente')
  await expect(page.getByTestId('instituicao')).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect(page.getByRole('button', { name: /avisos/i })).toHaveCount(0)
})

test('barra com o botão de avisos sem sobreposição', async ({ page }) => {
  await comChave(page, 200)
  for (const largura of [360, 640, 1024, 1536]) {
    await page.setViewportSize({ width: largura, height: 740 })
    await page.goto('/univag/assistente')
    await expect(page.getByRole('button', { name: Ativar })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${largura} px: rolagem horizontal`).toBeLessThanOrEqual(largura)
    const itens = await page.getByRole('navigation').evaluate((n) => {
      const filhos = [...n.firstElementChild!.children].flatMap((e) => (e.tagName === 'DIV' ? [...e.children] : [e]))
      return filhos.map((e) => ({ texto: e.textContent || e.getAttribute('aria-label'), ...e.getBoundingClientRect().toJSON() })).filter((c) => c.width > 0)
    })
    const sobrepoe = (a: (typeof itens)[number], b: typeof a) => a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1
    for (let i = 0; i < itens.length; i++)
      for (let j = i + 1; j < itens.length; j++) expect(sobrepoe(itens[i], itens[j]), `${largura} px: "${itens[i].texto}" x "${itens[j].texto}"`).toBe(false)
  }
})
