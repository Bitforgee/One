import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const Ativar = 'Ativar avisos neste aparelho'
const Endpoint = 'https://push.teste/abc'
const Chave = 'BAEC' // base64url de 3 bytes: 0x04 0x01 0x02

function inscricao() {
  return { endpoint: Endpoint, unsubscribe: vi.fn(async () => true), toJSON: () => ({ endpoint: Endpoint, keys: { p256dh: 'P', auth: 'A' } }) }
}

type Opcoes = { sw?: boolean; push?: boolean; notif?: boolean; chave?: number; permissao?: string; existente?: boolean; papeis?: string[]; rotas?: Record<string, Rota> }

// Monta o navegador (service worker, PushManager, Notification) e a API; devolve o que o código chamou.
function ambiente({ sw = true, push = true, notif = true, chave = 200, permissao = 'granted', existente = false, papeis = ['ALUNO'], rotas = {} }: Opcoes = {}) {
  const nova = inscricao()
  let atual: ReturnType<typeof inscricao> | null = existente ? nova : null
  const subscribe = vi.fn(async () => (atual = nova))
  const requestPermission = vi.fn(async () => permissao)
  if (sw) Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => atual, subscribe } }) } })
  if (push) vi.stubGlobal('PushManager', class {})
  if (notif) vi.stubGlobal('Notification', { requestPermission })
  const chamadas = api({
    'GET /api/auth/me': () => [200, me({ papeis })],
    'GET /api/push/chave': () => (chave === 200 ? [200, { chavePublica: Chave }] : [chave, { title: 'Não encontrado', status: chave, detail: 'x' }]),
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
    ['chave 404', { chave: 404 }],
  ])('botão de avisos oculto sem suporte ou sem chave (%s)', async (_, opcoes) => {
    ambiente(opcoes)
    abrir('/univag/assistente')
    await screen.findByLabelText('Mensagem')
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('button', { name: /avisos/i })).not.toBeInTheDocument()
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
