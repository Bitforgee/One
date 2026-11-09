import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { PopoverTrigger } from '../ui/popover'
import { MenuDeAdicionar } from './AdicionarEtapa'
import type { Destino } from './comum'

export type DadosDaLigacao = { entre: string; cheia: boolean; inserir: (destino: Destino) => void }

export function LigacaoComMais({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }: EdgeProps<Edge<DadosDaLigacao>>) {
  const [caminho, x, y] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  return (
    <>
      <BaseEdge id={id} path={caminho} markerEnd={markerEnd} />
      {data && !data.cheia && (
        <EdgeLabelRenderer>
          <div className="nodrag nopan absolute" style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}>
            <MenuDeAdicionar adicionar={data.inserir} pergunta="Inserir qual etapa aqui?">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`Inserir etapa ${data.entre}`}
                  className="flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground opacity-70 shadow-xs transition hover:border-primary hover:text-primary hover:opacity-100 focus-visible:opacity-100"
                >
                  <Plus aria-hidden="true" className="size-3.5" />
                </button>
              </PopoverTrigger>
            </MenuDeAdicionar>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const TiposDeLigacao = { ligacao: LigacaoComMais }
