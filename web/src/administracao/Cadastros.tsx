import { Plus, Search, SearchX, Workflow } from 'lucide-react'
import { useState, type Dispatch, type JSX, type ReactNode, type SetStateAction } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useGravacao, useLeituras } from '../acao'
import { gravar } from '../api'
import { ErroDoCampo } from '../Campo'
import { Editor } from '../Editor'
import { ErroDe, errosDeCampo } from '../ErroDe'
import { Marca } from '../Marca'
import { Opcoes } from '../Opcoes'
import { CelulaLargo, Detalhe, Principal, Tabela, type Vazio } from '../Tabela'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { TableCell, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { abrangenciaDoFluxo, semLideranca, SemestresDe1a12, type Fluxo } from './comum'
import { linhas, type Aba, type Linha, type Listas } from './LinhasDosCadastros'

type Ficha = Record<string, any>
type Campos = { editando: Ficha; setEditando: Dispatch<SetStateAction<Ficha | undefined>>; dados?: Listas; erros: Record<string, string> }
const CamposComErro = ['nome', 'titulo', 'texto', 'setorId', 'categoriaId', 'setorCoordenacaoId', 'cursoId', 'semestre']

const Titulos: Record<Aba, string> = { setores: 'Setores', categorias: 'Categorias', cursos: 'Cursos', fluxos: 'Fluxos', prontas: 'Respostas prontas' }
const Rotas: Record<Aba, string> = { setores: 'setores', categorias: 'categorias', cursos: 'cursos', fluxos: 'fluxos', prontas: 'respostas-prontas' }
const Novos: Record<Aba, Ficha> = {
  setores: { nome: '', triagem: false, ativo: true, lideranca: false, cursoId: '', semestre: '' },
  categorias: { nome: '', ativa: true },
  cursos: { nome: '', setorCoordenacaoId: '' },
  fluxos: { categoriaId: '', abrangencia: 'TODOS', cursoId: '', semestre: '' },
  prontas: { setorId: '', titulo: '', texto: '' },
}
const ficha = (x: object): Ficha => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v === null ? '' : v]))
const num = (v: string | number) => (v === '' ? null : Number(v))

const Corpos: Record<Aba, (r: Ficha) => unknown> = {
  setores: (r) => ({ nome: r.nome, triagem: r.triagem, ativo: r.ativo, ...(r.lideranca ? { cursoId: num(r.cursoId), semestre: num(r.semestre) } : {}) }),
  categorias: (r) => ({ nome: r.nome, ativa: r.ativa }),
  cursos: (r) => ({ nome: r.nome, setorCoordenacaoId: num(r.setorCoordenacaoId) }),
  fluxos: (r) => ({ categoriaId: num(r.categoriaId), cursoId: r.abrangencia === 'TODOS' ? null : num(r.cursoId), semestre: r.abrangencia === 'SEMESTRE' ? num(r.semestre) : null }),
  prontas: (r) => ({ setorId: num(r.setorId), titulo: r.titulo, texto: r.texto }),
}

const Colunas = [{ titulo: 'Nome' }, { titulo: 'Detalhe', largo: true }]
const Ajudas: Record<Aba, string> = {
  setores: 'Quem atende os chamados. Cada setor tem a sua fila.',
  categorias: 'Os assuntos dos chamados. Cada categoria pode ter um fluxo.',
  cursos: 'Os cursos da instituição e o setor que coordena cada um.',
  fluxos: 'O caminho que o chamado percorre, etapa por etapa, até alguém responder.',
  prontas: 'Textos prontos que o atendente insere ao responder.',
}
const SemFluxo: Vazio = { Icone: Workflow, titulo: 'Nenhum fluxo', frase: 'Sem fluxo, os chamados vão para a Triagem.' }
const Botoes: Record<Aba, string> = { setores: 'Novo setor', categorias: 'Nova categoria', cursos: 'Novo curso', fluxos: 'Novo fluxo', prontas: 'Nova resposta pronta' }
const simples = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const SemResultado = (busca: string, limpar: () => void): Vazio => ({
  Icone: SearchX,
  titulo: `Nenhum resultado para «${busca}»`,
  frase: 'Confira a grafia ou limpe a busca.',
  acao: (
    <Button type="button" variant="outline" onClick={limpar}>
      Limpar busca
    </Button>
  ),
})

