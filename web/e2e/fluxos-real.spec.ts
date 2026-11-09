import { createServer, type Server } from 'node:http'
import { expect, test, type APIRequestContext, type APIResponse, type Browser, type BrowserContext } from '@playwright/test'

const slug = process.env.E2E_INSTITUICAO ?? 'e2e'
const adminCpf = process.env.E2E_ADMIN_CPF ?? '123.456.789-09'
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.one'
const mailpit = process.env.E2E_MAILPIT ?? 'http://localhost:8025'
const portaDoModelo = Number(process.env.E2E_LLM_PORTA ?? 8090)
const senhaAdmin = 'admin-e2e-fluxos-1'
const senha = 'pessoa-e2e-fluxos-1'

function cpfValido(semente: number) {
  const d = String(semente).padStart(9, '0').slice(-9).split('').map(Number)
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10
  for (const n of [9, 10]) {
    const soma = d.reduce((s, x, i) => s + x * (n + 1 - i), 0)
    d.push(((soma * 10) % 11) % 10)
  }
  return d.join('')
}

test.describe.configure({ timeout: 360_000, mode: 'serial' })
const instantes: number[] = []
const dormir = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
async function limitado(chamar: () => Promise<APIResponse>) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    while (instantes.filter((t) => Date.now() - t < 62_000).length >= 5) await dormir(2_000)
    instantes.push(Date.now())
    const r = await chamar()
    if (r.status() !== 429) return r
    await dormir(62_000)
  }
  throw new Error('o limitador de autenticação não liberou')
}

async function tokenDoEmail(request: APIRequestContext, para: string) {
  for (let i = 0; i < 40; i++) {
    const lista = await (await request.get(`${mailpit}/api/v1/search`, { params: { query: `to:${para}` } })).json()
    for (const m of lista.messages ?? []) {
      const corpo = (await (await request.get(`${mailpit}/api/v1/message/${m.ID}`)).json()).Text as string
      const achado = corpo.match(/definir-senha\?token=(\S+)/)
      if (achado) {
        await request.delete(`${mailpit}/api/v1/messages`, { data: { IDs: [m.ID] } })
        return achado[1]
      }
    }
    await dormir(500)
  }
  throw new Error(`nenhum e-mail de primeiro acesso para ${para}`)
}

async function primeiroAcesso(request: APIRequestContext, cpf: string, email: string, nova: string) {
  expect((await limitado(() => request.post('/api/auth/primeiro-acesso', { data: { instituicao: slug, cpf } }))).status()).toBe(202)
  const token = await tokenDoEmail(request, email)
  expect((await request.post('/api/auth/definir-senha', { data: { token, novaSenha: nova } })).ok()).toBeTruthy()
}

async function pessoa(playwright: { request: { newContext: (o: { baseURL?: string }) => Promise<APIRequestContext> } }, baseURL: string | undefined, cpf: string, email: string, nova: string) {
  const contexto = await playwright.request.newContext({ baseURL })
  await primeiroAcesso(contexto, cpf, email, nova)
  expect((await limitado(() => contexto.post('/api/auth/login', { data: { instituicao: slug, cpf, senha: nova } }))).status()).toBe(200)
  return contexto
}

let categoriaDoModelo = 0
let servidor: Server
const vetor = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0))
function subirModeloFalso() {
  servidor = createServer((req, res) => {
    let corpo = ''
    req.on('data', (c) => (corpo += c))
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json')
      if (req.url?.endsWith('/embeddings')) {
        const entradas = (JSON.parse(corpo).input as string[]) ?? []
        res.end(JSON.stringify({ data: entradas.map((_, index) => ({ index, embedding: vetor })), usage: { prompt_tokens: 10, total_tokens: 10 } }))
        return
      }
      const saida = { tipo: 'pergunta', texto: 'Pode detalhar a sua dúvida?', categoriaId: categoriaDoModelo, resumo: 'Aluna pede ajuda com a nota da prova de novembro.' }
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: JSON.stringify(saida) } }], usage: { prompt_tokens: 100, completion_tokens: 20, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 100 } }))
    })
  })
  return new Promise<void>((pronto) => servidor.listen(portaDoModelo, '0.0.0.0', pronto))
}

let admin: APIRequestContext
let aluno: APIRequestContext
let lider: APIRequestContext
let coordenacao: APIRequestContext
let rodada: number
let nomeDoCurso: string
let nomeDaCategoria: string
let nomeDaLideranca: string
let nomeDoAluno: string
let numeroDaMatricula: string
let numero: string

const criado = async (r: APIResponse) => {
  expect(r.status(), await r.text()).toBe(201)
  return (await r.json()).id as number
}

