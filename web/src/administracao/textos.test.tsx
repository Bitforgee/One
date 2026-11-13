import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estados } from '../test/textos'
import { abrir, api, escolher, me, type Rota } from '../test/util'

const Usuarios = [
  'Usuários', 'Novo', 'Desativado', 'CPF', 'Situação', '·', 'Aluno', 'Atendente', 'Administrador', 'Editar', 'Desativar', 'Nenhum usuário', 'Cadastre a equipe ou importe as matrículas.',
  'Novo usuário', 'Editar usuário', 'Nome', 'E-mail', 'Papéis', 'Setores do atendente', 'Senha temporária (opcional)',
  'Com senha temporária, a pessoa troca a senha no primeiro login. Sem ela, entra pelo primeiro acesso por e-mail.', 'Cancelar', 'Salvar',
  'A pessoa perde o acesso na próxima requisição. Conversas, chamados e histórico ficam guardados; os chamados em que ela era responsável voltam para a fila do setor.',
  'Voltar', 'Usuário salvo.', 'Usuário desativado.',
]
const Matriculas = [
  'Matrículas', 'Baixe o modelo', 'Baixar modelo (CSV)', 'Preencha uma linha por aluno', 'Envie o arquivo', 'Arquivo CSV em UTF-8, separado por ponto e vírgula, com o cabeçalho ', 'cpf;nome;email;matricula;curso;semestre;situacao',
  '. Alunos são atualizados pelo CPF e matrículas pelo número. Se alguma linha tiver erro, nada é importado.', 'Arquivo CSV', 'Importar',
  'Importação concluída: ', ' matrículas criadas e ', ' atualizada.', 'Linha',
  'Os dados de alunos e matrículas que já existem serão substituídos pelos do arquivo.', 'Voltar',
]
const Titulos = ['Setores', 'Categorias', 'Cursos', 'Fluxos', 'Respostas prontas']
const Cadastros = [
  'Cadastros', 'Novo setor', 'Nova categoria', 'Novo curso', 'Novo fluxo', 'Nova resposta pronta', 'Detalhe',
  'Quem atende os chamados. Cada setor tem a sua fila.', 'Os assuntos dos chamados. Cada categoria pode ter um fluxo.', 'Os cursos da instituição e o setor que coordena cada um.', 'O caminho que o chamado percorre, etapa por etapa, até alguém responder.', 'Textos prontos que o atendente insere ao responder.',
  'Publicado v1', ...Titulos, ...Titulos.flatMap((t) => [`Novo: ${t}`, ...(t === 'Fluxos' ? [] : [`Editar: ${t}`])]),
  'Triagem', 'Inativo', 'Padrão', 'Inativa', 'Coordenação:', 'Setor', 'Todos os cursos', ...Array.from({ length: 12 }, (_, i) => `${i + 1}º semestre`), 'Liderança do semestre', 'Coordenação do curso', '(48 h)', 'Nada cadastrado', 'Nenhum item cadastrado.', 'Nenhum fluxo', 'Sem fluxo, os chamados vão para a Triagem.',
  'Nome', 'Setor de triagem (exatamente um na instituição)', 'Ativo', 'Liderança de semestre', 'Ativa', 'Setor de coordenação', 'Sem coordenação (vai para a triagem)',
  'Categoria', 'Abrangência', 'Um curso', 'Um semestre de um curso', 'Escolha a categoria', 'Escolha o setor', 'Título', 'Texto',
  'Etapa 1', 'Setor fixo', 'Lista', 'Canvas', 'Adicionar etapa', 'Simular um aluno', 'Escolha o curso', 'Escolha o semestre', 'Simular', 'Publicar', 'Descartar rascunho', 'Salvar rascunho', 'Mais',
  'Cancelar', 'Salvar', 'Cadastro salvo.', 'Voltar',
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

    api({ ...leituras([]), 'GET /api/admin/usuarios': () => new Promise(() => {}) })
    let montada = abrir('/univag/usuarios')
    await screen.findByRole('main')
    await waitFor(() => expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3))
    t.conferir(tela())
    montada.unmount()

    api(leituras([]))
    montada = abrir('/univag/usuarios')
    await screen.findByText('Cadastre a equipe ou importe as matrículas.')
    t.conferir(tela())
    montada.unmount()

    api({
      ...leituras([usuario(1, 'Carla', ['ATENDENTE', 'ADMINISTRADOR'], true, [2]), usuario(2, 'Bia', ['ALUNO'], false), usuario(3, 'Davi', ['ALUNO'], true)]),
      'PUT /api/admin/usuarios/1': () => [200, {}],
      'POST /api/admin/usuarios/3/desativar': () => [200, {}],
    })
    montada = abrir('/univag/usuarios')
    await screen.findByText('Carla')
    t.conferir(tela(), fixture)

    await userEvent.click(within(tela()).getByRole('button', { name: 'Ações de Carla' }))
    t.conferir(await screen.findByRole('menu'), fixture)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))
    const editar = await screen.findByRole('dialog')
    t.conferir(editar, fixture)
    await userEvent.click(within(editar).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Usuário salvo.'))
    t.conferir(avisos())

    await userEvent.click(within(tela()).getByRole('button', { name: /Novo/ }))
    t.conferir(await screen.findByRole('dialog'), fixture)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    await escolher('Davi', 'Desativar')
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

    await screen.findByLabelText('Arquivo CSV')
    t.conferir(tela(), ['1', '2', '3'])

    await userEvent.upload(screen.getByLabelText('Arquivo CSV'), new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    t.conferir(await screen.findByRole('dialog'), ['alunos.csv'])

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Importar' }))
    await screen.findByText('Linha 3', { exact: false })
    t.conferir(tela(), ['1', '2', 'alunos.csv', 'Há linhas inválidas.', '3', 'CPF inválido'])

    falha = false
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))
    await screen.findByText(/Importação concluída/)
    t.conferir(tela(), ['alunos.csv', '2', '1', '3'])

    t.todos()
  })

  it('textos Cadastros', async () => {
    const t = estados(Cadastros)
    const listas: Record<string, unknown[]> = {
      setores: [...setores, { id: 4, nome: 'Reserva', triagem: true, ativo: false }],
      categorias: [{ id: 7, nome: 'Notas', ativa: true, padrao: false }, { id: 8, nome: 'Não classificado', ativa: true, padrao: true }, { id: 9, nome: 'Velha', ativa: false, padrao: false }],
      cursos: [{ id: 4, nome: 'ADS', setorCoordenacaoId: 2 }, { id: 5, nome: 'Direito', setorCoordenacaoId: null }],
      fluxos: [
        { id: 6, categoriaId: 7, cursoId: null, semestre: null, vigente: { numero: 1, etapas: [{ destino: 'SETOR', setorId: 2, prazoHoras: null, x: null, y: null }] }, rascunho: null },
        {
          id: 7, categoriaId: 9, cursoId: 4, semestre: 3, rascunho: null,
          vigente: { numero: 1, etapas: [{ destino: 'LIDERANCA_SEMESTRE', setorId: null, prazoHoras: null, x: null, y: null }, { destino: 'COORDENACAO_CURSO', setorId: null, prazoHoras: 48, x: null, y: null }] },
        },
      ],
      'respostas-prontas': [{ id: 8, setorId: 2, titulo: 'Boleto', texto: 'Seu boleto está no Portal.' }],
    }
    const leituras = (vazias: boolean) =>
      Object.fromEntries(Object.entries(listas).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, vazias ? [] : v]) as Rota]))

    api({ 'GET /api/auth/me': () => [200, admin], ...leituras(true) })
    let montada = abrir('/univag/cadastros')
    await screen.findByText('Nenhum item cadastrado.')
    expect(screen.getByRole('combobox', { name: 'Cadastro' })).toBeInTheDocument()
    t.conferir(tela())
    await userEvent.click(screen.getByRole('tab', { name: 'Fluxos' }))
    await screen.findByText('Sem fluxo, os chamados vão para a Triagem.')
    t.conferir(tela())
    montada.unmount()

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

      await userEvent.click(within(within(screen.getByRole('tabpanel', { name: titulo })).getByRole('table')).getAllByRole('button')[0])
      if (titulo === 'Fluxos') {
        const editor = await screen.findByRole('region', { name: 'Editar: Fluxos' })
        t.conferir(editor, Fixture)
        await userEvent.click(within(editor).getByRole('button', { name: 'Mais' }))
        t.conferir(await screen.findByRole('menu'), Fixture)
        await userEvent.keyboard('{Escape}')
        await userEvent.click(within(editor).getByRole('button', { name: 'Voltar' }))
        await waitFor(() => expect(screen.queryByRole('region', { name: 'Editar: Fluxos' })).not.toBeInTheDocument())
        await screen.findByRole('tabpanel', { name: 'Fluxos' })
      } else {
        t.conferir(await screen.findByRole('dialog', { name: `Editar: ${titulo}` }), Fixture)
        if (titulo === 'Setores') {
          await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }))
          await waitFor(() => expect(avisos()).toHaveTextContent('Cadastro salvo.'))
          t.conferir(avisos())
        } else await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      }

      await userEvent.click(within(tela()).getByRole('button', { name: /^Nov[oa] / }))
      t.conferir(await screen.findByRole('dialog', { name: `Novo: ${titulo}` }), Fixture)
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
    montada.unmount()

    t.todos()
  })
})
