import { Paperclip } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Label } from './ui/label'

// Área do Dropzone em volta do campo de arquivo nativo, que continua achado pelo rótulo (door 11).
export function CampoArquivo({ id, rotulo, accept, multiple, arquivos, setArquivos }: {
  id: string; rotulo: string; accept: string; multiple?: boolean; arquivos: File[]; setArquivos: (a: File[]) => void
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: (aceitos) => setArquivos(aceitos), noClick: true, multiple })
  return (
    <div {...getRootProps({ className: `flex flex-col gap-2 rounded-sm border border-dashed border-input px-3 py-2 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring ${isDragActive ? 'bg-accent' : ''}` })}>
      <Label htmlFor={id} className="cursor-pointer">
        <Paperclip aria-hidden="true" className="size-4" />
        {rotulo}
      </Label>
      <input {...getInputProps({ id, 'aria-label': undefined, style: undefined, className: 'sr-only', accept })} />
      {arquivos.map((a, i) => (
        <div key={i} className="text-sm break-all">
          {a.name}
        </div>
      ))}
    </div>
  )
}
