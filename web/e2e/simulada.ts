import type { Page } from '@playwright/test'

// layout-painel C13: textos sem espaço que só quebram pelo CSS (título de 120 caracteres, e-mail de 60)
const TituloLongo = 'Boleto'.repeat(20)
const EmailLongo = 'e'.repeat(46) + '@univag.edu.br'

const longo = 'Preciso da segunda via do boleto de novembro, que veio com o valor da rematrícula do semestre anterior'

// O chamado ONE-123 como a equipe o recebe; `estado` deixa o teste do Sheet ver a troca.
export const chamadoSimulado = (estado = 'EM_ATENDIMENTO') => ({
  numero: 'ONE-123', titulo: longo, estado, motivoFechamento: null, setor: 'Coordenação de Análise e Desenvolvimento de Sistemas',
  categoria: 'Financeiro > Boletos e mensalidades', responsavel: 'Carla Regina de Souza', criadoEm: '2026-11-02T12:00:00Z', resolvidoEm: null,
  matricula: { numero: '2000567890', curso: 'Análise e Desenvolvimento de Sistemas', semestre: 3 }, solicitante: 'Ana Beatriz', origemCategoria: 'IA',
  resumo: 'Aluna pede a segunda via do boleto de novembro com valor corrigido.',
  transcricao: [
    { autor: 'ALUNO', texto: longo, criadaEm: '2026-11-02T12:00:00Z' },
    { autor: 'ASSISTENTE', texto: 'O boleto fica em https://portal.univag.edu.br/financeiro/boletos/segunda-via', criadaEm: '2026-11-02T12:00:05Z',
      fontes: [{ versaoArtigoId: 1, titulo: 'Como emitir a segunda via do boleto do semestre', trechos: ['https://portal.univag.edu.br/financeiro/boletos/segunda-via'], atualizado: true }] },
  ],
  mensagens: [{ id: 1, tipo: 'NOTA', texto: 'Conferir com a tesouraria antes de responder.', autor: 'Carla Regina de Souza', doAluno: false, criadaEm: '2026-11-02T12:10:00Z' }],
  eventos: [{ tipo: 'TRANSICAO', ator: 'Carla Regina de Souza', doAluno: false, de: 'AGUARDANDO_ALUNO', para: 'EM_ATENDIMENTO', detalhe: null, criadoEm: '2026-11-02T12:10:00Z' }],
  acoes: ['responder', 'nota', 'resolver', 'assumir', 'confirmar', 'encaminhar', 'cancelar', 'reclassificar'],
})

// A aparência de GET /api/instituicoes/univag sem nada definido e com tudo definido (aparencia-instituicao AC 28).
export const semAparencia = {
  nomeCurto: null, cor: null, login: { titulo: null, frase: null, itens: [] }, assistente: { nome: null, boasVindas: null, perguntas: [] },
  contato: { horario: null, telefone: null, email: null }, imagens: { logo: null, icone: null, login: null, assistente: null },
}
export const comAparencia = {
  nomeCurto: 'Univag', cor: '#8a1538', login: { titulo: 'Fale com a Univag', frase: 'Aqui você resolve tudo sobre a sua vida acadêmica.', itens: ['Boletos', 'Matrícula', 'Documentos'] },
  assistente: { nome: 'Vagner', boasVindas: 'Oi! Posso ajudar com boletos e matrícula.', perguntas: ['Como pago a mensalidade?', 'Quando abre a rematrícula?', 'Onde vejo minhas notas?', 'Como peço o histórico?'] },
  contato: { horario: 'Seg a sex, 8h às 18h', telefone: '(65) 3688-6000', email: 'atendimento@univag.edu.br' }, imagens: { logo: 3, icone: 2, login: 1, assistente: 4 },
}
// um PNG de 1 x 1 para as rotas de imagem
const Png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==', 'base64')

// instituicoes-plataforma: o que GET /api/plataforma/instituicoes devolve (uma ativa com nome longo e uma desativada)
export const InstituicoesSimuladas = [
  { slug: 'univag', nome: 'Centro Universitário de Várzea Grande', fuso: 'America/Cuiaba', ativa: true, criadaEm: '2026-11-02T12:00:00Z', administradores: 2 },
  { slug: 'faculdade-antiga', nome: 'Faculdade Antiga', fuso: 'America/Sao_Paulo', ativa: false, criadaEm: '2026-09-15T12:00:00Z', administradores: 0 },
]

