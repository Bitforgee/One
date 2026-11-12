import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me, type Rota } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const Urls = {
  urlLogin: 'https://one.teste/api/moodle/univag/login',
  urlLancamento: 'https://one.teste/api/moodle/univag/lancamento',
  urlJwks: 'https://one.teste/api/moodle/univag/jwks',
}
const vazia = { configurada: false, ativa: false, emissor: '', clientId: '', deploymentId: '', authUrl: '', jwksUrl: '', ...Urls }

const rotas = (get: Rota, extra: Record<string, Rota> = {}) =>
  api({
    'GET /api/auth/me': () => [200, admin],
    'GET /api/instituicoes/univag': () => [200, instituicao()],
    'GET /api/admin/moodle': get,
    'GET /api/admin/mcp': () => [200, { url: 'https://one.teste/api/mcp/univag', tokens: [] }],
    ...extra,
  })

const configurada = (ativa: boolean) => ({ ...vazia, configurada: true, ativa, emissor: 'https://ava.teste', clientId: 'cliente-1', deploymentId: '7', authUrl: 'https://ava.teste/auth', jwksUrl: 'https://ava.teste/certs' })
const token = (id: number, estado: string) => ({ id, nome: `T${id}`, usuario: 'Ana', final: 'wxyz', criadoEm: '2026-11-01T15:00:00Z', expiraEm: '2027-01-30T15:00:00Z', ultimoUsoEm: null, estado })
const urlMcp = 'https://one.teste/api/mcp/univag'
const comTokens = (tokens: unknown[]) => () => [200, { url: urlMcp, tokens }] as [number, unknown]
const estadoDe = (nome: string) => {
  const aba = screen.getByRole('tab', { name: nome })
  const id = aba.getAttribute('aria-describedby')
  return id ? document.getElementById(id)?.textContent : undefined
}
const preenchido = {
  'Emissor (iss)': 'https://ava.teste',
  'Client ID': 'cliente-1',
  'Deployment ID': '7',
  'URL de autenticação': 'https://ava.teste/mod/lti/auth.php',
  'URL das chaves (JWKS)': 'https://ava.teste/mod/lti/certs.php',
}
const preencher = async () => {
  for (const [rotulo, valor] of Object.entries(preenchido)) await userEvent.type(await screen.findByLabelText(rotulo), valor)
}
const salvaOk: Record<string, Rota> = { 'PUT /api/admin/moodle': (c) => [200, { ...vazia, ...(c as object), configurada: true }] }

const nomesDasAbas = () => screen.getAllByRole('tab').map((t) => t.textContent)

