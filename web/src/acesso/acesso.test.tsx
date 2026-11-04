import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import pacote from '../../package.json'
import { formatarData } from '../datas'
import { iniciais } from '../Autenticado'
import { abrir, api, me } from '../test/util'
import { Toaster } from '../ui/sonner'
import { ThemeProvider } from '../ui/theme-provider'

// a barra lateral do shadcn (desktop ou painel do celular): nem sempre é um <nav>
const barra = () => document.querySelector('[data-sidebar=sidebar]') as HTMLElement
const alternarBarra = () => screen.findByRole('button', { name: 'Alternar barra lateral' })

const instituicao = { 'GET /api/instituicoes/univag': () => [200, { nome: 'Univag' }] as [number, unknown] }

async function escolherTema(rotulo: string) {
  await userEvent.click(await screen.findByRole('button', { name: 'Tema' }))
  await userEvent.click(within(document.querySelector('[data-slot=popover-content]') as HTMLElement).getByRole('button', { name: rotulo }))
}

async function entrar() {
  await userEvent.type(await screen.findByLabelText('CPF'), '123.456.789-09')
  await userEvent.type(screen.getByLabelText('Senha'), 'senha-boa-123')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('acesso', () => {
  it('login mostra o nome da instituição', async () => {
    api(instituicao)
    abrir('/univag')
    expect(await screen.findByText(/Univag/)).toBeInTheDocument()
    expect(screen.getByLabelText('CPF')).toBeInTheDocument()
  })

  // login-institucional C13: o jsdom não aplica lg:, o painel existe no DOM em qualquer largura
  it('painel de entrada sem foco e sem ícones', async () => {
    api({ ...instituicao, 'POST /api/auth/primeiro-acesso': () => [200, { mensagem: 'x' }] })
    for (const caminho of ['/univag', '/univag/primeiro-acesso', '/univag/definir-senha?token=t']) {
      const { unmount } = abrir(caminho)
      const painel = (await screen.findByRole('heading', { name: 'Atendimento ao estudante', hidden: true })).parentElement!.parentElement!
      // AC 47: sem imagem de login, o painel traz a ilustração Boas-vindas e mais nenhum ícone
      expect([...painel.querySelectorAll('svg')].map((v) => v.getAttribute('data-ilustracao')), caminho).toEqual(['boas-vindas'])
      expect(painel.querySelectorAll('a, button, input, select, textarea, [tabindex]'), caminho).toHaveLength(0)
      unmount()
    }
  })

  it('slug desconhecido mostra Instituição não encontrada', async () => {
    api({ 'GET /api/instituicoes/nada': () => [404, { status: 404, detail: 'Instituição não encontrada.' }] })
    abrir('/nada')
    expect(await screen.findByText('Instituição não encontrada.')).toBeInTheDocument()
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument()
  })

  it('formata data no fuso da instituição', () => {
    expect(formatarData('2026-11-02T02:30:00Z', 'America/Cuiaba')).toBe('01/11/2026 22:30')
  })

  it('deveTrocarSenha abre Trocar senha', async () => {
    api({ 'GET /api/auth/me': () => [200, me({ deveTrocarSenha: true })] })
    abrir('/univag/assistente')
    expect(await screen.findByRole('heading', { name: 'Trocar senha' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Assistente' })).not.toBeInTheDocument()
  })

  it('tela inicial por papel', async () => {
    for (const [papeis, tela] of [
      [['ALUNO'], 'Assistente'],
      [['ATENDENTE'], 'Fila'],
      [['ADMINISTRADOR'], 'Artigos'],
    ] as const) {
      api({
        ...instituicao,
        'POST /api/auth/login': () => [200, { id: 1, nome: 'Ana', papeis, deveTrocarSenha: false, instituicao: { slug: 'univag', nome: 'Univag' } }],
        'GET /api/auth/me': () => [200, me({ papeis: [...papeis] })],
      })
      const { unmount } = abrir('/univag')
      await entrar()
      expect(await screen.findByRole('heading', { name: tela })).toBeInTheDocument()
      unmount()
    }

    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE', 'ADMINISTRADOR'] })] })
    abrir('/univag/fila')
    const menu = within(await screen.findByRole('navigation'))
    expect(menu.getByRole('link', { name: /Fila/ })).toBeInTheDocument()
    expect(menu.getByRole('link', { name: /Artigos/ })).toBeInTheDocument()
    expect(menu.queryByRole('link', { name: /Assistente/ })).not.toBeInTheDocument()
  })

  it('erro mostra detail num Alert', async () => {
    api({ ...instituicao, 'POST /api/auth/login': () => [401, { status: 401, title: 'Não autenticado', detail: 'CPF ou senha inválidos.' }] })
    abrir('/univag')
    await entrar()
    expect(await screen.findByRole('alert')).toHaveTextContent('CPF ou senha inválidos.')
    expect(screen.getByRole('alert')).toHaveClass('text-destructive')
  })

  it('requisição pendente mostra Spinner e desabilita o botão', async () => {
    api({ ...instituicao, 'POST /api/auth/login': () => new Promise(() => {}) })
    abrir('/univag')
    await entrar()
    await waitFor(() => expect(screen.getByRole('button', { name: /Entrar/ })).toBeDisabled())
    expect(within(screen.getByRole('button', { name: /Entrar/ })).getByRole('status')).toHaveClass('animate-spin')
  })

  // C60 (AC 39, AC 40): só os 6 campos obrigatórios; o que a API recusa sai mesmo assim
  it('formulários de acesso exigem só os obrigatórios', async () => {
    const recusa = (detail: string) => () => [422, { status: 422, title: 'Dados inválidos', detail }] as [number, unknown]
    const telas: [string, string, string, [string, string][], Record<string, () => [number, unknown]>][] = [
      ['/univag', 'Entrar', '/api/auth/login', [['CPF', '1'], ['Senha', 'x']], { ...instituicao, 'POST /api/auth/login': recusa('CPF inválido.') }],
      ['/univag/primeiro-acesso', 'Enviar link', '/api/auth/primeiro-acesso', [['CPF', '1']], { 'POST /api/auth/primeiro-acesso': recusa('CPF inválido.') }],
      ['/univag/definir-senha?token=t', 'Salvar senha', '/api/auth/definir-senha', [['Nova senha', 'x']], { 'POST /api/auth/definir-senha': recusa('Senha curta.') }],
      ['/univag/trocar-senha', 'Salvar', '/api/auth/senha', [['Senha atual', 'x'], ['Nova senha', 'x']], { 'GET /api/auth/me': () => [200, me()], 'POST /api/auth/senha': recusa('Senha curta.') }],
    ]
    for (const [caminho, botao, url, campos, rotas] of telas) {
      for (const vazio of campos.map(([rotulo]) => rotulo)) {
        const chamadas = api(rotas)
        const { unmount } = abrir(caminho)
        for (const [rotulo, valor] of campos) if (rotulo !== vazio) await userEvent.type(await screen.findByLabelText(rotulo), valor)
        await userEvent.click(await screen.findByRole('button', { name: botao }))
        await waitFor(() => expect(screen.getByLabelText(vazio)).toHaveAttribute('aria-invalid', 'true'))
        expect(chamadas.filter((c) => c.metodo === 'POST'), `${caminho} sem ${vazio}`).toEqual([])
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        unmount()
      }
      const chamadas = api(rotas)
      const { unmount } = abrir(caminho)
      for (const [rotulo, valor] of campos) await userEvent.type(await screen.findByLabelText(rotulo), valor)
      await userEvent.click(screen.getByRole('button', { name: botao }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/inválido|curta/)
      expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => c.url), caminho).toEqual([url])
      unmount()
    }
  })

  it('cabeçalho mostra a instituição', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/assistente')
    await screen.findByRole('navigation')
    expect(within(barra()).getByText('Univag')).toBeInTheDocument()
  })

  it('dependências do kit de interface', () => {
    const todas = { ...pacote.dependencies, ...pacote.devDependencies } as Record<string, string>
    for (const saiu of ['bootstrap', 'react-bootstrap', 'bootstrap-icons']) expect(todas[saiu], saiu).toBeUndefined()
    // C90: nenhum arquivo importa esses pacotes (o import de bootstrap-icons/font/*.css no main.tsx também falha aqui); os nomes em pedaços
    const importa = new RegExp(`['"](react-)?boot` + `strap(-icons)?[/'"]`)
    const fontes = import.meta.glob('/src/**/*.{ts,tsx,css}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.entries(fontes).filter(([nome, texto]) => !nome.includes('.test.') && importa.test(texto)).map(([nome]) => nome)).toEqual([])
    expect(todas['react-router']).toMatch(/^\^?8\./)
    expect(todas['vite-plugin-pwa']).toBe('2.0.0')
    // door 9: a stack nova com versão exata, e nada do AI SDK nem do next-themes
    expect(todas['tailwindcss']).toBe('4.3.4')
    expect(todas['@tailwindcss/vite']).toBe('4.3.4')
    expect(todas['lucide-react']).toBe('1.66.0')
    expect(todas['@tanstack/react-query']).toBe('5.105.3')
    expect(todas['vaul']).toBeUndefined() // layout-painel C38: a gaveta Vaul saiu
    for (const proibido of ['next-themes', 'ai', '@ai-sdk/react', 'streamdown']) expect(todas[proibido], proibido).toBeUndefined()
  })

  // C91 (AC 49, door 10)
  it('Tema grava a escolha em one-tema', async () => {
    localStorage.clear()
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    // redesign-institucional (## Screens linha 0): os temas nesta ordem
    await userEvent.click(await screen.findByRole('button', { name: 'Tema' }))
    expect(within(document.querySelector('[data-slot=popover-content]') as HTMLElement).getAllByRole('button').map((b) => b.textContent)).toEqual(['Claro', 'Escuro', 'Preto', 'Sistema'])
    await userEvent.keyboard('{Escape}')
    // redesign-institucional C3 (AC 3, door 1): Preto grava black e põe dark e black
    for (const [rotulo, valor, classes] of [['Escuro', 'dark', ['dark']], ['Claro', 'light', ['light']], ['Preto', 'black', ['dark', 'black']], ['Sistema', 'system', ['light']]] as const) {
      await escolherTema(rotulo)
      expect(localStorage.getItem('one-tema'), rotulo).toBe(valor)
      expect([...document.documentElement.classList].sort(), rotulo).toEqual([...classes].sort())
    }
    expect(document.documentElement).not.toHaveClass('dark')
  })

  // redesign-institucional C4 (AC 4)
  it('sair do Preto tira a classe black', async () => {
    localStorage.clear()
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    for (const rotulo of ['Claro', 'Escuro', 'Sistema']) {
      await escolherTema('Preto')
      expect(document.documentElement, rotulo).toHaveClass('black')
      await escolherTema(rotulo)
      expect(document.documentElement, rotulo).not.toHaveClass('black')
    }
  })

  // redesign-institucional C12 (AC 12): só o link da rota atual fica marcado
  it('link ativo da barra lateral', async () => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE', 'ADMINISTRADOR'] })], 'GET /api/chamados?escopo=fila': () => [200, []] })
    abrir('/univag/fila')
    const nav = await screen.findByRole('navigation')
    const links = await within(nav).findAllByRole('link')
    expect(links.length).toBe(8) // + Aparência (AC 23)
    for (const link of links) {
      const ativo = link.textContent === 'Fila'
      expect(link.getAttribute('aria-current'), link.textContent!).toBe(ativo ? 'page' : null)
      expect(link.getAttribute('data-active'), link.textContent!).toBe(String(ativo))
    }
  })

  // layout-painel C8 (AC 8): no cabeçalho, da esquerda para a direita, o botão da barra, avisos (só aluno) e Tema
  it.each([
    [['ALUNO'], ['Alternar barra lateral', 'Ativar avisos neste aparelho', 'Tema']],
    [['ATENDENTE'], ['Alternar barra lateral', 'Tema']],
    [['ADMINISTRADOR'], ['Alternar barra lateral', 'Tema']],
  ])('botões do cabeçalho por papel (%j)', async (papeis, botoes) => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => null } }) } })
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', { requestPermission: async () => 'granted' })
    api({ 'GET /api/auth/me': () => [200, me({ papeis })], 'GET /api/push/chave': () => [200, { chavePublica: 'BAEC' }] })
    abrir('/univag/trocar-senha')
    const cabecalho = (await screen.findByRole('heading', { level: 1, name: 'Trocar senha' })).closest('header') as HTMLElement
    if (papeis.includes('ALUNO')) await within(cabecalho).findByRole('button', { name: botoes[1] })
    else await new Promise((r) => setTimeout(r, 50))
    expect([...cabecalho.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(botoes)
    Reflect.deleteProperty(navigator, 'serviceWorker')
    vi.unstubAllGlobals()
  })

  // C92 (AC 50, door 10)
  it('sem tema gravado segue o sistema', async () => {
    for (const escuro of [true, false]) {
      localStorage.clear()
      vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: escuro, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
      api({ 'GET /api/auth/me': () => [200, me()] })
      const { unmount } = abrir('/univag/trocar-senha')
      await screen.findByRole('button', { name: 'Tema' })
      expect(document.documentElement).toHaveClass(escuro ? 'dark' : 'light')
      expect(document.documentElement).not.toHaveClass(escuro ? 'light' : 'dark')
      unmount()
    }
  })

  it('cabeçalho num único nav por papel', async () => {
    for (const [papel, links] of [
      ['ALUNO', ['Assistente', 'Minhas solicitações']],
      ['ATENDENTE', ['Fila', 'Indicadores']],
      ['ADMINISTRADOR', ['Indicadores', 'Artigos', 'Documentos', 'Usuários', 'Matrículas', 'Cadastros', 'Aparência']], // barra-lateral-grupos: ordem dos grupos
    ] as const) {
      api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
      const { unmount } = abrir('/univag/trocar-senha')
      await screen.findByRole('heading', { name: 'Trocar senha' })
      const navs = screen.getAllByRole('navigation')
      expect(navs, papel).toHaveLength(1)
      const nav = within(navs[0])
      expect(within(barra()).getByText('Univag')).toBeInTheDocument()
      expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual(links)
      expect(screen.getByRole('button', { name: 'Alternar barra lateral' })).toBeInTheDocument()
      expect(within(barra()).getByRole('button', { name: new RegExp(me().nome) })).toBeInTheDocument()
      unmount()
    }
  })

  it('ícones Lucide do cabeçalho', async () => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'] })] })
    abrir('/univag/trocar-senha')
    const nav = within(await screen.findByRole('navigation'))
    const icone = (el: HTMLElement) => el.querySelector('svg')
    for (const [rotulo, classe] of [
      ['Assistente', 'lucide-message-circle'],
      ['Minhas solicitações', 'lucide-list-checks'],
      ['Fila', 'lucide-inbox'],
      ['Artigos', 'lucide-book-text'],
      ['Documentos', 'lucide-file-text'],
      ['Indicadores', 'lucide-chart-column'],
      ['Usuários', 'lucide-users'],
      ['Matrículas', 'lucide-upload'],
      ['Cadastros', 'lucide-settings'],
      ['Aparência', 'lucide-palette'],
    ]) {
      const svg = icone(nav.getByRole('link', { name: rotulo }))
      expect(svg, rotulo).toHaveClass(classe)
      expect(svg, rotulo).toHaveAttribute('aria-hidden', 'true')
    }
    const botao = icone(await alternarBarra())
    expect(botao, 'Alternar barra lateral').toHaveClass('lucide-panel-left')
    expect(botao, 'Alternar barra lateral').toHaveAttribute('aria-hidden', 'true')
    await userEvent.click(within(barra()).getByRole('button', { name: new RegExp(me().nome) }))
    const sair = icone(await screen.findByRole('menuitem', { name: 'Sair' }))
    expect(sair, 'Sair').toHaveClass('lucide-log-out')
    expect(sair, 'Sair').toHaveAttribute('aria-hidden', 'true')
  })

  it('QueryClient por montagem sem nova tentativa nem releitura no foco', async () => {
    const leiturasDoMe = (chamadas: { url: string }[]) => chamadas.filter((c) => c.url === '/api/auth/me').length

    // 500 no /me: uma chamada só, e a tela volta para o Login
    const falha = api({ ...instituicao, 'GET /api/auth/me': () => [500, { status: 500, detail: 'Erro.' }] })
    const primeira = abrir('/univag/assistente')
    expect(await screen.findByLabelText('CPF')).toBeInTheDocument()
    expect(leiturasDoMe(falha)).toBe(1)
    primeira.unmount()

    // com o /me carregado, foco e visibilidade da janela não releem
    const chamadas = api({ 'GET /api/auth/me': () => [200, me()] })
    const segunda = abrir('/univag/trocar-senha')
    await screen.findByRole('heading', { name: 'Trocar senha' })
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 50))
    expect(leiturasDoMe(chamadas)).toBe(1)
    segunda.unmount()

    // outra montagem do App não herda o /me da anterior
    api({ 'GET /api/auth/me': () => new Promise(() => {}) })
    abrir('/univag/trocar-senha')
    expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    expect(screen.queryByText('Univag')).not.toBeInTheDocument()
  })

  it('primeiro acesso mostra a mensagem da API no lugar do formulário', async () => {
    const chamadas = api({ 'POST /api/auth/primeiro-acesso': () => [200, { mensagem: 'Se o CPF estiver cadastrado, enviamos um link para o e-mail.' }] })
    abrir('/univag/primeiro-acesso')
    await userEvent.type(await screen.findByLabelText('CPF'), '12345678909')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByText('Se o CPF estiver cadastrado, enviamos um link para o e-mail.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar link' })).not.toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => c.corpo)).toEqual([{ instituicao: 'univag', cpf: '12345678909' }]) // a leitura da aparência (GET) é de AC 36
  })

  it('definir senha envia o token do link e mostra Senha criada', async () => {
    const chamadas = api({ 'POST /api/auth/definir-senha': () => [204, undefined] })
    abrir('/univag/definir-senha?token=abc123')
    expect(screen.queryByText(/Senha criada/)).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nova senha'), 'senha-boa-123')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))
    expect(await screen.findByText(/Senha criada/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entre com o CPF e a nova senha.' })).toHaveAttribute('href', '/univag')
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => c.corpo)).toEqual([{ token: 'abc123', novaSenha: 'senha-boa-123' }])
  })

  it('troca de senha por vontade própria não mostra o aviso da senha temporária', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    expect(await screen.findByRole('heading', { name: 'Trocar senha' })).toBeInTheDocument()
    expect(screen.queryByText('Troque a senha temporária para continuar.')).not.toBeInTheDocument()
  })

  it('trocada a senha temporária, abre a tela inicial', async () => {
    // a API passa a responder deveTrocarSenha false depois da troca
    let trocou = false
    const chamadas = api({
      'GET /api/auth/me': () => [200, me({ deveTrocarSenha: !trocou })],
      'POST /api/auth/senha': () => {
        trocou = true
        return [204, undefined]
      },
    })
    abrir('/univag/trocar-senha')
    expect(await screen.findByText('Troque a senha temporária para continuar.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Senha atual'), 'temporaria-1')
    await userEvent.type(screen.getByLabelText('Nova senha'), 'senha-boa-123')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('heading', { name: 'Assistente' })).toBeInTheDocument()
    expect(chamadas.find((c) => c.url === '/api/auth/senha')?.corpo).toEqual({ senhaAtual: 'temporaria-1', novaSenha: 'senha-boa-123' })
  })
})

