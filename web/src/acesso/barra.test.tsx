import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, chamado, instituicao, me, type Rota } from '../test/util'

const celular = () =>
  vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media.startsWith('(max-width: 767px)'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))

const base = (papeis: string[], extra: Record<string, Rota> = {}, deveTrocarSenha = false) => ({
  'GET /api/auth/me': () => [200, me({ papeis, deveTrocarSenha })] as [number, unknown],
  'GET /api/instituicoes/univag': () => [200, instituicao()] as [number, unknown],
  'GET /api/chamados?escopo=meus': () => [200, []] as [number, unknown],
  ...extra,
})
const barra = () => screen.findByRole('navigation', { name: 'Navegação' })
const lateral = () => document.querySelector('[data-sidebar=sidebar]')

afterEach(() => {
  window.innerWidth = 1024
  localStorage.clear()
})

const PorPapel: [string[], [string, string][]][] = [
  [['ALUNO'], [['Assistente', 'assistente'], ['Solicitações', 'solicitacoes'], ['Conta', 'conta']]],
  [['ATENDENTE'], [['Fila', 'fila'], ['Indicadores', 'indicadores'], ['Conta', 'conta']]],
  [['ADMINISTRADOR'], [['Indicadores', 'indicadores'], ['Gerir', 'gerir'], ['Conta', 'conta']]],
  [['ATENDENTE', 'ADMINISTRADOR'], [['Fila', 'fila'], ['Indicadores', 'indicadores'], ['Gerir', 'gerir'], ['Conta', 'conta']]],
  [['OPERADOR'], [['Gerir', 'gerir'], ['Conta', 'conta']]],
  [['ALUNO', 'ATENDENTE'], [['Assistente', 'assistente'], ['Solicitações', 'solicitacoes'], ['Fila', 'fila'], ['Indicadores', 'indicadores'], ['Conta', 'conta']]],
  [['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'], [['Assistente', 'assistente'], ['Solicitações', 'solicitacoes'], ['Fila', 'fila'], ['Gerir', 'gerir'], ['Conta', 'conta']]],
]

describe('barra de baixo', () => {
  it.each(PorPapel)('barra por papel (%j)', async (papeis, esperadas) => {
    celular()
    api(base(papeis))
    abrir('/univag/conta')
    const nav = await barra()
    expect(within(nav).getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual(esperadas.map(([rotulo, caminho]) => [rotulo, `/univag/${caminho}`]))
    expect(lateral()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Alternar barra lateral' })).toBeNull()
  })

  it.each([
    [['ALUNO'], 'assistente', 'Assistente'],
    [['ALUNO'], 'solicitacoes', 'Solicitações'],
    [['ALUNO'], 'conta', 'Conta'],
    [['ATENDENTE'], 'fila', 'Fila'],
    [['ATENDENTE'], 'indicadores', 'Indicadores'],
    [['ADMINISTRADOR'], 'usuarios', 'Gerir'],
    [['ALUNO'], 'chamados/ONE-1', 'Solicitações'],
  ])('aba ativa da barra (%j em /%s)', async (papeis, rota, ativa) => {
    celular()
    api(base(papeis, { 'GET /api/chamados/ONE-1': () => [200, chamado()] }))
    abrir(`/univag/${rota}`)
    const nav = await barra()
    const links = within(nav).getAllByRole('link')
    expect(links.filter((l) => l.getAttribute('aria-current') === 'page').map((l) => l.textContent)).toEqual([ativa])
  })

  it.each([['ATENDENTE'], ['ADMINISTRADOR'], ['ALUNO']])('sem barra a partir de 768 (%s)', async (papel) => {
    api(base([papel]))
    abrir('/univag/conta')
    await waitFor(() => expect(lateral()).not.toBeNull())
    expect(screen.queryByRole('navigation', { name: 'Navegação' })).toBeNull()
  })

  it.each([['ATENDENTE'], ['ADMINISTRADOR']])('troca de senha obrigatória (%s mantém a gaveta)', async (papel) => {
    celular()
    window.innerWidth = 500
    api(base([papel], {}, true))
    abrir('/univag/trocar-senha')
    expect(await screen.findByRole('button', { name: 'Alternar barra lateral' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegação' })).toBeNull()
  })

  it('troca de senha obrigatória (aluno sozinho mantém a barra)', async () => {
    celular()
    api(base(['ALUNO'], {}, true))
    abrir('/univag/trocar-senha')
    expect(await barra()).toBeInTheDocument()
  })
})

function comPush() {
  const inscricao = { endpoint: 'https://push.teste/abc', unsubscribe: vi.fn(async () => true), toJSON: () => ({ endpoint: 'https://push.teste/abc', keys: { p256dh: 'P', auth: 'A' } }) }
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => null, subscribe: async () => inscricao } }) } })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { requestPermission: async () => 'granted' })
  return { 'GET /api/push/chave': () => [200, { chavePublica: 'BAEC' }] as [number, unknown] }
}

describe('Conta de todos os papéis', () => {
  afterEach(() => Reflect.deleteProperty(navigator, 'serviceWorker'))

  it.each([
    [['ALUNO'], 'Aluno', true],
    [['ATENDENTE'], 'Atendente', false],
    [['ADMINISTRADOR'], 'Administrador', false],
    [['OPERADOR'], '', false],
  ])('Conta por papel (%j)', async (papeis, rotulo, comAvisos) => {
    celular()
    api(base(papeis, comPush()))
    abrir('/univag/conta')
    const principal = await screen.findByRole('main')
    expect(await within(principal).findByText('Ana')).toBeInTheDocument()
    for (const linha of ['Tema', 'Trocar senha', 'Sair']) expect(within(principal).getByText(linha)).toBeInTheDocument()
    if (rotulo) expect(within(principal).getByText(rotulo)).toBeInTheDocument()
    else for (const outro of ['Aluno', 'Atendente', 'Administrador']) expect(within(principal).queryByText(outro)).toBeNull()
    if (comAvisos) expect(await within(principal).findByText('Avisos no celular')).toBeInTheDocument()
    else {
      await new Promise((r) => setTimeout(r, 50))
      expect(within(principal).queryByText('Avisos no celular')).toBeNull()
    }
  })

  const DestinosDoAdministrador = ['Artigos', 'Documentos', 'Usuários', 'Matrículas', 'Cadastros', 'Aparência', 'Integrações']

  it('Conta e Gerir fora do celular', async () => {
    api(base(['ADMINISTRADOR']))
    const gerir = abrir('/univag/gerir')
    const principal = await screen.findByRole('main')
    await within(principal).findByText('Artigos')
    expect(within(principal).getAllByRole('link').map((l) => l.textContent)).toEqual(DestinosDoAdministrador)
    expect(lateral()).not.toBeNull()
    gerir.unmount()
    cleanup()

    api(base(['ATENDENTE']))
    abrir('/univag/conta')
    const conta = await screen.findByRole('main')
    expect(await within(conta).findByText('Trocar senha')).toBeInTheDocument()
    expect(within(conta).getByText('Atendente')).toBeInTheDocument()
    expect(lateral()).not.toBeNull()
  })
})
