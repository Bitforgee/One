import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { api } from '../api'
import { Estados } from '../chamado'
import { ErroDe } from '../ErroDe'
import { Badge } from '../ui/badge'
import { Spinner } from '../ui/spinner'
import { TableCell, TableRow } from '../ui/table'
import { Inbox, MessageSquare } from 'lucide-react'
import { Button } from '../ui/button'
import { abertoHa } from '../datas'
import { useSessao } from '../sessao'
import { CelulaLargo, Detalhe, Principal, Tabela, useEstreito, useMostrarMais, type Vazio } from '../Tabela'
import { UrlDaFila, useFilaAberta } from '../tempo-real'

type ItemMeu = { numero: string; titulo: string; estado: string; criadoEm: string }
type ItemFila = ItemMeu & { categoria: string; responsavel: string | null }

const CoresDoEstado: Record<string, string> = {
  ABERTO: 'bg-accent text-foreground',
  EM_ATENDIMENTO: 'bg-accent text-foreground',
  AGUARDANDO_ALUNO: 'bg-warning-subtle text-foreground',
  RESOLVIDO: 'bg-success/15 text-foreground',
  FECHADO: 'bg-success/15 text-foreground',
}
export const SeloDoChamado = ({ estado }: { estado: string }) => <Badge className={CoresDoEstado[estado]}>{Estados[estado]}</Badge>

export function Carregando() {
  return <Spinner className="size-8" />
}

export const ProximoPasso: Record<string, string> = {
  ABERTO: 'A equipe vai responder',
  EM_ATENDIMENTO: 'A equipe vai responder',
  AGUARDANDO_ALUNO: 'Responda para continuar',
  RESOLVIDO: 'Resolvida',
  FECHADO: 'Encerrada',
}

type Meta = { aberto: string; categoria?: string; responsavel?: string; proximo?: string }

const metaDa = (c: ItemMeu, aberto: string, fila?: boolean): Meta => (fila ? { aberto, categoria: (c as ItemFila).categoria, responsavel: responsavel((c as ItemFila).responsavel) } : { aberto, proximo: ProximoPasso[c.estado] })

function LinhaCompacta({ c, caminho, meta }: { c: ItemMeu; caminho: string; meta: Meta }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="m-0 [overflow-wrap:anywhere]" data-linha="assunto">
        <Link to={caminho} className="block text-foreground no-underline hover:underline" onClick={(e) => e.stopPropagation()}>
          <span className="line-clamp-2">
            <span className="font-medium">{c.numero}</span> <span>{c.titulo}</span>
          </span>
        </Link>
      </p>
      <div className="flex items-start gap-2 text-xs text-muted-foreground" data-linha="meta">
        <SeloDoChamado estado={c.estado} />
        <span className="min-w-0 flex-1 leading-[22px]">{[meta.aberto, meta.categoria, meta.responsavel].filter(Boolean).join(' · ')}</span>
      </div>
      {meta.proximo && (
        <p className="m-0 text-xs text-muted-foreground" data-linha="proximo">
          {meta.proximo}
        </p>
      )}
    </div>
  )
}

type Larga<T> = { titulo: string; valor: (c: T, aberto: string) => string; celula?: (c: T, aberto: string) => string; uma?: boolean }

function LinhaDaTabela<T extends ItemMeu>({ c, caminho, aberto, largas, fila }: { c: T; caminho: string; aberto: string; largas?: Larga<T>[]; fila?: boolean }) {
  return (
    <>
      <TableCell className="font-medium">
        <Link to={caminho} className="text-foreground no-underline hover:underline" onClick={(e) => e.stopPropagation()}>
          {c.numero}
        </Link>
      </TableCell>
      <TableCell className={Principal}>
        {c.titulo}
        {largas && <Detalhe>{largas.map((l) => l.valor(c, aberto)).join(' · ')}</Detalhe>}
      </TableCell>
      {largas?.map((l) => (
        <CelulaLargo key={l.titulo} className={l.uma ? 'whitespace-nowrap' : undefined}>
          {(l.celula ?? l.valor)(c, aberto)}
        </CelulaLargo>
      ))}
      <TableCell data-celula="selo" className="whitespace-normal">
        <SeloDoChamado estado={c.estado} />
        {!fila && (
          <div className="mt-1 flex flex-col text-xs text-muted-foreground">
            <span>{aberto}</span>
            <span>{ProximoPasso[c.estado]}</span>
          </div>
        )}
      </TableCell>
    </>
  )
}

function ListaDeChamados<T extends ItemMeu>({ url, vazio, largas, fila }: { url: string; vazio: Vazio; largas?: Larga<T>[]; fila?: boolean }) {
  const { slug } = useParams()
  const { me } = useSessao()
  const navegar = useNavigate()
  const estreito = useEstreito()
  const { data: itens, error, refetch } = useQuery({ queryKey: [url], queryFn: () => api<T[]>(url) })
  const { visiveis, mais } = useMostrarMais(itens)
  const colunas = [{ titulo: 'Número' }, { titulo: 'Título' }, ...(largas ?? []).map(({ titulo }) => ({ titulo, largo: true })), { titulo: 'Estado' }]
  return (
    <div className="flex flex-col gap-2">
      <ErroDe erro={error} oque={fila ? 'a fila' : 'suas solicitações'} tentar={() => void refetch()} />
      {fila && !!itens?.length && <p className="m-0 text-sm text-muted-foreground">Mais antigos primeiro</p>}
      <Tabela colunas={colunas} itens={itens} vazio={vazio} erro={error} densa>
        {visiveis?.map((c) => {
          const caminho = `/${slug}/chamados/${c.numero}`
          const aberto = abertoHa(c.criadoEm, me.instituicao.fuso)
          const meta = metaDa(c, aberto, fila)
          return (
            <TableRow key={c.numero} className="cursor-pointer max-md:px-0 max-md:py-3" onClick={() => navegar(caminho)}>
              {estreito ? <LinhaCompacta c={c} caminho={caminho} meta={meta} /> : <LinhaDaTabela c={c} caminho={caminho} aberto={aberto} largas={largas} fila={fila} />}
            </TableRow>
          )
        })}
      </Tabela>
      {mais}
    </div>
  )
}

export const responsavel = (nome: string | null) => (nome === null ? 'sem responsável' : nome)

export function Fila() {
  useFilaAberta()
  return (
    <ListaDeChamados<ItemFila>
      url={UrlDaFila}
      vazio={{ Icone: Inbox, titulo: 'Fila em dia', frase: 'Nenhum chamado na fila dos seus setores.' }}
      largas={[
        { titulo: 'Categoria', valor: (c) => c.categoria },
        { titulo: 'Responsável', valor: (c) => responsavel(c.responsavel) },
        { titulo: 'Aberto', valor: (_, aberto) => aberto, celula: (_, aberto) => aberto.replace(/^aberto /, ''), uma: true },
      ]}
      fila
    />
  )
}

export function Solicitacoes() {
  const { slug } = useParams()
  return (
    <ListaDeChamados
      url="/api/chamados?escopo=meus"
      vazio={{
        Icone: MessageSquare,
        titulo: 'Nenhuma solicitação',
        frase: 'Você ainda não tem solicitações.',
        acao: (
          <Button asChild>
            <Link to={`/${slug}/assistente`}>Falar com o assistente</Link>
          </Button>
        ),
      }}
    />
  )
}
