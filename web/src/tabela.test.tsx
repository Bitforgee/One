import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
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
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
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
    expect(await screen.findByRole('dialog', { name: botao === 'Novo artigo' ? 'Novo artigo' : 'Enviar PDF' })).toBeInTheDocument()
  })

  it('C51 cada linha de dados, em tabela e em cartão, declara content-visibility e contain-intrinsic-size', async () => {
    const css = readFileSync('src/index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const regra = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, , corpo]) => /content-visibility:\s*auto/.test(corpo) && /contain-intrinsic-size:\s*auto 56px/.test(corpo))
    expect(regra).toBeDefined()
    const seletor = regra![1].trim()
    const dados = () =>
      api({
        'GET /api/auth/me': () => [200, atendente],
        'GET /api/chamados?escopo=fila': () => [200, fila(['ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO'])],
      })

    dados()
    abrir('/univag/fila')
    await screen.findByText('ONE-1')
    const linhasDeDados = [...document.querySelectorAll('[data-slot=table-body] > [data-slot=table-row]')]
    expect(linhasDeDados).toHaveLength(3)
    for (const linha of linhasDeDados) expect(linha.matches(seletor)).toBe(true)
    expect(document.querySelector('[data-slot=table-header] [data-slot=table-row]')!.matches(seletor)).toBe(false)
    cleanup()

    vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media.startsWith('(max-width: 767px)'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
    dados()
    abrir('/univag/fila')
    await screen.findByText('ONE-1')
    const cartoes = [...document.querySelectorAll('[data-slot=table-row]')]
    expect(cartoes).toHaveLength(3)
    for (const cartao of cartoes) expect(cartao.matches(seletor)).toBe(true)
  })
})