import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { estados } from '../test/textos'
import { abrir, api, instituicao, me } from '../test/util'

const celular = () =>
  vi.stubGlobal('matchMedia', (media: string) => ({ media, matches: media.startsWith('(max-width: 767px)'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))

const rotas = (papeis: string[]) => ({
  'GET /api/auth/me': () => [200, me({ papeis })] as [number, unknown],
  'GET /api/instituicoes/univag': () => [200, instituicao()] as [number, unknown],
})

const Conhecimento: [string, string[]] = ['Conhecimento', ['Artigos', 'Documentos']]
const Administracao: [string, string[]] = ['Administração', ['Usuários', 'Matrículas', 'Cadastros', 'Aparência', 'Integrações']]

const Esperado: [string[], [string, string[]][]][] = [
  [['ADMINISTRADOR'], [Conhecimento, Administracao]],
  [['OPERADOR'], [['Plataforma', ['Instituições']]]],
  [['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'], [['Atendimento', ['Indicadores']], Conhecimento, Administracao]],
]

const conteudo = () => document.querySelector('[class*="container/main"]') as HTMLElement
const sequencia = (principal: HTMLElement) => [...principal.querySelectorAll('h2, a')].map((e) => e.textContent)

describe('Gerir', () => {
  it.each(Esperado)('Gerir lista o que ficou fora da barra (%j)', async (papeis, grupos) => {
    celular()
    api(rotas(papeis))
    abrir('/univag/gerir')
    await screen.findByRole('main')
    const principal = conteudo()
    await within(principal).findAllByRole('link')
    expect(sequencia(principal)).toEqual(grupos.flatMap(([nome, itens]) => [nome, ...itens]))
    const caminhos = { Artigos: 'artigos', Documentos: 'documentos', 'Usuários': 'usuarios', 'Matrículas': 'matriculas', Cadastros: 'cadastros', 'Aparência': 'aparencia', 'Integrações': 'integracoes', 'Instituições': 'instituicoes', Indicadores: 'indicadores' } as Record<string, string>
    for (const link of within(principal).getAllByRole('link')) expect(link).toHaveAttribute('href', `/univag/${caminhos[link.textContent!]}`)
    const tela = estados(grupos.flatMap(([nome, itens]) => [nome, ...itens]))
    tela.conferir(principal)
    tela.todos()
  })

  it.each([
    [['ALUNO'], 'Assistente'],
    [['ATENDENTE'], 'Fila'],
  ])('Gerir sem destino volta à tela inicial (%j)', async (papeis, titulo) => {
    celular()
    api(rotas(papeis))
    abrir('/univag/gerir')
    await waitFor(() => expect(document.querySelector('header h1')).toHaveTextContent(titulo))
  })
})
