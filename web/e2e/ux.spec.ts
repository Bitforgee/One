import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { abrirTela, chamadoSimulado, comAparencia, instalar, referencia, semAparencia, simularApi, Telas, varrer } from './simulada'

// revisao-ux, lote 1 (S1, S2 e os tokens de S6): arranjo e cor medidos no Chromium com a API simulada.
// Medidas por boundingBox() e getComputedStyle, em px CSS, tolerância de 1 px. A cor computada é pintada num canvas 1x1 e lida em sRGB de 8 bits;
// uma cor com alfa é composta sobre o fundo opaco mais próximo. Contraste: fórmula do WCAG 2.
test.use({ serviceWorkers: 'block' })

const luminancia = ([r, g, b]: number[]) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contraste = (x: number[], y: number[]) => {
  const [claro, escuro] = [luminancia(x), luminancia(y)].sort((p, q) => q - p)
  return (claro + 0.05) / (escuro + 0.05)
}
const pixel = (page: Page, pilha: string[]) => page.evaluate((p) => window.__ux.pintar(p), pilha)
// A cor de uma propriedade do elemento, composta sobre o fundo opaco mais próximo dele
const corSobreFundo = (alvo: Locator, propriedade: 'color' | 'backgroundColor' | 'borderTopColor') =>
  alvo.evaluate((el, p) => window.__ux.pintar([...window.__ux.pilha(el.parentElement ?? el), getComputedStyle(el)[p as 'color']]), propriedade)
const caixa = async (l: Locator) => (await l.boundingBox())!
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) })
const responder = (page: Page, rota: RegExp, corpo: unknown, status = 200) => page.route(rota, (r) => r.fulfill(json(corpo, status)))

// ---------- S1: alvos de toque e campos ----------

const Alvos: Record<string, string> = {
  Button: '[data-slot=button]',
  Input: '[data-slot=input]:not([type=checkbox]):not([type=radio]):not([type=file])',
  'Textarea de uma linha': 'textarea[rows="1"]',
  NativeSelect: '[data-slot=native-select]',
  'item da barra lateral': '[data-sidebar=menu-button]',
  'botão de ícone': '[data-slot=button][data-size^=icon]',
}
const Campos = ['[data-slot=input]:not([type=checkbox]):not([type=radio]):not([type=file])', 'textarea', '[data-slot=native-select]']
const SemCasca = ['Login', 'Raiz', 'Primeiro acesso', 'Criar senha']
type Medida = { tela: string; tipo: string; nome: string; altura: number }
type Fonte = { tela: string; nome: string; fonte: number }

// Todo elemento visível de cada tipo da tela aberta: a altura (e, nos campos, a fonte). `tela` só rotula.
async function medir(page: Page, tela: string) {
  return page.evaluate(
    ([nome, alvos, campos]) => {
      const visivel = (e: Element) => {
        const r = e.getBoundingClientRect()
        return e.checkVisibility() && r.width > 0 && r.height > 0
      }
      const rotulo = (e: Element) => (e.getAttribute('aria-label') ?? e.getAttribute('name') ?? e.id ?? e.textContent ?? e.tagName).trim().slice(0, 40)
      const medidas = Object.entries(alvos).flatMap(([tipo, seletor]) =>
        [...document.querySelectorAll(seletor)].filter(visivel).map((e) => ({ tela: nome, tipo, nome: rotulo(e), altura: e.getBoundingClientRect().height })),
      )
      const fontes = (campos as string[]).flatMap((seletor) =>
        [...document.querySelectorAll(seletor)].filter(visivel).map((e) => ({ tela: nome, nome: rotulo(e), fonte: parseFloat(getComputedStyle(e).fontSize) })),
      )
      return { medidas, fontes }
    },
    [tela, Alvos, Campos] as const,
  )
}

// As telas de C1 a C3: as de `Telas`, a Conta e Instituições. No Assistente escolhe-se um arquivo, para o "Remover" existir.
async function percorrer(page: Page, aoAbrir: (nome: string, ehCasca: boolean) => Promise<void>) {
  const telas: [string, () => Promise<void>][] = [
    ...Telas.map(([nome]) => [nome, () => abrirTela(page, nome)] as [string, () => Promise<void>]),
    ['Conta', async () => { await page.goto('/univag/conta'); await page.getByText('***.456.789-**').waitFor() }],
    ['Instituições', async () => { await page.goto('/univag/instituicoes'); await page.getByText('Faculdade Antiga').waitFor() }],
  ]
  for (const [nome, abrir] of telas) {
    // Instituições é do OPERADOR; as outras telas, de quem tem os 3 papéis de equipe e aluno
    await page.unroute('**/api/**')
    await simularApi(page, nome === 'Instituições' ? ['ADMINISTRADOR', 'OPERADOR'] : undefined)
    await abrir()
    if (nome === 'Assistente') {
      await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('x') })
      await page.getByRole('button', { name: 'Remover foto.png' }).waitFor()
    }
    await aoAbrir(nome, !SemCasca.includes(nome) && nome !== 'Raiz')
  }
}

// Mede as telas e, na gaveta aberta (ou na barra, conforme `comGaveta`), os itens da barra lateral.
async function medirTudo(page: Page, aoMedir: (r: Awaited<ReturnType<typeof medir>>) => void, comGaveta: boolean) {
  await percorrer(page, async (nome, casca) => {
    const r = await medir(page, nome)
    if (casca && comGaveta) {
      await page.getByRole('button', { name: 'Alternar barra lateral' }).click()
      await page.locator('[data-sidebar=menu-button]').first().waitFor()
      const itens = await medir(page, `${nome} (gaveta)`)
      r.medidas.push(...itens.medidas.filter((m) => m.tipo === 'item da barra lateral'))
      await page.keyboard.press('Escape')
    }
    aoMedir(r)
  })
}

function conferirAlturas(medidas: Medida[]) {
  // afirma ao menos 1 elemento de cada tipo antes de medir (L-069)
  for (const tipo of Object.keys(Alvos)) expect(medidas.filter((m) => m.tipo === tipo).length, `há elementos de ${tipo}`).toBeGreaterThan(0)
  expect(
    medidas.filter((m) => m.altura < 43.9).map((m) => `${m.tela} · ${m.tipo} · ${m.nome}: ${m.altura}`),
    'elementos abaixo de 44 px',
  ).toEqual([])
}

test.describe('S1 toque, campos e contraste', () => {
  test.setTimeout(240_000)

  // C1 (AC 1)
  test('alvos de 44 px abaixo de 768 em todas as telas', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 390, height: 844 })
    const todas: Medida[] = []
    await medirTudo(page, (r) => todas.push(...r.medidas), true)
    conferirAlturas(todas)
  })

  // C2 (AC 1): ponteiro grosso, a 1024 px; a barra aberta e recolhida
  test('alvos de 44 px com ponteiro grosso a 1024', async ({ browser }) => {
    for (const recolhida of [false, true]) {
      const contexto = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' })
      const page = await contexto.newPage()
      await instalar(page)
      await page.addInitScript((v) => localStorage.setItem('one-barra', v), recolhida ? 'recolhida' : 'aberta')
      await page.goto('/univag')
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'ponteiro grosso').toBe(true)
      const todas: Medida[] = []
      await medirTudo(page, (r) => todas.push(...r.medidas), false)
      conferirAlturas(todas)
      await contexto.close()
    }
    // sem ponteiro grosso, a 1024 px, o botão "Consultar" segue em 36 px
    const fino = await browser.newContext({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' })
    const pagina = await fino.newPage()
    await simularApi(pagina)
    await pagina.goto('/univag/indicadores')
    expect(await pagina.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(false)
    expect((await caixa(pagina.getByRole('button', { name: 'Consultar' }))).height).toBe(36)
    await fino.close()
  })

  // C3 (AC 2)
  test('campos de 16 px abaixo de 768 e com ponteiro grosso', async ({ page, browser }) => {
    await instalar(page)
    await page.setViewportSize({ width: 390, height: 844 })
    const doCelular: Fonte[] = []
    await medirTudo(page, (r) => doCelular.push(...r.fontes), false)
    const contexto: BrowserContext = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' })
    const grosso = await contexto.newPage()
    await instalar(grosso)
    const doToque: Fonte[] = []
    await medirTudo(grosso, (r) => doToque.push(...r.fontes), false)
    await contexto.close()
    for (const [condicao, fontes] of [['390 px', doCelular], ['1024 px com ponteiro grosso', doToque]] as const) {
      // o CPF do Login, o compositor do Assistente e o seletor de Cadastros
      for (const tela of ['Login', 'Assistente', 'Cadastros']) expect(fontes.filter((f) => f.tela === tela).length, `${condicao}: campos em ${tela}`).toBeGreaterThan(0)
      expect(fontes.filter((f) => f.fonte < 16).map((f) => `${f.tela} · ${f.nome}: ${f.fonte}`), `${condicao}: campos abaixo de 16 px`).toEqual([])
    }
  })

  // C4 (AC 3): o X de 44x44 com o nome Fechar, no Dialog, no Sheet do detalhe e no formulário
  test('X de 44 px com o nome Fechar', async ({ page }) => {
    await instalar(page)
    await simularApi(page)
    const fechar = async (dialogo: Locator) => {
      const botao = dialogo.getByRole('button', { name: 'Fechar', exact: true })
      await expect(botao).toHaveCount(1)
      await expect(dialogo.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0)
      const c = await caixa(botao)
      expect(c.width, 'largura do X').toBeGreaterThanOrEqual(43.9)
      expect(c.height, 'altura do X').toBeGreaterThanOrEqual(43.9)
    }

    await page.setViewportSize({ width: 360, height: 740 })
    await abrirTela(page, 'Assistente')
    await page.getByRole('button', { name: 'Encerrar' }).click()
    const encerrar = page.getByRole('dialog', { name: 'Encerrar a conversa?' })
    await expect(encerrar).toBeVisible()
    await fechar(encerrar)

    // o botão da barra do detalhe: "Ações" no lote 1, "Mais" quando o lote 2 o renomear (C34)
    await page.setViewportSize({ width: 390, height: 844 })
    await abrirTela(page, 'Detalhe do chamado')
    await page.getByRole('button', { name: /^(Mais|Ações)$/ }).click()
    await fechar(page.getByRole('dialog'))
    await page.keyboard.press('Escape')

    await page.setViewportSize({ width: 360, height: 740 })
    await abrirTela(page, 'Usuários')
    await page.getByRole('button', { name: 'Novo' }).click()
    await fechar(page.getByRole('dialog', { name: 'Novo usuário' }))
  })
})

const Temas = ['light', 'dark', 'black'] as const
const Marcas = [null, '#8a1538'] as const

