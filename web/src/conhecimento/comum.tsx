import { CircleAlert, CircleCheck, Clock } from 'lucide-react'
import { useLeituras } from '../acao'
import { Confirmar } from '../Confirmar'
import { Badge } from '../ui/badge'

export type Indexacao = 'PENDENTE' | 'INDEXADO' | 'FALHOU'
export type Categoria = { id: number; nome: string; ativa: boolean }

const Indexacoes = { PENDENTE: ['Indexando', Clock, 'text-muted-foreground'], INDEXADO: ['Indexado', CircleCheck, 'text-success'], FALHOU: ['Falhou', CircleAlert, 'text-destructive'] } as const
export function IconeIndexacao({ valor }: { valor: Indexacao | null }) {
  const [rotulo, Icone, cor] = valor ? Indexacoes[valor] : []
  return (
    <span aria-live="polite">
      {Icone && (
        <Icone role="img" aria-label={rotulo} className={`ms-1 inline size-4 align-text-bottom ${cor}`}>
          <title>{rotulo}</title>
        </Icone>
      )}
    </span>
  )
}

const Estados = { RASCUNHO: ['Rascunho', 'bg-secondary text-secondary-foreground'], ATIVO: ['Ativo', 'bg-success text-primary-foreground'], ARQUIVADO: ['Arquivado', 'bg-foreground text-background'] }
export function SeloEstado({ estado }: { estado: keyof typeof Estados }) {
  const [rotulo, cor] = Estados[estado]
  return <Badge className={cor}>{rotulo}</Badge>
}

export function useCatalogo<T>(url: string) {
  const { dados, erro, recarregar } = useLeituras<{ itens: T[]; categorias: Categoria[] }>({ itens: url, categorias: '/api/admin/categorias' })
  return { itens: dados?.itens, categorias: dados?.categorias.filter((c) => c.ativa) ?? [], erro, recarregar }
}

export function ConfirmarArquivar({ tipo, titulo, aberto, fechar, arquivar }: { tipo: string; titulo?: string; aberto: boolean; fechar: () => void; arquivar: () => void }) {
  return (
    <Confirmar aberto={aberto} fechar={fechar} titulo={`Arquivar o ${tipo}?`} botao="Arquivar" destrutivo confirmar={arquivar}>
      “{titulo}” sai da base do assistente. As conversas que já o citaram continuam como estão.
    </Confirmar>
  )
}
