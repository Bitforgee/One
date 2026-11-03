import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estados } from '../test/textos'
import { abrir, api, me, type Rota } from '../test/util'

// Linhas 13, 14 e 15 de ## Screens (Usuários, Matrículas, Cadastros); nomes, CPF, números e arquivos vêm do fixture.
const Usuarios = [
  'Usuários', 'Novo', 'Desativado', 'CPF', '·', 'Aluno', 'Atendente', 'Administrador', 'Editar', 'Desativar', 'Nenhum item cadastrado.',
  'Novo usuário', 'Editar usuário', 'Nome', 'E-mail', 'Papéis', 'Setores do atendente', 'Senha temporária (opcional)',
  'Com senha temporária, a pessoa troca a senha no primeiro login. Sem ela, entra pelo primeiro acesso por e-mail.', 'Cancelar', 'Salvar',
  'A pessoa perde o acesso na próxima requisição. Conversas, chamados e histórico ficam guardados; os chamados em que ela era responsável voltam para a fila do setor.',
  'Voltar', 'Usuário salvo.', 'Usuário desativado.',
]
const Matriculas = [
  'Importar matrículas', 'Arquivo CSV em UTF-8, separado por ponto e vírgula, com o cabeçalho ', 'cpf;nome;email;matricula;curso;semestre;situacao',
  '. Alunos são atualizados pelo CPF e matrículas pelo número. Se alguma linha tiver erro, nada é importado.', 'Arquivo CSV', 'Importar',
  'Importação concluída: ', ' matrículas criadas e ', ' atualizadas.', 'Linha', 'Motivo',
  'Os dados de alunos e matrículas que já existem serão substituídos pelos do arquivo.', 'Voltar',
]
const Titulos = ['Setores', 'Categorias', 'Cursos', 'Regras', 'Respostas prontas']
const Cadastros = [
  'Cadastros', 'Novo', ...Titulos, ...Titulos.flatMap((t) => [`Novo: ${t}`, `Editar: ${t}`]),
  'triagem', 'inativo', 'padrão', 'inativa', 'coordenação:', 'setor', 'coordenação do curso', '·', 'Nenhum item cadastrado.',
  'Nome', 'Setor de triagem (exatamente um na instituição)', 'Ativo', 'Ativa', 'Setor de coordenação', 'Sem coordenação (vai para a triagem)',
  'Categoria', 'Destino', 'Setor fixo', 'Coordenação do curso da matrícula', 'Setor', 'Escolha o setor', 'Escolha a categoria', 'Título', 'Texto',
  'Cancelar', 'Salvar', 'Cadastro salvo.',
]

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const tela = () => screen.getByRole('main')
const avisos = () => screen.getByRole('region', { name: /^Notificações/ })

const setores = [
  { id: 1, nome: 'Triagem', triagem: true, ativo: true },
  { id: 2, nome: 'Financeiro', triagem: false, ativo: true },
  { id: 3, nome: 'Antigo', triagem: false, ativo: false },
]
const usuario = (id: number, nome: string, papeis: string[], ativo: boolean, setorIds: number[] = []) => ({
  id, cpf: `000.000.000-0${id}`, nome, email: `${nome.toLowerCase()}@univag.edu.br`, ativo, deveTrocarSenha: false, papeis, setores: setorIds,
})
const Fixture = ['Triagem', 'Financeiro', 'Antigo', 'Reserva', 'Notas', 'Velha', 'Não classificado', 'Boleto', 'ADS', 'Direito', 'Seu boleto está no Portal.', '—']

