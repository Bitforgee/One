import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from './test/util'

const admin = me({ papeis: ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'], matriculas: [] })
const sequencia = (n: number) => Array.from({ length: n }, (_, i) => i + 1)
const linhas = () => document.querySelectorAll('[data-slot=table-body] > [data-slot=table-row]').length
const mais = () => screen.queryByRole('button', { name: 'Mostrar mais 50' })

const usuario = (i: number) => ({ id: i, cpf: '123.456.789-09', nome: `Pessoa ${i}`, email: `p${i}@univag.edu.br`, ativo: true, deveTrocarSenha: false, papeis: ['ALUNO'], setores: [] })
const artigo = (i: number) => ({ id: i, estado: 'ATIVO', indexacao: null, categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null, versao: { id: i, numero: 1, titulo: `Artigo ${i}`, perguntas: [], resposta: 'x', links: [] } })
const documento = (i: number) => ({ id: i, titulo: `Documento ${i}`, categoriaId: 3, categoria: 'Estágio', estado: 'ATIVO', indexacao: 'INDEXADO', versao: { id: i, numero: 1, nomeArquivo: `d${i}.pdf`, paginas: 2, criadaEm: '2026-11-02T12:00:00Z' } })
const chamado = (i: number) => ({ numero: `ONE-${i}`, titulo: `chamado ${i}`, categoria: 'Boleto', estado: 'ABERTO', responsavel: null, criadoEm: '2026-11-02T12:00:00Z', dias: 1 })

const telas: [string, string, (n: number) => Record<string, Rota>][] = [
  ['Usuários', '/univag/usuarios', (n) => ({ 'GET /api/admin/usuarios': () => [200, sequencia(n).map(usuario)], 'GET /api/admin/setores': () => [200, []] })],
  ['Chamados', '/univag/fila', (n) => ({ 'GET /api/chamados?escopo=fila': () => [200, sequencia(n).map(chamado)] })],
  ['Artigos', '/univag/artigos', (n) => ({ 'GET /api/admin/artigos': () => [200, sequencia(n).map(artigo)], 'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Estágio', ativa: true }]] })],
  ['Documentos', '/univag/documentos', (n) => ({ 'GET /api/admin/documentos': () => [200, sequencia(n).map(documento)], 'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Estágio', ativa: true }]] })],
]

async function abrirCom(caminho: string, rotas: Record<string, Rota>) {
  api({ 'GET /api/auth/me': () => [200, admin], ...rotas })
  abrir(caminho)
  await waitFor(() => expect(linhas()).toBeGreaterThan(0))
}

describe('listas longas', () => {
  it.each(telas)('C52 %s com 120 itens mostra 50, depois 100, depois 120 e o botão some', async (_, caminho, rotas) => {
    await abrirCom(caminho, rotas(120))
    expect(linhas()).toBe(50)
    expect(mais()).toBeInTheDocument()

    await userEvent.click(mais()!)
    expect(linhas()).toBe(100)
    expect(mais()).toBeInTheDocument()

    await userEvent.click(mais()!)
    expect(linhas()).toBe(120)
    expect(mais()).not.toBeInTheDocument()
  })

  it.each(telas)('C52 %s com exatamente 50 itens não mostra o botão', async (_, caminho, rotas) => {
    await abrirCom(caminho, rotas(50))
    expect(linhas()).toBe(50)
    expect(mais()).not.toBeInTheDocument()
  })

  it.each(telas)('C52 %s com 51 itens mostra o botão e ele leva às 51 linhas', async (_, caminho, rotas) => {
    await abrirCom(caminho, rotas(51))
    expect(linhas()).toBe(50)
    await userEvent.click(mais()!)
    expect(linhas()).toBe(51)
    expect(mais()).not.toBeInTheDocument()
  })
})
