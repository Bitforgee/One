import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me } from '../test/util'
import { rotulo } from './Grafico'

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
    const conversas = screen.getByText('Categorias por conversas').closest('[data-slot=card]') as HTMLElement
    expect(Array.from(conversas.querySelectorAll('tbody tr')).map((li) => li.textContent)).toEqual(['Boleto3'])
    const porChamados = screen.getByText('Categorias por chamados').closest('[data-slot=card]') as HTMLElement
    expect(Array.from(porChamados.querySelectorAll('tbody tr')).map((li) => li.textContent)).toEqual(['—'])
    expect(screen.queryByText('Sem dados no período')).not.toBeInTheDocument()
    expect(chamadas.filter((c) => c.url.startsWith('/api/indicadores'))).toHaveLength(1)
    // os rankings ficam um embaixo do outro no celular e lado a lado a partir do md
    expect(conversas.parentElement).toHaveClass('grid-cols-1', '@3xl/main:grid-cols-2')
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

  describe('rankings e calendário', () => {
    // 10/11/2026: a consulta inicial vai de 01/11 a 10/11
    const Inicial = 'GET /api/indicadores?de=2026-11-01&ate=2026-11-10'
    const dados = {
      semDados: false, alunosAtivos: 12, conversas: 5, taxaAutoatendimento: 0.5, taxaEscalonamento: 0.2, taxaAbandono: 0.1, taxaPerguntasSemArtigo: 0.1,
      chamadosAbertos: 4, chamadosResolvidos: 2, tempoPrimeiraRespostaHoras: 1.5, tempoResolucaoHoras: 3, roteamentoCorreto: 0.5, taxaReabertura: 0.1,
      principaisCategorias: { porConversas: [{ categoria: 'Boleto', total: 3 }, { categoria: 'Matrícula', total: 1 }], porChamados: [] }, indicadorPrincipal: 0.123,
    }

    function indicadores() {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 10, 10, 10, 0))
      const chamadas = api({ 'GET /api/auth/me': () => [200, admin], [Inicial]: () => [200, dados], 'GET /api/indicadores?de=2026-11-03&ate=2026-11-17': () => [200, dados] })
      abrir('/univag/indicadores')
      return chamadas
    }
    const cartao = async (titulo: string) => (await screen.findByText(titulo)).closest('[data-slot=card]') as HTMLElement
    const grafico = (c: HTMLElement) => c.querySelector('.recharts-responsive-container')

    // C46 (AC 34)
    it('ranking com gráfico acima da tabela', async () => {
      indicadores()
      const conversas = await cartao('Categorias por conversas')
      await waitFor(() => expect(grafico(conversas)).not.toBeNull())
      expect(grafico(conversas)!.closest('[aria-hidden="true"]')).not.toBeNull()
      const tabela = within(conversas).getByRole('table')
      expect(grafico(conversas)!.compareDocumentPosition(tabela) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    // C47 (AC 35): com o gráfico do outro ranking já carregado, o vazio continua sem gráfico
    it('ranking vazio sem gráfico', async () => {
      indicadores()
      await waitFor(async () => expect(grafico(await cartao('Categorias por conversas'))).not.toBeNull())
      const chamados = await cartao('Categorias por chamados')
      expect(within(chamados).getByText('—')).toBeInTheDocument()
      expect(grafico(chamados)).toBeNull()
    })

    // C51 (AC 54, door 16)
    it('rankings em tabela Categoria e Total', async () => {
      indicadores()
      for (const titulo of ['Categorias por conversas', 'Categorias por chamados']) {
        const tabela = within(await cartao(titulo)).getByRole('table')
        expect(within(tabela).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Categoria', 'Total'])
      }
      const linhas = within(within(await cartao('Categorias por conversas')).getByRole('table')).getAllByRole('row').slice(1)
      expect(linhas.map((l) => within(l).getAllByRole('cell').map((c) => c.textContent))).toEqual([
        ['Boleto', '3'],
        ['Matrícula', '1'],
      ])
    })

    const abrirCalendario = async () => {
      await userEvent.click(await screen.findByRole('button', { name: 'Escolher período no calendário' }))
      return screen.findByRole('dialog')
    }

    // C49 (AC 52, door 15)
    it('período pelo calendário só consulta no Consultar', async () => {
      const chamadas = indicadores()
      await screen.findByText('Indicador principal')
      const calendario = await abrirCalendario()
      await userEvent.click(within(calendario).getByRole('button', { name: /(^|\s)3 de novembro de 2026/ }))
      await userEvent.click(within(calendario).getByRole('button', { name: /(^|\s)17 de novembro de 2026/ }))
      expect(screen.getByLabelText('De')).toHaveValue('2026-11-03')
      expect(screen.getByLabelText('Até')).toHaveValue('2026-11-17')
      const consultas = () => chamadas.filter((c) => c.url.startsWith('/api/indicadores')).map((c) => c.url)
      expect(consultas()).toEqual(['/api/indicadores?de=2026-11-01&ate=2026-11-10'])
      await userEvent.keyboard('{Escape}')
      await userEvent.click(screen.getByRole('button', { name: 'Consultar' }))
      await waitFor(() => expect(consultas()).toEqual(['/api/indicadores?de=2026-11-01&ate=2026-11-10', '/api/indicadores?de=2026-11-03&ate=2026-11-17']))
    })

    // C50 (AC 53)
    it('calendário em pt-BR', async () => {
      indicadores()
      const calendario = await abrirCalendario()
      const grade = within(calendario).getByRole('grid')
      expect(calendario).toHaveTextContent('novembro')
      expect(calendario).toHaveTextContent('2026')
      // o thead dos dias da semana é aria-hidden no DayPicker: lido pelo DOM
      const dias = Array.from(grade.querySelectorAll('thead th')).map((h) => h.getAttribute('aria-label') ?? h.textContent)
      expect(dias).toHaveLength(7)
      ;['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].forEach((inicio, i) => expect(dias[i], inicio).toMatch(new RegExp(`^${inicio}`)))
    })
  })

  // redesign-institucional C20 (AC 20): bordas 17, 18 e 19 caracteres
  it('rótulo do gráfico', () => {
    expect(rotulo('a'.repeat(17))).toBe('a'.repeat(17))
    expect(rotulo('a'.repeat(18))).toBe('a'.repeat(18))
    expect(rotulo('b'.repeat(19))).toBe(`${'b'.repeat(17)}…`)
    expect(rotulo('Financeiro > Boletos e mensalidades')).toBe('Financeiro > Bole…')
  })
})

