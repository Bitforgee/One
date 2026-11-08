import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { BotaoAcao, useGravacao } from '../acao'
import { api } from '../api'
import { Editor } from '../Editor'
import { ErroDe } from '../ErroDe'
import { Alert } from '../ui/alert'
import { Spinner } from '../ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { useConsulta } from '../ui/use-mobile'
import { abrangenciaDoFluxo, type Categoria, type Curso, type Fluxo, type Setor } from './comum'
import { caminho, cadeiaValida, deEtapas, etapasParaApi, FraseDaCadeia, fixarPosicoes, type Grafo } from './grafo'
import { ListaDeEtapas } from './ListaDeEtapas'
import { Simulador, type Simulacao } from './Simulador'

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

type PropsDaArea = { grafo: Grafo; setores: Setor[]; simulacao?: Simulacao; editar: (f: (g: Grafo) => Grafo) => void; visao: Visao; mudarVisao: (v: Visao) => void; estreito: boolean }

// O alternador, o aviso da cadeia e a visão escolhida do mesmo rascunho: a lista, ou o canvas carregado sob demanda.
function AreaDoRascunho({ grafo, setores, simulacao, editar, visao, mudarVisao, estreito }: PropsDaArea) {
  const CanvasCarregado = useMemo(() => lazy(() => Carga.canvas()), [])
  const lista = <ListaDeEtapas grafo={grafo} setores={setores} editar={editar} />
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
        <CanvasCarregado grafo={grafo} setores={setores} marcas={marcasDaSimulacao(grafo, simulacao)} editar={editar} />
      </Suspense>
    </FalhaDoCanvas>
  )
  return (
    <>
      {estreito ? <p className="m-0 text-sm text-muted-foreground">O canvas está disponível em telas maiores.</p> : <Alternador visao={visao} mudar={mudarVisao} />}
      {!cadeiaValida(grafo) && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {FraseDaCadeia}
        </p>
      )}
      {visao === 'canvas' && !estreito ? canvas : lista}
    </>
  )
}

type PropsDosBotoes = { podePublicar: boolean; podeDescartar: boolean; publicar: () => void; descartar: () => void }

function BotoesDoFluxo({ podePublicar, podeDescartar, publicar, descartar }: PropsDosBotoes) {
  return (
    <div className="flex flex-wrap gap-2">
      <BotaoAcao type="button" pendente={false} disabled={!podePublicar} onClick={publicar}>
        Publicar
      </BotaoAcao>
      <BotaoAcao type="button" variant="ghost" pendente={false} className="text-destructive hover:text-destructive" disabled={!podeDescartar} onClick={descartar}>
        Descartar rascunho
      </BotaoAcao>
    </div>
  )
}

type Props = { fluxo: Fluxo; categorias: Categoria[]; cursos: Curso[]; setores: Setor[]; fechar: () => void; recarregar: () => Promise<unknown> }

// A janela de edição do fluxo: o rascunho em lista ou no canvas, o simulador, e as ações Salvar rascunho, Publicar e Descartar.
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

  return (
    <Editor titulo="Editar: Fluxos" aberto fechar={fechar} salvar={salvar} pendente={acao.isPending} botao="Salvar rascunho" desabilitado={!valida} largo={visao === 'canvas' && !estreito} alerta={<ErroDe erro={acao.error} />}>
      <p className="m-0 text-sm text-muted-foreground">
        {categorias.find((c) => c.id === fluxo.categoriaId)?.nome} · {abrangenciaDoFluxo(fluxo, cursos)}
      </p>
      <AreaDoRascunho grafo={grafo} setores={setores} simulacao={simulacao} editar={editar} visao={visao} mudarVisao={mudarVisao} estreito={estreito} />
      <Simulador fluxo={fluxo} cursos={cursos} versao={versaoParaSimular(salvo, alterado, fluxo)} resultado={simulacao} aoSimular={setSimulacao} />
      <BotoesDoFluxo podePublicar={salvo && valida && !acao.isPending} podeDescartar={!!fluxo.rascunho && !acao.isPending} publicar={publicar} descartar={descartar} />
    </Editor>
  )
}