import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookText, ChartColumn, FileText, Inbox, ListChecks, LogOut, Menu as IconeMenu, MessageCircle, Monitor, Moon, Settings, Sun, Upload, Users } from 'lucide-react'
import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { api, type Me } from './api'
import type { Sessao } from './sessao'
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

const Temas: ['light' | 'dark' | 'system', string, typeof Sun][] = [
  ['light', 'Claro', Sun],
  ['dark', 'Escuro', Moon],
  ['system', 'Sistema', Monitor],
]

// Claro, Escuro ou o do sistema; o ThemeProvider grava a escolha em one-tema (door 10).
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

// Na barra (a partir de 1024 px) o rótulo fica sempre visível: os 3 primeiros links desde 1024 px, o 4º e o 5º desde 1280 px,
// o 6º e o 7º desde 1536 px; o que não cabe vai para "Mais". Abaixo de 1024 px, a gaveta: uma linha de 48 px por link.
const NaBarra = ['lg:flex', 'lg:flex', 'lg:flex', 'xl:flex', 'xl:flex', '2xl:flex', '2xl:flex']
const NoMais = ['', '', '', 'xl:hidden', 'xl:hidden', '2xl:hidden', '2xl:hidden']
const Fixo = 'h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-foreground no-underline hover:bg-accent aria-[current=page]:font-semibold'

function Links({ itens, slug, gaveta, aoEscolher }: { itens: Item[]; slug?: string; gaveta?: boolean; aoEscolher?: () => void }) {
  return itens.map(({ caminho, rotulo, Icone }, i) => (
    <NavLink
      key={caminho}
      to={`/${slug}/${caminho}`}
      onClick={aoEscolher}
      className={gaveta ? 'flex h-12 items-center gap-3 px-4 text-foreground no-underline aria-[current=page]:font-semibold' : `hidden ${NaBarra[i] ?? ''} ${Fixo}`}
    >
      <Icone aria-hidden="true" className="size-4" />
      <span>{rotulo}</span>
    </NavLink>
  ))
}

// Os links que a barra não comporta na largura atual.
function Mais({ itens, slug }: { itens: Item[]; slug?: string }) {
  const [aberto, setAberto] = useState(false)
  const fora = itens.slice(3)
  if (!fora.length) return null
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={`hidden shrink-0 lg:inline-flex ${itens.length > 7 ? '' : itens.length > 5 ? '2xl:hidden' : 'xl:hidden'}`}>
          Mais
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-52 flex-col p-1">
        {fora.map(({ caminho, rotulo, Icone }, i) => (
          <NavLink
            key={caminho}
            to={`/${slug}/${caminho}`}
            onClick={() => setAberto(false)}
            className={`flex h-9 items-center gap-2 rounded-md px-2 text-sm text-foreground no-underline hover:bg-accent aria-[current=page]:font-semibold ${NoMais[i + 3]}`}
          >
            <Icone aria-hidden="true" className="size-4" />
            {rotulo}
          </NavLink>
        ))}
      </PopoverContent>
    </Popover>
  )
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
          <span className="min-w-16 flex-1 truncate text-sm text-muted-foreground" data-testid="instituicao">
            {me.instituicao.nome}
          </span>
          <div className="flex items-center gap-1">
            <Links itens={itens} slug={slug} />
            <Mais itens={itens} slug={slug} />
          </div>
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
                <button type="button" onClick={sair} className="flex h-12 items-center gap-3 px-4 text-start">
                  <LogOut aria-hidden="true" className="size-4" />
                  Sair
                </button>
              </div>
            </DrawerContent>
          </Drawer>
          <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={sair}>
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
