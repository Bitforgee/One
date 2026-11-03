import { expect, test, type Locator, type Page } from '@playwright/test'
import { simularApi } from './simulada'

// Arranjo de ## Screens medido com boundingBox() (regra do arranjo de checks.md): px CSS, tolerância de 1 px.
test.use({ serviceWorkers: 'block' })

const Links = ['Assistente', 'Minhas solicitações', 'Fila', 'Artigos', 'Documentos', 'Indicadores', 'Usuários', 'Matrículas', 'Cadastros']
const caixa = async (l: Locator) => (await l.boundingBox())!
const Longa =
  'O boleto do semestre fica no Portal do Aluno, em Financeiro, Boletos e mensalidades. Escolha o mês, confira o valor e gere a segunda via; se o valor estiver diferente do contrato, abra uma solicitação para o financeiro conferir a rematrícula do semestre anterior. '.repeat(3)

// Cada mensagem do aluno recebe uma resposta longa.
async function conversaLonga(page: Page) {
  await simularApi(page)
  await page.route('**/api/conversas/1/mensagens', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ resposta: { tipo: 'resposta', texto: Longa } }) }),
  )
}

async function enviar(page: Page, texto: string) {
  await page.getByLabel('Mensagem').fill(texto)
  await page.getByRole('button', { name: /Enviar/ }).click()
}

// Amostra transform e opacity do primeiro balão que entra no log, a cada quadro, por 600 ms.
async function amostrarBalaoNovo(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { amostras: { transform: string; opacity: string }[]; pronto: boolean }
    w.amostras = []
    w.pronto = false
    const log = document.querySelector('[role="log"]')!
    const observador = new MutationObserver(() => {
      const balao = log.querySelector('.is-user, .is-assistant') as HTMLElement | null
      if (!balao) return
      observador.disconnect()
      const inicio = performance.now()
      const quadro = () => {
        const estilo = getComputedStyle(balao)
        w.amostras.push({ transform: estilo.transform, opacity: estilo.opacity })
        if (performance.now() - inicio < 600) requestAnimationFrame(quadro)
        else w.pronto = true
      }
      requestAnimationFrame(quadro)
    })
    observador.observe(log, { childList: true, subtree: true })
  })
  await enviar(page, 'preciso do boleto')
  await page.waitForFunction(() => (window as unknown as { pronto: boolean }).pronto)
  return page.evaluate(() => (window as unknown as { amostras: { transform: string; opacity: string }[] }).amostras)
}

// Deslocamento vertical de uma matriz CSS 2D ("none" = 0).
const deslocamentoY = (transform: string) => (transform === 'none' ? 0 : Number(transform.match(/matrix\(([^)]+)\)/)![1].split(',')[5]))
const identidade = (transform: string) => transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'

test.describe('cabeçalho', () => {
  test('cabeçalho a 360 px abre a gaveta Menu', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await simularApi(page)
    await page.goto('/univag/chamados/ONE-123')
    await page.getByText('Resumo gerado por IA').waitFor()
    const nav = page.getByRole('navigation')
    expect((await caixa(nav)).height).toBeCloseTo(56, 0)
    await page.evaluate(() => window.scrollTo(0, 300))
    expect(await page.evaluate(() => window.scrollY)).toBe(300)
    expect(Math.abs((await caixa(nav)).y)).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: 'Menu' }).click()
    const gaveta = page.getByRole('dialog', { name: 'Menu' })
    await gaveta.waitFor()
    const itens = gaveta.locator('a, button')
    expect(await itens.allTextContents()).toEqual([...Links, 'Sair'])
    for (const item of await itens.all()) expect(Math.abs((await caixa(item)).height - 48)).toBeLessThanOrEqual(1)

    // só aluno: os dois links do aluno e Sair
    const aluno = await page.context().newPage()
    await simularApi(aluno, ['ALUNO'])
    await aluno.setViewportSize({ width: 360, height: 740 })
    await aluno.goto('/univag/solicitacoes')
    await aluno.getByRole('button', { name: 'Menu' }).click()
    expect(await aluno.getByRole('dialog', { name: 'Menu' }).locator('a, button').allTextContents()).toEqual(['Assistente', 'Minhas solicitações', 'Sair'])
  })

  test('cabeçalho a 640 px mostra os links na barra', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 640, height: 740 })
    await page.goto('/univag/fila')
    const nav = page.getByRole('navigation')
    const sair = nav.getByRole('button', { name: 'Sair' })
    await expect(sair).toBeVisible()
    const direitaDosLinks = []
    for (const rotulo of Links) {
      const link = nav.getByRole('link', { name: rotulo })
      await expect(link).toBeVisible()
      const c = await caixa(link)
      direitaDosLinks.push(c.x + c.width)
    }
    expect((await caixa(sair)).x).toBeGreaterThanOrEqual(Math.max(...direitaDosLinks))
    await expect(nav.getByRole('button', { name: 'Menu' })).toBeHidden()

    await page.setViewportSize({ width: 639, height: 740 })
    await expect(nav.getByRole('button', { name: 'Menu' })).toBeVisible()
    for (const rotulo of Links) await expect(nav.getByRole('link', { name: rotulo })).toBeHidden()
  })

  test('fonte Inter do próprio app', async ({ page, baseURL }) => {
    const origens = new Set<string>()
    page.on('request', (r) => void origens.add(new URL(r.url()).origin))
    await simularApi(page)
    await page.goto('/univag')
    await page.getByLabel('CPF').waitFor()
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/^"Inter Variable"/)
    expect(await page.evaluate(async () => (await document.fonts.ready, document.fonts.check('16px "Inter Variable"')))).toBe(true)
    expect([...origens]).toEqual([new URL(baseURL!).origin])
  })
})

