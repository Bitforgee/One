import { screen, waitFor, within } from '@testing-library/react'
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

    expect(await screen.findByText('Sem atendimentos neste período.')).toBeInTheDocument()
    expect(screen.queryByText('Autoatendimento')).not.toBeInTheDocument()
  })

  // layout-painel C45 (AC 20)
  it('Consultar mostra o Spinner enquanto busca', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0))
    let responder!: () => void
    const vazio = {
      semDados: true, alunosAtivos: 0, conversas: 0, taxaAutoatendimento: null, taxaEscalonamento: null, taxaAbandono: null, taxaPerguntasSemArtigo: null,
      chamadosAbertos: 0, chamadosResolvidos: 0, tempoPrimeiraRespostaHoras: null, tempoResolucaoHoras: null, roteamentoCorreto: null, taxaReabertura: null,
      principaisCategorias: { porConversas: [], porChamados: [] }, indicadorPrincipal: null,
    }
    let vez = 0
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/indicadores?de=2026-11-01&ate=2026-11-15': () => (vez++ === 0 ? [200, vazio] : new Promise((resolve) => (responder = () => resolve([200, vazio])))),
    })
    abrir('/univag/indicadores')
    await screen.findByText('Sem atendimentos neste período.')
    const consultar = screen.getByRole('button', { name: 'Consultar' })
    expect(consultar).toBeEnabled()
    expect(within(consultar).queryByRole('status')).not.toBeInTheDocument()

    await userEvent.click(consultar)
    await waitFor(() => expect(consultar).toBeDisabled())
    expect(within(consultar).getByRole('status')).toBeInTheDocument()
    responder()
    await waitFor(() => expect(consultar).toBeEnabled())
    expect(within(consultar).queryByRole('status')).not.toBeInTheDocument()
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
    const conversas = screen.getByText('Categorias por conversas').closest('section') as HTMLElement
    expect(Array.from(conversas.querySelectorAll('tbody tr')).map((li) => li.textContent)).toEqual(['Boleto3'])
    const porChamados = screen.getByText('Categorias por chamados').closest('section') as HTMLElement
    expect(Array.from(porChamados.querySelectorAll('tbody tr')).map((li) => li.textContent)).toEqual(['—'])
    expect(screen.queryByText('Sem atendimentos neste período.')).not.toBeInTheDocument()
    expect(chamadas.filter((c) => c.url.startsWith('/api/indicadores'))).toHaveLength(2) // o período e o anterior (identidade-visual AC 12)
    // os rankings ficam um embaixo do outro no celular e lado a lado a partir de 896 px do main
    expect(conversas.parentElement).toHaveClass('grid-cols-1', '@4xl/main:grid-cols-2')
  })

  // layout-painel C16 (AC 16) e C18 (AC 18): os 13 rótulos e valores de hoje, os 4 de destaque primeiro com o rodapé
  const dadosCheios = {
    semDados: false, alunosAtivos: 12, conversas: 5, taxaAutoatendimento: 0.456, taxaEscalonamento: 0.2, taxaAbandono: 0.1, taxaPerguntasSemArtigo: 0.1,
    chamadosAbertos: 4, chamadosResolvidos: 2, tempoPrimeiraRespostaHoras: 1.5, tempoResolucaoHoras: 3, roteamentoCorreto: 0.5, taxaReabertura: 0.1,
    principaisCategorias: { porConversas: null, porChamados: null }, indicadorPrincipal: 0.123,
  }
  const folhas = (c: Element) => [...c.querySelectorAll('div')].filter((d) => d.children.length === 0).map((d) => d.textContent)
  const cartoesDe = (grade: Element) => Array.from(grade.children).map(folhas)

  async function painel() {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0))
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/indicadores?de=2026-11-01&ate=2026-11-15': () => [200, dadosCheios] })
    abrir('/univag/indicadores')
    return (await screen.findByText('Indicador principal')).closest('section') as HTMLElement
  }

  it('destaques de Indicadores', async () => {
    const principal = await painel()
    expect(folhas(principal)).toEqual(['Indicador principal', '12,3%', 'Resolvidas sem reabertura, sobre as conversas com desfecho.'])
    const destaques = principal.nextElementSibling!
    expect(cartoesDe(destaques)).toEqual([
      ['Chamados abertos agora', '4', 'Chamados não fechados neste momento.'],
      ['Autoatendimento', '45,6%', 'Resolvidas pelo assistente, sobre as conversas com desfecho.'],
      ['Tempo até a 1ª resposta', '1,5 h', 'Da abertura à primeira resposta pública.'],
    ])
    // vêm antes de qualquer outro cartão
    expect(principal.parentElement!.previousElementSibling?.tagName).toBe('FORM')
  })

  it('indicadores compactos na ordem', async () => {
    const compactos = (await painel()).nextElementSibling!.nextElementSibling!
    expect(Array.from(compactos.children).map((li) => [...li.children].map((c) => c.textContent))).toEqual([
      ['Alunos ativos', '12'],
      ['Conversas', '5'],
      ['Escalonamento', '20%'],
      ['Abandono', '10%'],
      ['Perguntas sem artigo', '10%'],
      ['Chamados resolvidos', '2'],
      ['Tempo de resolução', '3 h'],
      ['Roteamento correto', '50%'],
      ['Reabertura', '10%'],
    ])
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

  describe('rankings e período', () => {
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
    const cartao = async (titulo: string) => (await screen.findByText(titulo)).closest('section') as HTMLElement
    const barras = (c: HTMLElement) => c.querySelectorAll('[data-barra]')

    // C46 (AC 34), estrutura-visual door 4: a tabela já vem aberta, com uma barra por linha e sem gráfico
    it('ranking com barras na própria tabela', async () => {
      indicadores()
      const conversas = await cartao('Categorias por conversas')
      expect(within(conversas).getByRole('table')).toBeInTheDocument()
      expect(barras(conversas)).toHaveLength(2)
      expect(conversas.querySelector('.recharts-responsive-container')).toBeNull()
    })

    // C47 (AC 35): o ranking vazio mostra só o traço, sem barra
    it('ranking vazio sem barras', async () => {
      indicadores()
      await cartao('Categorias por conversas')
      const chamados = await cartao('Categorias por chamados')
      expect(within(chamados).getByText('—')).toBeInTheDocument()
      expect(barras(chamados)).toHaveLength(0)
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

    // C49 (AC 52, door 15; AC 32): o período vem dos campos de data e só consulta no Consultar
    it('período pelos campos de data só consulta no Consultar', async () => {
      const chamadas = indicadores()
      await screen.findByText('Indicador principal')
      for (const [rotulo, valor] of [['De', '2026-11-03'], ['Até', '2026-11-17']]) {
        await userEvent.clear(screen.getByLabelText(rotulo))
        await userEvent.type(screen.getByLabelText(rotulo), valor)
      }
      const consultas = () => chamadas.filter((c) => c.url.startsWith('/api/indicadores')).map((c) => c.url)
      expect(consultas()).toEqual(['/api/indicadores?de=2026-11-01&ate=2026-11-10', '/api/indicadores?de=2026-10-22&ate=2026-10-31'])
      await userEvent.click(screen.getByRole('button', { name: 'Consultar' }))
      await waitFor(() =>
        expect(consultas()).toEqual([
          '/api/indicadores?de=2026-11-01&ate=2026-11-10',
          '/api/indicadores?de=2026-10-22&ate=2026-10-31',
          '/api/indicadores?de=2026-11-03&ate=2026-11-17',
          '/api/indicadores?de=2026-10-19&ate=2026-11-02',
        ]),
      )
    })
  })
})
