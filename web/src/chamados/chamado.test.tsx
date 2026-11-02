import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Chamado } from '../chamado'
import { abrir, api, chamado, me } from '../test/util'

// Chamado como a equipe o recebe: resumo, fontes e eventos.
function daEquipe(parcial: Partial<Chamado> = {}): Chamado {
  return chamado({
    solicitante: 'Ana',
    resumo: 'Aluna não encontra o boleto de novembro.',
    origemCategoria: 'IA',
    eventos: [],
    acoes: ['responder', 'nota', 'resolver'],
    ...parcial,
  })
}

const equipe = me({ papeis: ['ATENDENTE'], matriculas: [] })

describe('chamado', () => {
  // C39: os três estados do detalhe antes de haver conversa para mostrar
  it('detalhe do chamado carregando, erro e sem respostas', async () => {
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => new Promise(() => {}) })
    const carregando = abrir('/univag/chamados/ONE-1')
    await screen.findByRole('navigation')
    expect(screen.getByRole('status', { name: 'Carregando' })).toHaveClass('spinner-border')
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    carregando.unmount()

    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [404, { status: 404, detail: 'Chamado não encontrado.' }] })
    const comErro = abrir('/univag/chamados/ONE-1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Chamado não encontrado.')
    expect(screen.getByRole('alert')).toHaveClass('alert', 'alert-danger')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    comErro.unmount()

    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado({ mensagens: [] })] })
    abrir('/univag/chamados/ONE-1')
    expect(await screen.findByText('Nenhuma resposta ainda.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ONE-1 · preciso do boleto' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('detalhe rotula Resumo gerado por IA', async () => {
    api({ 'GET /api/auth/me': () => [200, equipe], 'GET /api/chamados/ONE-1': () => [200, daEquipe()] })
    abrir('/univag/chamados/ONE-1')

    expect(await screen.findByText('Resumo gerado por IA')).toBeInTheDocument()
    expect(screen.getByText('Aluna não encontra o boleto de novembro.')).toBeInTheDocument()
    expect(screen.getByText(/matrícula 2000567890 · ADS · 3º semestre/)).toBeInTheDocument()
  })

  it('aluno não vê resumo no detalhe', async () => {
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados/ONE-1': () => [200, chamado()] })
    abrir('/univag/chamados/ONE-1')

    expect(await screen.findByText('O boleto fica no portal.')).toBeInTheDocument()
    expect(screen.queryByText('Resumo gerado por IA')).not.toBeInTheDocument()
    expect(screen.queryByText('Histórico')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar solicitação' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resolver' })).not.toBeInTheDocument()
  })

  it('aviso de artigo atualizado', async () => {
    const fonte = (versaoArtigoId: number, titulo: string, atualizado: boolean) => ({ tipo: 'ARTIGO' as const, versaoArtigoId, versaoDocumentoId: null, titulo, numero: 1, trechos: ['fica no Portal do Aluno'], atualizado })
    api({
      'GET /api/auth/me': () => [200, equipe],
      'GET /api/chamados/ONE-1': () => [
        200,
        daEquipe({
          transcricao: [
            { autor: 'ALUNO', texto: 'preciso do boleto', criadaEm: '2026-11-02T12:00:00Z' },
            { autor: 'ASSISTENTE', texto: 'Resposta antiga.', criadaEm: '2026-11-02T12:00:05Z', fontes: [fonte(10, 'Boleto (versão 1)', true)] },
            { autor: 'ASSISTENTE', texto: 'Resposta nova.', criadaEm: '2026-11-02T12:01:05Z', fontes: [fonte(11, 'Boleto (versão 2)', false)] },
          ],
        }),
      ],
    })
    abrir('/univag/chamados/ONE-1')

    const antiga = (await screen.findByText('Resposta antiga.')).closest('.card') as HTMLElement
    const nova = screen.getByText('Resposta nova.').closest('.card') as HTMLElement
    expect(within(antiga).getByText('Boleto (versão 1)')).toBeInTheDocument()
    expect(within(antiga).getByText('Este artigo foi atualizado depois desta resposta.')).toBeInTheDocument()
    expect(within(nova).queryByText('Este artigo foi atualizado depois desta resposta.')).not.toBeInTheDocument()
    expect(within(nova).getByText('“fica no Portal do Aluno”')).toBeInTheDocument()
  })

  // RAG C40
  it('fonte de documento no detalhe', async () => {
    api({
      'GET /api/auth/me': () => [200, equipe],
      'GET /api/chamados/ONE-1': () => [
        200,
        daEquipe({
          transcricao: [
            { autor: 'ALUNO', texto: 'quantas horas de estágio?', criadaEm: '2026-11-02T12:00:00Z' },
            {
              autor: 'ASSISTENTE',
              texto: 'O estágio exige 300 horas.',
              criadaEm: '2026-11-02T12:00:05Z',
              fontes: [
                { tipo: 'DOCUMENTO', versaoArtigoId: null, versaoDocumentoId: 42, titulo: 'Regulamento de estágio', numero: 2, trechos: ['mínima do estágio supervisionado é de 300 horas'], atualizado: false },
                { tipo: 'ARTIGO', versaoArtigoId: 7, versaoDocumentoId: null, titulo: 'Estágio obrigatório', numero: 1, trechos: ['termo de compromisso'], atualizado: false },
              ],
            },
          ],
        }),
      ],
    })
    abrir('/univag/chamados/ONE-1')

    const resposta = (await screen.findByText('O estágio exige 300 horas.')).closest('.card') as HTMLElement
    const doc = within(resposta).getByText('Regulamento de estágio').closest('div.border-top') as HTMLElement
    expect(within(doc).getByRole('img', { name: 'Documento' })).toHaveClass('bi-file-earmark-pdf')
    expect(within(doc).getByText('“mínima do estágio supervisionado é de 300 horas”')).toBeInTheDocument()
    expect(within(doc).getByRole('link', { name: 'Abrir o PDF (versão 2)' })).toHaveAttribute('href', '/api/documentos/versoes/42')
    const art = within(resposta).getByText('Estágio obrigatório').closest('div.border-top') as HTMLElement
    expect(within(art).getByRole('img', { name: 'Artigo' })).toHaveClass('bi-journal-text')
    expect(within(art).queryByRole('link')).not.toBeInTheDocument()
  })

  it('eventos em ordem no fuso', async () => {
    const evento = (tipo: string, ator: string, criadoEm: string, de: string | null = null, para: string | null = null) => ({ tipo, ator, de, para, detalhe: null, criadoEm })
    api({
      'GET /api/auth/me': () => [200, equipe],
      'GET /api/chamados/ONE-1': () => [
        200,
        daEquipe({
          eventos: [
            evento('CRIACAO', 'Sistema', '2026-11-02T03:30:00Z', null, 'ABERTO'),
            evento('ATRIBUICAO', 'Carla', '2026-11-02T12:00:00Z', null, 'Carla'),
            evento('TRANSICAO', 'Carla', '2026-11-02T12:00:00Z', 'ABERTO', 'EM_ATENDIMENTO'),
          ],
        }),
      ],
    })
    abrir('/univag/chamados/ONE-1')

    const itens = within(await screen.findByTestId('eventos')).getAllByRole('listitem').map((li) => li.textContent)
    // America/Cuiaba é UTC-4: 03:30Z ainda é dia 1º
    expect(itens).toEqual([
      '01/11/2026 23:30CRIACAO · Sistema · — → ABERTO',
      '02/11/2026 08:00ATRIBUICAO · Carla · — → Carla',
      '02/11/2026 08:00TRANSICAO · Carla · ABERTO → EM_ATENDIMENTO',
    ])
  })

  it('resposta pronta preenche o texto e o anexo vai junto', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, equipe],
      'GET /api/chamados/ONE-1': () => [200, daEquipe({ setorId: 5 })],
      'GET /api/respostas-prontas?setorId=5': () => [200, [{ id: 1, titulo: 'Boleto', texto: 'Seu boleto está no Portal do Aluno.' }]],
      'POST /api/chamados/ONE-1/mensagens': () => [201, daEquipe({ setorId: 5 })],
    })
    abrir('/univag/chamados/ONE-1')

    await userEvent.selectOptions(await screen.findByLabelText('Resposta pronta'), '1')
    expect(screen.getByLabelText('Responder')).toHaveValue('Seu boleto está no Portal do Aluno.')
    await userEvent.type(screen.getByLabelText('Responder'), ' Até mais.')
    const pdf = new File(['%PDF-1.4'], 'boleto.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText(/Anexos/), pdf)
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => expect(chamadas.some((c) => c.metodo === 'POST')).toBe(true))
    const corpo = chamadas.find((c) => c.metodo === 'POST')!.corpo
    expect(corpo.texto).toBe('Seu boleto está no Portal do Aluno. Até mais.')
    expect(corpo.tipo).toBe('PUBLICA')
    expect((corpo.anexos as File).name).toBe('boleto.pdf')
  })

  it('Fila vazia e Minhas solicitações vazia', async () => {
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ALUNO', 'ATENDENTE'] })], 'GET /api/chamados?escopo=fila': () => [200, []], 'GET /api/chamados?escopo=meus': () => [200, []] })
    abrir('/univag/fila')
    expect(await screen.findByText('Nenhum chamado na fila dos seus setores.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: /Minhas solicitações/ }))
    expect(await screen.findByText(/Você ainda não tem solicitações./)).toBeInTheDocument()
  })

  it('encaminhar pede setor e motivo', async () => {
    const detalhe = {
      numero: 'ONE-1', titulo: 'boleto', estado: 'ABERTO', motivoFechamento: null, setor: 'Triagem', categoria: 'Não classificado', responsavel: null,
      criadoEm: '2026-11-02T12:00:00Z', resolvidoEm: null, matricula: { numero: '2000567890', curso: 'ADS', semestre: 3 }, solicitante: 'Ana', resumo: null,
      origemCategoria: 'PADRAO', transcricao: [], mensagens: [], eventos: [], acoes: ['responder', 'nota', 'assumir', 'resolver', 'encaminhar', 'reclassificar'],
      setores: [{ id: 5, nome: 'Financeiro' }], categorias: [{ id: 3, nome: 'Boleto' }],
    }
    const chamadas = api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })],
      'GET /api/chamados/ONE-1': () => [200, detalhe],
      'POST /api/chamados/ONE-1/encaminhar': () => [200, { ...detalhe, acoes: [] }],
    })
    abrir('/univag/chamados/ONE-1')

    await userEvent.click(await screen.findByRole('button', { name: 'Encaminhar' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getByRole('button', { name: 'Encaminhar' })).toBeDisabled()
    await userEvent.selectOptions(dialogo.getByLabelText('Setor'), '5')
    await userEvent.type(dialogo.getByLabelText('Motivo'), 'É do financeiro.')
    await userEvent.click(dialogo.getByRole('button', { name: 'Encaminhar' }))

    await screen.findByText('Nenhuma resposta ainda.')
    expect(chamadas.find((c) => c.url.endsWith('/encaminhar'))?.corpo).toEqual({ setorId: 5, motivo: 'É do financeiro.' })
  })
})
