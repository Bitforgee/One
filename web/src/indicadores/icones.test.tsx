import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

// Ícones de ## Visual e ## Screens que o teste do cabeçalho (C17) não cobre (verification.md rodada 1, lacuna 4).
const icone = (el: HTMLElement) => el.querySelector('svg')
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('ícone de Indicadores', () => {
  // C54 (## Visual): CalendarDays no botão do período
  it('o período traz CalendarDays', async () => {
    api({ 'GET /api/auth/me': () => [200, admin] })
    abrir('/univag/indicadores')
    expect(icone(await screen.findByRole('button', { name: 'Escolher período no calendário' }))).toHaveClass('lucide-calendar-days')
  })
})
