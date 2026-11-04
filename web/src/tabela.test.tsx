import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from './test/util'

const atendente = me({ papeis: ['ALUNO', 'ATENDENTE'] })
const fila = (estados: string[]) =>
  estados.map((estado, i) => ({ numero: `ONE-${i + 1}`, titulo: `chamado ${i + 1}`, categoria: 'Boleto', estado, responsavel: null, criadoEm: '2026-11-02T12:00:00Z', dias: 1 }))

describe('Tabela', () => {
  // aparencia-instituicao C3 (AC 3)
  it('selo de estado com cor por grupo', async () => {
    const grupos: [string, string, string][] = [
      ['ABERTO', 'Aberto', 'bg-primary-subtle'],
      ['EM_ATENDIMENTO', 'Em atendimento', 'bg-primary-subtle'],
      ['AGUARDANDO_ALUNO', 'Aguardando aluno', 'bg-warning-subtle'],
      ['RESOLVIDO', 'Resolvido', 'bg-success/15'],
      ['FECHADO', 'Fechado', 'bg-success/15'],
    ]
    api({ 'GET /api/auth/me': () => [200, atendente], 'GET /api/chamados?escopo=fila': () => [200, fila(grupos.map(([estado]) => estado))] })
    abrir('/univag/fila')
    await screen.findByText('ONE-1')
    for (const [, texto, classe] of grupos) expect(screen.getByText(texto), texto).toHaveClass(classe)
  })

  // aparencia-instituicao C4 (AC 4)
  it('carregando mostra 3 esqueletos', async () => {
    api({ 'GET /api/auth/me': () => [200, atendente], 'GET /api/chamados?escopo=fila': () => new Promise(() => {}) })
    abrir('/univag/fila')
    await screen.findByRole('heading', { name: 'Fila' })
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
