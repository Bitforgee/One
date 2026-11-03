import { expect, test, type Locator, type Page } from '@playwright/test'
import { simularApi } from './simulada'

// Arranjo de ## Screens medido com boundingBox() (regra do arranjo de checks.md): px CSS, tolerância de 1 px.
test.use({ serviceWorkers: 'block' })

// barra-lateral-grupos: na ordem dos grupos (Atendimento, Conhecimento, Administração)
const Links = ['Assistente', 'Minhas solicitações', 'Fila', 'Indicadores', 'Artigos', 'Documentos', 'Usuários', 'Matrículas', 'Cadastros']
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

  // Os itens visíveis da barra (marca, instituição, links e botões) não se sobrepõem; os filhos dos <div> entram no lugar deles.
  async function semSobreposicao(nav: Locator, onde: string) {
    const itens = await nav.evaluate((n) => {
      const abrir = (e: Element): Element[] => (e.tagName === 'DIV' ? [...e.children].flatMap(abrir) : [e])
      return abrir(n.firstElementChild!).map((e) => ({ texto: e.textContent || e.getAttribute('aria-label'), ...e.getBoundingClientRect().toJSON() })).filter((c) => c.width > 0)
    })
    expect(itens.length, onde).toBeGreaterThanOrEqual(4)
    const sobrepoe = (a: (typeof itens)[number], b: typeof a) => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5
    for (let i = 0; i < itens.length; i++)
      for (let j = i + 1; j < itens.length; j++) expect(sobrepoe(itens[i], itens[j]), `${onde}: "${itens[i].texto}" x "${itens[j].texto}"`).toBe(false)
  }

  // redesign-institucional (AD-027, door 3a): a partir de 1024 px o mesmo <nav> é a barra lateral de 240 px, sem "Mais"
  for (const [largura, altura] of [[1024, 740], [1280, 800], [1536, 800], [1920, 800]]) {
    test(`barra lateral a ${largura} px`, async ({ page }) => {
      await simularApi(page)
      await page.setViewportSize({ width: largura, height: altura })
      await page.goto('/univag/chamados/ONE-123')
      await page.getByText('Resumo gerado por IA').waitFor()
      const nav = page.getByRole('navigation')
      const barra = await caixa(nav)
      expect(Math.abs(barra.x), 'C8 à esquerda').toBeLessThanOrEqual(1)
      expect(Math.abs(barra.width - 240), 'C8 largura').toBeLessThanOrEqual(1)
      expect(Math.abs(barra.height - altura), 'C8/C9 altura da janela, não 56 px').toBeLessThanOrEqual(1)
      // ## Screens linha 0: borda à direita e fundo --sidebar
      expect(await nav.evaluate((e) => getComputedStyle(e).borderRightWidth), 'borda à direita').toBe('1px')
      const [fundoBarra, fundoSidebar] = await nav.evaluate((e) => {
          const amostra = document.createElement('div')
          amostra.style.background = 'var(--sidebar)'
          document.body.append(amostra)
          const cor = getComputedStyle(amostra).backgroundColor
          amostra.remove()
          return [getComputedStyle(e).backgroundColor, cor]
        })
      expect(fundoBarra, 'fundo --sidebar').toBe(fundoSidebar)
      expect(fundoBarra, 'o --sidebar não é o fundo da página').not.toBe(await page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      // marca e instituição no topo; o nome inteiro, em até 2 linhas, sem reticências (decisão do usuário de 03/11)
      const marca = await caixa(nav.getByText('One', { exact: true }))
      const nome = nav.getByTestId('instituicao')
      const caixaNome = await caixa(nome)
      expect(caixaNome.width, 'instituição visível').toBeGreaterThan(0)
      expect(marca.y + marca.height, 'marca acima da instituição').toBeLessThanOrEqual(caixaNome.y + 1)
      expect(await nome.evaluate((e) => e.scrollWidth <= e.clientWidth), 'instituição sem corte na largura').toBe(true)
      const linhas = await nome.evaluate((e) => {
        const c = getComputedStyle(e)
        return Math.round((e.clientHeight - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom)) / parseFloat(c.lineHeight))
      })
      expect(linhas, 'instituição em até 2 linhas').toBeLessThanOrEqual(2)
      expect(await nome.evaluate((e) => getComputedStyle(e).whiteSpace), 'quebra em vez de reticências').toBe('normal')
      let fundoDoUltimo = 0
      let anterior: { x: number; y: number; height: number } | null = null
      for (const rotulo of Links) {
        const link = nav.getByRole('link', { name: rotulo })
        await expect(link, `C8 ${rotulo}`).toBeVisible()
        await expect(link.locator('svg'), `C8 ícone de ${rotulo}`).toBeVisible()
        expect(await link.locator('span').evaluate((e) => e.getBoundingClientRect().width), `C8 rótulo de ${rotulo}`).toBeGreaterThan(10)
        const c = await caixa(link)
        expect(c.x + c.width, `C8 ${rotulo} dentro da barra`).toBeLessThanOrEqual(241)
        expect(Math.abs(c.height - 36), `${rotulo}: linha de 36 px`).toBeLessThanOrEqual(1)
        expect(c.y, `${rotulo} abaixo da instituição`).toBeGreaterThanOrEqual(caixaNome.y + caixaNome.height - 1)
        if (anterior) {
          expect(Math.abs(c.x - anterior.x), `${rotulo}: mesma coluna`).toBeLessThanOrEqual(1)
          expect(c.y, `${rotulo}: um por linha`).toBeGreaterThanOrEqual(anterior.y + anterior.height - 1)
        }
        anterior = c
        fundoDoUltimo = Math.max(fundoDoUltimo, c.y + c.height)
      }
      for (const nome of ['Tema', 'Sair']) {
        const botao = nav.getByRole('button', { name: nome })
        await expect(botao, nome).toBeVisible()
        expect((await caixa(botao)).y, `${nome} depois dos links`).toBeGreaterThanOrEqual(fundoDoUltimo - 1)
      }
      await expect(page.getByRole('button', { name: 'Menu' }), 'C9 sem Menu').toBeHidden()
      expect((await caixa(page.locator('main'))).x, 'C9 conteúdo à direita da barra').toBeGreaterThanOrEqual(barra.x + barra.width - 0.5)
      await expect(page.getByText('Mais', { exact: true }), 'C11').toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), 'sem rolagem horizontal').toBeLessThanOrEqual(largura)

      await semSobreposicao(nav, `${largura} px`)

      await page.evaluate(() => window.scrollTo(0, 300))
      expect(await page.evaluate(() => window.scrollY), 'C13 a página rolou').toBe(300)
      expect(Math.abs((await caixa(nav)).y), 'C13 barra fixa no topo').toBeLessThanOrEqual(1)

      // link ativo em bg-primary-subtle e font-medium (## Screens linha 0)
      await page.goto('/univag/fila')
      const fila = nav.getByRole('link', { name: 'Fila' })
      await expect(fila).toHaveAttribute('aria-current', 'page')
      expect(await fila.evaluate((e) => getComputedStyle(e).fontWeight), 'ativo em font-medium').toBe('500')
      expect(await nav.getByRole('link', { name: 'Artigos' }).evaluate((e) => getComputedStyle(e).fontWeight), 'inativo').toBe('400')
    })
  }

  for (const largura of [360, 768, 1023]) {
    test(`abaixo de 1024 px sem barra lateral (${largura} px)`, async ({ page }) => {
      await simularApi(page)
      await page.addInitScript(() => localStorage.setItem('one-barra', 'recolhida')) // C16: a preferência não vale aqui
      await page.setViewportSize({ width: largura, height: 740 })
      await page.goto('/univag/fila')
      const nav = page.getByRole('navigation')
      await expect(nav.getByTestId('instituicao')).toBeVisible()
      const barra = await caixa(nav)
      expect(Math.abs(barra.width - largura), 'C10 largura da janela').toBeLessThanOrEqual(1)
      expect(Math.abs(barra.height - 56), 'C10 56 px').toBeLessThanOrEqual(1)
      expect((await caixa(nav.getByTestId('instituicao'))).width, 'nome da instituição').toBeGreaterThan(0)
      // ## Screens linha 0: na barra de topo o nome continua truncado (nota de 03/11)
      expect(await nav.getByTestId('instituicao').evaluate((e) => [getComputedStyle(e).whiteSpace, getComputedStyle(e).textOverflow]), 'truncado').toEqual(['nowrap', 'ellipsis'])
      await semSobreposicao(nav, `${largura} px`)
      for (const rotulo of Links) await expect(nav.getByRole('link', { name: rotulo }), `C10 ${rotulo} só na gaveta`).toBeHidden()
      await expect(page.getByText('Mais', { exact: true }), 'C11').toHaveCount(0)
      await expect(nav.getByText('Ana', { exact: true }), 'barra-lateral-grupos C9: sem nome na barra de topo').toBeHidden()
      for (const nome of ['Recolher barra lateral', 'Expandir barra lateral']) await expect(nav.getByRole('button', { name: nome }), `C16 ${nome}`).toBeHidden()
      await nav.getByRole('button', { name: 'Menu' }).click()
      const gaveta = page.getByRole('dialog', { name: 'Menu' })
      await gaveta.waitFor()
      expect(await gaveta.locator('a, button').allTextContents(), 'C10 gaveta como antes').toEqual([...Links, 'Sair'])
    })
  }

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
    // redesign-institucional (door 3a): a barra lateral ocupa a esquerda; a coluna centraliza no espaço à direita dela
    const inicio = (await caixa(page.getByRole('navigation'))).width
    expect(Math.abs(coluna.x - inicio - (largura - coluna.x - coluna.width))).toBeLessThanOrEqual(1)
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

