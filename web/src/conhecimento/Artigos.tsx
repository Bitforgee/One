import { useState, type FormEvent } from 'react'
import { Badge, Button, Col, Form, ListGroup, Modal, Row, Stack } from 'react-bootstrap'
import { BotaoAcao, useAcao } from '../acao'
import { api } from '../api'
import { Opcoes } from '../Opcoes'
import { ConfirmarArquivar, SeloIndexacao, Situacao, useBase, type Categoria, type Indexacao } from './comum'

type Versao = { id: number; numero: number; titulo: string; perguntas: string[]; resposta: string; links: string[] }
type Artigo = { id: number; estado: 'RASCUNHO' | 'ATIVO' | 'ARQUIVADO'; indexacao: Indexacao | null; categoriaId: number; categoria: string; visivelDe: string | null; visivelAte: string | null; versao: Versao }
type Rascunho = { id?: number; titulo: string; perguntas: string; categoriaId: string; resposta: string; links: string; visivelDe: string; visivelAte: string }

const Cores = { RASCUNHO: 'secondary', ATIVO: 'success', ARQUIVADO: 'dark' } as const
const Novo: Rascunho = { titulo: '', perguntas: '', categoriaId: '', resposta: '', links: '', visivelDe: '', visivelAte: '' }
const dataBr = (iso: string) => iso.split('-').reverse().join('/')
const linhas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean)

const rascunho = (a: Artigo): Rascunho => ({
  id: a.id,
  titulo: a.versao.titulo,
  perguntas: a.versao.perguntas.join('\n'),
  categoriaId: String(a.categoriaId),
  resposta: a.versao.resposta,
  links: a.versao.links.join('\n'),
  visivelDe: a.visivelDe ?? '',
  visivelAte: a.visivelAte ?? '',
})

const corpo = (r: Rascunho) => ({
  titulo: r.titulo,
  perguntas: linhas(r.perguntas),
  categoriaId: Number(r.categoriaId),
  resposta: r.resposta,
  links: linhas(r.links),
  visivelDe: r.visivelDe || null,
  visivelAte: r.visivelAte || null,
})

function Validade({ a }: { a: Artigo }) {
  return (
    <>
      {a.visivelDe && ` · válido de ${dataBr(a.visivelDe)}`}
      {a.visivelAte && ` · válido até ${dataBr(a.visivelAte)}`}
    </>
  )
}

function ItemArtigo({ a, editar, mudar, arquivar, pendente }: { a: Artigo; editar: () => void; mudar: () => void; arquivar: () => void; pendente: boolean }) {
  return (
    <ListGroup.Item>
      <div className="d-flex justify-content-between gap-2 flex-wrap">
        <strong style={{ overflowWrap: 'anywhere' }}>{a.versao.titulo}</strong>
        <Stack direction="horizontal" gap={1}>
          <SeloIndexacao valor={a.indexacao} />
          <Badge bg={Cores[a.estado]}>{a.estado}</Badge>
        </Stack>
      </div>
      <div className="small text-body-secondary">
        {a.categoria} · versão {a.versao.numero}
        <Validade a={a} />
      </div>
      <Stack direction="horizontal" gap={2} className="mt-2 flex-wrap">
        <Button size="sm" variant="outline-primary" onClick={editar}>
          Editar
        </Button>
        {a.estado !== 'ATIVO' && (
          <BotaoAcao size="sm" variant="outline-success" pendente={pendente} onClick={mudar}>
            Ativar
          </BotaoAcao>
        )}
        {a.estado !== 'ARQUIVADO' && (
          <Button size="sm" variant="outline-danger" onClick={arquivar} disabled={pendente}>
            Arquivar
          </Button>
        )}
      </Stack>
    </ListGroup.Item>
  )
}

