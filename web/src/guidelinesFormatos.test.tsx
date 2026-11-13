import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Rotulos } from './administracao/abasDaAparencia'
import { CampoImagem } from './administracao/CampoImagem'
import { AjudaDosAnexos } from './assistente/Anexos'
import { plural } from './formatos'
import { LinkDeAnexo } from './LinkDeAnexo'
import { abrir, api, chamado as chamadoPronto, escolher, instituicao, me, type Rota } from './test/util'

const NB = '\u00a0'
const fontes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const codigo = Object.entries(fontes).filter(([caminho]) => !/\.test\.tsx?$/.test(caminho) && !caminho.startsWith('/src/ui/') && !caminho.startsWith('/src/test/'))
const fonte = (arquivo: string) => fontes[`/src/${arquivo}`]

const admin = me({ papeis: ['ADMINISTRADOR'], matriculas: [] })
const operador = me({ papeis: ['ADMINISTRADOR', 'OPERADOR'], matriculas: [] })
const publica = (inst: object): Record<string, Rota> => ({ 'GET /api/instituicoes/univag': () => [200, inst] })

afterEach(() => {
  localStorage.clear()
})

describe('tamanho, unidade e plural', () => {
  it('C35 o anexo mostra 20 MB para 20480 KB e 512 KB para 512 KB', () => {
    const { unmount } = render(<LinkDeAnexo href="/a" nome="grande.pdf" tamanho={20480 * 1024} />)
    expect(screen.getByText(/^\(.*\)$/)).toHaveTextContent('(20 MB)')
    unmount()
    render(<LinkDeAnexo href="/b" nome="pequeno.pdf" tamanho={512 * 1024} />)
    expect(screen.getByText(/^\(.*\)$/)).toHaveTextContent('(512 KB)')
  })

  it('C35 1,5 MB usa vírgula decimal', () => {
    render(<LinkDeAnexo href="/c" nome="meio.pdf" tamanho={1536 * 1024} />)
    expect(screen.getByText(/^\(.*\)$/).textContent).toBe(`(1,5${NB}MB)`)
  })

  it('C36 o anexo une o número à unidade com espaço inseparável', () => {
    render(<LinkDeAnexo href="/a" nome="grande.pdf" tamanho={20480 * 1024} />)
    expect(screen.getByText(/^\(.*\)$/).textContent).toBe(`(20${NB}MB)`)
  })

  it('C36 as ajudas de tamanho e de pixels usam espaço inseparável', () => {
    expect(AjudaDosAnexos).toBe(`PDF ou foto, até 10${NB}MB`)
    expect(Rotulos.logo[1]).toBe(`PNG ou JPEG, até 1${NB}MB.`)
    expect(Rotulos.icone[1]).toBe(`PNG quadrado de pelo menos 512${NB}px, até 1${NB}MB.`)
    expect(Rotulos.login[1]).toBe(`PNG ou JPEG, até 3${NB}MB.`)
  })

  it('C36 a ajuda do documento mostra 20 MB com espaço inseparável', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/documentos': () => [200, []], 'GET /api/admin/categorias': () => [200, []] })
    abrir('/univag/documentos')
    await userEvent.click(await screen.findByRole('button', { name: 'Novo documento' }))
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText(/^PDF com texto/).textContent).toBe(`PDF com texto (não digitalizado), até 20${NB}MB.`)
  })

  it('C36 as horas dos indicadores saem como 12 h com espaço inseparável', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 5, 10, 0))
    const dados = {
      semDados: false, alunosAtivos: 1, conversas: 1, taxaAutoatendimento: 0.5, taxaEscalonamento: 0.2, taxaAbandono: 0.1, taxaPerguntasSemArtigo: 0.1,
      chamadosAbertos: 4, chamadosResolvidos: 2, tempoPrimeiraRespostaHoras: 1, tempoResolucaoHoras: 12, roteamentoCorreto: 0.5, taxaReabertura: 0.1,
      principaisCategorias: { porConversas: null, porChamados: null }, indicadorPrincipal: 0.7,
    }
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/indicadores?de=2026-11-01&ate=2026-11-05': () => [200, dados] })
    abrir('/univag/indicadores')
    const termo = await screen.findByText('Tempo de resolução', { selector: 'dt' })
    expect(termo.nextElementSibling!.textContent).toBe(`12${NB}h`)
    vi.useRealTimers()
  })

  it('C36 nenhum texto do código escreve número, espaço comum e unidade', () => {
    const achados = codigo.flatMap(([caminho, texto]) => [...texto.matchAll(/\d (?:MB|KB)\b|\d (?:px|h)(?![-\w])/g)].map(([trecho]) => `${caminho}: ${trecho}`))
    expect(achados).toEqual([])
  })

  it('C37 plural de setor, matrícula e administrador', () => {
    expect(plural(1, 'setor', 'setores')).toBe('1 setor')
    expect(plural(2, 'setor', 'setores')).toBe('2 setores')
    expect(plural(0, 'setor', 'setores')).toBe('0 setores')
    expect(plural(1, 'matrícula', 'matrículas')).toBe('1 matrícula')
    expect(plural(2, 'matrícula', 'matrículas')).toBe('2 matrículas')
    expect(plural(1, 'administrador', 'administradores')).toBe('1 administrador')
    expect(plural(2, 'administrador', 'administradores')).toBe('2 administradores')
    expect(plural(1234, 'setor', 'setores')).toBe('1.234 setores')
  })

  it('C37 a lista de instituições escreve 1 administrador e 2 administradores', async () => {
    const lista = [
      { slug: 'um', nome: 'Faculdade Um', fuso: 'America/Cuiaba', ativa: true, criadaEm: '2026-11-02T12:00:00Z', administradores: 1 },
      { slug: 'dois', nome: 'Faculdade Dois', fuso: 'America/Cuiaba', ativa: true, criadaEm: '2026-11-02T12:00:00Z', administradores: 2 },
    ]
    api({ 'GET /api/auth/me': () => [200, operador], 'GET /api/plataforma/instituicoes': () => [200, lista] })
    abrir('/univag/instituicoes')
    const linha = async (nome: string) => (await screen.findByText(nome)).closest('tr') as HTMLElement
    expect(await linha('Faculdade Um')).toHaveTextContent('1 administrador · criada em')
    expect(await linha('Faculdade Um')).not.toHaveTextContent('1 administradores')
    expect(await linha('Faculdade Dois')).toHaveTextContent('2 administradores · criada em')
  })

  it('C37 a carga importada escreve 1 setor e 2 cursos', async () => {
    const lista = [{ slug: 'demo', nome: 'Faculdade Demo', fuso: 'America/Cuiaba', ativa: true, criadaEm: '2026-11-02T12:00:00Z', administradores: 2 }]
    api({
      'GET /api/auth/me': () => [200, operador],
      'GET /api/plataforma/instituicoes': () => [200, lista],
      'POST /api/plataforma/instituicoes/demo/carga': () => [200, { setores: 1, cursos: 2, categorias: 1, regras: 0, artigos: 1 }],
    })
    abrir('/univag/instituicoes')
    await escolher('Faculdade Demo', 'Importar carga')
    const d = within(await screen.findByRole('dialog', { name: /Importar carga/ }))
    await userEvent.upload(d.getByLabelText(/Arquivo de carga/), new File(['{}'], 'carga.json', { type: 'application/json' }))
    await userEvent.click(d.getByRole('button', { name: 'Importar' }))
    expect(await d.findByText('Importados: 1 setor, 2 cursos, 1 categoria, 0 regras, 1 artigo.')).toBeInTheDocument()
  })

  it('C37 a importação de matrículas escreve 1 matrícula criada e 2 atualizadas', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'POST /api/admin/matriculas/importacao': () => [200, { criados: 1, atualizados: 2 }] })
    abrir('/univag/matriculas')
    await userEvent.upload(await screen.findByLabelText('Arquivo CSV'), new File(['cpf;nome'], 'alunos.csv', { type: 'text/csv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Importar' }))
    expect(await screen.findByText('Importação concluída: 1 matrícula criada e 2 atualizadas.')).toBeInTheDocument()
  })
})

