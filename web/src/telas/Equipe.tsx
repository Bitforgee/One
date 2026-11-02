import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, Col, Form, ListGroup, Modal, Row, Spinner, Stack } from 'react-bootstrap'
import { BotaoAcao, useAcao } from '../acao'
import { api } from '../api'

type Versao = { id: number; numero: number; titulo: string; perguntas: string[]; resposta: string; links: string[] }
type Indexacao = 'PENDENTE' | 'INDEXADO' | 'FALHOU'
type Artigo = { id: number; estado: 'RASCUNHO' | 'ATIVO' | 'ARQUIVADO'; indexacao: Indexacao | null; categoriaId: number; categoria: string; visivelDe: string | null; visivelAte: string | null; versao: Versao }
type Categoria = { id: number; nome: string; ativa: boolean }
type Rascunho = { id?: number; titulo: string; perguntas: string; categoriaId: string; resposta: string; links: string; visivelDe: string; visivelAte: string }

const Cores = { RASCUNHO: 'secondary', ATIVO: 'success', ARQUIVADO: 'dark' } as const
// RAG: o assistente só busca o que já tem embedding; o agendador indexa em segundo plano.
const Indexacoes = { PENDENTE: ['Indexando', 'info'], INDEXADO: ['Indexado', 'success'], FALHOU: ['Falhou', 'danger'] } as const
function SeloIndexacao({ valor }: { valor: Indexacao | null }) {
  if (!valor) return null
  const [rotulo, cor] = Indexacoes[valor]
  return (
    <Badge bg={cor} title="Indexação para a busca do assistente">
      {rotulo}
    </Badge>
  )
}
const dataBr = (iso: string) => iso.split('-').reverse().join('/')
const linhas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean)

