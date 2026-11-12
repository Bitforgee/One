import { expect, test, type Page } from '@playwright/test'
import { simularApi } from './simulada'

test.use({ serviceWorkers: 'block' })

const moodleVazio = {
  configurada: false, ativa: false, emissor: '', clientId: '', deploymentId: '', authUrl: '', jwksUrl: '',
  urlLogin: 'http://localhost:8080/api/moodle/univag/login', urlLancamento: 'http://localhost:8080/api/moodle/univag/lancamento', urlJwks: 'http://localhost:8080/api/moodle/univag/jwks',
}
const mcpVazio = { url: 'http://localhost:8080/api/mcp/univag', tokens: [] }
const tokenCriado = { id: 1, nome: 'Cursor', token: 'onemcp_univag.AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCdE', final: 'abcde', criadoEm: '2026-11-11T12:00:00Z', expiraEm: '2027-02-09T12:00:00Z' }

async function abrir(page: Page, largura: number, altura: number, caminho = '/univag/integracoes') {
  await page.setViewportSize({ width: largura, height: altura })
  await simularApi(page, ['ADMINISTRADOR'])
  await page.route('**/api/admin/moodle', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().method() === 'PUT' ? { ...moodleVazio, ...r.request().postDataJSON(), configurada: true } : moodleVazio) }))
  await page.route('**/api/admin/mcp', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mcpVazio) }))
  await page.route('**/api/admin/mcp/tokens', (r) => r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(tokenCriado) }))
  await page.goto(caminho)
  await page.locator('header h1').waitFor()
}

const semRolagemHorizontal = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test('coluna a 1440', async ({ page }) => {
  await abrir(page, 1440, 900)
  await expect(page.locator('header h1')).toHaveText('Integrações')
  const lista = page.getByRole('tablist')
  await expect(lista).toHaveAttribute('aria-orientation', 'vertical')
  await expect(lista.getByRole('tab')).toHaveText(['Moodle', 'MCP'])
  await expect(page.getByRole('combobox', { name: 'Integração' })).toBeHidden()
  const coluna = (await lista.boundingBox())!
  expect(coluna.width).toBeCloseTo(224, 0)
  const painel = (await page.getByRole('tabpanel').boundingBox())!
  expect(coluna.x + coluna.width).toBeLessThanOrEqual(painel.x)
  for (const aba of await lista.getByRole('tab').all()) {
    const c = (await aba.boundingBox())!
    expect(c.y).toBeGreaterThanOrEqual(coluna.y)
    expect(c.x).toBeGreaterThanOrEqual(coluna.x)
  }
  await lista.getByRole('tab', { name: 'MCP' }).click()
  await expect(page).toHaveURL(/\/univag\/integracoes\?aba=mcp$/)
  await expect(page.getByRole('heading', { name: 'MCP', level: 2 })).toBeVisible()
})

test('item ativo com fundo de destaque', async ({ page }) => {
  await abrir(page, 1440, 900)
  const fundo = (nome: string) => page.getByRole('tab', { name: nome }).evaluate((e) => getComputedStyle(e).backgroundColor)
  const transparente = 'rgba(0, 0, 0, 0)'
  const destaque = await page.evaluate(() => { const e = document.createElement('div'); e.style.backgroundColor = 'var(--accent)'; document.body.append(e); const c = getComputedStyle(e).backgroundColor; e.remove(); return c })
  expect(destaque).not.toBe(transparente)
  await expect.poll(() => fundo('Moodle')).toBe(destaque)
  await expect.poll(() => fundo('MCP')).toBe(transparente)
  await page.getByRole('tab', { name: 'MCP' }).click()
  await expect.poll(() => fundo('MCP')).toBe(destaque)
  await expect.poll(() => fundo('Moodle')).toBe(transparente)
})

test('limite de 896 px de largura útil', async ({ page }) => {
  const seletor = page.getByRole('combobox', { name: 'Integração' })
  const util = () => page.locator('[class*="@container/main"]').evaluate((e) => { const c = getComputedStyle(e); return e.clientWidth - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight) })
  await abrir(page, 1199, 900)
  const largura = await util()
  expect(largura).toBe(895)
  await expect(seletor).toBeVisible()
  await expect(page.getByRole('tablist')).toBeHidden()
  await page.setViewportSize({ width: 1200, height: 900 })
  expect(await util()).toBeGreaterThanOrEqual(896)
  await expect(seletor).toBeHidden()
  await expect(page.getByRole('tablist')).toBeVisible()
})