test.describe('Assistente', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('compositor visível com a conversa maior que a tela', async ({ page }) => {
    await conversaLonga(page)
    await page.goto('/univag/assistente')
    for (let n = 1; n <= 4; n++) {
      await enviar(page, `mensagem ${n}`)
      await expect(page.locator('.is-assistant')).toHaveCount(n)
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(740)
    for (const ate of ['topo', 'fim']) {
      await page.evaluate((fim) => window.scrollTo(0, fim ? document.documentElement.scrollHeight : 0), ate === 'fim')
      for (const nome of [/Enviar/, /Falar com atendente/]) {
        const c = await caixa(page.getByRole('button', { name: nome }))
        expect(c.y, `${ate} ${nome}`).toBeGreaterThanOrEqual(0)
        expect(c.y + c.height, `${ate} ${nome}`).toBeLessThanOrEqual(740)
      }
    }
  })

  test('movimento reduzido sem animação', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await simularApi(page)
    await page.goto('/univag/assistente')
    await page.getByLabel('Mensagem').waitFor()
    const amostras = await amostrarBalaoNovo(page)
    expect(amostras.length).toBeGreaterThan(0)
    expect(amostras.filter((a) => !identidade(a.transform))).toEqual([])
  })

  test('mensagem nova anima só com transform', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await simularApi(page)
    await page.goto('/univag/assistente')
    await page.getByLabel('Mensagem').waitFor()
    const amostras = await amostrarBalaoNovo(page)
    const deslocamentos = amostras.map((a) => deslocamentoY(a.transform))
    expect(deslocamentos.some((y) => y > 0 && y <= 8)).toBe(true)
    expect(deslocamentos.every((y) => y >= 0 && y <= 8)).toBe(true)
    expect(amostras.map((a) => a.opacity).filter((o) => o !== '1')).toEqual([])
  })

  test('arranjo Assistente', async ({ page }) => {
    await simularApi(page)
    await page.goto('/univag/assistente')
    await enviar(page, 'preciso do boleto do semestre')
    await page.getByText('Isso resolveu?').waitFor()

    const titulo = await caixa(page.getByRole('heading', { name: 'Assistente' }))
    const aviso = await caixa(page.getByText(/Suas mensagens são analisadas/))
    const log = await caixa(page.getByRole('log'))
    const enviarBotao = await caixa(page.getByRole('button', { name: /Enviar/ }))
    expect(aviso.y).toBeGreaterThanOrEqual(titulo.y + titulo.height - 1)
    expect(log.y).toBeGreaterThanOrEqual(aviso.y + aviso.height - 1)
    expect(enviarBotao.y).toBeGreaterThanOrEqual(log.y + log.height - 1)

    const aluno = await caixa(page.locator('.is-user').first())
    const assistente = await caixa(page.locator('.is-assistant').first())
    expect(Math.abs(aluno.x + aluno.width - (log.x + log.width)), JSON.stringify({ aluno, log })).toBeLessThanOrEqual(1)
    expect(Math.abs(assistente.x - log.x)).toBeLessThanOrEqual(1)
    expect(aluno.width).toBeLessThanOrEqual(log.width * 0.9 + 1)
    expect(assistente.width).toBeLessThanOrEqual(log.width * 0.9 + 1)

    const resolveu = await caixa(page.getByText('Isso resolveu?'))
    expect(resolveu.y).toBeGreaterThanOrEqual(assistente.y + assistente.height - 1)

    const falar = await caixa(page.getByRole('button', { name: /Falar com atendente/ }))
    const encerrar = await caixa(page.getByRole('button', { name: 'Encerrar' }))
    expect(Math.abs(falar.y - encerrar.y)).toBeLessThanOrEqual(4)
    expect(falar.y).toBeGreaterThanOrEqual(enviarBotao.y + enviarBotao.height - 1)

    await page.getByRole('button', { name: 'Encerrar' }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toContainText('Encerrar a conversa?')
    const d = await caixa(dialogo)
    expect(Math.abs(d.x - 16)).toBeLessThanOrEqual(1)
    expect(Math.abs(d.width - 328)).toBeLessThanOrEqual(1)
    const confirmar = await caixa(dialogo.getByRole('button', { name: 'Confirmar' }))
    const cancelar = await caixa(dialogo.getByRole('button', { name: 'Cancelar' }))
    expect(confirmar.y + confirmar.height).toBeLessThanOrEqual(cancelar.y + 1)
    expect(await dialogo.locator('button').evaluateAll((bs) => bs.map((b) => b.textContent?.trim()).filter((t) => t === 'Cancelar' || t === 'Confirmar'))).toEqual(['Cancelar', 'Confirmar'])
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()

    await page.setViewportSize({ width: 1024, height: 740 })
    const coluna = await caixa(page.locator('main > div').first())
    expect(coluna.width).toBeLessThanOrEqual(768)
    const largura = await page.evaluate(() => document.documentElement.clientWidth)
    expect(Math.abs(coluna.x - (largura - coluna.x - coluna.width))).toBeLessThanOrEqual(1)
  })
})

