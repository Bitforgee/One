import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, chamado, me, type Rota } from '../test/util'

const Exemplo = /Pergunte, por exemplo/

function responde(tipo: string, texto: string): Rota {
  return () => [201, { conversaId: 7, resposta: { tipo, texto } }]
}

function assistente(rotas: Record<string, Rota> = {}, quem = me()) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, quem], ...rotas })
  abrir('/univag/assistente')
  return chamadas
}

async function enviar(texto = 'preciso do boleto') {
  await userEvent.type(await screen.findByLabelText('Mensagem'), texto)
  await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
}

const dialogo = async () => within(await screen.findByRole('dialog'))
const confirmar = () => screen.getByRole('button', { name: 'Confirmar' })

describe('conversa com o assistente', () => {
  it('sem conversa: exemplo, sem Encerrar, e a mensagem do aluno à direita', async () => {
    assistente({ 'POST /api/conversas': responde('pergunta', 'É do semestre atual?') })
    expect(await screen.findByText(Exemplo)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Encerrar' })).not.toBeInTheDocument()
    await enviar()
    expect(await screen.findByText('É do semestre atual?')).toBeInTheDocument()
    expect(screen.queryByText(Exemplo)).not.toBeInTheDocument()
    expect(screen.getByText('preciso do boleto').closest('.card')).toHaveClass('ms-auto')
    expect(screen.getByText('É do semestre atual?').closest('.card')).toHaveClass('me-auto')
  })

  it('enquanto o assistente responde, mostra digitando', async () => {
    assistente({ 'POST /api/conversas': () => new Promise(() => {}) })
    await enviar()
    expect(await screen.findByRole('status', { name: 'Digitando' })).toBeInTheDocument()
    expect(screen.getByText('digitando…')).toBeInTheDocument()
  })

  it('a segunda mensagem vai para a conversa aberta', async () => {
    const chamadas = assistente({
      'POST /api/conversas': responde('pergunta', 'É do semestre atual?'),
      'POST /api/conversas/7/mensagens': () => [200, { resposta: { tipo: 'resposta', texto: 'Está no portal.' } }],
    })
    await enviar('boleto')
    await screen.findByText('É do semestre atual?')
    await enviar('sim')
    await screen.findByText('Está no portal.')
    expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => [c.url, c.corpo])).toEqual([
      ['/api/conversas', { mensagem: 'boleto' }],
      ['/api/conversas/7/mensagens', { mensagem: 'sim' }],
    ])
  })

  it('Sim encerra com Que bom que resolveu', async () => {
    const chamadas = assistente({
      'POST /api/conversas': responde('resposta', 'O boleto fica no portal.'),
      'POST /api/conversas/7/avaliacao': () => [200, { desfecho: 'RESOLVIDA_AUTOATENDIMENTO' }],
    })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    expect(await screen.findByText('Que bom que resolveu! Conversa encerrada.')).toBeInTheDocument()
    expect(screen.queryByText('Isso resolveu?')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mensagem')).not.toBeInTheDocument()
    expect(chamadas.find((c) => c.url.endsWith('/avaliacao'))?.corpo).toEqual({ resolveu: true })
  })

  it('depois do Não, a próxima mensagem tira o convite e pede nova avaliação', async () => {
    assistente({
      'POST /api/conversas': responde('resposta', 'O boleto fica no portal.'),
      'POST /api/conversas/7/avaliacao': () => [200, { desfecho: null }],
      'POST /api/conversas/7/mensagens': () => [200, { resposta: { tipo: 'resposta', texto: 'Use a segunda via.' } }],
    })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Não' }))
    await screen.findByText('Quer explicar melhor ou falar com um atendente?')
    expect(screen.queryByText('Isso resolveu?')).not.toBeInTheDocument()
    await enviar('não achei no portal')
    await screen.findByText('Use a segunda via.')
    expect(screen.queryByText('Quer explicar melhor ou falar com um atendente?')).not.toBeInTheDocument()
    expect(screen.getByText('Isso resolveu?')).toBeInTheDocument()
  })

  it('encerrar pede confirmação e mostra Conversa encerrada', async () => {
    const chamadas = assistente({
      'POST /api/conversas': responde('pergunta', 'É do semestre atual?'),
      'POST /api/conversas/7/encerrar': () => [200, { desfecho: 'ENCERRADA' }],
    })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Encerrar' }))
    const d = await dialogo()
    expect(d.getByText('Encerrar a conversa?')).toBeInTheDocument()
    expect(d.getByText('A conversa será encerrada.')).toBeInTheDocument()
    expect(confirmar()).toBeEnabled()
    await userEvent.click(confirmar())
    expect(await screen.findByText('Conversa encerrada.')).toBeInTheDocument()
    expect(chamadas.map((c) => c.url)).toContain('/api/conversas/7/encerrar')
  })

  it('falar com atendente sem conversa leva o texto digitado como descrição', async () => {
    const chamadas = assistente({ 'POST /api/atendimento-direto': () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Triagem' }], 'GET /api/chamados/ONE-1': () => [200, chamado()] })
    await userEvent.type(await screen.findByLabelText('Mensagem'), 'x')
    await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
    const d = await dialogo()
    expect(d.getByText('Falar com um atendente?')).toBeInTheDocument()
    expect(d.getByLabelText('Descreva seu pedido')).toHaveValue('x')
    expect(d.queryByLabelText('Matrícula')).not.toBeInTheDocument()
    expect(confirmar()).toBeEnabled()
    await userEvent.clear(d.getByLabelText('Descreva seu pedido'))
    expect(confirmar()).toBeDisabled()
    await userEvent.type(d.getByLabelText('Descreva seu pedido'), '   ')
    expect(confirmar()).toBeDisabled()
    await userEvent.clear(d.getByLabelText('Descreva seu pedido'))
    await userEvent.click(d.getByLabelText('Descreva seu pedido'))
    await userEvent.paste('a'.repeat(2000))
    expect(confirmar()).toBeEnabled()
    await userEvent.click(confirmar())
    expect(await screen.findByText('Transferido para Triagem. Protocolo ONE-1.')).toBeInTheDocument()
    expect(chamadas.find((c) => c.url === '/api/atendimento-direto')?.corpo).toEqual({ descricao: 'a'.repeat(2000) })
  })

  it('em conversa, falar com atendente não pede descrição', async () => {
    assistente({ 'POST /api/conversas': responde('pergunta', 'É do semestre atual?') })
    await enviar()
    await screen.findByText('É do semestre atual?')
    await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
    const d = await dialogo()
    expect(d.queryByLabelText('Descreva seu pedido')).not.toBeInTheDocument()
    expect(confirmar()).toBeEnabled()
    await userEvent.click(d.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('transferido mostra o autor só nas respostas do atendente', async () => {
    assistente({
      'POST /api/conversas': responde('transferir', 'Vou transferir.'),
      'POST /api/conversas/7/transferir': () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Financeiro' }],
      'GET /api/chamados/ONE-1': () => [
        200,
        chamado({
          mensagens: [
            { id: 1, tipo: 'PUBLICA', texto: 'Olá!', autor: 'Carla', doAluno: false, criadaEm: '2026-11-02T12:10:00Z' },
            { id: 2, tipo: 'PUBLICA', texto: 'Oi.', autor: 'Ana', doAluno: true, criadaEm: '2026-11-02T12:11:00Z' },
          ],
        }),
      ],
    })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar transferência' }))
    await userEvent.click(confirmar())
    const atendente = (await screen.findByText('Olá!')).closest('.card') as HTMLElement
    expect(within(atendente).getByText('Carla')).toBeInTheDocument()
    expect(atendente).toHaveClass('me-auto')
    const aluno = screen.getByText('Oi.').closest('.card') as HTMLElement
    expect(within(aluno).queryByText('Ana')).not.toBeInTheDocument()
    expect(aluno).toHaveClass('ms-auto')
    expect(screen.queryByRole('button', { name: 'Confirmar transferência' })).not.toBeInTheDocument()
    expect(screen.queryByText('Conversa encerrada.')).not.toBeInTheDocument()
  })

  it('o limite conta só as mensagens do aluno, mesmo sem resposta do assistente', async () => {
    assistente({ 'POST /api/conversas': () => [503, { status: 503, detail: 'Assistente indisponível.' }] })
    for (let n = 1; n <= 9; n++) {
      await enviar(`mensagem ${n}`)
      await screen.findByText(`mensagem ${n}`)
      await waitFor(() => expect(screen.getByRole('button', { name: /Enviar/ })).toBeDisabled())
    }
    expect(screen.getByLabelText('Mensagem')).toBeInTheDocument()
    await enviar('mensagem 10')
    await screen.findByText('mensagem 10')
    await waitFor(() => expect(screen.queryByLabelText('Mensagem')).not.toBeInTheDocument())
  })
})
