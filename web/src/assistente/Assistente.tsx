import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowUp, ChevronRight, Hand, MessageCircleQuestion, ShieldAlert } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { api, type Matricula } from '../api'
import { Contato, temContato, urlDaImagem, useAparencia, type InstituicaoPublica } from '../aparencia'
import { Estados, useChamado, type Anexo } from '../chamado'
import { ProximoPasso } from '../chamados/Chamados'
import { LinkDeAnexo } from '../LinkDeAnexo'
import { Balao } from '../Balao'
import { Links, separarLinks } from '../LinksDaResposta'
import { useSessao } from '../sessao'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Conversation, ConversationContent } from '../ui/conversation'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Label } from '../ui/label'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'
import { AjudaDosAnexos, BotaoAnexar, Selos, useAnexos, type Anexos } from './Anexos'

type Tipo = 'resposta' | 'pergunta' | 'sem_base' | 'transferir'
type Mensagem = { autor: 'ALUNO' | 'ASSISTENTE'; texto: string; tipo?: Tipo; em: string; anexos?: Anexo[] }
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

// Com arquivos a mensagem vai em multipart ("mensagem" e "anexos"); sem eles, em JSON como sempre.
function corpoDaMensagem(mensagem: string, arquivos: File[]) {
  if (arquivos.length === 0) return { mensagem }
  const form = new FormData()
  form.append('mensagem', mensagem)
  for (const a of arquivos) form.append('anexos', a)
  return form
}

// A primeira mensagem abre a conversa; as seguintes vão para ela.
function perguntar(conversaId: number | undefined, mensagem: string, arquivos: File[]) {
  const url = conversaId === undefined ? '/api/conversas' : `/api/conversas/${conversaId}/mensagens`
  return api<{ conversaId?: number; resposta: Resposta }>(url, corpoDaMensagem(mensagem, arquivos))
}

type Envio = { mensagem: string; reenvio?: boolean }
type Efeitos = { adicionar: (novas: Mensagem[]) => void; abrirConversa: (id: number) => void; limparTexto: () => void; zerarAvaliacao: () => void; enviou: () => void }

// Sem arquivos o balão do aluno entra antes da resposta (e fica, se a API falhar). Com arquivos, só depois do sucesso:
// o texto e os selos ficam onde estão para o aluno tentar de novo, e os links precisam dos ids que a API gravou.
// No reenvio de um envio sem arquivos o balão do aluno já está na conversa: não entra de novo.
async function enviarMensagem({ mensagem, reenvio }: Envio, arquivos: File[], conversaId: number | undefined, efeitos: Efeitos) {
  const agora = () => new Date().toISOString()
  if (arquivos.length === 0) {
    if (!reenvio) efeitos.adicionar([{ autor: 'ALUNO', texto: mensagem, em: agora() }])
    efeitos.limparTexto()
  }
  efeitos.zerarAvaliacao()
  const r = await perguntar(conversaId, mensagem, arquivos)
  if (r.conversaId) efeitos.abrirConversa(r.conversaId)
  const doAluno: Mensagem[] = arquivos.length === 0 ? [] : [{ autor: 'ALUNO', texto: mensagem, em: agora(), anexos: await anexosDaUltima((r.conversaId ?? conversaId)!) }]
  efeitos.adicionar([...doAluno, { autor: 'ASSISTENTE', texto: r.resposta.texto, tipo: r.resposta.tipo, em: agora() }])
  if (doAluno.length > 0) {
    efeitos.limparTexto()
    efeitos.enviou()
  }
}

// A resposta do envio não traz os ids dos anexos: eles vêm da conversa, na última mensagem do aluno.
async function anexosDaUltima(conversaId: number): Promise<Anexo[]> {
  try {
    const { mensagens } = await api<{ mensagens: { autor: string; anexos: Anexo[] }[] }>(`/api/conversas/${conversaId}`)
    return mensagens.filter((m) => m.autor === 'ALUNO').at(-1)?.anexos ?? []
  } catch {
    return [] // a mensagem já foi gravada; sem os links, o balão mostra só o texto
  }
}

// Com conversa, transfere a conversa; sem ela, abre o atendimento direto com a descrição.
function transferir(conversaId: number | undefined, descricao: string, matriculaId: number | undefined) {
  const escolha = { matriculaId }
  return conversaId === undefined
    ? api<Transferencia>('/api/atendimento-direto', { descricao, ...escolha })
    : api<Transferencia>(`/api/conversas/${conversaId}/transferir`, escolha)
}

