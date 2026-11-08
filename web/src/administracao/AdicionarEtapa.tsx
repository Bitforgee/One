import { ViewportPortal } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Destinos, type Destino } from './comum'
import { Icones } from './IconesDoDestino'

export const TipoArrastado = 'application/x-fluxo-destino'

const Descricoes: Record<Destino, string> = {
  SETOR: 'Um setor que você escolhe',
  COORDENACAO_CURSO: 'A coordenação do curso do aluno',
  LIDERANCA_SEMESTRE: 'Estudantes da turma, só como 1ª etapa',
}

// A barra acima do canvas com os três tipos de destino: arrastar solta um nó onde cair; o clique põe a etapa no fim da cadeia, para quem não arrasta.
export function Paleta({ adicionar, cheia }: { adicionar: (destino: Destino) => void; cheia: boolean }) {
  return (
    <div role="group" aria-label="Destinos" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {Destinos.map(([destino, rotulo]) => {
          const Icone = Icones[destino]
          return (
            <Button
              key={destino}
              type="button"
              variant="outline"
              className="min-h-11 cursor-grab"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TipoArrastado, destino)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onClick={() => adicionar(destino)}
            >
              <Icone aria-hidden="true" className="text-primary" />
              {rotulo}
            </Button>
          )
        })}
      </div>
      <p className="m-0 text-xs text-muted-foreground">{cheia ? 'A cadeia aceita até 5 etapas; com mais, o fluxo não pode ser publicado.' : 'Arraste para o canvas ou clique para pôr no fim da cadeia.'}</p>
    </div>
  )
}

type PropsDoBotao = { x: number; y: number; vazio: boolean; adicionar: (destino: Destino) => void }

// O "+" no fim da cadeia, no lugar da próxima etapa: abre a lista dos destinos. Fica no espaço do desenho, então acompanha o zoom e o arrasto.
export function BotaoDeAdicionar({ x, y, vazio, adicionar }: PropsDoBotao) {
  const [aberto, setAberto] = useState(false)
  const escolher = (destino: Destino) => {
    setAberto(false)
    adicionar(destino)
  }
  return (
    <ViewportPortal>
      <div className="absolute flex items-center" style={{ transform: `translate(${x}px, ${y}px)`, pointerEvents: 'all' }}>
        <span aria-hidden="true" className={`absolute right-full h-0 border-t-2 border-dashed border-border ${vazio ? 'w-20' : 'w-12'}`} />
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Adicionar etapa"
              className={`nodrag nopan flex items-center justify-center gap-2 border-2 border-dashed border-border bg-card text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary ${vazio ? 'h-16 w-48 rounded-xl' : 'size-11 rounded-lg'}`}
            >
              <Plus aria-hidden="true" className="size-5" />
              {vazio && 'Adicionar a primeira etapa'}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="flex w-64 flex-col gap-1 p-2">
            <p className="m-0 px-2 pt-1 pb-1 text-xs text-muted-foreground">Para onde o chamado vai depois?</p>
            {Destinos.map(([destino, rotulo]) => {
              const Icone = Icones[destino]
              return (
                <button key={destino} type="button" className="flex min-h-11 items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:bg-accent" onClick={() => escolher(destino)}>
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
        </Popover>
      </div>
    </ViewportPortal>
  )
}