// API simulada: o teste mede só o layout de cada tela.
// `aparencia` é o que GET /api/instituicoes/univag e GET /api/admin/aparencia devolvem ao lado do nome.
// Com `extremos`, Fila, Artigos, Documentos e Usuários ganham uma linha com os textos longos de C13.
export async function simularApi(page: Page, papeis = ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'], extremos = false, aparencia: object = semAparencia) {
  const mais = <T,>(linhas: T[], extra: T) => (extremos ? [...linhas, extra] : linhas)
  await page.route('**/api/**', (rota) => {
    const caminho = new URL(rota.request().url()).pathname
    const json = (status: number, corpo: unknown) => rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) })
    if (caminho === '/api/instituicoes/univag') return json(200, { nome: 'Centro Universitário de Várzea Grande', ...aparencia })
    if (/^\/api\/instituicoes\/univag\/imagens\/\w+$/.test(caminho)) return rota.fulfill({ status: 200, contentType: 'image/png', body: Png })
    if (caminho === '/api/admin/aparencia') return json(200, aparencia)
    if (caminho.startsWith('/api/admin/aparencia/imagens/')) return json(200, { tipo: caminho.split('/').pop(), versao: 4 })
    if (caminho === '/api/auth/me')
      return json(200, {
        id: 1,
        nome: 'Ana',
        cpfMascarado: '***.456.789-**',
        papeis,
        deveTrocarSenha: false,
        instituicao: { slug: 'univag', nome: 'Centro Universitário de Várzea Grande', fuso: 'America/Cuiaba' },
        matriculas: [],
      })
    if (caminho === '/api/conversas')
      return json(201, { conversaId: 1, resposta: { tipo: 'resposta', texto: 'O boleto do semestre fica no Portal do Aluno: https://portal.univag.edu.br/financeiro/boletos/segunda-via' } })
    if (caminho === '/api/chamados' && rota.request().url().includes('escopo=fila'))
      {
      const fila = { numero: 'ONE-123', titulo: longo, categoria: 'Financeiro > Boletos e mensalidades', estado: 'AGUARDANDO_ALUNO', responsavel: 'Carla Regina de Souza', criadoEm: '2026-11-02T12:00:00Z', dias: 12 }
      return json(200, mais([fila], { ...fila, numero: 'ONE-124', titulo: TituloLongo }))
    }
    if (caminho === '/api/chamados') return json(200, [{ numero: 'ONE-123', titulo: longo, estado: 'EM_ATENDIMENTO', criadoEm: '2026-11-02T12:00:00Z' }])
    if (caminho === '/api/chamados/ONE-123') return json(200, chamadoSimulado())
    if (caminho === '/api/admin/usuarios')
      {
      const usuario = { id: 1, cpf: '12345678909', nome: 'Carla Regina de Souza Albuquerque', email: 'carla.regina.albuquerque@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ATENDENTE', 'ADMINISTRADOR'], setores: [1] }
      return json(200, mais([usuario], { ...usuario, id: 2, nome: 'Bruno', email: EmailLongo }))
    }
    if (caminho === '/api/admin/setores') return json(200, [{ id: 1, nome: 'Coordenação de Análise e Desenvolvimento de Sistemas', triagem: false, ativo: true }])
    if (['/api/admin/cursos', '/api/admin/fluxos', '/api/admin/respostas-prontas'].includes(caminho)) return json(200, [])
    if (caminho.startsWith('/api/admin/fluxos/')) return json(200, { numero: 1, etapas: [] })
    if (caminho === '/api/chamados/ONE-123/subir') return json(200, chamadoSimulado())
    if (/^\/api\/conversas\/\d+\/destino$/.test(caminho)) return json(200, { lideranca: false })
    if (caminho === '/api/admin/categorias') return json(200, [{ id: 1, nome: 'Financeiro > Boletos e mensalidades', ativa: true }])
    if (caminho === '/api/admin/artigos')
{
      const artigo = { id: 1, estado: 'ARQUIVADO', indexacao: 'INDEXADO', categoriaId: 1, categoria: 'Financeiro > Boletos e mensalidades',
        versao: { id: 1, numero: 12, titulo: 'Como emitir a segunda via do boleto do semestre com o valor corrigido', perguntas: ['boleto?'], resposta: 'x', links: [] } }
      return json(200, mais([artigo], { ...artigo, id: 2, versao: { ...artigo.versao, id: 2, titulo: TituloLongo } }))
    }
    if (caminho === '/api/indicadores')
      return json(200, {
        semDados: false, alunosAtivos: 1234, conversas: 5678, taxaAutoatendimento: 0.6543, taxaEscalonamento: 0.2, taxaAbandono: 0.1457, taxaPerguntasSemArtigo: 0.12,
        chamadosAbertos: 321, chamadosResolvidos: 1200, tempoPrimeiraRespostaHoras: 12.75, tempoResolucaoHoras: 123.25, roteamentoCorreto: 0.91, taxaReabertura: 0.05,
        principaisCategorias: { porConversas: [{ categoria: extremos ? 'Financeiro > Boletos e mensalidades 2026' : 'Financeiro > Boletos e mensalidades', total: 1000 }], porChamados: [{ categoria: 'Acadêmico > Notas e frequência', total: 300 }] },
        indicadorPrincipal: 0.7123,
      })
    if (caminho === '/api/admin/documentos')
{
      const documento = { id: 1, titulo: 'Regulamento do estágio supervisionado obrigatório dos cursos de graduação', categoriaId: 1, categoria: 'Financeiro > Boletos e mensalidades', estado: 'ATIVO', indexacao: 'INDEXADO',
        versao: { id: 1, numero: 3, nomeArquivo: 'regulamento-do-estagio-supervisionado-obrigatorio-2026.pdf', paginas: 42, criadaEm: '2026-11-02T12:00:00Z' } }
      return json(200, mais([documento], { ...documento, id: 2, titulo: TituloLongo }))
    }
    if (caminho === '/api/plataforma/instituicoes') return json(rota.request().method() === 'GET' ? 200 : 201, rota.request().method() === 'GET' ? InstituicoesSimuladas : InstituicoesSimuladas[0])
    if (caminho.startsWith('/api/plataforma/instituicoes/')) return json(200, { slug: caminho.split('/')[4], ativa: true, enviados: 2, setores: 2, cursos: 1, categorias: 3, regras: 2, artigos: 5 })
    return json(404, { status: 404, detail: 'Recurso não encontrado.' })
  })
}

