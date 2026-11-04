import { expect, test, type APIRequestContext, type APIResponse, type PlaywrightWorkerArgs } from '@playwright/test'
import { crc32, deflateSync } from 'node:zlib'

// aparencia-instituicao C64: e2e real, sem simulada.ts. Contra E2E_URL, com o Mailpit do compose (primeiro acesso do administrador) e o MinIO atrás da API.
// Mesma instituição descartável e mesma senha de anexos.spec.ts (E2E_INSTITUICAO, E2E_ADMIN_CPF, E2E_ADMIN_EMAIL): o primeiro acesso só acontece se o login falhar.
const slug = process.env.E2E_INSTITUICAO ?? 'demo'
const adminCpf = process.env.E2E_ADMIN_CPF ?? '123.456.789-09'
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@demo.one'
const mailpit = process.env.E2E_MAILPIT ?? 'http://localhost:8025'
const senhaAdmin = 'admin-e2e-minio-1'
const Cor = '#8a1538'

// O limitador "auth" da API é de 5 por minuto por IP (login e primeiro acesso, L-066): contamos as tentativas e, no 429, esperamos a janela.
test.describe.configure({ timeout: 240_000 })
async function limitado(chamar: () => Promise<APIResponse>) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const r = await chamar()
    if (r.status() !== 429) return r
    await new Promise((resolve) => setTimeout(resolve, 62_000))
  }
  throw new Error('o limitador de autenticação não liberou')
}

// PNG liso de largura x altura, montado à mão: assinatura, IHDR, IDAT e IEND, cada bloco com o CRC32 do tipo e dos dados.
function png(largura: number, altura: number, [r, g, b]: [number, number, number]) {
  const bloco = (tipo: string, dados: Buffer) => {
    const miolo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados])
    const [tamanho, crc] = [Buffer.alloc(4), Buffer.alloc(4)]
    tamanho.writeUInt32BE(dados.length)
    crc.writeUInt32BE(crc32(miolo))
    return Buffer.concat([tamanho, miolo, crc])
  }
  const cabecalho = Buffer.alloc(13)
  cabecalho.writeUInt32BE(largura, 0)
  cabecalho.writeUInt32BE(altura, 4)
  cabecalho.set([8, 2, 0, 0, 0], 8) // 8 bits, RGB, sem entrelaçamento
  const linha = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: largura }, () => [r, g, b]).flat())])
  const pixels = Buffer.concat(Array.from({ length: altura }, () => linha))
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloco('IHDR', cabecalho), bloco('IDAT', deflateSync(pixels)), bloco('IEND', Buffer.alloc(0))])
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

async function adminLogado(playwright: PlaywrightWorkerArgs['playwright'], baseURL: string | undefined) {
  const admin = await playwright.request.newContext({ baseURL })
  const entrar = () => limitado(() => admin.post('/api/auth/login', { data: { instituicao: slug, cpf: adminCpf, senha: senhaAdmin } }))
  if ((await entrar()).status() !== 200) {
    expect((await limitado(() => admin.post('/api/auth/primeiro-acesso', { data: { instituicao: slug, cpf: adminCpf } }))).status()).toBe(202)
    const token = await tokenDoEmail(admin, adminEmail)
    expect((await admin.post('/api/auth/definir-senha', { data: { token, novaSenha: senhaAdmin } })).ok()).toBeTruthy()
    expect((await entrar()).status()).toBe(200)
  }
  return admin
}

