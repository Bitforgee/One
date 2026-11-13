import { Plus, Users } from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { useGravacao, useLeituras } from '../acao'
import { api, gravar } from '../api'
import { Cabecalho } from '../Cabecalho'
import { Campo, useFocoNoPrimeiroErro } from '../Campo'
import { Confirmar } from '../Confirmar'
import { Editor, useSujo } from '../Editor'
import { ErroDe, errosDeCampo } from '../ErroDe'
import { Literal } from '../Literal'
import { Marca } from '../Marca'
import { CelulaLargo, Detalhe, MenuAcoes, Principal, Tabela, useMostrarMais } from '../Tabela'
import { Badge } from '../ui/badge'
import { DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { TableCell, TableRow } from '../ui/table'
import { useBuscaNaUrl, useEditarNaUrl } from '../urlDaTela'
import { cpfFormatado, type Setor, type Usuario } from './comum'

const Papeis: [string, string][] = [
  ['ALUNO', 'Aluno'],
  ['ATENDENTE', 'Atendente'],
  ['ADMINISTRADOR', 'Administrador'],
]

type Ficha = Pick<Usuario, 'cpf' | 'nome' | 'email' | 'papeis' | 'setores'> & { id?: number; senhaTemporaria: string }
type Edicao = { editando: Ficha; setEditando: Dispatch<SetStateAction<Ficha | undefined>>; setores: Setor[] }
const Novo: Ficha = { cpf: '', nome: '', email: '', papeis: ['ATENDENTE'], setores: [], senhaTemporaria: '' }
const daTela = (papeis: string[]) => papeis.filter((p) => Papeis.some(([valor]) => valor === p))
const ficha = (u: Usuario): Ficha => ({ id: u.id, cpf: u.cpf, nome: u.nome, email: u.email, papeis: daTela(u.papeis), setores: u.setores, senhaTemporaria: '' })
const corpo = (u: Ficha) => ({ cpf: u.cpf, nome: u.nome, email: u.email, papeis: u.papeis, setores: u.setores, senhaTemporaria: u.senhaTemporaria || undefined })

function alternar<T>(lista: T[], valor: T) {
  return lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]
}

const Colunas = [{ titulo: 'Nome' }, { titulo: 'CPF', largo: true }, { titulo: 'E-mail', largo: true }, { titulo: 'Papéis', largo: true }, { titulo: 'Situação' }, { titulo: '' }]

