import { Component, lazy, Suspense, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { BotaoAcao, useGravacao } from '../acao'
import { api } from '../api'
import { Editor } from '../Editor'
import { ErroDe } from '../ErroDe'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog'
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

type PropsDaJanela = { titulo: string; fechar: () => void; salvar: () => void; topo: ReactNode; corpo: ReactNode }

// A tela cheia do editor, como a de um editor de automações: a barra com o estado e as ações em cima, o desenho ocupando o resto.
function JanelaCheia({ fechar, salvar, topo, corpo }: Omit<PropsDaJanela, 'titulo'>) {
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    salvar()
  }
  return (
    <Dialog open onOpenChange={(a) => !a && fechar()}>
      <DialogContent showCloseButton={false} aria-describedby={undefined} className="top-0 left-0 flex h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none">
        <form className="contents" onSubmit={enviar}>
          <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2">{topo}</header>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">{corpo}</div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const rotuloDoEstado = (alterado: boolean, salvo: boolean, fluxo: Fluxo) => (alterado ? 'Alterações não salvas' : salvo ? 'Rascunho salvo' : estadoDoFluxo(fluxo))

type PropsDoTopo = {
  contexto: string
  estado: string
  alterado: boolean
  visao: Visao
  mudarVisao: (v: Visao) => void
  simulador: EstadoDoSimulador
  fechar: () => void
  salvando: boolean
  valida: boolean
  publicar: ReactNode
  podeDescartar: boolean
  descartar: () => void
}

// A barra de cima da tela cheia: o nome e o estado do fluxo, as duas visões e as ações.
function TopoDoFluxo(p: PropsDoTopo) {
  return (
    <>
      <div className="min-w-0 flex-1 basis-48">
        <DialogTitle className="text-base">Editar: Fluxos</DialogTitle>
        <p className="m-0 truncate text-xs text-muted-foreground">{p.contexto}</p>
      </div>
      <Badge variant={p.alterado ? 'default' : 'secondary'}>{p.estado}</Badge>
      <Alternador visao={p.visao} mudar={p.mudarVisao} />
      <BotaoSimular s={p.simulador} />
      <Button type="button" variant="outline" onClick={p.fechar}>
        Cancelar
      </Button>
      <BotaoAcao type="submit" variant="outline" pendente={p.salvando} disabled={!p.valida}>
        Salvar rascunho
      </BotaoAcao>
      {p.publicar}
      <MaisAcoes podeDescartar={p.podeDescartar} descartar={p.descartar} />
    </>
  )
}
type Props = { fluxo: Fluxo; categorias: Categoria[]; cursos: Curso[]; setores: Setor[]; fechar: () => void; recarregar: () => Promise<unknown> }

// A janela de edição do fluxo: o rascunho em lista ou no canvas, o simulador, e a barra Simular, Publicar, Cancelar e Salvar rascunho; Descartar fica no menu Mais.
// Publicar só liga depois que a API aceitou o rascunho como está na tela (a validação é a da API) e a cadeia está inteira.
export function EdicaoDoFluxo({ fluxo, categorias, cursos, setores, fechar, recarregar }: Props) {
  const [grafo, setGrafo] = useState<Grafo>(() => deEtapas((fluxo.rascunho ?? fluxo.vigente)?.etapas ?? []))
  const [visao, setVisao] = useState<Visao>('lista')
  const [simulacao, setSimulacao] = useState<Simulacao>()
  const [salvo, setSalvo] = useState(!!fluxo.rascunho)
  const [alterado, setAlterado] = useState(false)
  const estreito = useConsulta('(max-width: 767px)')
  const acao = useGravacao(recarregar)
  const caminhoDaApi = `/api/admin/fluxos/${fluxo.id}`
  const valida = cadeiaValida(grafo)
  const simulador = useSimulador({ fluxo, versao: versaoParaSimular(salvo, alterado, fluxo), aoSimular: setSimulacao })

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

  const salvar = () =>
    acao.mutate({ chamar: () => api(`${caminhoDaApi}/rascunho`, { etapas: etapasParaApi(grafo) }, 'PUT'), aviso: 'Rascunho salvo.', depois: () => { setSalvo(true); setAlterado(false) } })
  const publicar = () => acao.mutate({ chamar: () => api(`${caminhoDaApi}/publicar`, {}), aviso: 'Fluxo publicado.', depois: fechar })
  const descartar = () => acao.mutate({ chamar: () => api(`${caminhoDaApi}/rascunho`, undefined, 'DELETE'), aviso: 'Rascunho descartado.', depois: fechar })

  const contexto = `${categorias.find((c) => c.id === fluxo.categoriaId)?.nome} · ${abrangenciaDoFluxo(fluxo, cursos)}`
  const corpo = (
    <AreaDoRascunho grafo={grafo} setores={setores} simulacao={simulacao} editar={editar} visao={visao} estreito={estreito} simulador={<Simulador s={simulador} cursos={cursos} resultado={simulacao} />} />
  )
  const publicarBotao = (
    <BotaoAcao type="button" pendente={false} disabled={!salvo || !valida || acao.isPending} onClick={publicar}>
      Publicar
    </BotaoAcao>
  )

  if (estreito)
    return (
      <Editor titulo="Editar: Fluxos" aberto fechar={fechar} salvar={salvar} pendente={acao.isPending} botao="Salvar rascunho" desabilitado={!valida} acoes={<><BotaoSimular s={simulador} />{publicarBotao}</>} alerta={<ErroDe erro={acao.error} />}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-sm text-muted-foreground">{contexto}</p>
          <BotaoAcao type="button" variant="ghost" pendente={false} className="text-destructive hover:text-destructive" disabled={!fluxo.rascunho || acao.isPending} onClick={descartar}>
            Descartar rascunho
          </BotaoAcao>
        </div>
        {corpo}
      </Editor>
    )
  const topo = <TopoDoFluxo contexto={contexto} estado={rotuloDoEstado(alterado, salvo, fluxo)} alterado={alterado} visao={visao} mudarVisao={mudarVisao} simulador={simulador} fechar={fechar} salvando={acao.isPending} valida={valida} publicar={publicarBotao} podeDescartar={!!fluxo.rascunho && !acao.isPending} descartar={descartar} />
  return (
    <JanelaCheia fechar={fechar} salvar={salvar} topo={topo} corpo={<><ErroDe erro={acao.error} />{corpo}</>} />
  )
}