test.describe('Detalhe do chamado', () => {
  test('arranjo Detalhe do chamado', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await simularApi(page)
    await page.goto('/univag/chamados/ONE-123')
    await page.getByText('Resumo gerado por IA').waitFor()

    const titulo = await caixa(page.getByRole('heading', { level: 1 }))
    expect(titulo.x).toBeGreaterThanOrEqual(0)
    expect(titulo.x + titulo.width).toBeLessThanOrEqual(360)

    // <button> do main; o campo de arquivo (sr-only, papel button no Chromium) não é botão de ação
    const botoes = page.getByRole('main').locator('button')
    expect(await botoes.count()).toBeGreaterThan(0)
    for (const botao of await botoes.all()) {
      if (!(await botao.isVisible())) continue
      expect((await caixa(botao)).height, await botao.textContent() ?? '').toBeGreaterThanOrEqual(44 - 1)
    }

    // a fonte fica dentro do balão do assistente, abaixo do texto
    const balao = page.locator('.is-assistant').filter({ hasText: 'Como emitir a segunda via do boleto do semestre' })
    const b = await caixa(balao)
    const texto = await caixa(balao.getByText('O boleto fica em https://portal.univag.edu.br/financeiro/boletos/segunda-via', { exact: true }))
    const fonte = await caixa(balao.locator('div.border-t'))
    expect(fonte.y).toBeGreaterThanOrEqual(texto.y + texto.height - 1)
    expect(fonte.x).toBeGreaterThanOrEqual(b.x - 1)
    expect(fonte.x + fonte.width).toBeLessThanOrEqual(b.x + b.width + 1)
    expect(fonte.y + fonte.height).toBeLessThanOrEqual(b.y + b.height + 1)

    await page.setViewportSize({ width: 1024, height: 740 })
    expect((await caixa(page.locator('main > div').first())).width).toBeLessThanOrEqual(768)
  })
})

test.describe('listas de chamados', () => {
  test('arranjo listas de chamados', async ({ page }) => {
    await simularApi(page)
    for (const caminho of ['/univag/solicitacoes', '/univag/fila']) {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(caminho)
      const cartao = page.getByRole('main').getByRole('link').filter({ hasText: 'ONE-123' })
      await cartao.waitFor()
      const lista = await caixa(page.locator('main > div').first())
      const c = await caixa(cartao)
      expect(Math.abs(c.width - lista.width), caminho).toBeLessThanOrEqual(1)
      const numero = await caixa(cartao.getByText('ONE-123', { exact: true }))
      const selo = await caixa(cartao.locator('[data-slot=badge]'))
      expect(Math.abs(numero.y - selo.y), caminho).toBeLessThanOrEqual(4)
      const titulo = await caixa(cartao.getByText(/^Preciso da segunda via/))
      expect(titulo.y, caminho).toBeGreaterThanOrEqual(Math.max(numero.y + numero.height, selo.y + selo.height) - 1)

      await page.setViewportSize({ width: 1024, height: 740 })
      expect((await caixa(page.locator('main > div').first())).width, caminho).toBeLessThanOrEqual(768)
    }
  })
})
