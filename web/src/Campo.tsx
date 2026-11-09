import type { ComponentProps } from 'react'
import { Input } from './ui/input'
import { Label } from './ui/label'

export function Campo({ id, rotulo, erro, ...props }: { id: string; rotulo: string; erro?: string } & ComponentProps<'input'>) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} aria-invalid={!!erro} aria-describedby={erro ? `${id}-erro` : undefined} {...props} />
      <ErroDoCampo id={id} erro={erro} />
    </div>
  )
}

export function ErroDoCampo({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null
  return (
    <p id={`${id}-erro`} className="m-0 text-sm text-destructive">
      {erro}
    </p>
  )
}
