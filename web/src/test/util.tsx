import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { App } from '../App'
import type { Me } from '../api'
import type { Chamado } from '../chamado'

export type Rota = (corpo: any) => [number, unknown] | Promise<[number, unknown]>
export type Chamada = { metodo: string; url: string; corpo: any }

// Troca o fetch por um mapa "MÉTODO /caminho" -> [status, corpo]; devolve as chamadas feitas.
export function api(rotas: Record<string, Rota>) {
  const chamadas: Chamada[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? 'GET'
      const corpo = init?.body instanceof FormData ? Object.fromEntries(init.body) : init?.body ? JSON.parse(String(init.body)) : undefined
      chamadas.push({ metodo, url, corpo })
      const rota = rotas[`${metodo} ${url}`]
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
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <App />
    </MemoryRouter>,
  )
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
