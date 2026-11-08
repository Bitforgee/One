import { Plus, Workflow } from 'lucide-react'
import { useState, type Dispatch, type JSX, type ReactNode, type SetStateAction } from 'react'
import { useGravacao, useLeituras } from '../acao'
import { gravar } from '../api'
import { Cabecalho } from '../Cabecalho'
import { ErroDoCampo } from '../Campo'
import { Editor } from '../Editor'
import { ErroDe, errosDeCampo } from '../ErroDe'
import { Marca } from '../Marca'
import { Opcoes } from '../Opcoes'
import { CelulaLargo, Detalhe, Principal, Tabela, type Vazio } from '../Tabela'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { TableCell, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { abrangenciaDoFluxo, cadeiaDoFluxo, SemestresDe1a12, type Categoria, type Curso, type Fluxo, type Pronta, type Setor } from './comum'
import { EdicaoDoFluxo } from './EdicaoDoFluxo'

type Listas = { setores: Setor[]; categorias: Categoria[]; cursos: Curso[]; fluxos: Fluxo[]; prontas: Pronta[] }
type Aba = keyof Listas
// O formulário guarda o registro com texto no lugar de null; a API trata texto vazio e null do mesmo jeito.
type Ficha = Record<string, any>
type Campos = { editando: Ficha; setEditando: Dispatch<SetStateAction<Ficha | undefined>>; dados?: Listas; erros: Record<string, string> }
const CamposComErro = ['nome', 'titulo', 'texto', 'setorId', 'categoriaId', 'setorCoordenacaoId', 'cursoId', 'semestre']

const Titulos: Record<Aba, string> = { setores: 'Setores', categorias: 'Categorias', cursos: 'Cursos', fluxos: 'Fluxos', prontas: 'Respostas prontas' }
const Rotas: Record<Aba, string> = { setores: 'setores', categorias: 'categorias', cursos: 'cursos', fluxos: 'fluxos', prontas: 'respostas-prontas' }
const Novos: Record<Aba, Ficha> = {
  setores: { nome: '', triagem: false, ativo: true },
  categorias: { nome: '', ativa: true },
  cursos: { nome: '', setorCoordenacaoId: '' },
  fluxos: { categoriaId: '', abrangencia: 'TODOS', cursoId: '', semestre: '' },
  prontas: { setorId: '', titulo: '', texto: '' },
}
const ficha = (x: object): Ficha => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v === null ? '' : v]))
const num = (v: string | number) => (v === '' ? null : Number(v))

const Corpos: Record<Aba, (r: Ficha) => unknown> = {
  setores: (r) => ({ nome: r.nome, triagem: r.triagem, ativo: r.ativo }),
  categorias: (r) => ({ nome: r.nome, ativa: r.ativa }),
  cursos: (r) => ({ nome: r.nome, setorCoordenacaoId: num(r.setorCoordenacaoId) }),
  fluxos: (r) => ({ categoriaId: num(r.categoriaId), cursoId: r.abrangencia === 'TODOS' ? null : num(r.cursoId), semestre: r.abrangencia === 'SEMESTRE' ? num(r.semestre) : null }),
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
    fluxos: (f: Fluxo) => [nome(dados.categorias, f.categoriaId), `${abrangenciaDoFluxo(f, dados.cursos)} · ${cadeiaDoFluxo(f.vigente, dados.setores)}`],
    prontas: (p: Pronta) => [p.titulo, nome(dados.setores, p.setorId)],
  }
}

const Colunas = [{ titulo: 'Nome' }, { titulo: 'Detalhe', largo: true }]
const SemFluxo: Vazio = { Icone: Workflow, titulo: 'Nenhum fluxo', frase: 'Sem fluxo, os chamados vão para a Triagem.' }

