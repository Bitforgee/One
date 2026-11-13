import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me } from '../test/util'
import type { IdAba } from './abasDaAparencia'
import { PreviaAparencia, type DadosDaPrevia } from './PreviaAparencia'

const Nome = 'Universidade de Várzea Grande com um nome institucional bem comprido'
const Telefone = '(65) 3688-6000'
const Email = 'atendimento.com.um.endereco.muito.comprido@univag.edu.br'
const Perguntas = ['Como emito a segunda via do boleto de matrícula?', 'Quando começa a rematrícula?']

const dados = (aba: IdAba): DadosDaPrevia => ({
  aba,
  nome: Nome,
  nomeCurto: '',
  cor: '',
  loginTitulo: '',
  loginFrase: '',
  loginItens: [],
  assistenteNome: 'Vagner',
  boasVindas: '',
  perguntas: Perguntas,
  contatoHorario: 'Seg a sex',
  contatoTelefone: Telefone,
  contatoEmail: Email,
  imagens: {},
})

const abas: IdAba[] = ['marca', 'app', 'login', 'assistente', 'contato']
const quebra = (no: HTMLElement) => {
  expect(no).toHaveClass('min-w-0')
  expect(no).toHaveClass('break-words')
}

describe('prévia da aparência não interativa', () => {
  it.each(abas)('C49 a raiz da aba %s tem inert e aria-hidden e nenhum link tel: ou mailto:', (aba) => {
    const { container } = render(<PreviaAparencia dados={dados(aba)} />)
    const raiz = container.firstElementChild as HTMLElement
    expect(raiz).toHaveAttribute('inert')
    expect(raiz).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('a[href^="tel:"], a[href^="mailto:"]')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })

  it('C49 telefone e e-mail aparecem como texto em span', () => {
    render(<PreviaAparencia dados={dados('contato')} />)
    expect(screen.getByText(Telefone).tagName).toBe('SPAN')
    expect(screen.getByText(Email).tagName).toBe('SPAN')
  })

  it('C49 na tela Aparência a prévia continua inerte e escondida', async () => {
    const { nome: _, ...resto } = instituicao({ contato: { horario: 'Seg a sex', telefone: Telefone, email: 'a@univag.edu.br' } })
    api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ADMINISTRADOR'], matriculas: [] })],
      'GET /api/admin/aparencia': () => [200, resto],
      'GET /api/instituicoes/univag': () => [200, instituicao()],
    })
    abrir('/univag/aparencia')
    await userEvent.click(await screen.findByRole('tab', { name: /^Contato/ }))
    const regiao = await screen.findByRole('region', { name: 'Prévia' })
    const raiz = regiao.querySelector('[inert]')
    expect(raiz).toHaveAttribute('aria-hidden', 'true')
    expect(regiao.querySelector('a[href^="tel:"], a[href^="mailto:"]')).toBeNull()
  })

  it('C50 o nome tem min-w-0 e break-words', () => {
    render(<PreviaAparencia dados={dados('login')} />)
    quebra(screen.getByText(Nome))
  })

  it('C50 as perguntas têm min-w-0 e break-words', () => {
    render(<PreviaAparencia dados={dados('assistente')} />)
    for (const p of Perguntas) quebra(screen.getByText(p))
  })

  it('C50 telefone e e-mail têm min-w-0 e break-words', () => {
    render(<PreviaAparencia dados={dados('contato')} />)
    quebra(screen.getByText(Telefone))
    quebra(screen.getByText(Email))
  })
})