// Prepara a página no tema e com a cor da instituição (a API simulada devolve a cor; o app põe --marca no html)
async function emTema(page: Page, tema: string, cor: string | null, papeis?: string[]) {
  await instalar(page)
  await page.addInitScript((t) => localStorage.setItem('one-tema', t), tema)
  await simularApi(page, papeis, false, cor ? { ...semAparencia, cor } : semAparencia)
}

test.describe('S1 contraste', () => {
  test.setTimeout(240_000)

  // C5 (AC 4): 3 campos x 3 temas x 2 marcas = 18 medidas
  test('borda dos campos com contraste de 3:1 nos três temas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    let medidas = 0
    for (const tema of Temas)
      for (const marca of Marcas) {
        await page.unroute('**/api/**')
        await emTema(page, tema, marca)
        await page.goto('/univag/artigos')
        await page.getByRole('button', { name: 'Novo' }).click()
        const dialogo = page.getByRole('dialog', { name: 'Novo artigo' })
        const campos: [string, Locator][] = [
          ['Input', dialogo.getByLabel('Título')],
          ['Textarea', dialogo.getByLabel(/^Perguntas relacionadas/)],
          ['NativeSelect', dialogo.getByLabel('Categoria')],
        ]
        await page.evaluate(() => (document.activeElement as HTMLElement).blur()) // o diálogo foca o Título, e o foco troca a borda por --ring
        const fundo = await dialogo.evaluate((el) => window.__ux.pintar(window.__ux.pilha(el)))
        for (const [nome, campo] of campos) {
          await expect(campo).toHaveCount(1)
          const borda = await corSobreFundo(campo, 'borderTopColor')
          // a borda é composta sobre o fundo do diálogo, não sobre o do campo
          const composta = await campo.evaluate((el) => window.__ux.pintar([...window.__ux.pilha(el.closest('[data-slot=dialog-content]')!), getComputedStyle(el).borderTopColor]))
          expect(contraste(composta, fundo), `${tema} ${marca ?? 'sem cor'}: borda de ${nome}`).toBeGreaterThanOrEqual(3)
          expect(borda.length).toBe(3)
          medidas++
        }
      }
    expect(medidas).toBe(18)
  })

  // C6 (AC 5): 3 esqueletos visíveis em cada tema
  test('esqueleto com contraste de 1,3:1 nos três temas', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const tema of Temas) {
      await page.unroute('**/api/**')
      await emTema(page, tema, null)
      await page.route(/\/api\/chamados\?escopo=fila/, async (r) => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await r.fallback()
      })
      await page.goto('/univag/fila')
      const esqueletos = page.locator('[data-slot=skeleton]')
      await expect(esqueletos).toHaveCount(3)
      const fundo = await page.evaluate(() => window.__ux.pintar(window.__ux.pilha(document.body)))
      for (const e of await esqueletos.all()) {
        const cor = await e.evaluate((el) => window.__ux.pintar([...window.__ux.pilha(document.body), getComputedStyle(el).backgroundColor]))
        expect(contraste(cor, fundo), `${tema}: esqueleto`).toBeGreaterThanOrEqual(1.3)
      }
    }
  })

  // C7 (AC 6): 9 selos x 3 temas x 2 marcas
  test('selos com contraste de 4,5:1 nos três temas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const estados = [['ABERTO', 'Aberto'], ['EM_ATENDIMENTO', 'Em atendimento'], ['AGUARDANDO_ALUNO', 'Aguardando aluno'], ['RESOLVIDO', 'Resolvido'], ['FECHADO', 'Fechado']]
    const fila = estados.map(([estado], i) => ({ numero: `ONE-${i + 1}`, titulo: `chamado ${i + 1}`, categoria: 'Boleto', estado, responsavel: null, criadoEm: '2026-11-02T12:00:00Z', dias: 1 }))
    const artigo = (id: number, estado: string) => ({ id, estado, categoriaId: 1, categoria: 'Boleto', versao: { id, numero: 1, titulo: `artigo ${id}`, perguntas: [], resposta: 'x', links: [] } })
    const usuario = { id: 1, cpf: '12345678909', nome: 'Carla', email: 'c@univag.edu.br', ativo: false, deveTrocarSenha: false, papeis: ['ATENDENTE'], setores: [1] }
    let medidos = 0
    for (const tema of Temas)
      for (const marca of Marcas) {
        await page.unroute('**/api/**')
        await emTema(page, tema, marca)
        await responder(page, /\/api\/chamados\?escopo=fila/, fila)
        await responder(page, /\/api\/admin\/artigos/, [artigo(1, 'ATIVO'), artigo(2, 'RASCUNHO'), artigo(3, 'ARQUIVADO')])
        await responder(page, /\/api\/admin\/usuarios/, [usuario])
        const selos: [string, string, string][] = [
          ...estados.map(([, rotulo], i) => ['/univag/fila', rotulo, `ONE-${i + 1}`] as [string, string, string]),
          ...['Ativo', 'Rascunho', 'Arquivado'].map((rotulo, i) => ['/univag/artigos', rotulo, `artigo ${i + 1}`] as [string, string, string]),
          ['/univag/usuarios', 'Desativado', 'Carla'],
        ]
        let atual = ''
        for (const [caminho, rotulo, linha] of selos) {
          if (caminho !== atual) {
            await page.goto(caminho)
            await page.getByText(linha).first().waitFor()
            atual = caminho
          }
          const selo = page.locator('tr', { hasText: linha }).locator('[data-slot=badge]', { hasText: new RegExp(`^${rotulo}$`) })
          await expect(selo, `${tema} ${marca ?? 'sem cor'}: selo ${rotulo}`).toHaveCount(1)
          const fundo = await selo.evaluate((el) => window.__ux.pintar([...window.__ux.pilha(document.body), getComputedStyle(el).backgroundColor]))
          const texto = await selo.evaluate((el) => window.__ux.pintar([...window.__ux.pilha(document.body), getComputedStyle(el).backgroundColor, getComputedStyle(el).color]))
          expect(contraste(texto, fundo), `${tema} ${marca ?? 'sem cor'}: selo ${rotulo}`).toBeGreaterThanOrEqual(4.5)
          medidos++
        }
      }
    expect(medidos).toBe(54)
  })

  // C8 (AC 7, door 3): nenhum botão verde nos 4 casos
  test('nenhum botão verde', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await instalar(page)
    const semVerde = async (botaoCitado: Locator, variantes: string[]) => {
      const verde = await referencia(page, '--success')
      await expect(botaoCitado).toHaveCount(1)
      expect(variantes).toContain(await botaoCitado.getAttribute('data-variant'))
      const botoes = await page.locator('button:visible').all()
      expect(botoes.length).toBeGreaterThan(0)
      for (const b of botoes) {
        const cor = await b.evaluate((el) => window.__ux.pintar([...window.__ux.pilha(el.parentElement ?? el), getComputedStyle(el).backgroundColor]))
        expect(cor, `botão "${(await b.textContent())?.trim()}" não é verde`).not.toEqual(verde)
      }
    }
    await simularApi(page)
    await abrirTela(page, 'Assistente')
    await semVerde(page.getByRole('button', { name: 'Sim', exact: true }), ['default', 'outline'])

    await page.getByRole('button', { name: 'Falar com atendente' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await semVerde(page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }), ['default', 'outline'])

    await page.goto('/univag/chamados/ONE-123')
    await page.getByText('Resumo gerado por IA').waitFor()
    await semVerde(page.getByRole('button', { name: 'Resolver', exact: true }), ['default', 'outline'])

    await page.unroute('**/api/**')
    await simularApi(page, ['ALUNO'])
    await responder(page, /\/api\/chamados\/ONE-123/, { ...chamadoSimulado('RESOLVIDO'), eventos: null, resumo: null, acoes: ['confirmar'] })
    await page.goto('/univag/chamados/ONE-123')
    await semVerde(page.getByRole('button', { name: 'Confirmar resolução', exact: true }), ['default', 'outline'])
  })
})

// ---------- S2: a barra de abas do aluno ----------

const Abas = ['assistente', 'solicitacoes', 'conta'] as const
async function comoAluno(page: Page, largura = 390, altura = 844) {
  await instalar(page)
  await page.setViewportSize({ width: largura, height: altura })
  await simularApi(page, ['ALUNO'])
}

