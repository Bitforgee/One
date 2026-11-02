import { expect, test, type Page } from '@playwright/test'

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

// API simulada: o teste mede só o layout de cada tela.
async function simularApi(page: Page) {
  await page.route('**/api/**', (rota) => {
    const caminho = new URL(rota.request().url()).pathname
    const json = (status: number, corpo: unknown) => rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) })
    if (caminho === '/api/instituicoes/univag') return json(200, { nome: 'Centro Universitário de Várzea Grande' })
    if (caminho === '/api/auth/me')
      return json(200, {
        id: 1,
        nome: 'Ana',
        cpfMascarado: '***.456.789-**',
        papeis: ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'],
        deveTrocarSenha: false,
        instituicao: { slug: 'univag', nome: 'Centro Universitário de Várzea Grande', fuso: 'America/Cuiaba' },
        matriculas: [],
      })
    if (caminho === '/api/conversas')
      return json(201, { conversaId: 1, resposta: { tipo: 'resposta', texto: 'O boleto do semestre fica no Portal do Aluno: https://portal.univag.edu.br/financeiro/boletos/segunda-via' } })
    return json(404, { status: 404, detail: 'Recurso não encontrado.' })
  })
}

test.describe('sem rolagem horizontal a 360 px', () => {
  test.use({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' })

  // Os lotes seguintes acrescentam Minhas solicitações, Fila, Detalhe do chamado, Artigos e Indicadores (7 telas).
  const telas: [string, string, (p: Page) => Promise<void>][] = [
    ['Login', '/univag', async (p) => void (await p.getByLabel('CPF').waitFor())],
    [
      'Assistente',
      '/univag/assistente',
      async (p) => {
        await p.getByLabel('Mensagem').fill('preciso do boleto do semestre, onde encontro a segunda via?')
        await p.getByRole('button', { name: /Enviar/ }).click()
        await p.getByText('Isso resolveu?').waitFor()
      },
    ],
  ]

  for (const [nome, caminho, preparar] of telas)
    test(nome, async ({ page }) => {
      await simularApi(page)
      await page.goto(caminho)
      await preparar(page)
      const largura = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(largura).toBeLessThanOrEqual(360)
    })
})
