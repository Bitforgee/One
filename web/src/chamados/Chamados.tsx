import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { api } from '../api'
import { Estados } from '../chamado'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Spinner } from '../ui/spinner'
import { TableCell, TableRow } from '../ui/table'
import { CaixaVazia } from '../ilustracoes'
import { Button } from '../ui/button'
import { abertoHa } from '../datas'
import { useSessao } from '../sessao'
import { CelulaLargo, Detalhe, Principal, Tabela, useEstreito, type Vazio } from '../Tabela'
import { UrlDaFila, useFilaAberta } from '../tempo-real'

type ItemMeu = { numero: string; titulo: string; estado: string; criadoEm: string }
type ItemFila = ItemMeu & { categoria: string; responsavel: string | null }

// O selo de estado por grupo de cor (AC 3): em andamento, à espera do aluno e concluído.
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

// O próximo passo de cada estado, na linha do aluno (revisao-ux AC 22).
const ProximoPasso: Record<string, string> = {
  ABERTO: 'A equipe vai responder',
  EM_ATENDIMENTO: 'A equipe vai responder',
  AGUARDANDO_ALUNO: 'Responda para continuar',
  RESOLVIDO: 'Resolvida',
  FECHADO: 'Encerrada',
}

type Meta = { aberto: string; categoria?: string; proximo?: string }

// A Fila mostra a categoria; Minhas solicitações, o próximo passo.
const metaDa = (c: ItemMeu, aberto: string, fila?: boolean): Meta => (fila ? { aberto, categoria: (c as ItemFila).categoria } : { aberto, proximo: ProximoPasso[c.estado] })

// No celular a linha é densa: o assunto (com o número) em até 2 linhas, o selo e a data (e a categoria na Fila) e, para o aluno, o próximo passo.
function LinhaCompacta({ c, caminho, meta }: { c: ItemMeu; caminho: string; meta: Meta }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="m-0 line-clamp-2 [overflow-wrap:anywhere]" data-linha="assunto">
        <Link to={caminho} className="font-medium text-foreground no-underline hover:underline" onClick={(e) => e.stopPropagation()}>
          {c.numero}
        </Link>{' '}
        <span>{c.titulo}</span>
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground" data-linha="meta">
        <SeloDoChamado estado={c.estado} />
        <span className="shrink-0 leading-[22px]">{meta.aberto}</span>
        {meta.categoria && <span className="min-w-0 truncate leading-[22px]">{meta.categoria}</span>}
      </div>
      {meta.proximo && (
        <p className="m-0 text-xs text-muted-foreground" data-linha="proximo">
          {meta.proximo}
        </p>
      )}
    </div>
  )
}

type Larga<T> = { titulo: string; valor: (c: T, aberto: string) => string }

// A linha da tabela (a partir de 768 px): número, título com o detalhe do estreito, colunas largas e o estado; para o aluno, a data e o próximo passo ficam sob o selo.
function LinhaDaTabela<T extends ItemMeu>({ c, caminho, aberto, largas, fila }: { c: T; caminho: string; aberto: string; largas?: Larga<T>[]; fila?: boolean }) {
  return (
    <>
      <TableCell className="font-medium">
        {/* o clique no link já navega: o da linha só vale fora dele */}
        <Link to={caminho} className="text-foreground no-underline hover:underline" onClick={(e) => e.stopPropagation()}>
          {c.numero}
        </Link>
      </TableCell>
      <TableCell className={Principal}>
        {c.titulo}
        {largas && <Detalhe>{largas.map((l) => l.valor(c, aberto)).join(' · ')}</Detalhe>}
      </TableCell>
      {largas?.map((l) => (
        <CelulaLargo key={l.titulo}>{l.valor(c, aberto)}</CelulaLargo>
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

// Fila e Minhas solicitações: linhas com divisória, sem cartão; a linha inteira abre o chamado e o número é o link (AC 23).
// `largas` são as colunas "largo": cabeçalhos e células, nesta ordem, entre o título e o estado.
function ListaDeChamados<T extends ItemMeu>({ url, vazio, largas, fila }: { url: string; vazio: Vazio; largas?: Larga<T>[]; fila?: boolean }) {
  const { slug } = useParams()
  const { me } = useSessao()
  const navegar = useNavigate()
  const estreito = useEstreito()
  const { data: itens, error } = useQuery({ queryKey: [url], queryFn: () => api<T[]>(url) })
  const colunas = [{ titulo: 'Número' }, { titulo: 'Título' }, ...(largas ?? []).map(({ titulo }) => ({ titulo, largo: true })), { titulo: 'Estado' }]
  return (
    <div className="flex flex-col gap-2">
      {error && <Alert variant="destructive">{error.message}</Alert>}
      {fila && !!itens?.length && <p className="m-0 text-sm text-muted-foreground">Mais antigos primeiro</p>}
      <Tabela colunas={colunas} itens={itens} vazio={vazio} erro={error} densa>
        {itens?.map((c) => {
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
    </div>
  )
}

// O nome nunca vem vazio da API: só null quer dizer sem responsável.
export const responsavel = (nome: string | null) => (nome === null ? 'sem responsável' : nome)

export function Fila() {
  useFilaAberta()
  return (
    <ListaDeChamados<ItemFila>
      url={UrlDaFila}
      vazio={{ Ilustracao: CaixaVazia, titulo: 'Fila em dia', frase: 'Nenhum chamado na fila dos seus setores.' }}
      largas={[
        { titulo: 'Categoria', valor: (c) => c.categoria },
        { titulo: 'Responsável', valor: (c) => responsavel(c.responsavel) },
        { titulo: 'Dias', valor: (_, aberto) => aberto },
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
        Ilustracao: CaixaVazia,
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
