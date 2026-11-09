import { describe, expect, it, vi } from 'vitest'
import { aoReceberPush, aoTocar, Negados } from './sw'

const url = '/univag/chamados/ONE-12'

function push(dados: string | null) {
  const mostrar = vi.fn(async () => undefined)
  const espera = vi.fn()
  aoReceberPush({ data: dados === null ? null : { text: () => dados }, waitUntil: espera }, { showNotification: mostrar })
  return { mostrar, espera }
}

describe('service worker', () => {
  it('push mostra a notificação com a tag do chamado', () => {
    const corpo = (n: string) => JSON.stringify({ titulo: 'One', corpo: `Seu chamado ${n} foi atualizado.`, url: `/univag/chamados/${n}` })
    const a = push(corpo('ONE-12'))
    expect(a.mostrar).toHaveBeenCalledWith('One', { body: 'Seu chamado ONE-12 foi atualizado.', icon: '/icons/icon-192.png', tag: 'ONE-12', data: { url } })
    expect(a.espera).toHaveBeenCalledTimes(1)
    const tag = (m: ReturnType<typeof push>) => (m.mostrar.mock.calls[0] as unknown as [string, { tag: string }])[1].tag
    expect(tag(push(corpo('ONE-12')))).toBe(tag(a))
    expect(tag(push(corpo('ONE-13')))).toBe('ONE-13')
  })

  it.each([
    ['sem dados', null],
    ['texto que não é JSON', 'olá'],
    ['array', '[]'],
    ['objeto vazio', '{}'],
  ])('push sem JSON legível mostra o texto padrão (%s)', (_, dados) => {
    expect(push(dados).mostrar).toHaveBeenCalledWith('One', { body: 'Sua solicitação foi atualizada.', icon: '/icons/icon-192.png', tag: undefined, data: { url: undefined } })
  })

  it('aviso com o ícone da instituição', () => {
    const icone = '/api/instituicoes/univag/imagens/icone?v=2'
    const corpo = 'Sua solicitação ONE-1 tem uma resposta nova.'
    const { mostrar } = push(JSON.stringify({ titulo: 'Univag', corpo, url: '/univag/chamados/ONE-1', icone }))
    expect(mostrar).toHaveBeenCalledWith('Univag', { body: corpo, icon: icone, tag: 'ONE-1', data: { url: '/univag/chamados/ONE-1' } })
  })

  it.each([
    ['URL de fora', 'https://outro.site/x.png'],
    ['esquema javascript', 'javascript:x'],
    ['sem barra inicial', 'icons/x.png'],
    ['barra dupla', '//evil.com/x.png'],
    ['barra invertida', String.raw`/\evil.com/x.png`],
    ['tab', '/\t/evil.com/x.png'],
    ['quebra de linha', '/\n/evil.com/x.png'],
    ['codificado', '%2F%2Fevil.com'],
    ['número', 42],
    ['ausente', undefined],
  ])('ícone só do próprio app (%s)', (_, icone) => {
    const { mostrar } = push(JSON.stringify({ titulo: 'Univag', corpo: 'c', url: '/univag/chamados/ONE-1', icone }))
    expect((mostrar.mock.calls[0] as unknown as [string, { icon: string }])[1].icon).toBe('/icons/icon-192.png')
  })

  it('ícone só do próprio app: carga ilegível usa o texto e o ícone padrão', () => {
    expect(push('olá').mostrar).toHaveBeenCalledWith('One', { body: 'Sua solicitação foi atualizada.', icon: '/icons/icon-192.png', tag: undefined, data: { url: undefined } })
  })

  it('texto reserva fala em solicitação', () => {
    const [, opcoes] = push(null).mostrar.mock.calls[0] as unknown as [string, { body: string }]
    expect(opcoes.body).toBe('Sua solicitação foi atualizada.')
    expect(opcoes.body).not.toMatch(/chamado/i)
  })

  describe('toque na notificação', () => {
    function tocar(janelas: { focus: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> }[], destino?: string) {
      const fechar = vi.fn()
      const abrir = vi.fn(async () => null)
      let espera: Promise<unknown> = Promise.resolve()
      aoTocar(
        { notification: { close: fechar, data: destino ? { url: destino } : undefined }, waitUntil: (p) => (espera = p) },
        { matchAll: async () => janelas as never, openWindow: abrir },
      )
      return { fechar, abrir, espera: () => espera }
    }
    const janela = () => ({ focus: vi.fn(async () => null), navigate: vi.fn(async () => null) })

    it('com janela aberta navega e foca nela, sem abrir outra', async () => {
      const j = janela()
      const t = tocar([j], url)
      await t.espera()
      expect(t.fechar).toHaveBeenCalledTimes(1)
      expect(j.navigate).toHaveBeenCalledWith(url)
      expect(j.focus).toHaveBeenCalledTimes(1)
      expect(t.abrir).not.toHaveBeenCalled()
    })

    it('sem janela abre uma nova na url', async () => {
      const t = tocar([], url)
      await t.espera()
      expect(t.fechar).toHaveBeenCalledTimes(1)
      expect(t.abrir).toHaveBeenCalledExactlyOnceWith(url)
    })

    it('sem url abre a raiz', async () => {
      const t = tocar([])
      await t.espera()
      expect(t.abrir).toHaveBeenCalledExactlyOnceWith('/')
    })
  })

  it('fallback de navegação nega a API', () => {
    const nega = (caminho: string) => Negados.some((r) => r.test(caminho))
    expect(nega('/api/auth/me')).toBe(true)
    expect(nega('/api/push/chave')).toBe(true)
    expect(nega('/univag/chamados/ONE-12')).toBe(false)
  })

  it('fallback de navegação nega a API (rota registrada no worker)', async () => {
    vi.resetModules()
    const registerRoute = vi.fn()
    const NavigationRoute = vi.fn()
    vi.doMock('workbox-routing', () => ({ registerRoute, NavigationRoute }))
    vi.doMock('workbox-precaching', () => ({ cleanupOutdatedCaches: vi.fn(), createHandlerBoundToURL: vi.fn(() => 'h'), precacheAndRoute: vi.fn() }))
    vi.doMock('workbox-core', () => ({ clientsClaim: vi.fn() }))
    Object.assign(self, { skipWaiting: vi.fn(), addEventListener: vi.fn(), __WB_MANIFEST: [] })
    try {
      const { Negados: lista } = await import('./sw')
      expect(registerRoute).toHaveBeenCalledTimes(1)
      expect(NavigationRoute).toHaveBeenCalledWith('h', { denylist: lista })
    } finally {
      Reflect.deleteProperty(self, 'skipWaiting')
      vi.doUnmock('workbox-routing')
      vi.doUnmock('workbox-precaching')
      vi.doUnmock('workbox-core')
    }
  })
})
