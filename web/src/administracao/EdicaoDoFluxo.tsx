import { ChevronRight } from 'lucide-react'
import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { BotaoAcao, useGravacao } from '../acao'
import { api } from '../api'
import { ErroDe } from '../ErroDe'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Spinner } from '../ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { useConsulta } from '../ui/use-mobile'
import { abrangenciaDoFluxo, type Categoria, type Curso, type Fluxo, type Setor } from './comum'
import { caminho, cadeiaValida, deEtapas, etapasParaApi, FraseDaCadeia, fixarPosicoes, type Grafo } from './grafo'
import { ListaDeEtapas } from './ListaDeEtapas'
import { estadoDoFluxo } from './LinhasDosCadastros'
import { BotaoSimular, Simulador, useSimulador, type EstadoDoSimulador, type Simulacao } from './Simulador'

// A biblioteca do canvas só chega ao navegador quando a visão Canvas abre (AC 80, door 10): é o único import() dela.
export const Carga = { canvas: () => import('./Canvas') }

type Visao = 'lista' | 'canvas'

// Se o pacote do canvas não carrega, o editor segue com a lista e avisa (Observable).
class FalhaDoCanvas extends Component<{ fallback: ReactNode; children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() {
    return { falhou: true }
  }
  render() {
    return this.state.falhou ? this.props.fallback : this.props.children
  }
}

// "Vai por aqui" ou "Pulada: motivo" em cada nó do caminho, conforme a resposta da simulação (AC 81).
function marcasDaSimulacao(g: Grafo, simulacao?: Simulacao) {
  const marcas: Record<string, string> = {}
  if (!simulacao) return marcas
  caminho(g).forEach((no, i) => {
    const etapa = simulacao.etapas.find((e) => e.ordem === i + 1)
    if (etapa) marcas[no.id] = etapa.situacao === 'RESOLVIDA' ? 'Vai por aqui' : `Pulada: ${etapa.motivo}`
  })
  return marcas
}

// O que dá para simular: o rascunho salvo, ou a versão vigente enquanto nada mudou; com edição pendente, nada.
function versaoParaSimular(salvo: boolean, alterado: boolean, fluxo: Fluxo) {
  if (salvo) return 'RASCUNHO'
  return !alterado && fluxo.vigente ? 'VIGENTE' : null
}

type PropsDoAlternador = { visao: Visao; mudar: (v: Visao) => void }

