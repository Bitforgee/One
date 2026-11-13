import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Chamado, Evento, MensagemChamado } from '../chamado'
import { abrir, api, chamado, me } from '../test/util'

const equipe = me({ papeis: ['ATENDENTE'], matriculas: [] })

const evento = (tipo: string, ator: string, criadoEm: string, de: string | null = null, para: string | null = null): Evento => ({ tipo, ator, doAluno: false, de, para, detalhe: null, criadoEm })
const mensagem = (id: number, texto: string, criadaEm: string, extra: Partial<MensagemChamado> = {}): MensagemChamado => ({ id, tipo: 'PUBLICA', texto, autor: 'Carla', doAluno: false, criadaEm, ...extra })

const abertura = evento('CRIACAO', 'Sistema', '2026-11-02T12:00:00Z', null, 'ABERTO')
const assumiu = evento('ATRIBUICAO', 'Carla', '2026-11-02T12:05:00Z', null, 'Carla')
const mudou = evento('TRANSICAO', 'Carla', '2026-11-02T12:20:00Z', 'EM_ATENDIMENTO', 'AGUARDANDO_ALUNO')
const resposta = mensagem(1, 'Segue o boleto.', '2026-11-02T12:10:00Z')
const doAluno = mensagem(2, 'Obrigada!', '2026-11-02T12:30:00Z', { doAluno: true, autor: 'Ana' })

function daEquipe(parcial: Partial<Chamado> = {}) {
  return chamado({ solicitante: 'Ana', eventos: [], acoes: ['responder', 'nota', 'assumir', 'resolver'], mensagens: [], transcricao: [], ...parcial })
}

function detalhe(c: Chamado, quem = equipe) {
  api({ 'GET /api/auth/me': () => [200, quem], 'GET /api/chamados/ONE-1': () => [200, c] })
  return abrir('/univag/chamados/ONE-1')
}

const itens = async () => within(await screen.findByTestId('linha-do-tempo')).getAllByRole('listitem')
const textos = async () => (await itens()).map((li) => li.textContent!)

