import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BotaoAcao } from '../acao'
import { api } from '../api'
import { ErroDe, errosDeCampo } from '../ErroDe'
import { Marca } from '../Marca'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Skeleton } from '../ui/skeleton'

type Plataforma = {
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
  ['emissor', 'Emissor (iss)', 'Endereço do Moodle, como aparece em "ID da plataforma".'],
  ['clientId', 'Client ID', 'Gerado pelo Moodle ao salvar a ferramenta externa.'],
  ['deploymentId', 'Deployment ID', 'Também mostrado pelo Moodle na lista de ferramentas.'],
  ['authUrl', 'URL de autenticação', 'Em "URL de solicitação de autenticação".'],
  ['jwksUrl', 'URL das chaves (JWKS)', 'Em "URL do conjunto de chaves públicas".'],
] as const

type Chave = (typeof Campos)[number][0]
type Valores = Record<Chave, string> & { ativa: boolean }

const valoresDe = (p: Plataforma): Valores => ({ ativa: p.configurada ? p.ativa : true, emissor: p.emissor, clientId: p.clientId, deploymentId: p.deploymentId, authUrl: p.authUrl, jwksUrl: p.jwksUrl })

function Url({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{rotulo}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 rounded-sm border bg-muted px-2 py-1.5 text-sm break-all">{valor}</code>
        <Button
          type="button"
          variant="outline"
          aria-label={`Copiar ${rotulo}`}
          onClick={() => void navigator.clipboard?.writeText(valor).then(() => toast.success('Copiado.'))}
        >
          Copiar
        </Button>
      </div>
    </div>
  )
}

function Formulario({ dados }: { dados: Plataforma }) {
  const cliente = useQueryClient()
  const [v, setV] = useState(() => valoresDe(dados))
  useEffect(() => setV(valoresDe(dados)), [dados])
  const salvar = useMutation({
    mutationFn: () => api<Plataforma>('/api/admin/moodle', v, 'PUT'),
    onSuccess: (novo) => {
      cliente.setQueryData(['moodle-admin'], novo)
      toast.success('Moodle salvo.')
    },
  })
  const erros = errosDeCampo(salvar.error)
  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        salvar.mutate()
      }}
    >
      <section aria-labelledby="moodle-no-moodle" className="flex flex-col gap-3">
        <h2 id="moodle-no-moodle" className="text-base font-semibold">
          1. No Moodle
        </h2>
        <p className="m-0 text-sm text-muted-foreground">
          Em Administração do site › Plugins › Ferramenta externa › Gerenciar ferramentas, configure uma ferramenta LTI 1.3 com estes endereços, abra em nova janela e acrescente o parâmetro personalizado username=$User.username.
        </p>
        <Url rotulo="URL de login" valor={dados.urlLogin} />
        <Url rotulo="URL de redirecionamento" valor={dados.urlLancamento} />
        <Url rotulo="URL das chaves públicas" valor={dados.urlJwks} />
      </section>
      <section aria-labelledby="moodle-no-one" className="flex flex-col gap-4">
        <h2 id="moodle-no-one" className="text-base font-semibold">
          2. No One
        </h2>
        {Campos.map(([chave, rotulo, dica]) => (
          <div key={chave} className="flex flex-col gap-2">
            <Label htmlFor={`moodle-${chave}`}>{rotulo}</Label>
            <Input
              id={`moodle-${chave}`}
              value={v[chave]}
              aria-invalid={!!erros[chave]}
              aria-describedby={`moodle-${chave}-dica`}
              onChange={(e) => setV({ ...v, [chave]: e.target.value })}
            />
            <p id={`moodle-${chave}-dica`} className="m-0 text-xs text-muted-foreground">
              {dica}
            </p>
            {erros[chave] && <p className="m-0 text-sm text-destructive">{erros[chave]}</p>}
          </div>
        ))}
        <Marca id="moodle-ativa" rotulo="Permitir a entrada pelo Moodle" marcado={v.ativa} mudar={(ativa) => setV({ ...v, ativa })} />
      </section>
      <ErroDe erro={salvar.error} campos={Campos.map(([c]) => c)} />
      <BotaoAcao type="submit" pendente={salvar.isPending} className="self-start">
        Salvar
      </BotaoAcao>
    </form>
  )
}

export function Moodle() {
  const { data, error, refetch } = useQuery({ queryKey: ['moodle-admin'], queryFn: () => api<Plataforma>('/api/admin/moodle') })
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p className="m-0 text-muted-foreground">Alunos que entram pela atividade One no Moodle chegam ao assistente sem digitar CPF nem senha. A equipe continua entrando com CPF e senha.</p>
      {error ? (
        <ErroDe erro={error} oque="a integração com o Moodle" tentar={() => void refetch()} />
      ) : data ? (
        <Formulario dados={data} />
      ) : (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}
    </div>
  )
}
