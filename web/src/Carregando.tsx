import type { ReactNode } from 'react'
import { Spinner } from './ui/spinner'

export function Carregando({ className = 'flex justify-center', children }: { className?: string; children?: ReactNode }) {
  return (
    <div role="status" aria-label="Carregando" aria-busy="true" className={className}>
      {children ?? <Spinner role="presentation" aria-hidden="true" aria-label={undefined} className="size-8" />}
      <span className="sr-only">Carregando…</span>
    </div>
  )
}
