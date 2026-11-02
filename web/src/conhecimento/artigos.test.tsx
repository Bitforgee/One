import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('artigos', () => {
  it('novo artigo envia perguntas e links como listas', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/artigos': () => [200, []],
      'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Acadêmico', ativa: true }, { id: 4, nome: 'Antiga', ativa: false }]],
      'POST /api/admin/artigos': () => [201, {}],
    })
    abrir('/univag/artigos')

    expect(await screen.findByText('Nenhum item cadastrado.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha a categoria', 'Acadêmico'])
    await userEvent.type(dialogo.getByLabelText('Título'), 'Faltas não são abonadas')
    await userEvent.type(dialogo.getByLabelText(/Perguntas/), 'posso abonar falta?{enter}{enter}falta com atestado?')
    await userEvent.selectOptions(dialogo.getByLabelText('Categoria'), '3')
    await userEvent.type(dialogo.getByLabelText('Resposta'), 'Faltas não são abonadas.')
    await userEvent.type(dialogo.getByLabelText(/Links/), 'https://univag.edu.br/estatuto')
    await userEvent.click(dialogo.getByRole('button', { name: 'Salvar' }))

    await screen.findByText('Nenhum item cadastrado.')
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({
      titulo: 'Faltas não são abonadas',
      perguntas: ['posso abonar falta?', 'falta com atestado?'],
      categoriaId: 3,
      resposta: 'Faltas não são abonadas.',
      links: ['https://univag.edu.br/estatuto'],
      visivelDe: null,
      visivelAte: null,
    })
  })
})
