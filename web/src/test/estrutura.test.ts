import { expect, it } from 'vitest'

// C35 (door 3): o web/ em fatias verticais; lê o código-fonte como texto, como o ArquiteturaTests do api/.
// Sem parâmetro de tipo: o cache de módulos do Vitest só deixa de guardar o arquivo que traz o texto "import.meta.glob(".
const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const arquivos = Object.keys(fontes).map((c) => c.replace('/src/', ''))
const texto = (arquivo: string) => fontes[`/src/${arquivo}`]

const Fatias = ['acesso', 'administracao', 'assistente', 'chamados', 'conhecimento', 'indicadores']
const Raiz = ['App.tsx', 'Autenticado.tsx', 'acao.tsx', 'api.ts', 'datas.ts', 'main.tsx', 'sessao.ts']
// Pacotes que só o código copiado dos registros (shadcn/ui, AI Elements) importa (door 3)
const SoDaUi = /from ['"](?:radix-ui|@radix-ui\/[^'"]+|vaul|class-variance-authority|use-stick-to-bottom|clsx|tailwind-merge)['"]/
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
  expect(pastas).toEqual([...Fatias, 'ui'])
  expect(arquivos.filter((a) => a.startsWith('telas/'))).toEqual([])

  // cada teste de tela mora numa fatia e abre ao menos uma tela dessa fatia
  const caminhos = fatiaPorCaminho()
  const testes = arquivos.filter((a) => a.endsWith('.test.tsx'))
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
