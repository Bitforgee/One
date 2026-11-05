import { ChevronRight, MessageCircleQuestion } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Sigla } from '../aparencia'
import { Button } from '../ui/button'

export type ImagensDaPrevia = { logo?: string; login?: string; assistente?: string }
export type DadosDaPrevia = {
  nome: string
  nomeCurto: string
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
    <div className="flex flex-col gap-2">
      {d.imagens.login && <img src={d.imagens.login} alt="" className="h-16 w-full rounded-xs object-cover" />}
      {d.imagens.logo ? <img src={d.imagens.logo} alt="" className="h-8 w-auto self-start object-contain" /> : <Sigla nome={d.nome} icone={null} />}
      <p className="m-0 font-heading text-xl font-semibold">{d.nome}</p>
      <p className="m-0 text-base font-semibold">{d.loginTitulo || Base.titulo}</p>
      <p className="m-0 text-muted-foreground">{d.loginFrase || Base.frase}</p>
      <ul className="m-0 list-disc ps-5 text-muted-foreground marker:text-muted-foreground">
        {d.loginItens.map((i) => (
          <li key={i}>{i}</li>
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
    <div className="flex flex-col items-start gap-2 border-t pt-4">
      <p className="m-0 font-heading text-xl font-semibold">{`Atendimento ao estudante · ${d.nomeCurto.trim() || d.nome}`}</p>
      <p className="m-0 text-muted-foreground">{d.boasVindas || 'Respostas com base nas normas da instituição.'}</p>
      <div className="flex items-center gap-2 text-muted-foreground">
        {d.imagens.assistente && <img src={d.imagens.assistente} alt="" className="size-8 rounded-full object-cover" />}
        <span>{d.assistenteNome ? `${d.assistenteNome}, assistente virtual` : 'Assistente virtual'}</span>
      </div>
      <ul className="m-0 w-full list-none p-0">
        {d.perguntas.map((p) => (
          <li key={p} className="flex min-h-10 items-center gap-2 rounded-xs border-b px-1 py-1">
            <MessageCircleQuestion aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{p}</span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </li>
        ))}
      </ul>
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
