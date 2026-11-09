import { Label } from './ui/label'

export function Marca({ id, rotulo, marcado, mudar }: { id: string; rotulo: string; marcado: boolean; mudar: (v: boolean) => void }) {
  return (
    <Label htmlFor={id} className="min-h-11 cursor-pointer gap-3">
      <input type="checkbox" id={id} className="size-5 accent-primary" checked={marcado} onChange={(e) => mudar(e.target.checked)} />
      {rotulo}
    </Label>
  )
}
