import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { api, ErroApi } from '../api'
import { CampoArquivo } from '../CampoArquivo'
import { useChamado, type Chamado } from '../chamado'
import { Marca } from '../Marca'
import { Opcoes } from '../Opcoes'
import { useSessao } from '../sessao'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'
import { Carregando } from './Chamados'
import { Cabecalho, Historico, Mensagens, Transcricao } from './Conversa'

type Executar = (caminho: string, corpo: unknown, depois?: () => void) => void
type Acoes = { pode: (acao: string) => boolean; executar: Executar; pendente: boolean }
type Pronta = { id: number; titulo: string; texto: string }

// Cada botão de ação tem no mínimo 44 px de altura (## Screens linha 9); pendente mostra o Spinner e desabilita.
function BotaoAcao({ pendente, children, className, ...props }: ComponentProps<typeof Button> & { pendente: boolean }) {
  return (
    <Button {...props} className={`h-11 ${className ?? ''}`} disabled={pendente || props.disabled}>
      {pendente && <Spinner />}
      {children}
    </Button>
  )
}

// AC 147: respostas prontas do setor do chamado, só para a equipe; uma falha deixa a lista vazia
function useProntas(setorId?: number) {
  const { data } = useQuery({
    queryKey: ['prontas', setorId],
    queryFn: () => api<Pronta[]>(`/api/respostas-prontas?setorId=${setorId}`),
    enabled: setorId !== undefined,
  })
  return data ?? []
}

type Equipe = { equipe: boolean; nota: boolean }

