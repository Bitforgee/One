import '@xyflow/react/dist/style.css'
import { applyNodeChanges, Controls, Handle, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps } from '@xyflow/react'
import { Building2, Flag, GraduationCap, Trash2, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { Opcoes } from '../Opcoes'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { Destinos, rotuloDaEtapa, type Destino, type Setor } from './comum'
import { acrescentar, comoEtapa, desligar, Inicio, ligar, mudar, nosInvalidos, novoNo, ordenados, podeLigar, posicaoPadrao, remover, type Grafo, type No } from './grafo'

const Icones: Record<Destino, LucideIcon> = { SETOR: Building2, COORDENACAO_CURSO: GraduationCap, LIDERANCA_SEMESTRE: Users }
const TipoArrastado = 'application/x-fluxo-destino'

// As cores, os raios e a fonte do canvas vêm dos tokens do index.css: a biblioteca só recebe `var(--token)`.
const Tokens = {
  '--xy-background-color-default': 'var(--background)',
  '--xy-edge-stroke-default': 'var(--foreground)',
  '--xy-edge-stroke-selected-default': 'var(--primary)',
  '--xy-connectionline-stroke-default': 'var(--primary)',
  '--xy-handle-background-color-default': 'var(--primary)',
  '--xy-handle-border-color-default': 'var(--card)',
  '--xy-controls-button-background-color-default': 'var(--card)',
  '--xy-controls-button-background-color-hover-default': 'var(--muted)',
  '--xy-controls-button-color-default': 'var(--foreground)',
  '--xy-controls-button-border-color-default': 'var(--border)',
  '--xy-attribution-background-color-default': 'var(--card)',
} as CSSProperties

type DadosDaEtapa = { rotulo: string; destino: Destino; marca?: string; invalido: boolean }

function NoInicio() {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm font-medium text-foreground">
      <Flag aria-hidden="true" className="size-4 shrink-0" />
      Início
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

function NoEtapa({ data, selected }: NodeProps<Node<DadosDaEtapa>>) {
  const Icone = Icones[data.destino]
  const borda = data.invalido ? 'border-dashed border-destructive' : selected ? 'border-primary' : 'border-border'
  return (
    <div className={`flex min-w-44 flex-col gap-1 rounded-md border bg-card px-3 py-2 text-sm text-card-foreground ${borda}`}>
      <Handle type="target" position={Position.Left} />
      <span className="flex items-center gap-2 font-medium">
        <Icone aria-hidden="true" className="size-4 shrink-0" />
        {data.rotulo}
      </span>
      {data.invalido && <span className="text-xs text-destructive">Fora da cadeia</span>}
      {data.marca && <span className="text-xs text-muted-foreground">{data.marca}</span>}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const TiposDeNo = { inicio: NoInicio, etapa: NoEtapa }

// Os nós e as ligações do rascunho como a biblioteca os desenha: o Início fixo e um nó por etapa, cada um em seu x e y.
function desenhar(g: Grafo, setores: Setor[], marcas: Record<string, string>): Node[] {
  const invalidos = nosInvalidos(g)
  const inicio: Node = { id: Inicio, type: 'inicio', position: { x: 0, y: posicaoPadrao(0).y }, data: {}, draggable: false, deletable: false, ariaLabel: 'Início' }
  const etapas = ordenados(g).map<Node>((n, i) => {
    const rotulo = rotuloDaEtapa(comoEtapa(n), setores)
    const padrao = posicaoPadrao(i)
    const dados: DadosDaEtapa = { rotulo, destino: n.destino, marca: marcas[n.id], invalido: invalidos.has(n.id) }
    return { id: n.id, type: 'etapa', position: { x: n.x ?? padrao.x, y: n.y ?? padrao.y }, data: dados, deletable: false, ariaLabel: `Etapa ${i + 1}: ${rotulo}` }
  })
  return [inicio, ...etapas]
}

// O rótulo acessível de uma ligação usa os rótulos fixos dos nós, nunca os ids internos.
function ligacoesComoArestas(g: Grafo, setores: Setor[]): Edge[] {
  const rotulo = (id: string) => {
    const no = g.nos.find((n) => n.id === id)
    return no ? rotuloDaEtapa(comoEtapa(no), setores) : 'Início'
  }
  return g.ligacoes.map((l) => ({ id: `${l.de}>${l.para}`, source: l.de, target: l.para, type: 'smoothstep', ariaLabel: `Ligação de ${rotulo(l.de)} para ${rotulo(l.para)}` }))
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

// A paleta com os três tipos de destino: arrastar para o canvas solta um nó; o botão põe a etapa no fim da cadeia, para quem não arrasta.
function Paleta({ adicionar }: { adicionar: (destino: Destino) => void }) {
  return (
    <div role="group" aria-label="Destinos" className="flex shrink-0 flex-col gap-2 md:w-52">
      <p className="m-0 text-sm font-medium">Destinos</p>
      <p className="m-0 text-xs text-muted-foreground">Arraste para o canvas ou clique para pôr no fim da cadeia.</p>
      {Destinos.map(([destino, rotulo]) => {
        const Icone = Icones[destino]
        return (
          <Button
            key={destino}
            type="button"
            variant="outline"
            className="justify-start"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(TipoArrastado, destino)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onClick={() => adicionar(destino)}
          >
            <Icone aria-hidden="true" />
            {rotulo}
          </Button>
        )
      })}
    </div>
  )
}

type PainelProps = { no: No; setores: Setor[]; mudar: (parcial: Partial<No>) => void; remover: () => void }

// O setor, o prazo e a remoção do nó selecionado: o canvas desenha a cadeia, e estes campos completam a etapa.
function PainelDoNo({ no, setores, mudar: alterar, remover: tirar }: PainelProps) {
  return (
    <section aria-label="Etapa selecionada" className="flex flex-col gap-2 rounded-md border p-3">
      <h3 className="m-0 text-sm font-semibold">Etapa selecionada</h3>
      {no.destino === 'SETOR' && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="no-setor">Setor da etapa selecionada</Label>
          <NativeSelect id="no-setor" className="w-full" value={no.setorId} onChange={(e) => alterar({ setorId: e.target.value })}>
            <Opcoes vazio="Escolha o setor" itens={setores.filter((s) => s.ativo)} />
          </NativeSelect>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor="no-prazo">Prazo da etapa selecionada (horas)</Label>
        <Input id="no-prazo" type="number" min={1} max={720} inputMode="numeric" placeholder="Opcional" value={no.prazoHoras} onChange={(e) => alterar({ prazoHoras: e.target.value })} />
      </div>
      <Button type="button" variant="outline" className="self-start" onClick={tirar}>
        <Trash2 aria-hidden="true" />
        Remover etapa selecionada
      </Button>
    </section>
  )
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
}

function Corpo({ grafo, setores, marcas, editar }: CanvasProps) {
  const { screenToFlowPosition } = useReactFlow()
  const desenhados = useMemo(() => desenhar(grafo, setores, marcas), [grafo, setores, marcas])
  const arestas = useMemo(() => ligacoesComoArestas(grafo, setores), [grafo, setores])
  const ref = useRef<Node[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [removendo, setRemovendo] = useState<string>()
  const atual = grafo.nos.find((n) => n.id === nodes.find((n) => n.selected && n.id !== Inicio)?.id)

  // O rascunho manda no conteúdo; o que a biblioteca mediu e o que está selecionado ficam como estavam.
  useEffect(() => {
    ref.current = desenhados.map((d) => ({ ...d, measured: ref.current.find((a) => a.id === d.id)?.measured, selected: ref.current.find((a) => a.id === d.id)?.selected }))
    setNodes(ref.current)
  }, [desenhados])

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
  const adicionar = (destino: Destino) =>
    editar((g) => {
      const p = posicaoPadrao(ordenados(g).length)
      return acrescentar(g, novoNo(destino, p.x, p.y), true)
    })

  function aoLargar(e: DragEvent) {
    e.preventDefault()
    const destino = Destinos.find(([d]) => d === e.dataTransfer.getData(TipoArrastado))?.[0]
    if (!destino) return
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    editar((g) => acrescentar(g, novoNo(destino, Math.round(p.x), Math.round(p.y)), false))
  }

  const tirar = (id: string) => editar((g) => remover(g, id, false))
  const pedirRemocao = (n: No) => (n.setorId !== '' || n.prazoHoras !== '' ? setRemovendo(n.id) : tirar(n.id))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <Paleta adicionar={adicionar} />
        <div className="relative h-[28rem] min-h-[360px] min-w-0 flex-1 rounded-md border" style={Tokens}>
          <ReactFlow
            nodes={nodes}
            edges={arestas}
            nodeTypes={TiposDeNo}
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
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          >
            <Controls showInteractive={false} />
          </ReactFlow>
          {grafo.nos.length === 0 && <p className="pointer-events-none absolute inset-x-0 bottom-6 m-0 text-center text-sm text-muted-foreground">Arraste um destino para começar.</p>}
        </div>
      </div>
      {atual && <PainelDoNo no={atual} setores={setores} mudar={(p) => editar((g) => mudar(g, atual.id, p))} remover={() => pedirRemocao(atual)} />}
      <ConfirmarRemocao aberto={!!removendo} cancelar={() => setRemovendo(undefined)} confirmar={() => { tirar(removendo!); setRemovendo(undefined) }} />
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