// As telas de C13 e do teste de 360 px, cada uma com o que esperar até estar desenhada.
export const Telas: [string, string, (p: Page) => Promise<void>][] = [
  ['Login', '/univag', async (p) => void (await p.getByLabel('CPF').waitFor())],
  [
    'Assistente',
    '/univag/assistente',
    async (p) => {
      await p.getByLabel('Mensagem').fill('preciso do boleto do semestre, onde encontro a segunda via?')
      await p.getByRole('button', { name: /Enviar/ }).click()
      await p.getByText('Isso resolveu?').waitFor()
    },
  ],
  ['Minhas solicitações', '/univag/solicitacoes', async (p) => void (await p.getByText('ONE-123').waitFor())],
  ['Fila', '/univag/fila', async (p) => void (await p.getByText('ONE-123').waitFor())],
  ['Detalhe do chamado', '/univag/chamados/ONE-123', async (p) => void (await p.getByText('Resumo gerado por IA').waitFor())],
  ['Artigos', '/univag/artigos', async (p) => void (await p.getByText('ARQUIVADO').first().waitFor())],
  ['Indicadores', '/univag/indicadores', async (p) => void (await p.getByText('Indicador principal').waitFor())],
  ['Usuários', '/univag/usuarios', async (p) => void (await p.getByText('Carla Regina de Souza Albuquerque').waitFor())],
  [
    'Matrículas',
    '/univag/matriculas',
    async (p) => {
      await p.route('**/api/admin/matriculas/importacao', (r) =>
        r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ status: 400, detail: 'Há erros no arquivo.', erros: [{ linha: 2, motivo: 'O CPF informado nesta linha não confere com nenhum aluno cadastrado' }] }) }),
      )
      await p.locator('input[type=file]').setInputFiles({ name: 'matriculas.csv', mimeType: 'text/csv', buffer: Buffer.from('cpf;nome') })
      await p.getByRole('button', { name: 'Importar' }).click()
      await p.getByRole('dialog').getByRole('button', { name: 'Importar' }).click()
      await p.getByText(/não confere/).waitFor()
    },
  ],
  ['Cadastros', '/univag/cadastros', async (p) => void (await p.getByText('Coordenação de Análise e Desenvolvimento de Sistemas').waitFor())],
  ['Raiz', '/', async (p) => void (await p.getByText('Abra o endereço da sua instituição, por exemplo /univag.').waitFor())],
  ['Aparência', '/univag/aparencia', async (p) => void (await p.getByLabel('Cor principal').waitFor())],
  ['Primeiro acesso', '/univag/primeiro-acesso', async (p) => void (await p.getByLabel('CPF').waitFor())],
  ['Criar senha', '/univag/definir-senha?token=x', async (p) => void (await p.getByLabel('Nova senha').waitFor())],
  ['Trocar senha', '/univag/trocar-senha', async (p) => void (await p.getByLabel('Senha atual').waitFor())],
  ['Documentos', '/univag/documentos', async (p) => void (await p.getByText('Regulamento do estágio supervisionado obrigatório dos cursos de graduação').waitFor())],
]

