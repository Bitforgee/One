import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { abrir, api, escolher, me, type Rota } from './test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const ok = (corpo: unknown): Rota => () => [200, corpo]

const usuario = { id: 7, cpf: '12345678909', nome: 'Ana Souza', email: 'u7@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ALUNO'], setores: [] }
const artigo = (id: number, titulo: string, estado: string) => ({ id, estado, indexacao: null, categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null, versao: { id, numero: 1, titulo, perguntas: [], resposta: 'x', links: [] } })
const documento = { id: 6, titulo: 'Calendário', categoriaId: 3, categoria: 'Estágio', estado: 'ATIVO', indexacao: 'INDEXADO', versao: { id: 6, numero: 1, nomeArquivo: 'd6.pdf', paginas: 2, criadaEm: '2026-11-02T12:00:00Z' } }
const categorias = ok([{ id: 3, nome: 'Estágio', ativa: true }])
const vazias = Object.fromEntries(['categorias', 'cursos', 'fluxos', 'respostas-prontas'].map((k) => [`GET /api/admin/${k}`, ok([])]))

const telas = {
  usuarios: { 'GET /api/admin/usuarios': ok([usuario]), 'GET /api/admin/setores': ok([]) },
  artigos: { 'GET /api/admin/artigos': ok([artigo(4, 'Faltas', 'ATIVO'), artigo(5, 'Bolsas', 'RASCUNHO')]), 'GET /api/admin/categorias': categorias },
  documentos: { 'GET /api/admin/documentos': ok([documento]), 'GET /api/admin/categorias': categorias },
  cadastros: { ...vazias, 'GET /api/admin/setores': ok([{ id: 9, nome: 'Financeiro', triagem: false, ativo: true }]) },
}

function abrirTela(tela: keyof typeof telas, caminho: string) {
  api({ 'GET /api/auth/me': ok(admin), ...telas[tela] })
  abrir(caminho)
}

const botoes = (raiz: HTMLElement) => within(raiz).queryAllByRole('button').map((b) => b.textContent).filter((n) => n !== 'Fechar')
const dialogo = () => screen.findByRole('dialog')

afterEach(cleanup)

describe('botões de criar e de envio', () => {
  it.each([
    ['usuarios', '/univag/usuarios', 'Novo usuário', 'Salvar usuário'],
    ['artigos', '/univag/artigos', 'Novo artigo', 'Salvar artigo'],
    ['documentos', '/univag/documentos', 'Novo documento', 'Enviar documento'],
    ['cadastros', '/univag/cadastros', 'Novo setor', 'Salvar setor'],
    ['cadastros', '/univag/cadastros?aba=categorias', 'Nova categoria', 'Salvar categoria'],
  ] as const)('C62 C63 %s %s abre o Editor com %s', async (tela, caminho, criar, enviar) => {
    abrirTela(tela, caminho)
    await userEvent.click(await screen.findByRole('button', { name: criar }))
    const editor = await dialogo()
    expect(within(editor).getByRole('button', { name: enviar })).toBeInTheDocument()
    expect(botoes(editor)).not.toContain('Salvar')
    expect(botoes(editor)).not.toContain('Enviar')
    expect(screen.queryByRole('button', { name: 'Novo' })).not.toBeInTheDocument()
  })

  it('C62 a tela de documentos não repete o botão de criar quando a lista está vazia', async () => {
    api({ 'GET /api/auth/me': ok(admin), 'GET /api/admin/documentos': ok([]), 'GET /api/admin/categorias': categorias })
    abrir('/univag/documentos')
    expect(await screen.findByRole('button', { name: 'Novo documento' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Novo documento' })).toHaveLength(1)
  })

  it('C63 o envio de Acesso é Salvar nova senha', async () => {
    api({ 'GET /api/auth/me': () => [200, me({ deveTrocarSenha: true })] })
    abrir('/univag/trocar-senha')
    expect(await screen.findByRole('button', { name: 'Salvar nova senha' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
  })
})

describe('recusa dos Confirmar', () => {
  it('C66 ação não destrutiva recusa com Cancelar', async () => {
    abrirTela('artigos', '/univag/artigos')
    await screen.findByText('Bolsas')
    await escolher('Bolsas', 'Ativar')
    expect(botoes(await dialogo())).toEqual(['Cancelar', 'Ativar artigo'])
  })

  it('C66 ação destrutiva recusa com Voltar', async () => {
    abrirTela('artigos', '/univag/artigos')
    await screen.findByText('Faltas')
    await escolher('Faltas', 'Arquivar')
    expect(botoes(await dialogo())).toEqual(['Voltar', 'Arquivar'])
  })

  it('C66 o Editor sujo recusa o descarte com Continuar editando', async () => {
    abrirTela('usuarios', '/univag/usuarios')
    await userEvent.click(await screen.findByRole('button', { name: 'Novo usuário' }))
    await userEvent.type(await screen.findByLabelText('Nome'), 'Carla')
    await userEvent.keyboard('{Escape}')
    const confirmacao = await screen.findByRole('dialog', { name: 'Descartar alterações?' })
    expect(botoes(confirmacao)).toEqual(['Continuar editando', 'Descartar'])
  })
})
