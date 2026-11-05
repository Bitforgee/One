import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { chamadoSimulado, semAparencia, comAparencia, simularApi, Telas } from './simulada'

// revisao-ux, lote 1 (S1, S2 e os tokens de S6): arranjo e cor medidos no Chromium com a API simulada.
// Medidas por boundingBox() e getComputedStyle, em px CSS, tolerância de 1 px. A cor computada é pintada num canvas 1x1 e lida em sRGB de 8 bits;
// uma cor com alfa é composta sobre o fundo opaco mais próximo. Contraste: fórmula do WCAG 2.
test.use({ serviceWorkers: 'block' })

declare global {
  interface Window {
    __ux: { pintar: (pilha: string[]) => number[]; pilha: (el: Element) => string[] }
  }
}

// As duas funções do navegador: pintar uma pilha de cores (a primeira é o fundo) e achar a pilha de fundo de um elemento até o fundo opaco mais próximo.
async function instalar(page: Page) {
  await page.addInitScript(() => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const pintar = (pilha: string[]) => {
      ctx.clearRect(0, 0, 300, 150)
      for (const cor of pilha) {
        ctx.fillStyle = cor
        ctx.fillRect(0, 0, 300, 150)
      }
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
    }
    window.__ux = {
      pintar,
      pilha(el) {
        const camadas: string[] = []
        for (let n: Element | null = el; n; n = n.parentElement) {
          const cor = getComputedStyle(n).backgroundColor
          const [sobrePreto, sobreBranco] = [pintar(['#000', cor]), pintar(['#fff', cor])]
          if (sobrePreto.join() === '0,0,0' && sobreBranco.join() === '255,255,255') continue // transparente
          camadas.unshift(cor)
          if (sobrePreto.join() === sobreBranco.join()) return camadas // opaca: acaba aqui
        }
        return ['#fff', ...camadas]
      },
    }
  })
}

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
// A cor de um elemento de referência pintado com var(--token), em sRGB de 8 bits
async function referencia(page: Page, token: string) {
  return page.evaluate((t) => {
    const ref = document.createElement('div')
    ref.style.color = `var(${t})`
    document.body.append(ref)
    const cor = getComputedStyle(ref).color
    ref.remove()
    return window.__ux.pintar(['#fff', cor])
  }, token)
}

const caixa = async (l: Locator) => (await l.boundingBox())!
async function abrirTela(page: Page, nome: string) {
  const [, caminho, esperar] = Telas.find(([n]) => n === nome)!
  await page.goto(caminho)
  await esperar(page)
}
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

  // C54 (AC 40, door 2)
  test('títulos com opsz 32 da Inter', async ({ page }) => {
    await simularApi(page)
    await page.goto('/univag')
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toHaveCount(1)
    expect(await h1.evaluate((e) => getComputedStyle(e).fontVariationSettings)).toBe('"opsz" 32')
    expect(await page.evaluate(() => getComputedStyle(document.body).fontVariationSettings)).toBe('normal')
    await page.goto('/univag/assistente')
    const h2 = page.getByRole('heading', { name: 'Olá! Eu sou Assistente.' })
    await expect(h2).toHaveCount(1)
    expect(await h2.evaluate((e) => getComputedStyle(e).fontVariationSettings)).toBe('"opsz" 32')
  })
})
