import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { estados } from '../test/textos'
import { abrir, api, me, type Rota } from '../test/util'

// Linha 12 de ## Screens (Indicadores); os valores dos cartões e dos rankings vêm do fixture, como a tela os formata.
const Indicadores = [
  'Indicadores', 'De', 'Até', 'Consultar', 'Sem atendimentos neste período.',
  'Indicador principal', 'Alunos ativos', 'Conversas', 'Autoatendimento', 'Escalonamento', 'Abandono', 'Perguntas sem artigo',
  'Chamados abertos agora', 'Chamados resolvidos', 'Tempo até a 1ª resposta', 'Tempo de resolução', 'Roteamento correto', 'Reabertura',
  '12,3%', '1,5 h', '—',
  'Categorias por conversas', 'Categorias por chamados', 'Categoria', 'Total', 'Boleto3',
  // os 4 rodapés dos destaques (*(novo)*)
  'Resolvidas sem reabertura, sobre as conversas com desfecho.', 'Chamados não fechados neste momento.', 'Resolvidas pelo assistente, sobre as conversas com desfecho.', 'Da abertura à primeira resposta pública.',
]

const Inicial = 'GET /api/indicadores?de=2026-11-01&ate=2026-11-10'
const base = {
  semDados: false, alunosAtivos: null, conversas: null, taxaAutoatendimento: null, taxaEscalonamento: null, taxaAbandono: null, taxaPerguntasSemArtigo: null,
  chamadosAbertos: 0, chamadosResolvidos: 0, tempoPrimeiraRespostaHoras: 1.5, tempoResolucaoHoras: null, roteamentoCorreto: null, taxaReabertura: null,
  principaisCategorias: { porConversas: [{ categoria: 'Boleto', total: 3 }], porChamados: [] }, indicadorPrincipal: 0.123,
}
const tela = () => screen.getByRole('main')

function indicadores(rota: Rota) {
  api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ADMINISTRADOR'], matriculas: [] })], [Inicial]: rota })
  return abrir('/univag/indicadores')
}

describe('textos', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 10, 10, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('textos Indicadores', async () => {
    const t = estados(Indicadores)

    // sem dados
    let montada = indicadores(() => [200, { ...base, semDados: true }])
    await screen.findByText('Sem atendimentos neste período.')
    t.conferir(tela())
    montada.unmount()

    // com dados e um ranking vazio; os números 0 são os de chamados abertos e resolvidos
    montada = indicadores(() => [200, base])
    await screen.findByText('Indicador principal')
    t.conferir(tela(), ['0'])

    montada.unmount()

    // erro de leitura (5xx): o bloco com Tentar de novo
    montada = indicadores(() => [500, { status: 500, detail: 'Falha ao calcular.' }])
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os indicadores. Verifique sua conexão.')
    t.conferir(tela(), ['Não foi possível carregar os indicadores. Verifique sua conexão.', 'Tentar de novo'])
    montada.unmount()

    t.todos()
  })
})
