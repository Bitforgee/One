import { Paperclip, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

export const LimiteDeAnexos = 3
export const AjudaDosAnexos = 'PDF ou foto, até 10 MB'

// Os arquivos escolhidos e a conta dos que a conversa já recebeu: juntos, no máximo 3.
export function useAnexos() {
  const [escolhidos, setEscolhidos] = useState<File[]>([])
  const [enviados, setEnviados] = useState(0)
  const [foco, setFoco] = useState(false) // o clipe com foco mostra a ajuda
  return {
    foco,
    setFoco,
    escolhidos,
    enviados,
    escolher: (novos: File[]) => setEscolhidos((atuais) => [...atuais, ...novos].slice(0, LimiteDeAnexos - enviados)),
    remover: (i: number) => setEscolhidos((atuais) => atuais.filter((_, j) => j !== i)),
    // a mensagem foi: os escolhidos passam a contar como enviados
    enviou: () => {
      setEnviados((n) => n + escolhidos.length)
      setEscolhidos([])
    },
  }
}
export type Anexos = ReturnType<typeof useAnexos>

export function BotaoAnexar({ anexos }: { anexos: Anexos }) {
  const campo = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="shrink-0"
        aria-label="Anexar arquivo"
        disabled={anexos.enviados + anexos.escolhidos.length >= LimiteDeAnexos}
        onFocus={() => anexos.setFoco(true)}
        onBlur={() => anexos.setFoco(false)}
        onClick={() => campo.current?.click()}
      >
        <Paperclip aria-hidden="true" />
      </Button>
      <input
        ref={campo}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          anexos.escolher([...(e.target.files ?? [])])
          e.target.value = '' // o mesmo arquivo pode ser escolhido de novo depois de removido
        }}
      />
    </>
  )
}

export function Selos({ anexos }: { anexos: Anexos }) {
  return (
    anexos.escolhidos.length > 0 && (
      <ul aria-label="Arquivos escolhidos" className="m-0 flex list-none flex-wrap gap-1.5 px-2 pt-1">
        {anexos.escolhidos.map((a, i) => (
          <li key={i}>
            <Badge variant="secondary" className="max-w-full gap-0.5 pe-0.5">
              <span className="truncate">{a.name}</span>
              <Button type="button" size="icon-xs" variant="ghost" className="size-4" aria-label={`Remover ${a.name}`} onClick={() => anexos.remover(i)}>
                <X aria-hidden="true" />
              </Button>
            </Badge>
          </li>
        ))}
      </ul>
    )
  )
}
