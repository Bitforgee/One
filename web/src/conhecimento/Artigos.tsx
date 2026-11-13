import { BookText, Plus } from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { useGravacao } from '../acao'
import { api, gravar } from '../api'
import { Cabecalho } from '../Cabecalho'
import { Campo, ErroDoCampo, useFocoNoPrimeiroErro } from '../Campo'
import { Editor } from '../Editor'
import { ErroDe, errosDeCampo } from '../ErroDe'
import { Opcoes } from '../Opcoes'
import { Periodo } from '../Periodo'
import { Button } from '../ui/button'
import { CelulaLargo, Detalhe, MenuAcoes, Principal, Tabela } from '../Tabela'
import { DropdownMenuItem } from '../ui/dropdown-menu'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { TableCell, TableRow } from '../ui/table'
import { Textarea } from '../ui/textarea'
import { ConfirmarArquivar, IconeIndexacao, SeloEstado, useCatalogo, type Categoria, type Indexacao } from './comum'
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

const Colunas = [{ titulo: 'Título' }, { titulo: 'Categoria', largo: true }, { titulo: 'Versão', largo: true }, { titulo: 'Validade', largo: true }, { titulo: 'Situação' }, { titulo: '' }]

const validade = (a: Artigo) => [a.visivelDe && `válido de ${dataBr(a.visivelDe)}`, a.visivelAte && `válido até ${dataBr(a.visivelAte)}`].filter(Boolean).join(' · ')

function LinhaArtigo({ a, editar, mudar, arquivar, pendente }: { a: Artigo; editar: () => void; mudar: () => void; arquivar: () => void; pendente: boolean }) {
  const versao = `versão ${a.versao.numero}`
  return (
    <TableRow>
      <TableCell className={`font-medium ${Principal}`}>
        <span>{a.versao.titulo}</span>
        <IconeIndexacao valor={a.indexacao} />
        <Detalhe>{[a.categoria, versao, validade(a)].filter(Boolean).join(' · ')}</Detalhe>
      </TableCell>
      <CelulaLargo>{a.categoria}</CelulaLargo>
      <CelulaLargo>{versao}</CelulaLargo>
      <CelulaLargo>{validade(a)}</CelulaLargo>
      <TableCell data-celula="selo">
        <SeloEstado estado={a.estado} />
      </TableCell>
      <TableCell data-celula="acoes" className="text-end">
        <MenuAcoes nome={a.versao.titulo} pendente={pendente}>
          <DropdownMenuItem onSelect={editar}>Editar</DropdownMenuItem>
          {a.estado !== 'ATIVO' && (
            <DropdownMenuItem disabled={pendente} onSelect={mudar}>
              Ativar
            </DropdownMenuItem>
          )}
          {a.estado !== 'ARQUIVADO' && (
            <DropdownMenuItem variant="destructive" disabled={pendente} onSelect={arquivar}>
              Arquivar
            </DropdownMenuItem>
          )}
        </MenuAcoes>
      </TableCell>
    </TableRow>
  )
}

