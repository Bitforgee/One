import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Spinner } from '../ui/spinner'

export type Indexacao = 'PENDENTE' | 'INDEXADO' | 'FALHOU'
export type Categoria = { id: number; nome: string; ativa: boolean }

// RAG: o assistente só busca o que já tem embedding; o agendador indexa em segundo plano.
const Indexacoes = { PENDENTE: ['Indexando', 'secondary', ''], INDEXADO: ['Indexado', 'default', 'bg-success'], FALHOU: ['Falhou', 'destructive', ''] } as const
export function SeloIndexacao({ valor }: { valor: Indexacao | null }) {
  if (!valor) return null
  const [rotulo, variant, cor] = Indexacoes[valor]
  return (
    <Badge variant={variant} className={cor} title="Indexação para a busca do assistente">
      {rotulo}
    </Badge>
  )
}

const Estados = { RASCUNHO: 'bg-secondary text-secondary-foreground', ATIVO: 'bg-success text-primary-foreground', ARQUIVADO: 'bg-foreground text-background' }
export function SeloEstado({ estado }: { estado: keyof typeof Estados }) {
  return <Badge className={Estados[estado]}>{estado}</Badge>
}

// Lê a lista da tela e as categorias ativas; quem grava manda reler.
export function useCatalogo<T>(url: string) {
  const cliente = useQueryClient()
  const chave = ['catalogo', url]
  const { data, error } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const [itens, categorias] = await Promise.all([api<T[]>(url), api<Categoria[]>('/api/admin/categorias')])
      return { itens, categorias: categorias.filter((c) => c.ativa) }
    },
  })
  return { itens: data?.itens, categorias: data?.categorias ?? [], erro: error?.message, recarregar: () => cliente.invalidateQueries({ queryKey: chave }) }
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

export function Situacao({ itens, erro }: { itens?: unknown[]; erro?: string }) {
  if (!itens) return erro ? null : <Spinner className="size-8" />
  return itens.length === 0 ? <p className="text-muted-foreground">Nenhum item cadastrado.</p> : null
}

export function ConfirmarArquivar({ tipo, titulo, aberto, fechar, arquivar }: { tipo: string; titulo?: string; aberto: boolean; fechar: () => void; arquivar: () => void }) {
  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arquivar o {tipo}?</DialogTitle>
          <DialogDescription>“{titulo}” sai da base do assistente. As conversas que já o citaram continuam como estão.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={arquivar}>
            Arquivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
