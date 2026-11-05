import type { CSSProperties } from 'react'
import { Sigla } from '../aparencia'
import { BoasVindas, Conversa } from '../ilustracoes'
import { Button } from '../ui/button'

export type ImagensDaPrevia = { logo?: string; login?: string; assistente?: string }
export type DadosDaPrevia = {
  nome: string
  cor: string
  loginTitulo: string
  loginFrase: string
  loginItens: string[]
  assistenteNome: string
  boasVindas: string
  perguntas: string[]
  imagens: ImagensDaPrevia
}

const Base = { titulo: 'Atendimento ao estudante', frase: 'Dúvidas, solicitações e respostas da sua instituição em um só lugar.' }

function PreviaDoLogin({ d }: { d: DadosDaPrevia }) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border p-3">
      {d.imagens.logo ? <img src={d.imagens.logo} alt="" className="h-8 w-auto self-start object-contain" /> : <Sigla nome={d.nome} icone={null} />}
      <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-sm bg-primary-subtle">
        {d.imagens.login ? <img src={d.imagens.login} alt="" className="absolute inset-0 size-full object-cover" /> : <BoasVindas className="h-full text-muted-foreground" />}
      </div>
      <p className="m-0 text-base font-semibold">{d.loginTitulo || Base.titulo}</p>
      <p className="m-0 text-muted-foreground">{d.loginFrase || Base.frase}</p>
      <ul className="m-0 list-none p-0">
        {d.loginItens.map((i) => (
          <li key={i} className="border-t py-1">
            {i}
          </li>
        ))}
      </ul>
      <Button type="button" tabIndex={-1}>
        Entrar
      </Button>
    </div>
  )
}

function PreviaDoAssistente({ d }: { d: DadosDaPrevia }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-sm border p-3 text-center">
      {d.imagens.assistente ? <img src={d.imagens.assistente} alt="" className="size-12 rounded-full object-cover" /> : <Conversa className="h-16 w-24 text-muted-foreground" />}
      <p className="m-0 font-semibold">{`Olá! Eu sou ${d.assistenteNome || 'Assistente'}.`}</p>
      <p className="m-0 text-muted-foreground empty:hidden">{d.boasVindas}</p>
      <div className="flex flex-wrap justify-center gap-1">
        {d.perguntas.map((p) => (
          <span key={p} className="rounded-xs border px-3 py-1 text-xs">
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}

// Uma réplica pequena do login e do balão do assistente com os valores do formulário, antes de salvar (AC 24).
// A cor vai em --marca-previa só aqui dentro (index.css a transforma em --primary como o app, claro ou escuro), para o resto do app não mudar antes de salvar.
export function PreviaAparencia({ dados: d }: { dados: DadosDaPrevia }) {
  const cor = d.cor || undefined
  return (
    <div className={`flex flex-col gap-4 rounded-md border bg-card p-4 text-sm ${cor ? 'previa-marca' : ''}`} style={{ '--marca-previa': cor } as CSSProperties}>
      <PreviaDoLogin d={d} />
      <PreviaDoAssistente d={d} />
    </div>
  )
}