function Conversa({ mensagens, fuso, digitando, foto, depois }: { mensagens: Mensagem[]; fuso: string; digitando: boolean; foto?: { src: string; alt: string }; depois: ReactNode }) {
  return (
    <Conversation className="overflow-y-visible">
      {/* sem a calha de rolagem que o use-stick-to-bottom reserva: o log cresce com a página, e os balões encostam nas bordas */}
      <ConversationContent className="gap-2 px-0 py-2" scrollClassName="[scrollbar-gutter:auto]!">
        {mensagens.map((m, i) => {
          // no assistente os links viram botões abaixo do texto; a mensagem do aluno fica como ele escreveu
          const { texto, links } = m.autor === 'ASSISTENTE' ? separarLinks(m.texto) : { texto: m.texto, links: [] }
          return (
            <Balao key={i} doAluno={m.autor === 'ALUNO'} texto={texto} comLinks={m.autor === 'ASSISTENTE'} em={m.em} fuso={fuso} foto={m.autor === 'ASSISTENTE' ? foto : undefined}>
              {m.anexos?.map((a) => <LinkDeAnexo key={a.id} href={`/api/conversas/anexos/${a.id}`} nome={a.nome} tamanho={a.tamanho} />)}
              {links.length > 0 && <Links links={links} />}
              {m.tipo === 'resposta' && <div className="text-xs text-muted-foreground">{AvisoResposta}</div>}
            </Balao>
          )
        })}
        {digitando && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner aria-label="Digitando" />
            digitando…
          </div>
        )}
        {depois}
      </ConversationContent>
    </Conversation>
  )
}

type Seguimento = { ultima?: Tipo; desfecho: string | null; explicar: boolean; transferir: () => void }

// Depois da última resposta: o convite para explicar melhor (até a transferência) e a confirmação da transferência.
function Seguimento({ ultima, desfecho, explicar, transferir }: Seguimento) {
  return (
    <>
      {explicar && desfecho !== 'TRANSFERIDA' && <p className="my-2">Quer explicar melhor ou falar com um atendente?</p>}
      {ultima === 'transferir' && !desfecho && (
        <Button className="my-2" onClick={transferir}>
          Confirmar transferência
        </Button>
      )}
    </>
  )
}

// A avaliação só vale para uma resposta ainda não avaliada, sem desfecho e sem erro de envio.
const avaliavel = (ultima: Tipo | undefined, avaliada: boolean | undefined, desfecho: string | null, erro: Error | null) => ultima === 'resposta' && !avaliada && !desfecho && !erro

// "Isso resolveu?" logo abaixo da última resposta, no fluxo da conversa.
function Avaliacao({ avaliar, pendente }: { avaliar: (resolveu: boolean) => void; pendente: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span>Isso resolveu?</span>
      <Button size="sm" variant="outline" onClick={() => avaliar(true)} disabled={pendente}>
        Sim
      </Button>
      <Button size="sm" variant="outline" onClick={() => avaliar(false)} disabled={pendente}>
        Não
      </Button>
    </div>
  )
}

// A foto do assistente (AC 41), com o nome como `alt`; sem foto, nada.
const fotoDoAssistente = (slug: string | undefined, ap: InstituicaoPublica) =>
  slug && ap.imagens.assistente ? { src: urlDaImagem(slug, 'assistente', ap.imagens.assistente), alt: ap.assistente.nome ?? 'Assistente' } : undefined

const FraseBase = 'Respostas com base nas normas da instituição.'
const PerguntasPadrao = ['Como emito o boleto do semestre?', 'Posso abonar falta com atestado?']
const EmAberto = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_ALUNO']

// A solicitação do aluno ainda em andamento (a mais recente), antes das perguntas; se a leitura falha, não há linha nem alerta (identidade-visual AC 10).
function SolicitacaoEmAberto() {
  const { slug } = useParams()
  const { data } = useQuery({ queryKey: ['/api/chamados?escopo=meus'], queryFn: () => api<{ numero: string; estado: string; criadoEm: string }[]>('/api/chamados?escopo=meus') })
  const c = data?.filter((x) => EmAberto.includes(x.estado)).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0]
  if (!c) return null
  return (
    <Link to={`/${slug}/chamados/${c.numero}`} className="flex flex-col gap-0.5 border-l-2 border-primary py-1 ps-3 text-foreground no-underline hover:bg-accent">
      <span className="font-medium">{`Sua solicitação ${c.numero} · ${Estados[c.estado]}`}</span>
      <span className="text-sm text-muted-foreground">{ProximoPasso[c.estado]}</span>
    </Link>
  )
}

