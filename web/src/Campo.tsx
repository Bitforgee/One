import type { ComponentProps } from 'react'
import { Input } from './ui/input'
import { Label } from './ui/label'

// Campo de texto com o rótulo em cima.
export function Campo({ id, rotulo, ...props }: { id: string; rotulo: string } & ComponentProps<'input'>) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} {...props} />
    </div>
  )
}
