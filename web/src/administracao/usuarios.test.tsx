import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const setores = [
  { id: 1, nome: 'Triagem', triagem: true, ativo: true },
  { id: 2, nome: 'Financeiro', triagem: false, ativo: true },
  { id: 3, nome: 'Antigo', triagem: false, ativo: false },
]
const carla = { id: 1, cpf: '123.456.789-09', nome: 'Carla', email: 'carla@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ATENDENTE'], setores: [2] }
const bia = { id: 2, cpf: '987.654.321-00', nome: 'Bia', email: 'bia@univag.edu.br', ativo: false, deveTrocarSenha: false, papeis: ['ALUNO'], setores: [] }

function usuarios(rotas: Record<string, Rota> = {}) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': () => [200, [carla, bia]], 'GET /api/admin/setores': () => [200, setores], ...rotas })
  abrir('/univag/usuarios')
  return chamadas
}

const item = async (nome: string) => (await screen.findByText(nome)).closest('[data-slot=card]') as HTMLElement
const posts = (chamadas: { metodo: string; url: string; corpo: any }[]) => chamadas.filter((c) => c.metodo !== 'GET').map((c) => [c.metodo, c.url, c.corpo])

describe('usuários', () => {
  it('lista papéis, setores e o selo de desativado', async () => {
    usuarios()
    const ativa = await item('Carla')
    expect(ativa).toHaveTextContent('CPF 123.456.789-09 · carla@univag.edu.br')
    expect(ativa).toHaveTextContent('Atendente · Financeiro')
    expect(within(ativa).queryByText('Desativado')).not.toBeInTheDocument()
    expect(within(ativa).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    const inativa = await item('Bia')
    expect(within(inativa).getByText('Desativado')).toBeInTheDocument()
    expect(inativa.querySelectorAll('.text-sm')[1]).toHaveTextContent(/^Aluno$/)
    expect(within(inativa).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('Nenhum item cadastrado.')).not.toBeInTheDocument()
  })

  it('carregando mostra o Spinner', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': () => new Promise(() => {}), 'GET /api/admin/setores': () => [200, setores] })
    abrir('/univag/usuarios')
    expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument()
  })

  it('editar troca papéis, setores e a senha temporária', async () => {
    const chamadas = usuarios({ 'PUT /api/admin/usuarios/1': () => [200, {}] })
    await userEvent.click(within(await item('Carla')).getByRole('button', { name: 'Editar' }))
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Editar usuário')).toBeInTheDocument()
    expect(d.getByLabelText('CPF')).toHaveValue('123.456.789-09')
    expect(d.getByLabelText('Nome')).toHaveValue('Carla')
    expect(d.getByLabelText('E-mail')).toHaveValue('carla@univag.edu.br')
    expect(d.getByLabelText('Atendente')).toBeChecked()
    expect(d.getByLabelText('Administrador')).not.toBeChecked()
    expect(d.getByLabelText('Financeiro')).toBeChecked()
    expect(d.getByLabelText('Triagem')).not.toBeChecked()
    expect(d.queryByLabelText('Antigo')).not.toBeInTheDocument()
    await userEvent.click(d.getByLabelText('Financeiro'))
    await userEvent.click(d.getByLabelText('Triagem'))
    await userEvent.click(d.getByLabelText('Administrador'))
    await userEvent.type(d.getByLabelText(/Senha temporária/), 'temporaria-123')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts(chamadas)).toEqual([
      ['PUT', '/api/admin/usuarios/1', { cpf: '123.456.789-09', nome: 'Carla', email: 'carla@univag.edu.br', papeis: ['ATENDENTE', 'ADMINISTRADOR'], setores: [1], senhaTemporaria: 'temporaria-123' }],
    ])
  })

  it('sem o papel de atendente, os setores somem', async () => {
    usuarios()
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }))
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Novo usuário')).toBeInTheDocument()
    expect(d.getByText('Setores do atendente')).toBeInTheDocument()
    await userEvent.click(d.getByLabelText('Atendente'))
    expect(d.queryByText('Setores do atendente')).not.toBeInTheDocument()
  })

  it('desativar pede confirmação', async () => {
    const chamadas = usuarios({ 'POST /api/admin/usuarios/1/desativar': () => [200, {}] })
    await userEvent.click(within(await item('Carla')).getByRole('button', { name: 'Desativar' }))
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Desativar Carla?')).toBeInTheDocument()
    await userEvent.click(d.getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts(chamadas)).toEqual([])
    await userEvent.click(within(await item('Carla')).getByRole('button', { name: 'Desativar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(posts(chamadas)).toEqual([['POST', '/api/admin/usuarios/1/desativar', {}]]))
  })

  // C81 (AC 44, door 13)
  it('toasts de usuário só no sucesso', async () => {
    await new Promise((r) => setTimeout(r, 50)) // toast atrasado de um teste anterior (o Sonner é um singleton)
    let tentativa = 0
    usuarios({
      'PUT /api/admin/usuarios/1': () => (++tentativa === 1 ? [422, { status: 422, detail: 'CPF repetido.' }] : [200, {}]),
      'POST /api/admin/usuarios/1/desativar': () => [200, {}],
    })
    const avisos = () => screen.getByRole('region', { name: /^Notificações/ })
    await userEvent.click(within(await item('Carla')).getByRole('button', { name: 'Editar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Salvar' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('CPF repetido.')
    expect(avisos()).not.toHaveTextContent('Usuário salvo.')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Usuário salvo.'))
    await userEvent.click(within(await item('Carla')).getByRole('button', { name: 'Desativar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Usuário desativado.'))
  })
})
