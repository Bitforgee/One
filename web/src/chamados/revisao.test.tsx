import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Chamado } from '../chamado'
import { abrir, api, chamado, me } from '../test/util'

const equipe = me({ papeis: ['ALUNO', 'ATENDENTE'] })
const celular = () =>
  vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media === '(max-width: 767px)' || media === '(max-width: 1023px)', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
const relogio = (iso: string) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const linhas = () => within(screen.getByRole('main')).getAllByRole('listitem')

describe('listas de chamados revisadas', () => {
  it('data relativa aberto hoje ontem e há N dias', async () => {
    const casos: [string, string, string, number][] = [
      ['2026-11-04T15:00:00Z', '2026-11-04T13:00:00Z', 'aberto hoje', 0],
      ['2026-11-04T15:00:00Z', '2026-11-03T15:00:00Z', 'aberto ontem', 1],
      ['2026-11-04T15:00:00Z', '2026-11-01T15:00:00Z', 'aberto há 3 dias', 3],
      ['2026-11-04T04:10:00Z', '2026-11-04T03:50:00Z', 'aberto ontem', 0],
    ]
    for (const [escopo, caminho] of [['fila', '/univag/fila'], ['meus', '/univag/solicitacoes']] as const) {
      for (const [agora, criadoEm, texto, dias] of casos) {
        celular()
        relogio(agora)
        const item = { numero: 'ONE-1', titulo: 'boleto', categoria: 'Boleto', estado: 'ABERTO', responsavel: null, criadoEm, dias }
        api({ 'GET /api/auth/me': () => [200, equipe], [`GET /api/chamados?escopo=${escopo}`]: () => [200, [item]] })
        abrir(caminho)
        await screen.findByText('ONE-1')
        const linha = linhas()[0]
        expect(within(linha).getByText('Aberto')).toBeInTheDocument()
        expect(within(linha).getByText(texto, { exact: false })).toBeInTheDocument()
        expect(linha.textContent).not.toMatch(/0 dias/)
        cleanup()
        vi.useRealTimers()
      }
    }
  })

  it.each([
    ['ABERTO', 'A equipe vai responder'],
    ['EM_ATENDIMENTO', 'A equipe vai responder'],
    ['AGUARDANDO_ALUNO', 'Responda para continuar'],
    ['RESOLVIDO', 'Resolvida'],
    ['FECHADO', 'Encerrada'],
  ])('próximo passo por estado (%s)', async (estado, passo) => {
    celular()
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados?escopo=meus': () => [200, [{ numero: 'ONE-3', titulo: 'histórico', estado, criadoEm: '2026-11-02T12:00:00Z' }]] })
    abrir('/univag/solicitacoes')
    await screen.findByText('ONE-3')
    const linha = linhas()[0]
    expect(within(linha).getByText(passo).textContent).toBe(passo)
  })

  it('Fila com categoria, data e Mais antigos primeiro', async () => {
    celular()
    relogio('2026-11-04T15:00:00Z')
    const item = (n: number, criadoEm: string) => ({
      numero: `ONE-${n}`, titulo: `pedido ${n}`, categoria: 'Financeiro > Boletos e mensalidades', estado: 'ABERTO', responsavel: null, criadoEm, dias: 3,
      aluno: 'Ana Beatriz da Silva', setor: 'Coordenação de Sistemas',
    })
    api({ 'GET /api/auth/me': () => [200, equipe], 'GET /api/chamados?escopo=fila': () => [200, [item(1, '2026-11-01T15:00:00Z'), item(2, '2026-11-03T15:00:00Z')]] })
    abrir('/univag/fila')
    await screen.findByText('ONE-1')
    const [primeira, segunda] = linhas()
    for (const [linha, data] of [[primeira, 'aberto há 3 dias'], [segunda, 'aberto ontem']] as const) {
      expect(within(linha).getByText('Financeiro > Boletos e mensalidades', { exact: false })).toBeInTheDocument()
      expect(within(linha).getByText(data, { exact: false })).toBeInTheDocument()
      expect(within(linha).getByText('sem responsável', { exact: false })).toBeInTheDocument()
    }
    expect(screen.queryByText(/Ana Beatriz|Coordenação de Sistemas/)).not.toBeInTheDocument()
    const aviso = screen.getByText('Mais antigos primeiro')
    expect(aviso.compareDocumentPosition(within(screen.getByRole('main')).getByRole('list')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('detalhe do chamado revisado', () => {
  const detalhe = (c: Chamado, quem = me()) =>
    api({ 'GET /api/auth/me': () => [200, quem], 'GET /api/chamados/ONE-1': () => [200, c], 'POST /api/chamados/ONE-1/cancelar': () => [200, c] })

  it('aluno sem barra e Cancelar solicitação com confirmação', async () => {
    celular()
    const chamadas = detalhe(chamado({ estado: 'ABERTO', acoes: ['responder', 'cancelar'] }))
    abrir('/univag/chamados/ONE-1')
    const cancelar = await screen.findByRole('button', { name: 'Cancelar solicitação' })
    expect(screen.queryByRole('button', { name: 'Ações' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mais' })).not.toBeInTheDocument()
    const focaveis = [...screen.getByRole('main').querySelectorAll('a[href], button, input, textarea, select')].filter((e) => !e.closest('[hidden]'))
    expect(focaveis.at(-1)).toBe(cancelar)

    await userEvent.click(cancelar)
    const dialogo = await screen.findByRole('dialog', { name: 'Cancelar a solicitação?' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar solicitação' }))
    await waitFor(() => expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => c.url)).toEqual(['/api/chamados/ONE-1/cancelar']))
  })

  it('sem formulário de resposta para a equipe em RESOLVIDO e FECHADO', async () => {
    const equipeDoChamado = (estado: string, acoes: string[]) => chamado({ estado, eventos: [], acoes, solicitante: 'Ana' })
    for (const [estado, acoes] of [['RESOLVIDO', ['nota', 'reclassificar']], ['FECHADO', []]] as const) {
      detalhe(equipeDoChamado(estado, [...acoes]), me({ papeis: ['ATENDENTE'], matriculas: [] }))
      abrir('/univag/chamados/ONE-1')
      await screen.findByRole('heading', { name: 'preciso do boleto' })
      expect(screen.queryByLabelText('Responder')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument()
      cleanup()
    }
    detalhe(chamado({ estado: 'RESOLVIDO', acoes: ['responder', 'confirmar', 'rejeitar'] }))
    abrir('/univag/chamados/ONE-1')
    expect(await screen.findByLabelText('Responder (reabre a solicitação)')).toBeInTheDocument()
  })
  it('barra do celular da equipe assume, responde e abre o Mais', async () => {
    celular()
    Element.prototype.scrollIntoView = vi.fn()
    const aberto = chamado({ estado: 'ABERTO', eventos: [], solicitante: 'Ana', acoes: ['responder', 'nota', 'assumir', 'resolver', 'encaminhar'] })
    const emAtendimento = { ...aberto, estado: 'EM_ATENDIMENTO', acoes: ['responder', 'nota', 'resolver', 'encaminhar'] }
    const chamadas = api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })],
      'GET /api/chamados/ONE-1': () => [200, aberto],
      'POST /api/chamados/ONE-1/assumir': () => [200, emAtendimento],
    })
    abrir('/univag/chamados/ONE-1')
    const assumir = await screen.findByRole('button', { name: 'Assumir' })
    expect(screen.getByRole('button', { name: 'Mais' })).toBeInTheDocument()
    await userEvent.click(assumir)
    await userEvent.click(await screen.findByRole('button', { name: 'Responder' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Responder'))
    expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => c.url)).toEqual(['/api/chamados/ONE-1/assumir'])
    await userEvent.click(screen.getByRole('button', { name: 'Mais' }))
    expect(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Encaminhar' })).toBeInTheDocument()
  })
})

describe('folha de ações do chamado', () => {
  it('a resposta de uma ação da barra não fecha a folha aberta depois', async () => {
    celular()
    const aberto = chamado({ estado: 'ABERTO', eventos: [], solicitante: 'Ana', acoes: ['responder', 'nota', 'assumir', 'resolver', 'encaminhar'] })
    let responder!: () => void
    api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })],
      'GET /api/chamados/ONE-1': () => [200, aberto],
      'POST /api/chamados/ONE-1/assumir': () => new Promise((resolve) => (responder = () => resolve([200, { ...aberto, estado: 'EM_ATENDIMENTO' }]))),
    })
    abrir('/univag/chamados/ONE-1')
    await userEvent.click(await screen.findByRole('button', { name: 'Assumir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mais' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    responder()
    await screen.findByRole('button', { name: 'Responder', hidden: true })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('conversa com o assistente vista pela equipe', () => {
  it('links da resposta como botão na conversa da equipe', async () => {
    const url = 'https://portal.univag.edu.br/financeiro/boletos/segunda-via'
    const c = chamado({
      eventos: [],
      resumo: 'x',
      solicitante: 'Ana',
      transcricao: [
        { autor: 'ALUNO', texto: 'cadê o boleto?', criadaEm: '2026-11-02T12:00:00Z' },
        { autor: 'ASSISTENTE', texto: `O boleto fica em ${url}`, criadaEm: '2026-11-02T12:00:05Z' },
      ],
    })
    api({ 'GET /api/auth/me': () => [200, equipe], 'GET /api/chamados/ONE-1': () => [200, c] })
    abrir('/univag/chamados/ONE-1')
    await userEvent.click(await screen.findByRole('button', { name: /^Conversa com o assistente/ }))
    const link = await screen.findByRole('link', { name: /portal\.univag\.edu\.br\/financeiro\/boletos\/segunda-via/ })
    expect(link).toHaveAttribute('href', url)
    expect(link.closest('[data-slot=button]')).not.toBeNull()
    const texto = screen.getByText(/^O boleto fica em/)
    expect(texto.textContent).not.toContain('https://')
    expect(texto.parentElement).toContainElement(link)
  })
})
