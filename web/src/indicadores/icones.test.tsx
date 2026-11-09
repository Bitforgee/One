import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const icone = (el: HTMLElement) => el.querySelector('svg')
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('ícone de Indicadores', () => {
  it('o período não traz botão de calendário', async () => {
    api({ 'GET /api/auth/me': () => [200, admin] })
    abrir('/univag/indicadores')
    await screen.findByLabelText('De')
    expect(screen.queryByRole('button', { name: 'Escolher período no calendário' })).not.toBeInTheDocument()
    expect(document.querySelector('main .lucide-calendar-days')).toBeNull()
  })
})
