import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, chamado, instituicao, me, type Rota } from '../test/util'

// aparencia-instituicao S5 (AC 38 a AC 42): o assistente com a identidade e o contato da instituição.
const Perguntas = ['Como pago a mensalidade?', 'Quando abre a rematrícula?', 'Onde vejo minhas notas?', 'Como peço o histórico?']
const Exemplo = 'Pergunte, por exemplo: “Como emito o boleto do semestre?” ou “Posso abonar falta com atestado?”'
const Boleto = 'Como emito o boleto do semestre?'
const Atestado = 'Posso abonar falta com atestado?'

const completa = instituicao({
  assistente: { nome: 'Vagner', boasVindas: 'Oi! Posso ajudar com boletos e matrícula.', perguntas: Perguntas },
  imagens: { logo: null, icone: null, login: null, assistente: 4 },
})
const rotas = (inst: object, extra: Record<string, Rota> = {}) =>
  api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/instituicoes/univag': () => [200, inst], ...extra })
const resposta: Record<string, Rota> = { 'POST /api/conversas': () => [201, { conversaId: 9, resposta: { tipo: 'resposta', texto: 'Falta não é abonada.' } }] }

describe('assistente com identidade', () => {
  // C41 (AC 38)
  it('boas-vindas com nome, foto e perguntas', async () => {
    rotas(completa)
    abrir('/univag/assistente')
    const foto = await screen.findByRole('img', { name: 'Vagner' })
    expect(foto).toHaveAttribute('src', '/api/instituicoes/univag/imagens/assistente?v=4')
    expect(foto).toHaveClass('size-16', 'rounded-full') // 64 px, redonda
    expect(screen.getByText('Olá! Eu sou Vagner.')).toBeInTheDocument()
    expect(screen.getByText('Oi! Posso ajudar com boletos e matrícula.')).toBeInTheDocument()
    const sugestoes = screen.getAllByRole('button').map((b) => b.textContent!).filter((t) => Perguntas.includes(t))
    expect(sugestoes).toEqual(Perguntas)
    expect(document.querySelector('svg[data-ilustracao="conversa"]')).toBeNull()
  })

  // C41 (AC 38)
  it('boas-vindas padrão sem aparência', async () => {
    rotas(instituicao())
    abrir('/univag/assistente')
    expect(await screen.findByText('Olá! Eu sou Assistente.')).toBeInTheDocument()
    expect(document.querySelector('svg[data-ilustracao="conversa"]')).toBeInTheDocument()
    expect(screen.getByText(Exemplo)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  // C42 (AC 39)
  it('perguntas padrão', async () => {
    rotas(instituicao())
    abrir('/univag/assistente')
    await screen.findByText('Olá! Eu sou Assistente.')
    const botoes = screen.getAllByRole('button').map((b) => b.textContent)
    expect(botoes.filter((t) => t === Boleto || t === Atestado)).toEqual([Boleto, Atestado])
  })

  // C43 (AC 40)
  it('tocar na sugestão envia a pergunta', async () => {
    const chamadas = rotas(instituicao(), resposta)
    abrir('/univag/assistente')
    await userEvent.click(await screen.findByRole('button', { name: Atestado }))
    expect(await screen.findByText('Falta não é abonada.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo === 'POST').map((c) => [c.url, c.corpo])).toEqual([['/api/conversas', { mensagem: Atestado }]])
    expect(screen.getByText(Atestado)).toBeInTheDocument() // o balão do aluno
    expect(screen.queryByRole('button', { name: Boleto })).not.toBeInTheDocument() // as sugestões somem
    expect(screen.queryByText('Olá! Eu sou Assistente.')).not.toBeInTheDocument()
  })

  // C44 (AC 41)
  it('foto do assistente nos balões', async () => {
    for (const [inst, fotos] of [[completa, 1], [instituicao(), 0]] as const) {
      rotas(inst, resposta)
      const { unmount } = abrir('/univag/assistente')
      await userEvent.type(await screen.findByLabelText('Mensagem'), 'posso faltar?')
      await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
      const balao = (await screen.findByText('Falta não é abonada.')).closest('.group') as HTMLElement
      const doAluno = screen.getByText('posso faltar?').closest('.group') as HTMLElement
      expect(within(balao.parentElement!).queryAllByRole('img')).toHaveLength(fotos)
      if (fotos) {
        const foto = within(balao.parentElement!).getByRole('img', { name: 'Vagner' })
        expect(foto).toHaveClass('size-6') // 24 px
        expect(foto).toHaveAttribute('src', '/api/instituicoes/univag/imagens/assistente?v=4')
      }
      expect(doAluno.querySelector('img')).toBeNull()
      expect(doAluno.parentElement!.querySelector(':scope > img')).toBeNull() // a foto é só do balão do assistente
      expect(document.querySelectorAll('img')).toHaveLength(fotos) // só o balão do assistente
      unmount()
    }
  })

  // C45 (AC 42)
  it('contato na transferência', async () => {
    const transferida: Record<string, Rota> = {
      'POST /api/conversas': () => [201, { conversaId: 7, resposta: { tipo: 'sem_base', texto: 'Não encontrei.' } }],
      'POST /api/conversas/7/transferir': () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Financeiro' }],
      'GET /api/chamados/ONE-1': () => [200, chamado()],
    }
    const transferir = async () => {
      await userEvent.type(await screen.findByLabelText('Mensagem'), 'preciso do boleto')
      await userEvent.click(screen.getByRole('button', { name: /Enviar/ }))
      await screen.findByText('Não encontrei.')
      await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }))
      await screen.findByText('Sua solicitação ONE-1 foi para Financeiro')
    }
    const completo = { horario: 'Seg a sex, 8h às 18h', telefone: '(65) 3688-6000', email: 'atendimento@univag.edu.br' }
    const casos: [Record<string, string | null>, string[], string[]][] = [
      [completo, ['Seg a sex, 8h às 18h', '(65) 3688-6000', 'atendimento@univag.edu.br'], ['tel:6536886000', 'mailto:atendimento@univag.edu.br']],
      [{ horario: null, telefone: '(65) 3688-6000', email: null }, ['(65) 3688-6000'], ['tel:6536886000']],
      [{ horario: null, telefone: null, email: null }, [], []],
    ]
    for (const [contato, textos, links] of casos) {
      rotas(instituicao({ contato }), transferida)
      const { unmount } = abrir('/univag/assistente')
      await transferir()
      const bloco = screen.queryByRole('heading', { name: 'Contato do atendimento' })?.closest('section') ?? null
      if (textos.length === 0) expect(bloco).toBeNull()
      else {
        const dentro = within(bloco as HTMLElement)
        for (const texto of textos) expect(dentro.getByText(texto)).toBeInTheDocument()
        expect(dentro.queryAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(links)
      }
      unmount()
    }
  })
})
