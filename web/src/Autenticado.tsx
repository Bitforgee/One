import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookText, ChartColumn, FileText, Inbox, ListChecks, LogOut, Menu as IconeMenu, MessageCircle, Monitor, Moon, MoonStar, PanelLeftClose, PanelLeftOpen, Settings, Sun, Upload, Users } from 'lucide-react'
import { useId, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useMatch, useNavigate, useParams } from 'react-router'
import { api, type Me } from './api'
import { AvisosPush } from './AvisosPush'
import type { Sessao } from './sessao'
import { useTempoReal } from './tempo-real'
import { Button } from './ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Spinner } from './ui/spinner'
import { useTheme } from './ui/theme-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

// Links por grupo (barra-lateral-grupos AC 1), nesta ordem; o grupo sem link para o papel some.
const Menu = [
  { grupo: 'Atendimento', papeis: ['ALUNO'], caminho: 'assistente', rotulo: 'Assistente', Icone: MessageCircle },
  { grupo: 'Atendimento', papeis: ['ALUNO'], caminho: 'solicitacoes', rotulo: 'Minhas solicitações', Icone: ListChecks },
  { grupo: 'Atendimento', papeis: ['ATENDENTE'], caminho: 'fila', rotulo: 'Fila', Icone: Inbox },
  { grupo: 'Atendimento', papeis: ['ATENDENTE', 'ADMINISTRADOR'], caminho: 'indicadores', rotulo: 'Indicadores', Icone: ChartColumn },
  { grupo: 'Conhecimento', papeis: ['ADMINISTRADOR'], caminho: 'artigos', rotulo: 'Artigos', Icone: BookText },
  { grupo: 'Conhecimento', papeis: ['ADMINISTRADOR'], caminho: 'documentos', rotulo: 'Documentos', Icone: FileText },
  { grupo: 'Administração', papeis: ['ADMINISTRADOR'], caminho: 'usuarios', rotulo: 'Usuários', Icone: Users },
  { grupo: 'Administração', papeis: ['ADMINISTRADOR'], caminho: 'matriculas', rotulo: 'Matrículas', Icone: Upload },
  { grupo: 'Administração', papeis: ['ADMINISTRADOR'], caminho: 'cadastros', rotulo: 'Cadastros', Icone: Settings },
]
const Grupos = ['Atendimento', 'Conhecimento', 'Administração']

// Primeira letra da primeira e da última palavra (AC 6): "Ana Beatriz Souza" -> "AS".
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

// Largura e recuo animados em 200 ms, só sem movimento reduzido (AC 15).
const Anima = 'motion-safe:lg:transition-[width,padding] motion-safe:lg:duration-200'

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
// Recolhida, o rótulo vira sr-only e a dica (Tooltip) mostra o nome.
const NaBarra = `hidden h-9 shrink-0 items-center gap-2 rounded-md px-2 text-sm text-foreground no-underline hover:bg-accent lg:flex recolhida:justify-center`

type LinksProps = { itens: Item[]; slug?: string; gaveta?: boolean; dica?: boolean; aoEscolher?: () => void }

function Link({ item: { caminho, rotulo, Icone }, slug, gaveta, dica, aoEscolher }: Omit<LinksProps, 'itens'> & { item: Item }) {
  // o ativo vem do useMatch e a classe é texto: o Slot do Tooltip transformaria a classe-função do NavLink em texto
  const ativo = !!useMatch({ path: `/${slug}/${caminho}`, end: false })
  const classe = gaveta ? 'flex h-12 items-center gap-3 px-4 text-foreground no-underline aria-[current=page]:font-semibold' : ativo ? `${NaBarra} bg-primary-subtle font-medium` : NaBarra
  const link = (
    <NavLink to={`/${slug}/${caminho}`} onClick={aoEscolher} className={classe}>
      <Icone aria-hidden="true" className="size-4 shrink-0" />
      <span className={gaveta ? undefined : 'recolhida:sr-only'}>{rotulo}</span>
    </NavLink>
  )
  if (gaveta) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      {dica && <TooltipContent side="right">{rotulo}</TooltipContent>}
    </Tooltip>
  )
}

// Um grupo com título (role="group" nomeado pelo título, AC 3); na barra o título só aparece a partir de 1024 px.
function Grupo({ nome, itens, ...resto }: LinksProps & { nome: string }) {
  const id = useId()
  const caixa = resto.gaveta ? 'flex flex-col' : `contents lg:mt-6 lg:flex lg:flex-col lg:gap-0.5 lg:first:mt-0 recolhida:mt-3 recolhida:border-t recolhida:pt-3 recolhida:first:mt-0 recolhida:first:border-t-0 recolhida:first:pt-0`
  const titulo = resto.gaveta ? 'flex h-8 items-center px-4 text-xs font-medium text-muted-foreground' : `hidden px-2 pb-1 text-xs font-medium text-muted-foreground lg:block recolhida:sr-only`
  return (
    <div role="group" aria-labelledby={id} className={caixa}>
      <span id={id} className={titulo}>
        {nome}
      </span>
      {itens.map((item) => (
        <Link key={item.caminho} item={item} {...resto} />
      ))}
    </div>
  )
}

