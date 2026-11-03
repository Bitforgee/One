import { Spinner } from './ui/spinner'

// Lista ainda não chegada: o Spinner (se não houve erro); chegada e sem itens: o texto de vazio.
export function Situacao({ itens, erro }: { itens?: unknown[]; erro?: string }) {
  if (!itens) return erro ? null : <Spinner className="size-8" />
  return itens.length === 0 ? <p className="text-muted-foreground">Nenhum item cadastrado.</p> : null
}
