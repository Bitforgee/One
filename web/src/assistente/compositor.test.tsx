import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const Pergunta = 'É do semestre atual?'

describe('compositor', () => {
  it('limite de 10 mensagens', async () => {
    api({
      'GET /api/auth/me': () => [200, me()],
      'POST /api/conversas': () => [201, { conversaId: 7, resposta: { tipo: 'pergunta', texto: Pergunta } }],
      'POST /api/conversas/7/mensagens': () => [200, { resposta: { tipo: 'pergunta', texto: Pergunta } }],
    })
    abrir('/univag/assistente')
    for (let n = 1; n <= 10; n++) {
      if (n === 10) {
        const caixa = screen.getByTestId('compositor')
        expect(caixa).toContainElement(screen.getByLabelText('Mensagem'))
        expect(caixa).toContainElement(screen.getByRole('button', { name: /Enviar/ }))
        expect(caixa).toContainElement(screen.getByRole('button', { name: 'Anexar arquivo' }))
      }
      await userEvent.type(await screen.findByLabelText('Mensagem'), `mensagem ${n}`)
      await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
      await waitFor(() => expect(screen.getAllByText(Pergunta)).toHaveLength(n))
    }
    expect(screen.queryByTestId('compositor')).not.toBeInTheDocument()
    const falar = screen.getByRole('button', { name: 'Falar com atendente' })
    expect(falar).toBeVisible()
    expect(falar).toHaveClass('bg-primary')
  }, 15000)
})
