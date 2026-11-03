import { Alert } from './ui/alert'

// O erro de uma leitura ou gravação, com o `detail` da API, num Alert; `oculto` cala o da página enquanto o diálogo mostra o seu.
export function ErroDe({ erro, oculto }: { erro?: Error | string | null; oculto?: boolean }) {
  if (!erro || oculto) return null
  return <Alert variant="destructive">{typeof erro === 'string' ? erro : erro.message}</Alert>
}
