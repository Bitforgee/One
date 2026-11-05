import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me } from '../test/util'

// revisao-ux S5 (C42): um controle de período, destaques com número, rótulo e frase, e "Ver tabela".
afterEach(() => {
  vi.useRealTimers()
})

const dados = {
  semDados: false, alunosAtivos: 12, conversas: 5, taxaAutoatendimento: 0.456, taxaEscalonamento: 0.2, taxaAbandono: 0.1, taxaPerguntasSemArtigo: 0.1,
  chamadosAbertos: 4, chamadosResolvidos: 2, tempoPrimeiraRespostaHoras: 1.5, tempoResolucaoHoras: 3, roteamentoCorreto: 0.5, taxaReabertura: 0.1,
  principaisCategorias: { porConversas: [{ categoria: 'Boleto', total: 3 }], porChamados: [{ categoria: 'Matrícula', total: 1 }] }, indicadorPrincipal: 0.123,
}

function indicadores() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 10, 10, 0))
  api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ADMINISTRADOR'], matriculas: [] })], 'GET /api/indicadores?de=2026-11-01&ate=2026-11-10': () => [200, dados] })
  abrir('/univag/indicadores')
}

describe('um controle de período, destaques e Ver tabela', () => {
  // C42 (AC 32, P8)
  it('um controle de período, destaques e Ver tabela: o período', async () => {
    indicadores()
    const de = await screen.findByLabelText('De')
    expect([de.getAttribute('type'), screen.getByLabelText('Até').getAttribute('type')]).toEqual(['date', 'date'])
    expect(screen.queryByRole('button', { name: 'Escolher período no calendário' })).not.toBeInTheDocument()
    const form = de.closest('form')!
    expect(within(form).getAllByRole('button').map((b) => b.textContent)).toEqual(['Consultar'])
  })

  it('um controle de período, destaques e Ver tabela: os 4 destaques', async () => {
    indicadores()
    const principal = (await screen.findByText('Indicador principal')).closest('section') as HTMLElement
    const destaques = [principal, ...principal.nextElementSibling!.children] // 1 principal e 3 na faixa
    expect(destaques).toHaveLength(4)
    for (const cartao of destaques) {
      const [rotulo, numero, frase] = [...cartao.querySelectorAll('div')].filter((d) => d.children.length === 0).map((d) => d.textContent!)
      expect(numero, `número de ${rotulo}`).toMatch(/\d/)
      expect(rotulo.length, `rótulo ${rotulo}`).toBeLessThanOrEqual(24)
      expect(frase.length, `frase de ${rotulo}`).toBeLessThanOrEqual(70)
      expect(frase, `frase de ${rotulo}`).toMatch(/\.$/)
    }
  })

  it.each(['Categorias por conversas', 'Categorias por chamados'])('um controle de período, destaques e Ver tabela: a tabela de %s já vem à vista', async (titulo) => {
    indicadores()
    const cartao = (await screen.findByText(titulo)).closest('section') as HTMLElement
    expect(within(cartao).queryByRole('button', { name: 'Ver tabela' })).not.toBeInTheDocument()
    expect(within(cartao).getByRole('table')).toBeInTheDocument()
  })
})
