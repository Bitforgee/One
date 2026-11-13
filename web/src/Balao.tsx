import { motion } from 'motion/react'
import { Fragment, type ReactNode } from 'react'
import { formatarData } from './datas'
import { PorUrl, rotulo, semPontuacao } from './LinksDaResposta'
import { Badge } from './ui/badge'
import { Message, MessageContent } from './ui/message'

const MensagemAnimada = motion.create(Message)

type Foto = { src: string; alt: string }
type BalaoProps = { doAluno: boolean; autor?: string; nota?: boolean; texto: string; em: string; fuso: string; foto?: Foto; comLinks?: boolean; children?: ReactNode }

export function Quebravel({ texto }: { texto: string }) {
  return texto.split(/(?<=[/?&=#])/).map((parte, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {parte}
    </Fragment>
  ))
}

function TextoComLinks({ texto }: { texto: string }) {
  return texto.split(PorUrl).map((parte, i) => {
    if (i % 2 === 0) return <Quebravel key={i} texto={parte} />
    const link = semPontuacao(parte)
    return (
      <Fragment key={i}>
        <a href={link} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {rotulo(link)}
        </a>
        {parte.slice(link.length)}
      </Fragment>
    )
  })
}

export function Balao({ doAluno, autor, nota, texto, em, fuso, foto, comLinks, children }: BalaoProps) {
  const cor = doAluno ? 'ms-auto rounded-br-sm bg-primary-subtle' : nota ? 'me-auto rounded-bl-sm bg-warning-subtle' : 'me-auto rounded-bl-sm bg-muted'
  const balao = (
    <MensagemAnimada
      from={doAluno ? 'user' : 'assistant'}
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ ease: 'easeOut' }}
      className={`w-fit ${foto ? 'max-w-full' : 'max-w-[90%]'} gap-1 rounded-2xl px-3.5 py-2.5 ${cor}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold empty:hidden">
        {autor}
        {nota && <Badge variant="outline">Nota interna</Badge>}
      </div>
      <MessageContent className="w-full max-w-[67ch] text-base leading-relaxed break-words whitespace-pre-wrap group-[.is-user]:ml-0 group-[.is-user]:rounded-none group-[.is-user]:bg-transparent group-[.is-user]:p-0">
        {comLinks ? <TextoComLinks texto={texto} /> : <Quebravel texto={texto} />}
      </MessageContent>
      {children}
      <div className="text-end text-xs text-muted-foreground">{formatarData(em, fuso)}</div>
    </MensagemAnimada>
  )
  if (!foto) return balao
  return (
    <div className="me-auto flex w-fit max-w-[90%] items-start gap-2">
      <img src={foto.src} alt={foto.alt} width={24} height={24} className="size-6 shrink-0 rounded-full object-cover" />
      {balao}
    </div>
  )
}
