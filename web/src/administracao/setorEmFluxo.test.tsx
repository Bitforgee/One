import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const vazias = ['categorias', 'cursos', 'fluxos', 'respostas-prontas'].map((k) => [`GET /api/admin/${k}`, () => [200, []]] as const)

describe('setor em fluxo publicado', () => {
  it('409 do setor aparece no editor', async () => {
    const detail = 'O setor é usado em fluxo publicado (categoria: Boletos). Publique o fluxo sem ele antes de desativar.'
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/setores': () => [200, [{ id: 1, nome: 'Financeiro', triagem: false, ativo: true }]],
      ...Object.fromEntries(vazias),
      'PUT /api/admin/setores/1': () => [409, { status: 409, detail }],
    })
    abrir('/univag/cadastros')

    await userEvent.click(await screen.findByRole('button', { name: 'Financeiro' }))
    const editor = within(await screen.findByRole('dialog'))
    await userEvent.click(editor.getByLabelText('Ativo'))
    await userEvent.click(editor.getByRole('button', { name: 'Salvar setor' }))

    expect(await within(screen.getByRole('dialog')).findByText(detail)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