describe('linha do tempo do chamado', () => {
  it('mensagens e eventos em ordem cronológica', async () => {
    detalhe(daEquipe({ mensagens: [doAluno, resposta], eventos: [mudou, abertura, assumiu] }))
    const lista = await itens()
    expect(lista).toHaveLength(5)
    expect(lista.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Sistema abriu a solicitação'),
      expect.stringContaining('Carla assumiu a solicitação'),
      expect.stringContaining('Segue o boleto.'),
      expect.stringContaining('Carla mudou o estado de Em atendimento para Aguardando aluno'),
      expect.stringContaining('Obrigada!'),
    ])
    expect(screen.getAllByRole('heading', { level: 2, name: 'Atendimento' })).toHaveLength(1)
    expect(screen.getAllByRole('list').filter((l) => l.tagName === 'OL')).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'Histórico' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('eventos')).not.toBeInTheDocument()
  })

  it('evento em linha centrada sem balão', async () => {
    detalhe(daEquipe({ eventos: [assumiu] }))
    const [li] = await itens()
    expect(li).toHaveTextContent('02/11/2026 08:05 · Carla assumiu a solicitação')
    expect(li).toHaveClass('text-center')
    expect(li.querySelector('.is-user, .is-assistant')).toBeNull()
  })

  it('empate de horário', async () => {
    const mesmoInstante = '2026-11-02T12:00:00Z'
    detalhe(daEquipe({ mensagens: [mensagem(1, 'Primeira resposta.', mesmoInstante)], eventos: [evento('ATRIBUICAO', 'Carla', mesmoInstante, null, 'Carla')] }))
    const lista = await textos()
    expect(lista[0]).toContain('Carla assumiu a solicitação')
    expect(lista[1]).toContain('Primeira resposta.')
  })

  it('aluno sem eventos nem filtro', async () => {
    detalhe(chamado({ eventos: null, mensagens: [resposta, doAluno], transcricao: [], acoes: [] }), me())
    const lista = await textos()
    expect(lista).toHaveLength(2)
    expect(lista[0]).toContain('Segue o boleto.')
    expect(lista[1]).toContain('Obrigada!')
    expect(screen.queryByLabelText('Eventos')).not.toBeInTheDocument()
  })

  it('sem itens', async () => {
    detalhe(daEquipe())
    expect(await screen.findByText('Nenhuma resposta ainda.')).toBeInTheDocument()
    expect(within(screen.getByTestId('linha-do-tempo')).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('filtro Eventos', async () => {
    detalhe(daEquipe({ mensagens: [resposta, mensagem(3, 'Conferir com a tesouraria.', '2026-11-02T12:15:00Z', { tipo: 'NOTA' })], eventos: [assumiu, mudou] }))
    const chave = await screen.findByLabelText('Eventos')
    expect(chave).toBeChecked()
    expect(await itens()).toHaveLength(4)

    await userEvent.click(chave)
    const sem = await textos()
    expect(sem).toHaveLength(2)
    expect(sem[0]).toContain('Segue o boleto.')
    expect(sem[1]).toContain('Conferir com a tesouraria.')

    await userEvent.click(chave)
    expect(await itens()).toHaveLength(4)
  })

  it('coluna da direita sem histórico', async () => {
    detalhe(daEquipe({ eventos: [assumiu], fluxo: { versao: 1, etapa: 2, total: 3, destino: 'SETOR', abrangencia: 'ADS' } }))
    expect(await screen.findByText('Etapa 2 de 3 · ADS')).toBeInTheDocument()
    expect(screen.getByText('Ações')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Histórico' })).not.toBeInTheDocument()
    expect(screen.getAllByText(/Carla assumiu a solicitação/)).toHaveLength(1)
    expect(screen.getByTestId('linha-do-tempo')).toHaveTextContent('Carla assumiu a solicitação')
  })

  it('ação acrescenta o evento no fim', async () => {
    const antes = daEquipe({ estado: 'ABERTO', mensagens: [resposta], eventos: [abertura] })
    const agora = evento('ATRIBUICAO', 'Carla', '2026-11-02T13:00:00Z', null, 'Carla')
    const depois = { ...antes, estado: 'EM_ATENDIMENTO', eventos: [abertura, agora] } as Chamado
    const chamadas = api({
      'GET /api/auth/me': () => [200, equipe],
      'GET /api/chamados/ONE-1': () => [200, antes],
      'POST /api/chamados/ONE-1/assumir': () => [200, depois],
    })
    abrir('/univag/chamados/ONE-1')
    expect(await itens()).toHaveLength(2)
    const leituras = () => chamadas.filter((c) => c.metodo === 'GET' && c.url === '/api/chamados/ONE-1').length
    const antesDeAssumir = leituras()

    await userEvent.click(screen.getByRole('button', { name: 'Assumir' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Assumir chamado' }))
    await waitFor(async () => expect(await itens()).toHaveLength(3))
    const lista = await textos()
    expect(lista.at(-1)).toContain('Carla assumiu a solicitação')
    expect(leituras()).toBe(antesDeAssumir)
  })

  it('nota interna na sequência', async () => {
    const nota = mensagem(3, 'Conferir com a tesouraria.', '2026-11-02T12:15:00Z', { tipo: 'NOTA' })
    detalhe(daEquipe({ mensagens: [resposta, nota], eventos: [mudou] }))
    const lista = await itens()
    expect(lista).toHaveLength(3)
    expect(lista[0]).toHaveTextContent('Segue o boleto.')
    expect(lista[1]).toHaveTextContent('Conferir com a tesouraria.')
    expect(lista[2]).toHaveTextContent('Carla mudou o estado')
    expect(within(lista[1]).getByText('Nota interna')).toBeInTheDocument()
    expect(lista[1].querySelector('.bg-warning-subtle')).not.toBeNull()
  })

  it('conversa com o assistente recolhida', async () => {
    const fonte = { tipo: 'ARTIGO' as const, versaoArtigoId: 7, versaoDocumentoId: null, titulo: 'Boleto do semestre', numero: 1, trechos: ['fica no Portal'], atualizado: false }
    detalhe(
      daEquipe({
        transcricao: [
          { autor: 'ALUNO', texto: 'cadê o boleto?', criadaEm: '2026-11-02T11:59:00Z' },
          { autor: 'ASSISTENTE', texto: 'Fica no portal.', criadaEm: '2026-11-02T11:59:05Z', fontes: [fonte] },
          { autor: 'ALUNO', texto: 'quero um atendente', criadaEm: '2026-11-02T11:59:30Z' },
        ],
      }),
    )
    const botao = await screen.findByRole('button', { name: 'Conversa com o assistente · 3 mensagens' })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('cadê o boleto?')).not.toBeInTheDocument()

    await userEvent.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    for (const t of ['cadê o boleto?', 'Fica no portal.', 'quero um atendente', 'Boleto do semestre']) expect(screen.getByText(t)).toBeInTheDocument()

    await userEvent.click(botao)
    expect(screen.queryByText('cadê o boleto?')).not.toBeInTheDocument()
  })
})
