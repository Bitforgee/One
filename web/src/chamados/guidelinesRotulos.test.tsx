import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, chamado, me } from '../test/util'

describe('rótulos de ChamadoDetalhe', () => {
  it('C71 nenhum botão do painel de ações se chama só Salvar e o da categoria declara o objeto', async () => {
    api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })],
      'GET /api/chamados/ONE-1': () => [200, chamado({ solicitante: 'Ana', eventos: [], setores: [], acoes: ['responder', 'reclassificar', 'duplicado', 'resolver'], categorias: [{ id: 4, nome: 'Matrícula' }] })],
    })
    abrir('/univag/chamados/ONE-1')
    await screen.findByLabelText('Reclassificar')
    const botoes = screen.getAllByRole('button').map((b) => b.textContent?.trim())
    expect(botoes).not.toContain('Salvar')
    expect(botoes).toContain('Salvar categoria')
  })

  it('C71 Salvar categoria envia a categoria escolhida', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })],
      'GET /api/chamados/ONE-1': () => [200, chamado({ solicitante: 'Ana', eventos: [], setores: [], acoes: ['reclassificar'], categorias: [{ id: 4, nome: 'Matrícula' }] })],
      'POST /api/chamados/ONE-1/reclassificar': () => [200, chamado()],
    })
    abrir('/univag/chamados/ONE-1')
    const campo = await screen.findByLabelText('Reclassificar')
    await userEvent.selectOptions(campo, '4')
    await userEvent.click(within(campo.closest('form')!).getByRole('button', { name: 'Salvar categoria' }))
    await waitFor(() => expect(chamadas.find((c) => c.url === '/api/chamados/ONE-1/reclassificar')?.corpo).toEqual({ categoriaId: 4 }))
  })
})