// Lista e Canvas são duas telas do mesmo rascunho; abaixo de 768 px só a Lista existe (AC 79).
function Alternador({ visao, mudar }: PropsDoAlternador) {
  return (
    <Tabs value={visao} onValueChange={(v) => mudar(v as Visao)} className="gap-2">
      <TabsList>
        <TabsTrigger value="lista">Lista</TabsTrigger>
        <TabsTrigger value="canvas">Canvas</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

type PropsDaArea = { grafo: Grafo; setores: Setor[]; simulacao?: Simulacao; editar: (f: (g: Grafo) => Grafo) => void; visao: Visao; estreito: boolean; simulador: ReactNode }

// O aviso da cadeia e a visão escolhida do mesmo rascunho: a lista, ou o canvas carregado sob demanda.
// No canvas o simulador fica na coluna da direita; na lista, embaixo das etapas.
function AreaDoRascunho({ grafo, setores, simulacao, editar, visao, estreito, simulador }: PropsDaArea) {
  const CanvasCarregado = useMemo(() => lazy(() => Carga.canvas()), [])
  const lista = (
    <>
      <ListaDeEtapas grafo={grafo} setores={setores} editar={editar} />
      {simulador}
    </>
  )
  const canvas = (
    <FalhaDoCanvas
      fallback={
        <>
          <Alert variant="destructive">Não foi possível abrir o canvas. Use a lista.</Alert>
          {lista}
        </>
      }
    >
      <Suspense fallback={<Spinner />}>
        <CanvasCarregado grafo={grafo} setores={setores} marcas={marcasDaSimulacao(grafo, simulacao)} editar={editar} lateral={simulador} />
      </Suspense>
    </FalhaDoCanvas>
  )
  return (
    <>
      {estreito && <p className="m-0 text-sm text-muted-foreground">O canvas está disponível em telas maiores.</p>}
      {!cadeiaValida(grafo) && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {FraseDaCadeia}
        </p>
      )}
      {visao === 'canvas' && !estreito ? canvas : lista}
    </>
  )
}

// O menu "Mais" da barra: o que apaga fica fora do caminho.
function MaisAcoes({ podeDescartar, descartar }: { podeDescartar: boolean; descartar: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline">
          Mais
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" disabled={!podeDescartar} onSelect={descartar}>
          Descartar rascunho
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const rotuloDoEstado = (alterado: boolean, salvo: boolean, fluxo: Fluxo) => (alterado ? 'Alterações não salvas' : salvo ? 'Rascunho salvo' : estadoDoFluxo(fluxo))

type PropsDaTrilha = { contexto: string; lista: string; fluxos: string }

// Cadastros › Fluxos › Boletos · ADS, 3º semestre: a trilha leva de volta à lista (com alterações não salvas, o useBlocker da página pergunta).
function Trilha({ contexto, lista, fluxos }: PropsDaTrilha) {
  return (
    <nav aria-label="Trilha">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-sm text-muted-foreground">
        <li>
          <Link to={lista} className="inline-flex min-h-11 items-center hover:text-foreground hover:underline">
            Cadastros
          </Link>
        </li>
        <ChevronRight aria-hidden="true" className="size-4" />
        <li>
          <Link to={fluxos} className="inline-flex min-h-11 items-center hover:text-foreground hover:underline">
            Fluxos
          </Link>
        </li>
        <ChevronRight aria-hidden="true" className="size-4" />
        <li aria-current="page" className="min-w-0 truncate font-medium text-foreground">
          {contexto}
        </li>
      </ol>
    </nav>
  )
}

type PropsDoTopo = {
  estado: string
  alterado: boolean
  visao: Visao
  mudarVisao: (v: Visao) => void
  simulador: EstadoDoSimulador
  voltar: () => void
  salvando: boolean
  valida: boolean
  publicar: ReactNode
  podeDescartar: boolean
  descartar: () => void
}

// A barra do editor, abaixo da trilha: o estado do fluxo, as duas visões e as ações. Quebra em mais de uma linha no celular.
function BarraDoEditor(p: PropsDoTopo) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" className="min-h-11" onClick={p.voltar}>
        Voltar
      </Button>
      <Badge variant={p.alterado ? 'default' : 'secondary'}>{p.estado}</Badge>
      <div className="hidden md:block">
        <Alternador visao={p.visao} mudar={p.mudarVisao} />
      </div>
      <div className="ms-auto flex flex-wrap items-center gap-2">
        <BotaoSimular s={p.simulador} />
        <BotaoAcao type="submit" variant="outline" pendente={p.salvando} disabled={!p.valida}>
          Salvar rascunho
        </BotaoAcao>
        {p.publicar}
        <MaisAcoes podeDescartar={p.podeDescartar} descartar={p.descartar} />
      </div>
    </div>
  )
}

// "Sair sem salvar?": o que foi editado e não salvo se perde.
function SairSemSalvar({ aberto, continuar, sair }: { aberto: boolean; continuar: () => void; sair: () => void }) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && continuar()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Sair sem salvar?</DialogTitle>
        </DialogHeader>
        <p className="m-0 text-sm">As alterações deste fluxo que não foram salvas como rascunho serão perdidas.</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={continuar}>
            Continuar editando
          </Button>
          <Button type="button" variant="destructive" onClick={sair}>
            Sair sem salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Fechar ou recarregar a aba com alterações não salvas pede a confirmação do navegador.
function useAvisoAoFechar(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [ativo])
}

// Ctrl+S (⌘+S) salva o rascunho como o botão e impede a janela de salvar a página; o corpo roda a cada tecla com o estado atual.
function useAtalhoDeSalvar(salvar: () => unknown) {
  const atual = useRef(salvar)
  atual.current = salvar
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return
      e.preventDefault()
      atual.current()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])
}

type Props = { fluxo: Fluxo; categorias: Categoria[]; cursos: Curso[]; setores: Setor[]; recarregar: () => Promise<unknown> }