// redesign-institucional S1: o tema Preto (door 1) e os valores de one-tema gravados antes dele.
const montarTema = () =>
  render(
    <ThemeProvider defaultTheme="system" storageKey="one-tema">
      <Toaster containerAriaLabel="Notificações" />
    </ThemeProvider>,
  )

afterEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
})

describe('tema (redesign-institucional)', () => {
  // C6 (AC 6)
  it('Toaster escuro no tema Preto', async () => {
    localStorage.setItem('one-tema', 'black')
    montarTema()
    act(() => void toast('Artigo salvo.'))
    const lista = await new Promise<Element>((ok) => {
      const procurar = () => {
        const el = document.querySelector('[data-sonner-toaster]')
        return el ? ok(el) : setTimeout(procurar, 10)
      }
      procurar()
    })
    expect(lista).toHaveAttribute('data-sonner-theme', 'dark')
    expect(document.documentElement).toHaveClass('dark', 'black')
  })

  // C7 (AC 7): matchMedia do jsdom (setup.ts) responde claro, então "system" vira light
  it('valor antigo de one-tema', () => {
    for (const [valor, classe] of [['light', 'light'], ['dark', 'dark'], ['system', 'light']]) {
      localStorage.setItem('one-tema', valor)
      const { unmount } = montarTema()
      expect(document.documentElement, valor).toHaveClass(classe)
      expect(document.documentElement, valor).not.toHaveClass('black')
      expect(document.documentElement.classList, valor).toHaveLength(1)
      unmount()
      document.documentElement.className = ''
    }
  })
})

