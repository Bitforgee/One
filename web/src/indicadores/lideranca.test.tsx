import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me } from '../test/util'

const lider = me({ papeis: ['ATENDENTE'], matriculas: [] })

describe('indicadores para a liderança', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('403 da liderança aparece no alerta', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0))
    const detail = 'Os indicadores não estão disponíveis para a liderança de turma.'
    api({
      'GET /api/auth/me': () => [200, lider],
      'GET /api/indicadores?de=2026-11-01&ate=2026-11-15': () => [403, { status: 403, detail }],
    })

    abrir('/univag/indicadores')

    expect(await screen.findByText(detail)).toBeInTheDocument()
    expect(screen.getByLabelText('De')).toBeInTheDocument()
  })
})
