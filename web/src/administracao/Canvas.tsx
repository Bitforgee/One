import '@xyflow/react/dist/style.css'
import { applyNodeChanges, Background, BackgroundVariant, ControlButton, Controls, getViewportForBounds, MarkerType, Panel, ReactFlow, ReactFlowProvider, useReactFlow, useStore, type Connection, type Edge, type EdgeChange, type Node, type NodeChange } from '@xyflow/react'
import { LayoutGrid, Maximize } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { BotaoDeAdicionar, BotaoFlutuante, TipoArrastado } from './AdicionarEtapa'
import { Destinos, rotuloDaEtapa, type Destino, type Setor } from './comum'
import { acrescentar, caminho, comoEtapa, desligar, inserirEntre, Inicio, ligar, limites, MaximoDeEtapas, mudar, nosInvalidos, novoNo, ordenados, organizar, podeLigar, posicaoDoProximo, posicaoPadrao, remover, type Grafo } from './grafo'
import { TiposDeLigacao, type DadosDaLigacao } from './LigacaoComMais'
import { TiposDeNo, type DadosDaEtapa } from './NosDoCanvas'
import { PainelDoNo } from './PainelDoNo'

// As cores, os raios e a fonte do canvas vêm dos tokens do index.css: a biblioteca só recebe `var(--token)`.
const Tokens = {
  '--xy-background-color-default': 'var(--muted)',
  '--xy-background-pattern-dots-color-default': 'color-mix(in oklch, var(--foreground) 22%, transparent)',
  '--xy-edge-stroke-default': 'var(--muted-foreground)',
  '--xy-edge-stroke-width-default': '2',
  '--xy-edge-stroke-selected-default': 'var(--primary)',
  '--xy-connectionline-stroke-default': 'var(--primary)',
  '--xy-connectionline-stroke-width-default': '2',
  '--xy-handle-background-color-default': 'var(--primary)',
  '--xy-handle-border-color-default': 'var(--card)',
  '--xy-controls-button-background-color-default': 'var(--card)',
  '--xy-controls-button-background-color-hover-default': 'var(--accent)',
  '--xy-controls-button-color-default': 'var(--foreground)',
  '--xy-controls-button-border-color-default': 'var(--border)',
  '--xy-attribution-background-color-default': 'var(--card)',
} as CSSProperties

// Os nós e as ligações do rascunho como a biblioteca os desenha: o Início fixo e um nó por etapa, cada um em seu x e y.
function desenhar(g: Grafo, setores: Setor[], marcas: Record<string, string>, pedirRemocao: (id: string) => void): Node[] {
  const invalidos = nosInvalidos(g)
  const inicio: Node = { id: Inicio, type: 'inicio', position: { x: 0, y: posicaoPadrao(0).y }, data: {}, draggable: false, deletable: false, ariaLabel: 'Início' }
  const etapas = ordenados(g).map<Node>((n, i) => {
    const rotulo = rotuloDaEtapa(comoEtapa(n), setores)
    const padrao = posicaoPadrao(i)
    // o prazo vira um chip no cartão; o rótulo acessível continua inteiro
    const titulo = rotuloDaEtapa({ ...comoEtapa(n), prazoHoras: null }, setores)
    const dados: DadosDaEtapa = { titulo, prazo: n.prazoHoras === '' ? null : Number(n.prazoHoras), destino: n.destino, posicao: i + 1, marca: marcas[n.id], invalido: invalidos.has(n.id), remover: () => pedirRemocao(n.id) }
    return { id: n.id, type: 'etapa', position: { x: n.x ?? padrao.x, y: n.y ?? padrao.y }, data: dados, deletable: false, ariaLabel: `Etapa ${i + 1}: ${rotulo}` }
  })
  return [inicio, ...etapas]
}

// O rótulo acessível de uma ligação usa os rótulos fixos dos nós, nunca os ids internos.
function ligacoesComoArestas(g: Grafo, setores: Setor[], inserir: (de: string, para: string, destino: Destino) => void): Edge[] {
  const rotulo = (id: string) => {
    const no = g.nos.find((n) => n.id === id)
    return no ? rotuloDaEtapa(comoEtapa(no), setores) : 'Início'
  }
  const cheia = g.nos.length >= MaximoDeEtapas
  return g.ligacoes.map((l) => ({
    id: `${l.de}>${l.para}`,
    source: l.de,
    target: l.para,
    type: 'ligacao',
    data: { entre: `entre ${rotulo(l.de)} e ${rotulo(l.para)}`, cheia, inserir: (destino: Destino) => inserir(l.de, l.para, destino) } satisfies DadosDaLigacao,
    markerEnd: { type: MarkerType.ArrowClosed, color: 'currentColor' },
    ariaLabel: `Ligação de ${rotulo(l.de)} para ${rotulo(l.para)}`,
  }))
}

