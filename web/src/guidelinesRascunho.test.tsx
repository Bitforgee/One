import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { abrir, api, me } from './test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const carla = { id: 1, cpf: '123.456.789-09', nome: 'Carla', email: 'carla@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ATENDENTE'], setores: [] }

const celular = () => vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media.startsWith('(max-width: 767px)'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))

async function novoUsuario() {
  api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': () => [200, [carla]], 'GET /api/admin/setores': () => [200, []] })
  abrir('/univag/usuarios')
  await userEvent.click(await screen.findByRole('button', { name: 'Novo' }))
  return screen.findByLabelText('Nome')
}

const editorAberto = () => screen.queryAllByRole('dialog', { hidden: true }).find((d) => d.textContent?.startsWith('Novo usuário')) ?? null
const confirmacao = () => screen.queryByRole('dialog', { name: 'Descartar alterações?' })

const caminhos: [string, () => Promise<unknown>][] = [
  ['toque fora', () => userEvent.click(document.querySelector('[data-slot=dialog-overlay]')!)],
  ['Esc', () => userEvent.keyboard('{Escape}')],
  ['Cancelar', () => userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))],
]

describe('rascunho do Editor', () => {
  it.each(caminhos)('C16 sujo: %s abre a confirmação e o Editor continua aberto', async (_, fechar) => {
    const nome = await novoUsuario()
    await userEvent.type(nome, 'Dani')
    await fechar()
    const dialogo = await screen.findByRole('dialog', { name: 'Descartar alterações?' })
    expect(within(dialogo).getByRole('button', { name: 'Continuar editando' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Descartar' })).toBeInTheDocument()
    expect(editorAberto()).toBeInTheDocument()
    expect(nome).toHaveValue('Dani')
  })

  it('C16 no celular o toque fora do painel também pede a confirmação', async () => {
    celular()
    const nome = await novoUsuario()
    await userEvent.type(nome, 'Dani')
    await userEvent.click(document.querySelector('[data-slot=sheet-overlay]')!)
    expect(await screen.findByRole('dialog', { name: 'Descartar alterações?' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot=sheet-content]')).toBeInTheDocument()
  })

  it('C17 Continuar editando mantém o Editor com os valores, e Descartar fecha e zera', async () => {
    const nome = await novoUsuario()
    await userEvent.type(nome, 'Dani')
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByRole('button', { name: 'Continuar editando' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }))
    await waitFor(() => expect(confirmacao()).not.toBeInTheDocument())
    expect(screen.getByLabelText('Nome')).toHaveValue('Dani')

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(editorAberto()).not.toBeInTheDocument())
    expect(confirmacao()).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Novo' }))
    expect(await screen.findByLabelText('Nome')).toHaveValue('')
  })

  it.each(caminhos)('C18 limpo: %s fecha sem confirmação', async (_, fechar) => {
    await novoUsuario()
    await fechar()
    await waitFor(() => expect(editorAberto()).not.toBeInTheDocument())
    expect(confirmacao()).not.toBeInTheDocument()
  })

  it('C18 digitar e apagar de volta deixa o Editor limpo', async () => {
    const nome = await novoUsuario()
    await userEvent.type(nome, 'D')
    await userEvent.clear(nome)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(editorAberto()).not.toBeInTheDocument())
    expect(confirmacao()).not.toBeInTheDocument()
  })
})
