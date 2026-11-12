import { expect, type Page } from '@playwright/test'
import type { Roteiro, Segmento } from '../kit'
import { apontar, clicar, digitar, rolar } from '../kit'
import { abrirLogin, aluna, alunaVolta, cartao, coordenador, dados, entrar, entrarDireto, execucao, gestora, lucas, menu, perguntar, respiro, type Pessoa } from './principal'

const alunoCelular = (): Pessoa => dados().alunos[2]
const atendenteCelular = (): Pessoa => dados().atendentes[2]
const Coordenacao = 'Coordenação de Análise e Desenvolvimento de Sistemas'

async function escolherTema(page: Page, nome: string) {
  await clicar(page, page.getByRole('button', { name: 'Tema' }))
  await clicar(page, page.getByRole('button', { name: nome, exact: true }))
  await respiro(page, 800)
}

const plataforma: Segmento = {
  id: '37-plataforma',
  selo: 'Visão do gestor',
  preparar: (page) => entrarDireto(page, execucao().gestora, 'artigos'),
  passos: [
    {
      id: 'fluxos',
      texto: 'Cada categoria tem um fluxo: o caminho que o pedido percorre até alguém responder.',
      acao: async (page) => {
        await menu(page, 'Cadastros')
        await clicar(page, page.getByRole('tab', { name: /Fluxos/ }))
        await respiro(page, 800)
        await apontar(page, page.getByRole('row').nth(2))
      },
    },
    {
      id: 'editor',
      texto: 'O editor mostra as etapas em lista ou num canvas visual, com o início e cada setor ligado ao próximo.',
      acao: async (page) => {
        await clicar(page, page.getByRole('button', { name: 'Atividades complementares' }))
        await page.getByRole('region', { name: 'Editar: Fluxos' }).waitFor()
        await respiro(page, 1200)
        await clicar(page, page.getByRole('tab', { name: 'Canvas' }))
        await respiro(page, 2500)
        await clicar(page, page.getByRole('tab', { name: 'Lista' }))
        await respiro(page, 500)
      },
    },
    {
      id: 'etapas',
      texto: 'Aqui o pedido passa primeiro pela liderança do semestre, com prazo de 48 horas, e depois sobe para a coordenação.',
      acao: async (page) => {
        const e = page.getByRole('region', { name: 'Editar: Fluxos' })
        await clicar(page, e.getByRole('button', { name: 'Adicionar etapa' }))
        await e.getByLabel('Destino da etapa 2').selectOption('COORDENACAO_CURSO')
        await respiro(page, 600)
        await e.getByLabel('Destino da etapa 1').selectOption('LIDERANCA_SEMESTRE')
        await digitar(page, e.getByLabel('Prazo da etapa 1 (horas)'), '48', 120)
        await respiro(page, 800)
      },
    },
    {
      id: 'simular',
      texto: 'Antes de publicar, dá para simular um aluno e ver onde o pedido dele abriria.',
      acao: async (page) => {
        const e = page.getByRole('region', { name: 'Editar: Fluxos' })
        await clicar(page, e.getByRole('button', { name: 'Salvar rascunho' }))
        await respiro(page, 1200)
        await e.getByLabel('Curso do aluno').selectOption({ label: 'Análise e Desenvolvimento de Sistemas' })
        await e.getByLabel('Semestre do aluno').selectOption({ label: '3º semestre' })
        await clicar(page, e.getByRole('button', { name: 'Simular' }))
        const resultado = page.getByText(/O chamado abre em/)
        await resultado.waitFor()
        await apontar(page, resultado)
        await respiro(page, 1500)
      },
    },
    {
      id: 'aparencia',
      texto: 'Em Aparência, a instituição põe a própria cor e a própria logo, e vê a prévia ao vivo.',
      acao: async (page) => {
        await page.getByRole('button', { name: 'Voltar' }).click()
        const sair = page.getByRole('dialog', { name: 'Sair sem salvar?' })
        if (await sair.isVisible().catch(() => false)) await sair.getByRole('button', { name: 'Sair sem salvar' }).click()
        await menu(page, 'Aparência')
        const cor = page.getByLabel('Cor principal')
        await clicar(page, cor)
        await cor.fill('#8a1538')
        await respiro(page, 2500)
      },
    },
    {
      id: 'abas-aparencia',
      texto: 'Também dá para ajustar o app instalado, a tela de login, o assistente e os contatos.',
      acao: async (page) => {
        for (const aba of ['App instalado', 'Login', 'Assistente', 'Contato']) {
          await clicar(page, page.getByRole('tab', { name: aba }))
          await respiro(page, 1100)
        }
      },
    },
    {
      id: 'tema',
      texto: 'Cada pessoa escolhe o tema que prefere: claro, escuro ou preto.',
      acao: async (page) => {
        await page.reload()
        await respiro(page, 800)
        await escolherTema(page, 'Escuro')
        await respiro(page, 1800)
        await escolherTema(page, 'Preto')
        await respiro(page, 1800)
        await escolherTema(page, 'Claro')
      },
    },
    {
      id: 'instituicoes',
      texto: 'E a equipe da plataforma cria e gerencia novas instituições, cada uma com os seus dados separados.',
      acao: async (page) => {
        const aqui = execucao().slug
        await page.route('**/api/plataforma/instituicoes', async (rota) => {
          if (rota.request().method() !== 'GET') return rota.continue()
          const resposta = await rota.fetch()
          const lista = (await resposta.json()) as { slug: string }[]
          await rota.fulfill({ response: resposta, json: lista.filter((i) => i.slug === aqui) })
        })
        await menu(page, 'Instituições')
        await apontar(page, page.getByRole('button', { name: 'Nova instituição' }))
        await clicar(page, page.getByRole('button', { name: 'Nova instituição' }))
        await page.getByRole('dialog').waitFor()
        await respiro(page, 2200)
        await page.keyboard.press('Escape')
      },
    },
  ],
}

