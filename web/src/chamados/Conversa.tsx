import { BookText, FileText } from 'lucide-react'
import { Balao, Quebravel } from '../Balao'
import { frase, type Chamado, type Evento, type Fonte, type MensagemChamado } from '../chamado'
import { formatarData } from '../datas'
import { LinkDeAnexo } from '../LinkDeAnexo'
import { Card, CardContent } from '../ui/card'
import { responsavel, SeloDoChamado } from './Chamados'

export function Cabecalho({ c }: { c: Chamado }) {
  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight break-words">{c.titulo}</h2>
      <p className="mb-0 flex flex-wrap items-center gap-2">
        <SeloDoChamado estado={c.estado} />
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
          “<Quebravel texto={t} />”
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
          {m.anexos?.map((x) => <LinkDeAnexo key={x.id} href={`/api/conversas/anexos/${x.id}`} nome={x.nome} tamanho={x.tamanho} />)}
          {m.fontes?.map((f) => <FonteCitada key={`${f.tipo}-${f.versaoArtigoId}-${f.versaoDocumentoId}`} f={f} />)}
        </Balao>
      ))}
    </section>
  )
}

function Mensagem({ m, fuso }: { m: MensagemChamado; fuso: string }) {
  return (
    <Balao doAluno={m.doAluno} autor={m.autor} nota={m.tipo === 'NOTA'} texto={m.texto} em={m.criadaEm} fuso={fuso}>
      {m.anexos?.map((x) => <LinkDeAnexo key={x.id} href={`/api/anexos/${x.id}`} nome={x.nome} tamanho={x.tamanho} />)}
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

export function Historico({ eventos, fuso }: { eventos: Evento[] | null; fuso: string }) {
  if (!eventos) return null
  return (
    <Card>
      <CardContent>
        <section className="flex flex-col gap-2">
          <h2 className="leading-none font-semibold">Histórico</h2>
          <ol className="mb-0 divide-y ps-0 text-sm" data-testid="eventos">
            {eventos.map((e, i) => (
              <li key={i} className="py-1 break-words">
                <span className="text-muted-foreground">{formatarData(e.criadoEm, fuso)}</span> · {frase(e)}
              </li>
            ))}
          </ol>
        </section>
      </CardContent>
    </Card>
  )
}
