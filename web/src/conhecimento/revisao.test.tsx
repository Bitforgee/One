import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const categorias = [{ id: 3, nome: 'Acadêmico', ativa: true }]
const artigo = (titulo: string, estado: string, indexacao: string | null) => ({
  id: 1, estado, indexacao, categoriaId: 3, categoria: 'Acadêmico', visivelDe: null, visivelAte: null,
  versao: { id: 10, numero: 1, titulo, perguntas: ['quando?'], resposta: 'Em março.', links: [] },
})
const documento = (titulo: string, estado: string, indexacao: string) => ({
  id: 1, titulo, categoriaId: 3, categoria: 'Acadêmico', estado, indexacao,
  versao: { id: 10, numero: 1, nomeArquivo: `${titulo}.pdf`, paginas: 2, criadaEm: '2026-11-02T12:00:00Z' },
})
const tela = (lista: string, itens: unknown[]) => {
  api({ 'GET /api/auth/me': () => [200, admin], [`GET /api/admin/${lista}`]: () => [200, itens], 'GET /api/admin/categorias': () => [200, categorias] })
}
const linhaDe = async (titulo: string) => (await screen.findByText(titulo)).closest('tr') as HTMLElement
const selos = (linha: HTMLElement) => [...linha.querySelectorAll('[data-slot=badge]')].map((b) => b.textContent)
const Valores: Record<string, string> = { Indexado: 'INDEXADO', Indexando: 'PENDENTE', Falhou: 'FALHOU' }

describe('um selo de situação e a indexação em ícone', () => {
  it.each([
    ['ATIVO', 'Ativo'],
    ['RASCUNHO', 'Rascunho'],
    ['ARQUIVADO', 'Arquivado'],
  ])('um selo de situação e a indexação em ícone: Artigos %s', async (estado, texto) => {
    tela('artigos', [artigo('Rematrícula', estado, 'INDEXADO')])
    abrir('/univag/artigos')
    expect(selos(await linhaDe('Rematrícula'))).toEqual([texto])
  })

  it.each(Object.keys(Valores))('um selo de situação e a indexação em ícone: Artigos, ícone %s', async (nome) => {
    tela('artigos', [artigo('Rematrícula', 'ATIVO', Valores[nome])])
    abrir('/univag/artigos')
    const linha = await linhaDe('Rematrícula')
    const icone = within(linha).getByRole('img', { name: nome })
    expect(icone.tagName.toLowerCase()).toBe('svg')
    expect(icone.querySelector('title')).toHaveTextContent(nome)
    expect(selos(linha)).toEqual(['Ativo'])
  })

  it.each([
    ['ATIVO', 'Ativo'],
    ['ARQUIVADO', 'Arquivado'],
  ])('um selo de situação e a indexação em ícone: Documentos %s', async (estado, texto) => {
    tela('documentos', [documento('Edital', estado, 'INDEXADO')])
    abrir('/univag/documentos')
    expect(selos(await linhaDe('Edital'))).toEqual([texto])
  })

  it.each(Object.keys(Valores))('um selo de situação e a indexação em ícone: Documentos, ícone %s', async (nome) => {
    tela('documentos', [documento('Edital', 'ATIVO', Valores[nome])])
    abrir('/univag/documentos')
    const linha = await linhaDe('Edital')
    const icone = within(linha).getByRole('img', { name: nome })
    expect(icone.querySelector('title')).toHaveTextContent(nome)
    expect(selos(linha)).toEqual(['Ativo'])
  })
})

describe('Novo some com a lista vazia', () => {
  it('Novo some com a lista vazia: vazia', async () => {
    tela('artigos', [])
    abrir('/univag/artigos')
    expect(await screen.findByRole('button', { name: 'Novo artigo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Novo' })).not.toBeInTheDocument()
  })

  it('Novo some com a lista vazia: com 1 artigo', async () => {
    tela('artigos', [artigo('Rematrícula', 'ATIVO', null)])
    abrir('/univag/artigos')
    await screen.findByText('Rematrícula')
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Novo artigo' })).not.toBeInTheDocument()
  })
})
