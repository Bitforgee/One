import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import { toast } from 'sonner'
import { api } from './api'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'

// Botão de uma ação da tela: pendente mostra o Spinner e desabilita.
export function BotaoAcao({ pendente, children, ...props }: ComponentProps<typeof Button> & { pendente: boolean }) {
  return (
    <Button {...props} disabled={pendente || props.disabled}>
      {pendente && <Spinner />}
      {children}
    </Button>
  )
}

// Lê as listas que a tela usa (uma por url) e dá a função que as relê depois de uma gravação.
export function useLeituras<T extends Record<string, unknown>>(urls: Record<keyof T, string>) {
  const cliente = useQueryClient()
  const chave = ['leituras', ...Object.values(urls)]
  const { data, error } = useQuery({
    queryKey: chave,
    queryFn: async () => Object.fromEntries(await Promise.all(Object.entries(urls).map(async ([k, url]) => [k, await api(url as string)]))) as T,
  })
  return { dados: data, erro: error?.message, recarregar: () => cliente.invalidateQueries({ queryKey: chave }) }
}

type Gravacao = { chamar: () => Promise<unknown>; aviso: string; depois?: () => void }

// Uma gravação: o toast só aparece no sucesso (door 13); o erro fica em `error`, para o Alert da tela ou do diálogo.
export function useGravacao(recarregar: () => Promise<unknown>) {
  return useMutation({
    mutationFn: ({ chamar }: Gravacao) => chamar(),
    onSuccess: async (_, { aviso, depois }) => {
      depois?.()
      toast.success(aviso)
      await recarregar()
    },
  })
}
