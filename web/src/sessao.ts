import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useOutletContext, useParams } from 'react-router'
import { api, type Me } from './api'

export type Sessao = { me: Me; setMe: (me: Me) => void }
export const useSessao = () => useOutletContext<Sessao>()

// Tela que abre depois do login: Assistente para aluno, Fila para atendente, Artigos para administrador, Instituições para o operador.
export function telaInicial(u: { papeis: string[]; deveTrocarSenha: boolean }): string {
  if (u.deveTrocarSenha) return 'trocar-senha'
  if (u.papeis.includes('ALUNO')) return 'assistente'
  if (u.papeis.includes('ATENDENTE')) return 'fila'
  if (u.papeis.includes('ADMINISTRADOR')) return 'artigos'
  if (u.papeis.includes('OPERADOR')) return 'instituicoes'
  return 'assistente'
}

// Sair: o logout, a volta ao login da instituição e o /me esquecido (o próximo login lê de novo).
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