const alunoMovel: Segmento = {
  id: '51-celular-aluno',
  celular: true,
  selo: 'Visão do aluno',
  preparar: abrirLogin,
  passos: [
    {
      id: 'login',
      texto: 'Agora, a versão mobile. O aluno Rafael entra no celular com o CPF e a senha.',
      acao: async (page) => {
        const quem = alunoCelular()
        await digitar(page, page.getByLabel('CPF'), quem.cpf)
        await digitar(page, page.getByLabel('Senha', { exact: true }), quem.senha, 40)
        await clicar(page, page.getByRole('button', { name: 'Entrar' }))
        await page.waitForURL('**/assistente')
        await respiro(page)
      },
    },
    {
      id: 'tela',
      texto: 'A tela é pensada para o polegar: o assistente no centro e a navegação embaixo.',
      acao: (page) => apontar(page, page.getByRole('link', { name: 'Solicitações' })),
    },
    {
      id: 'pergunta',
      texto: 'Ele pergunta como negociar mensalidades em atraso.',
      acao: async (page) => {
        await perguntar(page, 'Estou com mensalidades em atraso. Como posso negociar?')
        await page.getByText('Isso resolveu?').waitFor({ timeout: 60_000 })
      },
    },
    {
      id: 'resposta',
      texto: 'A resposta vem das normas da instituição, no mesmo padrão do computador.',
      acao: (page) => apontar(page, page.getByText('Isso resolveu?')),
    },
    {
      id: 'atendente',
      texto: 'Quer falar com uma pessoa? Um toque, e a conversa vai junto para o setor.',
      acao: async (page) => {
        await clicar(page, page.getByRole('button', { name: 'Falar com atendente' }))
        await respiro(page, 1500)
        await clicar(page, page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }))
      },
    },
    {
      id: 'protocolo',
      texto: 'Pronto: protocolo gerado e pedido enviado ao Financeiro.',
      acao: async (page) => {
        const aviso = page.getByRole('heading', { name: /Sua solicitação ONE-\d+ foi para/ })
        await expect(aviso).toBeVisible({ timeout: 30_000 })
        await apontar(page, aviso)
      },
    },
    {
      id: 'solicitacoes',
      texto: 'Nas solicitações, o aluno acompanha o andamento do pedido.',
      acao: async (page) => {
        await clicar(page, page.getByRole('link', { name: 'Solicitações' }))
        await page.waitForLoadState('networkidle')
        await respiro(page, 1500)
      },
    },
  ],
}

const atendenteMovel: Segmento = {
  id: '52-celular-atendente',
  celular: true,
  selo: 'Visão do atendente',
  preparar: abrirLogin,
  passos: [
    {
      id: 'login',
      texto: 'O atendente do Financeiro também trabalha pelo celular.',
      acao: async (page) => {
        const quem = atendenteCelular()
        await digitar(page, page.getByLabel('CPF'), quem.cpf)
        await digitar(page, page.getByLabel('Senha', { exact: true }), quem.senha, 40)
        await clicar(page, page.getByRole('button', { name: 'Entrar' }))
        await page.waitForURL('**/fila')
        await respiro(page, 1500)
      },
    },
    {
      id: 'fila',
      texto: 'A fila vira uma lista de cartões, com o assunto e a situação de cada pedido.',
      acao: async (page) => apontar(page, page.getByRole('listitem').first()),
    },
    {
      id: 'pedido',
      texto: 'Ao abrir o pedido, ele vê o resumo da IA e a conversa completa com o assistente.',
      acao: async (page) => {
        await clicar(page, page.getByRole('listitem').first().getByRole('link'))
        await page.getByText('Resumo gerado por IA').waitFor()
        await respiro(page, 1000)
        await apontar(page, page.getByText('Resumo gerado por IA'))
        await respiro(page, 1200)
        await rolar(page, 500)
      },
    },
    {
      id: 'acoes',
      texto: 'As ações, como responder, resolver ou transferir, ficam num botão fixo no rodapé.',
      acao: async (page) => {
        await clicar(page, page.getByRole('button', { name: 'Mais', exact: true }))
        await page.getByRole('dialog').waitFor()
        await respiro(page, 2200)
        await page.keyboard.press('Escape')
      },
    },
    {
      id: 'menu',
      texto: 'O menu lateral abre por cima da tela, com os indicadores do setor.',
      acao: async (page) => {
        await page.mouse.wheel(0, -3000)
        await clicar(page, page.getByRole('button', { name: 'Alternar barra lateral' }))
        await respiro(page, 1500)
        await clicar(page, page.getByRole('link', { name: 'Indicadores', exact: true }))
        await page.getByText('Autoatendimento').first().waitFor()
        await respiro(page, 2000)
      },
    },
  ],
}

