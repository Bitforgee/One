import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { useForm, type FieldValues, type Path, type Resolver, type UseFormReturn } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { BotaoAcao } from '../acao'
import { api, ErroApi } from '../api'
import { ErroDe } from '../ErroDe'
import { Sigla, urlDaImagem, useInstituicao, type InstituicaoPublica } from '../aparencia'
import { telaInicial, useSessao } from '../sessao'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'

// Só o que a tela já exigia (campo preenchido); o resto, quem decide é a API (AC 39, AC 40).
const obrigatorio = z.string().min(1, 'Preencha este campo.')

// Área de acesso: uma coluna de até 384 px no centro da janela (estados de carga e erro).
export function Centro({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

const TituloBase = 'Atendimento ao estudante'
const Frase = 'Dúvidas, solicitações e respostas da sua instituição em um só lugar.'
const Itens = ['Tire dúvidas com o assistente a qualquer hora', 'Acompanhe suas solicitações até a resposta', 'Fale com a equipe da instituição quando precisar']

// O nome da instituição (ou "One" na raiz) em serifa de 28 px.
const H1 = ({ children }: { children: ReactNode }) => <h1 className="font-heading text-[28px] leading-tight font-semibold tracking-tight">{children}</h1>

// A raiz sem instituição: "One", a frase e o que fazer (AC 20).
export function Raiz() {
  return (
    <Centro>
      <div className="flex flex-col items-center gap-3 text-center">
        <H1>One</H1>
        <p className="m-0 text-muted-foreground">{Frase}</p>
        <p className="m-0 text-muted-foreground">Abra o endereço da sua instituição, por exemplo /univag.</p>
      </div>
    </Centro>
  )
}

// O logo (até 48 px de altura) ou, sem ele, as iniciais da instituição num quadrado bg-primary (AC 7).
function Identidade({ slug, d }: { slug?: string; d?: InstituicaoPublica }) {
  const logo = slug && d?.imagens.logo
  return (
    <div className="mb-3 flex h-12 items-center">
      {logo ? <img src={urlDaImagem(slug, 'logo', logo)} alt={d.nome} className="h-12 w-auto max-w-full object-contain" /> : d && <Sigla nome={d.nome} icone={null} className="size-12" />}
    </div>
  )
}

// O logo e o nome da instituição em serifa.
function Nome({ slug, d }: { slug?: string; d?: InstituicaoPublica }) {
  return (
    <div className="flex flex-col gap-1">
      <Identidade slug={slug} d={d} />
      {d && <H1>{d.nome}</H1>}
    </div>
  )
}

// O título e a frase do login da Aparência, ou os de base, em texto secundário (AC 7).
function Textos({ d }: { d?: InstituicaoPublica }) {
  return (
    <div className="flex flex-col gap-1 text-muted-foreground">
      <h2 className="text-base font-medium">{d?.login.titulo ?? TituloBase}</h2>
      <p className="m-0">{d?.login.frase ?? Frase}</p>
    </div>
  )
}

// Os itens do login, abaixo do formulário, com marcador discreto.
function ListaDeItens({ d }: { d?: InstituicaoPublica }) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-1 ps-5 text-sm text-muted-foreground">
      {(d?.login.itens.length ? d.login.itens : Itens).map((texto) => (
        <li key={texto}>{texto}</li>
      ))}
    </ul>
  )
}

// A foto do login, decorativa e sem nada sobre ela: a faixa do topo (abaixo de 1024 px) ou a coluna direita inteira.
function Foto({ foto, className, lateral }: { foto: string | null; className: string; lateral?: boolean }) {
  if (!foto) return null
  const img = <img src={foto} alt="" className={className} />
  return lateral ? <div className="relative hidden lg:block">{img}</div> : img
}

// A coluna do acesso (AC 5): logo, nome em serifa, título e frase do login, tela, formulário (no Login, com o apoio no começo) e itens.
// Com a foto do login: a faixa de 160 px no topo abaixo de 1024 px, e a coluna direita inteira a partir dela (AC 6).
function Entrada({ tela, children }: { tela?: string; children: ReactNode }) {
  const { slug } = useParams()
  const { data: d } = useInstituicao(slug)
  const foto = slug && d?.imagens.login ? urlDaImagem(slug, 'login', d.imagens.login) : null
  return (
    <div className={foto ? 'grid min-h-svh max-lg:grid-rows-[auto_1fr] lg:grid-cols-2' : 'flex min-h-svh'}>
      <Foto foto={foto} className="h-40 w-full object-cover lg:hidden" />
      <div className="flex w-full flex-col items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-[400px] flex-col gap-8">
          <Nome slug={slug} d={d} />
          <Textos d={d} />
          {tela && <h2 className="text-base font-semibold">{tela}</h2>}
          <div className="flex flex-col gap-6">{children}</div>
          <ListaDeItens d={d} />
        </div>
      </div>
      <Foto foto={foto} className="absolute inset-0 size-full object-cover" lateral />
    </div>
  )
}

type Props<T extends FieldValues> = { f: UseFormReturn<T>; nome: Path<T>; rotulo: string; dica?: string } & ComponentProps<'input'>

