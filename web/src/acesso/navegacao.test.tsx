import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { abrir, api, instituicao, me, type Rota } from '../test/util'

const celular = () =>
  vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media === '(max-width: 767px)', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))

const Chave = 'BAEC'
const Contato = { horario: 'Seg a sex, 8h às 18h', telefone: '(65) 3688-6000', email: null }
const aluno = { 'GET /api/auth/me': () => [200, me()] as [number, unknown], 'GET /api/instituicoes/univag': () => [200, instituicao()] as [number, unknown] }

function comPush(chave = 200) {
  const inscricao = { endpoint: 'https://push.teste/abc', unsubscribe: vi.fn(async () => true), toJSON: () => ({ endpoint: 'https://push.teste/abc', keys: { p256dh: 'P', auth: 'A' } }) }
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => null, subscribe: async () => inscricao } }) } })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { requestPermission: async () => 'granted' })
  return { 'GET /api/push/chave': () => (chave === 200 ? [200, { chavePublica: Chave }] : [chave, chave === 204 ? undefined : { status: chave, detail: 'x' }]) } as Record<string, Rota>
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker')
  localStorage.clear()
  document.documentElement.className = ''
})

describe('barra de abas do aluno', () => {
  it.each([
    ['assistente', 0],
    ['solicitacoes', 1],
    ['conta', 2],
  ])('barra de abas do aluno com 3 destinos e o ativo marcado (%s)', async (rota, ativo) => {
    celular()
    api({ ...aluno, 'GET /api/chamados?escopo=meus': () => [200, []] })
    abrir(`/univag/${rota}`)
    const nav = await screen.findByRole('navigation', { name: 'Navegação' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Assistente', '/univag/assistente'],
      ['Solicitações', '/univag/solicitacoes'],
      ['Conta', '/univag/conta'],
    ])
    expect(links.map((l) => l.getAttribute('aria-current'))).toEqual(links.map((_, i) => (i === ativo ? 'page' : null)))
  })
})

describe('Conta', () => {
  const linhas = () => screen.getAllByRole('listitem').map((li) => li.textContent)

  it.each([
    ['com push e contato', { push: 200, contato: Contato }, ['Tema', 'Avisos no celular', 'Contato do atendimento', 'Trocar senha', 'Sair']],
    ['sem push', { push: 204, contato: Contato }, ['Tema', 'Contato do atendimento', 'Trocar senha', 'Sair']],
    ['sem contato', { push: 200, contato: { horario: null, telefone: null, email: null } }, ['Tema', 'Avisos no celular', 'Trocar senha', 'Sair']],
  ])('Conta lista as linhas na ordem e só com push e contato (%s)', async (_, { push, contato }, esperadas) => {
    celular()
    api({ ...aluno, ...comPush(push), 'GET /api/instituicoes/univag': () => [200, instituicao({ contato })] })
    abrir('/univag/conta')
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('***.456.789-**')).toBeInTheDocument()
    expect(document.querySelector('main')!.textContent).not.toContain('@')
    if (esperadas.includes('Avisos no celular')) await screen.findByText('Avisos no celular')
    else await new Promise((r) => setTimeout(r, 50)) // dá tempo da chave 404 chegar
    await waitFor(() => expect(linhas().map((l, i) => l!.startsWith(esperadas[i]))).toEqual(esperadas.map(() => true)))
    expect(linhas()).toHaveLength(esperadas.length)
  })

  describe('linhas da Conta agem', () => {
    it('Tema abre a escolha e Escuro grava one-tema', async () => {
      celular()
      api(aluno)
      abrir('/univag/conta')
      await userEvent.click(within(await screen.findByRole('list')).getByRole('button', { name: /^Tema/ })) // o topo também tem um botão Tema
      const popover = document.querySelector('[data-slot=popover-content]') as HTMLElement
      expect(within(popover).getAllByRole('button').map((b) => b.textContent)).toEqual(['Claro', 'Escuro', 'Preto', 'Sistema'])
      await userEvent.click(within(popover).getByRole('button', { name: 'Escuro' }))
      expect(localStorage.getItem('one-tema')).toBe('dark')
    })

    it('Avisos no celular inscreve o aparelho', async () => {
      celular()
      const chamadas = api({ ...aluno, ...comPush(), 'POST /api/push/subscricao': () => [204, undefined] })
      abrir('/univag/conta')
      await userEvent.click(await screen.findByRole('button', { name: /^Avisos no celular/ }))
      await waitFor(() => expect(chamadas.filter((c) => c.metodo === 'POST' && c.url === '/api/push/subscricao')).toHaveLength(1))
    })

    it('Contato do atendimento abre o diálogo com o contato', async () => {
      celular()
      api({ ...aluno, 'GET /api/instituicoes/univag': () => [200, instituicao({ contato: Contato })] })
      abrir('/univag/conta')
      await userEvent.click(await screen.findByRole('button', { name: /^Contato do atendimento/ }))
      const dialogo = await screen.findByRole('dialog', { name: 'Contato do atendimento' })
      expect(within(dialogo).getByText('Seg a sex, 8h às 18h')).toBeInTheDocument()
      expect(within(dialogo).getByRole('link', { name: '(65) 3688-6000' })).toHaveAttribute('href', 'tel:6536886000')
    })

    it('Trocar senha leva a trocar-senha', async () => {
      celular()
      api(aluno)
      abrir('/univag/conta')
      const link = await screen.findByRole('link', { name: /^Trocar senha/ })
      expect(link).toHaveAttribute('href', '/univag/trocar-senha')
      await userEvent.click(link)
      expect(await screen.findByLabelText('Senha atual')).toBeInTheDocument()
    })

    it('Sair faz o logout e leva ao login', async () => {
      celular()
      const chamadas = api({ ...aluno, 'POST /api/auth/logout': () => [204, undefined] })
      abrir('/univag/conta')
      await userEvent.click(await screen.findByRole('button', { name: /^Sair/ }))
      expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
      expect(chamadas.filter((c) => c.metodo === 'POST' && c.url === '/api/auth/logout')).toHaveLength(1)
    })
  })
})

describe('operador', () => {
  it.each(['fila', 'assistente', 'solicitacoes', 'indicadores', 'artigos', 'documentos', 'usuarios', 'matriculas', 'cadastros', 'aparencia', 'conta'])('operador sem outro papel vai para Instituições (/%s)', async (rota) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['OPERADOR'] })] })
    const Local = () => <output data-testid="local">{useLocation().pathname}</output>
    render(
      <MemoryRouter initialEntries={[`/univag/${rota}`]}>
        <App />
        <Local />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('/univag/instituicoes'))
  })
})
