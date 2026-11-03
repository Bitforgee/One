import { expect, test, type Locator, type Page } from '@playwright/test'
import { simularApi, Telas } from './simulada'

// Arranjo de ## Screens medido com boundingBox() (regra do arranjo de checks.md): px CSS, tolerância de 1 px.
test.use({ serviceWorkers: 'block' })

// barra-lateral-grupos: na ordem dos grupos (Atendimento, Conhecimento, Administração)
const Links = ['Assistente', 'Minhas solicitações', 'Fila', 'Indicadores', 'Artigos', 'Documentos', 'Usuários', 'Matrículas', 'Cadastros']
const caixa = async (l: Locator) => (await l.boundingBox())!
// a casca anima a largura da barra ao trocar entre celular e desktop: mede depois que as transições acabam
const assentar = (page: Page) => page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished'))
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
      const falar = await caixa(page.getByRole('button', { name: /Falar com atendente/ })) // a última linha do compositor
      expect(740 - (falar.y + falar.height), `${ate} compositor perto do fundo`).toBeLessThanOrEqual(16)
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

    await page.setViewportSize({ width: 1440, height: 740 })
    await assentar(page)
    const coluna = await caixa(page.locator('main > div > div').first())
    const main = await caixa(page.locator('main'))
    expect(coluna.width).toBeLessThanOrEqual(768)
    // C31: as sobras à esquerda e à direita dentro do main diferem em no máximo 1 px
    expect(Math.abs(coluna.x - main.x - (main.x + main.width - coluna.x - coluna.width))).toBeLessThanOrEqual(1)
  })
})

test.describe('Detalhe do chamado', () => {
  const abrirDetalhe = async (page: Page, largura: number) => {
    await page.setViewportSize({ width: largura, height: 900 })
    await simularApi(page)
    await page.goto('/univag/chamados/ONE-123')
    await page.getByText('Resumo gerado por IA').waitFor()
    await assentar(page)
  }
  const cartaoAcoes = (page: Page) => page.locator('[data-slot=card]').filter({ has: page.getByText('Ações', { exact: true }) })

  test('detalhe em duas colunas', async ({ page }) => {
    await abrirDetalhe(page, 1440)
    const acoes = await caixa(cartaoAcoes(page))
    const historico = await caixa(page.locator('[data-slot=card]').filter({ has: page.getByRole('heading', { name: 'Histórico' }) }))
    const titulo = await caixa(page.getByRole('heading', { level: 2 }).first())
    const resposta = await caixa(page.getByLabel('Responder'))
    expect(Math.abs(acoes.width - 320)).toBeLessThanOrEqual(1)
    expect(Math.abs(historico.width - 320)).toBeLessThanOrEqual(1)
    expect(acoes.x).toBeGreaterThanOrEqual(Math.max(titulo.x + titulo.width, resposta.x + resposta.width) - 1)
    expect(historico.y).toBeGreaterThanOrEqual(acoes.y + acoes.height - 1)
    await expect(cartaoAcoes(page).getByRole('button', { name: 'Assumir' })).toBeVisible()
  })

  for (const largura of [360, 1280])
    test(`detalhe em uma coluna a ${largura} px`, async ({ page }) => {
      await abrirDetalhe(page, largura)
      const topos = [
        page.getByRole('heading', { level: 2 }).first(),
        page.getByRole('heading', { name: 'Conversa com o assistente' }),
        page.getByRole('heading', { name: 'Atendimento' }),
        page.getByLabel('Responder'),
        cartaoAcoes(page),
        page.getByRole('heading', { name: 'Histórico' }),
      ]
      const ys = []
      for (const t of topos) ys.push((await caixa(t)).y)
      for (let i = 1; i < ys.length; i++) expect(ys[i], JSON.stringify(ys)).toBeGreaterThan(ys[i - 1])
    })

  test('arranjo Detalhe do chamado', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await simularApi(page)
    await page.goto('/univag/chamados/ONE-123')
    await page.getByText('Resumo gerado por IA').waitFor()

    const titulo = await caixa(page.getByRole('heading', { level: 1 }))
    expect(titulo.x).toBeGreaterThanOrEqual(0)
    expect(titulo.x + titulo.width).toBeLessThanOrEqual(360)

    // <button> do main; o campo de arquivo (sr-only, papel button no Chromium) não é botão de ação
    const botoes = page.locator('main > div button') // só o conteúdo: o cabeçalho da casca tem os botões dele
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
    expect((await caixa(page.locator('main > div > div').first())).width).toBeLessThanOrEqual(768)
  })
})

test.describe('Indicadores', () => {
  const Cartoes = ['Indicador principal', 'Alunos ativos', 'Conversas', 'Autoatendimento', 'Escalonamento', 'Abandono', 'Perguntas sem artigo',
    'Chamados abertos agora', 'Chamados resolvidos', 'Tempo até a 1ª resposta', 'Tempo de resolução', 'Roteamento correto', 'Reabertura']
  const Destaques = Cartoes.filter((r) => ['Indicador principal', 'Chamados abertos agora', 'Autoatendimento', 'Tempo até a 1ª resposta'].includes(r))
  const Compactos = Cartoes.filter((r) => !Destaques.includes(r))
  const mesmaLinha = (a: { y: number }, b: { y: number }) => Math.abs(a.y - b.y) <= 4

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

    const cartao = (rotulo: string) => page.getByRole('main').getByText(rotulo, { exact: true }).locator('xpath=ancestor::*[@data-slot="card"]')
    const estilo = (l: Locator, propriedade: string) => l.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), propriedade)
    // layout-painel door 5: as colunas seguem o main (976 px de conteúdo a 1280 px de janela com a barra aberta, 1136 px a 1440 px)
    for (const [largura, destaque, compactos, rankings] of [[360, 1, 2, 1], [1280, 2, 3, 2], [1440, 4, 3, 2]]) {
      await page.setViewportSize({ width: largura, height: 740 })
      await assentar(page)
      const colunas = async (rotulos: string[]) => new Set((await Promise.all(rotulos.map((r) => caixa(cartao(r))))).map((b) => Math.round(b.x))).size
      expect(await colunas(Destaques), `${largura} px: destaques`).toBe(destaque)
      expect(await colunas(Compactos), `${largura} px: compactos`).toBe(compactos)
      expect(await colunas(['Categorias por conversas', 'Categorias por chamados']), `${largura} px: rankings`).toBe(rankings)
      if (rankings === 1) {
        const [conversas, chamados] = await Promise.all([caixa(cartao('Categorias por conversas')), caixa(cartao('Categorias por chamados'))])
        expect(chamados.y, `${largura} px`).toBeGreaterThanOrEqual(conversas.y + conversas.height - 1)
      }
    }

    // destaques: valor de 24 px ou mais com tabular-nums e rótulo de 14 px; compactos: valor de 20 px; os destaques vêm antes
    for (const rotulo of Destaques) {
      const valor = cartao(rotulo).locator('[data-slot=card-title]')
      expect(parseFloat(await estilo(valor, 'font-size')), rotulo).toBeGreaterThanOrEqual(24)
      expect(await estilo(valor, 'font-variant-numeric'), rotulo).toContain('tabular-nums')
      expect(parseFloat(await estilo(cartao(rotulo).locator('[data-slot=card-description]'), 'font-size')), rotulo).toBe(14)
      expect((await caixa(cartao(rotulo))).y, rotulo).toBeLessThan((await caixa(cartao('Alunos ativos'))).y)
    }
    for (const rotulo of Compactos) expect(Math.abs(parseFloat(await estilo(cartao(rotulo).locator('> div').nth(1), 'font-size')) - 20), rotulo).toBeLessThanOrEqual(0.5)

    for (const titulo of ['Categorias por conversas', 'Categorias por chamados']) {
      const ranking = cartao(titulo)
      const grafico = ranking.locator('.recharts-responsive-container')
      await grafico.waitFor()
      const g = await caixa(grafico)
      expect(g.height).toBeGreaterThan(0)
      expect((await caixa(ranking.getByRole('table'))).y).toBeGreaterThanOrEqual(g.y + g.height - 1)
    }

    await page.setViewportSize({ width: 1280, height: 740 }) // main de 976 px: a linha de ferramentas cabe numa linha
    await assentar(page)
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
      const linha = page.getByRole('main').getByRole('row').filter({ hasText: 'ONE-123' })
      await linha.waitFor()
      // a tabela ocupa a largura do conteúdo, e o número, o título e o estado ficam na mesma linha da tabela
      const conteudo = await caixa(page.locator('main > div > div').first())
      const tabela = await caixa(page.getByRole('main').getByRole('table'))
      expect(conteudo.width - tabela.width, caminho).toBeLessThanOrEqual(2 + 1) // a borda de 1 px de cada lado
      expect(conteudo.width - tabela.width, caminho).toBeGreaterThanOrEqual(0)
      const l = await caixa(linha)
      for (const alvo of [linha.getByRole('link', { name: 'ONE-123' }), linha.getByText(/^Preciso da segunda via/).first(), linha.locator('[data-slot=badge]')]) {
        const a = await caixa(alvo)
        expect(a.y, caminho).toBeGreaterThanOrEqual(l.y - 1)
        expect(a.y + a.height, caminho).toBeLessThanOrEqual(l.y + l.height + 1)
      }

      await page.setViewportSize({ width: 1280, height: 740 })
      await assentar(page)
      // layout-painel: as listas ocupam a largura do conteúdo, sem o max-w-3xl de antes
      expect((await caixa(page.locator('main > div > div').first())).width, caminho).toBeGreaterThan(768)
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
      const bloco = page.locator('h1').locator('xpath=..')
      await bloco.waitFor()
      const c = await caixa(bloco)
      expect(Math.abs(c.x - 24), caminho).toBeLessThanOrEqual(1)
      expect(Math.abs(c.width - 312), caminho).toBeLessThanOrEqual(1)

      await page.setViewportSize({ width: 1024, height: 740 })
      const g = await caixa(bloco)
      expect(Math.abs(g.x - 96), caminho).toBeLessThanOrEqual(1)
      expect(Math.abs(g.width - 320), caminho).toBeLessThanOrEqual(1)
    }

    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag')
    const entrar = await caixa(page.getByRole('button', { name: 'Entrar' }))
    const cpf = await caixa(page.getByLabel('CPF'))
    expect(Math.abs(entrar.width - cpf.width)).toBeLessThanOrEqual(1)
    const link = await caixa(page.getByRole('link', { name: 'Primeiro acesso ou esqueci minha senha' }))
    const bloco = await caixa(page.locator('h1').locator('xpath=..'))
    expect(link.y).toBeGreaterThanOrEqual(entrar.y + entrar.height - 1)
    expect(Math.abs(link.x + link.width / 2 - (bloco.x + bloco.width / 2))).toBeLessThanOrEqual(1)

    await page.setViewportSize({ width: 1024, height: 740 })
    await page.goto('/univag/trocar-senha')
    await page.getByRole('heading', { name: 'Trocar senha' }).waitFor()
    expect((await caixa(page.locator('main > div > div').first())).width).toBeLessThanOrEqual(384)
  })

  // C32: as 4 telas de acesso, nas 2 larguras
  for (const caminho of ['/univag', '/univag/primeiro-acesso', '/univag/definir-senha?token=t', '/'])
    test(`telas de acesso centralizadas ${caminho}`, async ({ page }) => {
      await simularApi(page)
      for (const largura of [360, 1280]) {
        await page.setViewportSize({ width: largura, height: 740 })
        await page.goto(caminho)
        const rotulo = `${caminho} a ${largura}`
        if (caminho === '/') {
          const cartao = page.locator('[data-slot=card]')
          await cartao.waitFor()
          const c = await caixa(cartao)
          expect(c.width, rotulo).toBeLessThanOrEqual(384)
          expect(Math.abs(c.x + c.width / 2 - largura / 2), rotulo).toBeLessThanOrEqual(1)
          if (c.height < 740) expect(Math.abs(c.y + c.height / 2 - 370), rotulo).toBeLessThanOrEqual(1)
          continue
        }
        // login-institucional: o bloco do formulário centrado na coluna (metade da janela a 1280 px)
        const bloco = page.locator('h1').locator('xpath=..')
        await bloco.waitFor()
        const [b, coluna] = [await caixa(bloco), await caixa(bloco.locator('xpath=../..'))]
        expect(b.width, rotulo).toBeLessThanOrEqual(320)
        expect(Math.abs(b.x + b.width / 2 - (coluna.x + coluna.width / 2)), rotulo).toBeLessThanOrEqual(1)
        expect(await page.locator('[data-slot=card]').count(), rotulo).toBe(0)
      }
    })
})

