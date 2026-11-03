import { Label } from './ui/label'

// Caixa de marcação nativa com o rótulo ao lado, de 44 px de altura para o dedo.
export function Marca({ id, rotulo, marcado, mudar }: { id: string; rotulo: string; marcado: boolean; mudar: (v: boolean) => void }) {
  return (
    <div className="flex min-h-11 items-center gap-2">
      <input type="checkbox" id={id} className="size-4 accent-primary" checked={marcado} onChange={(e) => mudar(e.target.checked)} />
      <Label htmlFor={id}>{rotulo}</Label>
    </div>
  )
}
