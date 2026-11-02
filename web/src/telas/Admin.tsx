import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Badge, Button, Form, ListGroup, Modal, Spinner, Stack, Tab, Table, Tabs } from 'react-bootstrap'
import { BotaoAcao, useAcao } from '../acao'
import { api, ErroApi } from '../api'

type Id = { id: number }
type Setor = Id & { nome: string; triagem: boolean; ativo: boolean }
type Categoria = Id & { nome: string; ativa: boolean; padrao: boolean }
type Curso = Id & { nome: string; setorCoordenacaoId: number | null }
type Regra = Id & { categoriaId: number; destino: 'SETOR' | 'COORDENACAO_CURSO'; setorId: number | null }
type Pronta = Id & { setorId: number; titulo: string; texto: string }
type Usuario = Id & { cpf: string; nome: string; email: string; ativo: boolean; deveTrocarSenha: boolean; papeis: string[]; setores: number[] }

const Papeis: [string, string][] = [
  ['ALUNO', 'Aluno'],
  ['ATENDENTE', 'Atendente'],
  ['ADMINISTRADOR', 'Administrador'],
]

// Lê as listas que a tela usa e recarrega depois de cada gravação.
function useListas<T extends Record<string, unknown[]>>(urls: Record<keyof T, string>) {
  const [dados, setDados] = useState<T>()
  const carga = useAcao()
  const carregar = useCallback(
    () =>
      carga.executar(async () => {
        const entradas = await Promise.all(Object.entries(urls).map(async ([k, url]) => [k, await api(url as string)] as const))
        setDados(Object.fromEntries(entradas) as T)
      }),
    // as urls são constantes de cada tela
    [],
  )
  useEffect(() => void carregar(), [carregar])
  return { dados, carregar, carga }
}

