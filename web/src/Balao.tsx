import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { formatarData } from './datas'
import { Badge } from './ui/badge'
import { Message, MessageContent } from './ui/message'

const MensagemAnimada = motion.create(Message)

type BalaoProps = { doAluno: boolean; autor?: string; nota?: boolean; texto: string; em: string; fuso: string; children?: ReactNode }

// Balão da conversa (Assistente e detalhe do chamado): aluno à direita em bg-primary-subtle; assistente e atendente à
// esquerda em bg-muted; nota interna em bg-warning-subtle com o selo. O texto vai como texto puro (AD-012); o que vem
// depois dele (aviso, fontes, anexos) entra como children. O balão novo entra subindo 8 px, só com transform; o
// MotionConfig do App respeita o movimento reduzido.
export function Balao({ doAluno, autor, nota, texto, em, fuso, children }: BalaoProps) {
  const cor = doAluno ? 'ms-auto bg-primary-subtle' : nota ? 'me-auto bg-warning-subtle' : 'me-auto bg-muted'
  return (
    <MensagemAnimada
      from={doAluno ? 'user' : 'assistant'}
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ ease: 'easeOut' }}
      className={`w-fit max-w-[90%] gap-1 rounded-lg px-3 py-2 ${cor}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold empty:hidden">
        {autor}
        {nota && <Badge>Nota interna</Badge>}
      </div>
      <MessageContent className="w-full text-base break-words whitespace-pre-wrap group-[.is-user]:ml-0 group-[.is-user]:rounded-none group-[.is-user]:bg-transparent group-[.is-user]:p-0">
        {texto}
      </MessageContent>
      {children}
      <div className="text-end text-xs text-muted-foreground">{formatarData(em, fuso)}</div>
    </MensagemAnimada>
  )
}
