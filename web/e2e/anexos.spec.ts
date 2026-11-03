import { expect, test, type APIRequestContext } from '@playwright/test'
import { createHash } from 'node:crypto'

// arquivos-minio C29: e2e real, sem simulada.ts. Contra E2E_URL, com o Mailpit do compose (primeiro acesso por e-mail) e o MinIO atrás da API.
// A instituição precisa ter um administrador (padrão: demo / 123.456.789-09 / admin@demo.one; `dotnet One.Api.dll instituicao criar` cria uma).
// O primeiro acesso do administrador redefine a senha dele: use uma instituição descartável.
const slug = process.env.E2E_INSTITUICAO ?? 'demo'
const adminCpf = process.env.E2E_ADMIN_CPF ?? '123.456.789-09'
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@demo.one'
const mailpit = process.env.E2E_MAILPIT ?? 'http://localhost:8025'
const senhaAdmin = 'admin-e2e-minio-1'
const senhaAluno = 'aluno-e2e-minio-1'

function cpfValido(semente: number) {
  const d = String(semente).padStart(9, '0').slice(-9).split('').map(Number)
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10
  for (const n of [9, 10]) {
    const soma = d.reduce((s, x, i) => s + x * (n + 1 - i), 0)
    d.push(((soma * 10) % 11) % 10)
  }
  return d.join('')
}

// Pega o link de definir-senha do e-mail novo mais recente enviado ao endereço.
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

async function primeiroAcesso(request: APIRequestContext, cpf: string, email: string) {
  const r = await request.post('/api/auth/primeiro-acesso', { data: { instituicao: slug, cpf } })
  expect(r.status()).toBe(202)
  return tokenDoEmail(request, email)
}

async function entrar(request: APIRequestContext, cpf: string, senha: string) {
  const r = await request.post('/api/auth/login', { data: { instituicao: slug, cpf, senha } })
  expect(r.status()).toBe(200)
}

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex')

test('aluno novo envia um PDF anexo e baixa os mesmos bytes do MinIO', async ({ browser, playwright, baseURL }) => {
  const rodada = Date.now()
  const alunoCpf = cpfValido(rodada)
  const alunoEmail = `aluno.${rodada}@e2e.one`

  // administrador: primeiro acesso (token do Mailpit) e login
  const admin = await playwright.request.newContext({ baseURL })
  const tokenAdmin = await primeiroAcesso(admin, adminCpf, adminEmail)
  expect((await admin.post('/api/auth/definir-senha', { data: { token: tokenAdmin, novaSenha: senhaAdmin } })).ok()).toBeTruthy()
  await entrar(admin, adminCpf, senhaAdmin)

  // curso na triagem e matrícula do aluno por CSV (cria o usuário)
  const setores = await (await admin.get('/api/admin/setores')).json()
  const triagem = (Array.isArray(setores) ? setores : setores.itens).find((s: { triagem: boolean }) => s.triagem)
  const curso = `Curso e2e ${rodada}`
  expect((await admin.post('/api/admin/cursos', { data: { nome: curso, setorCoordenacaoId: triagem.id } })).status()).toBe(201)
  const csv = `cpf;nome;email;matricula;curso;semestre;situacao\n${alunoCpf};Aluno E2E ${rodada};${alunoEmail};E${rodada};${curso};1;ATIVA\n`
  const importado = await admin.post('/api/admin/matriculas/importacao', { multipart: { arquivo: { name: 'm.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } } })
  expect(importado.status(), await importado.text()).toBe(200)

  // aluno: primeiro acesso pela tela, com o link do e-mail
  const contexto = await browser.newContext({ baseURL })
  const page = await contexto.newPage()
  const tokenAluno = await primeiroAcesso(page.request, alunoCpf, alunoEmail)
  await page.goto(`/${slug}/definir-senha?token=${tokenAluno}`)
  await page.getByLabel('Nova senha').fill(senhaAluno)
  await page.getByRole('button', { name: 'Salvar senha' }).click()
  await expect(page.getByText('Senha criada.')).toBeVisible()
  await entrar(page.request, alunoCpf, senhaAluno)

  // chamado e anexo PDF, depois o download conferindo os bytes
  const aberto = await page.request.post('/api/atendimento-direto', { data: { descricao: 'Preciso da segunda via do boleto.' } })
  expect(aberto.status()).toBe(201)
  const numero = (await aberto.json()).numero as string
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 7 + rodada) % 256))])
  const enviado = await page.request.post(`/api/chamados/${numero}/mensagens`, {
    multipart: { tipo: 'PUBLICA', texto: 'Segue o comprovante.', anexos: { name: 'comprovante.pdf', mimeType: 'application/pdf', buffer: pdf } },
  })
  expect(enviado.status()).toBe(201)
  const detalhe = await (await page.request.get(`/api/chamados/${numero}`)).json()
  const anexo = detalhe.mensagens.flatMap((m: { anexos: { id: number; nome: string; tamanho: number }[] }) => m.anexos).find((a: { nome: string }) => a.nome === 'comprovante.pdf')
  expect(anexo.tamanho).toBe(pdf.length)

  const baixado = await page.request.get(`/api/anexos/${anexo.id}`)
  expect(baixado.status()).toBe(200)
  expect(baixado.headers()['content-type']).toBe('application/pdf')
  expect(baixado.headers()['content-length']).toBe(String(pdf.length))
  expect(sha((await baixado.body()) as Buffer)).toBe(sha(pdf))

  // limpeza possível: o aluno sai e é desativado (matrícula, curso e objeto ficam: o bucket nunca apaga e o cadastro é append-only)
  const usuarios = await (await admin.get('/api/admin/usuarios')).json()
  const lista = Array.isArray(usuarios) ? usuarios : usuarios.itens
  const aluno = lista.find((u: { email: string }) => u.email === alunoEmail)
  expect((await admin.post(`/api/admin/usuarios/${aluno.id}/desativar`)).ok()).toBeTruthy()
  await contexto.close()
  await admin.dispose()
})
