import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { BotaoAcao } from '../acao'
import { api, ErroApi } from '../api'
import { CampoArquivo } from '../CampoArquivo'
import { Confirmar } from '../Confirmar'
import { Principal, Tabela } from '../Tabela'
import { Alert } from '../ui/alert'
import { Card } from '../ui/card'
import { TableCell, TableRow } from '../ui/table'

type Erro = { linha: number; motivo: string }

const Colunas = [{ titulo: 'Linha' }, { titulo: 'Motivo' }]

// Tabela de 2 colunas (door 16) com os erros por linha que a API devolve.
function ErrosDaImportacao({ erros }: { erros: Erro[] }) {
  if (erros.length === 0) return null
  return (
    <Tabela colunas={Colunas} itens={erros}>
      {erros.map((e, i) => (
        <TableRow key={i}>
          <TableCell>{e.linha}</TableCell>
          <TableCell className={Principal}>{e.motivo}</TableCell>
        </TableRow>
      ))}
    </Tabela>
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
      <Card className="gap-2 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Arquivo CSV em UTF-8, separado por ponto e vírgula, com o cabeçalho <code className="break-all font-mono">cpf;nome;email;matricula;curso;semestre;situacao</code>. Alunos são
          atualizados pelo CPF e matrículas pelo número. Se alguma linha tiver erro, nada é importado.
        </p>
        <CampoArquivo id="csv" rotulo="Arquivo CSV" accept=".csv,text/csv" multiple={false} arquivos={arquivo ? [arquivo] : []} setArquivos={([a]) => setArquivo(a)} />
        <BotaoAcao className="w-full md:w-auto md:self-start" pendente={importacao.isPending} disabled={!arquivo} onClick={() => setConfirmar(true)}>
          Importar
        </BotaoAcao>
      </Card>
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