describe('textos', () => {
  it('textos Usuários', async () => {
    const t = estados(Usuarios)
    const fixture = ['Carla', 'Bia', 'Davi', ...Fixture, '000.000.000-01', '000.000.000-02', '000.000.000-03', 'carla@univag.edu.br', 'bia@univag.edu.br', 'davi@univag.edu.br']
    const leituras = (usuarios: unknown[]) => ({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': () => [200, usuarios], 'GET /api/admin/setores': () => [200, setores] }) as Record<string, Rota>

    // carregando: só o status "Carregando"
    api({ ...leituras([]), 'GET /api/admin/usuarios': () => new Promise(() => {}) })
    let montada = abrir('/univag/usuarios')
    expect(await within(await screen.findByRole('main')).findByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    t.conferir(tela())
    montada.unmount()

    // vazia
    api(leituras([]))
    montada = abrir('/univag/usuarios')
    await screen.findByText('Nenhum item cadastrado.')
    t.conferir(tela())
    montada.unmount()

    // lista com um desativado e os 3 papéis
    api({
      ...leituras([usuario(1, 'Carla', ['ATENDENTE', 'ADMINISTRADOR'], true, [2]), usuario(2, 'Bia', ['ALUNO'], false), usuario(3, 'Davi', ['ALUNO'], true)]),
      'PUT /api/admin/usuarios/1': () => [200, {}],
      'POST /api/admin/usuarios/3/desativar': () => [200, {}],
    })
    montada = abrir('/univag/usuarios')
    await screen.findByText('Carla')
    t.conferir(tela(), fixture)

    // "Editar usuário" com setores, e o toast
    await userEvent.click(within(tela()).getAllByRole('button', { name: 'Editar' })[0])
    const editar = await screen.findByRole('dialog')
    t.conferir(editar, fixture)
    await userEvent.click(within(editar).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Usuário salvo.'))
    t.conferir(avisos())

    // "Novo usuário"
    await userEvent.click(within(tela()).getByRole('button', { name: /Novo/ }))
    t.conferir(await screen.findByRole('dialog'), fixture)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    // "Desativar {nome}?" e o toast
    await userEvent.click(within(tela()).getAllByRole('button', { name: 'Desativar' })[1])
    t.conferir(await screen.findByRole('dialog'), ['Davi'])
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Usuário desativado.'))
    t.conferir(avisos())
    montada.unmount()

    t.todos()
  })

  it('textos Matrículas', async () => {
    const t = estados(Matriculas)
    let falha = true
    api({
      'GET /api/auth/me': () => [200, admin],
      'POST /api/admin/matriculas/importacao': () =>
        falha ? [400, { status: 400, detail: 'Há linhas inválidas.', erros: [{ linha: 3, motivo: 'CPF inválido' }] }] : [200, { criados: 2, atualizados: 1 }],
    })
    abrir('/univag/matriculas')

    // inicial
    await screen.findByLabelText('Arquivo CSV')
    t.conferir(tela())

    // confirmação "Importar {arquivo}?"
    await userEvent.upload(screen.getByLabelText('Arquivo CSV'), new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    t.conferir(await screen.findByRole('dialog'), ['alunos.csv'])

    // erros por linha
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Importar' }))
    await screen.findByRole('table')
    t.conferir(tela(), ['alunos.csv', 'Há linhas inválidas.', '3', 'CPF inválido'])

    // concluída
    falha = false
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))
    await screen.findByText(/Importação concluída/)
    t.conferir(tela(), ['alunos.csv', '2', '1'])

    t.todos()
  })

  it('textos Cadastros', async () => {
    const t = estados(Cadastros)
    const listas: Record<string, unknown[]> = {
      setores: [...setores, { id: 4, nome: 'Reserva', triagem: true, ativo: false }], // triagem e inativo juntos mostram o ponto médio
      categorias: [{ id: 7, nome: 'Notas', ativa: true, padrao: false }, { id: 8, nome: 'Não classificado', ativa: true, padrao: true }, { id: 9, nome: 'Velha', ativa: false, padrao: false }],
      cursos: [{ id: 4, nome: 'ADS', setorCoordenacaoId: 2 }, { id: 5, nome: 'Direito', setorCoordenacaoId: null }],
      regras: [{ id: 6, categoriaId: 7, destino: 'SETOR', setorId: 2 }, { id: 7, categoriaId: 9, destino: 'COORDENACAO_CURSO', setorId: null }],
      'respostas-prontas': [{ id: 8, setorId: 2, titulo: 'Boleto', texto: 'Seu boleto está no Portal.' }],
    }
    const leituras = (vazias: boolean) =>
      Object.fromEntries(Object.entries(listas).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, vazias ? [] : v]) as Rota]))

    // vazia, em cada aba
    api({ 'GET /api/auth/me': () => [200, admin], ...leituras(true) })
    let montada = abrir('/univag/cadastros')
    await screen.findByText('Nenhum item cadastrado.')
    t.conferir(tela())
    montada.unmount()

    // as 5 abas com lista, e os diálogos "Novo" e "Editar" de cada uma
    api({
      'GET /api/auth/me': () => [200, admin],
      ...leituras(false),
      'PUT /api/admin/setores/1': () => [200, {}],
    })
    montada = abrir('/univag/cadastros')
    for (const titulo of Titulos) {
      await userEvent.click(await screen.findByRole('tab', { name: titulo }))
      await screen.findByRole('tabpanel', { name: titulo })
      await waitFor(() => expect(within(screen.getByRole('tabpanel', { name: titulo })).getAllByRole('button').length).toBeGreaterThan(0))
      t.conferir(tela(), Fixture)

      await userEvent.click(within(screen.getByRole('tabpanel', { name: titulo })).getAllByRole('button')[0])
      t.conferir(await screen.findByRole('dialog', { name: `Editar: ${titulo}` }), Fixture)
      if (titulo === 'Setores') {
        await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }))
        await waitFor(() => expect(avisos()).toHaveTextContent('Cadastro salvo.'))
        t.conferir(avisos())
      } else await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      await userEvent.click(within(tela()).getByRole('button', { name: /Novo/ }))
      t.conferir(await screen.findByRole('dialog', { name: `Novo: ${titulo}` }), Fixture)
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
    montada.unmount()

    t.todos()
  })
})
