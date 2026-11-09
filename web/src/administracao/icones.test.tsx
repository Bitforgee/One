import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const icone = (el: HTMLElement) => el.querySelector('svg')
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('ícones de Usuários e Cadastros', () => {
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