// A página de edição do fluxo, dentro da casca: a trilha, a barra (estado, Lista e Canvas, Simular, Salvar rascunho, Publicar e o menu Mais com Descartar),
// o rascunho em lista ou no canvas e o painel lateral. Publicar só liga depois que a API aceitou o rascunho como está na tela (a validação é a da API) e a cadeia está inteira.
export function EdicaoDoFluxo({ fluxo, categorias, cursos, setores, recarregar }: Props) {
  const { slug } = useParams()
  const navegar = useNavigate()
  const lista = `/${slug}/cadastros`
  const fluxos = `${lista}?aba=fluxos`
  const [grafo, setGrafo] = useState<Grafo>(() => deEtapas((fluxo.rascunho ?? fluxo.vigente)?.etapas ?? []))
  const [visao, setVisao] = useState<Visao>('lista')
  const [simulacao, setSimulacao] = useState<Simulacao>()
  const [salvo, setSalvo] = useState(!!fluxo.rascunho)
  const [alterado, setAlterado] = useState(false)
  const ignorarSaida = useRef(false) // Descartar e Publicar saem de propósito, sem perguntar
  // qualquer saída da página com alterações não salvas (trilha, Voltar, barra lateral, Voltar do navegador) pergunta antes
  const bloqueio = useBlocker(({ currentLocation, nextLocation }) => alterado && !ignorarSaida.current && currentLocation.pathname !== nextLocation.pathname)
  const estreito = useConsulta('(max-width: 767px)')
  const acao = useGravacao(recarregar)
  const caminhoDaApi = `/api/admin/fluxos/${fluxo.id}`
  const valida = cadeiaValida(grafo)
  const simulador = useSimulador({ fluxo, versao: versaoParaSimular(salvo, alterado, fluxo), aoSimular: setSimulacao })
  useAvisoAoFechar(alterado)

  function editar(f: (g: Grafo) => Grafo) {
    setGrafo(f)
    setSalvo(false)
    setAlterado(true)
    setSimulacao(undefined)
  }
  const mudarVisao = (v: Visao) => {
    if (v === 'canvas') setGrafo(fixarPosicoes) // o que o canvas desenha é o que a API recebe
    setVisao(v)
  }
  useAtalhoDeSalvar(() => valida && !acao.isPending && salvar())
  const aoEnviar = (e: FormEvent) => {
    e.preventDefault()
    salvar()
  }

  const sairDeVez = (destino: string) => {
    ignorarSaida.current = true
    navegar(destino)
  }
  const salvar = () =>
    acao.mutate({ chamar: () => api(`${caminhoDaApi}/rascunho`, { etapas: etapasParaApi(grafo) }, 'PUT'), aviso: 'Rascunho salvo.', depois: () => { setSalvo(true); setAlterado(false) } })
  const publicar = () => acao.mutate({ chamar: () => api(`${caminhoDaApi}/publicar`, {}), aviso: 'Fluxo publicado.', depois: () => sairDeVez(fluxos) })
  const descartar = () => acao.mutate({ chamar: () => api(`${caminhoDaApi}/rascunho`, undefined, 'DELETE'), aviso: 'Rascunho descartado.', depois: () => sairDeVez(fluxos) })

  const contexto = `${categorias.find((c) => c.id === fluxo.categoriaId)?.nome} · ${abrangenciaDoFluxo(fluxo, cursos)}`
  const noCanvas = visao === 'canvas' && !estreito
  const publicarBotao = (
    <BotaoAcao type="button" pendente={false} disabled={!salvo || !valida || acao.isPending} onClick={publicar}>
      Publicar
    </BotaoAcao>
  )
  // no canvas o editor tem a altura da janela (menos o cabeçalho da casca) e o desenho enche o que sobra
  const altura = noCanvas ? 'lg:h-[calc(100dvh-49px-1.5rem)] lg:-mb-6 lg:pb-3' : ''
  return (
    <section aria-label="Editar: Fluxos" className={`flex min-w-0 flex-col gap-2 ${altura}`}>
      <Trilha contexto={contexto} lista={lista} fluxos={fluxos} />
      <form className="flex min-h-0 flex-1 flex-col gap-3" onSubmit={aoEnviar}>
        <BarraDoEditor estado={rotuloDoEstado(alterado, salvo, fluxo)} alterado={alterado} visao={visao} mudarVisao={mudarVisao} simulador={simulador} voltar={() => navegar(fluxos)} salvando={acao.isPending} valida={valida} publicar={publicarBotao} podeDescartar={!!fluxo.rascunho && !acao.isPending} descartar={descartar} />
        <div className={`flex min-h-0 flex-1 flex-col gap-3 ${noCanvas ? '' : 'max-w-3xl'}`}>
          <ErroDe erro={acao.error} />
          <AreaDoRascunho grafo={grafo} setores={setores} simulacao={simulacao} editar={editar} visao={visao} estreito={estreito} simulador={<Simulador s={simulador} cursos={cursos} resultado={simulacao} />} />
        </div>
      </form>
      <SairSemSalvar aberto={bloqueio.state === 'blocked'} continuar={() => bloqueio.reset?.()} sair={() => bloqueio.proceed?.()} />
    </section>
  )
}