// Só a equipe recebe prontas: o aluno nunca as busca.
function SelecaoPronta({ nota, prontas, setTexto }: { nota: boolean; prontas: Pronta[]; setTexto: (t: string) => void }) {
  if (nota || prontas.length === 0) return null
  return (
    <NativeSelect aria-label="Resposta pronta" value="" onChange={(e) => setTexto(prontas.find((p) => String(p.id) === e.target.value)!.texto)}>
      <NativeSelectOption value="">Inserir resposta pronta…</NativeSelectOption>
      {prontas.map((p) => (
        <NativeSelectOption key={p.id} value={p.id}>
          {p.titulo}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

function MarcasDaEquipe({ equipe, nota, pode, setNota, aguardaAluno, setAguardaAluno }: Equipe & {
  pode: Acoes['pode']; setNota: (v: boolean) => void; aguardaAluno: boolean; setAguardaAluno: (v: boolean) => void
}) {
  if (!equipe) return null
  return (
    <div className="flex flex-wrap gap-x-4">
      {pode('nota') && <Marca id="nota" rotulo="Nota interna" marcado={nota} mudar={setNota} />}
      {pode('responder') && !nota && <Marca id="aguarda" rotulo="Aguardando aluno" marcado={aguardaAluno} mudar={setAguardaAluno} />}
    </div>
  )
}

const rotuloResposta = (c: Chamado, equipe: boolean) => (c.estado === 'RESOLVIDO' && !equipe ? 'Responder (reabre a solicitação)' : 'Responder')
const semEnvio = (texto: string, nota: boolean, podeResponder: boolean) => !texto.trim() || (!nota && !podeResponder)

// Nota interna não leva anexo nem marca aguardando aluno.
function corpoDaResposta(texto: string, nota: boolean, aguardaAluno: boolean, arquivos: File[]) {
  const f = new FormData()
  f.set('tipo', nota ? 'NOTA' : 'PUBLICA')
  f.set('texto', texto)
  f.set('aguardaAluno', String(!nota && aguardaAluno))
  if (!nota) arquivos.forEach((a) => f.append('anexos', a))
  return f
}

// Fica montado mesmo sem permissão para responder: o texto digitado e a busca das prontas não dependem disso.
function Responder({ c, equipe, pode, executar, pendente }: Acoes & { c: Chamado; equipe: boolean }) {
  const [texto, setTexto] = useState('')
  const [nota, setNota] = useState(false)
  const [aguardaAluno, setAguardaAluno] = useState(false)
  const [arquivos, setArquivos] = useState<File[]>([])
  const [envio, setEnvio] = useState<boolean>() // cada envio troca a chave do campo de arquivo, que volta vazio
  const prontas = useProntas(equipe ? c.setorId : undefined)
  if (!pode('responder') && !pode('nota')) return null

  function responder(e: FormEvent) {
    e.preventDefault()
    executar('mensagens', corpoDaResposta(texto, nota, aguardaAluno, arquivos), () => {
      setTexto('')
      setAguardaAluno(false)
      setArquivos([])
      setEnvio((n) => !n)
    })
  }

  return (
    <form onSubmit={responder} className="flex flex-col gap-2">
      <SelecaoPronta nota={nota} prontas={prontas} setTexto={setTexto} />
      <Label htmlFor="resposta">{rotuloResposta(c, equipe)}</Label>
      <Textarea id="resposta" rows={3} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} />
      {!nota && <CampoArquivo key={String(envio)} id="anexos" rotulo="Anexos (PDF, JPG ou PNG, até 10 MB cada)" accept=".pdf,.jpg,.jpeg,.png" arquivos={arquivos} setArquivos={setArquivos} />}
      <MarcasDaEquipe equipe={equipe} nota={nota} pode={pode} setNota={setNota} aguardaAluno={aguardaAluno} setAguardaAluno={setAguardaAluno} />
      <BotaoAcao type="submit" pendente={pendente} className="self-start" disabled={semEnvio(texto, nota, pode('responder'))}>
        Enviar
      </BotaoAcao>
    </form>
  )
}

function BotoesDeAcao({ pode, executar, pendente, abrir }: Acoes & { abrir: (modal: 'encaminhar' | 'cancelar') => void }) {
  return (
    <div className="flex flex-wrap gap-2 empty:hidden">
      {pode('assumir') && (
        <BotaoAcao pendente={pendente} onClick={() => executar('assumir', {})}>
          Assumir
        </BotaoAcao>
      )}
      {pode('confirmar') && (
        <BotaoAcao pendente={pendente} className="bg-success" onClick={() => executar('confirmar', {})}>
          Confirmar resolução
        </BotaoAcao>
      )}
      {pode('encaminhar') && (
        <BotaoAcao pendente={false} variant="outline" onClick={() => abrir('encaminhar')} disabled={pendente}>
          Encaminhar
        </BotaoAcao>
      )}
      {pode('cancelar') && (
        <BotaoAcao pendente={false} variant="outline" className="text-destructive" onClick={() => abrir('cancelar')} disabled={pendente}>
          Cancelar solicitação
        </BotaoAcao>
      )}
    </div>
  )
}

// Formulário de uma ação do chamado; só aparece quando a API devolve a ação entre as permitidas.
function FormDeAcao({ visivel, enviar, children }: { visivel: boolean; enviar: () => void; children: ReactNode }) {
  if (!visivel) return null
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
    >
      {children}
    </form>
  )
}

type Campo = { valor: string; setValor: (v: string) => void }
type FormTextoProps = Campo & { visivel: boolean; enviar: () => void; id: string; rotulo: string; botao: string; variant?: 'outline'; className?: string; pendente: boolean }

function FormTexto({ visivel, enviar, id, rotulo, botao, variant, className, pendente, valor, setValor }: FormTextoProps) {
  return (
    <FormDeAcao visivel={visivel} enviar={enviar}>
      <CampoMotivo id={id} rotulo={rotulo} valor={valor} setValor={setValor} />
      <BotaoAcao type="submit" pendente={pendente} variant={variant} className={`self-start ${className ?? ''}`} disabled={!valor.trim()}>
        {botao}
      </BotaoAcao>
    </FormDeAcao>
  )
}

function FormLinha({ visivel, enviar, id, rotulo, botao, pendente, pronto, children }: {
  visivel: boolean; enviar: () => void; id: string; rotulo: string; botao: string; pendente: boolean; pronto: boolean; children: ReactNode
}) {
  return (
    <FormDeAcao visivel={visivel} enviar={enviar}>
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        <BotaoAcao type="submit" pendente={pendente} variant="outline" disabled={!pronto}>
          {botao}
        </BotaoAcao>
      </div>
    </FormDeAcao>
  )
}

function Confirmacao({ aberto, fechar, titulo, botao, destrutivo, pronto, confirmar, children }: {
  aberto: boolean; fechar: () => void; titulo: string; botao: string; destrutivo?: boolean; pronto: boolean; confirmar: () => void; children: ReactNode
}) {
  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>
            Voltar
          </Button>
          <Button
            variant={destrutivo ? 'destructive' : 'default'}
            disabled={!pronto}
            onClick={() => {
              fechar()
              confirmar()
            }}
          >
            {botao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CampoMotivo({ id, rotulo, valor, setValor }: Campo & { id: string; rotulo: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Textarea id={id} rows={2} maxLength={4000} value={valor} onChange={(e) => setValor(e.target.value)} />
    </div>
  )
}

type Pedido = { caminho: string; corpo: unknown; depois?: () => void }

function Detalhe({ c, fuso, carregar, setChamado }: { c: Chamado; fuso: string; carregar: () => Promise<void>; setChamado: (c: Chamado) => void }) {
  // Toda ação devolve o chamado atualizado; num conflito (409) a tela relê o chamado e mostra o detail.
  const acao = useMutation({
    mutationFn: async ({ caminho, corpo }: Pedido) => {
      try {
        return await api<Chamado>(`/api/chamados/${c.numero}/${caminho}`, corpo)
      } catch (e) {
        if (e instanceof ErroApi && e.status === 409) await carregar()
        throw e
      }
    },
    onSuccess: (novo, { depois }) => {
      setChamado(novo)
      depois?.()
    },
  })
  const [resolucao, setResolucao] = useState('')
  const [motivo, setMotivo] = useState('') // o mesmo motivo serve à rejeição, ao encaminhamento e ao cancelamento
  const [categoriaId, setCategoriaId] = useState('')
  const [original, setOriginal] = useState('')
  const [setorId, setSetorId] = useState('')
  const [modal, setModal] = useState<'encaminhar' | 'cancelar'>()
  const fechar = () => setModal(undefined)
  const equipe = c.eventos !== null
  const pode = (a: string) => c.acoes.includes(a)
  const executar: Executar = (caminho, corpo, depois) => acao.mutate({ caminho, corpo, depois })
  const pendente = acao.isPending
  const acoes = { pode, executar, pendente }
  const limparMotivo = () => setMotivo('')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Cabecalho c={c} />
      <Transcricao c={c} fuso={fuso} />
      <Mensagens mensagens={c.mensagens} fuso={fuso} />
      <Responder c={c} equipe={equipe} {...acoes} />
      <BotoesDeAcao {...acoes} abrir={setModal} />
      <FormTexto visivel={pode('resolver')} enviar={() => executar('resolver', { texto: resolucao }, () => setResolucao(''))}
        id="resolucao" rotulo="Resolução" botao="Resolver" className="bg-success" pendente={pendente} valor={resolucao} setValor={setResolucao} />
      <FormLinha visivel={pode('reclassificar')} enviar={() => executar('reclassificar', { categoriaId: Number(categoriaId) }, () => setCategoriaId(''))}
        id="categoria" rotulo="Reclassificar" botao="Salvar" pendente={pendente} pronto={categoriaId !== ''}>
        <NativeSelect id="categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="h-11">
          <Opcoes vazio="Escolha a categoria" itens={c.categorias} />
        </NativeSelect>
      </FormLinha>
      <FormLinha visivel={pode('duplicado')} enviar={() => executar('duplicado', { numeroOriginal: original.trim().toUpperCase() }, () => setOriginal(''))}
        id="original" rotulo="Duplicado de outro pedido do mesmo aluno" botao="Marcar" pendente={pendente} pronto={original.trim() !== ''}>
        <Input id="original" placeholder="ONE-123" value={original} onChange={(e) => setOriginal(e.target.value)} className="h-11" />
      </FormLinha>
      <FormTexto visivel={pode('rejeitar')} enviar={() => executar('rejeitar', { motivo }, limparMotivo)}
        id="motivo" rotulo="Não resolveu? Explique o motivo" botao="Rejeitar resolução" variant="outline" pendente={pendente} valor={motivo} setValor={setMotivo} />
      {acao.error && <Alert variant="destructive">{acao.error.message}</Alert>}
      <Historico eventos={c.eventos} fuso={fuso} />

      <Confirmacao aberto={modal === 'encaminhar'} fechar={fechar} titulo="Encaminhar para outro setor?" botao="Encaminhar" pronto={setorId !== '' && motivo.trim() !== ''}
        confirmar={() => executar('encaminhar', { setorId: Number(setorId), motivo }, () => { setMotivo(''); setSetorId('') })}>
        <p className="mb-0 text-sm">O chamado volta para a fila do setor escolhido, sem responsável. O motivo fica como nota interna.</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="setor">Setor</Label>
          <NativeSelect id="setor" value={setorId} onChange={(e) => setSetorId(e.target.value)}>
            <Opcoes vazio="Escolha o setor" itens={c.setores} />
          </NativeSelect>
        </div>
        <CampoMotivo id="motivo-encaminhar" rotulo="Motivo" valor={motivo} setValor={setMotivo} />
      </Confirmacao>

      <Confirmacao aberto={modal === 'cancelar'} fechar={fechar} titulo="Cancelar a solicitação?" botao="Cancelar solicitação" destrutivo pronto
        confirmar={() => executar('cancelar', { motivo: motivo.trim() || undefined }, limparMotivo)}>
        <CampoMotivo id="justificativa" rotulo="Justificativa (opcional)" valor={motivo} setValor={setMotivo} />
      </Confirmacao>
    </div>
  )
}

export function ChamadoDetalhe() {
  const { numero } = useParams()
  const { me } = useSessao()
  const { chamado, erro, carregar, setChamado } = useChamado(numero!)
  if (erro && !chamado) return <Alert variant="destructive">{erro}</Alert>
  if (!chamado) return <Carregando />
  return <Detalhe c={chamado} fuso={me.instituicao.fuso} carregar={carregar} setChamado={setChamado} />
}
