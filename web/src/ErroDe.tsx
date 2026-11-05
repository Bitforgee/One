import { CircleAlert } from 'lucide-react'
import { ErroApi } from './api'
import { Alert } from './ui/alert'
import { Button } from './ui/button'

// Falha de rede ou do servidor (5xx): o texto da API não ajuda, então a tela diz o que fazer; 404 e 403 seguem com o `detail`.
const daConexao = (erro: Error | string) => typeof erro !== 'string' && (!(erro instanceof ErroApi) || erro.status >= 500)

// O erro de uma leitura ou gravação, com o `detail` da API, num Alert; `oculto` cala o da página enquanto o diálogo mostra o seu.
// Com `oque` e `tentar`, a falha de leitura vira o bloco "Não foi possível carregar {oque}" com o botão que refaz a consulta.
// `campos` são as chaves que o formulário mostra ao lado dos campos: se o 400 traz alguma delas, o Alert geral se cala.
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

// O texto de cada campo que a API recusou: o 400 traz `errors` por campo (o primeiro texto de cada um).
export function errosDeCampo(erro: unknown): Record<string, string> {
  if (!(erro instanceof ErroApi)) return {}
  return Object.fromEntries(Object.entries<string[]>(erro.corpo?.errors ?? {}).map(([campo, textos]) => [campo, textos[0]]))
}
