import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import pacote from '../../package.json'
import { formatarData } from '../datas'
import { abrir, api, me } from '../test/util'

const instituicao = { 'GET /api/instituicoes/univag': () => [200, { nome: 'Univag' }] as [number, unknown] }

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
    const cabecalho = await screen.findByRole('navigation')
    expect(within(cabecalho).getByText('Univag')).toBeInTheDocument()
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
    expect(todas['vaul']).toBe('1.1.2')
    for (const proibido of ['next-themes', 'ai', '@ai-sdk/react', 'streamdown']) expect(todas[proibido], proibido).toBeUndefined()
  })

  // C91 (AC 49, door 10)
  it('Tema grava a escolha em one-tema', async () => {
    localStorage.clear()
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    for (const [rotulo, valor, classe] of [['Escuro', 'dark', 'dark'], ['Claro', 'light', 'light'], ['Sistema', 'system', 'light']]) {
      await userEvent.click(await screen.findByRole('button', { name: 'Tema' }))
      await userEvent.click(within(document.querySelector('[data-slot=popover-content]') as HTMLElement).getByRole('button', { name: rotulo }))
      expect(localStorage.getItem('one-tema'), rotulo).toBe(valor)
      expect(document.documentElement, rotulo).toHaveClass(classe)
    }
    expect(document.documentElement).not.toHaveClass('dark')
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
      ['ADMINISTRADOR', ['Artigos', 'Documentos', 'Indicadores', 'Usuários', 'Matrículas', 'Cadastros']],
    ] as const) {
      api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
      const { unmount } = abrir('/univag/trocar-senha')
      await screen.findByRole('heading', { name: 'Trocar senha' })
      const navs = screen.getAllByRole('navigation')
      expect(navs, papel).toHaveLength(1)
      const nav = within(navs[0])
      expect(nav.getByText('Univag')).toBeInTheDocument()
      expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual(links)
      expect(nav.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
      expect(nav.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
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
    ]) {
      const svg = icone(nav.getByRole('link', { name: rotulo }))
      expect(svg, rotulo).toHaveClass(classe)
      expect(svg, rotulo).toHaveAttribute('aria-hidden', 'true')
    }
    for (const [nome, classe] of [
      ['Sair', 'lucide-log-out'],
      ['Menu', 'lucide-menu'],
    ]) {
      const svg = icone(nav.getByRole('button', { name: nome }))
      expect(svg, nome).toHaveClass(classe)
      expect(svg, nome).toHaveAttribute('aria-hidden', 'true')
    }
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
    expect(chamadas.map((c) => c.corpo)).toEqual([{ instituicao: 'univag', cpf: '12345678909' }])
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
    expect(chamadas.map((c) => c.corpo)).toEqual([{ token: 'abc123', novaSenha: 'senha-boa-123' }])
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
