import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

function useParametro() {
  const [params, setParams] = useSearchParams()
  const gravar = (chave: string, valor: string | null) =>
    setParams(
      (anterior) => {
        const proximo = new URLSearchParams(anterior)
        if (valor === null) proximo.delete(chave)
        else proximo.set(chave, valor)
        return proximo
      },
      { replace: true },
    )
  return { params, gravar }
}

export function useBuscaNaUrl() {
  const { params, gravar } = useParametro()
  const [busca, setBusca] = useState(() => (params.get('q')?.trim() ? params.get('q')! : ''))
  const buscar = (valor: string) => {
    setBusca(valor)
    gravar('q', valor === '' ? null : valor)
  }
  return [busca, buscar] as const
}

export function useEditarNaUrl<F extends { id?: number }>(achar: (id: number) => F | undefined, novo: F, pronto: boolean) {
  const { params, gravar } = useParametro()
  const [editando, setEditando] = useState<F>()
  const pedido = params.get('editar')
  const abrir = (ficha: F) => {
    setEditando(ficha)
    gravar('editar', ficha.id === undefined ? 'novo' : String(ficha.id))
  }
  const fechar = () => {
    setEditando(undefined)
    gravar('editar', null)
  }
  useEffect(() => {
    if (!pronto || pedido === null || editando) return
    const ficha = pedido === 'novo' ? { ...novo } : /^\d+$/.test(pedido) ? achar(Number(pedido)) : undefined
    if (ficha) setEditando(ficha)
    else gravar('editar', null)
  }, [pronto, pedido])
  return { editando, setEditando, abrir, fechar }
}
