import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const listas: Record<string, unknown[]> = {
  setores: [
    { id: 1, nome: 'Triagem', triagem: true, ativo: true },
    { id: 2, nome: 'Financeiro', triagem: false, ativo: true },
    { id: 3, nome: 'Antigo', triagem: false, ativo: false },
  ],
  categorias: [
    { id: 7, nome: 'Notas', ativa: true, padrao: false },
    { id: 8, nome: 'Não classificado', ativa: true, padrao: true },
    { id: 9, nome: 'Velha', ativa: false, padrao: false },
  ],
  cursos: [
    { id: 4, nome: 'ADS', setorCoordenacaoId: 2 },
    { id: 5, nome: 'Direito', setorCoordenacaoId: null },
  ],
  fluxos: [
    { id: 6, categoriaId: 7, cursoId: null, semestre: null, vigente: { numero: 1, etapas: [{ destino: 'SETOR', setorId: 2, prazoHoras: null, x: null, y: null }] }, rascunho: null },
    {
      id: 7, categoriaId: 9, cursoId: 4, semestre: 3, rascunho: null,
      vigente: { numero: 2, etapas: [{ destino: 'LIDERANCA_SEMESTRE', setorId: null, prazoHoras: null, x: null, y: null }, { destino: 'COORDENACAO_CURSO', setorId: null, prazoHoras: 48, x: null, y: null }] },
    },
  ],
  'respostas-prontas': [{ id: 8, setorId: 2, titulo: 'Boleto', texto: 'Seu boleto está no Portal.' }],
}

function cadastros(rotas: Record<string, Rota> = {}) {
  const leituras = Object.fromEntries(Object.entries(listas).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, v]) as Rota]))
  const chamadas = api({ 'GET /api/auth/me': () => [200, admin], ...leituras, ...rotas })
  abrir('/univag/cadastros')
  return chamadas
}

const linhas = (aba: string) =>
  Array.from(within(screen.getByRole('tabpanel', { name: aba })).getByRole('table').querySelectorAll('tbody tr')).map((tr) => {
    const [nome, detalhe] = Array.from((tr as HTMLTableRowElement).cells)
    return [nome.querySelector('button')!.textContent, detalhe.textContent].filter(Boolean)
  })
const gravadas = (chamadas: { metodo: string; url: string; corpo: any }[]) => chamadas.filter((c) => c.metodo !== 'GET').map((c) => [c.metodo, c.url, c.corpo])

async function aba(nome: string) {
  await userEvent.click(await screen.findByRole('tab', { name: nome }))
}

