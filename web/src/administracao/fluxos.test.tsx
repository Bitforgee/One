import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const etapa = (destino: string, setorId: number | null = null, prazoHoras: number | null = null) => ({ destino, setorId, prazoHoras, x: null, y: null })
const listas: Record<string, unknown[]> = {
  setores: [
    { id: 1, nome: 'Triagem', triagem: true, ativo: true },
    { id: 2, nome: 'Financeiro', triagem: false, ativo: true },
    { id: 3, nome: 'Antigo', triagem: false, ativo: false },
  ],
  categorias: [
    { id: 7, nome: 'Notas', ativa: true, padrao: false },
    { id: 8, nome: 'Não classificado', ativa: true, padrao: true },
    { id: 9, nome: 'Boletos', ativa: true, padrao: false },
  ],
  cursos: [
    { id: 4, nome: 'ADS', setorCoordenacaoId: 2 },
    { id: 5, nome: 'Direito', setorCoordenacaoId: null },
  ],
  fluxos: [
    { id: 6, categoriaId: 7, cursoId: null, semestre: null, vigente: { numero: 1, etapas: [etapa('SETOR', 2)] }, rascunho: null },
    { id: 7, categoriaId: 9, cursoId: 4, semestre: 3, rascunho: null, vigente: { numero: 2, etapas: [etapa('LIDERANCA_SEMESTRE'), etapa('COORDENACAO_CURSO', null, 48)] } },
  ],
  'respostas-prontas': [],
}

function cadastros(rotas: Record<string, Rota> = {}, sobre: Record<string, unknown[]> = {}) {
  const leituras = Object.fromEntries(Object.entries({ ...listas, ...sobre }).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, v]) as Rota]))
  const chamadas = api({ 'GET /api/auth/me': () => [200, admin], ...leituras, ...rotas })
  abrir('/univag/cadastros')
  return chamadas
}

const gravadas = (chamadas: { metodo: string; url: string; corpo: any }[]) => chamadas.filter((c) => c.metodo !== 'GET').map((c) => [c.metodo, c.url, c.corpo])
const opcoes = (el: HTMLElement) => within(el).getAllByRole('option').map((o) => o.textContent)

async function abaFluxos() {
  await userEvent.click(await screen.findByRole('tab', { name: 'Fluxos' }))
  return screen.getByRole('tabpanel', { name: 'Fluxos' })
}

async function abrirFluxo(nome: string) {
  await userEvent.click(await within(await abaFluxos()).findByRole('button', { name: nome }))
  return within(await screen.findByRole('region', { name: 'Editar: Fluxos' }))
}

