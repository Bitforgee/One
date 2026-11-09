import { expect, test, type Locator, type Page } from '@playwright/test'
import { comAparencia, instalar, referencia, simularApi } from './simulada'

// estrutura-visual: a casca (foco, barra, topo, caixa de envio, tabela e ranking) medida no Chromium com a API simulada.
// A referência de cada valor é o token pintado no body (L-095), nunca um clone com as classes do elemento medido.
test.use({ serviceWorkers: 'block' })

const Temas = ['light', 'dark', 'black'] as const
const Marcas = [null, '#8a1538', '#0b6e4f'] as const
const DuasMarcas = ['#8a1538', '#0b6e4f'] as const

const luminancia = ([r, g, b]: number[]) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contraste = (x: number[], y: number[]) => {
  const [claro, escuro] = [luminancia(x), luminancia(y)].sort((p, q) => q - p)
  return (claro + 0.05) / (escuro + 0.05)
}
const rotuloMarca = (m: string | null) => m ?? 'sem cor'

type Opcoes = { marca?: string | null; papeis?: string[]; tema?: string; altura?: number; rotas?: (p: Page) => Promise<void> }
// Abre a tela com a API simulada; o tema vai no localStorage antes de a página carregar, a marca vem da aparência da instituição.
async function abrir(page: Page, largura: number, caminho: string, espera: (p: Page) => Promise<unknown>, { marca = null, papeis, tema = 'light', altura = 900, rotas }: Opcoes = {}) {
  await page.unroute('**/api/**').catch(() => {})
  await simularApi(page, papeis, false, { ...comAparencia, cor: marca })
  await rotas?.(page)
  await page.addInitScript((t) => localStorage.setItem('one-tema', t), tema)
  await page.setViewportSize({ width: largura, height: altura })
  await page.goto(caminho)
  await espera(page)
  await page.evaluate(() => document.fonts.ready)
}

const Telas = [
  ['Fila', '/univag/fila', (p: Page) => p.getByText('ONE-123').waitFor()],
  ['Assistente', '/univag/assistente', (p: Page) => p.getByLabel('Mensagem').waitFor()],
  ['Detalhe', '/univag/chamados/ONE-123', (p: Page) => p.getByText('Resumo gerado por IA').waitFor()],
  ['Aparência', '/univag/aparencia', (p: Page) => p.getByLabel('Cor principal').waitFor()],
] as const
const esperaAssistente = (p: Page) => p.getByLabel('Mensagem').waitFor()
const esperaIndicadores = (p: Page) => p.getByText('Indicador principal').waitFor()
const esperaFila = (p: Page) => p.getByText('ONE-123').waitFor()

// O que o foco desenha no elemento ativo: o contorno, o fundo opaco do pai e a cor do contorno composta sobre ele.
const lerFoco = (page: Page) =>
  page.evaluate(() => {
    const e = document.activeElement as HTMLElement
    if (!e || e === document.body) return null
    const s = getComputedStyle(e)
    const fundo = window.__ux.pintar(window.__ux.pilha(e.parentElement!))
    return {
      id: [...document.querySelectorAll('*')].indexOf(e),
      nome: `${e.tagName} ${e.getAttribute('aria-label') ?? e.textContent?.trim().slice(0, 30)}`,
      estilo: s.outlineStyle,
      largura: parseFloat(s.outlineWidth),
      deslocamento: parseFloat(s.outlineOffset),
      sombra: s.boxShadow,
      composta: window.__ux.pintar([...window.__ux.pilha(e.parentElement!), s.outlineColor]),
      fundo,
    }
  })

// Tab até o elemento ser o ativo (no máximo 80 paradas)
async function tabAte(page: Page, alvo: Locator) {
  for (let i = 0; i < 80 && !(await alvo.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(alvo).toBeFocused()
}

// C1
test('foco de 2 px com 3:1 nas 4 telas', async ({ page }) => {
  test.setTimeout(900_000)
  await instalar(page)
  let telas = 0
  for (const tema of Temas)
    for (const marca of Marcas)
      for (const [nome, caminho, espera] of Telas) {
        await abrir(page, 1280, caminho, espera, { marca, tema })
        const rotulo = `${nome} ${tema} ${rotuloMarca(marca)}`
        const vistos = new Set<number>()
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press('Tab')
          const f = (await lerFoco(page))!
          expect(f, `${rotulo}: parada ${i}`).not.toBeNull()
          vistos.add(f.id)
          expect(f.estilo, `${rotulo}: ${f.nome}: estilo`).toBe('solid')
          expect(f.largura, `${rotulo}: ${f.nome}: largura`).toBeGreaterThanOrEqual(2)
          expect(contraste(f.composta, f.fundo), `${rotulo}: ${f.nome}: contraste`).toBeGreaterThanOrEqual(3)
        }
        expect(vistos.size, `${rotulo}: controles distintos`).toBeGreaterThanOrEqual(5)
        telas++
      }
  expect(telas).toBe(36)
})

// C2
test('foco com cores forçadas', async ({ page }) => {
  test.setTimeout(300_000)
  await instalar(page)
  await page.emulateMedia({ forcedColors: 'active' })
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
  let telas = 0
  for (const [nome, caminho, espera] of Telas) {
    await abrir(page, 1280, caminho, espera)
    const vistos = new Set<number>()
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const f = (await lerFoco(page))!
      vistos.add(f.id)
      expect(f.estilo, `${nome}: ${f.nome}: estilo`).not.toBe('none')
      expect(f.largura, `${nome}: ${f.nome}: largura`).toBeGreaterThanOrEqual(2)
    }
    expect(vistos.size, `${nome}: controles distintos`).toBeGreaterThanOrEqual(5)
    telas++
  }
  expect(telas).toBe(4)
  // a linha de pergunta do Assistente
  await abrir(page, 1280, '/univag/assistente', esperaAssistente)
  const linha = page.getByRole('button', { name: comAparencia.assistente.perguntas[0], exact: true })
  await expect(linha).toHaveCount(1)
  await tabAte(page, linha)
  const f = (await lerFoco(page))!
  expect(f.estilo).not.toBe('none')
  expect(f.largura).toBeGreaterThanOrEqual(2)
})

// C3
test('foco sem auréola no botão e no campo', async ({ page }) => {
  await instalar(page)
  await abrir(page, 1280, '/univag/indicadores', esperaIndicadores)
  const [botao, campo] = [page.getByRole('button', { name: 'Consultar' }), page.getByLabel('De')]
  await expect(botao).toHaveCount(1)
  await expect(campo).toHaveCount(1)
  let medidas = 0
  for (const alvo of [botao, campo]) {
    await page.mouse.move(0, 0)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    expect(await alvo.evaluate((e) => getComputedStyle(e).boxShadow), 'sem foco').toBe('none')
    await tabAte(page, alvo)
    const f = (await lerFoco(page))!
    expect(f.estilo, 'o foco existe').toBe('solid') // controle: o contorno aparece, a sombra não
    expect(f.sombra).toBe('none')
    medidas++
  }
  expect(medidas).toBe(2)
})

// C4
test('ring sem cor e com marca', async ({ page }) => {
  test.setTimeout(240_000)
  await instalar(page)
  const pintado = (cor: string) => page.evaluate((c) => window.__ux.pintar(['#fff', c]), cor)
  const semCor: Record<string, number[]> = {}
  let medidas = 0
  for (const tema of Temas)
    for (const marca of [null, '#8a1538'] as const) {
      await abrir(page, 1280, '/univag/fila', esperaFila, { marca, tema })
      const [ring, sidebarRing] = [await referencia(page, '--ring'), await referencia(page, '--sidebar-ring')]
      const rotulo = `${tema} ${rotuloMarca(marca)}`
      if (!marca) {
        semCor[tema] = ring
        // o claro sem cor é o cinza novo; o escuro e o preto sem cor ficam como estavam
        expect(ring, `${rotulo}: ring sem cor`).toEqual(await pintado(tema === 'light' ? 'oklch(0.5 0 0)' : 'oklch(0.556 0 0)'))
      } else {
        expect(ring, `${rotulo}: ring com marca difere do valor sem cor`).not.toEqual(semCor[tema])
        expect(sidebarRing, `${rotulo}: --sidebar-ring`).toEqual(ring)
      }
      medidas++
    }
  expect(medidas).toBe(6)
})

