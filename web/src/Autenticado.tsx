import { useEffect, useState } from 'react'
import { Container, Nav, Navbar, Spinner } from 'react-bootstrap'
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { api, type Me } from './api'
import type { Sessao } from './sessao'

const Menu = [
  { papeis: ['ALUNO'], caminho: 'assistente', rotulo: 'Assistente', icone: 'bi-chat-dots' },
  { papeis: ['ALUNO'], caminho: 'solicitacoes', rotulo: 'Minhas solicitações', icone: 'bi-list-check' },
  { papeis: ['ATENDENTE'], caminho: 'fila', rotulo: 'Fila', icone: 'bi-inbox' },
  { papeis: ['ADMINISTRADOR'], caminho: 'artigos', rotulo: 'Artigos', icone: 'bi-journal-text' },
  { papeis: ['ADMINISTRADOR'], caminho: 'documentos', rotulo: 'Documentos', icone: 'bi-file-earmark-pdf' },
  { papeis: ['ATENDENTE', 'ADMINISTRADOR'], caminho: 'indicadores', rotulo: 'Indicadores', icone: 'bi-bar-chart' },
  { papeis: ['ADMINISTRADOR'], caminho: 'usuarios', rotulo: 'Usuários', icone: 'bi-people' },
  { papeis: ['ADMINISTRADOR'], caminho: 'matriculas', rotulo: 'Matrículas', icone: 'bi-upload' },
  { papeis: ['ADMINISTRADOR'], caminho: 'cadastros', rotulo: 'Cadastros', icone: 'bi-gear' },
]

export function Autenticado() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [me, setMe] = useState<Me>()

  useEffect(() => {
    api<Me>('/api/auth/me')
      .then(setMe)
      .catch(() => navigate(`/${slug}`, { replace: true }))
  }, [slug, navigate])

  if (!me)
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" aria-label="Carregando" />
      </Container>
    )
  if (me.instituicao.slug !== slug) return <Navigate to={`/${me.instituicao.slug}`} replace />
  if (me.deveTrocarSenha && !pathname.endsWith('/trocar-senha')) return <Navigate to={`/${slug}/trocar-senha`} replace />

  async function sair() {
    await api('/api/auth/logout', {}).catch(() => undefined)
    navigate(`/${slug}`)
  }

  return (
    <>
      <Navbar bg="primary" variant="dark" expand="sm" className="mb-3">
        <Container>
          <Navbar.Brand>
            One <small className="ms-1 fw-normal" data-testid="instituicao">{me.instituicao.nome}</small>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="menu" aria-label="Menu" />
          <Navbar.Collapse id="menu">
            <Nav className="me-auto">
              {Menu.filter((m) => m.papeis.some((p) => me.papeis.includes(p))).map((m) => (
                <Nav.Link key={m.caminho} as={NavLink} to={`/${slug}/${m.caminho}`}>
                  <i className={`bi ${m.icone} me-1`} aria-hidden="true" />
                  {m.rotulo}
                </Nav.Link>
              ))}
            </Nav>
            <Nav>
              <Nav.Link onClick={sair}>
                <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                Sair
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="pb-4">
        <Outlet context={{ me, setMe } satisfies Sessao} />
      </Container>
    </>
  )
}
