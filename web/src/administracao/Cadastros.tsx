import { Plus } from 'lucide-react'
import { useState, type Dispatch, type JSX, type ReactNode, type SetStateAction } from 'react'
import { useGravacao, useLeituras } from '../acao'
import { gravar } from '../api'
import { Cabecalho } from '../Cabecalho'
import { Editor } from '../Editor'
import { ErroDe } from '../ErroDe'
import { Marca } from '../Marca'
import { Opcoes } from '../Opcoes'
import { Situacao } from '../Situacao'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import type { Categoria, Curso, Pronta, Regra, Setor } from './comum'

type Listas = { setores: Setor[]; categorias: Categoria[]; cursos: Curso[]; regras: Regra[]; prontas: Pronta[] }
type Aba = keyof Listas
// O formulário guarda o registro com texto no lugar de null; a API trata texto vazio e null do mesmo jeito.
type Ficha = Record<string, any>
type Campos = { editando: Ficha; setEditando: Dispatch<SetStateAction<Ficha | undefined>>; dados?: Listas }

const Titulos: Record<Aba, string> = { setores: 'Setores', categorias: 'Categorias', cursos: 'Cursos', regras: 'Regras', prontas: 'Respostas prontas' }
const Rotas: Record<Aba, string> = { setores: 'setores', categorias: 'categorias', cursos: 'cursos', regras: 'regras', prontas: 'respostas-prontas' }
const Novos: Record<Aba, Ficha> = {
  setores: { nome: '', triagem: false, ativo: true },
  categorias: { nome: '', ativa: true },
  cursos: { nome: '', setorCoordenacaoId: '' },
  regras: { categoriaId: '', destino: 'SETOR', setorId: '' },
  prontas: { setorId: '', titulo: '', texto: '' },
}
const ficha = (x: object): Ficha => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v === null ? '' : v]))
const num = (v: string | number) => (v === '' ? null : Number(v))

const Corpos: Record<Aba, (r: Ficha) => unknown> = {
  setores: (r) => ({ nome: r.nome, triagem: r.triagem, ativo: r.ativo }),
  categorias: (r) => ({ nome: r.nome, ativa: r.ativa }),
  cursos: (r) => ({ nome: r.nome, setorCoordenacaoId: num(r.setorCoordenacaoId) }),
  regras: (r) => ({ categoriaId: num(r.categoriaId), destino: r.destino, setorId: r.destino === 'SETOR' ? num(r.setorId) : null }),
  prontas: (r) => ({ setorId: num(r.setorId), titulo: r.titulo, texto: r.texto }),
}

// Linha da lista de cada aba: o nome e, abaixo, o que distingue o registro.
function linhas(dados: Listas): Record<Aba, (x: any) => [string, string]> {
  const nome = (lista: { id: number; nome: string }[], id: number | null) => {
    const nomes = new Map(lista.map((x) => [x.id, x.nome]))
    return nomes.has(id!) ? nomes.get(id!)! : '—'
  }
  return {
    setores: (s: Setor) => [s.nome, [s.triagem && 'triagem', !s.ativo && 'inativo'].filter(Boolean).join(' · ')],
    categorias: (c: Categoria) => [c.nome, [c.padrao && 'padrão', !c.ativa && 'inativa'].filter(Boolean).join(' · ')],
    cursos: (c: Curso) => [c.nome, `coordenação: ${nome(dados.setores, c.setorCoordenacaoId)}`],
    regras: (r: Regra) => [nome(dados.categorias, r.categoriaId), r.destino === 'SETOR' ? `setor ${nome(dados.setores, r.setorId)}` : 'coordenação do curso'],
    prontas: (p: Pronta) => [p.titulo, nome(dados.setores, p.setorId)],
  }
}

// Cada linha é um botão da largura da lista: o nome e, abaixo, o que distingue o registro.
function ListaDaAba({ itens, linha, editar }: { itens?: { id: number }[]; linha: (x: any) => [string, string]; editar: (x: object) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {itens?.map((x) => {
        const [principal, detalhe] = linha(x)
        return (
          <button key={x.id} type="button" onClick={() => editar(x)} className="w-full rounded-lg border px-3 py-2 text-start hover:bg-accent">
            <div className="break-words">{principal}</div>
            {detalhe && <div className="text-sm text-muted-foreground">{detalhe}</div>}
          </button>
        )
      })}
    </div>
  )
}

const campo = ({ setEditando, editando }: Campos, k: string) => ({
  value: editando[k],
  onChange: (e: { target: { value: string } }) => setEditando((f) => f && { ...f, [k]: e.target.value }),
})

function Rotulado({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  )
}

function CampoNome(c: Campos) {
  return (
    <Rotulado id="cad-nome" rotulo="Nome">
      <Input id="cad-nome" {...campo(c, 'nome')} />
    </Rotulado>
  )
}

// Setor e categoria: o nome e as marcas que ligam e desligam o registro.
function NomeEMarcas({ c, marcas }: { c: Campos; marcas: [id: string, rotulo: string, chave: string][] }) {
  return (
    <>
      <CampoNome {...c} />
      {marcas.map(([id, rotulo, chave]) => (
        <Marca key={id} id={id} rotulo={rotulo} marcado={c.editando[chave]} mudar={(v) => c.setEditando((f) => f && { ...f, [chave]: v })} />
      ))}
    </>
  )
}

