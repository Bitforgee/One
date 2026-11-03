import { api } from './api'

export const suportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const registro = () => navigator.serviceWorker.ready
export const subscricaoLocal = async () => (await registro()).pushManager.getSubscription()

// applicationServerKey: a chave pública VAPID (base64url) em bytes
const emBytes = (chave: string) => Uint8Array.from(atob(chave.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

// A permissão é pedida aqui, no toque, e só depois a assinatura vai ao navegador e ao servidor.
export async function ativar(chave: string) {
  if ((await Notification.requestPermission()) !== 'granted') return false
  const inscricao = await (await registro()).pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: emBytes(chave) })
  const { endpoint, keys } = inscricao.toJSON()
  try {
    await api('/api/push/subscricao', { endpoint, chaves: { p256dh: keys?.p256dh, auth: keys?.auth } })
  } catch (e) {
    await inscricao.unsubscribe() // sem linha no servidor a inscrição local não serve: o botão volta a "Ativar"
    throw e
  }
  return true
}

export async function desativar(subscricao: PushSubscription) {
  await subscricao.unsubscribe()
  await api(`/api/push/subscricao?endpoint=${encodeURIComponent(subscricao.endpoint)}`, undefined, 'DELETE')
}

// true = feito; false = permissão negada (só ao ativar)
export async function alternar(inscrito: PushSubscription | null, chave: string) {
  if (!inscrito) return ativar(chave)
  await desativar(inscrito)
  return true
}
