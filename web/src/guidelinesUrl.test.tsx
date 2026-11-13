import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { periodoAnterior } from './indicadores/Indicadores'
import { abrirComRoteador, api, escolher, me, type Rota } from './test/util'

const admin = me({ papeis: ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'], matriculas: [] })
const ok = (corpo: unknown): Rota => () => [200, corpo]

const usuario = (id: number, nome: string) => ({ id, cpf: '12345678909', nome, email: `u${id}@univag.edu.br`, ativo: true, deveTrocarSenha: false, papeis: ['ALUNO'], setores: [] })
const artigo = (id: number, titulo: string) => ({ id, estado: 'ATIVO', indexacao: null, categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null, versao: { id, numero: 1, titulo, perguntas: [], resposta: 'x', links: [] } })
const documento = (id: number, titulo: string) => ({ id, titulo, categoriaId: 3, categoria: 'Estágio', estado: 'ATIVO', indexacao: 'INDEXADO', versao: { id, numero: 1, nomeArquivo: `d${id}.pdf`, paginas: 2, criadaEm: '2026-11-02T12:00:00Z' } })
const categorias = ok([{ id: 3, nome: 'Estágio', ativa: true }])
const vazias = Object.fromEntries(['categorias', 'cursos', 'fluxos', 'respostas-prontas'].map((k) => [`GET /api/admin/${k}`, ok([])]))

const telas = {
  usuarios: { caminho: '/univag/usuarios', rotas: { 'GET /api/admin/usuarios': ok([usuario(7, 'Ana Souza'), usuario(8, 'Bruno Lima')]), 'GET /api/admin/setores': ok([]) } },
  artigos: { caminho: '/univag/artigos', rotas: { 'GET /api/admin/artigos': ok([artigo(4, 'Faltas'), artigo(5, 'Bolsas')]), 'GET /api/admin/categorias': categorias } },
  documentos: { caminho: '/univag/documentos', rotas: { 'GET /api/admin/documentos': ok([documento(6, 'Calendário')]), 'GET /api/admin/categorias': categorias } },
  cadastros: {
    caminho: '/univag/cadastros',
    rotas: { ...vazias, 'GET /api/admin/setores': ok([{ id: 9, nome: 'Financeiro', triagem: false, ativo: true }, { id: 10, nome: 'Biblioteca', triagem: false, ativo: true }]) },
  },
}

function abrirTela(tela: keyof typeof telas, busca = '') {
  api({ 'GET /api/auth/me': ok(admin), ...telas[tela].rotas })
  return abrirComRoteador(`${telas[tela].caminho}${busca}`)
}

const busca = (roteador: { state: { location: { search: string } } }) => new URLSearchParams(roteador.state.location.search)
const botaoDeCriar = () => screen.findByRole('button', { name: /^(Novo|Nova)\b/ })

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('período de Indicadores na URL', () => {
  const dados = {
    semDados: false, alunosAtivos: 1, conversas: 1, taxaAutoatendimento: 0.5, taxaEscalonamento: 0.2, taxaAbandono: 0.1, taxaPerguntasSemArtigo: 0.1,
    chamadosAbertos: 4, chamadosResolvidos: 2, tempoPrimeiraRespostaHoras: 1, tempoResolucaoHoras: 2, roteamentoCorreto: 0.5, taxaReabertura: 0.1,
    principaisCategorias: { porConversas: null, porChamados: null }, indicadorPrincipal: 0.7,
  }
  const consultas = (chamadas: { url: string }[]) => chamadas.filter((c) => c.url.startsWith('/api/indicadores?')).map((c) => c.url)
  const servir = (...periodos: [string, string][]) =>
    api({
      'GET /api/auth/me': ok(admin),
      ...Object.fromEntries(periodos.flatMap(([de, ate]) => [[`GET /api/indicadores?de=${de}&ate=${ate}`, ok(dados)], [`GET /api/indicadores?de=${periodoAnterior(de, ate)!.de}&ate=${periodoAnterior(de, ate)!.ate}`, ok(dados)]])),
    })
  const preparar = (...periodos: [string, string][]) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0))
    return servir(['2026-11-01', '2026-11-15'], ...periodos)
  }

  it('C53 consultar grava de e ate na URL e recarregar restaura o período', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0))
    const chamadas = servir(['2026-11-01', '2026-11-15'], ['2026-11-01', '2026-11-30'])
    const { roteador, unmount } = abrirComRoteador('/univag/indicadores')
    await userEvent.clear(await screen.findByLabelText('De'))
    await userEvent.type(screen.getByLabelText('De'), '2026-11-01')
    await userEvent.clear(screen.getByLabelText('Até'))
    await userEvent.type(screen.getByLabelText('Até'), '2026-11-30')
    await userEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await waitFor(() => expect(roteador.state.location.search).toBe('?de=2026-11-01&ate=2026-11-30'))
    expect(roteador.state.historyAction).toBe('REPLACE')
    unmount()

    const recarregado = servir(['2026-10-03', '2026-10-20'])
    abrirComRoteador('/univag/indicadores?de=2026-10-03&ate=2026-10-20')
    expect(await screen.findByLabelText('De')).toHaveValue('2026-10-03')
    expect(screen.getByLabelText('Até')).toHaveValue('2026-10-20')
    expect(chamadas.length + recarregado.length).toBeGreaterThan(0)
  })

  it('C53 o período da URL é o que a primeira consulta usa', async () => {
    const chamadas = preparar(['2026-10-03', '2026-10-20'])
    abrirComRoteador('/univag/indicadores?de=2026-10-03&ate=2026-10-20')
    await screen.findByText('Indicador principal', { selector: 'dt' })
    expect(consultas(chamadas)[0]).toBe('/api/indicadores?de=2026-10-03&ate=2026-10-20')
  })

  it.each([
    ['data malformada', '?de=abc&ate=2026-10-20'],
    ['mês impossível', '?de=2026-13-45&ate=2026-10-20'],
    ['dia impossível', '?de=2026-02-30&ate=2026-10-20'],
    ['só uma das datas', '?de=2026-10-03'],
    ['período invertido', '?de=2026-10-20&ate=2026-10-03'],
    ['valores em branco', '?de=&ate='],
  ])('C57 Indicadores ignora %s e abre com o período padrão, sem erro', async (_, parametros) => {
    const chamadas = preparar()
    abrirComRoteador(`/univag/indicadores${parametros}`)
    await screen.findByText('Indicador principal', { selector: 'dt' })
    expect(consultas(chamadas)[0]).toBe('/api/indicadores?de=2026-11-01&ate=2026-11-15')
    expect(screen.getByLabelText('De')).toHaveValue('2026-11-01')
    expect(screen.getByLabelText('Até')).toHaveValue('2026-11-15')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('busca na URL', () => {
  it('C54 digitar na busca de Usuários grava q com replace e um só passo de histórico', async () => {
    const { roteador } = abrirTela('usuarios')
    const campo = await screen.findByRole('searchbox')
    await userEvent.type(campo, 'ana')
    expect(busca(roteador).get('q')).toBe('ana')
    expect(roteador.state.historyAction).toBe('REPLACE')
    expect(campo).toHaveValue('ana')
    expect(screen.queryByText('Bruno Lima')).not.toBeInTheDocument()
    await userEvent.clear(campo)
    expect(roteador.state.location.search).toBe('')
  })

  it('C54 recarregar Usuários com q restaura a busca e o filtro', async () => {
    abrirTela('usuarios', '?q=bruno')
    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('bruno')
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument()
  })

  it('C54 digitar na busca de Cadastros grava q com replace e mantém a aba', async () => {
    const { roteador } = abrirTela('cadastros', '?aba=setores')
    const campo = await screen.findByLabelText('Buscar em Setores')
    await userEvent.type(campo, 'fin')
    expect(busca(roteador).get('q')).toBe('fin')
    expect(busca(roteador).get('aba')).toBe('setores')
    expect(roteador.state.historyAction).toBe('REPLACE')
    expect(screen.queryByText('Biblioteca')).not.toBeInTheDocument()
  })

  it('C54 recarregar Cadastros com q restaura a busca', async () => {
    abrirTela('cadastros', '?q=bibli')
    expect(await screen.findByLabelText('Buscar em Setores')).toHaveValue('bibli')
    expect(await screen.findByText('Biblioteca')).toBeInTheDocument()
    expect(screen.queryByText('Financeiro')).not.toBeInTheDocument()
  })

  it('C54 trocar de aba em Cadastros deixa a busca para trás', async () => {
    const { roteador } = abrirTela('cadastros', '?q=fin')
    await screen.findByText('Financeiro')
    await userEvent.selectOptions(screen.getByLabelText('Cadastro'), 'categorias')
    await waitFor(() => expect(roteador.state.location.search).toBe('?aba=categorias'))
    expect(await screen.findByLabelText('Buscar em Categorias')).toHaveValue('')
  })

  it('C57 q em branco na URL abre a tela sem filtro', async () => {
    abrirTela('usuarios', '?q=%20%20')
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('editor na URL', () => {
  const casos: [string, keyof typeof telas, string, string, string, () => Promise<void>][] = [
    ['Usuários', 'usuarios', 'Novo usuário', 'Editar usuário', '7', () => escolher('Ana Souza', 'Editar')],
    ['Artigos', 'artigos', 'Novo artigo', 'Editar artigo', '4', () => escolher('Faltas', 'Editar')],
    ['Documentos', 'documentos', 'Novo documento', 'Nova versão', '6', () => escolher('Calendário', 'Nova versão')],
    ['Cadastros', 'cadastros', 'Novo: Setores', 'Editar: Setores', '9', async () => void (await userEvent.click(await screen.findByRole('button', { name: 'Financeiro' })))],
  ]

  it.each(casos)('C55 %s grava editar=novo ao criar e remove ao fechar', async (_, tela, novo) => {
    const { roteador } = abrirTela(tela)
    await userEvent.click(await botaoDeCriar())
    await screen.findByRole('dialog', { name: novo })
    expect(busca(roteador).get('editar')).toBe('novo')
    expect(roteador.state.historyAction).toBe('REPLACE')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(busca(roteador).has('editar')).toBe(false)
  })

  it.each(casos)('C55 %s grava editar=<id> ao editar', async (_, tela, __, editar, id, abrirEdicao) => {
    const { roteador } = abrirTela(tela)
    await abrirEdicao()
    await screen.findByRole('dialog', { name: editar })
    expect(busca(roteador).get('editar')).toBe(id)
  })

  it.each(casos)('C55 %s reabre o painel de edição ao recarregar com editar=<id>', async (_, tela, __, editar, id) => {
    abrirTela(tela, `?editar=${id}`)
    expect(await screen.findByRole('dialog', { name: editar })).toBeInTheDocument()
  })

  it.each(casos)('C55 %s reabre o painel de criação ao recarregar com editar=novo', async (_, tela, novo) => {
    abrirTela(tela, '?editar=novo')
    expect(await screen.findByRole('dialog', { name: novo })).toBeInTheDocument()
  })

  it('C55 o painel reaberto pela URL é limpo até a pessoa digitar e então pede confirmação', async () => {
    const { roteador } = abrirTela('usuarios', '?editar=7')
    const dialogo = await screen.findByRole('dialog', { name: 'Editar usuário' })
    expect(within(dialogo).getByLabelText('Nome')).toHaveValue('Ana Souza')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(busca(roteador).has('editar')).toBe(false)
    cleanup()

    abrirTela('usuarios', '?editar=7')
    const sujo = await screen.findByRole('dialog', { name: 'Editar usuário' })
    await userEvent.type(within(sujo).getByLabelText('Nome'), ' Maria')
    await userEvent.click(within(sujo).getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByRole('dialog', { name: 'Descartar alterações?' })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog', { hidden: true }).some((d) => d.textContent?.startsWith('Editar usuário'))).toBe(true)
  })

  it.each([
    ['id inexistente', '?editar=999999'],
    ['texto', '?editar=abc'],
    ['negativo', '?editar=-4'],
    ['em branco', '?editar='],
  ])('C57 editar com %s não abre painel, não mostra erro e sai da URL', async (_, parametros) => {
    for (const tela of Object.keys(telas) as (keyof typeof telas)[]) {
      const { roteador, unmount } = abrirTela(tela, parametros)
      await screen.findByRole('table', {}, { timeout: 3000 }).catch(() => undefined)
      await waitFor(() => expect(screen.queryAllByRole('row').length, tela).toBeGreaterThan(1))
      await waitFor(() => expect(busca(roteador).has('editar'), tela).toBe(false))
      expect(screen.queryByRole('dialog'), tela).not.toBeInTheDocument()
      expect(screen.queryByRole('alert'), tela).not.toBeInTheDocument()
      unmount()
    }
  })

  it('C57 editar com id de fluxo em Cadastros não abre o painel', async () => {
    abrirTela('cadastros', '?aba=fluxos&editar=1')
    await screen.findByRole('tab', { name: /Fluxos/ })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
