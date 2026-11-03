import type { LucideIcon } from 'lucide-react'
import { Button } from './ui/button'

// O botão que abre o diálogo de criação; o título da tela fica no cabeçalho da casca (layout-painel door 3).
export function Cabecalho({ botao, Icone, aoClicar }: { botao: string; Icone: LucideIcon; aoClicar: () => void }) {
  return (
    <div className="flex justify-end">
      <Button onClick={aoClicar}>
        <Icone aria-hidden="true" />
        {botao}
      </Button>
    </div>
  )
}
