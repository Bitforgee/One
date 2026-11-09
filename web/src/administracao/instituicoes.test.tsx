import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { abrir, acoesDe, api, cabecalhos, escolher, me, type Rota } from '../test/util'

const operador = me({ papeis: ['ADMINISTRADOR', 'OPERADOR'], matriculas: [] })
const demo = { slug: 'demo', nome: 'Faculdade Demo', fuso: 'America/Cuiaba', ativa: true, criadaEm: '2026-11-02T12:00:00Z', administradores: 2 }
const antiga = { slug: 'antiga', nome: 'Faculdade Antiga', fuso: 'America/Sao_Paulo', ativa: false, criadaEm: '2026-09-15T12:00:00Z', administradores: 0 }
const Lista = '/api/plataforma/instituicoes'

function tela(rotas: Record<string, Rota> = {}, lista = [demo, antiga]) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, operador], [`GET ${Lista}`]: () => [200, lista], ...rotas })
  abrir('/univag/instituicoes')
  return chamadas
}

const linha = async (nome: string) => (await screen.findByText(nome)).closest('tr') as HTMLElement
const gravacoes = (chamadas: { metodo: string; url: string; corpo: any }[]) => chamadas.filter((c) => c.metodo !== 'GET').map((c) => [c.metodo, c.url, c.corpo])
const avisos = () => screen.getByRole('region', { name: /^Notificações/ })

const grupos = (raiz: HTMLElement) =>
  within(raiz).getAllByRole('group').map((g) => [g.getAttribute('aria-labelledby') && document.getElementById(g.getAttribute('aria-labelledby')!)?.textContent, within(g).getAllByRole('link').map((l) => l.textContent)])

