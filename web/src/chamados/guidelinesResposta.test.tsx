import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { api, chamado, me } from '../test/util'

const atendente = me({ papeis: ['ATENDENTE'], matriculas: [] })
const detalhe = chamado({ solicitante: 'Ana', eventos: [], acoes: ['responder', 'nota'] })

async function abrirChamado() {
  api({ 'GET /api/auth/me': () => [200, atendente], 'GET /api/chamados/ONE-1': () => [200, detalhe], 'GET /api/chamados?escopo=fila': () => [200, []] })
  const roteador = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: ['/univag/chamados/ONE-1'] })
  render(<RouterProvider router={roteador} />)
  const resposta = await screen.findByLabelText('Responder')
  return { roteador, resposta }
}

const sair = (roteador: ReturnType<typeof createMemoryRouter>) => act(() => void roteador.navigate('/univag/fila'))

describe('guarda da resposta do chamado', () => {
  it('C21 com texto não enviado, navegar abre Descartar resposta? e Continuar editando mantém o texto', async () => {
    const { roteador, resposta } = await abrirChamado()
    await userEvent.type(resposta, 'Segue o boleto.')
    await sair(roteador)

    const dialogo = await screen.findByRole('dialog', { name: 'Descartar resposta?' })
    expect(dialogo).toBeInTheDocument()
    expect(roteador.state.location.pathname).toBe('/univag/chamados/ONE-1')

    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(roteador.state.location.pathname).toBe('/univag/chamados/ONE-1')
    expect(screen.getByLabelText('Responder')).toHaveValue('Segue o boleto.')
  })

  it('C21 Descartar resposta deixa a navegação seguir', async () => {
    const { roteador, resposta } = await abrirChamado()
    await userEvent.type(resposta, 'Segue o boleto.')
    await sair(roteador)
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar resposta' }))
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/univag/fila'))
  })

  it('C21 sem texto, navega direto', async () => {
    const { roteador } = await abrirChamado()
    await sair(roteador)
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/univag/fila'))
    expect(screen.queryByRole('dialog', { name: 'Descartar resposta?' })).not.toBeInTheDocument()
  })

  it('C21 só espaços não contam como texto não enviado', async () => {
    const { roteador, resposta } = await abrirChamado()
    await userEvent.type(resposta, '   ')
    await sair(roteador)
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/univag/fila'))
  })
})
