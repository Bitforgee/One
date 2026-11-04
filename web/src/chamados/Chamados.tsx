import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api } from '../api'
import { Estados } from '../chamado'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Spinner } from '../ui/spinner'
import { TableCell, TableRow } from '../ui/table'
import { CelulaLargo, Detalhe, Principal, Tabela } from '../Tabela'
import { UrlDaFila, useFilaAberta } from '../tempo-real'

type ItemMeu = { numero: string; titulo: string; estado: string; criadoEm: string }
type ItemFila = ItemMeu & { categoria: string; responsavel: string | null; dias: number }

// O selo de estado por grupo de cor (AC 3): em andamento, à espera do aluno e concluído.
const CoresDoEstado: Record<string, string> = {
  ABERTO: 'bg-primary-subtle text-primary',
  EM_ATENDIMENTO: 'bg-primary-subtle text-primary',
  AGUARDANDO_ALUNO: 'bg-warning-subtle text-foreground',
  RESOLVIDO: 'bg-success/15 text-success',
  FECHADO: 'bg-success/15 text-success',
}
export const SeloDoChamado = ({ estado }: { estado: string }) => <Badge className={CoresDoEstado[estado]}>{Estados[estado]}</Badge>

export function Carregando() {
  return <Spinner className="size-8" />
}

// Fila e Minhas solicitações: a mesma tabela de chamados; a linha inteira abre o chamado e o número é o link (AC 23).
// `largas` são as colunas "largo": cabeçalhos e células, nesta ordem, entre o título e o estado.
function ListaDeChamados<T extends ItemMeu>({ url, vazio, largas }: { url: string; vazio: ReactNode; largas?: { titulo: string; valor: (c: T) => string }[] }) {
  const { slug } = useParams()
  const navegar = useNavigate()
  const { data: itens, error } = useQuery({ queryKey: [url], queryFn: () => api<T[]>(url) })
  const colunas = [{ titulo: 'Número' }, { titulo: 'Título' }, ...(largas ?? []).map(({ titulo }) => ({ titulo, largo: true })), { titulo: 'Estado' }]
  return (
    <div className="flex flex-col gap-2">
      {error && <Alert variant="destructive">{error.message}</Alert>}
      <Tabela colunas={colunas} itens={itens} vazio={vazio} erro={error}>
        {itens?.map((c) => {
          const caminho = `/${slug}/chamados/${c.numero}`
          return (
            <TableRow key={c.numero} className="cursor-pointer" onClick={() => navegar(caminho)}>
              <TableCell className="font-medium">
                {/* o clique no link já navega: o da linha só vale fora dele */}
                <Link to={caminho} className="text-foreground no-underline hover:underline" onClick={(e) => e.stopPropagation()}>
                  {c.numero}
                </Link>
              </TableCell>
              <TableCell className={Principal}>
                {c.titulo}
                {largas && <Detalhe>{largas.map((l) => l.valor(c)).join(' · ')}</Detalhe>}
              </TableCell>
              {largas?.map((l) => (
                <CelulaLargo key={l.titulo}>{l.valor(c)}</CelulaLargo>
              ))}
              <TableCell data-celula="selo">
                <SeloDoChamado estado={c.estado} />
              </TableCell>
            </TableRow>
          )
        })}
      </Tabela>
    </div>
  )
}

// O nome nunca vem vazio da API: só null quer dizer sem responsável.
export const responsavel = (nome: string | null) => (nome === null ? 'sem responsável' : nome)

const dias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)

export function Fila() {
  useFilaAberta()
  return (
    <ListaDeChamados<ItemFila>
      url={UrlDaFila}
      vazio="Nenhum chamado na fila dos seus setores."
      largas={[
        { titulo: 'Categoria', valor: (c) => c.categoria },
        { titulo: 'Responsável', valor: (c) => responsavel(c.responsavel) },
        { titulo: 'Dias', valor: (c) => dias(c.dias) },
      ]}
    />
  )
}

export function Solicitacoes() {
  const { slug } = useParams()
  return (
    <ListaDeChamados
      url="/api/chamados?escopo=meus"
      vazio={
        <>
          Você ainda não tem solicitações.{' '}
          <Link to={`/${slug}/assistente`} className="text-primary">
            Fale com o assistente
          </Link>
          .
        </>
      }
    />
  )
}
