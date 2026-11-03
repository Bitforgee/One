import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

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

  it('importação concluída mostra o total e fecha a confirmação', async () => {
    const chamadas = api({ 'GET /api/auth/me': () => [200, admin], 'POST /api/admin/matriculas/importacao': () => [200, { criados: 2, atualizados: 1 }] })
    abrir('/univag/matriculas')
    expect(await screen.findByRole('button', { name: 'Importar' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.upload(screen.getByLabelText('Arquivo CSV'), new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Importar alunos.csv?')).toBeInTheDocument()
    await userEvent.click(d.getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))
    expect(await screen.findByText('Importação concluída: 2 matrículas criadas e 1 atualizadas.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('erro sem lista de linhas mostra só o detail', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'POST /api/admin/matriculas/importacao': () => [413, { status: 413, detail: 'O arquivo passa de 5 MB.' }] })
    abrir('/univag/matriculas')
    await userEvent.upload(await screen.findByLabelText('Arquivo CSV'), new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('O arquivo passa de 5 MB.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('erro sem corpo mostra a mensagem padrão', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'POST /api/admin/matriculas/importacao': () => [502, undefined] })
    abrir('/univag/matriculas')
    await userEvent.upload(await screen.findByLabelText('Arquivo CSV'), new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a requisição.')
  })

  // C84 (AC 61, door 16)
  it('tabela de erros com Linha e Motivo', async () => {
    api({
      'GET /api/auth/me': () => [200, admin],
      'POST /api/admin/matriculas/importacao': () => [400, { status: 400, detail: 'O arquivo tem linhas inválidas.', erros: [{ linha: 3, motivo: 'CPF inválido' }, { linha: 7, motivo: 'Semestre inválido' }] }],
    })
    abrir('/univag/matriculas')
    await userEvent.upload(await screen.findByLabelText('Arquivo CSV'), new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))
    const tabela = await screen.findByRole('table')
    expect(within(tabela).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Linha', 'Motivo'])
    const corpo = tabela.querySelectorAll('tbody tr')
    expect(corpo).toHaveLength(2)
    expect(Array.from(corpo).map((linha) => within(linha as HTMLElement).getAllByRole('cell').map((c) => c.textContent))).toEqual([
      ['3', 'CPF inválido'],
      ['7', 'Semestre inválido'],
    ])
  })

  // C85 (door 11)
  it('soltar CSV em Arquivo CSV importa o arquivo', async () => {
    const chamadas = api({ 'GET /api/auth/me': () => [200, admin], 'POST /api/admin/matriculas/importacao': () => [200, { criados: 1, atualizados: 0 }] })
    abrir('/univag/matriculas')
    const campo = await screen.findByLabelText('Arquivo CSV')
    expect(campo).toHaveAttribute('type', 'file')
    expect(campo).toHaveAttribute('accept', '.csv,text/csv')
    expect(campo).not.toHaveAttribute('aria-label')
    const arquivo = new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' })
    fireEvent.drop(campo.parentElement as HTMLElement, { dataTransfer: { files: [arquivo], items: [{ kind: 'file', type: arquivo.type, getAsFile: () => arquivo }], types: ['Files'] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Importar' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))
    await screen.findByText('Importação concluída: 1 matrículas criadas e 0 atualizadas.')
    const enviada = chamadas.find((c) => c.metodo === 'POST')!
    expect(enviada.url).toBe('/api/admin/matriculas/importacao')
    expect((enviada.corpo.arquivo as File).name).toBe('alunos.csv')
  })
})