test.describe('Indicadores', () => {
  const Cartoes = ['Indicador principal', 'Alunos ativos', 'Conversas', 'Autoatendimento', 'Escalonamento', 'Abandono', 'Perguntas sem artigo',
    'Chamados abertos agora', 'Chamados resolvidos', 'Tempo até a 1ª resposta', 'Tempo de resolução', 'Roteamento correto', 'Reabertura']
  const mesmaLinha = (a: { y: number }, b: { y: number }) => Math.abs(a.y - b.y) <= 4

  test('indicadores em 2 e 4 colunas', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag/indicadores')
    await page.getByText('Indicador principal').waitFor()
    const cartao = (rotulo: string) => page.getByRole('main').getByText(rotulo, { exact: true }).locator('xpath=..')
    for (const [largura, colunas] of [[360, 2], [767, 2], [768, 4], [1024, 4]]) {
      await page.setViewportSize({ width: largura, height: 740 })
      const caixas = []
      for (const rotulo of Cartoes) caixas.push(await caixa(cartao(rotulo)))
      const xs = new Set(caixas.map((c) => Math.round(c.x)))
      expect(xs.size, `${largura} px`).toBe(colunas)
      // colunas de largura igual: um col-span no primeiro cartão cria uma trilha implícita que mantém a contagem de x (L-030)
      const larguras = caixas.slice(1).map((c) => c.width)
      expect(Math.max(...larguras) - Math.min(...larguras), `${largura} px: larguras ${larguras.map(Math.round)}`).toBeLessThanOrEqual(1)
      // "Indicador principal" vem primeiro e ocupa 2 colunas
      expect(Math.round(caixas[0].x)).toBe(Math.min(...xs))
      expect(caixas[0].y).toBeLessThanOrEqual(Math.min(...caixas.map((c) => c.y)))
      const segunda = caixas.find((c) => Math.round(c.x) === [...xs].sort((p, q) => p - q)[1])!
      expect(Math.abs(caixas[0].x + caixas[0].width - (segunda.x + segunda.width)), `${largura} px`).toBeLessThanOrEqual(1)

      const conversas = await caixa(page.locator('[data-slot=card]').filter({ hasText: 'Categorias por conversas' }))
      const chamados = await caixa(page.locator('[data-slot=card]').filter({ hasText: 'Categorias por chamados' }))
      if (colunas === 2) expect(chamados.y, `${largura} px`).toBeGreaterThanOrEqual(conversas.y + conversas.height - 1)
      else expect(mesmaLinha(conversas, chamados), `${largura} px`).toBe(true)
    }
  })

  test('arranjo Indicadores', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag/indicadores')
    await page.getByText('Indicador principal').waitFor()
    const campos = async () => ({
      de: await caixa(page.getByLabel('De')),
      ate: await caixa(page.getByLabel('Até')),
      calendario: await caixa(page.getByRole('button', { name: 'Escolher período no calendário' })),
      consultar: await caixa(page.getByRole('button', { name: 'Consultar' })),
    })
    let c = await campos()
    expect(mesmaLinha(c.de, c.ate)).toBe(true)
    expect(mesmaLinha(c.calendario, c.consultar)).toBe(true)
    expect(c.calendario.y).toBeGreaterThanOrEqual(c.de.y + c.de.height - 1)

    for (const titulo of ['Categorias por conversas', 'Categorias por chamados']) {
      const ranking = page.locator('[data-slot=card]').filter({ hasText: titulo })
      const grafico = ranking.locator('.recharts-responsive-container')
      await grafico.waitFor()
      const g = await caixa(grafico)
      expect(g.height).toBeGreaterThan(0)
      expect((await caixa(ranking.getByRole('table'))).y).toBeGreaterThanOrEqual(g.y + g.height - 1)
    }

    await page.setViewportSize({ width: 1024, height: 740 })
    c = await campos()
    for (const outro of [c.ate, c.calendario, c.consultar]) expect(mesmaLinha(c.de, outro), JSON.stringify(c)).toBe(true)
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

test.describe('acesso', () => {
  // C66 (## Screens linhas 1 a 5)
  test('arranjo telas de acesso', async ({ page }) => {
    await simularApi(page)
    const largura = () => page.evaluate(() => document.documentElement.clientWidth)

    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    const aviso = page.getByText('Abra o endereço da sua instituição')
    await aviso.waitFor()
    expect(await aviso.evaluate((e) => getComputedStyle(e).textAlign), 'raiz').toBe('center')

    for (const caminho of ['/univag', '/univag/primeiro-acesso', '/univag/definir-senha?token=t']) {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(caminho)
      const cartao = page.locator('[data-slot=card]')
      await cartao.waitFor()
      const c = await caixa(cartao)
      expect(Math.abs(c.x - 16), caminho).toBeLessThanOrEqual(1)
      expect(c.x + c.width, caminho).toBeGreaterThanOrEqual(344 - 1)
      expect(c.x + c.width, caminho).toBeLessThanOrEqual(360)

      await page.setViewportSize({ width: 1024, height: 740 })
      const g = await caixa(cartao)
      expect(g.width, caminho).toBeLessThanOrEqual(420)
      expect(Math.abs(g.x - (await largura() - g.x - g.width)), caminho).toBeLessThanOrEqual(1)
    }

    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag')
    const entrar = await caixa(page.getByRole('button', { name: 'Entrar' }))
    const cpf = await caixa(page.getByLabel('CPF'))
    expect(Math.abs(entrar.width - cpf.width)).toBeLessThanOrEqual(1)
    const link = await caixa(page.getByRole('link', { name: 'Primeiro acesso ou esqueci minha senha' }))
    const cartao = await caixa(page.locator('[data-slot=card]'))
    expect(link.y).toBeGreaterThanOrEqual(entrar.y + entrar.height - 1)
    expect(Math.abs(link.x + link.width / 2 - (cartao.x + cartao.width / 2))).toBeLessThanOrEqual(1)

    await page.setViewportSize({ width: 1024, height: 740 })
    await page.goto('/univag/trocar-senha')
    await page.getByRole('heading', { name: 'Trocar senha' }).waitFor()
    expect((await caixa(page.locator('main > div').first())).width).toBeLessThanOrEqual(420)
  })
})

const naMesmaLinha = (a: { y: number }, b: { y: number }) => Math.abs(a.y - b.y) <= 4

test.describe('conhecimento', () => {
  // C80 (## Screens linhas 10 e 11)
  test('arranjo Artigos e Documentos', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 360, height: 740 })
    for (const [caminho, titulo, botao, cartao] of [
      ['/univag/artigos', 'Artigos', /Novo/, 'Como emitir a segunda via'],
      ['/univag/documentos', 'Documentos', /Enviar PDF/, 'Regulamento do estágio'],
    ] as const) {
      await page.goto(caminho)
      const item = page.locator('[data-slot=card]').filter({ hasText: cartao })
      await item.waitFor()
      const h1 = await caixa(page.getByRole('heading', { name: titulo }))
      expect(naMesmaLinha(h1, await caixa(page.getByRole('button', { name: botao }))), caminho).toBe(true)
      const nome = await caixa(item.locator('strong'))
      for (const selo of await item.locator('[data-slot=badge]').all()) expect(naMesmaLinha(nome, await caixa(selo)), caminho).toBe(true)
    }

    await page.goto('/univag/artigos')
    await page.getByRole('button', { name: /Novo/ }).click()
    const dialogo = page.getByRole('dialog')
    await dialogo.waitFor()
    const de = await caixa(page.getByLabel('Válido de (opcional)'))
    const ate = await caixa(page.getByLabel('Válido até (opcional)'))
    const calendario = await caixa(page.getByRole('button', { name: 'Escolher validade no calendário' }))
    expect(naMesmaLinha(de, ate)).toBe(true)
    expect(calendario.y).toBeGreaterThanOrEqual(Math.max(de.y + de.height, ate.y + ate.height) - 1)
    const resposta = page.getByRole('textbox', { name: 'Resposta' })
    const alturaDaLinha = await resposta.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight))
    expect((await caixa(resposta)).height).toBeGreaterThanOrEqual(6 * alturaDaLinha - 1)

    await page.setViewportSize({ width: 1024, height: 740 })
    // a largura assenta no quadro seguinte ao redimensionamento
    await expect.poll(async () => Math.abs((await caixa(dialogo)).width - 512)).toBeLessThanOrEqual(1)
  })
})

