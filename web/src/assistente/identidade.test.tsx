import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrir, api, instituicao, me, type Rota } from '../test/util'

const Frase = 'Respostas com base nas normas da instituição.'
const Oi = 'Oi! Posso ajudar com boletos e matrícula.'
const Nome = 'Centro Universitário de Várzea Grande'
const rotas = (inst: object, extra: Record<string, Rota> = {}) => api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/instituicoes/univag': () => [200, inst], ...extra })
const pausa = () => new Promise((r) => setTimeout(r, 30))

describe('boas-vindas do assistente', () => {
  it('boas-vindas institucional sem Olá Eu sou', async () => {
    const casos: [Record<string, unknown>, string, string][] = [
      [{ nomeCurto: 'Univag', assistente: { nome: null, boasVindas: Oi, perguntas: [] } }, 'Atendimento ao estudante · Univag', Oi],
      [{ nomeCurto: 'Univag' }, 'Atendimento ao estudante · Univag', Frase],
      [{ assistente: { nome: null, boasVindas: Oi, perguntas: [] } }, `Atendimento ao estudante · ${Nome}`, Oi],
      [{}, `Atendimento ao estudante · ${Nome}`, Frase],
    ]
    for (const [parcial, titulo, frase] of casos) {
      rotas(instituicao({ nome: Nome, ...parcial }))
      const { unmount } = abrir('/univag/assistente')
      expect(await screen.findByRole('heading', { level: 2, name: titulo }), titulo).toBeInTheDocument()
      expect(screen.getByText(frase), frase).toBeInTheDocument()
      expect(screen.queryByText(/Olá! Eu sou/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Pergunte, por exemplo/)).not.toBeInTheDocument()
      expect(document.querySelector('svg[data-ilustracao]')).toBeNull()
      unmount()
    }
  })

  it('assistente virtual com e sem foto', async () => {
    const foto = '/api/instituicoes/univag/imagens/assistente?v=4'
    const casos: [Record<string, unknown>, string, boolean][] = [
      [{ assistente: { nome: 'Vagner', boasVindas: null, perguntas: [] }, imagens: { logo: null, icone: null, login: null, assistente: 4 } }, 'Vagner, assistente virtual', true],
      [{ assistente: { nome: 'Vagner', boasVindas: null, perguntas: [] } }, 'Vagner, assistente virtual', false],
      [{}, 'Assistente virtual', false],
    ]
    for (const [parcial, texto, comFoto] of casos) {
      rotas(instituicao(parcial))
      const { unmount } = abrir('/univag/assistente')
      expect(await screen.findByText(texto), texto).toBeInTheDocument()
      expect(document.querySelectorAll('img'), texto).toHaveLength(comFoto ? 1 : 0)
      if (comFoto) expect(document.querySelector('img')).toHaveAttribute('src', foto)
      unmount()
    }
  })

  it('solicitação em aberto antes das perguntas', async () => {
    const item = (numero: string, estado: string, criadoEm = '2026-11-02T12:00:00Z') => ({ numero, titulo: 'preciso do boleto', estado, criadoEm })
    const casos: [string, () => ReturnType<Rota>, [string, string, string] | null][] = [
      ['ABERTO', () => [200, [item('ONE-5', 'ABERTO')]], ['ONE-5', 'Sua solicitação ONE-5 · Aberto', 'A equipe vai responder']],
      ['EM_ATENDIMENTO', () => [200, [item('ONE-5', 'EM_ATENDIMENTO')]], ['ONE-5', 'Sua solicitação ONE-5 · Em atendimento', 'A equipe vai responder']],
      ['AGUARDANDO_ALUNO', () => [200, [item('ONE-5', 'AGUARDANDO_ALUNO')]], ['ONE-5', 'Sua solicitação ONE-5 · Aguardando aluno', 'Responda para continuar']],
      ['RESOLVIDO', () => [200, [item('ONE-5', 'RESOLVIDO')]], null],
      ['FECHADO', () => [200, [item('ONE-5', 'FECHADO')]], null],
      ['vazia', () => [200, []], null],
      ['várias', () => [200, [item('ONE-5', 'ABERTO', '2026-11-03T12:00:00Z'), item('ONE-9', 'RESOLVIDO', '2026-11-05T12:00:00Z'), item('ONE-7', 'AGUARDANDO_ALUNO', '2026-11-04T12:00:00Z')]], ['ONE-7', 'Sua solicitação ONE-7 · Aguardando aluno', 'Responda para continuar']],
      ['500', () => [500, { status: 500, detail: 'Falha.' }], null],
    ]
    for (const [rotulo, rota, esperado] of casos) {
      const chamadas = rotas(instituicao(), { 'GET /api/chamados?escopo=meus': rota })
      const { unmount } = abrir('/univag/assistente')
      await screen.findByRole('heading', { level: 2, name: 'Atendimento ao estudante · Univag' })
      if (esperado) {
        const link = await screen.findByRole('link', { name: new RegExp(`Sua solicitação ${esperado[0]} `) })
        expect(link, rotulo).toHaveAttribute('href', `/univag/chamados/${esperado[0]}`)
        expect(link).toHaveTextContent(esperado[1])
        expect(link).toHaveTextContent(esperado[2])
        expect(screen.getAllByRole('link', { name: /Sua solicitação/ }), rotulo).toHaveLength(1)
        const pergunta = screen.getByRole('button', { name: 'Como emito o boleto do semestre?' })
        expect(link.compareDocumentPosition(pergunta) & Node.DOCUMENT_POSITION_FOLLOWING, rotulo).toBeTruthy()
      } else {
        await pausa()
        expect(chamadas.some((c) => c.url === '/api/chamados?escopo=meus'), rotulo).toBe(true)
        expect(screen.queryByText(/Sua solicitação/), rotulo).not.toBeInTheDocument()
        expect(screen.queryByRole('alert'), rotulo).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Como emito o boleto do semestre?' })).toBeInTheDocument()
      }
      unmount()
    }
  })

  it('perguntas com MessageCircleQuestion e ChevronRight', async () => {
    rotas(instituicao())
    abrir('/univag/assistente')
    const linhas = [await screen.findByRole('button', { name: 'Como emito o boleto do semestre?' }), screen.getByRole('button', { name: 'Posso abonar falta com atestado?' })]
    for (const linha of linhas) {
      const icones = linha.querySelectorAll('svg')
      expect(icones).toHaveLength(2)
      expect(icones[0]).toHaveClass('lucide-message-circle-question-mark')
      expect(icones[1]).toHaveClass('lucide-chevron-right')
    }
  })
})