describe('instituições', () => {
  afterEach(() => {
    localStorage.clear()
    window.innerWidth = 1024
  })

  it('grupo Plataforma só para operador', async () => {
    api({ 'GET /api/auth/me': () => [200, operador] })
    abrir('/univag/trocar-senha')
    const nav = await screen.findByRole('navigation')
    const todos = grupos(nav)
    expect(todos.at(-1)).toEqual(['Plataforma', ['Instituições']])
    expect(todos.map(([nome]) => nome)).toEqual(['Atendimento', 'Conhecimento', 'Administração', 'Plataforma'])
    const link = within(nav).getByRole('link', { name: 'Instituições' })
    expect(link).toHaveAttribute('href', '/univag/instituicoes')
    expect(link.querySelector('svg')).toHaveClass('lucide-building-2')
    cleanup()

    window.innerWidth = 500
    api({ 'GET /api/auth/me': () => [200, operador] })
    abrir('/univag/trocar-senha')
    await userEvent.click(await screen.findByRole('button', { name: 'Alternar barra lateral' }))
    expect(grupos(await screen.findByRole('dialog', { name: 'Menu' })).at(-1)).toEqual(['Plataforma', ['Instituições']])
    cleanup()
    window.innerWidth = 1024

    for (const papeis of [['ADMINISTRADOR'], ['ATENDENTE'], ['ALUNO']]) {
      api({ 'GET /api/auth/me': () => [200, me({ papeis })] })
      abrir('/univag/trocar-senha')
      const barra = await screen.findByRole('navigation')
      expect(within(barra).queryByRole('group', { name: 'Plataforma' }), papeis.join()).not.toBeInTheDocument()
      expect(within(barra).queryByRole('link', { name: 'Instituições' }), papeis.join()).not.toBeInTheDocument()
      cleanup()
    }
  })

  it('lista com selo, administradores e ações', async () => {
    tela()
    const ativa = await linha('Faculdade Demo')
    expect(cabecalhos()).toEqual(['Nome', 'Situação', 'Administradores', 'Criada em', ''])
    const celulas = within(ativa).getAllByRole('cell')
    expect(celulas[0]).toHaveTextContent('Faculdade Demo/demo')
    expect(within(celulas[0]).getByText('/demo')).toHaveClass('text-xs')
    expect(celulas[1]).toHaveTextContent(/^Ativa$/)
    expect(celulas[2]).toHaveTextContent(/^2$/)
    expect(celulas[3]).toHaveTextContent(/^02\/11\/2026$/)
    const inativa = await linha('Faculdade Antiga')
    expect(within(inativa).getAllByRole('cell')[1]).toHaveTextContent(/^Desativada$/)
    expect(within(inativa).getByText('/antiga')).toBeInTheDocument()
    expect(within(inativa).getAllByRole('cell')[3]).toHaveTextContent(/^15\/09\/2026$/)

    expect(await acoesDe('Faculdade Demo')).toEqual(['Importar carga', 'Reenviar acesso do admin', 'Desativar!'])
    expect(await acoesDe('Faculdade Antiga')).toEqual(['Importar carga', 'Reenviar acesso do admin', 'Reativar'])
    expect(screen.getByRole('button', { name: 'Nova instituição' })).toBeInTheDocument()
  })

  it('carregando mostra 3 esqueletos', async () => {
    api({ 'GET /api/auth/me': () => [200, operador], [`GET ${Lista}`]: () => new Promise(() => {}) })
    abrir('/univag/instituicoes')
    expect(await screen.findByRole('heading', { name: 'Instituições', level: 1 })).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
  })

  async function abrirNova() {
    await userEvent.click(await screen.findByRole('button', { name: 'Nova instituição' }))
    const d = within(await screen.findByRole('dialog'))
    return { d, admin: within(d.getByRole('group', { name: 'Primeiro administrador' })) }
  }

  it('endereço segue o nome até ser editado', async () => {
    tela()
    const { d } = await abrirNova()
    const [nome, endereco] = [d.getAllByLabelText('Nome')[0], d.getByLabelText('Endereço')]

    await userEvent.type(nome, 'Centro Universitário São José & Cia')
    expect(endereco).toHaveValue('centro-universitario-sao-jose-cia')

    await userEvent.clear(endereco)
    await userEvent.type(endereco, 'csj')
    await userEvent.type(nome, ' Ltda')
    expect(nome).toHaveValue('Centro Universitário São José & Cia Ltda')
    expect(endereco).toHaveValue('csj')

    const fuso = d.getByLabelText('Fuso horário') as HTMLSelectElement
    expect(fuso).toHaveValue('America/Sao_Paulo')
    const valores = [...fuso.options].map((o) => o.value)
    expect(valores[0]).toBe('America/Sao_Paulo')
    expect(valores.every((v) => v.startsWith('America/'))).toBe(true)
    expect([...valores].sort()).toEqual(
      ['Araguaina', 'Bahia', 'Belem', 'Boa_Vista', 'Campo_Grande', 'Cuiaba', 'Eirunepe', 'Fortaleza', 'Maceio', 'Manaus', 'Noronha', 'Porto_Velho', 'Recife', 'Rio_Branco', 'Santarem', 'Sao_Paulo'].map((z) => `America/${z}`),
    )
  })

  async function preencher({ d, admin }: Awaited<ReturnType<typeof abrirNova>>) {
    await userEvent.type(d.getAllByLabelText('Nome')[0], 'Faculdade Demo')
    await userEvent.selectOptions(d.getByLabelText('Fuso horário'), 'America/Cuiaba')
    await userEvent.type(admin.getByLabelText('Nome'), 'Dona Admin')
    await userEvent.type(admin.getByLabelText('CPF'), '123.456.789-09')
    await userEvent.type(admin.getByLabelText('E-mail'), 'admin@demo.edu.br')
  }

  it('criar fecha, avisa e recarrega a lista', async () => {
    let lidas = 0
    const chamadas = tela({
      [`GET ${Lista}`]: () => [200, ++lidas === 1 ? [antiga] : [demo, antiga]],
      [`POST ${Lista}`]: () => [201, demo],
    })
    await preencher(await abrirNova())
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(gravacoes(chamadas)).toEqual([
      ['POST', Lista, { slug: 'faculdade-demo', nome: 'Faculdade Demo', fuso: 'America/Cuiaba', admin: { cpf: '123.456.789-09', nome: 'Dona Admin', email: 'admin@demo.edu.br' } }],
    ])
    expect(await screen.findByText('Instituição Faculdade Demo criada. Enviamos o link de primeiro acesso para admin@demo.edu.br.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '/faculdade-demo' })).toHaveAttribute('href', '/faculdade-demo')
    expect(await linha('Faculdade Demo')).toBeInTheDocument()
    expect(lidas).toBe(2)
  })

  it('erro da API no campo sem perder o formulário', async () => {
    let tentativa = 0
    tela({
      [`POST ${Lista}`]: () =>
        ++tentativa === 1
          ? [400, { status: 400, detail: 'E-mail inválido.', errors: { 'admin.email': ['E-mail inválido.'] } }]
          : tentativa === 2
            ? [409, { status: 409, detail: 'Esse endereço já está em uso.' }]
            : [500, { status: 500, detail: 'Ocorreu um erro inesperado. Tente de novo.' }],
    })
    const abertura = await abrirNova()
    const { d, admin } = abertura
    await preencher(abertura)
    const conferirCampos = () => {
      expect(d.getAllByLabelText('Nome')[0]).toHaveValue('Faculdade Demo')
      expect(d.getByLabelText('Endereço')).toHaveValue('faculdade-demo')
      expect(d.getByLabelText('Fuso horário')).toHaveValue('America/Cuiaba')
      expect(admin.getByLabelText('Nome')).toHaveValue('Dona Admin')
      expect(admin.getByLabelText('CPF')).toHaveValue('123.456.789-09')
      expect(admin.getByLabelText('E-mail')).toHaveValue('admin@demo.edu.br')
    }

    await userEvent.click(d.getByRole('button', { name: 'Criar' }))
    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument()
    expect(admin.getByLabelText('E-mail')).toHaveAccessibleDescription('E-mail inválido.')
    conferirCampos()

    await userEvent.click(d.getByRole('button', { name: 'Criar' }))
    await waitFor(() => expect(d.getByLabelText('Endereço')).toHaveAccessibleDescription('Esse endereço já está em uso.'))
    expect(screen.queryByText('E-mail inválido.')).not.toBeInTheDocument()
    conferirCampos()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.click(d.getByRole('button', { name: 'Criar' }))
    expect(await d.findByText('Ocorreu um erro inesperado. Tente de novo.')).toBeInTheDocument()
    expect(d.getByLabelText('Endereço')).not.toHaveAccessibleDescription()
    conferirCampos()
  })

  it('importar carga mostra o resumo ou os erros', async () => {
    let tentativa = 0
    const chamadas = tela({
      [`POST ${Lista}/demo/carga`]: () =>
        ++tentativa === 1
          ? [200, { setores: 2, cursos: 1, categorias: 3, regras: 2, artigos: 5 }]
          : tentativa === 2
            ? [400, { status: 400, detail: 'O arquivo de carga tem erros.', errors: { arquivo: ['regras[0].categoria: categoria "Nenhuma" não existe', 'setores[1].nome: "A" repetido'] } }]
            : [413, { status: 413, detail: 'O arquivo passa de 2 MB.' }],
    })
    await escolher('Faculdade Demo', 'Importar carga')
    const d = within(await screen.findByRole('dialog', { name: /Importar carga/ }))
    const campo = d.getByLabelText(/Arquivo de carga/) as HTMLInputElement
    expect(campo).toHaveAttribute('type', 'file')
    expect(campo.accept).toContain('.json')
    expect(d.getByRole('button', { name: 'Importar' })).toBeDisabled()

    const arquivo = new File(['{}'], 'carga.json', { type: 'application/json' })
    await userEvent.upload(campo, arquivo)
    await userEvent.click(d.getByRole('button', { name: 'Importar' }))
    expect(await d.findByText('Importados: 2 setores, 1 cursos, 3 categorias, 2 regras, 5 artigos.')).toBeInTheDocument()
    expect(gravacoes(chamadas)).toEqual([['POST', `${Lista}/demo/carga`, { arquivo }]])

    await userEvent.click(d.getByRole('button', { name: 'Importar' }))
    const primeiro = await d.findByText('regras[0].categoria: categoria "Nenhuma" não existe')
    const segundo = d.getByText('setores[1].nome: "A" repetido')
    expect(primeiro.closest('tr')).not.toBe(segundo.closest('tr'))
    expect(primeiro.closest('tr')).toBeTruthy()
    expect(d.queryByText(/^Importados:/)).not.toBeInTheDocument()

    await userEvent.click(d.getByRole('button', { name: 'Importar' }))
    expect(await d.findByText('O arquivo passa de 2 MB.')).toBeInTheDocument()
    expect(d.queryByText('setores[1].nome: "A" repetido')).not.toBeInTheDocument()
  })

  it('desativar confirma, reativar e reenviar agem direto', async () => {
    let desativada = false
    const chamadas = tela({
      [`GET ${Lista}`]: () => [200, [{ ...demo, ativa: !desativada }, antiga]],
      [`POST ${Lista}/demo/desativar`]: () => {
        desativada = true
        return [200, { slug: 'demo', ativa: false }]
      },
      [`POST ${Lista}/antiga/reativar`]: () => [200, { slug: 'antiga', ativa: true }],
      [`POST ${Lista}/demo/reenviar-acesso`]: () => [202, { enviados: 2 }],
    })

    await escolher('Faculdade Demo', 'Desativar')
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Desativar Faculdade Demo? Ninguém dessa instituição consegue entrar até você reativar.')).toBeInTheDocument()
    await userEvent.click(d.getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(gravacoes(chamadas)).toEqual([])

    await escolher('Faculdade Demo', 'Desativar')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(gravacoes(chamadas)).toEqual([['POST', `${Lista}/demo/desativar`, {}]]))
    await waitFor(async () => expect(within(await linha('Faculdade Demo')).getAllByRole('cell')[1]).toHaveTextContent(/^Desativada$/))

    await escolher('Faculdade Antiga', 'Reativar')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await within(avisos()).findByText('Instituição reativada.')).toBeInTheDocument()

    await escolher('Faculdade Demo', 'Reenviar acesso do admin')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await within(avisos()).findByText('Enviamos o link para 2 administrador(es).')).toBeInTheDocument()
    expect(gravacoes(chamadas).map(([, url]) => url)).toEqual([`${Lista}/demo/desativar`, `${Lista}/antiga/reativar`, `${Lista}/demo/reenviar-acesso`])
  })
})
