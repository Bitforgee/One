import { HubConnectionState } from '@microsoft/signalr'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { useChamadoAberto, useEstadoDaConexao } from './tempo-real'

// RAG: a fonte citada é um artigo ou um documento (PDF) da instituição; só a equipe recebe
export type Fonte = { tipo: 'ARTIGO' | 'DOCUMENTO'; versaoArtigoId: number | null; versaoDocumentoId: number | null; titulo: string; numero: number; trechos: string[]; atualizado: boolean }
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
  transcricao: { autor: string; texto: string; criadaEm: string; fontes?: Fonte[] | null; anexos?: Anexo[] }[]
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

// Frase de cada evento do Histórico (historico-legivel ## Screens); tipo desconhecido sai cru para nunca esconder um evento.
const estado = (v: string | null) => (v === null ? '—' : (Estados[v] ?? v))
const Frases: Record<string, (e: Evento) => string> = {
  CRIACAO: (e) => `${e.ator} abriu a solicitação`,
  TRANSICAO: (e) => `${e.ator} mudou o estado de ${estado(e.de)} para ${estado(e.para)}`,
  ATRIBUICAO: (e) => (e.para ? `${e.ator} atribuiu a ${e.para}` : `${e.ator} tirou ${e.de} da responsabilidade`),
  LEMBRETE: (e) => `${e.ator} enviou um lembrete ao aluno`,
  NOTA: (e) => `${e.ator} escreveu uma nota interna`,
  RESPOSTA: (e) => `${e.ator} respondeu ao aluno`,
  ANEXO: (e) => `${e.ator} anexou um arquivo`,
  ENCAMINHAMENTO: (e) => `${e.ator} encaminhou de ${e.de} para ${e.para}`,
  RECLASSIFICACAO: (e) => `${e.ator} mudou a categoria de ${e.de} para ${e.para}`,
}

export function frase(e: Evento) {
  const texto = Frases[e.tipo]?.(e) ?? `${e.ator} · ${e.tipo}`
  return e.detalhe ? `${texto} · ${e.detalhe}` : texto
}

export const IntervaloAtualizacao = 15_000
export const IntervaloComConexao = 60_000

// Lê o chamado e o relê enquanto a tela está aberta: a cada 15 s sem a conexão do tempo real (door 18), a cada 60 s com ela, só como rede de segurança.
export function useChamado(numero?: string) {
  const cliente = useQueryClient()
  const chave = ['chamado', numero]
  const conexao = useEstadoDaConexao()
  useChamadoAberto(numero)
  const { data, error, refetch } = useQuery({
    queryKey: chave,
    queryFn: () => api<Chamado>(`/api/chamados/${numero}`),
    enabled: !!numero,
    refetchInterval: conexao === HubConnectionState.Connected ? IntervaloComConexao : IntervaloAtualizacao,
    refetchIntervalInBackground: true, // a aba em segundo plano também relê, como antes
  })
  return {
    chamado: data,
    erro: error ?? undefined,
    carregar: async () => void (await refetch()),
    setChamado: (c: Chamado) => cliente.setQueryData(chave, c),
  }
}
