import { api } from './api'

export const suportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const registro = () => navigator.serviceWorker.ready
export const subscricaoLocal = async () => (await registro()).pushManager.getSubscription()

// applicationServerKey: a chave pública VAPID (base64url) em bytes
const emBytes = (chave: string) => Uint8Array.from(atob(chave.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

// A permissão é pedida aqui, no toque, e só depois a assinatura vai ao navegador e ao servidor.
export async function ativar(chave: string) {
  if ((await Notification.requestPermission()) !== 'granted') return false
  const { endpoint, keys } = (await (await registro()).pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: emBytes(chave) })).toJSON()
  await api('/api/push/subscricao', { endpoint, chaves: { p256dh: keys?.p256dh, auth: keys?.auth } })
  return true
}

export async function desativar(subscricao: PushSubscription) {
  await subscricao.unsubscribe()
  await api(`/api/push/subscricao?endpoint=${encodeURIComponent(subscricao.endpoint)}`, undefined, 'DELETE')
}
