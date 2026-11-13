import { useEffect, type ComponentProps } from 'react'
import { Input } from './ui/input'
import { Label } from './ui/label'

export const descricaoDoCampo = (id: string, dica?: string, erro?: string) => [dica && `${id}-dica`, erro && `${id}-erro`].filter(Boolean).join(' ') || undefined

export function useFocoNoPrimeiroErro(erro: unknown, escopo = '[role="dialog"]') {
  useEffect(() => {
    if (erro) document.querySelector<HTMLElement>(`${escopo} [aria-invalid="true"]`)?.focus()
  }, [erro, escopo])
}

export function Campo({ id, rotulo, erro, dica, ...props }: { id: string; rotulo: string; erro?: string; dica?: string } & ComponentProps<'input'>) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} name={id} aria-invalid={!!erro} aria-describedby={descricaoDoCampo(id, dica, erro)} {...props} />
      {dica && (
        <p id={`${id}-dica`} className="m-0 text-sm text-muted-foreground">
          {dica}
        </p>
      )}
      <ErroDoCampo id={id} erro={erro} />
    </div>
  )
}

export function ErroDoCampo({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null
  return (
    <p id={`${id}-erro`} role="alert" className="m-0 text-sm text-destructive">
      {erro}
    </p>
  )
}
