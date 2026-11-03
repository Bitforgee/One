import { BookText, FileText, Paperclip } from 'lucide-react'
import { Balao } from '../Balao'
import { Estados, type Chamado, type Evento, type Fonte, type MensagemChamado } from '../chamado'
import { formatarData } from '../datas'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { responsavel } from './Chamados'

export function Cabecalho({ c }: { c: Chamado }) {
  return (
    <>
      <h1 className="text-xl font-semibold break-words">
        {c.numero} · {c.titulo}
      </h1>
      <p className="mb-0 flex flex-wrap items-center gap-2">
        <Badge>{Estados[c.estado]}</Badge>
        <span className="text-sm text-muted-foreground">
          {c.setor} · {c.categoria} · {responsavel(c.responsavel)}
        </span>
      </p>
      {c.eventos && (
        <Card className="gap-2 py-3">
          <CardContent className="px-3 text-sm">
            <div>
              {c.solicitante} · matrícula {c.matricula.numero} · {c.matricula.curso} · {c.matricula.semestre}º semestre
            </div>
            {c.resumo && (
              <div className="mt-2">
                <div className="font-semibold">Resumo gerado por IA</div>
                <div className="break-words whitespace-pre-wrap">{c.resumo}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}

// RAG: a fonte citada, com o link do PDF da versão citada e o aviso de versão atualizada.
function FonteCitada({ f }: { f: Fonte }) {
  const documento = f.tipo === 'DOCUMENTO'
  const Icone = documento ? FileText : BookText
  return (
    <div className="mt-2 border-t pt-1 text-sm">
      <div className="flex items-center gap-1 font-semibold">
        <Icone role="img" aria-label={documento ? 'Documento' : 'Artigo'} className="size-4 shrink-0" />
        {f.titulo}
      </div>
      {f.trechos.map((t, j) => (
        <blockquote key={j} className="mb-1 break-words whitespace-pre-wrap italic">
          “{t}”
        </blockquote>
      ))}
      {documento && (
        <a href={`/api/documentos/versoes/${f.versaoDocumentoId}`} target="_blank" rel="noreferrer" className="text-primary underline">
          Abrir o PDF (versão {f.numero})
        </a>
      )}
      {f.atualizado && <div className="font-medium">{documento ? 'Este documento' : 'Este artigo'} foi atualizado depois desta resposta.</div>}
    </div>
  )
}

export function Transcricao({ c, fuso }: { c: Chamado; fuso: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">Conversa com o assistente</h2>
      {c.transcricao.map((m, i) => (
        <Balao key={i} doAluno={m.autor === 'ALUNO'} texto={m.texto} em={m.criadaEm} fuso={fuso}>
          {m.fontes?.map((f) => <FonteCitada key={`${f.tipo}-${f.versaoArtigoId}-${f.versaoDocumentoId}`} f={f} />)}
        </Balao>
      ))}
    </section>
  )
}

function Mensagem({ m, fuso }: { m: MensagemChamado; fuso: string }) {
  return (
    <Balao doAluno={m.doAluno} autor={m.autor} nota={m.tipo === 'NOTA'} texto={m.texto} em={m.criadaEm} fuso={fuso}>
      {m.anexos?.map((x) => (
        <div key={x.id} className="flex flex-wrap items-center gap-1 text-sm break-all">
          <Paperclip aria-hidden="true" className="size-4 shrink-0" />
          <a href={`/api/anexos/${x.id}`} target="_blank" rel="noreferrer" className="text-primary underline">
            {x.nome}
          </a>{' '}
          <span className="text-muted-foreground">({Math.ceil(x.tamanho / 1024)} KB)</span>
        </div>
      ))}
    </Balao>
  )
}

export function Mensagens({ mensagens, fuso }: { mensagens: MensagemChamado[]; fuso: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">Atendimento</h2>
      {mensagens.length === 0 && <p className="mb-0 text-sm text-muted-foreground">Nenhuma resposta ainda.</p>}
      {mensagens.map((m) => (
        <Mensagem key={m.id} m={m} fuso={fuso} />
      ))}
    </section>
  )
}

const traco = (v: string | null) => (v === null ? '—' : v)

export function Historico({ eventos, fuso }: { eventos: Evento[] | null; fuso: string }) {
  if (!eventos) return null
  return (
    <section>
      <h2 className="font-semibold">Histórico</h2>
      <ol className="mb-0 divide-y ps-0 text-sm" data-testid="eventos">
        {eventos.map((e, i) => (
          <li key={i} className="py-1 break-words">
            <span className="me-2 text-muted-foreground">{formatarData(e.criadoEm, fuso)}</span>
            {e.tipo} · {e.ator}
            {(e.de || e.para) && ` · ${traco(e.de)} → ${traco(e.para)}`}
          </li>
        ))}
      </ol>
    </section>
  )
}
