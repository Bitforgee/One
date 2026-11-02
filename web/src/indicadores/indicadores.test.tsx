import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('indicadores', () => {
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
})
