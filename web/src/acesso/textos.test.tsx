import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estados } from '../test/textos'
import { abrir, api, me } from '../test/util'

// Linha 0 de ## Screens (cabeçalho); "Tema" e "Menu" são só nomes acessíveis, conferidos por papel.
const Cabecalho = ['One', 'Assistente', 'Minhas solicitações', 'Fila', 'Artigos', 'Documentos', 'Indicadores', 'Usuários', 'Matrículas', 'Cadastros', 'Sair', 'Menu', 'Claro', 'Escuro', 'Sistema']
const Instituicao = 'Univag' // nome da instituição do fixture

describe('textos', () => {
  it('textos cabeçalho', async () => {
    const tela = estados(Cabecalho)

    // carregando: só o status "Carregando", sem texto visível
    api({ 'GET /api/auth/me': () => new Promise(() => {}) })
    const carregando = abrir('/univag/trocar-senha')
    expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    tela.conferir(carregando.container)
    carregando.unmount()

    for (const papel of ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR']) {
      api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
      const { unmount } = abrir('/univag/trocar-senha')
      const nav = await screen.findByRole('navigation')
      expect(within(nav).getByRole('button', { name: 'Menu' })).toBeInTheDocument()
      tela.conferir(nav, [Instituicao])
      unmount()
    }

    // gaveta aberta, com os links dos 3 papéis
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'] })] })
    abrir('/univag/trocar-senha')
    await userEvent.click(await screen.findByRole('button', { name: 'Menu' }))
    tela.conferir(await screen.findByRole('dialog', { name: 'Menu' }))
    await userEvent.keyboard('{Escape}')

    // controle de tema aberto: "Claro", "Escuro" e "Sistema"
    await userEvent.click(await screen.findByRole('button', { name: 'Tema' }))
    tela.conferir(document.querySelector('[data-slot=popover-content]') as HTMLElement)

    tela.todos()
  })
})

// Linhas 1 a 5 de ## Screens; o `detail` e a mensagem da API vêm do fixture
const Recusa = [422, { status: 422, title: 'Dados inválidos', detail: 'Dados recusados pela API.' }] as [number, unknown]
const Instituicoes = { 'GET /api/instituicoes/univag': () => [200, { nome: 'Univag' }] as [number, unknown] }

describe('textos das telas de acesso', () => {
  it('textos raiz', () => {
    const t = estados(['One', 'Abra o endereço da sua instituição, por exemplo /univag.'])
    api({})
    const { container } = abrir('/')
    t.conferir(container)
    t.todos()
  })

  it('textos Login', async () => {
    const t = estados(['One', '·', 'CPF', 'Senha', 'Entrar', 'Primeiro acesso ou esqueci minha senha', 'Instituição não encontrada.'])
    // carregando: só o status "Carregando"
    api({ 'GET /api/instituicoes/univag': () => new Promise(() => {}) })
    let montada = abrir('/univag')
    expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    t.conferir(montada.container)
    montada.unmount()

    api({ 'GET /api/instituicoes/univag': () => [404, { status: 404, title: 'Não encontrado', detail: 'Sem instituição.' }] })
    montada = abrir('/univag')
    await screen.findByText('Instituição não encontrada.')
    t.conferir(montada.container)
    montada.unmount()

    api({ ...Instituicoes, 'POST /api/auth/login': () => Recusa })
    montada = abrir('/univag')
    await screen.findByLabelText('CPF')
    t.conferir(montada.container, ['Univag'])
    await userEvent.type(screen.getByLabelText('CPF'), '1')
    await userEvent.type(screen.getByLabelText('Senha'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByRole('alert')
    t.conferir(montada.container, ['Univag', 'Dados recusados pela API.'])
    t.todos()
  })

  it('textos Primeiro acesso', async () => {
    const t = estados(['Primeiro acesso', 'CPF', 'Enviaremos um link para criar a senha no e-mail registrado na instituição.', 'Enviar link', 'Voltar para o login'])
    api({ 'POST /api/auth/primeiro-acesso': () => [200, { mensagem: 'Link enviado.' }] })
    const { container } = abrir('/univag/primeiro-acesso')
    t.conferir(container)
    await userEvent.type(screen.getByLabelText('CPF'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
    await screen.findByText('Link enviado.')
    t.conferir(container, ['Link enviado.'])
    t.todos()
  })

  it('textos Criar senha', async () => {
    const t = estados(['Criar senha', 'Nova senha', 'De 8 a 128 caracteres.', 'Salvar senha', 'Senha criada. ', 'Entre com o CPF e a nova senha.'])
    api({ 'POST /api/auth/definir-senha': () => [204, undefined] })
    const { container } = abrir('/univag/definir-senha?token=t')
    t.conferir(container)
    await userEvent.type(screen.getByLabelText('Nova senha'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))
    await screen.findByText(/Senha criada/)
    t.conferir(container)
    t.todos()
  })

  it('textos Trocar senha', async () => {
    const t = estados(['Trocar senha', 'Troque a senha temporária para continuar.', 'Senha atual', 'Nova senha', 'De 8 a 128 caracteres.', 'Salvar'])
    for (const deveTrocarSenha of [true, false]) {
      api({ 'GET /api/auth/me': () => [200, me({ deveTrocarSenha })] })
      const { container, unmount } = abrir('/univag/trocar-senha')
      await screen.findByRole('heading', { name: 'Trocar senha' })
      t.conferir(container, [...Cabecalho, Instituicao])
      unmount()
    }
    t.todos()
  })
})
