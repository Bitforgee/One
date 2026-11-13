import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const operador = me({ papeis: ['ADMINISTRADOR', 'OPERADOR'], matriculas: [] })
const ok = (corpo: unknown): Rota => () => [200, corpo]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('erro de campo da API abaixo do campo', () => {
  const pdf = new File(['%PDF'], 'regulamento.pdf', { type: 'application/pdf' })
  const campo400 = (campo: string, texto: string): Rota => () => [400, { status: 400, detail: texto, errors: { [campo]: [texto] } }]
  const categorias = [{ id: 3, nome: 'Acadêmico', ativa: true }]

  type Caso = { nome: string; caminho: string; eu: typeof admin; rotas: Record<string, Rota>; abrirForm: () => Promise<void>; enviar: string; rotulo: string; proximo: string; texto: string; preencher?: (d: ReturnType<typeof within>) => Promise<void> }
  const Casos: Caso[] = [
    {
      nome: 'Novo artigo', caminho: '/univag/artigos', eu: admin, texto: 'Informe o título, com até 200 caracteres.', rotulo: 'Título', proximo: 'Perguntas relacionadas (uma por linha)', enviar: 'Salvar artigo',
      rotas: { 'GET /api/admin/artigos': ok([]), 'GET /api/admin/categorias': ok(categorias), 'POST /api/admin/artigos': campo400('titulo', 'Informe o título, com até 200 caracteres.') },
      abrirForm: async () => void (await userEvent.click(await screen.findByRole('button', { name: 'Novo artigo' }))),
    },
    {
      nome: 'Enviar PDF', caminho: '/univag/documentos', eu: admin, texto: 'Informe o título, com até 200 caracteres.', rotulo: 'Título', proximo: 'Categoria', enviar: 'Enviar documento',
      rotas: { 'GET /api/admin/documentos': ok([]), 'GET /api/admin/categorias': ok(categorias), 'POST /api/admin/documentos': campo400('titulo', 'Informe o título, com até 200 caracteres.') },
      abrirForm: async () => void (await userEvent.click(await screen.findByRole('button', { name: 'Novo documento' }))),
      preencher: async (d) => void (await userEvent.upload(d.getByLabelText('Arquivo PDF'), pdf)),
    },
    {
      nome: 'Novo usuário', caminho: '/univag/usuarios', eu: admin, texto: 'CPF inválido.', rotulo: 'CPF', proximo: 'Nome', enviar: 'Salvar usuário',
      rotas: { 'GET /api/admin/usuarios': ok([]), 'GET /api/admin/setores': ok([]), 'POST /api/admin/usuarios': campo400('cpf', 'CPF inválido.') },
      abrirForm: async () => void (await userEvent.click(await screen.findByRole('button', { name: 'Novo usuário' }))),
    },
    {
      nome: 'Cadastros, Setores', caminho: '/univag/cadastros', eu: admin, texto: 'Informe o nome do setor.', rotulo: 'Nome', proximo: 'Setor de triagem (exatamente um na instituição)', enviar: 'Salvar setor',
      rotas: {
        ...Object.fromEntries(['setores', 'categorias', 'cursos', 'regras', 'respostas-prontas'].map((k) => [`GET /api/admin/${k}`, ok([])])),
        'POST /api/admin/setores': campo400('nome', 'Informe o nome do setor.'),
      },
      abrirForm: async () => void (await userEvent.click(await screen.findByRole('button', { name: 'Novo setor' }))),
    },
    {
      nome: 'Nova instituição', caminho: '/univag/instituicoes', eu: operador, texto: 'Esse endereço não é válido.', rotulo: 'Endereço', proximo: 'Fuso horário', enviar: 'Criar',
      rotas: { 'GET /api/plataforma/instituicoes': ok([]), 'POST /api/plataforma/instituicoes': campo400('slug', 'Esse endereço não é válido.') },
      abrirForm: async () => void (await userEvent.click(await screen.findByRole('button', { name: 'Nova instituição' }))),
    },
  ]

  it.each(Casos)('erro de campo da API abaixo do campo ($nome)', async ({ caminho, eu, rotas, abrirForm, enviar, rotulo, proximo, texto, preencher }) => {
    api({ 'GET /api/auth/me': ok(eu), ...rotas })
    abrir(caminho)
    await abrirForm()
    const dialogo = await screen.findByRole('dialog')
    const d = within(dialogo)
    await preencher?.(d)
    await userEvent.click(d.getByRole('button', { name: enviar }))

    const erro = await d.findByText(texto)
    const campo = d.getByLabelText(rotulo)
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAttribute('aria-describedby', erro.id)
    expect(erro.id).not.toBe('')
    expect(campo.compareDocumentPosition(erro) & Node.DOCUMENT_POSITION_FOLLOWING, 'depois do campo').toBeTruthy()
    const seguinte = d.getByText(proximo)
    expect(erro.compareDocumentPosition(seguinte) & Node.DOCUMENT_POSITION_FOLLOWING, 'antes do rótulo do campo seguinte').toBeTruthy()
    expect(dialogo.querySelector('[data-slot=dialog-footer]')?.contains(erro) ?? false).toBe(false)
    expect(d.getAllByText(texto), 'o texto aparece uma vez só').toHaveLength(1)
  })

  it('erro de campo da API abaixo do campo: os 5 formulários', () => {
    expect(Casos).toHaveLength(5)
  })
})

