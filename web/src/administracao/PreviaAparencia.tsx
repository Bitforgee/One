import { ChevronRight, MessageCircleQuestion } from 'lucide-react'
import type { CSSProperties, ReactElement } from 'react'
import { iniciais, Sigla } from '../aparencia'
import { Literal } from '../Literal'
import { Button } from '../ui/button'
import type { IdAba } from './abasDaAparencia'

export type ImagensDaPrevia = { logo?: string; icone?: string; login?: string; assistente?: string }
export type DadosDaPrevia = {
  aba: IdAba
  nome: string
  nomeCurto: string
  cor: string
  loginTitulo: string
  loginFrase: string
  loginItens: string[]
  assistenteNome: string
  boasVindas: string
  perguntas: string[]
  contatoHorario: string
  contatoTelefone: string
  contatoEmail: string
  imagens: ImagensDaPrevia
}

const Base = { titulo: 'Atendimento ao estudante', frase: 'Dúvidas, solicitações e respostas da sua instituição em um só lugar.' }

function PreviaDoLogin({ d }: { d: DadosDaPrevia }) {
  return (
    <div className="flex flex-col gap-2">
      {d.imagens.login && <img src={d.imagens.login} alt="" width={320} height={64} className="h-16 w-full rounded-xs object-cover" />}
      {d.imagens.logo ? <img src={d.imagens.logo} alt="" width={128} height={32} className="h-8 w-auto self-start object-contain" /> : <Sigla nome={d.nome} icone={null} />}
      <p className="m-0 min-w-0 font-heading text-xl font-semibold break-words">{d.nome}</p>
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
    <div className="flex flex-col items-start gap-2">
      <p className="m-0 min-w-0 font-heading text-xl font-semibold break-words">{`Atendimento ao estudante · ${d.nomeCurto.trim() || d.nome}`}</p>
      <p className="m-0 text-muted-foreground">{d.boasVindas || 'Respostas com base nas normas da instituição.'}</p>
      <div className="flex items-center gap-2 text-muted-foreground">
        {d.imagens.assistente && <img src={d.imagens.assistente} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />}
        <span>{d.assistenteNome ? `${d.assistenteNome}, assistente virtual` : 'Assistente virtual'}</span>
      </div>
      <ul className="m-0 w-full list-none p-0">
        {d.perguntas.map((p) => (
          <li key={p} className="flex min-h-10 items-center gap-2 rounded-xs border-b px-1 py-1">
            <MessageCircleQuestion aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 break-words">{p}</span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </li>
        ))}
      </ul>
    </div>
  )
}

function PreviaDoApp({ d }: { d: DadosDaPrevia }) {
  const icone = d.imagens.icone ?? '/icons/icon-192.png'
  const nomeDoApp = (d.nomeCurto.trim() || iniciais(d.nome)).slice(0, 12)
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Tela inicial" className="flex flex-col items-center gap-1">
        <p className="m-0 self-start text-muted-foreground">Tela inicial</p>
        <img data-testid="icone-do-app" src={icone} alt="" width={56} height={56} className="size-14 rounded-xl border object-cover" />
        <span className="text-xs">{nomeDoApp}</span>
      </section>
      <section aria-label="Janela do computador" className="flex flex-col gap-1">
        <p className="m-0 text-muted-foreground">Janela do computador</p>
        <div data-testid="barra-do-app" className="flex items-center gap-2 rounded-t-md bg-primary px-3 py-2 text-primary-foreground" style={{ backgroundColor: d.cor || undefined }}>
          <img data-testid="icone-do-app" src={icone} alt="" width={16} height={16} className="size-4 object-cover" />
          <span className="min-w-0 truncate text-xs break-words">{d.nome}</span>
        </div>
      </section>
    </div>
  )
}

function PreviaDoContato({ d }: { d: DadosDaPrevia }) {
  const { contatoHorario: horario, contatoTelefone: telefone, contatoEmail: email } = d
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="m-0 font-heading text-xl font-semibold">Contato do atendimento</p>
      {horario && <p className="m-0 text-muted-foreground">{horario}</p>}
      {telefone && <Literal className="min-w-0 break-words">{telefone}</Literal>}
      {email && <Literal className="min-w-0 break-words">{email}</Literal>}
      {!(horario || telefone || email) && <p className="m-0 text-muted-foreground">Preencha o contato para ver como o aluno o recebe.</p>}
    </div>
  )
}

const Blocos: Record<IdAba, (p: { d: DadosDaPrevia }) => ReactElement> = {
  marca: PreviaDoLogin,
  app: PreviaDoApp,
  login: PreviaDoLogin,
  assistente: PreviaDoAssistente,
  contato: PreviaDoContato,
}

export function PreviaAparencia({ dados: d }: { dados: DadosDaPrevia }) {
  const cor = d.cor || undefined
  const Bloco = Blocos[d.aba]
  return (
    <div inert aria-hidden="true" className={`flex flex-col gap-4 rounded-md border bg-card p-4 text-sm ${cor ? 'previa-marca' : ''}`} style={{ '--marca-previa': cor } as CSSProperties}>
      <Bloco d={d} />
    </div>
  )
}