// Cada linha: o nome, que é um botão que abre o editor, e o que distingue o registro (em coluna no largo, sob o nome no estreito).
function ListaDaAba({ itens, erro, linha, editar, vazio }: { itens?: { id: number }[]; erro?: Error; linha: (x: any) => [string, string]; editar: (x: object) => void; vazio?: Vazio }) {
  return (
    <Tabela colunas={Colunas} itens={itens} erro={erro} vazio={vazio}>
      {itens?.map((x) => {
        const [principal, detalhe] = linha(x)
        return (
          <TableRow key={x.id} className="h-12 min-h-12 cursor-pointer" onClick={() => editar(x)}>
            <TableCell className={Principal}>
              <button type="button" className="text-start font-medium hover:underline">
                {principal}
              </button>
              {detalhe && <Detalhe>{detalhe}</Detalhe>}
            </TableCell>
            <CelulaLargo>{detalhe}</CelulaLargo>
          </TableRow>
        )
      })}
    </Tabela>
  )
}

const campo = ({ setEditando, editando, erros }: Campos, k: string, id: string) => ({
  value: editando[k],
  'aria-invalid': !!erros[k],
  'aria-describedby': erros[k] ? `${id}-erro` : undefined,
  onChange: (e: { target: { value: string } }) => setEditando((f) => f && { ...f, [k]: e.target.value }),
})

function Rotulado({ id, rotulo, erro, children }: { id: string; rotulo: string; erro?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      <ErroDoCampo id={id} erro={erro} />
    </div>
  )
}

