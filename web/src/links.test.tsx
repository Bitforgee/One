import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Balao } from './Balao'
import { separarLinks } from './LinksDaResposta'
import { abrir, api, chamado, me } from './test/util'

const Boletos = 'https://portal.univag.edu.br/financeiro/boletos'
const Frase = 'Você também pode acessar diretamente:'

describe('links da resposta', () => {
  it.each([
    [`Você também pode acessar diretamente: ${Boletos}`, Frase, [Boletos]],
    ['Gere a segunda via no portal: https://portal.edu.br/boletos.', 'Gere a segunda via no portal:', ['https://portal.edu.br/boletos']],
    ['Fica em Financeiro > Boletos: https://a.edu.br/b', 'Fica em Financeiro > Boletos:', ['https://a.edu.br/b']],
    ['Acesse o portal https://a.edu.br/x', 'Acesse o portal:', ['https://a.edu.br/x']],
    ['Veja os dois: https://a.edu.br e https://b.edu.br', 'Veja os dois:', ['https://a.edu.br', 'https://b.edu.br']],
    ['Sem link aqui.', 'Sem link aqui.', []],
  ])('links finais viram botões e a frase termina em dois-pontos (%j)', (texto, frase, links) => {
    expect(separarLinks(texto)).toEqual({ texto: frase, links })
  })

  it('link no meio do texto fica na frase como link curto', () => {
    const meio = 'Veja https://a.edu.br/boletos para emitir a segunda via. Depois, confira o valor.'
    const { texto: frase, links } = separarLinks(meio)
    render(<Balao doAluno={false} texto={frase} comLinks em="2026-11-02T12:00:00Z" fuso="America/Cuiaba" />)
    const corpo = screen.getByText(/Depois, confira o valor/)
    expect(links).toEqual([])
    expect(corpo.textContent).toBe('Veja a.edu.br/boletos para emitir a segunda via. Depois, confira o valor.')
    const a = within(corpo).getByRole('link')
    expect(a).toHaveAttribute('href', 'https://a.edu.br/boletos')
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', 'noreferrer')
    expect(a.textContent).toBe('a.edu.br/boletos')
    expect(corpo.textContent).not.toContain('https://')

    cleanup()
    const dois = separarLinks('Veja https://a.edu.br/boletos primeiro. Depois acesse https://b.edu.br/pagar')
    expect(dois).toEqual({ texto: 'Veja https://a.edu.br/boletos primeiro. Depois acesse:', links: ['https://b.edu.br/pagar'] })
    render(<Balao doAluno={false} texto={dois.texto} comLinks em="2026-11-02T12:00:00Z" fuso="America/Cuiaba" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://a.edu.br/boletos')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('sem pontuação nem pedaço solto', () => {
    expect(separarLinks('Ficou com dúvida? https://a.edu.br/ajuda')).toEqual({ texto: 'Ficou com dúvida?', links: ['https://a.edu.br/ajuda'] })
    expect(separarLinks('Pode confirmar! https://a.edu.br/ajuda').texto).toBe('Pode confirmar!')
    expect(separarLinks('O prazo termina em 10/11 (veja https://a.edu.br/cal).')).toEqual({ texto: 'O prazo termina em 10/11.', links: ['https://a.edu.br/cal'] })
    expect(separarLinks('Regulamento, p. 12 - https://a.edu.br/reg.pdf')).toEqual({ texto: 'Regulamento, p. 12:', links: ['https://a.edu.br/reg.pdf'] })
  })

  it('texto hostil não gera HTML nem link perigoso', () => {
    const hostis = [
      'javascript:alert(1)',
      'data:text/html,<script>',
      'https://a.edu.br/"onmouseover="x',
      '<img src=x onerror=alert(1)> https://a.edu.br',
      'HTTPS://A.EDU.BR/X',
      'https://javascript:x@a.edu.br',
    ]
    for (const texto of hostis) {
      const { container } = render(<Balao doAluno={false} texto={texto} comLinks em="2026-11-02T12:00:00Z" fuso="America/Cuiaba" />)
      const corpo = container.querySelector('.whitespace-pre-wrap')!
      for (const el of corpo.querySelectorAll('*')) {
        expect(['A', 'WBR'], texto).toContain(el.tagName)
        expect([...el.attributes].filter((a) => /^on/i.test(a.name)), texto).toEqual([])
        if (el.tagName === 'A') {
          expect(el.getAttribute('href'), texto).toMatch(/^https?:\/\//i)
          expect(el.getAttribute('rel'), texto).toBe('noreferrer')
        }
      }
      cleanup()
    }
  })

  it('chat e conversa da equipe mostram os links igual', async () => {
    const resposta = `${Frase} ${Boletos}`
    api({
      'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'], matriculas: [] })],
      'GET /api/chamados/ONE-1': () => [
        200,
        chamado({
          transcricao: [
            { autor: 'ALUNO', texto: 'preciso do boleto', criadaEm: '2026-11-02T12:00:00Z' },
            { autor: 'ASSISTENTE', texto: resposta, criadaEm: '2026-11-02T12:00:05Z' },
          ],
        }),
      ],
    })
    abrir('/univag/chamados/ONE-1')
    await userEvent.click(await screen.findByRole('button', { name: /^Conversa com o assistente/ })) // a conversa vem recolhida (chat-linha-do-tempo C17)
    const equipe = (await screen.findByRole('link', { name: /portal\.univag\.edu\.br\/financeiro\/boletos/ })).closest('.is-assistant') as HTMLElement
    expect(equipe.querySelector('.whitespace-pre-wrap')!.textContent).toBe(Frase)
    expect(within(equipe).getAllByRole('link')).toHaveLength(1)
    cleanup()

    api({
      'GET /api/auth/me': () => [200, me()],
      'POST /api/conversas': () => [201, { conversaId: 7, resposta: { tipo: 'resposta', texto: resposta } }],
    })
    abrir('/univag/assistente')
    await userEvent.type(await screen.findByLabelText('Mensagem'), 'boleto')
    await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
    const chat = (await screen.findByRole('link', { name: /portal\.univag\.edu\.br\/financeiro\/boletos/ })).closest('.is-assistant') as HTMLElement
    expect(chat.querySelector('.whitespace-pre-wrap')!.textContent).toBe(Frase)
    expect(within(chat).getAllByRole('link')).toHaveLength(1)
  })
})
