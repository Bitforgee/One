import { expect, test, type Locator, type Page } from '@playwright/test'
import { existsSync, readdirSync } from 'node:fs'
import { comAparencia, instalar, referencia, semAparencia, simularApi, varrer } from './simulada'

// identidade-visual, lote 1 (S1 e S2): fontes, raios e login medidos no Chromium com a API simulada.
// Medidas por boundingBox() e getComputedStyle, em px CSS, tolerância de 1 px. A fonte é lida depois de document.fonts.ready.
test.use({ serviceWorkers: 'block' })

const Sans = '"Public Sans Variable"'
const Serifa = '"Source Serif 4 Variable"'
const Nome = 'Centro Universitário de Várzea Grande' // o `nome` de simulada.ts
const Entradas = ['/univag', '/univag/primeiro-acesso', '/univag/definir-senha?token=t']
const semFoto = { ...comAparencia, imagens: { ...comAparencia.imagens, login: null } }
const caixa = async (l: Locator) => (await l.boundingBox())!
const perto = (a: number, b: number, rotulo: string, tol = 1) => expect(Math.abs(a - b), `${rotulo}: ${a} contra ${b}`).toBeLessThanOrEqual(tol)
const fontes = (page: Page) => page.evaluate(async () => (await document.fonts.ready, [...document.fonts].map((f) => ({ family: f.family.replace(/"/g, ''), status: f.status }))))
const familia = (l: Locator) => l.evaluate((e) => getComputedStyle(e).fontFamily)
const estilo = (l: Locator, ...props: string[]) => l.evaluate((e, ps) => ps.map((p) => getComputedStyle(e).getPropertyValue(p)), props)
const sobre = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1

// A coluna do acesso: o menor elemento que contém o nome da instituição e o formulário
const coluna = (page: Page) =>
  page.locator('form').first().evaluateHandle((f) => {
    let n: Element = f
    while (!n.contains(document.querySelector('h1'))) n = n.parentElement!
    return n
  })
const colunaCaixa = async (page: Page) => {
  const h = await coluna(page)
  return (await h.evaluate((e) => e.getBoundingClientRect().toJSON())) as { x: number; y: number; width: number; height: number }
}

// ---------- S1: fontes ----------

test('Public Sans e Source Serif 4 carregadas e nenhuma Inter', async ({ page, baseURL }) => {
  const urls: string[] = []
  page.on('request', (r) => void urls.push(r.url()))
  await simularApi(page)
  await page.goto('/univag')
  await page.getByLabel('CPF').waitFor()
  expect(await page.evaluate(async () => (await document.fonts.ready, getComputedStyle(document.body).fontFamily))).toMatch(/^"Public Sans Variable"/)
  const faces = await fontes(page)
  for (const family of ['Public Sans Variable', 'Source Serif 4 Variable']) expect(faces.filter((f) => f.family === family && f.status === 'loaded').length, family).toBeGreaterThan(0)
  expect(faces.filter((f) => /inter/i.test(f.family)), 'sem Inter').toEqual([])
  expect(await page.evaluate(() => [document.fonts.check('16px "Public Sans Variable"'), document.fonts.check('28px "Source Serif 4 Variable"')])).toEqual([true, true])
  await page.goto('/univag/assistente')
  await page.getByLabel('Mensagem').waitFor()
  await page.goto('/univag/indicadores')
  await page.getByText('Indicador principal').waitFor()
  await page.evaluate(() => document.fonts.ready)
  expect(urls.filter((u) => /\/assets\/public-sans-latin-wght-normal-[^/]+\.woff2/.test(u)).length, 'Public Sans').toBeGreaterThanOrEqual(1)
  expect(urls.filter((u) => /\/assets\/source-serif-4-latin-wght-normal-[^/]+\.woff2/.test(u)).length, 'Source Serif 4').toBeGreaterThanOrEqual(1)
  expect(urls.filter((u) => u.includes('inter-')), 'nenhum URL com inter-').toEqual([])
  expect(urls.filter((u) => new URL(u).origin !== new URL(baseURL!).origin), 'só a origem do app').toEqual([])
})

// Telas da varredura em que os tipos de C3 aparecem; os menus abertos entram na própria varredura
test('texto e controles em Public Sans', async ({ page }) => {
  test.setTimeout(300_000)
  await instalar(page)
  const achados: Record<string, number> = { body: 0, button: 0, campo: 0, celula: 0, selo: 0, menu: 0, cabecalho: 0 }
  const medir = async (nome: string, largura: number) => {
    const r = await page.evaluate(async () => {
      await document.fonts.ready
      const visivel = (e: Element) => {
        const b = e.getBoundingClientRect()
        return e.checkVisibility() && b.width > 0 && b.height > 0
      }
      const proprio = (e: Element) => [...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())
      const tipos: Record<string, Element[]> = {
        body: [document.body],
        button: [...document.querySelectorAll('button, [data-slot=button]')],
        campo: [...document.querySelectorAll('input, textarea, select')],
        celula: [...document.querySelectorAll('td, th')],
        selo: [...document.querySelectorAll('[data-slot=badge]')],
        menu: [...document.querySelectorAll('[role=menuitem]')],
        cabecalho: [...document.querySelectorAll('header')].filter((h) => h.querySelector('h1') && getComputedStyle(h.querySelector('h1')!).fontSize === '16px'),
      }
      const fora: string[] = []
      const contagem: Record<string, number> = {}
      for (const [tipo, els] of Object.entries(tipos)) {
        contagem[tipo] = 0
        for (const raiz of els.filter(visivel)) {
          const alvos = tipo === 'body' ? [raiz] : [raiz, ...raiz.querySelectorAll('*')].filter((e) => visivel(e) && (proprio(e) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)))
          for (const e of alvos) {
            contagem[tipo]++
            if (!getComputedStyle(e).fontFamily.startsWith('"Public Sans Variable"')) fora.push(`${tipo} ${e.tagName}: ${(e.textContent ?? '').trim().slice(0, 30)}`)
          }
        }
      }
      return { fora, contagem }
    })
    expect(r.fora, `${nome} a ${largura}`).toEqual([])
    for (const [k, v] of Object.entries(r.contagem)) achados[k] += v
  }
  for (const largura of [390, 1440]) {
    await page.setViewportSize({ width: largura, height: 900 })
    await varrer(page, async (nome) => {
      await medir(nome, largura)
      if (nome === 'Artigos') {
        await page.getByRole('button', { name: /^Ações de / }).first().click()
        await page.getByRole('menuitem').first().waitFor()
        await medir(`${nome} com o menu`, largura)
        await page.keyboard.press('Escape')
      }
      if (nome === 'Fila') {
        if (largura < 768) await page.getByRole('button', { name: 'Alternar barra lateral' }).click()
        await page.locator('[data-sidebar=sidebar]').getByRole('button', { name: /Ana/ }).click()
        await page.getByRole('menuitem').first().waitFor()
        await medir(`${nome} com o menu do usuário`, largura)
        await page.keyboard.press('Escape')
      }
    })
  }
  for (const [tipo, n] of Object.entries(achados)) expect(n, `ao menos 1 elemento de ${tipo}`).toBeGreaterThan(0)
})

// C4, a parte do lote 1: Login, Primeiro acesso, Criar senha e a raiz. O lote 2 estende a mesma varredura ao Assistente sem conversa,
// a Indicadores e ao detalhe do chamado.
test('serifa só em títulos de 20 px ou mais', async ({ page }) => {
  const serifas: Record<string, number> = {}
  for (const largura of [390, 1440])
    for (const [nome, caminho] of [['Login', '/univag'], ['Primeiro acesso', '/univag/primeiro-acesso'], ['Criar senha', '/univag/definir-senha?token=t'], ['Raiz', '/']] as const) {
      await page.unroute('**/api/**').catch(() => {})
      await simularApi(page)
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto(caminho)
      await page.locator('h1').waitFor()
      const r = await page.evaluate(async () => {
        await document.fonts.ready
        const visivel = (e: Element) => e.checkVisibility() && e.getBoundingClientRect().width > 0
        const serifa = (e: Element) => getComputedStyle(e).fontFamily.startsWith('"Source Serif 4 Variable"')
        const todos = [...document.querySelectorAll('body *')].filter(visivel)
        return {
          serifas: todos.filter(serifa).map((e) => ({ tag: e.tagName, tam: parseFloat(getComputedStyle(e).fontSize) })),
          titulos: todos.filter((e) => /^H[12]$/.test(e.tagName) && !e.closest('header')).map((e) => ({ tam: parseFloat(getComputedStyle(e).fontSize), serifa: serifa(e) })),
        }
      })
      const rotulo = `${nome} a ${largura}`
      for (const s of r.serifas) {
        expect(s.tam, `${rotulo}: serifa com 20 px ou mais`).toBeGreaterThanOrEqual(20)
        expect(['H1', 'H2'], `${rotulo}: serifa só em h1 ou h2`).toContain(s.tag)
      }
      for (const t of r.titulos) expect(t.serifa, `${rotulo}: título de ${t.tam} px`).toBe(t.tam >= 20)
      serifas[nome] = (serifas[nome] ?? 0) + r.serifas.length
    }
  for (const nome of ['Login', 'Raiz']) expect(serifas[nome], `serifa em ${nome}`).toBeGreaterThan(0)
})

// ---------- S1: raios ----------

const quatro = (l: Locator) => l.evaluate((e) => ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((p) => parseFloat(getComputedStyle(e)[p as 'borderTopLeftRadius'])))

async function abrirMenuDeArtigos(page: Page) {
  await page.goto('/univag/artigos')
  await page.getByText('ARQUIVADO').first().waitFor()
  await page.getByRole('button', { name: /^Ações de / }).first().click()
  await page.getByRole('menu').waitFor()
}

test('raio pelo papel do componente', async ({ page }) => {
  test.setTimeout(120_000)
  const medidas: [string, number[]][] = []
  const todos = (rotulo: string, valores: number[], esperado: number) => {
    expect(valores, rotulo).toEqual([esperado, esperado, esperado, esperado])
    medidas.push([rotulo, valores])
  }
  const pilula = async (rotulo: string, l: Locator) => {
    await expect(l, rotulo).toHaveCount(1)
    const [r, c] = [await quatro(l), await caixa(l)]
    for (const v of r) expect(v, `${rotulo}: pílula`).toBeGreaterThanOrEqual(Math.min(c.width, c.height) / 2 - 1)
    medidas.push([rotulo, r])
  }
  const em = async (largura: number, caminho: string, espera: (p: Page) => Promise<unknown>) => {
    await page.unroute('**/api/**').catch(() => {})
    await simularApi(page)
    await page.setViewportSize({ width: largura, height: 900 })
    await page.goto(caminho)
    await espera(page)
  }

  // campo (4 px)
  await em(1440, '/univag', (p) => p.getByLabel('CPF').waitFor())
  todos('Input CPF', await quatro(page.getByLabel('CPF')), 4)
  await em(1440, '/univag/assistente', (p) => p.getByLabel('Mensagem').waitFor())
  todos('Textarea Mensagem', await quatro(page.getByLabel('Mensagem')), 4)
  await em(390, '/univag/cadastros', (p) => p.getByText('Coordenação de Análise e Des').first().waitFor())
  todos('NativeSelect de Cadastros', await quatro(page.locator('[data-slot=native-select]').first()), 4)

  // linha de lista (4 px) e linhas sem raio (0)
  await em(1440, '/univag/artigos', (p) => p.getByText('ARQUIVADO').first().waitFor())
  await page.getByRole('button', { name: /^Ações de / }).first().click()
  await page.getByRole('menu').waitFor()
  todos('primeiro item do menu Ações', await quatro(page.getByRole('menuitem').first()), 4)
  todos('menu Ações de Artigos', await quatro(page.getByRole('menu')), 16)
  await em(1440, '/univag/fila', (p) => p.getByText('ONE-123').waitFor())
  todos('item ativo da barra lateral', await quatro(page.locator('[data-sidebar=menu-button][data-active=true]')), 4)
  await em(390, '/univag/fila', (p) => p.getByText('ONE-123').waitFor())
  todos('linha da Fila', await quatro(page.getByRole('main').getByRole('listitem').first()), 0)
  await em(390, '/univag/solicitacoes', (p) => p.getByText('ONE-123').waitFor())
  todos('linha de Minhas solicitações', await quatro(page.getByRole('main').getByRole('listitem').first()), 0)

  // botão (6 px)
  await em(1440, '/univag', (p) => p.getByLabel('CPF').waitFor())
  todos('"Entrar"', await quatro(page.getByRole('button', { name: 'Entrar' })), 6)
  await em(1440, '/univag/indicadores', (p) => p.getByText('Indicador principal').waitFor())
  todos('"Ver tabela"', await quatro(page.getByRole('button', { name: 'Ver tabela' }).first()), 6)
  await em(1440, '/univag/assistente', (p) => p.getByLabel('Mensagem').waitFor())
  await page.getByLabel('Mensagem').fill('preciso do boleto do semestre, onde encontro a segunda via?')
  await page.getByRole('button', { name: /Enviar/ }).click()
  await page.getByText('Isso resolveu?').waitFor()
  todos('"Falar com atendente"', await quatro(page.getByRole('button', { name: 'Falar com atendente' })), 6)
  todos('botão de link da resposta', await quatro(page.getByRole('link', { name: 'portal.univag.edu.br/financeiro/boletos/segunda-via' })), 6)
  await pilula('"Enviar"', page.getByRole('button', { name: /Enviar/ }))

  // pílula
  await em(1440, '/univag/fila', (p) => p.getByText('ONE-123').waitFor())
  await pilula('"Tema"', page.getByRole('button', { name: 'Tema' }))
  await pilula('selo "Aguardando aluno"', page.locator('[data-slot=badge]').filter({ hasText: 'Aguardando aluno' }).first())
  await em(1440, '/univag/matriculas', (p) => p.getByRole('heading', { level: 2 }).first().waitFor())
  await pilula('número "1" dos passos', page.locator('h2[id^=passo-] > span').first())

  // painel (12 px)
  await em(1440, '/univag/chamados/ONE-123', (p) => p.getByText('Resumo gerado por IA').waitFor())
  todos('cartão "Ações"', await quatro(page.locator('[data-slot=card]').filter({ has: page.getByText('Ações', { exact: true }) })), 12)
  await em(1440, '/univag/fila', (p) => p.getByText('ONE-123').waitFor())
  todos('caixa da tabela da Fila', await quatro(page.locator('[data-slot=table-container]').locator('..')), 12)
  await em(1440, '/univag/aparencia', (p) => p.getByLabel('Cor principal').waitFor())
  todos('painel da região "Prévia"', await quatro(page.getByRole('region', { name: 'Prévia' }).locator('> *').first()), 12)
  await em(390, '/univag/artigos', (p) => p.getByText('ARQUIVADO').first().waitFor())
  todos('cartão de uma linha de Artigos', await quatro(page.locator('[data-cartoes] [data-slot=table-row]').first()), 12)
  await em(390, '/univag/conta', (p) => p.getByText('***.456.789-**').waitFor())
  todos('lista agrupada da Conta', await quatro(page.getByRole('main').locator('ul').first()), 12)

  // Dialog, Sheet, menu (16 px)
  await em(1280, '/univag/chamados/ONE-123', (p) => p.getByText('Resumo gerado por IA').waitFor())
  await page.getByRole('button', { name: 'Encaminhar' }).first().click()
  todos('Dialog "Encaminhar para outro setor?"', await quatro(page.getByRole('dialog', { name: 'Encaminhar para outro setor?' })), 16)
  await em(390, '/univag/chamados/ONE-123', (p) => p.getByText('Resumo gerado por IA').waitFor())
  await page.getByRole('button', { name: 'Mais', exact: true }).click()
  const folha = await quatro(page.getByRole('dialog', { name: 'Mais ações' }))
  expect(folha.slice(0, 2), 'Sheet "Mais": cantos de cima').toEqual([16, 16])
  medidas.push(['Sheet "Mais"', folha])

  expect(medidas.length).toBe(23)
})

// C6, a parte do lote 1: as telas da varredura inteira; o lote 2 reafirma depois de Assistente, Indicadores e do detalhe mudarem
test('pílula só em avatar, botão de ícone, selo e passo', async ({ page }) => {
  test.setTimeout(300_000)
  await instalar(page)
  let pilulas = 0
  let botoes = 0
  for (const largura of [390, 1440]) {
    await page.setViewportSize({ width: largura, height: 900 })
    await varrer(
      page,
      async (nome) => {
        const r = await page.evaluate(() => {
          const visivel = (e: Element) => e.checkVisibility() && e.getBoundingClientRect().width > 0
          const rotulo = (e: Element) => `${e.tagName}${e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : ''}: ${(e.textContent ?? '').trim().slice(0, 25)}`
          const cantos = (e: Element) => ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((p) => parseFloat(getComputedStyle(e)[p as 'borderTopLeftRadius']))
          const permitida = (e: Element) =>
            e.tagName === 'IMG' || // a foto do assistente
            e.matches('[data-slot=badge]') ||
            e.matches('button[aria-label=Enviar], button[aria-label=Tema], button[aria-label*=avisos]') ||
            !!e.closest('button')?.matches('[data-sidebar=menu-button]') || // as iniciais do usuário
            e.matches('h2[id^=passo-] > span')
          const todos = [...document.querySelectorAll('body *')].filter(visivel).filter((e) => {
            const b = e.getBoundingClientRect()
            const lado = Math.min(b.width, b.height)
            return lado >= 8 && cantos(e).every((c) => c >= lado / 2 - 1 && c > 0)
          })
          const botoes = [...document.querySelectorAll('[data-slot=button]')].filter(visivel)
          return {
            pilulas: todos.length,
            proibidas: todos.filter((e) => !permitida(e)).map(rotulo),
            botoes: botoes.length,
            fora: botoes.filter((b) => !b.matches('[aria-label=Enviar], [aria-label=Tema], [aria-label*=avisos]') && !cantos(b).every((c) => c === 6)).map(rotulo),
          }
        })
        expect(r.proibidas, `${nome} a ${largura}: pílula fora da lista`).toEqual([])
        expect(r.fora, `${nome} a ${largura}: botão que não mede 6 px`).toEqual([])
        // Minhas solicitações não tem [data-slot=button] (o Tema é popover-trigger): a contagem de botões é a da varredura inteira
        botoes += r.botoes
        pilulas += r.pilulas
      },
      comAparencia,
    )
  }
  expect(pilulas, 'ao menos 1 pílula').toBeGreaterThan(0)
  expect(botoes, 'ao menos 1 botão').toBeGreaterThan(0)
})

// ---------- S1: PWA ----------

test.describe('PWA', () => {
  test.use({ serviceWorkers: 'allow' })
  test('fontes latin no precache com até 90 KB', async ({ page, request }) => {
    await simularApi(page)
    await page.goto('/univag')
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active)
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    const urls = await page.evaluate(async () => {
      const lista: string[] = []
      for (const nome of await caches.keys()) for (const r of await (await caches.open(nome)).keys()) lista.push(r.url)
      return lista
    })
    const sans = urls.filter((u) => /\/assets\/public-sans-latin-wght-normal-[^/]+\.woff2/.test(u))
    const serifa = urls.filter((u) => /\/assets\/source-serif-4-latin-wght-normal-[^/]+\.woff2/.test(u))
    expect(sans).toHaveLength(1)
    expect(serifa).toHaveLength(1)
    expect(urls.filter((u) => u.includes('/inter-'))).toEqual([])
    let total = 0
    for (const u of [...sans, ...serifa]) total += (await (await request.get(u)).body()).length
    expect(total).toBeLessThanOrEqual(90 * 1024)
    const pasta = `${process.cwd()}/../api/wwwroot/assets`
    expect(existsSync(pasta)).toBe(true)
    const arquivos = readdirSync(pasta)
    expect(arquivos.filter((a) => a.startsWith('inter-'))).toEqual([])
    expect(arquivos.filter((a) => a.startsWith('public-sans-latin-wght-normal-'))).toHaveLength(1)
    expect(arquivos.filter((a) => a.startsWith('source-serif-4-latin-wght-normal-'))).toHaveLength(1)
  })
})

// ---------- S2: login ----------

// C9: as 24 combinações (3 telas x 4 larguras x sem e com aparência sem foto)
test('login sem foto em coluna única de até 400 px', async ({ page }) => {
  test.setTimeout(120_000)
  let casos = 0
  for (const aparencia of [semAparencia, semFoto])
    for (const caminho of Entradas)
      for (const largura of [390, 1023, 1024, 1440]) {
        await page.unroute('**/api/**').catch(() => {})
        await simularApi(page, undefined, false, aparencia)
        await page.setViewportSize({ width: largura, height: 900 })
        await page.goto(caminho)
        await page.locator('h1').waitFor()
        const rotulo = `${caminho} a ${largura} ${aparencia === semAparencia ? 'sem' : 'com'} aparência`
        const c = await colunaCaixa(page)
        const janela = await page.evaluate(() => document.documentElement.clientWidth)
        expect(c.width, `${rotulo}: largura`).toBeLessThanOrEqual(401)
        perto(c.x + c.width / 2, janela / 2, `${rotulo}: centro`)
        const fora = await page.evaluate(async (c) => {
          await document.fonts.ready
          const col = [...document.querySelectorAll('form')][0]
          let coluna: Element = col
          while (!coluna.contains(document.querySelector('h1'))) coluna = coluna.parentElement!
          return [...document.querySelectorAll('#root *')]
            .filter((e) => !e.contains(coluna) && e.checkVisibility() && e.getBoundingClientRect().width > 1 && e.getBoundingClientRect().height > 1)
            .filter((e) => {
              const b = e.getBoundingClientRect()
              return b.left < c.x - 1 || b.right > c.x + c.width + 1
            })
            .map((e) => `${e.tagName}.${e.className}`.slice(0, 60))
        }, c)
        expect(fora, `${rotulo}: nada fora da faixa da coluna`).toEqual([])
        const proibidos = await page.evaluate(() => ({
          ilustracao: document.querySelectorAll('svg[data-ilustracao]').length,
          foto: document.querySelectorAll('img[src*="/imagens/login"]').length,
          gradiente: [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).backgroundImage.includes('gradient')).length,
        }))
        expect(proibidos, rotulo).toEqual({ ilustracao: 0, foto: 0, gradiente: 0 })
        casos++
      }
  expect(casos).toBe(24)
})

// C10
test('login sem foto: logo, nome, textos, formulário e itens nessa ordem', async ({ page }) => {
  const casos = [
    { rotulo: 'semAparencia', aparencia: semAparencia, marca: (p: Page) => p.getByText('CG', { exact: true }), titulo: 'Atendimento ao estudante', frase: 'Dúvidas, solicitações e respostas da sua instituição em um só lugar.', itens: ['Tire dúvidas com o assistente a qualquer hora', 'Acompanhe suas solicitações até a resposta', 'Fale com a equipe da instituição quando precisar'] },
    { rotulo: 'comAparencia', aparencia: semFoto, marca: (p: Page) => p.locator('img[src*="/imagens/logo"]'), titulo: 'Fale com a Univag', frase: 'Aqui você resolve tudo sobre a sua vida acadêmica.', itens: ['Boletos', 'Matrícula', 'Documentos'] },
  ]
  for (const largura of [390, 1440])
    for (const caso of casos) {
      await page.unroute('**/api/**').catch(() => {})
      await simularApi(page, undefined, false, caso.aparencia)
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/univag')
      await page.getByLabel('CPF').waitFor()
      const rotulo = `${caso.rotulo} a ${largura}`
      const marca = caso.marca(page)
      await expect(marca, `${rotulo}: marca`).toHaveCount(1)
      expect((await caixa(marca)).height, `${rotulo}: marca até 49 px`).toBeLessThanOrEqual(49)
      const nome = page.getByRole('heading', { level: 1, name: Nome })
      const apoio = page.getByText('Entre com seu CPF e sua senha.', { exact: true })
      const lista = page.locator('ul').filter({ has: page.locator('li') })
      await expect(lista.locator('li'), `${rotulo}: itens`).toHaveCount(3)
      for (const [i, item] of caso.itens.entries()) await expect(lista.locator('li').nth(i)).toHaveText(item)
      // o texto de apoio é o elemento que vem depois do nome no DOM
      expect(await nome.evaluate((e) => e.nextElementSibling?.textContent), `${rotulo}: apoio logo depois do nome`).toBe('Entre com seu CPF e sua senha.')
      const ordem = [
        marca,
        nome,
        apoio,
        page.getByRole('heading', { level: 2, name: caso.titulo }),
        page.getByText(caso.frase, { exact: true }),
        page.getByText('CPF', { exact: true }),
        page.getByText('Senha', { exact: true }),
        page.getByRole('button', { name: 'Entrar' }),
        page.getByRole('link', { name: 'Primeiro acesso ou esqueci minha senha' }),
        lista,
      ]
      let anterior = -Infinity
      for (const [i, l] of ordem.entries()) {
        await expect(l, `${rotulo}: elemento ${i}`).toHaveCount(1)
        const c = await caixa(l)
        expect(c.y, `${rotulo}: elemento ${i} depois do anterior`).toBeGreaterThanOrEqual(anterior - 1)
        anterior = c.y + c.height
      }
    }
})

// C11
test('login sem foto: nome em serifa de 28 px, textos secundários e fundo tingido', async ({ page }) => {
  await instalar(page)
  const pintada = (l: Locator) => l.evaluate((e) => window.__ux.pintar(['#fff', getComputedStyle(e).color]))
  for (const largura of [390, 1440])
    for (const [rotulo, aparencia, titulo, frase] of [
      ['sem cor', semAparencia, 'Atendimento ao estudante', 'Dúvidas, solicitações e respostas da sua instituição em um só lugar.'],
      ['com #8a1538', semFoto, 'Fale com a Univag', 'Aqui você resolve tudo sobre a sua vida acadêmica.'],
    ] as const) {
      await page.unroute('**/api/**').catch(() => {})
      await simularApi(page, undefined, false, aparencia)
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/univag')
      await page.getByLabel('CPF').waitFor()
      const r = `${rotulo} a ${largura}`
      await page.evaluate(() => document.fonts.ready)
      const nome = page.getByRole('heading', { level: 1 })
      expect(await familia(nome), `${r}: serifa`).toMatch(/^"Source Serif 4 Variable"/)
      expect((await estilo(nome, 'font-size'))[0], `${r}: 28 px`).toBe('28px')
      const mudo = await referencia(page, '--muted-foreground')
      expect(await pintada(page.getByRole('heading', { level: 2, name: titulo })), `${r}: título`).toEqual(mudo)
      expect(await pintada(page.getByText(frase, { exact: true })), `${r}: frase`).toEqual(mudo)
      const itens = page.locator('li')
      await expect(itens).toHaveCount(3)
      for (let i = 0; i < 3; i++) {
        const li = itens.nth(i)
        expect((await estilo(li, 'list-style-type'))[0], `${r}: marcador ${i}`).not.toBe('none')
        expect(await li.evaluate((e) => window.__ux.pintar(['#fff', getComputedStyle(e, '::marker').color])), `${r}: cor do marcador ${i}`).toEqual(mudo)
      }
      const fundo = await page.evaluate(() => {
        const ref = document.createElement('div')
        ref.style.backgroundColor = 'var(--background)'
        document.body.append(ref)
        const esperado = window.__ux.pintar(['#fff', getComputedStyle(ref).backgroundColor])
        ref.remove()
        const corpo = window.__ux.pintar(['#fff', getComputedStyle(document.body).backgroundColor])
        let col: Element = document.querySelector('form')!
        while (!col.contains(document.querySelector('h1'))) col = col.parentElement!
        const opacos: number[][] = []
        for (let n: Element | null = col; n; n = n.parentElement) {
          const cor = getComputedStyle(n).backgroundColor
          const [sobrePreto, sobreBranco] = [window.__ux.pintar(['#000', cor]), window.__ux.pintar(['#fff', cor])]
          if (sobrePreto.join() === sobreBranco.join()) opacos.push(sobrePreto)
        }
        return { esperado, corpo, opacos }
      })
      expect(fundo.corpo, `${r}: fundo do body`).toEqual(fundo.esperado)
      for (const o of fundo.opacos) expect(o, `${r}: nenhum outro fundo opaco`).toEqual(fundo.esperado)
    }
})

// C12
test('Primeiro acesso e Criar senha na mesma coluna', async ({ page }) => {
  for (const largura of [390, 1440])
    for (const [caminho, tela, campo, botao] of [['/univag/primeiro-acesso', 'Primeiro acesso', 'CPF', 'Enviar link'], ['/univag/definir-senha?token=t', 'Criar senha', 'Nova senha', 'Salvar senha']] as const) {
      await page.unroute('**/api/**').catch(() => {})
      await simularApi(page)
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto(caminho)
      await page.getByLabel(campo).waitFor()
      await page.evaluate(() => document.fonts.ready)
      const r = `${caminho} a ${largura}`
      const nome = page.getByRole('heading', { level: 1, name: Nome })
      await expect(nome, `${r}: nome`).toHaveCount(1)
      expect(await familia(nome), `${r}: serifa`).toMatch(/^"Source Serif 4 Variable"/)
      expect((await estilo(nome, 'font-size'))[0], `${r}: 28 px`).toBe('28px')
      const ordem = [
        page.getByText('CG', { exact: true }),
        nome,
        page.getByRole('heading', { level: 2, name: 'Atendimento ao estudante' }),
        page.getByText('Dúvidas, solicitações e respostas da sua instituição em um só lugar.', { exact: true }),
        page.getByRole('heading', { level: 2, name: tela }),
        page.getByText(campo, { exact: true }),
        page.getByRole('button', { name: botao }),
        page.locator('ul').filter({ has: page.getByText('Tire dúvidas com o assistente a qualquer hora') }),
      ]
      let anterior = -Infinity
      for (const [i, l] of ordem.entries()) {
        await expect(l, `${r}: elemento ${i}`).toHaveCount(1)
        const c = await caixa(l)
        expect(c.y, `${r}: elemento ${i} depois do anterior`).toBeGreaterThanOrEqual(anterior - 1)
        anterior = c.y + c.height
      }
      for (const item of ['Tire dúvidas com o assistente a qualquer hora', 'Acompanhe suas solicitações até a resposta', 'Fale com a equipe da instituição quando precisar']) await expect(page.getByText(item, { exact: true })).toHaveCount(1)
      await expect(page.getByText('Entre com seu CPF e sua senha.'), `${r}: sem o texto de apoio`).toHaveCount(0)
    }
})

// C13
test('login com foto: a foto na coluna direita inteira, sem texto nem gradiente', async ({ page }) => {
  for (const largura of [1024, 1440])
    for (const caminho of Entradas) {
      await page.unroute('**/api/**').catch(() => {})
      await simularApi(page, undefined, false, comAparencia)
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto(caminho)
      await page.locator('h1').waitFor()
      const r = `${caminho} a ${largura}`
      const foto = page.locator('img[src*="/imagens/login"]:visible')
      await expect(foto, `${r}: uma foto visível`).toHaveCount(1)
      const f = await caixa(foto)
      perto(f.x, largura / 2, `${r}: x`)
      perto(f.y, 0, `${r}: y`)
      perto(f.width, largura / 2, `${r}: largura`)
      const col = await colunaCaixa(page)
      const esquerda = await (await coluna(page)).evaluate((e) => e.parentElement!.getBoundingClientRect().bottom)
      expect(f.y + f.height, `${r}: base`).toBeGreaterThanOrEqual(899)
      perto(f.y + f.height, Math.max(esquerda, 900), `${r}: base contra a coluna ou a janela`)
      expect(await estilo(foto, 'object-fit'), r).toEqual(['cover'])
      await expect(foto).toHaveAttribute('alt', '')
      const cruzam = await page.evaluate((f) => {
        const proprio = (e: Element) => [...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())
        return [...document.querySelectorAll('body *')]
          .filter((e) => e.checkVisibility() && proprio(e))
          .filter((e) => {
            const b = e.getBoundingClientRect()
            return b.left < f.x + f.width - 1 && b.right > f.x + 1 && b.top < f.y + f.height - 1 && b.bottom > f.y + 1
          })
          .map((e) => e.textContent!.trim().slice(0, 30))
      }, f)
      expect(cruzam, `${r}: texto sobre a foto`).toEqual([])
      expect(await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).backgroundImage.includes('gradient')).length), `${r}: gradiente`).toBe(0)
      perto(col.x + col.width / 2, largura / 4, `${r}: centro da coluna`)
      expect(col.width, `${r}: largura da coluna`).toBeLessThanOrEqual(401)
    }
})

