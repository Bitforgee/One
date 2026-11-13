import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { Tabela } from './Tabela'
import { TableCell, TableRow } from './ui/table'
import { abrir, api, me } from './test/util'

const admin = me({ papeis: ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'] })
const vazias = ['setores', 'categorias', 'cursos', 'fluxos', 'respostas-prontas'].map((k) => [`GET /api/admin/${k}`, () => [200, []]] as const)
const Listas: [string, string, string, string, string?][] = [
  ['GET /api/chamados?escopo=fila', '/univag/fila', 'Fila em dia', 'Nenhum chamado na fila dos seus setores.'],
  ['GET /api/chamados?escopo=meus', '/univag/solicitacoes', 'Nenhuma solicitação', 'Você ainda não tem solicitações.', 'Falar com o assistente'],
  ['GET /api/admin/artigos', '/univag/artigos', 'Nenhum artigo', 'Os artigos são a base das respostas do assistente.', 'Novo artigo'],
  ['GET /api/admin/documentos', '/univag/documentos', 'Nenhum documento', 'PDFs como regulamentos e calendários também alimentam o assistente.', 'Novo documento'],
  ['GET /api/admin/usuarios', '/univag/usuarios', 'Nenhum usuário', 'Cadastre a equipe ou importe as matrículas.'],
  ['GET /api/admin/setores', '/univag/cadastros', 'Nada cadastrado', 'Nenhum item cadastrado.'],
]

const atendente = me({ papeis: ['ALUNO', 'ATENDENTE'] })
const fila = (estados: string[]) =>
  estados.map((estado, i) => ({ numero: `ONE-${i + 1}`, titulo: `chamado ${i + 1}`, categoria: 'Boleto', estado, responsavel: null, criadoEm: '2026-11-02T12:00:00Z', dias: 1 }))

describe('Tabela', () => {
  it('selo de estado com cor por grupo', async () => {
    const grupos: [string, string, string][] = [
      ['ABERTO', 'Aberto', 'bg-accent'],
      ['EM_ATENDIMENTO', 'Em atendimento', 'bg-accent'],
      ['AGUARDANDO_ALUNO', 'Aguardando aluno', 'bg-warning-subtle'],
      ['RESOLVIDO', 'Resolvido', 'bg-success/15'],
      ['FECHADO', 'Fechado', 'bg-success/15'],
    ]
    api({ 'GET /api/auth/me': () => [200, atendente], 'GET /api/chamados?escopo=fila': () => [200, fila(grupos.map(([estado]) => estado))] })
    abrir('/univag/fila')
    await screen.findByText('ONE-1')
    for (const [, texto, classe] of grupos) expect(screen.getByText(texto, { selector: '[data-slot=badge]' }), texto).toHaveClass(classe)
  })

  it('carregando mostra 3 esqueletos', async () => {
    api({ 'GET /api/auth/me': () => [200, atendente], 'GET /api/chamados?escopo=fila': () => new Promise(() => {}) })
    abrir('/univag/fila')
    await screen.findByRole('heading', { name: 'Fila' })
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
  })

  it.each(Listas)('vazio com ícone nas 6 listas (%s)', async (rota, caminho, titulo, frase, botao) => {
    api({ 'GET /api/auth/me': () => [200, admin], ...Object.fromEntries(vazias), 'GET /api/admin/categorias': () => [200, []], 'GET /api/admin/usuarios': () => [200, []], [rota]: () => [200, []] })
    abrir(caminho)
    const celula = (await screen.findByText(frase)).closest('[data-slot=table-cell]') as HTMLElement
    expect(celula.querySelectorAll('svg.lucide')).toHaveLength(1)
    expect(document.querySelector('svg[data-ilustracao]')).toBeNull()
    expect(within(celula).getByText(titulo)).toBeInTheDocument()
    const botoes = within(celula).queryAllByRole('button').concat(within(celula).queryAllByRole('link'))
    expect(botoes.map((b) => b.textContent)).toEqual(botao ? [botao] : [])
    if (!botao) return
    if (botao === 'Falar com o assistente') {
      expect(botoes[0]).toHaveAttribute('href', '/univag/assistente')
      return
    }
    await userEvent.click(botoes[0])
    expect(await screen.findByRole('dialog', { name: botao })).toBeInTheDocument()
  })

  const regrasDeVisibilidade = () => {
    const css = readFileSync('src/index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, , corpo]) => /content-visibility/.test(corpo))
  }
  const servirFila = (n: number) =>
    api({
      'GET /api/auth/me': () => [200, atendente],
      'GET /api/chamados?escopo=fila': () => [200, fila(Array.from({ length: n }, (_, i) => ['ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO'][i % 3]))],
    })
  const noCelular = () => vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media.startsWith('(max-width: 767px)'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))

  it('C51 cada cartão do celular declara content-visibility e a linha da tabela do desktop não', async () => {
    const regras = regrasDeVisibilidade()
    expect(regras).toHaveLength(1)
    const seletor = regras[0][1].trim()

    servirFila(3)
    abrir('/univag/fila')
    await screen.findByText('ONE-1')
    const linhasDeDados = [...document.querySelectorAll('[data-slot=table-body] > [data-slot=table-row]')]
    expect(linhasDeDados).toHaveLength(3)
    for (const linha of linhasDeDados) expect(linha.matches(seletor)).toBe(false)
    expect(document.querySelector('[data-slot=table-header] [data-slot=table-row]')!.matches(seletor)).toBe(false)
    cleanup()

    noCelular()
    servirFila(3)
    abrir('/univag/fila')
    await screen.findByText('ONE-1')
    const cartoes = [...document.querySelectorAll('[data-slot=table-row]')]
    expect(cartoes).toHaveLength(3)
    for (const cartao of cartoes) expect(cartao.matches(seletor)).toBe(true)
  })

  it('C7 os tres layouts da Tabela: cartao denso e cartao comum declaram content-visibility auto e contain-intrinsic-size auto 56px, a tabela do desktop nao', () => {
    const regras = regrasDeVisibilidade()
    const completas = regras.filter(([, , corpo]) => /content-visibility:\s*auto/.test(corpo) && /contain-intrinsic-size:\s*auto 56px/.test(corpo))
    expect(completas).toHaveLength(regras.length)
    const declarada = (linha: Element) => completas.some(([, seletor]) => linha.matches(seletor.trim()))
    const itens = [1, 2]
    const montado = { linhas: [] as Element[], raiz: null as Element | null }
    const anotar = (densa: boolean) => {
      const { container, unmount } = render(
        <Tabela colunas={[{ titulo: 'Nome' }]} itens={itens} densa={densa}>
          {itens.map((n) => (
            <TableRow key={n}>
              <TableCell>{n}</TableCell>
            </TableRow>
          ))}
        </Tabela>,
      )
      montado.raiz = container.firstElementChild
      montado.linhas = [...container.querySelectorAll('[data-slot=table-body] > [data-slot=table-row], [data-cartoes] > [data-slot=table-row], [data-linhas] > [data-slot=table-row]')]
      return unmount
    }

    noCelular()
    let desmontar = anotar(true)
    expect(montado.raiz).toHaveAttribute('data-linhas')
    expect(montado.linhas).toHaveLength(2)
    for (const linha of montado.linhas) expect(declarada(linha), 'cartao denso').toBe(true)
    desmontar()

    desmontar = anotar(false)
    expect(montado.raiz).toHaveAttribute('data-cartoes')
    expect(montado.linhas).toHaveLength(2)
    for (const linha of montado.linhas) expect(declarada(linha), 'cartao comum').toBe(true)
    desmontar()
    vi.unstubAllGlobals()

    anotar(false)
    expect(montado.raiz!.querySelector('table')).not.toBeNull()
    expect(montado.linhas).toHaveLength(2)
    for (const linha of montado.linhas) expect(declarada(linha), 'tabela do desktop').toBe(false)
  })
  it('C8 nenhum seletor de linha da tabela do desktop declara content-visibility e a lista de 120 mostra 50 linhas', async () => {
    for (const [, seletor] of regrasDeVisibilidade()) {
      for (const parte of seletor.split(',').map((s) => s.trim())) {
        expect(parte, parte).toMatch(/^\[data-(cartoes|linhas)\]/)
        expect(parte, parte).not.toMatch(/\btr\b|table-body\]\s*>/)
      }
    }
    servirFila(120)
    abrir('/univag/fila')
    await screen.findByText('ONE-1')
    expect(document.querySelectorAll('[data-slot=table-body] > [data-slot=table-row]')).toHaveLength(50)
    expect(document.querySelector('table')).not.toBeNull()
  })
  it('C39 o cabeçalho vazio de ações traz Ações em sr-only', async () => {
    const usuario = { id: 7, cpf: '12345678909', nome: 'Ana Souza', email: 'a@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ALUNO'], setores: [] }
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': () => [200, [usuario]], 'GET /api/admin/setores': () => [200, []] })
    abrir('/univag/usuarios')
    await screen.findByText('Ana Souza')
    const cabecalhos = [...document.querySelectorAll('thead th')]
    const acoes = cabecalhos[cabecalhos.length - 1]
    expect(acoes.innerHTML).toBe('<span class="sr-only">Ações</span>')
    for (const th of cabecalhos.slice(0, -1)) expect(th.querySelector('.sr-only')).toBeNull()
  })
})