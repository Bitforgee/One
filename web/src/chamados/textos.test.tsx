import { readFileSync } from 'node:fs'
import path from 'node:path'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { frase, type Chamado } from '../chamado'
import { formatarData } from '../datas'
import { estados } from '../test/textos'
import { abrir, api, chamado, me, type Rota } from '../test/util'

const data = (iso: string) => formatarData(iso, 'America/Cuiaba')
const Estados = ['Aberto', 'Em atendimento', 'Aguardando aluno', 'Resolvido', 'Fechado']
const tela = () => screen.getByRole('main')

const Detalhe = [
  'ONE-1',
  'preciso do boleto',
  'Financeiro · Boleto · Carla',
  'Ana · matrícula 2000567890 · ADS · 3º semestre',
  'Dados do aluno',
  'Resumo gerado por IA',
  'Ações',
  'Conversa com o assistente · 2 mensagens',
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
  'Eventos',
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
const daEquipe = chamado({
  solicitante: 'Ana',
  resumo: 'Aluna pede o boleto.',
  setorId: 5,
  eventos: [{ tipo: 'TRANSICAO', ator: 'Carla', doAluno: false, de: 'ABERTO', para: 'EM_ATENDIMENTO', detalhe: null, criadoEm: '2026-11-02T12:00:00Z' }],
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

    let montada = detalhe(() => new Promise(() => {}))
    await screen.findByRole('navigation')
    expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    t.conferir(tela())
    montada.unmount()

    montada = detalhe(() => [404, { status: 404, detail: 'Chamado não encontrado.' }])
    await screen.findByRole('alert')
    t.conferir(tela(), ['Chamado não encontrado.'])
    montada.unmount()

    montada = detalhe(chamado({ acoes: [] }), me())
    await screen.findByText('Nenhuma resposta ainda.')
    t.conferir(tela(), ['Em atendimento', 'preciso do boleto', 'O boleto fica no portal.', data('2026-11-02T12:00:00Z')])
    montada.unmount()

    montada = detalhe(chamado({ estado: 'RESOLVIDO', acoes: ['responder', 'rejeitar', 'cancelar'] }), me())
    await screen.findByLabelText('Responder (reabre a solicitação)')
    t.conferir(tela(), ['Resolvido', 'preciso do boleto', 'O boleto fica no portal.', data('2026-11-02T12:00:00Z')])
    montada.unmount()

    montada = detalhe(daEquipe, undefined, { 'GET /api/respostas-prontas?setorId=5': () => [200, [{ id: 1, titulo: 'Boleto pronto', texto: 'Segue o boleto.' }]] })
    await screen.findByLabelText('Resposta pronta')
    await userEvent.click(await screen.findByRole('button', { name: /^Conversa com o assistente/ })) // a conversa vem recolhida (chat-linha-do-tempo C17)
    expect(screen.getByLabelText('Duplicado de outro pedido do mesmo aluno')).toHaveAttribute('placeholder', 'ONE-123')
    t.conferir(tela(), [...ValoresDaEquipe, 'Boleto pronto'])

    await userEvent.click(screen.getByRole('button', { name: 'Encaminhar' }))
    t.conferir(await screen.findByRole('dialog'), ['Secretaria'])
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Voltar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitação' }))
    t.conferir(await screen.findByRole('dialog'))
    montada.unmount()

    t.todos()
  }, 30_000)

  afterEach(() => {
    vi.useRealTimers()
  })

  async function lista(caminho: string, escopo: string, literais: string[], itens: unknown[], valores: string[]) {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-05T15:00:00Z'))
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
    t.conferir(tela(), [`Não foi possível carregar ${escopo === 'fila' ? 'a fila' : 'suas solicitações'}. Verifique sua conexão.`, 'Tentar de novo'])
    montada.unmount()

    t.todos()
  }

  const item = (n: number, estado: string, extra = {}) => ({ numero: `ONE-${n}`, titulo: `pedido ${n}`, estado, criadoEm: '2026-11-02T12:00:00Z', ...extra })
  const Numeros = ['ONE-1', 'ONE-2', 'ONE-3', 'ONE-4', 'ONE-5', 'pedido']

  it('textos Minhas solicitações', async () => {
    const itens = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_ALUNO', 'RESOLVIDO', 'FECHADO'].map((e, i) => item(i + 1, e))
    await lista('/univag/solicitacoes', 'meus', ['Minhas solicitações', 'Número', 'Título', 'Estado', 'Nenhuma solicitação', 'Você ainda não tem solicitações.', 'Falar com o assistente', 'aberto há 3 dias', 'A equipe vai responder', 'Responda para continuar', 'Resolvida', 'Encerrada', ...Estados], itens, [...Numeros, '1', '2', '3', '4', '5'])
  })

  it('todo tipo de evento tem frase', () => {
    const glossario = readFileSync(path.resolve(process.cwd(), '../.specs/GLOSSARIO.md'), 'utf8')
    const tipos = [...glossario.matchAll(/^\| `([A-Z_]+)` \| tipo de evento \|/gm)].map((m) => m[1])
    expect(tipos).toContain('SUBIDA')
    expect(tipos.length).toBeGreaterThanOrEqual(10)
    for (const tipo of tipos) {
      const texto = frase({ tipo, ator: 'Ana', doAluno: false, de: 'A', para: 'B', detalhe: null, criadoEm: '2026-11-02T12:00:00Z' })
      expect(texto, tipo).not.toBe(`Ana · ${tipo}`)
      expect(texto, tipo).toMatch(/^Ana /)
    }
  })

  it('textos Fila', async () => {
    const itens = [
      item(1, 'ABERTO', { categoria: 'Boleto', responsavel: null, dias: 1 }),
      item(2, 'EM_ATENDIMENTO', { categoria: 'Matrícula', responsavel: 'Carla', dias: 3 }),
    ]
    await lista('/univag/fila', 'fila', ['Fila', 'Fila em dia', 'Nenhum chamado na fila dos seus setores.', 'Aberto', 'Em atendimento', 'Número', 'Título', 'Categoria', 'Responsável', 'Aberto', 'Estado', 'Mais antigos primeiro', 'Boleto · sem responsável · aberto há 3 dias', 'Matrícula · Carla · aberto há 3 dias', 'sem responsável', 'aberto há 3 dias', 'há 3 dias', 'Carla'], itens, ['ONE-1', 'ONE-2', 'pedido', '1', '2', 'Boleto', 'Matrícula'])
  })
})
