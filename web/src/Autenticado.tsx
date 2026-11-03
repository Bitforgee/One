import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookText, ChartColumn, FileText, Inbox, ListChecks, LogOut, Menu as IconeMenu, MessageCircle, Monitor, Moon, MoonStar, Settings, Sun, Upload, Users } from 'lucide-react'
import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { api, type Me } from './api'
import { AvisosPush } from './AvisosPush'
import type { Sessao } from './sessao'
import { useTempoReal } from './tempo-real'
import { Button } from './ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Spinner } from './ui/spinner'
import { useTheme } from './ui/theme-provider'

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

const Temas: ['light' | 'dark' | 'black' | 'system', string, typeof Sun][] = [
  ['light', 'Claro', Sun],
  ['dark', 'Escuro', Moon],
  ['black', 'Preto', MoonStar],
  ['system', 'Sistema', Monitor],
]

// Claro, Escuro, Preto ou o do sistema; o ThemeProvider grava a escolha em one-tema (door 10, door 1 do redesign).
function Tema() {
  const { setTheme } = useTheme()
  const [aberto, setAberto] = useState(false)
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Tema">
          <Sun aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-40 flex-col p-1">
        {Temas.map(([valor, rotulo, Icone]) => (
          <Button
            key={valor}
            variant="ghost"
            className="justify-start"
            onClick={() => {
              setTheme(valor)
              setAberto(false)
            }}
          >
            <Icone aria-hidden="true" />
            {rotulo}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

// Abaixo de 1024 px os links ficam só na gaveta (uma linha de 48 px por link); a partir de 1024 px, na barra lateral.
const NaBarra = 'hidden h-9 shrink-0 items-center gap-2 rounded-md px-2 text-sm text-foreground no-underline hover:bg-accent lg:flex'

function Links({ itens, slug, gaveta, aoEscolher }: { itens: Item[]; slug?: string; gaveta?: boolean; aoEscolher?: () => void }) {
  return itens.map(({ caminho, rotulo, Icone }) => (
    <NavLink
      key={caminho}
      to={`/${slug}/${caminho}`}
      onClick={aoEscolher}
      className={({ isActive }) =>
        gaveta ? 'flex h-12 items-center gap-3 px-4 text-foreground no-underline aria-[current=page]:font-semibold' : isActive ? `${NaBarra} bg-primary-subtle font-medium` : NaBarra
      }
    >
      <Icone aria-hidden="true" className="size-4" />
      <span>{rotulo}</span>
    </NavLink>
  ))
}

// Os avisos são só do aluno.
function Avisos({ aluno, item }: { aluno: boolean; item?: string }) {
  return aluno ? <AvisosPush item={item} /> : null
}

export function Autenticado() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const cliente = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const { data: me, isError } = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/auth/me') })
  useTempoReal(cliente, !!me && !me.deveTrocarSenha && me.instituicao.slug === slug) // o negotiate recusa quem deve trocar a senha

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
  const aluno = me.papeis.includes('ALUNO')
  const setMe = (novo: Me) => cliente.setQueryData(['me'], novo)

  async function sair() {
    await api('/api/auth/logout', {}).catch(() => undefined)
    navigate(`/${slug}`)
    cliente.removeQueries({ queryKey: ['me'] }) // o próximo login lê o /me de novo, como antes
  }

  // Um só <nav> (door 3a): barra de topo de 56 px abaixo de 1024 px; barra lateral fixa de 240 px a partir dele.
  return (
    <>
      <nav className="sticky top-0 z-40 h-14 border-b bg-background lg:fixed lg:inset-y-0 lg:start-0 lg:h-svh lg:w-60 lg:border-e lg:border-b-0 lg:bg-sidebar">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-4 lg:flex-col lg:items-stretch lg:gap-1 lg:px-3 lg:py-4">
          <span className="shrink-0 text-lg font-semibold text-primary lg:px-2">One</span>
          <span className="min-w-16 flex-1 truncate text-sm text-muted-foreground lg:flex-none lg:px-2 lg:pb-4 lg:whitespace-normal" data-testid="instituicao">
            {me.instituicao.nome}
          </span>
          <div className="contents lg:flex lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-y-auto">
            <Links itens={itens} slug={slug} />
          </div>
          <div className="contents lg:flex lg:flex-wrap lg:items-center lg:gap-1 lg:border-t lg:pt-3">
            <Avisos aluno={aluno} />
            <Tema />
            <Drawer open={aberto} onOpenChange={setAberto}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                  <IconeMenu aria-hidden="true" />
                </Button>
              </DrawerTrigger>
              <DrawerContent aria-describedby={undefined}>
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                </DrawerHeader>
                <div className="flex flex-col pb-4">
                  <Links itens={itens} slug={slug} gaveta aoEscolher={() => setAberto(false)} />
                  <Avisos aluno={aluno} item="flex h-12 items-center gap-3 px-4 text-start disabled:opacity-50" />
                  <button type="button" onClick={sair} className="flex h-12 items-center gap-3 px-4 text-start">
                    <LogOut aria-hidden="true" className="size-4" />
                    Sair
                  </button>
                </div>
              </DrawerContent>
            </Drawer>
            <Button variant="ghost" size="sm" className="hidden lg:ms-auto lg:inline-flex" onClick={sair}>
              <LogOut aria-hidden="true" />
              Sair
            </Button>
          </div>
        </div>
      </nav>
      <div className="lg:ps-60">
        <main className="mx-auto w-full max-w-6xl px-4 py-4 lg:px-8 lg:py-8">
          <Outlet context={{ me, setMe } satisfies Sessao} />
        </main>
      </div>
    </>
  )
}
