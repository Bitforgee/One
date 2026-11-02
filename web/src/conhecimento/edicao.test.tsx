import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const categorias = [{ id: 3, nome: 'Estágio', ativa: true }]
const artigo = (id: number, titulo: string, estado: string, visivelDe: string | null = null, visivelAte: string | null = null) => ({
  id, estado, indexacao: null, categoriaId: 3, categoria: 'Estágio', visivelDe, visivelAte,
  versao: { id: id * 10, numero: 2, titulo, perguntas: ['quantas horas?', 'tem estágio?'], resposta: 'São 300 horas.', links: ['https://univag.edu.br/estagio'] },
})
const documento = (id: number, titulo: string, estado: string, paginas = 3) => ({
  id, titulo, categoriaId: 3, categoria: 'Estágio', estado, indexacao: 'INDEXADO',
  versao: { id: id * 10, numero: 1, nomeArquivo: `${titulo}.pdf`, paginas, criadaEm: '2026-11-02T12:00:00Z' },
})
const gravadas = (chamadas: { metodo: string; url: string; corpo: any }[]) => chamadas.filter((c) => c.metodo !== 'GET').map((c) => [c.metodo, c.url, c.corpo])
const item = async (titulo: string) => (await screen.findByText(titulo)).closest('.list-group-item') as HTMLElement
const pdf = () => new File(['%PDF-1.4'], 'regulamento.pdf', { type: 'application/pdf' })

function tela(caminho: string, lista: string, itens: unknown[], rotas: Record<string, Rota> = {}) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, admin], [`GET /api/admin/${lista}`]: () => [200, itens], 'GET /api/admin/categorias': () => [200, categorias], ...rotas })
  abrir(caminho)
  return chamadas
}

describe('artigos', () => {
  it('ativar e arquivar aparecem conforme o estado, e a validade em dd/mm/aaaa', async () => {
    tela('/univag/artigos', 'artigos', [artigo(1, 'Ativo', 'ATIVO', '2026-11-01', '2026-12-31'), artigo(2, 'Rascunho', 'RASCUNHO'), artigo(3, 'Arquivado', 'ARQUIVADO', null, '2026-10-31')])
    const ativo = await item('Ativo')
    expect(within(ativo).getByText('ATIVO').parentElement).toHaveClass('hstack', 'gap-1')
    expect(ativo).toHaveTextContent('Estágio · versão 2 · válido de 01/11/2026 · válido até 31/12/2026')
    expect(within(ativo).queryByRole('button', { name: 'Ativar' })).not.toBeInTheDocument()
    expect(within(ativo).getByRole('button', { name: 'Arquivar' })).toBeInTheDocument()
    const rascunho = await item('Rascunho')
    expect(rascunho.querySelector('.small')).toHaveTextContent(/^Estágio · versão 2$/)
    expect(within(rascunho).getByRole('button', { name: 'Ativar' })).toBeInTheDocument()
    expect(within(rascunho).getByRole('button', { name: 'Arquivar' })).toBeInTheDocument()
    const arquivado = await item('Arquivado')
    expect(arquivado.querySelector('.small')).toHaveTextContent(/^Estágio · versão 2 · válido até 31\/10\/2026$/)
    expect(within(arquivado).getByRole('button', { name: 'Ativar' })).toBeInTheDocument()
    expect(within(arquivado).queryByRole('button', { name: 'Arquivar' })).not.toBeInTheDocument()
  })

  it('editar abre o artigo preenchido e salva uma nova versão', async () => {
    const chamadas = tela('/univag/artigos', 'artigos', [artigo(1, 'Estágio obrigatório', 'ATIVO', '2026-11-01')], { 'PUT /api/admin/artigos/1': () => [200, {}] })
    await userEvent.click(within(await item('Estágio obrigatório')).getByRole('button', { name: 'Editar' }))
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Editar artigo')).toBeInTheDocument()
    expect(d.getByText('Salvar cria uma nova versão; as anteriores ficam guardadas.')).toBeInTheDocument()
    expect(d.getByLabelText(/Perguntas/)).toHaveValue('quantas horas?\ntem estágio?')
    expect(d.getByLabelText('Categoria')).toHaveValue('3')
    expect(d.getByLabelText('Válido de (opcional)')).toHaveValue('2026-11-01')
    expect(d.getByLabelText('Válido até (opcional)')).toHaveValue('')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(gravadas(chamadas)).toEqual([
        ['PUT', '/api/admin/artigos/1', { titulo: 'Estágio obrigatório', perguntas: ['quantas horas?', 'tem estágio?'], categoriaId: 3, resposta: 'São 300 horas.', links: ['https://univag.edu.br/estagio'], visivelDe: '2026-11-01', visivelAte: null }],
      ]),
    )
  })

  it('ativar grava e arquivar pede confirmação', async () => {
    const chamadas = tela('/univag/artigos', 'artigos', [artigo(2, 'Rascunho', 'RASCUNHO')], {
      'POST /api/admin/artigos/2/ativar': () => [200, {}],
      'POST /api/admin/artigos/2/arquivar': () => [200, {}],
    })
    await userEvent.click(within(await item('Rascunho')).getByRole('button', { name: 'Ativar' }))
    await waitFor(() => expect(gravadas(chamadas)).toHaveLength(1))
    await userEvent.click(within(await item('Rascunho')).getByRole('button', { name: 'Arquivar' }))
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Arquivar o artigo?')).toBeInTheDocument()
    expect(d.getByText(/“Rascunho” sai da base do assistente/)).toBeInTheDocument()
    await userEvent.click(d.getByRole('button', { name: 'Arquivar' }))
    await waitFor(() =>
      expect(gravadas(chamadas)).toEqual([
        ['POST', '/api/admin/artigos/2/ativar', {}],
        ['POST', '/api/admin/artigos/2/arquivar', {}],
      ]),
    )
  })

  it('erro ao carregar mostra o detail sem Spinner nem vazio', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/artigos': () => [500, { status: 500, detail: 'Falha ao carregar.' }], 'GET /api/admin/categorias': () => [200, categorias] })
    abrir('/univag/artigos')
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Nenhum item cadastrado.')).not.toBeInTheDocument()
  })
})

