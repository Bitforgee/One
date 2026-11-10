import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao } from '../test/util'

const Motivos = [
  ['sem-cadastro', 'Não encontramos seu cadastro no One. Fale com a secretaria.'],
  ['inativo', 'Seu acesso ao One está desativado. Fale com a secretaria.'],
  ['use-senha', 'Equipe entra com CPF e senha.'],
] as const

async function login(caminho: string) {
  api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
  abrir(caminho)
  return screen.findByRole('button', { name: 'Entrar' })
}

function semAlerta() {
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  for (const [, texto] of Motivos) expect(screen.queryByText(texto)).not.toBeInTheDocument()
}

describe('volta do Moodle no Login', () => {
  it.each(Motivos)('%s', async (motivo, texto) => {
    const entrar = await login(`/univag?moodle=${motivo}`)
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent(texto)
    expect(alerta.compareDocumentPosition(entrar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(alerta.compareDocumentPosition(screen.getByLabelText('CPF')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sem alerta para valor desconhecido', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag?moodle=qualquer-coisa')
    await screen.findByRole('button', { name: 'Entrar' })
    semAlerta()
  })

  it('sem alerta sem o parâmetro', async () => {
    api({ 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag')
    await screen.findByRole('button', { name: 'Entrar' })
    semAlerta()
  })
})