const naMesmaLinha = (a: { y: number }, b: { y: number }) => Math.abs(a.y - b.y) <= 4

test.describe('conhecimento', () => {
  test('arranjo Artigos e Documentos', async ({ page }) => {
    await simularApi(page)
    for (const [caminho, titulo, botao, ajuda] of [
      ['/univag/artigos', 'Artigos', /Novo/, /^Orientações internas/],
      ['/univag/documentos', 'Documentos', /Enviar PDF/, /^PDFs da instituição/],
    ] as const) {
      // estreito: o texto de ajuda em cima e o botão embaixo, à direita; largo (main de 976 px): na mesma linha, o texto à esquerda
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(caminho)
      await page.getByRole('table').waitFor()
      await expect(page.getByRole('heading', { level: 1, name: titulo }), caminho).toBeVisible()
      let texto = await caixa(page.getByText(ajuda))
      let novo = await caixa(page.getByRole('button', { name: botao }))
      expect(novo.x + novo.width, caminho).toBeGreaterThanOrEqual(360 - 16 - 1)
      expect(novo.y, caminho).toBeGreaterThanOrEqual(texto.y + texto.height - 1)

      await page.setViewportSize({ width: 1280, height: 740 })
      await assentar(page)
      texto = await caixa(page.getByText(ajuda))
      novo = await caixa(page.getByRole('button', { name: botao }))
      expect(naMesmaLinha({ y: texto.y + texto.height / 2 }, { y: novo.y + novo.height / 2 }), caminho).toBe(true)
      expect(novo.x, caminho).toBeGreaterThan(texto.x + texto.width - 1)
    }

    await page.setViewportSize({ width: 360, height: 740 })
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
  test('arranjo administração', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag/usuarios')
    await page.getByText('Carla Regina de Souza Albuquerque').waitFor()
    const novo = await caixa(page.getByRole('button', { name: /Novo/ }))
    expect(novo.x + novo.width).toBeGreaterThanOrEqual(360 - 16 - 1) // o título está no cabeçalho da casca; o botão fica à direita

    await page.goto('/univag/matriculas')
    const importar = page.getByRole('button', { name: 'Importar' })
    await importar.waitFor()
    const conteudo = async () => (await caixa(page.locator('main > div > div').first())).width
    // o botão ocupa a largura do cartão (conteúdo menos o recuo de 16 px de cada lado do cartão)
    expect(Math.abs((await caixa(importar)).width - ((await conteudo()) - 34))).toBeLessThanOrEqual(1)
    await page.setViewportSize({ width: 1024, height: 740 })
    expect((await caixa(importar)).width).toBeLessThan(await conteudo() - 34)

    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag/cadastros')
    const tabela = page.getByRole('tabpanel').getByRole('table')
    await tabela.waitFor()
    expect((await conteudo()) - (await caixa(tabela)).width).toBeLessThanOrEqual(2 + 1) // a borda de 1 px de cada lado
    expect((await conteudo()) - (await caixa(tabela)).width).toBeGreaterThanOrEqual(0)
  })
})

// Fatos de arranjo de ## Screens que nenhum teste acima media (verification.md rodada 1, lacuna 3).
test.describe('arranjo restante', () => {
  test.use({ viewport: { width: 360, height: 740 } })
  const direita = (c: { x: number; width: number }) => c.x + c.width
  const abaixo = (a: { y: number; height: number }, b: { y: number }) => b.y >= a.y + a.height - 1

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

  test('botões pequenos em linha em Artigos, Documentos e Usuários', async ({ page }) => {
    await simularApi(page)
    for (const [caminho, linha, nome] of [
      ['/univag/artigos', 'Como emitir', 'Como emitir a segunda via do boleto do semestre com o valor corrigido'],
      ['/univag/documentos', 'Regulamento do estágio', 'Regulamento do estágio supervisionado obrigatório dos cursos de graduação'],
      ['/univag/usuarios', 'Carla Regina', 'Carla Regina de Souza Albuquerque'],
    ] as const) {
      await page.goto(caminho)
      const item = page.getByRole('row').filter({ hasText: linha })
      await item.waitFor()
      // a última coluna é só o botão "⋮" de 32 px, dentro da janela
      const botoes = await item.getByRole('button').all()
      expect(botoes.length, caminho).toBe(1)
      await expect(botoes[0], caminho).toHaveAccessibleName(`Ações de ${nome}`)
      const b = await caixa(botoes[0])
      expect(b.height, caminho).toBeLessThanOrEqual(36)
      expect(direita(b), caminho).toBeLessThanOrEqual(360)
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

  test('Cadastros: detalhe pequeno embaixo do nome', async ({ page }) => {
    await simularApi(page)
    await page.route('**/api/admin/setores', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, nome: 'Secretaria', triagem: true, ativo: true }]) }))
    await page.goto('/univag/cadastros')
    const linha = page.getByRole('tabpanel').getByRole('row').nth(1)
    await linha.waitFor()
    const nome = linha.getByRole('button', { name: 'Secretaria' })
    const detalhe = linha.locator('div.text-xs')
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

  test('cartões sem sombra', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await simularApi(page)
    await page.goto('/univag/indicadores')
    await page.getByText('Indicador principal').waitFor()
    // layout-painel: os 4 destaques levam shadow-xs, como no template; os outros cartões seguem sem sombra
    const sombras = await page.locator('[data-slot=card]').evaluateAll((els) => els.map((e) => getComputedStyle(e).boxShadow))
    expect(sombras.length).toBeGreaterThanOrEqual(13)
    expect(sombras.filter((x) => x === 'none').length).toBe(sombras.length - 4)
    const cantos = await page.locator('[data-slot=card]').evaluateAll((els) => els.map((e) => getComputedStyle(e).borderTopLeftRadius))
    expect(new Set(cantos), 'rounded-lg = --radius 0.5rem').toEqual(new Set(['8px']))
  })
})