function CamposDoArtigo({ editando, setEditando, categorias }: { editando: Rascunho; setEditando: (r: Rascunho) => void; categorias: Categoria[] }) {
  const muda = (chave: keyof Rascunho) => (e: { target: { value: string } }) => setEditando({ ...editando, [chave]: e.target.value })
  return (
    <>
      <p className="small text-body-secondary">{editando.id ? 'Salvar cria uma nova versão; as anteriores ficam guardadas.' : 'O artigo nasce como rascunho e só entra na base do assistente quando for ativado.'}</p>
      <Form.Group controlId="titulo" className="mb-2">
        <Form.Label>Título</Form.Label>
        <Form.Control maxLength={200} value={editando.titulo} onChange={muda('titulo')} />
      </Form.Group>
      <Form.Group controlId="perguntas" className="mb-2">
        <Form.Label>Perguntas relacionadas (uma por linha)</Form.Label>
        <Form.Control as="textarea" rows={3} value={editando.perguntas} onChange={muda('perguntas')} />
      </Form.Group>
      <Form.Group controlId="categoria" className="mb-2">
        <Form.Label>Categoria</Form.Label>
        <Form.Select value={editando.categoriaId} onChange={muda('categoriaId')}>
          <Opcoes vazio="Escolha a categoria" itens={categorias} />
        </Form.Select>
      </Form.Group>
      <Form.Group controlId="resposta-artigo" className="mb-2">
        <Form.Label>Resposta</Form.Label>
        <Form.Control as="textarea" rows={6} maxLength={8000} value={editando.resposta} onChange={muda('resposta')} />
      </Form.Group>
      <Form.Group controlId="links">
        <Form.Label>Links (um por linha, com https://)</Form.Label>
        <Form.Control as="textarea" rows={2} value={editando.links} onChange={muda('links')} />
      </Form.Group>
      <Row className="g-2 mt-1">
        <Col xs={6}>
          <Form.Group controlId="visivelDe">
            <Form.Label>Válido de (opcional)</Form.Label>
            <Form.Control type="date" value={editando.visivelDe} onChange={muda('visivelDe')} />
          </Form.Group>
        </Col>
        <Col xs={6}>
          <Form.Group controlId="visivelAte">
            <Form.Label>Válido até (opcional)</Form.Label>
            <Form.Control type="date" value={editando.visivelAte} onChange={muda('visivelAte')} />
          </Form.Group>
        </Col>
      </Row>
    </>
  )
}

// S7: a base interna que o assistente usa como fonte; nunca aparece para o aluno.
export function Artigos() {
  const { itens: artigos, categorias, carregar, carga } = useBase<Artigo>('/api/admin/artigos')
  const [editando, setEditando] = useState<Rascunho>()
  const [arquivar, setArquivar] = useState<Artigo>()
  const acao = useAcao()

  function salvar(e: FormEvent) {
    e.preventDefault()
    const r = editando!
    acao.executar(async () => {
      await api(r.id ? `/api/admin/artigos/${r.id}` : '/api/admin/artigos', corpo(r), r.id ? 'PUT' : undefined)
      setEditando(undefined)
      await carregar()
    })
  }

  function mudar(a: Artigo, para: 'ativar' | 'arquivar') {
    setArquivar(undefined)
    acao.executar(async () => {
      await api(`/api/admin/artigos/${a.id}/${para}`, {})
      await carregar()
    })
  }

  return (
    <>
      <Stack direction="horizontal" className="mb-3 flex-wrap gap-2">
        <h1 className="h4 me-auto mb-0">Artigos</h1>
        <Button onClick={() => setEditando({ ...Novo })}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          Novo
        </Button>
      </Stack>
      <p className="small text-body-secondary">Orientações internas usadas pelo assistente. O aluno nunca vê os artigos, só a resposta.</p>
      {carga.alerta}
      {acao.alerta}
      <Situacao itens={artigos} erro={carga.erro} />
      <ListGroup>
        {artigos?.map((a) => (
          <ItemArtigo key={a.id} a={a} editar={() => setEditando(rascunho(a))} mudar={() => mudar(a, 'ativar')} arquivar={() => setArquivar(a)} pendente={acao.pendente} />
        ))}
      </ListGroup>

      <Modal show={!!editando} onHide={() => setEditando(undefined)} size="lg">
        <Form onSubmit={salvar}>
          <Modal.Header closeButton>
            <Modal.Title>{editando?.id ? 'Editar artigo' : 'Novo artigo'}</Modal.Title>
          </Modal.Header>
          {editando && (
            <Modal.Body>
              <CamposDoArtigo editando={editando} setEditando={setEditando} categorias={categorias} />
              {acao.alerta}
            </Modal.Body>
          )}
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditando(undefined)}>
              Cancelar
            </Button>
            <BotaoAcao type="submit" pendente={acao.pendente}>
              Salvar
            </BotaoAcao>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmarArquivar tipo="artigo" titulo={arquivar?.versao.titulo} aberto={!!arquivar} fechar={() => setArquivar(undefined)} arquivar={() => mudar(arquivar!, 'arquivar')} />
    </>
  )
}
