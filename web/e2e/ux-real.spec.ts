import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'

const slug = process.env.E2E_INSTITUICAO ?? 'e2e'
const adminCpf = process.env.E2E_ADMIN_CPF ?? '123.456.789-09'
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.one'
const mailpit = process.env.E2E_MAILPIT ?? 'http://localhost:8025'
const senhaAdmin = 'admin-e2e-revisao-1'
const senhaAluno = 'aluno-e2e-revisao-1'

function cpfValido(semente: number) {
  const d = String(semente).padStart(9, '0').slice(-9).split('').map(Number)
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10
  for (const n of [9, 10]) {
    const soma = d.reduce((s, x, i) => s + x * (n + 1 - i), 0)
    d.push(((soma * 10) % 11) % 10)
  }
  return d.join('')
}

test.describe.configure({ timeout: 240_000 })
const instantes: number[] = []
const dormir = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
async function folga(reserva = 0) {
  while (instantes.filter((t) => Date.now() - t < 62_000).length >= 5 - reserva) await dormir(2_000)
  instantes.push(Date.now())
}
async function limitado(chamar: () => Promise<APIResponse>) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    await folga()
    const r = await chamar()
    if (r.status() !== 429) return r
    await dormir(62_000)
  }
  throw new Error('o limitador de autenticação não liberou')
}

async function entrarPelaTela(page: Page, cpf: string, senha: string, destino: RegExp) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    await folga(2)
    await page.goto(`/${slug}`)
    await page.getByLabel('CPF').fill(cpf)
    await page.getByLabel('Senha').fill(senha)
    await page.getByRole('button', { name: 'Entrar' }).click()
    try {
      await page.waitForURL(destino, { timeout: 8_000 })
      return
    } catch {
      await dormir(62_000)
    }
  }
  await expect(page).toHaveURL(destino)
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
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`nenhum e-mail de primeiro acesso para ${para}`)
}

async function primeiroAcesso(request: APIRequestContext, cpf: string, email: string, senha: string) {
  expect((await limitado(() => request.post('/api/auth/primeiro-acesso', { data: { instituicao: slug, cpf } }))).status()).toBe(202)
  const token = await tokenDoEmail(request, email)
  expect((await request.post('/api/auth/definir-senha', { data: { token, novaSenha: senha } })).ok()).toBeTruthy()
}

