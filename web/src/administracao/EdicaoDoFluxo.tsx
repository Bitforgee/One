import { useMutation } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BotaoAcao, useGravacao } from '../acao'
import { api } from '../api'
import { Editor } from '../Editor'
import { ErroDe } from '../ErroDe'
import { Marca } from '../Marca'
import { Opcoes } from '../Opcoes'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { NativeSelect } from '../ui/native-select'
import { abrangenciaDoFluxo, Destinos, SemestresDe1a12, type Categoria, type Curso, type Destino, type Etapa, type Fluxo, type Setor } from './comum'

const MaximoDeEtapas = 5

// A etapa como o formulário a guarda: texto nos campos de número e no setor; a posição só viaja, para o canvas.
type EtapaEdicao = { destino: Destino; setorId: string; prazoHoras: string; x: number | null; y: number | null }

const daApi = (e: Etapa): EtapaEdicao => ({ destino: e.destino, setorId: e.setorId === null ? '' : String(e.setorId), prazoHoras: e.prazoHoras === null ? '' : String(e.prazoHoras), x: e.x, y: e.y })
const paraApi = (e: EtapaEdicao) => ({
  destino: e.destino,
  setorId: e.destino === 'SETOR' && e.setorId !== '' ? Number(e.setorId) : null,
  prazoHoras: e.prazoHoras === '' ? null : Number(e.prazoHoras),
  x: e.x,
  y: e.y,
})
const NovaEtapa: EtapaEdicao = { destino: 'SETOR', setorId: '', prazoHoras: '', x: null, y: null }

type Linha = { n: number; total: number; etapa: EtapaEdicao; setores: Setor[]; mudar: (parcial: Partial<EtapaEdicao>) => void; mover: (delta: number) => void; remover: () => void }

// Uma etapa da lista: destino, setor (só na etapa de setor), prazo e os botões de mover e remover, todos nomeados pelo número da etapa.
function LinhaDaEtapa({ n, total, etapa, setores, mudar, mover, remover }: Linha) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Etapa {n}</legend>
      <NativeSelect aria-label={`Destino da etapa ${n}`} className="w-full" value={etapa.destino} onChange={(e) => mudar({ destino: e.target.value as Destino })}>
        {Destinos.map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </NativeSelect>
      {etapa.destino === 'SETOR' && (
        <NativeSelect aria-label={`Setor da etapa ${n}`} className="w-full" value={etapa.setorId} onChange={(e) => mudar({ setorId: e.target.value })}>
          <Opcoes vazio="Escolha o setor" itens={setores.filter((s) => s.ativo)} />
        </NativeSelect>
      )}
      <Input type="number" min={1} max={720} inputMode="numeric" placeholder="Prazo em horas (opcional)" aria-label={`Prazo da etapa ${n} (horas)`} value={etapa.prazoHoras} onChange={(e) => mudar({ prazoHoras: e.target.value })} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="icon" aria-label={`Mover etapa ${n} para cima`} disabled={n === 1} onClick={() => mover(-1)}>
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label={`Mover etapa ${n} para baixo`} disabled={n === total} onClick={() => mover(1)}>
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label={`Remover etapa ${n}`} onClick={remover}>
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </fieldset>
  )
}

