import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoresProntas } from './administracao/CoresProntas'
import { abrir, api, chamado, me, type Rota } from './test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const etapa = (destino: string, setorId: number | null, x: number, y: number) => ({ destino, setorId, prazoHoras: null, x, y })
const listas: Record<string, unknown[]> = {
  setores: [{ id: 2, nome: 'Financeiro', triagem: false, ativo: true }],
  categorias: [{ id: 7, nome: 'Notas', ativa: true, padrao: false }],
  cursos: [{ id: 4, nome: 'ADS', setorCoordenacaoId: 2 }],
  fluxos: [{ id: 8, categoriaId: 7, cursoId: null, semestre: null, vigente: null, rascunho: { numero: 1, etapas: [etapa('SETOR', 2, 300, 50), etapa('COORDENACAO_CURSO', null, 600, 50)] } }],
  'respostas-prontas': [],
}

const celular = () => vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media.startsWith('(max-width: 767px)'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
const classes = (el: HTMLElement) => el.getAttribute('class') ?? ''
const quarenta = (el: HTMLElement) => {
  expect(classes(el)).toMatch(/max-md:size-11/)
  expect(classes(el)).toMatch(/pointer-coarse:size-11/)
}
const foco = (el: HTMLElement) => {
  expect(classes(el)).toMatch(/focus-visible:ring-2/)
  expect(classes(el)).toMatch(/ring-ring/)
}

function fluxos(rotas: Record<string, Rota> = {}) {
  const leituras = Object.fromEntries(Object.entries(listas).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, v]) as Rota]))
  api({ 'GET /api/auth/me': () => [200, admin], ...leituras, ...rotas })
  abrir('/univag/cadastros')
}

async function abrirFluxo(visao: 'Lista' | 'Canvas') {
  await userEvent.click(await screen.findByRole('tab', { name: 'Fluxos' }))
  await userEvent.click(await within(screen.getByRole('tabpanel', { name: 'Fluxos' })).findByRole('button', { name: 'Notas' }))
  const regiao = within(await screen.findByRole('region', { name: 'Editar: Fluxos' }))
  await userEvent.click(regiao.getByRole('tab', { name: visao }))
  return regiao
}

function avisos() {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => null } }) } })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { requestPermission: async () => 'granted' })
  return { 'GET /api/push/chave': () => [200, { chavePublica: 'BAEC' }] as [number, unknown] }
}

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(navigator, 'serviceWorker')
  vi.unstubAllGlobals()
})

describe('alvos de toque de 44 px', () => {
  it('C22 Topo: o Voltar do chamado e o botão de avisos do aluno usam o alvo de 44 px', async () => {
    celular()
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado()], ...avisos() })
    abrir('/univag/chamados/ONE-1')
    const cabecalho = (await screen.findByRole('heading', { level: 1 })).closest('header') as HTMLElement
    quarenta(within(cabecalho).getByRole('button', { name: 'Voltar' }))
    quarenta(await within(cabecalho).findByRole('button', { name: 'Ativar avisos neste aparelho' }))
  })

  it('C22 ListaDeEtapas: subir, descer e remover usam o alvo de 44 px', async () => {
    fluxos()
    const regiao = await abrirFluxo('Lista')
    for (const nome of ['Mover etapa 1 para cima', 'Mover etapa 1 para baixo', 'Remover etapa 1']) quarenta(regiao.getByRole('button', { name: nome }))
  })

  it('C22 LigacaoComMais e Handle do canvas usam o alvo de 44 px com ponteiro grosso', async () => {
    fluxos()
    await abrirFluxo('Canvas')
    const mais = await screen.findAllByRole('button', { name: /^Inserir etapa/ })
    expect(mais.length).toBeGreaterThan(0)
    quarenta(mais[0])
    const alcas = document.querySelectorAll<HTMLElement>('.react-flow__handle')
    expect(alcas.length).toBeGreaterThan(0)
    for (const alca of alcas) expect(classes(alca)).toMatch(/pointer-coarse:size-11!/)
  })

  it('C22 o X do anexo usa o alvo de 44 px', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/assistente')
    await screen.findByLabelText('Mensagem')
    await userEvent.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['x'], 'boleto.pdf', { type: 'application/pdf' }))
    quarenta(await screen.findByRole('button', { name: 'Remover boleto.pdf' }))
  })
})

describe('anel de foco visível', () => {
  it('C23 Gerir e Conta', async () => {
    api({ 'GET /api/auth/me': () => [200, admin] })
    const gerir = abrir('/univag/gerir')
    foco(await within(await screen.findByRole('main')).findByRole('link', { name: /Usuários/ }))
    gerir.unmount()
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/conta')
    const principal = within(await screen.findByRole('main'))
    foco(await principal.findByRole('button', { name: /Tema/ }))
    foco(principal.getByRole('link', { name: /Trocar senha/ }))
    foco(principal.getByRole('button', { name: /Sair/ }))
  })

  it('C23 AdicionarEtapa, LigacaoComMais e menu de destinos no canvas', async () => {
    fluxos()
    await abrirFluxo('Canvas')
    foco(await screen.findByRole('button', { name: 'Adicionar etapa' }))
    foco(screen.getByRole('button', { name: 'Adicionar etapa no fim da cadeia' }))
    foco((await screen.findAllByRole('button', { name: /^Inserir etapa/ }))[0])
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar etapa' }))
    foco(await screen.findByRole('button', { name: /^Setor fixo/ }))
  })

  it('C23 CoresProntas', async () => {
    render(<CoresProntas cor={'#' + '224fa7'} escolher={() => {}} />)
    for (const cor of screen.getAllByRole('radio')) foco(cor)
  })

  it('C23 perguntas sugeridas do Assistente', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/assistente')
    foco(await screen.findByRole('button', { name: /Como emito o boleto do semestre\?/ }))
  })

  it('C23 disclosure da Conversa', async () => {
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado()] })
    abrir('/univag/chamados/ONE-1')
    foco(await screen.findByRole('button', { name: /^Conversa com o assistente/ }))
  })

  it('C23 links da BarraDeAbas', async () => {
    celular()
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/conta')
    const barra = await screen.findByRole('navigation', { name: 'Navegação' })
    const links = within(barra).getAllByRole('link')
    expect(links.length).toBeGreaterThan(1)
    for (const link of links) foco(link)
  })
})

describe('fechar do Editor', () => {
  it('C24 o SheetClose usa focus-visible e não focus', async () => {
    celular()
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': () => [200, []], 'GET /api/admin/setores': () => [200, []] })
    abrir('/univag/usuarios')
    await userEvent.click(await screen.findByRole('button', { name: 'Novo' }))
    const fechar = await screen.findByRole('button', { name: 'Fechar' })
    const lista = classes(fechar).split(/\s+/)
    expect(lista).toContain('focus-visible:ring-2')
    expect(lista).not.toContain('focus:ring-2')
    await waitFor(() => expect(fechar).toBeVisible())
  })
})
