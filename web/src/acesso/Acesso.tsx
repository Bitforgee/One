import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { useForm, type FieldValues, type Path, type Resolver, type UseFormReturn } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { BotaoAcao } from '../acao'
import { api } from '../api'
import { Sigla, urlDaImagem, useInstituicao, type InstituicaoPublica } from '../aparencia'
import { BoasVindas } from '../ilustracoes'
import { telaInicial, useSessao } from '../sessao'
import { Alert } from '../ui/alert'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'

// Só o que a tela já exigia (campo preenchido); o resto, quem decide é a API (AC 39, AC 40).
const obrigatorio = z.string().min(1)

// Área de acesso do bloco de login do shadcn: cartão de até 384 px no centro da janela.
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

const H1 = ({ children }: { children: ReactNode }) => <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>

// A raiz sem instituição: a ilustração, "One", a frase e o que fazer (AC 37).
export function Raiz() {
  return (
    <Centro>
      <div className="flex flex-col items-center gap-3 text-center">
        <BoasVindas className="h-40 w-52 text-muted-foreground" />
        <H1>One</H1>
        <p className="m-0 text-muted-foreground">{Frase}</p>
        <p className="m-0 text-muted-foreground">Abra o endereço da sua instituição, por exemplo /univag.</p>
      </div>
    </Centro>
  )
}

// O logo (até 40 px de altura) ou, sem ele, as iniciais da instituição num quadrado bg-primary (AC 32).
function Identidade({ slug, d, className = '' }: { slug?: string; d?: InstituicaoPublica; className?: string }) {
  const logo = slug && d?.imagens.logo
  return (
    <div className={`flex h-10 items-center ${className}`}>
      {logo ? <img src={urlDaImagem(slug, 'logo', logo)} alt={d.nome} className="h-10 w-auto max-w-full object-contain" /> : d && <Sigla nome={d.nome} icone={null} className="size-10" />}
    </div>
  )
}

// Abaixo de 1024 px: uma faixa de 128 px com a imagem do login (ou a ilustração) e o logo.
function Faixa({ slug, d }: { slug?: string; d?: InstituicaoPublica }) {
  const imagem = slug && d?.imagens.login
  return (
    <div className="relative h-32 overflow-hidden bg-primary-subtle lg:hidden">
      {imagem ? <img src={urlDaImagem(slug, 'login', imagem)} alt="" className="absolute inset-0 size-full object-cover" /> : <BoasVindas className="mx-auto h-full text-muted-foreground" />}
      {slug && d?.imagens.logo && (
        <div className="absolute start-4 bottom-3 rounded-md bg-background/90 p-1">
          <Identidade slug={slug} d={d} />
        </div>
      )}
    </div>
  )
}

// Os textos do painel: os da instituição ou, campo a campo, os de base (AC 36).
const Sobre = { raiz: 'text-white', frase: 'text-white/85', linha: 'border-white/30' }
const Sobrio = { raiz: '', frase: 'text-muted-foreground', linha: '' }

function Textos({ d, escuro }: { d?: InstituicaoPublica; escuro: boolean }) {
  const itens = d?.login.itens.length ? d.login.itens : Itens
  const cor = escuro ? Sobre : Sobrio
  return (
    <div className={`relative mt-auto max-w-md ${cor.raiz}`}>
      <h2 className="text-2xl font-semibold tracking-tight">{d?.login.titulo ?? TituloBase}</h2>
      <p className={`mt-2 ${cor.frase}`}>{d?.login.frase ?? Frase}</p>
      <ul className={`mt-6 border-t ${cor.linha}`}>
        {itens.map((texto) => (
          <li key={texto} className={`border-b py-3 ${cor.linha}`}>
            {texto}
          </li>
        ))}
      </ul>
    </div>
  )
}

// A partir de 1024 px, o painel direito: a imagem do login inteira com os textos sobre uma faixa escura, ou a ilustração sobre bg-primary-subtle.
function Painel({ slug, d }: { slug?: string; d?: InstituicaoPublica }) {
  const imagem = slug && d?.imagens.login
  return (
    <div className="relative hidden flex-col border-l bg-muted p-10 lg:flex">
      {imagem ? (
        <img src={urlDaImagem(slug, 'login', imagem)} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="rounded-xl bg-primary-subtle p-6">
          <BoasVindas className="mx-auto h-48 w-full text-muted-foreground" />
        </div>
      )}
      {imagem && <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-black/85 via-black/65 to-transparent" />}
      <Textos d={d} escuro={!!imagem} />
    </div>
  )
}

// Duas colunas a partir de 1024 px: o formulário à esquerda, alinhado à esquerda, e à direita o painel da instituição.
function Entrada({ titulo, descricao, children }: { titulo: ReactNode; descricao?: string; children: ReactNode }) {
  const { slug } = useParams()
  const { data } = useInstituicao(slug)
  return (
    <div className="grid min-h-svh max-lg:grid-rows-[auto_1fr] lg:grid-cols-2">
      <Faixa slug={slug} d={data} />
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <Identidade slug={slug} d={data} className={data?.imagens.logo ? 'max-lg:hidden' : ''} />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-xs flex-col gap-6">
            <H1>{titulo}</H1>
            {descricao && <p className="-mt-5 text-sm text-muted-foreground">{descricao}</p>}
            {children}
          </div>
        </div>
      </div>
      <Painel slug={slug} d={data} />
    </div>
  )
}

type Props<T extends FieldValues> = { f: UseFormReturn<T>; nome: Path<T>; rotulo: string; dica?: string } & ComponentProps<'input'>

function Campo<T extends FieldValues>({ f, nome, rotulo, dica, ...props }: Props<T>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={nome}>{rotulo}</Label>
      <Input id={nome} aria-invalid={!!f.formState.errors[nome]} {...props} {...f.register(nome)} />
      {dica && <p className="text-sm text-muted-foreground">{dica}</p>}
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
  const { data: instituicao, isError, isPending } = useInstituicao(slug)

  if (isError)
    return (
      <Centro>
        <Alert>Instituição não encontrada.</Alert>
      </Centro>
    )
  if (isPending)
    return (
      <Centro>
        <Spinner className="mx-auto size-8" />
      </Centro>
    )

  return (
    <Entrada titulo={instituicao.nome} descricao="Entre com seu CPF e sua senha.">
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
            <Campo f={form} nome="cpf" rotulo="CPF" inputMode="numeric" autoComplete="username" />
            <Campo f={form} nome="senha" rotulo="Senha" type="password" autoComplete="current-password" />
          </>
        )}
      </Formulario>
      <Link to={`/${slug}/primeiro-acesso`} className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Primeiro acesso ou esqueci minha senha
      </Link>
    </Entrada>
  )
}

export function PrimeiroAcesso() {
  const { slug } = useParams()
  const [mensagem, setMensagem] = useState<string>()
  return (
    <Entrada titulo="Primeiro acesso">
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
      <Link to={`/${slug}`} className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
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
    <Entrada titulo="Criar senha">
      {pronto ? (
        <Alert>
          Senha criada. <Link to={`/${slug}`}>Entre com o CPF e a nova senha.</Link>
        </Alert>
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
