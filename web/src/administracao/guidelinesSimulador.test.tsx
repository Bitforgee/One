import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'
import type { Destino } from './comum'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const etapa = (destino: string, setorId: number | null) => ({ destino: destino as Destino, setorId, prazoHoras: null, x: null, y: null })
const listas: Record<string, unknown[]> = {
  setores: [{ id: 2, nome: 'Financeiro', triagem: false, ativo: true }],
  categorias: [{ id: 6, nome: 'Provas', ativa: true, padrao: false }],
  cursos: [{ id: 4, nome: 'ADS', setorCoordenacaoId: 2 }],
  fluxos: [{ id: 6, categoriaId: 6, cursoId: null, semestre: null, vigente: { numero: 1, etapas: [etapa('SETOR', 2)] }, rascunho: null }],
  'respostas-prontas': [],
}
const resultado = { etapas: [{ ordem: 1, destino: 'SETOR', setor: 'Financeiro', situacao: 'RESOLVIDA', motivo: null }], inicial: 'Financeiro', escolhido: { id: 6, cursoId: null, semestre: null } }

async function simulador(simular: Rota = () => [200, resultado]) {
  const leituras = Object.fromEntries(Object.entries(listas).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, v]) as Rota]))
  const chamadas = api({ 'GET /api/auth/me': () => [200, admin], ...leituras, 'POST /api/admin/fluxos/6/simular': simular })
  abrir('/univag/cadastros/fluxos/6')
  const editor = within(await screen.findByRole('region', { name: 'Editar: Fluxos' }))
  return { editor, chamadas, simular: () => editor.getByRole('button', { name: /^Simul/ }) }
}

const simulacoes = (chamadas: { metodo: string }[]) => chamadas.filter((c) => c.metodo === 'POST')

describe('Simulador anunciado', () => {
  it('C29 o resultado aparece numa região aria-live polite que já existia antes da resposta', async () => {
    const { editor, simular } = await simulador()
    const secao = editor.getByRole('region', { name: 'Simulação' })
    const regiao = secao.querySelector('[aria-live="polite"]')
    expect(regiao).not.toBeNull()
    expect(regiao).toBeEmptyDOMElement()

    await userEvent.selectOptions(editor.getByLabelText('Curso do aluno'), '4')
    await userEvent.selectOptions(editor.getByLabelText('Semestre do aluno'), '3')
    await userEvent.click(simular())

    expect(await editor.findByText('O chamado abre em Financeiro.')).toBeInTheDocument()
    expect(secao.querySelector('[aria-live="polite"]')).toBe(regiao)
    expect(regiao).toHaveTextContent('O chamado abre em Financeiro.')
    expect(regiao).toHaveTextContent('Setor fixo: Financeiro')
  })
})

describe('Simulador sem curso e semestre', () => {
  it('C33 Simular fica habilitado e o clique mostra a dica sem chamar a API', async () => {
    const { editor, chamadas, simular } = await simulador()
    expect(simular()).toBeEnabled()
    expect(editor.queryByText('Escolha o curso e o semestre.')).not.toBeInTheDocument()

    await userEvent.click(simular())
    expect(editor.getByText('Escolha o curso e o semestre.')).toBeInTheDocument()
    expect(simulacoes(chamadas)).toHaveLength(0)

    await userEvent.selectOptions(editor.getByLabelText('Curso do aluno'), '4')
    await userEvent.click(simular())
    expect(editor.getByText('Escolha o curso e o semestre.')).toBeInTheDocument()
    expect(simulacoes(chamadas)).toHaveLength(0)
  })

  it('C33 com curso e semestre a dica some e o botão só desabilita durante a requisição', async () => {
    let liberar: (r: [number, unknown]) => void = () => {}
    const { editor, chamadas, simular } = await simulador(() => new Promise((r) => (liberar = r)))
    await userEvent.click(simular())
    await userEvent.selectOptions(editor.getByLabelText('Curso do aluno'), '4')
    await userEvent.selectOptions(editor.getByLabelText('Semestre do aluno'), '3')
    expect(editor.queryByText('Escolha o curso e o semestre.')).not.toBeInTheDocument()

    await userEvent.click(simular())
    await waitFor(() => expect(simular()).toBeDisabled())
    expect(simulacoes(chamadas)).toHaveLength(1)
    liberar([200, resultado])
    await waitFor(() => expect(simular()).toBeEnabled())
    expect(await editor.findByText('O chamado abre em Financeiro.')).toBeInTheDocument()
  })
})
