import { Upload } from 'lucide-react'
import { useState } from 'react'
import { useGravacao } from '../acao'
import { api } from '../api'
import { Cabecalho } from '../Cabecalho'
import { Campo } from '../Campo'
import { CampoArquivo } from '../CampoArquivo'
import { Editor } from '../Editor'
import { ErroDe } from '../ErroDe'
import { Opcoes } from '../Opcoes'
import { Situacao } from '../Situacao'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { ConfirmarArquivar, SeloEstado, SeloIndexacao, useCatalogo, type Categoria, type Indexacao } from './comum'

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
          <Campo id="titulo-documento" rotulo="Título" maxLength={200} value={envio.titulo} onChange={(e) => setEnvio({ ...envio, titulo: e.target.value })} />
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

const tituloDaJanela = (e?: Envio) => (e?.id ? 'Nova versão' : 'Enviar PDF')
const rotaDoEnvio = (r: Envio) => (r.id ? `/api/admin/documentos/${r.id}/versoes` : '/api/admin/documentos')

// RAG S3: PDFs da instituição que o assistente consulta; o aluno nunca vê o documento, só a resposta.
export function Documentos() {
  const { itens: documentos, categorias, erro, recarregar } = useCatalogo<Documento>('/api/admin/documentos')
  const [envio, setEnvio] = useState<Envio>()
  const [arquivar, setArquivar] = useState<Documento>()
  const acao = useGravacao(recarregar)

  const enviar = () => acao.mutate({ chamar: () => api(rotaDoEnvio(envio!), formulario(envio!)), aviso: 'Documento enviado.', depois: () => setEnvio(undefined) })

  function confirmarArquivar(d: Documento) {
    setArquivar(undefined)
    acao.mutate({ chamar: () => api(`/api/admin/documentos/${d.id}/arquivar`, {}), aviso: 'Documento arquivado.' })
  }

  return (
    <div className="flex flex-col gap-2">
      <Cabecalho botao="Enviar PDF" Icone={Upload} aoClicar={() => setEnvio({ titulo: '', categoriaId: '' })} />
      <p className="text-sm text-muted-foreground">PDFs da instituição (regulamentos, calendários, editais) que o assistente consulta. O aluno nunca vê o documento, só a resposta.</p>
      <ErroDe erro={erro} />
      <ErroDe erro={acao.error} oculto={!!envio} />
      <Situacao itens={documentos} erro={erro} />
      {documentos?.map((d) => (
        <ItemDocumento key={d.id} d={d} novaVersao={() => setEnvio({ id: d.id, titulo: d.titulo, categoriaId: String(d.categoriaId) })} arquivar={() => setArquivar(d)} pendente={acao.isPending} />
      ))}

      <Editor titulo={tituloDaJanela(envio)} aberto={!!envio} fechar={() => setEnvio(undefined)} salvar={enviar} pendente={acao.isPending} alerta={<ErroDe erro={acao.error} />} botao="Enviar" desabilitado={!envio?.arquivo}>
        {envio && <CamposDoEnvio envio={envio} setEnvio={setEnvio} categorias={categorias} />}
      </Editor>

      <ConfirmarArquivar tipo="documento" titulo={arquivar?.titulo} aberto={!!arquivar} fechar={() => setArquivar(undefined)} arquivar={() => confirmarArquivar(arquivar!)} />
    </div>
  )
}
