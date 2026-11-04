import { expect, test, type Locator, type Page } from '@playwright/test'
import { comAparencia, semAparencia, simularApi } from './simulada'

// aparencia-instituicao S3, S4 e S6 medidos no Chromium com boundingBox() e getComputedStyle: px CSS, tolerância de 1 px (checks.md).
test.use({ serviceWorkers: 'block' })

const Cor = '#8a1538'
const caixa = async (l: Locator) => (await l.boundingBox())!
const perto = (a: number, b: number, rotulo: string) => expect(Math.abs(a - b), rotulo).toBeLessThanOrEqual(1)
const aparencia = (imagens: Record<string, number | null>) => ({ ...comAparencia, imagens: { logo: null, icone: null, login: null, assistente: null, ...imagens } })
const imagem = (page: Page, tipo: string) => page.locator(`img[src*="/imagens/${tipo}"]:visible`)

test.describe('S3 tela Aparência', () => {
  test('arranjo Aparência', async ({ page }) => {
    await simularApi(page, ['ADMINISTRADOR'], false, comAparencia)

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/univag/aparencia')
    await page.getByLabel('Cor principal').waitFor()
    const form = page.locator('main form')
    const previa = page.getByRole('region', { name: 'Prévia' })
    const [f, p] = [await caixa(form), await caixa(previa)]
    expect(f.x + f.width, 'formulário à esquerda da prévia').toBeLessThanOrEqual(p.x + 1)
    perto(f.y, p.y, 'mesmo top')
    expect(await previa.evaluate((e) => getComputedStyle(e).position)).toBe('sticky')
    await expect(page.getByRole('button', { name: 'Ocultar prévia' })).toBeHidden()

    // as seções na ordem, e "Salvar" depois delas
    const ys = async (ls: Locator[]) => Promise.all(ls.map(async (l) => (await caixa(l)).y))
    const ordem = await ys(['Marca', 'Login', 'Assistente', 'Contato'].map((t) => form.getByRole('heading', { name: t, exact: true })).concat(form.getByRole('button', { name: 'Salvar' })))
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b))

    await page.setViewportSize({ width: 390, height: 844 })
    const [fc, pc] = [await caixa(form), await caixa(previa)]
    expect(pc.y + pc.height, 'prévia acima do formulário').toBeLessThanOrEqual(fc.y + 1)
    const ocultar = page.getByRole('button', { name: 'Ocultar prévia' })
    await expect(ocultar).toBeVisible()
    await ocultar.click()
    await expect(page.getByRole('button', { name: 'Mostrar prévia' })).toBeVisible()
    expect((await caixa(previa)).height, 'prévia recolhida').toBeLessThan(pc.height / 2)
  })
})

