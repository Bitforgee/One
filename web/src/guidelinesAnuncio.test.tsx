import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Carga } from './administracao/EdicaoDoFluxo'
import { abrir, api, chamado, instituicao, me, type Rota } from './test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const atendente = me({ papeis: ['ATENDENTE'], matriculas: [] })
const eterna: Rota = () => new Promise(() => {})
const moodle = { configurada: true, ativa: true, emissor: 'https://ava.teste', clientId: 'c1', deploymentId: '7', authUrl: 'https://ava.teste/auth', jwksUrl: 'https://ava.teste/certs', urlLogin: 'https://one.teste/login', urlLancamento: 'https://one.teste/lancamento', urlJwks: 'https://one.teste/jwks' }

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('rótulo pendente do BotaoAcao', () => {
  it('C27 Salvar vira Salvando… com aria-busy no Moodle', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/moodle': () => [200, moodle], 'PUT /api/admin/moodle': eterna })
    abrir('/univag/integracoes')
    const salvar = await screen.findByRole('button', { name: 'Salvar' })
    expect(salvar).not.toHaveAttribute('aria-busy')
    await userEvent.click(salvar)
    const pendente = await screen.findByRole('button', { name: 'Salvando…' })
    expect(pendente).toHaveAttribute('aria-busy', 'true')
    expect(pendente).toBeDisabled()
  })

  it('C27 Enviar vira Enviando… com aria-busy na resposta do chamado', async () => {
    api({
      'GET /api/auth/me': () => [200, atendente],
      'GET /api/chamados/ONE-1': () => [200, chamado({ setorId: 5 } as object)],
      'GET /api/respostas-prontas?setorId=5': () => [200, []],
      'POST /api/chamados/ONE-1/mensagens': eterna,
    })
    abrir('/univag/chamados/ONE-1')
    await userEvent.type(await screen.findByLabelText('Responder'), 'Já resolvemos.')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    const pendente = await screen.findByRole('button', { name: 'Enviando…' })
    expect(pendente).toHaveAttribute('aria-busy', 'true')
  })

  it('C27 Consultar vira Consultando… com aria-busy nos indicadores', async () => {
    api({ 'GET /api/auth/me': () => [200, admin] })
    abrir('/univag/indicadores')
    const pendente = await screen.findByRole('button', { name: 'Consultando…' })
    expect(pendente).toHaveAttribute('aria-busy', 'true')
    expect(pendente).toBeDisabled()
  })
})

describe('carregamentos anunciados', () => {
  const anuncia = async () => {
    const estado = await screen.findByRole('status', { name: 'Carregando' })
    expect(estado).toHaveTextContent('Carregando…')
    return estado
  }

  it('C28 Autenticado', async () => {
    api({ 'GET /api/auth/me': eterna })
    abrir('/univag/conta')
    await anuncia()
  })

  it('C28 Acesso', async () => {
    api({ 'GET /api/instituicoes/univag': eterna })
    abrir('/univag')
    await anuncia()
  })

  it('C28 Chamados', async () => {
    api({ 'GET /api/auth/me': () => [200, atendente], 'GET /api/chamados?escopo=fila': eterna })
    abrir('/univag/fila')
    await anuncia()
  })

  it('C28 ChamadoDetalhe', async () => {
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': eterna })
    abrir('/univag/chamados/ONE-1')
    await anuncia()
  })

  it('C28 Tabela', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': eterna, 'GET /api/admin/setores': () => [200, []] })
    abrir('/univag/usuarios')
    const estado = await anuncia()
    expect(within(estado).queryAllByRole('row')).toHaveLength(0)
  })

  it('C28 AbaIntegracao', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/moodle': eterna })
    abrir('/univag/integracoes')
    await anuncia()
  })

  it('C28 Aparencia', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/instituicoes/univag': () => [200, instituicao()], 'GET /api/admin/aparencia': eterna })
    abrir('/univag/aparencia')
    await anuncia()
  })

  it('C28 EdicaoDoFluxo enquanto o canvas carrega', async () => {
    vi.spyOn(Carga, 'canvas').mockReturnValue(new Promise(() => {}))
    const listas: Record<string, unknown[]> = {
      setores: [{ id: 2, nome: 'Financeiro', triagem: false, ativo: true }],
      categorias: [{ id: 7, nome: 'Notas', ativa: true, padrao: false }],
      cursos: [],
      fluxos: [{ id: 8, categoriaId: 7, cursoId: null, semestre: null, vigente: null, rascunho: { numero: 1, etapas: [] } }],
      'respostas-prontas': [],
    }
    api({ 'GET /api/auth/me': () => [200, admin], ...Object.fromEntries(Object.entries(listas).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, v]) as Rota])) })
    abrir('/univag/cadastros')
    await userEvent.click(await screen.findByRole('tab', { name: 'Fluxos' }))
    await userEvent.click(await within(screen.getByRole('tabpanel', { name: 'Fluxos' })).findByRole('button', { name: 'Notas' }))
    const regiao = within(await screen.findByRole('region', { name: 'Editar: Fluxos' }))
    await userEvent.click(regiao.getByRole('tab', { name: 'Canvas' }))
    expect(await regiao.findByRole('status', { name: 'Carregando' })).toHaveTextContent('Carregando…')
  })
})
