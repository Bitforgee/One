import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookText, ChartColumn, FileText, Inbox, ListChecks, LogOut, Menu as IconeMenu, MessageCircle, Settings, Upload, Users } from 'lucide-react'
import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { api, type Me } from './api'
import type { Sessao } from './sessao'
import { Button } from './ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'
import { Spinner } from './ui/spinner'

const Menu = [
  { papeis: ['ALUNO'], caminho: 'assistente', rotulo: 'Assistente', Icone: MessageCircle },
  { papeis: ['ALUNO'], caminho: 'solicitacoes', rotulo: 'Minhas solicitações', Icone: ListChecks },
  { papeis: ['ATENDENTE'], caminho: 'fila', rotulo: 'Fila', Icone: Inbox },
  { papeis: ['ADMINISTRADOR'], caminho: 'artigos', rotulo: 'Artigos', Icone: BookText },
  { papeis: ['ADMINISTRADOR'], caminho: 'documentos', rotulo: 'Documentos', Icone: FileText },
  { papeis: ['ATENDENTE', 'ADMINISTRADOR'], caminho: 'indicadores', rotulo: 'Indicadores', Icone: ChartColumn },
  { papeis: ['ADMINISTRADOR'], caminho: 'usuarios', rotulo: 'Usuários', Icone: Users },
  { papeis: ['ADMINISTRADOR'], caminho: 'matriculas', rotulo: 'Matrículas', Icone: Upload },
  { papeis: ['ADMINISTRADOR'], caminho: 'cadastros', rotulo: 'Cadastros', Icone: Settings },
]

type Item = (typeof Menu)[number]

// Na barra (a partir de 640 px) o rótulo some até 1280 px e fica só o ícone; na gaveta, uma linha de 48 px por link.
function Links({ itens, slug, gaveta, aoEscolher }: { itens: Item[]; slug?: string; gaveta?: boolean; aoEscolher?: () => void }) {
  return itens.map(({ caminho, rotulo, Icone }) => (
    <NavLink
      key={caminho}
      to={`/${slug}/${caminho}`}
      onClick={aoEscolher}
      className={
        gaveta
          ? 'flex h-12 items-center gap-3 px-4 text-foreground no-underline aria-[current=page]:font-semibold'
          : 'flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-foreground no-underline hover:bg-accent aria-[current=page]:font-semibold'
      }
    >
      <Icone aria-hidden="true" className="size-4" />
      <span className={gaveta ? undefined : 'sm:max-xl:sr-only'}>{rotulo}</span>
    </NavLink>
  ))
}

export function Autenticado() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const cliente = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const { data: me, isError } = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/auth/me') })

  if (isError) return <Navigate to={`/${slug}`} replace />
  if (!me)
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-8" />
      </div>
    )
  if (me.instituicao.slug !== slug) return <Navigate to={`/${me.instituicao.slug}`} replace />
  if (me.deveTrocarSenha && !pathname.endsWith('/trocar-senha')) return <Navigate to={`/${slug}/trocar-senha`} replace />

  const itens = Menu.filter((m) => m.papeis.some((p) => me.papeis.includes(p)))
  const setMe = (novo: Me) => cliente.setQueryData(['me'], novo)

  async function sair() {
    await api('/api/auth/logout', {}).catch(() => undefined)
    navigate(`/${slug}`)
    cliente.removeQueries({ queryKey: ['me'] }) // o próximo login lê o /me de novo, como antes
  }

  return (
    <>
      <nav className="sticky top-0 z-40 h-14 border-b bg-background">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-4">
          <span className="shrink-0 text-lg font-semibold text-primary">One</span>
          <span className="min-w-0 truncate text-sm text-muted-foreground" data-testid="instituicao">
            {me.instituicao.nome}
          </span>
          <div className="hidden items-center gap-1 sm:flex">
            <Links itens={itens} slug={slug} />
          </div>
          <Drawer open={aberto} onOpenChange={setAberto}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="ms-auto sm:hidden" aria-label="Menu">
                <IconeMenu aria-hidden="true" />
              </Button>
            </DrawerTrigger>
            <DrawerContent aria-describedby={undefined}>
              <DrawerHeader>
                <DrawerTitle>Menu</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col pb-4">
                <Links itens={itens} slug={slug} gaveta aoEscolher={() => setAberto(false)} />
                <button type="button" onClick={sair} className="flex h-12 items-center gap-3 px-4 text-start">
                  <LogOut aria-hidden="true" className="size-4" />
                  Sair
                </button>
              </div>
            </DrawerContent>
          </Drawer>
          <Button variant="ghost" size="sm" className="ms-auto hidden sm:inline-flex" onClick={sair}>
            <LogOut aria-hidden="true" />
            Sair
          </Button>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-6xl px-4 py-4">
        <Outlet context={{ me, setMe } satisfies Sessao} />
      </main>
    </>
  )
}
