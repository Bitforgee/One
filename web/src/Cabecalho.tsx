import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './ui/button'

// `linha`: o filho e o botão ficam na mesma linha também no estreito (Cadastros, AC 6).
// A linha de ferramentas acima da tabela: o que vier de filho (texto de ajuda, abas) à esquerda e o botão que abre o diálogo de criação à direita;
// o título da tela fica no cabeçalho da casca (layout-painel door 3).
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
