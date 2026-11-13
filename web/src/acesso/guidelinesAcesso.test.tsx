import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao } from '../test/util'

describe('acesso: erros de campo', () => {
  it('C12 enviar vazio gera cpf-erro e senha-erro distintos', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag')
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(document.getElementById('cpf-erro')).not.toBeNull())
    const cpf = document.getElementById('cpf-erro')!
    const senha = document.getElementById('senha-erro')!
    expect(cpf).toHaveTextContent('Preencha este campo.')
    expect(senha).toHaveTextContent('Preencha este campo.')
    expect(cpf).toHaveAttribute('role', 'alert')
    expect(senha).toHaveAttribute('role', 'alert')
    expect(document.getElementById('-erro')).toBeNull()
    expect(screen.getByLabelText('CPF')).toHaveAttribute('aria-describedby', 'cpf-erro')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-describedby', 'senha-erro')
  })

  it('C12 a dica e o erro entram juntos no aria-describedby', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/definir-senha?token=x')
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar senha' }))
    await waitFor(() => expect(document.getElementById('novaSenha-erro')).not.toBeNull())
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('aria-describedby', 'novaSenha-dica novaSenha-erro')
  })
})