// C14
test('login com foto abaixo de 1024: faixa de 160 px acima do formulário', async ({ page }) => {
  for (const largura of [390, 1023])
    for (const caminho of Entradas) {
      await page.unroute('**/api/**').catch(() => {})
      await simularApi(page, undefined, false, comAparencia)
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto(caminho)
      await page.locator('h1').waitFor()
      const r = `${caminho} a ${largura}`
      const foto = page.locator('img[src*="/imagens/login"]:visible')
      await expect(foto, `${r}: uma foto visível`).toHaveCount(1)
      const [f, janela] = [await caixa(foto), await page.evaluate(() => document.documentElement.clientWidth)]
      perto(f.x, 0, `${r}: x`)
      perto(f.y, 0, `${r}: y`)
      perto(f.width, janela, `${r}: largura`)
      perto(f.height, 160, `${r}: altura`)
      const logo = await caixa(page.locator('img[src*="/imagens/logo"]'))
      const primeiro = await caixa(page.locator('form input').first())
      expect(f.y + f.height, `${r}: foto acima do logo`).toBeLessThanOrEqual(logo.y + 1)
      expect(logo.y + logo.height, `${r}: logo acima do primeiro campo`).toBeLessThanOrEqual(primeiro.y + 1)
      const cruzam = await page.evaluate((f) => {
        const proprio = (e: Element) => [...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())
        return [...document.querySelectorAll('body *')]
          .filter((e) => e.checkVisibility() && proprio(e))
          .filter((e) => {
            const b = e.getBoundingClientRect()
            return b.left < f.x + f.width - 1 && b.right > f.x + 1 && b.top < f.y + f.height - 1 && b.bottom > f.y + 1
          })
          .map((e) => e.textContent!.trim().slice(0, 30))
      }, f)
      expect(cruzam, `${r}: texto sobre a foto`).toEqual([])
      expect(await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).backgroundImage.includes('gradient')).length), `${r}: gradiente`).toBe(0)
    }
})

// C16 (a parte do Chromium)
test('raiz com One em serifa', async ({ page }) => {
  for (const largura of [360, 1280]) {
    await page.setViewportSize({ width: largura, height: 740 })
    await page.goto('/')
    const titulo = page.getByRole('heading', { name: 'One' })
    await titulo.waitFor()
    await page.evaluate(() => document.fonts.ready)
    expect(await familia(titulo), `${largura}: serifa`).toMatch(/^"Source Serif 4 Variable"/)
    for (const l of [titulo, page.getByText('Dúvidas, solicitações e respostas da sua instituição em um só lugar.', { exact: true }), page.getByText('Abra o endereço da sua instituição, por exemplo /univag.', { exact: true })]) {
      // o centro do texto, não da caixa: o Range do nó de texto
      const c = await l.evaluate((e) => {
        const r = document.createRange()
        r.selectNodeContents(e)
        const b = r.getBoundingClientRect()
        return b.x + b.width / 2
      })
      perto(c, largura / 2, `${largura}: centro do texto`)
    }
  }
})
