import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from './test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const setores = [{ id: 1, nome: 'Triagem', triagem: true, ativo: true }, { id: 2, nome: 'Financeiro', triagem: false, ativo: true }]

describe('administração', () => {
  it('importação mostra as linhas com erro', async () => {
    api({
      'GET /api/auth/me': () => [200, admin],
      'POST /api/admin/matriculas/importacao': () => [400, { status: 400, detail: 'O arquivo tem linhas inválidas; nenhuma linha foi importada.', erros: [{ linha: 3, motivo: 'CPF inválido' }] }],
    })
    abrir('/univag/matriculas')

    await userEvent.upload(await screen.findByLabelText('Arquivo CSV'), new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))

    expect(await screen.findByText('O arquivo tem linhas inválidas; nenhuma linha foi importada.')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'CPF inválido' })).toBeInTheDocument()
  })

  it('novo atendente envia papéis e setores', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/usuarios': () => [200, []],
      'GET /api/admin/setores': () => [200, setores],
      'POST /api/admin/usuarios': () => [201, {}],
    })
    abrir('/univag/usuarios')

    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }))
    const d = within(await screen.findByRole('dialog'))
    await userEvent.type(d.getByLabelText('CPF'), '12345678909')
    await userEvent.type(d.getByLabelText('Nome'), 'Carla')
    await userEvent.type(d.getByLabelText('E-mail'), 'carla@univag.edu.br')
    await userEvent.click(d.getByLabelText('Financeiro'))
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(chamadas.some((c) => c.metodo === 'POST')).toBe(true))
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({ cpf: '12345678909', nome: 'Carla', email: 'carla@univag.edu.br', papeis: ['ATENDENTE'], setores: [2] })
  })

  it('regra por coordenação não envia setor', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/setores': () => [200, setores],
      'GET /api/admin/categorias': () => [200, [{ id: 7, nome: 'Notas', ativa: true, padrao: false }, { id: 8, nome: 'Não classificado', ativa: true, padrao: true }]],
      'GET /api/admin/cursos': () => [200, []],
      'GET /api/admin/regras': () => [200, []],
      'GET /api/admin/respostas-prontas': () => [200, []],
      'POST /api/admin/regras': () => [201, {}],
    })
    abrir('/univag/cadastros')

    await userEvent.click(await screen.findByRole('tab', { name: 'Regras' }))
    await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
    const d = within(await screen.findByRole('dialog'))
    expect(within(d.getByLabelText('Categoria')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha a categoria', 'Notas'])
    await userEvent.selectOptions(d.getByLabelText('Categoria'), '7')
    await userEvent.selectOptions(d.getByLabelText('Setor'), '2')
    await userEvent.selectOptions(d.getByLabelText('Destino'), 'COORDENACAO_CURSO')
    expect(d.queryByLabelText('Setor')).not.toBeInTheDocument()
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(chamadas.some((c) => c.metodo === 'POST')).toBe(true))
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({ categoriaId: 7, destino: 'COORDENACAO_CURSO', setorId: null })
  })
})