type Simulacao = {
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

type PropsDoSimulador = { fluxo: Fluxo; cursos: Curso[]; versao: 'RASCUNHO' | 'VIGENTE' | null }

// Simula o caminho de um aluno com o curso, o semestre e o aceite escolhidos, sem gravar nada.
function Simulador({ fluxo, cursos, versao }: PropsDoSimulador) {
  const [cursoId, setCursoId] = useState('')
  const [semestre, setSemestre] = useState('')
  const [aceita, setAceita] = useState(false)
  const simular = useMutation({
    mutationFn: () => api<Simulacao>(`/api/admin/fluxos/${fluxo.id}/simular`, { versao, cursoId: Number(cursoId), semestre: Number(semestre), aceitaLideranca: aceita }),
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
      {simular.data && <ResultadoDaSimulacao resultado={simular.data} />}
    </section>
  )
}

type Props = { fluxo: Fluxo; categorias: Categoria[]; cursos: Curso[]; setores: Setor[]; fechar: () => void; recarregar: () => Promise<unknown> }

// A janela de edição do fluxo: a lista de etapas do rascunho, o simulador, e as ações Salvar rascunho, Publicar e Descartar.
// Publicar só liga depois que a API aceitou o rascunho como está na tela (a validação é a da API).
export function EdicaoDoFluxo({ fluxo, categorias, cursos, setores, fechar, recarregar }: Props) {
  const [etapas, setEtapas] = useState<EtapaEdicao[]>(() => (fluxo.rascunho ?? fluxo.vigente)?.etapas.map(daApi) ?? [])
  const [salvo, setSalvo] = useState(!!fluxo.rascunho)
  const [alterado, setAlterado] = useState(false)
  const acao = useGravacao(recarregar)
  const caminho = `/api/admin/fluxos/${fluxo.id}`

  function alterar(f: (lista: EtapaEdicao[]) => EtapaEdicao[]) {
    setEtapas(f)
    setSalvo(false)
    setAlterado(true)
  }
  const mudar = (i: number, parcial: Partial<EtapaEdicao>) => alterar((l) => l.map((e, j) => (j === i ? { ...e, ...parcial } : e)))
  const mover = (i: number, delta: number) =>
    alterar((l) => {
      const nova = [...l]
      ;[nova[i], nova[i + delta]] = [nova[i + delta], nova[i]]
      return nova
    })

  const salvar = () =>
    acao.mutate({ chamar: () => api(`${caminho}/rascunho`, { etapas: etapas.map(paraApi) }, 'PUT'), aviso: 'Rascunho salvo.', depois: () => { setSalvo(true); setAlterado(false) } })
  const publicar = () => acao.mutate({ chamar: () => api(`${caminho}/publicar`, {}), aviso: 'Fluxo publicado.', depois: fechar })
  const descartar = () => acao.mutate({ chamar: () => api(`${caminho}/rascunho`, undefined, 'DELETE'), aviso: 'Rascunho descartado.', depois: fechar })
  const versao = salvo ? 'RASCUNHO' : !alterado && fluxo.vigente ? 'VIGENTE' : null

  return (
    <Editor titulo="Editar: Fluxos" aberto fechar={fechar} salvar={salvar} pendente={acao.isPending} botao="Salvar rascunho" alerta={<ErroDe erro={acao.error} />}>
      <p className="m-0 text-sm text-muted-foreground">
        {categorias.find((c) => c.id === fluxo.categoriaId)?.nome} · {abrangenciaDoFluxo(fluxo, cursos)}
      </p>
      {etapas.length === 0 && <p className="m-0 text-sm text-muted-foreground">Sem etapas ainda.</p>}
      {etapas.map((etapa, i) => (
        <LinhaDaEtapa key={i} n={i + 1} total={etapas.length} etapa={etapa} setores={setores} mudar={(p) => mudar(i, p)} mover={(d) => mover(i, d)} remover={() => alterar((l) => l.filter((_, j) => j !== i))} />
      ))}
      <Button type="button" variant="outline" className="self-start" disabled={etapas.length >= MaximoDeEtapas} onClick={() => alterar((l) => [...l, NovaEtapa])}>
        <Plus aria-hidden="true" />
        Adicionar etapa
      </Button>
      <Simulador fluxo={fluxo} cursos={cursos} versao={versao} />
      <div className="flex flex-wrap gap-2">
        <BotaoAcao type="button" pendente={false} disabled={!salvo || acao.isPending} onClick={publicar}>
          Publicar
        </BotaoAcao>
        <BotaoAcao type="button" variant="ghost" pendente={false} className="text-destructive hover:text-destructive" disabled={!fluxo.rascunho || acao.isPending} onClick={descartar}>
          Descartar rascunho
        </BotaoAcao>
      </div>
    </Editor>
  )
}
