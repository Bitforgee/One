import { expect, it } from 'vitest'

const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const arquivos = Object.keys(fontes).map((c) => c.replace('/src/', ''))
const texto = (arquivo: string) => fontes[`/src/${arquivo}`]

const Fatias = ['acesso', 'administracao', 'assistente', 'chamados', 'conhecimento', 'indicadores']
const SemTela = ['ui', 'ilustracoes']
const Raiz = ['App.tsx', 'Autenticado.tsx', 'acao.tsx', 'api.ts', 'AvisosPush.tsx', 'datas.ts', 'main.tsx', 'push.ts', 'sessao.ts', 'sw.test.ts', 'sw.ts', 'tempo-real.ts', 'tempo-real.test.ts', 'tabela.test.tsx', 'aparencia.test.tsx', 'ux.test.tsx', 'links.test.tsx', 'identidade.test.tsx', 'guidelinesGlobal.test.ts', 'guidelinesCampos.test.tsx', 'guidelinesRascunho.test.tsx', 'guidelinesListas.test.tsx', 'guidelinesConfirmar.test.tsx', 'guidelinesToque.test.tsx', 'guidelinesAnuncio.test.tsx', 'guidelinesFormatos.test.tsx', 'guidelinesUrl.test.tsx', 'guidelinesRotulos.test.tsx']
const SoDaUi = /from ['"](?:radix-ui|@radix-ui\/[^'"]+|class-variance-authority|use-stick-to-bottom|clsx|tailwind-merge)['"]/
const ForaDaUi = /(?:from|import)\s*['"](?:\.\.\/|@\/(?!ui\/))/
const pasta = (arquivo: string) => (arquivo.includes('/') ? arquivo.split('/')[0] : '')

function fatiaPorCaminho(): Record<string, string> {
  const app = texto('App.tsx')
  const fatiaDaTela: Record<string, string> = {}
  for (const [, nomes, origem] of app.matchAll(/import \{([^}]+)\} from '\.\/([^']+)'/g))
    for (const nome of nomes.split(',')) fatiaDaTela[nome.trim()] = pasta(origem)
  const caminhos: Record<string, string> = {}
  for (const [, caminho, tela] of app.matchAll(/<Route (?:path="([^"]+)"|index) element=\{<(\w+)/g))
    caminhos[(caminho ?? '').split('/')[0]] = fatiaDaTela[tela]
  return caminhos
}

it('estrutura em fatias', () => {
  const pastas = [...new Set(arquivos.map(pasta).filter((p) => p !== '' && p !== 'test'))].sort()
  expect(pastas).toEqual([...Fatias, ...SemTela].sort())
  expect(arquivos.filter((a) => a.startsWith('telas/'))).toEqual([])

  const caminhos = fatiaPorCaminho()
  const testes = arquivos.filter((a) => a.endsWith('.test.tsx') && !Raiz.includes(a) && !SemTela.includes(pasta(a)))
  expect(testes.length).toBeGreaterThan(0)
  for (const teste of testes) {
    expect(Fatias, teste).toContain(pasta(teste))
    const abertas = [...texto(teste).matchAll(/abrir\('\/[^/']+\/?([^/']*)/g)].map(([, caminho]) => caminhos[caminho])
    expect(abertas, teste).toContain(pasta(teste))
  }

  for (const arquivo of arquivos.filter((a) => pasta(a) === '' && !Raiz.includes(a))) {
    const modulo = arquivo.replace(/\.tsx?$/, '')
    const importam = new Set(
      arquivos
        .filter((a) => Fatias.includes(pasta(a)) && !a.endsWith('.test.tsx'))
        .filter((a) => new RegExp(`from '(?:\\.\\./)+${modulo}'`).test(texto(a)))
        .map(pasta),
    )
    expect(importam.size, arquivo).toBeGreaterThanOrEqual(2)
  }

  for (const arquivo of arquivos.filter((a) => pasta(a) === 'ui')) expect(texto(arquivo), arquivo).not.toMatch(ForaDaUi)
  expect(arquivos.filter((a) => /(?:function|const)\s+cn\b/.test(texto(a)))).toEqual(['ui/utils.ts'])
  expect(arquivos.filter((a) => pasta(a) !== 'ui' && SoDaUi.test(texto(a)))).toEqual([])
})

it('administracao em subpastas', () => {
  const Subpastas = ['aparencia', 'fluxos', 'cadastros', 'integracoes', 'instituicoes']
  const dela = arquivos.filter((a) => a.startsWith('administracao/')).map((a) => a.slice('administracao/'.length))
  expect(dela.length).toBe(52)
  for (const arquivo of dela) {
    const partes = arquivo.split('/')
    expect(partes.length, arquivo).toBeLessThanOrEqual(2)
    if (partes.length === 2) expect(Subpastas, arquivo).toContain(partes[0])
  }
  expect(dela.filter((a) => !a.includes('/')).sort()).toEqual(['avisoAoFechar.ts', 'comum.tsx'])
  for (const subpasta of Subpastas) expect(dela.some((a) => a.startsWith(`${subpasta}/`)), subpasta).toBe(true)

  const app = texto('App.tsx')
  const subpastaDaTela: Record<string, string> = {}
  for (const [, nome, subpasta] of app.matchAll(/import \{ (\w+) \} from '\.\/administracao\/(\w+)\/\w+'/g)) subpastaDaTela[nome] = subpasta
  const rotas = [...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+)/g)]
    .filter(([, , tela]) => subpastaDaTela[tela])
    .map(([, caminho, tela]) => ({ padrao: new RegExp(`^${caminho.replace(/:\w+/g, '[^/]*')}$`), subpasta: subpastaDaTela[tela] }))
  expect(rotas.length).toBeGreaterThan(0)

  const testes = dela.filter((a) => a.endsWith('.test.tsx'))
  expect(testes.length).toBeGreaterThan(0)
  for (const teste of testes) {
    const fonte = texto(`administracao/${teste}`)
    const dasRotas = [...fonte.matchAll(/abrir\('\/[^/'?]+\/([^'?]*)/g)].flatMap(([, caminho]) => rotas.filter((r) => r.padrao.test(caminho)).map((r) => r.subpasta))
    const dosImports = [...fonte.matchAll(/from '\.\.?\/(?:(\w+)\/)?\w+'/g)].map(([, subpasta]) => subpasta ?? teste.split('/')[0])
    expect([...dasRotas, ...dosImports], teste).toContain(teste.split('/')[0])
  }

  for (const arquivo of dela.filter((a) => a.includes('/'))) expect(texto(`administracao/${arquivo}`), arquivo).not.toMatch(/(?:from|import)\s*\(?\s*['"]@\//)
})
it('canvas carregado só sob demanda', () => {
  const biblioteca = /(?:from|import)\s*['"]@xyflow\/react[^'"]*['"]/
  const codigo = arquivos.filter((a) => !/\.test\.tsx?$/.test(a))
  const usam = codigo.filter((a) => biblioteca.test(texto(a)))
  expect(usam.length).toBeGreaterThan(0)
  for (const a of usam) expect(pasta(a), a).toBe('administracao')

  const modulo = (a: string) => a.replace(/^.*\//, '').replace(/\.tsx?$/, '')
  const importam = (a: string) => codigo.filter((o) => new RegExp(`from ['"]\\.{1,2}/(?:\\.\\./)*(?:[a-z]+/)*${modulo(a)}['"]`).test(texto(o)))
  for (const a of usam) expect(importam(a).filter((o) => !usam.includes(o)), a).toEqual([])
  const portas = usam.filter((a) => importam(a).length === 0)
  expect(portas.length).toBeGreaterThan(0)
  for (const a of portas) expect(codigo.some((o) => !usam.includes(o) && texto(o).includes(`import('./${modulo(a)}')`)), a).toBe(true)
})
