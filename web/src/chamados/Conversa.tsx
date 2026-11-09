import { BookText, ChevronRight, FileText } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Balao, Quebravel } from '../Balao'
import { frase, type Chamado, type Evento, type Fonte, type MensagemChamado } from '../chamado'
import { formatarData } from '../datas'
import { LinkDeAnexo } from '../LinkDeAnexo'
import { Links, separarLinks } from '../LinksDaResposta'
import { Marca } from '../Marca'
import { Button } from '../ui/button'
import { responsavel, SeloDoChamado } from './Chamados'

export function Cabecalho({ c }: { c: Chamado }) {
  return (
    <>
      <div className="flex flex-col gap-4">
        <h2 className="m-0 font-heading text-2xl font-semibold tracking-tight break-words">{c.titulo}</h2>
        <p className="m-0 flex flex-wrap items-center gap-2">
          <SeloDoChamado estado={c.estado} />
          <span className="text-sm text-muted-foreground">
            {c.setor} · {c.categoria} · {responsavel(c.responsavel)}
          </span>
        </p>
      </div>
      {c.eventos && (
        <section className="flex flex-col gap-2 text-sm">
          <h2 className="m-0 text-base font-semibold">Dados do aluno</h2>
          <div>
            {c.solicitante}
            {c.matricula.numero && ` · matrícula ${c.matricula.numero}`} · {c.matricula.curso} · {c.matricula.semestre}º semestre
          </div>
        </section>
      )}
      {c.eventos && c.resumo && (
        <div className="rounded-md bg-muted p-4 text-sm">
          <div className="font-semibold">Resumo gerado por IA</div>
          <div className="break-words whitespace-pre-wrap">{c.resumo}</div>
        </div>
      )}
    </>
  )
}

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
  const [aberta, setAberta] = useState(false)
  if (c.transcricao.length === 0) return null
  const n = c.transcricao.length
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0">
        <button type="button" aria-expanded={aberta} aria-controls="transcricao" onClick={() => setAberta((a) => !a)} className="flex min-h-11 w-full items-center gap-2 rounded-xs text-start font-semibold hover:bg-accent">
          <ChevronRight aria-hidden="true" className={`size-4 shrink-0 transition-transform ${aberta ? 'rotate-90' : ''}`} />
          {`Conversa com o assistente · ${n} ${n === 1 ? 'mensagem' : 'mensagens'}`}
        </button>
      </h2>
      {aberta && (
        <div id="transcricao" className="flex flex-col gap-2">
          {c.transcricao.map((m, i) => {
            const { texto, links } = m.autor === 'ASSISTENTE' ? separarLinks(m.texto) : { texto: m.texto, links: [] }
            return (
              <Balao key={i} doAluno={m.autor === 'ALUNO'} texto={texto} comLinks={m.autor === 'ASSISTENTE'} em={m.criadaEm} fuso={fuso}>
                {m.anexos?.map((x) => <LinkDeAnexo key={x.id} href={`/api/conversas/anexos/${x.id}`} nome={x.nome} tamanho={x.tamanho} />)}
                {links.length > 0 && <Links links={links} />}
                {m.fontes?.map((f) => <FonteCitada key={`${f.tipo}-${f.versaoArtigoId}-${f.versaoDocumentoId}`} f={f} />)}
              </Balao>
            )
          })}
        </div>
      )}
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

type Item = { chave: string; em: string; evento?: Evento; mensagem?: MensagemChamado }

function sequencia(mensagens: MensagemChamado[], eventos: Evento[] | null, comEventos: boolean): Item[] {
  const itens: Item[] = mensagens.map((m) => ({ chave: `m${m.id}`, em: m.criadaEm, mensagem: m }))
  if (comEventos) eventos?.forEach((e, i) => itens.push({ chave: `e${i}`, em: e.criadoEm, evento: e }))
  return itens.sort((a, b) => Date.parse(a.em) - Date.parse(b.em) || Number(!!b.evento) - Number(!!a.evento))
}

function useMaisQueUmaTela(lista: RefObject<HTMLOListElement | null>, n: number) {
  const [longa, setLonga] = useState(false)
  useLayoutEffect(() => {
    const medir = () => setLonga((lista.current?.offsetHeight ?? 0) > window.innerHeight)
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [lista, n])
  return longa
}

export function LinhaDoTempo({ mensagens, eventos, fuso }: { mensagens: MensagemChamado[]; eventos: Evento[] | null; fuso: string }) {
  const [comEventos, setComEventos] = useState(true)
  const lista = useRef<HTMLOListElement>(null)
  const itens = sequencia(mensagens, eventos, comEventos)
  const longa = useMaisQueUmaTela(lista, itens.length)
  return (
    <section className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
      <h2 className="font-semibold">Atendimento</h2>
      <div className="flex flex-wrap items-center justify-end gap-x-4">
        {eventos && <Marca id="eventos" rotulo="Eventos" marcado={comEventos} mudar={setComEventos} />}
        {longa && (
          <Button type="button" size="sm" variant="outline" onClick={() => lista.current?.lastElementChild?.scrollIntoView({ block: 'end' })}>
            Ir para o mais recente
          </Button>
        )}
      </div>
      {itens.length === 0 && <p className="col-span-2 mb-0 text-sm text-muted-foreground">Nenhuma resposta ainda.</p>}
      <ol ref={lista} className="col-span-2 m-0 flex list-none flex-col gap-2 p-0" data-testid="linha-do-tempo">
        {itens.map((i) =>
          i.evento ? (
            <li key={i.chave} className="scroll-mb-[52dvh] py-1 text-center text-xs break-words text-muted-foreground">
              <time dateTime={i.evento.criadoEm} className="text-muted-foreground">{formatarData(i.evento.criadoEm, fuso)}</time> · {frase(i.evento)}
            </li>
          ) : (
            <li key={i.chave} className="flex scroll-mb-[52dvh] flex-col">
              <Mensagem m={i.mensagem!} fuso={fuso} />
            </li>
          ),
        )}
      </ol>
    </section>
  )
}