import { useState } from 'react'
import { Badge, Button, Form, ListGroup, Modal, Stack } from 'react-bootstrap'
import { useAcao } from '../acao'
import { api } from '../api'
import { Cabecalho, Editor, useListas, Vazio, type Setor, type Usuario } from './comum'

const Papeis: [string, string][] = [
  ['ALUNO', 'Aluno'],
  ['ATENDENTE', 'Atendente'],
  ['ADMINISTRADOR', 'Administrador'],
]

// O formulário sempre tem texto e listas; a senha temporária vazia não vai para a API.
type Ficha = Pick<Usuario, 'cpf' | 'nome' | 'email' | 'papeis' | 'setores'> & { id?: number; senhaTemporaria: string }
type Edicao = { editando: Ficha; setEditando: (f: Ficha) => void; setores: Setor[] }
const Novo: Ficha = { cpf: '', nome: '', email: '', papeis: ['ATENDENTE'], setores: [], senhaTemporaria: '' }
const ficha = (u: Usuario): Ficha => ({ id: u.id, cpf: u.cpf, nome: u.nome, email: u.email, papeis: u.papeis, setores: u.setores, senhaTemporaria: '' })
const corpo = (u: Ficha) => ({ cpf: u.cpf, nome: u.nome, email: u.email, papeis: u.papeis, setores: u.setores, senhaTemporaria: u.senhaTemporaria || undefined })

// Usuário novo é criado; o existente é substituído pelo formulário inteiro.
function gravar(u: Ficha) {
  return u.id ? api(`/api/admin/usuarios/${u.id}`, corpo(u), 'PUT') : api('/api/admin/usuarios', corpo(u))
}

