import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

type Janela = { focus(): Promise<unknown>; navigate(url: string): Promise<unknown> }
type Registro = { showNotification(titulo: string, opcoes: { body: string; icon: string; tag?: string; data: { url?: string } }): Promise<void> }
type Evento = { waitUntil(p: Promise<unknown>): void }
type EventoPush = Evento & { data: { text(): string } | null }
type EventoToque = Evento & { notification: { close(): void; data?: { url?: string } } }
type Clientes = { matchAll(o: { type: 'window' }): Promise<Janela[]>; openWindow(url: string): Promise<unknown> }

declare global {
  interface Window {
    __WB_MANIFEST: { url: string }[]
  }
}

export const Negados = [/^\/api\//]
const IconePadrao = '/icons/icon-192.png'
const Padrao = { titulo: 'One', corpo: 'Sua solicitação foi atualizada.', icone: IconePadrao }

const iconeDoApp = (i: unknown) => (typeof i === 'string' && /^\/api\/instituicoes\/[a-z0-9-]{3,30}\/imagens\/icone\?v=[0-9]+$|^\/icons\/icon-[0-9]+\.png$/.test(i) ? i : IconePadrao)

function lerCarga(texto: string | undefined) {
  try {
    const { titulo, corpo, url, icone } = JSON.parse(texto ?? '')
    if (typeof titulo === 'string' && typeof corpo === 'string') return { titulo, corpo, url: typeof url === 'string' ? url : undefined, icone: iconeDoApp(icone) }
  } catch {
  }
  return { ...Padrao, url: undefined }
}

export function aoReceberPush(evento: EventoPush, registro: Registro) {
  const { titulo, corpo, url, icone } = lerCarga(evento.data?.text())
  evento.waitUntil(registro.showNotification(titulo, { body: corpo, icon: icone, tag: url?.split('/').pop(), data: { url } }))
}

export function aoTocar(evento: EventoToque, clientes: Clientes) {
  evento.notification.close()
  const url = evento.notification.data?.url ?? '/'
  evento.waitUntil(
    clientes.matchAll({ type: 'window' }).then(async ([janela]) => {
      if (!janela) return clientes.openWindow(url)
      await janela.focus()
      return janela.navigate(url)
    }),
  )
}

if ('skipWaiting' in self) {
  const escopo = self as unknown as {
    registration: Registro
    clients: Clientes
    addEventListener(n: string, f: (e: any) => void): void
    skipWaiting(): void
  }
  escopo.skipWaiting() // registerType: 'autoUpdate'
  clientsClaim()
  cleanupOutdatedCaches()
  precacheAndRoute(self.__WB_MANIFEST)
  registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: Negados }))
  escopo.addEventListener('push', (e) => aoReceberPush(e, escopo.registration))
  escopo.addEventListener('notificationclick', (e) => aoTocar(e, escopo.clients))
}