const gestoraMovel: Segmento = {
  id: '53-celular-gestora',
  celular: true,
  selo: 'Visão do gestor',
  preparar: abrirLogin,
  passos: [
    {
      id: 'login',
      texto: 'A gestão também acompanha tudo pelo celular.',
      acao: async (page) => {
        const quem = execucao().gestora
        await digitar(page, page.getByLabel('CPF'), quem.cpf)
        await digitar(page, page.getByLabel('Senha', { exact: true }), quem.senha, 40)
        await clicar(page, page.getByRole('button', { name: 'Entrar' }))
        await page.waitForURL('**/artigos')
        await respiro(page, 1500)
      },
    },
    {
      id: 'artigos',
      texto: 'Os artigos da base de conhecimento viram cartões, fáceis de ler e de editar.',
      acao: async (page) => {
        await rolar(page, 400, 1200)
        await respiro(page, 800)
      },
    },
    {
      id: 'menu',
      texto: 'No menu, ela chega a cada área: usuários, matrículas, cadastros e aparência.',
      acao: async (page) => {
        await page.mouse.wheel(0, -3000)
        await clicar(page, page.getByRole('button', { name: 'Alternar barra lateral' }))
        await respiro(page, 2500)
        await clicar(page, page.getByRole('link', { name: 'Cadastros', exact: true }))
        await respiro(page, 1800)
      },
    },
    {
      id: 'indicadores',
      texto: 'E os indicadores cabem na palma da mão: autoatendimento, tempo de resposta e assuntos mais procurados.',
      acao: async (page) => {
        await clicar(page, page.getByRole('button', { name: 'Alternar barra lateral' }))
        await clicar(page, page.getByRole('link', { name: 'Indicadores', exact: true }))
        await page.getByText('Autoatendimento').first().waitFor()
        await respiro(page, 1500)
        await rolar(page, 500, 1200)
        await respiro(page, 800)
      },
    },
  ],
}

export const roteiro: Roteiro = {
  video: 'one-completo.mp4',
  legendas: 'one-completo.srt',
  segmentos: [
    {
      id: '00-abertura',
      cartao: { titulo: 'One — atendimento acadêmico com IA', subtitulo: 'Computador e celular: a plataforma completa', nota: 'Dados de demonstração' },
      passos: [
        { id: 'abertura-1', texto: 'O One é o atendimento ao estudante: um assistente com IA responde dúvidas a qualquer hora do dia.' },
        { id: 'abertura-2', texto: 'Quando a dúvida precisa de uma pessoa, a conversa vira uma solicitação e vai para o setor certo.' },
        { id: 'abertura-3', texto: 'Vamos ver tudo funcionando, primeiro no computador e depois no celular.' },
      ],
    },
    cartao('10-aluno', 'Visão do aluno', 'Tirar dúvidas e acompanhar solicitações', ['Primeiro, a visão do aluno.']),
    aluna,
    cartao('20-coordenador', 'Visão do coordenador', 'Fila do setor, resposta e resolução', ['Agora, a visão do coordenador do curso, que atende os pedidos.']),
    coordenador,
    alunaVolta,
    cartao('30-gestor', 'Visão do gestor', 'Base de conhecimento, cadastros, fluxos e indicadores', ['Por fim, a visão da gestão.']),
    gestora,
    lucas,
    plataforma,
    cartao('50-celular', 'Versão mobile', 'O mesmo One, no celular', ['Agora, o mesmo sistema no celular.']),
    alunoMovel,
    atendenteMovel,
    gestoraMovel,
    cartao('99-fim', 'One', 'Aluno: resposta na hora · Equipe: caso com contexto · Gestão: base, fluxos e indicadores', [
      'Resumindo: o aluno tem resposta na hora, a equipe recebe o caso com contexto e a gestão acompanha tudo, no computador e no celular.',
    ]),
  ],
}
