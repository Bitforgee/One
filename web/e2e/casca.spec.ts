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
    for (const t of Tokens) expect(por['#8a1538'][t], `${tema}: ${t} difere entre as marcas`).not.toEqual(por['#0b6e4f'][t])
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
      // a barra: uma borda esquerda ou o ::before, a cor pintada sobre o fundo da barra
      const ler = (l: Locator) =>
        l.evaluate((e) => {
          const s = getComputedStyle(e)
          const b = getComputedStyle(e, '::before')
          const sobre = (cor: string) => window.__ux.pintar([...window.__ux.pilha(e.parentElement!), cor])
          const barras = [
            { largura: parseFloat(s.borderLeftWidth), cor: sobre(s.borderLeftColor), visivel: s.borderLeftStyle !== 'none' },
            { largura: parseFloat(b.width), cor: sobre(b.backgroundColor), visivel: b.content !== 'none' && b.display !== 'none' && parseFloat(b.height) > 0 },
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
        const campo = page.getByLabel('Mensagem')
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
