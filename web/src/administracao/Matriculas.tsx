import { useState } from 'react'
import { Alert, Button, Form, Modal, Table } from 'react-bootstrap'
import { BotaoAcao, useAcao } from '../acao'
import { api, ErroApi } from '../api'

type Erro = { linha: number; motivo: string }

function ErrosDaImportacao({ erros }: { erros: Erro[] }) {
  if (erros.length === 0) return null
  return (
    <Table size="sm" striped className="small">
      <thead>
        <tr>
          <th>Linha</th>
          <th>Motivo</th>
        </tr>
      </thead>
      <tbody>
        {erros.map((e) => (
          <tr key={e.linha}>
            <td>{e.linha}</td>
            <td style={{ overflowWrap: 'anywhere' }}>{e.motivo}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

// S8 e door 15: CSV do sistema acadêmico; tudo ou nada.
export function Matriculas() {
  const [arquivo, setArquivo] = useState<File>()
  const [confirmar, setConfirmar] = useState(false)
  const [resultado, setResultado] = useState<{ criados: number; atualizados: number }>()
  const [erros, setErros] = useState<Erro[]>([])
  const acao = useAcao()

  function importar() {
    setConfirmar(false)
    setResultado(undefined)
    setErros([])
    const f = new FormData()
    f.set('arquivo', arquivo!)
    acao.executar(async () => {
      try {
        setResultado(await api('/api/admin/matriculas/importacao', f))
      } catch (e) {
        if (e instanceof ErroApi && Array.isArray(e.corpo?.erros)) setErros(e.corpo.erros)
        throw e
      }
    })
  }

  return (
    <>
      <h1 className="h4">Importar matrículas</h1>
      <p className="small text-body-secondary">
        Arquivo CSV em UTF-8, separado por ponto e vírgula, com o cabeçalho <code>cpf;nome;email;matricula;curso;semestre;situacao</code>. Alunos são
        atualizados pelo CPF e matrículas pelo número. Se alguma linha tiver erro, nada é importado.
      </p>
      <Form.Group controlId="csv" className="mb-2">
        <Form.Label>Arquivo CSV</Form.Label>
        <Form.Control type="file" accept=".csv,text/csv" onChange={(e) => setArquivo((e.target as HTMLInputElement).files![0])} />
      </Form.Group>
      <BotaoAcao pendente={acao.pendente} disabled={!arquivo} onClick={() => setConfirmar(true)}>
        Importar
      </BotaoAcao>
      {resultado && (
        <Alert variant="success" className="mt-3">
          Importação concluída: {resultado.criados} matrículas criadas e {resultado.atualizados} atualizadas.
        </Alert>
      )}
      {acao.alerta}
      <ErrosDaImportacao erros={erros} />

      <Modal show={confirmar} onHide={() => setConfirmar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Importar {arquivo?.name}?</Modal.Title>
        </Modal.Header>
        <Modal.Body>Os dados de alunos e matrículas que já existem serão substituídos pelos do arquivo.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmar(false)}>
            Voltar
          </Button>
          <Button onClick={importar}>Importar</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
