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
    await screen.findByRole('button', { name: 'Triagem' })
    expect(linhas('Setores')).toEqual([['Triagem', 'Triagem'], ['Financeiro'], ['Antigo', 'Inativo']])
    await aba('Categorias')
    expect(linhas('Categorias')).toEqual([['Notas'], ['Não classificado', 'Padrão'], ['Velha', 'Inativa']])
    await aba('Cursos')
    expect(linhas('Cursos')).toEqual([['ADS', 'Coordenação: Financeiro'], ['Direito', 'Coordenação: —']])
    await aba('Fluxos')
    expect(linhas('Fluxos')).toEqual([['Notas', 'Todos os cursosSetor FinanceiroPublicado v1'], ['Velha', 'ADS, 3º semestreLiderança do semestreCoordenação do curso (48 h)Publicado v2']])
    await aba('Respostas prontas')
    expect(linhas('Respostas prontas')).toEqual([['Boleto', 'Financeiro']])
  })

  it('editar setor grava triagem e ativo', async () => {
    const chamadas = cadastros({ 'PUT /api/admin/setores/1': () => [200, {}] })
    await userEvent.click(await screen.findByRole('button', { name: 'Triagem' }))
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
    await screen.findByRole('button', { name: 'Triagem' })
    await userEvent.click(screen.getByRole('button', { name: /^Nov[oa] / }))
    let d = within(await screen.findByRole('dialog'))
    expect(d.getByText('Novo: Setores')).toBeInTheDocument()
    expect(d.getByLabelText(/Setor de triagem/)).not.toBeChecked()
    await userEvent.type(d.getByLabelText('Nome'), 'Secretaria')
    await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await aba('Categorias')
    await userEvent.click(screen.getByRole('button', { name: /^Nov[oa] / }))
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

    await userEvent.click(screen.getByRole('button', { name: /^Nov[oa] / }))
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
    await userEvent.click(screen.getByRole('button', { name: /^Nov[oa] / }))
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
    await userEvent.click(screen.getByRole('button', { name: /^Nov[oa] / }))
    const d = within(await screen.findByRole('dialog'))
    expect(within(d.getByLabelText('Categoria')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha a categoria'])
    await userEvent.selectOptions(d.getByLabelText('Abrangência'), 'CURSO')
    expect(within(d.getByLabelText('Curso')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha o curso'])
    await userEvent.click(d.getByRole('button', { name: 'Cancelar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    for (const [nome, campo, vazio] of [
      ['Cursos', 'Setor de coordenação', 'Sem coordenação (vai para a triagem)'],
      ['Respostas prontas', 'Setor', 'Escolha o setor'],
    ]) {
      await aba(nome)
      await userEvent.click(screen.getByRole('button', { name: /^Nov[oa] / }))
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

  it('toast de cadastro só no sucesso', async () => {
    await new Promise((r) => setTimeout(r, 50))
    let tentativa = 0
    cadastros({ 'PUT /api/admin/setores/1': () => (++tentativa === 1 ? [422, { status: 422, detail: 'Já existe um setor de triagem.' }] : [200, {}]) })
    const avisos = () => screen.getByRole('region', { name: /^Notificações/ })
    await userEvent.click(await screen.findByRole('button', { name: 'Triagem' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Salvar' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Já existe um setor de triagem.')
    expect(avisos()).not.toHaveTextContent('Cadastro salvo.')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(avisos()).toHaveTextContent('Cadastro salvo.'))
  })

  it('liderança de semestre: curso e semestre na criação, só leitura na edição', async () => {
    const lideranca = { id: 10, nome: 'Líderes ADS 3º', triagem: false, ativo: true, cursoId: 4, semestre: 3 }
    listas.setores.push(lideranca)
    try {
      const chamadas = cadastros({ 'POST /api/admin/setores': () => [201, {}], 'PUT /api/admin/setores/10': () => [200, {}] })
      await screen.findByText('Líderes ADS 3º')
      expect(linhas('Setores').at(-1)).toEqual(['Líderes ADS 3º', 'Liderança de ADS, 3º semestre'])

      await userEvent.click(screen.getByRole('button', { name: 'Novo setor' }))
      let d = within(await screen.findByRole('dialog'))
      expect(d.queryByLabelText('Curso')).not.toBeInTheDocument()
      await userEvent.type(d.getByLabelText('Nome'), 'Líderes Direito 1º')
      await userEvent.click(d.getByLabelText('Liderança de semestre'))
      await userEvent.selectOptions(d.getByLabelText('Curso'), '5')
      await userEvent.selectOptions(d.getByLabelText('Semestre'), '1')
      await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(gravadas(chamadas)).toEqual([['POST', '/api/admin/setores', { nome: 'Líderes Direito 1º', triagem: false, ativo: true, cursoId: 5, semestre: 1 }]]))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await userEvent.click(screen.getByText('Líderes ADS 3º'))
      d = within(await screen.findByRole('dialog'))
      expect(d.getByText('Liderança de semestre: ADS, 3º semestre')).toBeInTheDocument()
      expect(d.queryByLabelText('Curso')).not.toBeInTheDocument()
      expect(d.queryByLabelText('Liderança de semestre')).not.toBeInTheDocument()
      await userEvent.click(d.getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(gravadas(chamadas)[1]).toEqual(['PUT', '/api/admin/setores/10', { nome: 'Líderes ADS 3º', triagem: false, ativo: true }]))
    } finally {
      listas.setores.pop()
    }
  })

  it('listas de destino sem lideranças', async () => {
    listas.setores.push({ id: 10, nome: 'Líderes ADS 3º', triagem: false, ativo: true, cursoId: 4, semestre: 3 })
    try {
      cadastros()
      await aba('Cursos')
      await userEvent.click(await screen.findByText('Direito'))
      const opcoes = within(within(await screen.findByRole('dialog')).getByLabelText('Setor de coordenação')).getAllByRole('option').map((o) => o.textContent)
      expect(opcoes).toEqual(['Sem coordenação (vai para a triagem)', 'Triagem', 'Financeiro', 'Antigo'])
    } finally {
      listas.setores.pop()
    }
  })

  it('abas em coluna com a contagem', async () => {
    cadastros()
    await screen.findByRole('button', { name: 'Triagem' })
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
    const contagens = ['Setores', 'Categorias', 'Cursos', 'Fluxos', 'Respostas prontas'].map((n) => screen.getByRole('tab', { name: n }).querySelector('[aria-hidden="true"]')!.textContent)
    expect(contagens).toEqual(['3', '3', '2', '2', '1'])
  })

  it('título, ajuda, botão com o objeto e busca pelo nome', async () => {
    cadastros()
    await screen.findByRole('button', { name: 'Triagem' })
    const painel = within(screen.getByRole('tabpanel', { name: 'Setores' }))
    expect(painel.getByRole('heading', { name: 'Setores' })).toBeInTheDocument()
    expect(painel.getByText('Quem atende os chamados. Cada setor tem a sua fila.')).toBeInTheDocument()
    const busca = painel.getByRole('searchbox', { name: 'Buscar em Setores' })
    await userEvent.type(busca, 'FIN')
    expect(linhas('Setores')).toEqual([['Financeiro']])
    await userEvent.clear(busca)
    await userEvent.type(busca, 'zzz')
    expect(painel.getByText('Nenhum resultado para «zzz»')).toBeInTheDocument()
    await userEvent.click(painel.getByRole('button', { name: 'Limpar busca' }))
    expect(linhas('Setores')).toHaveLength(3)
    for (const [aba, botao] of [['Categorias', 'Nova categoria'], ['Cursos', 'Novo curso'], ['Fluxos', 'Novo fluxo'], ['Respostas prontas', 'Nova resposta pronta']]) {
      await userEvent.click(screen.getByRole('tab', { name: aba }))
      expect(within(screen.getByRole('tabpanel', { name: aba })).getByRole('button', { name: botao })).toBeInTheDocument()
    }
  })

  it('fluxo com rascunho em edição e sem versão', async () => {
    const f = listas.fluxos as { id: number; categoriaId: number; cursoId: null; semestre: null; vigente: unknown; rascunho: unknown }[]
    f.push({ id: 9, categoriaId: 7, cursoId: null, semestre: null, vigente: null, rascunho: { numero: 1, etapas: [] } })
    try {
      cadastros()
      await aba('Fluxos')
      expect(await within(screen.getByRole('tabpanel', { name: 'Fluxos' })).findAllByText('Rascunho')).not.toHaveLength(0)
      expect(linhas('Fluxos').at(-1)).toEqual(['Notas', 'Todos os cursosSem etapasRascunho'])
    } finally {
      f.pop()
    }
  })
})
