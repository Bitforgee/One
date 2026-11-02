import { useState, type FormEvent } from 'react'
import { Alert, Button, Card, Form, Modal, Spinner, Stack } from 'react-bootstrap'
import { Link, useParams } from 'react-router'
import { BotaoAcao, useAcao } from '../acao'
import { api, type Matricula } from '../api'
import { useChamado } from '../chamado'
import { formatarData } from '../datas'
import { useSessao } from '../sessao'

type Tipo = 'resposta' | 'pergunta' | 'sem_base' | 'transferir'
type Mensagem = { autor: 'ALUNO' | 'ASSISTENTE'; texto: string; tipo?: Tipo; em: string }
type Resposta = { tipo: Tipo; texto: string }
type Transferencia = { numero: string; estado: string; setor: string }
type Confirmar = 'atendente' | 'encerrar'

const AvisoExterno =
  'Suas mensagens são analisadas por um serviço externo de inteligência artificial, com servidores fora do Brasil. Não escreva CPF, matrícula, telefone ou dados de saúde.'
const AvisoResposta = 'Resposta gerada por IA com base nas orientações da instituição.'
const LimiteDoAluno = 10
const quebra = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const

// No limite de mensagens, depois de um sem_base ou de um "Não", o atendente vira o botão principal.
function situacao(mensagens: Mensagem[], explicar: boolean) {
  const ultima = mensagens.at(-1)
  const noLimite = mensagens.filter((m) => m.autor === 'ALUNO').length >= LimiteDoAluno
  return { ultima: ultima?.tipo, noLimite, destaque: explicar || ultima?.tipo === 'sem_base' || noLimite }
}

// Sem conversa, o aluno descreve o pedido; com mais de uma matrícula ativa, escolhe qual (AC 66).
function podeConfirmar(confirmar: Confirmar | undefined, conversaId: number | undefined, descricao: string, ativas: number, matriculaId: string) {
  if (confirmar === 'encerrar') return true
  const pedido = conversaId !== undefined || (descricao.trim().length > 0 && descricao.length <= 2000)
  return pedido && (ativas <= 1 || matriculaId !== '')
}

// A primeira mensagem abre a conversa; as seguintes vão para ela.
function perguntar(conversaId: number | undefined, mensagem: string) {
  const url = conversaId === undefined ? '/api/conversas' : `/api/conversas/${conversaId}/mensagens`
  return api<{ conversaId?: number; resposta: Resposta }>(url, { mensagem })
}

// Com conversa, transfere a conversa; sem ela, abre o atendimento direto com a descrição.
function transferir(conversaId: number | undefined, descricao: string, matriculaId: number | undefined) {
  const escolha = { matriculaId }
  return conversaId === undefined
    ? api<Transferencia>('/api/atendimento-direto', { descricao, ...escolha })
    : api<Transferencia>(`/api/conversas/${conversaId}/transferir`, escolha)
}

function Conversa({ mensagens, fuso, digitando }: { mensagens: Mensagem[]; fuso: string; digitando: boolean }) {
  return (
    <Stack gap={2} className="mb-3">
      {mensagens.map((m, i) => (
        <Card key={i} className={m.autor === 'ALUNO' ? 'ms-auto bg-primary-subtle' : 'me-auto'} style={{ maxWidth: '90%' }}>
          <Card.Body className="py-2 px-3">
            <div style={quebra}>{m.texto}</div>
            {m.tipo === 'resposta' && <div className="small text-body-secondary mt-1">{AvisoResposta}</div>}
            <div className="small text-body-secondary text-end">{formatarData(m.em, fuso)}</div>
          </Card.Body>
        </Card>
      ))}
      {digitando && (
        <div className="text-body-secondary small">
          <Spinner animation="grow" size="sm" role="status" aria-label="Digitando" className="me-2" />
          digitando…
        </div>
      )}
    </Stack>
  )
}

type Seguimento = { ultima?: Tipo; avaliada: boolean; desfecho: string | null; explicar: boolean; avaliar: (resolveu: boolean) => void; pendente: boolean; transferir: () => void }

// Depois da última resposta: a avaliação, o convite para explicar melhor e a confirmação da transferência.
function Seguimento({ ultima, avaliada, desfecho, explicar, avaliar, pendente, transferir }: Seguimento) {
  return (
    <>
      {ultima === 'resposta' && !avaliada && !desfecho && <Avaliacao avaliar={avaliar} pendente={pendente} />}
      {explicar && <p>Quer explicar melhor ou falar com um atendente?</p>}
      {ultima === 'transferir' && !desfecho && (
        <Button className="mb-3" onClick={transferir}>
          Confirmar transferência
        </Button>
      )}
    </>
  )
}

