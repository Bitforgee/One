import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const AvisoExterno =
  'Suas mensagens são analisadas por um serviço externo de inteligência artificial, com servidores fora do Brasil. Não escreva CPF, matrícula, telefone ou dados de saúde.'
const SemBase = 'Não encontrei isso nas orientações da instituição. Posso transferir você para um atendente.'

function responde(tipo: string, texto: string): Rota {
  return () => [201, { conversaId: 7, resposta: { tipo, texto } }]
}

function assistente(rotas: Record<string, Rota> = {}) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, me()], ...rotas })
  abrir('/univag/assistente')
  return chamadas
}

async function enviar(texto = 'preciso do boleto') {
  await userEvent.type(await screen.findByLabelText('Mensagem'), texto)
  await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
}

const falar = () => screen.getByRole('button', { name: /Falar com atendente/ })

describe('assistente', () => {
  it('Assistente mostra o aviso de IA externa', async () => {
    assistente({ 'POST /api/conversas': responde('resposta', 'O boleto fica no portal.') })
    expect(await screen.findByText(AvisoExterno)).toBeInTheDocument()
    await enviar()
    await screen.findByText('O boleto fica no portal.')
    expect(screen.getByText(AvisoExterno)).toBeInTheDocument()
  })

  it('Falar com atendente visível sem conversa e em conversa aberta', async () => {
    assistente({ 'POST /api/conversas': responde('pergunta', 'É o boleto deste semestre?') })
    await screen.findByLabelText('Mensagem')
    expect(falar()).toBeVisible()
    await enviar()
    await screen.findByText('É o boleto deste semestre?')
    expect(falar()).toBeVisible()
  })

  it('resposta mostra aviso de IA e Isso resolveu', async () => {
    assistente({ 'POST /api/conversas': responde('resposta', 'O boleto fica no portal.') })
    await enviar()
    expect(await screen.findByText('O boleto fica no portal.')).toBeInTheDocument()
    expect(screen.getByText('Resposta gerada por IA com base nas orientações da instituição.')).toBeInTheDocument()
    expect(screen.getByText('Isso resolveu?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sim' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Não' })).toBeInTheDocument()
  })

  it('pergunta sem Isso resolveu', async () => {
    assistente({ 'POST /api/conversas': responde('pergunta', 'É o boleto deste semestre?') })
    await enviar()
    expect(await screen.findByText('É o boleto deste semestre?')).toBeInTheDocument()
    expect(screen.queryByText('Isso resolveu?')).not.toBeInTheDocument()
    expect(screen.queryByText('Resposta gerada por IA com base nas orientações da instituição.')).not.toBeInTheDocument()
  })

  it('sem_base destaca Falar com atendente', async () => {
    assistente({ 'POST /api/conversas': responde('sem_base', SemBase) })
    await screen.findByLabelText('Mensagem')
    expect(falar()).toHaveClass('bg-background')
    expect(falar()).not.toHaveClass('bg-primary')
    await enviar()
    expect(await screen.findByText(SemBase)).toBeInTheDocument()
    expect(falar()).toHaveClass('bg-primary')
    expect(screen.queryByText('Isso resolveu?')).not.toBeInTheDocument()
  })

  it('transferir pede confirmação', async () => {
    const chamadas = assistente({ 'POST /api/conversas': responde('transferir', 'Vou transferir você para um atendente.') })
    await enviar()
    expect(await screen.findByText('Vou transferir você para um atendente.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar transferência' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Falar com um atendente?')
    expect(chamadas.some((c) => c.url.includes('transferir') || c.url.includes('atendimento-direto'))).toBe(false)
  })

  it('Não mostra Quer explicar melhor', async () => {
    const chamadas = assistente({
      'POST /api/conversas': responde('resposta', 'O boleto fica no portal.'),
      'POST /api/conversas/7/avaliacao': () => [200, { desfecho: null }],
    })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Não' }))
    expect(await screen.findByText('Quer explicar melhor ou falar com um atendente?')).toBeInTheDocument()
    expect(falar()).toHaveClass('bg-primary')
    expect(chamadas.find((c) => c.url === '/api/conversas/7/avaliacao')?.corpo).toEqual({ resolveu: false })
    expect(screen.getByLabelText('Mensagem')).toBeInTheDocument()
  })

  it('limite oferece só dois botões', async () => {
    assistente({
      'POST /api/conversas': responde('sem_base', SemBase),
      'POST /api/conversas/7/mensagens': () => [200, { resposta: { tipo: 'sem_base', texto: SemBase } }],
    })
    for (let n = 1; n <= 10; n++) {
      await enviar(`mensagem ${n}`)
      await screen.findByText(`mensagem ${n}`)
      await waitFor(() => expect(screen.getAllByText(SemBase)).toHaveLength(n))
    }
    expect(screen.queryByLabelText('Mensagem')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enviar/ })).not.toBeInTheDocument()
    expect(falar()).toBeVisible()
    expect(screen.getByRole('button', { name: 'Encerrar conversa' })).toBeVisible()
    const botoes = screen.getAllByRole('button').filter((b) => !b.closest('[data-sidebar=sidebar], header')).map((b) => b.textContent?.trim())
    expect(botoes).toEqual(['Falar com atendente', 'Encerrar conversa'])
  }, 15000)

  it('limite destaca Falar com atendente', async () => {
    assistente({
      'POST /api/conversas': responde('pergunta', 'É do semestre atual?'),
      'POST /api/conversas/7/mensagens': () => [200, { resposta: { tipo: 'pergunta', texto: 'É do semestre atual?' } }],
    })
    for (let n = 1; n <= 10; n++) {
      await enviar(`mensagem ${n}`)
      await waitFor(() => expect(screen.getAllByText('É do semestre atual?')).toHaveLength(n))
      if (n === 9) {
        expect(falar()).toHaveClass('bg-background')
        expect(falar()).not.toHaveClass('bg-primary')
      }
    }
    expect(screen.queryByLabelText('Mensagem')).not.toBeInTheDocument()
    expect(falar()).toHaveClass('bg-primary')
    expect(falar()).not.toHaveClass('bg-background')
  }, 15000)

  it('Enter envia e Shift+Enter quebra a linha', async () => {
    const chamadas = assistente({ 'POST /api/conversas': responde('pergunta', 'É do semestre atual?') })
    const campo = await screen.findByLabelText('Mensagem')
    await userEvent.type(campo, '   {Enter}')
    expect(chamadas.filter((c) => c.url === '/api/conversas')).toHaveLength(0)
    await userEvent.clear(campo)
    await userEvent.type(campo, 'linha 1{Shift>}{Enter}{/Shift}linha 2')
    expect(campo).toHaveValue('linha 1\nlinha 2')
    await userEvent.type(campo, '{Enter}')
    expect(await screen.findByText('É do semestre atual?')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.url === '/api/conversas').map((c) => c.corpo)).toEqual([{ mensagem: 'linha 1\nlinha 2' }])
  })
})
