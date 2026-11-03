import { Plus } from 'lucide-react'
import { useState, type ComponentProps, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { BotaoAcao } from '../acao'
import { api } from '../api'
import { Opcoes } from '../Opcoes'
import { Periodo } from '../Periodo'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { Textarea } from '../ui/textarea'
import { ConfirmarArquivar, SeloEstado, SeloIndexacao, Situacao, useCatalogo, useGravacao, type Categoria, type Indexacao } from './comum'
import { Resposta } from './Resposta'

type Versao = { id: number; numero: number; titulo: string; perguntas: string[]; resposta: string; links: string[] }
type Artigo = { id: number; estado: 'RASCUNHO' | 'ATIVO' | 'ARQUIVADO'; indexacao: Indexacao | null; categoriaId: number; categoria: string; visivelDe: string | null; visivelAte: string | null; versao: Versao }
type Rascunho = { id?: number; titulo: string; perguntas: string; categoriaId: string; resposta: string; links: string; visivelDe: string; visivelAte: string }

const Novo: Rascunho = { titulo: '', perguntas: '', categoriaId: '', resposta: '', links: '', visivelDe: '', visivelAte: '' }
const dataBr = (iso: string) => iso.split('-').reverse().join('/')
const linhas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean)

const rascunho = (a: Artigo): Rascunho => ({
  id: a.id,
  titulo: a.versao.titulo,
  perguntas: a.versao.perguntas.join('\n'),
  categoriaId: String(a.categoriaId),
  resposta: a.versao.resposta,
  links: a.versao.links.join('\n'),
  visivelDe: a.visivelDe ?? '',
  visivelAte: a.visivelAte ?? '',
})

const corpo = (r: Rascunho) => ({
  titulo: r.titulo,
  perguntas: linhas(r.perguntas),
  categoriaId: Number(r.categoriaId),
  resposta: r.resposta,
  links: linhas(r.links),
  visivelDe: r.visivelDe || null,
  visivelAte: r.visivelAte || null,
})

function Validade({ a }: { a: Artigo }) {
  return (
    <>
      {a.visivelDe && ` · válido de ${dataBr(a.visivelDe)}`}
      {a.visivelAte && ` · válido até ${dataBr(a.visivelAte)}`}
    </>
  )
}

function ItemArtigo({ a, editar, mudar, arquivar, pendente }: { a: Artigo; editar: () => void; mudar: () => void; arquivar: () => void; pendente: boolean }) {
  return (
    <Card className="gap-1 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <strong className="min-w-0 break-words">{a.versao.titulo}</strong>
        <div className="flex shrink-0 gap-1">
          <SeloIndexacao valor={a.indexacao} />
          <SeloEstado estado={a.estado} />
        </div>
      </div>
      <div className="text-sm break-words text-muted-foreground">
        {a.categoria} · versão {a.versao.numero}
        <Validade a={a} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={editar}>
          Editar
        </Button>
        {a.estado !== 'ATIVO' && (
          <BotaoAcao size="sm" variant="outline" className="text-success" pendente={pendente} onClick={mudar}>
            Ativar
          </BotaoAcao>
        )}
        {a.estado !== 'ARQUIVADO' && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={arquivar} disabled={pendente}>
            Arquivar
          </Button>
        )}
      </div>
    </Card>
  )
}

function Campo({ id, rotulo, ...props }: { id: string; rotulo: string } & ComponentProps<'input'>) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} {...props} />
    </div>
  )
}

