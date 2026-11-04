import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Chamado } from '../chamado'
import { formatarData } from '../datas'
import { estados } from '../test/textos'
import { abrir, api, chamado, me, type Rota } from '../test/util'

// Regra dos textos (checks.md) nas telas 7, 8 e 9 de ## Screens, com os {campos} preenchidos pelo fixture.
// "Carregando", "Resposta pronta", os ícones "Documento"/"Artigo" e o placeholder "ONE-123" não são texto visível.
const data = (iso: string) => formatarData(iso, 'America/Cuiaba')
const Estados = ['Aberto', 'Em atendimento', 'Aguardando aluno', 'Resolvido', 'Fechado']
const tela = () => screen.getByRole('main')

// Linha 9 (detalhe do chamado), com o fixture de test/util e os desta suíte
const Detalhe = [
  'ONE-1',
  'preciso do boleto',
  'Financeiro · Boleto · Carla',
  'Ana · matrícula 2000567890 · ADS · 3º semestre',
  'Resumo gerado por IA',
  'Ações',
  'Conversa com o assistente',
  '“mínima de 300 horas”',
  'Abrir o PDF (versão 2)',
  'Este documento foi atualizado depois desta resposta.',
  'Este artigo foi atualizado depois desta resposta.',
  'Atendimento',
  'Nenhuma resposta ainda.',
  'Nota interna',
  'boleto.pdf (2 KB)',
  'Inserir resposta pronta…',
  'Responder',
  'Responder (reabre a solicitação)',
  'Anexos (PDF, JPG ou PNG, até 10 MB cada)',
  'Aguardando aluno',
  'Enviar',
  'Assumir',
  'Confirmar resolução',
  'Encaminhar',
  'Cancelar solicitação',
  'Resolução',
  'Resolver',
  'Reclassificar',
  'Escolha a categoria',
  'Salvar',
  'Duplicado de outro pedido do mesmo aluno',
  'Marcar',
  'Não resolveu? Explique o motivo',
  'Rejeitar resolução',
  'Histórico',
  'Encaminhar para outro setor?',
  'O chamado volta para a fila do setor escolhido, sem responsável. O motivo fica como nota interna.',
  'Setor',
  'Escolha o setor',
  'Motivo',
  'Voltar',
  'Cancelar a solicitação?',
  'Justificativa (opcional)',
]

const Todas = ['responder', 'nota', 'assumir', 'confirmar', 'encaminhar', 'cancelar', 'resolver', 'reclassificar', 'duplicado', 'rejeitar']
const fonte = (tipo: 'ARTIGO' | 'DOCUMENTO', titulo: string) => ({
  tipo, versaoArtigoId: tipo === 'ARTIGO' ? 7 : null, versaoDocumentoId: tipo === 'DOCUMENTO' ? 42 : null, titulo, numero: 2, trechos: ['mínima de 300 horas'], atualizado: true,
})
// Equipe: resumo, fontes de documento e de artigo atualizadas, nota interna com anexo, histórico e todas as ações
const daEquipe = chamado({
  solicitante: 'Ana',
  resumo: 'Aluna pede o boleto.',
  setorId: 5,
  eventos: [{ tipo: 'TRANSICAO', ator: 'Carla', de: 'ABERTO', para: 'EM_ATENDIMENTO', detalhe: null, criadoEm: '2026-11-02T12:00:00Z' }],
  transcricao: [
    { autor: 'ALUNO', texto: 'preciso do boleto', criadaEm: '2026-11-02T12:00:00Z' },
    { autor: 'ASSISTENTE', texto: 'O boleto fica no portal.', criadaEm: '2026-11-02T12:00:05Z', fontes: [fonte('DOCUMENTO', 'Regulamento'), fonte('ARTIGO', 'Boleto do semestre')] },
  ],
  mensagens: [
    { id: 1, tipo: 'NOTA', texto: 'Aluno ligou.', autor: 'Bruno', doAluno: false, criadaEm: '2026-11-02T12:10:00Z', anexos: [{ id: 9, nome: 'boleto.pdf', tipo: 'application/pdf', tamanho: 1500 }] },
  ],
  acoes: Todas,
  setores: [{ id: 5, nome: 'Secretaria' }],
  categorias: [{ id: 3, nome: 'Matrícula' }],
})
const ValoresDaEquipe = [
  'Em atendimento', 'preciso do boleto', 'O boleto fica no portal.', 'Aluna pede o boleto.', 'Regulamento', 'Boleto do semestre', 'Aluno ligou.', 'Bruno', 'Boleto',
  'Secretaria', 'Matrícula', 'Carla mudou o estado de Aberto para Em atendimento' /* historico-legivel C8 */, data('2026-11-02T12:00:00Z'), data('2026-11-02T12:10:00Z'),
]

function detalhe(c: Chamado | Rota, quem = me({ papeis: ['ATENDENTE'], matriculas: [] }), rotas: Record<string, Rota> = {}) {
  api({ 'GET /api/auth/me': () => [200, quem], 'GET /api/chamados/ONE-1': typeof c === 'function' ? c : () => [200, c], ...rotas })
  return abrir('/univag/chamados/ONE-1')
}

