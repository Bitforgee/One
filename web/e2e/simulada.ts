import type { Page } from '@playwright/test'

// API simulada: o teste mede só o layout de cada tela.
export async function simularApi(page: Page, papeis = ['ALUNO', 'ATENDENTE', 'ADMINISTRADOR']) {
  await page.route('**/api/**', (rota) => {
    const caminho = new URL(rota.request().url()).pathname
    const json = (status: number, corpo: unknown) => rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) })
    if (caminho === '/api/instituicoes/univag') return json(200, { nome: 'Centro Universitário de Várzea Grande' })
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
    if (caminho === '/api/admin/documentos')
      return json(200, [{ id: 1, titulo: 'Regulamento do estágio supervisionado obrigatório dos cursos de graduação', categoriaId: 1, categoria: 'Financeiro > Boletos e mensalidades', estado: 'ATIVO', indexacao: 'INDEXADO',
        versao: { id: 1, numero: 3, nomeArquivo: 'regulamento-do-estagio-supervisionado-obrigatorio-2026.pdf', paginas: 42, criadaEm: '2026-11-02T12:00:00Z' } }])
    return json(404, { status: 404, detail: 'Recurso não encontrado.' })
  })
}
