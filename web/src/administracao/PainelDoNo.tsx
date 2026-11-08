import { Trash2, X } from 'lucide-react'
import { Opcoes } from '../Opcoes'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { Destinos, type Setor } from './comum'
import type { No } from './grafo'
import { Icones } from './IconesDoDestino'

type Props = { no: No; setores: Setor[]; mudar: (parcial: Partial<No>) => void; remover: () => void; fechar: () => void }

const Explicacoes = {
  SETOR: 'O chamado entra na fila deste setor.',
  COORDENACAO_CURSO: 'O chamado vai para a coordenação do curso do aluno.',
  LIDERANCA_SEMESTRE: 'O chamado vai para a liderança da turma do aluno. Ela vê o resumo da dúvida, nunca a conversa.',
}

// Os dados da etapa selecionada, ao lado do canvas: o desenho mostra a cadeia, e estes campos completam a etapa sem esconder o desenho.
export function PainelDoNo({ no, setores, mudar, remover, fechar }: Props) {
  const Icone = Icones[no.destino]
  return (
    <section aria-label="Etapa selecionada" className="flex w-full shrink-0 flex-col gap-4 rounded-lg border bg-card p-4 lg:w-72">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icone aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-sm font-semibold">Etapa selecionada</h3>
          <p className="m-0 text-xs text-muted-foreground">{Destinos.find(([d]) => d === no.destino)![1]}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="-mt-1 -mr-2 size-11" aria-label="Fechar etapa selecionada" onClick={fechar}>
          <X aria-hidden="true" />
        </Button>
      </header>
      <p className="m-0 text-sm text-muted-foreground">{Explicacoes[no.destino]}</p>
      {no.destino === 'SETOR' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="no-setor">Setor da etapa selecionada</Label>
          <NativeSelect id="no-setor" className="w-full" value={no.setorId} onChange={(e) => mudar({ setorId: e.target.value })}>
            <Opcoes vazio="Escolha o setor" itens={setores.filter((s) => s.ativo)} />
          </NativeSelect>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="no-prazo">Prazo da etapa selecionada (horas)</Label>
        <Input id="no-prazo" type="number" min={1} max={720} inputMode="numeric" placeholder="Opcional" value={no.prazoHoras} onChange={(e) => mudar({ prazoHoras: e.target.value })} />
        <p className="m-0 text-xs text-muted-foreground">Sem resposta da equipe nesse prazo, o chamado sobe para a próxima etapa. A última etapa não tem prazo.</p>
      </div>
      <Button type="button" variant="outline" className="self-start text-destructive hover:text-destructive" onClick={remover}>
        <Trash2 aria-hidden="true" />
        Remover etapa selecionada
      </Button>
    </section>
  )
}
