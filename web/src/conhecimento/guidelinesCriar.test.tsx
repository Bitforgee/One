import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const categorias: Rota = () => [200, [{ id: 3, nome: 'Estágio', ativa: true }]]
const falha: Rota = () => [500, { title: 'Erro interno', status: 500, detail: 'A listagem falhou.' }]
const documento = { id: 5, titulo: 'Calendário', categoriaId: 3, categoria: 'Estágio', estado: 'ATIVO', indexacao: 'INDEXADO', versao: { id: 50, numero: 1, nomeArquivo: 'calendario.pdf', paginas: 2, criadaEm: '2026-11-02T12:00:00Z' } }

const Telas = [
  { tela: 'Artigos', lista: 'artigos', caminho: '/univag/artigos', botao: 'Novo artigo', titulo: 'Novo artigo' },
  { tela: 'Documentos', lista: 'documentos', caminho: '/univag/documentos', botao: 'Novo documento', titulo: 'Novo documento' },
] as const

function servir(lista: string, rota: Rota) {
  api({ 'GET /api/auth/me': () => [200, admin], [`GET /api/admin/${lista}`]: rota, 'GET /api/admin/categorias': categorias })
}

const principal = () => screen.getByRole('main')

describe.each(Telas)('criar em $tela', ({ lista, caminho, botao, titulo }) => {
  it('C1 carregando mantém o botão de criar no cabeçalho', async () => {
    servir(lista, () => new Promise(() => {}))
    abrir(caminho)
    await screen.findByRole('main')
    expect(await screen.findByRole('status')).toHaveTextContent('Carregando…')
    expect(within(principal()).getAllByRole('button', { name: botao })).toHaveLength(1)
  })

  it('C2 erro de listagem mostra Tentar de novo e mantém o botão de criar', async () => {
    servir(lista, falha)
    abrir(caminho)
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(within(principal()).getAllByRole('button', { name: botao })).toHaveLength(1)
  })

  it('C3 lista carregada e vazia tem um só botão de criar, o do estado vazio', async () => {
    servir(lista, () => [200, []])
    abrir(caminho)
    const celula = (await screen.findByRole('cell')).closest('[data-slot=table-cell]') as HTMLElement
    const botoes = within(principal()).getAllByRole('button', { name: botao })
    expect(botoes).toHaveLength(1)
    expect(celula.contains(botoes[0])).toBe(true)
  })

  it('C3 lista com itens mostra o botão no cabeçalho e não mostra o estado vazio', async () => {
    servir(lista, () => [200, lista === 'documentos' ? [documento] : [{ id: 4, estado: 'ATIVO', indexacao: 'INDEXADO', categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null, versao: { id: 40, numero: 1, titulo: 'Faltas', perguntas: [], resposta: 'x', links: [] } }]])
    abrir(caminho)
    await screen.findByText(lista === 'documentos' ? 'Calendário' : 'Faltas')
    const botoes = within(principal()).getAllByRole('button', { name: botao })
    expect(botoes).toHaveLength(1)
    expect(botoes[0].closest('[data-slot=table-cell]')).toBeNull()
  })

  it(`C4 tocar ${botao} abre o diálogo de título ${titulo}`, async () => {
    servir(lista, () => [200, []])
    abrir(caminho)
    await screen.findByRole('cell')
    await userEvent.click(await screen.findByRole('button', { name: botao }))
    expect(await screen.findByRole('dialog', { name: titulo })).toBeInTheDocument()
    cleanup()
  })
})

describe('título do diálogo de documento', () => {
  it('C4 Nova versão de um documento existente mantém o título Nova versão', async () => {
    servir('documentos', () => [200, [documento]])
    abrir('/univag/documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Ações de Calendário' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Nova versão' }))
    expect(await screen.findByRole('dialog', { name: 'Nova versão' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Novo documento' })).not.toBeInTheDocument()
  })
})
