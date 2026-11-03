import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estados } from '../test/textos'
import { abrir, api, me } from '../test/util'

// Linha 0 de ## Screens (casca); "Tema" e "Alternar barra lateral" são só nomes acessíveis, conferidos por papel.
const Papeis = ['Administrador', 'Atendente', 'Aluno'] // layout-painel: o papel no botão do usuário (novo)
const Cabecalho = ['One', 'Assistente', 'Minhas solicitações', 'Fila', 'Artigos', 'Documentos', 'Indicadores', 'Usuários', 'Matrículas', 'Cadastros', 'Sair', 'Claro', 'Escuro', 'Preto', 'Sistema', 'Atendimento', 'Conhecimento', 'Administração', ...Papeis]
const Instituicao = 'Univag' // nome da instituição do fixture
const Nome = me().nome // barra-lateral-grupos: o nome do usuário no rodapé da barra e na gaveta

describe('textos', () => {
  it('textos cabeçalho', async () => {
    const tela = estados(Cabecalho)

    // carregando: só o status "Carregando", sem texto visível
    api({ 'GET /api/auth/me': () => new Promise(() => {}) })
    const carregando = abrir('/univag/trocar-senha')
    expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    tela.conferir(carregando.container)
    carregando.unmount()

    // barra e cabeçalho da tela (o título "Trocar senha" é o h1 do cabeçalho), por papel
    for (const papel of ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR']) {
      api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
      const { unmount } = abrir('/univag/trocar-senha')
      await screen.findByRole('button', { name: 'Alternar barra lateral' })
      tela.conferir(document.querySelector('[data-sidebar=sidebar]') as HTMLElement, [Instituicao, Nome])
      tela.conferir(document.querySelector('header') as HTMLElement, ['Trocar senha'])
      await userEvent.click(screen.getByRole('button', { name: new RegExp(Nome) }))
      tela.conferir(await screen.findByRole('menu'), [Nome])
      unmount()
    }

    // painel lateral aberto no celular, com os links dos 3 papéis
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'] })] })
    window.innerWidth = 500
    abrir('/univag/trocar-senha')
    await userEvent.click(await screen.findByRole('button', { name: 'Alternar barra lateral' }))
    tela.conferir(await screen.findByRole('dialog', { name: 'Menu' }), [Nome, Instituicao])
    await userEvent.keyboard('{Escape}')
    window.innerWidth = 1024

    // controle de tema aberto: "Claro", "Escuro", "Preto" e "Sistema"
    await userEvent.click(await screen.findByRole('button', { name: 'Tema' }))
    tela.conferir(document.querySelector('[data-slot=popover-content]') as HTMLElement)

    tela.todos()
  })
})

// Linhas 1 a 5 de ## Screens; o `detail` e a mensagem da API vêm do fixture
const Recusa = [422, { status: 422, title: 'Dados inválidos', detail: 'Dados recusados pela API.' }] as [number, unknown]
// login-institucional: o painel institucional (novo) das 3 telas de entrada
const Painel = ['Atendimento ao estudante', 'Dúvidas, solicitações e respostas da sua instituição em um só lugar.', 'Tire dúvidas com o assistente a qualquer hora', 'Acompanhe suas solicitações até a resposta', 'Fale com a equipe da instituição quando precisar']
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
    const t = estados(['One', 'Entre com seu CPF e sua senha.', 'CPF', 'Senha', 'Entrar', 'Primeiro acesso ou esqueci minha senha', 'Instituição não encontrada.', ...Painel])
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
    const t = estados(['One', 'Primeiro acesso', 'CPF', 'Enviaremos um link para criar a senha no e-mail registrado na instituição.', 'Enviar link', 'Voltar para o login', ...Painel])
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
    const t = estados(['One', 'Criar senha', 'Nova senha', 'De 8 a 128 caracteres.', 'Salvar senha', 'Senha criada. ', 'Entre com o CPF e a nova senha.', ...Painel])
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
      t.conferir(container, [...Cabecalho, Instituicao, Nome])
      unmount()
    }
    t.todos()
  })
})
