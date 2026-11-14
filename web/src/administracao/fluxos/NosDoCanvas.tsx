import { Handle, NodeToolbar, Position, useStore, type HandleProps, type Node, type NodeProps } from '@xyflow/react'
import { Check, Clock, Flag, SkipForward, Trash2, TriangleAlert } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Button } from '../../ui/button'
import type { Destino } from '../comum'
import { Icones } from './IconesDoDestino'

const Cartao = 'relative flex h-16 items-center gap-3 border bg-card text-card-foreground shadow-xs transition-colors'
const Bloco = 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'
const Bolinha = 'size-3! border-2! border-card! bg-primary! pointer-coarse:size-(--alvo)! pointer-coarse:border-0! pointer-coarse:bg-transparent! pointer-coarse:after:absolute pointer-coarse:after:inset-[36%] pointer-coarse:after:rounded-full pointer-coarse:after:border-2 pointer-coarse:after:border-card pointer-coarse:after:bg-primary'

const AlvoEmTela = 44

function Alca(props: Omit<HandleProps, 'className'>) {
  const zoom = useStore((s) => s.transform[2])
  return <Handle {...props} className={Bolinha} style={{ '--alvo': `${AlvoEmTela / zoom}px` } as CSSProperties} />
}

export type DadosDaEtapa = { titulo: string; prazo: number | null; destino: Destino; posicao: number; marca?: string; invalido: boolean; remover: () => void }

export function NoInicio() {
  return (
    <div className={`${Cartao} w-40 rounded-l-4xl rounded-r-xl pr-3 pl-4`}>
      <span className={Bloco}>
        <Flag aria-hidden="true" className="size-5" />
      </span>
      <span className="text-sm font-medium">Início</span>
      <Alca type="source" position={Position.Right} />
    </div>
  )
}

function Aviso({ invalido, marca }: { invalido: boolean; marca?: string }) {
  if (invalido)
    return (
      <span className="absolute top-full left-0 mt-1.5 flex items-center gap-1 text-xs text-destructive">
        <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
        Fora da cadeia
      </span>
    )
  if (!marca) return null
  const passa = marca === 'Vai por aqui'
  const Icone = passa ? Check : SkipForward
  return (
    <span className={`absolute top-full left-0 mt-1.5 flex max-w-48 items-start gap-1 text-xs ${passa ? 'text-primary' : 'text-muted-foreground'}`}>
      <Icone aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      {marca}
    </span>
  )
}

function bordaDoCartao(invalido: boolean, marca: string | undefined, selecionada: boolean | undefined) {
  if (invalido) return 'border-dashed border-destructive'
  if (selecionada) return 'border-primary ring-3 ring-primary/25'
  if (marca === 'Vai por aqui') return 'border-primary/60 bg-primary/5'
  return marca ? 'border-dashed opacity-70' : 'hover:border-primary/50'
}

function BarraDaEtapa({ visivel, remover }: { visivel: boolean; remover: () => void }) {
  return (
    <NodeToolbar isVisible={visivel} offset={8}>
      <Button type="button" variant="outline" size="sm" className="nodrag nopan bg-card text-destructive hover:text-destructive" onClick={remover}>
        <Trash2 aria-hidden="true" />
        Remover
      </Button>
    </NodeToolbar>
  )
}

export function NoEtapa({ data, selected }: NodeProps<Node<DadosDaEtapa>>) {
  const Icone = Icones[data.destino]
  const [sobre, setSobre] = useState(false)
  return (
    <div className={`${Cartao} w-48 rounded-xl px-3 ${bordaDoCartao(data.invalido, data.marca, selected)}`} onMouseEnter={() => setSobre(true)} onMouseLeave={() => setSobre(false)}>
      <BarraDaEtapa visivel={sobre || !!selected} remover={data.remover} />
      <Alca type="target" position={Position.Left} />
      <span className={Bloco}>
        <Icone aria-hidden="true" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 text-sm leading-tight font-medium break-words">{data.titulo}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {data.posicao}ª etapa
          {data.prazo && (
            <span className="flex items-center gap-0.5 rounded-sm bg-muted px-1 text-foreground">
              <Clock aria-hidden="true" className="size-3" />
              {data.prazo} h
            </span>
          )}
        </span>
      </span>
      <Aviso invalido={data.invalido} marca={data.marca} />
      <Alca type="source" position={Position.Right} />
    </div>
  )
}
export const TiposDeNo = { inicio: NoInicio, etapa: NoEtapa }