test('aluno navega pelas abas e sai pela Conta', async ({ browser, playwright, baseURL }) => {
  const rodada = Date.now()
  const alunoCpf = cpfValido(rodada)
  const alunoEmail = `aluno.${rodada}@e2e.one`

  const admin = await playwright.request.newContext({ baseURL })
  const entrarAdmin = () => limitado(() => admin.post('/api/auth/login', { data: { instituicao: slug, cpf: adminCpf, senha: senhaAdmin } }))
  if ((await entrarAdmin()).status() !== 200) {
    await primeiroAcesso(admin, adminCpf, adminEmail, senhaAdmin)
    expect((await entrarAdmin()).status()).toBe(200)
  }
  const setores = await (await admin.get('/api/admin/setores')).json()
  const triagem = (Array.isArray(setores) ? setores : setores.itens).find((s: { triagem: boolean }) => s.triagem)
  const curso = `Curso e2e ${rodada}`
  expect((await admin.post('/api/admin/cursos', { data: { nome: curso, setorCoordenacaoId: triagem.id } })).status()).toBe(201)
  const csv = `cpf;nome;email;matricula;curso;semestre;situacao\n${alunoCpf};Aluno E2E ${rodada};${alunoEmail};E${rodada};${curso};1;ATIVA\n`
  const importado = await admin.post('/api/admin/matriculas/importacao', { multipart: { arquivo: { name: 'm.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } } })
  expect(importado.status(), await importado.text()).toBe(200)

  const contexto = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
  const page = await contexto.newPage()
  await primeiroAcesso(page.request, alunoCpf, alunoEmail, senhaAluno)
  await entrarPelaTela(page, alunoCpf, senhaAluno, new RegExp(`/${slug}/assistente$`))

  const barra = page.getByRole('navigation', { name: 'Navegação' })
  await expect(page).toHaveURL(new RegExp(`/${slug}/assistente$`))
  await expect(barra.getByRole('link')).toHaveText(['Assistente', 'Solicitações', 'Conta'])
  await expect(barra.getByRole('link', { name: 'Assistente' })).toHaveAttribute('aria-current', 'page')
  await expect(barra.locator('[aria-current=page]')).toHaveCount(1)

  await barra.getByRole('link', { name: 'Solicitações' }).click()
  await expect(page).toHaveURL(new RegExp(`/${slug}/solicitacoes$`))
  await expect(page.getByRole('heading', { level: 1, name: 'Minhas solicitações' })).toBeVisible()
  await expect(barra.getByRole('link', { name: 'Solicitações' })).toHaveAttribute('aria-current', 'page')
  await expect(barra.locator('[aria-current=page]')).toHaveCount(1)

  await barra.getByRole('link', { name: 'Conta' }).click()
  await expect(page).toHaveURL(new RegExp(`/${slug}/conta$`))
  await expect(barra.getByRole('link', { name: 'Conta' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText(`Aluno E2E ${rodada}`)).toBeVisible()
  await expect(page.getByText(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/)).toBeVisible()
  const linhas = page.locator('main li > :is(button, a)')
  await expect(linhas).toHaveCount(3)
  await expect(linhas.nth(0)).toContainText('Tema')
  await expect(linhas.nth(1)).toContainText('Trocar senha')
  await expect(linhas.nth(2)).toContainText('Sair')

  await linhas.nth(2).click()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  expect((await page.request.get('/api/auth/me')).status()).toBe(401)

  await contexto.close()
  await admin.dispose()
})

test('atendente assume, responde e resolve no celular', async ({ browser, playwright, baseURL }) => {
  test.setTimeout(480_000) // 6 chamadas de autenticação com o limitador de 5 por minuto (L-066): pelo menos 2 esperas de janela
  const rodada = Date.now()
  const [alunoCpf, atendenteCpf] = [cpfValido(rodada), cpfValido(rodada + 7)]
  const [alunoEmail, atendenteEmail] = [`aluno.${rodada}@e2e.one`, `atendente.${rodada}@e2e.one`]

  const admin = await playwright.request.newContext({ baseURL })
  const entrarAdmin = () => limitado(() => admin.post('/api/auth/login', { data: { instituicao: slug, cpf: adminCpf, senha: senhaAdmin } }))
  if ((await entrarAdmin()).status() !== 200) {
    await primeiroAcesso(admin, adminCpf, adminEmail, senhaAdmin)
    expect((await entrarAdmin()).status()).toBe(200)
  }
  const setores = await (await admin.get('/api/admin/setores')).json()
  const triagem = (Array.isArray(setores) ? setores : setores.itens).find((s: { triagem: boolean }) => s.triagem)
  const curso = `Curso e2e ${rodada}`
  expect((await admin.post('/api/admin/cursos', { data: { nome: curso, setorCoordenacaoId: triagem.id } })).status()).toBe(201)
  const csv = `cpf;nome;email;matricula;curso;semestre;situacao
${alunoCpf};Aluno E2E ${rodada};${alunoEmail};E${rodada};${curso};1;ATIVA
`
  const importado = await admin.post('/api/admin/matriculas/importacao', { multipart: { arquivo: { name: 'm.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } } })
  expect(importado.status(), await importado.text()).toBe(200)
  const criado = await admin.post('/api/admin/usuarios', { data: { cpf: atendenteCpf, nome: `Atendente E2E ${rodada}`, email: atendenteEmail, papeis: ['ATENDENTE'], setores: [triagem.id] } })
  expect(criado.status(), await criado.text()).toBe(201)

  const aluno = await playwright.request.newContext({ baseURL })
  await primeiroAcesso(aluno, alunoCpf, alunoEmail, senhaAluno)
  expect((await limitado(() => aluno.post('/api/auth/login', { data: { instituicao: slug, cpf: alunoCpf, senha: senhaAluno } }))).status()).toBe(200)
  const aberto = await aluno.post('/api/atendimento-direto', { data: { descricao: `Preciso da segunda via do boleto ${rodada}.` } })
  expect(aberto.status(), await aberto.text()).toBe(201)
  const numero = (await aberto.json()).numero as string

  const contexto = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
  const page = await contexto.newPage()
  await page.addInitScript(() => {
    const w = window as unknown as { __folhas: number }
    w.__folhas = 0
    new MutationObserver((lista) => {
      for (const m of lista) for (const n of m.addedNodes) if (n instanceof Element && (n.getAttribute('role') === 'dialog' || n.querySelector('[role=dialog]'))) w.__folhas++
    }).observe(document, { childList: true, subtree: true })
  })
  await primeiroAcesso(page.request, atendenteCpf, atendenteEmail, senhaAluno)
  await entrarPelaTela(page, atendenteCpf, senhaAluno, new RegExp(`/${slug}/fila$`))

  const cliques: string[] = []
  const clicar = async (nome: string, alvo = page.getByRole('button', { name: nome, exact: true })) => {
    cliques.push(nome)
    await alvo.click()
  }
  await clicar('linha da Fila', page.getByRole('main').getByRole('listitem').filter({ hasText: numero }))
  await expect(page).toHaveURL(new RegExp(`/chamados/${numero}$`))
  await clicar('Assumir')
  await expect(page.getByRole('button', { name: 'Responder', exact: true }).first()).toBeVisible()
  await clicar('Responder')
  await expect(page.locator('#resposta')).toBeFocused()
  await page.locator('#resposta').fill('Segue a segunda via do boleto em anexo ao seu e-mail.')
  await clicar('Enviar')
  await expect(page.getByText('Segue a segunda via do boleto em anexo ao seu e-mail.')).toBeVisible()
  await clicar('Mais')
  const folha = page.getByRole('dialog', { name: 'Mais ações' })
  await folha.getByLabel('Resolução').fill('Segunda via emitida e enviada.')
  await clicar('Resolver', folha.getByRole('button', { name: 'Resolver', exact: true }))

  expect(cliques).toEqual(['linha da Fila', 'Assumir', 'Responder', 'Enviar', 'Mais', 'Resolver'])
  await expect(page.locator('[data-slot=badge]').filter({ hasText: /^Resolvido$/ })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __folhas: number }).__folhas), 'aberturas de Sheet').toBe(1)

  await contexto.close()
  await aluno.dispose()
  await admin.dispose()
})