describe('documentos', () => {
  it('documento arquivado não oferece nova versão nem arquivar', async () => {
    tela('/univag/documentos', 'documentos', [documento(1, 'Edital antigo', 'ARQUIVADO')])
    const arquivado = await item('Edital antigo')
    expect(within(arquivado).getByText('ARQUIVADO')).toHaveClass('bg-dark')
    expect(arquivado).toHaveTextContent('Estágio · versão 1 · 3 páginas · Edital antigo.pdf')
    // o selo de indexação e o do estado ficam lado a lado, com um pequeno espaço
    expect(within(arquivado).getByText('Indexado').parentElement).toHaveClass('hstack', 'gap-1')
    expect(within(arquivado).queryByRole('button')).not.toBeInTheDocument()
  })

  it('novo documento leva título, categoria e o PDF', async () => {
    const chamadas = tela('/univag/documentos', 'documentos', [], { 'POST /api/admin/documentos': () => [201, {}] })
    await userEvent.click(await screen.findByRole('button', { name: /Enviar PDF/ }))
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('PDF com texto (não digitalizado), até 20 MB.')).toBeInTheDocument()
    expect(d.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    await userEvent.type(d.getByLabelText('Título'), 'Regulamento')
    await userEvent.selectOptions(d.getByLabelText('Categoria'), '3')
    await userEvent.upload(d.getByLabelText('Arquivo PDF'), pdf())
    await userEvent.click(d.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(gravadas(chamadas)).toHaveLength(1))
    const [, url, corpo] = gravadas(chamadas)[0]
    expect(url).toBe('/api/admin/documentos')
    expect(corpo.titulo).toBe('Regulamento')
    expect(corpo.categoriaId).toBe('3')
    expect((corpo.arquivo as File).name).toBe('regulamento.pdf')
  })

  it('nova versão leva só o PDF e o erro aparece dentro do diálogo', async () => {
    const chamadas = tela('/univag/documentos', 'documentos', [documento(1, 'Regulamento', 'ATIVO', 1)], {
      'POST /api/admin/documentos/1/versoes': () => [415, { status: 415, detail: 'O arquivo precisa ser um PDF.' }],
    })
    await userEvent.click(within(await item('Regulamento')).getByRole('button', { name: 'Nova versão' }))
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('A nova versão de “Regulamento” substitui a atual na busca; as anteriores ficam guardadas.')).toBeInTheDocument()
    expect(d.queryByLabelText('Título')).not.toBeInTheDocument()
    await userEvent.upload(d.getByLabelText('Arquivo PDF'), pdf())
    await userEvent.click(d.getByRole('button', { name: 'Enviar' }))
    expect(await d.findByRole('alert')).toHaveTextContent('O arquivo precisa ser um PDF.')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    const [, url, corpo] = gravadas(chamadas)[0]
    expect(url).toBe('/api/admin/documentos/1/versoes')
    expect(Object.keys(corpo)).toEqual(['arquivo'])
    expect((await item('Regulamento')).querySelector('.small')).toHaveTextContent(/· 1 página · Regulamento\.pdf$/)
  })

  it('erro ao arquivar aparece na página', async () => {
    tela('/univag/documentos', 'documentos', [documento(1, 'Regulamento', 'ATIVO')], {
      'POST /api/admin/documentos/1/arquivar': () => [409, { status: 409, detail: 'O documento já foi arquivado.' }],
    })
    await userEvent.click(within(await item('Regulamento')).getByRole('button', { name: 'Arquivar' }))
    expect(within(await screen.findByRole('dialog')).getByText('Arquivar o documento?')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('O documento já foi arquivado.')
  })
})
