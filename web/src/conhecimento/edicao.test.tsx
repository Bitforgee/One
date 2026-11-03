import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, acoesDe, api, escolher, me, type Rota } from '../test/util'

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
const item = async (titulo: string) => (await screen.findByText(titulo)).closest('tr') as HTMLElement
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
    expect(within(ativo).getByText('ATIVO').parentElement).toHaveClass('flex', 'gap-1')
    expect(ativo).toHaveTextContent('Estágio · versão 2 · válido de 01/11/2026 · válido até 31/12/2026')
    expect(await acoesDe('Ativo')).toEqual(['Editar', 'Arquivar!'])
    const rascunho = await item('Rascunho')
    expect(rascunho.querySelector('.text-xs')).toHaveTextContent(/^Estágio · versão 2$/)
    expect(await acoesDe('Rascunho')).toEqual(['Editar', 'Ativar', 'Arquivar!'])
    const arquivado = await item('Arquivado')
    expect(arquivado.querySelector('.text-xs')).toHaveTextContent(/^Estágio · versão 2 · válido até 31\/10\/2026$/)
    expect(await acoesDe('Arquivado')).toEqual(['Editar', 'Ativar'])
  })

  it('editar abre o artigo preenchido e salva uma nova versão', async () => {
    const chamadas = tela('/univag/artigos', 'artigos', [artigo(1, 'Estágio obrigatório', 'ATIVO', '2026-11-01')], { 'PUT /api/admin/artigos/1': () => [200, {}] })
    await escolher('Estágio obrigatório', 'Editar')
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
    await escolher('Rascunho', 'Ativar')
    await waitFor(() => expect(gravadas(chamadas)).toHaveLength(1))
    await escolher('Rascunho', 'Arquivar')
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
    expect(within(arquivado).getByText('ARQUIVADO')).toHaveClass('bg-foreground')
    expect(arquivado).toHaveTextContent('Estágio · versão 1 · 3 páginas · Edital antigo.pdf')
    // o selo de indexação e o do estado ficam lado a lado, com um pequeno espaço
    expect(within(arquivado).getByText('Indexado').parentElement).toHaveClass('flex', 'gap-1')
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
    await escolher('Regulamento', 'Nova versão')
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
    expect((await item('Regulamento')).querySelector('.text-xs')).toHaveTextContent(/· 1 página · Regulamento\.pdf$/)
  })

  it('erro ao arquivar aparece na página', async () => {
    tela('/univag/documentos', 'documentos', [documento(1, 'Regulamento', 'ATIVO')], {
      'POST /api/admin/documentos/1/arquivar': () => [409, { status: 409, detail: 'O documento já foi arquivado.' }],
    })
    await escolher('Regulamento', 'Arquivar')
    expect(within(await screen.findByRole('dialog')).getByText('Arquivar o documento?')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('O documento já foi arquivado.')
  })
})

// S7: toasts, editor Tiptap de texto puro, calendário e Dropzone
// a gravação do teste anterior pode terminar depois dele e o toast cair na tela deste (o Sonner é um singleton)
const toastsAtrasados = () => new Promise((r) => setTimeout(r, 50))
const avisos = () => screen.getByRole('region', { name: /^Notificações/ })
const comResposta = (id: number, resposta: string) => {
  const a = artigo(id, 'Estágio obrigatório', 'ATIVO')
  return { ...a, versao: { ...a.versao, resposta } }
}
const editor = async () => within(await screen.findByRole('dialog')).getByRole('textbox', { name: 'Resposta' })
async function editarArtigo(resposta: string, rotas: Record<string, Rota> = {}) {
  const chamadas = tela('/univag/artigos', 'artigos', [comResposta(1, resposta)], { 'PUT /api/admin/artigos/1': () => [200, {}], ...rotas })
  await escolher('Estágio obrigatório', 'Editar')
  await editor()
  return chamadas
}
const salvo = async (chamadas: ReturnType<typeof tela>) => {
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }))
  await waitFor(() => expect(gravadas(chamadas)).toHaveLength(1))
  return gravadas(chamadas)[0][2].resposta
}

