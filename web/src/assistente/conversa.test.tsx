import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onlineManager } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { Balao } from '../Balao'
import { separarLinks } from './Assistente'
import { abrir, api, chamado, comTexto, me, type Rota } from '../test/util'

const Exemplo = 'Respostas com base nas normas da instituição.'

function responde(tipo: string, texto: string): Rota {
  return () => [201, { conversaId: 7, resposta: { tipo, texto } }]
}

function assistente(rotas: Record<string, Rota> = {}, quem = me()) {
  const chamadas = api({ 'GET /api/auth/me': () => [200, quem], ...rotas })
  abrir('/univag/assistente')
  return chamadas
}

async function enviar(texto = 'preciso do boleto') {
  await userEvent.type(await screen.findByLabelText('Mensagem'), texto)
  await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
}

const dialogo = async () => within(await screen.findByRole('dialog'))
const confirmar = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Encerrar conversa' })
const falar = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Falar com atendente' })

describe('conversa com o assistente', () => {
  it('sem conversa: exemplo, sem Encerrar, e a mensagem do aluno à direita', async () => {
    assistente({ 'POST /api/conversas': responde('pergunta', 'É do semestre atual?') })
    expect(await screen.findByText(Exemplo)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Encerrar conversa' })).not.toBeInTheDocument()
    await enviar()
    expect(await screen.findByText('É do semestre atual?')).toBeInTheDocument()
    expect(screen.queryByText(Exemplo)).not.toBeInTheDocument()
    expect(screen.getByText('preciso do boleto').closest('.is-user, .is-assistant')).toHaveClass('ms-auto')
    expect(screen.getByText('É do semestre atual?').closest('.is-user, .is-assistant')).toHaveClass('me-auto')
  })

  it('enquanto o assistente responde, mostra digitando', async () => {
    assistente({ 'POST /api/conversas': () => new Promise(() => {}) })
    await enviar()
    expect(await screen.findByRole('status', { name: 'Digitando' })).toBeInTheDocument()
    expect(screen.getByText('digitando…')).toBeInTheDocument()
  })

  it('a segunda mensagem vai para a conversa aberta', async () => {
    const chamadas = assistente({
      'POST /api/conversas': responde('pergunta', 'É do semestre atual?'),
      'POST /api/conversas/7/mensagens': () => [200, { resposta: { tipo: 'resposta', texto: 'Está no portal.' } }],
    })
    await enviar('boleto')
    await screen.findByText('É do semestre atual?')
    await enviar('sim')
    await screen.findByText('Está no portal.')
    expect(screen.getByText('Isso resolveu?')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => [c.url, c.corpo])).toEqual([
      ['/api/conversas', { mensagem: 'boleto' }],
      ['/api/conversas/7/mensagens', { mensagem: 'sim' }],
    ])
  })

  it('Sim encerra com Que bom que resolveu', async () => {
    const chamadas = assistente({
      'POST /api/conversas': responde('resposta', 'O boleto fica no portal.'),
      'POST /api/conversas/7/avaliacao': () => [200, { desfecho: 'RESOLVIDA_AUTOATENDIMENTO' }],
    })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Sim' }))
    expect(await screen.findByText('Que bom que resolveu! Conversa encerrada.')).toBeInTheDocument()
    expect(screen.queryByText('Isso resolveu?')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mensagem')).not.toBeInTheDocument()
    expect(chamadas.find((c) => c.url.endsWith('/avaliacao'))?.corpo).toEqual({ resolveu: true })
  })

  it('depois do Não, a próxima mensagem tira o convite e pede nova avaliação', async () => {
    assistente({
      'POST /api/conversas': responde('resposta', 'O boleto fica no portal.'),
      'POST /api/conversas/7/avaliacao': () => [200, { desfecho: null }],
      'POST /api/conversas/7/mensagens': () => [200, { resposta: { tipo: 'resposta', texto: 'Use a segunda via.' } }],
    })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Não' }))
    await screen.findByText('Quer explicar melhor ou falar com um atendente?')
    expect(screen.queryByText('Isso resolveu?')).not.toBeInTheDocument()
    await enviar('não achei no portal')
    await screen.findByText('Use a segunda via.')
    expect(screen.queryByText('Quer explicar melhor ou falar com um atendente?')).not.toBeInTheDocument()
    expect(screen.getByText('Isso resolveu?')).toBeInTheDocument()
  })

  it('encerrar pede confirmação e mostra Conversa encerrada', async () => {
    const chamadas = assistente({
      'POST /api/conversas': responde('pergunta', 'É do semestre atual?'),
      'POST /api/conversas/7/encerrar': () => [200, { desfecho: 'ENCERRADA' }],
    })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Encerrar conversa' }))
    const d = await dialogo()
    expect(d.getByText('Encerrar a conversa?')).toBeInTheDocument()
    expect(d.getByText('A conversa será encerrada.')).toBeInTheDocument()
    expect(confirmar()).toBeEnabled()
    await userEvent.click(confirmar())
    expect(await screen.findByText('Conversa encerrada.')).toBeInTheDocument()
    expect(chamadas.map((c) => c.url)).toContain('/api/conversas/7/encerrar')
  })

  it('falar com atendente sem conversa leva o texto digitado como descrição', async () => {
    const chamadas = assistente({ 'POST /api/atendimento-direto': () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Triagem' }], 'GET /api/chamados/ONE-1': () => [200, chamado()] })
    await userEvent.type(await screen.findByLabelText('Mensagem'), 'x')
    await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
    const d = await dialogo()
    expect(d.getByText('Falar com um atendente?')).toBeInTheDocument()
    expect(d.getByLabelText('Descreva seu pedido')).toHaveValue('x')
    expect(d.queryByLabelText('Matrícula')).not.toBeInTheDocument()
    expect(falar()).toBeEnabled()
    await userEvent.clear(d.getByLabelText('Descreva seu pedido'))
    expect(falar()).toBeDisabled()
    await userEvent.type(d.getByLabelText('Descreva seu pedido'), '   ')
    expect(falar()).toBeDisabled()
    await userEvent.clear(d.getByLabelText('Descreva seu pedido'))
    await userEvent.click(d.getByLabelText('Descreva seu pedido'))
    await userEvent.paste('a'.repeat(2000))
    expect(falar()).toBeEnabled()
    await userEvent.click(falar())
    expect(await screen.findByText(comTexto('Sua solicitação ONE-1 foi para Triagem'))).toBeInTheDocument()
    expect(chamadas.find((c) => c.url === '/api/atendimento-direto')?.corpo).toEqual({ descricao: 'a'.repeat(2000) })
  })

  it('em conversa, falar com atendente não pede descrição', async () => {
    assistente({ 'POST /api/conversas': responde('pergunta', 'É do semestre atual?') })
    await enviar()
    await screen.findByText('É do semestre atual?')
    await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
    const d = await dialogo()
    expect(d.queryByLabelText('Descreva seu pedido')).not.toBeInTheDocument()
    expect(falar()).toBeEnabled()
    await userEvent.click(d.getByRole('button', { name: 'Voltar à conversa' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('transferido mostra o autor só nas respostas do atendente', async () => {
    assistente({
      'POST /api/conversas': responde('transferir', 'Vou transferir.'),
      'POST /api/conversas/7/transferir': () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Financeiro' }],
      'GET /api/chamados/ONE-1': () => [
        200,
        chamado({
          mensagens: [
            { id: 1, tipo: 'PUBLICA', texto: 'Olá!', autor: 'Carla', doAluno: false, criadaEm: '2026-11-02T12:10:00Z' },
            { id: 2, tipo: 'PUBLICA', texto: 'Oi.', autor: 'Ana', doAluno: true, criadaEm: '2026-11-02T12:11:00Z' },
          ],
        }),
      ],
    })
    await enviar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar transferência' }))
    await userEvent.click(falar())
    const atendente = (await screen.findByText('Olá!')).closest('.is-user, .is-assistant') as HTMLElement
    expect(within(atendente).getByText('Carla')).toBeInTheDocument()
    expect(atendente).toHaveClass('me-auto')
    const aluno = screen.getByText('Oi.').closest('.is-user, .is-assistant') as HTMLElement
    expect(within(aluno).queryByText('Ana')).not.toBeInTheDocument()
    expect(aluno).toHaveClass('ms-auto')
    expect(screen.queryByRole('button', { name: 'Confirmar transferência' })).not.toBeInTheDocument()
    expect(screen.queryByText('Conversa encerrada.')).not.toBeInTheDocument()
  })

  it('o limite conta só as mensagens do aluno, mesmo sem resposta do assistente', async () => {
    assistente({ 'POST /api/conversas': () => [503, { status: 503, detail: 'Assistente indisponível.' }] })
    for (let n = 1; n <= 9; n++) {
      await enviar(`mensagem ${n}`)
      await screen.findByText(`mensagem ${n}`)
      await waitFor(() => expect(screen.getByRole('button', { name: /Enviar/ })).toBeDisabled())
    }
    expect(screen.getByLabelText('Mensagem')).toBeInTheDocument()
    await enviar('mensagem 10')
    await screen.findByText('mensagem 10')
    await waitFor(() => expect(screen.queryByLabelText('Mensagem')).not.toBeInTheDocument())
  }, 15000)

  it('a conversa fica num log', async () => {
    assistente({ 'POST /api/conversas': responde('pergunta', 'É do semestre atual?') })
    await enviar()
    const log = within(await screen.findByRole('log'))
    expect(await log.findByText('É do semestre atual?')).toBeInTheDocument()
    const aluno = log.getByText('preciso do boleto').closest('.is-user, .is-assistant')
    expect(aluno).toHaveClass('ms-auto', 'bg-primary-subtle')
    expect(aluno).not.toHaveClass('me-auto')
    const assistenteBalao = log.getByText('É do semestre atual?').closest('.is-user, .is-assistant')
    expect(assistenteBalao).toHaveClass('me-auto')
    expect(assistenteBalao).not.toHaveClass('ms-auto', 'bg-primary-subtle')
  })

  it('resposta do modelo em texto puro', async () => {
    const Modelo = '**negrito**\n- item\n<b>x</b> &amp;'
    assistente({ 'POST /api/conversas': responde('resposta', Modelo) })
    await enviar()
    const texto = await screen.findByText((_, el) => el?.textContent === Modelo && el.classList.contains('whitespace-pre-wrap'))
    expect(texto.textContent).toBe(Modelo)
    expect(texto).toHaveClass('whitespace-pre-wrap')
    expect(texto.closest('.is-assistant')!.querySelector('strong, li, b, ul')).toBeNull()
  })

  it('sem rede o envio mostra o erro', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    api({ 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/assistente')
    await screen.findByLabelText('Mensagem')
    vi.stubGlobal('fetch', fetch)
    onlineManager.setOnline(false)
    try {
      await enviar()
      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch')
      expect(fetch).toHaveBeenCalledTimes(1)
    } finally {
      onlineManager.setOnline(true)
    }
  })

  const balao = (texto: string, props: { doAluno?: boolean; autor?: string; nota?: boolean } = {}) => {
    const { container } = render(<Balao doAluno={false} {...props} texto={texto} em="2026-11-03T12:00:00Z" fuso="America/Cuiaba" />)
    return container.querySelector('.whitespace-pre-wrap') as HTMLElement
  }

  it('quebra depois de / ? & = #', () => {
    const Link = 'https://portal.univag.edu.br/a/b?x=1&y=2#topo fim'
    const conteudo = balao(Link)
    expect(conteudo.textContent).toBe(Link)
    const antes = [...conteudo.querySelectorAll('wbr')].map((w) => w.previousSibling?.textContent?.slice(-1))
    expect(antes).toEqual(['/', '/', '/', '/', '?', '=', '&', '=', '#'])
    expect(balao('sem separador').querySelectorAll('wbr')).toHaveLength(0)
  })

  it('cantos do balão', () => {
    const caixa = (el: HTMLElement) => el.closest('.is-user, .is-assistant')!
    expect(caixa(balao('a', { doAluno: true }))).toHaveClass('rounded-2xl', 'rounded-br-sm')
    expect(caixa(balao('b'))).toHaveClass('rounded-2xl', 'rounded-bl-sm')
    expect(caixa(balao('c', { autor: 'Carla' }))).toHaveClass('rounded-2xl', 'rounded-bl-sm')
    expect(caixa(balao('e', { autor: 'Carla', nota: true }))).toHaveClass('rounded-2xl', 'rounded-bl-sm')
    expect(caixa(balao('d', { doAluno: true }))).not.toHaveClass('rounded-bl-sm')
  })

  it('balão sem HTML', () => {
    const Texto = '<b>x</b> & <img src=x>'
    const conteudo = balao(Texto)
    expect(conteudo.textContent).toBe(Texto)
    expect(conteudo.querySelector('b, img')).toBeNull()
    for (const no of conteudo.childNodes) expect(no.nodeType === Node.TEXT_NODE || no.nodeName === 'WBR', no.nodeName).toBe(true)
  })

  it.each([
    ['Gere a segunda via no portal: https://portal.edu.br/boletos.', 'Gere a segunda via no portal:', ['https://portal.edu.br/boletos']],
    ['Veja (https://a.edu.br/x) e https://b.edu.br, ou https://a.edu.br/x!', 'Veja (https://a.edu.br/x) e https://b.edu.br, ou:', ['https://a.edu.br/x']],
    ['Sem link aqui.', 'Sem link aqui.', []],
    ['Fica em Financeiro > Boletos: https://a.edu.br/b', 'Fica em Financeiro > Boletos:', ['https://a.edu.br/b']],
    ['Termina sem ponto', 'Termina sem ponto', []],
    ['Linha 1\nVeja: https://a.edu.br\nLinha 3', 'Linha 1\nVeja: https://a.edu.br\nLinha 3', []],
  ])('separarLinks(%j)', (texto, limpo, links) => {
    expect(separarLinks(texto)).toEqual({ texto: limpo, links })
  })

  it('link da resposta vira botão que abre em nova aba; o do aluno fica no texto', async () => {
    const Link = 'https://www.portal.edu.br/financeiro/boletos/'
    assistente({ 'POST /api/conversas': responde('resposta', `Gere a segunda via no portal: ${Link}`) })
    await enviar(`e esse link ${Link}`)
    const botao = await screen.findByRole('link', { name: /portal\.edu\.br\/financeiro\/boletos/ })
    expect(botao).toHaveAttribute('href', Link)
    expect(botao).toHaveAttribute('target', '_blank')
    expect(botao).toHaveAttribute('rel', 'noreferrer')
    expect(botao.closest('.is-assistant')).toHaveTextContent('Gere a segunda via no portal')
    expect(botao.closest('.is-assistant')!.querySelector('.whitespace-pre-wrap')!.textContent).toBe('Gere a segunda via no portal:')
    expect(screen.getByText(`e esse link ${Link}`)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /portal\.edu\.br/ })).toHaveLength(1)
  })
})
