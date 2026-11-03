import { useMutation } from '@tanstack/react-query'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { BotaoAcao } from '../acao'
import { api, ErroApi } from '../api'
import { CampoArquivo } from '../CampoArquivo'
import { Confirmar } from '../Confirmar'
import { Alert } from '../ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

type Erro = { linha: number; motivo: string }

const Colunas: ColumnDef<Erro>[] = [
  { accessorKey: 'linha', header: 'Linha' },
  { accessorKey: 'motivo', header: 'Motivo' },
]

// Tabela de 2 colunas (door 16) com os erros por linha que a API devolve.
function ErrosDaImportacao({ erros }: { erros: Erro[] }) {
  const tabela = useReactTable({ data: erros, columns: Colunas, getCoreRowModel: getCoreRowModel() })
  if (erros.length === 0) return null
  return (
    <Table>
      <TableHeader>
        {tabela.getHeaderGroups().map((grupo) => (
          <TableRow key={grupo.id}>
            {grupo.headers.map((h) => (
              <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {tabela.getRowModel().rows.map((linha) => (
          <TableRow key={linha.id}>
            {linha.getVisibleCells().map((celula) => (
              <TableCell key={celula.id} className="whitespace-normal break-words">
                {flexRender(celula.column.columnDef.cell, celula.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// S8 e door 15: CSV do sistema acadêmico; tudo ou nada.
export function Matriculas() {
  const [arquivo, setArquivo] = useState<File>()
  const [confirmar, setConfirmar] = useState(false)
  const importacao = useMutation({ mutationFn: (f: FormData) => api<{ criados: number; atualizados: number }>('/api/admin/matriculas/importacao', f) })
  const { data: resultado, error } = importacao
  const erros: Erro[] = error instanceof ErroApi && Array.isArray(error.corpo?.erros) ? error.corpo.erros : []

  function importar() {
    setConfirmar(false)
    const f = new FormData()
    f.set('arquivo', arquivo!)
    importacao.mutate(f)
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Importar matrículas</h1>
      <p className="text-sm text-muted-foreground">
        Arquivo CSV em UTF-8, separado por ponto e vírgula, com o cabeçalho <code className="break-all font-mono">cpf;nome;email;matricula;curso;semestre;situacao</code>. Alunos são
        atualizados pelo CPF e matrículas pelo número. Se alguma linha tiver erro, nada é importado.
      </p>
      <CampoArquivo id="csv" rotulo="Arquivo CSV" accept=".csv,text/csv" multiple={false} arquivos={arquivo ? [arquivo] : []} setArquivos={([a]) => setArquivo(a)} />
      <BotaoAcao className="w-full md:w-auto md:self-start" pendente={importacao.isPending} disabled={!arquivo} onClick={() => setConfirmar(true)}>
        Importar
      </BotaoAcao>
      {resultado && (
        <Alert>
          Importação concluída: {resultado.criados} matrículas criadas e {resultado.atualizados} atualizadas.
        </Alert>
      )}
      {error && <Alert variant="destructive">{error.message}</Alert>}
      <ErrosDaImportacao erros={erros} />

      <Confirmar aberto={confirmar} fechar={() => setConfirmar(false)} titulo={`Importar ${arquivo?.name}?`} botao="Importar" confirmar={importar}>
        Os dados de alunos e matrículas que já existem serão substituídos pelos do arquivo.
      </Confirmar>
    </div>
  )
}
