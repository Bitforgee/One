import { useEffect } from 'react'

// Fechar ou recarregar a aba do navegador com alterações não salvas pede a confirmação dele.
export function useAvisoAoFechar(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [ativo])
}