function Links({ itens, ...resto }: LinksProps) {
  return Grupos.map((nome) => ({ nome, doGrupo: itens.filter((i) => i.grupo === nome) }))
    .filter(({ doGrupo }) => doGrupo.length > 0)
    .map(({ nome, doGrupo }) => <Grupo key={nome} nome={nome} itens={doGrupo} {...resto} />)
}

// Nome no rodapé da barra (AC 4); recolhida, as iniciais num círculo com o nome na dica (AC 6).
function Usuario({ nome }: { nome: string }) {
  return (
    <div className="hidden lg:flex lg:w-full lg:min-w-0 lg:items-center lg:justify-center lg:px-2 lg:pb-1">
      <span className={`min-w-0 flex-1 truncate text-sm font-medium whitespace-nowrap recolhida:hidden`}>{nome}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span role="img" aria-label={nome} tabIndex={0} className={`hidden size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold recolhida:flex`}>
            <span aria-hidden="true">{iniciais(nome)}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">{nome}</TooltipContent>
      </Tooltip>
    </div>
  )
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
  const [barraRecolhida, setBarraRecolhida] = useState(() => localStorage.getItem('one-barra') === 'recolhida')
  const [animar, setAnimar] = useState(false) // só anima depois de alternar: mudar a largura da janela não deve animar
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

  function alternarBarra() {
    localStorage.setItem('one-barra', barraRecolhida ? 'aberta' : 'recolhida') // door 1 do barra-lateral-grupos
    setBarraRecolhida(!barraRecolhida)
    setAnimar(true)
  }

  async function sair() {
    await api('/api/auth/logout', {}).catch(() => undefined)
    navigate(`/${slug}`)
    cliente.removeQueries({ queryKey: ['me'] }) // o próximo login lê o /me de novo, como antes
  }

  // Um só <nav> (door 3a): barra de topo de 56 px abaixo de 1024 px; barra lateral fixa de 240 px a partir dele, ou de 64 px recolhida.
  const nomeBotao = barraRecolhida ? 'Expandir barra lateral' : 'Recolher barra lateral'
  const IconeBarra = barraRecolhida ? PanelLeftOpen : PanelLeftClose
  return (
    <>
      <nav
        data-recolhida={barraRecolhida}
        className={`sticky top-0 z-40 h-14 border-b bg-background lg:fixed lg:inset-y-0 lg:start-0 lg:h-svh lg:w-60 lg:border-e lg:border-b-0 lg:bg-sidebar lg:data-[recolhida=true]:w-16 ${animar ? Anima : ''}`}
      >
        <div className={`mx-auto flex h-full max-w-6xl items-center gap-2 px-4 lg:flex-col lg:items-stretch lg:gap-1 lg:px-3 lg:py-4 recolhida:px-2`}>
          <div className={`contents lg:flex lg:items-center lg:justify-between lg:gap-1 recolhida:flex-col`}>
            <span className="shrink-0 text-lg font-semibold text-primary lg:px-2">One</span>
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label={nomeBotao} aria-expanded={!barraRecolhida} onClick={alternarBarra}>
              <IconeBarra aria-hidden="true" />
            </Button>
          </div>
          <span className={`min-w-16 flex-1 truncate text-sm text-muted-foreground lg:flex-none lg:px-2 lg:pb-4 lg:whitespace-normal recolhida:hidden`} data-testid="instituicao">
            {me.instituicao.nome}
          </span>
          <div className="contents lg:flex lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-y-auto">
            <Links itens={itens} slug={slug} dica={barraRecolhida} />
          </div>
          <div className={`contents lg:flex lg:flex-wrap lg:items-center lg:gap-1 lg:border-t lg:pt-3 recolhida:flex-col`}>
            <Usuario nome={me.nome} />
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
                  <p className="text-sm text-muted-foreground">{me.nome}</p>
                </DrawerHeader>
                <div className="min-h-0 overflow-y-auto pb-4">
                  <Links itens={itens} slug={slug} gaveta aoEscolher={() => setAberto(false)} />
                  <Avisos aluno={aluno} item="flex h-12 items-center gap-3 px-4 text-start disabled:opacity-50" />
                  <button type="button" onClick={sair} className="flex h-12 items-center gap-3 px-4 text-start">
                    <LogOut aria-hidden="true" className="size-4" />
                    Sair
                  </button>
                </div>
              </DrawerContent>
            </Drawer>
            <Button variant="ghost" size="sm" className={`hidden lg:ms-auto lg:inline-flex recolhida:ms-0`} onClick={sair}>
              <LogOut aria-hidden="true" />
              <span className={'recolhida:sr-only'}>Sair</span>
            </Button>
          </div>
        </div>
      </nav>
      <div className={`${barraRecolhida ? 'lg:ps-16' : 'lg:ps-60'} ${animar ? Anima : ''}`}>
        <main className="mx-auto w-full max-w-6xl px-4 py-4 lg:px-8 lg:py-8">
          <Outlet context={{ me, setMe } satisfies Sessao} />
        </main>
      </div>
    </>
  )
}
