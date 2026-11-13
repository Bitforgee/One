import { act, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { abrir, api, chamado, me } from '../test/util'

class ObservadorFalso {
  static todos: ObservadorFalso[] = []
  alvos: Element[] = []
  constructor(private aviso: ResizeObserverCallback) {
    ObservadorFalso.todos.push(this)
  }
  observe(alvo: Element) {
    this.alvos.push(alvo)
  }
  unobserve() {}
  disconnect() {
    this.alvos = []
  }
  medir(alvo: Element, altura: number) {
    const caixa = { x: 0, y: 0, width: 300, height: altura, top: 0, right: 300, bottom: altura, left: 0, toJSON: () => ({}) }
    this.aviso([{ target: alvo, contentRect: caixa } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver)
  }
}

const medirLista = (altura: number) => {
  const lista = screen.getByTestId('linha-do-tempo')
  const dono = ObservadorFalso.todos.find((o) => o.alvos.includes(lista))
  expect(dono).toBeDefined()
  act(() => dono!.medir(lista, altura))
}

describe('Conversa sem leitura de layout no render', () => {
  it('C48 o código usa ResizeObserver e não lê offsetHeight', () => {
    const fonte = readFileSync('src/chamados/Conversa.tsx', 'utf8')
    expect(fonte).toContain('ResizeObserver')
    expect(fonte).not.toContain('offsetHeight')
  })

  it('C48 o ResizeObserver liga e desliga Ir para o mais recente', async () => {
    ObservadorFalso.todos = []
    vi.stubGlobal('ResizeObserver', ObservadorFalso)
    vi.stubGlobal('innerHeight', 700)
    api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })],
      'GET /api/chamados/ONE-1': () => [200, chamado({ solicitante: 'Ana', eventos: [], acoes: ['responder', 'nota'] })],
    })
    abrir('/univag/chamados/ONE-1')
    await screen.findByTestId('linha-do-tempo')
    expect(screen.queryByRole('button', { name: 'Ir para o mais recente' })).not.toBeInTheDocument()

    medirLista(2400)
    expect(await screen.findByRole('button', { name: 'Ir para o mais recente' })).toBeInTheDocument()

    medirLista(120)
    expect(screen.queryByRole('button', { name: 'Ir para o mais recente' })).not.toBeInTheDocument()
  })
})
