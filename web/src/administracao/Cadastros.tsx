import { useState, type JSX } from 'react'
import { Form, ListGroup, Tab, Tabs } from 'react-bootstrap'
import { useAcao } from '../acao'
import { api } from '../api'
import { Opcoes } from '../Opcoes'
import { Cabecalho, Editor, useListas, Vazio, type Categoria, type Curso, type Pronta, type Regra, type Setor } from './comum'

type Listas = { setores: Setor[]; categorias: Categoria[]; cursos: Curso[]; regras: Regra[]; prontas: Pronta[] }
type Aba = keyof Listas
// O formulário guarda o registro com texto no lugar de null; a API trata texto vazio e null do mesmo jeito.
type Ficha = Record<string, any>
type Campos = { editando: Ficha; setEditando: (f: Ficha) => void; dados?: Listas }

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

function ListaDaAba({ itens, linha, editar }: { itens?: { id: number }[]; linha: (x: any) => [string, string]; editar: (x: object) => void }) {
  return (
    <ListGroup>
      {itens?.map((x) => {
        const [principal, detalhe] = linha(x)
        return (
          <ListGroup.Item key={x.id} action onClick={() => editar(x)}>
            <div style={{ overflowWrap: 'anywhere' }}>{principal}</div>
            {detalhe && <div className="small text-body-secondary">{detalhe}</div>}
          </ListGroup.Item>
        )
      })}
    </ListGroup>
  )
}

const campo = ({ editando, setEditando }: Campos, k: string) => ({ value: editando[k], onChange: (e: { target: { value: string } }) => setEditando({ ...editando, [k]: e.target.value }) })

function CampoNome(c: Campos) {
  return (
    <Form.Group controlId="cad-nome" className="mb-2">
      <Form.Label>Nome</Form.Label>
      <Form.Control {...campo(c, 'nome')} />
    </Form.Group>
  )
}

// Setor e categoria: o nome e as marcas que ligam e desligam o registro.
function NomeEMarcas({ c, marcas }: { c: Campos; marcas: [id: string, rotulo: string, chave: string][] }) {
  return (
    <>
      <CampoNome {...c} />
      {marcas.map(([id, rotulo, chave]) => (
        <Form.Check key={id} id={id} label={rotulo} checked={c.editando[chave]} onChange={(e) => c.setEditando({ ...c.editando, [chave]: e.target.checked })} />
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

function CamposDeCurso(c: Campos) {
  return (
    <>
      <CampoNome {...c} />
      <Form.Group controlId="cad-coordenacao">
        <Form.Label>Setor de coordenação</Form.Label>
        <Form.Select {...campo(c, 'setorCoordenacaoId')}>
          <Opcoes vazio="Sem coordenação (vai para a triagem)" itens={c.dados?.setores} />
        </Form.Select>
      </Form.Group>
    </>
  )
}

function CamposDeRegra(c: Campos) {
  return (
    <>
      <Form.Group controlId="cad-categoria" className="mb-2">
        <Form.Label>Categoria</Form.Label>
        <Form.Select {...campo(c, 'categoriaId')}>
          <Opcoes vazio="Escolha a categoria" itens={c.dados?.categorias.filter((x) => !x.padrao)} />
        </Form.Select>
      </Form.Group>
      <Form.Group controlId="cad-destino" className="mb-2">
        <Form.Label>Destino</Form.Label>
        <Form.Select {...campo(c, 'destino')}>
          <option value="SETOR">Setor fixo</option>
          <option value="COORDENACAO_CURSO">Coordenação do curso da matrícula</option>
        </Form.Select>
      </Form.Group>
      {c.editando.destino === 'SETOR' && (
        <Form.Group controlId="cad-setor">
          <Form.Label>Setor</Form.Label>
          <Form.Select {...campo(c, 'setorId')}>
            <Opcoes vazio="Escolha o setor" itens={c.dados?.setores} />
          </Form.Select>
        </Form.Group>
      )}
    </>
  )
}

function CamposDePronta(c: Campos) {
  return (
    <>
      <Form.Group controlId="cad-setor-pronta" className="mb-2">
        <Form.Label>Setor</Form.Label>
        <Form.Select {...campo(c, 'setorId')}>
          <Opcoes vazio="Escolha o setor" itens={c.dados?.setores} />
        </Form.Select>
      </Form.Group>
      <Form.Group controlId="cad-titulo" className="mb-2">
        <Form.Label>Título</Form.Label>
        <Form.Control {...campo(c, 'titulo')} />
      </Form.Group>
      <Form.Group controlId="cad-texto">
        <Form.Label>Texto</Form.Label>
        <Form.Control as="textarea" rows={4} maxLength={4000} {...campo(c, 'texto')} />
      </Form.Group>
    </>
  )
}

const CamposDaAba: Record<Aba, (c: Campos) => JSX.Element> = {
  setores: CamposDeSetor,
  categorias: CamposDeCategoria,
  cursos: CamposDeCurso,
  regras: CamposDeRegra,
  prontas: CamposDePronta,
}

// Setores, categorias, cursos, regras de roteamento e respostas prontas.
export function Cadastros() {
  const { dados, carregar, carga } = useListas<Listas>({
    setores: '/api/admin/setores',
    categorias: '/api/admin/categorias',
    cursos: '/api/admin/cursos',
    regras: '/api/admin/regras',
    prontas: '/api/admin/respostas-prontas',
  })
  const [aba, setAba] = useState<Aba>('setores')
  const [editando, setEditando] = useState<Ficha>()
  const acao = useAcao()
  const Campos = CamposDaAba[aba]

  function salvar() {
    const { id, ...resto } = editando!
    acao.executar(async () => {
      await api(`/api/admin/${Rotas[aba]}${id ? `/${id}` : ''}`, Corpos[aba](resto), id ? 'PUT' : undefined)
      setEditando(undefined)
      await carregar()
    })
  }

  return (
    <>
      <Cabecalho titulo="Cadastros" novo={() => setEditando({ ...Novos[aba] })} />
      {carga.alerta}
      <Tabs activeKey={aba} onSelect={(k) => setAba(k as Aba)} className="mb-3 flex-nowrap overflow-x-auto overflow-y-hidden">
        {(Object.keys(Titulos) as Aba[]).map((k) => (
          <Tab key={k} eventKey={k} title={Titulos[k]}>
            <Vazio itens={dados?.[k]} />
            <ListaDaAba itens={dados?.[k]} linha={(x) => linhas(dados!)[k](x)} editar={(x) => setEditando(ficha(x))} />
          </Tab>
        ))}
      </Tabs>

      <Editor titulo={`${editando?.id ? 'Editar' : 'Novo'}: ${Titulos[aba]}`} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.pendente} alerta={acao.alerta}>
        {editando && <Campos editando={editando} setEditando={setEditando} dados={dados} />}
      </Editor>
    </>
  )
}
