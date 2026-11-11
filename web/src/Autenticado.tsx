import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookText, Building2, ChartColumn, ChevronLeft, CircleAlert, CircleUser, FileText, Inbox, LayoutGrid, ListChecks, LogOut, MessageCircle, Menu as IconeMenu, Monitor, Moon, MoonStar, Palette, Phone, Plug, Settings, Sun, Upload, Users } from 'lucide-react'
import { useId, useState, type CSSProperties } from 'react'
import { Link as RouterLink, Navigate, NavLink, Outlet, useLocation, useMatch, useNavigate, useParams } from 'react-router'
import { api, ErroApi, type Me } from './api'
import { ErroDe } from './ErroDe'
import { DialogoDeContato, iniciais, normalizar, Sigla, temContato, urlDaImagem, useInstituicao, type InstituicaoPublica } from './aparencia'
import { AvisosPush } from './AvisosPush'
import { telaInicial, useSair, type Sessao } from './sessao'
import { useTempoReal } from './tempo-real'
import { Alert } from './ui/alert'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from './ui/sidebar'
import { Spinner } from './ui/spinner'
import { useTheme } from './ui/theme-provider'
import { Celular, Deitado, useConsulta } from './ui/use-mobile'

const Menu = [
  { grupo: 'Atendimento', papeis: ['ALUNO'], caminho: 'assistente', rotulo: 'Assistente', Icone: MessageCircle },
  { grupo: 'Atendimento', papeis: ['ALUNO'], caminho: 'solicitacoes', rotulo: 'Minhas solicitações', abrev: 'Solicitações', Icone: ListChecks },
  { grupo: 'Atendimento', papeis: ['ATENDENTE'], caminho: 'fila', rotulo: 'Fila', Icone: Inbox },
  { grupo: 'Atendimento', papeis: ['ATENDENTE', 'ADMINISTRADOR'], caminho: 'indicadores', rotulo: 'Indicadores', Icone: ChartColumn },
  { grupo: 'Conhecimento', papeis: ['ADMINISTRADOR'], caminho: 'artigos', rotulo: 'Artigos', Icone: BookText },
  { grupo: 'Conhecimento', papeis: ['ADMINISTRADOR'], caminho: 'documentos', rotulo: 'Documentos', Icone: FileText },
  { grupo: 'Administração', papeis: ['ADMINISTRADOR'], caminho: 'usuarios', rotulo: 'Usuários', Icone: Users },
  { grupo: 'Administração', papeis: ['ADMINISTRADOR'], caminho: 'matriculas', rotulo: 'Matrículas', Icone: Upload },
  { grupo: 'Administração', papeis: ['ADMINISTRADOR'], caminho: 'cadastros', rotulo: 'Cadastros', Icone: Settings },
  { grupo: 'Administração', papeis: ['ADMINISTRADOR'], caminho: 'aparencia', rotulo: 'Aparência', Icone: Palette },
  { grupo: 'Administração', papeis: ['ADMINISTRADOR'], caminho: 'integracoes', rotulo: 'Integrações', Icone: Plug },
  { grupo: 'Plataforma', papeis: ['OPERADOR'], caminho: 'instituicoes', rotulo: 'Instituições', Icone: Building2 },
]
export const Grupos = ['Atendimento', 'Conhecimento', 'Administração', 'Plataforma']
const TodosOsPapeis = ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR', 'OPERADOR']
const LimiteDeAbas = 5

export { iniciais }

export type Item = (typeof Menu)[number] & { abrev?: string }

export const itensDo = (papeis: string[]): Item[] => Menu.filter((m) => m.papeis.some((p) => papeis.includes(p)))

export function distribuir(papeis: string[]) {
  const itens = itensDo(papeis)
  const cabe = (n: number) => n + (itens.length > n ? 1 : 0) + 1 <= LimiteDeAbas
  let fixas = itens.filter((i) => i.grupo === 'Atendimento')
  while (!cabe(fixas.length)) fixas = fixas.slice(0, -1)
  return { fixas, gerir: itens.filter((i) => !fixas.includes(i)) }
}

