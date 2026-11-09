import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useOutletContext, useParams } from 'react-router'
import { api, type Me } from './api'

export type Sessao = { me: Me; setMe: (me: Me) => void }
export const useSessao = () => useOutletContext<Sessao>()

export function telaInicial(u: { papeis: string[]; deveTrocarSenha: boolean }): string {
  if (u.deveTrocarSenha) return 'trocar-senha'
  if (u.papeis.includes('ALUNO')) return 'assistente'
  if (u.papeis.includes('ATENDENTE')) return 'fila'
  if (u.papeis.includes('ADMINISTRADOR')) return 'artigos'
  if (u.papeis.includes('OPERADOR')) return 'instituicoes'
  return 'assistente'
}

export function useSair() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const cliente = useQueryClient()
  return async () => {
    await api('/api/auth/logout', {}).catch(() => undefined)
    navigate(`/${slug}`)
    cliente.removeQueries({ queryKey: ['me'] })
  }
}