// C5
const Anexos: [string, string, string[], (p: Page) => Promise<void>][] = [
  [
    'Instituições',
    '/univag/instituicoes',
    ['ADMINISTRADOR', 'OPERADOR'],
    async (p) => {
      await p.getByText('Faculdade Antiga').waitFor()
      await p.getByRole('button', { name: 'Ações de Centro Universitário de Várzea Grande' }).click()
      await p.getByRole('menuitem', { name: 'Importar carga' }).click()
    },
  ],
  ['Matrículas', '/univag/matriculas', ['ADMINISTRADOR'], async (p) => void (await p.locator('label[for=csv]').waitFor())],
  [
    'Documentos',
    '/univag/documentos',
    ['ADMINISTRADOR'],
    async (p) => {
      await p.getByText('Regulamento do estágio supervisionado obrigatório dos cursos de graduação').waitFor()
      await p.getByRole('button', { name: 'Enviar PDF' }).click()
    },
  ],
  ['Detalhe do chamado', '/univag/chamados/ONE-123', ['ATENDENTE'], async (p) => void (await p.getByText('Anexos (PDF').waitFor())],
]

test('borda da área de anexos com 3:1', async ({ page }) => {
  test.setTimeout(300_000)
  await instalar(page)
  let medidas = 0
  for (const tema of Temas)
    for (const marca of [null, '#0b6e4f'] as const)
      for (const [nome, caminho, papeis, aoAbrir] of Anexos) {
        await abrir(page, 1280, caminho, aoAbrir, { marca, tema, papeis })
        const area = page.locator('.border-dashed')
        await expect(area, `${nome}: áreas`).toHaveCount(1)
        const [estilo, borda, fundo] = (await area.evaluate((e) => {
          const s = getComputedStyle(e)
          return [s.borderTopStyle, window.__ux.pintar([...window.__ux.pilha(e.parentElement!), s.borderTopColor]), window.__ux.pintar(window.__ux.pilha(e.parentElement!))]
        })) as [string, number[], number[]]
        expect(estilo, `${nome} ${tema}`).toBe('dashed')
        expect(contraste(borda, fundo), `${nome} ${tema} ${rotuloMarca(marca)}: borda`).toBeGreaterThanOrEqual(3)
        medidas++
      }
  expect(medidas).toBe(24)
})

// C6: a caixa do contorno (a caixa do controle + deslocamento + espessura) cabe no retângulo de cada ancestral que corta
const foraDoCorte = (e: Element) => {
  const s = getComputedStyle(e)
  const r = e.getBoundingClientRect()
  const d = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth)
  const caixa = { esq: r.left - d, topo: r.top - d, dir: r.right + d, base: r.bottom + d }
  const fora: string[] = []
  let cortes = 0
  for (let a = e.parentElement; a; a = a.parentElement) {
    const t = getComputedStyle(a)
    if (t.overflowX === 'visible' && t.overflowY === 'visible') continue
    cortes++
    const ar = a.getBoundingClientRect()
    if (caixa.esq < ar.left - 1 || caixa.topo < ar.top - 1 || caixa.dir > ar.right + 1 || caixa.base > ar.bottom + 1) fora.push(`${a.tagName}.${a.className}`.slice(0, 60))
  }
  return { cortes, fora }
}

test('foco não cortado por overflow', async ({ page }) => {
  await instalar(page)
  // a linha de pergunta do Assistente: o contorno vai para dentro
  await abrir(page, 1280, '/univag/assistente', esperaAssistente)
  const pergunta = page.getByRole('button', { name: comAparencia.assistente.perguntas[0], exact: true })
  await expect(pergunta).toHaveCount(1)
  await tabAte(page, pergunta)
  expect((await lerFoco(page))!.deslocamento, 'pergunta: deslocamento negativo').toBeLessThan(0)
  const rPergunta = await pergunta.evaluate(foraDoCorte, undefined)
  expect(rPergunta.fora, 'pergunta').toEqual([])

  // um link da barra e o link da primeira coluna da Fila
  await abrir(page, 1280, '/univag/fila', esperaFila)
  const link = page.locator('[data-sidebar=content]').getByRole('link', { name: 'Indicadores' })
  const primeira = page.getByRole('link', { name: 'ONE-123' })
  await expect(link).toHaveCount(1)
  await expect(primeira).toHaveCount(1)
  let medidos = 0
  for (const alvo of [link, primeira]) {
    await tabAte(page, alvo)
    const r = await alvo.evaluate(foraDoCorte, undefined)
    expect(r.cortes, 'o alvo tem um ancestral que corta').toBeGreaterThanOrEqual(1)
    expect(r.fora).toEqual([])
    // controle: com o contorno 40 px para fora, a medida acusa o corte
    await alvo.evaluate((e) => (e.style.outlineOffset = '40px'))
    expect((await alvo.evaluate(foraDoCorte, undefined)).fora.length, 'controle: o contorno de fora é cortado').toBeGreaterThan(0)
    await alvo.evaluate((e) => (e.style.outlineOffset = ''))
    medidos++
  }
  expect(medidos).toBe(2)
})

// C7
test('barra tingida pela marca', async ({ page }) => {
  test.setTimeout(240_000)
  await instalar(page)
  const Tokens = ['--sidebar', '--sidebar-accent', '--sidebar-border']
  let medidas = 0
  for (const tema of Temas) {
    const por: Record<string, Record<string, number[]>> = {}
    for (const marca of Marcas) {
      await abrir(page, 1280, '/univag/fila', esperaFila, { marca, tema })
      por[rotuloMarca(marca)] = Object.fromEntries(await Promise.all(Tokens.map(async (t) => [t, await referencia(page, t)])))
      const [texto, fundo] = [await referencia(page, '--sidebar-foreground'), por[rotuloMarca(marca)]['--sidebar']]
      expect(contraste(texto, fundo), `${tema} ${rotuloMarca(marca)}: texto da barra`).toBeGreaterThanOrEqual(4.5)
      medidas++
    }
    // no Preto a barra é #000 com as 3 marcas (AD-027); no claro e no escuro, as marcas se distinguem
    if (tema === 'black') for (const m of Marcas) expect(por[rotuloMarca(m)]['--sidebar'], `preto ${rotuloMarca(m)}: barra #000`).toEqual([0, 0, 0])
    else for (const t of Tokens) expect(por['#8a1538'][t], `${tema}: ${t} difere entre as marcas`).not.toEqual(por['#0b6e4f'][t])
  }
  expect(medidas).toBe(9)
})