describe('toasts', () => {
  // C67 (AC 41, door 13)
  it('toasts de artigo só no sucesso', async () => {
    await toastsAtrasados()
    tela('/univag/artigos', 'artigos', [artigo(1, 'Rascunho', 'RASCUNHO'), artigo(2, 'Ativo', 'ATIVO')], {
      'PUT /api/admin/artigos/2': () => [422, { status: 422, detail: 'Título repetido.' }],
      'PUT /api/admin/artigos/1': () => [200, {}],
      'POST /api/admin/artigos/1/ativar': () => [200, {}],
      'POST /api/admin/artigos/1/arquivar': () => [200, {}],
    })
    // salvar com 422: o detail no alert do diálogo e nenhum toast
    await escolher('Ativo', 'Editar')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Salvar' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Título repetido.')
    expect(avisos()).not.toHaveTextContent('Artigo salvo.')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    await escolher('Rascunho', 'Editar')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Artigo salvo.'))
    await escolher('Rascunho', 'Ativar')
    await waitFor(() => expect(avisos()).toHaveTextContent('Artigo ativado.'))
    await escolher('Rascunho', 'Arquivar')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Artigo arquivado.'))
  })

  // C68 (AC 42, door 13)
  it('toasts de documento só no sucesso', async () => {
    await toastsAtrasados()
    tela('/univag/documentos', 'documentos', [documento(1, 'Regulamento', 'ATIVO'), documento(2, 'Edital', 'ATIVO')], {
      'POST /api/admin/documentos/1/arquivar': () => [200, {}],
      'POST /api/admin/documentos/2/arquivar': () => [409, { status: 409, detail: 'O documento já foi arquivado.' }],
      'POST /api/admin/documentos': () => [201, {}],
    })
    await userEvent.click(await screen.findByRole('button', { name: /Enviar PDF/ }))
    const d = within(await screen.findByRole('dialog'))
    await userEvent.type(d.getByLabelText('Título'), 'Novo')
    await userEvent.selectOptions(d.getByLabelText('Categoria'), '3')
    await userEvent.upload(d.getByLabelText('Arquivo PDF'), pdf())
    await userEvent.click(d.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Documento enviado.'))

    await escolher('Edital', 'Arquivar')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('O documento já foi arquivado.')
    expect(avisos()).not.toHaveTextContent('Documento arquivado.')

    await escolher('Regulamento', 'Arquivar')
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Arquivar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Documento arquivado.'))
  })
})

describe('editor Resposta', () => {
  // C70 (AC 55, door 14)
  it('resposta é o texto digitado sem marcação', async () => {
    const chamadas = tela('/univag/artigos', 'artigos', [], { 'POST /api/admin/artigos': () => [201, {}] })
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }))
    const d = within(await screen.findByRole('dialog'))
    await userEvent.type(d.getByLabelText('Título'), 'Marcas')
    await userEvent.selectOptions(d.getByLabelText('Categoria'), '3')
    await userEvent.type(await editor(), '<b>x</b> &amp; **y**{enter}fim')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(gravadas(chamadas)).toHaveLength(1))
    expect(gravadas(chamadas)[0][2].resposta).toBe('<b>x</b> &amp; **y**\nfim')
  })

  // C71 (AC 56)
  it('resposta sem mudança volta igual', async () => {
    for (const resposta of ['a\n\nb', 'a  b', ' a ', 'a\n', '', '<b>x</b>', '**x**', '&amp;']) {
      const chamadas = await editarArtigo(resposta)
      expect(await salvo(chamadas), JSON.stringify(resposta)).toBe(resposta)
      cleanup()
    }
  })

  // C72 (AC 57)
  it('colar formatado fica só o texto', async () => {
    const chamadas = await editarArtigo('')
    const dados: Record<string, string> = { 'text/html': '<b>negrito</b> e <i>itálico</i>', 'text/plain': 'negrito e itálico' }
    fireEvent.paste(await editor(), { clipboardData: { types: Object.keys(dados), files: [], items: [], getData: (tipo: string) => dados[tipo] ?? '' } })
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Resposta' })).toHaveTextContent('negrito e itálico'))
    expect((await editor()).querySelectorAll('strong, b, em, i')).toHaveLength(0)
    expect(await salvo(chamadas)).toBe('negrito e itálico')
  })

  // C73 (AC 58)
  it('editor Resposta acessível', async () => {
    tela('/univag/artigos', 'artigos', [])
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }))
    const campo = within(await screen.findByRole('dialog')).getByRole('textbox', { name: 'Resposta' })
    expect(campo).toHaveAttribute('aria-multiline', 'true')
    expect(campo).toHaveAttribute('contenteditable', 'true')
  })

  // C74 (AC 59)
  it('Resposta para em 8000 caracteres', async () => {
    const chamadas = await editarArtigo('a'.repeat(7999))
    // o jsdom põe o cursor no começo do texto: o teste o leva ao fim, como quem clica depois do último caractere
    const campo = await editor()
    campo.focus()
    window.getSelection()!.collapse(campo.querySelector('p')!.firstChild, 7999)
    await userEvent.type(campo, 'bc', { skipClick: true })
    expect(await salvo(chamadas)).toBe('a'.repeat(7999) + 'b')
  })
})

