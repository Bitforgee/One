import { useState, type FormEvent } from 'react'
import { Badge, Button, Form, ListGroup, Modal, Stack } from 'react-bootstrap'
import { BotaoBs, useAcao } from '../acao'
import { api } from '../api'
import { Opcoes } from '../Opcoes'
import { ConfirmarArquivar, SeloIndexacao, Situacao, useBase, type Categoria, type Indexacao } from './comum'

type Documento = {
  id: number
  titulo: string
  categoriaId: number
  categoria: string
  estado: 'ATIVO' | 'ARQUIVADO'
  versao: { id: number; numero: number; nomeArquivo: string; paginas: number; criadaEm: string }
  indexacao: Indexacao
}
type Envio = { id?: number; titulo: string; categoriaId: string; arquivo?: File }

const paginas = (n: number) => (n === 1 ? 'página' : 'páginas')

// Documento novo leva título e categoria; nova versão leva só o arquivo.
function formulario(r: Envio) {
  const f = new FormData()
  if (!r.id) {
    f.append('titulo', r.titulo)
    f.append('categoriaId', r.categoriaId)
  }
  if (r.arquivo) f.append('arquivo', r.arquivo)
  return f
}

function ItemDocumento({ d, novaVersao, arquivar, pendente }: { d: Documento; novaVersao: () => void; arquivar: () => void; pendente: boolean }) {
  return (
    <ListGroup.Item>
      <div className="d-flex justify-content-between gap-2 flex-wrap">
        <strong style={{ overflowWrap: 'anywhere' }}>{d.titulo}</strong>
        <Stack direction="horizontal" gap={1}>
          <SeloIndexacao valor={d.indexacao} />
          <Badge bg={d.estado === 'ATIVO' ? 'success' : 'dark'}>{d.estado}</Badge>
        </Stack>
      </div>
      <div className="small text-body-secondary" style={{ overflowWrap: 'anywhere' }}>
        {d.categoria} · versão {d.versao.numero} · {d.versao.paginas} {paginas(d.versao.paginas)} · {d.versao.nomeArquivo}
      </div>
      {d.estado === 'ATIVO' && (
        <Stack direction="horizontal" gap={2} className="mt-2 flex-wrap">
          <Button size="sm" variant="outline-primary" onClick={novaVersao} disabled={pendente}>
            Nova versão
          </Button>
          <Button size="sm" variant="outline-danger" onClick={arquivar} disabled={pendente}>
            Arquivar
          </Button>
        </Stack>
      )}
    </ListGroup.Item>
  )
}

function CamposDoEnvio({ envio, setEnvio, categorias }: { envio: Envio; setEnvio: (e: Envio) => void; categorias: Categoria[] }) {
  return (
    <>
      <p className="small text-body-secondary">
        {envio.id ? `A nova versão de “${envio.titulo}” substitui a atual na busca; as anteriores ficam guardadas.` : 'PDF com texto (não digitalizado), até 20 MB.'}
      </p>
      {!envio.id && (
        <>
          <Form.Group controlId="titulo-documento" className="mb-2">
            <Form.Label>Título</Form.Label>
            <Form.Control maxLength={200} value={envio.titulo} onChange={(e) => setEnvio({ ...envio, titulo: e.target.value })} />
          </Form.Group>
          <Form.Group controlId="categoria-documento" className="mb-2">
            <Form.Label>Categoria</Form.Label>
            <Form.Select value={envio.categoriaId} onChange={(e) => setEnvio({ ...envio, categoriaId: e.target.value })}>
              <Opcoes vazio="Escolha a categoria" itens={categorias} />
            </Form.Select>
          </Form.Group>
        </>
      )}
      <Form.Group controlId="arquivo-documento">
        <Form.Label>Arquivo PDF</Form.Label>
        <Form.Control type="file" accept=".pdf,application/pdf" onChange={(e) => setEnvio({ ...envio, arquivo: (e.target as HTMLInputElement).files![0] })} />
      </Form.Group>
    </>
  )
}

// RAG S3: PDFs da instituição que o assistente consulta; o aluno nunca vê o documento, só a resposta.
export function Documentos() {
  const { itens: documentos, categorias, carregar, carga } = useBase<Documento>('/api/admin/documentos')
  const [envio, setEnvio] = useState<Envio>()
  const [arquivar, setArquivar] = useState<Documento>()
  const acao = useAcao()

  function enviar(e: FormEvent) {
    e.preventDefault()
    const r = envio!
    acao.executar(async () => {
      await api(r.id ? `/api/admin/documentos/${r.id}/versoes` : '/api/admin/documentos', formulario(r))
      setEnvio(undefined)
      await carregar()
    })
  }

  function confirmarArquivar(d: Documento) {
    setArquivar(undefined)
    acao.executar(async () => {
      await api(`/api/admin/documentos/${d.id}/arquivar`, {})
      await carregar()
    })
  }

  return (
    <>
      <Stack direction="horizontal" className="mb-3 flex-wrap gap-2">
        <h1 className="h4 me-auto mb-0">Documentos</h1>
        <Button onClick={() => setEnvio({ titulo: '', categoriaId: '' })}>
          <i className="bi bi-upload me-1" aria-hidden="true" />
          Enviar PDF
        </Button>
      </Stack>
      <p className="small text-body-secondary">PDFs da instituição (regulamentos, calendários, editais) que o assistente consulta. O aluno nunca vê o documento, só a resposta.</p>
      {carga.alerta}
      {!envio && acao.alerta}
      <Situacao itens={documentos} erro={carga.erro} />
      <ListGroup>
        {documentos?.map((d) => (
          <ItemDocumento key={d.id} d={d} novaVersao={() => setEnvio({ id: d.id, titulo: d.titulo, categoriaId: String(d.categoriaId) })} arquivar={() => setArquivar(d)} pendente={acao.pendente} />
        ))}
      </ListGroup>

      <Modal show={!!envio} onHide={() => setEnvio(undefined)}>
        <Form onSubmit={enviar}>
          <Modal.Header closeButton>
            <Modal.Title>{envio?.id ? 'Nova versão' : 'Enviar PDF'}</Modal.Title>
          </Modal.Header>
          {envio && (
            <Modal.Body>
              <CamposDoEnvio envio={envio} setEnvio={setEnvio} categorias={categorias} />
              {acao.alerta}
            </Modal.Body>
          )}
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEnvio(undefined)}>
              Cancelar
            </Button>
            <BotaoBs type="submit" pendente={acao.pendente} disabled={!envio?.arquivo}>
              Enviar
            </BotaoBs>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmarArquivar tipo="documento" titulo={arquivar?.titulo} aberto={!!arquivar} fechar={() => setArquivar(undefined)} arquivar={() => confirmarArquivar(arquivar!)} />
    </>
  )
}
