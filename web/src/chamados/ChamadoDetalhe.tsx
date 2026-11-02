import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Button, Form, Modal, Stack } from 'react-bootstrap'
import { useParams } from 'react-router'
import { BotaoAcao, useAcao } from '../acao'
import { api, ErroApi } from '../api'
import { useChamado, type Chamado } from '../chamado'
import { Opcoes } from '../Opcoes'
import { useSessao } from '../sessao'
import { Carregando } from './Chamados'
import { Cabecalho, Historico, Mensagens, Transcricao } from './Conversa'

type Executar = (caminho: string, corpo: unknown, depois?: () => void) => void
type Acoes = { pode: (acao: string) => boolean; executar: Executar; pendente: boolean }
type Pronta = { id: number; titulo: string; texto: string }

// AC 147: respostas prontas do setor do chamado, só para a equipe
function useProntas(setorId?: number) {
  const [prontas, setProntas] = useState<Pronta[]>([])
  useEffect(() => {
    if (setorId) api<Pronta[]>(`/api/respostas-prontas?setorId=${setorId}`).then(setProntas, () => setProntas([]))
  }, [setorId])
  return prontas
}

type Equipe = { equipe: boolean; nota: boolean }

// Só a equipe recebe prontas: o aluno nunca as busca.
function SelecaoPronta({ nota, prontas, setTexto }: { nota: boolean; prontas: Pronta[]; setTexto: (t: string) => void }) {
  if (nota || prontas.length === 0) return null
  return (
    <Form.Select aria-label="Resposta pronta" className="mb-2" value="" onChange={(e) => setTexto(prontas.find((p) => String(p.id) === e.target.value)!.texto)}>
      <option value="">Inserir resposta pronta…</option>
      {prontas.map((p) => (
        <option key={p.id} value={p.id}>
          {p.titulo}
        </option>
      ))}
    </Form.Select>
  )
}

function CampoAnexos({ nota, envio, setArquivos }: { nota: boolean; envio?: boolean; setArquivos: (a: File[]) => void }) {
  if (nota) return null
  return (
    <Form.Group controlId="anexos" className="mt-2">
      <Form.Label className="small">Anexos (PDF, JPG ou PNG, até 10 MB cada)</Form.Label>
      <Form.Control key={String(envio)} type="file" size="sm" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setArquivos(Array.from((e.target as HTMLInputElement).files!))} />
    </Form.Group>
  )
}

function MarcasDaEquipe({ equipe, nota, pode, setNota, aguardaAluno, setAguardaAluno }: Equipe & {
  pode: Acoes['pode']; setNota: (v: boolean) => void; aguardaAluno: boolean; setAguardaAluno: (v: boolean) => void
}) {
  if (!equipe) return null
  return (
    <Stack direction="horizontal" gap={3} className="flex-wrap mt-2">
      {pode('nota') && <Form.Check id="nota" label="Nota interna" checked={nota} onChange={(e) => setNota(e.target.checked)} />}
      {pode('responder') && !nota && <Form.Check id="aguarda" label="Aguardando aluno" checked={aguardaAluno} onChange={(e) => setAguardaAluno(e.target.checked)} />}
    </Stack>
  )
}

const rotuloResposta = (c: Chamado, equipe: boolean) => (c.estado === 'RESOLVIDO' && !equipe ? 'Responder (reabre a solicitação)' : 'Responder')
const semEnvio = (texto: string, nota: boolean, podeResponder: boolean) => !texto.trim() || (!nota && !podeResponder)

// Nota interna não leva anexo nem marca aguardando aluno.
function corpoDaResposta(texto: string, nota: boolean, aguardaAluno: boolean, arquivos: File[]) {
  const f = new FormData()
  f.set('tipo', nota ? 'NOTA' : 'PUBLICA')
  f.set('texto', texto)
  f.set('aguardaAluno', String(!nota && aguardaAluno))
  if (!nota) arquivos.forEach((a) => f.append('anexos', a))
  return f
}

// Fica montado mesmo sem permissão para responder: o texto digitado e a busca das prontas não dependem disso.
function Responder({ c, equipe, pode, executar, pendente }: Acoes & { c: Chamado; equipe: boolean }) {
  const [texto, setTexto] = useState('')
  const [nota, setNota] = useState(false)
  const [aguardaAluno, setAguardaAluno] = useState(false)
  const [arquivos, setArquivos] = useState<File[]>([])
  const [envio, setEnvio] = useState<boolean>() // cada envio troca a chave do campo de arquivo, que volta vazio
  const prontas = useProntas(equipe ? c.setorId : undefined)
  if (!pode('responder') && !pode('nota')) return null

  function responder(e: FormEvent) {
    e.preventDefault()
    executar('mensagens', corpoDaResposta(texto, nota, aguardaAluno, arquivos), () => {
      setTexto('')
      setAguardaAluno(false)
      setArquivos([])
      setEnvio((n) => !n)
    })
  }

  return (
    <Form onSubmit={responder} className="mb-3">
      <SelecaoPronta nota={nota} prontas={prontas} setTexto={setTexto} />
      <Form.Group controlId="resposta">
        <Form.Label>{rotuloResposta(c, equipe)}</Form.Label>
        <Form.Control as="textarea" rows={3} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </Form.Group>
      <CampoAnexos nota={nota} envio={envio} setArquivos={setArquivos} />
      <MarcasDaEquipe equipe={equipe} nota={nota} pode={pode} setNota={setNota} aguardaAluno={aguardaAluno} setAguardaAluno={setAguardaAluno} />
      <BotaoAcao type="submit" pendente={pendente} className="mt-2" disabled={semEnvio(texto, nota, pode('responder'))}>
        Enviar
      </BotaoAcao>
    </Form>
  )
}

