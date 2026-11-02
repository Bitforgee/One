import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Badge, ListGroup, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router'
import { api } from '../api'
import { Estados } from '../chamado'

type ItemMeu = { numero: string; titulo: string; estado: string; criadoEm: string }
type ItemFila = ItemMeu & { categoria: string; responsavel: string | null; dias: number }

function useLista<T>(url: string) {
  const [itens, setItens] = useState<T[]>()
  const [erro, setErro] = useState<string>()
  useEffect(() => {
    api<T[]>(url).then(setItens, (e: Error) => setErro(e.message))
  }, [url])
  return { itens, erro }
}

export function Carregando() {
  return <Spinner animation="border" role="status" aria-label="Carregando" />
}

// Fila e Minhas solicitações: a mesma lista de chamados, cada uma com o seu vazio e a sua linha de detalhe.
function ListaDeChamados<T extends ItemMeu>({ titulo, url, vazio, detalhe }: { titulo: string; url: string; vazio: ReactNode; detalhe?: (c: T) => ReactNode }) {
  const { slug } = useParams()
  const { itens, erro } = useLista<T>(url)
  return (
    <>
      <h1 className="h4">{titulo}</h1>
      {erro && <Alert variant="danger">{erro}</Alert>}
      {!itens && !erro && <Carregando />}
      {itens?.length === 0 && vazio}
      <ListGroup>
        {itens?.map((c) => (
          <ListGroup.Item key={c.numero} action as={Link} to={`/${slug}/chamados/${c.numero}`}>
            <div className="d-flex justify-content-between gap-2 flex-wrap">
              <strong>{c.numero}</strong>
              <Badge bg="secondary">{Estados[c.estado]}</Badge>
            </div>
            <div style={{ overflowWrap: 'anywhere' }}>{c.titulo}</div>
            {detalhe?.(c)}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  )
}

// O nome nunca vem vazio da API: só null quer dizer sem responsável.
export const responsavel = (nome: string | null) => (nome === null ? 'sem responsável' : nome)

const dias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)

function DetalheDaFila({ c }: { c: ItemFila }) {
  return (
    <div className="small text-body-secondary">
      {c.categoria} · {responsavel(c.responsavel)} · {dias(c.dias)}
    </div>
  )
}

export function Fila() {
  return (
    <ListaDeChamados<ItemFila>
      titulo="Fila"
      url="/api/chamados?escopo=fila"
      vazio={<p className="text-body-secondary">Nenhum chamado na fila dos seus setores.</p>}
      detalhe={(c) => <DetalheDaFila c={c} />}
    />
  )
}

export function Solicitacoes() {
  const { slug } = useParams()
  return (
    <ListaDeChamados
      titulo="Minhas solicitações"
      url="/api/chamados?escopo=meus"
      vazio={
        <p className="text-body-secondary">
          Você ainda não tem solicitações. <Link to={`/${slug}/assistente`}>Fale com o assistente</Link>.
        </p>
      }
    />
  )
}
