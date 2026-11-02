import { useState, type FormEvent } from 'react'
import { Alert, Button, Card, Form, Modal, Spinner, Stack } from 'react-bootstrap'
import { BotaoAcao, useAcao } from '../acao'
import { api } from '../api'
import { formatarData } from '../datas'
import { useSessao } from '../sessao'

type Tipo = 'resposta' | 'pergunta' | 'sem_base' | 'transferir'
type Mensagem = { autor: 'ALUNO' | 'ASSISTENTE'; texto: string; tipo?: Tipo; em: string }
type Resposta = { tipo: Tipo; texto: string }

const AvisoExterno =
  'Suas mensagens são analisadas por um serviço externo de inteligência artificial, com servidores fora do Brasil. Não escreva CPF, matrícula, telefone ou dados de saúde.'
const AvisoResposta = 'Resposta gerada por IA com base nas orientações da instituição.'
const LimiteDoAluno = 10

export function Assistente() {
  const { me } = useSessao()
  const [conversaId, setConversaId] = useState<number>()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [desfecho, setDesfecho] = useState<string | null>(null)
  const [avaliada, setAvaliada] = useState(false)
  const [explicar, setExplicar] = useState(false)
  const [confirmar, setConfirmar] = useState<'atendente' | 'encerrar'>()
  const envio = useAcao()
  const acao = useAcao()

  const agora = () => new Date().toISOString()
  const ultima = mensagens.at(-1)
  const doAluno = mensagens.filter((m) => m.autor === 'ALUNO').length
  const noLimite = doAluno >= LimiteDoAluno
  const destaque = explicar || ultima?.tipo === 'sem_base' || noLimite

  function enviar(e: FormEvent) {
    e.preventDefault()
    const mensagem = texto
    envio.executar(async () => {
      setMensagens((m) => [...m, { autor: 'ALUNO', texto: mensagem, em: agora() }])
      setTexto('')
      setAvaliada(false)
      setExplicar(false)
      const r = await api<{ conversaId?: number; resposta: Resposta }>(
        conversaId ? `/api/conversas/${conversaId}/mensagens` : '/api/conversas',
        { mensagem },
      )
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
      if (qual === 'encerrar') {
        setDesfecho((await api<{ desfecho: string }>(`/api/conversas/${conversaId}/encerrar`, {})).desfecho)
      } else if (conversaId) {
        await api(`/api/conversas/${conversaId}/transferir`, {})
      } else {
        await api('/api/atendimento-direto', { descricao: texto })
      }
    })
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

      <Stack gap={2} className="mb-3">
        {mensagens.map((m, i) => (
          <Card key={i} className={m.autor === 'ALUNO' ? 'ms-auto bg-primary-subtle' : 'me-auto'} style={{ maxWidth: '90%' }}>
            <Card.Body className="py-2 px-3">
              <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.texto}</div>
              {m.tipo === 'resposta' && <div className="small text-body-secondary mt-1">{AvisoResposta}</div>}
              <div className="small text-body-secondary text-end">{formatarData(m.em, me.instituicao.fuso)}</div>
            </Card.Body>
          </Card>
        ))}
        {envio.pendente && (
          <div className="text-body-secondary small">
            <Spinner animation="grow" size="sm" role="status" aria-label="Digitando" className="me-2" />
            digitando…
          </div>
        )}
      </Stack>

      {ultima?.tipo === 'resposta' && !avaliada && !desfecho && (
        <div className="mb-3">
          <span className="me-2">Isso resolveu?</span>
          <Button size="sm" variant="success" className="me-2" onClick={() => avaliar(true)} disabled={acao.pendente}>
            Sim
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={() => avaliar(false)} disabled={acao.pendente}>
            Não
          </Button>
        </div>
      )}
      {explicar && <p>Quer explicar melhor ou falar com um atendente?</p>}
      {ultima?.tipo === 'transferir' && !desfecho && (
        <Button className="mb-3" onClick={() => setConfirmar('atendente')}>
          Confirmar transferência
        </Button>
      )}

      {desfecho ? (
        <Alert variant="secondary">{desfecho === 'RESOLVIDA_AUTOATENDIMENTO' ? 'Que bom que resolveu! Conversa encerrada.' : 'Conversa encerrada.'}</Alert>
      ) : (
        <>
          {!noLimite && (
            <Form onSubmit={enviar} className="mb-2">
              <Form.Group controlId="mensagem">
                <Form.Label className="visually-hidden">Mensagem</Form.Label>
                <Form.Control as="textarea" rows={2} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua dúvida" />
              </Form.Group>
              <BotaoAcao type="submit" pendente={envio.pendente} className="mt-2" disabled={!texto.trim()}>
                <i className="bi bi-send me-1" aria-hidden="true" />
                Enviar
              </BotaoAcao>
            </Form>
          )}
          <Stack direction="horizontal" gap={2} className="flex-wrap">
            <Button variant={destaque ? 'primary' : 'outline-primary'} onClick={() => setConfirmar('atendente')}>
              <i className="bi bi-person-raised-hand me-1" aria-hidden="true" />
              Falar com atendente
            </Button>
            {conversaId && (
              <Button variant="outline-secondary" onClick={() => setConfirmar('encerrar')}>
                Encerrar
              </Button>
            )}
          </Stack>
        </>
      )}
      {envio.alerta}
      {acao.alerta}

      <Modal show={!!confirmar} onHide={() => setConfirmar(undefined)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{confirmar === 'encerrar' ? 'Encerrar a conversa?' : 'Falar com um atendente?'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmar === 'encerrar'
            ? 'A conversa será encerrada.'
            : 'Sua conversa será enviada a um atendente da instituição, que responde por aqui.'}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmar(undefined)}>
            Cancelar
          </Button>
          <Button onClick={confirmarAcao}>Confirmar</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
