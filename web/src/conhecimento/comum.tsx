import { useLeituras } from '../acao'
import { Confirmar } from '../Confirmar'
import { Badge } from '../ui/badge'

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

const Estados = { RASCUNHO: ['Rascunho', 'bg-secondary text-secondary-foreground'], ATIVO: ['Ativo', 'bg-success text-primary-foreground'], ARQUIVADO: ['Arquivado', 'bg-foreground text-background'] }
export function SeloEstado({ estado }: { estado: keyof typeof Estados }) {
  const [rotulo, cor] = Estados[estado]
  return <Badge className={cor}>{rotulo}</Badge>
}

// Lê a lista da tela e as categorias ativas; quem grava manda reler.
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
