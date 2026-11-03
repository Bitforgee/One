import { Spinner } from './ui/spinner'

// Lista ainda não chegada: o Spinner (se não houve erro); o texto de vazio é da Tabela.
export function Situacao({ itens, erro }: { itens?: unknown[]; erro?: string }) {
  return !itens && !erro ? <Spinner className="size-8" /> : null
}
