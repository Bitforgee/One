import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense, useState } from 'react'
import { api } from '../api'
import { Grafico as GraficoVazio } from '../ilustracoes'
import { dia, Periodo } from '../Periodo'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
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
    <Card className="min-w-0 gap-2">
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {linhas.length > 0 && (
          <Suspense fallback={null}>
            <Grafico linhas={linhas} cor={cor} />
          </Suspense>
        )}
        <TabelaRanking linhas={linhas} />
      </CardContent>
    </Card>
  )
}

// Os 4 de destaque (layout-painel AC 16), com o rodapé que diz o que o número mede; os outros 9 ficam compactos.
const Destaques: [string, string][] = [
  ['Indicador principal', 'Resolvidas sem reabertura, sobre as conversas com desfecho'],
  ['Chamados abertos agora', 'Chamados não fechados neste momento'],
  ['Autoatendimento', 'Resolvidas pelo assistente, sobre as conversas com desfecho'],
  ['Tempo até a 1ª resposta', 'Da abertura à primeira resposta pública'],
]

// Os 13 cartões (4 de destaque e 9 compactos) e os rankings que a API manda; as grades seguem a largura do main (door 5).
function Painel({ dados }: { dados: Indicadores }) {
  const rankings = [
    ['Categorias por conversas', dados.principaisCategorias.porConversas, 'var(--chart-1)'],
    ['Categorias por chamados', dados.principaisCategorias.porChamados, 'var(--chart-2)'],
  ] as const
  const todos = cartoes(dados)
  const valores = new Map(todos)
  const compactos = todos.filter(([rotulo]) => !Destaques.some(([d]) => d === rotulo))
  return (
    <>
      {/* um quadro só, com linhas de 1 px entre as células (gap-px sobre bg-border), em vez de cartões soltos */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Destaques.map(([rotulo, rodape]) => (
          <Card key={rotulo} className="gap-3 rounded-none border-0 p-5">
            <div className="flex flex-col gap-1">
              <CardDescription>{rotulo}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">{valores.get(rotulo)}</CardTitle>
            </div>
            <div className="text-sm text-muted-foreground">{rodape}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border @3xl/main:grid-cols-3">
        {compactos.map(([rotulo, valor], i) => (
          // o último de uma lista ímpar ocupa a linha toda em 2 colunas, para não sobrar célula vazia
          <Card key={rotulo} className={`gap-1 rounded-none border-0 px-5 py-4 ${i === compactos.length - 1 && compactos.length % 2 ? 'col-span-2 @3xl/main:col-span-1' : ''}`}>
            <div className="text-sm text-muted-foreground">{rotulo}</div>
            <div className="text-xl font-semibold tabular-nums">{valor}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-2">
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
      <form
        className="grid grid-cols-2 gap-2 @3xl/main:flex @3xl/main:items-end"
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
          <Periodo rotulo="Escolher período no calendário" className="h-auto min-h-9 flex-1 whitespace-normal @3xl/main:flex-none" setDe={setDe} setAte={setAte} />
          <Button type="submit" disabled={isFetching}>
            {isFetching && <Spinner />}
            Consultar
          </Button>
        </div>
      </form>
      {error && <Alert variant="destructive">{error.message}</Alert>}
      {dados?.semDados && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <GraficoVazio className="h-24 w-32 text-muted-foreground" />
          <p className="m-0 text-muted-foreground">Sem atendimentos neste período.</p>
        </div>
      )}
      {dados && !dados.semDados && <Painel dados={dados} />}
    </div>
  )
}
