import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAvisos } from '../AvisosPush'
import { abrir, api, instituicao, me, type Rota } from '../test/util'

const Ativar = 'Ativar avisos neste aparelho'
const Endpoint = 'https://push.teste/abc'
const Chave = 'BAEC'

function inscricao() {
  return { endpoint: Endpoint, unsubscribe: vi.fn(async () => true), toJSON: () => ({ endpoint: Endpoint, keys: { p256dh: 'P', auth: 'A' } }) }
}

type Opcoes = { sw?: boolean; push?: boolean; notif?: boolean; chave?: number; permissao?: string; existente?: boolean; papeis?: string[]; rotas?: Record<string, Rota> }

function ambiente({ sw = true, push = true, notif = true, chave = 200, permissao = 'granted', existente = false, papeis = ['ALUNO'], rotas = {} }: Opcoes = {}) {
  const nova = inscricao()
  let atual: ReturnType<typeof inscricao> | null = existente ? nova : null
  nova.unsubscribe = vi.fn(async () => ((atual = null), true))
  const subscribe = vi.fn(async () => (atual = nova))
  const requestPermission = vi.fn(async () => permissao)
  if (sw) Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => atual, subscribe } }) } })
  if (push) vi.stubGlobal('PushManager', class {})
  if (notif) vi.stubGlobal('Notification', { requestPermission })
  const chamadas = api({
    'GET /api/auth/me': () => [200, me({ papeis })],
    'GET /api/push/chave': () => (chave === 200 ? [200, { chavePublica: Chave }] : [chave, chave === 204 ? undefined : { title: 'Não encontrado', status: chave, detail: 'x' }]),
    'POST /api/push/subscricao': () => [204, undefined],
    [`DELETE /api/push/subscricao?endpoint=${encodeURIComponent(Endpoint)}`]: () => [204, undefined],
    ...rotas,
  })
  return { chamadas, nova, subscribe, requestPermission }
}

const botao = (nome: string) => screen.findByRole('button', { name: nome })