function Avaliacao({ avaliar, pendente }: { avaliar: (resolveu: boolean) => void; pendente: boolean }) {
  return (
    <div className="mb-3">
      <span className="me-2">Isso resolveu?</span>
      <Button size="sm" variant="success" className="me-2" onClick={() => avaliar(true)} disabled={pendente}>
        Sim
      </Button>
      <Button size="sm" variant="outline-secondary" onClick={() => avaliar(false)} disabled={pendente}>
        Não
      </Button>
    </div>
  )
}

// Depois da transferência, as respostas públicas do atendente aparecem aqui, relidas a cada 15 s.
function Transferido({ transferido, fuso }: { transferido: Transferencia; fuso: string }) {
  const { slug } = useParams()
  const { chamado } = useChamado(transferido.numero)
  return (
    <>
      <Alert variant="success">{`Transferido para ${transferido.setor}. Protocolo ${transferido.numero}.`}</Alert>
      <Stack gap={2} className="mb-3">
        {chamado?.mensagens
          .filter((m) => m.tipo === 'PUBLICA')
          .map((m) => (
            <Card key={m.id} className={m.doAluno ? 'ms-auto bg-primary-subtle' : 'me-auto'} style={{ maxWidth: '90%' }}>
              <Card.Body className="py-2 px-3">
                {!m.doAluno && <div className="small fw-semibold">{m.autor}</div>}
                <div style={quebra}>{m.texto}</div>
                <div className="small text-body-secondary text-end">{formatarData(m.criadaEm, fuso)}</div>
              </Card.Body>
            </Card>
          ))}
      </Stack>
      <Link to={`/${slug}/chamados/${transferido.numero}`}>Abrir a solicitação {transferido.numero}</Link>
    </>
  )
}

type EntradaProps = {
  noLimite: boolean
  texto: string
  setTexto: (t: string) => void
  enviar: (e: FormEvent) => void
  pendente: boolean
  destaque: boolean
  emConversa: boolean
  confirmar: (qual: Confirmar) => void
}

function Entrada({ noLimite, texto, setTexto, enviar, pendente, destaque, emConversa, confirmar }: EntradaProps) {
  return (
    <>
      {!noLimite && (
        <Form onSubmit={enviar} className="mb-2">
          <Form.Group controlId="mensagem">
            <Form.Label className="visually-hidden">Mensagem</Form.Label>
            <Form.Control as="textarea" rows={2} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua dúvida" />
          </Form.Group>
          <BotaoAcao type="submit" pendente={pendente} className="mt-2" disabled={!texto.trim()}>
            <i className="bi bi-send me-1" aria-hidden="true" />
            Enviar
          </BotaoAcao>
        </Form>
      )}
      <Stack direction="horizontal" gap={2} className="flex-wrap">
        <Button variant={destaque ? 'primary' : 'outline-primary'} onClick={() => confirmar('atendente')}>
          <i className="bi bi-person-raised-hand me-1" aria-hidden="true" />
          Falar com atendente
        </Button>
        {emConversa && (
          <Button variant="outline-secondary" onClick={() => confirmar('encerrar')}>
            Encerrar
          </Button>
        )}
      </Stack>
    </>
  )
}

type ModalProps = {
  confirmar?: Confirmar
  fechar: () => void
  emConversa: boolean
  descricao: string
  setDescricao: (d: string) => void
  ativas: Matricula[]
  matriculaId: string
  setMatriculaId: (id: string) => void
  pronto: boolean
  confirmarAcao: () => void
}

function PedidoAoAtendente({ emConversa, descricao, setDescricao, ativas, matriculaId, setMatriculaId }: Omit<ModalProps, 'confirmar' | 'fechar' | 'pronto' | 'confirmarAcao'>) {
  return (
    <>
      <p>Sua conversa será enviada a um atendente da instituição, que responde por aqui.</p>
      {!emConversa && (
        <Form.Group controlId="descricao" className="mb-3">
          <Form.Label>Descreva seu pedido</Form.Label>
          <Form.Control as="textarea" rows={3} maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Form.Group>
      )}
      {ativas.length > 1 && (
        <Form.Group controlId="matricula">
          <Form.Label>Matrícula</Form.Label>
          <Form.Select value={matriculaId} onChange={(e) => setMatriculaId(e.target.value)}>
            <option value="">Escolha a matrícula</option>
            {ativas.map((m) => (
              <option key={m.id} value={m.id}>{`${m.numero} — ${m.curso}`}</option>
            ))}
          </Form.Select>
        </Form.Group>
      )}
    </>
  )
}

