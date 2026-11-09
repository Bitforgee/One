import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { BotaoAcao } from '../acao'
import { api, ErroApi } from '../api'
import { contraste, CorValida, MinimoDeContraste, normalizar, urlDaImagem } from '../aparencia'
import { Confirmar } from '../Confirmar'
import { ErroDe } from '../ErroDe'
import { useSessao } from '../sessao'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet'
import { Skeleton } from '../ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { useConsulta } from '../ui/use-mobile'
import { Abas, abaPedida, abasComErro, Campos, EhLista, Rotulos, type Campo, type IdAba, type Tipo } from './abasDaAparencia'
import { useAvisoAoFechar } from './avisoAoFechar'
import { CampoImagem } from './CampoImagem'
import { CoresProntas } from './CoresProntas'
import { PreviaAparencia } from './PreviaAparencia'

type Valores = Record<string, string>

const ler = (dados: object, chave: string) => chave.split('.').reduce<any>((o, k) => o?.[k], dados)
const linhas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean)

function valoresDe(dados: object): Valores {
  return Object.fromEntries(Campos.map(({ chave }) => [chave, [ler(dados, chave) ?? ''].flat().join('\n')]))
}

// O corpo do PUT: o caminho "login.titulo" vira { login: { titulo } }; texto vazio vai como null (volta ao padrão).
function corpoDe(v: Valores) {
  const corpo: Record<string, any> = {}
  for (const { chave } of Campos) {
    const [pai, filho] = chave.split('.')
    const valor = EhLista(chave) ? linhas(v[chave]) : v[chave].trim() || null
    if (filho) (corpo[pai] ??= {})[filho] = valor
    else corpo[pai] = valor
  }
  return corpo
}

type Falhas = { campos: Record<string, string>; imagens: Partial<Record<Tipo, string>>; geral?: string }

// Os erros 400 por campo da API (`errors` com o caminho do JSON); o que não casa com nenhum campo vai para o alerta geral.
function falhaDe(e: unknown): Falhas {
  const erros = e instanceof ErroApi ? (e.corpo?.errors as Record<string, string[]> | undefined) : undefined
  const campos = Object.fromEntries(Object.entries(erros ?? {}).filter(([k]) => Campos.some((c) => c.chave === k)).map(([k, m]) => [k, m[0]]))
  return { campos, imagens: {}, geral: Object.keys(campos).length ? undefined : (e as Error).message }
}

const formulario = (arquivo: File) => {
  const f = new FormData()
  f.set('arquivo', arquivo)
  return f
}

type Resultado = Falhas & { enviadas: Tipo[] }
const semFalhas = (f: Falhas) => !f.geral && !Object.keys(f.campos).length && !Object.keys(f.imagens).length

// Grava os campos e depois cada imagem escolhida; o que a API recusa volta em `Falhas` e nada do digitado se perde.
async function gravarTudo(valores: Valores, escolhidas: Partial<Record<Tipo, File>>): Promise<Resultado> {
  const resultado: Resultado = { campos: {}, imagens: {}, enviadas: [] }
  try {
    await api('/api/admin/aparencia', corpoDe(valores), 'PUT')
  } catch (e) {
    return { ...falhaDe(e), enviadas: [] }
  }
  for (const [tipo, arquivo] of Object.entries(escolhidas) as [Tipo, File][]) {
    try {
      await api(`/api/admin/aparencia/imagens/${tipo}`, formulario(arquivo))
      resultado.enviadas.push(tipo)
    } catch (e) {
      resultado.imagens[tipo] = (e as Error).message
    }
  }
  return resultado
}

// As miniaturas das imagens escolhidas e ainda não salvas (blob:), liberadas ao trocar ou sair.
function useBlobs(arquivos: Partial<Record<Tipo, File>>) {
  const [urls, setUrls] = useState<Partial<Record<Tipo, string>>>({})
  useEffect(() => {
    const novas = Object.fromEntries(Object.entries(arquivos).map(([t, f]) => [t, URL.createObjectURL(f)]))
    setUrls(novas)
    return () => Object.values(novas).forEach((u) => URL.revokeObjectURL(u))
  }, [arquivos])
  return urls
}

// A amostra da cor e o contraste com o branco, pela mesma regra do servidor (AC 27 de aparencia-instituicao).
function Amostra({ cor }: { cor: string }) {
  if (!CorValida.test(cor)) return null
  const razao = contraste(cor)
  return (
    <div className="flex items-center gap-2 text-sm">
      <span data-testid="amostra" className="size-6 shrink-0 rounded border" style={{ backgroundColor: cor }} />
      <span className={razao < MinimoDeContraste ? 'text-destructive' : 'text-muted-foreground'}>{`Contraste com o branco: ${razao.toFixed(2).replace('.', ',')}:1`}</span>
    </div>
  )
}

const corProibida = (cor: string) => cor !== '' && (!CorValida.test(cor) || contraste(cor) < MinimoDeContraste)

