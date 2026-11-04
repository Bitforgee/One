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
import { Documento } from '../ilustracoes'
import { Button } from '../ui/button'
import { CelulaLargo, Detalhe, MenuAcoes, Principal, Tabela } from '../Tabela'
import { DropdownMenuItem } from '../ui/dropdown-menu'
import { Label } from '../ui/label'
import { NativeSelect } from '../ui/native-select'
import { TableCell, TableRow } from '../ui/table'
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

const Colunas = [{ titulo: 'Título' }, { titulo: 'Categoria', largo: true }, { titulo: 'Versão', largo: true }, { titulo: 'Arquivo', largo: true }, { titulo: 'Situação' }, { titulo: '' }]

function LinhaDocumento({ d, novaVersao, arquivar, pendente }: { d: Documento; novaVersao: () => void; arquivar: () => void; pendente: boolean }) {
  const versao = `versão ${d.versao.numero} · ${d.versao.paginas} ${paginas(d.versao.paginas)}`
  return (
    <TableRow>
      <TableCell className={`font-medium ${Principal}`}>
        {d.titulo}
        <Detalhe>{[d.categoria, versao, d.versao.nomeArquivo].join(' · ')}</Detalhe>
      </TableCell>
      <CelulaLargo>{d.categoria}</CelulaLargo>
      <CelulaLargo>{versao}</CelulaLargo>
      <CelulaLargo>{d.versao.nomeArquivo}</CelulaLargo>
      <TableCell data-celula="selo">
        <div className="flex gap-1">
          <SeloIndexacao valor={d.indexacao} />
          <SeloEstado estado={d.estado} />
        </div>
      </TableCell>
      <TableCell data-celula="acoes" className="text-end">
        {d.estado === 'ATIVO' && (
          <MenuAcoes nome={d.titulo} pendente={pendente}>
            <DropdownMenuItem disabled={pendente} onSelect={novaVersao}>
              Nova versão
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" disabled={pendente} onSelect={arquivar}>
              Arquivar
            </DropdownMenuItem>
          </MenuAcoes>
        )}
      </TableCell>
    </TableRow>
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
      <Cabecalho botao="Enviar PDF" Icone={Upload} aoClicar={() => setEnvio({ titulo: '', categoriaId: '' })}>
        <p className="text-sm text-muted-foreground">PDFs da instituição (regulamentos, calendários, editais) que o assistente consulta. O aluno nunca vê o documento, só a resposta.</p>
      </Cabecalho>
      <ErroDe erro={erro} />
      <ErroDe erro={acao.error} oculto={!!envio} />
      <Tabela
        colunas={Colunas}
        itens={documentos}
        erro={erro}
        vazio={{
          Ilustracao: Documento,
          titulo: 'Nenhum documento',
          frase: 'PDFs como regulamentos e calendários também alimentam o assistente.',
          acao: <Button onClick={() => setEnvio({ titulo: '', categoriaId: '' })}>Novo documento</Button>,
        }}
      >
        {documentos?.map((d) => (
          <LinhaDocumento key={d.id} d={d} novaVersao={() => setEnvio({ id: d.id, titulo: d.titulo, categoriaId: String(d.categoriaId) })} arquivar={() => setArquivar(d)} pendente={acao.isPending} />
        ))}
      </Tabela>

      <Editor titulo={tituloDaJanela(envio)} aberto={!!envio} fechar={() => setEnvio(undefined)} salvar={enviar} pendente={acao.isPending} alerta={<ErroDe erro={acao.error} />} botao="Enviar" desabilitado={!envio?.arquivo}>
        {envio && <CamposDoEnvio envio={envio} setEnvio={setEnvio} categorias={categorias} />}
      </Editor>

      <ConfirmarArquivar tipo="documento" titulo={arquivar?.titulo} aberto={!!arquivar} fechar={() => setArquivar(undefined)} arquivar={() => confirmarArquivar(arquivar!)} />
    </div>
  )
}
