import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { BotaoAcao } from '../acao'
import { api } from '../api'
import { ErroDe } from '../ErroDe'
import { Marca } from '../Marca'
import { Opcoes } from '../Opcoes'
import { NativeSelect } from '../ui/native-select'
import { Destinos, SemestresDe1a12, type Curso, type Destino, type Fluxo } from './comum'

export type Simulacao = {
  etapas: { ordem: number; destino: Destino; setor: string | null; situacao: string; motivo: string | null }[]
  inicial: string
  escolhido: { id: number; cursoId: number | null; semestre: number | null } | null
}

function ResultadoDaSimulacao({ resultado }: { resultado: Simulacao }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <ol className="m-0 ps-5">
        {resultado.etapas.map((e) => (
          <li key={e.ordem}>
            {Destinos.find(([d]) => d === e.destino)![1]}: {e.setor ?? `Pulada: ${e.motivo}`}
          </li>
        ))}
      </ol>
      <p className="m-0">O chamado abre em {resultado.inicial}.</p>
      {!resultado.escolhido && <p className="m-0 text-muted-foreground">Nenhum fluxo publicado vale para este aluno.</p>}
    </div>
  )
}

type Props = { fluxo: Fluxo; cursos: Curso[]; versao: 'RASCUNHO' | 'VIGENTE' | null; resultado?: Simulacao; aoSimular: (r: Simulacao) => void }

// Simula o caminho de um aluno com o curso, o semestre e o aceite escolhidos, sem gravar nada. O resultado fica com quem edita, para o canvas marcar os nós (AC 81).
export function Simulador({ fluxo, cursos, versao, resultado, aoSimular }: Props) {
  const [cursoId, setCursoId] = useState('')
  const [semestre, setSemestre] = useState('')
  const [aceita, setAceita] = useState(false)
  const simular = useMutation({
    mutationFn: () => api<Simulacao>(`/api/admin/fluxos/${fluxo.id}/simular`, { versao, cursoId: Number(cursoId), semestre: Number(semestre), aceitaLideranca: aceita }),
    onSuccess: aoSimular,
  })
  return (
    <section className="flex flex-col gap-2" aria-label="Simulação">
      <h3 className="m-0 text-base font-semibold">Simular um aluno</h3>
      <NativeSelect aria-label="Curso do aluno" className="w-full" value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
        <Opcoes vazio="Escolha o curso" itens={cursos} />
      </NativeSelect>
      <NativeSelect aria-label="Semestre do aluno" className="w-full" value={semestre} onChange={(e) => setSemestre(e.target.value)}>
        <option value="">Escolha o semestre</option>
        {SemestresDe1a12.map((n) => (
          <option key={n} value={n}>
            {n}º semestre
          </option>
        ))}
      </NativeSelect>
      <Marca id="simula-aceite" rotulo="O aluno aceita a liderança do semestre" marcado={aceita} mudar={setAceita} />
      <BotaoAcao type="button" variant="outline" className="self-start" pendente={simular.isPending} disabled={!versao || !cursoId || !semestre} onClick={() => simular.mutate()}>
        Simular
      </BotaoAcao>
      <ErroDe erro={simular.error} />
      {resultado && <ResultadoDaSimulacao resultado={resultado} />}
    </section>
  )
}