// As perguntas sugeridas: linhas de 48 px com divisória, o ícone à esquerda e a seta à direita.
function Perguntas({ perguntas, perguntar, pendente }: { perguntas: string[]; perguntar: (p: string) => void; pendente: boolean }) {
  return (
    <ul className="m-0 flex w-full list-none flex-col p-0">
      {perguntas.map((p) => (
        <li key={p}>
          <button type="button" disabled={pendente} onClick={() => perguntar(p)} className="flex min-h-12 w-full items-center gap-3 rounded-xs border-b px-2 py-2 text-start text-base hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50">
            <MessageCircleQuestion aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span className="flex-1">{p}</span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  )
}

// Sem conversa: o título da instituição, a frase, quem é o assistente, a solicitação em aberto e as perguntas para começar.
function BoasVindas({ ap, foto, perguntar, pendente }: { ap: InstituicaoPublica; foto?: { src: string; alt: string }; perguntar: (p: string) => void; pendente: boolean }) {
  const perguntas = ap.assistente.perguntas.length ? ap.assistente.perguntas : PerguntasPadrao
  return (
    <section className="my-6 flex flex-col items-start gap-3">
      <h2 className="m-0 font-heading text-2xl font-semibold tracking-tight">{`Atendimento ao estudante · ${ap.nomeCurto ?? ap.nome}`}</h2>
      <p className="m-0 text-muted-foreground">{ap.assistente.boasVindas ?? FraseBase}</p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {foto && <img src={foto.src} alt="" className="size-8 shrink-0 rounded-full object-cover" />}
        <span>{ap.assistente.nome ? `${ap.assistente.nome}, assistente virtual` : 'Assistente virtual'}</span>
      </div>
      <SolicitacaoEmAberto />
      <Perguntas perguntas={perguntas} perguntar={perguntar} pendente={pendente} />
    </section>
  )
}

// Depois da transferência: o bloco com o número, o setor e para onde a resposta chega; as respostas públicas do atendente aparecem abaixo, relidas a cada 15 s.
function Transferido({ transferido, fuso, contato }: { transferido: Transferencia; fuso: string; contato: InstituicaoPublica['contato'] }) {
  const { slug } = useParams()
  const { chamado } = useChamado(transferido.numero)
  return (
    <>
      <section className="my-2 flex flex-col gap-2 rounded-md border p-4">
        <h2 className="m-0 text-base font-semibold">{`Sua solicitação ${transferido.numero} foi para ${transferido.setor}`}</h2>
        <p className="m-0 text-sm">A resposta chega em Solicitações e no seu e-mail.</p>
        {temContato(contato) && (
          <section className="flex flex-col gap-1">
            <h3 className="m-0 text-sm font-semibold">Contato do atendimento</h3>
            <Contato contato={contato} />
          </section>
        )}
        <Button asChild className="self-start">
          <Link to={`/${slug}/chamados/${transferido.numero}`}>Ver solicitação</Link>
        </Button>
      </section>
      <div className="my-2 flex flex-col gap-2">
        {chamado?.mensagens
          .filter((m) => m.tipo === 'PUBLICA')
          .map((m) => (
            <Balao key={m.id} doAluno={m.doAluno} autor={m.doAluno ? undefined : m.autor} texto={m.texto} em={m.criadaEm} fuso={fuso} />
          ))}
      </div>
    </>
  )
}

// Enter envia e Shift+Enter quebra a linha; durante a composição de acentos (IME) o Enter é do teclado
function enviarComEnter(e: KeyboardEvent<HTMLTextAreaElement>, vazio: boolean) {
  if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
  e.preventDefault()
  if (!vazio) e.currentTarget.form?.requestSubmit()
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
  anexos: Anexos
}

// Compositor no estilo do ChatGPT: uma caixa arredondada com o campo que cresce com o texto e, embaixo, o enviar redondo à direita.
// "Falar com atendente" fica numa linha própria acima da caixa.
function Entrada({ noLimite, texto, setTexto, enviar, pendente, destaque, emConversa, confirmar, anexos }: EntradaProps) {
  const vazio = pendente || !texto.trim()
  // type="button": dentro do form, o padrão "submit" enviaria a mensagem
  const atendente = (
    <Button type="button" size="sm" className="self-start" variant={destaque ? 'default' : 'outline'} onClick={() => confirmar('atendente')}>
      <Hand aria-hidden="true" />
      Falar com atendente
    </Button>
  )
  const encerrar = emConversa && (
    <Button type="button" size="sm" variant="outline" onClick={() => confirmar('encerrar')}>
      Encerrar
    </Button>
  )
  if (noLimite)
    return (
      <div className="flex flex-wrap gap-1.5">
        {atendente}
        {encerrar}
      </div>
    )
  return (
    <div className="flex flex-col gap-1.5">
      {atendente}
      <form onSubmit={enviar} className="flex flex-col gap-1 rounded-3xl border bg-background p-1.5 shadow-sm transition-[border-color] focus-within:border-ring">
        <Selos anexos={anexos} />
        <Label htmlFor="mensagem" className="sr-only">
          Mensagem
        </Label>
        <div className="flex items-end gap-1.5">
          <BotaoAnexar anexos={anexos} />
          <Textarea
            id="mensagem"
            rows={1}
            maxLength={1000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => enviarComEnter(e, vazio)}
            placeholder="Escreva sua dúvida"
            className="max-h-52 min-h-11 flex-1 resize-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
        {(anexos.foco || anexos.escolhidos.length > 0) && <p className="m-0 px-3 text-xs text-muted-foreground">{AjudaDosAnexos}</p>}
        <div className="flex items-end justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">{encerrar}</div>
          <Button type="submit" size="icon" aria-label="Enviar" className="size-9 shrink-0 rounded-full" disabled={vazio}>
            {pendente ? <Spinner /> : <ArrowUp aria-hidden="true" />}
          </Button>
        </div>
      </form>
    </div>
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

// O erro do envio fica no lugar da resposta, com o botão que reenvia a mesma mensagem.
function FalhaDoEnvio({ erro, reenviar }: { erro: Error; reenviar: () => void }) {
  return (
    <Alert variant="destructive">
      <span>{erro.message}</span>
      <Button type="button" size="sm" variant="outline" className="mt-2 justify-self-start" onClick={reenviar}>
        Reenviar
      </Button>
    </Alert>
  )
}

export { separarLinks }

export function Assistente() {
  const { me } = useSessao()
  const { slug } = useParams()
  const ap = useAparencia(slug, me.instituicao.nome)
  const foto = fotoDoAssistente(slug, ap)
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
  const anexos = useAnexos()
  const envio = useMutation({
    mutationFn: (pedido: Envio) =>
      enviarMensagem(pedido, anexos.escolhidos, conversaId, {
        adicionar: (novas) => setMensagens((m) => [...m, ...novas]),
        abrirConversa: setConversaId,
        limparTexto: () => setTexto(''),
        zerarAvaliacao: () => {
          setAvaliada(false)
          setExplicar(false)
        },
        enviou: anexos.enviou,
      }),
  })
  const acao = useMutation({ mutationFn: (passo: () => Promise<void>) => passo() })
  const { ultima, noLimite, destaque } = situacao(mensagens, explicar)
  const emConversa = conversaId !== undefined

  function enviar(e: FormEvent) {
    e.preventDefault()
    envio.mutate({ mensagem: texto })
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
    // a tela tem pelo menos a altura da janela (menos o cabeçalho de 49 px e o recuo de cima do main), para o compositor ficar no fundo mesmo sem conversa
    <div className="mx-auto -mb-4 flex min-h-[calc(100svh-49px-1rem-var(--barra,0px))] w-full max-w-3xl flex-col md:-mb-6 md:min-h-[calc(100svh-49px-1.5rem)]">
      <p className="my-2 flex gap-2 text-xs text-muted-foreground">
        <ShieldAlert aria-hidden="true" className="size-3.5 shrink-0" />
        {AvisoExterno}
      </p>
      {mensagens.length === 0 && <BoasVindas ap={ap} foto={foto} perguntar={(p) => envio.mutate({ mensagem: p })} pendente={envio.isPending} />}
      <Conversa
        mensagens={mensagens}
        fuso={fuso}
        digitando={envio.isPending}
        foto={foto}
        depois={
          <>
            {envio.error && <FalhaDoEnvio erro={envio.error} reenviar={() => envio.mutate({ ...envio.variables!, reenvio: true })} />}
            {avaliavel(ultima, avaliada, desfecho, envio.error) && <Avaliacao avaliar={avaliar} pendente={acao.isPending} />}
          </>
        }
      />
      <Seguimento ultima={ultima} desfecho={desfecho} explicar={explicar} transferir={() => abrir('atendente')} />
      {transferido ? (
        <Transferido transferido={transferido} fuso={fuso} contato={ap.contato} />
      ) : desfecho ? (
        <Encerrada desfecho={desfecho} />
      ) : (
        <div className="sticky bottom-[var(--barra,0px)] z-10 mt-auto bg-background pt-2 pb-1.5">
          <Entrada noLimite={noLimite} texto={texto} setTexto={setTexto} enviar={enviar} pendente={envio.isPending} destaque={destaque} emConversa={emConversa} confirmar={abrir} anexos={anexos} />
        </div>
      )}
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
