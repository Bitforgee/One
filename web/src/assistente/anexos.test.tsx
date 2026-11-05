import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const Ajuda = 'PDF ou foto, até 10 MB'

const responde: Rota = () => [201, { conversaId: 7, resposta: { tipo: 'pergunta', texto: 'É do semestre atual?' } }]

function assistente(rotas: Record<string, Rota> = {}) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, me()], ...rotas })
  abrir('/univag/assistente')
  return chamadas
}

const arquivo = (nome: string, tipo = 'image/png') => new File(['conteudo'], nome, { type: tipo })
const seletor = () => document.querySelector<HTMLInputElement>('input[type="file"]')!
const selos = () => within(screen.getByRole('list', { name: 'Arquivos escolhidos' })).getAllByRole('listitem').map((s) => s.textContent)
const anexar = () => screen.getByRole('button', { name: 'Anexar arquivo' })

async function escolher(...nomes: string[]) {
  await screen.findByLabelText('Mensagem')
  await userEvent.upload(seletor(), nomes.map((n) => arquivo(n, n.endsWith('.pdf') ? 'application/pdf' : 'image/png')))
}

async function enviar(texto = 'esse boleto está certo?') {
  await userEvent.type(await screen.findByLabelText('Mensagem'), texto)
  await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
}

describe('anexos na conversa com o assistente', () => {
  // anexos-assistente C28 (AC 21)
  it('botão Anexar arquivo abre o seletor de PDF, JPG e PNG', async () => {
    assistente()
    await screen.findByLabelText('Mensagem')
    const campo = seletor()
    expect(campo).toHaveAttribute('accept', '.pdf,.jpg,.jpeg,.png')
    expect(campo).toHaveAttribute('multiple')
    const abriu = vi.spyOn(campo, 'click')

    await userEvent.click(anexar())

    expect(abriu).toHaveBeenCalledTimes(1)
    expect(anexar().closest('form')).not.toBeNull()
    // mesma linha: o botão e o campo "Mensagem" dividem o contêiner flex de linha
    const linha = anexar().parentElement!
    expect(linha).toContainElement(screen.getByLabelText('Mensagem'))
    expect(linha).toHaveClass('flex')
    expect(linha).not.toHaveClass('flex-col')
  })

  // C29 (AC 22)
  it('selos dos arquivos escolhidos e remover', async () => {
    assistente()
    await escolher('boleto.png', 'comprovante.pdf')

    expect(selos()).toEqual(['boleto.png', 'comprovante.pdf'])
    expect(screen.getByRole('button', { name: 'Remover boleto.png' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover comprovante.pdf' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remover boleto.png' }))

    expect(selos()).toEqual(['comprovante.pdf'])
    expect(screen.queryByRole('button', { name: 'Remover boleto.png' })).not.toBeInTheDocument()
  })

  // C30 (AC 23)
  it('Anexar arquivo desabilitado com 3 anexos na conversa', async () => {
    assistente({
      'POST /api/conversas': responde,
      'GET /api/conversas/7': () => [200, { mensagens: [{ autor: 'ALUNO', anexos: [{ id: 1, nome: 'a.png', tipo: 'image/png', tamanho: 8 }, { id: 2, nome: 'b.png', tipo: 'image/png', tamanho: 8 }] }] }],
    })
    await escolher('a.png', 'b.png')
    expect(anexar()).toBeEnabled()
    await escolher('c.png')
    expect(anexar()).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Remover c.png' }))
    expect(anexar()).toBeEnabled()

    // 2 já enviados e 1 escolhido
    await enviar()
    await screen.findByText('É do semestre atual?')
    expect(anexar()).toBeEnabled()
    await escolher('c.png')
    expect(anexar()).toBeDisabled()
  })

  // C31 (AC 24)
  it('envio com anexos vai em FormData e o balão mostra os links', async () => {
    const chamadas = assistente({
      'POST /api/conversas': responde,
      'GET /api/conversas/7': () => [200, { mensagens: [{ autor: 'ALUNO', texto: 'x', anexos: [{ id: 41, nome: 'boleto.png', tipo: 'image/png', tamanho: 2048 }, { id: 42, nome: 'extrato.pdf', tipo: 'application/pdf', tamanho: 4096 }] }, { autor: 'ASSISTENTE', anexos: [] }] }],
    })
    const corpos: unknown[] = []
    const base = fetch as unknown as (url: string, init?: RequestInit) => Promise<Response>
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/conversas') corpos.push(init?.body)
      return base(url, init)
    }))
    await escolher('boleto.png', 'extrato.pdf')

    await enviar()

    const balao = (await screen.findByText('esse boleto está certo?')).closest('.is-user, .is-assistant') as HTMLElement
    await waitFor(() => expect(within(balao).getAllByRole('link')).toHaveLength(2))
    expect(within(balao).getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['boleto.png', '/api/conversas/anexos/41'],
      ['extrato.pdf', '/api/conversas/anexos/42'],
    ])
    const form = corpos[0] as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('mensagem')).toBe('esse boleto está certo?')
    expect((form.getAll('anexos') as File[]).map((f) => f.name)).toEqual(['boleto.png', 'extrato.pdf'])
    expect(screen.queryByRole('list', { name: 'Arquivos escolhidos' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Mensagem')).toHaveValue('')
    expect(chamadas.filter((c) => c.metodo === 'POST')).toHaveLength(1)
  })

  // C32 (AC 24)
  it('sem anexo o envio continua em JSON', async () => {
    const chamadas = assistente({ 'POST /api/conversas': responde })
    await enviar('preciso do boleto')
    await screen.findByText('É do semestre atual?')

    expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => [c.url, c.corpo])).toEqual([['/api/conversas', { mensagem: 'preciso do boleto' }]])
    expect(chamadas.some((c) => c.url === '/api/conversas/7')).toBe(false)
  })

  // C33 (AC 25)
  it('erro da API mantém texto e selos', async () => {
    for (const [status, detail] of [
      [400, 'A conversa aceita até 3 anexos.'],
      [413, 'O arquivo boleto.png passa de 10 MB.'],
      [415, 'O arquivo boleto.png não é PDF, JPG nem PNG.'],
      [503, 'Armazenamento de arquivos indisponível.'],
    ] as const) {
      assistente({ 'POST /api/conversas': () => [status, { status, detail }] })
      await escolher('boleto.png')
      await enviar('esse boleto está certo?')

      expect(await screen.findByRole('alert')).toHaveTextContent(detail)
      expect(screen.getByLabelText('Mensagem')).toHaveValue('esse boleto está certo?')
      expect(selos()).toEqual(['boleto.png'])
      expect(within(screen.getByRole('log')).queryByRole('link')).not.toBeInTheDocument()
      cleanup()
    }
  })

  // C34 (AC 26)
  it('texto de ajuda dos anexos', async () => {
    assistente()
    const campo = await screen.findByLabelText('Mensagem')
    expect(screen.queryByText(Ajuda)).not.toBeInTheDocument()
    await escolher('foto.png')
    const ajuda = await screen.findByText(Ajuda)

    // abaixo do campo: vem depois dele no documento
    expect(campo.compareDocumentPosition(ajuda) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
