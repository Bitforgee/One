import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, chamado, me } from '../test/util'

const icone = (el: HTMLElement) => el.querySelector('svg')

describe('ícone e lista do detalhe', () => {
  it('Anexos traz Paperclip', async () => {
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado({ acoes: ['responder'] })] })
    abrir('/univag/chamados/ONE-1')
    const campo = await screen.findByLabelText('Anexos (PDF, JPG ou PNG, até 10 MB cada)')
    expect(icone(campo.parentElement as HTMLElement)).toHaveClass('lucide-paperclip')
  })

  it('Histórico é uma lista ordenada', async () => {
    const eventos = [
      { tipo: 'ABERTURA', ator: 'Ana', doAluno: false, de: null, para: 'ABERTO', detalhe: null, criadoEm: '2026-11-02T12:00:00Z' },
      { tipo: 'TRANSICAO', ator: 'Carla', doAluno: false, de: 'ABERTO', para: 'EM_ATENDIMENTO', detalhe: null, criadoEm: '2026-11-02T12:10:00Z' },
    ]
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })], 'GET /api/chamados/ONE-1': () => [200, chamado({ mensagens: [], eventos, acoes: [] })] })
    abrir('/univag/chamados/ONE-1')
    const lista = await screen.findByTestId('linha-do-tempo')
    expect(lista.tagName).toBe('OL')
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '02/11/2026 08:00 · Ana · ABERTURA',
      '02/11/2026 08:10 · Carla mudou o estado de Aberto para Em atendimento',
    ])
  })
})
