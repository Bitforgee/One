import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Chamado } from '../chamado'
import { abrir, api, chamado, me, type Chamada, type Rota } from '../test/util'

const atendente = me({ papeis: ['ATENDENTE'], matriculas: [] })
const Todas = ['responder', 'nota', 'assumir', 'confirmar', 'encaminhar', 'cancelar', 'resolver', 'reclassificar', 'duplicado', 'rejeitar']

function daEquipe(parcial: Partial<Chamado> = {}): Chamado {
  return chamado({
    solicitante: 'Ana',
    eventos: [],
    setores: [{ id: 5, nome: 'Financeiro' }],
    categorias: [{ id: 3, nome: 'Boleto' }, { id: 4, nome: 'Matrícula' }],
    ...parcial,
  })
}

function detalhe(c: Chamado, rotas: Record<string, Rota> = {}, quem = atendente) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, quem], 'GET /api/chamados/ONE-1': () => [200, c], ...rotas })
  abrir('/univag/chamados/ONE-1')
  return chamadas
}

const enviados = (chamadas: Chamada[]) => chamadas.filter((c) => c.metodo === 'POST').map((c) => [c.url, c.corpo])
const leituras = (chamadas: Chamada[]) => chamadas.filter((c) => c.metodo === 'GET' && c.url === '/api/chamados/ONE-1').length
const botao = (nome: string) => screen.queryByRole('button', { name: nome })

