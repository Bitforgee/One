import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, escolher, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const documento = (id: number, titulo: string, indexacao: string) => ({
  id,
  titulo,
  categoriaId: 3,
  categoria: 'Estágio',
  estado: 'ATIVO',
  versao: { id: id * 10, numero: 1, nomeArquivo: `${titulo}.pdf`, paginas: 4, criadaEm: '2026-11-02T12:00:00Z' },
  indexacao,
})

describe('situação do documento anunciada', () => {
  it.each([
    ['INDEXADO', 'Indexado'],
    ['FALHOU', 'Falhou'],
  ])('C31 Indexando vira %s dentro da mesma região aria-live polite', async (final, rotulo) => {
    let lista = [documento(1, 'Regulamento', 'INDEXADO'), documento(2, 'Calendário', 'PENDENTE')]
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/documentos': () => [200, lista],
      'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Estágio', ativa: true }]],
      'POST /api/admin/documentos/1/arquivar': () => {
        lista = [documento(2, 'Calendário', final)]
        return [200, {}]
      },
    })
    abrir('/univag/documentos')
    const linha = (await screen.findByText('Calendário')).closest('tr') as HTMLElement
    const regiao = within(linha).getByText('Indexando').closest('[aria-live="polite"]')
    expect(regiao).not.toBeNull()

    await escolher('Regulamento', 'Arquivar')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arquivar' }))

    await waitFor(() => expect(within(linha).getByText(rotulo)).toBeInTheDocument())
    expect(within(linha).queryByText('Indexando')).not.toBeInTheDocument()
    expect(within(linha).getByText(rotulo).closest('[aria-live="polite"]')).toBe(regiao)
  })

  it('C31 artigos usam a mesma região para a situação', async () => {
    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/artigos': () => [
        200,
        [{ id: 1, estado: 'ATIVO', indexacao: 'PENDENTE', categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null, versao: { id: 1, numero: 1, titulo: 'Recém ativado', perguntas: [], resposta: 'r', links: [] } }],
      ],
      'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Estágio', ativa: true }]],
    })
    abrir('/univag/artigos')
    const linha = (await screen.findAllByText('Recém ativado'))[0].closest('tr') as HTMLElement
    expect(within(linha).getByText('Indexando').closest('[aria-live="polite"]')).not.toBeNull()
  })
})
