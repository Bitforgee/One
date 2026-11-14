import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { api } from '../../api'
import { Carregando } from '../../Carregando'
import { ErroDe } from '../../ErroDe'
import { Badge } from '../../ui/badge'
import { Skeleton } from '../../ui/skeleton'

export type Estado = { texto: string; bom: boolean }

type Props<T> = { titulo: string; introducao: string; oque: string; chave: string; url: string; estado?: Estado; acao?: ReactNode; children: (dados: T) => ReactNode }

export function AbaIntegracao<T>({ titulo, introducao, oque, chave, url, estado, acao, children }: Props<T>) {
  const { data, error, refetch } = useQuery({ queryKey: [chave], queryFn: () => api<T>(url) })
  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="m-0 font-heading text-xl font-semibold">{titulo}</h2>
        <p className="order-last m-0 basis-full text-sm text-muted-foreground">{introducao}</p>
        {estado && <Badge variant={estado.bom ? 'default' : 'secondary'}>{estado.texto}</Badge>}
        {acao && <div className="ms-auto">{acao}</div>}
      </div>
      {error ? (
        <ErroDe erro={error} oque={oque} tentar={() => void refetch()} />
      ) : data ? (
        children(data)
      ) : (
        <Carregando className="flex flex-col gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </Carregando>
      )}
    </div>
  )
}