describe('ações do chamado', () => {
  it('cada ação aparece só quando a API a permite', async () => {
    const sem = detalhe(daEquipe({ acoes: [] }))
    await screen.findByRole('heading', { name: 'preciso do boleto' })
    for (const nome of ['Assumir', 'Confirmar resolução', 'Encaminhar', 'Cancelar solicitação', 'Resolver', 'Salvar', 'Marcar', 'Rejeitar resolução', 'Enviar']) expect(botao(nome), nome).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Responder/)).not.toBeInTheDocument()
    expect(enviados(sem)).toEqual([])
  })

  it('com todas as ações permitidas, a equipe vê todos os botões', async () => {
    detalhe(daEquipe({ acoes: Todas }))
    await screen.findByRole('heading', { name: 'preciso do boleto' })
    for (const nome of ['Assumir', 'Confirmar resolução', 'Encaminhar', 'Cancelar solicitação', 'Resolver', 'Salvar', 'Marcar', 'Rejeitar resolução', 'Enviar']) expect(botao(nome), nome).toBeInTheDocument()
    expect(screen.getByLabelText('Nota interna')).toBeInTheDocument()
    expect(screen.getByLabelText('Aguardando aluno')).toBeInTheDocument()
  })

  it('assumir e confirmar mostram o chamado devolvido pela API', async () => {
    const chamadas = detalhe(daEquipe({ acoes: ['assumir', 'confirmar'], responsavel: null }), {
      'POST /api/chamados/ONE-1/assumir': () => [200, daEquipe({ acoes: ['confirmar'], responsavel: 'Bruno' })],
      'POST /api/chamados/ONE-1/confirmar': () => [200, daEquipe({ acoes: [], estado: 'FECHADO', responsavel: 'Bruno' })],
    })
    expect(await screen.findByText(/sem responsável/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Assumir' }))
    expect(await screen.findByText('Financeiro · Boleto · Bruno')).toBeInTheDocument()
    expect(botao('Assumir')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar resolução' }))
    expect(await screen.findByText('Fechado')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(enviados(chamadas)).toEqual([
      ['/api/chamados/ONE-1/assumir', {}],
      ['/api/chamados/ONE-1/confirmar', {}],
    ])
  })

  it('conflito relê o chamado e mostra o detail', async () => {
    const chamadas = detalhe(daEquipe({ acoes: ['assumir'] }), {
      'POST /api/chamados/ONE-1/assumir': () => [409, { status: 409, detail: 'Outro atendente assumiu o chamado.' }],
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Assumir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Outro atendente assumiu o chamado.')
    await waitFor(() => expect(leituras(chamadas)).toBe(2))
  })

  it('erro que não é conflito mostra o detail sem reler o chamado', async () => {
    const chamadas = detalhe(daEquipe({ acoes: ['assumir'] }), {
      'POST /api/chamados/ONE-1/assumir': () => [403, { status: 403, detail: 'Sem permissão.' }],
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Assumir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão.')
    expect(leituras(chamadas)).toBe(1)
  })

  it('resolver, reclassificar e duplicado enviam o preenchido e limpam o campo', async () => {
    const c = daEquipe({ acoes: ['resolver', 'reclassificar', 'duplicado'] })
    const chamadas = detalhe(c, {
      'POST /api/chamados/ONE-1/resolver': () => [200, c],
      'POST /api/chamados/ONE-1/reclassificar': () => [200, c],
      'POST /api/chamados/ONE-1/duplicado': () => [200, c],
    })
    const resolucao = await screen.findByLabelText('Resolução')
    expect(botao('Resolver')).toBeDisabled()
    await userEvent.type(resolucao, '   ')
    expect(botao('Resolver')).toBeDisabled()
    await userEvent.type(resolucao, 'Boleto reenviado.')
    await userEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    await waitFor(() => expect(resolucao).toHaveValue(''))

    expect(botao('Salvar')).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Reclassificar'), '4')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(screen.getByLabelText('Reclassificar')).toHaveValue(''))

    const original = screen.getByLabelText('Duplicado de outro pedido do mesmo aluno')
    await userEvent.type(original, '  ')
    expect(botao('Marcar')).toBeDisabled()
    await userEvent.type(original, 'one-7 ')
    await userEvent.click(screen.getByRole('button', { name: 'Marcar' }))
    await waitFor(() => expect(original).toHaveValue(''))

    expect(enviados(chamadas)).toEqual([
      ['/api/chamados/ONE-1/resolver', { texto: '   Boleto reenviado.' }],
      ['/api/chamados/ONE-1/reclassificar', { categoriaId: 4 }],
      ['/api/chamados/ONE-1/duplicado', { numeroOriginal: 'ONE-7' }],
    ])
  })

  it('rejeitar envia o motivo e cancelar só envia a justificativa preenchida', async () => {
    const c = chamado({ estado: 'RESOLVIDO', acoes: ['rejeitar', 'cancelar'] })
    const chamadas = detalhe(c, { 'POST /api/chamados/ONE-1/rejeitar': () => [200, c], 'POST /api/chamados/ONE-1/cancelar': () => [200, c] }, me())
    const motivo = await screen.findByLabelText('Não resolveu? Explique o motivo')
    expect(botao('Rejeitar resolução')).toBeDisabled()
    await userEvent.type(motivo, 'Não chegou.')
    await userEvent.click(screen.getByRole('button', { name: 'Rejeitar resolução' }))
    await waitFor(() => expect(motivo).toHaveValue(''))

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitação' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitação' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar solicitação' }))
    await waitFor(() => expect(enviados(chamadas)).toHaveLength(2))

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitação' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await userEvent.type(dialogo.getByLabelText('Justificativa (opcional)'), ' Desisti. ')
    await userEvent.click(dialogo.getByRole('button', { name: 'Cancelar solicitação' }))
    await waitFor(() => expect(enviados(chamadas)).toHaveLength(3))

    expect(enviados(chamadas)).toEqual([
      ['/api/chamados/ONE-1/rejeitar', { motivo: 'Não chegou.' }],
      ['/api/chamados/ONE-1/cancelar', {}],
      ['/api/chamados/ONE-1/cancelar', { motivo: 'Desisti.' }],
    ])
  })

  it('encaminhar pede o motivo além do setor', async () => {
    detalhe(daEquipe({ acoes: ['encaminhar'] }))
    await userEvent.click(await screen.findByRole('button', { name: 'Encaminhar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    await userEvent.selectOptions(dialogo.getByLabelText('Setor'), '5')
    expect(dialogo.getByRole('button', { name: 'Encaminhar' })).toBeDisabled()
    await userEvent.type(dialogo.getByLabelText('Motivo'), '  ')
    expect(dialogo.getByRole('button', { name: 'Encaminhar' })).toBeDisabled()
  })

  it('subir pede o motivo', async () => {
    const chamadas = detalhe(daEquipe({ acoes: ['responder', 'subir'] }), { 'POST /api/chamados/ONE-1/subir': () => [200, daEquipe({ acoes: [], setor: 'Coordenação' })] })
    await userEvent.click(await screen.findByRole('button', { name: 'Subir' }))
    const dialogo = within(await screen.findByRole('dialog', { name: 'Subir para a próxima etapa?' }))
    expect(dialogo.getByRole('button', { name: 'Subir' })).toBeDisabled()
    await userEvent.type(dialogo.getByLabelText('Motivo'), '  ')
    expect(dialogo.getByRole('button', { name: 'Subir' })).toBeDisabled()
    await userEvent.type(dialogo.getByLabelText('Motivo'), 'A coordenação resolve.')
    await userEvent.click(dialogo.getByRole('button', { name: 'Subir' }))

    await waitFor(() => expect(enviados(chamadas)).toEqual([['/api/chamados/ONE-1/subir', { motivo: '  A coordenação resolve.' }]]))
    await waitFor(() => expect(botao('Subir')).not.toBeInTheDocument())
  })

  it('sem a ação subir não há botão', async () => {
    detalhe(daEquipe({ acoes: ['responder', 'encaminhar'] }))
    await screen.findByRole('button', { name: 'Encaminhar' })
    expect(botao('Subir')).not.toBeInTheDocument()
  })
})