// Campo de senha com o botão de mostrar/ocultar (quem digita no celular erra menos vendo o que escreve).
function Campo<T extends FieldValues>({ f, nome, rotulo, dica, type, ...props }: Props<T>) {
  const [visivel, setVisivel] = useState(false)
  const senha = type === 'password'
  const erro = f.formState.errors[nome]?.message as string | undefined
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={nome}>{rotulo}</Label>
      <div className="relative">
        <Input id={nome} type={senha && visivel ? 'text' : type} aria-invalid={!!f.formState.errors[nome]} aria-describedby={dica ? `${nome}-dica` : undefined} className={senha ? 'pr-12' : undefined} {...props} {...f.register(nome)} />
        {senha && (
          <button
            type="button"
            aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visivel}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setVisivel((v) => !v)}
          >
            {visivel ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
          </button>
        )}
      </div>
      {erro && (
        <p id={`-erro`} className="text-sm text-destructive">
          {erro}
        </p>
      )}
      {dica && (
        <p id={`${nome}-dica`} className="text-sm text-muted-foreground">
          {dica}
        </p>
      )}
    </div>
  )
}

// Formulário de um envio só: Zod pelo RHF, a mutação em volta de api() e o erro da API num Alert.
function Formulario<T extends FieldValues>({ schema, enviar, botao, className, children }: {
  schema: z.ZodType<T>
  enviar: (v: T) => Promise<unknown>
  botao: string
  className?: string
  children: (form: UseFormReturn<T>) => ReactNode
}) {
  const form = useForm<T>({ resolver: zodResolver(schema as never) as Resolver<T> })
  const m = useMutation({ mutationFn: enviar })
  return (
    <>
      <form noValidate onSubmit={form.handleSubmit((v) => m.mutate(v))} className="flex flex-col gap-6">
        {children(form)}
        <BotaoAcao type="submit" pendente={m.isPending} className={className}>
          {botao}
        </BotaoAcao>
      </form>
      {m.error && <Alert variant="destructive">{m.error.message}</Alert>}
    </>
  )
}

const schemaLogin = z.object({ cpf: obrigatorio, senha: obrigatorio })

export function Login() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isError, isPending, error, refetch } = useInstituicao(slug)

  if (isError)
    return (
      <Centro>
        {error instanceof ErroApi ? <Alert>Instituição não encontrada.</Alert> : <ErroDe erro={error} oque="a instituição" tentar={() => void refetch()} />}
      </Centro>
    )
  if (isPending)
    return (
      <Centro>
        <Spinner className="mx-auto size-8" />
      </Centro>
    )

  return (
    <Entrada>
      <Formulario
        schema={schemaLogin}
        botao="Entrar"
        className="w-full"
        enviar={async (v) => {
          const u = await api<{ papeis: string[]; deveTrocarSenha: boolean }>('/api/auth/login', { instituicao: slug, ...v })
          navigate(`/${slug}/${telaInicial(u)}`)
        }}
      >
        {(form) => (
          <>
            <p className="m-0 -mb-2 text-sm text-muted-foreground">Entre com seu CPF e sua senha.</p>
            <Campo f={form} nome="cpf" rotulo="CPF" inputMode="numeric" autoComplete="username" />
            <Campo f={form} nome="senha" rotulo="Senha" type="password" autoComplete="current-password" />
          </>
        )}
      </Formulario>
      <Link to={`/${slug}/primeiro-acesso`} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Primeiro acesso ou esqueci minha senha
      </Link>
    </Entrada>
  )
}

export function PrimeiroAcesso() {
  const { slug } = useParams()
  const [mensagem, setMensagem] = useState<string>()
  return (
    <Entrada tela="Primeiro acesso">
      {mensagem ? (
        <Alert>{mensagem}</Alert>
      ) : (
        <Formulario
          schema={z.object({ cpf: obrigatorio })}
          botao="Enviar link"
          className="w-full"
          enviar={async (v) => setMensagem((await api<{ mensagem: string }>('/api/auth/primeiro-acesso', { instituicao: slug, ...v })).mensagem)}
        >
          {(form) => <Campo f={form} nome="cpf" rotulo="CPF" inputMode="numeric" dica="Enviaremos um link para criar a senha no e-mail registrado na instituição." />}
        </Formulario>
      )}
      <Link to={`/${slug}`} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Voltar para o login
      </Link>
    </Entrada>
  )
}

export function DefinirSenha() {
  const { slug } = useParams()
  const [busca] = useSearchParams()
  const [pronto, setPronto] = useState(false)
  return (
    <Entrada tela="Criar senha">
      {pronto ? (
        <>
          <Alert>Senha criada. Entre com o CPF e a nova senha.</Alert>
          <Button asChild className="h-11">
            <Link to={`/${slug}`}>Entrar</Link>
          </Button>
        </>
      ) : (
        <Formulario
          schema={z.object({ novaSenha: obrigatorio })}
          botao="Salvar senha"
          className="w-full"
          enviar={async (v) => {
            await api('/api/auth/definir-senha', { token: busca.get('token'), ...v })
            setPronto(true)
          }}
        >
          {(form) => <Campo f={form} nome="novaSenha" rotulo="Nova senha" type="password" autoComplete="new-password" dica="De 8 a 128 caracteres." />}
        </Formulario>
      )}
    </Entrada>
  )
}

export function TrocarSenha() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { me, setMe } = useSessao()
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      {me.deveTrocarSenha && <Alert>Troque a senha temporária para continuar.</Alert>}
      <Formulario
        schema={z.object({ senhaAtual: obrigatorio, novaSenha: obrigatorio })}
        botao="Salvar"
        enviar={async (v) => {
          await api('/api/auth/senha', v)
          const atualizado = { ...me, deveTrocarSenha: false }
          setMe(atualizado)
          navigate(`/${slug}/${telaInicial(atualizado)}`)
        }}
      >
        {(form) => (
          <>
            <Campo f={form} nome="senhaAtual" rotulo="Senha atual" type="password" autoComplete="current-password" />
            <Campo f={form} nome="novaSenha" rotulo="Nova senha" type="password" autoComplete="new-password" dica="De 8 a 128 caracteres." />
          </>
        )}
      </Formulario>
    </div>
  )
}
