import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page } from '@playwright/test'
import type { Roteiro, Segmento } from '../kit'
import { apontar, clicar, digitar, rolar, Saida } from '../kit'


export type Pessoa = { nome: string; cpf: string; senha: string }
type Execucao = { slug: string; aluna: Pessoa; lucas: Pessoa; atendente: Pessoa; gestora: Pessoa }
export const execucao = (): Execucao => JSON.parse(readFileSync(path.join(Saida, 'execucao.json'), 'utf8'))
export const dados = () => JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'dados.json'), 'utf8'))
const Coordenacao = 'Coordenação de Análise e Desenvolvimento de Sistemas'

export const respiro = (page: Page, ms = 1000) => page.waitForTimeout(ms)
export const abrirLogin = async (page: Page) => {
  await page.goto(`/${execucao().slug}`)
  await page.getByLabel('CPF').waitFor()
}

export async function entrar(page: Page, quem: Pessoa, inicial: string) {
  await digitar(page, page.getByLabel('CPF'), quem.cpf)
  await digitar(page, page.getByLabel('Senha', { exact: true }), quem.senha, 40)
  await clicar(page, page.getByRole('button', { name: 'Entrar' }))
  await page.waitForURL(`**/${inicial}`)
  await respiro(page)
}

export async function entrarDireto(page: Page, quem: Pessoa, inicial: string) {
  await abrirLogin(page)
  await page.getByLabel('CPF').fill(quem.cpf)
  await page.getByLabel('Senha', { exact: true }).fill(quem.senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(`**/${inicial}`)
}

export async function menu(page: Page, nome: string) {
  await clicar(page, page.getByRole('link', { name: nome, exact: true }))
  await page.waitForLoadState('networkidle')
  await respiro(page)
}

export async function perguntar(page: Page, texto: string) {
  const caixa = page.getByLabel('Mensagem')
  await digitar(page, caixa, texto)
  await respiro(page, 300)
  await page.keyboard.press('Enter')
}

export const cartao = (id: string, titulo: string, subtitulo: string, falas: string[]): Segmento => ({
  id,
  cartao: { titulo, subtitulo },
  passos: falas.map((texto, i) => ({ id: `${id}-${i + 1}`, texto })),
})

export const aluna: Segmento = {
  id: '11-aluna',
  selo: 'Visão do aluno',
  preparar: abrirLogin,
  passos: [
    {
      id: 'login',
      texto: 'A aluna Mariana, de Análise e Desenvolvimento de Sistemas, entra com o CPF e a senha.',
      acao: (page) => entrar(page, execucao().aluna, 'assistente'),
    },
    {
      id: 'aviso',
      texto: 'Ela cai direto no assistente. O aviso pede para não escrever dados pessoais na conversa.',
      acao: (page) => apontar(page, page.getByText(/Não escreva CPF/)),
    },
    {
      id: 'pergunta',
      texto: 'Mariana pergunta, com as próprias palavras, como tirar a segunda via do boleto.',
      acao: async (page) => {
        await perguntar(page, dados().perguntas.resolvida)
        await page.getByText('Isso resolveu?').waitFor({ timeout: 60_000 })
      },
    },
    {
      id: 'resposta',
      texto: 'A resposta sai só dos artigos publicados pela instituição, e o link oficial vira um botão.',
      acao: (page) => apontar(page, page.getByRole('link', { name: /portal\.univag\.edu\.br/ }).first()),
    },
    {
      id: 'resolveu',
      texto: 'Ela marca que resolveu. Isso conta no indicador de autoatendimento.',
      acao: async (page) => {
        await clicar(page, page.getByRole('button', { name: 'Sim' }))
        await page.getByText('Que bom que resolveu!').waitFor()
      },
    },
    {
      id: 'sem-base',
      texto: 'Agora uma dúvida que não está na base: abono de falta com atestado médico.',
      acao: async (page) => {
        await page.reload()
        await page.getByLabel('Mensagem').waitFor()
        await respiro(page)
        await perguntar(page, dados().perguntas.semBase)
        await page.getByText(/Não encontrei/).waitFor({ timeout: 60_000 })
      },
    },
    {
      id: 'nao-inventa',
      texto: 'Sem orientação oficial sobre isso, o assistente não inventa: diz que não encontrou.',
      acao: (page) => apontar(page, page.getByText(/Não encontrei/)),
    },
    {
      id: 'atendente',
      texto: 'Ela pede um atendente. A conversa vai junto, então não precisa repetir nada.',
      acao: async (page) => {
        await clicar(page, page.getByRole('button', { name: 'Falar com atendente' }))
        await respiro(page, 1500)
        await clicar(page, page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }))
      },
    },
    {
      id: 'protocolo',
      texto: 'Pronto: protocolo gerado, e o pedido vai para a Coordenação de ADS, pela regra da categoria.',
      acao: async (page) => {
        const aviso = page.getByRole('heading', { name: /Sua solicitação ONE-\d+ foi para/ })
        await expect(aviso).toContainText(Coordenacao, { timeout: 30_000 })
        await apontar(page, aviso)
      },
    },
    {
      id: 'solicitacoes',
      texto: 'Em Minhas solicitações, ela acompanha o andamento do pedido.',
      acao: async (page) => {
        await menu(page, 'Minhas solicitações')
        await apontar(page, page.getByRole('row').nth(1))
      },
    },
  ],
}