test.describe('administração', () => {
  // C83 (AC 46)
  test('abas de Cadastros rolam na própria faixa', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag/cadastros')
    const abas = page.getByRole('tablist')
    await abas.waitFor()
    expect(await abas.evaluate((e) => getComputedStyle(e).overflowX)).toBe('auto')
    expect(await abas.evaluate((e) => e.scrollLeft)).toBe(0)
    await page.getByRole('tab', { name: 'Respostas prontas' }).click()
    expect(await abas.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.scrollX)).toBe(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)

    await page.setViewportSize({ width: 1024, height: 740 })
    expect(await abas.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(0)
  })

  // C89 (## Screens linhas 13 a 15)
  test('arranjo administração', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag/usuarios')
    await page.getByText('Carla Regina de Souza Albuquerque').waitFor()
    expect(naMesmaLinha(await caixa(page.getByRole('heading', { name: 'Usuários' })), await caixa(page.getByRole('button', { name: /Novo/ })))).toBe(true)

    await page.goto('/univag/matriculas')
    const importar = page.getByRole('button', { name: 'Importar' })
    await importar.waitFor()
    const conteudo = async () => (await caixa(page.locator('main > div').first())).width
    expect(Math.abs((await caixa(importar)).width - (await conteudo()))).toBeLessThanOrEqual(1)
    await page.setViewportSize({ width: 1024, height: 740 })
    expect((await caixa(importar)).width).toBeLessThan(await conteudo())

    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag/cadastros')
    const linha = page.getByRole('tabpanel').getByRole('button').first()
    await linha.waitFor()
    const lista = await caixa(linha.locator('..'))
    expect(Math.abs((await caixa(linha)).width - lista.width)).toBeLessThanOrEqual(1)
  })
})