test.describe('S4 marca da instituição', () => {
  // referências pintadas na própria página: o computado de cada tema tem de ser o mesmo da referência
  async function fundoDoBotao(page: Page, referencia: string) {
    return page.evaluate((ref) => {
      const el = document.createElement('div')
      el.style.backgroundColor = ref
      document.body.append(el)
      const esperado = getComputedStyle(el).backgroundColor
      el.remove()
      const botao = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Entrar')!
      return [getComputedStyle(botao).backgroundColor, esperado]
    }, referencia)
  }

  test('cor da instituição nos três temas', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 })
    const casos: [string, object, string][] = [
      ['light', comAparencia, Cor],
      ['dark', comAparencia, `color-mix(in oklch, ${Cor} 55%, white)`],
      ['black', comAparencia, `color-mix(in oklch, ${Cor} 55%, white)`],
      ['light', semAparencia, 'oklch(0.45 0.15 262)'],
      ['dark', semAparencia, 'oklch(0.72 0.12 262)'],
    ]
    for (const [tema, dados, referencia] of casos) {
      await page.addInitScript((t) => localStorage.setItem('one-tema', t), tema)
      await simularApi(page, undefined, false, dados)
      await page.goto('/univag')
      await page.getByRole('button', { name: 'Entrar' }).waitFor()
      const [fundo, esperado] = await fundoDoBotao(page, referencia)
      expect(fundo, `${tema} ${dados === comAparencia ? 'com cor' : 'sem cor'}`).toBe(esperado)
      await page.unrouteAll()
    }
  })

  test('logo até 40 px no login', async ({ page }) => {
    await simularApi(page, undefined, false, aparencia({ logo: 3 }))
    for (const largura of [1440, 390]) {
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/univag')
      const logo = imagem(page, 'logo').first()
      await logo.waitFor()
      expect((await caixa(logo)).height, `${largura} px`).toBeLessThanOrEqual(41)
      await expect(logo).toHaveAttribute('alt', 'Centro Universitário de Várzea Grande')
    }
  })

  test('imagem do login no painel e na faixa', async ({ page }) => {
    await simularApi(page, undefined, false, aparencia({ logo: 3, login: 1 }))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/univag')
    const foto = imagem(page, 'login')
    await foto.waitFor()
    const painel = foto.locator('xpath=..')
    const [fb, pb] = [await caixa(foto), await caixa(painel)]
    for (const lado of ['x', 'y', 'width', 'height'] as const) perto(fb[lado], pb[lado], `painel ${lado}`)
    expect(await foto.evaluate((e) => getComputedStyle(e).objectFit)).toBe('cover')
    await expect(foto).toHaveAttribute('alt', '')
    for (const texto of ['Fale com a Univag', 'Aqui você resolve tudo sobre a sua vida acadêmica.', 'Boletos', 'Matrícula', 'Documentos']) {
      const alvo = painel.getByText(texto, { exact: true })
      await expect(alvo).toBeVisible()
      const t = await caixa(alvo)
      expect(t.y).toBeGreaterThanOrEqual(pb.y - 1)
      expect(t.y + t.height).toBeLessThanOrEqual(pb.y + pb.height + 1)
    }

    await page.setViewportSize({ width: 390, height: 844 })
    const faixa = imagem(page, 'login').locator('xpath=..')
    perto((await caixa(faixa)).height, 128, 'faixa de 128 px')
    const [fx, titulo, logo] = [await caixa(faixa), await caixa(page.locator('h1')), await caixa(faixa.locator('img[src*="/imagens/logo"]'))]
    expect(fx.y + fx.height, 'faixa acima do h1').toBeLessThanOrEqual(titulo.y + 1)
    expect(logo.x).toBeGreaterThanOrEqual(fx.x - 1)
    expect(logo.y).toBeGreaterThanOrEqual(fx.y - 1)
    expect(logo.x + logo.width).toBeLessThanOrEqual(fx.x + fx.width + 1)
    expect(logo.y + logo.height).toBeLessThanOrEqual(fx.y + fx.height + 1)
  })
})

test.describe('S6 ilustrações', () => {
  test('ilustração no login sem imagem', async ({ page }) => {
    await simularApi(page, undefined, false, semAparencia)
    for (const [largura, pai] of [[1440, 'lg:flex'], [390, 'lg:hidden']] as const) {
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/univag')
      const desenho = page.locator('svg[data-ilustracao="boas-vindas"]:visible')
      await desenho.first().waitFor()
      expect(await desenho.count(), `${largura} px`).toBe(1)
      await expect(desenho.locator(`xpath=ancestor::div[contains(@class, "${pai}")]`).first()).toBeVisible()
    }
  })
})

// S9: arranjos de ## Screens (C65 a C69)
const noIcone = (page: Page) => page.addInitScript(() => localStorage.setItem('one-barra', 'recolhida'))