describe('datas curtas', () => {
  const token = { id: 1, nome: 'Cursor', usuario: 'Ana', final: 'wxyz', criadoEm: '2026-11-01T15:00:00Z', expiraEm: '2027-01-30T15:00:00Z', ultimoUsoEm: null, estado: 'ATIVO' }

  it('C38 Instituições e Mcp mostram dd/mm/aaaa no fuso da instituição', async () => {
    const lista = [{ slug: 'demo', nome: 'Faculdade Demo', fuso: 'America/Cuiaba', ativa: true, criadaEm: '2026-11-02T01:00:00Z', administradores: 2 }]
    api({ 'GET /api/auth/me': () => [200, operador], 'GET /api/plataforma/instituicoes': () => [200, lista] })
    const montada = abrir('/univag/instituicoes')
    const linha = ((await screen.findByText('Faculdade Demo')).closest('tr') as HTMLElement)
    expect(within(linha).getAllByRole('cell').map((c) => c.textContent)).toContain('01/11/2026')
    montada.unmount()

    api({
      'GET /api/auth/me': () => [200, admin],
      'GET /api/instituicoes/univag': () => [200, instituicao()],
      'GET /api/admin/mcp': () => [200, { url: 'https://one.teste/api/mcp/univag', tokens: [token] }],
      'GET /api/admin/moodle': () => [200, { configurada: false, ativa: false, emissor: '', clientId: '', deploymentId: '', authUrl: '', jwksUrl: '', urlLogin: '', urlLancamento: '', urlJwks: '' }],
    })
    abrir('/univag/integracoes?aba=mcp')
    const celulas = within((await screen.findByText('Cursor')).closest('tr') as HTMLElement).getAllByRole('cell').map((c) => c.textContent)
    expect(celulas).toContain('01/11/2026')
    expect(celulas).toContain('30/01/2027')
  })

  it('C38 o código usa Intl.DateTimeFormat com dateStyle short e nenhum slice sobre a data formatada', () => {
    expect(fonte('formatos.ts')).toMatch(/Intl\.DateTimeFormat\('pt-BR',\s*\{\s*dateStyle:\s*'short'/)
    for (const arquivo of ['administracao/Instituicoes.tsx', 'administracao/Mcp.tsx']) {
      expect(fonte(arquivo), arquivo).not.toMatch(/formatarData\([^)]*\)\.slice\(0,\s*10\)/)
      expect(fonte(arquivo), arquivo).toContain('dataCurta(')
    }
  })
})

describe('imagens com dimensões', () => {
  const marca = instituicao({ imagens: { logo: 3, icone: 2, login: 4, assistente: 5 } })
  const todas = () => [...document.querySelectorAll('img')]

  it('C41 logo e foto de login declaram width e height', async () => {
    api({ ...publica(marca), 'GET /api/auth/me': () => [401, { status: 401, title: 'Não autorizado' }] })
    abrir('/univag')
    await screen.findByLabelText('CPF')
    await waitFor(() => expect(todas().length).toBeGreaterThanOrEqual(3))
    for (const img of todas()) {
      expect(img.getAttribute('width'), img.getAttribute('src')!).toMatch(/^\d+$/)
      expect(img.getAttribute('height'), img.getAttribute('src')!).toMatch(/^\d+$/)
    }
    expect(todas().some((i) => i.getAttribute('src')!.includes('/imagens/login'))).toBe(true)
    expect(todas().some((i) => i.getAttribute('src')!.includes('/imagens/logo'))).toBe(true)
  })

  it('C41 logo, Sigla e avatar do assistente declaram width e height', async () => {
    api({ ...publica(marca), 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/assistente')
    await waitFor(() => expect(todas().some((i) => i.getAttribute('src')!.includes('/imagens/assistente'))).toBe(true))
    expect(todas().some((i) => i.getAttribute('src')!.includes('/imagens/icone'))).toBe(true)
    expect(todas().some((i) => i.getAttribute('src')!.includes('/imagens/logo'))).toBe(true)
    for (const img of todas()) {
      expect(img.getAttribute('width'), img.getAttribute('src')!).toMatch(/^\d+$/)
      expect(img.getAttribute('height'), img.getAttribute('src')!).toMatch(/^\d+$/)
    }
  })
})

describe('translate no', () => {
  const contato = { horario: 'Seg a sex', telefone: '(65) 3688-6000', email: 'atendimento@univag.edu.br' }
  const fixo = (el: HTMLElement) => el.closest('[translate]')
  const usuario = { id: 7, cpf: '12345678909', nome: 'Pessoa Sete', email: 'sete@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ALUNO'], setores: [] }

  it('C44 o CPF e o contato da Conta saem com translate no', async () => {
    api({ ...publica(instituicao({ contato })), 'GET /api/auth/me': () => [200, me()] })
    abrir('/univag/conta')
    expect(fixo(await screen.findByText('***.456.789-**'))).toHaveAttribute('translate', 'no')
    await userEvent.click(screen.getByRole('button', { name: 'Contato do atendimento' }))
    const dialogo = within(await screen.findByRole('dialog'))
    expect(fixo(dialogo.getByText('(65) 3688-6000'))).toHaveAttribute('translate', 'no')
    expect(fixo(dialogo.getByText('atendimento@univag.edu.br'))).toHaveAttribute('translate', 'no')
  })

  it('C44 a marca do login e da barra saem com translate no', async () => {
    api({ ...publica(instituicao()), 'GET /api/auth/me': () => [401, { status: 401, title: 'Não autorizado' }] })
    const montada = abrir('/univag')
    expect(await screen.findByRole('heading', { name: 'Univag' })).toHaveAttribute('translate', 'no')
    montada.unmount()

    api({ ...publica(instituicao()), 'GET /api/auth/me': () => [200, admin] })
    abrir('/univag/usuarios')
    await waitFor(() => expect(screen.getByTestId('instituicao')).toHaveAttribute('translate', 'no'))
  })

  it('C44 CPF e e-mail da lista de usuários saem com translate no', async () => {
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': () => [200, [usuario]], 'GET /api/admin/setores': () => [200, []] })
    abrir('/univag/usuarios')
    const linha = (await screen.findByText('Pessoa Sete')).closest('tr') as HTMLElement
    const celulas = within(linha).getAllByRole('cell')
    const fixas = celulas.map((c) => c.querySelector('[translate=no]')?.textContent)
    expect(fixas).toContain('123.456.789-09')
    expect(fixas).toContain('sete@univag.edu.br')
  })

  it('C44 o protocolo ONE-n da fila sai com translate no', async () => {
    const chamado = { numero: 'ONE-1', titulo: 'boleto', categoria: 'Boleto', estado: 'ABERTO', responsavel: null, criadoEm: '2026-11-02T12:00:00Z', dias: 1 }
    api({ 'GET /api/auth/me': () => [200, me({ papeis: ['ATENDENTE'] })], 'GET /api/chamados?escopo=fila': () => [200, [chamado]] })
    abrir('/univag/fila')
    expect(fixo(await screen.findByText('ONE-1'))).toHaveAttribute('translate', 'no')
  })

  it('C44 o endereço da instituição na lista da plataforma sai com translate no', async () => {
    const lista = [{ slug: 'demo', nome: 'Faculdade Demo', fuso: 'America/Cuiaba', ativa: true, criadaEm: '2026-11-02T12:00:00Z', administradores: 2 }]
    api({ 'GET /api/auth/me': () => [200, operador], 'GET /api/plataforma/instituicoes': () => [200, lista] })
    abrir('/univag/instituicoes')
    expect(fixo(await screen.findByText('/demo'))).toHaveAttribute('translate', 'no')
  })
})

describe('aspas curvas', () => {
  it('C45 nenhum texto do código usa « ou » como aspas', () => {
    expect(codigo.filter(([, texto]) => /[«»]/.test(texto)).map(([caminho]) => caminho)).toEqual([])
  })

  it('C45 o texto do Moodle e os de comum, Documentos e Cadastros não citam com aspas retas', () => {
    expect(fonte('administracao/Moodle.tsx')).not.toMatch(/'[^'\n]*"[^"'\n]+"[^'\n]*'/)
    for (const arquivo of ['conhecimento/comum.tsx', 'conhecimento/Documentos.tsx', 'administracao/Cadastros.tsx']) {
      expect(fonte(arquivo), arquivo).toContain('“')
      expect(fonte(arquivo), arquivo).toContain('”')
      expect(fonte(arquivo), arquivo).not.toMatch(/>\s*"\{|\}"\s/)
    }
  })

  it('C45 a confirmação de arquivar cita o título entre aspas curvas', async () => {
    const artigo = { id: 1, estado: 'ATIVO', indexacao: null, categoriaId: 3, categoria: 'Estágio', visivelDe: null, visivelAte: null, versao: { id: 1, numero: 1, titulo: 'Faltas', perguntas: [], resposta: 'x', links: [] } }
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/artigos': () => [200, [artigo]], 'GET /api/admin/categorias': () => [200, [{ id: 3, nome: 'Estágio', ativa: true }]] })
    abrir('/univag/artigos')
    await screen.findByText('Faltas')
    await escolher('Faltas', 'Arquivar')
    expect(await screen.findByText(/sai da base do assistente/)).toHaveTextContent('“Faltas” sai da base do assistente.')
  })

  it('C45 a busca sem resultado de Cadastros cita o termo entre aspas curvas', async () => {
    const vazias = Object.fromEntries(['categorias', 'cursos', 'fluxos', 'respostas-prontas'].map((k) => [`GET /api/admin/${k}`, (() => [200, []]) as Rota]))
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/setores': () => [200, [{ id: 1, nome: 'Financeiro', triagem: false, ativo: true }]], ...vazias })
    abrir('/univag/cadastros')
    await userEvent.type(await screen.findByLabelText('Buscar em Setores'), 'zzz')
    expect(await screen.findByText('Nenhum resultado para “zzz”')).toBeInTheDocument()
  })
})

describe('translate no nos tokens que faltavam', () => {
  const noToken = (el: HTMLElement) => {
    expect(el.tagName).toBe('SPAN')
    expect(el).toHaveAttribute('translate', 'no')
    return el
  }

  it('C44 CPF e e-mail do detalhe de celular de Usuários ficam em spans só do token', async () => {
    const usuario = { id: 7, cpf: '12345678909', nome: 'Pessoa Sete', email: 'sete@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ALUNO'], setores: [] }
    api({ 'GET /api/auth/me': () => [200, admin], 'GET /api/admin/usuarios': () => [200, [usuario]], 'GET /api/admin/setores': () => [200, []] })
    abrir('/univag/usuarios')
    const linha = (await screen.findByText('Pessoa Sete')).closest('td') as HTMLElement
    const detalhe = linha.querySelector('[data-slot=detalhe], :scope > :not(:first-child)') ?? linha
    const spans = [...detalhe.querySelectorAll<HTMLElement>('[translate=no]')].map((s) => noToken(s).textContent)
    expect(spans).toEqual(['123.456.789-09', 'sete@univag.edu.br'])
    expect(detalhe.textContent).toContain('Aluno')
  })

  it('C44 o e-mail do aviso de instituição criada fica em span só do token', async () => {
    api({
      'GET /api/auth/me': () => [200, operador],
      'GET /api/plataforma/instituicoes': () => [200, []],
      'POST /api/plataforma/instituicoes': () => [201, { slug: 'demo', nome: 'Faculdade Demo', fuso: 'America/Cuiaba', ativa: true, criadaEm: '2026-11-02T12:00:00Z', administradores: 1 }],
    })
    abrir('/univag/instituicoes')
    await userEvent.click(await screen.findByRole('button', { name: 'Nova instituição' }))
    const d = within(await screen.findByRole('dialog'))
    const [nome, nomeDoAdmin] = d.getAllByLabelText('Nome')
    await userEvent.type(nome, 'Faculdade Demo')
    await userEvent.type(nomeDoAdmin, 'Dona Admin')
    await userEvent.type(d.getByLabelText('CPF'), '123.456.789-09')
    await userEvent.type(d.getByLabelText('E-mail'), 'admin@demo.edu.br')
    await userEvent.click(d.getByRole('button', { name: /^(Criar|Salvar)/ }))
    noToken(await screen.findByText('admin@demo.edu.br'))
  })

  it('C44 o protocolo ONE-n da solicitação aberta no Assistente fica em span só do token', async () => {
    const item = { numero: 'ONE-5', titulo: 'preciso do boleto', estado: 'ABERTO', criadoEm: '2026-11-02T12:00:00Z' }
    api({ 'GET /api/auth/me': () => [200, me()], 'GET /api/chamados?escopo=meus': () => [200, [item]] })
    abrir('/univag/assistente')
    const protocolo = noToken(await screen.findByText('ONE-5'))
    expect(protocolo.closest('a')).toHaveTextContent('Sua solicitação ONE-5 · Aberto')
  })

  it('C44 o protocolo ONE-n da transferência no Assistente fica em span só do token', async () => {
    api({
      'GET /api/auth/me': () => [200, me()],
      'POST /api/atendimento-direto': () => [201, { numero: 'ONE-1', estado: 'ABERTO', setor: 'Financeiro' }],
      'GET /api/chamados/ONE-1': () => [200, chamadoPronto()],
    })
    abrir('/univag/assistente')
    await userEvent.type(await screen.findByLabelText('Mensagem'), 'x')
    await userEvent.click(screen.getByRole('button', { name: /Falar com atendente/ }))
    const d = within(await screen.findByRole('dialog'))
    await userEvent.click(d.getByRole('button', { name: 'Falar com atendente' }))
    const protocolo = noToken(await screen.findByText('ONE-1'))
    expect(protocolo.closest('h2')).toHaveTextContent('Sua solicitação ONE-1 foi para Financeiro')
  })
})

describe('CampoImagem com dimensões', () => {
  it('C41 a miniatura do CampoImagem declara width e height', () => {
    render(<CampoImagem rotulo="Logo" dica="PNG" miniatura="/logo.png" escolher={() => {}} remover={() => {}} />)
    const img = screen.getByAltText('Miniatura: Logo')
    expect(img.getAttribute('width')).toMatch(/^\d+$/)
    expect(img.getAttribute('height')).toMatch(/^\d+$/)
  })
})