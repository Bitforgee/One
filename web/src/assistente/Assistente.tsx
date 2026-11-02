import { useMutation } from '@tanstack/react-query'
import { Hand, Send, ShieldAlert } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { api, type Matricula } from '../api'
import { useChamado } from '../chamado'
import { formatarData } from '../datas'
import { useSessao } from '../sessao'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Conversation, ConversationContent } from '../ui/conversation'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Label } from '../ui/label'
import { Message, MessageContent } from '../ui/message'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'

type Tipo = 'resposta' | 'pergunta' | 'sem_base' | 'transferir'
type Mensagem = { autor: 'ALUNO' | 'ASSISTENTE'; texto: string; tipo?: Tipo; em: string }
type Resposta = { tipo: Tipo; texto: string }
type Transferencia = { numero: string; estado: string; setor: string }
type Confirmar = 'atendente' | 'encerrar'

const AvisoExterno =
  'Suas mensagens são analisadas por um serviço externo de inteligência artificial, com servidores fora do Brasil. Não escreva CPF, matrícula, telefone ou dados de saúde.'
const AvisoResposta = 'Resposta gerada por IA com base nas orientações da instituição.'
const LimiteDoAluno = 10

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

const MensagemAnimada = motion.create(Message)

type BalaoProps = { doAluno: boolean; autor?: string; texto: string; aviso?: boolean; em: string; fuso: string }

// Aluno à direita em bg-primary-subtle; assistente e atendente à esquerda em bg-muted. O texto do modelo vai como
// texto puro (AD-012). O balão novo entra subindo 8 px, só com transform; o MotionConfig do App respeita o movimento reduzido.
function Balao({ doAluno, autor, texto, aviso, em, fuso }: BalaoProps) {
  return (
    <MensagemAnimada
      from={doAluno ? 'user' : 'assistant'}
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ ease: 'easeOut' }}
      className={`w-fit max-w-[90%] gap-1 rounded-lg px-3 py-2 ${doAluno ? 'ms-auto bg-primary-subtle' : 'me-auto bg-muted'}`}
    >
      <div className="text-xs font-semibold empty:hidden">{autor}</div>
      <MessageContent className="w-full text-base break-words whitespace-pre-wrap group-[.is-user]:ml-0 group-[.is-user]:rounded-none group-[.is-user]:bg-transparent group-[.is-user]:p-0">
        {texto}
      </MessageContent>
      {aviso && <div className="text-xs text-muted-foreground">{AvisoResposta}</div>}
      <div className="text-end text-xs text-muted-foreground">{formatarData(em, fuso)}</div>
    </MensagemAnimada>
  )
}

function Conversa({ mensagens, fuso, digitando }: { mensagens: Mensagem[]; fuso: string; digitando: boolean }) {
  return (
    <Conversation className="overflow-y-visible">
      {/* sem a calha de rolagem que o use-stick-to-bottom reserva: o log cresce com a página, e os balões encostam nas bordas */}
      <ConversationContent className="gap-2 px-0 py-2" scrollClassName="[scrollbar-gutter:auto]!">
        {mensagens.map((m, i) => (
          <Balao key={i} doAluno={m.autor === 'ALUNO'} texto={m.texto} aviso={m.tipo === 'resposta'} em={m.em} fuso={fuso} />
        ))}
        {digitando && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner aria-label="Digitando" />
            digitando…
          </div>
        )}
      </ConversationContent>
    </Conversation>
  )
}

type Seguimento = { ultima?: Tipo; avaliada?: boolean; desfecho: string | null; explicar: boolean; avaliar: (resolveu: boolean) => void; pendente: boolean; transferir: () => void }

// Depois da última resposta: a avaliação, o convite para explicar melhor e a confirmação da transferência.
function Seguimento({ ultima, avaliada, desfecho, explicar, avaliar, pendente, transferir }: Seguimento) {
  return (
    <>
      {ultima === 'resposta' && !avaliada && !desfecho && <Avaliacao avaliar={avaliar} pendente={pendente} />}
      {explicar && <p className="my-2">Quer explicar melhor ou falar com um atendente?</p>}
      {ultima === 'transferir' && !desfecho && (
        <Button className="my-2" onClick={transferir}>
          Confirmar transferência
        </Button>
      )}
    </>
  )
}

