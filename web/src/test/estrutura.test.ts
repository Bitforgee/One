import { expect, it } from 'vitest'

// C35 (door 3): o web/ em fatias verticais; lê o código-fonte como texto, como o ArquiteturaTests do One.Api/.
// Sem parâmetro de tipo: o cache de módulos do Vitest só deixa de guardar o arquivo que traz o texto "import.meta.glob(".
const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const arquivos = Object.keys(fontes).map((c) => c.replace('/src/', ''))
const texto = (arquivo: string) => fontes[`/src/${arquivo}`]

const Fatias = ['acesso', 'administracao', 'assistente', 'chamados', 'conhecimento', 'indicadores']
// Pastas que não são telas: ui (registros) e ilustracoes (SVGs próprios, aparencia-instituicao door 9)
const SemTela = ['ui', 'ilustracoes']
const Raiz = ['App.tsx', 'Autenticado.tsx', 'acao.tsx', 'api.ts', 'AvisosPush.tsx', 'datas.ts', 'main.tsx', 'push.ts', 'sessao.ts', 'sw.test.ts', 'sw.ts', 'tempo-real.ts', 'tempo-real.test.ts', 'tabela.test.tsx', 'aparencia.test.tsx', 'ux.test.tsx', 'links.test.tsx', 'identidade.test.tsx']
// Pacotes que só o código copiado dos registros (shadcn/ui, AI Elements) importa (door 3)
const SoDaUi = /from ['"](?:radix-ui|@radix-ui\/[^'"]+|class-variance-authority|use-stick-to-bottom|clsx|tailwind-merge)['"]/
const ForaDaUi = /(?:from|import)\s*['"](?:\.\.\/|@\/(?!ui\/))/
const pasta = (arquivo: string) => (arquivo.includes('/') ? arquivo.split('/')[0] : '')

// Fatia de cada tela: o App importa a tela da pasta dela e a liga a um caminho.
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

  // cada teste de tela mora numa fatia e abre ao menos uma tela dessa fatia
  const caminhos = fatiaPorCaminho()
  const testes = arquivos.filter((a) => a.endsWith('.test.tsx') && !Raiz.includes(a) && !SemTela.includes(pasta(a)))
  expect(testes.length).toBeGreaterThan(0)
  for (const teste of testes) {
    expect(Fatias, teste).toContain(pasta(teste))
    const abertas = [...texto(teste).matchAll(/abrir\('\/[^/']+\/?([^/']*)/g)].map(([, caminho]) => caminhos[caminho])
    expect(abertas, teste).toContain(pasta(teste))
  }

  // na raiz só o que a door 3 nomeia e o que 2 ou mais fatias importam
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

  // ui/ só tem código dos registros: não importa fatia nem módulo da raiz; o cn só existe em ui/utils.ts
  for (const arquivo of arquivos.filter((a) => pasta(a) === 'ui')) expect(texto(arquivo), arquivo).not.toMatch(ForaDaUi)
  expect(arquivos.filter((a) => /(?:function|const)\s+cn\b/.test(texto(a)))).toEqual(['ui/utils.ts'])
  expect(arquivos.filter((a) => pasta(a) !== 'ui' && SoDaUi.test(texto(a)))).toEqual([])
})

// fluxos-atendimento C94 (door 10): a biblioteca do canvas só entra em web/src/administracao/, e o arquivo que a importa só chega ao navegador por import() dinâmico.
// A outra metade, o pacote de entrada do build sem o código dela, é o web/scripts/entrada-sem-canvas.mjs.
it('canvas carregado só sob demanda', () => {
  const biblioteca = /(?:from|import)\s*['"]@xyflow\/react[^'"]*['"]/
  const codigo = arquivos.filter((a) => !/\.test\.tsx?$/.test(a))
  const usam = codigo.filter((a) => biblioteca.test(texto(a)))
  expect(usam.length).toBeGreaterThan(0)
  for (const a of usam) expect(pasta(a), a).toBe('administracao')

  const modulo = (a: string) => a.replace(/^.*\//, '').replace(/\.tsx?$/, '')
  const importam = (a: string) => codigo.filter((o) => new RegExp(`from ['"]\\.{1,2}/(?:administracao/)?${modulo(a)}['"]`).test(texto(o)))
  // só outro arquivo que também usa a biblioteca pode importá-lo de forma estática
  for (const a of usam) expect(importam(a).filter((o) => !usam.includes(o)), a).toEqual([])
  // a porta de entrada do canvas, a que nenhum outro desse grupo importa, é aberta por um import() dinâmico de fora dele
  const portas = usam.filter((a) => importam(a).length === 0)
  expect(portas.length).toBeGreaterThan(0)
  for (const a of portas) expect(codigo.some((o) => !usam.includes(o) && texto(o).includes(`import('./${modulo(a)}')`)), a).toBe(true)
})
