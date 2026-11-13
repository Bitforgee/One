import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { Monitor, Moon, MoonStar, Sun } from 'lucide-react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { textoVisivel } from './test/textos'
import { abrir, api, chamado, comTexto, instituicao, me, type Rota } from './test/util'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Sheet, SheetContent, SheetTitle } from './ui/sheet'

const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const css = readFileSync('src/index.css', 'utf8')

afterEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
})

function abrirComLocal(caminho: string) {
  const Local = () => <output data-testid="local">{useLocation().pathname}</output>
  const roteador = createMemoryRouter([{ path: '*', element: <><App /><Local /></> }], { initialEntries: [caminho] })
  return render(<RouterProvider router={roteador} />)
}

describe('ux', () => {
  it('Dialog e Sheet fecham por um botão Fechar', () => {
    const { unmount } = render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Diálogo</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    expect(screen.getAllByRole('button', { name: 'Fechar' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    unmount()
    render(
      <Sheet open>
        <SheetContent aria-describedby={undefined}>
          <SheetTitle>Folha</SheetTitle>
        </SheetContent>
      </Sheet>,
    )
    expect(screen.getAllByRole('button', { name: 'Fechar' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('verde só nos selos', () => {
    const Token = /(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow)-success\b|--success\b|--color-success\b/
    const usam = Object.entries(fontes)
      .filter(([caminho]) => !/\.test\.tsx?$/.test(caminho) && Token.test(fontes[caminho]))
      .map(([caminho]) => caminho.replace('/src/', ''))
    expect([...usam, ...(Token.test(css) ? ['index.css'] : [])].sort()).toEqual(['chamados/Chamados.tsx', 'conhecimento/comum.tsx', 'index.css'])
  })

  it.each([
    ['ALUNO', '/univag/assistente'],
    ['ATENDENTE', '/univag/fila'],
    ['ADMINISTRADOR', '/univag/artigos'],
  ])('pular para o conteúdo leva o foco ao main (%s)', async (papel, caminho) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
    abrirComLocal(caminho)
    const main = await waitFor(() => {
      const el = document.querySelector('main')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    ;(document.activeElement as HTMLElement).blur()
    expect(document.activeElement).toBe(document.body)
    await userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Pular para o conteúdo' }))
    await userEvent.keyboard('{Enter}')
    expect(document.activeElement).toBe(main)
  })

  const Rotas: Record<string, string[]> = {
    ALUNO: ['assistente', 'solicitacoes', 'conta'],
    ATENDENTE: ['fila', 'indicadores', 'conta'],
    ADMINISTRADOR: ['indicadores', 'artigos', 'documentos', 'usuarios', 'matriculas', 'cadastros', 'aparencia', 'conta'],
  }
  const Inicial: Record<string, string> = { ALUNO: 'assistente', ATENDENTE: 'fila', ADMINISTRADOR: 'artigos' }
  const Todas = ['assistente', 'solicitacoes', 'conta', 'fila', 'indicadores', 'artigos', 'documentos', 'usuarios', 'matriculas', 'cadastros', 'aparencia', 'instituicoes']
  const fora = Object.entries(Rotas).flatMap(([papel, minhas]) => Todas.filter((r) => !minhas.includes(r)).map((rota) => [papel, rota] as const))

  it('rota de outro papel volta à tela inicial (22 casos)', () => {
    expect(['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'].map((p) => fora.filter(([papel]) => papel === p).length)).toEqual([9, 9, 4])
    expect(fora).toHaveLength(22)
  })

  it.each(fora)('rota de outro papel volta à tela inicial (%s em /%s)', async (papel, rota) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
    abrirComLocal(`/univag/${rota}`)
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent(`/univag/${Inicial[papel]}`))
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it.each(Object.entries(Rotas).flatMap(([papel, minhas]) => minhas.map((rota) => [papel, rota] as const)))('o papel abre a própria rota sem redirecionar (%s em /%s)', async (papel, rota) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
    abrirComLocal(`/univag/${rota}`)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByTestId('local')).toHaveTextContent(`/univag/${rota}`)
  })

  it.each([
    ['light', Sun],
    ['dark', Moon],
    ['black', MoonStar],
    ['system', Monitor],
  ])('botão de tema mostra e marca o tema atual (%s)', async (tema, Icone) => {
    localStorage.setItem('one-tema', tema)
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrirComLocal('/univag/trocar-senha')
    const botao = await screen.findByRole('button', { name: 'Tema' })
    const { container } = render(<Icone />)
    expect(botao.querySelector('svg')!.innerHTML).toBe(container.querySelector('svg')!.innerHTML)
    await userEvent.click(botao)
    const opcoes = within(document.querySelector('[data-slot=popover-content]') as HTMLElement).getAllByRole('button')
    expect(opcoes.map((o) => [o.textContent, o.getAttribute('aria-pressed')])).toEqual(
      [['Claro', 'light'], ['Escuro', 'dark'], ['Preto', 'black'], ['Sistema', 'system']].map(([rotulo, valor]) => [rotulo, String(valor === tema)]),
    )
  })

  it('neutros tingidos pela marca nos três temas', () => {
    const bloco = (seletor: string) => css.slice(css.indexOf(`\n${seletor} {`)).split('}')[0]
    const Formato = /^color-mix\(in oklch, var\(--marca, oklch\([^)]+\)\) (\d+)%, oklch\([^)]+\)\)$/
    const declarado = (seletor: string, token: string) => bloco(seletor).match(new RegExp(`^\\s*${token}:\\s*([^;]+);`, 'm'))?.[1]
    const tokens = ['--background', '--muted', '--border', '--input', '--accent']
    let total = 0
    for (const [seletor, doTema] of [[':root', tokens], ['.dark', tokens], ['.black', tokens.slice(1)]] as const)
      for (const token of doTema) {
        const valor = declarado(seletor, token)
        expect(valor, `${seletor} ${token}`).toMatch(Formato)
        expect(Number(valor!.match(Formato)![1]), `${seletor} ${token}`).toBeGreaterThanOrEqual(2)
        expect(Number(valor!.match(Formato)![1]), `${seletor} ${token}`).toBeLessThanOrEqual(6)
        total++
      }
    expect(total).toBe(14)
    expect(declarado('.black', '--background')).toBe('okl' + 'ch(0 0 0)')
  })

  type Superficie = { nome: string; papeis: string[]; caminho: string; url: string; oque: string; vazios?: string[]; depois: string | RegExp; ok?: unknown }
  const Vazios = (...urls: string[]) => Object.fromEntries(urls.map((u) => [`GET ${u}`, (() => [200, []]) as Rota]))
  const Superficies: Superficie[] = [
    { nome: 'Minhas solicitações', papeis: ['ALUNO'], caminho: '/univag/solicitacoes', url: '/api/chamados?escopo=meus', oque: 'suas solicitações', depois: 'Nenhuma solicitação' },
    { nome: 'Fila', papeis: ['ATENDENTE'], caminho: '/univag/fila', url: '/api/chamados?escopo=fila', oque: 'a fila', depois: 'Fila em dia' },
    { nome: 'detalhe como aluno', papeis: ['ALUNO'], caminho: '/univag/chamados/ONE-1', url: '/api/chamados/ONE-1', oque: 'a solicitação', depois: 'preciso do boleto', ok: chamado() },
    { nome: 'detalhe como equipe', papeis: ['ATENDENTE'], caminho: '/univag/chamados/ONE-1', url: '/api/chamados/ONE-1', oque: 'o chamado', depois: 'preciso do boleto', ok: chamado({ eventos: [], resumo: 'x', solicitante: 'Ana', acoes: ['responder'] }) },
    { nome: 'Artigos', papeis: ['ADMINISTRADOR'], caminho: '/univag/artigos', url: '/api/admin/artigos', oque: 'os artigos', vazios: ['/api/admin/categorias'], depois: 'Nenhum artigo' },
    { nome: 'Documentos', papeis: ['ADMINISTRADOR'], caminho: '/univag/documentos', url: '/api/admin/documentos', oque: 'os documentos', vazios: ['/api/admin/categorias'], depois: 'Nenhum documento' },
    { nome: 'Usuários', papeis: ['ADMINISTRADOR'], caminho: '/univag/usuarios', url: '/api/admin/usuarios', oque: 'os usuários', vazios: ['/api/admin/setores'], depois: 'Nenhum usuário' },
    { nome: 'Cadastros', papeis: ['ADMINISTRADOR'], caminho: '/univag/cadastros', url: '/api/admin/setores', oque: 'os cadastros', vazios: ['/api/admin/categorias', '/api/admin/cursos', '/api/admin/fluxos', '/api/admin/respostas-prontas'], depois: 'Nada cadastrado' },
    { nome: 'Indicadores', papeis: ['ADMINISTRADOR'], caminho: '/univag/indicadores', url: '/api/indicadores?de=2026-11-01&ate=2026-11-10', oque: 'os indicadores', depois: 'Sem atendimentos neste período.', ok: { semDados: true } },
    { nome: 'Aparência', papeis: ['ADMINISTRADOR'], caminho: '/univag/aparencia', url: '/api/admin/aparencia', oque: 'a aparência', depois: /Cor principal/, ok: { ...instituicao(), nome: undefined } },
    { nome: 'Instituições', papeis: ['OPERADOR'], caminho: '/univag/instituicoes', url: '/api/plataforma/instituicoes', oque: 'as instituições', depois: 'Nada cadastrado' },
  ]

  it('erro de carregamento com Tentar de novo em 11 telas (as 11 superfícies)', () => {
    expect(Superficies.map((x) => x.nome)).toHaveLength(11)
  })

  it.each(Superficies)('erro de carregamento com Tentar de novo em 11 telas ($nome)', async ({ papeis, caminho, url, oque, vazios = [], depois, ok = [] }) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 10, 10, 0))
    let falhas = 1
    const chamadas = api({
      'GET /api/auth/me': () => [200, me({ papeis, matriculas: [] })],
      'GET /api/instituicoes/univag': () => [200, instituicao()],
      ...Vazios(...vazios),
      [`GET ${url}`]: () => (falhas-- > 0 ? [500, { status: 500, detail: 'Falha interna do servidor.' }] : [200, ok]),
    })
    abrirComLocal(caminho)
    const alerta = await screen.findByRole('alert')
    expect(alerta.querySelector('svg')).not.toBeNull()
    expect(alerta).toHaveTextContent(`Não foi possível carregar ${oque}. Verifique sua conexão.`)
    expect(alerta).not.toHaveTextContent('Falha interna')
    expect(chamadas.filter((c) => c.url === url)).toHaveLength(1)

    await userEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(chamadas.filter((c) => c.url === url)).toHaveLength(2))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(await (typeof depois === 'string' ? screen.findAllByText(depois, { exact: false }) : screen.findAllByLabelText(depois))).not.toHaveLength(0)
    vi.useRealTimers()
  })

  it('erro de carregamento com Tentar de novo em 11 telas: 404 e 403 seguem com o detail da API', async () => {
    for (const [status, detail] of [[404, 'Chamado não encontrado.'], [403, 'Você não tem acesso a este chamado.']] as const) {
      api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-9': () => [status, { status, detail }] })
      const { unmount } = abrirComLocal('/univag/chamados/ONE-9')
      const alerta = await screen.findByRole('alert')
      expect(alerta).toHaveTextContent(detail)
      expect(alerta).not.toHaveTextContent('Verifique sua conexão')
      expect(within(alerta).queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
      unmount()
    }
  })

  it('sem Sparkles no código', () => {
    const usam = Object.keys(fontes).filter((caminho) => !/\.test\.tsx?$/.test(caminho) && /Sparkles/.test(fontes[caminho]))
    expect(Object.keys(fontes).length).toBeGreaterThan(50)
    expect(usam).toEqual([])
  })

  const semChamado = () => expect(textoVisivel(document.body)).not.toMatch(/chamado/i)

  it('aluno lê Solicitação e a equipe lê Chamado (Assistente com conversa e transferido)', async () => {
    api({
      'GET /api/auth/me': () => [200, me()],
      'POST /api/conversas': () => [201, { conversaId: 7, resposta: { tipo: 'sem_base', texto: 'Não encontrei.' } }],
      'POST /api/conversas/7/transferir': () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Financeiro' }],
      'GET /api/chamados/ONE-1': () => [200, chamado()],
    })
    abrir('/univag/assistente')
    await userEvent.type(await screen.findByLabelText('Mensagem'), 'preciso do boleto')
    await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
    await screen.findByText('Não encontrei.')
    semChamado()
    await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
    semChamado()
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Falar com atendente' }))
    await screen.findByText(comTexto('Sua solicitação ONE-1 foi para Financeiro'))
    semChamado()
  })

  it.each([
    ['Minhas solicitações', '/univag/solicitacoes', { 'GET /api/chamados?escopo=meus': () => [200, [{ numero: 'ONE-1', titulo: 'preciso do boleto', estado: 'ABERTO', criadoEm: '2026-11-02T12:00:00Z' }]] }, 'preciso do boleto'],
    ['detalhe do chamado', '/univag/chamados/ONE-1', { 'GET /api/chamados/ONE-1': () => [200, chamado({ estado: 'ABERTO' })] }, 'preciso do boleto'],
    ['Conta', '/univag/conta', {}, 'Trocar senha'],
  ])('aluno lê Solicitação e a equipe lê Chamado (%s)', async (_, caminho, rotas, espera) => {
    api({ 'GET /api/auth/me': () => [200, me()], ...(rotas as Record<string, Rota>) })
    abrir(caminho)
    await screen.findAllByText(espera, { exact: false })
    semChamado()
  })

  it('aluno lê Solicitação e a equipe lê Chamado (o vazio da Fila da equipe)', async () => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'] })], 'GET /api/chamados?escopo=fila': () => [200, []] })
    abrir('/univag/fila')
    expect(await screen.findByText('Nenhum chamado na fila dos seus setores.')).toBeInTheDocument()
  })
})
