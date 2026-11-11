import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { abrir, api, chamado, instituicao, me } from '../test/util'

const celular = () =>
  vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media.startsWith('(max-width: 767px)'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))

const rotas = (papeis: string[]) => ({
  'GET /api/auth/me': () => [200, me({ papeis })] as [number, unknown],
  'GET /api/instituicoes/univag': () => [200, instituicao()] as [number, unknown],
  'GET /api/chamados/ONE-1': () => [200, chamado()] as [number, unknown],
})
const titulo = () => document.querySelector('header h1')

describe('detalhe do chamado no celular', () => {
  it.each([[['ALUNO']], [['ATENDENTE']]])('Voltar vem antes do título (%j)', async (papeis) => {
    celular()
    api(rotas(papeis))
    abrir('/univag/chamados/ONE-1')
    const voltar = await screen.findByRole('button', { name: 'Voltar' })
    expect(voltar.closest('header')).not.toBeNull()
    expect(voltar.compareDocumentPosition(titulo()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(titulo()).toHaveTextContent('ONE-1')
  })

  it('Voltar volta pela lista de onde o chamado foi aberto', async () => {
    celular()
    api(rotas(['ATENDENTE']))
    const roteador = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: ['/univag/fila', '/univag/chamados/ONE-1'], initialIndex: 1 })
    render(<RouterProvider router={roteador} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(titulo()).toHaveTextContent('Fila'))
    expect(roteador.state.location.pathname).toBe('/univag/fila')
  })

  it.each([
    [['ATENDENTE'], 'Fila'],
    [['ALUNO'], 'Minhas solicitações'],
  ])('Voltar volta direto para a lista do papel (%j)', async (papeis, esperado) => {
    celular()
    api(rotas(papeis))
    abrir('/univag/chamados/ONE-1')
    await userEvent.click(await screen.findByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(titulo()).toHaveTextContent(esperado))
  })

  it.each([
    [['ATENDENTE'], false],
    [['ADMINISTRADOR'], false],
    [['ALUNO'], true],
  ])('barra de abas no detalhe (%j)', async (papeis, com) => {
    celular()
    api(rotas(papeis))
    abrir('/univag/chamados/ONE-1')
    await screen.findByRole('button', { name: 'Voltar' })
    if (com) expect(screen.getByRole('navigation', { name: 'Navegação' })).toBeInTheDocument()
    else expect(screen.queryByRole('navigation', { name: 'Navegação' })).toBeNull()
  })
})
