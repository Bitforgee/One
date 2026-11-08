import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me } from '../test/util'

const sessaoAusente = () => {
  throw new TypeError('Failed to fetch')
}

// mobile-m0 AC 4 e 6: sem rede a sessão não vira "sem login"; só o 401 manda para o login.
describe('sessão sem rede', () => {
  it('sem rede mostra a conexão e não vai para o login', async () => {
    api({ 'GET /api/auth/me': sessaoAusente, 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/solicitacoes')
    expect(await screen.findByText(/Verifique sua conexão/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument()
    expect(screen.queryByText('Instituição não encontrada.')).not.toBeInTheDocument()
  })

  it('401 vai para o login', async () => {
    api({ 'GET /api/auth/me': () => [401, { status: 401, detail: 'Entre para continuar.' }], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/solicitacoes')
    expect(await screen.findByLabelText('CPF')).toBeInTheDocument()
  })

  it('tentar de novo repete a leitura da sessão', async () => {
    let chamadas = 0
    api({
      'GET /api/auth/me': () => {
        if (chamadas++ === 0) return sessaoAusente()
        return [200, me()]
      },
      'GET /api/instituicoes/univag': () => [200, instituicao()],
      'GET /api/chamados': () => [200, []],
    })
    abrir('/univag/solicitacoes')
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByText(/Verifique sua conexão/)).not.toBeInTheDocument()
    expect(chamadas).toBe(2)
  })
})
