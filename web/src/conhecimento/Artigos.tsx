import { Plus } from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { BotaoAcao, useGravacao } from '../acao'
import { api, gravar } from '../api'
import { Cabecalho } from '../Cabecalho'
import { Campo } from '../Campo'
import { Editor } from '../Editor'
import { ErroDe } from '../ErroDe'
import { Opcoes } from '../Opcoes'
import { Situacao } from '../Situacao'
import { Periodo } from '../Periodo'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { Textarea } from '../ui/textarea'
import { ConfirmarArquivar, SeloEstado, SeloIndexacao, useCatalogo, type Categoria, type Indexacao } from './comum'
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
      <div className="grid grid-cols-2 items-end gap-2">
        <Campo id="visivelDe" rotulo="Válido de (opcional)" type="date" value={editando.visivelDe} onChange={muda('visivelDe')} />
        <Campo id="visivelAte" rotulo="Válido até (opcional)" type="date" value={editando.visivelAte} onChange={muda('visivelAte')} />
      </div>
      <Periodo rotulo="Escolher validade no calendário" className="self-start" setDe={(visivelDe) => setEditando((r) => r && { ...r, visivelDe })} setAte={(visivelAte) => setEditando((r) => r && { ...r, visivelAte })} />
    </>
  )
}

const Avisos = { ativar: 'Artigo ativado.', arquivar: 'Artigo arquivado.' }
const tituloDaJanela = (r?: Rascunho) => (r?.id ? 'Editar artigo' : 'Novo artigo')

// S7: a base interna que o assistente usa como fonte; nunca aparece para o aluno.
export function Artigos() {
  const { itens: artigos, categorias, erro, recarregar } = useCatalogo<Artigo>('/api/admin/artigos')
  const [editando, setEditando] = useState<Rascunho>()
  const [arquivar, setArquivar] = useState<Artigo>()
  const acao = useGravacao(recarregar)

  const salvar = () => acao.mutate({ chamar: () => gravar('/api/admin/artigos', editando!.id, corpo(editando!)), aviso: 'Artigo salvo.', depois: () => setEditando(undefined) })

  function mudar(a: Artigo, para: 'ativar' | 'arquivar') {
    setArquivar(undefined)
    acao.mutate({ chamar: () => api(`/api/admin/artigos/${a.id}/${para}`, {}), aviso: Avisos[para] })
  }

  return (
    <div className="flex flex-col gap-2">
      <Cabecalho botao="Novo" Icone={Plus} aoClicar={() => setEditando({ ...Novo })} />
      <p className="text-sm text-muted-foreground">Orientações internas usadas pelo assistente. O aluno nunca vê os artigos, só a resposta.</p>
      <ErroDe erro={erro} />
      <ErroDe erro={acao.error} oculto={!!editando} />
      <Situacao itens={artigos} erro={erro} />
      {artigos?.map((a) => (
        <ItemArtigo key={a.id} a={a} editar={() => setEditando(rascunho(a))} mudar={() => mudar(a, 'ativar')} arquivar={() => setArquivar(a)} pendente={acao.isPending} />
      ))}

      <Editor titulo={tituloDaJanela(editando)} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.isPending} alerta={<ErroDe erro={acao.error} />}>
        {editando && <CamposDoArtigo editando={editando} setEditando={setEditando} categorias={categorias} />}
      </Editor>

      <ConfirmarArquivar tipo="artigo" titulo={arquivar?.versao.titulo} aberto={!!arquivar} fechar={() => setArquivar(undefined)} arquivar={() => mudar(arquivar!, 'arquivar')} />
    </div>
  )
}
