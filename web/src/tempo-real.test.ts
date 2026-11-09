import { QueryClient } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrirTempoReal, encerrarTempoReal, useTempoReal } from './tempo-real'

const cliente = () => new QueryClient()
const ultima = () => globalThis.conexoesFalsas.at(-1)!
const visibilidade = (valor: 'visible' | 'hidden') => Object.defineProperty(document, 'visibilityState', { value: valor, configurable: true })

describe('configuração da conexão', () => {
  afterEach(() => encerrarTempoReal())

  it('conecta em /api/tempo-real com reconexão automática', () => {
    abrirTempoReal(cliente())
    expect(ultima().url).toBe('/api/tempo-real')
    expect(ultima().reconexaoAutomatica).toBe(true)
  })
})

describe('reabrir a conexão (AC 23)', () => {
  afterEach(async () => {
    await encerrarTempoReal()
    visibilidade('visible')
    vi.useRealTimers()
  })

  it('tentativas de reabrir nunca esperam mais de 30 s', async () => {
    vi.useFakeTimers()
    globalThis.recusarConexao = 'Failed to fetch'
    abrirTempoReal(cliente())
    await vi.advanceTimersByTimeAsync(0)
    expect(ultima().starts).toBe(1)

    for (let falhas = 1; falhas <= 10; falhas++) {
      const espera = Math.min(1000 * 2 ** (falhas - 1), 30_000)
      await vi.advanceTimersByTimeAsync(espera - 1)
      expect(ultima().starts, `antes da tentativa ${falhas + 1}`).toBe(falhas)
      await vi.advanceTimersByTimeAsync(1)
      expect(ultima().starts, `na tentativa ${falhas + 1}`).toBe(falhas + 1)
    }
    await vi.advanceTimersByTimeAsync(29_999)
    expect(ultima().starts).toBe(11)
    await vi.advanceTimersByTimeAsync(1)
    expect(ultima().starts).toBe(12)
  })

  it('aba visível tenta reabrir de imediato', async () => {
    vi.useFakeTimers()
    globalThis.recusarConexao = 'Failed to fetch'
    abrirTempoReal(cliente())
    await vi.advanceTimersByTimeAsync(0)
    expect(ultima().starts).toBe(1)

    visibilidade('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    expect(ultima().starts).toBe(1)

    visibilidade('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0) // sem avançar o relógio da espera
    expect(ultima().starts).toBe(2)
  })

  it('sem usuário autenticado não abre', async () => {
    vi.useFakeTimers()
    const qc = cliente()
    const { unmount } = renderHook(() => useTempoReal(qc, false))
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(120_000)
    expect(globalThis.conexoesFalsas).toHaveLength(0)
    unmount()

    const autenticado = renderHook(() => useTempoReal(qc, true))
    expect(globalThis.conexoesFalsas).toHaveLength(1)
    autenticado.unmount()
  })
})
