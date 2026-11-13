const inteiro = new Intl.NumberFormat('pt-BR')
const umaCasa = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const casaFixa = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const regras = new Intl.PluralRules('pt-BR')

export const EspacoFixo = '\u00a0'

export const numero = (v: number) => inteiro.format(v)
export const comUnidade = (v: number, unidade: string) => `${numero(v)}${EspacoFixo}${unidade}`
export const porcentagem = (fracao: number) => `${umaCasa.format(fracao * 100)}${EspacoFixo}%`
export const decimalFixo = (v: number) => casaFixa.format(v)

export function plural(n: number, singular: string, varios: string) {
  const um = n !== 0 && regras.select(n) === 'one'
  return `${numero(n)} ${um ? singular : varios}`
}

export function tamanhoDoArquivo(bytes: number) {
  const kb = Math.ceil(bytes / 1024)
  return kb >= 1024 ? `${umaCasa.format(kb / 1024)}${EspacoFixo}MB` : comUnidade(kb, 'KB')
}

export const dataCurta = (iso: string, fuso: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: fuso }).format(new Date(iso))
