import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, instituicao, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const Perguntas = ['Como pago a mensalidade?', 'Quando abre a rematrícula?', 'Onde vejo minhas notas?', 'Como peço o histórico?']
const aparencia = (login: number | null) => {
  const { nome: _, ...resto } = instituicao({
    nomeCurto: 'Univag',
    login: { titulo: 'Fale com a Univag', frase: 'Aqui você resolve tudo sobre a sua vida acadêmica.', itens: ['Boletos', 'Matrícula', 'Documentos'] },
    assistente: { nome: 'Vagner', boasVindas: 'Oi! Posso ajudar com boletos e matrícula.', perguntas: Perguntas },
    imagens: { logo: 3, icone: 2, login, assistente: 4 },
  })
  return resto
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:login-novo')
  URL.revokeObjectURL = vi.fn()
})

describe('Matrículas', () => {
  it('Planilha no passo 2 com as 7 colunas', async () => {
    api({ 'GET /api/auth/me': () => [200, admin] })
    let blob: Blob | undefined
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => ((blob = b as Blob), 'blob:modelo'))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    abrir('/univag/matriculas')
    await userEvent.click(await screen.findByRole('button', { name: 'Baixar modelo (CSV)' }))
    const cabecalho = (await blob!.text()).split('\n')[0].split(';')
    const passo = within(screen.getByRole('main')).getAllByRole('listitem')[1]
    expect(passo).toHaveTextContent('Preencha uma linha por aluno')
    const planilha = passo.querySelector('svg[data-ilustracao="planilha"]')!
    expect(planilha).not.toBeNull()
    expect(document.querySelectorAll('svg[data-ilustracao]')).toHaveLength(1)
    expect([...planilha.querySelectorAll('text')].map((t) => t.textContent)).toEqual(['cpf', 'nome', 'email', 'matricula', 'curso', 'semestre', 'situacao'])
    expect([...planilha.querySelectorAll('text')].map((t) => t.textContent)).toEqual(cabecalho)
  })
})

describe('prévia da Aparência', () => {
  it('prévia com o login e as boas-vindas novos', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/aparencia': () => [200, aparencia(null)], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/aparencia')
    await screen.findByLabelText('Cor principal')
    const previa = within(screen.getByRole('region', { name: 'Prévia' }))
    const regiao = screen.getByRole('region', { name: 'Prévia' })
    expect(regiao.querySelector('img[src="/api/instituicoes/univag/imagens/logo?v=3"]')).not.toBeNull()
    for (const texto of ['Univag', 'Fale com a Univag', 'Aqui você resolve tudo sobre a sua vida acadêmica.', 'Boletos', 'Matrícula', 'Documentos']) expect(previa.getByText(texto), texto).toBeInTheDocument()
    expect(previa.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(regiao.querySelector('img[src*="/imagens/login"]'), 'sem foto de login').toBeNull()

    await userEvent.click(screen.getByRole('tab', { name: 'Assistente' }))
    expect(previa.getByText('Atendimento ao estudante · Univag')).toBeInTheDocument()
    expect(previa.getByText('Oi! Posso ajudar com boletos e matrícula.')).toBeInTheDocument()
    expect(previa.getByText('Vagner, assistente virtual')).toBeInTheDocument()
    for (const pergunta of Perguntas) expect(previa.getByText(pergunta).closest('li')!.querySelector('svg.lucide-chevron-right'), pergunta).not.toBeNull()
    expect(previa.queryByText(/Olá! Eu sou/)).not.toBeInTheDocument()
    expect(regiao.querySelector('svg[data-ilustracao]')).toBeNull()

    await userEvent.click(screen.getByRole('tab', { name: 'Login' }))
    await userEvent.upload(screen.getByLabelText('Arquivo: Imagem do login'), new File(['x'], 'login.png', { type: 'image/png' }))
    expect(regiao.querySelector('img[src="blob:login-novo"]'), 'com a foto escolhida no formulário').not.toBeNull()
  })
})
