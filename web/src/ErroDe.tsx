import { CircleAlert } from 'lucide-react'
import { ErroApi } from './api'
import { Alert } from './ui/alert'
import { Button } from './ui/button'

const daConexao = (erro: Error | string) => typeof erro !== 'string' && (!(erro instanceof ErroApi) || erro.status >= 500)

export function ErroDe({ erro, oculto, oque, tentar, campos }: { erro?: Error | string | null; oculto?: boolean; oque?: string; tentar?: () => void; campos?: string[] }) {
  if (!erro || oculto || (campos && Object.keys(errosDeCampo(erro)).some((k) => campos.includes(k)))) return null
  if (oque && daConexao(erro))
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <div className="flex flex-col items-start gap-2">
          <p className="m-0">Não foi possível carregar {oque}. Verifique sua conexão.</p>
          {tentar && (
            <Button variant="outline" size="sm" onClick={tentar}>
              Tentar de novo
            </Button>
          )}
        </div>
      </Alert>
    )
  return <Alert variant="destructive">{typeof erro === 'string' ? erro : erro.message}</Alert>
}

export function errosDeCampo(erro: unknown): Record<string, string> {
  if (!(erro instanceof ErroApi)) return {}
  return Object.fromEntries(Object.entries<string[]>(erro.corpo?.errors ?? {}).map(([campo, textos]) => [campo, textos[0]]))
}
