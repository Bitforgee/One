import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

async function entrar() {
  await userEvent.type(await screen.findByLabelText('CPF'), '123.456.789-09')
  await userEvent.type(screen.getByLabelText('Senha'), 'senha-boa-123')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

// tempo-real-signalr C42 (AC 24): a conexão acompanha a sessão; a conexão é a falsa do setup.ts.
describe('tempo real: sessão', () => {
  it('sair encerra a conexão e entrar abre uma nova', async () => {
    api({
      'GET /api/instituicoes/univag': () => [200, { nome: 'Univag' }],
      'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })],
      'GET /api/chamados?escopo=fila': () => [200, []],
      'POST /api/auth/logout': () => [204, undefined],
      'POST /api/auth/login': () => [200, { id: 1, nome: 'Ana', papeis: ['ATENDENTE'], deveTrocarSenha: false, instituicao: { slug: 'univag', nome: 'Univag' } }],
    })
    abrir('/univag')
    await entrar()
    await screen.findByText('Nenhum chamado na fila dos seus setores.')
    const [primeira] = globalThis.conexoesFalsas
    expect(globalThis.conexoesFalsas).toHaveLength(1)
    expect(primeira.starts).toBe(1)
    expect(primeira.stops).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: /Ana/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Sair' }))
    await screen.findByLabelText('CPF')
    expect(primeira.stops).toBe(1)
    expect(globalThis.conexoesFalsas).toHaveLength(1)

    await entrar()
    await screen.findByText('Nenhum chamado na fila dos seus setores.')
    await waitFor(() => expect(globalThis.conexoesFalsas).toHaveLength(2))
    expect(globalThis.conexoesFalsas[1].starts).toBe(1)
    expect(primeira.starts).toBe(1)
  })
})
