import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from './test/util'

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
  // RAG C34
  it('tela Documentos lista, vazio e confirma arquivar', async () => {
    let lista: unknown[] = []
    const chamadas = api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/documentos': () => [200, lista],
      'GET /api/admin/categorias': () => [200, categorias],
      'POST /api/admin/documentos/1/arquivar': () => [200, {}],
    })
    const tela = abrir('/univag/documentos')
    expect(await screen.findByText('Nenhum item cadastrado.')).toBeInTheDocument()
    tela.unmount()

    lista = [documento(1, 'Regulamento de estágio', 'INDEXADO', 12), documento(2, 'Calendário', 'PENDENTE', 1)]
    abrir('/univag/documentos')
    const item = (await screen.findByText('Regulamento de estágio')).closest('.list-group-item') as HTMLElement
    expect(within(item).getByText('ATIVO')).toBeInTheDocument()
    expect(within(item).getByText('Indexado')).toBeInTheDocument()
    expect(item).toHaveTextContent('Estágio · versão 2 · 12 páginas · Regulamento de estágio.pdf')
    const outro = screen.getByText('Calendário').closest('.list-group-item') as HTMLElement
    expect(within(outro).getByText('Indexando')).toBeInTheDocument()
    expect(outro).toHaveTextContent('1 página')

    await userEvent.click(within(item).getByRole('button', { name: 'Arquivar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)
    await userEvent.click(dialogo.getByRole('button', { name: 'Voltar' }))
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)

    await userEvent.click(within(item).getByRole('button', { name: 'Arquivar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    await screen.findByText('Regulamento de estágio')
    expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => c.url)).toEqual(['/api/admin/documentos/1/arquivar'])
  })

  // RAG C39
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

    const de = async (titulo: string) => (await screen.findByText(titulo)).closest('.list-group-item') as HTMLElement
    expect(within(await de('Indexado já')).getByText('Indexado')).toBeInTheDocument()
    expect(within(await de('Recém ativado')).getByText('Indexando')).toBeInTheDocument()
    expect(within(await de('Sem sucesso')).getByText('Falhou')).toBeInTheDocument()
    const rascunho = await de('Rascunho')
    for (const rotulo of ['Indexado', 'Indexando', 'Falhou']) expect(within(rascunho).queryByText(rotulo)).not.toBeInTheDocument()
  })
})
