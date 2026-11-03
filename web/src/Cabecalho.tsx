import type { LucideIcon } from 'lucide-react'
import { Button } from './ui/button'

// Título da lista e o botão que abre o diálogo de criação, na mesma linha.
export function Cabecalho({ titulo, botao, Icone, aoClicar }: { titulo: string; botao: string; Icone: LucideIcon; aoClicar: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <Button onClick={aoClicar}>
        <Icone aria-hidden="true" />
        {botao}
      </Button>
    </div>
  )
}