const CamposDeSetor = (c: Campos) => (
  <NomeEMarcas
    c={c}
    marcas={[
      ['cad-triagem', 'Setor de triagem (exatamente um na instituição)', 'triagem'],
      ['cad-ativo', 'Ativo', 'ativo'],
    ]}
  />
)

const CamposDeCategoria = (c: Campos) => <NomeEMarcas c={c} marcas={[['cad-ativa', 'Ativa', 'ativa']]} />

// Lista nativa de um cadastro (door 5): a primeira opção, vazia, pede a escolha.
function Escolha({ c, id, rotulo, chave, vazio, itens }: { c: Campos; id: string; rotulo: string; chave: string; vazio: string; itens?: { id: number; nome: string }[] }) {
  return (
    <Rotulado id={id} rotulo={rotulo}>
      <NativeSelect id={id} className="w-full" {...campo(c, chave)}>
        <Opcoes vazio={vazio} itens={itens} />
      </NativeSelect>
    </Rotulado>
  )
}

const CamposDeCurso = (c: Campos) => (
  <>
    <CampoNome {...c} />
    <Escolha c={c} id="cad-coordenacao" rotulo="Setor de coordenação" chave="setorCoordenacaoId" vazio="Sem coordenação (vai para a triagem)" itens={c.dados?.setores} />
  </>
)

function CamposDeRegra(c: Campos) {
  return (
    <>
      <Escolha c={c} id="cad-categoria" rotulo="Categoria" chave="categoriaId" vazio="Escolha a categoria" itens={c.dados?.categorias.filter((x) => !x.padrao)} />
      <Rotulado id="cad-destino" rotulo="Destino">
        <NativeSelect id="cad-destino" className="w-full" {...campo(c, 'destino')}>
          <option value="SETOR">Setor fixo</option>
          <option value="COORDENACAO_CURSO">Coordenação do curso da matrícula</option>
        </NativeSelect>
      </Rotulado>
      {c.editando.destino === 'SETOR' && <Escolha c={c} id="cad-setor" rotulo="Setor" chave="setorId" vazio="Escolha o setor" itens={c.dados?.setores} />}
    </>
  )
}

const CamposDePronta = (c: Campos) => (
  <>
    <Escolha c={c} id="cad-setor-pronta" rotulo="Setor" chave="setorId" vazio="Escolha o setor" itens={c.dados?.setores} />
    <Rotulado id="cad-titulo" rotulo="Título">
      <Input id="cad-titulo" {...campo(c, 'titulo')} />
    </Rotulado>
    <Rotulado id="cad-texto" rotulo="Texto">
      <Textarea id="cad-texto" rows={4} maxLength={4000} {...campo(c, 'texto')} />
    </Rotulado>
  </>
)

const CamposDaAba: Record<Aba, (c: Campos) => JSX.Element> = {
  setores: CamposDeSetor,
  categorias: CamposDeCategoria,
  cursos: CamposDeCurso,
  regras: CamposDeRegra,
  prontas: CamposDePronta,
}

const tituloDaJanela = (aba: Aba, f?: Ficha) => `${f?.id ? 'Editar' : 'Novo'}: ${Titulos[aba]}`

// Setores, categorias, cursos, regras de roteamento e respostas prontas.
export function Cadastros() {
  const { dados, erro, recarregar } = useLeituras<Listas>({
    setores: '/api/admin/setores',
    categorias: '/api/admin/categorias',
    cursos: '/api/admin/cursos',
    regras: '/api/admin/regras',
    prontas: '/api/admin/respostas-prontas',
  })
  const [aba, setAba] = useState<Aba>('setores')
  const [editando, setEditando] = useState<Ficha>()
  const acao = useGravacao(recarregar)
  const Campos = CamposDaAba[aba]
  const abas = Object.keys(Titulos) as Aba[]

  function salvar() {
    const { id, ...resto } = editando!
    acao.mutate({ chamar: () => gravar(`/api/admin/${Rotas[aba]}`, id, Corpos[aba](resto)), aviso: 'Cadastro salvo.', depois: () => setEditando(undefined) })
  }

  return (
    <div className="flex flex-col gap-2">
      <Cabecalho titulo="Cadastros" botao="Novo" Icone={Plus} aoClicar={() => setEditando({ ...Novos[aba] })} />
      <ErroDe erro={erro} />
      <Tabs value={aba} onValueChange={(k) => setAba(k as Aba)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {abas.map((k) => (
            <TabsTrigger key={k} value={k} className="flex-none">
              {Titulos[k]}
            </TabsTrigger>
          ))}
        </TabsList>
        {abas.map((k) => (
          <TabsContent key={k} value={k} className="flex flex-col gap-2">
            <Situacao itens={dados?.[k]} erro={erro} />
            <ListaDaAba itens={dados?.[k]} linha={(x) => linhas(dados!)[k](x)} editar={(x) => setEditando(ficha(x))} />
          </TabsContent>
        ))}
      </Tabs>

      <Editor titulo={tituloDaJanela(aba, editando)} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.isPending} alerta={<ErroDe erro={acao.error} />}>
        {editando && <Campos editando={editando} setEditando={setEditando} dados={dados} />}
      </Editor>
    </div>
  )
}
