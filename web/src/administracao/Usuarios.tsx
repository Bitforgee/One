import { Plus } from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { useGravacao, useLeituras } from '../acao'
import { api, gravar } from '../api'
import { Cabecalho } from '../Cabecalho'
import { Campo } from '../Campo'
import { Confirmar } from '../Confirmar'
import { Editor } from '../Editor'
import { ErroDe } from '../ErroDe'
import { Marca } from '../Marca'
import { Situacao } from '../Situacao'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Label } from '../ui/label'
import type { Setor, Usuario } from './comum'

const Papeis: [string, string][] = [
  ['ALUNO', 'Aluno'],
  ['ATENDENTE', 'Atendente'],
  ['ADMINISTRADOR', 'Administrador'],
]

// O formulário sempre tem texto e listas; a senha temporária vazia não vai para a API.
type Ficha = Pick<Usuario, 'cpf' | 'nome' | 'email' | 'papeis' | 'setores'> & { id?: number; senhaTemporaria: string }
type Edicao = { editando: Ficha; setEditando: Dispatch<SetStateAction<Ficha | undefined>>; setores: Setor[] }
const Novo: Ficha = { cpf: '', nome: '', email: '', papeis: ['ATENDENTE'], setores: [], senhaTemporaria: '' }
const ficha = (u: Usuario): Ficha => ({ id: u.id, cpf: u.cpf, nome: u.nome, email: u.email, papeis: u.papeis, setores: u.setores, senhaTemporaria: '' })
const corpo = (u: Ficha) => ({ cpf: u.cpf, nome: u.nome, email: u.email, papeis: u.papeis, setores: u.setores, senhaTemporaria: u.senhaTemporaria || undefined })

function alternar<T>(lista: T[], valor: T) {
  return lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]
}

function ItemUsuario({ u, setores, editar, desativar }: { u: Usuario; setores: Map<number, string>; editar: () => void; desativar: () => void }) {
  const papeis = new Map(Papeis)
  return (
    <Card className="gap-1 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <strong className="min-w-0 break-words">{u.nome}</strong>
        {!u.ativo && <Badge variant="secondary">Desativado</Badge>}
      </div>
      <div className="text-sm break-words text-muted-foreground">
        CPF {u.cpf} · {u.email}
      </div>
      <div className="text-sm">
        {u.papeis.map((p) => papeis.get(p)).join(', ')}
        {u.setores.length > 0 && ` · ${u.setores.map((s) => setores.get(s)).join(', ')}`}
      </div>
      {u.ativo && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={editar}>
            Editar
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={desativar}>
            Desativar
          </Button>
        </div>
      )}
    </Card>
  )
}

function PapeisESetores({ editando, setEditando, setores }: Edicao) {
  const marcar = (chave: 'papeis' | 'setores', valor: string | number) => setEditando((f) => f && { ...f, [chave]: alternar(f[chave] as (string | number)[], valor) })
  return (
    <>
      <div className="flex flex-col">
        <Label>Papéis</Label>
        {Papeis.map(([valor, rotulo]) => (
          <Marca key={valor} id={`papel-${valor}`} rotulo={rotulo} marcado={editando.papeis.includes(valor)} mudar={() => marcar('papeis', valor)} />
        ))}
      </div>
      {editando.papeis.includes('ATENDENTE') && (
        <div className="flex flex-col">
          <Label>Setores do atendente</Label>
          {setores
            .filter((s) => s.ativo)
            .map((s) => (
              <Marca key={s.id} id={`setor-${s.id}`} rotulo={s.nome} marcado={editando.setores.includes(s.id)} mudar={() => marcar('setores', s.id)} />
            ))}
        </div>
      )}
    </>
  )
}

function CamposDoUsuario({ editando, setEditando, setores }: Edicao) {
  const muda = (chave: 'cpf' | 'nome' | 'email' | 'senhaTemporaria') => (e: { target: { value: string } }) => setEditando((f) => f && { ...f, [chave]: e.target.value })
  return (
    <>
      <Campo id="cpf" rotulo="CPF" inputMode="numeric" value={editando.cpf} onChange={muda('cpf')} />
      <Campo id="nome" rotulo="Nome" value={editando.nome} onChange={muda('nome')} />
      <Campo id="email" rotulo="E-mail" type="email" value={editando.email} onChange={muda('email')} />
      <PapeisESetores editando={editando} setEditando={setEditando} setores={setores} />
      <div className="flex flex-col gap-2">
        <Campo id="senha" rotulo="Senha temporária (opcional)" type="password" autoComplete="new-password" value={editando.senhaTemporaria} onChange={muda('senhaTemporaria')} />
        <p className="text-sm text-muted-foreground">Com senha temporária, a pessoa troca a senha no primeiro login. Sem ela, entra pelo primeiro acesso por e-mail.</p>
      </div>
    </>
  )
}

const tituloDaJanela = (f?: Ficha) => (f?.id ? 'Editar usuário' : 'Novo usuário')

// S8: atendentes e administradores; alunos chegam pela importação, mas também podem ser editados aqui.
export function Usuarios() {
  const { dados, erro, recarregar } = useLeituras<{ usuarios: Usuario[]; setores: Setor[] }>({ usuarios: '/api/admin/usuarios', setores: '/api/admin/setores' })
  const [editando, setEditando] = useState<Ficha>()
  const [desativar, setDesativar] = useState<Usuario>()
  const acao = useGravacao(recarregar)
  const setores = dados?.setores ?? []
  const nomes = new Map(setores.map((s) => [s.id, s.nome]))

  const salvar = () => acao.mutate({ chamar: () => gravar('/api/admin/usuarios', editando!.id, corpo(editando!)), aviso: 'Usuário salvo.', depois: () => setEditando(undefined) })

  function confirmarDesativar() {
    const u = desativar!
    setDesativar(undefined)
    acao.mutate({ chamar: () => api(`/api/admin/usuarios/${u.id}/desativar`, {}), aviso: 'Usuário desativado.' })
  }

  return (
    <div className="flex flex-col gap-2">
      <Cabecalho botao="Novo" Icone={Plus} aoClicar={() => setEditando({ ...Novo })} />
      <ErroDe erro={erro} />
      <ErroDe erro={acao.error} oculto={!!editando} />
      <Situacao itens={dados?.usuarios} erro={erro} />
      {dados?.usuarios.map((u) => (
        <ItemUsuario key={u.id} u={u} setores={nomes} editar={() => setEditando(ficha(u))} desativar={() => setDesativar(u)} />
      ))}

      <Editor titulo={tituloDaJanela(editando)} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.isPending} alerta={<ErroDe erro={acao.error} />}>
        {editando && <CamposDoUsuario editando={editando} setEditando={setEditando} setores={setores} />}
      </Editor>

      <Confirmar aberto={!!desativar} fechar={() => setDesativar(undefined)} titulo={`Desativar ${desativar?.nome}?`} botao="Desativar" destrutivo confirmar={confirmarDesativar}>
        A pessoa perde o acesso na próxima requisição. Conversas, chamados e histórico ficam guardados; os chamados em que ela era responsável voltam para a fila do setor.
      </Confirmar>
    </div>
  )
}
