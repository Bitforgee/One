import { expect, test } from '@playwright/test'
import { simularApi, Telas } from './simulada'

test('manifesto e service worker', async ({ page, request }) => {
  const manifesto = await (await request.get('/manifest.webmanifest')).json()
  expect(manifesto.name).toBe('One')
  const tamanhos = manifesto.icons.map((i: { sizes: string }) => i.sizes)
  expect(tamanhos).toEqual(expect.arrayContaining(['192x192', '512x512']))
  for (const icone of manifesto.icons) {
    const r = await request.get(icone.src)
    expect(r.status()).toBe(200)
    expect(r.headers()['content-type']).toBe('image/png')
  }

  await page.goto('/univag')
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)

  const status = await page.evaluate(async () => (await fetch('/api/auth/me')).status)
  expect(status).toBe(401)

  const urls = await page.evaluate(async () => {
    const lista: string[] = []
    for (const nome of await caches.keys()) for (const r of await (await caches.open(nome)).keys()) lista.push(r.url)
    return lista
  })
  expect(urls.length).toBeGreaterThan(0)
  expect(urls.filter((u) => new URL(u).pathname.startsWith('/api/'))).toEqual([])
})

test.describe('sem rolagem horizontal a 360 px', () => {
  test.use({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' })

  for (const [nome, caminho, preparar] of Telas)
    test(nome, async ({ page }) => {
      await simularApi(page)
      await page.goto(caminho)
      await preparar(page)
      const largura = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(largura).toBeLessThanOrEqual(360)
    })
})
