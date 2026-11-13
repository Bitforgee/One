import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Campo } from './Campo'
import { abrir, api, chamado, instituicao, me, type Rota } from './test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const operador = me({ papeis: ['ADMINISTRADOR', 'OPERADOR'], matriculas: [] })
const invalido = (errors: Record<string, string[]>) => [422, { status: 422, detail: 'Dados inválidos.', errors }] as [number, unknown]
const idsInvalidos = () => [...document.querySelectorAll('[aria-invalid="true"]')].map((e) => e.id)
const focado = () => document.activeElement as HTMLElement
const categorias = [{ id: 3, nome: 'Estágio', ativa: true }]

describe('campo com erro e dica', () => {
  it('C10 o erro leva id e role alert e o controle aponta para dica e erro', () => {
    const { rerender } = render(<Campo id="nome" rotulo="Nome" dica="Como aparece no boleto." erro="Informe o nome." />)
    const erro = document.getElementById('nome-erro')!
    expect(erro).toHaveTextContent('Informe o nome.')
    expect(erro).toHaveAttribute('role', 'alert')
    expect(document.getElementById('nome-dica')).toHaveTextContent('Como aparece no boleto.')
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-describedby', 'nome-dica nome-erro')
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true')

    rerender(<Campo id="nome" rotulo="Nome" dica="Como aparece no boleto." />)
    expect(document.getElementById('nome-erro')).toBeNull()
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-describedby', 'nome-dica')

    rerender(<Campo id="nome" rotulo="Nome" erro="Informe o nome." />)
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-describedby', 'nome-erro')
  })
})

describe('foco no primeiro campo com erro', () => {
  it('C11 Acesso foca o CPF ao enviar vazio', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag')
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(idsInvalidos()).toEqual(['cpf', 'senha']))
    await waitFor(() => expect(focado()).toBe(document.getElementById('cpf')))
    expect(focado()).toHaveAttribute('aria-invalid', 'true')
  })

  it('C11 Artigos foca o primeiro campo inválido do servidor', async () => {
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/artigos': () => [200, []],
      'GET /api/admin/categorias': () => [200, categorias],
      'POST /api/admin/artigos': () => invalido({ links: ['Link inválido.'], perguntas: ['Informe ao menos uma pergunta.'] }),
    })
    abrir('/univag/artigos')
    await screen.findByText('Os artigos são a base das respostas do assistente.')
    await userEvent.click(screen.getByRole('button', { name: /^Novo/ }))
    const d = within(await screen.findByRole('dialog'))
    await userEvent.click(d.getByRole('button', { name: /^Salvar/ }))
    await waitFor(() => expect(idsInvalidos()).toEqual(['perguntas', 'links']))
    await waitFor(() => expect(focado()).toBe(document.getElementById('perguntas')))
  })

  it('C11 Documentos foca o primeiro campo inválido do servidor', async () => {
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/documentos': () => [200, []],
      'GET /api/admin/categorias': () => [200, categorias],
      'POST /api/admin/documentos': () => invalido({ categoriaId: ['Escolha a categoria.'], titulo: ['Informe o título.'] }),
    })
    abrir('/univag/documentos')
    await screen.findByText('PDFs como regulamentos e calendários também alimentam o assistente.')
    await userEvent.click(screen.getByRole('button', { name: 'Novo documento' }))
    const d = within(await screen.findByRole('dialog'))
    await userEvent.upload(d.getByLabelText('Arquivo PDF'), new File(['%PDF-1.4'], 'regulamento.pdf', { type: 'application/pdf' }))
    await userEvent.click(d.getByRole('button', { name: /^Enviar/ }))
    await waitFor(() => expect(idsInvalidos()).toEqual(['titulo-documento', 'categoria-documento']))
    await waitFor(() => expect(focado()).toBe(document.getElementById('titulo-documento')))
  })

  it('C11 Instituicoes foca o primeiro campo inválido do servidor', async () => {
    api({
      'GET /api/auth/me': () => [200, operador],
      'GET /api/plataforma/instituicoes': () => [200, []],
      'POST /api/plataforma/instituicoes': () => invalido({ 'admin.email': ['E-mail inválido.'], 'admin.cpf': ['CPF inválido.'] }),
    })
    abrir('/univag/instituicoes')
    await userEvent.click(await screen.findByRole('button', { name: 'Nova instituição' }))
    const d = within(await screen.findByRole('dialog'))
    await userEvent.click(d.getByRole('button', { name: /^(Criar|Salvar)/ }))
    await waitFor(() => expect(idsInvalidos()).toEqual(['admin-cpf', 'admin-email']))
    await waitFor(() => expect(focado()).toBe(document.getElementById('admin-cpf')))
  })
})