const Direcoes: Record<string, string> = { left: 'para a esquerda', right: 'para a direita', up: 'para cima', down: 'para baixo' }

// Os textos de acessibilidade que a biblioteca escreve em inglês, em português do Brasil.
const TextosDoCanvas = {
  'node.a11yDescription.default': 'Pressione Enter ou espaço para selecionar a etapa. Pressione Esc para cancelar.',
  'node.a11yDescription.keyboardDisabled': 'Pressione Enter ou espaço para selecionar a etapa e use as setas para movê-la. Pressione Esc para cancelar.',
  'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }: { direction: string; x: number; y: number }) => `Etapa movida ${Direcoes[direction] ?? direction}. Nova posição, x: ${x}, y: ${y}`,
  'edge.a11yDescription.default': 'Pressione Enter ou espaço para selecionar a ligação. Depois, pressione Delete para removê-la ou Esc para cancelar.',
  'controls.ariaLabel': 'Controles do canvas',
  'controls.zoomIn.ariaLabel': 'Aproximar',
  'controls.zoomOut.ariaLabel': 'Afastar',
  'controls.fitView.ariaLabel': 'Enquadrar o fluxo',
  'controls.interactive.ariaLabel': 'Alternar interatividade',
  'minimap.ariaLabel': 'Minimapa',
  'handle.ariaLabel': 'Ponto de ligação',
}

function ConfirmarRemocao({ aberto, cancelar, confirmar }: { aberto: boolean; cancelar: () => void; confirmar: () => void }) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && cancelar()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Remover a etapa?</DialogTitle>
        </DialogHeader>
        <p>A etapa tem setor ou prazo definido. Ela sai do fluxo junto com as ligações, e as vizinhas não se religam.</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={cancelar}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar}>
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type CanvasProps = {
  grafo: Grafo
  setores: Setor[]
  marcas: Record<string, string> // por id do nó: "Vai por aqui" ou "Pulada: motivo", depois de simular
  editar: (f: (g: Grafo) => Grafo) => void
  lateral?: ReactNode // a coluna da direita, sob o painel da etapa (o simulador)
}

// O ref guarda a função mais nova sem trocar a identidade que os nós e as ligações recebem (trocar refaria o desenho a cada render).
function useEstavel<A extends unknown[]>(f: (...a: A) => void) {
  const ref = useRef(f)
  ref.current = f
  return useCallback((...a: A) => ref.current(...a), [])
}

