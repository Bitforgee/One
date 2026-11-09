import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const icone = (el: HTMLElement) => el.querySelector('svg')

describe('ícones do assistente', () => {
  it('Assistente traz Enviar escrito, Hand e ShieldAlert', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/assistente')
    expect(icone(await screen.findByRole('button', { name: /Enviar/ }))).toBeNull()
    expect(icone(screen.getByRole('button', { name: /Falar com atendente/ }))).toHaveClass('lucide-hand')
    expect(icone(screen.getByText(/Suas mensagens são analisadas/) as HTMLElement)).toHaveClass('lucide-shield-alert')
  })
})