test.describe('S2 barra de abas', () => {
  // C13 (door 1)
  test('barra de abas: 3 colunas iguais e ícone sobre rótulo de 12 px', async ({ page }) => {
    await comoAluno(page)
    await page.goto('/univag/assistente')
    const nav = page.getByRole('navigation', { name: 'Navegação' })
    await expect(nav).toHaveCount(1)
    expect(await nav.evaluate((n) => getComputedStyle(n).position)).toBe('fixed')
    const n = await caixa(nav)
    expect(n.y + n.height).toBeCloseTo(844, 0)
    expect(n.width).toBeCloseTo(390, 0)
    const links = nav.getByRole('link')
    await expect(links).toHaveCount(3)
    const caixas = []
    for (const link of await links.all()) {
      const c = await caixa(link)
      const icone = await caixa(link.locator('svg'))
      const rotulo = link.locator('span')
      await expect(rotulo).toHaveCount(1)
      const r = await caixa(rotulo)
      expect(icone.y + icone.height, 'o ícone acima do rótulo').toBeLessThanOrEqual(r.y + 1)
      expect(Math.abs(icone.x + icone.width / 2 - (r.x + r.width / 2)), 'ícone e rótulo no mesmo centro').toBeLessThanOrEqual(1)
      expect(await rotulo.evaluate((e) => getComputedStyle(e).fontSize)).toBe('12px')
      expect(c.height).toBeGreaterThanOrEqual(43.9)
      caixas.push(c)
    }
    for (const c of caixas) {
      expect(c.y).toBeCloseTo(caixas[0].y, 0)
      expect(c.width).toBeCloseTo(130, 0)
    }
  })

  // C14
  test('aba ativa na cor de ação e peso 600', async ({ page }) => {
    await comoAluno(page)
    for (const [i, rota] of Abas.entries()) {
      await page.goto(`/univag/${rota}`)
      const nav = page.getByRole('navigation', { name: 'Navegação' })
      await expect(nav.getByRole('link')).toHaveCount(3)
      const primaria = await referencia(page, '--primary')
      for (const [j, link] of (await nav.getByRole('link').all()).entries()) {
        const rotulo = link.locator('span')
        const cor = await rotulo.evaluate((e) => window.__ux.pintar(['#fff', getComputedStyle(e).color]))
        const peso = Number(await rotulo.evaluate((e) => getComputedStyle(e).fontWeight))
        if (j === i) {
          expect(cor, `${rota}: aba ativa`).toEqual(primaria)
          expect(peso).toBe(600)
        } else {
          expect(cor, `${rota}: aba ${j} inativa`).not.toEqual(primaria)
          expect(peso).toBeLessThan(600)
        }
      }
    }
  })

  // C15: a área segura de 34 px e nada focável sob a barra, ao rolar até o fim
  test('nada focável fica sob a barra de abas', async ({ page }) => {
    await comoAluno(page)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 34 } })
    const longo = 'Para emitir a segunda via do boleto do semestre, entre no Portal do Aluno, abra a área financeira e escolha o mês desejado. '.repeat(5)
    await page.route(/\/api\/conversas(\/1\/mensagens)?$/, (r) => r.fulfill(json({ conversaId: 1, resposta: { tipo: 'resposta', texto: longo } }, 201)))
    await responder(page, /\/api\/chamados\?escopo=meus/, Array.from({ length: 20 }, (_, i) => ({ numero: `ONE-${i + 1}`, titulo: `Solicitação número ${i + 1}`, estado: 'EM_ATENDIMENTO', criadoEm: '2026-11-02T12:00:00Z' })))
    await responder(page, /\/api\/chamados\/ONE-123/, { ...chamadoSimulado('ABERTO'), eventos: null, resumo: null, acoes: ['cancelar'] })

    const conferir = async (tela: string) => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(200)
      await expect(page.getByRole('navigation', { name: 'Navegação' })).toHaveCount(1)
      const topo = (await caixa(page.getByRole('navigation', { name: 'Navegação' }))).y
      const sob = await page.evaluate((t) => {
        const focaveis = [...document.querySelectorAll('main a, main button, main input, main textarea, main select, main [tabindex]')]
        const visiveis = focaveis.filter((e) => e.checkVisibility() && e.getBoundingClientRect().height > 0)
        return { total: visiveis.length, sob: visiveis.filter((e) => e.getBoundingClientRect().bottom > t + 0.5).map((e) => `${e.tagName} ${e.textContent?.trim().slice(0, 30)} ${e.getBoundingClientRect().bottom}`) }
      }, topo)
      expect(sob.total, `${tela}: há elementos focáveis`).toBeGreaterThan(0)
      expect(sob.sob, `${tela}: focáveis sob a barra`).toEqual([])
    }

    await page.goto('/univag/assistente')
    expect(await page.getByRole('navigation', { name: 'Navegação' }).evaluate((n) => getComputedStyle(n).paddingBottom)).toBe('34px')
    for (let i = 1; i <= 4; i++) {
      await page.getByLabel('Mensagem').fill(`pergunta ${i}`)
      await page.getByRole('button', { name: 'Enviar' }).click()
      await expect(page.locator('.is-assistant')).toHaveCount(i)
    }
    await conferir('Assistente')
    await page.goto('/univag/solicitacoes')
    await page.getByText('ONE-20').waitFor()
    await conferir('Minhas solicitações')
    await page.goto('/univag/conta')
    await page.getByText('***.456.789-**').waitFor()
    await conferir('Conta')
    await page.goto('/univag/chamados/ONE-123')
    await page.getByRole('button', { name: /Cancelar|Ações/ }).first().waitFor()
    await conferir('Detalhe do chamado')
  })

  // C16
  test('topo do aluno sem botão de menu', async ({ page }) => {
    await comoAluno(page)
    await page.goto('/univag/assistente')
    await expect(page.getByRole('navigation', { name: 'Navegação' })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Alternar barra lateral' })).toHaveCount(0)
    await expect(page.locator('[data-sidebar=sidebar]')).toHaveCount(0)
    const sigla = page.locator('main > header span[aria-hidden=true]', { hasText: /^[A-Z]{2}$/ })
    await expect(sigla).toHaveCount(1)
    await expect(page.locator('main > header img')).toHaveCount(0)
    const [s, h] = [await caixa(sigla), await caixa(page.getByRole('heading', { level: 1 }))]
    expect(s.x + s.width, 'a sigla antes do título').toBeLessThanOrEqual(h.x + 1)
    expect(Math.abs(s.y + s.height / 2 - (h.y + h.height / 2)), 'mesmo centro vertical').toBeLessThanOrEqual(2)
  })

  // C20 (AC 14)
  test('sem barra de abas a 768 px e para a equipe', async ({ page }) => {
    await instalar(page)
    for (const [papeis, largura] of [[['ALUNO'], 768], [['ATENDENTE'], 390], [['ADMINISTRADOR'], 390], [['ALUNO', 'ATENDENTE'], 390]] as const) {
      await page.unroute('**/api/**')
      await page.setViewportSize({ width: largura, height: 844 })
      await simularApi(page, [...papeis])
      await page.goto('/univag/trocar-senha')
      await expect(page.getByRole('button', { name: 'Alternar barra lateral' }), `${papeis} a ${largura} px`).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Navegação' }), `${papeis} a ${largura} px`).toHaveCount(0)
    }
  })
})

test.describe('S2 Conta', () => {
  // C19: com o service worker liberado, o aviso existe (push.spec.ts faz o mesmo)
  test.use({ serviceWorkers: 'allow' })

  test('Conta com linhas de 52 px e Sair por último', async ({ page }) => {
    await comoAluno(page)
    await page.unroute('**/api/**')
    await simularApi(page, ['ALUNO'], false, comAparencia)
    await page.route('**/api/push/chave', (r) => r.fulfill(json({ chavePublica: 'BAEC' })))
    const abrir = async () => {
      await page.goto('/univag/conta')
      await page.locator('main li > :is(button, a)').first().waitFor()
      await page.getByText('Avisos no celular').waitFor()
    }
    await abrir()
    const linhas = page.locator('main li > :is(button, a)')
    await expect(linhas).toHaveCount(5)
    const nomes = ['Tema', 'Avisos no celular', 'Contato do atendimento', 'Trocar senha', 'Sair']
    for (const [i, nome] of nomes.entries()) {
      await expect(linhas.nth(i)).toContainText(nome)
      expect((await caixa(linhas.nth(i))).height, `${nome}: altura`).toBeGreaterThanOrEqual(51)
      expect((await caixa(linhas.nth(i))).height, `${nome}: altura`).toBeLessThanOrEqual(53)
    }
    // o bloco de nome e CPF não tem ação
    const bloco = page.locator('main p', { hasText: 'Ana' }).locator('..')
    await expect(bloco).toContainText('***.456.789-**')
    await expect(bloco.locator('a, button')).toHaveCount(0)
    // "Tema": o valor atual à direita da linha e no mesmo centro vertical
    const tema = linhas.nth(0)
    const valor = tema.getByText('Sistema', { exact: true })
    await expect(valor).toHaveCount(1)
    const [t, v] = [await caixa(tema), await caixa(valor)]
    expect(t.x + t.width - (v.x + v.width)).toBeLessThanOrEqual(16 + 1)
    expect(Math.abs(t.y + t.height / 2 - (v.y + v.height / 2))).toBeLessThanOrEqual(2)
    // "Sair" é a última linha e leva a cor destrutiva
    const destrutiva = await referencia(page, '--destructive')
    expect(await linhas.nth(4).evaluate((e) => window.__ux.pintar(['#fff', getComputedStyle(e).color]))).toEqual(destrutiva)
    // um clique a 4 px da borda direita dispara a ação de cada linha
    const aEsquerda = async (i: number) => {
      const c = await caixa(linhas.nth(i))
      await linhas.nth(i).click({ position: { x: c.width - 4, y: c.height / 2 } })
    }
    await aEsquerda(0)
    await expect(page.locator('[data-slot=popover-content]')).toBeVisible()
    await abrir()
    await aEsquerda(1)
    await expect(page.locator('[data-sonner-toast]')).toBeVisible()
    await abrir()
    await aEsquerda(2)
    await expect(page.getByRole('dialog', { name: 'Contato do atendimento' })).toBeVisible()
    await abrir()
    await aEsquerda(3)
    await expect(page).toHaveURL(/\/univag\/trocar-senha$/)
    await abrir()
    const saiu = page.waitForRequest((r) => r.url().endsWith('/api/auth/logout') && r.method() === 'POST')
    await aEsquerda(4)
    await saiu
    await expect(page).toHaveURL(/\/univag$/)
  })
})

// ---------- S6: tokens neutros e tipografia ----------

// Aplica o tema (classes do html) e a cor de instituição na página aberta e lê a cor de var(--token), em sRGB de 8 bits
const lerToken = (page: Page, tema: string, marca: string | null, token: string) =>
  page.evaluate(
    ([t, m, k]) => {
      const raiz = document.documentElement
      raiz.classList.remove('light', 'dark', 'black')
      raiz.classList.add(...(t === 'black' ? ['dark', 'black'] : [t as string]))
      if (m) raiz.style.setProperty('--marca', m)
      else raiz.style.removeProperty('--marca')
      const e = document.createElement('div')
      e.style.color = `var(${k})`
      document.body.append(e)
      const cor = getComputedStyle(e).color
      e.remove()
      return window.__ux.pintar(['#000', cor])
    },
    [tema, marca, token],
  )

