import { expect, test, type Page } from '@playwright/test'
import { simularApi } from './simulada'

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
    ['Minhas solicitações', '/univag/solicitacoes', async (p) => void (await p.getByText('ONE-123').waitFor())],
    ['Fila', '/univag/fila', async (p) => void (await p.getByText('ONE-123').waitFor())],
    ['Detalhe do chamado', '/univag/chamados/ONE-123', async (p) => void (await p.getByText('Resumo gerado por IA').waitFor())],
    ['Artigos', '/univag/artigos', async (p) => void (await p.getByText('ARQUIVADO').waitFor())],
    ['Indicadores', '/univag/indicadores', async (p) => void (await p.getByText('Indicador principal').waitFor())],
    ['Usuários', '/univag/usuarios', async (p) => void (await p.getByText('Carla Regina de Souza Albuquerque').waitFor())],
    ['Matrículas', '/univag/matriculas', async (p) => void (await p.getByLabel('Arquivo CSV').waitFor())],
    ['Cadastros', '/univag/cadastros', async (p) => void (await p.getByText('Coordenação de Análise e Desenvolvimento de Sistemas').waitFor())],
    ['Raiz', '/', async (p) => void (await p.getByText('Abra o endereço da sua instituição, por exemplo /univag.').waitFor())],
    ['Primeiro acesso', '/univag/primeiro-acesso', async (p) => void (await p.getByLabel('CPF').waitFor())],
    ['Criar senha', '/univag/definir-senha?token=x', async (p) => void (await p.getByLabel('Nova senha').waitFor())],
    ['Trocar senha', '/univag/trocar-senha', async (p) => void (await p.getByLabel('Senha atual').waitFor())],
    ['Documentos', '/univag/documentos', async (p) => void (await p.getByText('Regulamento do estágio supervisionado obrigatório dos cursos de graduação').waitFor())],
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
