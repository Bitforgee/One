import { useQuery } from '@tanstack/react-query'
import { Bell, BellOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from './api'
import { alternar, subscricaoLocal, suportado } from './push'
import { Button } from './ui/button'

// Os avisos deste aparelho: só existem com suporte do navegador e a chave do servidor (204 sem corpo = push desligado, `api` devolve undefined, que o react-query recusa, por isso o ?? null).
export function useAvisos() {
  const chave = useQuery({ queryKey: ['push-chave'], queryFn: async () => (await api<{ chavePublica: string }>('/api/push/chave')) ?? null, enabled: suportado(), retry: false })
  const local = useQuery({ queryKey: ['push-local'], queryFn: subscricaoLocal, enabled: !!chave.data })
  const [ocupado, setOcupado] = useState(false)
  const inscrito = !!local.data

  async function alternarAvisos() {
    setOcupado(true)
    try {
      if (!(await alternar(local.data ?? null, chave.data!.chavePublica))) toast.error('Os avisos estão bloqueados neste navegador')
      await local.refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível alterar os avisos.')
    } finally {
      setOcupado(false)
    }
  }

  return { disponivel: !!chave.data && local.data !== undefined, inscrito, ocupado, alternar: alternarAvisos }
}

// Botão do cabeçalho do aluno. É um sino (rótulo em aria-label/title, cabe em 360 px).
export function AvisosPush() {
  const { disponivel, inscrito, ocupado, alternar: aoClicar } = useAvisos()
  if (!disponivel) return null
  const rotulo = inscrito ? 'Desativar avisos' : 'Ativar avisos neste aparelho'
  const Icone = inscrito ? BellOff : Bell
  return (
    <Button variant="ghost" size="icon" aria-label={rotulo} title={rotulo} disabled={ocupado} onClick={aoClicar}>
      <Icone aria-hidden="true" />
    </Button>
  )
}
