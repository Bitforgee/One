import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me, type Rota } from '../test/util'

const Convite = 'Quer explicar melhor ou falar com um atendente?'
const resposta = (texto = 'O boleto fica no portal.'): Rota => () => [201, { conversaId: 7, resposta: { tipo: 'resposta', texto } }]
const Contato = { horario: 'Seg a sex, 8h às 18h', telefone: '(65) 3688-6000', email: null }

function assistente(rotas: Record<string, Rota> = {}, contato: object = { horario: null, telefone: null, email: null }) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/instituicoes/univag': () => [200, instituicao({ contato })], ...rotas })
  abrir('/univag/assistente')
  return chamadas
}

async function enviar(texto = 'preciso do boleto') {
  await userEvent.type(await screen.findByLabelText('Mensagem'), texto)
  await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
}

const balaoDoAssistente = () => [...document.querySelectorAll('.is-assistant')]

describe('assistente revisado', () => {
  it('Isso resolveu logo abaixo da última resposta', async () => {
    assistente({ 'POST /api/conversas': resposta('Primeira resposta.'), 'POST /api/conversas/7/mensagens': () => [200, { resposta: { tipo: 'resposta', texto: 'Segunda resposta.' } }] })
    await enviar()
    await screen.findByText('Primeira resposta.')
    await screen.findByText('Isso resolveu?')
    await enviar('e a segunda via?')
    await screen.findByText('Segunda resposta.')
    await waitFor(() => expect(screen.getAllByText('Isso resolveu?')).toHaveLength(1))

    const baloes = balaoDoAssistente()
    expect(baloes).toHaveLength(2)
    const grupo = baloes[1].nextElementSibling as HTMLElement
    expect(grupo).toHaveTextContent('Isso resolveu?')
    expect(screen.getByRole('log')).toContainElement(grupo)
    expect(screen.getByText('Isso resolveu?').parentElement).toBe(grupo)
    expect(within(grupo).getByRole('button', { name: 'Sim' })).toHaveAttribute('data-variant', 'outline')
    expect(within(grupo).getByRole('button', { name: 'Não' })).toHaveAttribute('data-variant', 'outline')
  })

  it('transferência mostra para onde foi e tira o convite', async () => {
    for (const contato of [Contato, { horario: null, telefone: null, email: null }]) {
      assistente(
        {
          'POST /api/conversas': resposta(),
          'POST /api/conversas/7/avaliacao': () => [200, { desfecho: null }],
          'POST /api/conversas/7/transferir': () => [201, { numero: 'ONE-5', estado: 'ABERTO', setor: 'Financeiro' }],
          'GET /api/chamados/ONE-5': () => [404, { status: 404, detail: 'x' }],
        },
        contato,
      )
      await enviar()
      await userEvent.click(await screen.findByRole('button', { name: 'Não' }))
      expect(await screen.findAllByText(Convite)).toHaveLength(1)
      await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Falar com atendente' }))

      const titulo = await screen.findByText('Sua solicitação ONE-5 foi para Financeiro')
      expect(screen.queryAllByText(Convite)).toHaveLength(0)
      expect(screen.queryByText(/Transferido para/)).not.toBeInTheDocument()
      expect(screen.getByText('A resposta chega em Solicitações e no seu e-mail.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ver solicitação' })).toHaveAttribute('href', '/univag/chamados/ONE-5')
      const bloco = titulo.closest('section') as HTMLElement
      if (contato === Contato) expect(within(bloco).getByRole('heading', { name: 'Contato do atendimento' })).toBeInTheDocument()
      else expect(screen.queryByRole('heading', { name: 'Contato do atendimento' })).not.toBeInTheDocument()
      cleanup()
    }
  })

  it('Falar com atendente outline fora do destaque', async () => {
    assistente({ 'POST /api/conversas': resposta(), 'POST /api/conversas/7/avaliacao': () => [200, { desfecho: null }] })
    const botao = await screen.findByRole('button', { name: /Falar com atendente/ })
    expect(botao).toHaveAttribute('data-variant', 'outline')
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Não' }))
    expect(screen.getByRole('button', { name: /Falar com atendente/ })).toHaveAttribute('data-variant', 'default')
  })

  it('ajuda dos anexos só com arquivo ou clipe focado', async () => {
    assistente()
    const clipe = await screen.findByRole('button', { name: 'Anexar arquivo' })
    const ajuda = () => screen.queryAllByText('PDF ou foto, até 10 MB')
    expect(ajuda()).toHaveLength(0)
    expect(screen.queryByText(/Fotos e PDFs de até 10 MB/)).not.toBeInTheDocument()

    act(() => clipe.focus())
    expect(ajuda()).toHaveLength(1)
    act(() => clipe.blur())
    expect(ajuda()).toHaveLength(0)

    await userEvent.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['x'], 'foto.png', { type: 'image/png' }))
    expect(ajuda()).toHaveLength(1)
  })

  describe('erro de envio no lugar da resposta com Reenviar', () => {
    const falha: Rota = () => [500, { status: 500, detail: 'Falha simulada' }]
    const comFalha = (certa: Rota): Rota => {
      let n = 0
      return (corpo) => (n++ === 0 ? falha(corpo) : certa(corpo))
    }
    const aposErro = async () => {
      const alerta = await screen.findByRole('alert')
      expect(alerta).toHaveTextContent('Falha simulada')
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(screen.getByRole('log')).toContainElement(alerta)
      expect(alerta.parentElement!.lastElementChild).toBe(alerta)
      return alerta
    }

    it('primeira mensagem', async () => {
      const chamadas = assistente({ 'POST /api/conversas': comFalha(resposta()) })
      await enviar()
      const alerta = await aposErro()
      expect(alerta.previousElementSibling).toHaveClass('is-user')
      await userEvent.click(within(alerta).getByRole('button', { name: 'Reenviar' }))
      await screen.findByText('O boleto fica no portal.')
      const envios = chamadas.filter((c) => c.metodo === 'POST' && c.url === '/api/conversas')
      expect(envios).toHaveLength(2)
      expect(envios[1].corpo).toEqual(envios[0].corpo)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(document.querySelectorAll('.is-user')).toHaveLength(1)
    })

    it('segunda mensagem', async () => {
      const chamadas = assistente({ 'POST /api/conversas': resposta(), 'POST /api/conversas/7/mensagens': comFalha(() => [200, { resposta: { tipo: 'resposta', texto: 'Segunda resposta.' } }]) })
      await enviar()
      await screen.findByText('O boleto fica no portal.')
      await enviar('e a segunda via?')
      const alerta = await aposErro()
      expect(alerta.previousElementSibling).toHaveClass('is-user')
      await userEvent.click(within(alerta).getByRole('button', { name: 'Reenviar' }))
      await screen.findByText('Segunda resposta.')
      const envios = chamadas.filter((c) => c.url === '/api/conversas/7/mensagens')
      expect(envios).toHaveLength(2)
      expect(envios[1].corpo).toEqual(envios[0].corpo)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(document.querySelectorAll('.is-user')).toHaveLength(2)
    })

    it('mensagem com 1 anexo', async () => {
      const chamadas = assistente({ 'POST /api/conversas': comFalha(resposta()), 'GET /api/conversas/7': () => [200, { mensagens: [] }] })
      await userEvent.upload(await screen.findByLabelText('Mensagem').then(() => document.querySelector<HTMLInputElement>('input[type="file"]')!), new File(['x'], 'foto.png', { type: 'image/png' }))
      await enviar()
      const alerta = await aposErro()
      await userEvent.click(within(alerta).getByRole('button', { name: 'Reenviar' }))
      await screen.findByText('O boleto fica no portal.')
      const envios = chamadas.filter((c) => c.metodo === 'POST' && c.url === '/api/conversas')
      expect(envios).toHaveLength(2)
      expect(envios[0].corpo.mensagem).toBe('preciso do boleto')
      expect(envios[1].corpo.mensagem).toBe(envios[0].corpo.mensagem)
      expect((envios[0].corpo.anexos as File).name).toBe('foto.png')
      expect((envios[1].corpo.anexos as File).name).toBe('foto.png')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(document.querySelectorAll('.is-user')).toHaveLength(1)
    })
  })
})
