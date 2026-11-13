import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, chamado, me, type Rota } from '../test/util'

const Aviso =
  'Sua dúvida vai primeiro para a liderança do seu semestre, formada por estudantes da sua turma. A liderança vê seu nome, curso, semestre e um resumo da dúvida. A conversa com o assistente e os anexos dela não são mostrados.'

const transferido: Rota = () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Líderes ADS' }]

function emConversa(rotas: Record<string, Rota> = {}, quem = me()) {
  return api({
    'GET /api/auth/me': () => [200, quem],
    'POST /api/conversas': () => [201, { conversaId: 7, resposta: { tipo: 'sem_base', texto: 'Não encontrei.' } }],
    'GET /api/chamados/ONE-1': () => [200, chamado()],
    ...rotas,
  })
}

async function abrirODialogo() {
  await userEvent.type(await screen.findByLabelText('Mensagem'), 'preciso de ajuda com a nota')
  await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
  await screen.findByText('Não encontrei.')
  await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
  return screen.findByRole('dialog')
}

const nomesDosBotoes = (dialogo: HTMLElement) => within(dialogo).getAllByRole('button').map((b) => b.textContent)

describe('liderança do semestre', () => {
  it('aviso da liderança, sem escolha de coordenação, e enviar à liderança', async () => {
    const chamadas = emConversa({ 'GET /api/conversas/7/destino': () => [200, { lideranca: true }], 'POST /api/conversas/7/transferir': transferido })
    abrir('/univag/assistente')

    const dialogo = await abrirODialogo()

    expect(await within(dialogo).findByText(Aviso)).toBeInTheDocument()
    expect(nomesDosBotoes(dialogo).filter((n) => ['Voltar à conversa', 'Prefiro a coordenação', 'Enviar à liderança', 'Falar com atendente', 'Cancelar', 'Confirmar'].includes(n!))).toEqual(['Voltar à conversa', 'Enviar à liderança'])
    expect(within(dialogo).queryByText(/Sua conversa será enviada a um atendente/)).not.toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar à liderança' }))

    await screen.findByText('Sua solicitação ONE-1 foi para Líderes ADS')
    expect(chamadas.find((c) => c.url === '/api/conversas/7/transferir')?.corpo).toEqual({})
  })

  it('aviso da liderança: o aluno só cancela ou envia, nunca escolhe a coordenação', async () => {
    const chamadas = emConversa({ 'GET /api/conversas/7/destino': () => [200, { lideranca: true }], 'POST /api/conversas/7/transferir': transferido })
    abrir('/univag/assistente')

    let dialogo = await abrirODialogo()
    await within(dialogo).findByText(Aviso)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Voltar à conversa' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(chamadas.some((c) => c.url.endsWith('/transferir'))).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
    dialogo = await screen.findByRole('dialog')
    await within(dialogo).findByText(Aviso)
    expect(within(dialogo).queryByRole('button', { name: 'Prefiro a coordenação' })).not.toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar à liderança' }))

    await screen.findByText('Sua solicitação ONE-1 foi para Líderes ADS')
    expect(chamadas.find((c) => c.url === '/api/conversas/7/transferir')?.corpo).toEqual({})
  })

  it('sem liderança disponível o diálogo é o de hoje', async () => {
    const chamadas = emConversa({ 'GET /api/conversas/7/destino': () => [200, { lideranca: false }], 'POST /api/conversas/7/transferir': transferido })
    abrir('/univag/assistente')

    const dialogo = await abrirODialogo()

    expect(await within(dialogo).findByText('Sua conversa será enviada a um atendente da instituição, que responde por aqui.')).toBeInTheDocument()
    await waitFor(() => expect(chamadas.some((c) => c.url === '/api/conversas/7/destino')).toBe(true))
    expect(within(dialogo).queryByText(Aviso)).not.toBeInTheDocument()
    expect(nomesDosBotoes(dialogo)).toContain('Falar com atendente')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Falar com atendente' }))
    await screen.findByText(/Sua solicitação ONE-1 foi para/)
    expect(chamadas.find((c) => c.url === '/api/conversas/7/transferir')?.corpo).toEqual({})
  })

  it('prévia que falha segura o envio: nenhum dado vai à liderança sem o aviso', async () => {
    const chamadas = emConversa({ 'GET /api/conversas/7/destino': () => [500, { title: 'Erro', status: 500, detail: 'Falhou.' }], 'POST /api/conversas/7/transferir': transferido })
    abrir('/univag/assistente')

    const dialogo = await abrirODialogo()

    await waitFor(() => expect(chamadas.some((c) => c.url === '/api/conversas/7/destino')).toBe(true))
    expect(await within(dialogo).findByText('Não foi possível confirmar para onde sua dúvida vai. Feche esta janela e tente de novo.')).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Falar com atendente' })).toBeDisabled()
    expect(within(dialogo).queryByRole('button', { name: 'Prefiro a coordenação' })).not.toBeInTheDocument()
    expect(chamadas.some((c) => c.url.endsWith('/transferir'))).toBe(false)
  })

  it('prévia só depois de escolhida a matrícula, e de novo ao trocá-la', async () => {
    const duas = me({
      matriculas: [
        { id: 1, numero: '2000567890', curso: 'ADS', semestre: 3, situacao: 'ATIVA' },
        { id: 2, numero: '2000567891', curso: 'Direito', semestre: 1, situacao: 'ATIVA' },
      ],
    })
    const chamadas = emConversa(
      {
        'GET /api/conversas/7/destino?matriculaId=1': () => [200, { lideranca: true }],
        'GET /api/conversas/7/destino?matriculaId=2': () => [200, { lideranca: false }],
        'POST /api/conversas/7/transferir': transferido,
      },
      duas,
    )
    abrir('/univag/assistente')
    const destinos = () => chamadas.filter((c) => c.url.includes('/destino')).map((c) => c.url)

    const dialogo = await abrirODialogo()
    expect(destinos()).toEqual([])
    expect(within(dialogo).queryByText(Aviso)).not.toBeInTheDocument()

    await userEvent.selectOptions(within(dialogo).getByLabelText('Matrícula'), '1')
    expect(await within(dialogo).findByText(Aviso)).toBeInTheDocument()
    expect(destinos()).toEqual(['/api/conversas/7/destino?matriculaId=1'])

    await userEvent.selectOptions(within(dialogo).getByLabelText('Matrícula'), '2')
    expect(await within(dialogo).findByText('Sua conversa será enviada a um atendente da instituição, que responde por aqui.')).toBeInTheDocument()
    expect(destinos()).toEqual(['/api/conversas/7/destino?matriculaId=1', '/api/conversas/7/destino?matriculaId=2'])

    await userEvent.selectOptions(within(dialogo).getByLabelText('Matrícula'), '1')
    await userEvent.click(await within(dialogo).findByRole('button', { name: 'Enviar à liderança' }))
    await screen.findByText(/Sua solicitação ONE-1 foi para/)
    expect(chamadas.find((c) => c.url === '/api/conversas/7/transferir')?.corpo).toEqual({ matriculaId: 1 })
  })

  it('atendimento direto nunca consulta a prévia', async () => {
    const chamadas = emConversa({ 'POST /api/atendimento-direto': transferido })
    abrir('/univag/assistente')

    await userEvent.click(await screen.findByRole('button', { name: /Falar com atendente/ }))
    const dialogo = await screen.findByRole('dialog')
    await userEvent.type(within(dialogo).getByLabelText('Descreva seu pedido'), 'Quero trancar o curso')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Falar com atendente' }))

    await screen.findByText(/Sua solicitação ONE-1 foi para/)
    expect(chamadas.some((c) => c.url.includes('/destino'))).toBe(false)
    expect(chamadas.find((c) => c.url === '/api/atendimento-direto')?.corpo).toEqual({ descricao: 'Quero trancar o curso' })
  })
})