// C8
test('item ativo com barra de 3 px', async ({ page }) => {
  test.setTimeout(300_000)
  await instalar(page)
  let medidas = 0
  for (const tema of Temas)
    for (const marca of Marcas) {
      await abrir(page, 1440, '/univag/fila', esperaFila, { marca, tema })
      await page.mouse.move(700, 600)
      const [ativos, inativo] = [page.locator('[data-sidebar=content] a[aria-current=page]'), page.locator('[data-sidebar=content]').getByRole('link', { name: 'Indicadores' })]
      await expect(ativos, 'um só link ativo').toHaveCount(1)
      await expect(inativo).toHaveCount(1)
      const [primario, fundoBarra, texto] = [await referencia(page, '--sidebar-primary'), await referencia(page, '--sidebar'), await referencia(page, '--sidebar-foreground')]
      // a barra: uma borda esquerda no elemento ou no ::before (nunca um fundo: some em cores forçadas), a cor pintada sobre o fundo da barra
      const ler = (l: Locator) =>
        l.evaluate((e) => {
          const s = getComputedStyle(e)
          const b = getComputedStyle(e, '::before')
          const sobre = (cor: string) => window.__ux.pintar([...window.__ux.pilha(e.parentElement!), cor])
          const barras = [
            { largura: parseFloat(s.borderLeftWidth), cor: sobre(s.borderLeftColor), visivel: s.borderLeftStyle !== 'none' },
            { largura: parseFloat(b.borderLeftWidth), cor: sobre(b.borderLeftColor), visivel: b.content !== 'none' && b.display !== 'none' && parseFloat(b.height) > 0 && b.borderLeftStyle === 'solid' },
          ].filter((x) => x.visivel && x.largura >= 1)
          return {
            barras,
            cor: window.__ux.pintar(['#fff', s.color]),
            peso: Number(s.fontWeight),
            transparente: window.__ux.pintar(['#000', s.backgroundColor]).join() === '0,0,0' && window.__ux.pintar(['#fff', s.backgroundColor]).join() === '255,255,255',
            corrente: e.getAttribute('aria-current'),
          }
        })
      const a = await ler(ativos)
      const rotulo = `${tema} ${rotuloMarca(marca)}`
      expect(a.barras, `${rotulo}: barra do ativo`).toHaveLength(1)
      expect(Math.abs(a.barras[0].largura - 3), `${rotulo}: largura`).toBeLessThanOrEqual(1)
      expect(a.barras[0].cor, `${rotulo}: cor da barra`).toEqual(primario)
      expect(contraste(a.barras[0].cor, fundoBarra), `${rotulo}: contraste da barra`).toBeGreaterThanOrEqual(3)
      expect(a.cor, `${rotulo}: cor do texto`).toEqual(texto)
      expect(a.peso, `${rotulo}: peso`).toBe(600)
      expect(a.transparente, `${rotulo}: sem fundo`).toBe(true)
      expect(a.corrente).toBe('page')
      const i = await ler(inativo)
      expect(i.barras, `${rotulo}: controle sem barra`).toEqual([])
      expect(i.peso, `${rotulo}: peso do inativo`).toBeLessThan(600)
      expect(i.corrente, `${rotulo}: inativo sem aria-current`).toBeNull()
      medidas++
    }
  expect(medidas).toBe(9)
})

// Uma ausência precisa de controle: o seletor acha o elemento quando ele existe (L-082)
async function achaQuandoExiste(host: Locator, seletor: string, tag = 'div') {
  return host.evaluate(
    (h, [sel, t]) => {
      const el = document.createElement(t)
      const [, classe] = sel.match(/\.([\w-]+)/) ?? []
      const [, atributo, valor] = sel.match(/\[([\w-]+)=([\w-]+)\]/) ?? []
      if (classe) el.setAttribute('class', classe)
      if (atributo) el.setAttribute(atributo, valor)
      h.append(el)
      const n = h.querySelectorAll(sel).length
      el.remove()
      return n
    },
    [seletor, tag],
  )
}

