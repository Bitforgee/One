import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, chamado, me, type Rota } from '../test/util'

function emConversa(rotas: Record<string, Rota> = {}, quem = me()) {
  return api({
    'GET /api/auth/me': () => [200, quem],
    'POST /api/conversas': () => [201, { conversaId: 7, resposta: { tipo: 'sem_base', texto: 'Não encontrei.' } }],
    ...rotas,
  })
}

async function transferirConversa() {
  await userEvent.type(await screen.findByLabelText('Mensagem'), 'preciso do boleto')
  await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
  await screen.findByText('Não encontrei.')
  await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
  await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }))
}

const transferido: Rota = () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Financeiro' }]

describe('transferência', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('pede escolha da matrícula', async () => {
    const duas = me({
      matriculas: [
        { id: 1, numero: '2000567890', curso: 'ADS', semestre: 3, situacao: 'ATIVA' },
        { id: 2, numero: '2000567891', curso: 'Direito', semestre: 1, situacao: 'ATIVA' },
        { id: 3, numero: '2000567892', curso: 'Medicina', semestre: 1, situacao: 'INATIVA' },
      ],
    })
    const chamadas = emConversa({ 'POST /api/atendimento-direto': transferido, 'GET /api/chamados/ONE-1': () => [200, chamado()] }, duas)
    abrir('/univag/assistente')

    await userEvent.click(await screen.findByRole('button', { name: /Falar com atendente/ }))
    const dialogo = await screen.findByRole('dialog')
    const opcoes = within(within(dialogo).getByLabelText('Matrícula')).getAllByRole('option').map((o) => o.textContent)
    expect(opcoes).toEqual(['Escolha a matrícula', '2000567890 — ADS', '2000567891 — Direito'])
    await userEvent.type(within(dialogo).getByLabelText('Descreva seu pedido'), 'Quero trancar o curso')
    expect(within(dialogo).getByRole('button', { name: 'Confirmar' })).toBeDisabled()

    await userEvent.selectOptions(within(dialogo).getByLabelText('Matrícula'), '2')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar' }))

    await screen.findByText('Transferido para Financeiro. Protocolo ONE-1.')
    expect(chamadas.find((c) => c.url === '/api/atendimento-direto')?.corpo).toEqual({ descricao: 'Quero trancar o curso', matriculaId: 2 })
  })

  it('transferido mostra protocolo e respostas', async () => {
    const chamadas = emConversa({
      'POST /api/conversas/7/transferir': transferido,
      'GET /api/chamados/ONE-1': () => [
        200,
        chamado({
          mensagens: [
            { id: 1, tipo: 'PUBLICA', texto: 'Olá! Vou reemitir seu boleto.', autor: 'Carla', doAluno: false, criadaEm: '2026-11-02T12:10:00Z' },
            { id: 2, tipo: 'PUBLICA', texto: 'Obrigada!', autor: 'Ana', doAluno: true, criadaEm: '2026-11-02T12:11:00Z' },
          ],
        }),
      ],
    })
    abrir('/univag/assistente')

    await transferirConversa()

    expect(await screen.findByText('Transferido para Financeiro. Protocolo ONE-1.')).toBeInTheDocument()
    expect(await screen.findByText('Olá! Vou reemitir seu boleto.')).toBeInTheDocument()
    expect(screen.getByText('Obrigada!')).toBeInTheDocument()
    expect(screen.getByText('preciso do boleto')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ONE-1/ })).toHaveAttribute('href', '/univag/chamados/ONE-1')
    expect(chamadas.find((c) => c.url === '/api/conversas/7/transferir')?.corpo).toEqual({})
  })

  it('atualiza chamado a cada 15 s', async () => {
    // só o setInterval é falso: os findBy e o userEvent continuam no relógio real
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const chamadas = emConversa({ 'POST /api/conversas/7/transferir': transferido, 'GET /api/chamados/ONE-1': () => [200, chamado()] })
    abrir('/univag/assistente')
    await transferirConversa()
    await screen.findByText('Transferido para Financeiro. Protocolo ONE-1.')
    const leituras = () => chamadas.filter((c) => c.metodo === 'GET' && c.url === '/api/chamados/ONE-1').length
    await waitFor(() => expect(leituras()).toBe(1))

    vi.advanceTimersByTime(14_900)
    expect(leituras()).toBe(1)
    vi.advanceTimersByTime(100)
    expect(leituras()).toBe(2)
    vi.advanceTimersByTime(15_000)
    expect(leituras()).toBe(3)
  })
})
