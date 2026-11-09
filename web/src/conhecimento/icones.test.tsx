import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const icone = (el: HTMLElement) => el.querySelector('svg')
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('ícones de Artigos', () => {
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
