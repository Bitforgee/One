import { expect, it } from 'vitest'

const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const arquivos = Object.keys(fontes).map((c) => c.replace('/src/', ''))
const texto = (arquivo: string) => fontes[`/src/${arquivo}`]

const Fatias = ['acesso', 'administracao', 'assistente', 'chamados', 'conhecimento', 'indicadores']
const SemTela = ['ui', 'ilustracoes']
const Raiz = ['App.tsx', 'Autenticado.tsx', 'acao.tsx', 'api.ts', 'AvisosPush.tsx', 'datas.ts', 'main.tsx', 'push.ts', 'sessao.ts', 'sw.test.ts', 'sw.ts', 'tempo-real.ts', 'tempo-real.test.ts', 'tabela.test.tsx', 'aparencia.test.tsx', 'ux.test.tsx', 'links.test.tsx', 'identidade.test.tsx']
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
        .filter((a) => texto(a).includes(`from '../${modulo}'`))
        .map(pasta),
    )
    expect(importam.size, arquivo).toBeGreaterThanOrEqual(2)
  }

  for (const arquivo of arquivos.filter((a) => pasta(a) === 'ui')) expect(texto(arquivo), arquivo).not.toMatch(ForaDaUi)
  expect(arquivos.filter((a) => /(?:function|const)\s+cn\b/.test(texto(a)))).toEqual(['ui/utils.ts'])
  expect(arquivos.filter((a) => pasta(a) !== 'ui' && SoDaUi.test(texto(a)))).toEqual([])
})

it('canvas carregado só sob demanda', () => {
  const biblioteca = /(?:from|import)\s*['"]@xyflow\/react[^'"]*['"]/
  const codigo = arquivos.filter((a) => !/\.test\.tsx?$/.test(a))
  const usam = codigo.filter((a) => biblioteca.test(texto(a)))
  expect(usam.length).toBeGreaterThan(0)
  for (const a of usam) expect(pasta(a), a).toBe('administracao')

  const modulo = (a: string) => a.replace(/^.*\//, '').replace(/\.tsx?$/, '')
  const importam = (a: string) => codigo.filter((o) => new RegExp(`from ['"]\\.{1,2}/(?:administracao/)?${modulo(a)}['"]`).test(texto(o)))
  for (const a of usam) expect(importam(a).filter((o) => !usam.includes(o)), a).toEqual([])
  const portas = usam.filter((a) => importam(a).length === 0)
  expect(portas.length).toBeGreaterThan(0)
  for (const a of portas) expect(codigo.some((o) => !usam.includes(o) && texto(o).includes(`import('./${modulo(a)}')`)), a).toBe(true)
})