// Fatos de arranjo de ## Screens que nenhum teste acima media (verification.md rodada 1, lacuna 3).
test.describe('arranjo restante', () => {
  test.use({ viewport: { width: 360, height: 740 } })
  const direita = (c: { x: number; width: number }) => c.x + c.width
  const abaixo = (a: { y: number; height: number }, b: { y: number }) => b.y >= a.y + a.height - 1

  // C18 (linha 0)
  test('cabeçalho a 360 px: marca e instituição à esquerda, Tema e Menu à direita, gaveta de baixo', async ({ page }) => {
    await simularApi(page)
    await page.goto('/univag/fila')
    const nav = page.getByRole('navigation')
    const marca = await caixa(nav.getByText('One', { exact: true }))
    const nome = await caixa(nav.getByTestId('instituicao'))
    const tema = await caixa(nav.getByRole('button', { name: 'Tema' }))
    const menu = await caixa(nav.getByRole('button', { name: 'Menu' }))
    expect(marca.x).toBeLessThan(nome.x)
    expect(direita(marca)).toBeLessThanOrEqual(nome.x + 1)
    expect(direita(nome)).toBeLessThanOrEqual(tema.x + 1)
    expect(direita(tema)).toBeLessThanOrEqual(menu.x + 1)
    expect(direita(menu)).toBeGreaterThan(360 / 2)
    expect(tema.x).toBeGreaterThan(360 / 2)
    await nav.getByRole('button', { name: 'Menu' }).click()
    const gaveta = page.getByRole('dialog', { name: 'Menu' })
    // a gaveta sobe até assentar; ancorada embaixo
    await expect.poll(async () => Math.abs((await caixa(gaveta)).y + (await caixa(gaveta)).height - 740)).toBeLessThanOrEqual(1)
    expect((await caixa(gaveta)).y).toBeGreaterThan(0)
  })

  // C66 (linha 1)
  test('raiz com a marca e o texto centralizados', async ({ page }) => {
    await page.goto('/')
    for (const t of [page.getByText('One', { exact: true }), page.getByText('Abra o endereço da sua instituição')]) {
      const c = await caixa(t)
      expect(Math.abs(c.x + c.width / 2 - 180)).toBeLessThanOrEqual(1)
    }
  })

  // C66 (linha 2)
  test('Login: campos empilhados e o erro abaixo do formulário', async ({ page }) => {
    await simularApi(page)
    await page.route('**/api/auth/login', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ status: 401, detail: 'CPF ou senha inválidos.' }) }))
    await page.goto('/univag')
    await page.getByLabel('CPF').fill('12345678909')
    await page.getByLabel('Senha').fill('senha-errada')
    await page.getByRole('button', { name: 'Entrar' }).click()
    const erro = await caixa(page.getByRole('alert'))
    const cpf = await caixa(page.getByLabel('CPF'))
    const senha = await caixa(page.getByLabel('Senha'))
    const entrar = await caixa(page.getByRole('button', { name: 'Entrar' }))
    expect(abaixo(cpf, senha)).toBe(true)
    expect(abaixo(senha, entrar)).toBe(true)
    expect(abaixo(entrar, erro)).toBe(true)
  })

  // C38 (linha 6)
  test('Assistente: data pequena à direita, campo de 2 linhas e erro abaixo do compositor', async ({ page }) => {
    await simularApi(page)
    await page.goto('/univag/assistente')
    const campo = page.getByLabel('Mensagem')
    const linha = await campo.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight))
    expect(await campo.evaluate((e) => (e as HTMLTextAreaElement).rows)).toBe(2)
    expect((await caixa(campo)).height).toBeGreaterThanOrEqual(2 * linha - 1)

    await enviar(page, 'preciso do boleto do semestre')
    const balao = page.locator('.is-assistant').first()
    await balao.waitFor()
    const data = balao.getByText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    const b = await caixa(balao)
    const d = await caixa(data)
    expect(await data.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeLessThan(16)
    expect(await data.evaluate((e) => getComputedStyle(e).textAlign)).toBe('end')
    expect(direita(d)).toBeGreaterThan(direita(b) - 16)
    expect(d.y).toBeGreaterThanOrEqual(b.y + b.height / 2)

    await page.route('**/api/conversas/1/mensagens', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: 500, detail: 'Falha no serviço.' }) }))
    await enviar(page, 'outra pergunta')
    const erro = await caixa(page.getByRole('alert'))
    expect(abaixo(await caixa(page.getByRole('button', { name: /Enviar/ })), erro)).toBe(true)
  })

  // C44 (linha 9)
  test('Detalhe: cartão da equipe antes da conversa e ações que quebram em linhas', async ({ page }) => {
    await simularApi(page)
    await page.goto('/univag/chamados/ONE-123')
    await page.getByText('Resumo gerado por IA').waitFor()
    const equipe = page.locator('[data-slot=card]').filter({ hasText: 'Resumo gerado por IA' })
    expect(await equipe.count()).toBe(1)
    const conversa = await caixa(page.locator('.is-user').first())
    expect(abaixo(await caixa(equipe), conversa)).toBe(true)

    const acoes = page.getByRole('main').locator('div.flex-wrap').filter({ has: page.getByRole('button', { name: 'Encaminhar' }) })
    expect(await acoes.evaluate((e) => getComputedStyle(e).flexWrap)).toBe('wrap')
    const ys = new Set<number>()
    for (const b of await acoes.getByRole('button').all()) ys.add(Math.round((await caixa(b)).y))
    for (const b of await acoes.getByRole('button').all()) expect(direita(await caixa(b))).toBeLessThanOrEqual(360)
    // estreitando a tela, o que não cabe desce para a linha de baixo, sem rolagem
    await page.setViewportSize({ width: 300, height: 740 })
    ys.clear()
    for (const b of await acoes.getByRole('button').all()) ys.add(Math.round((await caixa(b)).y))
    expect(ys.size, 'as ações quebram em mais de uma linha').toBeGreaterThan(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(300)
  })

  // C80 (linhas 10, 11) e C89 (linha 13)
  test('botões pequenos em linha em Artigos, Documentos e Usuários', async ({ page }) => {
    await simularApi(page)
    for (const [caminho, cartao] of [['/univag/artigos', 'Como emitir'], ['/univag/documentos', 'Regulamento do estágio'], ['/univag/usuarios', 'Carla Regina']] as const) {
      await page.goto(caminho)
      const item = page.locator('[data-slot=card]').filter({ hasText: cartao })
      await item.waitFor()
      const botoes = await item.getByRole('button').all()
      expect(botoes.length, caminho).toBeGreaterThanOrEqual(2)
      const primeiro = await caixa(botoes[0])
      for (const b of botoes) {
        const c = await caixa(b)
        expect(naMesmaLinha(primeiro, c), caminho).toBe(true)
        expect(c.height, caminho).toBeLessThanOrEqual(36)
      }
    }
  })

  // C80 (estados comuns)
  test('diálogos a 360 px com margem de 16 px', async ({ page }) => {
    await simularApi(page)
    for (const [caminho, botao] of [['/univag/artigos', /Novo/], ['/univag/documentos', /Enviar PDF/], ['/univag/usuarios', /Novo/]] as const) {
      await page.goto(caminho)
      await page.getByRole('button', { name: botao }).click()
      const d = await caixa(page.getByRole('dialog'))
      expect(Math.abs(d.x - 16), caminho).toBeLessThanOrEqual(1)
      expect(Math.abs(d.width - 328), caminho).toBeLessThanOrEqual(1)
    }
  })

  // C89 (linha 14)
  test('Matrículas: cabeçalho mono que quebra, resultado em Alert e erros em tabela que quebra o motivo', async ({ page }) => {
    await simularApi(page)
    await page.goto('/univag/matriculas')
    const codigo = page.locator('code')
    await codigo.waitFor()
    expect(await codigo.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/mono/i)
    const linha = await codigo.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight))
    const cod = await caixa(codigo)
    expect(cod.height).toBeGreaterThan(linha * 1.5)
    expect(direita(cod)).toBeLessThanOrEqual(360)

    const arquivo = { name: 'matriculas.csv', mimeType: 'text/csv', buffer: Buffer.from('cpf;nome') }
    const importar = async () => {
      await page.locator('input[type=file]').setInputFiles(arquivo)
      await page.getByRole('button', { name: 'Importar' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Importar' }).click()
    }
    await page.route('**/api/admin/matriculas/importacao', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ criados: 3, atualizados: 2 }) }))
    await importar()
    const resultado = page.getByRole('alert').filter({ hasText: 'Importação concluída' })
    await resultado.waitFor()
    expect(await resultado.evaluate((e) => e.className)).not.toMatch(/destructive/)
    expect(abaixo(await caixa(page.getByRole('button', { name: 'Importar' })), await caixa(resultado))).toBe(true)

    const motivo = 'O CPF informado nesta linha não confere com nenhum aluno cadastrado na instituição e por isso a linha foi recusada'
    await page.route('**/api/admin/matriculas/importacao', (r) =>
      r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ status: 400, detail: 'Há erros no arquivo.', erros: [{ linha: 2, motivo }] }) }),
    )
    await importar()
    const celula = page.getByRole('cell', { name: motivo })
    await celula.waitFor()
    expect(await page.getByRole('columnheader').allTextContents()).toEqual(['Linha', 'Motivo'])
    const c = await caixa(celula)
    expect(direita(c)).toBeLessThanOrEqual(360)
    expect(c.height).toBeGreaterThan((await celula.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight))) * 1.5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  })

  // C89 (linha 15)
  test('Cadastros: detalhe pequeno embaixo do nome', async ({ page }) => {
    await simularApi(page)
    await page.route('**/api/admin/setores', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, nome: 'Secretaria', triagem: true, ativo: true }]) }))
    await page.goto('/univag/cadastros')
    const linha = page.getByRole('tabpanel').getByRole('button').first()
    await linha.waitFor()
    const [nome, detalhe] = await linha.locator('div').all()
    expect(abaixo(await caixa(nome), await caixa(detalhe))).toBe(true)
    expect(await detalhe.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeLessThan(await nome.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)))
  })
})

