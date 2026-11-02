import { Badge, Card, ListGroup, Stack } from 'react-bootstrap'
import { Estados, type Chamado, type Evento, type Fonte, type MensagemChamado } from '../chamado'
import { formatarData } from '../datas'
import { responsavel } from './Chamados'

export const quebra = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const

export function Cabecalho({ c }: { c: Chamado }) {
  return (
    <>
      <h1 className="h4" style={{ overflowWrap: 'anywhere' }}>
        {c.numero} · {c.titulo}
      </h1>
      <p className="mb-2">
        <Badge bg="primary" className="me-2">
          {Estados[c.estado]}
        </Badge>
        <span className="small text-body-secondary">
          {c.setor} · {c.categoria} · {responsavel(c.responsavel)}
        </span>
      </p>
      {c.eventos && (
        <Card className="mb-3">
          <Card.Body className="small">
            <div>
              {c.solicitante} · matrícula {c.matricula.numero} · {c.matricula.curso} · {c.matricula.semestre}º semestre
            </div>
            {c.resumo && (
              <div className="mt-2">
                <div className="fw-semibold">Resumo gerado por IA</div>
                <div style={quebra}>{c.resumo}</div>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </>
  )
}

// RAG: a fonte citada, com o link do PDF da versão citada e o aviso de versão atualizada.
function FonteCitada({ f }: { f: Fonte }) {
  const documento = f.tipo === 'DOCUMENTO'
  return (
    <div className="small border-top mt-2 pt-1">
      <div className="fw-semibold">
        <i className={`bi ${documento ? 'bi-file-earmark-pdf' : 'bi-journal-text'} me-1`} aria-label={documento ? 'Documento' : 'Artigo'} role="img" />
        {f.titulo}
      </div>
      {f.trechos.map((t, j) => (
        <blockquote key={j} className="mb-1 fst-italic" style={quebra}>
          “{t}”
        </blockquote>
      ))}
      {documento && (
        <a href={`/api/documentos/versoes/${f.versaoDocumentoId}`} target="_blank" rel="noreferrer">
          Abrir o PDF (versão {f.numero})
        </a>
      )}
      {f.atualizado && <div className="text-warning-emphasis">{documento ? 'Este documento' : 'Este artigo'} foi atualizado depois desta resposta.</div>}
    </div>
  )
}

export function Transcricao({ c, fuso }: { c: Chamado; fuso: string }) {
  return (
    <>
      <h2 className="h6">Conversa com o assistente</h2>
      <Stack gap={2} className="mb-3">
        {c.transcricao.map((m, i) => (
          <Card key={i} className={m.autor === 'ALUNO' ? 'ms-auto bg-primary-subtle' : 'me-auto'} style={{ maxWidth: '90%' }}>
            <Card.Body className="py-2 px-3">
              <div style={quebra}>{m.texto}</div>
              {m.fontes?.map((f) => <FonteCitada key={`${f.tipo}-${f.versaoArtigoId}-${f.versaoDocumentoId}`} f={f} />)}
              <div className="small text-body-secondary text-end">{formatarData(m.criadaEm, fuso)}</div>
            </Card.Body>
          </Card>
        ))}
      </Stack>
    </>
  )
}

function Mensagem({ m, fuso }: { m: MensagemChamado; fuso: string }) {
  const nota = m.tipo === 'NOTA'
  return (
    <Card className={nota ? 'bg-warning-subtle' : m.doAluno ? 'ms-auto bg-primary-subtle' : 'me-auto'} style={{ maxWidth: '90%' }}>
      <Card.Body className="py-2 px-3">
        <div className="small fw-semibold">
          {m.autor}
          {nota && <Badge bg="warning" text="dark" className="ms-2">Nota interna</Badge>}
        </div>
        <div style={quebra}>{m.texto}</div>
        {m.anexos?.map((x) => (
          <div key={x.id} className="small">
            <i className="bi bi-paperclip me-1" aria-hidden="true" />
            <a href={`/api/anexos/${x.id}`} target="_blank" rel="noreferrer">
              {x.nome}
            </a>{' '}
            <span className="text-body-secondary">({Math.ceil(x.tamanho / 1024)} KB)</span>
          </div>
        ))}
        <div className="small text-body-secondary text-end">{formatarData(m.criadaEm, fuso)}</div>
      </Card.Body>
    </Card>
  )
}

export function Mensagens({ mensagens, fuso }: { mensagens: MensagemChamado[]; fuso: string }) {
  return (
    <>
      <h2 className="h6">Atendimento</h2>
      <Stack gap={2} className="mb-3">
        {mensagens.length === 0 && <p className="text-body-secondary small">Nenhuma resposta ainda.</p>}
        {mensagens.map((m) => (
          <Mensagem key={m.id} m={m} fuso={fuso} />
        ))}
      </Stack>
    </>
  )
}

const traco = (v: string | null) => (v === null ? '—' : v)

export function Historico({ eventos, fuso }: { eventos: Evento[] | null; fuso: string }) {
  if (!eventos) return null
  return (
    <>
      <h2 className="h6">Histórico</h2>
      <ListGroup as="ol" variant="flush" className="small mb-3" data-testid="eventos">
        {eventos.map((e, i) => (
          <ListGroup.Item as="li" key={i} className="px-0">
            <span className="text-body-secondary me-2">{formatarData(e.criadoEm, fuso)}</span>
            {e.tipo} · {e.ator}
            {(e.de || e.para) && ` · ${traco(e.de)} → ${traco(e.para)}`}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  )
}
