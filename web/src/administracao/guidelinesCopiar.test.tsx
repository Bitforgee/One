import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { abrir, api, instituicao, me } from '../test/util'

const moodle = { configurada: false, ativa: false, emissor: '', clientId: '', deploymentId: '', authUrl: '', jwksUrl: '', urlLogin: 'https://one.teste/login', urlLancamento: 'https://one.teste/lancamento', urlJwks: 'https://one.teste/jwks' }
const mcp = { url: 'https://one.teste/api/mcp/univag', tokens: [] }

const telas: [string, boolean, string][] = [
  ['Moodle', false, 'URL de login'],
  ['Mcp', true, 'URL do servidor'],
]

function abrirTela(mcpAberto: boolean) {
  api({
    'GET /api/auth/me': () => [200, me({ papeis: ['ADMINISTRADOR'], matriculas: [] })],
    'GET /api/instituicoes/univag': () => [200, instituicao()],
    'GET /api/admin/moodle': () => [200, moodle],
    'GET /api/admin/mcp': () => [200, mcp],
  })
  if (mcpAberto) abrir('/univag/integracoes?aba=mcp')
  else abrir('/univag/integracoes')
}

describe('botão de copiar anunciado', () => {
  it.each(telas)('C30 %s: o rótulo do botão está numa região aria-live polite e muda para Copiado', async (_, mcpAberto, rotulo) => {
    const usuario = userEvent.setup()
    abrirTela(mcpAberto)
    const botao = await screen.findByRole('button', { name: `Copiar ${rotulo}` })
    const regiao = botao.querySelector('[aria-live="polite"]')
    expect(regiao).toHaveTextContent('Copiar')

    await usuario.click(botao)
    const copiado = await screen.findByRole('button', { name: `${rotulo} copiado` })
    expect(copiado.querySelector('[aria-live="polite"]')).toBe(regiao)
    expect(regiao).toHaveTextContent('Copiado')
  })
})

describe('cópia que falha', () => {
  it.each(telas)('C32 %s: clipboard recusando mostra o aviso e o botão continua Copiar', async (_, mcpAberto, rotulo) => {
    const usuario = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('negado', 'NotAllowedError'))
    abrirTela(mcpAberto)
    const botao = await screen.findByRole('button', { name: `Copiar ${rotulo}` })
    await usuario.click(botao)
    expect(await screen.findByText('Não foi possível copiar. Selecione o texto e copie à mão.')).toBeInTheDocument()
    expect(botao).toHaveAccessibleName(`Copiar ${rotulo}`)
    expect(screen.queryByRole('button', { name: `${rotulo} copiado` })).not.toBeInTheDocument()
  })

  it('C32 sem navigator.clipboard o aviso aparece em vez de um erro mudo', async () => {
    const usuario = userEvent.setup()
    abrirTela(false)
    const botao = await screen.findByRole('button', { name: 'Copiar URL de login' })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    await usuario.click(botao)
    expect(await screen.findByText('Não foi possível copiar. Selecione o texto e copie à mão.')).toBeInTheDocument()
  })
})
