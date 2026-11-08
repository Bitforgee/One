import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Check, Flag, SkipForward, TriangleAlert } from 'lucide-react'
import type { Destino } from './comum'
import { Icones } from './IconesDoDestino'

// Os cartões do canvas seguem o desenho dos editores de fluxo: um bloco de ícone à esquerda, o nome e a posição ao lado,
// e uma bolinha de entrada e outra de saída. Cores e raios vêm dos tokens, nunca de valores soltos.
const Cartao = 'relative flex h-16 items-center gap-3 border bg-card text-card-foreground shadow-xs transition-colors'
const Bloco = 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'
const Bolinha = 'size-3! border-2! border-card! bg-primary!'

export type DadosDaEtapa = { rotulo: string; destino: Destino; posicao: number; marca?: string; invalido: boolean }

// O Início tem só saída e a ponta esquerda arredondada, como o gatilho de uma automação.
export function NoInicio() {
  return (
    <div className={`${Cartao} w-40 rounded-l-4xl rounded-r-xl pr-3 pl-4`}>
      <span className={Bloco}>
        <Flag aria-hidden="true" className="size-5" />
      </span>
      <span className="text-sm font-medium">Início</span>
      <Handle type="source" position={Position.Right} className={Bolinha} />
    </div>
  )
}

// Embaixo do cartão, sem mudar o tamanho dele: o que a simulação disse, ou o que impede a publicação.
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

export function NoEtapa({ data, selected }: NodeProps<Node<DadosDaEtapa>>) {
  const Icone = Icones[data.destino]
  return (
    <div className={`${Cartao} w-48 rounded-xl px-3 ${bordaDoCartao(data.invalido, data.marca, selected)}`}>
      <Handle type="target" position={Position.Left} className={Bolinha} />
      <span className={Bloco}>
        <Icone aria-hidden="true" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 text-sm leading-tight font-medium break-words">{data.rotulo}</span>
        <span className="text-xs text-muted-foreground">{data.posicao}ª etapa</span>
      </span>
      <Aviso invalido={data.invalido} marca={data.marca} />
      <Handle type="source" position={Position.Right} className={Bolinha} />
    </div>
  )
}

export const TiposDeNo = { inicio: NoInicio, etapa: NoEtapa }
