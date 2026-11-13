import { Paperclip } from 'lucide-react'
import { tamanhoDoArquivo } from './formatos'

export function LinkDeAnexo({ href, nome, tamanho }: { href: string; nome: string; tamanho?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm break-all">
      <Paperclip aria-hidden="true" className="size-4 shrink-0" />
      <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
        {nome}
      </a>{' '}
      {tamanho !== undefined && <span className="text-muted-foreground">({tamanhoDoArquivo(tamanho)})</span>}
    </div>
  )
}
