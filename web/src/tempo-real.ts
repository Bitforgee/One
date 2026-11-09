import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'
import type { QueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'

export const UrlDaFila = '/api/chamados?escopo=fila'
const EsperaMaxima = 30_000

let conexao: HubConnection | undefined
let geracao = 0 // cada abertura tem a sua; os retornos de uma conexão já encerrada não valem mais
let temporizador: ReturnType<typeof setTimeout> | undefined
let falhas = 0
let estado: HubConnectionState = HubConnectionState.Disconnected
const ouvintes = new Set<() => void>()
const chamadosAbertos = new Map<string, number>()
let filasAbertas = 0

function notificar() {
  const novo = conexao?.state ?? HubConnectionState.Disconnected
  if (novo === estado) return
  estado = novo
  ouvintes.forEach((o) => o())
}

const conectado = () => conexao?.state === HubConnectionState.Connected
const semErro = () => undefined

function entrarNosGrupos() {
  for (const numero of chamadosAbertos.keys()) void conexao?.invoke('EntrarNoChamado', numero).catch(semErro)
  if (filasAbertas > 0) void conexao?.invoke('EntrarNaFila').catch(semErro)
}

function reler(cliente: QueryClient) {
  for (const numero of chamadosAbertos.keys()) void cliente.invalidateQueries({ queryKey: ['chamado', numero] })
  if (filasAbertas > 0) void cliente.invalidateQueries({ queryKey: [UrlDaFila] })
}

async function tentar(minha: number) {
  const c = conexao
  if (!c || minha !== geracao || c.state !== HubConnectionState.Disconnected) return
  const abrindo = c.start()
  notificar()
  try {
    await abrindo
  } catch {
    if (minha !== geracao) return
    falhas++
    agendar(minha)
    notificar()
    return
  }
  if (minha !== geracao) return
  falhas = 0
  notificar()
  entrarNosGrupos()
}

function agendar(minha: number) {
  clearTimeout(temporizador)
  temporizador = setTimeout(() => void tentar(minha), Math.min(1000 * 2 ** Math.max(falhas - 1, 0), EsperaMaxima))
}

function aoVoltar() {
  if (document.visibilityState !== 'visible' || conexao?.state !== HubConnectionState.Disconnected) return
  clearTimeout(temporizador)
  void tentar(geracao)
}

export function abrirTempoReal(cliente: QueryClient) {
  const minha = ++geracao
  const nova = new HubConnectionBuilder().withUrl('/api/tempo-real').withAutomaticReconnect().configureLogging(LogLevel.None).build()
  conexao = nova
  falhas = 0
  nova.on('ChamadoMudou', (numero: string) => void cliente.invalidateQueries({ queryKey: ['chamado', numero] }))
  nova.on('FilaMudou', () => void cliente.invalidateQueries({ queryKey: [UrlDaFila] }))
  nova.onreconnecting(notificar)
  nova.onreconnected(() => {
    notificar()
    entrarNosGrupos()
    reler(cliente)
  })
  nova.onclose(() => {
    notificar()
    if (minha === geracao) agendar(minha)
  })
  document.addEventListener('visibilitychange', aoVoltar)
  void tentar(minha)
}

export async function encerrarTempoReal() {
  const c = conexao
  geracao++
  clearTimeout(temporizador)
  document.removeEventListener('visibilitychange', aoVoltar)
  if (!c) return
  const parando = c.stop()
  notificar()
  await parando.catch(semErro)
  if (conexao === c) conexao = undefined
  notificar()
}

export function useTempoReal(cliente: QueryClient, autenticado: boolean) {
  useEffect(() => {
    if (!autenticado) return
    abrirTempoReal(cliente)
    return () => void encerrarTempoReal()
  }, [cliente, autenticado])
}

const assinar = (ouvinte: () => void) => {
  ouvintes.add(ouvinte)
  return () => void ouvintes.delete(ouvinte)
}

export const useEstadoDaConexao = () => useSyncExternalStore(assinar, () => estado)

export function useChamadoAberto(numero?: string) {
  useEffect(() => {
    if (!numero) return
    chamadosAbertos.set(numero, (chamadosAbertos.get(numero) ?? 0) + 1)
    if (conectado()) void conexao!.invoke('EntrarNoChamado', numero).catch(semErro)
    return () => {
      const restam = (chamadosAbertos.get(numero) ?? 1) - 1
      if (restam > 0) chamadosAbertos.set(numero, restam)
      else {
        chamadosAbertos.delete(numero)
        if (conectado()) void conexao!.invoke('SairDoChamado', numero).catch(semErro)
      }
    }
  }, [numero])
}

export function useFilaAberta() {
  useEffect(() => {
    filasAbertas++
    if (conectado()) void conexao!.invoke('EntrarNaFila').catch(semErro)
    return () => void filasAbertas--
  }, [])
}