export const destinosDaGerir = (papeis: string[]) => distribuir(papeis).gerir

const Temas: ['light' | 'dark' | 'black' | 'system', string, typeof Sun][] = [
  ['light', 'Claro', Sun],
  ['dark', 'Escuro', Moon],
  ['black', 'Preto', MoonStar],
  ['system', 'Sistema', Monitor],
]

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

function Tema() {
  const { theme } = useTheme()
  const { isMobile } = useSidebar()
  const [aberto, setAberto] = useState(false)
  const Atual = Temas.find(([valor]) => valor === theme)![2]
  return (
    <SidebarMenuItem>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <SidebarMenuButton tooltip="Tema">
            <Atual aria-hidden="true" />
            <span className="group-data-[collapsible=icon]:sr-only">Tema</span>
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent side={isMobile ? 'top' : 'right'} align="end" className="flex w-40 flex-col p-1">
          <OpcoesDeTema aoEscolher={() => setAberto(false)} />
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  )
}

export function tituloDaRota(pathname: string, numero?: string) {
  const caminho = pathname.split('/')[2]
  if (numero) return numero
  if (caminho === 'trocar-senha') return 'Trocar senha'
  if (caminho === 'conta') return 'Conta'
  if (caminho === 'gerir') return 'Gerir'
  return Menu.find((m) => m.caminho === caminho)?.rotulo ?? ''
}

const Papeis = [
  ['ADMINISTRADOR', 'Administrador'],
  ['ATENDENTE', 'Atendente'],
  ['ALUNO', 'Aluno'],
]
export const papelDe = (papeis: string[]) => Papeis.find(([p]) => papeis.includes(p))?.[1]

function Link({ item: { caminho, rotulo, Icone }, slug }: { item: Item; slug?: string }) {
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

function MenuUsuario({ me, sair }: { me: Me; sair: () => void }) {
  const { isMobile, state } = useSidebar()
  const dados = (
    <div className="grid min-w-0 flex-1 text-start text-sm leading-tight">
      <span className="truncate font-medium">{me.nome}</span>
      <span className="truncate text-xs text-muted-foreground">{papelDe(me.papeis)}</span>
    </div>
  )
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
            {state === 'collapsed' && !isMobile && (
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center text-xs font-semibold">
                {iniciais(me.nome)}
              </span>
            )}
            <div className="grid min-w-0 flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:sr-only">
              <span className="truncate font-medium">{me.nome}</span>
              <span className="truncate text-xs text-muted-foreground">{papelDe(me.papeis)}</span>
            </div>
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
  )
}

function ContatoDoMenu({ contato }: { contato: InstituicaoPublica['contato'] }) {
  const [aberto, setAberto] = useState(false)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip="Contato" onClick={() => setAberto(true)}>
        <Phone aria-hidden="true" />
        <span className="group-data-[collapsible=icon]:sr-only">Contato</span>
      </SidebarMenuButton>
      <DialogoDeContato contato={contato} aberto={aberto} aoMudar={setAberto} />
    </SidebarMenuItem>
  )
}

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
        <SidebarMenu>
          {temContato(ap.contato) && <ContatoDoMenu contato={ap.contato} />}
          <Tema />
          <MenuUsuario me={me} sair={sair} />
        </SidebarMenu>
        <SidebarTrigger className="self-end max-md:hidden pointer-coarse:size-11 group-data-[collapsible=icon]:self-center" />
      </SidebarFooter>
    </Sidebar>
  )
}

