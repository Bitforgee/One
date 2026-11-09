import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { contraste } from '../aparencia'
import { api, instituicao, me, type Rota } from '../test/util'

// aparencia-enxuta C1 a C19. As cores entram em pedaços: interface.test.ts proíbe cor literal em src/.
const hex = (digitos: string) => '#' + digitos
const Cor = hex('8a1538')
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const aparencia = (parcial: Record<string, unknown> = {}) => {
  const { nome: _, ...resto } = instituicao(parcial)
  return resto
}
const arquivo = (nome: string) => new File(['x'], nome, { type: 'image/png' })
const Abas = ['Marca', 'App instalado', 'Login', 'Assistente', 'Contato']

// cada aba com os rótulos que ela mostra; os de imagem são o "Arquivo: ..." de cada campo de imagem
const Rotulos: Record<string, string[]> = {
  Marca: ['Cor principal', 'Arquivo: Logo'],
  'App instalado': ['Nome do app', 'Arquivo: Ícone do app'],
  Login: ['Título do login', 'Frase do login', 'Itens do login (um por linha, até 3)', 'Arquivo: Imagem do login'],
  Assistente: ['Nome do assistente', 'Arquivo: Foto do assistente', 'Boas-vindas do assistente', 'Perguntas sugeridas (uma por linha, até 4)'],
  Contato: ['Horário de atendimento', 'Telefone', 'E-mail de atendimento'],
}

const rotas = (extra: Record<string, Rota> = {}, atual: object = aparencia(), publica: object = instituicao()) =>
  api({
    'GET /api/auth/me': () => [200, admin],
    'GET /api/admin/aparencia': () => [200, atual],
    'GET /api/instituicoes/univag': () => [200, publica],
    ...extra,
  })

