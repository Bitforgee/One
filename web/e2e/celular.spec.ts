import { expect, test, type Locator, type Page } from '@playwright/test'
import { buttonVariants } from '../src/ui/button'
import { chamadoSimulado, simularApi, Telas } from './simulada'

// Arranjo do celular medido com boundingBox() e getComputedStyle: px CSS, tolerância de 1 px (checks.md).
test.use({ serviceWorkers: 'block' })

const caixa = async (l: Locator) => (await l.boundingBox())!
async function abrirTela(page: Page, nome: string) {
  const [, caminho, esperar] = Telas.find(([n]) => n === nome)!
  await page.goto(caminho)
  await esperar(page)
}
const altura = async (l: Locator) => (await caixa(l.first())).height
const Listas = ['Fila', 'Minhas solicitações', 'Artigos', 'Documentos', 'Usuários', 'Cadastros']

test.describe('S1 celular', () => {
  test('alerta sem ícone em uma linha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page)
    await abrirTela(page, 'Matrículas')
    const alerta = page.locator('[data-slot=alert]', { hasText: 'Há erros no arquivo.' })
    const medidas = await alerta.evaluate((a) => {
      const estilo = getComputedStyle(a)
      const texto = document.createRange()
      texto.selectNodeContents(a)
      const conteudo = a.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight)
      return { altura: texto.getBoundingClientRect().height, linha: parseFloat(estilo.lineHeight), coluna: parseFloat(estilo.gridTemplateColumns), conteudo }
    })
    expect(medidas.altura).toBeLessThanOrEqual(medidas.linha * 1.5)
    expect(Math.abs(medidas.coluna - medidas.conteudo)).toBeLessThanOrEqual(1)
  })

  test('alvos de toque de 44 px abaixo de 768', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page)
    // Button, os 8 tamanhos de ui/button.tsx: em tela real quando algum uso existe, senão num botão de teste com as classes de buttonVariants
    const nomes = ['default', 'sm', 'lg', 'xs', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const
    const medidos: Record<string, number> = {}
    await abrirTela(page, 'Artigos')
    medidos.default = await altura(page.getByRole('button', { name: 'Novo' }))
    await abrirTela(page, 'Assistente')
    medidos.icon = await altura(page.getByRole('button', { name: 'Enviar' }))
    medidos.sm = await altura(page.locator('[data-slot=button][data-size=sm]'))
    medidos['icon-sm'] = await altura(page.getByRole('button', { name: 'Anexar arquivo' }))
    await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('x') })
    medidos['icon-xs'] = await altura(page.getByRole('button', { name: 'Remover foto.png' }))
    // lg não tem uso em tela (o lg da casca é SidebarMenuButton, não Button); falta só ele, e vai pelo botão de teste
    for (const tamanho of nomes.filter((n) => !(n in medidos))) {
      await page.evaluate(([id, classe]) => document.body.insertAdjacentHTML('beforeend', `<button id="${id}" class="${classe}">x</button>`), [`t-${tamanho}`, buttonVariants({ size: tamanho })])
      medidos[tamanho] = await altura(page.locator(`#t-${tamanho}`))
    }
    for (const tamanho of nomes) expect(medidos[tamanho], `Button ${tamanho}`).toBeGreaterThanOrEqual(44)
    await abrirTela(page, 'Login')
    expect(await altura(page.getByLabel('CPF'))).toBeGreaterThanOrEqual(44)
    await abrirTela(page, 'Cadastros')
    expect(await altura(page.getByLabel('Cadastro'))).toBeGreaterThanOrEqual(44)
    await abrirTela(page, 'Usuários')
    expect(await altura(page.getByRole('button', { name: /^Ações de/ }))).toBeGreaterThanOrEqual(44)
    await page.setViewportSize({ width: 1024, height: 800 })
    await abrirTela(page, 'Artigos')
    expect(await altura(page.getByRole('button', { name: 'Novo' }))).toBe(36)
  })

  test('Indicadores sem texto cortado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page, undefined, true)
    await abrirTela(page, 'Indicadores')
    await page.locator('.recharts-yAxis-tick-labels text').first().waitFor()
    const { varridos, cortados } = await page.evaluate(() => {
      const todos = [...document.querySelectorAll('[class*="container/main"] *')] // o conteúdo da tela: a barra do topo, que fica dentro do main, tem o título com truncate
      return {
        varridos: todos.length,
        cortados: todos
          .filter((e) => getComputedStyle(e).textOverflow === 'ellipsis' || (!(e instanceof SVGElement) && e.clientWidth > 0 && e.scrollWidth > e.clientWidth))
          .map((e) => e.outerHTML.slice(0, 80)),
      }
    })
    expect(varridos, 'elementos varridos').toBeGreaterThan(0)
    expect(cortados).toEqual([])
    // frase de destaque inteira; rótulo de 40 caracteres em até 2 linhas
    await expect(page.getByText('Resolvidas sem reabertura, sobre as conversas com desfecho')).toBeVisible()
    const rotulo = page.locator('.recharts-yAxis-tick-labels text', { hasText: 'Financeiro' })
    expect((await rotulo.textContent())!.replace(/\s/g, '')).toBe('Financeiro>Boletosemensalidades2026')
    expect(await rotulo.locator('tspan').count()).toBeLessThanOrEqual(2)
  })

  test('Cadastros seletor e Novo na mesma linha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page)
    await abrirTela(page, 'Cadastros')
    const seletor = await caixa(page.getByLabel('Cadastro'))
    const novo = await caixa(page.getByRole('button', { name: 'Novo' }))
    expect(Math.abs(seletor.y - novo.y)).toBeLessThanOrEqual(1)
  })
})

