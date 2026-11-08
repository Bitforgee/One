import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// Monta do zero uma instituição limpa para uma tomada completa: mesmo nome e dados, slug com sufixo novo
// (univag-apresentacao-2, -3...). Tudo pelos fluxos reais: CLI, API e e-mails do Mailpit.
// Uso (na pasta web): node apresentacao/preparar.ts      -> grava apresentacao/saida/execucao.json
const Aqui = import.meta.dirname
const Raiz = path.resolve(Aqui, '..', '..')
const Base = process.env.APRESENTACAO_URL ?? 'http://localhost:5179'
const Mailpit = 'http://localhost:8025'
const dados = JSON.parse(readFileSync(path.join(Aqui, 'dados.json'), 'utf8'))
const extras = JSON.parse(readFileSync(path.join(Aqui, 'dados', 'extras.json'), 'utf8'))

const esperar = (s: number) => new Promise((r) => setTimeout(r, s * 1000))
const log = (...a: unknown[]) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a)

// Sessões por CPF: o cookie one.auth de cada usuário.
const cookies = new Map<string, string>()
let ultimaAuth = 0

// Chamada à API; um 429 (limite de autenticação ou de mensagens) espera e repete, e a API fora do ar (502/503,
// conexão recusada) também. AUTH_INTERVALO (segundos) espaça login e primeiro acesso: 13 para o limite padrão de 5 por minuto.
const IntervaloAuth = Number(process.env.AUTH_INTERVALO ?? 1) * 1000
async function api(caminho: string, corpo?: unknown, cpf?: string): Promise<any> {
  const auth = caminho === '/api/auth/login' || caminho === '/api/auth/primeiro-acesso'
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    if (auth) {
      const falta = ultimaAuth + IntervaloAuth - Date.now()
      if (falta > 0) await esperar(falta / 1000)
      ultimaAuth = Date.now()
    }
    const form = corpo instanceof FormData
    const r = await fetch(Base + caminho, {
      method: corpo === undefined ? 'GET' : 'POST',
      headers: { ...(form || corpo === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cpf && cookies.has(cpf) ? { Cookie: cookies.get(cpf)! } : {}) },
      body: corpo === undefined ? undefined : form ? corpo : JSON.stringify(corpo),
    }).catch(() => null)
    if (!r || [429, 502, 503, 504].includes(r.status)) {
      log(`${r?.status ?? 'sem conexão'} em ${caminho}, esperando`)
      await esperar(20)
      continue
    }
    const cookie = r.headers.getSetCookie().find((c) => c.startsWith('one.auth='))
    if (cookie && cpf) cookies.set(cpf, cookie.split(';')[0])
    const texto = await r.text()
    if (!r.ok) throw new Error(`${caminho}: ${r.status} ${texto}`)
    return texto ? JSON.parse(texto) : null
  }
  throw new Error(`${caminho}: API indisponível ou limite repetido`)
}

const login = (cpf: string, senha: string) => api('/api/auth/login', { instituicao: slug, cpf, senha }, cpf)