describe('fluxos', () => {
  it('lista com abrangência e cadeia', async () => {
    cadastros()
    const painel = within(await abaFluxos())
    await painel.findByText('Notas')
    const linhas = Array.from(painel.getByRole('table').querySelectorAll('tbody tr')).map((tr) => {
      const [nome, detalhe] = Array.from((tr as HTMLTableRowElement).cells)
      return [nome.querySelector('button')!.textContent, detalhe.textContent]
    })
    expect(linhas).toEqual([
      ['Notas', 'Todos os cursosSetor FinanceiroPublicado v1'],
      ['Boletos', 'ADS, 3º semestreLiderança do semestreCoordenação do curso (48 h)Publicado v2'],
    ])
  })

  it('criar pede categoria e abrangência', async () => {
    const chamadas = cadastros({ 'POST /api/admin/fluxos': () => [201, {}] })
    await abaFluxos()
    await userEvent.click(screen.getByRole('button', { name: 'Novo fluxo' }))
    const d = within(await screen.findByRole('dialog', { name: 'Novo: Fluxos' }))
    expect(opcoes(d.getByLabelText('Categoria'))).toEqual(['Escolha a categoria', 'Notas', 'Boletos'])
    expect(opcoes(d.getByLabelText('Abrangência'))).toEqual(['Todos os cursos', 'Um curso', 'Um semestre de um curso'])
    expect(d.queryByLabelText('Curso')).not.toBeInTheDocument()
    expect(d.queryByLabelText('Semestre')).not.toBeInTheDocument()

    await userEvent.selectOptions(d.getByLabelText('Abrangência'), 'Um curso')
    expect(opcoes(d.getByLabelText('Curso'))).toEqual(['Escolha o curso', 'ADS', 'Direito'])
    expect(d.queryByLabelText('Semestre')).not.toBeInTheDocument()
    await userEvent.selectOptions(d.getByLabelText('Abrangência'), 'Um semestre de um curso')
    expect(d.getByLabelText('Semestre')).toBeInTheDocument()

    await userEvent.selectOptions(d.getByLabelText('Categoria'), '9')
    await userEvent.selectOptions(d.getByLabelText('Curso'), '4')
    await userEvent.selectOptions(d.getByLabelText('Semestre'), '3')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(gravadas(chamadas)).toEqual([['POST', '/api/admin/fluxos', { categoriaId: 9, cursoId: 4, semestre: 3 }]]))
  })

  it('simular e publicar', async () => {
    let tentativa = 0
    const chamadas = cadastros({
      'PUT /api/admin/fluxos/6/rascunho': () =>
        ++tentativa === 1
          ? [400, { status: 400, detail: 'Escolha um setor ativo da instituição.', errors: { setorId: ['Escolha um setor ativo da instituição.'] } }]
          : [200, { numero: 2, etapas: [] }],
      'POST /api/admin/fluxos/6/publicar': () => [201, { numero: 2, etapas: [] }],
      'POST /api/admin/fluxos/6/simular': () => [
        200,
        {
          etapas: [
            { ordem: 1, destino: 'LIDERANCA_SEMESTRE', setor: null, situacao: 'NAO_RESOLVIDA', motivo: 'Sem liderança disponível' },
            { ordem: 2, destino: 'SETOR', setor: 'Financeiro', situacao: 'RESOLVIDA', motivo: null },
          ],
          inicial: 'Financeiro',
          escolhido: { id: 6, cursoId: null, semestre: null },
        },
      ],
    })
    const d = await abrirFluxo('Notas')

    expect(d.getByRole('button', { name: 'Simular' })).toBeEnabled()
    await userEvent.click(d.getByRole('button', { name: 'Simular' }))
    expect(d.getByText('Escolha o curso e o semestre.')).toBeInTheDocument()
    await userEvent.selectOptions(d.getByLabelText('Curso do aluno'), '4')
    await userEvent.selectOptions(d.getByLabelText('Semestre do aluno'), '3')
    await userEvent.click(d.getByRole('button', { name: 'Simular' }))
    expect(await d.findByText('Liderança do semestre: Pulada: Sem liderança disponível')).toBeInTheDocument()
    expect(d.getByText('Setor fixo: Financeiro')).toBeInTheDocument()
    expect(d.getByText('O chamado abre em Financeiro.')).toBeInTheDocument()

    expect(d.getByRole('button', { name: 'Publicar' })).toBeDisabled()
    await userEvent.click(d.getByRole('button', { name: 'Adicionar etapa' }))
    await userEvent.click(d.getByRole('button', { name: 'Salvar rascunho' }))
    expect(await d.findByRole('alert')).toHaveTextContent('Escolha um setor ativo da instituição.')
    expect(d.getByRole('button', { name: 'Publicar' })).toBeDisabled()
    await userEvent.selectOptions(d.getByLabelText('Setor da etapa 2'), '2')
    await userEvent.click(d.getByRole('button', { name: 'Salvar rascunho' }))
    await waitFor(() => expect(d.getByRole('button', { name: 'Publicar' })).toBeEnabled())
    await userEvent.click(d.getByRole('button', { name: 'Publicar' }))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Editar: Fluxos' })).not.toBeInTheDocument())
    expect(gravadas(chamadas)).toEqual([
      ['POST', '/api/admin/fluxos/6/simular', { versao: 'VIGENTE', cursoId: 4, semestre: 3 }],
      ['PUT', '/api/admin/fluxos/6/rascunho', { etapas: [{ destino: 'SETOR', setorId: 2, prazoHoras: null, x: null, y: null }, { destino: 'SETOR', setorId: null, prazoHoras: null, x: null, y: null }] }],
      ['PUT', '/api/admin/fluxos/6/rascunho', { etapas: [{ destino: 'SETOR', setorId: 2, prazoHoras: null, x: null, y: null }, { destino: 'SETOR', setorId: 2, prazoHoras: null, x: null, y: null }] }],
      ['POST', '/api/admin/fluxos/6/publicar', {}],
    ])
  })

  it('descartar o rascunho', async () => {
    const comRascunho = [{ ...(listas.fluxos[0] as object), rascunho: { numero: 2, etapas: [etapa('COORDENACAO_CURSO')] } }]
    const chamadas = cadastros({ 'DELETE /api/admin/fluxos/6/rascunho': () => [204, undefined] }, { fluxos: comRascunho })
    const d = await abrirFluxo('Notas')
    expect(d.getByRole('button', { name: 'Publicar' })).toBeEnabled()
    expect(d.getByLabelText('Destino da etapa 1')).toHaveValue('COORDENACAO_CURSO')

    await userEvent.click(d.getByRole('button', { name: 'Mais' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Descartar rascunho' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar rascunho' }))

    await waitFor(() => expect(gravadas(chamadas)).toEqual([['DELETE', '/api/admin/fluxos/6/rascunho', undefined]]))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Editar: Fluxos' })).not.toBeInTheDocument())
  })

  it('estado vazio', async () => {
    cadastros({}, { fluxos: [] })
    const painel = within(await abaFluxos())
    expect(await painel.findByText('Sem fluxo, os chamados vão para a Triagem.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo fluxo' })).toBeInTheDocument()
  })

  it('lista tem todas as operações do canvas', async () => {
    const chamadas = cadastros({ 'PUT /api/admin/fluxos/7/rascunho': () => [200, { numero: 3, etapas: [] }] })
    const d = await abrirFluxo('Boletos')
    expect(d.getByLabelText('Destino da etapa 1')).toHaveValue('LIDERANCA_SEMESTRE')
    expect(d.getByLabelText('Destino da etapa 2')).toHaveValue('COORDENACAO_CURSO')
    expect(d.getByLabelText('Prazo da etapa 2 (horas)')).toHaveValue(48)
    expect(d.queryByLabelText('Setor da etapa 1')).not.toBeInTheDocument()

    await userEvent.click(d.getByRole('button', { name: 'Adicionar etapa' }))
    await userEvent.selectOptions(d.getByLabelText('Destino da etapa 3'), 'Setor fixo')
    expect(opcoes(d.getByLabelText('Setor da etapa 3'))).toEqual(['Escolha o setor', 'Triagem', 'Financeiro'])
    await userEvent.selectOptions(d.getByLabelText('Setor da etapa 3'), '2')
    await userEvent.type(d.getByLabelText('Prazo da etapa 3 (horas)'), '12')
    await userEvent.click(d.getByRole('button', { name: 'Mover etapa 3 para cima' }))
    expect(d.getByLabelText('Destino da etapa 2')).toHaveValue('SETOR')
    expect(d.getByLabelText('Destino da etapa 3')).toHaveValue('COORDENACAO_CURSO')
    await userEvent.click(d.getByRole('button', { name: 'Mover etapa 1 para baixo' }))
    expect(d.getByLabelText('Destino da etapa 1')).toHaveValue('SETOR')
    await userEvent.click(d.getByRole('button', { name: 'Remover etapa 2' }))
    expect(d.queryByLabelText('Destino da etapa 3')).not.toBeInTheDocument()
    expect(d.getByRole('button', { name: 'Mover etapa 1 para cima' })).toBeDisabled()
    expect(d.getByRole('button', { name: 'Mover etapa 2 para baixo' })).toBeDisabled()

    await userEvent.click(d.getByRole('button', { name: 'Salvar rascunho' }))
    await waitFor(() =>
      expect(gravadas(chamadas)).toEqual([
        ['PUT', '/api/admin/fluxos/7/rascunho', { etapas: [{ destino: 'SETOR', setorId: 2, prazoHoras: 12, x: null, y: null }, { destino: 'COORDENACAO_CURSO', setorId: null, prazoHoras: 48, x: null, y: null }] }],
      ]),
    )
  })

  it('no máximo cinco etapas', async () => {
    cadastros({}, { fluxos: [{ ...(listas.fluxos[0] as object), vigente: { numero: 1, etapas: Array.from({ length: 5 }, () => etapa('COORDENACAO_CURSO')) } }] })
    const d = await abrirFluxo('Notas')
    expect(d.getByRole('button', { name: 'Adicionar etapa' })).toBeDisabled()
  })
})
