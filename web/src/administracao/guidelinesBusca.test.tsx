import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const vazia = () => [200, []] as [number, unknown]

describe('placeholders de busca', () => {
  it('C5 a busca de Cadastros declara Buscar pelo nome…', async () => {
    api({
      'GET /api/auth/me': () => [200, admin],
      ...Object.fromEntries(['setores', 'categorias', 'cursos', 'fluxos', 'regras', 'respostas-prontas'].map((k) => [`GET /api/admin/${k}`, vazia])),
    })
    abrir('/univag/cadastros')
    expect(await screen.findByRole('searchbox')).toHaveAttribute('placeholder', 'Buscar pelo nome…')
  })

  it('C6 a busca de Usuários declara Buscar por nome, CPF ou e-mail…', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': vazia, 'GET /api/admin/setores': vazia })
    abrir('/univag/usuarios')
    expect(await screen.findByRole('searchbox')).toHaveAttribute('placeholder', 'Buscar por nome, CPF ou e-mail…')
  })
})