function Corpo({ grafo, setores, marcas, editar, lateral }: CanvasProps) {
  const { screenToFlowPosition, setViewport } = useReactFlow()
  const largura = useStore((s) => s.width)
  const altura = useStore((s) => s.height)
  const [removendo, setRemovendo] = useState<string>()
  const tirar = (id: string) => editar((g) => remover(g, id, false))
  const pedirRemocao = useEstavel((id: string) => {
    const n = grafo.nos.find((x) => x.id === id)
    if (n) n.setorId !== '' || n.prazoHoras !== '' ? setRemovendo(id) : tirar(id)
  })
  const inserir = useEstavel((de: string, para: string, destino: Destino) => editar((g) => inserirEntre(g, de, para, novoNo(destino))))
  const desenhados = useMemo(() => desenhar(grafo, setores, marcas, pedirRemocao), [grafo, setores, marcas, pedirRemocao])
  const arestas = useMemo(() => ligacoesComoArestas(grafo, setores, inserir), [grafo, setores, inserir])
  const ref = useRef<Node[]>([])
  const reenquadrar = useRef(false)
  const [nodes, setNodes] = useState<Node[]>([])
  const cheia = caminho(grafo).length >= MaximoDeEtapas
  // o zoom nunca passa de 100%: um fluxo curto não vira letreiro
  const enquadrar = useCallback(() => {
    if (largura > 0) setViewport(getViewportForBounds(limites(grafo, !cheia), largura, altura, 0.4, 1, 0.2))
  }, [setViewport, largura, altura, grafo, cheia])
  const atual = grafo.nos.find((n) => n.id === nodes.find((n) => n.selected && n.id !== Inicio)?.id)

  // O rascunho manda no conteúdo; o que a biblioteca mediu e o que está selecionado ficam como estavam.
  useEffect(() => {
    ref.current = desenhados.map((d) => ({ ...d, measured: ref.current.find((a) => a.id === d.id)?.measured, selected: ref.current.find((a) => a.id === d.id)?.selected }))
    setNodes(ref.current)
    // a etapa posta pelo "+" ou pelo menu pode cair fora da tela: o desenho se enquadra de novo depois de medir
    if (reenquadrar.current) {
      reenquadrar.current = false
      setTimeout(enquadrar, 60)
    }
  }, [desenhados, enquadrar])

  // abrir ou fechar o painel muda a largura do canvas: o desenho se enquadra de novo
  const comPainel = !!atual
  useEffect(() => {
    const t = setTimeout(enquadrar, 80)
    return () => clearTimeout(t)
  }, [comPainel, largura])

  function aoMudarNos(mudancas: NodeChange[]) {
    ref.current = applyNodeChanges(mudancas, ref.current)
    setNodes(ref.current)
    // a posição só entra no rascunho quando o arrasto ou a seta termina
    const prontas = mudancas.filter((m) => m.type === 'position' && m.dragging === false).map((m) => ref.current.find((n) => n.id === (m as { id: string }).id)!)
    if (prontas.length > 0) editar((g) => prontas.reduce((acc, n) => mudar(acc, n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) }), g))
  }

  const aoMudarArestas = (mudancas: EdgeChange[]) => {
    for (const m of mudancas) if (m.type === 'remove') editar((g) => desligar(g, ...(m.id.split('>') as [string, string])))
  }
  const aoLigar = (c: Connection) => editar((g) => ligar(g, c.source, c.target))
  const adicionar = (destino: Destino) => {
    reenquadrar.current = true
    editar((g) => {
      const p = posicaoDoProximo(g)
      return acrescentar(g, novoNo(destino, p.x, p.y), true)
    })
  }
  const arrumar = () => {
    reenquadrar.current = true
    editar(organizar)
  }

  function aoLargar(e: DragEvent) {
    e.preventDefault()
    const destino = Destinos.find(([d]) => d === e.dataTransfer.getData(TipoArrastado))?.[0]
    if (!destino) return
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    editar((g) => acrescentar(g, novoNo(destino, Math.round(p.x), Math.round(p.y)), false))
  }

  const fecharPainel = () => {
    ref.current = ref.current.map((n) => ({ ...n, selected: false }))
    setNodes(ref.current)
  }
  const proximo = posicaoDoProximo(grafo)
  const removida = grafo.nos.find((n) => n.id === removendo)

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative h-[clamp(24rem,calc(100dvh-12rem),60rem)] min-w-0 overflow-hidden rounded-lg border text-muted-foreground lg:flex-1" style={Tokens}>
        <ReactFlow
          nodes={nodes}
          edges={arestas}
          nodeTypes={TiposDeNo}
          edgeTypes={TiposDeLigacao}
          onNodesChange={aoMudarNos}
          onEdgesChange={aoMudarArestas}
          onConnect={aoLigar}
          isValidConnection={(c) => podeLigar(grafo.ligacoes, c.source, c.target)}
          onBeforeDelete={async ({ edges }) => ({ nodes: [], edges })}
          onDrop={aoLargar}
          onDragOver={(e) => e.preventDefault()}
          ariaLabelConfig={TextosDoCanvas}
          nodesFocusable
          edgesFocusable
          zoomOnScroll={false}
          preventScrolling={false}
          onInit={enquadrar}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
          <Controls showInteractive={false} showFitView={false}>
            <ControlButton onClick={enquadrar} aria-label="Enquadrar o fluxo" title="Enquadrar o fluxo">
              <Maximize aria-hidden="true" />
            </ControlButton>
          </Controls>
          <BotaoFlutuante adicionar={adicionar} cheia={grafo.nos.length >= MaximoDeEtapas} />
          <Panel position="top-right" className="m-3!">
            <Button type="button" variant="outline" className="min-h-11 bg-card shadow-xs" disabled={grafo.nos.length === 0} onClick={arrumar}>
              <LayoutGrid aria-hidden="true" />
              Organizar
            </Button>
          </Panel>
          {!cheia && <BotaoDeAdicionar x={proximo.x} y={proximo.y} vazio={grafo.nos.length === 0} adicionar={adicionar} />}
        </ReactFlow>
        {grafo.nos.length === 0 && <p className="pointer-events-none absolute inset-x-0 bottom-4 m-0 px-4 text-center text-sm">Arraste um destino para começar.</p>}
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
        {atual && <PainelDoNo no={atual} setores={setores} mudar={(p) => editar((g) => mudar(g, atual.id, p))} remover={() => pedirRemocao(atual.id)} fechar={fecharPainel} />}
        {lateral}
      </aside>
      <ConfirmarRemocao aberto={!!removida} cancelar={() => setRemovendo(undefined)} confirmar={() => { tirar(removendo!); setRemovendo(undefined) }} />
    </div>
  )
}

// O editor de arrastar e soltar do mesmo rascunho da lista. Só é carregado quando a visão Canvas abre (door 10).
export default function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Corpo {...props} />
    </ReactFlowProvider>
  )
}
