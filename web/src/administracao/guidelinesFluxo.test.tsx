import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'
import type { Destino } from './comum'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const etapa = (destino: string, setorId: number | null = null, prazoHoras: number | null = null, x: number | null = null, y: number | null = null) => ({ destino: destino as Destino, setorId, prazoHoras, x, y })
const listas: Record<string, unknown[]> = {
  setores: [
    { id: 1, nome: 'Triagem', triagem: true, ativo: true },
    { id: 2, nome: 'Financeiro', triagem: false, ativo: true },
  ],
  categorias: [
    { id: 6, nome: 'Provas', ativa: true, padrao: false },
    { id: 7, nome: 'Notas', ativa: true, padrao: false },
    { id: 9, nome: 'Boletos', ativa: true, padrao: false },
  ],
  cursos: [{ id: 4, nome: 'ADS', setorCoordenacaoId: 2 }],
  fluxos: [
    { id: 6, categoriaId: 6, cursoId: null, semestre: null, vigente: { numero: 1, etapas: [etapa('SETOR', 2)] }, rascunho: { numero: 2, etapas: [etapa('COORDENACAO_CURSO')] } },
    { id: 7, categoriaId: 9, cursoId: 4, semestre: 3, rascunho: null, vigente: { numero: 1, etapas: [etapa('LIDERANCA_SEMESTRE'), etapa('COORDENACAO_CURSO', null, 48)] } },
    { id: 8, categoriaId: 7, cursoId: null, semestre: null, vigente: null, rascunho: { numero: 1, etapas: [etapa('SETOR', 2, 24, 300, 50), etapa('COORDENACAO_CURSO', null, null, 600, 50)] } },
  ],
  'respostas-prontas': [],
}

function montar(rotas: Record<string, Rota> = {}) {
  const leituras = Object.fromEntries(Object.entries(listas).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, v]) as Rota]))
  return api({ 'GET /api/auth/me': () => [200, admin], ...leituras, ...rotas })
}

const gravadas = (chamadas: { metodo: string; url: string; corpo: any }[]) => chamadas.filter((c) => c.metodo !== 'GET').map((c) => [c.metodo, c.url])
const editor = async () => within(await screen.findByRole('region', { name: 'Editar: Fluxos' }))
const confirmacao = () => screen.queryByRole('dialog', { name: 'Remover a etapa?' })
const noDeEtapa = (n: number, rotulo: string) => screen.getByLabelText(`Etapa ${n}: ${rotulo}`)

async function selecionar(no: HTMLElement) {
  act(() => no.focus())
  await userEvent.keyboard('{Enter}')
}

async function noCanvas(rota: string, etapaN: number, rotulo: string) {
  montar()
  abrir('/univag/cadastros/fluxos/' + rota)
  const e = await editor()
  await userEvent.click(e.getByRole('tab', { name: 'Canvas' }))
  await screen.findByLabelText('Início')
  await selecionar(noDeEtapa(etapaN, rotulo))
  return e
}

describe('descartar rascunho do fluxo', () => {
  it('C19 abre Confirmar e só chama o DELETE depois do botão Descartar rascunho', async () => {
    const chamadas = montar({ 'DELETE /api/admin/fluxos/6/rascunho': () => [204, undefined] })
    abrir('/univag/cadastros/fluxos/6')
    const e = await editor()
    await userEvent.click(e.getByRole('button', { name: 'Mais' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Descartar rascunho' }))

    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getByRole('button', { name: 'Descartar rascunho' })).toBeInTheDocument()
    expect(gravadas(chamadas)).toEqual([])

    await userEvent.click(dialogo.getByRole('button', { name: 'Descartar rascunho' }))
    await waitFor(() => expect(gravadas(chamadas)).toEqual([['DELETE', '/api/admin/fluxos/6/rascunho']]))
  })

  it('C19 recusar a confirmação não chama o DELETE e mantém o editor', async () => {
    const chamadas = montar({ 'DELETE /api/admin/fluxos/6/rascunho': () => [204, undefined] })
    abrir('/univag/cadastros/fluxos/6')
    const e = await editor()
    await userEvent.click(e.getByRole('button', { name: 'Mais' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Descartar rascunho' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(gravadas(chamadas)).toEqual([])
    expect(screen.getByRole('region', { name: 'Editar: Fluxos' })).toBeInTheDocument()
  })
})

describe('remover etapa', () => {
  it.each([
    ['8', 1, 'Setor Financeiro (24 h)'],
    ['7', 2, 'Coordenação do curso (48 h)'],
  ])('C20 canvas: etapa preenchida (%s, etapa %s) pede confirmação', async (rota, n, rotulo) => {
    await noCanvas(rota, n, rotulo)
    await userEvent.click(await screen.findByRole('button', { name: 'Remover' }))
    expect(await screen.findByRole('dialog', { name: 'Remover a etapa?' })).toBeInTheDocument()
    expect(noDeEtapa(n, rotulo)).toBeInTheDocument()
  })

  it('C20 painel: etapa preenchida pede confirmação', async () => {
    const e = await noCanvas('8', 1, 'Setor Financeiro (24 h)')
    await userEvent.click(await e.findByRole('button', { name: 'Remover etapa selecionada' }))
    expect(await screen.findByRole('dialog', { name: 'Remover a etapa?' })).toBeInTheDocument()
    expect(noDeEtapa(1, 'Setor Financeiro (24 h)')).toBeInTheDocument()
  })

  it('C20 canvas: etapa em branco remove direto', async () => {
    await noCanvas('7', 1, 'Liderança do semestre')
    await userEvent.click(await screen.findByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(screen.queryByLabelText(/^Etapa 1: Liderança/)).not.toBeInTheDocument())
    expect(confirmacao()).not.toBeInTheDocument()
  })

  it('C20 painel: etapa em branco remove direto', async () => {
    const e = await noCanvas('7', 1, 'Liderança do semestre')
    await userEvent.click(await e.findByRole('button', { name: 'Remover etapa selecionada' }))
    await waitFor(() => expect(screen.queryByLabelText(/^Etapa 1: Liderança/)).not.toBeInTheDocument())
    expect(confirmacao()).not.toBeInTheDocument()
  })
})