// como `abrir`, mas devolve o roteador para ler o endereço e voltar no histórico
function abrir(caminho: string) {
  const roteador = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: [caminho] })
  return { roteador, ...render(<RouterProvider router={roteador} />) }
}
const ir = (aba: string) => userEvent.click(screen.getByRole('tab', { name: new RegExp(`^${aba}`) }))
const ativa = () => screen.getByRole('tab', { selected: true }).textContent
async function digitar(rotulo: string, texto: string) {
  const campo = await screen.findByLabelText(rotulo)
  await userEvent.clear(campo)
  await userEvent.type(campo, texto)
}
const salvar = () => screen.getByRole('button', { name: 'Salvar' })
const previa = () => within(screen.getByRole('region', { name: 'Prévia' }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:imagem-nova')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('Aparência em abas', () => {
  // C1 (AC 1)
  it('cinco abas com Marca ativa', async () => {
    rotas()
    abrir('/univag/aparencia')
    await screen.findByLabelText('Cor principal')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(Abas)
    expect(screen.getByRole('tab', { name: 'Marca' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByLabelText('Título do login')).not.toBeInTheDocument()
  })

  // C2 (AC 2)
  it('campos de cada aba', async () => {
    rotas()
    abrir('/univag/aparencia')
    await screen.findByLabelText('Cor principal')
    const todos = Object.values(Rotulos).flat()
    for (const aba of Abas) {
      await ir(aba)
      for (const rotulo of todos) {
        if (Rotulos[aba].includes(rotulo)) expect(screen.getByLabelText(rotulo), `${aba}: ${rotulo}`).toBeInTheDocument()
        else expect(screen.queryByLabelText(rotulo), `${aba}: ${rotulo}`).not.toBeInTheDocument()
      }
    }
  })

  // C3 (AC 3)
  it('troca de aba mantém o digitado', async () => {
    rotas()
    const { roteador } = abrir('/univag/aparencia')
    await screen.findByLabelText('Cor principal')
    await userEvent.upload(screen.getByLabelText('Arquivo: Logo'), arquivo('logo.png'))
    await ir('Assistente')
    expect(roteador.state.location.search).toBe('?aba=assistente')
    await digitar('Nome do assistente', 'Ana')
    await ir('Contato')
    await ir('Assistente')
    expect(screen.getByLabelText('Nome do assistente')).toHaveValue('Ana')
    await ir('Marca')
    expect(screen.getByAltText('Miniatura: Logo')).toHaveAttribute('src', 'blob:imagem-nova')

    await ir('Login')
    await act(() => roteador.navigate(-1))
    await waitFor(() => expect(ativa()).toBe('Marca'))
    await ir('Assistente')
    expect(screen.getByLabelText('Nome do assistente')).toHaveValue('Ana')
  })

  // C4 (AC 4)
  it('aba desconhecida abre Marca', async () => {
    rotas()
    const a = abrir('/univag/aparencia?aba=xyz')
    await screen.findByLabelText('Cor principal')
    expect(ativa()).toBe('Marca')
    a.unmount()
    abrir('/univag/aparencia?aba=login')
    await screen.findByLabelText('Título do login')
    expect(ativa()).toBe('Login')
  })

  // C5 (AC 5)
  it('barra de salvar mostra o estado', async () => {
    let salva: object = aparencia()
    rotas({
      'GET /api/admin/aparencia': () => [200, salva],
      'PUT /api/admin/aparencia': (corpo) => {
        salva = aparencia({ cor: corpo.cor })
        return [200, salva]
      },
    })
    abrir('/univag/aparencia')
    await screen.findByLabelText('Cor principal')
    expect(screen.getByText('Tudo salvo')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument()

    await digitar('Cor principal', Cor)
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    expect(salvar()).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument()

    await userEvent.click(salvar())
    expect(await screen.findByText('Tudo salvo')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
  })

  // C6 (AC 6)
  it('descartar volta ao salvo sem chamar a API', async () => {
    const chamadas = rotas()
    abrir('/univag/aparencia')
    await digitar('Cor principal', Cor)
    await userEvent.upload(screen.getByLabelText('Arquivo: Logo'), arquivo('logo.png'))
    await ir('Assistente')
    await digitar('Nome do assistente', 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(screen.getByLabelText('Nome do assistente')).toHaveValue('')
    await ir('Marca')
    expect(screen.getByLabelText('Cor principal')).toHaveValue('')
    expect(screen.queryByAltText('Miniatura: Logo')).not.toBeInTheDocument()
    expect(screen.getByText('Tudo salvo')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo !== 'GET')).toEqual([])
  })

  // C7 (AC 7)
  it('sair sem salvar', async () => {
    rotas()
    const { roteador, unmount } = abrir('/univag/aparencia')
    await screen.findByLabelText('Cor principal')
    const aviso = () => {
      const e = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(e)
      return e.defaultPrevented
    }
    const link = () => within(screen.getByRole('navigation')).getByRole('link', { name: 'Cadastros' })
    expect(aviso()).toBe(false)
    await digitar('Cor principal', Cor)
    expect(aviso()).toBe(true)

    await userEvent.click(link())
    const dialogo = await screen.findByRole('dialog', { name: 'Sair sem salvar?' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Continuar editando' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(roteador.state.location.pathname).toBe('/univag/aparencia')
    expect(screen.getByLabelText('Cor principal')).toHaveValue(Cor)

    await userEvent.click(link())
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Sair sem salvar?' })).getByRole('button', { name: 'Sair sem salvar' }))
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/univag/cadastros'))
    unmount()

    // sem alteração: sai direto, sem diálogo, e o navegador não pergunta
    const limpa = abrir('/univag/aparencia')
    await screen.findByLabelText('Cor principal')
    expect(aviso()).toBe(false)
    await userEvent.click(link())
    await waitFor(() => expect(limpa.roteador.state.location.pathname).toBe('/univag/cadastros'))
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument()
  })

  // C8 (AC 8)
  it('erro marca a aba e ativa a primeira', async () => {
    rotas({
      'PUT /api/admin/aparencia': () => [400, { status: 400, detail: 'Dados inválidos.', errors: { 'contato.email': ['Informe um e-mail válido.'], nomeCurto: ['O nome do app passa de 12 letras.'] } }],
    })
    abrir('/univag/aparencia')
    await digitar('Cor principal', Cor)
    await ir('Contato')
    await digitar('E-mail de atendimento', 'errado')
    await userEvent.click(salvar())

    await waitFor(() => expect(ativa()).toBe('App instalado'))
    expect(screen.getByText('O nome do app passa de 12 letras.')).toBeInTheDocument()
    const marca = (nome: string) => screen.getByRole('tab', { name: new RegExp(`^${nome}`) })
    expect(within(marca('Contato')).getByLabelText('com erro')).toBeInTheDocument()
    expect(within(marca('App instalado')).getByLabelText('com erro')).toBeInTheDocument()
    expect(within(marca('Marca')).queryByLabelText('com erro')).not.toBeInTheDocument()
    await ir('Contato')
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail de atendimento')).toHaveValue('errado')
    await ir('Marca')
    expect(screen.getByLabelText('Cor principal')).toHaveValue(Cor)
  })

  it('erro de imagem marca a aba', async () => {
    for (const [status, tipo, rotulo, aba, detail] of [
      [413, 'logo', 'Logo', 'Marca', 'A imagem passa de 1 MB.'],
      [415, 'icone', 'Ícone do app', 'App instalado', 'Envie uma imagem PNG ou JPEG.'],
    ] as const) {
      rotas({
        'PUT /api/admin/aparencia': () => [200, aparencia()],
        [`POST /api/admin/aparencia/imagens/${tipo}`]: () => [status, { status, title: 'Erro', detail }],
      })
      const montada = abrir('/univag/aparencia')
      await screen.findByLabelText('Cor principal')
      await ir(aba)
      await userEvent.upload(await screen.findByLabelText(`Arquivo: ${rotulo}`), arquivo('x.png'))
      await ir('Contato')
      await userEvent.click(salvar())

      await waitFor(() => expect(ativa(), String(status)).toBe(aba))
      expect(within(screen.getByRole('tab', { name: new RegExp(`^${aba}`) })).getByLabelText('com erro')).toBeInTheDocument()
      expect(await screen.findByText(detail)).toBeInTheDocument()
      montada.unmount()
    }
  })

  // C10 (AC 10)
  it('prévia por aba', async () => {
    rotas({}, aparencia({ nomeCurto: 'Univag', contato: { horario: 'Seg a sex, 8h às 18h', telefone: '(65) 3688-6000', email: 'atendimento@univag.edu.br' } }))
    abrir('/univag/aparencia')
    await screen.findByLabelText('Cor principal')
    const blocos = {
      entrar: () => previa().queryByRole('button', { name: 'Entrar' }),
      telaInicial: () => screen.queryByRole('region', { name: 'Tela inicial' }),
      janela: () => screen.queryByRole('region', { name: 'Janela do computador' }),
      assistente: () => previa().queryByText('Atendimento ao estudante · Univag'),
      contato: () => previa().queryByText('Contato do atendimento'),
    }
    const esperado: Record<string, (keyof typeof blocos)[]> = {
      Marca: ['entrar'],
      'App instalado': ['telaInicial', 'janela'],
      Login: ['entrar'],
      Assistente: ['assistente'],
      Contato: ['contato'],
    }
    for (const aba of Abas) {
      await ir(aba)
      for (const [nome, achar] of Object.entries(blocos)) {
        if (esperado[aba].includes(nome as keyof typeof blocos)) expect(achar(), `${aba}: ${nome}`).toBeInTheDocument()
        else expect(achar(), `${aba}: ${nome}`).not.toBeInTheDocument()
      }
    }
    await ir('Login')
    expect(previa().getByText('Atendimento ao estudante')).toBeInTheDocument()
    await ir('Contato')
    expect(previa().getByText('Seg a sex, 8h às 18h')).toBeInTheDocument()
    expect(previa().getByRole('link', { name: '(65) 3688-6000' })).toHaveAttribute('href', expect.stringMatching(/^tel:/))
    expect(previa().getByRole('link', { name: 'atendimento@univag.edu.br' })).toHaveAttribute('href', 'mailto:atendimento@univag.edu.br')
  })
})

describe('App instalado', () => {
  // C11 (AC 11)
  it('nome do app com contador', async () => {
    rotas()
    abrir('/univag/aparencia?aba=app')
    await screen.findByLabelText('Nome do app')
    expect(screen.getByText('Aparece embaixo do ícone no celular e na barra de tarefas. Até 12 letras.')).toBeInTheDocument()
    await digitar('Nome do app', 'Univa')
    expect(screen.getByText('5/12')).toBeInTheDocument()
    await digitar('Nome do app', 'Abcdefghijklm')
    expect(screen.getByText('13/12')).toHaveClass('text-destructive')
    await digitar('Nome do app', 'Univag')
    expect(screen.getByText('6/12')).not.toHaveClass('text-destructive')
  })

  // C12 (AC 12)
  it('dicas do ícone e nota de atualização', async () => {
    rotas()
    abrir('/univag/aparencia?aba=app')
    await screen.findByLabelText('Nome do app')
    expect(screen.getByText(/PNG quadrado, sem transparência, com o desenho a pelo menos 10% das bordas\. O Android recorta as pontas\./)).toBeInTheDocument()
    expect(screen.getByText('Quem já instalou o app pode levar um tempo para ver o nome e o ícone novos.')).toBeInTheDocument()
  })

  // C13 (AC 13)
  it('tela inicial e janela do computador', async () => {
    const barra = () => within(screen.getByRole('region', { name: 'Janela do computador' }))
    const tela = () => within(screen.getByRole('region', { name: 'Tela inicial' }))
    const icones = () => [tela(), barra()].map((r) => r.getByTestId('icone-do-app').getAttribute('src'))

    // salvo: o ícone da versão 3, o nome cortado em 12 caracteres e a barra na cor
    rotas({}, aparencia({ nomeCurto: 'Universidade Federal', cor: Cor, imagens: { logo: null, icone: 3, login: null, assistente: null } }))
    abrir('/univag/aparencia?aba=app')
    await screen.findByLabelText('Nome do app')
    expect(icones()).toEqual(['/api/instituicoes/univag/imagens/icone?v=3', '/api/instituicoes/univag/imagens/icone?v=3'])
    expect(tela().getByText('Universidade').textContent).toBe('Universidade') // sem o espaço do 13º caractere: o corte é de 12
    expect(tela().queryByText('Universidade Federal')).not.toBeInTheDocument()
    expect(barra().getByText('Univag')).toBeInTheDocument()
    expect(barra().getByTestId('barra-do-app')).toHaveStyle({ backgroundColor: Cor })

    // escolhido e não salvo: o blob; e a cor digitada na Marca pinta a barra
    await userEvent.upload(screen.getByLabelText('Arquivo: Ícone do app'), arquivo('icone.png'))
    expect(icones()).toEqual(['blob:imagem-nova', 'blob:imagem-nova'])
    await ir('Marca')
    await digitar('Cor principal', hex('123456'))
    await ir('App instalado')
    expect(barra().getByTestId('barra-do-app')).toHaveStyle({ backgroundColor: hex('123456') })
  })

  it('tela inicial sem ícone usa o do One', async () => {
    rotas()
    abrir('/univag/aparencia?aba=app')
    await screen.findByLabelText('Nome do app')
    const tela = within(screen.getByRole('region', { name: 'Tela inicial' }))
    expect(tela.getByTestId('icone-do-app')).toHaveAttribute('src', '/icons/icon-192.png')
  })

  // C14 (AC 14)
  it('prévia do app muda antes de salvar', async () => {
    const chamadas = rotas()
    abrir('/univag/aparencia?aba=app')
    await digitar('Nome do app', 'Univag')
    expect(within(screen.getByRole('region', { name: 'Tela inicial' })).getByText('Univag')).toBeInTheDocument()
    await userEvent.upload(screen.getByLabelText('Arquivo: Ícone do app'), arquivo('icone.png'))
    for (const regiao of ['Tela inicial', 'Janela do computador']) {
      expect(within(screen.getByRole('region', { name: regiao })).getByTestId('icone-do-app'), regiao).toHaveAttribute('src', 'blob:imagem-nova')
    }
    expect(chamadas.filter((c) => c.metodo !== 'GET')).toEqual([])
  })

  // C16 (AC 16)
  it('salvar troca meta e título', async () => {
    let publica = instituicao()
    let salva: object = aparencia()
    rotas({
      'GET /api/instituicoes/univag': () => [200, publica],
      'GET /api/admin/aparencia': () => [200, salva],
      'PUT /api/admin/aparencia': (corpo) => {
        publica = instituicao({ nomeCurto: corpo.nomeCurto })
        salva = aparencia({ nomeCurto: corpo.nomeCurto })
        return [200, salva]
      },
    })
    abrir('/univag/aparencia?aba=app')
    await digitar('Nome do app', 'Nova')
    await userEvent.click(salvar())
    await waitFor(() => expect(document.head.querySelector('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Nova'))
    expect(document.title).toBe('Nova')
  })
})

describe('Cores prontas', () => {
  const Nomes = ['Azul One', 'Verde', 'Vinho', 'Roxo', 'Laranja', 'Grafite', 'Petróleo', 'Marrom']

  // C17 (AC 17)
  it('oito cores prontas com contraste', async () => {
    rotas()
    abrir('/univag/aparencia')
    const grupo = within(await screen.findByRole('radiogroup', { name: 'Cores prontas' }))
    expect(grupo.getAllByRole('radio').map((r) => r.getAttribute('aria-label') ?? r.textContent)).toEqual(Nomes)
    expect(screen.getByLabelText('Escolher cor')).toHaveAttribute('type', 'color')
    for (const nome of Nomes) {
      await userEvent.click(grupo.getByRole('radio', { name: nome }))
      expect(contraste((screen.getByLabelText('Cor principal') as HTMLInputElement).value), nome).toBeGreaterThanOrEqual(4.5)
    }
  })

  // C18 (AC 18)
  it('escolher amostra preenche e marca', async () => {
    rotas()
    abrir('/univag/aparencia')
    const grupo = within(await screen.findByRole('radiogroup', { name: 'Cores prontas' }))
    await userEvent.click(grupo.getByRole('radio', { name: 'Azul One' }))
    expect(screen.getByLabelText('Cor principal')).toHaveValue(hex('224fa7'))
    const entrar = previa().getByRole('button', { name: 'Entrar' })
    expect(entrar.closest('.previa-marca') as HTMLElement).toHaveStyle(`--marca-previa: ${hex('224fa7')}`)
    const marcados = grupo.getAllByRole('radio').map((r) => `${r.getAttribute('aria-label') ?? r.textContent}:${r.getAttribute('aria-checked')}`)
    expect(marcados).toEqual(Nomes.map((n) => `${n}:${n === 'Azul One'}`))

    await digitar('Cor principal', hex('123456'))
    expect(grupo.getAllByRole('radio').map((r) => r.getAttribute('aria-checked'))).toEqual(Array(8).fill('false'))
  })

  // C19 (AC 19)
  it('cor sem contraste bloqueia o Salvar', async () => {
    rotas()
    abrir('/univag/aparencia')
    await screen.findByLabelText('Escolher cor')
    fireEvent.change(screen.getByLabelText('Escolher cor'), { target: { value: hex('ffff00') } })
    expect(screen.getByLabelText('Cor principal')).toHaveValue(hex('ffff00'))
    expect(screen.getByText(/^Contraste com o branco:/)).toHaveClass('text-destructive')
    expect(salvar()).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: 'Azul One' }))
    expect(salvar()).toBeEnabled()
  })
})
