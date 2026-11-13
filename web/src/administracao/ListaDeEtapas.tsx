import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Opcoes } from '../Opcoes'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { NativeSelect } from '../ui/native-select'
import { Destinos, type Destino, type Setor } from './comum'
import { acrescentar, caminho, MaximoDeEtapas, mover, mudar, novoNo, ordenados, remover, type Grafo, type No } from './grafo'

type Linha = {
  n: number
  no: No
  setores: Setor[]
  pode: { subir: boolean; descer: boolean }
  foraDaCadeia: boolean
  editar: (f: (g: Grafo) => Grafo) => void
}

function LinhaDaEtapa({ n, no, setores, pode, foraDaCadeia, editar }: Linha) {
  const alterar = (parcial: Partial<No>) => editar((g) => mudar(g, no.id, parcial))
  return (
    <fieldset className="flex flex-col gap-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Etapa {n}</legend>
      {foraDaCadeia && <p className="m-0 text-xs text-destructive">Fora da cadeia</p>}
      <NativeSelect aria-label={`Destino da etapa ${n}`} className="w-full" value={no.destino} onChange={(e) => alterar({ destino: e.target.value as Destino })}>
        {Destinos.map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </NativeSelect>
      {no.destino === 'SETOR' && (
        <NativeSelect aria-label={`Setor da etapa ${n}`} className="w-full" value={no.setorId} onChange={(e) => alterar({ setorId: e.target.value })}>
          <Opcoes vazio="Escolha o setor" itens={setores.filter((s) => s.ativo)} />
        </NativeSelect>
      )}
      <Input type="number" name="prazoHoras" autoComplete="off" min={1} max={720} inputMode="numeric" placeholder="Ex.: 48 (opcional)…" aria-label={`Prazo da etapa ${n} (horas)`} value={no.prazoHoras} onChange={(e) => alterar({ prazoHoras: e.target.value })} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="icon" aria-label={`Mover etapa ${n} para cima`} disabled={!pode.subir} onClick={() => editar((g) => mover(g, no.id, -1))}>
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label={`Mover etapa ${n} para baixo`} disabled={!pode.descer} onClick={() => editar((g) => mover(g, no.id, 1))}>
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label={`Remover etapa ${n}`} onClick={() => editar((g) => remover(g, no.id, true))}>
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </fieldset>
  )
}

type Props = { grafo: Grafo; setores: Setor[]; editar: (f: (g: Grafo) => Grafo) => void }

export function ListaDeEtapas({ grafo, setores, editar }: Props) {
  const lista = ordenados(grafo)
  const cadeia = caminho(grafo)
  return (
    <>
      {lista.length === 0 && <p className="m-0 text-sm text-muted-foreground">Sem etapas ainda.</p>}
      {lista.map((no, i) => {
        const posicao = cadeia.indexOf(no)
        const pode = { subir: posicao > 0, descer: posicao >= 0 && posicao < cadeia.length - 1 }
        return <LinhaDaEtapa key={no.id} n={i + 1} no={no} setores={setores} pode={pode} foraDaCadeia={posicao < 0} editar={editar} />
      })}
      <Button type="button" variant="outline" className="self-start" disabled={lista.length >= MaximoDeEtapas} onClick={() => editar((g) => acrescentar(g, novoNo(), true))}>
        <Plus aria-hidden="true" />
        Adicionar etapa
      </Button>
    </>
  )
}
