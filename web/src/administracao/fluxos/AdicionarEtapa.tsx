import { Panel, ViewportPortal } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { Destinos, type Destino } from '../comum'
import { Icones } from '../IconesDoDestino'

export const TipoArrastado = 'application/x-fluxo-destino'

const Descricoes: Record<Destino, string> = {
  SETOR: 'Um setor que você escolhe',
  COORDENACAO_CURSO: 'A coordenação do curso do aluno',
  LIDERANCA_SEMESTRE: 'Estudantes da turma, só como 1ª etapa',
}

type Escolher = (destino: Destino) => void

function MenuDeDestinos({ escolher, pergunta }: { escolher: Escolher; pergunta: string }) {
  return (
    <PopoverContent align="start" className="flex w-64 flex-col gap-1 p-2">
      <p className="m-0 px-2 pt-1 pb-1 text-xs text-muted-foreground">{pergunta}</p>
      {Destinos.map(([destino, rotulo]) => {
        const Icone = Icones[destino]
        return (
          <button
            key={destino}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(TipoArrastado, destino)
              e.dataTransfer.effectAllowed = 'move'
            }}
            className="flex min-h-11 cursor-grab items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => escolher(destino)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icone aria-hidden="true" className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-medium">{rotulo}</span>
              <span className="text-xs text-muted-foreground">{Descricoes[destino]}</span>
            </span>
          </button>
        )
      })}
    </PopoverContent>
  )
}

type PropsDoMenu = { adicionar: Escolher; pergunta: string; children: ReactNode }

export function MenuDeAdicionar({ adicionar, pergunta, children }: PropsDoMenu) {
  const [aberto, setAberto] = useState(false)
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      {children}
      <MenuDeDestinos
        pergunta={pergunta}
        escolher={(d) => {
          setAberto(false)
          adicionar(d)
        }}
      />
    </Popover>
  )
}

export function BotaoFlutuante({ adicionar, cheia }: { adicionar: Escolher; cheia: boolean }) {
  return (
    <Panel position="top-left" className="m-3! flex max-w-64 flex-col gap-1.5">
      <MenuDeAdicionar adicionar={adicionar} pergunta="Para onde o chamado vai depois?">
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="min-h-11 self-start bg-card shadow-xs focus-visible:ring-2 focus-visible:ring-ring">
            <Plus aria-hidden="true" />
            Adicionar etapa
          </Button>
        </PopoverTrigger>
      </MenuDeAdicionar>
      {cheia && <p className="m-0 rounded-md bg-card/90 px-2 py-1 text-xs">A cadeia aceita até 5 etapas; com mais, o fluxo não pode ser publicado.</p>}
    </Panel>
  )
}
type PropsDoBotao = { x: number; y: number; vazio: boolean; adicionar: Escolher }

export function BotaoDeAdicionar({ x, y, vazio, adicionar }: PropsDoBotao) {
  return (
    <ViewportPortal>
      <div className="absolute flex items-center" style={{ transform: `translate(${x}px, ${y}px)`, pointerEvents: 'all' }}>
        <span aria-hidden="true" className={`absolute right-full h-0 border-t-2 border-dashed border-border ${vazio ? 'w-20' : 'w-12'}`} />
        <MenuDeAdicionar adicionar={adicionar} pergunta="Para onde o chamado vai depois?">
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Adicionar etapa no fim da cadeia"
              className={`nodrag nopan flex items-center justify-center gap-2 border-2 border-dashed border-border bg-card text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring ${vazio ? 'h-16 w-48 rounded-xl' : 'size-11 rounded-lg'}`}
            >
              <Plus aria-hidden="true" className="size-5" />
              {vazio && 'Adicionar a primeira etapa'}
            </button>
          </PopoverTrigger>
        </MenuDeAdicionar>
      </div>
    </ViewportPortal>
  )
}
