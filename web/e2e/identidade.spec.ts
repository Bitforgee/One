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

// C4: a varredura inteira mais o Assistente sem conversa. Serifa só em h1 ou h2 de conteúdo, no número principal de Indicadores e, na prévia da Aparência,
// no nome e no título das boas-vindas (as cópias pequenas dos dois)
test('serifa só em títulos de 20 px ou mais', async ({ page }) => {
  test.setTimeout(300_000)
  const serifas: Record<string, number> = {}
  const medir = async (nome: string, largura: number) => {
    const r = await page.evaluate(async () => {
      await document.fonts.ready
      const visivel = (e: Element) => e.checkVisibility() && e.getBoundingClientRect().width > 0
      const serifa = (e: Element) => getComputedStyle(e).fontFamily.startsWith('"Source Serif 4 Variable"')
      const todos = [...document.querySelectorAll('body *')].filter(visivel)
      const permitida = (e: Element) =>
        (/^H[12]$/.test(e.tagName) && !e.closest('header')) ||
        (e.matches('main div') && /^\d+(,\d)?%$/.test(e.textContent!.trim()) && e.children.length === 0) || // o número principal de Indicadores
        (e.tagName === 'P' && !!e.closest('section[aria-label="Prévia"]'))
      return {
        serifas: todos.filter(serifa).map((e) => ({ tag: e.tagName, tam: parseFloat(getComputedStyle(e).fontSize), permitida: permitida(e), texto: (e.textContent ?? '').trim().slice(0, 30) })),
        titulos: todos.filter((e) => /^H[12]$/.test(e.tagName) && !e.closest('header')).map((e) => ({ tam: parseFloat(getComputedStyle(e).fontSize), serifa: serifa(e) })),
      }
    })
    const rotulo = `${nome} a ${largura}`
    for (const s of r.serifas) {
      expect(s.tam, `${rotulo}: serifa com 20 px ou mais em ${s.texto}`).toBeGreaterThanOrEqual(20)
      expect(s.permitida, `${rotulo}: ${s.tag} em serifa: ${s.texto}`).toBe(true)
    }
    for (const t of r.titulos) expect(t.serifa, `${rotulo}: título de ${t.tam} px`).toBe(t.tam >= 20)
    serifas[nome] = (serifas[nome] ?? 0) + r.serifas.length
  }
  for (const largura of [390, 1440]) {
    await page.setViewportSize({ width: largura, height: 900 })
    await varrer(page, (nome) => medir(nome, largura), comAparencia)
    await em(page, largura, '/univag/assistente', esperaAssistente)
    await medir('Assistente sem conversa', largura)
  }
  for (const nome of ['Login', 'Assistente sem conversa', 'Indicadores', 'Detalhe do chamado', 'Raiz']) expect(serifas[nome], `serifa em ${nome}`).toBeGreaterThan(0)
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
      // o texto de apoio é o elemento imediatamente antes do rótulo "CPF" no DOM (o campo que o contém)
      expect(await page.getByText('CPF', { exact: true }).evaluate((e) => e.parentElement!.previousElementSibling?.textContent), `${rotulo}: apoio logo antes do rótulo CPF`).toBe('Entre com seu CPF e sua senha.')
      const ordem = [
        marca,
        nome,
        page.getByRole('heading', { level: 2, name: caso.titulo }),
        page.getByText(caso.frase, { exact: true }),
        apoio,
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

// ---------- lote 2 (S3, S4 e S5): telas autenticadas ----------

type Opcoes = { aparencia?: object; papeis?: string[]; rotas?: (p: Page) => Promise<unknown>; altura?: number }
async function em(page: Page, largura: number, caminho: string, espera: (p: Page) => Promise<unknown>, { aparencia = comAparencia, papeis, rotas, altura = 900 }: Opcoes = {}) {
  await page.unroute('**/api/**').catch(() => {})
  await simularApi(page, papeis, false, aparencia)
  await rotas?.(page)
  await page.setViewportSize({ width: largura, height: altura })
  await page.goto(caminho)
  await espera(page)
  await page.evaluate(() => document.fonts.ready)
}
const quatroLados = (l: Locator) => l.evaluate((e) => ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((p) => parseFloat(getComputedStyle(e)[p as 'borderTopLeftRadius'])))
const Boasvindas = 'Oi! Posso ajudar com boletos e matrícula.'
const Perguntas = comAparencia.assistente.perguntas
const esperaAssistente = (p: Page) => p.getByLabel('Mensagem').waitFor()

// C18
test('título das boas-vindas em serifa de 24 px à esquerda', async ({ page }) => {
  for (const largura of [390, 1440]) {
    await em(page, largura, '/univag/assistente', esperaAssistente)
    // o `main` do app tem a barra do topo (o h1 "Assistente") dentro dele: o primeiro cabeçalho do conteúdo é o do contêiner `@container/main`
    const titulo = page.locator('[class*="container/main"]').getByRole('heading').first()
    await expect(titulo, `${largura}: primeiro cabeçalho`).toHaveText('Atendimento ao estudante · Univag')
    expect(await familia(titulo), `${largura}: serifa`).toMatch(/^"Source Serif 4 Variable"/)
    expect(await estilo(titulo, 'font-size', 'text-align'), `${largura}: tamanho e alinhamento`).toEqual(['24px', 'start'])
    const [t, formulario] = [await caixa(titulo), page.getByRole('main').locator('form')]
    await expect(formulario).toHaveCount(1)
    perto(t.x, (await caixa(formulario)).x, `${largura}: título alinhado ao compositor`)
    const frase = page.getByText(Boasvindas, { exact: true })
    const f = await caixa(frase)
    expect(f.y, `${largura}: frase abaixo do título`).toBeGreaterThanOrEqual(t.y + t.height - 1)
    perto(f.x, t.x, `${largura}: frase alinhada ao título`)
  }
})

// C19 (a parte do Chromium)
test('foto de 32 px ao lado do nome do assistente', async ({ page }) => {
  for (const largura of [390, 1440]) {
    await em(page, largura, '/univag/assistente', esperaAssistente)
    const foto = page.locator('img[src="/api/instituicoes/univag/imagens/assistente?v=4"]')
    const texto = page.getByText('Vagner, assistente virtual', { exact: true })
    await expect(foto, `${largura}: foto`).toHaveCount(1)
    await expect(texto, `${largura}: texto`).toHaveCount(1)
    const [f, t] = [await caixa(foto), await caixa(texto)]
    perto(f.width, 32, `${largura}: largura`)
    perto(f.height, 32, `${largura}: altura`)
    for (const raio of await quatroLados(foto)) expect(raio, `${largura}: redonda`).toBeGreaterThanOrEqual(16)
    expect(f.x + f.width, `${largura}: foto antes do texto`).toBeLessThanOrEqual(t.x + 1)
    perto(f.y + f.height / 2, t.y + t.height / 2, `${largura}: centros verticais`, 2)
    expect(parseFloat((await estilo(texto, 'font-size'))[0]), `${largura}: texto pequeno`).toBeLessThanOrEqual(14)
  }
})

// C21
test('solicitação em aberto com borda na cor de ação antes das perguntas', async ({ page }) => {
  await instalar(page)
  for (const largura of [390, 1440]) {
    await em(page, largura, '/univag/assistente', (p) => p.getByRole('link', { name: /Sua solicitação ONE-123 · Em atendimento/ }).waitFor())
    const link = page.getByRole('link', { name: /Sua solicitação ONE-123 · Em atendimento/ })
    await expect(link).toHaveCount(1)
    const [esquerda, cima, direita, baixo, cor] = await estilo(link, 'border-left-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-color')
    expect(parseFloat(esquerda), `${largura}: borda à esquerda`).toBeGreaterThanOrEqual(1)
    expect([cima, direita, baixo], `${largura}: outras bordas`).toEqual(['0px', '0px', '0px'])
    expect(await page.evaluate((c) => window.__ux.pintar(['#fff', c]), cor), `${largura}: cor de ação`).toEqual(await referencia(page, '--primary'))
    const [l, primeira] = [await caixa(link), await caixa(page.getByRole('button', { name: Perguntas[0], exact: true }))]
    expect(l.y + l.height, `${largura}: antes das perguntas`).toBeLessThanOrEqual(primeira.y + 1)
  }
})

// C22
test('perguntas em linhas de 48 px com ícone e seta', async ({ page }) => {
  for (const largura of [390, 1440])
    for (const [aparencia, perguntas] of [[comAparencia, Perguntas], [semAparencia, ['Como emito o boleto do semestre?', 'Posso abonar falta com atestado?']]] as const) {
      await em(page, largura, '/univag/assistente', esperaAssistente, { aparencia })
      const rotulo = `${largura} ${aparencia === semAparencia ? 'sem' : 'com'} aparência`
      const linhas = perguntas.map((p) => page.getByRole('button', { name: p, exact: true }))
      const caixas = []
      for (const l of linhas) {
        await expect(l, `${rotulo}: linha`).toHaveCount(1)
        caixas.push(await caixa(l))
      }
      for (const [i, c] of caixas.entries()) {
        expect(c.height, `${rotulo}: altura ${i}`).toBeGreaterThanOrEqual(48 - 1)
        perto(c.x, caixas[0].x, `${rotulo}: mesmo left ${i}`)
        perto(c.width, caixas[0].width, `${rotulo}: mesma largura ${i}`)
        if (i > 0) {
          expect(c.y, `${rotulo}: top crescente`).toBeGreaterThan(caixas[i - 1].y)
          const [cima, baixo] = [await estilo(linhas[i - 1], 'border-bottom-width'), await estilo(linhas[i], 'border-top-width')]
          expect(Math.max(parseFloat(cima[0]), parseFloat(baixo[0])), `${rotulo}: divisória ${i}`).toBeGreaterThanOrEqual(1)
          expect(Math.abs(c.y - (caixas[i - 1].y + caixas[i - 1].height)), `${rotulo}: divisória encostada ${i}`).toBeLessThanOrEqual(1)
        }
        const [icone, seta, texto] = [linhas[i].locator('svg').first(), linhas[i].locator('svg').last(), await caixa(linhas[i].locator('span').first())]
        await expect(icone).toHaveClass(/lucide-message-circle-question-mark/)
        await expect(seta).toHaveClass(/lucide-chevron-right/)
        const [ic, se] = [await caixa(icone), await caixa(seta)]
        expect(ic.x + ic.width, `${rotulo}: ícone antes do texto ${i}`).toBeLessThanOrEqual(texto.x + 1)
        expect(se.x, `${rotulo}: seta depois do texto ${i}`).toBeGreaterThanOrEqual(texto.x + texto.width - 1)
        const [raio] = await quatroLados(linhas[i])
        expect(raio, `${rotulo}: raio ${i}`).toBe(4)
        expect(raio, `${rotulo}: sem pílula ${i}`).toBeLessThan(c.height / 2)
      }
    }
})

// ---------- S4: Indicadores ----------

const corpoIndicadores = (principal: number) => ({
  semDados: false, alunosAtivos: 1234, conversas: 5678, taxaAutoatendimento: 0.6543, taxaEscalonamento: 0.2, taxaAbandono: 0.1457, taxaPerguntasSemArtigo: 0.12,
  chamadosAbertos: 321, chamadosResolvidos: 1200, tempoPrimeiraRespostaHoras: 12.75, tempoResolucaoHoras: 123.25, roteamentoCorreto: 0.91, taxaReabertura: 0.05,
  principaisCategorias: { porConversas: [{ categoria: 'Financeiro > Boletos e mensalidades', total: 1000 }], porChamados: [{ categoria: 'Acadêmico > Notas e frequência', total: 300 }] },
  indicadorPrincipal: principal,
})
// o relógio em 5/11/2026: o período é 01/11 a 05/11 e o anterior, 27/10 a 31/10
const comPrincipal = async (p: Page) => {
  await p.clock.setFixedTime(new Date('2026-11-05T13:00:00Z'))
  await p.route('**/api/indicadores*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpoIndicadores(new URL(r.request().url()).searchParams.get('de') === '2026-10-27' ? 0.67 : 0.712)) }))
}
const esperaIndicadores = (p: Page) => p.getByText('71,2%', { exact: true }).waitFor()
const Faixa = ['Chamados abertos agora', 'Autoatendimento', 'Tempo até a 1ª resposta']
const Lista = ['Alunos ativos', 'Conversas', 'Escalonamento', 'Abandono', 'Perguntas sem artigo', 'Chamados resolvidos', 'Tempo de resolução', 'Roteamento correto', 'Reabertura']

// Funções que rodam no navegador: o elemento com o texto próprio dado (dentro do main), o que o contém até o main e as caixas
type Cadeia = { tag: string; card: boolean; bordas: number[]; transparente: boolean }
type Caixa = { x: number; y: number; width: number; height: number }
const noMain = `
  const main = document.querySelector('[class*="container/main"]');
  const achar = (t) => [...main.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent === t);
  const cadeia = (e) => { const c = []; for (let n = e; n && n !== main; n = n.parentElement) { const s = getComputedStyle(n); c.push({ tag: n.tagName, card: n.matches('[data-slot=card]'), bordas: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat), transparente: s.backgroundColor === 'rgba(0, 0, 0, 0)' || s.backgroundColor === 'transparent' }); } return c; };
  const caixa = (e) => e.getBoundingClientRect().toJSON();
  const larguraDoMain = () => { const s = getComputedStyle(main); return main.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); };
`
const semCaixa = (cadeia: Cadeia[], rotulo: string) => {
  expect(cadeia.length, `${rotulo}: cadeia medida`).toBeGreaterThan(0)
  for (const c of cadeia) {
    expect(c.card, `${rotulo}: ${c.tag} não é cartão`).toBe(false)
    expect(c.bordas.every((b) => b > 0), `${rotulo}: ${c.tag} sem borda nos 4 lados`).toBe(false)
    expect(c.transparente, `${rotulo}: ${c.tag} sem fundo`).toBe(true)
  }
}
const faixaDe = (page: Page) =>
  page.evaluate(`(() => { ${noMain}
    const ls = ${JSON.stringify(Faixa)}.map(achar);
    let grade = ls[0].parentElement; while (!ls.every((l) => grade.contains(l))) grade = grade.parentElement;
    const itens = ls.map((l) => { let n = l; while (n.parentElement !== grade) n = n.parentElement; return n; });
    return { main: larguraDoMain(), itens: itens.map((i) => ({ caixa: caixa(i), bordas: [getComputedStyle(i).borderRightWidth, getComputedStyle(i).borderLeftWidth].map(parseFloat), cadeia: cadeia(i) })) };
  })()`) as Promise<{ main: number; itens: { caixa: Caixa; bordas: number[]; cadeia: Cadeia[] }[] }>

// C27
test('Indicador principal em serifa de 40 px com a variação ao lado', async ({ page }) => {
  for (const largura of [390, 1440]) {
    await em(page, largura, '/univag/indicadores', esperaIndicadores, { rotas: comPrincipal })
    await expect(page.getByText('Indicador principal', { exact: true })).toBeVisible()
    const numero = page.getByText('71,2%', { exact: true })
    expect(await familia(numero), `${largura}: serifa`).toMatch(/^"Source Serif 4 Variable"/)
    const [tam, numeros] = await estilo(numero, 'font-size', 'font-variant-numeric')
    expect(tam, `${largura}: 40 px`).toBe('40px')
    expect(numeros, `${largura}: tabular-nums`).toContain('tabular-nums')
    const variacao = page.getByText('▲ 4,2 pts').filter({ hasText: 'vs. período anterior' })
    await expect(variacao, `${largura}: variação`).toHaveCount(1)
    const [n, v] = [await caixa(numero), await caixa(variacao)]
    expect(v.x, `${largura}: variação à direita do número`).toBeGreaterThanOrEqual(n.x + n.width - 1)
    expect(v.y < n.y + n.height && v.y + v.height > n.y, `${largura}: sobrepõe na vertical`).toBe(true)
    const bloco = await caixa(page.getByText('Indicador principal', { exact: true }).locator('xpath=ancestor::section[1]'))
    const formulario = await caixa(page.getByRole('main').locator('form').first())
    const primeiro = await caixa(page.getByText(Faixa[0], { exact: true }))
    expect(bloco.y, `${largura}: abaixo do formulário`).toBeGreaterThanOrEqual(formulario.y + formulario.height - 1)
    expect(bloco.y + bloco.height, `${largura}: acima da faixa`).toBeLessThanOrEqual(primeiro.y + 1)
  }
})

// C28
test('3 destaques em faixa de 3 colunas sem caixa', async ({ page }) => {
  for (const [largura, main, colunas] of [[1072, 768, 3], [1440, 1136, 3], [1071, 767, 1], [390, 0, 1]] as const) {
    await em(page, largura, '/univag/indicadores', esperaIndicadores, { rotas: comPrincipal })
    const { main: m, itens } = await faixaDe(page)
    const rotulo = `janela de ${largura}`
    if (main) expect(Math.round(m), `${rotulo}: largura do main`).toBe(main)
    else expect(m, `${rotulo}: main estreito`).toBeLessThan(768)
    expect(itens, rotulo).toHaveLength(3)
    expect(new Set(itens.map((i) => Math.round(i.caixa.x))).size, `${rotulo}: colunas`).toBe(colunas)
    if (colunas === 3) {
      for (const i of itens) {
        perto(i.caixa.y, itens[0].caixa.y, `${rotulo}: mesmo top`)
        perto(i.caixa.width, itens[0].caixa.width, `${rotulo}: mesma largura`)
      }
      for (const [k, i] of itens.slice(0, 2).entries()) expect(Math.max(i.bordas[0], itens[k + 1].bordas[1]), `${rotulo}: divisória ${k}`).toBeGreaterThanOrEqual(1)
    } else
      for (const [k, i] of itens.slice(1).entries()) {
        perto(i.caixa.x, itens[0].caixa.x, `${rotulo}: mesmo left`)
        expect(i.caixa.y, `${rotulo}: top crescente`).toBeGreaterThan(itens[k].caixa.y)
      }
    for (const [k, i] of itens.entries()) semCaixa(i.cadeia, `${rotulo}, destaque ${k}`)
  }
})

type Linhas = {
  main: number
  faixaAte: number
  ordem: boolean
  linhas: { linha: Caixa; rotulo: Caixa; valor: Caixa; numeros: string; bordas: number[]; cadeia: Cadeia[] }[]
}
const listaDe = (page: Page) =>
  page.evaluate(`(() => { ${noMain}
    const linhas = ${JSON.stringify(Lista)}.map((t) => { const l = achar(t); return { rotulo: l, linha: l.parentElement, valor: l.parentElement.lastElementChild }; });
    let item = achar(${JSON.stringify(Faixa[2])}); while (!item.parentElement.contains(achar(${JSON.stringify(Faixa[0])}))) item = item.parentElement;
    return {
      main: larguraDoMain(),
      faixaAte: caixa(item).bottom,
      ordem: linhas.every((l, i) => i === 0 || (linhas[i - 1].linha.compareDocumentPosition(l.linha) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0),
      linhas: linhas.map((l) => ({ linha: caixa(l.linha), rotulo: caixa(l.rotulo), valor: caixa(l.valor), numeros: getComputedStyle(l.valor).fontVariantNumeric, bordas: [getComputedStyle(l.linha).borderTopWidth, getComputedStyle(l.linha).borderBottomWidth].map(parseFloat), cadeia: cadeia(l.linha) })),
    };
  })()`) as Promise<Linhas>

// C29
test('9 métricas em lista de rótulo e valor sem caixa', async ({ page }) => {
  for (const [largura, main, colunas] of [[1072, 768, 2], [1440, 1136, 2], [1071, 767, 1], [390, 0, 1]] as const) {
    await em(page, largura, '/univag/indicadores', esperaIndicadores, { rotas: comPrincipal })
    const r = await listaDe(page)
    const rotulo = `janela de ${largura}`
    if (main) expect(Math.round(r.main), `${rotulo}: largura do main`).toBe(main)
    expect(r.ordem, `${rotulo}: ordem no DOM`).toBe(true)
    expect(r.linhas, rotulo).toHaveLength(9)
    expect(new Set(r.linhas.map((l) => Math.round(l.linha.x))).size, `${rotulo}: colunas`).toBe(colunas)
    for (const [i, l] of r.linhas.entries()) {
      perto(l.rotulo.x, l.linha.x, `${rotulo}: rótulo ${i} à esquerda`)
      perto(l.valor.x + l.valor.width, l.linha.x + l.linha.width, `${rotulo}: valor ${i} à direita`)
      expect(l.rotulo.y < l.valor.y + l.valor.height && l.rotulo.y + l.rotulo.height > l.valor.y, `${rotulo}: ${i} na mesma altura`).toBe(true)
      expect(l.numeros, `${rotulo}: valor ${i}`).toContain('tabular-nums')
      semCaixa(l.cadeia, `${rotulo}, linha ${i}`)
    }
    for (const x of new Set(r.linhas.map((l) => Math.round(l.linha.x)))) {
      const coluna = r.linhas.filter((l) => Math.round(l.linha.x) === x).sort((a, b) => a.linha.y - b.linha.y)
      for (const [i, l] of coluna.slice(1).entries()) {
        const acima = coluna[i]
        expect(Math.max(acima.bordas[1], l.bordas[0]), `${rotulo}: divisória`).toBeGreaterThanOrEqual(1)
        expect(Math.abs(l.linha.y - (acima.linha.y + acima.linha.height)), `${rotulo}: divisória encostada`).toBeLessThanOrEqual(1)
      }
    }
    expect(Math.min(...r.linhas.map((l) => l.linha.y)), `${rotulo}: lista abaixo da faixa`).toBeGreaterThanOrEqual(r.faixaAte - 1)
  }
})

// C30
test('gráficos sem cartão com o título', async ({ page }) => {
  for (const largura of [390, 1440]) {
    await em(page, largura, '/univag/indicadores', esperaIndicadores, { rotas: comPrincipal })
    const graficos = page.locator('.recharts-responsive-container')
    await expect(graficos, `${largura}: 2 gráficos`).toHaveCount(2)
    const barras = page.locator('.recharts-bar-rectangle path, .recharts-bar-rectangle rect')
    await expect(barras).toHaveCount(2)
    await expect.poll(async () => (await Promise.all([0, 1].map((i) => barras.nth(i).boundingBox()))).every((b) => b && b.height > 0), `${largura}: barras desenhadas`).toBe(true)
    for (const [i, titulo] of ['Categorias por conversas', 'Categorias por chamados'].entries()) {
      const [c, h] = [await caixa(graficos.nth(i)), await caixa(page.getByRole('heading', { name: titulo }))]
      expect(h.y + h.height, `${largura}: ${titulo} acima do gráfico`).toBeLessThanOrEqual(c.y + 1)
      expect(h.x < c.x + c.width && h.x + h.width > c.x, `${largura}: ${titulo} sobre o gráfico`).toBe(true)
      const cadeia = (await page.evaluate(`(() => { ${noMain} return cadeia(document.querySelectorAll('.recharts-responsive-container')[${i}]) })()`)) as Cadeia[]
      semCaixa(cadeia, `${largura}: ${titulo}`)
    }
    const r = await listaDe(page)
    expect((await caixa(graficos.first())).y, `${largura}: gráficos abaixo da lista`).toBeGreaterThanOrEqual(Math.max(...r.linhas.map((l) => l.linha.y + l.linha.height)) - 1)
  }
})

// ---------- S5: menos caixas e estados vazios com ícone ----------

const semBordaNemFundo = (l: Locator) =>
  l.evaluate((e) => {
    const s = getComputedStyle(e)
    return { bordas: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat), transparente: s.backgroundColor === 'rgba(0, 0, 0, 0)' || s.backgroundColor === 'transparent' }
  })
const esperaAparencia = (p: Page) => p.getByLabel('Cor principal').waitFor()
const esperaDetalhe = (p: Page) => p.getByText('Resumo gerado por IA').waitFor()

// C32
test('seções da Aparência sem caixa a 32 px', async ({ page }) => {
  await em(page, 1440, '/univag/aparencia', esperaAparencia)
  const secoes = page.locator('form section[aria-labelledby]')
  await expect(secoes).toHaveCount(4)
  const caixas: Caixa[] = []
  for (const [i, nome] of ['Marca', 'Login', 'Assistente', 'Contato'].entries()) {
    const secao = secoes.nth(i)
    await expect(secao.getByRole('heading', { level: 2 }), nome).toHaveText(nome)
    const m = await semBordaNemFundo(secao)
    expect(m.bordas, `${nome}: sem borda`).toEqual([0, 0, 0, 0])
    expect(m.transparente, `${nome}: sem fundo`).toBe(true)
    const [s, h] = [await caixa(secao), await caixa(secao.getByRole('heading', { level: 2 }))]
    perto(h.y, s.y, `${nome}: título no topo da seção`)
    caixas.push(s)
  }
  for (const [i, c] of caixas.slice(1).entries()) perto(c.y - (caixas[i].y + caixas[i].height), 32, `espaço antes da seção ${i + 1}`)
})

// A coluna do detalhe é o filho da grade que contém o bloco; a cadeia vai do bloco até ela (exclusive)
const cadeiaAteAColuna = (bloco: Locator) =>
  bloco.evaluate((e) => {
    const cadeia: { bordas: number[]; transparente: boolean; card: boolean }[] = []
    let n: Element = e
    while (getComputedStyle(n.parentElement!).display !== 'grid') {
      const s = getComputedStyle(n)
      cadeia.push({ bordas: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat), transparente: s.backgroundColor === 'rgba(0, 0, 0, 0)' || s.backgroundColor === 'transparent', card: n.matches('[data-slot=card]') })
      n = n.parentElement!
    }
    return cadeia
  })
const respostaForm = (p: Page) => p.locator('form:has(#resposta)')
const blocoDe = (p: Page, titulo: string) => p.getByRole('heading', { level: 2, name: titulo, exact: true }).locator('..')

// C33
test('Dados do aluno e Histórico sem caixa e com título', async ({ page }) => {
  for (const largura of [390, 1440]) {
    await em(page, largura, '/univag/chamados/ONE-123', esperaDetalhe)
    for (const titulo of ['Dados do aluno', 'Histórico']) {
      const h = page.getByRole('heading', { level: 2, name: titulo, exact: true })
      await expect(h, `${largura}: ${titulo}`).toHaveCount(1)
      perto((await caixa(h)).y, (await caixa(blocoDe(page, titulo))).y, `${largura}: ${titulo} no topo do bloco`)
    }
    const historico = blocoDe(page, 'Histórico')
    expect(await historico.evaluate((e) => e.closest('[data-slot=card]') === null), `${largura}: Histórico fora de cartão`).toBe(true)
    const cadeia = await cadeiaAteAColuna(historico)
    expect(cadeia.length, `${largura}: cadeia do Histórico`).toBeGreaterThan(0)
    for (const c of cadeia) {
      expect(c.bordas, `${largura}: sem borda`).toEqual([0, 0, 0, 0])
      expect(c.transparente, `${largura}: sem fundo`).toBe(true)
    }
    const anterior = largura >= 1024 ? page.locator('[data-slot=card]').filter({ has: page.getByText('Ações', { exact: true }) }) : respostaForm(page)
    await expect(anterior, `${largura}: bloco anterior`).toHaveCount(1)
    const [h, a] = [await caixa(historico), await caixa(anterior)]
    perto(h.y - (a.y + a.height), 32, `${largura}: 32 px depois do bloco anterior`)
  }
})

// C34
test('detalhe sem caixa e com fundo tingido só no que pede ação', async ({ page }) => {
  await instalar(page)
  for (const largura of [390, 1440]) {
    await em(page, largura, '/univag/chamados/ONE-123', esperaDetalhe)
    const dados = blocoDe(page, 'Dados do aluno')
    await expect(dados).toContainText('Ana Beatriz · matrícula 2000567890')
    const cadeia = await cadeiaAteAColuna(dados)
    expect(cadeia.length, `${largura}: cadeia dos dados`).toBeGreaterThan(0)
    for (const c of cadeia) {
      expect(c.bordas, `${largura}: dados sem borda`).toEqual([0, 0, 0, 0])
      expect(c.transparente, `${largura}: dados sem fundo`).toBe(true)
    }
    const resumo = page.getByText('Resumo gerado por IA', { exact: true }).locator('..')
    await expect(resumo).toContainText('Aluna pede a segunda via do boleto')
    const fundoDaPagina = await referencia(page, '--background')
    for (const [nome, bloco] of [['resumo', resumo], ['formulário de resposta', respostaForm(page)]] as const) {
      const [fundo, transparente] = (await bloco.evaluate((e) => [getComputedStyle(e).backgroundColor, getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)'])) as [string, boolean]
      expect(transparente, `${largura}: ${nome} com fundo`).toBe(false)
      expect(await page.evaluate((c) => window.__ux.pintar(['#fff', c]), fundo), `${largura}: ${nome} tingido`).not.toEqual(fundoDaPagina)
    }
    const caixas = []
    for (const b of [dados, resumo, blocoDe(page, 'Conversa com o assistente'), blocoDe(page, 'Atendimento'), respostaForm(page)]) {
      await expect(b).toHaveCount(1)
      caixas.push(await caixa(b))
    }
    for (const [i, c] of caixas.slice(1).entries()) perto(c.y - (caixas[i].y + caixas[i].height), 32, `${largura}: 32 px antes do bloco ${i + 1}`)
  }
})

type Vazio = { nome: string; caminho: string; frase: string; botao?: string; rotas?: (p: Page) => Promise<unknown>; espera?: (p: Page) => Promise<unknown>; papeis?: string[] }
const vazio = (p: Page, re: RegExp | string, corpo: unknown = []) => p.route(re, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) }))
const Vazios: Vazio[] = [
  { nome: 'Fila', caminho: '/univag/fila', frase: 'Nenhum chamado na fila dos seus setores.', rotas: (p) => vazio(p, /\/api\/chamados\?escopo=fila/) },
  { nome: 'Minhas solicitações', caminho: '/univag/solicitacoes', frase: 'Você ainda não tem solicitações.', botao: 'Falar com o assistente', rotas: (p) => vazio(p, /\/api\/chamados\?escopo=meus/) },
  { nome: 'Artigos', caminho: '/univag/artigos', frase: 'Os artigos são a base das respostas do assistente.', botao: 'Novo artigo', rotas: (p) => vazio(p, '**/api/admin/artigos') },
  { nome: 'Documentos', caminho: '/univag/documentos', frase: 'PDFs como regulamentos e calendários também alimentam o assistente.', botao: 'Novo documento', rotas: (p) => vazio(p, '**/api/admin/documentos') },
  { nome: 'Usuários', caminho: '/univag/usuarios', frase: 'Cadastre a equipe ou importe as matrículas.', rotas: (p) => vazio(p, '**/api/admin/usuarios') },
  {
    nome: 'Usuários com busca',
    caminho: '/univag/usuarios',
    frase: 'Nenhum usuário combina com a busca.',
    espera: async (p) => {
      await p.getByText('Carla Regina de Souza Albuquerque').waitFor()
      await p.getByLabel('Buscar por nome, CPF ou e-mail').fill('zzz')
    },
  },
  { nome: 'Cadastros', caminho: '/univag/cadastros', frase: 'Nenhum item cadastrado.', rotas: (p) => vazio(p, '**/api/admin/setores') },
  { nome: 'Indicadores sem dados', caminho: '/univag/indicadores', frase: 'Sem atendimentos neste período.', rotas: (p) => vazio(p, '**/api/indicadores*', { ...corpoIndicadores(0), semDados: true, indicadorPrincipal: null }) },
]

// C36
test('vazio com ícone de 28 px centrado', async ({ page }) => {
  test.setTimeout(120_000)
  await instalar(page)
  let medidas = 0
  for (const largura of [390, 1440])
    for (const v of Vazios) {
      await em(page, largura, v.caminho, v.espera ?? ((p) => p.getByText(v.frase, { exact: true }).waitFor()), { rotas: v.rotas })
      await page.getByText(v.frase, { exact: true }).waitFor()
      const rotulo = `${v.nome} a ${largura}`
      const frase = page.getByText(v.frase, { exact: true })
      const celula = frase.locator('xpath=ancestor::*[@data-slot="table-cell"][1]')
      const bloco = v.nome.startsWith('Indicadores') ? frase.locator('..') : celula
      await expect(bloco, `${rotulo}: bloco`).toHaveCount(1)
      const icone = bloco.locator('svg')
      await expect(icone, `${rotulo}: ícone`).toHaveCount(1)
      await expect(icone).toHaveClass(/lucide/)
      const [i, b] = [await caixa(icone), await caixa(bloco)]
      perto(i.width, 28, `${rotulo}: largura do ícone`)
      perto(i.height, 28, `${rotulo}: altura do ícone`)
      const cor = await icone.evaluate((e) => getComputedStyle(e).color)
      expect(await page.evaluate((c) => window.__ux.pintar(['#fff', c]), cor), `${rotulo}: cor`).toEqual(await referencia(page, '--muted-foreground'))
      const centro = b.x + b.width / 2
      perto(i.x + i.width / 2, centro, `${rotulo}: centro do ícone`)
      const texto = await frase.evaluate((e) => { const r = document.createRange(); r.selectNodeContents(e); const c = r.getBoundingClientRect(); return { x: c.x + c.width / 2 } })
      perto(texto.x, centro, `${rotulo}: centro da frase`)
      const f = await caixa(frase)
      expect(i.y + i.height, `${rotulo}: ícone acima da frase`).toBeLessThanOrEqual(f.y + 1)
      const botoes = bloco.locator('button, a')
      await expect(botoes, `${rotulo}: botão`).toHaveCount(v.botao ? 1 : 0)
      if (v.botao) {
        await expect(botoes).toHaveText(v.botao)
        const bt = await caixa(botoes)
        perto(bt.x + bt.width / 2, centro, `${rotulo}: centro do botão`)
        expect(f.y + f.height, `${rotulo}: frase acima do botão`).toBeLessThanOrEqual(bt.y + 1)
      }
      expect(await page.locator('svg[data-ilustracao]').count(), `${rotulo}: sem ilustração`).toBe(0)
      medidas++
    }
  expect(medidas).toBe(16)
})

// C38
test('Planilha mostra as 7 colunas numa linha', async ({ page }) => {
  for (const largura of [390, 1440]) {
    await em(page, largura, '/univag/matriculas', (p) => p.getByRole('heading', { level: 2 }).first().waitFor())
    const planilha = page.locator('svg[data-ilustracao="planilha"]')
    await expect(planilha, `${largura}: Planilha`).toHaveCount(1)
    const [s, passo] = [await caixa(planilha), await caixa(page.locator('ol > li').nth(1))]
    expect(s.height, `${largura}: altura`).toBeGreaterThan(0)
    expect(s.x >= passo.x - 1 && s.y >= passo.y - 1 && s.x + s.width <= passo.x + passo.width + 1 && s.y + s.height <= passo.y + passo.height + 1, `${largura}: dentro do 2º passo`).toBe(true)
    const nomes = ['cpf', 'nome', 'email', 'matricula', 'curso', 'semestre', 'situacao']
    const textos = planilha.locator('text')
    await expect(textos).toHaveText(nomes)
    const caixas = []
    for (const [i, nome] of nomes.entries()) {
      await expect(textos.nth(i), `${largura}: ${nome}`).toBeVisible()
      const c = await caixa(textos.nth(i))
      expect(c.x >= s.x - 1 && c.x + c.width <= s.x + s.width + 1 && c.y >= s.y - 1 && c.y + c.height <= s.y + s.height + 1, `${largura}: ${nome} dentro do svg`).toBe(true)
      perto(c.y, caixas[0]?.y ?? c.y, `${largura}: ${nome} no mesmo top`)
      if (i > 0) expect(c.x, `${largura}: ${nome} à direita`).toBeGreaterThan(caixas[i - 1].x)
      caixas.push(c)
    }
  }
})

// C39 (a parte do Chromium)
test('prévia com serifa e perguntas em linhas', async ({ page }) => {
  await em(page, 1440, '/univag/aparencia', esperaAparencia)
  const previa = page.getByRole('region', { name: 'Prévia' })
  for (const texto of [Nome, 'Atendimento ao estudante · Univag']) {
    const t = previa.getByText(texto, { exact: true })
    await expect(t, texto).toHaveCount(1)
    expect(await familia(t), `${texto}: serifa`).toMatch(/^"Source Serif 4 Variable"/)
  }
  for (const pergunta of Perguntas) {
    const linha = previa.getByText(pergunta, { exact: true }).locator('xpath=ancestor::li[1]')
    await expect(linha, pergunta).toHaveCount(1)
    const [raio, c] = [(await quatroLados(linha))[0], await caixa(linha)]
    expect(raio, `${pergunta}: sem pílula`).toBeLessThan(c.height / 2)
  }
  expect(await previa.evaluate((e) => [e, ...e.querySelectorAll('*')].filter((n) => getComputedStyle(n).backgroundImage.includes('gradient')).length), 'sem gradiente na prévia').toBe(0)
})

// ---------- rodada 1 do Verifier (C47 a C53) ----------

const Temas = ['light', 'dark', 'black'] as const
const Marcas = [null, '#8a1538'] as const
const luminancia = ([r, g, b]: number[]) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contraste = (x: number[], y: number[]) => {
  const [claro, escuro] = [luminancia(x), luminancia(y)].sort((p, q) => q - p)
  return (claro + 0.05) / (escuro + 0.05)
}
const emTema = (page: Page, tema: string) => page.addInitScript((t) => localStorage.setItem('one-tema', t), tema)

// C47
test('foco das perguntas com 3:1 nos três temas', async ({ page }) => {
  test.setTimeout(240_000)
  await instalar(page)
  let medidas = 0
  for (const tema of Temas)
    for (const marca of Marcas)
      for (const largura of [390, 1440]) {
        await emTema(page, tema)
        await em(page, largura, '/univag/assistente', esperaAssistente, { aparencia: { ...comAparencia, cor: marca } })
        const rotulo = `${tema} ${marca ?? 'sem cor'} a ${largura}`
        const [linha, outra] = [page.getByRole('button', { name: Perguntas[0], exact: true }), page.getByRole('button', { name: Perguntas[1], exact: true })]
        await expect(linha, `${rotulo}: linha`).toHaveCount(1)
        const indicador = (l: Locator) =>
          l.evaluate((e) => {
            const s = getComputedStyle(e)
            const lista: { cor: string; espessura: number }[] = []
            if (s.outlineStyle !== 'none') lista.push({ cor: s.outlineColor, espessura: parseFloat(s.outlineWidth) })
            for (const m of s.boxShadow.matchAll(/((?:rgba?|oklab|oklch|color)\([^)]*\)|#[0-9a-f]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/g))
              lista.push({ cor: m[1], espessura: parseFloat(m[5]) + Math.abs(parseFloat(m[2])) + Math.abs(parseFloat(m[3])) })
            const fundo = window.__ux.pintar(window.__ux.pilha(e.parentElement!))
            return lista.map((i) => ({ ...i, composta: window.__ux.pintar([...window.__ux.pilha(e.parentElement!), i.cor]), fundo })).filter((i) => i.espessura > 0 && i.composta.join() !== i.fundo.join())
          })
        expect(await indicador(outra), `${rotulo}: controle sem foco`).toEqual([])
        for (let i = 0; i < 60 && !(await linha.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab')
        await expect(linha, `${rotulo}: foco`).toBeFocused()
        const achados = await indicador(linha)
        expect(achados.length, `${rotulo}: indicador de foco visível`).toBeGreaterThan(0)
        const melhor = achados.sort((a, b) => contraste(b.composta, b.fundo) - contraste(a.composta, a.fundo))[0]
        expect(melhor.espessura, `${rotulo}: espessura`).toBeGreaterThanOrEqual(2)
        expect(contraste(melhor.composta, melhor.fundo), `${rotulo}: contraste do foco`).toBeGreaterThanOrEqual(3)
        medidas++
      }
  expect(medidas).toBe(12)
})

// C48
test('borda do campo Responder com 3:1', async ({ page }) => {
  test.setTimeout(240_000)
  await instalar(page)
  let medidas = 0
  for (const tema of Temas)
    for (const marca of Marcas)
      for (const papeis of [['ALUNO'], ['ATENDENTE', 'ADMINISTRADOR']])
        for (const largura of [390, 1280]) {
          await emTema(page, tema)
          await em(page, largura, '/univag/chamados/ONE-123', (p) => p.locator('#resposta').waitFor(), { aparencia: { ...comAparencia, cor: marca }, papeis })
          const campo = page.locator('#resposta')
          await expect(campo).toHaveCount(1)
          const [borda, fundo] = (await campo.evaluate((e) => [window.__ux.pintar([...window.__ux.pilha(e.parentElement!), getComputedStyle(e).borderTopColor]), window.__ux.pintar(window.__ux.pilha(e.parentElement!))])) as number[][]
          expect(contraste(borda, fundo), `${tema} ${marca ?? 'sem cor'} ${papeis[0]} a ${largura}: borda do Responder`).toBeGreaterThanOrEqual(3)
          medidas++
        }
  expect(medidas).toBe(24)
})

// C51
test('nome do assistente entre a frase e a solicitação', async ({ page }) => {
  await instalar(page)
  for (const largura of [390, 1440]) {
    await em(page, largura, '/univag/assistente', (p) => p.getByRole('link', { name: /Sua solicitação ONE-123 · Em atendimento/ }).waitFor())
    const [frase, nome, link, primeira] = [page.getByText(Boasvindas, { exact: true }), page.getByText('Vagner, assistente virtual', { exact: true }), page.getByRole('link', { name: /Sua solicitação ONE-123/ }), page.getByRole('button', { name: Perguntas[0], exact: true })]
    for (const l of [frase, nome, link, primeira]) await expect(l).toHaveCount(1)
    const [f, n, s, p] = [await caixa(frase), await caixa(nome), await caixa(link), await caixa(primeira)]
    expect(n.y, `${largura}: nome abaixo da frase`).toBeGreaterThanOrEqual(f.y + f.height - 1)
    expect(s.y, `${largura}: solicitação abaixo do nome`).toBeGreaterThanOrEqual(n.y + n.height - 1)
    expect(p.y, `${largura}: pergunta abaixo da solicitação`).toBeGreaterThanOrEqual(s.y + s.height - 1)
  }
})

// C52
test('variação abaixo do número a 360', async ({ page }) => {
  for (const [anterior, texto] of [[0.67, '▲ 4,2 pts'], [0.712, '= sem variação']] as const) {
    await em(page, 360, '/univag/indicadores', esperaIndicadores, {
      rotas: async (p) => {
        await p.clock.setFixedTime(new Date('2026-11-05T13:00:00Z'))
        await p.route('**/api/indicadores*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpoIndicadores(new URL(r.request().url()).searchParams.get('de') === '2026-10-27' ? anterior : 0.712)) }))
      },
    })
    const [numero, variacao] = [page.getByText('71,2%', { exact: true }), page.getByText(texto).filter({ hasText: 'vs. período anterior' })]
    await expect(variacao, `${texto}: variação`).toHaveCount(1)
    const [n, v] = [await caixa(numero), await caixa(variacao)]
    expect(v.y, `${texto}: abaixo do número`).toBeGreaterThanOrEqual(n.y + n.height - 1)
    perto(v.x, n.x, `${texto}: alinhada à esquerda`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${texto}: sem estouro`).toBe(true)
  }
})

// C53 (a parte do Chromium)
test.describe('PWA sem outros alfabetos', () => {
  test.use({ serviceWorkers: 'allow' })
  test('precache sem subconjuntos de outros alfabetos', async ({ page }) => {
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
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.filter((u) => /cyrillic|greek|vietnamese|latin-ext/.test(u))).toEqual([])
    expect(urls.filter((u) => /\/assets\/public-sans-latin-wght-normal-[^/]+\.woff2/.test(u))).toHaveLength(1)
    expect(urls.filter((u) => /\/assets\/source-serif-4-latin-wght-normal-[^/]+\.woff2/.test(u))).toHaveLength(1)
  })
})