function CamposDoArtigo({ editando, setEditando, categorias, erros }: { editando: Rascunho; setEditando: Dispatch<SetStateAction<Rascunho | undefined>>; categorias: Categoria[]; erros: Record<string, string> }) {
  const muda = (chave: keyof Rascunho) => (e: { target: { value: string } }) => setEditando((r) => r && { ...r, [chave]: e.target.value })
  return (
    <>
      <p className="text-sm text-muted-foreground">{editando.id ? 'Salvar cria uma nova versão; as anteriores ficam guardadas.' : 'O artigo nasce como rascunho e só entra na base do assistente quando for ativado.'}</p>
      <Campo id="titulo" rotulo="Título" autoComplete="off" maxLength={200} value={editando.titulo} erro={erros.titulo} onChange={muda('titulo')} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="perguntas">Perguntas relacionadas (uma por linha)</Label>
        <Textarea id="perguntas" rows={3} value={editando.perguntas} aria-invalid={!!erros.perguntas} aria-describedby={erros.perguntas ? 'perguntas-erro' : undefined} onChange={muda('perguntas')} />
        <ErroDoCampo id="perguntas" erro={erros.perguntas} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="categoria">Categoria</Label>
        <NativeSelect id="categoria" className="w-full" value={editando.categoriaId} aria-invalid={!!erros.categoriaId} aria-describedby={erros.categoriaId ? 'categoria-erro' : undefined} onChange={muda('categoriaId')}>
          <Opcoes vazio="Escolha a categoria" itens={categorias} />
        </NativeSelect>
        <ErroDoCampo id="categoria" erro={erros.categoriaId} />
      </div>
      <Resposta valor={editando.resposta} aoMudar={(resposta) => setEditando((r) => r && { ...r, resposta })} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="links">Links (um por linha, com https://)</Label>
        <Textarea id="links" rows={2} value={editando.links} aria-invalid={!!erros.links} aria-describedby={erros.links ? 'links-erro' : undefined} onChange={muda('links')} />
        <ErroDoCampo id="links" erro={erros.links} />
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <Campo id="visivelDe" rotulo="Válido de (opcional)" type="date" value={editando.visivelDe} erro={erros.visivelDe} onChange={muda('visivelDe')} />
        <Campo id="visivelAte" rotulo="Válido até (opcional)" type="date" value={editando.visivelAte} erro={erros.visivelAte} onChange={muda('visivelAte')} />
      </div>
      <Periodo rotulo="Escolher validade no calendário" className="self-start" setDe={(visivelDe) => setEditando((r) => r && { ...r, visivelDe })} setAte={(visivelAte) => setEditando((r) => r && { ...r, visivelAte })} />
    </>
  )
}

const CamposComErro = ['titulo', 'perguntas', 'categoriaId', 'links', 'visivelDe', 'visivelAte']
const Avisos = { ativar: 'Artigo ativado.', arquivar: 'Artigo arquivado.' }
const tituloDaJanela = (r?: Rascunho) => (r?.id ? 'Editar artigo' : 'Novo artigo')

export function Artigos() {
  const { itens: artigos, categorias, erro, recarregar } = useCatalogo<Artigo>('/api/admin/artigos')
  const vazia = artigos?.length === 0
  const [editando, setEditando] = useState<Rascunho>()
  const [arquivar, setArquivar] = useState<Artigo>()
  const acao = useGravacao(recarregar)
  useFocoNoPrimeiroErro(acao.error)

  const salvar = () => acao.mutate({ chamar: () => gravar('/api/admin/artigos', editando!.id, corpo(editando!)), aviso: 'Artigo salvo.', depois: () => setEditando(undefined) })

  function mudar(a: Artigo, para: 'ativar' | 'arquivar') {
    setArquivar(undefined)
    acao.mutate({ chamar: () => api(`/api/admin/artigos/${a.id}/${para}`, {}), aviso: Avisos[para] })
  }

  return (
    <div className="flex flex-col gap-2">
      <Cabecalho botao={vazia ? undefined : 'Novo'} Icone={Plus} aoClicar={() => setEditando({ ...Novo })}>
        <p className="text-sm text-muted-foreground">Orientações internas usadas pelo assistente. O aluno nunca vê os artigos, só a resposta.</p>
      </Cabecalho>
      <ErroDe erro={erro} oque="os artigos" tentar={recarregar} />
      <ErroDe erro={acao.error} oculto={!!editando} />
      <Tabela
        colunas={Colunas}
        itens={artigos}
        erro={erro}
        vazio={{ Icone: BookText, titulo: 'Nenhum artigo', frase: 'Os artigos são a base das respostas do assistente.', acao: <Button onClick={() => setEditando({ ...Novo })}>Novo artigo</Button> }}
      >
        {artigos?.map((a) => (
          <LinhaArtigo key={a.id} a={a} editar={() => setEditando(rascunho(a))} mudar={() => mudar(a, 'ativar')} arquivar={() => setArquivar(a)} pendente={acao.isPending} />
        ))}
      </Tabela>

      <Editor titulo={tituloDaJanela(editando)} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.isPending} alerta={<ErroDe erro={acao.error} campos={CamposComErro} />}>
        {editando && <CamposDoArtigo editando={editando} setEditando={setEditando} categorias={categorias} erros={errosDeCampo(acao.error)} />}
      </Editor>

      <ConfirmarArquivar tipo="artigo" titulo={arquivar?.versao.titulo} aberto={!!arquivar} fechar={() => setArquivar(undefined)} arquivar={() => mudar(arquivar!, 'arquivar')} />
    </div>
  )
}
