import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me, type Rota } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const url = 'https://one.teste/api/mcp/univag'
const base = { usuario: 'Ana', criadoEm: '2026-11-01T15:00:00Z', expiraEm: '2027-01-30T15:00:00Z' }
const ativo = { ...base, id: 1, nome: 'Cursor', final: 'wxyz', ultimoUsoEm: '2026-11-09T12:30:00Z', estado: 'ATIVO' }
const expirado = { ...base, id: 2, nome: 'Antigo', final: 'abcd', expiraEm: '2026-10-01T15:00:00Z', ultimoUsoEm: null, estado: 'EXPIRADO' }
const revogado = { ...base, id: 3, nome: 'Perdido', final: 'efgh', ultimoUsoEm: null, estado: 'REVOGADO' }
const token = 'onemcp_univag.AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCdE'

const rotas = (get: Rota, extra: Record<string, Rota> = {}) =>
  api({
    'GET /api/auth/me': () => [200, admin],
    'GET /api/instituicoes/univag': () => [200, instituicao()],
    'GET /api/admin/mcp': get,
    'GET /api/admin/moodle': () => [200, { configurada: false, ativa: false, emissor: '', clientId: '', deploymentId: '', authUrl: '', jwksUrl: '', urlLogin: '', urlLancamento: '', urlJwks: '' }],
    ...extra,
  })

const problema = (status: number, detail: string, errors?: Record<string, string[]>) => [status, { title: 'Erro', status, detail, ...(errors ? { errors } : {}) }] as [number, unknown]
const comando = (alvo: string) => `claude mcp add --transport http one ${url} --header "Authorization: Bearer ${alvo}"`

