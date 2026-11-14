import { ChevronRight } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { Badge } from '../../ui/badge'
import { abrangenciaDoFluxo, rotuloDaEtapa, type Categoria, type Curso, type Fluxo, type Pronta, type Setor, type VersaoDoFluxo } from '../comum'
import { Icones } from '../fluxos/IconesDoDestino'

export type Listas = { setores: Setor[]; categorias: Categoria[]; cursos: Curso[]; fluxos: Fluxo[]; prontas: Pronta[] }
export type Aba = keyof Listas
export type Linha = [principal: string, detalhe: ReactNode]

type Variante = 'secondary' | 'outline'
const Selos = ({ itens }: { itens: [texto: string, variante: Variante][] }) =>
  itens.length === 0 ? null : (
    <span className="flex flex-wrap items-center gap-1.5">
      {itens.map(([texto, variante]) => (
        <Badge key={texto} variant={variante}>
          {texto}
        </Badge>
      ))}
    </span>
  )

export function estadoDoFluxo(f: Pick<Fluxo, 'vigente' | 'rascunho'>) {
  if (f.vigente) return `Publicado v${f.vigente.numero}`
  return f.rascunho ? 'Rascunho' : 'Sem versão'
}

export function MiniCadeia({ versao, setores }: { versao: VersaoDoFluxo | null; setores: Setor[] }) {
  if (!versao || versao.etapas.length === 0) return <span className="text-muted-foreground">Sem etapas</span>
  return (
    <span className="flex flex-wrap items-center gap-1">
      {versao.etapas.map((e, i) => {
        const Icone = Icones[e.destino]
        return (
          <Fragment key={i}>
            {i > 0 && <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />}
            <span className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-0.5 text-xs">
              <Icone aria-hidden="true" className="size-3.5 text-primary" />
              {rotuloDaEtapa(e, setores)}
            </span>
          </Fragment>
        )
      })}
    </span>
  )
}

function DetalheDoFluxo({ f, dados }: { f: Fluxo; dados: Listas }) {
  const emEdicao = f.vigente && f.rascunho
  return (
    <span className="flex flex-col gap-1.5">
      <span>{abrangenciaDoFluxo(f, dados.cursos)}</span>
      <MiniCadeia versao={f.vigente ?? f.rascunho} setores={dados.setores} />
      <Selos itens={[[estadoDoFluxo(f), f.vigente ? 'secondary' : 'outline'], ...(emEdicao ? [['Rascunho em edição', 'outline'] as [string, Variante]] : [])]} />
    </span>
  )
}

const nomeDe = (lista: { id: number; nome: string }[], id: number | null) => lista.find((x) => x.id === id)?.nome ?? '—'

function selosDoSetor(s: Setor, dados: Listas): [string, Variante][] {
  const lideranca: [string, Variante][] = s.cursoId ? [[`Liderança de ${abrangenciaDoFluxo({ cursoId: s.cursoId, semestre: s.semestre ?? null }, dados.cursos)}`, 'outline']] : []
  return [...(s.triagem ? ([['Triagem', 'outline']] as [string, Variante][]) : []), ...lideranca, ...(s.ativo ? [] : ([['Inativo', 'secondary']] as [string, Variante][]))]
}

export function linhas(dados: Listas): Record<Aba, (x: any) => Linha> {
  return {
    setores: (s: Setor) => [s.nome, <Selos itens={selosDoSetor(s, dados)} />],
    categorias: (c: Categoria) => [c.nome, <Selos itens={[...(c.padrao ? ([['Padrão', 'outline']] as [string, Variante][]) : []), ...(c.ativa ? [] : ([['Inativa', 'secondary']] as [string, Variante][]))]} />],
    cursos: (c: Curso) => [c.nome, `Coordenação: ${nomeDe(dados.setores, c.setorCoordenacaoId)}`],
    fluxos: (f: Fluxo) => [nomeDe(dados.categorias, f.categoriaId), <DetalheDoFluxo f={f} dados={dados} />],
    prontas: (p: Pronta) => [p.titulo, nomeDe(dados.setores, p.setorId)],
  }
}
