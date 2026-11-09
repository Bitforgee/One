import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me } from '../test/util'

const sessaoAusente = () => {
  throw new TypeError('Failed to fetch')
}

const leituras = (chamadas: { url: string }[]) => chamadas.filter((c) => c.url === '/api/auth/me').length

const refocar = () => {
  window.dispatchEvent(new Event('focus'))
  window.dispatchEvent(new Event('visibilitychange'))
  document.dispatchEvent(new Event('visibilitychange'))
}

const indisponivel = 'Não foi possível carregar sua sessão. O serviço está indisponível no momento.'
const muitas = 'Não foi possível carregar sua sessão. Muitas tentativas. Aguarde um minuto e tente de novo.'
const proibido = 'Não foi possível carregar sua sessão. Você não tem permissão para esta ação.'

describe('sessão com falha do servidor', () => {
  it.each([
    [403, { status: 403, detail: 'Sem permissão.' }, proibido, false],
    [429, { status: 429, detail: 'Muitas.' }, muitas, true],
    [500, { status: 500, detail: 'Erro.' }, indisponivel, true],
    [502, undefined, indisponivel, true],
    [503, undefined, indisponivel, true],
    [504, undefined, indisponivel, true],
  ])('status do /me %i', async (status, corpo, texto, tentar) => {
    const chamadas = api({ 'GET /api/auth/me': () => [status, corpo], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/solicitacoes')
    expect(await screen.findByText(texto)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' }) !== null).toBe(tentar)
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(leituras(chamadas)).toBe(1)
    refocar()
    await new Promise((r) => setTimeout(r, 50))
    expect(leituras(chamadas)).toBe(1)
    expect(new Set(chamadas.map((c) => c.url))).toEqual(new Set(['/api/auth/me', '/api/instituicoes/univag']))
    expect(screen.queryByRole('button', { name: 'Alternar barra lateral' })).not.toBeInTheDocument()
  })

  it('falha transitória sem nova tentativa', async () => {
    let n = 0
    const chamadas = api({
      'GET /api/auth/me': () => (n++ === 0 ? [503, undefined] : [200, me()]),
      'GET /api/instituicoes/univag': () => [200, instituicao()],
      'GET /api/chamados': () => [200, []],
    })
    abrir('/univag/solicitacoes')
    expect(await screen.findByText(indisponivel)).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 1500))
    refocar()
    await new Promise((r) => setTimeout(r, 50))
    expect(leituras(chamadas)).toBe(1)
    expect(screen.getByText(indisponivel)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Minhas solicitações' })).not.toBeInTheDocument()
  })

  it.each([
    [429, muitas],
    [503, indisponivel],
  ])('recupera a sessão depois do %i', async (status, texto) => {
    let n = 0
    const chamadas = api({
      'GET /api/auth/me': () => (n++ === 0 ? [status, undefined] : [200, me()]),
      'GET /api/instituicoes/univag': () => [200, instituicao()],
      'GET /api/chamados': () => [200, []],
    })
    abrir('/univag/solicitacoes')
    const botao = await screen.findByRole('button', { name: 'Tentar de novo' })
    expect(screen.getByText(texto)).toBeInTheDocument()
    expect(leituras(chamadas)).toBe(1)
    await userEvent.click(botao)
    expect(await screen.findByRole('heading', { name: 'Minhas solicitações' })).toBeInTheDocument()
    expect(screen.queryByText(texto)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument()
    expect(leituras(chamadas)).toBe(2)
  })
})

describe('sessão sem rede', () => {
  it('sem rede mostra a conexão e não vai para o login', async () => {
    api({ 'GET /api/auth/me': sessaoAusente, 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/solicitacoes')
    expect(await screen.findByText(/Verifique sua conexão/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument()
    expect(screen.queryByText('Instituição não encontrada.')).not.toBeInTheDocument()
  })

  it('401 vai para o login', async () => {
    const chamadas = api({ 'GET /api/auth/me': () => [401, { status: 401, detail: 'Entre para continuar.' }], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/solicitacoes')
    expect(await screen.findByLabelText('CPF')).toBeInTheDocument()
    expect(leituras(chamadas)).toBe(1)
  })

  it('tentar de novo repete a leitura da sessão', async () => {
    let chamadas = 0
    api({
      'GET /api/auth/me': () => {
        if (chamadas++ === 0) return sessaoAusente()
        return [200, me()]
      },
      'GET /api/instituicoes/univag': () => [200, instituicao()],
      'GET /api/chamados': () => [200, []],
    })
    abrir('/univag/solicitacoes')
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByText(/Verifique sua conexão/)).not.toBeInTheDocument()
    expect(chamadas).toBe(2)
  })
})
