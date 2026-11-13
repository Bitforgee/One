import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ComponentProps, ReactNode } from 'react'
import { toast } from 'sonner'
import { api } from './api'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'

const Gerundios = { ar: 'ando', er: 'endo', ir: 'indo' } as const

export function gerundio(rotulo: ReactNode) {
  const verbo = typeof rotulo === 'string' ? /^(\p{L}+)(ar|er|ir)(?: |$)/u.exec(rotulo) : null
  return verbo ? `${verbo[1]}${Gerundios[verbo[2] as keyof typeof Gerundios]}…` : rotulo
}

export function BotaoAcao({ pendente, children, ...props }: ComponentProps<typeof Button> & { pendente: boolean }) {
  return (
    <Button {...props} aria-busy={pendente || undefined} disabled={pendente || props.disabled}>
      {pendente && <Spinner aria-hidden="true" />}
      {pendente ? gerundio(children) : children}
    </Button>
  )
}

export function useLeituras<T extends Record<string, unknown>>(urls: Record<keyof T, string>) {
  const cliente = useQueryClient()
  const chave = ['leituras', ...Object.values(urls)]
  const { data, error } = useQuery({
    queryKey: chave,
    queryFn: async () => Object.fromEntries(await Promise.all(Object.entries(urls).map(async ([k, url]) => [k, await api(url as string)]))) as T,
  })
  return { dados: data, erro: error ?? undefined, recarregar: () => cliente.invalidateQueries({ queryKey: chave }) }
}

type Gravacao = { chamar: () => Promise<unknown>; aviso: string | ((resultado: unknown) => string); depois?: () => void }

export function useGravacao(recarregar: () => Promise<unknown>) {
  return useMutation({
    mutationFn: ({ chamar }: Gravacao) => chamar(),
    onSuccess: async (resultado, { aviso, depois }) => {
      depois?.()
      toast.success(typeof aviso === 'function' ? aviso(resultado) : aviso)
      await recarregar()
    },
  })
}
