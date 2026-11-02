import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estados } from '../test/textos'
import { abrir, api, me } from '../test/util'

// Linha 0 de ## Screens (cabeçalho); "Tema", "Claro", "Escuro" e "Sistema" só entram com a S9.
const Cabecalho = ['One', 'Assistente', 'Minhas solicitações', 'Fila', 'Artigos', 'Documentos', 'Indicadores', 'Usuários', 'Matrículas', 'Cadastros', 'Sair', 'Menu']
const Instituicao = 'Univag' // nome da instituição do fixture

describe('textos', () => {
  it('textos cabeçalho', async () => {
    const tela = estados(Cabecalho)

    // carregando: só o status "Carregando", sem texto visível
    api({ 'GET /api/auth/me': () => new Promise(() => {}) })
    const carregando = abrir('/univag/trocar-senha')
    expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    tela.conferir(carregando.container)
    carregando.unmount()

    for (const papel of ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR']) {
      api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })] })
      const { unmount } = abrir('/univag/trocar-senha')
      const nav = await screen.findByRole('navigation')
      expect(within(nav).getByRole('button', { name: 'Menu' })).toBeInTheDocument()
      tela.conferir(nav, [Instituicao])
      unmount()
    }

    // gaveta aberta, com os links dos 3 papéis
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'] })] })
    abrir('/univag/trocar-senha')
    await userEvent.click(await screen.findByRole('button', { name: 'Menu' }))
    tela.conferir(await screen.findByRole('dialog', { name: 'Menu' }))

    tela.todos()
  })
})