// S7: a base interna que o assistente usa como fonte; nunca aparece para o aluno.
export function Artigos() {
  const [artigos, setArtigos] = useState<Artigo[]>()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [editando, setEditando] = useState<Rascunho>()
  const [arquivar, setArquivar] = useState<Artigo>()
  const carga = useAcao()
  const acao = useAcao()

  const carregar = useCallback(
    () =>
      carga.executar(async () => {
        const [a, c] = await Promise.all([api<Artigo[]>('/api/admin/artigos'), api<Categoria[]>('/api/admin/categorias')])
        setArtigos(a)
        setCategorias(c.filter((x) => x.ativa))
      }),
    [],
  )
  useEffect(() => void carregar(), [carregar])

  function salvar(e: FormEvent) {
    e.preventDefault()
    const r = editando!
    const corpo = { titulo: r.titulo, perguntas: linhas(r.perguntas), categoriaId: Number(r.categoriaId), resposta: r.resposta, links: linhas(r.links), visivelDe: r.visivelDe || null, visivelAte: r.visivelAte || null }
    acao.executar(async () => {
      await api(r.id ? `/api/admin/artigos/${r.id}` : '/api/admin/artigos', corpo, r.id ? 'PUT' : undefined)
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

  const novo = () => setEditando({ titulo: '', perguntas: '', categoriaId: '', resposta: '', links: '', visivelDe: '', visivelAte: '' })
  const editar = (a: Artigo) =>
    setEditando({ id: a.id, titulo: a.versao.titulo, perguntas: a.versao.perguntas.join('\n'), categoriaId: String(a.categoriaId), resposta: a.versao.resposta, links: a.versao.links.join('\n'), visivelDe: a.visivelDe ?? '', visivelAte: a.visivelAte ?? '' })

  return (
    <>
      <Stack direction="horizontal" className="mb-3 flex-wrap gap-2">
        <h1 className="h4 me-auto mb-0">Artigos</h1>
        <Button onClick={novo}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          Novo
        </Button>
      </Stack>
      <p className="small text-body-secondary">Orientações internas usadas pelo assistente. O aluno nunca vê os artigos, só a resposta.</p>
      {carga.alerta}
      {acao.alerta}
      {!artigos && !carga.erro && <Spinner animation="border" role="status" aria-label="Carregando" />}
      {artigos?.length === 0 && <p className="text-body-secondary">Nenhum item cadastrado.</p>}
      <ListGroup>
        {artigos?.map((a) => (
          <ListGroup.Item key={a.id}>
            <div className="d-flex justify-content-between gap-2 flex-wrap">
              <strong style={{ overflowWrap: 'anywhere' }}>{a.versao.titulo}</strong>
              <Stack direction="horizontal" gap={1}>
                <SeloIndexacao valor={a.indexacao} />
                <Badge bg={Cores[a.estado]}>{a.estado}</Badge>
              </Stack>
            </div>
            <div className="small text-body-secondary">
              {a.categoria} · versão {a.versao.numero}
              {a.visivelDe && ` · válido de ${dataBr(a.visivelDe)}`}
              {a.visivelAte && ` · válido até ${dataBr(a.visivelAte)}`}
            </div>
            <Stack direction="horizontal" gap={2} className="mt-2 flex-wrap">
              <Button size="sm" variant="outline-primary" onClick={() => editar(a)}>
                Editar
              </Button>
              {a.estado !== 'ATIVO' && (
                <BotaoAcao size="sm" variant="outline-success" pendente={acao.pendente} onClick={() => mudar(a, 'ativar')}>
                  Ativar
                </BotaoAcao>
              )}
              {a.estado !== 'ARQUIVADO' && (
                <Button size="sm" variant="outline-danger" onClick={() => setArquivar(a)} disabled={acao.pendente}>
                  Arquivar
                </Button>
              )}
            </Stack>
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Modal show={!!editando} onHide={() => setEditando(undefined)} size="lg">
        <Form onSubmit={salvar}>
          <Modal.Header closeButton>
            <Modal.Title>{editando?.id ? 'Editar artigo' : 'Novo artigo'}</Modal.Title>
          </Modal.Header>
          {editando && (
            <Modal.Body>
              <p className="small text-body-secondary">{editando.id ? 'Salvar cria uma nova versão; as anteriores ficam guardadas.' : 'O artigo nasce como rascunho e só entra na base do assistente quando for ativado.'}</p>
              <Form.Group controlId="titulo" className="mb-2">
                <Form.Label>Título</Form.Label>
                <Form.Control maxLength={200} value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} />
              </Form.Group>
              <Form.Group controlId="perguntas" className="mb-2">
                <Form.Label>Perguntas relacionadas (uma por linha)</Form.Label>
                <Form.Control as="textarea" rows={3} value={editando.perguntas} onChange={(e) => setEditando({ ...editando, perguntas: e.target.value })} />
              </Form.Group>
              <Form.Group controlId="categoria" className="mb-2">
                <Form.Label>Categoria</Form.Label>
                <Form.Select value={editando.categoriaId} onChange={(e) => setEditando({ ...editando, categoriaId: e.target.value })}>
                  <option value="">Escolha a categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group controlId="resposta-artigo" className="mb-2">
                <Form.Label>Resposta</Form.Label>
                <Form.Control as="textarea" rows={6} maxLength={8000} value={editando.resposta} onChange={(e) => setEditando({ ...editando, resposta: e.target.value })} />
              </Form.Group>
              <Form.Group controlId="links">
                <Form.Label>Links (um por linha, com https://)</Form.Label>
                <Form.Control as="textarea" rows={2} value={editando.links} onChange={(e) => setEditando({ ...editando, links: e.target.value })} />
              </Form.Group>
              <Row className="g-2 mt-1">
                <Col xs={6}>
                  <Form.Group controlId="visivelDe">
                    <Form.Label>Válido de (opcional)</Form.Label>
                    <Form.Control type="date" value={editando.visivelDe} onChange={(e) => setEditando({ ...editando, visivelDe: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col xs={6}>
                  <Form.Group controlId="visivelAte">
                    <Form.Label>Válido até (opcional)</Form.Label>
                    <Form.Control type="date" value={editando.visivelAte} onChange={(e) => setEditando({ ...editando, visivelAte: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>
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

      <Modal show={!!arquivar} onHide={() => setArquivar(undefined)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Arquivar o artigo?</Modal.Title>
        </Modal.Header>
        <Modal.Body>“{arquivar?.versao.titulo}” sai da base do assistente. As conversas que já o citaram continuam como estão.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setArquivar(undefined)}>
            Voltar
          </Button>
          <Button variant="danger" onClick={() => mudar(arquivar!, 'arquivar')}>
            Arquivar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

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

// RAG S3: PDFs da instituição que o assistente consulta; o aluno nunca vê o documento, só a resposta.
export function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [envio, setEnvio] = useState<Envio>()
  const [arquivar, setArquivar] = useState<Documento>()
  const carga = useAcao()
  const acao = useAcao()

  const carregar = useCallback(
    () =>
      carga.executar(async () => {
        const [d, c] = await Promise.all([api<Documento[]>('/api/admin/documentos'), api<Categoria[]>('/api/admin/categorias')])
        setDocumentos(d)
        setCategorias(c.filter((x) => x.ativa))
      }),
    [],
  )
  useEffect(() => void carregar(), [carregar])

  function enviar(e: FormEvent) {
    e.preventDefault()
    const r = envio!
    const f = new FormData()
    if (!r.id) {
      f.append('titulo', r.titulo)
      f.append('categoriaId', r.categoriaId)
    }
    if (r.arquivo) f.append('arquivo', r.arquivo)
    acao.executar(async () => {
      await api(r.id ? `/api/admin/documentos/${r.id}/versoes` : '/api/admin/documentos', f)
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
      {!documentos && !carga.erro && <Spinner animation="border" role="status" aria-label="Carregando" />}
      {documentos?.length === 0 && <p className="text-body-secondary">Nenhum item cadastrado.</p>}
      <ListGroup>
        {documentos?.map((d) => (
          <ListGroup.Item key={d.id}>
            <div className="d-flex justify-content-between gap-2 flex-wrap">
              <strong style={{ overflowWrap: 'anywhere' }}>{d.titulo}</strong>
              <Stack direction="horizontal" gap={1}>
                <SeloIndexacao valor={d.indexacao} />
                <Badge bg={d.estado === 'ATIVO' ? 'success' : 'dark'}>{d.estado}</Badge>
              </Stack>
            </div>
            <div className="small text-body-secondary" style={{ overflowWrap: 'anywhere' }}>
              {d.categoria} · versão {d.versao.numero} · {d.versao.paginas} {d.versao.paginas === 1 ? 'página' : 'páginas'} · {d.versao.nomeArquivo}
            </div>
            {d.estado === 'ATIVO' && (
              <Stack direction="horizontal" gap={2} className="mt-2 flex-wrap">
                <Button size="sm" variant="outline-primary" onClick={() => setEnvio({ id: d.id, titulo: d.titulo, categoriaId: String(d.categoriaId) })} disabled={acao.pendente}>
                  Nova versão
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => setArquivar(d)} disabled={acao.pendente}>
                  Arquivar
                </Button>
              </Stack>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Modal show={!!envio} onHide={() => setEnvio(undefined)}>
        <Form onSubmit={enviar}>
          <Modal.Header closeButton>
            <Modal.Title>{envio?.id ? 'Nova versão' : 'Enviar PDF'}</Modal.Title>
          </Modal.Header>
          {envio && (
            <Modal.Body>
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
                      <option value="">Escolha a categoria</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </>
              )}
              <Form.Group controlId="arquivo-documento">
                <Form.Label>Arquivo PDF</Form.Label>
                <Form.Control type="file" accept=".pdf,application/pdf" onChange={(e) => setEnvio({ ...envio, arquivo: (e.target as HTMLInputElement).files?.[0] })} />
              </Form.Group>
              {acao.alerta}
            </Modal.Body>
          )}
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEnvio(undefined)}>
              Cancelar
            </Button>
            <BotaoAcao type="submit" pendente={acao.pendente} disabled={!envio?.arquivo}>
              Enviar
            </BotaoAcao>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!arquivar} onHide={() => setArquivar(undefined)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Arquivar o documento?</Modal.Title>
        </Modal.Header>
        <Modal.Body>“{arquivar?.titulo}” sai da base do assistente. As conversas que já o citaram continuam como estão.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setArquivar(undefined)}>
            Voltar
          </Button>
          <Button variant="danger" onClick={() => confirmarArquivar(arquivar!)}>
            Arquivar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

type Ranking = { categoria: string; total: number }[] | null
type Indicadores = {
  semDados: boolean
  alunosAtivos: number | null
  conversas: number | null
  taxaAutoatendimento: number | null
  taxaEscalonamento: number | null
  taxaAbandono: number | null
  taxaPerguntasSemArtigo: number | null
  chamadosAbertos: number
  chamadosResolvidos: number
  tempoPrimeiraRespostaHoras: number | null
  tempoResolucaoHoras: number | null
  roteamentoCorreto: number | null
  taxaReabertura: number | null
  principaisCategorias: { porConversas: Ranking; porChamados: Ranking }
  indicadorPrincipal: number | null
}

const dia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 1000) / 10}%`.replace('.', ','))
const horas = (v: number | null) => (v === null ? '—' : `${String(v).replace('.', ',')} h`)
const num = (v: number | null) => (v === null ? '—' : String(v))

// S11: os 14 indicadores do Quadro 12, por período, no fuso da instituição.
export function Indicadores() {
  const hoje = new Date()
  const [de, setDe] = useState(dia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)))
  const [ate, setAte] = useState(dia(hoje))
  const [dados, setDados] = useState<Indicadores>()
  const acao = useAcao()

  const consultar = useCallback(
    (de: string, ate: string) => acao.executar(async () => setDados(await api<Indicadores>(`/api/indicadores?de=${de}&ate=${ate}`))),
    [],
  )
  useEffect(() => void consultar(de, ate), [consultar])

  const cartoes: [string, string][] = dados
    ? [
        ['Indicador principal', pct(dados.indicadorPrincipal)],
        ['Alunos ativos', num(dados.alunosAtivos)],
        ['Conversas', num(dados.conversas)],
        ['Autoatendimento', pct(dados.taxaAutoatendimento)],
        ['Escalonamento', pct(dados.taxaEscalonamento)],
        ['Abandono', pct(dados.taxaAbandono)],
        ['Perguntas sem artigo', pct(dados.taxaPerguntasSemArtigo)],
        ['Chamados abertos agora', String(dados.chamadosAbertos)],
        ['Chamados resolvidos', String(dados.chamadosResolvidos)],
        ['Tempo até a 1ª resposta', horas(dados.tempoPrimeiraRespostaHoras)],
        ['Tempo de resolução', horas(dados.tempoResolucaoHoras)],
        ['Roteamento correto', pct(dados.roteamentoCorreto)],
        ['Reabertura', pct(dados.taxaReabertura)],
      ]
    : []

  return (
    <>
      <h1 className="h4">Indicadores</h1>
      <Form
        className="mb-3"
        onSubmit={(e) => {
          e.preventDefault()
          consultar(de, ate)
        }}
      >
        <Row className="g-2 align-items-end">
          <Col xs={6} sm="auto">
            <Form.Group controlId="de">
              <Form.Label>De</Form.Label>
              <Form.Control type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs={6} sm="auto">
            <Form.Group controlId="ate">
              <Form.Label>Até</Form.Label>
              <Form.Control type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs="auto">
            <BotaoAcao type="submit" pendente={acao.pendente}>
              Consultar
            </BotaoAcao>
          </Col>
        </Row>
      </Form>
      {acao.alerta}
      {dados?.semDados && <Alert variant="secondary">Sem dados no período</Alert>}
      {dados && !dados.semDados && (
        <>
          <Row xs={2} md={4} className="g-2 mb-3">
            {cartoes.map(([rotulo, valor]) => (
              <Col key={rotulo}>
                <Card className="h-100">
                  <Card.Body className="p-2">
                    <div className="small text-body-secondary">{rotulo}</div>
                    <div className="fs-5 fw-semibold">{valor}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          <Row xs={1} md={2} className="g-2">
            {(
              [
                ['Categorias por conversas', dados.principaisCategorias.porConversas],
                ['Categorias por chamados', dados.principaisCategorias.porChamados],
              ] as const
            )
              .filter(([, r]) => r !== null)
              .map(([titulo, r]) => (
                <Col key={titulo}>
                  <Card>
                    <Card.Header className="small">{titulo}</Card.Header>
                    <ListGroup variant="flush" className="small">
                      {r!.length === 0 && <ListGroup.Item>—</ListGroup.Item>}
                      {r!.map((x) => (
                        <ListGroup.Item key={x.categoria} className="d-flex justify-content-between">
                          <span style={{ overflowWrap: 'anywhere' }}>{x.categoria}</span>
                          <span>{x.total}</span>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Card>
                </Col>
              ))}
          </Row>
        </>
      )}
    </>
  )
}
