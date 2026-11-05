import { EllipsisVertical } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { CaixaVazia } from './ilustracoes'
import { useConsulta } from './ui/use-mobile'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { Spinner } from './ui/spinner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Cartoes, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

// Colunas "largo" só aparecem a partir de @2xl/main (672 px); no estreito os valores vão para a linha de Detalhe (layout-painel AC 22).
const Largo = 'hidden md:@2xl/main:table-cell'
export const Principal = 'whitespace-normal [overflow-wrap:anywhere]'

export type Coluna = { titulo: string; largo?: boolean }

// O estado vazio de uma lista (AC 45): a ilustração, o título, a frase e, quando a lista tem, o botão de ação.
export type Vazio = { Ilustracao: ComponentType<{ className?: string }>; titulo: string; frase: ReactNode; acao?: ReactNode }
const SemItens: Vazio = { Ilustracao: CaixaVazia, titulo: 'Nada cadastrado', frase: 'Nenhum item cadastrado.' }

// Abaixo de 768 px (o `md` do Tailwind) as linhas viram cartões (AC 7), ou linhas com divisória quando `densa` (revisao-ux AC 21).
export const useEstreito = () => useConsulta('(max-width: 767px)')

// A caixa com borda das listas (padrão do data-table do template); lista vazia, uma linha só com o texto de vazio (AC 24).
// Lista ainda não chegada: 3 esqueletos (AC 4); com `erro`, nada (a tela mostra o erro).
export function Tabela({ colunas, itens, vazio = SemItens, erro, densa, children }: { colunas: Coluna[]; itens?: unknown[]; vazio?: Vazio; erro?: unknown; densa?: boolean; children: ReactNode }) {
  const cartoes = useEstreito()
  if (!itens)
    return erro ? null : (
      <div aria-busy="true" className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  const corpo =
    itens.length === 0 ? (
      <TableRow>
        <TableCell colSpan={colunas.length} className="text-center">
          <div className="flex flex-col items-center gap-2 py-4">
            <vazio.Ilustracao className="h-24 w-32 text-muted-foreground" />
            <p className="m-0 font-medium">{vazio.titulo}</p>
            <p className="m-0 text-sm whitespace-normal text-muted-foreground">{vazio.frase}</p>
            {vazio.acao}
          </div>
        </TableCell>
      </TableRow>
    ) : (
      children
    )
  // sem <table>: a lista de cartões (linhas e células viram div em ui/table.tsx)
  if (cartoes)
    return (
      <div role="list" {...{ [densa ? 'data-linhas' : 'data-cartoes']: '' }} className={`flex flex-col text-sm ${densa ? '' : 'gap-2'}`}>
        <Cartoes value>{corpo}</Cartoes>
      </div>
    )
  return (
    <div className="overflow-hidden rounded-md border">
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
        <TableBody>{corpo}</TableBody>
      </Table>
    </div>
  )
}

export const CelulaLargo = ({ children, className = '' }: { children?: ReactNode; className?: string }) => <TableCell className={`${Largo} ${Principal} ${className}`}>{children}</TableCell>

// A linha de 12 px sob a coluna principal, só no estreito: os valores "largo" unidos por " · " (AC 22).
export const Detalhe = ({ children }: { children: ReactNode }) => <div className="text-xs text-muted-foreground md:@2xl/main:hidden">{children}</div>

// O menu "⋮" da última coluna (door 4); a tela só o monta quando a linha tem alguma ação.
export function MenuAcoes({ nome, pendente, children }: { nome: string; pendente?: boolean; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground max-md:size-11" aria-label={`Ações de ${nome}`} disabled={pendente}>
          {pendente ? <Spinner /> : <EllipsisVertical aria-hidden="true" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
