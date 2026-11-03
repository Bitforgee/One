import { useQuery } from '@tanstack/react-query'
import { Bell, BellOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from './api'
import { alternar, subscricaoLocal, suportado } from './push'
import { Button } from './ui/button'

// Botão da barra do aluno: só aparece com suporte do navegador e a chave do servidor (404 = push desligado).
// Na barra é um sino (rótulo em aria-label/title, cabe em 360 px); na gaveta e no "Mais" é um item com o texto visível.
export function AvisosPush({ item }: { item?: string }) {
  const chave = useQuery({ queryKey: ['push-chave'], queryFn: () => api<{ chavePublica: string }>('/api/push/chave'), enabled: suportado(), retry: false })
  const local = useQuery({ queryKey: ['push-local'], queryFn: subscricaoLocal, enabled: !!chave.data })
  const [ocupado, setOcupado] = useState(false)
  if (!chave.data || local.data === undefined) return null
  const inscrito = local.data

  async function aoClicar() {
    setOcupado(true)
    try {
      if (!(await alternar(inscrito, chave.data!.chavePublica))) toast.error('Os avisos estão bloqueados neste navegador')
      await local.refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível alterar os avisos.')
    } finally {
      setOcupado(false)
    }
  }

  const rotulo = inscrito ? 'Desativar avisos' : 'Ativar avisos neste aparelho'
  const Icone = inscrito ? BellOff : Bell
  if (item)
    return (
      <button type="button" className={item} disabled={ocupado} onClick={aoClicar}>
        <Icone aria-hidden="true" className="size-4" />
        {rotulo}
      </button>
    )
  return (
    <Button variant="ghost" size="icon" aria-label={rotulo} title={rotulo} disabled={ocupado} onClick={aoClicar}>
      <Icone aria-hidden="true" />
    </Button>
  )
}