test('admin personaliza a aparência e o login muda', async ({ browser, playwright, baseURL }) => {
  const admin = await adminLogado(playwright, baseURL)
  const logo = png(240, 80, [200, 30, 70])
  const icone = png(512, 512, [138, 21, 56])

  // 1. o administrador abre Aparência, define a cor, envia o logo e o ícone e salva
  const equipe = await browser.newContext({ baseURL, storageState: await admin.storageState() })
  const painel = await equipe.newPage()
  await painel.goto(`/${slug}/aparencia`)
  await painel.getByLabel('Cor principal').fill(Cor)
  await painel.getByLabel('Arquivo: Logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: logo })
  await painel.getByLabel('Arquivo: Ícone do app').setInputFiles({ name: 'icone.png', mimeType: 'image/png', buffer: icone })
  await painel.getByRole('button', { name: 'Salvar' }).click()
  await expect(painel.getByText('Aparência salva.')).toBeVisible()
  // vale no app sem recarregar: a cor no <html> e o logo na barra
  await expect.poll(() => painel.evaluate(() => document.documentElement.style.getPropertyValue('--marca'))).toBe(Cor)
  await expect(painel.locator('[data-sidebar=sidebar] img[src*="/imagens/logo"]')).toBeVisible()

  // 2. sem cookie, o login da instituição mostra o logo e o botão "Entrar" na cor
  const anonimo = await browser.newContext({ baseURL })
  const login = await anonimo.newPage()
  await login.setViewportSize({ width: 1280, height: 800 })
  await login.goto(`/${slug}`)
  const imagem = login.locator('img[src*="/imagens/logo"]:visible')
  await expect(imagem).toBeVisible()
  expect(await imagem.getAttribute('src')).toMatch(new RegExp(`^/api/instituicoes/${slug}/imagens/logo\\?v=\\d+$`))
  expect(await imagem.evaluate((e: HTMLImageElement) => e.naturalWidth), 'o logo carregou').toBe(240)
  const [fundo, esperado] = await login.evaluate((cor) => {
    const referencia = document.createElement('div')
    referencia.style.backgroundColor = cor
    document.body.append(referencia)
    const botao = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Entrar')!
    return [getComputedStyle(botao).backgroundColor, getComputedStyle(referencia).backgroundColor]
  }, Cor)
  expect(fundo).toBe(esperado)

  // 3. o manifesto traz o ícone novo, e a página aponta para ele
  const manifesto = await login.request.get(`/api/instituicoes/${slug}/manifest.webmanifest`)
  expect(manifesto.status()).toBe(200)
  expect(manifesto.headers()['content-type']).toContain('application/manifest+json')
  const corpo = await manifesto.json()
  expect(corpo.theme_color).toBe(Cor)
  expect(corpo.icons.map((i: { src: string; sizes: string }) => [i.sizes, i.src.replace(/\?v=\d+$/, '')])).toEqual([
    ['192x192', `/api/instituicoes/${slug}/imagens/icone`],
    ['512x512', `/api/instituicoes/${slug}/imagens/icone`],
  ])
  const bytes = await login.request.get(corpo.icons[1].src)
  expect(bytes.status()).toBe(200)
  expect(bytes.headers()['cache-control']).toBe('public, max-age=31536000, immutable')
  expect(Buffer.compare(await bytes.body(), icone)).toBe(0)
  await expect(login.locator('link[rel="manifest"]')).toHaveAttribute('href', `/api/instituicoes/${slug}/manifest.webmanifest`)
  await expect(login.locator('link[rel="icon"]')).toHaveAttribute('href', corpo.icons[1].src)
  await expect(login.locator('meta[name="theme-color"]')).toHaveAttribute('content', Cor)

  // volta ao padrão: a instituição descartável não fica com a marca de teste (os objetos antigos ficam no bucket)
  const nulos = { nomeCurto: null, cor: null, login: { titulo: null, frase: null, itens: [] }, assistente: { nome: null, boasVindas: null, perguntas: [] }, contato: { horario: null, telefone: null, email: null } }
  expect((await admin.put('/api/admin/aparencia', { data: nulos })).status()).toBe(200)
  for (const tipo of ['logo', 'icone']) expect((await admin.delete(`/api/admin/aparencia/imagens/${tipo}`)).status()).toBe(204)
  await anonimo.close()
  await equipe.close()
  await admin.dispose()
})