// O link de criar senha mais novo para o e-mail, chegado depois de `desde`.
async function tokenDoEmail(email: string, desde: number) {
  for (let i = 0; i < 30; i++) {
    const r = await (await fetch(`${Mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${email}" subject:"Crie sua senha"`)}`)).json()
    const novo = r.messages.find((m: { Created: string }) => Date.parse(m.Created) >= desde - 2000)
    if (novo) {
      const msg = await (await fetch(`${Mailpit}/api/v1/message/${novo.ID}`)).json()
      return msg.Text.match(/token=([^\s]+)/)[1] as string
    }
    await esperar(1)
  }
  throw new Error(`e-mail de primeiro acesso não chegou para ${email}`)
}

async function primeiroAcesso(cpf: string, email: string, senha: string) {
  const desde = Date.now()
  await api('/api/auth/primeiro-acesso', { instituicao: slug, cpf })
  await api('/api/auth/definir-senha', { token: await tokenDoEmail(email, desde), novaSenha: senha })
  log(`senha criada: ${email}`)
}

const cli = (...args: string[]) =>
  execFileSync('dotnet', [path.join('bin', 'Debug', 'net10.0', 'One.Api.dll'), 'instituicao', ...args], { cwd: path.join(Raiz, 'One.Api'), encoding: 'utf8' })
const sql = (consulta: string) =>
  execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', 'one', '-At', '-c', consulta], { cwd: Raiz, encoding: 'utf8' }).trim()

// 1. slug livre
let n = 2
while ((await fetch(`${Base}/api/instituicoes/${dados.slug}-${n}`)).ok) n++
const slug = `${dados.slug}-${n}`
log(`instituição ${slug}`)

// 2. instituição, gestora e carga (CLI; a API em execução trava o exe, então roda a dll já compilada)
const g = dados.gestor
const criada = cli('criar', '--slug', slug, '--nome', dados.instituicao, '--fuso', 'America/Cuiaba', '--admin-cpf', g.cpf, '--admin-nome', g.nome, '--admin-email', g.email)
await api('/api/auth/definir-senha', { token: criada.match(/token=(\S+)/)![1], novaSenha: g.senha })
log(cli('carga', '--slug', slug, '--arquivo', path.join(Aqui, 'dados', 'carga.json')).trim().replace(/\n/g, ', '))
await login(g.cpf, g.senha)
const admin = (caminho: string, corpo?: unknown) => api(caminho, corpo, g.cpf)

const setores = new Map<string, number>((await admin('/api/admin/setores')).map((s: { nome: string; id: number }) => [s.nome, s.id]))
const categorias = new Map<string, number>((await admin('/api/admin/categorias')).map((c: { nome: string; id: number }) => [c.nome, c.id]))

// 3. atendentes, matrículas iniciais, respostas prontas e o regulamento em PDF
for (const a of dados.atendentes)
  await admin('/api/admin/usuarios', { cpf: a.cpf, nome: a.nome, email: extras.emailsAtendentes[a.cpf], papeis: ['ATENDENTE'], setores: [setores.get(a.setor)] })
const arquivo = (caminho: string, tipo: string) => new Blob([readFileSync(caminho)], { type: tipo })
const csv = new FormData()
csv.set('arquivo', arquivo(path.join(Aqui, 'dados', 'matriculas-iniciais.csv'), 'text/csv'), 'matriculas-iniciais.csv')
log('matrículas', await admin('/api/admin/matriculas/importacao', csv))
for (const p of extras.respostasProntas) await admin('/api/admin/respostas-prontas', { setorId: setores.get(p.setor), titulo: p.titulo, texto: p.texto })
const pdf = new FormData()
pdf.set('titulo', dados.documento.titulo)
pdf.set('categoriaId', String(categorias.get('Estágio e TCC')))
pdf.set('arquivo', arquivo(dados.documento.arquivo, 'application/pdf'), path.basename(dados.documento.arquivo))
log('documento', (await admin('/api/admin/documentos', pdf)).estado)

// 4. senhas pelo primeiro acesso (e-mail no Mailpit)
for (const a of dados.atendentes) await primeiroAcesso(a.cpf, extras.emailsAtendentes[a.cpf], a.senha)
const alunos = dados.alunos.filter((a: { senha: string | null }) => a.senha)
const emailDoAluno = (cpf: string) => readFileSync(path.join(Aqui, 'dados', 'matriculas-iniciais.csv'), 'utf8').split('\n').find((l) => l.startsWith(cpf))!.split(';')[2]
for (const a of alunos) await primeiroAcesso(a.cpf, emailDoAluno(a.cpf), a.senha)

// 5. dois chamados antigos, já fechados, de outros alunos: conversa, transferência, resposta, resolução e confirmação
const senhaDe = (cpf: string) => [...dados.atendentes, ...dados.alunos].find((u) => u.cpf === cpf).senha
for (const c of extras.chamadosAntigos) {
  if (!cookies.has(c.aluno)) await login(c.aluno, senhaDe(c.aluno))
  const conversa = await api('/api/conversas', { mensagem: c.pergunta }, c.aluno)
  const t = await api(`/api/conversas/${conversa.conversaId}/transferir`, {}, c.aluno)
  log(`${t.numero} -> ${t.setor}`)
  if (!cookies.has(c.atendente)) await login(c.atendente, senhaDe(c.atendente))
  const resposta = new FormData()
  resposta.set('tipo', 'PUBLICA')
  resposta.set('texto', c.resposta)
  resposta.set('aguardaAluno', 'false')
  await api(`/api/chamados/${t.numero}/mensagens`, resposta, c.atendente)
  await api(`/api/chamados/${t.numero}/resolver`, { texto: c.resolucao }, c.atendente)
  await api(`/api/chamados/${t.numero}/confirmar`, {}, c.aluno)
}

// 6. a busca do assistente só usa trechos com embedding: espera o agendador indexar tudo
const id = sql(`select id from instituicao where slug = '${slug}'`)
for (let i = 0; ; i++) {
  const faltam = Number(sql(`select count(*) from trecho_fonte where instituicao_id = ${id} and embedding is null`))
  if (faltam === 0) break
  if (i % 6 === 0) log(`indexando: faltam ${faltam} trechos`)
  if (i > 120) throw new Error('indexação não terminou em 10 minutos')
  await esperar(5)
}

// 7. o que as cenas leem (senhas ficam só aqui, em saida/, fora do git)
mkdirSync(path.join(Aqui, 'saida'), { recursive: true })
writeFileSync(path.join(Aqui, 'saida', 'execucao.json'), JSON.stringify({
  slug,
  criadaEm: new Date().toISOString(),
  aluna: alunos[0], lucas: alunos[1], atendente: dados.atendentes[0], gestora: g,
}, null, 2))
log(`pronto: ${slug} (saida/execucao.json)`)
