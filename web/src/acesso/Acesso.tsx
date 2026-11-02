import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Card, Container, Form, Spinner } from 'react-bootstrap'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { BotaoAcao, useAcao } from '../acao'
import { api } from '../api'
import { telaInicial, useSessao } from '../sessao'

function Cartao({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <Container className="py-4" style={{ maxWidth: 420 }}>
      <Card>
        <Card.Body>
          <Card.Title as="h1" className="h4 mb-3">
            {titulo}
          </Card.Title>
          {children}
        </Card.Body>
      </Card>
    </Container>
  )
}

export function Login() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [nome, setNome] = useState<string>()
  const [naoEncontrada, setNaoEncontrada] = useState(false)
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const { pendente, alerta, executar } = useAcao()

  useEffect(() => {
    api<{ nome: string }>(`/api/instituicoes/${slug}`)
      .then((i) => setNome(i.nome))
      .catch(() => setNaoEncontrada(true))
  }, [slug])

  if (naoEncontrada)
    return (
      <Container className="py-5" style={{ maxWidth: 420 }}>
        <Alert variant="warning">Instituição não encontrada.</Alert>
      </Container>
    )
  if (!nome)
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" aria-label="Carregando" />
      </Container>
    )

  function entrar(e: FormEvent) {
    e.preventDefault()
    executar(async () => {
      const u = await api<{ papeis: string[]; deveTrocarSenha: boolean }>('/api/auth/login', { instituicao: slug, cpf, senha })
      navigate(`/${slug}/${telaInicial(u)}`)
    })
  }

  return (
    <Cartao
      titulo={
        <>
          One <span className="text-body-secondary fw-normal">· {nome}</span>
        </>
      }
    >
      <Form onSubmit={entrar}>
        <Form.Group className="mb-3" controlId="cpf">
          <Form.Label>CPF</Form.Label>
          <Form.Control inputMode="numeric" autoComplete="username" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
        </Form.Group>
        <Form.Group className="mb-3" controlId="senha">
          <Form.Label>Senha</Form.Label>
          <Form.Control type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </Form.Group>
        <BotaoAcao type="submit" pendente={pendente} className="w-100">
          Entrar
        </BotaoAcao>
      </Form>
      {alerta}
      <div className="mt-3 text-center">
        <Link to={`/${slug}/primeiro-acesso`}>Primeiro acesso ou esqueci minha senha</Link>
      </div>
    </Cartao>
  )
}

export function PrimeiroAcesso() {
  const { slug } = useParams()
  const [cpf, setCpf] = useState('')
  const [mensagem, setMensagem] = useState<string>()
  const { pendente, alerta, executar } = useAcao()

  function enviar(e: FormEvent) {
    e.preventDefault()
    executar(async () => setMensagem((await api<{ mensagem: string }>('/api/auth/primeiro-acesso', { instituicao: slug, cpf })).mensagem))
  }

  return (
    <Cartao titulo="Primeiro acesso">
      {mensagem ? (
        <Alert variant="success">{mensagem}</Alert>
      ) : (
        <Form onSubmit={enviar}>
          <Form.Group className="mb-3" controlId="cpf">
            <Form.Label>CPF</Form.Label>
            <Form.Control inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
            <Form.Text>Enviaremos um link para criar a senha no e-mail registrado na instituição.</Form.Text>
          </Form.Group>
          <BotaoAcao type="submit" pendente={pendente} className="w-100">
            Enviar link
          </BotaoAcao>
        </Form>
      )}
      {alerta}
      <div className="mt-3 text-center">
        <Link to={`/${slug}`}>Voltar para o login</Link>
      </div>
    </Cartao>
  )
}

export function DefinirSenha() {
  const { slug } = useParams()
  const [busca] = useSearchParams()
  const [novaSenha, setNovaSenha] = useState('')
  const [pronto, setPronto] = useState(false)
  const { pendente, alerta, executar } = useAcao()

  function salvar(e: FormEvent) {
    e.preventDefault()
    executar(async () => {
      await api('/api/auth/definir-senha', { token: busca.get('token'), novaSenha })
      setPronto(true)
    })
  }

  return (
    <Cartao titulo="Criar senha">
      {pronto ? (
        <Alert variant="success">
          Senha criada. <Link to={`/${slug}`}>Entre com o CPF e a nova senha.</Link>
        </Alert>
      ) : (
        <Form onSubmit={salvar}>
          <Form.Group className="mb-3" controlId="novaSenha">
            <Form.Label>Nova senha</Form.Label>
            <Form.Control type="password" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
            <Form.Text>De 8 a 128 caracteres.</Form.Text>
          </Form.Group>
          <BotaoAcao type="submit" pendente={pendente} className="w-100">
            Salvar senha
          </BotaoAcao>
        </Form>
      )}
      {alerta}
    </Cartao>
  )
}

export function TrocarSenha() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { me, setMe } = useSessao()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const { pendente, alerta, executar } = useAcao()

  function salvar(e: FormEvent) {
    e.preventDefault()
    executar(async () => {
      await api('/api/auth/senha', { senhaAtual, novaSenha })
      const atualizado = { ...me, deveTrocarSenha: false }
      setMe(atualizado)
      navigate(`/${slug}/${telaInicial(atualizado)}`)
    })
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1 className="h4 mb-3">Trocar senha</h1>
      {me.deveTrocarSenha && <Alert variant="info">Troque a senha temporária para continuar.</Alert>}
      <Form onSubmit={salvar}>
        <Form.Group className="mb-3" controlId="senhaAtual">
          <Form.Label>Senha atual</Form.Label>
          <Form.Control type="password" autoComplete="current-password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
        </Form.Group>
        <Form.Group className="mb-3" controlId="novaSenhaTroca">
          <Form.Label>Nova senha</Form.Label>
          <Form.Control type="password" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
          <Form.Text>De 8 a 128 caracteres.</Form.Text>
        </Form.Group>
        <BotaoAcao type="submit" pendente={pendente}>
          Salvar
        </BotaoAcao>
      </Form>
      {alerta}
    </div>
  )
}
