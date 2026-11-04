import { expect, test, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test'
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
  await vaga()
  const r = await request.post('/api/auth/primeiro-acesso', { data: { instituicao: slug, cpf } })
  expect(r.status()).toBe(202)
  return tokenDoEmail(request, email)
}

async function entrar(request: APIRequestContext, cpf: string, senha: string) {
  await vaga()
  const r = await request.post('/api/auth/login', { data: { instituicao: slug, cpf, senha } })
  expect(r.status()).toBe(200)
}

// O limitador "auth" da API é de 5 por minuto por IP (login e primeiro acesso): espera a janela em vez de tomar 429.
const autenticacoes: number[] = []
async function vaga(): Promise<void> {
  const agora = Date.now()
  while (autenticacoes.length && agora - autenticacoes[0] >= 61_000) autenticacoes.shift()
  if (autenticacoes.length >= 5) {
    await new Promise((r) => setTimeout(r, 61_000 - (agora - autenticacoes[0])))
    return vaga()
  }
  autenticacoes.push(agora)
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

// anexos-assistente C39: o aluno anexa uma foto na conversa com o assistente (sem chave do provedor: a resposta é sem_base) e a equipe baixa a mesma foto no chamado transferido.
async function adminLogado(playwright: PlaywrightWorkerArgs['playwright'], baseURL: string | undefined) {
  const admin = await playwright.request.newContext({ baseURL })
  // o outro teste deste arquivo já pode ter feito o primeiro acesso (a senha é a mesma)
  await vaga()
  if ((await admin.post('/api/auth/login', { data: { instituicao: slug, cpf: adminCpf, senha: senhaAdmin } })).status() !== 200) {
    const token = await primeiroAcesso(admin, adminCpf, adminEmail)
    expect((await admin.post('/api/auth/definir-senha', { data: { token, novaSenha: senhaAdmin } })).ok()).toBeTruthy()
    await entrar(admin, adminCpf, senhaAdmin)
  }
  return admin
}

test('aluno anexa foto na conversa e a equipe baixa no chamado', async ({ browser, playwright, baseURL }) => {
  const rodada = Date.now()
  const alunoCpf = cpfValido(rodada)
  const alunoEmail = `aluno.${rodada}@e2e.one`
  const admin = await adminLogado(playwright, baseURL)

  // o administrador passa a atender a triagem, para abrir o chamado transferido
  const eu = await (await admin.get('/api/auth/me')).json()
  const setores = await (await admin.get('/api/admin/setores')).json()
  const triagem = (Array.isArray(setores) ? setores : setores.itens).find((s: { triagem: boolean }) => s.triagem)
  const atualizado = await admin.put(`/api/admin/usuarios/${eu.id}`, { data: { cpf: adminCpf, nome: eu.nome, email: adminEmail, papeis: ['ADMINISTRADOR', 'ATENDENTE'], setores: [triagem.id] } })
  expect(atualizado.status(), await atualizado.text()).toBe(200)
  await entrar(admin, adminCpf, senhaAdmin)

  const curso = `Curso e2e ${rodada}`
  expect((await admin.post('/api/admin/cursos', { data: { nome: curso, setorCoordenacaoId: triagem.id } })).status()).toBe(201)
  const csv = `cpf;nome;email;matricula;curso;semestre;situacao\n${alunoCpf};Aluno E2E ${rodada};${alunoEmail};E${rodada};${curso};1;ATIVA\n`
  const importado = await admin.post('/api/admin/matriculas/importacao', { multipart: { arquivo: { name: 'm.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) } } })
  expect(importado.status(), await importado.text()).toBe(200)

  const contexto = await browser.newContext({ baseURL })
  const page = await contexto.newPage()
  const tokenAluno = await primeiroAcesso(page.request, alunoCpf, alunoEmail)
  await page.goto(`/${slug}/definir-senha?token=${tokenAluno}`)
  await page.getByLabel('Nova senha').fill(senhaAluno)
  await page.getByRole('button', { name: 'Salvar senha' }).click()
  await expect(page.getByText('Senha criada.')).toBeVisible()
  await entrar(page.request, alunoCpf, senhaAluno)

  // pela tela: escolhe a foto, escreve e envia; o balão do aluno ganha o link
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(Array.from({ length: 3000 }, (_, i) => (i * 11 + rodada) % 256))])
  await page.goto(`/${slug}/assistente`)
  await page.locator('input[type="file"]').setInputFiles({ name: 'boleto.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByRole('button', { name: 'Remover boleto.png' })).toBeVisible()
  await page.getByLabel('Mensagem').fill('esse boleto está certo?')
  await page.getByRole('button', { name: 'Enviar' }).click()
  const link = page.getByRole('log').getByRole('link', { name: 'boleto.png' })
  await expect(link).toBeVisible()
  const href = (await link.getAttribute('href'))!
  expect(href).toMatch(/^\/api\/conversas\/anexos\/\d+$/)

  const baixado = await page.request.get(href)
  expect(baixado.status()).toBe(200)
  expect(baixado.headers()['content-type']).toBe('image/png')
  expect(sha((await baixado.body()) as Buffer)).toBe(sha(png))

  // transfere para um atendente; o administrador abre o chamado e baixa a mesma foto
  await page.getByRole('button', { name: 'Falar com atendente' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
  const protocolo = page.getByRole('link', { name: /^Abrir a solicitação / })
  await expect(protocolo).toBeVisible()
  const numero = (await protocolo.textContent())!.replace('Abrir a solicitação ', '').trim()

  const equipe = await browser.newContext({ baseURL, storageState: await admin.storageState() })
  const painel = await equipe.newPage()
  await painel.goto(`/${slug}/chamados/${numero}`)
  const doChamado = painel.getByRole('link', { name: 'boleto.png' })
  await expect(doChamado).toBeVisible()
  expect(await doChamado.getAttribute('href')).toBe(href)
  const daEquipe = await painel.request.get(href)
  expect(daEquipe.status()).toBe(200)
  expect(sha((await daEquipe.body()) as Buffer)).toBe(sha(png))

  // o limite de corpo de 30 MB do Kestrel não vale nas duas rotas de mensagem: 3 arquivos de 10 MiB passam (AC 16)
  const form = new FormData()
  form.append('mensagem', 'três fotos grandes')
  for (const n of [1, 2, 3]) form.append('anexos', new Blob([png.subarray(0, 8), Buffer.alloc(10 * 1024 * 1024 - 8, n)], { type: 'image/png' }), `grande-${n}.png`)
  const tres = await page.request.post('/api/conversas', { multipart: form, timeout: 120_000 })
  expect(tres.status(), await tres.text()).toBe(201)

  // limpeza possível: o aluno é desativado (o bucket nunca apaga e o cadastro é append-only)
  const usuarios = await (await admin.get('/api/admin/usuarios')).json()
  const aluno = (Array.isArray(usuarios) ? usuarios : usuarios.itens).find((u: { email: string }) => u.email === alunoEmail)
  expect((await admin.post(`/api/admin/usuarios/${aluno.id}/desativar`)).ok()).toBeTruthy()
  await equipe.close()
  await contexto.close()
  await admin.dispose()
})
