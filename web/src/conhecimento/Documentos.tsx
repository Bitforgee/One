import { Upload } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BotaoAcao } from '../acao'
import { api } from '../api'
import { CampoArquivo } from '../CampoArquivo'
import { Opcoes } from '../Opcoes'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { ConfirmarArquivar, SeloEstado, SeloIndexacao, Situacao, useCatalogo, useGravacao, type Categoria, type Indexacao } from './comum'

type Documento = {
  id: number
  titulo: string
  categoriaId: number
  categoria: string
  estado: 'ATIVO' | 'ARQUIVADO'
  versao: { id: number; numero: number; nomeArquivo: string; paginas: number; criadaEm: string }
  indexacao: Indexacao
}
type Envio = { id?: number; titulo: string; categoriaId: string; arquivo?: File }

const paginas = (n: number) => (n === 1 ? 'página' : 'páginas')

// Documento novo leva título e categoria; nova versão leva só o arquivo.
function formulario(r: Envio) {
  const f = new FormData()
  if (!r.id) {
    f.append('titulo', r.titulo)
    f.append('categoriaId', r.categoriaId)
  }
  if (r.arquivo) f.append('arquivo', r.arquivo)
  return f
}

function ItemDocumento({ d, novaVersao, arquivar, pendente }: { d: Documento; novaVersao: () => void; arquivar: () => void; pendente: boolean }) {
  return (
    <Card className="gap-1 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <strong className="min-w-0 break-words">{d.titulo}</strong>
        <div className="flex shrink-0 gap-1">
          <SeloIndexacao valor={d.indexacao} />
          <SeloEstado estado={d.estado} />
        </div>
      </div>
      <div className="text-sm break-words text-muted-foreground">
        {d.categoria} · versão {d.versao.numero} · {d.versao.paginas} {paginas(d.versao.paginas)} · {d.versao.nomeArquivo}
      </div>
      {d.estado === 'ATIVO' && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={novaVersao} disabled={pendente}>
            Nova versão
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={arquivar} disabled={pendente}>
            Arquivar
          </Button>
        </div>
      )}
    </Card>
  )
}

function CamposDoEnvio({ envio, setEnvio, categorias }: { envio: Envio; setEnvio: (e: Envio) => void; categorias: Categoria[] }) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {envio.id ? `A nova versão de “${envio.titulo}” substitui a atual na busca; as anteriores ficam guardadas.` : 'PDF com texto (não digitalizado), até 20 MB.'}
      </p>
      {!envio.id && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo-documento">Título</Label>
            <Input id="titulo-documento" maxLength={200} value={envio.titulo} onChange={(e) => setEnvio({ ...envio, titulo: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-documento">Categoria</Label>
            <NativeSelect id="categoria-documento" className="w-full" value={envio.categoriaId} onChange={(e) => setEnvio({ ...envio, categoriaId: e.target.value })}>
              <Opcoes vazio="Escolha a categoria" itens={categorias} />
            </NativeSelect>
          </div>
        </>
      )}
      <CampoArquivo
        id="arquivo-documento"
        rotulo="Arquivo PDF"
        accept=".pdf,application/pdf"
        multiple={false}
        arquivos={envio.arquivo ? [envio.arquivo] : []}
        setArquivos={([arquivo]) => setEnvio({ ...envio, arquivo })}
      />
    </>
  )
}

// RAG S3: PDFs da instituição que o assistente consulta; o aluno nunca vê o documento, só a resposta.
export function Documentos() {
  const { itens: documentos, categorias, erro, recarregar } = useCatalogo<Documento>('/api/admin/documentos')
  const [envio, setEnvio] = useState<Envio>()
  const [arquivar, setArquivar] = useState<Documento>()
  const acao = useGravacao(recarregar)
  const alerta = acao.error && <Alert variant="destructive">{acao.error.message}</Alert>

  function enviar(e: FormEvent) {
    e.preventDefault()
    const r = envio!
    acao.mutate({
      chamar: () => api(r.id ? `/api/admin/documentos/${r.id}/versoes` : '/api/admin/documentos', formulario(r)),
      aviso: 'Documento enviado.',
      depois: () => setEnvio(undefined),
    })
  }

  function confirmarArquivar(d: Documento) {
    setArquivar(undefined)
    acao.mutate({ chamar: () => api(`/api/admin/documentos/${d.id}/arquivar`, {}), aviso: 'Documento arquivado.' })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Documentos</h1>
        <Button onClick={() => setEnvio({ titulo: '', categoriaId: '' })}>
          <Upload aria-hidden="true" />
          Enviar PDF
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">PDFs da instituição (regulamentos, calendários, editais) que o assistente consulta. O aluno nunca vê o documento, só a resposta.</p>
      {erro && <Alert variant="destructive">{erro}</Alert>}
      {!envio && alerta}
      <Situacao itens={documentos} erro={erro} />
      {documentos?.map((d) => (
        <ItemDocumento key={d.id} d={d} novaVersao={() => setEnvio({ id: d.id, titulo: d.titulo, categoriaId: String(d.categoriaId) })} arquivar={() => setArquivar(d)} pendente={acao.isPending} />
      ))}

      <Dialog open={!!envio} onOpenChange={(aberto) => !aberto && setEnvio(undefined)}>
        <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <form onSubmit={enviar} className="contents">
            <DialogHeader>
              <DialogTitle>{envio?.id ? 'Nova versão' : 'Enviar PDF'}</DialogTitle>
            </DialogHeader>
            {envio && <CamposDoEnvio envio={envio} setEnvio={setEnvio} categorias={categorias} />}
            {alerta}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEnvio(undefined)}>
                Cancelar
              </Button>
              <BotaoAcao type="submit" pendente={acao.isPending} disabled={!envio?.arquivo}>
                Enviar
              </BotaoAcao>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmarArquivar tipo="documento" titulo={arquivar?.titulo} aberto={!!arquivar} fechar={() => setArquivar(undefined)} arquivar={() => confirmarArquivar(arquivar!)} />
    </div>
  )
}