describe('CPF formatado e busca por nome, CPF ou e-mail', () => {
  const carla = { id: 1, cpf: '12345678909', nome: 'Carla Souza', email: 'carla@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ATENDENTE'], setores: [] }
  const bruno = { id: 2, cpf: '98765432100', nome: 'Bruno Lima', email: 'bruno.albuquerque@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ADMINISTRADOR'], setores: [] }
  const tela = () => {
    api({ 'GET /api/auth/me': ok(admin), 'GET /api/admin/usuarios': ok([carla, bruno]), 'GET /api/admin/setores': ok([]) })
    abrir('/univag/usuarios')
  }
  const visiveis = () => ['Carla Souza', 'Bruno Lima'].filter((n) => screen.queryByText(n))

  it('CPF formatado e busca por nome, CPF ou e-mail (formato)', async () => {
    tela()
    await screen.findByText('Carla Souza')
    const linha = screen.getByText('Carla Souza').closest('tr') as HTMLElement
    expect(within(linha).getByText('123.456.789-09')).toBeInTheDocument()
    expect(linha).not.toHaveTextContent('12345678909')
  })

  it.each([
    ['carla', ['Carla Souza']],
    ['CARLA', ['Carla Souza']],
    ['123.456', ['Carla Souza']],
    ['123456', ['Carla Souza']],
    ['albuquerque@', ['Bruno Lima']],
    ['zzz', []],
  ])('CPF formatado e busca por nome, CPF ou e-mail (busca %j)', async (busca, esperados) => {
    tela()
    await screen.findByText('Carla Souza')
    expect(visiveis()).toHaveLength(2)
    await userEvent.type(screen.getByLabelText('Buscar por nome, CPF ou e-mail'), busca)
    expect(visiveis()).toEqual(esperados)
    if (esperados.length === 0) expect(screen.getByText('Nenhum usuário combina com a busca.')).toBeInTheDocument()
  })
})

describe('Matrículas em 3 passos com modelo e erros por linha', () => {
  const tela = (rotas: Record<string, Rota> = {}) => {
    api({ 'GET /api/auth/me': ok(admin), ...rotas })
    abrir('/univag/matriculas')
  }

  it('Matrículas em 3 passos com modelo e erros por linha: os 3 passos numerados', async () => {
    tela()
    await screen.findByLabelText('Arquivo CSV')
    const passos = within(screen.getByRole('main')).getByRole('list')
    expect(passos.tagName).toBe('OL')
    const itens = within(passos).getAllByRole('listitem')
    expect(itens).toHaveLength(3)
    const titulos = ['Baixe o modelo', 'Preencha uma linha por aluno', 'Envie o arquivo']
    titulos.forEach((titulo, i) => {
      const n = String(i + 1)
      expect(itens[i]).toHaveTextContent(new RegExp(`^${n} ${titulo}`))
      expect(within(itens[i]).getByText(n)).toBeVisible()
      expect(within(itens[i]).getByRole('heading', { name: `${n} ${titulo}` })).toBeInTheDocument()
      expect(itens[i]).toHaveAccessibleName(new RegExp(`^${n} `))
    })
  })

  it('Matrículas em 3 passos com modelo e erros por linha: Baixar modelo baixa o CSV com o cabeçalho', async () => {
    tela()
    let blob: Blob | undefined
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => ((blob = b as Blob), 'blob:modelo'))
    URL.revokeObjectURL = vi.fn()
    const baixados: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      baixados.push(this.download)
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Baixar modelo (CSV)' }))
    expect(baixados).toHaveLength(1)
    expect(baixados[0]).toMatch(/\.csv$/)
    const texto = await new Promise<string>((resolve) => {
      const leitor = new FileReader()
      leitor.onload = () => resolve(String(leitor.result))
      leitor.readAsText(blob!)
    })
    expect(texto.split('\n')[0]).toBe('cpf;nome;email;matricula;curso;semestre;situacao')
  })

  it('Matrículas em 3 passos com modelo e erros por linha: erros com Linha N e o motivo', async () => {
    tela({ 'POST /api/admin/matriculas/importacao': () => [400, { status: 400, detail: 'Há linhas inválidas.', erros: [{ linha: 2, motivo: 'CPF inválido' }, { linha: 5, motivo: 'Semestre inválido' }] }] })
    await userEvent.upload(await screen.findByLabelText('Arquivo CSV'), new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))
    await screen.findByText('Linha 2')
    const linhas = within(screen.getByText('Linha 2').closest('ul')!).getAllByRole('listitem')
    expect(linhas).toHaveLength(2)
    for (const [i, [rotulo, motivo]] of [['Linha 2', 'CPF inválido'], ['Linha 5', 'Semestre inválido']].entries()) {
      expect(within(linhas[i]).getByText(rotulo)).toBeInTheDocument()
      expect(within(linhas[i]).getByText(motivo)).toBeInTheDocument()
    }
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
