import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { expect, vi } from 'vitest'
import { App } from '../App'
import type { Me } from '../api'
import type { Chamado } from '../chamado'

export type Rota = (corpo: any) => [number, unknown] | Promise<[number, unknown]>
export type Chamada = { metodo: string; url: string; corpo: any }

// A prévia do destino (GET /destino) que o diálogo de transferência lê: sem rota dita no teste, o fluxo não passa pela liderança.
const previaPadrao = (metodo: string, url: string): Rota | undefined => (metodo === 'GET' && /^\/api\/conversas\/\d+\/destino/.test(url) ? () => [200, { lideranca: false }] : undefined)

// Troca o fetch por um mapa "MÉTODO /caminho" -> [status, corpo]; devolve as chamadas feitas.
export function api(rotas: Record<string, Rota>) {
  const chamadas: Chamada[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? 'GET'
      const corpo = init?.body instanceof FormData ? Object.fromEntries(init.body) : init?.body ? JSON.parse(String(init.body)) : undefined
      chamadas.push({ metodo, url, corpo })
      const rota = rotas[`${metodo} ${url}`] ?? previaPadrao(metodo, url)
      const [status, json] = rota ? await rota(corpo) : [404, { title: 'Não encontrado', status: 404, detail: 'Recurso não encontrado.' }]
      return new Response(json === undefined ? null : JSON.stringify(json), {
        status,
        headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
      })
    }),
  )
  return chamadas
}

export function abrir(caminho: string) {
  return render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: [caminho] })} />)
}

export function me(parcial: Partial<Me> = {}): Me {
  return {
    id: 1,
    nome: 'Ana',
    cpfMascarado: '***.456.789-**',
    papeis: ['ALUNO'],
    deveTrocarSenha: false,
    instituicao: { slug: 'univag', nome: 'Univag', fuso: 'America/Cuiaba' },
    matriculas: [{ id: 1, numero: '2000567890', curso: 'ADS', semestre: 3, situacao: 'ATIVA' }],
    ...parcial,
  }
}

// O que GET /api/instituicoes/univag devolve sem aparência definida (aparencia-instituicao AC 28); `parcial` sobrescreve.
export function instituicao(parcial: Record<string, unknown> = {}) {
  return {
    nome: 'Univag',
    nomeCurto: null,
    cor: null,
    login: { titulo: null, frase: null, itens: [] },
    assistente: { nome: null, boasVindas: null, perguntas: [] },
    contato: { horario: null, telefone: null, email: null },
    imagens: { logo: null, icone: null, login: null, assistente: null },
    ...parcial,
  }
}

// Chamado como o aluno o recebe; a equipe recebe também resumo, fontes e eventos.
export function chamado(parcial: Partial<Chamado> = {}): Chamado {
  return {
    numero: 'ONE-1',
    titulo: 'preciso do boleto',
    estado: 'EM_ATENDIMENTO',
    motivoFechamento: null,
    setor: 'Financeiro',
    categoria: 'Boleto',
    responsavel: 'Carla',
    criadoEm: '2026-11-02T12:00:00Z',
    resolvidoEm: null,
    matricula: { numero: '2000567890', curso: 'ADS', semestre: 3 },
    solicitante: null,
    resumo: null,
    origemCategoria: null,
    transcricao: [
      { autor: 'ALUNO', texto: 'preciso do boleto', criadaEm: '2026-11-02T12:00:00Z' },
      { autor: 'ASSISTENTE', texto: 'O boleto fica no portal.', criadaEm: '2026-11-02T12:00:05Z' },
    ],
    mensagens: [],
    eventos: null,
    acoes: ['responder', 'cancelar'],
    ...parcial,
  }
}

// Abre o menu "Ações de <nome>" da linha e escolhe o item (layout-painel door 4).
export async function escolher(nome: string, item: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Ações de ${nome}` }))
  await userEvent.click(await screen.findByRole('menuitem', { name: item }))
}

// Os itens do menu "Ações de <nome>", na ordem, deixando o menu fechado; sem o botão, lista vazia.
export async function acoesDe(nome: string) {
  const botao = screen.queryByRole('button', { name: `Ações de ${nome}` })
  if (!botao) return []
  await userEvent.click(botao)
  const itens = (await screen.findAllByRole('menuitem')).map((i) => `${i.textContent}${i.getAttribute('data-variant') === 'destructive' ? '!' : ''}`)
  await userEvent.keyboard('{Escape}')
  return itens
}

// Os títulos de coluna da tabela, na ordem; "" é a coluna sem texto (a do menu).
export const cabecalhos = (tabela = screen.getByRole('table')) => within(tabela).getAllByRole('columnheader').map((h) => h.textContent)

// Lista vazia: uma linha só no corpo, com uma célula que ocupa todas as colunas e o texto de vazio (layout-painel AC 24).
export function esperaLinhaVazia(texto: string, colunas: number, tabela = screen.getByRole('table')) {
  const corpo = within(tabela).getAllByRole('row').slice(1)
  expect(corpo).toHaveLength(1)
  const celulas = within(corpo[0]).getAllByRole('cell')
  expect(celulas).toHaveLength(1)
  expect(celulas[0]).toHaveAttribute('colspan', String(colunas))
  expect(celulas[0]).toHaveTextContent(texto)
}
