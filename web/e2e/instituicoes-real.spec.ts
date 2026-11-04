import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { execFileSync } from 'node:child_process'

// instituicoes-plataforma C36: e2e real, sem simulada.ts. Contra E2E_URL (a imagem própria da feature) e o Mailpit do compose.
// O papel OPERADOR só existe pelo comando, então o teste o dá dentro do contêiner (E2E_CONTAINER) com `docker exec`.
// Cada execução usa slugs novos: o teste pode rodar mais de uma vez no mesmo banco.
const container = process.env.E2E_CONTAINER ?? 'one-plataforma'
const mailpit = process.env.E2E_MAILPIT ?? 'http://localhost:8025'
const sufixo = Date.now().toString(36)
const doOperador = `operadora-${sufixo}`
const daDemo = `demo-${sufixo}`
const senha = 'operador-e2e-plataforma-1'

function cpfValido(semente: number) {
  const d = String(semente).padStart(9, '0').slice(-9).split('').map(Number)
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10
  for (const n of [9, 10]) {
    const soma = d.reduce((s, x, i) => s + x * (n + 1 - i), 0)
    d.push(((soma * 10) % 11) % 10)
  }
  return d.join('')
}

const cli = (...args: string[]) => execFileSync('docker', ['exec', container, 'dotnet', 'One.Api.dll', 'instituicao', ...args], { encoding: 'utf8' })

// O limitador "auth" da API é de 5 por minuto por IP (L-066): o login é um só e o resto reaproveita o storageState.
test.describe.configure({ timeout: 240_000 })
async function limitado(chamar: () => Promise<APIResponse>) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const r = await chamar()
    if (r.status() !== 429) return r
    await new Promise((resolve) => setTimeout(resolve, 62_000))
  }
  throw new Error('o limitador de autenticação não liberou')
}

// O link de primeiro acesso do e-mail enviado ao endereço (o Agendador olha a fila a cada 60 s).
async function linkDoEmail(request: APIRequestContext, para: string) {
  for (let i = 0; i < 200; i++) {
    const lista = await (await request.get(`${mailpit}/api/v1/search`, { params: { query: `to:${para}` } })).json()
    for (const m of lista.messages ?? []) {
      const corpo = (await (await request.get(`${mailpit}/api/v1/message/${m.ID}`)).json()).Text as string
      const achado = corpo.match(/(https?:\/\/\S+\/definir-senha\?token=\S+)/)
      if (achado) return achado[1]
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`nenhum e-mail de primeiro acesso para ${para}`)
}

test('operador cria e desativa uma instituição', async ({ browser, playwright, baseURL }) => {
  // 1. o operador: instituição e administrador pelo comando, o papel OPERADOR dentro do contêiner, a senha pelo link de primeiro acesso
  const cpf = cpfValido(Date.now() % 1_000_000_000)
  const criada = cli('criar', '--slug', doOperador, '--nome', 'Operadora E2E', '--fuso', 'America/Cuiaba', '--admin-cpf', cpf, '--admin-nome', 'Ana Operadora', '--admin-email', `ana-${sufixo}@e2e.one`)
  const token = criada.match(/definir-senha\?token=(\S+)/)![1]
  expect(cli('operador', '--slug', doOperador, '--cpf', cpf)).toContain('Operador Ana Operadora adicionado.')
  const api = await playwright.request.newContext({ baseURL })
  expect((await api.post('/api/auth/definir-senha', { data: { token, novaSenha: senha } })).ok()).toBeTruthy()
  expect((await limitado(() => api.post('/api/auth/login', { data: { instituicao: doOperador, cpf, senha } }))).status()).toBe(200)

  // 2. o operador abre Instituições e cria a demo
  const equipe = await browser.newContext({ baseURL, storageState: await api.storageState() })
  const painel = await equipe.newPage()
  await painel.goto(`/${doOperador}/instituicoes`)
  await expect(painel.getByRole('navigation').getByRole('link', { name: 'Instituições' })).toBeVisible()
  await expect(painel.getByText('Operadora E2E').first()).toBeVisible()
  await painel.getByRole('button', { name: 'Nova instituição' }).click()
  const dialogo = painel.getByRole('dialog')
  const emailDaDemo = `admin-${sufixo}@demo.e2e.one`
  await dialogo.getByLabel('Nome').first().fill('Faculdade Demo')
  await dialogo.getByLabel('Endereço').fill(daDemo)
  const admin = dialogo.getByRole('group', { name: 'Primeiro administrador' })
  await admin.getByLabel('Nome').fill('Dona Admin')
  await admin.getByLabel('CPF').fill(cpfValido(Date.now() % 1_000_000_000 + 7))
  await admin.getByLabel('E-mail').fill(emailDaDemo)
  await dialogo.getByRole('button', { name: 'Criar' }).click()
  await expect(painel.getByText(`Instituição Faculdade Demo criada. Enviamos o link de primeiro acesso para ${emailDaDemo}.`)).toBeVisible()
  await expect(painel.getByText(`/${daDemo}`, { exact: true }).first()).toBeVisible()

  // 3. o e-mail chega ao Mailpit e o link leva à tela de criar senha da demo
  const link = await linkDoEmail(api, emailDaDemo)
  expect(new URL(link).pathname).toBe(`/${daDemo}/definir-senha`)
  const visitante = await browser.newContext({ baseURL })
  const pagina = await visitante.newPage()
  await pagina.goto(link.replace(/^https?:\/\/[^/]+/, ''))
  await expect(pagina.getByLabel('Nova senha')).toBeVisible()

  // 4. o operador desativa a demo e o login dela dá "Instituição não encontrada"
  const linha = painel.getByRole('row').filter({ hasText: `/${daDemo}` })
  await linha.getByRole('button', { name: 'Ações de Faculdade Demo' }).click()
  await painel.getByRole('menuitem', { name: 'Desativar' }).click()
  await painel.getByRole('dialog').getByRole('button', { name: 'Desativar' }).click()
  await expect(linha.getByText('Desativada')).toBeVisible()
  await pagina.goto(`/${daDemo}`)
  await expect(pagina.getByText('Instituição não encontrada.')).toBeVisible()

  await equipe.close()
  await visitante.close()
})
