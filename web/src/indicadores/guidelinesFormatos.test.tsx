import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const Atual = 'GET /api/indicadores?de=2026-11-01&ate=2026-11-05'
const Anterior = 'GET /api/indicadores?de=2026-10-27&ate=2026-10-31'
const NB = '\u00a0'
const rotulos = [
  'Indicador principal', 'Alunos ativos', 'Conversas', 'Autoatendimento', 'Escalonamento', 'Abandono', 'Perguntas sem artigo',
  'Chamados abertos agora', 'Chamados resolvidos', 'Tempo até a 1ª resposta', 'Tempo de resolução', 'Roteamento correto', 'Reabertura',
]

const dados = (extra: object) => ({
  semDados: false, alunosAtivos: 1234, conversas: 5, taxaAutoatendimento: 0.5, taxaEscalonamento: 0.2, taxaAbandono: 0.005, taxaPerguntasSemArtigo: 0.1,
  chamadosAbertos: 4, chamadosResolvidos: 2, tempoPrimeiraRespostaHoras: 1.5, tempoResolucaoHoras: 12.5, roteamentoCorreto: 0.5, taxaReabertura: 0.1,
  principaisCategorias: { porConversas: [{ categoria: 'Boleto', total: 3 }], porChamados: null }, indicadorPrincipal: 0.7204, ...extra,
})

const valorDe = async (rotulo: string) => (await screen.findByText(rotulo, { selector: 'dt' })).nextElementSibling!.textContent

async function painel() {
  api({ 'GET /api/auth/me': () => [200, admin], [Atual]: () => [200, dados({})], [Anterior]: () => [200, dados({ indicadorPrincipal: 0.7 })] })
  abrir('/univag/indicadores')
  await screen.findByText('Indicador principal', { selector: 'dt' })
}

describe('formatos de Indicadores', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 5, 10, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('C34 percentual, horas e variação saem no formato pt-BR com vírgula decimal', async () => {
    await painel()
    expect(await valorDe('Abandono')).toBe(`0,5${NB}%`)
    expect(await valorDe('Autoatendimento')).toBe(`50${NB}%`)
    expect(await valorDe('Tempo de resolução')).toBe(`12,5${NB}h`)
    expect(await valorDe('Alunos ativos')).toBe(new Intl.NumberFormat('pt-BR').format(1234))
    expect(await valorDe('Alunos ativos')).toBe('1.234')
    await waitFor(() => expect(screen.getByText('▲ 2,0 pts')).toBeInTheDocument())
    expect(document.body.textContent).not.toMatch(/\d\.\d+\s?(%|h)/)
  })

  it('C40 as métricas são dl com um dt e um dd por rótulo e não sobra lista sem papel', async () => {
    await painel()
    const termos = [...document.querySelectorAll('main dl > dt, main dl > div > dt')]
    expect(termos.map((t) => t.textContent).sort()).toEqual([...rotulos].sort())
    for (const termo of termos) {
      expect(termo.parentElement!.closest('dl'), termo.textContent!).not.toBeNull()
      expect(termo.nextElementSibling?.tagName, termo.textContent!).toBe('DD')
    }
    const semPapel = [...document.querySelectorAll('main ul, main ol')].filter((l) => l.getAttribute('role') !== 'list')
    expect(semPapel).toHaveLength(0)
  })
})