test.describe('S2 celular', () => {
  test('listas viram cartões abaixo de 768', async ({ page }) => {
    await simularApi(page)
    for (const nome of Listas) {
      await page.setViewportSize({ width: 390, height: 844 })
      await abrirTela(page, nome)
      const principal = page.getByRole('main')
      expect(await principal.locator('table:visible').count(), nome).toBe(0)
      const cartoes = principal.getByRole('listitem')
      expect(await cartoes.count(), nome).toBeGreaterThan(0)
      if (nome === 'Fila' || nome === 'Minhas solicitações') {
        // C29: linhas densas; 1 selo por linha antes de medir (L-069): sem selo o teste falha, não pula
        expect(await cartoes.locator('[data-slot=badge]').count(), `${nome}: 1 selo por linha`).toBe(await cartoes.count())
        const s = await caixa(cartoes.first().locator('[data-slot=badge]'))
        const assunto = await caixa(cartoes.first().getByRole('link'))
        expect(s.y, `${nome}: selo abaixo do assunto`).toBeGreaterThanOrEqual(assunto.y + assunto.height - 1)
      }
      await page.setViewportSize({ width: 1024, height: 800 })
      await abrirTela(page, nome)
      expect(await page.getByRole('main').locator('table:visible').count(), `${nome} a 1024`).toBeGreaterThan(0)
    }
  })

  test('Ações do chamado no rodapé abaixo de 1024', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 1024, height: 800 })
    await abrirTela(page, 'Detalhe do chamado')
    expect(await page.getByRole('button', { name: 'Mais', exact: true }).count()).toBe(0)
    const nomesNoCartao = await page.locator('[data-slot=card]', { has: page.getByText('Ações', { exact: true }) }).getByRole('button').allInnerTexts()
    expect(nomesNoCartao.length).toBeGreaterThan(0)
    for (const largura of [390, 1023]) {
      await page.setViewportSize({ width: largura, height: 800 })
      await abrirTela(page, 'Detalhe do chamado')
      // a barra fixa tem a ação principal ("Responder") e "Mais" (AC 24)
      const botao = page.getByRole('button', { name: 'Mais', exact: true })
      const estilo = await botao.evaluate((b) => ({ posicao: getComputedStyle(b.parentElement!).position, fundo: getComputedStyle(b.parentElement!).bottom }))
      expect(estilo, `${largura} px`).toEqual({ posicao: 'fixed', fundo: '0px' })
      expect(await altura(botao)).toBeGreaterThanOrEqual(44)
      await botao.click()
      const folha = page.getByRole('dialog')
      await expect(folha).toBeVisible()
      const f = await caixa(folha)
      expect(f.y + f.height, 'vem de baixo').toBeCloseTo(800, 0)
      expect((await folha.getByRole('button').allInnerTexts()).filter((t) => t !== 'Fechar' && t !== ''), `${largura} px`).toEqual(nomesNoCartao)
    }
  })

  test('ação no Sheet fecha e atualiza', async ({ page }) => {
    await simularApi(page)
    let resolvido = false
    const json = (estado: string) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(chamadoSimulado(estado)) })
    await page.route('**/api/chamados/ONE-123', (rota) => rota.fulfill(json(resolvido ? 'RESOLVIDO' : 'ABERTO')))
    await page.route('**/api/chamados/ONE-123/resolver', (rota) => {
      resolvido = true
      return rota.fulfill(json('RESOLVIDO'))
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await abrirTela(page, 'Detalhe do chamado')
    const selo = page.getByRole('main').locator('[data-slot=badge]').first()
    await expect(selo).toHaveText('Aberto')
    await page.getByRole('button', { name: 'Mais', exact: true }).click()
    await page.getByRole('dialog').getByLabel('Resolução').fill('Boleto reemitido.')
    await page.getByRole('dialog').getByRole('button', { name: 'Resolver' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(selo).toHaveText('Resolvido')
  })

  test('sem rolagem horizontal a 360', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await simularApi(page, undefined, true)
    for (const nome of [...Listas, 'Detalhe do chamado']) {
      await abrirTela(page, nome)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), nome).toBeLessThanOrEqual(360)
    }
  })
})
