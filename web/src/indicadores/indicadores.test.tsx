import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('indicadores', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('Sem dados no período', async () => {
    const vazio = {
      semDados: true, alunosAtivos: 0, conversas: 0, taxaAutoatendimento: null, taxaEscalonamento: null, taxaAbandono: null, taxaPerguntasSemArtigo: null,
      chamadosAbertos: 0, chamadosResolvidos: 0, tempoPrimeiraRespostaHoras: null, tempoResolucaoHoras: null, roteamentoCorreto: null, taxaReabertura: null,
      principaisCategorias: { porConversas: [], porChamados: [] }, indicadorPrincipal: null,
    }
    // a consulta inicial (mês corrente) não está no mapa e responde 404; a do período escolhido devolve o vazio
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/indicadores?de=2026-10-01&ate=2026-10-31': () => [200, vazio] })
    abrir('/univag/indicadores')
    await userEvent.clear(await screen.findByLabelText('De'))
    await userEvent.type(screen.getByLabelText('De'), '2026-10-01')
    await userEvent.clear(screen.getByLabelText('Até'))
    await userEvent.type(screen.getByLabelText('Até'), '2026-10-31')
    await userEvent.click(screen.getByRole('button', { name: 'Consultar' }))

    expect(await screen.findByText('Sem dados no período')).toBeInTheDocument()
    expect(screen.queryByText('Autoatendimento')).not.toBeInTheDocument()
  })

  it('cartões formatam taxa, horas e número, e o ranking vazio mostra traço', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0))
    const dados = {
      semDados: false, alunosAtivos: 12, conversas: null, taxaAutoatendimento: 0.456, taxaEscalonamento: null, taxaAbandono: 0, taxaPerguntasSemArtigo: 1,
      chamadosAbertos: 4, chamadosResolvidos: 0, tempoPrimeiraRespostaHoras: 1.5, tempoResolucaoHoras: null, roteamentoCorreto: 0.5, taxaReabertura: null,
      principaisCategorias: { porConversas: [{ categoria: 'Boleto', total: 3 }], porChamados: [] }, indicadorPrincipal: 0.123,
    }
    const chamadas = api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/indicadores?de=2026-11-01&ate=2026-11-15': () => [200, dados] })
    abrir('/univag/indicadores')

    const cartao = async (rotulo: string) => (await screen.findByText(rotulo)).parentElement!.textContent
    expect(await cartao('Indicador principal')).toBe('Indicador principal12,3%')
    expect(await cartao('Alunos ativos')).toBe('Alunos ativos12')
    expect(await cartao('Conversas')).toBe('Conversas—')
    expect(await cartao('Autoatendimento')).toBe('Autoatendimento45,6%')
    expect(await cartao('Escalonamento')).toBe('Escalonamento—')
    expect(await cartao('Abandono')).toBe('Abandono0%')
    expect(await cartao('Perguntas sem artigo')).toBe('Perguntas sem artigo100%')
    expect(await cartao('Chamados abertos agora')).toBe('Chamados abertos agora4')
    expect(await cartao('Chamados resolvidos')).toBe('Chamados resolvidos0')
    expect(await cartao('Tempo até a 1ª resposta')).toBe('Tempo até a 1ª resposta1,5 h')
    expect(await cartao('Tempo de resolução')).toBe('Tempo de resolução—')
    expect(await cartao('Roteamento correto')).toBe('Roteamento correto50%')
    expect(await cartao('Reabertura')).toBe('Reabertura—')
    const conversas = screen.getByText('Categorias por conversas').closest('.card') as HTMLElement
    expect(Array.from(conversas.querySelectorAll('.list-group-item')).map((li) => li.textContent)).toEqual(['Boleto3'])
    const porChamados = screen.getByText('Categorias por chamados').closest('.card') as HTMLElement
    expect(Array.from(porChamados.querySelectorAll('.list-group-item')).map((li) => li.textContent)).toEqual(['—'])
    expect(screen.queryByText('Sem dados no período')).not.toBeInTheDocument()
    expect(chamadas.filter((c) => c.url.startsWith('/api/indicadores'))).toHaveLength(1)
    // os rankings ficam um embaixo do outro no celular e lado a lado a partir do md
    expect(conversas.closest('.row')).toHaveClass('row-cols-1', 'row-cols-md-2')
  })

  it('ranking que a API não manda não aparece', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 9, 10, 0))
    const dados = {
      semDados: false, alunosAtivos: null, conversas: null, taxaAutoatendimento: null, taxaEscalonamento: null, taxaAbandono: null, taxaPerguntasSemArtigo: null,
      chamadosAbertos: 0, chamadosResolvidos: 0, tempoPrimeiraRespostaHoras: null, tempoResolucaoHoras: null, roteamentoCorreto: null, taxaReabertura: null,
      principaisCategorias: { porConversas: null, porChamados: [{ categoria: 'Boleto', total: 1 }] }, indicadorPrincipal: null,
    }
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/indicadores?de=2026-01-01&ate=2026-01-09': () => [200, dados] })
    abrir('/univag/indicadores')
    expect(await screen.findByText('Categorias por chamados')).toBeInTheDocument()
    expect(screen.queryByText('Categorias por conversas')).not.toBeInTheDocument()
  })
})