describe('validade e arquivo', () => {
  afterEach(() => vi.useRealTimers())

  // C75 (AC 60, AC 53, door 15)
  it('validade pelo calendário só grava no Salvar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 10, 10, 0))
    const chamadas = tela('/univag/artigos', 'artigos', [], { 'POST /api/admin/artigos': () => [201, {}] })
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }))
    const d = within(await screen.findByRole('dialog'))
    await userEvent.type(d.getByLabelText('Título'), 'Prazo')
    await userEvent.selectOptions(d.getByLabelText('Categoria'), '3')
    const antes = chamadas.length
    await userEvent.click(d.getByRole('button', { name: 'Escolher validade no calendário' }))
    const popover = document.querySelector('[data-slot=popover-content]') as HTMLElement
    const calendario = within(popover)
    await userEvent.click(calendario.getByRole('button', { name: /(^|\s)3 de novembro de 2026/ }))
    await userEvent.click(calendario.getByRole('button', { name: /(^|\s)17 de novembro de 2026/ }))
    expect(d.getByLabelText('Válido de (opcional)')).toHaveValue('2026-11-03')
    expect(d.getByLabelText('Válido até (opcional)')).toHaveValue('2026-11-17')
    expect(chamadas).toHaveLength(antes)
    expect(popover).toHaveTextContent('novembro')
    expect(popover).toHaveTextContent('2026')
    const dias = Array.from(calendario.getByRole('grid').querySelectorAll('thead th')).map((h) => h.getAttribute('aria-label') ?? h.textContent)
    ;['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].forEach((inicio, i) => expect(dias[i], inicio).toMatch(new RegExp(`^${inicio}`)))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(gravadas(chamadas)).toHaveLength(1))
    expect(gravadas(chamadas)[0][2]).toMatchObject({ visivelDe: '2026-11-03', visivelAte: '2026-11-17' })
  })

  // C77 (door 11)
  it('soltar PDF em Arquivo PDF envia o arquivo', async () => {
    const chamadas = tela('/univag/documentos', 'documentos', [], { 'POST /api/admin/documentos': () => [201, {}] })
    await userEvent.click(await screen.findByRole('button', { name: /Enviar PDF/ }))
    const d = within(await screen.findByRole('dialog'))
    const campo = d.getByLabelText('Arquivo PDF')
    expect(campo).toHaveAttribute('type', 'file')
    expect(campo).toHaveAttribute('accept', '.pdf,application/pdf')
    expect(campo).not.toHaveAttribute('aria-label')
    await userEvent.type(d.getByLabelText('Título'), 'Soltado')
    await userEvent.selectOptions(d.getByLabelText('Categoria'), '3')
    const arquivo = new File(['%PDF-1.4'], 'r.pdf', { type: 'application/pdf' })
    fireEvent.drop(campo.parentElement as HTMLElement, { dataTransfer: { files: [arquivo], items: [{ kind: 'file', type: arquivo.type, getAsFile: () => arquivo }], types: ['Files'] } })
    await waitFor(() => expect(d.getByRole('button', { name: 'Enviar' })).toBeEnabled())
    await userEvent.click(d.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(gravadas(chamadas)).toHaveLength(1))
    expect(gravadas(chamadas)[0][1]).toBe('/api/admin/documentos')
    expect((gravadas(chamadas)[0][2].arquivo as File).name).toBe('r.pdf')
  })
})
