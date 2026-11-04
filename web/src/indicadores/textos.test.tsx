import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  'Escolher período no calendário',
  // os 4 rodapés dos destaques (*(novo)*)
  'Resolvidas sem reabertura, sobre as conversas com desfecho', 'Chamados não fechados neste momento', 'Resolvidas pelo assistente, sobre as conversas com desfecho', 'Da abertura à primeira resposta pública',
]
// o calendário do ptBR: título do mês, dias da semana e números dos dias (*(novo, do ptBR)*)
const Calendario = ['novembro 2026', 'dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', ...Array.from({ length: 31 }, (_, i) => String(i + 1))]

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

    // calendário aberto
    await userEvent.click(screen.getByRole('button', { name: 'Escolher período no calendário' }))
    t.conferir(await screen.findByRole('dialog'), Calendario)
    montada.unmount()

    // erro: o detail da API
    montada = indicadores(() => [500, { status: 500, detail: 'Falha ao calcular.' }])
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao calcular.')
    t.conferir(tela(), ['Falha ao calcular.'])
    montada.unmount()

    t.todos()
  })
})