test.beforeAll(async ({ playwright, baseURL }) => {
  test.setTimeout(420_000)
  await subirModeloFalso()
  rodada = Date.now()
  ;[nomeDoCurso, nomeDaCategoria, nomeDaLideranca, nomeDoAluno] = [`ADS ${rodada}`, `Dúvida de nota ${rodada}`, `Líderes ADS ${rodada}`, `Aluna Fluxo ${rodada}`]
  numeroDaMatricula = `F${rodada}`
  const [liderCpf, coordCpf, alunoCpf] = [cpfValido(rodada + 1), cpfValido(rodada + 2), cpfValido(rodada + 3)]

  admin = await playwright.request.newContext({ baseURL })
  const entrar = () => limitado(() => admin.post('/api/auth/login', { data: { instituicao: slug, cpf: adminCpf, senha: senhaAdmin } }))
  if ((await entrar()).status() !== 200) {
    await primeiroAcesso(admin, adminCpf, adminEmail, senhaAdmin)
    expect((await entrar()).status()).toBe(200)
  }
  const setorDaCoordenacao = await criado(await admin.post('/api/admin/setores', { data: { nome: `Coordenação ${rodada}` } }))
  const curso = await criado(await admin.post('/api/admin/cursos', { data: { nome: nomeDoCurso, setorCoordenacaoId: setorDaCoordenacao } }))
  const setorDaLideranca = await criado(await admin.post('/api/admin/setores', { data: { nome: nomeDaLideranca, cursoId: curso, semestre: 3 } }))
  categoriaDoModelo = await criado(await admin.post('/api/admin/categorias', { data: { nome: nomeDaCategoria, ativa: true } }))
  const emails = { lider: `lider.${rodada}@e2e.one`, coord: `coord.${rodada}@e2e.one`, aluno: `aluna.${rodada}@e2e.one` }
  await criado(await admin.post('/api/admin/usuarios', { data: { cpf: liderCpf, nome: `Líder ${rodada}`, email: emails.lider, papeis: ['ATENDENTE'], setores: [setorDaLideranca] } }))
  await criado(await admin.post('/api/admin/usuarios', { data: { cpf: coordCpf, nome: `Coordenadora ${rodada}`, email: emails.coord, papeis: ['ATENDENTE'], setores: [setorDaCoordenacao] } }))
  const csv = `cpf;nome;email;matricula;curso;semestre;situacao\n${alunoCpf};${nomeDoAluno};${emails.aluno};${numeroDaMatricula};${nomeDoCurso};3;ATIVA\n`
  const importado = await admin.post('/api/admin/matriculas/importacao', { multipart: { arquivo: { name: 'm.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } } })
  expect(importado.status(), await importado.text()).toBe(200)

  lider = await pessoa(playwright, baseURL, liderCpf, emails.lider, senha)
  coordenacao = await pessoa(playwright, baseURL, coordCpf, emails.coord, senha)
  aluno = await pessoa(playwright, baseURL, alunoCpf, emails.aluno, senha)
})

test.afterAll(async () => {
  await Promise.all([admin, aluno, lider, coordenacao].map((c) => c?.dispose()))
  await new Promise((pronto) => (servidor ? servidor.close(pronto) : pronto(null)))
})

const comSessao = async (browser: Browser, baseURL: string | undefined, quem: APIRequestContext): Promise<BrowserContext> =>
  browser.newContext({ baseURL, storageState: await quem.storageState() })

test('o administrador cria o fluxo da liderança, simula e publica na tela', async ({ browser, baseURL }) => {
  const contexto = await comSessao(browser, baseURL, admin)
  const page = await contexto.newPage()
  await page.goto(`/${slug}/cadastros`)
  await page.getByRole('tab', { name: 'Fluxos' }).click()

  await page.getByRole('button', { name: /Novo/ }).click()
  const novo = page.getByRole('dialog', { name: 'Novo: Fluxos' })
  await novo.getByLabel('Categoria').selectOption({ label: nomeDaCategoria })
  await novo.getByLabel('Abrangência').selectOption({ label: 'Um semestre de um curso' })
  await novo.getByLabel('Curso').selectOption({ label: nomeDoCurso })
  await novo.getByLabel('Semestre').selectOption({ label: '3º semestre' })
  await novo.getByRole('button', { name: 'Salvar' }).click()
  await page.getByRole('tabpanel', { name: 'Fluxos' }).getByRole('button', { name: nomeDaCategoria }).click()

  const editor = page.getByRole('region', { name: 'Editar: Fluxos' })
  await editor.getByRole('button', { name: 'Adicionar etapa' }).click()
  await editor.getByLabel('Destino da etapa 1').selectOption('LIDERANCA_SEMESTRE')
  await editor.getByLabel('Prazo da etapa 1 (horas)').fill('48')
  await editor.getByRole('button', { name: 'Adicionar etapa' }).click()
  await editor.getByLabel('Destino da etapa 2').selectOption('COORDENACAO_CURSO')
  await expect(editor.getByRole('button', { name: 'Publicar' })).toBeDisabled()
  await editor.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(editor.getByRole('button', { name: 'Publicar' })).toBeEnabled()

  await editor.getByLabel('Curso do aluno').selectOption({ label: nomeDoCurso })
  await editor.getByLabel('Semestre do aluno').selectOption({ label: '3º semestre' })
  await editor.getByRole('button', { name: 'Simular' }).click()
  await expect(editor.getByText(`O chamado abre em ${nomeDaLideranca}.`)).toBeVisible()
  await expect(editor.getByText(/Coordenação do curso: Coordenação \d+/)).toBeVisible()

  await editor.getByRole('button', { name: 'Publicar' }).click()
  await expect(editor).toHaveCount(0)
  const linhaDoFluxo = page.getByRole('tabpanel', { name: 'Fluxos' }).getByRole('row').filter({ hasText: `${nomeDoCurso}, 3º semestre` })
  await expect(linhaDoFluxo).toContainText('Liderança do semestre')
  await expect(linhaDoFluxo).toContainText('Coordenação do curso')
  await expect(linhaDoFluxo).toContainText('(48 h)')
  await contexto.close()
})

test('o fluxo leva o chamado à liderança', async ({ browser, baseURL }) => {
  const contexto = await comSessao(browser, baseURL, aluno)
  const page = await contexto.newPage()
  await page.goto(`/${slug}/assistente`)
  await page.getByLabel('Mensagem').fill('preciso entender a nota da minha prova')
  await page.getByRole('button', { name: /Enviar/ }).click()
  await expect(page.getByText('Pode detalhar a sua dúvida?')).toBeVisible()

  await page.getByRole('button', { name: /Falar com atendente/ }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByText(/Sua dúvida vai primeiro para a liderança do seu semestre/)).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Prefiro a coordenação' })).toHaveCount(0)
  await dialogo.getByRole('button', { name: 'Enviar à liderança' }).click()

  const titulo = page.getByRole('heading', { name: new RegExp(`foi para ${nomeDaLideranca}`) })
  await expect(titulo).toBeVisible()
  numero = (await titulo.textContent())!.match(/ONE-\d+/)![0]
  await contexto.close()
})

test('o líder vê o chamado sem a conversa e sobe; a coordenação o recebe', async ({ browser, baseURL }) => {
  const contextoDoLider = await comSessao(browser, baseURL, lider)
  const page = await contextoDoLider.newPage()
  await page.goto(`/${slug}/chamados/${numero}`)
  await expect(page.getByText(nomeDoAluno)).toBeVisible()
  await expect(page.getByText(/ADS \d+ · 3º semestre/)).toBeVisible()
  await expect(page.getByText('Aluna pede ajuda com a nota da prova de novembro.')).toBeVisible()
  await expect(page.getByText('Conversa com o assistente')).toHaveCount(0)
  await expect(page.getByText(numeroDaMatricula)).toHaveCount(0)
  await expect(page.getByText('Etapa 1 de 2')).toBeVisible()
  expect((await (await lider.get(`/api/chamados/${numero}`)).json()).transcricao).toEqual([])

  await page.getByRole('button', { name: 'Subir' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Subir para a próxima etapa?' })
  await dialogo.getByLabel('Motivo').fill('Assunto da coordenação do curso.')
  await dialogo.getByRole('button', { name: 'Subir' }).click()
  await expect.poll(async () => (await lider.get(`/api/chamados/${numero}`)).status()).toBe(404)
  await contextoDoLider.close()

  const contextoDaCoordenacao = await comSessao(browser, baseURL, coordenacao)
  const tela = await contextoDaCoordenacao.newPage()
  await tela.goto(`/${slug}/chamados/${numero}`)
  await expect(tela.getByText('Etapa 2 de 2')).toBeVisible()
  await expect(tela.getByText('Conversa com o assistente')).toBeVisible()
  await expect(tela.getByText(new RegExp(numeroDaMatricula))).toBeVisible()
  await expect(tela.getByText(new RegExp(`subiu o chamado de ${nomeDaLideranca} para Coordenação`))).toBeVisible()
  await contextoDaCoordenacao.close()
})