// barra-lateral-grupos: grupos, nome do usuário e a preferência de recolher
describe('barra lateral com grupos', () => {
  afterEach(() => {
    localStorage.clear()
    window.innerWidth = 1024
  })

  const Todos = ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR']
  const Esperado = [
    ['Atendimento', ['Assistente', 'Minhas solicitações', 'Fila', 'Indicadores']],
    ['Conhecimento', ['Artigos', 'Documentos']],
    ['Administração', ['Usuários', 'Matrículas', 'Cadastros', 'Aparência']],
  ]
  // [título do grupo, rótulos dos links dentro dele], na ordem do DOM
  const grupos = (raiz: HTMLElement) => within(raiz).getAllByRole('group').map((g) => [g.getAttribute('aria-labelledby') && document.getElementById(g.getAttribute('aria-labelledby')!)?.textContent, within(g).getAllByRole('link').map((l) => l.textContent)])

  // C1, C3 (AC 1, AC 3)
  it('grupos por assunto na barra e na gaveta', async () => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: Todos })] })
    abrir('/univag/trocar-senha')
    const nav = await screen.findByRole('navigation')
    expect(grupos(nav)).toEqual(Esperado)
    for (const [nome] of Esperado) expect(within(nav).getByRole('group', { name: nome as string })).toBeInTheDocument()
    cleanup()
    window.innerWidth = 500 // o painel lateral do celular
    abrir('/univag/trocar-senha')
    await userEvent.click(await alternarBarra())
    const gaveta = await screen.findByRole('dialog', { name: 'Menu' })
    expect(grupos(gaveta)).toEqual(Esperado)
    for (const [nome] of Esperado) expect(within(gaveta).getByRole('group', { name: nome as string })).toBeInTheDocument()
  })

  // C2 (AC 2)
  it.each([
    [['ALUNO'], [['Atendimento', ['Assistente', 'Minhas solicitações']]]],
    [['ATENDENTE'], [['Atendimento', ['Fila', 'Indicadores']]]],
    [['ADMINISTRADOR'], [['Atendimento', ['Indicadores']], ['Conhecimento', ['Artigos', 'Documentos']], ['Administração', ['Usuários', 'Matrículas', 'Cadastros', 'Aparência']]]],
  ])('grupos por papel (%j)', async (papeis, esperado) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis })] })
    abrir('/univag/trocar-senha')
    expect(grupos(await screen.findByRole('navigation'))).toEqual(esperado)
  })

  // layout-painel C5 (AC 5): o painel do celular leva a instituição, os links e o botão do usuário
  it('nome do usuário no painel do celular', async () => {
    window.innerWidth = 500
    api({ 'GET /api/auth/me': () => [200, me({ nome: 'Ana Beatriz Souza' })] })
    abrir('/univag/trocar-senha')
    await userEvent.click(await alternarBarra())
    const painel = await screen.findByRole('dialog', { name: 'Menu' })
    const nome = within(painel).getByText('Ana Beatriz Souza')
    expect(within(painel).getByText('Aluno')).toBeInTheDocument()
    expect(within(painel).getByText('Univag')).toBeInTheDocument()
    expect(within(painel).getAllByRole('link')[0].compareDocumentPosition(nome) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // C7 (AC 6)
  it('iniciais do usuário', () => {
    expect(iniciais('Ana Beatriz Souza')).toBe('AS')
    expect(iniciais('ana')).toBe('A')
    expect(iniciais('  Carla  Regina ')).toBe('CR')
  })

  const estado = () => document.querySelector('[data-slot=sidebar]')!.getAttribute('data-state')

  // layout-painel C2 (AC 2)
  it('alternar barra grava one-barra', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    await userEvent.click(await alternarBarra())
    expect(estado()).toBe('collapsed')
    expect(localStorage.getItem('one-barra')).toBe('recolhida')
    await userEvent.click(await alternarBarra())
    expect(estado()).toBe('expanded')
    expect(localStorage.getItem('one-barra')).toBe('aberta')
  })

  // layout-painel C3 (AC 3): recolhida só com o valor exato
  it.each([
    ['recolhida', 'collapsed'],
    ['aberta', 'expanded'],
    [null, 'expanded'],
    ['xyz', 'expanded'],
  ])('estado inicial da barra por one-barra (%s)', async (valor, esperado) => {
    if (valor !== null) localStorage.setItem('one-barra', valor)
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    await alternarBarra()
    expect(estado()).toBe(esperado)
  })

  // layout-painel C7 (AC 7)
  it('Ctrl+B alterna a barra', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    await alternarBarra()
    for (const tecla of ['{Control>}b{/Control}', '{Meta>}b{/Meta}']) {
      await userEvent.keyboard(tecla)
      expect(estado()).toBe('collapsed')
      await userEvent.keyboard(tecla)
      expect(estado()).toBe('expanded')
    }
  })

  // layout-painel C12 (AC 12): o nome do documento vai em pedaços para este arquivo não se acusar
  it('sem cookie sidebar_state', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    await userEvent.click(await alternarBarra())
    await userEvent.click(await alternarBarra())
    expect(document.cookie).not.toContain('sidebar_state')
    const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(fontes).filter((a) => fontes[a].includes('document' + '.cookie'))).toEqual([])
  })

  // layout-painel C9 (AC 9): um h1 por tela, o rótulo do link, o número ou "Trocar senha"
  it.each([
    ['assistente', 'Assistente'],
    ['solicitacoes', 'Minhas solicitações'],
    ['fila', 'Fila'],
    ['indicadores', 'Indicadores'],
    ['artigos', 'Artigos'],
    ['documentos', 'Documentos'],
    ['usuarios', 'Usuários'],
    ['matriculas', 'Matrículas'],
    ['cadastros', 'Cadastros'],
    ['aparencia', 'Aparência'],
    ['chamados/ONE-7', 'ONE-7'],
    ['trocar-senha', 'Trocar senha'],
  ])('título do cabeçalho por rota (%s)', async (caminho, titulo) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: Todos })] })
    abrir('/univag/' + caminho)
    await screen.findByRole('heading', { level: 1, name: titulo })
    await new Promise((r) => setTimeout(r, 50)) // dá tempo de a tela desenhar o que tiver
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  // layout-painel C10 (AC 10)
  it.each([
    [['ADMINISTRADOR', 'ATENDENTE', 'ALUNO'], 'Administrador'],
    [['ALUNO', 'ATENDENTE'], 'Atendente'],
    [['ALUNO'], 'Aluno'],
  ])('papel do usuário por precedência (%j)', async (papeis, papel) => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis })] })
    abrir('/univag/trocar-senha')
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(me().nome) }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText(me().nome)).toBeInTheDocument()
    expect(within(menu).getByText(papel)).toBeInTheDocument()
  })

  it('menu do usuário', async () => {
    const chamadas = api({ ...instituicao, 'GET /api/auth/me': () => [200, me()], 'POST /api/auth/logout': () => [204, undefined] })
    abrir('/univag/trocar-senha')
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(me().nome) }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Aluno')).toBeInTheDocument()
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Sair' }))
    expect(await screen.findByLabelText('CPF')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo === 'POST' && c.url === '/api/auth/logout')).toHaveLength(1)
  })
})
