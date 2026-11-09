import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { estados } from '../test/textos'
import { abrir, api, escolher, me, type Rota } from '../test/util'

const Artigos = [
  'Artigos', 'Novo', 'Orientações internas usadas pelo assistente. O aluno nunca vê os artigos, só a resposta.',
  'Indexando', 'Indexado', 'Falhou', 'Rascunho', 'Ativo', 'Arquivado', 'versão', 'válido de', 'válido até', 'Editar', 'Ativar', 'Arquivar',
  'Nenhum artigo', 'Os artigos são a base das respostas do assistente.', 'Versão', 'Validade', 'Situação',
  'Novo artigo', 'Editar artigo', 'Salvar cria uma nova versão; as anteriores ficam guardadas.',
  'O artigo nasce como rascunho e só entra na base do assistente quando for ativado.',
  'Título', 'Perguntas relacionadas (uma por linha)', 'Categoria', 'Escolha a categoria', 'Resposta', 'Links (um por linha, com https://)',
  'Válido de (opcional)', 'Válido até (opcional)', 'Cancelar', 'Salvar', 'Escolher validade no calendário',
  'Arquivar o artigo?', '“', '” sai da base do assistente. As conversas que já o citaram continuam como estão.', 'Voltar',
  'Artigo salvo.', 'Artigo ativado.', 'Artigo arquivado.',
]
const Documentos = [
  'Documentos', 'Enviar PDF', 'PDFs da instituição (regulamentos, calendários, editais) que o assistente consulta. O aluno nunca vê o documento, só a resposta.',
  'Indexado', 'Ativo', 'Arquivado', 'versão', 'página', 'páginas', 'Nova versão', 'Arquivar', 'Versão', 'Arquivo', 'Situação',
  'PDF com texto (não digitalizado), até 20 MB.', 'A nova versão de “', '” substitui a atual na busca; as anteriores ficam guardadas.',
  'Título', 'Categoria', 'Escolha a categoria', 'Arquivo PDF', 'Cancelar', 'Enviar',
  'Arquivar o documento?', '“', '” sai da base do assistente. As conversas que já o citaram continuam como estão.', 'Voltar',
  'Documento enviado.', 'Documento arquivado.',
]
const Calendario = ['novembro 2026', 'dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', ...Array.from({ length: 31 }, (_, i) => String(i + 1))]

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const tela = () => screen.getByRole('main')
const avisos = () => screen.getByRole('region', { name: /^Notificações/ })

function servir(lista: string, itens: unknown[], rotas: Record<string, Rota> = {}) {
  api({ 'GET /api/auth/me': () => [200, admin], [`GET /api/admin/${lista}`]: () => [200, itens], 'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Estágio', ativa: true }]], ...rotas })
}

const artigo = (id: number, titulo: string, estado: string, indexacao: string | null, visivelDe: string | null = null, visivelAte: string | null = null) => ({
  id, estado, indexacao, categoriaId: 3, categoria: 'Estágio', visivelDe, visivelAte,
  versao: { id: id * 10, numero: 2, titulo, perguntas: ['quantas horas?'], resposta: 'São 300 horas.', links: ['https://univag.edu.br/estagio'] },
})
const documento = (id: number, titulo: string, estado: string, paginas: number) => ({
  id, titulo, categoriaId: 3, categoria: 'Estágio', estado, indexacao: 'INDEXADO',
  versao: { id: id * 10, numero: 1, nomeArquivo: `${titulo}.pdf`, paginas, criadaEm: '2026-11-02T12:00:00Z' },
})
const diaDoCalendario = (calendario: HTMLElement, dia: number) => within(calendario).getByRole('button', { name: new RegExp(`(^|\\s)${dia} de novembro de 2026`) })

