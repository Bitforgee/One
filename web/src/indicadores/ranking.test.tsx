import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me } from '../test/util'
import { Ranking } from './Indicadores'

// estrutura-visual S5 (door 4): o ranking é uma tabela com a barra desenhada em HTML, sem biblioteca de gráfico.
afterEach(() => {
  vi.useRealTimers()
})

describe('ranking', () => {
  it('ranking com total e barra proporcional', () => {
    const categorias = ['Financeiro > Boletos e mensalidades em atraso', 'Acadêmico > Notas', 'Secretaria > Declarações', 'Biblioteca']
    render(<Ranking titulo="Categorias por conversas" linhas={categorias.map((categoria, i) => ({ categoria, total: [50, 25, 5, 0][i] }))} />)
    const linhas = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(linhas).toHaveLength(4)
    expect(linhas.map((l) => within(l).getAllByRole('cell').map((c) => c.textContent))).toEqual([
      [categorias[0], '50'],
      [categorias[1], '25'],
      [categorias[2], '5'],
      [categorias[3], '0'],
    ])
    const barras = linhas.map((l) => l.querySelectorAll('[data-barra]'))
    expect(barras.map((b) => b.length)).toEqual([1, 1, 1, 1])
    expect(barras.map((b) => (b[0] as HTMLElement).style.width)).toEqual(['100%', '50%', '10%', '0%'])
  })

  const vazios = {
    semDados: false, alunosAtivos: null, conversas: null, taxaAutoatendimento: null, taxaEscalonamento: null, taxaAbandono: null, taxaPerguntasSemArtigo: null,
    chamadosAbertos: 0, chamadosResolvidos: 0, tempoPrimeiraRespostaHoras: null, tempoResolucaoHoras: null, roteamentoCorreto: null, taxaReabertura: null,
    indicadorPrincipal: null,
  }

  it('ranking vazio e ausente', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 9, 10, 0))
    const dados = { ...vazios, principaisCategorias: { porConversas: [], porChamados: null } }
    api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ADMINISTRADOR'], matriculas: [] })],
      'GET /api/indicadores?de=2026-01-01&ate=2026-01-09': () => [200, dados],
    })
    abrir('/univag/indicadores')
    const secao = (await screen.findByText('Categorias por conversas')).closest('section') as HTMLElement
    expect(within(secao).getByText('—')).toBeInTheDocument()
    expect(secao.querySelectorAll('[data-barra]')).toHaveLength(0)
    expect(screen.queryByText('Categorias por chamados')).not.toBeInTheDocument()
  })
})
