export class ErroApi extends Error {
  status: number
  corpo: any
  constructor(status: number, detail: string, corpo?: unknown) {
    super(detail)
    this.status = status
    this.corpo = corpo
  }
}

function envio(corpo: unknown): RequestInit {
  if (corpo === undefined) return {}
  if (corpo instanceof FormData) return { body: corpo }
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }
}

export async function api<T = unknown>(caminho: string, corpo?: unknown, metodo?: 'PUT' | 'DELETE'): Promise<T> {
  const r = await fetch(caminho, { method: metodo ?? (corpo === undefined ? 'GET' : 'POST'), credentials: 'same-origin', ...envio(corpo) })
  const texto = await r.text()
  const json = texto ? JSON.parse(texto) : undefined
  if (!r.ok) throw new ErroApi(r.status, json?.detail ?? 'Não foi possível concluir a requisição.', json)
  return json as T
}

export const gravar = (base: string, id: number | undefined, corpo: unknown) => (id ? api(`${base}/${id}`, corpo, 'PUT') : api(base, corpo))

export type Instituicao = { slug: string; nome: string; fuso: string }
export type Matricula = { id: number; numero: string; curso: string; semestre: number; situacao: string }
export type Me = {
  id: number
  nome: string
  cpfMascarado: string
  papeis: string[]
  deveTrocarSenha: boolean
  instituicao: Instituicao
  matriculas: Matricula[]
}
