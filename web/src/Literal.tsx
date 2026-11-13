import type { ReactNode } from 'react'

export function Literal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span translate="no" className={className}>
      {children}
    </span>
  )
}
