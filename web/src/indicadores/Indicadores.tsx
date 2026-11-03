import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense, useState } from 'react'
import { api } from '../api'
import { dia, Periodo } from '../Periodo'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

// O Recharts vai num chunk separado do de entrada (AC 33).
const Grafico = lazy(() => import('./Grafico'))

type Linha = { categoria: string; total: number }
type Ranking = Linha[] | null
type Indicadores = {
  semDados: boolean
  alunosAtivos: number | null
  conversas: number | null
  taxaAutoatendimento: number | null
  taxaEscalonamento: number | null
  taxaAbandono: number | null
  taxaPerguntasSemArtigo: number | null
  chamadosAbertos: number
  chamadosResolvidos: number
  tempoPrimeiraRespostaHoras: number | null
  tempoResolucaoHoras: number | null
  roteamentoCorreto: number | null
  taxaReabertura: number | null
  principaisCategorias: { porConversas: Ranking; porChamados: Ranking }
  indicadorPrincipal: number | null
}

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 1000) / 10}%`.replace('.', ','))
const horas = (v: number | null) => (v === null ? '—' : `${String(v).replace('.', ',')} h`)
const num = (v: number | null) => (v === null ? '—' : String(v))

function cartoes(dados: Indicadores): [string, string][] {
  return [
    ['Indicador principal', pct(dados.indicadorPrincipal)],
    ['Alunos ativos', num(dados.alunosAtivos)],
    ['Conversas', num(dados.conversas)],
    ['Autoatendimento', pct(dados.taxaAutoatendimento)],
    ['Escalonamento', pct(dados.taxaEscalonamento)],
    ['Abandono', pct(dados.taxaAbandono)],
    ['Perguntas sem artigo', pct(dados.taxaPerguntasSemArtigo)],
    ['Chamados abertos agora', String(dados.chamadosAbertos)],
    ['Chamados resolvidos', String(dados.chamadosResolvidos)],
    ['Tempo até a 1ª resposta', horas(dados.tempoPrimeiraRespostaHoras)],
    ['Tempo de resolução', horas(dados.tempoResolucaoHoras)],
    ['Roteamento correto', pct(dados.roteamentoCorreto)],
    ['Reabertura', pct(dados.taxaReabertura)],
  ]
}

const Colunas: ColumnDef<Linha>[] = [
  { accessorKey: 'categoria', header: 'Categoria' },
  { accessorKey: 'total', header: 'Total' },
]

// Ranking em tabela de 2 colunas (door 16); vazio, uma linha só com o traço.
function TabelaRanking({ linhas }: { linhas: Linha[] }) {
  const tabela = useReactTable({ data: linhas, columns: Colunas, getCoreRowModel: getCoreRowModel() })
  return (
    <Table>
      <TableHeader>
        {tabela.getHeaderGroups().map((grupo) => (
          <TableRow key={grupo.id}>
            {grupo.headers.map((h) => (
              <TableHead key={h.id} className="last:text-end">
                {flexRender(h.column.columnDef.header, h.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {linhas.length === 0 && (
          <TableRow>
            <TableCell colSpan={2}>—</TableCell>
          </TableRow>
        )}
        {tabela.getRowModel().rows.map((linha) => (
          <TableRow key={linha.id}>
            {linha.getVisibleCells().map((celula) => (
              <TableCell key={celula.id} className="whitespace-normal break-words last:text-end">
                {flexRender(celula.column.columnDef.cell, celula.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function CartaoRanking({ titulo, linhas, cor }: { titulo: string; linhas: Linha[]; cor: string }) {
  return (
    <Card className="min-w-0 gap-2 px-3 py-3">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {linhas.length > 0 && (
        <Suspense fallback={null}>
          <Grafico linhas={linhas} cor={cor} />
        </Suspense>
      )}
      <TabelaRanking linhas={linhas} />
    </Card>
  )
}

// Os 13 cartões, "Indicador principal" primeiro e nas 2 colunas, e os rankings que a API manda.
function Painel({ dados }: { dados: Indicadores }) {
  const rankings = [
    ['Categorias por conversas', dados.principaisCategorias.porConversas, 'var(--chart-1)'],
    ['Categorias por chamados', dados.principaisCategorias.porChamados, 'var(--chart-2)'],
  ] as const
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cartoes(dados).map(([rotulo, valor], i) => (
          <Card key={rotulo} className={`gap-1 px-3 py-2 ${i === 0 ? 'col-span-2' : ''}`}>
            <div className="text-sm text-muted-foreground">{rotulo}</div>
            <div className={i === 0 ? 'text-3xl font-semibold' : 'text-lg font-semibold'}>{valor}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {rankings
          .filter(([, r]) => r !== null)
          .map(([titulo, r, cor]) => (
            <CartaoRanking key={titulo} titulo={titulo} linhas={r!} cor={cor} />
          ))}
      </div>
    </>
  )
}

// S11: os 14 indicadores do Quadro 12, por período, no fuso da instituição.
export function Indicadores() {
  const hoje = new Date()
  const [de, setDe] = useState(dia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)))
  const [ate, setAte] = useState(dia(hoje))
  // cada "Consultar" é uma consulta nova, mesmo com o período igual; os cartões anteriores ficam até a resposta
  const [consulta, setConsulta] = useState({ de, ate, vez: 0 })
  const { data: dados, error, isFetching } = useQuery({
    queryKey: ['indicadores', consulta],
    queryFn: () => api<Indicadores>(`/api/indicadores?de=${consulta.de}&ate=${consulta.ate}`),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Indicadores</h1>
      <form
        className="grid grid-cols-2 gap-2 md:flex md:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          setConsulta((c) => ({ de, ate, vez: c.vez + 1 }))
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="de">De</Label>
          <Input id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ate">Até</Label>
          <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <div className="col-span-2 flex items-start gap-2">
          <Periodo rotulo="Escolher período no calendário" className="h-auto min-h-9 flex-1 whitespace-normal md:flex-none" setDe={setDe} setAte={setAte} />
          <Button type="submit" disabled={isFetching}>
            {isFetching && <Spinner />}
            Consultar
          </Button>
        </div>
      </form>
      {error && <Alert variant="destructive">{error.message}</Alert>}
      {dados?.semDados && <Alert>Sem dados no período</Alert>}
      {dados && !dados.semDados && <Painel dados={dados} />}
    </div>
  )
}
