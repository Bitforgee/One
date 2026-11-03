import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { encerrarTempoReal } from '../tempo-real'
import { abrir, api, chamado, me, type Chamada } from '../test/util'

// tempo-real-signalr S3: a conexão é a falsa do setup.ts; o que chega do servidor é só o aviso, o dado vem do GET de sempre.
const conexao = () => globalThis.conexoesFalsas.at(-1)!
const leituras = (chamadas: Chamada[], url: string) => chamadas.filter((c) => c.metodo === 'GET' && c.url === url).length
const mensagem = (texto: string) => ({ id: 1, tipo: 'PUBLICA' as const, texto, autor: 'Carla', doAluno: false, criadaEm: '2026-11-02T12:00:00Z' })
const item = (numero: string, titulo: string) => ({ numero, titulo, estado: 'ABERTO', criadoEm: '2026-11-02T12:00:00Z', categoria: 'Boleto', responsavel: null, dias: 1 })
const atendente = me({ papeis: ['ATENDENTE'], matriculas: [] })
const titulo = { name: 'preciso do boleto' }
const FILA = '/api/chamados?escopo=fila'
const MEUS = '/api/chamados?escopo=meus'
const nav = () => within(screen.getByRole('navigation'))
const abrirConexao = () => act(async () => conexao().abrir())

// só o relógio dos intervalos é falso, como no teste de 15 s da base
async function comRelogio(corpo: () => Promise<void>) {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  try {
    await corpo()
  } finally {
    vi.useRealTimers()
  }
}

