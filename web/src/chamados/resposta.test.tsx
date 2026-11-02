import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Chamado } from '../chamado'
import { abrir, api, chamado, me, type Rota } from '../test/util'

const atendente = me({ papeis: ['ATENDENTE'], matriculas: [] })
const pdf = () => new File(['%PDF-1.4'], 'boleto.pdf', { type: 'application/pdf' })

function detalhe(c: Chamado, rotas: Record<string, Rota> = {}, quem = atendente) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, quem], 'GET /api/chamados/ONE-1': () => [200, c], 'POST /api/chamados/ONE-1/mensagens': () => [201, c], ...rotas })
  abrir('/univag/chamados/ONE-1')
  return chamadas
}

const corpo = async (chamadas: { metodo: string; corpo: any }[]) => {
  await waitFor(() => expect(chamadas.some((c) => c.metodo === 'POST')).toBe(true))
  return chamadas.find((c) => c.metodo === 'POST')!.corpo
}

describe('resposta no chamado', () => {
  it('aluno com o chamado resolvido responde reabrindo a solicitação', async () => {
    detalhe(chamado({ estado: 'RESOLVIDO', acoes: ['responder'] }), {}, me())
    expect(await screen.findByLabelText('Responder (reabre a solicitação)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nota interna')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Resposta pronta')).not.toBeInTheDocument()
  })

  it('a equipe responde ao chamado resolvido sem o aviso de reabrir', async () => {
    detalhe(chamado({ estado: 'RESOLVIDO', eventos: [], acoes: ['responder', 'nota'] }))
    expect(await screen.findByLabelText('Responder')).toBeInTheDocument()
  })

  it('Enviar fica desabilitado com texto em branco', async () => {
    detalhe(chamado({ acoes: ['responder'] }), {}, me())
    await userEvent.type(await screen.findByLabelText('Responder'), '   ')
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('aguardando aluno vai junto e o formulário volta limpo', async () => {
    const chamadas = detalhe(chamado({ eventos: [], acoes: ['responder', 'nota'] }))
    await userEvent.type(await screen.findByLabelText('Responder'), 'Envie o comprovante.')
    await userEvent.upload(screen.getByLabelText(/Anexos/), pdf())
    await userEvent.click(screen.getByLabelText('Aguardando aluno'))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    const enviado = await corpo(chamadas)
    expect(enviado.tipo).toBe('PUBLICA')
    expect(enviado.aguardaAluno).toBe('true')
    expect((enviado.anexos as File).name).toBe('boleto.pdf')
    await waitFor(() => expect(screen.getByLabelText('Responder')).toHaveValue(''))
    expect(screen.getByLabelText('Aguardando aluno')).not.toBeChecked()
    expect((screen.getByLabelText(/Anexos/) as HTMLInputElement).files).toHaveLength(0)
  })

  it('nota interna não leva anexo nem aguardando aluno', async () => {
    const chamadas = detalhe(chamado({ eventos: [], acoes: ['responder', 'nota'] }))
    await userEvent.type(await screen.findByLabelText('Responder'), 'Aluno ligou.')
    await userEvent.upload(screen.getByLabelText(/Anexos/), pdf())
    await userEvent.click(screen.getByLabelText('Aguardando aluno'))
    await userEvent.click(screen.getByLabelText('Nota interna'))
    expect(screen.queryByLabelText(/Anexos/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Aguardando aluno')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    const enviado = await corpo(chamadas)
    expect(enviado).toEqual({ tipo: 'NOTA', texto: 'Aluno ligou.', aguardaAluno: 'false' })
  })

  it('só com nota permitida, Enviar espera marcar Nota interna', async () => {
    detalhe(chamado({ eventos: [], acoes: ['nota'] }))
    await userEvent.type(await screen.findByLabelText('Responder'), 'Aluno ligou.')
    expect(screen.queryByLabelText('Aguardando aluno')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    await userEvent.click(screen.getByLabelText('Nota interna'))
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled()
  })

  it('só com resposta permitida, a equipe não vê Nota interna', async () => {
    detalhe(chamado({ eventos: [], acoes: ['responder'] }))
    expect(await screen.findByLabelText('Aguardando aluno')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nota interna')).not.toBeInTheDocument()
  })

  it('a resposta pronta escolhida preenche o texto e some na nota interna', async () => {
    detalhe(chamado({ eventos: [], setorId: 5, acoes: ['responder', 'nota'] }), {
      'GET /api/respostas-prontas?setorId=5': () => [200, [{ id: 1, titulo: 'Boleto', texto: 'Seu boleto está no Portal.' }, { id: 2, titulo: 'Atestado', texto: 'Envie o atestado.' }]],
    })
    await userEvent.selectOptions(await screen.findByLabelText('Resposta pronta'), '2')
    expect(screen.getByLabelText('Responder')).toHaveValue('Envie o atestado.')
    await userEvent.click(screen.getByLabelText('Nota interna'))
    expect(screen.queryByLabelText('Resposta pronta')).not.toBeInTheDocument()
  })
})

describe('conversa do chamado', () => {
  it('mensagens mostram autor, nota interna e anexo com o tamanho', async () => {
    detalhe(
      chamado({
        eventos: [],
        acoes: [],
        responsavel: null,
        mensagens: [
          { id: 1, tipo: 'PUBLICA', texto: 'Segue o boleto.', autor: 'Carla', doAluno: false, criadaEm: '2026-11-02T12:10:00Z', anexos: [{ id: 9, nome: 'boleto.pdf', tipo: 'application/pdf', tamanho: 1500 }] },
          { id: 2, tipo: 'NOTA', texto: 'Aluno ligou.', autor: 'Carla', doAluno: false, criadaEm: '2026-11-02T12:11:00Z' },
          { id: 3, tipo: 'PUBLICA', texto: 'Obrigada!', autor: 'Ana', doAluno: true, criadaEm: '2026-11-02T12:12:00Z' },
        ],
      }),
    )
    const publica = (await screen.findByText('Segue o boleto.')).closest('.card') as HTMLElement
    expect(within(publica).getByRole('link', { name: 'boleto.pdf' })).toHaveAttribute('href', '/api/anexos/9')
    expect(publica).toHaveTextContent('(2 KB)')
    expect(publica).toHaveClass('me-auto')
    expect(within(publica).queryByText('Nota interna')).not.toBeInTheDocument()
    const nota = screen.getByText('Aluno ligou.').closest('.card') as HTMLElement
    expect(within(nota).getByText('Nota interna')).toBeInTheDocument()
    expect(nota).toHaveClass('bg-warning-subtle')
    expect(screen.getByText('Obrigada!').closest('.card')).toHaveClass('ms-auto', 'bg-primary-subtle')
    expect(screen.queryByText('Nenhuma resposta ainda.')).not.toBeInTheDocument()
    expect(screen.getByText(/Financeiro · Boleto · sem responsável/)).toBeInTheDocument()
    expect(screen.queryByText('Resumo gerado por IA')).not.toBeInTheDocument()
  })

  it('a conversa com o assistente alinha o aluno à direita e avisa documento atualizado', async () => {
    detalhe(
      chamado({
        eventos: [],
        transcricao: [
          { autor: 'ALUNO', texto: 'quantas horas?', criadaEm: '2026-11-02T12:00:00Z' },
          {
            autor: 'ASSISTENTE',
            texto: 'São 300 horas.',
            criadaEm: '2026-11-02T12:00:05Z',
            fontes: [{ tipo: 'DOCUMENTO', versaoArtigoId: null, versaoDocumentoId: 42, titulo: 'Regulamento', numero: 1, trechos: [], atualizado: true }],
          },
        ],
      }),
    )
    expect((await screen.findByText('quantas horas?')).closest('.card')).toHaveClass('ms-auto')
    const resposta = screen.getByText('São 300 horas.').closest('.card') as HTMLElement
    expect(resposta).toHaveClass('me-auto')
    expect(within(resposta).getByText('Este documento foi atualizado depois desta resposta.')).toBeInTheDocument()
  })

  it('histórico só mostra a seta quando o evento tem origem ou destino', async () => {
    const evento = (tipo: string, de: string | null, para: string | null) => ({ tipo, ator: 'Carla', de, para, detalhe: null, criadoEm: '2026-11-02T12:00:00Z' })
    detalhe(chamado({ eventos: [evento('NOTA', null, null), evento('TRANSICAO', 'EM_ATENDIMENTO', null)] }))
    const itens = within(await screen.findByTestId('eventos')).getAllByRole('listitem').map((li) => li.textContent)
    expect(itens).toEqual(['02/11/2026 08:00NOTA · Carla', '02/11/2026 08:00TRANSICAO · Carla · EM_ATENDIMENTO → —'])
  })
})