// ---------- cor pintada (revisao-ux, movida de ux.spec.ts para identidade.spec.ts usar) ----------
declare global {
  interface Window {
    __ux: { pintar: (pilha: string[]) => number[]; pilha: (el: Element) => string[] }
  }
}

// As duas funções do navegador: pintar uma pilha de cores (a primeira é o fundo) e achar a pilha de fundo de um elemento até o fundo opaco mais próximo.
export async function instalar(page: Page) {
  await page.addInitScript(() => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const pintar = (pilha: string[]) => {
      ctx.clearRect(0, 0, 300, 150)
      for (const cor of pilha) {
        ctx.fillStyle = cor
        ctx.fillRect(0, 0, 300, 150)
      }
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
    }
    window.__ux = {
      pintar,
      pilha(el) {
        const camadas: string[] = []
        for (let n: Element | null = el; n; n = n.parentElement) {
          const cor = getComputedStyle(n).backgroundColor
          const [sobrePreto, sobreBranco] = [pintar(['#000', cor]), pintar(['#fff', cor])]
          if (sobrePreto.join() === '0,0,0' && sobreBranco.join() === '255,255,255') continue // transparente
          camadas.unshift(cor)
          if (sobrePreto.join() === sobreBranco.join()) return camadas // opaca: acaba aqui
        }
        return ['#fff', ...camadas]
      },
    }
  })
}

// A cor de um elemento de referência pintado com var(--token), em sRGB de 8 bits
export async function referencia(page: Page, token: string) {
  return page.evaluate((t) => {
    const ref = document.createElement('div')
    ref.style.color = `var(${t})`
    document.body.append(ref)
    const cor = getComputedStyle(ref).color
    ref.remove()
    return window.__ux.pintar(['#fff', cor])
  }, token)
}

// ---------- varredura das telas (ux.spec.ts e identidade.spec.ts) ----------
export async function abrirTela(page: Page, nome: string) {
  const [, caminho, esperar] = Telas.find(([n]) => n === nome)!
  await page.goto(caminho)
  await esperar(page)
}

// As telas de C55 a C57: `Telas`, Conta e Instituições (P16)
export async function varrer(page: Page, aoAbrir: (nome: string) => Promise<void>, aparencia: object = semAparencia) {
  const telas: [string, () => Promise<void>][] = [
    ...Telas.map(([nome]) => [nome, () => abrirTela(page, nome)] as [string, () => Promise<void>]),
    ['Conta', async () => { await page.goto('/univag/conta'); await page.getByText('***.456.789-**').waitFor() }],
    ['Instituições', async () => { await page.goto('/univag/instituicoes'); await page.getByText('Faculdade Antiga').waitFor() }],
  ]
  for (const [nome, abrirDaTela] of telas) {
    await page.unroute('**/api/**')
    await simularApi(page, nome === 'Instituições' ? ['ADMINISTRADOR', 'OPERADOR'] : nome === 'Conta' ? ['ALUNO'] : undefined, false, aparencia)
    await abrirDaTela()
    await aoAbrir(nome)
  }
}