// Modal de edição com o Alert de erro da gravação e o botão com Spinner.
function Editor({ titulo, aberto, fechar, salvar, pendente, alerta, children }: {
  titulo: string; aberto: boolean; fechar: () => void; salvar: () => void; pendente: boolean; alerta: ReactNode; children: ReactNode
}) {
  return (
    <Modal show={aberto} onHide={fechar}>
      <Form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          salvar()
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{titulo}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {children}
          {alerta}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <BotaoAcao type="submit" pendente={pendente}>
            Salvar
          </BotaoAcao>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

function Vazio({ itens }: { itens?: unknown[] }) {
  if (!itens) return <Spinner animation="border" role="status" aria-label="Carregando" />
  return itens.length === 0 ? <p className="text-body-secondary">Nenhum item cadastrado.</p> : null
}

function Cabecalho({ titulo, novo }: { titulo: string; novo: () => void }) {
  return (
    <Stack direction="horizontal" className="mb-3 flex-wrap gap-2">
      <h1 className="h4 me-auto mb-0">{titulo}</h1>
      <Button onClick={novo}>
        <i className="bi bi-plus-lg me-1" aria-hidden="true" />
        Novo
      </Button>
    </Stack>
  )
}

// S8: atendentes e administradores; alunos chegam pela importação, mas também podem ser editados aqui.
export function Usuarios() {
  const { dados, carregar, carga } = useListas<{ usuarios: Usuario[]; setores: Setor[] }>({ usuarios: '/api/admin/usuarios', setores: '/api/admin/setores' })
  const [editando, setEditando] = useState<Partial<Usuario> & { senhaTemporaria?: string }>()
  const [desativar, setDesativar] = useState<Usuario>()
  const acao = useAcao()
  const setor = (id: number) => dados?.setores.find((s) => s.id === id)?.nome

  function salvar() {
    const u = editando!
    const corpo = { cpf: u.cpf, nome: u.nome, email: u.email, papeis: u.papeis ?? [], setores: u.setores ?? [], senhaTemporaria: u.senhaTemporaria || undefined }
    acao.executar(async () => {
      await api(u.id ? `/api/admin/usuarios/${u.id}` : '/api/admin/usuarios', corpo, u.id ? 'PUT' : undefined)
      setEditando(undefined)
      await carregar()
    })
  }

  const alternar = (lista: (string | number)[] | undefined, valor: string | number) =>
    lista?.includes(valor) ? lista.filter((x) => x !== valor) : [...(lista ?? []), valor]

  return (
    <>
      <Cabecalho titulo="Usuários" novo={() => setEditando({ papeis: ['ATENDENTE'], setores: [] })} />
      {carga.alerta}
      {acao.alerta}
      <Vazio itens={dados?.usuarios} />
      <ListGroup>
        {dados?.usuarios.map((u) => (
          <ListGroup.Item key={u.id}>
            <div className="d-flex justify-content-between gap-2 flex-wrap">
              <strong style={{ overflowWrap: 'anywhere' }}>{u.nome}</strong>
              {!u.ativo && <Badge bg="secondary">Desativado</Badge>}
            </div>
            <div className="small text-body-secondary" style={{ overflowWrap: 'anywhere' }}>
              CPF {u.cpf} · {u.email}
            </div>
            <div className="small">
              {u.papeis.map((p) => Papeis.find(([v]) => v === p)?.[1]).join(', ')}
              {u.setores.length > 0 && ` · ${u.setores.map(setor).join(', ')}`}
            </div>
            {u.ativo && (
              <Stack direction="horizontal" gap={2} className="mt-2">
                <Button size="sm" variant="outline-primary" onClick={() => setEditando({ ...u })}>
                  Editar
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => setDesativar(u)}>
                  Desativar
                </Button>
              </Stack>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Editor titulo={editando?.id ? 'Editar usuário' : 'Novo usuário'} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.pendente} alerta={acao.alerta}>
        {editando && (
          <>
            <Form.Group controlId="cpf" className="mb-2">
              <Form.Label>CPF</Form.Label>
              <Form.Control inputMode="numeric" value={editando.cpf ?? ''} onChange={(e) => setEditando({ ...editando, cpf: e.target.value })} />
            </Form.Group>
            <Form.Group controlId="nome" className="mb-2">
              <Form.Label>Nome</Form.Label>
              <Form.Control value={editando.nome ?? ''} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
            </Form.Group>
            <Form.Group controlId="email" className="mb-2">
              <Form.Label>E-mail</Form.Label>
              <Form.Control type="email" value={editando.email ?? ''} onChange={(e) => setEditando({ ...editando, email: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Papéis</Form.Label>
              {Papeis.map(([valor, rotulo]) => (
                <Form.Check key={valor} id={`papel-${valor}`} label={rotulo} checked={editando.papeis?.includes(valor) ?? false}
                  onChange={() => setEditando({ ...editando, papeis: alternar(editando.papeis, valor) as string[] })} />
              ))}
            </Form.Group>
            {editando.papeis?.includes('ATENDENTE') && (
              <Form.Group className="mb-2">
                <Form.Label>Setores do atendente</Form.Label>
                {dados?.setores.filter((s) => s.ativo).map((s) => (
                  <Form.Check key={s.id} id={`setor-${s.id}`} label={s.nome} checked={editando.setores?.includes(s.id) ?? false}
                    onChange={() => setEditando({ ...editando, setores: alternar(editando.setores, s.id) as number[] })} />
                ))}
              </Form.Group>
            )}
            <Form.Group controlId="senha">
              <Form.Label>Senha temporária (opcional)</Form.Label>
              <Form.Control type="password" autoComplete="new-password" value={editando.senhaTemporaria ?? ''} onChange={(e) => setEditando({ ...editando, senhaTemporaria: e.target.value })} />
              <Form.Text>Com senha temporária, a pessoa troca a senha no primeiro login. Sem ela, entra pelo primeiro acesso por e-mail.</Form.Text>
            </Form.Group>
          </>
        )}
      </Editor>

      <Modal show={!!desativar} onHide={() => setDesativar(undefined)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Desativar {desativar?.nome}?</Modal.Title>
        </Modal.Header>
        <Modal.Body>A pessoa perde o acesso na próxima requisição. Conversas, chamados e histórico ficam guardados; os chamados em que ela era responsável voltam para a fila do setor.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDesativar(undefined)}>
            Voltar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const u = desativar!
              setDesativar(undefined)
              acao.executar(async () => {
                await api(`/api/admin/usuarios/${u.id}/desativar`, {})
                await carregar()
              })
            }}
          >
            Desativar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

// S8 e door 15: CSV do sistema acadêmico; tudo ou nada.
export function Matriculas() {
  const [arquivo, setArquivo] = useState<File>()
  const [confirmar, setConfirmar] = useState(false)
  const [resultado, setResultado] = useState<{ criados: number; atualizados: number }>()
  const [erros, setErros] = useState<{ linha: number; motivo: string }[]>([])
  const acao = useAcao()

  function importar() {
    setConfirmar(false)
    setResultado(undefined)
    setErros([])
    const f = new FormData()
    f.set('arquivo', arquivo!)
    acao.executar(async () => {
      try {
        setResultado(await api('/api/admin/matriculas/importacao', f))
      } catch (e) {
        if (e instanceof ErroApi && Array.isArray(e.corpo?.erros)) setErros(e.corpo.erros)
        throw e
      }
    })
  }

  return (
    <>
      <h1 className="h4">Importar matrículas</h1>
      <p className="small text-body-secondary">
        Arquivo CSV em UTF-8, separado por ponto e vírgula, com o cabeçalho <code>cpf;nome;email;matricula;curso;semestre;situacao</code>. Alunos são
        atualizados pelo CPF e matrículas pelo número. Se alguma linha tiver erro, nada é importado.
      </p>
      <Form.Group controlId="csv" className="mb-2">
        <Form.Label>Arquivo CSV</Form.Label>
        <Form.Control type="file" accept=".csv,text/csv" onChange={(e) => setArquivo((e.target as HTMLInputElement).files?.[0])} />
      </Form.Group>
      <BotaoAcao pendente={acao.pendente} disabled={!arquivo} onClick={() => setConfirmar(true)}>
        Importar
      </BotaoAcao>
      {resultado && (
        <Alert variant="success" className="mt-3">
          Importação concluída: {resultado.criados} matrículas criadas e {resultado.atualizados} atualizadas.
        </Alert>
      )}
      {acao.alerta}
      {erros.length > 0 && (
        <Table size="sm" striped className="small">
          <thead>
            <tr>
              <th>Linha</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {erros.map((e) => (
              <tr key={e.linha}>
                <td>{e.linha}</td>
                <td style={{ overflowWrap: 'anywhere' }}>{e.motivo}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={confirmar} onHide={() => setConfirmar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Importar {arquivo?.name}?</Modal.Title>
        </Modal.Header>
        <Modal.Body>Os dados de alunos e matrículas que já existem serão substituídos pelos do arquivo.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmar(false)}>
            Voltar
          </Button>
          <Button onClick={importar}>Importar</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

type Listas = { setores: Setor[]; categorias: Categoria[]; cursos: Curso[]; regras: Regra[]; prontas: Pronta[] }
type Aba = keyof Listas

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
  const [editando, setEditando] = useState<Record<string, any>>()
  const acao = useAcao()
  const rotas: Record<Aba, string> = { setores: 'setores', categorias: 'categorias', cursos: 'cursos', regras: 'regras', prontas: 'respostas-prontas' }
  const nome = (lista: { id: number; nome: string }[] | undefined, id: number | null) => lista?.find((x) => x.id === id)?.nome ?? '—'
  const campo = (k: string) => ({ value: editando?.[k] ?? '', onChange: (e: { target: { value: string } }) => setEditando({ ...editando, [k]: e.target.value }) })
  const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

  function salvar() {
    const { id, ...resto } = editando!
    const corpo = {
      setores: { nome: resto.nome, triagem: !!resto.triagem, ativo: resto.ativo !== false },
      categorias: { nome: resto.nome, ativa: resto.ativa !== false },
      cursos: { nome: resto.nome, setorCoordenacaoId: num(resto.setorCoordenacaoId) },
      regras: { categoriaId: num(resto.categoriaId), destino: resto.destino, setorId: resto.destino === 'SETOR' ? num(resto.setorId) : null },
      prontas: { setorId: num(resto.setorId), titulo: resto.titulo, texto: resto.texto },
    }[aba]
    acao.executar(async () => {
      await api(`/api/admin/${rotas[aba]}${id ? `/${id}` : ''}`, corpo, id ? 'PUT' : undefined)
      setEditando(undefined)
      await carregar()
    })
  }

  const linhas: Record<Aba, (x: any) => [string, string]> = {
    setores: (s: Setor) => [s.nome, [s.triagem && 'triagem', !s.ativo && 'inativo'].filter(Boolean).join(' · ')],
    categorias: (c: Categoria) => [c.nome, [c.padrao && 'padrão', !c.ativa && 'inativa'].filter(Boolean).join(' · ')],
    cursos: (c: Curso) => [c.nome, `coordenação: ${nome(dados?.setores, c.setorCoordenacaoId)}`],
    regras: (r: Regra) => [nome(dados?.categorias, r.categoriaId), r.destino === 'SETOR' ? `setor ${nome(dados?.setores, r.setorId)}` : 'coordenação do curso'],
    prontas: (p: Pronta) => [p.titulo, nome(dados?.setores, p.setorId)],
  }
  const titulos: Record<Aba, string> = { setores: 'Setores', categorias: 'Categorias', cursos: 'Cursos', regras: 'Regras', prontas: 'Respostas prontas' }
  const novos: Record<Aba, Record<string, unknown>> = { setores: {}, categorias: {}, cursos: {}, regras: { destino: 'SETOR' }, prontas: {} }
  const opcoes = (lista: { id: number; nome: string }[] | undefined, vazio: string) => (
    <>
      <option value="">{vazio}</option>
      {lista?.map((x) => (
        <option key={x.id} value={x.id}>
          {x.nome}
        </option>
      ))}
    </>
  )

  return (
    <>
      <Cabecalho titulo="Cadastros" novo={() => setEditando({ ...novos[aba] })} />
      {carga.alerta}
      <Tabs activeKey={aba} onSelect={(k) => setAba(k as Aba)} className="mb-3 flex-nowrap overflow-x-auto overflow-y-hidden">
        {(Object.keys(titulos) as Aba[]).map((k) => (
          <Tab key={k} eventKey={k} title={titulos[k]}>
            <Vazio itens={dados?.[k]} />
            <ListGroup>
              {(dados?.[k] as { id: number }[] | undefined)?.map((x) => {
                const [principal, detalhe] = linhas[k](x)
                return (
                  <ListGroup.Item key={x.id} action onClick={() => setEditando({ ...x })}>
                    <div style={{ overflowWrap: 'anywhere' }}>{principal}</div>
                    {detalhe && <div className="small text-body-secondary">{detalhe}</div>}
                  </ListGroup.Item>
                )
              })}
            </ListGroup>
          </Tab>
        ))}
      </Tabs>

      <Editor titulo={`${editando?.id ? 'Editar' : 'Novo'}: ${titulos[aba]}`} aberto={!!editando} fechar={() => setEditando(undefined)} salvar={salvar} pendente={acao.pendente} alerta={acao.alerta}>
        {editando && ['setores', 'categorias', 'cursos'].includes(aba) && (
          <Form.Group controlId="cad-nome" className="mb-2">
            <Form.Label>Nome</Form.Label>
            <Form.Control {...campo('nome')} />
          </Form.Group>
        )}
        {editando && aba === 'setores' && (
          <>
            <Form.Check id="cad-triagem" label="Setor de triagem (exatamente um na instituição)" checked={!!editando.triagem} onChange={(e) => setEditando({ ...editando, triagem: e.target.checked })} />
            <Form.Check id="cad-ativo" label="Ativo" checked={editando.ativo !== false} onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })} />
          </>
        )}
        {editando && aba === 'categorias' && (
          <Form.Check id="cad-ativa" label="Ativa" checked={editando.ativa !== false} onChange={(e) => setEditando({ ...editando, ativa: e.target.checked })} />
        )}
        {editando && aba === 'cursos' && (
          <Form.Group controlId="cad-coordenacao">
            <Form.Label>Setor de coordenação</Form.Label>
            <Form.Select {...campo('setorCoordenacaoId')}>{opcoes(dados?.setores, 'Sem coordenação (vai para a triagem)')}</Form.Select>
          </Form.Group>
        )}
        {editando && aba === 'regras' && (
          <>
            <Form.Group controlId="cad-categoria" className="mb-2">
              <Form.Label>Categoria</Form.Label>
              <Form.Select {...campo('categoriaId')}>{opcoes(dados?.categorias.filter((c) => !c.padrao), 'Escolha a categoria')}</Form.Select>
            </Form.Group>
            <Form.Group controlId="cad-destino" className="mb-2">
              <Form.Label>Destino</Form.Label>
              <Form.Select {...campo('destino')}>
                <option value="SETOR">Setor fixo</option>
                <option value="COORDENACAO_CURSO">Coordenação do curso da matrícula</option>
              </Form.Select>
            </Form.Group>
            {editando.destino === 'SETOR' && (
              <Form.Group controlId="cad-setor">
                <Form.Label>Setor</Form.Label>
                <Form.Select {...campo('setorId')}>{opcoes(dados?.setores, 'Escolha o setor')}</Form.Select>
              </Form.Group>
            )}
          </>
        )}
        {editando && aba === 'prontas' && (
          <>
            <Form.Group controlId="cad-setor-pronta" className="mb-2">
              <Form.Label>Setor</Form.Label>
              <Form.Select {...campo('setorId')}>{opcoes(dados?.setores, 'Escolha o setor')}</Form.Select>
            </Form.Group>
            <Form.Group controlId="cad-titulo" className="mb-2">
              <Form.Label>Título</Form.Label>
              <Form.Control {...campo('titulo')} />
            </Form.Group>
            <Form.Group controlId="cad-texto">
              <Form.Label>Texto</Form.Label>
              <Form.Control as="textarea" rows={4} maxLength={4000} {...campo('texto')} />
            </Form.Group>
          </>
        )}
      </Editor>
    </>
  )
}
