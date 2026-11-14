import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { BotaoAcao } from '../../acao'
import { api } from '../../api'
import { ErroDe } from '../../ErroDe'
import { Opcoes } from '../../Opcoes'
import { NativeSelect } from '../../ui/native-select'
import { Destinos, SemestresDe1a12, type Curso, type Destino, type Fluxo } from '../comum'

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

type Props = { fluxo: Fluxo; cursos: Curso[]; versao: 'RASCUNHO' | 'VIGENTE' | null; aoSimular: (r: Simulacao) => void }

export function useSimulador({ fluxo, versao, aoSimular }: Pick<Props, 'fluxo' | 'versao' | 'aoSimular'>) {
  const [cursoId, setCursoId] = useState('')
  const [semestre, setSemestre] = useState('')
  const [faltou, setFaltou] = useState(false)
  const simular = useMutation({
    mutationFn: () => api<Simulacao>(`/api/admin/fluxos/${fluxo.id}/simular`, { versao, cursoId: Number(cursoId), semestre: Number(semestre) }),
    onSuccess: aoSimular,
  })
  const escolhido = !!cursoId && !!semestre
  const pedir = () => (escolhido ? simular.mutate() : setFaltou(true))
  return { cursoId, setCursoId, semestre, setSemestre, simular, pedir, versao, dica: faltou && !escolhido }
}

export type EstadoDoSimulador = ReturnType<typeof useSimulador>

export function BotaoSimular({ s }: { s: EstadoDoSimulador }) {
  return (
    <BotaoAcao type="button" variant="outline" pendente={s.simular.isPending} disabled={!s.versao} onClick={s.pedir}>
      Simular
    </BotaoAcao>
  )
}

export function Simulador({ s, cursos, resultado }: { s: EstadoDoSimulador; cursos: Curso[]; resultado?: Simulacao }) {
  return (
    <section className="flex flex-col gap-2" aria-label="Simulação">
      <h3 className="m-0 text-base font-semibold">Simular um aluno</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      <NativeSelect aria-label="Curso do aluno" className="w-full" value={s.cursoId} onChange={(e) => s.setCursoId(e.target.value)}>
        <Opcoes vazio="Escolha o curso" itens={cursos} />
      </NativeSelect>
      <NativeSelect aria-label="Semestre do aluno" className="w-full" value={s.semestre} onChange={(e) => s.setSemestre(e.target.value)}>
        <option value="">Escolha o semestre</option>
        {SemestresDe1a12.map((n) => (
          <option key={n} value={n}>
            {n}º semestre
          </option>
        ))}
      </NativeSelect>
      </div>
      <ErroDe erro={s.simular.error} />
      <div aria-live="polite">
        {s.dica && <p className="m-0 text-sm text-muted-foreground">Escolha o curso e o semestre.</p>}
        {resultado && <ResultadoDaSimulacao resultado={resultado} />}
      </div>
    </section>
  )
}