test.describe('S6 tokens', () => {
  test.setTimeout(120_000)

  // C52 (AC 39, door 2): as 14 combinações de token e tema mudam com a marca; o fundo do Preto é #000
  test('neutros mudam com a cor da instituição', async ({ page }) => {
    await instalar(page)
    await simularApi(page)
    await page.goto('/univag')
    await page.getByLabel('CPF').waitFor()
    const comuns = ['--background', '--muted', '--border', '--input', '--accent']
    const tokens: [string, string[]][] = [['light', comuns], ['dark', comuns], ['black', comuns.slice(1)]]
    let combinacoes = 0
    for (const [tema, doTema] of tokens)
      for (const token of doTema) {
        const [vinho, verde] = [await lerToken(page, tema, '#8a1538', token), await lerToken(page, tema, '#1f7a3a', token)]
        expect(vinho, `${tema} ${token}: a cor muda com a marca`).not.toEqual(verde)
        combinacoes++
      }
    expect(combinacoes).toBe(14)
    for (const marca of [null, '#8a1538', '#1f7a3a']) expect(await lerToken(page, 'black', marca, '--background'), `Preto ${marca ?? 'sem cor'}`).toEqual([0, 0, 0])
    // o fundo do body, no Preto, é o pixel 0, 0, 0 com as duas marcas e sem marca
    for (const marca of [null, '#8a1538', '#1f7a3a']) {
      await lerToken(page, 'black', marca, '--background')
      expect(await page.evaluate(() => window.__ux.pintar(['#fff', getComputedStyle(document.body).backgroundColor]))).toEqual([0, 0, 0])
    }
  })

  // C53 (AC 39): 3 pares x 3 temas x 3 marcas = 27 medidas
  test('texto com 4,5:1 sobre os neutros tingidos', async ({ page }) => {
    await instalar(page)
    await simularApi(page)
    await page.goto('/univag')
    await page.getByLabel('CPF').waitFor()
    const pares = [['--foreground', '--background'], ['--muted-foreground', '--background'], ['--muted-foreground', '--muted']]
    let medidas = 0
    for (const tema of Temas)
      for (const marca of [null, '#8a1538', '#224fa7'])
        for (const [frente, fundo] of pares) {
          const [f, b] = [await lerToken(page, tema, marca, frente), await lerToken(page, tema, marca, fundo)]
          expect(contraste(f, b), `${tema} ${marca ?? 'sem cor'}: ${frente} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5)
          medidas++
        }
    expect(medidas).toBe(27)
  })
})

// ---------- Lote 2: S3 (assistente) e S4 (solicitações, fila e chamado) ----------

const Longa =
  'O boleto do semestre fica no Portal do Aluno, em Financeiro, Boletos e mensalidades. Escolha o mês, confira o valor e gere a segunda via; se o valor estiver diferente do contrato, abra uma solicitação para o financeiro conferir a rematrícula do semestre anterior. '.repeat(3)
const Titulo104 = 'Pedido de segunda via do boleto de novembro com o valor da rematrícula do semestre anterior errado'.padEnd(104, '.')

// Cada pergunta do aluno recebe a resposta `texto` (a primeira abre a conversa 1)
async function respostas(page: Page, texto: string | ((n: number) => string)) {
  let n = 0
  const resposta = () => ({ resposta: { tipo: 'resposta', texto: typeof texto === 'string' ? texto : texto(++n) } })
  await page.route('**/api/conversas', (r) => r.fulfill(json({ conversaId: 1, ...resposta() }, 201)))
  await page.route('**/api/conversas/1/mensagens', (r) => r.fulfill(json(resposta())))
}
async function perguntar(page: Page, texto: string) {
  await page.getByLabel('Mensagem').fill(texto)
  await page.getByRole('button', { name: /Enviar/ }).click()
}

test.describe('S3 conversa', () => {
  // C22 (AC 15)
  test('Isso resolveu no fluxo sob a resposta', async ({ page }) => {
    await comoAluno(page)
    await respostas(page, (n) => `Resposta ${n}. ${Longa}`)
    await page.goto('/univag/assistente')
    for (const n of [1, 2, 3]) {
      await perguntar(page, `pergunta ${n}`)
      await expect(page.getByText(`Resposta ${n}.`)).toBeVisible()
    }
    const baloes = page.locator('.is-assistant')
    await expect(baloes).toHaveCount(3)
    const grupo = page.getByText('Isso resolveu?')
    await expect(grupo).toHaveCount(1)
    const ultimo = await caixa(baloes.last())
    const g = await caixa(grupo)
    expect(g.y).toBeGreaterThanOrEqual(ultimo.y + ultimo.height - 1)
    expect(g.y).toBeLessThanOrEqual(ultimo.y + ultimo.height + 24)
    const posicoes = await grupo.evaluate((el) => {
      const lista: string[] = []
      for (let n: Element | null = el; n && n.tagName !== 'MAIN'; n = n.parentElement) lista.push(getComputedStyle(n).position)
      return lista
    })
    expect(posicoes.length).toBeGreaterThan(0)
    expect(posicoes.filter((p) => p === 'fixed' || p === 'sticky')).toEqual([])
  })

  // C24 (Screens: Transferido)
  test('Transferido num bloco único com borda', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page, ['ALUNO'], false, comAparencia)
    await respostas(page, 'O boleto fica no portal.')
    await page.route('**/api/conversas/1/avaliacao', (r) => r.fulfill(json({ desfecho: null })))
    await page.route('**/api/conversas/1/transferir', (r) => r.fulfill(json({ numero: 'ONE-5', estado: 'ABERTO', setor: 'Financeiro' }, 201)))
    await page.goto('/univag/assistente')
    await perguntar(page, 'preciso do boleto')
    await page.getByRole('button', { name: 'Não' }).click()
    await page.getByRole('button', { name: /Falar com atendente/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Sua solicitação ONE-5 foi para Financeiro')).toHaveCount(1)
    const medidas = await page.evaluate(() => {
      const por = (seletor: string, texto: string) => [...document.querySelectorAll(seletor)].filter((e) => e.textContent === texto)
      const contato = por('h3', 'Contato do atendimento')[0].closest('section')!
      const alvos = [por('h2', 'Sua solicitação ONE-5 foi para Financeiro')[0], por('p', 'A resposta chega em Solicitações e no seu e-mail.')[0], contato, por('a', 'Ver solicitação')[0]]
      let comum: Element = alvos[0]
      while (!alvos.every((a) => comum.contains(a))) comum = comum.parentElement!
      const borda = (e: Element) => ['Top', 'Right', 'Bottom', 'Left'].map((l) => parseFloat(getComputedStyle(e)[`border${l}Width` as 'borderTopWidth']))
      const dentroDeBorda = alvos.map((a) => {
        for (let n = a.parentElement; n && n !== comum; n = n.parentElement) if (borda(n).some((w) => w > 0)) return true
        return false
      })
      return { achados: alvos.length, borda: borda(comum), dentroDeBorda }
    })
    expect(medidas.achados).toBe(4)
    expect(medidas.borda.every((w) => w >= 1), `bordas ${medidas.borda}`).toBe(true)
    expect(medidas.dentroDeBorda).toEqual([false, false, false, false])
  })

  // C25 (AC 17)
  test('balão com até 68 caracteres de largura', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await simularApi(page)
    await respostas(page, Longa)
    const emCaracteres = (alvo: Locator) =>
      alvo.evaluate((el) => {
        const medida = document.createElement('span')
        medida.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'
        medida.style.font = getComputedStyle(el).font
        medida.textContent = '0'.repeat(68)
        document.body.append(medida)
        const limite = medida.getBoundingClientRect().width
        medida.remove()
        return { largura: el.getBoundingClientRect().width, limite }
      })
    await page.goto('/univag/assistente')
    await perguntar(page, 'preciso do boleto')
    const naConversa = page.locator('.is-assistant').getByText(Longa.trim().slice(0, 50))
    await expect(naConversa).toHaveCount(1)
    const a = await emCaracteres(naConversa)
    expect(a.largura, 'a resposta passa de 1 linha').toBeGreaterThan(300)
    expect(a.largura).toBeLessThanOrEqual(a.limite + 1)

    await page.route('**/api/chamados/ONE-123', (r) => r.fulfill(json({ ...chamadoSimulado(), transcricao: [{ autor: 'ALUNO', texto: Longa, criadaEm: '2026-11-02T12:00:00Z' }], mensagens: [] })))
    await page.goto('/univag/chamados/ONE-123')
    await page.getByRole('button', { name: /^Conversa com o assistente/ }).click() // a conversa vem recolhida (chat-linha-do-tempo C17)
    const noChamado = page.getByText(Longa.trim().slice(0, 50))
    await expect(noChamado).toHaveCount(1)
    const d = await emCaracteres(noChamado)
    expect(d.largura, 'o texto passa de 1 linha').toBeGreaterThan(300)
    expect(d.largura).toBeLessThanOrEqual(d.limite + 1)
  })

  // C26 (AC 18)
  test('compositor de 44 px e Falar com atendente na linha de cima', async ({ page }) => {
    await instalar(page)
    await simularApi(page, ['ALUNO'])
    for (const largura of [390, 1440]) {
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto('/univag/assistente')
      const campo = page.getByLabel('Mensagem')
      await expect(campo).toHaveCount(1)
      expect((await caixa(campo)).height).toBeGreaterThanOrEqual(43.9)
      const falar = page.getByRole('button', { name: /Falar com atendente/ })
      await expect(falar).toHaveCount(1)
      const f = await caixa(falar)
      const form = await caixa(page.locator('form').filter({ has: campo }))
      expect(f.y + f.height, `${largura}: acima do compositor`).toBeLessThanOrEqual(form.y)
      expect(await falar.getAttribute('data-variant')).toBe('outline')
      const outros = page.getByRole('main').locator('button, a')
      const sobrepostos: (string | null)[] = []
      for (const o of await outros.all()) {
        const b = await o.boundingBox()
        const mesmo = (await o.getAttribute('data-slot')) === 'button' && (await o.textContent()) === (await falar.textContent())
        if (!mesmo && b && b.height > 0 && b.y < f.y + f.height && b.y + b.height > f.y) sobrepostos.push(await o.textContent())
      }
      expect(sobrepostos, `${largura}: botões na mesma linha`).toEqual([])
    }
  })

  // C28 (AC 20)
  test('erro de envio entre o balão e o compositor', async ({ page }) => {
    await comoAluno(page)
    await page.route('**/api/conversas', (r) => r.fulfill(json({ status: 500, detail: 'Falha simulada' }, 500)))
    await page.goto('/univag/assistente')
    await perguntar(page, 'preciso do boleto')
    const alerta = page.getByRole('log').getByRole('alert')
    await expect(alerta).toHaveCount(1)
    await expect(alerta).toContainText('Falha simulada')
    await expect(alerta.getByRole('button', { name: 'Reenviar' })).toBeVisible()
    const [a, aluno, form] = [await caixa(alerta), await caixa(page.locator('.is-user')), await caixa(page.locator('form').filter({ has: page.getByLabel('Mensagem') }))]
    expect(a.y).toBeGreaterThanOrEqual(aluno.y + aluno.height - 1)
    expect(a.y + a.height).toBeLessThanOrEqual(form.y + 1)
  })
})

// Minhas solicitações com 3 itens e a Fila com o título longo de C31
const longoTitulo = 'Preciso da segunda via do boleto de novembro, que veio com o valor da rematrícula do semestre anterior'
const MeusTres = (titulo: string) => [
  { numero: 'ONE-1', titulo, estado: 'AGUARDANDO_ALUNO', criadoEm: '2026-11-02T12:00:00Z' },
  { numero: 'ONE-2', titulo: 'Segunda via', estado: 'ABERTO', criadoEm: '2026-11-01T12:00:00Z' },
  { numero: 'ONE-3', titulo: 'Declaração', estado: 'RESOLVIDO', criadoEm: '2026-10-30T12:00:00Z' },
]
const listasDeChamados = async (page: Page, titulo = longoTitulo) => {
  await page.route(/\/api\/chamados\?escopo=meus/, (r) => r.fulfill(json(MeusTres(titulo))))
  await page.route(/\/api\/chamados\?escopo=fila/, (r) =>
    r.fulfill(
      json([
        { numero: 'ONE-1', titulo, categoria: 'Financeiro > Boletos e mensalidades', estado: 'AGUARDANDO_ALUNO', responsavel: null, criadoEm: '2026-11-02T12:00:00Z', dias: 2 },
        { numero: 'ONE-2', titulo: 'Segunda via', categoria: 'Financeiro > Boletos e mensalidades', estado: 'ABERTO', responsavel: null, criadoEm: '2026-11-03T12:00:00Z', dias: 1 },
      ]),
    ),
  )
}

test.describe('S4 listas', () => {
  // C29 (AC 21)
  test('listas em linhas com divisória e sem borda de cartão', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page, undefined, true)
    await listasDeChamados(page)
    for (const [rota, itens] of [['fila', 2], ['solicitacoes', 3]] as const) {
      await page.goto(`/univag/${rota}`)
      const linhas = page.getByRole('main').getByRole('listitem')
      await expect(linhas, rota).toHaveCount(itens)
      const m = await linhas.evaluateAll((els) =>
        els.map((e) => {
          const s = getComputedStyle(e)
          const r = e.getBoundingClientRect()
          return { esq: s.borderLeftWidth, dir: s.borderRightWidth, raio: s.borderRadius, sombra: s.boxShadow, baixo: parseFloat(s.borderBottomWidth), cima: parseFloat(s.borderTopWidth), top: r.top, bottom: r.bottom }
        }),
      )
      for (const l of m) expect([l.esq, l.dir, l.raio, l.sombra], rota).toEqual(['0px', '0px', '0px', 'none'])
      for (let i = 0; i < m.length - 1; i++) {
        expect(m[i].baixo >= 1 || m[i + 1].cima >= 1, `${rota}: divisória entre ${i} e ${i + 1}`).toBe(true)
        expect(Math.abs(m[i + 1].top - m[i].bottom)).toBeLessThanOrEqual(1)
      }
    }
    await page.setViewportSize({ width: 1024, height: 768 })
    for (const rota of ['fila', 'solicitacoes']) {
      await page.goto(`/univag/${rota}`)
      const linhas = page.locator('tbody tr')
      await expect(linhas.first()).toBeVisible()
      const m = await linhas.evaluateAll((els) => els.map((e) => ({ raio: getComputedStyle(e).borderRadius, esq: getComputedStyle(e).borderLeftWidth })))
      expect(m.length, rota).toBeGreaterThan(0)
      for (const l of m) expect([l.raio, l.esq], rota).toEqual(['0px', '0px'])
    }
  })

  // C31 (Screens: Minhas solicitações, Fila)
  test('linha de solicitação em 3 linhas', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page)
    await listasDeChamados(page, Titulo104)
    const perto = (a: number, b: number, folga = 2) => Math.abs(a - b) <= folga
    for (const rota of ['solicitacoes', 'fila']) {
      await page.goto(`/univag/${rota}`)
      const linha = page.getByRole('main').getByRole('listitem').first()
      await expect(linha).toHaveCount(1)
      const assunto = linha.locator('p', { hasText: Titulo104 }) // o assunto, com o número na frente
      await expect(assunto).toHaveCount(1)
      const a = await caixa(assunto)
      const altura = await assunto.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight))
      expect(a.height, `${rota}: assunto em até 2 linhas`).toBeLessThanOrEqual(2 * altura + 1)
      const selo = linha.locator('[data-slot=badge]')
      await expect(selo).toHaveCount(1)
      const data = linha.getByText(/^aberto /)
      await expect(data).toHaveCount(1)
      const [s, d] = [await caixa(selo), await caixa(data)]
      expect(perto(s.y, d.y), `${rota}: selo e data no mesmo top`).toBe(true)
      expect(s.y).toBeGreaterThanOrEqual(a.y + a.height - 1)
      if (rota === 'fila') {
        const categoria = await caixa(linha.getByText('Financeiro > Boletos e mensalidades'))
        expect(perto(categoria.y, d.y), 'categoria na linha da data').toBe(true)
      } else {
        const passo = linha.getByText('Responda para continuar')
        await expect(passo).toHaveCount(1)
        expect(await passo.evaluate((e) => getComputedStyle(e).fontSize)).toBe('12px')
        expect((await caixa(passo)).y).toBeGreaterThanOrEqual(s.y + s.height - 1)
      }
    }
  })

  // C33 (AC 23)
  test('Mais antigos primeiro acima da Fila', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page)
    await page.goto('/univag/fila')
    const aviso = page.getByText('Mais antigos primeiro')
    await expect(aviso).toHaveCount(1)
    const [a, primeiro] = [await caixa(aviso), await caixa(page.getByRole('main').getByRole('listitem').first())]
    expect(a.y + a.height).toBeLessThanOrEqual(primeiro.y)
    // a categoria quebra linha em vez de cortar
    const categoria = page.getByRole('main').getByRole('listitem').first().getByText(/Financeiro > Boletos/)
    const m = await categoria.evaluate((e) => ({ corte: getComputedStyle(e).textOverflow, sobra: e.scrollWidth - e.clientWidth }))
    expect(m.corte).not.toBe('ellipsis')
    expect(m.sobra).toBeLessThanOrEqual(0)
  })
})

// ---------- S4: detalhe do chamado ----------

const Abertos = ['responder', 'nota', 'assumir', 'resolver', 'encaminhar', 'reclassificar', 'duplicado']
const PorEstado: [string, string[], string[]][] = [
  ['ABERTO', Abertos, ['Assumir', 'Mais']],
  ['EM_ATENDIMENTO', Abertos, ['Responder', 'Mais']],
  ['AGUARDANDO_ALUNO', Abertos, ['Responder', 'Mais']],
  ['RESOLVIDO', ['nota', 'reclassificar'], ['Mais']],
  ['FECHADO', [], []],
]
async function comoEquipe(page: Page, largura: number, estado = 'EM_ATENDIMENTO', acoes = Abertos) {
  await page.unroute('**/api/**').catch(() => undefined)
  await instalar(page)
  await page.setViewportSize({ width: largura, height: 844 })
  await simularApi(page)
  await page.route('**/api/chamados/ONE-123', (r) =>
    r.fulfill(json({ ...chamadoSimulado(estado), acoes, setores: [{ id: 2, nome: 'Financeiro' }], categorias: [{ id: 3, nome: 'Boleto' }] })),
  )
  await page.goto('/univag/chamados/ONE-123')
  await page.getByText('Resumo gerado por IA').waitFor()
}
// A barra fixa: o contêiner fixo do botão "Mais" ou da ação principal
const barraDe = (page: Page) => page.locator('div.fixed').filter({ has: page.getByRole('button', { name: /^(Mais|Assumir|Responder)$/ }) })
// Os botões e rótulos de um contêiner, na ordem, sem o X do Sheet
const itensDe = (alvo: Locator) => alvo.evaluate((el) => [...el.querySelectorAll('button, label')].map((e) => e.textContent!.trim()).filter((t) => t && t !== 'Fechar'))

test.describe('S4 detalhe', () => {
  test.setTimeout(180_000)

  // C34 (AC 24, P4, P5)
  test('barra do detalhe com a ação principal do estado', async ({ page }) => {
    // o cartão a 1024 px dá a ordem das ações de cada estado, e não há barra
    const doCartao: Record<string, string[]> = {}
    for (const [estado, acoes] of PorEstado) {
      await comoEquipe(page, 1024, estado, acoes)
      await expect(barraDe(page), `${estado}: sem barra a 1024`).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Mais' })).toHaveCount(0)
      const cartao = page.locator('[data-slot=card]').filter({ has: page.getByText('Ações', { exact: true }) })
      doCartao[estado] = (await cartao.count()) ? await itensDe(cartao) : []
    }
    for (const largura of [390, 1023]) {
      for (const [estado, acoes, botoes] of PorEstado) {
        await comoEquipe(page, largura, estado, acoes)
        const nome = `${estado} a ${largura}`
        if (botoes.length === 0) {
          await expect(page.getByRole('button', { name: /^(Mais|Assumir|Responder)$/ }), nome).toHaveCount(0)
          continue
        }
        const barra = barraDe(page)
        await expect(barra, nome).toHaveCount(1)
        expect(await barra.evaluate((e) => getComputedStyle(e).position)).toBe('fixed')
        const b = await caixa(barra)
        expect(b.y + b.height, `${nome}: colada na base`).toBeCloseTo(844, 0)
        expect(b.height).toBeGreaterThanOrEqual(43.9)
        expect(await barra.getByRole('button').allTextContents(), nome).toEqual(botoes)
        await barra.getByRole('button', { name: 'Mais' }).click()
        const folha = page.getByRole('dialog')
        await expect(folha).toHaveCount(1)
        const f = await caixa(folha)
        expect(f.y + f.height).toBeCloseTo(844, 0)
        const esperado = estado === 'ABERTO' ? doCartao[estado].filter((t) => t !== 'Assumir') : doCartao[estado]
        expect(esperado.length, `${nome}: o cartão tem ações`).toBeGreaterThan(0)
        expect(await itensDe(folha), `${nome}: as outras ações, na ordem do cartão`).toEqual(esperado)
        if (estado === 'RESOLVIDO') expect(esperado).toContain('Reclassificar')
      }
    }
  })

  // C35 (AC 25)
  test('Responder rola até o campo e foca', async ({ page }) => {
    await comoEquipe(page, 390)
    await page.evaluate(() => window.scrollTo(0, 0))
    await barraDe(page).getByRole('button', { name: 'Responder' }).click()
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('resposta')
    const campo = await caixa(page.locator('#resposta'))
    const barra = await caixa(barraDe(page))
    expect(campo.y).toBeGreaterThanOrEqual(49)
    expect(campo.y + campo.height).toBeLessThanOrEqual(barra.y)
  })

  // C37 (AC 27)
  test('Enviar inteiro acima da barra no fim do detalhe', async ({ page }) => {
    for (const largura of [390, 1023]) {
      await comoEquipe(page, largura)
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const enviar = page.getByRole('button', { name: 'Enviar' })
      await expect(enviar).toHaveCount(1)
      const [e, barra] = [await caixa(enviar), await caixa(barraDe(page))]
      expect(e.y + e.height, `${largura}: acima da barra`).toBeLessThanOrEqual(barra.y)
      expect(e.y).toBeGreaterThanOrEqual(0)
    }
  })

  // C36 (AC 26)
  test('aluno cancela por botão de texto no fim do detalhe', async ({ page }) => {
    for (const largura of [390, 1280]) {
      await page.unroute('**/api/**').catch(() => undefined)
      await instalar(page)
      await page.setViewportSize({ width: largura, height: 844 })
      await simularApi(page, ['ALUNO'])
      const doAluno = (estado: string, acoes: string[]) => ({ ...chamadoSimulado(estado), eventos: null, resumo: null, solicitante: null, acoes })
      await page.route('**/api/chamados/ONE-123', (r) => r.fulfill(json(doAluno('ABERTO', ['responder', 'cancelar']))))
      const pedidos: string[] = []
      await page.route('**/api/chamados/ONE-123/cancelar', (r) => {
        pedidos.push(r.request().method())
        return r.fulfill(json(doAluno('FECHADO', [])))
      })
      await page.goto('/univag/chamados/ONE-123')
      const cancelar = page.getByRole('button', { name: 'Cancelar solicitação' })
      await expect(cancelar).toHaveCount(1)
      await expect(page.getByRole('button', { name: /^(Ações|Mais)$/ })).toHaveCount(0)
      const fixos = await page.evaluate(() => {
        // a navegação é a barra de abas (celular) ou a barra lateral (desktop)
        const nav = document.querySelector('nav[aria-label="Navegação"], [data-slot=sidebar-container]')
        return [...document.querySelectorAll('body *')]
          .filter((e) => getComputedStyle(e).position === 'fixed' && !(nav && (nav.contains(e) || e.contains(nav))) && e.getBoundingClientRect().height > 0)
          .map((e) => `${e.tagName}.${e.className}`.slice(0, 80))
      })
      expect(fixos, `${largura}: nada fixo fora da navegação`).toEqual([])
      const ultimo = await page.getByRole('main').evaluate((m) => {
        const focaveis = [...m.querySelectorAll('a[href], button, input, textarea, select')].filter((e) => e.getBoundingClientRect().height > 0)
        return focaveis.at(-1)?.textContent
      })
      expect(ultimo).toBe('Cancelar solicitação')
      expect(await cancelar.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
      expect(await corSobreFundo(cancelar, 'color')).toEqual(await referencia(page, '--destructive'))
      await cancelar.click()
      const dialogo = page.getByRole('dialog', { name: 'Cancelar a solicitação?' })
      await expect(dialogo).toHaveCount(1)
      await dialogo.getByRole('button', { name: 'Cancelar solicitação' }).click()
      await expect.poll(() => pedidos).toEqual(['POST'])
    }
  })
})

// ---------- Lote 3: S5 (formulários, erros e administração), varreduras de S6 e S7 ----------

const Celular = { width: 360, height: 740 }

// O que cada diálogo de formulário abre e o nome da ação do rodapé
type Dialogo = { nome: string; caminho: string; papeis?: string[]; esperar: string; abrir: (p: Page) => Promise<void>; titulo: string; acao: string }
const Dialogos: Dialogo[] = [
  { nome: 'Artigos Novo', caminho: '/univag/artigos', esperar: 'Como emitir a segunda via do boleto do semestre com o valor corrigido', abrir: (p) => p.getByRole('button', { name: 'Novo', exact: true }).click(), titulo: 'Novo artigo', acao: 'Salvar' },
  { nome: 'Documentos Enviar PDF', caminho: '/univag/documentos', esperar: 'Regulamento do estágio supervisionado obrigatório dos cursos de graduação', abrir: (p) => p.getByRole('button', { name: 'Enviar PDF' }).click(), titulo: 'Enviar PDF', acao: 'Enviar' },
  { nome: 'Usuários Novo', caminho: '/univag/usuarios', esperar: 'Carla Regina de Souza Albuquerque', abrir: (p) => p.getByRole('button', { name: 'Novo', exact: true }).click(), titulo: 'Novo usuário', acao: 'Salvar' },
  { nome: 'Cadastros Novo (Setores)', caminho: '/univag/cadastros', esperar: 'Coordenação de Análise e Desenvolvimento de Sistemas', abrir: (p) => p.getByRole('button', { name: 'Novo setor', exact: true }).click(), titulo: 'Novo: Setores', acao: 'Salvar' },
  { nome: 'Instituições Nova instituição', caminho: '/univag/instituicoes', papeis: ['ADMINISTRADOR', 'OPERADOR'], esperar: 'Faculdade Antiga', abrir: (p) => p.getByRole('button', { name: 'Nova instituição' }).click(), titulo: 'Nova instituição', acao: 'Criar' },
  {
    nome: 'Instituições Importar carga', caminho: '/univag/instituicoes', papeis: ['ADMINISTRADOR', 'OPERADOR'], esperar: 'Faculdade Antiga',
    abrir: async (p) => {
      await p.getByRole('button', { name: 'Ações de Centro Universitário de Várzea Grande' }).click()
      await p.getByRole('menuitem', { name: 'Importar carga' }).click()
    },
    titulo: 'Importar carga: Centro Universitário de Várzea Grande', acao: 'Importar',
  },
]

async function noCelular(page: Page, caminho: string, esperar: string, papeis?: string[], largura = 360) {
  await instalar(page)
  await page.setViewportSize({ width: largura, height: 740 })
  await simularApi(page, papeis)
  await page.goto(caminho)
  await page.getByText(esperar).first().waitFor()
}

test.describe('S5 diálogos e administração', () => {
  test.setTimeout(240_000)

  // C39 (AC 29)
  for (const d of Dialogos)
    test(`diálogos de formulário em tela inteira abaixo de 768: ${d.nome}`, async ({ page }) => {
      await noCelular(page, d.caminho, d.esperar, d.papeis)
      await d.abrir(page)
      const dialogo = page.getByRole('dialog', { name: d.titulo })
      await expect(dialogo).toHaveCount(1)
      await expect.poll(async () => Object.values(await caixa(dialogo)).map(Math.round), 'a caixa do diálogo').toEqual([0, 0, Celular.width, Celular.height])

      const cabecalho = dialogo.locator('[data-slot=sheet-header]')
      await expect(cabecalho).toHaveCount(1)
      await expect(cabecalho.getByText(d.titulo, { exact: true })).toHaveCount(1)
      const x = cabecalho.getByRole('button', { name: 'Fechar', exact: true })
      await expect(x).toHaveCount(1)
      const xc = await caixa(x)
      expect([xc.width, xc.height].every((v) => v >= 43.9), 'X de 44 x 44').toBe(true)

      const rodape = dialogo.locator('[data-slot=sheet-footer]')
      await expect(rodape).toHaveCount(1)
      await expect(rodape.getByRole('button')).toHaveText(['Cancelar', d.acao])
      const r = await caixa(rodape)
      expect(r.y + r.height, 'o rodapé na base, antes de rolar').toBeCloseTo(Celular.height, 0)

      const corpo = dialogo.locator('form > div:not([data-slot])')
      await expect(corpo).toHaveCount(1)
      expect(['auto', 'scroll']).toContain(await corpo.evaluate((e) => getComputedStyle(e).overflowY))
      const [c, h, f] = [await caixa(corpo), await caixa(cabecalho), r]
      expect(c.y, 'o corpo começa sob o cabeçalho').toBeGreaterThanOrEqual(h.y + h.height - 1)
      expect(c.y + c.height, 'o corpo termina no rodapé').toBeLessThanOrEqual(f.y + 1)
      if (d.titulo === 'Novo usuário') {
        const [rolagem, visivel] = await corpo.evaluate((e) => [e.scrollHeight, e.clientHeight])
        expect(rolagem, 'o corpo rola').toBeGreaterThan(visivel)
      }
    })

  test('diálogos de formulário em tela inteira abaixo de 768: a 768 o Novo usuário é um diálogo', async ({ page }) => {
    await noCelular(page, '/univag/usuarios', 'Carla Regina de Souza Albuquerque', undefined, 768)
    await page.getByRole('button', { name: 'Novo', exact: true }).click()
    const dialogo = page.getByRole('dialog', { name: 'Novo usuário' })
    await expect(dialogo).toHaveCount(1)
    await expect.poll(async () => (await caixa(dialogo)).width).toBeLessThan(768)
  })

  // C40 (AC 30)
  test('erro do CPF abaixo do campo a 360', async ({ page }) => {
    await noCelular(page, '/univag/usuarios', 'Carla Regina de Souza Albuquerque')
    await page.route('**/api/admin/usuarios', (r) =>
      r.request().method() === 'POST' ? r.fulfill(json({ status: 400, detail: 'CPF inválido.', errors: { cpf: ['CPF inválido.'] } }, 400)) : r.fallback(),
    )
    await page.getByRole('button', { name: 'Novo', exact: true }).click()
    const dialogo = page.getByRole('dialog', { name: 'Novo usuário' })
    await dialogo.getByRole('button', { name: 'Salvar' }).click()
    const erro = dialogo.getByText('CPF inválido.')
    await expect(erro).toHaveCount(1)
    const [campo, e] = [await caixa(dialogo.getByLabel('CPF', { exact: true })), await caixa(erro)]
    expect(e.y, 'o erro começa depois do campo').toBeGreaterThanOrEqual(campo.y + campo.height - 0.5)
    expect(e.y, 'e a no máximo 24 px dele').toBeLessThanOrEqual(campo.y + campo.height + 24)
    const rodape = await caixa(dialogo.locator('[data-slot=sheet-footer]'))
    expect(rodape.y + rodape.height, 'o Salvar segue no rodapé fixo').toBeCloseTo(Celular.height, 0)
    await expect(dialogo.locator('[data-slot=sheet-footer]').getByRole('button', { name: 'Salvar' })).toBeVisible()
  })

  // C45 (Screens: Artigos)
  test('Indexado em ícone ao lado do título', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await simularApi(page)
    await page.goto('/univag/artigos')
    const linha = page.locator('tbody tr').first()
    await linha.waitFor()
    const titulo = linha.locator('td').first().locator('span').first()
    const icone = linha.getByRole('img', { name: 'Indexado' })
    await expect(titulo).toHaveCount(1)
    await expect(icone).toHaveCount(1)
    // o título pode quebrar em linhas: o ícone segue a última
    const fim = await titulo.evaluate((e) => {
      const r = [...e.getClientRects()].at(-1)!
      return { right: r.right, meio: r.top + r.height / 2 }
    })
    const i = await caixa(icone)
    expect(i.x, 'o ícone depois do texto').toBeGreaterThanOrEqual(fim.right - 0.5)
    expect(i.x - fim.right, 'a no máximo 8 px').toBeLessThanOrEqual(8)
    expect(Math.abs(i.y + i.height / 2 - fim.meio), 'centros verticais').toBeLessThanOrEqual(2)
  })

  // C47 (Screens: Usuários)
  test('busca de Usuários acima da lista', async ({ page }) => {
    await noCelular(page, '/univag/usuarios', 'Carla Regina de Souza Albuquerque', undefined, 390)
    const busca = page.getByLabel('Buscar por nome, CPF ou e-mail')
    await expect(busca).toHaveCount(1)
    const item = page.getByRole('main').getByRole('listitem').first()
    await expect(item).toBeVisible()
    const [b, i] = [await caixa(busca), await caixa(item)]
    expect(b.y + b.height).toBeLessThanOrEqual(i.y)
    await busca.fill('zzz')
    await expect(page.getByText('Nenhum usuário combina com a busca.')).toBeVisible()
  })

  // C48 (AC 35)
  test('Baixar modelo baixa o CSV com o cabeçalho', async ({ page }) => {
    await noCelular(page, '/univag/matriculas', 'Baixe o modelo', undefined, 1280)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar modelo (CSV)' }).click()])
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
    const fluxo = await download.createReadStream()
    const partes: Buffer[] = []
    for await (const parte of fluxo) partes.push(parte as Buffer)
    expect(Buffer.concat(partes).toString('utf8').split('\n')[0]).toBe('cpf;nome;email;matricula;curso;semestre;situacao')
  })

  // C48 (AC 35): o número de cada passo é visível e legível nos 3 temas
  test('números dos passos de Matrículas visíveis nos 3 temas', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await simularApi(page)
    for (const tema of Temas) {
      await page.goto('/univag/matriculas')
      await page.evaluate((t) => localStorage.setItem('one-tema', t), tema)
      await page.reload()
      await expect(page.locator('html'), tema).toHaveClass(tema === 'light' ? /^((?!dark|black).)*$/ : new RegExp(tema))
      await page.getByText('Baixe o modelo').first().waitFor()
      for (const n of ['1', '2', '3']) {
        const numero = page.locator(`h2[id^=passo-] span`, { hasText: new RegExp(`^${n}$`) })
        await expect(numero, `${tema}: passo ${n}`).toHaveCount(1)
        expect((await caixa(numero)).height, `${tema} ${n}: altura`).toBeGreaterThan(0)
        const [fundo, texto] = await numero.evaluate((el) => {
          const pilha = window.__ux.pilha(el)
          return [window.__ux.pintar(pilha), window.__ux.pintar([...pilha, getComputedStyle(el).color])]
        })
        expect(contraste(texto, fundo), `${tema} ${n}: contraste`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  // C49 (AC 36)
  const Abas: [string, string, string, string][] = [
    ['Setores', 'Coordenação de Análise e Desenvolvimento de Sistemas', 'Editar: Setores', ''],
    ['Categorias', 'Financeiro > Boletos e mensalidades', 'Editar: Categorias', ''],
    ['Cursos', 'Análise e Desenvolvimento de Sistemas', 'Editar: Cursos', '/api/admin/cursos'],
    ['Fluxos', 'Financeiro > Boletos e mensalidades', 'Editar: Fluxos', '/api/admin/fluxos'],
    ['Respostas prontas', 'Boleto pronto', 'Editar: Respostas prontas', '/api/admin/respostas-prontas'],
  ]
  const ItemDe: Record<string, unknown> = {
    '/api/admin/cursos': [{ id: 1, nome: 'Análise e Desenvolvimento de Sistemas', setorCoordenacaoId: 1 }],
    '/api/admin/fluxos': [{ id: 1, categoriaId: 1, cursoId: null, semestre: null, vigente: { numero: 1, etapas: [{ destino: 'SETOR', setorId: 1, prazoHoras: null, x: null, y: null }] }, rascunho: null }],
    '/api/admin/respostas-prontas': [{ id: 1, setorId: 1, titulo: 'Boleto pronto', texto: 'Segue o boleto.' }],
  }
  test('linha inteira de Cadastros é o alvo de 48 px', async ({ page }) => {
    await instalar(page)
    await simularApi(page)
    for (const url of Object.keys(ItemDe)) await page.route(`**${url}`, (r) => r.fulfill(json(ItemDe[url])))
    let casos = 0
    for (const largura of [390, 1280]) {
      await page.setViewportSize({ width: largura, height: 900 })
      for (const [aba, texto, titulo] of Abas) {
        await page.goto('/univag/cadastros')
        await page.getByText('Coordenação de Análise e Desenvolvimento de Sistemas').first().waitFor()
        if (largura === 390) await page.getByLabel('Cadastro', { exact: true }).selectOption({ label: aba })
        else await page.getByRole('tab', { name: aba }).click()
        const linhas = largura === 390 ? page.getByRole('main').getByRole('listitem') : page.locator('[role=tabpanel] tbody tr')
        await expect(linhas, `${aba} a ${largura}`).toHaveCount(1)
        await expect(linhas.first()).toContainText(texto.split(' > ')[0])
        const c = await caixa(linhas.first())
        expect(c.height, `${aba} a ${largura}: altura da linha`).toBeGreaterThanOrEqual(47.9)
        await page.mouse.click(c.x + c.width - 4, c.y + c.height / 2)
        // o editor de fluxo é uma página da casca (região); os outros cadastros abrem diálogo
        await expect(page.getByRole(titulo === 'Editar: Fluxos' ? 'region' : 'dialog', { name: titulo }), `${aba} a ${largura}: abre a edição`).toHaveCount(1)
        casos++
      }
    }
    expect(casos).toBe(10)
  })

  // C50 (AC 37)
  test('Aparência com o formulário primeiro e Ver prévia', async ({ page }) => {
    await instalar(page)
    await simularApi(page, ['ADMINISTRADOR'], false, comAparencia)
    for (const largura of [390, 1023]) {
      await page.setViewportSize({ width: largura, height: 844 })
      await page.goto('/univag/aparencia')
      await page.getByLabel('Cor principal').waitFor()
      await expect(page.getByLabel('Cor principal'), `${largura}: o campo`).toBeVisible()
      await expect(page.getByRole('region', { name: 'Prévia' }), `${largura}: a prévia não está na página`).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Entrar' }), `${largura}: nada da prévia`).toHaveCount(0)
      await page.getByRole('button', { name: 'Ver prévia' }).click()
      const dialogo = page.getByRole('dialog')
      await expect(dialogo).toHaveCount(1)
      await expect(dialogo.getByRole('button', { name: 'Entrar' })).toBeVisible()
    }
    await page.setViewportSize({ width: 1024, height: 800 })
    await page.goto('/univag/aparencia')
    await page.getByLabel('Cor principal').waitFor()
    await expect(page.getByRole('button', { name: 'Ver prévia' })).toHaveCount(0)
    const [f, p] = [await caixa(page.locator('main form')), await caixa(page.getByRole('region', { name: 'Prévia' }))]
    expect(f.x + f.width).toBeLessThanOrEqual(p.x + 1)
  })

  // C51 (AC 38)
  test('prévia escura com a mesma cor do app', async ({ page }) => {
    await instalar(page)
    await page.addInitScript(() => localStorage.setItem('one-tema', 'dark'))
    await page.setViewportSize({ width: 1280, height: 900 })
    await simularApi(page, ['ADMINISTRADOR'], false, comAparencia)
    await page.goto('/univag/aparencia')
    await page.getByLabel('Cor principal').waitFor()
    const [previa, salvar] = [page.locator('section[aria-label=Prévia]').getByRole('button', { name: 'Entrar' }), page.locator('main form').getByRole('button', { name: 'Salvar' })]
    await expect(previa).toHaveCount(1)
    await expect(salvar).toHaveCount(1)
    const pintura = async (b: Locator) => ({ fundo: await corSobreFundo(b, 'backgroundColor'), texto: await corSobreFundo(b, 'color') })
    const [p, s] = [await pintura(previa), await pintura(salvar)]
    expect(p.fundo, 'mesma cor de fundo').toEqual(s.fundo)
    expect(p.texto, 'mesmo texto').toEqual(s.texto)
    expect(contraste(p.fundo, p.texto)).toBeGreaterThanOrEqual(4.5)
  })

  // C71 (AC 38): a cor digitada pinta o botão da prévia, medida no Chromium
  test('prévia clara pinta a cor digitada', async ({ page }) => {
    await instalar(page)
    await page.addInitScript(() => localStorage.setItem('one-tema', 'light'))
    await page.setViewportSize({ width: 1280, height: 900 })
    await simularApi(page, ['ADMINISTRADOR'], false, comAparencia)
    await page.goto('/univag/aparencia')
    await page.getByLabel('Cor principal').fill('#224fa7')
    const entrar = page.locator('section[aria-label=Prévia]').getByRole('button', { name: 'Entrar' })
    const esperada = await page.evaluate(() => {
      const ref = document.createElement('div')
      ref.style.backgroundColor = '#224fa7'
      document.body.append(ref)
      const cor = getComputedStyle(ref).backgroundColor
      ref.remove()
      return cor
    })
    await expect(entrar).toHaveCSS('background-color', esperada)
  })
})

// ---------- S6: varreduras de todas as telas ----------

test.describe('S6 varreduras', () => {
  test.setTimeout(300_000)

  // C55 (AC 41)
  test('no máximo 4 tamanhos de texto por tela', async ({ page }) => {
    await instalar(page)
    let telas = 0
    for (const largura of [390, 1440]) {
      await page.setViewportSize({ width: largura, height: 900 })
      await varrer(page, async (nome) => {
        const tamanhos = await page.evaluate(() => {
          const visivel = (e: Element) => {
            const r = e.getBoundingClientRect()
            return e.checkVisibility() && r.width > 1 && r.height > 1
          }
          const achados: Record<string, string> = {}
          for (const el of document.querySelectorAll('body *')) {
            if (!visivel(el) || ![...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())) continue
            const px = getComputedStyle(el).fontSize
            achados[px] ??= `${el.tagName.toLowerCase()}: ${el.textContent!.trim().slice(0, 30)}`
          }
          return achados
        })
        const fora = Object.entries(tamanhos).filter(([px]) => !['12px', '14px', '16px'].includes(px))
        // identidade-visual AC 2: além do único tamanho de título, 28 px só no h1 das telas de acesso (o nome da instituição) e da raiz ("One", o mesmo h1) e 40 px só no número principal de Indicadores
        const excecao = ([px, exemplo]: [string, string]) => (px === '28px' && ['Login', 'Raiz', 'Primeiro acesso', 'Criar senha'].includes(nome) && exemplo.startsWith('h1:')) || (px === '40px' && nome === 'Indicadores')
        const titulos = fora.filter((f) => !excecao(f))
        expect(titulos.length, `${nome} a ${largura}: no máximo 1 tamanho de título (${JSON.stringify(tamanhos)})`).toBeLessThanOrEqual(1)
        for (const [px, exemplo] of titulos) expect(['20px', '24px'], `${nome} a ${largura}: ${px} em ${exemplo}`).toContain(px)
        telas++
      })
    }
    expect(telas).toBe(2 * (Telas.length + 2))
  })

  // C56 (AC 42)
  test('sem emoji nem gradiente', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await varrer(
      page,
      async (nome) => {
        const achados = await page.evaluate(() => ({
          emoji: [...document.querySelectorAll('h1, h2, h3')].filter((h) => /\p{Extended_Pictographic}/u.test(h.textContent ?? '')).map((h) => h.textContent),
          gradiente: [...document.querySelectorAll('body *')]
            .filter((e) => getComputedStyle(e).backgroundImage.includes('gradient'))
            .map((e) => `${e.tagName}.${e.className}`.slice(0, 80)),
        }))
        expect(achados.emoji, `${nome}: emoji em título`).toEqual([])
        expect(achados.gradiente, `${nome}: gradiente`).toEqual([])
      },
      comAparencia,
    )
  })

  // C57 (AC 43, door 3)
  test('cor de ação só em botão principal, item ativo, link e foco', async ({ page }) => {
    await instalar(page)
    await varrer(
      page,
      async (nome) => {
        await page.setViewportSize({ width: nome === 'Conta' ? 390 : 1440, height: 900 })
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        // C57: o ranking só conta depois que ao menos uma barra (estrutura-visual door 4: uma div em --chart-1) tem altura
        if (nome === 'Indicadores') await page.waitForFunction(() => [...document.querySelectorAll('[data-barra]')].some((b) => b.getBoundingClientRect().height > 0))
        const [primaria] = await Promise.all([referencia(page, '--primary')])
        const indevidos = await page.evaluate((alvo) => {
          const pintar = window.__ux.pintar
          const igual = (cor: string, sobre: string) => pintar([sobre, cor]).join() === alvo.join()
          const visivel = (e: Element) => e.checkVisibility() && e.getBoundingClientRect().width > 0
          const ativo = (e: Element) => !!e.closest('[aria-current=page], [data-active=true]')
          const achados: string[] = []
          for (const el of document.querySelectorAll('body *')) {
            if (!visivel(el)) continue
            const s = getComputedStyle(el)
            const rotulo = `${el.tagName.toLowerCase()}.${String(el.getAttribute('class') ?? '').slice(0, 60)}`
            if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && igual(s.backgroundColor, '#fff')) {
              const botao = el.matches('[data-slot=button][data-variant=default]')
              const sigla = el.getAttribute('aria-hidden') === 'true' && el.textContent!.trim().length <= 2
              const amostra = el.getAttribute('data-testid') === 'amostra' || el.hasAttribute('data-amostra') // a cor que o administrador digitou ou as cores prontas, mostradas como dado do campo
              if (!botao && !ativo(el) && !sigla && !amostra) achados.push(`fundo ${rotulo}`)
            }
            if (igual(s.color, '#fff') && !el.closest('a, [data-variant=link], [aria-current=page], [data-active=true]')) achados.push(`texto ${rotulo}`)
            if (el instanceof SVGElement && el.closest('.recharts-wrapper') && [s.fill, s.stroke].some((c) => c !== 'none' && igual(c, '#fff'))) achados.push(`gráfico ${rotulo}`)
            if (s.borderTopWidth !== '0px' && igual(s.borderTopColor, '#fff')) achados.push(`borda ${rotulo}`)
          }
          return achados
        }, primaria)
        expect(indevidos, `${nome}: cor de ação fora de botão principal, item ativo, link e foco`).toEqual([])
      },
      { ...comAparencia, imagens: { logo: null, icone: null, login: null, assistente: null } },
    )
  })

  test('cor de ação só em botão principal, item ativo, link e foco: o foco por Tab', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await simularApi(page, undefined, false, comAparencia)
    await page.goto('/univag')
    await page.getByLabel('CPF').waitFor()
    const campo = page.getByLabel('CPF')
    const antes = await corSobreFundo(campo, 'borderTopColor')
    for (let i = 0; i < 5 && !(await campo.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(campo).toBeFocused()
    expect(await corSobreFundo(campo, 'borderTopColor'), 'a borda de foco').not.toEqual(antes)
    expect(await corSobreFundo(campo, 'borderTopColor')).toEqual(await referencia(page, '--ring'))
  })
})

// ---------- S7: acréscimos depois do lote 2 ----------

test.describe('S7 acréscimos', () => {
  test.setTimeout(120_000)

  // C66 (AC 44)
  test('folha de ações guarda o que foi digitado', async ({ page }) => {
    await comoEquipe(page, 390)
    await page.route('**/api/chamados/ONE-123/resolver', (r) => r.fulfill(json({ ...chamadoSimulado(), acoes: Abertos, setores: [{ id: 2, nome: 'Financeiro' }], categorias: [{ id: 3, nome: 'Boleto' }] })))
    const mais = () => page.getByRole('button', { name: 'Mais', exact: true }).click()
    const folha = () => page.getByRole('dialog', { name: 'Mais ações' })
    await mais()
    await folha().getByLabel('Resolução').fill('Boleto reemitido')
    await folha().getByLabel('Reclassificar').selectOption('3')
    await folha().getByLabel('Duplicado de outro pedido do mesmo aluno').fill('ONE-9')
    await folha().getByRole('button', { name: 'Fechar', exact: true }).click()
    await expect(folha()).toHaveCount(0)
    await mais()
    await expect(folha().getByLabel('Resolução')).toHaveValue('Boleto reemitido')
    await expect(folha().getByLabel('Reclassificar')).toHaveValue('3')
    await expect(folha().getByLabel('Duplicado de outro pedido do mesmo aluno')).toHaveValue('ONE-9')
    // enviada a resolução, o campo volta vazio
    await folha().getByRole('button', { name: 'Resolver', exact: true }).click()
    await expect(folha()).toHaveCount(0)
    await mais()
    await expect(folha().getByLabel('Resolução')).toHaveValue('')
  })

  // C67 (AC 45)
  test('Fila com coluna Aberto em uma linha', async ({ page }) => {
    await instalar(page)
    await simularApi(page)
    const dias = [0, 1, 2]
    const item = (n: number) => ({ numero: `ONE-${200 + n}`, titulo: `Pedido ${n}`, categoria: 'Financeiro', estado: 'ABERTO', responsavel: null, criadoEm: new Date(Date.now() - n * 86_400_000).toISOString(), dias: n })
    await page.route(/\/api\/chamados\?escopo=fila/, (r) => r.fulfill(json(dias.map(item))))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/univag/fila')
    await page.getByText('ONE-200').waitFor()
    await expect(page.getByRole('columnheader', { name: 'Aberto', exact: true })).toHaveCount(1)
    await expect(page.getByRole('columnheader', { name: 'Dias' })).toHaveCount(0)
    const cabecalhos = await page.getByRole('columnheader').allTextContents()
    const coluna = cabecalhos.indexOf('Aberto')
    const celulas = page.locator('tbody tr').locator(`td:nth-child(${coluna + 1})`)
    await expect(celulas).toHaveText(['hoje', 'ontem', 'há 2 dias'])
    for (let i = 0; i < 3; i++) {
      const [altura, linha] = await celulas.nth(i).evaluate((e) => [e.getBoundingClientRect().height - parseFloat(getComputedStyle(e).paddingTop) - parseFloat(getComputedStyle(e).paddingBottom), parseFloat(getComputedStyle(e).lineHeight)])
      expect(altura, `célula ${i}: uma linha`).toBeLessThanOrEqual(linha * 1.5)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    const linhas = page.getByRole('main').getByRole('listitem')
    await expect(linhas).toHaveCount(3)
    for (const [i, texto] of ['aberto hoje', 'aberto ontem', 'aberto há 2 dias'].entries()) await expect(linhas.nth(i)).toContainText(texto)
  })

  // C72
  test('detalhe da Fila em texto corrido no celular', async ({ page }) => {
    await instalar(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await simularApi(page)
    await listasDeChamados(page, Titulo104)
    // as datas saem do relógio do próprio teste: "aberto há 2 dias" não depende do dia em que ele roda
    const antes = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()
    await page.route(/\/api\/chamados\?escopo=fila/, (r) =>
      r.fulfill(
        json([
          { numero: 'ONE-1', titulo: Titulo104, categoria: 'Financeiro > Boletos e mensalidades', estado: 'AGUARDANDO_ALUNO', responsavel: null, criadoEm: antes(2), dias: 2 },
          { numero: 'ONE-2', titulo: 'Segunda via', categoria: 'Financeiro > Boletos e mensalidades', estado: 'ABERTO', responsavel: null, criadoEm: antes(1), dias: 1 },
        ]),
      ),
    )
    await page.goto('/univag/fila')
    const linhas = page.getByRole('main').getByRole('listitem')
    await expect(linhas).toHaveCount(2)
    const meta = linhas.first().locator('[data-linha=meta]')
    const detalhe = meta.getByText(/^aberto há 2 dias · Financeiro > Boletos e mensalidades · sem responsável$/)
    await expect(detalhe).toHaveCount(1)
    expect((await caixa(detalhe)).width, 'coluna do detalhe').toBeGreaterThanOrEqual(120)
    const m = await detalhe.evaluate((e) => {
      const s = getComputedStyle(e)
      // cada linha renderizada acaba numa fronteira de palavra: o texto de cada Range por linha termina antes de um espaço ou no fim
      const no = e.firstChild!
      const texto = no.textContent!
      const r = document.createRange()
      const topos: number[] = []
      for (let i = 0; i < texto.length; i++) {
        r.setStart(no, i)
        r.setEnd(no, i + 1)
        topos.push(Math.round(r.getBoundingClientRect().top))
      }
      const partidas = topos.flatMap((t, i) => (i > 0 && t > topos[i - 1] && texto[i - 1] !== ' ' && texto[i] !== ' ' ? [i] : []))
      return { overflowWrap: s.overflowWrap, wordBreak: s.wordBreak, partidas, linhas: new Set(topos).size }
    })
    expect(m.overflowWrap).not.toBe('anywhere')
    expect(m.wordBreak).not.toBe('break-all')
    expect(m.partidas, 'posições em que uma palavra foi partida').toEqual([])
    expect(m.linhas).toBeGreaterThanOrEqual(1)
  })

  // C73
  test('gráficos com a mesma cor calma', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const tema of Temas) {
      for (const marca of Marcas) {
        await emTema(page, tema, marca)
        await page.goto('/univag/indicadores')
        await page.getByText('Indicador principal').waitFor()
        const barras = page.locator('[data-barra]') // estrutura-visual door 4: a barra é uma div com o fundo em --chart-1
        await expect(barras).toHaveCount(2)
        await expect.poll(async () => (await Promise.all([0, 1].map((i) => barras.nth(i).boundingBox()))).every((b) => b && b.width > 0), `${tema} ${marca ?? 'sem cor'}: barras desenhadas`).toBe(true)
        const rotulo = `${tema} ${marca ?? 'sem cor'}`
        const [a, b] = await Promise.all([0, 1].map((i) => barras.nth(i).evaluate((e) => window.__ux.pintar(['#000', getComputedStyle(e).backgroundColor]))))
        expect(a, `${rotulo}: mesma cor nos dois`).toEqual(b)
        expect(a, `${rotulo}: não é --primary`).not.toEqual(await referencia(page, '--primary'))
        const fundo = await barras.first().evaluate((e) => window.__ux.pintar(window.__ux.pilha(e.parentElement!))) // o fundo é o do pai: a barra div tem fundo próprio
        expect(contraste(a, fundo), `${rotulo}: contraste contra o fundo opaco mais próximo`).toBeGreaterThanOrEqual(3)
        // croma em oklch a partir do sRGB de 8 bits
        const [r, g, bl] = a.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        const [l, mm, ss] = [0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl].map(Math.cbrt)
        const croma = Math.hypot(1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * ss, 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * ss)
        expect(croma, `${rotulo}: croma`).toBeGreaterThan(0.02)
      }
    }
  })
})