function BotoesDeAcao({ pode, executar, pendente, abrir }: Acoes & { abrir: (modal: 'encaminhar' | 'cancelar') => void }) {
  return (
    <Stack direction="horizontal" gap={2} className="flex-wrap mb-3">
      {pode('assumir') && (
        <BotaoAcao pendente={pendente} onClick={() => executar('assumir', {})}>
          Assumir
        </BotaoAcao>
      )}
      {pode('confirmar') && (
        <BotaoAcao pendente={pendente} variant="success" onClick={() => executar('confirmar', {})}>
          Confirmar resolução
        </BotaoAcao>
      )}
      {pode('encaminhar') && (
        <Button variant="outline-secondary" onClick={() => abrir('encaminhar')} disabled={pendente}>
          Encaminhar
        </Button>
      )}
      {pode('cancelar') && (
        <Button variant="outline-danger" onClick={() => abrir('cancelar')} disabled={pendente}>
          Cancelar solicitação
        </Button>
      )}
    </Stack>
  )
}

// Formulário de uma ação do chamado; só aparece quando a API devolve a ação entre as permitidas.
function FormDeAcao({ visivel, enviar, children }: { visivel: boolean; enviar: () => void; children: ReactNode }) {
  if (!visivel) return null
  return (
    <Form
      className="mb-3"
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
    >
      {children}
    </Form>
  )
}

type Campo = { valor: string; setValor: (v: string) => void }
type FormTextoProps = Campo & { visivel: boolean; enviar: () => void; id: string; rotulo: string; botao: string; variant: string; pendente: boolean }

function FormTexto({ visivel, enviar, id, rotulo, botao, variant, pendente, valor, setValor }: FormTextoProps) {
  return (
    <FormDeAcao visivel={visivel} enviar={enviar}>
      <Form.Group controlId={id}>
        <Form.Label>{rotulo}</Form.Label>
        <Form.Control as="textarea" rows={2} maxLength={4000} value={valor} onChange={(e) => setValor(e.target.value)} />
      </Form.Group>
      <BotaoAcao type="submit" pendente={pendente} variant={variant} className="mt-2" disabled={!valor.trim()}>
        {botao}
      </BotaoAcao>
    </FormDeAcao>
  )
}

function FormLinha({ visivel, enviar, id, rotulo, botao, pendente, pronto, children }: {
  visivel: boolean; enviar: () => void; id: string; rotulo: string; botao: string; pendente: boolean; pronto: boolean; children: ReactNode
}) {
  return (
    <FormDeAcao visivel={visivel} enviar={enviar}>
      <Form.Group controlId={id}>
        <Form.Label>{rotulo}</Form.Label>
        <Stack direction="horizontal" gap={2}>
          {children}
          <BotaoAcao type="submit" pendente={pendente} variant="outline-secondary" disabled={!pronto}>
            {botao}
          </BotaoAcao>
        </Stack>
      </Form.Group>
    </FormDeAcao>
  )
}

