import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatarData } from '../datas'
import { estados } from '../test/textos'
import { abrir, api, chamado, me, type Rota } from '../test/util'

// Linha 6 de ## Screens (Assistente); "Mensagem", "Escreva sua dúvida", "Digitando" não são texto visível; "Enviar" é escrito (estrutura-visual AC 14).
const Assistente = [
  'Assistente',
  'Suas mensagens são analisadas por um serviço externo de inteligência artificial, com servidores fora do Brasil. Não escreva CPF, matrícula, telefone ou dados de saúde.',
  'Atendimento ao estudante · Univag', // AC 8 e AC 9: o assistente sem conversa, a frase de base, o nome e as duas perguntas de base
  'Respostas com base nas normas da instituição.',
  'Assistente virtual',
  'Como emito o boleto do semestre?',
  'Posso abonar falta com atestado?',
  'Resposta gerada por IA com base nas orientações da instituição.',
  'digitando…',
  'Isso resolveu?',
  'Sim',
  'Não',
  'Quer explicar melhor ou falar com um atendente?',
  'Confirmar transferência',
  'Falar com atendente',
  'Encerrar',
  'Enviar',
  'Falar com um atendente?',
  'Encerrar a conversa?',
  'Sua conversa será enviada a um atendente da instituição, que responde por aqui.',
  'Descreva seu pedido',
  'Matrícula',
  'Escolha a matrícula',
  'A conversa será encerrada.',
  'Cancelar',
  'Confirmar',
  'Sua solicitação ONE-1 foi para Financeiro',
  'A resposta chega em Solicitações e no seu e-mail.',
  'Ver solicitação',
  'Que bom que resolveu! Conversa encerrada.',
  'Conversa encerrada.',
  'PDF ou foto, até 10 MB',
  'Reenviar',
]

const Agora = '2026-11-02T15:00:00Z'
const data = formatarData(Agora, 'America/Cuiaba')
const Pergunta = 'preciso do boleto'
const responde = (tipo: string, texto: string): Rota => () => [201, { conversaId: 7, resposta: { tipo, texto } }]
const duas = me({
  matriculas: [
    { id: 1, numero: '2000567890', curso: 'ADS', semestre: 3, situacao: 'ATIVA' },
    { id: 2, numero: '2000567891', curso: 'Direito', semestre: 1, situacao: 'ATIVA' },
  ],
})

function assistente(rotas: Record<string, Rota> = {}, quem = me()) {
  api({ 'GET /api/auth/me': () => [200, quem], ...rotas })
  return abrir('/univag/assistente')
}

async function enviar(texto = Pergunta) {
  await userEvent.type(await screen.findByLabelText('Mensagem'), texto)
  await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
}

const tela = () => screen.getByRole('main')