export const coordenador: Segmento = {
  id: '21-coordenador',
  selo: 'Visão do coordenador',
  preparar: abrirLogin,
  passos: [
    {
      id: 'fila',
      texto: 'O professor Ricardo atende pela Coordenação de ADS. A fila mostra só os pedidos do setor dele.',
      acao: async (page) => {
        await entrar(page, execucao().atendente, 'fila')
        await apontar(page, page.getByRole('row').nth(1))
      },
    },
    {
      id: 'pedido',
      texto: 'No pedido, ele vê a matrícula, um resumo feito pela IA e toda a conversa com o assistente.',
      acao: async (page) => {
        await clicar(page, page.getByRole('row').nth(1))
        await page.getByText('Resumo gerado por IA').waitFor()
        await respiro(page)
        await apontar(page, page.getByText('Resumo gerado por IA'))
        await respiro(page, 1500)
        await rolar(page, 260)
      },
    },
    {
      id: 'pronta',
      texto: 'Para responder, usa uma resposta pronta da coordenação e ajusta o texto.',
      acao: async (page) => {
        const pronta = page.getByLabel('Resposta pronta')
        await apontar(page, pronta)
        await pronta.selectOption({ label: dados().respostaPronta.titulo })
        await respiro(page, 800)
        const resposta = page.getByLabel('Responder')
        await clicar(page, resposta)
        await page.keyboard.press('Control+End')
        await resposta.pressSequentially('\n\nProf. Ricardo Almeida', { delay: 55 })
      },
    },
    {
      id: 'anexo',
      texto: 'Anexa o requerimento de justificativa de faltas, em PDF.',
      acao: async (page) => {
        await apontar(page, page.getByText(/Anexos \(PDF/))
        await page.locator('#anexos').setInputFiles(dados().anexoParaResposta)
        await page.getByText('Requerimento de justificativa de faltas.pdf').waitFor()
      },
    },
    {
      id: 'enviar',
      texto: 'Ao enviar, a resposta entra no pedido na hora, e a aluna recebe um aviso por e-mail.',
      acao: async (page) => {
        await clicar(page, page.getByRole('button', { name: 'Enviar', exact: true }))
        await page.getByRole('link', { name: 'Requerimento de justificativa de faltas.pdf' }).waitFor()
        await respiro(page, 500)
        await apontar(page, page.getByRole('link', { name: 'Requerimento de justificativa de faltas.pdf' }))
      },
    },
    {
      id: 'resolver',
      texto: 'Com a orientação dada, ele marca o pedido como resolvido.',
      acao: async (page) => {
        await digitar(page, page.getByLabel('Resolução'), 'Orientado sobre exercícios domiciliares; requerimento FR-07 enviado.', 35)
        await clicar(page, page.getByRole('button', { name: 'Resolver' }))
        await page.getByText('Resolvido', { exact: true }).first().waitFor()
        await page.mouse.wheel(0, -2000)
      },
    },
  ],
}

export const alunaVolta: Segmento = {
  id: '25-aluna',
  selo: 'Visão do aluno',
  preparar: (page) => entrarDireto(page, execucao().aluna, 'assistente'),
  passos: [
    {
      id: 'resposta-chegou',
      texto: 'De volta à Mariana: a resposta do coordenador já está no pedido, com o anexo.',
      acao: async (page) => {
        await menu(page, 'Minhas solicitações')
        await clicar(page, page.getByRole('row').nth(1))
        const anexo = page.getByRole('link', { name: 'Requerimento de justificativa de faltas.pdf' })
        await anexo.waitFor()
        await respiro(page)
        await apontar(page, anexo)
      },
    },
    {
      id: 'confirma',
      texto: 'Ela confirma que resolveu, e o pedido é fechado.',
      acao: async (page) => {
        await clicar(page, page.getByRole('button', { name: 'Confirmar resolução' }))
        await page.getByText('Fechado', { exact: true }).first().waitFor()
        await page.mouse.wheel(0, -2000)
      },
    },
  ],
}

export const gestora: Segmento = {
  id: '31-gestora',
  selo: 'Visão do gestor',
  preparar: abrirLogin,
  passos: [
    {
      id: 'artigos',
      texto: 'A gestora Helena cuida da base de conhecimento que a IA usa para responder.',
      acao: (page) => entrar(page, execucao().gestora, 'artigos'),
    },
    {
      id: 'artigo',
      texto: 'Cada artigo tem perguntas de exemplo, a resposta oficial e links. Só artigos ativos entram na IA.',
      acao: async (page) => {
        await clicar(page, page.getByRole('button', { name: 'Ações de Segunda via do boleto da mensalidade' }))
        await clicar(page, page.getByRole('menuitem', { name: 'Editar' }))
        await page.getByRole('dialog').waitFor()
        await respiro(page, 1500)
        await apontar(page, page.getByLabel('Perguntas relacionadas (uma por linha)'))
      },
    },
    {
      id: 'novo',
      texto: 'Ela cadastra um artigo novo, sobre o e-mail institucional: título, perguntas, categoria e resposta.',
      acao: async (page) => {
        const novo = dados().artigoParaCriarNoVideo
        await clicar(page, page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }))
        await clicar(page, page.getByRole('button', { name: 'Novo' }))
        await digitar(page, page.getByLabel('Título'), novo.titulo)
        await clicar(page, page.getByLabel('Perguntas relacionadas (uma por linha)'))
        await page.keyboard.insertText(novo.perguntas.join('\n'))
        await apontar(page, page.getByLabel('Categoria'))
        await page.getByLabel('Categoria').selectOption({ label: novo.categoria })
        await clicar(page, page.getByRole('textbox', { name: 'Resposta' }))
        await page.keyboard.insertText(novo.resposta)
        await clicar(page, page.getByLabel('Links (um por linha, com https://)'))
        await page.keyboard.insertText(novo.links.join('\n'))
        await respiro(page, 800)
      },
    },
    {
      id: 'ativar',
      texto: 'Ao salvar e ativar, o artigo é indexado e passa a valer para o assistente.',
      acao: async (page) => {
        const titulo = dados().artigoParaCriarNoVideo.titulo
        await clicar(page, page.getByRole('dialog').getByRole('button', { name: 'Salvar' }))
        await page.getByRole('dialog').waitFor({ state: 'hidden' })
        await clicar(page, page.getByRole('button', { name: `Ações de ${titulo}` }))
        await clicar(page, page.getByRole('menuitem', { name: 'Ativar' }))
        const linha = page.getByRole('row').filter({ hasText: titulo })
        await linha.getByText('ATIVO').waitFor()
        await apontar(page, linha.getByText('ATIVO'))
      },
    },
    {
      id: 'documentos',
      texto: 'Regulamentos em PDF também são lidos e entram nas respostas.',
      acao: async (page) => {
        await menu(page, 'Documentos')
        await apontar(page, page.getByRole('row').nth(1))
      },
    },
    {
      id: 'cadastros',
      texto: 'Em Cadastros ficam setores, categorias, cursos e os fluxos que levam cada pedido ao setor certo.',
      acao: async (page) => {
        await menu(page, 'Cadastros')
        await clicar(page, page.getByRole('tab', { name: /Fluxos/ }))
        await respiro(page)
        await apontar(page, page.getByRole('row').filter({ hasText: 'Coordenação do curso' }).first())
      },
    },
    {
      id: 'matriculas',
      texto: 'Os alunos entram por planilha de matrículas, exportada do sistema acadêmico da instituição.',
      acao: async (page) => {
        await menu(page, 'Matrículas')
        await apontar(page, page.getByText('Arquivo CSV', { exact: true }))
        await page.locator('#csv').setInputFiles(dados().csvParaImportar)
        await respiro(page, 800)
        await clicar(page, page.getByRole('button', { name: 'Importar' }))
        await clicar(page, page.getByRole('dialog').getByRole('button', { name: 'Importar' }))
        await page.getByText(/Importação concluída/).waitFor()
        await apontar(page, page.getByText(/Importação concluída/))
      },
    },
    {
      id: 'usuarios',
      texto: 'Em Usuários, ela cadastra atendentes e define em quais setores cada um trabalha.',
      acao: async (page) => {
        await menu(page, 'Usuários')
        await clicar(page, page.getByRole('button', { name: `Ações de ${execucao().atendente.nome}` }))
        await clicar(page, page.getByRole('menuitem', { name: 'Editar' }))
        await page.getByRole('dialog').waitFor()
      },
    },
    {
      id: 'indicadores',
      texto: 'Nos indicadores, acompanha autoatendimento, tempo de resposta e os assuntos mais procurados.',
      acao: async (page) => {
        await page.keyboard.press('Escape')
        await menu(page, 'Indicadores')
        await page.getByText('Autoatendimento').first().waitFor()
        await apontar(page, page.getByText('Autoatendimento').first())
        await respiro(page, 1500)
        await rolar(page, 400, 1200)
      },
    },
  ],
}

