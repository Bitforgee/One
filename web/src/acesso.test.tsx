import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import pacote from '../package.json'
import { formatarData } from './datas'
import { abrir, api, me } from './test/util'

const instituicao = { 'GET /api/instituicoes/univag': () => [200, { nome: 'Univag' }] as [number, unknown] }

async function entrar() {
  await userEvent.type(await screen.findByLabelText('CPF'), '123.456.789-09')
  await userEvent.type(screen.getByLabelText('Senha'), 'senha-boa-123')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('acesso', () => {
  it('login mostra o nome da instituição', async () => {
    api(instituicao)
    abrir('/univag')
    expect(await screen.findByText(/Univag/)).toBeInTheDocument()
    expect(screen.getByLabelText('CPF')).toBeInTheDocument()
  })

  it('slug desconhecido mostra Instituição não encontrada', async () => {
    api({ 'GET /api/instituicoes/nada': () => [404, { status: 404, detail: 'Instituição não encontrada.' }] })
    abrir('/nada')
    expect(await screen.findByText('Instituição não encontrada.')).toBeInTheDocument()
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument()
  })

  it('formata data no fuso da instituição', () => {
    expect(formatarData('2026-11-02T02:30:00Z', 'America/Cuiaba')).toBe('01/11/2026 22:30')
  })

  it('deveTrocarSenha abre Trocar senha', async () => {
    api({ 'GET /api/auth/me': () => [200, me({ deveTrocarSenha: true })] })
    abrir('/univag/assistente')
    expect(await screen.findByRole('heading', { name: 'Trocar senha' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Assistente' })).not.toBeInTheDocument()
  })

  it('tela inicial por papel', async () => {
    for (const [papeis, tela] of [
      [['ALUNO'], 'Assistente'],
      [['ATENDENTE'], 'Fila'],
      [['ADMINISTRADOR'], 'Artigos'],
    ] as const) {
      api({
        ...instituicao,
        'POST /api/auth/login': () => [200, { id: 1, nome: 'Ana', papeis, deveTrocarSenha: false, instituicao: { slug: 'univag', nome: 'Univag' } }],
        'GET /api/auth/me': () => [200, me({ papeis: [...papeis] })],
      })
      const { unmount } = abrir('/univag')
      await entrar()
      expect(await screen.findByRole('heading', { name: tela })).toBeInTheDocument()
      unmount()
    }

    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE', 'ADMINISTRADOR'] })] })
    abrir('/univag/fila')
    const menu = within(await screen.findByRole('navigation'))
    expect(menu.getByRole('link', { name: /Fila/ })).toBeInTheDocument()
    expect(menu.getByRole('link', { name: /Artigos/ })).toBeInTheDocument()
    expect(menu.queryByRole('link', { name: /Assistente/ })).not.toBeInTheDocument()
  })

  it('erro mostra detail num Alert', async () => {
    api({ ...instituicao, 'POST /api/auth/login': () => [401, { status: 401, title: 'Não autenticado', detail: 'CPF ou senha inválidos.' }] })
    abrir('/univag')
    await entrar()
    expect(await screen.findByRole('alert')).toHaveTextContent('CPF ou senha inválidos.')
    expect(screen.getByRole('alert')).toHaveClass('alert', 'alert-danger')
  })

  it('requisição pendente mostra Spinner e desabilita o botão', async () => {
    api({ ...instituicao, 'POST /api/auth/login': () => new Promise(() => {}) })
    abrir('/univag')
    await entrar()
    await waitFor(() => expect(screen.getByRole('button', { name: /Entrar/ })).toBeDisabled())
    expect(within(screen.getByRole('button', { name: /Entrar/ })).getByRole('status')).toHaveClass('spinner-border')
  })

  it('cabeçalho mostra a instituição', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/assistente')
    const cabecalho = await screen.findByRole('navigation')
    expect(within(cabecalho).getByText('Univag')).toBeInTheDocument()
  })

  it('dependências do kit de interface', () => {
    const todas = { ...pacote.dependencies, ...pacote.devDependencies } as Record<string, string>
    expect(todas['bootstrap']).toBe('5.3.8')
    expect(todas['react-bootstrap']).toBe('2.10.10')
    expect(todas['bootstrap-icons']).toBe('1.13.2')
    expect(todas['react-router']).toMatch(/^\^?8\./)
    expect(todas['vite-plugin-pwa']).toBe('2.0.0')
  })
})
