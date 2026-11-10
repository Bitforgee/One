import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me, type Rota } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const Urls = {
  urlLogin: 'https://one.teste/api/moodle/univag/login',
  urlLancamento: 'https://one.teste/api/moodle/univag/lancamento',
  urlJwks: 'https://one.teste/api/moodle/univag/jwks',
}
const vazia = { configurada: false, ativa: false, emissor: '', clientId: '', deploymentId: '', authUrl: '', jwksUrl: '', ...Urls }

const rotas = (get: Rota, extra: Record<string, Rota> = {}) =>
  api({
    'GET /api/auth/me': () => [200, admin],
    'GET /api/instituicoes/univag': () => [200, instituicao()],
    'GET /api/admin/moodle': get,
    ...extra,
  })

describe('tela Moodle', () => {
  it('estados da tela', async () => {
    rotas(() => new Promise(() => {}))
    let montada = abrir('/univag/moodle')
    await screen.findByRole('heading', { name: 'Moodle', level: 1 })
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    montada.unmount()

    let tentativas = 0
    rotas(() => (++tentativas === 1 ? [500, { title: 'Erro interno', status: 500, detail: 'falhou' }] : [200, vazia]))
    montada = abrir('/univag/moodle')
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await screen.findByLabelText('Emissor (iss)')
    montada.unmount()

    rotas(() => [200, vazia])
    abrir('/univag/moodle')
    for (const rotulo of ['Emissor (iss)', 'Client ID', 'Deployment ID', 'URL de autenticação', 'URL das chaves (JWKS)'])
      expect(await screen.findByLabelText(rotulo)).toHaveValue('')
    for (const url of Object.values(Urls)) expect(screen.getByText(url)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Copiar/ })).toHaveLength(3)
  })

  it('salva e mostra o erro do campo', async () => {
    let corpo: any
    let falhar = true
    const chamadas = rotas(() => [200, vazia], {
      'PUT /api/admin/moodle': (c) => {
        corpo = c
        if (falhar) return [400, { title: 'Requisição inválida', status: 400, detail: 'A URL de autenticação deve começar com https://.', errors: { authUrl: ['A URL de autenticação deve começar com https://.'] } }]
        return [200, { ...vazia, ...c, configurada: true }]
      },
    })
    abrir('/univag/moodle')
    const valores = {
      'Emissor (iss)': 'https://ava.teste',
      'Client ID': 'cliente-1',
      'Deployment ID': '7',
      'URL de autenticação': 'http://ava.teste/mod/lti/auth.php',
      'URL das chaves (JWKS)': 'https://ava.teste/mod/lti/certs.php',
    }
    for (const [rotulo, valor] of Object.entries(valores)) await userEvent.type(await screen.findByLabelText(rotulo), valor)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    const campo = screen.getByLabelText('URL de autenticação')
    await waitFor(() => expect(campo).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('A URL de autenticação deve começar com https://.')).toBeInTheDocument()
    expect(corpo).toEqual({ ativa: true, emissor: 'https://ava.teste', clientId: 'cliente-1', deploymentId: '7', authUrl: 'http://ava.teste/mod/lti/auth.php', jwksUrl: 'https://ava.teste/mod/lti/certs.php' })
    expect(Object.keys(corpo)).toHaveLength(6)

    falhar = false
    await userEvent.clear(campo)
    await userEvent.type(campo, 'https://ava.teste/mod/lti/auth.php')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Moodle salvo.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo === 'PUT')).toHaveLength(2)
  })

  it('item no menu', async () => {
    for (const papel of ['ADMINISTRADOR', 'ATENDENTE', 'ALUNO', 'OPERADOR']) {
      api({ 'GET /api/auth/me': () => [200, me({ papeis: [papel] })], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
      const { unmount } = abrir('/univag/trocar-senha')
      await screen.findByRole('button', { name: 'Alternar barra lateral' })
      const nav = within(await screen.findByRole('navigation'))
      if (papel === 'ADMINISTRADOR') {
        const grupo = within(nav.getByRole('group', { name: 'Administração' }))
        expect(grupo.getAllByRole('link').map((l) => l.textContent)).toEqual(['Usuários', 'Matrículas', 'Cadastros', 'Aparência', 'Moodle'])
        expect(grupo.getByRole('link', { name: 'Moodle' })).toHaveAttribute('href', '/univag/moodle')
      } else expect(nav.queryByRole('link', { name: 'Moodle' }), papel).not.toBeInTheDocument()
      unmount()
    }

    const chamadas = api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'] })], 'GET /api/instituicoes/univag': () => [200, instituicao()] })
    abrir('/univag/moodle')
    expect(await screen.findByRole('heading', { name: 'Fila', level: 1 })).toBeInTheDocument()
    expect(chamadas.some((c) => c.url === '/api/admin/moodle')).toBe(false)
  })
})