describe('textos', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 10, 10, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('textos Artigos', async () => {
    const t = estados(Artigos)

    servir('artigos', [])
    let montada = abrir('/univag/artigos')
    await screen.findByText('Os artigos são a base das respostas do assistente.')
    t.conferir(tela())
    montada.unmount()

    servir(
      'artigos',
      [
        artigo(1, 'Estágio obrigatório', 'ATIVO', 'INDEXADO', '2026-11-01', '2026-12-31'),
        artigo(2, 'Faltas', 'RASCUNHO', 'PENDENTE'),
        artigo(3, 'Prova final', 'ARQUIVADO', 'FALHOU'),
      ],
      { 'PUT /api/admin/artigos/1': () => [200, {}], 'POST /api/admin/artigos': () => [201, {}], 'POST /api/admin/artigos/2/ativar': () => [200, {}], 'POST /api/admin/artigos/1/arquivar': () => [200, {}] },
    )
    montada = abrir('/univag/artigos')
    await screen.findByText('Estágio obrigatório')
    t.conferir(tela(), ['Estágio', '2', '01/11/2026', '31/12/2026', 'Estágio obrigatório', 'Faltas', 'Prova final'])

    await userEvent.click(within(tela()).getByRole('button', { name: 'Ações de Faltas' }))
    t.conferir(await screen.findByRole('menu'))
    await userEvent.keyboard('{Escape}')
    await escolher('Estágio obrigatório', 'Editar')
    let dialogo = await screen.findByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Escolher validade no calendário' }))
    const calendario = document.querySelector('[data-slot=popover-content]') as HTMLElement
    t.conferir(calendario, Calendario)
    await userEvent.click(diaDoCalendario(calendario, 3))
    await userEvent.click(diaDoCalendario(calendario, 17))
    await userEvent.keyboard('{Escape}')
    dialogo = await screen.findByRole('dialog')
    t.conferir(dialogo, ['Estágio obrigatório', 'quantas horas?', 'São 300 horas.', 'https://univag.edu.br/estagio', 'Estágio'])
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Artigo salvo.'))
    t.conferir(avisos())

    await userEvent.click(within(tela()).getByRole('button', { name: /Novo/ }))
    t.conferir(await screen.findByRole('dialog'), ['Estágio'])
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    await escolher('Faltas', 'Ativar')
    await waitFor(() => expect(avisos()).toHaveTextContent('Artigo ativado.'))
    await escolher('Estágio obrigatório', 'Arquivar')
    t.conferir(await screen.findByRole('dialog'), ['Estágio obrigatório'])
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Artigo arquivado.'))
    t.conferir(avisos())
    montada.unmount()

    t.todos()
  })

  it('textos Documentos', async () => {
    const t = estados(Documentos)
    servir('documentos', [documento(1, 'Regulamento', 'ATIVO', 1), documento(2, 'Edital', 'ARQUIVADO', 3)], {
      'POST /api/admin/documentos': () => [201, {}],
      'POST /api/admin/documentos/1/versoes': () => [201, {}],
      'POST /api/admin/documentos/1/arquivar': () => [200, {}],
    })
    abrir('/univag/documentos')
    await screen.findByText('Regulamento')
    t.conferir(tela(), ['Estágio', '1', '3', 'Regulamento', 'Regulamento.pdf', 'Edital', 'Edital.pdf'])

    await userEvent.click(within(tela()).getByRole('button', { name: 'Ações de Regulamento' }))
    t.conferir(await screen.findByRole('menu'))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Nova versão' }))
    t.conferir(await screen.findByRole('dialog'), ['Regulamento'])
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    await userEvent.click(within(tela()).getByRole('button', { name: /Enviar PDF/ }))
    const dialogo = await screen.findByRole('dialog')
    t.conferir(dialogo, ['Estágio'])
    await userEvent.type(within(dialogo).getByLabelText('Título'), 'Novo')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Categoria'), '3')
    await userEvent.upload(within(dialogo).getByLabelText('Arquivo PDF'), new File(['%PDF-1.4'], 'r.pdf', { type: 'application/pdf' }))
    t.conferir(dialogo, ['Novo', 'Estágio', 'r.pdf'])
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Documento enviado.'))
    t.conferir(avisos())

    await escolher('Regulamento', 'Arquivar')
    t.conferir(await screen.findByRole('dialog'), ['Regulamento'])
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Documento arquivado.'))
    t.conferir(avisos())

    t.todos()
  })
})