function ConfirmarDesativar({ u, fechar, confirmar }: { u?: Usuario; fechar: () => void; confirmar: () => void }) {
  return (
    <Modal show={!!u} onHide={fechar} centered>
      <Modal.Header closeButton>
        <Modal.Title>Desativar {u?.nome}?</Modal.Title>
      </Modal.Header>
      <Modal.Body>A pessoa perde o acesso na próxima requisição. Conversas, chamados e histórico ficam guardados; os chamados em que ela era responsável voltam para a fila do setor.</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={fechar}>
          Voltar
        </Button>
        <Button variant="danger" onClick={confirmar}>
          Desativar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function alternar<T>(lista: T[], valor: T) {
  return lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]
}

function ItemUsuario({ u, setores, editar, desativar }: { u: Usuario; setores: Map<number, string>; editar: () => void; desativar: () => void }) {
  const papeis = new Map(Papeis)
  return (
    <ListGroup.Item>
      <div className="d-flex justify-content-between gap-2 flex-wrap">
        <strong style={{ overflowWrap: 'anywhere' }}>{u.nome}</strong>
        {!u.ativo && <Badge bg="secondary">Desativado</Badge>}
      </div>
      <div className="small text-body-secondary" style={{ overflowWrap: 'anywhere' }}>
        CPF {u.cpf} · {u.email}
      </div>
      <div className="small">
        {u.papeis.map((p) => papeis.get(p)).join(', ')}
        {u.setores.length > 0 && ` · ${u.setores.map((s) => setores.get(s)).join(', ')}`}
      </div>
      {u.ativo && (
        <Stack direction="horizontal" gap={2} className="mt-2">
          <Button size="sm" variant="outline-primary" onClick={editar}>
            Editar
          </Button>
          <Button size="sm" variant="outline-danger" onClick={desativar}>
            Desativar
          </Button>
        </Stack>
      )}
    </ListGroup.Item>
  )
}

function PapeisESetores({ editando, setEditando, setores }: Edicao) {
  return (
    <>
      <Form.Group className="mb-2">
        <Form.Label>Papéis</Form.Label>
        {Papeis.map(([valor, rotulo]) => (
          <Form.Check key={valor} id={`papel-${valor}`} label={rotulo} checked={editando.papeis.includes(valor)} onChange={() => setEditando({ ...editando, papeis: alternar(editando.papeis, valor) })} />
        ))}
      </Form.Group>
      {editando.papeis.includes('ATENDENTE') && (
        <Form.Group className="mb-2">
          <Form.Label>Setores do atendente</Form.Label>
          {setores
            .filter((s) => s.ativo)
            .map((s) => (
              <Form.Check key={s.id} id={`setor-${s.id}`} label={s.nome} checked={editando.setores.includes(s.id)} onChange={() => setEditando({ ...editando, setores: alternar(editando.setores, s.id) })} />
            ))}
        </Form.Group>
      )}
    </>
  )
}

function CamposDoUsuario({ editando, setEditando, setores }: Edicao) {
  const muda = (chave: 'cpf' | 'nome' | 'email' | 'senhaTemporaria') => (e: { target: { value: string } }) => setEditando({ ...editando, [chave]: e.target.value })
  return (
    <>
      <Form.Group controlId="cpf" className="mb-2">
        <Form.Label>CPF</Form.Label>
        <Form.Control inputMode="numeric" value={editando.cpf} onChange={muda('cpf')} />
      </Form.Group>
      <Form.Group controlId="nome" className="mb-2">
        <Form.Label>Nome</Form.Label>
        <Form.Control value={editando.nome} onChange={muda('nome')} />
      </Form.Group>
      <Form.Group controlId="email" className="mb-2">
        <Form.Label>E-mail</Form.Label>
        <Form.Control type="email" value={editando.email} onChange={muda('email')} />
      </Form.Group>
      <PapeisESetores editando={editando} setEditando={setEditando} setores={setores} />
      <Form.Group controlId="senha">
        <Form.Label>Senha temporária (opcional)</Form.Label>
        <Form.Control type="password" autoComplete="new-password" value={editando.senhaTemporaria} onChange={muda('senhaTemporaria')} />
        <Form.Text>Com senha temporária, a pessoa troca a senha no primeiro login. Sem ela, entra pelo primeiro acesso por e-mail.</Form.Text>
      </Form.Group>
    </>
  )
}

// S8: atendentes e administradores; alunos chegam pela importação, mas também podem ser editados aqui.
export function Usuarios() {
  const { dados, carregar, carga } = useListas<{ usuarios: Usuario[]; setores: Setor[] }>({ usuarios: '/api/admin/usuarios', setores: '/api/admin/setores' })
  const [editando, setEditando] = useState<Ficha>()
  const [desativar, setDesativar] = useState<Usuario>()
  const acao = useAcao()
  const setores = dados ? dados.setores : []
  const nomes = new Map(setores.map((s) => [s.id, s.nome]))

  function salvar() {
    const u = editando!
    acao.executar(async () => {
      await gravar(u)
      setEditando(undefined)
      await carregar()
    })
  }

  function confirmarDesativar() {
    const u = desativar!
    setDesativar(undefined)
    acao.executar(async () => {
      await api(`/api/admin/usuarios/${u.id}/desativar`, {})
      await carregar()
    })
  }

  return (
    <>
      <Cabecalho titulo="Usuários" novo={() => setEditando({ ...Novo })} />
      {carga.alerta}
      {acao.alerta}
      <Vazio itens={dados?.usuarios} />
      <ListGroup>
        {dados?.usuarios.map((u) => (
          <ItemUsuario key={u.id} u={u} setores={nomes} editar={() => setEditando(ficha(u))} desativar={() => setDesativar(u)} />
        ))}
      </ListGroup>

      <Editor titulo={editando?.id ? 'Editar usuário' : 'Novo usuário'} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.pendente} alerta={acao.alerta}>
        {editando && <CamposDoUsuario editando={editando} setEditando={setEditando} setores={setores} />}
      </Editor>

      <ConfirmarDesativar u={desativar} fechar={() => setDesativar(undefined)} confirmar={confirmarDesativar} />
    </>
  )
}
