import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, chamado, me } from '../test/util'

const atendente = me({ papeis: ['ATENDENTE'], matriculas: [] })
const detalhe = chamado({ solicitante: 'Ana', eventos: [], acoes: ['responder', 'nota'] })
const titulo = () => document.querySelector('header h1')

async function abrirChamado() {
  api({ 'GET /api/auth/me': () => [200, atendente], 'GET /api/chamados/ONE-1': () => [200, detalhe], 'GET /api/chamados?escopo=fila': () => [200, []] })
  abrir('/univag/chamados/ONE-1')
  return screen.findByLabelText('Responder')
}

const sair = async () => userEvent.click(await screen.findByRole('link', { name: 'Fila' }))

describe('guarda da resposta do chamado', () => {
  it('C21 com texto não enviado, navegar abre Descartar resposta? e Continuar editando mantém o texto', async () => {
    const resposta = await abrirChamado()
    await userEvent.type(resposta, 'Segue o boleto.')
    await sair()

    expect(await screen.findByRole('dialog', { name: 'Descartar resposta?' })).toBeInTheDocument()
    expect(titulo()).toHaveTextContent('ONE-1')

    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(titulo()).toHaveTextContent('ONE-1')
    expect(screen.getByLabelText('Responder')).toHaveValue('Segue o boleto.')
  })

  it('C21 Descartar resposta deixa a navegação seguir', async () => {
    const resposta = await abrirChamado()
    await userEvent.type(resposta, 'Segue o boleto.')
    await sair()
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar resposta' }))
    await waitFor(() => expect(titulo()).toHaveTextContent('Fila'))
  })

  it('C21 sem texto, navega direto', async () => {
    await abrirChamado()
    await sair()
    await waitFor(() => expect(titulo()).toHaveTextContent('Fila'))
    expect(screen.queryByRole('dialog', { name: 'Descartar resposta?' })).not.toBeInTheDocument()
  })

  it('C21 só espaços não contam como texto não enviado', async () => {
    const resposta = await abrirChamado()
    await userEvent.type(resposta, '   ')
    await sair()
    await waitFor(() => expect(titulo()).toHaveTextContent('Fila'))
  })
})