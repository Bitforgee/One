import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Chamado } from './chamado'
import { abrir, api, chamado, escolher, me, type Chamada, type Rota } from './test/util'

const atendente = me({ papeis: ['ATENDENTE'], matriculas: [] })
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const posts = (chamadas: Chamada[]) => chamadas.filter((c) => c.metodo === 'POST').map((c) => [c.url, c.corpo])
const dialogo = async () => within(await screen.findByRole('dialog'))

function detalhe(c: Chamado, rotas: Record<string, Rota> = {}, quem = atendente) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, quem], 'GET /api/chamados/ONE-1': () => [200, c], ...rotas })
  abrir('/univag/chamados/ONE-1')
  return chamadas
}

const daEquipe = (parcial: Partial<Chamado>) => chamado({ solicitante: 'Ana', eventos: [], ...parcial })

describe('confirmar ativar artigo', () => {
  const artigo = { id: 2, estado: 'RASCUNHO', indexacao: null, categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null, versao: { id: 1, numero: 1, titulo: 'Faltas', perguntas: [], resposta: 'x', links: [] } }
  const tela = () =>
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/artigos': () => [200, [artigo]],
      'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Estágio', ativa: true }]],
      'POST /api/admin/artigos/2/ativar': () => [200, {}],
    })

  it('C58 Ativar abre Confirmar com o texto e o botão Ativar artigo, e só ativa depois', async () => {
    const chamadas = tela()
    abrir('/univag/artigos')
    await screen.findByText('Faltas')
    await escolher('Faltas', 'Ativar')
    const d = await dialogo()
    expect(d.getByText('O assistente passa a usar este artigo nas respostas aos alunos.')).toBeInTheDocument()
    expect(posts(chamadas)).toEqual([])

    await userEvent.click(d.getByRole('button', { name: 'Ativar artigo' }))
    await waitFor(() => expect(posts(chamadas)).toEqual([['/api/admin/artigos/2/ativar', {}]]))
  })

  it('C58 recusar a confirmação não ativa o artigo', async () => {
    const chamadas = tela()
    abrir('/univag/artigos')
    await screen.findByText('Faltas')
    await escolher('Faltas', 'Ativar')
    await userEvent.click((await dialogo()).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts(chamadas)).toEqual([])
  })
})

describe('confirmar ações do chamado', () => {
  it('C59 Assumir abre Confirmar com o botão Assumir chamado e nada é enviado antes', async () => {
    const depois = daEquipe({ acoes: [], responsavel: 'Bruno' })
    const chamadas = detalhe(daEquipe({ estado: 'ABERTO', acoes: ['assumir'], responsavel: null }), { 'POST /api/chamados/ONE-1/assumir': () => [200, depois] })
    await userEvent.click(await screen.findByRole('button', { name: 'Assumir' }))
    const d = await dialogo()
    expect(d.getByRole('button', { name: 'Assumir chamado' })).toBeInTheDocument()
    expect(posts(chamadas)).toEqual([])

    await userEvent.click(d.getByRole('button', { name: 'Assumir chamado' }))
    await waitFor(() => expect(posts(chamadas)).toEqual([['/api/chamados/ONE-1/assumir', {}]]))
  })

  it('C59 Voltar não envia nada', async () => {
    const chamadas = detalhe(daEquipe({ estado: 'ABERTO', acoes: ['assumir'], responsavel: null }))
    await userEvent.click(await screen.findByRole('button', { name: 'Assumir' }))
    await userEvent.click((await dialogo()).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts(chamadas)).toEqual([])
  })

  it('C60 Resolver abre Confirmar com o botão Resolver chamado e só envia depois', async () => {
    const c = daEquipe({ acoes: ['resolver'] })
    const chamadas = detalhe(c, { 'POST /api/chamados/ONE-1/resolver': () => [200, c] })
    await userEvent.type(await screen.findByLabelText('Resolução'), 'Boleto reenviado.')
    await userEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    const d = await dialogo()
    expect(posts(chamadas)).toEqual([])
    await userEvent.click(d.getByRole('button', { name: 'Resolver chamado' }))
    await waitFor(() => expect(posts(chamadas)).toEqual([['/api/chamados/ONE-1/resolver', { texto: 'Boleto reenviado.' }]]))
  })

  it('C60 Confirmar resolução abre Confirmar com o botão Resolver chamado e só envia depois', async () => {
    const chamadas = detalhe(chamado({ estado: 'RESOLVIDO', acoes: ['confirmar'] }), { 'POST /api/chamados/ONE-1/confirmar': () => [200, chamado({ estado: 'FECHADO', acoes: [] })] }, me())
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar resolução' }))
    const d = await dialogo()
    expect(posts(chamadas)).toEqual([])
    await userEvent.click(d.getByRole('button', { name: 'Resolver chamado' }))
    await waitFor(() => expect(posts(chamadas)).toEqual([['/api/chamados/ONE-1/confirmar', {}]]))
  })

  it('C61 Rejeitar resolução abre Confirmar com o botão Rejeitar resolução e só envia depois', async () => {
    const c = chamado({ estado: 'RESOLVIDO', acoes: ['rejeitar'] })
    const chamadas = detalhe(c, { 'POST /api/chamados/ONE-1/rejeitar': () => [200, c] }, me())
    await userEvent.type(await screen.findByLabelText('Não resolveu? Explique o motivo'), 'Não chegou.')
    await userEvent.click(screen.getByRole('button', { name: 'Rejeitar resolução' }))
    const d = await dialogo()
    expect(posts(chamadas)).toEqual([])
    await userEvent.click(d.getByRole('button', { name: 'Rejeitar resolução' }))
    await waitFor(() => expect(posts(chamadas)).toEqual([['/api/chamados/ONE-1/rejeitar', { motivo: 'Não chegou.' }]]))
  })
})