// layout-painel: a casca do template (door 1 a 3 e 5), medida como em ## Screens
const Conteiner = '[data-slot=sidebar-container]'

test.describe('painel', () => {
  const largura = async (page: Page) => Math.round((await caixa(page.locator(Conteiner))).width)
  const recolhida = (page: Page) => page.addInitScript(() => localStorage.setItem('one-barra', 'recolhida'))

  test('painel barra aberta', async ({ page }) => {
    await simularApi(page)
    for (const w of [768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width: w, height: 800 })
      await page.goto('/univag/fila')
      const barra = page.locator(Conteiner)
      await expect(barra.getByTestId('instituicao'), `${w} px`).toBeVisible()
      const b = await caixa(barra)
      expect(Math.abs(b.x), `${w} px: x`).toBeLessThanOrEqual(1)
      expect(Math.abs(b.width - 256), `${w} px: largura`).toBeLessThanOrEqual(1)
      expect(Math.abs(b.height - 800), `${w} px: altura da janela`).toBeLessThanOrEqual(1)
      const marca = await caixa(barra.getByText('One', { exact: true }))
      const instituicao = await caixa(barra.getByTestId('instituicao'))
      const primeiroGrupo = await caixa(barra.getByText('Atendimento', { exact: true }))
      expect(marca.y + marca.height, `${w} px: marca acima do 1º grupo`).toBeLessThanOrEqual(primeiroGrupo.y + 1)
      expect(instituicao.y + instituicao.height, `${w} px: instituição acima do 1º grupo`).toBeLessThanOrEqual(primeiroGrupo.y + 1)
      const usuario = await caixa(barra.getByRole('button', { name: /Ana/ }))
      expect(b.y + b.height - (usuario.y + usuario.height), `${w} px: botão do usuário no fim`).toBeLessThanOrEqual(16)
      expect(usuario.y, `${w} px: botão do usuário abaixo dos links`).toBeGreaterThan((await caixa(barra.getByRole('link', { name: 'Cadastros' }))).y)
      expect(Math.abs((await caixa(page.locator('main'))).x - 256), `${w} px: main`).toBeLessThanOrEqual(1)
    }
  })

  test('painel recolher e expandir', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    const alternar = page.getByRole('button', { name: 'Alternar barra lateral' })
    const inicioDoMain = async () => Math.round((await caixa(page.locator('main'))).x)
    await alternar.click()
    await expect.poll(() => largura(page)).toBe(48)
    await expect.poll(inicioDoMain).toBe(48)
    expect(await page.evaluate(() => localStorage.getItem('one-barra'))).toBe('recolhida')
    await alternar.click()
    await expect.poll(() => largura(page)).toBe(256)
    await expect.poll(inicioDoMain).toBe(256)
    expect(await page.evaluate(() => localStorage.getItem('one-barra'))).toBe('aberta')
  })

  test('painel barra recolhida', async ({ page }) => {
    await simularApi(page)
    await recolhida(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    const barra = page.locator(Conteiner)
    await expect.poll(() => largura(page)).toBe(48)
    for (const rotulo of Links) {
      const link = barra.getByRole('link', { name: rotulo })
      await expect(link, rotulo).toBeVisible()
      await expect(link.locator('svg'), `ícone de ${rotulo}`).toBeVisible()
      expect(await link.locator('span').evaluate((e) => e.getBoundingClientRect().width), `rótulo de ${rotulo}`).toBeLessThanOrEqual(1)
    }
    for (const nome of ['Atendimento', 'Conhecimento', 'Administração']) expect((await caixa(barra.getByText(nome, { exact: true }))).width, `título ${nome}`).toBeLessThanOrEqual(1)
    expect((await caixa(barra.getByTestId('instituicao'))).width, 'instituição').toBeLessThanOrEqual(1)
    expect((await caixa(barra.getByText('One', { exact: true }))).width, 'One').toBeLessThanOrEqual(1)
    await barra.getByRole('link', { name: 'Usuários' }).hover()
    await expect(page.getByRole('tooltip'), 'dica ao passar o mouse').toHaveText('Usuários')
    await barra.getByRole('link', { name: 'Artigos' }).focus()
    await expect(page.getByRole('tooltip'), 'dica ao focar').toHaveText('Artigos')
  })

  test('painel no celular', async ({ page }) => {
    await simularApi(page)
    for (const w of [360, 390, 767]) {
      await page.setViewportSize({ width: w, height: 740 })
      await page.goto('/univag/indicadores')
      await page.getByRole('heading', { level: 1, name: 'Indicadores' }).waitFor()
      await expect(page.getByRole('link', { name: 'Fila' }), `${w} px: sem barra fixa`).toBeHidden()
      await page.getByRole('button', { name: 'Alternar barra lateral' }).click()
      const painel = page.getByRole('dialog', { name: 'Menu' })
      await painel.waitFor()
      await expect.poll(async () => Math.abs((await caixa(painel)).x), `${w} px: x`).toBeLessThanOrEqual(1)
      await expect.poll(async () => Math.abs((await caixa(painel)).width - Math.min(288, w)), `${w} px: largura`).toBeLessThanOrEqual(1)
      await expect(painel.getByTestId('instituicao')).toBeVisible()
      await expect(painel.getByRole('group')).toHaveCount(3)
      for (const rotulo of Links) await expect(painel.getByRole('link', { name: rotulo }), `${w} px: ${rotulo}`).toBeVisible()
      await expect(painel.getByRole('button', { name: /Ana/ })).toBeVisible()
      // C43: camada escura atrás do painel, cobrindo a janela
      const camada = page.locator('[data-slot=sheet-overlay]')
      await expect(camada, `${w} px: camada`).toBeVisible()
      const o = await caixa(camada)
      expect([o.x, o.y, o.width, o.height], `${w} px: camada cobre a janela`).toEqual([0, 0, w, 740])
      expect(await camada.evaluate((e) => Number(getComputedStyle(e).backgroundColor.match(/[\d.]+/g)![3] ?? 1)), `${w} px: alfa`).toBeGreaterThan(0)

      // C6: escolher um link fecha o painel e abre a tela
      await painel.getByRole('link', { name: 'Fila' }).click()
      await expect(page.getByRole('dialog'), `${w} px: painel fechado`).toHaveCount(0)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fila')
    }
  })

  test('painel cabeçalho', async ({ page }) => {
    await simularApi(page)
    for (const w of [360, 1280]) {
      await page.setViewportSize({ width: w, height: 500 })
      await page.goto('/univag/chamados/ONE-123')
      await page.getByText('Resumo gerado por IA').waitFor()
      const cabecalho = page.locator('main > header')
      expect(Math.abs((await caixa(cabecalho)).height - 49), `${w} px: altura`).toBeLessThanOrEqual(1)
      await page.evaluate(() => window.scrollTo(0, 400))
      expect(await page.evaluate(() => window.scrollY), `${w} px: a página rolou`).toBe(400)
      const c = await caixa(cabecalho)
      expect(Math.abs(c.y), `${w} px: fixo no topo`).toBeLessThanOrEqual(1)
      const botao = await caixa(cabecalho.getByRole('button', { name: 'Alternar barra lateral' }))
      const separador = cabecalho.locator('[data-orientation=vertical]')
      const s1 = await caixa(separador)
      const h1 = cabecalho.getByRole('heading', { level: 1 })
      const t = await caixa(h1)
      const tema = await caixa(cabecalho.getByRole('button', { name: 'Tema' }))
      expect(botao.x + botao.width, `${w} px: botão antes do separador`).toBeLessThanOrEqual(s1.x + 1)
      expect(s1.x + s1.width, `${w} px: separador antes do h1`).toBeLessThanOrEqual(t.x + 1)
      expect(t.x + t.width, `${w} px: h1 antes de Tema`).toBeLessThanOrEqual(tema.x + 1)
      expect(c.x + c.width - (tema.x + tema.width), `${w} px: Tema na ponta direita`).toBeLessThanOrEqual(25)
      expect(await h1.evaluate((e) => [getComputedStyle(e).fontSize, getComputedStyle(e).fontWeight]), `${w} px: h1`).toEqual(['16px', '500'])
    }
  })

  // C39
  test('Trocar senha até 384 px', async ({ page }) => {
    await simularApi(page)
    for (const w of [360, 1280]) {
      await page.setViewportSize({ width: w, height: 800 })
      await page.goto('/univag/trocar-senha')
      await page.getByRole('heading', { level: 1, name: 'Trocar senha' }).waitFor()
      const cartao = await caixa(page.locator('main > div > div').first())
      expect(cartao.width, `${w} px`).toBeLessThanOrEqual(384)
      // C50: centrado no bloco de conteúdo
      const bloco = await caixa(page.locator('main > div').first())
      expect(Math.abs(cartao.x + cartao.width / 2 - (bloco.x + bloco.width / 2)), `${w} px: centro do cartão`).toBeLessThanOrEqual(1)
    }
  })

  // C40
  test('botão do usuário', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    const botao = page.locator(Conteiner).getByRole('button', { name: /Ana/ })
    await botao.waitFor()
    const b = await caixa(botao)
    const iniciais = await caixa(botao.getByText('A', { exact: true }))
    expect([Math.round(iniciais.width), Math.round(iniciais.height)], 'quadrado das iniciais').toEqual([32, 32])
    const nome = botao.getByText('Ana', { exact: true })
    const papel = botao.getByText('Administrador', { exact: true })
    const [n, p, seta] = [await caixa(nome), await caixa(papel), await caixa(botao.locator('svg.lucide-chevrons-up-down'))]
    expect(n.x, 'nome à direita das iniciais').toBeGreaterThanOrEqual(iniciais.x + iniciais.width - 1)
    expect(p.y, 'papel abaixo do nome').toBeGreaterThanOrEqual(n.y + n.height - 1)
    for (const t of [nome, papel]) expect(await t.evaluate((e) => getComputedStyle(e).textOverflow)).toBe('ellipsis')
    expect(seta.x, 'seta à direita dos textos').toBeGreaterThanOrEqual(Math.max(n.x + n.width, p.x + p.width) - 1)
    expect(seta.x + seta.width).toBeLessThanOrEqual(b.x + b.width + 1)
  })

  // C41
  test('menu do usuário abre ao lado', async ({ page }) => {
    await simularApi(page)
    const conferir = async (botao: Locator, lado: 'direita' | 'acima') => {
      const b = await caixa(botao) // antes de abrir: o menu aberto esconde o resto da árvore de acessibilidade
      await botao.click()
      const menu = page.getByRole('menu')
      await menu.waitFor()
      await assentar(page)
      const m = await caixa(menu)
      if (lado === 'direita') expect(m.x, 'à direita do botão').toBeGreaterThanOrEqual(b.x + b.width - 1)
      else expect(m.y + m.height, 'acima do botão').toBeLessThanOrEqual(b.y + 1)
      const itens = await menu.locator('> *').evaluateAll((es) => es.map((e) => [e.getAttribute('role'), e.textContent]))
      expect(itens).toEqual([[null, 'AnaAdministrador'], ['separator', ''], ['menuitem', 'Sair']])
      const nome = await caixa(menu.getByText('Ana', { exact: true }))
      expect((await caixa(menu.getByText('Administrador', { exact: true }))).y, 'papel abaixo do nome').toBeGreaterThanOrEqual(nome.y + nome.height - 1)
      await expect(menu.getByRole('menuitem', { name: 'Sair' }).locator('svg.lucide-log-out')).toBeVisible()
      await page.keyboard.press('Escape')
    }
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    await conferir(page.locator(Conteiner).getByRole('button', { name: /Ana/ }), 'direita')

    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/univag/fila')
    await page.getByRole('button', { name: 'Alternar barra lateral' }).click()
    await conferir(page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: /Ana/ }), 'acima')
  })

  // C42
  test('barra com fundo, borda e instituição', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    const barra = page.locator(Conteiner)
    const instituicao = barra.getByTestId('instituicao')
    await instituicao.waitFor()
    const token = await page.evaluate(() => {
      const sonda = document.createElement('div')
      sonda.style.backgroundColor = 'var(--sidebar)'
      document.body.append(sonda)
      return getComputedStyle(sonda).backgroundColor
    })
    expect(await barra.locator('[data-slot=sidebar-inner]').evaluate((e) => getComputedStyle(e).backgroundColor), 'fundo').toBe(token)
    expect(await barra.evaluate((e) => getComputedStyle(e).borderRightWidth), 'borda direita').toBe('1px')
    const [b, i] = [await caixa(barra), await caixa(instituicao)]
    const linha = parseFloat(await instituicao.evaluate((e) => getComputedStyle(e).lineHeight))
    expect(i.height, 'até 2 linhas').toBeLessThanOrEqual(2 * linha + 1)
    expect(i.height, 'quebra em 2 linhas').toBeGreaterThan(linha + 1)
    expect(i.x + i.width, 'dentro da barra').toBeLessThanOrEqual(b.x + b.width)
  })

  // C46
  test('quebras medidas dos dois lados', async ({ page }) => {
    await simularApi(page)
    const padding = (l: Locator) => l.evaluate((e) => getComputedStyle(e).paddingLeft)
    for (const [w, esperado] of [[768, '16px'], [1024, '24px']] as const) {
      await page.setViewportSize({ width: w, height: 800 })
      await page.goto('/univag/fila')
      expect(await padding(page.locator('main > header > div')), `cabeçalho a ${w} px`).toBe(esperado)
    }
    for (const [w, esperado] of [[360, '24px'], [768, '40px']] as const) {
      await page.setViewportSize({ width: w, height: 800 })
      await page.goto('/univag')
      const coluna = page.locator('h1').locator('xpath=../../..')
      await coluna.waitFor()
      expect(await padding(coluna), `acesso a ${w} px`).toBe(esperado)
    }
    // 1328 px aberta: cartão de 244 px; 1440 px aberta: 272 px
    for (const [w, fonte] of [[1328, '24px'], [1440, '30px']] as const) {
      await page.setViewportSize({ width: w, height: 800 })
      await page.goto('/univag/indicadores')
      const cartao = page.getByRole('main').getByText('Autoatendimento', { exact: true }).locator('xpath=ancestor::*[@data-slot="card"]')
      await cartao.waitFor()
      const largura = (await caixa(cartao)).width
      expect(w === 1328 ? largura < 250 : largura >= 250, `cartão de ${largura} px a ${w}`).toBe(true)
      expect(await cartao.locator('[data-slot=card-title]').evaluate((e) => getComputedStyle(e).fontSize), `valor a ${w} px`).toBe(fonte)
    }
  })

  // C45
  test('alertas de Indicadores', async ({ page }) => {
    await simularApi(page)
    for (const [corpo, status] of [[{ semDados: true, principaisCategorias: { porConversas: [], porChamados: [] } }, 200], [{ status: 500, detail: 'Falha ao consultar.' }, 500]] as const)
      for (const w of [360, 1280]) {
        await page.route('**/api/indicadores*', (r) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) }))
        await page.setViewportSize({ width: w, height: 800 })
        await page.goto('/univag/indicadores')
        const alerta = page.getByRole('main').getByRole('alert')
        await alerta.waitFor()
        const rotulo = `${status} a ${w} px`
        const [a, f, bloco] = [await caixa(alerta), await caixa(page.locator('main form')), await caixa(page.locator('main > div > div').first())]
        expect(a.y, `${rotulo}: abaixo da linha de ferramentas`).toBeGreaterThanOrEqual(f.y + f.height - 1)
        expect(Math.abs(a.width - bloco.width), `${rotulo}: largura do bloco`).toBeLessThanOrEqual(1)
      }
  })

  test('movimento reduzido na barra lateral', async ({ page }) => {
    await simularApi(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    expect(await page.locator(Conteiner).evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s')
    await page.getByRole('button', { name: 'Alternar barra lateral' }).click()
    // sem transição, a largura final já vale no quadro seguinte ao clique
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    expect(await largura(page)).toBe(48)
  })

  test('sem rolagem horizontal', async ({ page }) => {
    test.setTimeout(300_000)
    await simularApi(page, undefined, true)
    const publicas = ['Login', 'Raiz', 'Primeiro acesso', 'Criar senha']
    for (const [nome, caminho, preparar] of Telas) {
      for (const w of [360, 390, 768, 1024, 1280, 1440]) {
        const estados = publicas.includes(nome) || w < 768 ? ['aberta'] : ['aberta', 'recolhida']
        for (const estado of estados) {
          await page.setViewportSize({ width: w, height: 800 })
          await page.goto('/univag')
          await page.evaluate((v) => localStorage.setItem('one-barra', v), estado)
          await page.goto(caminho)
          await preparar(page)
          const [rolagem, janela] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth])
          expect(rolagem, `${nome} a ${w} px (${estado})`).toBeLessThanOrEqual(janela)
        }
      }
    }
  })

  test('colunas pela largura do main', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 900, height: 800 })
    await page.goto('/univag/fila')
    await page.getByText('ONE-123').waitFor()
    expect(await page.locator('main > div').evaluate((e) => [getComputedStyle(e).containerType, getComputedStyle(e).containerName])).toEqual(['inline-size', 'main'])
    // a mesma janela de 900 px: barra aberta, main de 644 px (estreito); recolhida, de 852 px (largo)
    await expect(page.getByRole('columnheader')).toHaveText(['Número', 'Título', 'Estado'])
    await page.evaluate(() => localStorage.setItem('one-barra', 'recolhida'))
    await page.goto('/univag/fila')
    await page.getByText('ONE-123').waitFor()
    await expect(page.getByRole('columnheader')).toHaveText(['Número', 'Título', 'Categoria', 'Responsável', 'Dias', 'Estado'])
  })

  // C22: no estreito os cabeçalhos "largo" somem e os valores vão para uma linha de 12 px sob a coluna principal
  test('colunas largas somem no estreito', async ({ page }) => {
    await simularApi(page)
    await page.route('**/api/admin/setores', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, nome: 'Secretaria', triagem: true, ativo: true }]) }))
    const Telas5: [string, string, string[], string][] = [
      ['/univag/fila', 'ONE-123', ['Categoria', 'Responsável', 'Dias'], 'Financeiro > Boletos e mensalidades · Carla Regina de Souza · 12 dias'],
      ['/univag/usuarios', 'Carla Regina de Souza Albuquerque', ['CPF', 'E-mail', 'Papéis'], '12345678909 · carla.regina.albuquerque@univag.edu.br · Atendente, Administrador'],
      ['/univag/artigos', 'Como emitir a segunda via', ['Categoria', 'Versão', 'Validade'], 'Financeiro > Boletos e mensalidades · versão 12'],
      ['/univag/documentos', 'Regulamento do estágio', ['Categoria', 'Versão', 'Arquivo'], 'Financeiro > Boletos e mensalidades · versão 3 · 42 páginas · regulamento-do-estagio-supervisionado-obrigatorio-2026.pdf'],
      ['/univag/cadastros', 'Secretaria', ['Detalhe'], 'triagem'],
    ]
    for (const [caminho, espera, largos, linha] of Telas5) {
      await page.setViewportSize({ width: 360, height: 800 })
      await page.goto(caminho)
      await page.getByText(espera).first().waitFor()
      const cabecalhos = page.getByRole('columnheader')
      for (const l of largos) await expect(cabecalhos.filter({ hasText: l }), `${caminho} a 360 px: ${l}`).toHaveCount(0)
      const detalhe = page.locator('tbody div.text-xs').first()
      await expect(detalhe, caminho).toContainText(linha)
      expect(await detalhe.evaluate((e) => getComputedStyle(e).fontSize), caminho).toBe('12px')
      // o cabeçalho da tabela tem o fundo --muted
      const fundos = await page.evaluate(() => {
        const sonda = document.createElement('div')
        sonda.style.background = 'var(--muted)'
        document.body.append(sonda)
        const muted = getComputedStyle(sonda).backgroundColor
        sonda.remove()
        return [getComputedStyle(document.querySelector('thead')!).backgroundColor, muted]
      })
      expect(fundos[0], caminho).toBe(fundos[1])

      await page.setViewportSize({ width: 1280, height: 800 })
      await assentar(page)
      for (const l of largos) await expect(cabecalhos.filter({ hasText: l }), `${caminho} a 1280 px: ${l}`).toHaveCount(1)
      await expect(detalhe, caminho).toBeHidden()
    }
  })

  // C23
  test('linha da lista abre o chamado', async ({ page }) => {
    await simularApi(page)
    for (const caminho of ['/univag/fila', '/univag/solicitacoes']) {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(caminho)
      const linha = page.getByRole('row').filter({ hasText: 'ONE-123' })
      await linha.waitFor()
      await linha.locator('[data-slot=badge]').click()
      await expect(page, caminho).toHaveURL(/\/univag\/chamados\/ONE-123$/)
      // o número é um link que recebe foco pelo Tab
      await page.goto(caminho)
      await linha.waitFor()
      let focado = false
      for (let i = 0; i < 40 && !focado; i++) {
        await page.keyboard.press('Tab')
        focado = await page.evaluate(() => document.activeElement?.tagName === 'A' && document.activeElement.textContent === 'ONE-123')
      }
      expect(focado, caminho).toBe(true)
    }
  })

  // C26
  test('Cadastros com select no estreito', async ({ page }) => {
    await simularApi(page)
    await page.route('**/api/admin/cursos', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 4, nome: 'Direito', setorCoordenacaoId: null }]) }))
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/univag/cadastros')
    const abas = page.getByRole('tablist')
    const select = page.getByRole('combobox', { name: 'Cadastro' })
    await select.waitFor()
    await expect(abas).toBeHidden()
    expect(await select.locator('option').allTextContents()).toEqual(['Setores', 'Categorias', 'Cursos', 'Regras', 'Respostas prontas'])
    await select.selectOption({ label: 'Cursos' })
    await expect(page.getByRole('tabpanel').getByRole('button', { name: 'Direito' })).toBeVisible()

    await page.setViewportSize({ width: 1440, height: 800 })
    await assentar(page)
    await expect(abas).toBeVisible()
    await expect(select).toBeHidden()
    // C44: as abas à esquerda e "Novo" à direita, na mesma linha
    const a = await caixa(abas)
    const novo = await caixa(page.getByRole('button', { name: /Novo/ }))
    expect(Math.abs(a.y + a.height / 2 - (novo.y + novo.height / 2)), 'mesma linha').toBeLessThanOrEqual(4)
    expect(novo.x, 'Novo à direita das abas').toBeGreaterThanOrEqual(a.x + a.width - 1)
  })

  test('recuos do conteúdo', async ({ page }) => {
    await simularApi(page)
    // [largura da janela, barra recolhida, recuo esquerdo, distância ao cabeçalho]
    for (const [w, barraRecolhida, lado, topo] of [[360, false, 16, 16], [768, true, 16, 24], [1280, false, 24, 24]] as const) {
      await page.setViewportSize({ width: w, height: 800 })
      await page.goto('/univag')
      await page.evaluate((v) => localStorage.setItem('one-barra', v), barraRecolhida ? 'recolhida' : 'aberta')
      await page.goto('/univag/fila')
      await page.getByText('ONE-123').waitFor()
      const main = await caixa(page.locator('main'))
      const cabecalho = await caixa(page.locator('main > header'))
      const bloco = await caixa(page.locator('main > div > div').first())
      expect(Math.abs(bloco.x - (main.x + lado)), `${w} px: recuo esquerdo`).toBeLessThanOrEqual(1)
      expect(Math.abs(bloco.y - (cabecalho.y + cabecalho.height + topo)), `${w} px: distância ao cabeçalho`).toBeLessThanOrEqual(1)
    }
  })

  // C49
  test('lista vazia centralizada', async ({ page }) => {
    await simularApi(page)
    await page.route((url) => url.pathname === '/api/chamados' && url.search.includes('escopo=fila'), (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    for (const w of [360, 1280]) {
      await page.setViewportSize({ width: w, height: 800 })
      await page.goto('/univag/fila')
      const celula = page.getByRole('cell', { name: 'Nenhum chamado na fila dos seus setores.' })
      await celula.waitFor()
      expect(await celula.evaluate((e) => getComputedStyle(e).textAlign), `${w} px: alinhamento`).toBe('center')
      expect(Math.abs((await caixa(page.locator('tbody tr'))).height - 96), `${w} px: altura da linha`).toBeLessThanOrEqual(1)
    }
  })

  // C51
  test.describe('cabeçalho medido', () => {
    test.use({ serviceWorkers: 'allow' })

    test('cabeçalho: borda, título numa linha e botões de 36 px', async ({ page }) => {
      await simularApi(page)
      await page.route('**/api/push/chave', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ chavePublica: 'BAEC' }) }))
      for (const w of [360, 1280]) {
        await page.setViewportSize({ width: w, height: 800 })
        await page.goto('/univag/fila')
        const cabecalho = page.locator('main > header')
        const avisos = cabecalho.getByRole('button', { name: 'Ativar avisos neste aparelho' })
        await avisos.waitFor()
        expect(await cabecalho.evaluate((e) => getComputedStyle(e).borderBottomWidth), `${w} px: borda inferior`).toBe('1px')
        const h1 = cabecalho.getByRole('heading', { level: 1 })
        expect(await h1.evaluate((e) => [getComputedStyle(e).whiteSpace, getComputedStyle(e).textOverflow]), `${w} px: h1`).toEqual(['nowrap', 'ellipsis'])
        await h1.evaluate((e) => (e.textContent = 'Um título de tela muito mais longo do que cabe ao lado dos botões do cabeçalho, para forçar o corte'))
        const tema = cabecalho.getByRole('button', { name: 'Tema' })
        const [t, h] = [await caixa(tema), await caixa(h1)]
        expect(h.x + h.width, `${w} px: título longo não passa de Tema`).toBeLessThanOrEqual(t.x + 1)
        expect(h.height, `${w} px: título numa linha`).toBeLessThanOrEqual(24)
        for (const [nome, b] of [['Tema', t], ['Avisos', await caixa(avisos)]] as const) {
          expect([Math.abs(b.width - 36) <= 1, Math.abs(b.height - 36) <= 1], `${w} px: ${nome} 36 x 36`).toEqual([true, true])
        }
      }
    })
  })

  // C52
  test('grupos rolam e iniciais na barra recolhida', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 1280, height: 600 })
    await page.goto('/univag/fila')
    const barra = page.locator(Conteiner)
    const grupos = barra.locator('[data-slot=sidebar-content]')
    const usuario = barra.getByRole('button', { name: /Ana/ })
    await usuario.waitFor()
    expect(await grupos.evaluate((e) => [getComputedStyle(e).overflowY, e.scrollHeight > e.clientHeight]), 'grupos rolam').toEqual(['auto', true])
    const u = await caixa(usuario)
    expect(u.y + u.height, 'botão do usuário dentro da janela').toBeLessThanOrEqual(600 + 1)
    expect(u.y, 'botão do usuário embaixo').toBeGreaterThan(300)

    await recolhida(page)
    await page.goto('/univag/fila')
    await expect.poll(() => largura(page)).toBe(48)
    const iniciais = await caixa(barra.getByText('A', { exact: true }))
    expect([Math.abs(iniciais.width - 32) <= 1, Math.abs(iniciais.height - 32) <= 1], 'quadrado de 32 x 32').toEqual([true, true])
    expect(iniciais.x, 'iniciais dentro da barra').toBeGreaterThanOrEqual(-1)
    expect(iniciais.x + iniciais.width, 'iniciais dentro da barra').toBeLessThanOrEqual(49)
  })

  // C53
  test('valores de tipo e bordas', async ({ page }) => {
    await simularApi(page, undefined, true) // com 2 linhas na Fila: a última linha não leva borda
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/univag/indicadores')
    await page.getByText('Indicador principal').waitFor()
    const mudo = await page.evaluate(() => {
      const p = document.createElement('i')
      p.style.color = 'var(--muted-foreground)'
      document.body.append(p)
      return getComputedStyle(p).color
    })
    const estilo = (l: Locator) =>
      l.evaluate((e) => {
        const c = getComputedStyle(e)
        return { tam: c.fontSize, peso: c.fontWeight, cor: c.color, num: c.fontVariantNumeric, quebra: c.whiteSpace, grampo: c.getPropertyValue('-webkit-line-clamp') }
      })
    const rodapes = [
      'Resolvidas sem reabertura, sobre as conversas com desfecho',
      'Chamados não fechados neste momento',
      'Resolvidas pelo assistente, sobre as conversas com desfecho',
      'Da abertura à primeira resposta pública',
    ]
    for (const texto of rodapes) {
      const l = page.getByText(texto, { exact: true })
      const e = await estilo(l)
      expect([e.tam, e.cor], `rodapé "${texto}"`).toEqual(['14px', mudo])
      expect(e.grampo === '1' || e.quebra === 'nowrap', `rodapé "${texto}" numa linha`).toBe(true)
      expect((await caixa(l)).height, `rodapé "${texto}" renderiza numa linha`).toBeLessThanOrEqual(24)
    }
    expect((await estilo(page.locator('[data-slot=card-title]').first())).peso, 'valor do destaque').toBe('600')
    // compactos: os cartões sem nenhum filho com data-slot
    const compacto = page.locator('[data-slot=card]').filter({ hasNot: page.locator('[data-slot]') }).first()
    const [rotulo, valor] = [await estilo(compacto.locator('> div').nth(0)), await estilo(compacto.locator('> div').nth(1))]
    expect(rotulo.tam, 'rótulo do compacto').toBe('14px')
    expect(valor.peso, 'valor do compacto').toBe('600')
    expect(valor.num, 'valor do compacto').toContain('tabular-nums')

    await page.goto('/univag/fila')
    await page.getByText('ONE-123').waitFor()
    const cabecalho = await estilo(page.getByRole('columnheader', { name: 'Número' }))
    expect([cabecalho.tam, cabecalho.peso], 'cabeçalho da tabela').toEqual(['14px', '500'])
    const caixaTabela = page.locator('[data-slot=table-container]').locator('..')
    expect(await caixaTabela.evaluate((e) => { const c = getComputedStyle(e); return [c.borderTopWidth, c.borderLeftWidth, c.borderTopLeftRadius] }), 'caixa da tabela').toEqual(['1px', '1px', '8px'])
    expect(await page.locator('tbody tr').first().evaluate((e) => getComputedStyle(e).borderBottomWidth), 'borda entre linhas').toBe('1px')
  })

  // C54
  test('texto das linhas de 14 px', async ({ page }) => {
    await simularApi(page)
    for (const w of [360, 1440]) {
      await page.setViewportSize({ width: w, height: 900 })
      await page.goto('/univag/fila')
      const celula = page.locator('tbody tr').first().locator('td').first()
      await celula.waitFor()
      expect(await celula.evaluate((e) => getComputedStyle(e).fontSize), `${w} px: célula do corpo`).toBe('14px')
    }
  })

  // C55
  test('ícones centralizados na barra recolhida', async ({ page }) => {
    await simularApi(page)
    await recolhida(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/univag/fila')
    const barra = page.locator(Conteiner)
    await expect.poll(() => largura(page)).toBe(48)
    const centro = async (l: Locator) => { const c = await caixa(l); return c.x + c.width / 2 }
    for (const rotulo of Links) expect(Math.abs((await centro(barra.getByRole('link', { name: rotulo }).locator('svg'))) - 24), `ícone de ${rotulo}`).toBeLessThanOrEqual(1)
    expect(Math.abs((await centro(barra.getByText('A', { exact: true }))) - 24), 'iniciais').toBeLessThanOrEqual(1)
  })
})

