import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
import { Button } from './ui/button'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

export const dia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// O calendário só escreve os dois campos de data; nada é consultado nem gravado ao escolher (door 15). Cada abertura
// começa uma escolha nova: o primeiro dia escolhido é o primeiro campo e o segundo, o último.
export function Periodo({ rotulo, className, setDe, setAte }: { rotulo: string; className?: string; setDe: (d: string) => void; setAte: (d: string) => void }) {
  const [faixa, setFaixa] = useState<DateRange>()
  function escolher(r?: DateRange) {
    setFaixa(r)
    if (r?.from) setDe(dia(r.from))
    if (r?.to) setAte(dia(r.to))
  }
  return (
    <Popover onOpenChange={() => setFaixa(undefined)}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className}>
          <CalendarDays aria-hidden="true" />
          {rotulo}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" locale={ptBR} selected={faixa} onSelect={escolher} />
      </PopoverContent>
    </Popover>
  )
}
