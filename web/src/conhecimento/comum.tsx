import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Modal, Spinner } from 'react-bootstrap'
import { useAcao } from '../acao'
import { api } from '../api'

export type Indexacao = 'PENDENTE' | 'INDEXADO' | 'FALHOU'
export type Categoria = { id: number; nome: string; ativa: boolean }

// RAG: o assistente só busca o que já tem embedding; o agendador indexa em segundo plano.
const Indexacoes = { PENDENTE: ['Indexando', 'info'], INDEXADO: ['Indexado', 'success'], FALHOU: ['Falhou', 'danger'] } as const
export function SeloIndexacao({ valor }: { valor: Indexacao | null }) {
  if (!valor) return null
  const [rotulo, cor] = Indexacoes[valor]
  return (
    <Badge bg={cor} title="Indexação para a busca do assistente">
      {rotulo}
    </Badge>
  )
}

// Lê a lista da tela e as categorias ativas, e relê depois de cada gravação.
export function useBase<T>(url: string) {
  const [itens, setItens] = useState<T[]>()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const carga = useAcao()
  const carregar = useCallback(
    () =>
      carga.executar(async () => {
        const [i, c] = await Promise.all([api<T[]>(url), api<Categoria[]>('/api/admin/categorias')])
        setItens(i)
        setCategorias(c.filter((x) => x.ativa))
      }),
    // a url é constante de cada tela
    [],
  )
  useEffect(() => void carregar(), [carregar])
  return { itens, categorias, carregar, carga }
}

export function Situacao({ itens, erro }: { itens?: unknown[]; erro?: string }) {
  if (!itens) return erro ? null : <Spinner animation="border" role="status" aria-label="Carregando" />
  return itens.length === 0 ? <p className="text-body-secondary">Nenhum item cadastrado.</p> : null
}

export function ConfirmarArquivar({ tipo, titulo, aberto, fechar, arquivar }: { tipo: string; titulo?: string; aberto: boolean; fechar: () => void; arquivar: () => void }) {
  return (
    <Modal show={aberto} onHide={fechar} centered>
      <Modal.Header closeButton>
        <Modal.Title>Arquivar o {tipo}?</Modal.Title>
      </Modal.Header>
      <Modal.Body>“{titulo}” sai da base do assistente. As conversas que já o citaram continuam como estão.</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={fechar}>
          Voltar
        </Button>
        <Button variant="danger" onClick={arquivar}>
          Arquivar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