async function indexado(page: Page) {
  const sql = (c: string) => execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', 'one', '-At', '-c', c], { cwd: path.resolve(import.meta.dirname, '..', '..', '..'), encoding: 'utf8' }).trim()
  const id = sql(`select id from instituicao where slug = '${execucao().slug}'`)
  for (let i = 0; Number(sql(`select count(*) from trecho_fonte where instituicao_id = ${id} and embedding is null`)) > 0; i++) {
    if (i > 60) throw new Error('o artigo novo não foi indexado em 2 minutos')
    await page.waitForTimeout(2000)
  }
}

export const lucas: Segmento = {
  id: '35-lucas',
  selo: 'Visão do aluno',
  preparar: async (page) => {
    await indexado(page)
    await entrarDireto(page, execucao().lucas, 'assistente')
  },
  passos: [
    {
      id: 'pergunta-email',
      texto: 'Minutos depois, o aluno Lucas pergunta como ativar o e-mail institucional.',
      acao: async (page) => {
        await perguntar(page, 'Como ativo meu e-mail institucional?')
        await page.getByText('Isso resolveu?').waitFor({ timeout: 60_000 })
      },
    },
    {
      id: 'resposta-email',
      texto: 'E o assistente já responde com base no artigo que a gestora acabou de criar.',
      acao: (page) => apontar(page, page.getByRole('link', { name: /mail\.univag\.edu\.br/ }).first()),
    },
  ],
}

