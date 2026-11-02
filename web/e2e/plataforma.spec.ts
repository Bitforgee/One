import { expect, test, type Page } from '@playwright/test'

test('manifesto e service worker', async ({ page, request }) => {
  const manifesto = await (await request.get('/manifest.webmanifest')).json()
  expect(manifesto.name).toBe('One')
  const tamanhos = manifesto.icons.map((i: { sizes: string }) => i.sizes)
  expect(tamanhos).toEqual(expect.arrayContaining(['192x192', '512x512']))
  for (const icone of manifesto.icons) {
    const r = await request.get(icone.src)
    expect(r.status()).toBe(200)
    expect(r.headers()['content-type']).toBe('image/png')
  }

  await page.goto('/univag')
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)

  const status = await page.evaluate(async () => (await fetch('/api/auth/me')).status)
  expect(status).toBe(401)

  const urls = await page.evaluate(async () => {
    const lista: string[] = []
    for (const nome of await caches.keys()) for (const r of await (await caches.open(nome)).keys()) lista.push(r.url)
    return lista
  })
  expect(urls.length).toBeGreaterThan(0)
  expect(urls.filter((u) => new URL(u).pathname.startsWith('/api/'))).toEqual([])
})

// API simulada: o teste mede só o layout de cada tela.
async function simularApi(page: Page) {
  await page.route('**/api/**', (rota) => {
    const caminho = new URL(rota.request().url()).pathname
    const json = (status: number, corpo: unknown) => rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) })
    if (caminho === '/api/instituicoes/univag') return json(200, { nome: 'Centro Universitário de Várzea Grande' })
    if (caminho === '/api/auth/me')
      return json(200, {
        id: 1,
        nome: 'Ana',
        cpfMascarado: '***.456.789-**',
        papeis: ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR'],
        deveTrocarSenha: false,
        instituicao: { slug: 'univag', nome: 'Centro Universitário de Várzea Grande', fuso: 'America/Cuiaba' },
        matriculas: [],
      })
    if (caminho === '/api/conversas')
      return json(201, { conversaId: 1, resposta: { tipo: 'resposta', texto: 'O boleto do semestre fica no Portal do Aluno: https://portal.univag.edu.br/financeiro/boletos/segunda-via' } })
    const longo = 'Preciso da segunda via do boleto de novembro, que veio com o valor da rematrícula do semestre anterior'
    if (caminho === '/api/chamados' && rota.request().url().includes('escopo=fila'))
      return json(200, [{ numero: 'ONE-123', titulo: longo, categoria: 'Financeiro > Boletos e mensalidades', estado: 'AGUARDANDO_ALUNO', responsavel: 'Carla Regina de Souza', criadoEm: '2026-11-02T12:00:00Z', dias: 12 }])
    if (caminho === '/api/chamados') return json(200, [{ numero: 'ONE-123', titulo: longo, estado: 'EM_ATENDIMENTO', criadoEm: '2026-11-02T12:00:00Z' }])
    if (caminho === '/api/chamados/ONE-123')
      return json(200, {
        numero: 'ONE-123', titulo: longo, estado: 'EM_ATENDIMENTO', motivoFechamento: null, setor: 'Coordenação de Análise e Desenvolvimento de Sistemas',
        categoria: 'Financeiro > Boletos e mensalidades', responsavel: 'Carla Regina de Souza', criadoEm: '2026-11-02T12:00:00Z', resolvidoEm: null,
        matricula: { numero: '2000567890', curso: 'Análise e Desenvolvimento de Sistemas', semestre: 3 }, solicitante: 'Ana Beatriz', origemCategoria: 'IA',
        resumo: 'Aluna pede a segunda via do boleto de novembro com valor corrigido.',
        transcricao: [
          { autor: 'ALUNO', texto: longo, criadaEm: '2026-11-02T12:00:00Z' },
          { autor: 'ASSISTENTE', texto: 'O boleto fica em https://portal.univag.edu.br/financeiro/boletos/segunda-via', criadaEm: '2026-11-02T12:00:05Z',
            fontes: [{ versaoArtigoId: 1, titulo: 'Como emitir a segunda via do boleto do semestre', trechos: ['https://portal.univag.edu.br/financeiro/boletos/segunda-via'], atualizado: true }] },
        ],
        mensagens: [{ id: 1, tipo: 'NOTA', texto: 'Conferir com a tesouraria antes de responder.', autor: 'Carla Regina de Souza', doAluno: false, criadaEm: '2026-11-02T12:10:00Z' }],
        eventos: [{ tipo: 'TRANSICAO', ator: 'Carla Regina de Souza', de: 'AGUARDANDO_ALUNO', para: 'EM_ATENDIMENTO', detalhe: null, criadoEm: '2026-11-02T12:10:00Z' }],
        acoes: ['responder', 'nota', 'resolver', 'encaminhar', 'reclassificar'],
      })
    if (caminho === '/api/admin/usuarios')
      return json(200, [{ id: 1, cpf: '12345678909', nome: 'Carla Regina de Souza Albuquerque', email: 'carla.regina.albuquerque@univag.edu.br', ativo: true, deveTrocarSenha: false, papeis: ['ATENDENTE', 'ADMINISTRADOR'], setores: [1] }])
    if (caminho === '/api/admin/setores') return json(200, [{ id: 1, nome: 'Coordenação de Análise e Desenvolvimento de Sistemas', triagem: false, ativo: true }])
    if (['/api/admin/cursos', '/api/admin/regras', '/api/admin/respostas-prontas'].includes(caminho)) return json(200, [])
    if (caminho === '/api/admin/categorias') return json(200, [{ id: 1, nome: 'Financeiro > Boletos e mensalidades', ativa: true }])
    if (caminho === '/api/admin/artigos')
      return json(200, [{ id: 1, estado: 'ARQUIVADO', categoriaId: 1, categoria: 'Financeiro > Boletos e mensalidades',
        versao: { id: 1, numero: 12, titulo: 'Como emitir a segunda via do boleto do semestre com o valor corrigido', perguntas: ['boleto?'], resposta: 'x', links: [] } }])
    if (caminho === '/api/indicadores')
      return json(200, {
        semDados: false, alunosAtivos: 1234, conversas: 5678, taxaAutoatendimento: 0.6543, taxaEscalonamento: 0.2, taxaAbandono: 0.1457, taxaPerguntasSemArtigo: 0.12,
        chamadosAbertos: 321, chamadosResolvidos: 1200, tempoPrimeiraRespostaHoras: 12.75, tempoResolucaoHoras: 123.25, roteamentoCorreto: 0.91, taxaReabertura: 0.05,
        principaisCategorias: { porConversas: [{ categoria: 'Financeiro > Boletos e mensalidades', total: 1000 }], porChamados: [{ categoria: 'Acadêmico > Notas e frequência', total: 300 }] },
        indicadorPrincipal: 0.7123,
      })
    return json(404, { status: 404, detail: 'Recurso não encontrado.' })
  })
}

test.describe('sem rolagem horizontal a 360 px', () => {
  test.use({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' })

  const telas: [string, string, (p: Page) => Promise<void>][] = [
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
    ['Artigos', '/univag/artigos', async (p) => void (await p.getByText('ARQUIVADO').waitFor())],
    ['Indicadores', '/univag/indicadores', async (p) => void (await p.getByText('Indicador principal').waitFor())],
    ['Usuários', '/univag/usuarios', async (p) => void (await p.getByText('Carla Regina de Souza Albuquerque').waitFor())],
    ['Matrículas', '/univag/matriculas', async (p) => void (await p.getByLabel('Arquivo CSV').waitFor())],
    ['Cadastros', '/univag/cadastros', async (p) => void (await p.getByText('Coordenação de Análise e Desenvolvimento de Sistemas').waitFor())],
  ]

  for (const [nome, caminho, preparar] of telas)
    test(nome, async ({ page }) => {
      await simularApi(page)
      await page.goto(caminho)
      await preparar(page)
      const largura = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(largura).toBeLessThanOrEqual(360)
    })
})
