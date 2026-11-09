import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, acoesDe, api, escolher, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const categorias = [{ id: 3, nome: 'Estágio', ativa: true }]
const documento = (id: number, titulo: string, indexacao: string, paginas: number) => ({
  id,
  titulo,
  categoriaId: 3,
  categoria: 'Estágio',
  estado: 'ATIVO',
  versao: { id: id * 10, numero: 2, nomeArquivo: `${titulo}.pdf`, paginas, criadaEm: '2026-11-02T12:00:00Z' },
  indexacao,
})

describe('documentos', () => {
  it('tela Documentos lista, vazio e confirma arquivar', async () => {
    let lista: unknown[] = []
    const chamadas = api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/documentos': () => [200, lista],
      'GET /api/admin/categorias': () => [200, categorias],
      'POST /api/admin/documentos/1/arquivar': () => [200, {}],
    })
    const tela = abrir('/univag/documentos')
    expect(await screen.findByText('PDFs como regulamentos e calendários também alimentam o assistente.')).toBeInTheDocument()
    tela.unmount()

    lista = [documento(1, 'Regulamento de estágio', 'INDEXADO', 12), documento(2, 'Calendário', 'PENDENTE', 1)]
    abrir('/univag/documentos')
    const item = (await screen.findByText('Regulamento de estágio')).closest('tr') as HTMLElement
    expect(within(item).getByText('Ativo')).toBeInTheDocument()
    expect(within(item).getByText('Indexado')).toBeInTheDocument()
    expect(item).toHaveTextContent('Estágio · versão 2 · 12 páginas · Regulamento de estágio.pdf')
    const outro = screen.getByText('Calendário').closest('tr') as HTMLElement
    expect(within(outro).getByText('Indexando')).toBeInTheDocument()
    expect(outro).toHaveTextContent('1 página')

    await escolher('Regulamento de estágio', 'Arquivar')
    const dialogo = within(await screen.findByRole('dialog'))
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)
    await userEvent.click(dialogo.getByRole('button', { name: 'Voltar' }))
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)

    await escolher('Regulamento de estágio', 'Arquivar')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    await screen.findByText('Regulamento de estágio')
    expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => c.url)).toEqual(['/api/admin/documentos/1/arquivar'])
  })

  it('artigos mostram a indexação', async () => {
    const artigo = (id: number, titulo: string, estado: string, indexacao: string | null) => ({
      id, estado, indexacao, categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null,
      versao: { id, numero: 1, titulo, perguntas: [], resposta: 'r', links: [] },
    })
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/artigos': () => [200, [artigo(1, 'Indexado já', 'ATIVO', 'INDEXADO'), artigo(2, 'Recém ativado', 'ATIVO', 'PENDENTE'), artigo(3, 'Sem sucesso', 'ATIVO', 'FALHOU'), artigo(4, 'Rascunho', 'RASCUNHO', null)]],
      'GET /api/admin/categorias': () => [200, categorias],
    })
    abrir('/univag/artigos')

    const de = async (titulo: string) => (await screen.findAllByText(titulo))[0].closest('tr') as HTMLElement
    expect(within(await de('Indexado já')).getByText('Indexado')).toBeInTheDocument()
    expect(within(await de('Recém ativado')).getByText('Indexando')).toBeInTheDocument()
    expect(within(await de('Sem sucesso')).getByText('Falhou')).toBeInTheDocument()
    const rascunho = await de('Rascunho')
    for (const rotulo of ['Indexado', 'Indexando', 'Falhou']) expect(within(rascunho).queryByText(rotulo)).not.toBeInTheDocument()
  })

  it('ações de documento no menu', async () => {
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/documentos': () => [200, [documento(1, 'No ar', 'INDEXADO', 1), { ...documento(2, 'Guardado', 'INDEXADO', 1), estado: 'ARQUIVADO' }]],
      'GET /api/admin/categorias': () => [200, categorias],
    })
    abrir('/univag/documentos')
    await screen.findByText('No ar')
    expect(await acoesDe('No ar')).toEqual(['Nova versão', 'Arquivar!'])
    expect(screen.queryByRole('button', { name: 'Ações de Guardado' })).not.toBeInTheDocument()
  })

  it('ações de linha mostram o Spinner enquanto gravam', async () => {
    let responder!: () => void
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/documentos': () => [200, [documento(1, 'Regulamento de estágio', 'INDEXADO', 12)]],
      'GET /api/admin/categorias': () => [200, categorias],
      'POST /api/admin/documentos/1/arquivar': () => new Promise((resolve) => (responder = () => resolve([200, {}]))),
    })
    abrir('/univag/documentos')
    await escolher('Regulamento de estágio', 'Arquivar')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    const gatilho = await screen.findByRole('button', { name: 'Ações de Regulamento de estágio' })
    await waitFor(() => expect(gatilho).toBeDisabled())
    expect(within(gatilho).getByRole('status')).toBeInTheDocument()
    responder()
    await waitFor(() => expect(within(gatilho).queryByRole('status')).not.toBeInTheDocument())
  })
})