function CampoNome(c: Campos) {
  return (
    <Rotulado id="cad-nome" rotulo="Nome" erro={c.erros.nome}>
      <Input id="cad-nome" {...campo(c, 'nome', 'cad-nome')} />
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
    <Rotulado id={id} rotulo={rotulo} erro={c.erros[chave]}>
      <NativeSelect id={id} className="w-full" {...campo(c, chave, id)}>
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

const Abrangencias: [string, string][] = [
  ['TODOS', 'Todos os cursos'],
  ['CURSO', 'Um curso'],
  ['SEMESTRE', 'Um semestre de um curso'],
]

// O fluxo novo: a categoria e a abrangência (todos os cursos, um curso, ou um semestre de um curso); o curso e o semestre só aparecem quando a abrangência os pede.
function CamposDeFluxo(c: Campos) {
  const abrangencia = c.editando.abrangencia
  return (
    <>
      <Escolha c={c} id="cad-categoria" rotulo="Categoria" chave="categoriaId" vazio="Escolha a categoria" itens={c.dados?.categorias.filter((x) => !x.padrao)} />
      <Rotulado id="cad-abrangencia" rotulo="Abrangência" erro={c.erros.abrangencia}>
        <NativeSelect id="cad-abrangencia" className="w-full" {...campo(c, 'abrangencia', 'cad-abrangencia')}>
          {Abrangencias.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </NativeSelect>
      </Rotulado>
      {abrangencia !== 'TODOS' && <Escolha c={c} id="cad-curso" rotulo="Curso" chave="cursoId" vazio="Escolha o curso" itens={c.dados?.cursos} />}
      {abrangencia === 'SEMESTRE' && (
        <Rotulado id="cad-semestre" rotulo="Semestre" erro={c.erros.semestre}>
          <NativeSelect id="cad-semestre" className="w-full" {...campo(c, 'semestre', 'cad-semestre')}>
            <option value="">Escolha o semestre</option>
            {SemestresDe1a12.map((n) => (
              <option key={n} value={n}>
                {n}º semestre
              </option>
            ))}
          </NativeSelect>
        </Rotulado>
      )}
    </>
  )
}
const CamposDePronta = (c: Campos) => (
  <>
    <Escolha c={c} id="cad-setor-pronta" rotulo="Setor" chave="setorId" vazio="Escolha o setor" itens={c.dados?.setores} />
    <Rotulado id="cad-titulo" rotulo="Título" erro={c.erros.titulo}>
      <Input id="cad-titulo" {...campo(c, 'titulo', 'cad-titulo')} />
    </Rotulado>
    <Rotulado id="cad-texto" rotulo="Texto" erro={c.erros.texto}>
      <Textarea id="cad-texto" rows={4} maxLength={4000} {...campo(c, 'texto', 'cad-texto')} />
    </Rotulado>
  </>
)

const CamposDaAba: Record<Aba, (c: Campos) => JSX.Element> = {
  setores: CamposDeSetor,
  categorias: CamposDeCategoria,
  cursos: CamposDeCurso,
  fluxos: CamposDeFluxo,
  prontas: CamposDePronta,
}

const tituloDaJanela = (aba: Aba, f?: Ficha) => `${f?.id ? 'Editar' : 'Novo'}: ${Titulos[aba]}`

// Setores, categorias, cursos, fluxos de atendimento e respostas prontas.
export function Cadastros() {
  const { dados, erro, recarregar } = useLeituras<Listas>({
    setores: '/api/admin/setores',
    categorias: '/api/admin/categorias',
    cursos: '/api/admin/cursos',
    fluxos: '/api/admin/fluxos',
    prontas: '/api/admin/respostas-prontas',
  })
  const [aba, setAba] = useState<Aba>('setores')
  const [editando, setEditando] = useState<Ficha>()
  const [fluxoAberto, setFluxoAberto] = useState<number>()
  const acao = useGravacao(recarregar)
  const Campos = CamposDaAba[aba]
  const abas = Object.keys(Titulos) as Aba[]

  function salvar() {
    const { id, ...resto } = editando!
    acao.mutate({ chamar: () => gravar(`/api/admin/${Rotas[aba]}`, id, Corpos[aba](resto)), aviso: 'Cadastro salvo.', depois: () => setEditando(undefined) })
  }

  return (
    <div className="flex flex-col gap-2">
      <ErroDe erro={erro} oque="os cadastros" tentar={recarregar} />
      <Tabs value={aba} onValueChange={(k) => setAba(k as Aba)} className="gap-2">
        <Cabecalho linha botao="Novo" Icone={Plus} aoClicar={() => setEditando({ ...Novos[aba] })}>
          <NativeSelect aria-label="Cadastro" className="w-full min-w-0 @4xl/main:hidden" value={aba} onChange={(e) => setAba(e.target.value as Aba)}>
            {abas.map((k) => (
              <option key={k} value={k}>
                {Titulos[k]}
              </option>
            ))}
          </NativeSelect>
          <TabsList className="hidden @4xl/main:inline-flex">
            {abas.map((k) => (
              <TabsTrigger key={k} value={k}>
                {Titulos[k]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Cabecalho>
        {abas.map((k) => (
          <TabsContent key={k} value={k} className="flex flex-col gap-2">
            <ListaDaAba itens={dados?.[k]} erro={erro} linha={(x) => linhas(dados!)[k](x)} editar={(x) => (k === 'fluxos' ? setFluxoAberto((x as Fluxo).id) : setEditando(ficha(x)))} vazio={k === 'fluxos' ? SemFluxo : undefined} />
          </TabsContent>
        ))}
      </Tabs>

      {dados && fluxoAberto && dados.fluxos.some((f) => f.id === fluxoAberto) && (
        <EdicaoDoFluxo key={fluxoAberto} fluxo={dados.fluxos.find((f) => f.id === fluxoAberto)!} categorias={dados.categorias} cursos={dados.cursos} setores={dados.setores} fechar={() => setFluxoAberto(undefined)} recarregar={recarregar} />
      )}
      <Editor titulo={tituloDaJanela(aba, editando)} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.isPending} alerta={<ErroDe erro={acao.error} campos={CamposComErro} />}>
        {editando && <Campos editando={editando} setEditando={setEditando} dados={dados} erros={errosDeCampo(acao.error)} />}
      </Editor>
    </div>
  )
}
