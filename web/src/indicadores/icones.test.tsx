import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

// Ícones de ## Visual e ## Screens que o teste do cabeçalho (C17) não cobre (verification.md rodada 1, lacuna 4).
const icone = (el: HTMLElement) => el.querySelector('svg')
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('ícone de Indicadores', () => {
  // C42 (AC 32): o período é um só controle, os dois campos de data; o botão do calendário (e o seu CalendarDays) saiu
  it('o período não traz botão de calendário', async () => {
    api({ 'GET /api/auth/me': () => [200, admin] })
    abrir('/univag/indicadores')
    await screen.findByLabelText('De')
    expect(screen.queryByRole('button', { name: 'Escolher período no calendário' })).not.toBeInTheDocument()
    expect(document.querySelector('main .lucide-calendar-days')).toBeNull()
  })
})
