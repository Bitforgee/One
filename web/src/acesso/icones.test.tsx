import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const icone = (el: HTMLElement) => el.querySelector('svg')

describe('ícones do tema', () => {
  it('Tema traz Sun e a escolha Escuro traz Moon', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/trocar-senha')
    const tema = await screen.findByRole('button', { name: 'Tema' })
    expect(icone(tema)).toHaveClass('lucide-monitor')
    await userEvent.click(tema)
    const escuro = await screen.findByRole('button', { name: 'Escuro' })
    expect(icone(escuro)).toHaveClass('lucide-moon')
    await userEvent.click(escuro)
    expect(icone(screen.getByRole('button', { name: 'Tema' }))).toHaveClass('lucide-moon')
  })
})