describe('avisos', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker')
    vi.unstubAllGlobals()
  })

  it.each([
    ['sem serviceWorker', { sw: false }],
    ['sem PushManager', { push: false }],
    ['sem Notification', { notif: false }],
    ['chave 204', { chave: 204 }],
  ])('botão de avisos oculto sem suporte ou sem chave (%s)', async (_, opcoes) => {
    ambiente(opcoes)
    abrir('/univag/assistente')
    await screen.findByLabelText('Mensagem')
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('button', { name: /avisos/i })).not.toBeInTheDocument()
  })

  it('push desligado com 204 esconde os avisos', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media.startsWith('(max-width: 767px)'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
    const { chamadas } = ambiente({ chave: 204, rotas: { 'GET /api/instituicoes/univag': () => [200, instituicao()], 'GET /api/chamados?escopo=meus': () => [200, []] } })
    const { unmount } = abrir('/univag/assistente')
    await screen.findByLabelText('Mensagem')
    await waitFor(() => expect(chamadas.some((c) => c.url === '/api/push/chave')).toBe(true))
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('button', { name: /avisos/i })).not.toBeInTheDocument()
    unmount()
    const conta = abrir('/univag/conta')
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText('Avisos no celular')).not.toBeInTheDocument()
    conta.unmount()
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useAvisos(), { wrapper: ({ children }) => <QueryClientProvider client={cliente}>{children}</QueryClientProvider> })
    await waitFor(() => expect(cliente.getQueryState(['push-chave'])?.status).toBe('success'))
    expect(cliente.getQueryData(['push-chave'])).toBeNull()
    expect(erro).not.toHaveBeenCalled()
    erro.mockRestore()
  })

  it('botão de avisos aparece com suporte e chave', async () => {
    ambiente()
    abrir('/univag/assistente')
    expect(await botao(Ativar)).toBeInTheDocument()
  })

  it('permissão só no toque', async () => {
    const { requestPermission } = ambiente()
    abrir('/univag/assistente')
    await botao(Ativar)
    expect(requestPermission).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: Ativar }))
    expect(requestPermission).toHaveBeenCalledTimes(1)
  })

  it('ativar assina e envia a subscrição', async () => {
    const ordem: string[] = []
    const { chamadas, requestPermission, subscribe } = ambiente({ rotas: { 'POST /api/push/subscricao': () => (ordem.push('post'), [204, undefined]) } })
    requestPermission.mockImplementation(async () => (ordem.push('permissao'), 'granted'))
    subscribe.mockImplementation(async () => (ordem.push('subscribe'), inscricao()))
    abrir('/univag/assistente')
    await userEvent.click(await botao(Ativar))
    await waitFor(() => expect(ordem).toEqual(['permissao', 'subscribe', 'post']))
    const [{ userVisibleOnly, applicationServerKey }] = subscribe.mock.calls[0] as unknown as [{ userVisibleOnly: boolean; applicationServerKey: Uint8Array }]
    expect(userVisibleOnly).toBe(true)
    expect([...applicationServerKey]).toEqual([4, 1, 2])
    expect(chamadas.find((c) => c.metodo === 'POST' && c.url === '/api/push/subscricao')?.corpo).toEqual({ endpoint: Endpoint, chaves: { p256dh: 'P', auth: 'A' } })
  })

  it('botão desabilitado enquanto a chamada corre', async () => {
    let liberar!: () => void
    const parada = new Promise<void>((r) => (liberar = r))
    ambiente({ rotas: { 'POST /api/push/subscricao': async () => (await parada, [204, undefined]) } })
    abrir('/univag/assistente')
    await userEvent.click(await botao(Ativar))
    expect(screen.getByRole('button', { name: Ativar })).toBeDisabled()
    liberar()
    expect(await botao('Desativar avisos')).toBeEnabled()
  })

  it('permissão negada bloqueia sem chamar a API', async () => {
    const { chamadas, subscribe } = ambiente({ permissao: 'denied' })
    abrir('/univag/assistente')
    await userEvent.click(await botao(Ativar))
    expect(await screen.findByText('Os avisos estão bloqueados neste navegador')).toBeInTheDocument()
    expect(subscribe).not.toHaveBeenCalled()
    expect(chamadas.filter((c) => c.url.startsWith('/api/push/subscricao'))).toEqual([])
  })

  it('desativar cancela e apaga a subscrição', async () => {
    const { chamadas, nova } = ambiente({ existente: true })
    abrir('/univag/assistente')
    await userEvent.click(await botao('Desativar avisos'))
    await waitFor(() => expect(nova.unsubscribe).toHaveBeenCalledTimes(1))
    expect(chamadas.some((c) => c.metodo === 'DELETE' && c.url === `/api/push/subscricao?endpoint=${encodeURIComponent(Endpoint)}`)).toBe(true)
    expect(await botao(Ativar)).toBeInTheDocument()
  })

  it('POST que falha depois do subscribe desfaz a inscrição e o botão volta a Ativar', async () => {
    const { nova, subscribe } = ambiente({ rotas: { 'POST /api/push/subscricao': () => [500, { title: 'Erro', status: 500, detail: 'Falha no servidor' }] } })
    abrir('/univag/assistente')
    await userEvent.click(await botao(Ativar))
    expect(await screen.findByText('Falha no servidor')).toBeInTheDocument()
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(nova.unsubscribe).toHaveBeenCalledTimes(1)
    expect(await botao(Ativar)).toBeEnabled()
  })

  it('no cabeçalho o botão de avisos é um ícone com nome acessível e alterna', async () => {
    ambiente({ papeis: ['ALUNO', 'ATENDENTE'] })
    abrir('/univag/assistente')
    const item = await botao(Ativar)
    expect(item.closest('header')).not.toBeNull()
    expect(item.closest('[data-sidebar=sidebar]')).toBeNull()
    expect(item.textContent).toBe('')
    await userEvent.click(item)
    expect(await botao('Desativar avisos')).toBeInTheDocument()
  })

  it.each([
    [['ALUNO'], true],
    [['ALUNO', 'ATENDENTE'], true],
    [['ATENDENTE'], false],
    [['ADMINISTRADOR'], false],
  ])('botão de avisos só para o papel de aluno (%j)', async (papeis, aparece) => {
    const { chamadas } = ambiente({ papeis })
    abrir('/univag/assistente')
    if (aparece) {
      expect(await botao(Ativar)).toBeInTheDocument()
      return
    }
    await waitFor(() => expect(chamadas.some((c) => c.url === '/api/auth/me')).toBe(true))
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('button', { name: /avisos/i })).not.toBeInTheDocument()
  })
})
