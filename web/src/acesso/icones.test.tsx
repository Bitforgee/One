import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

// Ícones de ## Visual e ## Screens que o teste do cabeçalho (C17) não cobre (verification.md rodada 1, lacuna 4).
const icone = (el: HTMLElement) => el.querySelector('svg')

describe('ícones do tema', () => {
  // C17 (## Visual): o controle de tema mostra o ícone do tema atual (revisao-ux AC 10) e a escolha Escuro traz Moon
  it('Tema traz Sun e a escolha Escuro traz Moon', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    const tema = await screen.findByRole('button', { name: 'Tema' })
    expect(icone(tema)).toHaveClass('lucide-monitor') // sem tema gravado, Sistema
    await userEvent.click(tema)
    const escuro = await screen.findByRole('button', { name: 'Escuro' })
    expect(icone(escuro)).toHaveClass('lucide-moon')
    await userEvent.click(escuro)
    expect(icone(screen.getByRole('button', { name: 'Tema' }))).toHaveClass('lucide-moon')
  })
})
