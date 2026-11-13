import { ChartColumn } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { BotaoAcao } from '../acao'
import { api } from '../api'
import { ErroDe } from '../ErroDe'
import { comUnidade, decimalFixo, numero, porcentagem } from '../formatos'
import { dia } from '../Periodo'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
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

const ou = (v: number | null, formatar: (v: number) => string) => (v === null ? '—' : formatar(v))
const pct = (v: number | null) => ou(v, porcentagem)
const horas = (v: number | null) => ou(v, (h) => comUnidade(h, 'h'))
const num = (v: number | null) => ou(v, numero)

function cartoes(dados: Indicadores): [string, string][] {
  return [
    ['Indicador principal', pct(dados.indicadorPrincipal)],
    ['Alunos ativos', num(dados.alunosAtivos)],
    ['Conversas', num(dados.conversas)],
    ['Autoatendimento', pct(dados.taxaAutoatendimento)],
    ['Escalonamento', pct(dados.taxaEscalonamento)],
    ['Abandono', pct(dados.taxaAbandono)],
    ['Perguntas sem artigo', pct(dados.taxaPerguntasSemArtigo)],
    ['Chamados abertos agora', num(dados.chamadosAbertos)],
    ['Chamados resolvidos', num(dados.chamadosResolvidos)],
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
              <TableCell key={celula.id} className="first:w-full first:whitespace-normal first:[overflow-wrap:anywhere] last:text-end last:tabular-nums">
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

const Rodapes: Record<string, string> = {
  'Indicador principal': 'Resolvidas sem reabertura, sobre as conversas com desfecho.',
  'Chamados abertos agora': 'Chamados não fechados neste momento.',
  'Autoatendimento': 'Resolvidas pelo assistente, sobre as conversas com desfecho.',
  'Tempo até a 1ª resposta': 'Da abertura à primeira resposta pública.',
}
const Faixa = ['Chamados abertos agora', 'Autoatendimento', 'Tempo até a 1ª resposta']

export function variacao(atual: number, anterior: number) {
  const pontos = Math.round((atual - anterior) * 1000) / 10
  if (pontos === 0) return '= sem variação'
  return `${pontos > 0 ? '▲' : '▼'} ${decimalFixo(Math.abs(pontos))} ${Math.abs(pontos) < 2 ? 'pt' : 'pts'}`
}

function Principal({ valor, variacaoDe }: { valor: string; variacaoDe?: string }) {
  return (
    <section className="flex flex-col gap-1">
      <dl className="m-0 flex flex-col gap-1">
        <dt className="text-sm text-muted-foreground">Indicador principal</dt>
        <dd className="m-0 flex flex-wrap items-baseline gap-x-3">
          <div className="font-heading text-[40px] leading-tight font-semibold tabular-nums">{valor}</div>
          {variacaoDe && (
            <span className="text-base font-medium tabular-nums">
              {variacaoDe} <span className="font-normal text-muted-foreground">vs. período anterior</span>
            </span>
          )}
        </dd>
      </dl>
      <div className="text-sm text-muted-foreground">{Rodapes['Indicador principal']}</div>
    </section>
  )
}

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
      <dl className="m-0 grid grid-cols-1 divide-y @3xl/main:grid-cols-3 @3xl/main:divide-x @3xl/main:divide-y-0">
        {Faixa.map((rotulo) => (
          <div key={rotulo} className="flex flex-col gap-1 py-3 @3xl/main:px-6 @3xl/main:py-0 @3xl/main:first:ps-0">
            <dt className="text-sm text-muted-foreground">{rotulo}</dt>
            <dd className="m-0 text-2xl font-semibold tracking-tight tabular-nums">{valores.get(rotulo)}</dd>
            <dd className="m-0 text-sm text-muted-foreground">{Rodapes[rotulo]}</dd>
          </div>
        ))}
      </dl>
      <dl className="m-0 grid grid-cols-1 @3xl/main:grid-cols-2 @3xl/main:gap-x-10">
        {resto.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex items-baseline justify-between gap-4 border-b py-3">
            <dt className="text-sm text-muted-foreground">{rotulo}</dt>
            <dd className="m-0 font-semibold tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
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
export function periodoAnterior(de: string, ate: string) {
  if (!de || !ate) return null
  const [d, a] = [de, ate].map((v) => v.split('-').map(Number))
  const dias = Math.round((Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(d[0], d[1] - 1, d[2])) / 86_400_000) + 1
  const antes = (k: number) => dia(new Date(d[0], d[1] - 1, d[2] - k))
  return dias < 1 ? null : { de: antes(dias), ate: antes(1) }
}

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

const dataValida = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && dia(new Date(`${v}T00:00:00`)) === v

function periodoDaUrl(params: URLSearchParams, padrao: { de: string; ate: string }) {
  const [de, ate] = [params.get('de'), params.get('ate')]
  return dataValida(de) && dataValida(ate) && de <= ate ? { de, ate } : padrao
}

export function Indicadores() {
  const hoje = new Date()
  const [params, setParams] = useSearchParams()
  const [inicial] = useState(() => periodoDaUrl(params, { de: dia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), ate: dia(hoje) }))
  const [de, setDe] = useState(inicial.de)
  const [ate, setAte] = useState(inicial.ate)
  const [consulta, setConsulta] = useState({ ...inicial, vez: 0 })
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
          setParams({ de, ate }, { replace: true })
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="de">De</Label>
          <Input id="de" name="de" autoComplete="off" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ate">Até</Label>
          <Input id="ate" name="ate" autoComplete="off" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <BotaoAcao type="submit" className="col-span-2 @3xl/main:col-span-1" pendente={isFetching}>
          Consultar
        </BotaoAcao>
      </form>
      <ErroDe erro={error} oque="os indicadores" tentar={() => void refetch()} />
      {dados?.semDados && (
        <BlocoVazio Icone={ChartColumn} frase="Sem atendimentos neste período." />
      )}
      {dados && !dados.semDados && <Painel dados={dados} variacaoDe={variacaoDe} />}
    </div>
  )
}
