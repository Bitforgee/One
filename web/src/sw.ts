import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

// O worker usa só estes pedaços da API do navegador; a lib "webworker" colide com "DOM" no tsconfig do app.
type Janela = { focus(): Promise<unknown>; navigate(url: string): Promise<unknown> }
type Registro = { showNotification(titulo: string, opcoes: { body: string; tag?: string; data: { url?: string } }): Promise<void> }
type Evento = { waitUntil(p: Promise<unknown>): void }
type EventoPush = Evento & { data: { text(): string } | null }
type EventoToque = Evento & { notification: { close(): void; data?: { url?: string } } }
type Clientes = { matchAll(o: { type: 'window' }): Promise<Janela[]>; openWindow(url: string): Promise<unknown> }

// o injectManifest troca o texto literal self.__WB_MANIFEST pelo manifesto de precache
declare global {
  interface Window {
    __WB_MANIFEST: { url: string }[]
  }
}

export const Negados = [/^\/api\//]
const Padrao = { titulo: 'One', corpo: 'Sua solicitação foi atualizada.' }

// door 4: {"titulo","corpo","url"}; qualquer outra coisa vira o texto padrão, sem tag nem url
function lerCarga(texto: string | undefined) {
  try {
    const { titulo, corpo, url } = JSON.parse(texto ?? '')
    if (typeof titulo === 'string' && typeof corpo === 'string') return { titulo, corpo, url: typeof url === 'string' ? url : undefined }
  } catch {
    /* sem JSON legível */
  }
  return { ...Padrao, url: undefined }
}

// tag = último trecho da url (o número do chamado): um segundo aviso do mesmo chamado substitui o primeiro
export function aoReceberPush(evento: EventoPush, registro: Registro) {
  const { titulo, corpo, url } = lerCarga(evento.data?.text())
  evento.waitUntil(registro.showNotification(titulo, { body: corpo, tag: url?.split('/').pop(), data: { url } }))
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

// Só dentro de um service worker; no Vitest (jsdom) este módulo é importado sem registrar nada.
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