// redesign-institucional: tema Preto, quebra das mensagens, gráfico e cartões
test.describe('redesign institucional', () => {
  // C5 (AC 5)
  test('tema Preto com fundo preto', async ({ page }) => {
    await simularApi(page)
    await page.addInitScript(() => localStorage.setItem('one-tema', 'black'))
    await page.goto('/univag/fila')
    await page.getByText('ONE-123').waitFor()
    expect(await page.evaluate(() => [...document.documentElement.classList].sort())).toEqual(['black', 'dark'])
    // o Chrome devolve a cor computada em oklch(); pintada num canvas ela vira o pixel rgb(0, 0, 0)
    const pixel = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d')!
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor
      ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data]
    })
    expect(pixel).toEqual([0, 0, 0, 255])
  })

  // O caractere logo antes de cada linha nova do texto de um balão.
  async function quebras(page: Page, trecho: string) {
    const conteudo = page.locator('[role="log"] .whitespace-pre-wrap').filter({ hasText: trecho }).first()
    return conteudo.evaluate((el) => {
      const antes: string[] = []
      const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let anterior: { topo: number; ch: string } | null = null
      while (andar.nextNode()) {
        const no = andar.currentNode as Text
        for (let i = 0; i < no.length; i++) {
          const r = document.createRange()
          r.setStart(no, i)
          r.setEnd(no, i + 1)
          const ret = [...r.getClientRects()].find((x) => x.width > 0)
          if (!ret) continue
          if (anterior && ret.top > anterior.topo + 2) antes.push(anterior.ch)
          anterior = { topo: ret.top, ch: no.data[i] }
        }
      }
      return { antes, texto: el.textContent }
    })
  }

  // C16 (AC 16)
  test('link longo quebra só nos separadores', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await simularApi(page)
    const Link = 'https://portal.univag.edu.br/financeiro/boletos/segunda-via?matricula=2000567890&semestre=2026-2'
    await page.goto('/univag/assistente')
    await enviar(page, Link)
    await page.getByText('Isso resolveu?').waitFor()
    const { antes, texto } = await quebras(page, 'matricula=')
    expect(texto).toBe(Link)
    expect(antes.length, 'o link ocupa mais de uma linha a 360 px').toBeGreaterThan(0)
    for (const ch of antes) expect([' ', '/', '?', '&', '=', '#', '-'], `quebra depois de "${ch}"`).toContain(ch)
  })

  // C17 (AC 17)
  test('palavra longa sem separador fica no balão', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await simularApi(page)
    await page.goto('/univag/assistente')
    await enviar(page, 'a'.repeat(80))
    await page.getByText('Isso resolveu?').waitFor()
    const balao = page.locator('.is-user').first()
    const c = await caixa(balao)
    expect(c.x + c.width).toBeLessThanOrEqual(360)
    const conteudo = await caixa(balao.locator('.whitespace-pre-wrap'))
    expect(conteudo.x + conteudo.width).toBeLessThanOrEqual(c.x + c.width + 0.5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360)
  })

  // C20 (AC 20)
  test('rótulo do gráfico numa linha', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await simularApi(page)
    await page.goto('/univag/indicadores')
    await page.getByText('Indicador principal').waitFor()
    const rotulo = page.locator('.recharts-yAxis-tick-labels text').first()
    await rotulo.waitFor()
    expect(await rotulo.locator('tspan').count()).toBe(1)
    expect(await rotulo.textContent()).toBe('Financeiro > Bole…')
  })

  // ## Visual: popover e diálogo mantêm a sombra; o texto do balão em leading-relaxed (16 px x 1,625 = 26 px)
  test('superfícies de Visual', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await simularApi(page)
    await page.goto('/univag/chamados/ONE-123')
    await page.getByText('Resumo gerado por IA').waitFor()
    expect(await page.locator('.is-user .whitespace-pre-wrap').first().evaluate((e) => getComputedStyle(e).lineHeight), 'leading-relaxed').toBe('26px')
    await page.getByRole('button', { name: 'Tema' }).click()
    const popover = page.locator('[data-slot=popover-content]')
    await popover.waitFor()
    expect(await popover.evaluate((e) => getComputedStyle(e).boxShadow), 'popover com sombra').not.toBe('none')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Encaminhar' }).click()
    const dialogo = page.getByRole('dialog')
    await dialogo.waitFor()
    expect(await dialogo.evaluate((e) => getComputedStyle(e).boxShadow), 'diálogo com sombra').not.toBe('none')
  })

  // C21 (AC 21)
  test('cartões sem sombra', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await simularApi(page)
    await page.goto('/univag/indicadores')
    await page.getByText('Indicador principal').waitFor()
    const sombras = await page.locator('[data-slot=card]').evaluateAll((els) => els.map((e) => getComputedStyle(e).boxShadow))
    expect(sombras.length).toBeGreaterThanOrEqual(13)
    expect(new Set(sombras)).toEqual(new Set(['none']))
    const cantos = await page.locator('[data-slot=card]').evaluateAll((els) => els.map((e) => getComputedStyle(e).borderTopLeftRadius))
    expect(new Set(cantos), 'rounded-lg = --radius 0.5rem').toEqual(new Set(['8px']))
  })
})