// login-institucional: as 3 telas de entrada na grade do login-02 (checks C1-C15)
const Entradas = ['/univag', '/univag/primeiro-acesso', '/univag/definir-senha?token=t']
const NomeSimulado = 'Centro Universitário de Várzea Grande' // o `nome` de simulada.ts

test.describe('entrada institucional', () => {
  const ir = async (page: Page, caminho: string, w: number, h = 800) => {
    await simularApi(page)
    await page.setViewportSize({ width: w, height: h })
    await page.goto(caminho)
    await page.locator('h1').waitFor()
  }
  const bloco = (page: Page) => page.locator('h1').locator('xpath=..')
  const campo = (l: Locator) => l.locator('xpath=..') // o Campo inteiro: rótulo, campo e dica
  const coluna = (page: Page) => page.locator('h1').locator('xpath=../../..')
  const painel = (page: Page) => page.locator('h2').locator('xpath=../..')
  const marca = (page: Page) => coluna(page).locator('> div').first()
  const perto = (a: number, b: number, rotulo: string, tol = 1) => expect(Math.abs(a - b), `${rotulo}: ${a} contra ${b}`).toBeLessThanOrEqual(tol)
  const estilo = (l: Locator, ...props: string[]) => l.evaluate((e, ps) => ps.map((p) => getComputedStyle(e).getPropertyValue(p)), props)
  // a cor computada de um elemento de prova com color: var(token), como no C53
  const cor = (page: Page, token: string) =>
    page.evaluate((t) => {
      const p = document.createElement('i')
      p.style.color = `var(${t})`
      document.body.append(p)
      return getComputedStyle(p).color
    }, token)

  test('entrada em duas colunas', async ({ page }) => {
    for (const caminho of Entradas)
      for (const w of [1024, 1280, 1440]) {
        await ir(page, caminho, w)
        const [c, p] = [await caixa(coluna(page)), await caixa(painel(page))]
        const r = `${caminho} a ${w}`
        perto(c.x, 0, `${r}: x da coluna`)
        perto(c.width, w / 2, `${r}: largura da coluna`)
        perto(p.x, w / 2, `${r}: x do painel`)
        perto(p.width, w / 2, `${r}: largura do painel`)
        perto(p.y, 0, `${r}: y do painel`)
        expect(p.height, `${r}: altura do painel`).toBeGreaterThanOrEqual(800 - 1)
      }
  })

  test('entrada numa coluna abaixo de 1024 px', async ({ page }) => {
    for (const caminho of Entradas)
      for (const w of [360, 768, 1023]) {
        await ir(page, caminho, w)
        const r = `${caminho} a ${w}`
        expect(await painel(page).evaluate((e) => getComputedStyle(e).display), `${r}: painel`).toBe('none')
        perto((await caixa(coluna(page))).width, w, `${r}: coluna`)
      }
  })

  test('recuo da coluna de entrada', async ({ page }) => {
    for (const caminho of Entradas)
      for (const [w, esperado] of [[360, '24px'], [767, '24px'], [768, '40px'], [1280, '40px']] as const) {
        await ir(page, caminho, w)
        expect(await estilo(coluna(page), 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'), `${caminho} a ${w}`).toEqual([esperado, esperado, esperado, esperado])
      }
  })

  test('linha da marca na entrada', async ({ page }) => {
    for (const caminho of Entradas)
      for (const w of [360, 767, 768, 1280]) {
        await ir(page, caminho, w)
        const r = `${caminho} a ${w}`
        const [linha, icone, one] = [marca(page), marca(page).locator('svg.lucide-graduation-cap'), marca(page).getByText('One', { exact: true })]
        const [i, o, l, c] = [await caixa(icone), await caixa(one), await caixa(linha), await caixa(coluna(page))]
        perto(i.width, 24, `${r}: largura do ícone`)
        perto(i.height, 24, `${r}: altura do ícone`)
        expect((await estilo(icone, 'color'))[0], `${r}: cor do ícone`).toBe(await cor(page, '--primary'))
        expect(await estilo(one, 'font-size', 'font-weight', 'color'), `${r}: "One"`).toEqual(['16px', '600', await cor(page, '--primary')])
        perto(o.x, i.x + i.width + 8, `${r}: espaço entre ícone e "One"`)
        perto(o.y + o.height / 2, i.y + i.height / 2, `${r}: mesma linha`, 2)
        expect(await icone.locator('xpath=ancestor::a | ancestor::button').count(), `${r}: sem link nem botão`).toBe(0)
        if (w < 768) {
          perto(l.x + l.width / 2, c.x + c.width / 2, `${r}: centro da linha`)
          perto(Math.min(i.y, o.y), 24, `${r}: topo`)
        } else {
          perto(i.x, 40, `${r}: x da linha`)
          perto(Math.min(i.y, o.y), 40, `${r}: topo`)
        }
      }
  })

  test('bloco do formulário por largura', async ({ page }) => {
    for (const caminho of Entradas) {
      for (const [w, largura, x] of [[360, 312, 24], [390, 320, 35], [768, 320, 224], [1024, 320, 96], [1280, 320, 160], [1440, 320, 200]] as const) {
        await ir(page, caminho, w)
        const b = await caixa(bloco(page))
        perto(b.width, largura, `${caminho} a ${w}: largura`)
        perto(b.x, x, `${caminho} a ${w}: x`)
      }
      for (const [w, recuo] of [[360, 24], [1280, 40]] as const) {
        await ir(page, caminho, w, 900)
        const [b, m] = [await caixa(bloco(page)), await caixa(marca(page))]
        const [topo, base] = [m.y + m.height + 16, 900 - recuo]
        perto(b.y + b.height / 2, (topo + base) / 2, `${caminho} a ${w}: centro vertical`)
      }
    }
  })

  test('cabeçalho do Login', async ({ page }) => {
    for (const w of [360, 1280]) {
      await ir(page, '/univag', w)
      const r = `Login a ${w}`
      expect(await page.locator('h1').count(), `${r}: um só h1`).toBe(1)
      expect(await page.locator('h1').textContent(), `${r}: nome`).toBe(NomeSimulado)
      expect(await estilo(page.locator('h1'), 'font-size', 'font-weight', 'text-align'), `${r}: h1`).toEqual(['24px', '600', 'center'])
      const frase = page.getByText('Entre com seu CPF e sua senha.', { exact: true })
      expect(await estilo(frase, 'font-size', 'color'), `${r}: frase`).toEqual(['14px', await cor(page, '--muted-foreground')])
      const [h, f, cpf] = [await caixa(page.locator('h1')), await caixa(frase), await caixa(campo(page.getByLabel('CPF')))]
      perto(f.y, h.y + h.height + 4, `${r}: frase`)
      perto(cpf.y, f.y + f.height + 24, `${r}: CPF`)
    }
  })

  test('cabeçalho de Primeiro acesso e Criar senha', async ({ page }) => {
    for (const w of [360, 1280]) {
      await ir(page, '/univag', w)
      const [login, estiloLogin, blocoLogin] = [await caixa(page.locator('h1')), await estilo(page.locator('h1'), 'font-size', 'font-weight', 'text-align'), await caixa(bloco(page))]
      perto(login.y, blocoLogin.y, `Login a ${w}: h1 no topo do bloco`)
      for (const [caminho, primeiro, botao] of [['/univag/primeiro-acesso', 'CPF', 'Enviar link'], ['/univag/definir-senha?token=t', 'Nova senha', 'Salvar senha']] as const) {
        await ir(page, caminho, w)
        const r = `${caminho} a ${w}`
        const h1 = page.locator('h1')
        expect(await estilo(h1, 'font-size', 'font-weight', 'text-align'), `${r}: h1`).toEqual(estiloLogin)
        const [h, primeiroCampo, b, blocoCaixa] = [await caixa(h1), await caixa(campo(page.getByLabel(primeiro))), await caixa(page.getByRole('button', { name: botao })), await caixa(bloco(page))]
        // C7 emendado (03/11): o h1 no topo do bloco, como no Login; o bloco segue centrado na vertical (C5), então o y muda com a altura do bloco
        perto(h.y, blocoCaixa.y, `${r}: h1 no topo do bloco`)
        perto(primeiroCampo.y, h.y + h.height + 24, `${r}: primeiro campo`)
        // nada entre o h1 e o campo: o rótulo é o primeiro elemento depois do h1
        expect(await h1.locator('xpath=following-sibling::*[1]//label').count(), `${r}: nada entre o h1 e o campo`).toBe(1)
        perto(b.width, (await caixa(page.getByLabel(primeiro))).width, `${r}: botão`)
        if (caminho.includes('primeiro')) {
          const voltar = await caixa(page.getByRole('link', { name: 'Voltar para o login' }))
          perto(voltar.x + voltar.width / 2, blocoCaixa.x + blocoCaixa.width / 2, `${r}: voltar`)
          await page.getByLabel('CPF').fill('12345678909')
          await page.route('**/api/auth/primeiro-acesso', (rota) => rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mensagem: 'Link enviado.' }) }))
          await page.getByRole('button', { name: botao }).click()
          const alerta = await caixa(page.getByRole('alert').filter({ hasText: 'Link enviado.' }))
          const h2 = await caixa(h1) // o bloco, mais baixo, recentra: o h1 se move
          perto(alerta.y, h2.y + h2.height + 24, `${r}: alerta de sucesso`)
        }
      }
    }
  })

  test('formulário do Login: espaços, erro e teclado', async ({ page }) => {
    for (const w of [360, 1280]) {
      await ir(page, '/univag', w)
      const r = `Login a ${w}`
      const [cpf, senha, entrar, link, b] = [page.getByLabel('CPF'), page.getByLabel('Senha'), page.getByRole('button', { name: 'Entrar' }), page.getByRole('link', { name: 'Primeiro acesso ou esqueci minha senha' }), bloco(page)]
      const [c, s, e, l, bb] = [await caixa(campo(cpf)), await caixa(campo(senha)), await caixa(entrar), await caixa(link), await caixa(b)]
      perto(s.y, c.y + c.height + 24, `${r}: Senha`)
      perto(e.y, s.y + s.height + 24, `${r}: Entrar`)
      perto(e.width, (await caixa(cpf)).width, `${r}: largura de Entrar`)
      expect(l.y, `${r}: link abaixo`).toBeGreaterThanOrEqual(e.y + e.height - 1)
      perto(l.x + l.width / 2, bb.x + bb.width / 2, `${r}: centro do link`)
      await cpf.focus()
      for (const alvo of [senha, entrar, link]) {
        await page.keyboard.press('Tab')
        await expect(alvo, `${r}: Tab`).toBeFocused()
      }
      await page.route('**/api/auth/login', (rota) => rota.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ status: 401, detail: 'CPF ou senha inválidos.' }) }))
      await cpf.fill('12345678909')
      await senha.fill('errada')
      await entrar.click()
      const erro = await caixa(page.getByRole('alert'))
      const e2 = await caixa(entrar)
      const l2 = await caixa(link)
      expect(erro.y, `${r}: erro abaixo de Entrar`).toBeGreaterThanOrEqual(e2.y + e2.height - 1)
      expect(l2.y, `${r}: link abaixo do erro`).toBeGreaterThanOrEqual(erro.y + erro.height - 1)
    }
  })

  test('fundo e borda do painel', async ({ page }) => {
    for (const caminho of Entradas)
      for (const w of [1024, 1440]) {
        await ir(page, caminho, w)
        const r = `${caminho} a ${w}`
        const esperado = await page.evaluate(() => {
          const p = document.createElement('i')
          p.className = 'bg-primary/5'
          document.body.append(p)
          return getComputedStyle(p).backgroundColor
        })
        expect(esperado, `${r}: prova com alfa`).not.toMatch(/^rgb\(|rgba\([^)]*,\s*0\)|\/\s*0\)/)
        const [fundo, largura, corBorda, p1, p2, p3, p4] = await estilo(painel(page), 'background-color', 'border-left-width', 'border-left-color', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left')
        expect(fundo, `${r}: fundo`).toBe(esperado)
        expect([largura, corBorda], `${r}: borda`).toEqual(['1px', await cor(page, '--border')])
        expect([p1, p2, p3, p4], `${r}: recuo`).toEqual(['40px', '40px', '40px', '40px'])
      }
  })

  test('conteúdo do painel', async ({ page }) => {
    await ir(page, '/univag', 1440)
    const p = painel(page).locator('> div')
    const [titulo, frase, lista] = [p.locator('h2'), p.locator('p'), p.locator('ul')]
    expect(await titulo.textContent()).toBe('Atendimento ao estudante')
    expect(await estilo(titulo, 'font-size', 'font-weight', 'color')).toEqual(['30px', '600', await cor(page, '--foreground')])
    expect(await frase.textContent()).toBe('Dúvidas, solicitações e respostas da sua instituição em um só lugar.')
    expect(await estilo(frase, 'font-size', 'color')).toEqual(['16px', await cor(page, '--muted-foreground')])
    const [t, f, l] = [await caixa(titulo), await caixa(frase), await caixa(lista)]
    perto(f.y, t.y + t.height + 8, 'frase')
    perto(l.y, f.y + f.height + 24, 'lista')
    const itens = lista.locator('> li')
    expect(await itens.count(), 'itens').toBe(3)
    const Itens = [['message-circle', 'Tire dúvidas com o assistente a qualquer hora'], ['list-checks', 'Acompanhe suas solicitações até a resposta'], ['users', 'Fale com a equipe da instituição quando precisar']]
    let anterior: { y: number; height: number } | undefined
    for (const [i, [icone, texto]] of Itens.entries()) {
      const item = itens.nth(i)
      expect(await item.textContent(), `item ${i}`).toBe(texto)
      const svg = item.locator(`svg.lucide-${icone}`)
      const [s, caixaItem] = [await caixa(svg), await caixa(item)]
      perto(s.width, 20, `ícone ${i}`)
      perto(s.height, 20, `ícone ${i}`)
      expect((await estilo(svg, 'color'))[0], `cor do ícone ${i}`).toBe(await cor(page, '--primary'))
      expect(await estilo(item, 'font-size', 'color'), `texto ${i}`).toEqual(['16px', await cor(page, '--foreground')])
      const textoX = await item.evaluate((e) => { const r = document.createRange(); r.selectNodeContents(e.lastChild!); return r.getBoundingClientRect().x })
      perto(textoX, s.x + s.width + 12, `espaço do item ${i}`)
      if (anterior) perto(caixaItem.y, anterior.y + anterior.height + 16, `espaço entre itens ${i}`)
      anterior = caixaItem
    }
    for (const caminho of Entradas.slice(1)) {
      await ir(page, caminho, 1440)
      await expect(page.getByRole('heading', { level: 2, name: 'Atendimento ao estudante' })).toBeVisible()
      expect(await painel(page).locator('li').count(), caminho).toBe(3)
    }
  })

  test('posição do conteúdo do painel', async ({ page }) => {
    for (const caminho of Entradas)
      for (const [w, h] of [[1024, 740], [1440, 900]] as const) {
        await ir(page, caminho, w, h)
        const r = `${caminho} a ${w}x${h}`
        const [p, c] = [await caixa(painel(page)), await caixa(painel(page).locator('> div'))]
        perto(c.y + c.height, p.y + p.height - 40, `${r}: base`)
        perto(c.x, w / 2 + 41, `${r}: x`)
        expect(c.width, `${r}: largura`).toBeLessThanOrEqual(448 + 1)
      }
  })

  test('carregando e instituição não encontrada no centro', async ({ page }) => {
    for (const w of [360, 1280]) {
      await page.setViewportSize({ width: w, height: 800 })
      await page.route('**/api/instituicoes/univag', () => {}) // nunca responde: a consulta fica pendente
      await page.goto('/univag')
      const spinner = page.getByRole('status')
      await spinner.waitFor()
      const s = await caixa(spinner) // o Spinner gira: a caixa inflada serve ao centro, o tamanho vem do estilo
      expect(await estilo(spinner, 'width', 'height'), `${w}: tamanho do Spinner`).toEqual(['32px', '32px'])
      perto(s.x + s.width / 2, w / 2, `${w}: centro x do Spinner`)
      perto(s.y + s.height / 2, 400, `${w}: centro y do Spinner`)
      expect(await page.locator('h1, h2').count(), `${w}: sem h1 nem painel carregando`).toBe(0)
      await page.unrouteAll()

      await page.route('**/api/instituicoes/univag', (rota) => rota.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 404, detail: 'Instituição não encontrada.' }) }))
      await page.goto('/univag')
      const alerta = page.getByRole('alert').filter({ hasText: 'Instituição não encontrada.' })
      await alerta.waitFor()
      const a = await caixa(alerta)
      perto(a.x + a.width / 2, w / 2, `${w}: centro x do Alert`)
      expect(await page.locator('h1, h2').count(), `${w}: sem h1 nem painel no erro`).toBe(0)
      await page.unrouteAll()
    }
  })

  // C23
  test('alerta de sucesso de Criar senha', async ({ page }) => {
    for (const w of [360, 1280]) {
      await ir(page, '/univag/definir-senha?token=t', w)
      await page.route('**/api/auth/definir-senha', (rota) => rota.fulfill({ status: 204 }))
      await page.getByLabel('Nova senha').fill('senha-nova-123')
      await page.getByRole('button', { name: 'Salvar senha' }).click()
      const alerta = await caixa(page.getByRole('alert').filter({ hasText: 'Senha criada.' }))
      const h = await caixa(page.locator('h1')) // o bloco, mais baixo, recentra: mede o h1 depois do envio
      perto(alerta.y, h.y + h.height + 24, `${w}: alerta de sucesso`)
      await page.unrouteAll()
    }
  })

  // C24
  test('instituição não encontrada no centro vertical', async ({ page }) => {
    for (const w of [360, 1280]) {
      await page.setViewportSize({ width: w, height: 800 })
      await page.route('**/api/instituicoes/univag', (rota) => rota.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ status: 404, detail: 'Instituição não encontrada.' }) }))
      await page.goto('/univag')
      const alerta = page.getByRole('alert').filter({ hasText: 'Instituição não encontrada.' })
      await alerta.waitFor()
      const a = await caixa(alerta)
      perto(a.y + a.height / 2, 400, `${w}: centro y do Alert`)
      await page.unrouteAll()
    }
  })

  // C25
  test('frase do Login centrada', async ({ page }) => {
    for (const w of [360, 1280]) {
      await ir(page, '/univag', w)
      const frase = page.getByText('Entre com seu CPF e sua senha.', { exact: true })
      expect(await estilo(frase, 'text-align'), `${w}: text-align`).toEqual(['center'])
      const [f, b] = [await caixa(frase), await caixa(bloco(page))]
      perto(f.x + f.width / 2, b.x + b.width / 2, `${w}: centro da frase`)
    }
  })
})