export const roteiro: Roteiro = {
  video: 'apresentacao-one.mp4',
  legendas: 'legendas.srt',
  segmentos: [
    {
      id: '00-abertura',
      cartao: { titulo: 'One — atendimento acadêmico com IA', subtitulo: 'Centro Universitário de Várzea Grande', nota: 'Dados de demonstração' },
      passos: [
        { id: 'abertura-1', texto: 'O One é o atendimento ao estudante: um assistente com IA responde dúvidas a qualquer hora do dia.' },
        { id: 'abertura-2', texto: 'Quando a dúvida precisa de uma pessoa, a conversa vira uma solicitação e vai para o setor certo.' },
      ],
    },
    cartao('10-aluno', 'Visão do aluno', 'Tirar dúvidas e acompanhar solicitações', ['Primeiro, a visão do aluno.']),
    aluna,
    cartao('20-coordenador', 'Visão do coordenador', 'Fila do setor, resposta e resolução', ['Agora, a visão do coordenador do curso, que atende os pedidos.']),
    coordenador,
    alunaVolta,
    cartao('30-gestor', 'Visão do gestor', 'Base de conhecimento, cadastros e indicadores', ['Por fim, a visão da gestão.']),
    gestora,
    lucas,
    cartao('99-fim', 'One', 'Aluno: resposta na hora · Coordenação: caso com contexto · Gestão: base e indicadores', [
      'Resumindo: o aluno tem resposta na hora, a coordenação recebe o caso com contexto e a gestão acompanha tudo.',
    ]),
  ],
}
