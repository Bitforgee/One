import { useMutation } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { BotaoAcao } from '../acao'
import { api, ErroApi } from '../api'
import { CampoArquivo } from '../CampoArquivo'
import { Confirmar } from '../Confirmar'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Planilha } from '../ilustracoes'

type Erro = { linha: number; motivo: string }

const CabecalhoDoCsv = 'cpf;nome;email;matricula;curso;semestre;situacao'

// O modelo: só o cabeçalho, para o arquivo nascer com as colunas certas.
function baixarModelo() {
  const url = URL.createObjectURL(new Blob([`${CabecalhoDoCsv}
`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-matriculas.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// Os erros por linha que a API devolve: "Linha N" e o motivo.
function ErrosDaImportacao({ erros }: { erros: Erro[] }) {
  if (erros.length === 0) return null
  return (
    <ul className="m-0 flex list-none flex-col divide-y rounded-md border p-0 text-sm">
      {erros.map((e, i) => (
        <li key={i} className="flex gap-3 p-3">
          <span className="shrink-0 font-medium">Linha {e.linha}</span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{e.motivo}</span>
        </li>
      ))}
    </ul>
  )
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-2" aria-labelledby={`passo-${n}`}>
      <h2 id={`passo-${n}`} className="m-0 flex items-center gap-2 text-base font-medium">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
          {n}
        </span>
        {' '}
        {titulo}
      </h2>
      {children}
    </li>
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
        <ol className="m-0 flex list-none flex-col gap-5 p-0">
          <Passo n={1} titulo="Baixe o modelo">
            <Button type="button" variant="outline" className="self-start" onClick={baixarModelo}>
              <Download aria-hidden="true" />
              Baixar modelo (CSV)
            </Button>
          </Passo>
          <Passo n={2} titulo="Preencha uma linha por aluno">
            <p className="m-0 text-sm text-muted-foreground">
              Arquivo CSV em UTF-8, separado por ponto e vírgula, com o cabeçalho <code className="break-all font-mono">{CabecalhoDoCsv}</code>. Alunos são atualizados pelo CPF e matrículas
              pelo número. Se alguma linha tiver erro, nada é importado.
            </p>
            <Planilha className="w-full max-w-lg text-muted-foreground" />
          </Passo>
          <Passo n={3} titulo="Envie o arquivo">
            <CampoArquivo id="csv" rotulo="Arquivo CSV" accept=".csv,text/csv" multiple={false} arquivos={arquivo ? [arquivo] : []} setArquivos={([a]) => setArquivo(a)} />
            <BotaoAcao className="w-full md:w-auto md:self-start" pendente={importacao.isPending} disabled={!arquivo} onClick={() => setConfirmar(true)}>
              Importar
            </BotaoAcao>
          </Passo>
        </ol>
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
