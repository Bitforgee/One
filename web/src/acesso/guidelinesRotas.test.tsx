import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me } from '../test/util'

const marca = instituicao({ nome: 'Centro Universitário', nomeCurto: 'Univag' })
const aluno = me({ papeis: ['ALUNO'] })
const conteudo = () => document.getElementById('conteudo')

describe('rotas', () => {
  it('C42 uma rota inexistente sob o slug mostra a página não encontrada com volta ao início', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, marca], 'GET /api/auth/me': () => [401, { status: 401, title: 'Não autorizado' }] })
    abrir('/univag/inexistente')
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/univag')
  })

  it('C42 o mesmo vale para um caminho mais fundo e para quem está autenticado', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, marca], 'GET /api/auth/me': () => [200, aluno] })
    abrir('/univag/chamados/ONE-1/anexos/9')
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/univag')
  })

  it('C42 a página não encontrada não aparece nas rotas que existem', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, marca], 'GET /api/auth/me': () => [200, aluno] })
    abrir('/univag/conta')
    expect(await screen.findByRole('heading', { level: 1, name: 'Conta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Página não encontrada' })).not.toBeInTheDocument()
  })

  it('C43 trocar de rota atualiza o título para Rota · Instituição e foca o conteúdo', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, marca], 'GET /api/auth/me': () => [200, aluno] })
    abrir('/univag/conta')
    await waitFor(() => expect(document.title).toBe('Conta · Univag'))
    await userEvent.click(await screen.findByRole('link', { name: 'Minhas solicitações' }))
    await waitFor(() => expect(document.title).toBe('Minhas solicitações · Univag'))
    await waitFor(() => expect(document.activeElement).toBe(conteudo()))
    expect(conteudo()).not.toBeNull()

    await userEvent.click(screen.getByRole('link', { name: 'Assistente' }))
    await waitFor(() => expect(document.title).toBe('Assistente · Univag'))
    await waitFor(() => expect(document.activeElement).toBe(conteudo()))
  })

  it('C43 o título da rota sobrevive à troca de tema', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, marca], 'GET /api/auth/me': () => [200, aluno] })
    abrir('/univag/conta')
    await waitFor(() => expect(document.title).toBe('Conta · Univag'))
    await userEvent.click(screen.getAllByRole('button', { name: /^Tema/ })[0])
    await userEvent.click(await screen.findByRole('button', { name: 'Escuro' }))
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    expect(document.title).toBe('Conta · Univag')
  })

  it('C43 o título do chamado é o protocolo', async () => {
    api({
      'GET /api/instituicoes/univag': () => [200, marca],
      'GET /api/auth/me': () => [200, aluno],
      'GET /api/chamados/ONE-1': () => [404, { status: 404, title: 'Não encontrado' }],
    })
    abrir('/univag/chamados/ONE-1')
    await waitFor(() => expect(document.title).toBe('ONE-1 · Univag'))
  })

  it('C43 a primeira entrada na tela não rouba o foco', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, marca], 'GET /api/auth/me': () => [200, aluno] })
    abrir('/univag/conta')
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(document.activeElement).not.toBe(conteudo())
  })
})
