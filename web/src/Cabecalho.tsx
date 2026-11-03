import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './ui/button'

// A linha de ferramentas acima da tabela: o que vier de filho (texto de ajuda, abas) à esquerda e o botão que abre o diálogo de criação à direita;
// o título da tela fica no cabeçalho da casca (layout-painel door 3).
export function Cabecalho({ botao, Icone, aoClicar, children }: { botao: string; Icone: LucideIcon; aoClicar: () => void; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 @xl/main:flex-row @xl/main:items-center @xl/main:justify-between">
      {children}
      <Button className="ms-auto" onClick={aoClicar}>
        <Icone aria-hidden="true" />
        {botao}
      </Button>
    </div>
  )
}
