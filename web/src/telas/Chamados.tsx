import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, Form, ListGroup, Modal, Spinner, Stack } from 'react-bootstrap'
import { Link, useParams } from 'react-router'
import { BotaoAcao, useAcao } from '../acao'
import { api, ErroApi } from '../api'
import { Estados, useChamado, type Chamado } from '../chamado'
import { formatarData } from '../datas'
import { useSessao } from '../sessao'

type ItemFila = { numero: string; titulo: string; categoria: string; estado: string; responsavel: string | null; criadoEm: string; dias: number }
type ItemMeu = { numero: string; titulo: string; estado: string; criadoEm: string }

function useLista<T>(url: string) {
  const [itens, setItens] = useState<T[]>()
  const [erro, setErro] = useState<string>()
  useEffect(() => {
    api<T[]>(url).then(setItens, (e: Error) => setErro(e.message))
  }, [url])
  return { itens, erro }
}

function Carregando() {
  return <Spinner animation="border" role="status" aria-label="Carregando" />
}

export function Fila() {
  const { slug } = useParams()
  const { itens, erro } = useLista<ItemFila>('/api/chamados?escopo=fila')
  return (
    <>
      <h1 className="h4">Fila</h1>
      {erro && <Alert variant="danger">{erro}</Alert>}
      {!itens && !erro && <Carregando />}
      {itens?.length === 0 && <p className="text-body-secondary">Nenhum chamado na fila dos seus setores.</p>}
      <ListGroup>
        {itens?.map((c) => (
          <ListGroup.Item key={c.numero} action as={Link} to={`/${slug}/chamados/${c.numero}`}>
            <div className="d-flex justify-content-between gap-2 flex-wrap">
              <strong>{c.numero}</strong>
              <Badge bg="secondary">{Estados[c.estado]}</Badge>
            </div>
            <div style={{ overflowWrap: 'anywhere' }}>{c.titulo}</div>
            <div className="small text-body-secondary">
              {c.categoria} · {c.responsavel ?? 'sem responsável'} · {c.dias === 1 ? '1 dia' : `${c.dias} dias`}
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  )
}

export function Solicitacoes() {
  const { slug } = useParams()
  const { itens, erro } = useLista<ItemMeu>('/api/chamados?escopo=meus')
  return (
    <>
      <h1 className="h4">Minhas solicitações</h1>
      {erro && <Alert variant="danger">{erro}</Alert>}
      {!itens && !erro && <Carregando />}
      {itens?.length === 0 && (
        <p className="text-body-secondary">
          Você ainda não tem solicitações. <Link to={`/${slug}/assistente`}>Fale com o assistente</Link>.
        </p>
      )}
      <ListGroup>
        {itens?.map((c) => (
          <ListGroup.Item key={c.numero} action as={Link} to={`/${slug}/chamados/${c.numero}`}>
            <div className="d-flex justify-content-between gap-2 flex-wrap">
              <strong>{c.numero}</strong>
              <Badge bg="secondary">{Estados[c.estado]}</Badge>
            </div>
            <div style={{ overflowWrap: 'anywhere' }}>{c.titulo}</div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  )
}

const quebra = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const

export function ChamadoDetalhe() {
  const { numero } = useParams()
  const { me } = useSessao()
  const { chamado, erro, carregar, setChamado } = useChamado(numero)
  const acao = useAcao()
  const [texto, setTexto] = useState('')
  const [nota, setNota] = useState(false)
  const [aguardaAluno, setAguardaAluno] = useState(false)
  const [resolucao, setResolucao] = useState('')
  const [motivo, setMotivo] = useState('')
  const [cancelar, setCancelar] = useState(false)
  const [encaminhar, setEncaminhar] = useState(false)
  const [setorId, setSetorId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const fuso = me.instituicao.fuso

  if (erro && !chamado) return <Alert variant="danger">{erro}</Alert>
  if (!chamado) return <Carregando />
  const c = chamado
  const equipe = c.eventos !== null
  const pode = (a: string) => c.acoes.includes(a)

  // Toda ação devolve o chamado atualizado; num conflito (409) a tela relê o chamado e mostra o detail.
  function executar(caminho: string, corpo: unknown, depois?: () => void) {
    acao.executar(async () => {
      try {
        setChamado(await api<Chamado>(`/api/chamados/${c.numero}/${caminho}`, corpo))
        depois?.()
      } catch (e) {
        if (e instanceof ErroApi && e.status === 409) await carregar()
        throw e
      }
    })
  }

  function responder(e: FormEvent) {
    e.preventDefault()
    const f = new FormData()
    f.set('tipo', nota ? 'NOTA' : 'PUBLICA')
    f.set('texto', texto)
    f.set('aguardaAluno', String(!nota && aguardaAluno))
    executar('mensagens', f, () => {
      setTexto('')
      setAguardaAluno(false)
    })
  }

  return (
    <>
      <h1 className="h4" style={{ overflowWrap: 'anywhere' }}>
        {c.numero} · {c.titulo}
      </h1>
      <p className="mb-2">
        <Badge bg="primary" className="me-2">
          {Estados[c.estado]}
        </Badge>
        <span className="small text-body-secondary">
          {c.setor} · {c.categoria} · {c.responsavel ?? 'sem responsável'}
        </span>
      </p>
      {equipe && (
        <Card className="mb-3">
          <Card.Body className="small">
            <div>
              {c.solicitante} · matrícula {c.matricula.numero} · {c.matricula.curso} · {c.matricula.semestre}º semestre
            </div>
            {c.resumo && (
              <div className="mt-2">
                <div className="fw-semibold">Resumo gerado por IA</div>
                <div style={quebra}>{c.resumo}</div>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      <h2 className="h6">Conversa com o assistente</h2>
      <Stack gap={2} className="mb-3">
        {c.transcricao.map((m, i) => (
          <Card key={i} className={m.autor === 'ALUNO' ? 'ms-auto bg-primary-subtle' : 'me-auto'} style={{ maxWidth: '90%' }}>
            <Card.Body className="py-2 px-3">
              <div style={quebra}>{m.texto}</div>
              {m.fontes?.map((f) => (
                <div key={f.versaoArtigoId} className="small border-top mt-2 pt-1">
                  <div className="fw-semibold">
                    <i className="bi bi-journal-text me-1" aria-hidden="true" />
                    {f.titulo}
                  </div>
                  {f.trechos.map((t, j) => (
                    <blockquote key={j} className="mb-1 fst-italic" style={quebra}>
                      “{t}”
                    </blockquote>
                  ))}
                  {f.atualizado && <div className="text-warning-emphasis">Este artigo foi atualizado depois desta resposta.</div>}
                </div>
              ))}
              <div className="small text-body-secondary text-end">{formatarData(m.criadaEm, fuso)}</div>
            </Card.Body>
          </Card>
        ))}
      </Stack>

      <h2 className="h6">Atendimento</h2>
      <Stack gap={2} className="mb-3">
        {c.mensagens.length === 0 && <p className="text-body-secondary small">Nenhuma resposta ainda.</p>}
        {c.mensagens.map((m) => (
          <Card key={m.id} className={m.tipo === 'NOTA' ? 'bg-warning-subtle' : m.doAluno ? 'ms-auto bg-primary-subtle' : 'me-auto'} style={{ maxWidth: '90%' }}>
            <Card.Body className="py-2 px-3">
              <div className="small fw-semibold">
                {m.autor}
                {m.tipo === 'NOTA' && <Badge bg="warning" text="dark" className="ms-2">Nota interna</Badge>}
              </div>
              <div style={quebra}>{m.texto}</div>
              <div className="small text-body-secondary text-end">{formatarData(m.criadaEm, fuso)}</div>
            </Card.Body>
          </Card>
        ))}
      </Stack>

      {(pode('responder') || pode('nota')) && (
        <Form onSubmit={responder} className="mb-3">
          <Form.Group controlId="resposta">
            <Form.Label>{c.estado === 'RESOLVIDO' && !equipe ? 'Responder (reabre a solicitação)' : 'Responder'}</Form.Label>
            <Form.Control as="textarea" rows={3} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </Form.Group>
          {equipe && (
            <Stack direction="horizontal" gap={3} className="flex-wrap mt-2">
              {pode('nota') && <Form.Check id="nota" label="Nota interna" checked={nota} onChange={(e) => setNota(e.target.checked)} />}
              {pode('responder') && !nota && (
                <Form.Check id="aguarda" label="Aguardando aluno" checked={aguardaAluno} onChange={(e) => setAguardaAluno(e.target.checked)} />
              )}
            </Stack>
          )}
          <BotaoAcao type="submit" pendente={acao.pendente} className="mt-2" disabled={!texto.trim() || (!nota && !pode('responder'))}>
            Enviar
          </BotaoAcao>
        </Form>
      )}

      <Stack direction="horizontal" gap={2} className="flex-wrap mb-3">
        {pode('assumir') && (
          <BotaoAcao pendente={acao.pendente} onClick={() => executar('assumir', {})}>
            Assumir
          </BotaoAcao>
        )}
        {pode('confirmar') && (
          <BotaoAcao pendente={acao.pendente} variant="success" onClick={() => executar('confirmar', {})}>
            Confirmar resolução
          </BotaoAcao>
        )}
        {pode('encaminhar') && (
          <Button variant="outline-secondary" onClick={() => setEncaminhar(true)} disabled={acao.pendente}>
            Encaminhar
          </Button>
        )}
        {pode('cancelar') && (
          <Button variant="outline-danger" onClick={() => setCancelar(true)} disabled={acao.pendente}>
            Cancelar solicitação
          </Button>
        )}
      </Stack>

      {pode('resolver') && (
        <Form
          className="mb-3"
          onSubmit={(e) => {
            e.preventDefault()
            executar('resolver', { texto: resolucao }, () => setResolucao(''))
          }}
        >
          <Form.Group controlId="resolucao">
            <Form.Label>Resolução</Form.Label>
            <Form.Control as="textarea" rows={2} maxLength={4000} value={resolucao} onChange={(e) => setResolucao(e.target.value)} />
          </Form.Group>
          <BotaoAcao type="submit" pendente={acao.pendente} variant="success" className="mt-2" disabled={!resolucao.trim()}>
            Resolver
          </BotaoAcao>
        </Form>
      )}

      {pode('reclassificar') && (
        <Form
          className="mb-3"
          onSubmit={(e) => {
            e.preventDefault()
            executar('reclassificar', { categoriaId: Number(categoriaId) }, () => setCategoriaId(''))
          }}
        >
          <Form.Group controlId="categoria">
            <Form.Label>Reclassificar</Form.Label>
            <Stack direction="horizontal" gap={2}>
              <Form.Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                <option value="">Escolha a categoria</option>
                {c.categorias?.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </Form.Select>
              <BotaoAcao type="submit" pendente={acao.pendente} variant="outline-secondary" disabled={!categoriaId}>
                Salvar
              </BotaoAcao>
            </Stack>
          </Form.Group>
        </Form>
      )}

      {pode('rejeitar') && (
        <Form
          className="mb-3"
          onSubmit={(e) => {
            e.preventDefault()
            executar('rejeitar', { motivo }, () => setMotivo(''))
          }}
        >
          <Form.Group controlId="motivo">
            <Form.Label>Não resolveu? Explique o motivo</Form.Label>
            <Form.Control as="textarea" rows={2} maxLength={4000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Form.Group>
          <BotaoAcao type="submit" pendente={acao.pendente} variant="outline-secondary" className="mt-2" disabled={!motivo.trim()}>
            Rejeitar resolução
          </BotaoAcao>
        </Form>
      )}
      {acao.alerta}

      {c.eventos && (
        <>
          <h2 className="h6">Histórico</h2>
          <ListGroup as="ol" variant="flush" className="small mb-3" data-testid="eventos">
            {c.eventos.map((e, i) => (
              <ListGroup.Item as="li" key={i} className="px-0">
                <span className="text-body-secondary me-2">{formatarData(e.criadoEm, fuso)}</span>
                {e.tipo} · {e.ator}
                {(e.de || e.para) && ` · ${e.de ?? '—'} → ${e.para ?? '—'}`}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </>
      )}

      <Modal show={encaminhar} onHide={() => setEncaminhar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Encaminhar para outro setor?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small">O chamado volta para a fila do setor escolhido, sem responsável. O motivo fica como nota interna.</p>
          <Form.Group controlId="setor" className="mb-2">
            <Form.Label>Setor</Form.Label>
            <Form.Select value={setorId} onChange={(e) => setSetorId(e.target.value)}>
              <option value="">Escolha o setor</option>
              {c.setores?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="motivo-encaminhar">
            <Form.Label>Motivo</Form.Label>
            <Form.Control as="textarea" rows={2} maxLength={4000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEncaminhar(false)}>
            Voltar
          </Button>
          <Button
            disabled={!setorId || !motivo.trim()}
            onClick={() => {
              setEncaminhar(false)
              executar('encaminhar', { setorId: Number(setorId), motivo }, () => {
                setMotivo('')
                setSetorId('')
              })
            }}
          >
            Encaminhar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={cancelar} onHide={() => setCancelar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancelar a solicitação?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="justificativa">
            <Form.Label>Justificativa (opcional)</Form.Label>
            <Form.Control as="textarea" rows={2} maxLength={4000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setCancelar(false)}>
            Voltar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setCancelar(false)
              executar('cancelar', { motivo: motivo.trim() || undefined }, () => setMotivo(''))
            }}
          >
            Cancelar solicitação
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
