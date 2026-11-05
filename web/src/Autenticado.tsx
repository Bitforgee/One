import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookText, Building2, ChartColumn, ChevronsUpDown, CircleUser, FileText, Inbox, ListChecks, LogOut, MessageCircle, Monitor, Moon, MoonStar, Palette, Phone, Settings, Sun, Upload, Users } from 'lucide-react'
import { useId, useState, type CSSProperties } from 'react'
import { Link as RouterLink, Navigate, NavLink, Outlet, useLocation, useMatch, useParams } from 'react-router'
import { api, type Me } from './api'
import { DialogoDeContato, iniciais, normalizar, Sigla, temContato, urlDaImagem, useInstituicao, type InstituicaoPublica } from './aparencia'
import { AvisosPush } from './AvisosPush'
import { telaInicial, useSair, type Sessao } from './sessao'
import { useTempoReal } from './tempo-real'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Separator } from './ui/separator'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from './ui/sidebar'
import { Spinner } from './ui/spinner'
import { useTheme } from './ui/theme-provider'
import { useConsulta } from './ui/use-mobile'

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
  { grupo: 'Administração', papeis: ['ADMINISTRADOR'], caminho: 'aparencia', rotulo: 'Aparência', Icone: Palette },
  { grupo: 'Plataforma', papeis: ['OPERADOR'], caminho: 'instituicoes', rotulo: 'Instituições', Icone: Building2 },
]
const Grupos = ['Atendimento', 'Conhecimento', 'Administração', 'Plataforma']

export { iniciais }

type Item = (typeof Menu)[number]

const Temas: ['light' | 'dark' | 'black' | 'system', string, typeof Sun][] = [
  ['light', 'Claro', Sun],
  ['dark', 'Escuro', Moon],
  ['black', 'Preto', MoonStar],
  ['system', 'Sistema', Monitor],
]

// As 4 escolhas de tema; a atual leva aria-pressed (revisao-ux AC 10). O ThemeProvider grava a escolha em one-tema.
export function OpcoesDeTema({ aoEscolher }: { aoEscolher: () => void }) {
  const { theme, setTheme } = useTheme()
  return (
    <>
      {Temas.map(([valor, rotulo, Icone]) => (
    <Button
      key={valor}
      variant="ghost"
      className="justify-start"
      aria-pressed={theme === valor}
      onClick={() => {
        setTheme(valor)
        aoEscolher()
      }}
    >
      <Icone aria-hidden="true" />
      {rotulo}
    </Button>
      ))}
    </>
  )
}

// O botão mostra o ícone do tema atual, o mesmo da opção no menu.
function Tema() {
  const { theme } = useTheme()
  const [aberto, setAberto] = useState(false)
  const Atual = Temas.find(([valor]) => valor === theme)![2]
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Tema">
          <Atual aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-40 flex-col p-1">
        <OpcoesDeTema aoEscolher={() => setAberto(false)} />
      </PopoverContent>
    </Popover>
  )
}

// Título do cabeçalho (layout-painel door 3): o número em chamados/:numero, "Trocar senha", ou o rótulo do link de Menu ativo.
export function tituloDaRota(pathname: string, numero?: string) {
  const caminho = pathname.split('/')[2]
  if (numero) return numero
  if (caminho === 'trocar-senha') return 'Trocar senha'
  if (caminho === 'conta') return 'Conta'
  return Menu.find((m) => m.caminho === caminho)?.rotulo ?? ''
}

// O primeiro de papeis nesta ordem (AC 10).
const Papeis = [
  ['ADMINISTRADOR', 'Administrador'],
  ['ATENDENTE', 'Atendente'],
  ['ALUNO', 'Aluno'],
]
const papelDe = (papeis: string[]) => Papeis.find(([p]) => papeis.includes(p))?.[1]