function LinhaUsuario({ u, setores, editar, desativar, pendente }: { u: Usuario; setores: Map<number, string>; editar: () => void; desativar: () => void; pendente: boolean }) {
  const papeis = new Map(Papeis)
  const perfil = daTela(u.papeis).map((p) => papeis.get(p)).join(', ') + (u.setores.length > 0 ? ` · ${u.setores.map((s) => setores.get(s)).join(', ')}` : '')
  return (
    <TableRow>
      <TableCell className={`font-medium ${Principal}`}>
        {u.nome}
        <Detalhe>
          <Literal>{cpfFormatado(u.cpf)}</Literal> · <Literal>{u.email}</Literal> · {perfil}
        </Detalhe>
      </TableCell>
      <CelulaLargo>
        <Literal>{cpfFormatado(u.cpf)}</Literal>
      </CelulaLargo>
      <CelulaLargo>
        <Literal>{u.email}</Literal>
      </CelulaLargo>
      <CelulaLargo>{perfil}</CelulaLargo>
      <TableCell data-celula="selo">{!u.ativo && <Badge variant="secondary">Desativado</Badge>}</TableCell>
      <TableCell data-celula="acoes" className="text-end">
        {u.ativo && (
          <MenuAcoes nome={u.nome} pendente={pendente}>
            <DropdownMenuItem onSelect={editar}>Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={desativar}>
              Desativar
            </DropdownMenuItem>
          </MenuAcoes>
        )}
      </TableCell>
    </TableRow>
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

function CamposDoUsuario({ editando, setEditando, setores, erros }: Edicao & { erros: Record<string, string> }) {
  const muda = (chave: 'cpf' | 'nome' | 'email' | 'senhaTemporaria') => (e: { target: { value: string } }) => setEditando((f) => f && { ...f, [chave]: e.target.value })
  return (
    <>
      <Campo id="cpf" rotulo="CPF" inputMode="numeric" autoComplete="off" spellCheck={false} placeholder="Ex.: 000.000.000-00…" value={editando.cpf} erro={erros.cpf} onChange={muda('cpf')} />
      <Campo id="nome" rotulo="Nome" value={editando.nome} erro={erros.nome} onChange={muda('nome')} />
      <Campo id="email" rotulo="E-mail" type="email" autoComplete="off" spellCheck={false} value={editando.email} erro={erros.email} onChange={muda('email')} />
      <PapeisESetores editando={editando} setEditando={setEditando} setores={setores} />
      <div className="flex flex-col gap-2">
        <Campo id="senha" rotulo="Senha temporária (opcional)" type="password" autoComplete="new-password" value={editando.senhaTemporaria} erro={erros.senhaTemporaria} onChange={muda('senhaTemporaria')} />
        <p className="text-sm text-muted-foreground">Com senha temporária, a pessoa troca a senha no primeiro login. Sem ela, entra pelo primeiro acesso por e-mail.</p>
      </div>
    </>
  )
}

const CamposComErro = ['cpf', 'nome', 'email', 'senhaTemporaria']
const semAcento = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function casa(u: Usuario, busca: string) {
  const t = semAcento(busca.trim())
  const digitos = t.replace(/\D/g, '')
  return !t || semAcento(u.nome).includes(t) || semAcento(u.email).includes(t) || cpfFormatado(u.cpf).includes(t) || (digitos !== '' && u.cpf.includes(digitos))
}

const tituloDaJanela = (f?: Ficha) => (f?.id ? 'Editar usuário' : 'Novo usuário')

export function Usuarios() {
  const { dados, erro, recarregar } = useLeituras<{ usuarios: Usuario[]; setores: Setor[] }>({ usuarios: '/api/admin/usuarios', setores: '/api/admin/setores' })
  const [desativar, setDesativar] = useState<Usuario>()
  const [busca, setBusca] = useBuscaNaUrl()
  const acao = useGravacao(recarregar)
  const achar = (id: number) => dados?.usuarios.filter((u) => u.ativo && u.id === id).map(ficha)[0]
  const { editando, setEditando, abrir, fechar } = useEditarNaUrl(achar, Novo, !!dados)
  const sujo = useSujo(editando)
  useFocoNoPrimeiroErro(acao.error)
  const setores = dados?.setores ?? []
  const nomes = new Map(setores.map((s) => [s.id, s.nome]))
  const usuarios = dados?.usuarios.filter((u) => casa(u, busca))
  const { visiveis, mais } = useMostrarMais(usuarios)

  const salvar = () => acao.mutate({ chamar: () => gravar('/api/admin/usuarios', editando!.id, corpo(editando!)), aviso: 'Usuário salvo.', depois: fechar })

  function confirmarDesativar() {
    const u = desativar!
    setDesativar(undefined)
    acao.mutate({ chamar: () => api(`/api/admin/usuarios/${u.id}/desativar`, {}), aviso: 'Usuário desativado.' })
  }

  return (
    <div className="flex flex-col gap-2">
      <Cabecalho botao="Novo usuário" Icone={Plus} aoClicar={() => abrir({ ...Novo })} />
      <ErroDe erro={erro} oque="os usuários" tentar={recarregar} />
      <ErroDe erro={acao.error} oculto={!!editando} />
      <Input type="search" name="busca" autoComplete="off" spellCheck={false} aria-label="Buscar por nome, CPF ou e-mail" placeholder="Buscar por nome, CPF ou e-mail…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <Tabela
        colunas={Colunas}
        itens={usuarios}
        erro={erro}
        vazio={busca.trim() ? { Icone: Users, titulo: 'Nenhum resultado', frase: 'Nenhum usuário combina com a busca.' } : { Icone: Users, titulo: 'Nenhum usuário', frase: 'Cadastre a equipe ou importe as matrículas.' }}
      >
        {visiveis?.map((u) => (
          <LinhaUsuario key={u.id} u={u} setores={nomes} editar={() => abrir(ficha(u))} desativar={() => setDesativar(u)} pendente={acao.isPending} />
        ))}
      </Tabela>
      {mais}

      <Editor sujo={sujo} titulo={tituloDaJanela(editando)} aberto={!!editando} fechar={fechar} salvar={salvar} pendente={acao.isPending} alerta={<ErroDe erro={acao.error} campos={CamposComErro} />} botao="Salvar usuário">
        {editando && <CamposDoUsuario editando={editando} setEditando={setEditando} setores={setores} erros={errosDeCampo(acao.error)} />}
      </Editor>

      <Confirmar aberto={!!desativar} fechar={() => setDesativar(undefined)} titulo={`Desativar ${desativar?.nome}?`} botao="Desativar" destrutivo confirmar={confirmarDesativar}>
        A pessoa perde o acesso na próxima requisição. Conversas, chamados e histórico ficam guardados; os chamados em que ela era responsável voltam para a fila do setor.
      </Confirmar>
    </div>
  )
}