describe('tela Integrações', () => {
  it('coluna lateral', async () => {
    rotas(() => [200, vazia])
    abrir('/univag/integracoes')
    await screen.findByLabelText('Emissor (iss)')
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Integrações'])
    const lista = screen.getByRole('tablist')
    expect(lista).toHaveAttribute('aria-orientation', 'vertical')
    expect(nomesDasAbas()).toEqual(['Moodle', 'MCP'])
    expect(screen.getByRole('tab', { name: 'Moodle' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'MCP' })).toHaveAttribute('aria-selected', 'false')
  })

  it('cabeçalho do painel', async () => {
    rotas(() => [200, vazia])
    abrir('/univag/integracoes')
    await screen.findByLabelText('Emissor (iss)')
    const moodle = screen.getByRole('heading', { name: 'Moodle', level: 2 })
    expect(moodle.nextElementSibling).toHaveTextContent(/^Alunos que entram pela atividade One no Moodle chegam ao assistente sem digitar CPF nem senha\./)
    expect(screen.getAllByText(/^Alunos que entram pela atividade One/)).toHaveLength(1)
    await userEvent.click(screen.getByRole('tab', { name: 'MCP' }))
    const mcp = await screen.findByRole('heading', { name: 'MCP', level: 2 })
    expect(mcp.nextElementSibling).toHaveTextContent(/^Conecte a IA que você já usa/)
    expect(screen.getAllByText(/^Conecte a IA que você já usa/)).toHaveLength(1)
  })

  it('item pelo endereço e pelo teclado', async () => {
    for (const [caminho, esperado] of [
      ['/univag/integracoes', 'Moodle'],
      ['/univag/integracoes?aba=moodle', 'Moodle'],
      ['/univag/integracoes?aba=mcp', 'MCP'],
      ['/univag/integracoes?aba=qualquer-coisa', 'Moodle'],
    ]) {
      rotas(() => [200, vazia])
      const { unmount } = abrir(caminho)
      await screen.findByRole('heading', { name: esperado, level: 2 })
      expect(screen.getByRole('tab', { name: esperado }), caminho).toHaveAttribute('aria-selected', 'true')
      unmount()
    }

    rotas(() => [200, vazia])
    abrir('/univag/integracoes')
    await screen.findByLabelText('Emissor (iss)')
    await userEvent.click(screen.getByRole('tab', { name: 'MCP' }))
    expect(await screen.findByText('Nenhum token ainda.')).toBeInTheDocument()
    expect(document.querySelector('[data-aba-ativa]')?.getAttribute('data-aba-ativa')).toBe('mcp')

    screen.getByRole('tab', { name: 'Moodle' }).focus()
    await userEvent.click(screen.getByRole('tab', { name: 'Moodle' }))
    await userEvent.keyboard('{ArrowDown}')
    expect(await screen.findByRole('heading', { name: 'MCP', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'MCP' })).toHaveAttribute('aria-selected', 'true')
  })

  it('seletor sem coluna', async () => {
    rotas(() => [200, vazia])
    abrir('/univag/integracoes')
    await screen.findByLabelText('Emissor (iss)')
    const seletor = screen.getByRole('combobox', { name: 'Integração' })
    await waitFor(() => expect(within(seletor).getAllByRole('option').map((o) => o.textContent)).toEqual(['Moodle · Não configurado', 'MCP · Sem tokens ativos']))
    expect(seletor).toHaveValue('moodle')
    await userEvent.selectOptions(seletor, 'mcp')
    expect(await screen.findByText('Nenhum token ainda.')).toBeInTheDocument()
    expect(document.querySelector('[data-aba-ativa]')?.getAttribute('data-aba-ativa')).toBe('mcp')
    expect(seletor).toHaveValue('mcp')
  })
  it('estados da aba Moodle', async () => {
    rotas(() => new Promise(() => {}))
    let montada = abrir('/univag/integracoes')
    await screen.findByRole('heading', { name: 'Integrações', level: 1 })
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    montada.unmount()

    let tentativas = 0
    rotas(() => (++tentativas === 1 ? [500, { title: 'Erro interno', status: 500, detail: 'falhou' }] : [200, vazia]))
    montada = abrir('/univag/integracoes')
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await screen.findByLabelText('Emissor (iss)')
    montada.unmount()

    rotas(() => [200, vazia])
    abrir('/univag/integracoes?aba=moodle')
    for (const rotulo of ['Emissor (iss)', 'Client ID', 'Deployment ID', 'URL de autenticação', 'URL das chaves (JWKS)'])
      expect(await screen.findByLabelText(rotulo)).toHaveValue('')
    for (const url of Object.values(Urls)) expect(screen.getByText(url)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Copiar/ })).toHaveLength(3)
  })

  it('salva e mostra o erro do campo', async () => {
    let corpo: any
    let falhar = true
    const chamadas = rotas(() => [200, vazia], {
      'PUT /api/admin/moodle': (c) => {
        corpo = c
        if (falhar) return [400, { title: 'Requisição inválida', status: 400, detail: 'A URL de autenticação deve começar com https://.', errors: { authUrl: ['A URL de autenticação deve começar com https://.'] } }]
        return [200, { ...vazia, ...c, configurada: true }]
      },
    })
    abrir('/univag/integracoes')
    const valores = {
      'Emissor (iss)': 'https://ava.teste',
      'Client ID': 'cliente-1',
      'Deployment ID': '7',
      'URL de autenticação': 'http://ava.teste/mod/lti/auth.php',
      'URL das chaves (JWKS)': 'https://ava.teste/mod/lti/certs.php',
    }
    for (const [rotulo, valor] of Object.entries(valores)) await userEvent.type(await screen.findByLabelText(rotulo), valor)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    const campo = screen.getByLabelText('URL de autenticação')
    await waitFor(() => expect(campo).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('A URL de autenticação deve começar com https://.')).toBeInTheDocument()
    expect(corpo).toEqual({ ativa: true, emissor: 'https://ava.teste', clientId: 'cliente-1', deploymentId: '7', authUrl: 'http://ava.teste/mod/lti/auth.php', jwksUrl: 'https://ava.teste/mod/lti/certs.php' })
    expect(Object.keys(corpo)).toHaveLength(6)

    falhar = false
    await userEvent.clear(campo)
    await userEvent.type(campo, 'https://ava.teste/mod/lti/auth.php')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Moodle salvo.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo === 'PUT')).toHaveLength(2)
  })

  it('estado de cada integração', async () => {
    const moodle: [string, unknown, string][] = [
      ['Não configurado', vazia, 'sem configurar'],
      ['Ativo', configurada(true), 'ligado'],
      ['Desativado', configurada(false), 'desligado'],
    ]
    for (const [texto, dados] of moodle) {
      rotas(() => [200, dados], { 'GET /api/admin/mcp': comTokens([]) })
      const { unmount } = abrir('/univag/integracoes')
      await waitFor(() => expect(estadoDe('Moodle')).toBe(texto))
      unmount()
    }
    const mcp: [string, unknown[]][] = [
      ['Sem tokens ativos', []],
      ['Sem tokens ativos', [token(1, 'EXPIRADO'), token(2, 'REVOGADO')]],
      ['1 token ativo', [token(1, 'ATIVO'), token(2, 'REVOGADO')]],
      ['2 tokens ativos', [token(1, 'ATIVO'), token(2, 'ATIVO'), token(3, 'EXPIRADO')]],
    ]
    for (const [texto, tokens] of mcp) {
      rotas(() => [200, vazia], { 'GET /api/admin/mcp': comTokens(tokens) })
      const { unmount } = abrir('/univag/integracoes')
      await waitFor(() => expect(estadoDe('MCP')).toBe(texto))
      expect(nomesDasAbas()).toEqual(['Moodle', 'MCP'])
      unmount()
    }
  })

  it('estado carregando e indisponível', async () => {
    rotas(() => new Promise(() => {}), { 'GET /api/admin/mcp': () => [500, { title: 'Erro interno', status: 500, detail: 'falhou' }] })
    abrir('/univag/integracoes?aba=mcp')
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    await waitFor(() => expect(estadoDe('MCP')).toBe('Indisponível'))
    expect(estadoDe('Moodle')).toBeUndefined()
    expect(screen.getByRole('tab', { name: 'Moodle' })).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('tab', { name: 'MCP' })).toHaveAttribute('aria-selected', 'true')
  })

  it('Moodle indisponível', async () => {
    rotas(() => [500, { title: 'Erro interno', status: 500, detail: 'falhou' }], { 'GET /api/admin/mcp': comTokens([token(1, 'ATIVO')]) })
    abrir('/univag/integracoes')
    await waitFor(() => expect(estadoDe('Moodle')).toBe('Indisponível'))
    await waitFor(() => expect(estadoDe('MCP')).toBe('1 token ativo'))
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Moodle' })).toHaveAttribute('aria-selected', 'true')
    const cabecalho = screen.getByRole('heading', { name: 'Moodle', level: 2 }).parentElement!
    expect(within(cabecalho).getByText('Indisponível')).toHaveAttribute('data-variant', 'secondary')
  })
  it('estado no seletor', async () => {
    rotas(() => new Promise(() => {}), { 'GET /api/admin/mcp': () => new Promise(() => {}) })
    let montada = abrir('/univag/integracoes')
    const carregando = await screen.findByRole('combobox', { name: 'Integração' })
    expect(within(carregando).getAllByRole('option').map((o) => o.textContent)).toEqual(['Moodle', 'MCP'])
    montada.unmount()

    rotas(() => [200, configurada(true)], { 'GET /api/admin/mcp': comTokens([token(1, 'ATIVO')]) })
    montada = abrir('/univag/integracoes')
    const seletor = await screen.findByRole('combobox', { name: 'Integração' })
    await waitFor(() => expect(within(seletor).getAllByRole('option').map((o) => o.textContent)).toEqual(['Moodle · Ativo', 'MCP · 1 token ativo']))
  })

  it('estado no cabeçalho do painel', async () => {
    rotas(() => [200, configurada(false)], { 'GET /api/admin/mcp': comTokens([token(1, 'ATIVO'), token(2, 'ATIVO')]) })
    abrir('/univag/integracoes')
    const moodle = await screen.findByRole('heading', { name: 'Moodle', level: 2 })
    await waitFor(() => expect(within(moodle.parentElement!).getByText('Desativado')).toBeInTheDocument())
    expect(within(moodle.parentElement!).getByText('Desativado')).toHaveAttribute('data-variant', 'secondary')
    expect(estadoDe('Moodle')).toBe('Desativado')
    await userEvent.click(screen.getByRole('tab', { name: 'MCP' }))
    const mcp = await screen.findByRole('heading', { name: 'MCP', level: 2 })
    expect(within(mcp.parentElement!).getByText('2 tokens ativos')).toHaveAttribute('data-variant', 'default')
    expect(estadoDe('MCP')).toBe('2 tokens ativos')
  })

  it('estado atualiza sem recarregar', async () => {
    let tokens: unknown[] = []
    rotas(() => [200, vazia], {
      'GET /api/admin/mcp': () => [200, { url: urlMcp, tokens }],
      'PUT /api/admin/moodle': (c) => [200, { ...vazia, ...(c as object), configurada: true }],
      'POST /api/admin/mcp/tokens': () => {
        tokens = [token(1, 'ATIVO')]
        return [201, { id: 1, nome: 'T1', token: 'onemcp_x', final: 'wxyz', criadoEm: '2026-11-01T15:00:00Z', expiraEm: '2027-01-30T15:00:00Z' }]
      },
      'DELETE /api/admin/mcp/tokens/1': () => {
        tokens = [token(1, 'REVOGADO')]
        return [204, undefined]
      },
    })
    abrir('/univag/integracoes')
    await waitFor(() => expect(estadoDe('Moodle')).toBe('Não configurado'))
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(estadoDe('Moodle')).toBe('Ativo'))

    await userEvent.click(screen.getByRole('tab', { name: 'MCP' }))
    await waitFor(() => expect(estadoDe('MCP')).toBe('Sem tokens ativos'))
    await userEvent.click(await screen.findByRole('button', { name: 'Novo token' }))
    await userEvent.type(await screen.findByLabelText('Nome'), 'T1')
    await userEvent.click(screen.getByRole('button', { name: 'Criar token' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Já copiei' }))
    await waitFor(() => expect(estadoDe('MCP')).toBe('1 token ativo'))

    await userEvent.click(await screen.findByRole('button', { name: 'Revogar T1' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revogar' }))
    await waitFor(() => expect(estadoDe('MCP')).toBe('Sem tokens ativos'))
  })

  it('campo do Moodle ao lado de cada endereço', async () => {
    const usuario = userEvent.setup()
    rotas(() => [200, vazia])
    abrir('/univag/integracoes')
    const linhas: [string, string, string][] = [
      ['URL de login', 'Initiate login URL', Urls.urlLogin],
      ['URL de redirecionamento', 'Redirection URI(s)', Urls.urlLancamento],
      ['URL das chaves públicas', 'Public keyset', Urls.urlJwks],
    ]
    for (const [rotulo, campo, valor] of linhas) {
      const botao = await screen.findByRole('button', { name: `Copiar ${rotulo}` })
      const bloco = botao.closest('div.flex-col')!
      expect(bloco).toHaveTextContent(rotulo)
      expect(bloco).toHaveTextContent(`No Moodle, cole em «${campo}».`)
      await usuario.click(botao)
      expect(await navigator.clipboard.readText()).toBe(valor)
    }
  })

  it('sem placeholder e com dica visível', async () => {
    rotas(() => [200, vazia])
    abrir('/univag/integracoes')
    await screen.findByLabelText('Emissor (iss)')
    const campos = screen.getAllByRole('textbox')
    expect(campos).toHaveLength(5)
    for (const campo of campos) {
      expect(campo, campo.id).not.toHaveAttribute('placeholder')
      const dica = document.getElementById(campo.getAttribute('aria-describedby')!)
      expect(dica?.textContent, campo.id).toMatch(/\S/)
      expect(campo.contains(dica), campo.id).toBe(false)
    }
  })

  it('aviso fixo com a entrada ligada', async () => {
    rotas(() => [200, vazia], salvaOk)
    abrir('/univag/integracoes')
    await preencher()
    expect(screen.queryByText('Moodle salvo e ativo.')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const aviso = (await screen.findByText('Moodle salvo e ativo.')).closest('[role="status"]')!
    expect(aviso).toHaveTextContent('Para testar, abra a atividade One no Moodle com uma conta de aluno.')
  })

  it('aviso fixo com a entrada desligada', async () => {
    rotas(() => [200, vazia], salvaOk)
    abrir('/univag/integracoes')
    await preencher()
    await userEvent.click(screen.getByLabelText('Permitir a entrada pelo Moodle'))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Moodle salvo, mas a entrada pelo Moodle está desligada.')).toBeInTheDocument()
    expect(screen.queryByText(/Para testar/)).not.toBeInTheDocument()
  })

  it('aviso some ao editar', async () => {
    rotas(() => [200, vazia], salvaOk)
    abrir('/univag/integracoes')
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await screen.findByText('Moodle salvo e ativo.')
    await userEvent.type(screen.getByLabelText('Client ID'), 'x')
    expect(screen.queryByText('Moodle salvo e ativo.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await screen.findByText('Moodle salvo e ativo.')
    await userEvent.click(screen.getByLabelText('Permitir a entrada pelo Moodle'))
    expect(screen.queryByText('Moodle salvo e ativo.')).not.toBeInTheDocument()
  })

  it('salvar com erro mantém o digitado', async () => {
    rotas(() => [200, vazia], {
      'PUT /api/admin/moodle': () => [400, { title: 'Requisição inválida', status: 400, detail: 'A URL de autenticação deve começar com https://.', errors: { authUrl: ['A URL de autenticação deve começar com https://.'] } }],
    })
    abrir('/univag/integracoes')
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const campo = screen.getByLabelText('URL de autenticação')
    await waitFor(() => expect(campo).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('A URL de autenticação deve começar com https://.')).toBeInTheDocument()
    for (const [rotulo, valor] of Object.entries(preenchido)) expect(screen.getByLabelText(rotulo), rotulo).toHaveValue(valor)
    expect(document.querySelector('[role="status"]')).toBeNull()
  })

  it('item no menu', async () => {
    for (const papel of ['ADMINISTRADOR', 'ATENDENTE', 'ALUNO', 'OPERADOR']) {
      api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
      const { unmount } = abrir('/univag/trocar-senha')
      await screen.findByRole('button', { name: 'Alternar barra lateral' })
      const nav = within(await screen.findByRole('navigation'))
      expect(nav.queryByRole('link', { name: 'Moodle' }), papel).not.toBeInTheDocument()
      if (papel === 'ADMINISTRADOR') {
        const grupo = within(nav.getByRole('group', { name: 'Administração' }))
        expect(grupo.getAllByRole('link').map((l) => l.textContent)).toEqual(['Usuários', 'Matrículas', 'Cadastros', 'Aparência', 'Integrações'])
        const link = grupo.getByRole('link', { name: 'Integrações' })
        expect(link).toHaveAttribute('href', '/univag/integracoes')
        expect(link.querySelector('svg')).toHaveClass('lucide-plug')
      } else expect(nav.queryByRole('link', { name: 'Integrações' }), papel).not.toBeInTheDocument()
      unmount()
    }

    const chamadas = api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'] })], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/integracoes')
    expect(await screen.findByRole('heading', { name: 'Fila', level: 1 })).toBeInTheDocument()
    expect(chamadas.some((c) => c.url === '/api/admin/moodle')).toBe(false)
  })
})
