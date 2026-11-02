import { useOutletContext } from 'react-router'
import type { Me } from './api'

export type Sessao = { me: Me; setMe: (me: Me) => void }
export const useSessao = () => useOutletContext<Sessao>()

// Tela que abre depois do login: Assistente para aluno, Fila para atendente, Artigos para administrador.
export function telaInicial(u: { papeis: string[]; deveTrocarSenha: boolean }): string {
  if (u.deveTrocarSenha) return 'trocar-senha'
  if (u.papeis.includes('ALUNO')) return 'assistente'
  if (u.papeis.includes('ATENDENTE')) return 'fila'
  if (u.papeis.includes('ADMINISTRADOR')) return 'artigos'
  return 'assistente'
}