function CabecalhoDaAba({ aba, busca, buscar, novo }: { aba: Aba; busca: string; buscar: (b: string) => void; novo: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="m-0 font-heading text-xl font-semibold">{Titulos[aba]}</h2>
          <p className="m-0 text-sm text-muted-foreground">{Ajudas[aba]}</p>
        </div>
        <Button type="button" onClick={novo}>
          <Plus aria-hidden="true" />
          {Botoes[aba]}
        </Button>
      </div>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" aria-label={`Buscar em ${Titulos[aba]}`} placeholder="Buscar pelo nome" className="ps-9" value={busca} onChange={(e) => buscar(e.target.value)} />
      </div>
    </div>
  )
}

function ListaDaAba({ itens, erro, linha, editar, vazio }: { itens?: { id: number }[]; erro?: Error; linha: (x: any) => Linha; editar: (x: object) => void; vazio?: Vazio }) {
  return (
    <Tabela colunas={Colunas} itens={itens} erro={erro} vazio={vazio}>
      {itens?.map((x) => {
        const [principal, detalhe] = linha(x)
        return (
          <TableRow key={x.id} className="min-h-12 cursor-pointer md:h-12" onClick={() => editar(x)}>
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

function TurmaDaLideranca(c: Campos) {
  const { editando } = c
  if (editando.id) {
    return editando.cursoId ? (
      <p className="m-0 text-sm text-muted-foreground">{`Liderança de semestre: ${abrangenciaDoFluxo({ cursoId: editando.cursoId, semestre: editando.semestre }, c.dados?.cursos ?? [])}`}</p>
    ) : null
  }
  return (
    <>
      <Marca id="cad-lideranca" rotulo="Liderança de semestre" marcado={editando.lideranca} mudar={(v) => c.setEditando((f) => f && { ...f, lideranca: v })} />
      {editando.lideranca && (
        <>
          <Escolha c={c} id="cad-lideranca-curso" rotulo="Curso" chave="cursoId" vazio="Escolha o curso" itens={c.dados?.cursos} />
          <Rotulado id="cad-lideranca-semestre" rotulo="Semestre" erro={c.erros.semestre}>
            <NativeSelect id="cad-lideranca-semestre" className="w-full" {...campo(c, 'semestre', 'cad-lideranca-semestre')}>
              <option value="">Escolha o semestre</option>
              {SemestresDe1a12.map((n) => (
                <option key={n} value={n}>
                  {n}º semestre
                </option>
              ))}
            </NativeSelect>
          </Rotulado>
        </>
      )}
    </>
  )
}

const CamposDeSetor = (c: Campos) => (
  <>
    <NomeEMarcas
      c={c}
      marcas={[
        ['cad-triagem', 'Setor de triagem (exatamente um na instituição)', 'triagem'],
        ['cad-ativo', 'Ativo', 'ativo'],
      ]}
    />
    <TurmaDaLideranca {...c} />
  </>
)

const CamposDeCategoria = (c: Campos) => <NomeEMarcas c={c} marcas={[['cad-ativa', 'Ativa', 'ativa']]} />

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
    <Escolha c={c} id="cad-coordenacao" rotulo="Setor de coordenação" chave="setorCoordenacaoId" vazio="Sem coordenação (vai para a triagem)" itens={c.dados?.setores.filter(semLideranca)} />
  </>
)

const Abrangencias: [string, string][] = [
  ['TODOS', 'Todos os cursos'],
  ['CURSO', 'Um curso'],
  ['SEMESTRE', 'Um semestre de um curso'],
]

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

type Painel = { aba: Aba; dados?: Listas; erro?: Error; novo: () => void; editar: (x: object) => void }

function PainelDaAba({ aba, dados, erro, novo, editar }: Painel) {
  const [busca, setBusca] = useState('')
  const linha = dados ? linhas(dados)[aba] : undefined
  const todos = dados?.[aba] as { id: number }[] | undefined
  const itens = busca.trim() && todos && linha ? todos.filter((x) => simples(linha(x)[0]).includes(simples(busca.trim()))) : todos
  const vazio = busca.trim() && todos?.length ? SemResultado(busca.trim(), () => setBusca('')) : aba === 'fluxos' ? SemFluxo : undefined
  return (
    <>
      <CabecalhoDaAba aba={aba} busca={busca} buscar={setBusca} novo={novo} />
      <ListaDaAba itens={itens} erro={erro} linha={(x) => linha!(x)} editar={editar} vazio={vazio} />
    </>
  )
}

function Navegacao({ abas, dados }: { abas: Aba[]; dados?: Listas }) {
  return (
    <TabsList className="hidden h-auto w-56 shrink-0 flex-col items-stretch gap-0.5 self-start bg-transparent p-0 @4xl/main:flex">
      {abas.map((k) => (
        <TabsTrigger key={k} value={k} className="h-9 flex-none justify-between px-3 data-[state=active]:bg-accent data-[state=active]:shadow-none">
          {Titulos[k]}
          <span aria-hidden="true" className="text-xs text-muted-foreground tabular-nums">
            {dados?.[k].length}
          </span>
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

export function Cadastros() {
  const { dados, erro, recarregar } = useLeituras<Listas>({
    setores: '/api/admin/setores',
    categorias: '/api/admin/categorias',
    cursos: '/api/admin/cursos',
    fluxos: '/api/admin/fluxos',
    prontas: '/api/admin/respostas-prontas',
  })
  const [params, setParams] = useSearchParams()
  const { slug } = useParams()
  const navegar = useNavigate()
  const pedida = params.get('aba') as Aba | null
  const aba: Aba = pedida && pedida in Titulos ? pedida : 'setores'
  const setAba = (k: Aba) => setParams(k === 'setores' ? {} : { aba: k }, { replace: true })
  const [editando, setEditando] = useState<Ficha>()
  const acao = useGravacao(recarregar)
  const Campos = CamposDaAba[aba]
  const abas = Object.keys(Titulos) as Aba[]

  function salvar() {
    const { id, ...resto } = editando!
    acao.mutate({ chamar: () => gravar(`/api/admin/${Rotas[aba]}`, id, Corpos[aba](resto)), aviso: 'Cadastro salvo.', depois: () => setEditando(undefined) })
  }
  const editar = (x: object) => (aba === 'fluxos' ? navegar(`/${slug}/cadastros/fluxos/${(x as Fluxo).id}`) : setEditando(ficha(x)))

  return (
    <div className="flex flex-col gap-2">
      <ErroDe erro={erro} oque="os cadastros" tentar={recarregar} />
      <Tabs orientation="vertical" value={aba} onValueChange={(k) => setAba(k as Aba)} className="gap-4 @4xl/main:flex-row @4xl/main:gap-8">
        <div className="@4xl/main:hidden">
          <NativeSelect aria-label="Cadastro" className="w-full min-w-0" value={aba} onChange={(e) => setAba(e.target.value as Aba)}>
          {abas.map((k) => (
            <option key={k} value={k}>
              {Titulos[k]}
            </option>
          ))}
        </NativeSelect>
        </div>
        <Navegacao abas={abas} dados={dados} />
        {abas.map((k) => (
          <TabsContent key={k} value={k} className="flex min-w-0 flex-1 flex-col gap-4">
            <PainelDaAba aba={k} dados={dados} erro={erro} novo={() => setEditando({ ...Novos[k] })} editar={editar} />
          </TabsContent>
        ))}
      </Tabs>

      <Editor titulo={tituloDaJanela(aba, editando)} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.isPending} alerta={<ErroDe erro={acao.error} campos={CamposComErro} />}>
        {editando && <Campos editando={editando} setEditando={setEditando} dados={dados} erros={errosDeCampo(acao.error)} />}
      </Editor>
    </div>
  )
}