// barra-lateral-grupos: grupos, nome do usuário e a barra recolhida
test.describe('barra lateral com grupos', () => {
  const Grupos = [
    ['Atendimento', ['Assistente', 'Minhas solicitações', 'Fila', 'Indicadores']],
    ['Conhecimento', ['Artigos', 'Documentos']],
    ['Administração', ['Usuários', 'Matrículas', 'Cadastros']],
  ] as const

  // C4 (## Screens)
  test('grupos na barra lateral', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    const nav = page.getByRole('navigation')
    let fundoAnterior = -1
    for (const [nome, links] of Grupos) {
      const grupo = nav.getByRole('group', { name: nome })
      const titulo = grupo.getByText(nome, { exact: true })
      await expect(titulo).toBeVisible()
      expect(await titulo.evaluate((e) => getComputedStyle(e).fontSize), `${nome}: text-xs`).toBe('12px')
      const t = await caixa(titulo)
      expect(t.y + t.height, `${nome} acima do primeiro link`).toBeLessThanOrEqual((await caixa(grupo.getByRole('link', { name: links[0] }))).y + 1)
      if (fundoAnterior >= 0) expect(t.y - fundoAnterior, `${nome}: 24 px antes do título`).toBeGreaterThanOrEqual(23)
      const ultimo = await caixa(grupo.getByRole('link', { name: links[links.length - 1] }))
      fundoAnterior = ultimo.y + ultimo.height
    }
  })

  // C4 (## Screens, gaveta)
  test('grupos na gaveta', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag/fila')
    await page.getByRole('button', { name: 'Menu' }).click()
    const gaveta = page.getByRole('dialog', { name: 'Menu' })
    await gaveta.waitFor()
    // a gaveta sobe até assentar; mede depois
    await expect.poll(async () => Math.abs((await caixa(gaveta)).y + (await caixa(gaveta)).height - 740)).toBeLessThanOrEqual(1)
    for (const [nome, links] of Grupos) {
      const titulo = await caixa(gaveta.getByRole('group', { name: nome }).getByText(nome, { exact: true }))
      expect(Math.abs(titulo.height - 32), `${nome}: 32 px`).toBeLessThanOrEqual(1)
      expect(titulo.y + titulo.height, `${nome} antes dos links`).toBeLessThanOrEqual((await caixa(gaveta.getByRole('link', { name: links[0] }))).y + 1)
    }
    // com os títulos a lista passa da altura da gaveta: rola até "Sair", que fica dentro da tela
    const sair = gaveta.getByRole('button', { name: 'Sair' })
    await sair.scrollIntoViewIfNeeded()
    const s = await caixa(sair)
    expect(s.y + s.height, 'Sair ao alcance').toBeLessThanOrEqual(741)
  })

  // C5 (AC 4)
  test('nome do usuário na barra', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    const nav = page.getByRole('navigation')
    const nome = nav.getByText('Ana', { exact: true })
    await expect(nome).toBeVisible()
    expect(await nome.evaluate((e) => [getComputedStyle(e).whiteSpace, getComputedStyle(e).textOverflow])).toEqual(['nowrap', 'ellipsis'])
    const n = await caixa(nome)
    expect(n.x + n.width, 'dentro da barra').toBeLessThanOrEqual(241)
    for (const botao of ['Tema', 'Sair']) expect(n.y + n.height, `acima de ${botao}`).toBeLessThanOrEqual((await caixa(nav.getByRole('button', { name: botao }))).y + 1)
  })

  // C8, C10 a C14 (AC 6, AC 8 a AC 12)
  for (const largura of [1024, 1280]) {
    test(`barra recolhida a ${largura} px`, async ({ page }) => {
      await simularApi(page)
      await page.setViewportSize({ width: largura, height: 800 })
      await page.goto('/univag/fila')
      const nav = page.getByRole('navigation')
      const recolher = nav.getByRole('button', { name: 'Recolher barra lateral' })
      await expect(recolher, 'C10').toHaveAttribute('aria-expanded', 'true')
      expect(Math.abs((await caixa(recolher)).y - (await caixa(nav.getByText('One', { exact: true }))).y), 'C10 na linha da marca').toBeLessThanOrEqual(4)

      await recolher.click()
      await expect.poll(async () => Math.round((await caixa(nav)).width), 'C11 64 px').toBe(64)
      expect((await caixa(page.locator('main'))).x, 'C11 conteúdo a partir de 64 px').toBeGreaterThanOrEqual(63)
      const expandir = nav.getByRole('button', { name: 'Expandir barra lateral' })
      await expect(expandir, 'C11').toHaveAttribute('aria-expanded', 'false')
      expect(await page.evaluate(() => localStorage.getItem('one-barra')), 'C14').toBe('recolhida')

      for (const rotulo of Links) {
        const link = nav.getByRole('link', { name: rotulo })
        await expect(link, `C12 ${rotulo}`).toBeVisible()
        expect(await link.locator('span').evaluate((e) => e.getBoundingClientRect().width), `C12 rótulo de ${rotulo} escondido`).toBeLessThanOrEqual(1)
        const c = await caixa(link)
        expect(Math.abs(c.height - 36), `C12 ${rotulo} 36 px`).toBeLessThanOrEqual(1)
        expect(c.x + c.width, `C12 ${rotulo} dentro dos 64 px`).toBeLessThanOrEqual(65)
      }
      for (const nome of ['Atendimento', 'Conhecimento', 'Administração']) expect((await caixa(nav.getByText(nome, { exact: true }))).width, `C12 título ${nome}`).toBeLessThanOrEqual(1)
      await expect(nav.getByTestId('instituicao'), 'C12 instituição').toBeHidden()

      const circulo = nav.getByRole('img', { name: 'Ana' })
      const k = await caixa(circulo)
      expect([Math.round(k.width), Math.round(k.height)], 'C8 círculo de 32 px').toEqual([32, 32])
      await circulo.focus()
      await expect(page.getByRole('tooltip'), 'C8 nome na dica').toHaveText('Ana')

      await nav.getByRole('link', { name: 'Artigos' }).focus()
      await expect(page.getByRole('tooltip'), 'C13 rótulo na dica').toHaveText('Artigos')

      await page.reload()
      await expect.poll(async () => Math.round((await caixa(page.getByRole('navigation'))).width), 'C14 recarregou recolhida').toBe(64)

      await page.getByRole('button', { name: 'Expandir barra lateral' }).click()
      await expect.poll(async () => Math.round((await caixa(page.getByRole('navigation'))).width), 'C11 volta a 240 px').toBe(240)
      expect(await page.evaluate(() => localStorage.getItem('one-barra')), 'C14').toBe('aberta')
    })
  }

  // C17 (AC 15)
  test('movimento reduzido na barra lateral', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    const duracao = () => page.getByRole('navigation').evaluate((e) => getComputedStyle(e).transitionDuration)
    await page.getByRole('button', { name: 'Recolher barra lateral' }).click() // a transição só vale depois de alternar
    expect(await duracao()).not.toBe('0s')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await duracao()).toBe('0s')
  })
})