function Avaliacao({ avaliar, pendente }: { avaliar: (resolveu: boolean) => void; pendente: boolean }) {
  return (
    <div className="my-2 flex items-center gap-2">
      <span>Isso resolveu?</span>
      <Button size="sm" className="bg-success" onClick={() => avaliar(true)} disabled={pendente}>
        Sim
      </Button>
      <Button size="sm" variant="outline" onClick={() => avaliar(false)} disabled={pendente}>
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
      <Alert>{`Transferido para ${transferido.setor}. Protocolo ${transferido.numero}.`}</Alert>
      <div className="my-2 flex flex-col gap-2">
        {chamado?.mensagens
          .filter((m) => m.tipo === 'PUBLICA')
          .map((m) => (
            <Balao key={m.id} doAluno={m.doAluno} autor={m.doAluno ? undefined : m.autor} texto={m.texto} em={m.criadaEm} fuso={fuso} />
          ))}
      </div>
      <Link to={`/${slug}/chamados/${transferido.numero}`} className="text-primary">
        Abrir a solicitação {transferido.numero}
      </Link>
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
        <form onSubmit={enviar} className="mb-2 flex items-end gap-2">
          <Label htmlFor="mensagem" className="sr-only">
            Mensagem
          </Label>
          <Textarea id="mensagem" rows={2} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua dúvida" className="field-sizing-fixed min-h-0 resize-none" />
          <Button type="submit" disabled={pendente || !texto.trim()}>
            {pendente ? <Spinner /> : <Send aria-hidden="true" />}
            Enviar
          </Button>
        </form>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant={destaque ? 'default' : 'outline'} onClick={() => confirmar('atendente')}>
          <Hand aria-hidden="true" />
          Falar com atendente
        </Button>
        {emConversa && (
          <Button variant="outline" onClick={() => confirmar('encerrar')}>
            Encerrar
          </Button>
        )}
      </div>
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
    <div className="flex flex-col gap-3">
      <p>Sua conversa será enviada a um atendente da instituição, que responde por aqui.</p>
      {!emConversa && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="descricao">Descreva seu pedido</Label>
          <Textarea id="descricao" rows={3} maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
      )}
      {ativas.length > 1 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="matricula">Matrícula</Label>
          <NativeSelect id="matricula" value={matriculaId} onChange={(e) => setMatriculaId(e.target.value)}>
            <NativeSelectOption value="">Escolha a matrícula</NativeSelectOption>
            {ativas.map((m) => (
              <NativeSelectOption key={m.id} value={m.id}>{`${m.numero} — ${m.curso}`}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
    </div>
  )
}

function Confirmacao({ confirmar, fechar, pronto, confirmarAcao, ...pedido }: ModalProps) {
  const encerrar = confirmar === 'encerrar'
  return (
    <Dialog open={!!confirmar} onOpenChange={fechar}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{encerrar ? 'Encerrar a conversa?' : 'Falar com um atendente?'}</DialogTitle>
        </DialogHeader>
        {encerrar ? <p>A conversa será encerrada.</p> : <PedidoAoAtendente {...pedido} />}
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button onClick={confirmarAcao} disabled={!pronto}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Encerrada({ desfecho }: { desfecho: string }) {
  return <Alert>{desfecho === 'RESOLVIDA_AUTOATENDIMENTO' ? 'Que bom que resolveu! Conversa encerrada.' : 'Conversa encerrada.'}</Alert>
}

function Erro({ erro }: { erro: Error | null }) {
  return erro && (
    <Alert variant="destructive" className="mt-3">
      {erro.message}
    </Alert>
  )
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
  const [avaliada, setAvaliada] = useState<boolean>() // só conta depois de uma resposta, e cada envio a zera
  const [explicar, setExplicar] = useState(false)
  const [confirmar, setConfirmar] = useState<Confirmar>()
  const agora = () => new Date().toISOString()
  const envio = useMutation({
    mutationFn: async (mensagem: string) => {
      setMensagens((m) => [...m, { autor: 'ALUNO', texto: mensagem, em: agora() }])
      setTexto('')
      setAvaliada(false)
      setExplicar(false)
      const r = await perguntar(conversaId, mensagem)
      if (r.conversaId) setConversaId(r.conversaId)
      setMensagens((m) => [...m, { autor: 'ASSISTENTE', texto: r.resposta.texto, tipo: r.resposta.tipo, em: agora() }])
    },
  })
  const acao = useMutation({ mutationFn: (passo: () => Promise<void>) => passo() })
  const { ultima, noLimite, destaque } = situacao(mensagens, explicar)
  const emConversa = conversaId !== undefined

  function enviar(e: FormEvent) {
    e.preventDefault()
    envio.mutate(texto)
  }

  function avaliar(resolveu: boolean) {
    acao.mutate(async () => {
      const r = await api<{ desfecho: string | null }>(`/api/conversas/${conversaId}/avaliacao`, { resolveu })
      setAvaliada(true)
      setDesfecho(r.desfecho)
      setExplicar(!resolveu)
    })
  }

  function confirmarAcao() {
    const qual = confirmar
    setConfirmar(undefined)
    acao.mutate(async () => {
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
    <div className="mx-auto flex max-w-3xl flex-col">
      <h1 className="text-xl font-semibold">Assistente</h1>
      <p className="my-2 flex gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {AvisoExterno}
      </p>
      {mensagens.length === 0 && (
        <p className="my-2 text-muted-foreground">Pergunte, por exemplo: “Como emito o boleto do semestre?” ou “Posso abonar falta com atestado?”</p>
      )}
      <Conversa mensagens={mensagens} fuso={fuso} digitando={envio.isPending} />
      <Seguimento ultima={ultima} avaliada={avaliada} desfecho={desfecho} explicar={explicar} avaliar={avaliar} pendente={acao.isPending} transferir={() => abrir('atendente')} />
      {transferido ? (
        <Transferido transferido={transferido} fuso={fuso} />
      ) : desfecho ? (
        <Encerrada desfecho={desfecho} />
      ) : (
        <div className="sticky bottom-0 z-10 bg-background py-2">
          <Entrada noLimite={noLimite} texto={texto} setTexto={setTexto} enviar={enviar} pendente={envio.isPending} destaque={destaque} emConversa={emConversa} confirmar={abrir} />
        </div>
      )}
      <Erro erro={envio.error} />
      <Erro erro={acao.error} />
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
    </div>
  )
}
