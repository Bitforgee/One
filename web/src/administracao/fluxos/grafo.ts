import type { Destino, Etapa } from '../comum'

export const Inicio = 'inicio'
export const MaximoDeEtapas = 5
export const FraseDaCadeia = 'Ligue todas as etapas ao Início, em uma única cadeia, com até 5 etapas.'

export type No = { id: string; destino: Destino; setorId: string; prazoHoras: string; x: number | null; y: number | null }
export type Ligacao = { de: string; para: string }
export type Grafo = { nos: No[]; ligacoes: Ligacao[] }

let sequencia = 0
const novoId = () => `no-${++sequencia}`

export const Passo = 288
export const posicaoPadrao = (i: number) => ({ x: Passo * (i + 1), y: 80 })

export function novoNo(destino: Destino = 'SETOR', x: number | null = null, y: number | null = null): No {
  return { id: novoId(), destino, setorId: '', prazoHoras: '', x, y }
}

const cadeiaDe = (ids: string[]): Ligacao[] => ids.map((id, i) => ({ de: i === 0 ? Inicio : ids[i - 1], para: id }))

export function deEtapas(etapas: Etapa[]): Grafo {
  const nos = etapas.map<No>((e) => ({ id: novoId(), destino: e.destino, setorId: e.setorId === null ? '' : String(e.setorId), prazoHoras: e.prazoHoras === null ? '' : String(e.prazoHoras), x: e.x, y: e.y }))
  return { nos, ligacoes: cadeiaDe(nos.map((n) => n.id)) }
}

export function caminho({ nos, ligacoes }: Grafo): No[] {
  const lista: No[] = []
  for (let atual = ligacoes.find((l) => l.de === Inicio)?.para; atual && !lista.some((n) => n.id === atual); atual = ligacoes.find((l) => l.de === atual)?.para) {
    const no = nos.find((n) => n.id === atual)
    if (!no) break
    lista.push(no)
  }
  return lista
}

export function ordenados(g: Grafo): No[] {
  const lista = caminho(g)
  return [...lista, ...g.nos.filter((n) => !lista.includes(n))]
}

export const cadeiaValida = (g: Grafo) => caminho(g).length === g.nos.length && g.nos.length <= MaximoDeEtapas

export function nosInvalidos(g: Grafo): Set<string> {
  const lista = caminho(g)
  return new Set([...g.nos.filter((n) => !lista.includes(n)), ...lista.slice(MaximoDeEtapas)].map((n) => n.id))
}

function fechaCiclo(ligacoes: Ligacao[], de: string, para: string): boolean {
  const vistos = new Set<string>()
  for (let atual = ligacoes.find((l) => l.de === para)?.para; atual && !vistos.has(atual); atual = ligacoes.find((l) => l.de === atual)?.para) {
    if (atual === de) return true
    vistos.add(atual)
  }
  return false
}

export function podeLigar(ligacoes: Ligacao[], de: string, para: string): boolean {
  if (de === para || para === Inicio) return false
  if (ligacoes.some((l) => l.de === de) || ligacoes.some((l) => l.para === para)) return false
  return !fechaCiclo(ligacoes, de, para)
}
export const ligar = (g: Grafo, de: string, para: string): Grafo => (podeLigar(g.ligacoes, de, para) ? { ...g, ligacoes: [...g.ligacoes, { de, para }] } : g)

export const desligar = (g: Grafo, de: string, para: string): Grafo => ({ ...g, ligacoes: g.ligacoes.filter((l) => l.de !== de || l.para !== para) })

export function acrescentar(g: Grafo, no: No, aoFim: boolean): Grafo {
  const ponta = caminho(g).at(-1)?.id ?? Inicio
  const nos = [...g.nos, no]
  return { nos, ligacoes: aoFim ? [...g.ligacoes, { de: ponta, para: no.id }] : g.ligacoes }
}

export function remover(g: Grafo, id: string, religar: boolean): Grafo {
  const antes = g.ligacoes.find((l) => l.para === id)?.de
  const depois = g.ligacoes.find((l) => l.de === id)?.para
  const ligacoes = g.ligacoes.filter((l) => l.de !== id && l.para !== id)
  if (religar && antes && depois) ligacoes.push({ de: antes, para: depois })
  return { nos: g.nos.filter((n) => n.id !== id), ligacoes }
}

