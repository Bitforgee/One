import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './ui/button'

export function Cabecalho({ botao, Icone, aoClicar, children, linha }: { botao?: string; Icone: LucideIcon; aoClicar: () => void; children?: ReactNode; linha?: boolean }) {
  return (
    <div className={`flex gap-2 ${linha ? 'items-center' : 'flex-col @xl/main:flex-row @xl/main:items-center @xl/main:justify-between'}`}>
      {children}
      {botao && (
        <Button className="ms-auto" onClick={aoClicar}>
          <Icone aria-hidden="true" />
          {botao}
        </Button>
      )}
    </div>
  )
}
