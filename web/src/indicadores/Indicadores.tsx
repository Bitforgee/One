import { useCallback, useEffect, useState } from 'react'
import { Alert, Card, Col, Form, ListGroup, Row } from 'react-bootstrap'
import { BotaoAcao, useAcao } from '../acao'
import { api } from '../api'

type Ranking = { categoria: string; total: number }[] | null
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

const dia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 1000) / 10}%`.replace('.', ','))
const horas = (v: number | null) => (v === null ? '—' : `${String(v).replace('.', ',')} h`)
const num = (v: number | null) => (v === null ? '—' : String(v))

// S11: os 14 indicadores do Quadro 12, por período, no fuso da instituição.
export function Indicadores() {
  const hoje = new Date()
  const [de, setDe] = useState(dia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)))
  const [ate, setAte] = useState(dia(hoje))
  const [dados, setDados] = useState<Indicadores>()
  const acao = useAcao()

  const consultar = useCallback(
    (de: string, ate: string) => acao.executar(async () => setDados(await api<Indicadores>(`/api/indicadores?de=${de}&ate=${ate}`))),
    [],
  )
  useEffect(() => void consultar(de, ate), [consultar])

  const cartoes: [string, string][] = dados
    ? [
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
    : []

  return (
    <>
      <h1 className="h4">Indicadores</h1>
      <Form
        className="mb-3"
        onSubmit={(e) => {
          e.preventDefault()
          consultar(de, ate)
        }}
      >
        <Row className="g-2 align-items-end">
          <Col xs={6} sm="auto">
            <Form.Group controlId="de">
              <Form.Label>De</Form.Label>
              <Form.Control type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs={6} sm="auto">
            <Form.Group controlId="ate">
              <Form.Label>Até</Form.Label>
              <Form.Control type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs="auto">
            <BotaoAcao type="submit" pendente={acao.pendente}>
              Consultar
            </BotaoAcao>
          </Col>
        </Row>
      </Form>
      {acao.alerta}
      {dados?.semDados && <Alert variant="secondary">Sem dados no período</Alert>}
      {dados && !dados.semDados && (
        <>
          <Row xs={2} md={4} className="g-2 mb-3">
            {cartoes.map(([rotulo, valor]) => (
              <Col key={rotulo}>
                <Card className="h-100">
                  <Card.Body className="p-2">
                    <div className="small text-body-secondary">{rotulo}</div>
                    <div className="fs-5 fw-semibold">{valor}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          <Row xs={1} md={2} className="g-2">
            {(
              [
                ['Categorias por conversas', dados.principaisCategorias.porConversas],
                ['Categorias por chamados', dados.principaisCategorias.porChamados],
              ] as const
            )
              .filter(([, r]) => r !== null)
              .map(([titulo, r]) => (
                <Col key={titulo}>
                  <Card>
                    <Card.Header className="small">{titulo}</Card.Header>
                    <ListGroup variant="flush" className="small">
                      {r!.length === 0 && <ListGroup.Item>—</ListGroup.Item>}
                      {r!.map((x) => (
                        <ListGroup.Item key={x.categoria} className="d-flex justify-content-between">
                          <span style={{ overflowWrap: 'anywhere' }}>{x.categoria}</span>
                          <span>{x.total}</span>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Card>
                </Col>
              ))}
          </Row>
        </>
      )}
    </>
  )
}
