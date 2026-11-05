import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

// identidade-visual S4 (AC 12, AC 13, AC 18): a comparação com o período anterior; o arranjo é do Playwright (e2e/identidade.spec.ts).
const base = {
  semDados: false, alunosAtivos: 12, conversas: 5, taxaAutoatendimento: 0.5, taxaEscalonamento: 0.2, taxaAbandono: 0.1, taxaPerguntasSemArtigo: 0.1,
  chamadosAbertos: 4, chamadosResolvidos: 2, tempoPrimeiraRespostaHoras: 1.5, tempoResolucaoHoras: 3, roteamentoCorreto: 0.5, taxaReabertura: 0.1,
  principaisCategorias: { porConversas: null, porChamados: null }, indicadorPrincipal: 0.712,
}
const com = (principal: number | null, extra: object = {}) => ({ ...base, indicadorPrincipal: principal, ...extra })
const Atual = 'GET /api/indicadores?de=2026-11-01&ate=2026-11-05'
const Anterior = 'GET /api/indicadores?de=2026-10-27&ate=2026-10-31'
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const pausa = () => new Promise((r) => setTimeout(r, 30))
const leituras = (chamadas: { url: string }[]) => chamadas.filter((c) => c.url.startsWith('/api/indicadores')).map((c) => c.url)

describe('indicadores com período anterior', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 5, 10, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const abrirCom = (atual: object, anterior: Rota | undefined, extra: Record<string, Rota> = {}) =>
    api({ 'GET /api/auth/me': () => [200, admin], [Atual]: () => [200, atual], ...(anterior ? { [Anterior]: anterior } : {}), ...extra })

  // C23 (AC 12)
  it('período anterior de mesmo tamanho', async () => {
    const consulta = async (de: string, ate: string) => {
      await userEvent.clear(screen.getByLabelText('De'))
      await userEvent.type(screen.getByLabelText('De'), de)
      await userEvent.clear(screen.getByLabelText('Até'))
      await userEvent.type(screen.getByLabelText('Até'), ate)
      await userEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    }
    const casos: [string, string, string, string][] = [
      ['2026-03-01', '2026-03-31', 'de=2026-01-29&ate=2026-02-28', 'de=2026-03-01&ate=2026-03-31'],
      ['2026-11-05', '2026-11-05', 'de=2026-11-04&ate=2026-11-04', 'de=2026-11-05&ate=2026-11-05'],
    ]
    const chamadas = abrirCom(com(0.712), () => [200, com(0.67)])
    abrir('/univag/indicadores')
    await screen.findByText('71,2%')
    await waitFor(() => expect(leituras(chamadas)).toEqual(['/api/indicadores?de=2026-11-01&ate=2026-11-05', '/api/indicadores?de=2026-10-27&ate=2026-10-31']))
    for (const [de, ate, anterior, atual] of casos) {
      const antes = leituras(chamadas).length
      await consulta(de, ate)
      await waitFor(() => expect(leituras(chamadas).slice(antes)).toEqual([`/api/indicadores?${atual}`, `/api/indicadores?${anterior}`]))
      await pausa()
      expect(leituras(chamadas).slice(antes), `${de} a ${ate}`).toHaveLength(2)
    }
  })

  // C24 (AC 12)
  it('variação contra o período anterior', async () => {
    const casos: [number, string][] = [[0.67, '▲ 4,2 pts'], [0.722, '▼ 1,0 pt'], [0.712, '= sem variação']]
    for (const [anterior, texto] of casos) {
      abrirCom(com(0.712), () => [200, com(anterior)])
      const { unmount } = abrir('/univag/indicadores')
      expect(await screen.findByText('71,2%')).toBeInTheDocument()
      expect(await screen.findByText(texto), texto).toBeInTheDocument()
      expect(screen.getByText('vs. período anterior')).toBeInTheDocument()
      unmount()
    }
  })

  // C25 (AC 13)
  it('sem variação quando o anterior falha ou não tem dados', async () => {
    const casos: [string, Rota][] = [
      ['500', () => [500, { status: 500, detail: 'Falha.' }]],
      ['semDados', () => [200, com(null, { semDados: true })]],
      ['indicadorPrincipal nulo', () => [200, com(null)]],
    ]
    for (const [rotulo, rota] of casos) {
      const chamadas = abrirCom(com(0.712), rota)
      const { unmount } = abrir('/univag/indicadores')
      expect(await screen.findByText('71,2%')).toBeInTheDocument()
      await waitFor(() => expect(leituras(chamadas)).toHaveLength(2))
      await pausa()
      for (const texto of [/▲/, /▼/, '= sem variação', 'vs. período anterior']) expect(screen.queryByText(texto), `${rotulo} ${texto}`).not.toBeInTheDocument()
      expect(screen.queryByRole('alert'), rotulo).not.toBeInTheDocument()
      unmount()
    }
    // controle: com o anterior em 0,670 a variação aparece
    abrirCom(com(0.712), () => [200, com(0.67)])
    abrir('/univag/indicadores')
    expect(await screen.findByText('▲ 4,2 pts')).toBeInTheDocument()
  })

  // C26 (AC 12, P5)
  it('arredondamento e plural da variação', async () => {
    const casos: [number, string][] = [[0.7121, '= sem variação'], [0.6933, '▲ 1,9 pt'], [0.6923, '▲ 2,0 pts']]
    for (const [anterior, texto] of casos) {
      abrirCom(com(0.7123), () => [200, com(anterior)])
      const { unmount } = abrir('/univag/indicadores')
      expect(await screen.findByText(texto), texto).toBeInTheDocument()
      unmount()
    }
  })

  // C35 (AC 18)
  it('Indicadores sem dados com ícone', async () => {
    abrirCom(com(null, { semDados: true }), undefined)
    abrir('/univag/indicadores')
    const frase = await screen.findByText('Sem atendimentos neste período.')
    const bloco = frase.parentElement!
    expect(bloco.querySelectorAll('svg')).toHaveLength(1)
    expect(bloco.querySelector('svg')).toHaveClass('lucide')
    expect(document.querySelector('svg[data-ilustracao]')).toBeNull()
    expect(bloco.querySelectorAll('button, a')).toHaveLength(0)
  })
})
