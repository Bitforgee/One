import { ClipboardList, EllipsisVertical, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Carregando } from './Carregando'
import { useConsulta } from './ui/use-mobile'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { Spinner } from './ui/spinner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Cartoes, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

const Largo = 'hidden md:@2xl/main:table-cell'
export const Principal = 'whitespace-normal [overflow-wrap:anywhere]'

export type Coluna = { titulo: string; largo?: boolean }

export type Vazio = { Icone: LucideIcon; titulo?: string; frase: ReactNode; acao?: ReactNode }
const SemItens: Vazio = { Icone: ClipboardList, titulo: 'Nada cadastrado', frase: 'Nenhum item cadastrado.' }

export function BlocoVazio({ Icone, titulo, frase, acao }: Vazio) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <Icone aria-hidden="true" className="size-7 text-muted-foreground" />
      {titulo && <p className="m-0 font-medium">{titulo}</p>}
      <p className="m-0 text-sm whitespace-normal text-muted-foreground">{frase}</p>
      {acao}
    </div>
  )
}

const PorVez = 50

export function useMostrarMais<T>(itens?: T[]) {
  const [limite, setLimite] = useState(PorVez)
  const visiveis = itens?.slice(0, limite)
  const mais = itens && itens.length > limite && (
    <Button type="button" variant="outline" className="self-center" onClick={() => setLimite((l) => l + PorVez)}>
      {`Mostrar mais ${PorVez}`}
    </Button>
  )
  return { visiveis, mais }
}

export const useEstreito = () => useConsulta('(max-width: 767px)')

export function Tabela({ colunas, itens, vazio = SemItens, erro, densa, children }: { colunas: Coluna[]; itens?: unknown[]; vazio?: Vazio; erro?: unknown; densa?: boolean; children: ReactNode }) {
  const cartoes = useEstreito()
  if (!itens)
    return erro ? null : (
      <Carregando className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </Carregando>
    )
  const corpo =
    itens.length === 0 ? (
      <TableRow>
        <TableCell colSpan={colunas.length} className="text-center first:ps-2">
          <BlocoVazio {...vazio} />
        </TableCell>
      </TableRow>
    ) : (
      children
    )
  if (cartoes)
    return (
      <div role="list" {...{ [densa ? 'data-linhas' : 'data-cartoes']: '' }} className={`flex flex-col text-sm ${densa ? '' : 'gap-2'}`}>
        <Cartoes value>{corpo}</Cartoes>
      </div>
    )
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {colunas.map((c) => (
            <TableHead key={c.titulo} className={c.largo ? Largo : undefined}>
              {c.titulo || <span className="sr-only">Ações</span>}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{corpo}</TableBody>
    </Table>
  )
}

export const CelulaLargo = ({ children, className = '' }: { children?: ReactNode; className?: string }) => <TableCell className={`${Largo} ${Principal} ${className}`}>{children}</TableCell>

export const Detalhe = ({ children }: { children: ReactNode }) => <div className="text-xs text-muted-foreground md:@2xl/main:hidden">{children}</div>

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
