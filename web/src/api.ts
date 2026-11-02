export class ErroApi extends Error {
  status: number
  corpo: any // o ProblemDetails inteiro, por exemplo os `erros` por linha da importação
  constructor(status: number, detail: string, corpo?: unknown) {
    super(detail)
    this.status = status
    this.corpo = corpo
  }
}

// Toda chamada à API passa por aqui: erro vira ErroApi com o `detail` do ProblemDetails.
// FormData vai como multipart (mensagens de chamado); o resto, como JSON.
export async function api<T = unknown>(caminho: string, corpo?: unknown, metodo?: 'PUT'): Promise<T> {
  const formulario = corpo instanceof FormData
  const r = await fetch(caminho, {
    method: metodo ?? (corpo === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    headers: corpo === undefined || formulario ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : formulario ? corpo : JSON.stringify(corpo),
  })
  const texto = await r.text()
  const json = texto ? JSON.parse(texto) : undefined
  if (!r.ok) throw new ErroApi(r.status, json?.detail ?? 'Não foi possível concluir a requisição.', json)
  return json as T
}

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