function Topo({ titulo, aluno, abas, slug, icone, nome, voltar }: { titulo: string; aluno: boolean; abas: boolean; slug?: string; icone: number | null; nome: string; voltar?: () => void }) {
  const { isMobile, toggleSidebar } = useSidebar()
  return (
    <header className="sticky top-0 z-10 flex h-[49px] shrink-0 items-center gap-2 border-b bg-background">
      <div className={`flex w-full min-w-0 items-center px-4 lg:px-6 ${abas ? 'gap-2' : 'gap-1 lg:gap-2'}`}>
        {!abas && isMobile && (
          <Button variant="ghost" size="icon" className="-ms-1" onClick={toggleSidebar}>
            <IconeMenu aria-hidden="true" />
            <span className="sr-only">Alternar barra lateral</span>
          </Button>
        )}
        {voltar && (
          <Button variant="ghost" size="icon" className="-ms-1" onClick={voltar}>
            <ChevronLeft aria-hidden="true" />
            <span className="sr-only">Voltar</span>
          </Button>
        )}
        {!voltar && <Sigla slug={slug} nome={nome} icone={icone} className="size-6 md:hidden" />}        <h1 className="truncate text-base font-medium">{titulo}</h1>
        <div className="ms-auto flex shrink-0 items-center gap-1">{aluno && <AvisosPush />}</div>
      </div>
    </header>
  )
}

type Aba = { caminho: string; rotulo: string; Icone: typeof Sun; ativas: string[] }

function abasDe(papeis: string[]): Aba[] {
  const { fixas, gerir } = distribuir(papeis)
  const doMenu = fixas.map(({ caminho, rotulo, abrev, Icone }) => ({ caminho, rotulo: abrev ?? rotulo, Icone, ativas: caminho === 'solicitacoes' ? [caminho, 'chamados'] : [caminho] }))
  const deGerir = gerir.length > 0 ? [{ caminho: 'gerir', rotulo: 'Gerir', Icone: LayoutGrid, ativas: ['gerir', ...gerir.map((g) => g.caminho)] }] : []
  return [...doMenu, ...deGerir, { caminho: 'conta', rotulo: 'Conta', Icone: CircleUser, ativas: ['conta'] }]
}

const AlturaDaBarra = 'calc(3.5rem + 1px + env(safe-area-inset-bottom))'
const AlturaDaBarraDeitada = 'calc(3rem + 1px + env(safe-area-inset-bottom))'

