import { useEffect } from 'react'

export function useAvisoAoFechar(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [ativo])
}
