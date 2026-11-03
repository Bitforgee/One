import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, acoesDe, api, cabecalhos, esperaLinhaVazia, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('artigos', () => {
  it('novo artigo envia perguntas e links como listas', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/artigos': () => [200, []],
      'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Acadêmico', ativa: true }, { id: 4, nome: 'Antiga', ativa: false }]],
      'POST /api/admin/artigos': () => [201, {}],
    })
    abrir('/univag/artigos')

    expect(await screen.findByText('Nenhum item cadastrado.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha a categoria', 'Acadêmico'])
    await userEvent.type(dialogo.getByLabelText('Título'), 'Faltas não são abonadas')
    await userEvent.type(dialogo.getByLabelText(/Perguntas/), 'posso abonar falta?{enter}{enter}falta com atestado?')
    await userEvent.selectOptions(dialogo.getByLabelText('Categoria'), '3')
    await userEvent.type(dialogo.getByLabelText('Resposta'), 'Faltas não são abonadas.')
    await userEvent.type(dialogo.getByLabelText(/Links/), 'https://univag.edu.br/estatuto')
    await userEvent.click(dialogo.getByRole('button', { name: 'Salvar' }))

    await screen.findByText('Nenhum item cadastrado.')
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({
      titulo: 'Faltas não são abonadas',
      perguntas: ['posso abonar falta?', 'falta com atestado?'],
      categoriaId: 3,
      resposta: 'Faltas não são abonadas.',
      links: ['https://univag.edu.br/estatuto'],
      visivelDe: null,
      visivelAte: null,
    })
  })

  const categorias = [{ id: 3, nome: 'Estágio', ativa: true }]
  const artigo = (id: number, titulo: string, estado: string) => ({
    id, estado, indexacao: null, categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null,
    versao: { id, numero: 1, titulo, perguntas: [], resposta: 'r', links: [] },
  })
  const documento = (estado: string) => ({
    id: 1, titulo: 'Edital', categoriaId: 3, categoria: 'Estágio', estado, indexacao: 'INDEXADO',
    versao: { id: 10, numero: 1, nomeArquivo: 'edital.pdf', paginas: 2, criadaEm: '2026-11-02T12:00:00Z' },
  })
  const servir = (lista: string, itens: unknown[]) => api({ 'GET /api/auth/me': () => [200, admin], [`GET /api/admin/${lista}`]: () => [200, itens], 'GET /api/admin/categorias': () => [200, categorias] })

  // layout-painel C21 (AC 21)
  it('colunas de Artigos e Documentos', async () => {
    servir('artigos', [artigo(1, 'Faltas', 'ATIVO')])
    let montada = abrir('/univag/artigos')
    await screen.findByText('Faltas')
    expect(cabecalhos()).toEqual(['Título', 'Categoria', 'Versão', 'Validade', 'Situação', ''])
    montada.unmount()

    servir('documentos', [documento('ATIVO')])
    montada = abrir('/univag/documentos')
    await screen.findByText('Edital')
    expect(cabecalhos()).toEqual(['Título', 'Categoria', 'Versão', 'Arquivo', 'Situação', ''])
  })

  // layout-painel C24 (AC 24)
  it('lista vazia numa linha', async () => {
    servir('artigos', [])
    let montada = abrir('/univag/artigos')
    await screen.findByText('Nenhum item cadastrado.')
    esperaLinhaVazia('Nenhum item cadastrado.', 6)
    montada.unmount()

    servir('documentos', [])
    montada = abrir('/univag/documentos')
    await screen.findByText('Nenhum item cadastrado.')
    esperaLinhaVazia('Nenhum item cadastrado.', 6)
  })

  // layout-painel C25 (AC 25): por estado do artigo
  it('ações de artigo no menu', async () => {
    servir('artigos', [artigo(1, 'Em rascunho', 'RASCUNHO'), artigo(2, 'No ar', 'ATIVO'), artigo(3, 'Guardado', 'ARQUIVADO')])
    abrir('/univag/artigos')
    await screen.findByText('Em rascunho')
    expect(await acoesDe('Em rascunho')).toEqual(['Editar', 'Ativar', 'Arquivar!'])
    expect(await acoesDe('No ar')).toEqual(['Editar', 'Arquivar!'])
    expect(await acoesDe('Guardado')).toEqual(['Editar', 'Ativar'])
  })
})