describe('tempo real: chamado e fila', () => {
  it('ChamadoMudou do chamado aberto relê e mostra o texto novo sem avançar o relógio', async () => {
    await comRelogio(async () => {
      let texto = 'Primeira resposta'
      const chamadas = api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado({ mensagens: [mensagem(texto)] })] })
      abrir('/univag/chamados/ONE-1')
      expect(await screen.findByText('Primeira resposta')).toBeInTheDocument()
      await abrirConexao()

      texto = 'Resposta nova do atendente'
      await act(async () => conexao().emitir('ChamadoMudou', 'ONE-1'))
      expect(await screen.findByText('Resposta nova do atendente')).toBeInTheDocument()
      expect(leituras(chamadas, '/api/chamados/ONE-1')).toBe(2)
    })
  })

  it('ChamadoMudou de outro chamado não relê o aberto', async () => {
    await comRelogio(async () => {
      const chamadas = api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado()] })
      abrir('/univag/chamados/ONE-1')
      await screen.findByRole('heading', titulo)
      await abrirConexao()

      await act(async () => conexao().emitir('ChamadoMudou', 'ONE-2'))
      await new Promise((r) => setTimeout(r, 50))
      expect(leituras(chamadas, '/api/chamados/ONE-1')).toBe(1)
      expect(chamadas.filter((c) => c.url === '/api/chamados/ONE-2')).toEqual([])
    })
  })

  it('FilaMudou relê a fila do atendente', async () => {
    let itens = [item('ONE-1', 'preciso do boleto')]
    const chamadas = api({ 'GET /api/auth/me': () => [200, atendente], [`GET ${FILA}`]: () => [200, itens] })
    abrir('/univag/fila')
    expect(await screen.findByText('preciso do boleto')).toBeInTheDocument()
    await abrirConexao()

    itens = [...itens, item('ONE-2', 'segunda dúvida')]
    await act(async () => conexao().emitir('FilaMudou'))
    expect(await screen.findByText('segunda dúvida')).toBeInTheDocument()
    expect(leituras(chamadas, FILA)).toBe(2)
  })

  it('FilaMudou não relê Minhas solicitações', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ALUNO', 'ATENDENTE'] })],
      [`GET ${FILA}`]: () => [200, [item('ONE-1', 'preciso do boleto')]],
      [`GET ${MEUS}`]: () => [200, [item('ONE-2', 'minha solicitação')]],
    })
    abrir('/univag/fila')
    await screen.findByText('preciso do boleto')
    await userEvent.click(nav().getByRole('link', { name: /Minhas solicitações/ }))
    await screen.findByText('minha solicitação')
    await abrirConexao()

    await act(async () => conexao().emitir('FilaMudou'))
    await new Promise((r) => setTimeout(r, 50))
    expect(leituras(chamadas, MEUS)).toBe(1)
  })

  it('abrir o chamado chama EntrarNoChamado e fechar chama SairDoChamado', async () => {
    api({
      'GET /api/auth/me': () => [200, me()],
      [`GET ${MEUS}`]: () => [200, [item('ONE-1', 'preciso do boleto')]],
      'GET /api/chamados/ONE-1': () => [200, chamado()],
    })
    abrir('/univag/solicitacoes')
    const link = await screen.findByRole('link', { name: /ONE-1/ })
    await abrirConexao()
    expect(conexao().chamadas('EntrarNoChamado')).toEqual([])

    await userEvent.click(link)
    await screen.findByRole('heading', titulo)
    await waitFor(() => expect(conexao().chamadas('EntrarNoChamado')).toEqual([['ONE-1']]))
    expect(conexao().chamadas('SairDoChamado')).toEqual([])

    await userEvent.click(nav().getByRole('link', { name: /Minhas solicitações/ }))
    await waitFor(() => expect(conexao().chamadas('SairDoChamado')).toEqual([['ONE-1']]))
  })

  it('abrir a fila chama EntrarNaFila', async () => {
    api({
      'GET /api/auth/me': () => [200, atendente],
      [`GET ${FILA}`]: () => [200, [item('ONE-1', 'preciso do boleto')]],
      'GET /api/chamados/ONE-1': () => [200, chamado()],
    })
    abrir('/univag/fila')
    const link = await screen.findByRole('link', { name: /ONE-1/ })
    await abrirConexao()
    await waitFor(() => expect(conexao().chamadas('EntrarNaFila')).toHaveLength(1))
    conexao().invocacoes.length = 0

    await userEvent.click(link)
    await screen.findByRole('heading', titulo)
    await userEvent.click(nav().getByRole('link', { name: /Fila/ }))
    await screen.findByText('preciso do boleto')
    await waitFor(() => expect(conexao().chamadas('EntrarNaFila')).toEqual([[]]))
  })

  it('conexão que abre depois da tela entra nos grupos das telas abertas', async () => {
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado()] })
    abrir('/univag/chamados/ONE-1')
    await screen.findByRole('heading', titulo)
    expect(conexao().invocacoes).toEqual([])
    await abrirConexao()
    await waitFor(() => expect(conexao().chamadas('EntrarNoChamado')).toEqual([['ONE-1']]))
    cleanup()

    api({ 'GET /api/auth/me': () => [200, atendente], [`GET ${FILA}`]: () => [200, []] })
    abrir('/univag/fila')
    await screen.findByText('Nenhum chamado na fila dos seus setores.')
    expect(conexao().invocacoes).toEqual([])
    await abrirConexao()
    await waitFor(() => expect(conexao().chamadas('EntrarNaFila')).toEqual([[]]))
  })

  it('intervalo de releitura por estado da conexão', async () => {
    await comRelogio(async () => {
      const estados: [string, () => Promise<void>][] = [
        ['Disconnected', () => act(async () => conexao().fechar())],
        ['Connecting', async () => undefined], // o start() da conexão falsa fica pendente
        [
          'Disconnecting',
          async () => {
            conexao().segurarStop = true
            await act(async () => void encerrarTempoReal())
          },
        ],
        ['Reconnecting', () => act(async () => conexao().cair())],
        ['Connected', abrirConexao],
      ]
      for (const [estado, ir] of estados) {
        const chamadas = api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado()] })
        const { unmount } = abrir('/univag/chamados/ONE-1')
        await screen.findByRole('heading', titulo)
        await ir()
        expect(conexao().state, estado).toBe(estado)

        const espera = estado === 'Connected' ? 60_000 : 15_000
        const lidas = () => leituras(chamadas, '/api/chamados/ONE-1')
        expect(lidas(), estado).toBe(1)
        await vi.advanceTimersByTimeAsync(espera - 1)
        expect(lidas(), `${estado} aos ${espera - 1} ms`).toBe(1)
        await vi.advanceTimersByTimeAsync(1)
        expect(lidas(), `${estado} aos ${espera} ms`).toBe(2)
        conexao().concluirStop()
        unmount()
      }
    })
  })

  it('reconexão entra de novo nos grupos das telas abertas e relê', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, me()],
      'GET /api/chamados/ONE-1': () => [200, chamado()],
    })
    abrir('/univag/chamados/ONE-1')
    await screen.findByRole('heading', titulo)
    await abrirConexao()
    await waitFor(() => expect(conexao().chamadas('EntrarNoChamado')).toEqual([['ONE-1']]))
    conexao().invocacoes.length = 0
    await act(async () => conexao().cair())
    await act(async () => conexao().reconectar())
    await waitFor(() => expect(conexao().chamadas('EntrarNoChamado')).toEqual([['ONE-1']]))
    await waitFor(() => expect(leituras(chamadas, '/api/chamados/ONE-1')).toBe(2))
    cleanup()

    const fila = api({ 'GET /api/auth/me': () => [200, atendente], [`GET ${FILA}`]: () => [200, []] })
    abrir('/univag/fila')
    await screen.findByText('Nenhum chamado na fila dos seus setores.')
    await abrirConexao()
    await waitFor(() => expect(conexao().chamadas('EntrarNaFila')).toEqual([[]]))
    conexao().invocacoes.length = 0
    await act(async () => conexao().cair())
    await act(async () => conexao().reconectar())
    await waitFor(() => expect(conexao().chamadas('EntrarNaFila')).toEqual([[]]))
    await waitFor(() => expect(leituras(fila, FILA)).toBe(2))
  })

  it('reconexão não entra em chamado de tela fechada', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, me()],
      [`GET ${MEUS}`]: () => [200, [item('ONE-1', 'preciso do boleto')]],
      'GET /api/chamados/ONE-1': () => [200, chamado()],
    })
    abrir('/univag/solicitacoes')
    const link = await screen.findByRole('link', { name: /ONE-1/ })
    await abrirConexao()
    await userEvent.click(link)
    await screen.findByRole('heading', titulo)
    await waitFor(() => expect(conexao().chamadas('EntrarNoChamado')).toEqual([['ONE-1']]))
    await userEvent.click(nav().getByRole('link', { name: /Minhas solicitações/ }))
    await waitFor(() => expect(conexao().chamadas('SairDoChamado')).toEqual([['ONE-1']]))
    conexao().invocacoes.length = 0

    await act(async () => conexao().cair())
    await act(async () => conexao().reconectar())
    await new Promise((r) => setTimeout(r, 50))
    expect(conexao().invocacoes).toEqual([])
    expect(leituras(chamadas, '/api/chamados/ONE-1')).toBe(1)
  })

  it('conexão que não abre mantém a releitura de 15 s sem mensagem nova', async () => {
    await comRelogio(async () => {
      for (const erro of ['Failed to fetch', 'Unauthorized']) {
        globalThis.recusarConexao = erro // servidor fora; negotiate recusado com 401
        const chamadas = api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado()] })
        const { unmount } = abrir('/univag/chamados/ONE-1')
        await screen.findByRole('heading', titulo)
        await waitFor(() => expect(conexao().starts).toBeGreaterThan(0))
        const lidas = () => leituras(chamadas, '/api/chamados/ONE-1')

        expect(lidas(), erro).toBe(1)
        await vi.advanceTimersByTimeAsync(14_999)
        expect(lidas(), erro).toBe(1)
        await vi.advanceTimersByTimeAsync(1)
        expect(lidas(), erro).toBe(2)
        expect(screen.queryByRole('alert'), erro).not.toBeInTheDocument()
        expect(screen.queryByText(/Failed to fetch|Unauthorized|conexão/i), erro).not.toBeInTheDocument()
        unmount()
      }
    })
  })
})
