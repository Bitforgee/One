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

    // abaixo de 1024 px (AC 37): o formulário vem primeiro, e a prévia só abre pelo "Ver prévia", numa folha
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(previa).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ver prévia' })).toBeVisible()
    await page.getByRole('button', { name: 'Ver prévia' }).click()
    const folha = page.getByRole('dialog', { name: 'Prévia' })
    await expect(folha.getByRole('button', { name: 'Entrar' })).toBeVisible()
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

  test('logo até 48 px no login', async ({ page }) => {
    await simularApi(page, undefined, false, aparencia({ logo: 3 }))
    for (const largura of [1440, 390]) {
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/univag')
      const logo = imagem(page, 'logo').first()
      await logo.waitFor()
      expect((await caixa(logo)).height, `${largura} px`).toBeLessThanOrEqual(49)
      await expect(logo).toHaveAttribute('alt', 'Centro Universitário de Várzea Grande')
    }
  })

  test('imagem do login na coluna direita e na faixa', async ({ page }) => {
    await simularApi(page, undefined, false, aparencia({ logo: 3, login: 1 }))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/univag')
    const foto = imagem(page, 'login')
    await foto.waitFor()
    await expect(foto).toHaveCount(1)
    const fb = await caixa(foto)
    perto(fb.x, 720, 'coluna direita x')
    perto(fb.width, 720, 'coluna direita largura')
    expect(await foto.evaluate((e) => getComputedStyle(e).objectFit)).toBe('cover')
    await expect(foto).toHaveAttribute('alt', '')
    // os textos ficam na coluna do formulário, nunca sobre a foto
    for (const texto of ['Fale com a Univag', 'Aqui você resolve tudo sobre a sua vida acadêmica.', 'Boletos', 'Matrícula', 'Documentos']) {
      const alvo = page.getByText(texto, { exact: true })
      await expect(alvo).toBeVisible()
      const t = await caixa(alvo)
      expect(t.x + t.width, texto).toBeLessThanOrEqual(fb.x + 1)
    }

    await page.setViewportSize({ width: 390, height: 844 })
    const faixa = imagem(page, 'login')
    await expect(faixa).toHaveCount(1)
    const [fx, titulo, logo] = [await caixa(faixa), await caixa(page.locator('h1')), await caixa(imagem(page, 'logo').first())]
    perto(fx.height, 160, 'faixa de 160 px')
    expect(fx.y + fx.height, 'faixa acima do h1').toBeLessThanOrEqual(titulo.y + 1)
    expect(fx.y + fx.height, 'faixa acima do logo').toBeLessThanOrEqual(logo.y + 1)
  })
})

// S9: arranjos de ## Screens (C65 a C69)
const noIcone = (page: Page) => page.addInitScript(() => localStorage.setItem('one-barra', 'recolhida'))

test.describe('S9 arranjos das telas', () => {
  test('sugestões centralizadas em 1 e 2 colunas', async ({ page }) => {
    // C65: com a foto e sem ela (a ilustração Conversa no lugar)
    for (const dados of [comAparencia, aparencia({ assistente: null })]) {
      await simularApi(page, undefined, false, dados)
      for (const [largura, colunas] of [[390, 1], [1440, 2]] as const) {
        await page.setViewportSize({ width: largura, height: 900 })
        await page.goto('/univag/assistente')
        const botoes = comAparencia.assistente.perguntas.map((p) => page.getByRole('button', { name: p, exact: true }))
        const caixas = await Promise.all(botoes.map(caixa))
        expect(new Set(caixas.map((c) => Math.round(c.x))).size, `${largura} px: colunas`).toBe(colunas)
        if (colunas === 1) caixas.slice(1).forEach((c, i) => expect(c.y, `${largura} px: top crescente`).toBeGreaterThan(caixas[i].y))
        else expect(new Set(caixas.map((c) => Math.round(c.y))).size, `${largura} px: linhas`).toBe(2)
        for (const c of caixas.slice(1)) if (colunas === 1) perto(c.x, caixas[0].x, `${largura} px: mesmo left`)
        const area = await caixa(page.getByRole('main'))
        const foto = page.locator('section:has(h2) > img, section:has(h2) > svg').first()
        // os textos são medidos pelo texto (o <h2> e o <p> de largura total sempre caem no centro)
        const texto = (l: Locator) => l.evaluate((e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().toJSON() })
        const medidas = [
          ['foto', await caixa(foto)],
          ['título', await texto(page.getByRole('heading', { name: 'Olá! Eu sou Vagner.' }))],
          ['texto de boas-vindas', await texto(page.getByText(comAparencia.assistente.boasVindas, { exact: true }))],
          ['grade', await caixa(botoes[0].locator('xpath=..'))],
        ] as const
        for (const [nome, c] of medidas)
          perto(c.x + c.width / 2, area.x + area.width / 2, `${largura} px, ${dados.imagens.assistente ? 'com' : 'sem'} foto: centro de ${nome}`)
      }
    }
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
    const numero = await caixa(page.getByText(/Sua solicitação ONE-123 foi para/))
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
