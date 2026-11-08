import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, api, me, type Rota } from '../test/util'
import type { Destino } from './comum'
import { Carga } from './EdicaoDoFluxo'
import { deEtapas, FraseDaCadeia, fixarPosicoes, inserirEntre, Inicio, novoNo, organizar, podeLigar, type Ligacao } from './grafo'

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const etapa = (destino: string, setorId: number | null = null, prazoHoras: number | null = null, x: number | null = null, y: number | null = null) => ({ destino: destino as Destino, setorId, prazoHoras, x, y })
const cadeia = { numero: 1, etapas: [etapa('LIDERANCA_SEMESTRE'), etapa('COORDENACAO_CURSO', null, 48)] }
const listas: Record<string, unknown[]> = {
  setores: [
    { id: 1, nome: 'Triagem', triagem: true, ativo: true },
    { id: 2, nome: 'Financeiro', triagem: false, ativo: true },
  ],
  categorias: [
    { id: 7, nome: 'Notas', ativa: true, padrao: false },
    { id: 9, nome: 'Boletos', ativa: true, padrao: false },
    { id: 10, nome: 'Matrícula', ativa: true, padrao: false },
  ],
  cursos: [{ id: 4, nome: 'ADS', setorCoordenacaoId: 2 }],
  fluxos: [
    { id: 7, categoriaId: 9, cursoId: 4, semestre: 3, rascunho: null, vigente: cadeia },
    { id: 8, categoriaId: 7, cursoId: null, semestre: null, vigente: null, rascunho: { numero: 1, etapas: [etapa('SETOR', 2, 24, 300, 50), etapa('COORDENACAO_CURSO', null, null, 600, 50)] } },
    { id: 9, categoriaId: 10, cursoId: null, semestre: null, vigente: null, rascunho: { numero: 1, etapas: [] } },
  ],
  'respostas-prontas': [],
}

function cadastros(rotas: Record<string, Rota> = {}) {
  const leituras = Object.fromEntries(Object.entries(listas).map(([k, v]) => [`GET /api/admin/${k}`, (() => [200, v]) as Rota]))
  const chamadas = api({ 'GET /api/auth/me': () => [200, admin], ...leituras, ...rotas })
  abrir('/univag/cadastros')
  return chamadas
}

async function abrirFluxo(nome: string) {
  await userEvent.click(await screen.findByRole('tab', { name: 'Fluxos' }))
  await userEvent.click(await within(screen.getByRole('tabpanel', { name: 'Fluxos' })).findByRole('button', { name: nome }))
  return within(await screen.findByRole('dialog', { name: 'Editar: Fluxos' }))
}

async function abrirNoCanvas(nome: string) {
  const dialogo = await abrirFluxo(nome)
  await userEvent.click(dialogo.getByRole('tab', { name: 'Canvas' }))
  await screen.findByLabelText('Início')
  return dialogo
}

const gravadas = (chamadas: { metodo: string; url: string; corpo: any }[]) => chamadas.filter((c) => c.metodo !== 'GET').map((c) => [c.metodo, c.url, c.corpo])
const noDeEtapa = (n: number, rotulo: string) => screen.getByLabelText(`Etapa ${n}: ${rotulo}`)
const posicao = (no: HTMLElement) => no.style.transform

// selecionar pelo teclado (Enter no nó focado), como quem usa o canvas sem o mouse; o clique do user-event não traz a janela que o d3-drag lê
async function selecionar(no: HTMLElement) {
  act(() => no.focus())
  await userEvent.keyboard('{Enter}')
}

// escolher um destino no menu do botão Adicionar etapa, como quem clica
async function pelaMenu(destino: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar etapa' }))
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(`^${destino}`) }))
}

// largar um tipo da paleta no canvas, como o navegador faz (o arrastar de verdade é do Playwright)
function largar(destino: string, x = 300, y = 150) {
  fireEvent.drop(document.querySelector('.react-flow')!, { clientX: x, clientY: y, dataTransfer: { getData: () => destino } })
}

