import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../api'
import { Estados } from '../chamado'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Spinner } from '../ui/spinner'

type ItemMeu = { numero: string; titulo: string; estado: string; criadoEm: string }
type ItemFila = ItemMeu & { categoria: string; responsavel: string | null; dias: number }

export function Carregando() {
  return <Spinner className="size-8" />
}

// Fila e Minhas solicitações: a mesma lista de chamados, cada uma com o seu vazio e a sua linha de detalhe.
function ListaDeChamados<T extends ItemMeu>({ titulo, url, vazio, detalhe }: { titulo: string; url: string; vazio: ReactNode; detalhe?: (c: T) => ReactNode }) {
  const { slug } = useParams()
  const { data: itens, error, isPending } = useQuery({ queryKey: [url], queryFn: () => api<T[]>(url) })
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-2">
      <h1 className="text-xl font-semibold">{titulo}</h1>
      {error && <Alert variant="destructive">{error.message}</Alert>}
      {isPending && <Carregando />}
      {itens?.length === 0 && vazio}
      {itens?.map((c) => (
        <Link key={c.numero} to={`/${slug}/chamados/${c.numero}`} className="block rounded-lg border px-3 py-2 text-foreground no-underline hover:bg-accent">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{c.numero}</strong>
            <Badge variant="secondary">{Estados[c.estado]}</Badge>
          </div>
          <div className="break-words">{c.titulo}</div>
          {detalhe?.(c)}
        </Link>
      ))}
    </div>
  )
}

// O nome nunca vem vazio da API: só null quer dizer sem responsável.
export const responsavel = (nome: string | null) => (nome === null ? 'sem responsável' : nome)

const dias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)

function DetalheDaFila({ c }: { c: ItemFila }) {
  return (
    <div className="text-sm break-words text-muted-foreground">
      {c.categoria} · {responsavel(c.responsavel)} · {dias(c.dias)}
    </div>
  )
}

export function Fila() {
  return (
    <ListaDeChamados<ItemFila>
      titulo="Fila"
      url="/api/chamados?escopo=fila"
      vazio={<p className="mb-0 text-muted-foreground">Nenhum chamado na fila dos seus setores.</p>}
      detalhe={(c) => <DetalheDaFila c={c} />}
    />
  )
}

export function Solicitacoes() {
  const { slug } = useParams()
  return (
    <ListaDeChamados
      titulo="Minhas solicitações"
      url="/api/chamados?escopo=meus"
      vazio={
        <p className="mb-0 text-muted-foreground">
          Você ainda não tem solicitações.{' '}
          <Link to={`/${slug}/assistente`} className="text-primary">
            Fale com o assistente
          </Link>
          .
        </p>
      }
    />
  )
}