describe('textos', () => {
  it('textos detalhe do chamado', async () => {
    const t = estados(Detalhe)

    // carregando: só o status, sem texto visível
    let montada = detalhe(() => new Promise(() => {}))
    await screen.findByRole('navigation')
    expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    t.conferir(tela())
    montada.unmount()

    // erro: o detail da API
    montada = detalhe(() => [404, { status: 404, detail: 'Chamado não encontrado.' }])
    await screen.findByRole('alert')
    t.conferir(tela(), ['Chamado não encontrado.'])
    montada.unmount()

    // sem respostas, como o aluno vê
    montada = detalhe(chamado({ acoes: [] }), me())
    await screen.findByText('Nenhuma resposta ainda.')
    t.conferir(tela(), ['Em atendimento', 'preciso do boleto', 'O boleto fica no portal.', data('2026-11-02T12:00:00Z')])
    montada.unmount()

    // aluno com o chamado resolvido
    montada = detalhe(chamado({ estado: 'RESOLVIDO', acoes: ['responder', 'rejeitar', 'cancelar'] }), me())
    await screen.findByLabelText('Responder (reabre a solicitação)')
    t.conferir(tela(), ['Resolvido', 'preciso do boleto', 'O boleto fica no portal.', data('2026-11-02T12:00:00Z')])
    montada.unmount()

    // equipe com todas as ações, as fontes atualizadas, a nota interna com anexo e as prontas
    montada = detalhe(daEquipe, undefined, { 'GET /api/respostas-prontas?setorId=5': () => [200, [{ id: 1, titulo: 'Boleto pronto', texto: 'Segue o boleto.' }]] })
    await screen.findByLabelText('Resposta pronta')
    expect(screen.getByLabelText('Duplicado de outro pedido do mesmo aluno')).toHaveAttribute('placeholder', 'ONE-123')
    t.conferir(tela(), [...ValoresDaEquipe, 'Boleto pronto'])

    // diálogos de confirmação
    await userEvent.click(screen.getByRole('button', { name: 'Encaminhar' }))
    t.conferir(await screen.findByRole('dialog'), ['Secretaria'])
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Voltar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitação' }))
    t.conferir(await screen.findByRole('dialog'))
    montada.unmount()

    t.todos()
  }, 30_000)

  // Linhas 7 e 8: lista de chamados nos estados carregando, vazia, com itens e erro
  async function lista(caminho: string, escopo: string, literais: string[], itens: unknown[], valores: string[]) {
    const t = estados(literais)
    const rota = (r: Rota) => api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ALUNO', 'ATENDENTE'] })], [`GET /api/chamados?escopo=${escopo}`]: r })

    rota(() => new Promise(() => {}))
    let montada = abrir(caminho)
    await screen.findByRole('heading', { level: 1 })
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
    t.conferir(tela())
    montada.unmount()

    rota(() => [200, []])
    montada = abrir(caminho)
    await screen.findByText(literais[1], { exact: false })
    t.conferir(tela())
    montada.unmount()

    rota(() => [200, itens])
    montada = abrir(caminho)
    await screen.findByText('ONE-1')
    t.conferir(tela(), valores)
    montada.unmount()

    rota(() => [500, { status: 500, detail: 'Falha ao listar.' }])
    montada = abrir(caminho)
    await screen.findByRole('alert')
    t.conferir(tela(), ['Falha ao listar.'])
    montada.unmount()

    t.todos()
  }

  const item = (n: number, estado: string, extra = {}) => ({ numero: `ONE-${n}`, titulo: `pedido ${n}`, estado, criadoEm: '2026-11-02T12:00:00Z', ...extra })
  const Numeros = ['ONE-1', 'ONE-2', 'ONE-3', 'ONE-4', 'ONE-5', 'pedido']

  it('textos Minhas solicitações', async () => {
    const itens = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_ALUNO', 'RESOLVIDO', 'FECHADO'].map((e, i) => item(i + 1, e))
    await lista('/univag/solicitacoes', 'meus', ['Minhas solicitações', 'Número', 'Título', 'Estado', 'Nenhuma solicitação', 'Você ainda não tem solicitações.', 'Falar com o assistente', ...Estados], itens, [...Numeros, '1', '2', '3', '4', '5'])
  })

  it('textos Fila', async () => {
    const itens = [
      item(1, 'ABERTO', { categoria: 'Boleto', responsavel: null, dias: 1 }),
      item(2, 'EM_ATENDIMENTO', { categoria: 'Matrícula', responsavel: 'Carla', dias: 3 }),
    ]
    await lista('/univag/fila', 'fila', ['Fila', 'Fila em dia', 'Nenhum chamado na fila dos seus setores.', 'Aberto', 'Em atendimento', 'Número', 'Título', 'Categoria', 'Responsável', 'Dias', 'Estado', 'Boleto · sem responsável · 1 dia', 'Matrícula · Carla · 3 dias', 'sem responsável', '1 dia', 'Carla', '3 dias'], itens, ['ONE-1', 'ONE-2', 'pedido', '1', '2', 'Boleto', 'Matrícula'])
  })
})