const usuarios: Record<string, Rota> = {
  'GET /api/auth/me': () => [200, admin],
  'GET /api/admin/usuarios': () => [200, []],
  'GET /api/admin/setores': () => [200, []],
}
const moodle = { configurada: false, ativa: false, emissor: '', clientId: '', deploymentId: '', authUrl: '', jwksUrl: '', urlLogin: 'https://one.teste/login', urlLancamento: 'https://one.teste/lancamento', urlJwks: 'https://one.teste/jwks' }

async function abrirUsuario() {
  api(usuarios)
  abrir('/univag/usuarios')
  await userEvent.click((await screen.findAllByRole('button', { name: /^Novo/ }))[0])
  return within(await screen.findByRole('dialog'))
}

async function abrirNovaInstituicao() {
  api({ 'GET /api/auth/me': () => [200, operador], 'GET /api/plataforma/instituicoes': () => [200, []] })
  abrir('/univag/instituicoes')
  await userEvent.click(await screen.findByRole('button', { name: 'Nova instituição' }))
  return within(await screen.findByRole('dialog'))
}

async function abrirChamado() {
  api({
    'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })],
    'GET /api/chamados/ONE-1': () => [200, chamado({ solicitante: 'Ana', eventos: [], acoes: ['responder', 'duplicado'], setores: [], categorias: [] })],
  })
  abrir('/univag/chamados/ONE-1')
  return screen.findByLabelText('Duplicado de outro pedido do mesmo aluno')
}

const textoSemCorretor = (campo: HTMLElement) => {
  expect(campo).toHaveAttribute('autocomplete', 'off')
  expect(campo).toHaveAttribute('spellcheck', 'false')
}

describe('atributos dos campos de texto', () => {
  it('C13 login mantém username e current-password e o CPF não é corrigido', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag')
    const cpf = await screen.findByLabelText('CPF')
    expect(cpf).toHaveAttribute('name', 'cpf')
    expect(cpf).toHaveAttribute('autocomplete', 'username')
    expect(cpf).toHaveAttribute('spellcheck', 'false')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password')
  })

  it('C13 primeiro acesso e criar senha', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/primeiro-acesso')
    const cpf = await screen.findByLabelText('CPF')
    expect(cpf).toHaveAttribute('name', 'cpf')
    textoSemCorretor(cpf)
  })

  it('C13 criar senha mantém new-password', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/definir-senha?token=x')
    expect(await screen.findByLabelText('Nova senha')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('C13 usuários: CPF, e-mail e busca', async () => {
    const d = await abrirUsuario()
    const cpf = d.getByLabelText('CPF')
    expect(cpf).toHaveAttribute('name', 'cpf')
    textoSemCorretor(cpf)
    const email = d.getByLabelText('E-mail')
    expect(email).toHaveAttribute('name', 'email')
    textoSemCorretor(email)
    expect(d.getByLabelText('Senha temporária (opcional)')).toHaveAttribute('autocomplete', 'new-password')
    const busca = screen.getByRole('searchbox', { hidden: true })
    expect(busca).toHaveAttribute('name', 'busca')
    textoSemCorretor(busca)
  })

  it('C13 instituições: endereço, CPF e e-mail do administrador', async () => {
    const d = await abrirNovaInstituicao()
    for (const [campo, nome] of [[d.getByLabelText('Endereço'), 'endereco'], [d.getByLabelText('CPF'), 'admin-cpf'], [d.getByLabelText('E-mail'), 'admin-email']] as const) {
      expect(campo).toHaveAttribute('name', nome)
      textoSemCorretor(campo)
    }
  })

  it('C13 títulos de artigo e documento', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/artigos': () => [200, []], 'GET /api/admin/categorias': () => [200, categorias] })
    abrir('/univag/artigos')
    await screen.findByText('Os artigos são a base das respostas do assistente.')
    await userEvent.click(screen.getByRole('button', { name: /^Novo/ }))
    const artigo = within(await screen.findByRole('dialog')).getByLabelText('Título')
    expect(artigo).toHaveAttribute('name', 'titulo')
    expect(artigo).toHaveAttribute('autocomplete', 'off')
  })

  it('C13 título de documento', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/documentos': () => [200, []], 'GET /api/admin/categorias': () => [200, categorias] })
    abrir('/univag/documentos')
    await screen.findByText('PDFs como regulamentos e calendários também alimentam o assistente.')
    await userEvent.click(screen.getByRole('button', { name: 'Novo documento' }))
    const documento = within(await screen.findByRole('dialog')).getByLabelText('Título')
    expect(documento).toHaveAttribute('name', 'titulo-documento')
    expect(documento).toHaveAttribute('autocomplete', 'off')
  })

  it('C13 protocolo do chamado duplicado', async () => {
    const campo = await abrirChamado()
    expect(campo).toHaveAttribute('name', 'original')
    textoSemCorretor(campo)
  })

  it('C13 e C14 Moodle: URLs do emissor e dos endpoints', async () => {
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/instituicoes/univag': () => [200, instituicao()],
      'GET /api/admin/moodle': () => [200, moodle],
      'GET /api/admin/mcp': () => [200, { url: 'https://one.teste/mcp', tokens: [] }],
    })
    abrir('/univag/integracoes')
    for (const rotulo of ['Emissor (iss)', 'URL de autenticação', 'URL das chaves (JWKS)']) {
      const campo = await screen.findByLabelText(rotulo)
      expect(campo, rotulo).toHaveAttribute('type', 'url')
      textoSemCorretor(campo)
    }
    expect(screen.getByLabelText('Client ID')).toHaveAttribute('autocomplete', 'off')
  })
})

