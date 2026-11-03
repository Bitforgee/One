import { EllipsisVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

// Colunas "largo" só aparecem a partir de @2xl/main (672 px); no estreito os valores vão para a linha de Detalhe (layout-painel AC 22).
const Largo = 'hidden @2xl/main:table-cell'
export const Principal = 'whitespace-normal [overflow-wrap:anywhere]'

export type Coluna = { titulo: string; largo?: boolean }

// A caixa com borda das listas (padrão do data-table do template); lista vazia, uma linha só com o texto de vazio (AC 24).
// Lista ainda não chegada: nada (a tela mostra o Spinner).
export function Tabela({ colunas, itens, vazio = 'Nenhum item cadastrado.', children }: { colunas: Coluna[]; itens?: unknown[]; vazio?: ReactNode; children: ReactNode }) {
  if (!itens) return null
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow className="hover:bg-transparent">
            {colunas.map((c) => (
              <TableHead key={c.titulo} className={c.largo ? Largo : undefined}>
                {c.titulo}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colunas.length} className="h-24 text-center text-muted-foreground">
                {vazio}
              </TableCell>
            </TableRow>
          ) : (
            children
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export const CelulaLargo = ({ children }: { children?: ReactNode }) => <TableCell className={`${Largo} ${Principal}`}>{children}</TableCell>

// A linha de 12 px sob a coluna principal, só no estreito: os valores "largo" unidos por " · " (AC 22).
export const Detalhe = ({ children }: { children: ReactNode }) => <div className="text-xs text-muted-foreground @2xl/main:hidden">{children}</div>

// O menu "⋮" da última coluna (door 4); a tela só o monta quando a linha tem alguma ação.
export function MenuAcoes({ nome, pendente, children }: { nome: string; pendente?: boolean; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Ações de ${nome}`} disabled={pendente}>
          {pendente ? <Spinner /> : <EllipsisVertical aria-hidden="true" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
