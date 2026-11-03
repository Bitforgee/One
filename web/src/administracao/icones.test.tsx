import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

// Ícones de ## Visual e ## Screens que o teste do cabeçalho (C17) não cobre (verification.md rodada 1, lacuna 4).
const icone = (el: HTMLElement) => el.querySelector('svg')
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('ícones de Usuários e Cadastros', () => {
  // C89 (## Visual): Plus no "Novo"
  it('Novo traz Plus em Usuários e em Cadastros', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': () => [200, []], 'GET /api/admin/setores': () => [200, []] })
    const usuarios = abrir('/univag/usuarios')
    expect(icone(await screen.findByRole('button', { name: /Novo/ }))).toHaveClass('lucide-plus')
    usuarios.unmount()

    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/setores': () => [200, []] })
    abrir('/univag/cadastros')
    expect(icone(await screen.findByRole('button', { name: /Novo/ }))).toHaveClass('lucide-plus')
  })
})
