import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

// editor-fluxo-integrado: o editor de fluxo é uma página da casca em /:slug/cadastros/fluxos/:id
const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const etapa = (destino: string, setorId: number | null = null, prazoHoras: number | null = null) => ({ destino, setorId, prazoHoras, x: null, y: null })
const listas: Record<string, unknown[]> = {
  setores: [
    { id: 1, nome: 'Triagem', triagem: true, ativo: true },
    { id: 2, nome: 'Financeiro', triagem: false, ativo: true },
  ],
  categorias: [
    { id: 7, nome: 'Notas', ativa: true, padrao: false },
    { id: 9, nome: 'Boletos', ativa: true, padrao: false },
  ],
  cursos: [{ id: 4, nome: 'ADS', setorCoordenacaoId: 2 }],
  fluxos: [
    { id: 6, categoriaId: 7, cursoId: null, semestre: null, vigente: { numero: 1, etapas: [etapa('SETOR', 2)] }, rascunho: null },
    { id: 7, categoriaId: 9, cursoId: 4, semestre: 3, rascunho: null, vigente: { numero: 2, etapas: [etapa('LIDERANCA_SEMESTRE'), etapa('COORDENACAO_CURSO', null, 48)] } },
  ],
  'respostas-prontas': [],
}

// Prepara a API simulada; cada teste abre a tela com abrir(), depois disso.
function montar(rotas: Record<string, Rota> = {}, quem = admin, sobre: Record<string, unknown[]> = {}) {
  const leituras = Object.fromEntries(Object.entries({ ...listas, ...sobre }).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, v]) as Rota]))
  const chamadas = api({ 'GET /api/auth/me': () => [200, quem], 'GET /api/chamados?escopo=fila': () => [200, []], ...leituras, ...rotas })
  return chamadas
}

const editor = async () => within(await screen.findByRole('region', { name: 'Editar: Fluxos' }))
const semEditor = () => waitFor(() => expect(screen.queryByRole('region', { name: 'Editar: Fluxos' })).not.toBeInTheDocument())
const gravadas = (chamadas: { metodo: string; url: string; corpo: any }[]) => chamadas.filter((c) => c.metodo !== 'GET').map((c) => [c.metodo, c.url, c.corpo])
const trilha = () => within(screen.getByRole('navigation', { name: 'Trilha' }))
const comRascunho = [{ ...(listas.fluxos[0] as object), rascunho: { numero: 2, etapas: [etapa('COORDENACAO_CURSO')] } }]