test.describe('S9 arranjos das telas', () => {
  test('sugestões centralizadas em 1 e 2 colunas', async ({ page }) => {
    await simularApi(page, undefined, false, comAparencia)
    for (const [largura, colunas] of [[390, 1], [1440, 2]] as const) {
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/univag/assistente')
      const botoes = comAparencia.assistente.perguntas.map((p) => page.getByRole('button', { name: p, exact: true }))
      const caixas = await Promise.all(botoes.map(caixa))
      expect(new Set(caixas.map((c) => Math.round(c.x))).size, `${largura} px: colunas`).toBe(colunas)
      if (colunas === 1) caixas.slice(1).forEach((c, i) => expect(c.y, `${largura} px: top crescente`).toBeGreaterThan(caixas[i].y))
      else expect(new Set(caixas.map((c) => Math.round(c.y))).size, `${largura} px: linhas`).toBe(2)
      for (const c of caixas.slice(1)) if (colunas === 1) perto(c.x, caixas[0].x, `${largura} px: mesmo left`)
      const bloco = await caixa(page.getByRole('heading', { name: 'Olá! Eu sou Vagner.' }).locator('xpath=..'))
      const area = await caixa(page.getByRole('main'))
      perto(bloco.x + bloco.width / 2, area.x + area.width / 2, `${largura} px: centro do bloco`)
    }
  })

  test('textos do login na base sobre a faixa', async ({ page }) => {
    await simularApi(page, undefined, false, aparencia({ logo: 3, login: 1 }))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/univag')
    const foto = imagem(page, 'login')
    await foto.waitFor()
    const painel = foto.locator('xpath=..')
    const [p, bloco] = [await caixa(painel), await caixa(painel.getByRole('heading', { name: 'Fale com a Univag' }).locator('xpath=..'))]
    expect(p.y + p.height - (bloco.y + bloco.height), 'base do bloco a até 48 px da base do painel').toBeLessThanOrEqual(48)
    const faixas = await painel.locator('*').evaluateAll((els) =>
      els.filter((e) => getComputedStyle(e).backgroundImage.includes('linear-gradient')).map((e) => e.getBoundingClientRect().toJSON()),
    )
    expect(faixas.some((f) => f.left <= bloco.x + 1 && f.top <= bloco.y + 1 && f.right >= bloco.x + bloco.width - 1 && f.bottom >= bloco.y + bloco.height - 1), 'faixa com gradiente cobre o bloco').toBe(true)
  })

  test('foto do assistente à esquerda do balão', async ({ page }) => {
    await simularApi(page, undefined, false, comAparencia)
    for (const largura of [390, 1440]) {
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/univag/assistente')
      await page.getByLabel('Mensagem').fill('preciso do boleto do semestre, onde encontro a segunda via?')
      await page.getByRole('button', { name: /Enviar/ }).click()
      await page.getByText('Isso resolveu?').waitFor()
      const baloes = page.locator('.is-assistant')
      expect(await baloes.count(), `${largura} px: balões do assistente`).toBeGreaterThan(0)
      for (const balao of await baloes.all()) {
        const foto = await caixa(balao.locator('xpath=preceding-sibling::img[1]'))
        const b = await caixa(balao)
        expect(foto.x + foto.width, `${largura} px: foto à esquerda`).toBeLessThanOrEqual(b.x + 1)
        expect(foto.y < b.y + b.height && foto.y + foto.height > b.y, `${largura} px: sobreposição vertical`).toBe(true)
      }
    }
  })

  test('contato abaixo do número do chamado', async ({ page }) => {
    await simularApi(page, undefined, false, comAparencia)
    await page.route('**/api/atendimento-direto', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ numero: 'ONE-123', estado: 'ABERTO', setor: 'Secretaria' }) }))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/univag/assistente')
    await page.getByLabel('Mensagem').fill('quero falar com alguém sobre o meu boleto')
    await page.getByRole('button', { name: 'Falar com atendente' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
    const numero = await caixa(page.getByText(/Protocolo ONE-123/))
    const contato = await caixa(page.getByRole('heading', { name: 'Contato do atendimento' }))
    expect(contato.y, 'bloco de contato abaixo do número').toBeGreaterThan(numero.y + numero.height)
  })

  test('ícone de 32 e 24 px antes do título', async ({ page }) => {
    await noIcone(page)
    await simularApi(page, undefined, false, aparencia({ icone: 2 }))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/univag/fila')
    const barra = imagem(page, 'icone')
    await barra.waitFor()
    const b = await caixa(barra)
    perto(b.width, 32, 'barra recolhida: largura')
    perto(b.height, 32, 'barra recolhida: altura')

    await page.unrouteAll()
    await page.setViewportSize({ width: 390, height: 844 })
    for (const [rotulo, aparenciaDaCasca] of [['com ícone', aparencia({ icone: 2 })], ['sem ícone', aparencia({})]] as const) {
      await simularApi(page, undefined, false, aparenciaDaCasca)
      await page.goto('/univag/fila')
      const titulo = page.locator('header h1')
      await titulo.waitFor()
      const marca = page.locator('header').locator(rotulo === 'com ícone' ? 'img[src*="/imagens/icone"]' : 'span.bg-primary')
      const [m, t] = [await caixa(marca), await caixa(titulo)]
      perto(m.width, 24, `${rotulo}: largura`)
      perto(m.height, 24, `${rotulo}: altura`)
      expect(m.x + m.width, `${rotulo}: antes do título`).toBeLessThanOrEqual(t.x + 1)
      expect(Math.abs(m.y + m.height / 2 - (t.y + t.height / 2)), `${rotulo}: centro vertical`).toBeLessThanOrEqual(2)
      await page.unrouteAll()
    }
  })
})
