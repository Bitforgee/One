import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export type Fonte = { versaoArtigoId: number; titulo: string; trechos: string[]; atualizado: boolean }
export type Anexo = { id: number; nome: string; tipo: string; tamanho: number }
export type MensagemChamado = { id: number; tipo: 'PUBLICA' | 'NOTA'; texto: string; autor: string; doAluno: boolean; criadaEm: string; anexos?: Anexo[] }
export type Evento = { tipo: string; ator: string; de: string | null; para: string | null; detalhe: string | null; criadoEm: string }

// Resposta de GET /api/chamados/{numero}; resumo, fontes e eventos só vêm para a equipe.
export type Chamado = {
  numero: string
  titulo: string
  estado: string
  motivoFechamento: string | null
  numeroOriginal?: string | null
  setorId?: number
  setor: string
  categoria: string
  responsavel: string | null
  criadoEm: string
  resolvidoEm: string | null
  matricula: { numero: string; curso: string; semestre: number }
  solicitante: string | null
  resumo: string | null
  origemCategoria: string | null
  transcricao: { autor: string; texto: string; criadaEm: string; fontes?: Fonte[] | null }[]
  mensagens: MensagemChamado[]
  eventos: Evento[] | null
  acoes: string[]
  setores?: { id: number; nome: string }[] | null
  categorias?: { id: number; nome: string }[] | null
}

export const Estados: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO_ALUNO: 'Aguardando aluno',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
}

export const IntervaloAtualizacao = 15_000

// Lê o chamado e o relê a cada 15 s enquanto a tela está aberta (door 18).
export function useChamado(numero?: string) {
  const [chamado, setChamado] = useState<Chamado>()
  const [erro, setErro] = useState<string>()

  const carregar = useCallback(async () => {
    if (!numero) return
    try {
      setChamado(await api<Chamado>(`/api/chamados/${numero}`))
      setErro(undefined)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o chamado.')
    }
  }, [numero])

  useEffect(() => {
    if (!numero) return
    carregar()
    const t = setInterval(carregar, IntervaloAtualizacao)
    return () => clearInterval(t)
  }, [numero, carregar])

  return { chamado, erro, carregar, setChamado }
}