function BarraDeAbas({ slug, papeis, deitado }: { slug?: string; papeis: string[]; deitado: boolean }) {
  const segmento = useLocation().pathname.split('/')[2]
  const abas = abasDe(papeis)
  return (
    <nav aria-label="Navegação" style={{ gridTemplateColumns: `repeat(${abas.length}, minmax(0, 1fr))` }} className="fixed inset-x-0 bottom-0 z-20 grid border-t bg-background pb-[env(safe-area-inset-bottom)]">
      {abas.map(({ caminho, rotulo, Icone, ativas }) => {
        const ativo = ativas.includes(segmento)
        return (
          <RouterLink
            key={caminho}
            to={`/${slug}/${caminho}`}
            aria-current={ativo ? 'page' : undefined}
            className={`flex items-center justify-center ${deitado ? 'h-12 flex-row gap-2 text-sm' : 'h-14 flex-col gap-0.5 text-xs'} ${ativo ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
          >
            <Icone aria-hidden="true" className="size-5" />
            <span>{rotulo}</span>
          </RouterLink>
        )
      })}
    </nav>
  )
}

function PularParaOConteudo() {
  return (
    <a
      href="#conteudo"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById('conteudo')?.focus()
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring"
    >
      Pular para o conteúdo
    </a>
  )
}

const Rotas = [...Menu.map(({ caminho, papeis }) => [caminho, papeis] as const), ['conta', TodosOsPapeis] as const]
const rotaPermitida = (papeis: string[], caminho: string) => {
  if (caminho === 'gerir') return destinosDaGerir(papeis).length > 0
  const rota = Rotas.find(([c]) => c === caminho)
  return !rota || rota[1].some((p) => papeis.includes(p))
}

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

const semSessao = (erro: Error | null) => erro instanceof ErroApi && erro.status === 401

const textoDaSessao = (status: number) => {
  if (status === 403) return 'Você não tem permissão para esta ação.'
  if (status === 429) return 'Muitas tentativas. Aguarde um minuto e tente de novo.'
  return 'O serviço está indisponível no momento.'
}

function ErroDaSessao({ erro, tentar }: { erro: Error; tentar: () => void }) {
  if (!(erro instanceof ErroApi) || (erro.status !== 403 && erro.status !== 429 && erro.status < 500)) return <ErroDe erro={erro} oque="sua sessão" tentar={tentar} />
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden="true" />
      <div className="flex flex-col items-start gap-2">
        <p className="m-0">Não foi possível carregar sua sessão. {textoDaSessao(erro.status)}</p>
        {erro.status !== 403 && (
          <Button variant="outline" size="sm" onClick={tentar}>
            Tentar de novo
          </Button>
        )}
      </div>
    </Alert>
  )
}

function desvio({ me, erro, slug, pathname }: { me?: Me; erro: Error | null; slug?: string; pathname: string }) {
  if (semSessao(erro)) return `/${slug}`
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
  const { data: me, error, refetch } = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/auth/me') })
  const { data: instituicao } = useInstituicao(slug)
  useTempoReal(cliente, !!me && !me.deveTrocarSenha && me.instituicao.slug === slug)

  const destino = desvio({ me, erro: error, slug, pathname })
  if (destino) return <Navigate to={destino} replace />
  if (error)
    return (
      <div className="mx-auto flex min-h-svh max-w-sm items-center p-6">
        <ErroDaSessao erro={error} tentar={() => void refetch()} />
      </div>
    )
  if (!me)
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-8" />
      </div>
    )
  return <Casca me={me} slug={slug} ap={instituicao ?? normalizar({ nome: me.instituicao.nome })} />
}

function useModo(me: Me, slug?: string) {
  const { pathname, key } = useLocation()
  const navegar = useNavigate()
  const celular = useConsulta(Celular)
  const deitado = useConsulta(Deitado)
  const soAluno = me.papeis.length === 1 && me.papeis[0] === 'ALUNO'
  const equipe = me.papeis.some((p) => p === 'ATENDENTE' || p === 'ADMINISTRADOR')
  const noChamado = pathname.split('/')[2] === 'chamados'
  const abas = celular && (soAluno || !me.deveTrocarSenha)
  const lista = me.papeis.includes('ATENDENTE') ? 'fila' : 'solicitacoes'
  return {
    abas,
    deitado,
    comBarra: abas && !(noChamado && equipe),
    voltar: celular && noChamado ? () => (key === 'default' ? navegar(`/${slug}/${lista}`, { replace: true }) : navegar(-1)) : undefined,
  }
}

function Casca({ me, slug, ap }: { me: Me; slug?: string; ap: InstituicaoPublica }) {
  const { numero } = useParams()
  const { pathname } = useLocation()
  const cliente = useQueryClient()
  const barra = useBarra()
  const sair = useSair()
  const { abas, comBarra, deitado, voltar } = useModo(me, slug)
  const setMe = (novo: Me) => cliente.setQueryData(['me'], novo)
  const altura = deitado ? AlturaDaBarraDeitada : AlturaDaBarra

  return (
    <SidebarProvider open={barra.aberta} onOpenChange={barra.aoMudar} style={comBarra ? ({ '--barra': altura } as CSSProperties) : undefined}>
      <PularParaOConteudo />
      {!abas && <Barra me={me} itens={itensDo(me.papeis)} slug={slug} sair={sair} ap={ap} />}
      <SidebarInset id="conteudo" tabIndex={-1} className="min-w-0 outline-none">
        <Topo titulo={tituloDaRota(pathname, numero)} aluno={me.papeis.includes('ALUNO')} abas={abas} slug={slug} icone={ap.imagens.icone} nome={me.instituicao.nome} voltar={voltar} />
        <div className={`@container/main flex-1 px-4 py-4 md:py-6 lg:px-6 ${comBarra ? 'pb-[calc(var(--barra)+1rem)]' : ''}`}>
          <Outlet context={{ me, setMe } satisfies Sessao} />
        </div>
      </SidebarInset>
      {comBarra && <BarraDeAbas slug={slug} papeis={me.papeis} deitado={deitado} />}
    </SidebarProvider>
  )
}