describe('editor de fluxo na casca', () => {
  // C1
  it('abre na casca sem diálogo', async () => {
    montar()
    abrir('/univag/cadastros')
    await userEvent.click(await screen.findByRole('tab', { name: 'Fluxos' }))
    await userEvent.click(await within(screen.getByRole('tabpanel', { name: 'Fluxos' })).findByRole('button', { name: 'Boletos' }))

    const e = await editor()
    expect(e.getByLabelText('Destino da etapa 1')).toHaveValue('LIDERANCA_SEMESTRE')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('navigation').length).toBeGreaterThanOrEqual(2) // a barra lateral e a trilha
    expect(document.querySelector('[data-sidebar=sidebar]')).not.toBeNull()
  })

  // C2
  it('trilha do editor', async () => {
    montar()
    abrir('/univag/cadastros/fluxos/7')
    await editor()
    const t = trilha()
    expect(t.getByRole('link', { name: 'Cadastros' })).toHaveAttribute('href', '/univag/cadastros')
    expect(t.getByRole('link', { name: 'Fluxos' })).toHaveAttribute('href', '/univag/cadastros?aba=fluxos')
    const atual = t.getByText('Boletos · ADS, 3º semestre')
    expect(atual).toHaveAttribute('aria-current', 'page')
  })

  // C3
  it('abre direto pelo endereço', async () => {
    montar()
    abrir('/univag/cadastros/fluxos/7')
    const e = await editor()
    expect(e.getByLabelText('Destino da etapa 1')).toHaveValue('LIDERANCA_SEMESTRE')
    expect(e.getByLabelText('Destino da etapa 2')).toHaveValue('COORDENACAO_CURSO')
    expect(e.queryByLabelText('Destino da etapa 3')).not.toBeInTheDocument()
  })

  // C4
  it('fluxo inexistente', async () => {
    montar()
    abrir('/univag/cadastros/fluxos/999')
    expect(await screen.findByText('Fluxo não encontrado.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar aos fluxos' })).toHaveAttribute('href', '/univag/cadastros?aba=fluxos')
    expect(screen.queryByRole('region', { name: 'Editar: Fluxos' })).not.toBeInTheDocument()
  })

  // C6
  it('menu ativo e título', async () => {
    montar()
    abrir('/univag/cadastros/fluxos/7')
    await editor()
    const doMenu = screen.getAllByRole('link', { name: 'Cadastros' }).find((l) => l.closest('[data-sidebar=sidebar]'))!
    expect(doMenu).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cadastros')
  })

  // C7 (Publicar e Descartar também em fluxos.test.tsx)
  it('avisos ao voltar à lista', async () => {
    const chamadas = montar({ 'POST /api/admin/fluxos/6/publicar': () => [201, {}], 'DELETE /api/admin/fluxos/6/rascunho': () => [204, undefined] }, admin, { fluxos: comRascunho })
    abrir('/univag/cadastros/fluxos/6')
    const e = await editor()
    await userEvent.click(e.getByRole('button', { name: 'Publicar' }))
    expect(await screen.findByText('Fluxo publicado.')).toBeInTheDocument()
    await semEditor()
    expect(await screen.findByRole('tab', { name: 'Fluxos', selected: true })).toBeInTheDocument()
    expect(gravadas(chamadas)).toEqual([['POST', '/api/admin/fluxos/6/publicar', {}]])
  })

  // C8
  it('salvar fica no editor', async () => {
    montar({ 'PUT /api/admin/fluxos/7/rascunho': () => [200, { numero: 3, etapas: [] }] })
    abrir('/univag/cadastros/fluxos/7')
    const e = await editor()
    await userEvent.click(e.getByRole('button', { name: 'Adicionar etapa' }))
    expect(e.getByText('Alterações não salvas')).toBeInTheDocument()
    await userEvent.selectOptions(e.getByLabelText('Destino da etapa 3'), 'Coordenação do curso')
    await userEvent.click(e.getByRole('button', { name: 'Salvar rascunho' }))
    expect(await screen.findByText('Rascunho salvo.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editar: Fluxos' })).toBeInTheDocument()
    expect(e.getByText('Rascunho salvo')).toBeInTheDocument()
  })

  // C9
  it('sair sem salvar', async () => {
    montar()
    abrir('/univag/cadastros/fluxos/7')
    const e = await editor()
    await userEvent.click(e.getByRole('button', { name: 'Adicionar etapa' }))

    for (const saida of [() => trilha().getByRole('link', { name: 'Fluxos' }), () => trilha().getByRole('link', { name: 'Cadastros' }), () => e.getByRole('button', { name: 'Voltar' })]) {
      await userEvent.click(saida())
      const d = within(await screen.findByRole('dialog', { name: 'Sair sem salvar?' }))
      await userEvent.click(d.getByRole('button', { name: 'Continuar editando' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.getByRole('region', { name: 'Editar: Fluxos' })).toBeInTheDocument()
      expect(e.getByLabelText('Destino da etapa 3')).toBeInTheDocument() // a etapa nova continua
    }

    await userEvent.click(e.getByRole('button', { name: 'Voltar' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Sair sem salvar?' })).getByRole('button', { name: 'Sair sem salvar' }))
    await semEditor()
    expect(await screen.findByRole('tab', { name: 'Fluxos', selected: true })).toBeInTheDocument()
  })

  // C10
  it('sair sem alterações', async () => {
    montar({ 'PUT /api/admin/fluxos/7/rascunho': () => [200, { numero: 3, etapas: [] }] })
    abrir('/univag/cadastros/fluxos/7')
    let e = await editor()
    await userEvent.click(trilha().getByRole('link', { name: 'Fluxos' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await semEditor()
    expect(await screen.findByRole('tab', { name: 'Fluxos', selected: true })).toBeInTheDocument()

    // depois de salvar o rascunho também não pergunta
    await userEvent.click(await within(screen.getByRole('tabpanel', { name: 'Fluxos' })).findByRole('button', { name: 'Boletos' }))
    e = await editor()
    await userEvent.click(e.getByRole('button', { name: 'Adicionar etapa' }))
    await userEvent.selectOptions(e.getByLabelText('Destino da etapa 3'), 'Coordenação do curso')
    await userEvent.click(e.getByRole('button', { name: 'Salvar rascunho' }))
    await screen.findByText('Rascunho salvo.')
    await userEvent.click(e.getByRole('button', { name: 'Voltar' }))
    expect(screen.queryByRole('dialog', { name: 'Sair sem salvar?' })).not.toBeInTheDocument()
    await semEditor()
  })

  // C11
  it('fechar a aba com alterações', async () => {
    montar()
    abrir('/univag/cadastros/fluxos/7')
    const e = await editor()
    const fechar = () => {
      const ev = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(ev)
      return ev.defaultPrevented
    }
    expect(fechar()).toBe(false)
    await userEvent.click(e.getByRole('button', { name: 'Adicionar etapa' }))
    expect(fechar()).toBe(true)
  })

  // C14
  it('barra do editor', async () => {
    montar()
    abrir('/univag/cadastros/fluxos/7')
    const e = await editor()
    expect(e.getByText('Publicado v2')).toBeInTheDocument()
    for (const nome of ['Voltar', 'Simular', 'Salvar rascunho', 'Publicar', 'Mais']) expect(e.getByRole('button', { name: nome })).toBeInTheDocument()
    expect(e.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Lista', 'Canvas'])
    expect(e.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    await userEvent.click(e.getByRole('button', { name: 'Mais' }))
    expect(await screen.findByRole('menuitem', { name: 'Descartar rascunho' })).toBeInTheDocument()
  })

  // C18
  it('endereço do editor', async () => {
    montar()
    abrir('/univag/cadastros/fluxos/abc')
    expect(await screen.findByText('Fluxo não encontrado.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Editar: Fluxos' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cadastros') // a casca continua inteira
    const app = readFileSync('src/App.tsx', 'utf8') // o Vitest roda na pasta web/
    expect(app.match(/path="cadastros\/fluxos\/:id"/g)).toHaveLength(1)
  })

  // C20
  it('sem o papel de administrador', async () => {
    montar({}, me({ papeis: ['ATENDENTE'], matriculas: [] }))
    abrir('/univag/cadastros/fluxos/7')
    expect(await screen.findByRole('heading', { level: 1, name: 'Fila' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Editar: Fluxos' })).not.toBeInTheDocument()
  })
})
