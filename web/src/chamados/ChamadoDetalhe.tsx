import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { api, ErroApi } from '../api'
import { ErroDe } from '../ErroDe'
import { CampoArquivo } from '../CampoArquivo'
import { useChamado, type Chamado } from '../chamado'
import { useConsulta } from '../ui/use-mobile'
import { Marca } from '../Marca'
import { Opcoes } from '../Opcoes'
import { useSessao } from '../sessao'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
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
  if (equipe && ['RESOLVIDO', 'FECHADO'].includes(c.estado)) return null

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
    <form onSubmit={responder} className="flex flex-col gap-2 rounded-md bg-muted p-4">
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

function BotoesDeAcao({ pode, executar, pendente, abrir, semAssumir }: Acoes & { abrir: (modal: 'encaminhar' | 'cancelar') => void; semAssumir: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 empty:hidden">
      {pode('assumir') && !semAssumir && (
        <BotaoAcao pendente={pendente} onClick={() => executar('assumir', {})}>
          Assumir
        </BotaoAcao>
      )}
      {pode('confirmar') && (
        <BotaoAcao pendente={pendente} onClick={() => executar('confirmar', {})}>
          Confirmar resolução
        </BotaoAcao>
      )}
      {pode('encaminhar') && (
        <BotaoAcao pendente={false} variant="outline" onClick={() => abrir('encaminhar')} disabled={pendente}>
          Encaminhar
        </BotaoAcao>
      )}
      {pode('cancelar') && (
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => abrir('cancelar')} disabled={pendente}>
          Cancelar solicitação
        </Button>
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

const ACOES = ['assumir', 'confirmar', 'encaminhar', 'cancelar', 'resolver', 'reclassificar', 'duplicado', 'rejeitar']

const AlertaDaAcao = ({ erro }: { erro: Error | null }) => erro && <Alert variant="destructive">{erro.message}</Alert>

// A ação principal do estado, na barra do celular da equipe (AC 24): "Assumir" em ABERTO; "Responder" em EM_ATENDIMENTO e AGUARDANDO_ALUNO.
function principalDoEstado(c: Chamado, pode: Acoes['pode']) {
  if (c.estado === 'ABERTO' && pode('assumir')) return 'Assumir'
  if (['EM_ATENDIMENTO', 'AGUARDANDO_ALUNO'].includes(c.estado) && pode('responder')) return 'Responder'
  return undefined
}

// A ação principal e a existência de outras ações para o "Mais"; só a equipe tem a barra.
function acoesDaBarra(c: Chamado, pode: Acoes['pode'], equipe: boolean) {
  const principal = equipe ? principalDoEstado(c, pode) : undefined
  const temMais = equipe && ACOES.some((a) => pode(a) && !(a === 'assumir' && principal === 'Assumir'))
  return { principal, temMais }
}

// A grade do detalhe: duas colunas só para a equipe, e o espaço da barra fixa no fim.
const gradeDoDetalhe = (equipe: boolean, barra: boolean) =>
  `mx-auto grid max-w-3xl gap-8 ${equipe ? '@5xl/main:max-w-none @5xl/main:grid-cols-[minmax(0,1fr)_320px]' : ''} ${barra ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : ''}`

// "Responder" da barra rola até o campo e o foca; o foco não rola de novo.
function irParaResposta() {
  const campo = document.getElementById('resposta')
  campo?.scrollIntoView({ block: 'center' })
  campo?.focus({ preventScroll: true })
}

type Barra = { principal?: string; executar: Executar; pendente: boolean; abrirMais: () => void; temMais: boolean }

function BarraDoChamado({ principal, executar, pendente, abrirMais, temMais }: Barra) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-background p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {principal && (
        <BotaoAcao pendente={pendente && principal === 'Assumir'} className="flex-1" onClick={() => (principal === 'Assumir' ? executar('assumir', {}) : irParaResposta())}>
          {principal}
        </BotaoAcao>
      )}
      {temMais && (
        <Button variant="outline" className={`h-11 ${principal ? '' : 'flex-1'}`} onClick={abrirMais}>
          Mais
        </Button>
      )}
    </div>
  )
}

// O cartão de ações da equipe; abaixo de 1024 px (AC 8) vira a barra fixa com a ação principal e "Mais", que abre as outras num Sheet.
function CaixaDeAcoes({ barra, folha, setFolha, erro, tem, children }: { barra?: Barra; folha: boolean; setFolha: (aberta: boolean) => void; erro: ReactNode; tem: boolean; children: ReactNode }) {
  if (!tem) return null
  if (!barra)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    )
  return (
    <>
      <BarraDoChamado {...barra} />
      <Sheet open={folha} onOpenChange={setFolha}>
        <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[85dvh]">
          <SheetHeader>
            <SheetTitle>Mais ações</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto p-4 pt-0">
            {erro}
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

type Pedido = { caminho: string; corpo: unknown; depois?: () => void }
type Modal = 'encaminhar' | 'cancelar'
type Motivo = { motivo: string; setMotivo: (m: string) => void }

// O que foi digitado nos formulários vive em `Detalhe`: a folha "Mais" desmonta ao fechar e o texto não se perde (AC 44).
function useCamposDaAcao() {
  const [resolucao, setResolucao] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [original, setOriginal] = useState('')
  return { resolucao, setResolucao, categoriaId, setCategoriaId, original, setOriginal }
}
type CamposDaAcao = ReturnType<typeof useCamposDaAcao>

// Os formulários e botões das ações do chamado (o cartão a 1024 px, o Sheet "Mais" ou a página do aluno).
function PainelDeAcoes({ c, acoes, abrir, semAssumir, motivo, setMotivo, campos }: { c: Chamado; acoes: Acoes; abrir: (m: Modal) => void; semAssumir: boolean; campos: CamposDaAcao } & Motivo) {
  const { pode, executar, pendente } = acoes
  const { resolucao, setResolucao, categoriaId, setCategoriaId, original, setOriginal } = campos
  return (
    <>
      <BotoesDeAcao {...acoes} abrir={abrir} semAssumir={semAssumir} />
      <FormTexto visivel={pode('resolver')} enviar={() => executar('resolver', { texto: resolucao }, () => setResolucao(''))}
        id="resolucao" rotulo="Resolução" botao="Resolver" pendente={pendente} valor={resolucao} setValor={setResolucao} />
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
      <FormTexto visivel={pode('rejeitar')} enviar={() => executar('rejeitar', { motivo }, () => setMotivo(''))}
        id="motivo" rotulo="Não resolveu? Explique o motivo" botao="Rejeitar resolução" variant="outline" pendente={pendente} valor={motivo} setValor={setMotivo} />
    </>
  )
}

// Os diálogos de confirmação de encaminhar e cancelar.
function Dialogos({ c, modal, fechar, executar, motivo, setMotivo }: { c: Chamado; modal?: Modal; fechar: () => void; executar: Executar } & Motivo) {
  const [setorId, setSetorId] = useState('')
  return (
    <>
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
        confirmar={() => executar('cancelar', { motivo: motivo.trim() || undefined }, () => setMotivo(''))}>
        <CampoMotivo id="justificativa" rotulo="Justificativa (opcional)" valor={motivo} setValor={setMotivo} />
      </Confirmacao>
    </>
  )
}

// Toda ação devolve o chamado atualizado; num conflito (409) a tela relê o chamado e mostra o detail.
function useMutacaoDoChamado(c: Chamado, carregar: () => Promise<void>, setChamado: (c: Chamado) => void) {
  return useMutation({
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
}

// Só o aluno, dono do chamado, tem as ações no fim da página.
const doAluno = (pode: Acoes['pode'], equipe: boolean) => !equipe && (pode('confirmar') || pode('rejeitar') || pode('cancelar'))

// A coluna da equipe: o erro da ação, o cartão (ou a barra e o Sheet) de ações e o histórico.
function ColunaDaEquipe({ c, fuso, erro, folha, setFolha, barra, tem, painel }: { c: Chamado; fuso: string; erro: ReactNode; folha: boolean; setFolha: (aberta: boolean) => void; barra?: Barra; tem: boolean; painel: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      {!folha && erro}
      <CaixaDeAcoes barra={barra} folha={folha} setFolha={setFolha} erro={erro} tem={tem}>
        {painel}
      </CaixaDeAcoes>
      <Historico eventos={c.eventos} fuso={fuso} />
    </div>
  )
}

function Detalhe({ c, fuso, carregar, setChamado }: { c: Chamado; fuso: string; carregar: () => Promise<void>; setChamado: (c: Chamado) => void }) {
  const [folha, setFolha] = useState(false)
  const acao = useMutacaoDoChamado(c, carregar, setChamado)
  const [motivo, setMotivo] = useState('') // o mesmo motivo serve à rejeição, ao encaminhamento e ao cancelamento
  const [modal, setModal] = useState<Modal>()
  const campos = useCamposDaAcao()
  const celular = useConsulta('(max-width: 1023px)')
  const equipe = c.eventos !== null
  const pode = (a: string) => c.acoes.includes(a)
  const executar: Executar = (caminho, corpo, depois) => acao.mutate({ caminho, corpo, depois })
  const pendente = acao.isPending
  const acoes = { pode, executar, pendente }
  // só a ação feita na folha a fecha: a resposta de uma ação da barra não fecha a folha que o atendente abriu depois dela
  const dentroDaFolha: Executar = (caminho, corpo, depois) => executar(caminho, corpo, () => { setFolha(false); depois?.() })
  const erro = <AlertaDaAcao erro={acao.error} />
  const abrir = (m: Modal) => {
    setFolha(false)
    setModal(m)
  }
  const { principal, temMais } = acoesDaBarra(c, pode, equipe)
  const barra: Barra | undefined = celular && (principal || temMais) ? { principal, executar, pendente, temMais, abrirMais: () => setFolha(true) } : undefined
  const painel = <PainelDeAcoes c={c} acoes={{ ...acoes, executar: dentroDaFolha }} abrir={abrir} semAssumir={!!barra && principal === 'Assumir'} motivo={motivo} setMotivo={setMotivo} campos={campos} />
  return (
    <div className={gradeDoDetalhe(equipe, !!barra)}>
      <div className="flex min-w-0 flex-col gap-8">
        <Cabecalho c={c} />
        <Transcricao c={c} fuso={fuso} />
        <Mensagens mensagens={c.mensagens} fuso={fuso} />
        <Responder c={c} equipe={equipe} {...acoes} />
        {doAluno(pode, equipe) && (
          <div className="flex flex-col gap-4">
            {erro}
            {painel}
          </div>
        )}
      </div>
      {equipe && <ColunaDaEquipe c={c} fuso={fuso} erro={erro} folha={folha} setFolha={setFolha} barra={barra} tem={!!(principal || temMais)} painel={painel} />}
      <Dialogos c={c} modal={modal} fechar={() => setModal(undefined)} executar={executar} motivo={motivo} setMotivo={setMotivo} />
    </div>
  )
}

export function ChamadoDetalhe() {
  const { numero } = useParams()
  const { me } = useSessao()
  const { chamado, erro, carregar, setChamado } = useChamado(numero!)
  if (erro && !chamado) return <ErroDe erro={erro} oque={me.papeis.some((p) => ['ATENDENTE', 'ADMINISTRADOR'].includes(p)) ? 'o chamado' : 'a solicitação'} tentar={() => void carregar()} />
  if (!chamado) return <Carregando />
  return <Detalhe c={chamado} fuso={me.instituicao.fuso} carregar={carregar} setChamado={setChamado} />
}