function Confirmacao({ confirmar, fechar, pronto, confirmarAcao, ...pedido }: ModalProps) {
  const encerrar = confirmar === 'encerrar'
  return (
    <Modal show={!!confirmar} onHide={fechar} centered>
      <Modal.Header closeButton>
        <Modal.Title>{encerrar ? 'Encerrar a conversa?' : 'Falar com um atendente?'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{encerrar ? 'A conversa será encerrada.' : <PedidoAoAtendente {...pedido} />}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={fechar}>
          Cancelar
        </Button>
        <Button onClick={confirmarAcao} disabled={!pronto}>
          Confirmar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function Encerrada({ desfecho }: { desfecho: string }) {
  return <Alert variant="secondary">{desfecho === 'RESOLVIDA_AUTOATENDIMENTO' ? 'Que bom que resolveu! Conversa encerrada.' : 'Conversa encerrada.'}</Alert>
}

export function Assistente() {
  const { me } = useSessao()
  const fuso = me.instituicao.fuso
  const ativas = me.matriculas.filter((m) => m.situacao === 'ATIVA')
  const [matriculaId, setMatriculaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [transferido, setTransferido] = useState<Transferencia>()
  const [conversaId, setConversaId] = useState<number>()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [desfecho, setDesfecho] = useState<string | null>(null)
  const [avaliada, setAvaliada] = useState(false)
  const [explicar, setExplicar] = useState(false)
  const [confirmar, setConfirmar] = useState<Confirmar>()
  const envio = useAcao()
  const acao = useAcao()
  const agora = () => new Date().toISOString()
  const { ultima, noLimite, destaque } = situacao(mensagens, explicar)
  const emConversa = conversaId !== undefined

  function enviar(e: FormEvent) {
    e.preventDefault()
    const mensagem = texto
    envio.executar(async () => {
      setMensagens((m) => [...m, { autor: 'ALUNO', texto: mensagem, em: agora() }])
      setTexto('')
      setAvaliada(false)
      setExplicar(false)
      const r = await perguntar(conversaId, mensagem)
      if (r.conversaId) setConversaId(r.conversaId)
      setMensagens((m) => [...m, { autor: 'ASSISTENTE', texto: r.resposta.texto, tipo: r.resposta.tipo, em: agora() }])
    })
  }

  function avaliar(resolveu: boolean) {
    acao.executar(async () => {
      const r = await api<{ desfecho: string | null }>(`/api/conversas/${conversaId}/avaliacao`, { resolveu })
      setAvaliada(true)
      setDesfecho(r.desfecho)
      setExplicar(!resolveu)
    })
  }

  function confirmarAcao() {
    const qual = confirmar
    setConfirmar(undefined)
    acao.executar(async () => {
      if (qual === 'encerrar') setDesfecho((await api<{ desfecho: string }>(`/api/conversas/${conversaId}/encerrar`, {})).desfecho)
      else {
        // AC 66: com mais de uma matrícula ativa, o aluno escolhe qual
        setTransferido(await transferir(conversaId, descricao, ativas.length > 1 ? Number(matriculaId) : undefined))
        setDesfecho('TRANSFERIDA')
      }
    })
  }

  function abrir(qual: Confirmar) {
    if (qual === 'atendente') setDescricao(texto)
    setConfirmar(qual)
  }

  return (
    <>
      <h1 className="h4">Assistente</h1>
      <Alert variant="info" className="small">
        <i className="bi bi-shield-exclamation me-2" aria-hidden="true" />
        {AvisoExterno}
      </Alert>
      {mensagens.length === 0 && (
        <p className="text-body-secondary">
          Pergunte, por exemplo: “Como emito o boleto do semestre?” ou “Posso abonar falta com atestado?”
        </p>
      )}
      <Conversa mensagens={mensagens} fuso={fuso} digitando={envio.pendente} />
      <Seguimento ultima={ultima} avaliada={avaliada} desfecho={desfecho} explicar={explicar} avaliar={avaliar} pendente={acao.pendente} transferir={() => abrir('atendente')} />
      {transferido ? (
        <Transferido transferido={transferido} fuso={fuso} />
      ) : desfecho ? (
        <Encerrada desfecho={desfecho} />
      ) : (
        <Entrada noLimite={noLimite} texto={texto} setTexto={setTexto} enviar={enviar} pendente={envio.pendente} destaque={destaque} emConversa={emConversa} confirmar={abrir} />
      )}
      {envio.alerta}
      {acao.alerta}
      <Confirmacao
        confirmar={confirmar}
        fechar={() => setConfirmar(undefined)}
        emConversa={emConversa}
        descricao={descricao}
        setDescricao={setDescricao}
        ativas={ativas}
        matriculaId={matriculaId}
        setMatriculaId={setMatriculaId}
        pronto={podeConfirmar(confirmar, conversaId, descricao, ativas.length, matriculaId)}
        confirmarAcao={confirmarAcao}
      />
    </>
  )
}