describe('textos', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(Agora))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('textos Assistente', async () => {
    const t = estados(Assistente)
    const conversa = [Pergunta, data]

    // sem conversa: rótulo oculto e placeholder do campo
    let montada = assistente()
    const campo = await screen.findByLabelText('Mensagem')
    expect(campo).toHaveAttribute('placeholder', 'Escreva sua dúvida')
    t.conferir(tela())
    // com um arquivo escolhido, a ajuda dos anexos aparece
    await userEvent.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(['x'], 'foto.png', { type: 'image/png' }))
    await screen.findByText('PDF ou foto, até 10 MB')
    t.conferir(tela(), ['foto.png'])
    montada.unmount()

    // digitando
    montada = assistente({ 'POST /api/conversas': () => new Promise(() => {}) })
    await enviar()
    expect(await screen.findByRole('status', { name: 'Digitando' })).toBeInTheDocument()
    t.conferir(tela(), conversa)
    montada.unmount()

    // resposta com "Isso resolveu?", depois o "Não"
    montada = assistente({ 'POST /api/conversas': responde('resposta', 'O boleto fica no portal.'), 'POST /api/conversas/7/avaliacao': () => [200, { desfecho: null }] })
    await enviar()
    await screen.findByText('Isso resolveu?')
    t.conferir(tela(), [...conversa, 'O boleto fica no portal.'])
    await userEvent.click(screen.getByRole('button', { name: 'Não' }))
    await screen.findByText('Quer explicar melhor ou falar com um atendente?')
    t.conferir(tela(), [...conversa, 'O boleto fica no portal.'])
    montada.unmount()

    // limite de 10 mensagens
    montada = assistente({
      'POST /api/conversas': responde('pergunta', 'É do semestre atual?'),
      'POST /api/conversas/7/mensagens': () => [200, { resposta: { tipo: 'pergunta', texto: 'É do semestre atual?' } }],
    })
    const enviadas: string[] = []
    for (let n = 1; n <= 10; n++) {
      enviadas.push(`mensagem ${n}`)
      await enviar(`mensagem ${n}`)
      await waitFor(() => expect(screen.getAllByText('É do semestre atual?')).toHaveLength(n))
    }
    t.conferir(tela(), [...enviadas, 'É do semestre atual?', data])
    montada.unmount()

    // diálogo sem conversa, com duas matrículas ativas
    montada = assistente({}, duas)
    await userEvent.click(await screen.findByRole('button', { name: /Falar com atendente/ }))
    t.conferir(await screen.findByRole('dialog'), ['2000567890 — ADS', '2000567891 — Direito'])
    montada.unmount()

    // diálogos em conversa: "Falar com um atendente?" e "Encerrar a conversa?"
    montada = assistente({ 'POST /api/conversas': responde('pergunta', 'É do semestre atual?') })
    await enviar()
    await screen.findByText('É do semestre atual?')
    await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
    t.conferir(await screen.findByRole('dialog'))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    t.conferir(await screen.findByRole('dialog'))
    montada.unmount()

    // transferido, com a resposta do atendente
    montada = assistente({
      'POST /api/conversas': responde('transferir', 'Vou transferir você.'),
      'POST /api/conversas/7/transferir': () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Financeiro' }],
      'GET /api/chamados/ONE-1': () => [200, chamado({ mensagens: [{ id: 1, tipo: 'PUBLICA', texto: 'Olá!', autor: 'Carla', doAluno: false, criadaEm: Agora }] })],
    })
    await enviar()
    await screen.findByRole('button', { name: 'Confirmar transferência' })
    t.conferir(tela(), [...conversa, 'Vou transferir você.'])
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar transferência' }))
    t.conferir(await screen.findByRole('dialog'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await screen.findByText('Olá!')
    t.conferir(tela(), [...conversa, 'Vou transferir você.', 'Olá!', 'Carla'])
    montada.unmount()

    // encerrada pelo "Sim"
    montada = assistente({ 'POST /api/conversas': responde('resposta', 'O boleto fica no portal.'), 'POST /api/conversas/7/avaliacao': () => [200, { desfecho: 'RESOLVIDA_AUTOATENDIMENTO' }] })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    await screen.findByText('Que bom que resolveu! Conversa encerrada.')
    t.conferir(tela(), [...conversa, 'O boleto fica no portal.'])
    montada.unmount()

    // encerrada pelo "Encerrar"
    montada = assistente({ 'POST /api/conversas': responde('pergunta', 'É do semestre atual?'), 'POST /api/conversas/7/encerrar': () => [200, { desfecho: 'ENCERRADA' }] })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Encerrar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }))
    await screen.findByText('Conversa encerrada.')
    t.conferir(tela(), [...conversa, 'É do semestre atual?'])
    montada.unmount()

    // erro: o detail da API
    montada = assistente({ 'POST /api/conversas': () => [503, { status: 503, detail: 'Assistente indisponível.' }] })
    await enviar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Assistente indisponível.')
    t.conferir(tela(), [...conversa, 'Assistente indisponível.'])
    montada.unmount()

    t.todos()
  }, 30_000)
})
