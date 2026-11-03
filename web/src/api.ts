export class ErroApi extends Error {
  status: number
  corpo: any // o ProblemDetails inteiro, por exemplo os `erros` por linha da importação
  constructor(status: number, detail: string, corpo?: unknown) {
    super(detail)
    this.status = status
    this.corpo = corpo
  }
}

// Corpo da requisição: FormData vai como multipart (mensagens de chamado); o resto, como JSON.
function envio(corpo: unknown): RequestInit {
  if (corpo === undefined) return {}
  if (corpo instanceof FormData) return { body: corpo }
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }
}

// Toda chamada à API passa por aqui: erro vira ErroApi com o `detail` do ProblemDetails.
export async function api<T = unknown>(caminho: string, corpo?: unknown, metodo?: 'PUT' | 'DELETE'): Promise<T> {
  const r = await fetch(caminho, { method: metodo ?? (corpo === undefined ? 'GET' : 'POST'), credentials: 'same-origin', ...envio(corpo) })
  const texto = await r.text()
  const json = texto ? JSON.parse(texto) : undefined
  if (!r.ok) throw new ErroApi(r.status, json?.detail ?? 'Não foi possível concluir a requisição.', json)
  return json as T
}

// Cadastro novo é criado em `base`; o que já tem id é substituído em `base/id`.
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
