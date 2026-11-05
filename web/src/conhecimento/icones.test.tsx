import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

// Ícones de ## Visual e ## Screens que o teste do cabeçalho (C17) não cobre (verification.md rodada 1, lacuna 4).
const icone = (el: HTMLElement) => el.querySelector('svg')
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('ícones de Artigos', () => {
  // C80 (## Visual): Plus no "Novo"; CalendarDays no botão de validade
  it('Novo traz Plus e a validade traz CalendarDays', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/artigos': () => [200, [{ id: 1, estado: 'ATIVO', indexacao: null, categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null, versao: { id: 10, numero: 1, titulo: 'Horas', perguntas: [], resposta: 'r', links: [] } }]], 'GET /api/admin/categorias': () => [200, []] })
    abrir('/univag/artigos')
    const novo = await screen.findByRole('button', { name: /Novo/ })
    expect(icone(novo)).toHaveClass('lucide-plus')
    await userEvent.click(novo)
    const dialogo = within(await screen.findByRole('dialog'))
    expect(icone(dialogo.getByRole('button', { name: 'Escolher validade no calendário' }))).toHaveClass('lucide-calendar-days')
  })
})