describe('canvas', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // fluxos-atendimento C83 (AC 70)
  it('alternar mantém a edição', async () => {
    cadastros()
    const dialogo = await abrirFluxo('Boletos')
    expect(dialogo.getByRole('tab', { name: 'Lista' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(dialogo.getByRole('button', { name: /Adicionar etapa/ }))
    expect(dialogo.getByText('Etapa 3')).toBeInTheDocument()
    await userEvent.click(dialogo.getByRole('tab', { name: 'Canvas' }))
    expect(await screen.findByLabelText('Etapa 3: Setor —')).toBeInTheDocument()
    expect(screen.queryByText('Etapa 3')).not.toBeInTheDocument() // a lista some enquanto o canvas está aberto

    // uma etapa posta pela paleta, sem salvar, também está na lista
    await pelaMenu('Liderança do semestre')
    await screen.findByLabelText('Etapa 4: Liderança do semestre')
    await userEvent.click(dialogo.getByRole('tab', { name: 'Lista' }))
    expect(dialogo.getByLabelText('Destino da etapa 3')).toHaveValue('SETOR')
    expect(dialogo.getByLabelText('Destino da etapa 4')).toHaveValue('LIDERANCA_SEMESTRE')
  })

  // C84 (AC 71)
  it('nós em ordem com rótulo e prazo', async () => {
    cadastros()
    await abrirNoCanvas('Boletos')

    expect(screen.getByLabelText('Início')).toBeInTheDocument()
    const primeiro = noDeEtapa(1, 'Liderança do semestre')
    const segundo = noDeEtapa(2, 'Coordenação do curso (48 h)')
    expect(within(segundo).getByText('Coordenação do curso')).toBeInTheDocument()
    expect(within(segundo).getByText('48 h')).toBeInTheDocument() // o prazo é um chip, e o nome acessível segue inteiro
    expect(primeiro.compareDocumentPosition(segundo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // cada nó leva o ícone do tipo
    expect(primeiro.querySelector('svg.lucide-users')).not.toBeNull()
    expect(segundo.querySelector('svg.lucide-graduation-cap')).not.toBeNull()
    // da esquerda para a direita: Início, 1 e 2
    const x = (no: HTMLElement) => Number(/translate\((-?[\d.]+)px/.exec(posicao(no))![1])
    expect([x(screen.getByLabelText('Início')), x(primeiro), x(segundo)].every((v, i, l) => i === 0 || v > l[i - 1])).toBe(true)
    // ligados em ordem
    await waitFor(() => expect(document.querySelectorAll('.react-flow__edge')).toHaveLength(2))
  })

  // textos acessíveis do canvas em pt-BR, sem ids internos
  it('textos acessíveis em português, sem ids internos', async () => {
    cadastros()
    await abrirNoCanvas('Boletos')
    await waitFor(() => expect(document.querySelectorAll('.react-flow__edge')).toHaveLength(2))

    const textos = [document.body.textContent ?? '']
    document.querySelectorAll('[aria-label],[aria-description],[title]').forEach((e) => textos.push(e.getAttribute('aria-label') ?? '', e.getAttribute('aria-description') ?? '', e.getAttribute('title') ?? ''))
    const tudo = textos.join('\n')
    for (const proibido of ['Control Panel', 'Zoom In', 'Zoom Out', 'Fit View', 'Edge from', 'Press enter']) expect(tudo).not.toContain(proibido)
    expect(tudo).not.toMatch(/\binicio\b/)
    expect(tudo).not.toMatch(/\bno-\d+\b/)

    expect(screen.getByLabelText('Ligação de Início para Liderança do semestre')).toBeInTheDocument()
    expect(screen.getByLabelText('Ligação de Liderança do semestre para Coordenação do curso (48 h)')).toBeInTheDocument()
    expect(screen.getByLabelText('Aproximar')).toBeInTheDocument()
    expect(screen.getByLabelText('Afastar')).toBeInTheDocument()
    expect(screen.getByLabelText('Enquadrar o fluxo')).toBeInTheDocument()
  })

  // C86 (AC 73)
  it('regra de ligação', () => {
    const ligacoes: Ligacao[] = [
      { de: Inicio, para: 'a' },
      { de: 'a', para: 'b' },
    ]
    expect(podeLigar(ligacoes, 'b', 'c')).toBe(true) // de um nó sem saída para um nó sem entrada
    expect(podeLigar(ligacoes, 'c', 'c')).toBe(false) // autoligação
    expect(podeLigar(ligacoes, 'a', 'c')).toBe(false) // segunda saída
    expect(podeLigar(ligacoes, 'c', 'b')).toBe(false) // segunda entrada
    expect(podeLigar([{ de: 'x', para: 'y' }, { de: 'y', para: 'z' }], 'z', 'x')).toBe(false) // ciclo
    expect(podeLigar([{ de: 'x', para: 'y' }], 'y', 'x')).toBe(false) // ciclo de dois
    expect(podeLigar([], 'z', Inicio)).toBe(false) // o Início não tem entrada
  })

  // C88 (AC 74)
  it('cadeia inválida desliga salvar e publicar', async () => {
    cadastros()
    const dialogo = await abrirNoCanvas('Boletos')
    expect(dialogo.queryByRole('alert')).not.toBeInTheDocument()
    expect(dialogo.getByRole('button', { name: 'Salvar rascunho' })).toBeEnabled()

    largar('COORDENACAO_CURSO') // um nó solto
    const alerta = await dialogo.findByRole('alert')
    expect(alerta).toHaveTextContent(FraseDaCadeia)
    expect(dialogo.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled()
    expect(dialogo.getByRole('button', { name: 'Publicar' })).toBeDisabled()
    expect(within(noDeEtapa(3, 'Coordenação do curso')).getByText('Fora da cadeia')).toBeInTheDocument()
  })

  it('cadeia inválida: o sexto nó é marcado', async () => {
    cadastros()
    const dialogo = await abrirNoCanvas('Boletos')
    for (const n of [3, 4, 5]) {
      await pelaMenu('Coordenação do curso')
      await screen.findByLabelText(`Etapa ${n}: Coordenação do curso`)
    }
    expect(dialogo.queryByRole('alert')).not.toBeInTheDocument()

    await pelaMenu('Coordenação do curso')

    expect(await dialogo.findByRole('alert')).toHaveTextContent(FraseDaCadeia)
    expect(within(noDeEtapa(6, 'Coordenação do curso')).getByText('Fora da cadeia')).toBeInTheDocument()
    expect(within(noDeEtapa(5, 'Coordenação do curso')).queryByText('Fora da cadeia')).not.toBeInTheDocument()
    expect(dialogo.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled()
    expect(dialogo.getByRole('button', { name: 'Publicar' })).toBeDisabled()
  })

  // C89 (AC 75)
  it('salvar envia ordem e posição, e reabrir põe cada nó onde estava', async () => {
    const chamadas = cadastros({ 'PUT /api/admin/fluxos/7/rascunho': () => [200, {}] })
    const dialogo = await abrirNoCanvas('Boletos')

    await userEvent.click(dialogo.getByRole('button', { name: 'Salvar rascunho' }))

    await waitFor(() => expect(gravadas(chamadas)).toEqual([['PUT', '/api/admin/fluxos/7/rascunho', { etapas: [etapa('LIDERANCA_SEMESTRE', null, null, 288, 80), etapa('COORDENACAO_CURSO', null, 48, 576, 80)] }]]))

    // o rascunho que já tem posição abre com cada nó no seu lugar
    await userEvent.click(dialogo.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await abrirNoCanvas('Notas')
    expect(posicao(noDeEtapa(1, 'Setor Financeiro (24 h)'))).toContain('translate(300px,50px)')
    expect(posicao(noDeEtapa(2, 'Coordenação do curso'))).toContain('translate(600px,50px)')
  })

  // C90 (AC 76)
  it('remover nó pede confirmação se tem setor ou prazo', async () => {
    cadastros()
    const dialogo = await abrirNoCanvas('Notas')
    await selecionar(noDeEtapa(1, 'Setor Financeiro (24 h)'))

    // com setor e prazo, pergunta primeiro: cancelar mantém
    await userEvent.click(await dialogo.findByRole('button', { name: 'Remover etapa selecionada' }))
    const confirmacao = within(await screen.findByRole('dialog', { name: 'Remover a etapa?' }))
    await userEvent.click(confirmacao.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByLabelText('Etapa 1: Setor Financeiro (24 h)')).toBeInTheDocument()

    // confirmar remove o nó e as ligações dele, sem religar o vizinho ao Início
    await userEvent.click(await dialogo.findByRole('button', { name: 'Remover etapa selecionada' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Remover a etapa?' })).getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(screen.queryByLabelText(/Setor Financeiro/)).not.toBeInTheDocument())
    const vizinho = screen.getByLabelText('Etapa 1: Coordenação do curso')
    expect(within(vizinho).getByText('Fora da cadeia')).toBeInTheDocument()
    expect(dialogo.getByRole('alert')).toHaveTextContent(FraseDaCadeia)
    expect(document.querySelectorAll('.react-flow__edge')).toHaveLength(0)

    // sem setor nem prazo, sai direto
    await selecionar(vizinho)
    await userEvent.click(await dialogo.findByRole('button', { name: 'Remover etapa selecionada' }))
    await waitFor(() => expect(screen.queryByLabelText(/^Etapa 1:/)).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: 'Remover a etapa?' })).not.toBeInTheDocument()
    expect(screen.getByText('Arraste um destino para começar.')).toBeInTheDocument()
  })
  // C112 (AD-042): a grade pontilhada e o painel da etapa selecionada, que edita prazo e setor sem esconder o desenho
  it('grade pontilhada e painel da etapa selecionada', async () => {
    cadastros()
    await abrirNoCanvas('Notas')
    expect(document.querySelector('.react-flow__background')).not.toBeNull()
    expect(screen.queryByRole('region', { name: 'Etapa selecionada' })).not.toBeInTheDocument()

    await selecionar(noDeEtapa(1, 'Setor Financeiro (24 h)'))
    const painel = within(await screen.findByRole('region', { name: 'Etapa selecionada' }))
    expect(painel.getByLabelText('Setor da etapa selecionada')).toHaveValue('2')
    await userEvent.clear(painel.getByLabelText('Prazo da etapa selecionada (horas)'))
    await userEvent.type(painel.getByLabelText('Prazo da etapa selecionada (horas)'), '36')
    expect(await screen.findByLabelText('Etapa 1: Setor Financeiro (36 h)')).toBeInTheDocument()

    await userEvent.click(painel.getByRole('button', { name: 'Fechar etapa selecionada' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Etapa selecionada' })).not.toBeInTheDocument())
  })

  // C95 (AC 81)
  it('simulação marca os nós', async () => {
    cadastros({
      'POST /api/admin/fluxos/7/simular': () => [
        200,
        {
          etapas: [
            { ordem: 1, destino: 'LIDERANCA_SEMESTRE', setor: null, situacao: 'NAO_RESOLVIDA', motivo: 'Sem liderança disponível' },
            { ordem: 2, destino: 'COORDENACAO_CURSO', setor: 'Financeiro', situacao: 'RESOLVIDA', motivo: null },
          ],
          inicial: 'Financeiro',
          escolhido: { id: 7, cursoId: 4, semestre: 3 },
        },
      ],
    })
    const dialogo = await abrirNoCanvas('Boletos')
    await userEvent.selectOptions(dialogo.getByLabelText('Curso do aluno'), '4')
    await userEvent.selectOptions(dialogo.getByLabelText('Semestre do aluno'), '3')

    await userEvent.click(dialogo.getByRole('button', { name: 'Simular' }))

    expect(await within(noDeEtapa(1, 'Liderança do semestre')).findByText('Pulada: Sem liderança disponível')).toBeInTheDocument()
    expect(within(noDeEtapa(2, 'Coordenação do curso (48 h)')).getByText('Vai por aqui')).toBeInTheDocument()
  })

  // C96 (Observable)
  it('canvas vazio e falha de carga', async () => {
    cadastros()
    const dialogo = await abrirNoCanvas('Matrícula')
    expect(screen.getByText('Arraste um destino para começar.')).toBeInTheDocument()
    expect(document.querySelectorAll('.react-flow__node')).toHaveLength(1)
    await userEvent.click(dialogo.getByRole('tab', { name: 'Lista' }))
    expect(screen.queryByText('Arraste um destino para começar.')).not.toBeInTheDocument()
  })

  it('canvas vazio e falha de carga: sem o pacote, a lista segue com o aviso', async () => {
    vi.spyOn(Carga, 'canvas').mockRejectedValue(new Error('chunk perdido'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    cadastros()
    const dialogo = await abrirFluxo('Boletos')

    await userEvent.click(dialogo.getByRole('tab', { name: 'Canvas' }))

    expect(await dialogo.findByText('Não foi possível abrir o canvas. Use a lista.')).toBeInTheDocument()
    expect(dialogo.getByLabelText('Destino da etapa 1')).toHaveValue('LIDERANCA_SEMESTRE')
    expect(dialogo.getByRole('button', { name: 'Salvar rascunho' })).toBeEnabled()
  })

  // cadastros-fluxo-visual K7 e K13
  it('editor em tela cheia, com o estado na barra e o simulador na coluna do canvas', async () => {
    cadastros()
    const dialogo = await abrirFluxo('Boletos')
    expect(screen.getByRole('dialog', { name: 'Editar: Fluxos' }).className).toContain('w-screen')
    expect(dialogo.getByText('Publicado v1')).toBeInTheDocument()
    expect(dialogo.getByRole('button', { name: 'Mais' })).toBeInTheDocument()
    expect(dialogo.getByRole('region', { name: 'Simulação' }).closest('aside')).toBeNull() // na lista, embaixo das etapas

    await userEvent.click(dialogo.getByRole('tab', { name: 'Canvas' }))
    await screen.findByLabelText('Início')
    expect(dialogo.getByRole('region', { name: 'Simulação' }).closest('aside')).not.toBeNull()
    await userEvent.click(dialogo.getByRole('button', { name: 'Adicionar etapa' }))
    expect(dialogo.queryByRole('group', { name: 'Destinos' })).not.toBeInTheDocument() // a fileira de destinos acima do canvas não existe mais
  })

  // K8
  it('inserir etapa no meio da cadeia', async () => {
    const chamadas = cadastros({ 'PUT /api/admin/fluxos/7/rascunho': () => [200, {}] })
    const dialogo = await abrirNoCanvas('Boletos')
    await userEvent.click(await screen.findByRole('button', { name: 'Inserir etapa entre Início e Liderança do semestre' }))
    await userEvent.click(await screen.findByRole('button', { name: /^Setor fixo/ }))
    await screen.findByLabelText('Etapa 3: Coordenação do curso (48 h)')
    expect(screen.getByLabelText('Etapa 1: Setor —')).toBeInTheDocument()
    expect(screen.getByLabelText('Etapa 2: Liderança do semestre')).toBeInTheDocument()

    await userEvent.click(dialogo.getByRole('button', { name: 'Salvar rascunho' }))
    await waitFor(() =>
      expect(gravadas(chamadas)).toEqual([['PUT', '/api/admin/fluxos/7/rascunho', { etapas: [etapa('SETOR', null, null, 288, 80), etapa('LIDERANCA_SEMESTRE', null, null, 576, 80), etapa('COORDENACAO_CURSO', null, 48, 864, 80)] }]]),
    )
  })

  // K9
  it('a barra da etapa remove sem confirmar quando a etapa está em branco', async () => {
    cadastros()
    await abrirNoCanvas('Boletos')
    await selecionar(noDeEtapa(1, 'Liderança do semestre'))
    await userEvent.click(await screen.findByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(screen.queryByLabelText(/^Etapa 1: Liderança/)).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: 'Remover a etapa?' })).not.toBeInTheDocument()
  })

  // K12
  it('organizar alinha a cadeia, inserir respeita o limite e o Início nunca fica coberto', () => {
    const g = deEtapas([etapa('SETOR', 2, null, 10, 20), etapa('COORDENACAO_CURSO', null, null, 700, 400)])
    expect(organizar(g).nos.map((n) => [n.x, n.y])).toEqual([[288, 80], [576, 80]])
    expect(fixarPosicoes(g).nos.map((n) => [n.x, n.y])).toEqual([[288, 80], [576, 80]]) // etapa em cima do Início
    const solta = deEtapas([etapa('SETOR', 2, null, 300, 50)])
    expect(fixarPosicoes(solta).nos.map((n) => [n.x, n.y])).toEqual([[300, 50]]) // fora do Início: fica onde está

    const cheio = deEtapas(Array.from({ length: 5 }, () => etapa('COORDENACAO_CURSO')))
    expect(inserirEntre(cheio, Inicio, cheio.nos[0].id, novoNo('SETOR'))).toBe(cheio)
    const curto = deEtapas([etapa('SETOR', 2), etapa('COORDENACAO_CURSO')])
    const inserido = inserirEntre(curto, curto.nos[0].id, curto.nos[1].id, novoNo('LIDERANCA_SEMESTRE'))
    expect(inserido.nos.map((n) => [n.destino, n.x])).toEqual([['SETOR', 288], ['COORDENACAO_CURSO', 864], ['LIDERANCA_SEMESTRE', 576]])
  })

  it('abrir o canvas realinha o fluxo salvo em cima do Início', async () => {
    const posicionado = { numero: 1, etapas: [etapa('SETOR', 2, null, 100, 50), etapa('COORDENACAO_CURSO', null, null, 400, 50)] }
    cadastros({ 'GET /api/admin/fluxos': () => [200, [{ id: 8, categoriaId: 7, cursoId: null, semestre: null, vigente: null, rascunho: posicionado }]] })
    await abrirNoCanvas('Notas')
    expect(posicao(noDeEtapa(1, 'Setor Financeiro'))).toContain('translate(288px,80px)')
    expect(posicao(noDeEtapa(2, 'Coordenação do curso'))).toContain('translate(576px,80px)')
    expect(screen.getByRole('button', { name: 'Organizar' })).toBeEnabled()
  })
})
