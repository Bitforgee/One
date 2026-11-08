import type { Destino, Etapa } from './comum'

// O rascunho do fluxo como grafo: nós de etapa e ligações. A lista e o canvas editam este mesmo grafo (AC 70);
// a API só recebe o caminho a partir do Início, em ordem (AC 75).
export const Inicio = 'inicio'
export const MaximoDeEtapas = 5
export const FraseDaCadeia = 'Ligue todas as etapas ao Início, em uma única cadeia, com até 5 etapas.'

// A etapa como o formulário a guarda: texto nos campos de número e no setor; x e y só viajam, para o canvas.
export type No = { id: string; destino: Destino; setorId: string; prazoHoras: string; x: number | null; y: number | null }
export type Ligacao = { de: string; para: string }
export type Grafo = { nos: No[]; ligacoes: Ligacao[] }

let sequencia = 0
const novoId = () => `no-${++sequencia}`

// Onde um nó sem posição aparece no canvas: da esquerda para a direita, depois do Início.
export const posicaoPadrao = (i: number) => ({ x: 240 * (i + 1), y: 80 })

export function novoNo(destino: Destino = 'SETOR', x: number | null = null, y: number | null = null): No {
  return { id: novoId(), destino, setorId: '', prazoHoras: '', x, y }
}

const cadeiaDe = (ids: string[]): Ligacao[] => ids.map((id, i) => ({ de: i === 0 ? Inicio : ids[i - 1], para: id }))

export function deEtapas(etapas: Etapa[]): Grafo {
  const nos = etapas.map<No>((e) => ({ id: novoId(), destino: e.destino, setorId: e.setorId === null ? '' : String(e.setorId), prazoHoras: e.prazoHoras === null ? '' : String(e.prazoHoras), x: e.x, y: e.y }))
  return { nos, ligacoes: cadeiaDe(nos.map((n) => n.id)) }
}

// Os nós na ordem do caminho a partir do Início; o que não está ligado a ele fica de fora.
export function caminho({ nos, ligacoes }: Grafo): No[] {
  const lista: No[] = []
  for (let atual = ligacoes.find((l) => l.de === Inicio)?.para; atual && !lista.some((n) => n.id === atual); atual = ligacoes.find((l) => l.de === atual)?.para) {
    const no = nos.find((n) => n.id === atual)
    if (!no) break
    lista.push(no)
  }
  return lista
}

// O caminho primeiro; depois os nós soltos, na ordem em que foram criados.
export function ordenados(g: Grafo): No[] {
  const lista = caminho(g)
  return [...lista, ...g.nos.filter((n) => !lista.includes(n))]
}

// Uma única cadeia a partir do Início, com todos os nós e até 5 etapas (AC 74).
export const cadeiaValida = (g: Grafo) => caminho(g).length === g.nos.length && g.nos.length <= MaximoDeEtapas

// Os nós que o canvas marca: os fora da cadeia e os que passam da quinta etapa.
export function nosInvalidos(g: Grafo): Set<string> {
  const lista = caminho(g)
  return new Set([...g.nos.filter((n) => !lista.includes(n)), ...lista.slice(MaximoDeEtapas)].map((n) => n.id))
}

// A regra de ligação (AC 73): só de um nó sem saída para um nó sem entrada, nunca em si mesmo nem fechando um ciclo.
export function podeLigar(ligacoes: Ligacao[], de: string, para: string): boolean {
  if (de === para || para === Inicio) return false
  if (ligacoes.some((l) => l.de === de) || ligacoes.some((l) => l.para === para)) return false
  const vistos = new Set<string>()
  for (let atual = ligacoes.find((l) => l.de === para)?.para; atual && !vistos.has(atual); atual = ligacoes.find((l) => l.de === atual)?.para) {
    if (atual === de) return false
    vistos.add(atual)
  }
  return true
}

export const ligar = (g: Grafo, de: string, para: string): Grafo => (podeLigar(g.ligacoes, de, para) ? { ...g, ligacoes: [...g.ligacoes, { de, para }] } : g)

export const desligar = (g: Grafo, de: string, para: string): Grafo => ({ ...g, ligacoes: g.ligacoes.filter((l) => l.de !== de || l.para !== para) })

// Na lista a etapa nova entra no fim da cadeia; no canvas, o nó solto cai onde foi largado.
export function acrescentar(g: Grafo, no: No, aoFim: boolean): Grafo {
  const ponta = caminho(g).at(-1)?.id ?? Inicio
  const nos = [...g.nos, no]
  return { nos, ligacoes: aoFim ? [...g.ligacoes, { de: ponta, para: no.id }] : g.ligacoes }
}

// Remove o nó e as ligações dele. Na lista os vizinhos se religam; no canvas nada se religa (AC 76).
export function remover(g: Grafo, id: string, religar: boolean): Grafo {
  const antes = g.ligacoes.find((l) => l.para === id)?.de
  const depois = g.ligacoes.find((l) => l.de === id)?.para
  const ligacoes = g.ligacoes.filter((l) => l.de !== id && l.para !== id)
  if (religar && antes && depois) ligacoes.push({ de: antes, para: depois })
  return { nos: g.nos.filter((n) => n.id !== id), ligacoes }
}

export const mudar = (g: Grafo, id: string, parcial: Partial<No>): Grafo => ({ ...g, nos: g.nos.map((n) => (n.id === id ? { ...n, ...parcial } : n)) })

// Troca o nó de lugar no caminho; as ligações do caminho são refeitas na nova ordem e as dos soltos ficam como estão.
export function mover(g: Grafo, id: string, delta: number): Grafo {
  const ids = caminho(g).map((n) => n.id)
  const de = ids.indexOf(id)
  const para = de + delta
  if (de < 0 || para < 0 || para >= ids.length) return g
  ;[ids[de], ids[para]] = [ids[para], ids[de]]
  return { ...g, ligacoes: [...g.ligacoes.filter((l) => !ids.includes(l.para)), ...cadeiaDe(ids)] }
}

// Dá a cada nó sem posição o lugar em que o canvas o desenha, para o que a tela mostra ser o que a API recebe.
export function fixarPosicoes(g: Grafo): Grafo {
  const ordem = ordenados(g)
  if (g.nos.every((n) => n.x !== null)) return g
  return { ...g, nos: g.nos.map((n) => (n.x !== null ? n : { ...n, ...posicaoPadrao(ordem.indexOf(n)) })) }
}

export const paraApi = (n: No) => ({
  destino: n.destino,
  setorId: n.destino === 'SETOR' && n.setorId !== '' ? Number(n.setorId) : null,
  prazoHoras: n.prazoHoras === '' ? null : Number(n.prazoHoras),
  x: n.x,
  y: n.y,
})

// As etapas que a API recebe: o caminho em ordem, cada uma com a posição do nó.
export const etapasParaApi = (g: Grafo) => caminho(g).map(paraApi)

// Para os rótulos: o nó como a etapa que a API devolve.
export const comoEtapa = (n: No): Etapa => paraApi(n)
