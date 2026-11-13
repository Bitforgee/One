import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BotaoAcao } from '../acao'
import { api } from '../api'
import { descricaoDoCampo, ErroDoCampo, useFocoNoPrimeiroErro } from '../Campo'
import { ErroDe, errosDeCampo } from '../ErroDe'
import { Marca } from '../Marca'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export type Plataforma = {
  configurada: boolean
  ativa: boolean
  emissor: string
  clientId: string
  deploymentId: string
  authUrl: string
  jwksUrl: string
  urlLogin: string
  urlLancamento: string
  urlJwks: string
}

const Campos = [
  ['emissor', 'Emissor (iss)', 'Endereço do Moodle, como aparece em “ID da plataforma”.'],
  ['clientId', 'Client ID', 'Gerado pelo Moodle ao salvar a ferramenta externa.'],
  ['deploymentId', 'Deployment ID', 'Também mostrado pelo Moodle na lista de ferramentas.'],
  ['authUrl', 'URL de autenticação', 'Em “URL de solicitação de autenticação”.'],
  ['jwksUrl', 'URL das chaves (JWKS)', 'Em “URL do conjunto de chaves públicas”.'],
] as const

type Chave = (typeof Campos)[number][0]
const EhUrl = (chave: string) => chave === 'emissor' || chave.endsWith('Url')
type Valores = Record<Chave, string> & { ativa: boolean }

const valoresDe = (p: Plataforma): Valores => ({ ativa: p.configurada ? p.ativa : true, emissor: p.emissor, clientId: p.clientId, deploymentId: p.deploymentId, authUrl: p.authUrl, jwksUrl: p.jwksUrl })

const AvisoDeSalvo = {
  ligado: ['Moodle salvo e ativo.', 'Para testar, abra a atividade One no Moodle com uma conta de aluno.'],
  desligado: ['Moodle salvo, mas a entrada pelo Moodle está desligada.', ''],
} as const

const FalhaAoCopiar = 'Não foi possível copiar. Selecione o texto e copie à mão.'

export function Url({ rotulo, valor, campo }: { rotulo: string; valor: string; campo?: string }) {
  const [copiado, setCopiado] = useState(false)
  useEffect(() => {
    if (!copiado) return
    const tempo = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(tempo)
  }, [copiado])
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{rotulo}</span>
      {campo && <span className="text-xs text-muted-foreground">{`No Moodle, cole em “${campo}”.`}</span>}
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 rounded-sm border bg-muted px-2 py-1.5 text-sm break-all">{valor}</code>
        <Button
          type="button"
          variant="outline"
          aria-label={copiado ? `${rotulo} copiado` : `Copiar ${rotulo}`}
          onClick={() => void Promise.resolve().then(() => navigator.clipboard.writeText(valor)).then(() => setCopiado(true), () => toast.error(FalhaAoCopiar))}
        >
          <span aria-live="polite">{copiado ? 'Copiado' : 'Copiar'}</span>
        </Button>
      </div>
    </div>
  )
}

function Enderecos({ dados }: { dados: Plataforma }) {
  return (
    <section aria-labelledby="moodle-no-moodle" className="flex flex-col gap-3">
      <h2 id="moodle-no-moodle" className="text-base font-semibold">
        1. No Moodle
      </h2>
      <p className="m-0 text-sm text-muted-foreground">
        Em Administração do site &gt; Plugins &gt; Ferramenta externa &gt; Gerenciar ferramentas, configure uma ferramenta LTI 1.3 com estes endereços, abra em nova janela e acrescente o parâmetro personalizado username=$User.username.
      </p>
      <Url rotulo="URL de login" campo="Initiate login URL" valor={dados.urlLogin} />
      <Url rotulo="URL de redirecionamento" campo="Redirection URI(s)" valor={dados.urlLancamento} />
      <Url rotulo="URL das chaves públicas" campo="Public keyset" valor={dados.urlJwks} />
    </section>
  )
}

function Aviso({ tipo }: { tipo: keyof typeof AvisoDeSalvo }) {
  const [titulo, proximo] = AvisoDeSalvo[tipo]
  return (
    <div role="status" className="flex flex-col gap-1 rounded-md border border-primary p-3 text-sm">
      <p className="m-0 font-medium">{titulo}</p>
      {proximo && <p className="m-0 text-muted-foreground">{proximo}</p>}
    </div>
  )
}

export function FormularioMoodle({ dados }: { dados: Plataforma }) {
  const cliente = useQueryClient()
  const [v, setV] = useState(() => valoresDe(dados))
  const [salvo, setSalvo] = useState<keyof typeof AvisoDeSalvo>()
  const editados = useRef(new Set<keyof Valores>())
  useEffect(() => {
    setV((atual) => ({ ...valoresDe(dados), ...Object.fromEntries([...editados.current].map((k) => [k, atual[k]])) }))
  }, [dados])
  const mudar = (parte: Partial<Valores>) => {
    for (const k of Object.keys(parte)) editados.current.add(k as keyof Valores)
    setSalvo(undefined)
    setV({ ...v, ...parte })
  }
  const salvar = useMutation({
    mutationFn: () => api<Plataforma>('/api/admin/moodle', v, 'PUT'),
    onSuccess: (novo) => {
      editados.current.clear()
      cliente.setQueryData(['moodle-admin'], novo)
      setSalvo(novo.ativa ? 'ligado' : 'desligado')
      toast.success('Moodle salvo.')
    },
  })
  const erros = errosDeCampo(salvar.error)
  useFocoNoPrimeiroErro(salvar.error, 'form')
  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        salvar.mutate()
      }}
    >
      <Enderecos dados={dados} />
      <section aria-labelledby="moodle-no-one" className="flex flex-col gap-4">
        <h2 id="moodle-no-one" className="text-base font-semibold">
          2. No One
        </h2>
        {Campos.map(([chave, rotulo, dica]) => (
          <div key={chave} className="flex flex-col gap-2">
            <Label htmlFor={`moodle-${chave}`}>{rotulo}</Label>
            <Input id={`moodle-${chave}`} name={chave} type={EhUrl(chave) ? 'url' : 'text'} autoComplete="off" spellCheck={false} value={v[chave]} aria-invalid={!!erros[chave]} aria-describedby={descricaoDoCampo(`moodle-${chave}`, dica, erros[chave])} onChange={(e) => mudar({ [chave]: e.target.value })} />
            <p id={`moodle-${chave}-dica`} className="m-0 text-xs text-muted-foreground">
              {dica}
            </p>
            <ErroDoCampo id={`moodle-${chave}`} erro={erros[chave]} />
          </div>
        ))}
        <Marca id="moodle-ativa" rotulo="Permitir a entrada pelo Moodle" marcado={v.ativa} mudar={(ativa) => mudar({ ativa })} />
      </section>
      <ErroDe erro={salvar.error} campos={Campos.map(([c]) => c)} />
      <BotaoAcao type="submit" pendente={salvar.isPending} className="self-start">
        Salvar
      </BotaoAcao>
      {salvo && <Aviso tipo={salvo} />}
    </form>
  )
}