function CampoDeTexto({ campo, valor, mudar, erro }: { campo: Campo; valor: string; mudar: (v: string) => void; erro?: string }) {
  const id = `ap-${campo.chave}`
  const descricao = [campo.dica && `${id}-dica`, erro && `${id}-erro`].filter(Boolean).join(' ') || undefined
  const props = { id, value: valor, 'aria-invalid': !!erro, 'aria-describedby': descricao }
  const tamanho = valor.trim().length
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{campo.rotulo}</Label>
      {campo.area ? <Textarea rows={3} {...props} onChange={(e) => mudar(e.target.value)} /> : <Input {...props} onChange={(e) => mudar(e.target.value)} />}
      {campo.chave === 'cor' && <Amostra cor={valor} />}
      {(campo.dica || campo.limite) && (
        <div className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
          {campo.dica && (
            <p id={`${id}-dica`} className="m-0">
              {campo.dica}
            </p>
          )}
          {campo.limite && <span className={tamanho > campo.limite ? 'text-destructive' : undefined}>{`${tamanho}/${campo.limite}`}</span>}
        </div>
      )}
      {erro && (
        <p id={`${id}-erro`} className="m-0 text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  )
}

type Dados = ReturnType<typeof normalizar>

// O que a prévia mostra: os valores do formulário, e as imagens escolhidas ou já salvas.
const daPrevia = (aba: IdAba, nome: string, v: Valores, miniatura: (t: Tipo) => string | undefined) => ({
  aba,
  nome,
  nomeCurto: v.nomeCurto,
  cor: CorValida.test(v.cor) ? v.cor : '',
  loginTitulo: v['login.titulo'],
  loginFrase: v['login.frase'],
  loginItens: linhas(v['login.itens']),
  assistenteNome: v['assistente.nome'],
  boasVindas: v['assistente.boasVindas'],
  perguntas: linhas(v['assistente.perguntas']),
  contatoHorario: v['contato.horario'].trim(),
  contatoTelefone: v['contato.telefone'].trim(),
  contatoEmail: v['contato.email'].trim(),
  imagens: { logo: miniatura('logo'), icone: miniatura('icone'), login: miniatura('login'), assistente: miniatura('assistente') },
})

type DadosDaPreviaProp = Parameters<typeof PreviaAparencia>[0]['dados']

// A prévia: à direita e fixa a partir de 1024 px; abaixo disso, só pelo botão "Ver prévia", que a abre numa folha.
const PreviaLateral = ({ dados }: { dados: DadosDaPreviaProp }) => (
  <section aria-label="Prévia" className="sticky top-16">
    <PreviaAparencia dados={dados} />
  </section>
)

function VerPrevia({ dados }: { dados: DadosDaPreviaProp }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          Ver prévia
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[90dvh]">
        <SheetHeader>
          <SheetTitle>Prévia</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto p-4 pt-0">
          <PreviaAparencia dados={dados} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// A barra fixa no pé da tela: diz se há o que salvar (AC 5).
function BarraDeSalvar({ alterado, pendente, bloqueado, descartar, previa }: { alterado: boolean; pendente: boolean; bloqueado: boolean; descartar: () => void; previa?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t bg-background py-3">
      <p role="status" className="m-0 me-auto text-sm text-muted-foreground">
        {alterado ? 'Alterações não salvas' : 'Tudo salvo'}
      </p>
      {alterado && (
        <Button type="button" variant="outline" onClick={descartar}>
          Descartar
        </Button>
      )}
      {previa}
      <BotaoAcao type="submit" pendente={pendente} disabled={!alterado || bloqueado}>
        Salvar
      </BotaoAcao>
    </div>
  )
}

function ComErro() {
  return <span role="img" aria-label="com erro" className="size-2 rounded-full bg-destructive" />
}

function Formulario({ dados, slug, nome }: { dados: Dados; slug: string; nome: string }) {
  const cliente = useQueryClient()
  const [params, setParams] = useSearchParams()
  const aba = abaPedida(params.get('aba'))
  const [valores, setValores] = useState(() => valoresDe(dados))
  const [escolhidas, setEscolhidas] = useState<Partial<Record<Tipo, File>>>({})
  const [falhas, setFalhas] = useState<Falhas>({ campos: {}, imagens: {} })
  const [removendo, setRemovendo] = useState<Tipo>()
  const blobs = useBlobs(escolhidas)
  const estreito = useConsulta('(max-width: 1023px)')
  const reler = () => Promise.all([cliente.invalidateQueries({ queryKey: ['aparencia-admin'] }), cliente.invalidateQueries({ queryKey: ['instituicao', slug] })])
  // o Radix dispara a troca no mousedown e de novo no foco, antes de o roteador (assíncrono) refletir a primeira: sem a guarda, o histórico ganha a mesma aba duas vezes
  const ultima = useRef(aba)
  useEffect(() => {
    ultima.current = aba
  }, [aba])
  const irPara = (id: string) => {
    if (ultima.current === id) return
    ultima.current = id as IdAba
    setParams({ aba: id })
  }

  // alterado: o que está na tela difere do salvo (texto aparado, como vai no PUT) ou há imagem escolhida e não enviada
  const alterado = JSON.stringify(corpoDe(valores)) !== JSON.stringify(corpoDe(valoresDe(dados))) || Object.keys(escolhidas).length > 0
  const bloqueio = useBlocker(({ currentLocation, nextLocation }) => alterado && currentLocation.pathname !== nextLocation.pathname)
  useAvisoAoFechar(alterado)

  const salvar = useMutation({
    mutationFn: () => gravarTudo(valores, escolhidas),
    onSuccess: async ({ enviadas, ...f }) => {
      setFalhas(f)
      setEscolhidas((e) => Object.fromEntries(Object.entries(e).filter(([t]) => !enviadas.includes(t as Tipo))))
      await reler()
      const primeira = abasComErro(f.campos, f.imagens)[0]
      if (primeira) irPara(primeira)
      if (semFalhas(f)) toast.success('Aparência salva.')
    },
  })
  const remover = useMutation({
    mutationFn: (tipo: Tipo) => api(`/api/admin/aparencia/imagens/${tipo}`, undefined, 'DELETE'),
    onSuccess: async () => {
      toast.success('Imagem removida.')
      await reler()
    },
  })

  const miniatura = (tipo: Tipo) => blobs[tipo] ?? (dados.imagens[tipo] ? urlDaImagem(slug, tipo, dados.imagens[tipo]!) : undefined)
  const muda = (chave: string) => (v: string) => setValores((x) => ({ ...x, [chave]: v }))
  const tirar = (tipo: Tipo) => (escolhidas[tipo] ? setEscolhidas(({ [tipo]: _, ...resto }) => resto) : setRemovendo(tipo))
  const descartar = () => {
    setValores(valoresDe(dados))
    setEscolhidas({})
    setFalhas({ campos: {}, imagens: {} })
  }
  const comErro = abasComErro(falhas.campos, falhas.imagens)
  const previa = daPrevia(aba, nome, valores, miniatura)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
      <form
        noValidate
        className="flex min-w-0 flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          salvar.mutate()
        }}
      >
        <Tabs value={aba} onValueChange={irPara} className="gap-6">
          <TabsList aria-label="Seções da aparência" className="h-auto w-full justify-start overflow-x-auto">
            {Abas.map((a) => (
              <TabsTrigger key={a.id} value={a.id} className="min-h-11 flex-none px-4 md:min-h-9">
                {a.titulo}
                {comErro.includes(a.id) && <ComErro />}
              </TabsTrigger>
            ))}
          </TabsList>
          {Abas.map((a) => (
            <TabsContent key={a.id} value={a.id} className="flex flex-col gap-4">
              {a.id === 'marca' && <CoresProntas cor={valores.cor} escolher={muda('cor')} />}
              {a.campos.map((c) => (
                <CampoDeTexto key={c.chave} campo={c} valor={valores[c.chave]} mudar={muda(c.chave)} erro={falhas.campos[c.chave]} />
              ))}
              {a.imagens.map((t) => (
                <CampoImagem key={t} rotulo={Rotulos[t][0]} dica={Rotulos[t][1]} extra={Rotulos[t][2]} miniatura={miniatura(t)} escolher={(f) => setEscolhidas((e) => ({ ...e, [t]: f }))} remover={() => tirar(t)} erro={falhas.imagens[t]} />
              ))}
              {a.nota && <p className="m-0 text-sm text-muted-foreground">{a.nota}</p>}
            </TabsContent>
          ))}
        </Tabs>
        <ErroDe erro={falhas.geral} />
        {remover.error && <Alert variant="destructive">{remover.error.message}</Alert>}
        <BarraDeSalvar alterado={alterado} pendente={salvar.isPending} bloqueado={corProibida(valores.cor)} descartar={descartar} previa={estreito && <VerPrevia dados={previa} />} />
      </form>
      {!estreito && <PreviaLateral dados={previa} />}
      <Confirmar
        aberto={!!removendo}
        fechar={() => setRemovendo(undefined)}
        titulo="Remover a imagem?"
        botao="Remover"
        destrutivo
        confirmar={() => {
          remover.mutate(removendo!)
          setRemovendo(undefined)
        }}
      >
        A instituição volta a usar a imagem padrão. O arquivo antigo fica guardado.
      </Confirmar>
      <Confirmar aberto={bloqueio.state === 'blocked'} fechar={() => bloqueio.reset?.()} titulo="Sair sem salvar?" botao="Sair sem salvar" voltar="Continuar editando" destrutivo confirmar={() => bloqueio.proceed?.()}>
        O que você alterou e não salvou nesta tela será perdido.
      </Confirmar>
    </div>
  )
}

// A tela Aparência (door 7 de aparencia-instituicao): o administrador define a marca em abas e vê a prévia da aba antes de salvar.
export function Aparencia() {
  const { slug } = useParams()
  const { me } = useSessao()
  const { data, error, refetch } = useQuery({ queryKey: ['aparencia-admin'], queryFn: () => api<object>('/api/admin/aparencia') })
  if (error) return <ErroDe erro={error} oque="a aparência" tentar={() => void refetch()} />
  if (!data)
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  return <Formulario dados={normalizar({ nome: me.instituicao.nome, ...data })} slug={slug!} nome={me.instituicao.nome} />
}