describe('tipos dos campos', () => {
  it('C14 e-mail de usuário e de administrador da instituição', async () => {
    const d = await abrirUsuario()
    expect(d.getByLabelText('E-mail')).toHaveAttribute('type', 'email')
  })

  it('C14 e-mail do administrador da instituição', async () => {
    const d = await abrirNovaInstituicao()
    expect(d.getByLabelText('E-mail')).toHaveAttribute('type', 'email')
  })

  it('C14 telefone e e-mail da aparência', async () => {
    const { nome: _, ...resto } = instituicao()
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/aparencia': () => [200, resto], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/aparencia')
    await userEvent.click(await screen.findByRole('tab', { name: /^Contato/ }))
    expect(await screen.findByLabelText('Telefone')).toHaveAttribute('type', 'tel')
    expect(screen.getByLabelText('E-mail de atendimento')).toHaveAttribute('type', 'email')
  })
})

describe('placeholders de exemplo', () => {
  it('C15 CPF e protocolo terminam em reticências', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag')
    expect(await screen.findByLabelText('CPF')).toHaveAttribute('placeholder', 'Ex.: 000.000.000-00…')
  })

  it('C15 CPF do primeiro acesso, do usuário e do administrador', async () => {
    const d = await abrirUsuario()
    expect(d.getByLabelText('CPF')).toHaveAttribute('placeholder', 'Ex.: 000.000.000-00…')
  })

  it('C15 CPF do administrador da instituição', async () => {
    const d = await abrirNovaInstituicao()
    expect(d.getByLabelText('CPF')).toHaveAttribute('placeholder', 'Ex.: 000.000.000-00…')
  })

  it('C15 protocolo do chamado', async () => {
    expect(await abrirChamado()).toHaveAttribute('placeholder', 'Ex.: ONE-123…')
  })
})

describe('foco no primeiro erro de Usuários e Cadastros', () => {
  it('C11 Usuarios foca o primeiro campo inválido do servidor', async () => {
    api({ ...usuarios, 'POST /api/admin/usuarios': () => invalido({ email: ['E-mail inválido.'], nome: ['Informe o nome.'] }) })
    abrir('/univag/usuarios')
    await userEvent.click((await screen.findAllByRole('button', { name: /^Novo/ }))[0])
    const d = within(await screen.findByRole('dialog'))
    await userEvent.click(d.getByRole('button', { name: 'Salvar usuário' }))
    await waitFor(() => expect(idsInvalidos()).toEqual(['nome', 'email']))
    await waitFor(() => expect(focado()).toBe(document.getElementById('nome')))
  })

  it('C11 Cadastros foca o primeiro campo inválido do servidor', async () => {
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/setores': () => [200, []],
      'GET /api/admin/categorias': () => [200, []],
      'GET /api/admin/cursos': () => [200, []],
      'GET /api/admin/fluxos': () => [200, []],
      'GET /api/admin/respostas-prontas': () => [200, []],
      'POST /api/admin/setores': () => invalido({ nome: ['Informe o nome.'] }),
    })
    abrir('/univag/cadastros')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Novo setor' }))[0])
    const d = within(await screen.findByRole('dialog'))
    await userEvent.click(d.getByRole('button', { name: 'Salvar setor' }))
    await waitFor(() => expect(idsInvalidos()).toEqual(['cad-nome']))
    await waitFor(() => expect(focado()).toBe(document.getElementById('cad-nome')))
  })
})