describe('cadastros', () => {
  it('cada aba lista o nome e o que distingue o registro', async () => {
    cadastros()
    await screen.findByText('Triagem')
    expect(linhas('Setores')).toEqual([['Triagem', 'triagem'], ['Financeiro'], ['Antigo', 'inativo']])
    await aba('Categorias')
    expect(linhas('Categorias')).toEqual([['Notas'], ['Não classificado', 'padrão'], ['Velha', 'inativa']])
    await aba('Cursos')
    expect(linhas('Cursos')).toEqual([['ADS', 'coordenação: Financeiro'], ['Direito', 'coordenação: —']])
    await aba('Fluxos')
    expect(linhas('Fluxos')).toEqual([['Notas', 'Todos os cursos · Setor Financeiro'], ['Velha', 'ADS, 3º semestre · Liderança do semestre → Coordenação do curso (48 h)']])
    await aba('Respostas prontas')
    expect(linhas('Respostas prontas')).toEqual([['Boleto', 'Financeiro']])
  })

  it('editar setor grava triagem e ativo', async () => {
    const chamadas = cadastros({ 'PUT /api/admin/setores/1': () => [200, {}] })
    await userEvent.click(await screen.findByText('Triagem'))
    const d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Editar: Setores')).toBeInTheDocument()
    expect(d.getByLabelText('Nome')).toHaveValue('Triagem')
    expect(d.getByLabelText(/Setor de triagem/)).toBeChecked()
    expect(d.getByLabelText('Ativo')).toBeChecked()
    await userEvent.click(d.getByLabelText('Ativo'))
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(gravadas(chamadas)).toEqual([['PUT', '/api/admin/setores/1', { nome: 'Triagem', triagem: true, ativo: false }]]))
  })

  it('setor e categoria novos nascem ativos e fora da triagem', async () => {
    const chamadas = cadastros({ 'POST /api/admin/setores': () => [201, {}], 'POST /api/admin/categorias': () => [201, {}] })
    await screen.findByText('Triagem')
    await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
    let d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Novo: Setores')).toBeInTheDocument()
    expect(d.getByLabelText(/Setor de triagem/)).not.toBeChecked()
    await userEvent.type(d.getByLabelText('Nome'), 'Secretaria')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await aba('Categorias')
    await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
    d = within(await screen.findByRole('dialog'))
    expect(d.getByLabelText('Ativa')).toBeChecked()
    await userEvent.type(d.getByLabelText('Nome'), 'Estágio')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(gravadas(chamadas)).toEqual([
        ['POST', '/api/admin/setores', { nome: 'Secretaria', triagem: false, ativo: true }],
        ['POST', '/api/admin/categorias', { nome: 'Estágio', ativa: true }],
      ]),
    )
  })

  it('curso sem coordenação grava null e com coordenação grava o setor', async () => {
    const chamadas = cadastros({ 'PUT /api/admin/cursos/5': () => [200, {}], 'POST /api/admin/cursos': () => [201, {}] })
    await aba('Cursos')
    await userEvent.click(await screen.findByText('Direito'))
    let d = within(await screen.findByRole('dialog'))
    expect(d.getByLabelText('Setor de coordenação')).toHaveValue('')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
    d = within(await screen.findByRole('dialog'))
    await userEvent.type(d.getByLabelText('Nome'), 'Medicina')
    await userEvent.selectOptions(d.getByLabelText('Setor de coordenação'), '2')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(gravadas(chamadas)).toEqual([
        ['PUT', '/api/admin/cursos/5', { nome: 'Direito', setorCoordenacaoId: null }],
        ['POST', '/api/admin/cursos', { nome: 'Medicina', setorCoordenacaoId: 2 }],
      ]),
    )
  })

  it('resposta pronta grava os números escolhidos', async () => {
    const chamadas = cadastros({ 'POST /api/admin/respostas-prontas': () => [201, {}] })
    await aba('Respostas prontas')
    await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
    const d = within(await screen.findByRole('dialog'))
    await userEvent.selectOptions(d.getByLabelText('Setor'), '2')
    await userEvent.type(d.getByLabelText('Título'), 'Atestado')
    await userEvent.type(d.getByLabelText('Texto'), 'Envie o atestado.')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(gravadas(chamadas)).toEqual([['POST', '/api/admin/respostas-prontas', { setorId: 2, titulo: 'Atestado', texto: 'Envie o atestado.' }]]))
  })
  it('o editor abre antes de as listas chegarem', async () => {
    const pendentes = Object.fromEntries(Object.keys(listas).map((k) => [`GET /api/admin/${k}`, (() => new Promise(() => {})) as Rota]))
    api({ 'GET /api/auth/me': () => [200, admin], ...pendentes })
    abrir('/univag/cadastros')
    await aba('Fluxos')
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
    const d = within(await screen.findByRole('dialog'))
    expect(within(d.getByLabelText('Categoria')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha a categoria'])
    await userEvent.selectOptions(d.getByLabelText('Abrangência'), 'CURSO')
    expect(within(d.getByLabelText('Curso')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha o curso'])
    await userEvent.click(d.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    for (const [nome, campo, vazio] of [
      ['Cursos', 'Setor de coordenação', 'Sem coordenação (vai para a triagem)'],
      ['Respostas prontas', 'Setor', 'Escolha o setor'],
    ]) {
      await aba(nome)
      await userEvent.click(screen.getByRole('button', { name: /Novo/ }))
      const e = within(await screen.findByRole('dialog'))
      expect(within(e.getByLabelText(campo)).getAllByRole('option').map((o) => o.textContent)).toEqual([vazio])
      await userEvent.click(e.getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
  })

  it('aba com um registro não diz que está vazia', async () => {
    cadastros()
    await aba('Respostas prontas')
    const painel = within(screen.getByRole('tabpanel', { name: 'Respostas prontas' }))
    expect(await painel.findByText('Boleto')).toBeInTheDocument()
    expect(painel.queryByText('Nenhum item cadastrado.')).not.toBeInTheDocument()
  })

  // C82 (AC 45, door 13)
  it('toast de cadastro só no sucesso', async () => {
    await new Promise((r) => setTimeout(r, 50)) // toast atrasado de um teste anterior (o Sonner é um singleton)
    let tentativa = 0
    cadastros({ 'PUT /api/admin/setores/1': () => (++tentativa === 1 ? [422, { status: 422, detail: 'Já existe um setor de triagem.' }] : [200, {}]) })
    const avisos = () => screen.getByRole('region', { name: /^Notificações/ })
    await userEvent.click(await screen.findByText('Triagem'))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Salvar' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Já existe um setor de triagem.')
    expect(avisos()).not.toHaveTextContent('Cadastro salvo.')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Cadastro salvo.'))
  })
})
