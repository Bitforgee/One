import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const atendente = me({ papeis: ['ALUNO', 'ATENDENTE'] })

function lista(escopo: string, rota: Rota) {
  api({ 'GET /api/auth/me': () => [200, atendente], [`GET /api/chamados?escopo=${escopo}`]: rota })
}

describe('listas de chamados', () => {
  it('Fila mostra cada chamado com categoria, responsável e dias', async () => {
    lista('fila', () => [
      200,
      [
        { numero: 'ONE-1', titulo: 'boleto', categoria: 'Boleto', estado: 'ABERTO', responsavel: null, criadoEm: '2026-11-02T12:00:00Z', dias: 1 },
        { numero: 'ONE-2', titulo: 'matrícula', categoria: 'Matrícula', estado: 'EM_ATENDIMENTO', responsavel: 'Carla', criadoEm: '2026-10-30T12:00:00Z', dias: 3 },
      ],
    ])
    abrir('/univag/fila')
    const primeiro = (await screen.findByText('ONE-1')).closest('a') as HTMLElement
    expect(primeiro).toHaveAttribute('href', '/univag/chamados/ONE-1')
    expect(within(primeiro).getByText('Aberto')).toBeInTheDocument()
    expect(primeiro).toHaveTextContent(/Boleto · sem responsável · 1 dia$/)
    const segundo = screen.getByText('ONE-2').closest('a') as HTMLElement
    expect(within(segundo).getByText('Em atendimento')).toBeInTheDocument()
    expect(segundo).toHaveTextContent('Matrícula · Carla · 3 dias')
    expect(screen.queryByText('Nenhum chamado na fila dos seus setores.')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('Minhas solicitações lista os chamados do aluno sem a linha da equipe', async () => {
    lista('meus', () => [200, [{ numero: 'ONE-3', titulo: 'histórico', estado: 'RESOLVIDO', criadoEm: '2026-11-02T12:00:00Z' }]])
    abrir('/univag/solicitacoes')
    const item = (await screen.findByText('ONE-3')).closest('a') as HTMLElement
    expect(item).toHaveAttribute('href', '/univag/chamados/ONE-3')
    expect(item).toHaveTextContent('ONE-3Resolvidohistórico')
    expect(screen.queryByText(/Você ainda não tem solicitações/)).not.toBeInTheDocument()
  })

  it('lista carregando mostra o Spinner e nada mais', async () => {
    lista('fila', () => new Promise(() => {}))
    abrir('/univag/fila')
    expect(await screen.findByRole('heading', { name: 'Fila' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Carregando' })).toHaveClass('spinner-border')
    expect(screen.queryByText('Nenhum chamado na fila dos seus setores.')).not.toBeInTheDocument()
  })

  it('lista com erro mostra o detail sem o Spinner', async () => {
    lista('meus', () => [500, { status: 500, detail: 'Falha ao listar.' }])
    abrir('/univag/solicitacoes')
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao listar.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(/Você ainda não tem solicitações/)).not.toBeInTheDocument()
  })
})