describe('aba MCP', () => {
  it('aba MCP lista os tokens', async () => {
    rotas(() => [200, { url, tokens: [ativo, expirado, revogado] }])
    abrir('/univag/integracoes?aba=mcp')

    expect(await screen.findByText(url)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'MCP' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Em breve')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar URL do servidor' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Nome', 'Dono', 'Final', 'Criado', 'Vence', 'Último uso', 'Estado', ''])
    const linhas = screen.getAllByRole('row').slice(1)
    expect(linhas.map((l) => within(l).getAllByRole('cell')[0].textContent)).toEqual([expect.stringMatching(/^Cursor/), expect.stringMatching(/^Antigo/), expect.stringMatching(/^Perdido/)])
    expect(linhas.map((l) => within(l).getByText(/^(ATIVO|EXPIRADO|REVOGADO)$/).textContent)).toEqual(['ATIVO', 'EXPIRADO', 'REVOGADO'])
  })

  it('cria o token e mostra uma vez', async () => {
    let tokens: unknown[] = []
    let corpo: any
    rotas(() => [200, { url, tokens }], {
      'POST /api/admin/mcp/tokens': (c) => {
        corpo = c
        tokens = [ativo]
        return [201, { id: 1, nome: 'Cursor', token, final: 'wxyz', criadoEm: base.criadoEm, expiraEm: base.expiraEm }]
      },
    })
    abrir('/univag/integracoes?aba=mcp')
    const validade = await screen.findByLabelText('Validade')
    expect(within(validade).getAllByRole('option').map((o) => o.textContent)).toEqual(['30 dias', '90 dias', '365 dias'])
    expect(validade).toHaveValue('90')

    await userEvent.type(screen.getByLabelText('Nome'), 'Cursor')
    await userEvent.click(screen.getByRole('button', { name: 'Criar token' }))

    const painel = await screen.findByRole('region', { name: 'Token criado' })
    expect(corpo).toEqual({ nome: 'Cursor', dias: 90 })
    expect(within(painel).getByText('Copie agora: o token não será mostrado de novo.')).toBeInTheDocument()
    expect(within(painel).getByText(token)).toBeInTheDocument()
    expect(within(painel).getByText(comando(token))).toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Copiar Token' })).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: /^Cursor/ })).toBeInTheDocument()
  })

  it('fecha o painel e esconde o token', async () => {
    rotas(() => [200, { url, tokens: [ativo] }], {
      'POST /api/admin/mcp/tokens': () => [201, { id: 1, nome: 'Cursor', token, final: 'wxyz', criadoEm: base.criadoEm, expiraEm: base.expiraEm }],
    })
    abrir('/univag/integracoes?aba=mcp')
    await userEvent.type(await screen.findByLabelText('Nome'), 'Cursor')
    await userEvent.click(screen.getByRole('button', { name: 'Criar token' }))
    const painel = await screen.findByRole('region', { name: 'Token criado' })

    await userEvent.click(within(painel).getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('region', { name: 'Token criado' })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain(token)
    expect(screen.queryByText(comando(token))).not.toBeInTheDocument()
    expect(screen.getByText('…wxyz')).toBeInTheDocument()
  })

  it('revoga com confirmação', async () => {
    let lista = [ativo, expirado, revogado] as unknown[]
    const chamadas = rotas(() => [200, { url, tokens: lista }], {
      'DELETE /api/admin/mcp/tokens/1': () => {
        lista = [{ ...ativo, estado: 'REVOGADO' }, expirado, revogado]
        return [204, undefined]
      },
    })
    abrir('/univag/integracoes?aba=mcp')
    expect(await screen.findByRole('button', { name: 'Revogar Cursor' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revogar Antigo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revogar Perdido' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Revogar Cursor' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Revogar o token «Cursor»?' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Revogar Cursor' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Revogar o token «Cursor»?' })).getByRole('button', { name: 'Revogar' }))

    expect(await screen.findByText('Token revogado.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo === 'DELETE').map((c) => c.url)).toEqual(['/api/admin/mcp/tokens/1'])
    await waitFor(() => expect(screen.getAllByText('REVOGADO')).toHaveLength(2))
    expect(screen.queryByRole('button', { name: 'Revogar Cursor' })).not.toBeInTheDocument()
  })

  it('estado vazio', async () => {
    rotas(() => [200, { url, tokens: [] }])
    abrir('/univag/integracoes')
    await userEvent.click(await screen.findByRole('tab', { name: 'MCP' }))

    expect(await screen.findByText('Nenhum token ainda.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar token' })).toBeInTheDocument()
  })

  it('carregando e erro', async () => {
    rotas(() => new Promise(() => {}))
    let montada = abrir('/univag/integracoes?aba=mcp')
    await screen.findByRole('heading', { name: 'Integrações', level: 1 })
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    montada.unmount()

    let tentativas = 0
    rotas(() => (++tentativas === 1 ? problema(500, 'falhou') : [200, { url, tokens: [] }]))
    montada = abrir('/univag/integracoes?aba=mcp')
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Nenhum token ainda.')).toBeInTheDocument()
    expect(tentativas).toBe(2)
  })

  it('erros da criação', async () => {
    let resposta = problema(400, 'O nome é obrigatório e aceita até 60 caracteres.', { nome: ['O nome é obrigatório e aceita até 60 caracteres.'] })
    rotas(() => [200, { url, tokens: [] }], { 'POST /api/admin/mcp/tokens': () => resposta })
    abrir('/univag/integracoes?aba=mcp')
    const nome = await screen.findByLabelText('Nome')
    await userEvent.type(nome, 'Cursor')
    await userEvent.click(screen.getByRole('button', { name: 'Criar token' }))

    expect(await screen.findByText('O nome é obrigatório e aceita até 60 caracteres.')).toBeInTheDocument()
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    expect(nome).toHaveValue('Cursor')
    expect(screen.queryByRole('region', { name: 'Token criado' })).not.toBeInTheDocument()

    resposta = problema(409, 'Você já tem 5 tokens ativos. Revogue um para criar outro.')
    await userEvent.click(screen.getByRole('button', { name: 'Criar token' }))

    expect(await screen.findByText('Você já tem 5 tokens ativos. Revogue um para criar outro.')).toBeInTheDocument()
    expect(nome).toHaveValue('Cursor')
    expect(screen.queryByRole('region', { name: 'Token criado' })).not.toBeInTheDocument()
  })

  it('como conectar', async () => {
    rotas(() => [200, { url, tokens: [] }])
    abrir('/univag/integracoes?aba=mcp')

    expect(await screen.findByRole('heading', { name: 'Como conectar', level: 2 })).toBeInTheDocument()
    expect(screen.getByText(comando('<seu-token>'))).toBeInTheDocument()
    expect(screen.getByText(`{"mcpServers":{"one":{"url":"${url}","headers":{"Authorization":"Bearer <seu-token>"}}}}`)).toBeInTheDocument()
    expect(screen.getByText('Claude.ai e ChatGPT na web ainda não conectam: pedem OAuth.')).toBeInTheDocument()
  })
})
