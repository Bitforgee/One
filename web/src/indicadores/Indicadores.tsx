import { ChartColumn } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { api } from '../api'
import { ErroDe } from '../ErroDe'
import { dia } from '../Periodo'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
import { BlocoVazio } from '../Tabela'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

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

// O ranking em tabela de 2 colunas (door 16): a categoria inteira com a barra embaixo, proporcional ao maior total, e o total à direita; vazio, uma linha só com o traço.
function TabelaRanking({ linhas }: { linhas: Linha[] }) {
  const tabela = useReactTable({ data: linhas, columns: Colunas, getCoreRowModel: getCoreRowModel() })
  const maior = Math.max(...linhas.map((l) => l.total))
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
              <TableCell key={celula.id} className="whitespace-normal [overflow-wrap:anywhere] first:w-full last:text-end last:tabular-nums">
                {flexRender(celula.column.columnDef.cell, celula.getContext())}
                {celula.column.id === 'categoria' && (
                  <div data-barra aria-hidden="true" className="mt-1 h-1.5 rounded-xs bg-chart-1" style={{ width: maior > 0 ? `${(linha.original.total / maior) * 100}%` : '0%' }} />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function Ranking({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="m-0 text-base font-semibold">{titulo}</h2>
      <TabelaRanking linhas={linhas} />
    </section>
  )
}

// O principal ocupa a maior área; os outros 3 destaques ficam numa faixa; os rodapés dizem o que o número mede.
const Rodapes: Record<string, string> = {
  'Indicador principal': 'Resolvidas sem reabertura, sobre as conversas com desfecho.',
  'Chamados abertos agora': 'Chamados não fechados neste momento.',
  'Autoatendimento': 'Resolvidas pelo assistente, sobre as conversas com desfecho.',
  'Tempo até a 1ª resposta': 'Da abertura à primeira resposta pública.',
}
const Faixa = ['Chamados abertos agora', 'Autoatendimento', 'Tempo até a 1ª resposta']

// A variação em pontos percentuais contra o período anterior (P5): 1 casa, "pt" abaixo de 2,0 e "pts" de 2,0 em diante.
export function variacao(atual: number, anterior: number) {
  const pontos = Math.round((atual - anterior) * 1000) / 10
  if (pontos === 0) return '= sem variação'
  return `${pontos > 0 ? '▲' : '▼'} ${Math.abs(pontos).toFixed(1).replace('.', ',')} ${Math.abs(pontos) < 2 ? 'pt' : 'pts'}`
}

function Principal({ valor, variacaoDe }: { valor: string; variacaoDe?: string }) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex flex-col gap-1">
        <div className="text-sm text-muted-foreground">Indicador principal</div>
        <div className="flex flex-wrap items-baseline gap-x-4">
          <div className="font-heading text-[40px] leading-tight font-semibold tabular-nums">{valor}</div>
          {variacaoDe && (
            <span className="text-base font-medium tabular-nums">
              {variacaoDe} <span className="font-normal text-muted-foreground">vs. período anterior</span>
            </span>
          )}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">{Rodapes['Indicador principal']}</div>
    </section>
  )
}

// Os 13 indicadores: o principal, a faixa de 3, as outras 9 em lista e os rankings que a API manda; as colunas seguem a largura do main (door 5).
function Painel({ dados, variacaoDe }: { dados: Indicadores; variacaoDe?: string }) {
  const rankings = [
    ['Categorias por conversas', dados.principaisCategorias.porConversas],
    ['Categorias por chamados', dados.principaisCategorias.porChamados],
  ] as const
  const todos = cartoes(dados)
  const valores = new Map(todos)
  const resto = todos.filter(([rotulo]) => rotulo !== 'Indicador principal' && !Faixa.includes(rotulo))
  return (
    <div className="flex flex-col gap-8">
      <Principal valor={valores.get('Indicador principal')!} variacaoDe={variacaoDe} />
      <div className="grid grid-cols-1 divide-y @3xl/main:grid-cols-3 @3xl/main:divide-x @3xl/main:divide-y-0">
        {Faixa.map((rotulo) => (
          <div key={rotulo} className="flex flex-col gap-1 py-3 @3xl/main:px-6 @3xl/main:py-0 @3xl/main:first:ps-0">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">{rotulo}</div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">{valores.get(rotulo)}</div>
            </div>
            <div className="text-sm text-muted-foreground">{Rodapes[rotulo]}</div>
          </div>
        ))}
      </div>
      <ul className="m-0 grid list-none grid-cols-1 p-0 @3xl/main:grid-cols-2 @3xl/main:gap-x-10">
        {resto.map(([rotulo, valor]) => (
          <li key={rotulo} className="flex items-baseline justify-between gap-4 border-b py-3">
            <span className="text-sm text-muted-foreground">{rotulo}</span>
            <span className="font-semibold tabular-nums">{valor}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 gap-8 @4xl/main:grid-cols-2">
        {rankings
          .filter(([, r]) => r !== null)
          .map(([titulo, r]) => (
            <Ranking key={titulo} titulo={titulo} linhas={r!} />
          ))}
      </div>
    </div>
  )
}

// O período anterior de mesmo número de dias, terminando na véspera de `de` (identidade-visual AC 12).
export function periodoAnterior(de: string, ate: string) {
  if (!de || !ate) return null // campo vazio: sem período anterior, e nenhum pedido com NaN na URL
  const [d, a] = [de, ate].map((v) => v.split('-').map(Number))
  const dias = Math.round((Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(d[0], d[1] - 1, d[2])) / 86_400_000) + 1
  const antes = (k: number) => dia(new Date(d[0], d[1] - 1, d[2] - k))
  return dias < 1 ? null : { de: antes(dias), ate: antes(1) }
}

// A variação do principal contra o período anterior; a falha da consulta, a falta de dados e o número ainda provisório só a tiram (AC 13).
function useVariacao(consulta: { de: string; ate: string }, atual: Indicadores | undefined, provisorio: boolean) {
  const antes = periodoAnterior(consulta.de, consulta.ate)
  const { data: anterior } = useQuery({
    queryKey: ['indicadores-anterior', consulta],
    queryFn: () => api<Indicadores>(`/api/indicadores?de=${antes!.de}&ate=${antes!.ate}`),
    enabled: !!antes,
  })
  const [a, b] = [atual?.indicadorPrincipal, anterior?.semDados ? null : anterior?.indicadorPrincipal]
  return !provisorio && a != null && b != null ? variacao(a, b) : undefined
}

// S11: os 14 indicadores do Quadro 12, por período, no fuso da instituição.
export function Indicadores() {
  const hoje = new Date()
  const [de, setDe] = useState(dia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)))
  const [ate, setAte] = useState(dia(hoje))
  // cada "Consultar" é uma consulta nova, mesmo com o período igual; os cartões anteriores ficam até a resposta
  const [consulta, setConsulta] = useState({ de, ate, vez: 0 })
  const { data: dados, error, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ['indicadores', consulta],
    queryFn: () => api<Indicadores>(`/api/indicadores?de=${consulta.de}&ate=${consulta.ate}`),
    placeholderData: keepPreviousData,
  })
  const variacaoDe = useVariacao(consulta, dados, isPlaceholderData)

  return (
    <div className="flex flex-col gap-6">
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
        <Button type="submit" className="col-span-2 @3xl/main:col-span-1" disabled={isFetching}>
          {isFetching && <Spinner />}
          Consultar
        </Button>
      </form>
      <ErroDe erro={error} oque="os indicadores" tentar={() => void refetch()} />
      {dados?.semDados && (
        <BlocoVazio Icone={ChartColumn} frase="Sem atendimentos neste período." />
      )}
      {dados && !dados.semDados && <Painel dados={dados} variacaoDe={variacaoDe} />}
    </div>
  )
}