// C9
test('Tema no rodapé da barra e fora do topo', async ({ page }) => {
  test.setTimeout(240_000)
  await instalar(page)
  // 1440: atendente
  await abrir(page, 1440, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
  await expect(page.locator('header').getByRole('button', { name: 'Tema' }), 'topo a 1440').toHaveCount(0)
  const tema = page.locator('[data-sidebar=footer]').getByRole('button', { name: 'Tema' })
  await expect(tema, 'Tema no rodapé').toHaveCount(1)
  await tema.click()
  for (const opcao of ['Claro', 'Escuro', 'Preto']) await expect(page.getByRole('button', { name: opcao, exact: true }), opcao).toHaveCount(1)
  await page.getByRole('button', { name: 'Escuro', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  // 390: atendente, o Tema está na gaveta e não no topo
  await abrir(page, 390, '/univag/fila', async (p) => void (await p.locator('header').getByRole('heading', { name: 'Fila' }).waitFor()), { papeis: ['ATENDENTE'] })
  await expect(page.locator('header').getByRole('button', { name: 'Tema' }), 'topo do atendente a 390').toHaveCount(0)
  await page.locator('header').getByRole('button', { name: 'Alternar barra lateral' }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Tema' }), 'Tema na gaveta').toHaveCount(1)
  // 390: aluno, sem Tema no topo e com a escolha na aba Conta
  await abrir(page, 390, '/univag/assistente', esperaAssistente, { papeis: ['ALUNO'] })
  await expect(page.locator('header').getByRole('button', { name: 'Tema' }), 'topo do aluno a 390').toHaveCount(0)
  await page.getByRole('link', { name: 'Conta' }).click()
  await page.getByRole('button', { name: /^Tema/ }).click()
  await page.getByRole('button', { name: 'Escuro', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

// C10
test('usuário em texto com a barra aberta', async ({ page }) => {
  await instalar(page)
  await abrir(page, 1440, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
  const rodape = page.locator('[data-sidebar=footer]')
  await expect(rodape.getByText('Ana', { exact: true })).toHaveCount(1)
  await expect(rodape.getByText('Atendente', { exact: true })).toHaveCount(1)
  await expect(page.locator('svg.lucide-chevrons-up-down'), 'setas').toHaveCount(0)
  expect(await achaQuandoExiste(rodape, 'svg.lucide-chevrons-up-down', 'svg'), 'controle: o seletor acha uma seta').toBe(1)
  await expect(page.getByText('A', { exact: true }), 'iniciais').toHaveCount(0)
  await rodape.getByRole('button', { name: /Ana/ }).click()
  await expect(page.getByRole('menuitem', { name: 'Sair' })).toHaveCount(1)
})

// C11
test('iniciais só com a barra recolhida', async ({ page }) => {
  await instalar(page)
  await abrir(page, 1440, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
  const [rodape, iniciais] = [page.locator('[data-sidebar=footer]'), page.getByText('A', { exact: true })]
  await expect(iniciais, 'aberta').toHaveCount(0)
  await rodape.getByRole('button', { name: 'Alternar barra lateral' }).click()
  await expect(page.locator('[data-slot=sidebar][data-state=collapsed]')).toHaveCount(1)
  await expect(iniciais, 'recolhida').toHaveCount(1)
  await expect(iniciais).toBeVisible()
  const nome = rodape.getByText('Ana', { exact: true })
  await expect(nome).toHaveCount(1)
  const caixa = (await nome.boundingBox())!
  expect(caixa.width, 'nome escondido').toBeLessThanOrEqual(1)
  await rodape.getByRole('button', { name: 'Alternar barra lateral' }).click()
  await expect(page.locator('[data-slot=sidebar][data-state=expanded]')).toHaveCount(1)
  await expect(iniciais, 'reaberta').toHaveCount(0)
})

// C12
test('topo opaco e sem separador', async ({ page }) => {
  test.setTimeout(240_000)
  await instalar(page)
  let medidas = 0
  for (const tema of Temas)
    for (const [largura, papeis] of [[1440, ['ATENDENTE']], [390, ['ATENDENTE']], [390, ['ALUNO']]] as const) {
      const aluno = papeis[0] === 'ALUNO'
      await abrir(page, largura, aluno ? '/univag/assistente' : '/univag/fila', aluno ? esperaAssistente : esperaFila, { tema, papeis: [...papeis] })
      const topo = page.locator('header')
      await expect(topo).toHaveCount(1)
      const [alfa, filtro, separadores] = await topo.evaluate((h) => {
        const s = getComputedStyle(h)
        const opaco = window.__ux.pintar(['#000', s.backgroundColor]).join() === window.__ux.pintar(['#fff', s.backgroundColor]).join()
        return [opaco, s.backdropFilter, h.querySelectorAll('[data-slot=separator]').length]
      })
      expect(alfa, `${tema} ${largura}: fundo opaco`).toBe(true)
      expect(filtro, `${tema} ${largura}: sem desfoque`).toBe('none')
      expect(separadores, `${tema} ${largura}: sem separador`).toBe(0)
      expect(await achaQuandoExiste(topo, '[data-slot=separator]'), 'controle: o seletor acha um separador').toBe(1)
      medidas++
    }
  expect(medidas).toBe(9)
})

// C13
test('recolher no rodapé a partir de 768', async ({ page }) => {
  await instalar(page)
  let medidas = 0
  for (const largura of [768, 1440]) {
    await abrir(page, largura, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
    await expect(page.locator('header').getByRole('button', { name: 'Alternar barra lateral' }), `${largura}: topo`).toHaveCount(0)
    const botao = page.locator('[data-sidebar=footer]').getByRole('button', { name: 'Alternar barra lateral' })
    await expect(botao, `${largura}: rodapé`).toHaveCount(1)
    expect(await botao.locator('svg').count(), `${largura}: um ícone`).toBe(1)
    expect(await botao.evaluate((e) => {
      const c = e.cloneNode(true) as HTMLElement
      c.querySelectorAll('.sr-only').forEach((x) => x.remove())
      return c.textContent!.trim()
    }), `${largura}: sem texto visível`).toBe('')
    await botao.click()
    await expect(page.locator('[data-slot=sidebar][data-state=collapsed]'), `${largura}: recolhe`).toHaveCount(1)
    await botao.click()
    await expect(page.locator('[data-slot=sidebar][data-state=expanded]'), `${largura}: reabre`).toHaveCount(1)
    medidas++
  }
  expect(medidas).toBe(2)
})

// C14
test('menu no topo abaixo de 768 para quem não é aluno', async ({ page }) => {
  await instalar(page)
  let medidas = 0
  for (const largura of [390, 767]) {
    await abrir(page, largura, '/univag/fila', async (p) => void (await p.locator('header').getByRole('heading', { name: 'Fila' }).waitFor()), { papeis: ['ATENDENTE'] })
    const menu = page.locator('header button:has(svg.lucide-menu)')
    await expect(menu, `${largura}: botão de menu`).toHaveCount(1)
    await menu.click()
    const gaveta = page.getByRole('dialog')
    await expect(gaveta.getByRole('link', { name: 'Fila' }), `${largura}: links`).toHaveCount(1)
    await expect(gaveta.getByRole('button', { name: 'Tema' }), `${largura}: Tema`).toHaveCount(1)
    await expect(gaveta.getByText('Ana', { exact: true }), `${largura}: usuário`).toHaveCount(1)
    medidas++
  }
  // controle: o aluno a 390 px tem a barra de abas e nenhum botão de menu
  await abrir(page, 390, '/univag/assistente', esperaAssistente, { papeis: ['ALUNO'] })
  await expect(page.locator('header')).toHaveCount(1)
  await expect(page.locator('header button:has(svg.lucide-menu)'), 'aluno sem menu').toHaveCount(0)
  expect(medidas).toBe(2)
})

const sobreY = (a: { y: number; height: number }, b: { y: number; height: number }) => a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1

// C15
test('caixa de envio em uma linha', async ({ page }) => {
  test.setTimeout(240_000)
  let medidas = 0
  for (const largura of [360, 390, 1440]) {
    await abrir(page, largura, '/univag/assistente', esperaAssistente, { papeis: ['ALUNO'] })
    const [anexar, campo, enviar, form] = [page.getByRole('button', { name: 'Anexar arquivo' }), page.getByLabel('Mensagem'), page.getByRole('button', { name: 'Enviar', exact: true }), page.locator('form').filter({ has: page.getByLabel('Mensagem') })]
    for (const l of [anexar, campo, enviar, form]) await expect(l, `${largura}: um só`).toHaveCount(1)
    await campo.fill('oi')
    const [a, c, e, f] = [(await anexar.boundingBox())!, (await campo.boundingBox())!, (await enviar.boundingBox())!, (await form.boundingBox())!]
    expect(a.x + a.width, `${largura}: anexar antes do campo`).toBeLessThanOrEqual(c.x + 1)
    expect(c.x + c.width, `${largura}: campo antes do Enviar`).toBeLessThanOrEqual(e.x + 1)
    expect(sobreY(a, c) && sobreY(c, e), `${largura}: mesma linha`).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${largura}: sem estouro`).toBe(true)
    expect(f.height, `${largura}: altura do form`).toBeLessThanOrEqual(60)
    expect(await form.evaluate((x) => [getComputedStyle(x).boxShadow, getComputedStyle(x).borderTopWidth]), `${largura}: form sem sombra e sem borda`).toEqual(['none', '0px'])
    expect(await campo.evaluate((x) => getComputedStyle(x).boxShadow), `${largura}: campo sem sombra`).toBe('none')
    if (largura === 390) {
      expect(a.height, 'anexar').toBeGreaterThanOrEqual(43)
      expect(e.height, 'Enviar').toBeGreaterThanOrEqual(43)
      expect(await campo.evaluate((x) => getComputedStyle(x).fontSize), 'campo').toBe('16px')
    }
    medidas++
  }
  expect(medidas).toBe(3)
})

// C16
test('borda da caixa de envio com 3:1', async ({ page }) => {
  test.setTimeout(300_000)
  await instalar(page)
  let medidas = 0
  for (const tema of Temas)
    for (const marca of DuasMarcas)
      for (const largura of [390, 1440]) {
        await abrir(page, largura, '/univag/assistente', esperaAssistente, { marca, tema, papeis: ['ALUNO'] })
        const campo = page.getByTestId('compositor') // a borda é da caixa do compositor (chat-linha-do-tempo), não mais do campo
        await expect(campo).toHaveCount(1)
        const [largBorda, borda, fundo] = (await campo.evaluate((e) => {
          const s = getComputedStyle(e)
          return [parseFloat(s.borderTopWidth), window.__ux.pintar([...window.__ux.pilha(e.parentElement!), s.borderTopColor]), window.__ux.pintar(window.__ux.pilha(e.parentElement!))]
        })) as [number, number[], number[]]
        const rotulo = `${tema} ${marca} a ${largura}`
        expect(largBorda, `${rotulo}: espessura`).toBeGreaterThanOrEqual(1)
        expect(contraste(borda, fundo), `${rotulo}: contraste`).toBeGreaterThanOrEqual(3)
        medidas++
      }
  expect(medidas).toBe(12)
})

// C17
test('Encerrar junto de Falar com atendente', async ({ page }) => {
  await abrir(page, 1280, '/univag/assistente', esperaAssistente, { papeis: ['ALUNO'] })
  const [atendente, encerrar, campo] = [page.getByRole('button', { name: 'Falar com atendente' }), page.getByRole('button', { name: 'Encerrar', exact: true }), page.getByLabel('Mensagem')]
  // controle: sem conversa, só o atendente
  await expect(atendente).toHaveCount(1)
  await expect(encerrar, 'sem conversa').toHaveCount(0)
  await campo.fill('preciso do boleto do semestre, onde encontro a segunda via?')
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await page.getByText('Isso resolveu?').waitFor()
  await expect(encerrar, 'com conversa').toHaveCount(1)
  const [a, e, c] = [(await atendente.boundingBox())!, (await encerrar.boundingBox())!, (await campo.boundingBox())!]
  expect(sobreY(a, e), 'mesma linha').toBe(true)
  expect(Math.max(a.y + a.height, e.y + e.height), 'acima do campo').toBeLessThanOrEqual(c.y + 1)
})

// C18
test('Enter envia e campo vazio desabilita', async ({ page }) => {
  const envios: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/conversas') envios.push(r.url())
  })
  await abrir(page, 1280, '/univag/assistente', esperaAssistente, { papeis: ['ALUNO'] })
  const [campo, enviar] = [page.getByLabel('Mensagem'), page.getByRole('button', { name: 'Enviar', exact: true })]
  for (const vazio of ['', '   ']) {
    await campo.fill(vazio)
    await expect(enviar, `"${vazio}"`).toBeDisabled()
  }
  await campo.fill('oi')
  await expect(enviar, 'com texto').toBeEnabled() // controle: o botão habilita
  await campo.press('Shift+Enter')
  await page.waitForTimeout(300)
  expect(envios, 'Shift+Enter não envia').toHaveLength(0)
  expect(await campo.inputValue()).toBe('oi\n')
  await campo.press('Enter')
  await expect(campo).toHaveValue('')
  expect(envios, 'Enter envia 1 vez').toHaveLength(1)
})

// C19
test('tabela sem caixa e cabeçalho sem fundo', async ({ page }) => {
  test.setTimeout(300_000)
  await instalar(page)
  let medidas = 0
  for (const tema of Temas)
    for (const [caminho, espera] of [['/univag/fila', esperaFila], ['/univag/usuarios', (p: Page) => p.getByText('Carla Regina de Souza Albuquerque').waitFor()]] as const) {
      await abrir(page, 1440, caminho, espera, { tema })
      const rolagem = page.locator('[data-slot=table-container]')
      await expect(rolagem, `${caminho}: tabelas`).toHaveCount(1)
      const m = await rolagem.evaluate((r) => {
        const caixa = getComputedStyle(r.parentElement!)
        const th = r.querySelector('th')!
        const linha = r.querySelector('tbody tr')!
        const principal = document.querySelector('[class*="container/main"]')!
        const sobre = (e: Element, cor: string) => window.__ux.pintar([...window.__ux.pilha(e), cor])
        const [ts, ls, ps] = [getComputedStyle(th), getComputedStyle(linha), getComputedStyle(principal)]
        const celula = r.querySelector('tbody tr td')!
        const [cs, ths] = [getComputedStyle(celula), th]
        return {
          caixa: [caixa.borderTopWidth, caixa.borderLeftWidth, caixa.borderTopLeftRadius],
          fundoTh: [window.__ux.pintar(['#000', ts.backgroundColor]).join(), window.__ux.pintar(['#fff', ts.backgroundColor]).join()],
          peso: Number(ts.fontWeight),
          fio: parseFloat(ts.borderBottomWidth),
          fioTh: sobre(th.parentElement!, ts.borderBottomColor),
          fioLinha: sobre(linha.parentElement!, ls.borderBottomColor),
          fundo: window.__ux.pintar(window.__ux.pilha(th.parentElement!)),
          esquerdaDaPagina: principal.getBoundingClientRect().left + parseFloat(ps.paddingLeft),
          esquerdaDoTexto: celula.getBoundingClientRect().left + parseFloat(cs.paddingLeft),
          esquerdaDoTitulo: ths.getBoundingClientRect().left + parseFloat(ts.paddingLeft),
        }
      })
      const rotulo = `${caminho} ${tema}`
      expect(m.caixa, `${rotulo}: sem contorno nem raio`).toEqual(['0px', '0px', '0px'])
      expect(m.fundoTh, `${rotulo}: cabeçalho sem fundo`).toEqual(['0,0,0', '255,255,255'])
      expect(m.peso, `${rotulo}: peso`).toBe(600)
      expect(m.fio, `${rotulo}: fio do cabeçalho`).toBeGreaterThanOrEqual(1)
      expect(contraste(m.fioTh, m.fundo), `${rotulo}: fio do cabeçalho mais escuro que o das linhas`).toBeGreaterThan(contraste(m.fioLinha, m.fundo))
      expect(Math.abs(m.esquerdaDoTexto - m.esquerdaDaPagina), `${rotulo}: primeira coluna`).toBeLessThanOrEqual(1)
      expect(Math.abs(m.esquerdaDoTitulo - m.esquerdaDaPagina), `${rotulo}: título da primeira coluna`).toBeLessThanOrEqual(1)
      medidas++
    }
  expect(medidas).toBe(6)
})

// C21
test('barras do ranking na cor calma e sem Recharts', async ({ page }) => {
  test.setTimeout(300_000)
  await instalar(page)
  let medidas = 0
  for (const tema of Temas)
    for (const marca of DuasMarcas)
      for (const largura of [390, 1440]) {
        await abrir(page, largura, '/univag/indicadores', esperaIndicadores, { marca, tema, papeis: ['ADMINISTRADOR'] })
        const rotulo = `${tema} ${marca} a ${largura}`
        const [calma, acao] = [await referencia(page, '--chart-1'), await referencia(page, '--primary')]
        const linhas = await page.locator('section:has(h2) tbody tr').count()
        const barras = page.locator('[data-barra]')
        expect(linhas, `${rotulo}: linhas dos rankings`).toBe(2)
        await expect(barras, `${rotulo}: uma barra por linha`).toHaveCount(linhas)
        for (const i of [0, 1]) {
          const m = await barras.nth(i).evaluate((e) => {
            const s = getComputedStyle(e)
            const total = e.closest('tr')!.querySelector('td:last-child')!
            const categoria = e.closest('td')!
            return {
              cor: window.__ux.pintar([...window.__ux.pilha(e.parentElement!), s.backgroundColor]),
              fundo: window.__ux.pintar(window.__ux.pilha(e.parentElement!)),
              tabular: getComputedStyle(total).fontVariantNumeric,
              totalAEsquerda: total.getBoundingClientRect().left,
              categoriaADireita: categoria.getBoundingClientRect().right,
            }
          })
          expect(m.cor, `${rotulo}: cor da barra`).toEqual(calma)
          expect(m.cor, `${rotulo}: não é a cor de ação`).not.toEqual(acao)
          expect(contraste(m.cor, m.fundo), `${rotulo}: contraste`).toBeGreaterThanOrEqual(3)
          expect(m.tabular, `${rotulo}: tabular`).toContain('tabular-nums')
          expect(m.totalAEsquerda, `${rotulo}: total à direita`).toBeGreaterThanOrEqual(m.categoriaADireita - 1)
        }
        await expect(page.locator('svg.recharts-surface'), `${rotulo}: sem Recharts`).toHaveCount(0)
        await expect(page.getByRole('button', { name: 'Ver tabela' }), `${rotulo}: sem Ver tabela`).toHaveCount(0)
        expect(await achaQuandoExiste(page.locator('main, body').first(), 'svg.recharts-surface', 'svg'), 'controle: o seletor acha o gráfico').toBe(1)
        medidas++
      }
  expect(medidas).toBe(12)
})

// C23
test('categoria longa inteira nas 5 larguras', async ({ page }) => {
  test.setTimeout(240_000)
  const comEspacos = 'Acadêmico > Secretaria > Declarações e históricos escolares!' // 60 caracteres
  const semEspacos = 'AdministrativoFinanceiroTesourariaBoletosSegundaViaAcesso202'
  expect([comEspacos.length, semEspacos.length]).toEqual([60, 60])
  const ranking = [
    { categoria: comEspacos, total: 1000 },
    { categoria: semEspacos, total: 500 },
  ]
  const dados = {
    semDados: false, alunosAtivos: 1234, conversas: 5678, taxaAutoatendimento: 0.65, taxaEscalonamento: 0.2, taxaAbandono: 0.14, taxaPerguntasSemArtigo: 0.12,
    chamadosAbertos: 321, chamadosResolvidos: 1200, tempoPrimeiraRespostaHoras: 12.75, tempoResolucaoHoras: 123.25, roteamentoCorreto: 0.91, taxaReabertura: 0.05,
    principaisCategorias: { porConversas: ranking, porChamados: ranking }, indicadorPrincipal: 0.7123,
  }
  let medidas = 0
  for (const largura of [360, 390, 768, 1024, 1440]) {
    await abrir(page, largura, '/univag/indicadores', esperaIndicadores, {
      papeis: ['ADMINISTRADOR'],
      rotas: (p) => p.route('**/api/indicadores**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dados) })),
    })
    const celulas = page.locator('section:has(h2) tbody td:first-child')
    await expect(celulas, `${largura}: células de categoria`).toHaveCount(4)
    const caixas = page.locator('section:has(h2) [data-slot=table-container]')
    await expect(caixas, `${largura}: caixas das tabelas do ranking`).toHaveCount(2)
    for (let i = 0; i < 2; i++) {
      const c = await caixas.nth(i).evaluate((e) => ({ largura: e.scrollWidth, visivel: e.clientWidth }))
      expect(c.largura, `${largura}: a caixa da tabela ${i} não rola`).toBeLessThanOrEqual(c.visivel)
    }
    for (let i = 0; i < 4; i++) {
      const m = await celulas.nth(i).evaluate((e) => {
        const linha = e.closest('tr')!
        return { dentro: e.scrollWidth <= e.clientWidth, linhaDentro: linha.scrollWidth <= linha.clientWidth, reticencias: getComputedStyle(e).textOverflow === 'ellipsis', texto: e.textContent }
      })
      expect(m.dentro, `${largura}: ${m.texto}: célula`).toBe(true)
      expect(m.linhaDentro, `${largura}: ${m.texto}: linha`).toBe(true)
      expect(m.reticencias, `${largura}: sem reticências`).toBe(false)
      medidas++
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${largura}: sem estouro da página`).toBe(true)
  }
  expect(medidas).toBe(20)
})

// C31: o total de cada linha do ranking fica numa linha só, e a categoria de 60 caracteres continua inteira
test('total do ranking em uma linha', async ({ page }) => {
  test.setTimeout(240_000)
  const longa = 'Acadêmico > Secretaria > Declarações e históricos escolares!'
  expect(longa.length).toBe(60)
  const ranking = [
    { categoria: longa, total: 1234567 },
    { categoria: 'Financeiro', total: 12345 },
    { categoria: 'Biblioteca', total: 1000 },
    { categoria: 'Matrícula', total: 999 },
  ]
  const dados = {
    semDados: false, alunosAtivos: 1234, conversas: 5678, taxaAutoatendimento: 0.65, taxaEscalonamento: 0.2, taxaAbandono: 0.14, taxaPerguntasSemArtigo: 0.12,
    chamadosAbertos: 321, chamadosResolvidos: 1200, tempoPrimeiraRespostaHoras: 12.75, tempoResolucaoHoras: 123.25, roteamentoCorreto: 0.91, taxaReabertura: 0.05,
    principaisCategorias: { porConversas: ranking, porChamados: ranking }, indicadorPrincipal: 0.7123,
  }
  let medidas = 0
  for (const largura of [360, 390, 768, 1024, 1440]) {
    await abrir(page, largura, '/univag/indicadores', esperaIndicadores, {
      papeis: ['ADMINISTRADOR'],
      rotas: (p) => p.route('**/api/indicadores**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dados) })),
    })
    const totais = page.locator('section:has(h2) tbody td:last-child')
    await expect(totais, `${largura}: totais`).toHaveCount(8)
    for (let i = 0; i < 8; i++) {
      const m = await totais.nth(i).evaluate((e) => {
        const r = document.createRange()
        r.selectNodeContents(e)
        return { texto: e.textContent, altura: r.getBoundingClientRect().height, linha: parseFloat(getComputedStyle(e).lineHeight) }
      })
      expect(m.altura, `${largura}: total ${m.texto} em 1 linha`).toBeLessThanOrEqual(m.linha + 1)
      medidas++
    }
    const categorias = page.locator('section:has(h2) tbody td:first-child')
    await expect(categorias).toHaveCount(8)
    const inteira = await categorias.first().evaluate((e) => e.scrollWidth <= e.clientWidth && e.textContent!.includes('escolares!'))
    expect(inteira, `${largura}: categoria inteira`).toBe(true)
  }
  expect(medidas).toBe(40)
})

// C32: em cores forçadas o `background` some; a barra do item ativo é uma borda e continua visível
test('item ativo visível com cores forçadas', async ({ page }) => {
  await instalar(page)
  await page.emulateMedia({ forcedColors: 'active' })
  await abrir(page, 1440, '/univag/fila', esperaFila)
  await page.mouse.move(700, 600)
  const [ativos, inativo] = [page.locator('[data-sidebar=content] a[aria-current=page]'), page.locator('[data-sidebar=content]').getByRole('link', { name: 'Indicadores' })]
  await expect(ativos).toHaveCount(1)
  await expect(inativo).toHaveCount(1)
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), 'cores forçadas ligadas').toBe(true)
  const ler = (l: Locator) =>
    l.evaluate((e) => {
      const [s, b] = [getComputedStyle(e), getComputedStyle(e, '::before')]
      const fundo = getComputedStyle(document.body).backgroundColor
      return [
        { largura: parseFloat(s.borderLeftWidth), estilo: s.borderLeftStyle, cor: s.borderLeftColor, fundo: s.backgroundColor },
        { largura: parseFloat(b.borderLeftWidth), estilo: b.borderLeftStyle, cor: b.borderLeftColor, fundo },
      ].filter((x) => x.estilo === 'solid' && x.largura >= 1)
    })
  const a = await ler(ativos)
  expect(a, 'o ativo tem 1 borda de barra').toHaveLength(1)
  expect(Math.abs(a[0].largura - 3)).toBeLessThanOrEqual(1)
  expect(a[0].cor, 'cor da borda diferente do fundo pintado').not.toBe(a[0].fundo)
  expect(await ler(inativo), 'controle: o inativo não tem a borda').toEqual([])
})

// C33: o foco inteiro nos cartões do celular, na primeira coluna da Fila e no Fechar do diálogo
test('foco inteiro nos cartões, na primeira coluna e no Fechar', async ({ page }) => {
  test.setTimeout(240_000)
  await instalar(page)
  let medidas = 0
  for (const [rota, papeis] of [['/univag/fila', ['ATENDENTE']], ['/univag/solicitacoes', ['ALUNO']]] as const) {
    await abrir(page, 390, rota, esperaFila, { papeis: [...papeis] })
    const link = page.getByRole('main').getByRole('link', { name: 'ONE-123' })
    await expect(link, `${rota}: 1 link no cartão`).toHaveCount(1)
    await tabAte(page, link)
    const r = await link.evaluate(foraDoCorte, undefined)
    // o corte das 2 linhas (line-clamp) fica dentro do link, não em ancestral dele; o controle põe um corte no pai para a medida acusar
    expect(await link.locator('*').evaluateAll((es) => es.filter((e) => getComputedStyle(e).overflowY !== 'visible').length), `${rota}: 1 line-clamp dentro do link`).toBe(1)
    expect(r.fora, `${rota}: contorno inteiro`).toEqual([])
    await link.evaluate((e) => {
      e.parentElement!.style.overflow = 'hidden'
      e.style.outlineOffset = '40px'
    })
    expect((await link.evaluate(foraDoCorte, undefined)).fora.length, `${rota}: controle: o contorno de fora é cortado`).toBeGreaterThan(0)
    await link.evaluate((e) => {
      e.parentElement!.style.overflow = ''
      e.style.outlineOffset = ''
    })
    medidas++
  }
  // 1280: o contorno do link da primeira coluna cerca o texto, sem cruzar as letras
  await abrir(page, 1280, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
  const primeira = page.getByRole('link', { name: 'ONE-123' })
  await expect(primeira).toHaveCount(1)
  await tabAte(page, primeira)
  const caixas = (deslocamento?: string) =>
    primeira.evaluate((e, d) => {
      if (d) e.style.outlineOffset = d
      const s = getComputedStyle(e)
      const [r, g] = [e.getBoundingClientRect(), document.createRange()]
      g.selectNodeContents(e)
      const t = g.getBoundingClientRect()
      const m = parseFloat(s.outlineOffset)
      e.style.outlineOffset = ''
      return { dentro: r.left - m <= t.left + 1 && r.top - m <= t.top + 1 && r.right + m >= t.right - 1 && r.bottom + m >= t.bottom - 1, m }
    }, deslocamento)
  expect((await caixas()).dentro, 'o contorno contém o texto').toBe(true)
  expect((await caixas('-4px')).dentro, 'controle: um contorno que entra no texto é acusado').toBe(false)
  expect((await primeira.evaluate(foraDoCorte, undefined)).fora, 'e continua inteiro no contêiner').toEqual([])
  medidas++
  // o Fechar do diálogo de Contato, aberto pelo teclado, nos 3 temas e sem cor
  for (const tema of Temas) {
    await abrir(page, 1280, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'], tema })
    const contato = page.locator('[data-sidebar=footer]').getByRole('button', { name: 'Contato' })
    await expect(contato).toHaveCount(1)
    await tabAte(page, contato)
    await page.keyboard.press('Enter')
    const fechar = page.getByRole('dialog').getByRole('button', { name: 'Fechar' })
    await expect(fechar, `${tema}: 1 Fechar`).toHaveCount(1)
    await tabAte(page, fechar).catch(() => {})
    await expect(fechar).toBeFocused()
    await expect.poll(() => fechar.evaluate((e) => getComputedStyle(e).opacity), `${tema}: opacidade 1`).toBe('1')
    const f = (await lerFoco(page))!
    expect(f.largura).toBeGreaterThanOrEqual(2)
    expect(contraste(f.composta, f.fundo), `${tema}: contorno do Fechar`).toBeGreaterThanOrEqual(3)
    medidas++
  }
  expect(medidas).toBe(6)
})

// C34
test('ordem do rodapé e recolher dentro da barra', async ({ page, browser }) => {
  await instalar(page)
  await abrir(page, 1440, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
  const rodape = page.locator('[data-sidebar=footer]')
  const itens = [rodape.getByRole('button', { name: 'Contato' }), rodape.getByRole('button', { name: 'Tema' }), rodape.getByRole('button', { name: /Ana/ }), rodape.getByRole('button', { name: 'Alternar barra lateral' })]
  const ys: number[] = []
  for (const i of itens) {
    await expect(i).toHaveCount(1)
    ys.push((await i.boundingBox())!.y)
  }
  expect(ys, 'Contato, Tema, usuário, recolher: de cima para baixo').toEqual([...ys].sort((a, b) => a - b))
  expect(new Set(ys).size, 'posições distintas').toBe(4)
  // recolhida, com ponteiro grosso
  const contexto = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' })
  const p = await contexto.newPage()
  await instalar(p)
  await p.addInitScript(() => localStorage.setItem('one-barra', 'recolhida'))
  await abrir(p, 1024, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
  expect(await p.evaluate(() => matchMedia('(pointer: coarse)').matches), 'ponteiro grosso').toBe(true)
  await expect(p.locator('[data-slot=sidebar][data-state=collapsed]')).toHaveCount(1)
  const botao = p.locator('[data-sidebar=footer]').getByRole('button', { name: 'Alternar barra lateral' })
  await expect(botao).toHaveCount(1)
  const [b, barra] = [(await botao.boundingBox())!, (await p.locator('[data-sidebar=sidebar]').boundingBox())!]
  expect(b.x, 'recolher: x ≥ 0').toBeGreaterThanOrEqual(0)
  expect(b.x + b.width, 'recolher: dentro da barra').toBeLessThanOrEqual(barra.x + barra.width + 1)
  await contexto.close()
})

// C35
test('Enviar da altura do campo', async ({ page }) => {
  test.setTimeout(90_000) // 2 páginas, sob máquina carregada
  let medidas = 0
  for (const largura of [1440, 390]) {
    await abrir(page, largura, '/univag/assistente', esperaAssistente, { papeis: ['ALUNO'] })
    const [campo, enviar] = [page.getByLabel('Mensagem'), page.getByRole('button', { name: 'Enviar', exact: true })]
    await expect(campo).toHaveCount(1)
    await expect(enviar).toHaveCount(1)
    await campo.fill('oi')
    const [c, e] = [(await campo.boundingBox())!, (await enviar.boundingBox())!]
    expect(Math.abs(c.height - e.height), `${largura}: mesma altura`).toBeLessThanOrEqual(1)
    expect(Math.abs(c.y - e.y), `${largura}: alinhados`).toBeLessThanOrEqual(1)
    if (largura === 390) {
      expect(c.height).toBeGreaterThanOrEqual(43)
      expect(e.height).toBeGreaterThanOrEqual(43)
    }
    medidas++
  }
  expect(medidas).toBe(2)
})

// C36: o corte das 2 linhas mede 2 × line-height, sem folga vertical, e o alto da 3ª linha não aparece
test('corte de 2 linhas sem o alto da terceira', async ({ page }) => {
  test.setTimeout(240_000)
  await instalar(page)
  const titulo = 'SOLICITAÇÃO DE SEGUNDA VIA DO BOLETO DA MENSALIDADE DE NOVEMBRO, ÁREA FINANCEIRA, ÍNDICE DE REMATRÍCULA DO SEMESTRE ANTERIOR: ÃO ÁGUA ÍNDIO'
  const fila = { numero: 'ONE-123', titulo, categoria: 'Financeiro > Boletos e mensalidades', estado: 'AGUARDANDO_ALUNO', responsavel: null, criadoEm: '2026-11-02T12:00:00Z', dias: 2 }
  const rotas = (p: Page) =>
    p.route(/\/api\/chamados\?escopo=/, (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().url().includes('escopo=fila') ? [fila] : [{ numero: 'ONE-123', titulo, estado: 'AGUARDANDO_ALUNO', criadoEm: fila.criadoEm }]) }),
    )
  let medidas = 0
  for (const [rota, papeis] of [['/univag/fila', ['ATENDENTE']], ['/univag/solicitacoes', ['ALUNO']]] as const)
    for (const largura of [360, 390]) {
      const r = `${rota} a ${largura}`
      await abrir(page, largura, rota, esperaFila, { papeis: [...papeis], rotas })
      const link = page.getByRole('main').getByRole('link', { name: /ONE-123/ })
      await expect(link, `${r}: 1 link`).toHaveCount(1)
      const m = await page.locator('p[data-linha=assunto]').evaluate((p) => {
        const cortes = [...p.querySelectorAll('*')].filter((e) => getComputedStyle(e).overflowY !== 'visible')
        if (cortes.length !== 1) return { cortes: cortes.length }
        const c = cortes[0]
        const [cs, cr] = [getComputedStyle(c), c.getBoundingClientRect()]
        const g = document.createRange()
        g.selectNodeContents(c)
        const rects = [...g.getClientRects()]
        const tops = [...new Set(rects.map((x) => Math.round(x.top)))]
        const visiveis = rects.filter((x) => x.top < cr.bottom - 1)
        return {
          cortes: 1, altura: cr.height, lh: parseFloat(cs.lineHeight), padding: parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
          linhasNoTexto: tops.length, fimVisivel: Math.max(...visiveis.map((x) => x.bottom)), fundo: cr.bottom,
        }
      })
      expect(m.cortes, `${r}: 1 caixa que corta`).toBe(1)
      expect(m.linhasNoTexto, `${r}: o título tem ao menos 3 linhas (a 3ª existe)`).toBeGreaterThanOrEqual(3)
      expect(m.padding, `${r}: sem folga vertical`).toBe(0)
      expect(Math.abs(m.altura! - 2 * m.lh!), `${r}: a caixa mede 2 × line-height`).toBeLessThanOrEqual(1)
      expect(m.fimVisivel!, `${r}: o texto visível termina dentro da caixa`).toBeLessThanOrEqual(m.fundo! + 1)
      await tabAte(page, link)
      expect((await link.evaluate(foraDoCorte, undefined)).fora, `${r}: contorno inteiro`).toEqual([])
      medidas++
    }
  expect(medidas).toBe(4)
})

// C37: com a coluna estreita, a barra fica embaixo do rótulo
test('barra do ranking embaixo do rótulo no estreito', async ({ page }) => {
  const ranking = [
    { categoria: 'Acadêmico > Secretaria > Declarações e históricos escolares!', total: 1000 },
    { categoria: 'Financeiro > Boletos e mensalidades', total: 500 },
  ]
  const dados = {
    semDados: false, alunosAtivos: 1234, conversas: 5678, taxaAutoatendimento: 0.65, taxaEscalonamento: 0.2, taxaAbandono: 0.14, taxaPerguntasSemArtigo: 0.12,
    chamadosAbertos: 321, chamadosResolvidos: 1200, tempoPrimeiraRespostaHoras: 12.75, tempoResolucaoHoras: 123.25, roteamentoCorreto: 0.91, taxaReabertura: 0.05,
    principaisCategorias: { porConversas: ranking, porChamados: ranking }, indicadorPrincipal: 0.7123,
  }
  let medidas = 0
  for (const largura of [360, 390]) {
    await abrir(page, largura, '/univag/indicadores', esperaIndicadores, {
      papeis: ['ADMINISTRADOR'],
      rotas: (p) => p.route('**/api/indicadores**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dados) })),
    })
    const barras = page.locator('section:has(h2) [data-barra]')
    await expect(barras, `${largura}: 1 barra por linha`).toHaveCount(4)
    const m = await barras.evaluateAll((bs) =>
      bs.map((b) => {
        const g = document.createRange()
        const rotulo = [...b.parentElement!.childNodes].filter((n) => n !== b)
        g.setStartBefore(rotulo[0])
        g.setEndAfter(rotulo[rotulo.length - 1])
        const r = g.getBoundingClientRect()
        return { topoBarra: b.getBoundingClientRect().top, fimRotulo: r.bottom, alturaRotulo: r.height, lh: parseFloat(getComputedStyle(b.parentElement!).lineHeight) }
      }),
    )
    for (const x of m) {
      expect(x.alturaRotulo, `${largura}: o rótulo existe`).toBeGreaterThan(0)
      expect(x.topoBarra, `${largura}: barra abaixo do rótulo`).toBeGreaterThanOrEqual(x.fimRotulo - 1)
      medidas++
    }
    expect(Math.max(...m.map((x) => x.alturaRotulo / x.lh)), `${largura}: a coluna é estreita, o rótulo quebra`).toBeGreaterThan(1.5)
  }
  expect(medidas).toBe(8)
})

// C38: dicas nos ícones do rodapé, só com a barra recolhida; a linha do usuário não tem dica
test('dica nos ícones do rodapé com a barra recolhida, sem dica no usuário', async ({ page }) => {
  await instalar(page)
  for (const estado of ['recolhida', 'aberta']) {
    await page.addInitScript((e) => localStorage.setItem('one-barra', e), estado)
    await abrir(page, 1280, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
    await expect(page.locator(`[data-slot=sidebar][data-state=${estado === 'aberta' ? 'expanded' : 'collapsed'}]`), `${estado}: estado da barra`).toHaveCount(1)
    const rodape = page.locator('[data-sidebar=footer]')
    for (const nome of ['Alternar barra lateral', 'Tema', 'Contato']) {
      const botao = rodape.getByRole('button', { name: nome })
      await expect(botao, `${estado}: ${nome}`).toHaveCount(1)
      await botao.hover()
      if (estado === 'recolhida') await expect(page.getByRole('tooltip'), `${nome}: 1 dica com o nome`).toHaveText(nome)
      else {
        await page.waitForTimeout(800)
        await expect(page.getByRole('tooltip'), `${nome}: controle, sem dica com a barra aberta`).toHaveCount(0)
      }
      await page.mouse.move(700, 400, { steps: 5 })
      await page.mouse.move(800, 500, { steps: 5 })
      await expect(page.getByRole('tooltip'), `${estado} ${nome}: a dica some ao sair`).toHaveCount(0)
    }
    const usuario = rodape.getByRole('button', { name: /Ana/ })
    await expect(usuario, `${estado}: usuário`).toHaveCount(1)
    await usuario.hover()
    await page.waitForTimeout(800)
    await expect(page.getByRole('tooltip'), `${estado}: usuário sem dica`).toHaveCount(0)
    await usuario.click()
    await expect(page.getByRole('menuitem', { name: 'Sair' }), `${estado}: menu do usuário`).toHaveCount(1)
    await page.keyboard.press('Escape')
    await page.mouse.move(700, 400, { steps: 5 })
    await page.mouse.move(800, 500, { steps: 5 })
    await expect(page.getByRole('tooltip'), `${estado}: nada preso depois do menu`).toHaveCount(0)
  }
})

// C38: página nova, sem passar antes por outro ícone: o que abre por foco ao fechar o menu apareceria aqui
test('sem dica presa depois de clicar fora do menu do usuário', async ({ page }) => {
  await instalar(page)
  await page.addInitScript(() => localStorage.setItem('one-barra', 'recolhida'))
  await abrir(page, 1280, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
  const usuario = page.locator('[data-sidebar=footer]').getByRole('button', { name: /Ana/ })
  await expect(usuario, '1 linha do usuário').toHaveCount(1)
  await usuario.hover()
  await usuario.click()
  await expect(page.getByRole('menuitem', { name: 'Sair' }), 'menu aberto').toHaveCount(1)
  await page.waitForTimeout(400) // o clique de uma pessoa vem depois da animação de abertura
  await page.mouse.click(800, 500)
  await expect(page.getByRole('menuitem', { name: 'Sair' }), 'menu fechado').toHaveCount(0)
  for (let i = 0; i < 6; i++) {
    await expect(page.getByRole('tooltip'), `amostra ${i}: nenhuma dica`).toHaveCount(0, { timeout: 100 })
    await page.waitForTimeout(250)
  }
})

// C40: no celular, o link cobre número e título e abre o chamado com 1 entrada no histórico
test('link do cartão abre o chamado com 1 entrada no histórico', async ({ page }) => {
  await instalar(page)
  await abrir(page, 390, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
  const link = page.getByRole('main').getByRole('link', { name: /ONE-123/ })
  await expect(link, '1 link no cartão').toHaveCount(1)
  await expect(link, 'nome com número e título').toHaveAccessibleName(/^ONE-123 Preciso/)
  const antes = await page.evaluate(() => history.length)
  await link.click()
  await page.waitForURL('**/univag/chamados/ONE-123')
  expect(await page.evaluate(() => history.length), '1 entrada a mais').toBe(antes + 1)
  await page.goBack()
  await page.waitForURL('**/univag/fila')
})

// C41: na gaveta, com foco na linha do usuário, um Esc fecha
test('Esc fecha a gaveta em 1 toque a partir do usuário', async ({ page }) => {
  await instalar(page)
  await abrir(page, 390, '/univag/fila', esperaFila, { papeis: ['ATENDENTE'] })
  await page.locator('header button:has(svg.lucide-menu)').click()
  const gaveta = page.getByRole('dialog')
  await expect(gaveta, 'gaveta aberta').toHaveCount(1)
  const usuario = gaveta.getByRole('button', { name: /Ana/ })
  await expect(usuario, '1 linha do usuário').toHaveCount(1)
  await usuario.focus()
  await page.keyboard.press('Escape')
  await expect(gaveta, '1 Esc fecha').toHaveCount(0)
})

// C39: o Fechar da gaveta, com foco, tem opacidade 1 e contorno de 3:1 nos 3 temas
test('foco inteiro no Fechar da gaveta', async ({ page }) => {
  test.setTimeout(240_000)
  await instalar(page)
  let medidas = 0
  for (const tema of Temas) {
    await abrir(page, 390, '/univag/chamados/ONE-123', (p) => p.getByText('Resumo gerado por IA').waitFor(), { papeis: ['ATENDENTE'], tema })
    const mais = page.getByRole('button', { name: 'Mais', exact: true })
    await expect(mais, `${tema}: 1 Mais`).toHaveCount(1)
    await tabAte(page, mais)
    await page.keyboard.press('Enter')
    const fechar = page.getByRole('dialog', { name: 'Mais ações' }).getByRole('button', { name: 'Fechar' })
    await expect(fechar, `${tema}: 1 Fechar`).toHaveCount(1)
    await tabAte(page, fechar).catch(() => {})
    await expect(fechar).toBeFocused()
    await expect.poll(() => fechar.evaluate((e) => getComputedStyle(e).opacity), `${tema}: opacidade 1`).toBe('1')
    const f = (await lerFoco(page))!
    expect(f.largura, `${tema}: contorno de 2 px`).toBeGreaterThanOrEqual(2)
    expect(contraste(f.composta, f.fundo), `${tema}: contorno do Fechar`).toBeGreaterThanOrEqual(3)
    medidas++
  }
  expect(medidas).toBe(3)
})
