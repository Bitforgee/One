import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { api } from '../api'
import { ErroDe } from '../ErroDe'
import { Skeleton } from '../ui/skeleton'

export function AbaIntegracao<T>({ titulo, introducao, oque, chave, url, children }: { titulo: string; introducao: string; oque: string; chave: string; url: string; children: (dados: T) => ReactNode }) {
  const { data, error, refetch } = useQuery({ queryKey: [chave], queryFn: () => api<T>(url) })
  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h2 className="m-0 font-heading text-xl font-semibold">{titulo}</h2>
        <p className="m-0 text-sm text-muted-foreground">{introducao}</p>
      </div>
      {error ? (
        <ErroDe erro={error} oque={oque} tentar={() => void refetch()} />
      ) : data ? (
        children(data)
      ) : (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}
    </div>
  )
}