function CamposDoArtigo({ editando, setEditando, categorias }: { editando: Rascunho; setEditando: Dispatch<SetStateAction<Rascunho | undefined>>; categorias: Categoria[] }) {
  const muda = (chave: keyof Rascunho) => (e: { target: { value: string } }) => setEditando((r) => r && { ...r, [chave]: e.target.value })
  return (
    <>
      <p className="text-sm text-muted-foreground">{editando.id ? 'Salvar cria uma nova versão; as anteriores ficam guardadas.' : 'O artigo nasce como rascunho e só entra na base do assistente quando for ativado.'}</p>
      <Campo id="titulo" rotulo="Título" maxLength={200} value={editando.titulo} onChange={muda('titulo')} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="perguntas">Perguntas relacionadas (uma por linha)</Label>
        <Textarea id="perguntas" rows={3} value={editando.perguntas} onChange={muda('perguntas')} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="categoria">Categoria</Label>
        <NativeSelect id="categoria" className="w-full" value={editando.categoriaId} onChange={muda('categoriaId')}>
          <Opcoes vazio="Escolha a categoria" itens={categorias} />
        </NativeSelect>
      </div>
      <Resposta valor={editando.resposta} aoMudar={(resposta) => setEditando((r) => r && { ...r, resposta })} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="links">Links (um por linha, com https://)</Label>
        <Textarea id="links" rows={2} value={editando.links} onChange={muda('links')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo id="visivelDe" rotulo="Válido de (opcional)" type="date" value={editando.visivelDe} onChange={muda('visivelDe')} />
        <Campo id="visivelAte" rotulo="Válido até (opcional)" type="date" value={editando.visivelAte} onChange={muda('visivelAte')} />
      </div>
      <Periodo rotulo="Escolher validade no calendário" className="self-start" setDe={(visivelDe) => setEditando((r) => r && { ...r, visivelDe })} setAte={(visivelAte) => setEditando((r) => r && { ...r, visivelAte })} />
    </>
  )
}

// S7: a base interna que o assistente usa como fonte; nunca aparece para o aluno.
export function Artigos() {
  const { itens: artigos, categorias, erro, recarregar } = useCatalogo<Artigo>('/api/admin/artigos')
  const [editando, setEditando] = useState<Rascunho>()
  const [arquivar, setArquivar] = useState<Artigo>()
  const acao = useGravacao(recarregar)
  const alerta = acao.error && <Alert variant="destructive">{acao.error.message}</Alert>

  function salvar(e: FormEvent) {
    e.preventDefault()
    const r = editando!
    acao.mutate({
      chamar: () => api(r.id ? `/api/admin/artigos/${r.id}` : '/api/admin/artigos', corpo(r), r.id ? 'PUT' : undefined),
      aviso: 'Artigo salvo.',
      depois: () => setEditando(undefined),
    })
  }

  function mudar(a: Artigo, para: 'ativar' | 'arquivar') {
    setArquivar(undefined)
    acao.mutate({ chamar: () => api(`/api/admin/artigos/${a.id}/${para}`, {}), aviso: para === 'ativar' ? 'Artigo ativado.' : 'Artigo arquivado.' })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Artigos</h1>
        <Button onClick={() => setEditando({ ...Novo })}>
          <Plus aria-hidden="true" />
          Novo
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Orientações internas usadas pelo assistente. O aluno nunca vê os artigos, só a resposta.</p>
      {erro && <Alert variant="destructive">{erro}</Alert>}
      {!editando && alerta}
      <Situacao itens={artigos} erro={erro} />
      {artigos?.map((a) => (
        <ItemArtigo key={a.id} a={a} editar={() => setEditando(rascunho(a))} mudar={() => mudar(a, 'ativar')} arquivar={() => setArquivar(a)} pendente={acao.isPending} />
      ))}

      <Dialog open={!!editando} onOpenChange={(aberto) => !aberto && setEditando(undefined)}>
        <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <form onSubmit={salvar} className="contents">
            <DialogHeader>
              <DialogTitle>{editando?.id ? 'Editar artigo' : 'Novo artigo'}</DialogTitle>
            </DialogHeader>
            {editando && <CamposDoArtigo editando={editando} setEditando={setEditando} categorias={categorias} />}
            {alerta}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditando(undefined)}>
                Cancelar
              </Button>
              <BotaoAcao type="submit" pendente={acao.isPending}>
                Salvar
              </BotaoAcao>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmarArquivar tipo="artigo" titulo={arquivar?.versao.titulo} aberto={!!arquivar} fechar={() => setArquivar(undefined)} arquivar={() => mudar(arquivar!, 'arquivar')} />
    </div>
  )
}