const novoToken = async (page: Page) => {
  await page.getByRole('button', { name: 'Novo token' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo token' })
  await dialogo.getByLabel('Nome').fill('Cursor')
  return dialogo
}
const revelar = async (page: Page) => {
  await (await novoToken(page)).getByRole('button', { name: 'Criar token' }).click()
  const revelacao = page.getByRole('dialog', { name: 'Copie o token agora' })
  await revelacao.waitFor()
  return revelacao
}
const alturaDe = async (l: ReturnType<Page['locator']>) => (await l.boundingBox())!.height

test('estado dentro de cada item da coluna', async ({ page }) => {
  await abrir(page, 1440, 900)
  const esperado = { Moodle: 'Não configurado', MCP: 'Sem tokens ativos' }
  for (const [nome, estado] of Object.entries(esperado)) {
    const aba = page.getByRole('tab', { name: nome })
    const id = await aba.getAttribute('aria-describedby')
    const linha = page.locator(`[id="${id}"]`)
    await expect(linha).toHaveText(estado)
    const a = (await aba.boundingBox())!
    const l = (await linha.boundingBox())!
    expect(l.y).toBeGreaterThanOrEqual(a.y + a.height / 2)
    expect(l.y + l.height).toBeLessThanOrEqual(a.y + a.height)
    expect(l.x).toBeGreaterThanOrEqual(a.x)
  }
  const mcp = (await page.locator('[id="estado-mcp"]').boundingBox())!
  await page.mouse.click(mcp.x + mcp.width / 2, mcp.y + mcp.height / 2)
  await expect(page.getByRole('tab', { name: 'MCP' })).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/\?aba=mcp$/)
})

test('Novo token no cabeçalho e aviso do Moodle abaixo do botão', async ({ page }) => {
  await abrir(page, 1440, 900, '/univag/integracoes?aba=mcp')
  const titulo = (await page.getByRole('heading', { name: 'MCP', level: 2 }).boundingBox())!
  const botao = (await page.getByRole('button', { name: 'Novo token' }).boundingBox())!
  expect(botao.x).toBeGreaterThan(titulo.x + titulo.width)
  const painel = (await page.getByRole('tabpanel').boundingBox())!
  expect(painel.x + painel.width - (botao.x + botao.width)).toBeLessThan(8)
  expect(Math.abs(botao.y + botao.height / 2 - (titulo.y + titulo.height / 2))).toBeLessThan(40)
  await page.getByRole('tab', { name: 'Moodle' }).click()
  for (const [rotulo, valor] of [['Emissor (iss)', 'https://ava.teste'], ['Client ID', 'c1'], ['Deployment ID', '7'], ['URL de autenticação', 'https://ava.teste/a'], ['URL das chaves (JWKS)', 'https://ava.teste/k']]) await page.getByLabel(rotulo).fill(valor)
  const salvar = page.getByRole('button', { name: 'Salvar' })
  await salvar.click()
  const aviso = page.getByRole('status').filter({ hasText: 'Moodle salvo e ativo.' })
  await expect(aviso).toBeVisible()
  const b = (await salvar.boundingBox())!
  expect((await aviso.boundingBox())!.y).toBeGreaterThanOrEqual(b.y + b.height)
})

test('revelação no computador ignora clique fora e Esc', async ({ page }) => {
  await abrir(page, 1440, 900, '/univag/integracoes?aba=mcp')
  const revelacao = await revelar(page)
  await expect(revelacao.getByRole('button', { name: /fechar|close/i })).toHaveCount(0)
  await expect(revelacao.getByRole('button', { name: 'Cancelar' })).toHaveCount(0)
  await page.mouse.click(5, 5)
  await expect(revelacao).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(revelacao).toBeVisible()
  await revelacao.getByRole('button', { name: 'Já copiei' }).click()
  await expect(revelacao).toBeHidden()
})

test.describe('celular', () => {
  test.use({ hasTouch: true, isMobile: true })

  for (const [largura, altura, nome] of [
    [360, 780, 'em pé 360×780'],
    [844, 390, 'deitado 844×390'],
  ] as const) {
    test(`seletor ${nome}`, async ({ page }) => {
      await abrir(page, largura, altura)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
      await expect(page.getByRole('tablist')).toBeHidden()
      const seletor = page.getByRole('combobox', { name: 'Integração' })
      await expect(seletor).toBeVisible()
      await expect(seletor.locator('option')).toHaveText(['Moodle · Não configurado', 'MCP · Sem tokens ativos'])
      expect(await alturaDe(seletor)).toBeGreaterThanOrEqual(44)
      expect(await semRolagemHorizontal(page)).toBe(true)
      await seletor.selectOption('mcp')
      await expect(page).toHaveURL(/\/univag\/integracoes\?aba=mcp$/)
      await expect(page.getByRole('heading', { name: 'MCP', level: 2 })).toBeVisible()
      expect(await semRolagemHorizontal(page)).toBe(true)
    })
  }

  test('diálogo em pé', async ({ page }) => {
    await abrir(page, 360, 780, '/univag/integracoes?aba=mcp')
    const dialogo = await novoToken(page)
    expect(await alturaDe(dialogo)).toBeCloseTo(780, 0)
    expect(await semRolagemHorizontal(page)).toBe(true)
    await dialogo.getByRole('button', { name: 'Criar token' }).click()
    const revelacao = page.getByRole('dialog', { name: 'Copie o token agora' })
    await expect(revelacao.getByText(tokenCriado.token, { exact: true })).toBeVisible()
    expect(await revelacao.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true)
    expect(await semRolagemHorizontal(page)).toBe(true)
  })

  test('revelação no celular ignora Esc e não tem botão de fechar', async ({ page }) => {
    await abrir(page, 360, 780, '/univag/integracoes?aba=mcp')
    const revelacao = await revelar(page)
    await expect(revelacao.getByRole('button', { name: /fechar|close/i })).toHaveCount(0)
    await expect(revelacao.getByRole('button', { name: 'Cancelar' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(revelacao).toBeVisible()
    await revelacao.getByRole('button', { name: 'Já copiei' }).click()
    await expect(revelacao).toBeHidden()
  })

  test('diálogo deitado', async ({ page }) => {
    await abrir(page, 844, 390, '/univag/integracoes?aba=mcp')
    const revelacao = await revelar(page)
    const botao = revelacao.getByRole('button', { name: 'Já copiei' })
    await botao.scrollIntoViewIfNeeded()
    const c = (await botao.boundingBox())!
    expect(c.y).toBeGreaterThanOrEqual(0)
    expect(c.y + c.height).toBeLessThanOrEqual(390)
    const json = revelacao.getByText('mcp.json do Cursor')
    await json.scrollIntoViewIfNeeded()
    const j = (await json.boundingBox())!
    expect(j.y).toBeGreaterThanOrEqual(0)
    expect(j.y + j.height).toBeLessThanOrEqual(390)
    expect(await semRolagemHorizontal(page)).toBe(true)
  })

  test('revelação rola no celular baixo', async ({ page }) => {
    await abrir(page, 360, 300, '/univag/integracoes?aba=mcp')
    const revelacao = await revelar(page)
    const json = revelacao.getByText('mcp.json do Cursor')
    await json.scrollIntoViewIfNeeded()
    const j = (await json.boundingBox())!
    expect(j.y).toBeGreaterThanOrEqual(0)
    expect(j.y + j.height).toBeLessThanOrEqual(300)
    const botao = (await revelacao.getByRole('button', { name: 'Já copiei' }).boundingBox())!
    expect(botao.y + botao.height).toBeLessThanOrEqual(300)
    expect(await semRolagemHorizontal(page)).toBe(true)
  })
  test('teclado aberto 360×400', async ({ page }) => {
    await abrir(page, 360, 400, '/univag/integracoes?aba=mcp')
    expect(await semRolagemHorizontal(page)).toBe(true)
    await page.getByRole('button', { name: 'Novo token' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Novo token' })
    const nome = dialogo.getByLabel('Nome')
    await nome.focus()
    const campo = (await nome.boundingBox())!
    expect(campo.y).toBeGreaterThanOrEqual(0)
    expect(campo.y + campo.height).toBeLessThanOrEqual(400)
    const criar = dialogo.getByRole('button', { name: 'Criar token' })
    await criar.scrollIntoViewIfNeeded()
    const botao = (await criar.boundingBox())!
    expect(botao.y).toBeGreaterThanOrEqual(0)
    expect(botao.y + botao.height).toBeLessThanOrEqual(400)
    expect(await semRolagemHorizontal(page)).toBe(true)
  })

  test('alvos de toque', async ({ page }) => {
    await abrir(page, 360, 780, '/univag/integracoes?aba=mcp')
    expect(await alturaDe(page.getByRole('combobox', { name: 'Integração' }))).toBeGreaterThanOrEqual(44)
    expect(await alturaDe(page.getByRole('button', { name: 'Novo token' }))).toBeGreaterThanOrEqual(44)
    const revelacao = await revelar(page)
    for (const copiar of await revelacao.getByRole('button', { name: /^Copiar/ }).all()) expect(await alturaDe(copiar)).toBeGreaterThanOrEqual(44)
    expect(await alturaDe(revelacao.getByRole('button', { name: 'Já copiei' }))).toBeGreaterThanOrEqual(44)
  })
})