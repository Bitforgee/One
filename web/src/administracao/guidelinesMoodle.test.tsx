import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me } from '../test/util'
import { FormularioMoodle, type Plataforma } from './Moodle'

const base: Plataforma = {
  configurada: true,
  ativa: true,
  emissor: 'https://ava.teste',
  clientId: 'cliente-1',
  deploymentId: '7',
  authUrl: 'https://ava.teste/auth',
  jwksUrl: 'https://ava.teste/certs',
  urlLogin: 'https://one.teste/login',
  urlLancamento: 'https://one.teste/lancamento',
  urlJwks: 'https://one.teste/jwks',
}

const tela = (dados: Plataforma) => (
  <QueryClientProvider client={new QueryClient()}>
    <FormularioMoodle dados={dados} />
  </QueryClientProvider>
)

describe('Moodle rebuscado com o formulário aberto', () => {
  it('C47 na tela Integrações o valor digitado fica no campo', async () => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ADMINISTRADOR'], matriculas: [] })], 'GET /api/instituicoes/univag': () => [200, instituicao()], 'GET /api/admin/moodle': () => [200, base] })
    abrir('/univag/integracoes')
    const cliente = await screen.findByLabelText('Client ID')
    await userEvent.type(cliente, '-meu')
    expect(cliente).toHaveValue('cliente-1-meu')
  })

  it('C47 o que a pessoa digitou fica quando dados é rebuscado', async () => {
    const { rerender } = render(tela(base))
    const cliente = screen.getByLabelText('Client ID')
    await userEvent.type(cliente, '-meu')
    expect(cliente).toHaveValue('cliente-1-meu')

    rerender(tela({ ...base, clientId: 'cliente-2', deploymentId: '9' }))
    expect(screen.getByLabelText('Client ID')).toHaveValue('cliente-1-meu')
  })

  it('C47 sem edição, o campo recebe o valor novo', () => {
    const { rerender } = render(tela(base))
    rerender(tela({ ...base, clientId: 'cliente-2', emissor: 'https://novo.teste' }))
    expect(screen.getByLabelText('Client ID')).toHaveValue('cliente-2')
    expect(screen.getByLabelText('Emissor (iss)')).toHaveValue('https://novo.teste')
  })

  it('C47 editar um campo não impede os outros de receberem o valor novo', async () => {
    const { rerender } = render(tela(base))
    await userEvent.type(screen.getByLabelText('Client ID'), 'x')
    rerender(tela({ ...base, deploymentId: '9' }))
    expect(screen.getByLabelText('Deployment ID')).toHaveValue('9')
    expect(screen.getByLabelText('Client ID')).toHaveValue('cliente-1x')
  })

  it('C47 a caixa de permitir a entrada também é preservada', async () => {
    const { rerender } = render(tela(base))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Permitir a entrada pelo Moodle' }))
    rerender(tela({ ...base, clientId: 'cliente-2' }))
    expect(screen.getByRole('checkbox', { name: 'Permitir a entrada pelo Moodle' })).not.toBeChecked()
  })
})
