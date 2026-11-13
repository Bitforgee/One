import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const nomes = (raiz: HTMLElement) => within(raiz).getAllByRole('button').map((b) => b.textContent).filter((n) => n !== 'Fechar')

function montar() {
  api({
    'GET /api/auth/me': () => [200, me()],
    'POST /api/conversas': () => [201, { conversaId: 7, resposta: { tipo: 'sem_base', texto: 'Não encontrei.' } }],
  })
  abrir('/univag/assistente')
}

async function conversar() {
  await userEvent.type(await screen.findByLabelText('Mensagem'), 'preciso de ajuda com a nota')
  await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
  await screen.findByText('Não encontrei.')
}

afterEach(cleanup)

describe('rótulos do Assistente', () => {
  it('C64 o diálogo de transferência tem Falar com atendente e Voltar à conversa, sem Confirmar nem Cancelar', async () => {
    montar()
    await conversar()
    await userEvent.click(screen.getByRole('button', { name: 'Falar com atendente' }))
    const dialogo = await screen.findByRole('dialog')
    expect(nomes(dialogo)).toEqual(['Voltar à conversa', 'Falar com atendente'])
    expect(within(dialogo).queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('C64 sem conversa o diálogo de transferência usa os mesmos rótulos', async () => {
    montar()
    await userEvent.type(await screen.findByLabelText('Mensagem'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Falar com atendente' }))
    expect(nomes(await screen.findByRole('dialog'))).toEqual(['Voltar à conversa', 'Falar com atendente'])
  })

  it('C65 o botão de encerrar é Encerrar conversa', async () => {
    montar()
    await conversar()
    expect(screen.getByRole('button', { name: 'Encerrar conversa' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Encerrar' })).not.toBeInTheDocument()
  })
})

describe('rótulos do diálogo de encerrar', () => {
  it('C70 o diálogo de encerrar tem Voltar à conversa e Encerrar conversa, sem Confirmar nem Cancelar', async () => {
    montar()
    await conversar()
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar conversa' }))
    const dialogo = await screen.findByRole('dialog')
    expect(nomes(dialogo)).toEqual(['Voltar à conversa', 'Encerrar conversa'])
    expect(within(dialogo).queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('C70 Voltar à conversa fecha o diálogo sem encerrar', async () => {
    montar()
    await conversar()
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar conversa' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Voltar à conversa' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Encerrar conversa' })).toBeInTheDocument()
  })
})