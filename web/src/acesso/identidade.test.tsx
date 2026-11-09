import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao } from '../test/util'

const Apoio = 'Entre com seu CPF e sua senha.'
const Base = ['Atendimento ao estudante', 'Dúvidas, solicitações e respostas da sua instituição em um só lugar.', 'Tire dúvidas com o assistente a qualquer hora', 'Acompanhe suas solicitações até a resposta', 'Fale com a equipe da instituição quando precisar']
const Nome = 'Centro Universitário de Várzea Grande'
const comAparencia = (login: number | null) =>
  instituicao({
    nome: Nome,
    nomeCurto: 'Univag',
    login: { titulo: 'Fale com a Univag', frase: 'Aqui você resolve tudo sobre a sua vida acadêmica.', itens: ['Boletos', 'Matrícula', 'Documentos'] },
    imagens: { logo: 3, icone: 2, login, assistente: null },
  })

describe('textos do login', () => {
  it('textos e logo do login com e sem foto', async () => {
    for (const login of [null, 1]) {
      api({ 'GET /api/instituicoes/univag': () => [200, comAparencia(login)] })
      const { unmount } = abrir('/univag')
      await screen.findByLabelText('CPF')
      for (const texto of ['Fale com a Univag', 'Aqui você resolve tudo sobre a sua vida acadêmica.', 'Boletos', 'Matrícula', 'Documentos']) expect(screen.getAllByText(texto), `${login} ${texto}`).toHaveLength(1)
      const logos = screen.getAllByRole('img', { name: Nome })
      expect(logos, `${login} logo`).toHaveLength(1)
      expect(logos[0]).toHaveAttribute('src', '/api/instituicoes/univag/imagens/logo?v=3')
      expect(screen.getAllByText(Apoio), `${login} apoio`).toHaveLength(1)
      unmount()
    }
    for (const login of [null, 1]) {
      api({ 'GET /api/instituicoes/univag': () => [200, instituicao({ nome: Nome, imagens: { logo: null, icone: null, login, assistente: null } })] })
      const { unmount } = abrir('/univag')
      await screen.findByLabelText('CPF')
      for (const texto of Base) expect(screen.getAllByText(texto), `${login} ${texto}`).toHaveLength(1)
      expect(screen.getByText('CG')).toBeInTheDocument()
      expect(screen.queryByText('One')).not.toBeInTheDocument()
      expect(screen.getAllByText(Apoio), `${login} apoio`).toHaveLength(1)
      unmount()
    }
  })

  it('raiz sem ilustração', () => {
    api({})
    abrir('/')
    expect(screen.getByRole('heading', { name: 'One' })).toBeInTheDocument()
    expect(screen.getByText('Dúvidas, solicitações e respostas da sua instituição em um só lugar.')).toBeInTheDocument()
    expect(screen.getByText('Abra o endereço da sua instituição, por exemplo /univag.')).toBeInTheDocument()
    expect(document.querySelectorAll('svg')).toHaveLength(0)
  })
})
