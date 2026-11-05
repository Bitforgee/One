import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

// Ícones de ## Visual e ## Screens que o teste do cabeçalho (C17) não cobre (verification.md rodada 1, lacuna 4).
const icone = (el: HTMLElement) => el.querySelector('svg')

describe('ícones do assistente', () => {
  // C38 (## Visual), estrutura-visual AC 14: o Enviar é escrito, sem seta; Hand no Falar com atendente, ShieldAlert no aviso
  it('Assistente traz Enviar escrito, Hand e ShieldAlert', async () => {
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/assistente')
    expect(icone(await screen.findByRole('button', { name: /Enviar/ }))).toBeNull()
    expect(icone(screen.getByRole('button', { name: /Falar com atendente/ }))).toHaveClass('lucide-hand')
    expect(icone(screen.getByText(/Suas mensagens são analisadas/) as HTMLElement)).toHaveClass('lucide-shield-alert')
  })
})