export const mudar = (g: Grafo, id: string, parcial: Partial<No>): Grafo => ({ ...g, nos: g.nos.map((n) => (n.id === id ? { ...n, ...parcial } : n)) })

export function mover(g: Grafo, id: string, delta: number): Grafo {
  const ids = caminho(g).map((n) => n.id)
  const de = ids.indexOf(id)
  const para = de + delta
  if (de < 0 || para < 0 || para >= ids.length) return g
  ;[ids[de], ids[para]] = [ids[para], ids[de]]
  return { ...g, ligacoes: [...g.ligacoes.filter((l) => !ids.includes(l.para)), ...cadeiaDe(ids)] }
}

export const Tamanho = { inicio: 160, etapa: 192, altura: 64, botao: 44 }
const sobrepoeInicio = (n: No) => n.x !== null && n.y !== null && n.x < Tamanho.inicio + 16 && Math.abs(n.y - posicaoPadrao(0).y) < Tamanho.altura

export function organizar(g: Grafo): Grafo {
  const cadeia = caminho(g).map((n) => n.id)
  const soltos = g.nos.filter((n) => !cadeia.includes(n.id)).map((n) => n.id)
  const lugar = (id: string) => {
    const i = cadeia.indexOf(id)
    return i >= 0 ? posicaoPadrao(i) : { x: Passo * (soltos.indexOf(id) + 1), y: posicaoPadrao(0).y + Tamanho.altura * 2 }
  }
  return { ...g, nos: g.nos.map((n) => ({ ...n, ...lugar(n.id) })) }
}

export function fixarPosicoes(g: Grafo): Grafo {
  const ordem = ordenados(g)
  const fixo = g.nos.every((n) => n.x !== null) ? g : { ...g, nos: g.nos.map((n) => (n.x !== null ? n : { ...n, ...posicaoPadrao(ordem.indexOf(n)) })) }
  return fixo.nos.some(sobrepoeInicio) ? organizar(fixo) : fixo
}

export function inserirEntre(g: Grafo, de: string, para: string, no: No): Grafo {
  const fixo = fixarPosicoes(g)
  const lista = caminho(fixo)
  const alvo = lista.findIndex((n) => n.id === para)
  if (alvo < 0 || !fixo.ligacoes.some((l) => l.de === de && l.para === para) || lista.length >= MaximoDeEtapas) return g
  const depois = new Set(lista.slice(alvo).map((n) => n.id))
  const lugar = lista[alvo]
  const nos = fixo.nos.map((n) => (depois.has(n.id) ? { ...n, x: n.x! + Passo } : n))
  const ligacoes = [...fixo.ligacoes.filter((l) => l.de !== de || l.para !== para), { de, para: no.id }, { de: no.id, para }]
  return { nos: [...nos, { ...no, x: lugar.x, y: lugar.y }], ligacoes }
}

export const paraApi = (n: No) => ({
  destino: n.destino,
  setorId: n.destino === 'SETOR' && n.setorId !== '' ? Number(n.setorId) : null,
  prazoHoras: n.prazoHoras === '' ? null : Number(n.prazoHoras),
  x: n.x,
  y: n.y,
})

export const etapasParaApi = (g: Grafo) => caminho(g).map(paraApi)

export const comoEtapa = (n: No): Etapa => paraApi(n)

export function posicaoDoProximo(g: Grafo) {
  const lista = caminho(g)
  const ponta = lista.at(-1)
  if (!ponta) return posicaoPadrao(0)
  const padrao = posicaoPadrao(lista.length - 1)
  return { x: (ponta.x ?? padrao.x) + Passo, y: ponta.y ?? padrao.y }
}


export function limites(g: Grafo, comBotao: boolean) {
  const caixas = [{ x: 0, y: posicaoPadrao(0).y, largura: Tamanho.inicio }]
  ordenados(g).forEach((n, i) => caixas.push({ x: n.x ?? posicaoPadrao(i).x, y: n.y ?? posicaoPadrao(i).y, largura: Tamanho.etapa }))
  if (comBotao) caixas.push({ ...posicaoDoProximo(g), largura: g.nos.length === 0 ? Tamanho.etapa : Tamanho.botao })
  const [x0, y0] = [Math.min(...caixas.map((c) => c.x)), Math.min(...caixas.map((c) => c.y))]
  return { x: x0, y: y0, width: Math.max(...caixas.map((c) => c.x + c.largura)) - x0, height: Math.max(...caixas.map((c) => c.y)) - y0 + Tamanho.altura }
}

