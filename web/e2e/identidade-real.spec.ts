import { expect, test, type APIRequestContext, type APIResponse, type Browser, type BrowserContext } from '@playwright/test'

// identidade-visual C44: e2e real, sem simulada.ts. Contra E2E_URL (a imagem própria da feature, porta 8089) e o Mailpit do compose.
// A instituição `e2e` tem um administrador (123.456.789-09 / admin@e2e.one) criado por `dotnet One.Api.dll instituicao criar`.
const slug = process.env.E2E_INSTITUICAO ?? 'e2e'
const adminCpf = process.env.E2E_ADMIN_CPF ?? '123.456.789-09'
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.one'
const mailpit = process.env.E2E_MAILPIT ?? 'http://localhost:8025'
const senhaAdmin = 'admin-e2e-identidade-1'
const senhaAluno = 'aluno-e2e-identidade-1'

function cpfValido(semente: number) {
  const d = String(semente).padStart(9, '0').slice(-9).split('').map(Number)
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10
  for (const n of [9, 10]) {
    const soma = d.reduce((s, x, i) => s + x * (n + 1 - i), 0)
    d.push(((soma * 10) % 11) % 10)
  }
  return d.join('')
}

// O limitador "auth" da API é de 5 por minuto por IP (L-066): o spec loga 2 vezes (o administrador e o aluno) e usa o primeiro acesso de cada um; espera a janela se precisar.
test.describe.configure({ timeout: 240_000, mode: 'serial' })
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

async function primeiroAcesso(request: APIRequestContext, cpf: string, email: string, senha: string) {
  expect((await limitado(() => request.post('/api/auth/primeiro-acesso', { data: { instituicao: slug, cpf } }))).status()).toBe(202)
  const token = await tokenDoEmail(request, email)
  expect((await request.post('/api/auth/definir-senha', { data: { token, novaSenha: senha } })).ok()).toBeTruthy()
}

let admin: APIRequestContext
let aluno: APIRequestContext
let numero: string

// O administrador (1 login) cadastra o curso e a matrícula do aluno; o aluno (1 login) abre a solicitação pela API, sem tela.
test.beforeAll(async ({ playwright, baseURL }) => {
  test.setTimeout(240_000) // a janela do limitador pode estar ocupada pelo spec anterior
  const rodada = Date.now()
  const [alunoCpf, alunoEmail] = [cpfValido(rodada), `aluno.${rodada}@e2e.one`]
  admin = await playwright.request.newContext({ baseURL })
  const entrar = () => limitado(() => admin.post('/api/auth/login', { data: { instituicao: slug, cpf: adminCpf, senha: senhaAdmin } }))
  if ((await entrar()).status() !== 200) {
    await primeiroAcesso(admin, adminCpf, adminEmail, senhaAdmin)
    expect((await entrar()).status()).toBe(200)
  }
  const setores = await (await admin.get('/api/admin/setores')).json()
  const triagem = (Array.isArray(setores) ? setores : setores.itens).find((s: { triagem: boolean }) => s.triagem)
  const curso = `Curso e2e ${rodada}`
  expect((await admin.post('/api/admin/cursos', { data: { nome: curso, setorCoordenacaoId: triagem.id } })).status()).toBe(201)
  const csv = `cpf;nome;email;matricula;curso;semestre;situacao\n${alunoCpf};Aluno E2E ${rodada};${alunoEmail};E${rodada};${curso};1;ATIVA\n`
  const importado = await admin.post('/api/admin/matriculas/importacao', { multipart: { arquivo: { name: 'm.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } } })
  expect(importado.status(), await importado.text()).toBe(200)

  aluno = await playwright.request.newContext({ baseURL })
  await primeiroAcesso(aluno, alunoCpf, alunoEmail, senhaAluno)
  expect((await limitado(() => aluno.post('/api/auth/login', { data: { instituicao: slug, cpf: alunoCpf, senha: senhaAluno } }))).status()).toBe(200)
  const aberto = await aluno.post('/api/atendimento-direto', { data: { descricao: `Preciso da segunda via do boleto ${rodada}.` } })
  expect(aberto.status(), await aberto.text()).toBe(201)
  numero = (await aberto.json()).numero as string
})

test.afterAll(async () => {
  await admin?.dispose()
  await aluno?.dispose()
})

const comSessao = async (browser: Browser, baseURL: string | undefined, quem: APIRequestContext): Promise<BrowserContext> =>
  browser.newContext({ baseURL, storageState: await quem.storageState() })

test('aluno vê a solicitação em aberto e as fontes do app', async ({ browser, baseURL }) => {
  // 1. o Login sem cookie pede a Public Sans do próprio app e nenhuma Inter
  const anonimo = await browser.newContext({ baseURL })
  const login = await anonimo.newPage()
  const respostas: { url: string; status: number; tipo: string }[] = []
  const urls: string[] = []
  login.on('request', (r) => void urls.push(r.url()))
  login.on('response', (r) => void respostas.push({ url: r.url(), status: r.status(), tipo: r.headers()['content-type'] ?? '' }))
  await login.goto(`/${slug}`)
  await login.getByLabel('CPF').waitFor()
  await login.evaluate(() => document.fonts.ready)
  const sans = respostas.filter((r) => /\/assets\/public-sans-latin-wght-normal-[^/]+\.woff2/.test(r.url))
  expect(sans.length, 'Public Sans pedida').toBeGreaterThanOrEqual(1)
  for (const r of sans) {
    expect(r.status, r.url).toBe(200)
    expect(r.tipo, r.url).toContain('woff2')
  }
  expect(urls.filter((u) => u.includes('inter-')), 'nenhum URL com inter-').toEqual([])
  await anonimo.close()

  // 2. o aluno, só ALUNO, abre o Assistente sem conversa e vê a solicitação em aberto
  const contexto = await comSessao(browser, baseURL, aluno)
  const page = await contexto.newPage()
  await page.goto(`/${slug}/assistente`)
  const link = page.getByRole('link', { name: new RegExp(`Sua solicitação ${numero} · Aberto`) })
  await expect(link).toHaveCount(1)
  await expect(link).toContainText('A equipe vai responder')
  await expect(link).toHaveAttribute('href', `/${slug}/chamados/${numero}`)
  await contexto.close()
})

test('Indicadores consulta o período anterior na API real', async ({ browser, baseURL }) => {
  const contexto = await comSessao(browser, baseURL, admin)
  const page = await contexto.newPage()
  const leituras: { url: string; status: number }[] = []
  page.on('response', (r) => {
    if (r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/indicadores') leituras.push({ url: r.url(), status: r.status() })
  })
  await page.goto(`/${slug}/indicadores`)
  await expect(page.getByText('Indicador principal', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)

  // as datas saem do relógio do navegador: o mês corrente até hoje e o período anterior de mesmo número de dias
  const hoje = await page.evaluate(() => {
    const d = new Date()
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
  })
  const dia = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d)).toISOString().slice(0, 10)
  const [a, m, d] = hoje
  const [de, ate] = [dia(a, m, 1), dia(a, m, d)]
  const anteriorAte = dia(a, m, 0) // a véspera de `de`
  const anteriorDe = dia(a, m, 1 - d) // d dias antes de `de`
  expect(leituras.map((l) => l.status), 'os dois GET respondem 200').toEqual([200, 200])
  expect(leituras.map((l) => new URL(l.url).search).sort()).toEqual([`?de=${anteriorDe}&ate=${anteriorAte}`, `?de=${de}&ate=${ate}`].sort())
  await contexto.close()
})
