import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me } from './test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })

describe('equipe', () => {
  it('Sem dados no período', async () => {
    const vazio = {
      semDados: true, alunosAtivos: 0, conversas: 0, taxaAutoatendimento: null, taxaEscalonamento: null, taxaAbandono: null, taxaPerguntasSemArtigo: null,
      chamadosAbertos: 0, chamadosResolvidos: 0, tempoPrimeiraRespostaHoras: null, tempoResolucaoHoras: null, roteamentoCorreto: null, taxaReabertura: null,
      principaisCategorias: { porConversas: [], porChamados: [] }, indicadorPrincipal: null,
    }
    // a consulta inicial (mês corrente) não está no mapa e responde 404; a do período escolhido devolve o vazio
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/indicadores?de=2026-10-01&ate=2026-10-31': () => [200, vazio] })
    abrir('/univag/indicadores')
    await userEvent.clear(await screen.findByLabelText('De'))
    await userEvent.type(screen.getByLabelText('De'), '2026-10-01')
    await userEvent.clear(screen.getByLabelText('Até'))
    await userEvent.type(screen.getByLabelText('Até'), '2026-10-31')
    await userEvent.click(screen.getByRole('button', { name: 'Consultar' }))

    expect(await screen.findByText('Sem dados no período')).toBeInTheDocument()
    expect(screen.queryByText('Autoatendimento')).not.toBeInTheDocument()
  })

  it('novo artigo envia perguntas e links como listas', async () => {
    const chamadas = api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/admin/artigos': () => [200, []],
      'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Acadêmico', ativa: true }, { id: 4, nome: 'Antiga', ativa: false }]],
      'POST /api/admin/artigos': () => [201, {}],
    })
    abrir('/univag/artigos')

    expect(await screen.findByText('Nenhum item cadastrado.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(dialogo.getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha a categoria', 'Acadêmico'])
    await userEvent.type(dialogo.getByLabelText('Título'), 'Faltas não são abonadas')
    await userEvent.type(dialogo.getByLabelText(/Perguntas/), 'posso abonar falta?{enter}{enter}falta com atestado?')
    await userEvent.selectOptions(dialogo.getByLabelText('Categoria'), '3')
    await userEvent.type(dialogo.getByLabelText('Resposta'), 'Faltas não são abonadas.')
    await userEvent.type(dialogo.getByLabelText(/Links/), 'https://univag.edu.br/estatuto')
    await userEvent.click(dialogo.getByRole('button', { name: 'Salvar' }))

    await screen.findByText('Nenhum item cadastrado.')
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({
      titulo: 'Faltas não são abonadas',
      perguntas: ['posso abonar falta?', 'falta com atestado?'],
      categoriaId: 3,
      resposta: 'Faltas não são abonadas.',
      links: ['https://univag.edu.br/estatuto'],
    })
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
