import { useRef } from 'react'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'

// Uma imagem da aparência: a miniatura (a escolhida e ainda não salva, ou a salva), "Enviar imagem" e "Remover" (AC 21, AC 24).
export function CampoImagem({ rotulo, dica, miniatura, escolher, remover, erro }: {
  rotulo: string
  dica: string
  miniatura?: string
  escolher: (arquivo: File) => void
  remover: () => void
  erro?: string
}) {
  const entrada = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm font-medium">{rotulo}</p>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {miniatura && <img src={miniatura} alt={`Miniatura: ${rotulo}`} className="size-full object-contain" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" aria-label={`Enviar imagem: ${rotulo}`} onClick={() => entrada.current?.click()}>
            Enviar imagem
          </Button>
          {miniatura && (
            <Button type="button" variant="outline" aria-label={`Remover imagem: ${rotulo}`} onClick={remover}>
              Remover
            </Button>
          )}
        </div>
        <input
          ref={entrada}
          type="file"
          accept="image/png,image/jpeg"
          aria-label={`Arquivo: ${rotulo}`}
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => {
            const arquivo = e.target.files?.[0]
            if (arquivo) escolher(arquivo)
            e.target.value = ''
          }}
        />
      </div>
      <p className="m-0 text-xs text-muted-foreground">{dica}</p>
      {erro && <Alert variant="destructive">{erro}</Alert>}
    </div>
  )
}