function Link({ item: { caminho, rotulo, Icone }, slug }: { item: Item; slug?: string }) {
  // o ativo vem do useMatch e a classe é texto: o Slot do Tooltip transformaria a classe-função do NavLink em texto
  const ativo = !!useMatch({ path: `/${slug}/${caminho}`, end: false })
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={ativo} tooltip={rotulo}>
        <NavLink to={`/${slug}/${caminho}`} onClick={() => setOpenMobile(false)}>
          <Icone aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:sr-only">{rotulo}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// Um grupo com título (role="group" nomeado pelo título, AD-028 AC 3); recolhida, o título sai da vista.
function Grupo({ nome, itens, slug }: { nome: string; itens: Item[]; slug?: string }) {
  const id = useId()
  return (
    <SidebarGroup role="group" aria-labelledby={id}>
      <SidebarGroupLabel id={id} className="group-data-[collapsible=icon]:sr-only">
        {nome}
      </SidebarGroupLabel>
      <SidebarMenu>
        {itens.map((item) => (
          <Link key={item.caminho} item={item} slug={slug} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

// Iniciais, nome e papel no botão; o menu leva o nome, o papel e "Sair" (AC 10).
function MenuUsuario({ me, sair }: { me: Me; sair: () => void }) {
  const { isMobile } = useSidebar()
  const dados = (
    <div className="grid min-w-0 flex-1 text-start text-sm leading-tight">
      <span className="truncate font-medium">{me.nome}</span>
      <span className="truncate text-xs text-muted-foreground">{papelDe(me.papeis)}</span>
    </div>
  )
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                {iniciais(me.nome)}
              </span>
              {dados}
              <ChevronsUpDown aria-hidden="true" className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? 'top' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuLabel className="flex gap-2 p-1.5 font-normal">{dados}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={sair}>
              <LogOut aria-hidden="true" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// O item "Contato" do rodapé (AC 43): abre um diálogo com horário, telefone e e-mail da instituição.
function ContatoDoMenu({ contato }: { contato: InstituicaoPublica['contato'] }) {
  const [aberto, setAberto] = useState(false)
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Contato" onClick={() => setAberto(true)}>
          <Phone aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:sr-only">Contato</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <DialogoDeContato contato={contato} aberto={aberto} aoMudar={setAberto} />
    </SidebarMenu>
  )
}

// O logo quando a barra está aberta; o ícone (ou as iniciais) quando recolhida e sempre que não há logo.
function CabecalhoDaBarra({ me, slug, ap }: { me: Me; slug?: string; ap: InstituicaoPublica }) {
  const logo = ap.imagens.logo
  return (
    <div className="flex items-center gap-2 p-1.5">
      {logo && slug && <img src={urlDaImagem(slug, 'logo', logo)} alt={ap.nome} className="h-8 w-auto max-w-40 object-contain group-data-[collapsible=icon]:hidden" />}
      <span className={logo ? 'hidden group-data-[collapsible=icon]:flex' : 'flex'}>
        <Sigla slug={slug} nome={me.instituicao.nome} icone={ap.imagens.icone} />
      </span>
      {!logo && (
        <div className="grid min-w-0 text-sm leading-tight">
          <span className="font-semibold group-data-[collapsible=icon]:sr-only" data-testid="instituicao">
            {me.instituicao.nome}
          </span>
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:sr-only">One</span>
        </div>
      )}
    </div>
  )
}

function Barra({ me, itens, slug, sair, ap }: { me: Me; itens: Item[]; slug?: string; sair: () => void; ap: InstituicaoPublica }) {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b">
        <CabecalhoDaBarra me={me} slug={slug} ap={ap} />
      </SidebarHeader>
      <SidebarContent role="navigation">
        {Grupos.map((nome) => ({ nome, doGrupo: itens.filter((i) => i.grupo === nome) }))
          .filter(({ doGrupo }) => doGrupo.length > 0)
          .map(({ nome, doGrupo }) => (
            <Grupo key={nome} nome={nome} itens={doGrupo} slug={slug} />
          ))}
      </SidebarContent>
      <SidebarFooter>
        {temContato(ap.contato) && <ContatoDoMenu contato={ap.contato} />}
        <MenuUsuario me={me} sair={sair} />
      </SidebarFooter>
    </Sidebar>
  )
}

// Cabeçalho do inset (door 3): botão, separador, o único h1 da tela; à direita, avisos (aluno) e tema.
// Com a barra de abas (aluno no celular) o topo perde o botão do menu e fica com a sigla, o título, os avisos e o tema.
function Topo({ titulo, aluno, abas, slug, icone, nome }: { titulo: string; aluno: boolean; abas: boolean; slug?: string; icone: number | null; nome: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-[49px] shrink-0 items-center gap-2 border-b bg-background/90 backdrop-blur">
      <div className={`flex w-full min-w-0 items-center px-4 lg:px-6 ${abas ? 'gap-2' : 'gap-1 lg:gap-2'}`}>
        {!abas && (
          <>
            <SidebarTrigger className="-ms-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          </>
        )}
        <Sigla slug={slug} nome={nome} icone={icone} className="size-6 md:hidden" />
        <h1 className="truncate text-base font-medium">{titulo}</h1>
        <div className="ms-auto flex shrink-0 items-center gap-1">
          {aluno && <AvisosPush />}
          <Tema />
        </div>
      </div>
    </header>
  )
}

const Abas = [
  { caminho: 'assistente', rotulo: 'Assistente', Icone: MessageCircle },
  { caminho: 'solicitacoes', rotulo: 'Solicitações', Icone: ListChecks },
  { caminho: 'conta', rotulo: 'Conta', Icone: CircleUser },
]
// A altura da barra de abas mais a área segura: o que o conteúdo reserva no fim (door 1).
const AlturaDaBarra = 'calc(3.5rem + 1px + env(safe-area-inset-bottom))' // os links, a borda de cima e a área segura

// Barra de abas do aluno no celular (door 1): 3 colunas iguais, ícone sobre o rótulo; o destino ativo usa a cor de ação.
// O detalhe de um chamado conta como Solicitações.
function BarraDeAbas({ slug }: { slug?: string }) {
  const { pathname } = useLocation()
  return (
    <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      {Abas.map(({ caminho, rotulo, Icone }) => {
        const ativo = pathname.startsWith(`/${slug}/${caminho}`) || (caminho === 'solicitacoes' && pathname.startsWith(`/${slug}/chamados/`))
        return (
          <RouterLink
            key={caminho}
            to={`/${slug}/${caminho}`}
            aria-current={ativo ? 'page' : undefined}
            className={`flex h-14 flex-col items-center justify-center gap-0.5 text-xs ${ativo ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
          >
            <Icone aria-hidden="true" className="size-5" />
            <span>{rotulo}</span>
          </RouterLink>
        )
      })}
    </nav>
  )
}

// O primeiro foco da tela (AC 8): leva o foco ao main sem mudar o endereço.
function PularParaOConteudo() {
  return (
    <a
      href="#conteudo"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById('conteudo')?.focus()
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
    >
      Pular para o conteúdo
    </a>
  )
}

// Rotas de cada papel (AC 9): o que não está aqui (chamados/:numero, trocar-senha) a API responde.
const Rotas = [...Menu.map(({ caminho, papeis }) => [caminho, papeis] as const), ['conta', ['ALUNO']] as const]
const rotaPermitida = (papeis: string[], caminho: string) => {
  const rota = Rotas.find(([c]) => c === caminho)
  return !rota || rota[1].some((p) => papeis.includes(p))
}

// Aberta ou recolhida, gravada em one-barra (door 2): ausente ou outro valor = aberta.
function useBarra() {
  const [aberta, setAberta] = useState(() => localStorage.getItem('one-barra') !== 'recolhida')
  return {
    aberta,
    aoMudar(valor: boolean) {
      localStorage.setItem('one-barra', valor ? 'aberta' : 'recolhida')
      setAberta(valor)
    },
  }
}

// Para onde a sessão manda quem abriu esta rota: o login, a instituição certa, a troca de senha ou a tela do papel (AC 9); nada = fica.
function desvio({ me, isError, slug, pathname }: { me?: Me; isError: boolean; slug?: string; pathname: string }) {
  if (isError) return `/${slug}`
  if (!me) return undefined
  if (me.instituicao.slug !== slug) return `/${me.instituicao.slug}`
  if (me.deveTrocarSenha && !pathname.endsWith('/trocar-senha')) return `/${slug}/trocar-senha`
  const inicial = telaInicial(me)
  const caminho = pathname.split('/')[2]
  return !rotaPermitida(me.papeis, caminho) && caminho !== inicial ? `/${slug}/${inicial}` : undefined
}

export function Autenticado() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const cliente = useQueryClient()
  const { data: me, isError } = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/auth/me') })
  const { data: instituicao } = useInstituicao(slug)
  useTempoReal(cliente, !!me && !me.deveTrocarSenha && me.instituicao.slug === slug) // o negotiate recusa quem deve trocar a senha

  const destino = desvio({ me, isError, slug, pathname })
  if (destino) return <Navigate to={destino} replace />
  if (!me)
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-8" />
      </div>
    )
  return <Casca me={me} slug={slug} ap={instituicao ?? normalizar({ nome: me.instituicao.nome })} />
}

// A casca: barra lateral (ou, para o aluno no celular, a barra de abas), cabeçalho e a área de conteúdo.
function Casca({ me, slug, ap }: { me: Me; slug?: string; ap: InstituicaoPublica }) {
  const { numero } = useParams()
  const { pathname } = useLocation()
  const cliente = useQueryClient()
  const barra = useBarra()
  const sair = useSair()
  const celular = useConsulta('(max-width: 767px)')
  const itens = Menu.filter((m) => m.papeis.some((p) => me.papeis.includes(p)))
  const setMe = (novo: Me) => cliente.setQueryData(['me'], novo)
  const abas = celular && me.papeis.length === 1 && me.papeis[0] === 'ALUNO' // door 1: só quem tem apenas o papel ALUNO

  // O main é o SidebarInset; o contêiner de largura (door 5) leva os recuos, para as consultas medirem só a área útil.
  return (
    <SidebarProvider open={barra.aberta} onOpenChange={barra.aoMudar} style={abas ? ({ '--barra': AlturaDaBarra } as CSSProperties) : undefined}>
      <PularParaOConteudo />
      {!abas && <Barra me={me} itens={itens} slug={slug} sair={sair} ap={ap} />}
      <SidebarInset id="conteudo" tabIndex={-1} className="min-w-0 outline-none">
        <Topo titulo={tituloDaRota(pathname, numero)} aluno={me.papeis.includes('ALUNO')} abas={abas} slug={slug} icone={ap.imagens.icone} nome={me.instituicao.nome} />
        <div className={`@container/main flex-1 px-4 py-4 md:py-6 lg:px-6 ${abas ? 'pb-[calc(var(--barra)+1rem)]' : ''}`}>
          <Outlet context={{ me, setMe } satisfies Sessao} />
        </div>
      </SidebarInset>
      {abas && <BarraDeAbas slug={slug} />}
    </SidebarProvider>
  )
}