function Confirmacao({ aberto, fechar, titulo, botao, variant, pronto, confirmar, children }: {
  aberto: boolean; fechar: () => void; titulo: string; botao: string; variant?: string; pronto: boolean; confirmar: () => void; children: ReactNode
}) {
  return (
    <Modal show={aberto} onHide={fechar} centered>
      <Modal.Header closeButton>
        <Modal.Title>{titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={fechar}>
          Voltar
        </Button>
        <Button
          variant={variant}
          disabled={!pronto}
          onClick={() => {
            fechar()
            confirmar()
          }}
        >
          {botao}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function CampoMotivo({ id, rotulo, valor, setValor }: Campo & { id: string; rotulo: string }) {
  return (
    <Form.Group controlId={id}>
      <Form.Label>{rotulo}</Form.Label>
      <Form.Control as="textarea" rows={2} maxLength={4000} value={valor} onChange={(e) => setValor(e.target.value)} />
    </Form.Group>
  )
}

function Detalhe({ c, fuso, carregar, setChamado }: { c: Chamado; fuso: string; carregar: () => Promise<void>; setChamado: (c: Chamado) => void }) {
  const acao = useAcao()
  const [resolucao, setResolucao] = useState('')
  const [motivo, setMotivo] = useState('') // o mesmo motivo serve à rejeição, ao encaminhamento e ao cancelamento
  const [categoriaId, setCategoriaId] = useState('')
  const [original, setOriginal] = useState('')
  const [setorId, setSetorId] = useState('')
  const [modal, setModal] = useState<'encaminhar' | 'cancelar'>()
  const fechar = () => setModal(undefined)
  const equipe = c.eventos !== null
  const pode = (a: string) => c.acoes.includes(a)

  // Toda ação devolve o chamado atualizado; num conflito (409) a tela relê o chamado e mostra o detail.
  function executar(caminho: string, corpo: unknown, depois?: () => void) {
    acao.executar(async () => {
      try {
        setChamado(await api<Chamado>(`/api/chamados/${c.numero}/${caminho}`, corpo))
        depois?.()
      } catch (e) {
        if (e instanceof ErroApi && e.status === 409) await carregar()
        throw e
      }
    })
  }
  const acoes = { pode, executar, pendente: acao.pendente }
  const limparMotivo = () => setMotivo('')

  return (
    <>
      <Cabecalho c={c} />
      <Transcricao c={c} fuso={fuso} />
      <Mensagens mensagens={c.mensagens} fuso={fuso} />
      <Responder c={c} equipe={equipe} {...acoes} />
      <BotoesDeAcao {...acoes} abrir={setModal} />
      <FormTexto visivel={pode('resolver')} enviar={() => executar('resolver', { texto: resolucao }, () => setResolucao(''))}
        id="resolucao" rotulo="Resolução" botao="Resolver" variant="success" pendente={acao.pendente} valor={resolucao} setValor={setResolucao} />
      <FormLinha visivel={pode('reclassificar')} enviar={() => executar('reclassificar', { categoriaId: Number(categoriaId) }, () => setCategoriaId(''))}
        id="categoria" rotulo="Reclassificar" botao="Salvar" pendente={acao.pendente} pronto={categoriaId !== ''}>
        <Form.Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <Opcoes vazio="Escolha a categoria" itens={c.categorias} />
        </Form.Select>
      </FormLinha>
      <FormLinha visivel={pode('duplicado')} enviar={() => executar('duplicado', { numeroOriginal: original.trim().toUpperCase() }, () => setOriginal(''))}
        id="original" rotulo="Duplicado de outro pedido do mesmo aluno" botao="Marcar" pendente={acao.pendente} pronto={original.trim() !== ''}>
        <Form.Control placeholder="ONE-123" value={original} onChange={(e) => setOriginal(e.target.value)} />
      </FormLinha>
      <FormTexto visivel={pode('rejeitar')} enviar={() => executar('rejeitar', { motivo }, limparMotivo)}
        id="motivo" rotulo="Não resolveu? Explique o motivo" botao="Rejeitar resolução" variant="outline-secondary" pendente={acao.pendente} valor={motivo} setValor={setMotivo} />
      {acao.alerta}
      <Historico eventos={c.eventos} fuso={fuso} />

      <Confirmacao aberto={modal === 'encaminhar'} fechar={fechar} titulo="Encaminhar para outro setor?" botao="Encaminhar" pronto={setorId !== '' && motivo.trim() !== ''}
        confirmar={() => executar('encaminhar', { setorId: Number(setorId), motivo }, () => { setMotivo(''); setSetorId('') })}>
        <p className="small">O chamado volta para a fila do setor escolhido, sem responsável. O motivo fica como nota interna.</p>
        <Form.Group controlId="setor" className="mb-2">
          <Form.Label>Setor</Form.Label>
          <Form.Select value={setorId} onChange={(e) => setSetorId(e.target.value)}>
            <Opcoes vazio="Escolha o setor" itens={c.setores} />
          </Form.Select>
        </Form.Group>
        <CampoMotivo id="motivo-encaminhar" rotulo="Motivo" valor={motivo} setValor={setMotivo} />
      </Confirmacao>

      <Confirmacao aberto={modal === 'cancelar'} fechar={fechar} titulo="Cancelar a solicitação?" botao="Cancelar solicitação" variant="danger" pronto
        confirmar={() => executar('cancelar', { motivo: motivo.trim() || undefined }, limparMotivo)}>
        <CampoMotivo id="justificativa" rotulo="Justificativa (opcional)" valor={motivo} setValor={setMotivo} />
      </Confirmacao>
    </>
  )
}

export function ChamadoDetalhe() {
  const { numero } = useParams()
  const { me } = useSessao()
  const { chamado, erro, carregar, setChamado } = useChamado(numero)
  if (erro && !chamado) return <Alert variant="danger">{erro}</Alert>
  if (!chamado) return <Carregando />
  return <Detalhe c={chamado} fuso={me.instituicao.fuso} carregar={carregar} setChamado={setChamado} />
}
